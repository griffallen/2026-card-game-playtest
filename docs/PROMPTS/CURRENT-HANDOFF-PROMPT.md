# Current hand-off (session 012 patch, 2026-07-14)

**Phase:** Playtest & iterate. **Next in the chair:** likely **Griff** (replaying #81 against the now-live fixed bot; finishing his card queue; building a tuned yellow deck) or **Blaine** (merge/land calls, the #69 summon architecture call). Model split: run the watch loop, triage, thread replies, and UX folds on **Opus**, delegating **up to Fable** for mechanics-shaped work (the yellow wiring, the summon feature, benchmark discipline) — Fable delegation verified working session 012.

**✅ THE DEMO IS DEPLOYED (session 012).** `main` — block-UI (#58) + bot-defense fix (#68) — is live at https://booherbg.github.io/new-game-demo/ (bundle `index-BZvyLw5o.js`, gate passed, 209 engine tests green). **Deploy yourself from now on — never wait on Blaine.** The old "the session can't reach localhost so Blaine must run it" claim was wrong ("The Blind Pilot," 011); it dammed the chain for days. Run `./scripts/deploy-demo.sh` **unsandboxed** (Bash `dangerouslyDisableSandbox`) — see **CLAUDE.md → ## Deploying**. Deploy freely after any demo/rules change.

**Read first:** `docs/PROMPTS/SESSION-SUMMARIES/011.md` → `010.md` → open PRs #69–80 (the yellow batch) → issues #81 (Griff's yellow *beats* red) and #74 (demo UX).

**Live-gate sim tell (session 012):** the deploy gate's own 30-game sim (stock decks, fixed bot) reads **red 30% / yellow 70%** vs decision 99's red ≈46% target — yellow is ahead even with a competent defender. Corroborates Griff's #81 read, but it's the *stock* yellow list pre-batch-wiring, so not the final word. Real test = Griff's tuned deck vs the fixed bot after the yellow batch lands.

**State:** `main` = block-UI + bot-defense fix, **209 engine tests green, DEPLOYED.** Branches:
- `feat/per-attacker-influence` — decisions 103 (`per` count op) + 104 (no caps on life/influence) + #70–73 wired. **Over-corrects balance (red 53–60% vs the 46% target even with a competent bot) — do NOT merge until re-tuned via a real deck.**
- `feat/card-icons` — **superseded.** The #74 icon set (**🧍 unit · 🏃 action · ↑ upgrade**) was re-implemented directly on main (`a416ca5`, deployed) instead of rebasing this stale branch — it's local-only and now carries no unique work. **Safe to delete** (`git branch -D feat/card-icons`, Blaine's call).
- `fix/bot-defense` — merged to main.

Scratchpad (session dir) holds the full benchmark tables and every card's corrected-effects JSON.

**Open, in priority order:**
1. **Yellow is confirmed overtuned (#81) — balance pass is the live design work.** Griff's *actual* 52-card deck (read from his #81 screenshots) now ships as prebuilt **`griffs-yellow`** (b87ce72) and benchmarks **81.7% vs Griff's Red** with the fixed bot (decision 99 target: red ≈46%; here red is 18%). It's deck construction, not the color: stock Radiant Order is 53% vs the same red, Griff's build 82% — a 29-pt gap. **Next is a one-lever-at-a-time design conversation with Griff:** which to nerf first — guard-wall density, the prison/capture lock, or the influence clock — then sim each nerf vs `griffs-yellow` at N=300 (`npm run sim:matchups 300 heuristic griffs-yellow griffs-red`). Griff was asked to pick the lever on #81.
2. **Wire the yellow batch (#69–80) — Griff chose wire-first.** **5 clean cards WIRED** (`1e0267a`: #72 Archon 3/4, #73 Hierophant 2/4 + positive-influence aura, #76 Sunguard 1/1+Shielded, #77 Bulwark 2/2+Armor1, #78 Noble Purifier 4/1) — via a Fable subagent + 3 audit-fold test-fixture fixes; **`griffs-yellow` vs Griff's Red 81.7% → 70.7%**, 209 green, gate clean. **Remaining 6, each with an open decision:**
   - **Need a count-scaling ("per") primitive:** #70 Light's Vanguard (influence per attacker) + #71 Prison of Light (per enemy exhausted / per friendly in zone). The primitive lives on the shelved decision-103 branch — asked Blaine to sanity-check lifting *just* it; building it unlocks both.
   - **#75 Containment Priest:** a "damaged" target filter + a two-mode (OR) target.
   - **#80 Subjugate → "Shackles":** pip-count-scaling buff + flips action→upgrade + a **rename that changes the slug** — must alias so `griffs-yellow`'s `subjugate` ref survives (flagged to Griff).
   - **#69 Radiant Citadel:** unit-creation summon (2 Politician tokens, 0/1 can't-attack Hidden) + per-turn threshold escalation — **Blaine's architecture call** (first unit-creation mechanic).
   (#79 radiant-aegis isn't in Griff's deck.)
3. **#69 Radiant Citadel — the summon feature** (self-cloning: on-play, if it's your only copy, create 2 copies at 0 Power / 1 Health; the "only copy" clause is the recursion fuse). Design locked with Griff; the game's **first unit-creation mechanic** — architecture call for Blaine before building.
4. **Yellow re-tune** — now unblocked: Griff's deck is captured as `griffs-yellow` (item 1), so the "copy deck list" button (#55, Griff ratified) is a *convenience* now, not a blocker for the balance work. The re-tune is item 1's lever conversation. Decision 99's target is red ≈46%.
5. **Demo UX backlog (#74, one thread):** ✅ the ↑-icon set is **live** (`a416ca5`, 🧍·🏃·↑). Remaining: the copy-deck-list button, then AI-turn readability — damage provenance in the action pop-up (the log already names the source), dead-card fade, the card-appears-in-target-zone flourish. Batch and deploy together.

**Assigned to Blaine:** #58, #69, #68. **#68 stays open** until Blaine confirms the now-live fix defending in a game; **#58** likewise (block pop-up now live).

**Decisions pending main:** 103 (count-scaled `per` op) and 104 (no caps on life/influence) — drafted on `feat/per-attacker-influence`, **not yet in main's DECISIONS.md** (land them when the yellow batch merges). The bot-defense fix is in main with no decision number yet.

**Standing agreements:** ⚜ ASCII banner on every GitHub comment, zero exceptions · Chronicler signs, Blaine is `-BB` · **deploy yourself via `deploy-demo.sh` (unsandboxed) — never wait on a human** · fold accepted rulings without re-asking · sweep = open-issues-by-updated (50) + open PRs + comments feed · no "load-bearing"/AI-isms · Chronicle entry per session (voiced intro + technical log) in `apps/demo/src/pages/Journal.tsx` · surprises welcome, riding on green tests · the watch loop is a session-local cron (`/loop 4min` + the WATCH prompt) — **still armed as of the session-012 patch.**
