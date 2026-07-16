# Build workflow

How work moves from "an idea in an issue" to "shipped in the demo." Designed to be
**simple enough to not have to remember**: two label axes, a scoping brief, a release log.
If you're copying this into another repo, this file is self-contained.

Ruled in #92 (Blaine + Fable, 2026-07-15). Three ideas carry it:
1. **The labels are the board** — Blaine's laptop runs the build, but the labels on GitHub
   mirror its state in real time, so the board never lies about what's cooking.
2. **Scope and approval are different questions** — how *big* a change is (`patch`/`minor`/
   `major`) is independent of whether it's *approved to build* (`queued`). A major can be
   fully scoped and never approved.
3. **The scope decides who fires it** — patch flows on its own; minor/major wait for a human.

## Two axes

Every live item wears **one scope tag + one lifecycle state**. They move independently.

**Axis 1 — Scope** (how big / who fires / which version bumps):

| Scope | one-line test | fired by |
|-------|---------------|----------|
| `patch` | one self-contained fix — a stat/number tweak, card wiring, copy fix, bugfix-with-test; no tripwire | **agent, automatically** |
| `minor` | a batch worth shipping together (several cards/nerfs or a small feature); no tripwire | **Blaine or Griff** (`build-now`) |
| `major` | a **tripwire** — engine primitive, `rules-v1.3.md`/`DECISIONS.md`, or changes what a card *does* | **Blaine only** (`build-now`) |

**Axis 2 — Lifecycle / approval** (where it is):

| State | Meaning |
|-------|---------|
| `backlog` | Noted, not yet scoped. |
| *(scope tag, no `queued`)* | **Scoped but unapproved** — where a `major` sits while Blaine weighs its scoping brief. |
| `queued` | **Approved and ready to build.** May park here, waiting to batch or for the right moment. |
| `building` | Transient — shipping right now. |
| `shipped` | Terminal (+ close); cross-refs its `RELEASES.md` line. |

Plus one flag — `build-now` — and the `designer` gate (blocked on Griff's design call).

## Classification test (scope)

In order: **tripwire? → `major`.** Else **one contained thing? → `patch`.** Else → `minor`.
Because `major` == tripwire, the agent can only ever auto-ship (patch) genuinely contained
work — a tripwire always stops for Blaine and Fable.

## Flow per tier

- **patch** — contained, so the agent **auto-approves and ships in one motion**. A patch is
  self-approving; it never waits in `queued`. (`patch` → `building` → `shipped`.)
- **minor** — agent/human scope-tags `minor` and posts the **scoping brief** → a **human adds
  `queued`** to approve → queued items accrue → **`build-now`** cuts a release of the queued set
  (Blaine or Griff, if no `major` is queued).
- **major** — scope-tags `major` + scoping brief → **Blaine adds `queued`** to approve → the
  next release including it is **Blaine's to fire**. A major too complicated to be worth it
  simply never gets `queued` — scoped and on record, but unbuilt.

## The trigger — `build-now` cuts a release

`queued` and `build-now` are distinct: **`queued` = approved and in the ready pool** (it can
park there); **`build-now` = cut the release now.** So Blaine can approve-and-park, then pull
the trigger whenever.

**A release is the whole `queued` set, batched** — every approved-and-ready item built +
tested + deployed in one pass (efficiency), and **only** what's `queued` (an un-ready feature
that's still being discussed stays out of `queued`, so it never rides — build A and B, hold C).
This is the standard release-lifecycle shape (#92): `queued` is the release candidate list.

**Authority to fire a release** follows the highest scope in the `queued` set:
- queued set is **`minor`s only** → **Blaine or Griff** may drop `build-now`.
- queued set **includes a `major`** → **Blaine only**; the tick verifies the `build-now`
  actor (`gh api repos/booherbg/2026-card-game/issues/{n}/events`, `labeled`) and holds +
  posts a note if it wasn't Blaine. (To ship minors *without* a ready major, just don't
  `queue` the major yet.)

`patch` is the fast lane — it self-approves and ships on sight, never waiting for a release.

The tick sets `building` on the batch, builds + tests (green first) + deploys, moves each item
to `shipped`, closes it, writes the `RELEASES.md` line (version bumped by the highest scope in
the batch), and **removes `build-now`**. The label coming off is the receipt that the build ran.

## Scoping brief — every `minor` and `major` (#92)

When an item is scope-tagged `minor` or `major`, the agent posts a **scoping brief** on the
thread — the decision-support to weigh *approve (queue) or defer*:

- **Effort report** — what it touches, how big, what rides on existing machinery vs. new. Name
  the one or two real pieces; don't pad.
- **Side effects / impacts** — rule consequences, new interactions, balance risk, doors it opens.

`patch` needs no brief — it just ships. The brief is the input to the `queued` (approval)
decision. The [PR #86 scoping comment](https://github.com/booherbg/2026-card-game/pull/86) is
the template.

## Shipped vs. deferred

- **Shipped** — the `shipped` label, then close. Cross-refs the build's `RELEASES.md` line.
- **Deferred / wontfix / duplicate** — **close as "not planned"** (`gh issue close --reason "not planned"`).

`shipped` present → folded into a build; closed with **no** `shipped` → dropped for another reason.

## Who owns the next action — assignees

When an issue is waiting on a human, **assign it to that human** (Blaine or Griff) so the next
action is unambiguous (#91). `designer` marks *what kind* of wait; the assignee marks *who*.

## Standing rule — the agent labels incoming work

Every tick, the agent reads any newly-arrived or unlabeled issue/PR and applies `backlog` or a
scope tag per the classification test — and, if it's blocking on a human, assigns them. A
`patch` it can classify, it ships; a `minor`/`major` gets its scoping brief posted (approval is
then a human's `queued`). A human may relabel anything at any time.

## Versioning & the release log — `RELEASES.md`

One greppable line per build, newest first, `v0.MINOR.PATCH`, keyed to scope: a **patch** bumps
patch, a **minor** batch bumps minor; while pre-1.0 a **major** also bumps minor — **v1.0.0 is
reserved for launch**. Each line names the scope, the issues/PRs, decision numbers, sim numbers,
and the commit.

## Quick reference

```bash
gh issue list --label queued              # the release candidate set (what build-now ships)
gh issue list --label major               # tripwires (scoped; a queued one makes the release Blaine's)
gh issue list --label building            # shipping right now
gh issue list --label build-now           # a release is triggered
gh issue list --label shipped --state closed   # what's been folded
```

Blaine/Griff: scope-tag sets who fires + the version bump; add **`queued`** to approve into the
next release; drop **`build-now`** to cut it. Patches just go.
