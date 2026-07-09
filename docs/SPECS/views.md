# Views Spec

Look: **fantasy, clean, functional.** Dark warm table (deep charcoal-umber), parchment-light panels used sparingly, one gold accent, faction red/yellow only where they mean something. Serif display face for names/headers (system stack: Iowan Old Style/Palatino/Georgia), sans for UI text. No decorative noise: 1px hairline borders, generous spacing, every pixel does a job. All data over REST/WS — no page reloads mid-game.

## /login · /register
Centered parchment card on the dark table: game title, username/password, error line. Register = same form + confirm.

## / (Lobby)
- **Open tables** — joinable `waiting` games: host, name, created; Join button → deck picker dialog.
- **Your games** — `waiting/active` involving you: Resume / Cancel (host, waiting).
- **Recent battles** — last finished: winner, reason (life ⚔ / influence ☯), rounds.
- **New game** button → dialog: name + deck picker (prebuilt + yours, with color swatch and card count).
- Header (all pages): game title left; nav Decks · Cards · Admin (admins only) · username · logout.

## /decks · /decks/:id
List: deck cards with color identity, count, description. Detail: cost-sorted card grid (art + name + cost + type); read-only tonight (deck *building* for players is a later slice — admins edit decks in /admin).

## /cards
The designer's library browser: filter by color/type/text search, sort by cost. Card grid using the real card frame component. Cards with ⚑ `designerNote` show a small flag icon + note on hover — the reconciliation decisions surface *on the cards they affect*.

## /game/:id — the table
Landscape board, seat-relative (you always sit at the bottom):

```
┌────────────────────────────────────────────────┬──────────────┐
│  THEIR side: hand-count · deck · discard · life │  INFLUENCE   │
│  ─────────── their HOME zone (units) ─────────  │  tug-track   │
│  ─────────── NEUTRAL zone (units) ────────────  │  -15 ◄─►+15  │
│  ─────────── your HOME zone (units) ──────────  │  round/turn  │
│  your resources (ready/exhausted) · life        │  ribbon      │
│  ─────────── your HAND (cards) ───────────────  │  action LOG  │
└────────────────────────────────────────────────┴──────────────┘
```

- **Interaction = click-to-act** (no drag): click a hand card → popover "Play (N) / Resource / cancel" with cost affordability; click a unit you control → its legal moves glow (move targets = zone outlines, attack targets = red glow on units/base); click target to commit. Esc cancels. Everything driven by `legalHints` from the server — the UI can never propose an illegal action.
- **Round ribbon** (v2.0): the round number, whose **turn** it is — a turn = one action — and any **intercept window** ("Your turn" pulses gold; "Waiting for them…" dim). Pass button prominent during your turn; "Skip banking" during the start-of-round bank step.
- Units render as mini-cards: art, power/health (damage shown as red current value), status chips: exhausted (rotated 90°? no — dimmed + ⟳ icon; rotation wastes space), Guard shield, imprisoned = chain overlay + desaturation, summoning-sick = zzz chip, armor value.
- Influence track: vertical tug bar with a marker, your end gold at top of panel bottom +15… their end at top; thresholds marked; flashes on change.
- Log panel: engine-generated lines ("Riley played Searing Bolt — 2 damage to Cinder Initiate"), newest at bottom, auto-scroll.
- Game-over: banner across board (win reason), Back to lobby + Rematch (creates reversed game, same decks).
- Concede + Undo (with confirm) in a quiet corner menu. Presence dot for opponent connection.
- Spectators see both sides' hidden hands as counts only, no action affordances.

## /admin (tabs; admin only)
- **Users**: table, toggle admin, reset password, delete.
- **Games**: all games, status, participants, round count, delete/abandon.
- **Cards**: table (name/color/type/cost/P/H) → row expands to editor: cost/power/health numeric steppers, name/text inputs, effects JSON textarea (validated against the engine's effect schema on save), designer note, deactivate. "New card" → same editor; art = auto procedural preview (seeded by slug) unless artUrl given.
- **Decks**: prebuilt deck editor — card picker with counts, live legality meter (48+ cards, ≤4 copies), save.
- **Rules**: the parameter table from game-rules §2 as a form; save = clone to new version + set default (old games unaffected).

## Card frame component (shared)
One component renders any card at any size. **Cost** is a cool metallic gem (top-left) — deliberately not a combat colour, so it never reads as a stat. **Name bar** (name + optional ⚑ designer flag + optional count badge). **Type** is a single colour-coded chip on the art — icon + label, blue unit / purple action / green upgrade (no separate type line below the art; it was redundant and low-contrast). **Art box** (sliced `.jpg` if `artUrl`, else **procedural art**: deterministic seeded SVG — layered geometry, faction palette, sigil motif per type: unit=figure/blade, action=burst, upgrade=ring). **Text box.** For units, a stat row: **Power** in an amber ⚔ plate (left), **Health** in a crimson ♥ plate (right) — icon + colour make each number unmistakable. Faction frame tint red/yellow/neutral.
