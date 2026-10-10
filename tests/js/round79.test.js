// ROUND 79 (2026-10-10) — the release check: Gary Pritchard (Opus), a Doncaster forum regular who
// has been to Pattaya twice and never played a text adventure, opening the link cold on a 375×667
// phone, thumbs first, TODAY'S SOI. "Worth a go, but tap the buttons, don't type, and say TAO RAI for
// prices." The prices and the price questions were the gap.
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
const src = f => readFileSync(fileURLToPath(new URL(`../../web/${f}`, import.meta.url)), "utf8");

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; G.flowerDay = G.day; out = [];
});

test("HOW MUCH, PRICE and MENU in a bar are the price list; HOW MUCH BARFINE is her number", () => {
  G.room = "bay_watch";
  for (const q of ["how much", "price", "menu", "how much beer", "how much is a lady drink", "whats the price of a beer", "what is the price of beer"]) {
    out = []; run(q); assert.match(said(), /tao rai/, q);
  }
  out = []; run("how much barfine"); assert.match(said(), /Short time,? ฿/);
});

test("the middle's beer bars are Soi 6: one drink, and the girl quotes it herself — with the before-nine price named", () => {
  G.room = "bay_watch"; G.nightTurn = 10;
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  run("talk to " + NPCS[g].name.toLowerCase()); out = []; run(`ask ${NPCS[g].name.toLowerCase()} about upstairs`);
  assert.match(said(), /after nine/i, "the early price says it is the early price");
  out = []; run("barfine " + NPCS[g].name.toLowerCase());
  assert.doesNotMatch(said(), /more, then we talk/, "not Walking Street's three drinks");
  G.soc.drinkCount = { [g]: 1 }; out = []; run("barfine " + NPCS[g].name.toLowerCase());
  assert.match(said(), /upfront as a menu/, "she quotes it herself");
});

test("a question is not the answer to her earlier question", () => {
  G.room = "ruby_kiss"; run("talk to wilai");
  if (G.convoQ) { run("talk to kluay"); run("talk to wilai"); }
  G.convoLapsed = { wilai: { key: "stay", q: "How long you here?" } }; G.convoQ = null; G.convo = "wilai";
  out = []; run("upstairs?");
  assert.doesNotMatch(said(), /a beat late/);
});

test("a woman the room's own prose seats beside you is not 'with a customer'", () => {
  G.room = "ruby_kiss";
  for (const n of ["Kluay", "Benz"]) { const id = _npcsHere().find(i => NPCS[i].name === n); if (id) assert.equal(_girlBusy(id), false, n); }
});

test("GO HOME goes home; TALK TO HER is the woman you bought a drink; her number is CONTACT", () => {
  G.room = "bay_watch"; G.nightTurn = 40; run("talk to somo"); out = []; run("go home");
  assert.doesNotMatch(said(), /stranger offering to carry your bag/);
  G.room = "bay_watch"; run("buy drink for somo"); out = []; run("talk to her");
  assert.doesNotMatch(said(), /Nobody by that name/);
  out = []; run("ask somo for her number"); assert.doesNotMatch(said(), /Not my story|didn't parse/);
});

test("LAST NIGHT WAS GREAT said to her is said to her; bare LAST NIGHT is the ledger", () => {
  G.room = "bay_watch"; run("talk to somo");
  out = []; run("last night was great"); assert.match(said(), /You asked Somo about last night|Somo/);
  assert.doesNotMatch(said(), /^Last night: [+-]\d/m);
});

test("QUIZ, FOOD and DARTS are verbs", () => {
  G.room = "queen_vic";
  for (const q of ["quiz", "food", "darts"]) { out = []; run(q); assert.doesNotMatch(said(), /didn't parse|blinks|No idea/, q); if (G.game) run("quit"); }
});

test("the house closing a game gives the stake back", () => {
  G.room = "bay_watch"; G.game = { type: "c4", stake: 20 }; const m = G.money;
  _abandonGame("Midnight calls it", true);
  assert.equal(G.money, m + 20); assert.equal(G.game, null);
});

test("small slips: first beer, darts capital, the ledge, the oche, the bell's empty rail, the ride coda, the phone splash", () => {
  G.room = "bay_watch"; G.soc.selfDrinks = {}; out = []; run("buy beer"); assert.doesNotMatch(said(), /Another big one/);
  assert.doesNotMatch(src("js/engine-parser.js"), /You ease back off the ledge/);
  assert.doesNotMatch(src("js/engine-play.js"), /the morning shift has started, and she is on it/);
  assert.doesNotMatch(src("index.html"), /TODAY'S SOI 📅/);
  assert.match(src("index.html"), /max-width: 767px\) \{ #start-overlay \{ padding-top/);
  assert.doesNotMatch(src("js/engine-parser.js"), /or go OUT\.\)/);
});

// ── the two dialogue gaps (Mario: "fix the dialogue gaps") ───────────────────────────────────────
test("Pukky greets a man who came back as one who came back, and the night after her bike as that", () => {
  G.room = "sunset_rail"; G.metDay = { pukky: 1 }; G.day = 3;
  out = []; run("talk to pukky"); assert.match(said(), /You come back/); assert.doesNotMatch(said(), /First time this bar/);
  newGame(); G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done");
  G.room = "sunset_rail"; G.metDay = { pukky: 1 }; G.day = 3; G.rideLog = { pukky: { day: 2, count: 1 } };
  out = []; run("talk to pukky"); assert.match(said(), /After my bike/);
  newGame(); G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done");
  G.room = "sunset_rail"; out = []; run("talk to pukky"); assert.match(said(), /Cold beer\?/, "a first meeting is still a first meeting");
});

test("Somo hears which team you said: right, wrong, nobody, or a small club she has never heard of", () => {
  for (const [a, rx] of [["doncaster rovers", /Doncaster Rovers\?.*Small club/], ["liverpool", /Right answer/], ["man united", /Warm one/], ["chelsea", /Wrong answer/], ["nobody", /you are safe/]]) {
    newGame(); G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done");
    G.room = "bay_watch"; run("talk to somo"); out = []; run(a); assert.match(said(), rx, a);
  }
});
