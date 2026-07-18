import type { ReactNode } from 'react'

const Row = ({ icon, title, children }: { icon: string; title: string; children: ReactNode }) => (
  <div className="flex gap-3">
    <span className="w-7 shrink-0 text-center text-base leading-6">{icon}</span>
    <p className="text-[13px] leading-relaxed text-body/90"><b className="text-parchment">{title}.</b> {children}</p>
  </div>
)

const H = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">{children}</h3>
)

/** The v3.0 edition — the deployed default. Phrasing mirrors the Rulebook tab (issue #23). */
function V3Content() {
  return (
    <>
      <H>Winning</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="⚔" title="Life">Drop your opponent to 0 life (both start at 20).</Row>
        <Row icon="☯" title="Influence">One shared tug-of-war track. Reach +20 on your side and you win — even while losing on life. <b>Yellow earns it from events</b> (Guards pay when they defend); purple profits from kills; red mostly ignores it.</Row>
      </div>

      <H>Your round</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="🃏" title="Setup">Each player draws 7 and may <b>mulligan as often as they dare — redrawing one fewer card each time</b> — then <b>chooses 2 cards to bank</b> as starting resources, initiative-holder first. Banked cards are gone for good.</Row>
        <Row icon="1️⃣" title="Round 1 opens cold">There is <b>no start step in round 1</b> — no ready, no draw, no banking. Your opening hand and starting bank are the whole arsenal; the action loop opens immediately.</Row>
        <Row icon="🔄" title="Start of round (round 2 on)">Both players, in turn, ready all their cards, <b>draw 2</b>, and may <b>bank one card</b> face-up as a resource (permanent — each pays 1 toward costs, forever).</Row>
        <Row icon="⏳" title="Empty deck">Every card you fail to draw costs you <b>1 life and 1 influence</b>. Slow decks own a real clock.</Row>
        <Row icon="⬡" title="Pips and colors">Paying a cost is <b>colorblind</b> — exhaust any resources. A card's <b>pips</b> are a residency requirement instead: one red pip needs a red-providing card <i>living in your bank</i>, ready or spent. Multi-color cards provide every color they show.</Row>
        <Row icon="↔" title="Actions alternate">The <b>initiative-holder takes the first turn</b>, then you <b>take turns</b> — play a card, move, attack, <b>use a Sneak ability</b>, <b>salvage an orphaned upgrade</b>, or pass. <b>Two passes in a row end the round.</b> Passing is soft: if they act after you passed, you can act again.</Row>
        <Row icon="⚑" title="Claim initiative">Its own action: take the token and <b>rest for the remainder of this round</b> — but you act <i>first next round</i>. Once per round.</Row>
        <Row icon="🥾" title="Move">A unit may march one adjacent zone (Home ↔ Neutral ↔ their Home) as an action — this exhausts it. Units enter play <b>ready</b>; <b>Rush</b> gives one free move each round.</Row>
        <Row icon="⚔" title="Attack — the duel law">Exhaust <b>one or more ready units in a zone</b> and name one target. <b>Attack a unit alone and nobody may block</b> — except a ready <b>Guard</b>, who may step in front of the target and take the whole hit (one Guard only). <b>Attack a base</b> and the window is always open — <b>any ready unit may block</b>, however few attack; the base is everyone's to defend. <b>Attack in a gang</b> and the defense opens: the defender pairs ready units onto your attackers freely, and <b>blocking exhausts</b> (Guards block free). Pairs trade blows at once; gang damage pours in pair order. Unblocked attackers hit the declared target full-force — and the target <b>strikes back, even while exhausted</b>: its power is poured across the unblocked attackers (biggest first), felling as many as it can pay for, so a lone attacker eats it whole but a gang splits it. Certainty travels alone; numbers can be answered.</Row>
      </div>

      <H>Combat — who takes what</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="⚔" title="Everything hits back, always">Attacking a unit — or blocking one — means <b>both deal their Power to each other at once</b>, and the defender counters <i>even while exhausted</i>. So the question before any swing is: <b>does my unit survive the counter?</b> Send a 3-Power unit at a 5-Power one and, unless it can soak 5, you hand your own unit away.</Row>
        <Row icon="◈" title="Armor">Shaves its number off <b>every</b> hit the unit takes. A ◈2 unit struck for 5 feels 3.</Row>
        <Row icon="⛨" title="Shield">Eats <b>one whole hit</b> of any size, then the token is gone. It buys a single free trade — spend it against their biggest blow.</Row>
        <Row icon="🛡" title="Guard">The bodyguard: the <b>only</b> unit that may block a lone attacker aimed at another unit, stepping fully in front of it — and it blocks <b>without exhausting</b>. (A base is everyone's to defend, so lone base attacks stay open to all.)</Row>
        <Row icon="💥" title="Breakthrough (red)">When the attacker <b>kills its blocker</b>, the leftover damage doesn't stop — the excess <b>spills through</b> to what it was aimed at (a unit, or the base behind a felled defender in the enemy Home). Chump blocks don't save you.</Row>
        <Row icon="🏰" title="The base never hits back">An unblocked attack on Life is <b>just damage</b> — no counter. Only units strike back; bases don't. That's why racing life can be safer than trading units.</Row>
      </div>

      <H>Reading the board</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="⟳" title="Exhausted">Dimmed with a ⟳ — already acted; readies at the start of its owner's next round.</Row>
        <Row icon="💨" title="Rush ready">Its <b>free move for this round</b> — move <i>without</i> exhausting, then it can still fight. It refreshes every round.</Row>
        <Row icon="⛨" title="Shielded">Carries its shield token: the <b>first</b> hit is prevented entirely, then the ⛨ disappears — what you see is what's live.</Row>
        <Row icon="⛓" title="Captives">A ⛓ on a unit means it holds an enemy unit <b>under it</b>, off the board. The grip breaks only one way: <b>when the capturer dies</b>, the captive returns to that zone, <b>ready</b>. There is no letting go — kill the jailer to free the prisoner.</Row>
        <Row icon="↑" title="Orphaned upgrades">When a unit dies, its upgrades stay <b>lying in the zone</b> as dashed ↑ tokens. Either player may tap one to <b>salvage</b> it onto their own unit there — paying its full cost and pips, as if played.</Row>
        <Row icon="🛡" title="Guard">The <b>bodyguard</b>: the only unit that may block a <b>lone</b> attacker striking a unit — stepping fully in front of the target — and it blocks <b>without exhausting</b>, in duels or gangs. (Lone attacks on a <b>base</b> are open to every ready unit.) ◈ is armor: every hit is reduced by that much.</Row>
        <Row icon="⊘" title="Can't attack">This unit <b>can't attack right now</b> — either its own card forbids it (walls), or an enemy effect <b>disarmed it for the round</b>. It can still move and block.</Row>
        <Row icon="⚑" title="Flagged card">A prototype ruling was needed for this card's printed text — hover/long-press to read it.</Row>
      </div>

      <H>Keywords in one line</H>
      <p className="mt-2 text-[13px] leading-relaxed text-body/90">
        <b>Rush</b> one free move each round · <b>Breakthrough</b> kills its blocker → <i>all</i> excess pushes to the original target (and in the enemy Home, past a killed unit target into the base) ·
        <b> Ranged N</b> exhaust to volley N at any enemy unit, any zone (its attacks are ordinary) · <b>Guard</b> the only block against a lone attacker on a unit (base attacks stay open to all); always blocks free ·
        <b> Hidden</b> while ready it can't be targeted or attacked; exhausting reveals it · <b>Infiltrate</b> deploys to any zone ·
        <b> Sneak</b> exhaust as your turn to use its printed ability · <b>Capture</b> takes a unit under until the holder dies; it returns ready ·
        <b> Shielded</b> first hit prevented · <b>Scar</b> +1 power per damage marked — no cap ·
        <b> Politician</b> at round end +1 Influence per politician for a Neutral majority, +2 each for an enemy-Home majority (they stack).
      </p>

      <H>Strategy starters</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="🔴" title="Playing Crimson (red)">
          Go <i>wide</i> and force bad blocks — every blocker they commit exhausts, and <b>Breakthrough spills everything</b> through a chump block. Unblocked damage is full damage: make every pairing hurt.
        </Row>
        <Row icon="🟡" title="Playing Radiant (yellow)">
          Guards block free — stand them where red must swing and <b>earn influence on every defense</b>. Capture removes the key threat while your grip holds; Shielded walls waste their best hit.
        </Row>
        <Row icon="🟣" title="Playing the Veiled (purple)">
          The rhythm is <b>strike, vanish, repeat</b>: Hidden units can't be touched while ready, and a Sneak exhausts (reveals) you until you ready again. Pick the moment; profit from the kill.
        </Row>
      </div>
    </>
  )
}

/** The classic v2.3 edition — the A/B checkbox and the pre-port multiplayer table. */
function V2Content() {
  return (
    <>
      <H>Winning</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="⚔" title="Life">Drop your opponent to 0 life (both start at 20).</Row>
        <Row icon="☯" title="Influence">One shared tug-of-war track. Reach +20 on your side and you win — even while losing on life. <b>Yellow earns it from events</b> (guards pay when they defend, Exemplar when it kills); red mostly ignores it. Its <b>Overextend</b> is a combat gamble now — self-damage, not an influence cost.</Row>
      </div>

      <H>Your round</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="🃏" title="Setup">Each player draws 7 and may <b>mulligan as often as they dare — redrawing one fewer card each time</b> — then <b>chooses 2 cards to bank</b> as starting resources, initiative-holder first. Banked cards are gone for good.</Row>
        <Row icon="⏳" title="Empty deck">Every card you fail to draw costs you <b>1 life and 1 influence</b>. Slow decks own a real clock.</Row>
        <Row icon="🔄" title="Start of round">Both players, in turn, ready all their cards, <b>draw 2</b>, and may <b>bank one card</b> face-up as a resource (permanent — each pays 1 toward costs, forever). Then the action loop opens.</Row>
        <Row icon="↔" title="Actions alternate">The <b>initiative-holder takes the first turn</b>, then you <b>take turns</b> — play a card, move, or attack, one action each. <b>Two passes in a row end the round.</b> Passing is soft: if they take a turn after you passed, you can act again.</Row>
        <Row icon="⚑" title="Claim initiative">Its own action: take the token and <b>rest for the remainder of this round</b> — but you act <i>first next round</i>. Once per round.</Row>
        <Row icon="🥾" title="Move">A unit may march one adjacent zone (Home ↔ Neutral ↔ their Home) as an action — this exhausts it. Units enter play <b>ready</b>; <b>Rush</b> gives a unit one free move each round.</Row>
        <Row icon="⚔" title="Attack">Pick <b>one or more ready units in the same zone</b> — they strike together as one combined hit. Then the defender chooses: <b>intercept</b> (throw a ready unit in front — free if it's a Guard) or let it through. In a multi-attack, the counter lands on the <b>highest-power attacker</b>. You can only strike the enemy <b>base</b> from inside <i>their</i> Home zone. Massing attackers is the answer to armor — armor is subtracted once from the whole hit.</Row>
        <Row icon="↑" title="Upgrade pressure">A classic-only tax: whenever a unit gains its <b>second (or later) upgrade</b>, your opponent gains 1 Influence. Greed is noticed.</Row>
      </div>

      <H>Reading the board</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="⟳" title="Exhausted">Dimmed with a ⟳ — already acted; readies at the start of its owner's next round.</Row>
        <Row icon="💨" title="Rush ready">Its <b>free move for this round</b> — move <i>without</i> exhausting, then it can still fight. It refreshes every round.</Row>
        <Row icon="⛓" title="Imprisoned">Can't attack, move, intercept, or use abilities. Prisons cost the jailer 1 influence at the start of each round and shatter if the jailer's influence goes negative.</Row>
        <Row icon="🛡" title="Guard">Can <b>intercept an attack in its zone without exhausting</b> — step in front of a targeted ally or the base. ◈ is armor: every hit is reduced by that much.</Row>
        <Row icon="⚑" title="Flagged card">A prototype ruling was needed for this card's printed text — hover/long-press to read it.</Row>
      </div>

      <H>Keywords in one line</H>
      <p className="mt-2 text-[13px] leading-relaxed text-body/90">
        <b>Rush</b> one free move each round · <b>Breakthrough N</b> spills up to N excess damage onto the owner when it kills ·
        <b> Overextend N</b>: an optional gamble when attacking — +N power now, N self-damage at end of round ·
        <b> Ranged</b> shoots adjacent zones, never bases · <b>Reach</b> attacks adjacent zones normally · <b>Guard</b> intercepts free.
      </p>

      <H>Strategy starters</H>
      <div className="mt-2 flex flex-col gap-2">
        <Row icon="🔴" title="Playing Crimson (red)">
          Go <i>wide</i> and swing <b>together</b> — a pile of cheap bodies combines into one hit that overwhelms armor and outraces a single blocker's interception. <b>Overextend only when it converts a kill</b> — the end-of-round bill is real.
        </Row>
        <Row icon="🟡" title="Playing Radiant (yellow)">
          Walls, armor, prisons — but Guard no longer stops an assault by decree; you must <b>choose</b> to intercept (free for guards). Mind the jail upkeep: <b>every prisoner costs you 1 influence per round</b>.
        </Row>
        <Row icon="⛓" title="The prison economy cuts both ways">
          Imprisoned units draw no counter-damage — but a flooded jail taxes the jailer every round. If you're red and they love prisons: feed them cheap bodies and bleed the track.
        </Row>
      </div>
    </>
  )
}

/** Compact rules companion — one screen, opened from the ? button on any table.
 *  Edition follows the rules the table is actually running (issue #23: the help must
 *  describe the game on screen, not a remembered one). */
export function HelpPanel({ onClose, edition = 'v2.3', keyboard = false }: { onClose: () => void; edition?: 'v2.3' | 'v3'; keyboard?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onClick={onClose}>
      <div
        className="panel max-h-[92vh] w-full max-w-xl overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold text-parchment">How to play <span className="text-[12px] font-normal text-dim">· rules {edition === 'v3' ? 'v3.0' : 'v2.3 (classic)'}</span></h2>
          <button className="text-dim hover:text-body" onClick={onClose}>✕</button>
        </div>
        {edition === 'v3' ? <V3Content /> : <V2Content />}
        {keyboard && (
          <>
            <H>Keyboard (#57)</H>
            <p className="mt-2 text-[13px] leading-relaxed text-body/90">
              Every key does exactly what its button does — same guard rails, same confirmations.
              <b> Enter</b> confirms the selected card (Play, or Bank during the bank step) ·
              <b> P</b> passes (a round-ending pass still asks first) ·
              <b> Esc</b> backs out of anything — selection, inspector, confirmation.
              The dangerous ones (End the round, lethal plays, Concede) are click-only on purpose.
            </p>
          </>
        )}
        <button className="btn btn-primary mt-5 w-full" onClick={onClose}>Back to the table</button>
      </div>
    </div>
  )
}
