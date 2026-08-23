# Testing gap analysis: what the suite cannot see

*Measured 2026-08-23 against the tree at `5760ce2`. Companion to
`docs/playtest-findings-analysis.md`, which classifies the ~90 playtest findings
into eight defect classes. This document asks the next question: **given that
classification, what is wrong with the test suite itself?***

Everything below is measured, not estimated. The commands used are in the text.

---

## 1. What exists today

| Layer | Size | Wall clock |
|---|---|---|
| vm suite (`node --test`) | **975 tests** across 38 files, ~15,600 lines | **~7 s** |
| Browser e2e (Playwright) | **43 tests** across 18 specs | ~7 s |
| Soak harness (`tools/soak.mjs`) | 427 lines, seeded monte-carlo autoplayer | seconds/run |
| Standalone lints | `promises.test.js`, `references.test.js`, `decorate.test.js`, `prose-corpus.mjs`, `prose-claims.mjs`, `examine-audit.mjs` | — |

This is a *lot* of testing for a project this size, and it is fast. The problem is
not quantity or speed. It is that every instrument is blind in the same direction.

---

## 2. The measurements

### 2.1 How tests drive the engine

Classifying all 975 vm tests by whether they reach the engine through the real
entry point (`doCommand` via the `run()`/`cmd()` helpers) or by calling internals
directly (`_do*`, `_endNight`, `_barSettle`, `_tick`, `_arriveAt`):

| | tests | share |
|---|---|---|
| real entry point | 521 | 53% |
| direct internals only | 50 | 5% |
| both | 11 | 1% |
| pure data assertions (no engine call) | 393 | 40% |

53% on the real path is **better than the round-13 post-mortem implied**. The
suite as a whole is not bypassing `doCommand`. The gap is local, and it is severe
where it exists:

| file | tests | real-path | direct-only |
|---|---|---|---|
| **`barchain.test.js`** | **38** | **3** | **14** |
| `std.test.js` | 12 | 0 | 8 |
| `hillchain.test.js` | 13 | 0 | 3 |
| `accident.test.js` | 9 | 0 | 5 |
| `hospital.test.js` | 4 | 0 | 1 |
| `engine.test.js` | 475 | 374 | 7 |

`barchain.test.js` covers the entire expat/bar stage. It has 38 tests, three of
which touch the real path. **Both of round 13's criticals lived in exactly the
subsystem with the worst real-path ratio in the codebase**, and one of its tests
worked forty consecutive nights without a single night ever ending — a sequence
`_endNight` makes impossible.

That correlation is the single strongest signal in this document.

### 2.2 The soak asserts safety, never liveness

`tools/soak.mjs` implements nine failure conditions:

`spin` · `softlock` · `throw` · `nan` · negative `money` · `meter` bounds ·
`runaway` day · `modal-wedge` · `save-roundtrip`

Plus three warn heuristics (`hint-miss`, `offpocket`, `langleak`).

**Every one is a safety property — "nothing bad happens." Not one is a liveness
property — "something good happens."** Class B (absence) is by definition a
liveness failure: WORK computing nothing, the room safe never paying, the
procurement beat never firing. A suite composed entirely of safety assertions
cannot express the sentence "this feature should sometimes fire," so it never
noticed that several features never did.

### 2.3 The soak cannot reach the content where the criticals were

Four seeds × 8 nights in expat mode, **2,592 commands total**, counting how often
the walker types the verbs at the centre of round 13:

| seed | commands | typed `WORK` | typed `BOOKS` | reached the Stinky Pinky |
|---|---|---|---|---|
| 3 | 691 | **0** | 2 | 83 |
| 11 | 667 | **0** | 0 | 55 |
| 29 | 747 | **0** | 3 | 75 |
| 47 | 487 | **0** | 1 | 46 |

The walker stands in the player's own bar constantly and **never once types
WORK**. Adding effect assertions to the soak — the remedy I proposed at the end
of `playtest-findings-analysis.md` — **would not have caught the flagship bug**,
because the instrument never performs the action whose effect would be asserted.

The reason is in the source. The walker's vocabulary is `WILD_STATIC`, a
hand-written list of 19 strings, plus a small NPC-aware pool (talk / buy drink /
flirt / tip / barfine / photo / message / send / call) and whatever CAPS hints the
prose happens to print. Against the parser's real surface:

| | count |
|---|---|
| verbs the parser switches on (`case "x":` arms) | **322** |
| `_COMPLETE_VERBS` (what autocomplete offers) | 113 |
| distinct verbs in the soak's static pool | **18** |
| parser verbs the static pool never types | **304 (94%)** |

Room coverage is documented in the tool's own header and is equally frank: 11–16%
per run, 68% as the union of 32 runs, **74 rooms no soak has ever entered** — 52
of them venues you must go inside.

### 2.4 The promise lint cannot see promises made in plain prose

`promises.test.js` harvests **parenthesized ALL-CAPS runs** — the `(BUY WATER)`
tap idiom — and asserts each one at least parses.

Checking the three class-D defects found in round 12 against the prose as it stood
in the parent of the fixing commit (`41cfd8e^`), looking for any parenthesized CAPS
hint within ±320 characters:

| defect | CAPS hint present? |
|---|---|
| Moonshine Bar "dare you to try the house infusion" (ya dong unbuyable) | **NONE** |
| Mama Yai's "the som tam arrives unasked and correct" (unobtainable) | **NONE** |
| Naklua Traditional "foot 250, Thai 300, herbal compress 400" (flat ฿300) | **NONE** |

**All three were structurally invisible to the lint.** Its recall is bounded by an
*authoring convention*, and the defect in each case was precisely that the author
promised something without following the convention.

There is a second, independent gap: the lint treats a voiced refusal as a **pass**
(by design — "Not for sale here" is better than a parser dead-end). So even with a
`(BUY YA DONG)` hint present, the lint would have gone green on a bar that could
not sell it. The lint checks that a promise *parses*, never that it is *kept*.

`tools/prose-claims.mjs --affordances`, which exists to check invitations against
the verb set, currently reports **0 findings**.

---

## 3. The diagnosis

Each instrument is bounded by an artifact a human authored, and each artifact
encodes the same mental model as the code:

| Instrument | Bounded by | Verified blind to |
|---|---|---|
| vm tests | hand-constructed call sequences | the real path across `G.day++` (WORK, 65 nights) |
| promise lint | the parenthesized-CAPS convention | all 3 round-12 promise defects |
| soak walker | `WILD_STATIC`, 19 hand-written strings | 94% of parser verbs; `WORK` 0/2,592 |
| soak assertions | safety properties only | every class-B (absence) defect |
| prose-claims | the claim patterns anticipated | 0 affordance findings |
| examine-audit | nouns harvested from room prose | every verb other than EXAMINE |

This is the same finding as §2.6 of the companion document, one layer down.
There, the point was that *model* diversity is not *epistemic* diversity. Here it
is sharper: **the tooling diversity is also not epistemic diversity.** Six
different instruments, one shared blind spot, because each one's reach is defined
by a list, a convention, or a sequence that the same mind wrote.

A persona has none of these bounds. It is given a *drive* and generates its own
trajectory, which is why it types WORK sixty-five times without being told the
verb exists.

---

## 4. What to do, in order

Ordering matters here, and it is not the order I gave last time.

### 4.1 Derive the soak's vocabulary from the engine, not from a list — **do this first**

Replace `WILD_STATIC` with a pool derived from the engine's own verb surface
(`_COMPLETE_VERBS` at minimum, ideally the 322 `case` arms filtered by
applicability). This is a small change to one file and it removes the walker's
mental-model bound at a stroke.

**This must precede any effect assertions**, because an assertion about the effect
of a verb the walker never types is worth nothing. That is the correction to my
earlier recommendation.

Caveat the tool's own header already anticipates: `tests/js/soak.test.js`
calibrates German-coverage ceilings against the current movement policy, so
changing the policy re-rolls those. Change the *verb* pool, keep the *movement*
policy, and re-baseline deliberately if the numbers move.

### 4.2 Add liveness assertions — a "did it ever fire?" ledger

With 4.1 in place, run a long soak and record which of a named list of effects
ever occurred: takings used the worked multiplier; the room safe paid; a
procurement job was asked; a quest completed; a rough wake happened; a bond
reached each tier. **Any effect with a zero count across a long multi-seed run is
either dead content or a class-B bug**, and the harness cannot tell you which —
which is exactly the right output, because a human reading a list of zeroes
answers it in seconds.

This is the single highest-value addition. It is the only instrument on the list
that would have caught WORK, the room safe, *and* the arrival-only gating.

### 4.3 A real-path rule, targeted rather than blanket

Not "convert everything" — 53% is already real-path and the 40% pure-data tests
are correctly pure-data. Target the measured outliers: **`barchain.test.js`
(3/38)** first, then `std`, `hillchain`, `accident`, `hospital`. Roughly 40 tests.
The rule to add to CLAUDE.md:

> Every subsystem needs at least one test that reaches it through the real entry
> point (`doCommand` / `_endNight` / `_tick`), even where a direct call is faster
> and clearer. Hand-constructed sequences prove behaviour; only the real path
> proves the feature *runs*.

### 4.4 Widen promise harvesting beyond the CAPS convention

Harvest candidate promises from *all* prose — the corpus already exists in
`prose-corpus.mjs` — using the affordance patterns `prose-claims.mjs` already
knows, and flag the case the current lint deliberately passes: **prose asserts a
thing is available, and the verb answers with a refusal.** That is the exact
signature of ya dong, the som tam, and both massage tariffs.

Highest ceiling of the four, and the most work; it is also the class most likely
to keep recurring, because it is generated by authoring rather than by coding.

### 4.5 Keep running personas

None of the above replaces them. Every instrument above is a *bound* instrument
by construction; the personas are what find the defects outside every bound, and
they are what produced this list in the first place. What the four items above
buy is that the *same* classes stop coming back — so each round of personas
spends its budget on new ground.

---

## 5. Coverage, defined — and the baseline (2026-08-23)

Added after §4 shipped, because "the personas keep finding things" needed a
number behind it. `node tools/coverage.mjs`.

**Why not line coverage.** Every severe defect this project has found by playing
lived in one of two places: a mechanic that never fired, or a room/verb/character
nobody had reached. Line coverage sees neither — a line is "covered" the moment a
test touches it, and *every one of those bugs sat in lines the suite already
executed*. WORK was covered by 38 green tests while doing nothing.

**So coverage here means OBSERVED SURFACE**: places stood in, words typed, people
spoken to, authored lines actually delivered, mechanics actually fired. The
headline is the **union across runs**, because one run's number describes the run
rather than the game.

### Baseline — THE AUTOMATED INSTRUMENT ONLY (soak union, 5 modes × 6 seeds × 6 nights, 14,584 commands)

**This is the soak's map, not the personas'.** It measures what the random walker
reaches. Persona coverage is a different — and currently unmeasured — quantity:
those sessions ended without their state being captured, and a persona who
deliberately talks to people covers dialogue at a rate a random walker never
will. The first two persona saves are being collected now (`--save`), and until
they are scored, **no claim about total observed surface is supported by
anything here.**

| dimension | observed | exists | |
|---|---|---|---|
| rooms stood in | 123 | 237 | 51.9% |
| parser verbs typed | 198 | 327 | 60.6% |
| NPCs spoken to | 45 | 331 | 13.6% |
| patrons spoken to | 8 | 24 | 33.3% |
| **authored NPC dialogue delivered** | **109** | **1,695** | **6.4%** |
| authored patron dialogue delivered | 25 | 137 | 18.2% |
| street encounters seen | 9 | 22 | 40.9% |
| quests completed | 1 | 32 | 3.1% |
| mechanics fired (liveness) | 17 | 19 | 89.5% |

**The number that matters is 6.4%** — and it must be stated precisely, because
the loose version of it is wrong. Ninety-four percent of the authored dialogue in
this game has never been delivered **to the automated instrument**. It is NOT
true that nobody has ever seen it: personas and the author have, and neither was
measured. The defensible claim is narrower and still useful — **the thing that
runs on every commit sees 6.4% of what is written**, so the suite cannot be
protecting the rest of it, and prose that has never been delivered to anything
that checks is prose whose defects nothing can catch.

That is consistent with the pattern in §2 without proving it: personas may be
finding things because they walk surface the automated instrument never reaches.
It predicts the finding rate should fall as that surface shrinks — testable, and
the reason for the control experiment.

Contrast **verbs at 60.6%** — up from 5.6% before §4.1 derived the walker's
vocabulary from the engine. That is the same instrument, measured before and
after one change, and it is the clearest evidence that these dimensions move when
you fix the thing they measure.

### Reading the numbers honestly

- **Denominators are what EXISTS, not what one playthrough can reach.** Several
  rooms and characters are stage-gated by design. 100% is not the target and
  never will be; the metric is for tracking movement, not for scoring.
- **Some dimensions are instrument-limited, and the tool says so.** Quests at
  3.1% is a fact about the random walker (it cannot climb a dep chain), not about
  the quests.
- **`--save <file>` scores a real session on the same scale** — the only way to
  compare a persona's or a human's coverage against the automated baseline. Verb
  coverage is unavailable there, since a save doesn't record what was typed.
- `--gaps` lists what was never touched: which rooms, which verbs, which people.
  That list is the natural work queue for the next persona.
