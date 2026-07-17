import { describe, it, expect } from 'vitest'
import type { CardSet, GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put, toHand } from './util.ts'

// PRs #38/#39 — the two ops their new text demanded.
// Unchained Rage: `attackTax` — every attack declaration cedes n influence per attacker, rounds rounds.
// Final Onslaught: `doom` — after the extra action, the readied unit dies, and so does
// every unit its attack actually wounded.
const SET: CardSet = {
  ...T,
  mastiff: { slug: 'mastiff', name: 'mastiff', color: 'red', type: 'unit', cost: 3, power: 4, health: 3, text: '',
    kw: [{ k: 'guard' }] },   // decision 98: duels admit only guards — the doom tests' blocker
  rage: { slug: 'rage', name: 'rage', color: 'red', type: 'action', cost: 0, text: '',
    onPlay: [{ op: 'double', t: { side: 'friendly' }, rounds: 2 }, { op: 'attackTax', n: 2, rounds: 2 }] },
  finale: { slug: 'finale', name: 'finale', color: 'red', type: 'action', cost: 0, text: '',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'ready', side: 'friendly', t: 'chosen0' }, { op: 'extraAction' }, { op: 'doom', t: 'chosen0' }] },
}

function g(): GameState {
  let s = createGame({
    seed: 38,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: SET,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

/** Both seats pass, then drive the next round's bank steps to the loop. */
function nextRound(s: GameState): GameState {
  s = applyAction(s, { type: 'pass' }, s.actorSeat).state
  s = applyAction(s, { type: 'pass' }, s.actorSeat).state
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('attackTax (Unchained Rage, PR #39)', () => {
  it('charges n influence per attacker at declaration, and only taxes its own seat', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const a1 = put(s, me, 'brute', 1)
    const a2 = put(s, me, 'soldier', 1)
    const wall = put(s, them, 'wall', 1, { exhausted: true })   // nothing ready — no block window
    const rage = toHand(s, me, 'rage')
    s = applyAction(s, { type: 'play', card: rage }, me).state
    expect(s.attackTaxes).toEqual([{ seat: me, n: 2, rounds: 2 }])
    s = applyAction(s, { type: 'pass' }, them).state   // window came back around
    const before = s.influence
    s = applyAction(s, { type: 'attack', attackers: [a1, a2], target: { kind: 'unit', id: wall } }, me).state
    // one shared track: seat 0 losing pushes it negative, seat 1 losing pushes it positive
    expect(s.influence).toBe(me === 0 ? before - 4 : before + 4)
  })

  it('expires after its rounds tick down at round end', () => {
    let s = g()
    const me = s.actorSeat
    const rage = toHand(s, me, 'rage')
    s = applyAction(s, { type: 'play', card: rage }, me).state
    expect(s.attackTaxes[0].rounds).toBe(2)
    s = nextRound(s)
    expect(s.attackTaxes[0].rounds).toBe(1)
    s = nextRound(s)
    expect(s.attackTaxes).toEqual([])
  })
})

// #107 rework: doom no longer kills "units the attack wounded" — it immolates the readied unit
// (Y = its remaining Health, always lethal) and pours Y over every OTHER unit in its zone, yours too.
describe('doom (Final Onslaught, #107 rework)', () => {
  it('after a non-attack action, the readied unit dies and blasts Y = its Health across the zone (friend + foe)', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const home = me === 0 ? 0 : 2
    const vet = put(s, me, 'brute', home, { exhausted: true })   // 4/3 → Y = 3
    const ally = put(s, me, 'wall', 1)                           // neutral 0/5 → takes 3, survives (friendly fire)
    const foe = put(s, them, 'soldier', 1)                       // neutral 2/2 → takes 3, dies
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    expect(s.units[vet].exhausted).toBe(false)     // readied
    expect(s.doom).toEqual({ unit: vet, seat: me, stage: 'waiting' })
    expect(s.actorSeat).toBe(me)                   // extra action window
    s = applyAction(s, { type: 'move', unit: vet, to: 1 }, me).state   // carry vet into the crowd
    expect(s.units[vet]).toBeUndefined()           // always dies
    expect(s.units[foe]).toBeUndefined()           // ate Y = 3
    expect(s.units[ally]).toBeDefined()
    expect(s.units[ally].damage).toBe(3)           // own unit takes Y too
    expect(s.doom).toBeNull()
  })

  it('Y is the doomed unit\'s REMAINING Health, not its printed Health', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const home = me === 0 ? 0 : 2
    const vet = put(s, me, 'brute', home, { exhausted: true, damage: 1 })  // 4/3 with 1 damage → Y = 2
    const dies = put(s, them, 'soldier', 1)   // 2/2 → takes 2, dies
    const lives = put(s, them, 'brute', 1)    // 4/3 → takes 2, survives
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    s = applyAction(s, { type: 'move', unit: vet, to: 1 }, me).state
    expect(s.units[dies]).toBeUndefined()
    expect(s.units[lives]).toBeDefined()
    expect(s.units[lives].damage).toBe(2)     // Y = 2, not the printed 3
  })

  it('the self-hit ALWAYS kills — armor the Y damage could not pierce does not save the doomed unit', () => {
    let s = g()
    const me = s.actorSeat
    const home = me === 0 ? 0 : 2
    const vet = put(s, me, 'plated', home, { exhausted: true })  // 2/3, Armor 2 → Y = 3, which armor would blunt to 1
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    s = applyAction(s, { type: 'move', unit: vet, to: 1 }, me).state
    expect(s.units[vet]).toBeUndefined()      // destroyed outright — armor never saves the doomed
    expect(s.doom).toBeNull()
  })

  it('if the readied unit dies during its own action, there is no detonation', () => {
    let s = g()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const vet = put(s, me, 'soldier', 1, { exhausted: true })          // 2/2 in neutral
    const guard = put(s, them, 'mastiff', 1)                           // 4/3 GUARD — blocks and its counter kills vet
    const bystander = put(s, them, 'soldier', 1, { exhausted: true })  // neutral — would eat a blast if one came
    const finale = toHand(s, me, 'finale')
    s = applyAction(s, { type: 'play', card: finale, targets: [{ kind: 'unit', id: vet }] }, me).state
    s = applyAction(s, { type: 'attack', attackers: [vet], target: { kind: 'unit', id: guard } }, me).state
    s = applyAction(s, { type: 'block', pairs: [{ blocker: guard, onto: vet }] }, them).state
    expect(s.units[vet]).toBeUndefined()          // vet fell in combat, before the immolation step
    expect(s.units[bystander]).toBeDefined()
    expect(s.units[bystander].damage).toBe(0)     // nothing left to immolate → no zone blast
    expect(s.doom).toBeNull()
  })
})
