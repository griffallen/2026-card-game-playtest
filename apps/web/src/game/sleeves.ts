/** Per-player card sleeves (issue #22): in a mirror match the art stops telling you whose
 *  card is whose, so ownership rides on the card itself — like sleeves at a physical table.
 *  Issue #61 (Blaine): the two neutral metals read too alike, and ivory shoulder-to-shoulder
 *  with a yellow deck lies about the faction — so players may now pick their own, and the
 *  picks are BOLD. Defaults keep the original pair: solid ivory for you, dashed gunmetal
 *  for the enemy (issue #28 — the dash is the secondary ownership cue).
 *  Issue #114 (Griff): "all 5 colors of the decks and any 7 rainbow colors not already
 *  included" — six was too few to sleeve to your deck. The set below is one sleeve per
 *  distinguishable hue at a 2px outline: three neutrals (ivory, gunmetal, obsidian) and the
 *  full spectrum (crimson · copper · amber · lime · emerald · teal · cobalt · indigo ·
 *  violet · rose). Anything closer than that reads as the same sleeve across the table. */
export type Sleeve =
  | 'ivory' | 'gunmetal' | 'obsidian'
  | 'crimson' | 'copper' | 'amber' | 'lime' | 'emerald' | 'teal' | 'cobalt' | 'indigo' | 'violet' | 'rose'

export const sleeveFor = (mine: boolean): Sleeve => (mine ? 'ivory' : 'gunmetal')

/** The pickable set, in display order (neutrals, then round the wheel), with table-talk names. */
export const SLEEVE_CHOICES: { id: Sleeve; label: string }[] = [
  { id: 'ivory', label: 'Ivory' },
  { id: 'gunmetal', label: 'Gunmetal' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'crimson', label: 'Crimson' },
  { id: 'copper', label: 'Copper' },
  { id: 'amber', label: 'Amber' },
  { id: 'lime', label: 'Lime' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'teal', label: 'Teal' },
  { id: 'cobalt', label: 'Cobalt' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'violet', label: 'Violet' },
  { id: 'rose', label: 'Rose' },
]

/** Edge trim uses `outline` (not ring/box-shadow) so sleeves never fight the .glow-* cues.
 *  Gunmetal keeps its dash (issue #28); the bold colors carry ownership by hue alone.
 *  Obsidian is the one dark sleeve — it reads as a black rim against the raised card, which
 *  is exactly how black sleeves read at a real table. */
export const SLEEVE_EDGE: Record<Sleeve, string> = {
  ivory: 'outline outline-2 outline-offset-0 outline-[#e3d8b4]',
  gunmetal: 'outline-dashed outline-2 outline-offset-0 outline-[#8b96a4]',
  obsidian: 'outline outline-2 outline-offset-0 outline-[#0d0d13]',
  crimson: 'outline outline-2 outline-offset-0 outline-[#e2483e]',
  copper: 'outline outline-2 outline-offset-0 outline-[#e07a2c]',
  amber: 'outline outline-2 outline-offset-0 outline-[#e8b62c]',
  lime: 'outline outline-2 outline-offset-0 outline-[#9ed13a]',
  emerald: 'outline outline-2 outline-offset-0 outline-[#2ebd6b]',
  teal: 'outline outline-2 outline-offset-0 outline-[#1fb9b0]',
  cobalt: 'outline outline-2 outline-offset-0 outline-[#3e7ee2]',
  indigo: 'outline outline-2 outline-offset-0 outline-[#5a4fd6]',
  violet: 'outline outline-2 outline-offset-0 outline-[#a04ee0]',
  rose: 'outline outline-2 outline-offset-0 outline-[#ec5aa0]',
}

/** The lip: a small tab hanging inside the top edge — hand/board rows are overflow-x-auto,
 *  so anything peeking *above* the card would clip. */
export const SLEEVE_TAB: Record<Sleeve, string> = {
  ivory: 'bg-gradient-to-b from-[#ded3b0] to-[#a89d78]',
  gunmetal: 'bg-gradient-to-b from-[#99a3b0] to-[#5f6975]',
  obsidian: 'bg-gradient-to-b from-[#3a3a46] to-[#0d0d13]',
  crimson: 'bg-gradient-to-b from-[#f06055] to-[#a32c24]',
  copper: 'bg-gradient-to-b from-[#f0913f] to-[#a3520f]',
  amber: 'bg-gradient-to-b from-[#f3ca4c] to-[#a87f10]',
  lime: 'bg-gradient-to-b from-[#b9e35c] to-[#6b9418]',
  emerald: 'bg-gradient-to-b from-[#4fd68c] to-[#1e8a4c]',
  teal: 'bg-gradient-to-b from-[#48d6cd] to-[#12857e]',
  cobalt: 'bg-gradient-to-b from-[#5f97ef] to-[#2856a8]',
  indigo: 'bg-gradient-to-b from-[#7d73ec] to-[#3a319e]',
  violet: 'bg-gradient-to-b from-[#b76ef0] to-[#7231a8]',
  rose: 'bg-gradient-to-b from-[#f581bb] to-[#ad2f70]',
}

/** Swatch backgrounds for the setup picker. */
export const SLEEVE_SWATCH: Record<Sleeve, string> = {
  ivory: 'bg-[#e3d8b4]',
  gunmetal: 'bg-[#8b96a4]',
  obsidian: 'bg-[#0d0d13]',
  crimson: 'bg-[#e2483e]',
  copper: 'bg-[#e07a2c]',
  amber: 'bg-[#e8b62c]',
  lime: 'bg-[#9ed13a]',
  emerald: 'bg-[#2ebd6b]',
  teal: 'bg-[#1fb9b0]',
  cobalt: 'bg-[#3e7ee2]',
  indigo: 'bg-[#5a4fd6]',
  violet: 'bg-[#a04ee0]',
  rose: 'bg-[#ec5aa0]',
}
