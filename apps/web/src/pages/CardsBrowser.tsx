import { useEffect, useMemo, useState } from 'react'
import { get } from '../api.ts'
import { CardFrame, type CardLike } from '../components/CardFrame.tsx'

export function CardsBrowser() {
  const [cards, setCards] = useState<CardLike[]>([])
  const [color, setColor] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [q, setQ] = useState('')

  useEffect(() => { get<{ cards: CardLike[] }>('/api/cards').then(r => setCards(r.cards)) }, [])

  const shown = useMemo(() =>
    cards
      .filter(c => color === 'all' || c.color === color)
      .filter(c => type === 'all' || c.type === type)
      .filter(c => !q || `${c.name} ${c.text}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
  [cards, color, type, q])

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-goldbright text-goldbright' : 'hairline text-dim hover:text-body'}`

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-parchment">Card Library</h1>
        <span className="text-sm text-dim">{shown.length} of {cards.length}</span>
        <input className="input ml-auto max-w-56" placeholder="Search names and text…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {['all', 'red', 'yellow', 'purple'].map(c => (
          <button key={c} className={chip(color === c)} onClick={() => setColor(c)}>{c}</button>
        ))}
        <span className="mx-1 text-dim">·</span>
        {['all', 'unit', 'action', 'upgrade'].map(t => (
          <button key={t} className={chip(type === t)} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-dim">⚑ marks cards whose printed text needed a ruling for the prototype — hover to read it.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {shown.map(c => <CardFrame key={c.slug} card={c} />)}
      </div>
    </div>
  )
}
