// Combat transparency preview (issue #108) — DEMO-LAYER ONLY.
//
// Combat here is deterministic (no dice): the only thing hidden is whether the defender blocks or
// Guards AFTER you declare. So while the human is choosing a target we lay out the exact numbers for
// the unblocked outcome against every reachable target — Power sent, what lands through Armor/Shield,
// whether the target falls, the counter it strikes back with, and which of your units die to it.
// The player commits on shared information and never loses to arithmetic the game already knows
// (design philosophy §3). The math lives in predict.ts; this file only renders it.
import type { TargetRef, UnitView } from '@newgame/engine'
import { predictCombat, type CombatPrediction } from './predict.ts'

export type PreviewTarget =
  | { ref: TargetRef; kind: 'unit'; unit: UnitView; retaliates: boolean }
  | { ref: TargetRef; kind: 'base'; name: string; life: number }

const keyOf = (ref: TargetRef) =>
  ref.kind === 'unit' ? `u:${ref.id}` : ref.kind === 'base' ? `b:${ref.seat}` : JSON.stringify(ref)

/** Compact defenses tag for a unit target, e.g. "(armor 2, shield)". Empty when it has neither. */
function defenseTag(p: CombatPrediction): string {
  const parts: string[] = []
  if (p.targetArmor && p.targetArmor > 0) parts.push(`armor ${p.targetArmor}`)
  if (p.targetShielded) parts.push('shield')
  return parts.length ? ` (${parts.join(', ')})` : ''
}

function UnitRow({ atkLabel, p }: { atkLabel: string; p: CombatPrediction }) {
  const fallers = p.attackers.filter(o => o.falls).map(o => o.name)
  const shieldHeld = p.attackers.some(o => o.shieldHeld)
  return (
    <div className="leading-snug">
      <span className="text-parchment">{atkLabel}</span>{' '}
      <span className="text-goldbright/90">({p.attackerPower})</span>{' '}
      <span className="text-dim">→</span>{' '}
      <span className="text-parchment">{p.targetName}</span>
      <span className="text-dim/80">{defenseTag(p)}</span>
      <span className="text-dim">: </span>
      {/* what lands on the target */}
      {p.targetShielded
        ? <span className="text-dim">shield holds — 0 lands</span>
        : <>
            <span>deals <b className="text-body">{p.landed}</b></span>
            {p.targetFalls
              ? <span className="text-goldbright">, {p.targetName} falls</span>
              : p.landed === 0
                ? <span className="text-dim"> (armor holds)</span>
                : <span className="text-dim"> ({p.targetRemaining} left)</span>}
          </>}
      {/* the counter, and who of yours it kills */}
      <span className="text-dim"> · </span>
      {p.retaliation === 0
        ? <span className="text-dim">no counter</span>
        : <>
            <span>takes <b className="text-body">{p.retaliation}</b></span>
            {fallers.length
              ? <span className="text-[#e5a99f]">, {fallers.join(' & ')} {fallers.length > 1 ? 'fall' : 'falls'}</span>
              : shieldHeld
                ? <span className="text-dim">, your shield holds</span>
                : <span className="text-dim">, {p.attackers.length > 1 ? 'all hold' : 'holds'}</span>}
          </>}
      {p.hasBreakthrough && (
        <div className="text-[11px] text-dim/80">
          ↳ Breakthrough: if {p.targetName} falls, the leftover splashes on — the defender picks where it lands
          {p.siege ? ' (a unit here, or the base behind it)' : ' (another unit here, if any)'}, chaining on each defeat
        </div>
      )}
    </div>
  )
}

function BaseRow({ atkLabel, p }: { atkLabel: string; p: CombatPrediction }) {
  const lethal = (p.baseLifeAfter ?? 0) <= 0
  return (
    <div className="leading-snug">
      <span className="text-parchment">{atkLabel}</span>{' '}
      <span className="text-goldbright/90">({p.attackerPower})</span>{' '}
      <span className="text-dim">→</span>{' '}
      <span className="text-parchment">{p.baseName}'s base</span>
      <span className="text-dim">: deals <b className="text-body">{p.attackerPower}</b> → </span>
      <span className={lethal ? 'text-goldbright' : 'text-body'}>♥ {p.baseLifeAfter}</span>
      {lethal && <span className="text-goldbright"> — lethal!</span>}
      <span className="text-dim"> · the base can't strike back</span>
    </div>
  )
}

/** The preview panel: one line per reachable target. Renders nothing if there is nothing to show. */
export function CombatPreview({ attackers, targets }: { attackers: UnitView[]; targets: PreviewTarget[] }) {
  if (!attackers.length || !targets.length) return null
  const atkLabel = attackers.map(a => a.name).join(' + ')
  const rows = targets.map(t => ({
    key: keyOf(t.ref),
    p: t.kind === 'unit'
      ? predictCombat(attackers, { kind: 'unit', unit: t.unit }, t.retaliates)
      : predictCombat(attackers, { kind: 'base', name: t.name, life: t.life }),
    kind: t.kind,
  }))
  return (
    <div className="w-full rounded-md border hairline bg-black/25 px-2 py-1.5 text-[12px]">
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-dim/70">⚔ Combat preview — if unblocked</div>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.key}>
            {r.kind === 'unit' ? <UnitRow atkLabel={atkLabel} p={r.p} /> : <BaseRow atkLabel={atkLabel} p={r.p} />}
          </div>
        ))}
      </div>
      <div className="mt-1.5 border-t hairline pt-1 text-[11px] text-dim/70">
        The opponent may still block or send a Guard after you strike — these are the numbers if the blow lands unblocked.
      </div>
    </div>
  )
}
