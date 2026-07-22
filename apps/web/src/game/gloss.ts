/** THE single source for keyword teaching text and symbols — inspectors, tooltips, card
 *  frames and legends all read from here (issue #114). It used to live in two places (this
 *  file's long gloss and a short one inside UnitChip); a rename like Politician → Tribune
 *  (#125) had to be made twice, so the two copies were collapsed into one record.
 *
 *  Only LIVE keywords appear — the thirteen that actually sit on cards today. Reach and
 *  Flying (cut in #8 / superseded by Hidden), Overextend (superseded by Scar), Untargetable
 *  (superseded by Hidden) and Imprisoned (prison cut whole, #3) are gone: a gloss for a
 *  keyword no card carries is a teaching surface lying about the game.
 *
 *  `gloss` mirrors the rulebook's keyword table (issue #23: one voice on every surface).
 *  `short` is the glance-level reminder for hover tooltips on the table (issue #63).
 *  `icon` is Griff's locked symbol set (issue #114) — eleven picked by him (hidden 🙈 and
 *  capture 🔒 added in his 2026-07-20 pass), two chosen to match in spirit (scar 🩸, cantAttack ⛔). */
export interface KeywordInfo {
  icon: string
  short: string
  gloss: string
}

export const KEYWORDS: Record<string, KeywordInfo> = {
  guard: {
    icon: '🏰',
    short: 'the only unit that may block a lone attack on a unit, and it never exhausts to block',
    gloss: 'The bodyguard. When ONE unit attacks alone, no ordinary unit may block — but a Guard may step in front of the target (one Guard, full redirect) — and it defends without exhausting, so it can do it again. In gang attacks it blocks freely like anyone, still for free.',
  },
  armor: {
    icon: '🪖',
    short: 'every hit it takes is reduced by that much',
    gloss: 'Every hit this unit takes is reduced by this much.',
  },
  rush: {
    icon: '💨',
    short: 'its first move each round is free',
    gloss: 'A static ability: its first move each round is free — that one move doesn\'t exhaust it, so it can reposition and still attack. One free move per round (it refreshes every round the unit stays in play); a second the same round exhausts it. It grants no extra action and never lets the unit attack any sooner.',
  },
  ranged: {
    icon: '🏹',
    short: 'exhaust to volley that much damage at any enemy unit, any zone',
    gloss: 'Ability: exhaust this unit to deal its Ranged number to one enemy unit in any zone (a chosen shot — ready Hidden units refuse it). Its regular attacks are ordinary. (Classic v2.3: attacks one zone away instead, no counter, never bases.)',
  },
  breakthrough: {
    icon: '💪',
    short: 'defeats what it strikes → the leftover splashes on, and the DEFENDER picks where it lands (a unit, or their base in their Home), chaining on each defeat',
    gloss: 'When this attacker defeats what it strikes, the leftover damage splashes onward and the DEFENDER chooses where it lands — another of their units in the zone, or their base when the fight is in their own Home. Defeat that link too and the rest chains to the next pick, until a unit survives and soaks it or nothing is left to hit. Only Breakthrough chains; a Shield or Ward turns the whole blow aside and ends it. (Classic v2.3 capped the spill at N and sent it to the owner\'s life.)',
  },
  cantAttack: {
    icon: '⛔',
    short: 'holds the zone and blocks, but never attacks',
    gloss: 'Cannot attack.',
  },
  hidden: {
    icon: '🙈',
    short: "while ready it can't be targeted or attacked; exhausting reveals it",
    gloss: 'While Ready, enemy actions can\'t target it and enemy attacks can\'t be declared at it. Effects that don\'t choose ("all", whole-zone, automatic picks) still reach it.',
  },
  infiltrate: {
    icon: '🗝️',
    short: 'may deploy into any zone',
    gloss: 'May be played into any zone — not just your Home.',
  },
  sneak: {
    icon: '🥷',
    short: 'exhaust as your turn to use its printed ability',
    gloss: 'An ability used as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone.',
  },
  capture: {
    icon: '🔒',
    short: 'takes an enemy unit under it until the holder leaves play',
    gloss: 'Takes an enemy unit under this one, off the board entirely. Holding costs nothing — the grip breaks only when the capturer dies, and the freed captive returns to that zone ready. Kill the jailer to free the prisoner.',
  },
  shielded: {
    icon: '🛡️',
    short: 'the first hit it would take is fully prevented',
    gloss: 'Arrives with a shield token: the first time it would take damage, the whole hit is prevented and the token is spent.',
  },
  scar: {
    icon: '🩸',
    short: '+1 power per damage marked on it — no cap',
    gloss: 'Gets +1 Power for each damage marked on it — no cap. Every wound is fuel; a Scar unit at 1 health hits hardest.',
  },
  tribune: {
    icon: '⚖️',
    short: 'enters/leaves play → ±1 Hope (nets to zero). Round end: +1 per Tribune for a Neutral majority, +2 each for an enemy-Home majority (stacks)',
    gloss: 'A Tribune changes its controller\'s Hope just by taking or leaving the field: +1 Hope every time it enters play (deployed, or returned from capture), and −1 every time it leaves (defeated OR captured). It keys off the event, not the reason, so over a Tribune\'s whole life it nets to zero and cannot be farmed — a capture (−1) and its later release (+1) cancel. Separately, at the end of each round, count your Tribunes: hold the majority in the Neutral zone and you gain +1 Hope per Tribune; hold the majority in your enemy\'s Home zone and you gain +2 per Tribune — the two stack (both majorities = +3 each). "Majority" means strictly more of your units than the opponent\'s in that zone; a tie is not a majority.',
  },
}

/** A keyword as it arrives from the engine is `guard` or `armor 2` — take the name. */
const nameOf = (keyword: string) => keyword.split(' ')[0]

/** The full rules line — inspectors and legends. Empty string for anything unknown. */
export function glossFor(keyword: string): string {
  return KEYWORDS[nameOf(keyword)]?.gloss ?? ''
}

/** The one-breath reminder — hover tooltips on the table. */
export function shortGlossFor(keyword: string): string {
  return KEYWORDS[nameOf(keyword)]?.short ?? ''
}

/** Griff's symbol (issue #114). Empty string for anything unknown, so callers can skip it. */
export function iconFor(keyword: string): string {
  return KEYWORDS[nameOf(keyword)]?.icon ?? ''
}

export const STATUS_GLOSS = {
  exhausted: 'Exhausted ⟳ — already acted; readies at the start of its owner\'s next round. It can\'t block for others, but if attacked it still strikes back — full power to a lone attacker, or its power poured across a gang (biggest first).',
  rushFreeMove: 'Rush 💨 — its free move for this round: move without exhausting, and it can still attack after. Refreshes every round; the 💨 clears once it moves.',
} as const
