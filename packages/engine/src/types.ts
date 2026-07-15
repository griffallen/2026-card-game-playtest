// ─── Core identifiers ────────────────────────────────────────────────────────
export type Seat = 0 | 1
/** 0 = seat 0's Home, 1 = Neutral, 2 = seat 1's Home */
export type ZoneId = 0 | 1 | 2
export type Color = 'red' | 'yellow' | 'purple' | 'neutral'
export type CardType = 'unit' | 'action' | 'upgrade'

export const ZONES: ZoneId[] = [0, 1, 2]
export const homeZone = (seat: Seat): ZoneId => (seat === 0 ? 0 : 2)
export const adjacent = (a: ZoneId, b: ZoneId) => Math.abs(a - b) === 1

// ─── Keywords ────────────────────────────────────────────────────────────────
export type KeywordName =
  | 'guard' | 'armor' | 'rush' | 'ranged' | 'reach' | 'flying'
  | 'breakthrough' | 'overextend' | 'cantAttack' | 'untargetable'
  // v3 suite (game-rules-v3-draft §2, decisions 59-61, 70)
  | 'scar' | 'shielded' | 'hidden' | 'infiltrate' | 'capture' | 'sneak'
  // decision 88 (#29): standing in Neutral with the majority sways the influence track
  | 'politician'
export interface KeywordSpec { k: KeywordName; n?: number }

// ─── Effect DSL ──────────────────────────────────────────────────────────────
export interface Cond {
  influenceAtLeast?: number   // controller's perspective
  influenceAtMost?: number
  selfLifeAtMost?: number
}

/** Ops resolve against: play-time chosen targets, the effect's own card, or a filter. */
export type OpTarget = 'chosen0' | 'chosen1' | 'self' | 'attached' | 'attackTarget'
export interface UnitFilter {
  side: 'friendly' | 'enemy' | 'all'
  /** zone constraint relative to the source unit / chosen zone target / the controller's own Home (#89) */
  zone?: 'sameAsSelf' | 'chosenZone' | 'adjacentToSelf' | 'all' | 'controllerHome'
  other?: boolean            // exclude source unit
  maxPower?: number
  /** #89 (Radiant Judgment): keep only units whose printed cost is ≤ the controller's LIVE influence.
   *  A dynamic cost cap read at resolution time — the exhaust filter widens as the +1 rider lands. */
  maxCostInfluence?: boolean
}
export interface AutoPick {   // deterministic engine-chosen target(s): highest power, ties → lowest id
  maxPower?: number
  scope: 'targetZone' | 'otherZone' | 'eachZone' | 'enteredZone'
}

/** v3 count-scaling (PR #70/#71): multiply the op's n by a live count. 'attackers' = units
 *  attacking the defending unit in the current combat (onDefend); 'units' = in-play units
 *  matching the filter (e.g. {side, zone:'chosenZone'} — the same shape exhaust filters on). */
export type PerCount =
  | { count: 'attackers' }
  | { count: 'units'; f: UnitFilter }
  /** #85 (Aura of Resolve): the per-round death ledger — units OWNED by the controller ('friendly')
   *  or the opponent ('enemy') that have died so far this round (created copies that vanish count). */
  | { count: 'deathsThisRound'; side: 'friendly' | 'enemy' }

export type Op =
  | { op: 'damage'; t: OpTarget | 'enemyBase' | 'selfBase' | 'autoSplash'; n: number | 'linked'; bonusIfDamaged?: number; per?: PerCount }  // 'linked' = the amount from the previous linking op (v3, spec §3)  // autoSplash: strongest other enemy unit in the attack target's zone  // per (#85): scale n by a live count (e.g. enemy deaths this round)
  | { op: 'damageFilter'; f: UnitFilter; n: number }
  | { op: 'heal'; t: 'chosen0' | 'selfBase'; n: number; per?: PerCount }  // chosen may be unitOrBase; per scales n (PR #71)
  | { op: 'draw'; n: number }
  | { op: 'influence'; n: number; per?: PerCount; cond?: Cond }   // + toward controller; per scales n (PR #70/#71); cond gates the gain (#79 Radiant Aegis)
  | { op: 'imprison'; t: OpTarget | 'auto'; f?: UnitFilter; auto?: AutoPick }
  | { op: 'buff'; t: OpTarget | UnitFilter; p?: number; h?: number; armor?: number; dur: 'round' | 'perm'; cond?: Cond }
  | { op: 'double'; t: OpTarget | UnitFilter; rounds?: number }  // v3 (Unchained Rage): filter-wide, multi-round
  | { op: 'grant'; t: OpTarget | UnitFilter; kw: KeywordSpec; dur: 'round' | 'perm' }
  | { op: 'destroy'; t: OpTarget; mustBeDamaged?: boolean }
  | { op: 'destroyUpgrade' }                                      // target: chosen upgrade
  | { op: 'ready'; side: 'friendly'; t?: 'chosen0' }             // with t: readies only that chosen unit (Final Onslaught)
  | { op: 'extraAction' }                                         // the same player immediately takes another action (decision 43)
  | { op: 'preventBase'; n: number }
  | { op: 'wardHome' }        // #88 (Devout Intervention): arm a one-shot ward — the next DAMAGING attack on the controller's Home is fully prevented; spends only on real prevention (a feint leaves it armed), and never blocks direct-damage spells
  | { op: 'wardBlocker' }     // #88 (Devout Intervention): arm a one-shot ward — the controller's next blocking unit takes no combat damage this fight, yet still deals its counter
  | { op: 'removeNegative'; t: OpTarget }
  | { op: 'clearDamage'; t: OpTarget }
  | { op: 'countBuff'; t: OpTarget; per: { color?: Color; side: 'all' | 'friendly' | 'enemy'; zone: 'ofTarget'; other?: boolean }; p: number; dur: 'round' | 'perm' }  // v3 (Reckless mode B): +p per matching unit                            // v3 (Blood Rush): remove ALL damage; the amount becomes the linked value
  | { op: 'capture'; t: OpTarget; by?: 'chosen0'; income?: number }  // v3: take the enemy unit under the source unit — or a chosen warden; income = influence per round while held (PR #53)
  | { op: 'exhaust'; t: OpTarget | UnitFilter }                   // v3 yellow: order a unit to stand down
  | { op: 'freeCaptives' }                                        // v3 yellow: your captured units return, READY (decision 73)
  | { op: 'move'; t: OpTarget; to: 'chosenZone' }                 // decision 72: relocate the unit — exhausted or not, exhausting nothing
  | { op: 'attackTax'; n: number; rounds: number }                // PR #39 (Unchained Rage): each of your attacking units cedes n influence
  | { op: 'doom'; t: 'chosen0' }                                  // PR #38 (Final Onslaught): after the extra action, the unit and its attack's victims die
  | { op: 'xSurge'; t: 'chosen0' }                                // issue #45 (Reckless Abandon): lose X influence; +X power and Breakthrough this round
  | { op: 'splashReap'; n: number; influence: number }            // PR #46 (Fiery Impaler): on attack, n damage to the declared splash victim; +influence if it dies
  | { op: 'createCopies'; n: number; p?: number; h?: number; kw?: KeywordSpec[]; ifOnlyCopy?: boolean }  // #69 (Radiant Citadel): summon n ready copies of the source unit's card in the controller's Home. p/h/kw shape the copies' body (omitted = the printed card). ifOnlyCopy: fires only while the controller owns exactly one copy — the recursion fuse. Created units are not deck cards; they vanish when they die.

export type Static =
  /** pPerHostPip (#80, Subjugate): power scaled by the CARRIER's pip count — attached scope only,
   *  computed live so a salvaged upgrade (decision 67) re-fits its new host. */
  | { s: 'aura'; scope: 'otherFriendly' | 'friendlyInZone' | 'enemyInZone' | 'attached'; p?: number; pPerHostPip?: number; armor?: number; kw?: KeywordSpec; cond?: Cond }
  | { s: 'oppThreshold'; n: number }      // opponent's win threshold raised by n
  | { s: 'imprisonWatcher'; n: number }   // controller gains n influence whenever any unit is imprisoned

/** What a play action must supply as chosen targets, in order. */
export interface TargetSpec {
  t: 'unit' | 'unitOrBase' | 'zone' | 'upgrade'
  side?: 'friendly' | 'enemy' | 'any'
  baseSide?: 'enemy' | 'any'
  maxPower?: number
  maxCost?: number          // #87 (Binding Light): the target's printed cost must be ≤ this
  withKw?: KeywordName
  mustBeDamaged?: boolean
  damagedOrMaxHealth?: number  // PR #53 (Prison Warrant): legal if damaged OR effective health ≤ n
  count?: number            // distinct targets sharing this spec (Collateral Damage: 2)
  upTo?: boolean            // v3 (Volcanic Slam): 1..count targets acceptable instead of exactly count
  sameZone?: boolean        // v3 (Volcanic Slam): all unit targets of this spec share one zone
  adjacentToFirst?: boolean // decision 72 (Reckless Charge): this zone must sit adjacent to the first chosen unit's zone
}

// ─── Card definitions ────────────────────────────────────────────────────────
export interface CardDef {
  slug: string
  name: string
  color: Color
  type: CardType
  cost: number
  power?: number
  health?: number
  text: string
  /** v3 (decision 69): presence requirement per color — never a payment. Also defines what this card provides when banked (1 per distinct color). */
  pips?: Color[]
  /** v3 Sneak payload (decision 60): exhaust-activated, targets constrained to the unit's zone */
  sneak?: { targets?: TargetSpec[]; ops: Op[] }
  /** v3 modal actions (spec §3, PR #13): the player declares one mode at cast time; each mode owns its targets+ops.
   *  `cond` (#87 Binding Light) gates a mode's LEGALITY — it is only offered/playable while the condition holds. */
  modes?: { label: string; text?: string; targets?: TargetSpec[]; ops: Op[]; cond?: Cond }[]
  /** cost is printed "X": the player declares how many resources to pay at cast (issue #45) */
  xCost?: boolean
  kw?: KeywordSpec[]
  /** #80 (Subjugate): which side's units this upgrade attaches to — absent = friendly, the
   *  standing law for every other upgrade. Per-card; enemy attach is never the default. */
  attach?: { side: 'friendly' | 'enemy' }
  targets?: TargetSpec[]     // play-time targets (upgrades: attach target is implicit and NOT listed)
  onPlay?: Op[]              // action body; unit/upgrade enter-play effects
  onEnterZone?: Op[]         // fires on play AND every zone entry (targets always auto-picked)
  onAttack?: Op[]
  onAttackBase?: Op[]
  onDefend?: Op[]
  onKill?: Op[]
  onDeath?: Op[]             // PR #54: fires as the unit dies (controller = owner)
  startOfRound?: { cond?: Cond; ops: Op[] }
  endOfRound?: { cond?: Cond; ops: Op[] }
  statics?: Static[]
  designerNote?: string
  artUrl?: string | null
}
export type CardSet = Record<string, CardDef>

// ─── Rules parameters ────────────────────────────────────────────────────────
export interface RulesConfig {
  startingLife: number
  influenceWinThreshold: number
  startingHandSize: number
  startingResources: number
  /** true: players choose their starting banks in a Setup phase (decision 31); false: auto-bank last drawn */
  chooseStartingResources: boolean
  /** decision 32: unlimited mulligans, drawing this many fewer cards each time */
  mulliganPenalty: number
  /** decision 58 (designer A/B): 'decrement' redraws smaller; 'london' redraws full, then bottoms mulligans×penalty cards at bank time */
  mulliganStyle: 'decrement' | 'london'
  /** decision 33: failing to draw from an empty deck costs life and influence per missing card */
  emptyDrawLifeLoss: number
  emptyDrawInfluenceLoss: number
  drawPerRound: number
  firstRoundDraw: number
  /** decision 71 (v3): false = round 1 has no start step — no ready/draw/bank, straight to the loop */
  firstRoundStartStep: boolean
  resourcesPerRound: number
  deckMinSize: number
  maxCopies: number
  upgradePressureInfluence: number
  prisonDecayPerUnit: number
  prisonReleaseThreshold: number
  /** decision 41: units enter ready — false by default; true restores can't-act-on-entry */
  summoningSickness: boolean
  moveExhausts: boolean
  /** decision 41: Rush's exhaust waiver also covers the entry-round attack */
  rushCoversAttack: boolean
  /** decision 42: intercepting exhausts the interceptor (Guard always exempt) */
  interceptExhausts: boolean
  /** counter-damage target in a multi-unit attack: 'auto' = highest power (only mode implemented) */
  counterAssignment: 'auto' | 'defender'
  /** armor vs a combined multi-unit hit: 'once' on the total (only mode implemented) */
  armorPerAttack: 'once' | 'perAttacker'
  /** cap on attackers per attack action (0 = unlimited) */
  maxAttackers: number
  /** v3 (decision Q4-Q6/#9): 'blockerPairing' replaces the intercept window entirely */
  combatModel: 'intercept' | 'blockerPairing'
  /** issue #50 experiment: a SINGLE attacker cannot be blocked except by one Guard (full
   *  redirect, no exhaust) — the declared target must face its attacker. Gangs stay blockable. */
  singleAttackerDuels: boolean
  /** v3 (decision 69): 'presence' gates plays on banked color sources; pips never exhaust */
  pipModel: 'none' | 'presence'
  /** v3 (decision 67): dead units' upgrades orphan in the zone and are salvageable by either side */
  upgradesOrphan: boolean
  /** v3 (decision 62): assigning a non-Guard blocker exhausts it; inert under 'intercept' */
  blockingExhausts: boolean
  /** #25 experiment (Griff): 'blockers' = fighting back IS blocking (current law);
   *  'ready' = a READY declared target strikes every unblocked attacker (exhausted stays defenseless);
   *  'always' = the declared target strikes every unblocked attacker at full power, exhausted included */
  retaliation: 'blockers' | 'ready' | 'always'
  simultaneousLifeTiebreak: 'actor' | 'active' | 'draw'
}

// ─── In-play state ───────────────────────────────────────────────────────────
export interface Mod {
  p?: number
  h?: number
  armor?: number
  kw?: KeywordSpec
  double?: boolean
  round?: boolean            // expires at end of round
  rounds?: number            // v3: expires after this many round-ends (2 = survives one, dies at the second)
  cond?: Cond                // active only while condition holds (checked against owner)
}

export interface UnitInstance {
  id: string
  slug: string
  owner: Seat
  zone: ZoneId
  damage: number
  exhausted: boolean
  enteredRound: number
  /** decision 41: Rush waives the move-exhaust for the FIRST move only — reset when the unit readies */
  movedThisRound: boolean
  imprisoned: { by: Seat; source: string | null } | null
  upgrades: string[]         // upgrade instance ids
  mods: Mod[]
  /** decision 35: damage owed at end of round from overextending this round */
  overextendedBy: number
  /** v3 Shielded: entered with a shield token; first damage instance is prevented and this flips */
  shielded: boolean
  /** #69 (createCopies): minted by an effect, never a deck card. Present = the unit vanishes on
   *  death (no discard). p/h/kw, when set, replace the printed body/keyword line. */
  created?: { p?: number; h?: number; kw?: KeywordSpec[] }
  /** #88 (Devout Intervention, Ward 2): stamped on the controller's next blocker — this unit takes
   *  no damage in the coming combat resolution (it still deals its counter). One fight, then cleared. */
  blockWard?: boolean
}

export interface UpgradeInstance {
  id: string
  slug: string
  owner: Seat
  attachedTo: string | null   // null = orphaned in a zone (v3, decision 67)
  orphanedIn?: ZoneId
}

export interface SideState {
  name: string
  life: number
  deck: string[]             // instance ids, top = last element
  hand: string[]
  resources: { id: string; exhausted: boolean }[]
  discard: string[]
}

export interface LogLine { t: number; seat: Seat | null; msg: string }

export interface GameState {
  rngState: number
  rules: RulesConfig
  cardSet: CardSet
  cardOf: Record<string, string>      // instance id → slug
  round: number                       // global, increments once per full round
  initiative: Seat                    // holder acts first each round; carries over unless claimed
  phase: 'setup' | 'bank' | 'loop' | 'intercept' | 'block'
  actorSeat: Seat                     // whose action window it is
  startStep: Seat | null              // phase 'bank': whose start step is paused at its bank choice
  bankedThisStep: number              // resources banked in the current start step
  outOfRound: [boolean, boolean]      // true = claimed initiative, done acting this round
  claimedThisRound: boolean           // at most one claim per round
  setupBanked: [boolean, boolean]     // per-seat: starting resources chosen (setup phase)
  /** v3 Capture: captive unit id → its frozen instance + the capturer's unit id */
  captives: Record<string, { unit: UnitInstance; by: string; income?: number }>  // income: influence per round while held (PR #53)
  /** Unchained Rage (PR #39): while active, each of the seat's attacking units costs n influence */
  attackTaxes: { seat: Seat; n: number; rounds: number }[]
  /** Final Onslaught (PR #38): after the granted extra action resolves, this unit and everything
   *  its attack damaged die. stage: fresh (created this action) → waiting → spent (execute when no attack pends) */
  doom: { unit: string; seat: Seat; stage: 'fresh' | 'waiting' | 'spent' } | null
  /** transient, per-action: units damaged by the doomed unit's attack (cleared each action) */
  doomVictims: string[]
  mulligans: [number, number]         // per-seat mulligan count (setup phase, decision 32)
  passStreak: number
  pendingExtraAction: Seat | null     // decision 43: this seat takes another action after the current resolves
  pendingAttack: {                    // phase 'intercept': the declared attack awaiting the defender
    seat: Seat; attackers: string[]; target: TargetRef; overextend: string[]
  } | null
  influence: number                   // + toward seat 0
  sides: [SideState, SideState]
  units: Record<string, UnitInstance>
  upgrades: Record<string, UpgradeInstance>
  preventBase: [number, number]       // remaining base-damage prevention this round
  /** #88 (Devout Intervention): per-seat one-shot wards, cleared at the round boundary.
   *  homeWard — the next damaging ATTACK on this seat's Home is fully prevented (spends only on
   *  real prevention). blockerWard — this seat's next blocker is stamped `blockWard`. */
  homeWard: [boolean, boolean]
  blockerWard: [boolean, boolean]
  /** #85 (Aura of Resolve): the per-round death ledger — units that have died this round, indexed
   *  by OWNER seat (created copies that vanish are counted). Cleared at the round boundary. */
  deaths: [number, number]
  winner: Seat | null
  winReason: 'life' | 'influence' | 'concede' | null
  log: LogLine[]
  nextId: number
}

// ─── Actions ─────────────────────────────────────────────────────────────────
export type TargetRef =
  | { kind: 'unit'; id: string }
  | { kind: 'base'; seat: Seat }
  | { kind: 'zone'; zone: ZoneId }
  | { kind: 'upgrade'; id: string }

export type GameAction =
  | { type: 'mulligan' }                     // setup phase: shuffle back, redraw (style per rules.mulliganStyle — decisions 32/58)
  | { type: 'setupBank'; cards: string[]; bottom?: string[] }  // bottom: london-mulligan payback (decision 58)   // setup phase: choose starting resources
  | { type: 'resource'; card: string }       // bank phase: resource a card
  | { type: 'skipResource' }                 // bank phase: end your start step
  | { type: 'play'; card: string; targets?: TargetRef[]; zone?: ZoneId; mode?: number; x?: number }  // zone: v3 Infiltrate; mode: v3 modal cards; x: declared X cost (issue #45)
  | { type: 'activate'; unit: string; targets?: TargetRef[] }             // v3 Sneak (decision 60)
  | { type: 'releaseCaptive'; unit: string }                              // RETIRED (decision 92): kept for replay compat; always rejected
  | { type: 'block'; pairs: { blocker: string; onto: string }[]; retaliationOrder?: string[] }  // v3 combat: defender pairs blockers (empty = let it through); pour order = pair order. #84: retaliationOrder aims the target's DIVIDED strike-back — ordered attacker ids; absent → highest-power-first
  | { type: 'attachOrphan'; upgrade: string; unit: string }               // v3 (decision 67): salvage an orphaned upgrade at full cost+pips
  | { type: 'attack'; attackers: string[]; target: TargetRef; overextend?: string[]; splash?: { by: string; unit: string }[] }  // splash: per-attacker chosen victims for splashReap triggers (PR #46, decision 24-compatible) // decision 42: 1+ attackers, one zone; overextend: subset taking the gamble
  | { type: 'move'; unit: string; to: ZoneId }
  | { type: 'claimInitiative' }              // decision 40: take the token, leave the round
  | { type: 'intercept'; unit: string }      // decision 42: redirect the attack to a ready unit
  | { type: 'declineIntercept' }             // decision 42: let the attack hit its declared target
  | { type: 'pass' }
  | { type: 'concede' }

export class EngineError extends Error {
  constructor(public code: string, msg: string) { super(msg) }
}

// ─── Views (server → client contract) ────────────────────────────────────────
export interface UnitView {
  id: string; slug: string; name: string; owner: Seat; zone: ZoneId
  power: number; health: number; damage: number
  basePower: number; baseHealth: number; armor: number
  exhausted: boolean; rushFreeMove: boolean; imprisoned: boolean
  overextendedBy: number
  /** v3 Shielded: live token — false once spent (keywords list tracks this too) */
  shielded: boolean
  keywords: string[]
  upgrades: { id: string; slug: string; name: string }[]
  /** v3 Capture: units held under this one — visible to everyone (#23: nothing hidden) */
  captives: CaptiveView[]
}
export interface CaptiveView { id: string; slug: string; name: string; owner: Seat }
/** v3 (decision 67): an upgrade lying free in a zone, salvageable by either side */
export interface OrphanView { id: string; slug: string; name: string; owner: Seat }
export interface HandCardView { id: string; slug: string }
export interface SideView {
  name: string; life: number; handCount: number; deckCount: number
  resources: { id: string; slug: string; exhausted: boolean }[]
  discard: { id: string; slug: string }[]
}
export interface PlayerView {
  viewerSeat: Seat | null
  round: number
  phase: 'setup' | 'bank' | 'loop' | 'intercept' | 'block'
  initiative: Seat
  actorSeat: Seat
  outOfRound: [boolean, boolean]
  claimedThisRound: boolean
  pendingAttack: { attackers: string[]; target: TargetRef } | null
  influence: number                    // + toward seat 0 (client flips for display)
  thresholds: [number, number]         // win threshold per seat (statics applied)
  sides: [SideView, SideView]
  zones: { units: UnitView[]; orphans: OrphanView[] }[]   // absolute order: [seat0 home, neutral, seat1 home]
  hand: HandCardView[]                 // viewer's own hand
  actions: GameAction[]                // viewer's legal actions right now
  winner: Seat | null
  winReason: string | null
  log: LogLine[]
}

export interface SimResult {
  winner: Seat
  winReason: string
  rounds: number
  actions: number
  minInfluence: number
  maxInfluence: number
}
