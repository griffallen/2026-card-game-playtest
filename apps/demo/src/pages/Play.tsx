import { useState } from 'react'
import { DECKS, type DemoConfig, type Mode } from '../local.ts'
import { DemoTable } from '../DemoTable.tsx'

const MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: 'hotseat', title: '🪑 Hotseat', blurb: 'Two humans, one screen — or one designer playing both sides. The view follows whoever acts.' },
  { id: 'vs-ai', title: '🤖 You vs the AI', blurb: 'You take seat 1 with your chosen deck; a baseline greedy AI pilots the other side.' },
  { id: 'watch', title: '👁 Watch AI vs AI', blurb: 'Lean back and watch two bots play a full game — great for feeling the pace of the rules.' },
]

export function Play() {
  const [config, setConfig] = useState<DemoConfig | null>(null)
  const [mode, setMode] = useState<Mode>('vs-ai')
  const [deckA, setDeckA] = useState(DECKS[0].slug)
  const [deckB, setDeckB] = useState(DECKS[1].slug)
  const [seedText, setSeedText] = useState('')

  if (config) return <DemoTable key={`${config.seed}-${config.mode}`} config={config} onExit={() => setConfig(null)} />

  function start() {
    const seed = /^\d+$/.test(seedText.trim()) ? Number(seedText.trim()) : Math.floor(Math.random() * 2 ** 31)
    setConfig({
      mode,
      deckA,
      deckB,
      seed,
      nameA: mode === 'watch' ? 'Bot Crimson' : mode === 'vs-ai' ? DECKS.find(d => d.slug === deckA)?.name ?? 'Player 1' : 'Player 1',
      nameB: mode === 'watch' ? 'Bot Radiant' : mode === 'vs-ai' ? 'The Machine' : 'Player 2',
    })
  }

  const deckPick = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="text-xs uppercase tracking-wider text-dim">{label}
      <select className="input mt-1" value={value} onChange={e => onChange(e.target.value)}>
        {DECKS.map(d => <option key={d.slug} value={d.slug}>{d.name} ({d.color})</option>)}
      </select>
    </label>
  )

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl font-bold text-parchment">Play the prototype</h1>
      <p className="mt-2 text-sm text-dim">
        The complete rules engine runs in your browser — the same code that powers the online version, no server involved.
        Every game is seeded: note the seed and your game can be replayed move-for-move. Use <b>Download game file</b> /
        <b> Copy chronicle</b> during or after a game and send the file along with your notes.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`panel p-4 text-left transition-colors ${mode === m.id ? '!border-goldbright' : 'hover:!border-gold/50'}`}>
            <div className="font-display font-semibold text-parchment">{m.title}</div>
            <p className="mt-1 text-xs text-dim">{m.blurb}</p>
          </button>
        ))}
      </div>

      <div className="panel mt-4 grid gap-3 p-4 sm:grid-cols-3">
        {deckPick(deckA, setDeckA, mode === 'vs-ai' ? 'Your deck (seat 1)' : 'Seat 1 deck')}
        {deckPick(deckB, setDeckB, mode === 'vs-ai' ? "The AI's deck" : 'Seat 2 deck')}
        <label className="text-xs uppercase tracking-wider text-dim">Seed (optional)
          <input className="input mt-1" placeholder="random" value={seedText} onChange={e => setSeedText(e.target.value)} />
        </label>
      </div>

      <button className="btn btn-primary mt-4 px-6" onClick={start}>Begin ⚔</button>

      <p className="mt-6 text-xs text-dim">
        Quick how-to: in the resource step, click a card → <i>Bank as resource</i> (or <i>Keep hand</i>). In the main phase, click a hand
        card → <i>Play</i>, then click a glowing target if it needs one. Click your units to move (dashed zones) or attack (red glow).
        Yellow ⚑ flags on cards mark prototype rulings — hover to read them.
      </p>
    </div>
  )
}
