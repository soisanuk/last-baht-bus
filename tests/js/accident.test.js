// The motorbike-crash ending: a real road accident on a motosai ride (distinct
// from the pass-out-and-wake-stranded _CRASH_ system). Odds scale with drink, the
// small-hours hour, and the fast Darkside run; the delivered helmet cuts them. It
// routes to the same free public ward as the "hurt" ending, and leaves you banged
// up (hurt:1) the next night.
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
const REAL_RAND = _rand;
beforeEach(() => { out = []; newGame(); globalThis._rand = REAL_RAND; });

test("_motoCrashRisk: zero on a sober, early, in-town hop", () => {
  assert.equal(_motoCrashRisk(0, false, false, false), 0);
  assert.equal(_motoCrashRisk(2, false, false, false), 0, "under 3 drinks adds nothing");
});

test("_motoCrashRisk: scales with drink, hour, and the Darkside run", () => {
  const reckless = _motoCrashRisk(6, true, true, false); // 0.08 + 0.03 + 0.04
  assert.ok(Math.abs(reckless - 0.15) < 1e-9, "drunk + late + darkside stacks");
  assert.ok(_motoCrashRisk(6, true, true, false) > _motoCrashRisk(4, true, true, false), "more drink, more risk");
  assert.ok(_motoCrashRisk(0, true, true, false) > 0, "late + darkside is dangerous even sober");
});

test("_motoCrashRisk: the delivered helmet cuts the odds, and risk is capped", () => {
  const bare = _motoCrashRisk(9, true, true, false);
  const lidded = _motoCrashRisk(9, true, true, true);
  assert.ok(lidded < bare, "helmet helps");
  assert.ok(Math.abs(lidded - bare * 0.4) < 1e-9, "helmet is a 0.4 multiplier");
  assert.ok(bare <= 0.22, "capped so even a blackout-drunk Darkside run isn't a coin toss");
});

test("the accident ending wakes you in the free ward and dings you next night", () => {
  _setFlag("act1Done");
  G.money = 1500; const before = G.money;
  _endNight("accident");
  assert.match(out[0], /road rash|plaster|gurney|pavement|motorbike|motosai/i, "the accident opener");
  assert.match(out.join("\n"), /insurance/i, "the free public ward — no bill");
  assert.equal(G.money, before, "insurance covers it");
  assert.equal(G.hurt, 1, "you wake banged up the next night");
  assert.equal(G.crashInjury, false, "the one-night injury flag is consumed");
  assert.ok(G.hospitalVisits >= 1, "counted as a ward visit");
});

test("a reckless ride can crash → routes to the ward (forced roll)", () => {
  _setFlag("act1Done");
  const motoRoom = Object.keys(ROOMS).find(id => ROOMS[id].motosai);
  G.room = motoRoom; G.money = 2000; G.soc.drunk = 8; G.nightTurn = 90; // drunk + past last bus
  const day0 = G.day;
  globalThis._rand = () => 0; // 0 < risk → crash fires
  _doMotosai("darkside");
  assert.match(out.join("\n"), /sideways|swerve|pothole|tarmac|Lights out|sandal/i, "the road-moment beat");
  assert.match(out.join("\n"), /insurance/i, "then the ward morning");
  assert.equal(G.day, day0 + 1, "the night ended");
});

test("pools are stocked and well-formed", () => {
  assert.ok(_HOSP_WHY.accident.length >= 4, "several accident openers for multi-visit variety");
  assert.ok(_MOTO_CRASH.length >= 3, "a road-moment pool");
  for (const pool of [_HOSP_WHY.accident, _MOTO_CRASH]) {
    assert.ok(pool.every(s => typeof s === "string" && s.trim()), "no blank lines");
    assert.equal(new Set(pool).size, pool.length, "no duplicates");
  }
});
