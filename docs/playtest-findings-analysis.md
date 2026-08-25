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

- ~~**B1 (SEVERE) — `TRAVEL` is a free, risk-free teleport that nullifies the
  title mechanic.**~~ **CLOSED by the curfew rework (2026-08-25).** The premise
  moved: the real town has no transport curfew (songthaews 24h, sparse from two;
  bikes/taxis all night; worst case you walk), so the title now means the last
  bus *you're still capable of catching* — the only curfew is on you. The small
  hours make the bus a 3–8-tick WAIT at the kerb that encounters and collapse
  can interrupt; the piwin balks at drunk ≥7 (insistence overrides — the crash
  arc is refused once, chosen twice); the bench takes anybody, which is the
  thesis in one mechanic. TRAVEL was already the walk (`_path` steps `G.room`
  per hop with full tick exposure since r13), so nothing needed pricing.
  The related open items — "missing the last bus costs ฿30" and the depot
  PAY-window gate — closed with it.
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

---

# Round 18 — the grapevine (Fable, soi 6 mode, 2026-08-25)

One persona: Mick, 61, Sheffield — fifteen years of the street, drive = the
grapevine audit (cross-reference every claim against another surface). Played a
full 7-night week to สบายสบาย; zero console errors. His ledger's headline: the
money layer reconciled to the baht across five night summaries, the share card
was "a true sentence about your week", and White Dish held across four voices —
the failures were almost all at the seams.

## Fixed

| # | Finding | Fix |
|---|---|---|
| F1 (HIGH) | The consistency system punished perfectly consistent stories: literal string compare, one memory key shared by four different questions, honest evolved answers ("first time" → "third time") caught as lies | `_saidAgrees` (substance, not spelling — deliberately lenient); a question once ANSWERED is never re-asked; the colliding `return` key split into `thisbar`/`trips`/`return` with their own ASK_REPLIES |
| F2 (HIGH) | Thursday quiz promised at three bars, none of them in the mode | `_quizBars()` returns the Queen Vic in soi6 mode; `_quizTalk` and the Owl listing went count-honest |
| F3 (HIGH) | Mercedes's sponsor refusal said "this week" (lasted one day) and "my friend here" (nobody there); her own stated reason was unaskable | refusal reworded to the calendar it is; a generic sponsor answer for every kept girl (in-town and gone registers); "friend" added to the sponsor synonym row |
| F4 | The motosai's menu offered the whole city his mouth then refused | bare MOTOSAI gets the frame refusal in soi6 mode |
| F5 | Street-bar rain furniture (mamasan, stools, awning) inside the aircon pub | a pub branch in `_sayDrizzle`: rain on the far side of the glass |
| F6 | The Vic advertised a kitchen and sold no food | `_qvKitchen` on Aoy's stated hours: basket ฿160 till eleven, crisps ฿40 after; BUY/EAT both routed; an Aoy `kitchen` node |
| F7 | Somo's own dare ("ask me the ninety-five squad") dead-ended | she delivers the squad, God himself included |
| F9 | An unaffordable LT killed the whole negotiation with ST affordable on the same menu, and ate the next typed word | the ledger stays open on the line you can afford |
| F10 | 12+ volunteered subjects missing; aliased asks at GATED nodes got "not my story" instead of "not yet" | nodes for barry/golf, preaw/saeng, toi/mercedes, wilai/plan (confirming Preaw's gossip), mort/soi 6; munich→german and white dish→ryan powers aliases; the gate probe now sees through the synonym map |
| F11 | Money sent to her phone forgotten at her rail | a send is remembered (`G.soc.given`) and answered in person |
| F12 | Benz's "one or three" tariff didn't count | she names the real remaining count |
| F13 | First-time asks hit "you already ask me this" for things she TOLD you | brush-offs reworded to "I tell you this already" — true in both cases |
| F14 | Verbatim repeats: the soi6 ST scene (the game's most intimate repeatable beat had ONE string), the CONTACT swap, the rose-child scene, the invite texts | pooled (ST deep at 5); the rose family's second visit is a RECOGNITION, not a rerun |
| F15 | Quest banner one command late in modal branches; lapsed questions printing their paragraph twice; Bert blind to the league title he commissioned; Pia's jukebox date off by two years; patron miss-line register ("try whoever was there" for objects) | `_questTick` moved into `_tick`; the lapse re-ask marks itself asked; a `wonLeague`-gated Bert node; "since twenty-nineteen"; the line neutralized |

## Refuted — pinned as such

- **The dog was fed "Mama noodles" the player didn't have** — he did: the packet
  starts in inventory from boot ("A soi dog would commit crimes for this").
- **Mort's unanswerable four-letter dare** — it is the CTF's own breadcrumb
  (docs/ctf.md; the sign-off is the Vigenère key). Not a bug — but the generic
  "Search me" on his own planted dare WAS a register misfire, so he now deflects
  in character, pointing at the back issues without naming the key or the phrase.

## Open

- The volunteered-subject tail: Angela's Discman, Somsak's own hotel, Chompoo's
  KitKat, the QV regulars having no opinions on each other. Same authoring class,
  lower heat.
- The phone screen can print "No new messages" and "Your phone buzzes" in one
  printout (a text landing on the same tick) — cosmetic ordering.
- The "red-faced fixture" ambient rail line invites a TALK its own text
  pre-declines; the folk-refusal layer reads room prose, not ambient pools.
- A pending question dissolved by the midnight shutters drops your prepared
  answer into the parser — the lapse store only covers partner switches.
- Mort's new soi-6 column line names the streets he's written from, which the
  soi6 soak flags as an off-pocket mention — accepted as color, not a pointer
  (same class as the mode's own "the whole rest of the city" wall lines).

---

# Round 19 — the fabulist (Fable, soi 6 mode, 2026-08-25)

The deliberate mirror of round 18: Mick audited the street's claims, Roy audits
yours. One persona — Roy, 55, a charming compulsive liar, a different man in
every bar, keeping his stories straight in a notebook so the game doesn't have
to. The round existed to adversarially verify the same-day `_saidAgrees` rework
from the OTHER direction: the leniency was tuned against false accusations, and
the open risk was leniency so generous the street never catches anyone.

**The liar's ledger, headline numbers: 15 questions answered, 4 genuine same-key
contradictions planted, 2 caught, 2 escaped — both through a single shared
token ("years" agreed widowhood with a 22-year marriage; an endearment tic,
"sweetheart", made him structurally uncatchable). His consistent-different-words
control was correctly not accused, and there were zero false accusations.** So
the honest end held and the adversarial end leaked, exactly the shape the round
was built to find.

## Fixed

| # | Finding | Fix |
|---|---|---|
| F1 (HIGH) | Midnight closing ejected the player but left the live modal running — a Connect 4 finished on the pavement eleven moves after the shutters; a night ride's prompt survived the ejection | `_closingTick` abandons a live game and clears a pending encounter with lines (the barfine already had this — the author saw the class and missed the siblings); `G.offstage` skips the ejection entirely, because the shutters cannot walk out a man who already left on the back of her bike |
| F2 (HIGH) | Single-token alibis: "years"/"sweetheart" defeated the lie-detector | time-units and endearments joined the stopword list; the widowed-vs-married and verbal-tic pairs are both caught now, and the consistent-different-words controls still agree |
| F3 (HIGH) | Belle's "Good job at home?" and Kai's "You stay nice hotel?" shared the `hotel` key — the repo's own forbidden class, armed against honest players | Belle re-keyed to `job` with its own ASK_REPLIES |
| F4 | A question interrupted (the saleng bolt, a kickout, a goodbye) died forever — `_convoEnd` cleared it without the lapse store | unanswered questions survive any interruption; she comes back to it next time |
| F5 | Room prose contradicted itself in one paint: "Praewa in your lap" and "Praewa laughing on cue beside him" four lines apart | both the busy-girl seeder and the legacy fallback prefer a girl the room's own desc doesn't feature; nobody qualifying, the nameless pool tells the same truth |
| F6 | The catch quoted your lie in flattened lowercase and claimed the wrong room ("somebody in here" for a pub two bars away) | answers are stored in the case the player typed; "somebody, some bar, had you from…" |
| F7 | "the one lady drink, nursed" at a ledger reading three | the cheap-charlie refusal reads the ledger it cites |
| F8 | "You've handed over a true thing" said of nine flat lies; singular-they for named girls in the round's best moment | the ack no longer asserts truth; `_sheHe` threads her pronouns through the catch, gossip, and re-ask lines |
| F9 | Night summary "met 25" on night one, "met 1" on a night of five first conversations — it counted names learned from prose | "met" counts conversations now |
| F10 | The jilt's cost was announced and then invisible — her next TALK gave the unchanged cheery greeting | one cooled hello, once (`_MIFFED_HELLO`), then normal service: the cost made visible, not a grudge loop |

## Design-accepted, recorded

- **The chip reading `SWEAR YOURE NO WHITE DISH MAN`** — the apostrophe strip is
  load-bearing: an apostrophe splits a CAPS-in-parens run into two dead keywords,
  and the matcher normalizes apostrophes away so the tap still fires. The code
  comment already documents the trade.
- **Leniency stays doctrine.** The token-quality fix narrows the alibi space; it
  does not change the rule that a missed lie is cheaper than a false accusation.

## What Roy's ledger says held

The catch, when it fires, quotes the right lie under the right key across bars
and days. The spend-side grapevine ("Butterfly, na. Pattaya small") is airtight
and faster than the word-side one. Personality/origin readbacks landed three
bars in a row. The night ride remains "the best sequence in the game" for a
second consecutive blind reporter, and the street kept setting up the persona's
dramatic irony unprompted — Somo, to Roy of all people: "you look like you got
enough people lying to you already."

---

# Round 20 — the closer (Fable, full game, 2026-08-26)

Tommo, 48, Newcastle — creed instead of checklist: *a night is measured by how
it ends; going home before dawn is a defeat.* Aimed blind at the previous two
days' work (the curfew rework, the all-nighter, TAKE HER OUT) without being told
it existed. Six nights + Act One (100/100), vacation closed at สนุก 165, zero
console errors. **The feature held where it counts: "every quoted number matched
every charged number all week" — the only ledger lies were the game's own
morning cards.** The price thesis audited from play: cold stranger ฿6,900
self-quoted with the honest reason; courted regular ฿700 and "money is not her
department"; her-farang waived.

## Fixed

| # | Finding | Fix |
|---|---|---|
| F1 (HIGH) | The paid whole-night companion was invisible to every targeted verb — arrival prose at his side while TALK said "try Cherry Pop" | one override in `_npcRoom` (a party girl is wherever YOU are) fixes every presence consumer at once — TALK, BUY DRINK, kiss, PHOTO, the Here: line |
| F2 (HIGH) | She texted "when you come see me??" mid-date | free with F1: `_maybeIncomingText`'s away-filter now sees her beside you; plus guards so she neither pitches a barfine mid-party nor gets re-fined ("Tilac. You already pay for tonight — I am HERE.") |
| F3 | "spent ฿17,726" about a mugging; income hid real spend | the card says "down/up ฿X on the night" — a net is a net — and names the part "lifted while you were out" |
| F4 | Choosing a destination conjured a second kerb wait while the truck stood at the rank | the arrived truck stays six turns (`G.busCameTurn`) |
| F5 | "After tonight's behaviour?" with no path to comprehension | heat carries its cause (`_addHeat(n, why)`); the shut book points at the act and says "A new night forgets" |
| F6 | SHARE swallowed at the gate; the full game had no week-record surface at all | SHARE renders the glyph week in the full game, and the vacation-end gate answers it |
| F9 | RIDE BUS inside room 412: "no blue trucks come down HERE" | the fleet is theoretical indoors — OUT first |
| F10 | The drink-snipe moment printed verbatim three times in a week | pooled |
| F11 | "eat toastie" beside the 7-Eleven bought the stall's grilled chicken | EAT passes the named dish through |
| F12 | Two waivers, two reasons, one free fine | her-farang past midnight gets HER line; the mamasan's shrug belongs to strangers |
| F13 | An in-character haggle got a silent menu reprint | "Mama number is mama number, tilac." |
| F14 | SCORE's "met" (names known) vs the card's "met" (conversations) | SCORE says "names known" |

## By design / refuted — recorded

- **F7 — solo dawn on the street was a triumph, not a rough wake**: exactly the
  curfew rework's intent (the all-nighter is for anyone still standing, companion
  or not). Confirmed as design, not drift.
- **F14b — "1 new face in the gallery" on a photo-less night**: a texted selfie
  files itself to the gallery; the count was right.
- **F8 — Candy Bar's unconditional 3 a.m. promise**: softened to "on the good
  nights, anyway" rather than wiring a crowd mechanic to a sentence.

## What his ledger proved held

The escalating night reads as an arc (nine venue arrivals, no repeated companion
line); her voice holds to the ends ("you party like Thai person. Almost."); the
refusal taxonomy stayed honest under a week of pressure; the balk → "Your
funeral, boss" → the kerb that collects — the titular thesis, quoted back by a
blind reporter who was never told it was the thesis.

---

# Round 21 — the griefer (Fable, adversarial security, 2026-08-26)

Vince, a save-editor who treats every trust boundary as a dare — pointed at the
CLIENT-SIDE game's boundaries ahead of the shared-world/baton future, scoped so
that only content crossing a boundary (a string reaching another player, a save
poisoning shared state) counts, and `raw` was a microscope never a hammer. The
headline is a good one: **no way, today, for one player's input or save to
execute code or corrupt state in front of another.**

## Fixed

| # | Finding | Fix |
|---|---|---|
| R1 (LOW→wire) | The save loader trusted any scalar — `money:1e309`→null, `happy:"NaN"`, `hurt:-999`, `day:-5`, `nightTurn:1e6`, a 100k-element `thaiSeen` — leaking "฿null · สนุก NaN · {weekday}" into the status header and throwing 5 pageerrors from ordinary commands | `_sanitizeState` after the merge: `_SANE_SCALARS` clamps every load-bearing meter to a finite in-range integer, `_SANE_ARRAYS` caps the unbounded ones, rng is validated to a live LCG seed, an unreal `room` repairs to a real one. Own-box today; load-bearing the day a server ingests/replays these blobs |
| D2 (hardening) | Prototype-pollution safety was ACCIDENTAL — safety-by-shallow-merge, which a future deep-merge would silently undo | `_safeMergeKey` skips `__proto__`/`constructor`/`prototype` at both merge sites (save + baton) — the invariant is now deliberate |

## Confirmed held (the valuable half)

- **XSS is universally defended.** Every player-text channel Vince threw markup
  at — command echo, NAME DOG (stored, re-rendered), the `{{…}}` smuggle, an ASK
  topic, the grapevine-quoted question answer (a stored-injection vector) —
  rendered as inert escaped text, 0 injected nodes. The load-bearing boundary is
  term.js's **escape-first-then-decorate** invariant: `_escapeHtml` covers the
  double-quote (closing the attribute-breakout), and `decorate` only ever wraps
  recognized CANON entity names as keywords, so player free-text never reaches an
  attribute. `innerHTML = decorate(text)` is the sole prose render path, so this
  holds for every future render site by construction.
- **Determinism holds.** The LCG serializes with the save and rewinds with UNDO —
  no reroll, no shared-daily forge.

## Own-box, correctly not defects

Forging one's own flags/money in one's own single-player save; the pageerrors
(contained to the tampered session — they fed R1's case); any `raw`-driven change.

Pinned in `tests/js/security.test.js` (7 invariants) alongside the existing
`tests/e2e/xss.spec.mjs`. **Method note: the "attack only through player channels,
observe via raw, classify REAL vs OWN-BOX vs DEFENDED" scoping is what made a
security persona produce signal instead of noise — an unscoped "root the box"
brief on a client-side game reports the player cheating their own browser as if
it were a breach.**

---

# Rounds 22 & 23 — the publican & the romantic (Fable, full game, 2026-08-26)

Two Fable personas at the two least-walked bodies of content. **Gordon** (ran
real bars thirty years; creed: the staff ARE the business) lived the expat
bar-owning stage for a dozen-plus nights — the floor moments, the shift calls,
the P&L. **Douglas** (lonely-hearts romantic, certain the real one is outside
the bars) chased the civilian arcs. Both: the register HOLDS — floor moments
read as competence not courtship, the Cream chameleon turn is "the best-designed
trap I've walked into in a text game" — findings clustered at the seams.

## Fixed

| # | Finding | Fix |
|---|---|---|
| Gordon SEVERE | The 51% partnership fork resolved on the FIRST ask, no confirm — Candy gated behind the licence said "not yet" and funnelled the diligent player into partnering Tan by accident | ASK now PITCHES (the node arms `pendingChoice="partner"`); a separate YES commits via `_partnerYes`, wired five ways — hear both, choose on purpose |
| Gordon HIGH | The shift-call prompt read `(YES · NO — have a word yourself)` — the YES action after NO, so answering NO fired the YES outcome | `(YES — {label} · NO)`, matching the chip |
| Gordon MED | A girl let go on the `early` call stayed on the floor passing mango | `G.soc.leftEarly`, read by `_barStaff`/`_npcActive` — off the rail for the night |
| Gordon MED | Floor moments retold — the good-ice trust beat on night 2 AND night 11 | `G.bar.floorSaid[id]` tracks each girl's lines; reveals progress in order, no repeat until the pool is dry |
| Douglas MED-HI | The Owl still preached the depot bus-curfew the 2026-08-25 rework removed | the columnist caught up: the curfew is on you |
| Douglas HIGH | WATCH SUNSET (an advertised room verb) bought a ฿300 fake Rolex — and a fake RayBans — with a peddler armed | the peddler short-circuits a spectacle target before any purchase branch eats the word |
| Douglas HIGH | SCORE listed a vignette quest as active ▶ while QUESTS (which hides vignettes) said "nothing on the books" | SCORE filters vignettes too — all three surfaces agree now |
| both | The quiz chalkboard named a bar twice ("X and X") — two exit keys, one bar | dedup the exits before naming |
| Douglas MED | Cream re-introduced herself, by name and alibi, to the man she went home with | a `chamDone`-gated post-arc greeting: the performance is over and you both know it |
| both | Volunteered-subject misses (Daeng's dancer, Kwang's son, Cream's coffee) | Daeng dancer node + Duangjai family node + son→family / coffee-shop→job / dancer synonyms + Doyle recon-recovery synonyms |

## Recorded, not fixed (design / long tail)

- **Bar-chain quests act as receipts** (instant-complete on ASK), so opening night
  narrates weeks in one sitting — the `doneFlag` design; a pacing question, not a bug.
- **Owner treated as a punter** at his own bar (barfine on own staff, jilt chill) —
  partly realism, partly a missing owner-aware surface.
- **Month-end pocket hit lands in the next night's P&L** (off-by-one on the prose
  ledger; the books themselves reconcile).
- **Blackbook excludes civilians** (deliberate "punter's book of GIRLS" stance) —
  the empty-state copy mis-describes the rule.
- **Priew's hospital arc froze on one canned reply**; the volunteered-subject long
  tail (Boonsri/photo, Near/cream, Cream/sisaket) — the known un-linted class.

## What both confirmed held

Gordon: "My staff read as staff, not as courtship" — the competence prose (Manow
watching your hands on the optic and deciding they're wrong; Cake fixing the
change before the customer notices) held across ten shifts, the shift calls "feel
like MY decisions, not dice", and every number in the BOOKS reconciled. Douglas:
the Cream arc "respects the hope by never once breaking the performance, and
hands the knife only to the reader", Neil "prices hope, not sells it", and the
Owl-as-chorus reads the romantic's fantasy back to him correctly. The game
largely knows a romantic from a monger.
