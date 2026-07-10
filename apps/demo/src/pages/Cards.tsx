import { useMemo, useState } from 'react'
import { PREBUILT_DECKS } from '@newgame/engine'
import { CardFrame, type CardLike } from '@ui/components/CardFrame.tsx'
import { CardSheet } from '@ui/game/Sheets.tsx'
import { DEMO_CARDS } from '../local.ts'

const ALL = Object.values(DEMO_CARDS)

export function Cards() {
  const [deck, setDeck] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const deckCounts = useMemo(() => {
    if (deck === 'all') return null
    const d = PREBUILT_DECKS.find(d => d.slug === deck)
    return d ? Object.fromEntries(d.cards.map(c => [c.slug, c.count])) : null
  }, [deck])

  const shown = useMemo(() =>
    ALL
      .filter(c => !deckCounts || deckCounts[c.slug])
      .filter(c => type === 'all' || c.type === type)
      .filter(c => !q || `${c.name} ${c.text}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
  [deckCounts, type, q])

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-goldbright text-goldbright' : 'hairline text-dim hover:text-body'}`

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-parchment">Deck Explorer</h1>
        <span className="text-sm text-dim">{shown.length} cards</span>
        <input className="input ml-auto max-w-56" placeholder="Search names and text…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={chip(deck === 'all')} onClick={() => setDeck('all')}>all cards</button>
        {PREBUILT_DECKS.map(d => (
          <button key={d.slug} className={chip(deck === d.slug)} onClick={() => setDeck(d.slug)}>
            {d.color === 'red' ? '🔴' : d.color === 'purple' ? '🟣' : '🟡'} {d.name}
          </button>
        ))}
        <span className="mx-1 text-dim">·</span>
        {['all', 'unit', 'action', 'upgrade'].map(t => (
          <button key={t} className={chip(type === t)} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>

      {deck !== 'all' && (
        <p className="mt-2 text-xs text-dim">{PREBUILT_DECKS.find(d => d.slug === deck)?.description} — ×N shows copies in the deck.</p>
      )}
      <p className="mt-1 text-xs text-dim">Tap any card for its full abilities, keyword meanings, and ⚑ prototype rulings.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {shown.map(c => (
          <CardFrame
            key={c.slug}
            card={c}
            badge={deckCounts && deckCounts[c.slug] > 1 ? `×${deckCounts[c.slug]}` : undefined}
            onClick={() => setOpen(c.slug)}
          />
        ))}
      </div>

      {open && DEMO_CARDS[open] && <CardSheet card={DEMO_CARDS[open] as CardLike} onClose={() => setOpen(null)} />}
    </div>
  )
}
