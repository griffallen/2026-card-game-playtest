/** One-line rules text for every keyword/status — the single source for inspectors and legends. */
export const KEYWORD_GLOSS: Record<string, string> = {
  guard: 'Attackers in this zone must target this unit first — the base included.',
  armor: 'Every hit on this unit is reduced by this much.',
  rush: 'May attack and move the turn it arrives.',
  ranged: 'May shoot units one zone away; never bases; cross-zone shots draw no counter-damage.',
  reach: 'May attack units one zone away (bases still require standing in their Home).',
  flying: 'May move to any zone, ignoring adjacency. (Prototype ruling — needs design.)',
  breakthrough: 'On killing a unit, up to this much excess damage hits the owner\'s life.',
  overextend: 'Optional gamble when attacking: +N power now, N self-damage at end of turn.',
  cantAttack: 'Cannot attack.',
  untargetable: 'Cannot be targeted by enemy action cards.',
}

export function glossFor(keyword: string): string {
  const name = keyword.split(' ')[0]
  return KEYWORD_GLOSS[name] ?? ''
}

export const STATUS_GLOSS = {
  exhausted: 'Exhausted ⟳ — already acted; readies at the start of its owner\'s next turn.',
  sick: 'Just arrived 💤 — cannot attack or move until next turn (Rush ignores this).',
  imprisoned: 'Imprisoned ⛓ — cannot attack, move, or defend; abilities and Guard are switched off. Costs the jailer 1 influence each turn; breaks if their influence goes negative.',
} as const
