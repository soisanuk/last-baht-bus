# Adversarial code review — 2026-11-01

The second pass of the exercise `docs/code-review-2026-10-25.md` began. Ten reviewers, one per section, 56 systems of
`docs/systems.json` plus the frontend and the tools, `docs/architecture.md` as the map. Every finding had to be
reproduced with `node tools/probe.mjs` (or, for main.js, a node harness that loads it with DOM stubs) before it
counted. **98 findings were reported and all 98 were confirmed**; none was in a dialogue node, so nothing went to the
session walking `world.js`'s dialogue graph. Two were one defect seen twice (S3-8 and S6-8). Each fix is pinned with
one `test()` that goes red on the old code.

- The reviewers' reports as written, with every probe and its output: `docs/code-review-2026-11-01-findings.md`.
- The pins: `tests/js/review1101.test.js` (the gate class, fixed by the integrator) and six group files beside it:
  `review1101-street`, `-talk`, `-money`, `-floor`, `-frontend`, `-tools`.
- Where a fix changed a system's facts, its `docs/architecture.md` section has a paragraph headed *Since the code review
  of 2026-11-01* that names the new helpers and fields and the pin file.

## The class: a gate read its options as a prefix

The most serious finding of the review came out of five sections at once (S1, S2, S3, S5, S6) and recurred in S7's
street encounters. The last review made `_isRefusal` the rule for the police, the cons and the street, but every
`pendingChoice` handler in `_doCommandInner` still tested its option words as a **prefix**, before any question or
refusal check. So:

- "sell? what happens to the girls?" or "yes?" **sold the bar and ended the game**; "do it later" did too;
- "ok, maybe later" or "tan first" signed Candy as the 51% and took ฿12,000;
- "i'll pass" took Eddy's black box, "ok, no thanks" paid Nont ฿15,000, "sure, but no" took Tan's favour;
- "ok, no thanks" boarded Sao's van (the once-a-life dinner), "go where?" ended the night with Cream;
- "let me think about it" posted the kept girl's photo to every owner on the soi;
- "thanks but no" took her mat (once a life), "never mind" cancelled the ticket for good;
- at the barfine, "no, don't take her out" paid ฿2,700 and "fine, i'll pass" bought the long time and ended the night.

**The fix is structural.** `_gateGuard(id, lower)` (engine-parser) reads the line before the gate's own handler:
a hedge (`_GATE_HEDGE`: "let me think", "not sure", "hold on") holds the gate with a `_GATE_HOLD` line and no turn; a
refusal (`_gateNo`: `_isRefusal` plus a trailing "…no", "i'll pass", "later", "never mind") is answered as the gate's own
decline word, now declared in `GATES[id].no`; a question that opens with an option's word is answered as the gate's
explain word, `GATES[id].ask`, or the gate is put again. A question that opens with a question word still goes to the
handler, which answers it in its own terms. The same hold covers every other modal (games, encounters, the fare, the
soapy menu, the barfine's her-pay step) in the read-only pre-pass; a bare "um" stays the encounter's own reading (the
katoey and the shakedown read it). `tools/modal-audit.mjs` now probes "yes?", "let me think" and
"<chip>? what does that mean" at every armed state: it reported 176 rows when first widened and 0 after the fixes.

## Sections, reviewers and verdicts

| Section | Systems | Found | Confirmed | Fixed by |
|---|---|---|---|---|
| S1 Money and the bar's books | money, barchain, barbooks, procurement, affair, loans, laundering | 10 | 10 | integrator, talk, money |
| S2 State lifetime, stages, saves | act1, identity, vacation, saveload, expat-month, expat-jobs, expat-condo | 13 | 13 | integrator, money, frontend |
| S3 Gates, the clock, closings | clock, calendar, weather, darkness, hotels, `GATES` | 9 | 9 | integrator, floor |
| S4 The talk order, conversation | conversation, quests, regulars, filler, thai, phone | 11 | 11 | talk, money |
| S5 The bar floor | drinks, ladydrinks, social, bell, barfine, party, games | 10 | 10 | integrator, floor, money |
| S6 Side arcs, paid hours | nightride, cream, sao, orchid, soi6-stream, heist, massage, clinic | 9 | 9 | integrator, street, floor |
| S7 Getting around, the street | bus, motosai, navigation, dog, police, encounters, cons, saleng | 7 | 7 | street |
| S8 The body, สนุก, world prose | body, sobriety, happiness, food, media, worldprose, guardrails | 10 | 10 | floor |
| S9 Parser, surfaces, frontend | presentation, the command path, term.js / main.js / scene.js | 12 | 12 | frontend |
| S10 The tools and the audits | tools/*.mjs and the tests that run them | 7 | 7 | tools, floor |
| | | **98** | **98** | |

Every row below is CONFIRMED and fixed. The repro of each is its block in the findings file; the pin is in the group
file named.

### Fixed by the integrator — `review1101.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S1-1, S3-1 | SELL UP, the 51%, Bert's phone, the affair, the procurement job and Tan's slip committed on a refusal or a question | `_gateGuard`, `GATES[id].no`/`.ask` |
| S3-2 | "tan first" signed Candy | the other name is NO; only the offered name is a yes |
| S3-3 | "let me think" / "i'll think about it" was a yes at the shift, Bert's phone, Eddy | the hedge hold |
| S3-4, S6-1 | Cream's GO ended the night on "go where?", "ok, no thanks", GO HOME | the guard; GO HOME is home alone |
| S6-2 | Sao's car boarded on "ok, no thanks" | the guard (DECLINE) |
| S6-3 | Eddy's job, Nont's price, Tan's favour took a refusal | the guard |
| S2-1 | a question at the plane or at the ending took the plane / wiped the life | the option-word question is explained or held. The named choices (TAKE THE PLANE, START OVER) still commit at once — that is the gate's design, pinned by destitute.test and round55.test |
| S2-2 | NEVER MIND and a question cancelled the ticket | NEVER MIND / NOT YET go back to the card first |
| S2-3 | "thanks but no" took her mat | the guard |
| S3-5 | CHECKOUT matched unanchored: a question moved the bag, "i don't know" cancelled | whole words; the hotel's name at the start |
| S3-6 | Cream's morning overwrote her mat (once a life) and delayed the plane | `_destituteTick` holds its prompt while a gate is up or Cream's bus is due |
| S3-7 | YES again at the plane, and at a WAIT into dawn, was disarmed by itself | the disarm table knows `embassy`; `_endConfirm(kind, text, cmd)` replays the WAIT |
| S5-1 | the barfine ledger paid on "no, don't take her out", "take a pass", "short on cash" | questions and refusals before any term; the party match anchored |

### Fixed by the street fixer — `review1101-street.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S7-1 | the club pickup paid ฿2,000 on "no thanks" | `_streetNo` first (`_isRefusal` plus "i'm fine", "let's not", "no need") |
| S7-2 | the club pickup said "Morning" and left you on Walking Street at 23:36 | YES ends the night as a barfine; the ask comes at the wake |
| S7-3 | the tonic and the fortune-teller's first steps took a refusal | `_streetNo` |
| S7-4 | the sea wall, the booking app, the ping-pong tout and the free amulet took a refusal | `_streetNo`; whole-word yes; the amulet re-prompts what it does not read |
| S7-5 | RIDE THE LOOP with company checked one seat; WALK then made it free | `_busFare()` per head |
| S7-6 | FEED DOG adopted a dog inside the police station | refused under a roof |
| S7-7 | a bare PAY cost a turn; "i won't pay" was a parse miss | no turn; the driver's prompt |
| S6-4 | the night ride rode on "i don't want to go" | `_streetNo`; a non-answer is free |
| S6-5 | "massage no happy ending" bought the SPECIAL | a negated extra is the plain hour |
| S6-6 | "not the model" bought the ฿3,000 tier | `_isRefusal` before the number |
| S6-7 | MEET had no dawn check; the offstage hour ticked the bar's peddler | `_tooLateFor(9)`; `G.offstage` skips the ambient beats |
| S6-9 | Cream on the week's last night never set `chamDone` | set in that branch |

### Fixed by the talk fixer — `review1101-talk.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S4-1 | a woman who walked you out answered MESSAGE by prefix | the verdict is read on the resolved contact |
| S4-2 | a hostess away for the season sent invites and played the kept-seat welcome | out of the texting round; the invite needs her in the room |
| S4-3..S4-6 | `_textTalk`, `_lastTimeTalk`'s house branch, `_jobMemoryTalk`, `_partyTalk` took her own authored topics | one shared guard, `_ownsUnheard`; texts carry a `day` so the seven-day window works. S4-4 departs from the proposal (the house count still wins over Jinda's LAST TIME except on a return trip — two older pins require it) and S4-6 keeps the taxi answer over Somo's "taxi" node |
| S4-7 | "buy her a drink" talking to Bert bought Bert a drink | `_pronounSex` filters `_resolveActor` |
| S4-8 | CALL worked on anyone in the room | needs her number, spends battery, silence from a woman who has decided |
| S4-9 | ACCEPT handed over an item quest from across town | the giver must be in the room |
| S4-11 | LESSON ran into the dawn | `_tooLateFor` first |
| S1-2 | SEND 500 TO KWAN paid Kwanjai (and MESSAGE texted her) | `_contactNamed`; the line names who received it |

### Fixed by the money fixer — `review1101-money.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S1-3 | the bar's deposit and key money were unnamed or invisible on the ledger | `G.barBought`, named |
| S1-4 | the morning the bar was lost, the pocket's top-up read as the night's spending | `_barPocketBooks` hands the books on |
| S1-5 | a laundering risk on an empty account was forgiven while the ledger named the full figure | `_launderPay` returns what it took |
| S1-6, S1-7 | COUNT THE TILL disagreed with BOOKS, and printed after the morning | `G.bar.countSh`; said before its turns |
| S1-8, S4-10 | a quest reward in person, and two refunds, netted into "down" unnamed | `G.jobPaid`; `G.refundIn` |
| S1-9 | the accountant counted Nont cash-outs from before the bar | `acctBase` at the deposit; a longer review is kept |
| S1-10 | "draw half" emptied the till; "draw 1.5k" took ฿15 | `_tillAmount` |
| S2-4 | QUIT JOB paid a whole month again | `_jobPay(atQuit)` from the later of start and payday |
| S2-5 | an uncollected cash envelope was overwritten | added to |
| S2-6 | the condo billed a short month as a full one | `G.condo.owed` / `_condoOwed` |
| S2-7 | the agent's unpaid fee was never collected | collected with the next payday; shown in debts |
| S2-8 | the visit week's last night skipped the nightly reset and the rent | goodbye, rent, `_resetNightSoc(all)` |
| S2-9 | nested `{day}` stamps did not age across a trip | `_ageBooks` sweeps every `{day}` record |
| S2-10 | RESTART / START OVER / PLAY AGAIN lost the real-clock season | `_freshGame()` |
| S2-12 | the dispatcher ticked again on the new morning | skipped when `G` or the day changed |
| S2-13 | STATE_SCHEMA mislabelled `bank` night, three loan/bond fields trip | `life` |
| S5-9 | a conceded stake at your own bar reached neither till nor BOOKS | `_ownStakeKept` |

### Fixed by the floor fixer — `review1101-floor.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S8-1 | the sobering clock survived dawn | `soberNext` is `socNight` |
| S8-2 | three free drinks skipped `_compDrink` (I DON'T DRINK ignored; two paid สนุก on repeat) | `_compDrink`; the regular's round once a bar a night |
| S8-3 | a treat that blacked you out kept printing into the next evening | stops there |
| S8-4 | the shift brawl bumped `G.hurt` past three with no ending | `_hurt(1)` |
| S8-5 | EAT at your own bar and carried food ignored full | `_fullNo()` |
| S8-6 | three self-ordered drinks left `teetotal` set | `_selfPour()` |
| S8-7 | TALK TO PATRON in a go-go sat him on a stool at a rail | `_seat()`, front row |
| S8-8 | a Blue Dog revisit line said the sun was sinking at 23:00 | rewritten; the revisit lint catches it |
| S8-9 | "no thanks, i don't drink" neither declined nor declared | both |
| S8-10 | a night-ride stop poured past the blackout | the ride ends at drunk 9 |
| S5-2 | a bare BARFINE re-sold the woman on your arm (`["pukky","pukky"]`) | never her; never twice |
| S5-3 | a self-barfine booked the night to the wrong woman | to her; never with someone on your arm |
| S5-4 | GO HOME WITH from the bench put him in the hotel room | she goes home on her own |
| S5-5 | a manager could barfine his own cashier | `_myBarfineStaff` |
| S5-6 | a Soi 6 girl quoted a price BARFINE then refused | `_bfDayPeek` "stealing" |
| S5-7 | one old tip waived Soi 6's one-drink rule all week | tonight's tip |
| S5-8 | a gentlemen's club short time paid "Rose" everywhere | the club's own payee |
| S5-10 | the go-go bell pool put drinks down the rail | rewritten; `_FIT_GOGO` widened |
| S3-8, S6-8 | the Orchid's 04:00 close printed "Two o'clock on Soi 6" | `_hourSaid` from `_closeClock` |
| S10-7 | the Orchid's women said it closed at midnight | `_closingTalk` reads `_closeTurn` |
| S3-9 | a manager's shift was accepted too late to be stood | `_closeTurn` against `WORK_MIN_STOOD` |

### Fixed by the frontend fixer — `review1101-frontend.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S9-1 | RESTART wiped a live game on one word, through every gate | asks once (`_endConfirm("restart")`; YES confirms) |
| S9-2 | a RESET arm survived UNDO, SAVE, LOAD… and a later YES wiped the save | the next line answers it |
| S9-3 | in a conversation, BUY DRINK FOR THE MAMASAN was eaten as a topic | `_HER_ROUTE_SKIP`; Mem's chip uses her full name |
| S9-4, S2-11 | UNDO rewound an answered gate, the plane, SELL UP's ending and MOVE TO PATTAYA | `_gateUp()`; the mark adds stage and endKind |
| S9-5 | checkout's chips and redraw quoted vacation prices to an expat | `_checkoutOptions()` |
| S9-6 | the Orchid's women were offered drinks on every surface the parser refuses | `_orchidRefuses(kind)` on all three surfaces |
| S9-7 | tap menus were capped at eight (9 of 17 motosai destinations unreachable) | `engineComplete(input, { all: true })` |
| S9-8 | in the Soi 6 week the motosai chip offered eight refused rides | no chip there |
| S9-9 | guards.test missed the negated forms | a ratchet over both forms; six guards removed |
| S9-10 | any "toggle…" on the start menu reached the skeleton game and autosaved it | only the real codes |
| S9-11 | a `//` comment had swallowed a superseded line | the dead tail deleted (superseded by 77d1e9a3) |
| S9-12 | SAVE and UNDO were offered and then parse-failed by the engine | the engine answers them |

### Fixed by the tools fixer — `review1101-tools.test.js`

| Finding | Defect | Fix |
|---|---|---|
| S10-1 | `talk-order.mjs` saw 44 of `_doTalkCore`'s answerers; the pin was blind to the rest | every helper called with `npc`, in order: 68. `_townTalk` and `_leavingTalk` were always first |
| S10-2 | gogo-audit judged with the engine's own `_FIT_GOGO` | its own wider vocabulary; `--mutate bell` |
| S10-3 | the portrait manifest was never checked against its generator | art.test runs `--check` |
| S10-4 | witness-audit classed only the first claim in a record | every claim; a floor of 150; `--mutate unclass` |
| S10-5 | four instruments read a stale parse-failure list | `tools/parse-miss.mjs` reads the engine's pools |
| S10-6 | the `--mutate` claim was false for six audits | a real mutation for each, gated by its test |

## Deferred, and for whom

- **Balance calls for Mario.** The sea wall pays its own `_conquestHappy` and then the barfine night's (the engine's
  comment calls the encounter's credit a premium on top, by design — but a single, not only the threesome, gets it).
  The football round still pays +1 สนุก once a night, read off the news bake (the code calls it a deliberate exception).
- **STATE_SCHEMA `night` labels.** `chamNight`, `checkoutNight`, `lastBfHonest`, `lastBfPreTier`, `monthClosing`,
  `party`, `partyLog` survive a sleep dawn though declared `night`; relabelling each needs a decision about the field.
- **The money audit cannot see an unnamed arrival.** Its invariants check conservation, and an unnamed arrival nets
  correctly; gating "every movement is named" needs a new invariant (a named line per income attribution).
- **S1's suspected items, unproven:** the own-rail bell books stock at raw `BAR_COGS`; a PLG or Tan sale drops Nont's
  loan (the sale prose says so); `_sellBarYes` forgives the loan beyond the account; `_nontCash` strips every non-digit
  ("cash 1000.50" would draw ฿100,050).
- **Small:** the Orchid table's TIP and DANCE lines say "rail" (a lounge has none); an expat's first morning adds no day
  to the month book; two contacts with one name list two identical SEND options; the owner's WORK keeps a hard-coded
  midnight cutoff (correct today; one shared helper with `_mgrShift` would be cleaner); the payday line names one
  envelope when two may be waiting (MONEY shows the total).
