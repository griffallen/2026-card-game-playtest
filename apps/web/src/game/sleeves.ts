/** Per-player card sleeves (issue #22): in a mirror match the art stops telling you whose
 *  card is whose, so ownership rides on the card itself — like sleeves at a physical table.
 *  Issue #61 (Blaine): the two neutral metals read too alike, and ivory shoulder-to-shoulder
 *  with a yellow deck lies about the faction — so players may now pick their own, and the
 *  picks are BOLD. Defaults keep the original pair: solid ivory for you, dashed gunmetal
 *  for the enemy (issue #28 — the dash is the secondary ownership cue). */
export type Sleeve = 'ivory' | 'gunmetal' | 'crimson' | 'cobalt' | 'emerald' | 'violet'

export const sleeveFor = (mine: boolean): Sleeve => (mine ? 'ivory' : 'gunmetal')

/** The pickable set, in display order, with table-talk names. */
export const SLEEVE_CHOICES: { id: Sleeve; label: string }[] = [
  { id: 'ivory', label: 'Ivory' },
  { id: 'gunmetal', label: 'Gunmetal' },
  { id: 'crimson', label: 'Crimson' },
  { id: 'cobalt', label: 'Cobalt' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'violet', label: 'Violet' },
]

/** Edge trim uses `outline` (not ring/box-shadow) so sleeves never fight the .glow-* cues.
 *  Gunmetal keeps its dash (issue #28); the bold colors carry ownership by hue alone. */
export const SLEEVE_EDGE: Record<Sleeve, string> = {
  ivory: 'outline outline-2 outline-offset-0 outline-[#e3d8b4]',
  gunmetal: 'outline-dashed outline-2 outline-offset-0 outline-[#8b96a4]',
  crimson: 'outline outline-2 outline-offset-0 outline-[#e2483e]',
  cobalt: 'outline outline-2 outline-offset-0 outline-[#3e7ee2]',
  emerald: 'outline outline-2 outline-offset-0 outline-[#2ebd6b]',
  violet: 'outline outline-2 outline-offset-0 outline-[#a04ee0]',
}

/** The lip: a small tab hanging inside the top edge — hand/board rows are overflow-x-auto,
 *  so anything peeking *above* the card would clip. */
export const SLEEVE_TAB: Record<Sleeve, string> = {
  ivory: 'bg-gradient-to-b from-[#ded3b0] to-[#a89d78]',
  gunmetal: 'bg-gradient-to-b from-[#99a3b0] to-[#5f6975]',
  crimson: 'bg-gradient-to-b from-[#f06055] to-[#a32c24]',
  cobalt: 'bg-gradient-to-b from-[#5f97ef] to-[#2856a8]',
  emerald: 'bg-gradient-to-b from-[#4fd68c] to-[#1e8a4c]',
  violet: 'bg-gradient-to-b from-[#b76ef0] to-[#7231a8]',
}

/** Swatch backgrounds for the setup picker. */
export const SLEEVE_SWATCH: Record<Sleeve, string> = {
  ivory: 'bg-[#e3d8b4]',
  gunmetal: 'bg-[#8b96a4]',
  crimson: 'bg-[#e2483e]',
  cobalt: 'bg-[#3e7ee2]',
  emerald: 'bg-[#2ebd6b]',
  violet: 'bg-[#a04ee0]',
}
