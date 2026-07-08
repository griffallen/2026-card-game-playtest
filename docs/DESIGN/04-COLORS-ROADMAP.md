# Colors Roadmap — dreaming ahead to Green, Blue, Purple

The June 2026 spreadsheet sketches five color identities; two are built. This maps the other three
onto the engine as it exists, so when the designer starts drafting those decks we know exactly what's
free, what's cheap, and what needs real engine work. (Orange/hubris and Indigo/magic from the original
seven-color rainbow are unsketched — parked.)

## What the spreadsheet says

| Color | Identity | Sketched keywords |
|---|---|---|
| 🟢 Green — Nature | Growth, board presence, inevitability ("if left alone, I win") | Overrun, Growth, Resource-zone synergies |
| 🔵 Blue — Machines | Control through systems and repositioning, engine building | Displace, Delay, Phase |
| 🟣 Purple — Wisdom | Decay, drain, hand knowledge, punishing presence | Decay, Drain, Gravecall |

## Engine-readiness, keyword by keyword

**Already free (existing ops/hooks cover it):**
- **Overrun** (green) — this is Breakthrough by another name; possibly uncapped. Zero work.
- **Drain** (purple, "when this deals damage, gain that much life/influence") — an `onKill`/`onAttack` +
  `heal`/`influence` combination; the influence-as-event framing from decision 34 fits it perfectly.
- **Purple hand-peek** (Mind-Stitcher) — informational only; needs a UI reveal moment, no rules engine change.
- **Growth** (green, "when you gain/play a resource, this gains a bonus") — needs one new trigger key
  (`onResourceBanked`), then it's ordinary buff ops. Small.

**Cheap additions (one op or trigger each):**
- **Displace / Delay** (blue) — `moveUnit` op targeting *enemy* units (op exists in the vocabulary,
  unused) and a `returnToHand` op (new, small). The zone line makes these immediately meaningful.
- **Decay** (purple, end-of-turn zone damage) — the engine has an `endOfTurn` hook slot that no card
  uses yet; wiring it is a trigger-scan mirror of `startOfTurn`. Small.
- **Gravecall** (purple, "when a unit dies in this zone, gain a benefit") — needs the `onDestroyed`
  trigger implemented (typed in the spec, not yet scanned) plus a died-in-zone filter. Small-medium.
- **Green resource-zone synergies** — "cards gain effects while in the resource row" wants a static
  scope `resourceRow`. Medium; touches the statics scanner.

**Real design + engine work (don't start casually):**
- **Phase** (blue, "cannot be blocked or targeted this turn") — targeting immunity exists
  (`untargetable`); *unblockable* only means something after the combat redesign lands. Sequence it after.
- **The Stack / Response cards** (purple's Mental Tax, and every "Response Mode" in the spreadsheet) —
  a real priority system. This is the turn-structure conversation the designer already wants; fold it
  into the combat/turn rework rather than bolting on later.
- **Colored resource costs** — every deck so far is mono-color, so cost pips haven't mattered. The
  moment two-color decks or color-gated cards appear, resources need color identity (the rules'
  face-up/face-down distinction finally earns its keep). Design decision first, engine second.

## Suggested order of arrival

1. **Green** — nearly free (Overrun ≈ Breakthrough, Growth is one trigger), and midrange stress-tests
   the combat redesign nicely.
2. **Purple** — Decay/Drain/Gravecall are small; its Response cards can wait for the Stack.
3. **Blue** — the most engine-hungry (Phase, repositioning tempo), and the most fun *after* multi-unit
   combat exists to reposition against.

Every new keyword goes through the same wall as everything else: structured effects, `validateCardSet`,
and a sim run before humans see it.
