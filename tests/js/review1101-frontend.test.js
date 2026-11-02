// THE ADVERSARIAL CODE REVIEW (2026-11-01), the frontend group: the parser's three surfaces and the main.js seam. Two
// classes: a surface that offered what the parser refuses (the Orchid's women, the motosai under the Soi 6 frame, the
// checkout's vacation prices to an expat), and a one-way door main.js let a player walk back through (UNDO over a gate's
// answer, an ending, the stage; a RESET armed across other commands; RESTART on one word). main.js is loaded here with
// the DOM and localStorage stubbed, and driven through _dispatch, the way the page drives it.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const STORE = {};
const OVERLAY = { hidden: true };
const _els = {};
Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: {
  getItem: k => (k in STORE ? STORE[k] : null), setItem: (k, v) => { STORE[k] = String(v); }, removeItem: k => { delete STORE[k]; } } });
globalThis.document = {
  getElementById: id => id === "start-overlay" ? OVERLAY : (_els[id] = _els[id] || { hidden: true, disabled: false, style: {},
    classList: { toggle() {}, add() {}, remove() {} }, querySelector: () => null, addEventListener() {} }),
  addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
};
globalThis._term = { print: (t) => out.push(String(t)), renderChips() {}, updateFabs() {} };
globalThis._audioForRoom = () => {};

const src = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8");
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser", "main"])
  vm.runInThisContext(src(f), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const t = c => { out = []; doCommand(c); return said(); };
const D = c => { out = []; _dispatch(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = (stage = "vacation") => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  if (stage !== "act1") { _setFlag("act1Done"); _setFlag("hasWallet"); }
  G.stage = stage; quiet(); G.money = 5000; G.bank = 20000;
};
const dice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
// a clean frontend: no save, no buffer, no arm, the menu down
const fresh = () => { for (const k in STORE) delete STORE[k]; _prevSnap = null; _undoSpent = false; _awaitingReset = false; _awaitingContinue = false; OVERLAY.hidden = true; };
beforeEach(() => { newGame(); fresh(); });

test("S9-1: RESTART asks once before it wipes the week, and a barfine on the table does not let it through unasked", () => {
  sandbox(); G.day = 5; G.room = "stinky_bar"; G.happy = 60; G.money = 30000;
  assert.match(t("restart"), /RESTART again/);
  assert.equal(G.day, 5, "one word did not start the game over"); assert.equal(G.happy, 60); assert.notEqual(G.pendingChoice, "intro");
  t("look");
  t("restart"); assert.equal(G.day, 5, "the confirmation lapses after another command");
  t("restart"); assert.equal(G.pendingChoice, "intro", "RESTART typed again is the restart");
  sandbox(); G.room = "stinky_bar"; G.known.manow = true; G.pendingBf = { id: "manow", st: 1000, lt: 2000 };
  t("restart"); assert.ok(G.pendingBf, "the barfine is still up"); assert.notEqual(G.pendingChoice, "intro");
  // the end-of-week card lists RESTART as an answer, and takes it at once
  startSoi6Mode(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.pendingChoice = "vacation_end"; t("restart"); assert.equal(G.pendingChoice, "intro");
});

test("S9-2: a RESET confirmation is answered by the very next line: UNDO or SAVE cancels it, and a later YES is not a wipe", () => {
  sandbox(); G.room = "stinky_bar"; D("look");
  D("reset"); assert.equal(_awaitingReset, true);
  D("undo"); assert.equal(_awaitingReset, false, "UNDO cancelled the arm");
  D("reset"); D("save"); assert.equal(_awaitingReset, false, "SAVE cancelled the arm");
  D("reset"); D("toggle v1"); assert.equal(_awaitingReset, false, "a display toggle cancelled the arm");
  D("look"); assert.ok(STORE.lbb_save, "a save exists");
  G.pendingChoice = "tanfavour"; D("yes");
  assert.ok(STORE.lbb_save, "a YES meant for Tan did not wipe the save"); assert.equal(OVERLAY.hidden, true, "no start menu");
  assert.doesNotMatch(said(), /Slate wiped/);
  D("reset"); D("reset"); assert.equal(STORE.lbb_save, undefined, "RESET twice still wipes");
});

test("S9-3: a verb-led line in a conversation is the verb: Mamasan Mem's own drink chip buys her a drink, and the mamasan can be tipped", () => {
  sandbox(); G.money = 50000; G.nightTurn = 40; G.room = "tequila_queen"; G.known.mem = true; _convoStart("mem");
  const chip = _chipSet().find(c => /^buy drink for /.test(c.cmd));
  assert.ok(chip, "the drink chip"); const m0 = G.money; t(chip.cmd);
  assert.equal(m0 - G.money, _ladyPrice(), `"${chip.cmd}" bought her the drink`);
  sandbox(); G.money = 50000; G.nightTurn = 40; G.room = "stinky_bar"; G.known.manow = true;
  const s0 = serializeGame();
  for (const c of ["buy drink for the mamasan", "tip the mamasan 100", "ring bell for the girls here"]) {
    deserializeGame(s0); _convoStart("manow"); const m = G.money; t(c);
    assert.ok(m - G.money > 0, `"${c}" in a conversation moved money`);
  }
  // a question that names the mamasan is still a question to her
  deserializeGame(s0); _convoStart("manow"); const m = G.money; t("is your mamasan nice?"); assert.equal(G.money, m);
});

test("S9-4: UNDO does not rewind an answered gate — the checkout's choice is final", () => {
  sandbox(); G.money = 20000; G.hotel = "sabai"; G.room = _hotelRoomId(); G.nightTurn = 2;
  D("checkout"); assert.equal(G.pendingChoice, "checkout");
  assert.match(D("undo"), /Not mid-answer/, "UNDO cannot un-ask a live question");
  D("areca"); assert.equal(G.hotel, "areca");
  D("undo"); assert.equal(G.hotel, "areca", "the answered gate did not come back");
  assert.notEqual(G.pendingChoice, "checkout");
  // the taxi's questions are who you are: UNDO there still works
  assert.equal(_gateUp(), false);
});

test("S2-11: UNDO does not rewind an ending — the plane home is not taken back", () => {
  sandbox("expat"); G.payDay = G.day; G.pendingChoice = "embassy"; G.destitute = 3;
  D("take the plane"); assert.equal(G.endKind, "repatriated"); assert.equal(G.pendingChoice, "gameend");
  const r = D("undo");
  assert.equal(G.endKind, "repatriated", "the ending stands"); assert.equal(G.pendingChoice, "gameend");
  assert.match(r, /end of it/);
  // the buffer is gone too, not merely refused: the mark sees the ending
  assert.equal(_prevSnap, null);
});

test("S9-5: the checkout's chips and its redraw quote the price the clerk quotes — an expat's rate, not the tourist's", () => {
  sandbox("expat"); G.money = 20000; G.hotel = "queenvic"; G.room = _hotelRoomId(); G.nightTurn = 2;
  const live = t("checkout");
  const chips = _chipSet();
  out = []; _renderResume(); const redraw = said();
  for (const k of ["sabai", "areca", "metropole"]) {
    const p = "฿" + _num(_HOTELS[k].expatRate);
    assert.ok(live.includes(p), `live list quotes ${k} at ${p}`);
    assert.ok(redraw.includes(p), `the redraw quotes ${k} at ${p}`);
    assert.ok(chips.some(c => c.label.includes(p)), `a chip quotes ${k} at ${p}`);
    assert.ok(!chips.some(c => c.label.includes("฿" + _num(_HOTELS[k].rate)) || c.label.includes("฿" + _HOTELS[k].rate)), `no chip quotes ${k}'s tourist rate`);
  }
});

test("S9-6: the Orchid's women are offered on no surface for what the room refuses, and what is offered at a table is taken", () => {
  sandbox(); G.money = 500000; G.nightTurn = 40; G.room = "orchid_room"; G.known.pae = true;
  const wheel = _npcActions("pae", true);
  for (const a of ["buyher", "barfine", "flirt", "tip"]) assert.ok(!wheel.includes(a), `the wheel offers no ${a}`);
  for (const v of ["barfine ", "buy drink for ", "tip ", "flirt "]) assert.deepEqual(engineComplete(v), [], `no completion for "${v}"`);
  _convoStart("pae");
  assert.ok(!_chipSet().some(c => /^buy drink for |^flirt$/.test(c.cmd)), "no drink or flirt chip");
  // a bottle makes it your table: tip and flirt come back on the wheel, and each is taken, not refused
  G.soc.orchidBottle = ORCHID_BOTTLES[0].id;
  const tw = _npcActions("pae", true);
  assert.ok(tw.includes("tip") && tw.includes("flirt")); assert.ok(!tw.includes("barfine") && !tw.includes("buyher"));
  assert.doesNotMatch(t("flirt pae"), /room drops a degree|belong to the corner/);
  assert.equal(_orchidRefuses("barfine"), true); assert.equal(_orchidRefuses("drink"), true);
});

test("S9-7: a tap menu fans out to every destination, not the keyboard's eight — the motosai reaches Naklua", () => {
  sandbox(); G.room = "beach_rd_klang"; G.nightTurn = 30;
  assert.equal(engineComplete("motosai to ").length, 8, "typed suggestions keep their cap");
  const all = engineComplete("motosai to ", { all: true });
  assert.equal(all.length, Object.keys(MOTOSAI_DESTS).length); assert.ok(all.includes("naklua"));
  assert.match(readFileSync(fileURLToPath(new URL("../../web/js/term.js", import.meta.url)), "utf8"), /engineComplete\(cmd, \{ all: true \}\)/,
    "term.js's prefill menu asks for every match");
});

test("S9-8: in the Soi 6 week the motosai stand offers no chip and no destinations, the way the bus offers none", () => {
  startSoi6Mode(); G.pendingChoice = null; _setFlag("act1Done"); G.room = "soi6_street"; G.nightTurn = 30; G.money = 5000; quiet();
  assert.ok(ROOMS.soi6_street.motosai, "the stand is there");
  assert.ok(!_chipSet().some(c => c.cmd === "motosai to "));
  assert.deepEqual(engineComplete("motosai to "), []);
});

test("S9-10: on the start menu only the display switches pass — \"toggle e\" does not drive the skeleton game or overwrite the save", () => {
  sandbox(); G.money = 9000; G.day = 5; G.room = "stinky_bar"; D("look");
  const before = STORE.lbb_save;
  _showStartMenu(); assert.equal(OVERLAY.hidden, false);
  assert.match(D("toggle e"), /Pick a mode/);
  assert.equal(STORE.lbb_save, before, "the save is the night it was");
  assert.match(D("toggle v1"), /v1 hotspots/, "the display switches still work on the menu");
});

test("S9-11: the month book's day count is code, not a comment, and a night counts one day", () => {
  assert.doesNotMatch(src("engine-play"), /\/\/[^\n]*G\.month\.days = \(G\.month\.days \|\| 0\) \+ 1; \}/, "no statement swallowed by a trailing comment");
  sandbox("expat"); G.payDay = G.day; G.room = _hotelRoomId(); G.day = 3; G.nightTurn = 60; G.money = 50000;
  // the first morning has no baseline to measure against; the second is the ledger
  _endNight("sleep"); G.room = _hotelRoomId(); G.nightTurn = 60; quiet();
  const d = (G.monthClosing || G.month).days || 0;
  _endNight("sleep");
  assert.equal((G.monthClosing || G.month).days, d + 1, "one night, one day in the month's book");
});

test("S9-12: SAVE and UNDO, offered by the completion in every host, get an engine answer, not a parse failure", () => {
  sandbox(); G.room = "stinky_bar";
  assert.ok(engineComplete("sa").includes("save") && engineComplete("und").includes("undo"));
  for (const v of ["save", "undo"]) assert.doesNotMatch(t(v), /blinks at you/, v);
  assert.match(t("save"), /saves itself/);
});
