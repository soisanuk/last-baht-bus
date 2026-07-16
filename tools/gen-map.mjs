// The neon city map + the exits-vs-reality audit.
//
//   node tools/gen-map.mjs           → shots/map.svg (the README map)
//   node tools/gen-map.mjs --audit   → also print every exit whose compass
//                                      direction disagrees with the real
//                                      bearing between its rooms' ROOM_GEO
//
// Data: ROOM_GEO in world.js (every room's real [lat, lon], OSM-anchored) and
// tools/map/pattaya-geom.json (cached Overpass geometry for the spine roads +
// coastline — refetch notes in the query at the bottom of this file).
// The Darkside sits ~7 km east of town, so it renders as an inset.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
for (const f of ["thai.js", "world.js"]) {
  try { vm.runInThisContext(fs.readFileSync(ROOT + "web/js/" + f, "utf8"), { filename: f }); }
  catch (e) { if (!/is not defined/.test(e.message)) throw e; }
}
const GEOM = JSON.parse(fs.readFileSync(ROOT + "tools/map/pattaya-geom.json", "utf8"));

// ── projection: main frame (town + Jomtien) and the Darkside inset ──────────
const MAIN = { lat0: 12.8840, lat1: 12.9600, lon0: 100.8590, lon1: 100.8950 };
const W = 1040, H = 1560, PAD = 34;
const kLon = Math.cos((12.92 * Math.PI) / 180); // metres per degree shrink
function proj({ lat, lon }) {
  const x = PAD + ((lon - MAIN.lon0) * kLon / ((MAIN.lon1 - MAIN.lon0) * kLon)) * (W - 2 * PAD);
  const y = PAD + ((MAIN.lat1 - lat) / (MAIN.lat1 - MAIN.lat0)) * (H - 2 * PAD);
  return [x, y];
}
const INSET = { x: 46, y: 56, w: 300, h: 190,
  lat0: 12.8990, lat1: 12.9400, lon0: 100.8935, lon1: 100.9640 };
function projInset({ lat, lon }) {
  const x = INSET.x + ((lon - INSET.lon0) / (INSET.lon1 - INSET.lon0)) * INSET.w;
  const y = INSET.y + ((INSET.lat1 - lat) / (INSET.lat1 - INSET.lat0)) * INSET.h;
  return [x, y];
}
const DARKSIDE = new Set(["sukhumvit_crossing", "khao_talo_strip", "water_buffalo",
  "firefly_bar", "mama_yai", "khao_talo", "khao_talo_bar", "lake_mabprachan"]);
const P = id => {
  const [lat, lon] = ROOM_GEO[id];
  return DARKSIDE.has(id) ? projInset({ lat, lon }) : proj({ lat, lon });
};

// ── region palette (the game's neon) ────────────────────────────────────────
const REGION_COLOR = {
  "Jomtien": "#e8c46a", "Pratumnak": "#8a6ae8", "Beach Road": "#00e5ff",
  "Walking Street": "#ff1493", "Second Road": "#7a8aa8", "Myth Night": "#c46ae8",
  "Soi Buakhao": "#ff6a9a", "Tree Town": "#44dd88", "LK Metro": "#b06aff",
  "Soi 6": "#ff9a3c", "Naklua": "#3cd0a8", "Darkside": "#a8e83c",
};

// ── build the SVG ────────────────────────────────────────────────────────────
const S = [];
S.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Menlo, Consolas, monospace">`);
S.push(`<rect width="${W}" height="${H}" fill="#07071a"/>`);

// the sea: everything west of the coastline. Cheap trick — thick coast stroke
// plus a gradient wash on the left margin reads as water at bar-mat fidelity.
S.push(`<defs><linearGradient id="sea" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#0a2036"/><stop offset="1" stop-color="#07071a"/>
</linearGradient></defs>`);
S.push(`<rect width="${W * 0.30}" height="${H}" fill="url(#sea)"/>`);

// streets from OSM: coastline bright sand, spine roads dim purple
const nameOf = el => (el.tags && (el.tags["name:en"] || el.tags.name)) || (el.tags && el.tags.natural) || "";
for (const el of GEOM.elements) {
  if (!el.geometry) continue;
  const coast = el.tags && el.tags.natural === "coastline";
  const pts = el.geometry
    .filter(g => g.lat > MAIN.lat0 && g.lat < MAIN.lat1 && g.lon > MAIN.lon0 && g.lon < MAIN.lon1)
    .map(g => proj(g).map(v => v.toFixed(1)).join(","));
  if (pts.length < 2) continue;
  if (coast) {
    S.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="#caa96a" stroke-width="3" opacity="0.85"/>`);
  } else {
    const major = /Sai Song|Sai Nueng|Buakhao|Klang|Tai Road|Nuea|Walking/.test(nameOf(el));
    S.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="#2c2050" stroke-width="${major ? 5 : 2.5}" opacity="0.9"/>`);
  }
}

// game exits as neon threads (each pair once; skip interior/out links)
const drawn = new Set();
const SKIP = new Set(["out", "in", "up", "down", "office", "alley", "hotel", "pub"]);
for (const [id, r] of Object.entries(ROOMS)) {
  for (const [dir, to] of Object.entries(r.exits || {})) {
    if (SKIP.has(dir)) continue;
    const key = [id, to].sort().join("|");
    if (drawn.has(key) || !ROOM_GEO[id] || !ROOM_GEO[to]) continue;
    drawn.add(key);
    if (DARKSIDE.has(id) !== DARKSIDE.has(to)) continue; // the motosai ride, not a street
    const [x1, y1] = P(id), [x2, y2] = P(to);
    S.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ff2fb0" stroke-width="1.4" opacity="0.5"/>`);
  }
}

// rooms: bars glow, streets are dots. Labels only for bars + key streets so
// the map stays readable at README width.
const LABEL_NUDGE = { // [dx, dy, anchor] overrides where defaults collide
  central_mall: [10, 16, "start"], police_station: [-10, 4, "end"],
  ws_gate: [12, 4, "start"], second_rd_c: [-10, -6, "end"],
  beach_rd_c: [-10, -6, "end"], myth_night: [-10, 14, "end"],
  tt_entrance: [8, -10, "start"], naklua_rd: [12, 4, "start"],
  jomtien_bus_stop: [12, 2, "start"], buakhao_market: [10, 12, "start"],
};
const LABELED_STREETS = {
  jomtien_beach: "Jomtien Beach", jomtien_bus_stop: "bus stop",
  pratumnak_rd: "Pratumnak", buddha_hill: "Big Buddha",
  ws_gate: "Walking St gate", beach_rd_s: "Beach Rd S", beach_rd_c: "Beach Rd C",
  beach_rd_n: "Beach Rd N", central_mall: "Central", police_station: "police",
  soi6_street: "Soi 6", naklua_rd: "Naklua", second_rd_c: "Second Rd",
  pattaya_klang: "Pattaya Klang", buakhao_market: "Buakhao market",
  myth_night: "Myth Night", tt_entrance: "Tree Town", lk_entrance: "LK Metro",
  sukhumvit_crossing: "Sukhumvit", khao_talo: "Khao Talo", lake_mabprachan: "Lake Mabprachan",
};
for (const [id, r] of Object.entries(ROOMS)) {
  if (!ROOM_GEO[id] || DARKSIDE.has(id)) continue; // the inset draws its own
  const [x, y] = P(id);
  const col = REGION_COLOR[r.region] || "#ffffff";
  if (r.bar) {
    S.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${col}" opacity="0.95">` +
      `<title>${r.bar}</title></circle>`);
    S.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${col}" opacity="0.35"/>`);
  } else {
    S.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${col}" opacity="0.8"/>`);
  }
  const lbl = LABELED_STREETS[id];
  if (lbl) {
    const [dx, dy, anchor] = LABEL_NUDGE[id] || [9, -6, "start"];
    S.push(`<text x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" font-size="15" fill="${col}" text-anchor="${anchor}" opacity="0.95">${lbl}</text>`);
  }
}
// bar-cluster labels (one per district, not per bar)
const CLUSTERS = [
  ["Walking Street", 12.9236, 100.8676, "#ff1493"],
  ["Soi Buakhao", 12.9238, 100.8812, "#ff6a9a"],
];
for (const [name, lat, lon, col] of CLUSTERS) {
  const [x, y] = proj({ lat, lon });
  S.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="16" fill="${col}" opacity="0.9">${name}</text>`);
}

// inset chrome
S.push(`<rect x="${INSET.x - 12}" y="${INSET.y - 26}" width="${INSET.w + 24}" height="${INSET.h + 44}" fill="#0b0b22" stroke="#a8e83c" stroke-width="1.5" opacity="0.95" rx="8"/>`);
S.push(`<text x="${INSET.x}" y="${INSET.y - 8}" font-size="15" fill="#a8e83c">THE DARKSIDE — a motosai ride east</text>`);
for (const el of GEOM.elements) { // Khao Talo Rd inside the inset
  if (!el.geometry || !/Khao Talo/.test(nameOf(el))) continue;
  const pts = el.geometry.map(g => projInset(g).map(v => v.toFixed(1)).join(","));
  S.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="#2c2050" stroke-width="3"/>`);
}
const INSET_LBL = { sukhumvit_crossing: [6, -8, "start", "Sukhumvit"],
  khao_talo_strip: [-6, 16, "end", "the strip"],
  khao_talo: [6, 16, "start", "Khao Talo"], khao_talo_bar: [8, -8, "start", "Daeng's Place"],
  lake_mabprachan: [-8, -8, "end", "Lake Mabprachan"] };
for (const id of DARKSIDE) {
  const [x, y] = P(id);
  const r = ROOMS[id];
  S.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.bar ? 5 : 2.6}" fill="#a8e83c"/>`);
  const nl = INSET_LBL[id];
  if (nl) {
    const [dx, dy, anchor, lbl] = nl;
    S.push(`<text x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" font-size="13" fill="#a8e83c" text-anchor="${anchor}">${lbl}</text>`);
  }
}

// title + sea label + compass
S.push(`<text x="${PAD}" y="${H - 46}" font-size="26" fill="#ffe600" style="font-weight:bold">THE LAST BAHT BUS</text>`);
S.push(`<text x="${PAD}" y="${H - 22}" font-size="15" fill="#8a7ab0">greater Pattaya — OSM-anchored, still a bar-mat at heart</text>`);
S.push(`<text x="${PAD + 8}" y="${Math.round(H * 0.42)}" font-size="17" fill="#3c78a8" transform="rotate(-90 ${PAD + 8} ${Math.round(H * 0.42)})">T H E   G U L F</text>`);
S.push(`<text x="${W - 56}" y="${H - 30}" font-size="22" fill="#8a7ab0">N ↑</text>`);
S.push(`</svg>`);

fs.mkdirSync(ROOT + "shots", { recursive: true });
fs.writeFileSync(ROOT + "shots/map.svg", S.join("\n"));
console.log(`shots/map.svg written (${Object.keys(ROOM_GEO).length} rooms placed)`);

// ── the audit: declared exit direction vs real bearing ──────────────────────
if (process.argv.includes("--audit")) {
  const DIR_DEG = { n: 0, e: 90, s: 180, w: 270 };
  console.log("\nexits vs reality (deviation > 60° listed; > 120° is a lie):");
  const rows = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    for (const [dir, to] of Object.entries(r.exits || {})) {
      if (!(dir in DIR_DEG) || !ROOM_GEO[id] || !ROOM_GEO[to]) continue;
      const [la1, lo1] = ROOM_GEO[id], [la2, lo2] = ROOM_GEO[to];
      const brg = (Math.atan2((lo2 - lo1) * kLon, la2 - la1) * 180 / Math.PI + 360) % 360;
      let dev = Math.abs(brg - DIR_DEG[dir]);
      if (dev > 180) dev = 360 - dev;
      if (dev > 60) rows.push([dev, `${id} —${dir}→ ${to}: real bearing ${brg.toFixed(0)}° (dev ${dev.toFixed(0)}°)`]);
    }
  }
  rows.sort((a, b) => b[0] - a[0]);
  for (const [, line] of rows) console.log("  " + (line.includes("dev 1") && +line.match(/dev (\d+)/)[1] > 120 ? "✗ " : "△ ") + line);
  if (!rows.length) console.log("  (all exits within 60° of their compass word)");
}

/* Overpass refetch (either endpoint, POST data@file):
[out:json][timeout:120];
(
  way["name:en"~"^(Pattaya Sai Nueng|Pattaya Sai Song Road|Soi Buakhao|Pattaya Klang Road|Pattaya Tai Road|Pattaya Nuea Road|Naklua Road|Thappraya Road|Jomtien Beach Road|Khao Talo Road|Soi LK Metro)"](12.86,100.85,12.99,100.95);
  way["name"="Walking Street"](12.90,100.86,12.95,100.89);
  way["highway"="pedestrian"](12.915,100.865,12.932,100.875);
  way["natural"="coastline"](12.88,100.85,12.98,100.90);
);
out geom;
*/
