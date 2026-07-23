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
// Reach (#8), Flying and Untargetable (superseded by Hidden, v3) and Overextend (superseded by
// Scar, decisions 70->94) were CUT. They are gone from this list so a card cannot carry one.
// KEYWORD_NAMES is the ONE source of the keyword vocabulary: KeywordName derives from it, and both
// runtime guards — validate.ts's KEYWORDS and cardfile.ts's KW_NAMES — are built from it (they used
// to be three hand-kept copies a comment begged to "keep in step"). vocabulary-coverage.test.ts
// fails if any name here sits on no card, so a cut that forgets to strip a name can't hide.
export const KEYWORD_NAMES = [
  'guard', 'armor', 'rush', 'ranged',
  'breakthrough', 'cantAttack',
  // v3 keyword suite (docs/rules.md §Keywords; decisions 59-61, 70)
  'scar', 'shielded', 'hidden', 'infiltrate', 'capture', 'sneak',
  // decision 88 (#29): a majority in Neutral / the enemy Home sways the influence track at round end.
  // #125 (decision 115): renamed Politician → Tribune, and the keyword now also swings Influence ±1
  // on every enter/leave of play (cause-blind, net-zero over a life).
  'tribune', 'sentry', 'steadfast',
] as const
export type KeywordName = (typeof KEYWORD_NAMES)[number]
export interface KeywordSpec { k: KeywordName; n?: number }

// ─── Effect DSL ──────────────────────────────────────────────────────────────
export interface Cond {
  influenceAtLeast?: number   // controller's perspective
  influenceAtMost?: number
  selfLifeAtMost?: number
  selfLifeLessThanOpponent?: boolean
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
  /** #104 (Lawbringer): exhaust-only — the entering player picks WHICH enemy in the zone to arrest
   *  (carried on the play/move action, threaded through ctx.entryExhaust) instead of the deterministic
   *  auto-pick. Mandatory when any enemy is eligible: you choose which, not whether. */
  choose?: boolean
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
  /** #107 (Warpath): the controller's LIVE |Influence| (magnitude — sign-independent, so the buff
   *  is a positive pump whether you're ahead or behind). `half` → floor(|Influence| / 2): Warpath
   *  pumps the board by half your Influence, rounded down. */
  | { count: 'influence'; half?: boolean }
  /** #122 (Assassin's Contract): the chosen0 target's REMAINING Health — effHealth − damage, floored
   *  at 0 (a shield token doesn't change it). Read live before a same-action destroy; the caster pays
   *  this much Life via a selfBase damage op. */
  | { count: 'targetRemainingHealth' }
  /** #122 (Assassin's Contract): half the chosen0 target's PRINTED cost, rounded up (ceil(cost/2)).
   *  An X-cost target counts as cost 0 → 0. The Influence its owner is paid (via influenceOwner). */
  | { count: 'targetCostHalf' }
  /** #122 (The Unseen Court): GLOBAL live counts of Exhausted units — filtered off state.units, NOT
   *  ctx.targets. exhaustedEnemyUnits = in-play units the controller does NOT own that are Exhausted
   *  (the Sneak's Influence per Exhausted enemy). allExhaustedUnits = EVERY Exhausted in-play unit,
   *  both sides, EXCEPT the source unit — the court has already tapped itself to Sneak (the exhaust
   *  lands before the ops run), so excluding it keeps an empty board a clean no-op, not self-bleed. */
  | { count: 'exhaustedEnemyUnits' }
  | { count: 'allExhaustedUnits' }
  | { count: 'positiveHope' }
  | { count: 'readiedUnits' }
  | { count: 'newlyExhaustedEnemies' }
  | { count: 'sourceCost' }

export type Op =
  | { op: 'damage'; t: OpTarget | 'enemyBase' | 'selfBase' | 'autoSplash'; n: number | 'linked'; bonusIfDamaged?: number; per?: PerCount; cond?: Cond }  // 'linked' = the amount from the previous linking op (v3, spec §3)  // autoSplash: strongest other enemy unit in the attack target's zone  // per (#85): scale n by a live count (e.g. enemy deaths this round)  // cond (#107 Warpath): the hit fires only while the controller's state holds — Warpath's self-life price is paid only while ahead on Influence
  | { op: 'damageFilter'; f: UnitFilter; n: number; creditsKills?: boolean }  // creditsKills (#107 Crimson Behemoth): the source unit's onKill fires for every unit this AoE fells — friend or foe (decision 74: lethality is the test)
  | { op: 'heal'; t: 'chosen0' | 'selfBase'; n: number; per?: PerCount; cond?: Cond }  // chosen may be unitOrBase; per scales n (PR #71)
  | { op: 'healFromBaseDamage' }  // onAttackBase only: restore controller Life by actual base damage
  | { op: 'healFromDamageTaken' } // onDamage only: restore controller Life by actual damage this unit took
  | { op: 'draw'; n?: number; upTo?: number }  // exactly one of n / upTo. n: draw that many (ignores hand size). upTo (#122 Eclipse): draw until the hand holds upTo cards, measured LIVE at resolution — never discards down; both paths eat decision 33's empty-deck penalty
  | { op: 'lockPlays'; who: 'opponent' | 'controller' }        // #122 (Eclipse): lock a seat out of playing cards from hand this round (opponent = other(controller)); the single gate is getLegalActions, board actions untouched
  | { op: 'discardRandom'; who: 'opponent' | 'controller'; n?: number }  // #122 (Eclipse): seeded RANDOM discard, resolved inline (n default 1) — pulls from state.rngState (the shuffle's PRNG) so replays stay bit-identical; an empty/short hand is a silent no-op (no decision-33 penalty)
  | { op: 'revealHand'; who: 'opponent' | 'controller' }  // #122 (Twilight Scout): a ONE-TIME hand peek. Flips NO live flag — pushes a FROZEN snapshot (the named seat's slugs, captured now) onto the append-only state.reveals ledger, addressed to the caster. Plain data, no rng, fully replay-derived; the "one-time" falls out for free (you see that instant, not the hand as it later changes). Omniscient AI already sees every hand → a deliberate no-op headless.
  /** #122 (Glimpse / Obscure): the pick-from-hand foundation. ENQUEUES a mid-resolution card pick
   *  onto state.pendingChoices — it does NOT resolve inline. who:'controller' (default) queues n
   *  entries for the controller; who:'each' queues n for the controller THEN n for the opponent.
   *  to:'discard' → the chosen card goes to discard; 'deckBottom' → deck.unshift (bottom). n=1 default.
   *  HARD INVARIANT: a choose op is TERMINAL within its op-list — the queue drains AFTER runOps
   *  returns, so no later op in the same effect may read which card was chosen. "Pick a card, then
   *  do X to it" is a real continuation (out of scope). One entry = one atomic pick; a "discard 1,
   *  bottom 1" is two separate ops (two entries). */
  | { op: 'chooseFromHand'; who?: 'controller' | 'each'; to: 'discard' | 'deckBottom'; n?: number }
  | { op: 'influence'; n: number; per?: PerCount; cond?: Cond; ifKilled?: boolean }   // + toward controller; per scales n (PR #70/#71); cond gates the gain (#79 Radiant Aegis); ifKilled (#107 Flameblade Raider): onDeath-only — the gain fires only if this unit felled a unit in the same combat it died in (a trade counts)
  | { op: 'influenceOpponent'; n: number; per?: PerCount }  // opponent loses Hope
  | { op: 'influenceOwner'; t: 'chosen0' | 'chosen1'; n: number; per?: PerCount }   // #122 (Assassin's Contract): grant the CHOSEN target's OWNER (not the controller) influence, n scaled by `per` (targetCostHalf). Kill an enemy unit and the ENEMY's Influence rises; kill your own and you gain. Owner read live, before any same-action destroy.
  | { op: 'buff'; t: OpTarget | UnitFilter; p?: number; h?: number; armor?: number; dur: 'round' | 'perm'; cond?: Cond; per?: PerCount }  // per (#104 Dawnspear Paladin): scale the granted p/h/armor by a live count (e.g. +1 Power PER attacker, onDefend)
  | { op: 'setPower'; t: OpTarget; n: number; per?: PerCount; dur: 'round' | 'perm' }
  | { op: 'double'; t: OpTarget | UnitFilter; rounds?: number }  // v3 (Unchained Rage): filter-wide, multi-round
  | { op: 'grant'; t: OpTarget | UnitFilter; kw: KeywordSpec; dur: 'round' | 'perm' }
  | { op: 'grantTrigger'; t: OpTarget; key: 'onAttackBase' | 'onKill'; ops: Op[]; dur: 'round' | 'perm' }
  | { op: 'destroy'; t: OpTarget; mustBeDamaged?: boolean }
  | { op: 'destroyUpgrade' }                                      // target: chosen upgrade
  | { op: 'ready'; side: 'friendly'; t?: 'chosen0'; remember?: 'readiedUnits' }  // with t: readies only that chosen unit (Final Onslaught)
  | { op: 'extraAction' }                                         // the same player immediately takes another action (decision 43)
  | { op: 'preventBase'; n: number }
  | { op: 'wardHome' }        // #88 (Devout Intervention): arm a one-shot ward — the next DAMAGING attack on the controller's Home is fully prevented; spends only on real prevention (a feint leaves it armed), and never blocks direct-damage spells
  | { op: 'wardBlocker' }     // #88 (Devout Intervention): arm a one-shot ward — the controller's next blocking unit takes no combat damage this fight, yet still deals its counter
  | { op: 'removeNegative'; t: OpTarget }
  | { op: 'clearDamage'; t: OpTarget }
  | { op: 'countBuff'; t: OpTarget; per: { color?: Color; side: 'all' | 'friendly' | 'enemy'; zone: 'ofTarget'; other?: boolean }; p: number; dur: 'round' | 'perm' }  // v3 (Reckless mode B): +p per matching unit                            // v3 (Blood Rush): remove ALL damage; the amount becomes the linked value
  | { op: 'capture'; t: OpTarget; by?: 'chosen0'; income?: number }  // v3: take the enemy unit under the source unit — or a chosen warden; income = influence per round while held (PR #53)
  | { op: 'exhaust'; t: OpTarget | 'auto' | UnitFilter; auto?: AutoPick; cond?: Cond; remember?: 'newlyExhaustedEnemies' }  // v3 yellow: order a unit to stand down. #104 (Lawbringer): t:'auto' + auto:{scope:'enteredZone'} arrests the strongest READY enemy in the zone the source just entered — the deterministic single-target auto-pick that backs onEnterZone triggers
  | { op: 'freeCaptives' }                                        // v3 yellow: your captured units return, READY (decision 73)
  | { op: 'move'; t: OpTarget; to: 'chosenZone' }                 // decision 72: relocate the unit — exhausted or not, exhausting nothing
  | { op: 'damageSourceOwner'; n: number; per?: PerCount }        // an upgrade's dead host controller loses Life
  | { op: 'releaseCaptivesHomeWounded' }                           // release this dying unit's captives to their owners' Homes at 1 remaining Health
  | { op: 'attackTax'; n: number; rounds: number }                // PR #39 (Unchained Rage): each of your attacking units cedes n influence
  | { op: 'doom'; t: 'chosen0' }                                  // PR #38 (Final Onslaught): after the extra action, the unit and its attack's victims die
  | { op: 'xSurge'; t: 'chosen0' }                                // issue #45 (Reckless Abandon): lose X influence; +X power and Breakthrough this round
  | { op: 'splashReap'; n: number; influence: number }            // PR #46 (Fiery Impaler): on attack, n damage to the declared splash victim; +influence if it dies
  | { op: 'createCopies'; n: number; p?: number; h?: number; kw?: KeywordSpec[]; ifOnlyCopy?: boolean }  // #69 (Radiant Citadel): summon n ready copies of the source unit's card in the controller's Home. p/h/kw shape the copies' body (omitted = the printed card). ifOnlyCopy: fires only while the controller owns exactly one copy — the recursion fuse. Created units are not deck cards; they vanish when they die.
  | { op: 'moveDamage'; from: OpTarget; to: OpTarget }  // #104 (Censer of Purity): lift the chosen amount (ctx.amount) of damage off `from` and onto `to`, capped at min(from's damage, to's remaining Health — it cannot fall below 0). A transfer of existing wounds, not a fresh hit: armor and shields never touch it. Reaching exactly 0 Health kills `to` via the normal op-tail lethality path.
  | { op: 'lastStand'; moveInfluence: number; attackLife: number; endLife: number; endInfluence: number }  // #107 (Last Stand): register a round-scoped pact for the controller — their units don't exhaust from acting this round; each MOVE cedes `moveInfluence`, each attacking unit costs `attackLife` Life, and at end of round the controller loses `endLife` Life and `endInfluence` Influence. Everything stacks (a second cast bills independently); cleared at the round boundary.
  | { op: 'reckoning'; n: number; influencePerKill: number; killThreshold: number; shortfallLife: number }  // #122 (Midnight Reckoning): a self-contained AoE finisher. Damage EVERY unit — both sides, the caster's own included (Griff: "all units," literal) — by n; the CONTROLLER gains influencePerKill per unit the sweep fells (decision 74: a kill is a kill, lethality is the test — friend and foe); then if fewer than killThreshold fell, the opponent's base takes shortfallLife via the standard ward-respecting damageBase (the same spell-to-face path a `damage enemyBase` burn uses — respects preventBase, does NOT pierce). Everything resolves inline: "gained less than 7 Influence" is IDENTICALLY "fewer than 7 units died" (each kill = +1), a count the op holds — so it never touches Cond and needs no influence-introspection primitive. An ACTION has no body (ctx.sourceUnit undefined), which is why this can't reuse damageFilter's creditsKills/onKill (those fire on a UNIT's def). DELIBERATELY not generalized (one card, tightly-coupled internals); if a second "AoE that pays per body" ever appears, the clean extraction is an `influencePerKill` field on damageFilter.

export type Static =
  /** pPerHostPip (#80, Subjugate): power scaled by the CARRIER's pip count — attached scope only,
   *  computed live so a salvaged upgrade (decision 67) re-fits its new host.
   *  h (#86, Resolve Banner): flat Health granted to the affected unit — the first upgrade-granted
   *  Health. Read live through effHealth, so detaching the upgrade recomputes lethality at once. */
  | { s: 'aura'; scope: 'otherFriendly' | 'friendlyInZone' | 'enemyInZone' | 'attached'; p?: number; setPower?: number; pPerHostPip?: number; armor?: number; h?: number; kw?: KeywordSpec; cond?: Cond }
  | { s: 'oppThreshold'; n: number }      // opponent's win threshold raised by n

/** What a play action must supply as chosen targets, in order. */
export interface TargetSpec {
  t: 'unit' | 'unitOrBase' | 'zone' | 'upgrade'
  side?: 'friendly' | 'enemy' | 'any'
  baseSide?: 'enemy' | 'any'
  maxPower?: number
  maxCost?: number          // #87 (Binding Light): the target's printed cost must be ≤ this
  /** #104 (Inquisitor): an OR of caps — the unit qualifies if it satisfies ANY listed cap
   *  (effective Power ≤ maxPower, printed Cost ≤ maxCost, or remaining Health ≤ maxRemainingHealth).
   *  ANDs with the other spec constraints (side, protections); the caps inside it are the OR. */
  anyOf?: { maxPower?: number; maxCost?: number; maxRemainingHealth?: number }
  withKw?: KeywordName
  mustBeDamaged?: boolean
  damagedOrMaxHealth?: number  // PR #53 (Prison Warrant): legal if damaged OR effective health ≤ n
  count?: number            // distinct targets sharing this spec (Collateral Damage: 2)
  upTo?: boolean            // v3 (Volcanic Slam): 1..count targets acceptable instead of exactly count
  sameZone?: boolean        // v3 (Volcanic Slam): all unit targets of this spec share one zone
  adjacentToFirst?: boolean // decision 72 (Reckless Charge): this zone must sit adjacent to the first chosen unit's zone
  differentFromFirst?: boolean // this zone must differ from the first chosen unit's current zone
}

// ─── Card definitions ────────────────────────────────────────────────────────
/** #122 (Umbral Colossus / The Unseen Court): a unit's base Power/Health read LIVE from a board count,
 *  REPLACING the printed stat. 'handSize' = cards in the owner's hand; 'discardUnitsBoth' = unit cards
 *  across BOTH discard piles. See effPower/effHealth (helpers.ts) — the count is the base, mods/auras
 *  compose on top of it exactly as they do on a printed stat. */
export type BaseCount = 'handSize' | 'discardUnitsBoth'

export interface CardDef {
  slug: string
  name: string
  /** #83 catalog code — free-form designer shorthand (e.g. "Y-12"); display/reference only, never read by the engine */
  code?: string
  color: Color
  type: CardType
  cost: number
  power?: number
  health?: number
  /** #122: derive base Power/Health from a live count (see BaseCount) INSTEAD of a printed stat.
   *  Units only. When set, the count REPLACES the printed value in effPower/effHealth (a created
   *  copy's own body still wins); the printed field, if present at all, is an ignored fallback. */
  powerFromCount?: BaseCount
  healthFromCount?: BaseCount
  text: string
  /** v3 (decision 69): presence requirement per color — never a payment. Also defines what this card provides when banked (1 per distinct color). */
  pips?: Color[]
  /** v3 Sneak payload (decision 60): exhaust-activated, targets constrained to the unit's zone */
  sneak?: { targets?: TargetSpec[]; ops: Op[] }
  /** #104 (Censer of Purity): an exhaust-activated ability driven by the `activate` action. Unlike
   *  Sneak/Ranged it carries a player-chosen numeric AMOUNT (entered like an X cost) alongside its
   *  target(s). `amount: 'moveDamage'` = the picker is capped by the moveDamage op's rule
   *  (min of the source's damage and this unit's remaining Health); legal.ts enumerates 1..cap. */
  activated?: { targets?: TargetSpec[]; amount?: 'moveDamage'; ops: Op[] }
  /** v3 modal actions (spec §3, PR #13): the player declares one mode at cast time; each mode owns its targets+ops.
   *  `cond` (#87 Binding Light) gates a mode's LEGALITY — it is only offered/playable while the condition holds. */
  modes?: { label: string; text?: string; targets?: TargetSpec[]; ops: Op[]; cond?: Cond }[]
  /** cost is printed "X": the player declares how many resources to pay at cast (issue #45) */
  xCost?: boolean
  kw?: KeywordSpec[]
  /** #107 (Worldrender): the combat damage THIS unit deals to an enemy unit ignores that enemy's
   *  Shield and Armor — its full Power lands, and the shield token is NOT consumed (it does not
   *  remove the enemy's keywords; other attackers still meet the shield/armor). Read live in combat;
   *  never changes how Shield/Armor work for any other unit. */
  piercesArmorShield?: boolean
  /** #122 (Phantom Duelist): this unit takes NO reciprocal combat damage from any combatant it strictly
   *  out-powers (compared on effective Power). Both directions (as attacker and as blocker) and every
   *  pairing; the PRIMARY hit it takes as a passive declared target is NOT dodged (a glass cannon still
   *  dies to a gang that sieges it). A per-card boolean, mirroring piercesArmorShield — not a keyword. */
  dodgesWeakerCombatant?: boolean
  /** #80 (Subjugate): which side's units this upgrade attaches to — absent = friendly, the
   *  standing law for every other upgrade. Per-card; enemy attach is never the default.
   *  #122 (Silence the Song): `any` = either side — attach it to your OWN unit or the enemy's.
   *  #86 (Resolve Banner): `pass` = resource cost to re-attach this upgrade to another friendly
   *  unit in the same zone as an action (absent = not passable). `salvage: 'freeFriendly'` =
   *  when orphaned it can be picked up only by a friendly unit, for 0 (an opponent cannot);
   *  absent = the decision-67 default (either side, full cost + pips).
   *  #122 (Wither): `consumedOnHostDeath` = when the host DIES, this upgrade is discarded WITH it
   *  instead of orphaning (decision 67) — a rot curse doesn't survive the thing it killed and jump
   *  to a fresh victim. Already-applied perm mods still stand; only the gear is consumed. */
  attach?: { side: 'friendly' | 'enemy' | 'any'; pass?: number; salvage?: 'freeFriendly'; consumedOnHostDeath?: boolean }
  targets?: TargetSpec[]     // play-time targets (upgrades: attach target is implicit and NOT listed)
  onPlay?: Op[]              // action body; unit/upgrade enter-play effects
  onEnterZone?: Op[]         // fires on play AND every zone entry (targets always auto-picked)
  onAttack?: Op[]
  onAttackBase?: Op[]
  onDefend?: Op[]
  onDamage?: Op[]            // fires after this unit takes actual (post-Armor/Shield) damage
  onKill?: Op[]
  onDeath?: Op[]             // PR #54: fires as the unit dies (controller = owner)
  /** #122 (Silence the Song): fires when the HOST unit this upgrade is attached to DIES — the ops
   *  run for the UPGRADE's owner (the caster who played it), NOT the host's owner. Upgrade-only, no
   *  chosen targets (there is no action payload at a host's death). */
  onHostDeath?: Op[]
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
  hopeWinThreshold: number
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
  /** decision 41: units enter ready — false by default; true restores can't-act-on-entry */
  summoningSickness: boolean
  moveExhausts: boolean
  /** decision 41: whether Rush's exhaust waiver ALSO covers an attack (default false and unchanged by
   *  #105 — Rush waives the free MOVE only, never lets a unit attack early). When true, only the
   *  entry-round attack is covered; #105 did not extend this to every round. */
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
  setPower?: number
  h?: number
  armor?: number
  kw?: KeywordSpec
  double?: boolean
  round?: boolean            // expires at end of round
  rounds?: number            // v3: expires after this many round-ends (2 = survives one, dies at the second)
  cond?: Cond                // active only while condition holds (checked against owner)
  triggers?: { key: 'onAttackBase' | 'onKill'; ops: Op[] }[]
}

export interface UnitInstance {
  id: string
  slug: string
  owner: Seat
  zone: ZoneId
  damage: number
  exhausted: boolean
  enteredRound: number
  /** #105 (supersedes decision 41's entry-round gate): Rush waives the move-exhaust for the FIRST move
   *  of EACH round — this flag, reset when the unit readies at round start, is what makes it per-round */
  movedThisRound: boolean
  upgrades: string[]         // upgrade instance ids
  mods: Mod[]
  /** RETIRED (decisions 70→94, superseded by Scar): always 0. Kept on the shape for replay
   *  compatibility only — the archived #97/#98 game logs carry it. Nothing writes it any more. */
  overextendedBy: number
  /** v3 Shielded: entered with a shield token; first damage instance is prevented and this flips */
  shielded: boolean
  /** Steadfast pays once per round, even when a unit defends more than once. */
  steadfastDefendedRound?: number
  /** #69 (createCopies): minted by an effect, never a deck card. Present = the unit vanishes on
   *  death (no discard). p/h/kw, when set, replace the printed body/keyword line. */
  created?: { p?: number; h?: number; kw?: KeywordSpec[] }
  /** #88 (Devout Intervention, Ward 2): stamped on the controller's next blocker — this unit takes
   *  no damage in the coming combat resolution (it still deals its counter). One fight, then cleared. */
  blockWard?: boolean
  /** #107 (Flameblade Raider): set true when this unit fells a unit (any onKill firing). Read by an
   *  onDeath `ifKilled` influence op so a unit that dies dealing a lethal blow — a trade — is credited.
   *  Cleared at every window advance, so it only ever reflects a kill in the CURRENT action. */
  justKilled?: boolean
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

/** #122 (pick-from-hand foundation): one queued single-card pick — the FOURTH mid-resolution pause
 *  (after bank/startStep, intercept/pendingAttack, block/pendingAttack). ONE entry per card; count is
 *  expressed by enqueueing N entries, never a count field, so each answer (a resolveChoice naming a
 *  card id) stays atomic and a replay is just a sequence of those ids — no continuation blob. */
export interface PendingChoice {
  seat: Seat                          // whose hand this pick comes from (the chooser)
  to: 'discard' | 'deckBottom'        // where the chosen card goes
  srcLabel: string                    // the card that opened the pick (for the log / demo prompt)
}

/** #122 (Twilight Scout): one frozen hand-peek snapshot on state.reveals (append-only). */
export interface RevealEntry {
  seat: Seat        // who may LOOK — the caster the snapshot is addressed to (viewFor filters on this)
  hand: string[]    // the OTHER seat's card slugs, captured the instant the peek resolved (frozen)
  round: number     // state.round at capture
}

export interface GameState {
  rngState: number
  rules: RulesConfig
  cardSet: CardSet
  cardOf: Record<string, string>      // instance id → slug
  round: number                       // global, increments once per full round
  initiative: Seat                    // holder acts first each round; carries over unless claimed
  phase: 'setup' | 'bank' | 'loop' | 'intercept' | 'block' | 'choose' | 'splash'
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
  /** #107 (Last Stand): active pacts, one entry per cast this round. While the seat has an entry its
   *  units don't exhaust from acting; each of that seat's MOVES cedes `moveInfluence`, each attacking
   *  unit costs `attackLife` Life; at round end the seat loses `endLife` Life + `endInfluence`
   *  Influence per entry. Entries stack and are cleared at the round boundary. */
  lastStands: { seat: Seat; moveInfluence: number; attackLife: number; endLife: number; endInfluence: number }[]
  /** Final Onslaught (#107): after the granted extra action resolves, the readied unit is immolated —
   *  it ALWAYS dies (the sacrifice is the point), and Y = its remaining Health pours over every other
   *  unit in its zone, friend and foe alike. stage: fresh (created this action) → waiting → spent
   *  (executes when no attack pends). */
  doom: { unit: string; seat: Seat; stage: 'fresh' | 'waiting' | 'spent' } | null
  mulligans: [number, number]         // per-seat mulligan count (setup phase, decision 32)
  passStreak: number
  pendingExtraAction: Seat | null     // decision 43: this seat takes another action after the current resolves
  pendingAttack: {                    // phase 'intercept': the declared attack awaiting the defender
    // overextend: RETIRED — always []; retained for replay compatibility (see GameAction 'attack')
    seat: Seat; attackers: string[]; target: TargetRef; overextend: string[]
  } | null
  /** #122 (pick-from-hand): phase 'choose' drains this FIFO queue, one resolveChoice per entry.
   *  [] when idle. Mirrors the combat pause — parked plain data, answered identically by the AI
   *  policy and the demo UI, so replays stay deterministic (the #97/#98 corpus guarantee). */
  pendingChoices: PendingChoice[]
  /** #122: the seat whose action opened the current choose queue — actorSeat is restored to it and
   *  the normal advanceWindow runs once the last pick resolves (the play "completes" only then). */
  chooseOpener: Seat | null
  /** #128 (Breakthrough splash + chain, amends decision 102): phase 'splash' — after a Breakthrough
   *  attacker fells its declared target, the leftover chains, and the DEFENDER (other(seat)) picks
   *  each redirect target one link at a time. Parked plain data, the fifth mid-resolution pause
   *  (after bank/startStep, intercept, block, choose). `leftover` = the breakthrough damage still to
   *  place; `pierced` (#107) = the whole spill ignores Shield/Armor; `contributors` = the attacker
   *  ids whose breakthrough fed the pool (they credit onKill on each chained defeat — decision 74).
   *  null when idle. Cleared within the same action that combat resolves — never survives a round. */
  pendingSplash: {
    seat: Seat; zone: ZoneId; leftover: number; pierced: boolean; contributors: string[]
  } | null
  /** Independent Hope scores, one per player. Values may exceed the win/loss band; checkWin ends the game. */
  hope: [number, number]
  /** @deprecated Shared-track compatibility for old replays and test fixtures. New code reads `hope`. */
  influence: number
  sides: [SideState, SideState]
  units: Record<string, UnitInstance>
  upgrades: Record<string, UpgradeInstance>
  preventBase: [number, number]       // remaining base-damage prevention this round
  /** #88 (Devout Intervention): per-seat one-shot wards, cleared at the round boundary.
   *  homeWard — the next damaging ATTACK on this seat's Home is fully prevented (spends only on
   *  real prevention). blockerWard — this seat's next blocker is stamped `blockWard`. */
  homeWard: [boolean, boolean]
  blockerWard: [boolean, boolean]
  /** #122 (Eclipse): per-seat, per-round card-play lock. While true the seat may play NO cards from
   *  its hand — getLegalActions emits none, and playCard rejects defensively. Board actions (attacks,
   *  moves, activate/Sneak, claim, pass) are untouched. Cleared at the round boundary, so the lock
   *  lasts exactly "this Round" (same rollover as homeWard/blockerWard). */
  cardPlayLock: [boolean, boolean]
  /** #85 (Aura of Resolve): the per-round death ledger — units that have died this round, indexed
   *  by OWNER seat (created copies that vanish are counted). Cleared at the round boundary. */
  deaths: [number, number]
  /** #122 (Twilight Scout): the append-only hand-peek ledger. Each entry is a FROZEN snapshot the
   *  instant a `revealHand` op resolved — NOT a live reveal flag, so it captures that moment and
   *  never re-reads the hand as it changes. Plain data (slugs, no instance ids), no rng: fully
   *  replay-derived. Never cleared (the peek is a historical fact); viewFor filters it to `seat`. */
  reveals: RevealEntry[]
  winner: Seat | null
  winReason: 'life' | 'hope' | 'concede' | null
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
  | { type: 'play'; card: string; targets?: TargetRef[]; zone?: ZoneId; mode?: number; x?: number; exhaust?: string }  // zone: v3 Infiltrate; mode: v3 modal cards; x: declared X cost (issue #45); exhaust (#104 Lawbringer): the enemy unit id to arrest in the zone this unit enters (its Home)
  | { type: 'activate'; unit: string; targets?: TargetRef[]; amount?: number }   // v3 Sneak (decision 60) / Ranged volley (decision 80); #104 Censer: amount = damage points to move
  | { type: 'releaseCaptive'; unit: string }                              // RETIRED (decision 92): kept for replay compat; always rejected
  | { type: 'block'; pairs: { blocker: string; onto: string }[]; retaliationOrder?: string[] }  // v3 combat: defender pairs blockers (empty = let it through); pour order = pair order. #84: retaliationOrder aims the target's DIVIDED strike-back — ordered attacker ids; absent → highest-power-first
  | { type: 'attachOrphan'; upgrade: string; unit: string }               // v3 (decision 67): salvage an orphaned upgrade at full cost+pips
  | { type: 'passUpgrade'; upgrade: string; unit: string }                // #86 (Resolve Banner): move an attached, passable upgrade to another friendly unit in its zone — an action costing attach.pass, repeatable
  | { type: 'attack'; attackers: string[]; target: TargetRef; overextend?: string[]; splash?: { by: string; unit: string }[] }  // splash: per-attacker chosen victims for splashReap triggers (PR #46, decision 24-compatible) // decision 42: 1+ attackers, one zone. overextend: RETIRED (70→94, superseded by Scar) — the field is kept so archived #97/#98 replays still parse, but any non-empty declaration is now always rejected
  | { type: 'move'; unit: string; to: ZoneId; exhaust?: string }  // exhaust (#104 Lawbringer): the enemy unit id to arrest in the destination zone on arrival
  | { type: 'claimInitiative' }              // decision 40: take the token, leave the round
  | { type: 'intercept'; unit: string }      // decision 42: redirect the attack to a ready unit
  | { type: 'declineIntercept' }             // decision 42: let the attack hit its declared target
  | { type: 'resolveChoice'; card: string }  // #122 (pick-from-hand): phase 'choose' — name the chosen hand-card id
  | { type: 'splash'; target: TargetRef }    // #128 (Breakthrough chain): phase 'splash' — the defender names where the leftover lands (own unit in the zone, or their base in their Home)
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
  exhausted: boolean; rushFreeMove: boolean
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
  phase: 'setup' | 'bank' | 'loop' | 'intercept' | 'block' | 'choose' | 'splash'
  initiative: Seat
  actorSeat: Seat
  outOfRound: [boolean, boolean]
  claimedThisRound: boolean
  cardPlayLock: [boolean, boolean]     // #122 (Eclipse): per-seat lock — this seat plays no cards from hand this round
  pendingAttack: { attackers: string[]; target: TargetRef } | null
  /** #128 (Breakthrough chain): phase 'splash' — the leftover the defender must place, and the legal
   *  places it may land (this viewer's own in-zone units + their base if the siege is in their Home).
   *  The demo prompts the defender from this; null when no chain is pending. */
  pendingSplash: {
    leftover: number
    targets: ({ kind: 'unit'; id: string } | { kind: 'base'; seat: Seat })[]
  } | null
  hope: [number, number]               // independent Hope scores, in seat order
  /** @deprecated Compatibility projection: Hope[0] − Hope[1]. */
  influence: number
  thresholds: [number, number]         // win threshold per seat (statics applied)
  sides: [SideView, SideView]
  zones: { units: UnitView[]; orphans: OrphanView[] }[]   // absolute order: [seat0 home, neutral, seat1 home]
  hand: HandCardView[]                 // viewer's own hand
  reveals: RevealEntry[]               // #122 (Twilight Scout): hand-peek snapshots addressed to THIS viewer (frozen; the caster's alone)
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
  minHope: [number, number]
  maxHope: [number, number]
}
