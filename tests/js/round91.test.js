// ROUND 91 (2026-10-13) — Dagny Holm (Opus), a Norwegian QA lead who stacked the newest systems in one hour every
// night: a woman on her arm, gifts and money, a downpour, a second bar, the shutters, a street encounter, the sunrise.
// "The till is the most trustworthy system I've tested this year… The people are a different build." The severe
// one was IDENTITY: a companion's _npcRoom is wherever you are, so every bar she walked into claimed her as staff.
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
const lc = id => NPCS[id].name.toLowerCase();
const MISS = /Not my story|not my story|Not mine to know|wrong woman|wrong girl|don't know about that|cannot help you/;

beforeEach(() => {
  newGame();
  G.player = { origin: "golfer", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});
const tam = () => { G.room = "sweet_tamarind"; return _npcsHere().filter(i => NPC_ROLES[i] === "hostess"); };
const out_ = id => { G.party = { ids: [id], stops: 1, spent: 0, seen: { sweet_tamarind: true }, rooms: { [id]: ["sweet_tamarind"] } }; };

test("SEVERE: another bar does not claim the woman on your arm as its staff; her own bar does", () => {
  const [a, b] = tam(); out_(a);
  for (const room of ["queen_vic", _npcRoom("pukky"), "pink_lotus"]) {
    G.room = room; G.party.rooms[a].push(room);
    const s = _npcsHere().find(i => (NPC_ROLES[i] || NPCS[i].house) && i !== a); if (!s) continue;
    out = []; run(`ask ${lc(s)} about ${lc(a)}`);
    assert.doesNotMatch(said(), /One of mine|works here|work here|is ours|Same bar, same girl/, room + ": " + said());
  }
  G.room = "sweet_tamarind"; out = []; run(`ask ${lc(b)} about ${lc(a)}`);
  assert.doesNotMatch(said(), /go home|Go home|finish already|where she is now/, "she is standing right here");
});

test("on your arm in somebody else's bar, she is a guest: their mamasan is not 'Mama, she look after us'", () => {
  const [a] = tam(); out_(a); G.room = _npcRoom("pukky");
  const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan"); if (!mama) return;
  out = []; run(`ask ${lc(a)} about ${lc(mama)}`); assert.match(said(), /Not my mama|not mine|guest/i);
});

test("a colleague of the woman on your arm says no at BARFINE, not 'she come too' and then no", () => {
  const [a, b] = tam(); out_(a); G.room = "sweet_tamarind";
  out = []; run(`barfine ${lc(b)}`); assert.doesNotMatch(said(), /She come TOO/); assert.match(said(), /steal/);
});

test("home together a few doors away is walked; the sunrise from your own room with her is home together", () => {
  const [a] = tam(); out_(a); G.room = "soi6_west_in";
  assert.ok(_homeNear()); out = []; run(`go home with ${lc(a)}`);
  assert.doesNotMatch(said(), /waves down a bike|songthaew/);
  G.room = _hotelRoomId(); G.nightTurn = SUNRISE_TURN + 1; out = []; run("watch sunrise"); run("watch sunrise");
  assert.doesNotMatch(said(), /go home to bed|taxi door/); assert.doesNotMatch(said(), /lands on the water|the bay/);
});

test("BUY SUNGLASSES FOR HER gives them to her, and she can name them the next command", () => {
  const [a] = tam(); G.pendingEnc = "peddler"; run(`buy sunglasses for ${lc(a)}`);
  assert.notEqual(G.itemLoc.shades, "inventory");
  out = []; run(`ask ${lc(a)} about the sunglasses`); assert.doesNotMatch(said(), MISS); assert.doesNotMatch(said(), /feed the girls/);
});

test("the rain with her is 'we', still falling is now, and the second bar remembers the woman you brought", () => {
  const [a] = tam(); out_(a); G.room = _npcRoom("pukky"); G.party.rooms[a].push(G.room);
  _startRain(3); out = []; run(`ask ${lc(a)} about the rain`); assert.match(said(), /NOW|Still coming|still coming/i);
  G.rain = 0; out = []; run(`ask ${lc(a)} about the rain`); assert.match(said(), /WITH you|me and you|I was there/i);
  const bar = G.room; G.room = _hotelRoomId(); _endNight("sleep"); G.room = bar; G.nightTurn = 20;
  const s = _npcsHere().find(i => NPC_ROLES[i] && i !== a); out = []; run(`ask ${lc(s)} about ${lc(a)}`);
  assert.doesNotMatch(said(), MISS); assert.match(said(), new RegExp(NPCS[a].name));
});

test("she remembers a dance only if you danced, the room and the morning, and the taxi she was sent home in", () => {
  const [a] = tam(); out_(a); G.room = _hotelRoomId(); _endNight("sleep"); G.room = "sweet_tamarind"; G.nightTurn = 20;
  out = []; run(`ask ${lc(a)} about last night`); assert.doesNotMatch(said(), /dance like a farang uncle/);
  out = []; run(`ask ${lc(a)} about your room`); assert.doesNotMatch(said(), MISS);
  const [, b] = tam(); out_(b); run(`send ${lc(b)} home`); _endNight("sleep"); G.room = "sweet_tamarind"; G.nightTurn = 20;
  out = []; run(`ask ${lc(b)} about the taxi`); assert.doesNotMatch(said(), MISS);
});

test("lady time is a subject the next command and lasts more than a night; a jilt is still there the next evening", () => {
  const [a, b] = tam(); G.room = "sweet_tamarind";
  G.soc.bfRefused = { [a]: { kind: "period", favor: 0 } }; out = []; run(`ask ${lc(a)} about lady time`); assert.doesNotMatch(said(), MISS);
  (G.ladyTime = {})[a] = { day: G.day, v: G.vacation }; G.soc.bfRefused = {}; G.day += 1;
  assert.equal((_bfRefusal(a, "beer") || {}).kind, "period");
  G.day -= 1; (G.miffed = {})[b] = G.day - 1; G.soc.drinks[b] = 20; out = []; run(`talk to ${lc(b)}`);
  assert.ok(_MIFFED_HELLO.some(l => said().includes(_fmt(l, { n: NPCS[b].name }).slice(0, 30))), said());
});

test("last night's quiz win is remembered by the room that saw it", () => {
  G.quizLast = { room: "queen_vic", day: G.day - 1, right: 5, present: ["aoy"] };
  G.room = "queen_vic"; G.nightTurn = 20; out = []; run("ask aoy about the quiz"); assert.match(said(), /five|all five/i);
});

test("small: the bell's price says it moves, no 'tonight' on the last morning, DRINK BEER at the 7-Eleven, WAIT UNTIL 1:55 at 01:54", () => {
  G.room = _npcRoom("pukky"); out = []; run("tao rai"); assert.match(said(), /moves with the room/);
  G.room = "soi6_street"; G.nightTurn = 30; const m = G.money; run("drink beer"); assert.ok(G.money < m);
  G.nightTurn = 79; out = []; run("wait until 1:55"); assert.equal(G.nightTurn, 80);
  assert.ok(!/intends to see you tonight/.test(String(_fmt(String(_PARTY_SOFT_BYE_CLOSE.filter(l => !/tonight|tomorrow/.test(l)).join("")), { who: "X" }))));
});
