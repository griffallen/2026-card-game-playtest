/**
 * Generate `docs/rules.md` from the demo's rulebook page.
 *
 * `apps/demo/src/pages/Rules.tsx` is the SINGLE SOURCE of the rules prose — it is what
 * players read on the demo, so it is the copy that gets kept honest. This script renders
 * that page and serialises it to markdown for the agents (and for anyone reading the repo).
 *
 *   npm run rules:doc          write docs/rules.md
 *   npm run rules:doc -- --check   exit 1 if the committed file is out of date (CI gate)
 *
 * Mirrors the existing `cards` / `cards:check` pair in scripts/cards-build.ts.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Rules } from '../apps/demo/src/pages/Rules.tsx'
import { DEFAULT_RULES, RULES_VERSION, V3_RULES } from '../packages/engine/src/rules.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'docs/rules.md')

// ── minimal HTML → markdown (we control the tag set the page emits) ───────────
type Node = { tag: string; attrs: Record<string, string>; kids: (Node | string)[] }
const VOID = new Set(['br', 'hr', 'img', 'input'])

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')

function parse(html: string): (Node | string)[] {
  const out: (Node | string)[] = []
  const stack: Node[] = []
  const push = (n: Node | string) => (stack.length ? stack[stack.length - 1].kids.push(n) : out.push(n))
  const re = /<\/?([a-zA-Z0-9]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*\/?>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m.index > last) push(decode(html.slice(last, m.index)))
    const [full, tag, rawAttrs] = m
    if (full.startsWith('</')) stack.pop()
    else {
      const attrs: Record<string, string> = {}
      for (const a of rawAttrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[a[1]] = a[2]
      const node: Node = { tag, attrs, kids: [] }
      push(node)
      if (!VOID.has(tag) && !full.endsWith('/>')) stack.push(node)
    }
    last = re.lastIndex
  }
  if (last < html.length) push(decode(html.slice(last)))
  return out
}

function inline(kids: (Node | string)[]): string {
  return kids.map(k => {
    if (typeof k === 'string') return k.replace(/\s+/g, ' ')
    switch (k.tag) {
      case 'b': case 'strong': return `**${inline(k.kids).trim()}**`
      case 'i': case 'em': return `*${inline(k.kids).trim()}*`
      case 'code': return `\`${inline(k.kids).trim()}\``
      case 'a': {
        const text = inline(k.kids).trim()
        const href = k.attrs.href ?? ''
        // in-app router links become demo-site links; bare anchors keep their href
        return href.startsWith('/') ? `[${text}](https://booherbg.github.io/new-game-demo/#${href})` : href ? `[${text}](${href})` : text
      }
      case 'br': return '\n'
      default: return inline(k.kids)
    }
  }).join('')
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/ ([.,;:!?)])/g, '$1').trim()

/** tags that belong inside a paragraph rather than starting a block of their own */
const INLINE = new Set(['b', 'strong', 'i', 'em', 'code', 'a', 'span', 'br'])

function block(nodes: (Node | string)[]): string[] {
  const out: string[] = []
  let run: (Node | string)[] = []
  const flush = () => {
    if (!run.length) return
    const text = tidy(inline(run))
    run = []
    if (text) out.push(text)
  }
  for (const n of nodes) {
    if (typeof n === 'string' || INLINE.has(n.tag)) { run.push(n); continue }
    flush()
    const cls = n.attrs.class ?? ''
    switch (n.tag) {
      case 'h1': out.push(`# ${tidy(inline(n.kids))}`); break
      case 'h2': out.push(`## ${tidy(inline(n.kids))}`); break
      case 'h3': out.push(`### ${tidy(inline(n.kids))}`); break
      case 'p': {
        const text = tidy(inline(n.kids))
        if (!text) break
        if (cls.includes('uppercase')) break                                   // the eyebrow line — carried in front-matter instead
        if (cls.includes('font-display') && cls.includes('font-semibold')) { out.push(`### ${text}`); break }
        out.push(text)
        break
      }
      case 'ul': {
        const items: string[] = []
        for (const li of n.kids) {
          if (typeof li === 'string' || li.tag !== 'li') continue
          items.push(`- ${tidy(inline(li.kids))}`)
        }
        if (items.length) out.push(items.join('\n'))    // one block — keeps the list tight
        break
      }
      case 'table': {
        const rows: string[][] = []
        const collect = (nd: Node) => {
          for (const k of nd.kids) {
            if (typeof k === 'string') continue
            if (k.tag === 'tr') rows.push(k.kids.filter((c): c is Node => typeof c !== 'string').map(c => tidy(inline(c.kids))))
            else collect(k)
          }
        }
        collect(n)
        if (!rows.length) break
        out.push([                                                              // one block — keeps the table intact
          '| Keyword | What it does |',
          '|---|---|',
          ...rows.map(r => `| ${r.join(' | ')} |`),
        ].join('\n'))
        break
      }
      case 'div': {
        if (cls.includes('panel')) {                                            // <Card> callout → blockquote
          const inner = block(n.kids).join('\n\n').split('\n')
          out.push(inner.map(l => (l ? `> ${l}` : '>')).join('\n'))
          break
        }
        if (cls.includes('text-center')) {                                      // the board diagram → fenced block
          out.push('```\n' + tidy(inline(n.kids)) + '\n```')
          break
        }
        out.push(...block(n.kids))
        break
      }
      default: out.push(...block(n.kids))
    }
  }
  flush()
  return out
}

// ── the engine-parameter appendix: generated, so numbers can never drift ──────
const TUNABLE: [keyof typeof V3_RULES, string][] = [
  ['startingLife', 'Starting Life'],
  ['influenceWinThreshold', 'Influence needed to win (either direction)'],
  ['startingHandSize', 'Opening hand'],
  ['startingResources', 'Cards banked at setup'],
  ['drawPerRound', 'Cards drawn at the start of each round'],
  ['resourcesPerRound', 'Cards you may bank per round'],
  ['deckMinSize', 'Minimum deck size'],
  ['maxCopies', 'Max copies of one card'],
  ['emptyDrawLifeLoss', 'Life lost per card drawn from an empty deck'],
  ['emptyDrawInfluenceLoss', 'Influence lost per card drawn from an empty deck'],
]

function paramsTable(): string {
  const rows = TUNABLE.map(([k, label]) => `| ${label} | \`${String(V3_RULES[k])}\` | \`${k}\` |`)
  return [
    '## Engine parameters',
    '',
    'Generated from `packages/engine/src/rules.ts` (`V3_RULES`) — the values the demo actually runs.',
    'If a number in the prose above disagrees with this table, the table is right and the prose is a bug.',
    '',
    '| Rule | Value | Engine key |',
    '|---|---|---|',
    ...rows,
    '',
    `Combat model: \`${V3_RULES.combatModel}\` · retaliation: \`${V3_RULES.retaliation}\` · pips: \`${V3_RULES.pipModel}\` · `
      + `units enter ready: \`${!V3_RULES.summoningSickness}\` · round-1 start step: \`${V3_RULES.firstRoundStartStep}\``,
  ].join('\n')
}

function build(): string {
  const html = renderToStaticMarkup(h(MemoryRouter, { initialEntries: ['/rules'] }, h(Rules)))
  const body = block(parse(html)).filter(Boolean).join('\n\n')
  return [
    '<!-- GENERATED FILE — do not edit.',
    '     Source: apps/demo/src/pages/Rules.tsx (the rulebook players read on the demo).',
    '     Regenerate: npm run rules:doc -->',
    '',
    body.replace(/^# (.*)$/m, `# $1\n\n*Rules version **${RULES_VERSION}** — the same number as the engine package, bumped on every combat-behaviour change (issue #119).*`),
    '',
    paramsTable(),
    '',
  ].join('\n')
}

const next = build()
if (process.argv.includes('--check')) {
  let current = ''
  try { current = readFileSync(OUT, 'utf8') } catch { /* missing counts as stale */ }
  if (current !== next) {
    console.error('docs/rules.md is out of date with apps/demo/src/pages/Rules.tsx — run `npm run rules:doc`')
    process.exit(1)
  }
  console.log('docs/rules.md is current')
} else {
  writeFileSync(OUT, next)
  console.log(`wrote docs/rules.md (${next.split('\n').length} lines)`)
}

// referenced so a stale legacy preset can't silently diverge from what we document
void DEFAULT_RULES
