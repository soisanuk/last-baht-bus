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

### The coverage map

```sh
node tools/prose-corpus.mjs --map                  # who has been read as a whole, and who moved since
node tools/prose-corpus.mjs --dossiers --delta --taps   # only the new or stale subjects
node tools/prose-corpus.mjs --rooms --delta --taps      # …and rooms
node tools/prose-corpus.mjs --dossiers --seed       # record what was actually read
```

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
