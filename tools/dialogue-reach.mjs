#!/usr/bin/env node
// Is the dialogue nobody has seen UNREACHABLE, or merely UNVISITED?
//
// `coverage.mjs --union` reports "authored dialogue delivered 32.7%" — the
// project's sharpest number and the one furthest from its ceiling. It says how
// much has been shown; it has never said why the rest hasn't. Two very different
// answers hide in that one figure:
//
//   UNVISITED  — an ungated line nobody happened to ask for. More play reaches it.
//   GATED      — behind a bond tier, a stage, a flag, a closure. More play of the
//                same shape never reaches it, and writing more of the same is
//                pouring water into a bucket with the tap closed.
//
// Pure query over docs/world-graph.json and docs/coverage/*.json — no engine
// load, which is the point of having a derived substrate.
//
//   node tools/dialogue-reach.mjs            # the breakdown
//   node tools/dialogue-reach.mjs --gaps     # …and the biggest unseen ungated characters
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const G = JSON.parse(fs.readFileSync(root + "docs/world-graph.json", "utf8"));
const wantGaps = process.argv.includes("--gaps");

// what any recorded session has actually been shown
const seen = new Set();
const covDir = root + "docs/coverage/";
let sessions = 0;
for (const f of fs.readdirSync(covDir).filter(f => f.endsWith(".json"))) {
  const c = JSON.parse(fs.readFileSync(covDir + f, "utf8"));
  if (!c.dlg && !c.patDlg) continue;
  sessions++;
  for (const k of [...(c.dlg || []), ...(c.patDlg || [])]) seen.add(k);
}

const npc = Object.fromEntries(G.npcs.map(n => [n.id, n]));

// The single reason a player has not been shown this line. Ordered: the FIRST
// thing standing in the way is the one that matters, because it is the one that
// would have to change.
function gateOf(d) {
  const n = npc[d.npc] || {};
  if (n.filler) return "filler (pool-generated)";
  if (n.offmap) return "offmap (phone only)";
  if (d.bond) return `bond tier ${d.bond}`;
  const req = d.req || [];
  if (req.includes("expatLife")) return "expat stage";
  if (req.length) return "a flag being set";
  if (d.hasWhen) return "a when() closure";
  if ((d.notFlags || []).length) return "only BEFORE a flag";
  if (d.chip === false) return "off the chip bar (typed only)";
  if (d.deflect) return "a deflect";
  if (!d.topic) return "the greeting (first match wins)";
  return "nothing — just never asked";
}

const rows = new Map();
for (const d of G.dialogue) {
  const g = gateOf(d);
  const r = rows.get(g) || { gate: g, total: 0, seen: 0, unseen: [] };
  r.total++;
  if (seen.has(d.key)) r.seen++; else r.unseen.push(d);
  rows.set(g, r);
}

const all = [...rows.values()].sort((a, b) => (b.total - a.total));
const tot = G.dialogue.length, sawn = [...seen].filter(k => G.dialogue.some(d => d.key === k)).length;
const pad = (s, n) => String(s).padEnd(n);
const pct = (a, b) => b ? (a / b * 100).toFixed(0).padStart(3) + "%" : "  —";

console.log(`\ndialogue reach — ${tot} nodes, ${sessions} recorded sessions\n`);
console.log(pad("what stands in the way", 32) + pad("nodes", 7) + pad("seen", 7) + "reached");
console.log("─".repeat(60));
for (const r of all)
  console.log(pad(r.gate, 32) + pad(r.total, 7) + pad(r.seen, 7) + pct(r.seen, r.total));
console.log("─".repeat(60));
console.log(pad("", 32) + pad(tot, 7) + pad(sawn, 7) + pct(sawn, tot));

// The headline: of everything unseen, how much is merely unvisited?
const unseenTotal = tot - sawn;
const unvisited = (rows.get("nothing — just never asked") || { unseen: [] }).unseen.length;
const filler = (rows.get("filler (pool-generated)") || { unseen: [] }).unseen.length;
// The number that actually means something. coverage.mjs calls its figure
// "authored dialogue delivered" and counts EVERY NPC — so 1,809 of its 2,875
// are filler nodes generated from a handful of shared pools by hash, and the
// headline has always been measured against a denominator that is mostly
// duplicated by construction.
const auth = G.dialogue.filter(d => !(npc[d.npc] || {}).filler);
const authSeen = auth.filter(d => seen.has(d.key)).length;
console.log(`AUTHORED ONLY (filler excluded): ${authSeen} of ${auth.length} — ${pct(authSeen, auth.length).trim()} delivered`);
console.log(`(coverage.mjs counts all ${tot} and calls it "authored", which is where 33% comes from)`);

console.log(`\nof ${unseenTotal} nodes nobody has been shown:`);
console.log(`  ${String(filler).padStart(5)} are filler — pool-generated from the same few pools, so`);
console.log(`        showing one girl's is very nearly showing them all`);
console.log(`  ${String(unvisited).padStart(5)} are UNGATED authored lines — merely never asked for`);
console.log(`  ${String(unseenTotal - filler - unvisited).padStart(5)} are gated behind something\n`);

if (wantGaps) {
  const ung = (rows.get("nothing — just never asked") || { unseen: [] }).unseen;
  const by = new Map();
  for (const d of ung) by.set(d.npc, (by.get(d.npc) || 0) + 1);
  console.log("the ungated, unseen authored lines, by character (top 25):");
  for (const [id, n] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    const m = npc[id] || {};
    console.log(`  ${pad((m.name || id) + (m.room ? ` — ${m.room}` : ""), 44)} ${String(n).padStart(3)} unseen of ${m.dialogueCount}`);
  }
  console.log();
}
