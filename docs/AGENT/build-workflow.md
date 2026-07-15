# Build workflow

How work moves from "an idea in an issue" to "shipped in the demo." Designed to be
**simple enough to not have to remember**: a handful of GitHub labels, a release log, and
one decision tree. If you're copying this into another repo, this file is self-contained.

Ruled in #92 (Blaine + Fable, 2026-07-15). Two ideas carry it:
1. **The labels are the board** — Blaine's laptop runs the build, but the labels on GitHub
   mirror its state in real time, so the board never lies about what's cooking.
2. **The tier is the trigger** — how big a change is decides *who* may ship it and *when*.

## The labels

| Label | Kind | Meaning |
|-------|------|---------|
| `backlog` | state | Noted, not yet classified. Never ships. |
| `patch` | tier | One self-contained fix. **The agent ships it immediately** — applying the label *is* the go. |
| `minor` | tier | A batch worth shipping together. **Blaine or Griff** fire it with `build-now`. |
| `major` | tier | A tripwire (see below). **Blaine only** fires it with `build-now`. |
| `building` | state | A build is on it **right now** (transient). |
| `shipped` | terminal | Folded into a build; cross-refs its `RELEASES.md` line. Then the issue is closed. |
| `build-now` | flag | "Fire it now" for a `minor`/`major` item (patches don't need it). |
| `designer` | gate | Blocked on Griff's design call — not in the build pipeline until decided. |

An item wears **one** of `{backlog | patch | minor | major}` at a time (plus, briefly,
`building`, ending at `shipped`). The tier label *replaces* the old `queued` — assigning a
tier IS "classified and ready," so there's no separate queue label to keep true.

## Lifecycle

```
backlog ──classify──▶ patch│minor│major ──fire──▶ building ──ship──▶ shipped + close
 (noted)              (ready; tier = who fires)     (in flight)      (in RELEASES.md)
```

A clear patch skips `backlog` entirely — it's classified and shipped in one motion.

## The tier decides who ships, and when

| tier | one-line test | armed by | fired by | when |
|------|---------------|----------|----------|------|
| **patch** | one self-contained fix — a stat/number tweak, card wiring, copy fix, or bugfix-with-test; no rule/primitive change | agent or human | **agent, automatically** | on classification |
| **minor** | a batch (several cards/nerfs or a small feature) worth shipping together; no tripwire | agent or human | **Blaine or Griff** (`build-now`) | enough accrue |
| **major** | a **tripwire** — touches an engine primitive, `rules-v1.2.md`, or `DECISIONS.md`, or changes what a card *does* (new mechanic, keyword rework, combat change) | agent or human | **Blaine only** (`build-now`) | Blaine's call |

The asymmetry is the point: **patches flow with zero waiting; minor and major intentionally
wait for a human to say go** — so only the work you *want* eyes on waits.

**Classification test (in order):**
1. Is it a **tripwire**? → `major`. (Design routes to Fable first; see CLAUDE.md → Model routing.)
2. Else, is it **one contained thing**? → `patch`. (Agent ships it now.)
3. Else → `minor`. (A batch; waits for a human `build-now`.)

Because `major` == tripwire, the agent can only ever auto-ship genuinely contained work — a
tripwire always stops for Blaine and Fable. That boundary is what makes patch-autonomy safe.

## The trigger — `build-now`

Drop `build-now` on a `minor` or `major` item (patches never need it). On the next tick:

- **`build-now` on a `minor`** → build the whole `minor` batch.
- **`build-now` on a `major`** → build that one major. The tick first checks **who applied
  the flag** (`gh api repos/booherbg/2026-card-game/issues/{n}/events`, `labeled` event
  actor); if it wasn't Blaine, it holds and posts a Chronicler note. patch/minor run on trust.

Then the tick sets `building`, builds + tests (green first) + deploys, moves the item to
`shipped`, closes it, writes the `RELEASES.md` line, and **removes `build-now`**. The label
coming off is the receipt that the build ran — a comment can't be cleared, a label can.

## Shipped vs. deferred

- **Shipped** — the `shipped` label, then close. It cross-refs the build's `RELEASES.md` line.
- **Deferred / wontfix / duplicate** — **close as "not planned"** (`gh issue close --reason "not planned"`).
  GitHub renders that with a distinct icon.

At a glance: `shipped` present → folded into a build; closed with **no** `shipped` → dropped
for another reason. No separate `deferred` label needed.

## Who owns the next action — assignees

When an issue is waiting on a human, **assign it to that human** (Blaine or Griff) so the next
action is unambiguous (#91). `designer` marks *what kind* of wait (a Griff design call);
the assignee marks *who* is on the hook. An item with no assignee and a tier is the agent's to move.

## Standing rule — the agent labels incoming work

Every tick, the agent reads any newly-arrived or unlabeled issue/PR and applies `backlog` or a
tier per the classification test — and, if it's blocking on a human, assigns them. A patch it
can classify, it ships. A human may relabel anything at any time. Blaine's whole interface stays
two verbs: apply/leave a tier, and `build-now` to fire `minor`/`major`.

## Versioning & the release log — `RELEASES.md`

One greppable line per build, newest first, `v0.MINOR.PATCH`. While pre-1.0: a **patch** ship
bumps the patch digit, a **minor** batch bumps the minor digit; a **major** also bumps minor
pre-1.0 (v1.0.0 is reserved for launch). The line records the tier, the issues/PRs, decision
numbers, sim numbers, and the commit.

## Quick reference

```bash
gh issue list --label minor       # what's waiting on a build-now
gh issue list --label major       # tripwires awaiting Blaine
gh issue list --label building    # shipping right now
gh issue list --label backlog     # noted, not yet classified
gh issue list --label build-now   # a build is triggered
gh issue list --label shipped --state closed   # what's been folded
```

Blaine/Griff: a tier is set (by you or the agent) when something's clear enough to move; drop
`build-now` to fire a `minor`/`major`. Patches just go.
