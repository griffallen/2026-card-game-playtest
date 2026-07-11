import { describe, it, expect } from 'vitest'
import type { CardSet } from '../src/types.ts'
import { simulateGame } from '../src/simulate.ts'
import { V3_RULES } from '../src/rules.ts'
import { T } from './util.ts'

// Slice V3-4 tail: the wedge-proof. Random policies must be able to play whole games under
// v3 rules — block windows always answerable, pip gates never strand a hand, sneak/capture/
// infiltrate all reachable — across many seeds, deterministically.
const V3T: CardSet = Object.fromEntries(Object.entries({
  ...T,
  redpip:  { slug: 'redpip', name: 'redpip', color: 'red', type: 'unit', cost: 1, power: 1, health: 1, text: '', pips: ['red'] },
  heavypip: { slug: 'heavypip', name: 'heavypip', color: 'red', type: 'unit', cost: 4, power: 4, health: 4, text: '', pips: ['red', 'red'] },
  ghost:   { slug: 'ghost', name: 'ghost', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '', kw: [{ k: 'hidden' }], pips: ['purple'] },
  sapper:  { slug: 'sapper', name: 'sapper', color: 'purple', type: 'unit', cost: 2, power: 2, health: 2, text: '', kw: [{ k: 'infiltrate' }] },
  knifer:  { slug: 'knifer', name: 'knifer', color: 'purple', type: 'unit', cost: 3, power: 2, health: 3, text: '',
    kw: [{ k: 'sneak' }], sneak: { targets: [{ t: 'unit', side: 'enemy' }], ops: [{ op: 'damage', t: 'chosen0', n: 2 }] } },
  jailer:  { slug: 'jailer', name: 'jailer', color: 'yellow', type: 'unit', cost: 4, power: 2, health: 4, text: '',
    kw: [{ k: 'capture' }], targets: [{ t: 'unit', side: 'enemy' }], onPlay: [{ op: 'capture', t: 'chosen0' }] },
  shell:   { slug: 'shell', name: 'shell', color: 'yellow', type: 'unit', cost: 2, power: 1, health: 3, text: '', kw: [{ k: 'shielded' }] },
  scarred: { slug: 'scarred', name: 'scarred', color: 'red', type: 'unit', cost: 3, power: 2, health: 5, text: '', kw: [{ k: 'scar' }] },
}).filter(([slug]) => !['loner', 'hawk'].includes(slug)))   // v3 sets carry no overextend/flying

const deck = () => Object.keys(V3T).flatMap(slug => [slug, slug, slug])

describe('v3 random playouts (blocker-pairing + presence pips + keyword suite)', () => {
  it('40 seeded games terminate with a winner, no stuck states, both seat orders', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = simulateGame(seed, deck(), deck(), { rules: V3_RULES, cardSet: V3T })
      const b = simulateGame(seed + 5_000, deck(), deck(), { rules: V3_RULES, cardSet: V3T })
      expect(a.winner === 0 || a.winner === 1).toBe(true)
      expect(b.winner === 0 || b.winner === 1).toBe(true)
    }
  })

  it('same seed → identical v3 game (determinism holds through block windows)', () => {
    const x = simulateGame(77, deck(), deck(), { rules: V3_RULES, cardSet: V3T })
    const y = simulateGame(77, deck(), deck(), { rules: V3_RULES, cardSet: V3T })
    expect(x).toEqual(y)
  })
})
