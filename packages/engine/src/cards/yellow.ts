import type { CardDef } from '../types.ts'
import { influence, makeBuilders } from './builders.ts'

const { unit, action, upgrade } = makeBuilders('yellow')

const INF_NOTE = '⚑ "Influence: +N" grants its controller N Influence once, when the card enters play (DECISIONS 15).'
const AUTO_NOTE = '⚑ Imprison target is auto-picked: strongest eligible enemy unit (deterministic; DECISIONS/spec §3.3).'
const DECAY_NOTE = '⚑ The printed "at the start of your turn, lose 1 Influence" is the global Prison Decay rule (v1.2) — not charged twice.'

/** Yellow — order and containment: Guard, Armor, Imprison, Influence. 48 cards from the July 5 sheet. */
export const YELLOW_CARDS: CardDef[] = [
  unit(1, 'Vanguard Sentinel', 1, 2, {
    text: 'Guard. Influence: +1.',
    kw: [{ k: 'guard' }],
    onPlay: [influence(1)],
    designerNote: INF_NOTE,
  }),
  action(1, 'Radiant Aegis', {
    text: 'Give target unit Armor 2. Influence: +1.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'buff', t: 'chosen0', armor: 2, dur: 'perm' }, influence(1)],
  }),
  action(1, 'Prison Warrant', {
    text: 'Imprison target enemy unit in this zone. Influence: +1.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }, influence(1)],
    designerNote: '⚑ "In this zone" is meaningless for a card played from hand — implemented as any enemy unit. Needs design.',
  }),
  upgrade(1, 'Oath of Order', {
    text: 'Attach to unit. This unit gets +1 Power and Guard.',
    statics: [
      { s: 'aura', scope: 'attached', p: 1 },
      { s: 'aura', scope: 'attached', kw: { k: 'guard' } },
    ],
  }),
  unit(2, 'Sunguard Defender', 2, 3, {
    text: 'Guard. Influence: +1.',
    kw: [{ k: 'guard' }],
    onPlay: [influence(1)],
    designerNote: INF_NOTE,
  }),
  action(2, 'Hold the Line', {
    text: 'Give all friendly units in this zone Guard. Influence: +1.',
    targets: [{ t: 'zone' }],
    onPlay: [{ op: 'grant', t: { side: 'friendly', zone: 'chosenZone' }, kw: { k: 'guard' }, dur: 'perm' }, influence(1)],
    designerNote: '⚑ "This zone" read as "choose a zone".',
  }),
  unit(2, 'Containment Priest', 2, 3, {
    text: 'When this enters a zone, imprison target enemy unit in that zone.',
    onEnterZone: [{ op: 'imprison', t: 'auto', auto: { scope: 'enteredZone' } }],
    designerNote: AUTO_NOTE + ' Fires on deploy and on every move.',
  }),
  upgrade(2, 'Iron Discipline', {
    text: 'Attach to unit. This unit gets Armor 1. Influence: +1.',
    statics: [{ s: 'aura', scope: 'attached', armor: 1 }],
    onPlay: [influence(1)],
  }),
  action(2, 'Binding Light', {
    text: "Imprison target unit. If your Influence is 10+, it can't attack players. Influence: +1.",
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }, influence(1)],
    designerNote: '⚑ The 10+ rider is redundant while imprisoned (prisoners cannot attack at all) — dropped pending design.',
  }),
  unit(3, 'Justicar Enforcer', 3, 4, {
    text: 'Guard. Influence: +2.',
    kw: [{ k: 'guard' }],
    onPlay: [influence(2)],
    designerNote: INF_NOTE,
  }),
  unit(3, 'Sanctified Bastion', 0, 6, {
    text: "This can't attack. Your other units have Armor 1.",
    kw: [{ k: 'cantAttack' }],
    statics: [{ s: 'aura', scope: 'otherFriendly', armor: 1 }],
  }),
  action(3, 'Subjugate', {
    text: 'Imprison target unit. If your Influence is 5 or less, it gets -1 Power. Influence: +1.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [
      { op: 'imprison', t: 'chosen0' },
      { op: 'buff', t: 'chosen0', p: -1, dur: 'perm', cond: { influenceAtMost: 5 } },
      influence(1),
    ],
  }),
  unit(3, 'Noble Purifier', 3, 3, {
    text: 'When this attacks, you may imprison a unit in the defending zone.',
    onAttack: [{ op: 'imprison', t: 'auto', auto: { scope: 'targetZone' } }],
    designerNote: AUTO_NOTE + ' The "may" auto-applies (strictly beneficial; DECISIONS 24).',
  }),
  action(3, 'Unwavering Faith', {
    text: 'Heal 3 damage from a unit or your base. Influence: +1.',
    targets: [{ t: 'unitOrBase', side: 'any', baseSide: 'any' }],
    onPlay: [{ op: 'heal', t: 'chosen0', n: 3 }, influence(1)],
  }),
  unit(3, 'Bulwark Protector', 2, 5, {
    text: 'Guard. Influence: +1.',
    kw: [{ k: 'guard' }],
    onPlay: [influence(1)],
    designerNote: INF_NOTE,
  }),
  upgrade(3, 'Chain of Law', {
    text: "Attach to unit. This unit can't be the target of enemy actions. Influence: +1.",
    statics: [{ s: 'aura', scope: 'attached', kw: { k: 'untargetable' } }],
    onPlay: [influence(1)],
  }),
  unit(4, 'High Justiciar', 3, 5, {
    text: 'At the start of your turn, imprison target enemy unit in another zone.',
    startOfTurn: { ops: [{ op: 'imprison', t: 'auto', auto: { scope: 'otherZone' } }] },
    designerNote: AUTO_NOTE + ' "Another zone" = any zone other than the Justiciar\'s.',
  }),
  unit(4, 'Exemplar Knight', 4, 4, {
    text: 'When this attacks, give it +2 Power this turn. Influence: +1.',
    onAttack: [{ op: 'buff', t: 'self', p: 2, dur: 'turn' }],
    onPlay: [influence(1)],
    designerNote: INF_NOTE,
  }),
  action(4, 'Radiant Wall', {
    text: 'Give target unit Armor 3. Influence: +1.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'buff', t: 'chosen0', armor: 3, dur: 'perm' }, influence(1)],
  }),
  unit(4, 'Lawbringer', 4, 4, {
    text: 'When this enters a zone, imprison target unit.',
    onEnterZone: [{ op: 'imprison', t: 'auto', auto: { scope: 'enteredZone' } }],
    designerNote: AUTO_NOTE + ' Fires on deploy and on every move.',
  }),
  action(4, 'Mobilize the Faithful', {
    text: 'Give all friendly units +1 Power and Guard. Influence: +1.',
    onPlay: [
      { op: 'buff', t: { side: 'friendly' }, p: 1, dur: 'perm' },
      { op: 'grant', t: { side: 'friendly' }, kw: { k: 'guard' }, dur: 'perm' },
      influence(1),
    ],
  }),
  upgrade(4, 'Disciplined Mind', {
    text: 'Attach to unit. This unit gets +1 Armor. Draw a card.',
    statics: [{ s: 'aura', scope: 'attached', armor: 1 }],
    onPlay: [{ op: 'draw', n: 1 }],
  }),
  unit(4, 'Fortress Keeper', 1, 7, {
    text: "This can't attack. Other friendly units in this zone have Guard.",
    kw: [{ k: 'cantAttack' }],
    statics: [{ s: 'aura', scope: 'friendlyInZone', kw: { k: 'guard' } }],
  }),
  action(4, 'Sentence', {
    text: "Imprison target unit. If your Influence is 10+, it can't move or attack. Influence: +1.",
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }, influence(1)],
    designerNote: '⚑ The 10+ rider duplicates what imprisonment already does — dropped pending design.',
  }),
  unit(5, 'Dawnspear Paladin', 5, 5, {
    text: 'When this attacks, you may gain 1 Influence.',
    onAttack: [influence(1)],
    designerNote: '⚑ The "may" auto-applies (DECISIONS 24).',
  }),
  action(5, 'Disarming Order', {
    text: "Target unit can't attack this turn. Draw a card.",
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'grant', t: 'chosen0', kw: { k: 'cantAttack' }, dur: 'turn' }, { op: 'draw', n: 1 }],
  }),
  action(5, 'Radiant Judgment', {
    text: 'Imprison all enemy units with 3 Power or less. Influence: +2.',
    onPlay: [{ op: 'imprison', t: 'auto', f: { side: 'enemy', maxPower: 3 } }, influence(2)],
  }),
  unit(5, 'Censer of Purity', 3, 6, {
    text: 'At the start of your turn, lose 1 Influence. If you do, heal 2 damage from your base.',
    startOfTurn: { ops: [{ op: 'influence', n: -1 }, { op: 'heal', t: 'selfBase', n: 2 }] },
  }),
  upgrade(5, 'Aura of Resolve', {
    text: 'Attach to unit. At the start of your turn, gain 1 Influence.',
    startOfTurn: { ops: [{ op: 'influence', n: 1 }] },
  }),
  unit(5, 'Custodian of Law', 4, 6, {
    text: 'Guard. Influence: +2.',
    kw: [{ k: 'guard' }],
    onPlay: [influence(2)],
    designerNote: INF_NOTE,
  }),
  action(5, 'Imprisonment Chamber', {
    text: 'Imprison target unit. At the start of your turn, lose 1 Influence.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }],
    designerNote: DECAY_NOTE,
  }),
  upgrade(5, 'Unshakable Wall', {
    text: 'Attach to unit. This unit gets +2 Armor and Guard.',
    statics: [
      { s: 'aura', scope: 'attached', armor: 2 },
      { s: 'aura', scope: 'attached', kw: { k: 'guard' } },
    ],
  }),
  unit(6, 'Hierophant', 2, 6, {
    text: 'Other friendly units get +1 Power while your Influence is 10 or more.',
    statics: [{ s: 'aura', scope: 'otherFriendly', p: 1, cond: { influenceAtLeast: 10 } }],
  }),
  action(6, 'Detain', {
    text: 'Imprison target enemy unit. You gain 1 Influence.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }, influence(1)],
  }),
  action(6, 'Light of Authority', {
    text: 'Give target unit +3 Power until end of turn. Influence: +1.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'buff', t: 'chosen0', p: 3, dur: 'turn' }, influence(1)],
  }),
  unit(6, 'Gateward Colossus', 3, 9, {
    text: "This can't attack. Whenever a unit is imprisoned, gain 1 Influence.",
    kw: [{ k: 'cantAttack' }],
    statics: [{ s: 'imprisonWatcher', n: 1 }],
  }),
  unit(6, 'Inquisitor', 4, 5, {
    text: 'When this enters a zone, imprison target unit with 4 Power or less.',
    onEnterZone: [{ op: 'imprison', t: 'auto', auto: { scope: 'enteredZone', maxPower: 4 } }],
    designerNote: AUTO_NOTE + ' Fires on deploy and on every move.',
  }),
  action(6, 'Sanctify', {
    text: 'Heal 4 damage from your base. Gain 2 Influence.',
    onPlay: [{ op: 'heal', t: 'selfBase', n: 4 }, influence(2)],
  }),
  upgrade(6, 'Resolve Banner', {
    text: 'Attach to unit. Other friendly units in this zone get +1 Power.',
    statics: [{ s: 'aura', scope: 'friendlyInZone', p: 1 }],
    designerNote: '⚑ Buffs friendly units sharing the carrier\'s zone, excluding the carrier.',
  }),
  action(6, 'Devout Intervention', {
    text: 'Reduce damage to your base by 3 this turn. Gain 1 Influence.',
    onPlay: [{ op: 'preventBase', n: 3 }, influence(1)],
  }),
  unit(7, 'Archon of Order', 7, 7, {
    text: 'At the start of your turn, imprison up to one unit in each enemy zone.',
    startOfTurn: { ops: [{ op: 'imprison', t: 'auto', auto: { scope: 'eachZone' } }] },
    designerNote: AUTO_NOTE + ' "Each enemy zone" = each zone holding enemy units.',
  }),
  action(7, 'Command Edict', {
    text: 'Give all friendly units +2 Armor this turn. Influence: +2.',
    onPlay: [{ op: 'buff', t: { side: 'friendly' }, armor: 2, dur: 'turn' }, influence(2)],
  }),
  action(7, 'Supreme Sentence', {
    text: 'Imprison target unit. If your Influence is 15 or more, imprison another.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }],
    designerNote: '⚑ The 15+ clause can never fire while 15 IS the win threshold — inert as printed. Needs design.',
  }),
  unit(7, 'Champion of the Faith', 6, 6, {
    text: 'When this attacks, your opponent loses 1 Influence.',
    onAttack: [influence(1)],
    designerNote: '⚑ Influence is one shared track: "opponent loses 1" = you gain 1 (DECISIONS 15).',
  }),
  unit(7, 'Radiant Citadel', 0, 8, {
    text: "This can't attack. Your maximum Influence is increased by 2.",
    kw: [{ k: 'cantAttack' }],
    statics: [{ s: 'oppThreshold', n: 2 }],
    designerNote: '⚑ "Maximum Influence +2" has no meaning on a ±15 shared track — reinterpreted as: your opponent needs 17 to win on Influence while this is in play. Needs design.',
  }),
  action(7, 'Absolution', {
    text: 'Remove all negative effects from target unit. Gain 2 Influence.',
    targets: [{ t: 'unit', side: 'friendly' }],
    onPlay: [{ op: 'removeNegative', t: 'chosen0' }, influence(2)],
  }),
  action(7, 'Prison of Light', {
    text: 'Imprison target unit. At the start of your turn, lose 1 Influence.',
    targets: [{ t: 'unit', side: 'enemy' }],
    onPlay: [{ op: 'imprison', t: 'chosen0' }],
    designerNote: DECAY_NOTE,
  }),
  unit(8, "Light's Vanguard", 6, 8, {
    text: 'Flying, Guard. Influence: +2.',
    kw: [{ k: 'flying' }, { k: 'guard' }],
    onPlay: [influence(2)],
    designerNote: '⚑ Flying is undefined in rules v1.2 — implemented as "may move to any zone, ignoring adjacency". Needs design.',
  }),
]
