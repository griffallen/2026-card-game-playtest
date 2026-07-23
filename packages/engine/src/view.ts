import type { GameState, PlayerView, Seat, SideView, UnitView } from './types.ts'
import { ZONES, homeZone } from './types.ts'
import { baseCount, defOf, effArmor, effHealth, effPower, hasKw, kwOf, other, thresholds, unitsInZone } from './helpers.ts'
import { getLegalActions } from './legal.ts'

const KW_LIST = ['guard', 'armor', 'rush', 'ranged', 'breakthrough', 'cantAttack', 'scar', 'shielded', 'hidden', 'infiltrate', 'capture', 'sneak', 'tribune', 'sentry', 'steadfast'] as const

function unitView(state: GameState, id: string): UnitView {
  const u = state.units[id]
  const def = defOf(state, id)
  const keywords: string[] = []
  for (const k of KW_LIST) {
    const v = kwOf(state, u, k)
    if (v === false) continue
    if (k === 'shielded' && !u.shielded) continue   // token spent: the view stops claiming it (#23)
    keywords.push(v === true ? k : `${k} ${v}`)
  }
  return {
    id, slug: u.slug, name: def.name, owner: u.owner, zone: u.zone,
    power: effPower(state, u), health: effHealth(state, u), damage: u.damage,
    // #69: a created copy's printed line is its own body. #122: a count-based unit's "base" IS the live
    // count (same precedence as effPower/effHealth), so the demo shows the true base, not a stale printed stat.
    basePower: u.created?.p ?? (def.powerFromCount != null ? baseCount(state, u, def.powerFromCount) : def.power ?? 0),
    baseHealth: u.created?.h ?? (def.healthFromCount != null ? baseCount(state, u, def.healthFromCount) : def.health ?? 0),
    armor: effArmor(state, u),
    exhausted: u.exhausted,
    rushFreeMove: !u.movedThisRound && hasKw(state, u, 'rush') && !u.exhausted,   // #105: free first move every round, not just entry round
    overextendedBy: u.overextendedBy,
    shielded: u.shielded,
    keywords,
    upgrades: u.upgrades.map(upId => ({ id: upId, slug: state.cardOf[upId], name: defOf(state, upId).name })),
    captives: Object.entries(state.captives)
      .filter(([, c]) => c.by === id)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([cid, c]) => ({ id: cid, slug: c.unit.slug, name: state.cardSet[c.unit.slug]?.name ?? c.unit.slug, owner: c.unit.owner })),
  }
}

function sideView(state: GameState, seat: Seat): SideView {
  const side = state.sides[seat]
  return {
    name: side.name,
    life: side.life,
    handCount: side.hand.length,
    deckCount: side.deck.length,
    resources: side.resources.map(r => ({ id: r.id, slug: state.cardOf[r.id], exhausted: r.exhausted })),
    discard: side.discard.map(id => ({ id, slug: state.cardOf[id] })),
  }
}

/** Hidden-information filter: the only state a client ever sees. null seat = spectator. */
export function viewFor(state: GameState, seat: Seat | null): PlayerView {
  return {
    viewerSeat: seat,
    round: state.round,
    phase: state.phase,
    initiative: state.initiative,
    actorSeat: state.actorSeat,
    outOfRound: state.outOfRound,
    claimedThisRound: state.claimedThisRound,
    cardPlayLock: state.cardPlayLock,   // #122 (Eclipse): the demo shows an "Eclipsed" badge from this
    pendingAttack: state.pendingAttack
      ? { attackers: state.pendingAttack.attackers, target: state.pendingAttack.target }
      : null,
    // #128 (Breakthrough chain): only the defender (the seat now steering the chain) sees the prompt
    pendingSplash: state.pendingSplash && seat !== null && seat === other(state.pendingSplash.seat)
      ? {
          leftover: state.pendingSplash.leftover,
          targets: [
            ...unitsInZone(state, state.pendingSplash.zone, seat).map(u => ({ kind: 'unit', id: u.id }) as const),
            ...(state.pendingSplash.zone === homeZone(seat) ? [{ kind: 'base', seat } as const] : []),
          ],
        }
      : null,
    hope: state.hope,
    influence: state.hope[0] - state.hope[1],
    thresholds: thresholds(state),
    sides: [sideView(state, 0), sideView(state, 1)],
    zones: ZONES.map(z => ({
      units: unitsInZone(state, z).map(u => unitView(state, u.id)),
      orphans: Object.values(state.upgrades)
        .filter(up => up.attachedTo === null && up.orphanedIn === z)
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map(up => ({ id: up.id, slug: up.slug, name: state.cardSet[up.slug]?.name ?? up.slug, owner: up.owner })),
    })),
    hand: seat === null ? [] : state.sides[seat].hand.map(id => ({ id, slug: state.cardOf[id] })),
    // #122 (Twilight Scout): only the peek's addressee sees the snapshot — the opponent never learns
    // their hand was read, and a spectator sees nothing. Frozen data, so the demo reads it as-captured.
    reveals: seat === null ? [] : state.reveals.filter(r => r.seat === seat),
    actions: seat === null ? [] : getLegalActions(state, seat),
    winner: state.winner,
    winReason: state.winReason,
    log: state.log.slice(-100),
  }
}
