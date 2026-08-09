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
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const src = p => readFileSync(fileURLToPath(new URL(p, root)), "utf8");

// the established LBB tool pattern: load the real sources in a vm
for (const f of ["thai.js", "world.js"]) vm.runInThisContext(src(`web/js/${f}`), { filename: f });

// v2 (2026-08-09): every person and patron now carries `pronoun`. Requested by
// the Second Road agent — their report prose called a male manager "she" for six
// weeks and both games were writing around the gap. Additive, so a v1 consumer
// keeps working; the bump is the signal that there is something new to read.
// v3 (2026-08-09): the export describes itself. Prompted by the Second Road
// agent, and the catch is about process rather than data — I handed them a
// caveat and told them to read the reasoning in web/js/world.js, which is the
// one file their contract forbids them to open. A caveat only the people who
// cannot see it are able to act on is not a caveat.
//
// So anything that BINDS a consumer now travels with the data: `notes` carries
// field semantics and live caveats, and the first real one is `estimated`.
// Six coordinates are georeferenced off screenshots rather than OSM, and until
// now the only way to know which was to count decimal places in someone else's
// file.
export const EXPORT_VERSION = 3;

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
    // a venue that isn't trading. LBB has one (the dead Shamrock); a consumer
    // that can reopen it needs this as data rather than parsing "(closed)" out
    // of a display name, which is how it first reached Second Road's prose.
    if (r.closed) v.closed = true;
    if (geo) {
      v.geo = [geo[0], geo[1]];               // real lat/lon — this is the map
      // Surveyed coordinates are pinned to OSM and good to ~5 decimals. A
      // handful are eyeballed off a map screenshot and are good to about a
      // block. A consumer laying these out should know which is which without
      // having to infer it from significant figures.
      const dp = Math.max(String(geo[0]).split(".")[1]?.length || 0,
                          String(geo[1]).split(".")[1]?.length || 0);
      if (dp < 5) v.estimated = true;
    }
    venues[id] = v;
  }

  // People WITHOUT dialogue. Second Road needs to know who works where and what
  // they are; what they SAY is a night-scale concern and stays in LBB.
  const people = {};
  for (const [id, n] of Object.entries(NPCS)) {
    const p = { name: n.name, room: n.room, pronoun: _pronoun(id) };
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
      const q = { name: p.name, home: p.home, pronoun: _pronoun(id) };
      if (p.emoji) q.emoji = p.emoji;
      if (p.nat) q.nat = p.nat;
      if (p.hops) q.hops = p.hops;
      if (p.days) q.days = p.days;
      if (p.avoids) q.avoids = p.avoids;
      if (p.desc) q.desc = p.desc;
      patrons[id] = q;
    }
  }

  // The portrait index. Second Road shouldn't have to walk a directory it
  // doesn't own, and listing them here means a missing or orphaned face shows up
  // as a diff in the sync test rather than as a broken image months later.
  // Sorted, so the file stays diff-stable.
  const dir = fileURLToPath(new URL("web/portraits", root));
  const files = readdirSync(dir).filter(f => f.endsWith(".png")).sort();
  // A face counts as present if it has EITHER a pixel-art PNG here or a WebP
  // thumb — same reason `renders` is derived from the thumb track below: the
  // masters live in ../portrait_gen, so a rendered character has no PNG here at
  // all and listing only files would report 84 faces as missing.
  const portraits = [...new Set([
    ...files.map(f => f.slice(0, -4)),
    ...(() => { try {
      return readdirSync(fileURLToPath(new URL("web/portraits/thumb", root)))
        .filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5));
    } catch { return []; } })(),
  ])].sort();
  // WHICH TRACK each face is on. The cast is mid-migration: 24×24-grid pixel art
  // (~400 bytes, square) alongside generated renders (832×1088, 3:4, head in the
  // upper third). A consumer cannot tell them apart without fetching and
  // measuring, and they need DIFFERENT CROPS — a square-art crop at 16% from the
  // top clips a pixel bust's chin, and a render shown square loses the face.
  // Second Road hit exactly this. So the boundary reports it.
  // Derived from the THUMB TRACK, not from file size in web/portraits. The
  // masters live in ../portrait_gen now (they were never requested — every
  // consumer prefers the thumb — so 117 MB of them shipped with each deploy for
  // nothing). Sizing off `web/` would therefore report ZERO renders the moment
  // they moved, `_THUMBS` is baked from this list, and every face would fall
  // through to a master that isn't there. The union keeps it correct either way:
  // a render counts if it has a thumb OR is still a big file here.
  const thumbIds = (() => {
    try {
      return readdirSync(fileURLToPath(new URL("web/portraits/thumb", root)))
        .filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5));
    } catch { return []; }
  })();
  const renders = [...new Set([
    ...thumbIds,
    ...files.filter(f => statSync(`${dir}/${f}`).size > 100 * 1024).map(f => f.slice(0, -4)),
  ])].sort();
  // Which renders have a 384px WebP thumbnail. Consumers use this to decide
  // whether to TRY the thumb chain at all — coverage is incremental, and a
  // consumer that guesses eats a 404 per portrait that hasn't got one. That's
  // 205 wasted requests on a roster view, which looks fine locally and is grim
  // on a phone.
  let thumbs = [];
  try {
    thumbs = readdirSync(fileURLToPath(new URL("web/portraits/thumb", root)))
      .filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5)).sort();
  } catch { /* pre-migration: no thumb track yet, and that's fine */ }
  let frames = [];
  try {
    frames = readdirSync(fileURLToPath(new URL("web/portraits/pics", root)))
      .filter(f => f.endsWith(".png")).map(f => f.slice(0, -4)).sort();
  } catch { /* the pics/ subfolder is optional */ }

  // WHICH VENUES ARE ACTUALLY VERIFIED. LBB ships one playable mode — the Soi 6
  // pocket — because the geography outside the reworked districts is still
  // suspect: wrong compass bearings, corner-cutting diagonals, buildings sitting
  // on cardinal exits instead of `venues:[]`. Four regions of fifteen have had
  // their pass. So the full 177 are exported (they're all real places, all
  // geolocated) but only these are known-good, and a consumer honouring the same
  // restriction needs the boundary rather than a hand-copied list that goes
  // stale the day a district unlocks.
  //
  // It CANNOT be re-derived by filtering on region: four of the nineteen are
  // region "Beach Road", among them stinky_bar — the bar the whole ownership
  // chain is about. Filtering `region === "Soi 6"` silently drops it.
  //
  // Keyed by mode name (LBB's `G.mode`) so unlocking a district adds a key
  // rather than changing this one's meaning. Additive and optional, so no
  // version bump — same tolerance as `lang` below.
  const playable = {};
  if (typeof SOI6_ROOMS !== "undefined") playable.soi6 = [...SOI6_ROOMS].sort();

  return {
    v: EXPORT_VERSION,
    // Written FOR the consumer, and deliberately here rather than in LBB
    // source: a consumer bound by a caveat has to be able to read it.
    notes: {
      contract: "Generated from web/js/world.js by tools/gen-world-export.mjs. " +
        "Never hand-edit, and never read LBB source to understand this file — " +
        "if something you need is missing from here, that is a bug in the export " +
        "and worth asking about.",
      geo: "Real lat/lon. `estimated: true` on a venue means the position was " +
        "georeferenced off a map screenshot rather than pinned to OSM: good to " +
        "roughly a block, not to a doorway. Everything without the flag is " +
        "surveyed. Fine for laying out a map; do not use an estimated pin for " +
        "anything that needs to be metre-accurate.",
      exits: "NOT exported, by design. The room graph is a bar-mat map — " +
        "topological and cardinal-only — and it does not survive contact with " +
        "real coordinates, so exposing it would invite a consumer to draw " +
        "something false. If you ever need adjacency, ask; it should be exported " +
        "as adjacency and not as compass words.",
      pronoun: "he | she | they, on every person and patron. Reports the " +
        "pronoun LBB's own prose uses, not a gender: the cast includes kathoey " +
        "characters and a tom cashier and the writing has always used 'she' for " +
        "them. Safe to render directly; no fallback needed.",
      playable: "Room-id sets that gate a mode. `soi6` is the daily-challenge " +
        "pocket — a player in that mode cannot leave it.",
    },
    // Display names are English today. Second Road may localise them later; the
    // shape allows a `de` sibling per entry without a version bump, which is the
    // whole reason to say so here rather than discover it later.
    lang: "en",
    counts: {
      venues: Object.keys(venues).length,
      geolocated: Object.values(venues).filter(v => v.geo).length,
      people: Object.keys(people).length,
      patrons: Object.keys(patrons).length,
      portraits: portraits.length,
      renders: renders.length,
      thumbs: thumbs.length,
    },
    canonBars: typeof CANON_BARS !== "undefined" ? [...CANON_BARS] : [],
    playable,
    venues, people, patrons,
    // art/<id>.png relative to LBB's web/portraits/; `frames` are the distinct
    // photo frames under pics/ (see LBB's gallery system)
    portraits, renders, thumbs, frames,
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
  // …and the classic-script twin LBB's frontend reads. term.js has no module
  // loader and no fetch (it must work from file://), so the thumb list is baked
  // as a global here rather than looked up at runtime.
  const thumbJs = fileURLToPath(new URL("web/js/portrait-thumbs.js", root));
  const thumbBody = "// GENERATED by tools/gen-world-export.mjs — do not edit.\n" +
    "// Which portraits have a 384px WebP thumbnail. term.js loads the thumb where\n" +
    "// one exists; everything else keeps its PNG. Regenerate after adding art.\n" +
    "const _THUMBS = new Set(" + JSON.stringify(buildExport().thumbs) + ");\n";
  if (process.argv.includes("--stdout")) { process.stdout.write(out); }
  else if (process.argv.includes("--check")) {
    let cur = "", curJs = "";
    try { cur = readFileSync(path, "utf8"); } catch { /* missing counts as stale */ }
    try { curJs = readFileSync(thumbJs, "utf8"); } catch { /* same */ }
    if (cur !== out || curJs !== thumbBody) {
      console.error("docs/world-export.json is STALE — run: node tools/gen-world-export.mjs");
      process.exit(1);
    }
    console.log("world-export.json is in sync");
  } else {
    writeFileSync(path, out);
    writeFileSync(thumbJs, thumbBody);
    const e = buildExport();
    console.log(`docs/world-export.json — v${e.v}: ${e.counts.venues} venues ` +
      `(${e.counts.geolocated} geolocated), ${e.counts.people} people, ` +
      `${e.counts.patrons} patrons, ${e.counts.portraits} portraits, ` +
      `${e.canonBars.length} canon bars`);
  }
}
