---
name: Execution Swing
type: action
cost: 4
status: canon
# effects is agent-maintained: ask for changes in the PR, do not hand-edit
effects: {"targets":[{"t":"unit","side":"any","mustBeDamaged":true}],"onPlay":[{"op":"destroy","t":"chosen0"}]}
---
Destroy target damaged unit.

## Design notes

Session 006: 6 mana → 4. Legal under the red charter as the "finish the fight" execute — it requires combat to have happened first (damaged-only); red still never gets unconditional destroy.
