// The dawn coda — the game's title made flesh. After a barfine night the camera
// occasionally cuts from you (passed out) to HER 6 a.m. baht bus home. A POV
// cutaway with rotating pools so repeats across the week don't read identically.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(t), null, () => {});
beforeEach(() => { out = []; newGame(); });

test("the coda cuts from you to her, and rotates so repeats vary", () => {
  const cut = () => { out = []; _cinderellaCoda(); return out[0]; };
  const a = cut(), b = cut(), c = cut(), d = cut();
  assert.notEqual(a, b); assert.notEqual(b, c);
  assert.equal(d, a, "framing wraps after the 3-deep pool");
  assert.equal(G.codaSeen, 4, "each coda counted");
});

test("every coda is a POV cutaway: you asleep, her going home", () => {
  for (let i = 0; i < 3; i++) {
    out = []; _cinderellaCoda();
    const text = out.join("\n");
    assert.match(text, /you|asleep|conquered|won/i, "opens on you");
    assert.match(text, /baht bus|coins|sweatpants|dawn|6 a\.m\.|home/i, "lands on her going home");
  }
});

test("the prose pools are stocked for multi-visit variety", () => {
  assert.ok(_CODA_CUT.length >= 3 && _CODA_DECON.length >= 3);
  assert.ok(_CODA_HOME.length >= 3 && _CODA_CLOSE.length >= 2);
});
