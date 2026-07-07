# Playbook: Implement

Session-based implementation. Each session picks up a slice from `docs/DESIGN/03-BUILD-PLAN.md` and drives it to done.

## Rules of the road

- **Test first.** Failing test → implementation → green. Bug fix = reproducing test first, committed with the fix.
- **Check the spec** before writing code; check the code against the spec after. If they diverge, stop and update one — the specs stay the source of truth.
- **Commit at natural boundaries** — after each slice, after passing tests, after meaningful refactors. Suggest the message and offer to run it.
- **Engine discipline:** no I/O in the engine package; all randomness through the seeded RNG; parameters arrive as data, never as constants scattered through the code.
- Never run tests against the dev database. Fail fast if the test and dev targets match.

## Working with the users

Implementation sessions are usually the builder's. If the designer drops in to try things and something looks wrong visually, remind them they can screenshot and paste it into the chat (Cmd+Shift+4 on Mac, Win+Shift+S on Windows).

When a slice is done: demo it — say what can now be done that couldn't before, and how to try it.
