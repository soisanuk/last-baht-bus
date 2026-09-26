# The coverage map — systems × defect classes

**Built 2026-09-27**, after `docs/persona-findings-ledger-analysis.md` showed that the
coverage union (rooms stood in, people spoken to) measures *reach*, and reach is nearly
orthogonal to where defects are found. This map measures where defects have been *looked
for*: `node tools/coverage-map.mjs` (the matrix), `--dark`, `--hot`, `--numbers`,
`--record`, `--system <id>`.

## The two axes

- **Rows are systems** — `docs/systems.json`, 51 of them: the wallet race, the clock, the
  body, sobriety, the bus, the motosai, lady drinks, the bell, the barfine, the party, the
  ride, the phone, conversation, quests, the regulars, the calendar, the games, Thai, the
  hotels, the books, the affair, the heist… The grouping is by hand, but the atoms are
  derived and guarded: every soak `EFFECTS` id, every `pendingChoice` modal, every quest
  and every encounter must belong to exactly one system, and the tool lists any stray. A
  new system that ships without a row shows up as strays until it gets one.
- **Columns are the defect classes A–S** (the analysis §1): composition, absence,
  reachability, promise, economy, state-blind prose, modal gating, cross-surface,
  edge-blind, return-channel, clock, wrong predicate, one-template, town-can't-say,
  parser, repetition, world-claim, save/reload.

A cell is one of: **n** findings fixed there (`*` if one arrived in the last two rounds —
*hot*), **■** an instrument covers that class for that system and nothing has been found
yet, **·** *dark* — nothing found, nothing mechanical looking, or blank — that class cannot
occur in that system (a save/reload defect in the guardrails). The dark count is therefore
cells that could hold a defect and have never been examined for one.

Findings come from the ledger (`docs/persona-findings.json`), classified by
`docs/persona-findings-classes.json` and placed by `docs/persona-findings-systems.json`
(both judge-tagged for the backfill; both carried by the triage row from round 54 on).
*Walked* = a persona whose coverage record touched the system's verbs/rooms/people, or who
filed a finding in it.

## The loop

1. `--dark` — the cells nobody has examined, grouped by class and ranked by the class's
   measured severity prior. **A column of dark cells is usually one missing instrument,
   not thirty persona runs**: save/reload is dark in 35 systems because no harness replays
   a save against a live modal; build that and the column goes ■ in one commit.
2. `--hot` — cells still producing findings. A hot cell under an instrument (`← its list
   needs feeding`) means the instrument is the right shape and its list missed the case:
   add the case the day the finding is fixed (class L, the largest, is all of this).
3. Aim the round: one persona at the darkest cell whose system exists to be walked (a
   one-thing-obsessively brief on that system — the lens shapes in the analysis §4), one at
   a hot system, and one **off-map** (the newest predicate, or a lens nobody has used),
   because the class that does not exist yet is invisible to any map.
4. Triage writes `cls`, `sev`, `system` on the row; `--record` after the round appends the
   scalar summary to `docs/coverage-map-history.json`. Those are the numbers to watch
   across rounds: **dark** (should fall), **hot** (should churn, not grow), **instrumented**
   (should rise as columns are stomped), **systemsNeverWalked** (should reach zero once).

## First reading (2026-09-27)

790 applicable cells: 381 lit, 129 instrumented, **280 dark**, 45 hot. Three systems no
persona has walked at all — **procurement, the affair, the Bangkok arc** — all expat-stage,
all reachable only through seeded saves (round 45's method). The hot cells are mostly
round 53's sobriety edges (I×6) and class L under its lint in five systems. The dark
columns worth an instrument before another persona: save/reload (35 systems, 24% severe
prior), cross-surface (28), modal gating (12, 15%), edge-blind outside the four registered
predicates (23).

## What it cannot show

The class that has not been named yet, and the seam between two systems nobody has put in
one brief — the analysis found 24% of all findings are contradictions *between* two things,
and a cell has one system in it. `system2` on a finding records the second party; when a
pair recurs it becomes a row.
