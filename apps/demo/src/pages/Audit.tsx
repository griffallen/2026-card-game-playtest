import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="mt-12 border-b hairline pb-2 font-display text-2xl font-bold text-parchment">{children}</h2>
)
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-relaxed text-body/90">{children}</p>
const LI = ({ children }: { children: ReactNode }) => <li className="mt-1.5 leading-relaxed text-body/90">{children}</li>
const Card = ({ children }: { children: ReactNode }) => (
  <div className="panel mt-4 p-4">{children}</div>
)

const QUESTIONS = `New Game — the open questions · canon-v1.0 (rules v2.3) · updated 2026-07-10
Answer inline (after each →) and send it back — or answer on the GitHub issue noted per question.

A. THE v3.0 RULES PASS (your feedback — issue #9). Ten blockers before the spec is buildable:

A1. Resource colors: what makes a banked card a "red" resource — its faction color, or pips
    printed on its own cost? →
A2. A card with pips of two colors, banked as a resource, pays as any ONE of its colors,
    chosen when spent — confirm? →
A3. You assign each card's pips yourself in its card file — confirm? →
A4. Blocking: unblocked attackers hit the base in your Home zone. In Neutral, do they hit
    nothing (safe skirmish), or something else? →
A5. Multi-block: who divides the attacker's damage among the blockers — attacker or defender? →
A6. New Breakthrough (no number, pushes all excess): who picks where the spill goes when
    there are options? → ANSWERED (#128, decision 114): the DEFENDER picks. Past a defeated
    target the leftover redirects to a legal target the defender chooses (their own unit in the
    zone, or their base in their Home), chaining on each further defeat until a unit soaks it or
    nothing's left. Shield/Ward end the chain; only the Breakthrough portion chains.
A7. Hidden: can a Hidden (ready) unit block? And attacking exhausts it, so it's exposed until
    it readies — right? →
A8. Sneak = a per-card exhaust ability ("Sneak — [effect]", same-zone target) — confirm? →
A9. Capture: when the capturer dies, does the freed unit come back ready or exhausted? →
A10. Guard: the intercept window is gone under blocking — what should Guard mean now?
     ("must be blocked first"? "blocks an extra attacker"? "must be attacked before the base"?
     retire it?) →

B. STILL OPEN FROM canon-v1.0 (naming + mulligans: answered Jul 10, decisions 57–58 — thanks!):

B1. Regrouping — you give up the rest of your round to act first next round. Does the
    trade ever feel good? (issue #7) →
B2. Hope upsets land in 4–10% of mixed bot games and 23% of yellow mirrors — the track
    matters when both players court it. Intended, or should it press harder everywhere? (issue #6) →
B3. Every card carries its redesign notes ("Design notes" on the card, ⓘ / right-click in game).
    Veto anything. (issue #4) →
B4. The purple deck: adopt, revise, or shelve? (issue #5) →`

function QuestionsForYou() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(QUESTIONS).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }).catch(() => {})
  }
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <b className="font-display text-parchment">The open questions — one list, nothing stale.</b>
        <button
          onClick={copy}
          className="shrink-0 rounded border hairline px-2.5 py-1 text-xs text-dim transition-colors hover:text-goldbright"
        >{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <p className="mt-2 text-[13px] text-dim">
        Each question also lives as a GitHub issue (numbers inline) — answering on the thread is best;
        this copy-paste block works when you'd rather not log in.
      </p>
      <pre className="mt-3 max-h-[460px] overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono text-[12.5px] leading-relaxed text-body/90">{QUESTIONS}</pre>
    </Card>
  )
}

function BalanceRow({ label, a, b, c }: { label: string; a: ReactNode; b: ReactNode; c: ReactNode }) {
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
      <p className="text-xs uppercase tracking-[0.2em] text-dim">New Game · Design Audit · canon-v1.0 (rules v2.3) · 2026-07-10</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-parchment">The State of the Game</h1>
      <div className="mt-4 rounded-md border-2 border-goldbright/60 bg-goldbright/10 p-4 text-[14px] leading-relaxed">
        <b className="text-goldbright">⚑ This page is now an archive.</b> It describes the game as it stood on
        2026-07-10, at the close of the v2.3 era. Since then <b>v3.0 shipped and kept moving</b> — decisions
        59–85 rewrote combat (blockers, retaliation), pips, Capture, Ranged and more, and <b>every open question
        listed below has since been answered</b> (the rulings live in DECISIONS.md and the Rulebook tab).
        Read on for history; read the <b>Rulebook</b> for the game.
      </div>
      <P>
        This page was the <b>current truth</b> of its day: what was locked (the canon), what the simulations said
        about it <i>then</i>, and what was proposed next (the v3.0 rules pass). Every number on this page
        was measured against the rules version in the title. The original prototype audit — three eras of
        history, older sim tables, superseded proposals — is preserved unchanged in the{' '}
        <Link className="text-goldbright underline" to="/audit/archive">historical archive</Link>.
      </P>

      <H2 id="canon">1 · The canon — what's locked</H2>
      <P>
        <b>canon-v1.0</b> is a versioned set: the base rules (<b>v2.3</b>), a <b>charter per deck</b>
        (each color's identity, allowed keywords, and design laws), and the <b>card ledger</b> — one
        editable file per card on GitHub, the single source of truth the engine is built from. The
        anti-drift rule: every card must obey <i>two parents</i> — the base rules and its charter. All 84
        red/yellow cards are reconciled and locked; canons are cut, not frozen — when the rules move, we
        stamp the next version and keep old ones playable for comparison.
      </P>
      <Card>
        <b className="font-display text-parchment">Version line</b>
        <ul className="ml-5 mt-2 list-disc text-[14px]">
          <LI><b>v1.2-proto</b> (Jul 7) — the first playable prototype; per-player turns. <i>Archived.</i></LI>
          <LI><b>v2.0</b> (Jul 8) — shared rounds, Regroup, multi-unit attacks + intercept.</LI>
          <LI><b>v2.1</b> (Jul 9) — Rush capped at one free reposition (playtest catch).</LI>
          <LI><b>v2.2</b> (Jul 9) — prison decay doubled… and lived six hours (see §3's honesty box).</LI>
          <LI><b>v2.3</b> (Jul 9) — decay restored to 1; <b>current</b>. The whole card pool reconciled to canon-v1.0.</LI>
          <LI><b>v3.0</b> (proposed) — your rules pass: see §4.</LI>
        </ul>
      </Card>

      <H2 id="decks">2 · The decks today</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI><b>Crimson Assault (red)</b> — Rush, Breakthrough, the Overextend gamble; wins by Life before inevitability arrives. Never touches the Hope track.</LI>
        <LI><b>Radiant Order (yellow)</b> — Guards that intercept for free, armor, prison (functional today, <b>cut in v3.0</b>), and Hope earned by <i>events</i> — its second win axis.</LI>
        <LI><b>Veiled Court (purple)</b> — a <b>proposal awaiting your verdict</b> (issue #5): ranged assassins, withering curses, kill-earned Hope, placeholder art by design. Fully playable in every mode.</LI>
      </ul>

      <H2 id="balance">3 · Current balance — the only numbers on this page</H2>
      <P>
        Measured on rules v2.3 with the current pool, 300 games per pairing, seats alternating
        (<code>npm run sim:matchups</code> reproduces every cell). <b>Competent play</b> is the greedy
        target-aware bot; <b>random play</b> is the floor.
      </P>
      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-dim">
              <th className="px-3 py-2">Matchup</th>
              <th className="px-3 py-2">Competent play</th>
              <th className="px-3 py-2">Random play</th>
              <th className="px-3 py-2">Hope wins (competent)</th>
            </tr>
          </thead>
          <tbody>
            <BalanceRow label="Red vs Yellow" a={<b>44% / 56%</b>} b="23% / 77%" c="4%" />
            <BalanceRow label="Red vs Purple" a={<b>50% / 50%</b>} b="74% / 26%" c="0%" />
            <BalanceRow label="Yellow vs Purple" a={<b>40% / 60%</b>} b="71% / 29%" c="10%" />
            <BalanceRow label="Red mirror" a="51%" b="49%" c="0%" />
            <BalanceRow label="Yellow mirror" a="51%" b="46%" c={<b className="text-goldbright">23%</b>} />
            <BalanceRow label="Purple mirror" a="49%" b="50%" c="5%" />
          </tbody>
        </table>
      </div>
      <P>
        Three readings. <b>The triangle:</b> under competent play yellow edges red, purple beats yellow,
        red and purple tie — soft rock-paper-scissors. <b>Skill flips it:</b> under random play purple
        collapses (26–29%) and yellow feasts — purple's evasion and curses only work when piloted, while
        yellow punishes neglect. Skill-dependence is itself a deck identity. <b>The Hope axis works
        when courted:</b> 23% of yellow mirrors end on the track; red matchups almost never do.
      </P>
      <Card>
        <b className="font-display text-parchment">⚖ Honesty box: what these numbers can and can't say.</b>
        <p className="mt-2 text-[14px] leading-relaxed text-body/90">
          Sim conclusions are bounded by bot quality — proven twice in one night. The first canon balance
          numbers were measured with a bot that never cast board wipes and mis-valued curses; fixing it
          moved red 20 points <i>with zero card changes</i>, and exposed that v2.2's doubled prison decay
          had been compensating for bot blindness — so v2.3 reverted it. Every number above postdates the
          fix, and the harness carries a standing rule: re-measure everything after any bot change. Bots
          still don't plan ahead; treat all of this as directional. Human playtesting outranks it.
        </p>
      </Card>

      <H2 id="v3">4 · What's proposed — rules v3.0 (your pass, issue #9)</H2>
      <P>
        Your July 8 feedback is parsed, staged, and deliberately <b>unbuilt</b> until ten questions are
        answered — each has more than one defensible reading, and guessing is how rules drift. What it
        changes:
      </P>
      <ul className="ml-5 mt-3 list-disc">
        <LI><b>Colored resource pips</b> — costs carry colored pips that demand matching resources; the economy stops being colorblind.</LI>
        <LI><b>Blocker-pairing combat</b> — attackers strike a zone, the defender assigns blockers 1v1 or in gangs, pairs resolve simultaneously. Replaces the combined-hit + intercept model entirely.</LI>
        <LI><b>Prison: cut.</b> Its successor is <b>Capture</b> — the jail becomes a body on the board (the captive hides under the capturer until it dies or readies).</LI>
        <LI><b>Removed:</b> Overextend, Flying, Reach, untargetable. <b>New:</b> Hidden, Sneak, Capture, Infiltrate, Shielded, Scar — Scar (+1 power per damage marked) reads like red's next identity.</LI>
      </ul>
      <P>
        Status: the draft spec (<code>docs/SPECS/game-rules-v3-draft.md</code>) has every unambiguous part
        written and a marked hole per question. When answers land: spec → build (pips first, combat last)
        → full card re-churn → <b>canon-v2.0</b>. Rules v2.3 stays playable for side-by-side comparison.
      </P>

      <H2 id="questions">5 · The open questions</H2>
      <QuestionsForYou />

      <H2 id="playtest">6 · How to playtest & report</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI><b>Play</b> — hotseat, vs the AI, or watch two bots (with pause/step). Right-click or long-press any card or unit to inspect it — every card redesigned this week explains itself in its Design notes.</LI>
        <LI><b>Log everything</b> — <i>Copy chronicle</i> gives a readable play-by-play <i>and</i> a machine-readable replay block (seed + full game — enough to reproduce the match on its own); <i>Download game file</i> is that same replay as a downloadable JSON. Send either with your notes.</LI>
        <LI><b>Simulate</b> — rerun this page's numbers, or your own matchups, in the Simulator tab.</LI>
      </ul>

      <H2 id="limits">7 · Honest limitations (current)</H2>
      <ul className="ml-5 mt-3 list-disc">
        <LI>The bot is greedy and one-ply — target-aware since this week, but it doesn't plan. Balance numbers are directional, not verdicts.</LI>
        <LI>Purple's art is a deliberate placeholder (the veil motif) until the deck earns real art.</LI>
        <LI>v3.0 is unbuilt; everything playable today is rules v2.3.</LI>
      </ul>

      <p className="mt-12 border-t hairline pt-4 text-xs text-dim">
        Sources: docs/canon/ (CANON index + charters) · docs/SPECS/game-rules.md v2.3 ·
        docs/DESIGN/DECISIONS.md (56 rulings) · docs/PLAYTESTS/001.md (the full sim campaign) ·
        data/cards/ (the ledger) — all in the repository. Historical record:{' '}
        <Link className="text-goldbright underline" to="/audit/archive">the original audit, frozen as written</Link>.
      </p>
    </div>
  )
}
