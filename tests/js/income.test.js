// THE MONTH (Mario, 2026-10-20, the first step of the expat economy): each origin lives on something once the
// holiday is over — a pension, a salary, a retainer, or a pot — landing every INCOME_DAYS in the expat stage
// through the ACCOUNT (so the morning ledger counts and names it), with a month line that says what the month
// cost and how many nights a week the money is. The Soi 6 week's stake is the origin's too. No dice in any of it.
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
const run = c => doCommand(c);
const t = c => { out = []; run(c); return said(); };
const expat = (origin) => {
  newGame(); G.player = { origin, personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.stage = "expat"; _setFlag("expatLife"); G.paper = _originMoney(origin).paper || "tourist"; G.thaiAccount = G.paper !== "tourist"; G.hotel = "sabai"; G.room = "hotel_room";
  G.money = 3000; G.bank = 50000; G.day = 10; G.payDay = 10; G.payCount = 0; G.month = { spent: 0, rent: 0, rough: 0, days: 0 }; G.nightTurn = 30; out = [];
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };   // the night-ending choice asks once

beforeEach(() => { newGame(); });

test("every origin has a row, and the Soi 6 week's stake is the origin's", () => {
  for (const o of ORIGINS) { const m = ORIGIN_MONEY[o.id]; assert.ok(m, o.id); assert.ok(m.bank > 0 && m.income >= 0 && ["pot", "pension", "salary", "retainer"].includes(m.kind), o.id); assert.ok(m.what); }
  assert.ok(ORIGIN_MONEY.pension.income > 0 && ORIGIN_MONEY.redundancy.income === 0 && ORIGIN_MONEY.redundancy.bank > ORIGIN_MONEY.running.bank);
  for (const o of ["pension", "running", "business"]) {
    newGame(); startSoi6Mode(); G.player = { origin: o, personality: "straight", orientation: "straight", said: {}, lang: "en" };
    run("1"); run("3"); run("1"); G.player.origin = o;   // the intro's picks are the chips; the origin is set here for the test
    _soi6Setup(); assert.equal(G.bank, ORIGIN_MONEY[o].bank, o);
  }
});

test("the pension lands every thirty days in the expat stage, through the account, named on the ledger, with the month line — and never on a holiday", () => {
  expat("pension"); G.day = 38;
  assert.ok(!_incomeDue(), "day 28 of the month: not yet");
  sleep(); assert.equal(G.day, 39); assert.ok(!/state pension/.test(said()), "wakes on day 29: nothing yet");
  const before = G.bank; const s = sleep(); assert.equal(G.day, 40);
  assert.ok(G.bank >= before + ORIGIN_MONEY.pension.income - _hotelRate(G.hotel) - PAPER_COST.longstay, "the pension arrived in the account (the room and the agent may come off it)");
  assert.match(s, /arrived in the account — the state pension/); assert.match(s, /The month, to last night's close: .*the state pension landed, ฿42,000.*nights out a week/);
  assert.equal(G.payDay, 40); assert.equal(G.payCount, 1); assert.ok(G.month.rough === 0 && G.month.days === 1 && G.month.rent === 0, "the month's book resets, and the payday night opens the new one: " + JSON.stringify(G.month));
  assert.ok(G.lastNightSaid.some(l => /^The month/.test(l)), "LAST NIGHT keeps the month line");
  const b1 = G.bank; sleep(); assert.ok(G.bank < b1 + 1000, "not twice");
  // a holiday has no payday
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet");
  G.stage = "vacation"; G.payDay = 1; G.day = 40; assert.ok(!_incomeDue());
});

test("the salary from home stops after its months; the nomad's retainer shrinks with rough mornings; a pot gets a countdown", () => {
  expat("married"); G.payCount = ORIGIN_MONEY.married.months; assert.equal(_incomeAmount(), 0);
  G.day = 40; const s = sleep(); assert.match(s, /did not land this time — somebody at home noticed/);
  expat("nomad"); G.month.rough = 3; assert.equal(_incomeAmount(), Math.round(ORIGIN_MONEY.nomad.income * 0.7 / 100) * 100);
  G.month.rough = 20; assert.equal(_incomeAmount(), Math.round(ORIGIN_MONEY.nomad.income * 0.4 / 100) * 100, "floored at forty percent");
  G.month.rough = 2; G.day = 40; const r = sleep(); assert.match(r, /the retainer landed, ฿44,000 \(short — the client counted 2 rough mornings\)/);
  expat("redundancy"); G.day = 40; const p = sleep(); assert.match(p, /No payday — the redundancy cheque is what there is/); assert.match(p, /about \d+ weeks at this rate/);
  assert.doesNotMatch(p, /arrived in the account/);
});

test("a rough morning is counted on the month's book; the room goes on it; the night's spend goes on it", () => {
  expat("nomad"); G.room = "beach_rd_c"; G.soc.drunk = 4; G.nightTurn = 118; out = []; run("wait 3"); if (G.day === 10) _endNight("dawn");
  assert.ok(G.month.rough >= 1, "a heavy morning counts: " + JSON.stringify(G.month));
  expat("pension"); G.money = 3000; sleep(); assert.equal(G.month.rent, _hotelRate("sabai"));
  sleep(); assert.equal(G.month.rent, 2 * _hotelRate("sabai")); assert.ok(G.month.days === 1 && G.month.spent >= _hotelRate("sabai"), "the second morning has a baseline: " + JSON.stringify(G.month));
});

test("MONEY says where you stand, on every surface", () => {
  expat("pension"); G.day = 20;
  const a = t("money"); assert.match(a, /The state pension: ฿42,000 a month, next in 20 days/); assert.match(a, /nights out a week/); assert.match(a, /This month so far/);
  expat("redundancy"); assert.match(t("budget"), /No payday — the redundancy cheque is what there is/);
  expat("married"); G.payCount = 3; assert.match(t("income"), /has stopped/);
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1"); G.nightTurn = 30; assert.match(t("budget"), /A holiday has no payday/); assert.match(t("money"), /in your pocket/);
  assert.ok(_COMPLETE_VERBS.includes("money")); assert.match(_HELP, /MONEY \(what you live on/);
});

test("the expat opening names what you live on; nothing in the month rolls dice", () => {
  for (const [o, rx] of [["pension", /The state pension lands every thirty days — ฿42,000/], ["nomad", /The retainer is ฿55,000 a month/], ["married", /for as long as nobody at home notices/], ["monger", /No payday\. Twenty years of savings is what there is/]]) {
    newGame(); G.player = { origin: o, personality: "straight", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.day = 8; G.pendingChoice = "vacation_end"; G.room = "hotel_room";
    out = []; run("move to pattaya"); assert.match(said(), rx, o); assert.equal(G.payDay, G.day); assert.ok(G.month);
  }
  expat("pension"); G.day = 40; const rng = G.rng; _incomeTick(); assert.equal(G.rng, rng, "no dice");
});
