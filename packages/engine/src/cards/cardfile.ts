import type { CardDef, Color, KeywordName, KeywordSpec } from '../types.ts'

/**
 * The per-card ledger format (decision 46): data/cards/<color>/<slug>.md.
 * Frontmatter = flat `key: value` scalars (the designer's fields) + one JSON `effects` field
 * (agent-maintained structure). Body before the first `## ` heading = card text; a
 * `## Design notes` section = designerNote. Pure string functions — scripts/cards-build.ts
 * does the I/O; the engine itself only ever sees the compiled generated.json.
 */

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const CARD_STATUSES = ['draft', 'redesign', 'canon'] as const
export type CardStatus = (typeof CARD_STATUSES)[number]
export interface CardFile { def: CardDef; status: CardStatus }

const FIELD_KEYS = ['name', 'type', 'cost', 'power', 'health', 'keywords', 'influenceTrigger', 'status', 'art', 'effects'] as const
type FieldKey = (typeof FIELD_KEYS)[number]
const KW_NAMES = new Set<string>(['guard', 'armor', 'rush', 'ranged', 'reach', 'flying', 'breakthrough', 'overextend', 'cantAttack', 'untargetable'])
const INFLUENCE_TRIGGERS = ['onPlay', 'onDefend', 'onKill', 'onAttack'] as const
type InfluenceTrigger = (typeof INFLUENCE_TRIGGERS)[number]

/** The structural rest of a def — everything that rides in the effects field. */
const structuralOf = (def: CardDef): Record<string, unknown> => {
  const { slug, name, color, type, cost, power, health, text, kw, designerNote, artUrl, ...rest } = def
  return rest
}

/** Which trigger currently carries the card's influence ops (the designer dial). */
const influenceTriggerOf = (def: CardDef): InfluenceTrigger | 'startOfRound' | '' => {
  const has = (ops?: { op: string }[]) => ops?.some(o => o.op === 'influence')
  for (const k of INFLUENCE_TRIGGERS) if (has(def[k])) return k
  return def.startOfRound && has(def.startOfRound.ops) ? 'startOfRound' : ''
}

/** Move the card's influence ops onto the requested trigger (same semantics as the retired cards-import.ts). */
function retargetInfluence(def: CardDef, trigger: string, slug: string, errors: string[]): CardDef {
  if (!trigger || trigger === influenceTriggerOf(def)) return def
  if (!(INFLUENCE_TRIGGERS as readonly string[]).includes(trigger)) {
    errors.push(`${slug}: influenceTrigger must be one of ${INFLUENCE_TRIGGERS.join('/')} (got "${trigger}")`)
    return def
  }
  const out: CardDef = { ...def }
  let moved: NonNullable<CardDef['onPlay']> = []
  for (const k of INFLUENCE_TRIGGERS) {
    const ops = out[k]
    if (!ops) continue
    moved = [...moved, ...ops.filter(o => o.op === 'influence')]
    const rest = ops.filter(o => o.op !== 'influence')
    if (rest.length) out[k] = rest
    else delete out[k]
  }
  if (!moved.length) { errors.push(`${slug}: influenceTrigger set but the card has no influence effect to move`); return def }
  const key = trigger as InfluenceTrigger
  out[key] = [...(out[key] ?? []), ...moved]
  return out
}

function parseKeywords(s: string, slug: string, errors: string[]): KeywordSpec[] | undefined {
  if (!s.trim()) return undefined
  return s.split(',').map(part => {
    const bits = part.trim().split(/\s+/)
    if (!KW_NAMES.has(bits[0])) errors.push(`${slug}: unknown keyword "${bits[0]}"`)
    const k = bits[0] as KeywordName
    return bits[1] !== undefined ? { k, n: Number(bits[1]) } : { k }
  })
}

export function parseCardFile(src: string, slug: string, color: Color): { card?: CardFile; errors: string[] } {
  const errors: string[] = []
  const err = (msg: string) => errors.push(`${slug}: ${msg}`)
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim() !== '---') return { errors: [`${slug}: file must open with a --- frontmatter fence`] }
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (close < 0) return { errors: [`${slug}: frontmatter fence never closes`] }

  const fields: Partial<Record<FieldKey, string>> = {}
  for (const raw of lines.slice(1, close)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^([A-Za-z]+):\s*(.*)$/.exec(line)
    if (!m) { err(`unreadable frontmatter line ${JSON.stringify(raw)}`); continue }
    const key = m[1] as FieldKey
    if (!(FIELD_KEYS as readonly string[]).includes(key)) { err(`unknown field "${m[1]}" (allowed: ${FIELD_KEYS.join(', ')})`); continue }
    if (fields[key] !== undefined) { err(`duplicate field "${key}"`); continue }
    fields[key] = m[2].trim()
  }

  const int = (key: 'cost' | 'power' | 'health'): number | undefined => {
    const v = fields[key]
    if (v === undefined || v === '') return undefined
    if (!/^-?\d+$/.test(v)) { err(`${key} must be a whole number (got "${v}")`); return undefined }
    return Number(v)
  }

  const body = lines.slice(close + 1).join('\n')
  const sections = body.split(/^## +/m)
  const text = sections[0].trim()
  let designerNote: string | undefined
  for (const sec of sections.slice(1)) {
    const nl = sec.indexOf('\n')
    const heading = (nl < 0 ? sec : sec.slice(0, nl)).trim()
    const content = (nl < 0 ? '' : sec.slice(nl + 1)).trim()
    if (heading.toLowerCase() === 'design notes') designerNote = content || undefined
    else err(`unknown section "## ${heading}" (only "## Design notes" is allowed)`)
  }

  if (!fields.name?.trim()) err('missing field "name"')
  if (!fields.type) err('missing field "type"')
  const cost = int('cost')
  if (fields.cost === undefined) err('missing field "cost"')

  let structural: Partial<CardDef> = {}
  if (fields.effects) {
    try {
      const parsed: unknown = JSON.parse(fields.effects)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) err('effects must be a JSON object')
      else structural = parsed as Partial<CardDef>
    } catch (e) { err(`effects is not valid JSON: ${(e as Error).message}`) }
  }

  const status = fields.status as CardStatus
  if (!CARD_STATUSES.includes(status)) err(`status must be one of ${CARD_STATUSES.join('/')} (got "${fields.status ?? ''}")`)

  const kw = parseKeywords(fields.keywords ?? '', slug, errors)
  const power = int('power')
  const health = int('health')
  if (errors.length) return { errors }

  let def: CardDef = {
    ...structural,
    slug,
    name: fields.name!.trim(),
    color,
    type: fields.type as CardDef['type'],   // value range re-checked by validateCardSet
    cost: cost!,
    ...(power !== undefined ? { power } : {}),
    ...(health !== undefined ? { health } : {}),
    text,
    ...(kw ? { kw } : {}),
    ...(designerNote ? { designerNote } : {}),
    artUrl: fields.art ?? `/cards/${slug}.jpg`,
  }
  def = retargetInfluence(def, fields.influenceTrigger ?? '', slug, errors)
  if (errors.length) return { errors }
  return { card: { def, status }, errors: [] }
}

export function serializeCardFile(def: CardDef, status: CardStatus): string {
  if (/^(## |---\s*$)/m.test(def.text) || (def.designerNote && /^(## |---\s*$)/m.test(def.designerNote))) {
    throw new Error(`${def.slug}: text/notes may not contain "## " headings or --- fences`)
  }
  const out = ['---', `name: ${def.name}`, `type: ${def.type}`, `cost: ${def.cost}`]
  if (def.power !== undefined) out.push(`power: ${def.power}`)
  if (def.health !== undefined) out.push(`health: ${def.health}`)
  const kwText = (def.kw ?? []).map(k => (k.n !== undefined ? `${k.k} ${k.n}` : k.k)).join(', ')
  if (kwText) out.push(`keywords: ${kwText}`)
  const trig = influenceTriggerOf(def)
  if (trig && trig !== 'startOfRound') out.push(`influenceTrigger: ${trig}`)
  out.push(`status: ${status}`)
  if (def.artUrl && def.artUrl !== `/cards/${def.slug}.jpg`) out.push(`art: ${def.artUrl}`)
  const structural = structuralOf(def)
  if (Object.keys(structural).length) {
    out.push('# effects is agent-maintained: ask for changes in the PR, do not hand-edit')
    out.push(`effects: ${JSON.stringify(structural)}`)
  }
  out.push('---')
  if (def.text.trim()) out.push(def.text.trim())
  if (def.designerNote) out.push('', '## Design notes', '', def.designerNote)
  return out.join('\n') + '\n'
}
