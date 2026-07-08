# UX Audit — Professional Gameplay Bar

**Date:** 2026-07-08 · **Trigger:** first human playtest (designer, mobile). Standard applied: *at any moment, a player must be able to answer — What is this? What can I do? What just happened? What is about to happen?* — without hovering, guessing, or reading source.

**Legend:** ✅ shipped in this pass · 🔜 designed, queued · 💤 deliberate later.

## A. "What is this?" — inspection

| # | Finding | Severity | Status |
|---|---|---|---|
| A1 | Units on the board cannot be inspected — text/keywords/upgrades live in hover `title`s; on touch there is **no way to learn what any card does once played** | Critical | ✅ Tap any unit → inspector sheet: full card, live vs printed stats, keyword glossary lines, attached upgrades, status explanation, ⚑ ruling |
| A2 | Banked resources are **public information** (played face-up per rules) but shown only as a count | High | ✅ Tap the ⬢ counter → pile browser (both players') |
| A3 | Discard piles are public but shown only as a count | High | ✅ Tap the ✕ counter → pile browser |
| A4 | Upgrades on a unit show as ⬥N with names in a tooltip | High | ✅ In the unit inspector, upgrades render as full mini-cards |
| A5 | ⚑ designer-ruling notes are hover-only | Medium | ✅ Shown in the inspector |
| A6 | Hand cards are readable but small on phones | Low | 💤 acceptable; inspector covers deep reading via board; revisit with pinch/zoom or tap-to-enlarge |
| A7 | No way to inspect the *opponent's* revealed information history (what they've played) beyond scrolling the log | Medium | 🔜 discard browser partially covers; a per-player "seen cards" tally is a natural admin/designer tool later |

## B. "What just happened?" — event visibility

| # | Finding | Severity | Status |
|---|---|---|---|
| B1 | Damage/attacks/deaths produce **no board feedback** — numbers silently change; on mobile the chronicle is off-screen, so base damage is invisible ("how would I know they're pecking my base?") | Critical | ✅ Event ticker: every engine log line surfaces as a transient banner over the board, newest-first, fading after a few seconds |
| B2 | Life changes don't call attention | High | ✅ Life numeral flashes on damage (red) / heal (green) |
| B3 | No animation of attacks/movement (which unit did it) | Medium | 💤 real animation pass later; the ticker names actor and target for now |
| B4 | Influence changes move the marker but aren't narrated in place | Medium | ✅ covered by ticker (engine already logs every shift) |
| B5 | Turn changes on mobile can be missed | Medium | ✅ ticker shows "— Turn N —" lines |

## C. "What can I do?" — affordances

| # | Finding | Severity | Status |
|---|---|---|---|
| C1 | Nothing marks *which of your units can still act* — exhausted units dim, but ready-with-legal-actions isn't positively indicated | High | ✅ gold corner dot on your units that currently have a legal move/attack |
| C2 | On mobile, tapping a hand card shows Play/Bank **in the sidebar below the fold — off-screen**; taps appear to do nothing | Critical | ✅ floating action dock pinned to the bottom on phones: Play/Bank/targeting prompt/Cancel always visible |
| C3 | Unaffordable cards dim, but not *why* | Medium | ✅ hints line states ready-resource count; cost badge reddens when unaffordable |
| C4 | Forced passes / off-turn rules were unexplained | High | ✅ previous pass: contextual hints + auto-pass + Skip to my turn |
| C5 | No onboarding/legend | High | ✅ previous pass: How-to-play panel (?) |

## D. Board-state clarity

| # | Finding | Severity | Status |
|---|---|---|---|
| D1 | Buffed/debuffed stats indistinguishable from printed | Medium | ✅ inspector shows live vs printed; on-chip green/red stat tint 🔜 |
| D2 | Guard/armor/imprisoned/sick chips are dense but learnable | Low | ✅ glossary in help + inspector |
| D3 | No colorblind pass (red/yellow factions, red damage) | Medium | 💤 palette variants later; shapes+icons already differ |
| D4 | No sound/haptics | Low | 💤 |

## E. Flow & ergonomics

| # | Finding | Severity | Status |
|---|---|---|---|
| E1 | Headers pinned on mobile ate vertical space | High | ✅ previous pass: scroll-away |
| E2 | Sidebar-below-board on mobile means the influence track is off-screen during play | Medium | 🔜 candidate: compact influence strip in the mobile dock; watch playtests |
| E3 | Some buttons under 44px touch guideline | Low | 🔜 padding pass |
| E4 | Undo/concede confirm states could be misread | Low | ✅ two-step confirms exist |

**Deliberately not now:** animations/transitions system, sound, spectator chat, replays scrubber on multiplayer table (demo has it), localization, colorblind themes. Each is listed so it isn't forgotten — none block playtesting.
