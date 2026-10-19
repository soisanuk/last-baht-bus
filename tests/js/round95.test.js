// ROUND 95 (2026-10-19) — Jurgen Albrecht (Opus, owner-stacked-week: a seeded September owner who never answers the
// question he was asked without doing something else first, and reads BOOKS against the people): "The till remembers
// my bar. The people in it only know what is in front of them this minute." The composition class at procurement, and
// the kept girl's first walk: BOOKS said she was out with her sponsor; the staff said she had a cold.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const close = () => { let g = 0; while (G.pendingChoice && g++ < 8) run(G.pendingChoice === "affaircrisis" ? "1" : "no"); };   // a crisis takes a number, never "no"
const ask = (who, what) => { out = []; run("ask " + who + " about " + what); close(); return said(); };
const owner = () => { G.stage = "expat"; G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true; G.flags.tanAsked = true;
  G.bar.room = "stinky_bar"; G.bar.owner = true; G.room = "stinky_bar"; G.money = 20000; G.bar.cash = 12000; G.bar.nights = 16; G.day = 20; G.nightTurn = 30;
  G.bar.shiftAsked = true; run("look"); close(); out = []; };

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; out = [];
});

test("SEVERE: the kept girl is what BOOKS says she is, to everybody on her floor, by role and by stage", () => {
  owner(); G.bar.kept = { id: "manow", since: 18, paidTo: 30, stage: "paying", told: true, fee: 1000 };
  assert.match(ask("lamai", "manow"), /sponsor|her man|pay/i); assert.doesNotMatch(said(), /day off|sick/i);
  assert.match(ask("cake", "sponsor fee"), /฿500|into my till|write it/i);
  assert.match(ask("jiap", "manow"), /sponsor|her man|a man now|he pay|lucky/i);
  assert.match(ask("bert", "manow"), /fee|kept|fellow/i);
  G.bar.kept.stage = "lapsed"; G.bar.kept.lapsed = 18;
  assert.match(ask("lamai", "manow"), /stop|money|board/i); assert.match(ask("bert", "manow"), /stopped|no money|fee|decided/i);
});

test("the fee lands before the night is settled: the morning's till is BOOKS' till", () => {
  owner(); G.bar.kept = { id: "manow", since: 18, paidTo: 40, stage: "paying", told: true, fee: 0 };
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  const settle = src.slice(src.indexOf("function _barSettle("), src.indexOf("function _barSettle(") + 6000);
  assert.ok(settle.indexOf("_keptTick()") < settle.indexOf("_barNight(settleDay)"), "the fee before the night's figures");
  assert.equal((settle.match(/_keptTick\(\)/g) || []).length, 1, "once");
});

test("the round on the house is askable by the word the parser hands over", () => {
  owner(); G.bar.calls = [{ id: "round", day: G.day, yes: true }];
  assert.doesNotMatch(ask("jiap", "the round"), /Not my story|don't know about that/i);
  assert.doesNotMatch(ask("bert", "the round on the house"), /above my pay grade|not my department/i);
});

test("the affair girl remembers the night at home: last night, the note, the ice man", () => {
  owner(); G.affair = { id: "jiap", begun: G.day - 3, strain: 2, floorSour: 0, together: G.day, homeDay: G.day, crisSeen: AFFAIR_CRISES.map(c => c.id), crisChose: {}, lastCris: G.day }; G.soc.drinks.jiap = 14;   // every crisis seen: none is dealt over the question
  run("talk to jiap"); G.convoQ = null;
  assert.doesNotMatch(ask("jiap", "last night"), /Cake's side|Ask me something about us/i); assert.match(said(), /room|snore|last night/i);
  assert.match(ask("jiap", "the note"), /ice|four/i);
});

test("the affair door opens at the room's own last call and answers a question", () => {
  owner(); G.soc.drinks.jiap = 14; G.bar.worked = 1; G.bar.workedDay = G.day; G.bar.workedLast = true;
  G.room = "stinky_bar"; G.nightTurn = 55;
  // the Stinky shuts at two: 55 is not last call there
  if (typeof _closeTurn === "function" && _closeTurn("stinky_bar") && _closeTurn("stinky_bar") > 60) assert.equal(_affairDue(), null, "not at 23:30 on a street that shuts at two");
  G.pendingChoice = "affair"; G.affairWho = "jiap"; out = []; run("what happens if i stay?");
  assert.equal(G.pendingChoice, "affair", "the gate stays up"); assert.match(said(), /STAY|STEP BACK/);
});

test("prose: Tan turns a glass he has, the cashier's paper has a tense, the mama does not count absent girls", () => {
  const w = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  assert.doesNotMatch(w, /turns his coffee a quarter-turn/);
  assert.ok(_TOPIC_MISS_THAI.length >= 8, "the Thai house miss pool is deep enough for two women on one floor");
  assert.ok(!_OWNER_GREET.mamasan.some(f => /Two girl late/.test(String(f))), "a greeting that counts absent girls is a claim");
});
