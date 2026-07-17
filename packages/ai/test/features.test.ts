import { describe, expect, it } from 'vitest'
import type { GameState, Seat } from '@newgame/engine'
import { FEATURE_NAMES, describeFeatures, featurize, featurizeNamed } from '../src/index.ts'
import { blankGame, place } from './helpers.ts'

/** Lookup a single named feature's value from a state+seat — asserts the name exists. */
function val(state: GameState, seat: Seat, name: string): number {
  const f = describeFeatures(state, seat).find(x => x.name === name)
  if (!f) throw new Error(`no such feature: ${name}`)
  return f.value
}

describe('featurize — board aggregates from stats, not identities', () => {
  it('two 3/2 rush units yield power 6, count 2, rush 2, breakthrough 0', () => {
    const s = blankGame()
    place(s, 0, 'rusher')
    place(s, 0, 'rusher')
    expect(val(s, 0, 'me_total_power')).toBe(6)
    expect(val(s, 0, 'me_unit_count')).toBe(2)
    expect(val(s, 0, 'me_kw_rush')).toBe(2)
    expect(val(s, 0, 'me_kw_breakthrough')).toBe(0)
    expect(val(s, 0, 'me_total_health')).toBe(4)      // 2 × health 2
    expect(val(s, 0, 'me_max_power')).toBe(3)
    expect(val(s, 0, 'me_avg_unit_cost')).toBe(3)     // rusher cost 3
  })

  it('counts effective keywords across a mixed board', () => {
    const s = blankGame()
    place(s, 0, 'bruiser')  // 5/4 breakthrough
    place(s, 0, 'flyer')    // 2/1 flying
    place(s, 0, 'wall')     // 0/4 guard
    expect(val(s, 0, 'me_unit_count')).toBe(3)
    expect(val(s, 0, 'me_kw_breakthrough')).toBe(1)
    expect(val(s, 0, 'me_kw_flying')).toBe(1)
    expect(val(s, 0, 'me_kw_guard')).toBe(1)
    expect(val(s, 0, 'me_kw_rush')).toBe(0)
    expect(val(s, 0, 'me_total_power')).toBe(7)       // 5 + 2 + 0
    expect(val(s, 0, 'me_max_power')).toBe(5)
  })

  it('remaining health subtracts damage; total health does not', () => {
    const s = blankGame()
    place(s, 0, 'bruiser', 1, { damage: 3 })  // 5/4, 3 marked → 1 remaining
    expect(val(s, 0, 'me_total_health')).toBe(4)
    expect(val(s, 0, 'me_remaining_health')).toBe(1)
  })

  it('imprisoned units are excluded from board aggregates and counted separately', () => {
    const s = blankGame()
    place(s, 0, 'bruiser')                       // active
    place(s, 0, 'grunt', 1, { imprisonedBy: 1 }) // inert
    expect(val(s, 0, 'me_unit_count')).toBe(1)
    expect(val(s, 0, 'me_total_power')).toBe(5)  // grunt's 2 is not counted
    expect(val(s, 0, 'me_imprisoned_count')).toBe(1)
  })
})

describe('featurize — differentials and perspective', () => {
  it('computes me − opp differentials from the perspective seat', () => {
    const s = blankGame()
    place(s, 0, 'bruiser')  // me: 5/4 breakthrough
    place(s, 1, 'grunt')    // opp: 2/2
    s.sides[0].life = 18
    s.sides[1].life = 12
    s.sides[0].hand = ['h1', 'h2', 'h3']  // handSize only reads length
    s.sides[1].hand = ['h4']

    expect(val(s, 0, 'diff_life')).toBe(6)          // 18 − 12
    expect(val(s, 0, 'diff_total_power')).toBe(3)   // 5 − 2
    expect(val(s, 0, 'diff_unit_count')).toBe(0)    // 1 − 1
    expect(val(s, 0, 'diff_hand_size')).toBe(2)     // 3 − 1
    expect(val(s, 0, 'diff_card_advantage')).toBe(2) // (3+1) − (1+1)
    expect(val(s, 0, 'me_kw_breakthrough')).toBe(1)
    expect(val(s, 0, 'opp_unit_count')).toBe(1)
  })

  it('flips sign when featurized from the other seat', () => {
    const s = blankGame()
    s.sides[0].life = 18
    s.sides[1].life = 12
    place(s, 0, 'bruiser')
    place(s, 1, 'grunt')
    expect(val(s, 1, 'diff_life')).toBe(-6)          // 12 − 18
    expect(val(s, 1, 'me_life')).toBe(12)
    expect(val(s, 1, 'diff_total_power')).toBe(-3)   // 2 − 5
  })

  it('influence is read from each seat perspective', () => {
    const s = blankGame()
    s.influence = 5  // + toward seat 0
    expect(val(s, 0, 'me_influence')).toBe(5)
    expect(val(s, 0, 'opp_influence')).toBe(-5)
    expect(val(s, 1, 'me_influence')).toBe(-5)
  })
})

describe('featurize — vector contract', () => {
  it('vector length equals FEATURE_NAMES.length', () => {
    const s = blankGame()
    place(s, 0, 'rusher')
    expect(featurize(s, 0).length).toBe(FEATURE_NAMES.length)
  })

  it('feature names are unique', () => {
    expect(new Set(FEATURE_NAMES).size).toBe(FEATURE_NAMES.length)
  })

  it('featurizeNamed returns parallel names and vector of equal length', () => {
    const s = blankGame()
    const { names, vector } = featurizeNamed(s, 0)
    expect(names.length).toBe(vector.length)
    expect(names).toBe(FEATURE_NAMES)
  })

  it('is deterministic: same state twice → identical vector', () => {
    const s = blankGame()
    place(s, 0, 'bruiser')
    place(s, 1, 'flyer', 1, { damage: 1 })
    expect(featurize(s, 0)).toEqual(featurize(s, 0))
  })

  it('does not mutate the state', () => {
    const s = blankGame()
    place(s, 0, 'bruiser')
    const before = JSON.stringify(s)
    featurize(s, 0)
    expect(JSON.stringify(s)).toBe(before)
  })

  it('produces finite numbers only', () => {
    const s = blankGame()
    place(s, 0, 'rusher')
    place(s, 1, 'wall')
    expect(featurize(s, 0).every(Number.isFinite)).toBe(true)
  })

  it('an empty board yields zero for every board and keyword feature', () => {
    const s = blankGame()  // no units placed
    const named = describeFeatures(s, 0)
    const boardZeroed = named.filter(f =>
      /^(me|opp)_(unit_count|total_power|total_health|remaining_health|avg_unit_cost|max_power|imprisoned_count|upgrade_count|kw_)/.test(f.name))
    expect(boardZeroed.length).toBeGreaterThan(0)
    for (const f of boardZeroed) expect(f.value).toBe(0)
  })
})
