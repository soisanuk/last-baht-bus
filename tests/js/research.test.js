// Mechanics built from the essay ledger (docs/essay-ledger.md, 2026-10-01) under
// docs/source-material-policy.md — the pattern, never the expression. One test per
// mechanic, in the order they shipped.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const W = new URL("../../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(W + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const run = (c) => doCommand(c);
const said = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; out = [];
});

// ── Theme 3: bonds survive the flight ────────────────────────────────────────
test("the return is the moment: her-farang comes back a regular, a regular a face, a face a stranger", () => {
  G.soc.drinks = { lek: 14, noi: 8, fon: 4 }; G.phone.contacts = { lek: true }; G.day = 8;
  _endVacation(); G.pendingChoice = null; out = []; _newVacation();
  assert.equal(_bondTier("lek"), 2, "her farang → regular");
  assert.equal(_bondTier("noi"), 1, "regular → face");
  assert.equal(_bondTier("fon"), 0, "a face is a week's warmth");
  // …and walking into her bar carries her most of the way back
  G.room = _npcRoom("lek"); out = []; _arriveAt(G.room);
  assert.match(said(), /You come BACK|You COME|How long you gone/);
  assert.ok(_bondTier("lek") >= 2 && (G.soc.drinks.lek || 0) >= 11, "one drink from her farang again");
});

// ── Theme 2: cheap care beats money ─────────────────────────────────────────
test("SEE <her> HOME at closing: presence, not purchase — bond through _addBond, once a night, she is off the floor after", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 4; G.nightTurn = 30;
  out = []; run("see lek home");
  assert.ok(_SEE_HOME_EARLY.some(f => said().includes(f("Lek"))), "not before closing");
  G.nightTurn = 85; const b = G.soc.drinks.lek, bought = (G.soc.bondNight || {}).lek || 0;   // a beer bar lets her go after the last bus
  assert.ok(_npcActions("lek", true).includes("seehome"), "on the wheel at closing");
  const saved = _rand; _rand = () => 0.99;   // no saleng, no encounter inside the three ticks
  try { out = []; run("see lek home"); } finally { _rand = saved; }
  assert.ok(_SEE_HOME.some(l => said().includes(_fmt(l, { n: "Lek" }).slice(0, 40))), said());
  assert.equal(G.soc.drinks.lek, b + 2); assert.equal(((G.soc.bondNight || {}).lek || 0), bought, "never the lady-drink book");
  assert.equal(G.soc.leftEarly.lek, G.day);
  out = []; G.room = "lucky_tiger"; run("see lek home"); assert.match(said(), /already walked|isn't here/);
});
test("at regular tier the first beer is waiting on the mat", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 8; G.money = 5000;
  out = []; run("buy beer"); assert.ok(_USUAL_LINES.some(l => said().includes(l.split("{n}")[1].slice(0, 20))), said());
  out = []; run("buy beer"); assert.ok(!_USUAL_LINES.some(l => said().includes(l.split("{n}")[1].slice(0, 20))), "once a night");
});

// ── Theme 8: absences that are true ─────────────────────────────────────────
test("November's harvest and the trough thin the filler floor, day-stable, with a reason the street can give — and never your own bar", () => {
  const fillers = Object.keys(NPCS).filter(id => NPCS[id].filler && NPC_ROLES[id] === "hostess");
  G.season0 = 10;   // November
  const ever = new Set();
  for (let d = 1; d <= 30; d++) { G.day = d; for (const id of fillers) if (_awayForSeason(id) === "harvest") ever.add(id); }
  assert.ok(ever.size > fillers.length / 4 && ever.size < fillers.length / 2, "a third of the floor goes home at some point: " + ever.size);
  G.day = 5;
  const away = fillers.filter(id => _awayForSeason(id) === "harvest");
  assert.ok(away.length >= 3 && away.length < fillers.length / 3, "on one night, some and not all: " + away.length);
  assert.deepEqual(fillers.filter(id => _awayForSeason(id) === "harvest"), away, "day-stable");
  const girl = away[0]; G.known[girl] = true; G.room = _npcRoom(girl);
  assert.ok(!_npcActive(girl)); assert.match(_elsewhereLine(NPCS[girl].name.toLowerCase()), /rice harvest/);
  G.season0 = 8; G.day = 5;   // September, the trough
  const gone = fillers.filter(id => _awayForSeason(id) === "bangkok");
  assert.ok(gone.length > 0 && gone.length < fillers.length / 3);
  G.known[gone[0]] = true; assert.match(_elsewhereLine(NPCS[gone[0]].name.toLowerCase()), /Bangkok/);
  G.bar.room = NPCS[gone[0]].room; assert.equal(_awayForSeason(gone[0]), false, "the owner's floor is exempt");
});

// ── The merit ceremony: culture beats arithmetic, once ──────────────────────
test("the merit call opens on a run of bad nights; YES pays and warms the floor, NO costs the night the floor spent across the road", () => {
  G.stage = "expat"; _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar";
  assert.ok(!_shiftEligible().some(c => c.id === "merit"));
  G.bar.badRun = 2; assert.ok(_shiftEligible().some(c => c.id === "merit"));
  G.bar.cash = 10000; G.bar.shiftAsked = true; G.shiftCall = "merit"; G.pendingChoice = "shift";
  const c0 = G.bar.cash; out = []; run("yes");
  assert.equal(G.bar.cash, c0 - MERIT_COST); assert.equal(G.bar.badRun, 0); assert.equal(G.bar.meritDay, G.day);
  assert.ok(!_shiftEligible().some(c => c.id === "merit"), "not twice in a month");
  G.bar.badRun = 3; G.bar.meritDay = G.day - 40; G.bar.shiftAsked = true; G.shiftCall = "merit"; G.pendingChoice = "shift";
  out = []; run("no"); assert.ok((G.bar.lostTake || 0) >= SHIFT_MERIT_LOSS); assert.match(said(), /across the road/);
});
