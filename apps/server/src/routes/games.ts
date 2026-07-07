import { randomInt } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { CardSet, RulesConfig } from '@newgame/engine'
import { normalizeRules, validateDeck } from '@newgame/engine'
import { prisma } from '../db.ts'
import { requireUser } from '../auth.ts'
import { cardDefFromRow } from '../gameStore.ts'

async function expandDeck(deckId: string, userId: string): Promise<{ name: string; slugs: string[] } | null> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, include: { cards: true } })
  if (!deck) return null
  if (!deck.isPrebuilt && deck.ownerId !== userId) return null
  return { name: deck.name, slugs: deck.cards.flatMap(c => Array.from({ length: c.count }, () => c.cardSlug)) }
}

async function cardSetFor(slugLists: string[][]): Promise<CardSet> {
  const slugs = [...new Set(slugLists.flat())]
  const rows = await prisma.card.findMany({ where: { slug: { in: slugs } } })
  return Object.fromEntries(rows.map(r => [r.slug, cardDefFromRow(r)]))
}

const gameSummary = (g: {
  id: string; name: string; status: string; createdAt: Date; winnerSeat: number | null; winReason: string | null
  currentSeq: number
  host: { username: string } | null; guest: { username: string } | null
  hostId: string; guestId: string | null
}) => ({
  id: g.id,
  name: g.name,
  status: g.status,
  createdAt: g.createdAt,
  host: g.host?.username ?? '?',
  guest: g.guest?.username ?? null,
  hostId: g.hostId,
  guestId: g.guestId,
  winnerSeat: g.winnerSeat,
  winReason: g.winReason,
  actions: g.currentSeq,
})

export function gameRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/api/decks', async (req) => {
    const decks = await prisma.deck.findMany({
      where: { OR: [{ isPrebuilt: true }, { ownerId: req.user.id }] },
      include: { cards: true },
      orderBy: [{ isPrebuilt: 'desc' }, { name: 'asc' }],
    })
    return {
      decks: decks.map(d => ({
        id: d.id, name: d.name, description: d.description, color: d.color, isPrebuilt: d.isPrebuilt,
        cardCount: d.cards.reduce((s, c) => s + c.count, 0),
      })),
    }
  })

  app.get<{ Params: { id: string } }>('/api/decks/:id', async (req, reply) => {
    const deck = await prisma.deck.findUnique({
      where: { id: req.params.id },
      include: { cards: { include: { card: true } } },
    })
    if (!deck || (!deck.isPrebuilt && deck.ownerId !== req.user.id)) return reply.code(404).send({ error: 'no such deck' })
    return {
      deck: {
        id: deck.id, name: deck.name, description: deck.description, color: deck.color, isPrebuilt: deck.isPrebuilt,
        cards: deck.cards
          .map(c => ({ count: c.count, ...c.card }))
          .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
      },
    }
  })

  app.get('/api/games', async (req) => {
    const [waiting, mine, recent] = await Promise.all([
      prisma.game.findMany({
        where: { status: 'waiting', NOT: { hostId: req.user.id } },
        include: { host: true, guest: true }, orderBy: { createdAt: 'desc' }, take: 20,
      }),
      prisma.game.findMany({
        where: { OR: [{ hostId: req.user.id }, { guestId: req.user.id }], status: { in: ['waiting', 'active'] } },
        include: { host: true, guest: true }, orderBy: { updatedAt: 'desc' }, take: 20,
      }),
      prisma.game.findMany({
        where: { status: 'finished' },
        include: { host: true, guest: true }, orderBy: { finishedAt: 'desc' }, take: 10,
      }),
    ])
    return { waiting: waiting.map(gameSummary), mine: mine.map(gameSummary), recent: recent.map(gameSummary) }
  })

  app.post<{ Body: { deckId?: string; name?: string } }>('/api/games', async (req, reply) => {
    const deckId = req.body?.deckId ?? ''
    const deck = await expandDeck(deckId, req.user.id)
    if (!deck) return reply.code(400).send({ error: 'pick a deck' })
    const rules = await prisma.rulesVersion.findFirst({ where: { isDefault: true } })
    const config = normalizeRules((rules?.config ?? {}) as Partial<RulesConfig>)
    const cardSet = await cardSetFor([deck.slugs])
    const deckErrors = validateDeck(deck.slugs, cardSet, config)
    if (deckErrors.length) return reply.code(400).send({ error: deckErrors.join('; ') })
    const game = await prisma.game.create({
      data: {
        name: (req.body?.name ?? '').trim() || `${req.user.username}'s table`,
        status: 'waiting',
        seed: randomInt(1, 2 ** 31),
        rulesConfig: config,
        cardSet: cardSet as object,
        hostId: req.user.id,
        hostDeck: { ...deck, player: req.user.username },
      },
      include: { host: true, guest: true },
    })
    return { game: gameSummary(game) }
  })

  app.post<{ Params: { id: string }; Body: { deckId?: string } }>('/api/games/:id/join', async (req, reply) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } })
    if (!game || game.status !== 'waiting') return reply.code(404).send({ error: 'no open table with that id' })
    if (game.hostId === req.user.id) return reply.code(400).send({ error: 'you are already seated here' })
    const deck = await expandDeck(req.body?.deckId ?? '', req.user.id)
    if (!deck) return reply.code(400).send({ error: 'pick a deck' })
    const config = normalizeRules(game.rulesConfig as Partial<RulesConfig>)
    const guestCards = await cardSetFor([deck.slugs])
    const deckErrors = validateDeck(deck.slugs, guestCards, config)
    if (deckErrors.length) return reply.code(400).send({ error: deckErrors.join('; ') })
    const cardSet = { ...(game.cardSet as object), ...guestCards }
    const updated = await prisma.game.update({
      where: { id: game.id },
      data: { guestId: req.user.id, guestDeck: { ...deck, player: req.user.username }, cardSet, status: 'active' },
      include: { host: true, guest: true },
    })
    return { game: gameSummary(updated) }
  })

  app.get<{ Params: { id: string } }>('/api/games/:id', async (req, reply) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id }, include: { host: true, guest: true } })
    if (!game) return reply.code(404).send({ error: 'no such game' })
    return { game: gameSummary(game) }
  })

  app.delete<{ Params: { id: string } }>('/api/games/:id', async (req, reply) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } })
    if (!game) return reply.code(404).send({ error: 'no such game' })
    const isHost = game.hostId === req.user.id
    if (!(isHost && game.status === 'waiting') && !req.user.isAdmin) {
      return reply.code(403).send({ error: 'only the host may cancel a waiting table' })
    }
    await prisma.game.delete({ where: { id: game.id } })
    return { ok: true }
  })
}
