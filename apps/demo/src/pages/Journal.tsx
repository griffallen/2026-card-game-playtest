/* The Chronicle (Blaine's request, session 010): the session summaries retold as a journal —
   fantasy-voiced, succinct, in the hand of ⚜ The Chronicler. Source of truth for the dry
   versions lives in docs/PROMPTS/SESSION-SUMMARIES/; this page is the illuminated copy. */

interface Entry {
  n: string
  date: string
  title: string
  body: string[]          // paragraphs
  marginal?: string       // a marginal note, as scribes leave
}

const ENTRIES: Entry[] = [
  {
    n: 'I', date: 'the 7th of July', title: 'The First Forging',
    body: [
      `In the beginning there were two scrolls that disagreed. The rules spoke of zones but gave no way to cross them — armies that could never meet — and the combat text quarreled with itself. In one night the contradictions were resolved into a world: movement was invented, thirty rulings were set down and flagged for the designer's later judgment, and a deterministic engine rose beneath a playable table. Eighty-four cards were cut from the old sheets and given form as structured law, so that no future edit could silently break a game.`,
      `The first simulations spoke an omen: under witless play, influence devoured all — the red banner won one game in a hundred. Random is not human, the ledger noted. But watch the influence economy.`,
    ],
    marginal: 'Thirty rulings, all ⚑ — every one of them provisional until the designer sat his throne.',
  },
  {
    n: 'II', date: 'the 8th of July', title: 'Four Defeats, Each a Teacher',
    body: [
      `The builder played four games and lost instructively. He slew himself with his own Final Onslaught at the brink of ruin, and the table learned to warn of lethal plays. He watched imprisoned units become food, watched a telegraphed march die on approach, and the table learned to narrate, to inspect, to explain itself.`,
      `Then the designer's first notes arrived, carried by spreadsheet. Overextend, it transpired, had been misread from the start — his true design was a gambler's bargain of power now for wounds later. And he set down a doctrine that shapes the game still: influence is earned at moments, never granted for merely existing. Guards would be paid when they defend. The economy flipped that same night.`,
    ],
  },
  {
    n: 'III', date: 'the 8th of July, evening', title: 'The Rounds Are Redrawn',
    body: [
      `Turns died and rounds were born. Players would share each round, alternating single deeds until both passed — and the initiative token became a thing worth coveting: claim it, rest for the remainder, and strike first when the sun next rose. Summoning sickness was abolished; units enter the field awake.`,
      `A ghost was found in the ledger: the multi-attack ruling everyone cited had never actually been written. It was drafted properly — attackers massing into one blow, the defender answering with a single interception — and Final Onslaught's "extra turn," meaningless in a world without turns, became the readying of one soldier and one further deed.`,
    ],
  },
  {
    n: 'IV', date: 'still the 8th of July', title: 'Built as Decreed',
    body: [
      `The builder handed over the plans and said: build until it is done. Nine tasks were executed in order, each proven before the next began. Two errors slept inside the plans themselves and were caught rather than copied. Two smiths working the same steel in parallel nearly struck each other's work — one noticed, and deferred, and nothing was lost.`,
      `By morning the new rounds ran everywhere: engine, table, and the teaching surfaces that tell a newcomer what world they have entered.`,
    ],
  },
  {
    n: 'V', date: 'the 9th of July', title: 'The Missing Middle',
    body: [
      `A quieter session, and among the most important: not a rule was changed, but the shape of truth itself was examined. There were three layers — the base laws, each color's nature, and the cards — and only the first and last had ever been written down. The middle was missing, and into that gap the cards had drifted, consistent with nothing because there was nothing to be consistent against.`,
      `The cure was decreed: canon first. Lock the laws, write each color a charter, then churn every card against its two parents. The order of operations became the project's spine.`,
    ],
    marginal: 'Rush was the cautionary tale — a keyword whose cards were written for a world that no longer existed.',
  },
  {
    n: 'VI', date: 'the 9th of July, through the night', title: 'The Night the Canon Was Built',
    body: [
      `The whole program, executed in one sitting. The rules canon closed its open questions. Red and yellow received their charters — the missing middle, made flesh, with statline grammars derived from the actual pool. The card ledger was reforged: one file per card, each with its own history and its own page, so the field the designer edits most would live in the format that treats it best.`,
      `Then all eighty-four cards were churned against their parents, and the drift of months was burned away in an evening.`,
    ],
  },
  {
    n: 'VII', date: 'the 10th of July', title: 'The Designer Takes His Seat',
    body: [
      `Griff arrived, live, and the loop ran hot for the first time. He asked whether a London mulligan would be hard; it was designed, built, tested, and deployed within the hour, and the ledger learned what "if that's easy" means to a designer.`,
      `The great questions of the third age were opened: pips as a color tax, and a new combat where the attacker declares one target and the defender pairs blockers against the assault. Scar was confirmed as Overextend's heir. The State of the Game was rebuilt so that no reader would ever again wonder which numbers were current.`,
    ],
  },
  {
    n: 'VIII', date: 'the 10th of July, until dawn on the 11th', title: 'The Gate Closes — the Third Age Ships',
    body: [
      `The largest single arc the project has known. Griff answered the last questions of the design gate live, posted the five-color charter that every card argument now ends at, and — hours before the code existed — redesigned pips into a presence gate: banked colors as citizenship, never payment. The revision landed before the implementation, which is the loop working precisely as designed.`,
      `Then the build: seven slices, the engine remade, all one hundred twenty cards churned, and v3.0 deployed before dawn. The builder shortened his watch from four minutes to one, because — his words — watching was really fun.`,
    ],
    marginal: 'The night the pips became citizenship.',
  },
  {
    n: 'IX', date: 'the 12th and 13th of July', title: 'The Duel Law',
    body: [
      `A session of twelve rulings, in which the cards taught the engine new words. Final Onslaught demanded a doom that collects after the deed; Unchained Rage, a tax on every attacker; Reckless Abandon brought the letter X into the cost grammar; the Fiery Impaler won the game's first chosen trigger; the Vanguard Sentinel learned to speak its last words as it fell. Scar shed its cap — every wound is fuel now — and capture lost its key: only the jailer's death opens the grip.`,
      `Then the great swing. Weary of chump-soaks, the designer decreed that a lone attacker cannot be blocked — save by one Guard, stepping fully in front, the bodyguard keyword made true. Four hundred games judged it worthy, and on his word — "flip it" — it became canon. One amendment followed within the hour: the Home is everyone's to defend, for the veiled court owns no Guards at all.`,
      `Yellow, long the tyrant of the simulations, was brought to heel: the payout ladder stepped back down, fourteen idle riders cut, and the board settled near parity. And the designer's own sixty-five-card deck, posted as three screenshots, was transcribed, proven ten points stronger than the machine's curation, and enshrined as a named deck — Griff's Red — so the machine itself may pilot it against all futures.`,
    ],
    marginal: 'Decisions 89–100. An attack is a promise now.',
  },
]

export function Journal() {
  return (
    <div className="mx-auto max-w-3xl p-6 pb-16">
      <header className="text-center">
        <div className="text-3xl">⚜</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-wide text-parchment">The Chronicle</h1>
        <p className="mt-2 text-sm italic text-dim">
          being a true and succinct record of the forging of this game,<br />
          kept session by session in the hand of The Chronicler
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
            <div className="mt-2 flex flex-col gap-3">
              {e.body.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-body/90 first-letter:float-left first-letter:mr-1 first-letter:font-display first-letter:text-3xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-parchment">
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
