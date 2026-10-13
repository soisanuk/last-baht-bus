// The deferred rows of rounds 82–84, closed (Mario, 2026-10-13: "fix the deferred").
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
  G.player = { origin: "pension", personality: "charmer", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 20; G.flowerDay = G.day; out = [];
});

test("no drizzle straight after a downpour; no baht bus on Soi 6", () => {
  assert.match(src("js/engine-core.js"), /G\.turns - \(G\.lastRain \|\| -99\) >= 20/);
  assert.match(src("js/engine-systems.js"), /const _noBus = /);
});

test("a quiz you have played tonight is not an invitation on the chalkboard", () => {
  G.day = 4; G.nightTurn = 25; const qb = _quizBars().find(b => Object.values(ROOMS).some(r => (r.venues || []).includes(b) && !r.barType));
  if (!qb) return;
  const street = Object.keys(ROOMS).find(k => (ROOMS[k].venues || []).includes(qb) && !ROOMS[k].barType);
  G.quizPlayed[qb] = true; G.room = street; out = []; _describeRoom(true, true);
  if (/QUIZ NIGHT/.test(said())) assert.doesNotMatch(said(), /walk in and you're playing/);
});

test("a woman with her own voice texts in it, and Somo never asks for money", () => {
  assert.ok(NPCS.somo.textVoice && NPCS.somo.textVoice.noAsk);
  assert.ok(!NPCS.somo.textVoice.chatter.concat(NPCS.somo.textVoice.reply).some(t => /miss you|eat already/.test(t)));
  assert.equal(_moneyAsk("somo"), null);
});

test("Nina's returning hungry man gets the short opener and the plate; a room's return lines are a book", () => {
  G.room = "sandy_toes"; G.hunger = 40; run("talk to nina"); G.day++; G.soc.ninaFed = 0; G.hunger = 40; out = []; run("talk to nina");
  assert.match(said(), /Hungry again/); assert.ok(G.hunger < 40);
  G.room = "qv_room"; const seen = new Set(); const n = ROOMS.qv_room.revisit.length;
  for (let i = 0; i < n; i++) seen.add(_revisitPick(ROOMS.qv_room.revisit, "qv_room"));
  assert.equal(seen.size, n, "every line before any repeats");
});

test("'beer' during the watch pitch is an order; the cap is not flicked into a gutter at a bar", () => {
  G.room = "blue_dog"; G.pendingEnc = "peddler"; G.encPrompt = [["x", ""]]; const m = G.money; run("beer");
  assert.ok(G.money < m); assert.equal(G.pendingEnc, null);
  assert.ok(!_BEER_LINES.some(l => /gutter/.test(typeof l === "function" ? l("X") : l)));
});

test("Kesinee answers for her back room; a regular says where he drinks after the Vic", () => {
  G.room = "kitten_corner"; G.nightTurn = 40; run("talk to kesinee"); out = []; run("ask kesinee about the aircon room");
  assert.match(said(), /only aircon on this stretch/);
  G.room = "queen_vic"; run("talk to doyle"); out = []; run("ask doyle where do you drink after the vic shuts");
  assert.match(said(), /pour|open/i);
});

test("the dock says what its buttons are: notes, and the info chip is 'time, map & phone'", () => {
  assert.match(src("index.html"), /📓<span class="fab-lbl">notes<\/span>/);
  assert.ok(_chipSet().some(c => c.cmd === "__info " && /time, map/.test(c.label)));
  assert.match(src("index.html"), /#nav-fab button \{ height: 44px; \}/);
});
