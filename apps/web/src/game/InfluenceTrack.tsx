/**
 * The shared influence tug-of-war, seat-relative: right = toward you.
 * Thresholds can differ per side (Radiant Citadel), so each end is labeled.
 */
export function InfluenceTrack({ influence, mine, theirs, myName, theirName }: {
  influence: number   // + toward viewer
  mine: number        // threshold you must reach
  theirs: number      // threshold they must reach
  myName: string
  theirName: string
}) {
  const span = mine + theirs
  const pct = span > 0 ? ((influence + theirs) / span) * 100 : 50
  return (
    <div className="panel p-3">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest text-dim">
        <span>Influence</span>
        <span className={`font-display text-base normal-case tracking-normal ${influence > 0 ? 'text-goldbright' : influence < 0 ? 'text-[#e5a99f]' : 'text-body'}`}>
          {influence > 0 ? `+${influence}` : influence}
        </span>
      </div>
      <div className="relative mt-2 h-3 rounded-full border hairline bg-ink">
        <div className="absolute inset-y-0 left-1/2 w-px bg-hairline" style={{ left: `${(theirs / span) * 100}%` }} />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-goldbright bg-gradient-to-b from-goldbright to-gold shadow-[0_0_10px_rgba(232,193,74,0.6)] transition-[left] duration-500"
          style={{ left: `${Math.max(2, Math.min(98, pct))}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-dim">
        <span>◄ {theirName} wins at {theirs}</span>
        <span>{myName} wins at {mine} ►</span>
      </div>
    </div>
  )
}
