// Generate docs/world-export.json — the ONLY sanctioned way for Second Road (or
// anything else) to obtain LBB's world.
//
// The rule this enforces: vendoring a generated manifest, never world.js. That
// file is ~640KB and almost all of it is dialogue, prose pools, quest text and
// encounter scripts — LBB's *night* content, none of which a macro game can use.
// Taking it wholesale would import a game engine's worth of strings to obtain a
// list of venues and their coordinates.
//
// Same doctrine as docs/scene-manifest.json, which is already the single
// coupling to the art generator: the manifest is the interface, the source is
// never read directly.
//
// Deliberately NOT exported: dialogue, quest/encounter text, prose pools, signs,
// room desc/revisit prose — and EXITS. Exits describe a walking graph for a game
// about walking; a macro game has coordinates instead (ROOM_GEO), which is
// strictly better for a map and carries no implication that anyone walks.
//
// NO TIMESTAMP in the output, deliberately: the sync test regenerates and diffs,
// and a clock in the file would make it fail every run.
//
//   node tools/gen-world-export.mjs            # write docs/world-export.json
//   node tools/gen-world-export.mjs --check    # exit 1 if the file is stale
//   node tools/gen-world-export.mjs --stdout   # print, write nothing
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const src = p => readFileSync(fileURLToPath(new URL(p, root)), "utf8");

// the established LBB tool pattern: load the real sources in a vm
for (const f of ["thai.js", "world.js"]) vm.runInThisContext(src(`web/js/${f}`), { filename: f });

export const EXPORT_VERSION = 1;

export function buildExport() {
  const venues = {};
  for (const [id, r] of Object.entries(ROOMS)) {
    const geo = typeof ROOM_GEO !== "undefined" ? ROOM_GEO[id] : null;
    const v = { name: r.name, region: r.region };
    if (r.bar) v.bar = r.bar;                 // the venue's trading name
    if (r.barType) v.barType = r.barType;
    if (r.pool) v.pool = true;
    if (r.liveMusic) v.liveMusic = true;
    if (r.seven) v.seven = true;
    if (geo) v.geo = [geo[0], geo[1]];        // real lat/lon — this is the map
    venues[id] = v;
  }

  // People WITHOUT dialogue. Second Road needs to know who works where and what
  // they are; what they SAY is a night-scale concern and stays in LBB.
  const people = {};
  for (const [id, n] of Object.entries(NPCS)) {
    const p = { name: n.name, room: n.room };
    if (n.th) p.th = n.th;
    if (n.emoji) p.emoji = n.emoji;
    if (n.bars) p.bars = n.bars;              // owners work alternate nights
    if (n.manager) p.manager = true;
    if (n.filler) p.filler = true;
    if (n.personality) p.personality = n.personality;
    if (typeof NPC_ROLES !== "undefined" && NPC_ROLES[id]) p.role = NPC_ROLES[id];
    if (n.desc) p.desc = n.desc;              // one line, for a roster card
    people[id] = p;
  }

  const patrons = {};
  if (typeof PATRONS !== "undefined") {
    for (const [id, p] of Object.entries(PATRONS)) {
      const q = { name: p.name, home: p.home };
      if (p.emoji) q.emoji = p.emoji;
      if (p.nat) q.nat = p.nat;
      if (p.hops) q.hops = p.hops;
      if (p.days) q.days = p.days;
      if (p.avoids) q.avoids = p.avoids;
      if (p.desc) q.desc = p.desc;
      patrons[id] = q;
    }
  }

  return {
    v: EXPORT_VERSION,
    // Display names are English today. Second Road may localise them later; the
    // shape allows a `de` sibling per entry without a version bump, which is the
    // whole reason to say so here rather than discover it later.
    lang: "en",
    counts: {
      venues: Object.keys(venues).length,
      geolocated: Object.values(venues).filter(v => v.geo).length,
      people: Object.keys(people).length,
      patrons: Object.keys(patrons).length,
    },
    canonBars: typeof CANON_BARS !== "undefined" ? [...CANON_BARS] : [],
    venues, people, patrons,
  };
}

// stable stringify: sorted keys, so regeneration diffs cleanly and a reordering
// in world.js doesn't look like a content change
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  }
  return v;
}

export const renderExport = () => JSON.stringify(stable(buildExport()), null, 1) + "\n";

const isMain = process.argv[1] && process.argv[1].endsWith("gen-world-export.mjs");
if (isMain) {
  const out = renderExport();
  const path = fileURLToPath(new URL("docs/world-export.json", root));
  if (process.argv.includes("--stdout")) { process.stdout.write(out); }
  else if (process.argv.includes("--check")) {
    let cur = "";
    try { cur = readFileSync(path, "utf8"); } catch { /* missing counts as stale */ }
    if (cur !== out) {
      console.error("docs/world-export.json is STALE — run: node tools/gen-world-export.mjs");
      process.exit(1);
    }
    console.log("world-export.json is in sync");
  } else {
    writeFileSync(path, out);
    const e = buildExport();
    console.log(`docs/world-export.json — v${e.v}: ${e.counts.venues} venues ` +
      `(${e.counts.geolocated} geolocated), ${e.counts.people} people, ` +
      `${e.counts.patrons} patrons, ${e.canonBars.length} canon bars`);
  }
}
