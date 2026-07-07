import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from './db.ts'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

// No auth dependency: Node's scrypt with fixed cost, format s2$salthex$hashhex
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `s2$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [tag, saltHex, hashHex] = stored.split('$')
  if (tag !== 's2' || !saltHex || !hashHex) return false
  const hash = await scrypt(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  return hash.length === expected.length && timingSafeEqual(hash, expected)
}

const SESSION_DAYS = 30
export const COOKIE = 'sid'

export async function createSession(userId: string): Promise<string> {
  const id = randomBytes(32).toString('hex')
  await prisma.session.create({
    data: { id, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  })
  return id
}

export interface AuthedUser { id: string; username: string; isAdmin: boolean }

export async function userForRequest(req: FastifyRequest): Promise<AuthedUser | null> {
  const sid = req.cookies[COOKIE]
  if (!sid) return null
  const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } })
  if (!session || session.expiresAt < new Date()) return null
  const { id, username, isAdmin } = session.user
  return { id, username, isAdmin }
}

export function setSessionCookie(reply: FastifyReply, sid: string) {
  reply.setCookie(COOKIE, sid, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 86_400,
  })
}

/** Route guard: attaches req.user or replies 401. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const user = await userForRequest(req)
  if (!user) return reply.code(401).send({ error: 'not signed in' })
  req.user = user
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = await userForRequest(req)
  if (!user) return reply.code(401).send({ error: 'not signed in' })
  if (!user.isAdmin) return reply.code(403).send({ error: 'admins only' })
  req.user = user
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthedUser
  }
}

export const USERNAME_RE = /^[a-z0-9_-]{3,24}$/
