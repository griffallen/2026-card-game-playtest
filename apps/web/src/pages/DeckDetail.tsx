import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get } from '../api.ts'
import { CardFrame, type CardLike } from '../components/CardFrame.tsx'

interface DeckDetailData {
  id: string; name: string; description: string; color: string
  cards: (CardLike & { count: number })[]
}

export function DeckDetail() {
  const { id } = useParams()
  const [deck, setDeck] = useState<DeckDetailData | null>(null)
  useEffect(() => { get<{ deck: DeckDetailData }>(`/api/decks/${id}`).then(r => setDeck(r.deck)).catch(() => {}) }, [id])
  if (!deck) return <div className="p-8 text-dim">Unfurling the list…</div>
  const total = deck.cards.reduce((s, c) => s + c.count, 0)
  return (
    <div className="mx-auto max-w-6xl p-4">
      <Link to="/decks" className="text-sm text-dim hover:text-body">← All decks</Link>
      <div className="mt-1 flex items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold text-parchment">{deck.name}</h1>
        <span className="text-sm text-dim">{total} cards</span>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-dim">{deck.description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {deck.cards.map(c => (
          <CardFrame key={c.slug} card={c} badge={c.count > 1 ? `×${c.count}` : undefined} />
        ))}
      </div>
    </div>
  )
}
