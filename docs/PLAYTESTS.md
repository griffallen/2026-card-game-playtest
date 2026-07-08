# Playtest Log

## Designer session #1 — 2026-07-08 (spreadsheet notes, relayed)

The designer reviewed the audit's rulings. Outcomes → decisions 32–39: mulligans (unlimited, −1 card
each), empty-deck penalty (−1 life/−1 influence per missing card), event-earned influence (guards pay
on defend, Exemplar on kill — no passive income, per his explicit intent), Overextend corrected to his
definition (optional attack gamble: +N now, N self-damage at end of turn; action-printed OE inert
pending his card pass), movement ratified, prison "on notice," combat redesign (multi-unit + defender
interception) drafted but paused for the turn rework, and all 84 cards acknowledged as AI-drafts to be
normalized via the new CSV workflow. Post-change sims: the game flipped from influence-dominated to
combat-dominated (random mirror: red 29%, life 141/9; heuristic mirror: red 30%, life 57/3 — influence
wins now nearly extinct, which hands the designer the event-value dial). Open designer questions
carried: a better name than "base/home" (Banner/Hearth/Seat/Beacon offered), and the attack-ruleset
knobs (do interceptors exhaust?).

## Game 004 — 2026-07-08 · Blaine (red) vs AI · seed 1425326367

7. **Crimson Behemoth's splash was dead text — re-ruled live.** "Deals 2 damage to all adjacent zones" anchored on the Behemoth only ever hit Neutral (a base assault means standing in the enemy Home), which is empty by siege time. Player expectation — splash the defenders around the base — is the reading that makes the card function. New ruling: every *other* unit in the defended Home zone takes 2, both sides (own units included; red collateral). First card re-ruled from live play; the ⚑ note on the card records the change.

Human games and what they taught us. Full chronicles export from the demo ("Download game file"); design-relevant findings graduate to GAME-FLOW.md's open questions / DECISIONS.md.

## Game 002 — 2026-07-08 · Blaine (red, human) vs baseline AI (yellow) · loss by influence, t14

Chronicle summary: disciplined influence spending vs game 001 (8 ceded vs 19), but the Machine self-generated 11 and won the track anyway. Only one base hit landed all game.

**Findings:**

1. **The telegraphed march.** Move-exhausts means an attacker entering the enemy Home stands exhausted for a full turn — reactive control (Sentence, Inquisitor's enter-play imprison) answers it every time. Player never got a second base swing with any unit. *Corroborates GAME-FLOW open question #2 (movement feel). Candidate levers: cheaper movement into Neutral only; a "siege" posture; or simply accepting that red's base damage should come from Breakthrough + burn.*
2. **Imprisoned units are on-attack-trigger food.** Dawnspear Paladin attacked the imprisoned Brute twice — no counter-damage, +1 influence each time. Prison converts an enemy unit into a renewable influence battery for attack-trigger cards. *Design question: should attacking a prisoner release it? Deal no trigger benefits? As-is it's a strong, possibly degenerate synergy.*
3. **Auto-imprison targeting (strongest-in-zone) punishes tall, rewards wide.** Working as implemented; may be a feature — it gives red a real counterplay line (escort swarms) — but the designer should bless it deliberately.
4. **Confirmed from audit:** yellow's passive self-generation (11 this game: Sunguard +1, Justicar +2, Mobilize +1, Sentence +1, Dawnspear +2, Command Edict +2, Absolution +2) reaches 15 in ~14 turns *without red's help*. Audit balance proposal #1 (trim vanilla "+1"s) remains the first knob to try.
5. **Prison decay as red tech** (untested): 3+ prisoners = −3/turn on the jailer, cancelling passive income. Red flooding the jail is a real strategy the current rules support — nobody has played it yet.
6. **Granted Rush is a no-op on veterans** (player question, 2026-07-08). Rush only exempts the arrived-this-turn restriction, so Reckless Charge/Blood Rush/Warpath do nothing for units already in play (while still ceding Overextend influence) — a clickable trap. Designer options: keep (skill-testing), make granted-Rush also *ready* the target (the spreadsheet's sketched "Furious Advance" is exactly this — big power jump), or retemplate to "target unit that entered play this turn." Also note Warpath hits only units on board at cast time — future arrivals don't inherit.

## Game 001 — 2026-07-07 · Blaine (red) vs baseline AI (yellow) · loss by influence, t15

Red ceded 19 influence (of the Machine's 15-point win) and lost to his own Final Onslaught at −14. Led directly to: lethal-overextend warning, contextual hints, auto-pass, How-to-play panel (shipped same night).
