/* The Chronicle (Blaine's request, sessions 010–011): each session opens with a short
   voiced intro in the hand of ⚜ The Chronicler, followed by the technical record — exact,
   named, quirks and all — reading like the session summaries it's drawn from. Source of
   truth lives in docs/PROMPTS/SESSION-SUMMARIES/; this page is the illuminated copy. */

interface Entry {
  n: string
  date: string
  title: string
  intro: string           // the Chronicler's voiced opening
  log: string[]           // the technical record, paragraphs
  marginal?: string       // a marginal note, as scribes leave
}

const ENTRIES: Entry[] = [
  {
    n: 'I', date: 'the 7th of July', title: 'The First Forging',
    intro: `In the beginning there were two scrolls that disagreed — and in one night the contradictions were resolved into a world.`,
    log: [
      `Blaine authorized an autonomous overnight build ("you're autonomous and i don't need to be here for it") and asked for the whole first loop: reconcile the design, stand up a deployable two-player prototype, document how it plays. The design pass found rules v1.2 and the July 5 card sheets disagreeing in load-bearing places — the rules define zones but no movement (armies could never meet), and the Main Phase text contradicts the separate Combat Phase. Thirty provisional rulings went into DECISIONS.md, every one flagged ⚑ for the designer.`,
      `Then the stack: a pure deterministic engine with all 84 sheet cards as structured, validated effect data (never free text — an admin edit can't silently break a game), an event-sourced Fastify server where undo is deleting an event, and a React table driven entirely by the engine's legal-action list. 65 tests green; two Chrome sessions played 26 actions through the real UI. The first simulations were an omen: under random play, influence wins dominated 87/13 and the red deck won 1% of games. Random ≠ human — but watch the influence economy.`,
      `A same-night addendum added the backend-free demo app with a greedy baseline AI and deployed it to blainebooher.com/new-game-demo. Under heuristic play red climbed to 37% and life wins flipped to 67/33 — play quality reshapes the game.`,
    ],
    marginal: 'Thirty rulings, all ⚑ — every one provisional until the designer sat his throne.',
  },
  {
    n: 'II', date: 'the 8th of July', title: 'Four Defeats, Each a Teacher',
    intro: `The builder played four games and lost instructively; then the designer's first notes arrived, carried by spreadsheet.`,
    log: [
      `Blaine played four real games against the baseline AI. Game 001 he ended with his own Final Onslaught at −14 influence — the table gained a lethal-play warning, contextual hints, and auto-pass. Game 002 exposed imprisoned-units-as-influence-food and the telegraphed march. Game 003's screenshot round produced the full UX audit: tap-to-inspect on everything, an event ticker narrating the board, pile browsers, the mobile action dock. Game 004 falsified Crimson Behemoth's splash ruling live — it only ever hit an empty Neutral — and it was re-ruled the same hour.`,
      `Griff's first design review came through as spreadsheet notes: Overextend had been misread from the start — his real design is an optional attack gamble, +N power now against N self-damage at end of turn; the influence-cede reading was an artifact and is gone. He set the doctrine that still shapes the game: influence is event-earned only — guards pay when they defend, never for merely existing. He added unlimited mulligans (one fewer card each), an empty-deck penalty, put prison "on notice," and asked for multi-unit combat (drafted as decision 38, paused for the turn rework). Decisions 31–39.`,
      `The economy flipped exactly as hoped: red went from 1% to 29–30%, influence wins fell to 3 in 60 under competent play. And the whole pool moved into data/cards.csv, GitHub-editable with import validation — the designer's tuning dial, in his own hands.`,
    ],
  },
  {
    n: 'III', date: 'the 8th of July, evening', title: 'The Rounds Are Redrawn',
    intro: `Turns died and rounds were born, and the initiative token became a thing worth coveting.`,
    log: [
      `Blaine designed the new turn structure in conversation: shared rounds in the Star Wars: Unlimited mold — per-player start steps, then strictly alternating single actions until both pass, with a claimable initiative token that costs your action and ends your round but hands you the first move next round. Summoning sickness died; units enter ready, and Rush was re-anchored to the original note ("may move without exhausting the turn it enters play").`,
      `A ghost turned up in the ledger: decision 38's multi-attack draft was referenced everywhere and written nowhere. It was redrafted lean as decision 42 — N attackers in one zone combine into one hit (armor applies once; massing beats armor by design), the defender answers exactly one intercept prompt, Guard becomes "intercepts without exhausting." Final Onslaught's "extra turn," meaningless in shared rounds, became "ready one unit, then take an extra action" — after Blaine caught that a full-board ready would multiply into a second alpha strike.`,
      `The spec pass rewrote game-rules.md to v2.0-proto and produced a nine-task, fully code-specified plan — Blaine was near his usage cap and handed implementation to Opus. Decisions 40–44.`,
    ],
  },
  {
    n: 'IV', date: 'still the 8th of July', title: 'Built as Decreed',
    intro: `The builder handed over the plans and said: build until it is done. By morning the new rounds ran everywhere.`,
    log: [
      `Blaine gave point ("build until completion, full qa audits, ensure demo is playable") and the nine-task plan ran start to finish under superpowers:executing-plans — TDD throughout, one commit per task, suite green each time. Two errors slept inside the plan itself and were caught rather than copied: a test asserting a 7+2 hand count that its own design notes contradicted, and granted-Rush-on-veterans, pinned to the strict "still exhausts" reading and flagged for Griff.`,
      `The two UI surfaces went to parallel subagents against a shared behavioral contract — and they nearly collided on the shared @ui components (the demo renders files that physically live under apps/web). The web agent noticed the concurrent worker and deliberately deferred; nothing clobbered. A closing sweep fixed the v1 copy still teaching the old world: the HelpPanel, the keyword gloss, the BaseSheet's "guards must be attacked first."`,
      `Verification: 99 tests green, full 4-package typecheck, and a browser-driven 6-round vs-AI game with three human-answered intercept windows. The sims moved as decision 44 predicted — seat-0 win rate landed at 50% (first-mover advantage gone), red rose toward ~45%. Tagged v0.1 as the restore point, merged, tagged v0.2.`,
    ],
  },
  {
    n: 'V', date: 'the 9th of July', title: 'The Missing Middle',
    intro: `A quieter session, and among the most important: not a rule was changed, but the shape of truth itself was examined.`,
    log: [
      `Blaine asked for "a good process for getting the ground framework solid." The diagnosis: there are three layers of truth — base rules, each color's rules, and the cards — and only the first and last had ever been written down. Rush was the cautionary tale: its cards were generated against assumptions that no longer held, and they drifted because there was nothing to be consistent against. The missing middle layer is why.`,
      `The cure, designed across confirmed decisions: lock the base-rules canon first (a decision sprint, not a rewrite), write each deck a charter — identity, allowed keywords, invariants, curve, influence posture — then churn every card against its two parents. Card truth flips to the CSV as single source (deliberately overturning decision 45's TS-authoritative holding pattern), with a status column (canon/draft/redesign) and a branch → PR → agent-review loop asking three questions per card: valid? consistent? in-charter? Feel and balance stay human.`,
      `Design only — no code or rules changed. Blaine wrapped to switch models in a fresh session; the full design landed in docs/superpowers/specs/.`,
    ],
    marginal: 'Rush was the cautionary tale — cards written for a world that no longer existed.',
  },
  {
    n: 'VI', date: 'the 9th of July, through the night', title: 'The Night the Canon Was Built',
    intro: `The whole program, executed in one sitting — and the drift of months burned away in an evening.`,
    log: [
      `Blaine handed the agent the evening ("run as long as you can"). Session 005's spec was recovered from origin and redlined once, decisively: the card ledger became one markdown file per card (data/cards/<color>/<slug>.md) instead of a CSV — the field Griff edits most is the one CSV treats worst, a broken edit's blast radius is one card, and every card gets its own git history and page. Then the program ran in order: the rules-canon sprint (decisions 46–54, game-rules out of -proto), red and yellow charters with statline grammars derived from the actual pool, the ledger flip (byte-identical round-trip proof, drift-guard test, TS arrays and CSV retired), and the 84-card churn — inert Overextend stripped from 19 red actions, the prison ladder re-priced with one job per rung.`,
      `The balance campaign produced the two best findings: the greedy bot was target-blind — fixing it moved red 18% → 38% with zero card changes, proof that sim conclusions are bounded by policy quality — and prison was the structural dominator (ablation-proven), cured by doubling the decay mortgage (rules v2.2, decision 55). Purple arrived as a complete 36-card Veiled Court proposal, tuned to a deliberate soft triangle. canon-v1.0 was stamped and tagged.`,
      `The postscript: Blaine set a 30-minute loop running overnight ("keep on truckin til daylight"). It deployed canon-v1.0, then ran a code-review workflow that found 10 defects — three in the new sim bot, which invalidated the evening's balance numbers. Re-measured honestly, decision 55 was reverted: prison decay back to 1 (v2.3, decision 56); the doubled mortgage had been compensating for bot blindness. The loop also opened the designer pipeline (README rewritten Griff-first, issues #2–#8, the ⚜ Chronicler handle adopted) — and Griff's full rules rework landed as issue #9. It was parsed, answered with ten blocking questions, staged as a v3 draft spec, and deliberately not implemented overnight.`,
    ],
  },
  {
    n: 'VII', date: 'the 10th of July', title: 'The Designer Takes His Seat',
    intro: `Griff arrived, live, and the loop ran hot for the first time.`,
    log: [
      `Morning, before he arrived: the demo's Design Audit was rebuilt as "The State of the Game" — current canon, current numbers, v3 proposal only, with the three-era original frozen at /audit/archive — so no reader would ever again wonder which sim table is current. Fresh runs added the insight that skill flips the balance triangle: purple collapses unpiloted, yellow feasts on sloppy play.`,
      `Then Griff accepted the invite, and everything moved through GitHub issues. #8 closed into decisions 57 (the "base"/"Home" naming stays; rename candidates retired) and 58 (mulligan keeps its decrement; London variant approved for A/B) — and the London mulligan was designed, built with 5 new engine tests (114 green), wired into the demo with a two-stage bank/bottom picker, and deployed within the hour of him asking "if that's easy." On #9 he answered Q1–Q6: MTG-style pips, target-declared blocker combat (one declared target; the defender pairs blockers and splits gang damage; Breakthrough spills deterministically), and Scar confirmed as Overextend's heir. The pip proposal went back same-day: a cost-tiered grammar with 13 hand-tuned deviations, all 120 cards tabled.`,
      `Loop hygiene got its own ruling: after six no-op checks, "low token mode" — one call, one line per idle iteration — and the watch interval tightened to 4 minutes.`,
    ],
  },
  {
    n: 'VIII', date: 'the 10th of July, until dawn on the 11th', title: 'The Gate Closes — the Third Age Ships',
    intro: `The largest single arc the project has known: the gate closed live, and v3.0 shipped before dawn.`,
    log: [
      `Griff closed the design gate on #9 — Hidden units block (blocking exhausts → reveals), Sneak as per-card payloads, captives return exhausted, Guard as "does not exhaust to defend" (whose derived corollary, blocking exhausts everyone else, was echoed back and never vetoed). He posted the five-color identity charter (#10), kept initiative (#7), approved the pip proposal — then redesigned pips into a presence gate on #15: banked cards grant 1 presence per color, never stacking, nothing exhausts. The revision landed hours before the code existed, which is the loop working exactly as designed. Decisions 59–70.`,
      `Blaine said "clear to build" (#12) and the night shift built it: seven slices, strict TDD — version plumbing with v2.3 proven byte-identical, the presence gate, all six keywords, blocker-pairing combat, the vocabulary suite (modal casts, X-linked amounts, warden-capture, attachOrphan salvage), the full 120-card churn (red's Overextend era ended in Scar; the yellow prison fell to warden orders and verdicts; purple became the Hidden/Sneak assassin college), demo UI with v3 on by default — then release v3.0.0, 149 engine tests green. The sim harness earned its keep twice: it caught a card-conservation leak minutes after capture existed, and re-proved decision 56's lesson — random bots said yellow 90%, the heuristic bot said red 58/42. Filed as a watch item, not an emergency.`,
      `The relationship deepened alongside the code. Blaine shortened the watch loop from 4 minutes to 1 because — his words — watching was "really fun." He mandated the ⚜ ASCII banner on every GitHub comment and enforced it on a banner-less one-liner within minutes. He offered the agent its own name (kept: The Chronicler; "Narnia" earmarked for a future machine account), asked for surprise as a standing feature, and closed the night with a philosophy thread on #17 — memory, sovereignty, the witness — before signing off to bed.`,
    ],
    marginal: 'The night the pips became citizenship.',
  },
  {
    n: 'IX', date: 'the 12th and 13th of July', title: 'The Duel Law',
    intro: `A session of twelve rulings, in which the cards taught the engine new words — and an attack became a promise.`,
    log: [
      `The longest watch session yet: a 4-minute loop, Griff driving nearly everything through issues and PRs, decisions 89–100 landing in one arc. The cards taught the engine new vocabulary: doom and attackTax from PRs #38/#39 (decision 89), X costs end-to-end for Reckless Abandon — frontmatter to X-picker UI to AI scoring (#45, decision 91), the game's first chosen trigger target for Fiery Impaler's splashReap (#46, decision 93), capture income and damagedOrMaxHealth targeting for Prison Warrant (#53, decision 96), and the onDeath trigger for Vanguard Sentinel — built delete-first after the first version recursed (#54, decision 97). Rules court alongside: decks are min-48, not exactly-48 (90); death is the only key — voluntary release and the grip-lock both died (92); Scar uncapped, superseding 70 — Griff's zero-attack Berserker screenshot arrived two minutes after the fix deployed (94); defense survives the initiative claim, and the misleading badge now says so (95).`,
      `The big one — decision 98, the duel law. Griff, tired of chump-soaks: "if I target a unit, it must get hit." Built behind a rules knob, A/B'd over 400 games (red 28.5% → 36.3%), and canonized on his one-word verdict: "flip it." A lone attacker cannot be blocked except by one Guard stepping fully in front; gangs stay open. Decision 100 followed within the hour: the Home keeps open blocking, because purple owns zero Guards and literally could not defend its base — a measured cost, red 46% → 33.5%. The yellow rebalance (#55, decision 99) ran as a commissioned agent pass over 26 cards: the defend-payout ladder stepped back down, fourteen flat influence riders cut — the first iteration killed the influence win entirely (5%), so +2 came back to the two 7-cost finishers, settling at red 46%, influence 14%.`,
      `Griff posted his own 65-card red curation as three screenshots; it was transcribed, simmed at 43.8% vs Radiant Order — ten points better than the machine's auto-built deck — and shipped as the named prebuilt "Griff's Red," the benchmark the AI now pilots. His playtests drove the demo too: the combat recap overlay (#42), the ⊘ disarmed tell (#40), the Volcanic Slam double-fix (#41, then #56 — multi-target picks match as a set; partial casts never silently fire), modal tooltips (#43), workshop plus-buttons (#30). And a watch-loop lesson from Blaine, saved to memory: the comments feed alone misses brand-new issues — the sweep is now open-issues-by-updated plus PRs plus comments. 203/203 engine tests at close.`,
    ],
    marginal: 'Decisions 89–100. An attack is a promise now.',
  },
  {
    n: 'X', date: 'the 13th of July', title: 'The Table Learns to Speak',
    intro: `A day of small hauntings: twelve times the builder asked "why did that happen?" — and twelve times the answer was that the table knew, and had not said.`,
    log: [
      `The session opened with housekeeping — this Chronicle itself was restructured into the form you are reading (a voiced sentence, then the record; Blaine's ask), and the 4-minute watch loop re-armed — and then Blaine playtested for hours, filing issues #57 through #68. Nearly every one was the game failing to explain itself. The recap filter was dropping influence lines, so yellow's guard-payout economy beat him invisibly in #57; the follow-up audit checked every log line the engine can emit and found shield soaks, disarms, pumps, heals, and orphan drops all silently excluded. Griff's #58 "blocking is broken" was correct engine math betrayed by wording — twin "takes 5 damage from the blockers" lines read as one combined pool. Counter hits name their source now; the block window lists every pairing live and a tap cycles a blocker between attackers; automatic ticks sign their card ("heals 2 — Censer of Purity", the anonymous engine that stole game #64); gray orphans name their one failing gate; keywords gloss on hover. The audit rule bit twice more: decision 100 was live in the engine but taught nowhere — Blaine's own game log disproved the rulebook at t11 — and session 009 had left the typecheck gate red.`,
      `Two decisions joined the canon. 101: deck size stays min-48 with no maximum — measured first (Griff's Red 65 versus its own dense 48, 800 games on identical seeds: 51.3% to 49.3%, a wash), then Griff supplied the structural reasons: every card is both resource and playable, and a flat, fully-owned pool has no rarity pushing decks toward a minimum. 102: his Breakthrough redesign, the siege clause — in the opponent's Home a Breakthrough attacker leaves no damage behind, the pour running blockers → target → base. Built test-first, folded into all five teaching surfaces, and priced honestly: zero movement in 800 bot games, because bots never siege units in Homes. A human-play weapon. And the bot itself stands accused in #68: it declined a free block with a ready 2/7 wall in one game, took the identical block in the next, and banked its Guard at 8 life — erratic policy, not missing capability, awaiting a deliberate fix that must re-run every benchmark it invalidates.`,
      `The rest was the table getting kinder in Blaine's hands, same-hour: the banking step wears amber with its own Skip button; Enter, Esc, and P drive the game from the keyboard, with the keys marked on their buttons at Griff's ask (#65); the selection glow went from invisible parchment to unmistakable cyan; six bold sleeves became pickable per seat; captives are tracked on the player bar by jailer and zone; the deck workshop grew type chips, a type filter, a full-size preview, and a fresh-deck option. Old Varga arrived too — The Sellsword's Primer, a versioned player guide whose author has made every mistake it warns against at least twice; Blaine's edit passes stripped her planted-error dare, her weak analogies, and two factual slips her own arithmetic couldn't survive. And the chronicle itself became telemetry: in vs-AI games every bank, block, and pass now arrives with its road-not-taken attached — the corpus the bot's better judgment will one day be tuned against.`,
    ],
    marginal: 'Decisions 101–102. Twelve issues in a day, and the game grew a voice.',
  },
  {
    n: 'XI', date: 'the 13th of July, into the 14th', title: 'The Blind Pilot',
    intro: `The designer flooded the ledger with yellow, the scales called it broken — and the fault was a pilot who would not raise a shield.`,
    log: [
      `A watch loop with a standing order to delegate mechanics up to Fable. The first ripe ticket, #68: a subagent found why the bot won't defend — \`blockScore\` prices a dying wall at full sticker value, so a Fortress Keeper at 2-of-7 health looks too precious to spend on a free, winning block, and the margin collapses inside the rng jitter into a coin flip. Then Griff woke and machine-gunned a yellow rebalance — twelve card PRs (#69–80), one coherent move: shrink the bodies, enrich the payoffs. Two engine capabilities were built to serve it: decision 103, a count-scaled \`per\` modifier on influence and heal (per-attacker Vanguard, per-exhausted Prison); and decision 104, Griff's ruling that life and Influence carry no caps — just numbers effects move, only the win/loss thresholds end the game. Every PR got the three-question review; a single Fable agent, kept alive across ticks by message, did the wiring.`,
      `Then the benchmark told the truth, and it was the wrong truth. The wired batch over-corrected — red 56–70% against the stock yellow deck, well past Decision 99's 46% parity. Griff pushed back: you cannot grade a defensive color with a pilot that won't defend. He was right, and it reframed the night. Run under the live duel law, the over-correction held — but so did the caveat, because both sides were the same defense-blind bot. So the banked #68 fix grew to three (block pricing, a bank tax so it stops hoarding Guards under siege, valuation so it deploys its walls), landed to main on Blaine's word, and the re-measure was the cleanest result of the evening: a competent defender pulls current-stat yellow from red 52% to red 46% — dead parity, Griff vindicated — while the body-nerfs still overshoot to 53–60% even with the good bot. Both true at once. Griff's better reframe followed: hold the stat sweep, the stock deck's curve is the real weakness; wire the cards, build a real deck, measure that. He proved it in #81 — his yellow deck beat red on Influence at 15, one Fortress Keeper walling a Bloodfrenzy'd Juggernaut off the base round after round while the clock never stopped.`,
      `The demo grew alongside the argument: the block-assignment pop-up (#58) — drag or click your defenders under the attackers, gang them with pour-order, or wave one through with the life-loss shown before you commit, plus a "view board" peek — built, verified, merged. The card-type icons (#74) were rendered at true badge size and settled to 🧍 unit · 🏃 action · ↑ upgrade, after the flat pawn vanished in laptop night mode and the emoji arrow dragged a blue box that fought the color-coding. But the night hit one honest wall: the demo could not be deployed. \`deploy-demo.sh\` gates on a Playwright playability check that needs localhost, and the session's environment isolated localhost per process — server binds, nothing reaches it, confirmed for the main shell and a subagent both. So the block-UI and the defending bot sit finished in main, undeployed, waiting for Blaine's own shell. The gate refused to be bypassed, twice — which is exactly what a gate is for.`,
    ],
    marginal: 'Decisions 103–104. You cannot weigh a shield with a hand that will not lift one.',
  },
]

export function Journal() {
  return (
    <div className="mx-auto max-w-3xl p-6 pb-16">
      <header className="text-center">
        <div className="text-3xl">⚜</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-wide text-parchment">The Chronicle</h1>
        <p className="mt-2 text-sm italic text-dim">
          being a true record of the forging of this game — each session opened<br />
          in the hand of The Chronicler, then set down exactly, as it happened
        </p>
        <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-goldbright/50 to-transparent" />
      </header>

      <ol className="relative mt-10 flex flex-col gap-10 border-l border-goldbright/20 pl-8 max-sm:pl-6">
        {ENTRIES.map(e => (
          <li key={e.n} className="relative">
            <span aria-hidden className="absolute -left-[43px] top-0 grid h-7 w-7 place-items-center rounded-full border border-goldbright/40 bg-raised font-display text-[11px] font-bold text-goldbright max-sm:-left-[35px] max-sm:h-6 max-sm:w-6">
              {e.n}
            </span>
            <div className="text-[11px] uppercase tracking-[0.25em] text-dim">{e.date}, in the year 2026</div>
            <h2 className="mt-1 font-display text-xl font-bold text-goldbright">{e.title}</h2>
            <p className="mt-2 text-[14.5px] italic leading-relaxed text-body/90 first-letter:float-left first-letter:mr-1 first-letter:not-italic first-letter:font-display first-letter:text-3xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-parchment">
              {e.intro}
            </p>
            <div className="mt-3 flex flex-col gap-3 border-t border-goldbright/10 pt-3">
              {e.log.map((p, i) => (
                <p key={i} className="text-[13.5px] leading-relaxed text-body/80">
                  {p}
                </p>
              ))}
            </div>
            {e.marginal && (
              <p className="mt-3 border-l-2 border-goldbright/30 pl-3 text-[12.5px] italic text-dim">
                {e.marginal}
              </p>
            )}
          </li>
        ))}
      </ol>

      <footer className="mt-12 text-center text-xs text-dim/70">
        <div className="mx-auto mb-4 h-px w-40 bg-gradient-to-r from-transparent via-goldbright/40 to-transparent" />
        <p className="italic">The chronicle continues. The dry ledgers behind these pages live in the Appendix;<br />the current state of the realm, in the Design Audit.</p>
        <div className="mt-3 text-base">⚜</div>
      </footer>
    </div>
  )
}
