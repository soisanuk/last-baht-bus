// The Suvarnabhumi Scrub — the departure ritual that plays when you fly home at
// week's end (_newVacation): kill the man the city made, resurrect the accountant,
// perform the call. Rotating pools so repeat trips scrub differently.
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
// the full five-beat ritual — the "hey babe" call, the lawn on the lock screen — is
// the golfer's (origin monger); every other origin gets the shorter alone scrub
beforeEach(() => { out = []; newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; });

test("the scrub plays the full ritual: rule line, five beats, a spoken call", () => {
  // structural, not keyword-based — every pool has varied vocabulary by design,
  // so assert the shape (open/physical/digital/call/close) and the fixed points.
  G.vacation = 1; out = [];
  _suvarnabhumiScrub();
  assert.equal(out.length, 6, "the divider rule plus five beats");
  assert.match(out[4], /“[^”]+”/, "the call beat is a spoken performance");
  assert.equal(out[5], _SCRUB_CLOSE[1 % _SCRUB_CLOSE.length], "closes on the trip-rotated line");
});

test("the opener rotates by trip, so repeat scrubs vary", () => {
  const scrub = v => { out = []; G.vacation = v; _suvarnabhumiScrub(); return out[1]; }; // out[0] is the rule
  assert.notEqual(scrub(1), scrub(2), "different trips, different opener");
  assert.equal(scrub(1), scrub(1 + _SCRUB_OPEN.length), "wraps after the opener pool");
});

test("flying home runs the scrub before the return, only on _newVacation", () => {
  G.vacation = 1; out = [];
  _newVacation();
  const text = out.join("\n");
  assert.match(text, /illusion holds|scrub is complete|double life/i, "the departure ritual ran");
  assert.match(text, /VACATION 2|seatbelt|grey sky/i, "then the reset + the return");
});

test("a man with nobody to lie to gets the alone scrub — no wife, no call, no lock-screen lawn", () => {
  G.player.origin = "running"; G.vacation = 1; out = [];
  _suvarnabhumiScrub();
  const text = out.join("\n");
  assert.doesNotMatch(text, /babe|She believes|double life|lock screen/i);
  assert.match(text, /nobody to|Nobody checks|No lock screen|no one to say it to/i);
  assert.equal(out.length, 5, "rule, open, physical, alone, close");
});

test("the scrub pools are stocked for multi-trip variety", () => {
  assert.ok(_SCRUB_OPEN.length >= 2 && _SCRUB_PHYSICAL.length >= 2);
  assert.ok(_SCRUB_DIGITAL.length >= 2 && _SCRUB_CALL.length >= 2 && _SCRUB_CLOSE.length >= 2);
});
