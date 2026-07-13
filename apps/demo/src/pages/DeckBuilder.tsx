/* The deck workshop (issue #30, layout per the designer's second pass): left half is the
   searchable pool, right half is the live card preview (hand-size) plus your deck so far.
   Custom decks persist in localStorage and appear in Play. */
import { useMemo, useRef, useState } from 'react'
import { PREBUILT_DECKS, V3_RULES } from '@newgame/engine'
import { CardFrame } from '@ui/components/CardFrame.tsx'
import { CardSheet } from '@ui/game/Sheets.tsx'
import { DEMO_CARDS } from '../local.ts'
import { allDecks, customSlugFor, deleteCustomDeck, saveCustomDeck, type CustomDeck } from '../custom-decks.ts'

const MAX_COPIES = V3_RULES.maxCopies
const MIN_SIZE = V3_RULES.deckMinSize
const COLORS = ['red', 'yellow', 'purple'] as const
const TYPES = ['unit', 'action', 'upgrade'] as const
const colorText = (c: string) =>
  c === 'red' ? 'text-[#e2583e]' : c === 'yellow' ? 'text-[#e8c14a]' : c === 'purple' ? 'text-[#a06bd8]' : 'text-dim'

/* #59-adjacent (Blaine): the pool rows say their type at a glance — same palette the cards
   themselves wear (unit steel-blue, action violet, upgrade gold). */
const TYPE_CHIP: Record<string, { icon: string; cls: string }> = {
  unit: { icon: '⚔', cls: 'bg-[#31435c]/60 text-[#b9cbe4] ring-[#4d6787]' },
  action: { icon: '✦', cls: 'bg-[#4d2f63]/60 text-[#d5b5ef] ring-[#7b4f9e]' },
  upgrade: { icon: '⬥', cls: 'bg-[#5c4a1e]/60 text-[#ecd9a0] ring-[#96793a]' },
}
const TypeChip = ({ t }: { t: string }) => {
  const m = TYPE_CHIP[t] ?? TYPE_CHIP.unit
  return (
    <span className={`inline-flex w-[74px] shrink-0 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ring-1 ${m.cls}`}>
      {m.icon} {t}
    </span>
  )
}

export function DeckBuilder() {
  const [, bump] = useState(0)
  const refresh = () => bump(n => n + 1)
  const decks = allDecks()
  const [baseSlug, setBaseSlug] = useState(decks[0].slug)
  const [name, setName] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>(() => fromDeck(decks[0].slug))
  const [filter, setFilter] = useState<'all' | (typeof COLORS)[number]>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | (typeof TYPES)[number]>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [inspect, setInspect] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  // the split is yours to drag (issue #30) — persisted, clamped so neither half can vanish
  const [deckW, setDeckW] = useState(() => {
    const saved = Number(localStorage.getItem('workshop-split'))
    return saved >= 300 && saved <= 720 ? saved : 400
  })
  const gridRef = useRef<HTMLDivElement>(null)

  function startDrag(e: React.PointerEvent) {
    e.preventDefault()
    const onMove = (ev: PointerEvent) => {
      const rect = gridRef.current?.getBoundingClientRect()
      if (!rect) return
      const w = Math.round(Math.min(720, Math.max(300, rect.right - ev.clientX)))
      setDeckW(w)
      localStorage.setItem('workshop-split', String(w))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function fromDeck(slug: string): Record<string, number> {
    const d = allDecks().find(x => x.slug === slug)
    const out: Record<string, number> = {}
    for (const c of d?.cards ?? []) out[c.slug] = c.count
    return out
  }

  function loadBase(slug: string) {
    setBaseSlug(slug)
    if (slug === '__empty__') { setCounts({}); setName(''); return }  // a clean bench (Blaine)
    setCounts(fromDeck(slug))
    const d = allDecks().find(x => x.slug === slug)
    if (d && 'custom' in d) setName(d.name)
  }

  const total = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts])
  const pool = useMemo(() => {
    const all = Object.values(DEMO_CARDS)
      .filter(c => c.color !== 'neutral')
      .sort((a, b) => a.color.localeCompare(b.color) || a.cost - b.cost || a.name.localeCompare(b.name))
    return all.filter(c =>
      (filter === 'all' || c.color === filter)
      && (typeFilter === 'all' || c.type === typeFilter)
      && (!search || c.name.toLowerCase().includes(search.toLowerCase())))
  }, [filter, typeFilter, search])
  const composition = useMemo(() => {
    const by: Record<string, number> = {}
    for (const [slug, count] of Object.entries(counts)) {
      const t = DEMO_CARDS[slug]?.type
      if (t) by[t] = (by[t] ?? 0) + count
    }
    return TYPES.map(t => ({ t, n: by[t] ?? 0 })).filter(x => x.n > 0)
  }, [counts])
  const deckList = useMemo(() =>
    Object.entries(counts)
      .map(([slug, count]) => ({ def: DEMO_CARDS[slug], count }))
      .filter(e => e.def)
      .sort((a, b) => a.def.color.localeCompare(b.def.color) || a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name)),
    [counts])

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
  const previewDef = preview ? DEMO_CARDS[preview] : null

  const stepper = (slug: string, n: number) => (
    <div className="flex shrink-0 items-center gap-1.5">
      <button className="btn !px-2.5 !py-0.5" disabled={n <= 0} onClick={() => setCount(slug, n - 1)}>−</button>
      <span className="w-6 text-center font-display font-bold text-parchment">{n}</span>
      <button className="btn !px-2.5 !py-0.5" disabled={n >= MAX_COPIES} onClick={() => setCount(slug, n + 1)}>+</button>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-3xl font-bold text-parchment">The Deck Workshop</h1>
      <p className="mt-2 text-sm text-dim">
        Left: the card pool — search, filter, turn the dials (0–{MAX_COPIES} copies). Right: the card under your
        cursor, exactly as it looks in hand, and your deck so far — drag the divider between them to
        trade space. Minimum {MIN_SIZE} cards; colors mix freely.
        Saved decks appear in <b>Play</b>.
      </p>

      <div className="panel mt-4 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs uppercase tracking-wider text-dim">Start from
          <select className="input mt-1" value={baseSlug} onChange={e => loadBase(e.target.value)}>
            <option value="__empty__">— fresh deck (empty) —</option>
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

      <div ref={gridRef} style={{ ['--deckw' as string]: `${deckW}px` }}
        className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_10px_var(--deckw)]">
        {/* left: the pool */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', ...COLORS] as const).map(c => (
              <button key={c} className={`btn !py-1 text-xs capitalize ${filter === c ? 'btn-primary' : ''}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
            <span className="h-4 w-px bg-white/15" />
            {(['all', ...TYPES] as const).map(t => (
              <button key={t} className={`btn !py-1 text-xs capitalize ${typeFilter === t ? 'btn-primary' : ''}`} onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'all types' : `${TYPE_CHIP[t].icon} ${t}s`}
              </button>
            ))}
            <input className="input !w-56 !py-1 text-sm" placeholder="search cards…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-1">
            {pool.map(c => {
              const n = counts[c.slug] ?? 0
              return (
                <div key={c.slug}
                  onMouseEnter={() => setPreview(c.slug)}
                  className={`flex items-center gap-3 rounded border px-3 py-1.5 ${n > 0 ? 'border-goldbright/40 bg-goldbright/5' : 'hairline'} ${preview === c.slug ? '!border-goldbright/70' : ''}`}>
                  <span className={`w-14 shrink-0 text-[11px] font-bold uppercase ${colorText(c.color)}`}>{c.color}</span>
                  <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-parchment">{c.cost}</span>
                  <TypeChip t={c.type} />
                  <button className="min-w-0 flex-1 truncate text-left text-sm text-body hover:text-goldbright" onClick={() => setPreview(c.slug)}>
                    {c.name}{c.type === 'unit' ? <span className="text-xs text-dim"> · ⚔{c.power} ♥{c.health}</span> : ''}
                  </button>
                  {stepper(c.slug, n)}
                </div>
              )
            })}
          </div>
        </div>

        {/* the divider: drag to trade pool for deck (issue #30) */}
        <div onPointerDown={startDrag} title="drag to resize"
          className="hidden cursor-col-resize items-center justify-center lg:flex group">
          <div className="h-24 w-1 rounded bg-white/15 group-hover:bg-goldbright/50" />
        </div>

        {/* right: preview + the deck so far */}
        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="panel flex flex-col gap-3 p-4">
            <div className="flex justify-center">
              {previewDef
                ? <button onClick={() => setInspect(preview)} title="full details"><CardFrame card={previewDef} size="lg" /></button>
                : <div className="grid h-[340px] w-[248px] place-items-center rounded-lg border border-dashed hairline text-center text-xs text-dim/60">hover a card<br />to preview it</div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-widest text-dim">
                Your deck so far · {total}
                {composition.length > 0 && (
                  <span className="ml-2 normal-case tracking-normal text-dim/80">
                    {composition.map(({ t, n }) => `${n} ${t}${n === 1 ? '' : 's'}`).join(' · ')}
                  </span>
                )}
              </div>
              <div className="mt-2 flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto pr-1">
                {deckList.map(({ def, count }) => (
                  <div key={def.slug}
                    onMouseEnter={() => setPreview(def.slug)}
                    className={`flex items-center gap-2 rounded px-1.5 py-0.5 text-[13px] ${preview === def.slug ? 'bg-goldbright/10' : ''}`}>
                    <span className={`w-4 shrink-0 text-center font-display text-xs font-bold ${colorText(def.color)}`}>{def.cost}</span>
                    <span className="w-3.5 shrink-0 text-center text-[10px]" title={def.type}>{(TYPE_CHIP[def.type] ?? TYPE_CHIP.unit).icon}</span>
                    <span className="flex w-9 shrink-0 -space-x-[3px]" title={def.pips?.length ? `Requires banked color: ${def.pips.join(', ')}` : undefined}>
                      {(def.pips ?? []).map((c, i) => (
                        <img key={i} src={`${import.meta.env.BASE_URL}pips/pip-${c}.png`} alt={c} draggable={false}
                          className="h-[11px] w-[11px] rounded-full object-cover ring-1 ring-black/50" />
                      ))}
                    </span>
                    <button className="min-w-0 flex-1 truncate text-left text-body hover:text-goldbright" onClick={() => setPreview(def.slug)}>{def.name}</button>
                    <span className="shrink-0 font-display text-xs font-bold text-parchment">×{count}</span>
                    <button className="btn !px-1.5 !py-0 text-xs" onClick={() => setCount(def.slug, count - 1)}>−</button>
                    <button className="btn !px-1.5 !py-0 text-xs" disabled={count >= MAX_COPIES} onClick={() => setCount(def.slug, count + 1)}>+</button>
                  </div>
                ))}
                {!deckList.length && <span className="text-xs text-dim/60">empty — start turning dials</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {inspect && DEMO_CARDS[inspect] && <CardSheet card={DEMO_CARDS[inspect]} onClose={() => setInspect(null)} />}
    </div>
  )
}
