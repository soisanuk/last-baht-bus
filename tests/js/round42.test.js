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
const stub = (fn, v = 0.99) => { const saved = _rand; _rand = () => v; try { return fn(); } finally { _rand = saved; } };
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

test("the drunk balk looks one room out for a bench before saying there isn't one (Jacko)", () => {
  G.soc.drunk = 8; G.money = 1000;
  G.room = "ws_gate"; G.motoBalkTurn = null; out = []; stub(() => run("motosai to naklua"));
  assert.ok(_MOTO_DRUNK_NO.some(l => text().includes(l.slice(0, 40))), "a hundred metres from Pattaya Tai, there is a truck");
  G.room = "khao_talo"; G.motoBalkTurn = null; out = []; stub(() => run("motosai to naklua"));
  assert.ok(_MOTO_DRUNK_NO_EAST.some(l => text().includes(l.slice(0, 40))), "…and out east there genuinely isn't");
});

test("Nont has no running account with a man he has never done business with (Jacko)", () => {
  _setFlag("hasWallet"); G.room = _npcRoom("nont"); G.nightTurn = 30; G.bank = 50000;
  out = []; run("ask nont about delay");
  assert.match(text(), /not given me anything to be late/);
  G.nontCashed = true; delete G.talked.nont; out = []; run("ask nont about delay");
  assert.match(text(), /Nothing's late|Tomorrow/);
});

test("one dawn, not two: her goodbye is the morning when you have company (Jacko)", () => {
  G.room = "beach_rd_c"; const her = "lek";
  G.party = { ids: [her], stops: 2, spent: 0, seen: {} };
  G.nightTurn = 99; out = []; stub(() => _endNight("allnighter"));
  const skies = (text().match(/sky/gi) || []).length;
  assert.ok(skies <= 1, `two skies and two taxis printed (${skies})`);
  assert.ok(_PARTY_DAWN.some(l => text().includes(l.split("{")[0].slice(0, 30))), "hers is the one that prints");
});

test("a girl who asks you to barfine her cannot then call you a cheap charlie (Jacko)", () => {
  G.room = "las_vegas"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.soc.drinkCount = { [g]: 0 }; G.soc.drinks = { [g]: 4 };
  // the dice that always call it: without the invite this is a refusal…
  G.soc.bfRefused = {}; const before = stub(() => _bfRefusal(g, "gogo"), 0.1);
  assert.match(String(before && before.kind), /cheap|dislike/);
  // …and with it, never (a held refusal is cleared: she asked tonight)
  G.soc.goWith = { [g]: true };
  for (let i = 0; i < 20; i++) {
    G.soc.bfRefused = {};
    const r = stub(() => _bfRefusal(g, "gogo"), 0.1);
    assert.doesNotMatch(String(r && r.kind), /cheap|dislike/, "she opened the subject");
  }
});

test("the massage shop has somebody in it, and Auntie Nok sells the mango she offers (Roland)", () => {
  for (const r of Object.keys(ROOMS).filter(x => ROOMS[x].massage || ROOMS[x].soapy)) {
    G.room = r; out = []; run("talk to masseuse");
    assert.doesNotMatch(text(), /No one here answers|Nobody by that name/, r);
  }
  G.room = "thai_massage"; out = []; run("talk to masseuse"); assert.match(text(), /Pensri/, "the shop with a named woman sends you to her");
  G.room = "jomtien_soi_7_beach_end"; G.money = 500; G.hunger = 60; const m = G.money;
  out = []; run("buy mango"); assert.equal(G.money, m - 30); assert.match(text(), /Auntie Nok/);
  G.room = "jomtien_beach_rd"; G.hunger = 60; out = []; run("buy mango");
  assert.doesNotMatch(text(), /Auntie Nok/, "she is two rooms south, at her pitch");
});
