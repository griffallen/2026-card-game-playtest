import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { del, get } from '../../api.ts'

interface Row {
  id: string; name: string; status: string; host: string; guest: string | null
  actions: number; winnerSeat: number | null; winReason: string | null; updatedAt: string
}

export function AdminGames() {
  const [games, setGames] = useState<Row[]>([])
  const refresh = () => get<{ games: Row[] }>('/api/admin/games').then(r => setGames(r.games)).catch(() => {})
  useEffect(() => { refresh() }, [])
  return (
    <div className="panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b hairline text-left text-xs uppercase tracking-wider text-dim">
            <th className="px-4 py-2">Table</th><th className="px-4 py-2">Players</th><th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Actions</th><th className="px-4 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr key={g.id} className="border-b hairline last:border-0">
              <td className="px-4 py-2"><Link to={`/game/${g.id}`} className="font-display text-parchment hover:text-goldbright">{g.name}</Link></td>
              <td className="px-4 py-2 text-dim">{g.host} vs {g.guest ?? '—'}</td>
              <td className="px-4 py-2">
                {g.status === 'finished'
                  ? <span className="text-goldbright">{g.winnerSeat === 0 ? g.host : g.guest} won ({g.winReason})</span>
                  : <span className="text-dim">{g.status}</span>}
              </td>
              <td className="px-4 py-2 text-dim">{g.actions}</td>
              <td className="px-4 py-2 text-right">
                <button className="btn btn-danger !px-2 !py-0.5 text-xs"
                  onClick={() => confirm(`Delete "${g.name}"? The event log goes with it.`) && del(`/api/admin/games/${g.id}`).then(refresh)}>
                  delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!games.length && <p className="px-4 py-6 text-sm text-dim">No games yet.</p>}
    </div>
  )
}
