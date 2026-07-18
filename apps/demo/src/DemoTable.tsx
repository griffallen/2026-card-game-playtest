import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EngineError, POLICIES, applyAction, policyRngInit, viewFor,
  type GameAction, type GameState, type HandCardView, type Seat, type TargetRef, type UnitView, type ZoneId,
} from '@newgame/engine'
import { CardFrame } from '@ui/components/CardFrame.tsx'
import { HelpPanel } from '@ui/components/HelpPanel.tsx'
import { UnitChip } from '@ui/game/UnitChip.tsx'
import { InfluenceTrack } from '@ui/game/InfluenceTrack.tsx'
import { BaseSheet, CardSheet, EventTicker, PileSheet, UnitInspector, useValueFlash } from '@ui/game/Sheets.tsx'
import { sleeveFor } from '@ui/game/sleeves.ts'
import { DEMO_CARDS, aiControls, newLocalGame, seatedDeckCards, type DemoConfig } from './local.ts'
import { allDecks } from './custom-decks.ts'
import { BlockModal } from './BlockModal.tsx'
import { composeCombatRecap } from './recap.ts'
import { CombatPreview, type PreviewTarget } from './CombatPreview.tsx'
import { setSound, sfx, soundOn } from './sound.ts'

const SFX_BY_ACTION: Partial<Record<GameAction['type'], 'play' | 'hit'>> = {
  play: 'play', activate: 'play', attachOrphan: 'play', passUpgrade: 'play', resource: 'play',
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
  | { kind: 'targeting'; card: string; collected: TargetRef[]; mode?: number; x?: number }
  | { kind: 'mode'; card: string }            // v3 modal cards: choosing which mode to play (#26)
  | { kind: 'x'; card: string }               // X-cost cards: declaring X before targeting (#45)
  | { kind: 'splash'; ids: string[]; target: TargetRef; picks: { by: string; unit: string }[]; oe: string[] }  // PR #46: skewer victims declared with the attack
  | { kind: 'sneaking'; unit: string }        // v3 Sneak: choosing the ability's target
  | { kind: 'censer'; unit: string }          // #104 (Censer of Purity): choosing the friendly unit to draw wounds from
  | { kind: 'censer-amount'; unit: string; target: TargetRef }  // #104: choosing how much damage moves (the amount picker)
  | { kind: 'orphan'; id: string }            // v3 salvage: choosing which unit picks the orphan up
  | { kind: 'passing'; upgrade: string }      // #86 (Resolve Banner): choosing which friendly unit to pass the banner to
  | { kind: 'entry-exhaust'; via: { play: string } | { unit: string; to: ZoneId }; targets: string[] }  // #104 (Lawbringer): a chosen-arrest unit entered a zone — pick which enemy in it to exhaust
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

export function DemoTable({ config, onExit, initialState }: { config: DemoConfig; onExit: () => void; initialState?: GameState }) {
  const [state, setState] = useState<GameState>(() => initialState ?? newLocalGame(config))
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
  // #42: combat resolves inside ONE action — replay its event lines slowly enough to read.
  // When something of YOURS leaves play, the recap holds until you acknowledge it (Griff).
  const [recap, setRecap] = useState<{ msg: string }[]>([])
  const [recapShown, setRecapShown] = useState(0)
  const [recapAck, setRecapAck] = useState(false)
  // #74 (Griff): a destroyed unit lingers and fades in its zone so the eye can catch the trade —
  // ~700ms, desaturate + slight shrink, plays UNDER the recap hold (no double-delay). Destroyed
  // only; captured units slide to the tray, a different motion. The win is on AI-unit deaths,
  // where nothing pauses today. Ratified on #74.
  type GhostUnit = ReturnType<typeof viewFor>['zones'][number]['units'][number]
  const [ghosts, setGhosts] = useState<{ key: string; zone: ZoneId; unit: GhostUnit; mine: boolean }[]>([])
  const ghostSeq = useRef(0)
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

  // #57 (Blaine): the recap is the primary source in a fast round — every consequence a card or
  // combat inflicts must pass this filter. Audited against the engine's full log vocabulary;
  // deliberately excluded: movement, draws, banking, round headers (visible on board / pure noise).
  const COMBAT_RE = /damage|destroyed|blocks|attacks|volleys|sneaks|intercepts|retaliat|spill|captiv|captur|released|freed|suffers|overextend|onslaught|rage|falls|fell|influence|absorbs|heals|cleansed|gains|gets \+|power|ordered down|readies|ready for|extra action|made whole|wards/i
  const BIG_RE = /destroyed|captures|released|freed|falls/i   // #44: one of these alone still deserves the stage
  // #100: a resolved duel gets narrated as a trade ("Berserker (3) ↔ Radiant Citadel (5): dealt 3,
  // took 5 — Berserker falls") so the human can read who hit whom, for how much each way, and who
  // died — in one glance. composeCombatRecap owns the reconstruction; if it can't (non-combat
  // action, an attack that only opened a block window), we fall back to the raw event filter.
  function queueRecap(events: { msg: string }[], prev: GameState, next: GameState, action: GameAction, mustAck = false) {
    if (speed === 'fast') return                       // watching at speed — the log suffices
    const trade = composeCombatRecap(prev, next, action, events, m => COMBAT_RE.test(m))
    if (trade) {                                       // a real fight always earns the stage
      setRecap(trade.map(msg => ({ msg })))
      setRecapShown(1)
      setRecapAck(mustAck)
      return
    }
    const combat = events.filter(e => COMBAT_RE.test(e.msg))
    if (mustAck || combat.length >= 2 || combat.some(e => BIG_RE.test(e.msg))) {
      setRecap(combat.length ? combat : events)
      setRecapShown(1)
      setRecapAck(mustAck)
    }
  }
  // #42 second pass: did the viewer lose a unit (destroyed OR captured) inside this action?
  const lostMine = (prev: GameState, next: GameState) =>
    config.mode === 'vs-ai' && Object.values(prev.units).some(u => u.owner === seat && !next.units[u.id])

  // #74: snapshot any unit that was on screen and is now DESTROYED (gone from units AND not a new
  // captive — captives move to the tray) so it can fade in place. Uses the viewer's prev view, so
  // only units the viewer could actually see fade; hidden units don't.
  function noteDeaths(prev: GameState, next: GameState) {
    const pv = viewFor(prev, seat)
    const dead = ([0, 1, 2] as ZoneId[]).flatMap(z => pv.zones[z].units
      .filter(vu => !next.units[vu.id] && !next.captives[vu.id])
      .map(vu => ({ key: `${vu.id}-${ghostSeq.current++}`, zone: z, unit: vu, mine: vu.owner === seat })))
    if (!dead.length) return
    setGhosts(g => [...g, ...dead])
    const keys = new Set(dead.map(d => d.key))
    setTimeout(() => setGhosts(g => g.filter(x => !keys.has(x.key))), 760)  // outlast the 700ms fade
  }

  function apply(action: GameAction, actor: Seat) {
    try {
      const { state: next, events } = applyAction(state, action, actor)
      noteKeptHand(next, actor, action, state)
      setState(next)
      noteDeaths(state, next)                            // #74: fade any unit that just died
      setHistory(h => [...h, { seat: actor, action, rngAfter: currentRng }])
      setSelection(null)
      // #100: recap defensive answers, and the attacker's own duels the moment they resolve (a lone
      // attack with no Guard settles inside this action — otherwise it opens a block window first).
      if (action.type === 'block' || action.type === 'intercept' || (action.type === 'attack' && !next.pendingAttack))
        queueRecap(events, state, next, action, lostMine(state, next))
      const s = SFX_BY_ACTION[action.type]
      if (s) sfx(s)
    } catch (e) {
      setToast(e instanceof EngineError ? e.message : 'that was not allowed')
      setTimeout(() => setToast(''), 3500)
      sfx('error')
    }
  }

  // #67 (Blaine): the chronicle doubles as bot-tuning telemetry — decision lines carry the
  // options that were on the table, human AND bot. Banks note the hand kept; block windows
  // note who could have blocked vs who was sent (the #68 investigation's exact question);
  // passes note what was passed up. Demo-only, non-hotseat; the AI never reads it; replays
  // rebuild without it.
  function noteKeptHand(next: GameState, actor: Seat, action: GameAction, prev: GameState) {
    if (config.mode === 'hotseat') return
    const note = (msg: string) => next.log.push({ t: next.round, seat: actor, msg })
    if (action.type === 'resource' || action.type === 'setupBank') {
      const kept = next.sides[actor].hand.map(id => DEMO_CARDS[next.cardOf[id]]?.name ?? '?')
      note(`  (kept in hand: ${kept.length ? kept.join(' · ') : 'nothing'})`)
    } else if (action.type === 'block') {
      const offered = [...new Set(viewFor(prev, actor).actions
        .flatMap(a => (a.type === 'block' ? a.pairs.map(pr => pr.blocker) : []))
        .map(id => DEMO_CARDS[prev.cardOf[id]]?.name ?? '?'))]
      const sent = action.pairs.map(pr => DEMO_CARDS[prev.cardOf[pr.blocker]]?.name ?? '?')
      if (offered.length) note(`  (could block with: ${offered.join(' · ')} — sent: ${sent.length ? sent.join(' · ') : 'none, let it through'})`)
    } else if (action.type === 'pass') {
      const acts = viewFor(prev, actor).actions
      const playable = new Set(acts.filter(a => a.type === 'play').map(a => a.card)).size
      const attackers = new Set(acts.filter(a => a.type === 'attack').flatMap(a => a.attackers)).size
      if (playable + attackers > 0) note(`  (passed with ${playable} playable card${playable === 1 ? '' : 's'}, ${attackers} ready attacker${attackers === 1 ? '' : 's'})`)
    }
  }

  function aiStep() {
    if (!aiWindow) return
    const policy = POLICIES[state.actorSeat === 0 ? config.policyA : config.policyB]
    const [action, nextRng] = policy(state, state.actorSeat, currentRng)
    const { state: next, events } = applyAction(state, action, state.actorSeat)
    noteKeptHand(next, state.actorSeat, action, state)
    setState(next)
    noteDeaths(state, next)                             // #74: fade the AI's kills (and its own dead)
    setHistory(h => [...h, { seat: state.actorSeat, action, rngAfter: nextRng }])
    queueRecap(events, state, next, action, lostMine(state, next))   // #42: let the human read what the AI did
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

  // #42: the recap reveals one line at a time, lingers, then clears itself — unless it holds
  // one of YOUR losses, in which case it waits for your acknowledgment (no timer)
  useEffect(() => {
    if (!recap.length) return
    if (recapShown < recap.length) {
      const t = setTimeout(() => setRecapShown(n => n + 1), speed === 'slow' ? 1400 : 1000)
      return () => clearTimeout(t)
    }
    if (recapAck) return                               // held for the human — Continue clears it
    const t = setTimeout(() => { setRecap([]); setRecapShown(0) }, 2000)
    return () => clearTimeout(t)
  }, [recap, recapShown, recapAck, speed])

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
    const log = state.log.map(l => `[t${l.t}] ${l.msg}`).join('\n')
    // #97 (Blaine): the chronicle carries everything AI-training needs to reproduce the game
    // exactly — a machine-readable replay block. seed + the two deck lists (resolved, so custom
    // decks travel too) + rules + EVERY action in order lets the analysis re-run the game and
    // fork it at any bot decision. The decision-option telemetry (#67) already rides in the log.
    const pool = allDecks()
    // Record the deck EXACTLY as createGame is seated with it — through seatedDeckCards, the same
    // resolver newLocalGame uses. Recording raw deckSlugs (unfiltered) let a saved deck that still
    // named a cut card (Doombringer, #111) travel two cards longer than it was played, which
    // reshuffled the replay and flipped its first player, so the corpus bounced the game (#98).
    const deckOf = (slug: string, name: string) => {
      const d = pool.find(x => x.slug === slug)
      return { name, slug, cards: d ? seatedDeckCards(d, name) : [] }
    }
    const replay = {
      seed: config.seed,
      rules: config.rulesVersion ?? 'v3.0',
      mulligan: !!config.londonMulligan,
      decks: { A: deckOf(config.deckA, config.nameA), B: deckOf(config.deckB, config.nameB) },
      policies: { A: config.policyA, B: config.policyB },
      actions: history.map(h => ({ s: h.seat, a: h.action })),
    }
    const text = `${log}\n\n---REPLAY (for AI analysis — issue #97)---\n\`\`\`json\n${JSON.stringify(replay)}\n\`\`\``
    await navigator.clipboard.writeText(text)
    setToast('chronicle + replay copied — paste it anywhere')
    setTimeout(() => setToast(''), 2500)
  }

  // ── affordances (same model as the server table, sourced locally) ──
  // #56: a count-N spec's targets are interchangeable — the enumerator emits each pair once
  // ([A,B], never [B,A]), so positional prefix-matching silently forecloses when the player
  // picks the later-ordered unit first. Interchangeable slots match as a SET instead.
  const interchangeableSlots = (cardId: string) => {
    const specs = DEMO_CARDS[state.cardOf[cardId]]?.targets ?? []
    return specs.length === 1 && (specs[0].count ?? 1) > 1
  }
  const targetsMatch = (a: { targets?: TargetRef[] }, collected: TargetRef[], inter: boolean) =>
    inter
      ? collected.every(t => (a.targets ?? []).some(x => sameRef(x, t)))
      : collected.every((t, i) => (a.targets ?? [])[i] && sameRef((a.targets ?? [])[i], t))

  const playActionsFor = (cardId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'play' }> => a.type === 'play' && a.card === cardId)
  const resourceActionFor = (cardId: string) => actions.find(a => a.type === 'resource' && a.card === cardId)
  const activateActionsFor = (unitId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'activate' }> => a.type === 'activate' && a.unit === unitId)
  const salvageActionsFor = (upgradeId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'attachOrphan' }> => a.type === 'attachOrphan' && a.upgrade === upgradeId)
  // #86 (Resolve Banner): the pass-as-action affordances for one attached upgrade
  const passActionsFor = (upgradeId: string) =>
    actions.filter((a): a is Extract<GameAction, { type: 'passUpgrade' }> => a.type === 'passUpgrade' && a.upgrade === upgradeId)

  // ── unit lookups off the view (id → view / zone / display) ──
  const unitViewOf = (id: string) => view.zones.flatMap(z => z.units).find(u => u.id === id)
  // #86 (Resolve Banner): upgrades on this unit that can be passed to a friendly unit right now
  const passableUpgradesOf = (unitId: string) =>
    (unitViewOf(unitId)?.upgrades ?? []).filter(up => passActionsFor(up.id).length > 0)
  const unitZone = (id: string): ZoneId | null => {
    for (const z of [0, 1, 2] as ZoneId[]) if (view.zones[z].units.some(u => u.id === id)) return z
    return null
  }
  const unitName = (id: string) => unitViewOf(id)?.name ?? DEMO_CARDS[state.cardOf[id]]?.name ?? 'a unit'
  const oeOf = (id: string) => {
    const kw = unitViewOf(id)?.keywords.find(k => k.startsWith('overextend'))
    return kw ? Number(kw.split(' ')[1] ?? 0) : null
  }
  // issue #61: per-seat sleeve picks from setup; defaults keep ivory-mine/gunmetal-theirs
  const sleeveOf = (owner: Seat) => config.sleeves?.[owner] ?? sleeveFor(owner === seat)
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
  // issue #58 (Griff): which attacker each ready blocker may legally cover, read straight off
  // the single-pair legal actions (so the duel law — lone attacker → Guards only — is honoured
  // without re-deriving it). The spatial block modal uses this to gate its drop slots.
  const blockAllowedOnto = useMemo(() => {
    const m = new Map<string, Set<string>>()
    if (isBlock && myWindow) for (const a of actions) {
      if (a.type === 'block' && a.pairs.length === 1) {
        const { blocker, onto } = a.pairs[0]
        if (!m.has(blocker)) m.set(blocker, new Set())
        m.get(blocker)!.add(onto)
      }
    }
    return m
  }, [actions, isBlock, myWindow])
  // start every block window with a clean assignment (the modal builds it up from empty)
  useEffect(() => { if (!(isBlock && myWindow)) setBlockPairs([]) }, [isBlock, myWindow])

  // issue #58 (Griff): the defender chooses who fights whom. A tap sends a blocker in
  // (onto the least-covered attacker); tapping it again cycles it to the next attacker;
  // cycling past the last pulls it back out. The banner names every pairing.
  const toggleBlocker = (id: string) => {
    setBlockPairs(prev => {
      const attackers = (pendingAttack?.attackers ?? []).filter(a => view.zones.some(z => z.units.some(u => u.id === a)))
      if (!attackers.length) return prev
      const mine = prev.find(p => p.blocker === id)
      if (mine) {
        const next = attackers.indexOf(mine.onto) + 1
        if (next >= attackers.length || attackers.length === 1) return prev.filter(p => p.blocker !== id)
        return prev.map(p => (p.blocker === id ? { blocker: id, onto: attackers[next] } : p))
      }
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
      const inter = interchangeableSlots(selection.card)
      const matching = playActionsFor(selection.card).filter(a =>
        (selection.mode === undefined || a.mode === selection.mode)
        && (selection.x === undefined || a.x === selection.x)
        && targetsMatch(a, selection.collected, inter))
      const idx = selection.collected.length
      const refs: TargetRef[] = []
      for (const a of matching) {
        const next = inter
          ? (a.targets ?? []).filter(t => !selection.collected.some(cc => sameRef(cc, t)))
          : [(a.targets ?? [])[idx]].filter(Boolean) as TargetRef[]
        for (const ref of next) if (!refs.some(r => sameRef(r, ref))) refs.push(ref)
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
    if (selection.kind === 'splash') {
      const current = splashersOf(selection.ids)[selection.picks.length]
      return splashCandidates(selection.target, current).map(id => ({ kind: 'unit', id }) as TargetRef)
    }
    if (selection.kind === 'sneaking' || selection.kind === 'censer') {
      // #104: the Censer's ability offers many actions per ally (one per amount) — highlight the
      // distinct friendly-unit targets; the amount picker follows once one is chosen.
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
    if (selection.kind === 'passing') {
      return passActionsFor(selection.upgrade).map(a => ({ kind: 'unit', id: a.unit }) as TargetRef)
    }
    if (selection.kind === 'entry-exhaust') {
      // #104 (Lawbringer): the eligible enemies to arrest, sourced from the legal play/move actions
      return selection.targets.map(id => ({ kind: 'unit', id }) as TargetRef)
    }
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, view, myWindow])

  const isHighlighted = (ref: TargetRef) => highlights.some(h => sameRef(h, ref))
  const glowFor = (ref: TargetRef): 'target' | 'attack' | 'none' =>
    !isHighlighted(ref) ? 'none' : (selection?.kind === 'unit' || selection?.kind === 'splash') && ref.kind !== 'zone' ? 'attack' : 'target'

  function clickTarget(ref: TargetRef) {
    if (!isHighlighted(ref) || !selection) return
    if (selection.kind === 'unit') {
      if (ref.kind === 'zone') {
        const unit = selection.ids[0] // move is single-unit only
        // #104 (Lawbringer): a march that arrests a CHOSEN enemy on arrival — the legal moves into
        // this zone carry one `exhaust` id per eligible enemy. Prompt to pick one (like Capture),
        // then move with that choice; a plain move when the zone holds no eligible enemy.
        const arrests = actions
          .filter((a): a is Extract<GameAction, { type: 'move' }> => a.type === 'move' && a.unit === unit && a.to === ref.zone)
          .map(a => a.exhaust).filter((e): e is string => e !== undefined)
        if (arrests.length) {
          setSelection({ kind: 'entry-exhaust', via: { unit, to: ref.zone }, targets: arrests })
          setArmOverextend(false)
          return
        }
        apply({ type: 'move', unit, to: ref.zone }, seat)
      } else {
        const oe = armOverextend ? selection.ids.filter(id => oeOf(id) !== null) : []
        // PR #46: a skewer-carrying attacker declares its victim before the attack is submitted
        if (ref.kind === 'unit' && splashersOf(selection.ids).some(sid => splashCandidates(ref, sid).length)) {
          setSelection({ kind: 'splash', ids: selection.ids, target: ref, picks: [], oe })
          setArmOverextend(false)
          return
        }
        apply({ type: 'attack', attackers: selection.ids, target: ref, ...(oe.length ? { overextend: oe } : {}) }, seat)
      }
      setArmOverextend(false)
      return
    }
    if (selection.kind === 'splash' && ref.kind === 'unit') {
      const splashers = splashersOf(selection.ids)
      const picks = [...selection.picks, { by: splashers[selection.picks.length], unit: ref.id }]
      if (picks.length >= splashers.length) {
        apply({ type: 'attack', attackers: selection.ids, target: selection.target, splash: picks,
          ...(selection.oe.length ? { overextend: selection.oe } : {}) }, seat)
      } else setSelection({ ...selection, picks })
      return
    }
    if (selection.kind === 'targeting') {
      const collected = [...selection.collected, ref]
      const inter = interchangeableSlots(selection.card)
      const forCard = playActionsFor(selection.card).filter(a =>
        (selection.mode === undefined || a.mode === selection.mode)
        && (selection.x === undefined || a.x === selection.x))
      const candidates = forCard.filter(a => targetsMatch(a, collected, inter))
      // #56: never silently fire while the CARD could take more targets — even if THIS pick
      // foreclosed the pair (wrong zone), the player confirms via ✓ Cast instead
      const cardMax = Math.max(collected.length, ...forCard.map(a => a.targets?.length ?? 0))
      if (collected.length >= cardMax)
        apply({ type: 'play', card: selection.card, targets: collected, ...(selection.mode !== undefined ? { mode: selection.mode } : {}), ...(selection.x !== undefined ? { x: selection.x } : {}) }, seat)
      else setSelection({ kind: 'targeting', card: selection.card, collected, mode: selection.mode, x: selection.x })
      return
    }
    if (selection.kind === 'sneaking') {
      apply({ type: 'activate', unit: selection.unit, targets: [ref] }, seat)
      return
    }
    if (selection.kind === 'censer' && ref.kind === 'unit') {
      // #104: ally chosen — now the number buttons appear (the Pay-X-cost affordance) to pick how much moves
      setSelection({ kind: 'censer-amount', unit: selection.unit, target: ref })
      return
    }
    if (selection.kind === 'orphan' && ref.kind === 'unit') {
      apply({ type: 'attachOrphan', upgrade: selection.id, unit: ref.id }, seat)
    }
    if (selection.kind === 'passing' && ref.kind === 'unit') {
      apply({ type: 'passUpgrade', upgrade: selection.upgrade, unit: ref.id }, seat)
    }
    if (selection.kind === 'entry-exhaust' && ref.kind === 'unit') {
      // #104 (Lawbringer): the chosen enemy — dispatch the deferred play/move carrying the arrest
      const via = selection.via
      if ('play' in via) apply({ type: 'play', card: via.play, exhaust: ref.id }, seat)
      else apply({ type: 'move', unit: via.unit, to: via.to, exhaust: ref.id }, seat)
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
    // X-cost cards (#45): declare X first, then target
    if (def.xCost) { setSelection({ kind: 'x', card: cardId }); return }
    const mode = plays[0].mode
    // #104 (Lawbringer): the deploy arrests a CHOSEN enemy in its Home — the legal plays carry one
    // `exhaust` id per eligible enemy standing there. Prompt to pick one (like Capture), then play
    // with that choice; a plain play when the Home holds no eligible enemy.
    const arrests = plays.map(p => p.exhaust).filter((e): e is string => e !== undefined)
    if (arrests.length) { setSelection({ kind: 'entry-exhaust', via: { play: cardId }, targets: arrests }); return }
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId, ...(mode !== undefined ? { mode } : {}) }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [], mode })
  }

  // Blaine: Enter should also confirm the opening bank — shared by the button and the key
  const trySetupBank = () => {
    if (view.phase !== 'setup' || !myWindow) return
    const owed = state.rules.mulliganStyle === 'london' ? state.mulligans[seat] * state.rules.mulliganPenalty : 0
    if (setupPicks.length !== setupN || setupBottoms.length !== owed) return
    apply({ type: 'setupBank', cards: setupPicks, ...(owed ? { bottom: setupBottoms } : {}) }, seat)
    setSetupPicks([]); setSetupBottoms([])
  }

  // #27's confirmation rail, shared by the Pass button and the P hotkey: a pass that ends
  // the round with actions still on the table asks first.
  const tryPass = () => {
    if (!myWindow || !canPass) return
    const endsRound = state.passStreak >= 1 || view.outOfRound[foe]
    const readyLeft = view.zones.flatMap(z => z.units).filter(u => u.owner === seat && unitActionable(u.id)).length
    const playableLeft = new Set(actions.filter(a => a.type === 'play').map(a => a.card)).size
    if (endsRound && readyLeft + playableLeft > 0) setConfirming('pass')
    else apply({ type: 'pass' }, seat)
  }

  // #57 (Blaine, then Griff): confirm without the cross-screen mouse trip — Enter fires the
  // selected hand card's one obvious action (Play, or Bank during the bank step), P passes,
  // Esc backs out of whatever is open. The dangerous confirmations stay click-only: a reflex
  // keystroke must never be the one that ends the round by surprise or loses the game.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandler.current = e => {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'Escape') {
      if (inspect) { setInspect(null); return }
      setLethalPlay(null); setConfirming(null); setSelection(null)
      return
    }
    if (e.repeat) return
    if (!myWindow || lethalPlay) return
    if (view.phase === 'setup') {
      if (e.key === 'Enter') { e.preventDefault(); trySetupBank() }
      return
    }
    if ((e.key === 'p' || e.key === 'P') && !selection && confirming === null) {
      tryPass()
      return
    }
    if (e.key !== 'Enter') return
    if (selection?.kind === 'hand') {
      e.preventDefault()
      if (playActionsFor(selection.id).length > 0) beginPlay(selection.id)
      else if (resourceActionFor(selection.id)) apply({ type: 'resource', card: selection.id }, seat)
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  function pickMode(cardId: string, mode: number) {
    const plays = playActionsFor(cardId).filter(p => p.mode === mode)
    if (!plays.length) return
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId, mode }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [], mode })
  }

  function pickX(cardId: string, x: number) {
    const plays = playActionsFor(cardId).filter(p => p.x === x)
    if (!plays.length) return
    if ((plays[0].targets?.length ?? 0) === 0) apply({ type: 'play', card: cardId, x }, seat)
    else setSelection({ kind: 'targeting', card: cardId, collected: [], x })
  }

  // PR #46 (splashReap): attackers whose trigger wants a declared victim, and the legal victims
  const splashersOf = (ids: string[]) =>
    ids.filter(id => (DEMO_CARDS[state.cardOf[id]]?.onAttack ?? []).some(o => o.op === 'splashReap'))
  const splashCandidates = (targetRef: TargetRef, splasher?: string): string[] => {
    if (targetRef.kind !== 'unit') return []
    const tgt = view.zones.flatMap(z => z.units).find(u => u.id === targetRef.id)
    if (!tgt) return []
    return view.zones[tgt.zone].units
      .filter(u => u.id !== tgt.id && u.id !== splasher && !u.imprisoned
        && !(u.owner !== seat && !u.exhausted && u.keywords.includes('hidden')))
      .map(u => u.id)
  }

  const unitActionable = (unitId: string) =>
    actions.some(a => (a.type === 'move' && a.unit === unitId) || (a.type === 'attack' && a.attackers.includes(unitId))
      || (a.type === 'activate' && a.unit === unitId))
    || passableUpgradesOf(unitId).length > 0   // #86: a banner-bearer can act by passing, even if spent
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
            onClick={trySetupBank}
          >
            Bank these {setupN} ⬢{owed ? ` + bottom ${owed}` : ''} <span className="opacity-60 max-lg:hidden">⏎</span>
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
    // issue #58 (Griff): the block window is now a spatial modal (see <BlockModal>, rendered as a
    // full overlay below). No side-panel banner — the modal is the whole interaction.
    null
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
              Play ({DEMO_CARDS[state.cardOf[selection.id]]?.cost}) <span className="opacity-60 max-lg:hidden">⏎</span>
            </button>
          )}
          {resourceActionFor(selection.id) && (
            <button className="btn btn-primary !py-1 text-xs" onClick={() => apply({ type: 'resource', card: selection.id }, seat)}>
              Bank as resource <span className="opacity-60 max-lg:hidden">⏎</span>
            </button>
          )}
          {whyUnplayable(selection.id) && (
            <span className="w-full text-[12.5px] text-[#e5a99f]">Can't play: {whyUnplayable(selection.id)}.</span>
          )}
          <button className="btn !py-1 text-xs" onClick={() => setInspect({ kind: 'card', slug: state.cardOf[selection.id] })}>ⓘ details</button>
          <button className="btn !py-1 text-xs" onClick={() => setSelection(null)}>Cancel <span className="opacity-60 max-lg:hidden">esc</span></button>
          <span className="w-full text-[11px] text-dim/70 max-lg:hidden">⏎ Enter confirms · Esc cancels</span>
        </div>
      )}
      {selection?.kind === 'unit' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-goldbright">
            {selection.ids.length > 1
              ? `${selection.ids.length} attackers chosen — tap another in this zone to add, or tap a red target to strike together.`
              : 'Tap a glowing target: dashed zone = move · red glow = attack. Tap another ready unit in this zone to attack together.'}
          </span>
          {/* #108: combat is deterministic — lay out the exact unblocked math for every reachable
              target so the player commits on shared information, never a miscalculation. */}
          {state.rules.combatModel === 'blockerPairing' && (() => {
            const atk = selection.ids.map(id => unitViewOf(id)).filter((u): u is UnitView => !!u)
            if (atk.length !== selection.ids.length) return null
            const targets: PreviewTarget[] = []
            for (const ref of highlights) {
              if (ref.kind === 'unit') {
                const tv = unitViewOf(ref.id)
                if (!tv) continue
                const retaliates = state.rules.retaliation === 'always'
                  || (state.rules.retaliation === 'ready' && !tv.exhausted)
                targets.push({ ref, kind: 'unit', unit: tv, retaliates })
              } else if (ref.kind === 'base') {
                targets.push({ ref, kind: 'base', name: names[ref.seat], life: view.sides[ref.seat].life })
              }
            }
            return <CombatPreview attackers={atk} targets={targets} />
          })()}
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
            const def = DEMO_CARDS[state.cardOf[uid]]
            // #104 (Censer of Purity): the yellow ability button — light it where play/modal buttons live,
            // then run the two-step flow (pick a friendly unit → pick the amount).
            if (def?.activated) {
              return (
                <button className="btn btn-primary !py-1 text-xs" title="draw a friendly unit's wounds onto this one — you choose how much moves; it exhausts the Censer"
                  onClick={() => setSelection({ kind: 'censer', unit: uid })}>☩ Draw Wounds</button>
              )
            }
            const isSneak = !!def?.sneak
            const rn = unitViewOf(uid)?.keywords.find(k => k.startsWith('ranged'))?.split(' ')[1]
            return (
              <button className="btn btn-primary !py-1 text-xs" onClick={() => {
                const acts = activateActionsFor(uid)
                if (acts.some(a => !a.targets?.length)) apply({ type: 'activate', unit: uid }, seat)
                else setSelection({ kind: 'sneaking', unit: uid })
              }}>{isSneak ? '✦ Use Sneak' : `🏹 Volley${rn ? ` (${rn})` : ''}`}</button>
            )
          })()}
          {/* #86 (Resolve Banner): a bearer's passable upgrades — hand the standard to a neighbour */}
          {selection.ids.length === 1 && passableUpgradesOf(selection.ids[0]).map(up => (
            <button key={up.id} className="btn btn-primary !py-1 text-xs" title="pass this upgrade to a friendly unit in the same zone (2 resources)"
              onClick={() => setSelection({ kind: 'passing', upgrade: up.id })}>⚑ Pass {up.name}</button>
          ))}
          {selection.ids.length === 1 && (
            <button className="btn !py-1 text-xs" onClick={() => setInspect({ kind: 'unit', id: selection.ids[0] })}>ⓘ details</button>
          )}
          <button className="btn !py-1 text-xs" onClick={() => setSelection(null)}>Cancel <span className="opacity-60 max-lg:hidden">esc</span></button>
        </div>
      )}
      {selection?.kind === 'targeting' && targetingCard && (() => {
        const inter = interchangeableSlots(selection.card)
        const done = selection.collected.length > 0 && playActionsFor(selection.card).some(a =>
          (selection.mode === undefined || a.mode === selection.mode)
          && (selection.x === undefined || a.x === selection.x)
          && (a.targets?.length ?? 0) === selection.collected.length
          && targetsMatch(a, selection.collected, inter))
        const foreclosed = done && highlights.length === 0
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
            <span>{foreclosed
              ? <>No further legal target for <b>{targetingCard.name}</b> — cast with what you have, or cancel.</>
              : <>Choose {selection.collected.length > 0 ? 'the next' : 'a'} target for <b>{targetingCard.name}</b>…</>}</span>
            {done && (
              <button className="btn btn-primary !py-1 text-xs"
                onClick={() => apply({ type: 'play', card: selection.card, targets: selection.collected, ...(selection.mode !== undefined ? { mode: selection.mode } : {}), ...(selection.x !== undefined ? { x: selection.x } : {}) }, seat)}>
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
      {selection?.kind === 'x' && (() => {
        const def = DEMO_CARDS[state.cardOf[selection.card]]
        const xs = [...new Set(playActionsFor(selection.card).map(a => a.x).filter((x): x is number => x !== undefined))].sort((a, b) => a - b)
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-goldbright">Declare X for <b>{def?.name}</b> — you'll pay X resources and lose X influence:</span>
            {xs.map(x => (
              <button key={x} className="btn btn-primary !px-2.5 !py-1 text-xs" onClick={() => pickX(selection.card, x)}>{x}</button>
            ))}
            <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
          </div>
        )
      })()}
      {selection?.kind === 'splash' && (() => {
        const splashers = splashersOf(selection.ids)
        const current = splashers[selection.picks.length]
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-goldbright">
              <b>{unitName(current)}</b> skewers as it attacks — choose any unit in the zone (even your own; not the attack's target):
            </span>
            <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
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
      {selection?.kind === 'censer' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
          <span>Choose a friendly unit for <b>{unitName(selection.unit)}</b> to draw wounds from — tap a glowing ally, then pick how much of its damage moves. Using the ability exhausts the Censer.</span>
          <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}
      {selection?.kind === 'censer-amount' && (() => {
        // #104: the amount picker — the same number buttons as paying an X cost. The offered amounts
        // come straight from the legal actions (capped at min(ally damage, the Censer's remaining Health)).
        const amts = [...new Set(activateActionsFor(selection.unit)
          .filter(a => { const r = (a.targets ?? [])[0]; return !!r && sameRef(r, selection.target) })
          .map(a => a.amount).filter((n): n is number => n !== undefined))].sort((a, b) => a - b)
        const cv = unitViewOf(selection.unit)
        const lethalAt = cv ? cv.health - cv.damage : 0   // moving this much takes the Censer to exactly 0
        const max = amts.length ? amts[amts.length - 1] : 0
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-goldbright">How much of <b>{refName(selection.target)}</b>'s damage should <b>{unitName(selection.unit)}</b> take onto itself?</span>
            {amts.map(n => (
              <button key={n} className={`btn btn-primary !px-2.5 !py-1 text-xs ${n === lethalAt ? '!border-[#e2583e]' : ''}`}
                title={n === lethalAt ? 'this takes the Censer to 0 Health — a final sacrifice' : undefined}
                onClick={() => apply({ type: 'activate', unit: selection.unit, targets: [selection.target], amount: n }, seat)}>
                {n}{n === lethalAt ? ' ☠' : ''}
              </button>
            ))}
            <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
            {max === lethalAt && lethalAt > 0 && (
              <span className="w-full text-[11px] text-[#e5a99f]">☠ Moving {lethalAt} takes {unitName(selection.unit)} to 0 Health — a full martyr's sacrifice.</span>
            )}
          </div>
        )
      })()}
      {selection?.kind === 'orphan' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
          <span>Salvage <b>{DEMO_CARDS[state.cardOf[selection.id]]?.name}</b> — tap one of your glowing units in that zone (full cost and pips, as if played).</span>
          <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}
      {selection?.kind === 'passing' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
          <span>Pass <b>{DEMO_CARDS[state.cardOf[selection.upgrade]]?.name}</b> — tap a glowing friendly unit in the same zone (costs 2 resources; the action passes with it).</span>
          <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}
      {selection?.kind === 'entry-exhaust' && (() => {
        // #104 (Lawbringer): naming the arriving unit — the played card, or the marching unit
        const arriving = 'play' in selection.via
          ? DEMO_CARDS[state.cardOf[selection.via.play]]?.name
          : unitName(selection.via.unit)
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-goldbright">
            <span>⛓ <b>{arriving}</b> arrests an enemy as it takes the zone — tap a glowing enemy to exhaust it.</span>
            <button className="btn !px-2 !py-0.5 text-[11.5px]" onClick={() => setSelection(null)}>cancel</button>
          </div>
        )
      })()}
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
            ? '⬢ Banking step — bank a card as a resource, or skip. (Cards are not played in this step.)'
            : skipToMyWindow
              ? 'Passing through empty turns…'
              : config.mode === 'hotseat'
                ? `${names[seat]} — your turn (screen follows whoever acts)`
                : 'Your turn.'

  // #57 (Blaine): banking mode kept getting mistaken for the play window — "i kept
  // forgetting i had to bank or skip, thought i was playing." Make the step wear a color.
  const bankMode = view.phase === 'bank' && myWindow && canBank

  // Contextual guidance: say WHAT you can do right now.
  const hints: string[] = []
  if (myWindow) {
    const ready = my.resources.filter(r => !r.exhausted).length
    if (view.phase === 'setup') {
      hints.push('Banked cards become permanent resources (+1 to spend every round, forever) — but the cards themselves never come back. Most players bank what they least want to draw into.')
    } else if (view.phase === 'bank') {
      hints.push(`Banking tucks a card away forever and pays +1 toward costs every round — you'd have ${ready + 1} each round after this. Bank early and often — but once your bank covers your biggest costs, every further bank is a card you'll miss in the late game.`)
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
      const passables = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'passUpgrade' }> => a.type === 'passUpgrade').map(a => a.upgrade)).size
      const captors = new Set(view.actions.filter((a): a is Extract<GameAction, { type: 'releaseCaptive' }> => a.type === 'releaseCaptive').map(a => a.unit)).size
      const bits = [
        playable && `play ${playable} card${playable > 1 ? 's' : ''}`,
        attackers && `attack with ${attackers} unit${attackers > 1 ? 's' : ''}`,
        movers && `move ${movers} unit${movers > 1 ? 's' : ''}`,
        sneaks && `use ${sneaks} unit abilit${sneaks > 1 ? 'ies' : 'y'}`,
        salvables && `salvage ${salvables} orphaned upgrade${salvables > 1 ? 's' : ''}`,
        passables && `pass ${passables} upgrade${passables > 1 ? 's' : ''}`,
        captors && `release a captive`,
      ].filter(Boolean)
      if (bits.length) hints.push(`Right now you can ${bits.join(' · ')} — or pass. ${ready} resource${ready === 1 ? '' : 's'} ready.`)
      if (canClaim) hints.push('You can claim the initiative: it spends your round, but you act first next round (and locks the token to you).')
    }
  }

  // issue #58: props for the spatial block modal (rendered as a full overlay near the end).
  const blockAttackers = isBlock && myWindow && pendingAttack
    ? pendingAttack.attackers.map(id => unitViewOf(id)).filter((u): u is NonNullable<typeof u> => !!u)
    : []
  const blockDefenders = isBlock && myWindow
    ? blockerIds.map(id => unitViewOf(id)).filter((u): u is NonNullable<typeof u> => !!u)
    : []
  // duel law mirrors the engine (issue #50): a lone attacker on a unit admits one Guard at most.
  const duelBlock = isBlock && myWindow && state.rules.singleAttackerDuels
    && !!pendingAttack && pendingAttack.target.kind === 'unit'
    && pendingAttack.attackers.filter(id => unitViewOf(id)).length === 1

  return (
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto">
      <div className="flex flex-wrap items-center gap-3 border-b hairline px-3 py-1.5 text-sm">
        <button className="text-dim hover:text-body" onClick={onExit}>← Setup</button>
        <span className="font-display text-parchment">{names[0]} vs {names[1]}</span>
        <span className="text-xs text-dim">Round {view.round} · seed {config.seed}</span>
        <span className="text-xs text-goldbright" title="holds the initiative — acts first each round">⚑ {names[view.initiative]}</span>
        {/* wraps rather than stretching the layout viewport — a 393px row at 390px broke taps once (#17) */}
        <span className="ml-auto flex min-w-0 flex-wrap justify-end gap-1.5">
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
      <div className="min-h-0 flex-1 max-lg:overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_290px]">
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
                <div onClick={() => { setRecap([]); setRecapShown(0); setRecapAck(false) }} title="tap to dismiss"
                  className={`max-w-[520px] cursor-pointer rounded-lg border bg-black/85 px-4 py-2.5 shadow-xl backdrop-blur ${recapAck ? 'border-[#e5735f]/60' : 'border-goldbright/30'}`}>
                  <div className={`mb-1 text-center text-[10px] uppercase tracking-[0.25em] ${recapAck ? 'text-[#e5a99f]' : 'text-goldbright/80'}`}>
                    {recapAck ? '☠ your losses' : '⚔ combat'}
                  </div>
                  {recap.slice(0, recapShown).map((l, i) => (
                    <div key={i} className={`text-[13px] leading-relaxed ${i === recapShown - 1 ? 'text-parchment' : 'text-body/60'}`}>
                      {/destroyed|falls/i.test(l.msg) ? '☠' : /damage|suffers/i.test(l.msg) ? '💥' : '⚔'} {l.msg}
                    </div>
                  ))}
                  {recapAck && recapShown >= recap.length && (
                    <div className="mt-2 text-center">
                      <button className="btn btn-primary !px-4 !py-1 text-xs"
                        onClick={e => { e.stopPropagation(); setRecap([]); setRecapShown(0); setRecapAck(false) }}>
                        ✓ Continue
                      </button>
                    </div>
                  )}
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
                        <UnitChip key={u.id} unit={u} mine={mine} glow={glow} sleeve={sleeveOf(u.owner)}
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
                    {/* #74: the just-fallen, fading out where they stood — no interaction, purely to read */}
                    {ghosts.filter(g => g.zone === z).map(g => (
                      <div key={g.key} className="unit-ghost shrink-0" aria-hidden>
                        <UnitChip unit={g.unit} mine={g.mine} glow="none" sleeve={sleeveOf(g.unit.owner)} />
                      </div>
                    ))}
                    {view.zones[z].orphans.map(o => {
                      const salvages = myWindow ? salvageActionsFor(o.id) : []
                      const active = selection?.kind === 'orphan' && selection.id === o.id
                      // #61 (Blaine): a gray orphan names its failing gate, not the whole rulebook
                      const whyNot = (() => {
                        if (salvages.length) return null
                        const def = DEMO_CARDS[o.slug]
                        const ready = my.resources.filter(r => !r.exhausted).length
                        if (!myWindow || view.phase !== 'loop') return 'salvaging is a full action — wait for your turn in the action loop'
                        if (!units.some(u => u.owner === seat)) return 'you need a unit of yours standing in this zone'
                        if (def && def.cost > ready) return `it costs ${def.cost} and you have ${ready} ready resource${ready === 1 ? '' : 's'}`
                        if (def?.pips?.length) return `your bank is missing its pips (needs ${def.pips.join(' + ')})`
                        return 'not salvageable right now'
                      })()
                      return (
                        <button key={o.id}
                          className={`shrink-0 rounded-md border border-dashed px-1.5 py-1 text-left text-[10px] leading-tight ${active ? 'glow-selected border-goldbright text-goldbright' : salvages.length ? 'border-goldbright/60 text-goldbright hover:border-goldbright' : 'hairline text-dim'}`}
                          title={salvages.length
                            ? `${o.name} — tap to salvage it onto one of your units here (you pay its full cost and pips).`
                            : `${o.name} — an orphaned upgrade (either player may salvage it here, paying its full cost and pips). Grayed because ${whyNot}. Tap to read the card.`}
                          onClick={e => {
                            e.stopPropagation()
                            if (salvages.length) setSelection(active ? null : { kind: 'orphan', id: o.id })
                            else setInspect({ kind: 'card', slug: o.slug })
                          }}>
                          ↑ {o.name}
                          <span className="block text-[8.5px] uppercase tracking-wide opacity-70">{salvages.length ? 'orphaned · tap to salvage' : 'orphaned'}</span>
                        </button>
                      )
                    })}
                    {!units.length && !view.zones[z].orphans.length && !ghosts.some(g => g.zone === z) && <span className="text-xs text-dim/50">—</span>}
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

          {/* #64 (Blaine): a captured unit is easy to lose track of — your bar names the jailer */}
          {(() => {
            const held = view.zones.flatMap((zn, zi) => zn.units.flatMap(u =>
              u.captives.filter(c => c.owner === seat).map(c => ({ c, captor: u, zi }))))
            if (!held.length) return null
            const zoneLabel = (zi: number) => zi === 1 ? 'the Neutral zone' : zi === (seat === 0 ? 0 : 2) ? 'your Home' : 'their Home'
            return (
              <p className="mt-1 text-[11.5px] text-dim">
                ⛓ {held.map(({ c, captor, zi }) => (
                  <span key={c.id}><b className="text-body">{c.name}</b> is held by{' '}
                    <button className="underline decoration-dotted hover:text-body" onClick={() => setInspect({ kind: 'unit', id: captor.id })}>{captor.name}</button>{' '}
                    in {zoneLabel(zi)}</span>
                )).reduce((acc: React.ReactNode[], el, i) => (i ? [...acc, ' · ', el] : [el]), [])}
                {' '}— kill the jailer to free the prisoner.
              </p>
            )
          })()}

          {bankMode && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-[#c98a27] bg-[#c98a27]/10 px-2 py-1.5 text-xs">
              <span className="text-goldbright">⬢ <b>Banking step</b> — tap a card below to bank it as a resource (not play it), or</span>
              <button className="btn !py-0.5 text-xs" onClick={() => apply({ type: 'skipResource' }, seat)}>Skip banking →</button>
            </div>
          )}
          <div className={`mt-1.5 flex gap-2 overflow-x-auto pb-1 ${bankMode ? 'rounded-md bg-[#c98a27]/[0.06] p-1 ring-1 ring-[#c98a27]/50' : ''}`}>
            {[...view.hand].sort((a, b) => {
              const da = DEMO_CARDS[a.slug]; const db = DEMO_CARDS[b.slug]
              return (da?.cost ?? 0) - (db?.cost ?? 0) || (da?.type ?? '').localeCompare(db?.type ?? '') || (da?.name ?? '').localeCompare(db?.name ?? '')
            }).map(h => {
              const def = DEMO_CARDS[h.slug]
              const canAct = playActionsFor(h.id).length > 0 || !!resourceActionFor(h.id)
              return (
                <CardFrame key={h.id} card={def} size="sm" sleeve={sleeveOf(seat)}
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
          <div className={`panel p-3 ${bankMode ? 'bg-[#c98a27]/10 ring-1 ring-[#c98a27]/60' : ''}`}>
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
              {/* the Skip banking button lives in the amber bank-step banner over the hand (#57) */}
              {myWindow && canClaim && (
                <button className="btn btn-primary !py-1 text-xs" title="take the initiative token: ends your round, but you act first next round"
                  onClick={() => apply({ type: 'claimInitiative' }, seat)}>Claim initiative ⚑</button>
              )}
              {myWindow && canPass && (() => {
                // #27: tryPass opened the confirmation — this renders it
                const readyLeft = view.zones.flatMap(z => z.units).filter(u => u.owner === seat && unitActionable(u.id)).length
                const playableLeft = new Set(actions.filter(a => a.type === 'play').map(a => a.card)).size
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
                  <button className="btn !py-1 text-xs" title="hotkey: P" onClick={tryPass}><u className="underline-offset-2">P</u>ass</button>
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
            sleeve={sleeveOf(uv.owner)}
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
            : 'Everything destroyed, spent, or discarded — newest first, public to both players.'}
          cards={(inspect.pile === 'resources'
            ? view.sides[inspect.seat].resources.map(r => DEMO_CARDS[r.slug])
            : [...view.sides[inspect.seat].discard].reverse().map(d => DEMO_CARDS[d.slug])   // #48: newest first
          ).filter(Boolean)}
          sleeve={sleeveOf(inspect.seat)}
          onClose={() => setInspect(null)}
        />
      )}

      {showHelp && <HelpPanel edition={state.rules.combatModel === 'blockerPairing' ? 'v3' : 'v2.3'} keyboard onClose={() => setShowHelp(false)} />}

      {/* issue #58 (Griff): blocking is a spatial act — attackers in a row, defenders dropped
          under each. Emits the identical block action; the engine's resolution is untouched. */}
      {isBlock && myWindow && pendingAttack && (
        <BlockModal
          attackers={blockAttackers}
          target={pendingAttack.target}
          targetName={refName(pendingAttack.target)}
          targetView={pendingAttack.target.kind === 'unit' ? unitViewOf(pendingAttack.target.id) : undefined}
          defenders={blockDefenders}
          allowedOnto={blockAllowedOnto}
          duel={duelBlock}
          myLife={my.life}
          pairs={blockPairs}
          onChange={setBlockPairs}
          onConfirm={pairs => apply({ type: 'block', pairs }, seat)}
          onCancel={() => apply({ type: 'block', pairs: [] }, seat)}
          sleeveOf={sleeveOf}
          onInspect={id => setInspect({ kind: 'unit', id })}
        />
      )}

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
      {outOfRound && <span className="rounded bg-goldbright/15 px-1.5 py-0.5 text-[11.5px] uppercase tracking-wider text-goldbright/90" title="claimed the initiative — no more actions this round, but its units still block and retaliate; acts first next round">claimed — resting, still defends</span>}
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
