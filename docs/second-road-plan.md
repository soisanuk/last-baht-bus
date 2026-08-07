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

## The drop-in: LBB is the match engine

Added 2026-08-07, and it changes the shape of everything below.

Second Road is the macro game — managing nightlife venues in Pattaya at whatever
scale you're playing at. But **on any given day you can click into a bar and drop
to the micro level, and the micro level is LBB.** The season is Second Road; the
night you choose to actually live through is The Last Baht Bus.

Three ways to drop in, and they are not the same game:

- **As yourself**, the owner walking his own floor. Closest to what LBB's expat
  stage already does (WORK, the night events, the presence dilemma).
- **As the manager on duty.** A role LBB does not currently have — Bert has no
  player verbs. Different pressures: you don't own it, you answer for it, and
  you go home at four whatever happens.
- **As a randomly rolled punter.** The sharp one. You play a tourist on a
  seven-day holiday — which is *exactly what LBB already is* — inside a venue
  you own. You meet the prices you set, the staff you hired, the room you made,
  from the other side of the rail. Whether that character persists across
  drop-ins is deferred; rolled-fresh is the cheap first version.

**Who you play at the macro level is also open.** An individual owner is the
default, but a WDG-shaped rollup is a legitimate and very different game: more
capital, more political exposure, the tribute at the good table, and the
structural fragility already noted in `docs/factions-thai.md` — a cash-hungry
acquirer whose position rests on continuing to pay.

### What this costs, architecturally

It commits us to the **bidirectional baton**, which the architecture note flagged
as the strongest version and the hardest. Consequences to accept up front:

- LBB must be **callable with an injected character and world state**, not only
  bootable from its own save. The seeded soi6 challenge mode (`startSoi6Mode({seed})`)
  is the closest existing thing and the right precedent.
- The **event layer** (2D roadmap v2) stops being optional. Second Road needs a
  night's outcome as structured data, not as a transcript it has to parse.
- The **manager role** is new LBB content, not a re-skin.

### What it does to the week-summary

A week-summary is no longer only a report. It does double duty: it tells you
what happened, **and it tempts you into a night.** Something in each week should
read as an invitation — Thursday looks like it will be a mess, Saturday is the
Shamrock's opening, the new manager's first weekend is this one.

If the summaries can carry that second job, the drop-in loop has a reason to
exist. That is now part of the s0 go/no-go.

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
| **s0** | Four week-summaries as prose. Go/no-go. **DONE 2026-08-07 → GO** (`docs/second-road-weeks.md`) | — |
| **s1** | Repo, save-baton read/write, a round-trip test on both sides. **LBB half DONE 2026-08-07** (`exportBaton`/`importBaton`/`batonReady`, `tests/js/baton.test.js`); Second Road half pending its repo | s0 passes |
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

~~s0. Four week-summaries.~~ **Done 2026-08-07 — see `docs/second-road-weeks.md`.
Verdict: GO.**

The weeks read. A week has the same shape as a good night — a concrete detail, a
person doing something you can picture, a closing line that turns rather than
concludes — because the *unit* changed while the register didn't. A night reports
moments; a week reports decisions and their weather.

The argument for the whole project is week 63: three weeks of knowing, a pattern
in a float, and a manager who has quietly become better at your job than you
were. **That week is not writable in LBB at any length.**

One caveat carried forward: the good week (41) leans on an unfinished roof for
tension — it borrows a bad thing in order to be readable. If every good week needs
a flat note, the game will read as relentlessly grim. **A good week has to be
allowed to just be good sometimes**, and that's a design rule, not a prose note.

**s1, LBB half: done 2026-08-07.** `exportBaton()` / `importBaton()` /
`batonReady()` in engine-core.js, guarded by `tests/js/baton.test.js` (7 tests).

The contract, so Second Road can be built against it:

- **`BATON_VERSION = 1`.** Mismatched versions are *refused*, not guessed at —
  cross-repo coupling rots silently unless it breaks loudly.
- **Dawn only.** `batonReady()` refuses while `nightTurn > 0` or any modal gate
  is open. A baton can never be handed over mid-question.
- **What crosses**: day, player, flags, quests, bar, syn, faction, rep, money,
  bank, hotel, happy, phone, dog, thaiSeen, itemLoc, rng, and `soc.drinks` (the
  bonds — the macro game's real resource).
- **What doesn't**: hunger, thirst, battery, drunk, hurt, room, nightTurn and
  every pending gate. Those describe a body in a night, and a macro turn hasn't
  got one. They're dropped on export and zeroed on import.
- **Tolerant by construction.** Import merges onto a fresh `newGame()` skeleton,
  so a field Second Road has never heard of keeps today's default instead of
  becoming `undefined` — the same reason the save format tolerates being older
  than the code. This is what stops the coupling needing a migration every time
  either game grows a field.

**Repo opened** at `~/projects/second-road`, with `HANDOFF.md` as the contract —
the baton, plus the vendoring decision. That doc is now the **single operational
dependency** between the two games.

**Vendoring is decided: a generated manifest, never `world.js`.** That file is
642 KB and almost all of it is dialogue, prose pools and encounter scripts —
LBB's night content, unusable at macro scale. Vendoring it would import a game
engine's worth of strings to obtain a list of venues and their coordinates. The
precedent is already a stated rule here: the scene-art pipeline couples through
a generated `docs/scene-manifest.json` and never reads the source.

**This is not yet possible, and that's the next LBB work.** Nothing emits the
export. In order:

1. `tools/gen-world-export.mjs` → `docs/world-export.json` — venues, `ROOM_GEO`,
   people *without dialogue*, patrons, portrait index, `CANON_BARS`. Versioned.
   Explicitly not exits: those are a walking graph for a game about walking.
2. A sync test, mirroring how `tests/js/art.test.js` guards the scene manifest —
   regenerate and diff, so a world.js change that should have moved the export
   fails the suite instead of drifting.
3. A portrait index in the same export.
4. A sync script on the Second Road side with the trainer's proven shape
   (`// VENDORED from …` banner + `--check` drift detection).

Until 1 and 2 exist, any shortcut taken on the Second Road side — reading
`world.js` directly, hand-copying data — becomes the thing that rots.

**Still owed:** the mirror of `baton.test.js` on the Second Road side. The
coupling is half-tested until both exist.

**Next: the Second Road repo.** Needs a location decision (sibling to
`last-baht-bus`, same origin as the trainer is the cheap answer).
