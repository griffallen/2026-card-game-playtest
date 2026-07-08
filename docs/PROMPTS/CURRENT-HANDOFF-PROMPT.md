# Current Hand-off

**Phase:** Playtest & iterate — the loop is running: 4 human playtests and the designer's first review
landed decisions 31–39 (sessions 001–002, 2026-07-07/08)
**Working with:** either — the designer now has a self-serve surface (below); the builder drives the
turn-structure rework

## State

- **Live demo (share this):** https://blainebooher.com/new-game-demo/ — Play (hotseat / vs baseline AI /
  watch with pause/step/speed), Deck Explorer, in-browser Simulator (seeded, exports JSON, Watch▶
  replays any row move-for-move), and the Design Audit page (updated with designer-session outcomes).
  Redeploy: `./scripts/deploy-demo.sh`.
- **Multiplayer app:** built & container-verified; fly.io CI/CD armed (app `new-game-proto`, deploy
  token set, workflow gated by repo variable `DEPLOY_ENABLED=false`). **Going live needs one human
  step:** create Neon DB → `fly secrets set …` → flip the variable (exact commands in README-DEPLOY.md).
- **Card database:** `data/cards.csv` — the designer's editing surface (GitHub web editor or Google
  Sheets), incl. per-card `influenceTrigger`. `scripts/cards-import.ts` validates + compiles to the
  engine's override layer; bad edits fail with readable errors. Workflow doc: `data/README.md`.
  **Invite the designer as a repo collaborator** (free plan supports it).
- **Rules now:** mulligans (−1 card each), chosen starting banks, event-earned influence only,
  Overextend = optional attack gamble (+N now, N self-damage at EOT), empty-deck penalty (−1/−1),
  prison "on notice." Sims post-change: combat-dominated, red ~30% in bot mirrors, influence wins
  nearly extinct — the designer tunes this via CSV trigger values.
- 71 automated tests + browser drives (`scripts/verify-*.ts`) green; engine deterministic; every game
  exports seed+actions for perfect replay.

## Next

1. **Turn-structure rework (builder + agent):** Blaine wants to iterate on turn quirks; the multi-unit
   attack + defender-interception ruleset is drafted (DECISIONS 38 / session 002 notes) and *waiting on
   this*. Design both together, then implement — it adds the game's first mid-action prompt (defend
   step), which the event-sourced engine supports as paired actions.
2. **Designer's CSV pass:** normalize the AI-drafted cards — set `influenceTrigger` values (his
   balance dial), strip/keep the inert action-Overextend per card, fix texts. Then
   `npx tsx scripts/cards-import.ts`, rerun `npm test` + the Simulator, redeploy demo.
3. **Open designer questions:** rename "base/home" (Banner / Hearth / Seat / Beacon offered); prison's
   fate; mulligan feel; whether influence-win threshold needs moving now that the track is slow.
4. **Deploy multiplayer** when they want remote play (README-DEPLOY.md, ~3 minutes of human steps).

## Read first

`docs/PLAYTESTS.md` (what the games taught us) → `docs/DESIGN/DECISIONS.md` 31–39 →
`docs/DESIGN/04-COLORS-ROADMAP.md` (green/blue/purple dreaming). The demo's Audit tab is the
designer-facing rollup.
