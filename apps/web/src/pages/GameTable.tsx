import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { GameAction, HandCardView, PlayerView, Seat, TargetRef, ZoneId } from '@newgame/engine'
import { useGameSocket } from '../game/useGameSocket.ts'
import { UnitChip } from '../game/UnitChip.tsx'
import { InfluenceTrack } from '../game/InfluenceTrack.tsx'
import { CardFrame, type CardLike } from '../components/CardFrame.tsx'
import { HelpPanel } from '../components/HelpPanel.tsx'
import { BaseSheet, CardSheet, EventTicker, PileSheet, UnitInspector, useValueFlash } from '../game/Sheets.tsx'
import { get } from '../api.ts'

type Inspect =
  | { kind: 'unit'; id: string }
  | { kind: 'card'; slug: string }
  | { kind: 'pile'; seat: Seat; pile: 'resources' | 'discard' }
  | { kind: 'base'; seat: Seat }
  | null

type Selection =
  | { kind: 'hand'; id: string }
  | { kind: 'units'; ids: string[] }   // one or more ready friendly attackers in one zone
  | { kind: 'targeting'; card: string; collected: TargetRef[] }
  | null

const sameRef = (a: TargetRef, b: TargetRef) =>
  a.kind === b.kind
  && (a.kind !== 'unit' || (b.kind === 'unit' && a.id === b.id))
  && (a.kind !== 'base' || (b.kind === 'base' && a.seat === b.seat))
  && (a.kind !== 'zone' || (b.kind === 'zone' && a.zone === b.zone))
  && (a.kind !== 'upgrade' || (b.kind === 'upgrade' && a.id === b.id))

export function GameTable() {
  const { id = '' } = useParams()
  const { view, meta, online, spectators, connected, toasts, sendAction, undo } = useGameSocket(id)
  const [selection, setSelection] = useState<Selection>(null)
  const [cardIndex, setCardIndex] = useState<Record<string, CardLike>>({})
  const [confirming, setConfirming] = useState<'concede' | 'undo' | null>(null)
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [inspect, setInspect] = useState<Inspect>(null)
  const [setupPicks, setSetupPicks] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    get<{ cards: CardLike[] }>('/api/cards')
      .then(r => setCardIndex(Object.fromEntries(r.cards.map(c => [c.slug, c]))))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [view?.log])
  useEffect(() => { setSelection(null) }, [view?.actorSeat, view?.round, view?.phase])
  useEffect(() => { setSetupPicks([]) }, [view?.actorSeat, view?.phase])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelection(null); setConfirming(null); setInspect(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const seat: Seat = view?.viewerSeat ?? 0
  const foe: Seat = (1 - seat) as Seat
  const spectating = view?.viewerSeat === null

  // ── affordances derived from the server's legal-action list ──
  const actions = view?.actions ?? []
  const myWindow = !spectating && view !== null && view.actorSeat === seat && view.winner === null

  const playActionsFor = (cardId: string) => actions.filter(
    (a): a is Extract<GameAction, { type: 'play' }> => a.type === 'play' && a.card === cardId,
  )
  const resourceActionFor = (cardId: string) => actions.find(a => a.type === 'resource' && a.card === cardId)
  /** Highlighted refs for the current selection state. */
  const highlights: TargetRef[] = useMemo(() => {
    if (!view || !myWindow || !selection) return []
    if (selection.kind === 'targeting') {
      const matching = playActionsFor(selection.card).filter(a => {
        const t = a.targets ?? []
        return selection.collected.every((c, i) => t[i] && sameRef(t[i], c))
      })
      const idx = selection.collected.length
      const refs: TargetRef[] = []
      for (const a of matching) {
        const ref = (a.targets ?? [])[idx]
        if (ref && !refs.some(r => sameRef(r, ref))) refs.push(ref)
      }
      return refs
    }
    if (selection.kind === 'units') {
      const sel = selection.ids
      const refs: TargetRef[] = []
      // a lone unit may also move; a group cannot (one action moves one unit)
      if (sel.length === 1) {
        for (const a of actions) if (a.type === 'move' && a.unit === sel[0]) refs.push({ kind: 'zone', zone: a.to })
      }
      // highlight a target if some legal attack whose attacker group ⊇ our selection hits it
      for (const a of actions) {
        if (a.type !== 'attack') continue
        if (sel.every(id => a.attackers.includes(id)) && !refs.some(r => sameRef(r, a.target))) refs.push(a.target)
      }
      return refs
    }
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, view, myWindow])

  if (!view) {
    return (
      <div className="grid h-full place-items-center text-dim">
        {connected ? 'Setting the table…' : 'Reaching the table…'}
      </div>
    )
  }

  const zonesTopToBottom: ZoneId[] = seat === 0 ? [2, 1, 0] : [0, 1, 2]
  const my = view.sides[seat]
  const their = view.sides[foe]
  const influenceMine = seat === 0 ? view.influence : -view.influence
  const names: [string, string] = meta?.names ?? [view.sides[0].name, view.sides[1].name]

  const isHighlighted = (ref: TargetRef) => highlights.some(h => sameRef(h, ref))
  const glowFor = (ref: TargetRef): 'target' | 'attack' | 'none' => {
    if (!isHighlighted(ref)) return 'none'
    return selection?.kind === 'units' && ref.kind !== 'zone' ? 'attack' : 'target'
  }

  function clickTarget(ref: TargetRef) {
    if (!isHighlighted(ref) || !selection) return
    if (selection.kind === 'units') {
      if (ref.kind === 'zone') {
        sendAction({ type: 'move', unit: selection.ids[0], to: ref.zone })
      } else {
        sendAction({ type: 'attack', attackers: selection.ids, target: ref })
      }
      setSelection(null)
      return
    }
    if (selection.kind === 'targeting') {
      const collected = [...selection.collected, ref]
      const candidates = playActionsFor(selection.card).filter(a => {
        const t = a.targets ?? []
        return collected.every((c, i) => t[i] && sameRef(t[i], c))
      })
      const needed = candidates[0]?.targets?.length ?? collected.length
      if (collected.length >= needed) {
        sendAction({ type: 'play', card: selection.card, targets: collected })
        setSelection(null)
      } else {
        setSelection({ kind: 'targeting', card: selection.card, collected })
      }
    }
  }

  const setupN = (view?.actions.find(a => a.type === 'setupBank') as { cards?: string[] } | undefined)?.cards?.length ?? 2

  function clickHandCard(card: HandCardView) {
    if (!myWindow) return
    setConfirming(null)
    if (view!.phase === 'setup') {
      setSetupPicks(p => p.includes(card.id) ? p.filter(id => id !== card.id) : p.length < setupN ? [...p, card.id] : p)
      return
    }
    if (view!.phase === 'bank') {
      setSelection(selection?.kind === 'hand' && selection.id === card.id ? null : { kind: 'hand', id: card.id })
      return
    }
    const plays = playActionsFor(card.id)
    if (!plays.length) return
    setSelection(selection?.kind === 'hand' && selection.id === card.id ? null : { kind: 'hand', id: card.id })
  }

  function beginPlay(cardId: string) {
    const plays = playActionsFor(cardId)
    if (!plays.length) return
    const needsTargets = (plays[0].targets?.length ?? 0) > 0
    if (!needsTargets) {
      sendAction({ type: 'play', card: cardId })
      setSelection(null)
    } else {
      setSelection({ kind: 'targeting', card: cardId, collected: [] })
    }
  }

  const unitActionable = (unitId: string) =>
    actions.some(a => (a.type === 'move' && a.unit === unitId) || (a.type === 'attack' && a.attackers.includes(unitId)))

  /** Can `add` join the current attacker group? True iff a legal attack covers the whole group. */
  const attackerCanJoin = (ids: string[], add: string) => {
    const want = [...ids, add]
    return actions.some(a => a.type === 'attack' && want.every(id => a.attackers.includes(id)))
  }

  function clickMyUnit(unitId: string) {
    if (!myWindow || !unitActionable(unitId)) { setInspect({ kind: 'unit', id: unitId }); return }
    setSelection(prev => {
      if (prev?.kind === 'units') {
        if (prev.ids.includes(unitId)) {                       // tap again to drop it from the group
          const ids = prev.ids.filter(id => id !== unitId)
          return ids.length ? { kind: 'units', ids } : null
        }
        if (attackerCanJoin(prev.ids, unitId)) return { kind: 'units', ids: [...prev.ids, unitId] }
        return { kind: 'units', ids: [unitId] }                // can't group with the current pick — start fresh
      }
      return { kind: 'units', ids: [unitId] }
    })
  }

  const selectedHand = selection?.kind === 'hand' ? selection.id : null
  const targetingCard = selection?.kind === 'targeting'
    ? cardIndex[view.hand.find(h => h.id === selection.card)?.slug ?? ''] : null

  const phaseLabel = view.phase === 'setup' ? 'Setup'
    : view.phase === 'bank' ? 'Start of round'
    : view.phase === 'intercept' ? 'Intercept'
    : 'Actions'

  // intercept window: the declared attack the defender must answer (public info — shown to everyone)
  const pendingAttack = view.phase === 'intercept' ? view.pendingAttack : null
  const interceptMode = myWindow && view.phase === 'intercept'
  const interceptorIds = interceptMode ? actions.flatMap(a => (a.type === 'intercept' ? [a.unit] : [])) : []
  const unitName = (uid: string) => view.zones.flatMap(z => z.units).find(u => u.id === uid)?.name ?? 'a unit'
  const pendingText = pendingAttack ? {
    attackers: pendingAttack.attackers.map(unitName).join(', '),
    target: pendingAttack.target.kind === 'base'
      ? `${names[pendingAttack.target.seat]}'s base`
      : pendingAttack.target.kind === 'unit' ? unitName(pendingAttack.target.id) : 'the field',
  } : null

  const statusLine = view.winner !== null
    ? 'The battle is decided.'
    : spectating
      ? `${names[view.actorSeat]} is thinking…`
      : myWindow
        ? view.phase === 'setup'
          ? `Opening hand — pick ${setupN} cards to bank as your starting resources (${setupPicks.length}/${setupN}).`
          : view.phase === 'bank'
            ? 'Start of round — bank a card as a resource, or keep your hand.'
            : view.phase === 'intercept'
              ? 'Under attack — intercept with a ready defender, or let it through.'
              : 'Your action.'
        : view.outOfRound[seat]
          ? 'You claimed the initiative — resting until next round.'
          : `Waiting for ${names[view.actorSeat]}…`

  return (
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b hairline px-3 py-1.5 text-sm">
        <Link to="/" className="text-dim hover:text-body">← Lobby</Link>
        <span className="font-display text-parchment">{meta?.gameName}</span>
        <span className="text-xs text-dim">Round {view.round} · {phaseLabel}</span>
        <span className="text-xs text-goldbright/80" title="holds the initiative — acts first each round">⚑ {names[view.initiative]}</span>
        {spectators > 0 && <span className="text-xs text-dim">👁 {spectators}</span>}
        <span className={`ml-auto text-xs ${connected ? 'text-dim' : 'text-[#e5a99f]'}`}>{connected ? '' : 'reconnecting…'}</span>
        {spectating && <span className="rounded bg-raised px-2 py-0.5 text-xs text-dim">spectating</span>}
        <button className="btn !px-2.5 !py-0.5 text-xs" onClick={() => setShowHelp(true)} title="how to play">?</button>
      </div>

      {/* phones: plain block flow in the page scroll (bars scroll away); lg+: two-column grid */}
      <div className="min-h-0 flex-1 max-lg:overflow-visible lg:grid lg:grid-cols-[1fr_290px]">
        {/* ── board ── */}
        <div className="flex min-h-0 flex-col p-2">
          {/* their bar */}
          <PlayerBar
            name={names[foe]} life={their.life} handCount={their.handCount} deckCount={their.deckCount}
            discardCount={their.discard.length} resources={their.resources.filter(r => !r.exhausted).length}
            resourceTotal={their.resources.length}
            online={online[foe]} enemy
            baseGlow={isHighlighted({ kind: 'base', seat: foe }) || (view.phase === 'intercept' && pendingAttack?.target.kind === 'base' && pendingAttack.target.seat === foe)}
            onClick={() => clickTarget({ kind: 'base', seat: foe })}
            onPile={pile => setInspect({ kind: 'pile', seat: foe, pile })}
            onBase={() => setInspect({ kind: 'base', seat: foe })}
          />

          {/* zones */}
          <div className="relative my-1.5 grid gap-1.5 lg:min-h-0 lg:flex-1 lg:grid-rows-3">
            <EventTicker log={view.log} />
            {zonesTopToBottom.map(z => {
              const zoneRef: TargetRef = { kind: 'zone', zone: z }
              const zoneGlow = isHighlighted(zoneRef)
              const label = z === 1 ? 'Neutral' : z === (seat === 0 ? 0 : 2) ? 'Your Home' : 'Their Home'
              const units = view.zones[z].units
              return (
                <div
                  key={z}
                  onClick={() => zoneGlow && clickTarget(zoneRef)}
                  className={`panel relative flex min-h-[96px] items-center gap-1.5 overflow-x-auto px-2 py-1 ${zoneGlow ? 'zone-target cursor-pointer' : ''}`}
                >
                  <span className="pointer-events-none absolute left-2 top-1 text-[9px] uppercase tracking-widest text-dim/70">{label}</span>
                  <div className="mt-3 flex items-center gap-1.5">
                    {units.map(u => {
                      const ref: TargetRef = { kind: 'unit', id: u.id }
                      const mine = u.owner === seat
                      const canIntercept = interceptMode && interceptorIds.includes(u.id)
                      const glow: 'none' | 'selected' | 'target' | 'attack' = view.phase === 'intercept'
                        ? canIntercept ? 'selected'
                          : pendingAttack?.target.kind === 'unit' && pendingAttack.target.id === u.id ? 'target'
                          : pendingAttack?.attackers.includes(u.id) ? 'attack'
                          : 'none'
                        : selection?.kind === 'units' && selection.ids.includes(u.id) ? 'selected' : glowFor(ref)
                      return (
                        <UnitChip
                          key={u.id} unit={u} mine={mine} glow={glow}
                          actionable={mine && myWindow && view.phase === 'loop' && unitActionable(u.id)}
                          onLongPress={() => setInspect({ kind: 'unit', id: u.id })}
                          onClick={() => {
                            if (canIntercept) { sendAction({ type: 'intercept', unit: u.id }); return }
                            if (interceptMode) { setInspect({ kind: 'unit', id: u.id }); return }
                            if (isHighlighted(ref)) clickTarget(ref)
                            else if (mine) clickMyUnit(u.id)
                            else setInspect({ kind: 'unit', id: u.id })
                          }}
                        />
                      )
                    })}
                    {!units.length && <span className="text-xs text-dim/50">—</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* my bar */}
          {!spectating && (
            <PlayerBar
              name={names[seat]} life={my.life} handCount={my.handCount} deckCount={my.deckCount}
              discardCount={my.discard.length} resources={my.resources.filter(r => !r.exhausted).length}
              resourceTotal={my.resources.length}
              online baseGlow={isHighlighted({ kind: 'base', seat }) || (view.phase === 'intercept' && pendingAttack?.target.kind === 'base' && pendingAttack.target.seat === seat)}
              onClick={() => clickTarget({ kind: 'base', seat })}
              onPile={pile => setInspect({ kind: 'pile', seat, pile })}
              onBase={() => setInspect({ kind: 'base', seat })}
            />
          )}

          {/* hand */}
          {!spectating && (
            <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
              {[...view.hand].sort((a, b) => {
                const da = cardIndex[a.slug]; const db = cardIndex[b.slug]
                return (da?.cost ?? 0) - (db?.cost ?? 0) || (da?.type ?? '').localeCompare(db?.type ?? '') || (da?.name ?? '').localeCompare(db?.name ?? '')
              }).map(h => {
                const def = cardIndex[h.slug]
                if (!def) return null
                const canPlay = playActionsFor(h.id).length > 0
                const canResource = !!resourceActionFor(h.id)
                return (
                  <CardFrame
                    key={h.id} card={def} size="sm" sleeve="ivory"
                    selected={view.phase === 'setup' ? setupPicks.includes(h.id) : (selectedHand === h.id || (selection?.kind === 'targeting' && selection.card === h.id))}
                    stamp={view.phase === 'setup' && setupPicks.includes(h.id) ? 'Resource' : undefined}
                    dimmed={view.phase !== 'setup' && myWindow && !canPlay && !canResource}
                    onLongPress={() => setInspect({ kind: 'card', slug: h.slug })}
                    onClick={() => clickHandCard(h)}
                  />
                )
              })}
              {!view.hand.length && <span className="p-3 text-sm text-dim">Your hand is empty.</span>}
            </div>
          )}
        </div>

        {/* ── sidebar ── */}
        <div className="flex min-h-0 flex-col gap-2 border-t hairline p-2 lg:border-l lg:border-t-0">
          <div className="panel p-3">
            <div className="text-[10px] uppercase tracking-widest text-dim">Round {view.round} — {names[view.actorSeat]}&rsquo;s turn{view.outOfRound[seat] ? ' · you rest' : ''}</div>
            <div className={`mt-1 font-display text-parchment ${myWindow ? 'pulse-soft text-goldbright' : ''}`}>{statusLine}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {myWindow && view.phase === 'bank' && (
                <button className="btn !py-1 text-xs" onClick={() => sendAction({ type: 'skipResource' })}>Keep hand →</button>
              )}
              {myWindow && view.phase === 'loop' && (
                <button className="btn !py-1 text-xs" onClick={() => sendAction({ type: 'pass' })}>Pass</button>
              )}
              {myWindow && view.phase === 'loop' && actions.some(a => a.type === 'claimInitiative') && (
                <button className="btn !py-1 text-xs" title="take the initiative and rest — you act first next round"
                  onClick={() => sendAction({ type: 'claimInitiative' })}>Claim initiative ⚑</button>
              )}
              {!spectating && view.winner === null && (
                confirming === 'undo'
                  ? <button className="btn btn-danger !py-1 text-xs" onClick={() => { undo(); setConfirming(null) }}>Really rewind?</button>
                  : <button className="btn !py-1 text-xs" onClick={() => setConfirming('undo')}>Undo</button>
              )}
              {!spectating && view.winner === null && (
                confirming === 'concede'
                  ? <button className="btn btn-danger !py-1 text-xs" onClick={() => sendAction({ type: 'concede' })}>Really concede?</button>
                  : <button className="btn !py-1 text-xs" onClick={() => setConfirming('concede')}>Concede</button>
              )}
            </div>
            {view.phase === 'setup' && myWindow && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t hairline pt-2">
                <button
                  className="btn btn-primary !py-1 text-xs"
                  disabled={setupPicks.length !== setupN}
                  onClick={() => { sendAction({ type: 'setupBank', cards: setupPicks }); setSetupPicks([]) }}
                >
                  Bank these {setupN} ⬢
                </button>
                {view.actions.some(a => a.type === 'mulligan') && (
                  <button className="btn !py-1 text-xs" title="shuffle back and redraw one fewer card"
                    onClick={() => { setSetupPicks([]); sendAction({ type: 'mulligan' }) }}>
                    Mulligan ↻ (redraw {view.hand.length - 1})
                  </button>
                )}
                {setupPicks.length > 0 && <button className="btn !py-1 text-xs" onClick={() => setSetupPicks([])}>Clear</button>}
                <span className="text-[11px] text-dim">tap cards to choose ({setupPicks.length}/{setupN})</span>
              </div>
            )}
            {interceptMode && pendingText && (
              <div className="mt-2 flex flex-col gap-1.5 border-t hairline pt-2">
                <p className="text-xs text-[#e5a99f]">
                  <b className="text-parchment">{pendingText.attackers}</b> attack <b className="text-parchment">{pendingText.target}</b>.
                </p>
                <p className="text-[11px] text-dim">Tap a glowing defender to throw it in the way, or let the blow land.</p>
                <button className="btn btn-primary !py-1 self-start text-xs" onClick={() => sendAction({ type: 'declineIntercept' })}>Let it through →</button>
              </div>
            )}
            {selection?.kind === 'hand' && myWindow && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t hairline pt-2">
                {view.phase === 'loop' && playActionsFor(selection.id).length > 0 && (
                  <button className="btn btn-primary !py-1 text-xs" onClick={() => beginPlay(selection.id)}>
                    Play ({cardIndex[view.hand.find(h => h.id === selection.id)?.slug ?? '']?.cost ?? '?'})
                  </button>
                )}
                {view.phase === 'bank' && resourceActionFor(selection.id) && (
                  <button className="btn btn-primary !py-1 text-xs" onClick={() => { sendAction({ type: 'resource', card: selection.id }); setSelection(null) }}>
                    Bank as resource
                  </button>
                )}
                <button className="btn !py-1 text-xs" onClick={() => setSelection(null)}>Cancel</button>
              </div>
            )}
            {selection?.kind === 'targeting' && targetingCard && (
              <div className="mt-2 border-t hairline pt-2 text-xs text-goldbright">
                Choose {selection.collected.length > 0 ? 'the next' : 'a'} target for <b>{targetingCard.name}</b>…
                <button className="btn ml-2 !px-2 !py-0.5 text-[10px]" onClick={() => setSelection(null)}>cancel</button>
              </div>
            )}
            <p className="mt-2 border-t hairline pt-1.5 text-[10px] text-dim">tip: tap any unit, card, ♥ life, ⬢ resources, or ✕ discard to inspect it</p>
          </div>

          <InfluenceTrack
            influence={influenceMine}
            mine={view.thresholds[seat]}
            theirs={view.thresholds[foe]}
            myName={spectating ? names[0] : 'You'}
            theirName={spectating ? names[1] : names[foe]}
          />

          <div className="panel flex min-h-0 flex-1 flex-col p-0 max-lg:min-h-[200px]">
            <div className="border-b hairline px-3 py-1.5 text-[10px] uppercase tracking-widest text-dim">Chronicle</div>
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11.5px] leading-relaxed max-lg:max-h-[240px]">
              {view.log.map((l, i) => (
                <div key={i} className={l.msg.startsWith('—') ? 'mt-1.5 font-display text-goldbright/90' : 'text-body/85'}>
                  {l.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {inspect?.kind === 'unit' && (() => {
        const uv = view.zones.flatMap(z => z.units).find(x => x.id === inspect.id)
        if (!uv) return null
        return (
          <UnitInspector
            unit={uv}
            card={cardIndex[uv.slug]}
            upgradeCards={uv.upgrades.map(up => cardIndex[up.slug]).filter(Boolean)}
            onClose={() => setInspect(null)}
          />
        )
      })()}
      {inspect?.kind === 'base' && (() => {
        const s = inspect.seat
        const side = view.sides[s]
        const home = view.zones[s === 0 ? 0 : 2].units
        return (
          <BaseSheet
            name={names[s]}
            life={side.life}
            mine={s === seat}
            handCount={side.handCount}
            deckCount={side.deckCount}
            discardCount={side.discard.length}
            resourcesReady={side.resources.filter(r => !r.exhausted).length}
            resourcesTotal={side.resources.length}
            guards={home.filter(u => u.owner === s && u.keywords.some(k => k.startsWith('guard'))).length}
            invaders={home.filter(u => u.owner !== s).length}
            influence={s === 0 ? view.influence : -view.influence}
            onClose={() => setInspect(null)}
          />
        )
      })()}
      {inspect?.kind === 'card' && cardIndex[inspect.slug] && (
        <CardSheet card={cardIndex[inspect.slug]} onClose={() => setInspect(null)} />
      )}
      {inspect?.kind === 'pile' && (
        <PileSheet
          title={`${names[inspect.seat]} — ${inspect.pile === 'resources' ? 'banked resources' : 'discard pile'}`}
          note={inspect.pile === 'resources'
            ? 'Resources are banked face-up: public to both players. Exhausted ones refresh at the start of their owner\'s next round.'
            : 'Everything destroyed, spent, or discarded — public to both players.'}
          cards={(inspect.pile === 'resources'
            ? view.sides[inspect.seat].resources.map(r => cardIndex[r.slug])
            : view.sides[inspect.seat].discard.map(d => cardIndex[d.slug])
          ).filter(Boolean)}
          onClose={() => setInspect(null)}
        />
      )}

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-3 left-3 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`panel px-3 py-2 text-sm ${t.kind === 'error' ? 'text-[#e5a99f]' : 'text-body'}`}>{t.msg}</div>
        ))}
      </div>

      {/* game over */}
      {view.winner !== null && !overlayDismissed && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <div className="panel max-w-md p-8 text-center">
            <div className="text-4xl">{view.winReason === 'influence' ? '☯' : view.winReason === 'concede' ? '🏳' : '⚔'}</div>
            <h2 className="mt-3 font-display text-2xl font-bold text-parchment">{names[view.winner]} is victorious</h2>
            <p className="mt-2 text-sm text-dim">
              {view.winReason === 'life' && 'Their opponent’s life was reduced to nothing.'}
              {view.winReason === 'influence' && 'The influence of their cause became undeniable.'}
              {view.winReason === 'concede' && 'Their opponent yielded the field.'}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/" className="btn btn-primary">Return to the lobby</Link>
              <button className="btn" onClick={() => setOverlayDismissed(true)}>Study the board</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerBar({ name, life, handCount, deckCount, discardCount, resources, resourceTotal, online, enemy, baseGlow, onClick, onPile, onBase }: {
  name: string; life: number; handCount: number; deckCount: number; discardCount: number
  resources: number; resourceTotal?: number; online: boolean; enemy?: boolean; baseGlow: boolean
  onClick: () => void
  onPile: (pile: 'resources' | 'discard') => void
  onBase: () => void
}) {
  const lifeFlash = useValueFlash(life)
  const pileBtn = 'rounded px-1 py-0.5 text-xs text-dim hover:bg-raised hover:text-body cursor-pointer'
  return (
    <div
      onClick={baseGlow ? onClick : undefined}
      className={`panel flex items-center gap-3 px-3 py-1.5 ${baseGlow ? 'glow-attack cursor-pointer' : ''}`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-dim/40'}`} title={online ? 'connected' : 'away'} />
      <span className="min-w-0 truncate font-display font-semibold text-parchment">{name}</span>
      <button
        className={`rounded px-1 font-display text-xl font-bold hover:bg-raised ${lifeFlash || (life <= 5 ? 'text-[#e5735f]' : 'text-parchment')}`}
        title="This is the base — tap for details"
        onClick={e => { e.stopPropagation(); onBase() }}
      >♥ {life}</button>
      <button className={pileBtn} title="Banked resources — face-up, public. Tap to view."
        onClick={e => { e.stopPropagation(); onPile('resources') }}>
        ⬢ {resources}{resourceTotal !== undefined ? `/${resourceTotal}` : ''}
      </button>
      <span className="ml-auto flex items-center gap-2 text-xs text-dim">
        <span title="Cards in hand (hidden)">🂠 {handCount}</span>
        <span title="Cards left in deck">≣ {deckCount}</span>
        <button className={pileBtn} title="Discard pile — public. Tap to view."
          onClick={e => { e.stopPropagation(); onPile('discard') }}>
          ✕ {discardCount}
        </button>
        {enemy && baseGlow && <span className="text-[10px] uppercase tracking-widest text-[#e5735f]">strike the base!</span>}
      </span>
    </div>
  )
}
