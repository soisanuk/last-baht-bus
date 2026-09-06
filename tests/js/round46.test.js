// Round 46 (2026-09-06) — Gareth, the girls' stories (lens: filler-girls).
// One life story per rail; an authored girl's fallback hometown agrees with her
// own text; a dropped question still answers a late digit with the drift line.
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

function storyOf(id) {
  const n = NPCS[id];
  if (n.filler) return n.storyIdx;
  const has = t => n.dialogue.some(e => e.topic && new RegExp("\\b" + t + "\\b").test(String(e.topic)));
  const st = _authoredStory(id);
  return { family: has("family") ? null : st.familyIdx, plan: has("plan") ? null : st.planIdx };
}

test("one life story per rail: no two girls at one bar share a family line or a plan line", () => {
  const byRoom = {};
  for (const id of Object.keys(NPCS)) {
    if (NPC_ROLES[id] !== "hostess") continue;
    const room = NPCS[id].room || (NPCS[id].bars || [])[0];
    (byRoom[room] = byRoom[room] || []).push(id);
  }
  let bars = 0;
  for (const [room, ids] of Object.entries(byRoom)) {
    if (ids.length < 2) continue; bars++;
    for (const axis of ["family", "plan"]) {
      const seen = new Map();
      for (const id of ids) {
        const i = storyOf(id)[axis]; if (i == null) continue;
        assert.ok(!seen.has(i), `${_barName(room)}: ${id} and ${seen.get(i)} both tell ${axis} #${i} — "${(axis === "family" ? _H_FAMILY : _H_PLAN)[i]}"`);
        seen.set(i, id);
      }
    }
  }
  assert.ok(bars > 30, "checked the whole town");
  assert.ok(_H_FAMILY.length >= 20 && _H_PLAN.length >= 20, "the pools are deep enough to keep the promise");
});

test("an authored girl's fallback hometown is the province her own text names (Kai: Buriram, not Chaiyaphum)", () => {
  const provs = _H_FROM.map(p => p.replace(/[{}]/g, ""));
  let checked = 0;
  for (const id of Object.keys(NPCS)) {
    if (NPC_ROLES[id] !== "hostess" || NPCS[id].filler) continue;
    const own = NPCS[id].dialogue.map(e => e.text || "").join(" ");
    const named = provs.find(p => own.includes(p)); if (!named) continue;
    checked++;
    assert.equal(_authoredStory(id).from.replace(/[{}]/g, ""), named, id);
  }
  assert.ok(checked >= 4);
  // and the miss path speaks it
  G.room = "golden_dragon"; G.nightTurn = 20; G.known.kai = true;
  out = []; run("talk to kai", "ask kai about home");
  assert.match(text(), /Buriram/); assert.doesNotMatch(text(), /Chaiyaphum/);
});

test("a question dropped by a change of subject or a vanished partner still answers a late digit with the drift line", () => {
  G.room = "candy_bar"; G.nightTurn = 10;
  run("talk to bua"); assert.ok(G.convoQ, "she asked");
  run("do you like pattaya");         // a question back at her drops hers
  assert.equal(G.convoQ, null);
  out = []; run("1");
  assert.match(text(), /drifted past/); assert.doesNotMatch(text(), /didn't understand/);
  // partner gone
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; _setFlag("act1Done"); G.stage = "vacation";
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
  G.room = "candy_bar"; G.nightTurn = 10; run("talk to bua"); assert.ok(G.convoQ);
  G.room = "buakhao_s"; _convoActive();
  out = []; run("1");
  assert.match(text(), /drifted past/); assert.doesNotMatch(text(), /didn't understand/);
});
