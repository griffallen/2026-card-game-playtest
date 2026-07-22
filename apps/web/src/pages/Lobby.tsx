import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { del, get, post } from '../api.ts'
import { useAuth } from '../auth.tsx'
import { DeckPicker, Dialog } from '../components/DeckPicker.tsx'

interface GameRow {
  id: string; name: string; status: string; createdAt: string
  host: string; guest: string | null; hostId: string; guestId: string | null
  winnerSeat: number | null; winReason: string | null; actions: number
}
interface Buckets { waiting: GameRow[]; mine: GameRow[]; recent: GameRow[] }

export function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [buckets, setBuckets] = useState<Buckets>({ waiting: [], mine: [], recent: [] })
  const [dialog, setDialog] = useState<'create' | { join: GameRow } | null>(null)
  const [deckId, setDeckId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(() => { get<Buckets>('/api/games').then(setBuckets).catch(() => {}) }, [])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh])

  async function createGame() {
    try {
      const r = await post<{ game: GameRow }>('/api/games', { deckId, name })
      navigate(`/game/${r.game.id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
  }
  async function joinGame(id: string) {
    try {
      await post(`/api/games/${id}/join`, { deckId })
      navigate(`/game/${id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
  }

  const reasonBadge = (g: GameRow) =>
    g.winReason === 'life' ? '⚔ life' : g.winReason === 'hope' ? '🕊️ Hope' : g.winReason ?? ''

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-parchment">The Tables</h1>
        <button className="btn btn-primary" onClick={() => { setDialog('create'); setError(''); setName('') }}>
          ✦ New table
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="panel p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-dim">Your games</h2>
          <div className="mt-2 flex flex-col gap-2">
            {buckets.mine.map(g => (
              <div key={g.id} className="flex items-center gap-3 rounded-md border hairline bg-raised px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-parchment">{g.name}</div>
                  <div className="text-xs text-dim">
                    {g.host} vs {g.guest ?? '…'} · {g.status === 'waiting' ? 'awaiting a challenger' : `${g.actions} actions in`}
                  </div>
                </div>
                {g.status === 'active' && <button className="btn btn-primary !py-1" onClick={() => navigate(`/game/${g.id}`)}>Resume</button>}
                {g.status === 'waiting' && g.hostId === user?.id && (
                  <button className="btn btn-danger !py-1" onClick={() => del(`/api/games/${g.id}`).then(refresh)}>Cancel</button>
                )}
                {g.status === 'waiting' && <span className="pulse-soft text-xs text-dim">waiting…</span>}
              </div>
            ))}
            {!buckets.mine.length && <p className="text-sm text-dim">No games in progress. Start one.</p>}
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-dim">Open tables</h2>
          <div className="mt-2 flex flex-col gap-2">
            {buckets.waiting.map(g => (
              <div key={g.id} className="flex items-center gap-3 rounded-md border hairline bg-raised px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-parchment">{g.name}</div>
                  <div className="text-xs text-dim">hosted by {g.host}</div>
                </div>
                <button className="btn btn-primary !py-1" onClick={() => { setDialog({ join: g }); setError('') }}>Join</button>
              </div>
            ))}
            {!buckets.waiting.length && <p className="text-sm text-dim">No open tables right now.</p>}
          </div>
        </section>
      </div>

      <section className="panel mt-4 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-dim">Recent battles</h2>
        <div className="mt-2 grid gap-1.5">
          {buckets.recent.map(g => (
            <button key={g.id} onClick={() => navigate(`/game/${g.id}`)}
              className="flex items-center gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-raised">
              <span className="min-w-0 flex-1 truncate">
                <span className="text-parchment">{g.host}</span> vs <span className="text-parchment">{g.guest}</span>
                <span className="ml-2 text-dim">{g.name}</span>
              </span>
              <span className="text-xs text-goldbright">{g.winnerSeat === 0 ? g.host : g.guest} won · {reasonBadge(g)}</span>
            </button>
          ))}
          {!buckets.recent.length && <p className="text-sm text-dim">History yet unwritten.</p>}
        </div>
      </section>

      {dialog === 'create' && (
        <Dialog title="Open a new table" onClose={() => setDialog(null)}>
          <label className="block text-xs uppercase tracking-wider text-dim">Table name</label>
          <input className="input mt-1 mb-3" value={name} onChange={e => setName(e.target.value)} placeholder={`${user?.username}'s table`} />
          <label className="block text-xs uppercase tracking-wider text-dim">Your deck</label>
          <div className="mt-1"><DeckPicker value={deckId} onChange={setDeckId} /></div>
          {error && <p className="mt-2 text-sm text-[#e5a99f]">{error}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={!deckId} onClick={createGame}>Open table</button>
        </Dialog>
      )}
      {dialog && dialog !== 'create' && (
        <Dialog title={`Join “${dialog.join.name}”`} onClose={() => setDialog(null)}>
          <label className="block text-xs uppercase tracking-wider text-dim">Your deck</label>
          <div className="mt-1"><DeckPicker value={deckId} onChange={setDeckId} /></div>
          {error && <p className="mt-2 text-sm text-[#e5a99f]">{error}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={!deckId} onClick={() => joinGame(dialog.join.id)}>
            Take your seat
          </button>
        </Dialog>
      )}
    </div>
  )
}
