// ROUND 97 (2026-10-20) — the expat economy's first persona: Victor (Opus, payday-ledger: a pensioner who kept a book of
// every baht through two paydays, the condo and the school — "the money balances; what doesn't is the paperwork around
// it"). The ledger reconciled to the baht; the defects were the sentences, the terms shown after the money, and a town
// that would not discuss a visa.
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
const jerryDay = () => { G.room = "stinky_bar"; let n = 0; while (!_npcsHere().includes("david") && n++ < 60) G.day++; };

beforeEach(() => { newGame(); });

test("SEVERE: no 'undefined' in a sentence about a job that is not a bar — the school and the platform have names", () => {
  moveIn("pension"); jerryDay(); run("talk to jerry"); run("ask jerry about a job"); run("take the job"); G.paper = "permit";
  assert.doesNotMatch(t("money"), /undefined/); assert.match(said(), /a work permit through the school/);
  G.room = "stinky_bar"; run("talk to bert"); assert.doesNotMatch(t("ask bert about a job"), /undefined/); assert.match(said(), /You have a job — the school/);
  G.room = "hotel_room"; assert.doesNotMatch(t("teach online"), /undefined/);
  moveIn("nomad"); G.room = "hotel_room"; run("teach online"); G.paper = "permit"; assert.match(t("money"), /through the platform/);
});

test("SEVERE: the lease is read before it is signed, and notice asks once (฿27,000 and ฿18,000 went on questions)", () => {
  moveIn("pension"); G.room = "pratumnak_soi5"; G.bank = 60000; const b = G.bank;
  assert.match(t("rent a condo"), /RENT A CONDO again to sign/); assert.equal(G.bank, b, "nothing moved on the terms"); assert.equal(G.hotel, "sabai");
  run("look"); assert.match(t("rent a condo"), /RENT A CONDO again to sign/, "a question between, and it is the terms again"); assert.equal(G.bank, b);
  run("rent a condo"); assert.equal(G.hotel, "condo");
  const b2 = G.bank; assert.match(t("move out"), /MOVE OUT again if you mean it/); assert.equal(G.hotel, "condo"); assert.equal(G.bank, b2);
  run("look"); assert.match(t("move out"), /MOVE OUT again/, "disarmed by a command between"); assert.equal(G.hotel, "condo");
  run("move out"); assert.equal(G.hotel, "sabai");
});

test("the Soi 6 man who stays never finds ฿3,000 in a wardrobe; Mort, hired, still answers 'job'; the stringer pays on the ask", () => {
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.day = 8; G.pendingChoice = "vacation_end"; run("continue"); run("cancel the ticket");
  G.room = "pratumnak_soi5"; G.bank = 60000; run("rent a condo"); run("rent a condo"); const m = G.money; out = []; run("look"); assert.doesNotMatch(said(), /emergency stash/); assert.equal(G.money, m);
  moveIn("monger"); G.room = "queen_vic"; run("talk to mort"); run("ask mort about a job"); assert.ok(G.stringer);
  assert.match(t("ask mort about job"), /Read anything/); assert.doesNotMatch(said(), /hires residents/);
  G.examined = { "queen_vic.notebook": 1, "stinky_bar.cooler": 1 }; const m2 = G.money; assert.match(t("ask mort about what i read"), /counts them off/); assert.equal(G.money, m2 + 100);   // not his own notebook (round 103)
});

test("the paper is askable: a hostess, the house, a regular and Tan each answer a visa in their own register", () => {
  moveIn("monger"); G.room = "queen_vic"; run("talk to mort"); assert.match(t("ask mort about bank book"), /extension|agent|permit|border|book/i); assert.doesNotMatch(said(), /Not my story|Search me|pay grade/);
  run("talk to aoy"); assert.match(t("ask aoy about work permit"), /company|agent|permit/i);
  G.room = "stinky_bar"; run("talk to bert"); assert.match(t("ask bert about my paper"), /permit|company|agent/i);
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess"); run("talk to " + g); assert.match(t("ask " + g + " about bank book"), /Thai|agent|paper/i);
  jerryDay(); run("talk to jerry"); run("ask jerry about a job"); assert.match(t("ask jerry about pay"), /Thirty-five/); assert.match(t("ask jerry about the permit"), /permit (?:comes )?with the first pay/);
});

test("the month's book: the agent's fee is charged in the month before the permit; the condo's rent is the room; income is not spending; MONEY is free", () => {
  moveIn("pension"); jerryDay(); run("talk to jerry"); run("ask jerry about a job"); run("take the job");
  G.room = "pratumnak_soi5"; G.bank = 80000; run("rent a condo"); run("rent a condo"); G.room = "condo_room";
  sleep(); G.day = G.payDay + 30; const b = G.bank; sleep();
  assert.match(said(), /The agent's ฿700 for a long-stay visa/, "the month that was"); assert.match(said(), /paper came through/);
  assert.equal(G.bank, b + 42000 + 35000 - 700 - 11000, "pension + school − the agent − the condo"); assert.equal(G.month.rent, 11000, "the rent is the coming month's room");
  assert.match(t("money"), /This month so far: .*฿11,000 of it the room/);
  const turns = G.turns; run("money"); run("budget"); assert.equal(G.turns, turns, "a readout costs no turn");
  // a note pressed into your hand is not negative spending
  G.money += 200; G.jobPaid = (G.jobPaid || 0) + 200; const sp = G.month.spent; G.money -= 130; sleep(); assert.ok(G.month.spent >= sp + 130, "gross: " + G.month.spent);
  // the signing is named on the ledger
  moveIn("pension"); sleep(); G.room = "pratumnak_soi5"; G.bank = 60000; run("rent a condo"); run("rent a condo"); sleep(); assert.ok(G.lastNightSaid.some(l => /to the condo's office/.test(l)), "the signing is named: " + G.lastNightSaid.join(" | "));
});

test("a school morning: a night that ran to six is a late wherever it ended; the banner knows the gate at eight; the condo's late paint names no hour", () => {
  moveIn("pension"); jerryDay(); run("talk to jerry"); run("ask jerry about a job"); run("take the job");
  G.room = "hotel_room"; while (![1, 2, 3, 4].includes((G.day + 1) % 7)) G.day++;
  G.soc.drunk = 0; G.nightTurn = 119; out = []; run("wait 2"); run("wait 2"); assert.equal(G.job.lates, 1, "dawn at home before a school day: " + said().slice(-200));
  assert.match(said(), /the alarm at seven, the gate at eight/);
  assert.ok(!ROOMS.condo_room.lateDesc.some(l => /\bfour in the morning\b/i.test(l))); assert.ok(!ROOMS.condo_room.indoors, "a balcony is a window");
  assert.doesNotMatch(_HOTELS.condo.name, /^the /); assert.match(ROOMS.pratumnak_soi5.desc, /for a tourist/);
});
