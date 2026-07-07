import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EngineError, applyAction, heuristicPolicy, viewFor,
  type GameAction, type GameState, type HandCardView, type Seat, type TargetRef, type ZoneId,
} from '@newgame/engine'
import { CardFrame } from '@ui/components/CardFrame.tsx'
import { UnitChip } from '@ui/game/UnitChip.tsx'
import { InfluenceTrack } from '@ui/game/InfluenceTrack.tsx'
import { DEMO_CARDS, aiControls, newLocalGame, type DemoConfig } from './local.ts'

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

interface HistoryEntry { seat: Seat; action: GameAction }

export function DemoTable({ config, onExit }: { config: DemoConfig; onExit: () => void }) {
  const [state, setState] = useState<GameState>(() => newLocalGame(config))
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [confirming, setConfirming] = useState<'concede' | null>(null)
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const [toast, setToast] = useState('')
  const aiRng = useRef((config.seed ^ 0x51ed2701) | 0)
  const logRef = useRef<HTMLDivElement>(null)

  // whose eyes: hotseat + watch follow the action window; vs-ai pins you to seat 0
  const viewerSeat: Seat = config.mode === 'vs-ai' ? 0 : state.actorSeat
  const view = useMemo(() => viewFor(state, viewerSeat), [state, viewerSeat])
  const seat = viewerSeat
  const foe = (1 - seat) as Seat
  const aiWindow = state.winner === null && aiControls(config, state.actorSeat)
  const myWindow = state.winner === null && !aiWindow && view.actorSeat === seat

  function apply(action: GameAction, actor: Seat) {
    try {
      const { state: next } = applyAction(state, action, actor)
      setState(next)
      setHistory(h => [...h, { seat: actor, action }])
      setSelection(null)
    } catch (e) {
      setToast(e instanceof EngineError ? e.message : 'that was not allowed')
      setTimeout(() => setToast(''), 3500)
    }
  }

  // AI driver
  useEffect(() => {
    if (!aiWindow) return
    const t = setTimeout(() => {
      const [action, nextRng] = heuristicPolicy(state, state.actorSeat, aiRng.current)
      aiRng.current = nextRng
      const { state: next } = applyAction(state, action, state.actorSeat)
      setState(next)
      setHistory(h => [...h, { seat: state.actorSeat, action }])
    }, config.mode === 'watch' ? 450 : 700)
    return () => clearTimeout(t)
  }, [state, aiWindow, config.mode])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [view.log])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelection(null); setConfirming(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function undo() {
    // rewind one HUMAN-visible step: drop trailing AI actions plus one more
    let h = [...history]
    while (h.length && aiControls(config, h[h.length - 1].seat) && config.mode !== 'watch') h.pop()
    h.pop()
    let s = newLocalGame(config)
    for (const entry of h) s = applyAction(s, entry.action, entry.seat).state
    aiRng.current = (config.seed ^ 0x51ed2701) | 0 // AI variety after undo is fine; determinism is per-run
    setState(s)
    setHistory(h)
    setSelection(null)
    setOverlayDismissed(false)
  }

  function exportGame() {
    const data = {
      exported: new Date().toISOString(),
      seed: config.seed,
      mode: config.mode,
      decks: { seat0: config.deckA, seat1: config.deckB },
      players: [config.nameA, config.nameB],
      result: state.winner !== null ? { winnerSeat: state.winner, winReason: state.winReason, turns: state.turn } : null,
      actions: history,
      chronicle: state.log.map(l => `[t${l.t}] ${l.msg}`),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `newgame-${config.seed}-turn${state.turn}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function copyChronicle() {
    await navigator.clipboard.writeText(state.log.map(l => `[t${l.t}] ${l.msg}`).join('\n'))
    setToast('chronicle copied — paste it anywhere')
    setTimeout(() => setToast(''), 2500)
  }

  // ── affordances (same model as the server table, sourced locally) ──
  const actions = view.actions
  const playActionsFor = (cardId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'play' }> => a.type === 'play' && a.card === cardId)
  const resourceActionFor = (cardId: string) => actions.find(a => a.type === 'resource' && a.card === cardId)

  const highlights: TargetRef[] = useMemo(() => {
    if (!myWindow || !selection) return []
    if (selection.kind === 'targeting') {
      const matching = playActionsFor(selection.card).filter(a =>
        selection.collected.every((c, i) => (a.targets ?? [])[i] && sameRef((a.targets ?? [])[i], c)))
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

  const isHighlighted = (ref: TargetRef) => highlights.some(h => sameRef(h, ref))
  const glowFor = (ref: TargetRef): 'target' | 'attack' | 'none' =>
    !isHighlighted(ref) ? 'none' : selection?.kind === 'unit' && ref.kind !== 'zone' ? 'attack' : 'target'

  function clickTarget(ref: TargetRef) {
    if (!isHighlighted(ref) || !selection) return
    if (selection.kind === 'unit') {
      if (ref.kind === 'zone') apply({ type: 'move', unit: selection.id, to: ref.zone }, seat)
      else apply({ type: 'attack', attacker: selection.id, target: ref }, seat)
      return
    }
    if (selection.kind === 'targeting') {
      const collected = [...selection.collected, ref]
      const candidates = playActionsFor(selection.card).filter(a =>
        collected.every((c, i) => (a.targets ?? [])[i] && sameRef((a.targets ?? [])[i], c)))
      const needed = candidates[0]?.targets?.length ?? collected.length
      if (collected.length >= needed) apply({ type: 'play', card: selection.card, targets: collected }, seat)
      else setSelection({ kind: 'targeting', card: selection.card, collected })
    }
  }

  function clickHandCard(card: HandCardView) {
    if (!myWindow) return
    setConfirming(null)
    setSelection(selection?.kind === 'hand' && selection.id === card.id ? null : { kind: 'hand', id: card.id })
  }

  function beginPlay(cardId: string) {
    const plays = playActionsFor(cardId)
    if (!plays.length) return
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [] })
  }

  function clickMyUnit(unitId: string) {
    if (!myWindow) return
    const usable = actions.some(a => (a.type === 'move' && a.unit === unitId) || (a.type === 'attack' && a.attacker === unitId))
    if (!usable) return
    setSelection(selection?.kind === 'unit' && selection.id === unitId ? null : { kind: 'unit', id: unitId })
  }

  const zonesTopToBottom: ZoneId[] = seat === 0 ? [2, 1, 0] : [0, 1, 2]
  const my = view.sides[seat]
  const their = view.sides[foe]
  const names: [string, string] = [config.nameA, config.nameB]
  const influenceMine = seat === 0 ? view.influence : -view.influence
  const selectedHand = selection?.kind === 'hand' ? selection.id : null
  const targetingCard = selection?.kind === 'targeting' ? DEMO_CARDS[state.cardOf[selection.card]] : null

  const statusLine = view.winner !== null
    ? 'The battle is decided.'
    : aiWindow
      ? `${names[view.actorSeat]} (AI) is thinking…`
      : config.mode === 'hotseat'
        ? `${names[seat]} — your window (screen follows the active seat)`
        : view.phase === 'resource' ? 'Bank a card as a resource, or keep your hand.' : 'Your action.'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b hairline px-3 py-1.5 text-sm">
        <button className="text-dim hover:text-body" onClick={onExit}>← Setup</button>
        <span className="font-display text-parchment">{names[0]} vs {names[1]}</span>
        <span className="text-xs text-dim">Turn {view.turn} · {view.phase === 'resource' ? 'Resource step' : 'Main phase'} · seed {config.seed}</span>
        <span className="ml-auto flex gap-1.5">
          <button className="btn !py-0.5 text-xs" onClick={copyChronicle}>Copy chronicle</button>
          <button className="btn !py-0.5 text-xs" onClick={exportGame}>Download game file</button>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_290px]">
        <div className="flex min-h-0 flex-col p-2">
          <PlayerBar
            name={`${names[foe]}${aiControls(config, foe) ? ' 🤖' : ''}`} life={their.life} handCount={their.handCount}
            deckCount={their.deckCount} discardCount={their.discard.length}
            resources={their.resources.filter(r => !r.exhausted).length} resourceTotal={their.resources.length}
            baseGlow={isHighlighted({ kind: 'base', seat: foe })}
            onClick={() => clickTarget({ kind: 'base', seat: foe })}
          />

          <div className="my-1.5 grid min-h-0 flex-1 grid-rows-3 gap-1.5">
            {zonesTopToBottom.map(z => {
              const zoneRef: TargetRef = { kind: 'zone', zone: z }
              const zoneGlow = isHighlighted(zoneRef)
              const label = z === 1 ? 'Neutral' : z === (seat === 0 ? 0 : 2) ? 'Your Home' : 'Their Home'
              const units = view.zones[z].units
              return (
                <div key={z} onClick={() => zoneGlow && clickTarget(zoneRef)}
                  className={`panel relative flex items-center gap-1.5 overflow-x-auto px-2 py-1 ${zoneGlow ? 'zone-target cursor-pointer' : ''}`}>
                  <span className="pointer-events-none absolute left-2 top-1 text-[9px] uppercase tracking-widest text-dim/70">{label}</span>
                  <div className="mt-3 flex items-center gap-1.5">
                    {units.map(u => {
                      const ref: TargetRef = { kind: 'unit', id: u.id }
                      const mine = u.owner === seat
                      const glow = selection?.kind === 'unit' && selection.id === u.id ? 'selected' : glowFor(ref)
                      return (
                        <UnitChip key={u.id} unit={u} mine={mine} glow={glow}
                          onClick={() => { if (isHighlighted(ref)) clickTarget(ref); else if (mine) clickMyUnit(u.id) }} />
                      )
                    })}
                    {!units.length && <span className="text-xs text-dim/50">—</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <PlayerBar
            name={`${names[seat]}${aiControls(config, seat) ? ' 🤖' : ''}`} life={my.life} handCount={my.handCount}
            deckCount={my.deckCount} discardCount={my.discard.length}
            resources={my.resources.filter(r => !r.exhausted).length} resourceTotal={my.resources.length}
            baseGlow={isHighlighted({ kind: 'base', seat })}
            onClick={() => clickTarget({ kind: 'base', seat })}
          />

          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
            {view.hand.map(h => {
              const def = DEMO_CARDS[h.slug]
              const canAct = playActionsFor(h.id).length > 0 || !!resourceActionFor(h.id)
              return (
                <CardFrame key={h.id} card={def} size="sm"
                  selected={selectedHand === h.id || (selection?.kind === 'targeting' && selection.card === h.id)}
                  dimmed={myWindow && !canAct}
                  onClick={() => clickHandCard(h)} />
              )
            })}
            {!view.hand.length && <span className="p-3 text-sm text-dim">Hand empty.</span>}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2 border-l hairline p-2">
          <div className="panel p-3">
            <div className="text-[10px] uppercase tracking-widest text-dim">Turn {view.turn} — {names[view.activeSeat]}</div>
            <div className={`mt-1 font-display text-parchment ${myWindow ? 'pulse-soft text-goldbright' : ''}`}>{statusLine}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {myWindow && view.phase === 'resource' && (
                <button className="btn !py-1 text-xs" onClick={() => apply({ type: 'skipResource' }, seat)}>Keep hand →</button>
              )}
              {myWindow && view.phase === 'main' && (
                <button className="btn !py-1 text-xs" onClick={() => apply({ type: 'pass' }, seat)}>Pass</button>
              )}
              {state.winner === null && history.length > 0 && config.mode !== 'watch' && (
                <button className="btn !py-1 text-xs" onClick={undo}>Undo</button>
              )}
              {state.winner === null && config.mode !== 'watch' && (
                confirming === 'concede'
                  ? <button className="btn btn-danger !py-1 text-xs" onClick={() => apply({ type: 'concede' }, seat)}>Really concede?</button>
                  : <button className="btn !py-1 text-xs" onClick={() => setConfirming('concede')}>Concede</button>
              )}
            </div>
            {selection?.kind === 'hand' && myWindow && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t hairline pt-2">
                {view.phase === 'main' && playActionsFor(selection.id).length > 0 && (
                  <button className="btn btn-primary !py-1 text-xs" onClick={() => beginPlay(selection.id)}>
                    Play ({DEMO_CARDS[state.cardOf[selection.id]]?.cost})
                  </button>
                )}
                {view.phase === 'resource' && resourceActionFor(selection.id) && (
                  <button className="btn btn-primary !py-1 text-xs" onClick={() => apply({ type: 'resource', card: selection.id }, seat)}>
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
          </div>

          <InfluenceTrack
            influence={influenceMine}
            mine={view.thresholds[seat]}
            theirs={view.thresholds[foe]}
            myName={config.mode === 'hotseat' || config.mode === 'watch' ? names[seat] : 'You'}
            theirName={names[foe]}
          />

          <div className="panel flex min-h-0 flex-1 flex-col p-0">
            <div className="border-b hairline px-3 py-1.5 text-[10px] uppercase tracking-widest text-dim">Chronicle</div>
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11.5px] leading-relaxed">
              {view.log.map((l, i) => (
                <div key={i} className={l.msg.startsWith('—') ? 'mt-1.5 font-display text-goldbright/90' : 'text-body/85'}>{l.msg}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-50">
          <div className="panel px-3 py-2 text-sm text-body">{toast}</div>
        </div>
      )}

      {view.winner !== null && !overlayDismissed && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <div className="panel max-w-md p-8 text-center">
            <div className="text-4xl">{view.winReason === 'influence' ? '☯' : view.winReason === 'concede' ? '🏳' : '⚔'}</div>
            <h2 className="mt-3 font-display text-2xl font-bold text-parchment">{names[view.winner]} is victorious</h2>
            <p className="mt-2 text-sm text-dim">Turn {view.turn} · {view.winReason} · seed {config.seed}</p>
            <div className="mt-6 flex justify-center gap-2">
              <button className="btn btn-primary" onClick={onExit}>New game</button>
              <button className="btn" onClick={exportGame}>Download game file</button>
              <button className="btn" onClick={() => setOverlayDismissed(true)}>Study the board</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerBar({ name, life, handCount, deckCount, discardCount, resources, resourceTotal, baseGlow, onClick }: {
  name: string; life: number; handCount: number; deckCount: number; discardCount: number
  resources: number; resourceTotal: number; baseGlow: boolean; onClick: () => void
}) {
  return (
    <div onClick={baseGlow ? onClick : undefined}
      className={`panel flex items-center gap-4 px-3 py-1.5 ${baseGlow ? 'glow-attack cursor-pointer' : ''}`}>
      <span className="min-w-0 truncate font-display font-semibold text-parchment">{name}</span>
      <span className={`font-display text-xl font-bold ${life <= 5 ? 'text-[#e5735f]' : 'text-parchment'}`}>♥ {life}</span>
      <span className="text-xs text-dim">⬢ {resources}/{resourceTotal}</span>
      <span className="ml-auto flex items-center gap-3 text-xs text-dim">
        <span title="Hand">🂠 {handCount}</span>
        <span title="Deck">≣ {deckCount}</span>
        <span title="Discard">✕ {discardCount}</span>
        {baseGlow && <span className="text-[10px] uppercase tracking-widest text-[#e5735f]">strike the base!</span>}
      </span>
    </div>
  )
}
