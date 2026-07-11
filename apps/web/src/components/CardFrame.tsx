import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ProceduralArt } from './ProceduralArt.tsx'
import { SLEEVE_EDGE, SLEEVE_TAB, type Sleeve } from '../game/sleeves.ts'

/** Long-press (450ms, cancels on drag) that also swallows the click it would otherwise trigger.
 *  Right-click fires the same inspect path — the desktop mirror of the mobile long-press. */
export function useLongPress(onLongPress?: () => void) {
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  const handlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      if (!onLongPress) return
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      clear()
      timer.current = window.setTimeout(() => { fired.current = true; onLongPress() }, 450)
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (!origin.current) return
      if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 12) clear()
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      if (!onLongPress) return
      e.preventDefault()
      clear()
      fired.current = true // swallow the synthetic click some browsers send after contextmenu
      onLongPress()
    },
  }
  return { fired, handlers }
}

export interface CardLike {
  slug: string
  name: string
  color: string
  type: string
  cost: number
  power?: number | null
  health?: number | null
  text: string
  artUrl?: string | null
  designerNote?: string | null
  /** v3 presence pips (decision 69) — one sigil rendered per entry, e.g. ['red','red'] */
  pips?: string[] | null
}

const frameTint: Record<string, string> = {
  red: 'from-[#4a1710] to-[#2a0d08] border-[#7e3325]',
  yellow: 'from-[#4a3a10] to-[#2a2008] border-[#8a6b1a]',
  purple: 'from-[#31184e] to-[#180a2c] border-[#6b3f9e]',
  neutral: 'from-[#2e2e38] to-[#1a1a20] border-[#4a4a5a]',
}

// type reads at a glance via one color-coded chip on the art (icon + label). Faction owns the frame.
const typeMeta: Record<string, { icon: string; label: string; chip: string }> = {
  unit: { icon: '⚔', label: 'Unit', chip: 'bg-[#24476f] text-[#dbe8fa] ring-[#4d7cb0]' },
  action: { icon: '✦', label: 'Action', chip: 'bg-[#6a2557] text-[#f6cce9] ring-[#a94a8c]' },
  upgrade: { icon: '⬥', label: 'Upgrade', chip: 'bg-[#356a22] text-[#d6f5c6] ring-[#5aa53e]' },
}

/** One component renders any card at any size — hand, browser, admin preview. */
export function CardFrame({ card, size = 'md', onClick, selected, dimmed, badge, onLongPress, sleeve }: {
  card: CardLike
  size?: 'sm' | 'md'
  onClick?: () => void
  selected?: boolean
  dimmed?: boolean
  badge?: string
  /** long-press (mobile) opens details without disturbing the tap flow */
  onLongPress?: () => void
  /** ownership sleeve (issue #22) — omit where the card has no owner (browser, rules pages) */
  sleeve?: Sleeve
}) {
  // a mobile/CDN blip must not strip a card's art for the whole session (issue #19):
  // retry twice with a cache-busting src before conceding to procedural art
  const [artBroken, setArtBroken] = useState(false)
  const [artTry, setArtTry] = useState(0)
  const lp = useLongPress(onLongPress)
  const tint = frameTint[card.color] ?? frameTint.neutral
  const w = size === 'sm' ? 'w-[148px]' : 'w-[176px]'   // sm widened for phones (issue #17): fewer, bigger, readable
  const artH = size === 'sm' ? 'h-[74px]' : 'h-[96px]'
  const isUnit = card.type === 'unit'
  const meta = typeMeta[card.type] ?? typeMeta.unit
  const bigStat = size === 'sm' ? 'text-[13px]' : 'text-[14px]'

  return (
    <div
      {...lp.handlers}
      style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}
      onClick={() => { if (lp.fired.current) { lp.fired.current = false; return } onClick?.() }}
      title={card.designerNote ? `⚑ ${card.designerNote}` : undefined}
      className={[
        w, 'relative shrink-0 select-none rounded-lg border bg-gradient-to-b p-1.5 text-parchment shadow-md shadow-black/40',
        tint,
        onClick ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : '',
        selected ? 'glow-selected' : '',
        dimmed ? 'opacity-45 saturate-50' : '',
        sleeve ? SLEEVE_EDGE[sleeve] : '',
      ].join(' ')}
    >
      {sleeve && (
        <span aria-hidden className={`pointer-events-none absolute left-1/2 top-0 z-10 h-[5px] w-8 -translate-x-1/2 rounded-b-md shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${SLEEVE_TAB[sleeve]}`} />
      )}
      {/* header: cost gem (cool = clearly the cost, distinct from the warm stats) · name · flag · count */}
      <div className="flex items-center gap-1.5">
        <span
          title={`Cost ${card.cost}`}
          className={`grid ${size === 'sm' ? 'h-[22px] w-[22px] text-[13px]' : 'h-6 w-6 text-[14px]'} shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#eaf0f8] to-[#a8b6c9] font-display font-bold leading-none text-[#15202f] shadow-sm ring-1 ring-black/50`}
        >{card.cost}</span>
        {card.pips && card.pips.length > 0 && (
          <span
            className="flex shrink-0 -space-x-[3px]"
            title={`Requires banked color: ${card.pips.join(', ')}`}
          >
            {card.pips.map((c, i) => (
              <img
                key={i}
                src={`${import.meta.env.BASE_URL}pips/pip-${c}.png`}
                alt={c}
                draggable={false}
                className={`${size === 'sm' ? 'h-[13px] w-[13px]' : 'h-[15px] w-[15px]'} rounded-full object-cover ring-1 ring-black/50`}
              />
            ))}
          </span>
        )}
        <span className={`min-w-0 flex-1 truncate font-display font-semibold ${size === 'sm' ? 'text-[12.5px]' : 'text-[13px]'}`}>{card.name}</span>
        {card.designerNote && <span className="shrink-0 text-[11px] text-goldbright" aria-label="designer flag">⚑</span>}
        {badge && <span className="shrink-0 rounded bg-black/45 px-1 text-[10px] font-bold leading-tight text-goldbright ring-1 ring-black/30">{badge}</span>}
      </div>

      {/* art + single type chip */}
      <div className={`relative mt-1.5 overflow-hidden rounded ${artH} bg-black/40 ring-1 ring-black/30`} {...(artBroken ? { 'data-art': 'fallback' } : {})}>
        {card.artUrl && !artBroken
          ? <img
              src={artTry === 0 ? card.artUrl : `${card.artUrl}${card.artUrl.includes('?') ? '&' : '?'}retry=${artTry}`}
              alt="" draggable={false}
              onError={() => {
                if (artTry < 2) setTimeout(() => setArtTry(t => t + 1), 350 * (artTry + 1))
                else setArtBroken(true)
              }}
              className="h-full w-full object-cover"
            />
          : <ProceduralArt slug={card.slug} color={card.color} type={card.type} className="h-full w-full [&>svg]:h-full [&>svg]:w-full" />}
        <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide shadow ring-1 ${meta.chip}`}>
          {meta.icon} {meta.label}
        </span>
      </div>

      {/* rules text */}
      <div className={`mt-1.5 rounded bg-[#efe4cd] px-1.5 py-1 text-ink ${size === 'sm' ? 'min-h-[48px] text-[10.5px] leading-[1.3]' : 'min-h-[56px] text-[10.5px] leading-snug'}`}>
        {card.text}
      </div>

      {/* stats: units get an amber Power (⚔) and a crimson Health (♥) — icon + colour make it unmistakable */}
      {isUnit && (
        <div className={`mt-1.5 flex items-center justify-between font-display font-bold ${bigStat}`}>
          <span title="Power" className="flex items-center gap-0.5 rounded-md bg-gradient-to-b from-[#d29a3b] to-[#8a5a15] px-1.5 py-0.5 leading-none text-[#1c1305] ring-1 ring-black/40">
            <span className="text-[0.72em] opacity-90">⚔</span>{card.power}
          </span>
          <span title="Health" className="flex items-center gap-0.5 rounded-md bg-gradient-to-b from-[#c34a3e] to-[#7d271f] px-1.5 py-0.5 leading-none text-[#fdeee9] ring-1 ring-black/40">
            {card.health}<span className="text-[0.72em] opacity-90">♥</span>
          </span>
        </div>
      )}
    </div>
  )
}
