/**
 * Dump the canonical card set to data/cards.csv — the designer's editing surface.
 * Simple columns are editable directly; everything structural rides in effectsJson.
 *   npx tsx scripts/cards-export.ts
 */
import { writeFileSync } from 'node:fs'
import { CARD_SET, type CardDef } from '@newgame/engine'

const esc = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const kwText = (def: CardDef) =>
  (def.kw ?? []).map(k => (k.n !== undefined ? `${k.k} ${k.n}` : k.k)).join(', ')

/** Where this card's influence ops live — the designer's per-card dial (decision 34). */
const influenceTrigger = (def: CardDef): string => {
  const has = (ops?: { op: string }[]) => ops?.some(o => o.op === 'influence')
  if (has(def.onDefend)) return 'onDefend'
  if (has(def.onKill)) return 'onKill'
  if (has(def.onAttack)) return 'onAttack'
  if (has(def.onPlay)) return 'onPlay'
  if (def.startOfRound && has(def.startOfRound.ops)) return 'startOfRound'
  return ''
}

const structural = (def: CardDef) => {
  const { slug, name, color, type, cost, power, health, text, kw, designerNote, artUrl, ...rest } = def
  return rest // targets, triggers, statics — the advanced layer
}

const HEADER = ['slug', 'name', 'color', 'type', 'cost', 'power', 'health', 'keywords', 'influenceTrigger', 'text', 'designerNote', 'effectsJson']
const rows = Object.values(CARD_SET)
  .sort((a, b) => a.color.localeCompare(b.color) || a.cost - b.cost || a.name.localeCompare(b.name))
  .map(def => [
    def.slug, def.name, def.color, def.type, def.cost,
    def.power ?? '', def.health ?? '',
    kwText(def), influenceTrigger(def), def.text, def.designerNote ?? '',
    JSON.stringify(structural(def)),
  ].map(esc).join(','))

const csv = [HEADER.join(','), ...rows].join('\n') + '\n'
writeFileSync(new URL('../data/cards.csv', import.meta.url), csv)
console.log(`exported ${rows.length} cards → data/cards.csv`)
