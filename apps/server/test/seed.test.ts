/**
 * The lobby must deal the game we actually play.
 *
 * apps/server seeded DEFAULT_RULES — the legacy v2.3 preset: intercept combat, no pips, no
 * duel law, influence threshold 15. Nobody plays the multiplayer lobby yet, so it sat wrong
 * unnoticed; the day someone opens it, they'd get a ruleset the game left behind in July.
 * The demo (apps/demo) has run V3_RULES all along.
 */
import { describe, expect, it } from 'vitest'
import { V3_RULES, type RulesConfig } from '@newgame/engine'
import { prisma } from '../src/db.ts'

describe('seeded rules', () => {
  it('makes the v3 ruleset the default a new game is dealt', async () => {
    const row = await prisma.rulesVersion.findFirst({ where: { isDefault: true } })
    expect(row, 'no default rules row was seeded').toBeTruthy()

    const config = row!.config as unknown as RulesConfig
    expect(config.combatModel).toBe('blockerPairing')   // duel law, not the intercept window
    expect(config.retaliation).toBe('always')           // decision 84 — door 2
    expect(config.pipModel).toBe('presence')            // decision 69
    expect(config.upgradesOrphan).toBe(true)            // decision 67
    expect(config.influenceWinThreshold).toBe(20)       // decision 106 — not 15
    expect(config).toEqual(V3_RULES)
  })

  it('keeps the legacy ruleset available, but not as the default', async () => {
    const legacy = await prisma.rulesVersion.findFirst({ where: { name: 'v2.3' } })
    expect(legacy, 'v2.3 should stay seeded for replay and A/B').toBeTruthy()
    expect(legacy!.isDefault).toBe(false)
  })
})
