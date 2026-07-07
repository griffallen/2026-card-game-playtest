import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api.ts'
import type { DeckSummary } from '../components/DeckPicker.tsx'

const edge: Record<string, string> = { red: 'border-l-crimson', yellow: 'border-l-sun', neutral: 'border-l-dim' }

export function Decks() {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  useEffect(() => { get<{ decks: DeckSummary[] }>('/api/decks').then(r => setDecks(r.decks)) }, [])
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="font-display text-2xl font-bold text-parchment">Decks</h1>
      <p className="mt-1 text-sm text-dim">Prebuilt lists for the prototype. Admins forge new ones in the Admin hall.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {decks.map(d => (
          <Link key={d.id} to={`/decks/${d.id}`} className={`panel border-l-4 p-4 transition-colors hover:!border-gold/40 ${edge[d.color] ?? edge.neutral}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-semibold text-parchment">{d.name}</span>
              <span className="text-xs text-dim">{d.cardCount} cards</span>
            </div>
            <p className="mt-1 text-sm text-dim">{d.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
