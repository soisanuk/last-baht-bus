// Round 40 — Vic (the venues nobody writes up), Piotr (in nont.test.js), Keith (the owner in low season).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

test("the name the room prints is the name ENTER takes — hyphens and all (Vic)", () => {
  G.room = "beach_rd_c"; G.visited.tequila_queen = true;
  run("enter tequila queen a go-go"); assert.equal(G.room, "tequila_queen");
  G.room = "beach_rd_c"; run("enter tequila queen a-go-go"); assert.equal(G.room, "tequila_queen");
});

test("every regular has a night that is his, whatever the season — and Tan names it (Vic)", () => {
  G.season0 = 8;   // September, deep low
  for (const id of Object.keys(NPCS).filter(i => NPCS[i].patron)) {
    const inNights = [2, 3, 4, 5, 6, 7, 8].filter(d => { G.day = d; return !_benchOut(id); }).length;
    assert.ok(inNights >= 1, `${id} sits his bench at least once a week`);
    G.day = 2 + ((_anchorNight(id) - 2 + 7) % 7); assert.equal(_benchOut(id), false, `${id} on his night`);
  }
  G.day = 2 + ((_anchorNight("randy") - 2 + 7) % 7); G.nightTurn = 50;
  G.room = "soi6_street"; G.known.randy = true; out = []; run("ask tan about randy");
  assert.match(text(), new RegExp(_ANCHOR_NAMES[_anchorNight("randy")] + ", always"));
});

test("TRAVEL through the dark with the torch off says so first (Vic)", () => {
  G.room = "buakhao_pt"; G.visited.khao_talo_bar = true; G.lightOn = false; G.hunger = 0; G.thirst = 0;
  const saved = _rand; _rand = () => 0.99;
  try { run("travel daeng's place"); } finally { _rand = saved; }
  assert.match(text(), /The way runs through the dark\. LIGHT ON first/);
});

test("staff talk about the people they work with, the room, and the wallet (Vic / Trevor)", () => {
  G.room = "lucky_tiger"; run("ask ratana about lek");
  assert.match(text(), /Good girl|different version/); assert.doesNotMatch(text(), /Not my story|don't know/);
  out = []; run("ask lek about ratana"); assert.match(text(), /Strict\. Fair/);
  G.nightTurn = 50; G.room = "lucky_tiger"; const cashier = _npcsHere().find(i => NPC_ROLES[i] === "cashier");
  out = []; run(`ask ${NPCS[cashier].name.toLowerCase()} about lucky tiger`); assert.match(text(), /Comes in here, goes out there/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; G.stage = "act1"; G.nightTurn = 50; G.room = "doghouse"; out = [];
  run("ask bill about wallet"); assert.match(text(), /Everybody's problem goes to Candy/);
});

// ── Keith: the publican who bought in September ──────────────────────────────
function ownsBar() {
  G.stage = "expat"; _setFlag("expatLife");
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", "partnerCandy", "barOpen"]) _setFlag(f);
  G.bar.cash = 5000; G.nightTurn = 35; G.room = "stinky_bar"; G.hunger = 0; G.thirst = 0;
}
const stub = (fn) => { const saved = _rand; _rand = () => 0.5; try { fn(); } finally { _rand = saved; } };

test("the presence line is about TONIGHT — a night slept through in the hotel prints nothing (Keith)", () => {
  ownsBar(); G.soc.barTurns = { stinky_bar: 40 };
  stub(() => { G.room = "hotel_room"; run("sleep"); });
  assert.match(text(), /same stool/);
  out = []; G.nightTurn = 0; G.room = "hotel_room";
  stub(() => run("sleep"));
  assert.doesNotMatch(text(), /same stool/, "the count was never cleared");
});

test("the expat wire is not 'up ฿19,275 on the night', and 'already carrying' is the pre-wire figure (Keith)", () => {
  G.day = 8; G.money = 81235; G.happy = 30; _nightSnapshot();
  G.money = 81235; G.pendingChoice = "vacation_end"; G.stage = "vacation";
  stub(() => _goExpat());
  assert.match(text(), /already carrying — ฿81,235/);
  out = []; _morningLedger();
  assert.doesNotMatch(text(), /up ฿19,|up ฿20,/);
});

test("WORK declared and slept on settles as Bert's night (Keith)", () => {
  ownsBar(); stub(() => run("work")); assert.equal(G.bar.workedLast, true);
  G.room = "hotel_room"; out = [];
  stub(() => run("sleep"));
  assert.match(text(), /Bert ran it/); assert.match(text(), /put your name on the shift/);
  assert.equal(G.bar.lastLines.declaredOnly, true);
  // …and a stood shift still counts
  ownsBar(); stub(() => run("work")); for (let i = 0; i < WORK_MIN_STOOD + 1; i++) stub(() => { run("wait"); if (G.pendingChoice) run("no"); });
  out = []; stub(() => _endNight("sleep"));
  assert.match(text(), /you worked it/);
});

test("BOOKS itemises the night and tallies the shifts; TAKE 300 FROM TILL is DRAW at your own bar (Keith)", () => {
  ownsBar(); stub(() => _barSettle(G.day));
  out = []; run("books");
  assert.match(text(), /Last night: ฿\d+ in.*nut ฿\d+ · stock ฿\d+ · wages ฿\d+ · Bert ฿\d+/);
  assert.match(text(), /Nights stood: \d+ of \d+/); assert.match(text(), /every thirty days/); assert.match(text(), /DRAW <amount>/);
  const m0 = G.money, c0 = G.bar.cash; out = []; run("take 300 from till");
  assert.equal(G.money, m0 + 300); assert.equal(G.bar.cash, c0 - 300); assert.doesNotMatch(text(), /fixtures, not luggage/);
});

test("the piwin's power bank is a pitch — a direction typed into it passes through (Keith)", () => {
  G.room = "beach_rd_c"; G.battery = 10; _startEnc("powerbank"); const room = G.room;
  out = []; stub(() => run("n"));
  assert.notEqual(G.room, room, "the move happened"); assert.equal(G.battery, 10, "the offer was neither taken nor spent");
});

test("G.bar.room is set by newGame, so _atOwnBar can be true in play — not only in tests that set it by hand (Keith)", () => {
  assert.equal(G.bar.room, "stinky_bar"); ownsBar(); assert.equal(_atOwnBar(), true);
  G.room = "candy_bar"; assert.equal(_atOwnBar(), false);
});

test("a lady drink on Kesinee's rail warms Kesinee — the first of the three things she asked for (Keith)", () => {
  G.room = "kitten_corner"; const t0 = _npcState("kesinee").trust;
  run("buy praewa a drink"); assert.equal(_npcState("kesinee").trust, t0 + 1);
  run("buy praewa a drink"); assert.equal(_npcState("kesinee").trust, t0 + 1, "once a night");
});

test("Bert names the wet before the money moves, and the calendar makes no three-week claim (Keith)", () => {
  G.stage = "expat"; _setFlag("expatLife"); G.season0 = 8; G.day = 9; G.room = "stinky_bar"; G.money = 130000;
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerCandy"]) _setFlag(f);
  out = []; _barDeposit();
  assert.match(text(), /buying in the wet/); assert.match(text(), /every thirty days/);
  assert.doesNotMatch(readFileSync(join(here, "../../web/js/engine-systems.js"), "utf8"), /lawyer takes three weeks/);
});

test("the Candy route says out loud whose side of the paper supply sits on (Keith / Mario)", () => {
  ownsBar(); out = []; run("books");
  assert.match(text(), /Candy's side of the paper/);
  G.day = 2; G.room = "candy_bar"; out = []; run("ask candy about supply");
  assert.match(text(), /Not your side|my ice man/);
  out = []; run("ask candy about cleaning"); assert.match(text(), /Supply is my side|my ice man|Not your side/);
});

// ── the seat: soft drinks cost the beer, and the house's patience ────────────
test("in a bar, water and a soda cost the beer — you are paying for the seat (Mario)", () => {
  G.room = "candy_bar"; G.money = 5000; const p = _beerPrice();
  run("buy water"); assert.equal(G.money, 5000 - p);
  out = []; run("buy coke"); assert.equal(G.money, 5000 - 2 * p); assert.ok(_SOFT_LINES.some(l => text().includes(l.slice(0, 30))));
  out = []; run("why so expensive"); assert.ok(_SEAT_LINES.some(l => text().includes(l.slice(0, 25))), text());
  out = []; run("tao rai"); assert.match(text(), new RegExp(`water or soda ฿${p}`));
  G.room = "beach_rd_c"; G.money = 5000; run("buy water"); assert.equal(G.money, 4990, "the shop sells the bottle");
});

test("WAIT in a go-go stops at twenty minutes, in a bar at an hour; a bought drink resets it; your own bar and your room never nag (Mario)", () => {
  const saved = _rand; _rand = () => 0.99;
  try {
    G.room = "tequila_queen"; G.money = 5000; G.nightTurn = 30; doCommand("look"); const t0 = G.nightTurn;
    out = []; run("wait until midnight");
    assert.ok(G.nightTurn - t0 <= HOUSE_PATIENCE.gogo + 1, `stopped at ${G.nightTurn - t0} turns`);
    assert.ok(_NURSE_GOGO.some(l => text().includes(l.slice(l.indexOf("}") + 1, l.indexOf("}") + 25))), text());
    run("buy beer"); out = []; const t1 = G.nightTurn; run("wait 2"); assert.doesNotMatch(text(), /at your elbow|Same again|Lonely\?|drink nothing/);
    G.room = "candy_bar"; doCommand("look"); const t2 = G.nightTurn; out = []; run("wait until midnight");
    assert.ok(G.nightTurn - t2 >= HOUSE_PATIENCE.bar - 1 && G.nightTurn - t2 <= HOUSE_PATIENCE.bar + 1, `bar stopped at ${G.nightTurn - t2}`);
    assert.match(text(), /house wants a drink bought/);
    G.room = "hotel_room"; const t3 = G.nightTurn; out = []; run("wait 12"); assert.ok(G.nightTurn - t3 >= 12);
    ownsBar(); doCommand("look"); const t4 = G.nightTurn; out = []; run("wait 12"); assert.ok(G.nightTurn - t4 >= 12, "your own rail is yours to sit at");
  } finally { _rand = saved; }
});

test("the deposit clears by transfer from the account, the pocket topping up — never through the ATM (Mario)", () => {
  const setup = () => { newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; _setFlag("act1Done"); G.stage = "expat"; _setFlag("expatLife");
    for (const f of ["barPremises", "barLicence", "barPartner", "partnerCandy"]) _setFlag(f); G.room = "stinky_bar"; out = []; };
  setup(); G.money = 3000; G.bank = 120000; _barDeposit();
  assert.ok(_flag("barPaid")); assert.equal(G.bank, 0); assert.equal(G.money, 3000, "the pocket was not touched");
  assert.match(text(), /account number off the docket/); assert.doesNotMatch(text(), /bar towel/);
  setup(); G.money = 30000; G.bank = 100000; _barDeposit();
  assert.ok(_flag("barPaid")); assert.equal(G.bank, 0); assert.equal(G.money, 10000); assert.equal(G.bar.pocketDrawn, 20000);
  assert.match(text(), /฿20,000 light of it|฿20000 light of it/);
  setup(); G.money = 5000; G.bank = 100000; _barDeposit();
  assert.ok(!_flag("barPaid")); assert.match(text(), /฿15,000 short|฿15000 short/); assert.match(text(), /pocket and account together/);
});

// ── the lease: the landlord's money, the season he asks in, and the resident's bank ──
const buyer = () => { newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; _setFlag("act1Done"); G.stage = "expat"; _setFlag("expatLife");
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerCandy"]) _setFlag(f); G.room = "stinky_bar"; G.money = 30000; G.bank = 150000; out = []; };

test("expat mode opens a Thai account: no card fee, a resident's counter limit (Mario)", () => {
  G.day = 8; G.pendingChoice = "vacation_end"; G.stage = "vacation"; G.bank = 100000;
  const saved = _rand; _rand = () => 0.5; try { _goExpat(); } finally { _rand = saved; }
  assert.equal(G.thaiAccount, true); assert.match(text(), /Thai account in your own name/);
  assert.equal(_atmFee(), 0); assert.equal(_atmCap(), THAI_ATM_CAP);
  G.room = "beach_rd_c"; G.money = 0; out = []; run("withdraw 30000");
  assert.equal(G.money, 30000); assert.equal(G.bank, 100000 - 30000, "no fee left the account"); assert.match(text(), /your own bank, no fee/);
});

test("signing in the wet: a rent-free month and a steep cash discount, and PAY KEY MONEY takes notes (Mario)", () => {
  buyer(); G.season0 = 8; G.day = 9;   // September, deep low
  _barDeposit();
  const l = G.bar.lease; assert.ok(l && !l.paid); assert.equal(l.off, LEASE_CASH_OFF.deeplow); assert.equal(l.cash, 9800); assert.equal(l.key, _barRent());
  assert.match(text(), /first month's rent is off/); assert.match(text(), /35% off/); assert.equal(G.bar.rentFree, 1);
  assert.equal(G.pendingChoice, null, "stated, not asked — the verbs decide");
  const m0 = G.money; out = []; run("pay key money");
  assert.equal(G.money, m0 - 9800); assert.equal(l.how, "cash"); assert.match(text(), /Nobody writes anything down/);
  out = []; run("books"); assert.match(text(), /Key money: ฿9,?800 paid, in notes/); assert.match(text(), /First month's rent: off/);
  G.bar.cash = 60000; G.bar.lastMonthDay = G.day - 30; out = []; const m = _barMonthly();
  assert.equal(m.waived, true); assert.equal(m.rent, 0); assert.equal(G.bar.rentOwed, 0); assert.equal(G.bar.cash, 60000 - BAR_MONTHLY, "only the old man this month");
  G.bar.lastMonthDay = G.day - 30; const m2 = _barMonthly(); assert.equal(m2.waived, false); assert.equal(m2.rent, _barRent(), "the second month bills");
});

test("signing at peak: no discount, and LATER means the full figure rides on the first rent (Mario)", () => {
  buyer(); G.season0 = 11; G.day = 9;   // December
  _barDeposit(); const l = G.bar.lease; assert.equal(l.off, 0); assert.equal(l.cash, l.key); assert.match(text(), /queue for the room/);
  assert.ok(!G.bar.rentFree);
  G.bar.cash = 100000; G.bar.lastMonthDay = G.day - 30; const m = _barMonthly();
  assert.equal(m.keyBilled, l.key); assert.equal(l.how, "billed"); assert.equal(m.rentPaid, _barRent() + l.key);
  out = []; run("pay key money"); assert.match(text(), /at list/);
});

test("TRANSFER KEY MONEY pays the list price from the account; short of notes, PAY KEY MONEY says how to get them (Mario)", () => {
  buyer(); G.season0 = 10; G.day = 9;   // November, high: 10% off for notes
  _barDeposit(); const l = G.bar.lease; assert.equal(l.cash, 13500);
  G.money = 2000; G.bar.cash = 1000; out = []; run("pay key money");
  assert.ok(!l.paid); assert.match(text(), /whoever you know who turns bank into cash/);
  const b0 = G.bank; out = []; run("transfer key money");
  assert.equal(l.how, "transfer"); assert.equal(G.bank, b0 - l.key); assert.match(text(), /You paid for the paper/);
});
