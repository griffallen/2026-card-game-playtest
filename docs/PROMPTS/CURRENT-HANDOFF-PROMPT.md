# Current hand-off (session 012 patch, 2026-07-14)

**Phase:** Playtest & iterate. **Next in the chair:** likely **Griff** (replaying #81 against the now-live fixed bot; finishing his card queue; building a tuned yellow deck) or **Blaine** (merge/land calls, the #69 summon architecture call). Model split: run the watch loop, triage, thread replies, and UX folds on **Opus**, delegating **up to Fable** for mechanics-shaped work (the yellow wiring, the summon feature, benchmark discipline) — Fable delegation verified working session 012.

**✅ THE DEMO IS DEPLOYED (session 012).** `main` — block-UI (#58) + bot-defense fix (#68) — is live at https://booherbg.github.io/new-game-demo/ (bundle `index-BZvyLw5o.js`, gate passed, 209 engine tests green). **Deploy yourself from now on — never wait on Blaine.** The old "the session can't reach localhost so Blaine must run it" claim was wrong ("The Blind Pilot," 011); it dammed the chain for days. Run `./scripts/deploy-demo.sh` **unsandboxed** (Bash `dangerouslyDisableSandbox`) — see **CLAUDE.md → ## Deploying**. Deploy freely after any demo/rules change.

**Read first:** `docs/PROMPTS/SESSION-SUMMARIES/011.md` → `010.md` → open PRs #69–80 (the yellow batch) → issues #81 (Griff's yellow *beats* red) and #74 (demo UX).

**Live-gate sim tell (session 012):** the deploy gate's own 30-game sim (stock decks, fixed bot) reads **red 30% / yellow 70%** vs decision 99's red ≈46% target — yellow is ahead even with a competent defender. Corroborates Griff's #81 read, but it's the *stock* yellow list pre-batch-wiring, so not the final word. Real test = Griff's tuned deck vs the fixed bot after the yellow batch lands.

**State:** `main` = block-UI + bot-defense fix, **209 engine tests green, DEPLOYED.** Branches:
- `feat/per-attacker-influence` — decisions 103 (`per` count op) + 104 (no caps on life/influence) + #70–73 wired. **Over-corrects balance (red 53–60% vs the 46% target even with a competent bot) — do NOT merge until re-tuned via a real deck.**
- `feat/card-icons` — **stale** (cut before #58/#68 merged; `git diff main..` pulls in `ai.ts`, `Journal.tsx`, `BlockModal.tsx`). Needs a **rebase onto main** before the small ↑-arrow fix (#74: locked set **🧍 unit · 🏃 action · ↑ upgrade**, flat monochrome arrow pinned to survive night mode) can land.
- `fix/bot-defense` — merged to main.

Scratchpad (session dir) holds the full benchmark tables and every card's corrected-effects JSON.

**Open, in priority order:**
1. **Griff's #81 replay** — the fixed bot is now live; the whole "old bot" caveat is resolved. Watch for his rerun of the yellow-vs-red matchup against a bot that blocks and stops banking under siege. If yellow still walls red, it's a real balance read → card/stat pass.
2. **Wire the 12-card yellow batch** in one pass once Griff says his queue is empty (#69–73 wired; #75–80 reviewed, not yet). Per-card notes on each PR. Confirm the small new bits per card (a "damaged" target filter, an "influence below 0" cond, pip-count scaling, enemy-target upgrades). Mechanics-shaped → good Fable delegation.
3. **#69 Radiant Citadel — the summon feature** (self-cloning: on-play, if it's your only copy, create 2 copies at 0 Power / 1 Health; the "only copy" clause is the recursion fuse). Design locked with Griff; the game's **first unit-creation mechanic** — architecture call for Blaine before building.
4. **Yellow re-tune (no stat sweep yet).** After wiring: build a proper yellow deck (Griff's — the stock deck's curve is the real weakness), add the **"copy deck list"** workshop button (#55, Griff ratified) so he can export it, and re-benchmark vs the fixed bot + his Red. Decision 99's target is red ≈46%.
5. **Demo UX backlog (#74, one thread):** the ↑-icon fix (rebase `feat/card-icons` first), the copy-deck-list button, then AI-turn readability — damage provenance in the action pop-up (the log already names the source), dead-card fade, the card-appears-in-target-zone flourish. Batch and deploy together.

**Assigned to Blaine:** #58, #69, #68. **#68 stays open** until Blaine confirms the now-live fix defending in a game; **#58** likewise (block pop-up now live).

**Decisions pending main:** 103 (count-scaled `per` op) and 104 (no caps on life/influence) — drafted on `feat/per-attacker-influence`, **not yet in main's DECISIONS.md** (land them when the yellow batch merges). The bot-defense fix is in main with no decision number yet.

**Standing agreements:** ⚜ ASCII banner on every GitHub comment, zero exceptions · Chronicler signs, Blaine is `-BB` · **deploy yourself via `deploy-demo.sh` (unsandboxed) — never wait on a human** · fold accepted rulings without re-asking · sweep = open-issues-by-updated (50) + open PRs + comments feed · no "load-bearing"/AI-isms · Chronicle entry per session (voiced intro + technical log) in `apps/demo/src/pages/Journal.tsx` · surprises welcome, riding on green tests · the watch loop is a session-local cron (`/loop 4min` + the WATCH prompt) — **still armed as of the session-012 patch.**
