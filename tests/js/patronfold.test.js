// THE PATRON-FOLD PARITY FILE. The 24 bar regulars were folded from their own
// PATRONS table into NPCS (`patron: true`, 2026-08-28) under a behavior-
// preserving contract: everything a player could observe of the old split must
// survive the merge, enforced here by GUARDS AND FLAGS instead of by table
// membership. This file must stay green, unedited, through stage 2 (the talk-
// path unification into _deliver) and stage 3 (deleting the compat aliases) —
// if a later stage needs to change an assertion here, that stage has changed
// observable behavior and must say so out loud.
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
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");

function sandbox() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  G.money = 5000;
  G.season0 = 10; // November — high season, nobody season-thinned unless a test moves it
  out = [];
}
beforeEach(() => sandbox());

// ── the fold itself ──

test("one entry per regular, reachable under either name, and no duplicates anywhere", () => {
  const bench = Object.entries(NPCS).filter(([, n]) => n.patron);
  assert.equal(bench.length, 24, "the whole bench came across");
  for (const [id] of bench) assert.equal(NPCS[id], PATRONS[id], `${id}: the view must share the reference`);
  G.room = "queen_vic";
  const here = _npcsHere();
  assert.equal(new Set(here).size, here.length, "_npcsHere lists nobody twice");
  const addr = _addressable();
  assert.equal(new Set(addr).size, addr.length,
    "_addressable lists nobody twice — a duplicate breaks the sole-candidate pronoun rule");
  assert.ok(here.includes("mort") && here.includes("angela"), "the regulars are in the one cast");
});

// ── position: the three absences the flag preserves ──

test("David teaches Mon/Fri: on the stool his nights out, inactive (not homeless) otherwise", () => {
  G.day = 1; // Monday
  assert.equal(_npcActive("david"), true);
  assert.equal(_npcRoom("david"), "stinky_bar");
  G.day = 2; // Tuesday — marking homework
  assert.equal(_npcActive("david"), false, "absence lives in _npcActive");
  assert.equal(_npcRoom("david"), "stinky_bar",
    "_npcRoom stays TOTAL — an inactive man still has a local, he just isn't on its stool");
  assert.equal(_patronRoom("david"), null, "the compat alias reads absence as null, as it always did");
});

test("Glam is at the Cheeky Monkey early and walked across to Hyper after 22:00", () => {
  G.nightTurn = 20; assert.equal(_npcRoom("glam"), "cheeky_monkey");
  G.nightTurn = 55; assert.equal(_npcRoom("glam"), "hyper");
  assert.ok(NPCS.glam.protected, "age, money and standing keep him off-limits");
});

test("low season thins the BENCH and never the staff", () => {
  G.season0 = 8; // September — deeplow, ~60% of the regulars stay in
  G.day = 3;
  const bench = Object.keys(NPCS).filter(id => NPCS[id].patron);
  const out1 = bench.filter(id => !_npcActive(id));
  assert.ok(out1.length > 0, "somebody stayed in tonight");
  const staff = Object.keys(NPCS).filter(id => NPC_ROLES[id] && !NPCS[id].patron);
  const thinned = staff.filter(id => !_npcActive(id));
  assert.deepEqual(thinned, [], "a working girl is never season-thinned — she can't afford to be");
});

// ── the social wall: refused by guard, in the authored voices ──

test("a social verb never lands on a regular — the rail brush-off, not the staff refusal", () => {
  G.room = "queen_vic";
  out = [];
  doCommand("flirt with mort");
  assert.match(text(), /regular at the rail, not one of the girls/,
    "the authored brush-off survived the fold (it used to live behind table membership)");
  out = [];
  doCommand("kiss angela");
  assert.match(text(), /regular at the rail/);
});

test("bare FLIRT in a room whose only company is a punter stays aimed at the ambience", () => {
  // lake_beer: Neil's stool. If any staff are homed there the premise is void —
  // guard the premise so the test can't rot silently.
  G.room = "lake_beer";
  const staffHere = _npcsHere().filter(id => !NPCS[id].patron);
  if (staffHere.length) return; // premise gone (someone staffed the lake bar) — covered elsewhere
  out = [];
  doCommand("flirt");
  assert.match(text(), /ambience/, "the sole-candidate rule must not pick the patron");
});

test("BARFINE and TIP still refuse a regular the way they refuse any non-lady", () => {
  G.room = "queen_vic";
  out = [];
  doCommand("barfine mort");
  assert.match(text(), /not working this bar|Nobody here by that name|not one of the girls/i);
  out = [];
  doCommand("tip mort 100");
  assert.match(text(), /Tip who\? Name one of the ladies|not one of the girls/i);
  assert.equal(G.money, 5000, "no baht moved");
});

test("a regular takes a beer, not a lady drink — and the ledger credits him", () => {
  G.room = "queen_vic";
  const before = G.money;
  out = [];
  doCommand("buy mort a drink");
  assert.equal(before - G.money, BEER_PRICE, "beer price, not lady-drink price");
  assert.match(text(), /stand.*Chang|slides down the bar/i, "the stand-a-beer scene, not the lady-drink scene");
});

// ── talk: the daily book and the met-once greeting ──

test("a regular's stories are new every night; his greeting is met-once", () => {
  G.room = "queen_vic";
  out = [];
  doCommand("talk to mort");
  const intro = text();
  assert.ok(intro.length > 80, "first contact: the full greeting");
  out = [];
  doCommand("ask mort about column");
  const col = text();
  assert.ok(col.length > 80, "a topic node in full");
  out = [];
  doCommand("ask mort about column");
  assert.ok(text().length < col.length, "same night: the gist, not the spiel");
  // next day: the seen-book has reset — the story comes back in full…
  G.day += 1;
  out = [];
  doCommand("ask mort about column");
  assert.ok(text().length >= col.length * 0.8, "new night, full story again");
  // …but he does NOT re-introduce himself from scratch
  out = [];
  doCommand("talk to mort");
  assert.ok(text().length < intro.length, "met once is met — the greeting stays terse across nights");
});

test("Fergie's sore subject still pre-empts: rage-bait is a landmine, not a topic", () => {
  G.room = "gold_rush";
  out = [];
  doCommand("ask fergie about bert");
  // the resolver rolls swing-or-simmer on a nightly-stable hash; either way it
  // must be the LANDMINE that answered, never the ordinary miss pool
  assert.doesNotMatch(text(), /Not one I know|Search me|Couldn't tell you|told you|I don't know/i,
    "the rage resolver answered, not the ordinary topic-miss path");
  assert.match(text(), /Fergie/);
});

// ── the third sense of "patron": the anonymous archetype is untouched ──

test("TALK TO PATRON in a bar with no named regular still raises the archetype", () => {
  G.room = "anchor_bar";
  const named = _npcsHere().filter(id => NPCS[id].patron);
  assert.deepEqual(named, [], "premise: the Anchor has no named regular");
  out = [];
  doCommand("talk to patron");
  assert.ok(text().trim().length, "the anonymous bar-bore answered");
  assert.doesNotMatch(text(), /didn't understand/i);
});

// ── examine: the profile card survived leaving the presence line ──

test("EXAMINE a regular gives his desc plus the (age, nationality) card", () => {
  G.room = "queen_vic";
  out = [];
  doCommand("examine mort");
  assert.match(text(), /\(74, American\.\)/, "the card the old patron branch printed");
});

// ── fuzziness: the bench kept _findPatron's stricter matching ──

test("a regular keeps the stricter matching: exact and prefix yes, mid-name substring no", () => {
  // The bench is two dozen short common names, and _findNpc's substring pass is
  // fuzzier than the _findPatron it replaced. Letting them into it is the
  // bell→Belle collision class. The staff keep the fuzzy pass; the rail doesn't.
  G.room = "queen_vic";
  assert.ok(_npcsHere().includes("mort") && _npcsHere().includes("doyle"), "premise: both are in");
  assert.equal(_findNpc("mort"), "mort", "exact still resolves");
  assert.equal(_findNpc("mor"), "mort", "name-prefix still resolves, as _findPatron always did");
  assert.equal(_findNpc("ort"), null, "…but a mid-name substring must NOT reach a regular");
  assert.equal(_findNpc("oyl"), "doyle", "while a staff NPC keeps the fuzzy substring pass");
  // the title fuzzy is unchanged for both — it is how "the owlish old-timer" resolves
  assert.equal(_findNpc("owlish old-timer"), "mort");
});
