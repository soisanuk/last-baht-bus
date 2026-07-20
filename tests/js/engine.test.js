// Engine tests: parser, systems (money/battery/darkness), puzzle gating, and
// a full scripted playthrough from the beach to the happy ending.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}

let out = [];
let sfx = [];
engineInit((text) => out.push(text), null, (name) => sfx.push(name));

function run(...cmds) {
  for (const c of cmds) doCommand(c);
}
function lastOut() { return out.join("\n"); }
function state() { return G; } // vm globals share this realm

beforeEach(() => { out = []; sfx = []; newGame(); state().lastSaleng = 99999; }); // suppress saleng by default

// Park a saleng cart in the player's current room for the tests that buy from it
// (the cart is a room fixture now, not a modal encounter). Set state().room first.
function parkSaleng(cart, ticks = 6) {
  state().salengCart = cart;
  state().salengRoom = state().room;
  state().salengUntil = state().turns + ticks;
}

// ── Resuming a live mini-game ───────────────────────────────────────────────

test("a live mini-game survives save/restore and _renderGame redraws it", () => {
  // Regression: serializeGame persists G.game, so a mid-Connect-4 save restores
  // still live and keeps capturing input — but nothing redrew the board on
  // continue, so it was invisible. Prove both halves: it restores, and
  // _renderGame brings it back.
  state().game = { type: "c4", board: c4New(), opp: "Candy", stake: 20 };
  const save = serializeGame();
  newGame();
  assert.equal(state().game, null, "a fresh game has no live board");

  deserializeGame(save);
  assert.equal(state().game && state().game.type, "c4", "the live game restores from the save");

  out = [];
  _renderGame();
  const shown = lastOut();
  assert.match(shown, /in progress/, "announces the resumed game");
  assert.match(shown, /1 +2 +3 +4 +5 +6 +7/, "redraws the Connect 4 board");
  assert.match(shown, /1-7.*Q quits/, "shows how to play (tap a column, or Q to quit)");
});

test("a non-move during a live game redraws the board, not a bare rejection", () => {
  // A stray world command (e.g. a flyout-wheel "ask …" tapped from scrollback)
  // is captured by the live game. Instead of just "Pick a column", redraw the
  // board so the player sees the game is still on and where it stands.
  state().game = { type: "c4", board: c4New(), opp: "Candy", stake: 20 };
  out = [];
  _c4Input("ask bee about candy");
  const shown = lastOut();
  assert.match(shown, /1 +2 +3 +4 +5 +6 +7/, "the board is redrawn");
  assert.match(shown, /1-7/, "with the how-to-play hint");
  assert.ok(state().game, "no move was made — the game is still live");
});

test("Q concedes a live mini-game (mobile-friendly quit)", () => {
  state().game = { type: "c4", board: c4New(), opp: "Candy", stake: 20 };
  run("q");
  assert.equal(state().game, null, "q ends the game like quit");
});

test("hidden code twoweekmillionaire grants ฿2M when cheats are enabled", () => {
  CHEATS_ENABLED = true;
  const before = state().money;
  run("twoweekmillionaire");
  assert.equal(state().money, before + 2000000, "money jumps by 2,000,000");
});

test("the cheat is inert when CHEATS_ENABLED is off", () => {
  CHEATS_ENABLED = false;
  const before = state().money;
  run("twoweekmillionaire");
  assert.equal(state().money, before, "no grant when cheats are disabled");
  CHEATS_ENABLED = true; // restore the session default for other tests
});

test("stripMarkup removes render-only {{…}} braces, keeping the inner text", () => {
  assert.equal(stripMarkup("grabs another {{phone}} and {{waves}}"),
    "grabs another phone and waves");
  assert.equal(stripMarkup("no markup here"), "no markup here");
  assert.equal(stripMarkup("{{a whole phrase, kept}} verbatim"),
    "a whole phrase, kept verbatim");
  assert.equal(stripMarkup(null), "", "nullish is safe");
});

// ── Parser & basics ────────────────────────────────────────────────────────

test("movement and look", () => {
  run("e");
  assert.equal(state().room, "jomtien_beach_rd");
  run("look");
  assert.match(lastOut(), /Jomtien Beach Road/);
  run("w");
  assert.equal(state().room, "jomtien_beach");
});

test("blocked direction", () => {
  run("n", "n"); // beach → dongtan → no north exit
  assert.match(lastOut(), /can't go that way/i);
});

test("take, inventory, drop", () => {
  run("take bottle", "i");
  assert.match(lastOut(), /Chang bottle/);
  run("drop bottle");
  assert.equal(state().itemLoc.bottle1, "jomtien_beach");
});

test("unknown command doesn't consume a turn", () => {
  const t0 = state().turns;
  run("florble the wug");
  assert.equal(state().turns, t0);
  assert.match(lastOut(), /didn't understand/i);
});

test("examine NPC and item", () => {
  run("e", "x nok");
  assert.match(lastOut(), /vendor/i);
  run("x receipt");
  assert.match(lastOut(), /Thai/);
});

test("printed names become known; lowercase words and fragments do not", () => {
  assert.deepEqual(state().known, {}, "nobody named yet at the waterline");
  _say("The bank keeps texting me about the pimento cheese.");
  assert.ok(!state().known.bank, "lowercase 'bank' is an institution");
  assert.ok(!state().known.pim, "'pimento' is not Pim");
  _say("“My girlfriend Pim — Starlight Bar. Ask Madam Oy, she know.”");
  assert.ok(state().known.pim);
  assert.ok(state().known.oy, "matched on the last word of 'Madam Oy'");
  run("e"); // Auntie Nok is on the presence line
  assert.ok(state().known.nok, "being in the room prints the name");
});

test("autocomplete won't suggest ask-topics naming strangers", () => {
  state().room = "beach_rd_s";
  run("look"); // Bank hits the presence line; Pim is still nobody
  assert.ok(!engineComplete("ask bank about ").includes("pim"), "who is Pim?");
  assert.ok(engineComplete("ask bank about ").includes("darkside"));
  _say("“My girlfriend Pim — Starlight Bar, LK Metro.”");
  assert.ok(engineComplete("ask bank about ").includes("pim"));
});

test("_topicKnown: patron names gate too; non-name topics always pass", () => {
  assert.equal(_topicKnown("danny"), false, "Danny the patron, unmet");
  state().known.danny = true;
  assert.equal(_topicKnown("danny"), true);
  assert.equal(_topicKnown("sunset"), true, "not a name — never gated");
  assert.equal(_topicKnown("free drink"), true);
});

test("fast travel: discovered places only, at exact walking pace", () => {
  run("travel candy bar");
  assert.match(lastOut(), /already found/i, "Candy Bar not discovered yet");
  assert.equal(state().room, "jomtien_beach");
  state().room = "candy_bar";
  run("look"); // standing in it puts it on the list
  assert.ok(state().visited.candy_bar);
  state().room = "jomtien_beach";
  const t0 = state().nightTurn;
  const hops = _hops("jomtien_beach", "candy_bar");
  assert.ok(hops > 1, "the trip is real");
  run("travel candy bar");
  assert.equal(state().room, "candy_bar");
  assert.equal(state().nightTurn - t0, hops, "minimum walking turns, no discount");
});

test("fast travel: ENTER and GO route through it; rain blocks; bare TRAVEL lists", () => {
  state().room = "candy_bar";
  run("look");
  state().room = "jomtien_beach";
  run("enter candy bar");
  assert.equal(state().room, "candy_bar", "ENTER falls back to fast travel");
  state().room = "jomtien_beach";
  state().rain = 3;
  run("travel candy bar");
  assert.equal(state().room, "jomtien_beach");
  assert.match(lastOut(), /awning/i, "rain owns the street");
  state().rain = 0;
  run("travel");
  assert.match(lastOut(), /Candy Bar — \d+ turns/);
});

test("_playOptions: what's on offer here — typed PLAY and autocomplete agree", () => {
  state().room = "jomtien_beach";
  assert.deepEqual(_playOptions(), [], "no games on the sand");
  run("play");
  assert.match(lastOut(), /Nothing to play here/i);
  state().room = "candy_bar"; // beer bar, no table
  assert.deepEqual(_playOptions(), ["connect 4", "jackpot"]);
  run("play");
  assert.match(lastOut(), /PLAY CONNECT 4 · PLAY JACKPOT/);
  assert.doesNotMatch(lastOut(), /POOL/);
  state().room = "stinky_bar"; // beer bar with the league felt
  state().day = 4; // not a league night (every third)
  assert.deepEqual(_playOptions(), ["connect 4", "jackpot", "pool"]);
  state().day = 3;
  assert.deepEqual(_playOptions(), ["connect 4", "jackpot", "pool", "killer"]);
  assert.deepEqual(engineComplete("play "), _playOptions(), "autocomplete = same list");
});

test("jackpot: the FLIP hint is tappable and autocomplete offers the legal moves", () => {
  state().room = "candy_bar";
  let started = false;
  for (let seed = 1; seed <= 60 && !started; seed++) {
    newGame(); state().lastSaleng = 99999;
    state().flags.jpLearned = true; // past the tutorial: only genuine two-way rolls stop
    state().room = "candy_bar"; state().rng = seed;
    run("play jackpot");
    // a real two-way choice (skip the tutorial-style single-move prompts)
    started = !!(state().game && state().game.pending && state().game.pending.length === 2);
  }
  assert.ok(started, "found a seed that leaves a two-way flip choice");
  // one tappable FLIP with the moves joined by "or" — not two FLIP words, which
  // read as two different verbs offering the same choices
  assert.match(lastOut(), /\(FLIP [\d& ]+or[\d& ]+\)/, "single FLIP, choices in parens = tappable");
  assert.doesNotMatch(lastOut(), /·\s*FLIP/, "not the old double-FLIP hint");
  const moves = state().game.pending.map(mv => mv.join(" "));
  assert.deepEqual(_jpChoices(), moves);
  assert.deepEqual(engineComplete("flip "), moves);
  // tapping the bare FLIP verb-row chip must carry a number, not nag: the legal
  // moves ride between flip and quit in the modal verb list
  assert.deepEqual(_gameVerbs(), ["flip", ...moves, "quit"]);
  run("flip " + moves[0]);
  assert.ok(!state().game || !lastOut().includes("those are the choices"), "the tap is a legal move");
});

test("checkout: the hotel options are tappable and a tap moves you", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().stage = "vacation";
  state().room = _hotelRoomId();
  run("checkout");
  assert.equal(state().pendingChoice, "checkout");
  assert.match(lastOut(), /\(QUEEN VIC INN — ฿\d+\/night\)/, "options sit in parens");
  run("queen vic inn"); // what tapping the option submits
  assert.equal(state().hotel, "queenvic");
  assert.equal(state().pendingChoice, null);
});

test("vacation's end: both choices are tappable and route", () => {
  _endVacation();
  assert.equal(state().pendingChoice, "vacation_end");
  assert.match(lastOut(), /\(NEW VACATION — /);
  assert.match(lastOut(), /\(MOVE TO PATTAYA — /);
  run("move to pattaya");
  assert.equal(state().stage, "expat");
});

test("modal autocomplete: games and pending choices own the suggestions", () => {
  state().game = { type: "pool" };
  assert.deepEqual(engineComplete("s"), ["shot", "safety"]);
  state().game = { type: "quiz" };
  assert.ok(engineComplete("q").includes("quit"));
  state().game = null;
  state().pendingChoice = "vacation_end";
  assert.deepEqual(engineComplete("m"), ["move to pattaya"]);
  state().pendingChoice = "checkout"; // G.hotel = sabai
  const cands = engineComplete("s");
  assert.ok(cands.includes("stay"));
  assert.ok(!cands.join().includes("sabai"), "your own hotel isn't offered");
  state().pendingChoice = null;
});

test("MIDNIGHT tapped from the help text waits until midnight", () => {
  const t0 = state().nightTurn;
  run("midnight");
  assert.ok(state().nightTurn > t0 + 5, "the night moved");
});

test("_c4Choices: open columns mid-game feed autocomplete; pockets return after", () => {
  state().room = "candy_bar";
  run("play connect 4");
  assert.equal(state().game.type, "c4");
  assert.deepEqual(_c4Choices(), ["1", "2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(engineComplete("drop "), _c4Choices(), "columns, not pockets");
  for (let i = 0; i < 6; i++) c4Drop(state().game.board, 3, 1); // brick up column 4
  assert.ok(!_c4Choices().includes("4"), "full columns drop off the list");
  state().game = null;
  assert.deepEqual(_c4Choices(), []);
  assert.ok(engineComplete("drop ").includes("noodles"), "pockets are back");
});

test("fast travel: your hotel needs no discovering, but the clerk still gates it", () => {
  run("travel");
  assert.match(lastOut(), /Sabai Palms Hotel — \d+ turns/, "listed from turn one");
  run("travel hotel");
  assert.match(lastOut(), /key card/i, "act 1: no wallet, no room");
  assert.equal(state().room, "jomtien_beach");
  state().flags.hasWallet = true;
  state().itemLoc.wallet = "inventory";
  run("travel hotel");
  assert.equal(state().room, "hotel_room");
  assert.ok(state().flags.act1Done, "walking home with the wallet ends Act One");
});

test("fast travel: where you stand is never offered", () => {
  state().room = "candy_bar";
  run("look");
  run("travel");
  assert.doesNotMatch(lastOut(), /Candy Bar —/, "not in the list while inside");
  assert.ok(!engineComplete("travel ").includes("candy bar"), "not autocompleted");
  run("travel candy bar");
  assert.match(lastOut(), /standing in it/i);
  assert.equal(state().room, "candy_bar");
});

test("G.known serializes with the save; older saves backfill empty", () => {
  state().known.pim = true;
  const snap = serializeGame();
  newGame();
  deserializeGame(snap);
  assert.ok(state().known.pim, "knowledge survives the round-trip");
  const old = JSON.parse(snap);
  delete old.known;
  deserializeGame(JSON.stringify(old));
  assert.deepEqual(state().known, {}, "pre-gate save gets the field");
});

// ── Act 1: bottles → fare ──────────────────────────────────────────────────

test("reading the receipt sets the lead flag", () => {
  run("read receipt");
  assert.ok(state().flags.knowWasHere);
  assert.match(lastOut(), /ซอยบัวขาว|Soi Buakhao/i);
});

test("selling three bottles yields exactly the bus fare", () => {
  run("take bottle", "e", "take bottle",
    "light on", "w", "n", "take bottle", "e", "light off",
    "sell bottles");
  assert.equal(state().money, 15);
  assert.ok(state().flags.gotBusFare);
});

test("bus refuses the broke", () => {
  run("e", "n", "ride bus to beach road");
  assert.match(lastOut(), /fare is ฿15|climb off/i);
  assert.equal(state().room, "jomtien_bus_stop");
});

test("bus ride: Thai fare quote, exact payment", () => {
  state().money = 15;
  run("e", "n", "ride bus to beach road");
  assert.match(lastOut(), /สิบห้าบาท/);
  assert.ok(state().pendingFare);
  run("pay 15");
  assert.equal(state().room, "beach_rd_s");
  assert.equal(state().money, 0);
});

test("underpaying the driver is refused; overpaying costs you", () => {
  state().money = 60;
  run("e", "n", "ride bus to beach road", "pay 10");
  assert.ok(state().pendingFare, "still waiting");
  assert.match(lastOut(), /สิบห้าบาท/);
  run("pay 20");
  assert.equal(state().money, 40); // no change given
  assert.equal(state().room, "beach_rd_s");
});

test("pending fare gates other commands", () => {
  state().money = 20;
  run("e", "n", "ride bus to beach road", "n");
  // the nag line rotates; the contract is the price + the PAY tap hint
  assert.match(lastOut(), /PAY <amount>/);
  assert.notEqual(state().room, "pratumnak_rd");
  // consecutive nags vary (the driver's patience has flavors), contract held
  const first = out[out.length - 1];
  out = [];
  run("s");
  assert.match(lastOut(), /PAY <amount>/);
  assert.notEqual(out[out.length - 1], first, "the second nag reads differently");
});

test("every exit key walks: pub, up/down/u/d, hotel — GO accepts what Exits lists", () => {
  // The Exits line decorates every key as a tap target, so every key must
  // move — _DIRS aliases plus any literal exit key of the room (pub, hotel).
  state().flags.hasWallet = true;
  state().room = "soi6_street";
  run("go pub");
  assert.equal(state().room, "queen_vic", "the pub door works");
  run("up"); // upstairs is for guests only
  assert.match(lastOut(), /Guest, sir/);
  assert.equal(state().room, "queen_vic");
  state().hotel = "queenvic";
  run("u");
  assert.equal(state().room, "qv_room", "a guest walks up (U alias)");
  run("d");
  assert.equal(state().room, "queen_vic", "and back down (D alias)");
  // the Metropole's street door on Buakhao North
  state().room = "buakhao_n"; state().hotel = "sabai";
  run("go hotel");
  assert.match(lastOut(), /Guest, sir/);
  state().hotel = "metropole";
  run("hotel"); // bare exit key walks too
  assert.equal(state().room, "metropole_room");
});

test("the bus stop and Nok's glass trade advertise themselves tappably", () => {
  // (RIDE BUS TO <place>) is a CAPS hint now — the last keyboard-only steps
  // of the opening funnel got tap paths.
  run("e", "n"); // the Jomtien bus stop
  assert.match(lastOut(), /\(RIDE BUS TO <place>\)/);
  // holding a bottle near Auntie Nok surfaces (SELL BOTTLES)
  out = [];
  run("s"); // back to her stretch of beach road, Chang bottle still un-taken
  assert.doesNotMatch(lastOut(), /SELL BOTTLES/, "no glass, no pitch");
  run("w", "take bottle", "e");
  assert.match(lastOut(), /\(SELL BOTTLES\)/);
});

// ── Battery, darkness, soi dogs ────────────────────────────────────────────

test("bare LIGHT toggles: on, then off (the chip sends it argless)", () => {
  run("light");
  assert.equal(state().lightOn, true);
  run("light");
  assert.equal(state().lightOn, false);
  assert.match(lastOut(), /Flashlight off/);
});

test("flashlight drains battery and dies at zero", () => {
  state().battery = 2;
  run("light on", "wait");
  assert.equal(state().battery, 0);
  assert.equal(state().lightOn, false);
  assert.match(lastOut(), /dies|dead/i);
});

test("darkness: growl then noodle sacrifice", () => {
  run("n");         // dongtan, dark, streak 1 — growl
  assert.match(lastOut(), /soi dog/i);
  run("wait");      // streak 2 — dog takes the noodles
  assert.equal(state().itemLoc.noodles, null);
  assert.equal(state().room, "dongtan_beach", "not moved — noodles absorbed the bite");
});

test("darkness without noodles: bitten and displaced", () => {
  state().itemLoc.noodles = null;
  state().money = 100;
  run("n", "wait");
  assert.equal(state().money, 70); // ฿30 shed
  assert.notEqual(state().room, "dongtan_beach");
});

test("charging needs charger and outlet", () => {
  run("e", "s", "charge phone"); // at 7-Eleven, no charger
  assert.match(lastOut(), /need a charger/i);
  state().money = 100;
  run("buy charger");
  assert.equal(state().money, 100 - 59);
  run("charge phone");
  assert.equal(state().battery, 100);
});

// ── Gossip chain & puzzles ─────────────────────────────────────────────────

test("re-talking gives the terse gist, not the full spiel again", () => {
  state().room = "jomtien_beach_rd";
  run("talk to nok");
  const first = lastOut();
  assert.match(first, /Beach full of bottle/); // full first-meeting spiel
  assert.match(first, /สวัสดี/);                // Thai greeting rendered
  out = [];
  run("talk to nok");
  const again = lastOut();
  assert.match(again, /Bring bottle, I give five baht/); // the point
  assert.doesNotMatch(again, /Beach full of bottle/);    // spiel dropped
  assert.doesNotMatch(again, /สวัสดี/);                   // greeting dropped on repeat
  assert.ok(state().talked.nok.length); // the seen ledger persisted
});

test("a flavour entry with no short brushes off on repeat (terseness consistency)", () => {
  state().room = "rainbow_girls"; // Ploy's counting line: no short, no gives/sets payload
  run("talk to ploy");
  assert.match(lastOut(), /Cage is for money and me/); // full the first time
  out = [];
  run("talk to ploy");
  assert.doesNotMatch(lastOut(), /Cage is for money and me/, "not the whole spiel again");
  assert.match(lastOut(), /already|same-same|told you|forget so fast/i, "a generic brush-off");
});

test("ask the same gossip twice: full, then a brush-off (the Bee-about-Candy case)", () => {
  state().room = "candy_bar_2"; // Bee is here; her 'candy' entry is pure flavour
  run("ask bee about candy");
  const first = lastOut();
  assert.match(first, /Khun Candy start with one bar/); // the full spiel
  out = [];
  run("ask bee about candy");
  assert.notEqual(lastOut(), first);
  assert.match(lastOut(), /already|same-same|told you|forget so fast/i);
});

test("every payload entry (gives/sets) has a short, so its clue re-reads concisely", () => {
  // No quest/clue entry should be left to the generic brush-off — each carries
  // re-readable info, so each must have an authored `short` gist.
  const naked = [];
  for (const [id, n] of Object.entries(NPCS)) {
    for (const d of n.dialogue || []) {
      if ((d.gives || (d.sets && d.sets.length)) && d.text && !d.short) naked.push(`${id}:${d.topic || "-"}`);
    }
  }
  assert.deepEqual(naked, [], "payload entries missing a short: " + naked.join(", "));
});

test("a clue entry repeats as its short (the actionable gist), not a brush-off", () => {
  // Lek's clue sets a flag but gives no item, so a clean second delivery = the
  // short alone (no re-give noise).
  const lek = NPCS.lek.dialogue.find(d => d.sets && d.sets.includes("knowOyHasIt"));
  assert.ok(lek && lek.short, "the clue entry has a short");
  state().talked = {};
  _deliver("lek", lek);       // first: full
  out = [];
  _deliver("lek", lek);       // repeat
  assert.equal(lastOut(), lek.short, "the repeat is the concise clue, verbatim");
  assert.match(lastOut(), /Rainbow Girls|safe/, "and it still names the key step");
  assert.doesNotMatch(lastOut(), /same-same|farang memory/i, "never a generic brush-off");
});

test("the brush-off is still gated to flavour — a payload entry with no short repeats full", () => {
  // guards the fallback logic even though no such entry ships today: inject a
  // synthetic clue-without-short onto a real NPC and confirm it re-reads in full
  const n = NPCS.bee;
  const synth = { topic: "__test_clue__", text: "The synthetic clue text, re-readable.", sets: ["__t"] };
  n.dialogue.push(synth);
  try {
    state().talked = {};
    _deliver("bee", synth);
    out = [];
    _deliver("bee", synth); // repeat
    assert.match(lastOut(), /synthetic clue text/, "no short + payload → full repeat");
    assert.doesNotMatch(lastOut(), /same-same|farang memory/i);
  } finally {
    n.dialogue.pop(); // don't leak the synthetic entry into other tests
  }
});

test("rail regulars brush off repeats too (their own grizzled voice)", () => {
  const G = state();
  // pick any patron with a no-short topic entry
  let pid, topic;
  for (const [id, p] of Object.entries(PATRONS)) {
    const e = (p.dialogue || []).find(x => x.topic && !x.short && x.text);
    if (e) { pid = id; topic = e.topic; break; }
  }
  assert.ok(pid, "found a patron with a no-short topic");
  _patronTalk(pid, topic);
  const first = lastOut();
  out = [];
  _patronTalk(pid, topic);
  assert.notEqual(lastOut(), first);
  assert.match(lastOut(), /told you|goldfish|same story/i, "a regular's brush-off");
});

test("candy withholds until the receipt proves your night", () => {
  state().room = "candy_bar";
  run("ask candy about wallet");
  assert.match(lastOut(), /Show me you were even here/i);
  run("read receipt", "talk to candy");
  assert.ok(state().flags.knowMot);
});

test("lek advances the trail to Madam Oy", () => {
  state().flags.knowMot = true;
  state().room = "lucky_tiger";
  run("talk to lek");
  assert.ok(state().flags.knowOyHasIt);
});

test("wai unlocks: fon, ploy, oy", () => {
  state().room = "jasmine_garden";
  run("wai fon");
  assert.ok(state().flags.greetedFon);
  state().room = "rainbow_girls";
  run("wai ploy", "wai oy");
  assert.ok(state().flags.waiedPloy);
  assert.ok(state().flags.waiedOy);
});

test("say sawatdee greets like a wai", () => {
  state().room = "jasmine_garden";
  run("say sawatdee");
  assert.ok(state().flags.greetedFon);
});

test("SAY <phrase> TO <person> aims the greeting at one target", () => {
  // Rainbow Girls has Ploy, Oy, and others — a directed greeting fires only
  // the named person's unlock, unlike the room-wide SAY.
  state().room = "rainbow_girls";
  run("say sawatdee to ploy");
  assert.match(lastOut(), /Ploy/);
  assert.ok(state().flags.waiedPloy, "aimed unlock fired");
  assert.ok(!state().flags.waiedOy, "the room-wide unlock did NOT fire");
  // thao rai to a bar girl gets the lady-drink quote, not a bus fare
  run("say thao rai to ploy");
  assert.match(lastOut(), new RegExp(String(150)));
  // aiming at nobody present is a graceful miss
  out = [];
  run("say sawatdee to gary");
  assert.match(lastOut(), /not here to hear it/i);
});

test("office door: blocked, then opened by the song", () => {
  state().room = "rainbow_girls";
  run("go office");
  assert.equal(state().room, "rainbow_girls");
  assert.match(lastOut(), /Bar is that way/i);
  state().flags.sabaiPlaying = true;
  run("go office");
  assert.equal(state().room, "oy_office");
  assert.ok(state().flags.officeOpen);
});

test("dj plays Sabai Sabai only after Ploy's tip", () => {
  state().room = "rainbow_girls";
  run("ask dj about sabai sabai");
  assert.ok(!state().flags.sabaiPlaying);
  assert.match(lastOut(), /Wonderwall/);
  state().flags.knowDoorTrick = true;
  run("ask dj about sabai sabai");
  assert.ok(state().flags.sabaiPlaying);
});

test("safe: wrong codes escalate, third try ejects you", () => {
  state().room = "oy_office";
  state().flags.officeOpen = true;
  run("enter 111", "enter 222");
  assert.equal(state().room, "oy_office");
  run("enter 333");
  assert.equal(state().room, "tt_deep");
});

test("safe opens on 719, Thai numerals accepted", () => {
  state().room = "oy_office";
  state().flags.officeOpen = true;
  run("enter ๗๑๙");
  assert.ok(state().flags.hasWallet);
  assert.equal(state().itemLoc.wallet, "inventory");
  assert.equal(state().money, 500);
});

test("classy path: wai Oy then ask for the wallet", () => {
  state().room = "rainbow_girls";
  state().flags.knowOyHasIt = true;
  run("wai oy", "ask oy about wallet");
  assert.ok(state().flags.oyGaveWallet);
  assert.ok(state().flags.hasWallet);
  assert.equal(state().money, 500);
});

test("daeng shortcuts both PIN clues", () => {
  state().room = "khao_talo_bar";
  state().flags.knowOyHasIt = true;
  run("talk to daeng");
  assert.ok(state().flags.pinPart71);
  assert.ok(state().flags.pinPart9);
});

test("motosai: quoted, paid, discounted after helmet favour", () => {
  state().room = "buakhao_s";
  state().money = 100;
  run("motosai to naklua");
  assert.equal(state().room, "naklua_rd");
  assert.equal(state().money, 50);
  newGame(); out = [];
  state().room = "buakhao_s";
  state().money = 100;
  state().flags.helmetDelivered = true;
  run("motosai to naklua");
  assert.equal(state().money, 80); // Bank's special price ฿20
});

// ── Street encounters ──────────────────────────────────────────────────────
// _startEnc fires an encounter directly (deterministic); the roll machinery
// (_maybeEncounter) is tested separately below.

test("katoey pickpocket: guarding your pocket saves the baht", () => {
  state().room = "beach_rd_c";
  state().money = 100;
  _startEnc("katoey");
  assert.ok(state().pendingEnc, "awaiting a snap reaction");
  run("hold onto my pockets");
  assert.equal(state().money, 100);
  assert.equal(state().pendingEnc, null);
});

test("katoey pickpocket: dithering costs ฿40", () => {
  state().room = "beach_rd_c";
  state().money = 100;
  _startEnc("katoey");
  run("um, hello?");
  assert.equal(state().money, 60);
});

test("katoey pickpocket: the truly broke get the pity coin", () => {
  state().room = "beach_rd_c";
  _startEnc("katoey");
  run("er");
  assert.equal(state().money, 5);
});

test("drunk bargirl: instant charity, no reaction needed", () => {
  state().room = "buakhao_market";
  _startEnc("bargirl");
  assert.equal(state().pendingEnc, null);
  assert.equal(state().money, 20);
  assert.equal(state().itemLoc.moo_ping, "inventory");
});

test("moo ping placates the soi dog like the noodles do", () => {
  state().itemLoc.noodles = null;
  state().itemLoc.moo_ping = "inventory";
  run("n", "wait");
  assert.equal(state().itemLoc.moo_ping, null);
  assert.equal(state().room, "dongtan_beach", "skewer absorbed the bite");
});

test("drunk brit: an apology turns him generous", () => {
  state().room = "ws_south";
  state().money = 10;
  _startEnc("brit");
  run("sorry mate, my mistake");
  assert.equal(state().money, 60);
});

test("drunk brit: squaring up gets expensive and piwin-adjacent", () => {
  state().room = "ws_south";
  state().money = 100;
  _startEnc("brit");
  run("swing at him");
  assert.equal(state().money, 70);
  assert.match(lastOut(), /piwin/i);
});

test("piwin power bank: +30% battery for saying yes", () => {
  state().room = "beach_rd_s";
  _startEnc("powerbank");
  run("yes please, khop khun krub");
  assert.equal(state().battery, 43); // 13 + 30
});

test("hair tonic scammer: ฿99 buys a bottle of regret (+2 at the ending)", () => {
  state().room = "beach_rd_n";
  state().money = 100;
  _startEnc("tonic");
  run("ok fine, buy it");
  assert.equal(state().money, 1);
  assert.equal(state().itemLoc.hair_tonic, "inventory");
});

test("hair tonic scammer: walking on costs nothing", () => {
  state().room = "beach_rd_n";
  state().money = 100;
  _startEnc("tonic");
  run("no thanks");
  assert.equal(state().money, 100);
  assert.equal(state().itemLoc.hair_tonic, null);
});

test("tonic shop: following him in and paying is the full fleece, recoverable", () => {
  state().room = "beach_rd_c";
  state().money = 10000;
  _startEnc("tonic");
  run("follow him to the shop");
  assert.ok(state().pendingEnc, "the shop re-arms for a second reaction");
  assert.match(lastOut(), /bead curtain|between you and the door/i);
  run("fine, pay");
  assert.equal(state().money, 10000 - TONIC_FLEECE);
  assert.equal(state().tonicOwed, TONIC_FLEECE, "the loss is banked for a report");
  assert.equal(state().itemLoc.hair_tonic, "inventory");
  assert.equal(state().pendingEnc, null);
});

test("tonic shop: nerve gets you out cheap, muscle fleeces you (and can be reported)", () => {
  // nerve wins (_rand < 0.5): a token ฿500 to save face, nothing to report
  state().room = "beach_rd_c"; state().money = 10000;
  _startEnc("tonic"); run("shop"); state().rng = 1; run("no, let me leave");
  assert.equal(state().money, 9500);
  assert.equal(state().tonicOwed, 0, "a clean-ish escape leaves no claim");
  // muscle wins (_rand >= 0.5): coerced payment, banked for a report
  state().room = "beach_rd_c"; state().money = 10000; state().tonicOwed = 0;
  _startEnc("tonic"); run("shop"); state().rng = 22245; run("no, get out of my way");
  assert.equal(state().money, 10000 - TONIC_SHAKEDOWN);
  assert.equal(state().tonicOwed, TONIC_SHAKEDOWN);
});

test("tonic shop: a stony-broke mark isn't worth robbing", () => {
  state().room = "beach_rd_c"; state().money = 0;
  _startEnc("tonic"); run("shop"); run("pay");
  assert.equal(state().money, 0);
  assert.equal(state().tonicOwed, 0);
  assert.equal(state().itemLoc.hair_tonic, "inventory", "one free sample bottle");
});

test("REPORT: the police settle a tonic-shop claim for most of it, minus their cut", () => {
  state().tonicOwed = 6000; state().money = 1000;
  // away from the station it just points you there
  state().room = "beach_rd_c";
  run("report");
  assert.match(lastOut(), /police station/i);
  assert.equal(state().money, 1000, "no recovery until you actually file it");
  // at the desk: recover owed minus the negotiation fee
  state().room = "police_station";
  run("report");
  const fee = Math.round(6000 * TONIC_POLICE_CUT);
  assert.equal(state().money, 1000 + (6000 - fee));
  assert.equal(state().tonicOwed, 0, "claim cleared");
  // nothing left to report
  out = [];
  run("report");
  assert.match(lastOut(), /what you want to report|nothing/i);
});

test("fortune-teller: the ฿199 palm reading is only the hook, then the ritual upsell arms", () => {
  state().room = "beach_rd_c";
  state().money = 5000;
  _startEnc("fortune");
  run("read my palm");
  assert.equal(state().money, 5000 - FORTUNE_READ, "the ฿199 reading is taken");
  assert.ok(state().pendingEnc, "the cleansing upsell re-arms for a second reaction");
  assert.match(lastOut(), /cleansing|dark spirit|four figures/i);
});

test("fortune-teller: walking on before the reading costs nothing", () => {
  state().room = "beach_rd_n";
  state().money = 500;
  _startEnc("fortune");
  run("no thanks");
  assert.equal(state().money, 500);
  assert.equal(state().pendingEnc, null);
  assert.match(lastOut(), /bad luck follow/i);
});

test("fortune-teller: paying for the cleansing is the full fleece, recoverable via REPORT", () => {
  state().room = "beach_rd_c";
  state().money = 5000;
  _startEnc("fortune");
  run("read");
  run("fine, pay for the ritual");
  assert.equal(state().money, 5000 - FORTUNE_READ - FORTUNE_RITUAL);
  assert.equal(state().curseOwed, FORTUNE_RITUAL, "the loss is banked for a report");
  assert.equal(state().pendingEnc, null);
  // recover it at the station, minus the same negotiation cut as the tonic scam
  state().room = "police_station";
  const owed = state().curseOwed, before = state().money;
  run("report");
  const fee = Math.round(owed * TONIC_POLICE_CUT);
  assert.equal(state().money, before + (owed - fee));
  assert.equal(state().curseOwed, 0, "claim cleared");
  assert.match(lastOut(), /robes|red string|not real monk/i);
});

test("fortune-teller: refusing the ritual — nerve walks clean, pressure costs a 'merit'", () => {
  // nerve wins (_rand < 0.5): you keep your baht
  state().room = "beach_rd_c"; state().money = 5000;
  _startEnc("fortune"); run("read"); state().rng = 1; run("no, leave me alone");
  assert.equal(state().money, 5000 - FORTUNE_READ, "nerve holds — nothing beyond the reading");
  assert.equal(state().curseOwed, 0);
  // pressure wins (_rand >= 0.5): a coerced 'merit', banked for a report
  state().room = "beach_rd_c"; state().money = 5000; state().curseOwed = 0;
  _startEnc("fortune"); run("read"); state().rng = 22245; run("no, get out of my way");
  assert.equal(state().money, 5000 - FORTUNE_READ - FORTUNE_MERIT);
  assert.equal(state().curseOwed, FORTUNE_MERIT);
});

test("Darkside: Mama Yai's is hand-authored — a mama, a hostess with a story, a rail regular", () => {
  assert.equal(NPC_ROLES.yai, "mamasan", "Mama Yai runs the floor");
  assert.equal(NPCS.yai.room, "mama_yai");
  assert.equal(NPC_ROLES.kratae, "hostess");
  assert.equal(NPCS.kratae.room, "mama_yai");
  assert.equal(PATRONS.ron.home, "mama_yai", "Ron drinks at Mama Yai's");
  // hand-authored, not filler: Kratae's Night Heron tip is gated behind Mama Yai
  // naming the photo wall (sets knowYaiWall)
  const wall = NPCS.yai.dialogue.find(d => d.topic === "photos");
  assert.ok(wall && (wall.sets || []).includes("knowYaiWall"));
  const heron = NPCS.kratae.dialogue.find(d => d.topic === "heron");
  assert.deepEqual(heron.req, ["knowYaiWall"], "the lock-in tip unlocks after the wall");
});

test("Gentleman's Club: the Orchid Club exists, is a gents club, and Rose runs it", () => {
  assert.equal(ROOMS.orchid_club.barType, "gents");
  assert.equal(NPCS.rose.room, "orchid_club");
  assert.equal(NPC_ROLES.rose, "mamasan");
  assert.equal(ROOM_GEO.orchid_club.length, 2, "has an OSM anchor");
});

test("Gentleman's Club: buying a lady a drink makes the staff hands-on (favor bump)", () => {
  state().room = "orchid_club";
  const id = _npcsHere().find(n => NPC_ROLES[n] === "hostess");
  state().soc.drinks[id] = 0;
  const cold = _favor(id);
  state().soc.drinks[id] = 1;
  const warm = _favor(id);
  assert.equal(warm - cold, 1 + 6, "one drink itself, plus the gents-club hands-on bonus");
  // the same drink in an ordinary bar buys only itself
  state().room = "mama_yai";
  assert.equal(_favor(id), 1, "no hands-on bonus outside a gents club");
});

test("Gentleman's Club: short time is on-site (the curtained couch) and the night carries on", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "orchid_club"; state().money = 5000; state().day = 3;
  const id = _npcsHere().find(n => NPC_ROLES[n] === "hostess");
  state().pendingBf = { id, st: 900, lt: 1350, room: "orchid_club" };
  _bfResolve("st");
  assert.equal(state().day, 3, "on-site — no take-out, the night doesn't end");
  assert.equal(state().room, "orchid_club");
  assert.equal(state().money, 5000 - 900);
  assert.match(lastOut(), /curtain|couch/i);
});

test("diminishing returns: each barfine buys less สนุก, cools a notch a day, resets per trip", () => {
  state().jaded = 0; state().happy = 0;
  _conquestHappy(10);            // first: full value
  assert.equal(state().happy, 10);
  assert.equal(state().jaded, 1);
  _conquestHappy(10);            // second: −2
  assert.equal(state().happy, 10 + 8);
  _conquestHappy(10);            // third: −4
  assert.equal(state().happy, 18 + 6);
  // floor: a deep binge nets a real penalty, never below −4 per act
  state().jaded = 20; state().happy = 50;
  _conquestHappy(6);
  assert.equal(state().happy, 46, "floored at −4");
  // a mediocre app hit still feeds the treadmill (jaded climbs)
  const j = state().jaded;
  _conquestHappy(2);
  assert.equal(state().jaded, j + 1);
});

test("diminishing returns: a night's sleep cools it, a new vacation clears it", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "hotel_room"; state().jaded = 3;
  run("sleep");                  // ends the night → day roll
  assert.equal(state().jaded, 2, "one notch cooler after a day");
  state().jaded = 5;
  _newVacation();
  assert.equal(state().jaded, 0, "a fresh trip resets the treadmill");
});

test("app booking: the catfish is the base rate; a hit is an on-site conquest", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "hotel_room"; state().money = 6000; state().nightTurn = 60; state().jaded = 0;
  // force the hit (rng seeded so _rand() < 0.45)
  state().rng = 1;
  _startEnc("booking");
  run("yes book her");
  assert.equal(state().money, 6000 - BOOK_PRICE, "paid the direct price");
  assert.ok(state().happy > 0, "a real conquest");
  assert.match(lastOut(), /exactly the photos|pays out/i);

  // the catfish door (re-armed after a bad roll): SEND her off for a token…
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().room = "hotel_room"; state().money = 6000;
  state().pendingEnc = "booking"; state().flags.catfishArrived = true;
  run("send her off");
  assert.equal(state().money, 6000 - 300, "just the taxi token, no ฿2500");
  assert.match(lastOut(), /taxi|not feel good/i);
  // …or STAY — a mediocre conquest that still feeds the treadmill
  state().room = "hotel_room"; state().money = 6000; state().jaded = 0;
  state().pendingEnc = "booking"; state().flags.catfishArrived = true;
  run("stay");
  assert.equal(state().money, 6000 - BOOK_PRICE);
  assert.equal(state().jaded, 1, "the treadmill still ticks over");
});

test("app booking is a late, hotel-room, nightly encounter", () => {
  assert.ok(ENCOUNTERS.booking.rooms.includes("hotel_room"));
  assert.equal(ENCOUNTERS.booking.nightly, true);
  assert.equal(ENCOUNTERS.booking.interactive, true);
});

test("the Nite Owl column dispenses canon: masthead, a reader reply, the signoff — day-stable", () => {
  state().day = 3; state().vacation = 1;
  out = []; run("column");
  const a = lastOut();
  assert.match(a, /THE NITE OWL/i, "the masthead");
  assert.match(a, /\bOWL:/, "the columnist's reply to a reader");
  assert.match(a, /DON'T GIVE A HOOT/, "the signoff");
  out = []; run("column");
  assert.equal(lastOut(), a, "same day → the same hoot (shared-world-stable)");
  // it's readable anywhere and OWL is an alias
  state().room = "jomtien_beach"; out = [];
  run("owl");
  assert.match(lastOut(), /THE NITE OWL/i);
});

test("Mort writes the column to stay sane, from his stool at the Queen Vic", () => {
  assert.equal(PATRONS.mort.home, "queen_vic");
  assert.ok(PATRONS.mort.dialogue.some(d => d.topic === "column"));
  assert.ok(PATRONS.mort.dialogue.some(d => d.topic === "sane"));
  assert.ok(PATRONS.mort.dialogue.some(d => !d.topic && !d.req), "an unconditional intro line");
});

test("REPORT surfaces in autocomplete only at the station or while still owed", () => {
  state().room = "beach_rd_c"; state().tonicOwed = 0;
  assert.ok(!engineComplete("rep").includes("report"), "not offered on a random street");
  state().room = "police_station";
  assert.ok(engineComplete("rep").includes("report"), "offered at the station");
  state().room = "beach_rd_c"; state().tonicOwed = 2000;
  assert.ok(engineComplete("rep").includes("report"), "offered while still owed");
});

test("tonicOwed survives save/restore and old saves backfill it", () => {
  state().tonicOwed = 4200;
  const save = serializeGame();
  newGame();
  deserializeGame(save);
  assert.equal(state().tonicOwed, 4200);
  // an old save with no field at all backfills to 0
  const old = JSON.parse(save); delete old.tonicOwed;
  deserializeGame(JSON.stringify(old));
  assert.equal(state().tonicOwed, 0);
});

test("restore heals nested sub-keys added after the save was written", () => {
  // deserializeGame merges the save over a fresh newGame() skeleton, one level
  // deep — so a sub-key introduced later (soc.bra, phone.msgCd, a new item in
  // itemLoc) gets today's default while the save's own values win. This is the
  // property that replaced the per-field backfill chain; hold it.
  state().soc.drinks.noi = 4;
  state().money = 1234;
  const old = JSON.parse(serializeGame());
  delete old.soc.bra;          // sub-key that postdates ancient saves
  delete old.phone.msgCd;      //   (previously only whole-object misses healed)
  delete old.itemLoc.moo_ping; // an item added after the save
  delete old.wingmanUntil;     // a plain field added after the save
  deserializeGame(JSON.stringify(old));
  assert.deepEqual(state().soc.bra, {}, "soc.bra healed");
  assert.equal(state().soc.drinks.noi, 4, "saved soc values still win");
  assert.deepEqual(state().phone.msgCd, {}, "phone.msgCd healed");
  assert.equal(state().itemLoc.moo_ping, null, "new item at its default location");
  assert.equal(state().wingmanUntil, 0, "plain field at its default");
  assert.equal(state().money, 1234, "saved scalars win over the skeleton");
});

test("mid-encounter restore: the prompt is stashed and redraws (no blind exit line)", () => {
  state().room = "beach_rd_s";
  _startEnc("powerbank");
  assert.equal(state().pendingEnc, "powerbank");
  // the prompt lines are stashed so a restore can replay them
  assert.ok(Array.isArray(state().encPrompt) && state().encPrompt.length,
    "the encounter prompt is captured on G");
  // simulate closing and reopening: a fresh transcript, then the redraw
  const snap = serializeGame();
  out = [];
  deserializeGame(snap);
  _renderEncounter();
  assert.match(lastOut(), /power bank/i, "the encounter text is shown again on load");
  // and it survives the JSON round-trip intact
  assert.deepEqual(JSON.parse(snap).encPrompt, state().encPrompt);
});

test("saleng restore: a parked cart re-announces itself on describeRoom (reload)", () => {
  // The cart is a room fixture, not a modal — so a reload redraws it through the
  // room description (like darkness/rain), not a pendingEnc prompt.
  state().room = "candy_bar";
  parkSaleng("lingerie");
  out = [];
  _describeRoom(true);
  assert.match(lastOut(), /lingerie saleng idles outside/, "the parked cart is redrawn on load");
  assert.match(lastOut(), /BUY LINGERIE/, "with its buy hint");
});

test("_renderEncounter is a no-op with no pending encounter", () => {
  state().pendingEnc = null;
  state().encPrompt = [["should not print", "alert"]];
  out = [];
  _renderEncounter();
  assert.equal(out.length, 0);
});

// _renderResume is the single restore-redraw dispatcher: whatever modal state
// gates input in doCommand must have its prompt redrawn on continue/undo, or the
// load is blind (the c4/jackpot/saleng bug class). One case per gate.
test("_renderResume redraws every modal state that gates input", () => {
  const G = state();
  const draw = () => { out = []; _renderResume(); return lastOut(); };

  // 1. a live bar game
  G.game = { type: "jp", tiles: jpNew(), pending: [[2, 3], [5]] };
  assert.match(draw(), /still in progress[\s\S]*FLIP 2 & 3 or 5/, "jackpot board + hint");
  G.game = null;

  // 2. a street encounter (stashed prompt)
  G.pendingEnc = "peddler";
  G.encPrompt = [["a peddler at your elbow", "alert"], ["(WATCH ฿300 · or NO.)", "dim"]];
  assert.match(draw(), /peddler at your elbow[\s\S]*WATCH ฿300/, "encounter prompt");
  G.pendingEnc = null; G.encPrompt = null;

  // 3. the checkout desk
  G.pendingChoice = "checkout"; G.hotel = "sabai";
  assert.match(draw(), /The clerk waits/, "checkout options");

  // 4. the airline choice at week's end
  G.pendingChoice = "vacation_end";
  assert.match(draw(), /airline needs an answer/, "vacation-end options");
  G.pendingChoice = null;

  // 5. an unpaid fare (the nag line rotates; price + PAY hint is the contract)
  G.pendingFare = { kind: "bus", price: 15, dest: "naklua_rd" };
  assert.match(draw(), /PAY <amount>/, "fare reminder");
  G.pendingFare = null;

  // nothing modal: silence, not a stray line
  assert.equal(draw(), "");
});

// The redraw must mirror doCommand's own priority order — whichever gate fires
// first there is the one actually eating input, so it's the one to show.
test("_renderResume follows doCommand's gate priority (checkout before game)", () => {
  const G = state();
  G.pendingChoice = "checkout"; G.hotel = "sabai";
  G.game = { type: "jp", tiles: jpNew(), pending: [[2, 3], [5]] };
  out = []; _renderResume();
  assert.match(lastOut(), /The clerk waits/);
  assert.doesNotMatch(lastOut(), /still in progress/, "the higher-priority gate wins");
  G.pendingChoice = null; G.game = null;
});

test("_renderResume re-surfaces unread texts (the buzz nudge is lost on reload)", () => {
  const G = state();
  G.phone.inbox = [{ from: "noi", text: "where na", turn: 5, read: false }];
  out = []; _renderResume();
  assert.match(lastOut(), /1 unread message waiting/);
  // read messages don't nag
  G.phone.inbox[0].read = true;
  out = []; _renderResume();
  assert.equal(lastOut(), "");
});

// A downpour gates movement; a reload must re-announce it or the block reads as
// a bug (the room describes as dry, then "the street is a river" on the next step).
test("reload mid-rain: the room description re-announces the downpour", () => {
  const G = state();
  G.room = "beach_rd_c"; G.rain = 6; // outdoors, mid-downpour
  out = []; _describeRoom(true);
  assert.match(lastOut(), /rain|sheets|awning/i, "the street says it's pouring");
  G.room = "candy_bar"; // sheltered
  out = []; _describeRoom(true);
  assert.match(lastOut(), /rain hammers the roof|downpour/i, "the bar says it's pouring outside");
  G.rain = 0; // dry again: no weather line
  out = []; _describeRoom(true);
  assert.doesNotMatch(lastOut(), /downpour|hammers the roof/i);
});

// "Exits: w, e" never said a bar was behind those directions — the room now
// names the bars you can walk into, with the direction and the ENTER verb.
test("describeRoom names the bars you can step into", () => {
  state().room = "buakhao_market";
  out = []; _describeRoom(true);
  assert.match(lastOut(), /Step inside:.*Candy Bar \(w\)/, "names the bar and its direction");
  assert.match(lastOut(), /ENTER <name>/, "teaches the ENTER verb");
  // the same cart reached by two exits (w and in) is listed once, by the compass dir
  assert.doesNotMatch(lastOut(), /Candy Bar \(in\)/, "prefers a compass direction over 'in'");
  // inside a bar (exits are just 'out' to the street) there's nothing to step into
  state().room = "candy_bar";
  out = []; _describeRoom(true);
  assert.doesNotMatch(lastOut(), /Step inside/, "no step-inside list when no bar adjoins");
});

test("encounter roll: cooldown holds, and no encounter fires twice", () => {
  state().room = "beach_rd_c";
  state().turns = 100;
  state().lastEnc = 95; // inside the cooldown window
  for (let i = 0; i < 100; i++) _maybeEncounter();
  assert.equal(state().pendingEnc, null, "cooldown holds");
  state().lastEnc = 0;
  for (let i = 0; i < 200 && !state().pendingEnc; i++) _maybeEncounter();
  assert.ok(state().pendingEnc, "an encounter eventually fires");
  const first = state().pendingEnc;
  state().pendingEnc = null;
  state().lastEnc = 0;
  for (let i = 0; i < 200 && !state().pendingEnc; i++) _maybeEncounter();
  assert.notEqual(state().pendingEnc, first, "once per game means once");
});

test("the RNG lives in the save: undo cannot reroll an encounter", () => {
  state().room = "beach_rd_c";
  state().turns = 50;
  const snap = serializeGame();
  for (let i = 0; i < 100 && !state().pendingEnc; i++) _maybeEncounter();
  const first = state().pendingEnc;
  assert.ok(first);
  deserializeGame(snap);
  for (let i = 0; i < 100 && !state().pendingEnc; i++) _maybeEncounter();
  assert.equal(state().pendingEnc, first, "same seed, same fate");
});

test("old saves (pre-encounters) load with backfilled fields", () => {
  const old = JSON.parse(serializeGame());
  delete old.encDone; delete old.pendingEnc; delete old.rng; delete old.lastEnc;
  delete old.itemLoc.moo_ping; delete old.itemLoc.hair_tonic;
  deserializeGame(JSON.stringify(old));
  assert.deepEqual(state().encDone, {});
  assert.ok(state().rng > 0);
  assert.equal(state().itemLoc.moo_ping, null);
  assert.equal(state().itemLoc.hair_tonic, null);
});

// ── Bar mini-games ─────────────────────────────────────────────────────────

test("mini-games only where the furniture exists", () => {
  run("play connect 4");
  assert.match(lastOut(), /No Connect 4 board here/i);
  state().room = "candy_bar";
  run("play pool");
  assert.match(lastOut(), /No pool table here/i);
  assert.equal(state().game, null);
});

test("connect 4: stakes escrowed, quitting forfeits them", () => {
  state().room = "candy_bar";
  state().money = 100;
  run("play connect 4");
  assert.ok(state().game && state().game.type === "c4");
  assert.equal(state().money, 80, "฿20 escrowed");
  assert.match(lastOut(), /●/);
  run("quit");
  assert.equal(state().game, null);
  assert.equal(state().money, 80, "stake gone");
});

test("connect 4: broke players play for sanuk", () => {
  state().room = "candy_bar";
  run("play connect 4");
  assert.equal(state().game.stake, 0);
  assert.match(lastOut(), /sanuk/i);
  run("quit");
  assert.equal(state().money, 0);
});

test("connect 4: a live game captures commands until it ends", () => {
  state().room = "candy_bar";
  run("play connect 4", "n");
  assert.equal(state().room, "candy_bar", "no walking away mid-game");
  run("quit");
});

test("connect 4: winning pays double and sets the legend flag", () => {
  state().room = "candy_bar";
  state().money = 100;
  run("play connect 4");
  // stack the deck: three ● waiting on column 1, her pieces elsewhere
  const b = state().game.board;
  b[5][0] = b[4][0] = b[3][0] = 1;
  b[5][6] = b[5][5] = 2;
  run("drop 1");
  assert.equal(state().game, null);
  assert.equal(state().money, 120, "stake doubled back");
  assert.ok(state().flags.beatBargirlC4);
  assert.match(lastOut(), /legend/i);
});

test("connect 4 distractions: a saleng costs the girls a tier — never the mama", () => {
  // Ton (floor girl, depth 6) hosts at the Silk Rose; park a lingerie cart
  state().room = "silk_rose";
  state().money = 100;
  state().salengCart = "lingerie";
  state().salengRoom = "silk_rose";
  state().salengUntil = state().turns + 60;
  run("play connect 4");
  assert.equal(state().game.oppId, "ton");
  run("drop 1");
  assert.match(lastOut(), /lingerie|giggling conference/i, "the distraction is written");
  assert.equal(state().game.distKey, "lingerie");
  // announced once, not every move
  out = [];
  run("drop 2");
  assert.doesNotMatch(lastOut(), /giggling conference/i);
  // the cart moves on mid-game: she snaps back, tier restored
  state().salengCart = null;
  out = [];
  run("drop 3");
  assert.match(lastOut(), /eyes come back|has moved on/i);
  assert.equal(state().game.distKey, null);
  run("q");
  // Daeng's table: the mamasan does not look
  state().room = "khao_talo_bar";
  state().salengCart = "food";
  state().salengRoom = "khao_talo_bar";
  state().salengUntil = state().turns + 60;
  out = [];
  run("play connect 4");
  assert.equal(state().game.oppId, "daeng");
  run("drop 1");
  assert.match(lastOut(), /does not so much as glance/i);
  assert.equal(state().game.distKey, "food", "noted, and not re-announced");
  run("q");
  state().salengCart = null;
});

test("connect 4 distractions: a downpour counts too, and the ladder steps 8→6→2→1", () => {
  state().room = "silk_rose";
  state().rain = 5;
  run("play connect 4");
  run("drop 1");
  assert.match(lastOut(), /rain|autopilot/i);
  assert.equal(state().game.distKey, "rain");
  run("q");
  state().rain = 0;
  assert.equal(_c4TierDown(8), 6);
  assert.equal(_c4TierDown(6), 2);
  assert.equal(_c4TierDown(2), 1);
});

test("connect 4 skill ladder: mamasans 8, floor girls 6, new girls 2", () => {
  assert.equal(_c4Depth("candy"), 8, "Candy is top tier");
  assert.equal(_c4Depth("oy"), 8, "so is Madam Oy");
  assert.equal(_c4Depth("nan"), 6, "the rank and file one step down");
  assert.equal(_c4Depth("lek"), 6);
  assert.equal(_c4Depth("nong"), 2, "first week on the soi — beatable");
  assert.equal(_c4Depth("mai"), 2, "a filler girl whose desc says she's new");
  assert.equal(_c4Depth(null), 6, "'the hostess on shift' fallback");
  // every filler newbie desc carries the beatable tier, and only those
  for (const [id, n] of Object.entries(NPCS)) {
    if (!n.filler || NPC_ROLES[id] !== "hostess") continue;
    const green = /^(New enough|Baby-faced)/.test(n.desc);
    assert.equal(_c4Depth(id) === 2, green, `${id}: desc and tier agree`);
  }
});

test("connect 4: the intro telegraphs the opponent's tier, and depth rides the game", () => {
  // Candy's table (day 2, her home bar): the shark intro
  state().day = 2;
  state().room = "candy_bar";
  run("play connect 4");
  assert.equal(state().game.depth, 8);
  assert.match(lastOut(), /not her hundredth/i);
  run("quit");
  // Nong's table at the Gold Rush — no other canon girl there, she hosts
  out = [];
  state().room = "gold_rush";
  const host = _gameHostess();
  if (host.id === "nong") { // canon: Fon also works Jasmine Garden, Nong hosts Gold Rush
    run("play connect 4");
    assert.equal(state().game.depth, 2);
    assert.match(lastOut(), /counts hers twice|fondness and pity/i);
    run("quit");
  }
  // old saves mid-game carry no depth — the AI defaults to the shark
  state().room = "candy_bar";
  run("play connect 4");
  delete state().game.depth;
  run("drop 1"); // must not throw; she still answers
  assert.ok(state().game === null || state().game.board.flat().filter(v => v === 2).length >= 1);
});

test("jackpot: settles one way or another, money stays consistent", () => {
  state().room = "lucky_tiger";
  state().money = 100;
  run("play jackpot 20");
  // resolve any pending flip choices until the game settles
  for (let i = 0; i < 20 && state().game; i++) {
    const mv = state().game.pending;
    run(mv ? "flip " + mv[mv.length - 1].join(" ") : "roll");
  }
  assert.equal(state().game, null, "game settled");
  assert.ok([80, 100, 120, 140].includes(state().money),
    `loss/push/win/jackpot only — got ฿${state().money}`);
});

test("jackpot tutorial: first game is hostess-led and manual, then auto-roll returns", () => {
  const G = state();
  G.room = "candy_bar_2"; G.money = 500; G.flags.act1Done = true; G.rng = 7;
  assert.ok(!G.flags.jpLearned, "a new player hasn't learned Jackpot yet");
  out = [];
  run("play jackpot");
  assert.equal(G.game.tutorial, true, "the first game runs the tutorial");
  assert.match(lastOut(), /First time/, "the hostess offers to walk you through it");

  // every roll stops for you while learning — no forced roll auto-resolves
  let steps = 0;
  while (G.game && G.game.pending && steps++ < 40) {
    assert.doesNotMatch(lastOut(), /→ flip/, "nothing auto-plays during the tutorial");
    run("flip " + G.game.pending[0].join(" "));
  }
  assert.ok(G.flags.jpLearned, "finishing one full round teaches the game for good");
  assert.match(lastOut(), /Now you know Jackpot/, "she graduates you");

  // a later game plays the forced single-option rolls itself again
  out = [];
  run("play jackpot");
  assert.equal(G.game.tutorial, false, "the tutorial doesn't run twice");
  let s2 = 0;
  while (G.game && G.game.pending && s2++ < 40) run("flip " + G.game.pending[0].join(" "));
  assert.match(lastOut(), /→ flip/, "forced rolls auto-resolve once you've learned");
});

test("jackpot: bet is clamped and capped by pocket money", () => {
  state().room = "lucky_tiger";
  state().money = 15;
  state().rng = 1; // seed that leaves the game live at a pending choice
  run("play jackpot 500");
  assert.equal(state().game.stake, 15, "can't stake more than you carry");
  assert.equal(state().money, 0);
  run("quit");
});

test("pool: table gating, stake, and the visit loop", () => {
  state().room = "khao_talo_bar";
  state().money = 100;
  run("play pool");
  assert.ok(state().game && state().game.type === "pool");
  assert.equal(state().money, 50, "฿50 under the cushion");
  assert.match(lastOut(), /Daeng/);
  for (let i = 0; i < 60 && state().game; i++) run("shot");
  assert.equal(state().game, null, "frame finished");
  assert.ok([50, 150].includes(state().money), `lose or win — got ฿${state().money}`);
});

// ── Bar social life ────────────────────────────────────────────────────────

test("flirting is always safe; kissing cold gets you slapped", () => {
  state().room = "jasmine_garden";
  run("flirt with fon");
  assert.match(lastOut(), /professional warmth/i);
  assert.ok(!state().soc.heat.jasmine_garden);
  run("kiss fon");
  assert.match(lastOut(), /slap/i);
  assert.equal(state().soc.heat.jasmine_garden, 1);
});

test("lady drinks warm the outcome, tier by tier", () => {
  state().room = "jasmine_garden";
  state().money = 1000;
  run("buy drink for fon", "buy drink for fon", "buy drink for fon");
  assert.equal(state().soc.drinks.fon, 3);
  run("kiss fon");
  assert.match(lastOut(), /puppy|Sanuk/i, "tolerated at three drinks");
  run("buy drink for fon", "buy drink for fon", "kiss fon");
  assert.match(lastOut(), /takes her time/i, "leaned into at five");
});

test("cashiers cap physical contact until the bell has rung twice", () => {
  state().room = "rainbow_girls";
  state().money = 1000;
  run("spank ploy");
  assert.match(lastOut(), /books, not the customers/i);
  assert.equal(state().soc.heat.rainbow_girls, 2);
  run("ring bell", "ring bell"); // two bells lift the cap and clear the heat
  assert.equal(state().soc.bells.rainbow_girls, 2);
  state().soc.drinks.ploy = 4;
  out = [];
  run("spank ploy"); // cap lifted; favor 4 + two-bell warmth lands hot
  assert.doesNotMatch(lastOut(), /books, not the customers/i); // no longer capped
  assert.match(lastOut(), /returns fire|out-Pattaya|spanks YOU/i); // a real reaction
});

test("three bell rings: the room is yours — hostess reciprocates cold", () => {
  state().room = "neon_paradise"; // Noi, a hostess
  state().money = 2000;
  run("ring bell", "ring bell", "ring bell");
  assert.equal(state().soc.bells.neon_paradise, 3);
  out = [];
  run("fondle noi"); // zero drinks bought — but three bells top-tiers it anyway
  assert.match(lastOut(), /puts them where she wants|takes both your hands/i);
});

test("three bells grant amnesty: heat can't accumulate", () => {
  state().room = "neon_paradise";
  state().turns = 100;
  state().soc.bellAt.neon_paradise = 100; // glow active
  state().soc.bells.neon_paradise = 3;
  state().soc.heat.neon_paradise = 0;
  _addHeat(2);
  assert.equal(state().soc.heat.neon_paradise || 0, 0, "no heat at three bells");
  state().soc.bells.neon_paradise = 1; // one bell: heat lands normally again
  _addHeat(2);
  assert.equal(state().soc.heat.neon_paradise, 2);
});

test("bell flavor: 'Three' isn't shouty (no dead tap), four-plus gets a generic line", () => {
  state().room = "neon_paradise";
  state().money = 5000;
  run("ring bell", "ring bell", "ring bell"); // third ring: the peak line
  assert.match(lastOut(), /Three bells|own this bar/);
  assert.doesNotMatch(lastOut(), /THREE/, "all-caps would decorate into a dead tap target");
  out = [];
  run("ring bell"); // fourth: no longer claims 'three', a generic escalation line
  assert.doesNotMatch(lastOut(), /three bells/i);
  assert.match(lastOut(), /on top of three|making noise/i);
});

test("saleng buy: the cart's items surface in autocomplete (no more typing them out)", () => {
  state().room = "neon_paradise"; // Noi, a hostess, present; a saleng-eligible bar
  parkSaleng("food");
  assert.deepEqual(_salengItems(), ["moo ping", "noodles"]);
  const buy = engineComplete("buy ");
  assert.ok(buy.includes("moo ping") && buy.includes("noodles"), "cart items listed for 'buy '");
  assert.ok(engineComplete("buy moo ping for ").includes("noi"), "a present lady is offered as the gift target");
  state().salengCart = null; // no cart: buy falls back to the bar/shop list
  assert.ok(engineComplete("buy ").includes("beer"));
  assert.deepEqual(_salengItems(), []);
});

test("Aek the tom cashier holds the till at Midnight Sun and caps contact", () => {
  state().room = "midnight_sun";
  run("talk to aek");
  assert.match(lastOut(), /money and the gossip/i);
  run("ask aek about noi");
  assert.match(lastOut(), /girlfriend/i); // dating a hostess, per canon
  state().money = 1000;
  run("spank aek");
  assert.match(lastOut(), /books, not the customers/i); // cashier contact cap
});

test("the ceiling game: aliases route to it, favor gates the ammunition", () => {
  state().room = "neon_paradise"; // Noi, plus filler girls — name the target
  // cold: she won't hand over a cover
  run("throw cover at noi");
  assert.match(lastOut(), /Buy drink first|No favor bought/i);
  // warm her up, then all three aliases reach the game. Reset room+heat each
  // time so a prior throw landing on the mamasan (heat → kickout, which moves
  // you to the street) can't make a later alias look unrouted.
  state().soc.drinks.noi = 3;
  for (const cmd of ["throw cover at noi", "throw nipple cover at noi", "throw pastie at noi"]) {
    state().room = "neon_paradise";
    state().soc.heat = {};
    out = [];
    run(cmd);
    assert.match(lastOut(), /fling it at the ceiling|It STICKS/i, cmd);
  }
});

test("throw with no cover keeps the old flavor refusal; none-here is a no-op joke", () => {
  state().room = "neon_paradise";
  run("throw bottle");
  assert.doesNotMatch(lastOut(), /ceiling/i); // falls through to misc-verb flavor
  state().room = "queen_vic"; // a pub — no hostesses, no braless dancer
  run("throw cover");
  assert.match(lastOut(), /short one dancer|needs a braless dancer/i);
});

test("buying the bra bumps fondle one tier and is favor- and money-gated", () => {
  state().room = "neon_paradise"; // Noi, hostess
  state().money = 1000;
  // cold: no wardrobe talk without a drink first
  run("buy bra for noi");
  assert.match(lastOut(), /DRINK first/i);
  assert.ok(!(state().soc.bra && state().soc.bra.noi));
  // warm her up, buy the bra, confirm the charge and the flag
  state().soc.drinks.noi = 2;
  run("buy bra for noi");
  assert.equal(state().soc.bra.noi, true);
  assert.equal(state().money, 800); // -฿200
  // favor 2 − fondle 5 = -3 (tier-0 slap) without the bra; +2 bump lifts it off
  // the hard rebuff.
  out = [];
  run("fondle noi");
  assert.doesNotMatch(lastOut(), /drops the bar five degrees/i);
});

test("hands off the mamasan; twice gets you walked out of all of LK Metro", () => {
  state().room = "rainbow_girls";
  run("fondle oy");
  assert.match(lastOut(), /do NOT do that to the mamasan/i);
  run("fondle oy");
  assert.notEqual(state().room, "rainbow_girls", "ejected");
  assert.ok(state().soc.banned.rainbow_girls !== undefined);
  assert.ok(state().soc.banned.gold_rush !== undefined, "complex-wide ban");
});

test("a ban holds until the security shift changes", () => {
  state().room = "buakhao_market";
  state().soc.banned.candy_bar = 0;
  state().turns = 5;
  run("enter candy");
  assert.equal(state().room, "buakhao_market");
  assert.match(lastOut(), /Not tonight/i);
  state().turns = 45;
  run("enter candy");
  assert.equal(state().room, "candy_bar");
  assert.equal(state().soc.heat.candy_bar, 1, "back in, but on notice");
});

test("a drink for the mamasan buys the whole bar's goodwill", () => {
  state().room = "candy_bar";
  state().money = 500;
  run("buy drink for candy");
  assert.equal(state().soc.drinks.candy, 1);
  assert.ok(state().soc.mamaTreat.candy_bar);
  assert.match(lastOut(), /royal assent|treat you like a regular/i);
});

test("ringing the bell costs ฿300, clears heat, and lifts every outcome", () => {
  state().room = "jasmine_garden";
  state().money = 400;
  state().soc.heat.jasmine_garden = 2;
  run("ring bell");
  assert.equal(state().money, 100);
  assert.equal(state().soc.heat.jasmine_garden, 0);
  assert.ok(sfx.includes("bell"), "the bell clang fires through the sfx hook");
  run("kiss fon"); // bell glow +2 − severity 3 = soft deflection, not a slap
  assert.match(lastOut(), /cheek|deflection/i);
});

test("patron talk: sober tips, drunk rambling, bell-glow hero worship", () => {
  state().room = "lucky_tiger";
  run("talk to patron");
  assert.match(lastOut(), /mamasan|cashiers/i);
  state().soc.drunk = 4;
  run("talk to patron");
  assert.match(lastOut(), /stool away/i);
  state().soc.bellAt.lucky_tiger = state().turns;
  run("talk to patron");
  assert.match(lastOut(), /THAT'S the fella/i);
  assert.equal(state().soc.drunk, 5, "he bought you one back");
});

test("drink-sniping the regular's girl is bad form; a beer mends it", () => {
  state().room = "lucky_tiger";
  state().money = 500;
  state().soc.patronBusy.lucky_tiger = true;
  run("buy drink for lek");
  assert.ok(state().soc.patronMiffed.lucky_tiger);
  assert.equal(state().soc.heat.lucky_tiger, 1);
  run("talk to patron");
  assert.match(lastOut(), /bad form/i);
  run("buy beer for patron");
  assert.ok(!state().soc.patronMiffed.lucky_tiger);
  assert.equal(state().soc.heat.lucky_tiger, 0);
});

test("buying your own beers raises the drunk counter", () => {
  state().room = "candy_bar";
  state().money = 200;
  run("buy beer");
  assert.equal(state().soc.drunk, 1);
  assert.equal(state().money, 120);
});

test("street kisses end badly — except for the katoey", () => {
  run("e", "kiss nok");
  assert.match(lastOut(), /THWACK|flip-flop/i);
  state().room = "beach_rd_c";
  state().money = 100;
  _startEnc("katoey");
  run("kiss her back");
  assert.equal(state().money, 100, "nothing stolen");
  assert.match(lastOut(), /lipstick/i);
});

// ── The clock, the body, the week ──────────────────────────────────────────

test("a resident who runs the clock to dawn away from home wakes rough, broke, phone dying", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "beach_rd_c";      // Beach Road → the promenade crash spot
  state().money = 900;
  state().battery = 80;
  state().nightTurn = 99;
  run("wait");
  assert.equal(state().day, 3);
  assert.equal(state().room, "beach_rd_c", "wakes where the night left him, not the hotel");
  assert.equal(state().money, 0, "pockets turned out");
  assert.ok(state().battery <= 15, "phone dying");
  assert.equal(state().nightTurn, 0);
  assert.match(lastOut(), /DAY 3/);
});

test("a resident who SLEEPs at his hotel wakes home with his money and a full charge", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "hotel_room";
  state().money = 900;
  state().battery = 40;
  run("sleep");
  assert.equal(state().day, 3);
  assert.equal(state().room, "hotel_room", "made it home");
  assert.equal(state().battery, 100, "charged overnight");
  assert.ok(state().money >= 500, "keeps his cash (less any rent)");
});

test("the crash spot follows the region you passed out in", () => {
  state().room = "ws_north";         // Walking Street → the arch
  state().nightTurn = 99;
  run("wait");
  assert.equal(state().room, "ws_gate");

  newGame(); state().lastSaleng = 99999;
  state().room = "water_buffalo";    // Darkside → stranded at the Sukhumvit crossing
  state().nightTurn = 99;
  run("wait");
  assert.equal(state().room, "sukhumvit_crossing");
});

test("broke and stranded at the Darkside: a piwin fronts the ride to town, but not deeper", () => {
  state().room = "sukhumvit_crossing";
  state().money = 0;
  state().rain = 0;
  // town-ward: the pity ride gets you back across the highway, free
  run("motosai to beach road");
  assert.equal(state().room, "beach_rd_c", "broke, you still get out of the Darkside");
  assert.equal(state().money, 0, "the ride was free");
  assert.match(lastOut(), /Pay next time|Mai pen rai/i);

  // but broke you can't cadge a free ride DEEPER into the dark
  newGame(); state().lastSaleng = 99999;
  state().room = "sukhumvit_crossing";
  state().money = 0;
  run("motosai to lake");
  assert.equal(state().room, "sukhumvit_crossing", "no free ride further out");
  assert.match(lastOut(), /no free rides/i);
});

test("dehydration collapses the night; pre-act-1 you wake rough on the beach, broke", () => {
  state().thirst = 99;
  state().money = 300;
  run("wait", "wait");
  assert.equal(state().day, 3);
  assert.equal(state().room, "jomtien_beach");
  assert.equal(state().money, 0, "a collapse empties the pockets too");
  assert.match(lastOut(), /mai pen rai|Dehydration/i);
});

test("blackout: the ninth bottle ends the night rough and broke, near where you dropped", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "candy_bar";       // Soi Buakhao → the market forecourt crash spot
  state().money = 2000;
  state().soc.drunk = 8;
  run("buy beer");
  assert.equal(state().day, 3);
  assert.equal(state().money, 0, "the film stops and so does the wallet");
  assert.equal(state().room, "buakhao_market");
  assert.ok(state().battery <= 15, "phone dying");
  assert.match(lastOut(), /film simply stops/i);
});

test("street food and water manage the meters", () => {
  state().room = "buakhao_market";
  state().money = 100;
  state().hunger = 80;
  state().thirst = 80;
  run("buy som tam", "buy water");
  assert.ok(state().hunger <= 30, `hunger ${state().hunger}`);
  assert.ok(state().thirst <= 50, `thirst ${state().thirst} (som tam is spicy)`);
  assert.equal(state().money, 40);
});

test("eating the moo ping fills you but spends the dog insurance", () => {
  state().itemLoc.moo_ping = "inventory";
  state().hunger = 60;
  run("eat moo ping");
  assert.equal(state().itemLoc.moo_ping, null);
  assert.ok(state().hunger <= 30);
});

// ── Barfine ────────────────────────────────────────────────────────────────

test("barfine needs a room, then favor — then ends the night grandly", () => {
  state().room = "jasmine_garden";
  state().money = 2000;
  run("barfine fon");
  assert.match(lastOut(), /Sort your night out first/i);
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  run("barfine fon");
  assert.match(lastOut(), /not a vending machine/i);
  state().soc.drinks.fon = 6; // clears both the gate and the she's-not-sold refusal band
  const h = state().happy;
  run("barfine fon");
  assert.ok(state().pendingBf, "the negotiation opens — the mamasan does the numbers");
  assert.match(lastOut(), /SHORT TIME .* LONG TIME/);
  run("long time");
  assert.equal(state().day, 3, "night over");
  assert.equal(state().room, "hotel_room");
  assert.ok(state().happy >= h + 9, `happy ${state().happy}`);
  assert.match(lastOut(), /nobody's business but the soi/i);
});

test("soi 6 barfine: upstairs, and the night carries on", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "pink_lotus";
  state().money = 1000;
  state().nightTurn = 40; // 22:00 — base rate
  state().soc.drinks.joy = 4;
  run("barfine joy");
  assert.ok(state().pendingBf);
  assert.match(lastOut(), /upfront as a menu/i, "Soi 6 girls quote it themselves");
  run("short time");
  assert.equal(state().room, "pink_lotus", "still on your stool");
  assert.equal(state().day, 2, "night continues");
  assert.equal(state().money, 300);
  assert.match(lastOut(), /Upstairs/i);
});

test("no barfining the mamasan, and heat freezes negotiations", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().money = 2000;
  state().room = "candy_bar";
  run("barfine candy");
  assert.match(lastOut(), /She IS the bar/i);
  state().room = "jasmine_garden";
  state().soc.drinks.fon = 5;
  state().soc.heat.jasmine_garden = 1;
  run("barfine fon");
  assert.match(lastOut(), /Not tonight, tilac/i);
  assert.equal(state().day, 2);
});

test("barfine pricing follows the clock: peak early, waived after midnight", () => {
  assert.equal(state().nightTurn, 0); // 18:00
  assert.equal(_barfinePrice("beer", "lek"), 600);   // ×1.5 early
  assert.equal(_barfinePrice("gogo", "gift"), 1500);
  state().nightTurn = 40;                            // 22:00 — base
  assert.equal(_barfinePrice("beer", "lek"), 400);
  state().nightTurn = 65;                            // past midnight
  assert.equal(_barfinePrice("beer", "lek"), 0, "book closed for the rank and file");
  assert.equal(_barfinePrice("beer", "fon"), 300, "popular girls stay on the book");
  assert.equal(_barfinePrice("gogo", "gift"), 750);
});

test("after midnight the beer-bar barfine is waived (favor still required)", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "lucky_tiger";
  state().money = 100;
  state().nightTurn = 65;
  state().soc.drinks.lek = 6;
  run("barfine lek");
  assert.ok(state().pendingBf);
  run("long time");
  assert.equal(state().money, 100, "no fee changed hands");
  assert.equal(state().day, 3, "and the night still ends grandly");
});

// ── The Darkside lock-in ────────────────────────────────────────────────────

test("lock-in: a spender at a lockIn bar gets the bolt, not the shutters", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "night_heron"; state().money = 5000;
  state().soc.drinks.dokmai = 3;      // freely spending on the ladies
  state().nightTurn = 59;
  const favBefore = _favor("dokmai");
  run("wait 2");                       // midnight arrives with you inside
  assert.ok(state().soc.lockIn && state().soc.lockIn.night_heron, "the door is bolted");
  assert.match(lastOut(), /bolt goes across|painted black/i);
  assert.match(lastOut(), /negotiable/i, "the party turns (PG-13 wink)");
  assert.ok(_favor("dokmai") >= favBefore + 3, "the room runs hot");
  // the describe re-announces it (restore-safe, like rain)
  out = [];
  run("look");
  assert.match(lastOut(), /bolted and the windows were always black/i);
  // leaving is one-way
  out = [];
  run("out");
  assert.equal(state().room, "khao_talo_strip");
  assert.match(lastOut(), /bolt goes back across behind you/i);
  assert.ok(!state().soc.lockIn.night_heron, "the party goes on without you");
  // and there is no getting back in
  out = [];
  run("go dark");
  assert.equal(state().room, "khao_talo_strip");
  assert.match(lastOut(), /Shutters down|definitely, legally, closed/i);
});

test("lock-in: window shoppers get the midnight shutters instead", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "night_heron"; state().money = 5000; // no spending at all
  state().nightTurn = 59;
  run("wait 2");
  assert.ok(!(state().soc.lockIn && state().soc.lockIn.night_heron));
  assert.equal(state().room, "khao_talo_strip", "walked out with practiced fondness");
  assert.match(lastOut(), /shutters start down/i);
  // an open-front bar closes at midnight regardless of spend
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "firefly_bar"; state().money = 5000;
  state().soc.drinks.duan = 5;
  state().nightTurn = 59;
  run("wait 2");
  assert.equal(state().room, "khao_talo_strip", "no lockIn flag, no lock-in");
});

test("midnight closing: gents clubs and Soi 6 shut, the town runs on", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  // gentleman's club: last-call warning at 23:30, then shuttered and walked out
  state().room = "orchid_club"; state().money = 5000; state().nightTurn = 54;
  out = []; run("wait");                 // → nightTurn 55, the 30-min warning
  assert.match(lastOut(), /Last call|half an hour|BARFINE/i, "the courtesy warning fires");
  out = []; run("wait", "wait", "wait", "wait", "wait", "wait"); // past midnight
  assert.equal(state().room, "naklua_rd", "shuttered and walked out to the street");
  assert.match(lastOut(), /gentleman's hours|draws its shutters/i);
  // and you can't get back in
  out = []; run("go w");
  assert.equal(state().room, "naklua_rd");
  assert.match(lastOut(), /dark and bolted|gentleman's hours/i);

  // Soi 6 go-go closes; the Queen Vic pub does not
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "pink_lotus"; state().nightTurn = 62;
  out = []; run("wait");
  assert.equal(state().room, "soi6_street", "Soi 6 bar shuttered at midnight");
  // the pub stays open past midnight
  state().room = "queen_vic"; state().nightTurn = 65;
  out = []; run("wait");
  assert.equal(state().room, "queen_vic", "the Queen Vic pub keeps its own hours");
});

test("midnight closing: walking in during last call gets the warning + barfine nudge", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "naklua_rd"; state().nightTurn = 57; // 23:42 — last half hour
  out = []; run("go w");                 // into the Orchid Club
  assert.equal(state().room, "orchid_club", "you get in — it's not midnight yet");
  assert.match(lastOut(), /Last call|half an hour|BARFINE/i, "warned on arrival");
});

test("The Regular: bond tiers derive from cumulative favor, and cool a notch a night", () => {
  const id = "lek";
  state().soc.drinks[id] = 0; assert.equal(_bondTier(id), 0);
  state().soc.drinks[id] = 3; assert.equal(_bondTier(id), 1);
  state().soc.drinks[id] = 7; assert.equal(_bondTier(id), 2);
  state().soc.drinks[id] = 13; assert.equal(_bondTier(id), 3);
  // a night's sleep cools every bond by one — tend it or lose it
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "hotel_room"; state().soc.drinks[id] = 10;
  run("sleep");
  assert.equal(state().soc.drinks[id], 9, "bonds cool a notch a night");
});

test("The Regular: depth beats breadth — a bonded conquest gives a bonus and doesn't jade you", () => {
  state().happy = 0; state().jaded = 0;
  state().soc.drinks.lek = 10;              // a regular (tier 2)
  _conquestHappy(6, "lek");
  assert.equal(state().happy, 8, "base + the bond bonus");
  assert.equal(state().jaded, 0, "a bonded night doesn't advance the treadmill");
  _conquestHappy(6, "ping");                // a stranger (drinks 0) jades you normally
  assert.equal(state().jaded, 1);
});

test("The Regular: at the top tier she comes off the clock — the barfine is waived", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000;
  const id = _npcsHere().find(n => NPC_ROLES[n] === "hostess");
  state().soc.drinks[id] = 14;              // her farang
  state().pendingBf = { id, st: 900, lt: 1350, room: "candy_bar" };
  _bfResolve("lt");
  assert.equal(state().money, 5000, "no fine — she squares it herself");
  assert.match(lastOut(), /squares it|off the clock|customer to her/i);
});

test("The Regular: a short-time deepens the bond; recognition greets a returning face", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "pink_lotus"; state().money = 5000;
  const id = _npcsHere().find(n => NPC_ROLES[n] === "hostess");
  const before = state().soc.drinks[id] || 0;
  state().pendingBf = { id, st: 700, lt: 1400, room: "pink_lotus" };
  _bfResolve("st");
  assert.equal((state().soc.drinks[id] || 0), before + 2, "a short-time bumps the bond");
  // the recognition line speaks by tier; a stranger gets nothing
  out = []; state().soc.drinks[id] = 8; _relGreeting(id);
  assert.ok(lastOut().length > 0, "a regular gets a recognition line");
  out = []; state().soc.drinks[id] = 0; _relGreeting(id);
  assert.equal(lastOut(), "", "a stranger gets no special greeting");
});

test("The Regular: bond-gated dialogue — hand-authored lines a regular unlocks", () => {
  // a bond: N entry is hidden below tier N and surfaces at/above it (Mercedes, fluent)
  state().soc.drinks.mercedes = 0;
  assert.ok(!_pickDialogue("mercedes", null).bond, "a stranger gets her plain greeting");
  state().soc.drinks.mercedes = 8;   // regular
  assert.equal(_pickDialogue("mercedes", null).bond, 2, "the regular line unlocks");
  state().soc.drinks.mercedes = 14;  // her farang
  assert.equal(_pickDialogue("mercedes", null).bond, 3, "the deepest line unlocks");
});

test("The Regular: filler girls get a generic Tinglish register when you're a regular", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "las_vegas";
  const filler = _npcsHere().find(n => NPC_ROLES[n] === "hostess" && NPCS[n].filler);
  state().soc.drinks[filler] = 10;   // regular
  out = []; run("talk to " + NPCS[filler].name);
  const said = lastOut();
  assert.ok(said.length > 0);
  // the register is her voice, not the authorial narration — a broken-English tell
  assert.match(said, /you no come|you eat already|not really customer|no price|make me liar|same same|off the clock/i);
});

test("The Regular: butterflying in front of your regular costs you her bond", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "las_vegas"; state().money = 5000;
  const here = _npcsHere().filter(n => NPC_ROLES[n] === "hostess");
  const [a, b] = here;
  state().soc.drinks[a] = 5; state().soc.drinks[b] = 10; // b is your regular, watching
  state().pendingBf = { id: a, st: 1000, lt: 1500, room: "las_vegas" };
  _bfResolve("st");
  assert.equal(state().soc.drinks[b], 7, "the regular you jilted cools three notches");
});

test("WHO / BLACKBOOK: the little black book, ranked by bond, across all three surfaces", () => {
  state().flags.act1Done = true; state().battery = 100;
  out = []; run("blackbook");                       // empty
  assert.match(lastOut(), /black book.?s empty|CONTACT a lady/i);
  state().phone.contacts.lek = true; state().soc.drinks.lek = 14;  // your girl
  state().phone.contacts.joy = true; state().soc.drinks.joy = 4;   // knows your face
  out = []; run("who");
  const said = lastOut();
  assert.match(said, /YOUR BLACK BOOK/i);
  assert.match(said, /Lek.*your girl/is);
  assert.ok(said.indexOf("Lek") < said.indexOf("Joy"), "ranked by bond, your-girl first");
  // autocomplete surface offers both spellings
  assert.ok(engineComplete("wh").includes("who"));
  assert.ok(engineComplete("blackb").includes("blackbook"));
});

test("bond-scaled texting: your farang texts more, and longs — never the mama-sick game", () => {
  state().phone.contacts.lek = true; state().soc.drinks.lek = 14; // her farang (tier 3)
  state().battery = 100;
  let sent = false, msg = "";
  for (let seed = 1; seed < 500 && !sent; seed++) {
    state().phone.inbox = []; state().phone.lastText = 0; state().turns = 100; state().rng = seed;
    _maybeIncomingText();
    if (state().phone.inbox.length) { sent = true; msg = state().phone.inbox[0].text; }
  }
  assert.ok(sent, "a farang-tier contact does reach out");
  assert.doesNotMatch(msg, /buffalo|medicine|phone of me break|lottery/i, "no scam-ask on her own farang");
  assert.match(msg, /come see me|miss you|my farang|dream about you|other bar/i, "she longs");
});

test("Darkside girls are veterans: no green tier past Sukhumvit", () => {
  for (const [id, n] of Object.entries(NPCS)) {
    if (!n.filler || NPC_ROLES[id] !== "hostess") continue;
    const room = n.room;
    if (ROOMS[room] && ROOMS[room].region === "Darkside") {
      assert.notEqual(_c4Depth(id), 2, `${id} should be a veteran out here`);
      assert.doesNotMatch(n.desc, /^(New enough|Baby-faced)/, `${id}'s desc reads older`);
    }
  }
  // and the Night Heron is fully staffed per the rule
  const staff = Object.keys(NPCS).filter(id => NPCS[id].room === "night_heron");
  assert.ok(staff.some(id => NPC_ROLES[id] === "mamasan"));
  assert.ok(staff.some(id => NPC_ROLES[id] === "cashier"));
  assert.ok(staff.filter(id => NPC_ROLES[id] === "hostess").length >= 2);
});

// ── Barfine: ST/LT negotiation, refusals, the games, and the recourse ──────

test("barfine prices: LT costs more, Soi 6 early LT is prohibitive, midnight flattens", () => {
  state().flags.act1Done = true;
  state().nightTurn = 10; // early — peak
  assert.deepEqual(_barfinePrices("beer", "lek"), { st: 600, lt: 1050 });
  assert.deepEqual(_barfinePrices("gogo", "lek"), { st: 1500, lt: 2250 });
  const s6 = _barfinePrices("soi6", "joy");
  assert.equal(s6.st, 1050);
  assert.ok(s6.lt > 2250, `Soi 6 early LT ฿${s6.lt} beats even a go-go fine`);
  state().nightTurn = 40; // mid-evening: base ST, LT still dearer
  assert.deepEqual(_barfinePrices("beer", "lek"), { st: 400, lt: 700 });
  state().nightTurn = 65; // after midnight: same either way
  const late = _barfinePrices("gogo", "lek");
  assert.equal(late.st, late.lt, "the collapse flattens ST and LT");
  assert.deepEqual(_barfinePrices("beer", "lek"), { st: 0, lt: 0 }, "beer waived, both ways");
  assert.equal(_barfinePrices("beer", "fon").st, _barfinePrices("beer", "fon").lt, "popular girls: flat too");
});

test("the negotiation gates input: reprompt, cancel, restore redraw, completion", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "jasmine_garden"; state().money = 3000;
  state().soc.drinks.fon = 6;
  run("barfine fon");
  assert.ok(state().pendingBf);
  assert.match(lastOut(), /says nothing at all about money/i, "the girl never quotes — the ledger does");
  assert.deepEqual(engineComplete("s"), ["short time"], "the gate owns autocomplete");
  out = [];
  run("go north"); // eaten — reprompted
  assert.equal(state().room, "jasmine_garden");
  assert.match(lastOut(), /SHORT TIME .* LONG TIME/);
  out = [];
  _renderResume(); // a reload mid-negotiation redraws the same prompt
  assert.match(lastOut(), /SHORT TIME .* LONG TIME/);
  run("no thanks");
  assert.equal(state().pendingBf, null);
  assert.match(lastOut(), /complete sentence/i);
});

test("short time: one round, off she goes, the night carries on", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 3000; state().nightTurn = 40;
  state().soc.drinks.bua = 6;
  run("barfine bua");
  const turns = state().turns;
  run("short time");
  assert.equal(state().money, 3000 - 400);
  assert.equal(state().day, 2, "the night carries on");
  assert.match(lastOut(), /gone within the hour|back to her stool/i);
  assert.ok(state().turns - turns >= 6, "the hour passed on the clock");
  assert.equal(state().soc.bfBar.candy_bar, "bua", "the floor saw you leave with her");
});

test("the open contract: an operator inflates it, an honest girl writes it fair", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000; state().nightTurn = 40;
  // bua is a hash-picked operator; favor 4 marks you as exploitable
  state().soc.drinks.bua = 4;
  state().pendingBf = { id: "bua", st: 400, lt: 700, room: "candy_bar" };
  state().rng = 13347; // scam roll says no game tonight — just the fat price
  _bfResolve("open");
  assert.match(lastOut(), /price moved while you weren't looking/i);
  assert.equal(state().money, 5000 - 900, "LT ×1.3, rounded to 50s");
  // honest girl (nan is no operator): open contract just becomes fair LT
  deserializeGame(serializeGame()); // fresh night state is fine; reuse world
  newGame(); state().flags.act1Done = true; state().flags.hasWallet = true;
  state().lastSaleng = 99999;
  state().room = "candy_bar"; state().money = 5000; state().nightTurn = 40;
  state().soc.drinks.nan = 4;
  state().pendingBf = { id: "nan", st: 400, lt: 700, room: "candy_bar" };
  _bfResolve("open");
  assert.match(lastOut(), /fair and square|most girls don't play/i);
  assert.equal(state().money, 5000 - 700, "plain LT, no surcharge");
});

test("the LT games: runner, mao, leaveAfter — prose, incident, reduced สนุก", () => {
  const kinds = [[2, "runner", /back on her stool|Beach Road/i],
    [5, "mao", /mao mak mak/i], [8, "leaveAfter", /I go back bar/i]];
  for (const [seed, kind, rx] of kinds) {
    newGame(); state().lastSaleng = 99999;
    state().flags.act1Done = true; state().flags.hasWallet = true;
    state().room = "candy_bar"; state().money = 5000; state().nightTurn = 40;
    state().soc.drinks.bua = 4;
    state().pendingBf = { id: "bua", st: 400, lt: 700, room: "candy_bar" };
    state().rng = seed;
    out = [];
    _bfResolve("lt");
    assert.match(lastOut(), rx, kind);
    assert.equal(state().bfIncident && state().bfIncident.kind, kind);
    assert.equal(state().day, 3, kind + " still ends the night");
    if (kind !== "leaveAfter") assert.match(lastOut(), /COMPLAIN at Candy Bar/i);
  }
});

test("the period reveal comes AFTER the fine — and the mama is right there", () => {
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000; state().nightTurn = 40;
  state().soc.drinks.bua = 4;
  state().pendingBf = { id: "bua", st: 400, lt: 700, room: "candy_bar" };
  state().rng = 1; // scam roll: period
  _bfResolve("lt");
  assert.match(lastOut(), /Lady time/i);
  assert.equal(state().day, 2, "the night does NOT end — she's back in the rotation");
  assert.equal(state().bfIncident.kind, "period");
  assert.equal(state().money, 5000 - 700, "the fine is already in the ledger");
  run("complain");
  assert.equal(state().money, 5000, "refunded on the spot");
  assert.equal(state().bfIncident, null);
  assert.match(lastOut(), /Not morality, tilac. Business/i);
});

test("the bar-hop: NO buys back your night; YES-YES drains the wallet into her friends' tills", () => {
  // refusing the detour → the night you paid for
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000;
  state().bfSeq = { id: "bua", kind: "barhop", fine: 700, spent: 0, room: "candy_bar" };
  state().pendingEnc = "bfhop";
  run("no, the night we agreed on");
  assert.equal(state().day, 3);
  assert.equal(state().bfIncident, null, "no grievance — she folded");
  // taking the tour, twice
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000;
  state().bfSeq = { id: "bua", kind: "barhop", fine: 700, spent: 0, room: "candy_bar" };
  state().pendingEnc = "bfhop";
  run("yes, one drink");
  assert.ok(state().pendingEnc === "bfhop", "the second bar is already proposed");
  run("yes ok");
  assert.ok(state().money < 5000 - 500, `two rounds of friend-rate drinks gone (฿${state().money})`);
  assert.equal(state().bfIncident.kind, "barhop");
  assert.equal(state().day, 3, "ends mao mak mak");
});

test("the Walking Street party: three girls, your bill, no deed done", () => {
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000;
  state().bfSeq = { id: "bua", kind: "wsparty", fine: 700, spent: 0, room: "candy_bar" };
  state().pendingEnc = "bfparty";
  run("yes, meet the friends");
  assert.ok(state().money <= 5000 - 600, "the bills arrive addressed to you");
  assert.match(lastOut(), /mao maaaak mak|deed remains undone/i);
  assert.equal(state().bfIncident.kind, "wsparty");
  assert.equal(state().day, 3);
});

test("refusals: customer-stealing, the honest lady-time, temple, and the recoverable cheap-charlie", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  // stealing: a girl already left this bar with you tonight
  state().room = "candy_bar"; state().money = 5000;
  state().soc.drinks.nan = 6;
  (state().soc.bfBar = {}).candy_bar = "bua";
  run("barfine nan");
  assert.equal(state().pendingBf, null, "no negotiation even opens");
  assert.match(lastOut(), /don't steal customer/i);
  assert.match(lastOut(), /ask EARLY/i, "the rail's advice rides along");
  out = [];
  run("barfine nan"); // held for the night
  assert.match(lastOut(), /answer hasn't changed/i);
  // the honest upfront lady-time (aom's life-hash, day 3) — BEFORE any money
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().day = 3; state().room = "club_mirage"; state().money = 5000;
  state().soc.drinks.aom = 6;
  run("barfine aom");
  assert.match(lastOut(), /Lady time, jing jing/i);
  assert.match(lastOut(), /BEFORE the fine is paid/i);
  assert.equal(state().money, 5000, "not a baht moved");
  // temple in the morning (bee, day 2)
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().day = 2; state().room = "candy_bar_2"; state().money = 5000;
  state().soc.drinks.bee = 6;
  run("barfine bee");
  assert.match(lastOut(), /go temple in morning/i);
  // cheap charlie is recoverable: warm her up and ask again
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar"; state().money = 5000; state().nightTurn = 40;
  state().soc.drinks.nan = 4; // in the not-sold band
  state().rng = 1; // refusal roll fires (r < 0.2), kind roll picks cheap (r < 0.5)
  run("barfine nan");
  assert.match(lastOut(), /CHEAP CHARLIE|buy me drink first/i);
  state().soc.drinks.nan = 6; // favor grew ≥2 — she reconsiders
  run("barfine nan");
  assert.ok(state().pendingBf, "the negotiation opens this time");
  run("no");
});

test("COMPLAIN: refund + intro, the leaveAfter shrug, and the second-strike apology", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().money = 1000;
  // noon (Jasmine Garden) ran a runner; Fon works there — the reliable intro
  state().bfIncident = { id: "noon", room: "jasmine_garden", kind: "runner", fine: 700, day: 2 };
  state().room = "candy_bar";
  run("complain");
  assert.match(lastOut(), /Take it back to Jasmine Garden/i);
  state().room = "jasmine_garden";
  run("complain");
  assert.equal(state().money, 1700, "the fine comes back");
  assert.match(lastOut(), /Business/i);
  assert.match(lastOut(), /Fon/, "the mamasan vouches a reliable girl over");
  assert.ok(state().soc.drinks.fon >= 2, "the intro carries real favor");
  // leaveAfter: you got what you paid for
  state().bfIncident = { id: "noon", room: "jasmine_garden", kind: "leaveAfter", fine: 700, day: 2 };
  run("complain");
  assert.equal(state().money, 1700, "no refund for that one");
  assert.match(lastOut(), /Where is problem/i);
  // second upheld strike: the apology scene, from her own purse
  state().bfIncident = { id: "noon", room: "jasmine_garden", kind: "mao", fine: 700, day: 3 };
  run("complain");
  assert.equal(state().money, 2400);
  assert.match(lastOut(), /OWN purse|stool is already empty/i);
  assert.equal(state().bfStrikes.noon, 2);
});

test("the indirect ask: “I go with you, na” — once, at warming favor, numbers left to mama", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "candy_bar";
  state().soc.drinks.nan = 4;
  state().rng = 1; // the 25% shyness roll passes
  out = [];
  _maybeGoWithYou("nan");
  assert.match(lastOut(), /I go with you, na/);
  assert.match(lastOut(), /BARFINE NAN/, "the tap hint rides the moment");
  assert.ok(state().soc.goWith.nan);
  out = [];
  _maybeGoWithYou("nan"); // once per girl per night
  assert.equal(out.length, 0);
});

test("the veterans warn about all of it at the rail", () => {
  for (const id of ["nigel", "randy"]) {
    const t = PATRONS[id].dialogue.find(d => d.topic === "barfine");
    assert.ok(t, id + " has the barfine sermon");
  }
  assert.match(PATRONS.nigel.dialogue.find(d => d.topic === "barfine").text,
    /BEFORE a single baht moves|ask EARLY/);
  assert.match(PATRONS.randy.dialogue.find(d => d.topic === "barfine").text,
    /mao mak mak|mama pays you back|every baht back/i);
});

test("a regular's girl may barfine herself — the YES path ends the night", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "jasmine_garden";
  state().soc.selfBf = true; // as _maybeSelfBarfine would have set
  state().selfBfId = "fon";
  state().pendingEnc = "selfbf";
  const h = state().happy;
  run("yes");
  assert.equal(state().day, 3);
  assert.ok(state().happy >= h + 12, `happy ${state().happy}`);
});

test("the lobby ATM pays ฿3000 once per vacation day", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().stage = "vacation";
  state().room = "hotel_room";
  state().money = 100;
  run("out");
  assert.equal(state().money, 3100);
  assert.match(lastOut(), /daily damage/i);
  run("n", "out"); // back in, back out — no double dip
  assert.equal(state().money, 3100);
});

test("every district's 7-Eleven presses the iconic cheese toastie", () => {
  state().room = "beach_rd_c";
  state().money = 100;
  state().hunger = 60;
  run("buy toastie");
  assert.equal(state().money, 65);
  assert.ok(state().hunger <= 25);
  assert.match(lastOut(), /cheese toastie/i);
});

// ── The boy in brown ───────────────────────────────────────────────────────

test("public drunkenness summons the boy in brown; manners halve the damage", () => {
  state().room = "beach_rd_n"; // no mama-treated bar adjacent
  state().money = 1000;
  state().pendingEnc = "police";
  run("wai and apologise, khrap");
  assert.equal(state().money, 700);
  state().pendingEnc = "police";
  run("pay the fine");
  assert.equal(state().money, 200);
  state().pendingEnc = "police";
  run("absolutely not");
  assert.equal(state().money, 0, "arguing doubles it");
});

test("a mamasan in line of sight can rescue you from the shakedown", () => {
  state().room = "buakhao_market"; // Candy Bar is adjacent
  state().money = 1000;
  state().soc.mamaTreat.candy_bar = true;
  state().rng = 3; // first _rand() < 0.7 → rescue fires
  state().pendingEnc = "police";
  run("um");
  assert.equal(state().money, 1000, "not a baht");
  assert.match(lastOut(), /walk STRAIGHT/i);
});

test("drunk street walking rolls the police encounter", () => {
  state().room = "beach_rd_s";
  state().soc.drunk = 6;
  state().turns = 100;
  state().lastPolice = 0;
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  for (let i = 0; i < 100 && state().pendingEnc !== "police"; i++) _maybeEncounter();
  assert.equal(state().pendingEnc, "police", "the whistle eventually blows");
});

// ── Killer pool league ─────────────────────────────────────────────────────

test("killer pool: league nights only, every third day", () => {
  state().room = "stinky_bar";
  state().money = 500;
  state().lastPeddler = 99999; // keep the watch salesman out of the frame
  state().day = 4; // not a league night
  run("play killer");
  assert.equal(state().game, null);
  assert.match(lastOut(), /every third night/i);
  state().day = 6;
  run("play killer");
  assert.ok(state().game && state().game.type === "kp");
  assert.equal(state().money, 400, "฿100 in the ashtray");
  assert.equal(state().game.stake, 500, "five players' pot");
  for (let i = 0; i < 40 && state().game; i++) run("shot");
  assert.equal(state().game, null, "the frame settles");
  assert.ok([400, 900].includes(state().money), `out or champion — ฿${state().money}`);
});

// ── Quests ─────────────────────────────────────────────────────────────────

test("quest flow: offer via giver, accept, deliver, reward; dependency gates", () => {
  state().room = "candy_bar";
  run("talk to candy");
  assert.equal(state().quests.sangsom, "offered");
  assert.match(lastOut(), /Sister-Bar Run/);
  run("accept sangsom");
  assert.equal(state().quests.sangsom, "active");
  assert.equal(state().itemLoc.sang_som, "inventory");
  run("quests");
  assert.match(lastOut(), /▶ The Sister-Bar Run/);
  // dependency: bee won't offer her quest until sangsom is done
  state().room = "candy_bar_2";
  run("talk to bee");
  assert.notEqual(state().quests.bee_number, "offered");
  const cash = state().money;
  run("give sang som to bee");
  assert.ok(state().flags.sangsomDelivered);
  run("wait"); // questTick sweeps
  assert.equal(state().quests.sangsom, "done");
  assert.equal(state().money, cash + 200, "reward paid");
  run("talk to bee");
  assert.equal(state().quests.bee_number, "offered", "dependency unlocked");
});

test("abandoning a quest returns it to the pool (and takes the prop back)", () => {
  state().room = "candy_bar";
  run("talk to candy", "accept sangsom", "abandon sangsom");
  assert.equal(state().quests.sangsom, "abandoned");
  assert.equal(state().itemLoc.sang_som, null);
  run("talk to candy");
  assert.equal(state().quests.sangsom, "offered", "re-offered");
});

// ── The phone ──────────────────────────────────────────────────────────────

test("contact: needs her bar and favor; then messaging builds favor", () => {
  state().room = "jasmine_garden";
  run("contact fon");
  assert.ok(!state().phone.contacts.fon);
  assert.match(lastOut(), /not yet/i);
  state().soc.drinks.fon = 2;
  run("contact fon");
  assert.ok(state().phone.contacts.fon);
  run("message fon");
  assert.equal(state().soc.drinks.fon, 3, "text charm counts");
  assert.equal(state().phone.inbox.length, 1);
  run("check messages");
  assert.ok(state().phone.inbox[0].read);
  run("message fon");
  assert.match(lastOut(), /case file/i, "one charm text per night");
});

test("banking app: SEND transfers, bumps favor, and completes Bee's quest", () => {
  state().flags.act1Done = true;
  state().quests = { sangsom: "done", bee_number: "active" };
  state().phone.contacts.bee = true;
  state().money = 500;
  run("send 100 to bee");
  assert.equal(state().money, 400);
  assert.ok(state().flags.beeBanked);
  run("wait");
  assert.equal(state().quests.bee_number, "done");
});

test("incoming texts arrive with a buzz; attached money credits on read", () => {
  state().phone.contacts.fon = true;
  state().phone.inbox.push({ from: "fon", text: "lucky day!!", turn: 1, read: false, gives: 50 });
  const cash = state().money;
  run("check messages");
  assert.equal(state().money, cash + 50);
});

test("a texted invite pays off when you show up that night", () => {
  state().phone.contacts.fon = true;
  state().phone.invite = { id: "fon", day: state().day };
  state().room = "buakhao_s";
  const h = state().happy;
  run("in"); // jasmine_garden, Fon's bar
  assert.equal(state().room, "jasmine_garden");
  assert.ok(state().happy >= h + 2);
  assert.equal(state().phone.invite, null);
  assert.equal(state().soc.drinks.fon, 1, "showing up counts");
});

// ── Freelancers, peddlers, the ping pong show ──────────────────────────────

test("freelancer: solo company (the safe kind) ends the night; broke get laughed off", () => {
  state().room = "promenade";
  _startEnc("freelancer");
  run("yes");
  assert.match(lastOut(), /Maybe tomorrow/i, "no room yet");
  assert.equal(state().day, 2);
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().money = 1200;
  state().rng = 1; // tiny first roll → the safe kind, ฿700
  delete state().encDone.freelancer;
  _startEnc("freelancer");
  run("yes");
  assert.equal(state().day, 3, "night over, grandly");
  assert.equal(state().money, 500); // cheaper than a bar now
});

test("freelancer: taking Ning too costs ฿1400 and pays extra happiness", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "promenade";
  state().money = 2000;
  state().rng = 1; // the safe kind
  const h = state().happy;
  _startEnc("freelancer");
  run("both of you");
  assert.ok(state().flags.hadThreesome);
  assert.equal(state().money, 600);
  assert.ok(state().happy >= h + 15, `threesome premium (${state().happy - h})`);
  assert.equal(state().day, 3);
});

test("freelancer: the risky kind robs you blind while you sleep", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "promenade";
  state().money = 2000;
  state().happy = 30;
  state().rng = 40000; // big first roll → the robber
  _startEnc("freelancer");
  run("yes");
  assert.equal(state().day, 3, "you still lost the night");
  assert.ok(state().money <= 500, `robbed of the rest (฿${state().money} left)`);
  assert.ok(state().happy < 30, "and it stings");
  assert.match(lastOut(), /emptied|gone/i);
});

test("Bangkok tourist: money insults her, manners are rewarded", () => {
  state().room = "ws_south";
  state().happy = 10; // above the floor so the −1 is visible
  const h0 = state().happy;
  _startEnc("bkktourist");
  run("how much"); // treat her like the trade
  assert.match(lastOut(), /NOT working/i);
  assert.ok(state().happy < h0, "the transactional read stings");
  // fresh encounter, played right
  delete state().encDone.bkktourist;
  const h1 = state().happy;
  _startEnc("bkktourist");
  run("hello, where you from");
  assert.match(lastOut(), /feel richer|weekend/i);
  assert.ok(state().happy > h1, "reading it right pays");
});

test("Japanese lady: read her right and it's a threesome; money is the wrong move", () => {
  state().room = "ws_south";
  _startEnc("jptourist");
  run("how much for you"); // amateur move
  assert.match(lastOut(), /filed under 'amateur'|You think I am working/i);
  assert.ok(!state().flags.jpDeal);
  // played smooth → she proposes, deal re-arms the encounter
  delete state().encDone.jptourist;
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().money = 2000;
  _startEnc("jptourist");
  run("buy her a drink and flirt");
  assert.ok(state().flags.jpDeal, "she proposed");
  assert.equal(state().pendingEnc, "jptourist", "next command is still the reaction");
  run("yes");
  assert.ok(state().flags.hadThreesome);
  assert.equal(state().money, 1000, "you covered the dancer's ฿1000 barfine");
  assert.equal(state().day, 3, "night ends grandly");
  assert.ok(!state().flags.jpDeal, "deal flag cleared");
});

test("British lesbian: hands-on is a scene, good vibes make her a wingman", () => {
  state().room = "ws_south";
  state().happy = 10;
  _startEnc("britles");
  run("grope her");
  assert.match(lastOut(), /do you mind|OI/i);
  assert.ok(state().happy < 10, "confrontation stings");
  assert.ok(state().wingmanUntil <= state().turns, "no wingman for that");
  // played decent → wingman buff, which bumps favor
  delete state().encDone.britles;
  _startEnc("britles");
  run("cheers, let me buy you a drink");
  assert.ok(state().wingmanUntil > state().turns, "she's vouching for you now");
  state().room = "neon_paradise"; // Noi, zero drinks bought
  assert.equal(_favor("noi"), 2, "the wing-woman's word is worth +2 favor");
});

test("punter's wife: grope her and the husband educates you; be decent for a wingman", () => {
  state().room = "ws_south";
  state().money = 1000;
  state().hurt = 0;
  state().happy = 12;
  _startEnc("punterwife");
  run("grope the wife");
  assert.match(lastOut(), /Not in my town|educational/i);
  assert.equal(state().money, 700, "the lesson costs ฿300");
  assert.ok(state().hurt >= 1, "and a rib");
  assert.ok(state().happy < 12);
  // decent → wingman
  delete state().encDone.punterwife;
  _startEnc("punterwife");
  run("hello, nice to meet you");
  assert.ok(state().wingmanUntil > state().turns);
});

test("peddler works the Beach Road bar stools; buying the watch is a choice", () => {
  state().room = "stinky_bar";
  state().money = 500;
  state().turns = 100;
  state().lastPeddler = 0;
  for (let i = 0; i < 200 && state().pendingEnc !== "peddler"; i++) run("wait");
  assert.equal(state().pendingEnc, "peddler");
  run("the watch");
  assert.equal(state().itemLoc.fake_rolex, "inventory");
  assert.equal(state().money, 200);
});

test("the ping pong show is exactly the scam everyone says it is", () => {
  state().room = "ws_south";
  state().money = 1500;
  const h = state().happy;
  _startEnc("pingpong");
  run("yes, see the show");
  assert.ok(state().flags.sawPingPong);
  assert.equal(state().money, 500, "฿600 in, ฿400 gouged");
  assert.ok(state().happy <= h, "nobody leaves happier");
});

// ── Quiz night ─────────────────────────────────────────────────────────────

test("quiz schedule: Thursdays only, three deterministic bars, 20:00-22:00", () => {
  state().day = 4; // Thursday (day 1 = Monday)
  const bars = _quizBars();
  assert.equal(bars.length, 3);
  assert.equal(new Set(bars).size, 3, "three distinct bars");
  for (const b of bars) assert.ok(QUIZ_BARS.includes(b));
  assert.deepEqual(_quizBars(), bars, "same three all night — pure hash, no dice");
  state().nightTurn = 25;
  assert.ok(_isQuizWindow());
  state().nightTurn = 45; // 22:30 — over
  assert.ok(!_isQuizWindow());
  state().day = 5; // Friday
  state().nightTurn = 25;
  assert.ok(!_isQuizWindow());
});

test("walking into a quiz bar mid-window forces the quiz; answers score prizes", () => {
  state().day = 4;
  state().nightTurn = 25;
  const bar = _quizBars()[0];
  const outside = ROOMS[bar].exits.out;
  state().room = outside;
  const dir = Object.entries(ROOMS[outside].exits).find(([, to]) => to === bar)[0];
  run(dir);
  assert.ok(state().game && state().game.type === "quiz", "contestant, like it or not");
  assert.match(lastOut(), /Question 1 of 5/);
  const cash = state().money;
  // answer all five correctly by reading the answer key
  for (let i = 0; i < 5 && state().game; i++) {
    run(String(QUIZ_POOL[state().game.qs[state().game.at]].a + 1));
  }
  assert.equal(state().game, null);
  assert.equal(state().money, cash + 500, "perfect round pays ฿500");
  assert.ok(state().flags.quizChamp);
});

test("quiz: QUIT slinks out to the street; one quiz per bar per night", () => {
  state().day = 4;
  state().nightTurn = 25;
  const bar = _quizBars()[0];
  const outside = ROOMS[bar].exits.out;
  state().room = outside;
  const dir = Object.entries(ROOMS[outside].exits).find(([, to]) => to === bar)[0];
  run(dir, "quit");
  assert.equal(state().room, outside, "walked yourself out");
  run(dir);
  assert.equal(state().game, null, "the host doesn't re-draft quitters");
  assert.equal(state().room, bar, "but the bar still serves you");
});

test("off-window visits to quiz bars are just visits", () => {
  state().day = 4;
  state().nightTurn = 10; // 19:00, an hour early
  const bar = _quizBars()[0];
  const outside = ROOMS[bar].exits.out;
  state().room = outside;
  const dir = Object.entries(ROOMS[outside].exits).find(([, to]) => to === bar)[0];
  run(dir);
  assert.equal(state().game, null);
});

// ── The week and the stages ────────────────────────────────────────────────

test("sleep ends the night on your terms; day seven ends the vacation", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "hotel_room";
  run("sleep");
  assert.equal(state().day, 3);
  state().day = 7;
  state().room = "hotel_room";
  state().happy = 60;
  state().tonicOwed = 4500; // fleeced this trip, never reported
  run("sleep");
  assert.equal(state().pendingChoice, "vacation_end");
  run("look"); // everything is gated on the answer
  assert.match(lastOut(), /airline needs an answer/i);
  run("new vacation");
  assert.equal(state().vacation, 2);
  assert.equal(state().day, 1);
  assert.equal(state().happy, 0, "each trip chases its own happiness");
  assert.equal(state().bestHappy, 60);
  assert.equal(state().money, 3000);
  assert.ok(state().flags.act1Done, "no lead-in adventure on later trips");
  assert.equal(state().tonicOwed, 0, "a month away forfeits the tonic-shop claim");
});

test("MOVE TO PATTAYA: expat mode, endless days, savings wired over", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().day = 7;
  state().room = "hotel_room";
  state().money = 1000;
  run("sleep", "move to pattaya");
  assert.equal(state().stage, "expat");
  assert.equal(state().money, 21000);
  assert.match(lastOut(), /EXPAT MODE/);
  run("sleep");
  assert.equal(state().day, 9, "no seven-day wall anymore");
  assert.equal(state().pendingChoice, null);
});

// ── Endings ────────────────────────────────────────────────────────────────

test("no wallet, no room: the clerk holds the line", () => {
  state().room = "hotel_soi";
  state().battery = 50;
  run("light on", "n");
  assert.equal(state().room, "hotel_soi", "bounced at reception");
  assert.ok(!state().flags.act1Done);
  assert.match(lastOut(), /no card, no room/i);
});

test("act one complete: scored, converted to happiness, night continues", () => {
  state().room = "hotel_soi";
  state().battery = 50;
  state().flags.hasWallet = true;
  state().money = 300;
  run("light on", "n");
  assert.equal(state().room, "hotel_room");
  assert.ok(state().flags.act1Done);
  assert.ok(!state().over, "the sandbox never ends");
  assert.ok(state().happy > 0, "score became happiness");
  assert.match(lastOut(), /ACT ONE COMPLETE/);
  assert.match(lastOut(), /THE VACATION IS YOURS/);
  run("out", "look");           // and you can just… keep playing
  assert.equal(state().room, "hotel_soi");
});

test("hitting 100 สนุก is celebrated, not terminal", () => {
  state().room = "candy_bar";
  state().money = 500;
  state().happy = 99;
  run("ring bell");
  assert.ok(state().happy >= 100);
  assert.ok(state().flags.sabaiSabai);
  assert.match(lastOut(), /สบายสบาย/);
  run("look");
  assert.match(lastOut(), /Candy Bar/);
});

test("the meter happy-penalty names its cause, so it can't read as a double-charge", () => {
  const G = state();
  G.happy = 20; G.hunger = 88; G.thirst = 40; G.nightTurn = 9; // next tick lands on 10
  out = [];
  _tick();
  assert.match(lastOut(), /-1 สนุก — you're starving/, "hunger-driven dock is labelled");
  // thirst-dominant gets the parched label instead
  G.happy = 20; G.hunger = 40; G.thirst = 88; G.nightTurn = 9;
  out = [];
  _tick();
  assert.match(lastOut(), /-1 สนุก — you're parched/);
  // a plain dock (no reason) stays bare — the label is opt-in
  out = [];
  _addHappy(-1);
  assert.match(lastOut(), /\(-1 สนุก\)/);
});

// ── The full playthrough ───────────────────────────────────────────────────

test("scripted happy-ending playthrough", () => {
  // keep the route deterministic — the street encounters are tested above
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  run(
    // Act 1 — Jomtien: three bottles, one receipt, one bus
    "take bottle",
    "e", "take bottle", "read receipt",
    "light on", "w", "n", "take bottle", "e", "light off",
    "sell bottles",
    "n", "ride bus to beach road", "pay 15",
    // Act 2 — the gossip chain (Second Road now sits between Beach Rd and Buakhao)
    "e", "e", "n", "in", "talk to candy",            // Candy: Mot did it
    "out", "n", "e", "talk to lek",                  // Lek: Oy has it (in=Rock Factory now, e=Lucky Tiger)
    "out", "s", "in", "ask candy about wallet",      // Candy: som tam errand
    "out", "s", "w", "w", "talk to bank",            // Bank: helmet favour
    // LK Metro
    "e", "e", "e", "e", "e", "in",                   // Starlight Bar
    "give helmet to pim", "ask pim about oy",        // pin part: lucky 9
    "out", "w", "in", "ask nong about oy",           // pin part: number 71
    "out", "e",
    "light on", "e", "e", "light off",               // dark corner → Rainbow Girls
    "give som tam to ploy",                          // door trick
    "ask dj about sabai sabai",                      // security sings
    "go office", "enter ๗๑๙",                        // the safe
    // Home — one growl-turn in the dark corner is survivable; save the battery
    "out", "out", "w", "w", "w", "w",
    "motosai to naklua",
    "n", "light on", "n",
  );
  const s = state();
  assert.ok(!s.over, "the night never ends now");
  assert.ok(s.flags.act1Done, "act one completed");
  assert.ok(s.flags.hasWallet, "wallet recovered");
  assert.match(lastOut(), /ACT ONE COMPLETE/);
  assert.match(lastOut(), /THE VACATION IS YOURS/);
  assert.ok(s.battery > 0, `battery survived (${s.battery}%)`);
  assert.ok(s.money > 400, `money left ฿${s.money}`);
  assert.ok(s.score >= 80, `act-one score ${s.score}`);
  assert.ok(s.happy >= 20, `happiness head start (${s.happy})`);
  // sandbox: still fully playable afterwards
  doCommand("out");
  doCommand("score");
  assert.match(lastOut(), /สนุก happiness/);
});

// ── Save / load round-trip ─────────────────────────────────────────────────

test("serialize/deserialize round-trips state", () => {
  run("take bottle", "e");
  const snap = serializeGame();
  run("w");
  deserializeGame(snap);
  assert.equal(state().room, "jomtien_beach_rd");
  assert.equal(state().itemLoc.bottle1, "inventory");
});

// ── The Zork ledger ────────────────────────────────────────────────────────
// Verbs a text adventure must answer, even when the answer is no.

test("drink: beer at the bar, water where it's sold, humidity elsewhere", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  state().room = "candy_bar";
  state().money = 500;
  run("drink beer");
  assert.equal(state().soc.drunk, 1);
  assert.equal(state().money, 500 - BEER_PRICE);
  run("drink water");
  assert.equal(state().money, 500 - BEER_PRICE - 20);
  state().room = "jomtien_beach";
  run("drink");
  assert.match(lastOut(), /humidity/);
});

test("diagnose reports the damage in canon voice", () => {
  state().soc.drunk = 4;
  state().hunger = 75;
  state().hurt = 1;
  state().lastPolice = state().turns; // drunk on the sand shouldn't summon the boys in brown mid-test
  run("diagnose");
  assert.match(lastOut(), /4 bottles deep/);
  assert.match(lastOut(), /banged up \(1\/3/);
  assert.match(lastOut(), /envy the soi dogs/);
  assert.match(lastOut(), /สนุก/);
});

test("again/g repeats the last command", () => {
  run("wait");
  assert.match(lastOut(), /Pattaya doesn't/);
  out = [];
  run("g");
  assert.match(lastOut(), /Pattaya doesn't/);
  out = [];
  run("again");
  assert.match(lastOut(), /Pattaya doesn't/);
});

test("violence is answered by the street, not the parser — and moves no state", () => {
  state().room = "candy_bar";
  run("hit security");
  assert.match(lastOut(), /Security/);
  assert.ok(!state().soc.heat.candy_bar, "flavor only — no heat");
  state().room = "buakhao_s";
  run("attack tout");
  assert.match(lastOut(), /street polices itself/);
});

test("easter eggs: the hollow voice made it to Pattaya", () => {
  run("xyzzy");
  assert.match(lastOut(), /hollow voice/i);
  assert.match(lastOut(), /สบายสบาย/);
  run("hello sailor");
  assert.match(lastOut(), /Sattahip/);
  run("pray");
  assert.match(lastOut(), /strawberry Fanta/);
});

test("smell and listen know what district they're in", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  run("smell"); // Jomtien beach
  assert.match(lastOut(), /grilled squid/);
  const ws = Object.keys(ROOMS).find(id =>
    ROOMS[id].region === "Walking Street" && !ROOMS[id].barType);
  state().room = ws;
  run("listen");
  assert.match(lastOut(), /some hero is buying a bar a round/);
  state().room = "candy_bar";
  run("smell", "listen");
  assert.match(lastOut(), /Every bar in town, one smell/);
  assert.match(lastOut(), /HELLO WELCOME/);
});

test("swimming: lovely sober, refused drunk — the Flying Club has a swimming division", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  run("swim"); // game starts on the sand
  assert.match(lastOut(), /bathwater with ambitions/);
  state().soc.drunk = 5;
  state().lastPolice = state().turns;
  out = [];
  run("swim");
  assert.match(lastOut(), /Flying Club/);
  state().room = "buakhao_s";
  run("swim");
  assert.match(lastOut(), /hotel pool you are not a guest of/);
});

test("dance and sing read the room", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  state().lastPeddler = 99999; // Tequila Queen is a Beach Road bar — no salesmen mid-test
  state().room = "tequila_queen";
  run("dance");
  assert.match(lastOut(), /surgeons watching a man remove his own appendix/);
  // day 2 = Tuesday: _isBandNight() is false, candy_bar uses normal paths
  state().room = "candy_bar";
  run("dance", "sing");
  assert.match(lastOut(), /floor show/);
  assert.match(lastOut(), /never once mattered/);
});

test("_isBandNight: Fri (day 5) and Sat (day 6) are band nights", () => {
  state().day = 5;
  assert.equal(state().day % 7, 5);
  assert.ok(_isBandNight.call(null) === false || (() => { G.day = 5; return _isBandNight(); })());
  // test via engine helper directly
  G.day = 5; assert.ok(_isBandNight());
  G.day = 6; assert.ok(_isBandNight());
  G.day = 2; assert.ok(!_isBandNight()); // Tuesday
  G.day = 4; assert.ok(!_isBandNight()); // Thursday (quiz night, not band night)
  G.day = 5; // restore for subsequent tests in this block
});

test("Rock Factory has a band every night; lucky_tiger only on Fri/Sat", () => {
  G.day = 2; // Tuesday
  state().room = "rock_factory";
  assert.ok(_bandHere(), "Rock Factory: band every night");
  state().room = "lucky_tiger";
  assert.ok(!_bandHere(), "Lucky Tiger: no band Tuesday");
  G.day = 5; // Friday
  state().room = "lucky_tiger";
  assert.ok(_bandHere(), "Lucky Tiger: band on Friday");
  G.day = 6; // Saturday
  state().room = "lucky_tiger";
  assert.ok(_bandHere(), "Lucky Tiger: band on Saturday");
});

test("LISTEN describes the band when one is playing", () => {
  G.day = 6; // Saturday
  state().room = "rock_factory";
  run("listen");
  assert.match(lastOut(), /band|guitarist|drummer|bassist|vocalist/);
});

test("DANCE and SING get +2 happy with live band in bar", () => {
  G.day = 5; // Friday
  state().room = "lucky_tiger";
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  const h0 = state().happy;
  run("dance");
  assert.match(lastOut(), /lock in harder|materialises/);
  assert.ok(state().happy >= h0 + 2, "dance with band: +2 happy");
  const h1 = state().happy;
  run("sing");
  assert.match(lastOut(), /commit completely|adjusts.*professionally|stops being yours/);
  assert.ok(state().happy >= h1 + 2, "sing with band: +2 happy");
});

test("TIP BAND: ≥฿100 gives happy; smaller tip just costs money", () => {
  G.day = 6; // Saturday
  state().room = "lucky_tiger";
  state().money = 500;
  const h0 = state().happy;
  run("tip band 100");
  assert.match(lastOut(), /tip box/);
  assert.equal(state().money, 400);
  assert.ok(state().happy > h0, "big band tip: +happy");
  run("tip band 50");
  assert.equal(state().money, 350, "small tip: still costs money");
});

test("TIP BAND: fails if no band tonight", () => {
  G.day = 2; // Tuesday
  state().room = "lucky_tiger";
  run("tip band 100");
  assert.match(lastOut(), /No band playing/);
});

test("BUY ROUND FOR BAND: costs BAND_ROUND, applies bell effect", () => {
  G.day = 5; // Friday — lucky_tiger has liveMusic
  state().room = "lucky_tiger";
  state().money = 1000;
  const h0 = state().happy;
  run("buy round for band");
  assert.equal(state().money, 1000 - BAND_ROUND, "BAND_ROUND deducted");
  assert.ok(state().soc.bellAt.lucky_tiger !== undefined, "bellAt set");
  assert.equal(state().soc.bells.lucky_tiger, 1, "bell ledger incremented");
  assert.equal(state().soc.heat.lucky_tiger, 0, "heat cleared");
  assert.ok(state().happy >= h0 + 2, "+2 happy");
  assert.match(lastOut(), /girls approve.*bell/i, "girls note the bell is still there");
});

test("BUY ROUND FOR BAND: fails on non-band night / not in bar", () => {
  G.day = 2; // Tuesday
  state().room = "lucky_tiger";
  run("buy round for band");
  assert.match(lastOut(), /No band playing/);
  G.day = 5;
  state().room = "buakhao_n"; // street, not a bar
  run("buy round for band");
  assert.match(lastOut(), /inside the bar/);
});

test("REQUEST routes to band on band night, not dj", () => {
  G.day = 5; // Friday
  state().room = "lucky_tiger";
  run("request hotel california");
  assert.match(lastOut(), /Hotel California/);
  run("request wonderwall");
  assert.match(lastOut(), /Wonderwall|Every night/);
  // unknown song
  run("request despacito 2");
  assert.match(lastOut(), /not in the current set|Hotel California/);
  // no band
  G.day = 2;
  state().room = "lucky_tiger";
  run("request hotel california");
  assert.match(lastOut(), /No DJ or band/);
});

test("TALK TO BAND works when band is playing", () => {
  G.day = 5;
  state().room = "lucky_tiger";
  run("talk to band");
  assert.match(lastOut(), /vocalist|guitarist|drummer|bassist/);
  G.day = 2; // no band
  state().room = "lucky_tiger";
  run("talk to band");
  assert.match(lastOut(), /Nobody by that name/);
});

// ── QoL verbs: time, waiting, tipping, haggling, the bar-mat map ───────────

test("time reads the clock and the night's pricing", () => {
  run("time");
  assert.match(lastOut(), /18:00/);
  assert.match(lastOut(), /barfines run ×1\.5/);
  state().nightTurn = 65;
  out = [];
  run("time");
  assert.match(lastOut(), /quietly dropped the barfine/);
});

test("wait until midnight fast-forwards the clock", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  state().room = "buakhao_s";
  state().hunger = 0;
  state().thirst = 0;
  run("wait until midnight");
  assert.equal(state().nightTurn, 60, "60 turns in = midnight");
  assert.match(lastOut(), /let the night idle past/);
  out = [];
  run("wait until 9pm");
  assert.match(lastOut(), /Time only runs one way/);
  run("wait until noon", "wait until 7am");
  assert.match(lastOut(), /Daylight is for sleeping/);
});

test("tip: ฿100+ buys favor, small notes buy goodwill only", () => {
  state().room = "candy_bar";
  state().money = 500;
  run("tip candy 100");
  assert.equal(state().soc.drinks.candy, 1);
  assert.equal(state().money, 400);
  run("tip candy 20");
  assert.equal(state().soc.drinks.candy, 1, "small tip: no favor bump");
  assert.match(lastOut(), /runs on lady drinks/);
  state().room = "buakhao_s"; // motosai stand
  run("tip");
  assert.match(lastOut(), /don't open accounts/);
});

test("saleng: food cart — buy for self and buy for lady, cart lingers", () => {
  state().room = "candy_bar"; // Soi Buakhao region, hostess Candy is here
  state().money = 300;
  parkSaleng("food");
  const h0 = state().happy;
  run("buy moo ping");
  assert.equal(state().money, 260, "moo ping ฿40");
  assert.ok(state().happy >= h0 + 1, "+happy for eating");
  assert.match(lastOut(), /moo ping|charcoal/);
  assert.equal(state().salengCart, "food", "the cart is still parked after a buy");
  // buy for lady — same parked cart, no re-setup
  out = [];
  state().money = 200;
  const drinks0 = state().soc.drinks.candy || 0;
  run("buy noodles for candy");
  assert.equal(state().money, 160, "noodles ฿40");
  assert.ok((state().soc.drinks.candy || 0) > drinks0, "favor bump");
  assert.match(lastOut(), /Candy|bowl|mum/);
});

test("saleng: shoes — buy heels for lady", () => {
  state().room = "jasmine_garden";
  state().money = 500;
  parkSaleng("shoes");
  const drinks0 = state().soc.drinks.fon || 0;
  run("buy heels for fon");
  assert.equal(state().money, 250, "heels ฿250");
  assert.ok((state().soc.drinks.fon || 0) > drinks0, "favor bump");
  assert.match(lastOut(), /heel|Fon|bar/i);
});

test("saleng: lingerie — buy for lady", () => {
  state().room = "candy_bar";
  state().money = 300;
  parkSaleng("lingerie");
  const drinks0 = state().soc.drinks.candy || 0;
  run("buy lingerie for candy");
  assert.equal(state().money, 150, "lingerie ฿150");
  assert.ok((state().soc.drinks.candy || 0) > drinks0, "favor bump");
  assert.match(lastOut(), /lingerie|Victoria|Candy/i);
});

test("saleng: buying sandals for self adds to inventory", () => {
  state().room = "candy_bar";
  parkSaleng("shoes");
  state().money = 500;
  run("buy sandals");
  assert.equal(state().itemLoc.saleng_sandals, "inventory", "sandals in inventory");
  assert.match(lastOut(), /GIVE SANDALS/i);
});

test("saleng: buying sandals twice refunds second", () => {
  state().room = "candy_bar";
  state().money = 500;
  state().itemLoc.saleng_sandals = "inventory";
  parkSaleng("shoes");
  const money0 = state().money;
  run("buy sandals");
  assert.equal(state().money, money0, "refunded");
  assert.match(lastOut(), /already have/i);
});

test("saleng: buying lingerie for self adds to inventory", () => {
  state().room = "candy_bar";
  parkSaleng("lingerie");
  state().money = 500;
  run("buy lingerie");
  assert.equal(state().itemLoc.saleng_lingerie, "inventory", "lingerie in inventory");
  assert.match(lastOut(), /GIVE LINGERIE/i);
});

test("saleng is for the girls: an unrelated bar action doesn't dismiss it", () => {
  state().room = "candy_bar";
  state().money = 500;
  parkSaleng("food");
  run("ring bell"); // a bar action; the cart isn't a modal, so it's untouched
  assert.equal(state().salengCart, "food", "the cart stays parked while you do other things");
  // and it can still be bought from afterwards
  const m0 = state().money;
  out = [];
  run("buy moo ping");
  assert.equal(state().money, m0 - 40, "the parked cart still sells");
  assert.equal(state().salengCart, "food", "and it STILL lingers — buying doesn't send it off");
});

test("saleng moves on only when its timer runs out", () => {
  state().room = "candy_bar";
  parkSaleng("food", 2); // parked for 2 more ticks
  run("look"); // tick 1 — still here
  assert.equal(state().salengCart, "food", "still parked");
  out = [];
  run("look"); // tick 2 — timer up, it departs
  assert.equal(state().salengCart, null, "the cart has moved on");
  assert.match(lastOut(), /putters on|moves on|packs up/i, "with a farewell line");
});

test("saleng first-ever vs later: full pitch, then a low-key notice", () => {
  state().room = "candy_bar";
  state().salengSeen = {};
  out = [];
  _salengAnnounce("food", true);
  const first = lastOut();
  assert.match(first, /ซาเล้ง/, "first-ever gets the full pitch");
  assert.match(first, /let the girls enjoy it/, "and invites the player in");
  out = [];
  _salengAnnounce("food", false);
  const later = lastOut();
  assert.doesNotMatch(later, /let the girls enjoy it/, "later arrivals are terser");
  assert.match(later, /BUY MOO PING/, "but still show how to buy");
});

test("saleng vignette: the girls play with the lingerie cart (customer-facing)", () => {
  state().room = "candy_bar"; // Candy (mamasan) present
  parkSaleng("lingerie");
  out = [];
  _salengVignette();
  assert.ok(lastOut().length, "a scene prints when a girl is present");
  assert.doesNotMatch(lastOut(), /\{g\}/, "no unfilled placeholder");
});

test("GIVE sandals to hostess: removes from inventory, adds favor, win prose", () => {
  state().room = "lucky_tiger"; // lek is in lucky_tiger
  state().itemLoc.saleng_sandals = "inventory";
  const favorBefore = state().soc.drinks.lek || 0;
  run("give sandals to lek");
  assert.equal(state().itemLoc.saleng_sandals, null, "sandals removed from inventory");
  assert.equal(state().soc.drinks.lek, favorBefore + 1, "favor increased");
  assert.match(lastOut(), /sandal|shoe|fit/i);
});

test("GIVE heels to mamasan: removes from inventory, adds favor, mamasan prose", () => {
  state().room = "candy_bar"; // candy (mamasan) is in candy_bar
  state().itemLoc.saleng_heels = "inventory";
  const favorBefore = state().soc.drinks.candy || 0;
  run("give heels to candy");
  assert.equal(state().itemLoc.saleng_heels, null, "heels removed from inventory");
  assert.equal(state().soc.drinks.candy, favorBefore + 1, "favor increased");
  assert.match(lastOut(), /heel|shoe|fit|approval|strap/i);
});

test("GIVE lingerie to hostess: removes from inventory, adds favor", () => {
  state().room = "lucky_tiger"; // lek is in lucky_tiger
  state().itemLoc.saleng_lingerie = "inventory";
  const favorBefore = state().soc.drinks.lek || 0;
  run("give lingerie to lek");
  assert.equal(state().itemLoc.saleng_lingerie, null, "lingerie removed from inventory");
  assert.equal(state().soc.drinks.lek, favorBefore + 1, "favor increased");
  assert.match(lastOut(), /bag|lace|surprise/i);
});

test("haggling the peddler works exactly once", () => {
  state().lastPeddler = 99999; // exactly one peddler: the one we summon
  state().room = "stinky_bar";
  state().money = 500;
  state().pendingEnc = "peddler";
  run("haggle");
  assert.match(lastOut(), /For you, special/);
  assert.equal(state().pendingEnc, "peddler", "still at your elbow");
  run("haggle");
  assert.match(lastOut(), /floor has been reached/);
  run("buy watch");
  assert.equal(state().money, 300, "haggled: ฿200, not ฿300");
  assert.equal(state().itemLoc.fake_rolex, "inventory");
  assert.ok(!state().flags.peddlerDeal, "deal doesn't linger for the next peddler");
});

test("wave hails the bus; map draws the town", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  run("e", "n"); // jomtien bus stop
  assert.ok(ROOMS[state().room].busStop);
  run("wave");
  assert.match(lastOut(), /Stops from here/);
  out = [];
  run("map");
  assert.match(lastOut(), /BUAKHAO/);
  assert.match(lastOut(), /DARKSIDE/);
});

test("photo costs battery; call teaches you to text", () => {
  state().room = "candy_bar";
  const b = state().battery;
  run("photo");
  assert.equal(state().battery, b - 1);
  assert.match(lastOut(), /peace signs at maximum deployment/);
  run("call candy");
  assert.match(lastOut(), /nobody in this town answers a phone/);
});

test("withdraw knows every stage of your financial decline", () => {
  run("withdraw");
  assert.match(lastOut(), /wallet is the whole problem/);
  state().stage = "vacation";
  state().flags.act1Done = true; // else _checkAct1 fires at the hotel and pays the safe stash too
  state().room = "hotel_room";
  state().atmDay = 0;
  state().day = 2;
  const m = state().money;
  run("atm");
  assert.equal(state().money, m + SAFE_CASH);
  out = [];
  run("withdraw");
  assert.match(lastOut(), /seven days instead of seven years/);
});

// ── Rainy season ───────────────────────────────────────────────────────────

test("a downpour traps you: streets blocked, shelter allowed, transit refused", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  state().room = "buakhao_s";
  state().rain = 20;
  const exits = Object.entries(ROOMS.buakhao_s.exits);
  const [streetDir] = exits.find(([, to]) => !_sheltered(to));
  const [barDir, barId] = exits.find(([, to]) => ROOMS[to].barType);
  run(streetDir);
  assert.equal(state().room, "buakhao_s", "street move blocked");
  assert.match(lastOut(), /awning above you is the entire habitable world/);
  run(barDir);
  assert.equal(state().room, barId, "diving into a bar is allowed");
  assert.match(lastOut(), /shedding water like a soi dog/);
  const [outDir] = Object.entries(ROOMS[barId].exits).find(([, to]) => !_sheltered(to));
  run(outDir);
  assert.equal(state().room, barId, "nobody leaves the bar in this");
  assert.match(lastOut(), /that's what the rain is FOR/);
  state().room = "beach_rd_s"; // busStop + motosai
  run("ride bus to jomtien");
  assert.match(lastOut(), /can't tell a fare from a lamppost/);
  run("motosai to jomtien");
  assert.match(lastOut(), /Not for any money, boss/);
});

test("soi dogs won't bite during the downpour", () => {
  state().room = "ws_alley"; // dark
  state().rain = 10;
  run("z", "z", "z");
  assert.equal(state().darkStreak, 0, "the dogs have gone to ground");
  assert.equal(state().hurt, 0);
  state().rain = 0;
  run("z", "z");
  // dry dark bites again — costing blood, or the noodles you hurled at the dog
  assert.ok(state().darkStreak > 0 || state().hurt > 0 ||
    state().itemLoc.noodles !== "inventory", "dry dark is dangerous again");
});

test("rain falls only out of a stormy bake, in 3–8 turn events", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  state().room = "second_rd_c";
  for (let i = 0; i < 120; i++) {
    state().hunger = 0; state().thirst = 0; state().nightTurn = 5;
    _tick();
  }
  assert.equal(state().rain, 0, "no bake, no rain — ever");
  globalThis.WX_NOW = { temp: 29, humid: 92, code: 95, hi: 30, rain: 90 };
  try {
    state().lastRain = -99;
    let n = 0;
    while (!state().rain && n++ < 1000) {
      state().hunger = 0; state().thirst = 0; state().nightTurn = 5;
      _tick();
    }
    assert.ok(state().rain >= 3 && state().rain <= 8, `event length ${state().rain} in 3–8`);
  } finally {
    delete globalThis.WX_NOW;
  }
});

test("the rain stops like a tap and the town resumes", () => {
  state().room = "candy_bar";
  state().rain = 1;
  run("z");
  assert.equal(state().rain, 0);
  assert.match(lastOut(), /like a tap/);
});

test("light rain is atmosphere only: vignettes, dialogue, zero mechanics", () => {
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  globalThis.WX_NOW = { temp: 30, humid: 88, code: 61, hi: 31, rain: 70 }; // rainy, NOT stormy
  try {
    // street vignette: the baht-bus rain guards (even-turn variant)
    state().room = "second_rd_c";
    state().turns = 100; // even parity
    _sayDrizzle();
    assert.match(lastOut(), /roll the canvas rain guards/);
    // bar vignette: the barstools come in (both variants mention them)
    state().room = "candy_bar";
    state().turns = 101;
    _sayDrizzle();
    assert.match(lastOut(), /barstools/i);
    // it fires from ticks on a rainy bake, and never trips the downpour trap
    out = [];
    state().room = "buakhao_s";
    state().lastDrizzle = -99;
    let n = 0;
    while (!/nit noi|rain guards|Umbrellas appear/.test(lastOut()) && n++ < 1000) {
      state().hunger = 0; state().thirst = 0; state().nightTurn = 5;
      _tick();
    }
    assert.ok(n < 1000, "a drizzle vignette aired");
    assert.equal(state().rain, 0, "code 61 never starts a downpour");
    run("n");
    assert.notEqual(state().room, "buakhao_s", "movement untouched — no mechanics");
    // the patron quotes the local scripture
    state().room = "candy_bar";
    out = [];
    n = 0;
    while (!/barfine weather/.test(lastOut()) && n++ < 200) run("talk to patron");
    assert.match(lastOut(), /Nobody goes home alone in the rain/);
  } finally {
    delete globalThis.WX_NOW;
  }
});

// ── The sports desk ────────────────────────────────────────────────────────

test("the bar's regular has a fixed allegiance, and a win buys the rail a round", () => {
  globalThis.FOOTY = { league: "World Cup", games: [
    { d: "2026-07-07", done: true, h: "Alpha", hs: 2, as: 0, a: "Beta" },
  ] };
  try {
    state().room = "lucky_tiger";
    const team = _barTeam();
    assert.ok(["Alpha", "Beta"].includes(team));
    assert.equal(_barTeam(), team, "allegiance never wavers");
    // arrange the fixture so the regular's team just won (same two teams,
    // so the hash — and his heart — are unmoved)
    globalThis.FOOTY.games[0] = team === "Alpha"
      ? { d: "2026-07-07", done: true, h: "Alpha", hs: 2, as: 0, a: "Beta" }
      : { d: "2026-07-07", done: true, h: "Beta", hs: 2, as: 0, a: "Alpha" };
    assert.equal(_barTeam(), team);
    const d0 = state().soc.drunk;
    let n = 0;
    while (!/INCANDESCENT/.test(lastOut()) && n++ < 400) run("talk to patron");
    assert.match(lastOut(), /INCANDESCENT/);
    assert.match(lastOut(), new RegExp(`${team} are proof`));
    assert.ok(state().soc.drunk > d0, "his round reached your end of the rail");
  } finally {
    delete globalThis.FOOTY;
  }
});

test("scores verb prints the table and outs the regular's team", () => {
  globalThis.FOOTY = { league: "World Cup", games: [
    { d: "2026-07-07", done: true, h: "Alpha", hs: 1, as: 3, a: "Beta" },
    { d: "2026-07-10", done: false, h: "Gamma", hs: 0, as: 0, a: "Delta" },
  ] };
  try {
    state().room = "candy_bar";
    run("scores");
    assert.match(lastOut(), /Alpha 1–3 Beta/);
    assert.match(lastOut(), /Gamma v Delta/);
    assert.match(lastOut(), /The regular here supports/);
  } finally {
    delete globalThis.FOOTY;
  }
});

test("lottery verb recites the draw when baked", () => {
  globalThis.LOTTO = { date: "2026-07-01", first: "751495", last2: "62", back3: ["304", "531"] };
  try {
    run("lottery");
    assert.match(lastOut(), /751495/);
    assert.match(lastOut(), /last two 62/);
    assert.match(lastOut(), /can fix that by tomorrow lunchtime/);
  } finally {
    delete globalThis.LOTTO;
  }
});

test("look at <thing> aliases to examine; bare look still describes the room", () => {
  run("e", "look at nok");
  assert.match(lastOut(), /vendor/i);
  out = [];
  run("look");
  assert.match(lastOut(), /Jomtien Beach Road/);
});

test("contacts lists the phonebook with bar and favor glow", () => {
  run("contacts");
  assert.match(lastOut(), /noodle shop in your home town/, "empty phonebook has a life");
  state().phone.contacts.candy = true;
  state().phone.contacts.fon = true;
  state().soc.drinks.candy = 6;
  state().day = 2; // even: Candy works the original Candy Bar tonight
  out = [];
  run("contacts");
  assert.match(lastOut(), /Candy — Candy Bar ❤/);
  assert.match(lastOut(), /Fon — Jasmine Garden Bar/);
  // the phonebook tracks her alternate-night schedule (_npcRoom, not NPCS.room)
  state().day = 3;
  out = [];
  run("contacts");
  assert.match(lastOut(), /Candy — Candy Bar 2 ❤/, "odd night lists tonight's bar");
  out = [];
  state().day = 2;
  run("contact"); // bare CONTACT falls through to the phonebook too
  assert.match(lastOut(), /Candy — Candy Bar/);
});

// ── Act One in the journal ─────────────────────────────────────────────────

test("the journal shows the founding adventure during act1, ticked as flags land", () => {
  run("quests");
  assert.match(lastOut(), /▶ The Last Baht Bus — find your wallet/);
  assert.match(lastOut(), /· Worked out where you were last night/);
  run("read receipt");
  out = [];
  run("quests");
  assert.match(lastOut(), /✓ Worked out where you were last night/);
  assert.match(lastOut(), /· WALLET RECOVERED/);
});

test("act one cannot be abandoned; finished, it shows as done", () => {
  run("abandon");
  assert.match(lastOut(), /This one you finish/);
  run("abandon wallet");
  assert.match(lastOut(), /This one you finish/);
  state().stage = "vacation";
  state().flags.act1Done = true;
  state().score = 80;
  out = [];
  run("quests");
  assert.match(lastOut(), /✓ The Last Baht Bus — Act One, scored 80/);
  assert.match(lastOut(), /givers are out there/);
});

// ── Autocomplete ───────────────────────────────────────────────────────────

test("engineComplete: verbs first, context after, spoilers never", () => {
  const verbs = engineComplete("ta");
  assert.ok(verbs.includes("take") && verbs.includes("talk to"), "verb prefixes");
  assert.ok(!engineComplete("xy").length, "easter eggs stay hidden");
  assert.ok(!engineComplete("").length, "empty input suggests nothing");
  // NPCs in the room
  state().room = "candy_bar";
  assert.deepEqual(engineComplete("talk to c"), ["candy"]);
  assert.ok(engineComplete("flirt ").includes("candy"));
  // exits of the current room, plus known fast-travel destinations
  const goCands = engineComplete("go ");
  const exits = Object.keys(ROOMS.candy_bar.exits);
  assert.ok(exits.every(d => goCands.includes(d)), "every exit is offered");
  assert.ok(goCands.every(c =>
    ROOMS.candy_bar.exits[c] || _travelDests().some(id =>
      (ROOMS[id].bar || ROOMS[id].name).toLowerCase() === c)),
  "and nothing beyond exits + places you know the way to");
  // inventory for drop; room items for take
  assert.ok(engineComplete("drop ").includes("noodles"));
  state().room = "jomtien_beach";
  assert.ok(engineComplete("take b").includes("bottle"));
});

test("engineComplete: quests, contacts, and live ask topics", () => {
  state().quests.sangsom = "offered";
  assert.ok(engineComplete("accept ").includes("sangsom"));
  state().quests.sangsom = "active";
  assert.ok(engineComplete("abandon ").includes("sangsom"));
  state().phone.contacts.fon = true;
  assert.deepEqual(engineComplete("message "), ["fon"]);
  // ask topics respect req flags: candy's wallet talk needs no flag, deeper cuts do
  state().room = "candy_bar";
  const before = engineComplete("ask candy ");
  state().flags.knowOyHasIt = true;
  const after = engineComplete("ask candy ");
  assert.ok(after.length >= before.length, "topics unlock with knowledge, never lock");
  // WATCH is a real mechanic (Blue Dog show, TV), not just an alias — it completes
  assert.ok(engineComplete("wat").includes("watch"));
  // a pending fare offers its own amount, so PAY is one tap on mobile
  state().pendingFare = { kind: "bus", price: 15, dest: "beach_rd_s" };
  assert.deepEqual(engineComplete("pay "), ["15"]);
  state().pendingFare = null;
  assert.deepEqual(engineComplete("pay "), [], "nothing owed, nothing offered");
});

// ── Apologize ──────────────────────────────────────────────────────────────

test("apologize: mollifies the patron, burns heat once per bar, then it's words", () => {
  state().room = "candy_bar";
  state().soc.patronMiffed.candy_bar = true;
  state().soc.heat.candy_bar = 2;
  run("apologize");
  assert.ok(!state().soc.patronMiffed.candy_bar, "patron mollified");
  assert.equal(state().soc.heat.candy_bar, 1);
  run("say sorry");
  assert.equal(state().soc.heat.candy_bar, 0, "one point of heat forgiven");
  state().soc.heat.candy_bar = 2;
  run("apologize");
  assert.equal(state().soc.heat.candy_bar, 2, "tonight's apology is spent");
  assert.match(lastOut(), /Words are ฿0/);
  out = [];
  state().soc.heat.candy_bar = 0;
  state().soc.apologized = {};
  run("apologize");
  assert.match(lastOut(), /banks the credit/);
  state().room = "buakhao_s";
  run("sorry");
  assert.match(lastOut(), /forgives by default/);
});

test("flashlight in a go-go draws the no-photo warning; girls tease elsewhere", () => {
  // walk into a go-go with the torch burning — the house assumes a camera
  state().room = "lk_main";
  state().battery = 50;
  state().lightOn = true;
  state().pendingEnc = null;
  run("in"); // → KINKY
  assert.equal(state().room, "kinky");
  assert.match(lastOut(), /No photo. No video/i, "go-go photo warning");

  // switching it on inside a go-go triggers the same house rule
  run("light off"); // stands security down and resets the count
  out = [];
  run("light on");
  assert.match(lastOut(), /No photo. No video/i, "toggle inside go-go");
  run("light off");

  // in a beer bar the hostess teases instead
  out = [];
  _rand = () => 0; // pin the tease variant
  state().room = "buakhao_n";
  state().lightOn = true;
  run("e"); // → Lucky Tiger (Lek, hostess)
  assert.match(lastOut(), /Lek/, "the hostess is the one who notices");
  assert.doesNotMatch(lastOut(), /No photo/, "no camera panic in a beer bar");

  // LOOK alone doesn't re-trigger the notice — only entering or toggling
  out = [];
  state().room = "lucky_tiger";
  state().lightOn = true;
  run("look");
  assert.doesNotMatch(lastOut(), /beam|spotlight|torch/i, "LOOK alone stays quiet");
});

test("go-go flashlight escalation: two warnings, then security walks you out", () => {
  state().room = "lk_main";
  state().battery = 50;
  state().lightOn = true;
  state().pendingEnc = null;
  run("in"); // → KINKY, warning 1 on entry
  assert.equal(state().room, "kinky");
  assert.match(lastOut(), /No photo. No video/, "warning 1");
  out = [];
  run("look"); // light still burning → warning 2 via the tick
  assert.match(lastOut(), /OFF. Now/, "warning 2");
  out = [];
  run("look"); // still burning → ejected, complex-wide
  assert.match(lastOut(), /walked out/, "security ends it");
  assert.match(lastOut(), /famous in every bar in LK Metro/, "complex ban");
  assert.notEqual(state().room, "kinky");
  assert.ok(state().soc.banned.kinky !== undefined, "banned from the bar");

  // compliance after the warning resets the count — no ejection
  out = [];
  state().room = "tequila_queen";
  state().soc.banned = {};
  state().lightWarn = { room: null, n: 0, mark: false };
  state().lightOn = false;      // ejection leaves the torch burning
  state().lastPeddler = 99999;  // Beach Road bar — keep the peddler out of the transcript
  run("light on");
  assert.match(lastOut(), /No photo/, "warned again in a fresh go-go");
  run("light off");
  assert.match(lastOut(), /refold into the corner/, "stand-down text");
  assert.equal(state().lightWarn.n, 0);
  out = [];
  run("look", "look");
  assert.doesNotMatch(lastOut(), /walked out/, "no ejection after compliance");
  assert.equal(state().room, "tequila_queen");
});

test("Blue Dog: checkpoint show 18:00-19:00, sunset, one happy point a night", () => {
  state().room = "beach_rd_n";
  state().pendingEnc = null;
  state().lastPeddler = 99999;
  run("w"); // into Blue Dog at 18:00
  assert.equal(state().room, "blue_dog");
  assert.match(lastOut(), /evening checkpoint is in session/, "the show is on");

  out = [];
  _rand = () => 0; // pin the vignette
  const happy0 = state().happy;
  run("watch police");
  assert.match(lastOut(), /escorted toward the station/, "a shakedown vignette");
  assert.equal(state().happy, happy0 + 1, "first watch of the night pays");
  out = [];
  run("watch sunset");
  assert.match(lastOut(), /gold, then rose/, "the bay does its thing");
  assert.equal(state().happy, happy0 + 1, "the nightly point is spent");

  // after 19:00 the checkpoint folds; the bay stays open
  state().nightTurn = 30; // 21:00
  out = [];
  run("watch police");
  assert.match(lastOut(), /packed up at seven/, "show's over");
  out = [];
  run("watch sunset");
  assert.match(lastOut(), /squid-boat/, "post-sunset bay");
  out = [];
  run("look");
  assert.doesNotMatch(lastOut(), /checkpoint is in session/, "no show in the room desc");
});

test("patrons: hoppers drift by the hour, settle at home by 22:00, chat resets daily", () => {
  // deterministic placement: same night + hour = same stool
  state().nightTurn = 5; // 18:00 hour
  const early = _patronRoom("nigel");
  assert.equal(_patronRoom("nigel"), early, "no drift between looks");
  assert.ok(ROOMS[early].barType, "hopper is in a bar");
  // non-hopper never moves
  assert.equal(_patronRoom("helmut"), "silk_rose");
  assert.equal(_patronRoom("somsak"), "blue_dog");
  // by 22:00 everyone is at their home bar
  state().nightTurn = 45;
  assert.equal(_patronRoom("nigel"), "lucky_tiger");
  assert.equal(_patronRoom("chuck"), "tequila_queen");
  assert.equal(_patronRoom("dave"), "stinky_bar");

  // room description shows the rail; talk and topics work
  state().room = "silk_rose";
  state().pendingEnc = null; state().lastSaleng = 99999; state().lastPeddler = 99999;
  out = [];
  run("look");
  assert.match(lastOut(), /Helmut \(61, German\)/, "patron on the rail");
  out = [];
  run("talk to helmut");
  assert.match(lastOut(), /quality of life/i, "fallback line");
  out = [];
  run("ask helmut about stool");
  assert.match(lastOut(), /evaluated all nine/, "topic line");
  out = [];
  run("ask helmut about stool");
  assert.match(lastOut(), /No update required/, "terse on same-day repeat");
  assert.doesNotMatch(lastOut(), /fan number two/, "the full spiel is not repeated");
  // a new day resets the book — the stories are new again
  state().day++;
  out = [];
  run("ask helmut about stool");
  assert.match(lastOut(), /fan number two/, "full spiel again next day");
  // examine works too
  out = [];
  run("x helmut");
  assert.match(lastOut(), /third stool from the left/);
});

test("David only drinks on his days off: Mondays and Fridays", () => {
  state().nightTurn = 45;
  state().pendingEnc = null; state().lastPeddler = 99999;
  state().day = 1; // Monday
  assert.equal(_patronRoom("david"), "stinky_bar", "Monday is a beer day");
  state().day = 5; // Friday
  assert.equal(_patronRoom("david"), "stinky_bar", "Friday is a beer day");
  state().day = 2; // Tuesday — school night
  assert.equal(_patronRoom("david"), null, "Tuesday he's marking homework");
  state().room = "stinky_bar";
  out = [];
  run("talk to david");
  assert.match(lastOut(), /David isn't at this bar right now/, "he's a known regular, just not out — say so, don't deny he exists");
});

// NPCs keep a fixed bar today, but will gain schedules (Candy alternating her two
// bars, invited visits). The "elsewhere" answer already generalises: a KNOWN NPC
// addressed from the wrong bar is placed, not denied — while an unmet NPC and the
// anonymous staff stay a plain deny (no spoiling a location never shown).
test("addressing a known NPC who works elsewhere points you to her bar", () => {
  state().day = 2; // even night → Candy is at Candy Bar
  state().room = "silk_rose"; // Candy is not here
  out = [];
  run("talk to candy");
  assert.match(lastOut(), /Nobody by that name/, "unmet: a plain deny, no location leaked");
  state().known.candy = true; // now you've met her
  out = [];
  run("talk to candy");
  assert.match(lastOut(), /Candy isn't at this bar tonight — try Candy Bar\b/, "met: placed at tonight's bar");
  // anonymous staff are nobody, not 'elsewhere'
  out = [];
  run("talk to security");
  assert.match(lastOut(), /Nobody by that name/);
});

test("Candy alternates nights between her two bars", () => {
  state().known.candy = true;
  // even nights at Candy Bar, odd nights at Candy Bar 2
  state().day = 2; assert.equal(_npcRoom("candy"), "candy_bar");
  state().day = 3; assert.equal(_npcRoom("candy"), "candy_bar_2");
  state().day = 4; assert.equal(_npcRoom("candy"), "candy_bar");

  // present only at tonight's bar; the other bar notes where she is
  state().day = 3; // Candy Bar 2 night
  state().room = "candy_bar";
  assert.ok(!_npcsHere().includes("candy"), "not at the original bar tonight");
  out = []; _describeRoom(true);
  assert.match(lastOut(), /Candy is working Candy Bar 2 tonight/, "the empty bar says where she is");
  out = []; run("talk to candy");
  assert.match(lastOut(), /try Candy Bar 2/, "and asking points to tonight's bar");

  state().room = "candy_bar_2";
  assert.ok(_npcsHere().includes("candy"), "she IS at Candy Bar 2 tonight");
  out = []; run("talk to candy");
  assert.doesNotMatch(lastOut(), /isn't at this bar/, "so talking reaches her, not the elsewhere line");
});

test("ask <who> <topic> works without the 'about' connective (the tapped shape)", () => {
  // The autocomplete/wheel builds "ask <target> <topic>" a word at a time, with
  // no "about" between — that must reach the same dialogue as the typed form.
  state().nightTurn = 0; state().day = 1;
  const room = Object.keys(ROOMS).find(r => {
    state().room = r; return _patronsHere().includes("chuck");
  });
  assert.ok(room, "found a bar where Chuck is drinking");
  state().room = room;
  const say = cmd => { // fresh seen-state so repeat-terseness doesn't skew it
    state().patronTalk = { day: state().day, talked: {} };
    out = []; run(cmd); return lastOut();
  };
  const noAbout = say("ask chuck money");
  const withAbout = say("ask chuck about money");
  assert.equal(noAbout, withAbout, "with and without 'about' reach the same reply");
  assert.doesNotMatch(noAbout, /Nobody by that name/, "not a dead end");
});

test("the Phil triangle: read the phone, then tell him or warn her — not both ways", () => {
  state().pendingEnc = null; state().lastSaleng = 99999; state().lastPeddler = 99999;
  // the confrontation is gated on having seen the screenshots
  state().room = "buakhao_market";
  run("ask nit about somchai");
  assert.ok(!state().flags.warnedNit, "no warning before the phone");
  state().room = "stinky_bar";
  out = [];
  run("ask phil about phone");
  assert.ok(state().flags.readPhilPhone, "the screenshots land");
  assert.match(lastOut(), /สมชาย/, "the thread is in Thai");
  // branch: warn Nit first
  state().room = "buakhao_market";
  out = [];
  run("ask nit about somchai");
  assert.ok(state().flags.warnedNit, "she knows you know");
  assert.match(lastOut(), /my husband/i, "no denial");
  // telling Phil still possible afterwards; it lands once and stays landed
  state().room = "stinky_bar";
  out = [];
  run("ask phil about truth");
  assert.ok(state().flags.toldPhilTruth);
  assert.match(lastOut(), /Twelve years/);
  out = [];
  run("talk to phil");
  assert.match(lastOut(), /two fingers/, "post-truth Phil");
  // and Bert acknowledges the hard thing
  out = [];
  run("ask bert about phil");
  assert.match(lastOut(), /hard thing/);
  // Nit's post-truth state line replaces the confrontation forever
  state().room = "buakhao_market";
  out = [];
  run("talk to nit");
  assert.match(lastOut(), /choosing cotton/, "she goes back to what she knows");
});

test("Danny never hops into his creditors' bars — the debts are drawn on the map", () => {
  for (let day = 1; day <= 21; day++) {
    state().day = day;
    for (let h = 0; h < 4; h++) {
      state().nightTurn = h * 10;
      const room = _patronRoom("danny");
      assert.notEqual(room, "stinky_bar",
        `day ${day} hour ${h}: Danny walked into Bert's bar`);
      assert.notEqual(room, "las_vegas",
        `day ${day} hour ${h}: Danny walked into Reginald's living room`);
    }
  }
});

test("CHECKOUT: swap hotels at the start of an evening; the old key stops working", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().stage = "vacation";
  state().room = "hotel_room";
  state().nightTurn = 3;
  state().money = 20000; // fund the tour so rent never downgrades us mid-test
  state().pendingEnc = null; state().lastSaleng = 99999; state().lastPeddler = 99999;

  // act 1 gating: a fresh game can't check out
  const g = state();
  out = [];
  run("checkout");
  assert.match(lastOut(), /SABAI|QUEEN VIC|METROPOLE/i, "the desk lists options");
  assert.doesNotMatch(lastOut(), /· SABAI PALMS/, "the current hotel is not on the list");
  assert.match(lastOut(), /QUEEN VIC/, "Queen Vic offered");
  assert.match(lastOut(), /METROPOLE/, "Metropole offered");
  run("queen vic");
  assert.equal(state().hotel, "queenvic");
  assert.equal(state().room, "qv_room", "moved straight into the balcony room");

  // the old room refuses the ex-guest
  state().room = "hotel_soi";
  out = [];
  run("n");
  assert.notEqual(state().room, "hotel_room");
  assert.match(lastOut(), /different hotel/, "412 is somebody else's now");

  // sleep works at the new place and you wake there
  state().room = "qv_room";
  const day0 = state().day;
  run("sleep");
  assert.equal(state().day, day0 + 1);
  assert.equal(state().room, "qv_room", "woke at the Queen Vic");

  // from the Queen Vic, the list offers Sabai Palms and Metropole
  state().nightTurn = 3;
  out = [];
  run("checkout");
  assert.match(lastOut(), /SABAI PALMS/);
  assert.match(lastOut(), /METROPOLE/);
  run("metropole");
  assert.equal(state().room, "metropole_room");

  // late checkout is refused; STAY cancels cleanly
  state().nightTurn = 30;
  out = [];
  run("checkout");
  assert.match(lastOut(), /Tomorrow, na/);
  state().nightTurn = 3;
  run("checkout", "stay");
  assert.equal(state().hotel, "metropole");
  assert.equal(state().pendingChoice, null);

  // act1 guard on a fresh game
  newGame();
  state().lastSaleng = 99999;
  out = [];
  run("checkout");
  assert.match(lastOut(), /the wallet is the whole adventure/);
});

test("hotel economics: rent, the downgrade ladder, the book, and the grace note", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().stage = "vacation";
  state().pendingEnc = null; state().lastSaleng = 99999; state().lastPeddler = 99999;

  // a funded Metropole guest pays ฿1300 at wake
  state().hotel = "metropole";
  state().room = "metropole_room";
  state().money = 5000;
  run("sleep");
  assert.equal(state().money, 3700, "the folio slides under the door");
  assert.equal(state().hotel, "metropole");

  // ฿500 in pocket: can't make the Metropole, can make the Sabai — the ladder
  state().money = 500;
  state().room = "metropole_room";
  run("sleep");
  assert.equal(state().hotel, "sabai", "stepped down toward the Sabai Palms");
  assert.equal(state().room, "hotel_room");
  assert.equal(state().money, 100, "and paid the ฿400 there");

  // flat broke at the Sabai: the book opens, capped, with a happiness pinch
  state().money = 0;
  state().happy = 10; // off the floor so the pinch is measurable
  const h0 = state().happy;
  run("sleep");
  assert.equal(state().hotelDebt, 400, "on the book");
  assert.equal(state().happy, h0 - 1, "the clerk's kindness weighs");
  state().hotelDebt = 1900;
  run("sleep");
  assert.equal(state().hotelDebt, 2000, "the book caps — no spiral");

  // the town catches you: Bert settles a heavy book, once
  state().room = "beach_rd_n";
  out = [];
  run("in"); // → Stinky Bar
  assert.match(lastOut(), /squared/i, "Bert handles it");
  assert.equal(state().hotelDebt, 0);
  assert.ok(state().flags.tabSettled);
  state().hotelDebt = 900;
  out = [];
  run("out", "in");
  assert.equal(state().hotelDebt, 900, "grace is once per game");

  // flush again: the book settles itself at the desk
  state().hotelDebt = 600;
  state().money = 5000;
  state().room = "hotel_room";
  run("sleep");
  assert.equal(state().hotelDebt, 0, "debt cleared on the way past the desk");
  assert.equal(state().money, 5000 - 600 - 400);

  // the Sabai quiet perk: hangover wakes one size smaller
  state().day = 2; // rewind the calendar — the week must not end mid-test
  state().money = 5000;
  state().soc.drunk = 3;
  state().room = "hotel_room";
  run("sleep");
  assert.equal(state().thirst, 40 + 2 * 6, "one size off the morning after");

  // Queen Vic balcony: WATCH SOI pays once a night
  state().hotel = "queenvic";
  state().room = "qv_room";
  state().blueDogDay = 0;
  const h1 = state().happy;
  out = [];
  run("watch soi");
  assert.match(lastOut(), /Terry raises his beer/);
  assert.equal(state().happy, h1 + 1);
  run("watch soi");
  assert.equal(state().happy, h1 + 1, "the nightly point is spent");

  // Metropole safe: the robbery stays cheap
  state().day = 2;
  state().hotel = "metropole";
  state().room = "promenade";
  state().money = 8000;
  state().itemLoc.fake_rolex = "inventory";
  state().rng = 40000; // the robber
  delete state().encDone.freelancer;
  _startEnc("freelancer");
  run("yes");
  assert.ok(state().money >= 8000 - 700 - 1000 - 1300, `pocket money only (฿${state().money})`);
  assert.equal(state().itemLoc.fake_rolex, "inventory", "the safe held the Rolex");
});

test("the transcript collects Thai runs for the trainer bridge, capped and deduped", () => {
  run("look");
  _say("ซาเล้ง rolls past. สวัสดี!");
  _say("ซาเล้ง again");
  assert.ok(state().thaiSeen.includes("ซาเล้ง"));
  assert.ok(state().thaiSeen.includes("สวัสดี"));
  assert.equal(state().thaiSeen.filter(t => t === "ซาเล้ง").length, 1, "deduped");
  for (let i = 0; i < 70; i++) _say("คำ" + "ๆ".repeat(i % 3) + i);
  assert.ok(state().thaiSeen.length <= 60, "capped");
});
