import type { CardDef, CardSet, GameState, Seat, ZoneId } from '@newgame/engine'
import { DEFAULT_RULES, createGame } from '@newgame/engine'

const u = (slug: string, cost: number, power: number, health: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ slug, name: slug, color: 'red', type: 'unit', cost, power, health, text: '', ...extra })

/** Toy card set: profiles the feature tests assert against (no real-card effects). */
export const TOY: CardSet = {
  rusher: u('rusher', 3, 3, 2, { kw: [{ k: 'rush' }] }),        // the "two 3/2 rush units" case
  bruiser: u('bruiser', 4, 5, 4, { kw: [{ k: 'breakthrough', n: 1 }] }),
  flyer: u('flyer', 2, 2, 1, { kw: [{ k: 'ranged', n: 1 }] }),   // was 'flying' — cut keyword; any kw serves the fixture
  wall: u('wall', 1, 0, 4, { kw: [{ k: 'guard' }] }),
  grunt: u('grunt', 2, 2, 2),
}

/** A valid GameState with an EMPTY board — tests place exactly the units they need. */
export function blankGame(seed = 7): GameState {
  const deck = Object.keys(TOY).flatMap(s => [s, s, s, s])
  const state = createGame({
    seed,
    rules: { ...DEFAULT_RULES, deckMinSize: 0, chooseStartingResources: false },
    cardSet: TOY,
    players: [{ name: 'Me', deck }, { name: 'Op', deck }],
  })
  state.units = {}
  return state
}

let counter = 5000
/** Drop a unit onto the board directly (bypasses costs/phases — the fixture owns the setup). */
export function place(
  state: GameState, seat: Seat, slug: string, zone: ZoneId = 1,
  opts: Partial<{ damage: number; exhausted: boolean; enteredRound: number; imprisonedBy: Seat }> = {},
): string {
  const id = `x${counter++}`
  state.cardOf[id] = slug
  state.units[id] = {
    id, slug, owner: seat, zone,
    damage: opts.damage ?? 0,
    exhausted: opts.exhausted ?? false,
    enteredRound: opts.enteredRound ?? 0,
    movedThisRound: false,
    shielded: (state.cardSet[slug]?.kw ?? []).some(k => k.k === 'shielded'),
    imprisoned: opts.imprisonedBy !== undefined ? { by: opts.imprisonedBy, source: null } : null,
    upgrades: [],
    mods: [],
    overextendedBy: 0,
  }
  return id
}
