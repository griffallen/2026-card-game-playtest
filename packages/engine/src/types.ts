// ─── Core identifiers ────────────────────────────────────────────────────────
export type Seat = 0 | 1
/** 0 = seat 0's Home, 1 = Neutral, 2 = seat 1's Home */
export type ZoneId = 0 | 1 | 2
export type Color = 'red' | 'yellow' | 'neutral'
export type CardType = 'unit' | 'action' | 'upgrade'

export const ZONES: ZoneId[] = [0, 1, 2]
export const homeZone = (seat: Seat): ZoneId => (seat === 0 ? 0 : 2)
export const adjacent = (a: ZoneId, b: ZoneId) => Math.abs(a - b) === 1

// ─── Keywords ────────────────────────────────────────────────────────────────
export type KeywordName =
  | 'guard' | 'armor' | 'rush' | 'ranged' | 'reach' | 'flying'
  | 'breakthrough' | 'overextend' | 'cantAttack' | 'untargetable'
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
  /** zone constraint relative to the source unit / chosen zone target */
  zone?: 'sameAsSelf' | 'chosenZone' | 'adjacentToSelf' | 'all'
  other?: boolean            // exclude source unit
  maxPower?: number
}
export interface AutoPick {   // deterministic engine-chosen target(s): highest power, ties → lowest id
  maxPower?: number
  scope: 'targetZone' | 'otherZone' | 'eachZone' | 'enteredZone'
}

export type Op =
  | { op: 'damage'; t: OpTarget | 'enemyBase' | 'selfBase' | 'autoSplash'; n: number }  // autoSplash: strongest other enemy unit in the attack target's zone
  | { op: 'damageFilter'; f: UnitFilter; n: number }
  | { op: 'heal'; t: 'chosen0' | 'selfBase'; n: number }         // chosen may be unitOrBase
  | { op: 'draw'; n: number }
  | { op: 'influence'; n: number }                                // + toward controller
  | { op: 'imprison'; t: OpTarget | 'auto'; f?: UnitFilter; auto?: AutoPick }
  | { op: 'buff'; t: OpTarget | UnitFilter; p?: number; h?: number; armor?: number; dur: 'turn' | 'perm'; cond?: Cond }
  | { op: 'double'; t: OpTarget }
  | { op: 'grant'; t: OpTarget | UnitFilter; kw: KeywordSpec; dur: 'turn' | 'perm' }
  | { op: 'destroy'; t: OpTarget; mustBeDamaged?: boolean }
  | { op: 'destroyUpgrade' }                                      // target: chosen upgrade
  | { op: 'ready'; side: 'friendly' }
  | { op: 'extraTurn' }
  | { op: 'preventBase'; n: number }
  | { op: 'removeNegative'; t: OpTarget }

export type Static =
  | { s: 'aura'; scope: 'otherFriendly' | 'friendlyInZone' | 'enemyInZone' | 'attached'; p?: number; armor?: number; kw?: KeywordSpec; cond?: Cond }
  | { s: 'oppThreshold'; n: number }      // opponent's win threshold raised by n
  | { s: 'imprisonWatcher'; n: number }   // controller gains n influence whenever any unit is imprisoned

/** What a play action must supply as chosen targets, in order. */
export interface TargetSpec {
  t: 'unit' | 'unitOrBase' | 'zone' | 'upgrade'
  side?: 'friendly' | 'enemy' | 'any'
  baseSide?: 'enemy' | 'any'
  maxPower?: number
  withKw?: KeywordName
  mustBeDamaged?: boolean
  count?: number            // distinct targets sharing this spec (Collateral Damage: 2)
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
  kw?: KeywordSpec[]
  targets?: TargetSpec[]     // play-time targets (upgrades: attach target is implicit and NOT listed)
  onPlay?: Op[]              // action body; unit/upgrade enter-play effects
  onEnterZone?: Op[]         // fires on play AND every zone entry (targets always auto-picked)
  onAttack?: Op[]
  onAttackBase?: Op[]
  onDefend?: Op[]
  onKill?: Op[]
  startOfTurn?: { cond?: Cond; ops: Op[] }
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
  drawPerTurn: number
  firstTurnDraw: number
  resourcesPerTurn: number
  deckMinSize: number
  maxCopies: number
  upgradePressureInfluence: number
  prisonDecayPerUnit: number
  prisonReleaseThreshold: number
  summoningSickness: boolean
  moveExhausts: boolean
  simultaneousLifeTiebreak: 'actor' | 'active' | 'draw'
}

// ─── In-play state ───────────────────────────────────────────────────────────
export interface Mod {
  p?: number
  h?: number
  armor?: number
  kw?: KeywordSpec
  double?: boolean
  turn?: boolean             // expires at end of turn
  cond?: Cond                // active only while condition holds (checked against owner)
}

export interface UnitInstance {
  id: string
  slug: string
  owner: Seat
  zone: ZoneId
  damage: number
  exhausted: boolean
  enteredTurn: number
  imprisoned: { by: Seat; source: string | null } | null
  upgrades: string[]         // upgrade instance ids
  mods: Mod[]
}

export interface UpgradeInstance {
  id: string
  slug: string
  owner: Seat
  attachedTo: string
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
  turn: number                        // global, increments every turn change
  activeSeat: Seat
  phase: 'setup' | 'resource' | 'main'
  actorSeat: Seat                     // whose action window it is
  setupBanked: [boolean, boolean]     // per-seat: starting resources chosen (setup phase)
  passStreak: number
  resourcedThisTurn: number
  firstPlayer: Seat
  pendingExtraTurn: Seat | null
  influence: number                   // + toward seat 0
  sides: [SideState, SideState]
  units: Record<string, UnitInstance>
  upgrades: Record<string, UpgradeInstance>
  preventBase: [number, number]       // remaining base-damage prevention this turn
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
  | { type: 'setupBank'; cards: string[] }   // setup phase: choose starting resources
  | { type: 'resource'; card: string }
  | { type: 'skipResource' }
  | { type: 'play'; card: string; targets?: TargetRef[] }
  | { type: 'move'; unit: string; to: ZoneId }
  | { type: 'attack'; attacker: string; target: TargetRef }
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
  exhausted: boolean; sick: boolean; imprisoned: boolean
  keywords: string[]
  upgrades: { id: string; slug: string; name: string }[]
}
export interface HandCardView { id: string; slug: string }
export interface SideView {
  name: string; life: number; handCount: number; deckCount: number
  resources: { id: string; slug: string; exhausted: boolean }[]
  discard: { id: string; slug: string }[]
}
export interface PlayerView {
  viewerSeat: Seat | null
  turn: number; phase: 'setup' | 'resource' | 'main'
  activeSeat: Seat; actorSeat: Seat
  influence: number                    // + toward seat 0 (client flips for display)
  thresholds: [number, number]         // win threshold per seat (statics applied)
  sides: [SideView, SideView]
  zones: { units: UnitView[] }[]       // absolute order: [seat0 home, neutral, seat1 home]
  hand: HandCardView[]                 // viewer's own hand
  actions: GameAction[]                // viewer's legal actions right now
  winner: Seat | null
  winReason: string | null
  log: LogLine[]
}

export interface SimResult {
  winner: Seat
  winReason: string
  turns: number
  actions: number
  minInfluence: number
  maxInfluence: number
}
