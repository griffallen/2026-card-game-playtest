# Current hand-off (after session 011, 2026-07-14)

**Phase:** Playtest & iterate. **Next in the chair:** likely **Blaine** (deploy + merge/land calls) then **Griff** (finishing his card queue + building a tuned yellow deck). Model split: run the watch loop, triage, thread replies, and UX folds on **Opus**, delegating **up to Fable** for mechanics-shaped work (the yellow wiring, the summon feature, benchmark discipline).

**⚠ FIRST — unblock the demo deploy. Everything waits on it.** `apps/demo` publishes via `scripts/deploy-demo.sh` (build → Playwright playability gate on `localhost:4199` → force-push `dist` to the public `booherbg/new-game-demo` Pages repo → https://booherbg.github.io/new-game-demo/). The gate needs localhost, which the agent's session environment **network-isolates per-process** (server binds, nothing else can reach it — confirmed for the main shell *and* a subagent, sandboxed and not). So **Blaine must run `./scripts/deploy-demo.sh` from his own shell** (or explicitly OK a gate bypass). `main` already contains the block-UI (#58) + the bot-defense fix (#68), verified, ready to ship the moment it's deployed.

**Read first:** `docs/PROMPTS/SESSION-SUMMARIES/011.md` → `010.md` → open PRs #69–80 (the yellow rebalance) → issues #74 (demo UX) and #81 (Griff's yellow deck *beats* red).

**State:** `main` = block-UI + bot-defense fix, **209 engine tests green**, undeployed. Branches:
- `feat/per-attacker-influence` — decisions 103 (`per` count op) + 104 (no caps on life/influence) + #70–73 wired. **It over-corrects balance (red 53–60% vs the 46% target even with a competent bot) — do NOT merge until re-tuned via a real deck.**
- `feat/card-icons` — needs a small update to the locked set **🧍 unit · 🏃 action · ↑ upgrade** (flat arrow, color pinned to survive night mode).
- `fix/bot-defense` — merged to main.

Scratchpad (session dir) holds the full benchmark tables and every card's corrected-effects JSON.

**Open, in priority order:**
1. **Deploy the demo** (above) — gates block-UI, the bot-defense fix reaching Griff's games, the icons, and the AI-feedback work.
2. **Wire the 12-card yellow batch** in one pass once Griff says his queue is empty (#69–73 wired; #75–80 reviewed, not yet). Per-card notes are on each PR. Modal cards are supported; confirm the small new bits per card (a "damaged" target filter, an "influence below 0" cond, pip-count scaling, enemy-target upgrades).
3. **#69 Radiant Citadel — the summon feature** (self-cloning: on-play, if it's your only copy, create 2 copies at 0 Power / 1 Health; the "only copy" clause is the recursion fuse). Design locked with Griff; it's the game's **first unit-creation mechanic** — an architecture call for Blaine before building.
4. **Yellow re-tune (no stat sweep yet).** After wiring: build a proper yellow deck (Griff's — the stock deck's curve is the real weakness), add the **"copy deck list"** workshop button so he can export it, and re-benchmark vs the competent bot + his Red. Decision 99's target is red ≈46%.
5. **Demo UX backlog (#74, one thread):** AI-turn readability — damage provenance in the action pop-up first (the log already names the source), then dead-card fade, then the card-appears-in-target-zone flourish — plus the icon set and the copy-deck-list button. Batch and deploy together.

**Assigned to Blaine:** #58, #69, #68. **#68 stays open** until the fix is live in Griff's demo.

**Decisions this session:** 103 (count-scaled `per` op) and 104 (no caps on life/influence) — both drafted on `feat/per-attacker-influence`, **not yet in main's DECISIONS.md** (land them when the yellow batch merges). The bot-defense fix is in main but has no decision number yet.

**Standing agreements:** ⚜ ASCII banner on every GitHub comment, zero exceptions · Chronicler signs, Blaine is `-BB` · deploy freely (via `deploy-demo.sh`) · fold accepted rulings without re-asking · sweep = open-issues-by-updated (50) + open PRs + comments feed · no "load-bearing"/AI-isms · Chronicle entry per session (voiced intro + technical log) in `apps/demo/src/pages/Journal.tsx` · surprises welcome, riding on green tests · the watch loop is session-local (re-arm with `/loop 4m` + the WATCH prompt; it was stopped at wrap).
