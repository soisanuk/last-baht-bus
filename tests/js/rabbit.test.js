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
for (const f of ["thai.js", "world.js", "games.js", "cli-sim.js", "engine-core.js", "engine-encounters.js",
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

// ── The operator path (cli-sim.js, the portable terminal) ──────────────────

function recruitOperator() {
  G.room = "white_rabbit";
  run("talk to eddy", "ask eddy about job", "accept rabbit_job");
  run("ask eddy about job", "keyboard");
}
function toLaptop() {
  G.room = "kitten_corner";
  const till = _tillKeeper("kitten_corner");
  run("buy drink for " + NPCS[till].name.toLowerCase(), "back", "use laptop");
}

test("KEYBOARD is the other way in: same corridor, same gate, a stick instead of a box", () => {
  recruitOperator();
  assert.ok(_flag("rabbitPath"));
  assert.equal(G.rabbitWay, "operator");
  assert.equal(G.itemLoc.black_box, null, "no box on the operator path");
  assert.equal(G.quests.rabbit_heist, "active");
  // the corridor gate is the same
  G.room = "kitten_corner"; out = []; run("back");
  assert.equal(G.room, "kitten_corner", "the till girl still watches the corridor");
});

test("the terminal is solvable by TAPS ALONE, through the real game router", () => {
  // never type a command the chip bar doesn't offer: pick from _gameVerbs()
  recruitOperator(); toLaptop();
  assert.equal(G.game && G.game.type, "cli", "sat at the machine");
  const pick = (re) => { const o = _gameVerbs().find(v => re.test(v)); assert.ok(o, `an option matching ${re} is on offer: ${_gameVerbs()}`); run(o); };
  assert.ok(!_gameVerbs().some(v => /^unlock/.test(v)), "the vault password is not a chip until you've read it");
  pick(/^read notes/);
  assert.ok(_gameVerbs().some(v => /^unlock vault/.test(v)), "read the note, and the unlock is one tap");
  pick(/^unlock vault/);
  pick(/^cd vault/);
  pick(/^copy wallet/);
  assert.equal(G.game, null, "the machine is left as you found it");
  assert.ok(_flag("rabbitData"), "the data is on the stick");
  run("wait");
  assert.equal(G.quests.rabbit_heist, "done");
  // and Eddy's done node fires for this path too
  G.room = "white_rabbit"; out = []; run("ask eddy about job");
  assert.match(text(), /Done|never in that office/);
});

test("the bonus: Rabbit's old regulars — give them back, or run them at your own bar", () => {
  recruitOperator(); toLaptop();
  run("cd archive", "cd white_rabbit_2019", "copy regulars_2019.xls");
  assert.equal(G.itemLoc.trade_book, "inventory", "the book is on the stick");
  run("exit");
  assert.equal(G.game, null);
  assert.ok(!_flag("rabbitData"), "EXIT walks away — the goal wasn't copied");
  // reading it anywhere but your own bar just reads it
  G.room = "beach_rd_c"; out = []; run("read book");
  assert.ok(!_flag("barBook"));
  assert.match(text(), /Dirk/);
  // at your own bar it becomes yours — and the till feels it
  _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar";
  out = []; run("read book");
  assert.ok(_flag("barBook"), "run at your own rail");
  assert.ok(BOOK_TAKINGS > 1, "and it is worth money");
  // Eddy hears
  G.room = "white_rabbit"; G.talked = {}; out = []; run("ask eddy about book");
  assert.match(text(), /Dutchmen|your bar/i, "the soi talks");
  // or: give it back
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); _setFlag("expatLife"); G.stage = "expat"; G.money = 9000;
  _setFlag("white_dish"); G.quests.white_dish = "done";
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
  _npcState("fast_eddy").trust = 3;
  G.itemLoc.trade_book = "inventory"; G.room = "white_rabbit";
  const t0 = _npcState("fast_eddy").trust;
  out = []; run("give book to eddy");
  assert.ok(_flag("bookGiven"));
  assert.equal(G.itemLoc.trade_book, null, "it's his again");
  assert.ok(_npcState("fast_eddy").trust > t0, "and he knows what it cost you to hand it over");
  assert.match(text(), /Klaus|Dirk/);
});

test("USE LAPTOP is refused everywhere it shouldn't work, with a voice", () => {
  // no job at all
  G.room = "kitten_office"; out = []; run("use laptop");
  assert.equal(G.game, null);
  assert.match(text(), /somebody else's office|no reason/i);
  // the mule path: you were given a box, not a stick
  recruit(); G.room = "kitten_office"; out = []; run("use laptop");
  assert.equal(G.game, null);
  assert.match(text(), /box, not a stick|PLACE/i);
  // wrong room
  G.room = "beach_rd_c"; out = []; run("use laptop");
  assert.equal(G.game, null);
  assert.doesNotMatch(text(), /didn't understand/);
});

test("running out the machine's clock locks it — not a loss of the arc, just not tonight", () => {
  recruitOperator(); toLaptop();
  const budget = CLI_SCENARIOS.wdg_office.budget;
  for (let i = 0; i < budget + 1 && G.game; i++) run("ls");
  assert.equal(G.game, null, "locked out");
  assert.ok(!_flag("rabbitData") && !_flag("rabbitBlown"), "neither done nor blown");
  assert.equal(G.quests.rabbit_heist, "active", "the job is still open to try again");
  // and it can be tried again
  out = []; run("use laptop");
  assert.equal(G.game && G.game.type, "cli", "sat down again");
});

// ── The CCIB landing: the interruption, the radar, the lay-low ─────────────
// docs/rabbit-arc.md — WDG was already under investigation; the heist nearly
// blows the case, CCIB interrupts the follow-through, and the VARIABLE is who
// they now have a file on (G.ccibRadar, the Bangkok export).

// arrive at the White Rabbit the morning after, which fires the visit
function morningAfter() {
  G.nightTurn = 25; G.room = "naklua_rd";
  run.length; out = []; _arriveAt("white_rabbit");
}

test("the job COMPLETES — CCIB interrupts the follow-through, not the heist", () => {
  recruit(); intoOffice();
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  assert.ok(_flag("rabbitData"), "the light still went green; the player's nerve paid");
  assert.ok(!_flag("ccibVisited"), "the interruption is the morning after, not mid-job");
});

test("the radar reads three legible facts: path, wire, SIM held", () => {
  // mule, own phone, no SIM: the player is on it (own number was the wire), Nont is not
  recruit(); intoOffice();
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  morningAfter();
  assert.ok(_flag("ccibVisited"));
  assert.deepEqual(G.ccibRadar, { player: true, eddy: true, nont: false },
    "own-phone mule: Eddy always, player by his own number, Nont clear");
});

test("the SIM is the wire that names Nont — and ditching it clears the player, not him", () => {
  // carry Nont's SIM as the wire
  recruit();
  G.itemLoc.thai_sim = "inventory";
  G.room = "kitten_corner";
  const till = _tillKeeper("kitten_corner");
  run("buy drink for " + NPCS[till].name.toLowerCase(), "back", "place box");
  assert.ok(_flag("simUsed"), "placing the box on the SIM marks the wire");
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  // still holding it at the visit → player on the radar too
  morningAfter();
  assert.deepEqual(G.ccibRadar, { player: true, eddy: true, nont: true });

  // same run, but THROW SIM before the morning: the player comes off, Nont stays
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); _setFlag("expatLife"); G.stage = "expat"; G.money = 9000;
  _setFlag("white_dish"); G.quests.white_dish = "done";
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
  _npcState("fast_eddy").trust = 3;
  recruit();
  G.itemLoc.thai_sim = "inventory";
  G.room = "kitten_corner";
  const till2 = _tillKeeper("kitten_corner");
  run("buy drink for " + NPCS[till2].name.toLowerCase(), "back", "place box");
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  run("break sim");
  assert.equal(G.itemLoc.thai_sim, null, "the SIM is gone");
  morningAfter();
  assert.deepEqual(G.ccibRadar, { player: false, eddy: true, nont: true },
    "ditching clears YOU; the road to Nont was already paved");
});

test("the operator path puts the player on the radar — a machine remembers a visitor", () => {
  recruitOperator(); toLaptop();
  run("read notes.txt", "unlock vault dish2019", "cd vault", "copy wallet.dat");
  assert.ok(_flag("rabbitData"));
  morningAfter();
  assert.equal(G.ccibRadar.player, true, "sat at the keyboard → on the file");
});

test("Tan gives the read — and nobody warned the player", () => {
  recruit(); intoOffice();
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  morningAfter();
  assert.match(text(), /told you what he knows|nobody warned/i, "the scene names the shape: informed, not warned");
  // the officer never says don't / lay low / a threat
  assert.doesNotMatch(text(), /\bor else\b|you will be|we will|don't you|if you/i);
  // Tan's read is the mechanic's voice
  G.known.tan = true; G.room = _npcRoom("tan"); G.nightTurn = 25;
  out = []; run("ask tan about laying low");
  assert.match(text(), /boring|footnote/i);
  assert.ok(_flag("ccibReadGiven"));
});

test("the lay-low window lifts when the WDG case is the news, and Eddy resurfaces", () => {
  recruit(); intoOffice();
  nofoot(() => { for (let i = 0; i < BOX_TURNS + 1 && !_flag("rabbitData"); i++) run("wait"); });
  morningAfter();
  assert.ok(G.soc.hostOut && G.soc.hostOut.fast_eddy, "Eddy's gone to ground");
  assert.ok(!_flag("ccibCleared"));
  // jump past the window and tick
  G.day = G.ccibLowUntil + 1; G.room = "beach_rd_c";
  out = []; nofoot(() => run("wait"));
  assert.ok(_flag("ccibCleared"), "the case broke; the footnote was left out");
  assert.ok(!(G.soc.hostOut && G.soc.hostOut.fast_eddy), "Eddy's back on his stool");
});

test("BREAK SIM only works on Nont's SIM, and is voiced otherwise", () => {
  G.room = "beach_rd_c";
  out = []; run("break sim");
  assert.match(text(), /your own|stays where/i, "no throwaway SIM to throw away");
  assert.doesNotMatch(text(), /didn't understand/);
  G.itemLoc.thai_sim = "inventory";
  out = []; run("throw sim");
  assert.equal(G.itemLoc.thai_sim, null);
  assert.ok(_flag("simDitched"));
});
