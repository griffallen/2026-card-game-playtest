import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { heuristicPolicy } from '../src/ai.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put, toHand, fuel } from './util.ts'
import { homeZone } from '../src/types.ts'
import type { CardSet } from '../src/types.ts'

// decision 98 (duel law): only guards answer a lone attacker
const D: CardSet = {
  ...T,
  gwall: { slug: 'gwall', name: 'gwall', color: 'yellow', type: 'unit', cost: 2, power: 0, health: 5, text: '', kw: [{ k: 'cantAttack' }, { k: 'guard' }] },
  // a Fortress-Keeper-shaped wall: fat, cheap-to-print, and pricey by sticker value (cost+power)
  fkeep: { slug: 'fkeep', name: 'fkeep', color: 'yellow', type: 'unit', cost: 6, power: 2, health: 7, text: '', kw: [{ k: 'cantAttack' }] },
}

// Designer doctrine for the bot (#25, 2026-07-12): "always favor damage to a base and then
// unit removal. Remember it's meant to move quick." Plus: the bot must actually know how to
// block (the old policy scored every block action zero and picked randomly).
function v3game(): GameState {
  let s = createGame({
    seed: 91,
    rules: { ...V3_RULES, chooseStartingResources: false },
    cardSet: D,
    players: [{ name: 'Ada', deck: toyDeck() }, { name: 'Bo', deck: toyDeck() }],
  })
  while (s.phase === 'bank') s = applyAction(s, { type: 'skipResource' }, s.actorSeat).state
  return s
}

describe('bot doctrine (#25)', () => {
  it('face first: with a base attack and a unit attack both open, the bot goes for the base', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const enemyHome = them === 0 ? 0 : 2
    put(s, me, 'brute', enemyHome)                       // 4/3 standing at their gates
    put(s, them, 'pawn', enemyHome, { exhausted: true }) // a 1/1 it could remove instead
    s.actorSeat = me
    // strip hand plays so the choice is purely attack-vs-attack
    s.sides[me].hand = []
    const [action] = heuristicPolicy(s, me, 7)
    expect(action.type).toBe('attack')
    expect(action.type === 'attack' && action.target.kind).toBe('base')
  })

  it('the bot blocks when a block saves its skin instead of shrugging randomly', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    const raider = put(s, me, 'soldier', 1)               // 2/2 attacker
    const jewel = put(s, them, 'warden', 1, { exhausted: true })  // 1/3 exhausted engine piece (dies unblocked? 2<3 dmg... adjust)
    const wall = put(s, them, 'gwall', 1)                 // 0/5 guard — the only legal savior under decision 98
    s.actorSeat = me
    let next = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'unit', id: jewel } }, me).state
    expect(next.phase).toBe('block')
    const [answer] = heuristicPolicy(next, them, 7)
    expect(answer.type).toBe('block')
    expect(answer.type === 'block' && answer.pairs.length).toBeGreaterThan(0)
    expect(answer.type === 'block' && answer.pairs[0].blocker).toBe(wall)
  })

  // #68 primary defect: a heavily damaged wall was charged FULL sticker price to die, so the bot
  // declined a strictly-winning block (kills the raider on the counter, keeps the hit off the base,
  // and the wall was two-sevenths from dead anyway). Fix: discount the death penalty by remaining stock.
  it('a nearly-dead wall still takes a strictly-winning block instead of declining (#68)', () => {
    for (const rng of [1, 2, 3, 7, 11, 13]) {
      const s = v3game()
      const me = s.actorSeat, them = (1 - me) as 0 | 1
      const enemyHome = them === 0 ? 0 : 2
      const raider = put(s, me, 'soldier', enemyHome)               // 2/2 marching on the base
      const wall = put(s, them, 'fkeep', enemyHome, { damage: 5 })  // 2/7 cantAttack, 2 health left, ready
      s.actorSeat = me
      const next = applyAction(s, { type: 'attack', attackers: [raider], target: { kind: 'base', seat: them } }, me).state
      expect(next.phase).toBe('block')
      const [answer] = heuristicPolicy(next, them, rng)
      // blocking is strictly dominant: counter (2) kills the 2/2, the base takes nothing, and the
      // wall — already 5-of-7 dead — trades a sliver for the raider. It must NOT let it through.
      expect(answer.type === 'block' && answer.pairs.length, `rng ${rng} declined a winning block`).toBeGreaterThan(0)
      expect(answer.type === 'block' && answer.pairs[0].blocker).toBe(wall)
    }
  })

  // #68 Fix 2: a cheap Guard in hand is a shield when the Home is under siege, not a spare resource.
  it('keeps a Guard in hand when the Home is under siege instead of banking it (#68)', () => {
    for (const rng of [1, 2, 3, 7]) {
      const s = v3game()
      const me = s.actorSeat, them = (1 - me) as 0 | 1
      put(s, them, 'brute', homeZone(me))          // an enemy at our gates
      s.sides[me].resources = []                   // 0 ready → strong urge to bank
      s.sides[me].hand = []
      toHand(s, me, 'gwall')                        // cheap guard — the shield
      const spare = toHand(s, me, 'soldier')        // a vanilla spare, same cost
      s.phase = 'bank'; s.actorSeat = me; s.bankedThisStep = 0
      const [action] = heuristicPolicy(s, me, rng)
      expect(action.type).toBe('resource')
      expect(action.type === 'resource' && action.card, `rng ${rng} banked the guard`).toBe(spare)  // banks the spare, keeps the guard
    }
  })

  // #68 Fix 3: under threat, the bot deploys a Guard ahead of a bigger, purely offensive body.
  it('under siege, deploys a Guard ahead of a bigger attacker (#68)', () => {
    const s = v3game()
    const me = s.actorSeat, them = (1 - me) as 0 | 1
    put(s, them, 'brute', homeZone(me))            // 4/3 threat in our Home
    fuel(s, me, 10)
    s.sides[me].hand = []
    const guard = toHand(s, me, 'gwall')           // 0/5 guard, cost 2
    toHand(s, me, 'brute')                          // 4/3 body, cost 3 — bigger sticker, no defense
    s.actorSeat = me
    const [action] = heuristicPolicy(s, me, 7)
    expect(action.type).toBe('play')
    expect(action.type === 'play' && action.card).toBe(guard)
  })
})
