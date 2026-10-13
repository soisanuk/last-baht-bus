// ROUND 86 (2026-10-13) — Sunil (Opus), a score-chaser on the Soi 6 week who read the สนุก meter after every
// command and asked what each move paid. "Nearly half of my 300 cost nothing." The economy questions are a
// design call for Mario; what is pinned here is the meter saying what it does, and the states that forgot
// each other on the way: a ride closed by the bar he left, a regular's first night discounted by the
// treadmill, a ฿1,240 bell paying nothing in silence.
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
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});

test("SEVERE: the bar's two o'clock shut does not end a ride on her bike", () => {
  G.room = "pink_lotus"; G.rideSeq = { id: "x", fine: 0, spent: 0, stops: 1, sanuk: 0, seen: {} };
  G.nightTurn = SOI6_CLOSE + 1; const room = G.room;
  _closingTick();
  assert.equal(G.room, room, "the ride was not put out on the street"); assert.ok(G.rideSeq, "the ride survives");
});

test("rain on the ride is the road's, not the bar's", () => {
  G.room = "pink_lotus"; G.rideSeq = { id: "x", fine: 0, spent: 0, stops: 1, sanuk: 0, seen: {} };
  _startRain(4);
  assert.match(said(), /back of her bike/); assert.doesNotMatch(said(), /stools/);
});

test("a regular's first night is no treadmill: the jaded discount is not taken", () => {
  G.room = "pink_lotus"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.soc.drinks[g] = 20; G.jaded = 3; assert.ok(_bondTier(g) >= 2);
  const h = G.happy; _conquestHappy(10, g);
  assert.equal(G.happy - h, 12, "base + 2, whatever the jaded");
});

test("a bell that pays nothing says so", () => {
  G.room = "pink_lotus"; G.soc.bought = 7;   // the next is the eighth: half rate pays on the even
  run("ring bell"); out = []; run("ring bell");
  assert.match(said(), /no สนุก/);
});

test("the chorus counts the women on the floor; the toast names a mamasan only where there is one", () => {
  const solo = Object.keys(ROOMS).find(r => ROOMS[r].barType && (() => { G.room = r; return _npcsHere().filter(i => NPC_ROLES[i] === "hostess").length === 1; })());
  if (solo) { G.room = solo; out = []; run("sing"); assert.doesNotMatch(said(), /Three hostesses/); }
  const noMama = Object.keys(ROOMS).find(r => ROOMS[r].barType === "beer" && (() => { G.room = r; return !_npcsHere().some(i => NPC_ROLES[i] === "mamasan"); })());
  if (noMama) { G.room = noMama; out = []; run("cheers"); assert.doesNotMatch(said(), /mamasan's calculator/); }
});

test("a woman's 'I go with you' is not offered while another is on your arm", () => {
  G.room = "pink_lotus"; const g = _npcsHere().filter(i => NPC_ROLES[i] === "hostess");
  G.party = { ids: [g[0]], stops: 1, spent: 0, seen: { pink_lotus: true }, rooms: {} };
  const saved = _rand; try { _rand = () => 0; G.soc.drinks[g[1]] = 30; _maybeGoWithYou(g[1]); } finally { _rand = saved; }
  assert.doesNotMatch(said(), /go with you/i);
});

test("a level is announced once a trip", () => {
  G.happy = 9; _addHappy(2); const first = (said().match(/✨/g) || []).length;
  G.happy = 8; out = []; _addHappy(3);
  assert.ok(first >= 1); assert.doesNotMatch(said(), /✨/);
});

test("the Vic's room water comes out of the mini-fridge, cold", () => {
  G.hotel = "queenvic"; G.room = "qv_room";
  if (/mini-fridge/.test(ROOMS.qv_room.desc)) { run("drink water"); assert.match(said(), /mini-fridge/); assert.doesNotMatch(said(), /warm as soup/); }
});

test("the care thanks does not promise never to ask again", () => {
  assert.ok(!_CARE_THANKS.some(l => /not say again|not talk about it again/.test(l)));
});

// Mario's call on the score economy (2026-10-13): a dance pays once a night, with a woman who knows you;
// a photo pays for the first three new faces a night. Each first zero says why.
test("DANCE WITH a stranger pays nothing and says why; a woman who knows you pays once a night", () => {
  G.room = "pink_lotus"; const g = _npcsHere().filter(i => NPC_ROLES[i] === "hostess");
  let h = G.happy; out = []; run(`dance with ${NPCS[g[0]].name.toLowerCase()}`);
  assert.equal(G.happy, h, "a stranger's dance is hers"); assert.match(said(), /stranger is hers/);
  G.soc.drinks[g[0]] = 4; h = G.happy; run(`dance with ${NPCS[g[0]].name.toLowerCase()}`);
  assert.equal(G.happy - h, 2, "she knows you: the night's dance");
  if (g[1]) { G.soc.drinks[g[1]] = 4; h = G.happy; run(`dance with ${NPCS[g[1]].name.toLowerCase()}`); assert.equal(G.happy, h, "once a night, not once a woman"); }
  _endNight("sleep"); G.room = "pink_lotus"; G.nightTurn = 30; h = G.happy; run(`dance with ${NPCS[g[0]].name.toLowerCase()}`);
  assert.equal(G.happy - h, 2, "a new night, a new dance");
});

test("PHOTO pays for three new faces a night, then says the album keeps the rest", () => {
  G.room = "queen_vic"; G.nightTurn = 20; G.battery = 100;
  const faces = _npcsHere().filter(i => !NPC_ROLES[i] || !/gogo|soi6/.test(ROOMS[G.room].barType || ""));
  assert.ok(faces.length >= 4, "the Vic has four faces to photograph: " + faces.length);
  const h = G.happy; out = [];
  for (const id of faces.slice(0, 5)) run(`photo ${NPCS[id].name.toLowerCase()}`);
  assert.equal(G.happy - h, PHOTO_JOY_NIGHT); assert.match(said(), /first three new faces/);
});
