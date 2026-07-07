import { useState } from 'react'
import { ProceduralArt } from './ProceduralArt.tsx'

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
}

const frameTint: Record<string, string> = {
  red: 'from-[#4a1710] to-[#2a0d08] border-[#7e3325]',
  yellow: 'from-[#4a3a10] to-[#2a2008] border-[#8a6b1a]',
  neutral: 'from-[#2e2e38] to-[#1a1a20] border-[#4a4a5a]',
}

/** One component renders any card at any size — hand, browser, admin preview. */
export function CardFrame({ card, size = 'md', onClick, selected, dimmed, badge }: {
  card: CardLike
  size?: 'sm' | 'md'
  onClick?: () => void
  selected?: boolean
  dimmed?: boolean
  badge?: string
}) {
  const [artBroken, setArtBroken] = useState(false)
  const tint = frameTint[card.color] ?? frameTint.neutral
  const w = size === 'sm' ? 'w-[124px]' : 'w-[176px]'
  const artH = size === 'sm' ? 'h-[64px]' : 'h-[96px]'
  const isUnit = card.type === 'unit'

  return (
    <div
      onClick={onClick}
      title={card.designerNote ? `⚑ ${card.designerNote}` : undefined}
      className={[
        w, 'shrink-0 select-none rounded-lg border bg-gradient-to-b p-1 text-parchment shadow-md shadow-black/40',
        tint,
        onClick ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : '',
        selected ? 'glow-selected' : '',
        dimmed ? 'opacity-45 saturate-50' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-black/40 bg-parchment font-display text-[13px] font-bold leading-none text-ink">
          {card.cost}
        </span>
        <span className={`min-w-0 flex-1 truncate font-display font-semibold ${size === 'sm' ? 'text-[11px]' : 'text-[13px]'}`}>
          {card.name}
        </span>
        {card.designerNote && <span className="text-[10px] text-goldbright" aria-label="designer flag">⚑</span>}
      </div>

      <div className={`mt-1 overflow-hidden rounded ${artH} bg-black/40`}>
        {card.artUrl && !artBroken
          ? <img src={card.artUrl} alt="" draggable={false} onError={() => setArtBroken(true)} className="h-full w-full object-cover" />
          : <ProceduralArt slug={card.slug} color={card.color} type={card.type} className="h-full w-full [&>svg]:h-full [&>svg]:w-full" />}
      </div>

      <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-parchment/60">
        <span>{card.type}</span>
        {badge && <span className="rounded bg-black/40 px-1 text-goldbright normal-case">{badge}</span>}
      </div>

      <div className={`mt-0.5 rounded bg-[#efe4cd] px-1.5 py-1 text-ink ${size === 'sm' ? 'min-h-[42px] text-[9px] leading-[1.25]' : 'min-h-[58px] text-[10.5px] leading-snug'}`}>
        {card.text}
      </div>

      {isUnit && (
        <div className="mt-1 flex items-center justify-between px-0.5 font-display text-[13px] font-bold">
          <span className="rounded bg-black/50 px-1.5 py-0.5 leading-none">{card.power}</span>
          <span className="rounded bg-black/50 px-1.5 py-0.5 leading-none">{card.health}</span>
        </div>
      )}
    </div>
  )
}
