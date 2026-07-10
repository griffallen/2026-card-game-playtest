import { useEffect, useMemo, useState } from 'react'
import { get, patch, post } from '../../api.ts'
import { CardFrame, type CardLike } from '../../components/CardFrame.tsx'

type Row = CardLike & { active?: boolean; effects?: unknown }

/** Numeric/text edits live in columns; structure lives in the effects JSON (engine-validated server-side). */
function Editor({ card, onSaved, creating }: { card: Row; onSaved: () => void; creating?: boolean }) {
  const [draft, setDraft] = useState<Row>(card)
  const [effectsJson, setEffectsJson] = useState('')
  const [showJson, setShowJson] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(card)
    setEffectsJson(JSON.stringify(card.effects ?? {}, null, 2))
    setError('')
  }, [card])

  async function save() {
    setError('')
    setSaved(false)
    try {
      let payload: Record<string, unknown> = {
        name: draft.name, cost: draft.cost, text: draft.text, color: draft.color, type: draft.type,
        ...(draft.type === 'unit' ? { power: draft.power ?? 0, health: draft.health ?? 1 } : { power: undefined, health: undefined }),
      }
      if (showJson) {
        const parsed = JSON.parse(effectsJson) as Record<string, unknown>
        // structural fields ride along with the parsed def; columns win for numerics
        payload = { ...parsed, ...payload }
      }
      if (creating) await post('/api/admin/cards', payload)
      else await patch(`/api/admin/cards/${card.slug}`, payload)
      setSaved(true)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    }
  }

  const num = (v: string) => (v === '' ? 0 : Number(v))
  const preview: CardLike = { ...draft, artUrl: creating ? null : draft.artUrl }

  return (
    <div className="flex flex-wrap gap-4 border-t hairline bg-ink/40 p-4">
      <CardFrame card={preview} />
      <div className="min-w-72 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-dim">Name
            <input className="input mt-0.5" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="text-xs text-dim">Cost
            <input className="input mt-0.5" type="number" min={0} value={draft.cost} onChange={e => setDraft({ ...draft, cost: num(e.target.value) })} />
          </label>
          <label className="text-xs text-dim">Color
            <select className="input mt-0.5" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })}>
              <option value="red">red</option><option value="yellow">yellow</option><option value="neutral">neutral</option>
            </select>
          </label>
          <label className="text-xs text-dim">Type
            <select className="input mt-0.5" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} disabled={!creating}>
              <option value="unit">unit</option><option value="action">action</option><option value="upgrade">upgrade</option>
            </select>
          </label>
          {draft.type === 'unit' && (
            <>
              <label className="text-xs text-dim">Power
                <input className="input mt-0.5" type="number" min={0} value={draft.power ?? 0} onChange={e => setDraft({ ...draft, power: num(e.target.value) })} />
              </label>
              <label className="text-xs text-dim">Health
                <input className="input mt-0.5" type="number" min={1} value={draft.health ?? 1} onChange={e => setDraft({ ...draft, health: num(e.target.value) })} />
              </label>
            </>
          )}
        </div>
        <label className="mt-2 block text-xs text-dim">Card text (what players read)
          <textarea className="input mt-0.5 h-16" value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} />
        </label>
        {card.designerNote && <p className="mt-2 text-xs text-goldbright">⚑ {card.designerNote}</p>}

        <button className="mt-2 text-xs text-dim underline" onClick={() => setShowJson(s => !s)}>
          {showJson ? 'hide' : 'edit'} effect structure (advanced)
        </button>
        {showJson && (
          <>
            <textarea className="input mt-1 h-44 font-mono text-xs" value={effectsJson} onChange={e => setEffectsJson(e.target.value)} spellCheck={false} />
            <p className="mt-1 text-[11px] text-dim">
              Structured effects only — the engine validates on save and rejects anything it can't execute, so a bad edit can't break games.
            </p>
          </>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button className="btn btn-primary !py-1" onClick={save}>{creating ? 'Forge card' : 'Save changes'}</button>
          {!creating && (
            <button className="btn !py-1 text-xs" onClick={() => patch(`/api/admin/cards/${card.slug}`, { active: !(card.active ?? true) }).then(onSaved)}>
              {(card.active ?? true) ? 'retire card' : 'restore card'}
            </button>
          )}
          {saved && <span className="text-xs text-emerald-400">saved ✓</span>}
          {error && <span className="text-xs text-[#e5a99f]">{error}</span>}
        </div>
        <p className="mt-2 text-[11px] text-dim">Games in progress keep their snapshot — edits apply to new games only. New cards get procedural art automatically.</p>
      </div>
    </div>
  )
}

const BLANK: Row = { slug: '', name: '', color: 'red', type: 'unit', cost: 1, power: 1, health: 1, text: '', artUrl: null }

export function AdminCards() {
  const [cards, setCards] = useState<Row[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const refresh = () => get<{ cards: Row[] }>('/api/cards').then(r => setCards(r.cards))
  useEffect(() => { refresh() }, [])

  const shown = useMemo(
    () => cards.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.color.localeCompare(b.color) || a.cost - b.cost),
    [cards, q],
  )

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input className="input max-w-64" placeholder="Filter cards…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-primary ml-auto" onClick={() => { setCreating(c => !c); setOpen(null) }}>
          {creating ? 'Close forge' : '✦ New card'}
        </button>
      </div>
      {creating && <div className="panel mb-3"><Editor card={BLANK} creating onSaved={refresh} /></div>}
      <div className="panel overflow-hidden">
        {shown.map(c => (
          <div key={c.slug}>
            <button
              onClick={() => setOpen(open === c.slug ? null : c.slug)}
              className="flex w-full items-center gap-3 border-b hairline px-4 py-2 text-left text-sm hover:bg-raised"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${c.color === 'red' ? 'bg-crimson' : c.color === 'yellow' ? 'bg-sun' : c.color === 'purple' ? 'bg-[#8a63c9]' : 'bg-dim'}`} />
              <span className="w-8 text-dim">{c.cost}</span>
              <span className="min-w-0 flex-1 truncate font-display text-parchment">{c.name} {c.designerNote && <span className="text-goldbright">⚑</span>}</span>
              <span className="w-16 text-xs text-dim">{c.type}</span>
              <span className="w-12 text-xs text-dim">{c.type === 'unit' ? `${c.power}/${c.health}` : ''}</span>
            </button>
            {open === c.slug && <Editor card={c} onSaved={refresh} />}
          </div>
        ))}
      </div>
    </div>
  )
}
