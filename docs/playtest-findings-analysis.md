# What the persona playtests found, and why review didn't

*Compiled 2026-08-23 from the round 5–13 playtest commits (2026-08-22 → 2026-08-23):
`297dcfc c01c54a 3b9dfee 4a3e1ad d2da31c 6e87991 8e768bd 886cb9c a3dae82 57bf5ff
e5ae227 691f729 6c53749 e697ed1 41cfd8e 6d4f437 9777a85`, plus the one code-review
handoff in the same window, `76c7059`.*

Roughly **90 distinct findings** from **~22 blind personas** across **13 rounds** in
about two days. Several commits bundle a long tail of small items, so the true count
of individual fixes is higher; this document classifies the *kinds*, not every instance.

The purpose is not a changelog. It is to answer a specific question: **why did this
method find critical defects that multiple code reviews, by several models and
methodologies, did not?**

---

## 1. The classification

Eight classes account for essentially everything found. They are ordered by severity of
what they contained, not by count.

### A. Composition defects — correct parts, wrong interaction

No line is wrong. The defect exists only in the relationship between two or three
correct things, usually in different files.

- **WORK never registered at settle** (r13). `_barSettle` runs from `_endNight`
  *after* `G.day++`; `_workedTonight()` tested `workedDay === G.day`. Always false.
  The expat stage's stated central mechanic did nothing for 65 nights.
- **UNDO was an information oracle** (r11a). The RNG stream is move-independent, so
  undo-after-a-wrong-quiz-answer returns the same question with the answer known.
  Every individual piece — the seeded RNG, the save blob, the undo — is correct.
- **A live Connect 4 survived Tan's sedan** (r7b) and kept running 8 km from the board.
- **The restore redraw consumed `G.rng`** (r8), so the daily wasn't replay-stable
  across a reload. Presentation code reaching into engine state.
- **Choosing "the investor" origin deactivated the only giver of the bar licence**
  (r6) — because you *are* him. Two correct systems, no handling of their overlap.
- **A stale `G.enteredVia`** (r9) teleported the player out of their hotel room across
  town the morning after a barfine.
- **Interrupted TRAVEL** (r13) charged the whole walk, narrated the journey, and left
  the player at the origin.

### B. Absence — the feature never fires

Not wrong output. *No* output. There is no line of code to review that says "this
never happens."

- WORK's effect (r13) — the same bug as above, seen from the other side.
- **Tan's favour and the procurement beats** (r13): checked only from `_arriveAt`, and
  both require nightTurn ≥ 30, so an owner who opened early and stayed never met his
  own partner. 61 nights, `G.syn` untouched.
- **The ฿3,000 room-safe stash** (r9) never paid a player whose every wake was a
  respawn — while the safe's own text said it had.
- **The bar chain dead-ended** after `bar_premises` (r9) with HINT silent for four
  in-game weeks.

### C. Reachability — the mechanic exists, the player can't get to it

Passes every correctness test. Fails the only test that matters: can a person do it?

- **Prefill chips were a dead end on a phone** (r10b) — three of a bar's six verbs
  unreachable by thumb.
- **Every topic chip whose key was also a synonym was dead on tap** (r10b) because the
  conversation layer normalised before trying the literal.
- **The readout verbs lived only in HELP, which is itself untappable** (r10b).
- **Fon's Thai-greeting easter egg** (r12) was unreachable via the phrasing a player
  actually types (`sawatdee fon`, no SAY, no TO).
- **Killer pool was unplayable by tap** (r7b): its game type is `kp`, the chip builder
  only knew `pool`.
- **Typed Thai** (r8): polite particles, Thai numerals, and any unknown Thai fell to
  "I didn't understand that."

### D. Promise defects — prose asserts what the mechanics don't honour

The project already has a name and a tool for this class on the *content* side
(`docs/prose-defects.md`, `tools/prose-corpus.mjs`). Playtests keep finding it anyway,
because the tool checks consistency between claims, not claim-against-mechanic.

- **Moonshine Bar dares you to try the house infusion**; ya dong was unbuyable (r12).
- **Mama Yai's som tam "arrives unasked and correct"**; it could not be obtained (r12).
- **Two massage shops advertised three price tiers**; the mechanic is one flat ฿300,
  so two of three advertised prices were unreachable by any command (r12).
- **Tan's "meet somebody first — then ask me who they are"** was hollow off-manifest (r10a).
- **The maze hint offered `HELP him look`**; HELP was exempted as an observation verb (r5).
- **Auntie Nok promised "beach full of bottle"** over a world containing three (r11a).
- **Supertown's desc said the alley carries on east**; the exit is `n` (r12).
- **Jomtien Soi 7 (West) claimed to be "the beach end"**; a different room owns that
  identity, which sent a persona in circles (r12).

### E. Economy and magnitude — only visible with a horizon

Each of these reads as a sensible number on the line where it lives. The defect is the
*integral*, which no reviewer computes.

- **The stated win condition was purchasable at a shop counter** (r11a): TIP and lady
  drinks paid +1 สนุก uncapped — สบายสบาย on day three without moving from one rail.
- **The bell bypassed the brake** (r11b): six rings, 88 → 100, six commands.
- **A rough wake confiscated ฿1,396,596** with one unvaried line (r11b).
- **฿20,000 of tips bought top bond tier in ten turns** with no conversation (r11b).
- **Missing the last baht bus — the title of the game — costs ฿30** (r13, design call).
- **Silent clamps**: the Connect 4 stake regex was 2–5 digits, so a 7-figure stake fell
  through into the pool branch (r11b); the Jackpot house max was never announced (r7b).

### F. State-blind prose — true in general, false for this player

Distinct from D: the mechanic is fine and the sentence is fine. The sentence is just
not true of the person reading it.

- **"Yesterday you no come, I look look"** said to a man who spent last night with her (r7a).
- **MOVE TO PATTAYA told a man carrying ฿1.46M his savings were ฿20,000** (r11b).
- **The deposit prose insisted "It is every baht you have"** to a millionaire (r13).
- **The airport scrub told a widower he was lying to a wife** (r7a).
- **Oy discussed a wallet she had just handed back** (r10a).
- **A drunk bargirl pressed her ฿20 on a millionaire**; Nira lent him ฿20,000 (r11b).
- **Her texts asked for "mama's" medicine** when her own story had papa sick (r7a).

### G. Modal and input-gating defects — the game eats the player's turn

- **Soft encounters swallowed ordinary commands** (r9): QUESTS / BUY DRINK / TALK
  resolved as "no" to a peddler, five nights running.
- **A non-move inside a game cost a turn** (r10a) — eight swallowed commands cost a
  persona the last bus.
- **A direction typed at the police prompt was read as ARGUING** (r9) — ฿1,000 and
  −4 สนุก he never chose.
- **The rose seller ate `tip rung 100`** as a wave-off (r7a).
- **Encounter modals had no chips at all on mobile** (r9).

### H. Cross-surface disagreement — two ways to say it, two answers

CLAUDE.md's three-surfaces rule exists precisely for this, and it still leaks.

- **TAKE and EXAMINE disagreed about a fixture** in the same room, same turn (r12).
- **GIVE didn't place an absent NPC** where ASK and TALK already did (r12).
- **HINT said ASK LEK; only TALK ticked the milestone** (r7a) — 20 turns of Act One lost.
- **`bell` resolved to a hostess named Belle** ahead of the room's bell mechanic (r12).
- **The WATCH family had one flat fallback** where BALCONY handled the identical
  situation properly (r12), hit from nine different rooms.

---

## 2. What the aggregate says

### 2.1 Severity tracks invisibility, not complexity

Every finding in classes A and B is trivially simple code. `workedDay === G.day` is not
a hard line to understand. None of them required subtle logic to *fix* — most were a
few lines. They were severe because **nothing surfaced them**, and they stayed severe
for as long as nothing did.

This inverts the usual review intuition, which allocates attention to complex code.
The complex code here (the negamax Connect 4 AI, the barfine pricing matrix, the hash
schedules) produced almost no defects. The damage was all in the seams between simple
things.

### 2.2 Review is diff-shaped; these defects are trajectory-shaped

A code review reads a change, or a file, and asks "is this correct?" Class A defects
are correct in every file. Class B defects have no code to read at all — absence has no
diff. Class E defects need a *horizon*: `_addHappy(2)` is fine; +62 over 66 presses is not.

The single most useful sentence to come out of this exercise:

> **The bug requires a specific play trajectory to become observable, and a code review
> has no trajectory.**

Tomas going back to one girl every night is what made "yesterday you no come" a
contradiction. Bernard's cheat code is what made an uncapped confiscation visible.
Anders's 65 nights of ownership is what made WORK's silence audible. The persona's
*drive* is the instrument; the persona is just its housing.

### 2.3 The tests were complicit, not merely absent

This is the finding with the clearest remedy.

The bar suite had **35 passing tests** over the bar chain while WORK did nothing. They
passed because they called `_doWork()` then `_barSettle()` directly, on the same day —
the design as designed. The real game inserts `G.day++` between them. One of those
tests worked forty consecutive nights *without a single night ever ending*, a sequence
the game cannot produce.

The same shape appears in round 8: the reload path was untested, so the redraw quietly
consuming `G.rng` survived.

**A test written from the same mental model as the code inherits the code's blind spot,
and then certifies it green forever.** Hand-constructed sequences are fine for coverage.
They are worthless as proof that a feature runs.

### 2.4 Fixes to a *class* are incomplete about half the time

Three of the most severe items were second or third sightings of a hole already
"fixed":

| Hole | First | Then | Then |
|---|---|---|---|
| Soft encounters eating commands | r9 (`_ENC_SOFT` created) | `76c7059` (matching too broad — a girl called Manow read as NO) | r12 (four more encounters never added to the table) |
| Bought-สนุก uncapped | r11a (tips, lady drinks) | r11b (**the bell**, missed by an hour) | r13 (taper confirmed present but never *caps*) |
| UNDO and the RNG | r8 (dice **reroll** variant) | r11a (the **information** variant nobody considered) | — |

The pattern: when a fix applies to a *set of call sites or table entries*, the first
pass catches the sites you were looking at. **Enumerate the set mechanically, or plan
on a second playtest finding the rest.**

### 2.5 What the one code review in the window actually produced

`76c7059` addressed a review handoff against the round-nine tree. Its output:

- one **P1 that was false** ("the suite is red" — a fixture mid-edit; the committed
  tree was 953/953);
- one **P1 that was real and valuable** — but a *refinement* of a playtest finding from
  the previous round, tightening `_ENC_SOFT`'s over-broad matching;
- two **P2 resource bugs** (a roster indexed from the wrong table; an inbox trim that
  ran before insertion and kept every unread message).

That is a fair characterisation of what review is good at here: **tightening a known
fix, and finding local resource/bounds errors.** It found none of the criticals, which
is not a failing of the reviewer — those defects are not visible to the method.

The two techniques are complementary, not competing. Review is cheap, deterministic and
regresses properly. Play is expensive, non-deterministic, and finds a class review
cannot see. The error would be treating either as a substitute for the other.

### 2.6 Model-to-persona matching is empirically supported

The rule was a hunch three rounds ago. The distribution now supports it:

| Model | Personas | Classes found |
|---|---|---|
| **Fable** | Graham, Marcus, Keith, Bex, Jürgen, Tomas, Danny, Annie, Ollie, Shane, Bob, Wazza, Priya, Dee | **F** (state-blind prose), **D** (promise), voice/register, and the mobile surface |
| **Opus** | Sandeep, Bernard, Anders | **E** (economy/magnitude), **A** (composition seen across a horizon) |
| **Sonnet** | Wim, Grete, Henrik, Priyanka, Deej | **C** (reachability), **H** (cross-surface), **D** systematically enumerated |

Fable notices when two things *disagree*. Opus notices when a number *integrates* badly.
Sonnet notices when an enumeration is *incomplete*. Pointing all three at the same target
would have wasted two of them.

Note the corollary: **model diversity is not epistemic diversity.** Several models
running the same method — read the code, ask if it is correct — share the same blind
spot, because the blind spot is in the method.

### 2.7 Surface-specific personas find surface-specific bugs

Dee (thumbs only, r10b) found three MAJORs in one session that no amount of desktop
play could surface, because they were all of the form "this control does nothing when
tapped." A whole input surface had drifted out of reach without a single failing test.

---

## 3. What follows from this

In rough order of value per unit of effort.

1. **A real-path rule for tests.** Every subsystem needs at least one test that goes
   through the actual entry point — `doCommand`, `_endNight`, `_tick` — even though it
   is slower and noisier than constructing the sequence by hand. This one rule would
   have caught the WORK bug, the reload/RNG bug, and probably the arrival-only gating.
   *Directly derived from §2.3.*

2. **Effect assertions in the soak harness.** `tools/soak.mjs` currently proves nothing
   crashes. It could prove things *happen*: across N simulated nights, did WORK ever
   change takings? Did a procurement job ever fire? Did the room safe ever pay?
   **A feature that never fires in a long soak is the signature of every class-B defect
   in this document.** Cheap, deterministic, and it regresses — which playtests do not.

3. **A state dossier — `prose-corpus.mjs` applied to `G`.** Every read and write of a
   state field, grouped by field, so `workedDay` written in `engine-systems.js` and read
   in `engine-play.js` across a day boundary land on one page. The project already
   accepted this argument for prose and built the tool; the mechanics have the identical
   failure mode (§ class A) and no instrument.

4. **When fixing a class, enumerate the set.** Grep for every call site or table entry
   and list them in the commit. Half the class fixes in this window were incomplete
   (§2.4).

5. **Keep pinning every finding in a test.** Already the practice, and it is why each
   round starts from a higher floor. It is also the only thing that converts an
   expensive non-deterministic finding into a cheap deterministic one.

---

## 4. Standing design calls this surfaced (not bugs)

Recorded here because they are decisions, not defects, and should be made deliberately:

- **The bell is a สนุก vending machine.** The `_boughtHappy` taper slows it to +2 every
  third ring but never caps, and the ฿20k/day ATM funds it indefinitely. The treadmill
  polices the *conquest* path — the thing done for narrative reasons — and exempts the
  pure vending-machine one. **The brake is on the wrong pedal.**
- **The clock is decorative after Act One.** Missing the last bus costs ฿30; a rough
  wake costs ฿0 once you have fed a soi dog; hunger and thirst cannot reach 100 in a
  100-turn night from a normal wake (measured 63/89). Act One — ฿0, a dying phone, a
  hard reset — is the one hour where the game means it.
- **Free unlimited TRAVEL** against a ฿50 motosai makes a turn worth ~฿4.
- **Readout verbs cost a turn**, so the game charges the careful player for checking the
  clock it is pressuring him with.
- **Reputation is money-proof** (correct) but little else moves it either, so it reads
  inert rather than incorruptible.

---

# Round 15/16 triage ledger (2026-08-25)

The two control-experiment reports (thorough player A: 26 findings; thorough
player B: 27) sat untriaged for two days and were only recoverable from the
session transcript. **That is the failure this section exists to prevent** — the
same lesson as `docs/settings-reuse.md`: a backlog that lives only in a
conversation is a backlog that gets lost. Findings go here as they are triaged,
whether or not they are fixed.

## Fixed

| # | Finding | Fix |
|---|---|---|
| A1 | `EXAMINE WALL` returned your wallet anywhere in the game | `_findItem` matches on word boundaries |
| A2ii | Rejected commands ticked the clock and rolled the dark-room dog | `_doGo`/`_doMotosai` return false on refusal |
| A7·B10 | Generic bar prose invoked "the mamasan" in a bar whose mamasan works elsewhere tonight | `_mamaHere`/`_mamaRef` |
| A8 | Generic scenery **contradicted** authored room detail (teak rail → "chrome legs"; band stage → go-go furniture) | `_SCENERY` `fn` became an override with fall-through; the rail reads the room's own material |
| A11·B11 | Prose named durations the turn counter contradicted | Tan's call no longer names half an hour |
| A12·B19 | Rough-wake copy misdescribed the loss, and a folio slid under a door you weren't behind | `_chargeRent(rough)`; the remainder is "what they left you", not "still in the room"; DIAGNOSE states the ฿20,000 cap |
| A14 | `TAKE` a carried item hit the bar-fixture refusal | `_ALREADY_HAVE`, checked before the advertised-fixture branch |
| A16 | `PET CAT` denied a cat `EXAMINE CAT` had just described | `_PET_BAR_CAT`, gated on the room's own prose |
| A17·B7 | EXAMINE dead-ends on foregrounded nouns | breadth rows off `examine-audit`: lists, crates, benches/loungers, tanks, shelves/stalls, couches, plants, bunting, hotel safe/window. 1076 → 1045 |
| A18·B4 | An NPC's own advertised subject wasn't an ask-topic (10 instances) | 3 alias rows + 5 authored nodes; `asktopic-audit` 32 played / 0 unanswered |
| A26·B3 | People the room's prose describes weren't addressable | `_promptedFolk`, derived from the room description |
| B2 | **No enterable venue could be EXAMINEd** — every one answered "it isn't here" | `_venueLook`, derived from the exits graph; `_venueKind` reads each room's own flags |
| B13 | `ride bus to <not-a-stop>` silently discarded the destination | the driver shakes his head before the list re-prints |

## Open — design calls (need a decision, not a patch)

- **B1 (SEVERE) — `TRAVEL` is a free, risk-free teleport that nullifies the title
  mechanic.** The last bus, the ฿15 fare and the small-hours motosai premium are
  the run's central tension, and the game narrates that tension one command
  before TRAVEL bypasses all three at zero cost from anywhere on the map.
  **Deferred deliberately (2026-08-25): the nightly curfew is being reworked, and
  this belongs in that pass rather than ahead of it.**
- **B6 — Act One completes without returning to room 412**, though the quest text
  and the game's own title say otherwise. Either the goal text drops the clause or
  the scoring waits for the room.
- **A19 — the night summary's "spent" is a net cash delta**, so a robbery reads as
  spending and collecting the room safe reads as thrift.
- **B27 — the protagonist is assumed male** with no alternative at any of the three
  character-creation axes. Already an open call in the persona memory note.

## Fixed in the 2026-08-25 sweep

Everything else in both reports. Geography (A4, A5, A15, B12, B17): five rooms
pointed you at a direction they didn't have, plus a mislabelled `soi5` exit and
two undiscoverable turnings; guarded by a matcher over the "X runs/opens/climbs
<direction>" shapes with a named-exception list, which found a sixth case on its
own. Promise/state (A6, A9, A20, A23, B9, B14, B21, B22): shops that sold less
inside than outside, a live-music pub carrying a `band` flag nothing read, a
market that called itself indoors, a beach that woke a jet-ski scam it says it
doesn't have, a cart that shut at six, and the empty-bar rain vignette firing in
a room you were mid-conversation in. Interaction (A13, A22, A24, A25, B15, B16,
B18, B23, B25): HIRE narrating a departure it didn't perform, LOOK re-printing
the stop you'd left, darts refusing a standard two-dart checkout and swallowing
commands silently, killer pool going quiet when one opponent was left, a lapsed
NPC question never re-offered, bare BUY DRINK spending ฿150 on a guess, and game
moves routing to a conversation partner as topics. Plus A2i (a warning at your
own door before the unlit soi), A3 (a quest pointer that went stale on the walk),
A10 (the wrong-bar pointer, now the safe fallback), A21 (the dog inside a mall
and outside a market), B5 (the safe code nobody could ask about — on the Act One
critical path), and B20 (a grill cart that wasn't in the room).

**Not defects, recorded as refutations:**

- **A22 — "two different parser-miss messages on consecutive turns"** is
  `_pickVary` doing its job. Pooled prose is the house rule; the reporter saw
  variety and read it as inconsistency.
- **B26 — Starlight's revisit line on first entry** was observed once and the
  reporter could not reproduce it with `tools/probe.mjs`; neither could I.
- **B14's rainbow_girls half** — "somewhere behind that door is an office, and in
  that office is a safe" stays true after you take your wallet out of it. It is
  scene-setting, not an objective marker.
