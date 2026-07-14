/* The Sellsword's Primer (issue #59, Blaine): a lightweight, deck-agnostic player guide with
   per-color tips, voiced by a player-critic persona — Old Varga, a retired sellsword who has
   fought under all three banners. Versioned: bump PRIMER_VERSION and the "written against"
   line whenever the canon moves under it. Not a perfect guide, on purpose — a strong opinion
   the reader can outgrow. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const PRIMER_VERSION = '1.0'
const WRITTEN_AGAINST = 'rules v3.0 · decisions through 100 · 2026-07-13'

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="mt-10 scroll-mt-4 border-b hairline pb-2 font-display text-2xl font-bold text-parchment">{children}</h2>
)
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-relaxed text-body/90">{children}</p>
const LI = ({ children }: { children: ReactNode }) => <li className="mt-1.5 leading-relaxed text-body/90">{children}</li>
const B = ({ children }: { children: ReactNode }) => <b className="text-parchment">{children}</b>
const V = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-l-2 border-goldbright/40 pl-3 italic leading-relaxed text-body/80">{children}</p>
)
const CardTip = ({ name, tip }: { name: string; tip: string }) => (
  <li className="mt-1.5 leading-relaxed text-body/90"><b className="text-parchment">{name}</b> — {tip}</li>
)

export function Guide() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-[15px]">
      <div className="text-[11px] uppercase tracking-[0.25em] text-dim">Primer v{PRIMER_VERSION} · written against {WRITTEN_AGAINST}</div>
      <h1 className="mt-1 font-display text-3xl font-bold text-parchment">The Sellsword's Primer</h1>
      <p className="mt-2 text-sm italic text-dim">
        Being the collected opinions of <b>Old Varga</b>, who fought eleven years under the red banner,
        four under the yellow, and will not say how long under the purple. She is paid by the page —
        and every mistake this Primer warns against, she has made herself, at least twice. The{' '}
        <Link to="/rules" className="text-goldbright underline decoration-goldbright/40 hover:decoration-goldbright">Rulebook</Link>{' '}
        tells you what's legal; this tells you what's smart.
      </p>

      <H2 id="shape">The shape of a game</H2>
      <V>"Every fight I've ever been in had the same three acts. Learn the acts and you'll stop losing to the clock."</V>
      <P>
        A game runs <B>ten to fourteen rounds</B>. Both players draw two cards every round, so nobody runs dry —
        the loser is the one who spent worse, not the one who drew worse. There are <B>two clocks</B>: 20 life,
        and the influence track at ±15. Beginners watch life. Yellow players watch you watching life.
        Check the influence track <B>every round</B>, the way you'd check your purse in a crowded market —
        by the time you feel it's light, the thief is three streets away.
        Past ±10, every action you take should either speed your clock or slow theirs.
      </P>
      <ul className="ml-5 mt-2 list-disc">
        <LI><B>Rounds 1–3, the muster:</B> bank every round, spend the rest on cheap bodies, take the Neutral zone. Nothing that dies here matters much — position does.</LI>
        <LI><B>Rounds 4–8, the argument:</B> the real trades. Guards get paid, gangs form, removal answers walls. Most games are decided here and end later.</LI>
        <LI><B>Rounds 9+, the bill:</B> hands are short, banks are tall, one good swing or one quiet +2 ends it. If you saved nothing for this act, you already lost in act two.</LI>
      </ul>

      <H2 id="banking">Banking — when, what, and when to stop</H2>
      <V>"The bank is a graveyard that pays interest. Bury your dead, not your soldiers."</V>
      <ul className="ml-5 mt-2 list-disc">
        <LI><B>Bank every round until your bank covers your biggest cost</B> — for most decks that's 6 or 7. You start with 2; banking each round puts you at 6 by round five, right as the argument peaks.</LI>
        <LI><B>Then stop.</B> Every bank past your curve is a card deleted from your late game. The commonest loss I see: a player at twelve resources wondering why their hand is empty in act three. The bank ate their finishers in act one.</LI>
        <LI><B>Bank your worst card, always.</B> A dead draw, the third copy, the situational trick for a situation that passed. Never bank a card you'd be happy to draw in round ten.</LI>
        <LI><B>Mind your pips.</B> A banked card doubles as citizenship papers: a card wanting two red pips needs two distinct red cards living in your bank, ready or spent. Mono-color decks barely notice; the moment you splash, count before you bury.</LI>
        <LI>Skipping the bank is rarely right in acts one and two — and often right in act three, when the card in your hand is worth more than the copper in the ground.</LI>
      </ul>

      <H2 id="attack">Attacking under the duel law</H2>
      <V>"An attack is a promise. The duel law just makes you keep it."</V>
      <ul className="ml-5 mt-2 list-disc">
        <LI><B>A lone attacker on a unit cannot be blocked</B> — except by one Guard, who takes the entire hit and pays nothing for the privilege. So the first question before every solo swing: <B>is there a ready Guard in that zone?</B> If yes, your certainty becomes a donation — the Guard eats the blow, counters, and (if it's yellow) charges a toll. Burn the Guard out first, gang so it can only save one of you, or go where it isn't.</LI>
        <LI><B>The target always hits back</B> — full power, even exhausted. Do the arithmetic in both directions before you swing: <i>my power against their health, their power against my health.</i> Equal trades are for players who are ahead.</LI>
        <LI><B>Gangs open the defense</B> — two or more attackers and the defender pairs freely. That's the price of numbers. But it's also how you beat walls: pour order means their armor shrinks one blow, not three.</LI>
        <LI><B>Bases are always defended ground.</B> Any ready unit may block a base attack, however few you send. A siege works when their board is exhausted or dead — which is why killing a defender isn't just an answer; it's how the gate gets opened.</LI>
        <LI><B>Breakthrough is a siege keyword.</B> Solo, your damage either lands whole or dies on a Guard. In a gang or against blockers, the spill reaches what you actually wanted dead — and <B>in their Home, nothing is left behind</B>: excess past a killed unit target pours into the base itself.</LI>
        <LI><B>Claim the initiative when your hand is spent</B>, or when striking first next round wins you a trade you'd otherwise lose. It ends your round — but your units still defend while you rest, so a claim behind a wall costs less than it looks.</LI>
      </ul>

      <H2 id="defense">Defending — you draw the pairs</H2>
      <V>"Dying well is a skill. Most players never practice it."</V>
      <ul className="ml-5 mt-2 list-disc">
        <LI><B>You choose who fights whom.</B> When a gang comes in, tap a defender to send it in, tap it again to switch which attacker it duels. Feed your cheapest body to their biggest hitter and duel the rest fairly — the classic sellsword's split.</LI>
        <LI><B>Blocking exhausts</B> (Guards excepted) — every unit that blocks is done acting for the round. Sometimes the correct block is none: take three to the base rather than trade your board's whole next round for it.</LI>
        <LI><B>Keep Guards ready.</B> A Guard that attacked is a bodyguard on break. Its whole value is standing there making every solo swing into that zone a bad idea.</LI>
        <LI><B>The counter-blow is real damage.</B> A blocker with high power is removal that waits. Walls with 1 power stop damage; walls with 4 power stop attacks from ever being declared.</LI>
      </ul>

      <H2 id="red">Red — the bill collector</H2>
      <V>"Red doesn't ask twice. Red barely asks once."</V>
      <P>
        <B>The plan:</B> spend every copper on bodies, take the middle, and have the kill on the table by round
        nine or ten. Red buys the cheapest damage in the game and has no patience for the long game. <B>The weakness:</B> yellow gets paid
        every time you attack into a ready defender — a reckless red doesn't lose the fight, it <i>finances</i> the
        opponent's victory. Count what each swing donates. And red owns almost no Guards: your own Home
        holds only because everyone may block base attacks.
      </P>
      <ul className="ml-5 mt-2 list-disc">
        <CardTip name="Inferno Titan (4 · 5/4, Breakthrough, Scar)" tip="the best rate in the deck, and Scar means wounding it is a mistake that compounds. Run four. Yes, four." />
        <CardTip name="Execution Swing (4 · destroy a damaged unit)" tip="'damaged' is a condition you control — one skewer, one volley, one counter-blow, then the Swing. This is how Guards die." />
        <CardTip name="Cataclysmic Charge (2 · +3 Power and Breakthrough this round)" tip="two coppers to turn any body into a siege engine. The card that ends act three." />
        <CardTip name="Bloodfrenzy (3 · upgrade: +1/+1 Armor, grows below 10 life)" tip="red's only apology for taking damage — it pays you back with interest once you're bleeding." />
        <CardTip name="Fiery Impaler (3 · 3/3, skewers on attack)" tip="its skewer chips a second target every swing — Execution Swing fodder, and it pays influence on the kill." />
      </ul>
      <P>
        <B>Deck note:</B> decks are minimum 48, and red rewards curation past it — the designer's own 65-card
        build with full playsets of the cards above outperforms the lean auto-build by ten points in the
        machine's own trials. Playsets of the cheap core beat singletons of everything.
      </P>

      <H2 id="yellow">Yellow — the toll road</H2>
      <V>"Yellow never killed me. Yellow invoiced me until I stopped existing."</V>
      <P>
        <B>The plan:</B> wall the approaches, make every enemy attack a donation, and walk the influence track
        to 15 while they count corpses. Yellow's influence is <B>event-earned</B> — it gets paid when it defends,
        when its knights attack, when its verdicts land. Your job is to force those events on your schedule.
        <B> The weakness:</B> a disciplined red that refuses to feed the tolls and races life instead — and hard
        removal on the wall, which converts your economy back into a fair fight.
      </P>
      <ul className="ml-5 mt-2 list-disc">
        <CardTip name="Gateward Colossus (6 · 3/9, Guard, Armor 2, pays on defend)" tip="the whole strategy in one body. Park it, stay ready, and every solo attack into that zone becomes +1 influence and a bruise." />
        <CardTip name="Dawnspear Paladin (5 · 5/5, +2 influence on attack)" tip="the closer — it wins by swinging, whether or not the swing lands well. Games end at 15 with this card mid-leap." />
        <CardTip name="Exemplar Knight (4 · 4/4, +2 power attacking, pays on kills)" tip="the honest body that punches up a weight class and tips the track doing it." />
        <CardTip name="Prison Warrant (3 · capture a damaged unit, rent every round)" tip="removal that pays a salary. The grip only breaks when the jailer dies — so guard the jailer." />
        <CardTip name="Supreme Sentence (7 · exhaust two units anywhere, 3 damage each)" tip="the verdict: it un-readies whatever was about to matter — Guards lose their vigil, Hidden units lose their veil — and the 3 damage marks two heads for your knights. Yellow's act-three answer." />
        <CardTip name="Radiant Citadel (7 · 1/4, Armor 2, Guard · raises two 0/1 copies of itself)" tip="one cast, three walls. It lands and clones twice — two 0/1 Guards in your Home that can't attack but soak blows and pay when they defend. The copies check the same clause and don't chain; they vanish when they die. A turn-seven fortress that turns one card into a wall of tolls." />
      </ul>

      <H2 id="purple">Purple — the contract killer</H2>
      <V>"The veiled court has no Guards, no walls, and no mercy. You will not see the knife that kills you."</V>
      <P>
        <B>The plan:</B> only pick fights you've already won on paper — and the veil means nobody can pick one with you. <B>Hidden</B> units can't be targeted
        or attacked while ready — so you choose every engagement: strike, stand revealed for a round, ready,
        vanish again. Influence comes <B>by theft</B> — kill triggers, Sneak payloads, and a politician holding
        the middle. <B>The weakness:</B> purple owns zero Guards and thin bodies — your Home stands only because
        anyone may block base attacks, and whole-zone damage ignores the veil entirely. Never build a board
        wider than you can hide.
      </P>
      <ul className="ml-5 mt-2 list-disc">
        <CardTip name="Whisper Blade (1 · 2/1, pays on kills)" tip="a copper knife that funds the track every time it finishes something. The correct round-one play." />
        <CardTip name="Veil Assassin (3 · 4/2, pays on kills)" tip="the rate purple wants: enough power to kill what it touches, too thin to survive being touched. Don't let it be touched." />
        <CardTip name="Dream Thief (5 · 4/4, Hidden, draws on entry, Sneak: +2 influence)" tip="value on arrival, influence while it loiters, a body when you need one. The card that makes slow purple hands work." />
        <CardTip name="Umbral Colossus (6 · 5/5, Hidden, Shielded)" tip="the closest thing to a wall the court owns — the shield eats the first blow, the veil refuses the next." />
        <CardTip name="Sovereign of the Veil (7 · 5/6, Hidden, Infiltrate, Sneak: 4 damage + influence)" tip="lands anywhere, kills from the dark, and gets paid for the privilege. The act-three door-kicker." />
        <CardTip name="Veiled Messenger (2 · 1/3, Politician, draws on entry)" tip="hold the Neutral zone with more bodies than they have and the middle votes purple every round." />
      </ul>

      <H2 id="parting">Varga's parting shot</H2>
      <V>
        "Every loss I've watched at this table was one of four sins: banked the finisher, fed the Guard,
        forgot the second clock, or blocked with the whole village. Sin differently each game and you'll
        be dangerous inside a week. Now buy the next round — I'm paid by the page, and this is the last one."
      </V>

      <footer className="mt-12 border-t hairline pt-4 text-xs text-dim/70">
        <p>
          Primer v{PRIMER_VERSION}, written against {WRITTEN_AGAINST}. The canon moves; when it does, the
          Chronicler re-inks these pages and bumps the version. Numbers herein come from the machine's own
          trials (400-game benchmarks, both seats) — argue with the simulator before you argue with Varga.
        </p>
      </footer>
    </div>
  )
}
