// Readable fixtures: a room's `reads: { menu|board|sign|poster: "flavor" }` backs
// the menus / tap boards / cheeky notices its prose advertises, so READ <noun> and
// EXAMINE <noun> deliver instead of "No signs worth reading here." — closing the
// "readable object" broken-promise class the prose sweep had missed.
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

test("READ MENU surfaces KISS's mile-long menu", () => {
  G.room = "kiss"; out = []; doCommand("read menu");
  assert.match(out.join("\n"), /Item 47|BIG BEER|HANGOVER CURE/);
});

test("EXAMINE also surfaces a readable fixture (not just READ)", () => {
  G.room = "cricketers"; out = []; doCommand("examine menu");
  assert.match(out.join("\n"), /PIES|PROPER GRAVY|CHIPS WITH EVERYTHING/);
});

test("aliases resolve — READ BOARD / CHALKBOARD / TAPS all hit the tap board", () => {
  for (const word of ["board", "chalkboard", "taps"]) {
    G.room = "feedback_bar"; out = []; doCommand("read " + word);
    assert.match(out.join("\n"), /BUFFALO TEARS|tap board/, `read ${word}`);
  }
});

test("a room's readable SIGN wins over the generic 'no signs' rebuff", () => {
  G.room = "smile_massage"; out = []; doCommand("read sign");
  assert.match(out.join("\n"), /NO SEX|business model/);
});

test("reading a fixture that isn't here still falls through gracefully", () => {
  G.room = "kiss"; out = []; doCommand("read board"); // KISS has a menu, no board
  assert.match(out.join("\n"), /don't have that to read|No signs worth reading/);
});

test("every readable-fixture room's prose actually invites the read", () => {
  // guards the broken-promise class: if a room sets `reads`, its desc should mention
  // the thing (menu/board/sign/poster) so the fixture isn't orphaned, and vice-versa
  // the fixture backs a real prose mention.
  const withReads = Object.entries(ROOMS).filter(([, r]) => r.reads);
  assert.ok(withReads.length >= 6, "the sweep backed several rooms");
  for (const [id, r] of withReads) {
    const nouns = Object.keys(r.reads);
    assert.ok(nouns.every(n => typeof r.reads[n] === "string" && r.reads[n].trim()), `${id}: non-empty flavor`);
    // the room desc (or its own reads) should reference at least one of the nouns
    assert.ok(nouns.some(n => new RegExp(n, "i").test(r.desc)), `${id}: desc mentions the ${nouns.join("/")}`);
  }
});
