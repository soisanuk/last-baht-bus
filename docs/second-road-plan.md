# Second Road — planning doc

**Working title: Second Road.** The macro-scale companion to *The Last Baht Bus*:
multi-bar ownership in Pattaya, played in weeks and seasons rather than nights,
in a separate 2D codebase reading LBB's save.

Started 2026-08-07. This is the build plan; the architecture argument lives in
`docs/macro-game.md` and the world's power structures in `docs/factions-thai.md`.

## Why that name

Beach Road is where tourists are. Second Road is one street back, where the
business actually happens. Third Road is where people who live here live. That
progression is the arc of the whole thing — visitor → operator → resident — and
it's already canon (Soi 7 runs east to Second Road).

It does the same trick as *The Last Baht Bus*: a concrete local noun that is
also the theme, without announcing itself as a management game.

## The one-line thesis

*The Last Baht Bus* is about one night and whether you get home.
**Second Road is about the years, and whether the place survives you.**

## What it is, in a sentence per pillar

- **Scale.** A turn is a week. A season is the unit that matters. Years pass.
- **The resource is trust, not money.** You cannot be behind two rails, so the
  question stops being *where do I stand tonight* and becomes *who stands there
  when I don't* — and what they take while they're there.
- **Everyone has partners.** Standing with the syndicate, WDG, the Samsons and
  the Darkside family is the strategic layer. Neutrality stays available and
  stays expensive, exactly as in LBB.
- **The prose is still the soul.** A week comes back as three paragraphs. If
  those paragraphs read like a report, the project is wrong (see the go/no-go).

## Hard constraints, inherited and non-negotiable

1. **Data and assets are reused. The engine is not.** `world.js`, `ROOM_GEO`,
   portraits, room/region art, canon docs — yes. Parser, night loop, `_tick`,
   modal gates, turn clock — no. Inheriting the night engine means inheriting
   the thing that doesn't scale.
2. **The save is a baton**, handed off at dawn, held by one game at a time. See
   `docs/macro-game.md` for what crosses and what must not.
3. **The shared-world rules carry over unchanged**: no wall-clock, no `Date`, no
   `window`/`localStorage` in the game core; all nondeterminism through a seeded
   RNG that serializes. Break these and the save stops being replayable, and
   both games lose it.
4. **Second Road must stand alone.** Playable cold by someone who has never
   touched LBB, or it's DLC with extra steps and it dies of the coupling.
5. **No real families, names, or allegations.** Structural pattern only, same
   rule as White Dish.

## The go/no-go, before any mechanics

**Write four week-summaries as prose.** One good week, one bad, one low-season,
one where a person you trusted did something.

If they read as well as a good night at the Stinky, build the game. If they read
like a report, the honest answer is that LBB stays a one-bar game and the
Shamrock becomes something other than a second business.

This is the first task and it costs a day. Nothing else starts until it's done.

## Stages

| | | gate |
| --- | --- | --- |
| **s0** | Four week-summaries as prose. Go/no-go. | — |
| **s1** | Repo, save-baton read/write, a round-trip test on both sides. | s0 passes |
| **s2** | One bar, one season, no UI beyond text. The loop proven headless. | s1 |
| **s3** | The map (`ROOM_GEO`) + roster (portraits). The first real 2D. | s2 |
| **s4** | Second bar, delegation, the trust mechanic. The actual game. | s3 |
| **s5** | Factions as strategy: the Darkside family, WDG's fragility. | s4 |

s2 before s3 is deliberate: prove the loop in text where it's cheap to change,
and only then spend on pixels. The same discipline that kept LBB's engine
DOM-free is what makes this possible at all.

## What the assets already give us

Counted, not estimated:

- **`ROOM_GEO`: 176 rooms with real lat/lon.** Currently read only by
  `tools/gen-map.mjs`. In Second Road this is *the map*.
- **277 portraits across 259 NPCs.** In LBB an emoji swap on one line; here it's
  the staff roster, with faces.
- **Room and region art**, pipeline shipped, incremental-by-design.
- **`world.js`** — every bar, every venue, every character, already declarative.

That is a large fraction of a management game's art and data, already paid for,
and it is under-used in a text game.

## Open questions, carried from the architecture note

- Does Second Road ever render a night, or only weeks? Handing a decisive night
  *back* to LBB is the strongest version and the hardest — it needs the event
  layer (2D roadmap v2) and a bidirectional baton.
- Where does it live? Same origin as LBB and the trainer is the cheap answer and
  makes save-sharing trivial.
- How is `world.js` shared without rotting? The trainer's vendoring pattern
  (banner + sync script + `--check` drift detection) pointed the other way is
  the obvious answer; needs a decision, not a drift.
- A save advanced by a year: every "once ever" flag in LBB needs auditing for
  whether it still reads right after a simulated year away.

## First task

s0. Four week-summaries. Nothing else.
