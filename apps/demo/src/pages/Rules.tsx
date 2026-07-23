import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RULES_VERSION } from '@newgame/engine'
import { iconFor } from '@ui/game/gloss.ts'

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="mt-10 scroll-mt-4 border-b hairline pb-2 font-display text-2xl font-bold text-parchment">{children}</h2>
)
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-relaxed text-body/90">{children}</p>
const LI = ({ children }: { children: ReactNode }) => <li className="mt-1.5 leading-relaxed text-body/90">{children}</li>
const B = ({ children }: { children: ReactNode }) => <b className="text-parchment">{children}</b>
const Card = ({ children }: { children: ReactNode }) => <div className="panel mt-4 p-4">{children}</div>

// [engine keyword id, printed name, the rules line]. The id pulls the card symbol out of the
// one gloss source (#114) — a player who sees 🏹 on a card can find 🏹 here and learn what it means.
const KEYWORDS: [string, string, string][] = [
  ['armor', 'Armor N', 'Every hit this unit takes is reduced by N — and combat resolves in separate pairings, so N comes off each attacker’s blow individually. Two exceptions arrive as one combined hit, shrunk by N once: a gang of blockers striking back at their attacker, and multiple unblocked attackers landing on the same target.'],
  ['breakthrough', 'Breakthrough', 'When this attacker DEFEATS what it strikes, the leftover damage splashes onward — and the DEFENDER chooses where it lands: another of their units in that zone, or their base when the fight is in their own Home. Defeat that one too and the rest chains to their next pick, link after link, until a unit survives and soaks it or nothing is left to hit. Plain (non-Breakthrough) damage never chains. A Shield or Ward turns the whole blow aside and ends the chain. No number, no cap: everything spills.'],
  ['cantAttack', 'Can’t attack', 'A defensive body — it can hold a zone and block, but never attacks.'],
  ['capture', 'Capture', 'On its trigger, this unit takes an enemy unit under itself — off the board entirely. Holding costs nothing, and there is no letting go: the captive returns only when the capturer leaves play, coming back to that zone ready. Capture is custody, not a wound — and killing the jailer frees the prisoner.'],
  ['guard', 'Guard', 'The bodyguard. When a single unit attacks one of yours, only a READY Guard may step in front of the target — one Guard, taking the whole hit. Two Guards can’t gang a lone attacker, and an exhausted Guard can’t block at all. (Attacks on your base are different: anyone may block those.) A Guard never exhausts to block, in duels or gangs — it stays ready, so it can block now and still take its own turn.'],
  ['hidden', 'Hidden', 'While this unit is ready, enemy actions can’t target it and enemy attacks can’t be declared at it. It can still block — blocking isn’t being targeted — but anything that exhausts it (attacking, blocking, a Sneak) reveals it until it readies again. Strike, vanish, repeat. One limit: Hidden beats choices, not consequences — effects that don’t choose (“all”, whole-zone damage, automatic picks) still reach it.'],
  ['infiltrate', 'Infiltrate', 'May be played into any zone — not just your Home.'],
  ['tribune', 'Tribune', 'A Tribune changes its controller’s Life just by taking the field or leaving it: gain 1 Life every time it enters play — whether it is deployed from hand or returns from capture — and lose 1 Life every time it leaves play, whether it is defeated or captured. It keys off the event, not the reason, so over a Tribune’s whole life the change nets to zero and cannot be farmed (a capture’s −1 Life and its release’s +1 Life cancel). Separately, at the end of each round, count your Tribunes: hold the majority in the Neutral zone and gain 1 Life per Tribune; hold the majority in your enemy’s Home zone and gain 2 Life per Tribune — the two stack, so holding both is worth 3 Life per Tribune. “Majority” means strictly more of your units than the opponent’s in that zone; a tie is not a majority.'],
  ['sentry', 'Sentry', 'A printed Sentry may be played only into Neutral. It cannot attack or make a normal move, but it may block normally, and blocking does not exhaust it. While it is ready, enemy units in its zone cannot make a normal move toward its controller’s Home; they may retreat. A ready Sentry in its controller’s Home prevents attacks on that base. Card effects can move Sentries, and cards may grant Sentry in any zone. It does not intercept a lone attack unless it also has Guard.'],
  ['steadfast', 'Steadfast N', 'The first time this unit defends each round — by blocking or being attacked — its controller gains N Hope.'],
  ['ranged', 'Ranged N', 'An ability used as your turn: exhaust this unit to deal N damage to one enemy unit in any zone — the volley. It’s a chosen shot, so a ready Hidden unit refuses it, and a lethal volley counts as a kill. The unit’s regular attacks are ordinary in every way: same zone, blockable, bases included. Archers carry small blades and big bows.'],
  ['rush', 'Rush', 'A static ability: this unit’s first move each round is free — that one move doesn’t exhaust it, so it can reposition and still fight. One free move per round, and it refreshes every round the unit stays in play; a second move the same round exhausts it like any unit. It grants no extra action and never lets the unit attack any sooner.'],
  ['scar', 'Scar', 'Gets +1 Power for each damage marked on it — no cap. A 3-Health unit with 2 damage gets +2. Every wound is fuel; the closer to death, the harder it hits.'],
  ['shielded', 'Shielded', 'Arrives with a shield token. The first time it would take damage, the whole hit is prevented and the token is spent.'],
  ['sneak', 'Sneak', 'An ability you use as your turn: exhaust the unit to resolve its printed Sneak effect on something in its own zone — a unit or the base. Each card’s text says what its Sneak does.'],
]

export function Rules() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-[15px]">
      <p className="text-xs uppercase tracking-[0.2em] text-dim">New Game · Rulebook · v{RULES_VERSION}</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-parchment">How to Play</h1>
      <P>
        Everything you need to sit down and play, the game as it stands today. Want to try it while you read? The{' '}
        <Link className="text-goldbright underline" to="/play">Play</Link> tab runs the full rules in your browser,
        and every card’s exact text is in the <Link className="text-goldbright underline" to="/cards">Cards</Link> tab.
      </P>

      <H2 id="win">Winning the game</H2>
      <P>You win the instant either of these happens (checked after every single change):</P>
      <ul className="ml-5 list-disc">
        <LI><B>Life:</B> your opponent’s Life hits <B>0</B>.</LI>
        <LI><B>🕊️ Hope:</B> your own Hope reaches <B>+12</B>, or your opponent’s reaches <B>−12</B>. Each player has a separate Hope track.</LI>
      </ul>
      <P>
        <B>If outcomes happen together:</B> if a single event would drop both players to 0 Life at once, the player who
        took the action wins. If both players would win at once, the player whose action triggered the result wins.
      </P>

      <H2 id="setup">The setup</H2>
      <p className="mt-4 font-display text-lg font-semibold text-goldbright">1 · The board and your cards</p>
      <P>Three zones sit in a line. Units march one step at a time between them:</P>
      <Card>
        <div className="text-center font-display text-parchment">[ Your Home ] — [ Neutral ] — [ Their Home ]</div>
      </Card>
      <ul className="ml-5 mt-3 list-disc">
        <LI><B>Adjacent</B> zones are the ones touching on the line. The two Home zones are <B>not</B> adjacent to each other — you have to cross Neutral.</LI>
        <LI>Your <B>base</B> is you. It starts at <B>24 Life</B>, lives in your Home zone, and takes Life damage. An enemy can only attack it from <B>inside your Home zone</B>.</LI>
        <LI>Off to the side you keep your <B>deck</B> (face down), <B>hand</B> (hidden), <B>resource row</B> (face up), and <B>discard</B> (face up).</LI>
      </ul>

      <ul className="ml-5 list-disc">
        <LI><B>Units</B> have <B>Power</B> (damage they deal) and <B>Health</B>. They stay on the board, hold zones, and fight.</LI>
        <LI><B>Actions</B> resolve their effect once, then go to the discard.</LI>
        <LI><B>Upgrades</B> attach to a unit and change it — most buff one of yours, though a few (like Subjugate) clamp onto an enemy to weaken it. If the wearer dies, the upgrade survives — it stays in that zone, <B>orphaned</B>, and either player may later spend a turn to <B>salvage</B> it back onto a valid unit in that zone by paying its full cost (resources <i>and</i> pips) again. A fallen champion’s sword is anyone’s prize.</LI>
      </ul>
      <P>Every card has a <B>cost</B>, paid with <B>resources</B>, and may have colored <B>pips</B>, a check on what your bank contains (both below). Cards can carry <B>keywords</B> — the shorthand abilities listed at the bottom of this page.</P>

      <p className="mt-6 font-display text-lg font-semibold text-goldbright">2 · Start the game</p>
      <ul className="ml-5 list-disc">
        <LI>Each deck is <B>48+ cards</B>, at most <B>4 copies</B> of any card.</LI>
        <LI>Draw <B>7</B>. Don’t like your hand? <B>Mulligan</B> as many times as you like — each redraw gives you one fewer card (down to the 2 you must bank).</LI>
        <LI>Then <B>bank 2 cards</B> from your hand face-up as your starting resources (you pick which — a real choice).</LI>
        <LI>A coin flip gives one player the <B>🥇 Regroup marker</B>. That player takes the first turn of round 1. Then the action begins (see below).</LI>
      </ul>

      <p className="mt-6 font-display text-lg font-semibold text-goldbright">3 · Resources and playing cards</p>
      <P>
        A card is <B>ready</B> when it can act. To <B>exhaust</B> a card, turn it sideways; it normally cannot act again
        until the next round.
      </P>
      <ul className="ml-5 list-disc">
        <LI>Each resource pays <B>1</B> toward a card’s cost. To play a cost-3 card, <B>exhaust 3</B> ready resources — <B>any</B> 3; color never matters for payment.</LI>
        <LI>Resources are <B>permanent</B> — the banked card is gone for good, but it pays every round forever. Banking is your economy; most rounds, bank.</LI>
        <LI>A <B>unit enters ready</B> — it can move or attack that same round (each of those still exhausts it as usual). Upgrades attach to a friendly unit — though a rare card clamps onto an enemy instead.</LI>
      </ul>
      <p className="mt-5 font-display text-lg font-semibold text-goldbright">Colors and pips</p>
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
      <Card>
        <B>Example: cost and pips are separate.</B>
        <P>
          Suppose your bank holds three cards: one with a red pip, one with a red-and-yellow pip, and one with no pips.
          You can spend <B>any three</B> of them to play a cost-3 card. A card needing <B>two red pips</B> is legal too,
          because two separate banked cards provide red. A card needing <B>three red pips</B> is not legal yet — even if
          one of your red cards prints several red pips, it provides only one red source.
        </P>
      </Card>

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
      <P>From <B>round 2 onward</B>, upkeep runs <B>one player at a time</B> — the player holding the <B>🥇 Regroup marker first</B>, all the way through, then the opponent. Readying and drawing happen on their own; <B>banking is a decision</B>:</P>
      <ul className="ml-5 list-disc">
        <LI><B>Ready</B> all your cards (units and resources untap).</LI>
        <LI><B>Draw 2</B> cards. (Drawing from an empty deck costs you 1 Life and 1 of <i>your</i> Hope per missing card — slow decks have a clock.)</LI>
        <LI>You may <B>bank one card</B> from hand as a new resource, or skip.</LI>
      </ul>
      <P>
        Order matters here. The holder banks <B>first — and blind</B>, before the opponent has drawn or banked a thing. The
        opponent banks <B>second, having already seen</B> what the holder laid down, and can answer it. First to the
        Regroup marker, first to commit.
      </P>
      <Card>
        <B>The exact order, step by step.</B>
        <ol className="ml-5 mt-2 list-decimal">
          <LI><B>Regroup-marker holder, in full:</B> ready → draw 2 → bank one or skip. This bank is <B>blind</B> — the opponent hasn’t drawn or banked yet.</LI>
          <LI><B>Then the opponent, in full:</B> ready → draw 2 → bank one or skip — now <B>seeing</B> the resource the holder just banked, and free to answer it.</LI>
        </ol>
      </Card>
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
        The player holding the <B>🥇 Regroup marker takes the first turn</B>, then you <B>alternate turns</B>. On your turn you take exactly
        <B> one</B> action:
      </P>
      <ul className="ml-5 list-disc">
        <LI><B>Play a card</B> · <B>Move a unit</B> · <B>Attack</B> · <B>Use an ability</B> (a Sneak, or a Ranged volley) · <B>Salvage an orphaned upgrade</B> · <B>Regroup</B> · <B>Pass</B>.</LI>
      </ul>
      <P>
        There’s no cap on how many turns you take in a round — the limit is your resources and your ready units.
        <B> Passing is soft:</B> if your opponent takes a turn after you passed, you’re back in. <B>Two passes in a row
        end the round</B>, and the next round begins.
      </P>
      <Card>
        <B>Regroup.</B>
        <P>
          Whoever holds the <B>🥇 Regroup marker</B> takes the <B>first turn</B> of each round. <B>Regrouping</B> is itself a
          turn: you take the marker and are <B>done for the rest of this round</B>. Your opponent then keeps taking turns —
          <B> one after another, alone</B> — until they pass, and that <B>single</B> pass ends the round (the "two passes in a row"
          rule needs two players still in it). Your reward: the token <B>stays with you</B> and hands you the <B>first turn next
          round</B>. It’s a tempo trade — bow out early to guarantee the opening move next round. Only <B>one player can Regroup each round</B>;
          if nobody regroups, the marker stays with its current holder.
        </P>
      </Card>

      <H2 id="move">Moving</H2>
      <P>
        Moving a unit sends it <B>one adjacent zone</B> (Home ↔ Neutral ↔ their Home) and <B>exhausts</B> it — so a unit <i>marches or
        fights</i> in a round, not both. Exception: a unit with <B>Rush</B> gets <i>one</i> free move (no exhaust) each round — so it can reposition and still fight.
      </P>

      <H2 id="combat">Combat</H2>
      <P>An attack is <B>one action</B>, and you can swing with a whole squad at once. The fight resolves in <B>pairs</B> — the defender decides who stands in front of whom:</P>
      <Card>
        <B>Combat in three steps.</B>
        <ol className="ml-5 mt-2 list-decimal">
          <LI><B>Declare:</B> choose your ready attackers and name one target.</LI>
          <LI><B>Block:</B> the defender assigns any legal ready blockers.</LI>
          <LI><B>Resolve:</B> every pairing deals damage at once; anyone left unblocked hits the declared target.</LI>
        </ol>
      </Card>
      <ul className="ml-5 list-disc">
        <LI><B>Declare.</B> Pick <B>one or more of your ready units in the same zone</B> — they all exhaust. Choose one target: an enemy unit in their zone, or the enemy <B>base</B> (only if your attackers stand in the enemy’s Home).</LI>
        <LI><B>Block — the duel law.</B> A <B>single attacker striking a unit cannot be blocked</B>, with one exception: a <B>ready Guard</B> in the zone may step in front of the target — <B>one Guard, taking the entire hit</B> (two Guards can’t gang a lone attacker, and an exhausted Guard can’t block at all). <B>The base is everyone’s to defend:</B> a lone attacker striking a <B>base</B> faces the open window — any ready unit may block it. Duels are personal; sieges are everyone’s problem. Attack with <B>two or more</B> and the defense opens up: the defender may pair any of their <B>ready units in that zone</B> onto your attackers — one-on-one, or ganging up, though <B>each blocker answers only one attacker</B> — trading your gang's power for their choice of who gets stopped. The declared target may block its own attacker in a gang. Blocking <B>exhausts</B> the blocker — except a <B>Guard, who blocks for free and stays ready</B>, able to take its own turn after.</LI>
        <LI><B>Resolve — every pairing at once.</B> Each attacker deals its Power to its blocker, and a gang of blockers deals its <B>combined</B> Power back to their attacker. In a gang block the attacker’s damage <B>pours in pair order</B> — fill the first blocker, spill into the second — so the defender controls the split. Armor shrinks each hit it faces. Attackers <B>nobody blocked</B> (including every lone attacker no Guard answered) deal their full Power to the declared target — <B>and the target strikes back, exhausted or not</B>. Its Power is a single pool <B>poured across the unblocked attackers</B> — biggest threat first, or in the defender’s chosen order — felling as many as it can pay for before it runs dry. A <B>lone attacker takes the whole blow; a gang splits it</B> (a 5-Power wall ganged by three 2/2s fells two and wounds the third, not all three). No unit strikes without an answer. (A base never strikes back.) A <B>kill credits whoever's damage landed it</B> — blockers included; a walled-off attacker earns nothing from its allies' kills.</LI>
      </ul>
      <P>
        <B>Breakthrough</B> won’t let damage stop at a corpse. When such an attacker <B>defeats</B> what it strikes,
        the leftover <B>splashes onward</B> — and the <B>defender chooses where it lands</B>: another of their units in
        that zone, or (when the fight stands in their own <B>Home</B>) their <B>base</B>. Defeat that link too and the
        rest <B>chains</B> to the defender’s next pick, on and on, until a unit <B>survives and soaks it</B> or nothing
        is left to strike. Only Breakthrough chains — plain damage stops at the declared target. A <B>Shield</B> or
        <B>Ward</B> turns the whole blow aside and <B>ends the chain</B>. Damage <B>stays</B> on units between rounds; a
        unit is destroyed when its damage reaches its Health and goes to the discard — leaving any upgrades it wore
        <B>orphaned</B> in the zone, salvageable by either side.
      </P>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <B>Example: a duel</B>
          <P>A 3-Power attacker challenges a 2-Power unit. With no ready Guard, nobody else may block the duel. The attacker deals 3 damage to the target, and the target deals 2 damage back.</P>
        </Card>
        <Card>
          <B>Example: a gang</B>
          <P>Two attackers swing at one enemy unit. The defender may assign ready units to either attacker, one at a time; each blocker can answer only one attacker. This is the moment a defender can choose who gets stopped.</P>
        </Card>
        <Card>
          <B>Example: a base attack</B>
          <P>A lone unit attacks the base from the enemy Home. Any ready defender may block it. If nobody blocks, the attacker deals its full Power to the base’s Life.</P>
        </Card>
      </div>

      <H2 id="hope">🕊️ Hope</H2>
      <P>
        Each player has a <B>separate Hope track</B>, from <B>−12 to +12</B>. Your card effects change <B>your</B> Hope by default. Reach <B>+12</B> to win; fall to <B>−12</B> and you lose. Hope is <B>earned by
        events</B>, never just by sitting there: a guard is paid when it <B>defends</B> — blocking <i>or</i> being the one attacked — a champion when it <B>kills</B>, and some cards pay
        out when <B>played</B>.
      </P>

      <H2 id="keywords">Keywords</H2>
      <P>The shorthand you’ll see on cards. Tap any card in the <Link className="text-goldbright underline" to="/cards">Cards</Link> tab to see its keywords explained in place.</P>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <tbody>
            {KEYWORDS.map(([id, k, v]) => (
              <tr key={k} className="border-t hairline align-top">
                <td className="whitespace-nowrap py-2 pr-4 font-semibold text-goldbright">{iconFor(id)} {k}</td>
                <td className="py-2 text-body/90">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2 id="quick">Quick reference</H2>
      <Card>
        <ul className="ml-5 list-disc">
          <LI><B>Win:</B> enemy to 0 Life, your Hope to +12, or their Hope to −12.</LI>
          <LI><B>Round vs turn:</B> a <B>round</B> is one full cycle; a <B>turn</B> is one action. A round is made of many turns.</LI>
          <LI><B>Round 1:</B> no start step — straight into turns with your opening hand and 2 resources.</LI>
          <LI><B>Every round after:</B> both players ready up, draw 2, bank up to 1 — then take turns until two passes in a row.</LI>
          <LI><B>Your turn:</B> play a card, move (exhausts), attack, use an ability (Sneak or volley), salvage an upgrade, Regroup, or pass.</LI>
          <LI><B>Attack:</B> exhaust your attackers, name one target; the defender pairs blockers onto attackers (blocking exhausts — Guards block free); pairs trade blows at once; unblocked attackers hit the target, and the target strikes back — exhausted or not — its Power poured across the unblocked attackers (a gang splits it; a lone attacker eats it whole).</LI>
          <LI><B>Costs:</B> pay with any resources; colored pips just have to be <i>present</i> in your bank.</LI>
          <LI><B>Base:</B> attack it only from inside the enemy’s Home zone.</LI>
          <LI><B>Regroup:</B> end your round now and take the 🥇 marker, so you take the first turn next round.</LI>
        </ul>
      </Card>

      <p className="mt-10 text-sm text-dim">
        Curious <i>why</i> the rules are the way they are — the assumptions, the balance data, the open questions? That’s the{' '}
        <Link className="text-goldbright underline" to="/audit">Design Audit</Link>.
      </p>
    </div>
  )
}
