// ROUND 87 (2026-10-13) — Aisling Ní Bhriain (Fable), a retired Galway night-desk sub on the Soi 6 week: one thing
// on the street each night, and the next evening every witness rung. "A town with no eyes, not a town that lies."
// The class fix is THE STREET'S EYES: _streetSaw keeps what happened on the pavement and who was there, and
// _streetTalk answers it from whoever could have seen it — rain is the town's weather, a drunk is the pavement's
// and its open fronts', the noodle girl is her own bar's, a gift off the cart is hers, the driver at the kerb is
// the street's.
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
const MISS = /Not my story|not my story|Not mine to know|wrong woman|wrong girl|Search me|No idea|above my pay|Not my department/;

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.nightTurn = 35; G.flowerDay = G.day; out = [];
});
const nextEvening = () => { _endNight("sleep"); G.nightTurn = 20; out = []; };
const lc = id => NPCS[id].name.toLowerCase();

test("the rain is the town's: anybody can say when it came down, and the man under the awning was there", () => {
  G.room = "soi6_street"; _startRain(4); G.rain = 0; nextEvening();
  G.room = "soi6_street"; run("ask piwin about the rain last night");
  assert.doesNotMatch(said(), /Other stand|MISS/); assert.match(said(), /awning|seven|rain/i);
  G.room = "queen_vic"; out = []; run("ask angela about the rain");
  assert.doesNotMatch(said(), MISS); assert.match(said(), /\d\d:\d\d/, "she names the hour it came");
  G.room = "sweet_tamarind"; const g = _npcsHere().find(i => NPC_ROLES[i]); out = []; run(`ask ${lc(g)} about the rain last night`);
  assert.doesNotMatch(said(), MISS);
});

test("the drunk is the pavement's: a witness on that street knows how you handled him; Tan, beside you, too", () => {
  G.room = "soi6_street"; const tanHere = _npcsHere().includes("tan");
  _startEnc("brit"); run("calm down mate"); nextEvening(); G.room = "soi6_street";
  const pl = Object.keys(ROOMS).find(r => _streetOf(r) === "soi6_street" && ROOMS[r].barType === "soi6");
  G.room = pl; const w = _npcsHere().find(i => NPC_ROLES[i]);
  run(`ask ${lc(w)} about the drunk`); assert.match(said(), /sorry|talked him down|hug/i, "the front saw it");
  if (tanHere) { G.room = "soi6_street"; G.talked.tan = [0]; out = []; run("ask tan about the drunk"); assert.match(said(), /talked him down/); assert.doesNotMatch(said(), /muppet|lifts the glass/, "Tan in his own voice"); }
});

test("the noodle girl's own bar knows her", () => {
  G.room = "soi6_mid"; _startEnc("noodle"); run("yes");
  const ev = G.streetLog[G.streetLog.length - 1]; assert.equal(ev.kind, "noodle");
  nextEvening(); G.room = ev.bar; const s = _npcsHere().find(i => NPC_ROLES[i]);
  run(`ask ${lc(s)} about the noodle girl`); assert.doesNotMatch(said(), MISS); assert.match(said(), /noodle/i);
});

test("a gift off the cart is remembered by the woman who got it, and two women get two reactions", () => {
  G.room = "sweet_tamarind"; const g = _npcsHere().filter(i => NPC_ROLES[i] === "hostess");
  G.salengCart = "lingerie"; G.salengRoom = G.room; G.salengUntil = G.turns + 20;
  run(`buy lingerie for ${lc(g[0])}`); const first = said(); out = [];
  if (g[1]) { run(`buy lingerie for ${lc(g[1])}`); assert.notEqual(said().replace(NPCS[g[1]].name, "X").slice(0, 80), first.replace(NPCS[g[0]].name, "X").slice(0, 80)); }
  nextEvening(); G.room = "sweet_tamarind"; run(`ask ${lc(g[0])} about the lingerie`);
  assert.doesNotMatch(said(), MISS); assert.match(said(), /last night/i);
});

test("the street's own staff know the driver at the kerb", () => {
  G.room = "soi6_street"; if (!_npcsHere().includes("tan")) return;
  G.talked.tan = [0]; const pl = Object.keys(ROOMS).find(r => _streetOf(r) === "soi6_street" && ROOMS[r].barType);
  G.room = pl; const w = _npcsHere().find(i => NPC_ROLES[i]); run(`ask ${lc(w)} about tan`);
  assert.doesNotMatch(said(), MISS); assert.match(said(), /kerb|stand|driver|outside/i);
});

test("the shut soi does not send you to a pub that shut at eleven, even when you sleep upstairs", () => {
  G.hotel = "queenvic"; G.room = "soi6_mid"; G.nightTurn = SOI6_CLOSE + 2;
  assert.ok(!_stillOpen(5).some(o => o.id === "queen_vic"));
});

test("a drizzle is rain to EXAMINE RAIN, and the shut soi has no girls under umbrellas", () => {
  G.room = "soi6_mid"; G.nightTurn = SOI6_CLOSE + 2; out = []; _sayDrizzle();
  assert.doesNotMatch(said(), /girls/); out = []; run("examine rain"); assert.doesNotMatch(said(), /Not raining/);
});

test("a cashier is not 'a man'; the fenced east exit is not listed; EAT TOASTIE buys one; EXAMINE MAN reads the buyer", () => {
  assert.ok(!readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8").includes("answers like a man who has counted them"), "the house register is not 'a man'");
  G.room = "soi6_deep"; out = []; _describeRoom(); assert.doesNotMatch(said(), /Exits:.*\be\b/);
  G.room = "soi6_street"; G.hunger = 50; const m = G.money; out = []; run("eat toastie"); assert.ok(G.money < m, "bought and eaten");
  G.room = "soi6_west_in"; out = []; run("examine man"); assert.match(said(), /good shirt/);
});

test("the dog line is dealt from the town's book", () => {
  G.dog = { since: 1 }; G.room = "pink_lotus"; const g = _npcsHere().filter(i => NPC_ROLES[i]).slice(0, 3);
  const lines = g.map(id => { out = []; run(`ask ${lc(id)} about the dog`); return said().replace(NPCS[id].name, "X").slice(0, 60); });
  assert.equal(new Set(lines).size, lines.length, lines.join(" | "));
});
