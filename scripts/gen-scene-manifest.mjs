#!/usr/bin/env node
// Generate docs/scene-manifest.json: every room in the game plus its region,
// with the derived `kind` that picks a prompt template on the generator side.
//
// The manifest is the ONLY coupling between LBB and ../portrait_gen for scene
// art (same doctrine as portraits): LBB owns *what the rooms are*, portrait_gen
// owns *how they look*. Regenerate it here, never hand-edit the JSON.
//
//   node scripts/gen-scene-manifest.mjs          # write docs/scene-manifest.json
//   node scripts/gen-scene-manifest.mjs --check  # verify it's up to date (exit 1 on drift)
//
// Consumed by ../portrait_gen (gen_scenes.sh). Output paths it must write:
//   web/art/rooms/<id>.png        (hero rooms — override their region)
//   web/art/regions/<slug>.png    (the day-one fallback: covers every room)
//
// See docs/art-pipeline-spec.md.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "scene-manifest.json");

// world.js is DOM-free at load (classic script sharing globals) — thai.js first
// only because world.js is authored to sit after it in the load order.
for (const f of ["thai.js", "world.js"]) {
  vm.runInThisContext(readFileSync(join(ROOT, "web", "js", f), "utf8"), { filename: f });
}

// VERBATIM from web/js/scene.js `_sceneArt()` — if these two ever diverge the
// region fallback silently misses. One slug function, copied exactly.
const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

// Rooms the flag heuristic below can't read: landmarks, complexes, and the
// handful of non-bar interiors. Kept small on purpose — everything else derives.
const KIND_OVERRIDE = {
  central_mall: "mall",           // seven storeys of air-conditioned glass — NOT a
                                  // convenience store, which "shop" rendered it as
  police_station: "interior",
  oy_office: "interior",          // ledgers, shrine shelf, the floor-bolted safe
  short_time_motel: "motel",      // an alley door with no sign, not an office
  buddha_hill: "viewpoint",
  lake_mabprachan: "viewpoint",
  myth_night: "market",           // shipping-container bar complex
  myth_stage: "market",
  myth_rows: "market",
  soi_rompho: "market",           // grilled everything, fruit pyramids, plastic stools
  // A stage and a band, not a dartboard: the `pub`/`beer` templates were
  // describing the Queen Vic at three venues built around live music.
  take_care_me: "livemusic",   // "a proper stage, a tight Filipino band"
  rock_factory: "livemusic",   // two-storey live-music bar, sound hits you at the gate
  amp_room: "livemusic",       // "the only stage in the complex"
  soi_7_w: "street",              // "Soi 7 (West / beach end)" — a soi AT the beach,
                                  // not sand; the name heuristic reads it wrong
  jomtien_soi_7_w: "street",      // same misfire, Jomtien's twin: "Soi 7 Beach End"
                                  // is "a mellow strip of open-front beer bars"
};

// The framing a scene prompt needs. `barType` when the room is a bar; otherwise
// the room's own flags, then a few name heuristics, then "street" — the default
// for anything outdoors, which is most of the map.
function kindOf(id, r) {
  if (KIND_OVERRIDE[id]) return KIND_OVERRIDE[id];
  if (r.barType) return r.barType;                       // beer gogo pub gents club soi6
  if (r.soapy) return "soapy";
  if (r.massage) return "massage";
  if (r.hostBar) return "hostbar";
  if (r.bar && r.liveMusic) return "cabaret";
  if (r.food) return "food";
  if (r.shop) return "shop";
  if (/^Your Room/.test(r.name)) return "hotel_room";
  // "Jomtien Beach" is sand; "Jomtien Beach Road" is asphalt.
  if (/beach|promenade/i.test(r.name) && !/beach\s*(road|rd)\b/i.test(r.name)) return "beach";
  return "street";
}

// Scene art carries NO people (the cast row IS the people), so the generator
// has to drop any clause of a room's prose that describes one. It can't know
// who they are — we do: everyone stationed here, plus any character the prose
// names in passing ("Candy's old bar", "Terry holds down the corner stool").
const ALL_NAMES = [];
for (const src of [NPCS, PATRONS]) {
  for (const id of Object.keys(src)) {
    for (const w of String(src[id].name || "").split(/\s+/)) {
      if (/^[A-Z][a-zA-Z'-]{2,}$/.test(w)) ALL_NAMES.push(w);
    }
  }
}
const NAMES = [...new Set(ALL_NAMES)];

function peopleIn(id, r) {
  const here = new Set();
  for (const nid of Object.keys(NPCS)) {
    const n = NPCS[nid];
    if (n.room === id || (Array.isArray(n.bars) && n.bars.includes(id))) here.add(n.name);
  }
  for (const pid of Object.keys(PATRONS)) {
    if (PATRONS[pid].home === id) here.add(PATRONS[pid].name);
  }
  // named in the prose — word-boundary, case-sensitive (same doctrine as decorate())
  for (const w of NAMES) if (new RegExp("\\b" + w + "\\b").test(r.desc)) here.add(w);
  return [...here].sort();
}

// `dark` is an ENGINE flag: it means the player can't see without the torch —
// it forces the flashlight, arms the soi-dog streak, hides the exits. It does
// NOT mean deserted, and the art pipeline can't safely read it as "nothing open,
// nobody about": Tree Town's deep corner is pitch black with one multicoloured
// bar sign burning at the end of it, which is the entire image of the room.
//
// So the light source is AUTHORED, not inferred — same doctrine as a character's
// `look`. A dark room listed here has something burning in frame and must not be
// rendered as an empty unlit road; a dark room absent from this table genuinely
// is one. Add a room here the moment its prose puts a light in the picture.
const DARK_LIGHT = {
  ws_alley:     "spill from kitchen doors and a bare bulb over stacked kegs — a working service alley, not an empty road",
  tt_back:      "warm light leaking from a far lane of cheap bars, past the bins",
  tt_deep:      "one big multicoloured bar sign burning at the end of the lane, the only light there is",
  dongtan_rd_n: "a 7-Eleven on the bend throwing the only real light",
  buddha_hill:  "the whole curve of the bay glittering far below, Walking Street neon-pink at the south end",
};

// Wide thoroughfare or tight lane? `kind: "street"` covers both, and the art
// side can only see the kind — which is why the Walking Street side-alley
// ("kitchen steam, stacked kegs, a motorbike with no plates") rendered as a
// forty-person neon boulevard: it got the same head as the main drag, and a
// generic head beats a specific desc every time.
//
// Authored, like `darkLight`. Absent means an ordinary open street. Only
// meaningful for outdoor kinds — a bar interior's width is the kind's business.
const NARROW = new Set([
  "ws_alley",                                        // service alley behind the strip
  "tt_lane_1", "tt_lane_2", "tt_lane_3",             // Tree Town IS a pocket maze —
  "tt_back", "tt_deep",                              // no lane in it is a boulevard
  "soi_diamond",                                     // a short soi off the main strip
]);

const rooms = [];
for (const id of Object.keys(ROOMS)) {
  const r = ROOMS[id];
  rooms.push({
    id,
    name: r.name,
    bar: r.bar || null,
    barType: r.barType || null,
    region: r.region,
    regionSlug: slug(r.region),
    kind: kindOf(id, r),
    dark: !!r.dark,
    // only meaningful when dark: what is lit, or null for genuinely deserted
    darkLight: r.dark ? (DARK_LIGHT[id] || null) : undefined,
    narrow: NARROW.has(id) || undefined,   // absent = an ordinary open street
    people: peopleIn(id, r),
    desc: r.desc,
  });
}
rooms.sort((a, b) => a.regionSlug.localeCompare(b.regionSlug) || a.id.localeCompare(b.id));

// Regions: the day-one coverage unit. `sampleDescs` are up to three descs from
// the region's most representative outdoor rooms — the establishing shot should
// read as the street you actually walk down, not a generic neon alley.
const regions = [];
for (const r of rooms) {
  let reg = regions.find(x => x.slug === r.regionSlug);
  if (!reg) regions.push(reg = { slug: r.regionSlug, name: r.region, roomIds: [], sampleDescs: [] });
  reg.roomIds.push(r.id);
}
// The establishing shot should be the region's *main drag*, not whichever room
// sorts first: a bar-lined street with a bus stop and plenty of exits reads as
// the place; an unlit back soi reads as nowhere.
function hubScore(id) {
  const r = ROOMS[id];
  return (r.venues ? 3 : 0) + (r.busStop ? 2 : 0) + (r.seven ? 1 : 0) +
    Object.keys(r.exits || {}).length * 0.5 - (r.dark ? 3 : 0);
}
for (const reg of regions) {
  const inReg = id => rooms.find(r => r.id === id);
  const streets = reg.roomIds.map(inReg).filter(r => r.kind === "street");
  const beaches = reg.roomIds.map(inReg).filter(r => r.kind === "beach");
  const pick = (streets.length ? streets : beaches.length ? beaches : reg.roomIds.map(inReg));
  reg.sampleDescs = pick
    .slice()
    .sort((a, b) => hubScore(b.id) - hubScore(a.id) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(r => r.desc);
}
regions.sort((a, b) => a.slug.localeCompare(b.slug));

const byKind = {};
for (const r of rooms) byKind[r.kind] = (byKind[r.kind] || 0) + 1;

const manifest = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Every room in the game + its region, for the scene-art pipeline " +
    "(docs/art-pipeline-spec.md). Derived from web/js/world.js — regenerate with " +
    "scripts/gen-scene-manifest.mjs, do not hand-edit. `kind` is a generator " +
    "heuristic for prompt-template selection, not game canon. `regionSlug` is " +
    "produced by the same regex as web/js/scene.js `_sceneArt()`; art files are " +
    "web/art/rooms/<id>.png with web/art/regions/<slug>.png as the fallback.",
  counts: { rooms: rooms.length, regions: regions.length, byKind },
  regions,
  rooms,
};
const json = JSON.stringify(manifest, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch { /* missing */ }
  const strip = s => s.replace(/"generated":.*\n/, ""); // the date changes daily
  if (strip(current) !== strip(json)) {
    console.error("scene-manifest.json is out of date — run: node scripts/gen-scene-manifest.mjs");
    process.exit(1);
  }
  console.log("scene-manifest.json is up to date (" + rooms.length + " rooms, " + regions.length + " regions)");
} else {
  writeFileSync(OUT, json);
  console.log("wrote docs/scene-manifest.json — " + rooms.length + " rooms, " + regions.length + " regions");
  console.log("byKind:", JSON.stringify(byKind));
}
