# Current hand-off (after session 009, 2026-07-13)

**Phase:** Playtest & iterate. **Next in the chair:** likely Griff (via GitHub issues/PRs)
with Blaine's 4-minute watch loop; read `docs/PROMPTS/SESSION-SUMMARIES/009.md` and
`docs/DESIGN/DECISIONS.md` entries 89–100 first.

**State of the game:** v3 canon now includes the **duel law** (decision 98: a lone attacker
is unblockable except by ONE Guard — full redirect, no exhaust; gangs stay open) with the
**Home carve-out** (100: base attacks keep open blocking), **uncapped Scar** (94),
**death-only capture** (92: no voluntary release, no grip-lock), and the **rebalanced
yellow** (99: ladder −1, fourteen flat influence riders cut, ⚑ wholesale). New engine
vocabulary this session: `doom`, `attackTax`, X costs (`xSurge`), chosen splash
(`splashReap` + attack-carried `splash`), capture `income`, `damagedOrMaxHealth`, `onDeath`.

**Numbers (400-game A/Bs, heuristic bots, both seat orders):** prebuilt red 33.5% /
**Griff's Red 43.8%** (his 65-card curation, now shipped as a named prebuilt) vs Radiant
Order; influence wins ~20%; ~13 rounds. 203/203 engine tests; demo deployed clean.

**Awaiting Griff:**
- #55: ratify/veto the 26-card yellow ⚑ pass; the ±20 influence musing was advised against
  (the clock slowed at the source); a "copy deck list" workshop export button was offered,
  not yet built.
- #50: Breakthrough deserves a card-pass re-read (its job shrank under 98, partly returned
  with 100); the board is close enough that single cards move it.
- Standing ⚑ stacks: decisions 89/91/93/96/99 assumptions; older: purple Ranged redesigns,
  Politician carriers.

**Backlog:** multiplayer v3 port (#23 — now much bigger: duel law, splash picks, X costs,
doom, undo decision 82), purple in the sim rotation (#5), State-of-the-Game rewrite.

**Builder notes:** three keyword whitelists (types/cardfile/validate) must stay in sync;
onDeath is delete-first (body leaves play before its ops run); DemoTable's
`interchangeableSlots` governs multi-target pick matching (issue #56); the watch-loop sweep
is open-issues-by-updated (50) + open PRs + the comments feed — comments alone miss new issues.
