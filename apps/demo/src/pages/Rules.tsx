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
  ['Guard', 'Can step in front of an attack in its zone — for free (it doesn’t exhaust). It no longer forces you to attack it; the defender chooses when to intercept.'],
  ['Armor N', 'Every hit this unit takes is reduced by N. Against a group attack, N is subtracted once from the combined hit.'],
  ['Rush', 'The round it’s played, its first move is free — that one move doesn’t exhaust it, so it can reposition and still fight. Just the one, though: a second move the same round exhausts it like any unit. (Every unit can otherwise act the round it arrives; Rush frees that first move.)'],
  ['Ranged', 'May attack a unit one zone away. Never attacks bases, and takes no counter-damage when it shoots across zones.'],
  ['Reach', 'May attack a unit one zone away like Ranged — but unlike Ranged it can still assault bases and does take counter-damage.'],
  ['Flying', 'May move to any zone, ignoring adjacency.'],
  ['Breakthrough N', 'When your attack destroys a unit, up to N of the leftover damage carries through to its owner’s Life.'],
  ['Overextend N', 'Optional when attacking: +N Power now, but the unit takes N damage at the end of the round. A gamble.'],
  ['Can’t attack', 'A defensive body — it can hold a zone and use Guard, but never attacks.'],
  ['Untargetable', 'Cannot be chosen by your opponent’s action cards.'],
]

export function Rules() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-[15px]">
      <p className="text-xs uppercase tracking-[0.2em] text-dim">New Game · Rulebook · v2.1 · 2026-07-09</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-parchment">How to Play</h1>
      <P>
        Everything you need to sit down and play, the game as it stands today. Want to try it while you read? The{' '}
        <Link className="text-goldbright underline" to="/play">Play</Link> tab runs the full rules in your browser,
        and every card’s exact text is in the <Link className="text-goldbright underline" to="/cards">Cards</Link> tab.
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
        <LI><B>Upgrades</B> attach to one of your units and buff it.</LI>
      </ul>
      <P>Every card has a <B>cost</B>. You pay it with <B>resources</B> (below). Cards can carry <B>keywords</B> — the shorthand abilities listed at the bottom of this page.</P>

      <H2 id="setup">Setting up</H2>
      <ul className="ml-5 list-disc">
        <LI>Each deck is <B>48+ cards</B>, at most <B>4 copies</B> of any card.</LI>
        <LI>Draw <B>7</B>. Don’t like your hand? <B>Mulligan</B> as many times as you like — each redraw gives you one fewer card.</LI>
        <LI>Then <B>bank 2 cards</B> from your hand face-up as your starting resources (you pick which — a real choice).</LI>
        <LI>A coin flip decides who holds the <B>initiative</B> first. Then round 1 begins.</LI>
      </ul>

      <H2 id="round">A round, and your turns</H2>
      <P>The game runs in <B>rounds</B>. Each round has two parts — a quick automatic <B>start</B>, then the <B>action loop</B>, where you and your opponent take <B>turns</B>.</P>
      <Card>
        <B>Round vs. turn — the one distinction to hold onto.</B>
        <P>
          A <B>round</B> is one full cycle of the game: both players ready up, draw, and bank, then trade actions
          until both pass. A <B>turn</B> is a <i>single action</i> you take during that loop. So a round is made of
          many turns, and the whole game is a series of rounds.
        </P>
      </Card>

      <p className="mt-4 font-display text-lg font-semibold text-goldbright">1 · Start of the round</p>
      <P>Each player, initiative holder first, does their upkeep automatically:</P>
      <ul className="ml-5 list-disc">
        <LI><B>Ready</B> all your cards (units and resources untap).</LI>
        <LI><B>Draw 2</B> cards. (Drawing from an empty deck costs you 1 Life and 1 Influence per missing card — slow decks have a clock.)</LI>
        <LI>You may <B>bank one card</B> from hand as a new resource, or skip.</LI>
      </ul>

      <p className="mt-4 font-display text-lg font-semibold text-goldbright">2 · The action loop — taking turns</p>
      <P>
        The <B>initiative holder takes the first turn</B>, then you <B>alternate turns</B>. On your turn you take exactly
        <B> one</B> action:
      </P>
      <ul className="ml-5 list-disc">
        <LI><B>Play a card</B> · <B>Move a unit</B> · <B>Attack</B> · <B>Claim the initiative</B> · <B>Pass</B>.</LI>
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
          the opening move next round. Only one claim per round; otherwise the initiative simply carries over to whoever held it.
        </P>
      </Card>

      <H2 id="resources">Resources &amp; playing cards</H2>
      <ul className="ml-5 list-disc">
        <LI>Each resource pays <B>1</B> toward a card’s cost. To play a cost-3 card, <B>exhaust 3</B> ready resources.</LI>
        <LI>Resources are <B>permanent</B> — the banked card is gone for good, but it pays every round forever. Banking is your economy; most rounds, bank.</LI>
        <LI>A <B>unit enters ready</B> — it can move or attack that same round (each of those still exhausts it as usual). Upgrades attach to a friendly unit.</LI>
      </ul>

      <H2 id="move">Moving</H2>
      <P>
        Moving a unit sends it <B>one adjacent zone</B> (Home ↔ Neutral ↔ their Home) and <B>exhausts</B> it — so a unit <i>marches or
        fights</i> in a round, not both. Exception: a unit with <B>Rush</B> gets <i>one</i> free move (no exhaust) the round it arrives — so it can reposition and still fight — and <B>Flying</B> can move to any zone.
      </P>

      <H2 id="combat">Combat</H2>
      <P>An attack is <B>one action</B>, and you can swing with a whole squad at once:</P>
      <ul className="ml-5 list-disc">
        <LI><B>Declare.</B> Pick <B>one or more of your ready units in the same zone</B> — they attack <B>together, as one combined hit</B>. They all exhaust. Choose one target: an enemy unit in their zone, or the enemy <B>base</B> (only if your attackers stand in the enemy’s Home).</LI>
        <LI><B>The defender answers.</B> They may <B>intercept</B> — throw one of their ready units in front to take the hit instead (Guards do this for free) — or <B>let it through</B>.</LI>
        <LI><B>Resolve.</B> The attackers’ Power is added up and lands as a single hit; the target’s Armor is subtracted <B>once</B> (so massing attackers is how you crack an armored wall). The defending unit hits back its full Power to your <B>single strongest attacker</B> (a base hits back nothing). If the hit destroys the target, <B>Breakthrough</B> spills the extra damage onto its owner’s Life.</LI>
      </ul>
      <P>Damage <B>stays</B> on units between rounds. A unit is destroyed when its damage reaches its Health, and goes to the discard.</P>

      <H2 id="influence">Influence</H2>
      <P>
        Influence is <B>one shared track</B> you fight over — gain some and the marker slides toward your <B>+15</B>. It’s <B>earned by
        events</B>, never just by sitting there: a guard is paid when it <B>defends</B>, a champion when it <B>kills</B>, and some cards pay
        out when <B>played</B>. Get it to +15 on your side and you win, even while losing the fight for Life.
      </P>

      <H2 id="prison">Prison</H2>
      <P>
        Some cards <B>imprison</B> an enemy unit: it stays on the board but can’t attack, move, defend, or use abilities. Holding
        prisoners costs the jailer <B>1 Influence each round, per prisoner</B> — and if the jailer’s Influence ever goes <B>negative</B>, all
        their prisons break at once. Caging an army is powerful and expensive.
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
          <LI><B>Each round:</B> both players ready up, draw 2, bank 1 — then take turns until two passes in a row.</LI>
          <LI><B>Your turn:</B> play a card, move (exhausts), attack, claim initiative, or pass.</LI>
          <LI><B>Attack:</B> any number of your ready units in one zone hit together; the defender may intercept; combined Power vs Armor-once; the target strikes back your biggest attacker.</LI>
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
