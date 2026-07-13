# Current hand-off (after session 010, 2026-07-13)

**Phase:** Playtest & iterate. **Next in the chair:** either — Griff owes #55 (yellow ⚑
ratify) and a #58 verdict after testing the pairing UI; the #66 splash-in-other-zones
question awaits **Blaine's** answer (Griff asked him directly; sideways splash would be a
new keyword — the Chronicler's note is on the thread).

**Read first:** `docs/PROMPTS/SESSION-SUMMARIES/010.md` → `docs/DESIGN/DECISIONS.md`
101–102 → issue #68 (the bot defect, with its benchmark-invalidation caveat) → #66's open
question.

**State:** 206 engine + 8 server tests green; typecheck gate green again; demo deployed
clean at every step (last deploy includes the telemetry chronicle). Rules v3.0 + duel law
+ Home carve-out + **siege clause (decision 102)** live. The Sellsword's Primer v1.0 is
the demo's Guide tab (stamped against decisions through 100 — bump to 102 next content
pass). The chronicle doubles as bot-tuning telemetry in vs-AI/watch modes: banks note the
hand kept, block windows note could-have-blocked vs sent, passes note options passed up.

**Session-010 texture worth knowing:** most of the day's twelve issues (#57–#68) were the
table failing to say what it knew — recap filter audited against the engine's full log
vocabulary, damage and automatic ticks now name their sources, block windows show their
math and pairings, gray orphans name their failing gate, keywords gloss on hover, captives
tracked on the player bar. UX shipped same-hour: amber bank mode, Enter/Esc/P keys (marked
on buttons, #65), cyan selection glow, six pickable sleeves, workshop type chips + lg
preview + fresh-deck option.

**Open, in priority order:**
1. **#66** — Griff's "should other zones' excess hit another unit?" awaits Blaine; if
   adopted it's a new keyword decision, not a Breakthrough edit.
2. **#68** — the bot defense fix (declined free blocks, banks its Guard under siege —
   erratic policy, not missing capability): block scoring, lethal awareness, garrison
   value. A deliberate builder session WITH `sim:matchups` re-run and fresh A/B baselines
   in the same commit — every quoted balance number is bounded by bot quality.
3. #55 yellow ⚑ ratify · #58 Griff's pairing-UI verdict · #5 purple verdict · #10
   color-identity follow-ups.
4. Primer maintenance (WRITTEN_AGAINST bump); State-of-the-Game rewrite (backlog).
5. The telemetry corpus: build → play → copy-chronicle → issue yields self-grading logs;
   tune the #68 fix against them.

**Standing agreements:** ⚜ banner on every GitHub comment, zero exceptions · The
Chronicler signs, Blaine is `-BB` · deploy freely · fold accepted rulings without
re-asking · sweep = open-issues-by-updated (50) + open PRs + comments feed · no
"load-bearing"/AI-isms in writing · Chronicle entries = one-sentence voiced intro + 2–3
paragraph technical log · surprises welcome, riding on green tests.

**Watch loop:** session-local 4-minute cron; it died with session 010's terminal. Re-arm
with the WATCH prompt (see session summaries 009/010) via /loop 4m.

**Model economics (Blaine, session 010 close):** run the watch loop and routine ticket
work in an **Opus** session — sweeps, triage, UX folds, thread replies are Opus-class, and
this handoff is the complete brief a fresh session needs. Reserve **Fable** sessions for:
major mechanics design (new keywords, combat reworks like decision 102), the #68 AI fix
(judgment + benchmark discipline), architecture calls, and cross-surface audit passes.
Within a Fable session, big implementation slices can also be delegated to Opus subagents
(Agent tool, model override) — worth it for large builds, not for chat-sized replies.
The reverse is the cheaper default: an **Opus watch session delegates UP to Fable** when a
ticket is mechanics-shaped — spawn a Fable subagent (Agent tool, `model: 'fable'`) with a
brief pointing at the issue + DECISIONS + spec, or keep one alive across ticks via
SendMessage as a standing design consultant. The always-on context stays at Opus prices;
Fable sees only the design subset. The Fable-shaped list above is the triage rubric.
