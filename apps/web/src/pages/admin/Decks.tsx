import { useEffect, useMemo, useState } from 'react'
import { del, get, patch, post } from '../../api.ts'
import type { CardLike } from '../../components/CardFrame.tsx'
import type { DeckSummary } from '../../components/DeckPicker.tsx'

interface DeckDetail { id: string; name: string; description: string; color: string; cards: (CardLike & { count: number })[] }

function DeckEditor({ deckId, onDone }: { deckId: string | null; onDone: () => void }) {
  const [allCards, setAllCards] = useState<CardLike[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('neutral')
  const [error, setError] = useState('')

  useEffect(() => {
    get<{ cards: CardLike[] }>('/api/cards').then(r => setAllCards(r.cards))
    if (deckId) {
      get<{ deck: DeckDetail }>(`/api/decks/${deckId}`).then(r => {
        setName(r.deck.name)
        setDescription(r.deck.description)
        setColor(r.deck.color)
        setCounts(Object.fromEntries(r.deck.cards.map(c => [c.slug, c.count])))
      })
    }
  }, [deckId])

  const total = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts])
  const overCap = useMemo(() => Object.entries(counts).filter(([, n]) => n > 4), [counts])
  const legal = total >= 48 && overCap.length === 0

  async function save() {
    setError('')
    const cards = Object.entries(counts).filter(([, n]) => n > 0).map(([slug, count]) => ({ slug, count }))
    try {
      if (deckId) await patch(`/api/admin/decks/${deckId}`, { name, description, color, cards })
      else await post('/api/admin/decks', { name, description, color, cards })
      onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'save failed') }
  }

  const setCount = (slug: string, n: number) =>
    setCounts(c => ({ ...c, [slug]: Math.max(0, Math.min(9, n)) }))

  return (
    <div className="panel p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-dim">Deck name
          <input className="input mt-0.5" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="text-xs text-dim">Color identity
          <select className="input mt-0.5" value={color} onChange={e => setColor(e.target.value)}>
            <option value="red">red</option><option value="yellow">yellow</option><option value="neutral">neutral</option>
          </select>
        </label>
        <label className="text-xs text-dim">Description
          <input className="input mt-0.5" value={description} onChange={e => setDescription(e.target.value)} />
        </label>
      </div>
      <div className={`mt-3 rounded-md border px-3 py-1.5 text-sm ${legal ? 'border-emerald-700 text-emerald-400' : 'border-[#7e3325] text-[#e5a99f]'}`}>
        {total} / 48 minimum cards {overCap.length > 0 && ` · over the 4-copy limit: ${overCap.map(([s]) => s).join(', ')}`}
      </div>
      <div className="mt-3 max-h-96 overflow-y-auto rounded border hairline">
        {allCards.map(c => (
          <div key={c.slug} className="flex items-center gap-3 border-b hairline px-3 py-1 text-sm last:border-0">
            <span className={`h-2 w-2 rounded-full ${c.color === 'red' ? 'bg-crimson' : c.color === 'yellow' ? 'bg-sun' : 'bg-dim'}`} />
            <span className="w-6 text-dim">{c.cost}</span>
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
            <div className="flex items-center gap-1">
              <button className="btn !px-2 !py-0 text-xs" onClick={() => setCount(c.slug, (counts[c.slug] ?? 0) - 1)}>−</button>
              <span className="w-6 text-center">{counts[c.slug] ?? 0}</span>
              <button className="btn !px-2 !py-0 text-xs" onClick={() => setCount(c.slug, (counts[c.slug] ?? 0) + 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-[#e5a99f]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary" disabled={!name || !legal} onClick={save}>Save deck</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

export function AdminDecks() {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [editing, setEditing] = useState<string | null | 'new'>(null)
  const refresh = () => get<{ decks: DeckSummary[] }>('/api/decks').then(r => setDecks(r.decks.filter(d => d.isPrebuilt)))
  useEffect(() => { refresh() }, [])

  if (editing !== null) {
    return <DeckEditor deckId={editing === 'new' ? null : editing} onDone={() => { setEditing(null); refresh() }} />
  }
  return (
    <div>
      <button className="btn btn-primary mb-3" onClick={() => setEditing('new')}>✦ Forge a deck</button>
      <div className="panel overflow-hidden">
        {decks.map(d => (
          <div key={d.id} className="flex items-center gap-3 border-b hairline px-4 py-2 text-sm last:border-0">
            <span className={`h-2.5 w-2.5 rounded-full ${d.color === 'red' ? 'bg-crimson' : d.color === 'yellow' ? 'bg-sun' : 'bg-dim'}`} />
            <span className="min-w-0 flex-1 truncate font-display text-parchment">{d.name}</span>
            <span className="text-xs text-dim">{d.cardCount} cards</span>
            <button className="btn !px-2 !py-0.5 text-xs" onClick={() => setEditing(d.id)}>edit</button>
            <button className="btn btn-danger !px-2 !py-0.5 text-xs"
              onClick={() => confirm(`Delete "${d.name}"?`) && del(`/api/admin/decks/${d.id}`).then(refresh)}>delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
