import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { LogLine, UnitView } from '@newgame/engine'
import { CardFrame, type CardLike } from '../components/CardFrame.tsx'
import { STATUS_GLOSS, glossFor } from './gloss.ts'
import type { Sleeve } from './sleeves.ts'

/** Bottom sheet on phones, centered dialog on desktop. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 max-lg:flex max-lg:items-end lg:grid lg:place-items-center lg:p-4" onClick={onClose}>
      <div
        className="panel max-h-[82vh] w-full select-none overflow-y-auto p-4 max-lg:rounded-b-none lg:max-w-lg"
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as CSSProperties}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-parchment">{title}</h3>
          <button className="btn !px-2.5 !py-0.5 text-xs" onClick={onClose}>✕ close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Tap-to-inspect: the full story of one unit on the board. */
export function UnitInspector({ unit, card, upgradeCards, onClose, sleeve }: {
  unit: UnitView
  card: CardLike | undefined
  upgradeCards: CardLike[]
  onClose: () => void
  sleeve?: Sleeve
}) {
  if (!card) return null
  const statChanged = unit.power !== unit.basePower || unit.health !== unit.baseHealth
  return (
    <Sheet title={card.name} onClose={onClose}>
      <div className="flex flex-wrap gap-4">
        <CardFrame card={card} sleeve={sleeve} />
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
          <p>
            <b className="font-display text-xl text-parchment">{unit.power} / {unit.health - unit.damage}</b>
            <span className="ml-2 text-dim">
              {unit.damage > 0 && `(${unit.damage} damage marked) `}
              {statChanged && `— printed ${unit.basePower}/${unit.baseHealth}`}
            </span>
          </p>
          {unit.armor > 0 && <p className="mt-1 text-dim">◈ Armor {unit.armor} — hits are reduced by {unit.armor}.</p>}
          <div className="mt-2 flex flex-col gap-1">
            {unit.imprisoned && <p className="text-[#e5a99f]">{STATUS_GLOSS.imprisoned}</p>}
            {unit.exhausted && !unit.imprisoned && <p className="text-dim">{STATUS_GLOSS.exhausted}</p>}
            {unit.rushFreeMove && <p className="text-dim">{STATUS_GLOSS.rushFreeMove}</p>}
            {unit.overextendedBy > 0 && <p className="text-[#ff9a5e]">🔥 Overextended — will take {unit.overextendedBy} damage at end of round.</p>}
          </div>
          {unit.keywords.length > 0 && (
            <div className="mt-2 border-t hairline pt-2">
              {unit.keywords.map(k => (
                <p key={k} className="mt-0.5"><b className="capitalize text-goldbright">{k}</b> <span className="text-body/80">— {glossFor(k)}</span></p>
              ))}
            </div>
          )}
          {unit.captives.length > 0 && (
            <div className="mt-2 border-t hairline pt-2">
              <p className="text-goldbright">⛓ Holding captive: <b>{unit.captives.map(c => c.name).join(', ')}</b>
                <span className="text-body/80"> — select this unit and Release to return it to its owner, exhausted.</span></p>
            </div>
          )}
          {card.designerNote && (
            <p className="mt-2 border-t hairline pt-2 text-xs text-goldbright">⚑ Prototype ruling: <span className="text-body/80">{card.designerNote}</span></p>
          )}
        </div>
      </div>
      {upgradeCards.length > 0 && (
        <div className="mt-4 border-t hairline pt-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-dim">Attached upgrades</p>
          <div className="flex flex-wrap gap-2">
            {upgradeCards.map((u, i) => <CardFrame key={i} card={u} size="sm" sleeve={sleeve} />)}
          </div>
        </div>
      )}
    </Sheet>
  )
}

/** The base as a simple stat block — opened by tapping the life numeral. */
export function BaseSheet({ name, life, mine, handCount, deckCount, discardCount, resourcesReady, resourcesTotal, guards, invaders, influence, onClose }: {
  name: string; life: number; mine: boolean
  handCount: number; deckCount: number; discardCount: number
  resourcesReady: number; resourcesTotal: number
  guards: number; invaders: number; influence: number
  onClose: () => void
}) {
  const stat = (label: string, value: ReactNode, warn = false) => (
    <div className="flex items-baseline justify-between border-b hairline py-1.5 last:border-0">
      <span className="text-[12px] uppercase tracking-wider text-dim">{label}</span>
      <span className={`font-display text-lg font-bold ${warn ? 'text-[#e5735f]' : 'text-parchment'}`}>{value}</span>
    </div>
  )
  return (
    <Sheet title={`${name} — base`} onClose={onClose}>
      <div className="flex flex-col">
        {stat('Life (starts at 20)', `♥ ${life}`, life <= 5)}
        {stat('Resources ready', `⬢ ${resourcesReady} / ${resourcesTotal}`)}
        {stat('Cards in hand', `🂠 ${handCount}`)}
        {stat('Cards left in deck', `≣ ${deckCount}`)}
        {stat('Discard pile', `✕ ${discardCount}`)}
        {stat('Influence position', influence > 0 ? `+${influence}` : influence, influence < 0)}
        {stat('Guards that can intercept', `🛡 ${guards}`)}
        {stat('Enemy units at the gates', `⚔ ${invaders}`, invaders > 0)}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        The base is the player — 0 life ends the game. Only enemy units standing in {mine ? 'your' : 'their'} Home can assault it
        (no counter-damage); ready Guards there can intercept the assault, for free. Healing never exceeds the starting value.
      </p>
    </Sheet>
  )
}

/** A card on its own — for hand long-press and pile items. */
export function CardSheet({ card, onClose, sleeve }: { card: CardLike; onClose: () => void; sleeve?: Sleeve }) {
  const kws = (card as CardLike & { kw?: { k: string; n?: number }[] }).kw ?? []
  return (
    <Sheet title={card.name} onClose={onClose}>
      <div className="flex flex-wrap gap-4">
        <CardFrame card={card} sleeve={sleeve} />
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
          <p className="text-dim">cost {card.cost} · {card.type}{card.type === 'unit' ? ` · ${card.power}/${card.health}` : ''}</p>
          <p className="mt-2 text-body/90">{card.text}</p>
          {kws.length > 0 && (
            <div className="mt-2 border-t hairline pt-2">
              {kws.map(k => (
                <p key={k.k} className="mt-0.5"><b className="capitalize text-goldbright">{k.k}{k.n !== undefined ? ` ${k.n}` : ''}</b> <span className="text-body/80">— {glossFor(k.k)}</span></p>
              ))}
            </div>
          )}
          {card.designerNote && (
            <p className="mt-2 border-t hairline pt-2 text-xs text-goldbright">⚑ Prototype ruling: <span className="text-body/80">{card.designerNote}</span></p>
          )}
        </div>
      </div>
    </Sheet>
  )
}

/** Public pile browser — banked resources and discards are open information. */
export function PileSheet({ title, cards, note, onClose, sleeve }: {
  title: string
  cards: CardLike[]
  note?: string
  onClose: () => void
  sleeve?: Sleeve
}) {
  return (
    <Sheet title={`${title} (${cards.length})`} onClose={onClose}>
      {note && <p className="mb-3 text-xs text-dim">{note}</p>}
      <div className="flex flex-wrap gap-2">
        {cards.map((c, i) => <CardFrame key={i} card={c} size="sm" sleeve={sleeve} />)}
        {!cards.length && <p className="text-sm text-dim">Empty.</p>}
      </div>
    </Sheet>
  )
}

/** Transient narration over the board — every engine log line, where you're looking. */
export function EventTicker({ log }: { log: LogLine[] }) {
  const [items, setItems] = useState<{ id: number; msg: string; turn: boolean }[]>([])
  const prevTail = useRef<string | null>(null)
  const idRef = useRef(0)
  const mounted = useRef(false)

  useEffect(() => {
    if (!log.length) return
    const msgs = log.map(l => l.msg)
    if (!mounted.current) { // don't replay history on first render
      mounted.current = true
      prevTail.current = msgs[msgs.length - 1]
      return
    }
    // find new lines: everything after the previous tail's last occurrence
    let start = prevTail.current ? msgs.lastIndexOf(prevTail.current) + 1 : msgs.length - 1
    if (start <= 0 || start > msgs.length) start = Math.max(0, msgs.length - 3)
    const fresh = msgs.slice(start)
    prevTail.current = msgs[msgs.length - 1]
    if (!fresh.length) return
    const added = fresh.slice(-4).map(msg => ({ id: ++idRef.current, msg, turn: msg.startsWith('—') }))
    setItems(cur => [...cur.slice(-3), ...added])
    for (const a of added) setTimeout(() => setItems(cur => cur.filter(i => i.id !== a.id)), 4200)
  }, [log])

  if (!items.length) return null
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex flex-col items-center gap-1">
      {items.map(i => (
        <div
          key={i.id}
          className={`panel max-w-full truncate px-3 py-1 text-[12px] shadow-lg shadow-black/50 ${i.turn ? 'font-display text-goldbright' : 'text-body/95'}`}
        >
          {i.msg}
        </div>
      ))}
    </div>
  )
}

/** Flash a value's color when it drops (damage) or rises (healing). */
export function useValueFlash(value: number): string {
  const prev = useRef(value)
  const [cls, setCls] = useState('')
  useEffect(() => {
    if (value === prev.current) return
    const dropped = value < prev.current
    prev.current = value
    setCls(dropped ? 'animate-pulse text-[#ff6a4d]' : 'animate-pulse text-emerald-400')
    const t = setTimeout(() => setCls(''), 1600)
    return () => clearTimeout(t)
  }, [value])
  return cls
}
