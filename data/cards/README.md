# The Card Ledger — how to edit cards

Every card in the game is one file in this folder: `red/`, `yellow/`, and `purple/` (a proposal deck awaiting adoption), one `.md` file per card.
**These files are the real cards** — the game engine is built from them. Change a file, and once
it's merged, every new game uses your version.

[**INDEX.md**](INDEX.md) is the full table of every card (generated — don't edit it directly).

## Anatomy of a card file

```markdown
---
name: Cinder Initiate          ← yours
type: unit                     ← unit | action | upgrade
cost: 1                        ← yours
power: 1                       ← yours (units only)
health: 1                      ← yours (units only)
keywords: rush, overextend 1   ← yours (comma-separated; numbers after the word)
status: draft                  ← the agent flips this to "canon" when the card passes review
effects: {...}                 ← agent-maintained — ask for changes, don't hand-edit
---
Rush. Overextend 1.            ← the card's printed text — yours

## Design notes

Anything you want to remember or tell the agent about this card.
```

**Your fields:** `name`, `cost`, `power`, `health`, `keywords`, the card text, and Design notes.
Also `influenceTrigger` (`onPlay` / `onDefend` / `onKill` / `onAttack`) — the dial for *when* a
card's Influence is earned.

**Agent fields:** `effects` (the machine-readable version of the card text) and `status`. If you
change what a card *does* — not just its numbers — say so in plain words (in Design notes or the
pull request) and the agent updates `effects` to match.

## How to edit (on github.com — no tools needed)

1. Open the card's file, click the **pencil** (Edit).
2. Make your change.
3. At "Commit changes", pick **"Create a new branch and start a pull request"** — never commit
   straight to `main`.
4. In the PR description, say what you changed and why (one sentence is fine).

That's it. The agent reviews every card PR with three questions:

1. **Valid?** — the machine check (`npm run cards:check`). A typo can't break the game; it gets
   caught here with a readable message naming your card.
2. **Consistent?** — does the printed text match what the card actually does?
3. **In-charter?** — does the card obey its color's laws
   ([red charter](../../docs/canon/decks/red.md) · [yellow charter](../../docs/canon/decks/yellow.md) · [purple charter](../../docs/canon/decks/purple.md))?

Then the agent fixes up `effects` if needed, and merges. **Feel and balance stay yours** — the
agent never rejects a card for being too strong, only for being broken, dishonest, or off-color.

## Renaming a card — the file is its identity

A card's **filename** is its permanent identity: the deck lists, the engine, the game log, and
every test refer to a card by its file (`yellow/subjugate.md` → `subjugate`). Its **`name:` line
is just the printed title** — the words on the card face — and the two don't have to match.

So **retitling a card is a one-line edit to `name:`, and it breaks nothing**: change "Subjugate"
to "Shackles" on that line and every deck that still lists `subjugate` keeps working, untouched.
The one move to **avoid is renaming the _file_** — that's the only thing that would break
references, and there's never a reason to: the file is a stable id, not the card's name.
Re-theme the title as freely as you like; leave the filename alone.

(A card can also carry an optional catalog code — an `AZ###` set/color/number — tracked in issue
#83 as a possible `code:` field, deliberately kept *separate* from the filename for this reason.)

## Asking for a redesign — or anything bigger

Don't fight the format — just write intent. Two channels, both dead simple:

- **A pull request** when you know the concrete change (edit the file, PR it).
- **A GitHub issue** when you have an idea, a complaint, or a feel note — *"Prison Warrant should
  punish the jailer harder — something like double decay"* or *"red feels unstoppable after round
  6"*. New issue → type it → submit. No format required.

Blaine and the agent pick up both at the start of every session (`gh pr list` / `gh issue list`),
respond on the thread, and fold accepted changes into the canon. The why gets logged in
[`DECISIONS.md`](../../docs/DESIGN/DECISIONS.md).

## The rules this all hangs from

- [`docs/GAME-FLOW.md`](../../docs/GAME-FLOW.md) — how the game plays, designer-friendly.
- [`docs/canon/CANON.md`](../../docs/canon/CANON.md) — the current locked baseline + open questions.
