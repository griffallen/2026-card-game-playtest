# Card Database — the designer's editing surface

**`cards.csv` is the whole card pool in one editable file.** Open it right here on GitHub (it renders
as a table, and the pencil icon edits it in the browser), or in Google Sheets/Excel/Numbers — just keep
it CSV when you save.

## Columns you'll edit freely

| Column | What it does |
|---|---|
| `name`, `text` | What players see. Text is display-only — the engine plays the *structured* effects, so fix wording fearlessly. |
| `cost`, `power`, `health` | The numbers. Power/health blank for actions/upgrades. |
| `keywords` | Plain list: `rush, breakthrough 2, guard`. Valid: guard, armor N, rush, ranged, reach, flying, breakthrough N, overextend N, cantAttack, untargetable. |
| `influenceTrigger` | **Your no-passive-influence dial** — when this card's influence effect pays: `onDefend`, `onKill`, `onAttack`, or `onPlay`. |
| `designerNote` | Shows as the ⚑ note on the card in-game. |

`effectsJson` holds the structural layer (targets, triggers, auras). Editable if you're feeling brave,
but numeric/keyword/trigger changes above cover most tuning — leave it alone otherwise.

## The safety net

Nothing you write here can break a game. The import step validates every row against the engine's
effect vocabulary and **refuses the whole file with a readable error** ("searing-bolt: unknown keyword
'lifelink'") rather than accept a card it can't execute. Games in progress keep the cards they started
with regardless.

## Sync (Blaine or the agent runs these)

```bash
npx tsx scripts/cards-import.ts --check   # validate only
npx tsx scripts/cards-import.ts           # apply → engine picks it up; rerun tests/sim; redeploy demo
npx tsx scripts/cards-export.ts           # regenerate the CSV from the engine (after code-side card work)
```
