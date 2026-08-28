// ROUND 22 — three blind Opus personas on the merged movement build: Eric (68,
// came for the company not the girls), Priya (100% completionist, logged every
// location claim the game made and walked to it), Derek (picked one bar and sat
// in it for a week).
//
// The round's own verdict first, because it is the reason the drift exists:
// Priya's pointer hit rate was 37 of 38 — "I hunted this for eight nights and
// it held up". The thing that killed the hop's FIRST life is fixed. What is
// pinned below is everything the same three sessions found broken.
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
  out = [];
}
beforeEach(() => sandbox());

// ── ERIC #2 / PRIYA #7: the rail thinned and never filled ───────────────────

test("the ten-o'clock homecoming is narrated, not silent", () => {
  // Eric watched Drew leave at half six with a proper line and reappear at ten
  // in total silence — "half a mechanic". Priya had Fergie vanish from under her
  // while she stood in the room. One cause: _railRoomAt asked _hopsNow, which
  // reads the LIVE clock, so at 22:00 it reported every man as home all evening.
  G.day = 6; G.nightTurn = 40;                 // the settle
  const movers = Object.keys(NPCS).filter(id =>
    NPCS[id].hops && _npcActive(id) &&        // a man the season sent home has not moved
    _railRoomAt(id, 3) !== _railRoomAt(id, 4));
  assert.ok(movers.length, "somebody walks home at ten");
  const id = movers[0], from = _railRoomAt(id, 3);
  G.room = from; out = [];
  _railTick();
  assert.ok(_RAIL_LEAVES.some(f => text().includes(f(_npcLabel(id)))),
    "the bar he leaves sees him leave");
  G.room = _railRoomAt(id, 4); out = [];
  _railTick();
  assert.ok(_RAIL_ARRIVES.concat(_RAIL_QUIZ).some(f => text().includes(f(_npcLabel(id)))),
    "and his local sees him come home");
});

test("_canHop answers about the man, _hopsNow about the hour", () => {
  // The split IS the fix; folding them back together silently kills the settle.
  G.nightTurn = 0;
  assert.equal(_canHop("nigel"), true);
  assert.equal(_hopsNow("nigel"), true);
  G.nightTurn = 50;                            // after the settle
  assert.equal(_canHop("nigel"), true, "he is still the sort of man who drifts");
  assert.equal(_hopsNow("nigel"), false, "he is simply not drifting now");
  assert.equal(_railRoomAt("nigel", 2), _hopRoom("nigel", 2),
    "and an hour that isn't now still answers about that hour");
});

// ── ERIC #1: a man who names his nights keeps them ──────────────────────────

test("the season never thins a regular off a night he told you he'd be there", () => {
  // David: "Mondays and Fridays are my days off so those are my beer days."
  // Eric wrote it down, walked to the Stinky on a Monday, found an empty stool.
  // Measured before the fix: absent 19 of 32 stated nights in the deep-low.
  const stated = NPCS.david.days;
  assert.ok(stated && stated.length, "premise: he states a rota");
  for (const m of [0, 5, 7, 8, 9]) {           // across the whole seasonal curve
    G.season0 = m;
    for (let v = 1; v <= 4; v++) {
      G.vacation = v;
      for (let d = 1; d <= 28; d++) {
        G.day = d;
        if (!stated.includes(d % 7)) continue;
        assert.equal(_benchOut("david"), false,
          `month ${m}, vacation ${v}, day ${d} is one of his own beer nights`);
        assert.equal(_npcActive("david"), true, "…so he is out");
      }
    }
  }
});

test("a regular who names no nights is still thinnable — the season still bites", () => {
  G.season0 = 9; G.vacation = 1;               // deep low
  let thinned = 0;
  const bench = Object.keys(NPCS).filter(id => NPCS[id].patron && !NPCS[id].days);
  for (let d = 1; d <= 28; d++) { G.day = d; thinned += bench.filter(_benchOut).length; }
  assert.ok(thinned > 0, "the trough still empties the rail — the fix is narrow, not a repeal");
});

// ── PRIYA #6 / DEREK #5: prose that puts a man in a room he isn't in ────────

test("a close look at the notebook knows whether its owner is in", () => {
  // "A spiral notebook under an old man's forearm… the biro clicks" printed on
  // the six nights Mort wasn't in the pub.
  // Mort keeps no rota — his empty nights are the SEASON thinning the bench,
  // which is day-stable, so inside one vacation it reads to a player exactly
  // like a weekday rhythm (Derek predicted it three weekdays running and was
  // right every time). Either way the notebook has to know.
  G.room = "queen_vic"; G.season0 = 9;        // the deep-low trough, where he misses nights
  const nights = [];
  for (let d = 1; d <= 14; d++) { G.day = d; nights.push(_npcWhere("mort") === "queen_vic"); }
  assert.ok(nights.includes(true) && nights.includes(false), "premise: some nights he is out, some in");
  for (let d = 1; d <= 14; d++) {
    G.day = d;
    const said = _roomRead("notebook", true);
    if (_npcWhere("mort") === "queen_vic") assert.match(said, /forearm|biro|ledger/,
      `day ${d}: he is in, so the notebook is under his arm`);
    else assert.doesNotMatch(said, /forearm|biro clicks/,
      `day ${d}: he is not in, so nothing of his is being written in`);
  }
});

test("reads: nodes can gate on live state, and the last one still cannot", () => {
  // The `when` predicate exists because no flag can say "he is on his stool
  // tonight" — that answer changes with the rota, the season and the hour.
  const arr = ROOMS.queen_vic.reads.notebook;
  assert.ok(arr.some(e => typeof e.when === "function"), "the gate is used");
  const last = arr[arr.length - 1];
  assert.ok(!last.req && !last.notFlags && !last.when, "the fallback stays ungated");
});

test("the White Dish payoff calls no roll of who is at the rail", () => {
  // Bert's flagship speech named Dave "on his rounds", Phil on his stool and a
  // dog by the door — none of them guaranteed present, and Priya read it with
  // Dave demonstrably absent.
  const node = NPCS.bert.dialogue.find(d => d.topic === "offer" && d.sets &&
    d.sets.includes("wdgResolved"));
  assert.ok(node, "premise: the payoff node");
  assert.doesNotMatch(node.text, /Dave|Phil on his stool|the dog by the door/,
    "he looks at his bar, not at a roster that may not be standing in it");
});

// ── DEREK #4 and #3: two verbs disagreeing about the woman in front of you ──

test("the pub's staff can be tipped, and are not stood a beer like customers", () => {
  G.room = "queen_vic";
  for (const id of ["nuch", "aoy", "gaew"]) {
    assert.ok(NPCS[id].house, `${id} works here, and is marked as working here`);
    assert.equal(_regularHere(NPCS[id].name.toLowerCase()), null,
      `${id} is staff, so she is not on the rail to be stood a beer`);
  }
  out = [];
  doCommand("tip gaew 300");
  assert.doesNotMatch(text(), /Tip who/, "she is standing right there");
  assert.ok(G.money < 5000, "and the money moved");
});

test("a pub barmaid's refusal doesn't dangle a price", () => {
  // Derek stood the Vic's floor ~15 drinks over nine nights chasing "better
  // customers", which is a door that does not exist at any price.
  G.room = "queen_vic"; out = [];
  doCommand("contact gaew");
  assert.doesNotMatch(text(), /better customers/, "no implied price for a door that isn't there");
  assert.match(text(), /here every night/, "the honest version: she is simply not for sale");
});

// ── DEREK #8: a named quest that matches nothing ────────────────────────────

test("ACCEPT with a name that matches nothing takes nothing", () => {
  // ACCEPT RECON silently accepted The Sister-Bar Run — a different quest, no
  // confirmation, and an item pushed into his hands.
  G.quests.sangsom = "offered"; G.quests.recce = "offered";
  const before = _inv().slice();
  out = [];
  doCommand("accept recon");
  assert.doesNotMatch(text(), /Quest accepted/, "a miss is a miss");
  assert.equal(G.quests.sangsom, "offered", "…and takes nothing on the way past");
  assert.deepEqual(_inv().slice(), before, "nor puts anything in your pockets");
});

test("bare ACCEPT with two on the table asks which, and with one just takes it", () => {
  G.quests.sangsom = "offered"; G.quests.recce = "offered";
  out = [];
  doCommand("accept");
  assert.match(text(), /Accept which/, "two offers is a question, not a coin toss");
  assert.equal(G.quests.sangsom, "offered");
  G.quests.recce = "done"; out = [];
  doCommand("accept");
  assert.equal(G.quests.sangsom, "active", "one offer needs no name");
});
