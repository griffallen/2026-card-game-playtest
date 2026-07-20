import { CARD_SET, DEFAULT_RULES, PREBUILT_DECKS, V3_RULES } from '@newgame/engine'
import { prisma } from './db.ts'
import { hashPassword } from './auth.ts'

/**
 * Rules rows, newest last. The **default** is what a new lobby game is dealt, and it must be the
 * game we actually play (docs/rules.md) — the demo has run v3 since 2026-07-11 while this seeded
 * v2.3, so the lobby would have dealt intercept combat and a 15-influence finish line to whoever
 * opened it first. The legacy row stays seeded: games snapshot their rules at creation, so old
 * replays need it, and the admin hall can still pick it for an A/B.
 */
const RULES_ROWS = [
  { name: 'v2.3', config: DEFAULT_RULES, isDefault: false },
  { name: 'v3.0', config: V3_RULES, isDefault: true },
] as const
const DEFAULT_RULES_NAME = 'v3.0'

/**
 * Idempotent baseline data: admin, rules version, the full card pool, prebuilt decks.
 * Since decision 46 the ledger (data/cards/ → engine) is the single source of truth, so reseeding
 * REFRESHES existing card rows and prebuilt deck lists — running games are unaffected (they
 * snapshot cards+rules at creation), and this is what makes a merged card PR reach the server.
 */
export async function seedCore(adminPassword: string): Promise<void> {
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: { username: 'admin', passwordHash: await hashPassword(adminPassword), isAdmin: true },
    })
  }

  for (const row of RULES_ROWS) {
    await prisma.rulesVersion.upsert({
      where: { name: row.name },
      create: { name: row.name, config: row.config as unknown as object, isDefault: row.isDefault },
      update: { config: row.config as unknown as object, isDefault: row.isDefault },
    })
  }
  // exactly one default: demote any other row (their configs stay for replay/history)
  await prisma.rulesVersion.updateMany({
    where: { name: { not: DEFAULT_RULES_NAME }, isDefault: true },
    data: { isDefault: false },
  })

  for (const def of Object.values(CARD_SET)) {
    const fields = {
      name: def.name, color: def.color, type: def.type, cost: def.cost,
      power: def.power ?? null, health: def.health ?? null, text: def.text,
      effects: def as object, artUrl: def.artUrl ?? null, designerNote: def.designerNote ?? null,
    }
    await prisma.card.upsert({
      where: { slug: def.slug },
      create: { slug: def.slug, ...fields },
      update: fields,
    })
  }

  for (const deck of PREBUILT_DECKS) {
    const existing = await prisma.deck.findFirst({ where: { isPrebuilt: true, name: deck.name } })
    if (existing) {
      await prisma.deckCard.deleteMany({ where: { deckId: existing.id } })
      await prisma.deck.update({
        where: { id: existing.id },
        data: {
          description: deck.description, color: deck.color,
          cards: { create: deck.cards.map(c => ({ cardSlug: c.slug, count: c.count })) },
        },
      })
    } else {
      await prisma.deck.create({
        data: {
          name: deck.name, description: deck.description, color: deck.color, isPrebuilt: true,
          cards: { create: deck.cards.map(c => ({ cardSlug: c.slug, count: c.count })) },
        },
      })
    }
  }
}
