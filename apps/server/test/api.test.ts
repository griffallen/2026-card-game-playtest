import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { CARD_SET, PREBUILT_DECKS } from '@newgame/engine'
import { buildApp } from '../src/app.ts'
import { prisma } from '../src/db.ts'

let app: FastifyInstance
const jars = new Map<string, string>() // username → sid cookie

function cookieFor(user: string) {
  const sid = jars.get(user)
  if (!sid) throw new Error(`no session for ${user}`)
  return { cookie: `sid=${sid}` }
}

async function register(username: string, password = 'password123') {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password } })
  expect(res.statusCode).toBe(200)
  const sid = res.cookies.find(c => c.name === 'sid')!.value
  jars.set(username, sid)
  return res.json()
}

async function login(username: string, password: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } })
  if (res.statusCode === 200) jars.set(username, res.cookies.find(c => c.name === 'sid')!.value)
  return res
}

beforeAll(async () => { app = await buildApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })

describe('auth', () => {
  it('registers, identifies, rejects bad logins and bad usernames', async () => {
    await register('ada')
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: cookieFor('ada') })
    expect(me.json().user.username).toBe('ada')
    expect(me.json().user.isAdmin).toBe(false)

    expect((await login('ada', 'wrong-password')).statusCode).toBe(401)
    const bad = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'x', password: 'password123' } })
    expect(bad.statusCode).toBe(400)
    const dupe = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'ada', password: 'password123' } })
    expect(dupe.statusCode).toBe(409)
    expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401)
  })
})

describe('library', () => {
  it('serves the full pool and all prebuilt decks with min-48-card lists', async () => {
    await register('boba')
    const cards = await app.inject({ method: 'GET', url: '/api/cards', headers: cookieFor('boba') })
    // sized from the engine, not a literal — the pool grows with the ledger (121 as of session 009)
    expect(cards.json().cards.length).toBe(Object.keys(CARD_SET).length)

    const decks = await app.inject({ method: 'GET', url: '/api/decks', headers: cookieFor('boba') })
    const list = decks.json().decks
    expect(list.length).toBe(PREBUILT_DECKS.length)
    // decks are min-48, not exactly-48 (decision 90) — red runs 49, Griff's Red 65
    expect(list.every((d: { cardCount: number }) => d.cardCount >= 48)).toBe(true)

    const detail = await app.inject({ method: 'GET', url: `/api/decks/${list[0].id}`, headers: cookieFor('boba') })
    expect(detail.json().deck.cards.length).toBeGreaterThan(30)
  })
})

describe('game lifecycle', () => {
  it('create → shows in lobby → join → active with engine state', async () => {
    const decks = (await app.inject({ method: 'GET', url: '/api/decks', headers: cookieFor('ada') })).json().decks
    const red = decks.find((d: { name: string }) => d.name.includes('Crimson'))
    const yellow = decks.find((d: { name: string }) => d.name.includes('Radiant'))

    const created = await app.inject({
      method: 'POST', url: '/api/games', headers: cookieFor('ada'), payload: { deckId: red.id, name: 'proving grounds' },
    })
    expect(created.statusCode).toBe(200)
    const gameId = created.json().game.id

    const lobby = await app.inject({ method: 'GET', url: '/api/games', headers: cookieFor('boba') })
    expect(lobby.json().waiting.some((g: { id: string }) => g.id === gameId)).toBe(true)

    const selfJoin = await app.inject({
      method: 'POST', url: `/api/games/${gameId}/join`, headers: cookieFor('ada'), payload: { deckId: yellow.id },
    })
    expect(selfJoin.statusCode).toBe(400)

    const joined = await app.inject({
      method: 'POST', url: `/api/games/${gameId}/join`, headers: cookieFor('boba'), payload: { deckId: yellow.id },
    })
    expect(joined.statusCode).toBe(200)
    expect(joined.json().game.status).toBe('active')

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } })
    // both decks' cards snapshotted — sized from the actual prebuilt lists, not a literal
    const uniqueSlugs = new Set(
      PREBUILT_DECKS.filter(d => d.name.includes('Crimson') || d.name.includes('Radiant'))
        .flatMap(d => d.cards.map(c => c.slug)),
    )
    expect(Object.keys(game.cardSet as object).length).toBe(uniqueSlugs.size)
  })

  it('host can cancel a waiting game; others cannot', async () => {
    const decks = (await app.inject({ method: 'GET', url: '/api/decks', headers: cookieFor('ada') })).json().decks
    const created = await app.inject({
      method: 'POST', url: '/api/games', headers: cookieFor('ada'), payload: { deckId: decks[0].id },
    })
    const id = created.json().game.id
    expect((await app.inject({ method: 'DELETE', url: `/api/games/${id}`, headers: cookieFor('boba') })).statusCode).toBe(403)
    expect((await app.inject({ method: 'DELETE', url: `/api/games/${id}`, headers: cookieFor('ada') })).statusCode).toBe(200)
  })
})

describe('admin', () => {
  it('guards non-admins, edits card numbers, rejects malformed effects', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/admin/users', headers: cookieFor('boba') })).statusCode).toBe(403)

    expect((await login('admin', 'test-admin-pw')).statusCode).toBe(200)
    const users = await app.inject({ method: 'GET', url: '/api/admin/users', headers: cookieFor('admin') })
    expect(users.json().users.length).toBeGreaterThanOrEqual(3)

    // numeric tweak flows through
    const patched = await app.inject({
      method: 'PATCH', url: '/api/admin/cards/searing-bolt', headers: cookieFor('admin'), payload: { cost: 3 },
    })
    expect(patched.statusCode).toBe(200)
    expect(patched.json().card.cost).toBe(3)

    // malformed effects are rejected by the engine validator
    const broken = await app.inject({
      method: 'PATCH', url: '/api/admin/cards/searing-bolt', headers: cookieFor('admin'),
      payload: { onPlay: [{ op: 'meteor-storm', n: 99 }] },
    })
    expect(broken.statusCode).toBe(400)
    expect(broken.json().error).toContain('meteor-storm')

    // restore
    await app.inject({ method: 'PATCH', url: '/api/admin/cards/searing-bolt', headers: cookieFor('admin'), payload: { cost: 2 } })

    // rules parameter clone
    const rules = await app.inject({ method: 'GET', url: '/api/admin/rules', headers: cookieFor('admin') })
    expect(rules.json().versions.length).toBeGreaterThanOrEqual(1)
    const created = await app.inject({
      method: 'POST', url: '/api/admin/rules', headers: cookieFor('admin'),
      payload: { name: 'fast-life', config: { startingLife: 10 }, makeDefault: false },
    })
    expect(created.statusCode).toBe(200)
    expect(created.json().version.config.startingLife).toBe(10)
    expect(created.json().version.config.influenceWinThreshold).toBe(15) // normalized against defaults
  })

  it('healthz is green', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.json()).toEqual({ ok: true, db: true })
  })
})
