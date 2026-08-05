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
    assert.ok(f.endsWith(".png"), "art/rooms/" + f + " is not a .png (the fallback chain hardcodes .png)");
    assert.ok(ROOMS[f.replace(/\.png$/, "")], "art/rooms/" + f + " matches no room id");
  }
});

test("no orphaned region art", () => {
  const slugs = new Set(Object.values(ROOMS).map(r => slug(r.region)));
  for (const f of list("regions")) {
    assert.ok(f.endsWith(".png"), "art/regions/" + f + " is not a .png");
    assert.ok(slugs.has(f.replace(/\.png$/, "")), "art/regions/" + f + " matches no live region slug");
  }
});

test("art files are real PNGs and inside the size budget", () => {
  // filler/ is held to format + budget but NOT to a naming rule: it's an unwired
  // library (see the stray-entries test below), so there's nothing to orphan
  // against until something references it.
  for (const sub of ["rooms", "regions", "filler"]) {
    for (const f of list(sub)) {
      if (!f.endsWith(".png")) continue;   // filler/ carries a README
      const p = path.join(artDir, sub, f);
      assert.ok(fs.readFileSync(p).subarray(0, 8).equals(PNG_SIG), sub + "/" + f + " is not a valid PNG");
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
  const p = path.join(root, "docs", "scene-manifest.json");
  if (!fs.existsSync(p)) return; // generated artifact — absence is a fresh clone, not a failure
  const m = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.deepEqual(m.rooms.map(r => r.id).sort(), Object.keys(ROOMS).sort(),
    "run: node scripts/gen-scene-manifest.mjs");
  for (const r of m.rooms) assert.equal(r.regionSlug, slug(ROOMS[r.id].region), r.id + " region drifted");
});
