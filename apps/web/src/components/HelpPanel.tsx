import type { ReactNode } from 'react'

const Row = ({ icon, title, children }: { icon: string; title: string; children: ReactNode }) => (
  <div className="flex gap-3">
    <span className="w-7 shrink-0 text-center text-base leading-6">{icon}</span>
    <p className="text-[13px] leading-relaxed text-body/90"><b className="text-parchment">{title}.</b> {children}</p>
  </div>
)

/** Compact rules companion — one screen, opened from the ? button on any table. */
export function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onClick={onClose}>
      <div
        className="panel max-h-[92vh] w-full max-w-xl overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold text-parchment">How to play</h2>
          <button className="text-dim hover:text-body" onClick={onClose}>✕</button>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Winning</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="⚔" title="Life">Drop your opponent to 0 life (both start at 20).</Row>
          <Row icon="☯" title="Influence">One shared tug-of-war track. Reach +15 on your side and you win — even while losing on life. <b>Yellow earns it from events</b> (guards pay when they defend, Exemplar when it kills); red mostly ignores it. Its <b>Overextend</b> is a combat gamble now — self-damage, not an influence cost.</Row>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Your round</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="🃏" title="Setup">Each player draws 7 and may <b>mulligan as often as they dare — redrawing one fewer card each time</b> — then <b>chooses 2 cards to bank</b> as starting resources, initiative-holder first. Banked cards are gone for good.</Row>
          <Row icon="⏳" title="Empty deck">Every card you fail to draw costs you <b>1 life and 1 influence</b>. Slow decks own a real clock.</Row>
          <Row icon="🔄" title="Start of round">Both players, in turn, ready all their cards, <b>draw 2</b>, and may <b>bank one card</b> face-up as a resource (permanent — each pays 1 toward costs, forever). Then the action loop opens.</Row>
          <Row icon="↔" title="Actions alternate">The <b>initiative-holder acts first</b>, then you trade single actions — play a card, move, or attack, in <i>either</i> of your windows. <b>Two passes in a row end the round.</b> Passing is soft: if they act after you passed, your window reopens. Leaving resources unspent keeps response plays open on their windows.</Row>
          <Row icon="⚑" title="Claim initiative">Its own action: take the token and <b>rest for the remainder of this round</b> — but you act <i>first next round</i>. Bail early to seize next round's opening move. Once per round.</Row>
          <Row icon="🥾" title="Move">A unit may march one adjacent zone (Home ↔ Neutral ↔ their Home) as an action — this exhausts it, so a unit marches <i>or</i> fights. Units enter play <b>ready</b> (no waiting a round); <b>Rush</b> lets a unit move the round it arrives without exhausting.</Row>
          <Row icon="⚔" title="Attack">Pick <b>one or more ready units in the same zone</b> — they strike together as one combined hit. Then the defender chooses: <b>intercept</b> (throw a ready unit in front — free if it's a Guard) or let it through. You can only strike the enemy <b>base</b> from inside <i>their</i> Home zone. Massing attackers is the answer to armor — armor is subtracted once from the whole hit.</Row>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Reading the board</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="⟳" title="Exhausted">Dimmed with a ⟳ — already acted; readies at the start of its owner's next round.</Row>
          <Row icon="💨" title="Rush ready">Can move the round it arrived <i>without</i> exhausting — so it can reposition and still fight.</Row>
          <Row icon="⛓" title="Imprisoned">Can't attack, move, intercept, or use abilities. Prisons cost the jailer 1 influence at the start of each round and shatter if the jailer's influence goes negative.</Row>
          <Row icon="🛡" title="Guard">Can <b>intercept an attack in its zone without exhausting</b> — step in front of a targeted ally or the base. (It no longer <i>forces</i> attackers onto it — interception is the defender's choice.) ◈ is armor: every hit is reduced by that much.</Row>
          <Row icon="⚑" title="Flagged card">A prototype ruling was needed for this card's printed text — hover/long-press to read it.</Row>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Keywords in one line</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-body/90">
          <b>Rush</b> moves free the round it arrives · <b>Breakthrough N</b> spills up to N excess damage onto the owner when it kills ·
          <b> Overextend N</b>: an optional gamble when attacking — +N power now, N self-damage at end of round ·
          <b> Ranged</b> shoots adjacent zones, never bases · <b>Reach</b> attacks adjacent zones normally · <b>Guard</b> intercepts free.
        </p>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Strategy starters</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="🔴" title="Playing Crimson (red)">
            Go <i>wide</i> and swing <b>together</b> — a pile of cheap bodies now combines into one hit that overwhelms armor and outraces a single blocker's interception.
            <b> Breakthrough is base damage from any zone</b>: killing their units spills onto their life.
            <b> Overextend only when it converts a kill</b> — the end-of-round bill is real.
          </Row>
          <Row icon="🟡" title="Playing Radiant (yellow)">
            Walls, armor, prisons — but Guard no longer stops an assault by decree; you must <b>choose</b> to intercept (free for guards). <b>Your influence is earned, not given</b>: guards pay out when they defend, so stand where red must swing. Mind the jail upkeep: <b>every prisoner costs you 1 influence per round</b>.
          </Row>
          <Row icon="⛓" title="The prison economy cuts both ways">
            Imprisoned units draw no counter-damage — but a flooded jail taxes the jailer every round. If you're red and they love prisons: feed them cheap bodies and bleed the track.
          </Row>
        </div>

        <button className="btn btn-primary mt-5 w-full" onClick={onClose}>Back to the table</button>
      </div>
    </div>
  )
}
