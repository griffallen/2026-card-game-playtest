# Canon & Card-Authoring System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock a versioned rules canon (base rules + a charter per deck), flip card truth to per-card markdown files that the designer edits on GitHub, then churn all 84 cards until both decks sit consistently on the canon — ending with tag `canon-v1.0`.

**Architecture:** A pure parser/serializer for the card-file format lives in the engine (`cardfile.ts`); a build script (`scripts/cards-build.ts`) walks `data/cards/**.md`, validates via `validateCardSet`, and emits `generated.json` (the engine's card set) plus a read-only `INDEX.md` table. The TS card arrays, the CSV, and the overrides layer all retire. Canon docs are markdown under `docs/canon/`.

**Tech Stack:** Existing only — TypeScript, tsx, Vitest, npm workspaces. **No new dependencies** (frontmatter parsing is hand-rolled, ~60 lines, same house style as the CSV parser and the demo's markdown renderer).

## Global Constraints

- No dependencies beyond `docs/DESIGN/02-TECH-STACK.md`.
- Engine stays pure and deterministic: no I/O at runtime; `parseCardFile`/`serializeCardFile` are pure string functions; only `scripts/` touch the filesystem.
- Test-first for all engine/script code. Full suite (`npm test`) + `npm run typecheck` green at every commit.
- Specs are source of truth: every ruling lands in `docs/DESIGN/DECISIONS.md` (next number: **46**); rules-semantics changes bump `docs/SPECS/game-rules.md`'s version.
- Vocabulary: **Round** (never "turn" for the round), **base**, current keyword names. Card text uses current-canon templates only.
- Anti-drift rule (the system's whole point): every card must satisfy **two parents** — base rules (what a keyword does) + its deck charter (what its color may do).
- New rulings made tonight without Griff are marked ⚑ (agent-assumed, designer review expected) per the DECISIONS.md status key.
- Work on branch `canon-v1` off `main`; merge + tag at the end.
- Card file format (fixed by this plan):

```markdown
---
name: Cinder Initiate
type: unit
cost: 1
power: 1
health: 1
keywords: rush, overextend 1
status: draft
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"onAttack":[...]}
---
Rush. Overextend 1.

## Design notes

Optional prose. Only this section is allowed after the card text.
```

  - `slug` = filename; `color` = directory (`data/cards/red/`, `data/cards/yellow/`).
  - Frontmatter: flat `key: value` lines only; allowed keys `name type cost power health keywords influenceTrigger status art effects`; `#` lines are comments; unknown/duplicate keys are errors naming the card.
  - `status`: `draft` | `redesign` | `canon` — authoring metadata, **not** part of `CardDef`, never reaches the engine.
  - `effects`: single-line JSON object = the structural rest of `CardDef` (targets/triggers/statics/custom). Omitted when empty.
  - `influenceTrigger`: optional designer dial (`onPlay|onDefend|onKill|onAttack`), same retarget semantics as the retired `cards-import.ts`.
  - Body before the first `## ` heading = card `text`; `## Design notes` → `designerNote`; any other section is an error.
  - `art` only when it differs from the derived `/cards/<slug>.jpg`.

---

### Task 1: Amend the design spec with session-006 decisions

**Files:**
- Modify: `docs/superpowers/specs/2026-07-09-canon-and-card-authoring-design.md`

**Interfaces:** none (docs).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b canon-v1
```

- [ ] **Step 2: Append an "Amendments (session 006)" section** to the spec, recording: (a) Decision 1's *representation* changes from one CSV to **one markdown file per card** (`data/cards/<color>/<slug>.md`, format above) — substance unchanged (file layer authoritative, TS retires, agent validates); rationale: card text escapes CSV quoting, one-card blast radius, per-card git history, conflict-free parallel PRs, files render as card pages; the curve overview becomes generated `data/cards/INDEX.md`. (b) `game-rules.md` keeps its own version number (no backwards re-stamp to "v1.0"); `CANON.md` pins members at their versions. (c) The stale "this turn" claim is corrected (already swept 2026-07-08). (d) Blaine's card license: cards are drafts; clean, easy-to-rectify values; no confusing prose survives.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-09-canon-and-card-authoring-design.md
git commit -m "docs(spec): session-006 amendments — per-card ledger, version pinning, card license"
```

### Task 2: Rules-canon rulings (the ⚑ sprint) — `game-rules.md` + `DECISIONS.md`

**Files:**
- Modify: `docs/SPECS/game-rules.md` (stamp `v2.1-proto` → `v2.1`; resolve rules-level ⚑ marks)
- Modify: `docs/DESIGN/DECISIONS.md` (decisions 46–54)
- Modify: `docs/GAME-FLOW.md` (only if a ruling changes designer-facing wording)

**Interfaces:**
- Produces: the ruling table below — Tasks 3 (charters) and 8 (churn) implement it.

**The rulings** (all ⚑ agent-assumed unless noted; each gets a one-line DECISIONS.md entry with reason):

| # | Ruling |
|---|--------|
| 46 | ✅ (Blaine, tonight) **Per-card markdown ledger is the single source of truth** — supersedes decision 45 and session-005's CSV choice. Engine generates from it; `red.ts`/`yellow.ts`/`overrides.json`/`cards.csv` retire. |
| 47 | **Overextend is unit-only** — a combat gamble printed on units, never on actions/upgrades. The 18 red actions carrying inert "Overextend N" text lose it (Task 8 retexts; costs/effects rebalanced there against the charter). Codifies decision 35's direction. |
| 48 | **Flying is canon:** "may move to any zone, ignoring adjacency" (the implemented ⚑23 reading). |
| 49 | **Radiant Citadel is canon:** its static is "while in play, your opponent's Influence win threshold is +2." Card text must say exactly that (no more "maximum Influence"). |
| 50 | **No dead thresholds:** a card may not reference an Influence value ≥ the win threshold (it can never matter). Supreme Sentence gets redesigned in Task 8. |
| 51 | **Auto-picked targets are canon and honest:** `startOfRound`/auto triggers pick "the strongest eligible enemy unit (ties: earliest entry)" and the card text must state the rule, not pretend there's a choice. |
| 52 | **"This zone" on an action means "choose a zone"** — the action declares a zone target explicitly. |
| 53 | **Prison stays, provisionally** — decision 37 ("on notice") stands; cards normalize now, Yellow's charter marks the whole package provisional; no new prison-dependent designs until Griff rules. |
| 54 | **Base/home rename deferred to Griff** — candidates (Banner/Hearth/Seat/Beacon) recorded as an open question in `CANON.md`, "base" stays until then. |

- [ ] **Step 1:** Add decisions 46–54 to `docs/DESIGN/DECISIONS.md` under a "## Canon sprint (2026-07-09, session 006)" heading, one line + reason each, ⚑/✅ per the table.
- [ ] **Step 2:** Update `docs/SPECS/game-rules.md`: title → `v2.1`; header note "**Canon:** member of canon-v1.0 (see docs/canon/CANON.md)"; §3.1 remove ⚑ from `flying`; §3.2 `thresholdMod` remove ⚑ (49); §3.3 auto-target note cites decision 51 instead of ⚑; §1.11 release-threshold ⚑ → note "provisional pending decision 37". Leave genuinely-deferred marks (`release`/`moveUnit` reserved ops, §1.9 activated abilities, §5 undo) as they are — deferral is their canonical status.
- [ ] **Step 3:** Skim `docs/GAME-FLOW.md` for contradictions with 46–54 (Flying, Citadel, Overextend-on-actions); fix any found.
- [ ] **Step 4: Commit**

```bash
git add docs/SPECS/game-rules.md docs/DESIGN/DECISIONS.md docs/GAME-FLOW.md
git commit -m "docs(canon): rules sprint — decisions 46-54, game-rules stamped v2.1 canon"
```

### Task 3: Deck charters + CANON.md (the missing middle layer)

**Files:**
- Create: `docs/canon/CANON.md`
- Create: `docs/canon/decks/red.md`
- Create: `docs/canon/decks/yellow.md`

**Interfaces:**
- Produces: per-color invariant lists + statline grammar — Task 8's churn checklist checks every card against them; the Task 7 README links here.

**Charter template** (both files, Griff-readable, one page):

```markdown
# <Color> Deck Charter — canon-v1.0

## Identity
[One-sentence fantasy + two sentences of how it wins.]

## Keywords this color may print
[Table: keyword → what it means *for this color* → limits.]

## Invariants (the design laws — every card must obey)
[Numbered list. Violations are review-blockers.]

## Curve & size (the standard base set)
[Card count, unit/action/upgrade mix, cost histogram, statline grammar.]

## Influence posture
[Exactly how this color may touch the shared track.]

## Provisional / open
[Anything Griff still owns — linked to CANON.md questions.]
```

- [ ] **Step 1: Derive the real numbers before writing.** Run a quick stats pass over `CARD_SET` (throwaway tsx snippet in the scratchpad — cost histogram per color, stat-sum vs cost scatter, keyword frequency). Fit the **statline grammar** each color's units mostly already obey (expected form: `power + health ≈ 2×cost + 1 − keyword tax`, red skews power, yellow skews health); list the outliers — they feed Task 8.
- [ ] **Step 2: Write `red.md`.** Identity: spend your own resources (life, self-damage, tempo) to end the game before inevitability arrives. Keywords allowed: rush, breakthrough, overextend (units only — decision 47), reach, armor *only* as an exception noted per card. Invariants include at minimum: no Guard; no imprison/release; never *gains* passive Influence (influence only via onKill/onAttack events, if at all); no healing beyond self-base; Overextend unit-only; every card's downside is real (no free power). Curve from Step 1. Influence posture: red mostly ignores the track and must never win by it passively.
- [ ] **Step 3: Write `yellow.md`** (generalize the template): identity = order and inevitability — wall, imprison, convert defense into Influence. Keywords: guard, armor, cantAttack, untargetable; no rush/breakthrough/overextend. Invariants: influence gains are event-earned only (decision 34); prison package provisional (decision 53); guards get paid for defending (onDefend), never for existing. Influence posture: yellow is the only color that wins by the track as a primary plan.
- [ ] **Step 4: Write `CANON.md`:** current canon version (unstamped until Task 11), member table (game-rules v2.1 · red charter · yellow charter · `data/cards/` ledger), the two-parent rule, reconciliation status ("cards reconciled to: —, pending Task 8"), and the **open questions for Griff** (prison's fate, base rename, initiative/intercept feel, influence threshold, plus anything Tasks 8–9 surface).
- [ ] **Step 5: Commit**

```bash
git add docs/canon/
git commit -m "docs(canon): red + yellow deck charters and the CANON index"
```

### Task 4: Card-file parser + serializer in the engine (TDD)

**Files:**
- Create: `packages/engine/src/cards/cardfile.ts`
- Create: `packages/engine/test/cardfile.test.ts`
- Modify: `packages/engine/src/index.ts` (add export line)

**Interfaces:**
- Consumes: `CardDef`, `Color`, `KeywordName` from `../types.ts`.
- Produces (used by Tasks 5, 6 and the drift test):

```ts
export const CARD_STATUSES = ['draft', 'redesign', 'canon'] as const
export type CardStatus = (typeof CARD_STATUSES)[number]
export interface CardFile { def: CardDef; status: CardStatus }
export function parseCardFile(src: string, slug: string, color: Color): { card?: CardFile; errors: string[] }
export function serializeCardFile(def: CardDef, status: CardStatus): string
```

- [ ] **Step 1: Write the failing tests** — `packages/engine/test/cardfile.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseCardFile, serializeCardFile } from '../src/cards/cardfile.ts'
import type { CardDef } from '../src/types.ts'

const GOOD = `---
name: Cinder Initiate
type: unit
cost: 1
power: 1
health: 1
keywords: rush, overextend 1
status: draft
---
Rush. Overextend 1.

## Design notes

A gamble, not a given.
`

describe('parseCardFile', () => {
  it('parses a full card', () => {
    const { card, errors } = parseCardFile(GOOD, 'cinder-initiate', 'red')
    expect(errors).toEqual([])
    expect(card!.status).toBe('draft')
    expect(card!.def).toEqual({
      slug: 'cinder-initiate', name: 'Cinder Initiate', color: 'red', type: 'unit',
      cost: 1, power: 1, health: 1, text: 'Rush. Overextend 1.',
      kw: [{ k: 'rush' }, { k: 'overextend', n: 1 }],
      designerNote: 'A gamble, not a given.',
      artUrl: '/cards/cinder-initiate.jpg',
    })
  })
  it('spreads effects JSON into the def', () => {
    const src = `---\nname: Bolt\ntype: action\ncost: 2\nstatus: canon\neffects: {"targets":[{"t":"unit","side":"enemy"}],"onPlay":[{"op":"damage","t":"chosen0","n":2}]}\n---\nDeal 2 damage to target enemy unit.\n`
    const { card, errors } = parseCardFile(src, 'bolt', 'red')
    expect(errors).toEqual([])
    expect(card!.def.onPlay).toEqual([{ op: 'damage', t: 'chosen0', n: 2 }])
    expect(card!.def.targets).toEqual([{ t: 'unit', side: 'enemy' }])
  })
  it('moves influence ops when influenceTrigger differs', () => {
    const src = `---\nname: Guardian\ntype: unit\ncost: 2\npower: 1\nhealth: 3\ninfluenceTrigger: onDefend\nstatus: draft\neffects: {"onPlay":[{"op":"influence","n":1}]}\n---\nWhen this defends, gain 1 Influence.\n`
    const { card, errors } = parseCardFile(src, 'guardian', 'yellow')
    expect(errors).toEqual([])
    expect(card!.def.onPlay).toBeUndefined()
    expect(card!.def.onDefend).toEqual([{ op: 'influence', n: 1 }])
  })
  it.each([
    [`---\nname: X\ntipe: unit\n---\n`, /unknown field "tipe"/],
    [`---\nname: X\ntype: unit\ncost: 1\npower: 1\nhealth: 1\nstatus: locked\n---\n`, /status must be one of/],
    [`---\nname: X\ntype: unit\ncost: one\npower: 1\nhealth: 1\nstatus: draft\n---\n`, /cost/],
    [`---\nname: X\ntype: action\ncost: 1\nstatus: draft\neffects: {broken\n---\n`, /effects is not valid JSON/],
    [`---\nname: X\ntype: action\ncost: 1\nstatus: draft\n---\nText.\n\n## Lore\n\nNope.\n`, /unknown section "## Lore"/],
    [`---\nname: X\ntype: unit\ncost: 1\npower: 1\nhealth: 1\nstatus: draft\nkeywords: sneaky\n---\n`, /unknown keyword "sneaky"/],
  ])('rejects bad input with a readable error', (src, want) => {
    const { card, errors } = parseCardFile(src, 'x', 'red')
    expect(card).toBeUndefined()
    expect(errors.join('\n')).toMatch(want)
  })
})

describe('serializeCardFile', () => {
  const def: CardDef = {
    slug: 'bolt', name: 'Bolt', color: 'red', type: 'action', cost: 2,
    text: 'Deal 2 damage to target enemy unit.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2 }],
    artUrl: '/cards/bolt.jpg',
  }
  it('round-trips losslessly', () => {
    const { card, errors } = parseCardFile(serializeCardFile(def, 'canon'), 'bolt', 'red')
    expect(errors).toEqual([])
    expect(card!.def).toEqual(def)
    expect(card!.status).toBe('canon')
  })
  it('is stable (serialize∘parse∘serialize = serialize)', () => {
    const once = serializeCardFile(def, 'canon')
    const { card } = parseCardFile(once, 'bolt', 'red')
    expect(serializeCardFile(card!.def, 'canon')).toBe(once)
  })
  it('refuses card text that would corrupt the format', () => {
    expect(() => serializeCardFile({ ...def, text: 'ok\n## sneaky heading' }, 'draft')).toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test -w packages/engine -- cardfile` → FAIL (module not found).
- [ ] **Step 3: Implement `packages/engine/src/cards/cardfile.ts`:**

```ts
import type { CardDef, Color, KeywordName, KeywordSpec } from '../types.ts'

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
  let moved: CardDef['onPlay'] = []
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
  if (cost === undefined && !errors.some(e => e.includes('cost'))) err('missing field "cost"')

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
  if (/^(## |---\s*$)/m.test(def.text) || (def.designerNote && /^## /m.test(def.designerNote))) {
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
```

- [ ] **Step 4: Export from the engine** — add to `packages/engine/src/index.ts`:

```ts
export { parseCardFile, serializeCardFile, CARD_STATUSES, type CardStatus, type CardFile } from './cards/cardfile.ts'
```

- [ ] **Step 5: Run** `npm test -w packages/engine -- cardfile` → PASS; `npm run typecheck` → clean.
- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/cards/cardfile.ts packages/engine/test/cardfile.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): card-file format — pure parser/serializer for the per-card ledger"
```

### Task 5: Migrate all 84 cards to `data/cards/`

**Files:**
- Create: `scripts/cards-migrate.ts` (one-time; deleted in Task 6)
- Create: `data/cards/red/*.md` (36+2 → per current pool), `data/cards/yellow/*.md`

**Interfaces:**
- Consumes: `CARD_SET`, `serializeCardFile`, `parseCardFile` from `@newgame/engine`.
- Produces: the `data/cards/` tree Task 6 builds from. All cards `status: draft`.

- [ ] **Step 1: Write `scripts/cards-migrate.ts`:**

```ts
/** One-time: dump CARD_SET (the live TS truth; overrides.json is {}) to per-card files, then verify round-trip. */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { CARD_SET, parseCardFile, serializeCardFile } from '@newgame/engine'

let wrote = 0
const problems: string[] = []
for (const def of Object.values(CARD_SET)) {
  const dir = new URL(`../data/cards/${def.color}/`, import.meta.url)
  mkdirSync(dir, { recursive: true })
  const path = new URL(`${def.slug}.md`, dir)
  writeFileSync(path, serializeCardFile(def, 'draft'))
  const back = parseCardFile(readFileSync(path, 'utf8'), def.slug, def.color)
  const stable = (v: unknown) => JSON.stringify(v, Object.keys(v as object).sort())
  if (back.errors.length) problems.push(...back.errors)
  else if (stable(back.card!.def) !== stable(def)) problems.push(`${def.slug}: round-trip mismatch`)
  wrote++
}
if (problems.length) { console.error(`✗ ${problems.length} problem(s):\n  ` + problems.join('\n  ')); process.exit(1) }
console.log(`✓ migrated ${wrote} cards → data/cards/ (all round-trip clean)`)
```

- [ ] **Step 2: Cross-check the CSV first** (it was the designer surface — confirm it holds nothing the TS base lacks). Throwaway scratchpad script: build defs from `data/cards.csv` exactly as the old `cards-import.ts` does, stable-stringify both sides, print any card where they differ semantically. Expected: zero real diffs (history shows CSV and TS moved in the same commits). **If diffs appear:** designer-column diffs (name/cost/stats/text/designerNote/influenceTrigger) → CSV wins, port into the TS def before migrating; structural diffs → TS wins. Record the outcome in the commit message.
- [ ] **Step 3: Run** `npx tsx scripts/cards-migrate.ts` → `✓ migrated 84 cards`. Spot-read 3 files (one vanilla unit, one action with targets, one static/aura card) for human-facing quality.
- [ ] **Step 4: Commit**

```bash
git add scripts/cards-migrate.ts data/cards/
git commit -m "feat(cards): migrate all 84 cards to per-card markdown ledger (status: draft)"
```

### Task 6: Build pipeline + engine flip — the ledger becomes the truth

**Files:**
- Create: `scripts/cards-build.ts`
- Create: `packages/engine/src/cards/generated.json` (built artifact, committed)
- Create: `data/cards/INDEX.md` (built artifact, committed)
- Create: `packages/engine/test/ledger.test.ts` (drift guard)
- Modify: `packages/engine/src/cards/index.ts`, `packages/engine/src/decks.ts`, `packages/engine/src/index.ts`, `packages/engine/test/cards.test.ts`, root `package.json`
- Delete: `packages/engine/src/cards/red.ts`, `yellow.ts`, `overrides.json`, `builders.ts`; `scripts/cards-import.ts`, `cards-export.ts`, `cards-migrate.ts`; `data/cards.csv`

**Interfaces:**
- Consumes: Task 4's `parseCardFile`, Task 5's tree.
- Produces: `npm run cards` (build) and `npm run cards:check` (validate + staleness gate); engine still exports `CARD_SET` (same shape — server/demo/sim untouched); `RED_CARDS`/`YELLOW_CARDS` exports removed.

- [ ] **Step 1: Snapshot the old truth** (before deleting anything):

```bash
npx tsx -e "import { CARD_SET } from '@newgame/engine'; const s=(v)=>JSON.stringify(v,Object.keys(v).sort()); console.log(Object.values(CARD_SET).map(d=>s(d)).sort().join('\n'))" > "$SCRATCHPAD/card-set-before.txt"
```

- [ ] **Step 2: Write `scripts/cards-build.ts`:**

```ts
/**
 * Build the card ledger: data/cards/<color>/<slug>.md  →  packages/engine/src/cards/generated.json + data/cards/INDEX.md
 *   npm run cards          # build
 *   npm run cards:check    # validate + fail if generated files are stale (the PR gate)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { parseCardFile, validateCardSet, type CardDef, type CardStatus } from '@newgame/engine'

const COLORS = ['red', 'yellow'] as const
const entries: { def: CardDef; status: CardStatus }[] = []
const errors: string[] = []

for (const color of COLORS) {
  const dir = new URL(`../data/cards/${color}/`, import.meta.url)
  if (!existsSync(dir)) continue
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.md')) continue
    const res = parseCardFile(readFileSync(new URL(file, dir), 'utf8'), file.slice(0, -3), color)
    if (res.card) entries.push(res.card)
    errors.push(...res.errors)
  }
}

entries.sort((a, b) => a.def.color.localeCompare(b.def.color) || a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name))
const set = Object.fromEntries(entries.map(e => [e.def.slug, e.def]))
errors.push(...validateCardSet(set))
if (errors.length) { console.error(`✗ ${errors.length} problem(s):\n  ` + errors.join('\n  ')); process.exit(1) }

const json = JSON.stringify(set, null, 1) + '\n'
const ph = (d: CardDef) => (d.type === 'unit' ? `${d.power}/${d.health}` : '—')
const kws = (d: CardDef) => (d.kw ?? []).map(k => (k.n !== undefined ? `${k.k} ${k.n}` : k.k)).join(', ')
const row = (e: { def: CardDef; status: CardStatus }) =>
  `| [${e.def.name}](${e.def.color}/${e.def.slug}.md) | ${e.def.cost} | ${e.def.type} | ${ph(e.def)} | ${kws(e.def)} | ${e.status} | ${e.def.text.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`
const table = (color: string) => [
  `## ${color[0].toUpperCase()}${color.slice(1)} (${entries.filter(e => e.def.color === color).length})`, '',
  '| Card | Cost | Type | P/H | Keywords | Status | Text |', '|---|---|---|---|---|---|---|',
  ...entries.filter(e => e.def.color === color).map(row), '',
].join('\n')
const counts = COLORS.map(c => `${c}: ${entries.filter(e => e.def.color === c && e.status === 'canon').length}/${entries.filter(e => e.def.color === c).length} canon`).join(' · ')
const index = `# Card Ledger Index\n\n*Generated by \`npm run cards\` — do not edit. Edit the per-card files.*\n\n**${counts}**\n\n${COLORS.map(table).join('\n')}`

const jsonUrl = new URL('../packages/engine/src/cards/generated.json', import.meta.url)
const indexUrl = new URL('../data/cards/INDEX.md', import.meta.url)
const read = (u: URL) => (existsSync(u) ? readFileSync(u, 'utf8') : '')

if (process.argv.includes('--check')) {
  if (read(jsonUrl) !== json || read(indexUrl) !== index) {
    console.error('✗ ledger valid but generated files are stale — run: npm run cards'); process.exit(1)
  }
  console.log(`✓ ${entries.length} cards valid; generated files current`)
} else {
  writeFileSync(jsonUrl, json)
  writeFileSync(indexUrl, index)
  console.log(`✓ ${entries.length} cards → generated.json + INDEX.md`)
}
```

- [ ] **Step 3: Bootstrap circularity note + first build.** `cards-build` imports `@newgame/engine`, which (after Step 4) imports `generated.json` — so build BEFORE flipping the import: run `npx tsx scripts/cards-build.ts` now, while `cards/index.ts` still assembles from TS. Creates `generated.json` + `INDEX.md`.
- [ ] **Step 4: Flip the engine.** `packages/engine/src/cards/index.ts` becomes:

```ts
import type { CardSet } from '../types.ts'
import generated from './generated.json' with { type: 'json' }

/**
 * Canonical card pool. Source of truth: data/cards/<color>/<slug>.md (decision 46) —
 * `npm run cards` compiles + validates the ledger into generated.json. Never edit the JSON.
 */
export const CARD_SET: CardSet = generated as CardSet
```

`decks.ts`: replace the `RED_CARDS`/`YELLOW_CARDS` imports with derivations (same doubles rule, decisions 25):

```ts
import { CARD_SET } from './cards/index.ts'
const byColor = (color: 'red' | 'yellow') => Object.values(CARD_SET).filter(c => c.color === color)
const RED = byColor('red'), YELLOW = byColor('yellow')
const RED_DOUBLES = new Set(RED.filter(c => c.cost <= 2).map(c => c.slug))
RED_DOUBLES.add('rageforged-brute'); RED_DOUBLES.add('volcanic-slam')
```

`packages/engine/src/index.ts`: drop the `RED_CARDS, YELLOW_CARDS` names from the export line (keep `CARD_SET`). Move `slugify` from `builders.ts` into `cardfile.ts` **only if** `grep -rn slugify` shows other consumers; otherwise it dies with `builders.ts`.
- [ ] **Step 5: Delete the retired layer** — `git rm packages/engine/src/cards/{red,yellow}.ts packages/engine/src/cards/overrides.json packages/engine/src/cards/builders.ts scripts/cards-import.ts scripts/cards-export.ts scripts/cards-migrate.ts data/cards.csv` (confirm `builders.ts` truly has no remaining importers first).
- [ ] **Step 6: Equality proof.** Re-run the Step 1 snapshot command against the flipped engine → diff against `card-set-before.txt` → **must be byte-identical**. Any diff is a migration bug — stop and fix before proceeding.
- [ ] **Step 7: Drift guard test** — `packages/engine/test/ledger.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { CARD_SET } from '../src/cards/index.ts'
import { parseCardFile } from '../src/cards/cardfile.ts'

describe('card ledger', () => {
  it('generated.json matches data/cards/ exactly (run `npm run cards` after editing cards)', () => {
    const seen = new Set<string>()
    for (const color of ['red', 'yellow'] as const) {
      const dir = new URL(`../../../data/cards/${color}/`, import.meta.url)
      for (const file of readdirSync(dir)) {
        if (!file.endsWith('.md')) continue
        const slug = file.slice(0, -3)
        const { card, errors } = parseCardFile(readFileSync(new URL(file, dir), 'utf8'), slug, color)
        expect(errors, `${slug} should parse`).toEqual([])
        expect(CARD_SET[slug], `${slug} missing from generated.json`).toBeDefined()
        expect(card!.def).toEqual(CARD_SET[slug])
        seen.add(slug)
      }
    }
    expect(Object.keys(CARD_SET).sort()).toEqual([...seen].sort())
  })
})
```

- [ ] **Step 8: Rewrite `cards.test.ts` counts** — replace the `RED_CARDS.length`/`YELLOW_CARDS.length` assertions with color-filtered counts over `CARD_SET` (36 red / 48 yellow / 84 total; update the import line).
- [ ] **Step 9: Root `package.json` scripts:** add `"cards": "tsx scripts/cards-build.ts"` and `"cards:check": "tsx scripts/cards-build.ts --check"` (add `tsx` to root devDependencies only if `npx tsx` isn't already resolvable from the workspace — check first; the scripts ran via `npx tsx` before).
- [ ] **Step 10: Full verification** — `npm test` (engine + server) → all green; `npm run typecheck` → clean; `npm run cards:check` → current.
- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(cards): ledger flip — data/cards/*.md is the single source of truth (decision 46); TS card arrays, overrides, and CSV retire"
```

### Task 7: Griff's workflow — README + reference sweep

**Files:**
- Create: `data/cards/README.md`
- Modify: every stale `cards.csv` / `cards-import` reference (found by grep) — expected: `docs/DESIGN/DECISIONS.md` (45's text gets a "superseded by 46" note), `docs/PROMPTS/CURRENT-HANDOFF-PROMPT.md` (rewritten at wrap anyway), demo Appendix/Audit copy if it names the CSV, `CLAUDE.md` if it names the CSV.

**Interfaces:** none (docs). The README is the designer-facing contract for the whole system.

- [ ] **Step 1: Write `data/cards/README.md`** — for Griff, no jargon: what a card file is (annotated example), which fields are his (name/cost/power/health/keywords/text/influenceTrigger/Design notes) vs agent-owned (`effects`, `status: canon` flips), how to edit on github.com (open file → pencil → edit → "Create a **new branch** and start a pull request"), what happens next (the agent reviews every PR against: valid? text↔effects consistent? in-charter? — then implements structure and merges), how to ask for a redesign (write intent in prose in the PR description or `## Design notes` — the agent does the structure), and links to `INDEX.md`, both charters, and `docs/GAME-FLOW.md`.
- [ ] **Step 2: Sweep** — `grep -rn 'cards.csv\|cards-import\|cards-export' --include='*.md' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v SESSION-SUMMARIES | grep -v superpowers/plans` → fix each hit (session summaries and this plan stay as history).
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(cards): designer editing guide + retire stale CSV references"
```

### Task 8: Card churn — normalize + redesign until both decks are canon

**Files:**
- Modify: `data/cards/red/*.md`, `data/cards/yellow/*.md` (all 84), regenerate `generated.json` + `INDEX.md`
- Modify: `apps/demo/src/pages/Audit.tsx` (the flags list changes), `docs/DESIGN/DECISIONS.md` (redesign whys)

**Interfaces:**
- Consumes: Task 2 rulings, Task 3 charters (invariants + statline grammar).
- Produces: every card `status: canon`; the set Task 9 balances.

**Method — for every card, in cost order per color, apply the checklist:**
1. **Two parents:** keywords/effects legal per base rules §3 *and* the color's charter allowance.
2. **Honest text:** printed text describes exactly what `effects` does, in canon vocabulary (round, base, canonical keyword names, decision-51 auto-target phrasing, decision-52 zone phrasing).
3. **Clean values (Blaine's license):** statline fits the charter grammar (or the deviation is the card's stated point); costs/amounts are round, legible numbers; no dead riders (decision 50), no inert keywords (decision 47).
4. **Disposition:** cosmetic/text/value fix → normalize in place, `status: canon`. Identity change (effect replaced, mechanic removed) → mark `status: redesign`, redesign it *tonight* per Blaine's license, log the why as one line in DECISIONS.md under a "Session-006 card redesigns" heading, then `status: canon`.

**Known worklist (from the CSV flags + rulings — expect more found in passing):**
- 18 red actions: strip "Overextend N." from text (decision 47); where the card was costed around the drawback, re-cost or add a real cost (self-damage rider via existing ops) — judgment per card against the red charter.
- Supreme Sentence: dead 15+ rider (decision 50) → redesign.
- Binding Light / Sentence: 10+ riders are real (10 < 15) but duplicated prison-decay reminder text — normalize text; keep or simplify riders per charter.
- Prison Warrant / Hold the Line: "this zone" → explicit zone-target phrasing (decision 52).
- Containment Priest / Noble Purifier / High Justiciar / Lawbringer / Inquisitor / Archon of Order: decision-51 honest auto-target text.
- Radiant Citadel: decision-49 text.
- Imprisonment Chamber / Prison of Light: decay reminder text → normalize (rules §1.11 already charges it once).
- Fiery Impaler / Crimson Behemoth / Blaze Juggernaut / Resolve Banner / Dawnspear Paladin / Champion of the Faith: retext per existing rulings noted in their files.
- Statline-grammar outliers from Task 3 Step 1: adjust stats or bless the deviation in the file's Design notes.

- [ ] **Step 1:** Red pass (38 files). After: `npm run cards && npm test && npm run typecheck`.
- [ ] **Step 2:** Commit — `git commit -m "cards(red): normalize + redesign to canon — decisions 47,50,51; charter grammar"` (list redesigned slugs in the body).
- [ ] **Step 3:** Yellow pass (46 files). Same verification.
- [ ] **Step 4:** Commit — same shape as Step 2.
- [ ] **Step 5:** Update `apps/demo/src/pages/Audit.tsx`: the resolved ⚑ items move from "open flags" to a short "ruled in canon-v1.0 (decisions 46–54)" list; anything still provisional (prison, rename) stays flagged. Verify the demo builds: `npm run typecheck`.
- [ ] **Step 6:** Update `docs/canon/CANON.md` reconciliation line: "all 84 cards reconciled at canon-v1.0". Commit both.

### Task 9: Balance evening — sims, tuning, first formal playtest record

**Files:**
- Create: `docs/PLAYTESTS/001.md`
- Modify: card files that get value-tuned (+ regenerate), `docs/canon/CANON.md` (baseline table)

**Interfaces:**
- Consumes: Task 8's canon set; `npm run sim -w packages/engine`; the `verify` skill for a browser-driven game.

- [ ] **Step 1:** Baseline sims on the churned set (heuristic mirror + random, same seeds/counts as the v2.1 baselines): red win %, win-by-life vs influence %, seat-0 %, median rounds. Compare against the handoff table (red was 36% after the Rush cap — the standing rebalance flag).
- [ ] **Step 2:** Tune toward interesting balance: red mirror-vs-yellow in the 45–55% band, influence wins meaningfully possible for yellow (>0% but not dominant), games ending in the 8–14 round band. Value changes only (cost/power/health/N amounts) — mechanics stayed in Task 8. Iterate: edit card files → `npm run cards` → sim → repeat. Every touched card stays inside its charter grammar.
- [ ] **Step 3:** Play at least one full game in the demo via the `verify` skill (headless drive + screenshots) — feel-check claiming initiative and the intercept window; note observations.
- [ ] **Step 4:** Write `docs/PLAYTESTS/001.md` per the playtest playbook: date, rules v2.1 / canon-v1.0, decks, sim tables before/after tuning, what was tuned and why, feel observations, open questions for Griff.
- [ ] **Step 5:** `npm test && npm run typecheck && npm run cards:check` → green. Commit — `git commit -m "balance: canon-v1.0 tuning pass + playtest 001 (sims before/after)"`.

### Task 9.5: Demo UX audit — fresh eyes as a new player (added mid-session by Blaine)

**Files:**
- Modify: `apps/demo/src/**` (fixes), audit notes into `docs/PLAYTESTS/001.md`

**Interfaces:**
- Consumes: the running demo (`npm run dev -w apps/demo`) + the `verify` skill's browser drive.
- Produces: a findings list (severity-ordered) and fixes for the top items; unfixed items become tracked questions.

- [ ] **Step 1: Play as a stranger.** Drive the demo in a real browser (verify skill / Playwright) pretending zero context: land on the site, find how to start a game, learn the rules from what's on screen only. Screenshot each confusion.
- [ ] **Step 2: Audit checklist** — at minimum: (a) Blaine's reports: double-click plays a card when the player meant to inspect; inspect-vs-target selection ambiguity; (b) affordance clarity: what is clickable, what is selected, what is a legal target *right now*; (c) irreversible actions without confirmation or undo visibility; (d) game-state legibility: whose turn, what round, initiative state, why-can't-I-act feedback; (e) mid-action states: intercept window, target prompts — can a new player tell what's being asked?; (f) mobile viewport sanity.
- [ ] **Step 3: Fix the high-severity items** (likely: separate inspect from act — click inspects, explicit button/drag acts; kill double-click-to-play or make it opt-in; visible targeting mode with cancel). Each fix: manual browser verification + `npm run typecheck`.
- [ ] **Step 4: Commit** — `git commit -m "fix(demo): UX audit pass — inspect vs act, targeting clarity, <items>"` with the full findings list in the body.

### Task 10 (upgraded from proposal to build): Purple — a third playable deck

**Files:**
- Create: `docs/canon/decks/purple.md` (charter), `data/cards/purple/*.md` (~36 uniques), SVG art per card, prebuilt deck entry
- Modify: `packages/engine/src/types.ts` (`Color` union), `packages/engine/src/validate.ts` (color list), `scripts/cards-build.ts` (COLORS), `packages/engine/src/decks.ts` (third prebuilt deck), `packages/engine/test/cards.test.ts` (counts + art check accepts `.svg`)

**Constraint that makes this feasible tonight:** purple uses **only existing ops/keywords** — zero new engine mechanics. Its identity comes from a distinctive *combination*: manipulation & tempo denial (the space red and yellow both ignore) — e.g., `ranged`, `flying`, `untargetable`, bounce-flavored `removeNegative`/`grant`/`buff` tricks, damage that scales by position, influence *theft* framing via event-earned influence. Charter first; every card passes the same two-parent review as red/yellow.

**Art:** existing style is painted JPG; raster generation isn't available in this environment. Purple ships with a **coherent SVG art direction** (dark-violet palette, geometric arcane motifs, consistent composition rules — generated per card, same dimensions as existing art) so the deck reads as an intentional visual identity, explicitly documented as placeholder-until-real-art in the charter.

- [ ] Charter → card set (ledger files, `status: draft`) → art → engine color plumbing → `npm run cards` → prebuilt deck ("Violet <name>") → sims vs red and yellow → tune to the same bands as Task 9 → statuses to `canon` → commit in slices (charter / cards+art / engine / balance).

### Task 10.5: Synchronize the full game (apps/web + apps/server) with tonight's changes

**Files:**
- Audit then modify as found: `apps/web/src/**`, `apps/server/src/**` (seed, card display, help copy, deck picker with 3 decks)

**Interfaces:**
- Consumes: everything above (engine card set changes flow in automatically via `CARD_SET`).
- Produces: full-game app that matches the demo's rules presentation, ready for a future deploy.

- [ ] **Step 1:** `npm test && npm run typecheck` across all packages — fix any breakage the ledger flip or purple caused (expected hot spots: server seed with a third color, web deck picker, card-art paths for SVG).
- [ ] **Step 2:** Copy parity sweep: HelpPanel/gloss (already v2.1-current) vs demo Rulebook — align anything the churn retexted; confirm web card rendering handles every canon card (statics, auto-target notes) and SVG art.
- [ ] **Step 3:** If Postgres is available locally, boot the server + web, seed, and play one round to smoke the stack (`docs/AGENT/implement.md` DB discipline: never the test DB). If unavailable, record exactly what remains for deploy in the handoff.
- [ ] **Step 4:** Commit — `git commit -m "sync(web+server): full game matches canon-v1.0 demo — <items>"`.

### Task 10.6 (superseded original stretch task): Baseline proposals for additional colors beyond purple

**Files:**
- Create: `docs/canon/proposals/new-colors.md`

**Interfaces:** design-only; no engine work, no card files.

- [ ] **Step 1:** Write charter-shaped sketches for two colors whose mechanics are *distinguished from* red (tempo/self-cost) and yellow (walls/prison/influence): pick two orthogonal axes the current engine can already express or nearly express — e.g., **Blue: information & tempo** (card-flow, `ranged`, bounce-shaped `removeNegative`/`grant` tricks, the reserved `moveUnit` op as its signature) and **Green: growth & permanence** (perm `buff` scaling, `heal`, breakpoint statlines, resource-curve acceleration as a designed exception). For each: identity, keyword allowance (which existing keywords + at most ONE new mechanic each, named and specced in prose), invariants, influence posture, and 8–10 baseline card sketches in ledger frontmatter form (no files created).
- [ ] **Step 2:** Explicitly mark what the engine lacks for each (new ops? new keywords?) so the cost of adopting either color is visible.
- [ ] **Step 3:** Commit — `git commit -m "docs(canon): baseline charter proposals for two new colors (design only)"`.

### Task 11: Stamp canon-v1.0, merge, wrap

**Files:**
- Modify: `docs/canon/CANON.md` (stamp), `docs/PROMPTS/CURRENT-HANDOFF-PROMPT.md` (overwrite)
- Create: `docs/PROMPTS/SESSION-SUMMARIES/006.md`

- [ ] **Step 1:** Stamp `CANON.md`: canon-v1.0 = game-rules v2.1 · red charter · yellow charter · ledger (all cards `canon`). Final `npm test && npm run typecheck && npm run cards:check`.
- [ ] **Step 2:** Merge `canon-v1` → `main` (fast-forward or merge commit), tag: `git tag canon-v1.0`.
- [ ] **Step 3:** Session summary `006.md` (story, decisions, hand-off) per CLAUDE.md; overwrite the handoff prompt. Include: what Griff should look at first (README → INDEX → charters → open questions), the deploy-demo carried item, and the new-colors proposal if written.
- [ ] **Step 4:** Commit docs; push `main` + tags to origin (origin is already current through session 005; Blaine works across machines from it).

---

## Self-review notes

- **Spec coverage:** Decision 1 flip → Tasks 4–6; charters → Task 3; ruling sprint (⚑ agenda) → Task 2; two lanes + status + review gate → Tasks 7–8 (the gate's mechanical arm is `npm run cards:check` + the drift test; the judgment arm is documented in the README); "to verify during implementation" items → Task 5 Step 2 (CSV cross-check) and Task 6 Steps 1+6 (equality proof; DB seed path unchanged since `CARD_SET`'s shape is unchanged — `seedCore.ts` iterates it as before); canon versioning → Tasks 3+11 (with the session-006 amendment: no backwards re-stamp).
- **Beyond the 005 spec (Blaine, tonight):** per-card format (Task 1 amendment), clean-values license (Task 8), balance evening (Task 9), new-color proposals (Task 10).
- **Type consistency:** `parseCardFile(src, slug, color) → { card?: CardFile; errors: string[] }` and `serializeCardFile(def, status) → string` are used identically in Tasks 4, 5, 6; `CardStatus` values `draft|redesign|canon` everywhere; `generated.json` import mirrors the shipped `overrides.json` pattern (`with { type: 'json' }`), so no new toolchain risk.
- **Known judgment points left open on purpose** (design work, not placeholders): exact charter invariant wording (Task 3 writes it from pool stats), per-card retexts and redesigns (Task 8 applies the rulings + charter — the checklist and worklist are the spec), tuning magnitudes (Task 9 is sim-guided iteration).
