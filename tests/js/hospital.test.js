// The morning-after hospital: a night that ends in injury (_endNight "hurt")
// wakes you in the free public ward — insurance covers it, and the prose rotates
// so repeat mornings across the week don't read identically.
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

test("the opener rotates across visits, so the week's repeat mornings vary", () => {
  const opener = () => { out = []; _hospitalMorning("hurt"); return out[0]; };
  const a = opener(), b = opener(), c = opener(), d = opener(), e = opener();
  assert.notEqual(a, b); assert.notEqual(b, c); assert.notEqual(c, d);
  assert.equal(e, a, "wraps after the 4-deep hurt pool");
  assert.equal(G.hospitalVisits, 5, "each visit counted");
});

test("every visit explains why you're there and where you are", () => {
  for (let i = 0; i < 4; i++) {
    out = []; _hospitalMorning("hurt");
    assert.match(out[0], /hospital|ward|stitches|gurney|sling|corridor/i, "opener frames the reason");
    assert.match(out.join("\n"), /Soi Buakhao|public|district|Candy Bar/i, "and the place");
  }
});

test("the hurt ending routes to the free hospital — insurance, no ฿500 bill", () => {
  G.money = 1500;
  const before = G.money;
  _endNight("hurt");
  assert.equal(G.money, before, "insurance covers the public ward — no clinic charge");
  assert.match(out.join("\n"), /insurance/i, "and says so");
  assert.match(out.join("\n"), /number|counter|same side/i, "the marketplace-vanishes beat");
});

test("the prose pools are stocked (multiple variants for multi-visit variety)", () => {
  assert.ok(_HOSP_WHY.hurt.length >= 3, "several reason-openers");
  assert.ok(_HOSP_SIGHTS.length >= 5, "a deep vignette pool");
  assert.ok(_HOSP_THESIS.length >= 2 && _HOSP_TOMORROW.length >= 2);
});
