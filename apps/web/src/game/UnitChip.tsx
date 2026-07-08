import { useState } from 'react'
import type { UnitView } from '@newgame/engine'
import { ProceduralArt } from '../components/ProceduralArt.tsx'

export function UnitChip({ unit, mine, glow, onClick, actionable }: {
  unit: UnitView
  mine: boolean
  glow: 'none' | 'selected' | 'target' | 'attack'
  onClick?: () => void
  /** this unit has a legal move/attack right now — show the gold ready-dot */
  actionable?: boolean
}) {
  const [artBroken, setArtBroken] = useState(false)
  const hurt = unit.damage > 0
  const chips: string[] = []
  if (unit.keywords.some(k => k.startsWith('guard'))) chips.push('🛡')
  if (unit.armor > 0) chips.push(`◈${unit.armor}`)
  if (unit.sick) chips.push('💤')
  const tooltip = [`${unit.name}`, unit.keywords.join(', '), unit.upgrades.length ? `Upgrades: ${unit.upgrades.map(u => u.name).join(', ')}` : '']
    .filter(Boolean).join('\n')

  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={[
        'relative w-[84px] shrink-0 select-none rounded-md border bg-raised p-0.5 transition-transform',
        mine ? 'border-[#5a4a28]' : 'border-[#4a2a24]',
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : '',
        glow === 'selected' ? 'glow-selected' : glow === 'target' ? 'glow-target' : glow === 'attack' ? 'glow-attack' : '',
        unit.imprisoned ? 'saturate-[0.25] opacity-80' : unit.exhausted ? 'opacity-60' : '',
      ].join(' ')}
    >
      {actionable && glow === 'none' && (
        <span className="pulse-soft absolute -right-1 -top-1 z-10 h-2.5 w-2.5 rounded-full bg-goldbright shadow-[0_0_6px_rgba(232,193,74,0.9)]" title="can act" />
      )}
      <div className="relative h-[50px] overflow-hidden rounded-sm bg-black/40">
        {!artBroken
          ? <img src={`${import.meta.env.BASE_URL}cards/${unit.slug}.jpg`} alt="" draggable={false} onError={() => setArtBroken(true)} className="h-full w-full object-cover" />
          : <ProceduralArt slug={unit.slug} color={mine ? 'yellow' : 'red'} type="unit" className="h-full w-full [&>svg]:h-full [&>svg]:w-full" />}
        {unit.imprisoned && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 text-lg" aria-label="imprisoned">⛓️</div>
        )}
        {unit.exhausted && !unit.imprisoned && (
          <span className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px]">⟳</span>
        )}
        {unit.upgrades.length > 0 && (
          <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-goldbright">⬥{unit.upgrades.length}</span>
        )}
      </div>
      <div className="truncate px-0.5 text-center text-[9px] leading-tight text-parchment/90">{unit.name}</div>
      <div className="flex items-center justify-between px-0.5 pb-0.5 font-display text-[11px] font-bold leading-none">
        <span className="rounded bg-black/50 px-1 py-0.5">{unit.power}</span>
        <span className="text-[8px] font-normal text-dim">{chips.join(' ')}</span>
        <span className={`rounded px-1 py-0.5 ${hurt ? 'bg-crimson/70 text-white' : 'bg-black/50'}`}>
          {unit.health - unit.damage}
        </span>
      </div>
    </div>
  )
}
