// v1 hotspots (docs/2d-v1-spec.md) integrity + promise-lint. SCENE_HOTSPOTS is
// presentation data — it never touches G/ROOMS at runtime — but it still has to
// stay honest: every key a real bespoke-art room (never a shared region image,
// rail 5), every box valid image-percent geometry, every label short, and every
// cmd a promise the parser actually keeps in that room (a contextual refusal is
// fine — a "didn't understand" is the broken promise this test exists to catch,
// the same check tools/soak.mjs's promise-catcher makes on `/didn't understand/i`,
// reused here directly against the `_HUH` pool as a hard assertion).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js", "scene-hotspots.js"]) {
  vm.runInThisContext(
    fs.readFileSync(path.join(root, "web", "js", f), "utf8"),
    { filename: f });
}

let out = [];
engineInit(t => out.push(t), null, () => {});

function freshAt(roomId) {
  out = [];
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done");
  G.stage = "vacation";
  G.room = roomId;
}

test("SCENE_HOTSPOTS has at least one authored room (the task isn't a no-op)", () => {
  assert.ok(Object.keys(SCENE_HOTSPOTS).length > 0, "no rooms authored");
});

test("every key is rooms/<a real ROOMS id> with matching bespoke art on disk", () => {
  const artDir = path.join(root, "web", "art", "rooms");
  for (const key of Object.keys(SCENE_HOTSPOTS)) {
    assert.match(key, /^rooms\//, `${key}: not a "rooms/" key`);
    const id = key.slice("rooms/".length);
    assert.ok(ROOMS[id], `${key}: matches no ROOMS id — a renamed/removed room`);
    // Either extension: the art migrated PNG -> WebP one file at a time
    // (docs/art-production.md), and scene.js tries .webp before .png. Pinning
    // .png here broke the day queen_vic converted — same class as e69d8ca.
    assert.ok(fs.existsSync(path.join(artDir, id + ".webp")) ||
              fs.existsSync(path.join(artDir, id + ".png")),
      `${key}: no web/art/rooms/${id}.(webp|png) — a re-rendered-away image (orphan doctrine)`);
  }
});

test("no regions/ keys — region art is shared across rooms (rail 5)", () => {
  for (const key of Object.keys(SCENE_HOTSPOTS))
    assert.doesNotMatch(key, /^regions\//, `${key}: hotspots on region art are a bug by construction`);
});

test("every box is 4 finite numbers, in-bounds, non-degenerate", () => {
  for (const [key, list] of Object.entries(SCENE_HOTSPOTS))
    for (const h of list) {
      assert.equal(h.box.length, 4, `${key} "${h.label}": box must be [x,y,w,h]`);
      for (const n of h.box) assert.ok(Number.isFinite(n), `${key} "${h.label}": non-finite in box`);
      const [x, y, w, hgt] = h.box;
      assert.ok(x >= 0 && x <= 100, `${key} "${h.label}": x=${x} out of 0..100`);
      assert.ok(y >= 0 && y <= 100, `${key} "${h.label}": y=${y} out of 0..100`);
      assert.ok(w > 0, `${key} "${h.label}": w must be > 0`);
      assert.ok(hgt > 0, `${key} "${h.label}": h must be > 0`);
      assert.ok(x + w <= 100, `${key} "${h.label}": x+w=${x + w} overflows the image`);
      assert.ok(y + hgt <= 100, `${key} "${h.label}": y+h=${y + hgt} overflows the image`);
    }
});

test("every label is a non-empty string, <= 30 chars", () => {
  for (const [key, list] of Object.entries(SCENE_HOTSPOTS))
    for (const h of list) {
      assert.equal(typeof h.label, "string", `${key}: label must be a string`);
      assert.ok(h.label.length > 0, `${key}: empty label`);
      assert.ok(h.label.length <= 30, `${key}: label "${h.label}" over 30 chars`);
    }
});

test("every cmd is a non-empty string", () => {
  for (const [key, list] of Object.entries(SCENE_HOTSPOTS))
    for (const h of list) {
      assert.equal(typeof h.cmd, "string", `${key}: cmd must be a string`);
      assert.ok(h.cmd.trim().length > 0, `${key}: empty cmd`);
    }
});

test("every cmd is a promise the parser keeps in its own room — never the last-resort _HUH", () => {
  for (const [key, list] of Object.entries(SCENE_HOTSPOTS)) {
    const roomId = key.slice("rooms/".length);
    for (const h of list) {
      freshAt(roomId);
      doCommand(h.cmd);
      const huh = out.some(line => _HUH.includes(line));
      assert.ok(!huh, `${key} "${h.cmd}" → parser fell through to _HUH ("didn't understand") — broken promise`);
    }
  }
});

// The runtime gate that decides a hotspot may render at all. It lives in
// scene.js and is a SIBLING of the fallback chain: the chain went
// extension-agnostic for the WebP migration and this check stayed pinned to
// .png, so the day the batch converted, every hotspot in the game stopped
// rendering — silently, because hotspots are off by default and the vm suite
// can't see the DOM. The e2e caught it three commits later; this catches it at
// the source. Asserted against scene.js's text, like the slug-regex test in
// art.test.js, because there is no way to reach the closure from here.
test("scene.js's own-art check accepts both extensions, not just .png", () => {
  const src = fs.readFileSync(path.join(root, "web", "js", "scene.js"), "utf8");
  const fn = src.slice(src.indexOf("const isRealRoomImg"), src.indexOf("const render ="));
  assert.ok(fn, "isRealRoomImg has moved or been renamed — re-point this guard");
  assert.match(fn, /\.webp/, "isRealRoomImg no longer accepts .webp — hotspots die on converted art");
  assert.match(fn, /\.png/, "isRealRoomImg no longer accepts .png — hotspots die on unconverted art");
});
