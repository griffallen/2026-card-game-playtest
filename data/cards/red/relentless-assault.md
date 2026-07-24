---
name: Relentless Assault
type: action
cost: 6
pips: red, red
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"friendly","count":12,"upTo":true,"mustBeExhausted":true}],"onPlay":[{"op":"ready","side":"friendly","t":"chosenAll","remember":"readiedUnits"},{"op":"damage","t":"selfBase","n":1,"per":{"count":"readiedUnits"}}]}
---
Ready any number of your exhausted units. Lose 1 Life for each unit readied.

## Design notes

Session 006: retexted from "take an extra combat phase" (a phase that no longer exists — decision 40 dissolved the phase ladder). The effect was already ready-all; now the card says so.
