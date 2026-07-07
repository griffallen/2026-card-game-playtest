/** Deterministic PRNG (mulberry32), threaded as explicit state — the engine owns no mutable globals. */

export function rngNext(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Integer in [0, n) */
export function rngInt(state: number, n: number): [value: number, next: number] {
  const [v, next] = rngNext(state)
  return [Math.floor(v * n), next]
}

/** Fisher–Yates; returns a new array and the advanced rng state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const arr = items.slice()
  let s = state
  for (let i = arr.length - 1; i > 0; i--) {
    let j: number
    ;[j, s] = rngInt(s, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return [arr, s]
}
