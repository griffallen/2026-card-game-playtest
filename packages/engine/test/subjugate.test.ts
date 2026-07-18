import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/engine.ts'
import { createGame } from '../src/setup.ts'
import { V3_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'
import { PREBUILT_DECKS, deckSlugs } from '../src/decks.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { destroyUnit } from '../src/effects.ts'
import { effPower } from '../src/helpers.ts'
import type { CardDef, GameState, Seat } from '../src/types.ts'
import { put, toHand, toLoop } from './util.ts'

// ── #80 Subjugate — the game's first ENEMY-ATTACHING upgrade ─────────────────
// Type flips action → upgrade. It attaches to an enemy unit and strips −2 Power
// per pip in the host's printed cost (#117; Worldrender, 3 pips → −6, floors to 0), permanent while
// attached. Cost 3, two yellow pips (ruling: the PR's one-pip proposal was rejected).
// The debuff is a LIVE attached aura, not a snapshot — a salvaged Subjugate
// (decision 67) re-fits its new host's pip count.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 5000
/** Ready resources with a real yellow-pip slug — satisfies both cost and the v3 pip gate. */
function fuelYellow(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `y${n++}`
    s.cardOf[id] = 'iron-discipline'   // Iron Plating: pips [yellow]
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}

/** Real-cards game under the LIVE v3 ruleset (presence pips, orphaning upgrades). */
function arena(seed = 21) {
  let s = createGame({
    seed,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: CARD_SET,
    players: [
      { name: 'Ada', deck: deckSlugs(PREBUILT_DECKS[0]) },
      { name: 'Bo', deck: deckSlugs(PREBUILT_DECKS[1]) },
    ],
  })
  s = toLoop(s)
  const me = s.actorSeat
  const them = (1 - me) as Seat
  fuelYellow(s, me, 8)
  fuelYellow(s, them, 8)
  return { s, me, them }
}

describe('Subjugate (#80/#117): enemy-attach upgrade, −2 Power per host pip', () => {
  it('compiles to the locked design: upgrade, cost 3, two yellow pips, enemy attach, live −2/pip aura', () => {
    const def = CARD_SET['subjugate']
    expect(def.type).toBe('upgrade')
    expect(def.cost).toBe(3)
    expect(def.pips).toEqual(['yellow', 'yellow'])
    expect(def.attach).toEqual({ side: 'enemy' })
    expect(def.statics).toEqual([{ s: 'aura', scope: 'attached', pPerHostPip: -2 }])
    expect(def.targets ?? []).toEqual([])          // the attach target is implicit, like every upgrade
    expect(def.onPlay ?? []).toEqual([])           // the old −2 buff op is gone
    expect(validateCardSet(CARD_SET)).toEqual([])
  })

  it('attaches to an enemy unit and strips 2 Power per host pip (3 pips → −6, 1 pip → −2, both floor here)', () => {
    let { s, me, them } = arena()
    const wr = put(s, them, 'worldrender', 1)          // 4 power, pips [red, red, red]
    const imp = put(s, them, 'cinder-initiate', 1)     // 2 power, pips [red]
    expect(effPower(s, s.units[wr])).toBe(4)
    const c1 = toHand(s, me, 'subjugate')
    s = act(s, me, { type: 'play', card: c1, targets: [{ kind: 'unit', id: wr }] })
    expect(s.upgrades[c1]).toMatchObject({ attachedTo: wr, owner: me })
    expect(s.units[wr].upgrades).toContain(c1)
    expect(effPower(s, s.units[wr])).toBe(0)           // 4 − 6 (3 pips × 2), floored at 0
    const c2 = toHand(s, them, 'subjugate')
    s = act(s, them, { type: 'play', card: c2, targets: [{ kind: 'unit', id: put(s, me, 'spark-hound', 1) }] })
    expect(effPower(s, s.units[imp])).toBe(2)          // untouched bystander
    s.actorSeat = me
    const c3 = toHand(s, me, 'subjugate')
    s = act(s, me, { type: 'play', card: c3, targets: [{ kind: 'unit', id: imp }] })
    expect(effPower(s, s.units[imp])).toBe(0)          // 2 − 2 (1 pip × 2)
  })

  it('Power floors at 0 when the pip count meets or exceeds the body', () => {
    let { s, me, them } = arena()
    const colossus = put(s, them, 'gateward-colossus', 1) // 2 power, 3 yellow pips → floors at 0
    const card = toHand(s, me, 'subjugate')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: colossus }] })
    expect(effPower(s, s.units[colossus])).toBe(0)
  })

  it('the debuff is permanent while attached — it survives round transitions', () => {
    let { s, me, them } = arena()
    const wr = put(s, them, 'worldrender', 1)
    const card = toHand(s, me, 'subjugate')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: wr }] })
    expect(effPower(s, s.units[wr])).toBe(0)
    s = act(s, them, { type: 'pass' })
    s = act(s, me, { type: 'pass' })                   // two passes end the round
    s = toLoop(s)                                      // drive the next round's start steps
    expect(effPower(s, s.units[wr])).toBe(0)           // still shackled
    expect(s.upgrades[card].attachedTo).toBe(wr)
  })

  it('cannot attach to a friendly unit — and other upgrades still cannot attach to enemies', () => {
    let { s, me, them } = arena()
    const mine = put(s, me, 'vanguard-sentinel', me === 0 ? 0 : 2)
    const theirs = put(s, them, 'worldrender', 1)
    const subj = toHand(s, me, 'subjugate')
    expect(() => act(s, me, { type: 'play', card: subj, targets: [{ kind: 'unit', id: mine }] }))
      .toThrow(/enemy/)
    const plating = toHand(s, me, 'iron-discipline')
    expect(() => act(s, me, { type: 'play', card: plating, targets: [{ kind: 'unit', id: theirs }] }))
      .toThrow(/friendly/)
  })

  it('legal actions enumerate ONLY enemy hosts for Subjugate, only friendly for other upgrades', () => {
    const { s, me, them } = arena()
    const mine = put(s, me, 'vanguard-sentinel', me === 0 ? 0 : 2)
    const theirs = put(s, them, 'worldrender', 1)
    const subj = toHand(s, me, 'subjugate')
    const plating = toHand(s, me, 'iron-discipline')
    const plays = getLegalActions(s, me).filter(a => a.type === 'play')
    const hostsOf = (card: string) => plays
      .filter(a => a.type === 'play' && a.card === card)
      .map(a => (a.type === 'play' && a.targets?.[0]?.kind === 'unit' ? a.targets[0].id : ''))
    expect(hostsOf(subj)).toContain(theirs)
    expect(hostsOf(subj)).not.toContain(mine)
    expect(hostsOf(plating)).toContain(mine)
    expect(hostsOf(plating)).not.toContain(theirs)
  })

  it('respects the standing enemy-targeting protections: ready Hidden units refuse the shackle', () => {
    let { s, me, them } = arena()
    const ghost = put(s, them, 'veil-adept', 1)        // hidden while ready, 1 pip
    const card = toHand(s, me, 'subjugate')
    expect(() => act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: ghost }] }))
      .toThrow(/hidden/i)
    s.units[ghost].exhausted = true                    // decision 59: exhausted drops the veil
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: ghost }] })
    expect(s.upgrades[card].attachedTo).toBe(ghost)
  })

  it('host dies → Subjugate orphans (decision 67); salvage re-attaches to a NEW enemy host and re-fits its pips', () => {
    let { s, me, them } = arena()
    const wr = put(s, them, 'worldrender', 1)
    const card = toHand(s, me, 'subjugate')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: wr }] })
    destroyUnit(s, s.units[wr], 'slain')
    expect(s.units[wr]).toBeUndefined()
    expect(s.upgrades[card]).toMatchObject({ attachedTo: null, orphanedIn: 1 })
    // no dangling power math: a fresh enemy in the zone is untouched
    const imp = put(s, them, 'cinder-initiate', 1)     // 2 power, 1 pip
    expect(effPower(s, s.units[imp])).toBe(2)
    // salvage the way it plays: onto a unit hostile to the salvager — never your own
    const mine = put(s, me, 'vanguard-sentinel', 1)
    s.actorSeat = me
    expect(() => act(s, me, { type: 'attachOrphan', upgrade: card, unit: mine }))
      .toThrow(/enemy/)
    s = act(s, me, { type: 'attachOrphan', upgrade: card, unit: imp })
    expect(s.upgrades[card].attachedTo).toBe(imp)
    expect(effPower(s, s.units[imp])).toBe(0)          // −2: the LIVE aura re-fits the 1-pip host
  })

  it('salvage enumeration offers enemy hosts (not your own) for an orphaned Subjugate', () => {
    let { s, me, them } = arena()
    const wr = put(s, them, 'worldrender', 1)
    const card = toHand(s, me, 'subjugate')
    s = act(s, me, { type: 'play', card, targets: [{ kind: 'unit', id: wr }] })
    destroyUnit(s, s.units[wr], 'slain')
    const imp = put(s, them, 'cinder-initiate', 1)
    const mine = put(s, me, 'vanguard-sentinel', 1)
    s.actorSeat = me
    const salvages = getLegalActions(s, me).filter(a => a.type === 'attachOrphan' && a.upgrade === card)
    expect(salvages).toContainEqual({ type: 'attachOrphan', upgrade: card, unit: imp })
    expect(salvages.every(a => a.type === 'attachOrphan' && a.unit !== mine)).toBe(true)
  })

  it('validateCardSet rejects a bad attach shape and a mis-scoped pip aura', () => {
    const base: CardDef = { slug: 'x', name: 'x', color: 'yellow', type: 'upgrade', cost: 1, text: '' }
    expect(validateCardSet({ x: { ...base, attach: { side: 'sideways' as never } } })
      .some(e => e.includes('attach'))).toBe(true)
    expect(validateCardSet({ x: { ...base, type: 'unit', power: 1, health: 1, attach: { side: 'enemy' } } })
      .some(e => e.includes('attach'))).toBe(true)
    expect(validateCardSet({ x: { ...base, statics: [{ s: 'aura', scope: 'otherFriendly', pPerHostPip: -1 }] } })
      .some(e => e.includes('pPerHostPip'))).toBe(true)
    // and the real shape passes — a pip-scaled attached aura "grants something"
    expect(validateCardSet({ x: { ...base, attach: { side: 'enemy' }, statics: [{ s: 'aura', scope: 'attached', pPerHostPip: -1 }] } }))
      .toEqual([])
  })
})
