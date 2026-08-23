#!/usr/bin/env node
// COVERAGE — how much of this game has anything actually observed?
//
//   node tools/coverage.mjs                      # soak union, all modes
//   node tools/coverage.mjs --seeds 1,2,3 --nights 8
//   node tools/coverage.mjs --gaps               # …and list what was never touched
//   node tools/coverage.mjs --save <file.json>   # score ONE serialized save
//   node tools/coverage.mjs --json
//
// WHY THIS METRIC AND NOT LINE COVERAGE. Every severe defect this project has
// found by playing (docs/playtest-findings-analysis.md) lived in one of two
// places: a mechanic that never fired, or a room/verb/character nobody had
// reached. Line coverage cannot see either — a line is "covered" the moment a
// test touches it, and every one of those bugs sat in lines the suite executed.
// So coverage here means OBSERVED SURFACE: places stood in, words typed, people
// spoken to, authored lines actually delivered, mechanics actually fired.
//
// The headline is the UNION across runs, because a single run's number says
// more about that run than about the game.
//
// HONEST LIMITS, stated in the output rather than hidden:
//   · Some dimensions are INSTRUMENT-LIMITED, not game facts. A random walker
//     cannot climb a dep-gated quest chain (CLAUDE.md), so quest coverage from a
//     soak is ~0 and means nothing about the quests.
//   · `--save` scores a real player's (or persona's) final state on the same
//     scale, which is the only way to compare a human/agent session with the
//     automated one. Verb coverage is unavailable there — a save doesn't record
//     what was typed.
//   · Denominators are what EXISTS, not what is reachable in one playthrough.
//     Several rooms and characters are stage-gated by design, so 100% is not the
//     target and never will be. The number is for tracking movement, not scoring.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "lang", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? (args[i + 1] ?? d) : d; };
const asJson = args.includes("--json");
const showGaps = args.includes("--gaps");
const savePath = flag("save", null);

// ── denominators: what exists ────────────────────────────────────────────────
const ALL_ROOMS = Object.keys(ROOMS);
const ALL_NPCS = Object.keys(NPCS);
const ALL_PATRONS = Object.keys(PATRONS);
const ALL_ENC = Object.keys(ENCOUNTERS);
const ALL_QUESTS = Object.keys(QUESTS);
const DLG_NODES = ALL_NPCS.reduce((n, id) => n + (Array.isArray(NPCS[id].dialogue) ? NPCS[id].dialogue.length : 0), 0);
const PAT_NODES = ALL_PATRONS.reduce((n, id) => n + (Array.isArray(PATRONS[id].dialogue) ? PATRONS[id].dialogue.length : 0), 0);
// the parser's real verb surface — the switch arms, same count the gap analysis used
const PARSER_VERBS = (() => {
  const src = fs.readFileSync(new URL("engine-parser.js", JS), "utf8");
  const s = new Set();
  for (const m of src.matchAll(/case\s+"([a-z0-9 ]+)":/g)) s.add(m[1].split(" ")[0]);
  return [...s];
})();

// ── the union accumulator ────────────────────────────────────────────────────
const U = {
  rooms: new Set(), npcs: new Set(), patrons: new Set(), enc: new Set(),
  questsDone: new Set(), verbs: new Set(), effects: new Set(),
  dlg: new Set(),        // "npcId#index" — an authored line actually delivered
  patDlg: new Set(),
};
function absorb(G) {
  for (const r of Object.keys(G.visited || {})) U.rooms.add(r);
  for (const [id, seen] of Object.entries(G.talked || {})) {
    U.npcs.add(id);
    for (const i of (seen || [])) U.dlg.add(id + "#" + i);
  }
  const pt = (G.patronTalk && G.patronTalk.talked) || {};
  for (const [id, seen] of Object.entries(pt)) {
    U.patrons.add(id);
    for (const i of (seen || [])) U.patDlg.add(id + "#" + i);
  }
  for (const k of Object.keys(G.encDone || {})) U.enc.add(k);
  for (const [q, st] of Object.entries(G.quests || {})) if (st === "done") U.questsDone.add(q);
}

// ── gather ───────────────────────────────────────────────────────────────────
let runs = 0, commands = 0, effectsTotal = 0;
const notes = [];

if (savePath) {
  const G = JSON.parse(fs.readFileSync(savePath, "utf8"));
  absorb(G);
  runs = 1;
  notes.push("scored ONE save — verb coverage is unavailable (a save doesn't record what was typed)");
} else {
  const { runSoak } = await import(new URL("soak.mjs", import.meta.url));
  const seeds = String(flag("seeds", "1,2,3,4,5,6")).split(",").map(Number);
  const nights = Number(flag("nights", 6));
  const modes = String(flag("modes", "act1,vacation,soi6,expat,barowner")).split(",");
  for (const mode of modes) {
    for (const seed of seeds) {
      const r = runSoak({ seed, nights, mode });
      runs++;
      commands += r.stats.commands;
      absorb(G);   // a top-level `let` lands in global LEXICAL scope, not on globalThis
      for (const l of r.transcript) {
        const m = /^❯ ([a-z0-9]+)/.exec(String(l));
        if (m) U.verbs.add(m[1]);
      }
      for (const [id, n] of Object.entries(r.liveness || {})) if (n > 0) U.effects.add(id);
      effectsTotal = Math.max(effectsTotal, Object.keys(r.liveness || {}).length);
    }
  }
  notes.push(`soak union: ${modes.length} modes × ${seeds.length} seeds × ${nights} nights`);
}

// ── report ───────────────────────────────────────────────────────────────────
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
const rows = [
  ["rooms stood in", U.rooms.size, ALL_ROOMS.length, ""],
  ["NPCs spoken to", U.npcs.size, ALL_NPCS.length, ""],
  ["patrons spoken to", U.patrons.size, ALL_PATRONS.length, ""],
  ["authored NPC dialogue delivered", U.dlg.size, DLG_NODES, "the sharpest one: lines a player has actually been shown"],
  ["authored patron dialogue delivered", U.patDlg.size, PAT_NODES, ""],
  ["street encounters seen", U.enc.size, ALL_ENC.length, ""],
  ["quests completed", U.questsDone.size, ALL_QUESTS.length,
    savePath ? "" : "INSTRUMENT-LIMITED: a random walker cannot climb a dep chain"],
];
if (!savePath) {
  rows.splice(3, 0, ["parser verbs typed", U.verbs.size, PARSER_VERBS.length, ""]);
  rows.push(["mechanics fired (liveness)", U.effects.size, effectsTotal, "see EFFECTS in tools/soak.mjs"]);
}

if (asJson) {
  console.log(JSON.stringify({
    runs, commands,
    dims: Object.fromEntries(rows.map(([k, a, b]) => [k, { seen: a, total: b, pct: pct(a, b) }])),
    notes,
  }, null, 1));
  process.exit(0);
}

const w = Math.max(...rows.map(r => r[0].length));
console.log(`\n── LBB observed-surface coverage ──  (${runs} run${runs === 1 ? "" : "s"}` +
  (commands ? `, ${commands.toLocaleString("en-US")} commands` : "") + ")\n");
for (const [name, a, b, note] of rows) {
  const p = pct(a, b);
  const bar = "█".repeat(Math.round(p / 4)).padEnd(25, "·");
  console.log(`  ${name.padEnd(w)}  ${String(a).padStart(5)}/${String(b).padEnd(6)} ${bar} ${String(p).padStart(5)}%` +
    (note ? `\n  ${" ".repeat(w)}  ${note}` : ""));
}
for (const n of notes) console.log(`\n  · ${n}`);
console.log("  · denominators are what EXISTS, not what one playthrough can reach — 100% is not the target");

if (showGaps) {
  const miss = (all, seen) => all.filter(x => !seen.has(x));
  const roomsMissed = miss(ALL_ROOMS, U.rooms);
  console.log(`\n── never entered (${roomsMissed.length}) ──`);
  console.log("  " + roomsMissed.slice(0, 60).join(" ") + (roomsMissed.length > 60 ? " …" : ""));
  if (!savePath) {
    const verbsMissed = miss(PARSER_VERBS, U.verbs);
    console.log(`\n── never typed (${verbsMissed.length}) ──`);
    console.log("  " + verbsMissed.slice(0, 80).join(" ") + (verbsMissed.length > 80 ? " …" : ""));
  }
  const npcsMissed = miss(ALL_NPCS, U.npcs);
  console.log(`\n── never spoken to (${npcsMissed.length}) ──`);
  console.log("  " + npcsMissed.slice(0, 60).join(" ") + (npcsMissed.length > 60 ? " …" : ""));
}
