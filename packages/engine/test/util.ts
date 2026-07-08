import type { CardDef, CardSet, GameState, Seat, ZoneId } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { DEFAULT_RULES } from '../src/rules.ts'

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost, power, health, text: '', ...extra })

/** Toy card set exercising every core mechanic without real-card effects. */
export const T: CardSet = {
  pawn: u('pawn', 1, 1, 1),
  soldier: u('soldier', 2, 2, 2),
  brute: u('brute', 3, 4, 3),
  wall: u('wall', 2, 0, 5, { kw: [{ k: 'cantAttack' }] }),
  guardian: u('guardian', 2, 1, 3, { kw: [{ k: 'guard' }] }),
  plated: u('plated', 3, 2, 3, { kw: [{ k: 'armor', n: 2 }] }),
  runner: u('runner', 1, 1, 1, { kw: [{ k: 'rush' }] }),
  archer: u('archer', 2, 2, 2, { kw: [{ k: 'ranged' }] }),
  crusher: u('crusher', 4, 3, 3, { kw: [{ k: 'breakthrough', n: 2 }] }),
  loner: u('loner', 2, 2, 2, { kw: [{ k: 'overextend', n: 3 }] }),
  hawk: u('hawk', 3, 2, 2, { kw: [{ k: 'flying' }] }),
  bolt: { slug: 'bolt', name: 'bolt', color: 'red', type: 'action', cost: 1, text: '',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'any' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2 }] },
}
export const toyDeck = () => Object.keys(T).flatMap(slug => [slug, slug, slug, slug])

export function game(seed = 5): GameState {
  // legacy fixtures pin the zero-input setup; the setup-phase flow has its own tests
  return createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false },
    cardSet: T,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
}

let n = 1000
/** Force a unit into play for combat fixtures (bypasses costs; tests own the setup). */
export function put(state: GameState, seat: Seat, slug: string, zone: ZoneId, opts: Partial<{
  exhausted: boolean; damage: number; enteredTurn: number; imprisonedBy: Seat
}> = {}): string {
  const id = `t${n++}`
  state.cardOf[id] = slug
  state.units[id] = {
    id, slug, owner: seat, zone,
    damage: opts.damage ?? 0,
    exhausted: opts.exhausted ?? false,
    enteredTurn: opts.enteredTurn ?? 0,
    imprisoned: opts.imprisonedBy !== undefined ? { by: opts.imprisonedBy, source: null } : null,
    upgrades: [],
    mods: [],
    overextendedBy: 0,
  }
  return id
}

/** Give a seat n ready resources on top of whatever it has. */
export function fuel(state: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `r${n++}`
    state.cardOf[id] = 'pawn'
    state.sides[seat].resources.push({ id, exhausted: false })
  }
}

/** Put a specific card in hand, returning its instance id. */
export function toHand(state: GameState, seat: Seat, slug: string): string {
  const id = `h${n++}`
  state.cardOf[id] = slug
  state.sides[seat].hand.push(id)
  return id
}
