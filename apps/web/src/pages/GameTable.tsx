import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { GameAction, HandCardView, PlayerView, Seat, TargetRef, ZoneId } from '@newgame/engine'
import { useGameSocket } from '../game/useGameSocket.ts'
import { UnitChip } from '../game/UnitChip.tsx'
import { InfluenceTrack } from '../game/InfluenceTrack.tsx'
import { CardFrame, type CardLike } from '../components/CardFrame.tsx'
import { HelpPanel } from '../components/HelpPanel.tsx'
import { BaseSheet, EventTicker, PileSheet, UnitInspector, useValueFlash } from '../game/Sheets.tsx'
import { get } from '../api.ts'

type Inspect =
  | { kind: 'unit'; id: string }
  | { kind: 'pile'; seat: Seat; pile: 'resources' | 'discard' }
  | { kind: 'base'; seat: Seat }
  | null

type Selection =
  | { kind: 'hand'; id: string }
  | { kind: 'unit'; id: string }
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
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    get<{ cards: CardLike[] }>('/api/cards')
      .then(r => setCardIndex(Object.fromEntries(r.cards.map(c => [c.slug, c]))))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [view?.log])
  useEffect(() => { setSelection(null) }, [view?.actorSeat, view?.turn, view?.phase])
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
    if (selection.kind === 'unit') {
      const refs: TargetRef[] = []
      for (const a of actions) {
        if (a.type === 'move' && a.unit === selection.id) refs.push({ kind: 'zone', zone: a.to })
        if (a.type === 'attack' && a.attacker === selection.id) refs.push(a.target)
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
    return selection?.kind === 'unit' && ref.kind !== 'zone' ? 'attack' : 'target'
  }

  function clickTarget(ref: TargetRef) {
    if (!isHighlighted(ref) || !selection) return
    if (selection.kind === 'unit') {
      if (ref.kind === 'zone') sendAction({ type: 'move', unit: selection.id, to: ref.zone })
      else sendAction({ type: 'attack', attacker: selection.id, target: ref })
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

  function clickHandCard(card: HandCardView) {
    if (!myWindow) return
    setConfirming(null)
    if (view!.phase === 'resource') {
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
    actions.some(a => (a.type === 'move' && a.unit === unitId) || (a.type === 'attack' && a.attacker === unitId))

  function clickMyUnit(unitId: string) {
    if (!myWindow || !unitActionable(unitId)) { setInspect({ kind: 'unit', id: unitId }); return }
    setSelection(selection?.kind === 'unit' && selection.id === unitId ? null : { kind: 'unit', id: unitId })
  }

  const selectedHand = selection?.kind === 'hand' ? selection.id : null
  const targetingCard = selection?.kind === 'targeting'
    ? cardIndex[view.hand.find(h => h.id === selection.card)?.slug ?? ''] : null

  const phaseLabel = view.phase === 'resource' ? 'Resource step' : 'Main phase'
  const statusLine = view.winner !== null
    ? 'The battle is decided.'
    : spectating
      ? `${names[view.actorSeat]} is thinking…`
      : myWindow
        ? view.phase === 'resource' ? 'Bank a card as a resource, or keep your hand.' : 'Your action.'
        : `Waiting for ${names[view.actorSeat]}…`

  return (
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b hairline px-3 py-1.5 text-sm">
        <Link to="/" className="text-dim hover:text-body">← Lobby</Link>
        <span className="font-display text-parchment">{meta?.gameName}</span>
        <span className="text-xs text-dim">Turn {view.turn} · {phaseLabel}</span>
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
            baseGlow={isHighlighted({ kind: 'base', seat: foe })}
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
                      const glow = selection?.kind === 'unit' && selection.id === u.id ? 'selected' : glowFor(ref)
                      return (
                        <UnitChip
                          key={u.id} unit={u} mine={mine} glow={glow}
                          actionable={mine && myWindow && unitActionable(u.id)}
                          onClick={() => {
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
              online baseGlow={isHighlighted({ kind: 'base', seat })}
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
                    key={h.id} card={def} size="sm"
                    selected={selectedHand === h.id || (selection?.kind === 'targeting' && selection.card === h.id)}
                    dimmed={myWindow && !canPlay && !canResource}
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
            <div className="text-[10px] uppercase tracking-widest text-dim">Turn {view.turn} — {names[view.activeSeat]}</div>
            <div className={`mt-1 font-display text-parchment ${myWindow ? 'pulse-soft text-goldbright' : ''}`}>{statusLine}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {myWindow && view.phase === 'resource' && (
                <button className="btn !py-1 text-xs" onClick={() => sendAction({ type: 'skipResource' })}>Keep hand →</button>
              )}
              {myWindow && view.phase === 'main' && (
                <button className="btn !py-1 text-xs" onClick={() => sendAction({ type: 'pass' })}>Pass</button>
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
            {selection?.kind === 'hand' && myWindow && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t hairline pt-2">
                {view.phase === 'main' && playActionsFor(selection.id).length > 0 && (
                  <button className="btn btn-primary !py-1 text-xs" onClick={() => beginPlay(selection.id)}>
                    Play ({cardIndex[view.hand.find(h => h.id === selection.id)?.slug ?? '']?.cost ?? '?'})
                  </button>
                )}
                {view.phase === 'resource' && resourceActionFor(selection.id) && (
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
      {inspect?.kind === 'base' && (
        <BaseSheet
          name={names[inspect.seat]}
          life={view.sides[inspect.seat].life}
          mine={inspect.seat === seat}
          onClose={() => setInspect(null)}
        />
      )}
      {inspect?.kind === 'pile' && (
        <PileSheet
          title={`${names[inspect.seat]} — ${inspect.pile === 'resources' ? 'banked resources' : 'discard pile'}`}
          note={inspect.pile === 'resources'
            ? 'Resources are banked face-up: public to both players. Exhausted ones refresh at the start of their owner\'s turn.'
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
