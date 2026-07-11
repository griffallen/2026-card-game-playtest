# Current Hand-off

**Phase:** **V3.0 BUILD (Blaine's order, #12) + live watch.** A **1-minute** loop checks GitHub,
folds designer/builder activity, then **continues the build** — slices in
`docs/DESIGN/03-BUILD-PLAN.md`. **DONE: V3-1 ✅ · V3-2 pips ✅ · V3-3 keywords ✅ · V3-4 combat
+ sim proof ✅ · V3-5 vocabulary ✅ (attachOrphan deferred to re-churn's first upgrade) ·
GRIFF'S FIVE REWORKS LIVE ON THE DEMO (PR #13 merged; modal Reckless, Blood Rush,
Devastating Strike, Volcanic Slam, Unchained Rage — 7264550). 146 tests green.
NEXT: V3-6 card re-churn (remaining ~115 cards: strip dead keywords, prison→Capture ladder,
purple→Hidden/Sneak/Infiltrate, superlinear re-pricing, pips: lines from 06 baseline,
attachOrphan with first upgrade) → V3-7 demo+ship.** Mobile UX + contrast hotfixes shipped (#17).
Strict TDD; commit per slice; finish = deploy + GitHub release tag with exec summary to #12.

## THE WATCH (what the loop iteration does)

1. `gh issue list --state all --json number,comments,state` — compare comment counts against the
   ledger below. **If nothing changed: reply "no change" and stop (low token mode — one tool
   call, one line, no elaboration).**
2. If Griff (@griffallen) posted: read it, **reply on the thread** (sign as **⚜ The Chronicler**),
   and fold rulings through the loop: DECISIONS.md → the affected spec/cards/docs → tests →
   deploy (`./scripts/deploy-demo.sh`) when player-facing. Commit + push everything.
3. Comment-count ledger as of 2026-07-11 ~00:30 (issue:comments, x = closed):
   **16:1 · 15:1 · 12:8 · 11:7x · 10:1 · 9:9x · 8:4x · 7:3x · 6:4x · 5:1 · 4:11 · 3:1x · 2:2x · 1:5x.**
   **DECISION 70 (#12, "reading A"): Scar caps at remaining health — min(damage, health−damage).
   THAT WAS THE LAST DESIGN GATE. The v3 spec has zero holes; the build is clear.**
   #11 closed (Griff supplies art post-redesign, agent cuts). #16 = Blaine asks about a separate
   Chronicler GitHub identity — answered: needs a machine account + PAT from Blaine
   (`GH_TOKEN_CHRONICLER`); agent takes over from there.
   **DECISION 69 (#15): pips are now a PRESENCE GATE, not a payment** — exhaust any `cost`
   resources; bank must CONTAIN ≥ pip-count providing cards per color; banked cards provide 1
   presence per color they carry (never stacking). Spec §1.2 rewritten. Echoed with a worked
   example (3 red pips = 3 distinct red banked cards); silence = confirmed, build implements
   this. Supersedes the #9 Q1–Q2 payment model — THE BUILD MUST USE THE PRESENCE MODEL.
   **BLAINE IS ENGAGED ON THE THREADS (02:12–02:15): art pipeline ruled (#11 — Griff generates
   card sheets via ChatGPT, attaches, agent parses; NO image-gen API) and build confirmed for
   TONIGHT (#12) pending Griff's Overextend-vs-Scar clarification.** Watch for that answer —
   it's the last gate before the build session.
   Decision 68 folded (superlinear cost curves; session-006 burn grammar retired — re-churn
   re-prices red on a convex curve).
   **⚠ PROTOCOL UPGRADE (twice bitten): Griff machine-guns comments — on ANY count change,
   list the FULL thread (authors+timestamps) and handle every unaddressed designer comment,
   not just [-1].** Two were nearly lost this way (Bloodfrenzy, Unchained Rage).
   Decision 67 folded (upgrade salvage, v3 §1.5). Scar/Overextend A-or-B still unanswered
   (re-nudged on #12).
   **⚠ lesson from tonight: Griff double-comments within seconds — after reading "the newest
   comment", re-check the count before updating the ledger (a Searing Bolt request hid behind
   a Blood Rush one and was nearly missed).**
   Card rework tally: Reckless cost-0 ✅ · Searing Bolt 3-any ✅ · Bloodfrenzy +1P/Armor1 ✅
   (threshold kept ≤10, "less than 10" boundary flagged) · PR #13 modal 🕐v3 · Blood Rush
   linked-amount 🕐v3 · Devastating Strike conditional 🕐v3 · Volcanic Slam upTo+sameZone 🕐v3
   (interim offered) · Unchained Rage double-filter+2-round-dur 🕐v3.
   **PENDING GRIFF: (1) #12 — is the "can't overextend beyond remaining health" cap for Scar
   (reading A) or a returning Overextend (reading B)? Asked, awaiting one-word answer; staged
   in draft spec §3 as pending. (2) #4 — Blood Rush rewrite ("remove damage from your unit,
   deal that much to Home") staged for v3 linked-amount ops; fixed-number version offered if
   he wants it live now.**
   PRs: **#13 OPEN (2 comments — Reckless Charge modal rework, HELD for v3 modal+count-pump
   ops, staged in the draft spec §3; merges when v3 vocabulary lands, or Griff drops the OR)
   · #14 merged (cost 1→0, deployed; note posted: 0-cost = automatically pip-free = splash-tax
   escape, lever offered)**. A `griffallen-patch-1` branch exists with no PR — ignore unless
   a PR appears.
   A new issue number appearing is activity even when all counts match.
   Any number above these = new activity (my own replies are included in these counts).

## State (2026-07-10 midday)

- **Canon-v1.0 / rules v2.3 live everywhere** (demo deployed + verified; server seeds refresh).
  120 cards (36 purple = proposal), 122 tests green, all four verify scripts pass.
- **THE v3.0 GATE IS CLOSED — all ten questions answered.** Griff answered Q1–Q6 midday and
  Q7–Q10 in the evening (issue #9), all folded into `docs/SPECS/game-rules-v3-draft.md`,
  decisions 59–62 cut: MTG-style pips; target-declared blocker-pairing combat (defender pairs
  AND splits gang damage; unblocked damage → declared target; Breakthrough spills to target);
  Hidden CAN block; Sneak = per-card exhaust payloads; captives return exhausted; **Guard v3 =
  "does not exhaust to defend."** One derived default echoed on #9 for veto: **blocking exhausts
  non-Guard blockers** (Guard's perk is vacuous otherwise). Griff also closed #3 (prison) himself.
  **NEXT ARC (session-scale, needs Blaine or a fresh session — not a watch tick): finalize the
  draft as game-rules v3.0 → build plan (pips → keywords → combat) → card re-churn → canon-v2.0.**
  **⚠ THE DESIGNER IS NOW WAITING ON THE BUILD — Griff opened #12 ("Publishing Rules v3")
  asking what's blocking; answered: nothing designer-side, build starts next session. #12 is
  the v3 publishing tracker; it closes when v3 is live on the demo. The v3 build is the top
  priority for the next working session.**
- **Pip proposal APPROVED (decision 66, #9 closed):** the cost-tiered grammar + 13 deviations
  ship into the v3 build as-is; post-playtest tuning lens = per-card splash-hostility. **#9 is
  closed — nothing about v3 is designer-blocked anymore.** Blocking-exhausts (decision 62's
  derived default) stays vetoable until the combat build lands.
- **London mulligan shipped** (decision 58): `mulliganStyle` param + demo toggle, deployed.
  Griff's play verdict picks the default.
- Decisions 57–58 logged (naming stays; mulligan ruling). #8 closed. Audit tab = "The State of
  the Game" (current-only); original frozen at `/audit/archive`.
- **THE COLOR CHARTER LANDED (#10 → decision 65, `docs/DESIGN/07-COLOR-IDENTITIES.md`):**
  five colors — red rage-burst, yellow efficient aggression, purple reactive control (trap/predict
  shapes, NOT interrupts — engine never pauses mid-resolution), BLUE machines/engines = THE
  influence color, GREEN nature/midrange anchor. Mono playable, multi encouraged (pips serve
  this). Blue + green are unbuilt future colors. Awaiting Griff's word on: purple's reactive-
  influence flavor, "Surge" momentum keyword (red, future), and the sequencing proposal
  (churn red/yellow/purple → canon-v2.0 first; blue/green as first expansion).
  **#6 closed into #10** (decision 63: matchup-dependent influence is by design). **#7 closed
  (decision 64):** claiming initiative stays; intercept half moot. Issues still open for Griff:
  #4 (ratify redesigns), #5 (purple verdict),
  #10 (charter follow-ups), #11 (art: Griff posts one anchor image per color; purple filed at
  `docs/DESIGN/art-themes/`; agent owes SVG per-color frame templates; image-gen-API wiring =
  Blaine's call, flagged). **Cardback + five pips landed (#11): Griff's cardback chopped into
  `art-themes/pips/pip-<color>.png` — pips are SHAPE+color dual-coded (red circle · yellow
  pentagon · blue square · green triangle · purple hexagon), shapes recorded as canonical; use
  these as the cost symbols when the pip system is built.** Griff also closed #2 himself.

## Working agreements (from Blaine, this session)

- **Low token mode on idle loop iterations** — one line, no narration.
- Agent signs GitHub as **⚜ The Chronicler**; Blaine signs `-BB`. **Every agent comment now
  OPENS with an ASCII banner** (Blaine's directive, #16): fenced code block, ⚜ seal + "THE
  CHRONICLER" + live state line (build phase/tests/progress); art varies with the moment.
  Name stays The Chronicler (agent's own choice, offered by Blaine).
- Deploy freely; issues are the designer channel; fold accepted rulings without re-asking.
- Port 3000 belongs to another project — server smoke-tests use `PORT=3100`; kill by listener PID.

## Reading order for a fresh session

This file → `docs/SPECS/game-rules-v3-draft.md` (the Q-holes) → issue #9 thread →
`docs/DESIGN/05-V3-DIRECTION.md` · `06-PIP-PROPOSAL.md` → DECISIONS.md 46–58 →
`docs/PLAYTESTS/001.md` (balance truth + the bot-quality moral). Session stories: summaries
006 (+postscript) and 007.
