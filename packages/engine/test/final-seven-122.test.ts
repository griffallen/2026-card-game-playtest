import { describe, expect, it } from 'vitest'
import type { GameState, Seat, ZoneId } from '../src/types.ts'
import { homeZone } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { getLegalActions } from '../src/legal.ts'
import { validateCardSet } from '../src/validate.ts'
import { assertConservation, influenceFor, hasKw } from '../src/helpers.ts'
import { DEFAULT_RULES } from '../src/rules.ts'
import { CARD_SET } from '../src/cards/index.ts'

// ── #122 FINAL SEVEN purple cards (Griff's directives) ────────────────────────────────────────────
// Compile-shape + behavior for the last batch. The two load-bearing checks: the pick-from-hand
// `choose` phase — built for ACTIONS (Glimpse/Obscure onPlay) — now fires from NEW trigger contexts:
//   • Mist Stalker enqueues chooseFromHand from a UNIT's onPlay.
//   • Duskweaver Oracle enqueues it from a SNEAK activation (an `activate` action).
// Both must PARK in phase 'choose' after runOps and resolve cleanly, exactly like the action path.

const act = (s: GameState, seat: Seat, a: Parameters<typeof applyAction>[1]) => applyAction(s, a, seat).state

let n = 9000
function toHand(s: GameState, seat: Seat, slug: string): string {
  const id = `h${n++}`
  s.cardOf[id] = slug
  s.sides[seat].hand.push(id)
  return id
}
/** ready resources whose slug carries a purple pip — satisfies cost + (any) pip gate */
function fuel(s: GameState, seat: Seat, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `r${n++}`
    s.cardOf[id] = 'glimpse'
    s.sides[seat].resources.push({ id, exhausted: false })
  }
}
/** seed known cards onto the top of a deck (last pushed = top, popped first) */
function seedDeck(s: GameState, seat: Seat, slugs: string[]): string[] {
  const ids: string[] = []
  for (const slug of slugs) {
    const id = `d${n++}`
    s.cardOf[id] = slug
    s.sides[seat].deck.push(id)
    ids.push(id)
  }
  return ids
}
/** drop a real CARD_SET unit straight into play (ready unless told otherwise) */
function putUnit(s: GameState, seat: Seat, slug: string, zone: ZoneId, opts: { exhausted?: boolean; damage?: number } = {}): string {
  const id = `u${n++}`
  s.cardOf[id] = slug
  s.units[id] = {
    id, slug, owner: seat, zone, damage: opts.damage ?? 0, exhausted: opts.exhausted ?? false,
    enteredRound: 0, movedThisRound: false, shielded: false, imprisoned: null, upgrades: [], mods: [], overextendedBy: 0,
  }
  return id
}

/** loop-start game, empty hands/decks the test fills. Stock DEFAULT_RULES (intercept, pips off). */
function fresh(seed = 5): { s: GameState; me: Seat; them: Seat } {
  let s = createGame({
    seed,
    rules: { ...DEFAULT_RULES, chooseStartingResources: false, deckMinSize: 1, maxCopies: 20 },
    cardSet: CARD_SET,
    players: [{ name: 'Ada', deck: ['glimpse'] }, { name: 'Bo', deck: ['glimpse'] }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  const me = s.actorSeat
  const them = (1 - me) as Seat
  s.sides[0].hand = []; s.sides[1].hand = []
  s.sides[0].deck = []; s.sides[1].deck = []
  return { s, me, them }
}

describe('#122 final seven — compile to the locked design', () => {
  it('Mist Stalker: 1/1 Infiltrate, onPlay draw-1 then deckBottom-1; onKill influence gone', () => {
    const c = CARD_SET['mist-stalker']
    expect(c.type).toBe('unit')
    expect(c.cost).toBe(2)
    expect(c.power).toBe(1)
    expect(c.health).toBe(1)
    expect(c.pips).toEqual(['purple'])
    expect((c.kw ?? []).some(k => k.k === 'infiltrate')).toBe(true)
    expect(c.onPlay).toEqual([
      { op: 'draw', n: 1 },
      { op: 'chooseFromHand', to: 'deckBottom', n: 1 },
    ])
    expect(c.onKill).toBeUndefined()
  })

  it('Duskweaver Oracle: 2/6 cost 6, Politician + Sneak; onPlay draw+influence, Sneak draw2 + deckBottom', () => {
    const c = CARD_SET['duskweaver-oracle']
    expect(c.type).toBe('unit')
    expect(c.cost).toBe(6)
    expect(c.power).toBe(2)
    expect(c.health).toBe(6)
    expect((c.kw ?? []).some(k => k.k === 'politician')).toBe(true)
    expect((c.kw ?? []).some(k => k.k === 'sneak')).toBe(true)   // required for the Sneak to be activatable
    expect(c.onPlay).toEqual([
      { op: 'draw', n: 1 },
      { op: 'influence', n: 1 },
    ])
    expect(c.sneak).toEqual({
      ops: [
        { op: 'draw', n: 2 },
        { op: 'chooseFromHand', to: 'deckBottom', n: 1 },
      ],
    })
  })

  it('Veil of Silence: keeps the cantAttack grant, adds enemyBase damage per exhausted enemy unit', () => {
    const c = CARD_SET['veil-of-silence']
    expect(c.type).toBe('action')
    expect(c.cost).toBe(6)
    expect(c.pips).toEqual(['purple', 'purple'])
    expect(c.onPlay).toEqual([
      { op: 'grant', t: { side: 'enemy' }, kw: { k: 'cantAttack' }, dur: 'round' },
      { op: 'damage', t: 'enemyBase', n: 1, per: { count: 'exhaustedEnemyUnits' } },
    ])
  })

  it('Duskwing Tyrant: display name -> Duskwing Assassin, 1/4; slug + art path unchanged', () => {
    const c = CARD_SET['duskwing-tyrant']
    expect(c.slug).toBe('duskwing-tyrant')
    expect(c.name).toBe('Duskwing Assassin')
    expect(c.cost).toBe(4)
    expect(c.power).toBe(1)
    expect(c.health).toBe(4)
    expect(c.artUrl).toBe('/cards/duskwing-tyrant.jpg')
    expect((c.kw ?? []).map(k => k.k).sort()).toEqual(['hidden', 'sneak'])
    expect(c.sneak).toEqual({ targets: [{ t: 'unit', side: 'enemy' }], ops: [{ op: 'damage', t: 'chosen0', n: 2 }] })
  })

  it('Shade of the Bazaar: health 2, single purple pip (cost 4 kept), onPlay draw unchanged', () => {
    const c = CARD_SET['shade-of-the-bazaar']
    expect(c.cost).toBe(4)
    expect(c.power).toBe(3)
    expect(c.health).toBe(2)
    expect(c.pips).toEqual(['purple'])   // tax-EASIER deviation (grammar wants 2 pips at cost 4)
    expect(c.onPlay).toEqual([{ op: 'draw', n: 1 }])
  })

  it('Nocturne Sniper: 0/3 Ranged 3, all influence effects removed', () => {
    const c = CARD_SET['nocturne-sniper']
    expect(c.cost).toBe(5)
    expect(c.power).toBe(0)
    expect(c.health).toBe(3)
    expect(c.kw).toEqual([{ k: 'ranged', n: 3 }])
    expect(c.onKill).toBeUndefined()
    expect(c.onPlay).toBeUndefined()
    expect(c.text.trim()).toBe('Ranged 3.')
  })

  it('Veilmaster: power 1, everything else untouched (3 purple pips, Hidden aura)', () => {
    const c = CARD_SET['veilmaster']
    expect(c.cost).toBe(5)
    expect(c.power).toBe(1)
    expect(c.health).toBe(5)
    expect(c.pips).toEqual(['purple', 'purple', 'purple'])
    expect(c.statics).toEqual([{ s: 'aura', scope: 'otherFriendly', kw: { k: 'hidden' } }])
  })

  it('the whole card set still validates clean', () => {
    expect(validateCardSet(CARD_SET)).toEqual([])
  })
})

describe('#122 Mist Stalker — chooseFromHand parks `choose` from a UNIT onPlay', () => {
  it('play parks in choose, resolves the bottom pick, then advances the window', () => {
    const { s: g, me } = fresh()
    let s = g
    const mist = toHand(s, me, 'mist-stalker')
    const held = toHand(s, me, 'dream-thief')       // pre-held — proves the pick ranges over the whole hand
    const [drawn] = seedDeck(s, me, ['cull-the-weak'])
    fuel(s, me, 2)

    s = act(s, me, { type: 'play', card: mist })
    // the UNIT is on the field, and the play PARKED (did not advance) on its onPlay pick
    expect(s.units[mist]).toBeTruthy()
    expect(s.phase).toBe('choose')
    expect(s.actorSeat).toBe(me)
    expect(s.chooseOpener).toBe(me)
    expect(s.pendingChoices).toEqual([{ seat: me, to: 'deckBottom', srcLabel: 'Mist Stalker' }])
    // draw already resolved inline: the drawn card is in hand alongside the pre-held one
    expect([...s.sides[me].hand].sort()).toEqual([held, drawn].sort())

    const legal = getLegalActions(s, me)
    expect(legal.every(a => a.type === 'resolveChoice')).toBe(true)
    expect(legal).toHaveLength(2)

    s = act(s, me, { type: 'resolveChoice', card: held })
    // drained → back to the loop, window advanced past the caster
    expect(s.phase).toBe('loop')
    expect(s.pendingChoices).toHaveLength(0)
    expect(s.chooseOpener).toBeNull()
    expect(s.actorSeat).not.toBe(me)
    expect(s.sides[me].deck[0]).toBe(held)          // buried on the bottom (index 0)
    expect(s.sides[me].hand).toEqual([drawn])
    assertConservation(s)
  })
})

describe('#122 Duskweaver Oracle — onPlay inline; Sneak parks `choose` from an ACTIVATE', () => {
  it('onPlay draws a card and gains 1 Influence, no pending choice', () => {
    const { s: g, me } = fresh()
    let s = g
    const oracle = toHand(s, me, 'duskweaver-oracle')
    seedDeck(s, me, ['cull-the-weak'])
    fuel(s, me, 6)
    const inf0 = influenceFor(s, me)

    s = act(s, me, { type: 'play', card: oracle })
    expect(s.units[oracle]).toBeTruthy()
    expect(s.phase).toBe('loop')                    // no chooseFromHand on the enter-play bundle
    expect(s.pendingChoices).toHaveLength(0)
    expect(influenceFor(s, me)).toBe(inf0 + 1)
    expect(s.sides[me].hand).toHaveLength(1)         // drew 1
    assertConservation(s)
  })

  it('Sneak (an activate action) enqueues a deckBottom pick, parks choose, resolves, continues', () => {
    const { s: g, me } = fresh()
    let s = g
    const oracle = putUnit(s, me, 'duskweaver-oracle', homeZone(me))   // in play, READY
    const [d1, d2] = seedDeck(s, me, ['dream-thief', 'cull-the-weak']) // Sneak draws 2 (d2 first, then d1)

    // the Sneak is offered as an activate with no targets
    expect(getLegalActions(s, me)).toContainEqual({ type: 'activate', unit: oracle })

    s = act(s, me, { type: 'activate', unit: oracle })
    // PARKED in choose from the ACTIVATE path — the crux of the new-trigger-context verification
    expect(s.phase).toBe('choose')
    expect(s.actorSeat).toBe(me)
    expect(s.chooseOpener).toBe(me)
    expect(s.units[oracle].exhausted).toBe(true)    // the Sneak tapped it
    // NOTE: the Sneak's runOps threads no srcLabel (engine.ts:312), unlike a unit's onPlay
    // (playCard passes srcLabel: def.name) — so a Sneak-triggered pick carries an empty label.
    // Pre-existing behavior shared by every Sneak card; the parking/resolution below is the contract.
    expect(s.pendingChoices).toEqual([{ seat: me, to: 'deckBottom', srcLabel: '' }])
    expect([...s.sides[me].hand].sort()).toEqual([d1, d2].sort())   // both draws landed

    const legal = getLegalActions(s, me)
    expect(legal.every(a => a.type === 'resolveChoice')).toBe(true)
    expect(legal).toHaveLength(2)

    s = act(s, me, { type: 'resolveChoice', card: d1 })
    expect(s.phase).toBe('loop')
    expect(s.pendingChoices).toHaveLength(0)
    expect(s.chooseOpener).toBeNull()
    expect(s.actorSeat).not.toBe(me)
    expect(s.sides[me].deck[0]).toBe(d1)            // bottomed
    expect(s.sides[me].hand).toEqual([d2])
    assertConservation(s)
  })
})

describe('#122 Veil of Silence — enemyBase damage scales with exhausted enemy units', () => {
  it('deals damage equal to the count of EXHAUSTED ENEMY units (ready enemies and exhausted allies excluded)', () => {
    const { s: g, me, them } = fresh()
    let s = g
    const e1 = putUnit(s, them, 'dusk-archer', 1, { exhausted: true })   // exhausted enemy #1
    const e2 = putUnit(s, them, 'nightweaver', 1, { exhausted: true })   // exhausted enemy #2
    putUnit(s, them, 'veil-adept', 1)                                    // READY enemy — not counted
    putUnit(s, me, 'dusk-archer', 0, { exhausted: true })                // exhausted FRIENDLY — not counted
    const veil = toHand(s, me, 'veil-of-silence')
    fuel(s, me, 6)
    const life0 = s.sides[them].life

    s = act(s, me, { type: 'play', card: veil })
    expect(s.sides[them].life).toBe(life0 - 2)      // exactly the two exhausted enemies
    // the existing effect still lands: enemy units can't attack this round
    expect(hasKw(s, s.units[e1], 'cantAttack')).toBe(true)
    expect(hasKw(s, s.units[e2], 'cantAttack')).toBe(true)
    assertConservation(s)
  })

  it('no exhausted enemies → the base takes nothing (clean no-op)', () => {
    const { s: g, me, them } = fresh()
    let s = g
    putUnit(s, them, 'veil-adept', 1)               // READY enemy only
    const veil = toHand(s, me, 'veil-of-silence')
    fuel(s, me, 6)
    const life0 = s.sides[them].life

    s = act(s, me, { type: 'play', card: veil })
    expect(s.sides[them].life).toBe(life0)
    assertConservation(s)
  })
})
