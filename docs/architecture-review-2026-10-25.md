# Architecture review — 2026-10-25

A design-level review of the codebase, written the day after `docs/architecture.md` mapped it and the adversarial code
review (`docs/code-review-2026-10-25.md`) fixed 78 proven defects. The code review asked *is this function right?*; this
asks *what shape keeps producing wrong functions, and what would stop it?* The defect history is the evidence: 107 persona
rounds, the findings ledger and yesterday's 78 findings all point at the same handful of structural causes.

It respects the declines recorded in `docs/code-audit-2026-08.md` (splitting `world.js` for collision reasons, the
scrollback cap, the cheats flag) and does not re-propose them on those grounds.

## What the architecture gets right — keep it

- **The six engine rules hold, and they are enforced.** No browser or clock in the core, one serialisable `G`,
  deterministic dice through `G.rng`, output through a callback, actions as `_do*` functions, content as data. The online
  test, the save merge-over-`newGame()` and the vm suite all depend on them and none was found broken by any review.
- **Save compatibility is free.** `deserializeGame` merging over a fresh `newGame()` means a new field needs one line —
  the cheapest migration story a game this stateful could have.
- **The instruments are derived from the engine.** The modal, money, happiness, composition, memory, chorus, question,
  witness and afford audits read the source or play the real entry points; they do not trust a hand-written list. That is
  why they keep finding things the authors did not think of.
- **Content is genuinely declarative.** `world.js` is 21,559 lines with 23 functions; rooms, people, quests and
  dialogue are data, and the dialogue walker, the corpus tool and the portrait pipeline all read it as data.

## The numbers

| | |
|---|---|
| Engine (five files) | 49,325 lines · 1,281 functions · median function 6–14 lines |
| The two routers | `_doCommandInner` **2,087 lines** (437 case labels) · `_doTalkCore` **1,372 lines** (54 ordered early-answer helpers) |
| Other functions over 600 lines | `_doBuy` 786 · `_endNight` 672 · `_townTalk` 663 |
| State | ~216 top-level `G` fields · 147 distinct `G.soc.*` keys · 428 distinct `G.*` names referenced |
| `typeof _x === "function"` guards | **1,155** across the engine (627 in engine-parser alone) |
| `_say(` call sites in the engine | 3,255 · unanchored `regex.test(` sites 1,388 |
| Inline history citations ("(Name, round N)") | ~1,800 in the engine; comments are 19–36% of lines |
| Tests | 174 files · 44,366 lines · 78 files named by round/review rather than system · 118 files carry their own load list |
| `CLAUDE.md` | **72,214 words** (~95–100k tokens), loaded into every session |

Most of the engine is small functions. The risk is concentrated in four places, and each matches a defect class.

## Findings, ranked by what they cost

### 1. CLAUDE.md is the most expensive file in the project (severe, cheap to fix)

At ~72k words it is loaded into the context of every session before any work starts — on the order of 100k tokens,
every time, for every subagent that inherits it. It has become a round-by-round changelog (each persona round appends a
paragraph naming functions, personas and verdicts), which is history, not instruction. Most of it is now duplicated
better elsewhere: the system map is `docs/architecture.md`, the defects are the findings ledger, the pins are the round
tests. It also *rots*: several paragraphs describe behaviour later rounds changed, and a reader cannot tell which.

**Recommendation:** cut CLAUDE.md to the doctrine and the pointers — the repo-ownership rules, the commands, the six
engine rules, the cross-cutting authoring rules (three surfaces, pooled prose, the witness rule, a refusal is never a yes,
a day stamp ages with the trip, the comment trap), the canon that is not in code, and links to `docs/architecture.md`,
`docs/persona-findings.json` and the round tests. Move the round paragraphs verbatim to `docs/rounds.md`. Target: under
8,000 words. This is the single change with the largest effect on what each session costs, and on how much of the
context window is left for the work.

### 2. The routers are an implicit priority list written as source order (severe, the top defect class)

`_doCommandInner` runs dozens of raw-text intercepts, the prompt gates, the sentence reader and a 437-case switch, in an order
that exists only as the order of the source. `_doTalkCore` tries 54 answerers — `_lastTimeTalk`, `_flightTalk`,
`_mineTalk`, `_deedTalk`, `_textTalk`, `_townTalk`, the authored node, the miss pools — first match wins. **The order is
the design, and nothing records it.** That is exactly where the most persistent persona class lives: *a later stage never
got the input because an earlier one took it* (Eddy's THE JOB taken by the job offer; "I won't pay" taken by the pay
branch; a YES taken by an older arm; a bare word taken by a verb meant for a sentence). Every fix inserts one more
special case at the right line, which makes the next one harder to place.

**Recommendation:** make the order data. An ordered responder table for each router — `{ id, when(ctx), answer(ctx) }`
— walked by a ten-line loop, with the context (`raw`, `lower`, `topic`, `npc`, the reader's `_read` result) computed once.
Then: a test that prints the order and fails when it changes without a note; per-responder coverage in the soak (which
responder answered); and a "why did X answer?" trace for persona triage. Migrate one router at a time, starting with
`_doTalkCore` (the smaller, and the source of the conversation defects), moving existing branches into the table without
changing behaviour, pinned by the existing 3,300 tests.

### 3. State lifetime is encoded by *where* a field lives, and the code review's two biggest classes were lifetime bugs (severe)

A field's lifetime — tonight, this trip, this life — is implied by its location (`G.soc` is mostly nightly, but only for
the keys `_endNight` remembers to reset; `_newVacation` rebuilds `G.soc` keeping four books; `_ageBooks` shifts some
day-stamps). Yesterday's review found both halves of this: nightly keys never reset (`tipBond`, the mama treat's marker),
and day-stamps that never aged across a trip (the booking app, the rose seller, the laundering payouts). The fix was a
sweep by naming convention (`G.<x>Day`), which is a good stopgap and a fragile contract.

**Recommendation:** declare lifetime once. A `STATE_SCHEMA` table beside `newGame()` — field → `{ life: "night" | "trip"
| "life", day: true }` for day-stamps and deadlines — read by `_endNight` (reset the night's), `_newVacation` (reset the
trip's, age the day fields) and `_ageBooks`. A test fails on any `G` or `G.soc` key the source writes that the schema does
not list. That turns "remember to reset it" into "the build tells you". `types/game.js` can derive from it too.

### 4. 1,155 `typeof` guards hide missing functions (moderate)

Engine code calls engine code through `typeof _x === "function" && _x()` because some vm tests load a subset of the files.
In the real game every file is always loaded, so the guard never protects anything there — but it does turn a renamed or
deleted function into a silently disabled feature instead of a crash. (The architecture doc's lint now catches a stale
name in prose; nothing catches one in code.) The 118 hand-written load lists are the same cause and the reason the
August audit priced a file split at 51 files.

**Recommendation:** one shared loader (`tests/js/_load.mjs`, used by every test and tool) that always loads the full
engine in order; then a lint that flags a `typeof` guard whose target is defined in an engine file, and remove them in
batches. Keep the guards for genuinely optional globals (`cli-sim`, the news bake, the frontend's own hooks). The shared
loader also removes the cost the August audit used to decline splitting, should a split ever be wanted for its own sake.

### 5. Prompts are wired "five ways" by hand (moderate)

A prompt (`G.pendingChoice` and its siblings: 22 assigned by a literal, more through variables, and 101 places that test for one) needs an intercept in
`_doCommandInner`, a redraw in `_renderResume`, chips in `_chipSet`, completion in `engineComplete` and a recipe in the
modal audit. The audit catches a missed surface after the fact; the shape invites missing one.

**Recommendation:** a gate registry — `{ id, prompt(), chips(), complete(), answer(input), resume() }` — that the five
surfaces iterate. A new prompt becomes one record, the modal audit reads the registry, and the night's end can clear "the
night's own calls" from a flag on the record (yesterday that was a hand-kept list).

### 6. History lives in the code comments (minor, but it compounds)

About 1,800 inline citations ("(Steve, round 84)") make the source a second changelog. The *why* is valuable; the who and
when belong in git and the ledger, and they make the real logic harder to read in the functions that most need reading
(the routers above are a third comment by volume). **Recommendation:** for new code, comment the rule, not the round; when
a function is moved into a responder table (2), leave one line of why per responder.

### 7. Tests are organised by when a defect was found (minor)

78 of 174 test files are rounds, reviews or sweeps. They are fine as pins, but a developer changing one system cannot find
its tests except by grep. **Recommendation:** list each system's test files in `docs/systems.json` (the architecture doc's
"Tests" lines already name them) and let `docs/architecture.md` generate them; no file moves needed.

## Not recommended

- **Splitting the engine files by system.** Tempting given `engine-parser.js` holds conversation, the town's knowledge and
  most verbs as well as the parser. But files are not the problem — the implicit order inside two functions is. Do 2–4
  first; a split afterwards is cheap (one loader) and optional.
- **Moving engine prose to data now.** 3,255 `_say` sites are the known cost of the sibling-settings goal
  (`docs/settings-reuse.md`). It is the right long-term direction and the wrong next step: it touches everything and fixes
  no defect class. Do it per system when a system is next reworked.
- **A build step or modules.** The classic-script, no-build, `file://` constraint is a feature (the trainer shares it, and
  the hosted model in `online.test.js` depends on it). None of the above needs a bundler.

## Suggested order

*Progress (2026-10-25): step 1 done — CLAUDE.md is 5,613 words (from 72,214), the full text in `docs/claude-history.md`. Step 2 done the cheaper way — the shared loader turned out unnecessary (every test already loads all five engine files; only `cli-sim` is optional), so 885 lines of engine-internal guards were removed mechanically and `tests/js/guards.test.js` ratchets the remaining 204 (if/else forms) toward zero. Step 3 done — `STATE_SCHEMA` in engine-core declares all ~430 top-level fields and 147 `G.soc` keys (generated from what the code did, then corrected: `salengBar` and `steered` were nightly by their own comments and never reset), `_endNight` resets the nightly keys by type, `_ageBooks` reads its day list, and `tests/js/state-schema.test.js` fails on an undeclared field. Step 4, first half — the conversation router's order is now written down and pinned: `tools/talk-order.mjs` extracts the 44 answerers `_doTalkCore` tries, `docs/architecture.md` shows the list, `tests/js/talk-order.test.js` fails when it changes unrecorded. Still to do: moving them into a responder table, a "who answered" trace, and the same for `_doCommandInner`'s intercepts; then the gate registry. Step 5 done in its checking form — `GATES` in engine-core lists all 23 prompts with whether each carries across the night (`_endNight` reads it; the hard-coded list is gone), `tests/js/gates.test.js` requires all five surfaces for every prompt (it found the taxi intro had no completion, now added). Moving each prompt's code into its registry entry is left: the check already catches the missing surface the review was about.*

1. CLAUDE.md to doctrine + pointers (an hour; pays back on every session).
2. The shared test loader, then the `typeof` lint (mechanical; unblocks the rest).
3. `STATE_SCHEMA` (a day; closes the lifetime class for good).
4. `_doTalkCore` as a responder table, then `_doCommandInner`'s pre-switch intercepts (the largest and most valuable).
5. The gate registry, folded in when the next prompt is added.
