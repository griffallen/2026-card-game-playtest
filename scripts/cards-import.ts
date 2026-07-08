/**
 * Validate data/cards.csv and produce the designer-override layer the engine loads.
 *   npx tsx scripts/cards-import.ts          # validate + write packages/engine/src/cards/overrides.json
 *   npx tsx scripts/cards-import.ts --check  # validate only (CI-friendly)
 *
 * The engine merges overrides.json over the TypeScript card definitions by slug, then
 * validateCardSet guards the result — a bad edit fails HERE with a readable message,
 * never in a game.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { CARD_SET, validateCardSet, type CardDef, type KeywordName } from '@newgame/engine'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQ = false
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const KW_NAMES = new Set(['guard', 'armor', 'rush', 'ranged', 'reach', 'flying', 'breakthrough', 'overextend', 'cantAttack', 'untargetable'])

function parseKw(s: string, slug: string, errors: string[]) {
  if (!s.trim()) return undefined
  return s.split(',').map(part => {
    const bits = part.trim().split(/\s+/)
    const k = bits[0] as KeywordName
    if (!KW_NAMES.has(k)) errors.push(`${slug}: unknown keyword "${bits[0]}"`)
    return bits[1] !== undefined ? { k, n: Number(bits[1]) } : { k }
  })
}

/** Move every influence op onto the requested trigger key. */
function retarget(def: CardDef, trigger: string, slug: string, errors: string[]): CardDef {
  const keys = ['onPlay', 'onDefend', 'onKill', 'onAttack'] as const
  const current = keys.find(k => def[k]?.some(o => o.op === 'influence'))
    ?? (def.startOfTurn?.ops.some(o => o.op === 'influence') ? 'startOfTurn' : undefined)
  if (!trigger || trigger === current) return def
  if (!['onPlay', 'onDefend', 'onKill', 'onAttack'].includes(trigger)) {
    errors.push(`${slug}: influenceTrigger "${trigger}" is not one of onPlay/onDefend/onKill/onAttack`)
    return def
  }
  const out: CardDef = { ...def }
  let moved: typeof def.onPlay = []
  for (const k of keys) {
    const ops = out[k]
    if (!ops) continue
    moved = [...(moved ?? []), ...ops.filter(o => o.op === 'influence')]
    const rest = ops.filter(o => o.op !== 'influence')
    if (rest.length) out[k] = rest
    else delete out[k]
  }
  if (!moved?.length) { errors.push(`${slug}: influenceTrigger set but the card has no influence effect to move`); return def }
  const key = trigger as 'onPlay' | 'onDefend' | 'onKill' | 'onAttack'
  out[key] = [...(out[key] ?? []), ...moved]
  return out
}

const csvPath = new URL('../data/cards.csv', import.meta.url)
const rows = parseCsv(readFileSync(csvPath, 'utf8'))
const header = rows.shift()!
const col = (name: string) => header.indexOf(name)
const errors: string[] = []
const overrides: Record<string, CardDef> = {}

for (const r of rows) {
  const slug = r[col('slug')]?.trim()
  if (!slug) continue
  const structural = r[col('effectsJson')] ? JSON.parse(r[col('effectsJson')]) : {}
  let def: CardDef = {
    ...structural,
    slug,
    name: r[col('name')].trim(),
    color: r[col('color')].trim() as CardDef['color'],
    type: r[col('type')].trim() as CardDef['type'],
    cost: Number(r[col('cost')]),
    power: r[col('power')] === '' ? undefined : Number(r[col('power')]),
    health: r[col('health')] === '' ? undefined : Number(r[col('health')]),
    text: r[col('text')],
    kw: parseKw(r[col('keywords')], slug, errors),
    designerNote: r[col('designerNote')] || undefined,
    artUrl: CARD_SET[slug]?.artUrl ?? `/cards/${slug}.jpg`,
  }
  def = retarget(def, r[col('influenceTrigger')]?.trim(), slug, errors)
  overrides[slug] = def
}

errors.push(...validateCardSet(overrides))
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ` + errors.join('\n  '))
  process.exit(1)
}

const changed = Object.entries(overrides).filter(([slug, def]) =>
  JSON.stringify(def) !== JSON.stringify(CARD_SET[slug] ? { ...CARD_SET[slug], ...def, slug } : null)
  && JSON.stringify({ ...def }) !== JSON.stringify(CARD_SET[slug]))

if (process.argv.includes('--check')) {
  console.log(`✓ ${Object.keys(overrides).length} cards valid (${changed.length} differ from the TypeScript base)`)
  process.exit(0)
}

writeFileSync(new URL('../packages/engine/src/cards/overrides.json', import.meta.url), JSON.stringify(overrides, null, 1))
console.log(`✓ ${Object.keys(overrides).length} cards valid → packages/engine/src/cards/overrides.json (engine loads CSV layer over TS base)`)
