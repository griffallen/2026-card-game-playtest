import type { CardSet, GameState, RulesConfig, Seat } from './types.ts'
import { EngineError } from './types.ts'
import { rngInt, shuffle } from './rng.ts'
import { log } from './helpers.ts'
import { startTurn } from './turn.ts'

export interface CreateGameOpts {
  seed: number
  rules: RulesConfig
  cardSet: CardSet
  players: [{ name: string; deck: string[] }, { name: string; deck: string[] }]
}

/** Deck legality errors ([] = legal). Exported for the server (deck editor + game creation). */
export function validateDeck(slugs: string[], cardSet: CardSet, rules: RulesConfig): string[] {
  const errors: string[] = []
  if (slugs.length < rules.deckMinSize) errors.push(`deck has ${slugs.length} cards; minimum is ${rules.deckMinSize}`)
  const counts = new Map<string, number>()
  for (const slug of slugs) {
    if (!cardSet[slug]) { errors.push(`unknown card: ${slug}`); continue }
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  for (const [slug, n] of counts) {
    if (n > rules.maxCopies) errors.push(`${slug}: ${n} copies exceeds the ${rules.maxCopies}-copy limit`)
  }
  return errors
}

export function createGame(opts: CreateGameOpts): GameState {
  const { seed, rules, cardSet, players } = opts
  for (const p of players) {
    const errors = validateDeck(p.deck, cardSet, rules)
    if (errors.length) throw new EngineError('illegal-deck', `${p.name}: ${errors.join('; ')}`)
  }

  let rngState = seed | 0
  const cardOf: Record<string, string> = {}
  let nextId = 0

  const sides = players.map((p, seat) => {
    const ids = p.deck.map(slug => {
      const id = `c${nextId++}`
      cardOf[id] = slug
      return id
    })
    let deck: string[]
    ;[deck, rngState] = shuffle(ids, rngState)
    const hand: string[] = []
    for (let i = 0; i < rules.startingHandSize; i++) {
      const id = deck.pop()
      if (id) hand.push(id)
    }
    // decision 31: players choose their banks in the Setup phase; the auto mode
    // (bank the last N drawn) survives behind chooseStartingResources=false
    const resources = rules.chooseStartingResources
      ? []
      : hand.splice(hand.length - rules.startingResources, rules.startingResources).map(id => ({ id, exhausted: false }))
    return {
      name: p.name || `Player ${seat + 1}`,
      life: rules.startingLife,
      deck,
      hand,
      resources,
      discard: [] as string[],
    }
  }) as GameState['sides']

  let first: number
  ;[first, rngState] = rngInt(rngState, 2)

  const state: GameState = {
    rngState,
    rules,
    cardSet,
    cardOf,
    turn: 1,
    activeSeat: first as Seat,
    phase: rules.chooseStartingResources ? 'setup' : 'resource',
    actorSeat: first as Seat,
    setupBanked: [!rules.chooseStartingResources, !rules.chooseStartingResources],
    passStreak: 0,
    resourcedThisTurn: 0,
    firstPlayer: first as Seat,
    pendingExtraTurn: null,
    influence: 0,
    sides,
    units: {},
    upgrades: {},
    preventBase: [0, 0],
    winner: null,
    winReason: null,
    log: [],
    nextId,
  }
  log(state, null, `${sides[0].name} vs ${sides[1].name} — ${sides[first as Seat].name} goes first`)
  if (rules.chooseStartingResources) {
    log(state, null, `Setup: each player banks ${rules.startingResources} starting resources, ${sides[first as Seat].name} first`)
  } else {
    startTurn(state)
  }
  return state
}
