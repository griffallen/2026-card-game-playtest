import type { CardDef, CardSet, Op, Static, TargetSpec } from './types.ts'

const KEYWORDS = new Set(['guard', 'armor', 'rush', 'ranged', 'reach', 'flying', 'breakthrough', 'overextend', 'cantAttack', 'untargetable', 'scar', 'shielded', 'hidden', 'infiltrate', 'capture', 'sneak', 'politician'])
const OPS = new Set(['damage', 'damageFilter', 'heal', 'draw', 'influence', 'imprison', 'buff', 'double', 'grant', 'destroy', 'destroyUpgrade', 'ready', 'extraAction', 'preventBase', 'wardHome', 'wardBlocker', 'removeNegative', 'capture', 'clearDamage', 'countBuff', 'exhaust', 'freeCaptives', 'move', 'attackTax', 'doom', 'xSurge', 'splashReap', 'createCopies'])
const OP_TARGETS = new Set(['chosen0', 'chosen1', 'self', 'attached', 'attackTarget', 'autoSplash', 'enemyBase', 'selfBase', 'auto'])
const STATICS = new Set(['aura', 'oppThreshold', 'imprisonWatcher'])
const AURA_SCOPES = new Set(['otherFriendly', 'friendlyInZone', 'enemyInZone', 'attached'])
const TARGET_KINDS = new Set(['unit', 'unitOrBase', 'zone', 'upgrade'])
const COND_KEYS = new Set(['influenceAtLeast', 'influenceAtMost', 'selfLifeAtMost'])
const TRIGGER_KEYS = ['onPlay', 'onEnterZone', 'onAttack', 'onAttackBase', 'onDefend', 'onKill', 'onDeath'] as const

const isInt = (v: unknown, lo = -99, hi = 99) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi

/**
 * Structural validation for card definitions — the wall between admin edits and the engine.
 * Returns human-readable errors ([] = safe). Anything that passes here cannot crash a game.
 */
export function validateCardSet(cards: CardSet): string[] {
  const errors: string[] = []
  const err = (slug: string, msg: string) => errors.push(`${slug}: ${msg}`)

  for (const [slug, def] of Object.entries(cards)) {
    if (def.slug !== slug) err(slug, `slug mismatch (${def.slug})`)
    if (!def.name?.trim()) err(slug, 'missing name')
    if (!['red', 'yellow', 'purple', 'neutral'].includes(def.color)) err(slug, `bad color ${def.color}`)
    if (!['unit', 'action', 'upgrade'].includes(def.type)) err(slug, `bad type ${def.type}`)
    if (!isInt(def.cost, 0, 30)) err(slug, `bad cost ${def.cost}`)
    for (const c of def.pips ?? []) {
      if (!['red', 'yellow', 'purple'].includes(c)) err(slug, `bad pip color ${c}`)
    }
    if ((def.pips?.length ?? 0) > 5) err(slug, `too many pips (${def.pips!.length})`)
    if (def.type === 'unit') {
      if (!isInt(def.power, 0, 99)) err(slug, `unit needs power 0–99 (got ${def.power})`)
      if (!isInt(def.health, 1, 99)) err(slug, `unit needs health 1–99 (got ${def.health})`)
    } else if (def.power !== undefined || def.health !== undefined) {
      err(slug, `${def.type}s cannot have power/health`)
    }

    for (const kw of def.kw ?? []) {
      if (!KEYWORDS.has(kw.k)) err(slug, `unknown keyword ${kw.k}`)
      if (kw.n !== undefined && !isInt(kw.n, 0, 99)) err(slug, `bad keyword value ${kw.k} ${kw.n}`)
    }

    // #80 (Subjugate): attach side — upgrades only, friendly|enemy
    // #86 (Resolve Banner): optional pass cost + friendly-only salvage rule
    if (def.attach !== undefined) {
      if (def.type !== 'upgrade') err(slug, 'attach is only for upgrades')
      if (!['friendly', 'enemy'].includes(def.attach?.side as string)) err(slug, `bad attach side ${def.attach?.side}`)
      if (def.attach.pass !== undefined && !isInt(def.attach.pass, 0, 30)) err(slug, `bad attach pass ${def.attach.pass}`)
      if (def.attach.salvage !== undefined && def.attach.salvage !== 'freeFriendly') err(slug, `bad attach salvage ${def.attach.salvage}`)
    }

    const chosenSlots = (def.targets ?? []).reduce((s, t) => s + (t.count ?? 1), 0)
    for (const t of def.targets ?? []) errors.push(...validateTargetSpec(slug, t))

    for (const key of TRIGGER_KEYS) {
      const ops = def[key]
      if (!ops) continue
      if (def.type === 'action' && key !== 'onPlay') err(slug, `actions cannot have ${key}`)
      for (const op of ops) errors.push(...validateOp(slug, op, def, chosenSlots, key))
    }
    if (def.startOfRound) {
      if (def.type === 'action') err(slug, 'actions cannot have startOfRound')
      for (const k of Object.keys(def.startOfRound.cond ?? {})) {
        if (!COND_KEYS.has(k)) err(slug, `unknown condition ${k}`)
      }
      // startOfRound ops cannot use chosen targets — there is no action payload at round start
      for (const op of def.startOfRound.ops) {
        errors.push(...validateOp(slug, op, def, 0, 'startOfRound'))
      }
    }
    if (def.endOfRound) {
      if (def.type === 'action') err(slug, 'actions cannot have endOfRound')
      for (const k of Object.keys(def.endOfRound.cond ?? {})) {
        if (!COND_KEYS.has(k)) err(slug, `unknown condition ${k}`)
      }
      for (const op of def.endOfRound.ops) {
        errors.push(...validateOp(slug, op, def, 0, 'endOfRound'))
      }
    }
    for (const st of def.statics ?? []) errors.push(...validateStatic(slug, st))
    // v3 modal cards (PR #13): each mode carries its own targets; #87 adds an optional legality `cond`
    for (const mode of def.modes ?? []) {
      for (const t of mode.targets ?? []) errors.push(...validateTargetSpec(slug, t))
      for (const k of Object.keys(mode.cond ?? {})) if (!COND_KEYS.has(k)) err(slug, `unknown condition ${k}`)
    }
  }
  return errors
}

function validateTargetSpec(slug: string, t: TargetSpec): string[] {
  const errors: string[] = []
  if (!TARGET_KINDS.has(t.t)) errors.push(`${slug}: unknown target kind ${t.t}`)
  if (t.count !== undefined && !isInt(t.count, 1, 4)) errors.push(`${slug}: bad target count`)
  if (t.maxPower !== undefined && !isInt(t.maxPower, 0, 99)) errors.push(`${slug}: bad maxPower`)
  if (t.maxCost !== undefined && !isInt(t.maxCost, 0, 30)) errors.push(`${slug}: bad maxCost`)
  if (t.damagedOrMaxHealth !== undefined && !isInt(t.damagedOrMaxHealth, 0, 99)) errors.push(`${slug}: bad damagedOrMaxHealth`)
  if (t.withKw && !KEYWORDS.has(t.withKw)) errors.push(`${slug}: unknown withKw ${t.withKw}`)
  return errors
}

function validateOp(slug: string, op: Op, def: CardDef, chosenSlots: number, where: string): string[] {
  const errors: string[] = []
  const err = (msg: string) => errors.push(`${slug} [${where}]: ${msg}`)
  if (!OPS.has(op.op)) { err(`unknown op ${(op as { op: string }).op}`); return errors }

  const checkTargetRef = (t: unknown) => {
    if (typeof t === 'string') {
      if (!OP_TARGETS.has(t)) err(`unknown op target ${t}`)
      if (t === 'chosen0' && chosenSlots < 1) err('references chosen0 but the card declares no targets')
      if (t === 'chosen1' && chosenSlots < 2) err('references chosen1 but the card declares fewer than 2 targets')
      if ((t === 'self' || t === 'attached') && def.type === 'action') err(`${t} is meaningless on an action`)
      if (t === 'attackTarget' || t === 'autoSplash') {
        if (where !== 'onAttack' && where !== 'onAttackBase') err(`${t} only makes sense in attack triggers`)
      }
    } else if (t && typeof t === 'object') {
      const f = t as { side?: string; zone?: string }
      if (!['friendly', 'enemy', 'all'].includes(f.side ?? '')) err(`filter needs side (got ${f.side})`)
      if (f.zone && !['sameAsSelf', 'chosenZone', 'adjacentToSelf', 'all', 'controllerHome'].includes(f.zone)) err(`bad filter zone ${f.zone}`)
      if (f.zone === 'chosenZone' && !(def.targets ?? []).some(ts => ts.t === 'zone')) err('chosenZone filter without a zone target')
    } else {
      err('missing op target')
    }
  }

  // PR #70/#71: count-scaled `per` on influence/heal. 'attackers' only reads a count in onDefend;
  // 'units' reuses the same object-filter validation the damageFilter/exhaust ops use.
  const checkPer = (per: unknown) => {
    if (per === undefined) return
    const p = per as { count?: string; f?: unknown }
    if (p.count === 'attackers') {
      if (where !== 'onDefend') err("per:{count:'attackers'} only counts in onDefend")
    } else if (p.count === 'units') {
      checkTargetRef(p.f)
    } else if (p.count === 'deathsThisRound') {   // #85: the per-round death ledger
      if (!['friendly', 'enemy'].includes((p as { side?: string }).side ?? '')) err("per:{count:'deathsThisRound'} needs side friendly|enemy")
    } else err(`bad per count ${String(p.count)}`)
  }

  switch (op.op) {
    case 'damage': checkTargetRef(op.t); if (op.n !== 'linked' && !isInt(op.n, 0)) err('bad n'); if (op.bonusIfDamaged !== undefined && !isInt(op.bonusIfDamaged, 1, 10)) err('bad bonusIfDamaged'); checkPer(op.per); break
    case 'capture': checkTargetRef(op.t); break
    case 'clearDamage': checkTargetRef(op.t); break
    case 'countBuff': checkTargetRef(op.t); if (!isInt(op.p, 1, 10)) err('bad countBuff p'); break
    case 'exhaust': checkTargetRef(op.t); break
    case 'damageFilter': checkTargetRef(op.f); if (!isInt(op.n, 0)) err('bad n'); break
    case 'heal': if (op.t !== 'selfBase') checkTargetRef(op.t); if (!isInt(op.n, 0)) err('bad n'); checkPer(op.per); break
    case 'draw': if (!isInt(op.n, 1, 10)) err('bad draw count'); break
    case 'influence':
      if (!isInt(op.n, -20, 20) || op.n === 0) err('bad influence amount')
      checkPer(op.per)
      for (const k of Object.keys(op.cond ?? {})) if (!COND_KEYS.has(k)) err(`unknown condition ${k}`)   // #79: gated influence
      if (op.ifKilled !== undefined) {   // #107: the trade bonus reads a snapshot only the onDeath path supplies
        if (typeof op.ifKilled !== 'boolean') err('ifKilled must be true/false')
        else if (where !== 'onDeath') err('ifKilled only fires in onDeath (it credits a unit that dies dealing a lethal blow)')
      }
      break
    case 'imprison':
      if (op.t === 'auto') {
        if (!op.auto && !op.f) err('auto imprison needs auto or f')
        if (op.auto && !['targetZone', 'otherZone', 'eachZone', 'enteredZone'].includes(op.auto.scope)) err(`bad auto scope`)
      } else checkTargetRef(op.t)
      break
    case 'buff': {
      checkTargetRef(op.t)
      if (op.p === undefined && op.h === undefined && op.armor === undefined) err('buff changes nothing')
      for (const v of [op.p, op.h, op.armor]) if (v !== undefined && !isInt(v)) err('bad buff value')
      if (!['round', 'perm'].includes(op.dur)) err('buff needs dur round|perm')
      for (const k of Object.keys(op.cond ?? {})) if (!COND_KEYS.has(k)) err(`unknown condition ${k}`)
      break
    }
    case 'double': checkTargetRef(op.t); break
    case 'grant':
      checkTargetRef(op.t)
      if (!KEYWORDS.has(op.kw?.k)) err(`unknown granted keyword ${op.kw?.k}`)
      if (!['round', 'perm'].includes(op.dur)) err('grant needs dur round|perm')
      break
    case 'destroy': checkTargetRef(op.t); break
    case 'destroyUpgrade':
      if (!(def.targets ?? []).some(t => t.t === 'upgrade')) err('destroyUpgrade without an upgrade target')
      break
    case 'ready':
      if (op.side !== 'friendly') err('ready supports side friendly')
      if (op.t !== undefined && op.t !== 'chosen0') err('ready target must be chosen0')
      if (op.t === 'chosen0' && chosenSlots < 1) err('ready chosen0 but the card declares no targets')
      break
    case 'extraAction': break
    case 'preventBase': if (!isInt(op.n, 1, 30)) err('bad preventBase'); break
    case 'removeNegative': checkTargetRef(op.t); break
    case 'createCopies':   // #69: copies of the source unit — needs one, so actions can't carry it
      if (def.type === 'action') err('createCopies needs a source unit — actions have none')
      if (!isInt(op.n, 1, 5)) err('bad copy count')
      if (op.p !== undefined && !isInt(op.p, 0, 99)) err('bad copy power')
      if (op.h !== undefined && !isInt(op.h, 1, 99)) err('bad copy health')
      for (const kw of op.kw ?? []) {
        if (!KEYWORDS.has(kw.k)) err(`unknown copy keyword ${kw.k}`)
        if (kw.n !== undefined && !isInt(kw.n, 0, 99)) err(`bad copy keyword value ${kw.k} ${kw.n}`)
      }
      break
  }
  return errors
}

function validateStatic(slug: string, st: Static): string[] {
  const errors: string[] = []
  if (!STATICS.has(st.s)) { errors.push(`${slug}: unknown static ${(st as { s: string }).s}`); return errors }
  if (st.s === 'aura') {
    if (!AURA_SCOPES.has(st.scope)) errors.push(`${slug}: bad aura scope ${st.scope}`)
    if (st.p === undefined && st.pPerHostPip === undefined && st.armor === undefined && st.h === undefined && !st.kw) errors.push(`${slug}: aura grants nothing`)
    if (st.h !== undefined && !isInt(st.h, -20, 20)) errors.push(`${slug}: bad aura h ${st.h}`)
    if (st.pPerHostPip !== undefined) {   // #80 (Subjugate): host-pip scaling reads the carrier — attached scope only
      if (st.scope !== 'attached') errors.push(`${slug}: pPerHostPip needs scope attached (got ${st.scope})`)
      if (!isInt(st.pPerHostPip, -5, 5) || st.pPerHostPip === 0) errors.push(`${slug}: bad pPerHostPip ${st.pPerHostPip}`)
    }
    if (st.kw && !KEYWORDS.has(st.kw.k)) errors.push(`${slug}: unknown aura keyword ${st.kw.k}`)
    for (const k of Object.keys(st.cond ?? {})) if (!COND_KEYS.has(k)) errors.push(`${slug}: unknown condition ${k}`)
  }
  if (st.s === 'oppThreshold' && !isInt(st.n, -10, 10)) errors.push(`${slug}: bad oppThreshold`)
  if (st.s === 'imprisonWatcher' && !isInt(st.n, 1, 10)) errors.push(`${slug}: bad imprisonWatcher`)
  return errors
}
