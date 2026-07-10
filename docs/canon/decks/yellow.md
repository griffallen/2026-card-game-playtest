# Yellow Deck Charter — canon-v1.0

*One of the card pool's two parents: every yellow card must obey this charter **and** the base
rules (`docs/SPECS/game-rules.md`). A card that breaks a law here is a review-blocker.*

## Identity

**Yellow is order made inevitable.** It wins by refusing to lose — walls that intercept for free,
laws that lock threats away, and a shared Influence track that ticks toward yellow every time its
defense *does something*. Yellow has two win axes: outlast red's aggression and win on Life late,
or convert a long game into an **Influence** victory. Yellow's weakness is tempo: it must actually
contest the board, not just sit (Guard no longer auto-blocks — decision 42).

## Keywords yellow may print

| Keyword | What it means for yellow | Limits |
|---|---|---|
| **Guard** | The signature: intercepts attacks without exhausting. | Yellow-only. Guards get *paid* for stepping in (onDefend Influence), never for existing. |
| **cantAttack** | Pure walls — statlines no attacker enjoys hitting. | Yellow-only. The statline discount pays for the passivity. |
| **Untargetable** | Law protects its instruments (Chain of Law). | Rare. |
| **Flying** | Mobility as judgment — arrives where needed (Light's Vanguard). | Rare; premium cost. |
| **Armor N** | Granted by upgrades/auras (Radiant Aegis-style), not printed on base units today. | Keep as granted-defense; printing it on units is a ratify-first change. |

**Forbidden:** Rush, Breakthrough, Overextend, Reach. Yellow never spends blood for tempo.

## Invariants (the design laws)

1. **Influence is event-earned, never passive income** (decision 34). Legal triggers: onDefend,
   onKill, onAttack, onPlay. **startOfRound / endOfRound Influence income is charter-illegal** —
   the track moves because something *happened*, not because a card exists. (Aura of Resolve was
   redesigned under this law, session 006.)
2. **Defense gets paid.** The onDefend trigger is yellow's economy: intercepting or being attacked
   is when guard units earn. A guard with no onDefend payoff needs a reason.
3. **No dead thresholds** (decision 50): no card may reference an Influence value at or beyond the
   win threshold.
4. **Yellow's removal is conditional, never efficient.** Imprison (position-bound, decaying),
   destroy-if-damaged, power-capped effects. Clean unconditional "destroy target unit" or
   efficient direct burn is red-shaped and forbidden.
5. **The prison package is provisional** (decisions 37/53): the ~15 prison cards stay normalized
   and playable, but **no new prison-dependent designs** until Griff rules on the mechanic's fate.
6. **Yellow heals** — units and base. It's the only current color that may.

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
the natural rhythm is "you attacked my wall, I got paid." Prison inverts it: holding prisoners
*costs* Influence every round (§1.11) — mass imprisonment is a mortgage against the win axis.

## Provisional / open

- **Prison's fate** — decision 37, Griff's call. Blocks ~15 cards' long-term identity.
- Whether Armor should appear printed on yellow base units (currently upgrade/aura-granted only).
- Is the ~5% Influence-win rate the intended upset frequency, or should the trickle bite harder?
  (Feeds the win-threshold parameter conversation.)
