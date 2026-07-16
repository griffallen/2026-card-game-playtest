import { useMemo, useState } from 'react'
import { PREBUILT_DECKS } from '@newgame/engine'
import { CardFrame, type CardLike } from '@ui/components/CardFrame.tsx'
import { CardSheet } from '@ui/game/Sheets.tsx'
import { DEMO_CARDS } from '../local.ts'

const ALL = Object.values(DEMO_CARDS)
const COLORS = ['red', 'yellow', 'purple'] as const
const TYPES = ['unit', 'action', 'upgrade'] as const
const COLOR_DOT: Record<string, string> = { red: '🔴', yellow: '🟡', purple: '🟣' }
// #102: the cost buttons cover the costs that actually appear in the catalog — no hardcoded range.
const COSTS = [...new Set(ALL.map(c => c.cost))].sort((a, b) => a - b)

// plain tap-toggle for the multi-select filter groups (works on touch — no Ctrl/modifier)
function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set)
  if (next.has(v)) next.delete(v)
  else next.add(v)
  return next
}

export function Cards() {
  // #102: deck is a real prebuilt-DECK filter (dropdown); color/cost/type are true multi-select
  // filters. Empty set in a group = that group imposes no constraint (all shown).
  const [deck, setDeck] = useState('all')
  const [colors, setColors] = useState<Set<string>>(new Set())
  const [costs, setCosts] = useState<Set<number>>(new Set())
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const deckCounts = useMemo(() => {
    if (deck === 'all') return null
    const d = PREBUILT_DECKS.find(d => d.slug === deck)
    return d ? Object.fromEntries(d.cards.map(c => [c.slug, c.count])) : null
  }, [deck])

  // Within a group it's OR; across groups it's AND.
  const shown = useMemo(() =>
    ALL
      .filter(c => !deckCounts || deckCounts[c.slug])
      .filter(c => colors.size === 0 || colors.has(c.color))
      .filter(c => costs.size === 0 || costs.has(c.cost))
      .filter(c => types.size === 0 || types.has(c.type))
      .filter(c => !q || `${c.name} ${c.text}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
  [deckCounts, colors, costs, types, q])

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-goldbright text-goldbright' : 'hairline text-dim hover:text-body'}`
  const rowLabel = 'w-12 shrink-0 text-[11px] uppercase tracking-wider text-dim'

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-parchment">Deck Explorer</h1>
        <span className="text-sm text-dim">{shown.length} cards</span>
        <input className="input ml-auto max-w-56" placeholder="Search names and text…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={rowLabel}>Deck</span>
          <select className="input !py-1 text-sm" value={deck} onChange={e => setDeck(e.target.value)}>
            <option value="all">all cards</option>
            {PREBUILT_DECKS.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={rowLabel}>Color</span>
          {COLORS.map(c => (
            <button key={c} className={`${chip(colors.has(c))} capitalize`} onClick={() => setColors(s => toggle(s, c))}>{COLOR_DOT[c]} {c}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={rowLabel}>Cost</span>
          {COSTS.map(c => (
            <button key={c} className={chip(costs.has(c))} onClick={() => setCosts(s => toggle(s, c))}>{c}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={rowLabel}>Type</span>
          {TYPES.map(t => (
            <button key={t} className={`${chip(types.has(t))} capitalize`} onClick={() => setTypes(s => toggle(s, t))}>{t}</button>
          ))}
        </div>
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
