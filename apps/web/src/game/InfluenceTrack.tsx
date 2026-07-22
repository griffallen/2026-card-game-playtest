/** Two independent Hope tracks. Each player wins at +12 and loses at -12. */
export function InfluenceTrack({ hope, thresholds, names }: {
  hope: [number, number]
  thresholds: [number, number]
  names: [string, string]
}) {
  return (
    <div className="panel p-3">
      <div className="text-[10px] uppercase tracking-widest text-dim">🕊️ Hope</div>
      <div className="mt-2 space-y-3">
        {hope.map((value, seat) => {
          const threshold = thresholds[seat]
          const pct = ((value + threshold) / (threshold * 2)) * 100
          return (
            <div key={names[seat]}>
              <div className="flex items-baseline justify-between text-[11px] text-dim">
                <span>{names[seat]}</span>
                <span className={`font-display text-base ${value > 0 ? 'text-goldbright' : value < 0 ? 'text-[#e5a99f]' : 'text-body'}`}>{value > 0 ? `+${value}` : value}</span>
              </div>
              <div className="relative mt-1 h-2.5 rounded-full border hairline bg-ink">
                <div className="absolute inset-y-0 left-1/2 w-px bg-hairline" />
                <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-goldbright bg-gradient-to-b from-goldbright to-gold shadow-[0_0_8px_rgba(232,193,74,0.6)] transition-[left] duration-500" style={{ left: `${Math.max(2, Math.min(98, pct))}%` }} />
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] text-dim"><span>loses at −{threshold}</span><span>wins at +{threshold}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
