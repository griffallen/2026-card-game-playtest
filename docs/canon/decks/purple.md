# Purple Deck Charter

*One of the card pool's two parents: every purple card must obey this charter **and** the base
rules (`docs/rules.md`). Adopted by Griff on issue #5 and rebuilt through #122 — all 36 cards are
`canon`. The prebuilt deck is **The Veiled Court**, Griff's own 58-card build.*

## Identity

**Purple is the Veiled Court: precision, patience, and the unanswered shot.** It wins by killing
from where you can't reply — Hidden blades that can't be answered while ready, Sneak payloads
delivered as your turn, Infiltrators arriving where they're least wanted, permanent
"-Power" withering that makes enemy armies fade rather than die — and by out-drawing the
opponent while their board grows old. Red spends blood; yellow builds law; purple simply refuses
the fair fight. Its weakness is a body: purple statlines are glass, and anything that closes the
distance hits hard. *(Decision 80 rewrote the reach: Ranged is now a volley ability reserved for
Blue's future identity — purple keeps exactly two archers, Dusk Archer and Nocturne Sniper.)*

## Keywords purple may print

| Keyword | What it means for purple | Limits |
|---|---|---|
| **Hidden** (7 cards) | While ready, it cannot be targeted or attacked — but anything that exhausts it reveals it. Strike, vanish, repeat. | Purple's signature. Beats choices, not consequences: "all" effects still reach it. |
| **Infiltrate** (6 cards) | May be played into any zone, not just your Home. | The unanswered arrival; purple's tempo substitute for Rush. |
| **Sneak** (4 cards) | An ability used as your turn: exhaust to resolve the card's printed Sneak effect in its own zone. | Each card states its own payload. |
| **Ranged N** (2 cards) | An ability (decision 80): exhaust to volley N at one enemy unit, any zone. | **Reserved for Blue** — purple keeps exactly two carriers (Dusk Archer, Nocturne Sniper); new purple Ranged is ratify-first. |
| **Tribune** (2 cards) | The court works the crowd too. | Shared with yellow, who owns it; purple prints few. |

**Forbidden:** Rush, Breakthrough, Scar (red's); Guard, printed Armor, Capture, cantAttack
*as its own keyword* (yellow's walls — purple may *grant* cantAttack to enemies for a round: a
pacification, not a wall).

*Retired:* **Flying** and **Untargetable**, both cut in v3 (Untargetable superseded by Hidden). No
purple card carries either.

## Invariants (the design laws)

1. **Influence moves only on kills** (onKill, small: +1; the 8-drop's +2 is the cap). No defend
   payouts (yellow), no play payouts, never passive.
2. **Removal is attrition, never a verdict:** permanent -Power debuffs and precise damage. No
   `destroy` ops, no Capture, no exile. A withered unit still stands — at 0 Power, as a warning.
3. **Sweeps are surgical:** purple zone/board damage hits **enemies only** — and is costed above
   red's friendly-fire equivalents for the privilege.
4. **Purple does not heal, wall, or protect its base** beyond one-round misdirection
   (`preventBase` tricks). Losses are the cost of doing business.
5. **Card flow is purple's economy** — it is the only color that draws freely. Every deck's
   cantrips (draw riders) are purple-legal; big draws live on bodies (Duskweaver Oracle).
6. **Statline grammar:** Power + Health = **2 × cost**, with a **1-point tax per evasive keyword**
   (Hidden / Infiltrate / Ranged) — acting without an answer is worth a stat. Power-lean on
   assassins; nothing purple is a wall.

## Curve & size (the standard base set)

- **36 uniques** (19 units / 15 actions / 2 upgrades); doubles = the twelve cost ≤2 slugs
  (designed to be exactly twelve) → the 48-card *Veiled Court* deck.
- Cost histogram: `1:3 2:9 3:4 4:8 5:4 6:4 7:3 8:1` — cheap tricks early, inevitability never
  (purple's late game is card advantage, not haymakers).

## Influence posture

Nearly red-abstinent: the track moves only when a purple blade actually finishes something.
A purple influence win should feel like a career of assassinations, not an economy.

## Provisional / open (all of it — this is a proposal)

- Art is a **placeholder direction**: deterministic "veil" SVGs (night-violet, eclipse + sigil)
  so the deck reads as intentional until real art exists. Regenerate any time.
- Balance (fixed-bot sims, N=300, rules v2.3 — `npm run sim:matchups`): **~50% into red,
  ~60% into yellow, mirrors seat-fair** — a soft triangle: purple's evasion beats walls, red's
  aggression matches it, yellow edges red (56/44). Whether the triangle is a feature is Griff's call.
