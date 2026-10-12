// ROUND 83 (2026-10-13) — Declan Moody (Opus), 58, a Limerick publican thirty years behind a late bar,
// five nights on the Soi 6 week staying to every shutter and typing the way he'd talk across a counter.
// "These lads call it on the dot every night… Learn the barmaid's words, 'same again', 'what's the
// damage', 'bill please', and it'd be the best closing time I've drunk through abroad."
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
const huh = /didn't parse|didn't understand|blinks at you|No idea what/;

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "blunt", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; G.flowerDay = G.day; out = [];
});

test("the Vic's closing scene plays for the man inside at eleven, not for one who walks in at four", () => {
  G.hotel = "queenvic"; G.room = "soi6_mid"; G.nightTurn = 90; run("enter queen vic inn");
  assert.equal(G.room, "queen_vic");
  assert.ok(!_PUB_SHUT_GUEST.some(l => said().includes(l)), "no 'time is called' hours after it was");
});

test("a place named in a closing question is the place answered; the soi's hours do not claim the Vic", () => {
  G.room = "sunset_rail"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name.toLowerCase()} about what time does the vic close`);
  assert.match(said(), /Vic\? Eleven/);
  for (const l of Object.values({ a: 1 })) void l;
  assert.doesNotMatch(readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8"), /Two\. Every place on this street|whole soi same time|the whole of Soi 6, not just us|at the Shady Lady by quarter past/);
});

test("WHERE IS STILL OPEN names what is pouring; a shut Soi 6 points at it", () => {
  G.room = "sunset_rail"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name.toLowerCase()} about where is still open`);
  assert.doesNotMatch(said(), /four-ish|Late afternoon/); assert.match(said(), /open|pour/i);
  G.mode = "soi6"; G.room = "soi6_mid"; G.nightTurn = SOI6_CLOSE + 4; out = []; run("enter the shady lady");
  assert.match(said(), /still pouring/);
  out = []; run("where's still open?"); assert.doesNotMatch(said(), huh); assert.match(said(), /pour|Walking Street/);
});

test("the barmaid's words: same again, one more, a pint, the bill, the hour, who's here", () => {
  G.room = "ruby_kiss"; G.nightTurn = 40; run("talk to wilai");
  for (const c of ["same again", "another beer", "one for the road", "a pint please", "can I get one more?"]) {
    const m = G.money; out = []; run(c); assert.ok(G.money < m, c + " poured a beer"); assert.doesNotMatch(said(), huh, c);
  }
  for (const c of ["what's the damage?", "bill please", "what do I owe you?", "can I settle up?"]) { out = []; run(c); assert.match(said(), /Check bin|chit|cup/i, c); }
  out = []; run("what time do you close?"); assert.match(said(), /[Tt]wo/);
  out = []; run("last orders"); assert.match(said(), /[Tt]wo/);
  out = []; run("who's here?"); assert.match(said(), /Ruby Kiss/);
  G.room = "soi6_street"; G.nightTurn = 30; const m = G.money; out = []; run("buy beer at 7-eleven"); assert.ok(G.money < m, "the beer, not just the door");
});

test("the shut Vic downstairs: a chair, a dark window, the guard for a beer to take up", () => {
  G.hotel = "queenvic"; G.room = "queen_vic"; G.nightTurn = 90; G.soc.pubShut = G.day;
  out = []; run("sit down"); assert.match(said(), /dark pub/); assert.doesNotMatch(said(), /kerb|ledge/);
  const h = G.happy; out = []; run("watch soi"); assert.match(said(), /balcony upstairs/); assert.equal(G.happy, h);
  const m = G.money; out = []; run("can I get a beer to take upstairs?"); assert.ok(_VIC_GUARD.some(l => said().includes(l))); assert.equal(G.money, m);
  assert.ok(!_VIC_GUARD.some(l => /all week/.test(l)), "the guard asserts no week on night one");
  out = []; run("wait 2"); assert.doesNotMatch(said(), /songs turning over/);
});

test("after two: the balcony shows the shut street, sleep and TIME say the soi has shut, the walk-out names its end", () => {
  G.hotel = "queenvic"; G.room = "qv_room"; G.nightTurn = SOI6_CLOSE + 10; out = []; run("balcony");
  assert.doesNotMatch(said(), /parade never stops|stag party/); assert.doesNotMatch(said(), /best free show/);
  G.room = "soi6_mid"; out = []; run("time"); assert.match(said(), /shut at two/);
  G.room = "ruby_kiss"; G.nightTurn = SOI6_CLOSE - 1; out = []; run("wait"); assert.match(said(), /toward Second Road/);
});

test("Aoy's kitchen closes with the pub and she answers for her crisps; the Vic's barmaid hands out the quiz pencils", () => {
  G.room = "queen_vic"; G.nightTurn = 20; run("talk to aoy"); out = []; run("ask aoy about crisps");
  assert.match(said(), /whole pub close/); assert.doesNotMatch(said(), /After eleven, only crisp/);
  assert.doesNotMatch(readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8"), /signals the barman|Queen Vic glowing calm/);
});
