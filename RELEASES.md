# Releases

One line per build, newest first. Versioning `v0.MINOR.PATCH`, keyed to the build tier: a
**patch** bumps the patch digit, a **minor** batch bumps the minor digit; while pre-1.0 a
**major** (a mechanic/rules change) also bumps minor — **v1.0.0 is reserved for launch**. Each
line names the tier, the issues/PRs, decision numbers, sim numbers, and the commit.
See [`docs/AGENT/build-workflow.md`](docs/AGENT/build-workflow.md).

Release tracking began 2026-07-15 (#92); earlier demo builds predate the ledger.

## v0.2.2 — 2026-07-16
patch — the **Copy Chronicle** button now carries a machine-readable replay block for AI
training (#97, Blaine): seed + both deck lists (resolved, so custom decks travel) + rules +
every action in order, so a pasted game can be **replayed exactly and forked at any bot
decision**. The #67 decision-option telemetry already rode in the human log. Demo-only.

## v0.2.1 — 2026-07-15
patch — **Copy Decklist** button in the deckbuilder (#95, Griff). Copies the current decklist
to the clipboard as plain text (a `<name> — <n> cards` header + `Nx Card Name` lines).
Export-to-file deferred per Griff ("keep it simple"). Demo-only, no engine touch.

## v0.2.0 — 2026-07-15
major — **Resolve Banner + the pass-as-action primitive** (#86, PR by Griff, fired by Blaine).
The game's first mid-game upgrade re-attachment: pass an attached upgrade to a friendly unit in
the same zone for its cost, as an action, uncapped (tempo self-regulates). Resolve Banner also
gains **+1 Armor / +1 Health** on the carrier — the first upgrade-granted Health, read live so
detaching recomputes lethality (a unit standing only on the banner falls the instant it leaves)
— plus **free friendly-only salvage** (owner recovers for 0; enemy can't). New `passUpgrade`
action + affordances (bot + demo) + demo pass UI. Test-first (`resolve-banner.test.ts` 8/8);
engine 279/279, server 8/8. Not yet in a prebuilt deck, so sim baselines are bit-identical —
balance gets measured when it's decked. commit `1c05640`.

## v0.1.2 — 2026-07-15
patch — demo decks (#94, Griff). Griff's own hand-curated lists are now the canonical
prebuilt decks: **Crimson Assault** = his 65-card red (was `griffs-red`), **Radiant Order** =
his 52-card yellow (was `griffs-yellow`). The stock auto-derived decks (every card in the
color, workhorses doubled) are deleted and the `griffs-*` slugs retired — sims now grade the
real decks under their names (crimson-assault vs radiant-order: red 43.5% / yellow 56.5%,
N=200). Roster is now 3 decks (+ Veiled Court). 271 tests green.

## v0.1.1 — 2026-07-15
patch — modal button help text (#93, Griff playtest). Binding Light (Weak / Cheap /
Overwhelm) and Containment Priest (Capture / Stand down) gained per-mode `text`, so the
demo's mode buttons now teach what each choice does — hover tooltip **and** the inline list,
matching Reckless Charge. The UI already rendered mode text; these two cards just had none.
Card data only; 271 tests green.

## v0.1.0 — 2026-07-15
Baseline. The yellow nerf pass — griffs-yellow **69.7% → 56.0%** vs griffs-red (N=300) —
plus the ±20 influence win band (decision 106, #91), divide-retaliation (decision 105, #84),
the yellow card folds (#85 Aura of Resolve, #88 Devout Intervention, #89 Radiant Judgment),
and the catalog `code:` field (#83). Shipped #81 #83 #84 #85 #88 #89 #91. commit `11cf1d6`,
271 tests green.
