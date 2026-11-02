# Code review 2026-11-01 — the findings as reported

Every block below is a reviewer's report, kept as written: the claim, the site, the probe that reproduced it and the fix
proposed. Line numbers and outputs are from commit a0c00751, before the fixes. What was done with each is in
`docs/code-review-2026-11-01.md`; the pins are the `tests/js/review1101*.test.js` files.

# S1 — Money and the bar's books (reviewer findings, 2026-11-01)

Probe files live in the scratchpad: `SCR=/private/tmp/claude-501/-Users-mario-projects-last-baht-bus--claude-worktrees-code-review-1101-3b63f9/36a1d5cb-f80a-4586-be10-5707a66db702/scratchpad`.
`$SCR/owner.js` is a preamble that builds an owner the same way `tools/persona-seed.mjs`'s `expatOwner` does (`_goExpat`,
`_partnerYes`, `_barDeposit`, real `_doWork` + `_endNight("sleep")` nights) and exposes `owner(day, money, bank)`. The
multi-line probes are run as `node tools/probe.mjs < $SCR/tN.js` (probe.mjs reads the snippet from stdin); each file's
body is quoted below.

### S1-1: Six owner-stage gates read a refusal as a yes — "do it later" sells the bar and ends the game
- system: barchain / barbooks / procurement / affair   severity: high   owner: engine
- site: web/js/engine-parser.js:19156 (`sellbar`), :19097 (`partner`), :19116 (`keptgirl`), :19126 (`affair`), :19179 (`synjob`), :19260 (`tanfavour`) — all in `_doCommandInner`
- defect: None of these intercepts asks `_isRefusal(lower)` before its yes regex, and each yes regex is a prefix
  (`do it`, `ok`, `okay`, `fine`, `sign`). So a refusal that opens with one of those words commits: "do it later" at
  SELL UP's door sells the bar and ends the game (`_gameEnd`); "ok, maybe later" at the 51% fork signs Candy and bills
  the ฿12,000 lawyer; "fine, don't" posts the girl's photo to the owners' group; "okay, not now" starts the affair;
  "ok, no thanks" accepts Tan's procurement job (+2 syndicate, a standing nightly invoice); "fine, no thanks" puts Tan's
  ghost employee on the staff list. CLAUDE.md: a choice that takes money or ends a night asks `_isRefusal` first. `barsale`
  (two lines below `sellbar`) already does it right.
- repro (sellbar): `$SCR/t2.js`
  ```
  owner(14);
  G.affair = { id: "manow", since: G.day-30, strain: 0, floorSour: 0 }; _setFlag("affairBegun"); _setFlag("affairOffered");
  G.room = "stinky_bar"; run("sell up"); show("sell up"); run("do it later"); show("do it later");
  console.log("barSold", _flag("barSold"), "pending", G.pendingChoice);
  ```
  → `== do it later ==` … `Tan handles the sale the way he handles everything…` … `🚌 THE LAST BAHT BUS — the long way round` … `barSold true pending gameend`
- repro (the other five): `$SCR/t6.js`, `$SCR/t7.js` (each arms the gate with its own engine function — `_keptAsk`,
  `G.pendingChoice="partner"` after the quests, `_tanFavour`, `_synAsk`, `_affairAsk` — then `run()`s the refusal)
  → `isRefusal('fine, don't'): true` / `== keptgirl: fine, don't ==  You let him. The message goes — her photo…` / `kept.sent: true`
  → `isRefusal('ok, maybe later'): true` / `(The lawyer's bill is ฿12,000: ฿12,000 from the account.)` / `barPartner true partnerCandy true money moved 12000`
  → `tanfavour 'fine, no thanks' -> tanFavourDone: true syndicate: 3 | isRefusal: true`
  → `synjob 'ok, no thanks' -> accepted: cleaning true friction: 0`
  → `affair 'okay, not now' -> G.affair: {"id":"jiap"} affairCool: 0`
- fix: put `if (_isRefusal(lower)) { <the gate's No>(); return; }` (or route to the gate's no branch) as the first test after
  any question check in each of the six intercepts, exactly as `barsale` does. Pin the six phrases above.

### S1-2: SEND <amount> TO <name> pays the first contact whose name merely CONTAINS the typed word
- system: money   severity: high   owner: engine
- site: web/js/engine-systems.js:5094 (`_doSendMoney`)
- defect: The recipient is `Object.keys(G.phone.contacts).find(c => c === nameW || NPCS[c].name.toLowerCase().includes(firstWord))`
  — a substring match, first contact in insertion order wins, and an exact name never outranks a longer one. With Kwanjai
  and Kwan both in the phone, "send 500 to kwan" pays Kwanjai; Saifon beats Fon; "send 300 to me" pays Mercedes. The
  confirmation line ("crosses town in one green blink") never names who got it, so the player cannot see the mistake, and
  the money buys the wrong woman bond, `G.soc.given` and a care/ask settlement. CLAUDE.md: a typed name goes through
  `_npcByName` (ids are the people, names are labels).
- repro:
  `node tools/probe.mjs 'sandbox(); G.bank=10000; G.battery=80; G.phone.contacts={kwanjai:true, kwan:true}; run("send 500 to kwan"); show("send 500 to kwan"); console.log("given", JSON.stringify(G.soc.given)); G.phone.contacts={saifon:true, sea_wall_fon:true}; run("send 300 to fon"); show(); console.log("given", JSON.stringify(G.soc.given))'`
  → `฿500 crosses town in one green blink. (฿9,500 left in the account.)` / `given {"kwanjai":500}`
  → `given {"kwanjai":500,"saifon":300}`
  and `node tools/probe.mjs 'sandbox(); G.bank=10000; G.phone.contacts={nont:true, candy:true, mercedes:true}; G.battery=80; run("send 300 to me"); show(); console.log(JSON.stringify(G.soc.given))'`
  → `฿300 crosses town in one green blink.` / `{"mercedes":300}`
- fix: resolve the name with `_npcByName` restricted to contacts — exact name (or id) first, then a whole-word prefix, and
  ask "which one?" when two contacts match; name the recipient in the confirmation line.

### S1-3: The bar deposit and key money are invisible or unnamed on the morning ledger, depending on which balance paid
- system: barchain / money   severity: high   owner: engine
- site: web/js/engine-systems.js:10126–10128 (`_barDeposit`), :10232–10233 (`_leaseTransfer`), :10219 (`_leaseCash`); web/js/engine-play.js:5957/5980 (`_morningLedger`)
- defect: The account share of the deposit/key money is booked nowhere, so the morning reads "down ฿135,270 on the night"
  with no line saying ฿120,000 went to the old man and ฿15,000 to the landlord. The pocket share goes into
  `G.bar.pocketDrawn`, which the ledger subtracts from "spent" and never names (only `pocketNight`/`pocketStock` get a
  line) — so a man who pays from his pocket loses ฿135,000 and is told "down ฿270". The same purchase prints two different
  nights and neither names it. "The money reconciles to the baht — the morning ledger names every movement."
- repro: `$SCR/t5.js` (`_goExpat`, the four quests, `_partnerYes`; then the real arrival `run("enter stinky pinky")` fires
  `_barDeposit`; `run("transfer key money")`; sleep to the wake), run once account-funded (bank ฿400,000) and once
  pocket-funded (pocket ฿400,000)
  → `== account-funded: true barPaid true moved 120000` / `Last night: +1 สนุก · down ฿135,270 on the night`
  → `== account-funded: false barPaid true moved 120000` / `Last night: +1 สนุก · down ฿270 on the night`
- fix: give the deposit and the key money a counter (e.g. `G.barBought`, snapshotted like `condoB`) and a ledger line
  ("฿120,000 deposit to the old man; ฿15,000 key money to the landlord"), and exclude the WHOLE of it from "spent" — both
  balances — as the condo's deposit is; add an owner-buys scenario to `tools/money-audit.mjs`.

### S1-4: The morning the bar is lost, the rent/note/top-up the pocket paid that morning is reported as the night's spending
- system: barbooks / money   severity: medium   owner: engine
- site: web/js/engine-systems.js:11320–11324 (`_barLost`: `G.bar = { cash: 0, … }` drops `pocketDrawn`, `pocketNight`, `pocketStock`)
- defect: `_barMonthly` books the pocket's share of the rent and note (and `_barNight` the till top-up) into
  `G.bar.pocketDrawn`/`pocketNight`; `_barArrearsTick` → `_barLost` then replaces `G.bar` with a skeleton that has no such
  fields, and `_morningLedger` runs after. So on the morning the landlord takes the room, ฿2,734 of rent and ฿266 of
  top-up paid from the pocket read as "down ฿3,000 on the night", and the "your own money into the till" line disappears.
  The identical morning without the loss reads "down ฿270 · ฿494 of your own money into the till". (`_sellBarYes` and
  `_barSaleDo` drop `pocketNight`/`pocketStock` the same way.)
- repro: `$SCR/t3.js`
  ```
  for (const lose of [false, true]) {
    owner(14, 3000, 0);
    G.bar.lastMonthDay = G.day - 29; G.bar.cash = 0; G.bar.rentShort = lose ? RENT_GRACE - 1 : 0;
    G.nightTurn = 100; run("sleep", "sleep");
    console.log("== lose:", lose, "barLost", _flag("barLost"), "money", G.money);
    for (const l of out) if (/Last night|Rent to|pocket|own money/.test(l)) console.log("  " + l.slice(0, 260));
    out.length = 0; }
  ```
  → `== lose: false barLost false money 0` / `Last night: -3 สนุก · down ฿270 on the night · ฿494 of your own money into the till when it went under…`
  → `== lose: true barLost true money 0` / `(The till didn't cover it. ฿266 of your own money went in…)` / `Last night: -2 สนุก · down ฿3,000 on the night`
- fix: carry `pocketDrawn`, `pocketNight`, `pocketStock` (and `drawn`) into the replacement `G.bar` in `_barLost`,
  `_sellBarYes` and `_barSaleDo`, or have the ledger read them from a copy taken before `_barSettle` can replace `G.bar`.

### S1-5: A laundering risk that lands on empty pockets is forgiven silently while the ledger names the full figure
- system: laundering   severity: medium   owner: engine
- site: web/js/engine-systems.js:4115 (`_launderPay`), :4124–4127 (`_launderRiskTick`)
- defect: `_launderPay` clamps the account at zero (`G.bank = Math.max(0, bank - rest)`), so whatever pocket + account
  cannot cover simply vanishes — yet `_launderRiskTick` pushes the full `LAUNDER_COST` to `G.ledgerNotes`. With ฿150 on
  him and nothing in the bank, the morning says "down ฿150" AND "฿1,500 to the station" — a printed figure that did not
  move, and ฿1,350 forgiven with no word. It should either take what there is and name that (and what is still owed, as
  the hotel book does), or carry the rest as a debt.
- repro:
  `node tools/probe.mjs 'sandbox(150); G.day=5; G.bank=0; _nightSnapshot(); G.launderRisk=[{kind:"covers", due:6}]; G.room=_hotelRoomId(); G.nightTurn=100; run("sleep","sleep"); for (const l of out) if (/Last night/.test(l)) console.log(l); console.log("money", G.money, "bank", G.bank)'`
  → `Last night: down ฿150 on the night · ฿400 more on the hotel book (฿400 in all) · ฿1,500 to the station, over the covers you signed off`
  → `money 0 bank 0`
- fix: have `_launderPay` return what it actually took and name that figure; put the unpaid remainder on a book (or on
  `G.owed`-style debt shown by DEBT) rather than dropping it.

### S1-6: COUNT THE TILL and its verdict disagree with the morning's BOOKS when the shift lapses after the count
- system: barbooks   severity: medium   owner: engine
- site: web/js/engine-systems.js:10315–10318 (`_tillShort`), :10337 (`_doCountTill`), :10429–10431 (`_barNight`)
- defect: `_tillShort(day)` reads `b.workedLast` live to choose the rate (6% stood vs 15% away). The count at close reads it
  while the shift is on; if the shift then lapses (`_workPresenceTick` sets `workedLast = false` after `WORK_AWAY_BUDGET`
  turns away — allowed after midnight when fewer than `WORK_MIN_STOOD` turns were stood), the settle re-reads it at the
  higher rate and finds a short. The count told the owner "It agrees to the baht"; BOOKS the next morning says "The count
  found the drawer ฿260 short" and books it as a counted short (`why: "float"`). The comment at :10314 promises the count
  and the settle agree.
- repro: `$SCR/t10.js` (all real path: WORK at 21:48, step out five turns, back in, wait to midnight answering the shift
  call NO, COUNT THE TILL, walk out until the shift lapses, sleep, BOOKS)
  → `turn 60 stoodTurns 16 workedLast true`
  → `You sit with Cake and count the drawer against the slips, note by note. It agrees to the baht.`
  → `workedLast after leaving: false`
  → `BOOKS: (The count found the drawer ฿260 short — change given wrong. ฿182 of it back in the drawer, ฿78 gone (on the out line).)`
- fix: freeze the count's result — store `b.countSh = _tillShort(G.day)` in `_doCountTill` and have `_barNight` use it when
  `b.countedDay === day` — or key the rate on `workedDay === day` (the declaration), not the lapsing `workedLast`.

### S1-7: COUNT THE TILL in the night's last turns prints its count the next afternoon, after the morning ledger, in the hotel room
- system: barbooks   severity: low   owner: engine
- site: web/js/engine-systems.js:10338–10340 (`_doCountTill`: `_passTime(3)` before the `_say`)
- defect: the three turns of counting are passed before the result is said; at 05:48 they end the night, so the wake, the
  bar's settle and the ledger print first, and then "You sit with Cake and count the drawer…" prints in Room 412 on day 15.
- repro: `$SCR/t4.js`
  ```
  owner(14, 3000, 0); _setFlag("tanAsked"); _setFlag("tanFavourDone"); G.syn.lastAskDay = G.day;
  G.room = "stinky_bar"; G.nightTurn = 118; run("count the till");
  console.log("day after", G.day, "room", G.room); for (const l of out) if (/DAY|Last night|count the drawer/.test(l)) console.log("  " + l.slice(0, 140));
  ```
  → `day after 15 room hotel_room`
  → `── DAY 15 · PATTAYA, HOME — you surface mid-afternoon…` / `Last night: +2 สนุก · down ฿270 on the night` / `You sit with Cake and count the drawer against the slips…`
- fix: say the verdict before `_passTime(3)`, or refuse the count (like `_tooLateFor`) when it would run into the dawn.

### S1-8: A quest reward handed over in person nets into "down" unnamed (and two other pocket arrivals do the same)
- system: money   severity: low   owner: engine
- site: web/js/engine-systems.js:4215 (`_questTick`: `else G.money += q.reward.money`); same class at :2691 (barfine
  complaint refund `G.money += inc.fine`) and engine-parser.js:15188 (`_doReport` refund `G.money += back`)
- defect: The app path (`_bankIn`) is named ("฿300 arrived in the account"); the in-hand path bumps no counter the ledger
  reads (`jobPaid`, `giftIn`, `offIn`), so a ฿300 recce fee from Candy turns a ฿400 room into "down ฿100" with nothing
  saying why — the same defect Liam's quiz prize (round 93) and Vince's job fees (round 74) were fixed for. In the expat
  month it is also missing from the month's spend (`wonN + giftInN + jobN`).
- repro:
  `node tools/probe.mjs 'sandbox(2000); G.day=3; _setFlag("hasWallet"); G.bank=5000; G.room=_npcRoom("candy"); G.nightTurn=30; _nightSnapshot(); G.quests.recce="active"; _setFlag("recceDone"); run("wait"); show("reward"); G.room=_hotelRoomId(); G.nightTurn=100; run("sleep","sleep"); for (const l of out) if (/Last night/.test(l)) console.log(l)'`
  → `(+฿300 from Candy — ฿2,300 in pocket.)`
  → `Last night: +2 สนุก · down ฿100 on the night`
- fix: book the in-hand reward on `G.jobPaid` (it already prints "paid to you for a job") or `G.giftIn`, and the two refunds
  on a named counter; add one in-hand quest reward to a money-audit scenario.

### S1-9: The accountant's call counts every baht ever cashed through Nont, including a tourist's before he owned a bar
- system: money   severity: low   owner: engine
- site: web/js/engine-systems.js:8487–8495 (`_acctDue`/`_acctCall`); `G.acctBase` is 0 from `newGame()` and only set by the call
- defect: `G.nontOut` is a life counter and `G.acctBase` is never set when the bar is bought, so the first evening an owner
  stands at his own rail between 20:00 and 22:30 the accountant (hired with the bar) rings about money cashed through Nont
  on holidays before the bar existed, and halves his ATM cap for 30 days. (`_acctCall` also overwrites a longer Pre-Sale
  review: `G.acctUntil = G.day + ACCT_REVIEW_DAYS` without `Math.max`.)
- repro: `$SCR/t8.js` (a tourist CASHes ฿5,000 eighteen times at Nont's table; the owner is then built and the life total
  carried over as the save would carry it; one WAIT at the Stinky at 20:24)
  → `nontOut before owning: 71250`
  → `acctBase 0 acctDay null cap 20000`
  → `"Can we talk about the ฿71,250 that came into the account through the Old Market? …"` / `(The account's daily cash is halved for 30 days…)`
  → `cap after: 10000`
- fix: set `G.acctBase = G.nontOut || 0` when the deposit clears (`_barDeposit`), and `Math.max` the review end in `_acctCall`.

### S1-10: DRAW / PUT IN TILL misread ordinary amounts: "draw half" empties the till, "draw 1.5k" takes ฿15
- system: barbooks   severity: low   owner: engine
- site: web/js/engine-systems.js:11365–11366 (`_doDraw`), :6577–6578 (`_putInTill`)
- defect: `_doDraw` falls back to the whole till for any amount it cannot parse (`if (!amount) amount = b.cash`), so "draw
  half" / "draw some" take every baht; and it strips non-digits, so "1.5k" is ฿15. `_putInTill` takes the first digit run
  ("1.5k" → ฿1). `_repayAmount` (engine-systems:287) already parses "1.5k" correctly — the till verbs do not share it.
- repro: `$SCR/t9.js`
  ```
  owner(14, 1000, 0); G.room = "stinky_bar"; G.nightTurn = 30; G.bar.cash = 20000; _setFlag("tanAsked"); _setFlag("tanFavourDone"); G.syn.lastAskDay = G.day;
  run("draw half"); show("draw half"); console.log("till", G.bar.cash, "pocket", G.money);
  G.bar.cash = 20000; G.money = 1000; run("draw 1.5k"); show("draw 1.5k"); console.log("till", G.bar.cash, "pocket", G.money);
  ```
  → `(฿20,000 out of the till. ฿0 left in it; …)` / `till 0 pocket 21000`
  → `(฿15 out of the till. ฿19,985 left in it; ฿1,015 on you.)`
- fix: one amount reader (the `_repayAmount` shape: k-suffix, separators) for DRAW, PUT IN TILL and CASH; an unparsed
  amount asks "how much?" instead of defaulting to everything (bare DRAW can keep meaning all).

## Summary

Ten findings, all reproduced on the real entry points (`doCommand`, `_endNight` via SLEEP, `_arriveAt` via ENTER, `_tick`).
The most serious is S1-1: six owner-stage gates (SELL UP's door, the 51% fork, Tan's favour, the procurement job, the
affair's door, the kept girl's photo) commit on a refusal that starts with "ok"/"fine"/"do it" — "do it later" sells the
bar and ends the game. S1-2 (SEND pays a different woman whose name contains the typed one) and S1-3 (the ฿135,000
deposit/key money is unnamed when the account pays and invisible when the pocket pays) are close behind. The money audit
misses S1-3/4/5/8 because none of its scenarios buys the bar, loses it, takes a laundering risk or completes a quest in
person.

Suspected, not reproduced (for the triage):
- `_barSaleDo` via PLG or Tan drops `G.bar.loan` (Nont's) with the bar, while `_barLost` makes the loan follow you — it is
  stated in the sale's prose, so likely design, but it contradicts the 2026-10-25 "the loan follows you" ruling.
- The own-rail bell books stock at raw `BAR_COGS` (engine-play:4000), not `_barCogs()` × friction like every other stock line.
- `_sellBarYes` takes Nont's loan beyond the till from the account only up to the balance and forgives the rest unnamed (the AFFAIR_SALE banked first makes it unlikely to bite).
- `_nontCash`'s fallback strips every non-digit, so "cash 1000.50" would draw ฿100,050 (unrealistic input; not chased).


# S2 — State lifetime, the stages and saves (reviewer findings, 2026-11-01)

All repros run with `node tools/probe.mjs` from the worktree root. Identity used throughout:
`G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}` (abbreviated `ID` below).

### S2-1: A question at the consulate's gate ("go home? no, I'm staying") takes the plane and ends the game; a question at the ending's gate ("over? no") wipes the life
- system: expat-month (embassy), vacation (gameend)   severity: high   owner: engine
- site: web/js/engine-parser.js:19022 (`_doCommandInner`, the `embassy` gate); :19016 (the `gameend` gate)
- defect: The embassy gate tests the plane's words (`take|plane|the plane|go home|fly|i'll go`) before it asks whether the line is a question, and that branch has no `_endConfirm` (only a bare YES does), so any sentence that *starts* with those words — including a question about them — ends the game. The `gameend` gate has no question check at all, and `over|again|start over` there is an unconfirmed `newGame()` that throws away the life card, the VISIT option and every record. A non-answer must leave the gate up and commit nothing (CLAUDE.md); a choice that ends the game asks once.
- repro:
  node tools/probe.mjs 'for (const said of ["go home? no, i am staying","take the plane? what does that mean"]) { sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); _goExpat(); out.length=0; G.pendingChoice="embassy"; G.destitute=3; run(said); console.log(JSON.stringify(said),"→",G.pendingChoice,G.endKind); out.length=0; }
  for (const said of ["start over? would i lose everything","over? no"]) { sandbox(5000); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.stage="expat"; G.day=40; G.bank=90000; _gameEnd("sold"); out.length=0; run(said); console.log(JSON.stringify(said),"→ day",G.day,"stage",G.stage,"pending",G.pendingChoice,"origin",G.player&&G.player.origin); out.length=0; }'
  → "go home? no, i am staying" → gameend repatriated
  → "take the plane? what does that mean" → gameend repatriated
  → "start over? would i lose everything" → day 2 stage act1 pending intro origin null
  → "over? no" → day 2 stage act1 pending intro origin null
- fix: In both gates, ask `_read(lower).kind === "question"` (and `_isRefusal`) before any commit regex; route the plane's named words through `_endConfirm("embassy", …)` as the bare YES already is, and START OVER through an `_endConfirm("gameend", …)`.

### S2-2: CANCEL THE TICKET (permanent) is committed by "never mind" and by a question about it
- system: vacation   severity: medium   owner: engine
- site: web/js/engine-parser.js:19038 (`_doCommandInner`, the `soi6continue` gate)
- defect: The `soi6continue` commit regexes run before the gate's question check, and the stay regex includes `never` and `stay`. "never mind" (a plain back-out) and "cancel? what happens to my week" both call `_soi6Stay()`, which drops the Soi 6 week, `G.mode` and the daily and moves the man to the expat stage for good. The sibling `vacation_end` gate learned this in round 60 ("a question is not an answer"); this gate did not. A question should get the explanation; "never mind" should be NOT YET.
- repro:
  node tools/probe.mjs 'for (const said of ["never mind","cancel? what happens to my week","stay? what does that mean"]) { startSoi6Mode(); out.length=0; G.day=8; G.pendingChoice="soi6continue"; run(said); console.log(JSON.stringify(said),"→ stage",G.stage,"mode",G.mode,"pending",G.pendingChoice); out.length=0; }'
  → "never mind" → stage expat mode null pending null
  → "cancel? what happens to my week" → stage expat mode null pending null
  → "stay? what does that mean" → stage expat mode null pending null
- fix: Move the question/`explain` branch above the two commit regexes, and send `never mind`/`nevermind` to the NOT YET branch (or drop the bare `never` from the stay words).

### S2-3: Her offer of a mat ("keptby") reads "thanks but no", "thank you, no" and "ok no" as YES
- system: expat-month   severity: medium   owner: engine
- site: web/js/engine-parser.js:19030 (`_doCommandInner`, the `keptby` gate)
- defect: The YES regex `^(yes|ok|okay|thank|thanks|stay|her|i stay|please)\b` is tested before the NO regex and before `_isRefusal`, so the commonest polite refusals start with a yes word and accept: the man moves onto her mat for `KEPT_BY_NIGHTS`, her floor's word on it is hers to pay (`_repHit`, bond −2 at the end). The offer is once a life (`G.keptByUsed`), so the wrong answer cannot be taken back. A refusal is never a yes.
- repro:
  node tools/probe.mjs 'for (const said of ["thanks but no","thank you, no","ok no"]) { sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); _goExpat(); out.length=0; const her=Object.keys(NPCS).find(id=>NPC_ROLES[id]==="hostess"); G.soc.drinks[her]=7; G.pendingChoice="keptby"; G.keptOffer=her; run(said); console.log(JSON.stringify(said),"→ keptBy",JSON.stringify(G.keptBy)); out.length=0; }'
  → "thanks but no" → keptBy {"id":"waen","since":2,"nights":0}
  → "thank you, no" → keptBy {"id":"waen","since":2,"nights":0}
  → "ok no" → keptBy {"id":"waen","since":2,"nights":0}
- fix: `if (_isRefusal(lower)) { _keptByNo(); return; }` before the YES test, and make the YES words whole-answer (`^(yes|ok|okay|thank you|thanks|please)[.!]*$` or similar).

### S2-4: QUIT JOB any day after the first payday pays a whole month again (TEACH ONLINE, the school)
- system: expat-jobs   severity: high   owner: engine
- site: web/js/engine-play.js:7747 (`_jobPay`), called by `_quitJob` (:7596)
- defect: `_jobPay` prorates only the first payday (`_part = j.firstPaid ? 1 : days/INCOME_DAYS`). After the first payday `firstPaid` is true, so `_quitJob` — which pays "what the mornings have earned so far" — banks a full `TEACH_PAY` (or `SCHOOL_PAY`) for the days since the last payday, however few. Quitting on the evening of a payday is ฿28,000 for no mornings at all, and TEACH ONLINE again restarts the cycle. Money from nowhere. What the quit pays ought to be the days since the last payday.
- repro:
  node tools/probe.mjs 'sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); _goExpat(); out.length=0; G.payDay=G.day; G.room=_hotelRoomId(); run("teach online"); out.length=0; G.day=G.payDay+29; G.room=_hotelRoomId(); G.nightTurn=90; run("sleep","sleep"); out.length=0; console.log("after payday: day",G.day,"payDay",G.payDay,"firstPaid",G.job.firstPaid); const b0=G.bank; run("quit job"); show("quit"); console.log("banked on QUIT:",G.bank-b0,"TEACH_PAY",TEACH_PAY);'
  → after payday: day 32 payDay 32 firstPaid true
  → You close the platform. ... What you earned comes with you: ฿28,000 into the account.
  → banked on QUIT: 28000 TEACH_PAY 28000
- fix: Prorate from the later of `j.since` and the last payday. `_incomeTick` calls `_jobPay` after advancing `G.payDay`, so give `_jobPay` an `atQuit` flag: on a quit, `_part = Math.min(1, (G.day - Math.max(j.since, G.payDay)) / INCOME_DAYS)`; on a payday, keep today's rule.

### S2-5: A cash manager's envelope left at the bar is overwritten by the next payday's — a month's pay vanishes
- system: expat-jobs   severity: high   owner: engine
- site: web/js/engine-play.js:8032 (`_incomeTick`, the cash-bar branch)
- defect: The envelope is handed over only on a TALK to staff at the job bar (engine-parser.js:5234); a manager who stands his shifts with WORK and never TALKs to the till leaves it waiting. On the next payday `G.envelopeDue = { amt: jp, … }` replaces it rather than adding to it (`_quitJob` at :7598 adds correctly), so the first month's ฿28,200 is gone with no line anywhere. It ought to accumulate, as the quit path does.
- repro:
  node tools/probe.mjs 'sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); _goExpat(); out.length=0; G.job={kind:"manager",room:"candy_bar",corp:false,prem:false,nights:MGR_CASH_NIGHTS,stood:0,weekStood:0,weekStart:G.day,strikes:0,since:G.day,shiftDay:null,shiftStood:0}; G.payDay=G.day; G.job.stood=16; G.day=G.payDay+29; G.room=_hotelRoomId(); G.nightTurn=90; run("sleep","sleep"); out.length=0; console.log("payday 1:",JSON.stringify(G.envelopeDue)); const first=G.envelopeDue.amt; G.job.stood=16; G.day=G.payDay+29; G.room=_hotelRoomId(); G.nightTurn=90; run("sleep","sleep"); out.length=0; console.log("payday 2:",JSON.stringify(G.envelopeDue),"earned:",first+G.envelopeDue.amt);'
  → payday 1: {"amt":28200,"room":"candy_bar","day":32,"nights":16}
  → payday 2: {"amt":28200,"room":"candy_bar","day":62,"nights":16} earned: 56400
- fix: `G.envelopeDue = { amt: jp + (G.envelopeDue && G.envelopeDue.room === j.room ? G.envelopeDue.amt : 0), room: j.room, day: G.day, nights: j.stood + (… prior nights) }` — the same merge `_quitJob` does. (Also worth handing it over on WORK at the bar, not only on TALK.)

### S2-6: The condo bills a short first month as a full month of rent: ฿9,000 overcharged the next payday, and the ledger calls it the deposit
- system: expat-condo   severity: medium   owner: engine
- site: web/js/engine-play.js:7863–7866 (`_condoMonth`); the ledger label at :6032 (`_morningLedger`)
- defect: On a fresh lease's first payday only the electric is due (`_fresh`), but when the account cannot cover it `G.condo.short++`, and every short month is later collected as `CONDO_RENT + CONDO_UTIL`. So a missed ฿2,000 electric bill becomes ฿11,000 owed: the next payday takes ฿22,000 instead of ฿13,000 (and MOVE OUT would take the same from the deposit). The morning ledger then labels the ฿22,000 "(the deposit, held, and the first month)" because the label is chosen by size (`condoN >= CONDO_RENT * CONDO_DEPOSIT_MONTHS`). What is owed should be the amount that was due.
- repro:
  node tools/probe.mjs 'sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); _goExpat(); out.length=0; G.day=20; G.payDay=0; G.room="pratumnak_soi5"; G.money=CONDO_RENT*3; G.bank=0; run("rent a condo","rent a condo"); out.length=0; G.day=29; G.room="condo_room"; G.nightTurn=90; run("sleep","sleep"); console.log("payday1 short =",G.condo.short); console.log(out.filter(l=>/condo/i.test(l)).join("\n")); out.length=0; G.day=59; G.bank=100000; G.money=0; const b0=G.bank; G.room="condo_room"; G.nightTurn=90; run("sleep","sleep"); console.log("payday2 collected",b0-G.bank,"should be",CONDO_RENT+2*CONDO_UTIL); console.log(out.filter(l=>/condo/i.test(l)).join("\n"));'
  → payday1 short = 1 … The condo: ฿2,000 due and not there. The office makes a note — one month.
  → payday2 collected 23900 should be 13000   (23,900 = ฿22,000 condo + ฿1,900 agent)
  → Last night: … · ฿22,000 to the condo's office (the deposit, held, and the first month)
  → The condo: ฿9,000 rent and ฿2,000 electric, and the month you were short, collected.
- fix: Keep the owed amount, not a count: `G.condo.owed = (G.condo.owed || 0) + due` on a short month, collect `owed` (and take it from the deposit on MOVE OUT); keep `short` for the eviction count. Label the ledger by what moved (a flag set by `_doRentCondo`), not by its size.

### S2-7: The visa agent's unpaid fee is "noted" and never collected or shown — `G.paperShort` is written and never read
- system: expat-month   severity: low   owner: engine
- site: web/js/engine-play.js:8019 (`_incomeTick`)
- defect: A payday with an empty account prints "he has noted the ฿1,900 he is owed" and adds it to `G.paperShort`, but nothing reads that field: the next payday charges only the month's fee, `_debtsOwed()` and MONEY never mention it, and the runway count ignores it. The prose is a claim the mechanics do not keep — either the debt is collected and listed or the line should not promise it.
- repro:
  node tools/probe.mjs 'sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); _goExpat(); out.length=0; G.money=0; G.bank=0; G.payDay=G.day-29; G.room=_hotelRoomId(); G.nightTurn=90; run("sleep","sleep"); out.length=0; console.log("G.paperShort =",G.paperShort,"| _debtsOwed() =",_debtsOwed()); G.bank=50000; G.payDay=G.day-29; G.room=_hotelRoomId(); G.nightTurn=90; run("sleep","sleep"); console.log("next payday:",(out.join(" ").match(/The agent[^.]*\./)||[""])[0],"| paperShort still",G.paperShort); out.length=0; run("money"); console.log("MONEY mentions it?", /owe/.test(out.join(" ")));'
  → G.paperShort = 1900 | _debtsOwed() = 270
  → next payday: The agent's ฿1,900 for a tourist stamp. | paperShort still 1900
  → MONEY mentions it? false
  (grep: `paperShort` appears only in STATE_SCHEMA and at engine-play.js:8019.)
- fix: Collect `G.paperShort` with the next payday's fee (and clear it), and add it to `_debtsOwed()`/`_debtsLine()`.

### S2-8: The visit week's last night returns before the nightly reset and before the rent — bans, heat, drink counts and the drunk carry into the next visit
- system: vacation (the good ending's VISIT PATTAYA)   severity: medium   owner: engine
- site: web/js/engine-play.js:6591 (`_endNight`, the `visitUntil` branch)
- defect: `if (G.visitUntil && G.day >= G.visitUntil) { _morningLedger(); _nightSnapshot(); _visitHome(); return; }` sits above the whole nightly reset — the same shape the 2026-10-25 review fixed for the week's last night (`G.day > 7`), left in the sibling branch. The seventh night's `G.soc` (bans, heat, lock-ins, drink counts, hellos, drunk), the hangover, the bond cooling, the companion's goodbye and the room's folio are all skipped; VISIT PATTAYA again (`_visitPattaya`) resets only the meters, so the next visit opens banned from the bar, drunk 6, with last week's heat. The last night's room is never billed (the mid-visit nights are).
- repro:
  node tools/probe.mjs 'sandbox(5000); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.stage="expat"; G.payDay=G.day; _gameEnd("sold"); run("visit pattaya"); out.length=0; G.day=G.visitUntil-1; G.room=_hotelRoomId(); G.nightTurn=90; G.soc.banned={stinky_bar:true}; G.soc.heat={stinky_bar:9}; G.soc.lockIn={x:true}; G.soc.drinkCount={lek:3}; G.soc.drunk=6; G.soc.helloed={lek:1}; const m0=G.money; run("sleep","sleep"); console.log("pending",G.pendingChoice,"money",m0,"->",G.money); out.length=0; run("visit pattaya"); out.length=0; console.log({day:G.day,nightTurn:G.nightTurn,banned:G.soc.banned,heat:G.soc.heat,lockIn:G.soc.lockIn,drinkCount:G.soc.drinkCount,drunk:G.soc.drunk,helloed:G.soc.helloed});'
  → pending gameend money 5000 -> 5000          (a mid-visit night in the same probe: 5000 -> 4730)
  → { day: 9, nightTurn: 0, banned: { stinky_bar: true }, heat: { stinky_bar: 9 }, lockIn: { x: true }, drinkCount: { lek: 3 }, drunk: 6, helloed: { lek: 1 } }
- fix: Treat the visit's last morning like the week's: say the companion's goodbye, `_chargeRent` at checkout, and run the nightly reset block (or `_resetNightSoc` plus the hand resets) before `_visitHome()`; or have `_visitPattaya` start the visit clean as `_newVacation` now does.

### S2-9: Day-stamped records outside `_ageBooks` collide with the same day number on the next trip — the league night is "already played" a month later
- system: vacation   severity: medium   owner: engine
- site: web/js/engine-play.js:7220 (`_ageBooks`); the read at :2383 (`_startKiller`)
- defect: `_ageBooks` moves back the `G.<x>Day` numbers and a hand list of books, but not the `{ day: G.day }` records stored in other top-level fields: `G.lastKp`, `G.quizLast`, `G.qvRoast`, `G.priewSeen`, `G.policeAt`, `G.rivalLog`, `G.bfNo`, `G.owed`, `G.convoLapsed`, `G.offShift`, `G.namedBy`, `G.toldTo`, plus `G.dog.since` and `G.phone.jokeDay`/`wonTextDay`. Because the league runs on `G.day % 3 === 0`, day 6 is a league night on every trip: KILLER played at a table on trip 1's day 6 refuses "The league's played for tonight" on trip 2's day 6. EXAMINE DOG says "He chose you on day 6" on day 1. Same class as the 2026-10-25 day-stamp fix, incomplete.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); const poolRoom=Object.keys(ROOMS).find(r=>ROOMS[r].pool&&ROOMS[r].region!=="Darkside"); G.day=6; G.room=poolRoom; G.nightTurn=30; run("play killer"); out.length=0; G.game=null; G.room=_hotelRoomId(); G.nightTurn=90; G.day=7; run("sleep","sleep"); run("new vacation"); out.length=0; console.log("trip",G.vacation,"day",G.day,"lastKp",JSON.stringify(G.lastKp)); G.day=6; G.room=poolRoom; G.nightTurn=30; G.money=5000; run("play killer"); show("trip 2, day 6");'
  → trip 2 day 1 lastKp {"room":"kingfisher","day":6,...}
  → == trip 2, day 6 == The league's played for tonight — the chalk's wiped and the field has gone back to its beers. ...
  node tools/probe.mjs 'sandbox(5000); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.day=6; G.dog={since:6}; _setFlag("hasDog"); G.room=_hotelRoomId(); G.nightTurn=90; G.day=7; run("sleep","sleep"); run("new vacation"); out.length=0; G.room=_hotelRoomId(); G.lightOn=true; run("examine dog"); console.log("day",G.day,"dog.since",G.dog.since); show();'
  → day 1 dog.since 6 … He chose you on day 6 and has never once revisited the decision.
- fix: In `_ageBooks`, `shiftDay` every top-level object whose `.day` is a number (and every value of a map whose values carry `.day`), not a hand list — the sweep the `G.<x>Day` scalars already got; add `G.dog.since` and the `G.phone.*Day` stamps.

### S2-10: RESTART, PLAY AGAIN and START OVER throw away the real-clock season (`G.season0`) — the town jumps to November
- system: saveload, identity   severity: medium   owner: engine
- site: web/js/engine-parser.js:20792 (`case "restart"`), :19016 (`gameend` START OVER), :19050/19062 → :21193 (`startSoi6Mode`), and the full-mode `vacation_end` RESTART
- defect: `G.season0` is seeded by the frontend from the wall clock (main.js `_seedSeason`) only on the start-panel paths. The in-game resets call `newGame()` (default `SEASON_DEFAULT_M0`, November) and never restore it — `_act1Fail` was fixed for exactly this (Malcolm, round 36) and these paths were not. A June player who RESTARTs or PLAYs AGAIN is in high season: the rain, the trough prices, WEATHER and the paper all change. (Also: START OVER and the full-mode gate's RESTART drop `act1Best`/`act1Tries`, which the RESTART verb keeps.)
- repro:
  node tools/probe.mjs 'newGame(); G.season0=5; G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; run("restart"); out.length=0; console.log("full RESTART:",G.season0); G.season0=5; startSoi6Mode(); out.length=0; G.day=8; G.pendingChoice="vacation_end"; run("play again"); out.length=0; console.log("Soi 6 PLAY AGAIN:",G.season0); G.season0=5; G.pendingChoice="vacation_end"; run("restart"); out.length=0; console.log("Soi 6 RESTART:",G.season0); G.season0=5; G.pendingChoice=null; G.flags.act1Done=false; G.mode=null; G.stage="act1"; G.room="candy_bar"; G.nightTurn=NIGHT_TURNS-1; _endNight("dawn"); out.length=0; console.log("act1 fail keeps it:",G.season0);'
  → full RESTART: 10
  → Soi 6 PLAY AGAIN: 10
  → Soi 6 RESTART: 10
  → act1 fail keeps it: 5
- fix: Carry `season0` across every in-engine `newGame()` the way `_act1Fail` does (one helper — `_freshGame({keep: [...]})` — used by RESTART, START OVER, the gates and `startSoi6Mode`).

### S2-11: UNDO rewinds an ending and the permanent stage choice — the boundary sees day/act1Tries/vacation, not the stage or the ending
- system: saveload   severity: medium   owner: frontend
- site: web/js/main.js:617 (`_mark`), :389 (the UNDO refusal)
- defect: main.js drops the UNDO buffer only when `day:act1Tries:vacation` changes, and refuses UNDO only under `G.game|pendingBf|pendingEnc`. TAKE THE PLANE (`_gameEnd("repatriated")`), SELL UP's ending and MOVE TO PATTAYA / CANCEL THE TICKET change none of those, so one UNDO rewinds an ending — the file's own header says "an ending" must not be undoable — and the one-way vacation choice ("There is no flight back from it"). A rewound gate answer also hands back the outcome of any gate whose answer rolls dice.
- repro (main.js's boundary transcribed into the probe):
  node tools/probe.mjs 'const mark=()=>[G.day,G.act1Tries||0,G.vacation||0].join(":"); sandbox(0); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.stage="expat"; G.payDay=G.day; G.pendingChoice="embassy"; G.destitute=3; const snap=serializeGame(), m0=mark(), gb=!!(G.game||G.pendingBf||G.pendingEnc); run("take the plane"); out.length=0; console.log("after: pending",G.pendingChoice,"endKind",G.endKind,"| buffer dropped?", mark()!==m0||gb, "| UNDO refused?", !!(G.game||G.pendingBf||G.pendingEnc)); deserializeGame(snap); console.log("after UNDO: pending",G.pendingChoice,"endKind",G.endKind);'
  → after: pending gameend endKind repatriated | buffer dropped? false | UNDO refused? false
  → after UNDO: pending embassy endKind null
- fix: Add `G.stage` and `G.endKind` (or `G.pendingChoice === "gameend"`) to `_mark`; and refuse UNDO while `G.pendingChoice` is a gate (or drop the buffer after any command that was answered under one), as the encounter case already is.

### S2-12: A command whose own loop ends the night (the small-hours kerb wait) is ticked again by the dispatcher on the new morning or the new Act One run
- system: act1 (and the clock boundary)   severity: low   owner: engine
- site: web/js/engine-parser.js:20966 (`_doCommandInner`'s closing `_tick()`), with the kerb loop at :12604
- defect: HAIL BUS in the small hours ticks inside its own wait loop and correctly returns when `G` is replaced or the day changes, but the dispatcher then runs its usual `_tick()` on the new state: the next morning starts at turn 1, not 0, and after an Act One reset the fresh run has already spent a tick (`G.soc.tickRoom`, `moneyTick`, the meters) before the player types. The tail tick should be skipped when the handler crossed a night (G replaced, or `G.day` moved).
- repro:
  node tools/probe.mjs 'newGame(); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; G.room="beach_rd_s"; G.money=500; G.nightTurn=NIGHT_TURNS-1; run("hail bus"); out.length=0; console.log("act1Tries",G.act1Tries,"room",G.room,"nightTurn",G.nightTurn,"tickRoom",G.soc.tickRoom); sandbox(500); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.day=3; G.room="beach_rd_s"; G.nightTurn=NIGHT_TURNS-1; run("hail bus"); out.length=0; console.log("vacation: day",G.day,"nightTurn after the wake",G.nightTurn);'
  → act1Tries 1 room jomtien_beach nightTurn 1 tickRoom jomtien_beach
  → vacation: day 4 nightTurn after the wake 1
  (A `_tick` wrapper shows the second tick's caller: `_doCommandInner (engine-parser:20966)`.)
- fix: Capture `const g0 = G, d0 = G.day` at the top of `_doCommandInner` and skip the closing `_tick()` when `G !== g0 || G.day !== d0`.

### S2-13: STATE_SCHEMA declares lifetimes the code does not keep (`bank` "night"; `everBond`, `loanSkipped`, `loanSkippedOwed` "trip")
- system: saveload (STATE_SCHEMA)   severity: low   owner: engine
- site: web/js/engine-core.js:690–697 (`STATE_SCHEMA.night`, `.trip`)
- defect: The schema is the declared contract for "how long every field lives", but `G.bank` (the account) is listed as `night` and survives every dawn by design; `everBond` ("the black book still knows her name a month on"), `loanSkipped` and `loanSkippedOwed` (the face remembered after flying home on Nira's money) are listed as `trip` and are deliberately never reset by `_newVacation`. Nothing consumes `night`/`trip` today, but the next consumer (a generic dawn or trip reset, as `_resetNightSoc` already is for `socNight`) would wipe the account at dawn. `weekStart` is also `trip` but set only on the Soi 6 path.
- repro:
  node tools/probe.mjs 'const s=[]; for (const k of STATE_SCHEMA.night) { sandbox(5000); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.room="hotel_room"; G.day=3; G.nightTurn=60; if (k!=="bank") continue; G.bank=777; _endNight("sleep"); if (G.bank===777) s.push(k); } const t=[]; for (const k of ["everBond","loanSkipped","loanSkippedOwed"]) { sandbox(5000); G.player={origin:"monger",personality:"joker",orientation:"straight",said:{},lang:"en"}; _setFlag("hasWallet"); G.day=8; G[k]={sentinel:k}; _newVacation(); if (G[k]&&G[k].sentinel===k) t.push(k); } out.length=0; console.log("night fields surviving dawn:",s,"| trip fields surviving a new trip:",t);'
  → night fields surviving dawn: [ 'bank' ] | trip fields surviving a new trip: [ 'everBond', 'loanSkipped', 'loanSkippedOwed' ]
- fix: Move `bank` to `life` (it is the account), and `everBond`, `loanSkipped`, `loanSkippedOwed` to `life`; and have state-schema.test assert the declared lifetime dynamically (set every `night` field, run `_endNight`, expect the default) so the label is checked, not just present.


# S3: gates, modals, the night's clock and closings

Method: I reused `tools/modal-audit.mjs`'s STATES recipes in a scratch harness (scratchpad `gateprobe.mjs` / `qprobe.mjs`)
and fed every gate inputs that the audit's fixed four non-answers ("what?", "huh?", "pardon?", "what happens if i say yes?")
never type. The audit itself is green (0 findings). It is green because all four of its probes *start* with a question
word. A question that starts with an option's own word ("sell? …", "go where?", "tan?") or a hedge that starts with one
("let me think", "i'll think about it") falls straight into the yes branch of most `pendingChoice` handlers in
`_doCommandInner`. Only embassy, keptby, soi6continue, vacation_end, affair, affaircrisis and barsale run a question
guard first. Every repro below goes through `doCommand`.

### S3-1: SELL UP's confirm sells the bar and ends the game on a question ("sell? what happens to the girls?", "yes?")
- system: barchain / affair (gate `sellbar`)   severity: high   owner: engine
- site: web/js/engine-parser.js:19155 (`_doCommandInner`, the `sellbar` intercept)
- defect: The `sellbar` handler tests `/^(yes|sell|do it|sign)\b/` before anything else and has no question guard. A
  question that opens with the option's word commits the sale. The bar goes, ฿170,000 moves into the bank and the game
  ends on `gameend`, which cannot be undone. CLAUDE.md says a non-answer must leave the gate up and commit nothing. The
  question should get the stakes and a reprompt, the way `barsale` (19149) and `affair` (19125) already handle it.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.bank=20000; G.room="stinky_bar"; G.nightTurn=30; G.stage="expat"; for (const f of ["expatLife","barOpen","barPaid","barPartner","partnerTan","tanAsked","tanFavourDone"]) _setFlag(f); G.tanFavourDay=G.day; G.bar=Object.assign(G.bar||{}, {room:"stinky_bar",cash:20000,owed:100000,worked:5,declared:5,stoodTurns:30}); G.soc.drinks.manow=15; G.affair={id:"manow",since:G.day-3,strain:2,floorSour:0,crisSeen:[],crisChose:{},warned:{}}; _setFlag("affairOffered"); G.affair.since=G.day-70; _doSellBar(); show("prompt"); run("sell? what happens to the girls?"); console.log("pending", G.pendingChoice, "barSold", _flag("barSold"), "bank", G.bank); show("after")'
  → Sell up — the note cleared, ~฿150,000 banked, … (YES — sell up · NO — not yet.)
  → pending gameend barSold true bank 190000
  → … 🚌 THE LAST BAHT BUS — the long way round … (VISIT PATTAYA …) (START OVER …)
  ("yes?" does the same.)
- fix: put the guard that `barsale` uses at the top of the `sellbar` intercept:
  `if (_read(lower).kind === "question" || /\?\s*$/.test(lower)) { _say(stakes); _sellBarPrompt(); return; }`. The same guard
  closes S3-2 to S3-4. The class fix is one shared helper, for example `_gateQuestion(lower)`, that every `pendingChoice`
  handler calls before its yes regex. Add "sell?"-shaped probes (`<first chip word>? …`) to modal-audit's NON_ANSWERS so
  the audit can see this class.

### S3-2: the 51% prompt for Candy commits Candy (฿12,000 from the account) when you type "tan", "tan first", "her?" or "candy? why her?"
- system: barchain (gate `partner`)   severity: high   owner: engine
- site: web/js/engine-parser.js:19096 (`_doCommandInner`, the `partner` intercept)
- defect: The yes regex is `/^(yes|ok|okay|sure|do it|agree|deal|him|her|candy|tan)\b/`, and `_partnerYes` commits whoever
  `G.partnerWho` is, whatever name was typed. Candy's prompt tells you "NO is free: go and hear Tan first if you like", so
  "tan" or "tan first" is the player taking that advice. It signs Candy as the 51% and charges the lawyer's ฿12,000. Any
  question that opens with a name or a pronoun does the same. There is no question guard. The fix: a name that is not
  `G.partnerWho` should be read as NO (go and hear the other one), and a question should be answered and reprompted.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.bank=20000; G.stage="expat"; _setFlag("expatLife"); G.room="candy_bar"; G.pendingChoice="partner"; G.partnerWho="candy"; _partnerPrompt(); show("prompt"); run("tan first"); console.log("partnerCandy", _flag("partnerCandy"), "bank", G.bank); show("after")'
  → (Make Candy your 51%? … NO is free: go and hear Tan first if you like; the offer stands.)
  → partnerCandy true bank 8000
  → (The lawyer's bill is ฿12,000: ฿12,000 from the account.) "Then we do it right." … Candy's name is on 51% of your bar …
  (The harness gives the same result for "tan", "her?", "candy? why her?" and "tan? what does he get out of it?".)
- fix: `const other = G.partnerWho === "tan" ? "candy" : "tan";`. If the input names `other`, call `_partnerNo()`. Accept
  only `G.partnerWho`'s own name as a yes, and run the question guard first.

### S3-3: "let me think" or "i'll think about it" is read as YES at the shift call, Bert's phone and Eddy's interview
- system: barbooks / heist (gates `shift`, `keptgirl`, `rabbitjob`)   severity: medium   owner: engine
- site: web/js/engine-parser.js:19106 (`shift`: `/^(yes|…|let|have|get|put|write)\b/`), 19116 (`keptgirl`: `/^(yes|let|…)\b/`),
  19221 (`rabbitjob`: `/^(carry|…|take|i'?ll)\b/`)
- defect: The commonest hedge a player types at a prompt commits the yes. "let me think" at the shift call walks you down
  the bar to deal with the man. "let me think about it" at Bert's phone posts the girl's photo to every owner on the soi,
  which cannot be undone. "i'll think about it" or "take what?" at Eddy's interview hands you the BLACK BOX and the burner
  and sets `rabbitPath`. The yes words `let`, `i'll` and `take` are prefixes of hedges and questions. A hedge should leave
  the gate up, the way `partner` already reads `think|wait|later` as a deferral.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.bank=20000; G.room="stinky_bar"; G.nightTurn=30; G.stage="expat"; for (const f of ["expatLife","barOpen","barPaid","barPartner","partnerTan","tanAsked","tanFavourDone"]) _setFlag(f); G.tanFavourDay=G.day; G.bar=Object.assign(G.bar||{}, {room:"stinky_bar",cash:20000,owed:100000,worked:5,declared:5,stoodTurns:30}); G.nightTurn=40; G.bar.worked=5; G.bar.workedTurn=0; _shiftAsk(); show("prompt"); run("let me think"); console.log("pending", G.pendingChoice); show("after")'
  → (YES — have a word yourself · NO)
  → pending null
  → You go down the bar yourself. He looks at you, …
  Same owner setup, then `G.room="white_rabbit"; _rabbitInterview(); out.length=0; run("i'll think about it"); console.log("pending", G.pendingChoice, "rabbitPath", _flag("rabbitPath"))`
  → pending null rabbitPath true / … it's already in a Lotus's bag by your stool … (You're carrying the BLACK BOX …)
  Same owner setup, then `G.nightTurn=40; G.bar.nights=20; const id=Object.keys(NPCS).find(i=>NPCS[i].room==="stinky_bar"&&NPC_ROLES[i]==="hostess"); G.bar.kept={id,since:G.day-15,paidTo:G.day-5,stage:"lapsed",lapsed:G.day-3,told:true,fee:5000}; _keptAsk(); out.length=0; run("let me think about it")`
  → pending null / You let him. The message goes — her photo, a paragraph in capitals, every owner on the soi copied in. …
- fix: before the yes branch, `if (/^(let me|i'?ll think|think|wait|hold on|hang on|not sure|maybe)\b/.test(lower)) { reprompt; return; }`.
  Match `let` only as `let him|let it|let bert`, and `take` only as `take it|take the job`.

### S3-4: Cream's GO, Sao's car and the barfine ledger end the night on a question ("go where?", "bangkok? tonight?", "ok, how much?")
- system: chameleon / bkk / barfine (gates `cham`, `bkkdinner`, `pendingBf`)   severity: medium   owner: engine
- site: web/js/engine-parser.js:19197 (`cham`: `/^(go|yes|ok|okay|sure|come|with her|let'?s go|hotel)\b/`), 19187
  (`bkkdinner`: `…|bangkok)\b`), 19431 (`pendingBf`'s `/^(pay|yes|ok(ay)?|sure|…)\b/` and `/^(st\b|short)/`, `/^(take|party)/`)
- defect: None of these three has a question guard. The barfine's `herPay` branch (19370) has one; its main branch does
  not. "go where?" or "hotel? which hotel?" at Cream ends the night (the day moves, ฿700 is spent) and arms `chamgift`.
  "bangkok? tonight?" gets into Sao's van, the whole night. At the barfine, "ok, how much?" pays the open contract, which is
  booked as long time: ฿3,400 and the night ends. That also skips the LONG TIME ask-twice rule (`_bfLtWarn`), which only
  the `lt` branch runs. "short time? how much is that?" pays the short time, and "take her out? where to?" pays her whole
  night out (฿2,700). Each of these ends the night or moves money on input that is a question.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="metro_beer_garden"; G.nightTurn=50; G.known.cream=true; _chamAsk(); out.length=0; const d=G.day, m=G.money; run("go where?"); console.log("day", d, "->", G.day, "money", m, "->", G.money, "pending", G.pendingChoice)'
  → day 2 -> 3 money 5000 -> 4300 pending chamgift
  node tools/probe.mjs 'sandbox(5000); G.room="candy_bar"; G.nightTurn=30; G.soc.drinks.nan=8; _doBarfine("nan"); out.length=0; const m=G.money,d=G.day; run("ok, how much?"); console.log("pendingBf", !!G.pendingBf, "money", m, "->", G.money, "day", d, "->", G.day); console.log(out.join(" / ").slice(0,200))'
  → pendingBf false money 5000 -> 1600 day 2 -> 3
  → You wave the money without settling terms. Nan glances at the mamasan; it goes in the book as long time, …
  (The same barfine setup with "short time? how much is that?" gives money 5000 -> 3600; "take her out? where to?" gives 5000 -> 2300.)
- fix: the same shared question guard as S3-1, run before each yes regex. At the barfine it also belongs before the
  `st`, `lt` and `party` branches. The guard has to let the price question already handled at 19387 through.

### S3-5: CHECKOUT's answer is matched unanchored: a question naming a hotel moves you there, and "i don't know" or "another hotel" cancels
- system: hotels (gate `checkout`)   severity: medium   owner: engine
- site: web/js/engine-parser.js:19268-19279 (`_doCommandInner`, the `checkout` intercept)
- defect: The cancel test is `/stay|cancel|no|keep|never ?mind/`, with no anchor and no word boundary. "no" matches inside
  "know", "another" and "nothing", so "i don't know", "what if i say no?" and "another hotel" all cancel. The pick tests
  (`/queen|vic|balcony/`, `/areca|lodge|diana/`, `/sabai|palm|…/`) are unanchored too. "what is the queen vic like?" or "how
  much is the areca?" checks you out and moves your bag, `G.hotel` and `G.room` to that hotel. The review of 2026-10-25
  anchored only the Metropole. The gate has no question guard either. A question should reprint the list (or the rates).
  A choice should be a hotel name at the start of the line, or STAY/CANCEL as whole words.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room=_hotelRoomId(); G.nightTurn=2; _doCheckout(); show("prompt"); run("what is the queen vic like?"); console.log("hotel", G.hotel, "room", G.room, "pending", G.pendingChoice); show("after")'
  → · (QUEEN VIC INN — ฿700/night) · (ARECA LODGE — ฿900/night) · (LK METROPOLE — ฿1,300/night) (Name your new hotel — or STAY.)
  → hotel queenvic room qv_room pending null
  → Terry watches your bag come up the stairs …
  (The harness also gives: "how much is the areca?" moves you to the Areca, and "i don't know" / "another hotel" print "You re-pocket the key card…")
- fix: run the question guard first, then `/^(stay|cancel|no|nope|keep|never ?mind)\b/`, then match the hotel names at the
  start of the line, as the anchored Metropole regex already does.

### S3-6: a morning gate overwrites the one already up. Cream's morning (`chamgift`) erases her-mat (`keptby`), which is offered once a life and is never offered again
- system: clock / destitution (gates `keptby`, `embassy`, `chamgift`)   severity: medium   owner: engine
- site: web/js/engine-play.js:6906 (`_destituteTick` arms `keptby`/`embassy`) then 6929 (`_chamMorning` sets
  `G.pendingChoice = "chamgift"`, engine-systems.js:5686, with no check)
- defect: "A trigger never arms on top of a gate already up." At the wake, `_destituteTick` can arm `keptby` and set
  `G.keptByUsed = true` (the offer is once a life). Then `_chamMorning` arms `chamgift` over it with no `!G.pendingChoice`
  check. Once the gift is answered, the gate clears and her offer is gone for good. The same overwrite drops a
  third-morning `embassy`, which then waits a day for the next roofless morning. The morning gates should queue, with
  Cream's morning (the bed) first and the destitution prompt after it, or `_chamMorning` should defer while another gate is up.
- repro:
  node tools/probe.mjs 'sandbox(0); G.bank=0; G.stage="expat"; _setFlag("expatLife"); G.payDay=G.day; G.hotel="sabai"; G.hotelDebt=_DEBT_CAP; G.soc.drinks.lek=8; G.talked.lek=[0]; G.room="metro_beer_garden"; G.nightTurn=50; G.known.cream=true; _chamAsk(); out.length=0; run("go"); console.log("pending:", G.pendingChoice, "keptByUsed:", G.keptByUsed, "keptOffer:", G.keptOffer); out.length=0; run("nothing"); console.log("after NOTHING pending:", G.pendingChoice, "keptBy:", G.keptBy, "keptByUsed:", G.keptByUsed)'
  → pending: chamgift keptByUsed: true keptOffer: lek
  → (Lek's text was printed: "you stay me. small room, one fan. … (YES — her mat … · NO.)", and then Cream's (GIFT <amount> · NOTHING))
  → after NOTHING pending: null keptBy: null keptByUsed: true
- fix: in `_endNight`, call `_chamMorning()` before `_destituteTick()`, and have `_destituteTick` re-arm on the next command
  when a gate is up. The smaller fix: in `_destituteTick`, do not set `keptByUsed` or arm while `G.chamNight` is set, and arm
  it from `_chamGift` once the gift is answered.

### S3-7: "YES again" at the consulate's plane never works: the confirm disarms itself and repeats forever
- system: clock / destitution (`_endConfirm`, gate `embassy`)   severity: medium   owner: engine
- site: web/js/engine-parser.js:18903-18907 (the `G.endWarn` pre-pass) against 19023 (`_endConfirm("embassy", …)`)
- defect: The embassy gate says "YES again, or TAKE THE PLANE, to go". The pre-pass maps YES only for the `sleep` and
  `sunrise` kinds. Its disarm table has no `embassy` (or `wait`) entry, so it falls back to `/^$/` and clears `G.endWarn`
  on the second YES before the gate reads it. `_endConfirm` then re-arms and prints the same warning, and it does so
  forever. The game makes a promise it never keeps. The same pre-pass makes YES at "(WAIT again if you mean it.)" print
  "That moment has passed", which is the round-74 defect again for WAIT.
- repro:
  node tools/probe.mjs 'sandbox(0); G.bank=0; G.stage="expat"; _setFlag("expatLife"); G.payDay=G.day; G.pendingChoice="embassy"; _embassyPrompt(); out.length=0; run("yes"); show("yes 1"); run("yes"); show("yes 2"); console.log("pending", G.pendingChoice, "endKind", G.endKind)'
  → == yes 1 == (That is the plane — the flight home, and the end of the game. YES again, or TAKE THE PLANE, to go; STAY for the bench.)
  → == yes 2 == (That is the plane — … YES again, or TAKE THE PLANE, to go; …)
  → pending embassy endKind null
  node tools/probe.mjs 'sandbox(); G.room="beach_rd_c"; G.nightTurn=112; run("wait 2 hours"); show("wait"); run("yes"); show("yes")'
  → That wait runs to 06:00 — the night ends inside it … (WAIT again if you mean it.)
  → (That moment has passed — nobody is asking you that now.)
- fix: add `embassy: /^(y|yes|ok|okay|accept|go|home)$/` (or skip the disarm while a `pendingChoice` owns the input) to the
  table at 18907. Map YES for `wait` as well: keep the original WAIT argument in `G.endWarn.arg` and replay it.

### S3-8: the Orchid Room shuts at 04:00 and prints "Two o'clock on Soi 6"
- system: clock / closings (`_closeTurn`)   severity: low   owner: engine
- site: web/js/engine-play.js:1590-1597 (the closing tick's walk-out line)
- defect: The walk-out line picks by region and barType. Every room that is not Darkside, gents or pub gets the hard-coded
  "Two o'clock on Soi 6." The Orchid Room's `_closeTurn` is 100, so the line asserts an hour the game did not compute.
  CLAUDE.md: "A string may not assert an hour … the game did not compute". The line should read `_closeClock(G.room)`.
- repro:
  node tools/probe.mjs 'sandbox(20000); G.stage="expat"; _setFlag("expatLife"); G.room="orchid_room"; G.nightTurn=99; run("wait"); show("@"+_clockStr())'
  → == @04:00 ==
  →   Two o'clock on Soi 6. The frontages roll down, the sound systems die mid-song, and the ladies shoo the last punters out onto the soi. …
  (A sweep over ROOMS shows orchid_room, close 100 / 04:00, is the only barType room whose `_closeTurn` disagrees with this line.)
- fix: branch on `_closeTurn(G.room) === SOI6_CLOSE` for the Soi 6 line, and give the Orchid its own line built from
  `_closeClock(id)` ("Four o'clock at the Orchid …").

### S3-9: a manager's SHIFT is accepted at a bar that shuts at midnight when it can no longer be stood, and the night is struck
- system: expat-jobs / clock (`_mgrShift`, `_closeTurn`)   severity: medium   owner: engine
- site: web/js/engine-play.js:7697 (`_mgrShift`: `if (G.nightTurn >= 60)`)
- defect: `_mgrShift` refuses only from turn 60 on, a midnight that is hard-coded. The owner's WORK (engine-systems.js:8347)
  also refuses a shift that cannot reach `WORK_MIN_STOOD`. The manager's version does not, and it ignores the job bar's own
  `_closeTurn`. At a Darkside or gents bar (close 60) a shift declared at 22:30 is accepted with "2 hours on it before the
  house counts the night". The shutter walks you out at midnight with 15 of the 20 turns stood, and the morning says "It did
  not count". The house sold the player a shift that could not be stood, and the job counts it against him.
- repro:
  node tools/probe.mjs 'sandbox(20000); G.stage="expat"; _setFlag("expatLife"); G.payDay=G.day; G.room="water_buffalo"; G.nightTurn=10; const h=Object.keys(NPCS).find(n=>_npcRoom(n)==="water_buffalo" && NPC_ROLES[n]==="hostess"); G.soc.drinks[h]=20; G.talked[h]=[0]; G.known[h]=true; _jobOffer("water_buffalo","wandee"); run("take the job"); out.length=0; G.nightTurn=44; run("work"); show("work @"+_clockStr()); let n=0; while (G.day===2 && n<40 && G.room==="water_buffalo") { run("wait"); n++; } out.length=0; console.log("room", G.room, "turn", G.nightTurn, "stood", G.job.shiftStood, "min", WORK_MIN_STOOD); G.room=_hotelRoomId(); _endNight("sleep"); console.log(out.filter(l=>/shift|stood|counts/.test(l)).join("\n"))'
  → == work @22:30 == Tonight you stand The Water Buffalo's rail. 2 hours on it before the house counts the night; …
  → room khao_talo_strip turn 60 stood 15 min 20
  → (You declared a shift at The Water Buffalo and stood 15 turns of it; the house counts a night from 2 hours on the rail. It did not count.)
- fix: in `_mgrShift`, `const close = _closeTurn(j.room) ?? NIGHT_TURNS; if (close - G.nightTurn < WORK_MIN_STOOD) { say "too late
  to stand one tonight — the shutter comes at " + _closeClock(j.room); return; }`. Apply the same refusal to the hard-coded `60`
  in the owner's WORK, so the rule lives in one place.

## Summary

Nine findings. The most serious is S3-1: at SELL UP's confirm, a question ("sell? what happens to the girls?", "yes?")
sells the bar and ends the game. S3-2 is close behind: typing "tan first" at Candy's 51% prompt, which is the prompt's own
advice, signs Candy and charges ฿12,000. S3-1 to S3-5 are one class: a `pendingChoice` handler with no question guard
whose yes regex is a prefix of a question or a hedge. modal-audit cannot see the class, because all four of its
non-answers start with "what", "huh" or "pardon". Add `<first option word>? …` and "let me think" probes. The clock side is
mostly clean: WAIT across dawn asks, `_passTime` stops at a new G, and the non-carry gates clear at dawn. Outside it I found
the morning-gate overwrite (S3-6), the embassy YES loop (S3-7), the Orchid's "two o'clock" (S3-8) and the manager shift at
a midnight bar (S3-9). Suspected but not pursued (other sections own them):
- The encounters (`_ENC`) have the same class. "sure?" ends the night and pays at the freelancer (฿3,435), the jptourist
  deal and the coconut bar. "how much?" at the coconut bar spends ฿1,200 and ends the night, though the code exempts the
  price question only for the tonic man and the fortune-teller. "later" or "maybe" at freegift costs ฿500, and the same at
  the katoey costs ฿40. Some of these may be the designed grab.
- At the fare gate, "i won't" and "i don't know" are parse failures (`_HUH`).
- At the procurement job (`synjob`), "deal? what deal?" hires the cleaners.
- At Tan's favour (`tanfavour`), "take what?" takes the slip.
- Raw `G.day % 7` survives outside the calendar helpers at engine-core.js:1640, 1819 and 1824 (the regulars' `days`),
  engine-play.js:6844 and 7709 (school days) and engine-systems.js:5770 and 8969. These are consistent today. They break
  rule 6, not behaviour.


# S4 — The talk order and the conversation layer (conversation, quests, regulars, filler, thai, phone)

### S4-1: A woman who walked you out (mai dee) still answers MESSAGE if you type a word after her name or a prefix
- system: phone   severity: high   owner: engine
- site: web/js/engine-systems.js:4726 / 4730 (`_doMessage`)
- defect: The face-loss check (`_judged`) matches a contact only when the whole argument is her exact id or name, but the
  real lookup below it is fuzzy (`name.includes(w.split(" ")[0])`). So "MESSAGE LAMAI miss you" or "MESSAGE LAM" skips
  the verdict, adds bond (`_addBond`), and she replies with the floor's "555+ you funny" — the exact Marcus round-61 bug
  ("miss you na" thirty seconds after "we finish") reopened by the most natural way to write a text. Face-loss is
  permanent by doctrine: nothing should reopen her.
- repro:
  node tools/probe.mjs 'sandbox(); G.room="stinky_bar"; G.phone.contacts.lamai={}; G.maiDee={lamai:G.day}; G.room="beach_rd_s"; run("message lamai"); show("exact"); G.phone.msgCd={}; run("message lamai miss you"); show("with text"); G.phone.msgCd={}; run("message lam"); show("prefix"); console.log(G.phone.inbox.map(m=>m.from+": "+m.text))'
  → == exact ==  Read. No reply. The two blue ticks sit there like a closed door …
  → == with text ==  You send Lamai something short and sweet with one emoji too many. (📱 She replies almost instantly. CHECK MESSAGES.)
  → == prefix ==  You send Lamai something short and sweet …
  → [ 'lamai: 555+ you funny', 'lamai: bar quiet 😴 boss angry at everybody' ]
- fix: resolve `id` first (the fuzzy lookup), then test `_maiDee(id)` on the resolved id instead of a separate exact-match pass.

### S4-2: A hostess away in Bangkok for the season texts "tonight X work late, you come??", and arriving at her bar plays the invite scene (+2 สนุก, bond) for a woman who is not there
- system: phone   severity: high   owner: engine
- site: web/js/engine-systems.js:5992–6078 (`_maybeIncomingText` — no `_awayForSeason` filter; harvest only gets its one text at 6070) and web/js/engine-parser.js:1643 (`_arriveAt`, the invite honoured on `_npcRoom`, not `_npcWhere`); also `_doMessage`'s reply pool (4785ff)
- defect: `_awayForSeason` women (the "bangkok" trough fifth, and a harvest woman after her one harvest text) stay in the
  texting pool, so they send ordinary invites ("tonight Dao work late. you come??") and set `G.phone.invite`. The honour
  check in `_arriveAt` reads `_npcRoom` (her home bar, presence-blind), so walking in prints "Dao spots you from across
  the room… the kept seat is produced" with +2 สนุก and a bond point — and the very next TALK says "Dao isn't at this
  bar — gone to Bangkok". MESSAGE DAO gets "come see me tonight!!" the same way. Ought: an away woman never invites
  (at most the one away-text), and the invite is honoured only on `_npcsHere().includes(inv.id)`.
- repro:
  node tools/probe.mjs 'sandbox(); G.season0=8; G.day=1; const id="dao"; G.phone.contacts={dao:{}}; G.soc.drinks.dao=6; G.room="beach_rd_s"; G.phone.lastText=-999; G.turns=100; const q=[0.01,0,0.9,0.1]; _rand=()=>q.length?q.shift():0.5; console.log("away:",_awayForSeason(id),"where:",_npcWhere(id)); _maybeIncomingText(); show(); console.log(G.phone.inbox.slice(-1)[0].text, G.phone.invite)'
  → away: bangkok where: null
  → hello handsome 👋 tonight Dao work late. you come?? 🍺 { id: 'dao', day: 1 }
  node tools/probe.mjs 'sandbox(); G.season0=8; G.day=1; G.nightTurn=30; G.phone.contacts={dao:{}}; G.soc.drinks.dao=6; G.phone.invite={id:"dao",day:1}; G.room=NPCS.dao.room; const h0=G.happy; _arriveAt(NPCS.dao.room); show(); console.log("here:", _npcsHere().includes("dao"), "happy", h0, "->", G.happy); run("talk dao"); show()'
  → Here: 👵 Mamasan Mem, ✨ Mook (95), 💫 Ice (15), 🌼 Praew (37), 🧾 Golf.
  → Dao spots you from across the room and her whole evening visibly reorganises itself around your arrival … (+2 สนุก)
  → here: false happy 0 -> 2
  → Dao isn't at this bar — gone to Bangkok till the rain stops, the way the smart ones do in the trough.
- fix: in `_maybeIncomingText` filter `contacts` by `!_awayForSeason(id)` after the harvest one-text branch; in `_arriveAt`
  (and `_frontier`'s invite row, `_readMessages`' 📌 line) test `_npcsHere().includes(inv.id)` / `_npcWhere`.

### S4-3: `_textTalk` (answerer #3) steals a woman's own authored topic whenever a text of hers shares the word — and its 7-day window is dead because no message carries a `day`
- system: conversation / phone   severity: medium   owner: engine
- site: web/js/engine-parser.js:5019 (`_doTalkCore` → `_textTalk`), web/js/engine-systems.js:6604 (`_textTalk`), 4500 (`_pushMsg` never stamps `day`)
- defect: `_textTalk` sits third in the talk order, above `_deliver`, and answers any topic word (≥4 letters, not a stop
  word) found in any text she sent. Unlike `_streetTalk` (which yields to an unheard authored node, 5024–5028) it has no
  ownership guard, so "ask somo about dream" — her plan node (rubber, two rai) — gets her "i dream about you" text quoted
  back. 61 hostesses have a `dream` topic and `i dream about you last night` is in the tier-3 text pool. The stated limit
  `G.day - (x.day || G.day) <= 7` is always 0 because `_pushMsg` writes `{from,text,turn,…}` with no `day`, so a text
  from 37 days ago still answers.
- repro:
  node tools/probe.mjs 'sandbox(); const id="somo"; G.room=NPCS[id].room; G.nightTurn=30; run("ask somo about dream"); show("no text"); who(); G.talked[id]=[]; G.day=3; G.phone.contacts[id]={}; _pushMsg(id,"i dream about you last night na 💭❤️"); G.phone.inbox.slice(-1)[0].read=true; G.day=40; run("ask somo about dream"); show("with a text from 37 days ago"); who(); console.log(JSON.stringify(G.phone.inbox.slice(-1)[0]))'
  → == no text ==  "Rubber. My family have two rai, small." … answered by: _deliver
  → == with a text from 37 days ago ==  "That?" Somo taps her own {{phone}}. "“i dream about you last night na 💭❤️”. I write it, I mean it. Same thing, na."  answered by: _textTalk
  → {"from":"somo","text":"i dream about you last night na 💭❤️","turn":1,"read":true,"gives":0,"fromName":null,"photo":null}
- fix: stamp `day: G.day` in `_pushMsg`; in `_textTalk`'s subject branch return false when an unheard node of hers hits the
  topic (the `_streetTalk` `_owns` test, or `_ownWordTalk`'s `dl.some((d,i)=>d.topic && !seen.includes(i) && _topicHits(...))`).

### S4-4: `_lastTimeTalk`'s house branch (answerer #19) pre-empts the mamasans' and cashiers' authored, gated LAST TIME nodes — the returning-trip line never plays
- system: conversation   severity: medium   owner: engine
- site: web/js/engine-parser.js:9267 (`_lastTimeTalk`)
- defect: For a mamasan or cashier met on an earlier day, the house branch answers "last time" with the generic
  `_LAST_TIME_HOUSE` line without ever consulting her own nodes. Twenty-odd house women (Wanida, Sunee, Waew, Somjai,
  Nubnab, Tukky, Grace, Aim, every Soi 6 expansion mama/cashier) carry a `when`-gated LAST TIME node — the returning-trip
  one (`G.vacation > 1 && prevBond >= 1`) and Jinda's `!sat`. Those are now dead whenever metDay < today, which is
  exactly when they are open. The hostess branch below already has the right guard ("her gated returning-trip node is
  hers to say": `own.topic && own.when`); the house branch lacks it.
- repro:
  node tools/probe.mjs 'sandbox(); const id="wanida"; G.room=_npcWhere(id)||NPCS[id].room; G.nightTurn=20; G.vacation=2; G.day=1; G.prevBond={wanida:2}; G.metDay={wanida:-4}; G.talked[id]=[0]; run("ask wanida about last time"); show(); who(); console.log("authored node open:", (_pickDialogue(id,"last time")||{}).text.slice(0,60))'
  → "Five nights ago," Wanida says, without looking anything up. "Briefly. I remember who came through that door; it is half the job."
  → answered by: _lastTimeTalk
  → authored node open:  "Last time you were polite and you paid." Wanida says it as
- fix: at the top of the house branch, `const own = _pickDialogue(npc, "last time"); if (own && own.topic && own.when) return false;` (same as the hostess branch).

### S4-5: `_jobMemoryTalk` (answerer #15) answers any question containing the word "me" from a done quest's giver — Tan's ride offer becomes "Of course I remember you"
- system: conversation / quests   severity: medium   owner: engine
- site: web/js/engine-parser.js:9429 (`_jobMemoryTalk`)
- defect: The trigger regex includes a bare `\bme\b`, so once any quest whose `giver` is this person is done, every topic
  with "me" in it — "drive me", "pick me up", "take me home", "help me", "teach me" — is answered with the job memory
  line, above `_deliver`. After the expat wallet job (`wallet_again`, giver Tan), ASK TAN ABOUT DRIVE ME no longer gets
  his once-a-trip ride offer with its (CALL TAN) — the only place that mechanic is explained — but "The Lost Wallet.
  People who help, I keep." (also wrong in substance: Tan helped you).
- repro:
  node tools/probe.mjs 'sandbox(); G.nightTurn=20; G.room=_npcWhere("tan"); run("ask tan about drive me"); show("before"); who(); G.quests.wallet_again="done"; G.talked.tan=[]; run("ask tan about drive me"); show("after the wallet job"); who(); run("ask tan about pick me up"); show(); who();'
  → == before ==  "A ride?" Tan pats the roof of the sedan. "You have my number. When the buses are gone … (CALL TAN)"  answered by: _deliver
  → == after the wallet job ==  "Of course I remember you," Tan says. "The Lost Wallet. People who help, I keep."  answered by: _jobMemoryTalk
  → "Of course I remember you," Tan says. "The Lost Wallet. People who help, I keep."  answered by: _jobMemoryTalk
- fix: drop the bare `me` alternative (keep `remember me|know me|who am i|…`), and yield to an open authored node that hits the topic.

### S4-6: `_partyTalk` (answerer #10) takes "home" — her home-village node — the day after you sent her home in a taxi
- system: conversation   severity: medium   owner: engine
- site: web/js/engine-parser.js:8538 (`_partyTalk`, the `sentHome` branch; same shape in the `my room|hotel|morning|bed` branch at ~8532)
- defect: The night-out memory answers `/\b(taxi|…|home)\b/` whenever `partyLog[npc].sentHome` is from last night, above
  `_deliver`, with no check for her own node. "home" is the commonest way to ask a woman where she is from (Somo's node
  is `home|nakhon phanom|isan|village|…`), so for a day after a gentlemanly taxi the question about her village is
  answered about the taxi. `_ownWordTalk` and `_streetTalk` both already yield to an unheard node on the word; this one does not.
- repro:
  node tools/probe.mjs 'sandbox(); G.day=3; const id="somo"; G.room=NPCS[id].room; G.nightTurn=30; run("ask somo about home"); show("plain"); who(); G.talked[id]=[]; G.partyLog={somo:{day:2, sentHome:true, rooms:[]}}; run("ask somo about home"); show("day after the taxi"); who();'
  → == plain ==  "Nakhon Phanom — the town, not the river. My father fix motorbikes behind the market …"  answered by: _deliver
  → == day after the taxi ==  "You send me home like a gentleman," Somo says, a little surprised still. "Taxi, money in my hand, no argument. I tell mama."  answered by: _partyTalk
- fix: drop bare `home` from the taxi regex (keep `taxi|the ride home|sent me home|send me home`), or gate the branch on no unheard authored node hitting the topic.

### S4-7: A gendered pronoun resolves to the conversation partner whatever their sex — "buy her a drink" while talking to Bert buys Bert a drink
- system: conversation   severity: medium   owner: engine
- site: web/js/engine-core.js:2145 (`_resolveActor`; `_PRONOUN` at 2125 treats her/him/she/he alike)
- defect: `_resolveActor` takes the antecedent (`_lastActor()` = the active partner) for any pronoun, never checking that
  "her"/"she" fits a woman and "him"/"he" a man. In the Stinky Pinky, talking to Bert with eight women on the floor,
  "ask her about family" asks Bert, and "buy her a drink" spends ฿80 on Bert; with Manow as partner, "ask him about
  pool" asks Manow. Money moves to the wrong person.
- repro:
  node tools/probe.mjs 'sandbox(); G.nightTurn=20; G.room="stinky_bar"; run("talk to bert"); out.length=0; run("ask her about family"); show("ask HER, talking to Bert"); who(); run("buy her a drink"); show("buy her a drink"); run("talk to manow"); out.length=0; run("ask him about pool"); show("ask HIM while with Manow"); who()'
  → == ask HER, talking to Bert ==  “That one's above my pay grade,” Bert says. … · You asked Bert about family
  → == buy her a drink ==  “Now you're speaking the language.” Bert pours himself a proper one … ฿80 well spent … (฿1,920 left.)
  → == ask HIM while with Manow ==  "The table?" Manow looks at it … · You asked Manow about pool
- fix: in `_resolveActor`, when `w` is her/she (him/he), accept the antecedent only if `_pr(ante).s` matches, else fall to
  the sole matching-sex candidate in `pool` or null ("who do you mean?"). The `buyfor` reader in `_readRouteBody` (17589) needs the same test.

### S4-8: CALL works on anyone in the eyeline without a number — Bert and Doug "text back" in floor Tinglish and the line points at a MESSAGE that refuses; the verdict and the affair's end are ignored too
- system: phone   severity: medium   owner: engine
- site: web/js/engine-parser.js:14890 (`_doCall`)
- defect: `_findNpc(arg) || _contactByName(arg)` lets you ring anybody standing in the room, contact or not. Everybody
  "replies" with the same hostess text ("ทำไมโทรมา 555 why you CALL???") — an American bar manager included — and the
  line ends "(MESSAGE BERT instead.)", a promise MESSAGE breaks ("No such number in your phone"). It also ignores
  `_maiDee` (a woman who has decided sends a playful "why you CALL???") and the affair's ended branches that
  `_doMessage` honours; and it never drains the battery it checks.
- repro:
  node tools/probe.mjs 'sandbox(); G.nightTurn=20; G.room="stinky_bar"; console.log("contacts", Object.keys(G.phone.contacts)); run("call bert"); show("not a contact, American man"); G.phone.contacts.lamai={}; G.maiDee={lamai:G.day}; G.room="beach_rd_s"; run("call lamai"); show("verdict");'
  → contacts []
  → == not a contact, American man ==  You call Bert. It rings out. Nine seconds later the phone buzzes in your hand: “ทำไมโทรมา 555 why you CALL???” — nobody in this town answers a phone. (MESSAGE BERT instead.)
  → == verdict ==  You call Lamai. … “ทำไมโทรมา 555 why you CALL???” … (MESSAGE LAMAI instead.)
  node tools/probe.mjs 'sandbox(); G.nightTurn=20; G.room="stinky_bar"; run("call bert"); out.length=0; run("message bert"); show()'
  → No such number in your phone. (CONTACT a girl in her bar first.)
- fix: require `G.phone.contacts[id]` (a person in the eyeline without one gets "You don't have a number for X"); route
  `_maiDee`/ended-affair contacts to the read-no-reply line; give the "why you CALL" text only to `_texts(id)` contacts; drain a battery point.

### S4-9: ACCEPT hands over a quest's item from a giver across town when the giver has no `bars` list (Kwan's crane, Duangjai's tiffin, Bank's helmet, Mala's flyer)
- system: quests   severity: low   owner: engine
- site: web/js/engine-systems.js:3735 (`_doAccept`)
- defect: The Bronwyn round-39 guard ("a quest with a THING to hand over is accepted where she is") only fires when the
  giver has `NPCS[giver].bars`. Single-bar givers fail the guard, so a quest offered earlier and accepted from Soi 6
  Deep prints "(You now have Kwan's crane.)" with Kwan at Sunset Dreams. Ought: an item quest is accepted only with the
  giver in the room, whatever her bar count.
- repro:
  node tools/probe.mjs 'sandbox(); G.nightTurn=20; for (const q of ["kwan_crane","lake_errand","helmet","scout"]) { G.quests[q]="offered"; G.room="soi6_deep"; out.length=0; run("accept "+q.replace("_"," ")); console.log(q, "giver here:", _npcsHere().includes(QUESTS[q].giver), "|", out.join(" ").slice(0,200), "| item:", G.itemLoc[QUESTS[q].item]); }'
  → kwan_crane giver here: false | ✦ Quest accepted: A Crane for Her Brother … (You now have Kw… | item: inventory
  → lake_errand giver here: false | ✦ Quest accepted: Look In on My Boy … | item: inventory
  → helmet giver here: false | ✦ Quest accepted: Bank's Helmet … (You now have the spare helmet.) | item: inventory
  → scout giver here: false | ✦ Quest accepted: A Scout for Petch … | item: inventory
- fix: drop the `.bars &&` term: `if (q.item && NPCS[q.giver] && !_npcsHere().includes(q.giver)) { …isn't here to hand it over… }`.

### S4-10: A quest reward paid into the pocket nets into the morning ledger unnamed ("up ฿600" for ฿1,000 from Candy)
- system: quests   severity: low   owner: engine
- site: web/js/engine-systems.js:4211–4214 (`_questTick`, `G.money += q.reward.money`)
- defect: Job money paid by hand is counted in `G.jobPaid` and named ("฿N paid to you for a job"); a quest reward
  handed over in person goes straight to `G.money` and is not tallied anywhere the ledger reads, so the morning line
  reads "up ฿600 on the night" with nothing naming Candy's ฿1,000. (The bank-app path is named by `bankIn`.) The
  doctrine is that the morning ledger names every movement.
- repro:
  node tools/probe.mjs 'sandbox(2000); G.nightTurn=119; run("wait","wait"); out.length=0; G.nightTurn=20; G.room=_npcWhere("candy"); G.quests.orchid_intro="active"; _setFlag("orchidVouched"); run("look"); console.log(out.filter(l=>/QUEST|\+฿/.test(l)).join("\n")); out.length=0; G.nightTurn=119; run("wait","wait"); out.length=0; run("last night"); show()'
  → ✦ QUEST COMPLETE: An Introduction
  → (+฿1,000 from Candy — ฿2,600 in pocket.)
  → Last night: +8 สนุก · up ฿600 on the night
- fix: `else { G.money += q.reward.money; G.jobPaid = (G.jobPaid || 0) + q.reward.money; }`.

### S4-11: LESSON in the night's last minutes charges ฿100 and runs the hour into the dawn
- system: thai   severity: low   owner: engine
- site: web/js/engine-systems.js:13801 (`_doLesson`)
- defect: The 2026-10-25 review added `_tooLateFor` to every paid hour (massage, oil, special, bath, clinic) so the money
  is refused before it moves when the time would cross six; Waen's hour (`LESSON_TURNS` = 10) was left out. At 05:51 the
  lesson takes ฿100 and `_passTime` ends the night inside it. The free hour (`G.clozeFree`) has the same shape (it spends
  the one free hour into the dawn).
- repro:
  node tools/probe.mjs 'sandbox(2000); G.room="cloze"; G.nightTurn=117; console.log("waen here", _waenHere(), "LESSON_TURNS", LESSON_TURNS); const m0=G.money, d0=G.day; run("lesson phrases"); console.log(out.slice(0,12).map(l=>l.slice(0,160)).join("\n")); console.log("money", m0, "->", G.money, "day", d0, "->", G.day)'
  → waen here true LESSON_TURNS 10
  → (-฿100, ฿1,900 left. She has more of this one …)
  → 06:00 arrives and finds you still standing …
  → money 2000 -> 1500 day 2 -> 3
- fix: `if (_tooLateFor(LESSON_TURNS, "An hour at the board")) return;` before the clozeFree branch and before the charge.

## Summary

Eleven findings, all reproduced. The most serious are S4-1 (a woman under the permanent face-loss verdict answers
MESSAGE as soon as you add a word or type a prefix, and the text adds bond) and S4-2 (a hostess away in Bangkok
for the season sends an ordinary invite, and walking into her bar plays the kept-seat welcome with +2 สนุก while the
roster and her TALK say she is gone). Four talk-order steals (S4-3 `_textTalk`, S4-4 `_lastTimeTalk`'s house branch,
S4-5 `_jobMemoryTalk`'s bare "me", S4-6 `_partyTalk`'s bare "home") have the same root cause: an upper answerer with no
"an open/unheard authored node on this word wins" guard, which `_streetTalk`, `_ownWordTalk` and the hostess branch of
`_lastTimeTalk` already have — a shared helper would close the class. Suspected but not reproduced: `_saidAgrees`
calls consistent answers a lie ("Sydney" vs "Australia", "Manchester" vs "England" both return false, which would cost
rep via the grapevine), but I could not get a second woman's `home` ask to fire in a probe; `_introLine` (engine-parser
~17508) compares `NPCS[x].room` raw, so two women at a multi-bar owner's second bar read as strangers (not probed);
`_findQuest` takes the first quest whose name merely *contains* the typed word, so a short ACCEPT word can take an
available-but-unoffered quest ahead of the offered one (not probed).


# S5 — The bar floor: drinks, the women, the barfine

Reviewer: S5. Systems: drinks, ladydrinks, social, bell, barfine, party, games.
All repros run from the worktree root with `node tools/probe.mjs`.

### S5-1: The barfine gate reads refusals and questions as a yes: "no, don't take her out" buys the night out, "fine, i'll pass" buys the long time and ends the night
- system: barfine   severity: high   owner: engine
- site: web/js/engine-parser.js:19410 and :19432 (`_doCommandInner`, the `G.pendingBf` intercept); also the `^(st\b|short)` and `^(lt\b|long…)` branches between them
- defect: The main (non-herPay) barfine gate never asks `_isRefusal(input)` and has no question guard. It tests `/\b(her|them) out\b/` unanchored, so any sentence containing "her out" commits TAKE HER OUT. It tests `^take` (so "take a pass" commits), `^short` (so "short on cash, sorry" commits SHORT TIME), and `^(pay|yes|ok|sure|fine|…)\b`, so "fine, i'll pass" or "sure, maybe later" signs the open contract. The open contract goes straight to long time and ends the night, skipping the LONG TIME confirmation the LT branch requires. Money moves and the night can end on a no. The herPay sub-gate just above already handles both cases correctly. What should happen: ask `_isRefusal` first (back out), hold the gate on a question (`?`/what/how/if… → reprompt, no turn), and anchor the "her out" match.
- repro:
  node tools/probe.mjs 'sandbox(20000); G.room="stinky_bar"; G.nightTurn=40; G.soc.drinks.jiap=8; run("barfine jiap"); out.length=0; const m=G.money; run("no, don'"'"'t take her out"); console.log("paid", m-G.money, "party", JSON.stringify(G.party&&G.party.ids)); show()'
  → paid 2700 party ["jiap"]
  → (-฿2,700 for her whole night, ฿17,300 left.)
  Same harness, different answers (output: `<input> => paid; party; gate still up`):
  → what happens if i take her out? => 2700 paid; party ["jiap"] pending false
  → take a pass => 2700 paid; party ["jiap"] pending false
  → short on cash, sorry => 1400 paid; (short time played out, +7 สนุก)
  → fine, i'll pass => 3400 paid; "You wave the money without settling terms… it goes in the book as long time" → the LT night ends
  → sure, maybe later => 3400 paid; same LT night end
- fix: At the top of the main pendingBf branch, after the HOW MUCH check, add `if (/\?\s*$/.test(lower) || /^(what|how|why|if|and if|when|does|do i|is|will|would|can|should)\b/.test(lower)) { _bfPrompt(); return; }` and `if (_isRefusal(lower)) { …the NO branch… }`. Anchor the party match as `/^(take (her|them) out|take \w+ out|party)\b/`. Make the open contract (`^(pay|yes|ok…)`) set `ltAsked` and show `_bfLtWarn` the first time, like LONG TIME does.

### S5-2: A bare BARFINE in a room with no staff re-barfines the woman already on your arm: charged again, and `G.party.ids` becomes ["pukky","pukky"]
- system: party   severity: high   owner: engine
- site: web/js/engine-systems.js:895 (`_doBarfine`, the `here.length === 1 ? here[0] : null` fallback); the "girl on your arm" guards at :835–843 only run `if (… && arg)`
- defect: With no argument, `_doBarfine` picks the only roled NPC in `_npcsHere()`. `_npcRoom` puts a companion in whatever room you are in, so in a pub (Queen Vic, LK Sports, Take Care Me, Lake Bar: no roled staff) that NPC is your companion. The "you already pay for tonight" refusal is skipped because it needs `arg`. The ledger opens on her and TAKE HER OUT charges the party price a second time. `_bfResolve("party")` pushes her id twice, so every later stop charges two lady drinks and gives her double bond. "Pukky looks at Pukky" is printed. What should happen: a companion is never a barfine target. The no-arg path should exclude `G.party.ids`, or the party refusal should run without `arg`.
- repro (the real path: take her out, walk to the Vic, type BARFINE):
  node tools/probe.mjs 'sandbox(20000); G.room="sunset_rail"; G.nightTurn=30; G.soc.drinkCount={pukky:1}; G.soc.drinks.pukky=8; run("barfine pukky","take her out"); out.length=0; run("out","enter queen vic"); out.length=0; const m=G.money; run("barfine"); show("bare barfine"); run("take her out"); show(); console.log("charged", m-G.money, "party", JSON.stringify(G.party.ids))'
  → (You have company already: TAKE HER OUT ฿2,700 — she comes too, and the night keeps going · NO backs out.)
  → (-฿2,700 for her whole night, ฿14,450 left.)
  → Pukky looks at Pukky, Pukky looks at Pukky, and something is agreed at a frequency you will never be cleared for. Two arms now…
  → charged 2700 party ["pukky","pukky"]
- fix: In `_doBarfine`, compute `here` with `.filter(id => NPC_ROLES[id] && !((G.party && G.party.ids) || []).includes(id))`. Add a guard in `_bfResolve("party")`: `if (p2.ids.includes(id)) return` before the push.

### S5-3: Self-barfine (YES to "I pay my own barfine") ends the night credited to the wrong woman, and can fire with another woman on your arm
- system: barfine   severity: medium   owner: engine
- site: web/js/engine-encounters.js:648–666 (`selfbf`, the `_endNight("barfine")` on YES); web/js/engine-systems.js:2801–2820 (`_maybeSelfBarfine`)
- defect: The YES branch calls `_endNight("barfine")` without setting `G.lastBfId`, `G.soc.bfBar`, `G.wentWith` or `G.lastBfBase`. The long-time close, the conquest/jading roll, `seenDay`, `homeSeen` and the Cinderella coda all read `G.lastBfId`. That is still whoever you short-timed earlier that night, or the companion `_bfResolve("party")` set it to. Pukky pays her own fine, and the night is booked to Jiap: Jiap gets the "same night" jading line and the seen-day stamp, and Pukky is recorded nowhere. Separately, `_maybeSelfBarfine` only checks whether the asker is the companion (`G.party.ids.includes(id)`), unlike `_maybeGoWithYou`, which refuses whenever anyone is on your arm. So she offers in front of the woman you took out, and YES dumps that woman with the "professionally unentangled" soft goodbye. What should happen: YES should set `G.lastBfId = G.selfBfId` (and `wentWith`/`bfBar`) before `_endNight`, and the offer should not arm while `G.party` has anyone in it.
- repro (an earlier short time, then a self-barfine at another bar):
  node tools/probe.mjs 'sandbox(50000); G.peddlerNight=99; G.room="stinky_bar"; G.nightTurn=40; G.soc.drinks.jiap=8; run("barfine jiap","short time"); out.length=0; G.pendingEnc=null; G.room="sunset_rail"; G.nightTurn=65; G.soc.drinks.pukky=8; G.soc.drinkCount={pukky:1}; G.soc.bells.sunset_rail=3; G.soc.bellAt.sunset_rail=G.turns; const r0=_rand; _rand=()=>0.1; _maybeSelfBarfine("pukky"); _rand=r0; show("offer"); run("yes"); show("yes"); console.log("seenDay", JSON.stringify(G.seenDay), "wentWith", JSON.stringify(G.wentWith))'
  → Pukky … “I pay my own barfine tonight. You don't tell anybody, na.”
  → (Again, and she is fond about it, and something in the room has still gone flat. It is the same night now, not a new one — that is what tomorrow is for.)   ← Jiap's repeat-night jading, applied to Pukky's night
  → seenDay {"jiap":3,…}  wentWith {"jiap":{"day":2,"turn":41,"kind":"st"}}   ← no pukky anywhere
  With Jiap on your arm (`run("barfine jiap","take her out")` first, then the same offer): the offer arms, and YES prints "No treadmill with her" (Jiap's tier) and then "(Jiap melts away somewhere in the confusion, professionally unentangled…)".
- fix: In `selfbf` YES: `G.lastBfId = G.selfBfId; (G.soc.bfBar = G.soc.bfBar || {})[G.room] = G.selfBfId; (G.wentWith = G.wentWith || {})[G.selfBfId] = { day: G.day, turn: G.nightTurn, kind: "lt" }; G.lastBfBase = 10;` before nulling `selfBfId`. In `_maybeSelfBarfine`, replace the companion check with `if (G.party && G.party.ids && G.party.ids.length) return;`.

### S5-4: A man on the bench (`G.street`) who takes a woman out and types GO HOME WITH her is teleported into the hotel room the desk will not let him into
- system: party   severity: medium   owner: engine
- site: web/js/engine-systems.js:1750–1768 (`_partyHome`, `const home = _hotelRoomId(); G.room = home`)
- defect: `_partyHome` sets `G.room = _hotelRoomId()` directly and never asks `G.street`. On the bench, `G.hotel` still names the old hotel. Walking in is refused ("The book first, sir" — the guest-only door), but GO HOME WITH puts him in room 412 with her, prints "(Your room. SLEEP ends the night together, her way.)", and charges the ride home. SLEEP there then says "the night ends on whatever bench you can find". `G.street` is a registered predicate, and this line is wrong under it. What should happen: on the bench there is no room to take her to. GO HOME WITH should refuse in her voice, or send her home with `_partyGoodbye`, before any fare is charged.
- repro:
  node tools/probe.mjs 'sandbox(20000); G.stage="expat"; G.peddlerNight=99; G.street={since:1,nights:2,swept:0}; G.room="stinky_bar"; G.nightTurn=60; G.soc.drinks.jiap=8; run("barfine jiap","take her out"); out.length=0; G.pendingEnc=null; run("go home with jiap"); show("home"); console.log("room", G.room, "street", JSON.stringify(G.street)); run("sleep"); show("sleep")'
  → (Your room. SLEEP ends the night together, her way.)  Your Room — Sabai Palms Hotel … Here: ✨ Jiap (with you).
  → room hotel_room street {"since":1,"nights":2,"swept":0}
  → It's 00:30. Sleep now and the night ends on whatever bench you can find; the morning finds you there.
  Control (walking in): `G.room="hotel_soi"; run("n")` → "The night man at Sabai Palms Hotel looks up, and the key stays on its hook. \"The book first, sir.\""
- fix: At the top of `_partyHome`: `if (G.street) { _say(…she reads it, no room to go to…); _partyGoodbye(); return; }`. Do the same in `_affairHome` and `_takeHome` if they share the shape. Optionally refuse TAKE HER OUT on the bench with LT-style wording.

### S5-5: A manager can barfine his own cashier at the bar he manages (the "cannot barfine his own girls" rule checks hostesses only)
- system: barfine   severity: medium   owner: engine
- site: web/js/engine-core.js:950 (`_myFloorGirl`, `NPC_ROLES[id] === "hostess"`); web/js/engine-systems.js:822 (`_doBarfine`'s manager guard)
- defect: `_myFloorGirl` only covers hostesses, so the manager guard lets through the job bar's cashier. The engine already treats her as his staff (`_jobBarStaff`: her lady drinks are free to him, she gives the "Boss" hello and texts him as the floor). After two bells the cashier gate opens. The manager then pays a short time ("฿400 to the ledger for the bar's fine, ฿1,000 into Numfon's own hand") and is not warned, struck or fired. `_atOwnBar` refuses every barfine of the owner's own staff; the manager's equivalent should cover the same staff. What should happen: `_jobBarStaff(id)` (or roles hostess + cashier) is refused with `_JOB_BARFINE_NO`.
- repro:
  node tools/probe.mjs 'for (let d=2; d<8; d++){ sandbox(20000); G.day=d; G.stage="expat"; G.job = { kind: "manager", room: "sunset_rail", corp: false, nights: 4, stood: 3, weekStood: 1, weekStart: 1, strikes: 0, since: 1 }; G.room="sunset_rail"; G.nightTurn=40; run("ring bell","ring bell"); out.length=0; G.soc.drinks.numfon=8; run("barfine numfon"); if (G.pendingBf){ show("day "+d); const m=G.money; run("short time"); show(); console.log("paid", m-G.money, "strikes", G.job.strikes); break;} out.length=0;}'
  → Numfon tells you the numbers plainly … (SHORT TIME ฿1,400 …)
  → ฿400 to the ledger for the bar's fine, ฿1,000 into Numfon's own hand, and a short climb up the stairs … she's back on her stool at The Shady Lady …
  → paid 1400 strikes 0
  Control: `run("barfine pukky")` at the same bar → "\"Barfine me?\" Pukky laughs… \"A manager who barfines his own floor is a manager for one night.\""
- fix: In `_doBarfine`'s first guard, use `_myFloorGirl(_girl) || _jobBarStaff(_girl)`, and re-check after `id` is resolved (the guard runs before the no-arg `here[0]` fallback, so a bare BARFINE that resolves to her also slips past it). Apply the same widening at the GO HOME WITH guard (engine-parser.js ~19770).

### S5-6: Soi 6 "she would not today" talk misses the colleague rule: a girl quotes "Up there. Short time ฿2,000…" and BARFINE then refuses "I don't steal customer"
- system: barfine   severity: medium   owner: engine
- site: web/js/engine-systems.js:1164–1173 (`_bfDayPeek`); read by engine-parser.js:9548 (the upstairs/short-time street talk) and :16043 (`_barfineTalk`)
- defect: The architecture doc requires a new refusal to go in both `_bfRefusal` and `_bfDayPeek`. `_bfDayRefusal` holds the "stealing" refusal (`G.soc.bfBar[G.room]` names another woman), but `_bfDayPeek` never checks it. So once you have short-timed one girl at a Soi 6 bar, her colleague asked about upstairs quotes her prices. On a beer bar, `_barfineTalk` quotes ("Short time ฿1,600 — bar take ฿600 …") with a BARFINE hint. BARFINE then refuses with the floor's rule. That is a quote the night had already answered, the class the peek exists to stop. What should happen: the peek returns "stealing", and `_BF_PEEK_SAY` gets a line for it.
- repro (the real path, Soi 6):
  node tools/probe.mjs 'sandbox(50000); _rand=()=>0.99; G.peddlerNight=99; G.room="pink_lotus"; G.nightTurn=40; const hs=_npcsHere().filter(i=>NPC_ROLES[i]==="hostess"); G.soc.drinkCount={}; for(const h of hs){G.soc.drinks[h]=3; G.soc.drinkCount[h]=1;} run("barfine joy","short time"); out.length=0; G.pendingEnc=null; run("ask puu about upstairs"); show("ask upstairs"); run("barfine puu"); show("barfine")'
  → Puu tips her head at the stairs at the back. "Up there. Short time, ฿2,000, then I come back to my stool. If you want me out all night, long time, ฿5,200 — the bar's fine to let me go, and mine."
  → Puu shakes her head before you finish asking, voice dropped low: “Cannot, na. You go with girl from here already — everybody see. I don't steal customer.”
  (Beer bar, after midnight: `console.log(_bfDayPeek("manow"), _barfineTalk("manow"))` after an ST with Jiap at the Stinky → `null “Mamasan first, then me.” … “Short time ฿1,600 — bar take ฿600, ฿1,000 for me…” (BARFINE <name>)`)
- fix: In `_bfDayPeek`, after `held`, add `if (G.soc.bfBar && G.soc.bfBar[G.room] && G.soc.bfBar[G.room] !== id) return "stealing";` and add `_BF_PEEK_SAY.stealing`. Do the same for `sponsor`/`draw` if the peek is meant to mirror `_bfDayRefusal`'s full order (it is not today).

### S5-7: Soi 6's one-drink rule is waived for the whole trip by one old tip (it reads `G.soc.given`, a trip book), while `_bfRefusal` counts only today's gifts — so the gate stays silent and she refuses for "cheap"
- system: barfine   severity: low   owner: engine
- site: web/js/engine-systems.js:988 (`_doBarfine`, `_tipped = G.soc.given[id] >= _ladyPrice()`); compare :1221 (`_bfRefusal`, `_tipped` from `G.gifts` where `g.day === G.day`)
- defect: The comment says "money already in her hand is better than a drink", tonight's rule. But `G.soc.given` is `socTrip` (STATE_SCHEMA): it is the sponsor-flip running total, and it includes bank SENDs. A ฿300 tip on night 1 skips "one lady drink first, na" on every later night of the trip. The refusal roll behind it uses a different test (today's gifts) and sees `_bought === 0`, so it can roll the "cheap"/"dislike" no that the drink rule exists to pre-empt. The two readings of "has he given her something" disagree. What should happen: both read today's gift (the `G.gifts` test at :1221).
- repro (through `_endNight`):
  node tools/probe.mjs 'sandbox(20000); G.peddlerNight=99; G.room="pink_lotus"; G.nightTurn=30; run("barfine joy"); show("night 1, no drink"); run("tip joy 300"); out.length=0; _endNight("sleep"); out.length=0; G.pendingEnc=null; G.peddlerNight=99; G.room="pink_lotus"; G.nightTurn=30; console.log("drinkCount", JSON.stringify(G.soc.drinkCount), "given", JSON.stringify(G.soc.given)); run("barfine joy"); show("next night, no drink")'
  → night 1: Joy laughs and taps the bar in front of her. “One lady drink first, na. Then we go up.” …
  → drinkCount {} given {"joy":300}
  → next night: Joy looks at you kindly, which is worse: “You nice man. But no, na.” … (the gate never asked for the drink; the dice-dependent "cheap" no fired instead — with `_rand=()=>0.99` the ledger simply opens with no drink bought)
- fix: Replace line 988's `_tipped` with the same expression as :1221: `((G.gifts || {})[id] || []).some(g => g.day === G.day && (g.kind === "tip" || g.kind === "give") && (g.amt || 0) >= _ladyPrice(G.room))`.

### S5-8: Short time at any gentlemen's club pays "฿X to Rose, discreetly" — Rose is Notty's mamasan; the Succubus, the Boardroom and the Doghouse have their own (or none)
- system: barfine   severity: low   owner: engine
- site: web/js/engine-systems.js:2122 (`_bfResolve`, the `bt === "gents"` short-time branch)
- defect: The gents branch hard-codes Rose and Notty's room ("the cold gold room", couches with a brass curtain rattle) for every `barType: "gents"` venue. At the Succubus (mamasan Kinnaree) the line reads "฿2,400 to Rose, discreetly". It names a woman who is not in the room, and it lumps her own money into the payee (no `_stPaid` split, unlike every other branch: "฿X to the till … ฿Y into her own hand"). Same for "No fee to Rose tonight". What should happen: name the room's own payee (`_bfPayee()`), split the two fees through `_stPaid`, and keep the Notty's furniture to Notty's.
- repro:
  node tools/probe.mjs 'sandbox(50000); _rand=()=>0.99; G.peddlerNight=99; G.room="succubus"; G.nightTurn=35; const h=_npcsHere().find(i=>NPC_ROLES[i]==="hostess" && !_isDraw(i)); G.soc.drinks[h]=4; G.soc.drinkCount={[h]:1}; run("barfine "+h); out.length=0; run("short time"); show("succubus ST"); console.log(_npcsHere().filter(i=>NPC_ROLES[i]).map(i=>NPCS[i].name+":"+NPC_ROLES[i]).join(", "))'
  → ฿2,400 to Rose, discreetly, and Sroy takes your hand and walks you to one of the deep couches along the wall. The curtain draws around it with a soft brass rattle, the cold gold room carries on without you …
  → Kinnaree:mamasan, Sroy:hostess, Chom:hostess, Pranee:hostess, Noot:cashier
- fix: `const payee = G.room === "nottys_place" ? "Rose" : _bfPayee();` and build the money clause with `_stPaid(price, name, "takes")`. Gate the couch/gold-room furniture on `G.room === "nottys_place"`, with a neutral line for the other clubs.

### S5-9: QUIT (concede) a game at your own bar: the stake leaves the pocket and reaches neither the till nor BOOKS
- system: games   severity: low   owner: engine
- site: web/js/engine-play.js:2857–2871 (`_gameQuit`); same in `_abandonGame` (:2836, the non-houseClosed branch)
- defect: The last review made your till the house side of a game in `_endGame` (a lost stake rings in, a win is paid out of it). The concede path was missed. QUIT says "The stake stays where stakes stay" and nulls `G.game`, but at your own bar nothing is added to `G.bar.cash` and `_barEvent` never names it, so the money leaves the economy. The same applies when a game dies because you leave ("the ฿X stays with the house"). The money should "reconcile to the baht".
- repro:
  node tools/probe.mjs 'sandbox(5000); G.stage="expat"; for (const f of ["expatLife","barPremises","barLicence","barPartner","barPaid","barOpen","partnerCandy"]) _setFlag(f); Object.assign(G.bar,{room:"stinky_bar",cash:8000}); G.room="stinky_bar"; G.nightTurn=30; const m=G.money, c=G.bar.cash; run("play connect 4"); run("quit"); show(); console.log("pocket", m, "->", G.money, "till", c, "->", G.bar.cash)'
  → ฿20 on the table. … You concede. The stake stays where stakes stay. (฿4,980 left.)
  → pocket 5000 -> 4980 till 8000 -> 8000
- fix: In `_gameQuit` (and `_abandonGame`'s stake-kept branch): `if (g.stake && _atOwnBar() && G.bar && g.type !== "kp") { G.bar.cash += g.stake; _barEvent(g.stake, "a game's stake conceded to the house"); }`.

### S5-10: The go-go's own bell pool puts drinks "down the length of the bar" and "down the whole rail"; `_FIT_GOGO` lets both through
- system: bell   severity: low   owner: engine
- site: web/js/engine-play.js:4047 and :4055 (`_BELL_GOGO`); web/js/engine-core.js:1043 (`_FIT_GOGO`)
- defect: Canon: a go-go has no bar or rail, and waitresses bring the drinks. `_BELL_GOGO` is the pool written for go-gos, yet line 1 has "Drinks materialise down the length of the bar" and a drum-roll "on the counter", and line 4 has "drinks down the whole rail". `_FIT_GOGO` matches `down the rail` and `(?:along|down|…) the bar\b` but not "down the whole rail" or "down the length of the bar", so `_roomFit` keeps all 5 lines in every go-go.
- repro:
  node tools/probe.mjs 'sandbox(200000); G.room="hyper"; G.nightTurn=40; const pool=_roomFit(_BELL_GOGO); console.log(pool.length, "of", _BELL_GOGO.length); pool.forEach(l=>console.log(" -", l.slice(0,90)))'
  → 5 of 5
  → - The bar detonates. Cheering from the girls, a drum-roll on the counter from the cashier, t…   (continues "…Drinks materialise down the length of the bar")
  → - One pull and the room goes off: drinks down the whole rail, the girls whooping, the DJ sho…
- fix: Rewrite the two lines (drinks come from the waitresses, along the stage and the benches). Also widen `_FIT_GOGO` with `down the (?:whole|length of the) (?:rail|bar)` so pools shared with beer bars cannot carry the same phrasing in.

## Summary

Ten findings, each reproduced with probe. The most serious are S5-1 and S5-2. In S5-1, the barfine ledger never asks `_isRefusal` and has no question guard, so "no, don't take her out", "what happens if I take her out?", "take a pass" and "short on cash" spend ฿1,400–2,700. "fine, i'll pass" / "sure, maybe later" sign the open contract and end the night with no LONG TIME confirmation. In S5-2, a bare BARFINE in a staffless pub re-sells you the woman already on your arm and duplicates her in `G.party.ids`, so every later stop charges and bonds her twice. Next come S5-3, where self-barfine books the night to whoever `G.lastBfId` last named and can fire with another woman on your arm, and S5-4, where GO HOME WITH on the bench walks him into the hotel room the desk refuses him.

Suspected but not reproduced (for triage):
- A `_doComplain` refund returns the whole price, her own money included, but the `time` gift note stays. The morning's "into the women's hands" line probably still names a refunded fee (not run through a real scam roll).
- Middle-segment Soi 6 beer bars (region Soi 6, barType beer) price with `BF_BEER`, the ×1.75 LT and the midnight waiver, not `BF_SOI6`/`SOI6_OUT`, while their prose sends you "up the stairs at the back". This may be a ruling rather than a defect.
- In the contested (insisted) lady-drink path, `_addBond(id, 1)` is uncapped and `drinkCount` is never incremented (the Soi 6 one-drink gate cannot open from it). It could not be made to misbehave because `_poachAnger` heat ejects you within two drinks even at `_rand=0.99`.
- REMATCH after a for-sanuk (฿0) game stakes the default ฿20, and BET <n> with a last game ignores n and replays the old stake (UX, money moves at the old figure).


# S6 — The side arcs and the paid hours (nightride, cream, sao, orchid, soi6-stream, heist, massage, clinic)

### S6-1: Cream's GO / NOT TONIGHT reads a refusal as GO — the night ends with her and the joiner fee is charged
- system: cream   severity: high   owner: engine
- site: web/js/engine-parser.js:19197 (`_doCommandInner`, the `pendingChoice === "cham"` intercept)
- defect: The yes regex `^(go|yes|ok|okay|sure|come|with her|let'?s go|hotel)\b` runs before the decline regex, and nobody
  calls `_isRefusal`. So "ok, no thanks", "sure, maybe another time", "come on, not tonight" and "go home" all run
  `_chamGo`. That ends the night (`_endNight("cham")`), books a conquest and charges the Sabai joiner fee plus the folio.
  A refusal should close the gate as NOT TONIGHT: ask `_isRefusal(lower)` before the yes branch. Note that "go home" is
  a refusal here even though it starts with "go".
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room=_npcRoom("cream"); G.nightTurn=50; run("barfine cream"); out.length=0; run("ok, no thanks"); show(); console.log("day", G.day)'
  → (+8 สนุก) … (The Sabai's desk: the joiner book slides across … ฿300 …) … (The folio slides under the door: ฿400 … ฿4,300 left.)
  → ── DAY 3 of 7 — grey light, far too early, and somebody else in the room is already dressed …
  (The same result for "go home", "sure, maybe another time" and "come on, not tonight". "what?" correctly re-prompts.)
- fix: in the `cham` block, put `if (_isRefusal(lower) || /^(not tonight|no|stay|sorry|decline|another time|cancel)\b/.test(lower)) { _chamDecline(); return; }` BEFORE the GO test.

### S6-2: Sao's dinner (once a life) reads a refusal as GO and spends the whole arc
- system: sao   severity: high   owner: engine
- site: web/js/engine-parser.js:19189 (`_doCommandInner`, the `pendingChoice === "bkkdinner"` intercept)
- defect: This is the same bug as S6-1. `^(go|yes|ok|okay|sure|come|get in|bangkok)\b` runs before the decline test, so
  "ok, no thanks", "sure, maybe another time" and "okay but no" all run `_bkkGo`. That sets `bkkArcDone`, plays the
  dinner and ends the night. The arc fires once a game, so a player who said no loses it for good without choosing it.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.stage="expat"; _setFlag("expatLife"); G.bkk={met:1,stage:3,coffee:1}; G.bkk.invite=G.day-1; G.phone.contacts.sao=true; G.nightTurn=10; G.room="hotel_room"; _bkkArcTick(); out.length=0; run("ok, no thanks"); show(); console.log(G.pendingChoice, G.bkk.went)'
  → The van's aircon is set to museum. Two hours of motorway … then Bangkok …
  → … (Reach for it, or let it be. GRAB · LET)
  → bkkbill true
- fix: `if (_isRefusal(lower)) { _bkkDecline(); return; }` ahead of the GO regex. The same pre-check belongs in `bkkbill`, where "no, let me pay" currently reads as LET.

### S6-3: The heist modals (Eddy's job, Nont's ฿15,000 price, Tan's favour) all read refusals as yes
- system: heist   severity: high   owner: engine
- site: web/js/engine-parser.js:19221–19250 (`rabbitjob`, `kidprice`, `kidfavour` intercepts)
- defect: Each of the three intercepts tests a yes regex before its no regex, with no `_isRefusal` check:
  - `rabbitjob`: "I'll pass" matches `i'?ll` and takes the job. So does "ok, no thanks", and so does "sure, not me". The
    black box goes into your inventory and `rabbit_heist` goes active.
  - `kidprice`: "ok, no thanks" pays `KID_PRICE` (฿15,000) and sets `kidPaid`/`kidPath`, which puts Nont on the CCIB radar.
  - `kidfavour`: "sure, but no" accepts Tan's favour and moves `_align("syndicate", 1)`.
  Doctrine says declining is always free, and these three answers decline.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.stage="expat"; _setFlag("expatLife"); G.room="white_rabbit"; _rabbitInterview(); out.length=0; run("i'"'"'ll pass"); console.log(G.rabbitWay, G.itemLoc.black_box, G.quests.rabbit_heist)'
  → mule inventory active
  node tools/probe.mjs 'sandbox(20000); G.stage="expat"; _setFlag("expatLife"); G.known.nont=true; _kidPriceAsk(); out.length=0; const m=G.money; run("ok, no thanks"); console.log(m, "->", G.money, _flag("kidPaid")); _kidFavourAsk(); run("sure, but no"); console.log(_flag("tanKidFavour"), _faction("syndicate"))'
  → 20000 -> 5000 true
  → true 1
- fix: put an `_isRefusal(lower)` → No branch first in all three intercepts. Also drop `i'?ll` from the CARRY regex, since "I'll pass" and "I'll think about it" are not yeses.

### S6-4: The night ride takes "i don't want to go" and "let's not" as RIDE ON, and charges a stop
- system: nightride   severity: medium   owner: engine
- site: web/js/engine-systems.js:2460–2462 (`_nightRide`)
- defect: The `go` test is unanchored (`\b(ride|yes|on|more|…|go|…|lets?|…)\b`), and the `stop` test does not know
  "don't", "won't", "not" or "let's not". So "i don't want to go" and "let's not" both ride. Each charges a venue
  (฿465 in the repro), spends `RIDE_STOP_TURNS` and adds a drink. "hang on", which means "wait", also rides. Separately,
  a non-answer that falls through to the re-prompt ("nah") costs a turn (60 → 61), but a non-answer should cost none.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.nightTurn=60; G.rideSeq={id:"noi",fine:0,spent:0,stops:0,sanuk:0,seen:[]}; G.pendingEnc="nightride"; const m=G.money; run("i don'"'"'t want to go"); show(); console.log("stops", G.rideSeq.stops, m, "->", G.money, "turn", G.nightTurn)'
  → The bike coughs, catches, and carries the two of you off into the dark … (+2 สนุก)
  → stops 1 5000 -> 4535 turn 69
  (With "let's not" the result is also stops 1 and turn 69. With "nah" it is stops 0 but turn 60 -> 61.)
- fix: `const stop = _isRefusal(input) || /…existing…/.test(input)`. Also leave the clock alone on the `!go` re-prompt path, by not ticking when it re-arms.

### S6-5: "massage no happy ending" buys the SPECIAL (฿1,000) — a negation reads as the ask
- system: massage   severity: medium   owner: engine
- site: web/js/engine-systems.js:2868 (`_doMassage`, `wantsSpecial`)
- defect: `wantsSpecial = /special|happy|extra|hand|mouth|boom|sex|sexy|finish/.test(arg)` matches the word wherever it
  appears, negated or not. At an oil shop, "massage no happy ending", "massage but no extra" and "massage without the
  extras" all go straight to `_massageSpecial`. That charges `MASSAGE_SPECIAL`, runs a conquest and hands over her
  number. A man asking for the plain hour should get the oil hour.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="smile_massage"; G.nightTurn=40; const m=G.money; run("massage no happy ending"); show(); console.log(m, "->", G.money, JSON.stringify(G.soc.special))'
  → Waan checks the curtain, turns the radio up a notch, and gives you the massage and the actual reason people come to Smile. Hand and mouth …
  → 5000 -> 4000 {"smile_massage":2}
- fix: `const wantsSpecial = /…/.test(arg) && !/\b(no|not|without|don'?t|nothing)\b/.test(arg)`. Alternatively, run `_isRefusal` on the special clause.

### S6-6: The soapy menu takes "not the model" and "i don't want 99" as a pick and charges ฿3,000
- system: massage   severity: medium   owner: engine
- site: web/js/engine-systems.js:3111–3124 (`_soapyResolve`)
- defect: The cancel test is `^(no\b|cancel|never|…)`. That misses "not …" and "i don't …", because `no\b` does not
  match "not". Parsing then picks up the number or tier name inside the refusal. "not the model" and "i don't want 99"
  both buy the model tier: ฿3,000, eight turns and `soapyDone`.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="poseidon_soapy"; G.nightTurn=40; run("soapy"); out.length=0; const m=G.money; run("not the model"); show(); console.log(m, "->", G.money)'
  → You point at ๙๙. A minute later number ๙๙ — the model — collects you …
  → 5000 -> 2000
- fix: `if (_isRefusal(input) || /^(no\b|cancel|…)/.test(input))` → cancel, before the number and tier parse.

### S6-7: MEET (the masseuse's number) has no dawn check — the night ends inside her room and the coda prints after the wake
- system: massage   severity: medium   owner: engine
- site: web/js/engine-systems.js:3044–3058 (`_doMeetOffShift`)
- defect: This is the paid-hours class from the last review, which `_tooLateFor` closed for MASSAGE, SPECIAL, SOAPY and
  the clinic. MEET was missed. It charges ฿300 and runs `_passTime(9)` with no `_tooLateFor`, and it ignores the
  return. At 05:42 the meet charges, the night ends mid-scene with the pavement all-nighter ("06:00 finds you on the
  pavement … a taxi home"), and the next day's room prints. After all that comes "Later she walks you down to the soi
  and flags a bike". There is a second defect: during the offstage hour the bar you texted from keeps ticking
  (`_tick` guards its ambient beats on `_onRide()`, not `G.offstage`). In the repro a peddler arms a `pendingEnc`
  "at your elbow" while the prose has you in her room.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.offShift={id:null,name:"Fon",home:"smile_massage",day:G.day,ghost:false}; G.itemLoc.masseuse_note="inventory"; G.room="beach_rd_c"; G.nightTurn=NIGHT_TURNS-3; run("meet her"); show()'
  → Fon texts back … an hour later you're somewhere unmistakably a real room …
  → 06:00 finds you on the pavement … You share a taxi home with a man who says nothing …
  → ── DAY 3 of 7 — … ── Your Room — Sabai Palms Hotel …
  → Later she walks you down to the soi and flags a bike, and it drops you back where the night found you.
  node tools/probe.mjs 'sandbox(5000); G.offShift={id:null,name:"Fon",home:"smile_massage",day:G.day,ghost:false}; G.itemLoc.masseuse_note="inventory"; G.room="stinky_bar"; G.nightTurn=60; G.lastPeddler=-99; G.peddlerNight=0; _rand=()=>0.05; run("meet her"); show(); console.log(G.pendingEnc)'
  → … her kettle, her drying laundry … A peddler drifts in off the street … He stations himself at your elbow … (WATCH ฿300 · …)
  → Later she walks you down to the soi …
  → peddler
- fix: Add `if (_tooLateFor(9, "Her place")) return;` before the charge, and `const ended = _passTime(9); G.offstage = false; if (ended) return;`. For the ambient half, the peddler, drizzle, saleng and rail ticks should skip `G.offstage` as well as `_onRide()`. The cleanest form is one predicate that covers both.

### S6-8: The Orchid's own 04:00 close prints the soi's "Two o'clock on Soi 6"
- system: orchid   severity: low   owner: engine
- site: web/js/engine-play.js:1596 (`_closingTick`, the generic "everyone else" close line)
- defect: The Orchid now shuts at `ORCHID_CLOSE` (04:00, its `closesAt`). Its walk-out still falls through to the
  generic Soi 6 line, which asserts "Two o'clock" when `_clockStr` says 04:00. It also has the ladies shooing punters
  out onto the soi, which is the wrong register for the members' room and the bottle's table. A string may not assert
  an hour the game did not compute.
- repro:
  node tools/probe.mjs 'sandbox(30000); G.room="orchid_room"; G.nightTurn=ORCHID_CLOSE-3; run("buy black label"); out.length=0; run("wait","wait"); show(); console.log(_clockStr(G.nightTurn), G.room)'
  → Two o'clock on Soi 6. The frontages roll down, the sound systems die mid-song, and the ladies shoo the last punters out onto the soi. …
  → 04:00 soi6_street
- fix: add an `r.closesAt`/`G.room === "orchid_room"` branch to the close line: the table cleared, the side door through the dark Lotus. That branch can read `_clockStr`. Alternatively, have the generic line read `_clockStr(_closeTurn(G.room))` instead of a typed hour.

### S6-9: A night with Cream on the week's last night never sets `chamDone`, so next trip she is "not that girl" again
- system: cream   severity: low   owner: engine
- site: web/js/engine-play.js:6611–6616 (`_endNight`, the last-night `G.chamNight` branch); flag read at engine-systems.js:5534 (`_chamAsk`)
- defect: `chamDone` and `G.chamLast` are set only by `_chamGift`. When the Cream night is the week's last, the morning
  is folded into the checkout and only `G.chamNight` is cleared. On the next trip, BARFINE CREAM plays the first-ever
  shocked pull-back ("Don't ask me that. … I am not that girl. … Ask me again outside.") to a man she has already gone
  home with (`chamNights` 1). It should get the "You ask it again … no pull-back" branch. Asking her about the night
  (`G.chamLast`) has nothing to answer either.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.day=7; G.room=_npcRoom("cream"); G.nightTurn=50; run("barfine cream"); run("go"); out.length=0; console.log(_flag("chamDone"), G.chamNights); run("new vacation"); out.length=0; G.money=5000; for (const k in ENCOUNTERS) G.encDone[k]=true; G.room=_npcRoom("cream"); G.nightTurn=50; run("barfine cream"); show()'
  → false 1
  → You ask it — … Her eyes go wide. She actually pulls back in the chair … "Don't ask me that." … "I am not that girl." …
- fix: in that last-night branch, also `_setFlag("chamDone"); G.chamLast = { day: G.day, gift: 0 };`. Alternatively, key `_chamAsk`'s second branch on `G.chamNights > 0 || _flag("chamDone")`.

## Summary

Nine findings. The most serious is a refusal class that has never been fixed in this section's modals (S6-1, S6-2,
S6-3). The 10-25 review made `_isRefusal` the rule for police, cons and encounters, but Cream's GO, Sao's once-a-life
dinner, Eddy's job, Nont's ฿15,000 kid price and Tan's favour all still test their yes regex first. "ok, no thanks"
ends the night with Cream, spends the Sao arc forever, pays Nont ฿15,000 or aligns you with the syndicate, and
"I'll pass" takes the heist box. The same shape turns up unanchored in the ride (S6-4) and in the paid hours: the
SPECIAL bought by "no happy ending" (S6-5) and the soapy bought by "not the model" (S6-6). MEET is the one paid hour
the `_tooLateFor` sweep missed, and its offstage hour lets the bar's peddler arm a modal mid-tryst (S6-7). The Orchid's
new 04:00 close prints "Two o'clock" (S6-8).

Suspected but not reproduced:
- `_atCamera(id)` in the local (non-remote) case never checks `_npcWhere(id) === room`, so TIP <her> <amount> through
  `_streamTip` could pay a home-bar hostess who is absent tonight. A scan of 14 days × 4 hours × 9 bars found no
  hostess away from her home bar, so I could not make it fire.
- The bench (`G.street`): Cream's GO and an ordinary barfine have no bench branch. The prose says "at the hotel … in
  the lift" and the Sabai joiner fee is charged to a man sleeping out. The wake then un-benched him by card, so the
  harm depends on the pocket. I could not separate a defect from intended behaviour.
- `_endNight("bkkdinner")`'s "The van brings you back at one in the morning" is a typed hour the game never computes.
  It is harmless only because the night ends on it.
- `_soapyResolve` treats "none, too much" as a non-answer (the menu stays up) rather than a cancel. Nothing is charged.


# S7 — Getting around and the street (bus, motosai, navigation, dog, police, encounters, cons, saleng)

Reviewer note: the 2026-10-25 review said `_isRefusal` "is now asked first by every encounter that takes money or ends a
night on a yes". It is not: six resolvers still read a yes from unanchored substrings, so "no thanks", "i'm broke" (its
*ok*), "i'd rather not" (its *her*), "maybe later" and "i won't follow you" still pay. S7-1..S7-4 are that class.

### S7-1: the club pickup's morning taxi pays ฿2,000 on "no", "no thanks" or "i don't want to"; its first step reads "i don't want to come back" as yes
- system: encounters   severity: high   owner: engine
- site: web/js/engine-encounters.js:1896 (`_clubpickup`), :1917 (`_taxiAsk`)
- defect: `_taxiAsk` pays `CLUB_TAXI` whenever the input is neither a "bolt" word nor in its own short refuse list
  (`refuse|won't|not pay|no way|nothing|hell|zero|forget|scam`), so the plainest refusals — "no", "no thanks",
  "i don't want to" — take ฿2,000 and print the paying-smiling ending. `_isRefusal` is never asked. The first step's yes is
  unanchored (`come|home|room|back`) with a negative list that has no "don't"/"won't", so "i don't want to come back with
  you" or "i'm going back to my hotel" takes her home (joiner fee, +8 สนุก conquest, 24 minutes) and arms the ฿2,000 ask.
  A refusal ought to be a refusal at both steps (the scene branch at step two; the polite walk-off at step one).
- repro (through the real entry: OUT of the club arms it):
  ```
  node tools/probe.mjs < club.js     # club.js:
  sandbox(5000); G.nightTurn = 50; G.room = "paradise_nights"; G.encDone.clubpickup = false; G.lastEnc = -99;
  _rand = () => 0; run("out"); console.log("after OUT: room", G.room, "pendingEnc", G.pendingEnc, "clock", _clockStr());
  _rand = () => 0.5; out.length = 0; run("i don't want to come back with you"); show("first answer");
  const m0 = G.money; run("no thanks"); show("taxi answer"); console.log("paid", m0 - G.money, "room", G.room, "clock", _clockStr());
  ```
  → `after OUT: room ws_south pendingEnc clubpickup clock 23:06`
  → `== first answer ==  No lady drinks, no barfine … She comes back to your room … (The night clerk doesn't ask who she is. The joiner ledger has one column, and it says ฿300.) (+8 สนุก) … Morning. … “You give me 2,000 baht for taxi.”`
  → `== taxi answer ==  You peel off two notes. … (฿2,700 left.)`  → `paid 2000 … room ws_south clock 23:42`
  Also: `_startEnc("clubpickup"); run("yes"); run("no")` → paid 2000; `run("i don't want to")` → paid 2000.
- fix: ask `_isRefusal(input)` first in both functions (step one: refusal → the walk-off; step two: refusal → the
  "For a TAXI?" refusal branch), and make the yes words whole words (`\b(?:yes|ok|okay|sure|come|home|…)\b`).

### S7-2: the club pickup asserts "Morning" and "your room" while the game leaves you on Walking Street at 23:42
- system: encounters   severity: medium   owner: engine
- site: web/js/engine-encounters.js:1903–1915 (`_clubpickup`)
- defect: YES runs `_passTime(4)` (24 minutes) and then prints "hours of talk … She comes back to your room …" and the
  prompt "Morning. She does her lipstick at the mirror …"; the PAY branch adds "the free night ended at nine". None of it
  is computed: `G.room` never changes (still `ws_south`), the clock reads 23:36 at "Morning", the night carries on, and the
  joiner fee (฿300, "the night clerk doesn't ask") is charged for a room she never entered. A string may not assert an
  hour the game did not compute; this one asserts a whole night. It ought to either end the night the way the booking and
  seawall do (`_endNight`, so the morning is real and the ask lands at dawn) or be rewritten clock-blind with no room.
- repro: the S7-1 transcript above — `Morning. She does her lipstick…` printed, then `clock 23:36 room ws_south`, and
  after paying `room ws_south clock 23:42`; `run("look")` afterwards prints the Walking Street room.
- fix: route the YES through the night's end (as `seawall` does with `_endNight("barfine")`) and ask the taxi money on
  the morning screen, or drop the "Morning"/"your room"/"at nine" claims and the joiner fee.

### S7-3: the cons' first step takes money on a refusal — "i'm fine" buys the ฿99 tonic, "i won't follow you" walks into the shop, "ok maybe later" pays the ฿199 palm and opens the ฿1,900 ritual
- system: cons   severity: high   owner: engine
- site: web/js/engine-encounters.js:1484 (`_ENC.tonic`, the shop branch), :1499 (the street-bottle branch), :1525 (`_ENC.fortune`)
- defect: the 2026-10-25 fix put `_isRefusal` in `_tonicShop` and `_curseRitual` (the second steps) but not the first
  steps. Tonic's street-bottle yes is unanchored (`yes|buy|ok|sure|deal|take it|fine|bottle|ninety|99|tonic`), so "i'm
  fine" or "i don't want your tonic" pays `TONIC_PRICE`. Its FOLLOW branch is unanchored (`shop|follow|come|vip|see|show|look`)
  with only `\bno\b|walk|leave|away|off|thanks` as negatives, so "i won't follow you" / "don't show me anything" puts you in
  the side-soi shop, where LEAVE is the 50/50 ฿500-or-`TONIC_SHAKEDOWN`. Fortune's yes is anchored but its negative list
  lacks `_isRefusal`, so "ok maybe later", "fine, i'd rather not", "sure, not tonight" (all `_isRefusal` true) pay
  `FORTUNE_READ` and arm the ritual.
- repro:
  ```
  node tools/probe.mjs 'sandbox(5000); G.room="beach_rd_c"; G.nightTurn=20; G.encDone.tonic=false; _startEnc("tonic"); out.length=0; const m0=G.money; run("i won\x27t follow you"); show(); console.log("paid", m0-G.money, "pendingEnc", G.pendingEnc, "tonicShop", !!G.flags.tonicShop)'
  ```
  → `“Two minute!” It is not two minutes. … (PAY and be done with it, or refuse and try to LEAVE.)` → `paid 0 pendingEnc tonic tonicShop true`
  (same with "don't show me anything"); with `run("i'm fine")` / `run("i don't want your tonic")` → `you hand over ฿99 and receive one brown bottle` → `paid 99`.
  ```
  node tools/probe.mjs 'sandbox(5000); G.room="beach_rd_c"; G.nightTurn=20; G.encDone.fortune=false; _startEnc("fortune"); out.length=0; const m0=G.money; run("ok maybe later"); show(); console.log("paid", m0-G.money, "curseRitual", !!G.flags.curseRitual, "isRefusal", _isRefusal("ok maybe later"))'
  ```
  → `You hand over ฿199. … (PAY the ฿1,900 “cleansing”, or refuse and try to LEAVE.)` → `paid 199 curseRitual true isRefusal true`
- fix: `if (_isRefusal(input)) → the walk-past line` at the top of both first steps (after the TAO RAI branch); make the
  tonic yes words whole and anchored like fortune's (`^(?:yes|buy|ok|okay|sure|deal|take it|bottle|99)\b`), and the
  FOLLOW branch anchored (`^(?:follow|shop|show me|come|see|vip)\b`). Drop bare `fine` (it is the English polite no).

### S7-4: four more encounters read a refusal as yes — the sea wall ends the night for ฿1,700 on "i'd rather not" / "i'm broke"; the booking app (฿2,800) and the ping-pong show (฿1,000) on "i'm broke"; the free amulet (฿500) on "not tonight" / "maybe later"
- system: encounters   severity: high   owner: engine
- site: web/js/engine-encounters.js:1041 (`_ENC.seawall`), :1256 (`_ENC.pingpong`), :1597 (`_ENC.booking`), :1839–1857 (`_freegift`)
- defect: the yes regexes are unanchored substrings and none asks `_isRefusal`: seawall's `…|please|kate|aor|baiyok|her`
  matches the *her* in "rather" and the *ok* in "broke"; pingpong's `yes|go|show|…|ok` and booking's `yes|ok|…` match
  "broke". `_freegift` treats everything that is not a price word or its short refuse list as ACCEPT, so "not tonight",
  "maybe later", "i'd rather not", "i'm fine" all take `GIFT_DEBT`. This is exactly the class the last review called fixed
  ("i'm broke (its ok) paid the curse ritual") — still live in these four.
- repro (`node tools/probe.mjs < sw.js`):
  ```
  _rand = () => 0.3;
  for (const [id, room, p] of [["seawall","beach_rd_top","i'd rather not"],["seawall","beach_rd_top","i'm broke"],["booking","hotel_room","i'm broke"],["pingpong","ws_gate","i'm broke"],["freegift","promenade","maybe later"],["freegift","promenade","not tonight"]]) {
    sandbox(5000); G.nightTurn = 75; G.day = 5; G.room = room; G.encDone[id] = false;
    _startEnc(id); out.length = 0; const m0 = G.money, d0 = G.day; run(p);
    console.log(`== ${id} [${p}] isRefusal=${_isRefusal(p)} paid=${m0 - G.money} day ${d0}->${G.day}`); }
  ```
  → `== seawall [i'd rather not] isRefusal=true paid=1700 day 5->6`
  → `== seawall [i'm broke] isRefusal=true paid=1700 day 5->6`
  → `== booking [i'm broke] isRefusal=true paid=2800 day 5->5`
  → `== pingpong [i'm broke] isRefusal=true paid=1000 day 5->5`
  → `== freegift [maybe later] isRefusal=true paid=500 day 5->5`
  → `== freegift [not tonight] isRefusal=true paid=500 day 5->5`
- fix: `_isRefusal(input)` first in each, then whole-word yes (`\b(?:yes|ok|okay|sure|…)\b`; seawall's `her` only as
  `^her\b`/"take her"); `_freegift` should accept only on an explicit yes word (`^(?:take|yes|accept|thanks|thank you)\b`)
  and treat everything else as the polite hand-back.

### S7-5: RIDE THE LOOP with a woman on your arm checks one seat; at ฿15 the ฿30 fare is then unpayable and WALK leaves it — the whole loop and its +2 สนุก for free, "you climb back down" after the ride
- system: bus   severity: medium   owner: engine
- site: web/js/engine-parser.js:12632 (`_doRideBus`, the loop branch: `G.money < BUS_FARE`), :12482 (`_rideLoop`), :19498 (the unpayable-fare WALK)
- defect: the last review fixed the named-stop branch to check "a seat a head", but the loop branch still checks
  `G.money < BUS_FARE`. `_rideLoop` then runs five ticks, pays +2 สนุก, and sets `pendingFare.price = BUS_FARE × heads`.
  With ฿15 and a companion the ฿30 is unpayable, so the escape hatch added by that fix (WALK on an unpayable fare) clears
  it: the ride is free, and the line "You climb back down … somebody else will pay to sit there" is said after the ride
  is over. The loop ought to be refused before it starts, exactly as the named stop is.
- repro:
  ```
  node tools/probe.mjs 'sandbox(15); G.room="beach_rd_c"; G.nightTurn=20; G.party={ids:["lek"],stops:0,spent:0,seen:{}}; run("ride the loop"); show("loop"); console.log("fare", JSON.stringify(G.pendingFare), "money", G.money); run("pay 30"); show("pay"); run("walk"); show("walk"); console.log("fare", JSON.stringify(G.pendingFare), "money", G.money)'
  ```
  → `(+2 สนุก)  Back where you flagged it, one whole town later. The driver leans out: “สามสิบบาท” — and nods at your company. One fare a head.`
  → `fare {"kind":"bus","price":30,"dest":"beach_rd_c"} money 15`
  → `== pay ==  You don't have ฿30.`
  → `== walk ==  You climb back down. The driver shrugs at the road; somebody else will pay to sit there.` → `fare null money 15`
- fix: in the loop branch, `const _heads = 1 + ((G.party && G.party.ids && G.party.ids.length) || 0); if (G.money < BUS_FARE * _heads) …`
  (one helper for the head count, read by the loop, the named stop and `_rideLoop`).

### S7-6: FEED DOG adopts a soi dog inside the police station, Madam Oy's office, the CCIB-front office and the Jomtien 7-Eleven — "pacing you for half a block … a passing bar girl laughs"
- system: dog   severity: low   owner: engine
- site: web/js/engine-systems.js:12015–12025 (`_doFeedDog`, the venue/hotel/dark refusals)
- defect: adoption is refused in bars, massage/soapy/host rooms, hotel rooms and the dark, but not in the other interior
  rooms (none of them carry `bar`/`barType`, and `police_station`/`oy_office` are not marked `indoors`). The street
  adoption scene — the dog pacing you down the block, a passing bar girl — then plays at the desk sergeant's counter or in
  Oy's back office, and sets `G.dog` for life. Indoors ought to get the "meet them where they live" refusal.
- repro:
  ```
  node tools/probe.mjs 'for (const rm of ["police_station","oy_office","eastern_seaboard","jomtien_7eleven"]) { sandbox(500); G.room=rm; run("feed dog"); console.log(rm, "adopted:", !!G.dog, "|", out[0].slice(0,110)); out.length=0; }'
  ```
  → `oy_office adopted: true | A soi dog with one clipped ear has been pacing you for half a block, close enough to be polite about it. You c`
  (the same for police_station, eastern_seaboard, jomtien_7eleven)
- fix: refuse when the room is not a street — reuse `_maybeEncounter`'s test
  (`!!(r.venues || r.seven || r.motosai) && !r.indoors`, or a beach) — or add `_underRoof(G.room)` to the refusal.

### S7-7: the fare gate — a bare PAY costs a turn, and "i won't pay" falls to the parser's generic miss instead of the driver's reprompt
- system: bus   severity: low   owner: engine
- site: web/js/engine-parser.js:13103 (`_doPay`, `amount === null`), :19501 (the fare gate's verb allow-list)
- defect: a non-answer must leave a gate up and cost no turn. PAY with no amount reprompts ("A number would help") but
  `doCommand` charges the turn (nightTurn +1); "i won't pay" / "i don't have it" are not routed to `_farePrompt` and print
  "The soi blinks at you" / "I didn't understand that", so the reprompt differs from the gate's own prompt.
- repro (`node tools/probe.mjs < fare.js`):
  ```
  sandbox(500); G.room="beach_rd_c"; G.nightTurn=20; run("ride bus to naklua"); out.length=0;
  for (const c of ["i won't pay", "i don't have it", "how much?", "pay"]) { const t=G.nightTurn; run(c); show(c); console.log("   fare", !!G.pendingFare, "turn+", G.nightTurn-t); }
  ```
  → `== i won't pay ==  The soi blinks at you. Try again — (HELP lists commands.)`
  → `== i don't have it ==  I didn't understand that. …`
  → `== pay ==  He repeats, slower, the universal way: “สิบห้าบาท”. A number would help.` → `fare true turn+ 1`
- fix: `_doPay`'s no-number branch sets `_moveRefused = true` (or the gate's no-turn flag); route any refusal
  (`_isRefusal`) and any unparsed input under `G.pendingFare` to `_farePrompt()`.

## Summary

Seven findings. The most serious is the class the last review believed closed: six street resolvers still read a refusal
as a yes — the club pickup takes ฿2,000 on "no"/"no thanks" (S7-1), the cons' first steps take ฿99/฿199 and walk you into
the shop on "i won't follow you" (S7-3), and the sea wall ends the night for ฿1,700 on "i'd rather not" (S7-4). The club
pickup also asserts a whole night ("Morning", "your room") that the clock and `G.room` never had (S7-2), and RIDE THE LOOP
with a companion is a free ride through the unpayable-fare WALK (S7-5).
Checked and clean: no dice-varying loop in the bus wait, the loop, the motosai or encounter selection (`_rand` 0/0.5/0.99
all terminate); no encounter room is a bar, dark or indoors; no encounter resets Act One; the tick-armed gates are all
bar-bound, so `_maybeEncounter` does not arm on top of one; the saleng "for X" refuses a woman not in the room; TRAVEL
cannot route through a bar (Take Care Me's two fronts are adjacent streets).
Suspected, not reproduced: `_doPay` and `_doMotosai` set `G.room` directly, so a pending `G.convoQ` is not lapsed and
`G.prevRoom` not updated on a ride (needs an NPC asking a question on a bus/bike street to show); the katoey pickpocket
takes ฿40 on "i'm fine"/"maybe later" (by design she lifts it while you talk — a design call, not reported).


# S8 — The body, สนุก and the world's prose (adversarial review 2026-11-01)

### S8-1: the sobering clock (`G.soc.soberNext`) survives dawn, so the next night's first drink lasts up to a whole night instead of 20 turns
- system: body / sobriety   severity: medium   owner: engine
- site: web/js/engine-core.js:755 (`STATE_SCHEMA.socTrip` lists `soberNext`) + web/js/engine-core.js:3913–3916 (`_tick`) + web/js/engine-play.js:6640 (`_endNight` zeroes `G.soc.drunk` but not `soberNext`)
- defect: `soberNext` is an absolute `G.nightTurn` deadline, but it is declared `socTrip` and `_endNight` never clears it. If a night ends with the meter above zero (any SLEEP, dawn or blackout after drinking, which is most nights), the old deadline (for example 81, or 135 after a late round) carries into the next evening, where `nightTurn` restarts at 0. `_tick` only re-arms it when it is null, so the first drink of the new night does not wear off until the stale turn. A late heavy night can leave a deadline past `NIGHT_TURNS`, and then nothing wears off at all the next night. The meter should restart its clock at dawn: one unit per 20 turns from the night's first drink, as the docs say.
- repro (through the real SLEEP):
  node tools/probe.mjs 'sandbox(50000); G.room="stinky_bar"; for(let i=0;i<40;i++) run("wait"); run("buy beer","buy beer","buy beer","buy beer"); for(let i=0;i<30;i++) run("wait"); console.log("night1 soberNext",G.soc.soberNext,"nightTurn",G.nightTurn,"drunk",G.soc.drunk); G.room=_hotelRoomId(); const d=G.day; run("sleep"); let k=0; while(G.day===d && k<10){ run("yes"); k++;} out.length=0; console.log("new day",G.day,"nightTurn",G.nightTurn,"soberNext",G.soc.soberNext,"drunk",G.soc.drunk); G.room="stinky_bar"; run("buy beer"); console.log("after beer: drunk",G.soc.drunk,"soberNext",G.soc.soberNext,"nightTurn",G.nightTurn); let n=0; while(G.soc.drunk>0 && n<200){run("wait"); n++;} console.log("sobered after",n,"waits, nightTurn",G.nightTurn)'
  → night1 soberNext 81 nightTurn 74 drunk 3
  → new day 3 nightTurn 0 soberNext 81 drunk 0
  → after beer: drunk 1 soberNext 81 nightTurn 1
  → sobered after 80 waits, nightTurn 81          (should be 20)
- fix: move `soberNext` to `socNight` in STATE_SCHEMA (so `_resetNightSoc` clears it), or set `G.soc.soberNext = null` beside `G.soc.drunk = 0` in `_endNight`.

### S8-2: three free drinks skip `_compDrink`, so I DON'T DRINK is ignored and two of them pay สนุก on every repeat
- system: sobriety / happiness   severity: medium   owner: engine
- site: web/js/engine-play.js:4120–4129 (`_doPatron`, the bell regular "buying you one back"), web/js/engine-play.js:4153–4162 (`_doPatron`, the football round "you included"), web/js/engine-parser.js:11426 (`_buyManDrink`, "two more for the road")
- defect: Each site does `s.drunk++` (or `G.soc.drunk++`) directly. A declared teetotaller still gets drunk, the pushy-bar rules are skipped, and DECLINE has no `G.lastComp` to hand back ("Nothing's been put in front of you to refuse" one line after "insists on buying you one back"). The two `_doPatron` branches have no per-night book either: TALK TO PATRON repeated inside the 25-turn bell glow, or on any 25% roll at a bar whose hashed team won in the bake, gives a free drink and +1 สนุก every time. That is a free act paying on every repeat, and the football branch also makes the meter depend on the news bake, which the media doc forbids. Every comp should go through `_compDrink`, and the regular's round should pay once per bar per night.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="stinky_bar"; G.player.teetotal=true; G.soc.bellAt[G.room]=G.turns; const h0=G.happy; run("talk to patron","talk to patron","talk to patron","talk to patron"); console.log("drunk",G.soc.drunk,"happy +",G.happy-h0,"teetotal",G.player.teetotal)'
  → “THAT'S the fella!” The regular toasts you with a Chang … insists on buying you one back. … (+1 สนุก)   ×4
  → drunk 4 happy 4 teetotal true
  node tools/probe.mjs 'const fs=process.getBuiltinModule("fs"); (0,eval)(fs.readFileSync("web/js/news-data.js","utf8")); sandbox(5000); G.room="the_office"; G.player.teetotal=true; _rand=()=>0.1; const h=G.happy; for (let i=0;i<3;i++) run("talk to patron"); console.log(out.filter(l=>/INCANDESCENT/.test(l)).length, "rounds; drunk", G.soc.drunk, "happy +", G.happy-h, "teetotal", G.player.teetotal)'
  → 3 rounds; drunk 3 happy + 3 teetotal true     (real bake: the_office's team is Ipswich, who won 3–2)
  node tools/probe.mjs 'sandbox(5000); G.room="stinky_bar"; G.player.teetotal=true; _rand=()=>0.1; run("buy man drink"); show(); console.log("drunk",G.soc.drunk,"teetotal",G.player.teetotal)'
  → He racks up two more “for the road” before you can argue.
  → drunk 1 teetotal true
- fix: replace the three `drunk++` / thirst / `_checkDrunk` triples with `_compDrink(1)`. Book the regular's round per room per night (for example a `G.soc.patronRound[G.room]`, socNight), and let a repeat print the line without the drink or the +1.

### S8-3: the mamasan's treat keeps running after the comp blacks you out: it prints her round into the next evening and eases the new evening's thirst
- system: sobriety / body   severity: medium   owner: engine
- site: web/js/engine-parser.js:12236–12244 (the mama-treat branch of the lady-drink buy, inside `_doBuy`)
- defect: `_compDrink(1)` can call `_checkDrunk()`, which runs `_endNight("blackout")`, and the morning is printed (wake spot, pockets turned out, the next evening's room). The branch then goes on: `G.thirst -= 20` lands on the freshly set evening meters, "She flicks two fingers at the cashier and a cold one lands in front of you" prints on Beach Road the next evening, and so does the rest of the purchase ("A small toast from Lamai — and the stool moves an inch closer"). `_compDrink` itself guards its own follow-on (`if (heavy && G.day === day) _pushyUpsell()`), but this caller does not. The branch should stop when the night ended.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="stinky_bar"; G.soc.drunk=8; _rand=()=>0.1; const _e=_endNight; _endNight=function(...a){const r=_e.apply(this,a); console.log("after _endNight: day",G.day,"thirst",G.thirst,"room",G.room); return r;}; run("buy lamai a drink"); console.log(out.slice(-4).join("\n")); console.log("end: thirst",G.thirst)'
  → Somewhere after that last bottle the film simply stops. …
  → … (morning, Beach Road Central room desc) …
  → She flicks two fingers at the cashier and a cold one lands in front of you. On the house.
  → A small toast from Lamai — "chon" — and the stool moves an inch closer, which is the whole point of the drink.
  → after _endNight: day 3 thirst 75 … end: thirst 55
- fix: capture `const day = G.day` before `_compDrink(1)` and `return` if `G.day !== day` (the same guard `_compDrink` uses). Drop the duplicate thirst/`_checkDrunk` lines, which `_compDrink` already does.

### S8-4: the bar-shift brawl bumps `G.hurt` directly, so at 2/3 it pins the player at 3/3 with no ending
- system: body   severity: medium   owner: engine
- site: web/js/engine-systems.js:9248 (`_shiftYes`, `call.id === "turning"`, the losing branch)
- defect: `G.hurt = (G.hurt || 0) + 1` bypasses `_hurt(n)`, the one helper that caps at `HURT_CAP` and ends the night (architecture: "every injury site must use it"). A guv'nor who already has two strikes (a dog bite, a road clip, yesterday's crash) loses the fight, reaches 3, and the night goes on. DIAGNOSE then says "banged up (3/3 — a third strike ends the night)" while nothing ends. The next injury of any kind ends the night through the cap. It should end in the ward like every other third strike.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="stinky_bar"; G.bar={ room:"stinky_bar", cash: 20000, note: 0, arrears: 0, rentShort: 0, month: 0, floorSaid: {}, pocketDrawn: 0 }; G.hurt=2; const d=G.day; G.pendingChoice="shift"; G.shiftCall="turning"; _rand=()=>0.99; run("yes"); show(); console.log("hurt",G.hurt,"day",G.day===d?"same night":"night ended"); run("diagnose"); show()'
  → It goes the other way. There is a shove, and a stool, … you have a forearm you are going to notice tomorrow.
  → hurt 3 day same night
  → Self-diagnosis, 18:00: … banged up (3/3 — a third strike ends the night).
- fix: `if (_hurt(1)) return;` after setting `G.bruise` (keep `_shiftLost`/`_shiftClear` ahead of it, or clear the shift first), so the third strike ends the night like the others.

### S8-5: EAT at your own bar, and eating carried food, ignore `FULL_AT` (the own-bar plate charges ฿60 at hunger 0)
- system: food / body   severity: low   owner: engine
- site: web/js/engine-systems.js:13362–13364 (`_doEat`, `_atOwnBar()` branch) and 13376–13386 (`_doEat`, carried `_EDIBLE` items)
- defect: Every other food path calls `_fullNo()` before money moves ("every food path checks it before taking money, so the guard and the charge can never drift apart"). The own-bar branch sends a girl running and takes `OWN_BAR_FOOD` from a man who is not hungry at all. The carried-food branch eats the item and pays +1 สนุก at hunger 0. Both should refuse below `FULL_AT`, keeping the money and the item.
- repro:
  node tools/probe.mjs 'sandbox(5000); _setFlag("barOpen"); G.bar={ room:"stinky_bar", cash: 20000, note: 0, arrears: 0, rentShort: 0, month: 0, floorSaid: {}, pocketDrawn: 0 }; G.room="stinky_bar"; G.hunger=0; const m=G.money; run("eat"); show(); console.log("hunger",G.hunger,"paid",m-G.money); run("eat"); show(); console.log("paid total",m-G.money)'
  → You eat the packet of Mama noodles. Dry. Crunchy. A choice.  (+1 สนุก)      ← at hunger 0
  → Bert shouts to the noodle cart across the soi … (-฿60, ฿4,940 left.)          ← at hunger 0
- fix: `if (_fullNo()) return;` at the top of both branches (before `G.money -= OWN_BAR_FOOD` and before `G.itemLoc[id] = null`).

### S8-6: three self-ordered drinks do not un-say I DON'T DRINK (ya dong, a host-bar beer, Bert's free beer)
- system: sobriety   severity: low   owner: engine
- site: web/js/engine-parser.js:11986 (ya dong), 11748–11750 (`r.hostBar` beer), 12018–12020 (`bertFreeBeer`), all in `_doBuy`
- defect: The design says "ordering a drink yourself un-says it (`_TEETOTAL_BROKEN`)", and the bar beer and 7-Eleven beer paths do that. These three paths raise `G.soc.drunk` and leave `G.player.teetotal` true. The man is drinking (DIAGNOSE "3 bottles deep") while the house still declines every comp on his behalf and the pub scene still writes "the soda".
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="moonshine_bar"; G.player.teetotal=true; run("buy ya dong"); show(); console.log("drunk",G.soc.drunk,"teetotal",G.player.teetotal); G.room="adonis_club"; run("buy beer"); show(); console.log("drunk",G.soc.drunk,"teetotal",G.player.teetotal); run("diagnose"); show()'
  → Prik pours from the unlabelled bottle … (+2 สนุก)  → drunk 2 teetotal true
  → ฿120 for your own bottle at host-bar prices … (+1 สนุก)  → drunk 3 teetotal true
  → Self-diagnosis, 18:12: fed · watered · 3 bottles deep, the world pleasantly loose at the hinges.
- fix: one helper (for example `_selfPour()`) that flips `teetotal` off with `_TEETOTAL_BROKEN`, called by every self-ordered drink path.

### S8-7: TALK TO PATRON in a go-go seats the regular on a stool at a rail
- system: worldprose (room fit)   severity: low   owner: engine
- site: web/js/engine-play.js:4157 ("buys the whole rail a round"), 4206 ("From the end of the rail"), 4254–4256 ("The regular moves one stool away"), 4243 ("a fresh-faced kid down the bar") — `_doPatron`
- defect: These are fixed strings, not pools, so `_roomFit`'s go-go filter never sees them. `_doPatron` runs in go-gos, and one of its branches already knows (the FX line has a go-go variant), but the football, BTC and over-four-bottles branches still put stools, a rail and a bar into a room that has none (`_FIT_GOGO`). They should use the go-go furniture (front row, benches) or route through a pool `_roomFit` filters.
- repro:
  node tools/probe.mjs 'globalThis.BTC={thb:2400000}; sandbox(5000); G.room="tequila_queen"; console.log(_room().barType); G.soc.drunk=5; _rand=()=>0.99; run("talk to patron"); show("d5"); _rand=()=>0.05; G.soc.drunk=0; run("talk to patron"); show("btc")'
  → gogo
  → … The regular studies his beer. The regular moves one stool away.
  → From the end of the rail, the other regular — laser eyes still on his profile picture — …
  (and with the real bake and `_rand=()=>0.1` at tequila_queen: "He flags the cashier and buys the whole rail a round")
- fix: branch on `_room().barType === "gogo"` the way the FX line already does, or move the three lines into small pools so `_roomFit` drops the stool and rail ones.

### S8-8: a Blue Dog revisit line asserts the hour: "the sun keeps sinking" prints at 23:00
- system: worldprose   severity: low   owner: engine (world.js room data)
- site: web/js/world.js:2195 (`ROOMS.blue_dog.revisit[1]`)
- defect: Revisit lines are hour-blind by rule (they fire at any hour, and round54.test pins the Blue Dog's *desc* for this). The revisit pool still has "the Chang stays cold and the sun keeps sinking", which prints well after dark. Nights run 18:00–06:00, so the sun has set by the first revisit of almost any night.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="blue_dog"; G.nightTurn=45; run("look"); out.length=0; for(let i=0;i<3;i++){ run("out"); out.length=0; run("enter blue dog"); const l=out.find(x=>/sun keeps sinking|sunset/i.test(x)); console.log(_clockStr(), "|", (l||out[0]||"").slice(0,170)); out.length=0; }'
  → 23:00 blue_dog | Back to the tin roof and the corner seating. … the Chang stays cold and the sun keeps sinking.
- fix: make it clock-blind ("the Chang stays cold and the squid boats keep their lights on"), and add `/sun keeps sinking|sun (is )?(going down|setting)/` to the round54 hour-blind check over every `revisit` pool, not only the desc.

### S8-9: "no thanks, I don't drink", said to a comp, neither declines it nor declares; "i'm teetotal" and "i am sober" are not understood
- system: sobriety (parser surface)   severity: low   owner: engine
- site: web/js/engine-parser.js:19597 (the whole-sentence I DON'T DRINK intercept in `_doCommandInner`)
- defect: The intercept is an anchored whole-sentence regex. The reply a teetotaller actually gives to a free pour, "no thanks, I don't drink", falls to the manners handler: the comp stays in him (drunk unchanged) and nothing is declared. Bare "no thanks" does decline. "i'm teetotal" gets "The soi blinks at you" and "i am sober" gets "I didn't understand that", though "i'm sober" and "teetotal" both work. The declaration (or at least DECLINE) should fire when the sentence contains a don't-drink clause.
- repro:
  node tools/probe.mjs 'for (const s of ["no thanks","no thanks, i don\x27t drink","i\x27m teetotal","i am sober"]) { sandbox(5000); G.room="stinky_bar"; _compDrink(1); out.length=0; const d=G.soc.drunk; run(s); console.log(JSON.stringify(s), "drunk", d, "->", G.soc.drunk, "teetotal", G.player.teetotal, "|", lastOut().slice(0,90)); out.length=0; }'
  → "no thanks" drunk 1 -> 0 …
  → "no thanks, i don't drink" drunk 1 -> 1 teetotal false | Manners cost nothing and buy plenty on this soi. …
  → (and without a comp: "i'm teetotal" → "The soi blinks at you. Try again"; "i am sober" → "I didn't understand that.")
- fix: un-anchor the don't-drink clause (allow a leading "no thanks,|sorry,|i'm|i am") and run `_doRefuseDrink` first when a comp is fresh, then `_doTeetotal`.

### S8-10: a night-ride stop pours a drink without `_checkDrunk`, so the meter rides past the blackout limit
- system: body / sobriety   severity: low   owner: engine
- site: web/js/engine-systems.js:2506 (`_nightRide`)
- defect: Each non-viewpoint stop does `G.soc.drunk++` (teetotal is honoured here) but never calls `_checkDrunk()`, so a man who boards at 8 reaches 10 on the pillion with the ride's prose fully lucid and no blackout. The ride's own ending ends the night, so the visible damage stays inside the ride, but the "nine ends the evening on the spot" rule does not hold on this path. Either check after the pour (with the companion's rescue taking him home) or have the stop pour soda past 8.
- repro:
  node tools/probe.mjs 'sandbox(50000); G.room="stinky_bar"; const id=_npcsHere().find(i=>NPC_ROLES[i]==="hostess"); G.nightTurn=30; G.rideSeq={id, seen:[], stops:0, spent:0, sanuk:0, lastHop:-1}; G.pendingEnc="nightride"; G.soc.drunk=8; const d=G.day; for (let i=0;i<4;i++){ run("ride on"); console.log("stop",i+1,"drunk",G.soc.drunk,"day",G.day===d?"same":"ENDED"); }'
  → stop 1 drunk 9 day same
  → stop 4 drunk 10 day same
- fix: after the pour, `if (G.soc.drunk >= 9) return _endRide(seq, "dawn")` (or a "she takes you home" close), so the limit holds and the companion rescue applies.

---

**Summary.** Ten findings: four medium, six low. The most serious is S8-1. `G.soc.soberNext` is declared trip-lived and never reset at dawn, so after any night that ends with drink in you (most of them), the next evening's first beer takes up to a whole night to wear off instead of 20 turns, and blackouts come early. This was reproduced through the real SLEEP. The next most important is the sobriety class the last review fixed only at its known sites: three more free drinks bypass `_compDrink`, two of which also farm +1 สนุก on every repeat (S8-2). Then a blackout inside the mama treat leaks her round and a thirst refund into the next evening (S8-3), and the bar-shift brawl leaves the player pinned at hurt 3/3 (S8-4). Suspected but not reproduced: `_roomLinesFit` only filters absent floor staff (`NPC_ROLES`), so a revisit naming a non-role regular who has left would print, but the only live cases (Terry at the Queen Vic, Auntie Nok's cooler) are either shut out by closing or harmless; the `typeof _tobTaen === "function"` guard at engine-parser.js:1595 hides three real engine functions (probably on the guards.test ratchet's allow-list); DIAGNOSE's "past what any piwin will carry" at drunk ≥7 is contradicted by the balk giving way on a second ask.


# S9 — The parser, the three surfaces and the frontend seam

Reviewer notes: repo at a0c00751 (unchanged during the review). main.js findings were reproduced with a small harness that
loads the engine plus `web/js/main.js` in node with DOM/localStorage stubs and calls `_dispatch` directly (`D(cmd)`):
`/private/tmp/claude-501/-Users-mario-projects-last-baht-bus--claude-worktrees-code-review-1101-3b63f9/36a1d5cb-f80a-4586-be10-5707a66db702/scratchpad/h/mainharness.mjs`
(usage: `node <that file> '<snippet>'`; `sandbox()`, `show()`, `STORE` = localStorage, `OVERLAY` = #start-overlay are in scope).
Audits that came back CLEAN: every room chip at three hours in vacation and Soi 6 mode run through `doCommand` (no parse
failure), every wheel action from `_npcActions` for every NPC in every open room (11,416 commands, none refused as a
parse failure), every bare `_COMPLETE_VERBS` entry (only `save`/`undo` fail, see S9-9), no `Date`/`window`/`localStorage`/
timers in the game core, no duplicate case labels found.

### S9-1: RESTART (and RESET, engine-side) wipes a live game on one word: no confirmation, through every gate, and UNDO is dropped
- system: presentation   severity: high   owner: engine
- site: web/js/engine-parser.js:20782 (`_doCommandInner`, `case "reset": case "restart":`); gate bypasses at 19310/19364/19450 (`v !== "restart"`)
- defect: RESTART calls `newGame()` + `engineIntro()` (or `startSoi6Mode`) immediately. main.js guards RESET with a two-step
  confirm, but RESTART goes straight to `doCommand`, and RESET's own warning text advertises RESTART. RESTART is in
  `_COMPLETE_VERBS` (the 8th suggestion for "re", the first for "res"), and it runs even under the barfine/encounter/soapy
  gates. The new game lands on a different day:act1Tries:vacation mark, so main.js drops the UNDO buffer: the week is
  gone and unrecoverable. CLAUDE.md says a choice that ends a night asks once (`_endConfirm`). This one ends the whole game
  and doesn't ask. RESTART should ask once (`_endConfirm("restart", …)`) except at the end-of-week card, where it is a
  listed answer.
- repro (main.js harness):
  node mainharness.mjs 'sandbox(30000); G.day=5; G.room="stinky_bar"; G.happy=60; D("look"); out.length=0; D("restart"); out.length=0; console.log("after restart: day", G.day, "money", G.money, "happy", G.happy, "pc", G.pendingChoice); D("undo"); show("undo")'
  → after restart: day 2 money 0 happy 0 pc intro
  → == undo ==  Nothing to rewind. A night ends where it ends: the soi doesn't rewind, and neither does the morning.
  (Soi 6 mode, day 4, happy 80: same, "soi6 after restart: day 1 happy 0 pc intro", UNDO "Nothing to rewind".)
  node tools/probe.mjs 'sandbox(); G.room="stinky_bar"; console.log(engineComplete("res")); G.pendingBf={id:"manow",st:1000,lt:2000}; out.length=0; run("restart"); console.log(out.slice(0,4).join(" / ").slice(0,90), "pc", G.pendingChoice)'
  → [ 'restart', 'reset' ]
  → THE LAST BAHT BUS / a Pattaya misadventure · … pc intro      (the barfine gate didn't hold it)
- fix: route bare RESTART/RESET outside `vacation_end`/`gameend` through `_endConfirm("restart", "(That starts the whole game over — this week is gone. RESTART again to confirm.)")`.

### S9-2: A RESET confirmation survives UNDO / SAVE / LOAD / TOGGLE / FONT / UNSHELVE, so a later YES (meant for any prompt) wipes the save
- system: presentation (saveload)   severity: high   owner: frontend
- site: web/js/main.js:481 (`_dispatch`, the `_awaitingReset` block sits below the UNDO, SAVE/LOAD, TOGGLE_V0/V1, TOGGLE FULL, FONT and UNSHELVE early-returns)
- defect: RESET sets `_awaitingReset` and promises "Type RESET again (or YES) to confirm — anything else cancels." Each of
  the verbs handled above that block returns without clearing the flag. A player who types RESET, then UNDO (or SAVE), and
  later answers YES to an unrelated prompt (Tan's favour, a shift call, the plane) wipes the save and lands on the start
  menu. Any input other than RESET/YES should cancel the arm before it is handled.
- repro (main.js harness):
  node mainharness.mjs 'sandbox(); G.room="stinky_bar"; D("look"); out.length=0; D("reset"); D("undo"); out.length=0; console.log("armed after undo?", _awaitingReset); D("save"); console.log("armed after save?", _awaitingReset); out.length=0; G.pendingChoice="tanfavour"; D("yes"); show("yes (meant for Tan)"); console.log("save after yes:", STORE.lbb_save || null, "overlay hidden:", OVERLAY.hidden)'
  → armed after undo? true
  → armed after save? true
  → == yes (meant for Tan) ==  ⌫ Slate wiped — the debts, the dog, the girls' patience, all of it.
  → save after yes: null overlay hidden: false
- fix: at the top of `_dispatch` (after the overlay/continue gates): `if (_awaitingReset && v !== "reset" && !["yes","y","confirm","wipe"].includes(v)) { _awaitingReset = false; _term.print("Reset cancelled — your night stands.", "dim"); }`, then go on to handle the command. Or move the `_awaitingReset` block above UNDO.

### S9-3: In a conversation, any command naming "the mamasan" (or "the girls here") is eaten as a topic, and Mamasan Mem's own "buy her a drink" chip does nothing
- system: presentation (conversation routing)   severity: high   owner: engine
- site: web/js/engine-parser.js:19622 (`_doCommandInner`, the `_HER_ROUTE.find(...)` stage, which skips only `ask|talk|tell`); the chip at 16723 (`_chipSet`, `"buy drink for " + _first`)
- defect: while a conversation is open, the `_HER_ROUTE` stage runs before the verb switch and matches its regexes
  anywhere in the line. Only ASK/TALK/TELL are exempt. So BUY DRINK FOR THE MAMASAN, TIP THE MAMASAN 100, BUY THE MAMASAN A
  DRINK, X MAMASAN and WAI MAMASAN all become "ask her about the mamasan" (a remark), and no money moves. RING BELL FOR THE
  GIRLS HERE, BUY DRINKS FOR THE GIRLS HERE and TIP THE GIRLS HERE 100 hit the `girls` route the same way, and
  SAY SAWASDEE IN THAI hits `thai`. Outside a conversation every one of these works. The worst case is on the chip surface:
  for Mamasan Mem (Tequila Queen), the conversation chip "buy her a drink ฿260" submits `buy drink for mamasan`, because
  `_first` is the first word of her name. Tapping it never buys, though typing BUY DRINK FOR MEM does. A verb-led line
  should never be re-routed.
- repro:
  node tools/probe.mjs 'sandbox(50000); G.nightTurn=40; G.room="tequila_queen"; G.known.mem=true; _convoStart("mem"); out.length=0; console.log(_chipSet().filter(c=>/buy/.test(c.cmd))); const m0=G.money; run("buy drink for mamasan"); show("chip"); console.log("money moved", m0-G.money)'
  → [ { cmd: 'buy drink for mamasan', label: 'buy her a drink ฿260', kind: undefined } ]
  → Mamasan Mem: "Up to you," she says — the Thai answer to most things, and not a dismissal.   money moved 0
  node tools/probe.mjs 'sandbox(50000); G.nightTurn=40; G.room="stinky_bar"; G.known.manow=true; const s0=serializeGame(); for (const c of ["buy drink for the mamasan","tip the mamasan 100","ring bell for the girls here"]) for (const cv of [1,0]) { deserializeGame(s0); if (cv) _convoStart("manow"); out.length=0; const m=G.money; run(c); console.log((cv?"CONVO ":"plain ")+c, "| moved", m-G.money, "|", out.join(" / ").slice(0,80)); }'
  → CONVO buy drink for the mamasan | moved 0 | Manow nods along, catching most of it. "Mm. Same same,"…
  → plain buy drink for the mamasan | moved 150 | You buy Lamai a drink…
  → CONVO tip the mamasan 100 | moved 0 | Manow nods along…      plain … | moved 100
  → CONVO ring bell for the girls here | moved 0 | 🌺 Manow: “สวัสดีค่ะ”…   plain … | moved 1150 | You reach up and RING THE BELL.
- fix: change the guard at 19622 to `(_isRealCommand(v) || /^(?:ask|talk|tell) /.test(lower)) ? null : _HER_ROUTE.find(...)`
  (a line led by a real verb belongs to the verb). In `_chipSet`, use `_npcLabel`/the full lowercased name, or the id
  resolved by `_npcByName`, not the first word.

### S9-4: UNDO rewinds an ANSWERED pendingChoice gate, so a player can see a consequence and choose again
- system: presentation (saveload)   severity: medium   owner: frontend
- site: web/js/main.js:706 (`_dispatch`, `_gameBefore = !!(G.game || G.pendingBf || G.pendingEnc)`); also 383 (the UNDO refusal reads the same three)
- defect: main.js's rule is that a modal answer is final ("the soi doesn't rewind"), and it drops the UNDO buffer when a
  command ends a game, a barfine or an encounter. `G.pendingChoice` (and `pendingSoapy`/`pendingFare`) is left out, so
  answering any of the 24 GATES and then typing UNDO puts the gate back with the same dice. In the reproduction below,
  answer 1 to the affair's rota crisis leaves strain at 2, UNDO restores the gate, and answer 2 gives strain 5. The player
  has now read both outcomes before choosing. The same applies to SELL UP's buyer, the Rabbit's interview, the kid's
  price, Cream's GO, the Sathorn bill and the rest.
- repro (main.js harness, owner() as in tools/modal-audit.mjs):
  node mainharness.mjs '…owner(); _affairCrisisAsk(AFFAIR_CRISES[0]); out.length=0; D("1"); console.log("after 1: pc", G.pendingChoice, "strain", G.affair.strain, JSON.stringify(G.affair.crisChose)); D("undo"); console.log("after undo: pc", G.pendingChoice, JSON.stringify(G.affair.crisChose)); D("2"); console.log("after 2: strain", G.affair.strain)'
  → after 1: pc null strain 2 {"rota":"a"}
  → ⌫ Rewound one command. … (1 — TAKE HER OFF IT · 2 — THE ROTA STANDS.)
  → after undo: pc affaircrisis {}
  → after 2: pc null strain 5 {"rota":"b"}
- fix: `const _gameBefore = … !!(G.game || G.pendingBf || G.pendingEnc || G.pendingChoice || G.pendingSoapy)` (pendingFare can stay rewindable), and add `G.pendingChoice && G.pendingChoice !== "intro"` to the UNDO refusal so UNDO can't un-ask a live question either.

### S9-5: The checkout gate's chips and redraw quote vacation prices to an expat; the live prompt quotes the expat rate
- system: hotels / presentation   severity: medium   owner: engine
- site: web/js/engine-parser.js:16628 (`_chipSet`, hard-coded `"Sabai ฿400"` / `"Queen Vic ฿700"` / `"Areca ฿900"` / `"Metropole ฿1300"`); 18612 (`_checkoutPrompt`, reads `_HOTELS[k].rate`); the live prompt at 14945 (`_doCheckout`) reads `_hotelRate(k)`
- defect: three surfaces for one question, and three different answers. In expat stage the clerk's live list says ฿270 /
  ฿520 / ฿730 (`expatRate`). The chips say ฿400 / ฿900 / ฿1300, typed as digits, which breaks the "numbers in prose are
  constants" rule. The reprompt and the reload redraw (`_checkoutPrompt`) also say ฿400 / ฿900 / ฿1,300. GATES requires
  the live prompt, the reprompt and the redraw to be identical.
- repro:
  node tools/probe.mjs 'sandbox(20000); G.stage="expat"; G.hotel="queenvic"; G.room=_hotelRoomId(); G.nightTurn=2; run("checkout"); show("live"); console.log(JSON.stringify(_chipSet())); _renderResume(); show("redraw"); run("what?"); show("reprompt")'
  → live: · (SABAI PALMS HOTEL — ฿270/night) · (ARECA LODGE — ฿520/night) · (LK METROPOLE — ฿730/night)
  → [{"cmd":"sabai","label":"Sabai ฿400"},{"cmd":"areca","label":"Areca ฿900"},{"cmd":"metropole","label":"Metropole ฿1300"},…]
  → redraw: The clerk waits. (SABAI PALMS HOTEL — ฿400/night · ARECA LODGE — ฿900/night · LK METROPOLE — ฿1,300/night · or STAY.)
  → reprompt: (same ฿400/฿900/฿1,300)
- fix: make one helper, `_checkoutOptions()`, from `_HOTELS` with `_hotelRate(k)`, and have `_doCheckout`, `_checkoutPrompt` and `_chipSet` all use it.
  (Also noted, not separately filed: the answer test `/stay|cancel|no|keep|never ?mind/` is unanchored, so "the LK metropole now" or "areca, I don't know" reads as STAY because of the "no" in "now"/"know".)

### S9-6: The Orchid Room's women are offered drink / barfine / tip / flirt on the conversation chips, the wheel and the completion, and every one is refused
- system: presentation   severity: medium   owner: engine
- site: web/js/engine-parser.js:16723 (`_chipSet`, the conversation drink chip); `_npcActions` (engine-systems) for the wheel; `_completePool` `girls()` for `barfine `/`buy drink for `
- defect: the 2026-10-25 review fixed the parser so the Orchid's women take no lady drinks, tips or dances. The surfaces
  were left alone. In a conversation with Pae, the chip bar shows "buy her a drink ฿190" and "flirt". Her wheel offers
  buyher, barfine, flirt and tip. `engineComplete("barfine ")` lists all five women. Every one of these answers "The women
  in here aren't working the floor…" with no money moved. This is the three-surfaces rule broken from the other side: the
  parser has the rule and the three surfaces don't consume it.
- repro:
  node tools/probe.mjs 'sandbox(50000); G.nightTurn=40; G.room="orchid_room"; G.known.pae=true; console.log("wheel", _npcActions("pae",true)); console.log(engineComplete("barfine ")); _convoStart("pae"); out.length=0; const ch=_chipSet().find(c=>/^buy drink/.test(c.cmd)); console.log(ch); const m=G.money; run(ch.cmd); show(); console.log("moved", m-G.money)'
  → wheel [ 'talk','examine','buyher','barfine','flirt','tip','contact','wai' ]
  → [ 'nune', 'pae', 'gyp', 'sudjai', 'kae' ]
  → { cmd: 'buy drink for pae', label: 'buy her a drink ฿190' }
  → The women in here aren't working the floor — they're the room's… moved 0
- fix: add one predicate (e.g. `_floorWorks(id)`: false for the Orchid's women), read by `_npcActions`, the conversation
  chips and `_completePool`'s `girls()`, and by the parser's refusal.

### S9-7: Prefill fan-outs are capped at 8 by engineComplete, so the motosai… chip can't reach 9 of its 17 destinations
- system: presentation   severity: medium   owner: engine
- site: web/js/engine-parser.js:17165 (`engineComplete`, `if (out.length >= 8) break;`), consumed by web/js/term.js:1062 (`_prefillMenu`, which itself allows 12)
- defect: a chip whose cmd ends in a space fans out into a tap menu built from `engineComplete`. The completion stops at 8,
  so on every street with a motosai stand (42 rooms) the "motosai…" menu shows walking street…jomtien and drops Naklua,
  Darkside, Khao Talo, Myth Night, the lake, Thappraya, Supertown, the Old Market and Pratumnak. For a thumb player the
  motosai can never reach them, though typing MOTOSAI TO NAKLUA works. The same cap drops Wayne from "talk to…" at the
  Golden Dragon at 01:00 (9 people). term.js's comment says the fan-out uses "the same source the keyboard's autocomplete
  uses, so the two surfaces can never disagree". The source is the same, but the 8-cap made for keyboard suggestions now
  truncates the tap menu.
- repro:
  node tools/probe.mjs 'sandbox(5000); G.room="beach_rd_klang"; G.nightTurn=30; console.log(engineComplete("motosai to ").length, _completePool("motosai",["motosai"]).length); const s=serializeGame(); run("motosai to naklua"); console.log(G.room)'
  → 8 17
  → naklua_rd       (typed works, so a destination exists that no tap reaches)
- fix: `engineComplete(input, { all: true })` for `_prefillMenu` (term.js already slices to 12; raise that too, or page it the way TOPICS does), and keep the 8-cap for typed suggestions only.

### S9-8: In the Soi 6 week, the "motosai…" chip on Soi 6 West End fans out into eight destinations that are all refused
- system: presentation   severity: low   owner: engine
- site: web/js/engine-parser.js:16758 (`_chipSet`, `if (r.motosai) add("motosai to ", "motosai…")`; the bus chip on the next line is already guarded by `G.mode !== "soi6"`)
- defect: the default entry's home street (soi6_street) has a motosai stand. In soi6 mode the chip is offered, and every
  one of its eight fanned destinations answers "Not this trip. You made yourself a rule…". The bus chip was suppressed
  for exactly this reason ("the week's frame refuses every bus"). The motosai chip and its completion pool were not.
- repro:
  node tools/probe.mjs 'startSoi6Mode(); G.pendingChoice=null; G.flags.act1Done=true; G.room="soi6_street"; G.nightTurn=30; G.money=5000; for (const k in ENCOUNTERS) G.encDone[k]=true; console.log(_chipSet().some(c=>c.cmd==="motosai to ")); const s=serializeGame(); for (const o of engineComplete("motosai to ")) { deserializeGame(s); doCommand("motosai to "+o); console.log(o, G.room==="soi6_street"?"refused":"MOVED"); }'
  → true / walking street refused / beach road refused / … / soi 6 refused / jomtien refused
- fix: `if (r.motosai && G.mode !== "soi6") add(...)`, and have `_completePool("motosai")` return `[]` in soi6 mode.

### S9-9: guards.test's ratchet misses the negated forms: 16 `typeof _x !== "function"` guards over real engine functions (including `_closeTurn`), plus ~126 `typeof CONST !== "undefined"` over engine constants
- system: presentation (tooling)   severity: low   owner: tool
- site: tests/js/guards.test.js:25 (regex `/typeof (_\w+) === "function"/g`); examples web/js/engine-parser.js:15509 (`typeof _closeTurn !== "function" || _closeTurn(o.id) == null`), :6507 (`typeof _atOwnBar !== "function" || !_atOwnBar()`), engine-play.js:3426/3431 (`_pers`), engine-systems.js:11043 (`_roomByName`)
- defect: the ratchet counts only the `=== "function"` spelling. The negated guard has the same hazard: rename `_closeTurn`
  and line 15509's `dawn` is silently always true, and `_atOwnBar` makes every owner's bar "not yours". It isn't counted.
  `typeof NIGHT_TURNS !== "undefined"`, `typeof FOOD_STALLS !== "undefined"`, `typeof _HOTELS === "undefined"` and the rest
  over engine-defined constants aren't counted either. The frontend has the same pattern over engine functions, and those
  files aren't scanned: main.js `typeof _renderResume === "function"` (UNSHELVE/RESUME), `exportBaton`, `_shareCard`,
  `_happyLevel`, and 30 in term.js (`_npcActions`, `engineComplete`, `_ladyPrice`, `_convoActive`…). There, a rename
  silently empties the wheel or skips the modal redraw.
- repro:
  grep -n 'typeof _closeTurn !== "function"' web/js/engine-parser.js
  → 15509:  const dawn = open.every(o => typeof _closeTurn !== "function" || _closeTurn(o.id) == null);
  (a node count over the engine files, by form, for names the engine defines: engine-parser `!== "function"` 6,
  engine-play 3, engine-systems 3, engine-core 1, engine-encounters 1; `!== "undefined"` 71 + 28 + 19 + 4; main.js
  `=== "function"` 5, term.js 30. guards.test counts none of these.)
- fix: widen the regex to `/typeof (\w+) [!=]== "(?:function|undefined)"/` against the same `defs` set, re-baseline the
  ceiling, and scan main.js/term.js/scene.js against the engine's definitions with their own ceiling.

### S9-10: The start menu lets any "toggle…" line through to the skeleton game behind it, which autosaves over the real save
- system: presentation (saveload)   severity: low   owner: frontend
- site: web/js/main.js:314 (`_dispatch`, overlay gate `!/^toggle/.test(v)`)
- defect: the overlay gate exists so typed commands can't drive the hidden skeleton game ("e" walked the hidden player
  to the beach road). It exempts every line starting with "toggle", not just TOGGLE V0/V1/FULL. "toggle e" or "toggle
  music" on the menu falls through to `doCommand` on the `newGame()` skeleton, then `_autosave()` writes that skeleton
  (day 2, Jomtien, no `pendingChoice`, no character) over `lbb_save`. A reload then offers "A night in progress was found"
  for a game that bypasses the taxi intro. After Continue→NO the real night survives only in the shelf.
- repro (main.js harness):
  node mainharness.mjs 'sandbox(9000); G.day=5; G.room="stinky_bar"; D("look"); _showStartMenu(); out.length=0; D("e"); show("typed e on menu"); D("toggle e"); show("typed toggle e on menu"); const s=JSON.parse(STORE.lbb_save); console.log("save now: day", s.day, "money", s.money, "room", s.room, "pc", s.pendingChoice)'
  → == typed e on menu ==  (Pick a mode above to start.)
  → == typed toggle e on menu ==  The soi blinks at you. Try again — (HELP lists commands.)
  → save now: day 2 money 0 room jomtien_beach pc null      (it was day 5, ฿9,000)
- fix: exempt only `/^toggle[_ ]?(v[01]|full)$/`.

### S9-11: A `//` comment swallowed `G.month.days = (G.month.days || 0) + 1; }` at the end of the month-book line
- system: expat-month (found by the comment lint for this section)   severity: low   owner: engine
- site: web/js/engine-play.js:6042 (`_endNight`, the `_mb` month-book line)
- defect: the line ends `…(Frank, round 99) G.month.days = (G.month.days || 0) + 1; }   // the month's book: …`. That is a
  statement and a closing brace inside a trailing comment, which is the exact class CLAUDE.md warns about. The live code
  earlier on the line already does `_mb.days = (_mb.days || 0) + 1` with `_mb = G.monthClosing || G.month`, so this looks
  like a superseded copy rather than a lost increment. But nothing on the page says so, and the next editor can't tell
  whether a `G.month.days` tick on a closing night was meant to survive.
- repro:
  sed -n 6042p web/js/engine-play.js | grep -o '(Frank, round 99) G.month.days = (G.month.days || 0) + 1; }'
  → (Frank, round 99) G.month.days = (G.month.days || 0) + 1; }
- fix: delete the dead text, or, if a closing night should also count a day in the new month, write it as code on its own line.

### S9-12 (low, note): `save` and `undo` are in `_COMPLETE_VERBS`, but only main.js implements them, and the engine parse-fails them
- system: presentation   severity: low   owner: engine
- site: web/js/engine-parser.js:16544 (`_COMPLETE_VERBS`)
- defect: in any host that isn't this main.js (online.test's vm session model, a 2D frontend), autocomplete offers SAVE
  and UNDO and the engine answers "The soi blinks at you". LOAD, QUIT, END and LOGOUT have engine answers; SAVE and UNDO
  don't. The fix is either an engine line for each (as LOAD has) or keeping frontend verbs out of the engine's pool.
- repro:
  node tools/probe.mjs 'sandbox(); G.room="stinky_bar"; for (const v of ["save","undo","load"]) { out.length=0; doCommand(v); console.log(v, "=>", out[0]); }'
  → save => The soi blinks at you. Try again — (HELP lists commands.)
  → undo => The soi blinks at you. Try again — (HELP lists commands.)
  → load => The night restores itself after every command — there's no load screen on a life. To take back your last move, use UNDO.
- fix: give SAVE/UNDO an engine answer like LOAD's ("the night saves itself"; "UNDO is the app's"), or drop them from the pool.

## Summary

Twelve findings: three high, four medium, five low. The most serious is S9-1. RESTART is the eighth autocomplete
suggestion for "re", it goes through even the barfine and encounter gates, it wipes a mid-week game on one word with no
`_endConfirm`, and it changes the day mark, so main.js drops UNDO and the week can't be recovered. RESET, its sibling,
has a two-step confirm. Close behind are S9-2, where the RESET confirmation survives UNDO/SAVE/TOGGLE and a later YES to
any prompt wipes the save, and S9-3, where `_HER_ROUTE` eats verb-led commands naming "the mamasan" or "the girls here"
during any conversation, which kills Mamasan Mem's own "buy her a drink" chip. The chip, wheel and completion surfaces
were otherwise clean under exhaustive walks. What disagreed was rules that never reached the surfaces: the Orchid's
refusals (S9-6), the checkout's expat rate (S9-5), the motosai under the Soi 6 frame (S9-8) and the 8-item cap (S9-7).
Suspected but not reproduced: `_renderResume` re-asks a pending `G.convoQ` and then falls through to a pendingChoice
redraw (synjob/shift/keptgirl/partner/affair…), so a reload with both up would print two questions, but I could not
build that state from a real path. The HANDOVER path sets `_prevSnap` without the day-mark/`_saveUndo` bookkeeping the
main path does. I didn't build a baton to prove a wrong UNDO there.


# S10 — The tools and the audits (reviewer findings, 2026-11-01)

Scratch mirrors used for mutations (outside the repo): `<SCRATCH>/w`, `<SCRATCH>/w2`, `<SCRATCH>/w3`
(web/js symlinked to the worktree, the one mutated file copied). `<SCRATCH>` =
`/private/tmp/claude-501/-Users-mario-projects-last-baht-bus--claude-worktrees-code-review-1101-3b63f9/36a1d5cb-f80a-4586-be10-5707a66db702/scratchpad`.

### S10-1: talk-order.mjs cannot see about 20 of `_doTalkCore`'s answerers, so the order pin passes when an answerer is added or moved
- system: conversation (talk order)   severity: high   owner: tool
- site: tools/talk-order.mjs:13-19 (`talkOrder`), tests/js/talk-order.test.js (the `ORDER` pin), docs/architecture.md `<!-- talkorder -->`
- defect: The extractor only accepts an answerer written as a one-line `if (… _x(npc …) …) { … return`, and it keeps only the FIRST `_x(npc` on the line. Three common shapes are invisible to it:
  (a) `const said = _poolTalk(npc); if (said) {…return}`, the form used by `_poolTalk`, `_barfineTalk`, `_priceTalk`, `_kitchenTalk`, `_workTalk`, `_afterWorkTalk`, `_selfNamedNode`;
  (b) a plumbing predicate earlier on the same line: `if (!topic && … !_maiDee(npc) && _wentWithHello(npc))` records nothing, because `_maiDee` is matched first and dropped. `if (… _atCamera(npc) …) { _streamBusy(npc); return; }` records the predicate `_atCamera` instead of the answerer `_streamBusy`;
  (c) a multi-line `if` such as `_exitSlip`, or `_say(_dogTalk(npc))`, `_badgeTalk`, `_venueAnswer`, `_paperTalk`, `_foodWhereTalk`, `_keptTalk`.
  As a result, the "44 answerers" that CLAUDE.md, architecture.md and the pin describe is the subset with one syntactic shape. Moving or adding an answerer in any other shape, which is exactly the "a new answerer above another takes its questions" defect this pin exists for, leaves `talkOrder()` byte-identical, so the test stays green.
- repro (static, plus a mutation in a scratch copy):
  ```
  node -e '…list every _x(npc|c|id) call in _doTalkCore not in talkOrder()…'   # see the command in the transcript
  → _wentWithHello 5127, _streamBusy 5166, _paperTalk 5285, _venueAnswer 5322, _foodWhereTalk 5421, _badgeTalk 5435,
    _workTalk 5451, _poolTalk 5467, _barfineTalk 5474, _priceTalk 5478, _kitchenTalk 5482, _dogTalk 5521, _keptTalk 5552,
    _afterWorkTalk 5033, _exitSlip 5009, _selfNamedNode 6037 …  (none of them in talkOrder())
  # w2 mirror: engine-parser.js with this inserted as the FIRST statement of _doTalkCore —
  #   if (/\b(price|how much)\b/.test(String(topic))) {
  #     const said = _priceTalk(npc);
  #     if (said) { _say(said); return; }
  #   }
  node -e 'Promise.all([import("<SCRATCH>/w2/tools/talk-order.mjs"),import("<repo>/tools/talk-order.mjs")]).then(([a,b])=>console.log(JSON.stringify(a.talkOrder())===JSON.stringify(b.talkOrder())))'
  → talkOrder() identical after moving _priceTalk above every answerer: true
  ```
- fix: Extract the order by running the code instead of reading it: the probe already wraps every answerer for `who()`. Or widen the static pass: scan every `_\w+\(npc\b` call inside the body in source order, minus PLUMBING, and keep the ones whose statement or enclosing block reaches a `return`. In both cases, re-pin the full list.

### S10-2: gogo-audit's oracle is the engine's own `_FIT_GOGO`, so it can never find a furniture phrase the filter lacks (and it has no --mutate)
- system: go-go venue fit   severity: medium   owner: tool
- site: tools/gogo-audit.mjs:26 (`const RX = _FIT_GOGO;`)
- defect: The audit is meant to prove that what actually prints in a go-go obeys the room-fit rule. It judges each printed sentence with the same regex `_roomFit` uses to drop pooled lines. It can therefore only catch a line that bypassed `_roomFit` and also happens to use a word the regex knows. A line like "leans against the bar", "props herself at the counter" or "pulls up to the bar" passes both the filter and the audit. The defect is in the oracle's vocabulary, which no test can see, because the test asserts zero rows of a set that can never contain such a line. The audit also has no `--mutate`, so nothing proves it can go red.
- repro (scratch copy `w/tools/gogo-m.mjs` = the audit plus `_BELL_GOGO.length = 0; _BELL_GOGO.push(process.env.L);` after line 26):
  ```
  L="The mamasan leans against the bar and claps, and the cashier props herself at the counter." node tools/gogo-m.mjs --quick --json
  → 0 rows []
  L="The mamasan leans on the bar and claps." node tools/gogo-m.mjs --quick --json
  → 1 rows [ 'ring bell: The mamasan leans on the bar and claps.' ]
  node tools/probe.mjs 'console.log(_FIT_GOGO.test("The mamasan leans against the bar and claps, and the cashier props herself at the counter."))'
  → false
  ```
- fix: Give the audit its own wider vocabulary of bar furniture, independent of `_FIT_GOGO` (against/to/by/from the bar, the counter, bar top, lean, perch …) with a small OK list. Add `--mutate bell`, which plants one such line in `_BELL_GOGO`, and gate it in gogo.test the way chorus and memory are gated.

### S10-3: docs/portrait-manifest.json (the art agent's render queue) is not checked against its generator by any test or CI step
- system: art pipeline / portraits   severity: medium   owner: tool
- site: scripts/gen-portrait-manifest.mjs:170-180 (`--check`); tests/js (no caller); .github/workflows/pages.yml (runs only `node --test` and e2e)
- defect: CLAUDE.md says all three manifests are regenerated after any world.js change "because tests assert they are in sync". That holds for the scene manifest (art.test runs `--check`) and the world export (world-export.test compares `buildExport()`), but not for the portrait manifest. Its `--check` mode exists and nothing runs it. sweep.test and floor.test only read the committed file: they check that relook ids are characters and that the twins are present. A changed `look` (or a new character) that is never regenerated leaves `unrendered`/`relook` stale, so the art agent's queue silently omits the face. That is the exact failure the 2026-10-02 and 2026-10-07 conventions were written to stop.
- repro (w3 mirror: world.js copy with the first long `look:` replaced; everything else symlinked):
  ```
  node <SCRATCH>/w3/scripts/gen-portrait-manifest.mjs --check ; echo $?
  → portrait-manifest.json is out of date — run: node scripts/gen-portrait-manifest.mjs
  → exit 1
  grep -arln "gen-portrait-manifest" tests .github package.json || echo none
  → no test, workflow or npm script runs gen-portrait-manifest
  ```
- fix: Add a test that spawns `scripts/gen-portrait-manifest.mjs --check` and asserts exit 0, the same as art.test does for the scene manifest. If the date line differs per day, strip it the same way.

### S10-4: witness-audit classes only the FIRST witness claim in each corpus record; four live claims are unclassed and invisible
- system: witness rule   severity: low   owner: tool
- site: tools/witness-audit.mjs:57 (`m = RX.exec(String(r.text || ""))`, a non-global regex, one match per record)
- defect: Every witness claim is supposed to be classed (general / consequence / witness), and a new one is supposed to fail round63.test. The harvest calls `exec` once per record, though, so a second claim in the same text is never seen. A new "the whole soi saw" appended to any line that already carries a classed claim passes the gate unclassed. Today four such claims exist, each behind a first claim of a different class (for example `_doBuy`'s "the floor talks" behind "the floor notices", classed `general: a moment`; `_SIGHT_OVER`'s "the street watches" behind a `consequence`).
- repro (scratch copy `w/tools/wa.mjs` = the tool plus an `allMatches()` that uses the same `RX` with the `g` flag):
  ```
  node -e 'import("./tools/wa.mjs").then(m=>{for (const x of m.allMatches()) console.log((x.cls||"UNCLASSED")+"  "+x.key+"   (first: "+x.first+")")})'
  → UNCLASSED  engine-play.js:_REL_GREET|everyone knows   (first: spoken for)
  → UNCLASSED  engine-systems.js:_SIGHT_OVER|the street watches   (first: in front of the whole)
  → UNCLASSED  engine-parser.js:_doTalkCore|everyone knows   (first: spoken for)
  → UNCLASSED  engine-parser.js:_doBuy|the floor talks   (first: the floor notices)
  ```
- fix: Build `RX` with the `g` flag and push one claim per `matchAll` match. Then class the four rows that surface. The test should also assert that `witnessClaims().length` is greater than about 150, so that an empty harvest (prose-corpus output changing shape) cannot pass.

### S10-5: the parse-failure oracles in soak, dialogue-lifecycle, errand-audit and askable-audit are stale, and three of the five `_HUH` lines are invisible to them
- system: instruments (parser misses)   severity: low   owner: tool
- site: tools/soak.mjs:574 (`hint-miss`: `/didn't understand/i`); tools/dialogue-lifecycle.mjs:224 (`DEAD_ENDS`); tools/errand-audit.mjs:124; tools/askable-audit.mjs:199
- defect: The 2026-10-18 escalation rewrote the miss lines. The FIRST parse failure, which is the usual case after a successful command, now prints `_HUH_SOFT` ("The soi blinks at you…"), and two of the four warn lines say "That didn't parse". The literal lists still name "That one didn't parse", which no longer exists anywhere in web/js, and omit "The soi blinks" and "That didn't parse". The soak's promise-catcher regex matches only "didn't understand". So a played hint that the parser disowns is not counted (`stats.understoodMisses`, `hint-miss`). In the three audits, a reply that is a parse failure counts as an answer unless the nonsense probe happened to provoke the same line. The engine's own comment at engine-parser.js:896-899 says every oracle judges against `_HUH` for exactly this reason. These four do not. A sweep of 71 odd-character topic aliases found no live parse failure, so this is latent, but the oracle is wrong.
- repro:
  ```
  node tools/probe.mjs 'sandbox(); run("look"); out.length=0; run("frobnicate the gizmo"); const l=out.slice(); console.log(JSON.stringify(l)); console.log("soak hint-miss regex fires:", l.some(x=>/didn'\''t understand/i.test(x)), " | in _HUH:", l.some(x=>_HUH.includes(x)))'
  → ["The soi blinks at you. Try again — (HELP lists commands.)"]
  → soak hint-miss regex fires: false  | in _HUH: true
  # DEAD_ENDS against _HUH: MISSED "The soi blinks at you…", MISSED "That didn't parse. Phrase it…", MISSED "That didn't parse — start with…"
  grep -rn "That one didn't parse" web/js/   → (nothing)
  ```
- fix: Replace each literal list and regex with `_HUH.some(h => reply.includes(h))`, plus the talk/Thai variants (`_HUH_TALK` templates, `_HUH_THAI(_SOFT)`) if those should count. Drop the dead "That one didn't parse".

### S10-6: "each gated audit has a --mutate that proves it goes red" is false for 6 of the 15, and two mutations that exist come back green
- system: instruments   severity: low   owner: tool
- site: CLAUDE.md "The gated audits (… each with a `--mutate` that proves it goes red)"; tools/{modal,gogo,witness,askable,afford,asktopic}-audit.mjs; tools/dialogue-lifecycle.mjs:44-82; tools/memory-audit.mjs:59
- defect:
  - modal, gogo, witness, askable, afford and asktopic have no mutate mode at all, so their tests only prove that the audit reports zero (see S10-2 for what that hides).
  - dialogue-lifecycle's documented `--mutate wimon#5 --mutate wimon#1` reports 0 closed. Its own comment admits it no longer proves anything, and no test runs it.
  - memory-audit carries an undocumented, ungated `witness` mutation (it empties `G.lastNightWas.bars` after each night) that also reports 0 findings. Either the audit cannot see the bars-witness record, or the mutation does not break anything the audit judges.
- repro:
  ```
  grep -n -i mutat tools/{modal,gogo,witness,askable,afford,asktopic}-audit.mjs   → (nothing)
  node tools/dialogue-lifecycle.mjs --quest keys --mutate wimon#5 --mutate wimon#1
  → dialogue-lifecycle: 1 quests, 27 (person, topic) pairs walked, 3 replayed, 0 closed
  node tools/memory-audit.mjs --quick --mutate witness --json
  → {"women":8,"plays":28,"findings":[]}
  ```
- fix: For each of the six, add one mutation that breaks the thing it guards and gate it beside the existing assertion: modal, a gate's non-answer commits; afford, a vendor verb refuses; askable/asktopic, one answering node is removed; witness, one CLASS entry is dropped. Replace lifecycle's node-drop mutation with the engine one its comment describes (revert the seen-book check in `_doTalkBody`) and gate it. Delete memory's `witness` mutation, or make the audit probe what it removes. Until then, correct the CLAUDE.md sentence.

### S10-7 (outside S10, found while reading the chorus audit's transcript): the Orchid Room says it closes at midnight; it closes at four
- system: hours / closing time   severity: medium   owner: engine
- site: web/js/engine-play.js:205 (`_closesMidnight`) consumed by web/js/engine-parser.js:15693 (`_closingTalk`)
- defect: `_closesMidnight(id)` returns true for ANY bar with a close turn (`_closeTurn(id) != null`), not for a midnight close. `_closingTalk` handles the Queen Vic (50) and `SOI6_CLOSE` (80) first, then gives every other closing bar the midnight pool. The Orchid Room closes at turn 100 (04:00, per the latest commit's ruling on its hours), so Nune answers "Twelve o'clock. Not our choice — this road must close. Half eleven you order the last one." That is an hour the game did not compute, and the rule says it must go through `_closeClock`/`_closeTurn`. The same predicate gates the last-bus and closing-time logic at engine-systems.js:596/610 and engine-parser.js:1560/1975, where it only means "has a close time", so the name misleads every caller.
- repro:
  ```
  node tools/probe.mjs 'sandbox(); G.mode="soi6"; G.room="orchid_room"; G.nightTurn=30; G.metDay={nune:G.day-2}; G.soc.drinks.nune=4; out.length=0; run("ask nune about closing"); show(); console.log(_closesMidnight("orchid_room"), _closeTurn("orchid_room"))'
  → “Twelve o'clock. Not our choice — this road must close. Half eleven you order the last one.”
  → answered by: _closingTalk
  → true 100
  ```
- fix: In `_closingTalk`, take the midnight pool only when `_closeTurn(G.room) === 60`. For any other close turn, add a branch that says the hour through `_closeClock(G.room)`, or give the Orchid its own small pool. Rename `_closesMidnight` to `_hasCloseTime`, or leave it and add a real `_closesAtMidnight`.

## Suspected, not reproduced as a defect
- gates.test "wired five ways" uses `src.includes('"' + g + '"')` and `audit.includes(g)`, a bare substring. "cham" is inside "chamgift", "affair" inside "affaircrisis", and "partner" inside the `owner()` recipe's flags, so a missing recipe for those three would pass this test. The modal-audit test's `unarmed` list would still catch it, so this is redundant rather than blind. A static scan found no surface where a gate name appears only as an unrelated literal (embassy's `_endConfirm("embassy")` is on the gate's own path).
- chorus-audit's week of women includes the Orchid Room (Nune), whose women "aren't working the floor" and cannot be bought a drink. It is a slightly odd sample, but it still asked 10 women and found nothing hidden.
- modal-audit's `same()` compares only day, money, bank and gate. A non-answer that sets a flag or moves `G.happy` or an inventory item without touching money would pass. No gate was found that does this.
- gen-architecture's `definedIn`/`fieldExists` would accept a name that appears only in a comment. No current instance in architecture.md (checked with comments stripped).


