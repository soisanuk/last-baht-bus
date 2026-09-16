# The intrusion simulator — a portable action layer

**Status: design, nothing built (2026-09-16).** Raised by Mario as a possible rework of
the Rabbit heist from a modal scene into a minute-by-minute action mode, and settled in
the same conversation as **portable, like `cli-sim.js`** — it carries to the Bangkok
follow-on (`docs/bangkok-concept.md`). This document is the contract; `docs/rabbit-arc.md`
points here rather than duplicating it.

## The one-line thesis

Entering a job switches the game to a **finer simulation layer** — turns of one minute,
distances in metres — where you move through a bounded space, past things that are
looking, toward a terminal that is being watched while you work.

## 1. What this is, precisely

A **mode switch to a finer layer**: one coarse turn in the host game expands into a
bounded inner game with its own clock and its own spatial unit. The structure is old and
well-tested — X-COM's geoscape → tactical, Fallout's exploration → hex combat, Jagged
Alliance 2, Covert Action. The single most important lesson from all of them:

> **The inner layer does not advance the outer clock proportionally.** A forty-minute
> infiltration is not forty minutes of the host's night. The module counts its own
> minutes; the HOST decides what a finished run costs in its own turns, by outcome.

### Prior art worth reading before building

| Shape | Reference | What to take |
|---|---|---|
| Trace running while you work at a terminal | **Uplink** (Introversion, 2001) | The passive trace bar. Every action costs time; you must be gone before it completes. The canonical version of this mechanic. |
| Alarm escalating on a counter regardless of you | **Invisible, Inc.** (Klei) | Time itself as the antagonist — the alarm rises whatever you do, so the question is never "can I avoid it" but "what can I get done first". |
| Plan-then-execute heist, guards on schedules | **The Sting! / Der Clou!** | Fine-resolution execution against patrol timetables. |
| Per-node detection racing an alarm | Deus Ex's hacking, Hacknet, Shadowrun matrix runs | Different actions carrying different detection weight. |
| NPC schedules against a strict turn clock **in text** | **Deadline** (Infocom, 1982) | The ancestor. Text can carry this; it has before. |
| Real-time sections **in a parser** | **Border Zone** (Infocom, 1987) | The cautionary tale. Remembered as an interesting experiment rather than a good one. |

## 2. Decisions the portability rule makes for us

`cli-sim.js` is already built to this contract and `docs/rabbit-arc.md` records it as an
**architectural rule**. The intrusion module is the second instance of the same rule, and
being portable is not a nicety here — it decides several things we were otherwise weighing
on taste.

### 2.1 A node graph, NOT a grid — decided

The opening proposal was three-metre increments. **Three metres becomes the cost unit on
an edge, not a tile on a floor.** A scenario is 8–15 **nodes** (the alley, the loading
door, the corridor, the landing, behind the till, the office) with **metre costs** on the
edges between them.

Two independent reasons, and the second is the binding one:

- **Grid-crawl is the failure mode of this medium.** `N. N. LOOK. N.` is why parser IF
  abandoned tile movement. A node graph keeps exact distance and exact time — *"the
  corridor is 12m: four minutes at a crouch, one if you walk it"* — and loses the crawl.
- **A bespoke grid does not travel.** A hand-authored floor plan of the Kitten Corner back
  office is code about Pattaya. A node graph in a scenario object is data, and the Bangkok
  game drops in a tower, a server floor, a mall service corridor and gets a new job. This
  is exactly why `cli-sim`'s filesystem is data and not a function.

### 2.2 One alert level across both phases — proposed

The approach and the terminal are **the same shape**: enumerable moves, an internal clock,
an adversary that reacts. Running them on **one alert level** is both the simpler contract
and the better game — being noisy in the corridor means the terminal starts hotter, and
the two halves stop being two minigames stapled together.

**Do not absorb `cli-sim.js` to achieve this.** It is shipped, tested, portable and has a
BFS reachability proof. Instead: the intrusion module owns the alert level and hands
`cli-sim` a **starting heat**, which is a small additive change to a pure module that
already carries a `budget` clock.

### 2.3 The watcher is scenario data

Patrols, sensors, and the thing counting against you are **config, not code**: a rate, a
trigger list, a schedule. LBB's watcher is a mamasan doing a stock count on the hour;
Bangkok's is an actual IDS. Same module, different data — that is the whole test of
whether this is portable.

### 2.4 Minutes are turns, never seconds — hard constraint

"Near real time" must mean **fine-grained turns**. `CLAUDE.md` rules 1 and 2 are
load-bearing: no wall clock in the core, all nondeterminism through `G.rng`. Real seconds
would break the seeded daily, replay, save compatibility and the shared-world path in one
change. A one-minute *turn* costs nothing; a one-minute *second hand* costs everything.
Border Zone is the precedent and the warning in the same title.

## 3. The module contract

Mirrors `cli-sim.js` exactly — follow that file as the template.

- **Its own file** (`web/js/intrusion.js`), loaded like `games.js` / `cli-sim.js`, with
  every call site `typeof`-guarded so the loaders that do not list it still boot.
- **Pure.** No `G`, no DOM, no output side-effects, no wall clock. Every random decision
  takes an **injected `rnd()`**, so a run is seed-deterministic and testable.
- **Plain-data state.** `intrusionNew(scenario, rnd)` returns an object that lives in
  `G.game.act` and survives `serializeGame`/`deserializeGame` untouched — the same
  arrangement as `G.game.cli`.
- **Enumerable moves.** `intrusionOptions(scenario, state)` returns every legal move right
  now. This is not a convenience: it is what makes the chip bar and autocomplete free, and
  it is what the **tap-reachability test** asserts by breadth-first search to a win. The
  iOS constraint (`docs/rabbit-arc.md`) makes it non-negotiable.
- **No host nouns inside it.** No baht, no สนุก, no WDG, no Kesinee. Those live in the
  scenario data and the host wiring. The module never learns what a quest is.
- **A test that loads ONLY the module** — that is the portability assertion, and it is how
  `cli-sim.test.js` proves its own.

### Sketch of the scenario schema

Illustrative, not settled. The shape matters more than the field names.

```
INTRUSION_SCENARIOS.kitten_office = {
  start: "alley", goal: "office", exit: "alley",
  minutesBudget: 45,                 // the outer frame; the host decides its turn cost
  nodes: {
    alley:    { name: "the service alley", cover: "good", exits: { door: 6 } },
    door:     { name: "the loading door",  cover: "none", exits: { alley: 6, stair: 9 },
                lock: { kind: "padlock", minutes: 3, noise: 2 } },
    stair:    { name: "the back stair",    cover: "poor", exits: { door: 9, office: 12 } },
    office:   { name: "the office",        cover: "none", exits: { stair: 12 },
                terminal: "wdg_office" }, // hands off to cli-sim with the current heat
  },
  watchers: [
    { id: "stock_count", kind: "schedule", at: [20, 40], path: ["stair", "office"] },
    { id: "cctv",        kind: "static",   nodes: ["door"], defeatable: true },
  ],
  alert: { max: 10, decayPerMinute: 0.1, caught: "found" },
}
```

## 4. The fiction question — unresolved, and it is Mario's

The Rabbit arc's current thesis is that **the climax is an interruption, not a landing**:
WDG were already under CCIB investigation, the job *completes*, and the only real variable
is whose name is on the radar the morning after (`docs/rabbit-arc.md`, the CCIB section).
That design deliberately refuses the heist-movie climax.

A tense minute-by-minute infiltration **promises exactly the climax the arc declines to
give.** Two honest ways out, and they are different games:

1. **The centre of gravity moves forward.** The job becomes the set piece, and the CCIB
   morning becomes its consequence rather than its point. This is the more conventional
   and probably the more popular version.
2. **The mode is pressure you pass through, not a climax.** You can be competent and get
   out clean; the real cost still lands the morning after, and the action layer's job is to
   make the radar *earned* — sloppy in the corridor, louder on the wire, and Tan's read of
   you changes. This preserves the arc as written.

Option 2 is more consistent with everything else in this project, and option 1 is more
likely to be what an action mode makes people want. **Decide before any code**, because it
changes what the mode is *for*.

## 5. Suggested build order

1. **Make the existing terminal clock reactive.** `cli-sim` already carries `budget: 60`
   with telegraphs at 15 and 5 — a flat command countdown. Make the cost per command differ
   (`copy` and `unlock` spike, `ls` barely moves) so something is *looking* rather than
   merely counting. Small change, contained, to a module built for extension, and it tests
   whether the tension is fun before anything expensive is committed.
2. **Prototype the approach as a node graph** with one scenario and no watchers — movement,
   metres, minutes, and the options list. Prove the chips.
3. **Add one watcher kind** (`schedule`), then the alert level shared into `cli-sim` as
   starting heat.
4. Only then consider whether the Rabbit arc adopts it, or whether it debuts in Bangkok.

## Decision log

| Date | Decision |
|---|---|
| 2026-09-16 | Raised as a possible rework of the Rabbit heist: minute turns, ~3m distance resolution, navigate the approach, detection processes running while at the terminal. |
| 2026-09-16 | **Portable, like `cli-sim.js`** (Mario) — carries to the Bangkok follow-on. This makes the module contract in §3 binding rather than advisory. |
| 2026-09-16 | **Node graph with metre edge costs, not a movement grid** — decided by portability first (a floor plan is code about Pattaya; a node graph is data) and by medium second. |
| 2026-09-16 | Minutes are TURNS. No wall clock, per `CLAUDE.md` rules 1–2. |
| — | **OPEN:** does the arc's centre of gravity move to the job (§4)? |
| — | **OPEN:** one module or two; whether `cli-sim` takes a starting heat or the alert stays per-phase. |
