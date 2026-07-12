/* The deck workshop (issue #30): start from any deck, turn the count dials, save your own.
   Lives entirely in the browser — custom decks persist in localStorage and appear in Play. */
import { useMemo, useState } from 'react'
import { PREBUILT_DECKS, V3_RULES } from '@newgame/engine'
import { CardSheet } from '@ui/game/Sheets.tsx'
import { DEMO_CARDS } from '../local.ts'
import { allDecks, customSlugFor, deleteCustomDeck, saveCustomDeck, type CustomDeck } from '../custom-decks.ts'

const MAX_COPIES = V3_RULES.maxCopies
const MIN_SIZE = V3_RULES.deckMinSize
const COLORS = ['red', 'yellow', 'purple'] as const

export function DeckBuilder() {
  const [, bump] = useState(0)
  const refresh = () => bump(n => n + 1)
  const decks = allDecks()
  const [baseSlug, setBaseSlug] = useState(decks[0].slug)
  const [name, setName] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>(() => fromDeck(decks[0].slug))
  const [filter, setFilter] = useState<'all' | (typeof COLORS)[number]>('all')
  const [search, setSearch] = useState('')
  const [inspect, setInspect] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function fromDeck(slug: string): Record<string, number> {
    const d = allDecks().find(x => x.slug === slug)
    const out: Record<string, number> = {}
    for (const c of d?.cards ?? []) out[c.slug] = c.count
    return out
  }

  function loadBase(slug: string) {
    setBaseSlug(slug)
    setCounts(fromDeck(slug))
    const d = allDecks().find(x => x.slug === slug)
    if (d && 'custom' in d) setName(d.name)
  }

  const total = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts])
  const cards = useMemo(() => {
    const all = Object.values(DEMO_CARDS)
      .filter(c => c.color !== 'neutral')
      .sort((a, b) => a.color.localeCompare(b.color) || a.cost - b.cost || a.name.localeCompare(b.name))
    return all.filter(c =>
      (filter === 'all' || c.color === filter)
      && (!search || c.name.toLowerCase().includes(search.toLowerCase())))
  }, [filter, search])

  const setCount = (slug: string, n: number) =>
    setCounts(prev => {
      const next = { ...prev }
      if (n <= 0) delete next[slug]
      else next[slug] = Math.min(MAX_COPIES, n)
      return next
    })

  function save() {
    const trimmed = name.trim()
    if (!trimmed) { setToast('name your deck first'); return }
    if (total < MIN_SIZE) { setToast(`a deck needs at least ${MIN_SIZE} cards`); return }
    const slug = customSlugFor(trimmed)
    if (PREBUILT_DECKS.some(d => d.slug === slug)) { setToast('that name belongs to a prebuilt'); return }
    const colorsUsed = new Set(Object.keys(counts).map(s => DEMO_CARDS[s]?.color))
    const deck: CustomDeck = {
      slug, name: trimmed, custom: true,
      color: colorsUsed.size === 1 ? ([...colorsUsed][0] as CustomDeck['color']) : 'custom',
      description: `Custom deck (${total} cards) — built in the workshop`,
      cards: Object.entries(counts).map(([s, count]) => ({ slug: s, count })).sort((a, b) => a.slug.localeCompare(b.slug)),
    }
    saveCustomDeck(deck)
    setBaseSlug(slug)
    setToast(`saved — "${trimmed}" is now selectable in Play`)
    refresh()
  }

  const base = decks.find(d => d.slug === baseSlug)
  const isCustomBase = !!base && 'custom' in base

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-3xl font-bold text-parchment">The Deck Workshop</h1>
      <p className="mt-2 text-sm text-dim">
        Start from any deck, turn the count dials (0–{MAX_COPIES} copies), name it, save. Custom decks live in
        this browser and appear in the <b>Play</b> deck pickers. Minimum {MIN_SIZE} cards; colors mix freely —
        pips only ask that each color lives in your bank.
      </p>

      <div className="panel mt-4 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs uppercase tracking-wider text-dim">Start from
          <select className="input mt-1" value={baseSlug} onChange={e => loadBase(e.target.value)}>
            {decks.map(d => <option key={d.slug} value={d.slug}>{d.name}{'custom' in d ? ' (custom)' : ''}</option>)}
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-dim">Deck name
          <input className="input mt-1" placeholder="e.g. Crimson Court" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <div className={`font-display text-lg font-bold ${total < MIN_SIZE ? 'text-[#e5735f]' : 'text-parchment'}`}>
          {total} / {MIN_SIZE}+
        </div>
        <button className="btn btn-primary" disabled={total < MIN_SIZE || !name.trim()} onClick={save}>Save deck</button>
        {isCustomBase && (
          <button className="btn btn-danger" onClick={() => { deleteCustomDeck(baseSlug); loadBase(PREBUILT_DECKS[0].slug); setToast('deleted'); refresh() }}>
            Delete this custom deck
          </button>
        )}
        {toast && <span className="text-xs text-goldbright">{toast}</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['all', ...COLORS] as const).map(c => (
          <button key={c} className={`btn !py-1 text-xs capitalize ${filter === c ? 'btn-primary' : ''}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
        <input className="input !w-56 !py-1 text-sm" placeholder="search cards…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {cards.map(c => {
          const n = counts[c.slug] ?? 0
          return (
            <div key={c.slug} className={`flex items-center gap-3 rounded border px-3 py-1.5 ${n > 0 ? 'border-goldbright/40 bg-goldbright/5' : 'hairline'}`}>
              <span className={`w-14 shrink-0 text-[11px] font-bold uppercase ${c.color === 'red' ? 'text-[#e2583e]' : c.color === 'yellow' ? 'text-[#e8c14a]' : 'text-[#a06bd8]'}`}>{c.color}</span>
              <span className="w-8 shrink-0 text-center font-display text-sm font-bold text-parchment">{c.cost}</span>
              <button className="min-w-0 flex-1 truncate text-left text-sm text-body hover:text-goldbright" onClick={() => setInspect(c.slug)} title="inspect">
                {c.name} <span className="text-xs text-dim">· {c.type}{c.type === 'unit' ? ` ${c.power}/${c.health}` : ''}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                <button className="btn !px-2.5 !py-0.5" disabled={n <= 0} onClick={() => setCount(c.slug, n - 1)}>−</button>
                <span className="w-6 text-center font-display font-bold text-parchment">{n}</span>
                <button className="btn !px-2.5 !py-0.5" disabled={n >= MAX_COPIES} onClick={() => setCount(c.slug, n + 1)}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {inspect && DEMO_CARDS[inspect] && <CardSheet card={DEMO_CARDS[inspect]} onClose={() => setInspect(null)} />}
    </div>
  )
}
