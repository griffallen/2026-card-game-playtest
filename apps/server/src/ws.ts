import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import type { GameAction, Seat } from '@newgame/engine'
import { EngineError, viewFor } from '@newgame/engine'
import { prisma } from './db.ts'
import { userForRequest } from './auth.ts'
import { applyAndPersist, loadState, seatOf, undoLast } from './gameStore.ts'

interface Client { socket: WebSocket; userId: string; username: string; seat: Seat | null }
const rooms = new Map<string, Set<Client>>()

const send = (socket: WebSocket, msg: object) => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg))
}

async function broadcastState(gameId: string) {
  const clients = rooms.get(gameId)
  if (!clients?.size) return
  const [state, game] = [await loadState(gameId), await prisma.game.findUnique({ where: { id: gameId }, include: { host: true, guest: true } })]
  if (!game) return
  const meta = { names: [game.host.username, game.guest?.username ?? '—'], status: game.status, gameName: game.name }
  for (const c of clients) {
    const view = viewFor(state, c.seat)
    send(c.socket, { t: 'state', seq: game.currentSeq, view, meta })
    if (state.winner !== null) send(c.socket, { t: 'gameOver', winnerSeat: state.winner, reason: state.winReason })
  }
}

function broadcastPresence(gameId: string) {
  const clients = rooms.get(gameId)
  if (!clients) return
  const online: [boolean, boolean] = [false, false]
  let spectators = 0
  for (const c of clients) {
    if (c.seat === null) spectators++
    else online[c.seat] = true
  }
  for (const c of clients) send(c.socket, { t: 'presence', online, spectators })
}

export function wsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { gameId?: string } }>('/ws', { websocket: true }, async (socket, req) => {
    const user = await userForRequest(req)
    const gameId = req.query.gameId ?? ''
    const game = gameId ? await prisma.game.findUnique({ where: { id: gameId } }) : null
    if (!user || !game || (game.status !== 'active' && game.status !== 'finished')) {
      send(socket, { t: 'error', code: 'bad-join', msg: !user ? 'sign in first' : 'game not joinable' })
      socket.close()
      return
    }

    const client: Client = { socket, userId: user.id, username: user.username, seat: seatOf(game, user.id) }
    if (!rooms.has(gameId)) rooms.set(gameId, new Set())
    rooms.get(gameId)!.add(client)

    // push current state to the newcomer immediately (reconnect = reopen)
    try {
      const state = await loadState(gameId)
      const fresh = await prisma.game.findUniqueOrThrow({ where: { id: gameId }, include: { host: true, guest: true } })
      send(socket, {
        t: 'state', seq: fresh.currentSeq, view: viewFor(state, client.seat),
        meta: { names: [fresh.host.username, fresh.guest?.username ?? '—'], status: fresh.status, gameName: fresh.name },
      })
      if (state.winner !== null) send(socket, { t: 'gameOver', winnerSeat: state.winner, reason: state.winReason })
    } catch (e) {
      send(socket, { t: 'error', code: 'load-failed', msg: e instanceof Error ? e.message : 'load failed' })
    }
    broadcastPresence(gameId)

    socket.on('message', async raw => {
      let msg: { t?: string; action?: GameAction }
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return send(socket, { t: 'error', code: 'bad-msg', msg: 'not json' })
      }
      try {
        if (msg.t === 'ping') return send(socket, { t: 'pong' })
        if (msg.t === 'action') {
          if (client.seat === null) return send(socket, { t: 'error', code: 'spectator', msg: 'spectators cannot act' })
          if (!msg.action || typeof msg.action !== 'object') return send(socket, { t: 'error', code: 'bad-msg', msg: 'missing action' })
          await applyAndPersist(gameId, msg.action, client.seat)
          await broadcastState(gameId)
          return
        }
        if (msg.t === 'undo') {
          if (client.seat === null) return send(socket, { t: 'error', code: 'spectator', msg: 'spectators cannot undo' })
          await undoLast(gameId)
          const who = client.username
          const others = rooms.get(gameId)
          if (others) for (const c of others) send(c.socket, { t: 'undone', by: who })
          await broadcastState(gameId)
          return
        }
        send(socket, { t: 'error', code: 'bad-msg', msg: `unknown message ${msg.t}` })
      } catch (e) {
        if (e instanceof EngineError) return send(socket, { t: 'error', code: e.code, msg: e.message })
        req.log.error(e)
        send(socket, { t: 'error', code: 'server', msg: 'something broke server-side' })
      }
    })

    socket.on('close', () => {
      const clients = rooms.get(gameId)
      clients?.delete(client)
      if (clients && clients.size === 0) rooms.delete(gameId)
      else broadcastPresence(gameId)
    })
  })
}
