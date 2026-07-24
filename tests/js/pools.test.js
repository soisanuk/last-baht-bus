// Hot-loop response pools + the _pickVary picker (random, no immediate repeat —
// the IF "at random" default). The lady drink (the favor grind) and the common
// misfires are the most-printed lines in the game, so they get real pools.
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
beforeEach(() => { newGame(); });

test("_pickVary never repeats the last pick (its whole reason to exist)", () => {
  let last;
  for (let i = 0; i < 200; i++) {
    const x = _pickVary(_NO_EXIT, "t");
    assert.notEqual(x, last, "no immediate repeat");
    last = x;
  }
});

test("_pickVary is namespaced so callers don't clobber each other, and covers the pool", () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) { seen.add(_pickVary(_NO_EXIT, "a")); _pickVary(_NOBODY_NAME, "b"); }
  assert.equal(seen.size, _NO_EXIT.length, "every variant eventually shows");
  assert.equal(_pickVary([], "x"), undefined, "empty pool is safe");
  assert.equal(_pickVary(["only"], "x"), "only", "singleton pool is safe");
});

test("the hot-loop pools are deep enough for their frequency", () => {
  assert.ok(_LADY_DRINK_LINES.length >= 6, "the favor grind is the hottest — deepest pool");
  for (const p of [_NO_EXIT, _NOT_CARRYING, _NOT_HERE, _NOBODY_NAME, _HUH])
    assert.ok(p.length >= 4, "common misfires get 4+");
});

test("every lady-drink line names her and shows the price", () => {
  for (const fn of _LADY_DRINK_LINES) {
    const line = fn("Nok");
    assert.match(line, /Nok/, "names the girl");
    assert.match(line, /฿/, "shows the tab");
  }
});
