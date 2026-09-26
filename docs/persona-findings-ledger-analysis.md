# What 761 confirmed persona findings say about tracking and aiming persona testing

**Written 2026-09-27**, the day the findings ledger got its fixed half. Data:
`docs/persona-findings.json` (79 rows with a triage verdict, rounds 51–53) + 750 fixed
findings derived from the pinned tests (rounds 5–53), classified by four Sonnet judges
against the repo's own defect taxonomy (`docs/playtest-findings-analysis.md` A–H,
`docs/persona-findings-systemic.md` I–N, plus P–S added here) and stored in
`docs/persona-findings-classes.json`. Reproduce with `node tools/findings-ledger.mjs
--stats` and `--aim`.

**Read the limits first.** A pinned test's title is the *fix* phrased as an invariant, not
the claim the persona made, so the judges classified from the fix backwards and marked 502
of 802 rows low-confidence. 41 rows are the author's own design pins that live in round
files (class X) and are not findings; they are excluded below. Severity was read from the
wording. The refuted rate is only trustworthy from round 51 on, because before that a
refuted verdict was never data. Treat every percentage as ±5.

## 1. The shape of what personas find

| class | n | share | severe | an instrument could see it |
|---|---|---|---|---|
| L wrong predicate | 96 | 13% | 4% | 86% |
| D promise | 82 | 11% | 4% | 88% |
| F state-blind prose | 60 | 8% | 3% | 48% |
| A composition | 52 | 7% | **17%** | **10%** |
| B absence | 51 | 7% | 12% | 55% |
| P parser/vocabulary | 47 | 6% | 2% | 32% |
| G modal/input gating | 46 | 6% | **15%** | **0%** |
| Q repetition | 42 | 6% | 0% | 67% |
| R world-claim | 41 | 5% | 10% | 93% |
| I edge-blind | 37 | 5% | 14% | 100% |
| H cross-surface | 36 | 5% | 11% | 47% |
| E economy | 34 | 4% | 12% | **9%** |
| N town can't say | 33 | 4% | 0% | 97% |
| C reachability | 29 | 4% | **21%** | 28% |
| M one template | 22 | 3% | 0% | 100% |
| S save/reload | 21 | 3% | **24%** | **5%** |
| J return-channel | 18 | 2% | 11% | 100% |
| K clock-in-prose | 14 | 2% | 0% | 100% |

Severity overall: 62 severe or blocking (8%), 545 ordinary, 154 cosmetic. 24% of findings
are a contradiction *between* two named things (prose vs mechanic, HELP vs parser, the live
prompt vs its redraw, one night vs the next) — the shape the project's method note says
no per-string instrument can see, confirmed at a quarter of everything found.

## 2. Four things the numbers say

**2.1 Severity lives where the instruments aren't.** The five classes with the highest
severe share — save/reload 24%, reachability 21%, composition 17%, modal gating 15%,
economy 12% — are the five with the *lowest* instrument coverage (5%, 28%, 10%, 0%, 9%).
The classes the instruments cover well (K, M, N, R, J, I, D, L: 86–100%) are 0–4% severe,
with I at 14% the one exception. So the instrument programme has done exactly what it
set out to do — convert the *recurring* classes into cheap deterministic checks — and the
residue it leaves to the personas is the expensive end. That is the right division of
labour, and it says what to build next (§4).

**2.2 The largest class is still arriving after its lint shipped.** Class L (the wrong
predicate — `G.known` read as "met", `G.drunk` where `G.soc.drunk` was meant, `region` as
"in town") is 13% of everything and was 11 of 43 findings in the most recent week, after
`templates.test`'s predicate lints shipped on 2026-09-15. The lint covers three named
predicates; the class is open-ended — every new field the engine gains is a new way to ask
the wrong one. This is the one class where the instrument is the right shape and simply
needs feeding: each L finding should add its predicate to the lint the day it is fixed.

**2.3 Narrow lenses out-yield broad ones by an order of magnitude.** Findings per person
spoken to: one-girl-bond 36.7, owner-low-season 28.2, prose-subeditor 21.7,
owner-money-ledger 17.0, commute-home 14.3 — against people-collector 0.3, soi6-cast 0.3,
never-pays 0.7, quest-completionist 0.7, no-bar-circuit 0.5. A persona who does ONE thing
obsessively finds the seams of that thing; a persona who meets everyone finds that they
can be met. The breadth lenses are still worth one run each (they move the coverage union,
which is a different quantity), but they are not where findings come from. The game's own
doctrine — depth beats breadth — holds for its testers.

**2.4 A lens has a class signature, and it is predictable from the brief.** The sober
lens produced edge-blindness (I×7: every comp that forgot the sober man); identifiability
produced world-claims (R×5); owner-money-ledger produced absences (B×5: things that never
fired on the P&L); prose-subeditor produced promises and world-claims (D×7, R×5);
body-ledger produced wrong predicates (L×6: the meters read the wrong field). The lens
*is* a class filter. That means the next round can be aimed at a class gap rather than a
coverage gap, which the coverage union alone never let it be.

By model, over the 175 attributed rows: Opus 106 (D14 B14 L13 A10 — the model and economy
classes), Fable 60 (D9 L8 F7 I7 R6 — voice, state and contradiction), Sonnet 9. That
matches the standing note (Fable = voice/contradiction, Opus = economy/model defects) and
adds nothing new; the sample of Sonnet rows is too small to say anything.

## 3. Tracking: what the ledger should carry, and what it can't yet

- **Record the CLAIM at triage, not the fix.** The single biggest quality loss in this
  analysis is that 750 rows are fixes phrased as invariants. From round 54 the ledger row
  carries the persona's sentence; the test title stays the invariant.
- **Class, severity and instrument on every row, at triage** (`cls`, `sev`, `instrument`,
  and `between` when it is a contradiction). Thirty seconds per finding; it is what makes
  `--aim` honest instead of a one-off.
- **Keep design pins out of the round files, or tag them.** 41 of the "findings" are
  Mario's rulings and canon pins that happened to be written in a `roundNN.test.js`. A
  `// design:` marker on the test, or a `design.test.js`, keeps the ledger's denominator
  clean.
- **Effort per run is not recorded.** The coverage record has a `commands` field and no
  persona run has ever filled it — the driver ledger counts rooms and verbs, not commands
  or nights. Findings per hundred commands is the yield metric that would let two lenses
  be compared fairly; add `commands` and `nights` to the driver ledger.
- **Model on every row.** 375 of 829 rows are attributed to a persona and 204 to a model;
  before round 40 the model was often not written down. It is one word in the brief.
- **Refuted findings need the SAME care as fixed ones.** The 8%/3% Fable/Opus refuted
  rates are from 72 verdicts; that is one round's worth. Twenty more rounds of verdicts
  before treating the difference as real.

## 4. Guiding: where to point the next persona

`node tools/findings-ledger.mjs --aim` ranks the classes by (severe share − instrument
coverage) and names the lenses that have produced each. Today's top of that list:

1. **Save/reload (S)** — 24% severe, 5% covered. No instrument replays save → reload →
   compare against a live modal, an encounter, a game, the dice. The lens that finds it is
   the *returning player* and *old-save loader*; the instrument that would retire it is a
   scripted save/restore harness over every `pendingChoice` / `pendingEnc` / `G.game` state
   (the `_renderResume` contract, asserted rather than documented).
2. **Modal / input gating (G)** — 15% severe, 0% covered. A modal that swallows a command,
   misreads a word (`WAIT` as `WAI`), or answers a junk line as YES. A fuzzer that puts
   every verb and forty junk strings into every modal and asserts the modal either answered
   or said it didn't is a day's work and would cover the class.
3. **Composition (A)** — 17% severe, 10% covered. Two correct systems interacting wrongly
   across a boundary (a night, a room change, a lock-in). The real-path rule and the soak's
   liveness ledger see the *absence* half; the composition half wants state-diff
   invariants asserted across day boundaries in the soak (money, hurt, drunk, flags that
   must be monotonic or must reset). Lens: owner-low-season found six of these alone.
4. **Reachability (C)** — 21% severe, 28% covered. A critical path that a broke, dark,
   or first-night player cannot walk. A BFS over the world graph under constraints
   (money 0, torch off, Act One) for every promised destination would cover it; the
   safe-route-blind lens found it by hand three times.
5. **Economy (E)** — 12% severe, 9% covered. Magnitudes that only show over a horizon: an
   uncapped counter, a farmable scene, a fee dropped from a total. The 30-night ledger
   reconciliation exists as an audit that was run by hand once; making it a soak assertion
   covers most of the class.

And the standing rule from §2.2: **every class-L finding feeds the predicate lint the day it
is fixed**, because that class is the biggest, is still arriving, and has the right
instrument already built.

For the personas themselves, three briefs-shapes the data recommends over the "walk into
the never-spoken-to list" default:

- **One thing, obsessively** (§2.3) — the brief names a single ledger the persona keeps
  (the body, the money, one woman, one bar, one hotel) and asks them to hold the game to
  its own numbers on that ledger. Yield is 10–30× the breadth briefs.
- **The newest predicate** — the systemic doc's rule, confirmed: the party, the affair, the
  ride and the sober declaration were each written in a session and consulted from thirty
  places; a persona who walks the newest one finds twenty edges in a night (I is 14%
  severe and 100% instrumented *because* three such runs fed the registry).
- **The returning tester** — one persona per round is handed the previous round's fixes as
  claims to verify and its deferred rows as leads. Refutation is data now; a round that
  refutes nothing has not been checked.

## 5. What this analysis cannot tell you

Whether a finding was *found* by the persona or by the author triaging next to them —
29 titles credit Mario directly and the rest are silent. Whether the severe findings were
severe to a *player* or to the author's sense of the design. Whether the same persona
would find the same things twice (the control experiment in the epistemics note found
26 vs 27 — different findings, same count). And anything about rounds 1–18, whose fixes
sit in `engine.test.js` without a round.
