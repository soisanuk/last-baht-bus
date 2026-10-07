// THE LOCALIZATION SEAM, kept alive after the German translation was retired
// (2026-10 — docs/i18n-seam.md). This file replaces a 530-line i18n.test.js whose
// job was to prove a 1,471-line German catalog still matched live English source,
// string for string. That coupling was the reason the layer had to go: every prose
// edit anywhere in the game orphaned a key two files away, and the catalog lost.
//
// So this test deliberately asserts NO CONTENT. It builds a three-entry throwaway
// catalog in-test and checks the four helpers still behave, because the seam is
// the cheap half worth keeping (reviving a language = write a catalog + restore one
// LANGUAGES entry) and a seam nobody exercises is a seam that has quietly died.
// If this file is the only thing standing between the helpers and bit-rot, it has
// to be the kind of test that CANNOT go red when somebody rewrites a bar's prose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SRC = p => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const ENGINE = ["engine-core.js", "engine-encounters.js", "engine-play.js",
  "engine-systems.js", "engine-parser.js"];
for (const f of ["thai.js", "world.js", "games.js", ...ENGINE])
  vm.runInThisContext(SRC("../../web/js/" + f), { filename: f });

// the seam reads a catalog global that no shipped file defines; tests install one
const withCatalog = (cat, fn) => {
  globalThis._CATALOGS = cat;
  try { return fn(); } finally { delete globalThis._CATALOGS; }
};

test("no catalog ships: the seam is dormant and _L is identity for every player", () => {
  assert.equal(typeof globalThis._CATALOGS, "undefined",
    "a catalog file is back in the load order — if that is deliberate, this file needs a coverage gate again (see docs/i18n-seam.md)");
  newGame();
  assert.equal(G.player.lang, "en", "the seam's switch still defaults to English");
  assert.equal(_L("a line of prose"), "a line of prose");
});

test("_L: the missing catalog is survived, not crashed on", () => {
  newGame();
  G.player.lang = "de";                       // a save or a future pick could set this
  assert.equal(_L("untranslated"), "untranslated", "no catalog must fall back, not throw");
});

test("_L: with a catalog installed it hits, misses fall back, en stays a no-op", () => {
  newGame();
  withCatalog({ xx: { "the bar is shut": "SHUT" } }, () => {
    G.player.lang = "xx";
    assert.equal(_L("the bar is shut"), "SHUT", "a catalogued string translates");
    assert.equal(_L("the bar is open"), "the bar is open", "an uncatalogued one falls back");
    G.player.lang = "en";
    assert.equal(_L("the bar is shut"), "the bar is shut", "English is never looked up");
  });
});

test("_L sits on the output path, so wrapping a string is all authoring has to do", () => {
  newGame();
  const out = [];
  engineInit(t => out.push(t));
  withCatalog({ xx: { "Exits: ": "Ausgänge: " } }, () => {
    G.player.lang = "xx";
    _say(_L("Exits: ") + "north.");
    assert.ok(out.some(l => l.includes("Ausgänge: ")), "_say must route through _L");
  });
  engineInit(() => {});
});

test("_fmt fills named slots, and a translation may reorder them", () => {
  newGame();
  assert.equal(_fmt("day {d} of {n}.", { d: 3, n: 7 }), "day 3 of 7.");
  assert.equal(_fmt("{a} then {b}", { a: "x" }), "x then {b}",
    "an unfilled slot is left visible — the soak's defmt warning is what catches it");
  withCatalog({ xx: { "{who} owes {amt}": "{amt} is owed by {who}" } }, () => {
    G.player.lang = "xx";
    assert.equal(_fmt("{who} owes {amt}", { who: "Bert", amt: "฿80" }), "฿80 is owed by Bert",
      "named slots are the point: word order is the translation's business, not the call site's");
  });
});

test("_num pins the locale, so a price never depends on the player's machine", () => {
  assert.equal(_num(150000), "150,000");
  assert.equal(_num(80), "80");
});

test("_plural agrees a count with its noun", () => {
  assert.equal(_fmt("{c} condom{s}", { c: 1, s: _plural(1) }), "1 condom");
  assert.equal(_fmt("{c} condom{s}", { c: 3, s: _plural(3) }), "3 condoms");
});
