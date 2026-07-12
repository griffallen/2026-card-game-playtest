/** One-line rules text for every keyword/status — the single source for inspectors and legends.
 *  Phrasing mirrors the v3 rulebook's keyword table (issue #23: one voice across every teaching
 *  surface); entries live only in the classic v2.3 ruleset are marked. */
export const KEYWORD_GLOSS: Record<string, string> = {
  guard: 'Defends for free — stepping in front of an attack doesn\'t exhaust it, so it can defend again and still take its own turn.',
  armor: 'Every hit this unit takes is reduced by this much.',
  rush: 'Its first move the round it arrives is free — that one move doesn\'t exhaust it, so it can reposition and still attack. One free move only; a second exhausts it.',
  ranged: 'May attack a unit one zone away — no block window opens, and nothing strikes back. In its own zone it fights like anyone else. It never attacks bases.',
  reach: 'May attack units one zone away (bases still require standing in their Home). (Classic v2.3 only.)',
  flying: 'May move to any zone, ignoring adjacency. (Classic v2.3 only — retired in v3.)',
  breakthrough: 'When this attacker kills its blocker, all the leftover damage pushes through to its original target — unit or base. (Classic v2.3 capped the spill at N and sent it to the owner\'s life.)',
  overextend: 'Optional gamble when attacking: +N power now, N self-damage at end of round. (Classic v2.3 only — retired in v3.)',
  cantAttack: 'Cannot attack.',
  untargetable: 'Cannot be targeted by enemy action cards. (Classic v2.3 only.)',
  hidden: 'While ready, enemy actions can\'t target it and enemy attacks can\'t be declared at it. It can still block; anything that exhausts it reveals it until it readies again. Effects that don\'t choose ("all", whole-zone, automatic picks) still reach it.',
  infiltrate: 'May be played into any zone — not just your Home.',
  sneak: 'An ability used as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone.',
  capture: 'Takes an enemy unit under this one, off the board entirely, at no cost to the capturer. The captive returns — ready — when the capturer leaves play or lets it go (decision 73).',
  shielded: 'Arrives with a shield token: the first time it would take damage, the whole hit is prevented and the token is spent.',
  scar: 'Gets +1 Power for each damage marked on it, capped at its remaining Health — the wound powers it, never past what it can survive.',
}

export function glossFor(keyword: string): string {
  const name = keyword.split(' ')[0]
  return KEYWORD_GLOSS[name] ?? ''
}

export const STATUS_GLOSS = {
  exhausted: 'Exhausted ⟳ — already acted; readies at the start of its owner\'s next round.',
  rushFreeMove: 'Rush 💨 — its one free move this round (the one it arrived): move without exhausting, and it can still attack after. The 💨 clears once it moves.',
  imprisoned: 'Imprisoned ⛓ — cannot attack, move, or defend; abilities and Guard are switched off. Costs the jailer 1 influence each round; breaks if their influence goes negative. (Classic v2.3 only.)',
} as const
