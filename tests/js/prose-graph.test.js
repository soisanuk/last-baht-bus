// PROSE AGAINST THE GRAPH'S OTHER NODES (the dialogue walk of 2026-11-01, docs/dialogue-walk-2026-11-01.md):
// an encounter's prose against the rooms it fires in, a person's description against the engine's pronoun
// for them, and an item against its single home. Places have tests/js/place-graph.test.js; quests have the
// where-clause rule in tests/js/dialogue1101.test.js; "X works at Y" is tools/prose-claims.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
engineInit(() => {}); newGame();
const GRAPH = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/world-graph.json", import.meta.url)), "utf8"));
const recs = execFileSync("node", [fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url)), "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
const adj = {};
for (const e of GRAPH.edges) if (e.type === "EXIT") { (adj[e.from] = adj[e.from] || new Set()).add(e.to); (adj[e.to] = adj[e.to] || new Set()).add(e.from); }
const near = (a, b) => a === b || (adj[a] || new Set()).has(b);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regionOf = id => ROOMS[id] && ROOMS[id].region;
const REG = [...new Set(Object.values(ROOMS).map(r => r.region).filter(Boolean))];
const regionRe = new RegExp("\\b(" + REG.map(esc).join("|") + ")\\b", "g");
// ordinary-word names stay out, the same list the dossier pivot keeps speaker-only
const WORDY = /^(Ice|Nong|May|Gift|Mind|Joy|Dear|View|Bee|Mem|Pim|Arm|Win|Bank|Rose|Glam|Grace|Cream|Jade|Peach|Candy|Security)$/i;
const npcNames = new Map();
for (const [id, n] of Object.entries(NPCS)) if (n.name && n.name.length > 3 && !n.filler && !WORDY.test(n.name)) (npcNames.get(n.name) || npcNames.set(n.name, new Set()).get(n.name)).add(id);
const npcRe = new RegExp("\\b(" + [...npcNames.keys()].sort((a, b) => b.length - a.length).map(esc).join("|") + ")\\b", "g");
const OK = [
  // settled readings: { ref, name, why }
];
const okd = (ref, name) => OK.some(o => o.ref === ref && o.name === name);

test("the corpus and the graph are both collecting", () => {
  assert.ok(recs.length > 10000); assert.ok(GRAPH.encounters.length > 10); assert.ok(GRAPH.items.length > 20);
});
test("an encounter's prose names no district the encounter never fires in", () => {
  const rooms = Object.fromEntries(GRAPH.encounters.map(e => [e.id, e.rooms || []]));
  const bad = [];
  for (const r of recs) {
    const m = r.ref.match(/^enc\.([a-z0-9_]+)\./); if (!m || !rooms[m[1]].length) continue;
    const regs = new Set(rooms[m[1]].map(regionOf).filter(Boolean)); const text = stripMarkup(String(r.text || ""));
    for (const mm of text.matchAll(regionRe)) if (!regs.has(mm[1]) && !okd(r.ref, mm[1])) bad.push(`${r.ref}: ${mm[1]} (fires in ${[...regs].join("/")})`);
  }
  assert.deepEqual(bad, []);
});
test("an encounter's prose names no person who is never in or beside the rooms it fires in", () => {
  const rooms = Object.fromEntries(GRAPH.encounters.map(e => [e.id, e.rooms || []]));
  const bad = [];
  for (const r of recs) {
    const m = r.ref.match(/^enc\.([a-z0-9_]+)\./); if (!m || !rooms[m[1]].length) continue;
    const text = stripMarkup(String(r.text || ""));
    for (const mm of text.matchAll(npcRe)) { const ids = [...npcNames.get(mm[1])]; if (!ids.some(id => rooms[m[1]].some(rm => near(rm, NPCS[id].room))) && !okd(r.ref, mm[1])) bad.push(`${r.ref}: ${mm[1]} (${ids.map(id => NPCS[id].room).join("/")}) vs ${rooms[m[1]].join(",")}`); }
  }
  assert.deepEqual(bad, []);
});
test("a person's description uses the engine's pronoun for them", () => {
  const bad = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (!n.desc) continue; const pr = _pr(id); const t = String(n.desc).replace(/[“"][^"”]*[”"]/g, " ");
    const he = (t.match(/\b(he|him|his)\b/gi) || []).length, she = (t.match(/\b(she|her|hers)\b/gi) || []).length;
    if (pr.s === "she" && he >= 2 && she === 0) bad.push(`${id}: she, desc he/his ×${he}`);
    if (pr.s === "he" && she >= 2 && he === 0) bad.push(`${id}: he, desc she/her ×${she}`);
  }
  assert.deepEqual(bad, []);
});
test("an item has one home: a room to lie in or a node that hands it over, never both", () => {
  const given = new Set(GRAPH.edges.filter(e => e.type === "GIVES").map(e => e.to));
  const both = GRAPH.items.filter(i => i.location && i.location !== "inventory" && given.has(i.id)).map(i => i.id);
  assert.deepEqual(both, []);
});
