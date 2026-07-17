# Releases

One line per build, newest first. Versioning `v0.MINOR.PATCH`, keyed to the build tier: a
**patch** bumps the patch digit, a **minor** batch bumps the minor digit; while pre-1.0 a
**major** (a mechanic/rules change) also bumps minor — **v1.0.0 is reserved for launch**. Each
line names the tier, the issues/PRs, decision numbers, sim numbers, and the commit.
See [`docs/AGENT/build-workflow.md`](docs/AGENT/build-workflow.md).

Release tracking began 2026-07-15 (#92); earlier demo builds predate the ledger.

## v0.6.0 — 2026-07-17
major — **the balance pass + Rush rework, cut as one build-now batch** (#104, #107, #105;
Blaine fired). Two card-balance passes and one keyword rework, shipped across the session and
released together.
- **#104 (yellow):** the Politician keyword reworked to pay marching, not sitting — at round
  end each Politician you control pays +1 Influence on a Neutral majority and +2 on an enemy-
  Home majority, stacking; Lawbringer's arrest became a player-choice target on play and every
  march; plus the earlier clean yellow nerfs (griffs-yellow 81.7% → 70.7% vs red). One reading
  stays open on the thread (Politicians count anywhere vs. must stand in the zone) — live on
  "anywhere," a one-line flip if Griff picks the other.
- **#107 (red):** the red balance pass — Worldrender gains Rush and pierces Shield + Armor in
  combat; Last Stand's no-exhaust pact; the pass's card changes shipped earlier at 351 green.
- **#105 (Rush rework):** Rush is now a **static** ability like Guard — a unit with Rush makes
  its **first move each round** for free (one zone, no exhaust), refreshing every round it
  stays in play, instead of only the entry round. No extra action, never covers attack
  (`rushCoversAttack` stays false). Engine change is dropping the entry-round gate from the
  rush-free-move check; decision 41 marked SUPERSEDED. Test-first (`rush.test.ts`, 8 tests,
  red→green) and a full cross-surface audit (issue #25): rulebook Keywords list alphabetized
  per Griff, gloss / help panel / unit chip / spec `rules-v1.3.md` all updated, audit clean.
365 engine tests green, typecheck 4 workspaces clean, cards:check 120 valid, playability gate
passed. Rush-rework commit `2c3996d`; balance-pass cards shipped earlier in the session.
Deployed.

## v0.5.0 — 2026-07-16
minor — **combat transparency preview** (#108, Blaine). Combat is deterministic — no dice — so
the demo now shows the exact unblocked math the moment you pick attacker(s), before you commit.
A compact "Combat preview — if unblocked" panel lays out, per reachable target: the Power you
send, what lands through the target's known Armor/Shield, whether the target falls, the counter
it strikes back with (retaliation-always), and which of your own units die to it — plus a
Breakthrough note and an honest footer that the opponent may still block or Guard after you
strike. New `predict.ts` mirrors the engine's `resolveBlockedAttack` unblocked path exactly
(divided retaliation, highest-Power-first, armor/shield, per-attacker fall detection) +
`CombatPreview.tsx`, wired into the attack-selection UI and gated to the duel-law combat model.
The point (design philosophy §3): win on shared information, never lose to a miscalculation the
game already knows. **No engine change** — it reads only known state. 279 engine + 18 demo tests
green (10 new prediction tests); playability gate passed. Deployed.

## v0.4.0 — 2026-07-16
minor — **deck explorer filters + mobile workshop preview** (#101, #102, Blaine fired the
batch). Two demo-only UX fixes shipped together:
- **#102 (Griff): the Deck Explorer filters now mean what they look like.** The old buttons
  were labeled by prebuilt deck (Crimson Assault / Radiant Order / Veiled Court) but styled
  as color dots, which sent Griff hunting for yellow cards that simply aren't in a given
  decklist. Now the prebuilt-deck picker is a **dropdown**, and **color / cost / type** are
  true **multi-select toggle** filters — tap red + yellow, or costs 0·1·2·3, and see every
  card matching any of them (OR within a group, AND across groups). Plain tap-toggle, no
  Ctrl, so it works on touch; cost buttons are generated from the costs actually in the
  catalog, not a hardcoded range.
- **#101 (Blaine): the deck workshop previews on mobile.** On phones the panels stack and the
  live preview sat far below the pool — every "what does this card do?" cost a scroll. Now
  tapping a card in the pool pops its preview in a bottom sheet without losing your place in
  the list. Desktop's two-column layout (pool left, sticky preview right) is untouched — the
  whole mobile path is gated under `lg:`.
Demo-only, no engine/card/rules touch. Demo build clean, 8/8 demo tests green, playability
gate passed (121 art loaded, 0 broken, page errors none). Deployed to the live demo.

## v0.3.0 — 2026-07-16
minor — **combat teaching pass** (#100, Blaine): combat is now legible. A plain-language
"Combat — who takes what" section in the help panel teaches the duel law (everything hits back,
always; Armor shaves, Shield eats a whole hit, Guard blocks the door, Breakthrough spills to
base; the base never counters). And the combat recap now **narrates each trade** — e.g.
`Berserker (3) ↔ Radiant Citadel (5): dealt 3, took 5 — Berserker falls` — reconstructed from
the engine's own Power + damage numbers (armor/shields stay exact), with a safe fallback to the
raw recap. New `recap.ts` + 8 tests (vitest wired into the demo). **No engine change** — the
combat design is unchanged; we taught it. Rode along: **4 yellow unit arts** (Light's Vanguard,
Radiant Citadel, Archon of Order, Champion of the Faith). 279 engine + 8 demo tests green.

## v0.2.4 — 2026-07-16
patch — **yellow upgrade art re-skin** (#5, Griff). The five yellow upgrades in the deck get
their storybook art (Griff confirmed the matches): Iron Discipline, Oath of Order, Disciplined
Mind, Subjugate, Unshakable Wall — cropped from Griff's 5-panel sheet and wired into their art
slots. Yellow's deck cards are now nearly dressed (6 actions + 5 upgrades); Chain of Law and
Resolve Banner still await art. Demo-only.

## v0.2.3 — 2026-07-16
patch — **first yellow art re-skin** (#5, Griff). The six yellow action cards get illustrated,
storybook-illuminated art from Griff's sheet — Binding Light, Imprisonment Chamber, Prison
Warrant, Prison of Light, Disarming Order, Supreme Sentence — cropped from the 2×3 sheet and
wired into their art slots (`apps/web/public/cards/`, shared into the demo). Matching confirmed
by Griff. The re-skin the rest of the game will follow. Demo-only.

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
