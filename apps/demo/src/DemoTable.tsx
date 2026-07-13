import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EngineError, POLICIES, applyAction, policyRngInit, viewFor,
  type GameAction, type GameState, type HandCardView, type Seat, type TargetRef, type ZoneId,
} from '@newgame/engine'
import { CardFrame } from '@ui/components/CardFrame.tsx'
import { HelpPanel } from '@ui/components/HelpPanel.tsx'
import { UnitChip } from '@ui/game/UnitChip.tsx'
import { InfluenceTrack } from '@ui/game/InfluenceTrack.tsx'
import { BaseSheet, CardSheet, EventTicker, PileSheet, UnitInspector, useValueFlash } from '@ui/game/Sheets.tsx'
import { sleeveFor } from '@ui/game/sleeves.ts'
import { DEMO_CARDS, aiControls, newLocalGame, type DemoConfig } from './local.ts'
import { setSound, sfx, soundOn } from './sound.ts'

const SFX_BY_ACTION: Partial<Record<GameAction['type'], 'play' | 'hit'>> = {
  play: 'play', activate: 'play', attachOrphan: 'play', resource: 'play',
  attack: 'hit', block: 'hit', intercept: 'hit',
}

type Inspect =
  | { kind: 'unit'; id: string }
  | { kind: 'card'; slug: string }
  | { kind: 'pile'; seat: Seat; pile: 'resources' | 'discard' }
  | { kind: 'base'; seat: Seat }
  | null

type Selection =
  | { kind: 'hand'; id: string }
  | { kind: 'unit'; ids: string[] }           // one or more attackers in a single zone (attack group)
  | { kind: 'targeting'; card: string; collected: TargetRef[]; mode?: number }
  | { kind: 'mode'; card: string }            // v3 modal cards: choosing which mode to play (#26)
  | { kind: 'sneaking'; unit: string }        // v3 Sneak: choosing the ability's target
  | { kind: 'orphan'; id: string }            // v3 salvage: choosing which unit picks the orphan up
  | null

/** Mobile browser chrome (Chrome's bottom bar, the keyboard) can overlay the layout
    viewport's bottom edge, burying fixed-bottom bars (Griff, issue #17). The visualViewport
    API reports the covered strip — lift the action bar by exactly that much. */
function useChromeSafeLift(): number {
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setLift(Math.max(0, document.documentElement.clientHeight - (vv.offsetTop + vv.height)))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return lift
}

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
  const [setupBottoms, setSetupBottoms] = useState<string[]>([])
  const [confirming, setConfirming] = useState<'concede' | 'pass' | null>(null)
  const [sound, setSoundState] = useState(soundOn())
  const [roundBanner, setRoundBanner] = useState<number | null>(null)
  const prevRound = useRef<number | null>(null)
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const [toast, setToast] = useState('')
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [showHelp, setShowHelp] = useState(false)
  const [lethalPlay, setLethalPlay] = useState<{ card: string; cede: number } | null>(null)
  const [skipToMyWindow, setSkipToMyWindow] = useState(false)
  const [inspect, setInspect] = useState<Inspect>(null)
  const [setupPicks, setSetupPicks] = useState<string[]>([])
  const [armOverextend, setArmOverextend] = useState(false)
  // #42: combat resolves inside ONE action — replay its event lines slowly enough to read
  const [recap, setRecap] = useState<{ msg: string }[]>([])
  const [recapShown, setRecapShown] = useState(0)
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
  const isIntercept = view.phase === 'intercept'
  const isBlock = view.phase === 'block'
  const [blockPairs, setBlockPairs] = useState<{ blocker: string; onto: string }[]>([])
  const chromeLift = useChromeSafeLift()

  // v2 windows are keyed off the legal-action list, not the phase name (bullet 2).
  const actions = view.actions
  const canBank = actions.some(a => a.type === 'skipResource')     // start-step bank window
  const canPass = actions.some(a => a.type === 'pass')
  const canClaim = actions.some(a => a.type === 'claimInitiative')

  const COMBAT_RE = /damage|destroyed|blocks|attacks|intercepts|retaliat|spill|captiv|captur|freed|suffers|overextend|onslaught|rage|falls/i
  function queueRecap(events: { msg: string }[]) {
    if (speed === 'fast') return                       // watching at speed — the log suffices
    const combat = events.filter(e => COMBAT_RE.test(e.msg))
    if (combat.length >= 2) { setRecap(combat); setRecapShown(1) }
  }

  function apply(action: GameAction, actor: Seat) {
    try {
      const { state: next, events } = applyAction(state, action, actor)
      setState(next)
      setHistory(h => [...h, { seat: actor, action, rngAfter: currentRng }])
      setSelection(null)
      if (action.type === 'block' || action.type === 'intercept') queueRecap(events)
      const s = SFX_BY_ACTION[action.type]
      if (s) sfx(s)
    } catch (e) {
      setToast(e instanceof EngineError ? e.message : 'that was not allowed')
      setTimeout(() => setToast(''), 3500)
      sfx('error')
    }
  }

  function aiStep() {
    if (!aiWindow) return
    const policy = POLICIES[state.actorSeat === 0 ? config.policyA : config.policyB]
    const [action, nextRng] = policy(state, state.actorSeat, currentRng)
    const { state: next, events } = applyAction(state, action, state.actorSeat)
    setState(next)
    setHistory(h => [...h, { seat: state.actorSeat, action, rngAfter: nextRng }])
    queueRecap(events)                                 // #42: let the human read what the AI did
    const s = SFX_BY_ACTION[action.type]
    if (s) sfx(s)
  }

  // AI driver (auto-play unless paused; Step ▸ drives it manually)
  useEffect(() => {
    if (!aiWindow || paused || recap.length > 0) return   // #42: hold the next AI move while a recap plays
    const t = setTimeout(aiStep, SPEED_MS[speed])   // #27: speed control applies to vs-AI too
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, aiWindow, paused, speed, config.mode, recap.length])

  // #42: the recap reveals one line at a time, lingers, then clears itself
  useEffect(() => {
    if (!recap.length) return
    if (recapShown < recap.length) {
      const t = setTimeout(() => setRecapShown(n => n + 1), speed === 'slow' ? 1300 : 900)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => { setRecap([]); setRecapShown(0) }, 1700)
    return () => clearTimeout(t)
  }, [recap, recapShown, speed])

  // Quality of life (bullet 6): auto-pass NOTHING by default. "Auto-pass empty windows" is opt-in,
  // meaningful only while you're still in the round, and only fires on windows whose sole legal
  // action is Pass — intercept windows are real decisions and are never auto-answered for a human.
  const onlyPass = myWindow && view.actions.length === 1 && view.actions[0].type === 'pass'
  useEffect(() => { setSkipToMyWindow(false) }, [view.round]) // re-arm each round
  useEffect(() => {
    if (config.mode === 'hotseat') return
    if (!myWindow || isIntercept || isBlock || view.outOfRound[seat]) return
    if (onlyPass && skipToMyWindow) {
      const t = setTimeout(() => apply({ type: 'pass' }, seat), 450)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onlyPass, skipToMyWindow, isIntercept, isBlock, config.mode])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [view.log])
  // #27: make round transitions impossible to miss — banner + chime (skipped on mount)
  useEffect(() => {
    if (prevRound.current !== null && view.round !== prevRound.current) {
      setRoundBanner(view.round)
      sfx('round')
      const t = setTimeout(() => setRoundBanner(null), 1900)
      prevRound.current = view.round
      return () => clearTimeout(t)
    }
    prevRound.current = view.round
  }, [view.round])
  useEffect(() => { if (state.winner !== null) sfx('win') }, [state.winner])
  useEffect(() => { setConfirming(null) }, [view.actorSeat, view.round])
  useEffect(() => { setSetupPicks([]) }, [view.actorSeat, view.phase])
  useEffect(() => { setArmOverextend(false) }, [selection?.kind === 'unit' ? selection.ids.join(',') : null])
  useEffect(() => { if (isIntercept) { setSelection(null); setArmOverextend(false) } }, [isIntercept]) // intercept has its own UI — drop any attack-group selection
  useEffect(() => { if (isBlock) setSelection(null); else setBlockPairs([]) }, [isBlock])
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
      result: state.winner !== null ? { winnerSeat: state.winner, winReason: state.winReason, rounds: state.round } : null,
      actions: history,
      chronicle: state.log.map(l => `[t${l.t}] ${l.msg}`),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `newgame-${config.seed}-round${state.round}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function copyChronicle() {
    await navigator.clipboard.writeText(state.log.map(l => `[t${l.t}] ${l.msg}`).join('\n'))
    setToast('chronicle copied — paste it anywhere')
    setTimeout(() => setToast(''), 2500)
  }

  // ── affordances (same model as the server table, sourced locally) ──
  const playActionsFor = (cardId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'play' }> => a.type === 'play' && a.card === cardId)
  const resourceActionFor = (cardId: string) => actions.find(a => a.type === 'resource' && a.card === cardId)
  const activateActionsFor = (unitId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'activate' }> => a.type === 'activate' && a.unit === unitId)
  const releaseActionFor = (unitId: string) => actions.find(a => a.type === 'releaseCaptive' && a.unit === unitId)
  const salvageActionsFor = (upgradeId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'attachOrphan' }> => a.type === 'attachOrphan' && a.upgrade === upgradeId)

  // ── unit lookups off the view (id → view / zone / display) ──
  const unitViewOf = (id: string) => view.zones.flatMap(z => z.units).find(u => u.id === id)
  const unitZone = (id: string): ZoneId | null => {
    for (const z of [0, 1, 2] as ZoneId[]) if (view.zones[z].units.some(u => u.id === id)) return z
    return null
  }
  const unitName = (id: string) => unitViewOf(id)?.name ?? DEMO_CARDS[state.cardOf[id]]?.name ?? 'a unit'
  const oeOf = (id: string) => {
    const kw = unitViewOf(id)?.keywords.find(k => k.startsWith('overextend'))
    return kw ? Number(kw.split(' ')[1] ?? 0) : null
  }
  const refName = (ref: TargetRef): string =>
    ref.kind === 'unit' ? unitName(ref.id)
      : ref.kind === 'base' ? `${names[ref.seat]}'s base`
        : ref.kind === 'zone' ? 'that zone' : 'an upgrade'

  // Interceptors offered this window come straight from the legal-action list (bullet 5).
  const blockerIds = useMemo(
    () => (isBlock && myWindow
      ? [...new Set(actions.flatMap(a => (a.type === 'block' && a.pairs.length === 1 ? [a.pairs[0].blocker] : [])))]
      : []),
    [actions, isBlock, myWindow])
  const toggleBlocker = (id: string) => {
    setBlockPairs(prev => {
      if (prev.some(p => p.blocker === id)) return prev.filter(p => p.blocker !== id)
      const attackers = (pendingAttack?.attackers ?? []).filter(a => view.zones.some(z => z.units.some(u => u.id === a)))
      if (!attackers.length) return prev
      const load = (a: string) => prev.filter(p => p.onto === a).length
      const onto = attackers.slice().sort((x, y) => load(x) - load(y))[0]
      return [...prev, { blocker: id, onto }]
    })
  }

  const interceptorIds = useMemo(
    () => (isIntercept && myWindow
      ? actions.flatMap(a => (a.type === 'intercept' ? [a.unit] : []))
      : []),
    [actions, isIntercept, myWindow],
  )

  const highlights: TargetRef[] = useMemo(() => {
    if (!myWindow || !selection) return []
    if (selection.kind === 'targeting') {
      const matching = playActionsFor(selection.card).filter(a =>
        (selection.mode === undefined || a.mode === selection.mode)
        && selection.collected.every((c, i) => (a.targets ?? [])[i] && sameRef((a.targets ?? [])[i], c)))
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
      // A single selected unit may also move; a multi-unit group can only attack.
      if (selection.ids.length === 1) {
        for (const a of actions) if (a.type === 'move' && a.unit === selection.ids[0]) refs.push({ kind: 'zone', zone: a.to })
      }
      // Highlight any target reachable by a legal attack whose attacker set ⊇ the current selection.
      for (const a of actions) {
        if (a.type === 'attack' && selection.ids.every(id => a.attackers.includes(id))) {
          if (!refs.some(r => sameRef(r, a.target))) refs.push(a.target)
        }
      }
      return refs
    }
    if (selection.kind === 'sneaking') {
      const refs: TargetRef[] = []
      for (const a of activateActionsFor(selection.unit)) {
        const ref = (a.targets ?? [])[0]
        if (ref && !refs.some(r => sameRef(r, ref))) refs.push(ref)
      }
      return refs
    }
    if (selection.kind === 'orphan') {
      return salvageActionsFor(selection.id).map(a => ({ kind: 'unit', id: a.unit }) as TargetRef)
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
      if (ref.kind === 'zone') {
        apply({ type: 'move', unit: selection.ids[0], to: ref.zone }, seat) // move is single-unit only
      } else {
        const oe = armOverextend ? selection.ids.filter(id => oeOf(id) !== null) : []
        apply({ type: 'attack', attackers: selection.ids, target: ref, ...(oe.length ? { overextend: oe } : {}) }, seat)
      }
      setArmOverextend(false)
      return
    }
    if (selection.kind === 'targeting') {
      const collected = [...selection.collected, ref]
      const candidates = playActionsFor(selection.card).filter(a =>
        (selection.mode === undefined || a.mode === selection.mode)
        && collected.every((c, i) => (a.targets ?? [])[i] && sameRef((a.targets ?? [])[i], c)))
      const needed = Math.max(collected.length, ...candidates.map(a => a.targets?.length ?? 0))
      if (collected.length >= needed)
        apply({ type: 'play', card: selection.card, targets: collected, ...(selection.mode !== undefined ? { mode: selection.mode } : {}) }, seat)
      else setSelection({ kind: 'targeting', card: selection.card, collected, mode: selection.mode })
      return
    }
    if (selection.kind === 'sneaking') {
      apply({ type: 'activate', unit: selection.unit, targets: [ref] }, seat)
      return
    }
    if (selection.kind === 'orphan' && ref.kind === 'unit') {
      apply({ type: 'attachOrphan', upgrade: selection.id, unit: ref.id }, seat)
    }
  }

  /** Why can't this hand card be played right now? null = it can. */
  function whyUnplayable(cardId: string): string | null {
    if (playActionsFor(cardId).length > 0 || resourceActionFor(cardId)) return null
    const def = DEMO_CARDS[state.cardOf[cardId]]
    if (!def) return null
    if (view.phase === 'bank') return 'already banked this round — one per round (skip to begin the round)'
    if (view.phase === 'intercept') return 'an attack is incoming — answer the intercept first'
    if (view.phase === 'block') return 'an attack is incoming — assign blockers or let it through'
    const ready = my.resources.filter(r => !r.exhausted).length
    if (def.cost > ready) return `costs ${def.cost}, you have ${ready} ready resource${ready === 1 ? '' : 's'}`
    if (def.type === 'upgrade') return 'needs one of your units in play to attach to'
    if (def.targets?.length) {
      const t = def.targets[0]
      const side = t.side === 'friendly' ? 'a friendly' : t.side === 'enemy' ? 'an enemy' : 'a'
      const what = t.t === 'upgrade' ? 'upgrade' : t.t === 'zone' ? 'zone' : 'unit'
      const extras = [t.withKw && `with ${t.withKw}`, t.mustBeDamaged && 'that is damaged', t.maxPower !== undefined && `with power ≤ ${t.maxPower}`]
        .filter(Boolean).join(', ')
      return `no legal target right now — needs ${side} ${what}${extras ? ` ${extras}` : ''}`
    }
    return 'not playable right now'
  }

  const setupN = state.rules.startingResources

  function clickHandCard(card: HandCardView) {
    if (!myWindow) { setInspect(null); setSelection(null); return }
    setConfirming(null)
    if (view.phase === 'setup') {
      const owed = state.rules.mulliganStyle === 'london' ? state.mulligans[seat] * state.rules.mulliganPenalty : 0
      if (owed > 0 && setupPicks.length === setupN && !setupPicks.includes(card.id)) {
        // banks chosen — the tap now picks the cards owed to the deck bottom (decision 58)
        setSetupBottoms(b => b.includes(card.id) ? b.filter(id => id !== card.id) : b.length < owed ? [...b, card.id] : b)
        return
      }
      setSetupPicks(p => {
        const next = p.includes(card.id) ? p.filter(id => id !== card.id) : p.length < setupN ? [...p, card.id] : p
        if (next.length < setupN) setSetupBottoms([])   // reopened the bank choice — bottoms reset
        return next
      })
      return
    }
    // second tap on the selected card deselects — playing/banking is ONLY the explicit button.
    // (tap-again-to-confirm shipped first and promptly ate a playtester's card: a habitual
    // double-click reads as one select + one confirm, so "let me look at this" became "banked forever".)
    if (selection?.kind === 'hand' && selection.id === card.id) {
      setSelection(null)
      return
    }
    setSelection({ kind: 'hand', id: card.id })
  }

  function beginPlay(cardId: string, confirmedLethal = false) {
    const plays = playActionsFor(cardId)
    if (!plays.length) return
    // Safety rail: warn when a play would cede enough influence to hand the opponent the win
    const def = DEMO_CARDS[state.cardOf[cardId]]
    const cede = (def.onPlay ?? []).reduce((n, op) => (op.op === 'influence' && op.n < 0 ? n + op.n : n), 0)
    const influenceMineNow = seat === 0 ? state.influence : -state.influence
    if (!confirmedLethal && cede < 0 && influenceMineNow + cede <= -view.thresholds[foe]) {
      setLethalPlay({ card: cardId, cede: -cede })
      return
    }
    setLethalPlay(null)
    // v3 modal cards (#26): more than one mode among the legal plays → the player picks first
    const modes = [...new Set(plays.map(p => p.mode).filter((m): m is number => m !== undefined))]
    if (modes.length > 1) { setSelection({ kind: 'mode', card: cardId }); return }
    const mode = plays[0].mode
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId, ...(mode !== undefined ? { mode } : {}) }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [], mode })
  }

  function pickMode(cardId: string, mode: number) {
    const plays = playActionsFor(cardId).filter(p => p.mode === mode)
    if (!plays.length) return
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId, mode }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [], mode })
  }

  const unitActionable = (unitId: string) =>
    actions.some(a => (a.type === 'move' && a.unit === unitId) || (a.type === 'attack' && a.attackers.includes(unitId))
      || (a.type === 'activate' && a.unit === unitId) || (a.type === 'releaseCaptive' && a.unit === unitId))
  const unitCanAttack = (unitId: string) =>
    actions.some(a => a.type === 'attack' && a.attackers.includes(unitId))

  function clickMyUnit(unitId: string) {
    // no actions available (exhausted, imprisoned, not your window…) → inspect instead of a dead tap
    if (!myWindow || !unitActionable(unitId)) { setInspect({ kind: 'unit', id: unitId }); return }
    setSelection(sel => {
      if (sel?.kind === 'unit') {
        if (sel.ids.includes(unitId)) {
          const rest = sel.ids.filter(id => id !== unitId) // tap a selected unit again → drop it
          return rest.length ? { kind: 'unit', ids: rest } : null
        }
        // Add to the attack group only if it shares the group's zone and can attack (bullet 4).
        const sameZone = unitZone(unitId) !== null && unitZone(unitId) === unitZone(sel.ids[0])
        if (sameZone && unitCanAttack(unitId) && unitCanAttack(sel.ids[0])) return { kind: 'unit', ids: [...sel.ids, unitId] }
        return { kind: 'unit', ids: [unitId] } // otherwise start a fresh selection
      }
      return { kind: 'unit', ids: [unitId] }
    })
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
  const canMulligan = view.actions.some(a => a.type === 'mulligan')
  const pendingAttack = view.pendingAttack
  const selectionControls = view.phase === 'setup' && myWindow ? (
    <div className="flex flex-wrap items-center gap-1.5">
      {(() => {
        const owed = state.rules.mulliganStyle === 'london' ? state.mulligans[seat] * state.rules.mulliganPenalty : 0
        return (
          <button
            className="btn btn-primary !py-1 text-xs"
            disabled={setupPicks.length !== setupN || setupBottoms.length !== owed}
            onClick={() => {
              apply({ type: 'setupBank', cards: setupPicks, ...(owed ? { bottom: setupBottoms } : {}) }, seat)
              setSetupPicks([]); setSetupBottoms([])
            }}
          >
            Bank these {setupN} ⬢{owed ? ` + bottom ${owed}` : ''}
          </button>
        )
      })()}
      {canMulligan && (
        <button className="btn !py-1 text-xs" title="shuffle back and redraw one fewer card — as often as you dare"
          onClick={() => { setSetupPicks([]); setSetupBottoms([]); apply({ type: 'mulligan' }, seat) }}>
          Mulligan ↻ ({state.rules.mulliganStyle === 'london' ? `redraw ${state.rules.startingHandSize}, owe ${(state.mulligans[seat] + 1) * state.rules.mulliganPenalty} to the bottom` : `redraw ${view.hand.length - 1}`})
        </button>
      )}
      {setupPicks.length > 0 && (
        <button className="btn !py-1 text-xs" onClick={() => { setSetupPicks([]); setSetupBottoms([]) }}>Clear</button>
      )}
      <span className="text-[12.5px] text-dim">
        {(() => {
          const owed = state.rules.mulliganStyle === 'london' ? state.mulligans[seat] * state.rules.mulliganPenalty : 0
          return owed > 0 && setupPicks.length === setupN
            ? `now tap ${owed} for the deck bottom (${setupBottoms.length}/${owed})`
            : `tap cards to bank (${setupPicks.length}/${setupN})`
        })()}
      </span>
    </div>
  ) : isBlock && myWindow ? (
    <div className="rounded-md border border-[#c98a27] bg-[#c98a27]/10 p-2 text-xs">
      <p className="text-goldbright">
        ⚔ <b>{pendingAttack ? pendingAttack.attackers.map(unitName).join(', ') : 'The enemy'}</b>{' '}
        attack{pendingAttack && pendingAttack.attackers.length === 1 ? 's' : ''}{' '}
        <b>{pendingAttack ? refName(pendingAttack.target) : 'you'}</b>. Assign blockers — gangs allowed; blocking exhausts (Guards stay ready).
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[12.5px] text-dim">Tap glowing units to toggle them in ({blockPairs.length} assigned).</span>
        <button className="btn !py-0.5 text-xs" onClick={() => apply({ type: 'block', pairs: blockPairs }, seat)}>
          {blockPairs.length ? `Block with ${blockPairs.length}` : 'Let it through'}
        </button>
      </div>
    </div>
  ) : isIntercept && myWindow ? (
    <div className="rounded-md border border-[#c98a27] bg-[#c98a27]/10 p-2 text-xs">
      <p className="text-goldbright">
        ⚔ <b>{pendingAttack ? pendingAttack.attackers.map(unitName).join(', ') : 'The enemy'}</b>{' '}
        attack{pendingAttack && pendingAttack.attackers.length === 1 ? 's' : ''}{' '}
        <b>{pendingAttack ? refName(pendingAttack.target) : 'you'}</b>. Throw a ready unit in the way, or let the blow land.
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[12.5px] text-dim">Tap a glowing unit to intercept{interceptorIds.length ? '' : ' — nothing eligible'}.</span>
        <button className="btn !py-0.5 text-xs" onClick={() => apply({ type: 'declineIntercept' }, seat)}>Let it through</button>
      </div>
    </div>
  ) : (selection || lethalPlay) && myWindow ? (
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
          {playActionsFor(selection.id).length > 0 && (
            <button className="btn btn-primary !py-1 text-xs" onClick={() => beginPlay(selection.id)}>
              Play ({DEMO_CARDS[state.cardOf[selection.id]]?.cost})
            </button>
          )}
          {resourceActionFor(selection.id) && (
            <button className="btn btn-primary !py-1 text-xs" onClick={() => apply({ type: 'resource', card: selection.id }, seat)}>
              Bank as resource
            </button>
          )}
          {whyUnplayable(selection.id) && (
            <span className="w-full text-[12.5px] text-[#e5a99f]">Can't play: {whyUnplayable(selection.id)}.</span>
          )}
          <button className="btn !py-1 text-xs" onClick={() => setInspect({ kind: 'card', slug: state.cardOf[selection.id] })}>ⓘ details</button>
          <button className="btn !py-1 text-xs" onClick={() => setSelection(null)}>Cancel</button>
        </div>
      )}
      {selection?.kind === 'unit' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-goldbright">
            {selection.ids.length > 1
              ? `${selection.ids.length} attackers chosen — tap another in this zone to add, or tap a red target to strike together.`
              : 'Tap a glowing target: dashed zone = move · red glow = attack. Tap another ready unit in this zone to attack together.'}
          </span>
          {selection.ids.length === 1 && unitViewOf(selection.ids[0])?.keywords.includes('cantAttack') && (
            <span className="w-full text-[12.5px] text-[#e5a99f]">
              ⊘ {unitName(selection.ids[0])} can't attack{(DEMO_CARDS[state.cardOf[selection.ids[0]]]?.kw ?? []).some(k => k.k === 'cantAttack')
                ? ' — its own card forbids it'
                : ' this round — an enemy effect disarmed it'}. It can still move and block.
            </span>
          )}
          {(() => {
            const oeUnits = selection.ids.filter(id => oeOf(id) !== null)
            if (!oeUnits.length) return null
            const label = oeUnits.length === 1 && selection.ids.length === 1
              ? `Overextend: +${oeOf(oeUnits[0])} power now, ${oeOf(oeUnits[0])} self-damage at end of round`
              : `Overextend ${oeUnits.length} of them: +power now, self-damage at end of round`
            return (
              <label className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs ${armOverextend ? 'border-[#e2583e] text-[#ff9a5e]' : 'hairline text-dim'}`}>
                <input type="checkbox" className="h-3.5 w-3.5 accent-[#e2583e]" checked={armOverextend} onChange={e => setArmOverextend(e.target.checked)} />
                {label}
              </label>
            )
          })()}
          {selection.ids.length === 1 && activateActionsFor(selection.ids[0]).length > 0 && (() => {
            const uid = selection.ids[0]
            const isSneak = !!DEMO_CARDS[state.cardOf[uid]]?.sneak
            const rn = unitViewOf(uid)?.keywords.find(k => k.startsWith('ranged'))?.split(' ')[1]
            return (
              <button className="btn btn-primary !py-1 text-xs" onClick={() => {
                const acts = activateActionsFor(uid)
                if (acts.some(a => !a.targets?.length)) apply({ type: 'activate', unit: uid }, seat)
                else setSelection({ kind: 'sneaking', unit: uid })
              }}>{isSneak ? '✦ Use Sneak' : `🏹 Volley${rn ? ` (${rn})` : ''}`}</button>
            )
          })()}
          {selection.ids.length === 1 && releaseActionFor(selection.ids[0]) && (
            <button className="btn btn-primary !py-1 text-xs"
              onClick={() => apply({ type: 'releaseCaptive', unit: selection.ids[0] }, seat)}>
              ⛓ Release {unitViewOf(selection.ids[0])?.captives[0]?.name ?? 'captive'}
            </button>
          )}
          {selection.ids.length === 1 && (
            <button className="btn !py-1 text-xs" onClick={() => setInspect({ kind: 'unit', id: selection.ids[0] })}>ⓘ details</button>
          )}
          <button className="btn !py-1 text-xs" onClick={() => setSelection(null)}>Cancel</button>
        </div>
      )}
      {selection?.kind === 'targeting' && targetingCard && (() => {
        const done = selection.collected.length > 0 && playActionsFor(selection.card).some(a =>
          (selection.mode === undefined || a.mode === selection.mode)
          && (a.targets?.length ?? 0) === selection.collected.length
          && selection.collected.every((t, i) => (a.targets ?? [])[i] && sameRef((a.targets ?? [])[i], t)))
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
            <span>Choose {selection.collected.length > 0 ? 'the next' : 'a'} target for <b>{targetingCard.name}</b>…</span>
            {done && (
              <button className="btn btn-primary !py-1 text-xs"
                onClick={() => apply({ type: 'play', card: selection.card, targets: selection.collected, ...(selection.mode !== undefined ? { mode: selection.mode } : {}) }, seat)}>
                ✓ Cast with {selection.collected.length} target{selection.collected.length > 1 ? 's' : ''}
              </button>
            )}
            <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
          </div>
        )
      })()}
      {selection?.kind === 'mode' && (() => {
        const def = DEMO_CARDS[state.cardOf[selection.card]]
        const modes = (def?.modes ?? []) as { label?: string; text?: string }[]
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-goldbright">Choose a mode for <b>{def?.name}</b>:</span>
            {modes.map((m, i) => {
              const legal = playActionsFor(selection.card).some(a => a.mode === i)
              // #43: the button carries its half of the card text — hover to read what each mode does
              return legal
                ? <button key={i} className="btn btn-primary !py-1 text-xs" title={m.text} onClick={() => pickMode(selection.card, i)}>{m.label ?? `Mode ${i + 1}`}</button>
                : <button key={i} className="btn !py-1 text-xs opacity-50" disabled title={m.text ? `${m.text} — no legal target right now` : 'no legal target right now'}>{m.label ?? `Mode ${i + 1}`}</button>
            })}
            <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
            {modes.some(m => m.text) && (
              <div className="w-full text-[11.5px] leading-snug text-dim">
                {modes.map((m, i) => m.text && <div key={i}><b className="text-body/90">{m.label ?? `Mode ${i + 1}`}:</b> {m.text}</div>)}
              </div>
            )}
          </div>
        )
      })()}
      {selection?.kind === 'sneaking' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
          <span>
            {DEMO_CARDS[state.cardOf[selection.unit]]?.sneak
              ? <>Choose a target for <b>{unitName(selection.unit)}</b>'s Sneak ability — using it exhausts (and reveals) the unit…</>
              : <>Choose a target for <b>{unitName(selection.unit)}</b>'s volley — any enemy unit, anywhere; the shot exhausts the archer…</>}
          </span>
          <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}
      {selection?.kind === 'orphan' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
          <span>Salvage <b>{DEMO_CARDS[state.cardOf[selection.id]]?.name}</b> — tap one of your glowing units in that zone (full cost and pips, as if played).</span>
          <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}
    </>
  ) : null

  const statusLine = view.winner !== null
    ? 'The battle is decided.'
    : aiWindow
      ? `${names[view.actorSeat]} (AI) is thinking…`
      : isIntercept
        ? 'Under attack — intercept, or let it land.'
        : view.phase === 'setup'
          ? `Opening hand — pick ${setupN} cards to bank as your starting resources (${setupPicks.length}/${setupN}).`
          : view.phase === 'bank'
            ? 'Start of round — bank a card as a resource, or skip.'
            : skipToMyWindow
              ? 'Passing through empty turns…'
              : config.mode === 'hotseat'
                ? `${names[seat]} — your turn (screen follows whoever acts)`
                : 'Your turn.'

  // Contextual guidance: say WHAT you can do right now.
  const hints: string[] = []
  if (myWindow) {
    const ready = my.resources.filter(r => !r.exhausted).length
    if (view.phase === 'setup') {
      hints.push('Banked cards become permanent resources (+1 to spend every round, forever) — but the cards themselves never come back. Most players bank what they least want to draw into.')
    } else if (view.phase === 'bank') {
      hints.push(`Banking tucks a card away forever and pays +1 toward costs every round — you'd have ${ready + 1} each round after this. Most rounds, bank.`)
    } else if (isIntercept) {
      hints.push('An attack is incoming. Intercepting redirects the whole blow onto one of your ready units (Guards stay ready; others exhaust). Let it through to take it on the declared target instead.')
    } else if (onlyPass) {
      hints.push('No legal plays left: resources spent and every unit has acted. Pass to hand the turn over — two passes in a row end the round.')
    } else {
      const playable = new Set(view.actions.filter(a => a.type === 'play').map(a => a.card)).size
      const attackers = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'attack' }> => a.type === 'attack').flatMap(a => a.attackers)).size
      const movers = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'move' }> => a.type === 'move').map(a => a.unit)).size
      const sneaks = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'activate' }> => a.type === 'activate').map(a => a.unit)).size
      const salvables = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'attachOrphan' }> => a.type === 'attachOrphan').map(a => a.upgrade)).size
      const captors = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'releaseCaptive' }> => a.type === 'releaseCaptive').map(a => a.unit)).size
      const bits = [
        playable && `play ${playable} card${playable > 1 ? 's' : ''}`,
        attackers && `attack with ${attackers} unit${attackers > 1 ? 's' : ''}`,
        movers && `move ${movers} unit${movers > 1 ? 's' : ''}`,
        sneaks && `use ${sneaks} Sneak abilit${sneaks > 1 ? 'ies' : 'y'}`,
        salvables && `salvage ${salvables} orphaned upgrade${salvables > 1 ? 's' : ''}`,
        captors && `release a captive`,
      ].filter(Boolean)
      if (bits.length) hints.push(`Right now you can ${bits.join(' · ')} — or pass. ${ready} resource${ready === 1 ? '' : 's'} ready.`)
      if (canClaim) hints.push('You can claim the initiative: it spends your round, but you act first next round (and locks the token to you).')
    }
  }

  return (
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto">
      <div className="flex flex-wrap items-center gap-3 border-b hairline px-3 py-1.5 text-sm">
        <button className="text-dim hover:text-body" onClick={onExit}>← Setup</button>
        <span className="font-display text-parchment">{names[0]} vs {names[1]}</span>
        <span className="text-xs text-dim">Round {view.round} · seed {config.seed}</span>
        <span className="text-xs text-goldbright" title="holds the initiative — acts first each round">⚑ {names[view.initiative]}</span>
        <span className="ml-auto flex gap-1.5">
          {config.mode === 'vs-ai' && (
            <select className="input !w-auto !py-0.5 text-xs" value={speed} onChange={e => setSpeed(e.target.value as Speed)} title="AI thinking speed" aria-label="AI speed">
              <option value="slow">🤖 slow</option>
              <option value="normal">🤖 normal</option>
              <option value="fast">🤖 fast</option>
            </select>
          )}
          <button className="btn !px-2.5 !py-0.5 text-xs" onClick={() => { setSound(!sound); setSoundState(!sound) }} title={sound ? 'sound on' : 'sound off'}>
            {sound ? '🔊' : '🔇'}
          </button>
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
            hasInitiative={view.initiative === foe} outOfRound={view.outOfRound[foe]}
            baseGlow={isHighlighted({ kind: 'base', seat: foe })}
            onClick={() => clickTarget({ kind: 'base', seat: foe })}
            onPile={pile => setInspect({ kind: 'pile', seat: foe, pile })}
            onBase={() => setInspect({ kind: 'base', seat: foe })}
          />

          <div className="relative my-1.5 grid gap-1.5 lg:min-h-0 lg:flex-1 lg:grid-rows-3">
            <EventTicker log={view.log} />
            {roundBanner !== null && (
              <div className="round-banner pointer-events-none absolute inset-x-0 top-1/3 z-40 text-center">
                <div className="inline-block rounded-lg border border-goldbright/40 bg-black/85 px-6 py-3 shadow-xl">
                  <div className="font-display text-2xl font-bold text-parchment">Round {roundBanner}</div>
                  <div className="mt-0.5 text-xs text-goldbright">⚑ {names[view.initiative]} leads</div>
                </div>
              </div>
            )}
            {recap.length > 0 && (
              <div className="absolute inset-x-0 top-[18%] z-40 flex justify-center">
                <div onClick={() => { setRecap([]); setRecapShown(0) }} title="tap to dismiss"
                  className="max-w-[520px] cursor-pointer rounded-lg border border-goldbright/30 bg-black/85 px-4 py-2.5 shadow-xl backdrop-blur">
                  <div className="mb-1 text-center text-[10px] uppercase tracking-[0.25em] text-goldbright/80">⚔ combat</div>
                  {recap.slice(0, recapShown).map((l, i) => (
                    <div key={i} className={`text-[13px] leading-relaxed ${i === recapShown - 1 ? 'text-parchment' : 'text-body/60'}`}>
                      {/destroyed|falls/i.test(l.msg) ? '☠' : /damage|suffers/i.test(l.msg) ? '💥' : '⚔'} {l.msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                      const isInterceptor = interceptorIds.includes(u.id)
                      const isBlocker = blockerIds.includes(u.id)
                      const glow = selection?.kind === 'unit' && selection.ids.includes(u.id) ? 'selected'
                        : isBlocker ? (blockPairs.some(p => p.blocker === u.id) ? 'selected' : 'target')
                          : isInterceptor ? 'target'
                            : glowFor(ref)
                      return (
                        <UnitChip key={u.id} unit={u} mine={mine} glow={glow}
                          actionable={mine && myWindow && unitActionable(u.id)}
                          onLongPress={() => setInspect({ kind: 'unit', id: u.id })}
                          onClick={() => {
                            if (isBlocker) { toggleBlocker(u.id); return }
                            if (isInterceptor) { apply({ type: 'intercept', unit: u.id }, seat); return }
                            if (isHighlighted(ref)) clickTarget(ref)
                            else if (mine) clickMyUnit(u.id)
                            else setInspect({ kind: 'unit', id: u.id })
                          }} />
                      )
                    })}
                    {view.zones[z].orphans.map(o => {
                      const salvages = myWindow ? salvageActionsFor(o.id) : []
                      const active = selection?.kind === 'orphan' && selection.id === o.id
                      return (
                        <button key={o.id}
                          className={`shrink-0 rounded-md border border-dashed px-1.5 py-1 text-left text-[10px] leading-tight ${active ? 'glow-selected border-goldbright text-goldbright' : salvages.length ? 'border-goldbright/60 text-goldbright hover:border-goldbright' : 'hairline text-dim'}`}
                          title={`${o.name} — an orphaned upgrade. Either player may salvage it onto their unit in this zone, paying its full cost and pips (decision 67).`}
                          onClick={e => {
                            e.stopPropagation()
                            if (salvages.length) setSelection(active ? null : { kind: 'orphan', id: o.id })
                            else setInspect({ kind: 'card', slug: o.slug })
                          }}>
                          ⬥ {o.name}
                          <span className="block text-[8.5px] uppercase tracking-wide opacity-70">orphaned</span>
                        </button>
                      )
                    })}
                    {!units.length && !view.zones[z].orphans.length && <span className="text-xs text-dim/50">—</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <PlayerBar
            name={`${names[seat]}${aiControls(config, seat) ? ' 🤖' : ''}`} life={my.life} handCount={my.handCount}
            deckCount={my.deckCount} discardCount={my.discard.length}
            resources={my.resources.filter(r => !r.exhausted).length} resourceTotal={my.resources.length}
            hasInitiative={view.initiative === seat} outOfRound={view.outOfRound[seat]}
            baseGlow={isHighlighted({ kind: 'base', seat })}
            onClick={() => clickTarget({ kind: 'base', seat })}
            onPile={pile => setInspect({ kind: 'pile', seat, pile })}
            onBase={() => setInspect({ kind: 'base', seat })}
          />

          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
            {[...view.hand].sort((a, b) => {
              const da = DEMO_CARDS[a.slug]; const db = DEMO_CARDS[b.slug]
              return (da?.cost ?? 0) - (db?.cost ?? 0) || (da?.type ?? '').localeCompare(db?.type ?? '') || (da?.name ?? '').localeCompare(db?.name ?? '')
            }).map(h => {
              const def = DEMO_CARDS[h.slug]
              const canAct = playActionsFor(h.id).length > 0 || !!resourceActionFor(h.id)
              return (
                <CardFrame key={h.id} card={def} size="sm" sleeve="ivory"
                  selected={view.phase === 'setup' ? setupPicks.includes(h.id) : (selectedHand === h.id || (selection?.kind === 'targeting' && selection.card === h.id))}
                  stamp={(view.phase === 'setup' && setupPicks.includes(h.id))
                    || (view.phase === 'bank' && selection?.kind === 'hand' && selection.id === h.id) ? 'Resource' : undefined}
                  badge={view.phase === 'setup' && setupBottoms.includes(h.id) ? '⤓ bottom' : undefined}
                  dimmed={view.phase !== 'setup' && myWindow && !canAct}
                  onLongPress={() => setInspect({ kind: 'card', slug: h.slug })}
                  onClick={() => clickHandCard(h)} />
              )
            })}
            {!view.hand.length && <span className="p-3 text-sm text-dim">Hand empty.</span>}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2 border-t hairline p-2 lg:border-l lg:border-t-0">
          <div className="panel p-3">
            <div className="text-[11.5px] uppercase tracking-widest text-dim">Round {view.round} — {names[view.actorSeat]}'s turn</div>
            <div className={`mt-1 font-display text-parchment ${myWindow && !skipToMyWindow ? 'pulse-soft text-goldbright' : ''}`}>{statusLine}</div>
            {hints.map((h, i) => <p key={i} className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{h}</p>)}
            {selectionControls && <div className="mt-2 border-t hairline pt-2 max-lg:hidden">{selectionControls}</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {config.mode === 'vs-ai' && myWindow && !isIntercept && !view.outOfRound[seat] && (
                skipToMyWindow
                  ? <button className="btn !py-1 text-xs" onClick={() => setSkipToMyWindow(false)} title="stop auto-passing">⏸ Stop auto-pass</button>
                  : onlyPass && <button className="btn !py-1 text-xs" onClick={() => setSkipToMyWindow(true)} title="auto-pass turns where you can only pass, until you have a real decision or the round ends">
                    Auto-pass empty turns ⏭
                  </button>
              )}
              {myWindow && canBank && (
                <button className="btn !py-1 text-xs" onClick={() => apply({ type: 'skipResource' }, seat)}>Skip banking →</button>
              )}
              {myWindow && canClaim && (
                <button className="btn btn-primary !py-1 text-xs" title="take the initiative token: ends your round, but you act first next round"
                  onClick={() => apply({ type: 'claimInitiative' }, seat)}>Claim initiative ⚑</button>
              )}
              {myWindow && canPass && (() => {
                // #27: a pass that ENDS the round with actions still on the table asks first
                const endsRound = state.passStreak >= 1 || view.outOfRound[foe]
                const readyLeft = view.zones.flatMap(z => z.units).filter(u => u.owner === seat && unitActionable(u.id)).length
                const playableLeft = new Set(actions.filter(a => a.type === 'play').map(a => a.card)).size
                const leftovers = readyLeft + playableLeft
                if (confirming === 'pass') {
                  const what = [
                    readyLeft && `${readyLeft} unit${readyLeft > 1 ? 's' : ''} can still act`,
                    playableLeft && `${playableLeft} card${playableLeft > 1 ? 's' : ''} playable`,
                  ].filter(Boolean).join(' · ')
                  return (
                    <>
                      <span className="w-full text-[12.5px] text-[#e5a99f]">Passing now <b>ends the round</b> — {what}.</span>
                      <button className="btn btn-danger !py-1 text-xs" onClick={() => { setConfirming(null); apply({ type: 'pass' }, seat) }}>End the round</button>
                      <button className="btn !py-1 text-xs" onClick={() => setConfirming(null)}>Keep playing</button>
                    </>
                  )
                }
                return (
                  <button className="btn !py-1 text-xs" onClick={() => {
                    if (endsRound && leftovers > 0) setConfirming('pass')
                    else apply({ type: 'pass' }, seat)
                  }}>Pass</button>
                )
              })()}
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
                  <span className="text-[11.5px] text-dim">action {history.length}</span>
                </div>
                <p className="mt-1.5 text-[11.5px] text-dim">space = pause · ←/→ = step while paused</p>
              </div>
            )}
            <p className="mt-2 border-t hairline pt-1.5 text-[11.5px] text-dim">tip: right-click or long-press any card or unit to inspect it — a plain tap selects/targets. ♥ life, ⬢ resources, ✕ discard open on tap.</p>
          </div>

          <InfluenceTrack
            influence={influenceMine}
            mine={view.thresholds[seat]}
            theirs={view.thresholds[foe]}
            myName={config.mode === 'hotseat' || config.mode === 'watch' ? names[seat] : 'You'}
            theirName={names[foe]}
          />

          <div className="panel flex min-h-0 flex-1 flex-col p-0 max-lg:min-h-[200px]">
            <div className="border-b hairline px-3 py-1.5 text-[11.5px] uppercase tracking-widest text-dim">Chronicle</div>
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

      {/* phones: selection controls float above the thumb instead of below the fold —
          lifted clear of browser chrome + gesture bar (issue #17) */}
      {selectionControls && (
        <div
          className="fixed inset-x-2 z-40 lg:hidden"
          style={{ bottom: `calc(0.5rem + ${chromeLift}px + env(safe-area-inset-bottom, 0px))` }}
        >
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
            sleeve={sleeveFor(uv.owner === seat)}
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
            guards={home.filter(u => u.owner === s && !u.imprisoned && u.keywords.some(k => k.startsWith('guard'))).length}
            invaders={home.filter(u => u.owner !== s).length}
            influence={s === 0 ? view.influence : -view.influence}
            onClose={() => setInspect(null)}
          />
        )
      })()}
      {inspect?.kind === 'card' && DEMO_CARDS[inspect.slug] && (
        <CardSheet card={DEMO_CARDS[inspect.slug]} sleeve="ivory" onClose={() => setInspect(null)} />
      )}
      {inspect?.kind === 'pile' && (
        <PileSheet
          title={`${names[inspect.seat]} — ${inspect.pile === 'resources' ? 'banked resources' : 'discard pile'}`}
          note={inspect.pile === 'resources'
            ? 'Resources are banked face-up: public to both players. Exhausted ones refresh at the start of their owner\'s next round.'
            : 'Everything destroyed, spent, or discarded — public to both players.'}
          cards={(inspect.pile === 'resources'
            ? view.sides[inspect.seat].resources.map(r => DEMO_CARDS[r.slug])
            : view.sides[inspect.seat].discard.map(d => DEMO_CARDS[d.slug])
          ).filter(Boolean)}
          sleeve={sleeveFor(inspect.seat === seat)}
          onClose={() => setInspect(null)}
        />
      )}

      {showHelp && <HelpPanel edition={state.rules.combatModel === 'blockerPairing' ? 'v3' : 'v2.3'} onClose={() => setShowHelp(false)} />}

      {view.winner !== null && !overlayDismissed && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <div className="panel max-w-md p-8 text-center">
            <div className="text-4xl">{view.winReason === 'influence' ? '☯' : view.winReason === 'concede' ? '🏳' : '⚔'}</div>
            <h2 className="mt-3 font-display text-2xl font-bold text-parchment">{names[view.winner]} is victorious</h2>
            <p className="mt-2 text-sm text-dim">Round {view.round} · {view.winReason} · seed {config.seed}</p>
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

function PlayerBar({ name, life, handCount, deckCount, discardCount, resources, resourceTotal, hasInitiative, outOfRound, baseGlow, onClick, onPile, onBase }: {
  name: string; life: number; handCount: number; deckCount: number; discardCount: number
  resources: number; resourceTotal: number; hasInitiative: boolean; outOfRound: boolean
  baseGlow: boolean; onClick: () => void
  onPile: (pile: 'resources' | 'discard') => void
  onBase: () => void
}) {
  const lifeFlash = useValueFlash(life)
  const pileBtn = 'rounded px-1 py-0.5 text-xs text-dim hover:bg-raised hover:text-body cursor-pointer'
  return (
    <div onClick={baseGlow ? onClick : undefined}
      className={`panel flex items-center gap-3 px-3 py-1.5 ${baseGlow ? 'glow-attack cursor-pointer' : ''}`}>
      <span className="min-w-0 truncate font-display font-semibold text-parchment">{name}</span>
      {hasInitiative && <span className="text-xs text-goldbright" title="holds the initiative">⚑</span>}
      {outOfRound && <span className="rounded bg-goldbright/15 px-1.5 py-0.5 text-[11.5px] uppercase tracking-wider text-goldbright/90" title="claimed the initiative — acts first next round">claimed — done this round</span>}
      <button
        className={`rounded px-1 font-display text-xl font-bold hover:bg-raised ${lifeFlash || (life <= 5 ? 'text-[#e5735f]' : 'text-parchment')}`}
        title="This is the base — tap for details"
        onClick={e => { e.stopPropagation(); onBase() }}
      >♥ {life}</button>
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
        {baseGlow && <span className="text-[11.5px] uppercase tracking-widest text-[#e5735f]">strike the base!</span>}
      </span>
    </div>
  )
}
