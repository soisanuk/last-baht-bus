#!/usr/bin/env node
// Generate docs/world-graph.json — the game's own structure as nodes and edges.
//
//   node tools/gen-world-graph.mjs          # write docs/world-graph.json
//   node tools/gen-world-graph.mjs --check  # verify it's up to date (exit 1 on drift)
//   node tools/gen-world-graph.mjs --stats  # counts only, no write
//
// WHY THIS EXISTS. docs/persona-findings-systemic.md §2 names the shape every
// class the last four persona waves found shares: **a fact the engine already
// holds, consulted in some places and not in others**. Nothing in the repo could
// answer a set question about the world — which flags are set and never read,
// which topics go dark when a quest completes, which functions consult a
// predicate — because every such answer needed a hand-written list, and a
// hand-written list encodes the same mental model as the code it checks
// (testing-gap-analysis.md §3: the instruments fail together).
//
// So this is a SUBSTRATE, not an instrument. It is a pure function of
// web/js/*.js — nothing in it is authored, and `--check` is what keeps it that
// way. Queries stand on top of it (tools/dialogue-lifecycle.mjs, the orphan
// report in tests/js/graph.test.js, the CONSULTS report in
// tests/js/predicates.test.js); a NEW query is a few lines against the JSON
// instead of another vm-load and another harvest.
//
// It is NOT canon, NOT read at runtime, and NOT a second source of truth: the
// sources are. Same doctrine as docs/scene-manifest.json — regenerate it, never
// hand-edit it. Last-writer-correct on a rebase conflict: take either side and
// re-run the generator.
//
// Two kinds of node come out of the SOURCE TEXT rather than the loaded data,
// because the engine's own behaviour is half the world: every `_setFlag("x")`
// site (a flag the data never sets but the game does), every `_flag("x")` read,
// every top-level numeric constant, and — for the predicate registry — which
// function bodies mention which relationship predicate.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "world-graph.json");

// Same load order as tools/probe.mjs — the engine is classic scripts sharing
// globals, so order is load-bearing and `lang.js` sits where index.html puts it.
const ENGINE_FILES = ["engine-core.js", "engine-encounters.js", "engine-play.js",
  "engine-systems.js", "engine-parser.js"];
const FILES = ["thai.js", "world.js", "games.js", "cli-sim.js", "lang.js", ...ENGINE_FILES];
const SRC = {};
for (const f of FILES) {
  const code = readFileSync(join(ROOT, "web", "js", f), "utf8");
  SRC[f] = code;
  vm.runInThisContext(code, { filename: f });
}

// ── source-text helpers ──────────────────────────────────────────────────────
// Line number of a character offset, 1-based, for file:line citations.
const lineAt = (code, idx) => code.slice(0, idx).split("\n").length;

// A top-level `function NAME(` body, sliced by brace matching. The engine is
// flat classic script — every function this cares about is column 0 — so brace
// matching from the opening `{` is exact enough, and the alternative (a real
// parser) would be a dependency this repo does not have.
const FN_CACHE = new Map();
export function fnBody(name) {
  if (FN_CACHE.has(name)) return FN_CACHE.get(name);
  let found = null;
  for (const f of ENGINE_FILES) {
    const m = new RegExp("^function\\s+" + name + "\\s*\\(", "m").exec(SRC[f]);
    if (!m) continue;
    const s = SRC[f];
    let d = 0, j = s.indexOf("{", m.index);
    for (; j < s.length; j++) {
      const c = s[j];
      if (c === "{") d++;
      else if (c === "}") { d--; if (!d) { j++; break; } }
    }
    found = { file: f, line: lineAt(s, m.index), text: s.slice(m.index, j) };
    break;
  }
  FN_CACHE.set(name, found);
  return found;
}

export function allFnNames() {
  const names = new Set();
  for (const f of ENGINE_FILES)
    for (const m of SRC[f].matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) names.add(m[1]);
  return [...names].sort();
}

// ── Rooms ────────────────────────────────────────────────────────────────────
const ROOM_FLAGS = ["dark", "indoors", "pool", "soapy", "hostBar", "shop", "food",
  "outlet", "atm", "busStop", "motosai", "lockIn", "liveMusic", "vip", "darts",
  "water", "closed", "filler"];

const rooms = [];
const readsSets = [];   // [readNodeKey, flag] — the Shamrock-hatch shape
const edges = [];
const push = (type, from, to, extra) => edges.push({ type, from, to, ...(extra || {}) });

for (const id of Object.keys(ROOMS).sort()) {
  const r = ROOMS[id];
  const node = {
    id, name: r.name || null, bar: r.bar || null, region: r.region || null,
    barType: r.barType || null, drinks: r.drinks || null,
    closesAt: r.closesAt == null ? null : r.closesAt,
    massage: r.massage || null, seven: r.seven || null, owner: r.owner || null,
    invite: r.invite || null,
    exits: Object.keys(r.exits || {}).sort(),
    venues: (r.venues || []).slice().sort(),
    reads: Object.keys(r.reads || {}).sort(),
  };
  for (const f of ROOM_FLAGS) if (r[f]) node[f] = true;
  rooms.push(node);
  for (const dir of Object.keys(r.exits || {}).sort()) push("EXIT", id, r.exits[dir], { dir });
  for (const v of (r.venues || []).slice().sort()) push("VENUE", id, v);
  // A `reads:` value may be an ARRAY of gated nodes resolved first-match like
  // dialogue, and such a node may carry `sets`/`reveal` — that is the fourth way
  // a flag is set (the Shamrock hatch, the only one today, and the reason a
  // graph that only knew dialogue + engine reported `hatchPried` as unsettable).
  for (const k of Object.keys(r.reads || {}).sort()) {
    const v = r.reads[k];
    if (!Array.isArray(v)) continue;
    v.forEach((e, i) => {
      if (!e) return;
      const key = "read:" + id + "." + k + "#" + i;
      for (const f of (e.sets || []).slice().sort()) { push("SETS", key, f); readsSets.push([key, f]); }
      if (e.reveal) push("GIVES", key, e.reveal);
      for (const f of (e.req || []).slice().sort()) push("REQUIRES", key, f);
      for (const f of (e.notFlags || []).slice().sort()) push("FORBIDS", key, f);
    });
  }
}

// ── NPCs ─────────────────────────────────────────────────────────────────────
const NPC_FLAGS = ["manager", "patron", "filler", "house", "offmap", "owner", "hidden",
  "piwin", "ladyboy", "masseuse", "soapyBoss", "protected", "hops", "sandbox"];

const npcs = [];
for (const id of Object.keys(NPCS).sort()) {
  const n = NPCS[id];
  const node = {
    id, name: n.name || null, th: n.th || null, pronoun: n.pronoun || null,
    role: NPC_ROLES[id] || null, title: n.title || null,
    room: n.room || null, bars: n.bars ? n.bars.slice() : null,
    // both are objects, not room ids: `movesTo: {flag, room}` is Bert after the
    // bar goes, `shuttle: {after, until, to}` is Glam's 22:00 walk.
    movesTo: n.movesTo ? { ...n.movesTo } : null,
    shuttle: n.shuttle ? { ...n.shuttle } : null,
    days: n.days ? n.days.slice() : null,
    haunts: n.haunts ? n.haunts.slice() : null,
    avoids: n.avoids ? n.avoids.slice() : null,
    until: n.until == null ? null : n.until,
    fixture: n.fixture || null, rage: n.rage || null,
    personality: n.personality || null, origin: n.origin || null,
    dialogueCount: (n.dialogue || []).length,
  };
  for (const f of NPC_FLAGS) if (n[f]) node[f] = true;
  npcs.push(node);

  // LOCATED — the honest kind matters: a rotating owner is in two places on
  // alternate nights and a shuttle walks after 22:00, so a consumer that wants
  // "where is she" must know which shape it is looking at.
  if (n.offmap) push("LOCATED", id, "(offmap)", { kind: "offmap" });
  else if (Array.isArray(n.bars)) for (const b of n.bars.slice().sort()) push("LOCATED", id, b, { kind: "rotating" });
  else if (n.room) push("LOCATED", id, n.room, { kind: "fixed" });
  if (n.shuttle && n.shuttle.to) push("LOCATED", id, n.shuttle.to, { kind: "movesTo" });
  if (n.movesTo && n.movesTo.room) push("LOCATED", id, n.movesTo.room, { kind: "movesTo" });
}

// ── Dialogue nodes ───────────────────────────────────────────────────────────
// The index IS the identity: _pickDialogue walks the array in order and takes
// the first match, so "Wimon's node 4" is a stable address and its position is
// part of its meaning.
const dialogue = [];
for (const id of Object.keys(NPCS).sort()) {
  const n = NPCS[id];
  (n.dialogue || []).forEach((d, i) => {
    const topics = d.topic ? String(d.topic).split("|").map(s => s.trim()).filter(Boolean) : [];
    const node = {
      key: id + "#" + i, npc: id, index: i,
      topic: d.topic || null, topics,
      req: (d.req || []).slice().sort(),
      notFlags: (d.notFlags || []).slice().sort(),
      hasWhen: !!d.when, bond: d.bond || null,
      sets: (d.sets || []).slice().sort(),
      gives: d.gives || null,
      asks: d.asks && d.asks.key ? d.asks.key : null,
      chip: d.chip === false ? false : null,
      deflect: d.deflect ? true : null,
      hasShort: !!d.short, hasFx: !!(d.fx || d.fxAlways),
    };
    dialogue.push(node);
    for (const f of node.req) push("REQUIRES", node.key, f);
    for (const f of node.notFlags) push("FORBIDS", node.key, f);
    for (const f of node.sets) push("SETS", node.key, f);
    if (node.gives) push("GIVES", node.key, node.gives);
  });
}

// ── Quests ───────────────────────────────────────────────────────────────────
const quests = [];
// `at:` may be a FUNCTION — a two-leg quest's where-clause follows the step
// (safecracker: pim, then Oy; lake_errand: Nont, then his mother), which is
// exactly the fix that stopped HINT pointing at leg one forever. A graph that
// only understood the string form emitted an edge to `undefined` for both, so
// the targets are read out of the closure's own source: every string literal in
// it that names a room or an NPC is a place the quest can send you.
const atTargets = (at) => {
  if (typeof at === "string") return [at];
  if (typeof at !== "function") return [];
  return [...new Set([...String(at).matchAll(/"([A-Za-z0-9_]+)"|'([A-Za-z0-9_]+)'/g)]
    .map(m => m[1] || m[2]).filter(t => ROOMS[t] || NPCS[t]))].sort();
};
for (const id of Object.keys(QUESTS).sort()) {
  const q = QUESTS[id];
  const ats = atTargets(q.at);
  quests.push({
    id, name: q.name || null, giver: q.giver || null, giverIfSelf: q.giverIfSelf || null,
    deps: (q.deps || []).slice().sort(), reqFlags: (q.reqFlags || []).slice().sort(),
    doneFlag: q.doneFlag || null,
    at: typeof q.at === "string" ? q.at : null,
    atDynamic: typeof q.at === "function" ? true : null,
    atTargets: ats,
    item: q.item || null,
    trust: q.trust == null ? null : q.trust, reward: q.reward == null ? null : q.reward,
    legs: q.legs || null, noNudge: q.noNudge || null,
  });
  for (const d of (q.deps || []).slice().sort()) push("DEPENDS", id, d);
  if (q.doneFlag) push("DONE_BY", id, q.doneFlag);
  for (const f of (q.reqFlags || []).slice().sort()) push("REQUIRES", id, f);
  if (q.giver) push("GIVEN_BY", id, q.giver);
  if (q.giverIfSelf) push("GIVEN_BY", id, q.giverIfSelf);
  for (const t of ats)
    push("AT", id, t, { kind: ROOMS[t] ? "room" : NPCS[t] ? "npc" : "unresolved" });
  if (q.item) push("GIVES", id, q.item);
}

// ── Items ────────────────────────────────────────────────────────────────────
const items = [];
for (const id of Object.keys(ITEMS).sort()) {
  const it = ITEMS[id];
  items.push({
    id, name: it.name || null, location: it.location === undefined ? null : it.location,
    kind: it.kind || null, portable: it.portable ? true : null,
    keepsafe: it.keepsafe ? true : null,
    gives: it.gives || null,
    aliases: (it.aliases || []).slice().sort(),
  });
}

// ── Encounters ───────────────────────────────────────────────────────────────
const encounters = [];
for (const id of Object.keys(ENCOUNTERS).sort()) {
  const e = ENCOUNTERS[id];
  encounters.push({
    id, rooms: (e.rooms || []).slice().sort(),
    nightly: !!e.nightly, solo: !!e.solo, interactive: !!e.interactive,
  });
}

// ── Constants ────────────────────────────────────────────────────────────────
// Top-level `const UPPER_CASE = <number>`. The reference lint already guards
// hard-coded ฿ figures; this is the other half — the value, so a query can ask
// "where does this number get interpolated" without knowing the name.
const constants = [];
const constIdx = new Map();
for (const f of ["world.js", ...ENGINE_FILES]) {
  for (const m of SRC[f].matchAll(/^const\s+([A-Z][A-Z0-9_]{2,})\s*=\s*(-?\d+(?:\.\d+)?)\s*;/gm)) {
    if (constIdx.has(m[1])) continue;   // first declaration wins, as the loader does
    const c = { name: m[1], value: Number(m[2]), file: f, line: lineAt(SRC[f], m.index) };
    constIdx.set(m[1], c);
    constants.push(c);
  }
}
constants.sort((a, b) => a.name.localeCompare(b.name));
// INTERPOLATES — best effort, and deliberately so: the point is to locate the
// quote sites of a price, not to prove a count. A bare mention inside the
// declaration itself is skipped.
for (const c of constants) {
  const re = new RegExp("(?<![A-Za-z0-9_$.])" + c.name + "(?![A-Za-z0-9_$])", "g");
  for (const f of ["world.js", ...ENGINE_FILES]) {
    for (const m of SRC[f].matchAll(re)) {
      const line = lineAt(SRC[f], m.index);
      if (f === c.file && line === c.line) continue;
      push("INTERPOLATES", c.name, f + ":" + line);
    }
  }
}

// ── Flags ────────────────────────────────────────────────────────────────────
// A flag is set three ways and read two, and a graph that only knew the data
// side would report two thirds of the game's own state as unsettable — which is
// exactly the allowlist world.test.js has to carry by hand.
const flags = new Map();
const flag = name => flags.get(name) || (flags.set(name, {
  name, setByDialogue: [], setByReads: [], setByEngine: [], readByEngine: [],
  readByData: [], requiredBy: [], forbiddenBy: [], doneFlagOf: [], reqFlagOf: [],
}), flags.get(name));
for (const [key, f] of readsSets) flag(f).setByReads.push(key);

for (const d of dialogue) {
  for (const f of d.req) flag(f).requiredBy.push(d.key);
  for (const f of d.notFlags) flag(f).forbiddenBy.push(d.key);
  for (const f of d.sets) flag(f).setByDialogue.push(d.key);
}
for (const q of quests) {
  if (q.doneFlag) flag(q.doneFlag).doneFlagOf.push(q.id);
  for (const f of q.reqFlags) flag(f).reqFlagOf.push(q.id);
}
// A set site is remembered by character SPAN, not by line: `if (_flag("x")) {
// G.flags.x = false; … }` is one line that both reads and clears, and a
// line-granularity exclusion below would have swallowed the read (it did —
// taxiPending reported write-only while the taxi's own resolver reads it).
const setSpans = new Map();   // flag → [[file, start, end], …]
const span = (name, f, start, end) =>
  (setSpans.get(name) || setSpans.set(name, []).get(name)).push([f, start, end]);
for (const f of ENGINE_FILES) {
  for (const m of SRC[f].matchAll(/_setFlag\(\s*"([A-Za-z0-9_]+)"/g)) {
    const at = f + ":" + lineAt(SRC[f], m.index);
    flag(m[1]).setByEngine.push(at);
    span(m[1], f, m.index, m.index + m[0].length);
    push("SET_BY_ENGINE", m[1], at);
  }
  // the direct assignment form — `G.flags.x = true` — is rarer but real
  for (const m of SRC[f].matchAll(/G\.flags\.([A-Za-z0-9_]+)\s*=/g)) {
    const at = f + ":" + lineAt(SRC[f], m.index);
    flag(m[1]).setByEngine.push(at);
    span(m[1], f, m.index, m.index + m[0].length);
    push("SET_BY_ENGINE", m[1], at);
  }
}
// READ is deliberately WIDER than `_flag("x")`. A flag reaches the player three
// other ways the narrow form cannot see: a `G.flags.x` read, a row in a table
// (the score screen's achievements list is `["hitJackpot", "Shut the box"]`),
// and an id passed to a helper. All of those are the flag being CONSULTED, and
// a narrow oracle reported thirty live flags as write-only — the exact false
// positive that teaches somebody to skip the report. So: any mention of the
// flag's name in engine source that is not one of its own set sites.
for (const name of [...flags.keys()]) {
  const f0 = flags.get(name);
  const spans = setSpans.get(name) || [];
  const isSet = (f, i) => spans.some(([sf, s, e]) => sf === f && i >= s && i < e);
  const lit = new RegExp('"' + name + '"', "g");
  const dot = new RegExp("G\\.flags\\." + name + "(?!\\s*=[^=])", "g");
  for (const f of ENGINE_FILES) {
    for (const re of [lit, dot]) {
      re.lastIndex = 0;
      for (const m of SRC[f].matchAll(re)) {
        if (isSet(f, m.index)) continue;
        const at = f + ":" + lineAt(SRC[f], m.index);
        if (f0.readByEngine.includes(at)) continue;
        f0.readByEngine.push(at);
        push("READ_BY_ENGINE", name, at);
      }
    }
  }
  // …and world.js, because a `when(st, G)` closure is DATA that reads a flag.
  // Mort's greeting is gated `!_flag("mortMet")` in world.js and set in world.js,
  // so an engine-only read oracle filed him — and four others — as write-only.
  // A declarative `req`/`notFlags` is already counted above (requiredBy /
  // forbiddenBy); this is the imperative half of the same side of the file.
  lit.lastIndex = 0;
  for (const m of SRC["world.js"].matchAll(lit)) {
    const at = "world.js:" + lineAt(SRC["world.js"], m.index);
    if (f0.readByData.includes(at)) continue;
    // its own `sets:`/`req:`/`notFlags:` rows are not reads
    const ctx = SRC["world.js"].slice(Math.max(0, m.index - 60), m.index);
    if (/\b(sets|req|notFlags|reqFlags|doneFlag)\s*:\s*\[?[^\]]*$/.test(ctx)) continue;
    f0.readByData.push(at);
    push("READ_BY_DATA", name, at);
  }
}
const flagList = [...flags.values()].sort((a, b) => a.name.localeCompare(b.name));
for (const f of flagList) for (const k of Object.keys(f)) if (Array.isArray(f[k])) f[k].sort();

// ── Predicates ───────────────────────────────────────────────────────────────
// The relationship predicates of docs/persona-findings-systemic.md class I: a
// fact the engine holds about the player's current entanglements, whose CORE
// consults it and whose EDGES keep not to. Derived, not authored: a predicate
// is a zero-arg `function _xLive()`-shaped helper named below, plus the two raw
// state reads that have no helper. What IS authored is which functions MUST
// consult each — that list is tests/js/predicates.test.js, and CONSULTS is what
// lets that test report the candidates it does not yet carry.
const PREDICATES = [
  { name: "_onRide()", match: "_onRide()", note: "you are on the back of her bike (nightride)" },
  { name: "G.party", match: "G.party", note: "a companion is on your arm (the party barfine)" },
  { name: "_affairLive()", match: "_affairLive()", note: "you are in the staff affair" },
  { name: "_atOwnBar()", match: "_atOwnBar()", note: "you are standing in the bar you own" },
];
const predicates = [];
const fnNames = allFnNames();
for (const p of PREDICATES) {
  const consumers = [];
  for (const fn of fnNames) {
    const b = fnBody(fn);
    if (!b) continue;
    // the predicate's own definition is not a consumer of itself
    if (new RegExp("^function\\s+" + fn.replace(/[$]/g, "\\$") + "\\b").test(b.text) &&
        p.match.replace(/\(\)$/, "") === fn) continue;
    if (b.text.includes(p.match)) { consumers.push(fn); push("CONSULTS", p.name, fn, { file: b.file }); }
  }
  predicates.push({ name: p.name, note: p.note, consumers: consumers.sort() });
}

// ── assemble ─────────────────────────────────────────────────────────────────
edges.sort((a, b) =>
  a.type.localeCompare(b.type) || String(a.from).localeCompare(String(b.from)) ||
  String(a.to).localeCompare(String(b.to)) || String(a.dir || "").localeCompare(String(b.dir || "")));

const graph = {
  note: "DERIVED from web/js/{thai,world,games,cli-sim,lang,engine-*}.js — regenerate " +
    "with `node tools/gen-world-graph.mjs`, never hand-edit. Not canon, not read at " +
    "runtime: a query substrate for the structural audits (docs/persona-findings-systemic.md " +
    "§3). Last-writer-correct on a rebase conflict — take either side and re-run.",
  counts: {
    rooms: rooms.length, npcs: npcs.length, dialogue: dialogue.length,
    quests: quests.length, items: items.length, encounters: encounters.length,
    flags: flagList.length, constants: constants.length, edges: edges.length,
  },
  edgeCounts: edges.reduce((m, e) => (m[e.type] = (m[e.type] || 0) + 1, m), {}),
  rooms, npcs, dialogue, quests, items, encounters,
  flags: flagList, constants, predicates, edges,
};

// Diff-friendliness, two ways. (1) A null or an empty list is the ABSENCE of a
// fact — carrying 365 `"shuttle": null`s says nothing and makes every unrelated
// change a big diff, so absent fields are pruned and a consumer reads `?? null`.
// (2) Keys come out sorted at every level, so field order in the sources can
// never move a line in the JSON.
function prune(v) {
  if (Array.isArray(v)) return v.map(prune);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const x = prune(v[k]);
      if (x === null || x === undefined) continue;
      if (Array.isArray(x) && !x.length) continue;
      o[k] = x;
    }
    return o;
  }
  return v;
}
const json = JSON.stringify(prune(graph), null, 1) + "\n";

if (process.argv.includes("--stats")) {
  console.log(JSON.stringify({ counts: graph.counts, edgeCounts: graph.edgeCounts }, null, 2));
} else if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch { /* missing */ }
  if (current !== json) {
    console.error("docs/world-graph.json is out of date — run: node tools/gen-world-graph.mjs");
    process.exit(1);
  }
  console.log("world-graph.json is up to date (" + graph.counts.edges + " edges over " +
    (graph.counts.rooms + graph.counts.npcs) + " places and people)");
} else {
  writeFileSync(OUT, json);
  console.log("wrote docs/world-graph.json");
  console.log("  " + JSON.stringify(graph.counts));
  console.log("  " + JSON.stringify(graph.edgeCounts));
}
