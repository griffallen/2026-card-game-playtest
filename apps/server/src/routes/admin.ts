import type { FastifyInstance } from 'fastify'
import type { CardDef, RulesConfig } from '@newgame/engine'
import { DEFAULT_RULES, normalizeRules, slugify, validateCardSet, validateDeck } from '@newgame/engine'
import { prisma } from '../db.ts'
import { hashPassword, requireAdmin } from '../auth.ts'
import { cardDefFromRow } from '../gameStore.ts'

export function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  // ── users ──
  app.get('/api/admin/users', async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
    return { users: users.map(u => ({ id: u.id, username: u.username, isAdmin: u.isAdmin, createdAt: u.createdAt })) }
  })

  app.patch<{ Params: { id: string }; Body: { isAdmin?: boolean; newPassword?: string } }>(
    '/api/admin/users/:id', async (req, reply) => {
      if (req.params.id === req.user.id && req.body?.isAdmin === false) {
        return reply.code(400).send({ error: 'you cannot demote yourself' })
      }
      const data: { isAdmin?: boolean; passwordHash?: string } = {}
      if (typeof req.body?.isAdmin === 'boolean') data.isAdmin = req.body.isAdmin
      if (req.body?.newPassword) {
        if (req.body.newPassword.length < 8) return reply.code(400).send({ error: 'password too short' })
        data.passwordHash = await hashPassword(req.body.newPassword)
      }
      const user = await prisma.user.update({ where: { id: req.params.id }, data })
      return { user: { id: user.id, username: user.username, isAdmin: user.isAdmin } }
    })

  app.delete<{ Params: { id: string } }>('/api/admin/users/:id', async (req, reply) => {
    if (req.params.id === req.user.id) return reply.code(400).send({ error: 'you cannot delete yourself' })
    const open = await prisma.game.count({
      where: { OR: [{ hostId: req.params.id }, { guestId: req.params.id }], status: { in: ['waiting', 'active'] } },
    })
    if (open > 0) return reply.code(409).send({ error: 'user has open games — finish or delete them first' })
    await prisma.user.delete({ where: { id: req.params.id } })
    return { ok: true }
  })

  // ── games ──
  app.get('/api/admin/games', async () => {
    const games = await prisma.game.findMany({ include: { host: true, guest: true }, orderBy: { updatedAt: 'desc' }, take: 100 })
    return {
      games: games.map(g => ({
        id: g.id, name: g.name, status: g.status, host: g.host.username, guest: g.guest?.username ?? null,
        actions: g.currentSeq, winnerSeat: g.winnerSeat, winReason: g.winReason, updatedAt: g.updatedAt,
      })),
    }
  })

  app.delete<{ Params: { id: string } }>('/api/admin/games/:id', async (req) => {
    await prisma.game.delete({ where: { id: req.params.id } })
    return { ok: true }
  })

  // ── cards ──
  const validateOneCard = (def: CardDef): string[] => validateCardSet({ [def.slug]: def })

  app.post<{ Body: Partial<CardDef> }>('/api/admin/cards', async (req, reply) => {
    const body = req.body ?? {}
    const slug = slugify(body.slug || body.name || '')
    if (!slug) return reply.code(400).send({ error: 'name required' })
    const existing = await prisma.card.findUnique({ where: { slug } })
    if (existing) return reply.code(409).send({ error: `card ${slug} already exists` })
    const def = { artUrl: null, text: '', ...body, slug } as CardDef
    const errors = validateOneCard(def)
    if (errors.length) return reply.code(400).send({ error: errors.join('; ') })
    const card = await prisma.card.create({
      data: {
        slug, name: def.name, color: def.color, type: def.type, cost: def.cost,
        power: def.power ?? null, health: def.health ?? null, text: def.text,
        effects: def as object, artUrl: def.artUrl ?? null, designerNote: def.designerNote ?? null,
      },
    })
    return { card }
  })

  app.patch<{ Params: { slug: string }; Body: Partial<CardDef> & { active?: boolean } }>(
    '/api/admin/cards/:slug', async (req, reply) => {
      const row = await prisma.card.findUnique({ where: { slug: req.params.slug } })
      if (!row) return reply.code(404).send({ error: 'no such card' })
      const current = cardDefFromRow(row)
      const { active, ...changes } = req.body ?? {}
      const merged = { ...current, ...changes, slug: row.slug } as CardDef
      const errors = validateOneCard(merged)
      if (errors.length) return reply.code(400).send({ error: errors.join('; ') })
      const card = await prisma.card.update({
        where: { slug: row.slug },
        data: {
          name: merged.name, color: merged.color, type: merged.type, cost: merged.cost,
          power: merged.power ?? null, health: merged.health ?? null, text: merged.text,
          effects: merged as object, artUrl: merged.artUrl ?? null, designerNote: merged.designerNote ?? null,
          ...(active !== undefined ? { active } : {}),
        },
      })
      return { card }
    })

  // ── decks ──
  interface DeckBody { name?: string; description?: string; color?: string; cards?: { slug: string; count: number }[] }

  const deckPayloadErrors = async (body: DeckBody): Promise<string[] | { slugs: string[] }> => {
    const cards = body.cards ?? []
    const slugs = cards.flatMap(c => Array.from({ length: Math.max(0, Math.floor(c.count)) }, () => c.slug))
    const rows = await prisma.card.findMany({ where: { slug: { in: cards.map(c => c.slug) } } })
    const cardSet = Object.fromEntries(rows.map(r => [r.slug, cardDefFromRow(r)]))
    const errors = validateDeck(slugs, cardSet, normalizeRules(DEFAULT_RULES))
    return errors.length ? errors : { slugs }
  }

  app.post<{ Body: DeckBody }>('/api/admin/decks', async (req, reply) => {
    const body = req.body ?? {}
    if (!body.name?.trim()) return reply.code(400).send({ error: 'name required' })
    const check = await deckPayloadErrors(body)
    if (Array.isArray(check)) return reply.code(400).send({ error: check.join('; ') })
    const deck = await prisma.deck.create({
      data: {
        name: body.name.trim(), description: body.description ?? '', color: body.color ?? 'neutral', isPrebuilt: true,
        cards: { create: (body.cards ?? []).filter(c => c.count > 0).map(c => ({ cardSlug: c.slug, count: c.count })) },
      },
    })
    return { deck }
  })

  app.patch<{ Params: { id: string }; Body: DeckBody }>('/api/admin/decks/:id', async (req, reply) => {
    const body = req.body ?? {}
    const deck = await prisma.deck.findUnique({ where: { id: req.params.id } })
    if (!deck) return reply.code(404).send({ error: 'no such deck' })
    if (body.cards) {
      const check = await deckPayloadErrors(body)
      if (Array.isArray(check)) return reply.code(400).send({ error: check.join('; ') })
    }
    const updated = await prisma.$transaction(async tx => {
      if (body.cards) {
        await tx.deckCard.deleteMany({ where: { deckId: deck.id } })
        await tx.deckCard.createMany({
          data: body.cards.filter(c => c.count > 0).map(c => ({ deckId: deck.id, cardSlug: c.slug, count: c.count })),
        })
      }
      return tx.deck.update({
        where: { id: deck.id },
        data: {
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.color ? { color: body.color } : {}),
        },
      })
    })
    return { deck: updated }
  })

  app.delete<{ Params: { id: string } }>('/api/admin/decks/:id', async (req, reply) => {
    const inUse = await prisma.game.count({ where: { status: { in: ['waiting', 'active'] } } })
    void inUse // deck snapshots make deletion safe for running games; only block nothing
    await prisma.deck.delete({ where: { id: req.params.id } })
    return { ok: true }
  })

  // ── rules ──
  app.get('/api/admin/rules', async () => {
    const versions = await prisma.rulesVersion.findMany({ orderBy: { createdAt: 'asc' } })
    return { versions, defaults: DEFAULT_RULES }
  })

  app.post<{ Body: { name?: string; config?: Partial<RulesConfig>; makeDefault?: boolean } }>(
    '/api/admin/rules', async (req, reply) => {
      const name = req.body?.name?.trim()
      if (!name) return reply.code(400).send({ error: 'name required' })
      const existing = await prisma.rulesVersion.findUnique({ where: { name } })
      if (existing) return reply.code(409).send({ error: 'name taken' })
      const config = normalizeRules(req.body?.config)
      const version = await prisma.$transaction(async tx => {
        if (req.body?.makeDefault) await tx.rulesVersion.updateMany({ data: { isDefault: false } })
        return tx.rulesVersion.create({ data: { name, config, isDefault: !!req.body?.makeDefault } })
      })
      return { version }
    })

  app.patch<{ Params: { id: string }; Body: { config?: Partial<RulesConfig>; makeDefault?: boolean } }>(
    '/api/admin/rules/:id', async (req, reply) => {
      const row = await prisma.rulesVersion.findUnique({ where: { id: req.params.id } })
      if (!row) return reply.code(404).send({ error: 'no such rules version' })
      const version = await prisma.$transaction(async tx => {
        if (req.body?.makeDefault) await tx.rulesVersion.updateMany({ data: { isDefault: false } })
        return tx.rulesVersion.update({
          where: { id: row.id },
          data: {
            ...(req.body?.config ? { config: normalizeRules({ ...(row.config as object), ...req.body.config }) } : {}),
            ...(req.body?.makeDefault !== undefined ? { isDefault: req.body.makeDefault } : {}),
          },
        })
      })
      return { version }
    })
}
