import { useEffect, useState } from 'react'
import { get } from '../api.ts'

export interface DeckSummary { id: string; name: string; description: string; color: string; isPrebuilt: boolean; cardCount: number }

const swatch: Record<string, string> = { red: 'bg-crimson', yellow: 'bg-sun', neutral: 'bg-dim' }

export function DeckPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  useEffect(() => { get<{ decks: DeckSummary[] }>('/api/decks').then(r => setDecks(r.decks)) }, [])
  return (
    <div className="flex flex-col gap-2">
      {decks.map(d => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange(d.id)}
          className={`panel flex items-center gap-3 px-3 py-2 text-left transition-colors ${value === d.id ? '!border-goldbright' : 'hover:!border-gold/50'}`}
        >
          <span className={`h-8 w-8 shrink-0 rounded-full border border-black/40 ${swatch[d.color] ?? swatch.neutral}`} />
          <span className="min-w-0 flex-1">
            <span className="block font-display font-semibold text-parchment">{d.name}</span>
            <span className="block truncate text-xs text-dim">{d.description || `${d.cardCount} cards`}</span>
          </span>
          <span className="text-xs text-dim">{d.cardCount}</span>
        </button>
      ))}
      {!decks.length && <p className="text-sm text-dim">No decks yet — the admin can forge some.</p>}
    </div>
  )
}

export function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-parchment">{title}</h2>
          <button className="text-dim hover:text-body" onClick={onClose}>✕</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
