import type { CardDef, CardSet, GameAction, GameState, RulesConfig, Seat } from '@newgame/engine'
import { EngineError, applyAction, createGame, normalizeRules } from '@newgame/engine'
import type { Card, Game } from '@prisma/client'
import { prisma } from './db.ts'

/** A DB card row → engine CardDef: effects JSON is the structure, columns are the editable projection. */
export function cardDefFromRow(row: Card): CardDef {
  const base = row.effects as unknown as CardDef
  return {
    ...base,
    slug: row.slug,
    name: row.name,
    color: row.color as CardDef['color'],
    type: row.type as CardDef['type'],
    cost: row.cost,
    power: row.power ?? undefined,
    health: row.health ?? undefined,
    text: row.text,
    artUrl: row.artUrl,
    designerNote: row.designerNote ?? undefined,
  }
}

interface DeckSnapshot { name: string; slugs: string[]; player?: string }

export function initialState(game: Game): GameState {
  const rules = normalizeRules(game.rulesConfig as Partial<RulesConfig>)
  const cardSet = game.cardSet as unknown as CardSet
  const host = game.hostDeck as unknown as DeckSnapshot
  const guest = game.guestDeck as unknown as DeckSnapshot
  return createGame({
    seed: game.seed,
    rules,
    cardSet,
    players: [
      { name: host.player ?? host.name, deck: host.slugs },
      { name: guest.player ?? guest.name, deck: guest.slugs },
    ],
  })
}

/** Replay from the event log (cache miss / undo). Determinism contract from game-rules §1.13. */
export async function loadState(gameId: string): Promise<GameState> {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } })
  if (game.status !== 'active' && game.status !== 'finished') throw new EngineError('not-started', 'game has not started')
  if (game.stateCache) return game.stateCache as unknown as GameState
  const events = await prisma.gameEvent.findMany({ where: { gameId }, orderBy: { seq: 'asc' } })
  let state = initialState(game)
  for (const ev of events) {
    state = applyAction(state, ev.action as unknown as GameAction, ev.actorSeat as Seat).state
  }
  await prisma.game.update({ where: { id: gameId }, data: { stateCache: state as unknown as object } })
  return state
}

// One in-flight mutation per game (single-instance deployment assumption — fine on one fly machine).
const locks = new Map<string, Promise<unknown>>()
async function withGameLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(gameId) ?? Promise.resolve()
  const run = prev.then(fn, fn)
  locks.set(gameId, run.catch(() => undefined))
  try {
    return await run
  } finally {
    if (locks.get(gameId) === run.catch(() => undefined)) locks.delete(gameId)
  }
}

export interface ApplyOutcome { state: GameState; seq: number }

export async function applyAndPersist(gameId: string, action: GameAction, seat: Seat): Promise<ApplyOutcome> {
  return withGameLock(gameId, async () => {
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } })
    if (game.status !== 'active') throw new EngineError('not-active', 'game is not active')
    const state = await loadState(gameId)
    const { state: next } = applyAction(state, action, seat)
    const seq = game.currentSeq + 1
    await prisma.$transaction([
      prisma.gameEvent.create({ data: { gameId, seq, actorSeat: seat, action: action as object } }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          currentSeq: seq,
          stateCache: next as unknown as object,
          ...(next.winner !== null
            ? { status: 'finished', winnerSeat: next.winner, winReason: next.winReason, finishedAt: new Date() }
            : {}),
        },
      }),
    ])
    return { state: next, seq }
  })
}

/** Rewind one action: drop the last event, invalidate the cache, replay. */
export async function undoLast(gameId: string): Promise<ApplyOutcome> {
  return withGameLock(gameId, async () => {
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } })
    if (game.currentSeq === 0) throw new EngineError('nothing-to-undo', 'no actions to undo')
    await prisma.$transaction([
      prisma.gameEvent.delete({ where: { gameId_seq: { gameId, seq: game.currentSeq } } }),
      prisma.game.update({
        where: { id: gameId },
        data: {
          currentSeq: game.currentSeq - 1,
          stateCache: null as unknown as object,
          status: 'active',
          winnerSeat: null,
          winReason: null,
          finishedAt: null,
        },
      }),
    ])
    const state = await loadState(gameId)
    return { state, seq: game.currentSeq - 1 }
  })
}

export function seatOf(game: { hostId: string; guestId: string | null }, userId: string): Seat | null {
  if (game.hostId === userId) return 0
  if (game.guestId === userId) return 1
  return null
}
