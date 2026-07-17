import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Fingerprint } from './types.ts'

/** Repo root, resolved from this file: packages/corpus/src -> ../../.. */
function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
}

/** Directory-safe: keep letters, digits, dot, underscore, hyphen; everything else -> '-'. */
function safe(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '-')
}

export interface FingerprintInput {
  rules: string
  /** The generated card catalog, as bytes or a string. */
  catalog: string | Uint8Array
  /** The engine package version. */
  engineVersion: string
}

/**
 * The version a log was played under, as a filterable fingerprint. Three axes:
 *   - rules   — the mode the player chose (from the replay block), e.g. "v3.0"
 *   - engine  — the engine package version
 *   - cards   — a short sha256 of the generated card catalog (what actually changes when a
 *               balance pass adds/removes/retunes a card, e.g. dropping Doombringer)
 * The `key` folds all three into one directory-safe token, so purging old versions is a
 * filter on the folder name, not archaeology.
 */
export function computeFingerprint(input: FingerprintInput): Fingerprint {
  const cards = createHash('sha256').update(input.catalog).digest('hex').slice(0, 12)
  const rules = input.rules
  const engine = input.engineVersion
  const key = safe(`rules-${rules}__engine-${engine}__cards-${cards}`)
  return { key, rules, engine, cards }
}

/** Read the truthful fingerprint sources from the checked-out repo. */
export function repoFingerprintSources(root = repoRoot()): { catalog: string; engineVersion: string } {
  const catalog = readFileSync(resolve(root, 'packages/engine/src/cards/generated.json'), 'utf8')
  const pkg = JSON.parse(readFileSync(resolve(root, 'packages/engine/package.json'), 'utf8')) as { version?: string }
  return { catalog, engineVersion: pkg.version ?? '0.0.0' }
}

/** Fingerprint a game (played under `rules`) against the currently checked-out engine + catalog. */
export function currentFingerprint(rules: string, root?: string): Fingerprint {
  const { catalog, engineVersion } = repoFingerprintSources(root)
  return computeFingerprint({ rules, catalog, engineVersion })
}
