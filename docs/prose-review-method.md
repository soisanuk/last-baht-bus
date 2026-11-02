# Reviewing this game's prose

Three passes exist, and they catch different things. Running the wrong one is how a
defect survives three reviews.

## 1. The delta pass — "has this string been read at this wording?"

```sh
node tools/prose-corpus.mjs --delta        # unreviewed records, with the render column
node tools/prose-corpus.mjs --seed         # mark the dumped set read
```

Reads each record **on its own page**, in reference order. The hash ledger
(`docs/prose-review-ledger.json`) makes it delta-sized; editing a string changes its hash,
so it returns to the next delta on its own.

Apply the six-point checklist in the tool's header to every record: CLAIM · PROMISE ·
TAPS · HOURS · THAI · NUMBERS.

Two rules of use, both learned the hard way:

- **The delta shows the RENDER, not just the text.** `[taps: …]` under each record is what
  `decorate()` will make tappable. Sixteen "the phone"s that belonged to somebody else
  passed a text-only review because the defect was never on the page — the word taps
  through to the *player's* phone, and that fact lives in term.js, not in the sentence.
- **`--seed` goes in its own step, never in the same shell chain as the commit.** A seed
  that runs unconditionally is a rubber stamp with a timestamp. On 2026-09-07 3,394 records
  were un-seeded for exactly this reason and re-reviewed.

**What it cannot catch, in principle:** anything that needs two records at once.

## 2. The dossier sweep — "does everything the game says about X agree?" (2026-09-07)

```sh
node tools/prose-corpus.mjs --dossiers --taps      # regrouped by WHO/WHAT each record is about
node tools/prose-corpus.mjs --about bert           # one subject
node tools/prose-corpus.mjs --rooms --taps         # regrouped by the PLACE each record describes
node tools/prose-corpus.mjs --rooms queen_vic      # one room, with its region/type/exits
```

This is the pass that exists because of the project's characteristic defect: **an assertion
that is fine on its own page and false about the world.** Tan drove a minibus in the intro
and a grey sedan everywhere else. Bert had twenty-two years on Beach Road in his description
and thirty in a line elsewhere. Fast Eddy lost his bar five years ago in one node and eight
in another. Waen had eleven years in a four-year bar.

**A contradiction needs co-location, and writing never co-locates.** Neither does ref-order
review. The dossier pivot supplies the co-location; that is the entire mechanism.

- **`--dossiers`** groups by subject: every record that names a character, patron, bar or
  item, plus everything they say. Matching is case-sensitive on the display name, with
  ordinary-word names (Ice, Nong, May) speaker-only so they don't flood.
- **`--rooms`** is the sibling for places: a room's `desc`, every `revisit` line, every
  `lateDesc` line and every `reads:` fixture together, under a header giving its region,
  bar type and exits. A room is described by five or six strings written months apart and
  they drift the same way a person does — Central Mall's two faces disagreed about the time
  of day, and the Eastern Seaboard office listed its whole contents and then watered a plant
  that wasn't in it.

Read for, in order: contradiction · arithmetic that doesn't close · voice drift within one
character · a place whose strings aren't the same place at the same hour.

### The quest pivot

```sh
node tools/prose-corpus.mjs --quests --taps      # every quest, its prose AND its wiring
node tools/prose-corpus.mjs --quests plg_deal  # one quest
```

The third pivot, and the only one whose contradictions break **play** rather than fiction.
A quest is written in five places that never sit together — the `QUESTS` record, the giver's
whole dialogue, the node that sets its `doneFlag`, the item it hands over, and the `at:`
that HINT and the journal turn into "where to go next". The section header states the wiring
before the prose, so a reviewer can see that a desc promises a step nobody can take, that a
`doneFlag` is set by a node gated behind the quest itself, or that `at:` and the prose name
two different places.

### The coverage map

```sh
node tools/prose-corpus.mjs --map                  # who has been read as a whole, and who moved since
node tools/prose-corpus.mjs --dossiers --delta --taps   # only the new or stale subjects
node tools/prose-corpus.mjs --rooms --delta --taps      # …and rooms
node tools/prose-corpus.mjs --quests --delta --taps     # …and quests
node tools/prose-corpus.mjs --dossiers --only batch.txt --seed   # record exactly what was read
```

### Running the sweep in parallel, and handing the batch back

The sweep that found nineteen contradictions in one afternoon (2026-09-08) was five Fable
subagents, each given a list of subjects and told to run `--about <subject>` per name, read
each dossier as one document, and report clashing pairs with both refs. It works because the
model reading is not the model that wrote the prose, and because the pivot has already done
the only hard part.

Two things about it are worth copying exactly:

- **`--about` resolves NPCs, patrons, bars and items — not street or interior ROOMS.** Half
  of the first sweep's list was room names, and each agent independently discovered they had
  to switch to `--rooms <id>`. Split the queue by pivot before you launch: `--map` prints the
  cast list and the room list separately, and the room pivot wants **ids**, not display names.
- **`--dossiers --seed` seeds every subject it dumps.** Run it after a sweep and you rubber-
  stamp the hundred-odd nobody read — done once, reverted, the same afternoon. **`--only
  <file>`** (one subject per line, or one room id per line for `--rooms`) hands the agents'
  batch lists back to the tool so the map records what was actually read, and reports the
  names that didn't resolve rather than swallowing them.

Three agents flagged Laurent Vasseur independently, which is the signal worth watching for: an
overlap between batches is not redundancy, it is corroboration, and the corroborated finding
was the one worth fixing first.

The string ledger cannot answer this pass's question, because its unit is a sentence and
this pass's unit is a subject. `docs/prose-dossier-ledger.json` keys on the subject and
hashes over **all** of its records, so a dossier has three states:

| state | meaning |
|---|---|
| `new` | never read against itself |
| `stale` | read once, but a record has since been added or reworded |
| `current` | read at this exact set of records |

**A dossier reopens the moment any record in it moves**, which is the property the whole
pass rests on: the new line is precisely the one that might contradict the old ones. Editing
one line of Bert's description reopens Bert *and* Candy, because that line names them both.

**Settled findings** live in `docs/prose-dossier-accepted.json` and print at the head of
their subject's dossier, so a reviewer sees what has already been ruled on before they read
a word. Every entry carries the finding, who ruled, and why. An instrument that cannot be
told "yes, we know" re-reports the same judgement calls every run, and its operator learns
to skim it — which is how a lint dies. Never use the list to bury something nobody has
looked at.

`--delta` means different things to the two passes and the tool keeps them apart: unreviewed
*strings* for the delta pass, new-or-stale *subjects* here. Seed only after somebody has
actually read them, and never in the same shell chain as a commit.

## 3. The lints — everything mechanical, corpus-wide, on every commit

`references.test.js` (venues, people, hard-coded ฿N) · `promises.test.js` (the
parenthesised-CAPS tap idiom parses) · `afford-audit` (anything the prose says you can HAVE
is buyable, judged by state change) · `asktopic-audit` (every ASK the prose promises is
answered, in both stages) · `errand-audit` (an instruction naming a person can be obeyed) ·
`term.test.js`'s tap sweeps (no prose taps another character or your own inventory item by
accident — including room `reads`/`revisit`/`lateDesc`, quest descs, encounter intros and
the engine's own `_say` literals, pulled via `--json` so nothing is hand-listed).

These are cheap and they run unattended. **Never spend a review pass on a class a lint
already covers.**

## Which pass to run

| Situation | Pass |
|---|---|
| You just wrote prose | 1, then seed separately |
| You invented a fact about a recurring person, place or price | 2 first (`--about` before you write), then 1 |
| A persona reports a character "said two different things" | 2, on that subject |
| Prose is old and has never been read against itself | 2 — do NOT re-run 1 over it |
| Adding a verb, item, venue or hint | 3 will tell you; run the audits |

## Who reviews

**Not the author, and not in the same session.** Measured twice: the German batch, where
cross-model review caught 26 issues self-review had passed; and 2026-09-07, where six
independent Opus reviewers found ~60 real defects in 3,346 records the author had marked
reviewed minutes after writing them. Self-review found none of them.

Subagents get the batch file, a brief, and no access to `web/js/*.js`. They report findings
only — refs, short quotes, the class, one sentence — and never edit. Triage is the author's:
verify with `tools/probe.mjs` before fixing (a third of "bugs" are reading-order artefacts),
pin every real fix in a test, and send design calls to the user rather than into the code.

## 4. The graph pass — "does the prose agree with the EDGE between two nodes?" (2026-11-01)

```sh
node tools/dialogue-walk.mjs --script <dir>   # every character rendered in gate order; the reader's input
node tools/dialogue-walk.mjs --lint --all     # dead, pre-empt, residue, fact, pronoun — before paying a reader
node tools/dialogue-walk.mjs --shared --all   # one sentence in two mouths (430 runs; ~8 are real each round)
node tools/graph-prose.mjs                    # places, pairs, quests, items, encounters against the world graph
node tools/gen-world-graph.mjs                # regenerate first if an engine or world file moved
```

The first three passes read a string, a subject or a quest. None of them reads a **relation**: a room that puts
another "next door" when the exits say four hops, a desc that puts a place "south of" another when the survey says
north, a quest whose journal keeps pointing at the middle stop after it is made, an encounter that names a street it
never fires on. `docs/world-graph.json` already holds every such edge (EXIT, LOCATED, GIVEN_BY, DONE_BY, AT, SETS,
GIVES), so the check is a join, not a reading.

What is gated, and where:

| relation | checked against | test |
|---|---|---|
| "next door / across the road / opposite" + a named place | ≤ 2 hops on the EXIT graph | `place-graph.test.js` |
| a direction word bound to a named place | survey bearing (`ROOM_GEO`), ±75° | `place-graph.test.js` |
| a closing hour given for a named venue | `_closeTurn` | `place-graph.test.js` |
| a quest's static `at` vs the character whose node sets its `doneFlag` | same room, or `at` is a function of the step | `dialogue1101.test.js` |
| an encounter's prose naming a district or a person | the regions and people of the rooms it fires in | `prose-graph.test.js` |
| a person's description pronouns | `_pr(id)` | `prose-graph.test.js` |
| an item with both a room and a GIVES node | one home | `prose-graph.test.js` |

What stays a reader's query (`tools/graph-prose.mjs --pairs`, `--items`, the informant rows of `--quests`): the
adjacent room pairs whose prose names each other (read each pair as one document — the only way a contradiction
between neighbours shows), an item named near a place that is not its home (prose names an item's *destination*
far more often than its home; 132 raw, 0 real), and a quest that names its informants.

Rules learned the expensive way, now in the code: a direction word is bound to the name it modifies, not the
nearest one in sixty characters; "south **of** X" means X lies north; "Soi N" is per district; adjacency is the
walked graph and bearings are the survey, and neither is bent to flatter the other; the pre-empt lint keys on a
node's FIRST alias, so the fix for a pre-empted node is usually to reorder its aliases.

**The reader half.** The walker's scripts are the input to a reader pass — the brief is `docs/dialogue-reader-brief.md`
(voice axes, shorts, retelling, moralising, claims, hours, witness, promises, guardrails; a strict one-line finding
format; no access to the sources). Batch by size (~150 KB a reader), run them one at a time under a tight window,
triage every finding with `tools/probe.mjs`, pin every fix, and never seed the dossier ledger as the author. The
2026-11-01 round read the 25 characters with fifteen nodes or more by hand after eight parallel readers died on the
usage limit; the write-up (`docs/dialogue-walk-2026-11-01.md`) lists who is still unread.
