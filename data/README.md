# data/

**The card pool lives in [`cards/`](cards/) — one markdown file per card** (decision 46).
Start at [`cards/README.md`](cards/README.md) for how to edit cards on GitHub, or
[`cards/INDEX.md`](cards/INDEX.md) for the full table.

The old single-file `cards.csv` (decision 45) is retired; its history is in git.

## For the builder / agent

```bash
npm run cards         # compile + validate the ledger → engine generated.json + INDEX.md
npm run cards:check   # validate only; fails if generated files are stale (the PR gate)
```

Nothing the designer writes in a card file can break a game: the build validates every card
against the engine's effect vocabulary and refuses with a readable error naming the card. Games
in progress keep the cards they started with regardless. The engine test suite (`ledger.test.ts`)
also fails if `generated.json` drifts from the card files, so a forgotten rebuild can't ship.
