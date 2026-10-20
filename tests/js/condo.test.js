// THE CONDO (Mario, 2026-10-20, the expat economy's fourth step): a roof by the month — the lease at the office on
// Pratumnak Soi 5 (two months' deposit and one in advance), rent and the electric on the payday's clock, the landlord's
// short fuse (two months short and the bag is at the Sabai, the deposit his), no joiner fee (the office has a word
// about overnight guests, once), a kitchen, a pool; moving out inside the lease forfeits the deposit.
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
const moveIn = (origin) => {
  newGame(); G.player = { origin, personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.stage = "vacation"; G.day = 8; G.pendingChoice = "vacation_end"; G.room = "hotel_room"; G.money = 3000; G.bank = 50000; out = [];
  run("move to pattaya"); G.nightTurn = 30; out = [];
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };
const need = CONDO_RENT * CONDO_DEPOSIT_MONTHS + CONDO_RENT;

beforeEach(() => { newGame(); });

test("the lease: at the office on Pratumnak Soi 5, in the expat stage, for the deposit and the first month; the lift is a tenant's", () => {
  moveIn("pension"); G.room = "pratumnak_soi5";
  assert.match(t("examine tower"), /Rooms by the month/); assert.match(t("in"), /office on the ground floor/); assert.equal(G.room, "pratumnak_soi5");
  G.bank = 10000; G.money = 1000; assert.match(t("rent a condo"), /฿27,000, and you have ฿11,000/); assert.equal(G.hotel, "sabai");
  G.bank = 50000; const b = G.bank; assert.match(t("rent a condo"), /key card for the ninth floor/);
  assert.equal(G.hotel, "condo"); assert.equal(G.room, "condo_room"); assert.equal(G.bank, b - need); assert.ok(G.condo && G.condo.deposit === CONDO_RENT * 2);
  assert.match(said(), /Your Condo — Pratumnak/); assert.match(t("examine kitchen"), /COOK/); assert.match(t("examine balcony"), /the bay/);
  assert.match(t("money"), /the condo is ฿11,000 a month with the electric/i); assert.match(said(), /paid up/);
  // a holiday has a hotel
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.room = "pratumnak_soi5"; G.nightTurn = 30;
  assert.match(t("rent a condo"), /residents/); assert.match(t("in"), /A holiday has a hotel/);
});

test("no folio under the door; the rent and the electric on the payday; short twice and the lock changes, the deposit the landlord's", () => {
  moveIn("monger"); G.room = "pratumnak_soi5"; G.bank = 60000; run("rent a condo"); const b0 = G.bank; G.money = 3000;
  sleep(); assert.equal(G.bank, b0, "nothing under the door"); assert.equal(G.money, 3000); assert.doesNotMatch(said(), /folio/);
  G.day = G.payDay + 30; sleep(); assert.match(said(), /The condo: ฿9,000 rent and ฿2,000 electric/); assert.ok(G.bank <= b0 - CONDO_RENT - CONDO_UTIL);
  G.bank = 0; G.money = 500; G.day = G.payDay + 30; sleep(); assert.match(said(), /one month\. A second and the lock changes/); assert.equal(G.condo.short, 1); assert.equal(G.hotel, "condo");
  assert.match(t("money"), /1 month short/);
  G.day = G.payDay + 30; sleep(); assert.match(said(), /changes the lock/); assert.equal(G.hotel, "sabai"); assert.equal(G.condo, null); assert.equal(G.room, "hotel_room");
});

test("a guest costs no fee — the office has a word, once; the kitchen feeds you for sixty baht; the pool is yours", () => {
  moveIn("pension"); G.room = "pratumnak_soi5"; G.bank = 60000; run("rent a condo"); G.money = 2000;
  const m = G.money; _joinerFee(); assert.equal(G.money, m, "no joiner fee"); assert.ok(G.condo.guestPending);
  sleep(); assert.match(said(), /sign about overnight guests/); assert.ok(G.condo.guestsTold); _joinerFee(); sleep(); assert.doesNotMatch(said(), /sign about overnight guests/, "once");
  G.hunger = 80; const m2 = G.money; assert.match(t("cook"), /฿60/); assert.equal(G.money, m2 - CONDO_MEAL); assert.ok(G.hunger <= 30);
  G.hunger = 80; t("eat"); assert.ok(G.hunger <= 30, "EAT in your kitchen is the same plate");
  assert.match(t("swim"), /pool|lengths|water/i);
  assert.ok(_COMPLETE_VERBS.includes("rent a condo") && _COMPLETE_VERBS.includes("move out") && _COMPLETE_VERBS.includes("cook")); assert.match(_HELP, /RENT A CONDO/);
});

test("moving out inside the lease forfeits the deposit; after it the office hands it back; the checkout list never offers the condo", () => {
  moveIn("pension"); G.room = "pratumnak_soi5"; G.bank = 60000; run("rent a condo"); const dep = G.condo.deposit;
  const b = G.bank; assert.match(t("move out"), /keeps the ฿18,000 deposit/); assert.equal(G.bank, b); assert.equal(G.hotel, "sabai");
  G.room = "pratumnak_soi5"; run("rent a condo"); G.condo.since = G.day - CONDO_LEASE; const b2 = G.bank; assert.match(t("move out"), /lands back in the account/); assert.equal(G.bank, b2 + dep);
  G.room = "hotel_room"; G.nightTurn = 2; out = []; run("checkout"); assert.doesNotMatch(said(), /condo/i); run("stay");
  assert.match(t("move out"), /no lease to give back/);
});
