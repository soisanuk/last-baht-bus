// Decorator tests: term.js's decorate() turns plain prose into tappable <b class="kw">
// spans. It's pure (only print()/init() touch the DOM), so we vm-load term.js like
// the engine files and exercise it headlessly.
//
// The bug these guard: an NPC name that is also an everyday word ("Best seat",
// "Sang Som", "Near the end") tapping through to a filler girl in some random bar.
// Two mechanisms keep prose clean, and each has a test below:
//   1. common-word FILLER names are demoted to in-room-only decoration (_kwIndex);
//   2. a name that means the word, not the person, is wrapped in {{…}} at the source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js", "term.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
engineInit(() => {}, null, () => {}); // wire a no-op print; decorate() needs none of it

const chips = s => [..._term.decorate(s).matchAll(/data-v="([^"]+)"/g)].map(m => m[1]);

// filler girls named after everyday words — must never tap outside their own bar
const DEMOTED = ["Best", "Proud", "Near", "Nice", "Hong", "Som"];

test("common-word filler names never chip in prose viewed from elsewhere", () => {
  newGame(); state().room = "jomtien_beach"; // no DEMOTED girl works here
  state().lastSaleng = 99999; state().lastPeddler = 99999;
  const prose = [];
  for (const r of Object.values(ROOMS)) if (r.desc) prose.push(r.desc);
  for (const n of Object.values(NPCS)) for (const d of n.dialogue) {
    if (d.text) prose.push(d.text);
    if (d.short) prose.push(d.short);
  }
  for (const s of prose) {
    const hit = chips(s).filter(w => DEMOTED.includes(w));
    assert.equal(hit.length, 0,
      `common word tapped as a name (${hit.join(", ")}) in: "${s.slice(0, 80)}…"`);
  }
});

test("demotion still lets the girl tap in her own room", () => {
  newGame(); state().room = _npcRoom("som"); // she's home; here she IS tappable
  assert.ok(chips("Som pours a shot").includes("Som"), "Som should tap in her own bar");
});

test("the {{…}} escape suppresses a name used as a word (Waan's 'boom boom')", () => {
  newGame(); state().room = "jomtien_beach";
  const waanSpecial = NPCS.waan.dialogue.find(d => d.topic === "special").text;
  // guard the source fix itself: the phrase is still wrapped
  assert.ok(/Boom boom/.test(waanSpecial) && /\{\{/.test(waanSpecial),
    "Waan's 'special' line should still wrap Boom boom in {{…}}");
  assert.ok(!chips(waanSpecial).includes("Boom"), "wrapped Boom boom must not chip");
  // control: without the wrap it WOULD chip Boom (บูม, the Crystal Palace hostess)
  assert.ok(chips("Boom boom").includes("Boom"), "bare Boom chips — which is why the wrap exists");
});

test("real (non-word) character names still chip everywhere", () => {
  newGame(); state().room = "jomtien_beach";
  assert.ok(chips("Candy is polishing a glass").includes("Candy"));
  assert.ok(chips("You find Diamond behind the till").includes("Diamond"));
});

function state() { return G; } // vm globals share this realm
