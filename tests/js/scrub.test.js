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
beforeEach(() => { out = []; newGame(); });

test("the scrub plays the full ritual: kill Sharky, dress the accountant, perform the call", () => {
  _suvarnabhumiScrub();
  const text = out.join("\n");
  assert.match(text, /singlet|nickname|bucket|Click/i, "the man the city made");
  assert.match(text, /polo|chinos|accountant|mirror/i, "the resurrection");
  assert.match(text, /phone|lock screen|Recently Deleted|chat app|gallery/i, "the digital defusal");
  assert.match(text, /babe|golf|corporate|performance|illusion holds/i, "the call / the cover");
});

test("the opener rotates by trip, so repeat scrubs vary", () => {
  const scrub = v => { out = []; G.vacation = v; _suvarnabhumiScrub(); return out[1]; }; // out[0] is the rule
  assert.notEqual(scrub(1), scrub(2), "different trips, different opener");
  assert.equal(scrub(1), scrub(3), "wraps on the 2-deep opener pool");
});

test("flying home runs the scrub before the return, only on _newVacation", () => {
  G.vacation = 1; out = [];
  _newVacation();
  const text = out.join("\n");
  assert.match(text, /illusion holds|scrub is complete|double life/i, "the departure ritual ran");
  assert.match(text, /VACATION 2|seatbelt|grey sky/i, "then the reset + the return");
});

test("the scrub pools are stocked for multi-trip variety", () => {
  assert.ok(_SCRUB_OPEN.length >= 2 && _SCRUB_PHYSICAL.length >= 2);
  assert.ok(_SCRUB_DIGITAL.length >= 2 && _SCRUB_CALL.length >= 2 && _SCRUB_CLOSE.length >= 2);
});
