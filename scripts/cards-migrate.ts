/** One-time: dump CARD_SET (the live TS truth; overrides.json is {}) to per-card files, then verify round-trip. */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { CARD_SET, parseCardFile, serializeCardFile } from '@newgame/engine'

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]))
    : v
const stable = (v: unknown) => JSON.stringify(sortKeys(v))

let wrote = 0
const problems: string[] = []
for (const def of Object.values(CARD_SET)) {
  const dir = new URL(`../data/cards/${def.color}/`, import.meta.url)
  mkdirSync(dir, { recursive: true })
  const path = new URL(`${def.slug}.md`, dir)
  writeFileSync(path, serializeCardFile(def, 'draft'))
  const back = parseCardFile(readFileSync(path, 'utf8'), def.slug, def.color)
  if (back.errors.length) problems.push(...back.errors)
  else if (stable(back.card!.def) !== stable(def)) problems.push(`${def.slug}: round-trip mismatch`)
  wrote++
}
if (problems.length) { console.error(`✗ ${problems.length} problem(s):\n  ` + problems.join('\n  ')); process.exit(1) }
console.log(`✓ migrated ${wrote} cards → data/cards/ (all round-trip clean)`)
