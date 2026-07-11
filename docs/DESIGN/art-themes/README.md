# Card Art — Theme Anchors

**Source thread:** [issue #11](https://github.com/booherbg/2026-card-game/issues/11).
The designer posts one **theme anchor image per color** on that thread; the agent files each
here as `<color>-theme-reference.png`. These anchor the look for every card in that color —
style, palette, era (the designer's stated base: **1977 Rankin/Bass Hobbit cel animation**).

## Pipeline reality (agreed on the thread)

- The agent **cannot generate raster images** — art comes from the designer's generation tool
  (or a future image service wired in by the builder; that's a stack/cost decision, flagged).
- The agent **can**: file and organize art, build per-color **SVG frame templates** (borders,
  pip icons, color styling) so cards look dressed before unique art exists, add an art slot to
  the per-card files, and make the demo render whatever art a card carries.
- Per-card art, when it starts, is named by card slug and lands in the card asset pipeline
  (exact home decided in the v3 build plan).

## The cardback & the pip set (2026-07-11)

`cardback.png` — the designer's card back: night(purple)/day(gold) split scene with the five
color pips down the spine. **Each pip has a distinct shape AND color** (red circle · yellow
pentagon · blue square · green triangle · purple hexagon) — shape+color dual coding, which
keeps pips readable for color-blind players and at small print sizes. Treat the shapes as
canonical alongside the colors.

`pips/pip-<color>.png` — the five pips chopped from the cardback (agent, ImageMagick;
`_contact-sheet.png` is the overview). They carry the dark backdrop baked in — fine as tiles;
if transparent-background versions are ever needed for overlaying on light frames, either the
designer regenerates each sigil on a plain background or the agent attempts a mask (glow edges
make automated masking imperfect).

## Anchors received

| Color | File | Notes |
|---|---|---|
| Purple | `purple-theme-reference.png` | Cloaked wanderer, crystal-tipped staff, moonlit twisted forest, crescent moon; deep violet palette. Matches purple's charter (wisdom/magic/shadow, decision 65). |
| Red | — | awaited |
| Yellow | — | awaited |
| Blue | — | awaited (color unbuilt) |
| Green | — | awaited (color unbuilt) |
