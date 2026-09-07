// Round 47 (2026-09-07) — Stuart, the returning save loader (lens: old-save loader).
// The morning ledger is a single frame, and it carries the night's worst news: black
// out, wake rough with your pockets emptied, close the app, come back — and the money
// is gone with the game saying nothing about it. LAST NIGHT reprints it, and because
// the text rides the save it survives exactly the gap that lost it.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

// Sleep through to a morning that actually HAS a ledger: the baseline for a
// morning is taken at the previous wake, so the first night of a fresh game has
// nothing to compare against and correctly says nothing.
function sleepToLedger() {
  G.room = _hotelRoomId(); run("sleep", "sleep");
  G.room = _hotelRoomId(); run("sleep", "sleep");
}

test("LAST NIGHT reprints the morning ledger, word for word", () => {
  sleepToLedger();
  assert.ok(Array.isArray(G.lastNightSaid) && G.lastNightSaid.length,
    "the wake stored what it said");
  const said = G.lastNightSaid.slice();
  out = []; run("last night");
  assert.deepEqual(out.map(o => o.text), said,
    "LAST NIGHT says exactly what the morning said, not a paraphrase");
  out = []; run("ledger");
  assert.deepEqual(out.map(o => o.text), said, "LEDGER is the same verb");
});

test("the ledger survives the app being closed — which is the whole finding", () => {
  sleepToLedger();
  const said = G.lastNightSaid.slice();
  // Stuart's actual sequence: rough wake, lock the phone, come back to a save.
  const blob = serializeGame();
  newGame(); deserializeGame(blob);
  out = []; run("last night");
  assert.deepEqual(out.map(o => o.text), said,
    "a reloaded save can still be asked what happened last night");
});

test("the rough wake's missing money is in what LAST NIGHT reprints", () => {
  G.room = _hotelRoomId(); run("sleep", "sleep");
  G.money = 4000; G.room = "beach_rd_c";
  _endNight("blackout");
  assert.ok(G.roughLost > 0, "the rough wake actually lifted something");
  out = []; run("last night");
  assert.match(text(), new RegExp(_num(G.roughLost) + "(?: of it)? lifted"),
    "the figure a returning player came back looking for");
});

test("LAST NIGHT costs no turn and has a truthful answer before you have slept", () => {
  const t0 = G.turns, n0 = G.nightTurn;
  run("last night");
  assert.equal(G.turns, t0, "a readout of what already happened is free");
  assert.equal(G.nightTurn, n0);
  assert.match(text(), /not slept on it yet/);
});

test("LAST NIGHT is reachable by thumb as well as by keyboard", () => {
  assert.ok(engineComplete("last").includes("last night"), "autocomplete offers it");
  assert.ok(engineComplete("__info ").includes("last night"), "the INFO chip carries it");
  assert.match(_HELP, /LAST NIGHT/, "HELP lists it");
  assert.match(_HELP_SOI6, /LAST NIGHT/, "and the challenge card does too");
});
