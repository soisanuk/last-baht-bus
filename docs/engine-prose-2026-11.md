# Engine prose pass — 2026-11-01/02

The ~13,700 prose records in the five `engine-*.js` files (7,367 function-body literals and 7,022 pool lines, as
`tools/prose-corpus.mjs` extracts them) had been read by nobody as prose: the dialogue walker covers `world.js`, the
code review covers the engine as a machine, the lints cover the mechanical classes. This pass read all of them.

**Method.** The corpus was dumped per file and split into eight batches of 45–57k words. Seven Opus readers each got
one batch, a brief (the classes below, with examples) and a context sheet (room types, who speaks which English, the
mamasan ids, the doctrine in one line each), and no access to the source. They reported 625 findings as JSON (ref,
class, quote, note), 160 of them marked sure and 465 `maybe:`. Every finding acted on was verified at its site, with
`tools/probe.mjs` where the fix changes a printed line. Alongside the readers, a mechanical scan over the same records
produced candidate buckets (British markers inside quotes, furniture words, hour words, ฿ digits, "tilac", bare
invitations, duplicate literals, bare furniture literals by function) that were triaged by hand. The pins are in
`tests/js/engineprose1101.test.js`, against pools and function bodies, never one string.

## Findings by class

Counts are sites changed; a reader count in brackets is what the seven readers reported (sure + maybe).

| Class | Sites fixed | Where | What the fix was |
|---|---|---|---|
| tilac in a mamasan's mouth | 27 [31] | systems 15 · parser 10 · play 2 | "tilac" → "na" (or dropped) wherever the speaker is the mamasan, the till, Candy, Mama Yai, Miss Mala, the soapy boss, the lock-in host, the go-go's "house rule" hand; `_ASK_AGAIN` (dealt to a mamasan too). The narrator's own tilac in the no-bar refusal and the dog line went with it. |
| digits where a constant exists | 24 [62] | parser 13 · systems 6 · play 4 · encounters 1 | `_FOLK_KPFIELD_LOST` ("tastes exactly like ฿100" against an ฿80 beer — a live contradiction) → `BEER_PRICE`; `KP_ENTRY` (the ashtray, twice); `QUIZ_PRIZE`; `SEVEN_WATER` (twice); `NONT_CHARGE`; `NONT_SIM`; `BUS_CHARTER`; `MASSAGE_LEGIT`; `SOI6_BANK`; `CLUB_TAXI`; `BF_SOI6` (the joke text said 600 against 450); `LADY_CUT` (the Owl said seventy-odd against 60); `BUS_FARE` in five places; the condo rent typed as "nine thousand" in seven town lines → `฿{r}`. All through `_num` (round68d's separator rule). |
| an hour or month the game did not compute | 21 [43] | parser 12 · play 5 · systems 4 | `_tooLateFor` said "it is nearly six" from 05:00 → `_clockStr`; the last-night stop memories ("the noodle at two o'clock", "a toastie at four in the morning", "three o'clock"), the ride memory, the Bangkok dinner's return, the missed-shift text, the band request, the balcony shift change, the shutters "at nine on a Saturday" made clock-blind; `_SMALL_TALK`'s "Is October" / "is Tuesday" / "for a Tuesday"; the rain talk's "October" (four lines) → the wet season; `_OWNER_GREET`'s "quiet start" / "slow hour now" / "busy soon" on any arrival; `_TOLD_BACK` "after midnight". |
| revisit-hour paints | 11 [20] | parser 7 · systems 4 | The sand "still holding the afternoon's heat", the bay's "evening trick", the lake's last light, the picnic since late afternoon, the monks asleep, the mall full of families, Pratumnak's town "clearing its throat for the evening", the Buddha's sky going down, the club's "small hours", the 7-Eleven awning "at this hour", the text "night still young". |
| British idiom in an American's quotes | 13 [45] | systems 9 · play 2 · parser 2 | Bert's lease and deposit speeches (he'll not, you've not, lad, a queue, makes no odds, full whack, I've a thing), Bert's arrears warning, Nont's "sorted", Eddy's "that's me gone", Vasseur's "Mate. MATE.", the anonymous regular's "Forget it, mate" in `_doApologize`. Pools already pass `_voiceFit`; these were bare literals. |
| Thai house staff in British idiom | 5 [17] | parser 3 · play 1 · encounters 1 | "take care of her proper", Aoy's "love", "I bat the other way", "my mum cook", a hostess's "love". |
| beer-bar furniture a go-go can print | 22 [119] | parser 13 · play 5 · systems 4 | `_FIT_GOGO` now also drops "edge of the bar", "length of the bar" and "the counter"; the bare literals in `_partyTalk`, `_lastNightHers`, `_seenHomeTalk` (bar top → `_ledge()`), `_giftLine` (the rail), `_streetTalk` (stool rung, the point of a stool, a stool by the window), `_toHer`, `_bfRefusalSay` (→ `_seat()`), `_doBorrow` and `_doTalkCore` (Nira's bar and stool at Neon Paradise → table), `_doThrowCover` and `_BELL_GOGO` (the counter, the end of the bar), `_lightNotice` (a bartender where the women pour), `_doBarfine` (a water "on your stool"). `_BEER_LINES` deepened from four to eight. |
| fixed strings that print nightly | 4 pools [10] | parser 2 · play 2 | `_NO_DRINKS_HERE` (the no-bar refusal, two call sites, no tilac), `_MANNERS_LINES` (the thank-you aphorism, two call sites), `_SOI6_SHUT` (Soi 6 after two, from the street), `_BEER_LINES`. |
| moral grading | 4 [14] | play 3 · parser 1 | "bad girls are bad business" (the debrief and the incident close) → the fine owns the problem; the mamasan's "She is better than you"; "as urges here should". |
| invitation or command with no tap | 11 [17] | core 4 · parser 7 | TIME, REPORT, TAO RAI, PLAY KILLER, CHARGE PHONE (four variants), ASK her ABOUT A JOB were bare caps; now `(CAPS)`. Tan's "Eat with me … the room, maybe, in a week" promised two things no verb delivers; now it promises neither. |
| witness claims | 3 [13] | parser 2 · systems 1 | A punter reporting what a man is saying in another bar right now (hedged), a hostess "I see you" at a bar she was not in (her friend saw), "everybody see" a league win at another bar (hear). |
| contradictions (dossier pass) | 14 [44] | | Below. |
| prose (grammar, tokens, sense) | 31 [116] | parser 17 · systems 8 · play 5 · core 1 | "shakes the head" ×5; "Yesterday ago you test"; "Two thunder down"; "you, who has"; the taxi paid and the bike pulling off; the shot on the stool; two tense slips; "when it's hunger"; the hour paid "she talks"; "most eccentric staircase on the soi … on this soi"; "It is, at this hour" about last night; Bert assumed to own any `{b}`; the gift the player bought "I not tell you what the cart man charge"; "(The game only knows…)" fourth wall; "Bank the piwin"; "When you come down the alley"; the Owl's Hannibal joke with no main clause; Tan's "The boy could pay Nont's way" (the boy is Nont); the piwin's "sparse hour" (engine vocabulary); "you own the people"; "฿{c} for the taxi … the bike"; missing ฿ before `STREAM_MATCH` (three places). |

## The contradictions the dossier pass found, and how each was settled

| Subject | The two records | Settled |
|---|---|---|
| The dawn | `_SUNRISE[0]` "comes up behind the town" vs `_endRide` "the sky over the gulf" and `_ACT1_FAIL_LEDE` "the gulf goes grey, then pink" | Pattaya faces west (canon). Both dawns now break behind the town. |
| The school | `_TOWN` "the school on Third Road" vs three siblings on Second Road | Second Road. |
| The airport drive | the narrator's "ninety minutes of motorway" vs Tan's "two hours" twice in the same scene | Tan's figure; the narrator says two hours. |
| The house band's bassist | "he says" in `_doBandRequest`, "she says" in `_doBandTalk` | He. |
| Sukhumvit | "six-lane" at the crossing vs "eight lanes of sodium" in the ward | Eight. |
| The buses at closing | `_endNight` "the buses long gone, the way they always are" vs the debrief and the Owl "run all night, sparse after two" | Sparse, not gone. |
| The owner's privilege | `_OWNER_PITCH[3]` "Free for you. Owner privilege" vs `_OWN_BARFINE_NO` (the long way round, like any regular) and the manager rule | The pitch now says owner is not free, only the long way round. |
| Soi 6 and the group | "Soi 6 is all the group now" vs canon (the buying is concentrated in the inner west; the inner east is clean) | The inner west is all the group now. |
| A beer-bar girl's salary | the Owl's "most beer-bar girls draw no salary at all" vs `BAR_SALARY` and the terms talk | A base nobody could live on, the rest the quota. |
| The Vic's curry | `_QV_DISH_LINES[5]` "improves all week" vs `_curryNote` "Fridays only" | What is left feeds the staff all week. |
| Nira's temple hour | `_bfRefusalSay[16]` "temple at six" vs three siblings at five | Five. |
| The group's camera bars on Soi 6 | "the group's four" vs five named elsewhere | "The group's bars on Soi 6." |
| The bank card wait | "the bank's a week" vs `{d}` days in every sibling | Left: the `{d}` token is not supplied on that key (checked); the line is a punter's round number. Noted below as deferred. |
| The quiz's home | `_quizTalk` "at the Queen Vic, the pub does it" vs "which bars, you ask on the day" | Not a contradiction: the first is the Soi 6 week's line (the quiz IS the Vic's there), the second the full game's. Reverted after `playtest5.test` said so. |

Reader-reported contradictions checked and left: Tan's "banking app that bounces your money back" (it is Tan refusing
money, which is his canon, not Nont's trait); "Butterfly" at the door (`_dogN` substitutes the dog's name); the
Stinky on "Beach Road" (its room's region is Beach Road); the clinic's "three month" vs "three weeks" (a retest
interval and a window period are two things); Nira "on the stage" (she lends from the stage, which is why her bar is
now a table); the Owl's "twenty years" (a lawyer's, not Mort's); the Owl's "never takes cards" (written before the
sale, and the Owl is dated by nature); Nira's "three day" term (`LOAN_DAYS` is 3; the `{d}` token is not supplied on
that key, so it stays typed and is listed below).

## What moved into pools

- `_NO_DRINKS_HERE` (engine-parser, 4 lines) — the "no bar here" refusal, from two call sites that each had one fixed
  string ending "tilac".
- `_MANNERS_LINES` (engine-parser, 5) — the thank-you/wai aphorism, from two call sites with the same sentence.
- `_SOI6_SHUT` (engine-play, 5) — Soi 6 after two from the street, from two identical fixed paragraphs in `_closedMsg`.
- `_BEER_LINES` (engine-parser) — 4 → 8, the commonest purchase in the game.
- `_FIT_GOGO` (engine-core) — three more furniture phrases, so every pool dealt through `_pickVary` drops them in a go-go.

## Deferred, with the reason

- **The "half ten / half one" clock idiom in Thai-English variants** (`_closingTalk`, `_openingTalk`, `_busyTalk`,
  `_AFTER_WORK` — about twelve lines). Three readers flagged it; the sibling Thai lines say "half past". Whether a
  Soi 6 woman who learned her English from British customers says "half ten" is Mario's call, not a lint's.
- **The dog in the bars.** `_DOG_FAVOR_SCENES` (about sixty lines) puts Sai Krok on the rail cushion and touring the
  bar; `_doFeedDog[21]` says "No dogs in the venues". One of them is the rule; it is a design question about the dog,
  not a prose fix.
- **Nira's cousins** (`_doTalkCore[28]`, `[29]`, `_TOWN[89]`, `[92]`) and the tonic shop / curse ritual / groped-wife
  husband (`_tonicShop`, `_curseRitual`, `_salengBuy[85–88]`): implied physical pressure taking money. The brief's
  doctrine says violence is never made a threat; whether these cross it is a ruling. The airport line that made the
  cousins explicit ("the one place her cousins don't come") was softened; the rest is left as written.
- **"Flying Club"** in `_doPatron[53]` — a regular's dark joke using the town's slang for balcony falls. Canon already
  has Bert's "Pattaya Flying Club"; whether the joke stays is Mario's.
- **The narrator's "honest trade" asides** in `_SCENERY` (five lines) and the `_bkkBill` closing paragraph: irony that
  edges toward grading the trade. Left; flagged.
- **Tan at the wheel / counting fares** in `_TAN_TOWN` and `_taxiIntro` (several readers): the taxi intro is the one
  scene where he drives, by design; the `_TAN_TOWN` lines ("I count it in fares", "not on the meter", "a shrug at the
  windscreen") read against "never at the wheel, favours never money" and want a dossier read of their own
  (`node tools/prose-corpus.mjs --about tan`), not a line edit in passing.
- **Typed numbers with no constant to read**: the bottle deposit (฿5, in six places, matching Nok's own description),
  the noodle girl's ฿20 commission (seven lines), the ping-pong show's ฿600 and ฿250 (the code hard-codes 600 + gouge),
  the stand-in's "seven hundred", the saleng cart hints (`_SALENG_CARTS`), the peddler hint in `_tick`. Each wants a
  constant introduced in code first; that is a mechanics change and not this pass.
- **The 285 bare furniture literals** not individually judged (`scan-furniture-bare.txt` in the session scratchpad
  listed them by function). The ones a go-go reaches were fixed; the rest sit in functions that only run in beer bars,
  pubs, the player's own bar or the street. The durable fix is the one the readers named: a seat noun chosen by venue
  (`_seat()`/`_ledge()`) wherever a `_doTalkCore` answer names a stool, which is a pass of its own.
- **The remaining `maybe:` findings** (about 330 after triage) are in the session's `findings/*.jsonl`; the classes
  with the most unverified rows are `claim` (64) and `prose` (72).

## Not seeded

`node tools/prose-corpus.mjs --delta` lists every changed string (about 4,200 engine records were already pending
before this pass). Nothing was seeded: the readers read the batch text, not the render column, and seeding belongs
to a reviewer who has read the `[taps: …]` column as the method requires.
