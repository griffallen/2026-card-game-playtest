import { useRef, useState } from 'react'
import type { Seat, TargetRef, UnitView } from '@newgame/engine'
import { UnitChip } from '@ui/game/UnitChip.tsx'
import { UnitInspector } from '@ui/game/Sheets.tsx'
import { useCardPreview } from '@ui/game/CardPreview.tsx'
import type { CardLike } from '@ui/components/CardFrame.tsx'
import type { Sleeve } from '@ui/game/sleeves.ts'

export interface BlockPair { blocker: string; onto: string }

/** Issue #58 (Griff): blocking should be a spatial act. This modal lays the incoming
 *  attackers in a row with a drop-slot under each; the defender clicks a unit then an
 *  attacker's slot, OR drags the unit onto it. More than one defender may gang a single
 *  attacker (damage pours in assignment order — decision 62). Leaving a slot empty waves
 *  that attacker past to its target. The Confirm button emits the exact same block action
 *  the old side-panel did: { type:'block', pairs:[{blocker,onto}] } — presentation only. */
export function BlockModal({
  attackers, target, targetName, targetView, defenders, allowedOnto, duel,
  myLife, pairs, onChange, onConfirm, onCancel, sleeveOf, cardOf,
}: {
  attackers: UnitView[]
  target: TargetRef
  targetName: string
  /** set when the attack was declared on one of your units (not your base) */
  targetView?: UnitView
  /** your ready, in-zone units that may block (already filtered by the legal-action list) */
  defenders: UnitView[]
  /** blockerId → the set of attacker ids it may legally be paired onto */
  allowedOnto: Map<string, Set<string>>
  /** duel law (issue #50): a lone attacker on a unit is answered by at most one Guard */
  duel: boolean
  myLife: number
  pairs: BlockPair[]
  onChange: (pairs: BlockPair[]) => void
  onConfirm: (pairs: BlockPair[]) => void
  /** let-it-all-through shortcut kept reachable even mid-assignment */
  onCancel: () => void
  sleeveOf: (owner: Seat) => Sleeve
  /** issue #114: the modal reads cards itself now — see the inspector note below */
  cardOf: (slug: string) => CardLike | undefined
}) {
  const [selected, setSelected] = useState<string | null>(null)
  // hand-rolled pointer drag (works with mouse AND touch — HTML5 DnD skips touch)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  const [hoverAtk, setHoverAtk] = useState<string | null>(null)
  // Griff (issue #58): peek at the whole board mid-assignment. Pure visibility toggle — the
  // component stays mounted, so blockPairs (owned by DemoTable) and every in-progress selection
  // survive untouched; we just render a compact "back" control instead of the panel.
  const [peeking, setPeeking] = useState(false)
  // #114 (Griff): "when I'm in the defender pop-up, I can't preview the cards in that window
  // unless I hide the defense window." The inspector used to be rendered by DemoTable, as a
  // SIBLING of this modal at the same z-50 — and this modal is later in the DOM, so it painted
  // over the very sheet it opened. Owning the inspector here puts it inside the modal's own
  // stacking context, where it lands on top and the block assignment underneath is untouched.
  const [inspectId, setInspectId] = useState<string | null>(null)
  const preview = useCardPreview()
  const rootRef = useRef<HTMLDivElement>(null)

  const targetIsBase = target.kind === 'base'
  // the target is always the defender's own base/unit — say "your …" rather than "<name>'s …"
  const friendlyTarget = targetIsBase ? 'your base' : targetView ? `your ${targetView.name}` : targetName
  const canPair = (blocker: string, onto: string) => !!allowedOnto.get(blocker)?.has(onto)
  // every unit visible in this modal, by id — attackers, your defenders, and the unit under attack
  const unitById = (id: string) =>
    attackers.find(u => u.id === id) ?? defenders.find(u => u.id === id) ?? (targetView?.id === id ? targetView : undefined)
  const hover = (u: UnitView) => preview.bind(cardOf(u.slug))
  const blockersOf = (atkId: string) => pairs.filter(p => p.onto === atkId)      // in pour order
  const assignedIds = new Set(pairs.map(p => p.blocker))
  const pool = defenders.filter(d => !assignedIds.has(d.id))

  function assign(blocker: string, onto: string) {
    if (!canPair(blocker, onto)) return
    // a unit blocks at most one attacker: drop any prior pairing, then append (append = last to
    // eat damage in the pour). Under duel law only one blocker total may step in.
    let next = pairs.filter(p => p.blocker !== blocker)
    if (duel) next = []
    onChange([...next, { blocker, onto }])
    setSelected(null)
  }
  function unassign(blocker: string) {
    onChange(pairs.filter(p => p.blocker !== blocker))
  }
  function waveThrough(atkId: string) {
    onChange(pairs.filter(p => p.onto !== atkId))
  }
  function clickDefender(id: string) {
    if (assignedIds.has(id)) { unassign(id); return }
    setSelected(s => (s === id ? null : id))
  }
  function clickSlot(atkId: string) {
    if (selected && canPair(selected, atkId)) assign(selected, atkId)
  }

  // ── pointer drag ──────────────────────────────────────────────────────────
  function slotAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)?.closest('[data-atk-slot]') as HTMLElement | null
    return el?.dataset.atkSlot ?? null
  }
  function onPointerDownDefender(e: React.PointerEvent, id: string) {
    if (e.button != null && e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({ id, x: e.clientX, y: e.clientY, moved: false })
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved })
    if (moved) setHoverAtk(slotAt(e.clientX, e.clientY))
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag) return
    if (drag.moved) {
      const onto = slotAt(e.clientX, e.clientY)
      if (onto && canPair(drag.id, onto)) assign(drag.id, onto)
    } else {
      clickDefender(drag.id)   // a tap that never moved = a click-select
    }
    setDrag(null)
    setHoverAtk(null)
  }

  // ── live consequence maths (ported verbatim from the old side-panel, #62) ───
  const unblocked = attackers.filter(a => !blockersOf(a.id).length)
  const openPower = unblocked.reduce((s, a) => s + a.power, 0)
  const armor = targetView?.armor ?? 0
  const landing = targetView?.shielded ? 0 : Math.max(0, openPower - armor)
  const lifeLoss = targetIsBase ? openPower : 0
  const dropId = drag?.id ?? null

  const confirmLabel = pairs.length
    ? `Confirm — block with ${new Set(pairs.map(p => p.blocker)).size}`
    : targetIsBase
      ? (openPower ? `Let it through — lose ${lifeLoss} life` : 'Let it through')
      : 'Let it through'

  // Peek mode: hide the panel so the whole board shows through. A transparent scrim keeps the
  // board view-only (a stray board tap must not mutate the in-progress assignment); the floating
  // control brings the modal back with everything intact.
  if (peeking) {
    const blocking = new Set(pairs.map(p => p.blocker)).size
    return (
      <>
        <div className="fixed inset-0 z-40" aria-hidden onClick={() => { /* swallow board taps while peeking */ }} />
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
          <div className="panel flex items-center gap-3 !border-[#c98a27] px-4 py-2 shadow-2xl">
            <span className="text-[12.5px] text-body/90">
              👁 Viewing the board — <b className="text-parchment">{blocking}</b> blocking
              {unblocked.length
                ? <>, <b className="text-parchment">{unblocked.length}</b> through{targetIsBase && lifeLoss ? ` (−${lifeLoss} life)` : ''}</>
                : null}
            </span>
            <button className="btn btn-primary !py-1 text-xs" onClick={() => setPeeking(false)}>← Back to blocking</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div className="panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden !border-[#c98a27] shadow-2xl">
        {/* header */}
        <div className="border-b hairline bg-[#c98a27]/10 px-4 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="font-display text-lg font-bold text-goldbright">⚔ Incoming attack — assign your blockers</div>
            <button className="btn !py-1 text-xs shrink-0" title="Peek at the whole board — your assignments are kept"
              onClick={() => setPeeking(true)}>👁 View board</button>
          </div>
          <p className="mt-0.5 text-[12.5px] text-body/90">
            {attackers.length === 1 ? 'An attacker strikes' : `${attackers.length} attackers strike`}{' '}
            <b className="text-parchment">{friendlyTarget}</b>.{' '}
            Slide a defender under an attacker to fight it, gang several to pour damage in order,
            or leave a slot empty to let it through.
            {duel && <span className="text-[#e5a99f]"> Duel law: this lone attacker takes at most one Guard.</span>}
          </p>
          {/* #114 (Griff): you can read every card without leaving the window now. */}
          <p className="mt-0.5 text-[11.5px] text-dim">
            🔍 Tap an attacker — or long-press one of your defenders — to read its card here.
            {targetView && (
              <button className="ml-1 underline decoration-dotted hover:text-body" onClick={() => setInspectId(targetView.id)}>
                Read {targetView.name}
              </button>
            )}
          </p>
        </div>

        {/* attacker row + slots */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap justify-center gap-4">
            {attackers.map(a => {
              const mine = blockersOf(a.id)
              const isHot = hoverAtk === a.id && dropId != null && canPair(dropId, a.id)
              const canDrop = dropId != null && canPair(dropId, a.id)
              const selectable = selected != null && canPair(selected, a.id)
              const through = !mine.length
              return (
                <div key={a.id} className="flex w-[132px] flex-col items-center">
                  <div className="text-[10px] uppercase tracking-widest text-[#e5a99f]/80">Attacker</div>
                  <UnitChip unit={a} mine={false} glow="attack" sleeve={sleeveOf(a.owner)}
                    onHoverPreview={hover(a)}
                    onClick={() => setInspectId(a.id)} onLongPress={() => setInspectId(a.id)} />
                  <div className="my-1 text-dim">↓</div>
                  {/* drop slot */}
                  <div
                    data-atk-slot={a.id}
                    onClick={() => clickSlot(a.id)}
                    className={[
                      'flex min-h-[86px] w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-1.5 transition-colors',
                      isHot ? 'border-goldbright bg-goldbright/15'
                        : selectable ? 'cursor-pointer border-goldbright/70 bg-goldbright/5'
                          : canDrop ? 'border-goldbright/40'
                            : through ? 'border-[#e5735f]/50 bg-[#e5735f]/5'
                              : 'border-gold/30',
                    ].join(' ')}
                  >
                    {mine.length ? (
                      <div className="flex flex-wrap items-end justify-center gap-1">
                        {mine.map((p, i) => {
                          const d = defenders.find(x => x.id === p.blocker)
                          if (!d) return null
                          return (
                            <div key={p.blocker} className="relative">
                              {mine.length > 1 && (
                                <span className="absolute -left-1 -top-1 z-10 grid h-4 w-4 place-items-center rounded-full bg-goldbright text-[9px] font-bold text-black"
                                  title={`pour order ${i + 1}${i === 0 ? ' — eats damage first' : ''}`}>{i + 1}</span>
                              )}
                              <div className="scale-90 origin-bottom">
                                <UnitChip unit={d} mine glow="selected" sleeve={sleeveOf(d.owner)}
                                  onHoverPreview={hover(d)}
                                  onClick={() => unassign(p.blocker)} onLongPress={() => setInspectId(p.blocker)} />
                              </div>
                              <button className="mt-0.5 block w-full text-[9px] text-dim hover:text-[#e5a99f]"
                                onClick={e => { e.stopPropagation(); unassign(p.blocker) }}>✕ remove</button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="px-1 text-center text-[10.5px] leading-tight text-dim">
                        {selectable ? 'tap here to send it in'
                          : canDrop ? 'drop to block'
                            : 'empty — this attacker gets through'}
                      </span>
                    )}
                  </div>
                  {/* per-attacker consequence + explicit let-through */}
                  <div className="mt-1.5 w-full text-center text-[11px] leading-tight">
                    {mine.length ? (
                      <>
                        <div className="text-parchment">
                          {a.name} ({a.power}⚔) → {mine.map(p => defenders.find(x => x.id === p.blocker)?.name ?? '?').join(' + ')}
                        </div>
                        <button data-wave-through={a.id} className="mt-0.5 text-[10.5px] text-dim underline decoration-dotted hover:text-[#e5a99f]"
                          onClick={() => waveThrough(a.id)}>↷ let it through instead</button>
                      </>
                    ) : (
                      <div className="text-[#e5a99f]">
                        {a.name} ({a.power}⚔) → {targetIsBase ? 'your base' : `your ${targetView?.name ?? targetName}`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* defender pool */}
        <div className="border-t hairline px-4 py-2.5">
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-dim">
            Your ready defenders{selected ? ' — now tap an attacker slot' : ' — tap one, then an attacker (or drag it up)'}
          </div>
          {pool.length ? (
            <div className="flex flex-wrap gap-2">
              {pool.map(d => (
                <div key={d.id} data-def-id={d.id} style={{ touchAction: 'none' }}
                  onPointerDown={e => onPointerDownDefender(e, d.id)}>
                  <UnitChip unit={d} mine glow={selected === d.id ? 'selected' : 'none'} sleeve={sleeveOf(d.owner)}
                    actionable={selected !== d.id}
                    onHoverPreview={hover(d)}
                    onClick={() => { if (!drag) clickDefender(d.id) }}
                    onLongPress={() => setInspectId(d.id)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-dim">
              {defenders.length ? 'Every defender is assigned. Remove one to reassign, or Confirm.' : 'No ready units can block this — you can only let it through.'}
            </p>
          )}
        </div>

        {/* summary + confirm */}
        <div className="border-t hairline bg-black/30 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
            {targetIsBase ? (
              <span className={lifeLoss ? 'text-[#e5a99f]' : 'text-dim'}>
                {lifeLoss
                  ? <>Unblocked damage to your base: <b className="text-parchment">{lifeLoss}</b> → you drop to <b className="text-parchment">{Math.max(0, myLife - lifeLoss)}</b> life.</>
                  : 'Nothing reaches your base.'}
              </span>
            ) : (
              <span className={landing ? 'text-[#e5a99f]' : 'text-dim'}>
                {landing
                  ? <><b className="text-parchment">{landing}</b> lands on {targetView?.name ?? targetName}
                    {targetView && landing >= targetView.health - targetView.damage ? ' — lethal' : ''}. No life lost — they strike your unit.</>
                  : targetView?.shielded ? `${targetView.name}'s shield eats the whole hit.` : 'Nothing reaches your unit.'}
                {targetView && unblocked.length > 0 && (unblocked.length === 1
                  ? <> And {targetView.name} strikes back at <b className="text-parchment">{targetView.power}</b>, even while exhausted.</>
                  : <> And {targetView.name} strikes back — its <b className="text-parchment">{targetView.power}</b> power poured across the unblocked attackers, biggest first, even while exhausted.</>)}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button data-block-confirm className="btn btn-primary !py-1 text-sm" onClick={() => onConfirm(pairs)}>{confirmLabel}</button>
            {pairs.length > 0 && (
              <>
                <button className="btn !py-1 text-xs" onClick={() => onChange([])}>Clear</button>
                <button className="btn !py-1 text-xs" onClick={onCancel}>Let it all through</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* drag ghost */}
      {drag?.moved && (() => {
        const d = defenders.find(x => x.id === drag.id)
        if (!d) return null
        return (
          <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 opacity-90"
            style={{ left: drag.x, top: drag.y }}>
            <UnitChip unit={d} mine glow="selected" sleeve={sleeveOf(d.owner)} />
          </div>
        )
      })()}

      {/* #114: hovering any chip in the modal raises its full card (mouse only) */}
      {!drag && preview.layer}

      {/* #114: the card sheet, owned by the modal so it paints ABOVE it — the whole point.
          Closing it drops you back into an untouched assignment. */}
      {inspectId && (() => {
        const u = unitById(inspectId)
        const card = u && cardOf(u.slug)
        if (!u || !card) return null
        return (
          <UnitInspector
            unit={u}
            card={card}
            upgradeCards={u.upgrades.map(up => cardOf(up.slug)).filter((c): c is CardLike => !!c)}
            sleeve={sleeveOf(u.owner)}
            onClose={() => setInspectId(null)}
          />
        )
      })()}
    </div>
  )
}
