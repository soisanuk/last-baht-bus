// ROUND 93 (2026-10-14) — Liam Doherty (Opus), a Leeds bricklayer on the Soi 6 week with a ฿2,500-a-night budget and a
// notebook: every price asked before it was paid, every morning reconciled. The money reconciled to the baht over seven
// nights; the words round it did not. "Every price they told me was the price they charged… What didn't add up was the
// girls: three times one sold me the drink and then remembered the temple."
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

beforeEach(() => {
  newGame();
  G.player = { origin: "golfer", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});
// a woman whose day says no tonight, by the same pure hash the barfine reads
const refusing = room => { for (let d = 1; d < 60; d++) { G.day = d; const id = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && _bfDayPeek(i) === "temple"); if (id) return id; } return null; };

test("SEVERE: a woman whose day says no says it before she quotes the stairs — not after the drink is sold", () => {
  G.room = "sunset_dreams"; const id = refusing("sunset_dreams"); assert.ok(id, "a temple day exists");
  out = []; run(`ask ${NPCS[id].name.toLowerCase()} about short time`);
  assert.match(said(), /temple/); assert.doesNotMatch(said(), /One lady drink first|฿\d/, said());
  out = []; run(`ask ${NPCS[id].name.toLowerCase()} about barfine`); assert.match(said(), /temple/);
});

test("a woman who waives her fine for you quotes no fine (May, her-farang)", () => {
  G.room = "sunset_dreams"; G.soc.drinks.may = 14; G.day = 3;
  if (_bfDayPeek("may")) return;
  out = []; run("ask may about barfine"); assert.match(said(), /No fine/i); assert.doesNotMatch(said(), /฿1,150|฿3,450/);
  out = []; run("ask may about long time"); assert.match(said(), /no fine/i);
});

test("LONG TIME is a topic, not May's 'Long day?' hello", () => {
  G.room = "sunset_dreams"; G.day = 3; if (_bfDayPeek("may")) return;
  run("talk to may"); out = []; run("ask may about long time");
  assert.doesNotMatch(said(), /rest here little bit/); assert.match(said(), /[Ll]ong time/);
});

test("the 7-Eleven sells the woman with you a beer till midnight, and says the price on its door", () => {
  G.room = "soi6_street"; G.party = { ids: ["may"], stops: 1, spent: 0, seen: {} };
  const m = G.money; out = []; run("buy beer for may"); assert.equal(m - G.money, SEVEN_BEER, said());
  assert.doesNotMatch(said(), /where drinks are sold|four bites/);
  out = []; _describeRoom(true); assert.match(said(), new RegExp("BUY BEER ฿" + SEVEN_BEER));
  G.nightTurn = 70; out = []; _describeRoom(true); assert.doesNotMatch(said(), /BUY BEER ฿/);
});

test("a price question off a bar stool is answered: the 7-Eleven's board on its street, the games in a bar", () => {
  G.room = "soi6_street";
  for (const q of ["how much is a toastie", "how much", "how much is a beer at the 7-eleven"]) {
    out = []; run(q); assert.match(said(), new RegExp("TOASTIE ฿" + TOASTIE_PRICE), q);
  }
  G.room = "sunset_dreams"; out = []; run("how much to play connect 4"); assert.match(said(), new RegExp("Connect 4 ฿" + C4_STAKE));
});

test("the last night's room is paid at checkout, and the ledger says so", () => {
  G.day = 7; G.room = "qv_room"; G.nightTurn = 80; _nightSnapshot(); const m = G.money + G.bank;
  run("sleep"); run("sleep");
  assert.equal(G.pendingChoice, "vacation_end");
  assert.equal(m - (G.money + G.bank), _hotelRate("queenvic"));
  assert.match(said(), /Checkout/);
});

test("CHECK BIN says what the cup does not count", () => {
  G.room = "sunset_dreams"; run("buy beer"); _arriveAt && 0;
  (G.soc.arriveMoney = G.soc.arriveMoney || {})[G.room] = G.money + 300 + _beerPrice();
  (G.soc.arriveBook = G.soc.arriveBook || {})[G.room] = { off: (G.offTill || 0) - 300, lb: 0, lr: 0, atm: 0, drawn: 0, floated: 0, offIn: 0 };
  out = []; run("check bin"); assert.doesNotMatch(said(), /not a baht more/);
});

test("the quiz prize and a note pressed into your hand are named on the morning ledger", () => {
  G.room = "sunset_dreams"; _nightSnapshot(); G.money += 500; G.quizWon += 500; G.money += 20; G.giftIn += 20;
  G.day++; _morningLedger(); const l = G.lastNightSaid.join(" ");
  assert.match(l, /฿500 back in at the tables and the quiz/); assert.match(l, /฿20 pressed into your hand/);
});

test("short of cash at LONG TIME you are told so, not asked to confirm; HOW MUCH at the ledger is answered", () => {
  G.room = "sunset_dreams"; G.nightTurn = 40; G.money = 200;
  const id = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && !_bfDayPeek(i)); if (!id) return;
  G.pendingBf = { id, st: 750, lt: 1550, party: 1950, room: G.room };
  out = []; run("how much"); assert.match(said(), /฿750/);
  out = []; run("long time"); assert.doesNotMatch(said(), /that is the night/i, said());
});

test("the honest words: TIME on early prices, the bell moves with the room, the noodle girl names her end of the soi, the quiz says which bar", () => {
  G.nightTurn = 10; out = []; run("time"); assert.doesNotMatch(said(), /×1\.5 until 21:00/);
  assert.ok(QUIZ_POOL.some(q => /plain beer bar/.test(q.q)));
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /same as everybody on the soi/);
});

test("HAGGLE answers the thing just quoted, and the cart scenes are not '+1' twice", () => {
  G.room = "sunset_dreams"; run("ask may about barfine"); out = []; run("haggle");
  assert.doesNotMatch(said(), /Is not for the water|Same price as beer/, said());
});

test("SHORT TIME WITH <her> is the barfine", () => {
  G.room = "sunset_dreams"; const id = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`short time with ${NPCS[id].name.toLowerCase()}`); assert.doesNotMatch(said(), /blinks|didn't understand/);
});

test("deferred, fixed: THE FINE said to a woman on a bar floor is hers, not the police's", () => {
  G.room = "sunset_dreams"; G.day = 3; G.soc.drinks.may = 14;
  out = []; run("ask may about the fine"); assert.doesNotMatch(said(), /Station|boys in brown|wai first/, said());
});

test("deferred, fixed: nobody texts from behind the open front you are standing outside", () => {
  G.phone.contacts = { may: true };
  const tally = room => { G.room = room; G.phone.inbox = []; G.phone.textDay = {}; const saved = _rand;
    try { _rand = () => 0; for (let k = 0; k < 40; k++) { G.phone.lastText = -99; G.turns += 30; _maybeIncomingText(); } } finally { _rand = saved; }
    return G.phone.inbox.filter(m => m.from === "may").length; };
  assert.equal(_streetOf(_npcWhere("may")), "soi6_street");
  assert.equal(tally("soi6_street"), 0, "not from ten metres away");
  assert.ok(tally("soi6_east") > 0, "she does text from down the soi");
});

test("deferred, fixed: one woman never gives the same went-with hello twice", () => {
  G.room = "sunset_dreams"; const seen = [];
  for (let k = 0; k < 5; k++) {
    G.day = 3 + k * 2; G.wentWith = { may: { kind: "out", day: G.day - 1 } }; G.partyLog = { may: { day: G.day - 1, rooms: ["sunset_dreams"] } };
    G.soc.wentHello = {}; out = []; _wentWithHello("may"); seen.push(said());
  }
  assert.equal(new Set(seen).size, seen.length, seen.join("\n---\n"));
});

test("deferred, fixed: Tan knows the Soi 6 week's basics, and 'beer' is not DJ Beer", () => {
  G.room = _npcRoom("tan"); run("talk to tan"); G.convoQ = null;
  for (const [t, re] of [["lady drink", new RegExp("฿" + _ladyPrice("sunset_dreams"))], ["beer", new RegExp("฿" + SEVEN_BEER)], ["bus", new RegExp("฿" + BUS_FARE)], ["cheap", /middle of the soi/], ["7-eleven", /Chang/]]) {
    out = []; run("ask tan about " + t); assert.match(said(), re, t + ": " + said()); assert.doesNotMatch(said(), /pay grade|department|Jomtien|DJ Beer/, t);
  }
});

test("the last night's goodbye is said to her face, is a tap, pays once, and the week's end remembers it", () => {
  G.day = 7; G.room = "sunset_dreams"; G.soc.drinks.may = 8;
  run("talk to may"); assert.ok(_convoTopics("may").includes("goodbye"), "a chip on the last night");
  const h = G.happy; out = []; run("goodbye may"); assert.equal(G.happy - h, 2); assert.match(said(), /May/);
  out = []; run("goodbye may"); assert.match(said(), /had her goodbye/); assert.equal(G.happy - h, 2, "once");
  assert.ok(!_convoTopics("may").includes("goodbye"));
  G.hotel = "queenvic"; G.room = "qv_room"; G.nightTurn = 90; out = []; run("sleep"); run("sleep");
  assert.equal(G.pendingChoice, "vacation_end"); assert.match(said(), /You said goodbye to May at her bar/);
});

test("no goodbye chip before the last night, nor for a stranger", () => {
  G.day = 5; G.room = "sunset_dreams"; G.soc.drinks.may = 8; assert.ok(!_convoTopics("may").includes("goodbye"));
  G.day = 7; G.soc.drinks = {}; G.talked = {}; assert.ok(!_lastByeDue("dear"));
});
