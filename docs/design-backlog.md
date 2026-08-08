# Design Backlog — Architecture, Features, and the Testing/Review Strategy

Prioritized recommendations, written 2026-08 against the post-Soi6-shakedown
codebase (698 vm tests, both shakedowns' findings shipped, 2D v0 spec'd). The
through-line: **the two manual shakedowns were expensive because a model played
the game one command per tool-call.** Most of what they caught is mechanically
findable; the strategy below moves finding into `node` (free) and spends model
tokens only on judging — the one thing that actually needs taste.

---

## 1. The soak harness — BUILT (tools/soak.mjs + tests/js/soak.test.js, 2026-08)

Status: shipped as specified below, plus refinements learned building it: the
save invariant is second-pass idempotence (save-compat unions skeleton defaults
in), night counting is world-rebuild-aware (RESTART/_act1Fail reset to the same
day number), and modal prompts' options aren't banked as room hints. CI runs 3
short seeded runs via node --test (gates deploy); the full spread is
`node tools/soak.mjs --seed 1,2,3,... --nights 8 [--mode soi6]` — ~1s for 13
runs. First session's catches: a real player-reachable infinite loop (Act One
WAIT across dawn with a persisted identity — a frozen tab, fixed in _doWait/
_doTravel with a G-identity guard), and KISS's advertised-but-dead 'BIG BEER'
tap (fixed: bare beer nouns route to _doBuy; food rooms serve beer). The
hint-tap promise-catcher and the soi6 off-pocket grep both proved out.

### Original design (for reference)

**`tools/soak.mjs`** — a monte-carlo autoplayer over the existing vm harness.
Everything it needs already exists: seeded deterministic RNG (`G.rng`), the
DOM-free engine, `tools/probe.mjs`'s loader, serializable state.

**Shape:**
- A dumb-but-plausible policy: weighted random verbs (look/talk/buy/social/
  travel/eat/drink), spends money, sometimes barfines, sometimes ignores its
  meters (that's how collapse paths get exercised). Seeded — one integer defines
  the whole run.
- Plays N nights (start with 50 in CI, thousands locally), across stages
  (act1 → vacation → expat) and both modes (full game + soi6).
- **Invariants asserted every turn**, the soft-lock/crash canary:
  - never throws; `doCommand` always returns
  - `G.money ≥ 0`; meters within 0–100; `G.happy` bounded
  - never soft-locked: from any state, a path to (bed | dawn | pity-ride)
    exists — concretely, `WAIT` repeated must always eventually end the night
  - modal states always answerable: when `pendingChoice`/`pendingEnc`/`G.game`/
    `pendingBf`/`pendingFare` is set, at least one candidate input clears it
  - save round-trip: every K turns, `deserializeGame(serializeGame())` and
    diff — catches non-serializable state sneaking into `G`
- **The hint-tap trick (this is the undelivered-promise catcher):** whenever the
  transcript prints a parenthesized CAPS hint (the command-hint idiom — the
  decorate() regex already defines what's tappable), the policy *preferentially
  plays that hint next turn*. Any printed hint that lands in "I didn't
  understand that" or a wrong-context refusal is a **caught broken promise** —
  exactly the class both shakedowns hunted by hand (`(MOTOSAI…)` at a stop with
  no stand, `(RIDE BUS…)` after curfew).
- **Transcript emission:** every run writes its full transcript + seed to a
  file. A failing seed is a perfect repro (rule 2: same seed + same script =
  identical transcript). Transcripts also feed the prose review below.
- **Mode-scoped output greps:** in soi6-mode runs, the transcript must not
  contain off-pocket names (Walking Street / Soi Buakhao / Candy Bar / LK
  Metro…) outside an allowlist of reminiscence lines (Terry's stories, the Nite
  Owl column). The whole off-map-prose bug class from shakedown 2, automated.

**CI wiring:** a `soak` job beside `test`/`e2e` — 50 seeded nights, minutes of
runtime, gating deploy. Locally, `node tools/soak.mjs --nights 2000 --seed 1`
before a release.

**What it does NOT replace:** taste. It finds crashes, locks, broken promises,
off-map leaks, economy drift. It cannot tell you a line is out of voice — that
stays with the prose review (§4) and the human (lbb-playtest).

## 2. Architecture notes (cheap now, pays later)

- **Event-layer discount:** v2's hardest retrofit (speaker attribution) already
  has a seam — all dialogue funnels through `_deliver`/`_patronTalk`/
  `_bondTalk`. The only discipline needed today: never add a prose path that
  bypasses `_say`/`_deliver`. Zero work now, big discount at v2.
- **`G.legacy` — a tiny cross-vacation store.** Everything resets per vacation
  by design (the treadmill), but the long-term-play bucket needs *some* memory.
  A deliberately small, additive `{girlId: {bondTierReached, oneRememberedThing}}`
  is save-compat-free (automatic merge), player-local (shared-world rule 7),
  and unlocks "she remembers you from last trip" beats without committing to
  the full reform-arc design.
- **Do NOT:** refactor the globals, split the parser, modularize, or build the
  event layer speculatively. The five-file split and the doctrine (quests
  observe flags, options computed engine-side, pure hashes for shared
  schedules) are the architecture. Extend, don't modernize.

## 3. Feature recommendations (in recommended order)

1. **Character creation Phase B** — origins become Soi 6 NPCs (the picked one
   deactivated — you ARE him), Tan the hidden hub, the PI origin's
   investigative spine into WDG/Orchid, bi-routing opening Peacock/katoey
   courtship. Deepens the existing cast before adding new systems; exercises
   the dialogue state machine already built. The replay-value feature.
2. **Soi 6 share-card + seed-of-the-day** — best effort-to-fun on the board.
   A Wordle-style result card for the challenge week (one emoji per night's
   outcome + score, no spoilers) is pure frontend. A date-hashed seed
   (`_quizBars`-style, no player dice) gives everyone the same week to compare
   — the daily-challenge product shape with zero hosting. Determinism is
   already guaranteed by rule 2.
3. **Bar-owning quest line** — the expat stage's missing pillar, built AS
   dep-chained quests per CLAUDE.md doctrine (premises → license → staff →
   opening night), reusing filler-hostess machinery for staff, cashier trust
   for till risk, and factions for the WDG buyout pressure. Lands best *after*
   Phase B has made the factions felt.
4. **Hygiene queue:** German-mode shakedown (tracked); Beach Road geography
   pass (unblocks WATCH POLICE); Dongtan/Pratumnak pass 2.

---

## 4. Prose review strategy — consistency, undelivered promises, contradictions

The insight from the shakedowns: **interactive play is the most expensive
possible way to read prose.** Split the work by who's good at it:

### Tier 1 — mechanical (tests/tools; zero tokens, runs forever)

- **Promise lint (`tests/js/promises.test.js`):** statically extract every
  parenthesized CAPS hint from world.js + engine prose (the decorate() cmd
  regex already defines the grammar). For each hint, assert its leading verb
  resolves — a `doCommand` case, `_COMPLETE_VERBS` entry, or `_kwActions`
  route. Catches dead hints at author time. (Context-validity — the right verb
  in the wrong room — is the soak harness's hint-tap job, §1.)
- **Reference lint — BUILT** (`tests/js/references.test.js`, 2026-08-07): venue
  names in prose resolve to real rooms; people named in an instruction (*ask X*,
  *give it to X*) are addressable; no `฿N` typed into prose where a constant
  holds N. Caveats learned building it: the price check must scan **source, not
  corpus** (world.js records are evaluated, so correct concatenation and a
  hard-code look identical), and it can only guard constants with a
  *distinctive* value — ฿300 is the ATM fee AND a Thai massage AND the joiner
  fee. Found one real defect on first run (Pim quoting ฿150 not `LADY_DRINK`).
  Still open here: dialogue `topic` keys should be roster-canonical or in
  `_CONVO_TOPIC_RULES` (the Jenny/Baimon boyfriend/sponsor split, as a test).
- **Already built, keep extending:** the decorate corpus test (name
  collisions), the Thai-coverage scan, pool-variant tests, world-integrity
  tests. The pattern is proven — new bug class, new corpus test.

### Tier 2 — model-assisted, but batched (the token-efficient shape)

**Never review prose by playing.** Two batch surfaces instead:

- **Corpus review — BUILT** (`tools/prose-corpus.mjs`; full pass complete
  2026-08-07, 5,079/5,079 records reviewed and in the ledger). Dumps every
  player-facing string as structured records `{group, ref, speaker?, text}`.
  Two things the first build got wrong, both fixed and worth remembering:
  it collected only declarative tables and top-level `const _POOL` arrays, so
  **function-body `_say` prose — 40% of the engine's words — was never in the
  corpus** (a `fn` group now covers it); and file-order review can't see
  cross-record contradictions at all, which is what the `--about` dossier pivot
  is for. See `docs/prose-defects.md` — that class of bug, and the three layers
  addressing it, is the important reading. Review the *corpus*, grouped by
  character/venue/theme, against: voice tiers (Tinglish hostess / businesslike
  cashier / fluent mamasan), canon (`pattaya-nightlife-universe.md`), factual
  self-consistency (a hand-authored girl's hometown/backstory stable across
  her own lines), register drift, purple-prose creep. One reading pass covers
  what dozens of play-hours would surface piecemeal.
  - **The hash ledger makes re-review nearly free:** store reviewed-string
    hashes (`docs/prose-review-ledger.json` or similar); subsequent passes
    review only new/changed strings. First pass pays once; after that, prose
    review is delta-sized.
- **Transcript review:** the soak harness (§1) generates seeded transcripts for
  free. A model reads a handful per release for what the corpus can't show —
  cross-turn non-sequiturs, tone whiplash, repetition-in-practice (pools that
  are technically varied but rhythmically identical), pacing. Reading a
  transcript costs a fraction of generating one interactively, and the seed
  makes every finding reproducible.

### Tier 3 — human taste (the lbb-playtest loop)

The in-browser flag-as-you-play harness stays the top of the funnel for "this
line lands wrong" — the one judgment neither tier below can make. Tiers 1–2
should keep the human's flags scarce and interesting.

### Logical-consistency checklist (what the tier-2 reviewer hunts)

- **Undelivered promises:** prose offering an action the mechanics refuse
  (tier 1 + soak catch most; the reviewer catches *implied* promises — "she'll
  remember this" with no mechanic behind it).
- **Contradictions:** state claims vs G (prose saying "your last baht" when
  money > 0; "first time" lines on repeat paths missing a `short`/vary).
- **Geography:** direction/adjacency claims vs the exits graph; off-pocket
  names in mode-scoped prose (soak greps + reviewer for prose reachable only
  in one mode).
- **Timeline:** "tonight/tomorrow/yesterday" claims vs the day counter;
  sponsor-window and quiz-night claims vs their pure-hash schedules.
- **Voice:** register-by-role, the girls written as full people (the
  prose-voice rule), canon tone (PG-13, grounded not purple).

### Cadence

1. ~~Build soak + promise lint (§1, tier 1)~~ — done; reference lint too.
2. ~~One full corpus pass (tier 2) → fix batch → seed the hash ledger.~~ — done
   2026-08-07, all 5,079 records.
3. **Per release from here:** soak in CI, `--delta` corpus review after any
   prose change, `--about <subject>` before inventing an entity detail, 2–3
   soak transcripts read, human flags as they come.

**Layer 2 claims/probes is BUILT** (`tools/prose-claims.mjs`, 2026-08-07): slot
conflicts, location claims, affordance claims — in the suite, and verified by
reintroducing the minibus bug and watching it fail. The lesson worth keeping is
in `docs/prose-defects.md`: attribution has to happen at SCENE scope, because
the corpus splits prose at line granularity and the minibus line never contains
the word "Tan" at all.

**Transcript review: RUN** (2026-08-07). Catches the class the corpus cannot
represent, because the corpus has no order — defects that live in the ASSEMBLY
of lines. First run found the Nite Owl printing "A reader writes: A Thai wife
writes:" for six of nine letters, a doubled "+1 สนุก" award, and {{…}} markup
leaking into transcripts. All fixed; details in `docs/prose-defects.md`.
Cheap enough to repeat per release: `node tools/soak.mjs --seed N --nights 3
--transcript out.txt`, then read it.

Nothing left unbuilt in the review strategy. Remaining work is features —
bar-owning is the headline — plus the German localization gap, which every new
line widens (a de-mode transcript still shows English seams).

---

## The black square (2026-08-09) — SHELVED, for later consideration

A phone event, and a candidate for the strongest single mechanic in the
relationship layer. Not built; written down so it survives.

**The claim.** Every girl the player gets close to has an entire emotional life
he is not in, and is not a participant in. The bond system currently models
attention as a scalar that only ever goes up with investment. This does not.

**The scene.** A contact's profile picture goes solid black. In the Thai
messaging culture the game already writes, that is the nuclear broadcast —
mourning, "dead inside", a silent scream. It is aimed at one specific person,
and the player is not that person. He is one of the several foreign men who see
it, assume they are the subject, and panic in parallel across three time zones.
The man it IS aimed at is a Thai lad her own age with an ordinary job who has
not read her messages since lunchtime. He never appears. He is never named.
That he is offstage is the entire point.

**Why it should be a SYSTEM, not a scripted beat.** Fire it on whoever the
player's highest-bond contact happens to be, once a vacation. Scripting it onto
one authored girl makes it a story about her; leaving it general makes it true
of everyone, which is the actual claim.

**The mechanic that carries it, and it is one line.** In this game money always
moves something — favour, bond, standing, somebody's evening. During the black
square it moves NOTHING. `MESSAGE` goes unread. `CALL` rings out. `SEND` is
accepted in silence and produces no favour, no bond, no acknowledgement. Not a
refusal, not a scene — the baht leaves and the world does not register it. That
is the exact inverse of the barfine economy the player has run all game, and it
needs no new subsystem to express.

**The resolution is casual and secondhand**, in the register the amulet uses:
next night she is at her bar as normal and deflects; another hostess, asked,
treats it as unremarkable — she fights with her boyfriend, every month the
same. The devastation is that to everyone else it is Tuesday.

**The register, which is the whole risk.** This must never read as a gotcha
that punishes the player for caring — no moral grading, per the house rule. The
line to hold: her grief is real, and you are not invited to it. Not "you were a
mug", but "you were not the subject". The narration never comments; the silence
does the work.

**The deliberate cost, flagged rather than discovered.** It fires on the
HIGHEST bond, so it lands hardest on the player who did the thing the game
otherwise rewards. That is defensible — it is true, and the hedonic treadmill
already argues breadth is hollow — but it would be the first mechanic here that
takes something away from depth. Decide that on purpose.

**Name collisions, checked.** `bank` is taken (the authored piwin at Beach Road
South, the Act One helmet favour) and must not be reused for the boyfriend —
who should stay nameless regardless. `nam` is taken by a filler hostess at Club
Mirage whose hash-generated desc already reads "thumbing her phone under the
bar… she types more than she talks", which is an accident worth keeping in mind
if this ever wants a face.

Pairs with: the Regular/bond tiers, `_conquestHappy`'s jading, `_hasSponsor`,
and the "parallel realities" bucket in the long-term-play notes.
