// Portrait coverage: every character in world.js has a pixel-art bust in
// web/portraits/. When this fails after adding an NPC/patron, add a spec to
// scripts/gen-portraits.py CHARS and re-run it.
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
const dir = path.join(root, "web", "portraits");
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("every NPC and patron has a portrait PNG", () => {
  const ids = [...Object.keys(NPCS), ...Object.keys(PATRONS)];
  const missing = ids.filter(id => !fs.existsSync(path.join(dir, id + ".png")));
  assert.deepEqual(missing, [], "run scripts/gen-portraits.py after adding characters");
});

test("portraits are real PNGs, and none are orphaned", () => {
  const ids = new Set([...Object.keys(NPCS), ...Object.keys(PATRONS)]);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".png")) continue;
    const head = fs.readFileSync(path.join(dir, f)).subarray(0, 8);
    assert.ok(head.equals(PNG_SIG), f + " is not a valid PNG");
    assert.ok(ids.has(f.replace(/\.png$/, "")), f + " has no matching character");
  }
});

test("the generator's cast list matches the world", () => {
  const gen = fs.readFileSync(path.join(root, "scripts", "gen-portraits.py"), "utf8");
  const specIds = [...gen.matchAll(/^    "([a-z_0-9]+)":\s/gm)].map(m => m[1]);
  const world = [...Object.keys(NPCS), ...Object.keys(PATRONS)].sort();
  assert.deepEqual(specIds.slice().sort(), world);
});
