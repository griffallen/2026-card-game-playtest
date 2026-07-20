import { useEffect, useRef, useState } from 'react'
import type { UnitView } from '@newgame/engine'
import { ProceduralArt } from '../components/ProceduralArt.tsx'
import { useLongPress } from '../components/CardFrame.tsx'
import { SLEEVE_EDGE, SLEEVE_TAB, sleeveFor, type Sleeve } from './sleeves.ts'
import { iconFor, shortGlossFor } from './gloss.ts'

export function UnitChip({ unit, mine, glow, onClick, actionable, onLongPress, sleeve: sleeveProp }: {
  unit: UnitView
  mine: boolean
  glow: 'none' | 'selected' | 'target' | 'attack'
  onClick?: () => void
  /** this unit has a legal move/attack right now — show the gold ready-dot */
  actionable?: boolean
  /** long-press opens the inspector regardless of tap semantics */
  onLongPress?: () => void
  /** issue #61: the owner's chosen sleeve — falls back to the ivory/gunmetal defaults */
  sleeve?: Sleeve
}) {
  const [artBroken, setArtBroken] = useState(false)
  const lp = useLongPress(onLongPress)
  const sleeve = sleeveProp ?? sleeveFor(mine)
  const hurt = unit.damage > 0
  // #27: taking damage is visible — shake the chip and float the number
  const prevDamage = useRef(unit.damage)
  const [justHit, setJustHit] = useState(0)
  useEffect(() => {
    if (unit.damage > prevDamage.current) {
      setJustHit(unit.damage - prevDamage.current)
      const t = setTimeout(() => setJustHit(0), 900)
      prevDamage.current = unit.damage
      return () => clearTimeout(t)
    }
    prevDamage.current = unit.damage
  }, [unit.damage])
  // #114 (Griff): every keyword wears its own symbol, so a crowded board reads at a glance
  // instead of asking you to remember which 1/1 was the archer. The strip is driven straight
  // off the engine's live keyword list — granted keywords show up, a spent Shielded token
  // disappears — with the numbered ones carrying their number (🪖2, 🏹3).
  const chips: { key: string; text: string; title: string; dim?: boolean }[] = []
  for (const k of unit.keywords) {
    const name = k.split(' ')[0]
    const icon = iconFor(k)
    if (!icon) continue                                       // a keyword with no symbol says nothing
    if (name === 'capture' && unit.captives.length) continue   // the captive count below says it louder
    // armor's live value can differ from the printed one (upgrades, auras) — trust the view
    const n = name === 'armor' ? String(unit.armor) : (k.split(' ')[1] ?? '')
    chips.push({
      key: name, text: `${icon}${n}`, title: `${name} — ${shortGlossFor(k)}`,
      // Rush's 💨 has always meant "the free move is still there" (#105) — spent, it greys out
      dim: name === 'rush' && !unit.rushFreeMove,
    })
  }
  if (unit.overextendedBy > 0) chips.push({ key: 'overextended', text: `🔥${unit.overextendedBy}`, title: `takes ${unit.overextendedBy} damage at end of round` })
  if (unit.captives.length > 0) chips.push({ key: 'captives', text: `${iconFor('capture')}${unit.captives.length}`, title: `holding captive: ${unit.captives.map(c => c.name).join(', ')}` })
  const tooltip = [
    `${unit.name}`,
    ...unit.keywords.map(k => shortGlossFor(k) ? `${iconFor(k)} ${k[0].toUpperCase()}${k.slice(1)} — ${shortGlossFor(k)}` : k),
    unit.upgrades.length ? `Upgrades: ${unit.upgrades.map(u => u.name).join(', ')}` : '',
    unit.captives.length ? `Holding captive: ${unit.captives.map(c => c.name).join(', ')}` : '',
  ].filter(Boolean).join('\n')

  return (
    <div
      {...lp.handlers}
      style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}
      onClick={() => { if (lp.fired.current) { lp.fired.current = false; return } onClick?.() }}
      title={tooltip}
      className={[
        'relative w-[84px] shrink-0 select-none rounded-md border border-black/50 bg-raised p-0.5 transition-transform',
        justHit > 0 ? 'chip-hit' : '',
        SLEEVE_EDGE[sleeve],
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : '',
        glow === 'selected' ? 'glow-selected' : glow === 'target' ? 'glow-target' : glow === 'attack' ? 'glow-attack' : '',
        // #28: exhausted units turn sideways, like cards tapped at a real table
        unit.imprisoned ? 'saturate-[0.25] opacity-80' : unit.exhausted ? 'rotate-90 scale-90 opacity-60' : '',
      ].join(' ')}
    >
      <span aria-hidden className={`pointer-events-none absolute left-1/2 top-0 z-10 h-[4px] w-6 -translate-x-1/2 rounded-b shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${SLEEVE_TAB[sleeve]}`} />
      {justHit > 0 && (
        <span aria-hidden className="dmg-float pointer-events-none absolute -top-1 right-0 z-20 font-display text-[15px] font-bold text-[#ff6a55] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          −{justHit}
        </span>
      )}
      {actionable && glow === 'none' && (
        <span className="pulse-soft absolute -right-1 -top-1 z-10 h-2.5 w-2.5 rounded-full bg-goldbright shadow-[0_0_6px_rgba(232,193,74,0.9)]" title="can act" />
      )}
      <div className="relative h-[50px] overflow-hidden rounded-sm bg-black/40">
        {!artBroken
          ? <img src={`${import.meta.env.BASE_URL}cards/${unit.slug}.jpg`} alt="" draggable={false} onError={() => setArtBroken(true)} className="h-full w-full object-cover" />
          : <ProceduralArt slug={unit.slug} color={mine ? 'yellow' : 'red'} type="unit" className="h-full w-full [&>svg]:h-full [&>svg]:w-full" />}
        {unit.imprisoned && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 text-lg" aria-label="imprisoned">
            ⛓️
            <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[7px] font-bold uppercase tracking-[0.2em] text-[#e5a99f]">imprisoned</span>
          </div>
        )}
        {unit.exhausted && !unit.imprisoned && (
          <span className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px]">⟳</span>
        )}
        {unit.upgrades.length > 0 && (
          <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-goldbright">↑{unit.upgrades.length}</span>
        )}
      </div>
      <div className="truncate px-0.5 text-center text-[9px] leading-tight text-parchment/90">{unit.name}</div>
      {/* #114: the keyword strip gets its own line — the stats row stayed unreadable once three
          symbols had to share the gap between the numbers. Hidden entirely when there's nothing to say. */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-0.5 px-0.5 text-[9px] leading-none">
          {chips.map(c => (
            <span key={c.key} title={c.title} className={c.dim ? 'opacity-40' : undefined}>{c.text}</span>
          ))}
        </div>
      )}
      {/* #114 (Griff): the numbers say what they are — ⚔ power, ♥ health, same marks the card frame wears */}
      <div className="mt-0.5 flex items-center justify-between px-0.5 pb-0.5 font-display text-[11px] font-bold leading-none">
        <span title="Power" className="flex items-center gap-px rounded bg-black/50 px-1 py-0.5">
          <span className="text-[0.7em] opacity-80">⚔</span>{unit.power}
        </span>
        <span title="Health" className={`flex items-center gap-px rounded px-1 py-0.5 ${hurt ? 'bg-crimson/70 text-white' : 'bg-black/50'}`}>
          {unit.health - unit.damage}<span className="text-[0.7em] opacity-80">♥</span>
        </span>
      </div>
    </div>
  )
}
