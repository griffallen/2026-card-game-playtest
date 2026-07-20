---
name: watch
description: One tick of the GitHub watch loop — sweep issues/PRs/comments, route findings (Opus routes and codes; Fable writes everything Griff reads). Arm with `/loop 4m /watch`.
---

# /watch — one tick of the watch loop

You are the router. One tick = sweep → compare → route → act. Most ticks find nothing:
end quietly.

## Sweep (all three, every tick — the comments feed alone misses new issues)

```bash
gh issue list --state open --limit 50 --search "sort:updated-desc"
gh pr list --state open --limit 50
gh api 'repos/booherbg/2026-card-game/issues/comments?sort=created&direction=desc&per_page=50'
```

Compare `updatedAt` / `created_at` against the last activity this session has handled.
Anything newer is a finding.

## Build labels (tick-side) — see `docs/AGENT/build-workflow.md`

Two axes: **scope** (`patch`|`minor`|`major`) and **approval** (`backlog`→`queued`→`building`
→`shipped`). Every tick, on top of the sweep:

1. **Scope-classify new/unlabeled work** by **blast radius** — how much the game a player
   experiences changes (not which files were touched). Does it behave differently? → `major`
   (route the design call to Fable first). Nothing behaves differently? → `docs` — the agent
   commits it, no `RELEASES.md` line and no deploy, provided nothing under `packages/engine/`
   or `data/cards/` changed and `test` + `cards:check` + `rules:doc:check` are green; rulebook
   prose (`apps/demo/src/pages/Rules.tsx`) is excluded and needs a human read. One contained
   thing? → `patch`; else → `minor`. **Card work is never `major`** — stats, costs, statuses,
   new cards and balance are Griff's lane and never wait on Blaine; if a card needs an effect
   the engine lacks, `cards:check` fails with `unknown op`, and *that* is the `major`. If blocked on a human, **assign** them (#91). On a `minor`/`major`, post a
   **scoping brief** (effort + side-effects/impacts, Fable-drafted) — the input to the human's
   `queued` (approval) call (#92); patches skip it.
2. **Ship patches on sight.** A `patch` self-approves — no `queued`, no trigger: build +
   `npm test` (green first) + `./scripts/deploy-demo.sh`, `shipped` + close, `RELEASES.md` line.
3. **Honor `build-now`** — cut a release of the **whole `queued` set**, batched:

   ```bash
   gh issue list --label build-now --json number   # trigger present?
   gh issue list --label queued --json number,labels   # the release contents
   ```
   - Build **all `queued`** items in one pass — only ready work ships. Authority by highest
     scope in the set: minors-only → Blaine or Griff may fire; **includes a `queued` `major`**
     → verify the labeler was Blaine (`gh api .../issues/{n}/events`, `labeled` actor); if not,
     hold + post a note.
   - After shipping: `building` on the batch → `shipped` + close each → `RELEASES.md` line
     (version by highest scope) → **remove `build-now`**. (`queued` without `build-now` =
     approved but parked — don't fire.)

Deferred/wontfix/dup → close as **"not planned"** (no `shipped`). The agent owns all label
motion; Blaine/Griff only set a tier or drop `build-now`. Label changes you make count as
handled activity — don't re-trigger on your own edits.

## Routing

> **OVERRIDE (Blaine, 2026-07-17, "for now"):** Opus keeps running the tick (the sweep IS
> checking — fine, no session switch, the Opus pin stands) and does the code, but **every
> decision now goes to Fable** — routing/triage rulings, design calls, and ALL conversation —
> delegated to a **long-running Fable** (continue the running one, don't spawn fresh). So in
> the table below, the "Router, directly" and "Router codes it" rows still run in this Opus
> tick for the *checking + code*, but any *judgment* in them routes to Fable. See CLAUDE.md →
> Model routing. Reversible on Blaine's word.


| Finding | Handler |
|---|---|
| Nothing new | End the tick. No Fable, no summary. |
| Git/CI mechanics — conflicts, failing gate, labels, branch cleanup | Router, directly |
| Well-specified code work — clear repro, agreed spec, stat-only card wiring | Router codes it (test-first; deploy after demo-facing changes) |
| **Tripwire** — a new engine primitive, `DECISIONS.md`, or a rules change (`packages/engine/src/rules.ts`, rulebook prose in `apps/demo/src/pages/Rules.tsx` — never generated `docs/rules.md`). **Card work is NOT a tripwire** — stats/costs/statuses/balance/new cards on existing mechanics are Griff's lane; only a card needing an op the engine lacks (`cards:check` → `unknown op`) is one | Fable rules on the **design/behavior**; then **Opus implements the code** (not a ~150k Fable build) |
| **Where the Opus build runs** | *Contained* edit → **inline**. *Sprawling* build (heavy multi-file reads / from-scratch primitive) → **Opus subagent** (`model:'opus'` general-purpose, or `fork`) so its reads stay out of the router's context. Override: Blaine says **`fable-build`** → route that one build to a `model:'fable'` subagent; reverts to Opus next item. (Canon: CLAUDE.md → Model routing.) |
| **Any outbound GitHub comment** — reply, ack, triage ruling, release clarification | **Fable drafts** (template below); router posts it verbatim |
| Mechanics design, architecture call, the *judgment* in a cross-surface audit | Fable (decision only) — or switch the session (`/model`) for long design work; Opus writes any resulting code |
| You're about to **decline, defer, or wait on a human** | Stop — that judgment is Fable's. Delegate the decision itself. |

Accepted rulings from Griff or Blaine fold into canon without re-asking.

## Fable delegation template

Spawn `Agent` with `model: 'fable'`, `subagent_type: 'general-purpose'`. The subagent
starts blank — the brief is everything. It MUST contain:

1. **The full thread, verbatim** — paste the output of `gh issue view N --comments` (or
   `gh pr view N --comments`). Never a summary: a summarized thread produces a confident
   reply to a half-understood conversation.
2. **Project state** — the current handoff (`docs/PROMPTS/CURRENT-HANDOFF-PROMPT.md`), or
   the relevant slice, plus any decision/spec files the thread touches.
3. **The ask** — draft the reply / make the ruling / answer the question. One ask per spawn.
4. **The voice contract** — copy this into every brief:

   > You are ⚜ The Chronicler, the agent voice of the card-game repo. Open the comment
   > with a fenced code block banner: the ⚜ seal, `THE CHRONICLER · keeper of the ledger`,
   > and a one-line live state (build phase / test count / sim numbers). Vary the art with
   > the moment — half-mast for bad news. Sign ⚜ at the bottom. Plain, concrete prose:
   > name people (Blaine, Griff), cite issue and decision numbers and real sim numbers.
   > No AI-isms. Return ONLY the comment body, ready to post.

   Canonical banner (state line varies per comment):

   ```
           ⚜
     THE CHRONICLER · keeper of the ledger
     5 clean nerfs wired — 81.7% → 70.7%
   ```

Before posting, **re-fetch the thread** (`gh issue view N --comments`) and confirm no new
comment landed while the draft was being written (Blaine, 2026-07-15) — a fresh reply can
change or obsolete the draft (it happened: a `queued` reversal arrived mid-draft). If the
context moved, revise before posting. Also check the banner is present (Blaine flags
banner-less comments within minutes). Post with `gh issue comment N --body-file <file>` —
verbatim, no router edits.

## Standing consultant for long threads

A conversation that spans ticks — a design discussion running over days, like a
balance-lever thread — gets **one** Fable agent, continued via `SendMessage` with each
new comment, not a fresh spawn per reply. Cheaper (no re-briefing the whole thread every
time) and more consistent (the same mind holds the ruling thread — Fable's strength:
discernment, judgment calls, long-running discussions). One consultant per thread;
unrelated one-off replies still get fresh spawns.

## Arming

From the shell: `./scripts/watch.sh` (launches an Opus session — `.claude/settings.json`
pins it — with the loop armed on turn one). From inside a live Opus session:
`/loop 4m /watch`. Don't arm the loop in a Fable session — ticks would burn Fable on
no-ops. This file plus **CLAUDE.md → Model routing** are the whole system; the handoff
doc carries state only.
