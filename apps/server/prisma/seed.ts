import { prisma } from '../src/db.ts'
import { seedCore } from '../src/seedCore.ts'

const adminPassword = process.env.ADMIN_PASSWORD || 'change-me'

seedCore(adminPassword)
  .then(async () => {
    console.log('seed complete:', {
      users: await prisma.user.count(),
      cards: await prisma.card.count(),
      decks: await prisma.deck.count(),
      rules: await prisma.rulesVersion.count(),
    })
    if (!process.env.ADMIN_PASSWORD) console.log('admin password is the DEFAULT "change-me" — set ADMIN_PASSWORD and reseed, or change it in the admin UI')
  })
  .finally(() => prisma.$disconnect())
