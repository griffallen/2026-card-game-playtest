#!/usr/bin/env node
// Thin CLI over the corpus library. Commands: collect, list, purge.
//
//   corpus:collect --issue 98            scrape issue #98's comments via `gh` and file the games
//   corpus:collect --file game.txt       collect from a file (a paste, or a .json of blocks)
//   corpus:collect -                     collect from stdin
//   corpus:list                          summarize the corpus, grouped by version fingerprint
//   corpus:purge --keep-current --yes    drop every log not matching the current engine+cardset
//   corpus:purge --drop-key <key> --yes  drop one fingerprint's logs
//
// Selection axes for purge: --keep-current / --drop-current (cards+engine of the checked-out
// repo, rules-agnostic), --{keep,drop}-key K, --{keep,drop}-rules R, --{keep,drop}-cards H.
// Purge is a preview (dry-run) unless you pass --yes.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { collectFromSources, type CollectSource } from './collect.ts'
import { listCorpus, purgeCorpus, defaultCorpusDir, type Selector } from './store.ts'
import { repoFingerprintSources, computeFingerprint } from './fingerprint.ts'
import type { FingerprintFilter } from './types.ts'

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
function flag(argv: string[], name: string): boolean {
  return argv.includes(name)
}

function readStdin(): string {
  try { return readFileSync(0, 'utf8') } catch { return '' }
}

function scrapeIssue(n: number): CollectSource[] {
  const raw = execFileSync('gh', ['issue', 'view', String(n), '--json', 'comments'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const { comments } = JSON.parse(raw) as { comments: { body: string; url?: string; author?: { login?: string } }[] }
  return comments.map((c, i) => ({ text: c.body, source: c.url ?? `issue-${n}#comment-${i}${c.author?.login ? `-${c.author.login}` : ''}` }))
}

function cmdCollect(argv: string[]): number {
  const dir = arg(argv, '--dir') ?? defaultCorpusDir()
  const requireWinner = flag(argv, '--require-winner')
  let sources: CollectSource[] = []
  const issue = arg(argv, '--issue')
  const file = arg(argv, '--file')
  if (issue) sources = scrapeIssue(Number(issue))
  else if (file) sources = [{ text: readFileSync(file, 'utf8'), source: `file:${file}` }]
  else sources = [{ text: readStdin(), source: 'stdin' }]

  const report = collectFromSources(dir, sources, { requireWinner })
  const archived = report.collected.filter(c => c.archived).length
  console.log(`corpus: ${dir}`)
  console.log(`collected ${report.collected.length}${archived ? ` (${archived} archived — retired cards)` : ''}, skipped ${report.skipped.length} (dupes), rejected ${report.rejected.length}`)
  for (const c of report.collected) console.log(`  + ${c.gameId}  [${c.key}]  winner=${c.winner ?? 'none'}${c.archived ? '  ⧗archived' : ''}  <- ${c.source}`)
  for (const s of report.skipped) console.log(`  = ${s.gameId}  (${s.reason})`)
  for (const r of report.rejected) console.log(`  x seed ${r.seed ?? '?'}  rejected: ${r.reason}  <- ${r.source}`)
  return 0
}

function cmdList(argv: string[]): number {
  const dir = arg(argv, '--dir') ?? defaultCorpusDir()
  const groups = listCorpus(dir)
  if (flag(argv, '--json')) { console.log(JSON.stringify(groups, null, 2)); return 0 }
  console.log(`corpus: ${dir}`)
  if (!groups.length) { console.log('  (empty)'); return 0 }
  const cur = currentFilter().cards
  let total = 0
  for (const g of groups) {
    total += g.count
    const mark = g.cards === cur ? ' *current' : ''
    console.log(`  ${g.key}${mark}`)
    console.log(`    rules ${g.rules} · engine ${g.engine} · cards ${g.cards} · ${g.count} games (${g.terminal} finished)`)
    console.log(`    winners: seat0 ${g.winners.seat0} · seat1 ${g.winners.seat1} · none ${g.winners.none}`)
  }
  console.log(`  ${total} games across ${groups.length} version(s). * = current engine+cardset`)
  return 0
}

/** The current engine+cardset (rules-agnostic) as a filter. */
function currentFilter(): { cards: string; engine: string } {
  const { catalog, engineVersion } = repoFingerprintSources()
  const fp = computeFingerprint({ rules: 'x', catalog, engineVersion })
  return { cards: fp.cards, engine: fp.engine }
}

function purgeSelector(argv: string[]): Selector | null {
  const pairs: [string, 'keep' | 'drop', keyof FingerprintFilter | 'current'][] = [
    ['--keep-current', 'keep', 'current'], ['--drop-current', 'drop', 'current'],
    ['--keep-key', 'keep', 'key'], ['--drop-key', 'drop', 'key'],
    ['--keep-rules', 'keep', 'rules'], ['--drop-rules', 'drop', 'rules'],
    ['--keep-cards', 'keep', 'cards'], ['--drop-cards', 'drop', 'cards'],
  ]
  for (const [name, mode, field] of pairs) {
    if (field === 'current') {
      if (flag(argv, name)) { const c = currentFilter(); return { mode, filter: { cards: c.cards, engine: c.engine } } }
      continue
    }
    const v = arg(argv, name)
    if (v !== undefined) return { mode, filter: { [field]: v } }
  }
  return null
}

function cmdPurge(argv: string[]): number {
  const dir = arg(argv, '--dir') ?? defaultCorpusDir()
  const selector = purgeSelector(argv)
  if (!selector) {
    console.error('purge: choose a selector — --keep-current | --{keep,drop}-{key,rules,cards} <value>')
    return 2
  }
  const yes = flag(argv, '--yes')
  const report = purgeCorpus(dir, selector, { dryRun: !yes })
  const verb = yes ? 'dropped' : 'would drop'
  console.log(`corpus: ${dir}`)
  console.log(`${verb} ${report.dropped.length}, keeping ${report.kept.length}`)
  for (const e of report.dropped) console.log(`  - ${e.meta.gameId}  [${e.meta.fingerprint.key}]`)
  if (!yes && report.dropped.length) console.log('  (dry-run — re-run with --yes to delete)')
  return 0
}

function main(): number {
  const [cmd, ...argv] = process.argv.slice(2)
  switch (cmd) {
    case 'collect': return cmdCollect(argv)
    case 'list': return cmdList(argv)
    case 'purge': return cmdPurge(argv)
    default:
      console.error('usage: corpus <collect|list|purge> [options]  (see packages/corpus/src/cli.ts)')
      return 2
  }
}

process.exit(main())
