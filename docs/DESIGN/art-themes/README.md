# Card Art — Theme Anchors

**Source thread:** [issue #11](https://github.com/booherbg/2026-card-game/issues/11).
The designer posts one **theme anchor image per color** on that thread; the agent files each
here as `<color>-theme-reference.png`. These anchor the look for every card in that color —
style, palette, era (the designer's stated base: **1977 Rankin/Bass Hobbit cel animation**).

## Pipeline reality (agreed on the thread)

- The agent **cannot generate raster images** — art comes from the designer's generation tool.
  **Builder's ruling (#11, 2026-07-11): no image-gen API wiring — Griff uses ChatGPT (a running
  saved chat, free or pro) to generate thematic card sheets and attaches them to issues; the
  agent parses, crops, and files them.** The pip chop-out is the template for that flow.
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
`_contact-sheet.png` is the overview). **Designer constraint (#11): cards must stay readable —
size the pips accordingly when they become cost symbols.** They carry the dark backdrop baked in — fine as tiles;
if transparent-background versions are ever needed for overlaying on light frames, either the
designer regenerates each sigil on a plain background or the agent attempts a mask (glow edges
make automated masking imperfect).

## Per-color art styles (#5, 2026-07-16)

The base was one style for all (1977 Hobbit). Griff has since split it: **each color gets a
distinct art style**, so a card's look tells you its color before you read a word of rules text.

| Color | Style | Status |
|---|---|---|
| **Yellow** | 1977 Rankin/Bass Hobbit — whimsical storybook, warm light, fairy-tale law | **locked** (the original base; the yellow action + upgrade sheets are this) |
| **Red** | *Star Wars: Maul* animated — dark, kinetic, high-contrast menace | stated |
| **Blue** | Tron light-cycles/grids **fused with** architectural blueprint/schematic — white ink on blue paper, right angles and decimals, gears and iron | stated (color unbuilt) |
| **Green** | Bob Ross — soft painterly landscapes, patient growth (calm as a threat) | proposed |
| **Purple** | Salvador Dalí (dream-logic) with an M.C. Escher edge for the traps (impossible geometry = prediction) | proposed |

**Frame:** one universal card frame for now — Griff's red-veined stone template — with the live
info overlaid in its slots (name bar, art window, crossed-axes = Power, heart = Health, text box,
cost circles). Per-color frames come later, after the art images are down (#5).

## Anchors received

| Color | File | Notes |
|---|---|---|
| Purple | `purple-theme-reference.png` | Cloaked wanderer, crystal-tipped staff, moonlit twisted forest, crescent moon; deep violet palette. Matches purple's charter (wisdom/magic/shadow, decision 65). |
| Red | — | awaited |
| Yellow | — | awaited |
| Blue | — | awaited (color unbuilt) |
| Green | — | awaited (color unbuilt) |
