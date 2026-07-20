import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DECKS } from '../local.ts'
import { V3_RULES, deckSlugs, simulateGame, type PolicyName, type SimResult } from '@newgame/engine'

interface Row extends SimResult { seed: number; firstDeck: string }

export function Simulate() {
  const [games, setGames] = useState(100)
  const [policyA, setPolicyA] = useState<PolicyName>('heuristic')
  const [policyB, setPolicyB] = useState<PolicyName>('heuristic')
  const [seedBase, setSeedBase] = useState('1')
  const [alternate, setAlternate] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const abortRef = useRef(false)

  async function run() {
    setRunning(true)
    setError('')
    setRows([])
    setProgress(0)
    abortRef.current = false
    const red = deckSlugs(DECKS[0])
    const yellow = deckSlugs(DECKS[1])
    const base = /^\d+$/.test(seedBase.trim()) ? Number(seedBase.trim()) : 1
    const out: Row[] = []
    try {
      for (let i = 0; i < games; i++) {
        if (abortRef.current) break
        const seed = base + i
        const redFirst = !alternate || i % 2 === 0
        const [dA, dB] = redFirst ? [red, yellow] : [yellow, red]
        // V3_RULES = the rules the Play tab runs. Until #98 this passed none and silently
        // simulated the legacy v2.3 game, so the numbers on this page were the wrong game.
        const r = simulateGame(seed, dA, dB, { rules: V3_RULES, policyA, policyB })
        out.push({ ...r, seed, firstDeck: redFirst ? 'red' : 'yellow' })
        if (i % 5 === 4) {
          setProgress(i + 1)
          setRows([...out])
          await new Promise(r => setTimeout(r, 0)) // yield to the UI
        }
      }
      setRows([...out])
      setProgress(out.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'simulation crashed')
    } finally {
      setRunning(false)
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify({ config: { games, policyA, policyB, seedBase, alternate }, results: rows }, null, 2)],
      { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `newgame-sim-${policyA}-vs-${policyB}-${rows.length}g.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const redWins = rows.filter(r => (r.firstDeck === 'red' ? r.winner === 0 : r.winner === 1)).length
  const seat0Wins = rows.filter(r => r.winner === 0).length
  const byReason = rows.reduce((m, r) => m.set(r.winReason, (m.get(r.winReason) ?? 0) + 1), new Map<string, number>())
  const rounds = rows.map(r => r.rounds).sort((a, b) => a - b)
  const pct = (n: number) => rows.length ? `${Math.round((n / rows.length) * 100)}%` : '—'

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-bold text-parchment">The Simulator</h1>
      <p className="mt-2 text-sm text-dim">
        Runs full games in your browser — the deterministic engine plus seeded bot policies. Every row is reproducible from its
        seed. <b>Random</b> flails legally; <b>heuristic</b> is the baseline greedy AI. Download the results and send them with
        your notes — the seeds let any game be replayed exactly.
      </p>

      <div className="panel mt-5 grid gap-3 p-4 sm:grid-cols-5">
        <label className="text-xs uppercase tracking-wider text-dim">Games
          <input className="input mt-1" type="number" min={2} max={1000} value={games}
            onChange={e => setGames(Math.max(2, Math.min(1000, Number(e.target.value) || 2)))} />
        </label>
        <label className="text-xs uppercase tracking-wider text-dim">Seat 1 policy
          <select className="input mt-1" value={policyA} onChange={e => setPolicyA(e.target.value as PolicyName)}>
            <option value="heuristic">heuristic</option><option value="random">random</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-dim">Seat 2 policy
          <select className="input mt-1" value={policyB} onChange={e => setPolicyB(e.target.value as PolicyName)}>
            <option value="heuristic">heuristic</option><option value="random">random</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-dim">Seed base
          <input className="input mt-1" value={seedBase} onChange={e => setSeedBase(e.target.value)} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs text-dim">
          <input type="checkbox" checked={alternate} onChange={e => setAlternate(e.target.checked)} className="h-4 w-4 accent-[#c9a227]" />
          alternate who goes first
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {!running
          ? <button className="btn btn-primary" onClick={run}>Run {games} games</button>
          : <button className="btn btn-danger" onClick={() => { abortRef.current = true }}>Stop</button>}
        {running && <span className="text-sm text-dim">{progress}/{games}…</span>}
        {rows.length > 0 && !running && <button className="btn" onClick={download}>Download results JSON</button>}
        {error && <span className="text-sm text-[#e5a99f]">{error}</span>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="panel mt-5 grid gap-x-8 gap-y-2 p-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between"><span className="text-dim">Crimson Assault (red) wins</span><b className="text-parchment">{redWins}/{rows.length} ({pct(redWins)})</b></div>
            <div className="flex justify-between"><span className="text-dim">Radiant Order (yellow) wins</span><b className="text-parchment">{rows.length - redWins}/{rows.length} ({pct(rows.length - redWins)})</b></div>
            <div className="flex justify-between"><span className="text-dim">First player wins</span><b className="text-parchment">{seat0Wins}/{rows.length} ({pct(seat0Wins)})</b></div>
            <div className="flex justify-between"><span className="text-dim">Win by</span><b className="text-parchment">{[...byReason.entries()].map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</b></div>
            <div className="flex justify-between"><span className="text-dim">Rounds (median / min / max)</span><b className="text-parchment">{rounds.length ? `${rounds[Math.floor(rounds.length / 2)]} / ${rounds[0]} / ${rounds[rounds.length - 1]}` : '—'}</b></div>
            <div className="flex justify-between"><span className="text-dim">Mean actions per game</span><b className="text-parchment">{Math.round(rows.reduce((s, r) => s + r.actions, 0) / rows.length)}</b></div>
          </div>

          <div className="panel mt-3 max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left uppercase tracking-wider text-dim">
                  <th className="px-3 py-1.5">Seed</th><th className="px-3 py-1.5">First</th><th className="px-3 py-1.5">Winner</th>
                  <th className="px-3 py-1.5">By</th><th className="px-3 py-1.5">Rounds</th><th className="px-3 py-1.5">Influence range</th>
                  <th className="px-3 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.seed} className="border-t hairline">
                    <td className="px-3 py-1 text-dim">{r.seed}</td>
                    <td className="px-3 py-1">{r.firstDeck}</td>
                    <td className="px-3 py-1">{(r.firstDeck === 'red') === (r.winner === 0) ? '🔴 red' : '🟡 yellow'}</td>
                    <td className="px-3 py-1">{r.winReason}</td>
                    <td className="px-3 py-1">{r.rounds}</td>
                    <td className="px-3 py-1 text-dim">{r.minInfluence}…{r.maxInfluence > 0 ? `+${r.maxInfluence}` : r.maxInfluence}</td>
                    <td className="px-3 py-1">
                      <Link
                        className="text-goldbright hover:underline"
                        title="Replay this exact game move-for-move (deterministic from the seed)"
                        to={`/play?watch=1&seed=${r.seed}&first=${r.firstDeck}&pa=${policyA}&pb=${policyB}`}
                      >
                        Watch ▶
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-dim">Caveat travels with the numbers: bots ≠ humans. These runs prove stability and show directional balance, nothing more.</p>
        </>
      )}
    </div>
  )
}
