# Coverage extracts

One small JSON per measured session, written by `tools/coverage.mjs --record <label>`.
Each holds **only the ids observed** — rooms stood in, verbs typed, people spoken
to, authored dialogue nodes delivered, mechanics fired — never the save itself.
Saves are bulky and are somebody's game; an extract is ~8 KB, unions trivially,
and diffs legibly in review.

```sh
# the automated baseline (re-record after changing the walker or adding content)
node tools/coverage.mjs --seeds 1,2,3,4,5,6 --nights 6 --record baseline-soak

# a persona or human session: dump the save, then score and keep it
#   node tools/playtest-driver.mjs raw --dir <D> "serializeGame()"  > save.json
node tools/coverage.mjs --save save.json --record persona-<name>

# the question that actually matters
node tools/coverage.mjs --union
node tools/coverage.mjs --union --gaps     # …and where NOBODY has been
```

**Why the union is the point.** `baseline-soak` measures what the automated
instrument reaches, and that is *not* the same quantity as what anyone has seen.
Personas cover dialogue at a rate a random walker never will, and until they
started recording, none of it was measured. The union is the closest thing this
project has to "how much of this game has anyone observed, by any means" — and
`--union --gaps` turns that into the work queue for the next round.

**Reading it honestly:** denominators are what EXISTS, not what one playthrough
can reach, so 100% is not the target and never will be — several rooms and
characters are stage-gated by design. The metric is for tracking movement. Full
reasoning in `docs/testing-gap-analysis.md` §5.
