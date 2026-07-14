import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="mt-10 scroll-mt-4 border-b hairline pb-2 font-display text-2xl font-bold text-parchment">{children}</h2>
)
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-relaxed text-body/90">{children}</p>
const LI = ({ children }: { children: ReactNode }) => <li className="mt-1.5 leading-relaxed text-body/90">{children}</li>
const B = ({ children }: { children: ReactNode }) => <b className="text-parchment">{children}</b>
const Card = ({ children }: { children: ReactNode }) => <div className="panel mt-4 p-4">{children}</div>

const KEYWORDS: [string, string][] = [
  ['Guard', 'The bodyguard. When a single unit attacks one of yours, ONLY a Guard may step in front of the target — one Guard, taking the whole hit. (Attacks on your base are different: anyone may block those.) And it never exhausts to block, in duels or gangs, so it can do it again and still take its own turn.'],
  ['Armor N', 'Every hit this unit takes is reduced by N — and combat resolves in separate pairings, so N comes off each attacker’s blow individually. Two exceptions arrive as one combined hit, shrunk by N once: a gang of blockers striking back at their attacker, and multiple unblocked attackers landing on the same target.'],
  ['Rush', 'The round it’s played, its first move is free — that one move doesn’t exhaust it, so it can reposition and still fight. Just the one, though: a second move the same round exhausts it like any unit. (Every unit can otherwise act the round it arrives; Rush frees that first move.)'],
  ['Ranged N', 'An ability used as your turn: exhaust this unit to deal N damage to one enemy unit in any zone — the volley. It’s a chosen shot, so a ready Hidden unit refuses it, and a lethal volley counts as a kill. The unit’s regular attacks are ordinary in every way: same zone, blockable, bases included. Archers carry small blades and big bows.'],
  ['Breakthrough', 'When this attacker kills its blocker, all the leftover damage pushes through to whatever it was originally attacking — unit or base. And in the OPPONENT\u2019S HOME, nothing is left behind: excess past a killed unit target pours on into their base. No number, no cap: everything spills.'],
  ['Can’t attack', 'A defensive body — it can hold a zone and block, but never attacks.'],
  ['Hidden', 'While this unit is ready, enemy actions can’t target it and enemy attacks can’t be declared at it. It can still block — blocking isn’t being targeted — but anything that exhausts it (attacking, blocking, a Sneak) reveals it until it readies again. Strike, vanish, repeat. One limit: Hidden beats choices, not consequences — effects that don’t choose (“all”, whole-zone damage, automatic picks) still reach it.'],
  ['Infiltrate', 'May be played into any zone — not just your Home.'],
  ['Sneak', 'An ability you use as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone — a unit or the base. Each card’s text says what its Sneak does.'],
  ['Capture', 'On its trigger, this unit takes an enemy unit under itself — off the board entirely. Holding costs nothing, and there is no letting go: the captive returns only when the capturer leaves play, coming back to that zone ready. Capture is custody, not a wound — and killing the jailer frees the prisoner.'],
  ['Shielded', 'Arrives with a shield token. The first time it would take damage, the whole hit is prevented and the token is spent.'],
  ['Scar', 'Gets +1 Power for each damage marked on it — no cap. A 3-Health unit with 2 damage gets +2. Every wound is fuel; the closer to death, the harder it hits.'],
  ['Politician', 'At the end of each round, if this unit stands in the Neutral zone and its owner holds more units there than the opponent, its owner gains 1 Influence — once per round, however many politicians. The middle finally has a constituency: campaign there, hold the crowd, sway the track.'],
]

export function Rules() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-[15px]">
      <p className="text-xs uppercase tracking-[0.2em] text-dim">New Game · Rulebook · v3.0 · 2026-07-11</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-parchment">How to Play</h1>
      <P>
        Everything you need to sit down and play, the game as it stands today. Want to try it while you read? The{' '}
        <Link className="text-goldbright underline" to="/play">Play</Link> tab runs the full rules in your browser,
        and every card’s exact text is in the <Link className="text-goldbright underline" to="/cards">Cards</Link> tab.
        When you know what’s legal and want to know what’s <i>smart</i>, Old Varga’s{' '}
        <Link className="text-goldbright underline" to="/guide">Sellsword’s Primer</Link> is one tab over.
      </P>

      <Card>
        <B>The one-minute version.</B>
        <P>
          Two players, two decks. You each start at <B>20 Life</B>. Play units into three zones, march them at your
          opponent, and attack — reduce their Life to <B>0</B> to win. Or win the other way: tug the shared{' '}
          <B>Influence</B> track to <B>+15 on your side</B>. Players take turns — single actions —
          across shared rounds. That’s the whole shape; the rest is detail.
        </P>
      </Card>

      <H2 id="win">Winning the game</H2>
      <P>You win the instant either of these happens (checked after every single change):</P>
      <ul className="ml-5 list-disc">
        <LI><B>Life:</B> your opponent’s Life hits <B>0</B>.</LI>
        <LI><B>Influence:</B> the shared track reaches <B>+15 on your side</B>. One number sits between you; pulling it to your end wins — even if you’re behind on Life.</LI>
      </ul>
      <P>If a single event would drop both players to 0 Life at once, the player who took the action wins.</P>

      <H2 id="board">The board</H2>
      <P>Three zones sit in a line. Units march one step at a time between them:</P>
      <Card>
        <div className="text-center font-display text-parchment">[ Your Home ] — [ Neutral ] — [ Their Home ]</div>
      </Card>
      <ul className="ml-5 mt-3 list-disc">
        <LI><B>Adjacent</B> zones are the ones touching on the line. The two Home zones are <B>not</B> adjacent to each other — you have to cross Neutral.</LI>
        <LI>Your <B>base</B> is you. It lives in your Home zone; damage to it is Life damage. An enemy can only attack your base from <B>inside your Home zone</B>.</LI>
        <LI>Off to the side you keep your <B>deck</B> (face down), <B>hand</B> (hidden), <B>resource row</B> (face up), and <B>discard</B> (face up).</LI>
      </ul>

      <H2 id="cards">The cards</H2>
      <ul className="ml-5 list-disc">
        <LI><B>Units</B> have <B>Power</B> (damage they deal) and <B>Health</B>. They stay on the board, hold zones, and fight.</LI>
        <LI><B>Actions</B> resolve their effect once, then go to the discard.</LI>
        <LI><B>Upgrades</B> attach to a unit and change it — most buff one of yours, though a few (like Subjugate) clamp onto an enemy to weaken it. If the wearer dies, the upgrade survives — it stays in that zone, <B>orphaned</B>, and either player may later spend a turn to <B>salvage</B> it back onto a valid unit in that zone by paying its full cost (resources <i>and</i> pips) again. A fallen champion’s sword is anyone’s prize.</LI>
      </ul>
      <P>Every card has a <B>cost</B>, paid with <B>resources</B>, and may have colored <B>pips</B>, a check on what your bank contains (both below). Cards can carry <B>keywords</B> — the shorthand abilities listed at the bottom of this page.</P>

      <H2 id="setup">Setting up</H2>
      <ul className="ml-5 list-disc">
        <LI>Each deck is <B>48+ cards</B>, at most <B>4 copies</B> of any card.</LI>
        <LI>Draw <B>7</B>. Don’t like your hand? <B>Mulligan</B> as many times as you like — each redraw gives you one fewer card (down to the 2 you must bank).</LI>
        <LI>Then <B>bank 2 cards</B> from your hand face-up as your starting resources (you pick which — a real choice).</LI>
        <LI>A coin flip decides who holds the <B>initiative</B> first. Then round 1 begins — straight into the action (see below).</LI>
      </ul>

      <H2 id="round">A round, and your turns</H2>
      <P>The game runs in <B>rounds</B>. A round has two parts — a quick automatic <B>start</B>, then the <B>action loop</B>, where you and your opponent take <B>turns</B>. (Round 1 is the exception: it skips the start entirely — more in a moment.)</P>
      <Card>
        <B>Round vs. turn — the one distinction to hold onto.</B>
        <P>
          A <B>round</B> is one full cycle of the game: both players ready up, draw, and bank, then trade actions
          until both pass. A <B>turn</B> is a <i>single action</i> you take during that loop. So a round is made of
          many turns, and the whole game is a series of rounds.
        </P>
      </Card>

      <p className="mt-4 font-display text-lg font-semibold text-goldbright">1 · Start of the round</p>
      <P>From <B>round 2 onward</B>, each player, initiative holder first, does their upkeep automatically:</P>
      <ul className="ml-5 list-disc">
        <LI><B>Ready</B> all your cards (units and resources untap).</LI>
        <LI><B>Draw 2</B> cards. (Drawing from an empty deck costs you 1 Life and 1 Influence per missing card — slow decks have a clock.)</LI>
        <LI>You may <B>bank one card</B> from hand as a new resource, or skip.</LI>
      </ul>
      <Card>
        <B>Round 1 has no start step at all.</B>
        <P>
          Setup already gave you everything: your opening hand and your 2 banked resources. So round 1 dives
          straight into the action loop — no readying (nothing’s exhausted yet), no draw, no banking. Your first
          “ready, draw 2, bank” comes at the top of round 2. Round 1 is played from the hand you kept, on exactly
          2 resources — spend them well.
        </P>
      </Card>

      <p className="mt-4 font-display text-lg font-semibold text-goldbright">2 · The action loop — taking turns</p>
      <P>
        The <B>initiative holder takes the first turn</B>, then you <B>alternate turns</B>. On your turn you take exactly
        <B> one</B> action:
      </P>
      <ul className="ml-5 list-disc">
        <LI><B>Play a card</B> · <B>Move a unit</B> · <B>Attack</B> · <B>Use an ability</B> (a Sneak, or a Ranged volley) · <B>Release a captive</B> · <B>Salvage an orphaned upgrade</B> · <B>Claim the initiative</B> · <B>Pass</B>.</LI>
      </ul>
      <P>
        There’s no cap on how many turns you take in a round — the limit is your resources and your ready units.
        <B> Passing is soft:</B> if your opponent takes a turn after you passed, you’re back in. <B>Two passes in a row
        end the round</B>, and the next round begins.
      </P>
      <Card>
        <B>The initiative.</B>
        <P>
          Whoever holds the initiative takes the <B>first turn</B> of each round. <B>Claiming the initiative</B> is itself a turn: you take the token and
          are <B>done for the rest of this round</B> — but you take the <B>first turn next round</B>. It’s a tempo trade: bow out early to guarantee
          the opening move next round. Only one claim per round; otherwise the initiative simply carries over to whoever held it. And note:
          once someone has claimed, the round ends on a <B>single</B> pass — the "two passes in a row" rule needs two players still in it.
        </P>
      </Card>

      <H2 id="resources">Resources &amp; playing cards</H2>
      <ul className="ml-5 list-disc">
        <LI>Each resource pays <B>1</B> toward a card’s cost. To play a cost-3 card, <B>exhaust 3</B> ready resources — <B>any</B> 3; color never matters for payment.</LI>
        <LI>Resources are <B>permanent</B> — the banked card is gone for good, but it pays every round forever. Banking is your economy; most rounds, bank.</LI>
        <LI>A <B>unit enters ready</B> — it can move or attack that same round (each of those still exhausts it as usual). Upgrades attach to a friendly unit — though a rare card clamps onto an enemy instead.</LI>
      </ul>

      <H2 id="pips">Colors &amp; pips</H2>
      <P>
        Some cards carry colored <B>pips</B> beside their cost. Pips are <B>not</B> an extra payment — they’re a{' '}
        <B>presence check</B> on your bank. Playing a card asks two separate questions:
      </P>
      <ul className="ml-5 list-disc">
        <LI><B>Can you pay?</B> Exhaust any resources equal to the cost — payment is color-blind, as above.</LI>
        <LI><B>Do you have the colors?</B> For each color the card has pips in, your bank must <B>contain</B> at least that many cards providing that color. Nothing exhausts for this — the cards just have to be there, ready or spent.</LI>
      </ul>
      <P>
        A banked card <B>provides 1 of each color in its own pips</B>: a card with red and yellow pips provides 1 red{' '}
        <i>and</i> 1 yellow — but a card with four red pips still provides just <B>1 red</B>. Same-color pips never
        stack on the providing side, and pip-less cards provide nothing. So a card demanding three red pips wants
        three <i>separate</i> red cards in your bank: what you bank is your color identity.
      </P>
      <P>
        One sharp edge: a <B>0-cost card can still have pips</B>. Free to pay for — but the gate still applies.
      </P>

      <H2 id="move">Moving</H2>
      <P>
        Moving a unit sends it <B>one adjacent zone</B> (Home ↔ Neutral ↔ their Home) and <B>exhausts</B> it — so a unit <i>marches or
        fights</i> in a round, not both. Exception: a unit with <B>Rush</B> gets <i>one</i> free move (no exhaust) the round it arrives — so it can reposition and still fight.
      </P>

      <H2 id="combat">Combat</H2>
      <P>An attack is <B>one action</B>, and you can swing with a whole squad at once. The fight resolves in <B>pairs</B> — the defender decides who stands in front of whom:</P>
      <ul className="ml-5 list-disc">
        <LI><B>Declare.</B> Pick <B>one or more of your ready units in the same zone</B> — they all exhaust. Choose one target: an enemy unit in their zone, or the enemy <B>base</B> (only if your attackers stand in the enemy’s Home).</LI>
        <LI><B>Block — the duel law.</B> A <B>single attacker striking a unit cannot be blocked</B>, with one exception: a ready <B>Guard</B> in the zone may step in front of the target — <B>one Guard, taking the entire hit</B>. <B>The base is everyone’s to defend:</B> a lone attacker striking a <B>base</B> faces the open window — any ready unit may block it. Duels are personal; sieges are everyone’s problem. Attack with <B>two or more</B> and the defense opens up: the defender may pair any of their <B>ready units in that zone</B> onto your attackers — one-on-one, or ganging up — trading your gang's power for their choice of who gets stopped. The declared target may block its own attacker in a gang; blocking exhausts the blocker — except a Guard, who blocks for free.</LI>
        <LI><B>Resolve — every pairing at once.</B> Each attacker deals its Power to its blocker, and a gang of blockers deals its <B>combined</B> Power back to their attacker. In a gang block the attacker’s damage <B>pours in pair order</B> — fill the first blocker, spill into the second — so the defender controls the split. Armor shrinks each hit it faces. Attackers <B>nobody blocked</B> (including every lone attacker no Guard answered) deal their full Power to the declared target — <B>and the target strikes every unblocked attacker back at full Power, even while exhausted</B>. No unit dies without a fight. (A base never strikes back.) A <B>kill credits whoever's damage landed it</B> — blockers included; a walled-off attacker earns nothing from its allies' kills.</LI>
      </ul>
      <P>
        If an attacker with <B>Breakthrough</B> kills its blocker, the leftover damage pushes through to the original
        target — and <B>in the opponent’s Home, through the target too</B>: excess past a killed unit target pours
        into their base (blockers → target → Home; a shield still eats the whole hit). Damage <B>stays</B> on units between rounds; a unit is destroyed when its damage reaches its Health and
        goes to the discard — leaving any upgrades it wore <B>orphaned</B> in the zone, salvageable by either side.
      </P>

      <H2 id="influence">Influence</H2>
      <P>
        Influence is <B>one shared track</B> you fight over — gain some and the marker slides toward your <B>+15</B>. It’s <B>earned by
        events</B>, never just by sitting there: a guard is paid when it <B>defends</B> — blocking <i>or</i> being the one attacked — a champion when it <B>kills</B>, and some cards pay
        out when <B>played</B>. Get it to +15 on your side and you win, even while losing the fight for Life. (If one blow crosses <i>both</i> finish lines at once, <B>Life wins</B>.)
      </P>

      <H2 id="keywords">Keywords</H2>
      <P>The shorthand you’ll see on cards. Tap any card in the <Link className="text-goldbright underline" to="/cards">Cards</Link> tab to see its keywords explained in place.</P>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <tbody>
            {KEYWORDS.map(([k, v]) => (
              <tr key={k} className="border-t hairline align-top">
                <td className="whitespace-nowrap py-2 pr-4 font-semibold text-goldbright">{k}</td>
                <td className="py-2 text-body/90">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2 id="quick">Quick reference</H2>
      <Card>
        <ul className="ml-5 list-disc">
          <LI><B>Win:</B> enemy to 0 Life, or Influence to +15 your side.</LI>
          <LI><B>Round vs turn:</B> a <B>round</B> is one full cycle; a <B>turn</B> is one action. A round is made of many turns.</LI>
          <LI><B>Round 1:</B> no start step — straight into turns with your opening hand and 2 resources.</LI>
          <LI><B>Every round after:</B> both players ready up, draw 2, bank up to 1 — then take turns until two passes in a row.</LI>
          <LI><B>Your turn:</B> play a card, move (exhausts), attack, use an ability (Sneak or volley), release a captive, salvage an upgrade, claim initiative, or pass.</LI>
          <LI><B>Attack:</B> exhaust your attackers, name one target; the defender pairs blockers onto attackers (blocking exhausts — Guards block free); pairs trade blows at once; unblocked attackers hit the target, and the target hits every unblocked attacker back — exhausted or not.</LI>
          <LI><B>Costs:</B> pay with any resources; colored pips just have to be <i>present</i> in your bank.</LI>
          <LI><B>Base:</B> attack it only from inside the enemy’s Home zone.</LI>
          <LI><B>Claim initiative:</B> end your round now to take the first turn next round.</LI>
        </ul>
      </Card>

      <p className="mt-10 text-sm text-dim">
        Curious <i>why</i> the rules are the way they are — the assumptions, the balance data, the open questions? That’s the{' '}
        <Link className="text-goldbright underline" to="/audit">Design Audit</Link>.
      </p>
    </div>
  )
}
