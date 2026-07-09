/** One-line rules text for every keyword/status — the single source for inspectors and legends. */
export const KEYWORD_GLOSS: Record<string, string> = {
  guard: 'Can intercept an attack in its zone without exhausting — step in front of a targeted ally (or the base).',
  armor: 'Every hit on this unit is reduced by this much.',
  rush: 'Its first move the round it arrives is free — that one move doesn’t exhaust it, so it can reposition and still attack. One free move only; a second exhausts it.',
  ranged: 'May shoot units one zone away; never bases; cross-zone shots draw no counter-damage.',
  reach: 'May attack units one zone away (bases still require standing in their Home).',
  flying: 'May move to any zone, ignoring adjacency. (Prototype ruling — needs design.)',
  breakthrough: 'On killing a unit, up to this much excess damage hits the owner\'s life.',
  overextend: 'Optional gamble when attacking: +N power now, N self-damage at end of round.',
  cantAttack: 'Cannot attack.',
  untargetable: 'Cannot be targeted by enemy action cards.',
}

export function glossFor(keyword: string): string {
  const name = keyword.split(' ')[0]
  return KEYWORD_GLOSS[name] ?? ''
}

export const STATUS_GLOSS = {
  exhausted: 'Exhausted ⟳ — already acted; readies at the start of its owner\'s next round.',
  rushFreeMove: 'Rush 💨 — its one free move this round (the one it arrived): move without exhausting, and it can still attack after. The 💨 clears once it moves.',
  imprisoned: 'Imprisoned ⛓ — cannot attack, move, or defend; abilities and Guard are switched off. Costs the jailer 1 influence each round; breaks if their influence goes negative.',
} as const
