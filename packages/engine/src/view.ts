import type { GameState, PlayerView, Seat, SideView, UnitView } from './types.ts'
import { ZONES } from './types.ts'
import { defOf, effArmor, effHealth, effPower, hasKw, kwOf, thresholds, unitsInZone } from './helpers.ts'
import { getLegalActions } from './legal.ts'

const KW_LIST = ['guard', 'armor', 'rush', 'ranged', 'reach', 'flying', 'breakthrough', 'overextend', 'cantAttack', 'untargetable', 'scar', 'shielded', 'hidden', 'infiltrate', 'capture', 'sneak'] as const

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
    basePower: def.power ?? 0, baseHealth: def.health ?? 0, armor: effArmor(state, u),
    exhausted: u.exhausted,
    rushFreeMove: u.enteredRound === state.round && !u.movedThisRound && hasKw(state, u, 'rush') && !u.exhausted,
    imprisoned: !!u.imprisoned,
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
    pendingAttack: state.pendingAttack
      ? { attackers: state.pendingAttack.attackers, target: state.pendingAttack.target }
      : null,
    influence: state.influence,
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
    actions: seat === null ? [] : getLegalActions(state, seat),
    winner: state.winner,
    winReason: state.winReason,
    log: state.log.slice(-100),
  }
}
