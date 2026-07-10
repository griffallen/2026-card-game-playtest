# V3 Direction — Griff's rules feedback (2026-07-08, via issue #9)

**Status:** design input received and acknowledged; **blocked on the numbered questions in
[issue #9](https://github.com/booherbg/2026-card-game/issues/9)** before spec work. Canon-v1.0
(rules v2.3) stays the playable baseline until v3.0 lands as its own versioned canon.

This is the designer's first full rules pass over the prototype — it overrules several ⚑ rulings,
which is the system working as designed. Nothing below ships until it goes through the mini
design → spec loop (CLAUDE.md), but the parse and impact analysis are done.

## The changes, classified

### Confirmations (engine already behaves this way)
- **Ranged** takes retaliation on same-zone attacks (only cross-zone shots are counter-free). ✅
- Round-1 "skip ready/resource" — rules-text clarification only.

### Removals
| What | Blast radius |
|---|---|
| **Prison** (mechanic + keyword) | ~15 yellow cards redesign; §1.11 deleted; decay/release/`imprisonWatcher` machinery retired. Resolves decisions 16/37/53. Partial successor: **Capture**. |
| **Overextend** | Red's 7 gamble units + the attack-declaration UI; decision 35 retired. Likely successor for red's identity: **Scar**. |
| **Flying** | Light's Vanguard (yellow), 5 purple cards, `moveUnit` text. Overrules decision 48. |
| **Reach** | Blaze Juggernaut. |
| **Untargetable** | Chain of Law (yellow), 3 purple cards → mostly convert to **Hidden**. |

### The three big builds
1. **Colored resource pips** — costs carry 0..N colored pips; pips demand matching-color
   resources, the remainder is generic; multi-pip cards pay as any one of their colors.
   Ends decision 18's "every resource is worth 1" era. Open: Q1 what makes a resource a color,
   Q2 multi-pip spend semantics, Q3 pips as a designer-edited card field.
2. **Blocker-pairing combat** — attacker declares a group at a zone; defender assigns blockers
   (1v1 or multi); paired simultaneous resolution. Replaces v2's combined-hit + intercept
   (decision 42) and changes Guard's meaning again. Open: Q4 unblocked attackers outside enemy
   Home, Q5 multi-block damage assignment, Q6 new-Breakthrough spill target choice.
3. **New keyword suite** — **Hidden** (while ready: untargetable + unattackable), **Sneak**
   (exhaust-activated, same-zone, per-card effect — this finally builds §1.9's deferred activated
   abilities), **Capture** (captive hides under capturer until it readies/dies; owner may decline
   readying the capturer), **Infiltrate** (deploy to any zone), **Shielded** (one-hit shield
   token), **Scar** (+1 power per damage marked on it). Open: Q7 Hidden-vs-blocking + the
   attack-reveals rhythm, Q8 Sneak as per-card payload, Q9 captive's ready-state on release.

## Engine impact sketch (for the build-plan session)

- **Pips:** `CardDef.pips?: Color[]`; resource rows gain a color; `playCard` payment validation;
  bank UI shows color. Medium.
- **Blocking combat:** replaces the intercept window with a block-assignment response action
  (same paired-action pattern as `attackDeclared → interceptResponse`, so the event-log shape
  survives). Counter-assignment/armor-per-attack params retire. Large but well-precedented.
- **Keywords:** Hidden = targeting filter + attack-eligibility check keyed on `exhausted`;
  Shielded = a token cleared on first damage; Scar = power derivation from `damage`; Infiltrate =
  deploy-zone choice; Capture = unit-attached containment (much of prison's bookkeeping shape,
  attached to a body); Sneak = the `activate` action §1.9 reserved. All engine-shaped already.
- **Cards:** full pool re-churn against the new keyword set once the spec lands — red leans Scar,
  yellow leans Capture/Shielded, purple (if adopted) converts flying/untargetable → Hidden/
  Infiltrate/Sneak.

## Process note

Sequence when questions come back: DECISIONS entries (57+) → game-rules **v3.0** spec →
build plan → implement behind the same determinism/test discipline → card re-churn →
canon-v2.0 stamp. Old rules versions remain playable for A/B (the whole point of versioned
canons).
