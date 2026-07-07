import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.ts'
import {
  COOKIE, USERNAME_RE, createSession, hashPassword, requireUser, setSessionCookie, userForRequest, verifyPassword,
} from '../auth.ts'

export function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { username?: string; password?: string } }>('/api/auth/register', async (req, reply) => {
    const username = (req.body?.username ?? '').toLowerCase().trim()
    const password = req.body?.password ?? ''
    if (!USERNAME_RE.test(username)) return reply.code(400).send({ error: 'username: 3–24 chars, a–z 0–9 _ -' })
    if (password.length < 8) return reply.code(400).send({ error: 'password must be at least 8 characters' })
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return reply.code(409).send({ error: 'username is taken' })
    const user = await prisma.user.create({
      data: { username, passwordHash: await hashPassword(password) },
    })
    setSessionCookie(reply, await createSession(user.id))
    return { user: { id: user.id, username: user.username, isAdmin: user.isAdmin } }
  })

  app.post<{ Body: { username?: string; password?: string } }>('/api/auth/login', async (req, reply) => {
    const username = (req.body?.username ?? '').toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !(await verifyPassword(req.body?.password ?? '', user.passwordHash))) {
      return reply.code(401).send({ error: 'wrong username or password' })
    }
    setSessionCookie(reply, await createSession(user.id))
    return { user: { id: user.id, username: user.username, isAdmin: user.isAdmin } }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    const sid = req.cookies[COOKIE]
    if (sid) await prisma.session.deleteMany({ where: { id: sid } })
    reply.clearCookie(COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/api/auth/me', async (req, reply) => {
    const user = await userForRequest(req)
    if (!user) return reply.code(401).send({ error: 'not signed in' })
    return { user }
  })

  // convenience for the card browser
  app.get('/api/cards', { preHandler: requireUser }, async () => {
    const cards = await prisma.card.findMany({ where: { active: true }, orderBy: [{ color: 'asc' }, { cost: 'asc' }, { name: 'asc' }] })
    return { cards }
  })
}
