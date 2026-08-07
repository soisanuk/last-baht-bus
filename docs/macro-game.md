# The Macro Game — a second game on the same save

Design note, 2026-08-07. Written after the bar-owning arc landed and raised the
question of what a *second* bar would even be.

The premise: day-to-day bar ops (WORK, the night events, the presence dilemma)
is a good micro game and doesn't scale. A second bar makes "which rail do I
stand behind tonight?" a worse version of the same question. The interesting
question at two bars isn't *where do I stand* — it's **who stands there when I
don't**, which is a different game at a different altitude.

The author's instinct is that this wants to be a separate, compatible game
rather than a mode inside this one, and that the blocker is the clock: hand off
to a macro layer and the timelines diverge.

That blocker is real, and it dissolves under one rule.

## The clock problem, stated precisely

The Last Baht Bus runs on a turn clock. `G.nightTurn` is 100 turns from 18:00,
ten to the hour; `G.day` counts nights. Everything in the night loop is tuned to
it — hunger, battery, the soi dog, the last bus at turn 80, the bond decay at
`_endNight`.

A macro game runs on weeks, seasons, years. If both games can advance the same
character, their calendars drift apart the moment either one moves, and there is
no honest way to reconcile them: you either fabricate the missing nights or
throw away the state that accrued during them.

## The rule that dissolves it: the save is a baton

**The timelines cannot diverge if only one game holds the character at a time.**

Divergence isn't caused by two clocks. It's caused by two *concurrent writers*.
Make the save a token — checked out by exactly one game, played, checked back in
— and the clock is single-threaded by construction. Each game advances the same
`G.day` by however many nights it consumed. There is no merge, because there is
never a fork.

This is not a new architecture for this repo. It's the one that's already
written down:

- `serializeGame` / `deserializeGame` is a single serializable object, and
  "**the save is the wire**" is already the stated doctrine.
- `deserializeGame` merges the parsed save over a fresh `newGame()` skeleton one
  level deep, so a second game adding fields is safe by default and needs no
  migration.
- There is already a second application reading this save: the Soi Sanuk trainer,
  same origin, pulling `G.thaiSeen` out of `lbb_save` to offer "words from the
  bus" practice. The precedent exists and works.

## The handoff boundary is dawn

Not an arbitrary save point — **dawn**, always.

`_endNight` is already the seam: the night resolves, the books settle, dailies
reset, `G.day` increments. A night is atomic; a macro week is atomic. Both games
begin and end at the same wall in the fiction, so a handoff can never land
mid-night, mid-modal, or mid-encounter.

Practically: the macro game refuses to open a save with `nightTurn > 0` or any
pending gate set. Finish your night, then hand over.

## What crosses, and what must not

**Crosses (the character and the world's memory):**

| | |
| --- | --- |
| `G.day` | the shared calendar — the only clock either game may trust |
| `G.player` | identity, origin, personality, language |
| `G.flags`, `G.quests` | what has happened |
| `G.bar` | the books, the debt to the old man |
| `G.faction`, `G.syn` | standing, and how far outside the arrangement you've stayed |
| `G.soc.drinks` | bonds — *who your people are*, which is the macro game's real resource |
| `G.money`, `G.bank` | obvious |
| `G.rng` | so replay and determinism survive the handoff |
| `G.thaiSeen` | already shared with the trainer |

**Must not cross (within-night ephemera):** `nightTurn`, `pendingChoice`,
`pendingEnc`, `pendingBf`, `game`, `hunger`, `thirst`, `battery`, `soc.drunk`.
These describe a body in a night, and a macro turn has neither. The macro game
should assert they're absent or zero them on load.

**The macro game inherits the shared-world rules unchanged** — no wall-clock, no
`Date`, all nondeterminism through `G.rng` (rules 1 and 2). If it breaks those,
the save stops being replayable and both games lose it.

## What the macro game is actually about

Worth stating, because "zoomed-out bar management" is not a reason for a second
game to exist. The reason is that **LBB structurally cannot be about time
passing at scale**, and that's where the remaining story is.

A night game can't do: the old man dying. The lease coming up. A regular who
stops coming and you find out why in March. Low seasons stacking two deep. The
girl you promoted turning into the person who actually runs the place. Your own
slow shift from the man at the bar to the man who owns it to the man who used
to.

The unit of decision changes from *evenings* to **trust**: who manages the
second place, what they take, whether the skimming is the kind everyone does or
the other kind, whether you promote the mamasan who earned it or install the
person Tan recommends — and he will recommend someone.

That's the relationship system at a new altitude, which is the thing this engine
is already best at. It is not a spreadsheet, and if it turns into one the second
game shouldn't be built.

## Recommendation

**Two games, one save, baton handoff at dawn.** With three conditions:

1. **The macro game must stand alone.** It has to be playable from a cold start
   by someone who has never touched LBB, or it's DLC with extra steps and it
   will die of the coupling.
2. **The coupling is the save format, and it must be versioned and tested on
   both sides.** Cross-repo coupling rots silently. `tests/js/online.test.js` is
   already the model for exercising a save through a vm context; the macro game
   needs the mirror of it, and this repo needs a test that a save round-trips
   through the documented subset above.
3. **Prose first.** Write three or four week-summaries as prose before any
   mechanics. This game's pleasure is texture, and macro layers eat texture — if
   a week reads like a report rather than like a good night at the Stinky, the
   honest answer is that LBB stays a one-bar game and the Shamrock becomes
   something other than a second business.

## Where this converges

The second bar should be the dead Shamrock, which Daeng already hooks behind
`barOpen` and which is currently a promise with nothing behind it. Out there the
pressure comes from a *jao pho* family rather than WDG (see
`docs/factions-thai.md`), and that faction doesn't exist yet either.

So the macro game, the second bar, and the Darkside faction are **one piece of
work**, not three — and the macro game is the only one of the three that needs a
second codebase.

## Open questions

- Does the macro game render nights at all, or only weeks? (Football Manager
  plays the big match; this could hand a decisive night *back* to LBB, which
  would make the baton bidirectional and is the strongest version — and the
  hardest.)
- Where does the macro game live? Same origin as LBB and the trainer is the
  cheap answer and keeps `localStorage` sharing trivial.
- Does a macro turn consume the RNG in a way LBB's replay tests can tolerate?
  Probably yes, since `G.rng` serializes — but it needs proving, not assuming.
- What happens to a save the macro game has advanced by a year? LBB's night
  content assumes a seven-day vacation or an endless expat stage; the latter is
  fine, but every "once ever" flag needs auditing for whether it still reads
  right after a simulated year away.
