// THE EARLY-DOORS DRIFT (2026-08-29). The rail regulars hop their own manor
// before ten and settle at their local after it. This re-animates the retired
// hourly-hop system, which was ripped out because a location was true when
// printed and false when you arrived — so most of this file is about the
// pointers keeping their word, not about the movement itself.
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
const HOPPERS = () => Object.keys(NPCS).filter(id => NPCS[id].hops);

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

// ── the shape of a night ──

test("at opening time every man is at his own local", () => {
  // Also removes a whole class of test flake: the suite's default hour is 0, so
  // a drift on the opening hour would fail any test standing at a home bar one
  // run in ten.
  G.nightTurn = 0;
  for (const id of HOPPERS()) assert.equal(_npcRoom(id), NPCS[id].room, `${id} opens at his local`);
});

test("after ten everyone is back at their local — the back half of the night is stable", () => {
  // This is what makes "go and find him" errands work, and it is why the settle
  // exists at all.
  for (let d = 1; d <= 12; d++) {
    G.day = d;
    for (let t = 40; t < 100; t += 10) {
      G.nightTurn = t;
      for (const id of HOPPERS())
        assert.equal(_npcRoom(id), NPCS[id].room, `day ${d} nightTurn ${t}: ${id} is at his local`);
    }
  }
});

test("somebody has moved on any given night, and it is nobody's whole evening", () => {
  let nightsWithAMove = 0, away = 0, samples = 0;
  for (let d = 1; d <= 30; d++) {
    G.day = d;
    let moved = false;
    for (const id of HOPPERS())
      for (let t = 0; t < 40; t += 10) {
        G.nightTurn = t; samples++;
        if (_npcRoom(id) !== NPCS[id].room) { moved = true; away++; }
      }
    if (moved) nightsWithAMove++;
  }
  assert.ok(nightsWithAMove >= 25, `the rail changes: ${nightsWithAMove}/30 nights had a move`);
  const pct = 100 * away / samples;
  assert.ok(pct > 5 && pct < 35, `drift is a flavour, not a churn (${pct.toFixed(1)}% of sightings away)`);
});

test("the walk is a pure function — same night, same hour, same stool", () => {
  G.day = 5; G.nightTurn = 20;
  const first = HOPPERS().map(id => _npcRoom(id));
  for (let i = 0; i < 20; i++) _npcRoom("nigel");        // repeated looks must not drift
  assert.deepEqual(HOPPERS().map(id => _npcRoom(id)), first, "no drift between LOOKs");
  const rng = G.rng;
  HOPPERS().forEach(id => _npcRoom(id));
  assert.equal(G.rng, rng, "and it costs no dice — _questWhere probes it by rewinding the clock");
});

// ── the authored manor ──

test("a regular never leaves his own manor, and never enters a bar he avoids", () => {
  for (let d = 1; d <= 30; d++) {
    G.day = d;
    for (let t = 0; t < 100; t += 10) {
      G.nightTurn = t;
      for (const id of HOPPERS()) {
        const n = NPCS[id], r = _npcRoom(id);
        assert.ok(ROOMS[r] && ROOMS[r].barType, `${id} is always in a bar`);
        const regions = (n.haunts && n.haunts.length) ? n.haunts : [ROOMS[n.room].region];
        assert.ok(regions.includes(ROOMS[r].region), `${id} out of his manor at ${r}`);
        for (const bad of n.avoids || [])
          assert.notEqual(r, bad, `${id} walked into ${bad}, which he does not enter`);
      }
    }
  }
});

test("Nigel never reaches the Darkside — the grapevine depends on it", () => {
  // Neil tells the true version at the lake; Nigel tells the wrong one in town.
  // The arc only works because they never share a room.
  for (let d = 1; d <= 30; d++) {
    G.day = d;
    for (let t = 0; t < 100; t += 10) {
      G.nightTurn = t;
      assert.notEqual(ROOMS[_npcRoom("nigel")].region, "Darkside", `day ${d}: Nigel crossed the highway`);
    }
  }
});

// ── who is loose, and who is not ──

test("the anchored stay anchored, and working staff never drift", () => {
  for (const id of ["superman", "angela", "mort", "neil", "somsak", "helmut"])
    assert.equal(NPCS[id].hops, false, `${id} is authored to keep his stool`);
  G.day = 4;
  for (let t = 0; t < 100; t += 10) {
    G.nightTurn = t;
    for (const id of ["superman", "angela", "mort"])
      assert.equal(_npcRoom(id), NPCS[id].room, `${id} does not move`);
  }
  // and nobody on shift is loose, whatever else is true of them
  for (const id of Object.keys(NPCS))
    if (NPC_ROLES[id] || NPCS[id].manager || NPCS[id].filler || NPCS[id].house)
      assert.equal(_hopsNow(id), false, `${id} is working, not drinking`);
});

test("the soi6 challenge fences the drift — nobody leaves the pocket", () => {
  // dave and drew are homed at the Stinky, which IS inside the fence; the rest
  // of Beach Road is not, so an unfenced drift would delete them for hours.
  G.mode = "soi6"; G.day = 3; G.nightTurn = 20;
  for (const id of HOPPERS()) assert.equal(_npcRoom(id), NPCS[id].room, `${id} stays put in soi6 mode`);
});

test("a man mid-conversation with you does not wander off mid-sentence", () => {
  G.day = 3; G.nightTurn = 20;
  const at = _npcRoom("nigel");
  G.room = at;
  doCommand("talk to nigel");
  assert.equal(G.convo, "nigel", "premise: we are talking");
  G.nightTurn = 30;                      // an hour passes mid-conversation
  assert.equal(_npcRoom("nigel"), at, "his clock stops while you're talking");
  assert.equal(_convoActive(), "nigel", "…so the conversation survives the hour");
});

// ── the pointers keep their word ──

test("a drifting man is not placed as though he were settled", () => {
  G.day = 3; G.nightTurn = 20; G.known.nigel = true;
  G.room = "candy_bar";
  const drifting = _elsewhereLine("nigel");
  assert.doesNotMatch(drifting, /tonight/, "an hour-true fact must not be dressed as a night-true one");
  assert.match(drifting, /drifts|ask after him/i, "say that he moves");
  assert.match(drifting, /Lucky Tiger/, "…and name the local he always ends up at, which is the useful part");
  G.nightTurn = 60;
  assert.match(_elsewhereLine("nigel"), /try Lucky Tiger/, "settled, he is placed flatly and correctly");
});

test("Tan gives the habit, not the snapshot", () => {
  G.day = 3; G.known.nigel = true;
  G.room = _npcRoom("tan");
  doCommand("talk to tan");
  G.nightTurn = 20; out = [];
  doCommand("ask tan about nigel");
  assert.match(text(), /before ten|he moves/i, "the locator knows he drifts");
  assert.match(text(), /Lucky Tiger/, "and knows where he ends up");
  G.nightTurn = 60; out = [];
  doCommand("ask tan about nigel");
  assert.match(text(), /drinks there most nights/, "after ten the plain answer is the true one");
});

test("a quest clue about a mover carries the caveat, every time it matters", () => {
  // Keyed on the flag and the hour, not on a one-hour probe: at 10% an hour the
  // probe says "no" nine times in ten, and the clue would read as a promise.
  G.stage = "expat"; G.quests.debtrun = "active";
  G.room = "sunset_rail"; G.day = 3;
  G.nightTurn = 20;
  assert.match(_questWhere("fergie"), /drifts/, "the drift caveat prints while he is drifting");
  G.nightTurn = 60;
  assert.doesNotMatch(_questWhere("fergie"), /drifts/, "and not once he has settled");
});

test("Glam's shuttle keeps its own probe — a certain move still reads as one", () => {
  G.stage = "expat"; G.day = 3;
  G.room = "sunset_rail";
  G.nightTurn = 20;
  assert.match(_questWhere("glam"), /Cheeky Monkey/, "early doors, his own bar");
  G.nightTurn = 55;
  assert.match(_questWhere("glam"), /Hyper/, "after ten, wheeled across");
});

// ── invariants the drift newly makes possible ───────────────────────────────

test("no two regulars who can now share a room have one name a prefix of the other", () => {
  // Drift creates co-location that never happened before: Dave (hopper) and
  // David (Mondays and Fridays) can both stand in the Stinky. _findNpc's strict
  // patron pass is exact → name-prefix → title, so a full typed name must
  // resolve the man you meant. Neither name is a prefix of the other today;
  // this stops a rename quietly making one.
  const social = Object.keys(NPCS).filter(id =>
    NPCS[id].patron || (!NPC_ROLES[id] && !NPCS[id].manager && !NPCS[id].filler && !NPCS[id].house));
  const where = id => new Set(NPCS[id].hops ? _hopPool(id) : [NPCS[id].room]);
  for (const a of social) for (const b of social) {
    if (a >= b) continue;
    const na = NPCS[a].name.toLowerCase(), nb = NPCS[b].name.toLowerCase();
    if (!(na.startsWith(nb) || nb.startsWith(na))) continue;
    const ra = where(a), rb = where(b);
    const shared = [...ra].filter(r => rb.has(r));
    assert.deepEqual(shared, [],
      `${NPCS[a].name} and ${NPCS[b].name} can share ${shared.join(",")} and one name shadows the other`);
  }
});

test("two regulars in one room are both reachable by name", () => {
  // The co-location itself, exercised: put Dave and David in the Stinky on a
  // Monday and make sure each answers to his own name.
  G.day = 1; G.nightTurn = 0;            // Monday, opening hour — both at their local
  G.room = "stinky_bar";
  const here = _npcsHere();
  if (!(here.includes("dave") && here.includes("david"))) return; // premise gone
  assert.equal(_findNpc("dave"), "dave");
  assert.equal(_findNpc("david"), "david");
});

// ── seen moving, and pulled somewhere on purpose ────────────────────────────

test("a man leaving the bar you are in says so — through the real tick", () => {
  // Not _railTick() directly: the narration only works if the hour actually
  // turns underneath a command, and _tick is what turns it.
  G.day = 2; G.room = "lucky_tiger"; G.nightTurn = 0;
  out = [];
  for (let i = 0; i < 32; i++) doCommand("look");
  assert.match(text(), /Nigel/, "the man who left is named");
  // Against the POOL, never one string of it: _pickVary picks, so a subset
  // regex passes alone and fails in the full suite on a different dice state,
  // which is exactly how this assertion first went red.
  assert.ok(_RAIL_LEAVES.some(f => text().includes(f("Nigel"))),
    "the leaving is narrated, not merely implied by an absence");
});

test("nothing is narrated about a bar you cannot see into", () => {
  // The honest rule: you learn the rail moves by watching it move.
  G.day = 2; G.room = "hotel_room"; G.nightTurn = 20;
  out = [];
  _railTick();
  assert.equal(out.length, 0, "no telepathy from your hotel room");
  G.room = "beach_rd_c"; out = [];   // a street, not a bar
  _railTick();
  assert.equal(out.length, 0, "nor from the pavement");
});

test("a modal is never interrupted by a man changing bars", () => {
  G.day = 2; G.room = "lucky_tiger"; G.nightTurn = 10;
  for (const gate of ["pendingEnc", "pendingChoice", "game"]) {
    out = []; G[gate] = "x"; _railTick(); G[gate] = null;
    assert.equal(out.length, 0, `${gate} holds the room`);
  }
});

test("the man you are talking to is never narrated as leaving", () => {
  G.day = 2; G.nightTurn = 0;
  G.room = _npcRoom("nigel");
  doCommand("talk to nigel");
  assert.equal(G.convo, "nigel", "premise");
  G.nightTurn = 10; out = [];
  _railTick();
  assert.doesNotMatch(text(), /Nigel/, "his clock is stopped, so there is nothing to report");
});

test("Glam's shuttle is finally narrated, from both ends", () => {
  G.day = 3; G.nightTurn = NPCS.glam.shuttle.after * 10;
  G.room = NPCS.glam.room; out = [];
  _railTick();
  assert.match(text(), /Glam/, "the bar he leaves sees him leave");
  assert.match(text(), /wheel|chair|pushed/i, "and it is his chair, which is the point of the beat");
  G.room = NPCS.glam.shuttle.to; out = [];
  _railTick();
  assert.match(text(), /Glam/, "the bar he arrives at sees him arrive");
});

test("the rail narration never guesses a pronoun", () => {
  // Angela and Sandra are on this bench; only `hops: false` keeps them out of
  // these pools, and an author unanchoring one should not have to remember.
  for (const pool of [_RAIL_LEAVES, _RAIL_ARRIVES, _RAIL_QUIZ])
    for (const f of pool)
      assert.doesNotMatch(f("Somebody"), /\b(he|his|him|she|her|hers)\b/i,
        "gendered: " + f("Somebody"));
});

test("on a Thursday the rail goes where the quiz is", () => {
  // The one place they go on purpose — and the reason the drift reads as a town
  // rather than as furniture being shuffled.
  let pulled = 0, thursdays = 0;
  for (let d = 1; d <= 28; d++) {
    G.day = d;
    if (!_quizDay()) continue;
    thursdays++;
    G.nightTurn = 25;                    // inside the window
    const quiz = _quizBars();
    for (const id of HOPPERS()) if (quiz.includes(_npcRoom(id))) pulled++;
  }
  assert.ok(thursdays >= 3, "we sampled several Thursdays");
  assert.ok(pulled >= thursdays, `the quiz draws a crowd (${pulled} sightings over ${thursdays} Thursdays)`);
});

test("the pull is not a stampede, and it lets go afterwards", () => {
  G.day = 4;
  assert.ok(_quizDay(), "premise: day 4 is a Thursday");
  const quiz = _quizBars();
  const eligible = HOPPERS().filter(id => _hopPool(id).some(r => quiz.includes(r)));
  assert.ok(eligible.length >= 2, "somebody's manor holds tonight's quiz");
  G.nightTurn = 25;
  const drawn = eligible.filter(id => quiz.includes(_npcRoom(id)));
  assert.ok(drawn.length < eligible.length + 1);
  assert.ok(drawn.length >= 1, "…and at least one of them turned up");
  G.nightTurn = 45;                      // after the window, settled at his local
  for (const id of drawn)
    assert.equal(_npcRoom(id), NPCS[id].room, `${id} is home after the quiz, like everyone else`);
});

test("the quiz pull is asked about the probed hour, not the clock", () => {
  // _hopRoom is probed at other hours by the narration and by _questWhere;
  // reading G.nightTurn inside it would answer about the wrong hour.
  G.day = 4; G.nightTurn = 0;
  const quiz = _quizBars();
  const id = HOPPERS().find(i => _hopPool(i).some(r => quiz.includes(r)) &&
    quiz.includes(_hopRoom(i, 2)));
  assert.ok(id, "somebody is drawn at hour 2");
  assert.equal(G.nightTurn, 0, "and the clock never moved to find that out");
  assert.notEqual(_hopRoom(id, 0), _hopRoom(id, 2), "the probe distinguishes the hours");
});
