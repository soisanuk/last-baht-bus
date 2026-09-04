// Round 42 — Hugo (the Thai speaker), Roland (the teetotaller's circuit), Jacko (the 9am survivor).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
const stub = (fn, v = 0.99) => { const saved = _rand; _rand = () => v; try { fn(); } finally { _rand = saved; } };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

test("no player-facing string is a piece of source code (Jacko)", () => {
  // the filler hostess's after-hours answer printed `" +` and its own indentation
  // on every bar in the game — a concatenation idiom inside a template literal
  const bad = [];
  for (const [id, n] of Object.entries(NPCS)) {
    const strs = [n.desc, n.look, ...(n.dialogue || []).flatMap(d => [d.text, d.short])].filter(x => typeof x === "string");
    for (const s of strs) if (/"\s*\+\s*$|"\s*\+\s*"/.test(s) || /\n\s{6,}"/.test(s)) bad.push(id + ": " + s.slice(0, 60));
  }
  assert.deepEqual(bad, []);
  G.room = "candy_bar"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  out = []; run(`ask ${NPCS[g].name} about late`);
  assert.doesNotMatch(text(), /" \+/); assert.match(text(), /Thai (disco|place)|after bar close|khao tom/i);
});

test("a massage shop's price list is not a drinks list (Hugo)", () => {
  G.room = "thai_massage"; out = []; run("examine price list");
  assert.doesNotMatch(text(), /lady drink|Beer, spirits/); assert.match(text(), /Foot, Thai, oil|two languages/);
  G.room = "poseidon_soapy"; out = []; run("examine price list"); assert.doesNotMatch(text(), /lady drink/);
  G.room = "stinky_bar"; out = []; run("examine price list"); assert.match(text(), /two columns|Beer, spirits/);
});
