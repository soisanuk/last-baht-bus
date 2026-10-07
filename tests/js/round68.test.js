// Round 68 (2026-10-07) — a REGRESSION round after the German/i18n layer was retired
// (docs/i18n-seam.md): three personas aimed at the surfaces the rip touched, since _L sits on
// the single output path and _num/_plural/_fmt carry every figure. Clifford (money-ledger, Opus:
// every quote reconciled against every charge), Lennart (a Hamburg copy editor who proofs every
// line and tries German on everyone), Yusuf (taps-only).
//
// THE HEADLINE IS THAT NOTHING BROKE — and it was proven separately, not by these tests: a
// 68-command seeded transcript is byte-identical across the rip, because _L was ALREADY identity
// for every player (the taxi-intro language step had been pulled long before). Clifford: "every
// quote matched every charge… the invoices are immaculate; it's the management accounts that want
// a word." So what is pinned here is the three PRE-EXISTING defects the round surfaced inside the
// seam's own territory — the places a figure or a template was assembled by hand instead of
// through the helper that exists for it.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const said = () => out.map(o => o.text).join("\n");
const run = c => doCommand(c);
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 9000; G.bank = 30000; G.nightTurn = 30; out = [];
});
const ask = (id, t) => { run(`talk to ${id}`); out = []; run(`ask ${id} about ${t}`); return said(); };

// ── Lennart: the three women who answer in German ────────────────────────────
// His headline was that they do not exist as far as the town can tell. Two thirds of that was
// wrong — he never found their bars — but Jenny's third was right and was ours: her salvaged
// German line went onto her SPONSOR node, and a German speaker asks a woman about her language
// before he asks about her boyfriend, so a night in her bar got him her hello.
test("all three German-speaking women answer ABOUT GERMAN, each in her own register", () => {
  G.room = NPCS.mercedes.room;
  assert.match(ask("mercedes", "german"), /ich war Möbel/, "Mercedes: Taitch, dropped endings");
  assert.match(said(), /Warm house\. I was furniture/, "and she glosses it herself");

  G.room = NPCS.jenny.room;
  const j = ask("jenny", "german");
  assert.match(j, /Ich bin vergeben/, "Jenny: phrasebook German off Klaus");
  assert.match(j, /Klaus teach me/);
  assert.doesNotMatch(j, /I do the till, not the floor/, "never her topicless hello (Lennart, round 68)");

  G.room = NPCS.chompoo.room;
  assert.match(ask("chompoo", "german"), /Fließend/, "Chompoo: the fluent counterpoint");
});
test("DEUTSCH reaches Jenny too — a German speaker types his own word for it", () => {
  G.room = NPCS.jenny.room;
  assert.match(ask("jenny", "deutsch"), /Klaus teach me/);
});
test("Chompoo's ladyboy answer opens in fully conjugated German — the contrast that makes Taitch legible", () => {
  G.room = NPCS.chompoo.room;
  const c = ask("chompoo", "ladyboy");
  assert.match(c, /In Pattaya ist es eine Kategorie\. In Berlin war es einfach Dienstag\./);
  assert.match(c, /nothing dropped, nothing assembled/);
});

// ── Clifford: a count must agree with its noun ───────────────────────────────
// NOTEBOOK's template carried an {s} slot that was not a plural suffix at all but a whole
// clause — and {s} is exactly the name _plural uses, which is how "1 different things" lived.
test("NOTEBOOK agrees its noun with the count at 1, and still pluralises at 0 and 2", () => {
  const thaiCount = n => {
    G.thaiSaid = {}; const words = ["sawatdee", "aroy", "tao rai"];
    for (let i = 0; i < n; i++) G.thaiSaid[words[i]] = true;
    out = []; run("notebook"); return said();
  };
  assert.match(thaiCount(1), /1 different thing\./, "exactly one is singular");
  assert.doesNotMatch(said(), /1 different things/);
  assert.match(thaiCount(2), /2 different things\./);
  // zero never reaches the template at all — the empty notebook has its own line,
  // which is the right answer and is why the bug only ever showed at exactly 1
  assert.match(thaiCount(0), /The back pages are empty/);
});
test("_plural is the helper that does it, so a template never hand-rolls the suffix", () => {
  assert.equal(_plural(1), "");
  assert.equal(_plural(0), "s");
  assert.equal(_plural(7), "s");
});

// ── Clifford: a role noun standing in for a name must still open a sentence ──
test("the soapy menu opens with a capital whether or not the shop has a named manageress", () => {
  const menu = room => { G.room = room; G.money = 50000; G.soc.soapyDone = null; out = []; run("soapy"); return said(); };
  const named = Object.keys(NPCS).find(n => NPCS[n].soapyBoss);
  const namedRoom = NPCS[named].room;
  assert.match(menu(namedRoom), new RegExp(NPCS[named].name + " slides the laminated menu"),
    "a named manageress is unaffected");
  for (const r of Object.keys(ROOMS).filter(r => ROOMS[r].soapy && r !== namedRoom)) {
    assert.match(menu(r), /The manageress slides the laminated menu/,
      `${r}: the generic role noun still opens the sentence with a capital`);
    assert.doesNotMatch(said(), /^the manageress/m);
  }
});

// ── the seam itself, after the rip ───────────────────────────────────────────
test("the retired layer left no live catalog, and _L is identity on the output path", () => {
  assert.equal(typeof globalThis._CATALOGS, "undefined", "no catalog file ships (docs/i18n-seam.md)");
  assert.equal(G.player.lang, "en");
  assert.equal(_L("the bar is shut"), "the bar is shut");
  assert.equal(typeof LANGUAGES, "undefined", "and the LANGUAGES table went with it");
});
test("the German easter egg no longer asks what language the player reads in", () => {
  G.room = NPCS.mercedes.room; out = [];
  run("guten abend");
  assert.match(said(), /German|Englisch|English/i, "it fires for everybody now — there is no de player to exclude");
});

// ── Yusuf: the quick tap is the whole interface for a thumb ──────────────────
// He could not reach WAI by tapping — and WAI is how Act One's peaceful route is
// solved. The fix for exactly that player was written in round 24 (Pauline, who
// plays on a phone because her thumbs hurt) and its comment says "A WAI IS ALWAYS
// AVAILABLE TO A PERSON… Everyone gets it" — but the push landed INSIDE the `full`
// block, so for four rounds it only ever reached a long-press.
test("WAI is on the QUICK tap for everybody, not only the long-press", () => {
  for (const [id, room] of [["oy", "oy_office"], ["bert", "stinky_bar"], ["lamai", "stinky_bar"], ["tan", "soi6_west"]]) {
    G.room = room;
    const quick = _npcActions(id, false);
    assert.ok(quick.includes("wai"), `${id}: a thumb must be able to wai (round 24's fix, finally outside the full block)`);
  }
});
test("the full menu still offers wai exactly once — the move didn't duplicate it", () => {
  G.room = "oy_office";
  const full = _npcActions("oy", true);
  assert.equal(full.filter(a => a === "wai").length, 1);
});
test("a name nobody has is still not waiable", () => {
  assert.ok(!_npcActions("nobody-by-this-id", false).includes("wai"));
});
