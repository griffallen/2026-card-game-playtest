import { useEffect, useState } from 'react'
import { get, patch, post } from '../../api.ts'

interface Version { id: string; name: string; config: Record<string, number | boolean | string>; isDefault: boolean }

const LABELS: Record<string, string> = {
  startingLife: 'Starting life (and healing cap)',
  hopeWinThreshold: 'Hope needed to win',
  startingHandSize: 'Opening hand size',
  startingResources: 'Resources banked at setup',
  drawPerRound: 'Cards drawn per round',
  firstRoundDraw: 'Cards drawn on round 1',
  resourcesPerRound: 'Cards banked per round (max)',
  deckMinSize: 'Deck minimum size',
  maxCopies: 'Max copies of one card',
  upgradePressureInfluence: 'Influence to opponent per extra upgrade',
  summoningSickness: 'Units wait a round before acting',
  moveExhausts: 'Moving exhausts the unit',
  rushCoversAttack: 'Rush also waives the entry-round attack exhaust',
  interceptExhausts: 'Intercepting exhausts the blocker (Guard exempt)',
  maxAttackers: 'Max attackers per attack (0 = unlimited)',
  simultaneousLifeTiebreak: 'Both die at once — who wins',
}

export function AdminRules() {
  const [versions, setVersions] = useState<Version[]>([])
  const [draft, setDraft] = useState<Version | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const refresh = () => get<{ versions: Version[] }>('/api/admin/rules').then(r => {
    setVersions(r.versions)
    setDraft(d => d ? r.versions.find(v => v.id === d.id) ?? r.versions[0] : (r.versions.find(v => v.isDefault) ?? r.versions[0]))
  })
  useEffect(() => { refresh() }, [])

  if (!draft) return <p className="text-dim">Loading…</p>

  const setKey = (k: string, v: number | boolean | string) => {
    setDraft({ ...draft, config: { ...draft.config, [k]: v } })
    setSaved(false)
  }

  async function saveExisting() {
    setError('')
    try {
      await patch(`/api/admin/rules/${draft!.id}`, { config: draft!.config })
      setSaved(true)
      refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
  }

  async function saveAsNew(makeDefault: boolean) {
    setError('')
    if (!newName.trim()) return setError('give the new version a name')
    try {
      await post('/api/admin/rules', { name: newName.trim(), config: draft!.config, makeDefault })
      setNewName('')
      setSaved(true)
      refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="panel h-fit p-2">
        {versions.map(v => (
          <button key={v.id} onClick={() => { setDraft(v); setSaved(false) }}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${draft.id === v.id ? 'bg-raised text-goldbright' : 'text-dim hover:text-body'}`}>
            <span className="truncate">{v.name}</span>
            {v.isDefault && <span className="text-[10px] uppercase text-goldbright">default</span>}
          </button>
        ))}
      </div>
      <div className="panel p-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-parchment">{draft.name}</h2>
          {!draft.isDefault && (
            <button className="btn !py-0.5 text-xs" onClick={() => patch(`/api/admin/rules/${draft.id}`, { makeDefault: true }).then(refresh)}>
              make default for new games
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-dim">New games snapshot the default version's values. Games in progress never change under you.</p>
        <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {Object.entries(draft.config).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-dim">{LABELS[k] ?? k}</span>
              {typeof v === 'boolean' ? (
                <input type="checkbox" checked={v} onChange={e => setKey(k, e.target.checked)} className="h-4 w-4 accent-[#c9a227]" />
              ) : typeof v === 'number' ? (
                <input type="number" className="input !w-20 !py-1 text-right" value={v} onChange={e => setKey(k, Number(e.target.value))} />
              ) : (
                <select className="input !w-28 !py-1" value={v} onChange={e => setKey(k, e.target.value)}>
                  <option value="actor">the actor</option><option value="active">initiative holder</option><option value="draw">draw</option>
                </select>
              )}
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t hairline pt-4">
          <button className="btn btn-primary !py-1" onClick={saveExisting}>Save to “{draft.name}”</button>
          <span className="mx-2 text-dim">or</span>
          <input className="input !w-44 !py-1" placeholder="new version name" value={newName} onChange={e => setNewName(e.target.value)} />
          <button className="btn !py-1" onClick={() => saveAsNew(false)}>Save as new</button>
          <button className="btn !py-1" onClick={() => saveAsNew(true)}>Save as new + default</button>
          {saved && <span className="text-xs text-emerald-400">saved ✓</span>}
          {error && <span className="text-xs text-[#e5a99f]">{error}</span>}
        </div>
      </div>
    </div>
  )
}
