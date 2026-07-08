import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { FastifyInstance } from 'fastify'
import type { GameAction, PlayerView } from '@newgame/engine'
import { buildApp } from '../src/app.ts'
import { prisma } from '../src/db.ts'

let app: FastifyInstance
let base: string
const sids = new Map<string, string>()

async function register(username: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password: 'password123' } })
  sids.set(username, res.cookies.find(c => c.name === 'sid')!.value)
}
const cookie = (u: string) => ({ cookie: `sid=${sids.get(u)}` })

interface Frame { t: string; [k: string]: unknown }

class Client {
  private queue: Frame[] = []
  private waiters: ((f: Frame) => void)[] = []
  readonly ws: WebSocket
  constructor(user: string, gameId: string) {
    this.ws = new WebSocket(`${base.replace('http', 'ws')}/ws?gameId=${gameId}`, {
      headers: { Cookie: `sid=${sids.get(user)}` },
    })
    this.ws.on('message', raw => {
      const frame = JSON.parse(String(raw)) as Frame
      const waiter = this.waiters.shift()
      if (waiter) waiter(frame)
      else this.queue.push(frame)
    })
  }
  next(timeoutMs = 5000): Promise<Frame> {
    const q = this.queue.shift()
    if (q) return Promise.resolve(q)
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('ws frame timeout')), timeoutMs)
      this.waiters.push(f => { clearTimeout(t); resolve(f) })
    })
  }
  async nextOfType(type: string, timeoutMs = 5000): Promise<Frame> {
    for (;;) {
      const f = await this.next(timeoutMs)
      if (f.t === type) return f
      if (f.t === 'error') throw new Error(`ws error frame: ${JSON.stringify(f)}`)
    }
  }
  /** Wait for an error frame, skipping presence/state noise. */
  async nextError(timeoutMs = 5000): Promise<Frame> {
    for (;;) {
      const f = await this.next(timeoutMs)
      if (f.t === 'error') return f
    }
  }
  send(msg: object) { this.ws.send(JSON.stringify(msg)) }
  close() { this.ws.close() }
}

beforeAll(async () => {
  app = await buildApp()
  await app.listen({ port: 0, host: '127.0.0.1' })
  const addr = app.server.address()
  if (typeof addr === 'string' || !addr) throw new Error('no port')
  base = `http://127.0.0.1:${addr.port}`
  await register('host')
  await register('guest')
  await register('watcher')
})
afterAll(async () => { await app.close(); await prisma.$disconnect() })

async function makeActiveGame(): Promise<string> {
  const decks = (await app.inject({ method: 'GET', url: '/api/decks', headers: cookie('host') })).json().decks
  const red = decks.find((d: { name: string }) => d.name.includes('Crimson'))
  const yellow = decks.find((d: { name: string }) => d.name.includes('Radiant'))
  const created = await app.inject({ method: 'POST', url: '/api/games', headers: cookie('host'), payload: { deckId: red.id } })
  const id = created.json().game.id
  await app.inject({ method: 'POST', url: `/api/games/${id}/join`, headers: cookie('guest'), payload: { deckId: yellow.id } })
  return id
}

describe('websocket play', () => {
  it('two seats and a spectator: hidden info, action round-trip, illegal rejection, undo', async () => {
    const gameId = await makeActiveGame()
    const host = new Client('host', gameId)
    const guest = new Client('guest', gameId)

    const h0 = await host.nextOfType('state')
    const g0 = await guest.nextOfType('state')
    const hv = h0.view as PlayerView
    const gv = g0.view as PlayerView

    // hidden info: each sees own hand, only counts for the other
    expect(hv.viewerSeat).toBe(0)
    expect(gv.viewerSeat).toBe(1)
    expect(hv.hand.length).toBeGreaterThan(0)
    expect(hv.sides[1].handCount).toBeGreaterThan(0)
    expect(gv.hand.length).toBeGreaterThan(0)

    // the actor has legal actions; the other seat has none
    const actorSeat = hv.actorSeat
    const [actor, other] = actorSeat === 0 ? [host, guest] : [guest, host]
    const actorView = actorSeat === 0 ? hv : gv
    const otherView = actorSeat === 0 ? gv : hv
    expect(actorView.actions.length).toBeGreaterThan(0)
    expect(otherView.actions.length).toBe(0)

    // illegal: the off-window seat tries to act
    other.send({ t: 'action', action: { type: 'skipResource' } })
    const err = await other.nextError()
    expect(err.code).toBe('not-your-window')

    // legal: actor takes their first offered action
    actor.send({ t: 'action', action: actorView.actions[0] })
    const h1 = await host.nextOfType('state')
    const g1 = await guest.nextOfType('state')
    expect(h1.seq).toBe(1)
    expect(g1.seq).toBe(1)

    // undo rewinds to seq 0
    actor.send({ t: 'undo' })
    await host.nextOfType('undone')
    const h2 = await host.nextOfType('state')
    expect(h2.seq).toBe(0)
    await guest.nextOfType('undone')
    await guest.nextOfType('state')

    // spectator: sees no hands, cannot act
    const watcher = new Client('watcher', gameId)
    const w0 = await watcher.nextOfType('state')
    const wv = w0.view as PlayerView
    expect(wv.viewerSeat).toBeNull()
    expect(wv.hand.length).toBe(0)
    expect(wv.actions.length).toBe(0)
    watcher.send({ t: 'action', action: { type: 'pass' } })
    expect((await watcher.nextError()).code).toBe('spectator')

    host.close(); guest.close(); watcher.close()
  })

  it('a scripted 30-action game plays over the wire without a single error frame', async () => {
    const gameId = await makeActiveGame()
    const host = new Client('host', gameId)
    const guest = new Client('guest', gameId)
    let hostView = (await host.nextOfType('state')).view as PlayerView
    let guestView = (await guest.nextOfType('state')).view as PlayerView

    for (let i = 0; i < 30; i++) {
      const actorSeat = hostView.actorSeat
      const [actor] = actorSeat === 0 ? [host] : [guest]
      const view = actorSeat === 0 ? hostView : guestView
      if (view.winner !== null) break
      expect(view.actions.length).toBeGreaterThan(0)
      // deterministic-ish v2 policy: clear setup, then act (play/attack), answer intercept windows,
      // bank/move to keep the game moving, else fall through to skipResource/declineIntercept/pass.
      // Every option is taken straight from the server's legal-action list, so nothing can be illegal.
      const action: GameAction =
        view.actions.find(a => a.type === 'setupBank')
        ?? view.actions.find(a => a.type === 'play')
        ?? view.actions.find(a => a.type === 'attack')
        ?? view.actions.find(a => a.type === 'intercept')
        ?? view.actions.find(a => a.type === 'resource')
        ?? view.actions.find(a => a.type === 'move')
        ?? view.actions[0]
      actor.send({ t: 'action', action })
      hostView = (await host.nextOfType('state')).view as PlayerView
      guestView = (await guest.nextOfType('state')).view as PlayerView
    }

    // event log persisted and replayable: nuke the cache and reload via REST-side path
    const game = await prisma.game.findFirstOrThrow({ where: { id: gameId } })
    expect(game.currentSeq).toBeGreaterThan(10)
    await prisma.game.update({ where: { id: gameId }, data: { stateCache: null as unknown as object } })
    const { loadState } = await import('../src/gameStore.ts')
    const replayed = await loadState(gameId)
    expect(replayed.round).toBe(hostView.round) // replay reproduces the live state

    host.close(); guest.close()
  })
})
