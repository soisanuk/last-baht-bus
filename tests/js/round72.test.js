// Round 72 (2026-10-08) — Gordie McLeish, a laid-off rigger on his fourth trip with ฿2,200 (Opus, lens:
// skint-edges), aimed at the map's darkest block: Nira's loan, the police, the street food, Cream. "The town
// keeps its books perfectly, and it just doesn't read them out loud."
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
const ask = (id, t) => { G.convoQ = null; out = []; run(`ask ${id} about ${t}`); return said(); };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 7000; G.bank = 5000; G.nightTurn = 30; G.room = "neon_paradise"; out = [];
});

test("the loan you flew home with is a debt you can pay, and Nira says so until you have", () => {
  G.loanSkipped = true; G.loanSkippedOwed = 5000;
  out = []; run("talk to nira"); assert.match(said(), /฿5,000/); assert.match(said(), /REPAY/);
  assert.match(ask("nira", "debt"), /fly home with my money|go to the airport instead/); assert.doesNotMatch(said(), /Paid|square/);
  out = []; run("borrow 2000"); assert.match(said(), /Not until the last one is square/); assert.ok(!G.loan);
  out = []; run("give 2000 to nira"); assert.equal(G.loanSkippedOwed, 3000, "money handed to the lender you owe is a repayment");
  out = []; run("apologize"); assert.match(said(), /Sorry is free/);
  out = []; run("repay 3000"); assert.equal(G.loanSkipped, false); assert.match(said(), /Square/);
  out = []; run("borrow 2000"); assert.ok(G.loan, "square, she lends again");
});
test("the morning names the old loan's repayment and a police fine, and the hotel book's growth", () => {
  _nightSnapshot(); G.loanSkipped = true; G.loanSkippedOwed = 1000; run("repay 1000");
  G.money -= 300; G.policePaid = (G.policePaid || 0) + 300; G.hotelDebt = 400;
  _morningLedger();
  const l = G.lastNightSaid[0];
  assert.match(l, /to Nira against the loan you flew home with/); assert.match(l, /฿300 of it to the police/); assert.match(l, /฿400 more on the hotel book/);
});
test("Cream remembers the night, the money and the hotel, in the act's register", () => {
  G.room = "metro_garden"; G.nightTurn = 50; G.chamLast = { day: G.day - 1, gift: 1000 };
  assert.match(ask("cream", "last night"), /never do this/); assert.doesNotMatch(said(), /I see nothing/);
  assert.match(ask("cream", "gift"), /For the bus/);
  assert.match(ask("cream", "hotel"), /one of the girls/); assert.doesNotMatch(said(), /Metropole/);
  _pushMsg("cream", "", 0, null, "labels again, two hour"); assert.match(ask("cream", "labels"), /labels again/);
});
test("an affirmed return is not a lie: 'yes, you have' agrees with 'fourth trip'; a marital lie is still caught", () => {
  assert.ok(_saidAgrees("fourth trip", "yes, you have"));
  assert.ok(!_saidAgrees("Widowed, love. Five years ago", "A wife, sweetheart. Twenty-two years married"));
  assert.ok(!_H_ASK_PHRASINGS.trips.some(l => /I see you before|almost certainly has not/.test(l)), "the trips key asks about trips");
});
test("the police take the apology in Thai, say so when you pay short, and count the fine", () => {
  for (const say of ["khor thot krap", "ขอโทษครับ"]) {
    G.money = 1000; G.soc.drunk = 5; G.room = "beach_rd_c"; G.pendingEnc = "police";
    out = []; run(say); assert.match(said(), /wai first and apologise/); assert.equal(G.pendingEnc, null);
  }
  G.money = 445; G.pendingEnc = "police"; const p0 = G.policePaid || 0;
  out = []; run("pay"); assert.match(said(), /looks at the gap/); assert.equal(G.policePaid - p0, 445);
});
test("Bert knows Nira by name; the mercy ride says the highway only where it crosses one and why there is no second", () => {
  G.room = "stinky_bar"; run("talk to bert"); assert.match(ask("bert", "nira"), /Walking Street's bank/);
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.match(src, /weaves through the traffic one-handed/);
  const st = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Beach Road");
  G.room = st; G.money = 5; G.pityRideDay = G.day; out = []; run("motosai to naklua");
  assert.match(said(), /one free ride a night is spent/);
});
test("broke at the Sabai, the joiner fee goes on the book; DEBT lists the bike stand; khob khun is thanks", () => {
  G.hotel = "sabai"; G.money = 30; G.hotelDebt = 0; _joinerFee(G.day);
  assert.equal(G.hotelDebt, JOINER_FEE);
  G.pityOwed = 100; out = []; run("debt"); assert.match(said(), /bike stand: ฿100/);
  assert.ok(THAI_PHRASES.find(p => p.key === "thanks").match.includes("khob khun"));
});
