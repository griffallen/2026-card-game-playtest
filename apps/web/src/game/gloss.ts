/** One-line rules text for every keyword/status — the single source for inspectors and legends.
 *  Phrasing mirrors the v3 rulebook's keyword table (issue #23: one voice across every teaching
 *  surface); entries live only in the classic v2.3 ruleset are marked. */
export const KEYWORD_GLOSS: Record<string, string> = {
  guard: 'The bodyguard. When ONE unit attacks alone, no ordinary unit may block — but a Guard may step in front of the target (one Guard, full redirect) — and it defends without exhausting, so it can do it again. In gang attacks it blocks freely like anyone, still for free.',
  armor: 'Every hit this unit takes is reduced by this much.',
  rush: 'A static ability: its first move each round is free — that one move doesn\'t exhaust it, so it can reposition and still attack. One free move per round (it refreshes every round the unit stays in play); a second the same round exhausts it. It grants no extra action and never lets the unit attack any sooner.',
  ranged: 'Ability: exhaust this unit to deal its Ranged number to one enemy unit in any zone (a chosen shot — ready Hidden units refuse it). Its regular attacks are ordinary. (Classic v2.3: attacks one zone away instead, no counter, never bases.)',
  reach: 'May attack units one zone away (bases still require standing in their Home). (Classic v2.3 only.)',
  flying: 'May move to any zone, ignoring adjacency. (Classic v2.3 only — retired in v3.)',
  breakthrough: 'When this attacker kills its blocker, all the leftover damage pushes through to its original target — unit or base. (Classic v2.3 capped the spill at N and sent it to the owner\'s life.)',
  overextend: 'Optional gamble when attacking: +N power now, N self-damage at end of round. (Classic v2.3 only — retired in v3.)',
  cantAttack: 'Cannot attack.',
  untargetable: 'Cannot be targeted by enemy action cards. (Classic v2.3 only.)',
  hidden: 'While Ready, enemy actions can\'t target it and enemy attacks can\'t be declared at it. Effects that don\'t choose ("all", whole-zone, automatic picks) still reach it.',
  infiltrate: 'May be played into any zone — not just your Home.',
  sneak: 'An ability used as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone.',
  capture: 'Takes an enemy unit under this one, off the board entirely. Holding costs nothing — the grip breaks only when the capturer dies, and the freed captive returns to that zone ready. Kill the jailer to free the prisoner.',
  shielded: 'Arrives with a shield token: the first time it would take damage, the whole hit is prevented and the token is spent.',
  scar: 'Gets +1 Power for each damage marked on it — no cap. Every wound is fuel; a Scar unit at 1 health hits hardest.',
  politician: 'At the end of each round, count your Politicians: hold the majority in the Neutral zone and you gain +1 Influence per Politician; hold the majority in your enemy\'s Home zone and you gain +2 per Politician — the two stack (both majorities = +3 each). "Majority" means strictly more of your units than the opponent\'s in that zone; a tie is not a majority.',
}

export function glossFor(keyword: string): string {
  const name = keyword.split(' ')[0]
  return KEYWORD_GLOSS[name] ?? ''
}

export const STATUS_GLOSS = {
  exhausted: 'Exhausted ⟳ — already acted; readies at the start of its owner\'s next round. It can\'t block for others, but if attacked it still strikes back — full power to a lone attacker, or its power poured across a gang (biggest first).',
  rushFreeMove: 'Rush 💨 — its free move for this round: move without exhausting, and it can still attack after. Refreshes every round; the 💨 clears once it moves.',
  imprisoned: 'Imprisoned ⛓ — cannot attack, move, or defend; abilities and Guard are switched off. Costs the jailer 1 influence each round; breaks if their influence goes negative. (Classic v2.3 only.)',
} as const
