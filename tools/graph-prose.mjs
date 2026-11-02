#!/usr/bin/env node
// GRAPH PROSE — read the prose SIDEWAYS along the world graph's edges, so a claim about the RELATION between two
// nodes (two rooms, a quest and its closer, an item and its home) is checked against the graph that holds it.
// The dialogue walk of 2026-11-01 (docs/dialogue-walk-2026-11-01.md; method: docs/prose-review-method.md §4).
//
//   node tools/graph-prose.mjs --places     # next door / direction / closing hour claims vs EXIT edges, ROOM_GEO, _closeTurn
//   node tools/graph-prose.mjs --pairs      # adjacent room pairs whose own prose names each other — a READER's dump
//   node tools/graph-prose.mjs --quests     # per quest: giver, at, who sets the doneFlag, prose that names a place/person outside
//   node tools/graph-prose.mjs --items      # an item named within 50 chars of a place or person vs its home and its hand (noisy; read it)
//   node tools/graph-prose.mjs --encounters # an encounter's prose vs the regions/people of the rooms it fires in
//   node tools/graph-prose.mjs              # all of them
//
// The GATED parts live in tests/js/place-graph.test.js, tests/js/prose-graph.test.js and the quest where-clause
// rule in tests/js/dialogue1101.test.js; this tool is the same logic with the noisy modes kept for a reader.
// Pitfalls that each cost a round, kept as code: a direction word is bound to the name it modifies, not the nearest
// one; "south OF X" means X lies north; "Soi N" is per district; adjacency is the walked graph (exits) while
// bearings are the survey (ROOM_GEO) — never bend one to flatter the other; an item's prose names its DESTINATION
// far more often than its home.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f + ".js" });
engineInit(() => {}); newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" }; _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation";
const GRAPH = JSON.parse(readFileSync(new URL("../docs/world-graph.json", import.meta.url), "utf8"));
const recs = execFileSync("node", [new URL("prose-corpus.mjs", import.meta.url).pathname, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
const args = process.argv.slice(2), want = m => !args.length || args.includes("--" + m);
const adj = {}; for (const e of GRAPH.edges) if (e.type === "EXIT") { (adj[e.from] = adj[e.from] || new Set()).add(e.to); (adj[e.to] = adj[e.to] || new Set()).add(e.from); }
const hops = (a, b) => { if (a === b) return 0; const seen = new Set([a]); let fr = [a]; for (let d = 1; d <= 8; d++) { const nx = []; for (const x of fr) for (const y of (adj[x] || [])) { if (y === b) return d; if (!seen.has(y)) { seen.add(y); nx.push(y); } } fr = nx; if (!fr.length) break; } return 99; };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regionOf = id => ROOMS[id] && ROOMS[id].region;
const names = new Map(); for (const [id, r] of Object.entries(ROOMS)) for (const n of [r.name, r.bar]) if (n && n.length > 4 && !/^(the )?(bar|office|beach|market|hotel|your room)$/i.test(n)) (names.get(n) || names.set(n, new Set()).get(n)).add(id);
const nameRe = new RegExp("\\b(" + [...names.keys()].sort((a, b) => b.length - a.length).map(esc).join("|") + ")\\b", "g");
const WORDY = /^(Ice|Nong|May|Gift|Mind|Joy|Dear|View|Bee|Mem|Pim|Arm|Win|Bank|Rose|Glam|Grace|Cream|Jade|Peach|Candy|Security)$/i;
const npcNames = new Map(); for (const [id, n] of Object.entries(NPCS)) if (n.name && n.name.length > 3 && !n.filler && !WORDY.test(n.name)) (npcNames.get(n.name) || npcNames.set(n.name, new Set()).get(n.name)).add(id);
const npcRe = new RegExp("\\b(" + [...npcNames.keys()].sort((a, b) => b.length - a.length).map(esc).join("|") + ")\\b", "g");
const REG = [...new Set(Object.values(ROOMS).map(r => r.region).filter(Boolean))];
const regionRe = new RegExp("\\b(" + REG.map(esc).join("|") + ")\\b", "g");
const roomOf = ref => { const m = ref.match(/^room\.([a-z0-9_]+)\./); return m ? m[1] : null; };
const text = r => stripMarkup(String(r.text || ""));
const sq = s => s.replace(/\s+/g, " ").trim();
const bearing = (a, b) => { const [la1, lo1] = ROOM_GEO[a], [la2, lo2] = ROOM_GEO[b]; const dy = la2 - la1, dx = (lo2 - lo1) * Math.cos(la1 * Math.PI / 180); return ((Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 360; };
const section = (t, rows) => { console.log(`\n── ${t} (${rows.length})`); for (const r of rows) console.log("  " + r); };

if (want("places")) {
  const PROX = /\b(next door|next-door|across the (?:road|soi|street)|opposite|beside|two doors|round the corner|around the corner|next to|over the road|across from)\b/i;
  const D = "(north|south|east|west)(?:-?(?:east|west))?";
  const nb = [], dir = [], hrs = [];
  for (const r of recs) {
    const t = text(r), here = roomOf(r.ref);
    if (here && adj[here]) for (const m of t.matchAll(nameRe)) {
      const n = m[1]; let ids = [...names.get(n)].filter(id => id !== here); if (/^Soi \d+$/.test(n)) ids = ids.filter(id => regionOf(id) === regionOf(here)); if (!ids.length) continue;
      const win = t.slice(Math.max(0, m.index - 60), m.index + n.length + 60); const best = Math.min(...ids.map(id => hops(here, id)));
      if (PROX.test(win) && best > 2) nb.push(`${r.ref}: ${ROOMS[here].name} puts ${n} nearby, ${best === 99 ? "not connected" : best + " hops"}: "${sq(win)}"`);
      if (!ROOM_GEO[here]) continue; const tgt = ids.find(id => ROOM_GEO[id]); if (!tgt) continue;
      const before = t.slice(Math.max(0, m.index - 34), m.index), after = t.slice(m.index + n.length, m.index + n.length + 30);
      let wantD = null, inv = false, quote = null;
      let mm = before.match(new RegExp("\\b(?:just |due |a block |one soi |two sois |straight |further |farther )?" + D + "\\s+(of|from|toward|towards|to|up|down|along|past|into)\\s+(?:the\\s+)?$", "i"));
      if (mm) { wantD = mm[1].toLowerCase(); inv = /^(of|from)$/i.test(mm[2]); quote = mm[0] + n; }
      else { mm = after.match(new RegExp("^\\s+(?:runs |run |is |lies |sits |goes |heads |comes out |a block |just )?" + D + "\\b", "i")); if (mm) { wantD = mm[1].toLowerCase(); quote = n + mm[0]; } }
      if (!wantD) continue;
      const brg = bearing(here, tgt); let c = { north: 0, east: 90, south: 180, west: 270 }[wantD]; if (inv) c = (c + 180) % 360;
      const diff = Math.min(Math.abs(brg - c), 360 - Math.abs(brg - c));
      if (diff > 75) dir.push(`${r.ref}: ${ROOMS[here].name} → ${n} at ${Math.round(brg)}°, prose wants ~${c}°: "${sq(quote)}"`);
    }
    for (const m of t.matchAll(nameRe)) {
      const n = m[1], win = t.slice(m.index, m.index + n.length + 90);
      const hm = win.match(/\b(?:shuts?|close[sd]?|closing|open (?:till|until)|till|until)\s+(?:at\s+)?(two|2|midnight|twelve|eleven|11|dawn|six|6|one|1|three|3)\b/i); if (!hm) continue;
      const H = { two: 80, "2": 80, midnight: 60, twelve: 60, eleven: 50, "11": 50, dawn: 120, six: 120, "6": 120, one: 70, "1": 70, three: 90, "3": 90 }[hm[1].toLowerCase()];
      for (const id of names.get(n)) { const ct = _closeTurn(id); if (ct != null && Math.abs(ct - H) > 5) hrs.push(`${r.ref}: ${n} "${hm[1]}" (turn ${H}) vs _closeTurn ${ct}: "${sq(win).slice(0, 120)}"`); }
    }
  }
  section("places: next door that is not", nb); section("places: direction against the survey", dir); section("places: closing hour against _closeTurn", hrs);
}
if (want("pairs")) {
  const pairs = new Map(); const byRef = new Map(recs.map(r => [r.ref, r]));
  for (const r of recs) { const here = roomOf(r.ref); if (!here) continue; for (const m of text(r).matchAll(nameRe)) for (const id of names.get(m[1])) if (id !== here && (adj[here] || new Set()).has(id)) { const k = [here, id].sort().join(" ↔ "); (pairs.get(k) || pairs.set(k, new Set()).get(k)).add(r.ref); } }
  console.log(`\n── pairs: ${pairs.size} adjacent rooms whose own prose names each other (read each pair as one document)`);
  for (const [k, refs] of pairs) { const [a, b] = k.split(" ↔ "); console.log(`\n==== ${k}  [${ROOMS[a].name} | ${ROOMS[b].name}]`); for (const ref of refs) { const t = text(byRef.get(ref)); const other = ref.startsWith("room." + a + ".") ? b : a; let i = -1; for (const n of [ROOMS[other].name, ROOMS[other].bar].filter(Boolean)) { i = t.indexOf(n); if (i >= 0) break; } console.log("  · " + ref + ": …" + sq(t.slice(Math.max(0, i - 160), i + 200)) + "…"); } for (const id of [a, b]) console.log("  [" + id + ".desc] " + sq(stripMarkup(String(ROOMS[id].desc || ""))).slice(0, 260) + "…"); }
}
if (want("quests")) {
  const setters = {}; for (const e of GRAPH.edges) if (e.type === "SETS") (setters[e.to] = setters[e.to] || []).push(e.from.split("#")[0]);
  const F = []; console.log("\n── quests: id | giver@room | at (now) → room | doneFlag set by | deps");
  for (const q of GRAPH.quests) {
    const Q = QUESTS[q.id]; const at = _qAt(Q); const atRoom = ROOMS[at] ? at : (NPCS[at] && NPCS[at].room); const who = [...new Set(setters[q.doneFlag] || [])]; const whoRooms = [...new Set(who.map(w => NPCS[w] && NPCS[w].room).filter(Boolean))];
    console.log(`  ${q.id} | ${q.giver}@${NPCS[q.giver] && NPCS[q.giver].room} | ${at}${typeof Q.at === "function" ? " (fn)" : ""} → ${atRoom} | ${who.length ? who.join(",") + " (" + whoRooms.join(",") + ")" : "engine"} | ${(q.deps || []).join(",") || "-"}`);
    if (typeof Q.at !== "function" && who.length && !who.includes(at) && atRoom && whoRooms.length && !whoRooms.includes(atRoom)) F.push(`${q.id}: static at ${at} (${atRoom}) but ${who.join(",")} close it in ${whoRooms.join(",")} — make at a function of the step`);
    const prose = [Q.desc, Q.offer, Q.done].filter(x => typeof x === "string").join(" "); const anchors = [...new Set([NPCS[q.giver] && NPCS[q.giver].room, atRoom, ...whoRooms].filter(Boolean))];
    for (const m of prose.matchAll(nameRe)) { const best = Math.min(...[...names.get(m[1])].flatMap(id => anchors.map(a => hops(a, id)))); if (best > 2) F.push(`${q.id}: prose names ${m[1]}, ${best === 99 ? "not connected" : best + " hops"} from ${anchors.join(",")} (an informant stop? then fine)`); }
    for (const m of prose.matchAll(npcRe)) { const ids = [...npcNames.get(m[1])]; const party = new Set([q.giver, at, ...who]); if (!ids.some(id => party.has(id) || anchors.includes(NPCS[id].room))) F.push(`${q.id}: prose names ${m[1]} who is not giver, target or closer (an informant? then fine)`); }
  }
  section("quests: findings (the first kind is gated; the rest are a reader's)", F);
}
if (want("items")) {
  const givers = {}; for (const e of GRAPH.edges) if (e.type === "GIVES") (givers[e.to] = givers[e.to] || new Set()).add(e.from.split("#")[0]);
  const F = [];
  for (const it of GRAPH.items) {
    if (/^(bottle\d*|glass\d*)$/.test(it.id)) continue;
    const labels = [it.name.replace(/^(a|an|the|your)\s+/i, ""), ...(it.aliases || [])].filter(a => /\s/.test(a) || a.length >= 9).filter(a => !/^(a|an|the) /i.test(a)); if (!labels.length) continue;
    const re = new RegExp("\\b(" + labels.map(esc).join("|") + ")\\b", "gi"); const homes = new Set([it.location, ...[...(givers[it.id] || [])].map(id => NPCS[id] && NPCS[id].room)].filter(Boolean)); const hands = givers[it.id] || new Set(); if (!homes.size) continue;
    for (const r of recs) { const t = text(r); for (const mm of t.matchAll(re)) { const win = t.slice(Math.max(0, mm.index - 55), mm.index + mm[0].length + 55);
      for (const v of win.matchAll(nameRe)) if (![...names.get(v[1])].some(id => [...homes].some(h => hops(h, id) <= 1))) F.push(`${r.ref}: ${it.id} near ${v[1]} — home ${[...homes].join("/")}: "${sq(win)}"`);
      for (const p of win.matchAll(npcRe)) if (![...npcNames.get(p[1])].some(id => hands.has(id) || [...homes].some(h => hops(h, NPCS[id].room) <= 1))) F.push(`${r.ref}: ${it.id} near ${p[1]} — home ${[...homes].join("/")}, hand ${[...hands].join(",") || "none"}: "${sq(win)}"`); } }
  }
  section("items: named near a place or person that is neither its home nor its hand (a DESTINATION is fine — read it)", F);
}
if (want("encounters")) {
  const rooms = Object.fromEntries(GRAPH.encounters.map(e => [e.id, e.rooms || []])); const F = [];
  for (const r of recs) { const m = r.ref.match(/^enc\.([a-z0-9_]+)\./); if (!m || !rooms[m[1]].length) continue; const regs = new Set(rooms[m[1]].map(regionOf).filter(Boolean)); const t = text(r);
    for (const mm of t.matchAll(regionRe)) if (!regs.has(mm[1])) F.push(`${r.ref}: names ${mm[1]}, fires in ${[...regs].join("/")}`);
    for (const mm of t.matchAll(npcRe)) { const ids = [...npcNames.get(mm[1])]; if (!ids.some(id => rooms[m[1]].some(rm => hops(rm, NPCS[id].room) <= 1))) F.push(`${r.ref}: names ${mm[1]} (${ids.map(id => NPCS[id].room).join("/")}), fires in ${rooms[m[1]].join(",")}`); } }
  section("encounters: a district or person the encounter's rooms do not have", F);
}
