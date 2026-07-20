# Playbook: Design

**Use this playbook** for the first design pass, and again in miniature for every significant rules change after playtesting (see `playtest.md`).

## Purpose

Turn the designer's intent — the GENESYS, the rules documents, the deck experiments — into a set of clear, agreed decisions ready to be spec'd. The output of this phase is *decisions*, not documents; the specs come next phase.

## First session

If this is the project's first session:

1. Welcome the user warmly. Read `docs/DESIGN/01-GENESYS.md` and explain the project back — the goals, the loop, how sessions and handoffs work.
2. Establish who you're working with (designer or builder). Don't quiz the designer about programming — ask about the game: What's the vision? What already feels solid? What feels most uncertain? What games is this reacting against?
3. Walk through where things live (the README table) and how to wrap a session.

## Materials

- `docs/DESIGN/01-GENESYS.md` — the brief
- `docs/rules.md` — the rules, always current (generated; edit `apps/demo/src/pages/Rules.tsx`)
- `docs/REFERENCES/extracted/red-deck.md`, `yellow-deck.md` — example card sheets (LLM-generated explorations; each ends with extraction notes flagging rules mismatches)
- `docs/REFERENCES/extracted/spreadsheet-june-2026.md` — narrative goals, seven-color identities, keyword tables, newer deck sketches

## Method

Work through the game one concept at a time, **one decision per exchange**. Don't ask "is anything unclear?" — find the unclear parts yourself and pull the thread. Record each decision as it's made in `docs/DESIGN/DECISIONS.md` (numbered, one line, with the reason) so the transition audit has something to audit.

## The hard questions

The GENESYS describes behaviors, not systems. These are the threads to pull; add your own as conversations reveal them.

**Mechanics vs. parameters — the central question.** Which rules are engine mechanics (turn structure, zones, combat resolution — code, changed rarely) and which are tunable parameters (costs, thresholds, starting life, deck minimums, win-condition values — data, changed freely from the admin)? The GENESYS explicitly wants versioned, easily editable rules. Every rule discussed should land on one side of this line.

**The card-effect vocabulary.** Can every card be expressed as cost + stats + keywords + parameterized triggers, or do some cards need bespoke logic? This one decision determines whether the designer can create cards through the admin UI alone, or needs the builder for each new idea. The references already show the tension: clean keyword grids in the spreadsheet vs. free-text effects on the card sheets.

**Rules versioning.** What exactly is a "rules version" — a set of parameter values? A set of card definitions too? What happens to a saved deck, or a game in progress, when the version changes?

**Card lifecycle.** What happens when a card is edited or deleted while decks reference it? Are card changes versioned like rules changes?

**Consistency debts in the references.** The example decks use concepts Rules v1.2 never defines — "base", "Flying", "maximum Influence", an opponent "losing" shared Influence (each deck extraction lists its own). For each: adopt it as a real mechanic, or discard it as an LLM artifact?

**Scope of color identities.** The spreadsheet sketches seven colors; the rules define keywords for three or four. Which colors are in scope for the prototype?

**Edge cases.** Walk through at least: both win conditions triggering simultaneously; Influence crossing ±15 in the middle of resolving an effect; drawing from an empty deck; combat where both units die; imprisoning a unit that's being targeted by something else.

**Tech stack review (builder session).** `docs/DESIGN/02-TECH-STACK.md` is a seeded recommendation, not a decision. Review it with the builder during this phase.

## Transition gate → specs

Before moving on:

1. Summarize every decision in `DECISIONS.md`, in order.
2. For each, probe: "We said X — does that still hold now that we've also decided Y?"
3. Hunt contradictions, unstated assumptions, and edge cases that weren't discussed.

If issues surface, raise them clearly. If the user wants to move on anyway, state your concern once — "I think this will bite us in the spec phase, because…" — then respect their call.
