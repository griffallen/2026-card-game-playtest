import { describe, it, expect } from 'vitest'
import type { GameState } from '../src/types.ts'
import { createGame } from '../src/setup.ts'
import { applyAction } from '../src/engine.ts'
import { heuristicPolicy } from '../src/ai.ts'
import { V3_RULES } from '../src/rules.ts'
import { T, toyDeck, put } from './util.ts'
import type { CardSet } from '../src/types.ts'

// decision 98 (duel law): only guards answer a lone attacker
const D: CardSet = { ...T, gwall: { slug: 'gwall', name: 'gwall', color: 'yellow', type: 'unit', cost: 2, power: 0, health: 5, text: '', kw: [{ k: 'cantAttack' }, { k: 'guard' }] } }

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
})
