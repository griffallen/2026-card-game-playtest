# Current Hand-off

**Phase: playtest & iterate.** Rules **v3.0 is live and default on the demo**
(https://blainebooher.com/new-game-demo/, v2.3 one checkbox away). Release + executive
summary: https://github.com/booherbg/2026-card-game/releases/tag/v3.0.0. 149 engine tests
green; `docs/SPECS/game-rules.md` IS v3.0 (v2.3 archived beside it); all 120 cards churned
with per-card design notes citing their decisions (59–70 cut this session).

**Who's next in the chair:** either. Griff owes play verdicts; Blaine may want the follow-ups
below. **Re-arm the watch if desired:** `/loop 1m` with the low-token WATCH prompt — the cron
died with the last session.

## THE WATCH (what a loop iteration does)

1. `gh issue list --state all --json number,comments,state` + `gh pr list` — compare against
   the ledger below. **If nothing changed: reply "no change" and stop (one tool call, one
   line).** A NEW issue/PR number is activity even when all counts match.
2. If Griff (@griffallen) or Blaine posted: **full-thread scan on any count change** (Griff
   machine-guns comments — never read only the newest), reply on the thread (⚜ banner, NO
   exceptions), and fold rulings: DECISIONS.md → spec/cards → tests → deploy
   (`./scripts/deploy-demo.sh`) when player-facing. Commit + push everything.
3. Ledger at hand-off (issue:comments, x = closed):
   **19:1x · 18:2x · 17:22 · 16:9x · 15:1 · 12:12x · 11:7x · 10:1 · 9:9x · 8:4x · 7:3x · 6:4x ·
   5:1 · 4:11x · 3:1x · 2:2x · 1:5x — 0 open PRs.** (Agent replies are included in these counts.)
   (#18 blank screen + #19 art-blip resilience — both fixed; deploys now gated by
   `scripts/verify-demo.ts`: full game drive + sim + 120/120 art assertion.)

## Open items, in rough priority

1. **Griff's ratify pass over the churn** — offer him a thread (agent-judgment redesigns under
   his charters: purple Sneak payloads, yellow verdict ladder, red statlines).
2. **Release watch items:** guard-influence snowball under passive play (knob: defend payouts
   or a per-round cap) · blocking-exhausts veto window stays open (one line from Griff flips
   it) · pip tuning once multi-color decks exist.
3. **#5 purple verdict** (its v3 kit is the #10 charter made real) · **#10 follow-ups**
   (purple reactive-influence flavor? "Surge" keyword for red? blue/green birth order) ·
   **#17** rolling mobile punch list.
4. Art: more color anchors from Griff (#11 flow: he generates via ChatGPT, attaches, agent
   parses — pip sigils in `docs/DESIGN/art-themes/pips/` are the cost symbols).
5. Deferred tech: audit page still v2.3-era · CLAUDE.md rules pointer stale (`rules-v1.2.md`)
   · demo Rules page may need a v3 pass · retire dead v2.3 engine paths (prison/intercept/
   overextend) after the A/B period.

## Reading order for a fresh session

`docs/PROMPTS/SESSION-SUMMARIES/008.md` (the night build's story) →
`docs/DESIGN/08-V3-CHURN-WORKSHEET.md` (churn map + sim evidence:
`npx tsx scripts/sim-v3-check.ts [random|heuristic]`) → the release notes →
`docs/SPECS/game-rules.md` (v3.0) · `07-COLOR-IDENTITIES.md` · DECISIONS.md 59–70.

## Standing agreements

- **⚜ ASCII banner on every agent GitHub comment — zero exceptions** (Blaine enforced it on a
  one-liner). The Chronicler signs; Blaine signs `-BB`.
- Deploy freely; issues are the designer channel; fold accepted rulings without re-asking.
- Surprises and literary flair welcome — riding on green tests, never instead of them.
- Low token mode on idle loop ticks: one line.
- Port 3000 belongs to another project — server smoke-tests use `PORT=3100`.
