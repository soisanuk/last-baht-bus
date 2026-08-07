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

## The macro game IS the 2D game

Added after the note above, and it resolves a fork that had been stuck.

`docs/2d-roadmap.md` ends at **v3: visual novel ⊕ top-down walkable**, and both
of those are *conversions of LBB*. There's a third answer, and it's better than
either: **the 2D game is the macro game.** Not a re-skin of the night — a
different game, at a different altitude, reading the same save.

### Why the fit is unusually good

**2D is bad at exactly what LBB's night is good at.** The night's pleasure is
prose texture — a hundred turns of one specific evening, and the art budget to
render that is unbounded because every beat is a new picture. A macro view is
the opposite: a map, a roster, a calendar, a set of books. Those are things a
screen genuinely does better than a paragraph.

**The assets already built serve a macro game better than they serve a converted
LBB.** This is the strongest argument and it's already paid for:

| Already built | In LBB it is | In a macro game it is |
| --- | --- | --- |
| `ROOM_GEO` — **176 rooms with real lat/lon** | used only by `tools/gen-map.mjs` | *the map* |
| **277 portraits**, 259 NPCs | an emoji swap on the `Here:` line | the staff roster, with faces |
| Room + region art (pipeline shipped) | a decorative panel above the terminal | venue tiles you manage |
| `world.js` declarative canon | the source of truth for a text game | the source of truth for both |

A hundred and seventy-six geolocated venues and two hundred and seventy-seven
character portraits is a large fraction of a management game's art, sitting in
the repo, under-used.

### The reuse boundary: data yes, engine no

Worth stating precisely, because "reuse a lot of LBB" hides a sharp line.

**Reuse:** `world.js` (rooms, NPCs, bars, quests, geography), `ROOM_GEO`, the
portraits, the room/region art, the save format, and the canon docs.

**Do not reuse:** the parser, the night loop, `_tick`, the modal gates, the
turn clock. A macro game doesn't parse typed commands or run 100-turn evenings;
inheriting that engine would be inheriting the thing that doesn't scale, which
is the whole reason the macro game exists.

So the coupling is **declarative data + assets**, which is the cheapest kind —
and this repo already has the pattern for it. The trainer vendors five files
into LBB with a banner, a `sync-vendored.mjs`, and a `--check` drift detector.
Same mechanism, pointed the other way: `world.js` and the art vendored *out* of
LBB into the macro game, with drift checked in CI on both sides.

### What this does to the 2D roadmap

- **v0 (scene panel)** — shipped, and stays. It was always worth it on its own.
- **v1 (hotspots)** — still fine, still small, but no longer on the path to
  anything bigger. Do it if it improves LBB on a phone; don't do it as a step
  toward 2D.
- **v2 (the event layer)** — *changes value.* It is no longer the prerequisite
  for 2D, because the macro game consumes the **save**, not an event stream. It
  stays the prerequisite for multiplayer, and it becomes the thing you'd need if
  the baton ever goes *bidirectional* — the macro game handing a decisive night
  back to LBB to be played. Which is the strongest version of all this, and the
  hardest.
- **v3 (the fork)** — the third option, and on this reading the recommended one.
  LBB never converts. It stays a text game, permanently, and is better for it.

That last point is the real prize: this resolves the long-standing tension where
every 2D stage risked destabilising a working text game. It doesn't have to. The
2D game is somewhere else, and LBB's job is to be the best possible night.

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
