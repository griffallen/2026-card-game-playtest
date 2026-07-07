import { CARD_SET, DEFAULT_RULES, PREBUILT_DECKS } from '@newgame/engine'
import { prisma } from './db.ts'
import { hashPassword } from './auth.ts'

/** Idempotent baseline data: admin, rules version, 84 cards, prebuilt decks. */
export async function seedCore(adminPassword: string): Promise<void> {
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: { username: 'admin', passwordHash: await hashPassword(adminPassword), isAdmin: true },
    })
  }

  await prisma.rulesVersion.upsert({
    where: { name: 'v1.2-proto' },
    create: { name: 'v1.2-proto', config: DEFAULT_RULES, isDefault: true },
    update: {},
  })

  for (const def of Object.values(CARD_SET)) {
    await prisma.card.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug, name: def.name, color: def.color, type: def.type, cost: def.cost,
        power: def.power ?? null, health: def.health ?? null, text: def.text,
        effects: def as object, artUrl: def.artUrl ?? null, designerNote: def.designerNote ?? null,
      },
      update: {}, // existing rows are the designer's — leave them alone
    })
  }

  for (const deck of PREBUILT_DECKS) {
    const existing = await prisma.deck.findFirst({ where: { isPrebuilt: true, name: deck.name } })
    if (existing) continue
    await prisma.deck.create({
      data: {
        name: deck.name, description: deck.description, color: deck.color, isPrebuilt: true,
        cards: { create: deck.cards.map(c => ({ cardSlug: c.slug, count: c.count })) },
      },
    })
  }
}
