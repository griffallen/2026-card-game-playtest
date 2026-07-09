import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="mt-12 border-b hairline pb-2 font-display text-2xl font-bold text-parchment">{children}</h2>
)
const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-6 font-display text-lg font-semibold text-goldbright">{children}</h3>
)
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-relaxed text-body/90">{children}</p>
const LI = ({ children }: { children: ReactNode }) => <li className="mt-1.5 leading-relaxed text-body/90">{children}</li>
const Flag = () => <span className="text-goldbright">⚑</span>
const Card = ({ children }: { children: ReactNode }) => (
  <div className="panel mt-4 p-4">{children}</div>
)

const QUESTIONS = `New Game — designer questions · v2.0 · 2026-07-08
Copy this, answer inline (after each →), send it back.

1. Reach (Blaze Juggernaut): attacks one zone away, CAN still hit bases, and DOES take
   counter-damage (unlike Ranged). Is that the intended behavior?
   →

2. Aura of Resolve pays +1 Influence every round at start of round — passive income, which the
   "influence is event-earned only" ruling meant to remove. Keep it as an exception, or make it event-earned?
   →

3. Claiming the initiative: you end your round early to act first next round. Does that trade feel good in play?
   →

4. Intercept: the defender may redirect one attack onto one of their ready units, and Guard intercepts
   for free. Right amount of defender agency? Does free Guard-interception make yellow too sticky?
   →

5. Naming: keep "base" / "Home", or switch to one of — Banner / Hearth / Seat / Beacon?
   →

6. Prison is "on notice." Keep it, or cut the prison cards?
   →

7. Mulligans: unlimited, one fewer card each redraw. Does that feel right?
   →

8. Influence win at ±15 — upsets land in ~5% of games. Right threshold, and right frequency?
   →

9. The 84 cards are AI-generated drafts. Which want renaming or retuning first, and are you ready to do a
   card pass in data/cards.csv?
   →`

function QuestionsForYou() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(QUESTIONS).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }).catch(() => {})
  }
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <b className="font-display text-parchment">Questions for you — copy, answer inline, send back.</b>
        <button
          onClick={copy}
          className="shrink-0 rounded border hairline px-2.5 py-1 text-xs text-dim transition-colors hover:text-goldbright"
        >{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <pre className="mt-3 max-h-[440px] overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono text-[12.5px] leading-relaxed text-body/90">{QUESTIONS}</pre>
    </Card>
  )
}

function StatRow({ label, a, b, c }: { label: string; a: ReactNode; b: ReactNode; c: ReactNode }) {
  return (
    <tr className="border-t hairline">
      <td className="px-3 py-2 text-dim">{label}</td>
      <td className="px-3 py-2">{a}</td>
      <td className="px-3 py-2">{b}</td>
      <td className="px-3 py-2">{c}</td>
    </tr>
  )
}

export function Audit() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-[15px]">
      <p className="text-xs uppercase tracking-[0.2em] text-dim">New Game · Design Audit · v2.0 · 2026-07-08</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-parchment">Design & Engine Audit</h1>
      <P>
        This is the full account of what was built, every assumption made along the way, what the simulations
        say about balance, and concrete proposals for evening out the gameplay. It's written for the designer:
        no code required, and everything here can be poked at directly — the <Link className="text-goldbright underline" to="/play">Play</Link> tab
        runs the complete rules engine in your browser, and the <Link className="text-goldbright underline" to="/simulate">Simulator</Link> reruns
        every number in this report in front of you.
      </P>

      <Card>
        <b className="font-display text-parchment">Update — turn structure v2.0 designed (July 8, builder session).</b>
        <p className="mt-2 text-[14px] leading-relaxed text-body/90">
          The turn system has been redesigned around <b>shared rounds with claimable initiative</b> (decisions
          40–44): each round both players ready, draw 2, and may bank a card (initiative holder first), then
          alternate single actions until both pass. <b>Claiming the initiative</b> spends your action and ends
          your round — but you go first next round. <b>Summoning sickness is gone</b> — units enter ready, and
          Rush now means "moves without exhausting the round it arrives." Combat becomes the multi-unit system
          the designer asked for: <b>any number of units in one zone attack together as one action</b>, their
          power combined against armor once, and the defender gets an <b>intercept window</b> — redirect the
          whole attack onto a ready unit (Guard units intercept without exhausting; forced targeting is gone —
          protecting the base is now a choice). Final Onslaught's "extra turn" becomes "ready one unit, then
          take an extra action." The spec (game-rules v2.0-proto) is written and now implemented — the Play tab
          and Simulator on this site run these v2.0 rules.
        </p>
      </Card>

      <Card>
        <b className="font-display text-parchment">Conformance audit — v2.0 verified against the rules + baseline (July 8).</b>
        <p className="mt-2 text-[14px] leading-relaxed text-body/90">
          An adversarial pass checked the engine against the written rules clause-by-clause and stress-ran the
          simulator. <b>The core loop conforms exactly</b> — rounds, initiative, the intercept combat, prison,
          influence, and win order all match the spec and are covered by tests. Across <b>600 bot games: zero
          crashes, both win conditions reachable, and first player wins ≈50%</b> — the round structure dissolved
          the first-mover edge, as intended. Two real gaps were found and fixed: the engine now fires
          <b> end-of-round triggers</b> (a promised hook that had been silently skipped), and unimplemented
          rules-parameter values now fail loudly instead of being ignored. <b>Two questions for you:</b> <i>Reach</i>
          (Blaze Juggernaut) attacks an adjacent zone like Ranged but can still hit bases and takes counter-damage —
          confirm that's the intent; and <i>Aura of Resolve</i> pays +1 influence every round at start-of-round, which
          brushes against your "no passive influence" ruling — keep it, or make it event-earned?
        </p>
      </Card>

      <QuestionsForYou />

      <Card>
        <b className="font-display text-parchment">Update — designer session #1 (July 8).</b>
        <p className="mt-2 text-[14px] leading-relaxed text-body/90">
          The designer reviewed this audit and ruled: <b>mulligans</b> (unlimited, one fewer card each),
          <b> empty-deck penalties</b> (−1 life & −1 influence per missing card), <b>influence is now earned by
          events only</b> (guards pay when they defend — no passive income), and <b>Overextend is his original
          gamble</b>: optionally +N power on an attack, N self-damage at end of round — red no longer cedes
          influence at all. Movement was ratified as intentional; prison is "on notice"; a multi-unit combat
          redesign is drafted and paused for the turn rework. Fresh sims after the changes: the game flipped
          from influence-dominated to <b>combat-dominated</b> (bot mirrors: red ~30%, influence wins nearly
          extinct at 3/60) — the event-trigger values are now the designer's tuning dial, editable per card in
          the new CSV workflow. Sections below predate these rulings where they conflict.
        </p>
      </Card>

      <Card>
        <b className="font-display text-parchment">The short version.</b>
        <ul className="ml-5 list-disc">
          <LI>The rules as written (v1.2 + the July 5 card sheets) had gaps that made them unplayable as-is — most critically, <b>no movement rules</b> and a contradiction in the turn structure. The prototype fills every gap with a documented, flagged ruling. Nothing was silently invented: 30 numbered decisions, each reversible.</LI>
          <LI>The engine is <b>provably stable</b>: 67 automated tests, and hundreds of simulated games per test run finish without a single rules crash, lost card, or stuck state.</LI>
          <LI>Balance headline: <b>Radiant Order (yellow) is favored — about 63/37 under competent bot play</b> — and the win-condition mix flips with skill (random players die to Influence 87% of the time; decent players die to combat 67% of the time). Ranked fixes below, most of them one config change.</LI>
        </ul>
      </Card>

      <H2 id="method">1 · What was audited, and how</H2>
      <P>
        Scope: the game engine (<code>packages/engine</code> — every rule, keyword, and all 84 cards), the rules
        reconciliation itself, and gameplay balance. Method: unit tests against the written spec (67 passing),
        structural validation of all 84 card definitions, three simulation campaigns (below), and end-to-end play
        through the real UI in two live browser sessions. The engine is <i>deterministic</i> — same seed and same
        moves always produce the same game — which is what makes every claim in this report reproducible: each
        simulated game's seed is its replay key.
      </P>

      <H2 id="architecture">2 · Engine architecture, in designer's terms</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI><b>Rules are split into mechanics and parameters.</b> Turn structure, combat, prison — code. Every number (starting life, win thresholds, draws per round, prison upkeep…) — a named, versioned parameter set — "try v1.3 with 25 life" is a config change, not a code change.</LI>
        <LI><b>Cards are structured data, not free text.</b> Each card is built from a fixed vocabulary of effects (damage, imprison, buff, grant keyword, gain influence…). The engine validates every card against that vocabulary — including cards you edit or create later — so a new card idea either works or is rejected on save. It cannot silently break a game.</LI>
        <LI><b>Games are replayable histories.</b> A game is its seed plus its action list. That's why undo exists, why disconnecting loses nothing, and why any bug report that includes a game file is perfectly reproducible.</LI>
        <LI><b>One engine, no mock-ups.</b> This browser demo and the simulator share a single rules codebase — what you playtest here is the real thing, not a facsimile.</LI>
      </ul>

      <H2 id="rulings">3 · The reconciliation: what the written rules didn't say</H2>
      <P>
        Rules v1.2 is the authority, but it describes intentions more than procedures, and the card sheets use ideas
        the rules never define. Every gap got a ruling — flagged <Flag /> here, in the decisions log, and on the
        affected cards themselves (hover any flagged card). Grouped by weight:
      </P>
      <P>
        <b>⚠ Read this section as reconciliation history.</b> The v2.0 update above revised several of these v1.2-era
        rulings: influence on units is now <i>event-earned</i> (not once-on-enter), Overextend is a <i>unit combat
        gamble</i> (action-Overextend is inert, not an Influence shift), combat is <i>multi-unit with a defender
        intercept</i> (not one-attacker, and both players act in their windows), prison decay and card draws are
        <i>per round</i>, and there is <i>no</i> first-player draw penalty.
      </P>

      <H3>Structural (the game literally needed these)</H3>
      <ul className="ml-5 list-disc">
        <LI><Flag /> <b>Movement didn't exist.</b> Three zones are defined; no rule moves a unit between them — armies could never meet. Ruling: moving one adjacent zone is an action and exhausts the unit (march <i>or</i> fight each turn). Rush also lifts the move restriction on arrival. This single ruling shapes the whole game's pace — it deserves your scrutiny first.</LI>
        <LI><Flag /> <b>Main Phase vs Combat Phase contradiction.</b> The rules list "an attack is one action" inside the alternating Main Phase <i>and</i> describe a separate Combat Phase. Ruling: merged — you and your opponent alternate single actions (they can play cards in your turn, but not attack or move); an attack is one action by the turn player, one attacker versus one target, damage simultaneous.</LI>
        <LI><Flag /> <b>"Base" is on half the cards and defined nowhere.</b> Ruling: your base is you — damage to it is Life damage, and it can only be struck by a unit standing in your Home zone. Guards protect it.</LI>
      </ul>

      <H3>The Influence economy</H3>
      <ul className="ml-5 list-disc">
        <LI><Flag /> <b>"Influence: +1" printed on units</b> — when does it trigger? Ruling: once, when the card enters play. (The alternative — every turn — made yellow's passive income absurd.)</LI>
        <LI><Flag /> <b>"Overextend N" printed on red actions</b> — undefined in the rules (only the unit version exists). Ruling: playing the card shifts Influence N toward your opponent. This is the June spreadsheet's "Red burns Influence" identity made literal — and it is the single biggest balance lever in the game right now (see §5).</LI>
        <LI><Flag /> <b>Overextend on units</b> ("bonus when attacking alone") — under one-attacker combat, <i>every</i> attack is alone. Ruling: +N Power while the unit is the only friendly unit in its zone — a positional risk bonus.</LI>
        <LI><Flag /> <b>Prison economics.</b> The rules give a decay (−1 Influence per prisoner per turn) and a release threshold "specified by the effect" — but no card specifies one. Ruling: all prisons break the moment the jailer's Influence goes negative; unit-created prisons also break when the unit dies. One ordering discovery from testing: decay must be charged <i>before</i> turn-start imprison effects, or a jailer at 0 breaks their own brand-new prison instantly.</LI>
      </ul>

      <H3>Card-specific rulings (the ⚑ cards)</H3>
      <ul className="ml-5 list-disc">
        <LI><b>Radiant Citadel</b> ("your maximum Influence is increased by 2") — meaningless on a shared ±15 track. Ruled as: your opponent's Influence win requires 17 while it stands. Defensive, wall-flavored — but it's a guess.</LI>
        <LI><b>Flying</b> (one card, defined nowhere) — ruled as free movement to any zone. Placeholder.</LI>
        <LI><b>Prison Warrant's "in this zone"</b>, <b>Binding Light / Sentence riders</b> (redundant while imprisoned), <b>Supreme Sentence's "if Influence 15+"</b> (unreachable — 15 wins the game first): each simplified and flagged for real design.</LI>
        <LI><b>Zone-entry imprisons</b> (Containment Priest, Lawbringer, Inquisitor) auto-pick the strongest eligible enemy in the entered zone — deterministic, no fiddly targeting, fires on every move. <b>Turn-start imprisons</b> (High Justiciar, Archon) auto-pick likewise.</LI>
        <LI><b>Blaze Juggernaut</b> "can attack adjacent zones" became <i>Reach</i> (unlike Ranged it still takes counter-damage and can assault bases); <b>Ranged</b> itself never hits bases and takes no counter-damage on cross-zone shots.</LI>
      </ul>
      <P>
        Also standardized: no hand limit, no mulligan, drawing from an empty deck simply fails (no mill loss),
        healing caps at starting Life, armor from multiple sources stacks, the first player draws 1 on turn one,
        and if both players would die at once the acting player wins. All parameterized where they can be.
      </P>

      <H2 id="simulation">4 · What the simulations say</H2>
      <P>
        Three campaigns, all reproducible in the <Link className="text-goldbright underline" to="/simulate">Simulator</Link>.
        <b> Random</b> picks any legal move; <b>heuristic</b> is a baseline greedy AI (kills good trades, pressures the base,
        develops its board, banks sensibly — no long-term planning). Bots are not humans; treat these as directional.
      </P>
      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-dim">
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">Random mirror (150 games)</th>
              <th className="px-3 py-2">Heuristic vs random (60)</th>
              <th className="px-3 py-2">Heuristic mirror (60)</th>
            </tr>
          </thead>
          <tbody>
            <StatRow label="Every game finishes cleanly" a="✓" b="✓" c="✓" />
            <StatRow label="Red deck win rate" a={<b className="text-[#e5735f]">1%</b>} b="—" c={<b className="text-goldbright">37%</b>} />
            <StatRow label="Win by influence / life" a="87% / 13%" b="—" c="33% / 67%" />
            <StatRow label="Heuristic win rate" a="—" b="75%" c="—" />
            <StatRow label="Median game length" a="16 turns" b="—" c="18 turns" />
            <StatRow label="First-player win rate" a="50%" b="—" c="≈52%" />
          </tbody>
        </table>
      </div>
      <P>
        Read the two mirrors together and the story is sharp: <b>play quality transforms the game.</b> Random players
        bleed Influence and lose to it (red's Overextend actions actively donate the shared track — hence 1%). Competent
        play defends the track, and the game becomes about combat — red climbs to 37% and life becomes the main win
        condition. So: the influence economy is <i>skill-testing</i>, which is good — but yellow still holds a real
        structural edge, which is the thing to fix.
      </P>

      <H2 id="balance">5 · Balance proposals, ranked</H2>
      <P>
        Ordered by how gently they touch the design. The first three are <b>config edits</b> (card numbers / rules parameters) — you can try each
        tonight and rerun the simulator; no programmer required.
      </P>
      <Card>
        <b className="font-display text-parchment">1. Trim the free Influence on yellow's vanilla guards.</b> <span className="text-xs text-dim">(a card edit)</span>
        <P>
          Five wall units (Vanguard Sentinel, Sunguard Defender, Bulwark Protector, Justicar Enforcer, Custodian of Law)
          gain Influence just for entering play — that's up to +7 across a game for doing what yellow does anyway.
          Cut the "+1"s (keep the +2s on the expensive ones), and yellow's Influence income comes from <i>choices</i> —
          imprisoning, healing, Dawnspear attacks — not existence. The spreadsheet's own note ("give it influence when
          it guards in home") suggests the designer already wanted these conditional.
        </P>
      </Card>
      <Card>
        <b className="font-display text-parchment">2. Pay red back for aggression.</b> <span className="text-xs text-dim">(a card edit)</span>
        <P>
          Red ships Influence to the opponent with every action but has no way to pull it back. Give its identity a
          matching earn: e.g. Berserker/Doombringer-class units gain 1 Influence on kills, or "Breakthrough damage to a
          base also shifts 1 Influence your way" on 2–3 big units. Under the hood these are one-line effect additions the
          card editor already accepts (an <i>onKill</i> / <i>onAttackBase</i> influence op).
        </P>
      </Card>
      <Card>
        <b className="font-display text-parchment">3. Raise the Influence gate.</b> <span className="text-xs text-dim">(one rules number)</span>
        <P>
          Threshold 15 → 18 or 20. Blunt but instantly testable: it delays yellow's inevitability clock several turns
          without touching a card. Pairs well with #1; check the Simulator's heuristic mirror before/after — you're
          looking for red in the 45–50% band and a healthy life/influence win mix.
        </P>
      </Card>
      <Card>
        <b className="font-display text-parchment">4. Make Overextend hurt red's body, not its argument.</b> <span className="text-xs text-dim">(engine: small)</span>
        <P>
          The June spreadsheet's version of Overextend was self-damage ("swing for 5, take 2 after"). Moving action-Overextend
          from "cede Influence" to "lose N÷2 Life, rounded up" keeps the recklessness flavor, stops red from feeding yellow's
          win condition, and makes Bloodfrenzy/Last Stand's low-life theme suddenly coherent. My pick for the most
          <i>interesting</i> fix — but it's a mechanics change, so it goes through a design conversation first.
        </P>
      </Card>
      <Card>
        <b className="font-display text-parchment">5. Influence win requires holding it.</b> <span className="text-xs text-dim">(engine: small)</span>
        <P>
          Reaching ±15 doesn't win immediately; you win at the start of your next turn if you're still there. Adds one
          full round of counterplay drama ("break the prison, burn the track!") and softens threshold snipes. Great with
          spectators watching.
        </P>
      </Card>
      <P>
        Suggested sequence: apply #1 + #3, rerun 200 heuristic-mirror games in the Simulator, then decide whether #2 or
        #4 carries the rest. Human playtests trump every number here.
      </P>

      <H2 id="art">6 · Card art pipeline</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI><b>Today:</b> the 84 printed cards use art cropped from your original deck-sheet images. Any card <i>without</i> art gets a <b>procedurally generated illustration</b> — a tiny algorithm turns the card's name into a seed and draws layered geometry in the faction's palette (units get blade-sigils, actions get bursts, upgrades get rings). Same card, same art, forever; zero cost; new cards are art-complete the second they're saved.</LI>
        <LI><b>With an image model hooked up:</b> the natural upgrade is generate-on-create — when a card is forged in the admin, a prompt assembled from its name/color/type/text goes to an image API and the result becomes its art (procedural stays as the instant placeholder while it renders). Cost is per-card and tiny at this scale.</LI>
        <LI><b>Pre-generating a big library (the thousand-image idea):</b> possible, but blind bulk generation mostly buys mismatches — art gets its charm from fitting the card. The middle path that works well: generate <i>themed pools</i> (~30–50 per faction/type) and let the admin pick from a gallery, regenerating per card once names stabilize. Worth revisiting the moment the card list stops moving.</LI>
      </ul>

      <H2 id="limits">7 · Honest limitations</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI>The AI is a one-move greedy baseline — good enough to playtest against and to power simulations, nowhere near a skilled human. Balance conclusions above carry that asterisk.</LI>
        <LI>Ranged/Reach barely exist in these two decks (one card each) — those keyword rulings are effectively untested by play.</LI>
        <LI>Multi-unit attacks, the June spreadsheet's Stack/modal cards, colored resource costs, mulligans: all consciously out, awaiting design.</LI>
        <LI>This is a standalone, client-side demo. Networked multiplayer is a later build — fine on one machine for two friends, with a scaling pass before anything like "community gaming".</LI>
      </ul>

      <H2 id="playtest">8 · How to playtest with this page</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI><b>Play</b> — hotseat both sides (the designer-as-both mode from the brief), fight the AI, or watch two bots to feel the pacing. Cards flagged <Flag /> show their ruling on hover.</LI>
        <LI><b>Log everything:</b> every game offers <i>Copy chronicle</i> (human-readable play-by-play) and <i>Download game file</i> (seed + every action — a perfect replay). Send those files with your notes; the seed alone lets us re-watch your exact game.</LI>
        <LI><b>Simulate</b> — rerun this report's numbers, or your own matchups, in thousands. Download the JSON and mark it up.</LI>
      </ul>

      <p className="mt-12 border-t hairline pt-4 text-xs text-dim">
        Sources: docs/DESIGN/DECISIONS.md (all 30 rulings with reasons) · docs/SPECS/game-rules.md (the precise ruleset)
        · docs/GAME-FLOW.md (narrative rules) — all in the project repository. Engine + this page share one codebase;
        the numbers shown were produced by the same simulator you can run in the next tab.
      </p>
    </div>
  )
}
