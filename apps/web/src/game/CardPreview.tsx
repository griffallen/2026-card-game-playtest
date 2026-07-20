import { useState, type ReactNode } from 'react'
import { CardFrame, type CardLike } from '../components/CardFrame.tsx'

export interface HoverPos { x: number; y: number }
/** What a hoverable component calls: a position while the mouse is over it, null when it leaves. */
export type HoverPreviewHandler = (pos: HoverPos | null) => void

/** Issue #114 (Griff): "can we add the card preview when we hover over a card?" The deck
 *  workshop has had a preview pane since #30; the table never did, so on desktop you had to
 *  right-click a 84px chip to find out what it was.
 *
 *  MOUSE ONLY, deliberately. Every hoverable component filters on `pointerType === 'mouse'`
 *  before calling in, so a touch never raises a card that would then sit under the player's
 *  thumb — phones keep the long-press/tap inspector they already had (#124). That's the whole
 *  of the touch degradation: on a touch device this layer simply never renders.
 *
 *  Usage: `const preview = useCardPreview()`, hand `preview.bind(def)` to each card/chip's
 *  `onHoverPreview`, and render `{preview.layer}` once inside the same stacking context. */
export function useCardPreview() {
  const [at, setAt] = useState<{ card: CardLike; x: number; y: number } | null>(null)

  const bind = (card: CardLike | undefined): HoverPreviewHandler | undefined => {
    if (!card) return undefined
    return pos => {
      // a leave from the card we already moved off of must not close the one we moved onto
      if (!pos) setAt(cur => (cur?.card === card ? null : cur))
      else setAt({ card, x: pos.x, y: pos.y })
    }
  }

  const layer: ReactNode = at ? <HoverCard card={at.card} x={at.x} y={at.y} /> : null
  return { bind, layer, showing: at?.card }
}

/** The floating card. Offset from the cursor and flipped away from the edges it would run off,
 *  so a chip in the rightmost zone or the bottom row still previews on-screen. */
function HoverCard({ card, x, y }: { card: CardLike; x: number; y: number }) {
  // size="lg" — the same big, readable preview the deck workshop raises (#30). A size="md"
  // copy of a hand card is barely larger than the card you're already looking at.
  const W = 248
  const H = 344   // its min-height; long-text cards grow past it, the flip maths just needs a floor
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight
  const left = x + 20 + W > vw ? Math.max(8, x - 20 - W) : x + 20
  const top = Math.min(Math.max(8, y - 60), Math.max(8, vh - H - 8))
  return (
    <div className="pointer-events-none fixed z-[70] drop-shadow-2xl" style={{ left, top }} aria-hidden>
      <CardFrame card={card} size="lg" />
    </div>
  )
}
