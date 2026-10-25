# Adversarial code review — 2026-10-25

Eight reviewers, seven systems each (all 56 in `docs/systems.json`), `docs/architecture.md` as the map, every finding
proven with a `tools/probe.mjs` reproduction. 78 findings were reported; every one was reproduced by its reviewer. This
records what was fixed (pinned in `tests/js/review1025.test.js`, plus updated pins in `paper.test.js`, `engine.test.js`,
`dogeggs.test.js`) and what is left, with the site, so the next pass starts here.

## Two classes, fixed as classes

- **A refusal read as a yes.** The street encounters tested answers with unanchored substrings, so "i won't pay" paid
  the police, "not sure" and "i'm broke" (its *ok*) paid the curse ritual and the tonic shop, and "no thanks, another
  time" bought the freelancer. `_isRefusal(input)` (engine-encounters) is now asked first by every encounter that takes
  money or ends a night on a yes, and the yes words are whole words.
- **A day stamp that did not age across a trip.** `_newVacation` resets `G.day` to 1 and `_ageBooks` aged only the social
  books, so day N of trip two collided with day N of trip one — the booking app, the rose seller, Mama Yai's plate, the
  sunrise, the joiner fee — and the laundering payouts, risks and a bank review never came due. `_ageBooks` now sweeps
  every numeric `G.<x>Day`, the absolute deadlines (`acctUntil`, `paperFlag`, `paperUntil`, `jobPay[].due`,
  `launderRisk[].due`), `questDoneDay`, `G.std` and the masseuses' memory.

## Fixed (severe first)

| System | Defect | Fix |
|---|---|---|
| act1 | WATCH SUNRISE twice escaped the do-or-die night | `sunrise` and `allnighter` are on `_endNight`'s Act One fail list |
| saveload | UNDO rewound a lost Act One (the reset lands on the same day number) | main.js's boundary is day + `act1Tries` + `vacation` |
| saveload | UNDO after a game's last move rewound into it (a quiz 4/5 → 5/5) | a command that ends a live game drops the UNDO buffer |
| bus | a companion's seat made an unpayable fare gate with no way out | the money check reads every seat; WALK leaves an unpayable fare |
| navigation | the Sukhumvit crossing was rolled before the rain refused the move | the downpour is checked first |
| hotels | CHECKOUT from the condo orphaned the lease and its deposit | refused: MOVE OUT is the condo's |
| affair | SELL UP after the affair broke or soured printed the happy ending | the door is closed unless the affair is live and sweet |
| expat-jobs | the company permit counted nights that reset every payday | `j.stoodTotal`, a lifetime count |
| games | the house closing on killer pool refunded the whole pot | your entry comes back |
| conversation | telling Tan you are leaving, to his own question, threw | `_convoAnswer` restores the question it took |
| heist | ASK EDDY ABOUT THE JOB was taken by the manager's-job offer | an authored "the job" node answers first |
| nightride | a stop past dawn left `G.rideSeq` set, so `_onRide()` stuck true | the stop stops short of dawn; `_endNight` clears it |
| laundering | holiday payouts, risks and the slips' lapse never came due | the day-stamp sweep |
| police | "I won't pay" paid; the mamasan's rescue was re-rolled per stall | `_isRefusal`; the rescue is rolled once a stop |
| cons, encounters | refusals paid the tonic shop, the curse and the freelancer | `_isRefusal` |
| money | SEND read "1,500" as ฿1; its offered amounts read the pocket | separators stripped; the account |
| loans | Nira lent ฿20,000 in Act One, wiped free by a failed run | refused until the wallet is back |
| quests, heist | a reopened quest (THE KID → NO) paid again each cycle | `G.questPaid`: a quest pays once a life |
| heist | PAY NONT <n> for the kid took whatever was typed | the flat `KID_CLEAR` |
| barbooks, barchain | losing the bar forgave Nont's loan; SELL UP kept the till | the loan follows you; the till goes to the account, less the loan |
| expat-month | the payday's condo rent counted in both months | the new month only |
| affair | "she came home with you" printed after a hospital night | not after hurt/accident/robbed/barfine |
| bell | the Darkside lock-in fired on last week's drinks | tonight's books (`drinkCount`, the night's mama treat) |
| ladydrinks | `G.soc.tipBond` never reset, so tipping stopped bonding for the trip | reset at dawn |
| barfine | "null materialises at your elbow" in a bar with nobody on the floor | she names the arithmetic herself |
| social | the walk-out's verdict fell on the woman walked out with you | companions are skipped |
| worldprose | the Soi 6 last-night notice overwrote the morning ledger | its own marker, `G.lastNightNotice` |
| clock | `_passTime` ran on into a fresh game after `_act1Fail` | it stops when `G` is replaced |
| act1, dog | the second wallet was lost with the dog guarding the pockets | the dog keeps it |
| encounters | the drunk-police stop fired in hotel rooms and the station | streets only |
| hotels | the checkout prompt read "talk to the clerk" as the Metropole | whole words |
| food | the Vic's curry quenched thirst | the stalls' sign convention |
| quests | ABANDON <nonsense> dropped the first active job and its item | a name must match; bare ABANDON asks which |
| thai | สามสิบเอ็ด parsed as 14 | 31 |

## The second pass (the same day): the 29 left, fixed

Every finding the first pass left was fixed and pinned (the second half of `tests/js/review1025.test.js`):
the week's last night now starts the next trip clean, and a call armed on the night's last tick no longer survives the
morning (the soak found that one when the dice shifted); I DON'T DRINK is honoured by the mama treat, the quiz's
consolation and the ride's stops, and DECLINE gives back what was poured; the intro reads an orientation by its own words;
MOTOSAI HOME stops a man on the bench at the door, another hotel's room is its guests' whatever is in your pocket, and the
free ride reads the fare charged; the kerb wait ends for a downpour or a new game; the go-go torch warns once a command;
TRAVEL meets the mall's shutter before the walk; a paid hour, the bath, the special and the clinic are refused before the
money moves when they would run into the dawn (`_tooLateFor`); the cart asks who "for X" is; the barfine remembers who you
left with only once the deal is paid; at your own bar a bell and a game's stakes go through your till and the guv'nor's own
beer is never refused for a short pocket (nor the manager's girls' drinks); the killer entry and the lesson fee are not drink
slips; Cloze's board is one guess a night and a letter is not a word; a YES belongs to the newest prompt; a blown box closes
the heist job; Cream and Sao's car read the woman on your arm and the hour; the Orchid's women take no lady drinks, tips or
dances; the condo bills the electric alone when the advance covered the month, collects a short month (from the deposit on
MOVE OUT) and settles the hotel's book rather than wiping it; the platform's and the school's first payday is the days held
and the school's paper needs a month; the agent is paid what was there and the rest is named as owed; the wrong-paper
incident uses `_hm`.

## What the first pass left (all fixed in the second, kept for the record)

- **vacation** — the week's last night returns before the nightly reset block, so night 7's state carries into the next trip (`_endNight`, the `G.day > 7` branch, engine-play ~6450).
- **sobriety** — the mama treat's free drink, the quiz consolation and a ride stop skip `_compDrink`, so I DON'T DRINK is not honoured; DECLINE hands back one unit of a heavy pour of two.
- **identity** — `_introMatch`'s `_KEY` sends "bi, to be honest" to straight (engine-parser ~20829).
- **motosai / hotels** — MOTOSAI HOME puts a man on the bench in his hotel room past the desk (`_doMotosai` ~12700); the guest-only door is keyed on `hasWallet` (~1355); the pity ride's money test reads inverted (~12644).
- **bus** — a downpour starting during the small-hours kerb wait does not stop the bus; the Act One reset mid-wait is noticed by `_passTime` now but not by the bus wait's own loop.
- **darkness** — the go-go torch warning escalates per tick, so one WAIT goes from warning to ban (`_gogoLightWarn` from `_tick`).
- **navigation** — TRAVEL to the mall after nine walks the route and meets the shutter (`_closesMidnight` needs `barType`).
- **clinic, massage** — GET TESTED or a paid hour in the last minutes takes the money and runs into the dawn; refuse or confirm before charging.
- **saleng** — BUY <item> FOR <unresolvable> buys it for you silently.
- **barfine** — `G.wentWith` / `leftFrom` are written before the deal can fail (`_bfResolve`'s first lines).
- **bell, drinks** — a bell at your own bar takes the pocket and nothing reaches the till; the guv'nor's free drink is refused when his pocket is short (the price check runs before the own-stock branch).
- **games, thai** — at your own bar a won stake comes from nowhere; the killer entry and Waen's lesson count as drink slips in CHECK BIN; the Cloze board accepts one letter and unlimited guesses.
- **heist, laundering, soi6-stream** — a one-command YES arm is answered before a prompt armed after it; a blown box leaves `rabbit_heist` active forever.
- **cream, sao, orchid** — Cream's GO ignores the companion on your arm (`_partyBlocksTrade`); Sao's car arms at any hour with a companion; the Orchid's women take lady drinks, tips and dances.
- **expat-condo** — a short month is never collected (cleared by the next payday and by MOVE OUT); signing the day before a payday bills the month twice; signing wipes the hotel's book.
- **expat-jobs, expat-month** — TEACH ONLINE and the school pay a full month for one day held; the agent's fee is booked as paid when the pocket was empty; the wrong-paper incident is a near-linear `_hh` roll (use `_hm`).
