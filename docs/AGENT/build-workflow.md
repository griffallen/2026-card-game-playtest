# Build workflow

How work moves from "an idea in an issue" to "shipped in the demo." Designed to be
**simple enough to not have to remember** — the whole system is four GitHub labels and
one release log. If you're copying this into another repo, this file is self-contained.

Ruled in #92 (Blaine + Fable, 2026-07-15). The principle: **the labels are the board.**
Blaine's laptop runs the build, but the labels on GitHub mirror its state in real time, so
the board is never lying about what's cooking.

## The board — four labels

Every open issue/PR wears **at most one** state label, plus an optional flag:

| Label | Kind | Meaning |
|-------|------|---------|
| `backlog` | state | Noted, not yet locked. **Never ships.** |
| `queued` | state | Locked + ready. Goes in the next build batch. |
| `building` | state | A build is on it **right now**. |
| `build-now` | flag | "Run the batch now." Set it; the next tick clears it. |

Closed = shipped. There is no `shipped` label — closing the issue is the signal.

**Who moves what.** The Chronicler (the agent) owns all state motion — `backlog` →
`queued` → `building` → closed — and clears `build-now`. **Blaine's entire interface is two
verbs:**

- add **`queued`** — lock this into the next batch
- add **`build-now`** — run the batch now

Everything else is the agent's bookkeeping.

## The trigger — `build-now`

Drop `build-now` on **any** open issue (two clicks in the label sidebar — #92 is the
natural habit-home, but the agent sweeps by label, `gh issue list --label build-now`, so it
doesn't matter which issue). On the next watch tick the agent:

1. Sweeps everything labelled `queued`.
2. Builds + tests it in one orchestrated pass (`npm test` green before anything ships).
3. Deploys the demo (`./scripts/deploy-demo.sh`).
4. Writes the release line in `RELEASES.md` and bumps the version.
5. Closes the shipped issues and **removes `build-now`.**

**The label coming off is your receipt** that the build ran. That's why it's a label and not
a `/build` comment: a comment just sits there after it's handled, so you can never tell at a
glance whether it was — the label's presence or absence is always the truth.

Edge cases:
- **`build-now` with an empty queue** → the tick removes the label and posts one line saying
  the queue was empty. No silent no-op.
- **Ship one card alone, ahead of everything** → label just it `queued` and drop `build-now`.
  A batch of one. The two primitives compose; there's never a third mechanism.
- **`build-now` never touches `backlog`.** Unlocked designs don't ship.

### Not a GitHub Action

The build runs inside the agent session on Blaine's laptop, **not** in CI — there's no Opus
in a GitHub runner. An Action could only relay a label Blaine can set himself in two clicks:
indirection with a YAML file to maintain and zero payoff. (Actions *are* legitimate for
CI-native work — running the engine tests on Griff's card PRs, say. Different question; don't
conflate a build trigger with CI.)

## Build tiers — the version, not a label

Tier is a judgment made at **ship time** and recorded in the `RELEASES.md` line — never a
label to keep true. Semantic versioning, `v0.MINOR.PATCH`:

| Tier | What it is | Example |
|------|-----------|---------|
| **major** | a mechanic or rules change | a combat rework, a new keyword, a rules-version bump |
| **minor** | a nightly batch | everything `queued`, shipped together |
| **patch** | a self-contained quick fix | a stat tweak, a single card wiring, a demo bug |

A **patch** can skip the batch: if it's contained and green, the agent builds + ships it
inline and bumps the patch number. `minor` is the orchestrated `queued` batch. `major` gets
its own build and usually its own design pass first (see CLAUDE.md → the loop).

## The release log — `RELEASES.md`

One greppable line per build, newest first:

```
## v0.MINOR.PATCH — YYYY-MM-DD
<one line: what shipped, issue/PR refs, decision numbers, sim numbers, commit hash>
```

Kept a separate file (not folded into the Chronicle/Journal) — different audience, different
voice: the Journal tells the story, `RELEASES.md` is the changelog. The README surfaces the
latest line.

## Quick reference

```bash
gh issue list --label queued      # what the next batch holds
gh issue list --label building    # what's shipping right now
gh issue list --label build-now   # is a build triggered?
gh issue list --label backlog     # noted but not locked
```

Blaine: `queued` to lock, `build-now` to fire. That's the whole interface.
