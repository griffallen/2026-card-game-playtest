import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EngineError, POLICIES, applyAction, policyRngInit, viewFor,
  type GameAction, type GameState, type HandCardView, type Seat, type TargetRef, type ZoneId,
} from '@newgame/engine'
import { CardFrame } from '@ui/components/CardFrame.tsx'
import { HelpPanel } from '@ui/components/HelpPanel.tsx'
import { UnitChip } from '@ui/game/UnitChip.tsx'
import { InfluenceTrack } from '@ui/game/InfluenceTrack.tsx'
import { EventTicker, PileSheet, UnitInspector, useValueFlash } from '@ui/game/Sheets.tsx'
import { DEMO_CARDS, aiControls, newLocalGame, type DemoConfig } from './local.ts'

type Inspect =
  | { kind: 'unit'; id: string }
  | { kind: 'pile'; seat: Seat; pile: 'resources' | 'discard' }
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

interface HistoryEntry { seat: Seat; action: GameAction; rngAfter: number }

type Speed = 'slow' | 'normal' | 'fast'
const SPEED_MS: Record<Speed, number> = { slow: 1400, normal: 500, fast: 140 }

export function DemoTable({ config, onExit }: { config: DemoConfig; onExit: () => void }) {
  const [state, setState] = useState<GameState>(() => newLocalGame(config))
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [confirming, setConfirming] = useState<'concede' | null>(null)
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const [toast, setToast] = useState('')
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState<Speed>(config.mode === 'watch' ? 'normal' : 'fast')
  const [showHelp, setShowHelp] = useState(false)
  const [lethalPlay, setLethalPlay] = useState<{ card: string; cede: number } | null>(null)
  const [skipToMyTurn, setSkipToMyTurn] = useState(false)
  const [inspect, setInspect] = useState<Inspect>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Policy rng travels WITH the history (snapshot after every action), so stepping
  // backward and forward replays the exact same game — and matches the Simulator's
  // stream (shared policyRngInit), so a sim seed replays move-for-move here.
  const currentRng = history.length ? history[history.length - 1].rngAfter : policyRngInit(config.seed)

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
      setHistory(h => [...h, { seat: actor, action, rngAfter: currentRng }])
      setSelection(null)
    } catch (e) {
      setToast(e instanceof EngineError ? e.message : 'that was not allowed')
      setTimeout(() => setToast(''), 3500)
    }
  }

  function aiStep() {
    if (!aiWindow) return
    const policy = POLICIES[state.actorSeat === 0 ? config.policyA : config.policyB]
    const [action, nextRng] = policy(state, state.actorSeat, currentRng)
    const { state: next } = applyAction(state, action, state.actorSeat)
    setState(next)
    setHistory(h => [...h, { seat: state.actorSeat, action, rngAfter: nextRng }])
  }

  // AI driver (auto-play unless paused; Step ▸ drives it manually)
  useEffect(() => {
    if (!aiWindow || paused) return
    const t = setTimeout(aiStep, config.mode === 'watch' ? SPEED_MS[speed] : 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, aiWindow, paused, speed, config.mode])

  // Quality of life: when Pass is literally your only legal action (common during the
  // opponent's turn), take it automatically — there's no decision being removed.
  // "Skip to my turn" passes every off-turn window until the turn comes back.
  const onlyPass = myWindow && view.actions.length === 1 && view.actions[0].type === 'pass'
  const offTurn = myWindow && state.activeSeat !== seat
  useEffect(() => {
    if (state.activeSeat === seat) setSkipToMyTurn(false)
  }, [state.activeSeat, seat])
  useEffect(() => {
    if (!myWindow || config.mode === 'hotseat') return
    if (onlyPass || (skipToMyTurn && offTurn)) {
      const t = setTimeout(() => apply({ type: 'pass' }, seat), 450)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, myWindow, onlyPass, skipToMyTurn, offTurn, config.mode])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [view.log])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelection(null); setConfirming(null); setInspect(null); setLethalPlay(null) }
      if (config.mode === 'watch') {
        if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) }
        if (e.key === 'ArrowRight' && paused) { e.preventDefault(); aiStep() }
        if (e.key === 'ArrowLeft' && paused) { e.preventDefault(); rewind(1) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode, paused, state, history])

  /** Rewind n actions by replaying the prefix — deterministic thanks to per-entry rng snapshots. */
  function rewind(n: number) {
    const h = history.slice(0, Math.max(0, history.length - n))
    let s = newLocalGame(config)
    for (const entry of h) s = applyAction(s, entry.action, entry.seat).state
    setState(s)
    setHistory(h)
    setSelection(null)
    setOverlayDismissed(false)
  }

  function undo() {
    // rewind one HUMAN-visible step: drop trailing AI actions plus one more
    let n = 0
    while (n < history.length && aiControls(config, history[history.length - 1 - n].seat)) n++
    rewind(n + 1)
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

  function beginPlay(cardId: string, confirmedLethal = false) {
    const plays = playActionsFor(cardId)
    if (!plays.length) return
    // Safety rail: warn when a red Overextend play would hand the opponent the influence win
    const def = DEMO_CARDS[state.cardOf[cardId]]
    const cede = (def.onPlay ?? []).reduce((n, op) => (op.op === 'influence' && op.n < 0 ? n + op.n : n), 0)
    const influenceMineNow = seat === 0 ? state.influence : -state.influence
    if (!confirmedLethal && cede < 0 && influenceMineNow + cede <= -view.thresholds[foe]) {
      setLethalPlay({ card: cardId, cede: -cede })
      return
    }
    setLethalPlay(null)
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [] })
  }

  const unitActionable = (unitId: string) =>
    actions.some(a => (a.type === 'move' && a.unit === unitId) || (a.type === 'attack' && a.attacker === unitId))

  function clickMyUnit(unitId: string) {
    // no actions available (off-turn, exhausted, imprisoned…) → inspect instead of dead tap
    if (!myWindow || !unitActionable(unitId)) { setInspect({ kind: 'unit', id: unitId }); return }
    setSelection(selection?.kind === 'unit' && selection.id === unitId ? null : { kind: 'unit', id: unitId })
  }

  const zonesTopToBottom: ZoneId[] = seat === 0 ? [2, 1, 0] : [0, 1, 2]
  const my = view.sides[seat]
  const their = view.sides[foe]
  const names: [string, string] = [config.nameA, config.nameB]
  const influenceMine = seat === 0 ? view.influence : -view.influence
  const selectedHand = selection?.kind === 'hand' ? selection.id : null
  const targetingCard = selection?.kind === 'targeting' ? DEMO_CARDS[state.cardOf[selection.card]] : null

  // Selection controls render twice: in the sidebar (desktop) and a floating dock (phones,
  // where the sidebar sits below the fold and taps would otherwise appear to do nothing).
  const selectionControls = (selection || lethalPlay) && myWindow ? (
    <>
      {lethalPlay && (
        <div className="rounded-md border border-[#b23a2c] bg-[#b23a2c]/10 p-2 text-xs">
          <p className="text-[#e5a99f]">
            ⚠ <b>{DEMO_CARDS[state.cardOf[lethalPlay.card]]?.name}</b> cedes {lethalPlay.cede} influence — that
            puts {names[foe]} at their winning threshold. <b>This play loses you the game.</b>
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <button className="btn btn-danger !py-0.5 text-xs" onClick={() => beginPlay(lethalPlay.card, true)}>Play it anyway</button>
            <button className="btn !py-0.5 text-xs" onClick={() => setLethalPlay(null)}>Never mind</button>
          </div>
        </div>
      )}
      {selection?.kind === 'hand' && !lethalPlay && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="max-w-40 truncate text-xs text-dim">{DEMO_CARDS[state.cardOf[selection.id]]?.name}</span>
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
      {selection?.kind === 'unit' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-goldbright">Tap a glowing target: dashed zone = move · red glow = attack.</span>
          <button className="btn !py-1 text-xs" onClick={() => setInspect({ kind: 'unit', id: selection.id })}>ⓘ details</button>
          <button className="btn !py-1 text-xs" onClick={() => setSelection(null)}>Cancel</button>
        </div>
      )}
      {selection?.kind === 'targeting' && targetingCard && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
          <span>Choose {selection.collected.length > 0 ? 'the next' : 'a'} target for <b>{targetingCard.name}</b>…</span>
          <button className="btn !px-2 !py-0.5 text-[10px]" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}
    </>
  ) : null

  const statusLine = view.winner !== null
    ? 'The battle is decided.'
    : aiWindow
      ? `${names[view.actorSeat]} (AI) is thinking…`
      : skipToMyTurn && offTurn
        ? 'Passing through to your turn…'
        : config.mode === 'hotseat'
          ? `${names[seat]} — your window (screen follows the active seat)`
          : view.phase === 'resource' ? 'Bank a card as a resource, or keep your hand.' : 'Your action.'

  // Contextual guidance: say WHAT you can do right now, and why passes get forced.
  const hints: string[] = []
  if (myWindow) {
    const ready = my.resources.filter(r => !r.exhausted).length
    if (view.phase === 'resource') {
      hints.push(`Banking tucks a card away forever and pays +1 toward costs every turn — you'd have ${ready + 1} each turn after this. Most turns, bank.`)
    } else if (onlyPass) {
      hints.push(offTurn
        ? 'Nothing to respond with — on their turn you can only play cards, and none are affordable right now.'
        : 'No legal plays left: resources spent and every unit has acted. Pass to hand the window over.')
    } else {
      const playable = new Set(view.actions.filter(a => a.type === 'play').map(a => a.card)).size
      const attackers = new Set(view.actions.filter(a => a.type === 'attack').map(a => a.attacker)).size
      const movers = new Set(view.actions.filter(a => a.type === 'move').map(a => a.unit)).size
      const bits = [
        playable && `play ${playable} card${playable > 1 ? 's' : ''}`,
        attackers && `attack with ${attackers} unit${attackers > 1 ? 's' : ''}`,
        movers && `move ${movers} unit${movers > 1 ? 's' : ''}`,
      ].filter(Boolean)
      if (bits.length) hints.push(`Right now you can ${bits.join(' · ')} — or pass. ${ready} resource${ready === 1 ? '' : 's'} ready.`)
      if (offTurn) hints.push('Their turn: card plays only — attacks and moves wait for yours.')
    }
  }

  return (
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto">
      <div className="flex flex-wrap items-center gap-3 border-b hairline px-3 py-1.5 text-sm">
        <button className="text-dim hover:text-body" onClick={onExit}>← Setup</button>
        <span className="font-display text-parchment">{names[0]} vs {names[1]}</span>
        <span className="text-xs text-dim">Turn {view.turn} · {view.phase === 'resource' ? 'Resource step' : 'Main phase'} · seed {config.seed}</span>
        <span className="ml-auto flex gap-1.5">
          <button className="btn !px-2.5 !py-0.5 text-xs" onClick={() => setShowHelp(true)} title="how to play">?</button>
          <button className="btn !py-0.5 text-xs" onClick={copyChronicle}>Copy chronicle</button>
          <button className="btn !py-0.5 text-xs" onClick={exportGame}>Download game file</button>
        </span>
      </div>

      {/* phones: plain block flow in the page scroll (bars scroll away); lg+: two-column grid */}
      <div className="min-h-0 flex-1 max-lg:overflow-visible lg:grid lg:grid-cols-[1fr_290px]">
        <div className="flex min-h-0 flex-col p-2">
          <PlayerBar
            name={`${names[foe]}${aiControls(config, foe) ? ' 🤖' : ''}`} life={their.life} handCount={their.handCount}
            deckCount={their.deckCount} discardCount={their.discard.length}
            resources={their.resources.filter(r => !r.exhausted).length} resourceTotal={their.resources.length}
            baseGlow={isHighlighted({ kind: 'base', seat: foe })}
            onClick={() => clickTarget({ kind: 'base', seat: foe })}
            onPile={pile => setInspect({ kind: 'pile', seat: foe, pile })}
          />

          <div className="relative my-1.5 grid gap-1.5 lg:min-h-0 lg:flex-1 lg:grid-rows-3">
            <EventTicker log={view.log} />
            {zonesTopToBottom.map(z => {
              const zoneRef: TargetRef = { kind: 'zone', zone: z }
              const zoneGlow = isHighlighted(zoneRef)
              const label = z === 1 ? 'Neutral' : z === (seat === 0 ? 0 : 2) ? 'Your Home' : 'Their Home'
              const units = view.zones[z].units
              return (
                <div key={z} onClick={() => zoneGlow && clickTarget(zoneRef)}
                  className={`panel relative flex min-h-[96px] items-center gap-1.5 overflow-x-auto px-2 py-1 ${zoneGlow ? 'zone-target cursor-pointer' : ''}`}>
                  <span className="pointer-events-none absolute left-2 top-1 text-[9px] uppercase tracking-widest text-dim/70">{label}</span>
                  <div className="mt-3 flex items-center gap-1.5">
                    {units.map(u => {
                      const ref: TargetRef = { kind: 'unit', id: u.id }
                      const mine = u.owner === seat
                      const glow = selection?.kind === 'unit' && selection.id === u.id ? 'selected' : glowFor(ref)
                      return (
                        <UnitChip key={u.id} unit={u} mine={mine} glow={glow}
                          actionable={mine && myWindow && unitActionable(u.id)}
                          onClick={() => {
                            if (isHighlighted(ref)) clickTarget(ref)
                            else if (mine) clickMyUnit(u.id)
                            else setInspect({ kind: 'unit', id: u.id })
                          }} />
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
            onPile={pile => setInspect({ kind: 'pile', seat, pile })}
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

        <div className="flex min-h-0 flex-col gap-2 border-t hairline p-2 lg:border-l lg:border-t-0">
          <div className="panel p-3">
            <div className="text-[10px] uppercase tracking-widest text-dim">Turn {view.turn} — {names[view.activeSeat]}</div>
            <div className={`mt-1 font-display text-parchment ${myWindow && !skipToMyTurn ? 'pulse-soft text-goldbright' : ''}`}>{statusLine}</div>
            {hints.map((h, i) => <p key={i} className="mt-1.5 text-[11px] leading-relaxed text-dim">{h}</p>)}
            {selectionControls && <div className="mt-2 border-t hairline pt-2 max-lg:hidden">{selectionControls}</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {offTurn && !onlyPass && config.mode === 'vs-ai' && !skipToMyTurn && (
                <button className="btn !py-1 text-xs" onClick={() => setSkipToMyTurn(true)} title="auto-pass every response window until your turn starts">
                  Skip to my turn ⏭
                </button>
              )}
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
            {config.mode === 'watch' && (
              <div className="mt-2 border-t hairline pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button className="btn !py-1 text-xs" disabled={!paused || history.length === 0} onClick={() => rewind(1)} title="step back (←)">◂</button>
                  <button className={`btn !py-1 text-xs ${paused ? 'btn-primary' : ''}`} onClick={() => setPaused(p => !p)} title="space">
                    {paused ? '▶ Play' : '⏸ Pause'}
                  </button>
                  <button className="btn !py-1 text-xs" disabled={!paused || state.winner !== null} onClick={aiStep} title="step forward (→)">▸</button>
                  <select className="input !w-24 !py-1 text-xs" value={speed} onChange={e => setSpeed(e.target.value as Speed)} aria-label="playback speed">
                    <option value="slow">slow</option>
                    <option value="normal">normal</option>
                    <option value="fast">fast</option>
                  </select>
                  <span className="text-[10px] text-dim">action {history.length}</span>
                </div>
                <p className="mt-1.5 text-[10px] text-dim">space = pause · ←/→ = step while paused</p>
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

          <div className="panel flex min-h-0 flex-1 flex-col p-0 max-lg:min-h-[200px]">
            <div className="border-b hairline px-3 py-1.5 text-[10px] uppercase tracking-widest text-dim">Chronicle</div>
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11.5px] leading-relaxed max-lg:max-h-[240px]">
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

      {/* phones: selection controls float above the thumb instead of below the fold */}
      {selectionControls && (
        <div className="fixed inset-x-2 bottom-2 z-40 lg:hidden">
          <div className="panel p-2.5 shadow-2xl shadow-black/60">{selectionControls}</div>
        </div>
      )}

      {inspect?.kind === 'unit' && (() => {
        const uv = view.zones.flatMap(z => z.units).find(x => x.id === inspect.id)
        if (!uv) return null
        return (
          <UnitInspector
            unit={uv}
            card={DEMO_CARDS[uv.slug]}
            upgradeCards={uv.upgrades.map(up => DEMO_CARDS[up.slug]).filter(Boolean)}
            onClose={() => setInspect(null)}
          />
        )
      })()}
      {inspect?.kind === 'pile' && (
        <PileSheet
          title={`${names[inspect.seat]} — ${inspect.pile === 'resources' ? 'banked resources' : 'discard pile'}`}
          note={inspect.pile === 'resources'
            ? 'Resources are banked face-up: public to both players. Exhausted ones refresh at the start of their owner\'s turn.'
            : 'Everything destroyed, spent, or discarded — public to both players.'}
          cards={(inspect.pile === 'resources'
            ? view.sides[inspect.seat].resources.map(r => DEMO_CARDS[r.slug])
            : view.sides[inspect.seat].discard.map(d => DEMO_CARDS[d.slug])
          ).filter(Boolean)}
          onClose={() => setInspect(null)}
        />
      )}

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

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

function PlayerBar({ name, life, handCount, deckCount, discardCount, resources, resourceTotal, baseGlow, onClick, onPile }: {
  name: string; life: number; handCount: number; deckCount: number; discardCount: number
  resources: number; resourceTotal: number; baseGlow: boolean; onClick: () => void
  onPile: (pile: 'resources' | 'discard') => void
}) {
  const lifeFlash = useValueFlash(life)
  const pileBtn = 'rounded px-1 py-0.5 text-xs text-dim hover:bg-raised hover:text-body cursor-pointer'
  return (
    <div onClick={baseGlow ? onClick : undefined}
      className={`panel flex items-center gap-3 px-3 py-1.5 ${baseGlow ? 'glow-attack cursor-pointer' : ''}`}>
      <span className="min-w-0 truncate font-display font-semibold text-parchment">{name}</span>
      <span className={`font-display text-xl font-bold ${lifeFlash || (life <= 5 ? 'text-[#e5735f]' : 'text-parchment')}`}>♥ {life}</span>
      <button className={pileBtn} title="Banked resources — face-up, public to both players. Tap to view."
        onClick={e => { e.stopPropagation(); onPile('resources') }}>
        ⬢ {resources}/{resourceTotal}
      </button>
      <span className="ml-auto flex items-center gap-2 text-xs text-dim">
        <span title="Cards in hand (hidden)">🂠 {handCount}</span>
        <span title="Cards left in deck">≣ {deckCount}</span>
        <button className={pileBtn} title="Discard pile — public. Tap to view."
          onClick={e => { e.stopPropagation(); onPile('discard') }}>
          ✕ {discardCount}
        </button>
        {baseGlow && <span className="text-[10px] uppercase tracking-widest text-[#e5735f]">strike the base!</span>}
      </span>
    </div>
  )
}
