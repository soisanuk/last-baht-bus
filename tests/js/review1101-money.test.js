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
  owner(14, 3000, 0);
  G.bar.lastMonthDay = G.day - 29; G.bar.cash = 0; G.bar.rentShort = RENT_GRACE - 1;
  sleep();
  assert.ok(_flag("barLost"), "the bar was lost at the wake");
  const topUp = said().match(/The till didn't cover it\. ฿([\d,]+) of your own money/);
  assert.ok(topUp, "the till went under and the pocket topped it up");
  assert.match(ledger(), new RegExp(`฿${topUp[1]} of your own money into the till`), ledger());
  assert.doesNotMatch(ledger(), /down ฿[\d,]{5,} on the night/);
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
