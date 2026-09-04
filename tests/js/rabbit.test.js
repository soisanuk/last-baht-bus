// The Rabbit arc, Tier 2, phase 1 — the interview fork and the mule (box) path.
// docs/rabbit-arc.md. Reached the way the game reaches it: doCommand through the
// real quest/modal/tick machinery, not the _do* handlers in isolation (the
// barchain lesson — a subsystem that a hand-built call sequence proves works but
// the orchestrator never actually runs).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
const nofoot = (fn) => { const s = _rand; _rand = () => 0.99; try { return fn(); } finally { _rand = s; } };

// An expat who has done the White Dish quest — the arc's two gates.
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); _setFlag("expatLife"); G.stage = "expat"; G.money = 9000;
  _setFlag("white_dish"); G.quests.white_dish = "done";
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
  _npcState("fast_eddy").trust = 3;   // he sizes you up before he offers
});

// take the job cleanly, to the point of carrying the box — the shared preamble
function recruit() {
  G.room = "white_rabbit";
  run("talk to eddy", "ask eddy about job", "accept rabbit_job");
  run("ask eddy about job", "carry it");
}
// buy off the till girl and get into the office with the box placed
function intoOffice() {
  G.room = "kitten_corner";
  const till = _tillKeeper("kitten_corner");
  run("buy drink for " + NPCS[till].name.toLowerCase(), "back", "place box");
}

test("the arc is expat-only and gated on the White Dish quest", () => {
  // a tourist who has never heard of White Dish is not recruited
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  _npcState("fast_eddy").trust = 3; G.room = "white_rabbit";
  assert.equal(_questAvailable("rabbit_job"), false, "no expatLife, no job");
  _setFlag("expatLife"); G.stage = "expat";
  assert.equal(_questAvailable("rabbit_job"), false, "expat but no white_dish dep, still no job");
  _setFlag("white_dish"); G.quests.white_dish = "done";
  assert.equal(_questAvailable("rabbit_job"), true, "expat + white_dish done → the job is on offer");
});

test("the interview offers, and never gates you out — declining is free and re-offerable", () => {
  G.room = "white_rabbit";
  run("talk to eddy", "ask eddy about job", "accept rabbit_job");
  out = []; run("ask eddy about job");
  assert.equal(G.pendingChoice, "rabbitjob", "the interview modal is up");
  // ASK inside the modal explains without committing
  out = []; run("ask");
  assert.equal(G.pendingChoice, "rabbitjob", "ASK re-prompts, doesn't commit");
  assert.match(text(), /money|clean|copy/i);
  // NOT ME declines at no cost, and the job stays takeable
  out = []; run("not me");
  assert.equal(G.pendingChoice, null);
  assert.ok(!_flag("rabbitPath"), "nothing committed");
  assert.equal(G.quests.rabbit_job, "active", "the quest is still live to re-offer");
  assert.equal(G.itemLoc.black_box, null, "no box handed over");
  // and re-asking re-arms the interview
  out = []; run("ask eddy about job");
  assert.equal(G.pendingChoice, "rabbitjob", "re-offered, exactly as the doctrine says");
});

test("CARRY IT hands over the box and arms the box run", () => {
  recruit();
  assert.ok(_flag("rabbitPath"));
  assert.equal(G.itemLoc.black_box, "inventory", "you're carrying it");
  assert.equal(G.quests.rabbit_heist, "active", "the box run is live");
  run("wait");   // a tick completes rabbit_job on its rabbitPath doneFlag
  assert.equal(G.quests.rabbit_job, "done");
});

test("the corridor is gated: not without the job, and not without buying the till girl off it", () => {
  // no job → the corridor is not a public exit
  G.room = "kitten_corner";
  out = []; run("back");
  assert.equal(G.room, "kitten_corner", "customers don't go back there");
  assert.match(text(), /not for customers/i);
  // with the job but no drink bought → the girl on the till watches you off it
  recruit();
  G.room = "kitten_corner";
  out = []; run("back");
  assert.equal(G.room, "kitten_corner", "her eyes are on the corridor");
  assert.match(text(), /till/i);
  // buy her a drink → in you go
  const till = _tillKeeper("kitten_corner");
  run("buy drink for " + NPCS[till].name.toLowerCase());
  out = []; run("back");
  assert.equal(G.room, "kitten_office", "the corridor opens once she's looking at the drink");
});

test("the clean run: PLACE, wait it out, green light, walk away and leave it", () => {
  recruit(); intoOffice();
  assert.equal(G.itemLoc.black_box, "kitten_office", "the box is on the shelf");
  assert.ok(G.boxJob && !G.boxJob.done, "the run is counting");
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  assert.ok(_flag("rabbitData"), "the box finished and set the data flag");
  assert.ok(G.boxJob.done, "the light is green");
  // leaving now works, and the box stays behind (Rabbit said leave it)
  out = []; run("out");
  assert.equal(G.room, "kitten_corner", "you walk out clean");
  assert.equal(G.itemLoc.black_box, "kitten_office", "and you left it, as told");
  run("wait");   // _questTick
  assert.equal(G.quests.rabbit_heist, "done");
});

test("you cannot walk out of the office with the box still running", () => {
  recruit(); intoOffice();
  out = []; run("out");
  assert.equal(G.room, "kitten_office", "the box is on the shelf, unattended-walk refused");
  assert.match(text(), /can't just walk out|pulsing/i);
});

test("TAKE aborts the run without blowing it — the box comes back, nothing is read", () => {
  recruit(); intoOffice();
  out = []; run("take box");
  assert.equal(G.itemLoc.black_box, "inventory", "back in your bag");
  assert.equal(G.boxJob, null, "the run stopped");
  assert.ok(!_flag("rabbitData") && !_flag("rabbitBlown"), "neither done nor blown — just aborted");
  // and now you can leave, carrying it
  out = []; run("out");
  assert.equal(G.room, "kitten_corner");
  // PLACE again restarts cleanly
  run("back", "place box");
  assert.ok(G.boxJob && !G.boxJob.done, "a fresh run");
});

test("noise on a footstep turn spends heat, and three strikes blows the job", () => {
  recruit(); intoOffice();
  // force a footstep every tick, then make noise into it
  const s = _rand; _rand = () => 0.01;
  try {
    let guard = 0;
    while (!_flag("rabbitBlown") && guard++ < 20) {
      run("wait");                       // arms the footstep
      if (!_flag("rabbitBlown")) run("sing");  // a noisy verb into it
    }
  } finally { _rand = s; }
  assert.ok(_flag("rabbitBlown"), "the mamasan came down the corridor");
  assert.equal(G.boxJob, null, "the run is over");
  assert.equal(G.itemLoc.black_box, null, "she kept the box");
  // Eddy's blown node acknowledges it, and there's no third box
  G.room = "white_rabbit";
  out = []; run("ask eddy about job");
  assert.match(text(), /two boxes|done with that/i);
});

test("a quiet command on a footstep turn is fine — WAIT and EXAMINE don't spend heat", () => {
  recruit(); intoOffice();
  const s = _rand; _rand = () => 0.01;   // footstep every tick
  try {
    run("wait");                          // footstep armed
    const h0 = G.boxJob.heat;
    run("examine safe");                  // a quiet command
    assert.equal(G.boxJob.heat, h0, "examining the room is not a noise");
    run("look");
    assert.equal(G.boxJob.heat, h0, "nor is looking");
  } finally { _rand = s; }
  assert.ok(!_flag("rabbitBlown"), "quiet keeps you clean");
});

test("PLACE only works with the box, in the office", () => {
  // no box at all
  G.room = "kitten_office";
  out = []; run("place box");
  assert.match(text(), /not carrying anything/i);
  // carrying it, but in the wrong room
  recruit();
  G.room = "white_rabbit";
  out = []; run("place box");
  assert.match(text(), /their room|behind Kitten Corner/i);
  assert.equal(G.itemLoc.black_box, "inventory", "still in your bag");
});
