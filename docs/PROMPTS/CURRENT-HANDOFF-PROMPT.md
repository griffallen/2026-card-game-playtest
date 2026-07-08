# Current Hand-off

**Phase:** Playtest & iterate — turn-structure v2.0 is **built, merged to `main`, tagged `v0.2`**.
Next is playing it to feel the new tempo, then it's the designer's turn.

## State

- **v2.0 is live in code** (decisions 40–45): shared rounds + claimable initiative, no summoning
  sickness (Rush = exhaust-free entry-round move), multi-unit attack + defender intercept window.
  Engine is the contract at `docs/SPECS/game-rules.md` (v2.0-proto); `docs/GAME-FLOW.md` tells the
  same story for the designer.
- **99 tests green** (91 engine + 8 server); full 4-package typecheck clean; card CSV valid.
- **Demo browser-verified playable**: a full 6-round vs-AI game (bank → loop → multi-unit combat →
  intercept windows → winner), sim→replay faithful, no mobile overflow, zero page errors.
- **Version tags:** `v0.1` = pre-rework v1.2-rules prototype (restore point); `v0.2` = this rework.
- **All local — nothing pushed.** `origin` (github.com:booherbg/2026-card-game) is untouched.
- **The live demo at https://blainebooher.com/new-game-demo/ still runs the OLD v1.2 build.**
  Redeploy to put v2.0 in front of the designer: `./scripts/deploy-demo.sh`.

## Do next

1. **Playtest the feel** (builder first, ideally): claiming initiative (is trading your whole
   round for next round's first move worth it?) and the intercept window (is one redirect the
   right defender agency? does free Guard-interception make yellow too sticky?). The `verify`
   skill / `scripts/verify-demo.ts` drive a game headlessly; for hands-on, `npm run dev -w apps/demo`.
2. **Redeploy the demo** (`./scripts/deploy-demo.sh`) so the designer plays v2.0, not v1.2.
3. Optionally **push `main` + tags** to origin (not done this session — was kept local).

## Sim baselines (for the designer — before/after)

| | v1.2 (pre) | v2.0 heuristic mirror | v2.0 random |
|---|---|---|---|
| Red-deck wins | ~30% | ~45% | ~31% |
| Win by Life | — | ~96% | ~94% |
| Influence upsets | 3/60 (~5%) | ~4% | ~5–6% |
| First player (seat 0) wins | — | 50% | 49% |
| Median game length | ~16 turns | 10 rounds | 19 rounds |

Combat-dominated as intended; **decision 44 dissolved the first-mover edge** (seat-0 = 50%);
red breathes more (both players draw every round, guard walls no longer auto-block).

## Open questions (designer's chair)

- **New from v2.0:** does *claiming initiative* feel good? is one intercept per attack the right
  defender agency? Granted-Rush-on-veterans is pinned to the strict "still exhausts" reading
  (rush.test.ts) — revisit if playtests want it to matter.
- **Carried:** base/home rename (Banner/Hearth/Seat/Beacon), prison's fate (decision 37, "on
  notice"), mulligan feel, influence win threshold, and the **designer's CSV card pass**.
- **Card config (decision 45):** the pool is `data/cards.csv`, editable on GitHub. Validate a pull
  with `npx tsx scripts/cards-import.ts --check`; it currently stays a *staging* layer
  (`overrides.json` is `{}`, TS base authoritative) until the admin UI arrives. Don't run
  `cards-export.ts` over the designer's hand-edits.
