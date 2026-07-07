import { describe, expect, it } from 'vitest'
import { rngInt, rngNext, shuffle } from '../src/rng.ts'

describe('seeded rng', () => {
  it('is deterministic: same state → same value and next state', () => {
    const [v1, s1] = rngNext(42)
    const [v2, s2] = rngNext(42)
    expect(v1).toBe(v2)
    expect(s1).toBe(s2)
    expect(v1).toBeGreaterThanOrEqual(0)
    expect(v1).toBeLessThan(1)
  })

  it('advances state so sequences differ', () => {
    const [a, s1] = rngNext(7)
    const [b] = rngNext(s1)
    expect(a).not.toBe(b)
  })

  it('rngInt stays in range across many draws', () => {
    let s = 1
    for (let i = 0; i < 1000; i++) {
      let v: number
      ;[v, s] = rngInt(s, 6)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
    }
  })

  it('shuffle is a deterministic permutation', () => {
    const input = Array.from({ length: 48 }, (_, i) => i)
    const [a, sa] = shuffle(input, 123)
    const [b, sb] = shuffle(input, 123)
    expect(a).toEqual(b)
    expect(sa).toBe(sb)
    expect([...a].sort((x, y) => x - y)).toEqual(input)
    const [c] = shuffle(input, 124)
    expect(c).not.toEqual(a)
    expect(input[0]).toBe(0) // input untouched
  })
})
