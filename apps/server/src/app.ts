import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import { assertDbReachable } from './db.ts'
import { authRoutes } from './routes/auth.ts'
import { gameRoutes } from './routes/games.ts'
import { adminRoutes } from './routes/admin.ts'
import { wsRoutes } from './ws.ts'

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  await app.register(cookie)
  await app.register(websocket)

  app.get('/healthz', async () => {
    await assertDbReachable()
    return { ok: true, db: true }
  })

  // each group in its own encapsulation scope — their preHandler hooks must not leak globally
  await app.register(async scope => authRoutes(scope))
  await app.register(async scope => gameRoutes(scope))
  await app.register(async scope => adminRoutes(scope))
  await app.register(async scope => wsRoutes(scope))

  // serve the built web app when present (single-origin prod: API + UI + WS on one port)
  const webDist = join(dirname(fileURLToPath(import.meta.url)), '../../web/dist')
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist })
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/ws')) {
        return reply.sendFile('index.html')
      }
      reply.code(404).send({ error: 'not found' })
    })
  }

  return app
}
