import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PolicyName } from '@newgame/engine'
import { DECKS, type DemoConfig, type Mode } from '../local.ts'
import { allDecks } from '../custom-decks.ts'
import { DemoTable } from '../DemoTable.tsx'
import { SLEEVE_CHOICES, SLEEVE_SWATCH, type Sleeve } from '@ui/game/sleeves.ts'

const MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: 'hotseat', title: '🪑 Hotseat', blurb: 'Two humans, one screen — or one designer playing both sides. The view follows whoever acts.' },
  { id: 'vs-ai', title: '🤖 You vs the AI', blurb: 'You take seat 1 with your chosen deck; a baseline greedy AI pilots the other side.' },
  { id: 'watch', title: '👁 Watch AI vs AI', blurb: 'Watch two bots play with full playback controls — pause, step forward/back one action at a time, change speed. Simulator rows replay here too.' },
]

const botName = (deckSlug: string, policy: PolicyName) => {
  const deck = allDecks().find(d => d.slug === deckSlug)
  return `Bot ${deck?.name.split(' ')[0] ?? 'Unknown'}${policy === 'random' ? ' (random)' : ''}`
}

export function Play() {
  const [config, setConfig] = useState<DemoConfig | null>(null)
  const [mode, setMode] = useState<Mode>('vs-ai')
  const [deckA, setDeckA] = useState(DECKS[0].slug)
  const [deckB, setDeckB] = useState(DECKS[1].slug)
  const [seedText, setSeedText] = useState('')
  const [sleeveA, setSleeveA] = useState<Sleeve>('ivory')     // #61: per-seat sleeve picks
  const [sleeveB, setSleeveB] = useState<Sleeve>('gunmetal')
  const [params, setParams] = useSearchParams()

  // Replay links from the Simulator: #/play?watch=1&seed=…&first=red|yellow&pa=…&pb=…
  useEffect(() => {
    if (params.get('watch') !== '1') return
    const seed = Number(params.get('seed'))
    if (!Number.isInteger(seed)) return
    const redFirst = params.get('first') !== 'yellow'
    const red = DECKS.find(d => d.color === 'red')?.slug ?? DECKS[0].slug
    const yellow = DECKS.find(d => d.color === 'yellow')?.slug ?? DECKS[1].slug
    const [a, b] = redFirst ? [red, yellow] : [yellow, red]
    const pa = (params.get('pa') ?? 'heuristic') as PolicyName
    const pb = (params.get('pb') ?? 'heuristic') as PolicyName
    setConfig({
      mode: 'watch', deckA: a, deckB: b, seed,
      nameA: botName(a, pa), nameB: botName(b, pb),
      policyA: pa, policyB: pb,
    })
    setParams({}, { replace: true }) // consume the link so Setup works after exit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (config) return <DemoTable key={`${config.seed}-${config.mode}`} config={config} onExit={() => setConfig(null)} />

  function start() {
    const seed = /^\d+$/.test(seedText.trim()) ? Number(seedText.trim()) : Math.floor(Math.random() * 2 ** 31)
    setConfig({
      mode,
      deckA,
      deckB,
      seed,
      rulesVersion: 'v3.0' as const,
      nameA: mode === 'watch' ? botName(deckA, 'heuristic') : mode === 'vs-ai' ? pool.find(d => d.slug === deckA)?.name ?? 'Player 1' : 'Player 1',
      nameB: mode === 'watch' ? botName(deckB, 'heuristic') : mode === 'vs-ai' ? 'The Machine' : 'Player 2',
      policyA: 'heuristic',
      policyB: 'heuristic',
      sleeves: [sleeveA, sleeveB],
    })
  }

  // #61: sleeve picker — bold swatches, one row per seat. #114: the palette outgrew a single
  // row, so it wraps; every swatch keeps a hairline border so Obsidian isn't an invisible hole.
  const sleevePick = (value: Sleeve, onChange: (s: Sleeve) => void, other: Sleeve, label: string) => (
    <div className="text-xs uppercase tracking-wider text-dim">{label}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {SLEEVE_CHOICES.map(c => (
          <button key={c.id} title={c.label + (c.id === other ? ' — taken by the other seat' : '')}
            disabled={c.id === other}
            onClick={() => onChange(c.id)}
            className={`h-7 w-7 rounded-md border border-white/25 ${SLEEVE_SWATCH[c.id]} ${value === c.id ? 'ring-2 ring-goldbright ring-offset-2 ring-offset-black' : c.id === other ? 'opacity-25' : 'opacity-70 hover:opacity-100'}`}
            aria-label={`${label}: ${c.label}`} />
        ))}
      </div>
    </div>
  )

  const pool = allDecks()   // prebuilts + workshop decks (issue #30)
  const deckPick = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="text-xs uppercase tracking-wider text-dim">{label}
      <select className="input mt-1" value={value} onChange={e => onChange(e.target.value)}>
        {pool.map(d => <option key={d.slug} value={d.slug}>{d.name} ({d.color})</option>)}
      </select>
    </label>
  )

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl font-bold text-parchment">Play the prototype</h1>
      <p className="mt-2 text-sm text-dim">
        The complete rules engine runs in your browser — no server, everything is client-side.
        Every game is seeded, so it can be replayed move-for-move. <b>Copy chronicle</b> gives a readable
        play-by-play plus a machine-readable replay block — seed + full game, enough to reproduce the match
        on its own; <b>Download game file</b> is that same replay as a JSON file. Use either during or after a
        game and send it along with your notes.
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
        {sleevePick(sleeveA, setSleeveA, sleeveB, mode === 'vs-ai' ? 'Your sleeves' : 'Seat 1 sleeves')}
        {sleevePick(sleeveB, setSleeveB, sleeveA, mode === 'vs-ai' ? "The AI's sleeves" : 'Seat 2 sleeves')}
      </div>

      <button className="btn btn-primary mt-4 px-6" onClick={start}>Begin ⚔</button>

      <p className="mt-6 text-xs text-dim">
        Quick how-to: at the start of each round, click a card → <i>Bank as resource</i> (or <i>Skip banking</i>). On your
        turns, click a hand card → <i>Play</i>, then click a glowing target if it needs one. Click your units to move (dashed zones)
        or attack (red glow) — tap several ready units in one zone to attack together. Yellow ⚑ flags on cards mark prototype rulings — hover to read them.
      </p>
    </div>
  )
}
