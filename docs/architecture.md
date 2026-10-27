# The Last Baht Bus — architecture

This is the map of the codebase by **system**. Part 1 is the machine every system runs on: the files, the one state
object, what happens to a command, what happens every turn and at the end of a night, and the rules that keep the engine
deterministic and frontend-free. Part 2 takes the game apart into the 56 systems of `docs/systems.json`, one section
each: what it is, how it works, the state it owns, its constants, what it touches, its tests and its design docs.

`CLAUDE.md` is the other document, and a different kind: the design history and the doctrine, round by round, with the
reasons. Read this one to find your way around; read that one before you change a rule, to learn why it is the rule.

The generated parts of this file (the index below and the grey **facts** block under each system) come from
`node tools/gen-architecture.mjs`, and `tests/js/architecture.test.js` holds the rest of it honest: every function,
`G` field and constant the prose names must exist in the source, and every system in the registry must have a section.
**A new system gets a row in `docs/systems.json` and a section here in the commit that ships it.**

---

## Part 1 — The machine

### The files and the load order

Plain classic `<script>` tags sharing globals: no modules, no bundler, no build step, and it runs from `file://`.
`web/index.html` loads them in an order that matters:

| File | Lines | Owns |
|---|---:|---|
| `thai.js` | ~130 | Thai numbers and numerals, `parseThaiWords`, the phrase table. Pure. |
| `news-data.js` | generated | The baked headlines, FX, weather, football, lottery and gold (`scripts/fetch-news.mjs`, every six hours). Optional at runtime. |
| `world.js` | ~21,500 | **All content, as data**: `ROOMS`, `NPCS` (folded from `_REGULARS` and `FLOOR_STAFF`), `QUESTS`, `ENCOUNTERS`, the tuning constants. Pure declarative data plus a few builders. |
| `games.js` | ~400 | The bar games' rules — Connect 4 and its negamax, Jackpot, pool. Pure, takes an injected `rnd()`. |
| `cli-sim.js` | ~300 | The portable terminal simulator for the heist. Pure, data-driven by `CLI_SCENARIOS`. |
| `engine-core.js` | ~4,000 | `G` and `newGame()`, output (`_say`), save/load, the cast helpers (`_npcRoom`, `_npcActive`, `_findNpc`), `_describeRoom`, the hotels' rent, the pools (`_pickVary`, `_roomFit`, `_voiceFit`), the turn tick `_tick`. Loads first among the engine files. |
| `engine-encounters.js` | ~2,000 | The street encounters (`_ENC` resolvers) and the saleng carts. |
| `engine-play.js` | ~7,900 | Bar social life, happiness, the clock's end (`_endNight`, `_morningLedger`), the bar games' engine side, the expat jobs, the month. |
| `engine-systems.js` | ~14,000 | The barfine, quests, the phone, the season and rain, food, Act One, the bar's books, the affair, the heist, the laundering jobs. |
| `engine-parser.js` | ~21,000 | The command pipeline (`doCommand`), every verb handler, conversation and its routing, `_townTalk`, fast travel, autocomplete (`engineComplete`), the resume redraw (`_renderResume`). |
| `tts.js`, `audio.js` | | Thai speech and the chiptune sequencer. Presentation. |
| `data.js` … `wordcard.js` | | **Vendored** from the Thai trainer (the word card). Never edit here. |
| `term.js`, `scene.js`, `scene-hotspots.js` | | The terminal frontend: decoration and taps, the chip bar, the flyout wheel, the dock, the scene panel. |
| `main.js` | | Boot, the save in `localStorage`, the splash, the display prefs. Loads last. |

The five `engine-*.js` files are **one engine** split for size; nothing runs at load beyond constant initialisers, so a
function may live in any of them and call any other. Which file a function is in is history more than design, which is
why each system section below names the files.

### The rules the engine keeps

These are what keep three futures open — a hosted or shared world, a 2D frontend, and reskins for other towns
(`docs/settings-reuse.md`) — and they are enforced by tests, not by good intentions:

1. **No browser, no clock.** The game core (`thai`, `world`, `games`, `cli-sim`, the five engine files) never touches
   `window`, `document`, `localStorage`, `Date`, timers or the network. Time is `G.day` and `G.nightTurn`. The frontend
   seeds what the engine cannot know (the real month for the season, today's date for the daily challenge).
2. **One state object.** Everything the game remembers is in `G`, which `serializeGame()` writes as JSON and
   `deserializeGame()` reads by merging over a fresh `newGame()` — so **a new field needs only a line in `newGame()`**
   and old saves gain it automatically. Nothing lives in closures, the DOM or module-level variables (the few that do —
   the last command for AGAIN, the parse-failure run — are parser conveniences, deliberately not state).
3. **Deterministic.** Every random roll goes through `_rand()`, a seeded generator whose state is `G.rng`, so a save
   carries its dice and the same seed and commands give the same transcript (`tests/js/online.test.js`). Anything the
   TOWN decides — tonight's quiz bars, where a regular drifts, which girl is on the camera — uses a pure hash (`_hh`,
   `_hm`) of the day and the place instead, so reading the schedule never spends a die. No loop may depend on the dice
   varying (a constant stub must terminate).
4. **Output is a callback.** All prose goes through `_say(text, cls)` into the print function `engineInit` was given.
   The terminal is one renderer; a test harness is another.
5. **Every action is a function.** `doCommand` is a text parser that maps words onto handlers (`_doGo`, `_doTalk`,
   `_doBuy`, …); a 2D frontend would call those handlers and skip the parser.
6. **Content is data.** Rooms, people, dialogue, quests and encounters are declarative records in `world.js`; the engine
   holds machinery and pooled prose.

### `G` — the state, by area

`G` carries well over a hundred fields; its type in the editor is derived from `newGame()` (`types/game.js`), never
hand-listed. The ones every system leans on:

- **Where and when:** `G.room`, `G.day`, `G.nightTurn` (0–120, ten turns an hour from 18:00, dawn at `NIGHT_TURNS`),
  `G.turns`, `G.stage` (`act1` → `vacation` → `expat`), `G.mode` (the Soi 6 week), `G.vacation`, `G.season0`.
- **The player:** `G.player` (origin, personality, orientation, what he has said), `G.money`, `G.bank`, `G.itemLoc` (where every item is — `"inventory"` when you carry it),
  `G.happy`, `G.rep`, `G.hunger`, `G.thirst`, `G.hurt`, `G.battery`, `G.flags` (read with `_flag`, set with `_setFlag`).
- **The night, reset at dawn:** `G.soc` — drink counts, heat, bans, who you met tonight, the bell, the lock-in, and the
  dozens of once-a-night books (`G.soc.helloed`, `G.soc.townSaid` and their kind).
- **People:** `G.talked` (which dialogue nodes each character has delivered — the permanent book), `G.known`,
  `G.metDay`, `G.seenDay`, `G.soc.drinks` (the bond), `G.npc` (trust and mood, read through `_npcState`), `G.prevBond`, `G.everBond`.
- **What the town saw:** `G.lastNightWas`, `G.barSat`, `G.partyLog`, `G.rideLog`, `G.streetLog`, `G.gifts`.
- **Prompts that own the input:** `G.pendingChoice`, `G.pendingEnc`, `G.pendingBf`, `G.pendingFare`, `G.pendingSoapy`,
  `G.game`, plus the conversation `G.convo` and the question she is waiting on, `G.convoQ`.
- **The long game:** `G.quests`, `G.job`, `G.bar`, `G.affair`, `G.syn`, `G.month`, `G.paper`, `G.hotel`, `G.street`.

**Every field's lifetime is declared in `STATE_SCHEMA`** (engine-core, beside `newGame()`): `night`, `trip`, `life`, the
`day` numbers `_ageBooks` moves back across a trip, and `socNight` / `socTrip` for `G.soc`. `_resetNightSoc` resets the
nightly keys `_endNight` does not reset by hand, and `tests/js/state-schema.test.js` fails on a field the schema lacks.

### What happens to a command

`doCommand(input)` is a thin wrapper: it counts parse failures once per thing typed (the third in a row opens the
examples card) and calls `_doCommandInner`, which runs these stages in order. **The order is the design** — most
"wrong answer" bugs in this game have been a later stage that never got the input because an earlier one took it.

1. **Arms and intercepts on the raw line.** A one-command confirmation armed last turn (`G.askArm` — a lease, Nont's
   fee, a stream bell) is answered first; then a handful of raw-text intercepts that must see the line before it is
   normalised (the CTF probe, the Box 15 phrase, the hidden cheat when `CHEATS_ENABLED`).
2. **Read-only verbs under any prompt.** HELP, TIME, INVENTORY, QUESTS, JOURNAL, MESSAGES, DIAGNOSE, SCORE, SHARE answer
   without a turn and `_renderResume()` puts the prompt back.
3. **The prompts, in priority.** `G.pendingChoice` (the intro, the end of the week, the bar's calls, the affair's
   crises, the embassy, every two-step question — each a named gate), then a live `G.game`, then `G.pendingEnc` (a street
   encounter), `G.pendingBf` (the barfine negotiation), `G.pendingSoapy`, `G.pendingFare`. While one is up it owns the
   input; a non-answer ("what?", "what happens if I say yes?") redraws it and commits nothing. Pure Thai is translated
   for a gate first (`_thaiToCmd`). A gate's own labels typed after it closed are "that moment has passed"
   (`_staleModalAnswer`), never a parse failure.
4. **Normalisation.** Lower case, articles and filler stripped, Thai script translated, synonyms folded.
5. **The sentence reader.** `_readRoute` reads the line as a sentence (`_read`: question, statement, greeting…; about
   me/you/her; an act like the leaving or buying her a drink) and routes the acts that must change state; while you are
   talking to somebody, a question about her reaches her before the verb list.
6. **The verb switch.** Several hundred verbs, each calling its handler.
7. **The floor.** What no verb claimed: plain-English help (`_naturalHelp`), the conversation layer (`_convoResolve` —
   a bare topic, a canned reply to her question), the catch-all that answers a sentence said to her (`_readAsk`), and
   finally the escalating parse failure (`_parseFail`: the soi's shrug, then a plain warning with examples, then the card).

A handler that costs time calls `_tick()` (or `_passTime(n)` for several turns offstage). Free verbs do not.

### What happens every turn — `_tick`

One call per turn-costing command. In order, roughly:

- `_questTick` completes any active quest whose `doneFlag` is now set and pays it.
- The body: hunger and thirst accrue, the drink wears off on its own clock, a redlined meter costs happiness, and the
  night can end here (`_endNight("collapse")`, a blackout, `G.hurt` at three).
- The clock advances; at `NIGHT_TURNS` the night ends (`_endNight("dawn")`).
- The room's weather and life: rain and drizzle, the soi dog's dark-street streak, the saleng carts, the closing tick and
  last call, the rail regulars drifting (`_railTick`), the band, the cameras, the lock-in, a peddler, a flower seller,
  incoming texts, overheard Thai.
- **The calls, one at most, only where they belong** — the affair's discovery, the CCIB visit, Tan's favour, the
  accountant, the kept girl, the shift call, the procurement job, the affair's door. Each is a `…Due()` / `…Ask()` pair
  and each yields to a prompt already up.
- The shift being stood (`_workPresenceTick`), the manager's floor (`_jobCounselTick`), the bar's floor moments, and the
  slow background clocks (the heist's box, the lay-low window, Kruu Waen's homework).

### The end of a night — `_endNight(reason)`

The reason (`sleep`, `dawn`, `allnighter`, `sunrise`, `barfine`, `collapse`, `blackout`, `robbed`, `hurt`, `roadhit`…)
decides where you wake and what the morning says. The order is load-bearing, because each step writes what the next
reads and the ledger must print last:

1. What the night was is written down first (`G.lastNightWas`, the bars sat in, who you left with, the party and ride
   logs, a crash), then the night's books reset and **`G.day` advances**.
2. The rent (`_chargeRent`) — the folio bills even a man who slept rough.
3. The debts and the people: Nira's loan rolls, the care she said, the condo office's word, the job's night
   (`_jobNight`), the payday (`_incomeTick`), the bar's settle (`_barSettle` — graded on the night played), the
   destitution count, a crooked door coming back.
4. **The morning ledger** (`_morningLedger`) — what moved in pocket, account and Nont's hold, named — and the month line
   on a payday. It runs after every money step so it can name them all.
5. You wake in the right room (`_describeRoom`).

### Arriving somewhere — `_arriveAt(to)`

Every way into a room — walking, TRAVEL, a bike, a bus — ends in `_arriveAt`, so a rule about arrival is written once:
the door's ban and the shutters, quiz capture, an invitation honoured, the companion's entrance (`_partyArrive`), a
manager's welcome shot, a sighting, the encounter roll, then the room described.

### Who says what — people, dialogue and the town's mouths

A character is an entry in `NPCS`: a **flat list of state-gated dialogue nodes**, first open match wins. There are no
dialogue trees; branching is state (flags, quest stages, the bond tier, trust and mood, `when` closures). `_pickDialogue`
chooses, `_deliver` prints and records the node in `G.talked` so a repeat is the gist and nobody retells unprompted.
Above and below the authored nodes sit the engine's own answers (`_doTalkCore` tries them in a fixed order): the town's
shared knowledge (`_townTalk`, by register — the floor's English, the house's, a customer's), what she remembers of you
(last night, the gifts, the street), and the miss pools when nobody knows. The register of every pooled line is chosen
by who is speaking (`_roomFit` drops a line naming staff the room does not have; `_voiceFit` keeps a British line out of
an American's mouth).

#### The order a person answers in

The first open answerer wins, so the order is the design: a helper placed above another takes every question both could
answer. Moving one is a change to who answers, and the test below makes you write it down.

<!-- talkorder -->
*Generated by `tools/talk-order.mjs` — the helpers `_doTalkCore` tries, in order; the first that answers wins. `tests/js/talk-order.test.js` pins it.*

1. `_seenHomeTalk`
2. `_deedTalk`
3. `_textTalk`
4. `_streetTalk`
5. `_ownNightTalk`
6. `_ownBarTalk`
7. `_patronRage`
8. `_wentWithTalk`
9. `_withHerTalk`
10. `_partyTalk`
11. `_oppTalk`
12. `_lastByeDue`
13. `_atCamera`
14. `_lockInMemory`
15. `_jobMemoryTalk`
16. `_ownWordTalk`
17. `_townTalk`
18. `_bfRefusalSay`
19. `_lastTimeTalk`
20. `_flightTalk`
21. `_mineTalk`
22. `_myJobTalk`
23. `_deliver`
24. `_thaiWordTalk`
25. `_quizTalk`
26. `_normalGirlTalk`
27. `_careTalk`
28. `_moneyTalk`
29. `_leavingTalk`
30. `_playerSaidTalk`
31. `_drinksOnlyWhy`
32. `_jobFloorTalk`
33. `_awayTalk`
34. `_stillOpenTalk`
35. `_openingTalk`
36. `_busyTalk`
37. `_closingTalk`
38. `_leagueTalk`
39. `_checkpointTalk`
40. `_goneTalk`
41. `_fixtureTalk`
42. `_hotelTalk`
43. `_soberTalk`
44. `_smallTalk`
<!-- /talkorder -->

### Prose that repeats

Any line printed on an action that can repeat is a pool picked by `_pickVary(pool, key)`, which will not repeat a line
until half the pool has been said. Pools a whole town deals from (`_pickTownLine`) keep a town-wide book so ten women do
not say one sentence. The chorus, gogo, voice and witness audits gate the pools (see `tools/`).

### The frontend

`term.js` renders the transcript and decorates it — a parenthesised CAPS hint becomes a tappable command, a name a
tappable person, Thai a word card — and draws the chip bar from the engine's `_chipSet()`, the flyout wheel from
`_npcActions`, and autocomplete from `engineComplete`. **Every player option lives on three surfaces** (the parser, the
wheel, autocomplete), and the rule for each lives in one engine helper they all consume. `main.js` owns persistence and
calls `_renderResume()` after a load so a prompt is never invisible. Nothing in the frontend knows a game rule.

### Tests and instruments

`tests/js/*.test.js` load the real sources into `node:vm` and drive the engine through `doCommand` and the print
callback; `tests/e2e/` is a thin Playwright pass over the real page. Beside them sit the audits in `tools/` — modal,
money, happiness, composition, memory, chorus, question, remark, offer, gogo, witness, askable, afford, errand, asktopic —
each gated by a test, each derived from the engine rather than a hand-written list. `docs/systems.json` is the registry
the coverage map, the persona ledger and this document share. The persona rounds (`CLAUDE.md`) are the instrument for
everything the audits cannot see.

---

## Part 2 — The systems

<!-- index -->
*Generated from `docs/systems.json` — one row per system; the sections below are hand-written.*

| System | id | note |
|---|---|---|
| [Act One: the wallet race](#act-one-the-wallet-race-act1) | `act1` | the do-or-die opening |
| [Identity: the taxi intro, origins, WHO AM I](#identity-the-taxi-intro-origins-who-am-i-identity) | `identity` |  |
| [The clock: nights, dawn, sunrise, the all-nighter, WAIT](#the-clock-nights-dawn-sunrise-the-all-nighter-wait-clock) | `clock` |  |
| [The body: hunger, thirst, drunk, hurt, hangover, DIAGNOSE](#the-body-hunger-thirst-drunk-hurt-hangover-diagnose-body) | `body` |  |
| [Sobriety and comps: the welcome shot, the bell's bottle, I DON'T DRINK](#sobriety-and-comps-the-welcome-shot-the-bells-bottle-i-dont-drink-sobriety) | `sobriety` |  |
| [The baht bus](#the-baht-bus-bus) | `bus` |  |
| [The motosai and the highway](#the-motosai-and-the-highway-motosai) | `motosai` |  |
| [Navigation](#navigation-navigation) | `navigation` | TRAVEL stops at the dark since round 52 |
| [Darkness and the torch](#darkness-and-the-torch-darkness) | `darkness` |  |
| [The soi dog](#the-soi-dog-dog) | `dog` |  |
| [Money: the ATM, the account, Nont's CASH, SEND](#money-the-atm-the-account-nonts-cash-send-money) | `money` |  |
| [Drinks and the seat](#drinks-and-the-seat-drinks) | `drinks` |  |
| [Lady drinks, tips and the bond](#lady-drinks-tips-and-the-bond-ladydrinks) | `ladydrinks` |  |
| [Flirting, heat and the room's favour](#flirting-heat-and-the-rooms-favour-social) | `social` |  |
| [The bell and the lock-in](#the-bell-and-the-lock-in-bell) | `bell` |  |
| [The barfine](#the-barfine-barfine) | `barfine` | the negotiation modal |
| [Taking her out](#taking-her-out-party) | `party` |  |
| [The night ride](#the-night-ride-nightride) | `nightride` |  |
| [Street encounters](#street-encounters-encounters) | `encounters` |  |
| [The cons and REPORT](#the-cons-and-report-cons) | `cons` |  |
| [The phone](#the-phone-phone) | `phone` |  |
| [Conversation](#conversation-conversation) | `conversation` |  |
| [Quests and the journal](#quests-and-the-journal-quests) | `quests` |  |
| [The rail regulars](#the-rail-regulars-regulars) | `regulars` |  |
| [The calendar](#the-calendar-calendar) | `calendar` |  |
| [Bar games](#bar-games-games) | `games` |  |
| [Thai](#thai-thai) | `thai` |  |
| [Hotels](#hotels-hotels) | `hotels` |  |
| [Weather and season](#weather-and-season-weather) | `weather` |  |
| [Media](#media-media) | `media` |  |
| [Food and satiety](#food-and-satiety-food) | `food` |  |
| [The saleng carts](#the-saleng-carts-saleng) | `saleng` |  |
| [Massage, the soapies and the gents' clubs](#massage-the-soapies-and-the-gents-clubs-massage) | `massage` |  |
| [The clinic](#the-clinic-clinic) | `clinic` |  |
| [Police, heat and reputation](#police-heat-and-reputation-police) | `police` |  |
| [สนุก: the treadmill, jaded, the levels, สบายสบาย](#the-treadmill-jaded-the-levels-happiness) | `happiness` |  |
| [The stages: vacation end, the new vacation, going expat, SHARE](#the-stages-vacation-end-the-new-vacation-going-expat-share-vacation) | `vacation` |  |
| [Buying the bar](#buying-the-bar-barchain) | `barchain` |  |
| [Running the bar](#running-the-bar-barbooks) | `barbooks` |  |
| [Procurement and friction](#procurement-and-friction-procurement) | `procurement` |  |
| [The staff affair](#the-staff-affair-affair) | `affair` |  |
| [The Rabbit heist](#the-rabbit-heist-heist) | `heist` |  |
| [The Bangkok arc: Sao](#the-bangkok-arc-sao-sao) | `sao` |  |
| [Cream, the chameleon economy](#cream-the-chameleon-economy-cream) | `cream` |  |
| [The floor staff](#the-floor-staff-filler) | `filler` |  |
| [Nira's loan](#niras-loan-loans) | `loans` |  |
| [The Orchid Room and Notty's](#the-orchid-room-and-nottys-orchid) | `orchid` |  |
| [Save, reload, UNDO, RESTART, the resume redraw](#save-reload-undo-restart-the-resume-redraw-saveload) | `saveload` |  |
| [The frontend: taps, chips, the wheel, FABs, HELP, autocomplete](#the-frontend-taps-chips-the-wheel-fabs-help-autocomplete-presentation) | `presentation` |  |
| [World prose: room descs, revisits, lateDesc, geography, reversibility, the reads](#world-prose-room-descs-revisits-latedesc-geography-reversibility-the-reads-worldprose) | `worldprose` |  |
| [Real-world guardrails: identifiability, names, venues](#real-world-guardrails-identifiability-names-venues-guardrails) | `guardrails` |  |
| [The resident's month](#the-residents-month-expat-month) | `expat-month` | split from expat-economy 2026-10-21 |
| [Jobs](#jobs-expat-jobs) | `expat-jobs` | split from expat-economy 2026-10-21 |
| [The condo](#the-condo-expat-condo) | `expat-condo` | split from expat-economy 2026-10-21 |
| [The paper by the till and the laundering jobs](#the-paper-by-the-till-and-the-laundering-jobs-laundering) | `laundering` | built 2026-10-08 |
| [The digital barstool](#the-digital-barstool-soi6-stream) | `soi6-stream` | built 2026-10-22 from the canon essay (pattern only) |
<!-- /index -->

## The opening, the body and the frame

The do-or-die opening, who you are, the night's clock and the body that pays for it, the meter the game scores, the stages of a life, and the frame around all of it — the save, the frontend, the room prose and the rules for drawing on the real town.

### Act One: the wallet race (`act1`)
<!-- system: act1 -->

**What it is.** The opening: day two of a week, face-down on Jomtien beach with no wallet, ฿0 and a phone at 13%, and
one night to get back to the hotel room — the game's only do-or-die stretch and the gate to the sandbox. A resident
replays the chain once, after a blackout.

**How it works.**
- `newGame()` starts in `act1`; `engineIntro()` runs the taxi (see `identity`), then `_beachOpening`, which on a first
  attempt opens a real conversation with Auntie Nok (`_doTalkBody`) so the chip bar teaches the taps.
- Progress is flags set by dialogue nodes, listed in `_ACT1_MILESTONES` and counted by `_act1Progress`. Two doors:
  wai Madam Oy and ask (her node sets `oyGaveWallet` and `hasWallet`), or crack her safe — `_doSafe` takes `SAFE_PIN`,
  and a third wrong code walks you out.
- `_checkAct1` runs after every command. Once `hasWallet` is set it sets `act1Done` and `act1Scored`, scores the run
  into `G.score` and สนุก, moves `G.stage` to `vacation`, and arms `G.act1SafeDue` so `_roomSafeBeat` pays `SAFE_CASH`
  in your room.
- `_endNight` with `act1Done` unset and a reason of dawn, collapse, blackout, hurt or a crash calls `_act1Fail`: a
  `newGame()` reset that keeps only `G.player`, `G.season0`, the dog, `G.act1Best` and `G.act1Tries`. One failure
  unlocks HINT (`_doHint`, keyed to `_ACT1_HINTS`).
- The second wallet: `_walletLostRoll` (expat blackout wakes only, once a life) rolls `WALLET_LOST_ODDS` by
  `G.blackouts`; `_walletLost` clears `_WALLET_RE_CLEAR`, puts the wallet back in the safe and activates `wallet_again`.
  `_walletHunt()` is the predicate every opening gate reads beside `act1Done`. `_walletCardTick` restores the ATM after
  `WALLET_CARD_DAYS`; `_walletBackCheck` closes the hunt by either door; `_walletCash()` is what the wallet returns.

**State.** For life: the flags (`act1Done`, `act1Scored`, `hasWallet`, the milestones, `walletLost`, `walletEver`,
`walletCard`), `G.act1Best`, `G.act1Tries`, `G.act1SafeDue`, `G.score`, `G.blackouts`, `G.walletHeld`,
`G.walletLostDay`, `G.walletLostAt`. Nightly: `G.safeTries`.

**Constants.** `SAFE_PIN`, `SAFE_CASH`, `WALLET_CASH` (cash in the recovered wallet), `WALLET_LOST_ODDS`,
`WALLET_CARD_DAYS`, `BUS_FARE`.

**Touches.** `clock` and `body` (their endings reset the game here), `identity`, `quests`, `money`
(`_doWithdrawInner` refuses the ATM during the hunt), `conversation`. A new `_endNight` reason must decide whether
it fails Act One; a new opening gate must also read `_walletHunt()`.

**Tests.** `tests/js/engine.test.js`, `tests/js/playtest5.test.js`, `tests/js/wallet2.test.js`,
`tests/js/round99.test.js`, `tests/js/predicates.test.js`.

**Design docs.** `docs/ctf.md` (the safe code), `docs/design-backlog.md`.

<!-- facts: act1 -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `sell` · `wai` · `safe` · `keypad` · `code` · `pin` · `hint`
> **Prompts (`G.pendingChoice` and the like):** `intro`
> **Quests:** `safecracker` · `wallet_again`
> **Soak counters:** `act1.completed` · `roomsafe.paid`
> **Predicates:** `_walletHunt()`
> **People:** `nok` · `candy` · `lek` · `oy` · `bank` · `mot` · `tan`
> **Rooms:** `jomtien_beach` · `oy_office` · `rainbow_girls` · `candy_bar`
> **Code named above, by file:** engine-core.js — `_walletCash`, `_walletHunt` · engine-play.js — `_endNight` · engine-systems.js — `_ACT1_HINTS`, `_ACT1_MILESTONES`, `_WALLET_RE_CLEAR`, `_act1Fail`, `_act1Progress`, `_checkAct1`, `_doHint`, `_roomSafeBeat`, `_walletBackCheck`, `_walletCardTick`, `_walletLost`, `_walletLostRoll` · engine-parser.js — `_beachOpening`, `_doSafe`, `_doTalkBody`, `_doWithdrawInner`
<!-- /facts -->

### Identity: the taxi intro, origins, WHO AM I (`identity`)
<!-- system: identity -->

**What it is.** Before either opening, Tan drives you in from the airport and asks three questions: what you left
behind, what a room gets when it looks at you, what you are in the market for. The answers gate and flavour dialogue,
set the expat stage's money, and remove one character from the town — the archetype you picked is you.

**How it works.**
- `_taxiIntro(after)` sets `G.pendingChoice = "intro"` before printing (so the intro's names never decorate into dead
  taps) and records the opening to follow in `G.introAfter`.
- `_INTRO_STEPS` walks `ORIGINS`, `PERSONALITIES` and `ORIENTATIONS`. `_introPrompt` prints the numbered picks;
  `_introAnswer` matches with `_introMatch` (a digit, a Thai number word, the printed line, or a keyword) and stores the
  id in `G.player` plus the label chosen in `G.player.said`, since two orientation entries share an id.
- The last answer adds Tan's number and hands off to `_beachOpening` or `_soi6Opening`.
- Readers: `_isOrigin`, `_pers`, `_orient` (false before the intro); `_npcActive` hides the NPC whose `origin` matches
  yours; `_npcPersTalkOutcome` tilts a compliment or joke; `_originMoney`; `_thaiPoints` (the half-Thai origin starts
  up the language ladder). WHO AM I is `_doWhoAmI`.
- `_act1Fail` and `startSoi6Mode` keep `G.player` across their resets; RESTART clears it, so the taxi runs again.

**State.** For life: `G.player.origin`, `G.player.personality`, `G.player.orientation`, `G.player.said`,
`G.player.tanThai`. Only during the intro: `G.introStep`, `G.introAfter`.

**Constants.** `ORIGINS`, `PERSONALITIES`, `ORIENTATIONS` (each entry `{id, label, pick, tan}`), `ORIGIN_MONEY`. New
entries go at the end: a table's order is the intro's numbering.

**Touches.** `act1` and `vacation` (resets that keep it), `expat-month` and `expat-jobs` (`ORIGIN_MONEY`),
`conversation` (`when` gates read `_isOrigin`), `thai`, `regulars` (the origin archetypes on Soi 6). Reordering a
table renumbers every typed answer and every test that types a digit.

**Tests.** `tests/js/engine.test.js` (its `beforeEach` sets a default identity), `tests/js/round56.test.js`,
`tests/js/round84.test.js`, `tests/js/round92.test.js`, `tests/js/halfthai.test.js`; the intro is a
`tools/modal-audit.mjs` recipe.

**Design docs.** `docs/design-backlog.md`.

<!-- facts: identity -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `who` · `identity`
> **Prompts (`G.pendingChoice` and the like):** `intro`
> **Quests:** `taxi_debt` · `glass_start`
> **People:** `tan` · `kyle`
> **Code named above, by file:** engine-core.js — `_isOrigin`, `_npcActive`, `_orient`, `_pers` · engine-play.js — `_npcPersTalkOutcome` · engine-systems.js — `_act1Fail` · engine-parser.js — `_INTRO_STEPS`, `_beachOpening`, `_doWhoAmI`, `_introAnswer`, `_introMatch`, `_introPrompt`, `_soi6Opening`, `_taxiIntro`, `_thaiPoints` · world.js — `_originMoney`
<!-- /facts -->

### The clock: nights, dawn, sunrise, the all-nighter, WAIT (`clock`)
<!-- system: clock -->

**What it is.** The game is the nights: 18:00 to 06:00 in six-minute turns, with the day slept through. How a night
ends — your bed, dawn on your feet, the sunrise you waited for, or your body giving out — decides where you wake and
what it cost.

**How it works.**
- A turn-costing command calls `_tick()`, which advances `G.turns` and `G.nightTurn`; `_passTime(n)` runs n ticks
  offstage. `_clockStr` formats a turn.
- At `NIGHT_TURNS` the tick calls `_endNight("dawn")`. After Act One a man standing away from home is renamed
  `allnighter` at the top of `_endNight`: a taxi home, a doubled hangover, no robbery. Only blackout and collapse wake
  you rough (`_crashSpotFor`).
- SLEEP, WATCH SUNRISE (`_doWatchSunrise`, from `SUNRISE_TURN`, outdoors or at a window) and a WAIT into the dawn each
  end the night, so each asks once via `_endConfirm`, which arms `G.endWarn` for the next command only.
- `_doWait` takes turns, minutes, hours or WAIT UNTIL a time (`_hourToTurn`); a bare 15 or more is minutes. It stops
  early on an encounter, a text, a shutter, a body warning, or the house's patience (`_nursed`).
- `_endNight` records the night (`G.lastNightWas`, `G.nightLog`), wipes the nightly books, advances `G.day`, wakes
  you, then runs the money and the ledger (order in Part 1).
- Calendar arithmetic goes through `_weekday`, `_quizDay`, `_isQuizWindow`, `_leagueTonight` — never raw `G.day % 7`.

**State.** `G.nightTurn`, `G.turns`, `G.day`, `G.endWarn`, `G.sunriseDay`, `G.nightLog` (per vacation),
`G.lastNightWas`. `G.soc` is nightly.

**Constants.** `NIGHT_TURNS` (120, in engine-play), `SUNRISE_TURN`, `LAST_BUS_TURN`, `SOI6_CLOSE`, `WEEKDAYS`,
`HOUSE_PATIENCE`. Midnight is turn 60; the last bus goes sparse at 80 (02:00) and the sky starts at 110 (05:00).

**Touches.** `act1` (dawn fails the opening), `body`, `hotels` (rent at the wake), `calendar`, `bus` (`_lastBusWarn`),
`money` (the ledger), `party` and `nightride` (SLEEP or a sunrise with company becomes the long-time close). A loop
over `_tick` must stop when `G` is replaced (`_act1Fail`) or the day changes.

**Tests.** `tests/js/engine.test.js`, `tests/js/playtest5.test.js`, `tests/js/round54.test.js`,
`tests/js/round80.test.js`, `tests/js/round105.test.js`, `tests/js/references.test.js` (no uncomputed hour in prose),
`tests/js/soak.test.js`.

**Design docs.** none.

<!-- facts: clock -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `wait` · `time` · `sleep` · `watch`
> **Soak counters:** `night.ended`
> **Code named above, by file:** engine-core.js — `_passTime`, `_tick` · engine-play.js — `_clockStr`, `_crashSpotFor`, `_endConfirm`, `_endNight`, `_isQuizWindow`, `_lastBusWarn`, `_leagueTonight`, `_quizDay`, `_weekday` · engine-systems.js — `_act1Fail`, `_doWatchSunrise` · engine-parser.js — `_doWait`, `_hourToTurn`, `_nursed`
<!-- /facts -->

### The body: hunger, thirst, drunk, hurt, hangover, DIAGNOSE (`body`)
<!-- system: body -->

**What it is.** Four meters that make the night physical. Hunger and thirst creep up, drink wears off slowly, injuries
stack, and any of them at the limit ends the night where you stand. Last night's drinking is the next evening's
hunger and thirst. DIAGNOSE reads it back in prose.

**How it works.**
- In `_tick`: hunger rises every third turn, thirst every second. Latched warnings fire once at 70 and 90
  (`G.warned`); at 80 a meter costs a สนุก point an hour; at 100 the tick calls `_endNight("collapse")`.
- `G.soc.drunk` loses a unit every 20 turns from the night's first drink (`G.soc.soberNext`). `_checkDrunk` blacks you
  out at 9.
- `_hurt(n)` caps `G.hurt` at `HURT_CAP` and ends the night there — every injury site must use it. A bike crash
  (`_motoCrashRisk`) sets `G.crashInjury`, which becomes `G.hurt = 1` next evening. A hospital night wakes through
  `_hospitalMorning`.
- `_endNight` takes the night's drink count as the hangover (two more after an all-nighter, one less at the quiet
  Sabai), keeps it in `G.hangover` for the evening, and sets the new evening's meters from it, capped so a rough wake can
  still reach water.
- Food is refused below `FULL_AT` (`_tooFull`, checked before money moves); eating itself is `food`. DRINK is
  `_doDrink`; SHOWER (`_doShower`) is flavour.
- `_doDiagnose` prints the meters, the drink, `G.hurt`, the piwins' limit and an STD symptom (`_stdSymptomatic`). It
  names last night's hangover from `G.hangover`.

**State.** `G.hunger`, `G.thirst`, `G.hurt`, `G.crashInjury`, `G.warned`, `G.roomWater`, `G.hospitalVisits`, `G.std`;
nightly `G.soc.drunk`, `G.soc.soberNext`.

**Constants.** `FULL_AT`, `HURT_CAP`, `ROUGH_WAKE_CAP` (most a rough wake takes), `_CRASH_BATTERY`.

**Touches.** `clock`, `sobriety` (comps land on the meter), `drinks`, `food`, `motosai` (the drunk balk, the crash),
`clinic`, `act1`. Raising a meter outside the tick's limit check, or bumping `G.hurt` directly, leaves the player
pinned at the limit with no ending.

**Tests.** `tests/js/engine.test.js`, `tests/js/round53.test.js`, `tests/js/accident.test.js`,
`tests/js/hospital.test.js`, `tests/js/std.test.js`, `tests/js/reachability.test.js`.

**Design docs.** none.

<!-- facts: body -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `diagnose` · `eat` · `drink` · `shower`
> **Soak counters:** `blackout` · `hospital.morning`
> **Code named above, by file:** engine-core.js — `_hurt`, `_tick`, `_tooFull` · engine-play.js — `_CRASH_BATTERY`, `_checkDrunk`, `_endNight`, `_hospitalMorning`, `_motoCrashRisk`, `_stdSymptomatic` · engine-parser.js — `_doDiagnose`, `_doDrink`, `_doShower`
<!-- /facts -->

### Sobriety and comps: the welcome shot, the bell's bottle, I DON'T DRINK (`sobriety`)
<!-- system: sobriety -->

**What it is.** A free drink is still a drink: the manager's welcome shot, the bell's bottle, the lock-in's party and a
whale's round all land on the drunk meter. A quarter of the bars pour them heavy and chalk a lady drink to you once you
are past noticing. A man who says he doesn't drink is believed, and the house stops pouring.

**How it works.**
- Every free pour goes through `_compDrink(n)`. With `G.player.teetotal` set it prints a `_COMP_DECLINED` line and
  touches nothing; otherwise it records `G.lastComp`, adds to `G.soc.drunk` (one extra at a pushy bar), eases thirst,
  runs `_checkDrunk`, and at a pushy bar `_pushyUpsell`.
- `_pushyBar(room)` is a pure hash of the room (a stable quarter of beer, Soi 6, go-go and gents rails, never your own
  bar), so the same bars work you every trip. A lock-in is never pushy.
- `_pushyUpsell`, once a bar a night and only three drinks deep: a hostess picked by hash gets a lady drink through
  `_ladyDrinkCharge`, counted in `G.soc.drinkCount` and `_boughtBond`. Not with a woman on your arm.
- Callers: `_managerWelcome`, the bell's `_BELL_BEER` line, the lock-in's dare, `_tobTaen`, the stream whale's bell.
- I DON'T DRINK / TEETOTAL is a whole-sentence intercept that calls `_doTeetotal`; ordering a drink yourself un-says it
  (`_TEETOTAL_BROKEN`). DECLINE within two turns of a comp is `_doRefuseDrink`. ASK anyone ABOUT SOBER is
  `_soberTalk`, in the speaker's register.

**State.** `G.player.teetotal` (for life, until you order one), `G.lastComp`; nightly `G.soc.drunk`, `G.soc.comped`,
`G.soc.padded`, `G.soc.mgrShot`.

**Constants.** None numeric; the behaviour is in the pools (`_COMP_HEAVY`, `_COMP_PADDED`, `_COMP_BACK`,
`_TEETOTAL_SAID`).

**Touches.** `body`, `bell`, `ladydrinks` (the padded chit counts toward mama's midnight gate), `barchain` (your own
bar is never pushy), `party`. A new free drink that bumps `G.soc.drunk` directly bypasses the declaration and the
pushy bars.

**Tests.** `tests/js/comped.test.js`, `tests/js/round53.test.js`, `tests/js/composition-audit.test.js`,
`tests/js/predicates.test.js`; `tools/soak.mjs` counts `sobriety.declared`.

**Design docs.** `docs/essay-ledger.md`.

<!-- facts: sobriety -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `decline` · `refuse`
> **Soak counters:** `sobriety.declared`
> **Predicates:** `G.player.teetotal`
> **People:** `fast_eddy` · `bert`
> **Code named above, by file:** engine-play.js — `_BELL_BEER`, `_COMP_DECLINED`, `_COMP_HEAVY`, `_COMP_PADDED`, `_boughtBond`, `_checkDrunk`, `_compDrink`, `_managerWelcome`, `_pushyBar`, `_pushyUpsell` · engine-systems.js — `_tobTaen` · engine-parser.js — `_COMP_BACK`, `_TEETOTAL_BROKEN`, `_TEETOTAL_SAID`, `_doRefuseDrink`, `_doTeetotal`, `_ladyDrinkCharge`, `_soberTalk`
<!-- /facts -->

### สนุก: the treadmill, jaded, the levels, สบายสบาย (`happiness`)
<!-- system: happiness -->

**What it is.** สนุก (fun) is the sandbox's score: everything good feeds it, and สบายสบาย at 100 is celebrated once
and ends nothing. The rule is depth over breadth — presence, courtship and a woman who knows you keep paying, while
churn and money run into tapers.

**How it works.**
- `_addHappy(n, why)` is the only writer. It floors `G.happy` at 0 (no cap), prints the change with a reason,
  announces a new level from `HAPPY_LEVELS` once a trip (`G.levelsSeen`), and at 100 sets `sabaiSabai` and plays the
  scene once.
- `_conquestHappy(base, id)` is the treadmill for every paid night. A stranger pays `base − 2 × G.jaded` (floored at
  −4) and adds a notch of `G.jaded`; a woman at regular or better pays `base + 2` with no jaded, for the first
  conquest with her that night only. It also marks the affair's slip and records `G.lastConquest`. `G.jaded` cools one
  a day and resets each vacation.
- Tapers on the cheap sources: `_boughtHappy` (a night's purchases pay full for six, then half, then a third),
  `_charmHappy` (distinct women charmed), `_boughtBond` (`BOND_NIGHT_CAP`), `_floorJoy` (once a room a night),
  `_danceJoy` (once a night, with a woman who knows you), `PHOTO_JOY_NIGHT`.
- `_happyLevel(h)` names the level for SCORE, DIAGNOSE and the card.

**State.** Per vacation: `G.happy`, `G.jaded`, `G.levelsSeen`, the `sabaiSabai` flag. For life: `G.bestHappy`.
`G.lastConquest`. Nightly: `G.soc.bought`, `G.soc.charmedN`, `G.soc.bondNight`, `G.soc.joyRooms`, `G.soc.dancePaid`,
`G.soc.bfNight`.

**Constants.** `HAPPY_LEVELS` (0/10/25/50/100), `BOND_NIGHT_CAP`, `PHOTO_JOY_NIGHT`.

**Touches.** Every system that pays; `barfine`, `party`, `nightride`, `affair` and `encounters` through
`_conquestHappy`; `vacation` resets it; `saveload` (`_sanitizeState` deliberately does not cap it at 100). A new free
act must pay once (a day or room book) or it becomes the economy; a permanent loss should lower the meter and name why.

**Tests.** `tests/js/happiness-audit.test.js` (gates `tools/happiness-audit.mjs`: the meter moves by the printed
figures, a free act pays once, a loss names its reason), `tests/js/engine.test.js`, `tests/js/round75.test.js`,
`tests/js/round86.test.js`.

**Design docs.** `docs/economy-review.md`, `docs/design-backlog.md`.

<!-- facts: happiness -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Soak counters:** `happy.gained` · `treadmill.jaded`
> **Code named above, by file:** engine-core.js — `_sanitizeState` · engine-play.js — `_boughtBond`, `_boughtHappy`, `_charmHappy`, `_conquestHappy`, `_happyLevel` · engine-parser.js — `_danceJoy`, `_floorJoy`
<!-- /facts -->

### The stages: vacation end, the new vacation, going expat, SHARE (`vacation`)
<!-- system: vacation -->

**What it is.** A holiday is seven nights; then the game asks what next — fly home and come back next month, or stay
for good. On the Soi 6 week the gate offers another week, the cancelled ticket, or a fresh roll. SHARE prints the week
as a Wordle-style card.

**How it works.**
- After `G.day++` in `_endNight`, a non-expat day past seven settles the last night (rent at checkout, the last ledger)
  and calls `_endVacation`, which records `G.bestHappy` and sets `G.pendingChoice = "vacation_end"`.
- The gate in `_doCommandInner` explains on a question and commits only on an answer that starts with the choice: NEW
  VACATION → `_newVacation()`, MOVE TO PATTAYA → `_goExpat()`.
- `_newVacation(opts)` plays the airport scrub (`_suvarnabhumiScrub`), resets the week (day 1, สนุก and jaded to zero,
  the pocket into the account, `SAFE_CASH` in hand), ages the memory books (`_ageBooks`), keeps what she told you, and
  carries bonds via `G.prevBond`: her-farang returns a regular, a regular a face.
- `_goExpat(opts)` sets `G.stage = "expat"` and `expatLife`, wires `EXPAT_SAVINGS`, starts `G.payDay` and sets the
  paper and the bank book.
- On Soi 6, CONTINUE opens `soi6continue`: ANOTHER WEEK is `_newVacation({ soi6: true })`; CANCEL THE TICKET is
  `_soi6Stay`, which lifts `G.mode` and `G.dailyId` then calls `_goExpat`. PLAY AGAIN is `startSoi6Mode()`.
- SHARE is `_doShare` → `_shareCard()`: a `_NIGHT_EMOJI` glyph per entry of `G.nightLog`, the social counts, สนุก
  against the best, and on Soi 6 what the week cost. main.js copies it to the clipboard.

**State.** `G.stage`, `G.vacation`, `G.day`, `G.mode`, `G.dailyId`, `G.dailySeed`, `G.bestHappy`, `G.nightLog`,
`G.prevBond`, `G.everBond`, `G.ledgerSeen`, `G.lastNight`.

**Constants.** `EXPAT_SAVINGS`, `SAFE_CASH`, `SOI6_POCKET`, `SOI6_BANK`, `SEASON_MONTH_DAYS` (the month `_ageBooks`
adds).

**Touches.** `happiness`, `act1`, `expat-month` and `expat-jobs`, `loans` (a loan flown home on), `phone`, `saveload`
(`_renderResume` redraws the gate). A new per-trip book needs a line in `_newVacation`, and a day-keyed memory book a
line in `_ageBooks`, or a month later it reads "-6 nights ago".

**Tests.** `tests/js/engine.test.js`, `tests/js/playtest5.test.js`, `tests/js/research.test.js`,
`tests/js/round96.test.js`, `tests/js/round106.test.js`, `tests/js/scrub.test.js`; e2e
`tests/e2e/sharecard.spec.mjs`.

**Design docs.** `docs/metrics-design.md`, `docs/soi-sanuk-games-extension.md`.

<!-- facts: vacation -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `share`
> **Prompts (`G.pendingChoice` and the like):** `vacation_end` · `soi6continue`
> **Code named above, by file:** engine-play.js — `_ageBooks`, `_endNight`, `_endVacation`, `_goExpat`, `_newVacation`, `_soi6Stay`, `_suvarnabhumiScrub` · engine-parser.js — `_NIGHT_EMOJI`, `_doCommandInner`, `_doShare`, `_renderResume`, `_shareCard`
<!-- /facts -->

### Save, reload, UNDO, RESTART, the resume redraw (`saveload`)
<!-- system: saveload -->

**What it is.** The game saves after every command, keeps one command of UNDO, and on reload redraws whatever question
was waiting so nobody types into an invisible prompt. A night's end is final — UNDO cannot cross it — which is what
makes the Act One failure and every morning real.

**How it works.**
- `serializeGame()` is `JSON.stringify(G)`. `deserializeGame(s)` merges the save over a fresh `newGame()` one level
  deep, so a new field needs no backfill; after the merge come the semantic migrations (pre-stage saves, renamed ids,
  the old faction key) and `_sanitizeState`, which clamps `_SANE_SCALARS`, caps `_SANE_ARRAYS` and reseeds a bad
  `G.rng`. `_safeMergeKey` refuses prototype keys.
- main.js owns storage: the save (`lbb_save`), the UNDO snapshot (`lbb_undo`), and the shelf (`lbb_shelved`) for a
  set-aside night. When `G.day` changes across a command, the UNDO buffer is dropped.
- UNDO is refused mid-game, mid-encounter and mid-barfine. A restore runs `_describeRoom`, then `_renderResume()`, then
  deserializes again, because the redraw spends dice.
- `_renderResume()` redraws the gating prompt in the same priority as `_doCommandInner`'s gates, each through the
  helper the live prompt used (`_vacationEndPrompt`, `_checkoutPrompt`, `_farePrompt`, `_encPrompt`).
- RESTART starts from the taxi in the current mode, keeping `G.act1Best` and `G.act1Tries` (and the Soi 6 daily
  seed). RESET, in main.js, wipes the save after a second confirmation.
- The baton (`exportBaton`, `importBaton`) is the same merge-and-sanitise, for handing a character to Second Road.

**State.** All of `G`; it owns only `G.rng` and `G.over`. The UNDO buffer and the shelf live in `localStorage`.

**Constants.** `BATON_FIELDS`, `BATON_VERSION`, `BATON_DAWN_TURNS`.

**Touches.** Every modal system: **a new gate needs a branch in `_renderResume`** and one prompt helper shared with its
live and reprompt paths. A new scalar the tick does arithmetic on belongs in `_SANE_SCALARS`; renaming a saved key
needs a migration in `deserializeGame`.

**Tests.** `tests/js/saveload.test.js`, `tests/js/modal-audit.test.js` (gates `tools/modal-audit.mjs`: every gate
redrawn on reload), `tests/js/security.test.js`, `tests/js/online.test.js` (same seed, same transcript),
`tests/js/baton.test.js`; e2e `tests/e2e/restore.spec.mjs`.

**Design docs.** `docs/macro-game.md` (the baton), `docs/2d-roadmap.md`.

<!-- facts: saveload -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `save` · `load` · `undo` · `restart`
> **Code named above, by file:** engine-core.js — `_SANE_ARRAYS`, `_SANE_SCALARS`, `_describeRoom`, `_safeMergeKey`, `_sanitizeState` · engine-encounters.js — `_encPrompt` · engine-parser.js — `_checkoutPrompt`, `_doCommandInner`, `_farePrompt`, `_renderResume`, `_vacationEndPrompt`
<!-- /facts -->

### The frontend: taps, chips, the wheel, FABs, HELP, autocomplete (`presentation`)
<!-- system: presentation -->

**What it is.** The terminal a player touches: prose with tappable words, a context chip bar, a flyout wheel, floating
buttons, autocomplete, a conversation card and layered HELP. The frontend renders and the engine decides — every list a
surface shows comes from an engine function, so a thumb, a keyboard and a future 2D frontend agree.

**How it works.**
- `decorate()` in term.js wraps names, venues, items, exits, Thai and any CAPS command inside literal parentheses.
  `{{…}}` suppresses decoration (`stripMarkup` removes it elsewhere). A name taps only once the transcript has printed
  it (`_learnNames`, `_topicKnown`).
- A tap opens `_kwActions` (quick menu; long-press for the full one); a person's actions come from `_npcActions`.
- The chip bar is `_chipSet()` — a prompt's answers, else a game's moves, else the room and the conversation — drawn by
  `_renderChips`. Autocomplete is `engineComplete` over `_COMPLETE_VERBS` and `_completePool`.
- The floating buttons (`_updateFabs`): the bell in a bar, unread messages, notes, the compass (`_navDirs`,
  `_navExtra`); on a phone they dock. `_convoCard()` names who you are talking to.
- HELP is `_doHelp`: `_helpFirstPage()` is stage-aware; HELP MORE prints `_HELP` or `_HELP_SOI6`.
- An unreadable line goes through `_parseFail`, which escalates; `_examplesDue()` tells term.js to open the card built
  by `_examples`.
- Display prefs (`_stepFontSize`, the scene fold, the notes row) live in `localStorage`. The scene panel is scene.js
  (`_sceneArt`, `_sceneNotes`).

**State.** Read-only over `G`, except `G.lastGate` (a prompt's chips, so its labels typed late read "that moment has
passed"). The parser's failure run is a module-local, deliberately not state.

**Constants.** `PARSE_FAILS_MODAL` (failures before the card).

**Touches.** Every system that offers an option: **a verb belongs on three surfaces** — parser, wheel, autocomplete —
with the rule in one engine helper. A new `G.game` type needs its chips in `_chipSet`. A name that is an ordinary word
mis-decorates; `_WORD_NAME_NPCS` in term.js is the fix.

**Tests.** `tests/js/chips.test.js`, `tests/js/term.test.js`, `tests/js/decorate.test.js`,
`tests/js/parsefail.test.js`, `tests/js/promises.test.js` (every CAPS hint parses), `tests/js/hotspots.test.js`; e2e
`touch.spec.mjs`, `chips.spec.mjs`, `examples.spec.mjs`, `rightclick.spec.mjs`.

**Design docs.** `docs/2d-roadmap.md`, `docs/2d-v0-spec.md`, `docs/voice-narration.md`.

<!-- facts: presentation -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `help` · `verbs`
> **Code named above, by file:** engine-core.js — `_convoCard`, `_learnNames`, `_topicKnown` · engine-systems.js — `_navDirs`, `_navExtra`, `_npcActions` · engine-parser.js — `_COMPLETE_VERBS`, `_HELP`, `_HELP_SOI6`, `_chipSet`, `_completePool`, `_doHelp`, `_examples`, `_examplesDue`, `_helpFirstPage`, `_parseFail` · term.js — `_WORD_NAME_NPCS`, `_kwActions`, `_renderChips`, `_updateFabs` · main.js — `_stepFontSize` · scene.js — `_sceneArt`, `_sceneNotes`
<!-- /facts -->

### World prose: room descs, revisits, lateDesc, geography, reversibility, the reads (`worldprose`)
<!-- system: worldprose -->

**What it is.** The town as text: each room's description, the brief lines on a return, the small-hours paint, close
looks at fixtures, and each district's smells and sounds. It also owns the street grid a player walks, which must be
honest about the real town and walkable both ways.

**How it works.**
- A room in `ROOMS` carries `desc`, optional `revisit` (a pool), optional `lateDesc` (a string or a pool), `reads`,
  `exits`, and flags such as `venues`, `seven`, `indoors`, `lateWithSoi6`.
- `_describeRoom(full, forceFull)` prints the full desc on a first visit or LOOK, a `_revisitPick` line on a return
  (filtered by `_roomLinesFit` so it never names an absent woman or pitches a man with company), and the late paint
  after `_lateTurn(room)`. It drops a sentence seating the woman on your arm (`_dropCompanionLines`), re-announces rain
  and darkness (`_isDarkHere`), lists items and people, and marks `G.visited`.
- EXAMINE is `_doExamine`. Fixtures resolve through `_roomRead`, which matches `_READ_NOUNS` — a `reads` key not
  registered there never fires — and `_resolveRead` picks the first open gated node; the real read sets flags, may
  place a hidden item, and logs `G.examined`. Generic furniture falls to `_SCENERY` (`_sceneryCtx`).
- SMELL and LISTEN (`_doSmell`, `_doListen`) read per-region tables with late and dead-street variants.
- `ROOM_GEO` is the survey (exact, never walked); the exits graph and `_MAP` are the walked map. `_districtHops`
  derives ride lengths from it; `_notADoor` refuses named buildings with no room behind them.

**State.** `G.visited`, `G.visitDay`, `G.revisitSaid`, `G.examined`, `G.room`.

**Constants.** `SOI6_CLOSE` (when Soi 6's late paint starts); `ROOMS` and `ROOM_GEO` are the data.

**Touches.** `darkness`, `weather`, `navigation` and `bus` (the exits graph), `filler` and `regulars` (the people
line), `media` (the Owl reads `G.examined`). A revisit line is hour-blind — it prints at any hour, so it cannot
mention sunset or warm sand.

**Tests.** `tests/js/world.test.js` (exits resolve), `tests/js/round46.test.js` (roads are reversible),
`tests/js/revisit.test.js`, `tests/js/reads.test.js`, `tests/js/references.test.js`,
`tests/js/prose-corpus.test.js`; `tools/examine-audit.mjs`, `tools/afford-audit.mjs`, `tools/prose-corpus.mjs`.

**Design docs.** `docs/prose-defects.md`, `docs/prose-review-method.md`, `docs/map-expansion.md`,
`docs/map-coverage.md`.

<!-- facts: worldprose -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `examine` · `look` · `read` · `smell` · `listen`
> **Code named above, by file:** engine-core.js — `_districtHops`, `_dropCompanionLines`, `_isDarkHere`, `_revisitPick`, `_roomLinesFit` · engine-play.js — `_lateTurn` · engine-parser.js — `_MAP`, `_READ_NOUNS`, `_SCENERY`, `_doExamine`, `_doListen`, `_doSmell`, `_notADoor`, `_resolveRead`, `_roomRead`, `_sceneryCtx`
<!-- /facts -->

### Real-world guardrails: identifiability, names, venues (`guardrails`)
<!-- system: guardrails -->

**What it is.** The rules for what the game may take from the real town. The repo is public and deploys on push, and
Thai defamation law turns on whether a person is identifiable, not whether they are named. It is a policy with a few
code residues rather than a mechanic: structure from the real town is welcome, portraits of real people are not.

**How it works.**
- The trait budget is one per real referent: name (or a derivation), trade, location, nationality, a specific real
  event. Two is a portrait. When a reader can name the referent, rewrite the traits the identification used, not only
  the name.
- The bar group is the Pattaya Leisure Group and its owner is French and behaviour-free; its rooms are the game's own
  (`_PLG_ROOMS`) and its paper names fictional nominees (`_LICENCE_NOMINEE`). The structure — a cluster that owns the
  visa firm and the law firm — is kept; real events are not.
- Outside writing follows the source-material policy: take the research, never the expression.
  `tools/source-overlap.mjs <essay-dir>` checks the prose corpus against essays kept outside the repo; the bar is zero
  pairs sharing two six-word runs.
- Two residues are deliberate: `deserializeGame` migrates the old faction key, quest ids and flags so saves survive the
  rename, and the NPC id `powers` stays because it names the portrait and every save's `G.known` (recorded with its
  reason in the ID_NOT_NAME table of tests/js/world.test.js).

**State.** None of its own; it reads `G.faction`, `G.quests` and `G.flags` only to migrate old saves.

**Constants.** `_PLG_ROOMS`, `_LICENCE_NOMINEE` (data, not tuning).

**Touches.** `orchid` and `procurement` (the group's role), `laundering` (the paper by the till), `media` (the
column's renamed title), `saveload` (the migrations). A rename should change the display name and keep the id, with a
reason in ID_NOT_NAME, or portraits and saves break.

**Tests.** `tests/js/world.test.js`, `tests/js/round58.test.js` (the founder's old register stays gone),
`tests/js/oy-hongkong.test.js` (nothing names what Oy left in Hong Kong), `tests/js/saveload.test.js`.

**Design docs.** `docs/guardrails.md`, `docs/source-material-policy.md`, `docs/factions-thai.md`,
`docs/bar-ownership-structures.md`.

<!-- facts: guardrails -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **People:** `powers`
> **Code named above, by file:** engine-core.js — `_LICENCE_NOMINEE`, `_PLG_ROOMS`
<!-- /facts -->

## Getting around and the town

How you get from one door to the next and what finds you on the way: the trucks and the bikes, the map and the dark, the dog, the weather and the season, the news, the food, the hotels, the police and the street.

### The baht bus (`bus`)
<!-- system: bus -->

**What it is.** The blue songthaew: a pickup with benches that runs fixed lines and costs ฿15 a head. It is the cheap, always-available ride home that the title is named for. The town has no transport curfew — after two the trucks go sparse, so the "last bus" is a wait at the kerb in whatever state you are in, not a locked depot.

**How it works.**
- RIDE / BUS / CATCH and WAVE call `_doRideBus` (`_doWave` prints a hail line first, then delegates). Refusals come first and cost nothing: the pier rank, a hotel room, inside a bar, a room no line serves (`_busLinesFor`), a downpour, the Soi 6 week.
- `_busLinesFor` reads `BUS_LINES` plus a room's `busStop`; the Beach Road and Second Road lines are one counter-clockwise loop (`_LOOP_CCW`), so a stop "behind" you is the long way round for the same fare.
- From `LAST_BUS_TURN` the small-hours wait runs 3–8 real `_tick`s at the kerb; an encounter or the night's end interrupts it.
- A named stop sets `G.pendingFare = {kind:"bus", price, dest}`; the fare is quoted after you hop off and paid with PAY through `_doPay`, which moves `G.room` to `dest` and runs `_maybeEncounter`. While a fare is pending, `doCommand` swallows most input and `_farePrompt` re-asks (redrawn by `_renderResume`).
- A local shuttle (`LOCAL_SHUTTLES`) offers a charter to an off-route stop at `BUS_CHARTER`; only a charter (`charter: true`) can be declined with WALK.
- RIDE THE LOOP (`_rideLoop`) is five ticks of town for the breeze, +2 สนุก once a day.
- `_lastBusWarn` (called from `_tick`) warns once a night, five turns before `LAST_BUS_TURN`.

**State.** `G.pendingFare` (modal), `G.loopDay`, `G.busCameTurn`, `G.busAskTurn`/`G.busAskStops` (a bare stop name answers the printed list), `G.busWaitTurn`, `G.lastBusWarned` (nightly). Reads `G.party` (one fare a head), `G.soc.drunk` (≥7 boards via `_BUS_DRUNK_BENCH`).

**Constants.** `BUS_FARE` (the bench fare), `BUS_CHARTER` (hiring the whole truck), `LAST_BUS_TURN` (02:00, sparse from here), `BUS_LINES` (stops per line), `LOCAL_SHUTTLES` (lines that charter).

**Touches.** `motosai` (its drunk balk points at the bench; TRAVEL's no-route answer names a ride), `weather` (rain refuses), `encounters` (arrival rolls one), `dog` (`_DOG_BUS` rides free), `hotels` (the condo tenant is told no truck goes up Pratumnak). Adding a modal gate ahead of the fare in `doCommand` without `_renderResume` leaves a reload blind.

**Tests.** tests/js/engine.test.js, playtest5.test.js, round33.test.js (charter), round34.test.js, round35.test.js, round39.test.js, round47.test.js, rulings1022.test.js; `tools/modal-audit.mjs` (gated by modal-audit.test.js) arms the fare gate.

**Design docs.** docs/map-expansion.md

<!-- facts: bus -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `ride` · `pay` · `wave`
> **Code named above, by file:** engine-core.js — `_tick` · engine-encounters.js — `_maybeEncounter` · engine-play.js — `_lastBusWarn` · engine-systems.js — `_DOG_BUS` · engine-parser.js — `_BUS_DRUNK_BENCH`, `_LOOP_CCW`, `_busLinesFor`, `_doPay`, `_doRideBus`, `_doWave`, `_farePrompt`, `_renderResume`, `_rideLoop`
<!-- /facts -->

### The motosai and the highway (`motosai`)
<!-- system: motosai -->

**What it is.** The motorbike taxi: point-to-point, paid up front, faster than the bus and the only ride that will take you anywhere at any hour — at a small-hours premium and with a real chance of an accident. The piwin is a pseudo-NPC at every stand, and crossing Sukhumvit on foot is its own roll.

**How it works.**
- MOTOSAI / MOTO / TAXI call `_doMotosai`. No stand (`room.motosai`) names the nearest one; rain refuses.
- At `G.soc.drunk` ≥ 7 the piwin balks once (`_MOTO_DRUNK_NO`, or `_MOTO_DRUNK_NO_EAST` where no bench is near); asking again within five turns (`G.motoBalkTurn`) is insistence and he goes.
- Destinations come from `MOTOSAI_DESTS` (longest key wins), "home/hotel" (to the hotel's door via `G.motoHomeDoor`), or a known bar by name (its street). A bare MOTOSAI prints the menu and arms `G.motoAsked` so the next bare place answers him.
- `_motoFare` prices it: `MOTOSAI_FAR` both ways across the highway, Bank's ฿20 rate after `helmetDelivered`, ×`LATE_MOTO_MULT` after `LAST_BUS_TURN`. The dog adds `DOG_MOTOSAI_FARE`.
- Broke (after Act One, or on the Darkside at any time): one free pity ride a night at the town fare (`G.pityRideDay`), remembered in `G.pityOwed` and settled from the next paid fare.
- `_motoCrashRisk` (drink, the hour, the Darkside, the helmet; capped) rolls `_endNight("accident")`; a near-miss telegraphs risk ≥ 5%.
- The ride takes `_districtHops` − 1 extra turns via `_passTime` with `G.offstage`/`G.motoRiding` set.
- `_footCrossing` (called by `_doGo` and TRAVEL) rolls the one foot move between `sukhumvit_crossing` and `khao_talo_strip`: a clip adds `G.hurt`, a hit is `_endNight("roadhit")`.
- `_piwinHere`/`_piwinTalk`/`_piwinBeer`/`_piwinAbout` let the stand be talked to and bought a beer.

**State.** `G.motoBalkTurn`, `G.motoAsked`, `G.motoHomeDoor`, `G.motoRides`, `G.pityRideDay`, `G.pityRides`, `G.pityOwed` (life), `G.rainOnRide`, `G.hurt`.

**Constants.** `MOTOSAI_TOWN`, `MOTOSAI_FAR` (base fares), `LATE_MOTO_MULT` (night rate), `DOG_MOTOSAI_FARE`, `MOTOSAI_DESTS`, `LONG_DISTRICTS` (arteries that cost a turn to ride through).

**Touches.** `bus` (the bench that always takes you), `navigation` (both arrival paths set `G.room` directly, so the Soi 6 fence is enforced here, not in `_arriveAt`), `dog`, `weather` (rain mid-ride is reported by `_startRain` via `G.rainOnRide`), `hotels` (home door). Any new destination path must repeat the `SOI6_ROOMS` check.

**Tests.** tests/js/accident.test.js, engine.test.js, round37.test.js (the verge, the crossing, the pity debt), playtest5.test.js, round47.test.js, round72.test.js, predicates.test.js.

**Design docs.** docs/map-expansion.md, docs/map-coverage.md

<!-- facts: motosai -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `motosai`
> **Rooms:** `sukhumvit_crossing` · `khao_talo_strip` · `sukhumvit_verge`
> **Code named above, by file:** engine-core.js — `_districtHops`, `_passTime` · engine-play.js — `_endNight`, `_motoCrashRisk`, `_piwinAbout`, `_piwinBeer`, `_piwinHere`, `_piwinTalk` · engine-systems.js — `_startRain` · engine-parser.js — `_MOTO_DRUNK_NO`, `_MOTO_DRUNK_NO_EAST`, `_arriveAt`, `_doGo`, `_doMotosai`, `_footCrossing`, `_motoFare`
<!-- /facts -->

### Navigation (`navigation`)
<!-- system: navigation -->

**What it is.** Moving through the town: compass and named exits, venue doors on a street, fast TRAVEL to places you have found, the EXITS list and the bar-mat MAP. Every way of arriving funnels through one function so door policy is enforced once.

**How it works.**
- A direction or named exit calls `_doGo`. It resolves `_DIRS` aliases or any literal exit key, answers walls from `_NO_EXIT`-family pools (hash-stable per room and direction) and returns `false` so a refused move costs no turn; `doCommand` records the refusal in `G.exitTried`. It then runs `_footCrossing`, the rain block, the condo and other-hotel doors, `_closedNow`, the lock-in OUT, Act One's key-card gate and Oy's office door before `_arriveAt` and `_longWalk`.
- `_arriveAt` is the single arrival hook: the Soi 6 fence (`SOI6_ROOMS`), the bench's shut hotel door, lapsing a pending question, the Orchid rope and Notty's, `_closedNow`, lock-in welcomes, bans (`G.soc.banned`, `BAN_TURNS`), then the room description, encounters and the rest.
- ENTER (`_doEnter`) opens a venue in the street's `venues` list; GO/ENTER with a non-adjacent name falls through to `_doTravel`.
- `_doTravel` lists `_travelDests` (visited bars, your hotel, your own bar, doors read on walked streets) and walks the BFS route (`_path`, `_hops`) one real `_tick` per step. It refuses a walk that arrives at shutters (`_closesMidnight`, `_closeTurn`) or past `NIGHT_TURNS`, stops where rain catches you, and stops at the last lit room before a dark one unless repeated within three turns (`G.travelDark`). `_notADoor` voices real buildings with no room behind them.
- `_closeTurn` is the one place that knows closing hours: a room's `closesAt`, midnight for gents' clubs and the Darkside, `SOI6_CLOSE` on Soi 6, else dawn.

**State.** `G.room`, `G.prevRoom`, `G.enteredVia` (OUT returns the way you came), `G.visited`, `G.heardOf`, `G.exitTried`, `G.travelDark`, `G.soc.banned`, `G.soc.lockIn`/`G.soc.leftLockIn` (nightly), `G.lockedInAt`.

**Constants.** `NIGHT_TURNS`, `SOI6_CLOSE`, `BAN_TURNS`, `SOI6_ROOMS`.

**Touches.** `darkness` (TRAVEL's dark stop; a dog bite moves you), `weather` (`_sheltered` decides which moves rain allows), `motosai`/`bus` (their own arrival paths), `hotels`, `encounters`. A new way to move must call `_arriveAt` or repeat its gates — the fence and `_closedNow` live there.

**Tests.** tests/js/engine.test.js, playtest5.test.js, round46.test.js (road reversibility), round52.test.js and round40.test.js (TRAVEL in the dark), round19.test.js, reachability.test.js, saveload.test.js. `node tools/gen-map.mjs --audit` checks compass bearings.

**Design docs.** docs/map-expansion.md, docs/map-coverage.md

<!-- facts: navigation -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `go` · `enter` · `travel` · `exits` · `map`
> **Soak counters:** `moved.room`
> **Code named above, by file:** engine-core.js — `_tick` · engine-play.js — `_closeTurn`, `_closedNow`, `_closesMidnight` · engine-systems.js — `_sheltered` · engine-parser.js — `_DIRS`, `_NO_EXIT`, `_arriveAt`, `_doEnter`, `_doGo`, `_doTravel`, `_footCrossing`, `_hops`, `_longWalk`, `_notADoor`, `_path`, `_travelDests`
<!-- /facts -->

### Darkness and the torch (`darkness`)
<!-- system: darkness -->

**What it is.** A handful of rooms are unlit (beaches, the Pratumnak hill road, the Sukhumvit verge, a few service alleys). Walking them blind invites soi dogs; the phone's torch keeps them off but burns battery. The torch is also social: in a bar it is noticed, and in a go-go the house assumes a camera.

**How it works.**
- `_isDarkHere` is the predicate: the room has `dark` and the torch is off or the battery is flat.
- LIGHT ON/OFF (`_doLight`) toggles `G.lightOn`; each `_tick` with the torch lit drains one point of `G.battery` and kills the torch at zero.
- The dark block at the end of `_tick` (skipped in rain and while `G.offstage`): first dark turn a growl warning; the second a bite — dropped food is thrown instead if you carry noodles or moo ping — taking up to ฿30, −2 สนุก, `G.hurt` +1, and moving you to the nearest lit exit. A third hurt ends the night (`_endNight("hurt")`). An adopted dog holds the streak at 1 and never bites.
- `_lightNotice` runs on entry and light-on: hostesses tease, a companion pockets it once, and in a go-go `_gogoLightWarn` escalates per command (warning, warning, `_kickOut`). `G.lightWarn.mark` stops one command counting twice.
- CHARGE (`_doCharge`) needs the charger item and an outlet (`outlet` or `seven` room; a bar socket wants a drink bought first), takes three ticks, and sets the battery to 100. Nont charges at his table for `NONT_CHARGE`; the condo has its own socket.
- A rough wake leaves the phone at `_CRASH_BATTERY`.

**State.** `G.battery`, `G.lightOn`, `G.lightWarn` (per-room go-go count), `G.darkStreak` (reset by any lit turn, a bus or bike arrival), `G.hurt` (nightly bite count toward 3).

**Constants.** `CHARGER_PRICE` (7-Eleven charger), `NONT_CHARGE`, `_CRASH_BATTERY` (battery after a rough wake).

**Touches.** `navigation` (TRAVEL stops before the dark; a bite relocates you), `dog` (protection), `weather` (rain pauses the dogs), `encounters` (`_maybeEncounter` never fires in the dark; the power-bank man appears at low battery), `police` (`_kickOut`). The phone's other verbs (photos, messages, the column) are battery-gated too.

**Tests.** tests/js/engine.test.js, playtest5.test.js, round37.test.js, round54.test.js, round61.test.js (the torch at a go-go door), round76.test.js, security.test.js.

**Design docs.** none

<!-- facts: darkness -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `light` · `charge`
> **Code named above, by file:** engine-core.js — `_isDarkHere`, `_tick` · engine-encounters.js — `_maybeEncounter` · engine-play.js — `_CRASH_BATTERY`, `_endNight`, `_kickOut` · engine-parser.js — `_doCharge`, `_doLight`, `_gogoLightWarn`, `_lightNotice`
<!-- /facts -->

### The soi dog (`dog`)
<!-- system: dog -->

**What it is.** A street dog the player can adopt by feeding him on a lit street. He stays for life, walks at your heel, and pays his keep in protection and small social dividends. His history surfaces once, at a dead Irish pub on the Darkside.

**How it works.**
- `_describeRoom` places him (`_dogSpot`: under the stool in an open beer bar, outside a closed venue, on a mat) and, before adoption, nudges once a night on a lit street after Act One (`G.dogNudgeDay`).
- FEED DOG (`_doFeedDog`) adopts him: noodles or moo ping from the inventory, else ฿20; sets `G.dog = {since}` and the `hasDog` flag. Refused in venues, hotel rooms and the dark.
- NAME/RENAME DOG (`_doNameDog`) stores `G.dog.name`; all dog prose is written as "Sai Krok" and re-lettered by `_dogN`/`_dogName`. `_isDogWord` is the shared answers-to test. Some names are easter eggs (`_DOG_EGGS`, `_dogEgg`) with small powers (rescue, guard, snack, loyal).
- Protection: the dark-street streak is held and never bites; the tonic shop's and curse ritual's muscle stand down; a rough wake keeps your pocket (`_endNight`); the "rescue" egg brings you home.
- Social: first arrival in an open beer bar runs `_dogBarFavor` (once per bar per night, half the time) — a staffer fusses and `_addBond` +1.
- Transport: rides the bus free (`_DOG_BUS`), needs a second bike on a motosai (`DOG_MOTOSAI_FARE`).
- `_dogShamrock` fires once on `khao_talo_strip`: the brass tag, +3 สนุก, the game's single real-world link, and `_questTick` completes the shamrock quest.
- `_soidogTick` sends the Soi Dog Foundation text the next day. PET (`_doPet`) on him is flavour only; its once-a-day point belongs to the Jomtien beach cats (`G.catDay`).

**State.** `G.dog` (`{since, name?, egg?}`, for life; cleared only by `newGame`), `G.dogNudgeDay`, `G.dogRoomSeen`, `G.dogPhakhama`, `G.soc.dogFavor`/`G.soc.dogScenesSeen` (nightly), `G.catDay`.

**Constants.** `DOG_MOTOSAI_FARE`.

**Touches.** `darkness`, `cons` (both LEAVE branches), `motosai`, `bus`, `weather` (rain reactions in `_startRain`), `food` (Tan's cart serves him). New dog prose must say "Sai Krok" so `_dogN` can rename it.

**Tests.** tests/js/dogeggs.test.js, playtest5.test.js, round44.test.js, round47.test.js, engine.test.js, term.test.js, security.test.js.

**Design docs.** none

<!-- facts: dog -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `feed` · `pet` · `rename`
> **Quests:** `shamrock`
> **Soak counters:** `dog.adopted`
> **Rooms:** `khao_talo_strip`
> **Code named above, by file:** engine-core.js — `_addBond`, `_describeRoom`, `_dogSpot` · engine-play.js — `_endNight` · engine-systems.js — `_DOG_BUS`, `_DOG_EGGS`, `_doFeedDog`, `_doNameDog`, `_doPet`, `_dogBarFavor`, `_dogEgg`, `_dogN`, `_dogName`, `_dogShamrock`, `_isDogWord`, `_questTick`, `_soidogTick`, `_startRain`
<!-- /facts -->

### Weather and season (`weather`)
<!-- system: weather -->

**What it is.** Real Pattaya weather from the baked feed, an occasional downpour that pins you where you stand, drizzle as atmosphere, and a game calendar whose season shapes the bars' trade, the regulars' attendance and the rain.

**How it works.**
- `_wxNow` reads `WX_NOW` from news-data.js; `_wxStormy`/`_wxRainy` classify it. Both are false without a bake, so a bake-less game rolls no weather dice.
- In `_tick`, after Act One and at most once a night (`G.rainDay`), from a day-stable earliest turn (`_rainEarliest`) and 30 turns after the last: a stormy sky rolls 8%, or in the wet months (`_wetSeason`) a rainy sky rolls 11%; `_startRain` sets `G.rain` to 3–8 turns and prints by room class (go-go, bar, indoors, your room, 7-Eleven, sand, street). Otherwise a rainy sky may print `_sayDrizzle` (atmosphere only).
- While `G.rain` > 0 `_doGo` only allows moves into `_sheltered` rooms (an umbrella overrides), TRAVEL refuses or stops, buses and bikes refuse, and the dark dogs shelter.
- `_underRoof` (sheltered and not a street) decides which prose a room gets; `_sheltered` is true of a street with a 7-Eleven, which is why the two differ.
- The season: `G.season0` is seeded by main.js (`_seedSeason`) from the real month; `_seasonMonth` advances one month per `SEASON_MONTH_DAYS`; `_seasonTier` gives peak / high / shoulder / low / deeplow; `_seasonTakings` multiplies bar takings by `SEASON_MULT`. `_benchOut` keeps a season-scaled share of regulars at home (never on their `days` or `_anchorNight`), `_awayForSeason` sends filler hostesses home for the harvest or to Bangkok.
- WEATHER (`_doWeather`) prints the feed and `_saySeasonNote`.

**State.** `G.rain`, `G.lastRain`, `G.rainDay`, `G.lastDrizzle`, `G.season0` (set at game creation).

**Constants.** `SEASON_MULT` (takings per month), `SEASON_MONTH_DAYS`, `SEASON_DEFAULT_M0` (November for a clockless boot), `SEASON_PARTY_BUMP` (party barfine premium), `LOW_SEASON`.

**Touches.** `navigation`, `bus`, `motosai`, `darkness`, `dog`; the bar economy and party barfine read the season. Any new weather-to-mechanics path must stay behind the bake guard, or tests and `file://` stop being deterministic.

**Tests.** tests/js/engine.test.js, playtest5.test.js, round47.test.js, round46.test.js, round35.test.js, round37.test.js, templates.test.js (the `_underRoof` lint), round22.test.js and round40.test.js (bench thinning); `tools/composition-audit.mjs` has a rain state.

**Design docs.** none

<!-- facts: weather -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `weather`
> **Code named above, by file:** engine-core.js — `_anchorNight`, `_benchOut`, `_rainEarliest`, `_tick` · engine-systems.js — `_awayForSeason`, `_doWeather`, `_sayDrizzle`, `_saySeasonNote`, `_seasonMonth`, `_seasonTakings`, `_seasonTier`, `_sheltered`, `_startRain`, `_underRoof`, `_wetSeason`, `_wxNow`, `_wxRainy`, `_wxStormy` · engine-parser.js — `_doGo` · main.js — `_seedSeason`
<!-- /facts -->

### Media (`media`)
<!-- system: media -->

**What it is.** The outside world as flavour: real headlines, exchange rates, weather, football and lottery results baked into news-data.js, read through the bar TV, the paper or your phone; plus Mort's hand-written weekly column, *Last Orders*, which carries the town's canon and the Box 15 cipher.

**How it works.**
- news-data.js defines `NEWS_FEED`, `FX_RATES`, `WX_NOW`, `FOOTY`, `LOTTO`, `GOLD` and `BTC`; accessors (`_newsFeed`, `_fxRates`, `_footy`, `_lotto`, `_gold`, `_btc`) return null or empty when a global is missing, and every verb has a canned fallback.
- TV (`_doTv`, bars and your hotel room, not go-gos) prints two headlines (`_headline`/`_sayHeadline`), the FX ticker (`_fxLine`), weather (`_wxLine`), football (`_footyLine`) and the lottery.
- READ PAPER (`_doPaper`) reads on the phone (battery-gated), from the 7-Eleven rack, or from the Queen Vic's stack; it adds gold.
- SCORES (`_doScores`) lists results and fixtures and, in a bar, names the regular's team (`_barTeam`, a hash of the room id over the bake's teams). LOTTERY (`_doLottery`) prints the last draw.
- COLUMN / OWL (`_doColumn`) assembles the issue day- and vacation-stably with `_owlPick`: a lead (`_OWL_LEADS`), a first-week primer (`_OWL_ARRIVED`), a listing, a letter and the Owl's reply (`_OWL_LETTERS`, or `_OWL_NOTICED` for a fixture you examined, or `_OWL_AMULET` once), a joke, and the fixed Box 15 classified (`_OWL_BOX15`). Sets `G.owlRead`.
- Answering the cipher ("counted the steps", in a sentence or to Mort) calls `_owlBox15Answer`: a flag and a WHO AM I line, deliberately no reward. `_mortColumnTalk` lets Mort stand behind his column's lines.

**State.** `G.owlRead`, `G.examined` (read, for the noticer letter); the `owlBox15` flag (life).

**Constants.** The baked globals above.

**Touches.** `weather` (shares `_wxLine`), `darkness` (the battery gate). Never gate game logic on headlines or rates — they change every bake. Box 15 must stay a fixed string; the CTF depends on it.

**Tests.** tests/js/news.test.js (the bake's shape and inertness), engine.test.js, round47.test.js, round38.test.js, world.test.js, decorate.test.js.

**Design docs.** docs/ctf.md

<!-- facts: media -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `tv` · `column` · `owl` · `scores` · `lottery`
> **Soak counters:** `column.read`
> **People:** `mort`
> **Code named above, by file:** engine-systems.js — `_OWL_AMULET`, `_OWL_ARRIVED`, `_OWL_BOX15`, `_OWL_LEADS`, `_OWL_LETTERS`, `_OWL_NOTICED`, `_barTeam`, `_btc`, `_doColumn`, `_doLottery`, `_doPaper`, `_doScores`, `_doTv`, `_footy`, `_footyLine`, `_fxLine`, `_fxRates`, `_gold`, `_headline`, `_lotto`, `_newsFeed`, `_owlBox15Answer`, `_owlPick`, `_sayHeadline`, `_wxLine` · engine-parser.js — `_mortColumnTalk`
<!-- /facts -->

### Food and satiety (`food`)
<!-- system: food -->

**What it is.** Hunger and thirst climb through the night and end it if they reach 100, so eating is a real part of the evening. Food comes from street stalls, the 7-Eleven, the Queen Vic's kitchen with its Sunday roast, a few venue-specific plates, and Tan's cart, where he always pays.

**How it works.**
- `_tick` adds hunger every third turn and thirst every second, prints latched warnings at 70 and 90, docks สนุก at 80, and calls `_endNight("collapse")` at 100.
- EAT (`_doEat`) handles, in order: the condo kitchen (`CONDO_MEAL`, two plates with a woman in the room), EAT WITH TAN (`_tanFood`), Mot, a plate for a companion (`_companionEats`), `_stallRefuses` (a stall names what it does not make), the end of the pot for a man on the bench, room-specific free tastes (Cherry Pop, the Sweet Tamarind, Mama Yai's), the Queen Vic (`_qvKitchen`), carried food (`_EDIBLE`), else a stall or `food` room routes to `_doBuy`.
- `FOOD_STALLS` maps a room to a plate (name, price, hunger, thirst).
- The Queen Vic: `QV_MENU` filtered by `_qvMenu` (cook leaves at 23:00, `_qvClosed`; curry night `_curryDay`; Sunday roast `_roastDay`/`_roastHour` and `_roastLeft`, which the room eats down at one cover per `ROAST_PACE` turns). `_qvCard` prints it.
- The 7-Eleven (`room.seven`) sells by `_sevenMenu`: toastie, water, beer until midnight, charger, condom.
- FOLLOW (`_doFollow`) on Tan is `_tanFood`: once a night (`G.soc.tanFedDay`), not in Act One, −55 hunger, +2 สนุก, five ticks, he pays. FOLLOW on a companion is `_partyFollow`.
- `_foodWhereTalk` answers "where can I eat".

**State.** `G.hunger`, `G.thirst` (reset at dawn, raised by the hangover), `G.warned`, `G.soc.tanFedDay` (nightly), `G.qvRoast`, `G.potDay`, `G.mamaYaiDay`, `G.cherryDay`.

**Constants.** `FOOD_STALLS`, `QV_MENU`, `ROAST_COVERS`, `ROAST_PACE`, `TOASTIE_PRICE`, `SEVEN_BEER`, `OWN_BAR_FOOD` (a plate for the bar owner), `CONDO_MEAL`.

**Touches.** `hotels` (room water warnings), `dog` (fed at Tan's cart), the condo and bench in the expat stage. A stall's prose that names a dish must be buyable — routing and availability are separate questions.

**Tests.** tests/js/queenvic.test.js, round23.test.js, playtest5.test.js, engine.test.js, sweep.test.js, round53.test.js, round37.test.js, round78.test.js; `tools/afford-audit.mjs` (gated in promises.test.js) buys what room prose offers.

**Design docs.** docs/economy-review.md

<!-- facts: food -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `eat` · `buy` · `follow`
> **People:** `aoy` · `tan`
> **Rooms:** `queen_vic` · `mikes_mall`
> **Code named above, by file:** engine-core.js — `_tick` · engine-play.js — `_curryDay`, `_endNight`, `_roastDay`, `_roastHour` · engine-systems.js — `_EDIBLE`, `_companionEats`, `_doEat`, `_qvCard`, `_qvClosed`, `_qvKitchen`, `_qvMenu`, `_roastLeft`, `_stallRefuses` · engine-parser.js — `_doBuy`, `_doFollow`, `_foodWhereTalk`, `_partyFollow`, `_sevenMenu`, `_tanFood`
<!-- /facts -->

### Hotels (`hotels`)
<!-- system: hotels -->

**What it is.** Where you sleep, wake and respawn. After Act One you can move between four hotels, each with a nightly folio and one perk. Rent is charged each morning; a man who cannot pay steps down the ladder toward the cheapest and then onto a capped book at the desk.

**How it works.**
- `_HOTELS` lists sabai, queenvic, areca, metropole and the condo, each with `room`, `rate` and `expatRate`; `_hotelRate` picks by stage. `_hotelRoomId` is your room; `_isHotelRoom` tests any guest room.
- CHECKOUT (`_doCheckout`) runs in your own room before 19:00 with any book settled; it sets `G.pendingChoice = "checkout"` and lists the others (monthly entries excluded). The answer is matched by name in `doCommand`, moves `G.hotel`/`G.room` and prints `_HOTEL_ARRIVALS`; STAY cancels. `_checkoutPrompt` redraws it.
- `_chargeRent` at the wake (from `_endNight`): settles an old book if it can, then pays from the pocket, then the account, then steps down `_HOTEL_DOWNGRADE` (not on the Soi 6 week), then adds the rate to `G.hotelDebt` up to `_DEBT_CAP`, −1 สนุก. It skips the condo, a woman's mat and a prepaid night, and marks `G.roofless` on the bench.
- `_joinerFee` charges `JOINER_FEE` once a night at the Sabai for any woman who goes up (onto the book if you are broke). The condo instead gets a morning word from the office.
- Perks: the Sabai takes a point off the hangover; the Queen Vic's balcony (BALCONY / WATCH SOI, `_doWatchSoi`) pays once a night through `_soiSpectateHappy`; pool hotels pay SWIM (`_doSwim`) once a day.
- `_doGo` refuses another hotel's rooms; Act One's key card blocks the Sabai room until the wallet is back. A book of ฿800+ is settled once by Bert or Candy (`tabSettled`).

**State.** `G.hotel`, `G.hotelDebt`, `G.joinerDay`, `G.joinerPaid`, `G.poolDay`, `G.blueDogDay` (shared spectator point), `G.roomPrepaid`, `G.checkoutNight`, `G.roofless`.

**Constants.** `JOINER_FEE`, `_DEBT_CAP`, `_HOTEL_DOWNGRADE` (both in engine-core.js).

**Touches.** `navigation` (hotel doors, TRAVEL HOME), `darkness` (the Sabai's dark soi), `food` (the room's water), the expat month (`G.month.rent`) and destitution. Every hotel perk is gated on act1Done and stage — keep new ones consistent.

**Tests.** tests/js/engine.test.js, playtest5.test.js, round72.test.js (the joiner fee on the book), round19.test.js, sweep.test.js, condo.test.js, round104.test.js; `tools/modal-audit.mjs` arms the checkout gate.

**Design docs.** docs/economy-review.md

<!-- facts: hotels -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `checkout` · `swim` · `balcony`
> **Prompts (`G.pendingChoice` and the like):** `checkout`
> **Rooms:** `hotel_room` · `qv_room` · `areca_room` · `metropole_room`
> **Code named above, by file:** engine-core.js — `_DEBT_CAP`, `_HOTELS`, `_HOTEL_DOWNGRADE`, `_chargeRent`, `_hotelRate`, `_hotelRoomId`, `_isHotelRoom` · engine-play.js — `_endNight`, `_joinerFee` · engine-systems.js — `_doWatchSoi`, `_soiSpectateHappy` · engine-parser.js — `_HOTEL_ARRIVALS`, `_checkoutPrompt`, `_doCheckout`, `_doGo`, `_doSwim`
<!-- /facts -->

### Police, heat and reputation (`police`)
<!-- system: police -->

**What it is.** Three ways the town reacts to how you behave. A drunk man on a lit street gets stopped by a policeman wanting a fine; a man who misbehaves in a bar builds heat until security walks him out; and a town-wide reputation drifts slowly up with good deeds and drops fast on incidents.

**How it works.**
- The police stop is armed in `_maybeEncounter` at `G.soc.drunk` ≥ 5, 30 turns after the last (`G.lastPolice`), 20% a lit-street arrival; the "guard" dog egg wards it off. It is the `police` resolver in `_ENC`: a wai or sorry pays `POLICE_WAI`, PAY pays `POLICE_PAY`, an argument `POLICE_ARGUE`; a soft "no" is warned once; an adjacent mamasan you treated may rescue you; fines are booked to `G.policePaid` for the morning ledger. `G.policeAt` records where it happened.
- Heat: `_addHeat` raises `G.soc.heat[room]`, records `G.soc.heatWhy`, warns at 1 and 2, and at 3 calls `_kickOut`. Three bell rings and your own bar ignore it. `_doApologize` takes a point off once per bar per night.
- `_kickOut` bans the room (`G.soc.banned`, for `BAN_TURNS`; all of Tree Town or LK Metro at once), costs −5 สนุก and `_repHit(3)`, runs `_maiDeeScene` (a bonded woman watching sours for good) and puts you on the street.
- Reputation: `_repGain` (+1 a day at most, via `G.repDay`), `_repHit(n)` (uncapped), clamped to `REP_MIN`/`REP_MAX`; `_repTier` maps to −2..+2 and `_REP_LABELS`. It biases `_favor` for strangers, greets you at a new bar at the extreme tiers (`_repArrival`) and is read by STANDING / REP (`_doRep`). Only after Act One; reset by a new vacation, kept into the expat stage.
- SCORE (`_doScore`) is the status readout beside it.

**State.** `G.lastPolice`, `G.policeAt`, `G.policePaid`, `G.soc.heat`/`G.soc.heatWhy`/`G.soc.banned` (nightly), `G.rep`, `G.repDay`, `G.kickedTonight`.

**Constants.** `POLICE_WAI`, `POLICE_PAY`, `POLICE_ARGUE`, `BAN_TURNS`, `REP_MIN`, `REP_MAX`.

**Touches.** `darkness` (the go-go torch kicks you out), `navigation` (bans gate arrival), `encounters` (the stop is an encounter), `cons` (REPORT at the station), the barfine and bond systems via `_maiDeeScene`. A new incident should call `_repHit`, which also feeds the CCIB lay-low counter.

**Tests.** tests/js/engine.test.js, mgrfloor.test.js, research.test.js (face-loss), round73.test.js (the Thai no), playtest5.test.js, conversation.test.js, rulings1022.test.js; `tools/modal-audit.mjs` arms the police gate and `tools/money-audit.mjs` reconciles the fines.

**Design docs.** docs/factions-thai.md

<!-- facts: police -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `standing` · `score`
> **Soak counters:** `reputation.moved`
> **Code named above, by file:** engine-core.js — `_REP_LABELS`, `_repGain`, `_repHit`, `_repTier` · engine-encounters.js — `_ENC`, `_maybeEncounter` · engine-play.js — `_addHeat`, `_doApologize`, `_favor`, `_kickOut`, `_maiDeeScene`, `_repArrival` · engine-parser.js — `_doRep`, `_doScore`
<!-- /facts -->

### Street encounters (`encounters`)
<!-- system: encounters -->

**What it is.** Unscripted people who find you on the street: freelancers, lost tourists, a drunk Brit, a katoey pickpocket, the noodle girl, the booking app, joggers and influencers. Some are a quick vignette; most put a question to you and read your next command as the answer. Many are deliberately non-transactional — money is the wrong verb.

**How it works.**
- `ENCOUNTERS` (world.js) holds each scene: `rooms`, `intro` (a string or a pool), `interactive`, `hint`, optional Thai, `solo` (never fired while a companion is on your arm) and `nightly` (restocked each night by `_endNight`; the rest fire once per game via `G.encDone`).
- `_maybeEncounter` runs on arrival (from `_doPay`, `_doMotosai`, the room hooks): not in the dark, a bar or a lock-in; first the police check; then, after `ENC_COOLDOWN` turns, picks among eligible encounters (with per-encounter gates: the power bank at low battery, the booking app after 01:00 every three nights and never to a man who only refuses, the club pickup only fresh out of a club) and rolls `ENC_CHANCE`, ×1.5 near a band.
- `_startEnc` marks it done, filters sea-wall intros off streets with no sea, and for an interactive one sets `G.pendingEnc` and prints through `_encPrompt`, which stashes the lines in `G.encPrompt` for `_renderEncounter` to redraw on reload.
- In `doCommand`, a pending encounter takes the next command as its reaction via `_ENC[id]`. Observation verbs redraw it instead. For soft pitches (`_ENC_SOFT`) a real command that is not an answer counts as a no and then runs. A resolver may return `"passthrough"` (run the command too) or `"hold"` (run it, keep the question).

**State.** `G.pendingEnc`, `G.encPrompt`, `G.encDone`, `G.lastEnc`, `G.bookingDay`; individual resolvers keep their own fields.

**Constants.** `ENC_COOLDOWN`, `ENC_CHANCE`, `BFHOP_TURNS` (a bar-hop step's length), `ENCOUNTERS`.

**Touches.** `police` and `cons` share the machinery, `darkness` (no encounters in the dark), `navigation`, `hotels` (`_joinerFee` when a woman comes up), the companion system (`solo`). Any new prompt that leaves `G.pendingEnc` set must go through `_encPrompt`, and a soft pitch needs an `_ENC_SOFT` entry or it will eat unrelated commands.

**Tests.** tests/js/engine.test.js, playtest5.test.js, conversation.test.js, round35.test.js, round47.test.js, round37.test.js; `tools/modal-audit.mjs` (modal-audit.test.js) arms every interactive encounter and types non-answers at it, and `tools/composition-audit.mjs` checks them against other live states.

**Design docs.** docs/economy-review.md

<!-- facts: encounters -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Encounters:** `katoey` · `bargirl` · `brit` · `powerbank` · `freelancer` · `noodle` · `coconutbar` · `seawall` · `bkktourist` · `jptourist` · `britles` · `punterwife` · `pingpong` · `booking` · and 7 more
> **Code named above, by file:** engine-encounters.js — `_encPrompt`, `_maybeEncounter`, `_renderEncounter`, `_startEnc` · engine-play.js — `_endNight`, `_joinerFee` · engine-parser.js — `_ENC_SOFT`, `_doMotosai`, `_doPay`
<!-- /facts -->

### The cons and REPORT (`cons`)
<!-- system: cons -->

**What it is.** Two Beach Road street cons built as two-step encounters: the friendly hair-tonic man whose ฿99 bottle leads to a side-soi shop, and the robed fortune-teller whose ฿199 palm reading leads to a four-figure "cleansing". Asking the price straight closes either before the sting; whatever the second step takes can be partly recovered at the police station.

**How it works.**
- Both are `ENCOUNTERS` entries resolved by `_ENC.tonic` and `_ENC.fortune`.
- Tonic, first step: TAO RAI / HOW MUCH pays `TONIC_PRICE` for one honest bottle; YES buys the street bottle; a direction or a travel command walks past him; FOLLOW / SHOP sets the `tonicShop` flag, re-arms `G.pendingEnc` and prompts. Second step `_tonicShop`: PAY takes `TONIC_FLEECE`; LEAVE is a 50/50 — a ฿500 face-saving bottle (not recoverable) or `TONIC_SHAKEDOWN`. A broke mark is shoved out with a sample.
- Fortune, first step: TAO RAI pays `FORTUNE_READ` and ends it; READ / YES pays the same, sets `curseRitual`, and prompts for the ritual. Second step `_curseRitual`: PAY takes `FORTUNE_RITUAL`; LEAVE is a 50/50 between walking clean and `FORTUNE_MERIT`.
- What the fleecing branches take is added to `G.tonicOwed` / `G.curseOwed`. The dog voids the muscle in both LEAVE branches; a companion's "up to you" is printed at the intro (`_COMPANION_TELL`) and again as you pay.
- REPORT / FILE (`_doReport`) away from `police_station` points you there; at the desk with nothing owed it answers by what you name (police, merit, a pickpocket) and recovers nothing; with something owed it returns the total less `TONIC_POLICE_CUT`, clears both, +1 สนุก.

**State.** `G.tonicOwed`, `G.curseOwed` (carried until reported), the `tonicShop` and `curseRitual` step flags, `G.itemLoc` (hair tonic, red string, lucky number).

**Constants.** `TONIC_PRICE`, `TONIC_FLEECE`, `TONIC_SHAKEDOWN`, `FORTUNE_READ`, `FORTUNE_RITUAL`, `FORTUNE_MERIT`, `TONIC_POLICE_CUT`.

**Touches.** `encounters` (the gate and soft-pitch rules), `dog`, `police` (the station). Only the branches that add to the owed totals are recoverable — a new fleecing branch must add to one of them or REPORT will not see it.

**Tests.** tests/js/engine.test.js, round59.test.js (the desk by claim, the string on you), towntalk.test.js, predicates.test.js; `tools/modal-audit.mjs` arms the shop and the ritual (`enc:tonicshop`, `enc:curse`).

**Design docs.** docs/economy-review.md

<!-- facts: cons -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `report`
> **Encounters:** `tonic` · `fortune`
> **Soak counters:** `scam.reported`
> **Rooms:** `police_station`
> **Code named above, by file:** engine-encounters.js — `_COMPANION_TELL`, `_curseRitual`, `_tonicShop` · engine-parser.js — `_doReport`
<!-- /facts -->

## The bars and the women

The rail, the drinks and the seat, the women's money and the bond it builds, the barfine and the nights it buys, the carts, the massage shops and the clinic, the games on the bar and the town's calendar.

### Drinks and the seat (`drinks`)
<!-- system: drinks -->

**What it is.** The player's own drinks in a bar — BEER, WATER, a soda — and the price list (TAO RAI, HAGGLE). The rule it
encodes is that in a bar you pay for the seat, not the bottle: water and every soft drink cost what the beer costs, the
price rises with the venue class, and a seat held too long without buying gets a hostess at your elbow.

**How it works.**
- `_doBuy` routes BUY/DRINK/ORDER. The beer branch charges `_beerPrice()`, bumps `G.soc.drunk`, counts
  `G.soc.selfDrinks[room]` and prints the price on the line that charges it (`_BEER_LINES`, `_BEER_PAST`). Water and
  sodas cost `_beerPrice()` wherever `_servesDrinks()` is true; a shop sells the bottle.
- Prices: `_drinkMult(room)` reads `DRINK_MULT` by `barType` or a room's `drinks` class, times the owner's board
  (`_barMarkup`); `_beerPrice` rounds to ฿10 and applies a room's `beerOff`; `_ladyPrice` uses the same multiplier.
  Every quote and every charge reads the helpers, never the constants.
- `_servesDrinks` gates drinks (the cabaret has `drinks:` but no `barType`); `_inBar` gates the bar-girl apparatus. At
  your own bar `_ownStock` charges wholesale to the till.
- `_doTaoRai` prints the venue's board (a bar, a soapy, a massage shop, a stall, a 7-Eleven, a bike stand). HAGGLE and
  "why so expensive" in a bar answer from `_SEAT_LINES`.
- The house's patience: `_tick` resets `G.soc.spentTurn[room]` when money moves; `_nursed` compares it with
  `HOUSE_PATIENCE` (plus two turns per chit, `_chitsHere`) and `_sayNursed` sends a hostess over; WAIT stops there.
- Comps go through `_compDrink` (a `_pushyBar` pours heavy, then `_pushyUpsell`). `_tick` sobers a unit every 20 turns
  (`G.soc.soberNext`); `_checkDrunk` ends the night at a blackout.

**State.** `G.soc.drunk`, `G.soc.selfDrinks`, `G.soc.spentTurn`, `G.soc.soberNext` (all nightly), `G.boardWon`,
`G.bar.ownStock` (owner only).

**Constants.** `BEER_PRICE` (the base big Chang), `LADY_DRINK`, `DRINK_MULT` (per venue class), `HOUSE_PATIENCE` (turns a
seat is free, go-go and bar), `SEVEN_BEER` (the 7-Eleven's Chang).

**Touches.** `ladydrinks` (shares `_drinkMult`), `bell` (priced per head from both prices), `barfine` (the midnight rule
reads `G.soc.selfDrinks`), the owner's bar books (`_ownStock`, `_barMarkup`). A price typed into prose instead of read from
a helper is the classic break: the quote and the till disagree.

**Tests.** `engine.test.js`, `round37.test.js`, `round53.test.js`, `round93.test.js`, `comped.test.js`, `research.test.js`;
`tools/afford-audit.mjs` (gated in `promises.test.js`) and `tools/money-audit.mjs` (`money-audit.test.js`).

**Design docs.** `docs/economy-review.md`, `docs/bar-failure-cycle.md` (the owner's price board).

<!-- facts: drinks -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `buy` · `tao` · `haggle`
> **Soak counters:** `beer.bought`
> **Code named above, by file:** engine-core.js — `_beerPrice`, `_drinkMult`, `_ladyPrice`, `_tick` · engine-play.js — `_checkDrunk`, `_compDrink`, `_inBar`, `_pushyBar`, `_pushyUpsell`, `_servesDrinks` · engine-systems.js — `_barMarkup` · engine-parser.js — `_BEER_LINES`, `_BEER_PAST`, `_SEAT_LINES`, `_chitsHere`, `_doBuy`, `_doTaoRai`, `_nursed`, `_ownStock`, `_sayNursed`
<!-- /facts -->

### Lady drinks, tips and the bond (`ladydrinks`)
<!-- system: ladydrinks -->

**What it is.** Buying a working woman a drink, tipping her, and getting her number — and the relationship that builds
from it. Attention of every kind accumulates into one bond per woman, read as four tiers (stranger, face, regular, her
farang), and each tier unlocks warmer recognition, deeper dialogue and, at the top, a waived barfine. The design point is
depth over breadth: money can warm a woman only so far in a night; time does the rest.

**How it works.**
- BUY DRINK FOR <her> runs the lady-drink branch of `_doBuy`: `_ladyDrinkCharge` takes `_ladyPrice()` (into your own
  till at your own bar), marks her met, opens the conversation and arms `G.soc.roundFor` (a drink buys one telling in
  full). Bond moves through `_boughtBond`, capped at `BOND_NIGHT_CAP` a night; สนุก through `_boughtHappy`.
- `_addBond` is the one writer of `G.soc.drinks`; `_bondTier` reads it (3/7/13), capped at a face by `_maiDee`.
  `_knownTier` is the highest tier she ever reached (`G.prevBond`, `G.everBond`) and is what her dialogue gates on.
- `_endNight` cools every bond by one (every third night for a resident) and gives a notch to the women of the bar you sat
  in longest (`G.soc.barTurns`). `_newVacation` carries her-farang back as a regular and a regular back as a face.
- TALK then calls `_otherLedger`: the lowest unseen tier of `_OTHER_LEDGER` (her cut, the cost of you, the arithmetic of
  a life), once per woman per tier, drawn through `_ledgerPick`'s town-wide book. Doctrine: it pays nothing.
- `_relGreeting` greets by tier; `_bondTalk` deals `_BOND_TALK` via `_bondPick`. TIP (`_doTip`) of ฿100+ counts as
  warmth; CONTACT (`_doContact`) swaps numbers at `_favor` 2+.

**State.** `G.soc.drinks` (per vacation), `G.soc.bondNight`, `G.soc.drinkCount`, `G.soc.drinkNight`, `G.soc.roundFor`,
`G.soc.mamaWarm` (nightly); `G.soc.ledger`, `G.soc.ledgerHeard`, `G.soc.bondSaid`, `G.soc.bondHeard` (kept across trips),
`G.ledgerSeen`, `G.prevBond`, `G.everBond`, `G.maiDee` (for life), `G.phone.contacts`.

**Constants.** `LADY_DRINK` (the base price), `BOND_NIGHT_CAP` (bought bond a night), `LADY_CUT`, `BAR_QUOTA`,
`BAR_SALARY`, `HOME_SEND` (the figures the ledger quotes).

**Touches.** `barfine` (tier gates the waiver, `_favor` gates the ask, `G.soc.drinkCount` is Soi 6's one-drink rule),
`social` (`_favor` starts from the bond), the phone's texts (bond-weighted senders). Anything that should be earned rather
than bought must use `_addBond`, never `_boughtBond`.

**Tests.** `engine.test.js`, `research.test.js`, `round35.test.js`, `round47.test.js`, `round62.test.js`, `round86.test.js`,
`predicates.test.js`; `tools/chorus-audit.mjs` (`chorus-audit.test.js`) for the town-wide books, `tools/memory-audit.mjs`.

**Design docs.** `docs/economy-review.md`, `docs/essay-ledger.md`.

<!-- facts: ladydrinks -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `buy` · `tip` · `contact`
> **Soak counters:** `bond.built` · `bond.regular.tier`
> **Code named above, by file:** engine-core.js — `_addBond`, `_ladyPrice` · engine-play.js — `_BOND_TALK`, `_OTHER_LEDGER`, `_bondPick`, `_bondTalk`, `_bondTier`, `_boughtBond`, `_boughtHappy`, `_endNight`, `_favor`, `_knownTier`, `_ledgerPick`, `_maiDee`, `_newVacation`, `_otherLedger`, `_relGreeting` · engine-systems.js — `_doContact` · engine-parser.js — `_doBuy`, `_doTip`, `_ladyDrinkCharge`
<!-- /facts -->

### Flirting, heat and the room's favour (`social`)
<!-- system: social -->

**What it is.** The physical-social verbs in a bar — FLIRT and KISS publicly, with SPANK and FONDLE still parsed but
unadvertised — resolved against how much the woman (and the room) likes you. Misbehaviour builds heat; three heat and
security walks you out. THROW COVER and BUY BRA are small bar comedies on the same machinery.

**How it works.**
- `_doSocial(kind, target)` resolves the woman (`_resolveActor`), refuses animals, regulars, the Orchid Room and your own
  staff, then computes `_favor(id) - SEV[kind]` plus a bra bump and `_persSocialMod`, into five outcome tiers of
  `_SOCIAL_TEXT`. Tier 0 adds heat and costs สนุก; tier 3+ sets `G.soc.charmed` and pays through `_charmHappy` once per
  woman per night, and may trigger `_maybeSelfBarfine`.
- A second FLIRT on a woman already charmed tonight silently resolves as KISS; repeated pressure after a no counts in
  `G.soc.tries`, cools the bond and eventually adds heat.
- `_favor(id)` is the bond plus the room: the mamasan's treat, a lock-in (+3), the gents' club's +6 after one drink, the
  bell level (`_bellLevel`: +2/+4/+10), a wing-woman (`_wingman`), the town's reputation for strangers (`_repTier`), and
  a notch off on a floor that gave a verdict.
- `_addHeat(n, why)` is skipped at three bells and at your own bar; heat 3 calls `_kickOut`, which bans the room
  (complex-wide in Tree Town and LK Metro), costs สนุก and rep, and runs `_maiDeeScene` on the bonded women watching.
- Roles cap contact: cashiers and mamasans refuse SEV 4+ below two bells (`NPC_ROLES`).
- `_doThrowCover` rolls where the cover lands; BUY BRA sets `G.soc.bra` (`BRA_PRICE`) for a warmer FONDLE.

**State.** `G.soc.heat`, `G.soc.heatWhy`, `G.soc.banned`, `G.soc.charmed`, `G.soc.tries`, `G.soc.bra` (nightly),
`G.kickedTonight`, `G.maiDee`, `G.maiDeeBar` (for life), `G.wingmanUntil`.

**Constants.** `SEV` (each verb's severity), `BELL_GLOW` (turns a bell warms the room), `BAN_TURNS` (a ban's length),
`BRA_PRICE`.

**Touches.** `bell` (`_bellLevel` feeds `_favor` and the amnesty), `barfine` (heat shuts the book; `_favor` gates it),
`ladydrinks` (the bond is `_favor`'s base). `_favor` is read by CONTACT and the barfine gate, so a new bonus there moves
both.

**Tests.** `engine.test.js`, `conversation.test.js`, `playtest5.test.js`, `research.test.js`, `round61.test.js`,
`round67.test.js`, `predicates.test.js`; `tools/happiness-audit.mjs` (`happiness-audit.test.js`) holds the charm payout.

**Design docs.** none.

<!-- facts: social -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `flirt` · `kiss`
> **Soak counters:** `social.spark`
> **Code named above, by file:** engine-core.js — `_repTier`, `_resolveActor` · engine-play.js — `_SOCIAL_TEXT`, `_bellLevel`, `_charmHappy`, `_doThrowCover`, `_favor`, `_kickOut`, `_maiDeeScene`, `_persSocialMod`, `_wingman` · engine-systems.js — `_maybeSelfBarfine`
<!-- /facts -->

### The bell and the lock-in (`bell`)
<!-- system: bell -->

**What it is.** RING BELL buys a round for the whole room, which is priced per head and warms everyone in it for a while;
three bells and the room is yours. On the Darkside, a bar where you have spent freely bolts the door at midnight instead
of closing — the lock-in — and the party runs as long as the money does.

**How it works.**
- `_doBell` refuses outside a bar (Notty's brass bell on Naklua Road is the exception), charges `_bellPrice(room)` and
  calls `_ringBell`, which bumps `G.soc.bells[room]` (restarting the count if the last glow had cooled), stamps
  `G.soc.bellAt`, clears heat and a miffed regular, and counts as a good deed (`_repGain`). Prose comes from a
  venue-class pool (`_BELL_SOI6`, `_BELL_GOGO`, the beer and pub pools); a beer bar's bell hands you a drink back
  (`_compDrink`). สนุก goes through `_boughtHappy`, and the sound through `_engineSfx`.
- `_bellPrice` is `_bellHeads(room)` — every working woman a lady drink, every man a beer, plus an anonymous crowd by a pure
  hash of room, day and hour — floored at `BELL_PRICE`. Pure, so quoting it rolls no dice.
- `_bellActive` and `_bellLevel` read the glow; `_favor` and `_addHeat` read the level.
- Lock-in: `_closingTick` at a `lockIn` Darkside bar where `_barSpendTonight` is true calls `_lockInBegin` instead of
  shutting. `_lockInTick` runs the night — a walk-out after two 15-turn spells with no money moving, a dare
  (`_lockInDare`), vignettes, the coda near dawn. OUT is one-way. `_lockInWelcome` greets a face the door remembers.
- The streamed bars' remote bell is `_streamBell`, a separate system.

**State.** `G.soc.bells`, `G.soc.bellAt`, `G.soc.lockIn`, `G.soc.lockInAt`, `G.soc.lockInCheck`, `G.soc.leftLockIn`
(nightly), `G.lockedInAt` (for life).

**Constants.** `BELL_PRICE` (the floor: an empty bar's round), `BELL_GLOW`.

**Touches.** `social` (bell level in `_favor`, the heat amnesty), `drinks` (`_bellHeads` prices from `_ladyPrice` and
`_beerPrice`), `saleng` (no cart past a bolted door). The per-head price moves with the cast, so adding people to a room
moves its bell.

**Tests.** `engine.test.js`, `comped.test.js`, `round53.test.js`, `round78.test.js`, `round86.test.js`, `stream.test.js`,
`soi6-minors.test.js`.

**Design docs.** `docs/economy-review.md`.

<!-- facts: bell -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `ring`
> **Soak counters:** `bell.rung`
> **Rooms:** `night_heron` · `khao_talo_bar`
> **Code named above, by file:** engine-core.js — `_beerPrice`, `_bellHeads`, `_bellPrice`, `_engineSfx`, `_ladyPrice`, `_repGain` · engine-play.js — `_BELL_GOGO`, `_BELL_SOI6`, `_addHeat`, `_barSpendTonight`, `_bellActive`, `_bellLevel`, `_boughtHappy`, `_closingTick`, `_compDrink`, `_doBell`, `_favor`, `_lockInBegin`, `_lockInDare`, `_lockInTick`, `_lockInWelcome`, `_ringBell` · engine-systems.js — `_streamBell`
<!-- /facts -->

### The barfine (`barfine`)
<!-- system: barfine -->

**What it is.** Paying to take a woman out of her bar: SHORT TIME (one round, the night goes on), LONG TIME (the night ends
with her) or TAKE HER OUT (see `party`). The quote bundles two fees — the bar's fine and her own money — and before any
number comes the truth of her day: she may be held as the bar's draw, kept by a sponsor in town, busy, at the temple
tomorrow, or drinks-only. Some women run a game on a stranger; COMPLAIN takes it to the mamasan.

**How it works.**
- `_doBarfine` refuses the impossible first (your own staff, the girl on your arm, a manager's own floor, a mamasan,
  the Orchid Room, a massage shop), then the day-level refusals (`_isDraw` before midnight, `_sponsorInTown`, `_girlBusy`,
  `_bfDayRefusal`), the Soi 6 one-drink rule, the favour gate (`_favor` against 4), `_bfRefusal`, and mama's
  midnight drink-each rule. Then `_barfinePrices` sets `G.pendingBf` and `_bfPrompt` asks.
- `_barfinePrice` is the bar's fee by class (`BF_BEER`, `BF_SOI6`, `BF_GOGO`, `BF_GENTS`), ×1.5 early, ×0.75 late, zero at
  a beer bar after midnight unless she is a `POPULAR_GIRLS` draw. `_barfinePrices` adds long time by class and, when the
  fine is zero, quotes her money alone (`LADY_ST`, `LADY_LT`).
- The modal (`G.pendingBf`) is answered in `_doCommandInner`: SHORT TIME, LONG TIME (asked twice, `_bfLtWarn`), TAKE HER
  OUT, NO, or a bare PAY (the open contract). `_bfResolve` pays (`_stPaid`, `_ltPaid`); at her-farang tier while
  `_careOk` she squares the fine and the gate asks for her time (`G.pendingBf.herPay`, `_bfHerPayPrompt`: PAY HER, DON'T
  PAY, NO) — unpaid, `_careUnpaid` cools her, refuses the next ask (`_CARE_REFUSE`) and after `CARE_UNPAID_COLD` sets the
  cold that `_careSent` lifts. It rolls `_bfScamRoll` for an exploitable woman (`_bfExploitable`), may offer the `nightride`, or ends the night
  with `_endNight("barfine")`. Sex pays through `_conquestHappy`, the jading treadmill; condoms through `_stdBarfineRoll`.
- An incident sets `G.bfIncident`; `_doComplain` at her bar refunds with the mamasan present.
- `_maybeGoWithYou` and `_maybeSelfBarfine` let her open the subject herself.

**State.** `G.pendingBf` (the modal), `G.soc.bfBar`, `G.soc.bfRefused`, `G.soc.bfNight` (nightly), `G.bfIncident`,
`G.bfStrikes`, `G.lastBfId`, `G.lastBfBase`, `G.jaded`, `G.wentWith`, `G.care`.

**Constants.** `BF_BEER`, `BF_SOI6`, `BF_GOGO`, `BF_GENTS` (the bar's fine), `LADY_ST`, `LADY_LT` (her money),
`POPULAR_GIRLS`, `SPONSOR_FLIP`, `CARE_UNPAID_COLD`, `CARE_DAYS`, `MOTEL_ROOM`, `JOINER_FEE`.

**Touches.** `ladydrinks` (tiers, `G.soc.drinkCount`), `social` (heat and `_favor`), `party`, `nightride`, `clinic`
(`G.std`), the hotel's joiner fee (`_joinerFee`). A new refusal must go in both `_bfRefusal` and `_bfDayPeek`, or her talk
and the verb disagree.

**Tests.** `engine.test.js`, `research.test.js`, `round109.test.js`, `round35.test.js`, `round78.test.js`, `round93.test.js`,
`rulings1022.test.js`, `saveload.test.js`, `chips.test.js`; `tools/offer-audit.mjs` (`offer-audit.test.js`),
`tools/modal-audit.mjs`, `tools/memory-audit.mjs`.

**Design docs.** `docs/economy-review.md`, `docs/essay-ledger.md`.

<!-- facts: barfine -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `barfine` · `complain`
> **People:** `somchith`
> **Rooms:** `short_time_motel`
> **Code named above, by file:** engine-play.js — `_conquestHappy`, `_endNight`, `_favor`, `_joinerFee`, `_stdBarfineRoll` · engine-systems.js — `_CARE_REFUSE`, `_barfinePrice`, `_barfinePrices`, `_bfDayPeek`, `_bfDayRefusal`, `_bfExploitable`, `_bfHerPayPrompt`, `_bfLtWarn`, `_bfPrompt`, `_bfRefusal`, `_bfResolve`, `_bfScamRoll`, `_careOk`, `_careSent`, `_careUnpaid`, `_doBarfine`, `_doComplain`, `_isDraw`, `_ltPaid`, `_maybeGoWithYou`, `_maybeSelfBarfine`, `_sponsorInTown`, `_stPaid` · engine-parser.js — `_doCommandInner`, `_girlBusy`
<!-- /facts -->

### Taking her out (`party`)
<!-- system: party -->

**What it is.** The third answer to the barfine: she (or two of them) comes with you and the night continues as a crawl.
It is priced as her whole earning night, so below regular tier it is a hard sell; above it, it is the plain long-time fine
or free. Each new bar you walk into with her pays a little company, and the night ends in your bed, at dawn, with her
taking you home when you collapse, or with GOODBYE.

**How it works.**
- TAKE <her> OUT (`_takeOut`) routes through `_doBarfine` to `_bfResolve("party")`, which charges the party price and
  builds `G.party = {ids, stops, spent, seen}` (a second woman joins up to `PARTY_MAX_GIRLS`).
- `_partyPrice(id, lt)` returns the long-time fine at regular tier and above, else the fine times `PARTY_MULT_STRANGER` or
  `PARTY_MULT_FACE` plus `SEASON_PARTY_BUMP`.
- `_arriveAt` calls `_partyArrive(to)`: at each new drinking venue her lady drink is charged (into your own till at your
  own bar), bond through `_boughtBond`, and +1 สนุก up to `PARTY_STOP_CAP`; `_partyRival` lets the woman whose bar it is
  notice who you brought.
- `_endNight`: SLEEP with company becomes the long-time close (`G.lastBfBase` from the stops); `_partyNightEnd` handles
  dawn (a goodbye, +2 bond), and blackout or collapse (the companion rescue, `PARTY_TAXI` from your pocket,
  `G.partyRescued`). `G.partyLog` keeps her night for later questions.
- GOODBYE / SEND <her> HOME is `_partyGoodbye` or `_partyGoodbyeOne`; GO HOME WITH her is `_partyHome`; GET ROOM at the
  short-time motel is `_motelRoom`.
- `_outWithMe(id)` and `_partyBlocksTrade` are the predicates other systems read (no SPECIAL, SOAPY or nurse while she is
  with you).

**State.** `G.party` (tonight), `G.partyLog`, `G.partyRescued`, `G.soc.motelWith`, `G.soc.leftEarly`.

**Constants.** `PARTY_MAX_GIRLS`, `PARTY_STOP_CAP`, `PARTY_TAXI`, `PARTY_MULT_STRANGER`, `PARTY_MULT_FACE`,
`SEASON_PARTY_BUMP`, `MOTEL_ROOM`.

**Touches.** `barfine` (the same modal), `ladydrinks` (bond, `_PARTY_JEALOUS` on a drink for another woman), `drinks`
(`_nursed` stands down), `massage` and `clinic` (companion lines). `G.party` is in the predicate registry: any new line
describing a bar or a woman must be checked under it.

**Tests.** `engine.test.js`, `round36.test.js`, `round47.test.js`, `round61.test.js`, `round80.test.js`, `round90.test.js`,
`round94.test.js`, `companion-identity.test.js`, `predicates.test.js`; `tools/composition-audit.mjs` (the companion state).

**Design docs.** `docs/economy-review.md`.

<!-- facts: party -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `goodbye`
> **Predicates:** `G.party`
> **Code named above, by file:** engine-core.js — `_outWithMe` · engine-play.js — `_boughtBond`, `_endNight` · engine-systems.js — `_bfResolve`, `_doBarfine`, `_motelRoom`, `_partyArrive`, `_partyBlocksTrade`, `_partyGoodbye`, `_partyGoodbyeOne`, `_partyHome`, `_partyNightEnd`, `_partyRival` · engine-parser.js — `_PARTY_JEALOUS`, `_arriveAt`, `_nursed`, `_takeOut`
<!-- /facts -->

### The night ride (`nightride`)
<!-- system: nightride -->

**What it is.** The warm mirror of the bar-hop scam: on a long-time barfine with a woman at regular tier or better, she
sometimes takes you round her own Pattaya on the back of her bike instead of straight to the hotel. The stops are
serendipity — a Thai disco, a som tam cart at two, her friend's bar, the viewpoint — and you only choose to ride on or
call it. It pays company, not conquest, and with her driving the last-bus dread lifts.

**How it works.**
- `_bfResolve` offers it on the honest long-time path: tier 2+ and a day-stable hash roll (55%, or 80% at her-farang).
  It sets `G.rideSeq`, `G.offstage` and `G.pendingEnc = "nightride"`.
- Each answer reaches `_nightRide(input)` through `_ENC`. A stop picks a `_RIDE_HOP` line and a `_RIDE_VENUES` venue
  (respecting each venue's hours), charges a modest cost, adds a drink at the drinking stops, `_addBond` +1 and the venue's
  non-jading สนุก, then spends `RIDE_STOP_TURNS` of the clock with `_passTime`. A non-answer re-prompts and sells water or
  food; a resolver that re-prompts must set `G.pendingEnc` again, because the dispatcher clears it before calling.
- It ends in `_endRide`: at `RIDE_MAX_STOPS`, at `SUNRISE_TURN`, when the pocket drops under `RIDE_MIN_CASH`, or on a stop
  word. It writes `G.rideLog` and `G.lastRide`, sets `G.lastBfBase` from the stops, and calls `_endNight("barfine")`.
- `_rideQuestion` is the pillion-seat ledger beat, built from your own drinks book and gallery. `_rideBike` and
  `_rideNickname` are hers.
- `_onRide()` is the predicate: the bar's ambient ticks (saleng, rose, rain lines) stay silent while it holds.

**State.** `G.rideSeq` (the live ride), `G.pendingEnc`, `G.offstage`, `G.rideLog`, `G.lastRide`, `G.rodeWith`,
`G.rideEverTaken`.

**Constants.** `RIDE_MAX_STOPS`, `RIDE_MIN_CASH`, `RIDE_STOP_TURNS`, `SUNRISE_TURN`.

**Touches.** `barfine` (the only door in), `ladydrinks` (bond per stop), the town's memory of last night (her colleagues
and `_rideStopKey` answer the stops by name). A new ambient tick must check `_onRide()`, which is in the predicate
registry.

**Tests.** `engine.test.js`, `round56.test.js`, `round75.test.js`, `round101.test.js`, `templates.test.js` (a step advances
the clock), `wrongquestion.test.js`, `predicates.test.js`.

**Design docs.** none.

<!-- facts: nightride -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Encounters:** `nightride`
> **Soak counters:** `nightride.taken`
> **Predicates:** `_onRide()`
> **Code named above, by file:** engine-core.js — `_addBond`, `_onRide`, `_passTime` · engine-encounters.js — `_ENC` · engine-play.js — `_endNight` · engine-systems.js — `_RIDE_HOP`, `_RIDE_VENUES`, `_bfResolve`, `_endRide`, `_nightRide`, `_rideBike`, `_rideNickname`, `_rideQuestion` · engine-parser.js — `_rideStopKey`
<!-- /facts -->

### The saleng carts (`saleng`)
<!-- system: saleng -->

**What it is.** A motorbike-sidecar vendor (food, snacks, shoes or lingerie) that parks at an open-front bar for a while.
It is a room fixture for the women, not an encounter: they swarm it, and the player can ignore it, buy something, or buy
something for one of them. It never gates input.

**How it works.**
- `_salengTick` runs once per `_tick`. A parked cart whose `G.salengUntil` has passed leaves (`_SALENG_LEAVE` if you are
  there), and a cart is pulled early as its bar nears closing. Otherwise, in an eligible bar — a region in
  `_SALENG_REGIONS`, not a pub, gents' club, indoor room or lock-in, no rain, not near close, 30 turns since the last cart,
  at most three bars a night and one cart per bar — a 10% roll calls `_salengSpawn`.
- `_salengSpawn` picks a type from `_SALENG_CARTS`, parks it for 6–12 turns and announces it (`_salengAnnounce`: a full
  pitch the first time a type is seen, `G.salengSeen`, a terse notice after).
- While parked, `_salengVignette` prints the women at the window about one tick in five.
- `_doBuy` tries the bar's own goods first and falls through to `_salengBuy` for cart items; `_salengMatchItem` gives price
  and nutrition. BUY <item> FOR <her> records the gift (`_giftNote`, `G.soc.gifted`) and gives +1 bond.
- `_salengHere()` is the presence test; `_salengPick` deals a visit's lines without repeats.
- In the same file, `_flowerTick` is the sibling rose seller (`ROSE_PRICE`), which IS a pending encounter.

**State.** `G.salengCart`, `G.salengRoom`, `G.salengUntil`, `G.lastSaleng`, `G.salengSeen`, `G.salengSaid`;
`G.soc.salengBar`, `G.soc.gifted` (nightly).

**Constants.** `ROSE_PRICE` (the rose, beside it). The cart prices live in `_salengMatchItem`.

**Touches.** `games` (a parked cart distracts the Connect 4 hostess one rung, `_c4Distraction`), `drinks` (`_doBuy`
routing order), the town's memory of gifts. Restore re-announces a parked cart through `_describeRoom`, not a modal redraw.

**Tests.** `engine.test.js`, `round37.test.js`, `round54.test.js`, `round66.test.js`, `round87.test.js`, `round88.test.js`,
`saveload.test.js`, `predicates.test.js`.

**Design docs.** `docs/design-backlog.md`.

<!-- facts: saleng -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Soak counters:** `saleng.met`
> **Code named above, by file:** engine-core.js — `_describeRoom`, `_tick` · engine-encounters.js — `_SALENG_CARTS`, `_SALENG_LEAVE`, `_SALENG_REGIONS`, `_flowerTick`, `_salengAnnounce`, `_salengBuy`, `_salengHere`, `_salengMatchItem`, `_salengPick`, `_salengSpawn`, `_salengTick`, `_salengVignette` · engine-play.js — `_c4Distraction` · engine-parser.js — `_doBuy`, `_giftNote`
<!-- /facts -->

### Massage, the soapies and the gents' clubs (`massage`)
<!-- system: massage -->

**What it is.** The paid-touch venues outside the bars. A legit shop sells an honest hour that eases a hangover and an
injury; an oil shop sells the same hour and then asks the question (SPECIAL); a soapy sells a numbered tier off a
fishbowl; a gentleman's club is a bar where one lady drink makes the staff hands-on and short time happens on site.

**How it works.**
- MASSAGE (`_doMassage`) reads the room's `massage` flag. `"legit"`: `MASSAGE_LEGIT` for an hour (`_passTime(10)`), one
  hurt and two drinks off, +2 สนุก. `"oil"`: `MASSAGE_OIL`, then the ask, which arms `G.soc.specialAsk` so a NO in the
  next breath is an answer.
- SPECIAL is `_massageSpecial`: the difference up to `MASSAGE_SPECIAL` (the full price without the base hour), once per
  shop per night, paid through `_conquestHappy`. She may slip you her number, which sets up `G.offShift` and
  `_doMeetOffShift` after `OFFSHIFT_TURN`.
- Every paid hour writes `G.massageLog` and `G.massageSpend`; `_masseuseTalk` and the `SHOP_MASSEUSES` records let the
  masseuse remember you.
- SOAPY (`_doSoapy`) opens `G.pendingSoapy`; `_soapyPrompt` lists `_SOAPY_TIERS` and `_soapyResolve` takes a number or a
  tier name, once a night (`G.soc.soapyDone`).
- Gents' clubs are `barType: "gents"`: `_favor` adds +6 after one lady drink, `BF_GENTS` prices the fine, they shut at
  midnight (`_closeTurn`), and carts never come.
- `_partyBlocksTrade` refuses SPECIAL and SOAPY with a companion.

**State.** `G.soc.massaged`, `G.soc.special`, `G.soc.specialAsk`, `G.soc.soapyDone` (nightly), `G.pendingSoapy`,
`G.massageLog`, `G.massageSpend`, `G.offShift`.

**Constants.** `MASSAGE_LEGIT`, `MASSAGE_OIL`, `MASSAGE_SPECIAL`, `SHOP_MASSEUSES`, `OFFSHIFT_TURN`, `BF_GENTS`.

**Touches.** `barfine` (the gents' fine), `social` (the gents' `_favor` bonus), `clinic` (a special today triggers the
window-period line), `party`. `_doTaoRai` quotes the massage board from the same constants.

**Tests.** `engine.test.js`, `round57.test.js`, `round67.test.js`, `round73.test.js`, `round76.test.js`, `saveload.test.js`,
`world.test.js`; `tools/modal-audit.mjs` (the soapy menu).

**Design docs.** none.

<!-- facts: massage -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `massage` · `special` · `soapy`
> **Soak counters:** `massage.taken`
> **Rooms:** `the_boardroom` · `velvet_club` · `doghouse`
> **Code named above, by file:** engine-core.js — `_passTime` · engine-play.js — `_closeTurn`, `_conquestHappy`, `_favor` · engine-systems.js — `_SOAPY_TIERS`, `_doMassage`, `_doMeetOffShift`, `_doSoapy`, `_massageSpecial`, `_partyBlocksTrade`, `_soapyPrompt`, `_soapyResolve` · engine-parser.js — `_doTaoRai`, `_masseuseTalk`
<!-- /facts -->

### The clinic (`clinic`)
<!-- system: clinic -->

**What it is.** The game's non-punitive sexual-health thread. An unprotected barfine can leave a souvenir that surfaces two
mornings later and drags สนุก until you GET TESTED at the free clinic on Second Road; a condom from the 7-Eleven prevents
it. The clinic's waiting room is also where you meet Priew, the start of the hospital-mirage arc.

**How it works.**
- `_stdBarfineRoll` runs on each paid night (a short time in `_bfResolve`, the long-time close in `_endNight`, the
  motel's `_motelRoom`): a carried condom is used (`G.condoms`
  drops), otherwise a `STD_RISK` roll may set `G.std`. A sexless reality night sets `G.lastBfChaste` and skips it.
- `_stdSymptomatic()` is true two days on; `_stdMorningTick` then prints a morning line and costs สนุก, and DIAGNOSE says so.
- GET TESTED / CLINIC is `_doClinic`: anywhere but `second_rd_c` it takes you there (by bike if you can pay), sits a
  companion with you, refuses a second test the same day (`G.testedDays`), clears `G.std` with `_CLINIC_POS` (+3) or
  reports clean with `_CLINIC_CLEAN` (+1), and names the window period if you paid tonight.
- `_priewMeet` runs once after Act One with no companion: `metPriew`, her number in your phone, `G.priewDay`.
  `_priewReveal` later fires in a go-go.

**State.** `G.std`, `G.condoms`, `G.testedDays`, `G.lastBfChaste`, `G.priewDay`.

**Constants.** `STD_RISK`, `CONDOM_PRICE`, `CONDOM_PACK` (all in engine-play), `MOTOSAI_TOWN` (the ride there).

**Touches.** `barfine` and `massage` (the paid nights that roll), `party` (the companion in the waiting room), the
7-Eleven's shelf (condoms). Act One gating: Priew does not appear before `act1Done`.

**Tests.** `std.test.js`, `engine.test.js`, `round53.test.js`, `round57.test.js`, `round70.test.js`, `saveload.test.js`.

**Design docs.** `docs/design-backlog.md`.

<!-- facts: clinic -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `get` · `clinic`
> **Soak counters:** `clinic.tested`
> **People:** `priew`
> **Rooms:** `second_rd_c`
> **Code named above, by file:** engine-play.js — `_endNight`, `_stdBarfineRoll`, `_stdMorningTick`, `_stdSymptomatic` · engine-systems.js — `_bfResolve`, `_motelRoom` · engine-parser.js — `_CLINIC_CLEAN`, `_CLINIC_POS`, `_doClinic`, `_priewMeet`, `_priewReveal`
<!-- /facts -->

### Bar games (`games`)
<!-- system: games -->

**What it is.** The tables in the bars: Connect 4 and Jackpot (shut-the-box dice) against a hostess in beer and Soi 6
bars, pool where a room has a table, the killer league on league nights, and darts where a room has a board. Stakes are
small and escrowed; a broke player plays for sanuk.

**How it works.**
- PLAY is `_doPlay`; `_playOptions` is the room-aware list every surface uses (beer/soi6 via `_barGamesHere`, `room.pool`,
  killer on `_leagueTonight`, `room.darts`). Starters: `_startC4`, `_startJackpot`, `_startPool`, `_startKiller`,
  `_startDarts`.
- A live game is `G.game` with a `type` (`c4`, `jp`, `pool`, `kp`, `darts`, also `quiz` and `cli` from other systems).
  While it holds, `_doCommandInner` sends every input to `_gameInput`; QUIT concedes. Questions are free (no move, no turn).
- `_takeStake` escrows; `_endGame` pays ×2 on a win (×3 for a Jackpot).
- The rules are pure in `games.js` (`c4Ai`, `jpRoll`, `jpMoves`, `poolShot`, `kpNew`, `kpShot`) with injected dice.
  The hostess is `_gameHostess` and her skill `_c4Depth(id)`: mamasan 8, floor 6, a new girl 2. `_c4Distraction` (a
  parked cart or rain) drops her a rung via `_c4TierDown`, never the mamasan.
- Jackpot's first game is a tutorial until the `jpLearned` flag (`_jpTeach`).
- Killer writes `G.lastKp` (tonight's field) and `G.kpTitle` (the room's champion, `_kpTitleTick`).
- `_gameVerbs`, `_c4Choices`, `_jpChoices` drive autocomplete; the chip bar hand-lists each type's chips.

**State.** `G.game`, `G.lastKp`, `G.kpTitle`, the `jpLearned` flag.

**Constants.** `C4_STAKE`, `JP_MIN`, `JP_MAX`, `JP_DEFAULT`, `POOL_STAKE`, `KP_ENTRY`, `DARTS_STAKE`, `CANON_HOSTESSES`.

**Touches.** `calendar` (league night), `saleng` and the weather (distraction), `drinks` (`_doTaoRai` quotes the stakes).
A new `G.game` type needs its chips in `_chipSet` and a redraw in `_renderResume`.

**Tests.** `games.test.js`, `playtest5.test.js`, `round75.test.js`, `saveload.test.js`; `tools/modal-audit.mjs`.

**Design docs.** `docs/economy-review.md`, `docs/soi-sanuk-games-extension.md`.

<!-- facts: games -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `play`
> **Soak counters:** `game.started` · `killer.title`
> **Code named above, by file:** engine-play.js — `_barGamesHere`, `_c4Choices`, `_c4Distraction`, `_c4TierDown`, `_doPlay`, `_endGame`, `_gameHostess`, `_gameInput`, `_gameVerbs`, `_jpChoices`, `_jpTeach`, `_leagueTonight`, `_playOptions`, `_startC4`, `_startDarts`, `_startJackpot`, `_startKiller`, `_startPool`, `_takeStake` · engine-systems.js — `_kpTitleTick` · engine-parser.js — `_chipSet`, `_doCommandInner`, `_doTaoRai`, `_renderResume` · world.js — `_c4Depth`
<!-- /facts -->

### The calendar (`calendar`)
<!-- system: calendar -->

**What it is.** The town's week: quiz night on Thursdays at three bars, the pool league every third night, the Queen Vic's
Sunday roast and Friday curry, band nights, and the regulars' weekday habits. It gives the town a schedule a player can
learn and plan around, and it is deterministic so every player would agree on it.

**How it works.**
- Every calendar test goes through a helper — never raw `G.day % …` — because in a shared world these are the only seams
  to re-plumb: `_weekday` (`WEEKDAYS`, day 1 is a Monday), `_quizDay`, `_isQuizWindow` (20:00–22:00),
  `_isQuizHour(hour)`, `_leagueTonight`, `_leagueIn`, `_roastDay`, `_roastHour(hour)`, `_curryDay`, `_isBandNight`. The
  hour-taking forms exist because the rail's drift probes hours that are not now.
- `_quizBars()` picks three of `QUIZ_BARS` by a pure hash of vacation and day (the Queen Vic alone in the Soi 6 week), so
  reading the schedule rolls no dice. `_quizHere` is true in one of them during the window, never at your own bar.
- Walking into a quiz bar mid-window (`_arriveAt`, `_tick`) calls `_startQuiz`: five questions from `QUIZ_POOL` with no
  repeats in a night (`G.quizSeen`), as a `G.game` of type `quiz`. Five right pays ฿500, four ฿200 (`G.quizWon`);
  `G.quizLast` lets the room discuss it.
- The roast is finite and pure: `_roastLeft` is `ROAST_COVERS` minus the room's pace minus yours (`G.qvRoast`); `_qvMenu`
  is tonight's card from `QV_MENU`, and the till, READ MENU and autocomplete all read it.
- The talk side: `_quizTalk`, `_leagueTalk`, `_closingTalk`. Regulars keep `days` and an `_anchorNight`.

**State.** `G.quizPlayed` (cleared nightly), `G.quizSeen`, `G.quizLast`, `G.quizWon`, `G.qvRoast`.

**Constants.** `WEEKDAYS`, `QUIZ_BARS`, `QUIZ_POOL`, `ROAST_COVERS`, `ROAST_PACE`, `QV_MENU`.

**Touches.** `games` (league night gates killer), the regulars' drift (quiz night pulls hoppers), TIME. A new "the town
decides" schedule should follow `_quizBars`: a pure hash, never `_rand`.

**Tests.** `queenvic.test.js`, `drift.test.js`, `engine.test.js`, `round33.test.js`, `round49.test.js`, `round60.test.js`,
`sweep.test.js`, `saveload.test.js`; `tools/askable-audit.mjs` (closing and the league asked of the staff).

**Design docs.** `docs/economy-review.md`, `docs/second-road-weeks.md`.

<!-- facts: calendar -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Soak counters:** `quiz.played`
> **Code named above, by file:** engine-core.js — `_anchorNight`, `_quizTalk`, `_rand`, `_tick` · engine-play.js — `_curryDay`, `_isBandNight`, `_isQuizHour`, `_isQuizWindow`, `_leagueIn`, `_leagueTonight`, `_quizBars`, `_quizDay`, `_quizHere`, `_roastDay`, `_roastHour`, `_startQuiz`, `_weekday` · engine-systems.js — `_qvMenu`, `_roastLeft` · engine-parser.js — `_arriveAt`, `_closingTalk`, `_leagueTalk`
<!-- /facts -->

## People, talk and the side arcs

How anybody says anything: the conversation machinery, the quests it carries, the regulars on their stools and the generated floor, Thai, the phone, and the arcs built on top — Nira's loan, Cream, Sao, the Orchid and the cameras.

### Conversation (`conversation`)
<!-- system: conversation -->

**What it is.** TALK, ASK <who> ABOUT <what>, bare topics mid-conversation, TOPICS, choices, and the questions characters
put back to the player. A character is a flat list of state-gated dialogue nodes, never a tree:
branching is state, and the first open node wins. The rules that matter most are that nobody retells a story unprompted
and that anything the game prints as a topic is answerable this turn.

**How it works.**
- `_doTalk` → `_doTalkBody` (marks a stranger met once any path answered her) → `_doTalkCore`, a long ordered chain:
  special people, the rage pre-empt (`_patronRage`), the engine's memory answers (`_deedTalk`, `_streetTalk`,
  `_lastTimeTalk`, `_mineTalk`…), then `_pickDialogue`, then the miss path (`_selfNamedNode`, `_fixtureTalk`,
  `_townTalk`, `_smallTalk`, finally `_askAgain`/`_patronAgain`/`_topicMiss`). Most branches end in `_questOffer`.
- `_pickDialogue` tries an exact alias first (`_topicExact`), then the fuzzy `_topicHits`, gating each node with
  `_nodeOpen` (`req`, `notFlags`, `bond`, `when`); a miss retries through the synonym map (`_convoTopic` over
  `_CONVO_TOPIC_RULES`).
- `_deliver` prints a node and records its index in `G.talked`: a repeat gives `short`, or `_gistOf` when reached by
  another word; ASK … AGAIN (`_RETELL_RE`) or a bought round (`G.soc.roundFor`) is the only way to a full retelling.
  A repeat greeting gets `_HELLO_AGAIN`, or `_bondTalk` at regular and above.
- The ask loop: a node's `asks` arms `G.convoQ` in `_convoAsk` (once per key, never once heard); the next plain line
  is captured by `_convoAnswer` into `G.player.said`, canned replies come from `_askReplies` (`ASK_REPLIES`), and
  `_saidAgrees` judges a second telling by substance.
- `_convoStart`/`_convoActive` hold the partner (`G.convo`); `_convoResolve`, `_readAsk` and `_toHer` route bare
  topics and sentences to her. `_convoTopics` is the chip palette (`{all:true}` is what TOPICS prints, `_doTopics`),
  paged by `_topicWindow`; `_situationTopics` adds engine-answered subjects.

**State.** `G.talked` (per character, for life), `G.npc` (trust/mood/dstate/know/heard via `_npcState`), `G.convo`,
`G.convoQ`, `G.convoLapsed`, `G.convoPage`, `G.convoChoiceMemo`, `G.player.said`; nightly `G.soc.roundFor`,
`G.soc.askedHere`.

**Constants.** None of its own; tiers come from `_knownTier`.

**Touches.** `quests` (`_questOffer` after nearly every answer), `regulars` (the patron repeat register), `filler`
(`_townStory` inside `_deliver`), `thai` (`_thaiWordTalk`). A new alias that is a prefix of another node's label steals
it — `_topicExact` exists for that.

**Tests.** conversation.test.js, round47.test.js (every printed label asked), round62.test.js (dead nodes),
patronfold.test.js, reader.test.js, steve.test.js, question-audit.test.js, remarks.test.js; tools/asktopic-audit.mjs,
tools/askable-audit.mjs and tools/dialogue-lifecycle.mjs (gated in promises.test.js); tools/dialogue-walk.mjs is run by hand.

**Design docs.** none.

<!-- facts: conversation -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `talk` · `ask` · `topics` · `say` · `again`
> **Code named above, by file:** engine-core.js — `_askAgain`, `_convoActive`, `_convoAsk`, `_convoStart`, `_convoTopics`, `_deliver`, `_gistOf`, `_nodeOpen`, `_npcState`, `_patronAgain`, `_patronRage`, `_pickDialogue`, `_selfNamedNode`, `_topicExact`, `_topicHits`, `_topicMiss`, `_townStory` · engine-play.js — `_bondTalk`, `_knownTier`, `_smallTalk` · engine-systems.js — `_deedTalk`, `_questOffer` · engine-parser.js — `_CONVO_TOPIC_RULES`, `_HELLO_AGAIN`, `_RETELL_RE`, `_askReplies`, `_convoAnswer`, `_convoResolve`, `_convoTopic`, `_doTalk`, `_doTalkBody`, `_doTalkCore`, `_doTopics`, `_fixtureTalk`, `_lastTimeTalk`, `_mineTalk`, `_readAsk`, `_saidAgrees`, `_situationTopics`, `_streetTalk`, `_thaiWordTalk`, `_toHer`, `_topicWindow`, `_townTalk`
<!-- /facts -->

### Quests and the journal (`quests`)
<!-- system: quests -->

**What it is.** Jobs a character offers, accepted with ACCEPT, read with QUESTS, whispered by HINT, and the JOURNAL
of leads. Quests deliberately observe the world rather than own it: a quest completes when its `doneFlag` is set by
anything — a dialogue node, a GIVE, a room visit, a game won — so any mechanic can finish one with no quest code.

**How it works.**
- Offer: `_questOffer(npcId)` runs after a conversation answer. For each quest whose giver (`_qGiver`) is the speaker
  and `_questAvailable` holds (deps done, `reqFlags`, the giver's `trust`, the Soi 6 fence) it marks it offered, sets
  `G.lastOffer`, and prints the pitch with the hint stripped (`_questPitch`). A `vignette` opens silently as active.
  It never interrupts an open question (`G.convoQ`).
- `_doAccept` resolves a name with `_findQuest` (a wrong name is a miss, never a default), hands over a quest `item`,
  and refuses an item quest whose giver is elsewhere. `_doAbandon` takes the item back.
- `_questTick` (first thing in `_tick`) pays deferred job money (`G.jobPay`), runs per-quest counters, then completes
  every active quest whose `doneFlag` is set: reward money (to the account via `_bankIn` when the giver is absent),
  `G.questDoneDay`, and the next door of any dep chain.
- `_questWhere` is the single live "where": the giver's room today, but only named once the transcript has earned it
  (visited, heard of, or met). HINT (`_doHint`) points at the first active job; `_doQuests` lists the books.
- `_frontier` is the journal: a projection of what the transcript has shown and not yet followed (unasked topics,
  named-but-unmet people from `G.namedBy`, untaken exits, heard-of venues from `G.heardOf`). `_doJournal` prints it;
  `_leads` feeds HINT and QUESTS when the books are empty. It never names an unmet face.

**State.** `G.quests` (id → offered/active/done/abandoned, per life), `G.questDoneDay`, `G.jobPay`, `G.lastOffer`,
`G.namedBy`, `G.heardOf`, `G.exitTried`, `G.tanAsked`, `G.flags` (each quest's `doneFlag`).

**Constants.** `QUESTS` (world.js, the schema: giver, desc, deps, `reqFlags`, `trust`, `item`, `at`, `doneFlag`,
`reward`, `vignette`); `COVERS_NIGHTS`; `LAUNDER_HONEST`.

**Touches.** `conversation` (offers ride every answer), `barchain` and `laundering` (dep chains built on this),
`act1` (`_checkAct1`, HINT's opening branch). An engine-set flag must join world.test's settable list.

**Tests.** world.test.js (well-formed quests), journal.test.js, reachability.test.js, engine.test.js,
playtest5.test.js, hillchain.test.js, barchain.test.js, laundering.test.js; tools/quest-audit.mjs and
tools/errand-audit.mjs (run by hand).

**Design docs.** docs/known-subgraph.md.

<!-- facts: quests -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `quests` · `accept` · `abandon` · `hint` · `journal`
> **Quests:** `kwan_crane` · `lake_errand` · `quietside` · `orchid_intro` · `hill_ice` · `hill_order` · `hill_photo` · `old_days` · `easy_come` · `quiet_one` · `her_brother` · `wrong_shot` · `helmet` · `sangsom` · and 9 more
> **Soak counters:** `quest.accepted` · `quest.completed`
> **Code named above, by file:** engine-core.js — `_bankIn`, `_tick` · engine-systems.js — `_checkAct1`, `_doAbandon`, `_doAccept`, `_doHint`, `_doJournal`, `_doQuests`, `_findQuest`, `_frontier`, `_leads`, `_qGiver`, `_questAvailable`, `_questOffer`, `_questPitch`, `_questTick`, `_questWhere`
<!-- /facts -->

### The rail regulars (`regulars`)
<!-- system: regulars -->

**What it is.** The named bar customers. They are
ordinary `NPCS` entries flagged `patron: true`, authored together in `_REGULARS` and folded into the cast at load. What
the flag buys them: a grizzled repeat voice, absences the staff never have, and an early-evening drift round their own
manor that settles at their local by ten, so "go and find him" errands work in the back half of the night.

**How it works.**
- Drift: `_npcRoom` calls `_hopRoom` while `_hopsNow` (a `hops: true` man who is not staff, not on the Soi 6 week,
  before `HOP_SETTLE`). `_hopRoom` is a cumulative walk over `_hopPool` (the bars of his `haunts` regions minus
  `avoids` and minus `_lawHoursBar` rooms), one step per hour at `HOP_CHANCE`, from hour one. Quiz night
  (`_isQuizHour`, `_quizBars`) and the Sunday roast (`_roastHour`) pull him on purpose. A man you are talking to keeps
  his hour (`G.convoHour`). Pure hash, never dice — `_questWhere` probes other hours by moving the clock.
- Absence lives in `_npcActive`, not `_npcRoom`: `days` (his stated nights), `_benchOut` (a season-scaled share stay
  in), never on his `_anchorNight` and never for a `fixture`. `_npcWhere` is the presence-aware room.
- `_railTick` (from `_tick`) narrates a move to a player in either room, using `_railRoomAt` and the pronoun-free
  `_RAIL_LEAVES` pool.
- Pointers keep their word: `_willMove` tells `_elsewhereLine` and `_tanAbout` to give the habit ("round there before
  ten, after ten at his local"); `_tanAbout` names his anchor night from `_ANCHOR_NAMES`.
- `_findNpc` matches a regular strictly (exact, name-prefix, `_PATRON_TITLES` title).
- Talk: a repeat is `_patronAgain`, a miss `_PATRON_MISS`; `rage` subjects pre-empt the node pick (`_patronRage`).

**State.** Reads `G.day`, `G.vacation`, `G.nightTurn`, `G.convo`, `G.convoHour`; writes nothing persistent beyond the
shared `G.talked`.

**Constants.** `HOP_CHANCE` (per cent per hour), `HOP_SETTLE` (22:00, the settle hour).

**Touches.** `quests` (`_questWhere`'s patron branch), `conversation`, the season (`_seasonTier` in `_benchOut`), the
quiz and the Queen Vic kitchen. Adding a `_rand()` anywhere on the drift path desyncs the seeded daily.

**Tests.** drift.test.js, patronfold.test.js, queenvic.test.js, round22.test.js, round40.test.js, predicates.test.js.

**Design docs.** none.

<!-- facts: regulars -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **People:** `doyle` · `terry` · `mort` · `angela` · `pete` · `wilf`
> **Rooms:** `queen_vic`
> **Code named above, by file:** engine-core.js — `_ANCHOR_NAMES`, `_PATRON_MISS`, `_RAIL_LEAVES`, `_anchorNight`, `_benchOut`, `_elsewhereLine`, `_findNpc`, `_hopPool`, `_hopRoom`, `_hopsNow`, `_lawHoursBar`, `_npcActive`, `_npcRoom`, `_npcWhere`, `_patronAgain`, `_patronRage`, `_railRoomAt`, `_railTick`, `_rand`, `_tick`, `_willMove` · engine-play.js — `_isQuizHour`, `_quizBars`, `_roastHour` · engine-systems.js — `_questWhere`, `_seasonTier`, `_tanAbout` · world.js — `_PATRON_TITLES`, `_REGULARS`
<!-- /facts -->

### The floor staff (`filler`)
<!-- system: filler -->

**What it is.** The rank-and-file hostesses, mamasans and cashiers — over two hundred women. Each is a stored record
in `FLOOR_STAFF`, folded into `NPCS` at load by `_floorHostess`, `_floorMama` and `_floorCashier`; nothing about her is
hashed at load. `filler: true` marks the tier (pooled dialogue, badges, the town book, exits), not how she was made.
Some floors are written woman by woman (`FLOOR_OWN`).

**How it works.**
- A record holds name, Thai name, bar, role, `look` (her portrait prompt only), hometown, `desc`, and `pick`: the
  index of each shared pool line she speaks (`_H_GREET`, `_H_FAMILY`, `_H_PLAN`, the wrappers such as
  `_H_FAMILY_WRAP`; `_M_FAMILY` for mamas, `_C_GREET` for cashiers). Appending to a pool moves nobody.
- `_floorOwn` puts a written woman's own nodes first and drops any shared line on a subject she covers; `_houseOwn`
  builds the house staff's written sets.
- The town book: a node with `story` is re-dealt at delivery by `_townStory`/`_townPick` — the next pool line nobody
  in town has told you, kept as hers in `G.storyOf` (town ledger `G.townTold`), with `_storyClash` keeping a plan from
  needing a relative her family line buried.
- One story per rail at build time (`_storyTaken`); an authored hostess with no family/plan node falls back to
  `_authoredStory`, which reads the province her own text names.
- Who keeps the till: `_tillKeeper` (a cashier, else a mamasan doing both, else `_coverGirl` for an absent owner);
  `_soloMama` for the double shift.
- Around her: `_badge` (go-go numbers), `_drinksOnly`, `_exited` (she reached her plan), `_awayForSeason`,
  `_englishOf` (a cashier's English).

**State.** `G.storyOf`, `G.townTold` (player-local, per life). The records themselves are data.

**Constants.** `FLOOR_STAFF`, `FLOOR_OWN`, `SOI6_INNER_GIRLS` (world.js); `_H_BAKED` (the authored fallback's pool
window).

**Touches.** `conversation` (`_deliver` consults the town book), `barfine` (`_drinksOnly`, `_isDraw`, `_hasSponsor`),
the portraits (`look` is the render prompt — never put markup or story in it). An id keyed to a portrait and saves is
never renamed; change the record's `role`, not the key.

**Tests.** floor.test.js, soi6expansion.test.js (including the generator template pin), sweep.test.js,
round47.test.js (pool depth), chorus-audit.test.js, term.test.js (no filler line taps a stray name);
tools/gen-floor-staff.mjs writes new floors, tools/chorus-audit.mjs gates the shared pools.

**Design docs.** docs/soi6-expansion.md.

<!-- facts: filler -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Code named above, by file:** engine-core.js — `_coverGirl`, `_deliver`, `_soloMama`, `_tillKeeper`, `_townPick`, `_townStory` · engine-systems.js — `_awayForSeason`, `_hasSponsor`, `_isDraw` · engine-parser.js — `_englishOf` · world.js — `_C_GREET`, `_H_BAKED`, `_H_FAMILY`, `_H_FAMILY_WRAP`, `_H_GREET`, `_H_PLAN`, `_M_FAMILY`, `_authoredStory`, `_badge`, `_drinksOnly`, `_exited`, `_floorCashier`, `_floorHostess`, `_floorMama`, `_floorOwn`, `_houseOwn`, `_storyClash`, `_storyTaken`
<!-- /facts -->

### Thai (`thai`)
<!-- system: thai -->

**What it is.** Typed Thai (script or romanised), a fluency ladder the town reacts to, and Kruu Waen's bar Cloze on
Soi Diana, where an hour's LESSON, the nightly board (ANSWER) and a hidden sign answer live. The ladder is a cost as
well as a reward: past the first rung the floor answers in English, and at fluency the compliments stop and the
hostesses get wary. A lesson teaches but never promotes — only Thai you used counts.

**How it works.**
- Input: `_thaiToCmd` translates a Thai line through `_THAI_CMD` (longest match first; `_thaiCmdTable` adds every
  NPC's `th` name). `parseThaiWords` (thai.js) and `_amount` read spoken numbers; `_looksThai` gives romanised misses a
  hint; `THAI_PHRASES` and `_THAI_REPLY` answer the phrasebook.
- Ladder: `_thaiPraise(key)` records correct Thai in `G.thaiSaid`; `_thaiNote` records a gesture (the wai, TAO RAI)
  quietly. `_thaiPoints` counts distinct items plus `G.thaiScript`; `_thaiRegister` → novice / adequate (3) /
  fluent (`THAI_FLUENT`). Reactions: `_THAI_PRAISE`, `_THAI_SWITCH`, the once-only `_THAI_SPY`, `_THAI_NO_DEFLECT` on
  a topic miss, and `_thaiOverheard` at fluency. The half-Thai origin starts at the adequate rung and is clocked once
  (`_HALF_THAI_CLOCKED`). `_waiBack` returns a wai.
- Cloze: `_doLesson` (needs `_waenHere`) charges `LESSON_PRICE`, passes `LESSON_TURNS`, teaches from the parser's own
  tables (`_lessonUsable`, `_LESSON_READING`), and adds to `G.taughtBy` — never to the barfine bond. `_doAnswer` plays
  `_boardWord` (day-stable) for half-price drinks (`G.boardWon`); answering the sign itself sets `clozeGot` and a free
  hour (`G.clozeFree`).
- `_waenTick` (from `_tick`) sends the trainer link once after the first paid hour (`TRAINER_URL`), then a word a night
  from `_WAEN_HOMEWORK` (`G.waenDay`). `_doNotebook` reads it all back.

**State.** For life: `G.thaiSaid`, `G.thaiScript`, `G.thaiUsed`, `G.thaiSeen` (journalled by `_say`, read by the
trainer), `G.taughtBy`, `G.taught`, `G.clozeFree`, `G.thaiSpyDone`, `G.halfThaiClocked`; per day `G.boardWon`,
`G.waenDay`; nightly `G.soc.thaiPraised`.

**Constants.** `THAI_FLUENT`, `LESSON_PRICE`, `LESSON_TURNS`, `TRAINER_URL`.

**Touches.** `conversation` (`_thaiWordTalk`, the Thai house voice), `phone` (Waen's texts). Any new Thai word must exist
in the trainer's vendored vocabulary or term.test's coverage test fails.

**Tests.** round42.test.js, thai.test.js, halfthai.test.js, thaionly.test.js, thaihouse.test.js, round92.test.js,
reader.test.js, term.test.js (Thai coverage).

**Design docs.** docs/trainer-notes.md, docs/thai-quest-design.md.

<!-- facts: thai -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `lesson` · `answer` · `notebook`
> **Soak counters:** `lesson.taken`
> **People:** `waen`
> **Rooms:** `cloze`
> **Code named above, by file:** engine-core.js — `_say`, `_tick` · engine-systems.js — `_LESSON_READING`, `_WAEN_HOMEWORK`, `_boardWord`, `_doAnswer`, `_doLesson`, `_doNotebook`, `_lessonUsable`, `_thaiOverheard`, `_waenHere`, `_waenTick` · engine-parser.js — `_HALF_THAI_CLOCKED`, `_THAI_CMD`, `_THAI_NO_DEFLECT`, `_THAI_PRAISE`, `_THAI_REPLY`, `_THAI_SPY`, `_THAI_SWITCH`, `_amount`, `_looksThai`, `_thaiCmdTable`, `_thaiNote`, `_thaiPoints`, `_thaiPraise`, `_thaiRegister`, `_thaiToCmd`, `_thaiWordTalk`, `_waiBack`
<!-- /facts -->

### The phone (`phone`)
<!-- system: phone -->

**What it is.** The player's phone: numbers swapped in bars, texts that arrive unprompted (invitations, selfies,
money-asks), MESSAGE and CALL, the banking app (SEND), the camera and its gallery, and WHO / BLACKBOOK, the relationship
book. Everything costs battery and stops at zero. It is where a relationship continues away from her stool.

**How it works.**
- CONTACT (`_doContact`) swaps numbers at sufficient `_favor`; your own staff, Tan, Cream and house staff have their
  own branches.
- `_maybeIncomingText` (from `_tick`) picks a contact who texts (`_texts`), weighted by `_bondTier`, never one in the
  room, on your arm, under the verdict or cut this trip, and pushes a message (`_pushMsg`): an invitation
  (`G.phone.invite`, honoured in `_arriveAt`), a selfie (`_maybePhotoText`), a money-ask (`_moneyAsk`) or small talk.
- Asks have kinds and amounts (`_ASK_KINDS`, `G.phone.asks`): a scripted asker (`_askScripted`) repeats word for word,
  an honest one never asks for the same thing twice; a paid ask is marked by `_askPaid`.
- `_readMessages` (CHECK MESSAGES) marks read, files photos, and lands any money in the account (`_bankIn`).
  `_doMessage` is a once-a-night charm (`G.phone.msgCd`) and routes to `_saoReply` for Sao; `_doCall` rings out and the answer
  comes back as a text, except Tan, who answers (`_tanCall`). `_doSendMoney` draws on `G.bank`, never the pocket, and advances a pay-per-photo
  drip (`_startPicDeal`, `_advancePicDeal`) for a woman with `paidPics`.
- PHOTO <someone> (`_photoChar`) adds a portrait (`_addPhoto`, `_photoWhere` records the room) and learns her name; the
  go-go house rule (`_PHOTO_GOGO_NO`) yields for a contact or a regular. `_doGallery` lists `G.phone.photos`.
- `_doBlackbook` ranks contacts by bond with asked/answered counts; `_textTalk` makes a text's subject askable in person.

**State.** `G.phone` (contacts, inbox, lastText, msgCd, invite, photos, asks, picDeals, cut — per life), `G.battery`,
`G.bank`, `G.known`.

**Constants.** None of its own.

**Touches.** `conversation` (`_textTalk` runs in `_doTalkCore`), `cream` and `sao` (their texts), `thai` (Waen's
homework). A new text source must respect the presence filters in `_maybeIncomingText` or a woman texts from the next
stool.

**Tests.** engine.test.js, research.test.js (the asks), round61.test.js, round64.test.js, round37.test.js,
round44.test.js, round104.test.js, predicates.test.js, playtest5.test.js.

**Design docs.** none.

<!-- facts: phone -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `phone` · `message` · `call` · `contacts` · `who` · `blackbook` · `photo` · `gallery` · `photos` · `check`
> **Soak counters:** `contact.swapped` · `photo.taken`
> **Code named above, by file:** engine-core.js — `_bankIn`, `_texts`, `_tick` · engine-play.js — `_bondTier`, `_favor` · engine-systems.js — `_ASK_KINDS`, `_advancePicDeal`, `_askPaid`, `_askScripted`, `_doBlackbook`, `_doContact`, `_doMessage`, `_doSendMoney`, `_maybeIncomingText`, `_maybePhotoText`, `_moneyAsk`, `_pushMsg`, `_readMessages`, `_saoReply`, `_startPicDeal`, `_tanCall`, `_textTalk` · engine-parser.js — `_PHOTO_GOGO_NO`, `_addPhoto`, `_arriveAt`, `_doCall`, `_doGallery`, `_doTalkCore`, `_photoChar`, `_photoWhere`
<!-- /facts -->

### Nira's loan (`loans`)
<!-- system: loans -->

**What it is.** A short-term loan from Nira, who lends from her stool at Neon Paradise on Walking Street: BORROW up to
a ceiling at twenty percent, due in three days. Late, it compounds nightly and her cousins escalate from a text to
asking around to emptying your pocket at dawn. It is the game's honest bad deal — no threat is ever made, the arithmetic
does the work.

**How it works.**
- `_doBorrow`: refuses a rich man, a man on the bench (`G.street`), a man who flew home owing (`G.loanSkipped`), or
  anyone not at her stool (`_withNira`); one loan at a time; rounds the amount, applies `LOAN_MIN`/`LOAN_MAX`, and
  writes `G.loan` with owed = `_loanTerms` (principal +20%) and a due day `LOAN_DAYS` on. A bar owner at Nont's table
  is routed to Nont's bar loan instead.
- `_doRepay`: reads the amount anywhere in the sentence (`_repayAmount`), pays principal first (`_loanPrincipal`, so
  only the excess is the loan's cost on the morning ledger), and on clearing gives bond (`_addBond`) and, on time,
  `_repGain`.
- `_loanNightRoll` (from `_endNight`): past due, owed ×1.2 each night (`_loanRound`); strike one is a text, two is men
  asking at the bars, three and on take what you carry and cost happiness.
- `_newVacation` writes off an unpaid loan but remembers it (`G.loanSkippedOwed`); `_skipRepay` lets you square it at
  her stool, after which she lends again.

**State.** `G.loan` ({principal, left, owed, dueDay, strikes}, or null), `G.loanBorrowed`, `G.loanRepaid`,
`G.loanPrin` (running totals for the morning ledger), `G.loanSkipped`, `G.loanSkippedOwed`, `G.skipRepaid`.

**Constants.** `LOAN_MAX`, `LOAN_MIN`, `LOAN_DAYS` (declared in engine-systems.js, not world.js).

**Touches.** The morning ledger and MONEY (`_debtsOwed`, DEBT via `_doDebt`), `expat-month` (destitution: no loan on the bench), the
bar's own loan from Nont (`_nontLoan`, same `_loanPrincipal` book). A change to how repayment is booked must keep the
money audit's reconciliation.

**Tests.** round59.test.js, round72.test.js, round68d.test.js, engine.test.js, destitute.test.js, saveload.test.js;
tools/money-audit.mjs (gated by money-audit.test.js).

**Design docs.** none.

<!-- facts: loans -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `borrow` · `repay`
> **Soak counters:** `loan.taken`
> **People:** `nira`
> **Rooms:** `neon_paradise`
> **Code named above, by file:** engine-core.js — `_addBond`, `_repGain` · engine-play.js — `_debtsOwed`, `_endNight`, `_newVacation` · engine-systems.js — `_doBorrow`, `_doDebt`, `_doRepay`, `_loanNightRoll`, `_loanPrincipal`, `_loanRound`, `_loanTerms`, `_nontLoan`, `_repayAmount`, `_skipRepay`, `_withNira`
<!-- /facts -->

### Cream, the chameleon economy (`cream`)
<!-- system: cream -->

**What it is.** Cream sits at a table in the Metro Beer Garden from 22:00: no number, no uniform, a pharmacy job by
day. She is not staff, so none of the lady-drink, barfine or contact machinery answers for her. Asking the inevitable
question gets a hurt pull-back and then GO / NOT TONIGHT; the next morning the gift — if any — is the player's own
verb, never her price. The trap is that nobody ever names a number.

**How it works.**
- Her entry carries `from: 40` (a nightTurn) and `sandbox: true`, so `_npcActive` keeps her off the opening night
  and off the floor before ten.
- Her verbs reroute: BARFINE/ask (`_doBarfine` → `_chamAsk`), BUY DRINK (`_chamDrink`, a plain cocktail at
  `_beerPrice`), FLIRT (`_doSocial` → `_chamFlirt`), CONTACT (`_chamContact`, which after three nights at her table
  says sideways that the question is the door). `_chamSeen` logs the nights.
- `_chamAsk` arms `G.pendingChoice = "cham"`; GO is `_chamGo` (her LINE, a conquest through `_conquestHappy`, then
  `_endNight("cham")`); NOT TONIGHT is `_chamDecline` (her LINE, no night).
- At the wake `_chamMorning` (called in `_endNight`) arms `chamgift`; `_chamGift(amt)` takes GIFT <amount> or
  NOTHING, prompts a white knight with `CHAM_GIFT`, and records `G.chamLast` so she can be asked about the night.
- `_chamTick` (on arrival in `_arriveAt`) sends white-coat selfies and, once, the wrong-papa slip (`chamSlip`).

**State.** `G.chamDays`, `G.chamNight`, `G.chamGifts`, `G.chamLast`, `G.chamContactDay` (per life); nightly
`G.soc.chamDrinks`; flags `chamAsked`, `chamDone`, `chamSlip`.

**Constants.** `CHAM_GIFT` (the "gift" a man gives a girl who never does this).

**Touches.** `barfine` (the BARFINE verb routes her first), `phone` (her LINE and texts), the happiness treadmill
(`_conquestHappy`). Both modals must stay wired in the parser intercept, `_renderResume`, the chip set and completion.

**Tests.** chameleon.test.js, round72.test.js, round56.test.js, round63.test.js, round76.test.js, world.test.js,
saveload.test.js; tools/modal-audit.mjs (gated by modal-audit.test.js) covers both prompts.

**Design docs.** docs/essay-ledger.md, docs/design-backlog.md.

<!-- facts: cream -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Prompts (`G.pendingChoice` and the like):** `cham` · `chamgift`
> **Soak counters:** `cream.night`
> **People:** `cream`
> **Code named above, by file:** engine-core.js — `_beerPrice`, `_npcActive` · engine-play.js — `_conquestHappy`, `_doSocial`, `_endNight` · engine-systems.js — `_chamAsk`, `_chamContact`, `_chamDecline`, `_chamDrink`, `_chamFlirt`, `_chamGift`, `_chamGo`, `_chamMorning`, `_chamSeen`, `_chamTick`, `_doBarfine` · engine-parser.js — `_arriveAt`, `_renderResume`
<!-- /facts -->

### The Bangkok arc: Sao (`sao`)
<!-- system: sao -->

**What it is.** An expat-only, once-a-game arc about the savior complex turned round. Sao is a Bangkok visitor met on
a Pattaya pavement who gives the player her number; weeks of texts later her family's car takes him to dinner across
the river, where the old money at the table reads him kindly and completely. Nothing mechanical collapses — the payoff
is the room, read.

**How it works.**
- The meeting is the `bkktourist` street encounter: manners (not money) win a moment, and in the expat stage
  (`expatLife`, not yet `bkkArcDone`) she types her number in herself — `G.phone.contacts.sao`, `G.bkk` at stage 1.
- `_bkkArcTick` (on arrival, `_arriveAt`) moves the story on a realistic clock: stage 2 the coffee text three to five
  nights on, stage 3 the invitation a week or so later naming the computed weekday (`WEEKDAYS`), stage 4 the car at
  your hotel the next night, which arms `G.pendingChoice = "bkkdinner"` via `_bkkDinnerPrompt`.
- DECLINE (`_bkkDecline`) closes the arc. GO (`_bkkGo`) is the dinner scene (a white knight's version differs) and arms
  `bkkbill`; `_bkkBill(grab)` — reaching for the bill costs reputation (`_repHit`), letting it be is `_repGain` — then
  `_endNight("bkkdinner")`.
- Sao is `offmap`, so `_npcActive` never stands her in a room; MESSAGE SAO goes to `_saoReply`, which answers by stage
  and remembers what you told her (`askedPat`/`heardPat` on `G.bkk`).

**State.** `G.bkk` ({met, stage, coffee, invite, went, …}, per life), flag `bkkArcDone`, `G.phone.contacts`.

**Constants.** None of its own.

**Touches.** `phone` (her texts and replies), `encounters` (`bkktourist`), `expat-month` (gated on the expat
stage). Both modals are wired the standard five ways; a new beat must not arm over another pending gate.

**Tests.** sao.test.js, round55.test.js, round75.test.js, towntalk.test.js, saveload.test.js; tools/modal-audit.mjs
covers both prompts.

**Design docs.** docs/essay-ledger.md.

<!-- facts: sao -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Prompts (`G.pendingChoice` and the like):** `bkkdinner` · `bkkbill`
> **Soak counters:** `sao.text`
> **People:** `sao`
> **Code named above, by file:** engine-core.js — `_npcActive`, `_repGain`, `_repHit` · engine-play.js — `_endNight` · engine-systems.js — `_bkkArcTick`, `_bkkBill`, `_bkkDecline`, `_bkkDinnerPrompt`, `_bkkGo`, `_saoReply` · engine-parser.js — `_arriveAt`
<!-- /facts -->

### The Orchid Room and Notty's (`orchid`)
<!-- system: orchid -->

**What it is.** Two doors you cannot simply walk through. The Orchid Room is the group's members-only back room off
the Pink Lotus — the one place Laurent Vasseur (id `powers`) is ever seen, and where the good table turns out to be
Tan's. Notty's Place is a gentlemen's villa in Naklua behind an unmarked door that opens only on a name. Around them
stand Kesinee, the Kitten Corner mamasan who reads the player's origin, and Gavin, the group's man on the rail.

**How it works.**
- Gates live in `_arriveAt`, so walking, TRAVEL and a bike all hit them: the Orchid Room refuses below group standing
  2 (`_faction`, `_ORCHID_BOUNCER`), and the room carries `invite: true` so every route says you are taken there;
  Notty's refuses unless `_nottysOpen` (sent by Candy `orchidSent`, vouched by Rose `orchidVouched`, reported to Doyle
  `orchidReported`, or owning / having sold a bar) with `_ORCHID_CLUB_UNKNOWN`.
- Quests: `orchid_intro` (Candy → Rose, done on `orchidVouched`) and `orchid_recon` (Doyle's trust-gated vignette:
  eyes on the good table, done on `orchidReported`).
- Inside the Orchid Room, `_describeRoom` calls `_tanOrchidReveal` once `tanSuspected` is set — the reveal sets
  `tanRevealed`. TALK to the corner-table men is `_ORCHID_DEFLECT`; social verbs and BARFINE are refused
  (`_ORCHID_NOTOUCH`).
- The room is on `_PLG_ROOMS` (the group's paper) and never carries a stream camera.

**State.** `G.faction` (read), flags `orchidSent`, `orchidVouched`, `orchidReported`, `tanSuspected`, `tanRevealed`,
`G.quests`.

**Constants.** `_PLG_ROOMS` (engine-core.js).

**Touches.** `quests`, the factions (`_align` moves group standing elsewhere), `soi6-stream` (excludes this room), the
paper by the till (`_PLG_ROOMS`). A new route into either room must go through `_arriveAt` or it skips the door.

**Tests.** engine.test.js, journal.test.js, reachability.test.js, conversation.test.js, round47.test.js,
round58.test.js, playtest5.test.js.

**Design docs.** docs/factions-thai.md, docs/guardrails.md.

<!-- facts: orchid -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Soak counters:** `orchid.entered`
> **People:** `kesinee` · `gavin` · `powers`
> **Rooms:** `orchid_room` · `nottys_place`
> **Code named above, by file:** engine-core.js — `_PLG_ROOMS`, `_align`, `_describeRoom`, `_faction`, `_nottysOpen` · engine-play.js — `_ORCHID_NOTOUCH` · engine-systems.js — `_tanOrchidReveal` · engine-parser.js — `_ORCHID_BOUNCER`, `_ORCHID_CLUB_UNKNOWN`, `_ORCHID_DEFLECT`, `_arriveAt`
<!-- /facts -->

### The digital barstool (`soi6-stream`)
<!-- system: soi6-stream -->

**What it is.** Nine bars put their floor on a live stream: the group's four Soi 6 rooms with a proper camera, and five
independent beer bars with a phone or tablet on a stand. A drink or a bell bought through the link from anywhere
pays her the stool's cut and buys your handle said to a lens — no bond. While a big tipper is
online the girls would rather work the camera than the stools, which is the tension the system exists for.

**How it works.**
- A room opts in with `stream` (`"pull"` for the Jade Lounge, whose tipper is online most nights); `_streamBar`,
  `_camDev` (phone or tablet) read it.
- Tippers: `_whaleOf` deals the five `_STREAM_WHALES` round the camera bars in a nightly shuffled order (pure `_hm`
  hash); `_whaleOn` says whether the room's tipper is online this hour (20:00 to before one).
- `_atCamera(id)` decides a hostess is at the lens this hour — never one on your arm or at her-farang tier, and not
  while a match (`G.soc.streamWon`) or your bell (`G.soc.streamBell`) holds for ten turns. A girl at the camera answers
  TALK with `_streamBusy`, takes a lady drink and goes back (`_streamAfterDrink`), and refuses the barfine.
- Remedies: TIP her `STREAM_MATCH` (`_streamTip`) or RING THE BELL (`_streamBell`). `_whaleBellTick` has the tipper ring
  it himself, sending the floor to the camera.
- `_streamTick` (from `_tick`) toasts handles to the lens; `_streamDescribe` paints the corner.
- Remote: WATCH STREAM (`_doWatchStream`), STREAM DRINK (`_doStreamDrink`, `_ladyPrice` from the account) and STREAM
  BELL (`_doStreamBell`, `_bellPrice`, confirm-before-ring via `G.askArm`) work on channels you know
  (`_streamRoomsKnown`); one สนุก a night (`G.soc.streamJoy`). Your handle is `_myHandle`.

**State.** `G.streamDrinks`, `G.streamBells`, `G.streamSpent` (per life, ledger-named); nightly `G.soc.streamWon`,
`G.soc.streamBell`, `G.soc.streamAway`, `G.soc.whaleBellAt`, `G.soc.streamLast`, `G.soc.streamJoy`.

**Constants.** `STREAM_MATCH` (his price a song); `_STREAM_WHALES`.

**Touches.** `barfine` (the camera refusal), `ladydrinks` and `bell` (`_bellPrice`), `phone` (battery), the morning
ledger. A new hash keyed on the day must use `_hm`, not `_hh`, or consecutive nights collapse to one result.

**Tests.** stream.test.js, round103.test.js, round104.test.js, round107.test.js, round108.test.js; tools/composition-audit.mjs's stream state (gated by
composition-audit.test.js).

**Design docs.** none.

<!-- facts: soi6-stream -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `stream` · `watch`
> **Rooms:** `pink_lotus` · `golden_dragon` · `jade_lounge` · `peach_lounge` · `lucky_tiger` · `the_bucket` · `honey_trap` · `gold_rush` · `dollhouse`
> **Code named above, by file:** engine-core.js — `_bellPrice`, `_hm`, `_ladyPrice`, `_tick` · engine-systems.js — `_STREAM_WHALES`, `_atCamera`, `_camDev`, `_doStreamBell`, `_doStreamDrink`, `_doWatchStream`, `_myHandle`, `_streamAfterDrink`, `_streamBar`, `_streamBell`, `_streamBusy`, `_streamDescribe`, `_streamRoomsKnown`, `_streamTick`, `_streamTip`, `_whaleBellTick`, `_whaleOf`, `_whaleOn` · world.js — `_hh`
<!-- /facts -->

## The resident and the owner

The money of a life lived here and the long game: the month, the jobs, the condo, buying and running the bar, procurement, the staff affair, the heist and the paper by the till.

### Money: the ATM, the account, Nont's CASH, SEND (`money`)
<!-- system: money -->

**What it is.** The player's two balances — the pocket and the bank account — and every door between them: the street ATM, Nont's cash-out table at the Old Market, and the phone's banking app that sends money to a contact. It exists so money has friction (fees, a cap, a lost card) and every baht that moves is named on the morning ledger.

**How it works.**
- WITHDRAW at an `atm` room: `_doWithdraw` wraps `_doWithdrawInner`, which needs the wallet or the replacement card, composes thousands only, enforces `_atmCap()` against `_atmDrawnToday()`, and charges `_atmFee()` to the account, never the pocket. A resident's Thai account (`G.thaiAccount`) pays no fee and has the higher cap.
- CASH at Nont's table: `_nontCash` moves account → pocket at `NONT_CUT`, no cap, no card needed; one transfer in six (pure `_hh` hash) "has a moment" and is held in `G.nontStuck` until the next wake.
- SEND <amount> TO <name>: `_doSendMoney` draws on the account only. Tan and Sao send it back; a big gift (`GIFT_BIG`) below regular is returned or written into `G.owed`; otherwise it buys bond and may settle a care ask (`_careSent`) or a money-ask (`_askPaid`).
- The accountant's call: `_acctDue`/`_acctCall` (dispatched from `_tick` at your own bar) fire after `ACCT_THRESHOLD` has gone through Nont, halving `_atmCap()` for `ACCT_REVIEW_DAYS`; `_acctNote` explains the halving.
- The `sighting` modal (`_sightingDue`, `_sighting`): after you paid an up-country ask, she is seen across town with another farang.
- `_bankIn` is the one way money lands in the account and is counted as arrived; `_morningLedger` reads the counters below.

**State.** For life: `G.money`, `G.bank`, `G.thaiAccount`, `G.atmTotal`, `G.atmFees`, `G.nontOut`, `G.nontCut`, `G.nontStuck`, `G.sentTotal`, `G.acctUntil`, `G.acctDay`, `G.acctBase`, `G.acctWhy`. Per day: `G.atmDay`, `G.atmToday`. Nightly: `G.soc.given`, `G.soc.sighting`.

**Constants.** `ATM_FEE` (foreign-card fee), `ATM_DAILY_CAP` / `THAI_ATM_CAP` (tourist vs resident cap), `NONT_CUT` (his five percent), `GIFT_BIG`, `ACCT_THRESHOLD`, `ACCT_REVIEW_DAYS`, `ACCT_GAP_DAYS`, `CCIB_LOUD_MONEY` (a big move during the heist's window is loud).

**Touches.** `expat-month` (the paper decides `G.thaiAccount`; income lands via `_bankIn`), `heist` (`_ccibLoud("money")`), `laundering` (Pre-Sale also halves the cap), `act1` (no card, no ATM). A new money counter must be read by `_morningLedger`, or the money audit goes red.

**Tests.** tests/js/nont.test.js, money-audit.test.js (gates `tools/money-audit.mjs`), research.test.js, round73.test.js, paper.test.js.

**Design docs.** docs/economy-review.md (an early price review; partly superseded).

<!-- facts: money -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `withdraw` · `cash` · `send`
> **Prompts (`G.pendingChoice` and the like):** `sighting`
> **Soak counters:** `money.spent`
> **People:** `nont`
> **Code named above, by file:** engine-core.js — `_bankIn`, `_tick` · engine-play.js — `_morningLedger` · engine-systems.js — `_acctCall`, `_acctDue`, `_askPaid`, `_careSent`, `_ccibLoud`, `_doSendMoney`, `_nontCash`, `_sighting`, `_sightingDue` · engine-parser.js — `_acctNote`, `_atmCap`, `_atmDrawnToday`, `_atmFee`, `_doWithdraw`, `_doWithdrawInner` · world.js — `_hh`
<!-- /facts -->

### The resident's month (`expat-month`)
<!-- system: expat-month -->

**What it is.** Once the player stays (CANCEL THE TICKET or MOVE TO PATTAYA), the game runs on a 30-day clock: what his origin lives on lands on a payday, the month's spending is summed, and a gauge says how many nights a week he can afford. The origin is the difficulty setting. Below it is destitution: three roofless mornings bring the consulate's plane, which he may refuse for a bench.

**How it works.**
- `_goExpat` sets `G.stage`, wires `EXPAT_SAVINGS`, starts `G.payDay`, and sets `G.paper` from `_paperBase()` (the bank book follows the paper).
- At the wake, in `_endNight`'s fixed order: `_chargeRent` → `_jobNight` → `_incomeTick` → `_barSettle` → `_destituteTick` → `_morningLedger`, then the month line. Changing this order moves money between ledgers.
- `_incomeTick` (when `_incomeDue()`): `_bankIn` the origin's income (`_incomeAmount`; a retainer shrinks by `_roughFactor()`), charges `PAPER_COST`, pays the job (`_jobPay`), bills the condo (`_condoMonth`), writes `G.monthLine`, closes `G.month` into `G.monthClosing`.
- MONEY/BUDGET is `_doMoney`: paper, job, debts (`_debtsOwed`, `_debtsLine`), and `_nightsAWeek` or `_weeksLeft`.
- `_chargeRent` stamps `G.roofless` when the book is at its cap; `_destituteTick` counts consecutive roofless mornings (an owner is exempt). Morning one may offer the `keptby` modal from `_bestWoman` (`_keptByYes`: `KEPT_BY_NIGHTS` on her mat). Morning `DESTITUTE_DAYS` arms the `embassy` modal: TAKE THE PLANE → `_gameEnd("repatriated")`; STAY → `_embassyStay`, the bench.
- On the bench `_streetMorning` runs each wake (the sweep at `STREET_SWEEP_PCT`, the plane again every `STREET_REOFFER` days) until a payday covers a room or `_streetCheckIn` pays the desk; both end in `_streetOff`. Henning is the man already on the bench.

**State.** For life: `G.payDay`, `G.payCount`, `G.month` (spent, rent, rough, days), `G.monthClosing`, `G.paper`, `G.paperUntil`, `G.roofless`, `G.destitute`, `G.destituteDay`, `G.keptBy`, `G.keptByUsed`, `G.keptOffer`, `G.keptByLog`, `G.street`, `G.streetDone`, `G.roomPrepaid`, `G.roomNight`, `G.endKind`.

**Constants.** `ORIGIN_MONEY` (bank, income, kind, paper per origin), `INCOME_DAYS`, `NIGHT_COST` (the gauge's unit), `RETAINER_ROUGH`, `PAPER_COST`, `PAPER_GRACE`, `DESTITUTE_DAYS`, `KEPT_BY_NIGHTS`, `EMBASSY_LOAN`, `STREET_REOFFER`, `STREET_SWEEP_PCT`, `SOI6_BANK`.

**Touches.** `money` (`G.thaiAccount`), `expat-jobs` and `expat-condo` (both paid or billed inside `_incomeTick`), `hotels` (`_chargeRent`, the downgrade ladder), `barbooks` (an owner is never destitute). `_monthRoom` inside `_chargeRent` feeds the month's rent; a new roof that bills elsewhere must feed `G.month` itself.

**Tests.** tests/js/income.test.js, destitute.test.js, paper.test.js, round97.test.js, round98.test.js, round100.test.js, round101.test.js, round104.test.js, round109.test.js; `tools/modal-audit.mjs` (the `keptby` and `embassy` recipes).

**Design docs.** none.

<!-- facts: expat-month -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `money` · `budget`
> **Prompts (`G.pendingChoice` and the like):** `keptby` · `embassy`
> **People:** `henning`
> **Code named above, by file:** engine-core.js — `_bankIn`, `_chargeRent`, `_monthRoom` · engine-play.js — `_bestWoman`, `_condoMonth`, `_debtsLine`, `_debtsOwed`, `_destituteTick`, `_doMoney`, `_embassyStay`, `_endNight`, `_goExpat`, `_incomeAmount`, `_incomeDue`, `_incomeTick`, `_jobNight`, `_jobPay`, `_keptByYes`, `_morningLedger`, `_nightsAWeek`, `_paperBase`, `_roughFactor`, `_streetCheckIn`, `_streetMorning`, `_streetOff`, `_weeksLeft` · engine-systems.js — `_barSettle`, `_gameEnd`
<!-- /facts -->

### Jobs (`expat-jobs`)
<!-- system: expat-jobs -->

**What it is.** A resident can teach online, manage a bar, take a school contract, or sell leads to Mort's column. Every job is a presence trade (nights or mornings), the proper ones carry a work permit and so the Thai bank book, and a manager can be sacked for turning the floor against him.

**How it works.**
- TEACH ONLINE (`_doTeach`, from your own room): `G.job` kind teach, paid `TEACH_PAY` scaled by `_roughFactor()`.
- The manager: ASK the mamasan or manager ABOUT A JOB → `_jobOffer` (needs a woman of that floor at regular; refuses a bar in `G.firedBars`, a sacking inside `_mgrBanDays`, or a flagged paper). TAKE THE JOB → `_takeJob`. A company bar (`_companyBar`) pays through the books; any other pays an envelope.
- WORK at the job bar → `_mgrShift`; `_tick` counts `G.job.shiftStood`. At the wake `_jobNight` counts a stood night (`WORK_MIN_STOOD`), grants the permit after `MGR_PERMIT_AFTER`, rolls the wrong-paper incident (`MGR_INCIDENT_PCT`: a fine and the job, never jail), and counts short weeks (`MGR_STRIKES`).
- Floor trouble: `_jobTrouble(kind)` (another bar's woman brought in, an insult to his girl, security walking him out) is counted once a night inside `MGR_TROUBLE_DAYS`; at `MGR_COUNSEL` the mama's word is said by `_jobCounselTick`; the next trouble, or being kicked out, is `_jobFire`: keys back, `G.jobFired`, `G.firedBars`, permit to grace.
- A man who owned a bar is asked what it was when it went (`G.barSale`, from `barchain`): under water — sold or lost for the rent — and no floor hires him (`_SANK_BAR_NO`); about even and he waits `BAR_SALE_COOL` days; making money and the offer is `BAR_SALE_PREMIUM` over the rate, kept on `G.job.prem` and paid by `_mgrPay`.
- The school: Jerry's node sets `G.jobOffer`; `_jobNight` counts weekday lates. The stringer: Mort's node sets `G.stringer`; `_stringerPay` pays for fixtures read (`_stringerOwed`).
- `_jobPay` on the payday: the platform, school and company into the account; a cash bar's envelope waits as `G.envelopeDue`, handed over by staff at the bar.
- At the job bar: `_atJobBar`, `_onShift`, `_jobBarStaff`, `_myFloorGirl` (no barfine of his own girls, `_JOB_BARFINE_NO`; his drinks are the house's).

**State.** For life: `G.job`, `G.jobOffer` (till dawn), `G.jobFired`, `G.firedBars`, `G.jobQuit`, `G.envelopeDue`, `G.stringer`, `G.jobPaid`, `G.paperFlag`; nightly `G.soc.jobHello`.

**Constants.** `TEACH_PAY`, `MGR_CASH_PAY`, `MGR_CASH_NIGHTS`, `MGR_PERMIT_PAY`, `MGR_PERMIT_NIGHTS`, `MGR_PERMIT_AFTER`, `MGR_INCIDENT_PCT`, `MGR_STRIKES`, `MGR_COUNSEL`, `MGR_TROUBLE_DAYS`, `MGR_UNHIRABLE` (ban days by `_repTier`), `MGR_FIRED_NEWS`, `SCHOOL_PAY`, `SCHOOL_LATES`, `OWL_LEAD_PAY`, `OWL_LEADS_WEEK`, `PAPER_FLAG_DAYS`.

**Touches.** `expat-month` (pay, paper), `barfine` and `party` (`_myFloorGirl` gates both; `_partyArrive` reports "brought"), `police` (rep sets the ban). A verb his own floor treats differently must read `_atJobBar()`/`_jobBarStaff()`.

**Tests.** tests/js/paper.test.js, school.test.js, mgrfloor.test.js, rulings1022.test.js, round100.test.js, round102.test.js, deferred1024.test.js, predicates.test.js, round109.test.js.

**Design docs.** docs/bar-ownership-structures.md (the ฿2m-per-permit company grid).

<!-- facts: expat-jobs -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `teach` · `take` · `quit`
> **Predicates:** `_atJobBar()` · `_jobBarStaff()`
> **People:** `david` · `mort` · `waen`
> **Code named above, by file:** engine-core.js — `_atJobBar`, `_jobBarStaff`, `_myFloorGirl`, `_onShift`, `_repTier`, `_tick` · engine-play.js — `_SANK_BAR_NO`, `_companyBar`, `_doTeach`, `_jobCounselTick`, `_jobFire`, `_jobNight`, `_jobOffer`, `_jobPay`, `_jobTrouble`, `_mgrBanDays`, `_mgrPay`, `_mgrShift`, `_roughFactor`, `_stringerOwed`, `_stringerPay`, `_takeJob` · engine-systems.js — `_JOB_BARFINE_NO`, `_partyArrive`
<!-- /facts -->

### The condo (`expat-condo`)
<!-- system: expat-condo -->

**What it is.** A resident can trade the hotel's nightly folio for a studio on Pratumnak Soi 5, rented by the month. It is cheaper to live in, has a kitchen and a pool, charges no joiner fee, and turns the flat into a place a woman can wake up in and remember.

**How it works.**
- The condo is a `_HOTELS` entry with `monthly: true`, so `_chargeRent` skips it and the checkout and downgrade ladder never list it.
- RENT A CONDO at `pratumnak_soi5` → `_doRentCondo`: the first ask prints the terms and arms `G.askArm`; the same command next turn signs, taking `CONDO_DEPOSIT_MONTHS` of deposit plus a month in advance (account first). Elsewhere it prints `_condoPointer()`.
- On the payday `_incomeTick` calls `_condoMonth`: rent plus electric, or a short month; `CONDO_GRACE` short months running and the lock changes, deposit forfeit, bag to the Sabai.
- MOVE OUT → `_doMoveOut`, also asking once; inside `CONDO_LEASE` days the deposit is kept.
- COOK/EAT in `condo_room` is inside `_doEat` (`CONDO_MEAL` a plate, two with a woman present, recorded on `G.homeSeen`).
- `_joinerFee` on a condo only sets a guest flag; `_condoWake` prints the juristic office's word once.
- A woman who wakes there: `_endNight` writes `G.homeSeen`; the `my_flat_seen` town row is her memory. `_inCondo`, `_homeWord` and `_homeSaid` make every "home" line (rides, sleep, codas) name the flat.

**State.** For life: `G.condo` (since, deposit, short, guestPending, guestsTold), `G.hotel` (`"condo"`), `G.condoPaid`, `G.condoTermsRead`, `G.homeSeen`, `G.flatTold`, `G.monthAdj` (the deposit held, not spent).

**Constants.** `CONDO_RENT`, `CONDO_UTIL`, `CONDO_DEPOSIT_MONTHS`, `CONDO_GRACE`, `CONDO_LEASE`, `CONDO_MEAL`.

**Touches.** `expat-month` (billed on the payday; `_roofMonth` drives the gauge; a tenant cannot be roofless until evicted), `hotels`, `party`/`barfine` (her night there is remembered). A new "go home" line anywhere must read `_inCondo()` or it will name a hotel the player left.

**Tests.** tests/js/condo.test.js, round100.test.js, round101.test.js, round102.test.js, round97.test.js, predicates.test.js.

**Design docs.** none.

<!-- facts: expat-condo -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `rent` · `move` · `cook`
> **Predicates:** `_inCondo()`
> **Rooms:** `condo_room` · `pratumnak_soi5`
> **Code named above, by file:** engine-core.js — `_HOTELS`, `_chargeRent`, `_homeSaid`, `_homeWord`, `_inCondo` · engine-play.js — `_condoMonth`, `_condoWake`, `_doMoveOut`, `_doRentCondo`, `_endNight`, `_incomeTick`, `_joinerFee`, `_roofMonth` · engine-systems.js — `_doEat` · engine-parser.js — `_condoPointer`
<!-- /facts -->

### Buying the bar (`barchain`)
<!-- system: barchain -->

**What it is.** The expat stage's long goal: owning the Stinky Pinky. It is a chain of quests, a partner decision, a deposit and a lease, and it ends either in the bar being lost (`barbooks`) or, through the staff affair, sold for a way out. The player can never afford a bar outright; the sale is seller-financed, and a foreigner needs a Thai 51% partner.

**How it works.**
- Quests (pure data, `doneFlag` style): `plg_deal` → `bar_premises` (Bert) → `bar_licence` (Wayne, needs `nominee_deal`) → `bar_partner` → `bar_opening` (needs `barPaid`). All gated on `expatLife`, set by `_goExpat`.
- The 51% fork: asking Candy or Tan arms the `partner` modal (`G.partnerWho`, `_partnerPrompt`). `_partnerYes` sets `barPartner` plus `partnerTan` or `partnerCandy` and moves faction standing via `_align`; Candy's route bills `LAWYER_FEE`. `_partnerNo` is free.
- The deposit: `_barDepositDue` on arrival at the Stinky → `_barDeposit` takes `BAR_DEPOSIT` from account then pocket, sets `barPaid`, sets the note, says the rent out loud, then `_leaseAsk` states key money by season. PAY KEY MONEY (`_leaseCash`, notes at a discount) or TRANSFER KEY MONEY (`_leaseTransfer`); unpaid, it is billed with the first rent.
- Tan's favour (`partnerTan` only): `_tanFavourDue` in `_tick` → `_tanFavour` arms `tanfavour`; `_tanFavourYes`/`_tanFavourNo`, once ever, refusing costs nothing.
- The exit: when the affair offers it, SELL UP → `_doSellBar` → `sellbar` modal → `_sellBarYes` (`AFFAIR_SALE` banked, `barSold`) → `_gameEnd` → `gameend` modal: VISIT PATTAYA (`_visitPattaya`, `_visitHome` after a week) or START OVER.
- Selling it on: SELL UP without the affair's door → nobody buys before the bar has traded `BAR_SALE_MIN` nights (`_barSellable`; BOOKS counts them down; her door is exempt) → `_doSellBar` arms the `barsale` modal (`_barSalePrompt`: the three offers and nothing else — the debts, the till and the season read are settled on the paper and named in the morning ledger). `_barHealth` reads the whole ownership (`G.bar.perf`, which `_barNight` adds every night to: the margin scaled from that night's season to the year's mean, fixed costs left fixed, Nont's cut left out) as an ordinary month against rent and the note: `under` below `BAR_SALE_UNDER` or with the rent behind or two months on the note, `profit` at `BAR_SALE_PROFIT` with nothing owing, `even` between. `_barSaleDo(via)`: every buyer clears the note, the arrears, the rent and Nont; the till comes with the seller. **PLG** pays `BAR_SALE_PLG[health]` over the debts, and the soi turns: `rep` down `BAR_SALE_REP`, indie and samson down, trust down for `_plgSore()` (Bert's rail, `_bertRail()`, and the White Rabbit), Bert to the Vic (`movesTo` on `barToPlg`). **TAN** pays the seller nothing but the till; the same figure is Tan's fee, named, and syndicate standing and Tan's trust drop. **BERT** (`_barSaleBertOk`: not under water, Bert at the Stinky) takes the note over with Candy as the fifty-one — the deposit and a fifty-one that was not hers were why he never bought it — and pays `BAR_SALE_BERT[health]` less the arrears and Nont; indie and rep up, the rail warm. `G.barSale` records the sale (`_barLost` writes one too, as `lost`/`under`), and the sale ends on one sentence of how it was run, and `_jobOffer` reads it — a bar sold standing up is the reference a girl's word would otherwise be: under water is never a manager, about even waits `BAR_SALE_COOL` days, a bar sold making money is offered `BAR_SALE_PREMIUM` over the rate (`_mgrPay`).
- `_barOwned()` and `_atOwnBar()` are the predicates the rest of the game reads; `_barGone()` (lost, sold to the sea or sold on) gates every owner's line after.

**State.** Flags `barPartner`, `partnerTan`, `partnerCandy`, `barPaid`, `barOpen`, `tanAsked`, `barSold`, `barSoldOn`, `barToPlg`, `barToBert`. For life: `G.bar` (room, owed, lease, rentFree, pocketDrawn, perf), `G.barSale`, `G.partnerWho`, `G.tanFavourDay`, `G.lifeStats`, `G.endKind`, `G.visitUntil`.

**Constants.** `BAR_PRICE`, `BAR_DEPOSIT`, `BAR_MONTHLY`, `LEASE_KEY_MONTHS`, `LEASE_CASH_OFF` (by season), `LEASE_WET_FREE`, `LAWYER_FEE`, `COFFEE_PRICE`, `AFFAIR_SALE`, `BAR_SALE_MIN`, `BAR_SALE_UNDER`, `BAR_SALE_PROFIT`, `BAR_SALE_PLG`, `BAR_SALE_BERT`, `BAR_SALE_REP`, `BAR_SALE_COOL`, `BAR_SALE_PREMIUM`.

**Touches.** `barbooks` (everything after opening), `procurement` (Tan's route unlocks the jobs), `affair` (its door is the sale that ends the game), `expat-jobs` (`G.barSale` decides whether a floor hires the seller), `money` (the deposit is a transfer, never an ATM pull; a sale's money lands through `_bankIn`). Tests that call `_barDeposit()` directly must settle the lease or expect key money on the first rent.

**Tests.** tests/js/barchain.test.js (a scripted playthrough — the soak cannot climb a quest chain), barsale.test.js, round109.test.js, round40.test.js, round41.test.js, round22.test.js, round55.test.js, world.test.js; `tools/modal-audit.mjs`.

**Design docs.** docs/bar-ownership-structures.md, docs/factions-thai.md, docs/bar-failure-cycle.md.

<!-- facts: barchain -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `transfer`
> **Prompts (`G.pendingChoice` and the like):** `partner` · `tanfavour` · `sellbar` · `barsale` · `gameend`
> **Quests:** `plg_deal` · `plg_flip` · `orchid_recon` · `nominee_deal` · `bar_premises` · `bar_licence` · `bar_partner` · `bar_opening`
> **Soak counters:** `tan.favour.asked`
> **Predicates:** `_atOwnBar()`
> **People:** `bert` · `wayne` · `gavin` · `candy` · `tan`
> **Rooms:** `stinky_bar`
> **Code named above, by file:** engine-core.js — `_align`, `_bankIn`, `_tick` · engine-play.js — `_goExpat`, `_jobOffer`, `_mgrPay` · engine-systems.js — `_atOwnBar`, `_barDeposit`, `_barDepositDue`, `_barGone`, `_barHealth`, `_barLost`, `_barNight`, `_barOwned`, `_barSaleBertOk`, `_barSaleDo`, `_barSalePrompt`, `_barSellable`, `_bertRail`, `_doSellBar`, `_gameEnd`, `_leaseAsk`, `_leaseCash`, `_leaseTransfer`, `_partnerNo`, `_partnerPrompt`, `_partnerYes`, `_plgSore`, `_sellBarYes`, `_tanFavour`, `_tanFavourDue`, `_tanFavourNo`, `_tanFavourYes`, `_visitHome`, `_visitPattaya`
<!-- /facts -->

### Running the bar (`barbooks`)
<!-- system: barbooks -->

**What it is.** The owner's economy. WORK declares a shift on your own rail: a stood night roughly doubles the take and is where your staff get to know you, but it costs the night on the soi. The books settle every morning, rent and the old man's note bill every thirty days, and the bar can be lost — a trade-off with no single right answer.

**How it works.**
- WORK → `_doWork` sets the shift. `_workPresenceTick` (in `_tick`) counts stood turns; under `WORK_MIN_STOOD` the night settles as Bert's. While stood: `_workFloor` floor moments (`_floorReveal` decides reveal vs everyday line), `_shiftDue`/`_shiftAsk` deal one `shift` call a night from `SHIFT_CALLS` (`_shiftYes`/`_shiftNo`; money never taken goes through `_shiftLost`), and `_workTaleTick` tells the night's tale.
- At the wake `_barSettle`: `_tabDueTick`, `_keptTick`, then `_barNight` — take = base × worked/away × season × affair drag × `BAR_MARKUPS` × rail lost, less nut, stock, wages, procurement and Nont's garnish; a negative till is topped from the pocket into `G.bar.pocketDrawn`. Then `_barMonthly` (rent first, then the note; rent review), `_barArrearsTick` (→ `_barLost` by landlord or partner), `_noticeCheck`/`_noticeTick`.
- BOOKS (`_doBooks`) reads `G.bar.lastLines`. PRICES (`_doPrices`) and TERMS (`_doTerms`) are the two levers; DRAW (`_doDraw`) and `_putInTill` move money between pocket and till; `_ownStock` makes your own drinks cost the till, not the pocket.
- BORROW at Nont's is `_nontLoan` (garnished nightly); `_oppTick` shows the bar opposite. The kept girl: `_keptTick` pays `KEPT_FEE`, then `_keptDue` → `keptgirl` modal (`_keptYes`/`_keptNo`).

**State.** `G.bar` for life (cash, owed, arrears, rentOwed, rentShort, rentUp, markup, terms, loan, notice, gone, kept, lastLines, workedDay, stoodTurns); `G.syn` friction is read here.

**Constants.** `BAR_TAKINGS`, `BAR_SWING`, `BAR_PRESENT`, `WORK_TAKINGS`, `AWAY_TAKINGS`, `BAR_NUT`, `BAR_COGS`, `BAR_WAGES`, `BAR_MGR_NIGHT`, `BAR_FRICTION`, `BAR_RENT`, `RENT_MULT`, `RENT_GRACE`, `BAR_ARREARS_WARN`, `BAR_ARREARS_BITE`, `BAR_ARREARS_END`, `BAR_SHORT_STAFF`, `BAR_RENT_REVIEW`, `BAR_RENT_GOOD`, `BAR_RENT_RISE`, `BAR_RENT_CAP`, `BAR_MARKUPS`, `BAR_SALARY_NIGHT`, `BAR_FLOOR_FLOOR`, `BAR_NOTICE_DAYS`, `BAR_RAIL_SHARE`, `BAR_RAIL_DAYS`, `NONT_LOAN_RATE`, `NONT_LOAN_GARNISH`, `OPP_CYCLE`, `KEPT_FEE`, `KEPT_AFTER_NIGHTS`, `KEPT_SILENT_DAYS`, `WORK_FLOOR_MAX`, `WORK_FLOOR_GAP`, `FLOOR_REVEAL_ODDS`.

**Touches.** `weather` (the season curve: `_seasonTakingsOn` grades the night played, not the morning), `procurement` (friction loads nut and stock), `affair` (drag; `_affairNight` runs inside `_barSettle`), `money` (the morning ledger excludes `pocketDrawn`). A test calling `_doWork()` then `_barSettle()` must set `stoodTurns` and advance the day, as the real path does.

**Tests.** tests/js/barchain.test.js, round54.test.js, research.test.js, quietshift.test.js, round40.test.js, round41.test.js, round70.test.js, round95.test.js, engine.test.js; `tools/money-audit.mjs`.

**Design docs.** docs/bar-failure-cycle.md, docs/economy-review.md.

<!-- facts: barbooks -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `work` · `books` · `draw` · `prices` · `terms`
> **Prompts (`G.pendingChoice` and the like):** `shift` · `keptgirl`
> **Soak counters:** `bar.night.settled` · `bar.night.worked` · `bar.shift.declared` · `bar.floor.moment` · `bar.shift.called` · `bar.shift.lapsed` · `bar.month.paid` · `bar.rent.missed` · `bar.lost` · `bar.opposite.seen` · `bar.rent.rose` · `bar.notice.given` · `bar.girl.gone` · `bar.nont.loan`
> **Rooms:** `stinky_bar`
> **Code named above, by file:** engine-core.js — `_tick` · engine-systems.js — `_affairNight`, `_barArrearsTick`, `_barLost`, `_barMonthly`, `_barNight`, `_barSettle`, `_doBooks`, `_doDraw`, `_doPrices`, `_doTerms`, `_doWork`, `_floorReveal`, `_keptDue`, `_keptNo`, `_keptTick`, `_keptYes`, `_nontLoan`, `_noticeCheck`, `_noticeTick`, `_oppTick`, `_putInTill`, `_seasonTakingsOn`, `_shiftAsk`, `_shiftDue`, `_shiftLost`, `_shiftNo`, `_shiftYes`, `_tabDueTick`, `_workFloor`, `_workPresenceTick`, `_workTaleTick` · engine-parser.js — `_ownStock`
<!-- /facts -->

### Procurement and friction (`procurement`)
<!-- system: procurement -->

**What it is.** On the Tan route, once the bar is open, Tan brings "jobs" one a night — the cleaning contract, the screen, the till company — the way business is arranged everywhere, with nobody pretending otherwise. Saying yes costs a standing nightly invoice; saying no is always free of punishment but makes the bar's supply lines slower and dearer. The design rule: nothing is ever blocked and nobody is threatened.

**How it works.**
- `_synDue` (checked in `_tick` and on arrival, at the Stinky from turn 30, after Tan's favour, once a night) → `_synAsk` deals the next unasked job from `SYNDICATE_JOBS` (`_synNextJob`) and arms the `synjob` modal (`G.synJob`).
- `_synYes` records the day accepted in `G.syn.done` and calls `_align("syndicate", 2)`; `_synNo` adds one to `G.syn.friction` and moves no faction standing. Both end with Tan leaving (`_SYN_TAN_GOES`). ASK prints who the partners are; a reload redraws via `_synResume`.
- `_barNight` bills `SYN_JOB_NIGHT` per accepted job (from the night after acceptance) and multiplies nut and stock by `1 + friction × BAR_FRICTION`. The cleaning job grants the inside price (`_insidePrice`, `_barCogs`).
- `_synFrictionTick` on arrival at your own bar voices the friction from `_SYN_FRICTION`, at odds that grow with friction.
- Faction standing is `G.faction` via `_align`/`_faction`; the police WORK event in `WORK_NIGHTS` fires only with friction and `_faction("syndicate") < 2`.
- `_synState` backfills a partial `G.syn` so a hand-built save cannot crash the tick.

**State.** For life: `G.syn` (done, asked, friction, lastAskDay, frictionDay), `G.synJob` (while the modal is up), `G.faction`.

**Constants.** `SYNDICATE_JOBS` (declarative job table: lead, ask, yes, no, who), `SYN_JOB_NIGHT`, `BAR_FRICTION`, `SYN_INSIDE_PRICE`.

**Touches.** `barchain` (needs `partnerTan` and the favour first), `barbooks` (costs land in `_barNight`); faction standing is this system's own. Copy rule pinned by test: the words bribe and corruption never appear in this system.

**Tests.** tests/js/barchain.test.js, round54.test.js, round57.test.js, round67.test.js, round55.test.js, saveload.test.js, baton.test.js; `tools/modal-audit.mjs`.

**Design docs.** docs/factions-thai.md, docs/bar-failure-cycle.md.

<!-- facts: procurement -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Prompts (`G.pendingChoice` and the like):** `synjob`
> **Soak counters:** `procurement.asked`
> **Code named above, by file:** engine-core.js — `_align`, `_faction`, `_tick` · engine-systems.js — `_SYN_FRICTION`, `_SYN_TAN_GOES`, `_barCogs`, `_barNight`, `_insidePrice`, `_synAsk`, `_synDue`, `_synFrictionTick`, `_synNextJob`, `_synNo`, `_synResume`, `_synState`, `_synYes`
<!-- /facts -->

### The staff affair (`affair`)
<!-- system: affair -->

**What it is.** An owner can fall for his own hostess. It is allowed, and its antagonist is the position — you cannot be her boss and her man at once — never a scheme or a moral verdict. Two meters track it (the two of you, and the floor); five crises force choices that each cost one of them; it ends in a break, the bar bleeding out, or, rarely, a sale and a life together elsewhere.

**How it works.**
- The door: `_affairDue` (in `_tick`, on a stood shift near the room's close, an own hostess at `_bondTier` ≥ `AFFAIR_BOND_GATE`) → `_affairAsk` arms `affair`; `_affairYes` creates `G.affair`, `_affairNo` sets `G.affairCool`.
- Crises: `_affairCrisisDue` after `AFFAIR_HONEYMOON`, one per six days, from `AFFAIR_CRISES` → `_affairCrisisAsk` arms `affaircrisis`; `_affairCrisisAnswer` debits strain or floorSour; `_affairCrisisStakes` answers a question.
- Nightly: `_affairNight` (called from `_barSettle`) — a worked night eases strain, an away night adds `AFFAIR_STRAIN_AWAY`, a stood night mends the floor; a slip (any conquest, marked in `_conquestHappy`) is discovered within three days; `_affairWarn` may end it; the good-ending door sets `affairOffered`.
- Caught directly: `_affairCaught("bed")` from `_endNight`, `_affairCaught("bar")` when a companion arrives at your rail. `_affairSceneDue`/`_affairDiscoverScene` play a soi discovery at her rail.
- Her verbs: `_affairOut` (TAKE HER OUT: stakes first, then a night out costing the floor), `_affairHome` and `_affairMorning`, and `_affairTalk` for her register. `_affairEnd` writes the endings and a scar.
- `_affairLive()` is the predicate other systems read.

**State.** For life: `G.affair` (id, since, strain, floorSour, soured, discovered, slipDay, caughtDay, caughtWith, caughtHow, crisSeen, lastOut, ended, scarUntil), `G.affairCool`, `G.affairWho`, `G.affairCrisis`, `G.affairOutAsk`, `G.lastConquest`; flags `affairBegun`, `affairOffered`, `affairWon`.

**Constants.** `AFFAIR_BOND_GATE`, `AFFAIR_HONEYMOON`, `AFFAIR_BREAK`, `AFFAIR_STRAIN_AWAY`, `AFFAIR_STRAIN_WORK`, `AFFAIR_DRAG`, `AFFAIR_DRAG_SOUR`, `AFFAIR_GOOD_DAYS`, `AFFAIR_GOOD_STRAIN`, `AFFAIR_SCAR_DAYS`, `AFFAIR_FAMILY_ASK`, `AFFAIR_SALE`, `AFFAIR_CRISES`, `AFFAIR_OUT_EASE`, `AFFAIR_OUT_WEEK`.

**Touches.** `barbooks` (drag on the take; the good ending needs a healthy bar), `barchain` (SELL UP), `party` and `barfine` (a companion at your rail or in your bed is a catch), `happiness` (the end must name its cost). Any new conquest path must go through `_conquestHappy` or fidelity stops being tracked.

**Tests.** tests/js/barchain.test.js, round55.test.js, round71.test.js, round70.test.js, round76.test.js, predicates.test.js; `tools/composition-audit.mjs`, `tools/modal-audit.mjs`, `tools/happiness-audit.mjs`.

**Design docs.** docs/bar-failure-cycle.md (the no-right-answer doctrine); none dedicated.

<!-- facts: affair -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Prompts (`G.pendingChoice` and the like):** `affair` · `affaircrisis`
> **Soak counters:** `affair.begun` · `affair.ended`
> **Predicates:** `_affairLive()`
> **Code named above, by file:** engine-core.js — `_tick` · engine-play.js — `_affairTalk`, `_bondTier`, `_conquestHappy`, `_endNight` · engine-systems.js — `_affairAsk`, `_affairCaught`, `_affairCrisisAnswer`, `_affairCrisisAsk`, `_affairCrisisDue`, `_affairCrisisStakes`, `_affairDiscoverScene`, `_affairDue`, `_affairEnd`, `_affairHome`, `_affairLive`, `_affairMorning`, `_affairNight`, `_affairNo`, `_affairOut`, `_affairSceneDue`, `_affairWarn`, `_affairYes`, `_barSettle`
<!-- /facts -->

### The Rabbit heist (`heist`)
<!-- system: heist -->

**What it is.** An expat-only arc: Fast Eddy at the White Rabbit asks the player to copy the group's money records from the office behind Kitten Corner's till. There are several ways in and one way to refuse; the job always succeeds, and the climax is a plainclothes officer the next morning who informs and never threatens. What varies is who ends up on the investigators' radar, which is carried forward for the Bangkok follow-on.

**How it works.**
- `_rabbitInterview` (from Eddy's node) arms `rabbitjob`: CARRY IT (the box), KEYBOARD (`_rabbitJobKeyboard`, sets `G.rabbitWay` to operator), THE KID (`_rabbitJobKid`, only when `_kidOpen()`), NOT ME (`_rabbitJobNo`).
- The box: PLACE in `kitten_office` → `_doPlaceBox` (calls `_ccibWire` to record which phone it used); `_boxTick` in `_tick` runs `BOX_TURNS`, with footsteps at `BOX_FOOTSTEP`; a noisy command on a footstep (`_boxNoise`) adds heat, `BOX_HEAT_MAX` is `_boxBlown`. Done sets `rabbitData`.
- The keyboard: USE LAPTOP → `_doUseLaptop` → `_startCli` runs `CLI_SCENARIOS` through the portable cli-sim module (`cliNew`, `cliOptions`) as a `G.game`; a lockout sets `G.cliLockedDay`.
- The kid: Nont's `kidprice` modal (`KID_PRICE`), later Tan's `kidfavour` modal, or paying `KID_CLEAR`.
- The morning after: `_ccibDue` → `_ccibVisit` → `_ccibSet` fills `G.ccibRadar` from `_ccibPointed` (operator, own phone, a SIM in pocket) and flags `simUsed`/`kidPath`. BREAK SIM (`_doBreakSim`) clears the player.
- Laying low for `CCIB_LOW_DAYS`: `_ccibLoud(kind)` marks one loud act per kind per night (`_CCIB_LOUD_LINES`); `CCIB_LOUD_COFFEE` brings `_ccibCoffee`, `CCIB_LOUD_LAND` brings `_ccibLand`; `_ccibLowTick` lifts it.

**State.** For life: `G.rabbitWay`, `G.boxJob`, `G.stickFiles`, `G.rabbitDataDay`, `G.ccibRadar`, `G.ccibLowUntil`, `G.ccibLoud`, `G.ccibLoudNight`, `G.eddyBackDay`, `G.cliLockedDay`, `G.kidRefusedDay`; flags `rabbitPath`, `rabbitData`, `ccibVisited`, `simUsed`, `kidPath`, `ownPhoneUsed`.

**Constants.** `BOX_TURNS`, `BOX_FOOTSTEP`, `BOX_HEAT_MAX`, `CCIB_LOW_DAYS`, `CCIB_LOUD_COFFEE`, `CCIB_LOUD_LAND`, `CCIB_LOUD_MONEY`, `KID_PRICE`, `KID_CLEAR`, `CLI_SCENARIOS`.

**Touches.** `money` and `police` (both call `_ccibLoud`), `games` (the CLI runs as a `G.game`, so its chips live in `_chipSet`), `procurement` (the kid favour aligns the syndicate). A new loud act is one `_ccibLoud` call plus a line in `_CCIB_LOUD_LINES`.

**Tests.** tests/js/rabbit.test.js, cli-sim.test.js (loads only the module and BFS-proves the win is tap-reachable), round46.test.js, saveload.test.js; `tools/modal-audit.mjs`.

**Design docs.** docs/rabbit-arc.md, docs/intrusion-sim.md.

<!-- facts: heist -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `use` · `place` · `break`
> **Prompts (`G.pendingChoice` and the like):** `rabbitjob` · `kidprice` · `kidfavour`
> **Quests:** `rabbit_job` · `rabbit_heist`
> **Soak counters:** `heist.data`
> **People:** `fast_eddy` · `nont` · `kesinee`
> **Rooms:** `white_rabbit` · `kitten_office`
> **Code named above, by file:** engine-core.js — `_tick` · engine-play.js — `_startCli` · engine-systems.js — `_CCIB_LOUD_LINES`, `_boxBlown`, `_boxNoise`, `_boxTick`, `_ccibCoffee`, `_ccibDue`, `_ccibLand`, `_ccibLoud`, `_ccibLowTick`, `_ccibPointed`, `_ccibSet`, `_ccibVisit`, `_ccibWire`, `_doPlaceBox`, `_rabbitInterview`, `_rabbitJobKeyboard`, `_rabbitJobKid`, `_rabbitJobNo` · engine-parser.js — `_chipSet`, `_doBreakSim`, `_doUseLaptop`, `_kidOpen`
<!-- /facts -->

### The paper by the till and the laundering jobs (`laundering`)
<!-- system: laundering -->

**What it is.** Every bar hangs a licence and a registration that names who legally owns it, and the sign is never the operator. EXAMINE LICENCE reads that paper in any bar. Around it sit five jobs drawn from money-laundering patterns — counting covers, signing nominee shares, a bar sold with no company behind it, a chat group's transfer slips, and one nominee's name on four unrelated bars. Each job has an honest door and a crooked door; both complete, both pay, and the crooked one pays more and may come back.

**How it works.**
- EXAMINE LICENCE is a `_SCENERY` entry that calls `_licenceOf(room)`, deriving the frame from data: owner (`_licenceOwner`), company or commercial registration, nominee (`_LICENCE_NOMINEE`), `_PLG_ROOMS` on the group's paper. Reading logs `G.licencesRead`; a second sighting of the `BENJAWAN_BARS` name sets `benjawanSeen`, which unlocks `nameonwall`.
- The quests (`covers`, `fiftyone`, `verification`, `presale`, `nameonwall`) are `doneFlag` quests; the choice is a dialogue `choices` entry run by `_runChoice`. COUNT at Jasmine Garden tallies `G.coversNights` (`COVERS_NIGHTS` needed; `_coversSaid` quotes them). GIVE PAPERS TO ORATHAI is `_giveShares`.
- Payment: a choice pushes to `G.jobPay`; `_questTick` delivers each entry when due — a `hand` fee from the person when present, a `msg` text carrying money, or Hong's envelope. Both doors pay (`LAUNDER_HONEST` for honest).
- Risk: the crooked door calls `_launderArm(kind)` (a `_hm` hash, `LAUNDER_RISK_PCT`, due in `LAUNDER_RISK_MIN` to `LAUNDER_RISK_SPAN` days); `_launderRiskTick` at the wake takes `LAUNDER_COST` via `_launderPay`, costs rep, names it on `G.ledgerNotes`; Pre-Sale instead halves the ATM cap through `G.acctUntil`.
- `G.questDoneDay` drives the month-after follow-ups.

**State.** For life: `G.licencesRead`, `G.licNominees`, `G.coversNights`, `G.jobPay`, `G.jobPaid`, `G.launderRisk`, `G.launderBack`, `G.questDoneDay`; nightly `G.soc.licLook` (the house noticing you read it).

**Constants.** `LAUNDER_HONEST`, `LAUNDER_COST`, `LAUNDER_RISK_PCT`, `LAUNDER_RISK_MIN`, `LAUNDER_RISK_SPAN`, `COVERS_NIGHTS`, `BENJAWAN_BARS`, `ACCT_REVIEW_DAYS`.

**Touches.** `money` (`G.acctUntil`), `quests` (`_questTick` is the payout loop), `expat-jobs` (Mort's stringer pays for a licence read), `police` (the risk costs reputation). Any real-world-derived detail here is bound by docs/guardrails.md: structure only, nobody real.

**Tests.** tests/js/laundering.test.js, licence.test.js, rulings1022.test.js, round74.test.js, round103.test.js, round105.test.js.

**Design docs.** docs/bar-ownership-structures.md, docs/guardrails.md.

<!-- facts: laundering -->
> *Generated by `tools/gen-architecture.mjs` from `docs/systems.json` and the source — do not edit by hand.*
> **Verbs:** `count`
> **Quests:** `covers` · `fiftyone` · `verification` · `presale` · `nameonwall`
> **People:** `orathai` · `hong` · `howard`
> **Rooms:** `buakhao_market` · `jasmine_garden`
> **Code named above, by file:** engine-core.js — `_LICENCE_NOMINEE`, `_PLG_ROOMS`, `_hm`, `_licenceOf`, `_licenceOwner` · engine-systems.js — `_coversSaid`, `_giveShares`, `_launderArm`, `_launderPay`, `_launderRiskTick`, `_questTick` · engine-parser.js — `_SCENERY`, `_runChoice`
<!-- /facts -->
