// THE PLACE GRAPH (the dialogue walk of 2026-11-01, docs/dialogue-walk-2026-11-01.md). Every string that puts
// one location NEXT TO another, in a DIRECTION from another, or at a CLOSING HOUR, checked against the world
// graph's EXIT edges, the survey (ROOM_GEO) and _closeTurn. What it does not repeat: references.test.js already
// joins a venue to its district ("a venue placed in a district by prose is actually IN that district") and
// tools/prose-claims.mjs already checks "X works at Y"; this is the RELATION between two places.
//
// The two geometries are kept apart on purpose (docs/geography notes): adjacency is the bar-mat map (exits),
// bearings are the survey (ROOM_GEO, never walked). A direction a room's prose asserts is a claim about the
// world, so it is judged against the survey with a wide tolerance (±75°); "next door" / "across the road" is
// judged against the walked graph (two hops: the venue, its street node, the next venue).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
engineInit(() => {});
const GRAPH = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/world-graph.json", import.meta.url)), "utf8"));
const recs = execFileSync("node", [fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url)), "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
// settled readings go here with the reason, like the reference lint's collision list
const OK = [
  // (none yet)
];
const adj = {};
for (const e of GRAPH.edges) if (e.type === "EXIT") { (adj[e.from] = adj[e.from] || new Set()).add(e.to); (adj[e.to] = adj[e.to] || new Set()).add(e.from); }
const hops = (a, b) => { if (a === b) return 0; const seen = new Set([a]); let fr = [a]; for (let d = 1; d <= 6; d++) { const nx = []; for (const x of fr) for (const y of (adj[x] || [])) { if (y === b) return d; if (!seen.has(y)) { seen.add(y); nx.push(y); } } fr = nx; if (!fr.length) break; } return 99; };
const SKIP = new Set(["the bar", "bar", "the office", "office", "the beach", "beach", "market", "the market", "hotel", "the hotel", "your room"]);
const names = new Map();
for (const [id, r] of Object.entries(ROOMS)) for (const n of [r.name, r.bar]) if (n && !SKIP.has(n.toLowerCase()) && n.length > 4) (names.get(n) || names.set(n, new Set()).get(n)).add(id);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameRe = new RegExp("\\b(" + [...names.keys()].sort((a, b) => b.length - a.length).map(esc).join("|") + ")\\b", "g");
const regionOf = id => ROOMS[id] && ROOMS[id].region;
const roomOf = ref => { const m = ref.match(/^room\.([a-z0-9_]+)\./); return m ? m[1] : null; };
const PROX = /\b(next door|next-door|across the (?:road|soi|street)|opposite|beside|two doors|round the corner|around the corner|next to|over the road|across from)\b/i;
const D = "(north|south|east|west)(?:-?(?:east|west))?";
const bearing = (a, b) => { const [la1, lo1] = ROOM_GEO[a], [la2, lo2] = ROOM_GEO[b]; const dy = la2 - la1, dx = (lo2 - lo1) * Math.cos(la1 * Math.PI / 180); return ((Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 360; };
const findings = { neighbour: [], direction: [], hours: [] };
const okd = (ref, n) => OK.some(o => o.ref === ref && o.name === n);
for (const r of recs) {
  const text = stripMarkup(String(r.text || ""));
  const here = roomOf(r.ref);
  if (here && adj[here]) for (const m of text.matchAll(nameRe)) {
    const n = m[1]; let ids = [...names.get(n)].filter(id => id !== here);
    if (/^Soi \d+$/.test(n)) ids = ids.filter(id => regionOf(id) === regionOf(here));   // a numbered soi is per district
    if (!ids.length || okd(r.ref, n)) continue;
    const win = text.slice(Math.max(0, m.index - 60), m.index + n.length + 60).replace(/\s+/g, " ");
    const best = Math.min(...ids.map(id => hops(here, id)));
    if (PROX.test(win) && best > 2) findings.neighbour.push(`${r.ref}: ${ROOMS[here].name} puts ${n} nearby but it is ${best === 99 ? "not connected" : best + " hops away"}: "${win.trim()}"`);
    if (!ROOM_GEO[here]) continue;
    const tgt = ids.find(id => ROOM_GEO[id]); if (!tgt) continue;
    const before = text.slice(Math.max(0, m.index - 34), m.index), after = text.slice(m.index + n.length, m.index + n.length + 30);
    let want = null, inv = false, quote = null;
    let mm = before.match(new RegExp("\\b(?:just |due |a block |one soi |two sois |straight |further |farther )?" + D + "\\s+(of|from|toward|towards|to|up|down|along|past|into)\\s+(?:the\\s+)?$", "i"));
    if (mm) { want = mm[1].toLowerCase(); inv = /^(of|from)$/i.test(mm[2]); quote = mm[0] + n; }
    else { mm = after.match(new RegExp("^\\s+(?:runs |run |is |lies |sits |goes |heads |comes out |a block |just )?" + D + "\\b", "i")); if (mm) { want = mm[1].toLowerCase(); quote = n + mm[0]; } }
    if (!want) continue;
    const brg = bearing(here, tgt);
    let centre = { north: 0, east: 90, south: 180, west: 270 }[want]; if (inv) centre = (centre + 180) % 360;   // "south OF X": X lies north of here
    const diff = Math.min(Math.abs(brg - centre), 360 - Math.abs(brg - centre));
    if (diff > 75) findings.direction.push(`${r.ref}: ${ROOMS[here].name} → ${n} is at survey bearing ${Math.round(brg)}°, the prose wants ~${centre}°: "${quote.replace(/\s+/g, " ").trim()}"`);
  }
  for (const m of text.matchAll(nameRe)) {
    const n = m[1]; if (okd(r.ref, n)) continue;
    const win = text.slice(m.index, m.index + n.length + 90);
    const hm = win.match(/\b(?:shuts?|close[sd]?|closing|open (?:till|until)|till|until)\s+(?:at\s+)?(two|2|midnight|twelve|eleven|11|dawn|six|6|one|1|three|3)\b/i);
    if (!hm) continue;
    const H = { two: 80, "2": 80, midnight: 60, twelve: 60, eleven: 50, "11": 50, dawn: 120, six: 120, "6": 120, one: 70, "1": 70, three: 90, "3": 90 }[hm[1].toLowerCase()];
    for (const id of names.get(n)) { const ct = _closeTurn(id); if (ct != null && Math.abs(ct - H) > 5) findings.hours.push(`${r.ref}: ${n} said to close at "${hm[1]}" (turn ${H}); _closeTurn says ${ct}: "${win.replace(/\s+/g, " ").trim().slice(0, 120)}"`); }
  }
}
test("the place graph is collecting (guards against a silent break)", () => {
  assert.ok(recs.length > 10000, "corpus records");
  assert.ok(Object.keys(adj).length > 200, "exit edges");
  assert.ok(names.size > 150, "place names");
});
test("a room's prose puts 'next door' only on a place the walked graph puts within two hops", () => {
  assert.deepEqual(findings.neighbour, []);
});
test("a direction a room's prose asserts about another place agrees with the survey (±75°)", () => {
  assert.deepEqual(findings.direction, []);
});
test("a closing hour the prose gives a named venue is the hour _closeTurn keeps", () => {
  assert.deepEqual(findings.hours, []);
});
// the checks must be able to go red: a planted claim is caught
test("--mutate: a planted 'next door' to a place four hops away is caught", () => {
  const far = Object.keys(ROOMS).find(id => adj[id] && hops("lucky_tiger", id) >= 4 && ROOMS[id].bar && ROOM_GEO[id]);
  assert.ok(far);
  const text = `Next door, ${ROOMS[far].bar} is doing a roaring trade.`;
  const m = [...text.matchAll(nameRe)][0]; assert.ok(m, "the planted name resolves");
  assert.ok(PROX.test(text) && Math.min(...[...names.get(m[1])].map(id => hops("lucky_tiger", id))) > 2, "would be reported");
});
