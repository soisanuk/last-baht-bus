// Round 69 (2026-10-08) — Henrik Lund, a retired ferry purser (Fable, lens: one-bar-week), five
// nights on one stool at The Gilt Cage, the first floor written woman by woman. His verdict: "The
// women are real… The room lets them down. Fix the chorus, give the show a verb, and let the house
// remember who sat in it."
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
beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "blunt", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 20000; G.bank = 50000; G.nightTurn = 30; G.room = "windmill"; out = [];
});
const meet = (...ids) => { for (const id of ids) run("talk to " + id); out = []; };
const ask = (id, t) => { out = []; run(`ask ${id} about ${t}`); return said(); };

// ── the room ──────────────────────────────────────────────────────────────────
test("a go-go is enclosed: no saleng, no drizzle, and the rain is a rumour through the ceiling", () => {
  for (const r of Object.keys(ROOMS).filter(r => ROOMS[r].barType === "gogo")) assert.ok(ROOMS[r].indoors, r);
  out = []; _startRain(4); assert.ok(_RAIN_GOGO.some(l => said().includes(l.slice(0, 40))));
  assert.doesNotMatch(said(), /street empties|awning|sandwich board|tin/);
});
test("the stage is a show: WATCH SHOW by the hour, the staff know the schedule, and there is no telly", () => {
  G.nightTurn = 10; out = []; run("watch show"); assert.match(said(), /lowest tier|overture/);
  G.nightTurn = 65; out = []; run("watch show"); assert.match(said(), /top tier/);
  out = []; run("watch tv"); assert.match(said(), /No telly in a go-go/);
  meet("nubnab"); assert.match(ask("nubnab", "schedule"), /top tier at midnight/);
  G.room = "katoeys"; G.nightTurn = 52; out = []; run("watch show"); assert.match(said(), /Eleven o'clock, the big show/);
});
test("the bar's scenery rules hold in a go-go: EXAMINE BELL answers under the bell", () => {
  out = []; run("examine bell"); assert.doesNotMatch(said(), /Not here|not a thing/);
});
test("SMELL and LISTEN are the go-go's, not a beer bar's", () => {
  out = []; run("smell"); assert.ok(_GOGO_SMELLS.some(l => said().includes(l.slice(0, 30))));
  out = []; run("listen"); assert.ok(_GOGO_SOUNDS.some(l => said().includes(l.slice(0, 30))));
});
test("the nurse reads the cup: six chits buy the seat time, and nobody says 'you drink nothing'", () => {
  G.soc.drinkCount = { naree: 3, yada: 3 }; (G.soc.selfDrinks = {}).windmill = 1;
  assert.equal(_chitsHere(), 7);
  (G.soc.spentTurn = {}).windmill = G.turns - 5;   // past the go-go's base patience…
  assert.equal(_nursed(), false, "…but the cup covers it");
});

// ── the house ─────────────────────────────────────────────────────────────────
test("the house knows its floor's regular", () => {
  G.soc.drinks.naree = 9; meet("wanida", "nubnab");
  assert.doesNotMatch(ask("wanida", "me"), /New face|don't know you yet/);
  assert.doesNotMatch(ask("nubnab", "me"), /New face|don't know you yet/);
});
test("the chorus: two women at one bar do not hand you one sentence", () => {
  G.soc.drinks.naree = 9; meet("wanida", "nubnab");
  const a = ask("wanida", "me").split("\n")[0], b = ask("nubnab", "me").split("\n")[0];
  assert.notEqual(a.replace(/Wanida/g, "X"), b.replace(/Nubnab/g, "X"));
  // a pooled floor: one speaker does not review two colleagues in the same words
  G.room = "crystal_palace"; const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan" && NPCS[i].filler);
  const girls = _npcsHere().filter(i => NPC_ROLES[i] === "hostess" && NPCS[i].filler && !FLOOR_OWN[i]).slice(0, 2);
  if (mama && girls.length === 2) {
    run("talk to " + mama);
    const r1 = ask(mama, NPCS[girls[0]].name).replace(NPCS[girls[0]].name, "X"), r2 = ask(mama, NPCS[girls[1]].name).replace(NPCS[girls[1]].name, "X");
    assert.notEqual(r1, r2);
  }
});
test("a regular calls the mamasan what she is; the staff know a regular who drifts in", () => {
  G.room = "club_mirage"; run("talk to danny");
  assert.match(ask("danny", "da"), /Runs the floor|runs the floor/);
  assert.doesNotMatch(said(), /Good girl/);
  G.day = 7; G.room = "windmill"; G.nightTurn = 70; meet("nubnab");
  assert.doesNotMatch(ask("nubnab", "danny"), /Not a thing I know|cannot help/);
});
test("a big tip makes the mamasan decide you exist ONCE a trip, not every night", () => {
  meet("naree");
  const saved = _rand;
  try {
    let n = 0;
    for (let i = 0; i < 20; i++) { _rand = () => (i % 10) / 10; G.soc.tipBond = 0; out = []; run("tip ping 500"); if (/decides you exist/.test(said())) n++; }
    assert.ok(n <= 1, "said " + n + " times");
  } finally { _rand = saved; }
});
test("WHO counts women MET, not names heard", () => {
  G.soc.drinks.naree = 9; G.phone.contacts = {}; G.known = { naree: true, yada: true, sasi: true, wanida: true };
  G.talked = { naree: [0] };
  out = []; run("who"); assert.doesNotMatch(said(), /out of \d+ working girls/, "met one, in the book one: no footer to pad");
});

// ── the women, in their own words ─────────────────────────────────────────────
test("every subject a Gilt Cage woman raises herself, she answers", () => {
  meet("naree", "yada", "sasi", "wanida", "nubnab");
  assert.match(ask("sasi", "roof"), /Red tin/);
  assert.match(ask("nubnab", "owner"), /Bangkok/);
  assert.match(ask("nubnab", "quota"), /quota book/);
  assert.match(ask("nubnab", "spend"), /\(CHECK BIN\)/);
  assert.match(ask("wanida", "stairs"), /one floor/);
  assert.match(ask("yada", "chair"), /never say yes/);
  assert.match(ask("yada", "buddha"), /I give it to a boy/);
  assert.match(ask("naree", "bet"), /Fifty baht/);
  assert.match(ask("naree", "monk"), /same monk/);
});
test("the house's account of each girl agrees with her own (no cousin for an orphan, no 'soft' for Pong)", () => {
  meet("wanida");
  assert.doesNotMatch(ask("wanida", "sasi"), /cousin/); assert.match(said(), /temple home/);
  assert.doesNotMatch(ask("wanida", "pong"), /soft with the old men/);
  assert.notEqual(ask("wanida", "ping"), ask("wanida", "pong"));
});
test("Pong's greeting does not put Ping on the stage", () => {
  assert.doesNotMatch(FLOOR_OWN.yada.nodes.map(n => n.text).join(" "), /up on the stage/);
});
test("the pub's own floor knows its rail, and a woman regular is not 'he'", () => {
  G.room = "queen_vic"; G.nightTurn = 70; meet("gaew");
  const a = ask("gaew", "angela"); assert.match(a, /Angela/); assert.doesNotMatch(a, /\b(he|his|him|men like)\b/i);
  assert.match(ask("gaew", "terry"), /Terry/);   // a rail customer without the patron flag
  for (const line of Object.values(_TOWN.regular).flat()) assert.doesNotMatch(line.replace(/\{\w+\}/g, ""), /\b(He|he|his|him)\b/, line);
});
test("Danny knows the bar he drifts into early, and the joke", () => {
  G.room = "club_mirage"; G.nightTurn = 70; meet("danny");
  assert.match(ask("danny", "gilt cage"), /warm-up/); assert.doesNotMatch(said(), /Been in once/);
  assert.match(ask("danny", "ping pong"), /Pong/);
});
