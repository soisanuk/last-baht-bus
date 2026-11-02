// THE ADVERSARIAL CODE REVIEW (2026-11-01), the money group: the money reconciles to the baht — the morning ledger
// names every movement across pocket, account and Nont's hold — plus the state-lifetime findings that move money
// (a job's pay, the condo's book, a manager's envelope, the day stamps a new trip must age).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const t = c => { out = []; doCommand(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; G.pendingEnc = null; };
const sandbox = (stage = "vacation") => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  if (stage !== "act1") { _setFlag("act1Done"); _setFlag("hasWallet"); }
  G.stage = stage; quiet(); G.money = 5000; G.bank = 20000;
};
const dice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
beforeEach(() => { newGame(); });

// the expat at the 51% fork, the four quests done: the next arrival at the Stinky is the deposit
const atTheFork = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 8;
  _goExpat();
  G.quests.plg_deal = "done"; _setFlag("plgResolved"); G.quests.bar_premises = "done"; _setFlag("barPremises");
  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned"); G.quests.bar_licence = "done"; _setFlag("barLicence");
  G.room = _npcRoom("tan"); G.nightTurn = 30; G.partnerWho = "tan"; G.pendingChoice = "partner"; _partnerYes(); G.quests.bar_partner = "done";
};
// an owner built the way tools/persona-seed.mjs's expatOwner is: the deposit, the key money, real stood nights
const owner = (day = 14, money = 14000, bank = 60000, before) => {
  atTheFork(); if (before) before();
  G.room = "stinky_bar"; G.bank = 200000; G.money = 5000; _barDeposit();
  if (G.bar.lease && !G.bar.lease.paid) _leaseTransfer();
  _setFlag("barOpen"); G.quests.bar_opening = "done";
  while (G.day < day) { G.room = "stinky_bar"; G.nightTurn = 12; _doWork(); G.bar.stoodTurns = WORK_MIN_STOOD; G.room = _hotelRoomId(); _endNight("sleep"); }
  G.money = money; G.bank = bank; G.room = _hotelRoomId(); G.nightTurn = 0; G.battery = 100;
  G.hunger = 10; G.thirst = 10; G.soc.drunk = 0; G.hurt = 0; G.pendingChoice = null;
  _setFlag("roomSafeOpened"); G.act1SafeDue = false; quiet();
  _setFlag("tanAsked"); _setFlag("tanFavourDone"); G.syn.lastAskDay = G.day;
  _nightSnapshot(); out = [];
};
const ledger = () => out.filter(l => /^Last night/.test(l)).join("\n");
const sleep = () => { G.room = G.hotel === "condo" ? "condo_room" : _hotelRoomId(); G.nightTurn = 100; out = []; doCommand("sleep"); doCommand("sleep"); };

test("S1-3: the bar's deposit and key money are named on the morning ledger and are not the night's spending, whichever balance paid", () => {
  for (const pocketPays of [false, true]) {
    atTheFork();
    G.bank = pocketPays ? 0 : 400000; G.money = pocketPays ? 400000 : 2000; G.room = "beach_rd_n"; G.nightTurn = 20; quiet();
    G.day = 10; _nightSnapshot();
    t("enter stinky pinky"); assert.ok(_flag("barPaid"), "the arrival paid the deposit");
    t("transfer key money"); assert.ok(G.bar.lease.paid);
    sleep();
    const l = ledger();
    assert.match(l, /฿120,000 deposit to the old man/, `pocket pays: ${pocketPays} — ${l}`);
    assert.match(l, /key money to the landlord/);
    const down = (l.match(/down ฿([\d,]+) on the night/) || [, "0"])[1].replace(/,/g, "");
    assert.ok(+down < 5000, `the purchase is not the night's spending: ${l}`);
  }
});

test("S1-4: the morning the landlord takes the bar, the pocket's top-up is still named and not called the night's spending", () => {
  // the same night twice on the same dice, once with the bar lost at the wake: the money lines must not differ
  const money = [];
  for (const lose of [false, true]) {
    owner(14, 3000, 0); G.rng = 424242;
    G.bar.lastMonthDay = G.day - 29; G.bar.cash = 0; G.bar.rentShort = lose ? RENT_GRACE - 1 : 0;
    sleep();
    assert.equal(_flag("barLost"), lose);
    money.push(ledger().replace(/[+-]\d+ สนุก · /, "").replace(/ — ฿[\d,]+ in the pocket now/, ""));
  }
  assert.match(money[0], /own money into the till/, "the seed must put the pocket into the till");
  assert.equal(money[1], money[0]);
});

test("S1-5: a laundering cost that finds empty pockets is named at what it took, not at the figure that never moved", () => {
  sandbox(); G.money = 150; G.bank = 0; G.day = 5; _nightSnapshot();
  G.launderRisk = [{ kind: "covers", due: 6 }];
  sleep();
  assert.equal(G.money + G.bank, 0);
  assert.doesNotMatch(ledger(), /฿1,500 to the station/, "the full figure was printed as paid");
  assert.match(ledger(), /฿150 to the station[^·]*฿1,500 asked/);
  G.money = 5000; G.bank = 0; assert.equal(_launderPay(1500), 1500); assert.equal(G.money, 3500);
});

test("S1-6: the count at close is the drawer's verdict — a shift that lapses after it does not find a short the count did not", () => {
  owner(14, 3000, 0);
  const b = G.bar; let d = G.day;
  // a night the stood rate finds clean and the away rate finds short
  for (let k = 0; k < 400; k++, d++) { b.workedLast = true; b.workedDay = d; const a = _tillShort(d); b.workedLast = false; const u = _tillShort(d); if (!a && u) break; }
  G.day = d; b.lastMonthDay = d; G.syn.lastAskDay = d; b.workedLast = true; b.workedDay = d;
  G.room = "stinky_bar"; G.nightTurn = 70;
  assert.match(t("count the till"), /agrees to the baht/);
  b.workedLast = false;   // the shift lapses after the count
  assert.equal(_tillShort(d), null, "the settle re-read the night at the away rate");
  sleep();
  assert.ok(!b.lastShort || !b.lastShort.amt, `BOOKS found a short the count did not: ${JSON.stringify(b.lastShort)}`);
});

test("S1-7: COUNT THE TILL in the night's last turns says the count before the dawn, at the bar", () => {
  owner(14, 3000, 0); G.room = "stinky_bar"; G.nightTurn = NIGHT_TURNS - 2;
  const txt = t("count the till");
  const iCount = txt.search(/count the drawer|Short ฿/), iDay = txt.search(/── DAY/);
  assert.ok(iCount >= 0, "the count was said");
  assert.ok(iDay < 0 || iCount < iDay, "the count printed after the next morning");
});

test("S1-8 / S4-10: a quest reward handed over in person is named on the morning ledger", () => {
  sandbox(); G.money = 2000; G.bank = 5000; G.day = 3; G.room = _npcRoom("candy"); G.nightTurn = 30; _nightSnapshot();
  G.quests.recce = "active"; _setFlag("recceDone");
  assert.match(t("wait"), /\+฿300 from Candy/);
  sleep();
  assert.match(ledger(), /฿300 paid to you for a job/, ledger());
});

test("S1-8: a refund handed back (the mamasan's barfine, the desk's recovery) is named on the morning ledger", () => {
  sandbox(); G.money = 2000; G.bank = 0; G.day = 3; G.room = "police_station"; G.nightTurn = 30; _nightSnapshot();
  G.tonicOwed = 3000;
  t("report the tonic shop");
  assert.ok(G.refundIn > 0, "the refund was booked");
  sleep();
  assert.match(ledger(), new RegExp(`฿${_num(G.refundIn)} handed back to you as a refund`), ledger());
});

test("S1-9: the accountant hired with the bar does not ring about money cashed through Nont before it was bought", () => {
  owner(14, 3000, 60000, () => { G.nontOut = 71250; });
  assert.equal(G.acctBase, 71250, "the deposit set the accountant's baseline");
  const cap = _atmCap();
  G.room = "stinky_bar"; G.nightTurn = 24; t("wait");
  assert.doesNotMatch(said(), /Khun Wipa/);
  assert.equal(_atmCap(), cap);
  // and her call does not shorten a longer review already running
  G.acctUntil = G.day + 60; G.acctWhy = "presale"; G.nontOut += ACCT_THRESHOLD; out = []; _acctCall();
  assert.equal(G.acctUntil, G.day + 60);
});

test("S1-10: DRAW and PUT IN TILL read the amount typed — half, 1.5k — and ask when they cannot", () => {
  owner(14, 1000, 0); G.room = "stinky_bar"; G.nightTurn = 30;
  G.bar.cash = 20000; t("draw half"); assert.equal(G.bar.cash, 10000);
  G.bar.cash = 20000; G.money = 1000; t("draw 1.5k"); assert.equal(G.bar.cash, 18500); assert.equal(G.money, 2500);
  G.bar.cash = 20000; G.money = 1000; assert.match(t("draw some"), /How much\?/); assert.equal(G.bar.cash, 20000);
  G.money = 3000; t("put 1.5k in till"); assert.equal(G.bar.cash, 21500); assert.equal(G.money, 1500);
  t("draw"); assert.equal(G.bar.cash, 0, "a bare DRAW is still the whole drawer");
});

const expat = (money = 0) => { sandbox(); _goExpat(); G.money = money; G.bank = 0; out = []; };

test("S2-4: QUIT JOB after a payday pays the days since that payday, never a whole month again", () => {
  expat(); G.payDay = G.day; G.room = _hotelRoomId(); t("teach online");
  G.day = G.payDay + 29; sleep();
  assert.ok(G.job.firstPaid, "the first payday has been");
  const b0 = G.bank; t("quit job");
  assert.equal(G.bank - b0, 0, "quitting on the evening of a payday paid a month for no mornings");
  // ten mornings on, a third of the month
  expat(); G.payDay = G.day; G.room = _hotelRoomId(); t("teach online"); G.day = G.payDay + 29; sleep();
  G.day = G.payDay + 10; const b1 = G.bank; t("quit job");
  assert.ok(G.bank - b1 > 0 && G.bank - b1 <= Math.round(TEACH_PAY / 3 / 100) * 100 + 100, `paid ${G.bank - b1}`);
});

test("S2-5: a cash manager's envelope left at the bar adds the next payday's to it; it is never overwritten", () => {
  expat();
  G.job = { kind: "manager", room: "candy_bar", corp: false, prem: false, nights: MGR_CASH_NIGHTS, stood: 16, weekStood: 0, weekStart: G.day, strikes: 0, since: G.day, shiftDay: null, shiftStood: 0 };
  G.payDay = G.day; G.day = G.payDay + 29; sleep();
  const first = G.envelopeDue.amt; assert.ok(first > 0);
  G.job.stood = 16; G.day = G.payDay + 29; sleep();
  assert.equal(G.envelopeDue.amt, first * 2, "the first month's envelope vanished");
  assert.equal(G.envelopeDue.nights, 32);
});

test("S2-6: a short first condo month owes what was due (the electric), not a month of rent; the ledger labels by what moved", () => {
  expat(); G.day = 20; G.payDay = 0; G.room = "pratumnak_soi5"; G.money = CONDO_RENT * 3; G.bank = 0;
  t("rent a condo"); t("rent a condo"); assert.equal(G.hotel, "condo");
  G.day = 29; sleep();
  assert.equal(G.condo.short, 1);
  G.day = 59; G.bank = 100000; G.money = 0; const b0 = G.bank, paper = (PAPER_COST[_paper()] || 0) + (G.paperShort || 0); sleep();
  assert.equal(b0 - G.bank - paper, CONDO_RENT + 2 * CONDO_UTIL, "the short month was collected as a month of rent");
  assert.doesNotMatch(ledger(), /the deposit, held/, "a payday labelled the deposit by its size");
});

test("S2-7: the visa agent's unpaid fee is a debt MONEY names, and the next payday collects it", () => {
  expat(); G.payDay = G.day - 29; sleep();
  const owed = G.paperShort; assert.ok(owed > 0);
  assert.ok(_debtsOwed() >= owed); assert.match(_debtsLine(), /visa agent/);
  G.bank = 50000; G.payDay = G.day - 29; const b0 = G.bank, pc = PAPER_COST[_paper()] || 0; sleep();
  assert.equal(G.paperShort, 0); assert.ok(b0 - G.bank >= pc + owed);
  assert.match(said(), new RegExp(`the ฿${_num(owed)} he had noted from before, collected`));
});

test("S2-8: the visit's last night is put away — the room billed at checkout, the next visit opens clean", () => {
  sandbox(); G.money = 5000; G.stage = "expat"; G.payDay = G.day; _gameEnd("sold"); t("visit pattaya");
  G.day = G.visitUntil - 1;
  G.soc.banned = { stinky_bar: true }; G.soc.heat = { stinky_bar: 9 }; G.soc.lockIn = { x: true }; G.soc.drinkCount = { lek: 3 }; G.soc.drunk = 6; G.soc.helloed = { lek: 1 };
  const m0 = G.money; sleep();
  assert.equal(G.pendingChoice, "gameend");
  assert.ok(G.money < m0, "the last night's room was never billed");
  assert.match(said(), /on the way to the bus/);
  t("visit pattaya");
  assert.deepEqual([G.soc.banned, G.soc.heat, G.soc.lockIn, G.soc.drinkCount, G.soc.drunk, G.soc.helloed], [{}, {}, {}, {}, 0, {}]);
});

test("S2-9: every { day } record ages across a trip — the league night is not 'already played' a month later, the dog is a trip ago", () => {
  sandbox(); const pool = Object.keys(ROOMS).find(r => ROOMS[r].pool && ROOMS[r].region !== "Darkside");
  G.day = 6; G.room = pool; G.nightTurn = 30; t("play killer"); assert.ok(G.lastKp && G.lastKp.day === 6);
  G.game = null; G.dog = { since: 6 }; _setFlag("hasDog");
  G.rivalLog = { lek: { day: 6 } }; G.bfNo = [{ day: 6 }]; G.phone.jokeDay = 6;
  G.day = 7; sleep(); t("new vacation"); assert.equal(G.day, 1);
  for (const [what, d] of [["lastKp", G.lastKp.day], ["dog", G.dog.since], ["a map's record", G.rivalLog.lek.day], ["a list's record", G.bfNo[0].day], ["the phone's stamp", G.phone.jokeDay]])
    assert.ok(d < 1, `${what} still on the old trip's count: ${d}`);
  G.day = 6; G.room = pool; G.nightTurn = 30; G.money = 5000;
  assert.doesNotMatch(t("play killer"), /played for tonight/);
  G.game = null; G.room = _hotelRoomId(); G.lightOn = true;
  assert.doesNotMatch(t("examine dog"), /on day -?\d/);
});
