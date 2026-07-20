# Yellow Deck Charter

*One of the card pool's two parents: every yellow card must obey this charter **and** the base
rules (`docs/rules.md`). A card that breaks a law here is a review-blocker.*

## Identity

**Yellow is order made inevitable.** It wins by refusing to lose — Guards that block for free,
laws that take threats into custody, and a shared Influence track that ticks toward yellow every
time its defense *does something*. Yellow has two win axes: outlast red's aggression and win on
Life late, or convert a long game into an **Influence** victory. Yellow's weakness is tempo: it
must actually contest the board, not just sit.

## Keywords yellow may print

| Keyword | What it means for yellow | Limits |
|---|---|---|
| **Guard** (9 cards) | The signature. Under the duel law a lone attacker on a unit can *only* be blocked by a Guard — and Guards never exhaust to block. | Yellow-only. Guards get *paid* for stepping in (onDefend Influence), never for existing. |
| **Tribune** (7 cards) | Sways the track just by taking the field: ±1 Influence on every enter/leave of play (cause-blind, nets to zero over a life). Plus a constituency: round-end Influence for holding a zone majority (+1 Neutral, +2 enemy Home, stacking). | Yellow's influence engine. Shared with purple; forbidden to red. |
| **cantAttack** (4 cards) | Pure walls — statlines no attacker enjoys hitting. | Yellow-only. The statline discount pays for the passivity. |
| **Capture** (3 cards) | Custody, not a wound: the captive leaves the board and returns only when the capturer does (decision 92). | Yellow's signature control. Prison's successor. |
| **Armor N** (3 cards) | Every hit shrunk by N, per pairing. | Keep it defensive; big N on a cheap body is a design smell. |
| **Shielded** (2 cards) | Arrives with a token that eats one whole hit. | Rare; premium. |

**Forbidden:** Rush, Breakthrough, Scar, Hidden, Infiltrate, Sneak. Yellow never spends blood
for tempo and never fights from the shadows — it stands in the open and is paid for it.

*Retired:* the **prison** package — cut whole on issue #3 and succeeded by Capture. No yellow card
imprisons, releases, or decays a prison; those words are gone from the game.

## Invariants (the design laws)

1. **Influence is event-earned, never passive income** (decision 34). Payout scale: vanilla walls
   earn 1; the dedicated influence engines (Justicar Enforcer, Custodian of Law, Dawnspear Paladin,
   Gateward Colossus, Chamber) earn 2. Legal triggers: onDefend,
   onKill, onAttack, onPlay. **startOfRound / endOfRound Influence income is charter-illegal** —
   the track moves because something *happened*, not because a card exists. (Aura of Resolve was
   redesigned under this law, session 006.)
2. **Defense gets paid.** The onDefend trigger is yellow's economy: intercepting or being attacked
   is when guard units earn. A guard with no onDefend payoff needs a reason.
3. **No dead thresholds** (decision 50): no card may reference an Influence value at or beyond the
   win threshold.
4. **Yellow's removal is conditional, never efficient.** Capture (custody — the unit comes back
   when the capturer falls), destroy-if-damaged, power-capped effects. Clean unconditional
   "destroy target unit" or efficient direct burn is red-shaped and forbidden.
5. **Yellow heals** — units and base. It's the only current color that may.

## Curve & size (the standard base set)

- **48 uniques** (21 units / 20 actions / 7 upgrades), one copy each = the *Radiant Order* deck.
- Cost histogram: `1:4 2:5 3:7 4:8 5:8 6:8 7:7 8:1` — midrange bulge; yellow's early game is
  survival, its late game is the payoff.
- **Statline grammar:** Power + Health = **2 × cost**, ±1, with **Health ≥ Power** on most units —
  yellow outlasts. Heavy statics/triggers tax the statline hard at high cost (Hierophant 2/6-for-6,
  Radiant Citadel 0/8-for-7 — the ability *is* the body). cantAttack buys +1–2 extra statline.
- Influence amounts: +1 per event is the norm; +2 is a haymaker and must cost like one.

## Influence posture

Yellow is the only color whose *plan* may be the track. All gains event-earned (invariant 1);
the natural rhythm is "you attacked my wall, I got paid." Tribune adds two more rhythms — a ±1 tick
each time a Tribune enters or leaves play (net zero over its life), and holding a zone majority at
round end so the crowd pays you.

## Provisional / open

- Whether Armor should appear printed on yellow base units (currently upgrade/aura-granted only).
- Is the ~5% Influence-win rate the intended upset frequency, or should the trickle bite harder?
  (Feeds the win-threshold parameter conversation.)
