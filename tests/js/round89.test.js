// ROUND 89 (2026-10-13) — Callum Reid (Fable), a Glasgow rig worker who never goes to bed before dawn, out past the
// two o'clock shutters every night of the Soi 6 week. "The street remembers the night. The people on it don't."
// The clock held; what people SAID about the hours did not: "still open after two" named the bars that shut at two,
// "where do you go after work" was answered with the closing time, and the staff he watched the sunrise beside
// said he had gone out the door. Pinned here with the small-hours paint, the walk home and the cart at the close.
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

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.nightTurn = 25; G.flowerDay = G.day; out = [];
});

test("SEVERE: 'where is still open after two' at half eight names what pours after two, not the bars next door", () => {
  G.room = _npcRoom("pukky"); run("ask pukky where is still open after two");
  const named = Object.keys(ROOMS).filter(r => ROOMS[r].barType && said().includes(_barName(r)));
  assert.ok(named.length, said());
  for (const r of named) assert.equal(_closeTurn(r), null, `${_barName(r)} shuts at ${_closeClock(r)} — not open after two`);
  G.room = "queen_vic"; out = []; run("ask mort where is still open after two");
  for (const r of Object.keys(ROOMS).filter(r => ROOMS[r].barType && said().includes(_barName(r)))) assert.equal(_closeTurn(r), null, said());
});

test("SEVERE: 'where do you go after work' is her own answer, the same when asked again, and not the closing time", () => {
  G.room = _npcRoom("pukky"); run("ask pukky where do you go after work"); const a = said();
  assert.ok(_AFTER_WORK.floor.some(l => a.includes(l.slice(2, 40))) || _AFTER_WORK.house.some(l => a.includes(l.slice(2, 40))), a);
  out = []; run("ask pukky what do you do after closing"); assert.equal(said().split("\n")[0], a.split("\n")[0], "kept");
  const g = _npcsHere().find(i => i !== "pukky" && NPC_ROLES[i] === "hostess");
  if (g) { out = []; run(`ask ${lc(g)} where do you go after work`); assert.notEqual(said().split("\n")[0], a.split("\n")[0], "two women, two answers"); }
});

test("SEVERE: the bar you watched the sunrise from remembers it, as LAST NIGHT and as the sunrise", () => {
  G.room = "blue_dog"; G.nightTurn = SUNRISE_TURN + 1; run("watch sunrise"); run("watch sunrise");
  assert.equal(G.lastNightWas.endRoom, "blue_dog");
  G.room = "blue_dog"; G.nightTurn = 20; const s = _npcsHere().filter(i => NPC_ROLES[i]);
  out = []; run(`ask ${lc(s[0])} about last night`); assert.doesNotMatch(said(), /out that door|between you and the street|Not my story/);
  assert.match(said(), /sun|light|sunrise/i);
  if (s[1]) { out = []; run(`ask ${lc(s[1])} about the sunrise`); assert.doesNotMatch(said(), /Not my story/); }
});

test("the East End points at the West End's 7-Eleven, not across the fence", () => {
  G.room = "soi6_deep"; G.nightTurn = 82; run("buy toastie");
  assert.match(said(), /West End/); assert.doesNotMatch(said(), /one step along/);
});

test("the two bars still lit after two have late paint; the shut soi's sounds and smells are the small hours'", () => {
  for (const r of ["blue_dog", "stinky_bar"]) {
    G.room = r; G.nightTurn = 95; G.visited[r] = false; out = []; _describeRoom(true);
    assert.doesNotMatch(said(), /WATCH SUNSET|evening police checkpoint/, r);
  }
  G.room = "soi6_mid"; G.nightTurn = 100; out = []; run("listen"); run("smell");
  assert.doesNotMatch(said(), /being stacked|midnight moo ping/);
});

test("home a street away is walked at dawn", () => {
  G.room = "stinky_bar"; assert.ok(_homeNear());
  G.nightTurn = NIGHT_TURNS - 1; out = []; _endNight("dawn");
  assert.doesNotMatch(said(), /share a taxi|bike home|a taxi/);   // the ฿700 that leaves is the room rent at the wake, not a fare
});

test("the cart goes when the bar does, and nobody busy clears your empty", () => {
  G.room = _npcRoom("pukky"); G.salengCart = "lingerie"; G.salengRoom = G.room; G.salengUntil = G.turns + 50;
  G.nightTurn = _closeTurn(G.room) - 1; _salengTick(); assert.equal(G.salengCart, null);
  assert.ok(!readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8").includes("the one thing a barman never knows"));
});
