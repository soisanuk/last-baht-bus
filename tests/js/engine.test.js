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
    state().room = "candy_bar"; state().rng = seed;
    run("play jackpot");
    started = !!(state().game && state().game.pending);
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
  assert.match(lastOut(), /still waiting/i);
  assert.notEqual(state().room, "pratumnak_rd");
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

test("an entry without a short still repeats in full", () => {
  state().room = "rainbow_girls"; // Ploy's default counting line has no `short`
  run("talk to ploy");
  out = [];
  run("talk to ploy");
  assert.match(lastOut(), /Cage is for money and me/); // unchanged
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

test("saleng restore: the cart pitch and BUY options redraw on load", () => {
  state().room = "candy_bar"; // a Beach Road go-go: saleng-eligible
  state().lastSaleng = 0;
  state().turns = 100;
  // roll the saleng in (its own trigger lives in the tick; find a seed that fires)
  let fired = false;
  for (let seed = 1; seed <= 400 && !fired; seed++) {
    newGame();
    state().room = "candy_bar"; state().lastSaleng = 0; state().turns = 100; state().rng = seed;
    out = [];
    run("look"); // a tick that can spawn the cart
    fired = state().pendingEnc === "saleng";
  }
  assert.ok(fired, "found a seed that parks a saleng");
  assert.ok(Array.isArray(state().encPrompt) && state().encPrompt.length);
  out = [];
  _renderEncounter();
  assert.match(lastOut(), /ซาเล้ง/, "the saleng pitch reappears");
  assert.match(lastOut(), /BUY .*(NO\.)/s, "the BUY options reappear");
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

  // 5. an unpaid fare
  G.pendingFare = { kind: "bus", price: 15, dest: "naklua_rd" };
  assert.match(draw(), /driver is still waiting/, "fare reminder");
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
  state().pendingEnc = "saleng";
  state().salengCart = "food";
  assert.deepEqual(_salengItems(), ["moo ping", "noodles"]);
  const buy = engineComplete("buy ");
  assert.ok(buy.includes("moo ping") && buy.includes("noodles"), "cart items listed for 'buy '");
  state().room = "neon_paradise"; // Noi, a hostess, present
  assert.ok(engineComplete("buy moo ping for ").includes("noi"), "a present lady is offered as the gift target");
  state().pendingEnc = null; // no cart: buy falls back to the bar/shop list
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
  state().room = "neon_paradise"; // Noi, a hostess
  // cold: she won't hand over a cover
  run("throw cover");
  assert.match(lastOut(), /Buy drink first|No favor bought/i);
  // warm her up, then all three aliases reach the game. Reset room+heat each
  // time so a prior throw landing on the mamasan (heat → kickout, which moves
  // you to the street) can't make a later alias look unrouted.
  state().soc.drinks.noi = 3;
  for (const cmd of ["throw cover", "throw nipple cover", "throw pastie"]) {
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
  state().room = "midnight_sun"; // only Aek the cashier, no braless dancer
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

test("the night ends at 04:00 and a new day dawns at the hotel", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "beach_rd_c";
  state().nightTurn = 99;
  run("wait");
  assert.equal(state().day, 3);
  assert.equal(state().room, "hotel_room");
  assert.equal(state().nightTurn, 0);
  assert.match(lastOut(), /DAY 3/);
});

test("dehydration collapses the night; pre-act-1 you wake on the beach again", () => {
  state().thirst = 99;
  run("wait", "wait");
  assert.equal(state().day, 3);
  assert.equal(state().room, "jomtien_beach");
  assert.match(lastOut(), /mai pen rai|Dehydration/i);
});

test("blackout: the ninth bottle ends the night expensively", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "candy_bar";
  state().money = 2000;
  state().soc.drunk = 8;
  run("buy beer");
  assert.equal(state().day, 3);
  assert.equal(state().money, 2000 - 80 - 300);
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
  state().soc.drinks.fon = 4;
  const h = state().happy;
  run("barfine fon");
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
  state().soc.drinks.joy = 2;
  run("barfine joy");
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
  state().soc.drinks.lek = 4;
  run("barfine lek");
  assert.equal(state().money, 100, "no fee changed hands");
  assert.equal(state().day, 3, "and the night still ends grandly");
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

test("saleng: food cart — buy for self and buy for lady", () => {
  state().room = "candy_bar"; // Soi Buakhao region, hostess Candy is here
  state().money = 300;
  state().pendingEnc = "saleng";
  state().salengCart = "food";
  const h0 = state().happy;
  run("buy moo ping");
  assert.equal(state().money, 260, "moo ping ฿40");
  assert.ok(state().happy >= h0 + 1, "+happy for eating");
  assert.match(lastOut(), /moo ping|charcoal/);
  // buy for lady
  out = [];
  state().pendingEnc = "saleng"; state().salengCart = "food";
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
  state().pendingEnc = "saleng";
  state().salengCart = "shoes";
  const drinks0 = state().soc.drinks.fon || 0;
  run("buy heels for fon");
  assert.equal(state().money, 250, "heels ฿250");
  assert.ok((state().soc.drinks.fon || 0) > drinks0, "favor bump");
  assert.match(lastOut(), /heel|Fon|bar/i);
});

test("saleng: lingerie — buy for lady", () => {
  state().room = "candy_bar";
  state().money = 300;
  state().pendingEnc = "saleng";
  state().salengCart = "lingerie";
  const drinks0 = state().soc.drinks.candy || 0;
  run("buy lingerie for candy");
  assert.equal(state().money, 150, "lingerie ฿150");
  assert.ok((state().soc.drinks.candy || 0) > drinks0, "favor bump");
  assert.match(lastOut(), /lingerie|Victoria|Candy/i);
});

test("saleng: unknown item or NO dismisses the cart", () => {
  state().room = "candy_bar";
  state().pendingEnc = "saleng";
  state().salengCart = "food";
  const money0 = state().money;
  run("no");
  assert.equal(state().money, money0, "no charge");
  assert.match(lastOut(), /putters off|nod/);
  assert.ok(!state().pendingEnc, "enc cleared");
});

test("saleng: buying sandals for self adds to inventory", () => {
  state().room = "candy_bar";
  state().pendingEnc = "saleng";
  state().salengCart = "shoes";
  state().money = 500;
  run("buy sandals");
  assert.equal(state().itemLoc.saleng_sandals, "inventory", "sandals in inventory");
  assert.match(lastOut(), /GIVE SANDALS/i);
});

test("saleng: buying sandals twice refunds second", () => {
  state().room = "candy_bar";
  state().money = 500;
  state().itemLoc.saleng_sandals = "inventory";
  state().pendingEnc = "saleng";
  state().salengCart = "shoes";
  const money0 = state().money;
  run("buy sandals");
  assert.equal(state().money, money0, "refunded");
  assert.match(lastOut(), /already have/i);
});

test("saleng: buying lingerie for self adds to inventory", () => {
  state().room = "candy_bar";
  state().pendingEnc = "saleng";
  state().salengCart = "lingerie";
  state().money = 500;
  run("buy lingerie");
  assert.equal(state().itemLoc.saleng_lingerie, "inventory", "lingerie in inventory");
  assert.match(lastOut(), /GIVE LINGERIE/i);
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
  out = [];
  run("contacts");
  assert.match(lastOut(), /Candy — Candy Bar ❤/);
  assert.match(lastOut(), /Fon — Jasmine Garden Bar/);
  out = [];
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
  assert.match(lastOut(), /Nobody by that name/, "and he isn't at the rail");
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
