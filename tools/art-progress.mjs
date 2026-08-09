#!/usr/bin/env node
// Scene-art progress, read from the filesystem — never from memory.
//
// This job is longer than any one context window: ~200 generations, and what
// thins first under compaction is the operational detail (which regions are
// done, that output must be WebP). So don't remember it. Look:
//
//   node tools/art-progress.mjs           # per-region summary
//   node tools/art-progress.mjs soi-6     # the rooms of one region, listed
//   node tools/art-progress.mjs --todo    # bare ids still needing art, space-separated
//
// Run it at the start of a session, after any compaction or restart, and
// between regions. The filesystem can't be wrong and can't forget.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "docs", "scene-manifest.json");
if (!existsSync(MANIFEST)) {
  console.error("no docs/scene-manifest.json — run: node scripts/gen-scene-manifest.mjs");
  process.exit(1);
}
const { rooms, regions } = JSON.parse(readFileSync(MANIFEST, "utf8"));

const art = id => {
  const webp = join(ROOT, "web", "art", "rooms", id + ".webp");
  const png = join(ROOT, "web", "art", "rooms", id + ".png");
  return existsSync(webp) ? "webp" : existsSync(png) ? "png" : null;
};
const regionArt = slug =>
  existsSync(join(ROOT, "web", "art", "regions", slug + ".webp")) ? "webp"
  : existsSync(join(ROOT, "web", "art", "regions", slug + ".png")) ? "png" : null;

const argv = process.argv.slice(2);
const todoOnly = argv.includes("--todo");
const only = argv.filter(a => !a.startsWith("-"));

const state = rooms.map(r => ({ ...r, art: art(r.id) }));

if (todoOnly) {
  const list = state.filter(r => !r.art && (!only.length || only.includes(r.regionSlug)));
  console.log(list.map(r => r.id).join(" "));
  process.exit(0);
}

if (only.length) {
  for (const slug of only) {
    const rs = state.filter(r => r.regionSlug === slug);
    if (!rs.length) { console.error(`no such region slug: ${slug}`); continue; }
    console.log(`\n${rs[0].region}  (region shot: ${regionArt(slug) || "MISSING"})`);
    for (const r of rs) {
      const mark = r.art === "webp" ? "✓ webp" : r.art === "png" ? "· png " : "  ––  ";
      console.log(`  ${mark}  ${r.id.padEnd(22)} ${r.kind.padEnd(10)} ${r.name}`);
    }
  }
  process.exit(0);
}

// Per-region summary, least-done first — that's the order worth working in,
// except that finishing a region beats starting one (a half-done district looks
// worse than an untouched one, where the fallback is at least consistent).
const by = new Map();
for (const r of state) {
  const g = by.get(r.regionSlug) || { name: r.region, slug: r.regionSlug, n: 0, webp: 0, png: 0 };
  g.n++;
  if (r.art === "webp") g.webp++;
  else if (r.art === "png") g.png++;
  by.set(r.regionSlug, g);
}
const rows = [...by.values()].sort((a, b) =>
  (a.webp + a.png) / a.n - (b.webp + b.png) / b.n || b.n - a.n);

let done = 0, png = 0, total = 0;
console.log("region                rooms   webp   png   todo   region-shot");
for (const g of rows) {
  const todo = g.n - g.webp - g.png;
  done += g.webp; png += g.png; total += g.n;
  console.log(
    g.name.padEnd(20),
    String(g.n).padStart(5),
    String(g.webp).padStart(6),
    String(g.png).padStart(5),
    String(todo).padStart(6),
    "   " + (regionArt(g.slug) || "MISSING"));
}
console.log("-".repeat(64));
console.log(`${total} rooms: ${done} webp, ${png} still png (convert), ${total - done - png} with no art`);
console.log(`regions: ${regions.length}, region shots present: ${regions.filter(r => regionArt(r.slug)).length}`);
