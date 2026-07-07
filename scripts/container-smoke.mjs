/* API smoke against a running instance (used to verify the production container). */
const BASE = process.env.BASE ?? 'http://localhost:3000'
const uniq = Date.now().toString(36).slice(-5)

async function req(path, opts = {}, jar = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'content-type': 'application/json', cookie: jar.sid ? `sid=${jar.sid}` : '', ...opts.headers },
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) jar.sid = /sid=([^;]+)/.exec(setCookie)?.[1]
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

const a = {}, b = {}
const out = []
out.push(['healthz', (await req('/healthz')).body])
out.push(['register A', (await req('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: `blaine${uniq}`, password: 'password123' }) }, a)).body.user?.username])
out.push(['register B', (await req('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: `friend${uniq}`, password: 'password123' }) }, b)).body.user?.username])

const decks = (await req('/api/decks', {}, a)).body.decks
out.push(['decks', decks.map(d => `${d.name}(${d.cardCount})`).join(', ')])
const red = decks.find(d => d.name.includes('Crimson')).id
const yellow = decks.find(d => d.name.includes('Radiant')).id

const game = (await req('/api/games', { method: 'POST', body: JSON.stringify({ deckId: red, name: 'container proving grounds' }) }, a)).body.game
const joined = (await req(`/api/games/${game.id}/join`, { method: 'POST', body: JSON.stringify({ deckId: yellow }) }, b)).body.game
out.push(['game', `${joined.status} — ${joined.host} vs ${joined.guest}`])

const admin = {}
const adminLogin = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: process.env.ADMIN_PASSWORD ?? 'change-me' }) }, admin)
out.push(['admin login', adminLogin.body.user?.isAdmin === true ? 'ok (isAdmin)' : `FAILED ${JSON.stringify(adminLogin.body)}`])
const users = await req('/api/admin/users', {}, admin)
out.push(['admin users', users.body.users?.length])

const art = await fetch(`${BASE}/cards/worldrender.jpg`)
out.push(['card art', `${art.status} ${(await art.arrayBuffer()).byteLength}b`])

for (const [k, v] of out) console.log(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
const failed = out.some(([, v]) => String(v).includes('FAILED') || v === undefined)
console.log(failed ? 'SMOKE: FAIL' : 'SMOKE: PASS')
process.exit(failed ? 1 : 0)
