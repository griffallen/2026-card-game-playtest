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
          <Row icon="☯" title="Influence">One shared tug-of-war track. Reach +15 on your side and you win — even while losing on life. Yellow cards pull it steadily; <b>red's "Overextend N" actions push it N toward your opponent</b>: power now, paid for on the track. Watch it before every red spell.</Row>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Your turn</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="🃏" title="Setup">Each player draws 7 and may <b>mulligan as often as they dare — redrawing one fewer card each time</b> — then <b>chooses 2 cards to bank</b> as starting resources, first player first. Banked cards are gone for good.</Row>
          <Row icon="⏳" title="Empty deck">Every card you fail to draw costs you <b>1 life and 1 influence</b>. Slow decks own a real clock.</Row>
          <Row icon="⬢" title="Bank (resource step)">Tuck one card from hand face-up into your resource row — <i>permanently</i>. Each resource pays 1 toward card costs and refreshes every turn, so banking is +1 spending power per turn, forever. The card itself never comes back. Most turns, bank.</Row>
          <Row icon="↔" title="Then actions alternate">You act, they get a window, you act again… <b>Two passes in a row ends the turn.</b> On your turn you may play cards, move, and attack. <b>On their turn you only get card plays</b> — no attacks or moves. Resources refresh only on <i>your</i> turn, so <b>leaving some unspent is how you keep response plays open on theirs</b> — spend everything and those windows skip past you.</Row>
          <Row icon="🥾" title="Move">A unit may march one adjacent zone (Home ↔ Neutral ↔ their Home) as an action — this exhausts it, so a unit marches <i>or</i> fights each turn. Freshly played units wait a turn unless they have <b>Rush</b>.</Row>
          <Row icon="⚔" title="Attack">One ready unit hits one target in its zone; both deal damage simultaneously, and damage sticks. You can only strike the enemy <b>base</b> (the player) with a unit standing in <i>their</i> Home zone.</Row>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Reading the board</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="⟳" title="Exhausted">Dimmed with a ⟳ — already acted; readies at the owner's next turn.</Row>
          <Row icon="💤" title="Just arrived">Can't attack or move this turn (Rush ignores this).</Row>
          <Row icon="⛓" title="Imprisoned">Can't attack, move, or defend, and its abilities are off. Prisons cost the jailer 1 influence per turn and shatter if the jailer's influence goes negative.</Row>
          <Row icon="🛡" title="Guard">While a ready Guard stands in a zone, attackers there must hit it first — the base included. ◈ is armor: every hit is reduced by that much.</Row>
          <Row icon="⚑" title="Flagged card">A prototype ruling was needed for this card's printed text — hover/long-press to read it.</Row>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Keywords in one line</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-body/90">
          <b>Rush</b> acts the turn it arrives · <b>Breakthrough N</b> spills up to N excess damage onto the owner when it kills ·
          <b> Overextend N</b>: an optional gamble when attacking — +N power now, N self-damage at end of turn ·
          <b> Ranged</b> shoots adjacent zones, never bases · <b>Reach</b> attacks adjacent zones normally.
        </p>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-goldbright">Strategy starters</h3>
        <div className="mt-2 flex flex-col gap-2">
          <Row icon="🔴" title="Playing Crimson (red)">
            Go <i>wide</i> — cheap Rush bodies escort your big threats so enemy imprisons and removal hit the escorts.
            <b> Breakthrough is base damage from any zone</b>: killing their units in Neutral spills onto their life, no march required.
            <b> Overextend only when it converts a kill</b> — the end-of-turn bill is real. Spells must kill their target or hit the base.
          </Row>
          <Row icon="🟡" title="Playing Radiant (yellow)">
            Walls at home, prisons on their best attacker. <b>Your influence is earned, not given</b>: guards pay out when they're
            attacked, so stand where red must swing. Mind the jail upkeep: <b>every prisoner costs you 1 influence per turn</b>.
          </Row>
          <Row icon="⛓" title="The prison economy cuts both ways">
            Imprisoned units draw no counter-damage — but a flooded jail taxes the jailer every turn. If you're red and they love prisons: feed them cheap bodies and bleed the track.
          </Row>
        </div>

        <button className="btn btn-primary mt-5 w-full" onClick={onClose}>Back to the table</button>
      </div>
    </div>
  )
}
