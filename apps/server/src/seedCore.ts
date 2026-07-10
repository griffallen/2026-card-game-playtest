import { CARD_SET, DEFAULT_RULES, PREBUILT_DECKS } from '@newgame/engine'
import { prisma } from './db.ts'
import { hashPassword } from './auth.ts'

/** The rules row seeded from the engine's current defaults — named for the spec version it carries. */
const RULES_NAME = 'v2.3'

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

  await prisma.rulesVersion.upsert({
    where: { name: RULES_NAME },
    create: { name: RULES_NAME, config: DEFAULT_RULES as unknown as object, isDefault: true },
    update: { config: DEFAULT_RULES as unknown as object, isDefault: true },
  })
  // exactly one default: demote older rows (their configs stay for replay/history)
  await prisma.rulesVersion.updateMany({
    where: { name: { not: RULES_NAME }, isDefault: true },
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
