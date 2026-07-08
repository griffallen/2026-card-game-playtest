import type { CardDef } from '../types.ts'
import { makeBuilders } from './builders.ts'

const { unit, action, upgrade } = makeBuilders('red')

const OE_NOTE = '⚑ Overextend printed on an action/upgrade is inert pending the designer card pass — the designer defined Overextend as a unit combat gamble (decision 35), so the influence-cede reading was removed.'

/** Red — aggression: Rush, Breakthrough, Overextend, direct damage. 36 cards from the July 5 sheet. */
export const RED_CARDS: CardDef[] = [
  unit(1, 'Cinder Initiate', 1, 1, {
    text: 'Rush. Overextend 1.',
    kw: [{ k: 'rush' }, { k: 'overextend', n: 1 }],
    designerNote: 'Decision 35: when attacking you MAY overextend for +N power; the unit takes N damage at end of turn. A gamble, not a given.',
  }),
  unit(1, 'Spark Hound', 2, 1, {
    text: 'Rush. When this attacks, it gets +1 Power this turn.',
    kw: [{ k: 'rush' }],
    onAttack: [{ op: 'buff', t: 'self', p: 1, dur: 'round' }],
  }),
  action(1, 'Reckless Charge', {
    text: 'Target unit gains Rush. Overextend 1.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'grant', t: 'chosen0', kw: { k: 'rush' }, dur: 'perm' }],
    designerNote: OE_NOTE,
  }),
  action(1, 'Devastating Strike', {
    text: 'Deal 2 damage to target unit or base. Overextend 1.',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'enemy' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2 }],
    designerNote: OE_NOTE,
  }),
  unit(2, 'Flameblade Raider', 2, 2, {
    text: 'Rush. Breakthrough 1.',
    kw: [{ k: 'rush' }, { k: 'breakthrough', n: 1 }],
  }),
  unit(2, 'Warcry Leader', 2, 3, {
    text: 'Other friendly units have Rush.',
    statics: [{ s: 'aura', scope: 'otherFriendly', kw: { k: 'rush' } }],
  }),
  action(2, 'Blood Rush', {
    text: 'Target unit gets +2 Power and Rush this turn. Overextend 1.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [
      { op: 'buff', t: 'chosen0', p: 2, dur: 'round' },
      { op: 'grant', t: 'chosen0', kw: { k: 'rush' }, dur: 'round' },
    ],
    designerNote: OE_NOTE,
  }),
  action(2, 'Searing Bolt', {
    text: 'Deal 2 damage to any target. Overextend 1.',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'any' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2 }],
    designerNote: OE_NOTE,
  }),
  unit(2, 'Berserker', 3, 2, {
    text: 'Rush. Overextend 2.',
    kw: [{ k: 'rush' }, { k: 'overextend', n: 2 }],
  }),
  action(2, 'Smash Through', {
    text: 'Target unit with Rush gains Breakthrough 2 this turn. Overextend 1.',
    targets: [{ t: 'unit', side: 'friendly', withKw: 'rush' }],
    onPlay: [{ op: 'grant', t: 'chosen0', kw: { k: 'breakthrough', n: 2 }, dur: 'round' }],
    designerNote: OE_NOTE,
  }),
  unit(3, 'Rageforged Brute', 4, 3, {
    text: 'Breakthrough 2. Overextend 2.',
    kw: [{ k: 'breakthrough', n: 2 }, { k: 'overextend', n: 2 }],
  }),
  action(3, 'Volcanic Slam', {
    text: 'Deal 3 damage to target unit or base. Overextend 2.',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'enemy' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 3 }],
    designerNote: OE_NOTE,
  }),
  unit(3, 'Fiery Impaler', 3, 3, {
    text: 'When this attacks a unit, it deals 1 damage to an adjacent unit.',
    onAttack: [{ op: 'damage', t: 'autoSplash', n: 1 }],
    designerNote: '⚑ "Adjacent unit" auto-targets the strongest other enemy unit in the defending zone (deterministic pick).',
  }),
  action(3, 'Collateral Damage', {
    text: 'Deal 2 damage to two different target units. Overextend 2.',
    targets: [{ t: 'unit', side: 'any', count: 2 }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 2 }, { op: 'damage', t: 'chosen1', n: 2 }],
    designerNote: OE_NOTE,
  }),
  action(3, 'Warpath', {
    text: 'All friendly units gain Rush. Overextend 2.',
    onPlay: [{ op: 'grant', t: { side: 'friendly' }, kw: { k: 'rush' }, dur: 'perm' }],
    designerNote: OE_NOTE,
  }),
  unit(4, 'Inferno Titan', 6, 5, {
    text: 'Breakthrough 3. Overextend 3.',
    kw: [{ k: 'breakthrough', n: 3 }, { k: 'overextend', n: 3 }],
  }),
  unit(4, 'Blaze Juggernaut', 4, 4, {
    text: 'Rush. This unit can attack adjacent zones.',
    kw: [{ k: 'rush' }, { k: 'reach' }],
    designerNote: '⚑ "Attack adjacent zones" = Reach: like Ranged but still draws counter-damage and can assault bases normally.',
  }),
  action(4, 'Rupture', {
    text: 'Deal 4 damage to target unit or base. Overextend 3.',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'enemy' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 4 }],
    designerNote: OE_NOTE,
  }),
  upgrade(4, 'Burning Oath', {
    text: 'Give attached unit +2 Power and Rush. Overextend 1.',
    statics: [
      { s: 'aura', scope: 'attached', p: 2 },
      { s: 'aura', scope: 'attached', kw: { k: 'rush' } },
    ],
        designerNote: OE_NOTE,
  }),
  action(4, 'Pillage', {
    text: 'Destroy target enemy upgrade. Overextend 2.',
    targets: [{ t: 'upgrade', side: 'enemy' }],
    onPlay: [{ op: 'destroyUpgrade' }],
    designerNote: OE_NOTE,
  }),
  unit(5, 'Doombringer', 5, 4, {
    text: 'Rush. Breakthrough 3.',
    kw: [{ k: 'rush' }, { k: 'breakthrough', n: 3 }],
  }),
  action(5, 'Relentless Assault', {
    text: 'Take an extra combat phase after this one. Overextend 3.',
    onPlay: [{ op: 'ready', side: 'friendly' }],
    designerNote: '⚑ Combat is merged into the Main Phase (DECISIONS 8), so "extra combat phase" = ready all your units; they may attack again. ' + OE_NOTE,
  }),
  action(5, 'Scorching Howl', {
    text: 'Deal 3 damage to all units. Overextend 3.',
    onPlay: [{ op: 'damageFilter', f: { side: 'all' }, n: 3 }],
    designerNote: OE_NOTE,
  }),
  unit(5, 'Crimson Behemoth', 6, 6, {
    text: 'When this attacks a base, it deals 2 damage to all adjacent zones.',
    onAttackBase: [{ op: 'damageFilter', f: { side: 'all', zone: 'sameAsSelf', other: true }, n: 2 }],
    designerNote: '⚑ Re-ruled after playtest 004: the assault splashes 2 damage onto every OTHER unit in the defended Home zone, both sides (the original "zones adjacent to the Behemoth" reading only ever hit Neutral — dead text during a siege).',
  }),
  upgrade(5, 'Bloodfrenzy', {
    text: 'At the start of your turn, attached unit gets +1 Power if you have 5 or less life.',
    startOfRound: { cond: { selfLifeAtMost: 5 }, ops: [{ op: 'buff', t: 'attached', p: 1, dur: 'perm' }] },
  }),
  unit(6, 'Earthshaker', 6, 5, {
    text: 'Breakthrough 3. Overextend 3.',
    kw: [{ k: 'breakthrough', n: 3 }, { k: 'overextend', n: 3 }],
  }),
  action(6, 'Cataclysmic Charge', {
    text: 'Target unit gains Rush and +3 Power this turn. Overextend 4.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [
      { op: 'grant', t: 'chosen0', kw: { k: 'rush' }, dur: 'round' },
      { op: 'buff', t: 'chosen0', p: 3, dur: 'round' },
    ],
    designerNote: OE_NOTE,
  }),
  action(6, 'Execution Swing', {
    text: 'Destroy target damaged unit. Overextend 3.',
    targets: [{ t: 'unit', side: 'any', mustBeDamaged: true }],
    onPlay: [{ op: 'destroy', t: 'chosen0' }],
    designerNote: OE_NOTE,
  }),
  action(6, 'Raging Inferno', {
    text: 'Deal 5 damage to target unit or base. Overextend 4.',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'enemy' }],
    onPlay: [{ op: 'damage', t: 'chosen0', n: 5 }],
    designerNote: OE_NOTE,
  }),
  unit(6, 'Warlord Garok', 5, 5, {
    text: 'Rush. Your other units have +1 Power.',
    kw: [{ k: 'rush' }],
    statics: [{ s: 'aura', scope: 'otherFriendly', p: 1 }],
  }),
  unit(7, 'Apocalypse Engine', 7, 7, {
    text: 'Breakthrough 4. Overextend 4.',
    kw: [{ k: 'breakthrough', n: 4 }, { k: 'overextend', n: 4 }],
  }),
  action(7, 'Unchained Rage', {
    text: "Double a unit's Power this turn. Overextend 4.",
    targets: [{ t: 'unit', side: 'any' }],
    onPlay: [{ op: 'double', t: 'chosen0' }],
    designerNote: OE_NOTE,
  }),
  action(7, 'Burn the Frontline', {
    text: 'Deal 4 damage to all units in one zone. Overextend 4.',
    targets: [{ t: 'zone' }],
    onPlay: [{ op: 'damageFilter', f: { side: 'all', zone: 'chosenZone' }, n: 4 }],
    designerNote: OE_NOTE,
  }),
  action(7, 'Last Stand', {
    text: 'Your units gain +2 Power this turn. You lose 2 life.',
    onPlay: [
      { op: 'buff', t: { side: 'friendly' }, p: 2, dur: 'round' },
      { op: 'damage', t: 'selfBase', n: 2 },
    ],
  }),
  unit(8, 'Worldrender', 8, 8, {
    text: 'Breakthrough 5. Overextend 5.',
    kw: [{ k: 'breakthrough', n: 5 }, { k: 'overextend', n: 5 }],
  }),
  action(8, 'Final Onslaught', {
    text: 'Ready one of your units, then immediately take an extra action. Overextend 5.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'ready', side: 'friendly', t: 'chosen0' }, { op: 'extraAction' }],
    designerNote: 'Decision 43: rounds have no extra turns — "extra turn" became ready one of your units + an extra action. Unplayable with no friendly unit to ready, by design. ' + OE_NOTE,
  }),
]
