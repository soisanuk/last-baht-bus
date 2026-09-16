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

## 4. Where it debuts — DECIDED: Bangkok (2026-09-16)

**It debuts in the Bangkok follow-on rather than being retrofitted into LBB's Rabbit
arc.** Mario's reasoning, and it is the stronger form of the argument: an intrusion layer
gives the Bangkok game *focus*, where LBB is deliberately open-ended.

The case, recorded because it should outlive the conversation:

- **LBB's defining verb is TALK.** Nearly three thousand dialogue nodes, the bond ladder,
  the ledger reveals, presence as the core mechanic. An action layer there is not bad, it
  is **orthogonal** — and retrofitting it risks LBB becoming two games sharing a save.
- **Bangkok is strong on world and character and thin on the hour-to-hour loop.** The
  thesis, the protagonist, the husk, the code-switching and the guardrails are all written;
  what the player *does* between scenes is not. This is the missing middle, and the pieces
  either side of it already exist: `cli-sim` is the terminal half, and `G.ccibRadar` arrives
  from LBB as **heat you already carry** — a stealth game's opening condition rather than a
  footnote.
- **It gives code-switching something to bite on.** In a conversation game, switching
  register is flavour on a dialogue node. In an infiltration it is *operational*: which
  register gets you past a guard, whether a face reads as Thai or farang at a service door,
  who you talk through a checkpoint instead of going around. A far better home for the
  mechanic the concept already calls central.

### Two commitments that come with it

1. **The thesis has to survive the loop.** "Reveal that Bangkok already is cyberpunk" is an
   argument about a real city. A job-to-job stealth game can quietly become Uplink with Thai
   names, where the setting is backdrop rather than claim. The jobs must be *about* the
   thing — the compounds, the liability regime, the husk — not merely located near it.
2. **Depth beats breadth, which is LBB's hardest-won measured lesson.** The unseen writing
   here sat in bond-gated nodes nobody reached, and one deepening relationship outperformed
   churn. The Bangkok equivalent is a handful of jobs written deeply over a procedural
   mission generator — and it means **Bangkok still needs its rail**: somewhere you come
   back to between jobs, where the writing lives. Without that it is a mission sequence with
   good prose attached.

The structural symmetry, which is the reason the two games sit well together: **LBB is a
sandbox whose tension is drift and which cannot be lost; Bangkok is a job game whose tension
is exposure and which can.** The shared save is the hinge.

## 5. The fiction question — resolved as a consequence

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
likely to be what an action mode makes people want.

**Debuting in Bangkok settles this by not asking it.** The Rabbit arc keeps its current
design: the job completes, the climax stays an interruption rather than a landing, and the
variable stays the radar. LBB's centre of gravity does not move. If the layer is ever
retrofitted, this question reopens exactly as written above.

## 6. Suggested build order

1. **Make the existing terminal clock reactive — IN LBB** (Mario, 2026-09-16: the full
   layer debuts in Bangkok, but *the CLI changes will likely debut in LBB*). `cli-sim`
   already carries `budget: 60` with telegraphs at 15 and 5 — a flat command countdown. Make
   the cost per command differ (`copy` and `unlock` spike, `ls` barely moves) so something is
   *looking* rather than merely counting.

   **This split is the good one**, and for a reason beyond convenience: `cli-sim` already
   ships in LBB against a live scenario with real players, so Bangkok inherits a mechanic
   that has been *proven in play* rather than designed in the abstract. It is also
   consistent with the arc as written — a reactive trace is **pressure you pass through**,
   not a climax, so it does not promise the heist-movie ending §5 says the arc refuses.

   **Design `startingHeat` now, even though LBB has no approach phase**, because that
   parameter is the seam Bangkok plugs into and retrofitting a seam is dearer than leaving
   one. And LBB should feed it something real rather than zero — the wire you chose
   (`_ccibWire`: SIM, burner, or your own phone), whether the dog walked it with you, how
   the box path went. A man who came in loud starts the terminal hot, which is the same
   sentence the full layer will make literally true.
2. **Prototype the approach as a node graph** with one scenario and no watchers — movement,
   metres, minutes, and the options list. Prove the chips.
3. **Add one watcher kind** (`schedule`), then the alert level shared into `cli-sim` as
   starting heat.
4. Steps 2–3 are BANGKOK work. Build the node graph against a Bangkok scenario, not a Pattaya one — the first scenario authored is
   the one that shapes the schema, and authoring `kitten_office` first would quietly bake in
   a bar's back stairs. The §3 sketch is kept as an illustration only.

## Decision log

| Date | Decision |
|---|---|
| 2026-09-16 | Raised as a possible rework of the Rabbit heist: minute turns, ~3m distance resolution, navigate the approach, detection processes running while at the terminal. |
| 2026-09-16 | **Portable, like `cli-sim.js`** (Mario) — carries to the Bangkok follow-on. This makes the module contract in §3 binding rather than advisory. |
| 2026-09-16 | **Node graph with metre edge costs, not a movement grid** — decided by portability first (a floor plan is code about Pattaya; a node graph is data) and by medium second. |
| 2026-09-16 | Minutes are TURNS. No wall clock, per `CLAUDE.md` rules 1–2. |
| 2026-09-16 | **DECIDED: it debuts in Bangkok, not retrofitted into the Rabbit arc** (Mario) — an intrusion layer gives the follow-on focus where LBB is deliberately open-ended, and LBB's verb is TALK. §4. |
| 2026-09-16 | **Consequently CLOSED:** the arc's centre of gravity does not move; the Rabbit climax stays an interruption. Reopens only if the layer is ever retrofitted. |
| 2026-09-16 | **The CLI changes debut in LBB** (Mario) — the full layer is Bangkok's, but the reactive trace lands here first, against a live scenario with real players. Bangkok then inherits a proven mechanic. Consistent with the arc: a trace is pressure, not a climax. |
| 2026-09-16 | **Consequently CLOSED:** `cli-sim` does take a `startingHeat` — designed now as the seam, fed in LBB by the wire choice / the dog / how the box path went, rather than left at zero until Bangkok needs it. |
| — | **OPEN (new):** what Bangkok's *rail* is — the place you return to between jobs, where the writing lives. Depth-beats-breadth says the game needs one. |
