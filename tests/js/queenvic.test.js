// THE QUEEN VIC. Round 22's Derek picked the game's own regulars' pub as his
// local — the most natural instinct his character had — and got the deadest room
// in it: ~40 in-game hours on that stool, zero ambient events. "The town has a
// week in it. The pub doesn't have a Tuesday in it."
//
// A pub's social life is FOOD, THE CALENDAR, and THE RAIL KNOWING EACH OTHER.
// This file pins all three, and the properties that keep the card honest.
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
  G.money = 5000; G.room = "queen_vic";
  out = [];
}
beforeEach(() => sandbox());

// ── the card and the till are one object ───────────────────────────────────

test("everything on the card can be bought, every day, every hour", () => {
  // The defect class afford-audit exists for: prose advertising a dish the till
  // refuses. Here the card IS _qvMenu(), so this is a structural guarantee —
  // asserted across the whole week rather than trusted.
  for (let d = 1; d <= 7; d++) {
    for (const t of [0, 10, 25, 30, 45, 55, 70]) {
      sandbox(); G.day = d; G.nightTurn = t;
      const card = _qvMenu();
      for (const dish of card) {
        G.nightTurn = t;      // each command ticks the clock; re-read the card's hour
        G.hunger = 90;        // …and you cannot eat six dinners: come to each one hungry
        const before = G.money;
        out = [];
        doCommand("buy " + dish.aliases[0]);
        assert.equal(G.money, before - dish.price,
          `day ${d} @${t}: the card offers ${dish.name} at ฿${dish.price}; the till took ฿${before - G.money}`);
        assert.doesNotMatch(text(), /Not for sale|not on tonight's card|didn't understand/i,
          `day ${d} @${t}: ${dish.name} was on the card and refused`);
      }
    }
  }
});

test("nothing OFF the card can be bought", () => {
  G.day = 3; G.nightTurn = 10;             // a Wednesday: no roast
  assert.ok(!_qvMenu().some(d => d.id === "roast"), "premise");
  const before = G.money;
  out = []; doCommand("buy roast");
  assert.equal(G.money, before, "no roast on a Wednesday, and no charge for asking");
  assert.match(text(), /Sundays only/, "…and the answer says WHEN, which is the useful part");
});

test("after eleven the cook has gone home and it is crisps or nothing", () => {
  G.nightTurn = 55;
  assert.deepEqual(_qvMenu().map(d => d.id), ["crisps"]);
  const before = G.money;
  out = []; doCommand("buy pie");
  assert.match(text(), /Kitchen close/, "she says so");
  assert.equal(G.money, before - QV_CRISPS, "and the crisps land anyway, which is the joke");
});

// ── the Sunday roast ───────────────────────────────────────────────────────

test("the roast is Sunday only and stops at nine", () => {
  for (let d = 1; d <= 14; d++) {
    G.day = d;
    for (const h of [0, 1, 2, 3, 4, 5]) {
      G.nightTurn = h * 10; G.qvRoast = null;
      const on = _qvMenu().some(x => x.id === "roast");
      const shouldBe = (d % 7 === 0) && h < 3;
      assert.equal(on, shouldBe, `day ${d} (${_weekday()}) hour ${h}`);
    }
  }
});

test("it runs out — and it is gone before nine, not at nine", () => {
  G.day = 7;
  const seen = [];
  for (let t = 0; t < 30; t += 2) { G.nightTurn = t; G.qvRoast = null; seen.push(_roastLeft()); }
  assert.equal(seen[0], ROAST_COVERS, "sixteen hundred hours, full tray");
  assert.ok(seen.includes(0), "somewhere before nine it goes");
  assert.ok(seen[seen.length - 1] === 0, "and by the cutoff it is long gone");
  for (let i = 1; i < seen.length; i++)
    assert.ok(seen[i] <= seen[i - 1], "the count only ever goes down");
});

test("a late arrival is told why, and when to come back", () => {
  G.day = 7; G.nightTurn = 29;             // twenty to nine, tray empty
  assert.equal(_roastLeft(), 0, "premise");
  const before = G.money;
  out = []; doCommand("buy roast");
  assert.equal(G.money, before, "nothing taken for a thing you can't have");
  assert.match(text(), /All finish/, "in Aoy's voice");
  assert.match(text(), /SIX o'clock|early/i, "and it teaches the hour to come back at");
});

test("your own portion comes off the tray, and the count is pure", () => {
  G.day = 7; G.nightTurn = 10;
  const before = _roastLeft();
  doCommand("buy roast");
  assert.equal(_roastLeft(), before - 1, "you ate one of them");
  const rng = G.rng;
  for (let i = 0; i < 20; i++) _roastLeft();
  assert.equal(G.rng, rng, "no dice — a reload cannot reroll the tray");
});

test("the roast is reached the way a player reaches it — through a real night", () => {
  // CLAUDE.md: every subsystem needs one test that arrives the way the game does.
  // _endNight is what turns Saturday into Sunday, and a hand-set G.day never
  // proves the calendar is wired to anything.
  sandbox();
  G.day = 6;                                // Saturday
  out = []; doCommand("buy roast");
  assert.match(text(), /Sundays only/, "not tonight");
  _endNight("dawn");                        // …and the world turns
  G.room = "queen_vic"; G.nightTurn = 10;
  assert.equal(_weekday(), "Sunday", "the night rolled us into Sunday");
  G.money = 5000; out = [];
  doCommand("buy roast");
  assert.ok(_QV_ROAST_LINES.some(l => text().includes(l)), "and the roast is on");
});

// ── the pub has a week in it ───────────────────────────────────────────────

test("the pub hosts the quiz", () => {
  assert.ok(QUIZ_BARS.includes("queen_vic"),
    "a British pub is the most natural quiz venue in the game and was the only bar excluded");
  let hosted = 0;
  for (let d = 1; d <= 70; d++) { G.day = d; if (_quizDay() && _quizBars().includes("queen_vic")) hosted++; }
  assert.ok(hosted > 0, "and it actually comes up in the rotation");
});

test("faces come and go at the pub", () => {
  // Derek, eleven nights: "within any given night, the roster never changed once."
  let arrivals = 0, departures = 0;
  for (let d = 1; d <= 30; d++) {
    G.day = d;
    for (let h = 1; h <= 4; h++)
      for (const id of ["doyle", "pete"]) {
        const from = _railRoomAt(id, h - 1), to = _railRoomAt(id, h);
        if (from === to) continue;
        if (to === "queen_vic") arrivals++;
        if (from === "queen_vic") departures++;
      }
  }
  assert.ok(arrivals > 0 && departures > 0,
    `the pub gains and loses faces (${arrivals} in, ${departures} out over 30 nights)`);
});

test("Terry rents the stool, and Angela and Mort keep theirs", () => {
  for (const id of ["terry", "angela", "mort"]) {
    assert.equal(NPCS[id].hops, false, `${id} is anchored, and explicitly so`);
    for (let d = 1; d <= 14; d++) {
      G.day = d;
      for (const t of [0, 20, 40]) { G.nightTurn = t; assert.equal(_npcRoom(id), "queen_vic"); }
    }
  }
});

test("Sunday pulls the manor in for its dinner", () => {
  let sundays = 0, pulled = 0;
  for (let d = 7; d <= 35; d += 7) {
    G.day = d; G.nightTurn = 10; sundays++;
    if (_npcRoom("pete") === "queen_vic") pulled++;
  }
  assert.ok(sundays >= 4);
  assert.ok(pulled >= 1, `the roast draws them in (${pulled}/${sundays} Sundays)`);
  G.nightTurn = 45;                          // after nine, the pull lets go
  assert.equal(_npcRoom("pete"), NPCS.pete.room, "and afterwards he goes back to his own bar");
});

// ── the rail knows each other ──────────────────────────────────────────────

test("the pub's regulars have something to say about each other", () => {
  // Round 22, Eric: "The regulars do not know each other" — Doug and Phil share
  // a rail nightly and have nothing to say about one another.
  G.day = 4; G.nightTurn = 40;
  const rail = ["doyle", "terry", "mort", "angela"];
  for (const who of rail) {
    doCommand("talk to " + who);
    for (const about of rail) {
      if (who === about) continue;
      out = [];
      doCommand(`ask ${who} about ${about}`);
      const said = text();
      assert.doesNotMatch(said, /above my pay grade|Not my department|Not my story|Not one I know/i,
        `${who} has nothing to say about ${about}, who he drinks beside every night`);
      assert.ok(said.length > 120, `${who} on ${about} is a real answer`);
    }
  }
});

test("nobody discusses Pete, which is the point of Pete", () => {
  G.day = 4; G.nightTurn = 40;
  doCommand("talk to mort");
  out = []; doCommand("ask mort about pete");
  assert.match(text(), /Not Pete/, "the columnist's ethic, stated");
  assert.doesNotMatch(text(), /above my pay grade/i, "…which is a refusal, not a dead end");
  doCommand("talk to doyle");
  out = []; doCommand("ask doyle about pete");
  assert.match(text(), /retired|not my business/i, "and the detective declines too, in his own words");
});

test("Terry's line about Angela knows whether she is sitting there", () => {
  // Round 22, Eric #6: "the stool two along, currently empty" — with her in it.
  G.day = 4; G.nightTurn = 40;
  assert.ok(_npcsHere().includes("angela"), "premise: she's in");
  doCommand("talk to terry");
  out = []; doCommand("ask terry about angela");
  assert.doesNotMatch(text(), /currently empty/, "she is two along, not absent");
  assert.match(text(), /two along/, "and he says so");
});

// ── two things the room used to print ──────────────────────────────────────

test("the anonymous bar-bore keeps out of a room full of named people", () => {
  // "a knot of regulars… part of the furniture, not the cast" — printed while
  // Doyle, Terry, Mort and Angela sat named on the Here: line.
  G.day = 4; G.nightTurn = 40;
  out = []; _describeRoom(true, true);
  assert.ok(_npcsHere().filter(i => !NPC_ROLES[i] && !NPCS[i].house && !NPCS[i].filler).length >= 3,
    "premise: the rail has names");
  assert.doesNotMatch(text(), /furniture, not the cast|knot of regulars|weathered faces|drones on/i,
    "real people outrank furniture");
});

test("the pub's late face doesn't claim the soi is still performing", () => {
  G.nightTurn = 20;
  out = []; _describeRoom(true, true);
  assert.match(text(), /the soi performs/, "early, the window show is on");
  G.nightTurn = 70;
  out = []; _describeRoom(true, true);
  assert.doesNotMatch(text(), /the soi performs/, "at one in the morning it is not");
  assert.match(text(), /shutters down|gone home/i, "and the room says what it sees instead");
  assert.match(text(), /aircon|panelling|dartboard/i, "while the pub itself is unchanged, which is the point of it");
});
