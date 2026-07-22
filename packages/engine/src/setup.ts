import type { CardSet, GameState, RulesConfig, Seat } from './types.ts'
import { EngineError } from './types.ts'
import { rngInt, shuffle } from './rng.ts'
import { log } from './helpers.ts'
import { startRound } from './round.ts'

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
  // Fail loudly on rules values the engine doesn't implement yet, rather than silently ignoring them (audit F7).
  if (rules.counterAssignment !== 'auto') throw new EngineError('unsupported-rule', `counterAssignment '${rules.counterAssignment}' is not implemented (only 'auto')`)
  if (!['decrement', 'london'].includes(rules.mulliganStyle)) throw new EngineError('unsupported-rule', `mulliganStyle '${rules.mulliganStyle}' is not implemented (decrement|london)`)
  if (rules.armorPerAttack !== 'once') throw new EngineError('unsupported-rule', `armorPerAttack '${rules.armorPerAttack}' is not implemented (only 'once')`)

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
    round: 1,
    initiative: first as Seat,
    phase: rules.chooseStartingResources ? 'setup' : 'bank',
    actorSeat: first as Seat,
    startStep: null,
    bankedThisStep: 0,
    outOfRound: [false, false],
    claimedThisRound: false,
    setupBanked: [!rules.chooseStartingResources, !rules.chooseStartingResources],
    mulligans: [0, 0],
    passStreak: 0,
    pendingExtraAction: null,
    pendingAttack: null,
    pendingChoices: [],
    chooseOpener: null,
    pendingSplash: null,
    hope: [0, 0],
    influence: 0,
    sides,
    units: {},
    captives: {},
    attackTaxes: [],
    lastStands: [],
    doom: null,
    upgrades: {},
    preventBase: [0, 0],
    homeWard: [false, false],
    blockerWard: [false, false],
    cardPlayLock: [false, false],
    deaths: [0, 0],
    reveals: [],
    winner: null,
    winReason: null,
    log: [],
    nextId,
  }
  log(state, null, `${sides[0].name} vs ${sides[1].name} — ${sides[first as Seat].name} takes the 🥇 Regroup marker`)
  if (rules.chooseStartingResources) {
    log(state, null, `Setup: each player banks ${rules.startingResources} starting resources, ${sides[first as Seat].name} first`)
  } else {
    startRound(state)
  }
  return state
}
