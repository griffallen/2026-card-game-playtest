/** Per-player card sleeves (issue #22): in a mirror match the art stops telling you whose
 *  card is whose, so ownership rides on the card itself — like sleeves at a physical table.
 *  Two neutral metals, deliberately off the faction palette, and matte enough that the
 *  .glow-* selection/target cues always outshine them. */
export type Sleeve = 'ivory' | 'gunmetal'

export const sleeveFor = (mine: boolean): Sleeve => (mine ? 'ivory' : 'gunmetal')

/** Edge trim uses `outline` (not ring/box-shadow) so sleeves never fight the .glow-* cues.
 *  Dashed + brighter per the designer's eye (issue #28: solid trim read too subtle). */
export const SLEEVE_EDGE: Record<Sleeve, string> = {
  ivory: 'outline-dashed outline-2 outline-offset-0 outline-[#e3d8b4]',
  gunmetal: 'outline-dashed outline-2 outline-offset-0 outline-[#8b96a4]',
}

/** The lip: a small tab hanging inside the top edge — hand/board rows are overflow-x-auto,
 *  so anything peeking *above* the card would clip. */
export const SLEEVE_TAB: Record<Sleeve, string> = {
  ivory: 'bg-gradient-to-b from-[#ded3b0] to-[#a89d78]',
  gunmetal: 'bg-gradient-to-b from-[#99a3b0] to-[#5f6975]',
}
