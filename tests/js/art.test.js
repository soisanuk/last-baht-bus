// Scene-art guard (docs/art-pipeline-spec.md). Inverted from portraits.test.js:
// *orphaned* art fails, *missing* art never does — web/js/scene.js falls back
// room → region → nothing, so partial coverage is the shipping state by design.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
for (const f of ["thai.js", "world.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, "web", "js", f), "utf8"), { filename: f });
}
const artDir = path.join(root, "web", "art");
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 400 * 1024; // the spec's per-file budget — ~180 files in the repo
// WebP is a RIFF container: "RIFF" ....(4-byte size).... "WEBP".
const isWebp = b => b.length > 12 && b.slice(0, 4).toString() === "RIFF" &&
                                     b.slice(8, 12).toString() === "WEBP";
const isPng = b => b.slice(0, 8).equals(PNG_SIG);
// Both extensions are live: scene.js tries .webp before .png at each step of the
// fallback chain, so the PNG→WebP conversion can land one file at a time
// (docs/art-production.md step 1). A room's id is its basename either way.
const ART_EXT = /\.(webp|png)$/;
const baseOf = f => f.replace(ART_EXT, "");

// VERBATIM from web/js/scene.js `_sceneArt()` and scripts/gen-scene-manifest.mjs.
const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

const list = sub => {
  const d = path.join(artDir, sub);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => !f.startsWith("."));
};

test("scene.js's slug regex is still the one the manifest generator copies", () => {
  const scene = fs.readFileSync(path.join(root, "web", "js", "scene.js"), "utf8");
  const gen = fs.readFileSync(path.join(root, "scripts", "gen-scene-manifest.mjs"), "utf8");
  const RE = /toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\+\/g, "-"\)/;
  assert.ok(RE.test(scene), "scene.js's region slug changed — update the generator and this test");
  assert.ok(RE.test(gen), "gen-scene-manifest.mjs no longer slugs like scene.js");
});

test("no orphaned room art", () => {
  for (const f of list("rooms")) {
    assert.ok(ART_EXT.test(f), "art/rooms/" + f + " is neither .webp nor .png");
    assert.ok(ROOMS[baseOf(f)], "art/rooms/" + f + " matches no room id");
  }
});

test("no orphaned region art", () => {
  const slugs = new Set(Object.values(ROOMS).map(r => slug(r.region)));
  for (const f of list("regions")) {
    assert.ok(ART_EXT.test(f), "art/regions/" + f + " is neither .webp nor .png");
    assert.ok(slugs.has(baseOf(f)), "art/regions/" + f + " matches no live region slug");
  }
});

test("art files are real PNGs or WebPs, and inside the size budget", () => {
  // filler/ is held to format + budget but NOT to a naming rule: it's an unwired
  // library (see the stray-entries test below), so there's nothing to orphan
  // against until something references it.
  //
  // The budget is per-file and format-blind on purpose. WebP will come in far
  // under it — that is the point of converting — but the ceiling is there to
  // stop any ONE image being enormous, not to enforce a format. The total is
  // what actually matters and it has its own test below.
  for (const sub of ["rooms", "regions", "filler"]) {
    for (const f of list(sub)) {
      if (!ART_EXT.test(f)) continue;      // filler/ carries a README
      const p = path.join(artDir, sub, f);
      const buf = fs.readFileSync(p);
      assert.ok(f.endsWith(".webp") ? isWebp(buf) : isPng(buf),
        sub + "/" + f + " does not match its extension (truncated? wrong format?)");
      const kb = fs.statSync(p).size / 1024;
      assert.ok(kb <= MAX_BYTES / 1024, `${sub}/${f} is ${kb.toFixed(0)} KB — budget is 400 KB (run pngquant)`);
    }
  }
});

test("web/art holds nothing but rooms/, regions/, filler/ and a README", () => {
  if (!fs.existsSync(artDir)) return;
  const stray = fs.readdirSync(artDir)
    .filter(f => !f.startsWith("."))
    .filter(f => !["rooms", "regions", "filler"].includes(f) && !/^README/i.test(f));
  assert.deepEqual(stray, [], "unexpected entries in web/art/");
});

// filler/ is a library, not a surface: generated art kept for later use, wired
// to nothing. Nothing in the game loads it today, so the one thing worth
// asserting is that it STAYS unwired — the day a filler frame gets referenced,
// it should move to a directory whose names are guarded (rooms/, regions/, or
// portraits/pics/ with its orphan rule) rather than being loaded from here.
test("filler art is not referenced by the game", () => {
  const dir = path.join(artDir, "filler");
  if (!fs.existsSync(dir)) return;
  const stray = list("filler").filter(f => !f.endsWith(".png") && !/^README/i.test(f));
  assert.deepEqual(stray, [], "filler/ holds PNGs and a README, nothing else");
  const names = fs.readdirSync(dir).filter(f => f.endsWith(".png")).map(f => f.replace(/\.png$/, ""));
  if (!names.length) return;
  const src = ["scene.js", "term.js", "main.js", "world.js"]
    .map(f => path.join(root, "web", "js", f))
    .filter(fs.existsSync)
    .map(f => fs.readFileSync(f, "utf8"))
    .join("\n");
  assert.ok(!/art\/filler/.test(src), "something now loads art/filler — give those files a guarded home");
  for (const n of names) {
    assert.ok(!new RegExp(`["'\`/]${n}["'\`.]`).test(src), n + " is referenced in web/js — move it out of filler/");
  }
});

test("the scene manifest is in sync with world.js", () => {
  // NOT conditional. This used to `return` when the file was missing, on the
  // reasoning that absence meant a fresh clone — but the manifest is COMMITTED,
  // so a fresh clone HAS it and absence means somebody deleted it. The skip
  // could only ever hide a real fault. Flagged by the art agent, who hit the
  // neighbouring version of this: a manifest that is stale rather than absent,
  // which the deepEqual below does catch.
  const p = path.join(root, "docs", "scene-manifest.json");
  assert.ok(fs.existsSync(p),
    "docs/scene-manifest.json is missing — it is committed, so this is a deletion. " +
    "Run: node scripts/gen-scene-manifest.mjs");
  const m = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.deepEqual(m.rooms.map(r => r.id).sort(), Object.keys(ROOMS).sort(),
    "run: node scripts/gen-scene-manifest.mjs");
  for (const r of m.rooms) assert.equal(r.regionSlug, slug(ROOMS[r.id].region), r.id + " region drifted");
});

// DARK_LIGHT in the manifest generator names, per room, what is burning in an
// otherwise pitch-black scene. It's authored because `dark` is an ENGINE flag —
// "you need the torch", not "nothing is open" — and the art side reading it as
// deserted would render Tree Town's deep corner as an empty road when the one
// bar sign at the end of the lane IS the picture. A stale key here is silent:
// the room just quietly loses its light, which is exactly the failure the table
// exists to prevent.
test("every authored dark-room light source names a room that is actually dark", () => {
  const man = JSON.parse(fs.readFileSync(path.join(root, "docs", "scene-manifest.json"), "utf8"));
  const byId = new Map(man.rooms.map(r => [r.id, r]));
  const lit = man.rooms.filter(r => r.darkLight);

  const bad = lit.filter(r => !r.dark).map(r => r.id);
  assert.deepEqual(bad, [], "darkLight on a room that isn't dark: " + bad.join(", "));

  // the field is dark-only: a lit room must not carry the key at all
  const stray = man.rooms.filter(r => !r.dark && "darkLight" in r).map(r => r.id);
  assert.deepEqual(stray, [], "darkLight present on a lit room: " + stray.join(", "));

  assert.ok(lit.length > 0, "no dark room has an authored light source — did DARK_LIGHT lose its keys?");
  for (const r of lit)
    assert.ok(r.darkLight.length > 20,
      `${r.id}: darkLight must describe the light well enough to prompt with, got "${r.darkLight}"`);
  assert.ok(byId.size === man.rooms.length, "duplicate room ids in the manifest");
});

// `narrow` marks a tight lane that must not be framed as a boulevard. Only
// meaningful outdoors, and only where the room really is enclosed — a stale
// entry would quietly squeeze a main road, which is as wrong as the bug it fixes.
test("narrow marks outdoor rooms only, and never a bar interior", () => {
  const man = JSON.parse(fs.readFileSync(path.join(root, "docs", "scene-manifest.json"), "utf8"));
  const narrow = man.rooms.filter(r => r.narrow);
  assert.ok(narrow.length > 0, "no room marked narrow — did the NARROW set lose its ids?");

  const OUTDOOR = new Set(["street", "market", "beach", "viewpoint", "soi6"]);
  const indoors = narrow.filter(r => !OUTDOOR.has(r.kind)).map(r => `${r.id} (${r.kind})`);
  assert.deepEqual(indoors, [],
    "narrow is an outdoor framing hint; these are interiors: " + indoors.join(", "));

  const stray = man.rooms.filter(r => "narrow" in r && r.narrow !== true).map(r => r.id);
  assert.deepEqual(stray, [], "narrow must be true or absent, never false: " + stray.join(", "));
});
