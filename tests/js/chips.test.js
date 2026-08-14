// Context chips: the quick-command bar (the fourth surface, with the typed
// parser, the flyout wheel, and autocomplete). _chipSet() is DOM-free and pure
// over G — term.js renders whatever it returns each turn.
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
engineInit(() => {}, null, () => {});
beforeEach(() => { newGame(); });

const cmds = () => _chipSet().map(c => c.cmd);
const labels = () => _chipSet().map(c => c.label);

test("every prefill chip ends in a space; every bare chip doesn't", () => {
  // find a bar with girls so we exercise the prefill chips (flirt…/buy drink…)
  const bar = Object.keys(ROOMS).find(id => { G.room = id; return _inBar() && _npcsHere().some(n => NPC_ROLES[n] === "hostess"); });
  G.room = bar;
  for (const { cmd, label } of _chipSet()) {
    if (label.endsWith("…")) assert.ok(cmd.endsWith(" "), `prefill "${label}" cmd should end in space`);
    else assert.ok(!cmd.endsWith(" "), `bare "${label}" cmd should not`);
  }
});

test("a girl bar offers flirt / buy drink / barfine / beer", () => {
  const bar = Object.keys(ROOMS).find(id => { G.room = id; return _inBar() && _npcsHere().some(n => NPC_ROLES[n] === "hostess"); });
  G.room = bar;
  const c = cmds();
  assert.ok(c.includes("flirt "), "flirt prefill");
  assert.ok(c.includes("buy drink for "), "buy drink prefill");
  assert.ok(c.includes("barfine "), "barfine prefill");
  assert.ok(c.includes("buy beer"));
});

test("a 7-Eleven offers the rack via the buy-prefill chip", () => {
  // one "7-Eleven…" chip that prefills "buy " (autocomplete fans out the goods,
  // ATM-style) replaced the three fixed purchase chips — playtest #14
  const seven = Object.keys(ROOMS).find(id => ROOMS[id].seven);
  G.room = seven;
  assert.ok(cmds().includes("buy "), "the buy-prefill chip is offered");
});

test("a street room offers its real exits and no bar verbs", () => {
  // a plain connector with exits but no bar/shop
  const street = Object.keys(ROOMS).find(id => {
    const r = ROOMS[id];
    return !r.barType && !r.seven && !FOOD_STALLS[id] && r.exits && Object.keys(r.exits).length >= 2;
  });
  G.room = street;
  const r = ROOMS[street];
  const c = cmds();
  // the ENGINE offers every exit — term.js filters the compass-duplicated
  // cardinals view-side (tests/e2e/compass.spec asserts the split)
  for (const k of ["n", "s", "e", "w", "in", "out"]) if (r.exits[k]) assert.ok(c.includes(k), `exit ${k} chipped`);
  assert.ok(!c.includes("flirt "), "no flirt on the street");
  assert.ok(c.includes("look") && c.includes("i") && c.includes("help"), "utilities always present");
});

test("a live Connect 4 game shows only its moves + quit", () => {
  const bar = Object.keys(ROOMS).find(id => { G.room = id; return _barGamesHere && _barGamesHere(); }) ||
    Object.keys(ROOMS).find(id => ROOMS[id].barType);
  G.room = bar;
  G.game = { type: "c4", board: c4New() };
  assert.deepEqual(cmds(), ["1", "2", "3", "4", "5", "6", "7", "quit"], "columns 1-7 then quit");
  assert.deepEqual(labels().slice(0, 7), ["drop 1", "drop 2", "drop 3", "drop 4", "drop 5", "drop 6", "drop 7"]);
  assert.ok(!cmds().includes("look"), "the room's own verbs are suppressed mid-game");
});

test("a pending checkout shows the hotel menu", () => {
  G.pendingChoice = "checkout";
  const c = cmds();
  assert.ok(c.includes("sabai") && c.includes("metropole") && c.includes("stay"));
});

test("the vacation-end prompt shows its two answers", () => {
  G.pendingChoice = "vacation_end";
  assert.deepEqual(cmds(), ["new vacation", "move to pattaya"]);
});

test("the barfine negotiation owns the chip bar: ST / LT / NO, priced", () => {
  // Regression: the ST/LT modal swallowed every command while the chip bar kept
  // showing room chips — a touch player faced a row of dead buttons (the soak's
  // seed-12 wedge: a whole night spent tapping inside the modal).
  G.room = "lucky_tiger";
  G.pendingBf = { id: "lek", st: 400, lt: 700, room: "lucky_tiger" };
  assert.deepEqual(cmds(), ["short time", "long time", "no"]);
  assert.ok(labels()[0].includes("฿400") && labels()[1].includes("฿700"), "terms carry their prices");
});

test("the soapy menu and a pending fare own the chip bar too", () => {
  G.pendingSoapy = true;
  const c = cmds();
  for (const t of _SOAPY_TIERS) assert.ok(c.includes(String(t.num)), `tier ${t.num} chipped`);
  assert.ok(c.includes("no"));
  G.pendingSoapy = null;
  G.pendingFare = { price: 15 };
  assert.deepEqual(cmds(), ["pay"]);
  assert.ok(labels()[0].includes("฿15"));
});
