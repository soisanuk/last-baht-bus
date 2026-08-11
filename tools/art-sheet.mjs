#!/usr/bin/env node
// Contact sheet for the scene art (docs/art-pipeline-spec.md — the review loop).
// Writes an HTML grid of every room's *effective* backdrop — the same
// room → region → nothing chain web/js/scene.js walks — so a batch can be
// eyeballed in one page instead of travelling the map in-game.
//
//   node tools/art-sheet.mjs                 # everything, to the scratchpad
//   node tools/art-sheet.mjs soi-6 naklua    # only those region slugs
//   node tools/art-sheet.mjs --kind gogo     # only that kind
//   node tools/art-sheet.mjs --missing       # only rooms with no art at all
//   node tools/art-sheet.mjs --out /path/sheet.html
//
// Throwaway dev tooling: it ships nothing and the game never reads it.

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ART = join(ROOT, "web", "art");
const MANIFEST = join(ROOT, "docs", "scene-manifest.json");

const argv = process.argv.slice(2);
// --name VALUE, removed from argv so what's left is the region-slug list.
const flag = name => {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const [, value] = argv.splice(i, 2);
  if (value === undefined) {
    console.error(`${name} needs a value`);
    process.exit(1);
  }
  return value;
};
const bool = name => {
  const i = argv.indexOf(name);
  if (i < 0) return false;
  argv.splice(i, 1);
  return true;
};
const missingOnly = bool("--missing");
const kind = flag("--kind");
const out = flag("--out") || join(process.env.TMPDIR || "/tmp", "lbb-art-sheet.html");
const slugs = argv.filter(a => !a.startsWith("-"));

if (!existsSync(MANIFEST)) {
  console.error("no docs/scene-manifest.json — run: node scripts/gen-scene-manifest.mjs");
  process.exit(1);
}
const { rooms } = JSON.parse(readFileSync(MANIFEST, "utf8"));

// The fallback chain, resolved on disk. Extension-agnostic and webp-first, in
// that order, exactly like scene.js walks it — pinned to .png this reported a
// fully-rendered region as "16 none", which is the worst possible failure for a
// review tool: it says the work isn't there when it is.
function art(r) {
  for (const [dir, key, via] of [["rooms", r.id, "room"], ["regions", r.regionSlug, "region"]]) {
    for (const ext of [".webp", ".png"]) {
      const p = join(ART, dir, key + ext);
      if (existsSync(p)) return { src: p, via };
    }
  }
  return { src: null, via: "none" };
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const kb = p => Math.round(statSync(p).size / 1024);

let shown = rooms;
if (slugs.length) shown = shown.filter(r => slugs.includes(r.regionSlug));
if (kind) shown = shown.filter(r => r.kind === kind);
const resolved = shown.map(r => ({ ...r, ...art(r) }));
const grid = missingOnly ? resolved.filter(r => r.via === "none") : resolved;

const tally = { room: 0, region: 0, none: 0 };
for (const r of resolved) tally[r.via]++;

const cards = grid.map(r => `
  <figure class="card ${r.via}">
    ${r.src ? `<img loading="lazy" src="file://${esc(r.src)}" alt="">` : `<div class="hole">no art</div>`}
    <figcaption>
      <b>${esc(r.name)}</b>
      <code>${esc(r.id)}</code>
      <span class="meta">${esc(r.kind)} · ${esc(r.region)} · <em>${r.via}</em>${r.src ? ` · ${kb(r.src)} KB` : ""}</span>
      <p>${esc(r.desc.slice(0, 220))}${r.desc.length > 220 ? "…" : ""}</p>
    </figcaption>
  </figure>`).join("");

// The panel crops hard (object-fit: cover, max-height 210px) — the sheet mimics
// that aspect so a composition that dies under the crop dies here too.
const html = `<!doctype html><meta charset="utf-8"><title>LBB scene art — contact sheet</title>
<style>
  body { background:#12121a; color:#e8e6f0; font:14px/1.45 system-ui,sans-serif; margin:24px; }
  h1 { font-size:18px; margin:0 0 4px; } .sub { color:#9a94b8; margin:0 0 20px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:16px; }
  .card { margin:0; background:#1c1b28; border:1px solid #2e2c40; border-radius:8px; overflow:hidden; }
  .card.region { border-color:#3a3450; } .card.none { border-color:#5a2a3a; }
  img, .hole { width:100%; height:210px; object-fit:cover; display:block; background:#0d0d14; }
  .hole { display:grid; place-items:center; color:#6a6488; font-size:12px; letter-spacing:.1em; text-transform:uppercase; }
  figcaption { padding:10px 12px 12px; }
  b { display:block; } code { color:#7ee0c0; font-size:12px; }
  .meta { display:block; color:#9a94b8; font-size:12px; margin-top:2px; }
  .meta em { color:#e0b060; font-style:normal; }
  p { color:#8d88a8; font-size:12px; margin:8px 0 0; }
</style>
<h1>Scene art — contact sheet</h1>
<p class="sub">${grid.length} shown · ${tally.room} room art · ${tally.region} via region fallback · ${tally.none} bare
  ${slugs.length ? " · regions: " + esc(slugs.join(", ")) : ""}${kind ? " · kind: " + esc(kind) : ""}
  <br>Cards are cropped to the live panel's ratio (cover, 210px) — if it reads badly here it reads badly in game.</p>
<div class="grid">${cards}</div>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log("wrote " + out);
console.log(`${grid.length} cards — ${tally.room} room / ${tally.region} region / ${tally.none} none`);
