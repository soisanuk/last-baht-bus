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

// suppress the two random street pseudo-encounters (saleng cart, bar-stool
// peddler) by default — both arm a pendingEnc that eats the next command, and
// newGame() seeds G.rng from Math.random(), so any street-walking test would
// otherwise flake ~1 run in N. Tests that WANT them set the cooldown back.
beforeEach(() => { out = []; sfx = []; newGame();
  // every real player has been through the taxi-ride character creation before
  // Act One; default an identity so engineIntro/resets open the beach, not the taxi
  state().player.origin = "monger"; state().player.personality = "joker"; state().player.orientation = "straight";
  state().lastSaleng = 99999; state().lastPeddler = 99999; });

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
  assert.equal(state().room, "jomtien_beach_rd_s");
  run("look");
  assert.match(lastOut(), /Jomtien Beach Road/);
  run("w");
  assert.equal(state().room, "jomtien_beach");
});

test("blocked direction", () => {
  run("w"); // the start faces the open sea to the west — no exit that way
  assert.ok(_NO_EXIT.some(s => lastOut().includes(s)), "no exit that way (pooled refusal)");
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
  assert.ok(_HUH.some(s => lastOut().includes(s)), "a parse-error line (pooled)");
});

test("examine NPC and item", () => {
  run("s", "x nok");
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
  run("s"); // Auntie Nok is on the presence line at the beach end
  assert.ok(state().known.nok, "being in the room prints the name");
});

test("autocomplete no longer suggests ask-topics (they live in the conversation now)", () => {
  state().room = "beach_rd_s";
  run("look"); // Bank present
  // The ASK-about suggestion surface is gone: completing `ask <npc> about …` yields
  // no topics, whether or not the name has been mentioned. Topics surface as
  // in-conversation chips (see _convoTopics). Typed ASK still answers.
  assert.deepEqual(engineComplete("ask bank about "), [], "no topic suggestions");
  _say("“My girlfriend Pim — Starlight Bar, LK Metro.”");
  assert.deepEqual(engineComplete("ask bank about "), [], "still none after she's named");
  assert.ok(engineComplete("ask ").includes("bank"), "ask <npc> still name-completes");
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
  assert.match(lastOut(), /\(PLAY CONNECT 4\) · \(PLAY JACKPOT\)/);
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
  run("take bottle", "e", "take bottle", "w",
    "n", "light on", "n", "take bottle", "s", "light off", "s",
    "s", "sell bottles"); // 3 bottles → down to Auntie Nok at the beach end
  assert.equal(state().money, 15);
  assert.ok(state().flags.gotBusFare);
});

test("bus refuses the broke", () => {
  run("e", "n", "ride bus to beach road");
  assert.match(lastOut(), /fare is ฿15|climb off/i);
  assert.equal(state().room, "jomtien_beach_rd");
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
  state().room = "soi6_mid";
  run("enter queen vic");
  assert.equal(state().room, "queen_vic", "the pub is a venue, entered by name");
  run("up"); // upstairs is for guests only
  assert.match(lastOut(), /Guest, sir/);
  assert.equal(state().room, "queen_vic");
  state().hotel = "queenvic";
  run("u");
  assert.equal(state().room, "qv_room", "a guest walks up (U alias)");
  run("d");
  assert.equal(state().room, "queen_vic", "and back down (D alias)");
  // the literal two-word phrase, not just the bare/aliased forms: doCommand's
  // filler-word stripper for "go X" used to include "up" itself, so it ate the
  // whole argument and "go up" silently failed (caught by e2e-mega's BFS
  // walk 2026-07-22 — bare "up"/"u" go through a different code path and
  // never hit the bug, which is exactly how it went untested this long)
  run("go up");
  assert.equal(state().room, "qv_room", "the literal phrase GO UP must also walk");
  run("go down");
  assert.equal(state().room, "queen_vic", "and GO DOWN back");
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
  run("e", "n"); // up to the Jomtien bus stop (the beach road middle)
  assert.match(lastOut(), /\(RIDE BUS TO <place>\)/);
  // holding a bottle near Auntie Nok surfaces (SELL BOTTLES)
  out = [];
  run("w", "s", "s"); // down the sand to her Soi 7 beach-end cart, Chang bottle still un-taken
  assert.doesNotMatch(lastOut(), /SELL BOTTLES/, "no glass, no pitch");
  run("n", "take bottle", "s"); // grab a bottle on the sand, back to Nok
  assert.match(lastOut(), /\(SELL BOTTLES\)/);
});

test("READ SIGN reads Auntie Nok's cart sign — her blurb's promise is cashed", () => {
  // her desc says "a hand-lettered sign… ฿5 per returned bottle"; READ SIGN must honor it
  state().room = NPCS.nok.room;
  out = []; run("read sign");
  assert.match(out.join("\n"), /five baht|฿5|ขวด/, "the cart sign is readable where she stands");
  assert.match(out.join("\n"), /SELL BOTTLES/, "and it points at the real mechanic");
  // …and still rebuffs where there genuinely is no sign
  state().room = "jomtien_beach"; out = []; run("read sign");
  assert.match(lastOut(), /No signs worth reading/);
});

test("GIVE bottles to Nok is just selling them — including the natural plural", () => {
  state().flags.act1Done = true; state().room = NPCS.nok.room;
  // the strict give-item matcher chokes on "bottles" (items are singular
  // "bottle"), so a bottle-ish give to the buyer routes straight to the sale
  for (const phrase of ["give bottles to nok", "give bottle to nok", "give glass to nok"]) {
    state().itemLoc.bottle1 = "inventory";
    out = []; run(phrase);
    assert.match(lastOut(), /counts the glass/, phrase);
    assert.equal(state().itemLoc.bottle1, null, "the bottle was sold");
  }
  // and with none, the sale's own graceful line — not "you're not carrying that"
  out = []; run("give bottles to nok");
  assert.match(lastOut(), /No bottle, no baht/);
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
  run("n", "n");    // through the lit middle beach to dark Dongtan — streak 1, growl
  assert.match(lastOut(), /soi dog/i);
  run("wait");      // streak 2 — dog takes the noodles
  assert.equal(state().itemLoc.noodles, null);
  assert.equal(state().room, "dongtan_beach", "not moved — noodles absorbed the bite");
});

test("darkness without noodles: bitten and displaced", () => {
  state().itemLoc.noodles = null;
  state().money = 100;
  run("n", "n", "wait");
  assert.equal(state().money, 70); // ฿30 shed
  assert.notEqual(state().room, "dongtan_beach");
});

test("charging needs charger and outlet", () => {
  run("e", "enter 7-eleven", "charge phone"); // at the Soi 7-corner 7-Eleven, no charger
  assert.match(lastOut(), /need a charger/i);
  state().money = 100;
  run("buy charger");
  assert.equal(state().money, 100 - 59);
  run("charge phone");
  assert.equal(state().battery, 100);
});

// ── Gossip chain & puzzles ─────────────────────────────────────────────────

test("re-talking gives the terse gist, not the full spiel again", () => {
  state().room = "jomtien_soi_7_beach_end";
  run("talk to nok");
  const first = lastOut();
  assert.match(first, /Three, four along the sand/); // full first-meeting spiel
  assert.match(first, /สวัสดี/);                // Thai greeting rendered
  out = [];
  run("talk to nok");
  const again = lastOut();
  assert.match(again, /Bring bottle, I give five baht/); // the point
  assert.doesNotMatch(again, /Three, four along the sand/);    // spiel dropped
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

test("bare 'sawatdee fon' (no SAY verb, no TO) still aims at Fon, not the last-talked-to NPC", () => {
  // NPC-completionist playtest (2026-08-22): a player who's just talked to
  // Randy elsewhere, then walks into Jasmine Garden and types the greeting
  // with the name tacked on naturally, expects it to land on Fon — not
  // misfire onto whoever the conversation layer last remembered.
  state().room = "jasmine_garden";
  run("talk to randy");
  out = [];
  run("sawatdee fon");
  assert.ok(state().flags.greetedFon, "greeted Fon by her trailing name, not the stale convo partner");
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

// ── The last baht bus: the nightly ride-home climax ─────────────────────────

test("last baht bus: the ฿15 ride runs until 2 a.m., then the stop goes dead", () => {
  state().money = 500;
  state().rain = 0;
  state().room = "jomtien_beach_rd";
  state().nightTurn = 79;              // 01:xx — one last chance
  run("ride bus to beach road");
  assert.ok(state().pendingFare, "before the cutoff the bus still runs");
  newGame(); out = []; state().lastSaleng = 99999;
  state().money = 500;
  state().rain = 0;
  state().room = "jomtien_beach_rd";
  state().nightTurn = 80;              // 02:00 — the last one's gone
  run("ride bus to beach road");
  assert.ok(!state().pendingFare, "no fare opens — the bus won't come");
  assert.match(lastOut(), /last songthaew|last-baht-bus/i);
});

test("small-hours motosai gouge kicks in once the buses stop (Bank's rate exempt)", () => {
  state().room = "buakhao_s";
  state().money = 300;
  state().rain = 0;
  state().nightTurn = 40;              // buses running — base ฿50
  run("motosai to naklua");
  assert.equal(state().money, 250);
  newGame(); out = []; state().lastSaleng = 99999;
  state().room = "buakhao_s";
  state().money = 300;
  state().rain = 0;
  state().nightTurn = 82;              // past the last bus — gouged to ฿80
  run("motosai to naklua");
  assert.equal(state().money, 220, "small-hours tax: ฿50 → ฿80");
  assert.match(lastOut(), /small-hours/i);
  // Bank's ฿20 mates' rate is exempt from the gouge
  newGame(); out = []; state().lastSaleng = 99999;
  state().room = "buakhao_s";
  state().money = 300;
  state().rain = 0;
  state().flags.helmetDelivered = true;
  state().nightTurn = 82;
  run("motosai to naklua");
  assert.equal(state().money, 280, "Bank still runs you home for ฿20");
});

test("last-bus warning fires once in the final half hour, away from home", () => {
  state().flags.act1Done = true;
  state().room = "beach_rd_c";         // out on the town, not the hotel
  state().battery = 90;
  state().nightTurn = 75;              // 01:xx — the warning window opens
  run("wait 1");
  assert.match(lastOut(), /last baht bus/i, "the heads-up lands");
  assert.ok(state().lastBusWarned);
  out = [];
  run("wait 1");
  assert.doesNotMatch(lastOut(), /last baht bus makes its final run/i, "it fires only once");
});

test("last-bus warning stays quiet if you're already home in bed", () => {
  state().flags.act1Done = true;
  state().room = "hotel_room";
  state().battery = 90;
  state().nightTurn = 75;
  run("wait 1");
  assert.doesNotMatch(lastOut(), /last baht bus makes its final run/i);
  assert.ok(!state().lastBusWarned, "no race to run from your own pillow");
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
  run("n", "n", "wait");
  assert.equal(state().itemLoc.moo_ping, null);
  assert.equal(state().room, "dongtan_beach", "skewer absorbed the bite");
});

test("drunk brit: an apology turns him generous", () => {
  state().room = "ws_north";
  state().money = 10;
  _startEnc("brit");
  run("sorry mate, my mistake");
  assert.equal(state().money, 60);
});

test("drunk brit: squaring up gets expensive and piwin-adjacent", () => {
  state().room = "ws_north";
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

test("tonic scam: TAO RAI closes the tab before the side-soi can open", () => {
  state().room = "beach_rd_c"; state().money = 5000; state().tonicOwed = 0;
  _startEnc("tonic");
  run("tao rai");
  assert.equal(state().money, 5000 - TONIC_PRICE, "you pay the one honest price, nothing more");
  assert.equal(state().tonicOwed, 0, "no shop, no fleece, no claim to report");
  assert.equal(state().itemLoc.hair_tonic, "inventory", "you still walk away with the bottle");
  assert.equal(state().pendingEnc, null, "the encounter closes clean");
});

test("fortune scam: TAO RAI reads the palm for ฿199 and denies the cleansing upsell", () => {
  state().room = "beach_rd_s"; state().money = 5000; state().curseOwed = 0;
  _startEnc("fortune");
  run("tao rai");
  assert.equal(state().money, 5000 - FORTUNE_READ, "just the ฿199 reading");
  assert.equal(state().curseOwed, 0, "no dark spirit, no ฿1900 ritual, no claim");
  assert.equal(state().pendingEnc, null);
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
  state().room = "buakhao_n";
  out = []; _describeRoom(true);
  assert.match(lastOut(), /Step inside:.*Candy Bar/, "names the bar you can walk into");
  assert.match(lastOut(), /ENTER <name>/, "teaches the ENTER verb");
  // a venue is a door, not a compass point — no direction is shown, and a bar
  // reachable two ways is still listed exactly once
  assert.doesNotMatch(lastOut(), /Candy Bar \(/, "no compass direction on a venue");
  assert.equal((lastOut().match(/Candy Bar/g) || []).length, 1, "listed once");
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
  assert.match(lastOut(), /professional warmth|so sweet|funny man|harmless/i); // pooled flirt-tier-2
  assert.ok(!state().soc.heat.jasmine_garden);
  run("kiss fon");
  assert.match(lastOut(), /slap|flat palm|isn't there|curdle/i); // pooled cold-kiss rejection
  assert.equal(state().soc.heat.jasmine_garden, 1);
});

test("lady drinks warm the outcome, tier by tier", () => {
  state().room = "jasmine_garden";
  state().money = 1000;
  run("buy drink for fon", "buy drink for fon", "buy drink for fon");
  assert.equal(state().soc.drinks.fon, 3);
  run("kiss fon");
  assert.match(lastOut(), /puppy|Sanuk|greedy|sample|nose/i, "tolerated at three drinks");
  run("buy drink for fon", "buy drink for fon", "kiss fon");
  assert.match(lastOut(), /takes her time|halfway|holds it/i, "leaned into at five");
});

test("Pia: same surface for everyone, the person comes up only if you look (two-layer girl)", () => {
  state().stage = "vacation"; state().room = "golden_dragon";
  run("talk to pia");
  assert.match(lastOut(), /or you hiding/i, "she reads YOU — an NPC-driven ask");
  // a stranger gets nothing real about her
  out = []; run("rating");
  assert.match(lastOut(), /never tell one man/i, "no score for a stranger");
  out = []; run("family");
  assert.match(lastOut(), /my family my business/i, "no real life for a stranger");
  // the language flip: she juggles four, the punter has one (English maps → language)
  out = []; run("do you speak english");
  assert.match(lastOut(), /who have the language problem/i, "the multilingual/intelligence flip lands");
  // earn it (farang tier) and the deadpan cracks — grounded, no violin
  state().soc.drinks.pia = 14; state().talked.pia = ""; state().convo = null;
  run("talk to pia");
  out = []; run("my score");                 // "score" is a reserved verb; "my score" → rating topic
  assert.match(lastOut(), /Seven\. First night, four/, "your rating, finally");
  out = []; run("family");
  assert.match(lastOut(), /one boy[\s\S]*Sisaket/, "one real thing");
  assert.match(lastOut(), /sorry face/i, "told plainly, not milked");
});

test("Kai: the operator — a forced shark you must read; the white knight can't bond clear of it", () => {
  state().stage = "vacation"; state().room = "golden_dragon";
  assert.equal(NPCS.kai.type, "operator");
  assert.ok(!NPCS.kai.filler, "promoted from filler to authored");
  assert.ok(_bfShark("kai"), "type:operator forces the shark, no hash luck involved");
  // a savvy punter who bonds (favor>=6) buys safety; the white knight never does
  state().player.personality = "charmer"; state().soc.drinks.kai = 8;
  assert.ok(!_bfExploitable("kai"), "bonding protects the savvy player");
  state().player.personality = "whiteknight";
  assert.ok(_bfExploitable("kai"), "the white knight stays the mark, however bonded");
  // the tells are in the prose; reading her (ask 'game') drops the act for a straight, dearer price
  run("talk to kai");
  assert.match(lastOut(), /reaches her eyes/i, "the smile-lands-late tell");
  out = []; run("you playing me");                 // → game topic (rule)
  assert.match(lastOut(), /straight price[\s\S]*discount/i, "seen through, she goes straight (and dearer)");
});

test("ladyboy hostesses: a bi player's real option, a straight player's gracious pass", () => {
  assert.ok(NPCS.bebe.ladyboy && NPCS.poy.ladyboy, "both flagged ladyboy");
  assert.ok(!NPCS.bebe.filler, "authored, at a WDG bar");
  state().stage = "vacation"; state().room = "pink_lotus";
  // straight player: SHE reads him and passes — agency intact, never the punter rejecting her
  state().player.orientation = "straight";
  run("flirt bebe");
  assert.match(lastOut(), /not for you|not him|the ladies are that way/i, "a gracious pass");
  state().flags.act1Done = true; state().flags.hasWallet = true;
  out = []; run("barfine bebe");
  assert.match(lastOut(), /not for you|not him|ladies are that way/i, "the barfine passes too");
  // bi player: a full courtship option — flirt falls through to the normal tiers
  state().player.orientation = "bi"; state().soc.drinks.bebe = 6;
  out = []; run("flirt bebe");
  assert.doesNotMatch(lastOut(), /not for you|the ladies are that way/i, "open mind → she's a real option");
});

test("ladyboy courtship deepens with bond — Poy's third reaction, Bebe's armor", () => {
  state().stage = "vacation";
  state().room = "golden_dragon";        // Poy's bar
  state().soc.drinks.poy = 13;           // her-farang tier
  run("talk poy");
  assert.match(lastOut(), /third one|talk to me like a person|stop believing/i, "Poy opens up at the top tier");
  out = []; state().soc.drinks.poy = 7;  // regular tier — the bond-gated dream unlocks
  run("ask poy about dream");
  assert.match(lastOut(), /only say my name|that is Poy|silly dream/i, "the dream unlocks at regular");
  // a stranger doesn't get the deep line
  out = []; state().soc.drinks.poy = 0;
  run("ask poy about dream");
  assert.doesNotMatch(lastOut(), /only say my name/i, "no depth before the bond is earned");
  // Bebe's wall comes down at her-farang tier
  state().room = "pink_lotus"; state().soc.drinks.bebe = 13;
  out = []; run("talk bebe");
  assert.match(lastOut(), /wall|past breakfast|put it down/i, "Bebe lets the act down for a regular");
});

test("personalities bite in the social system — charmer/joker/blunt/operator", () => {
  // the modifier helpers resolve per personality
  state().player.personality = "charmer";
  assert.equal(_persSocialMod("flirt"), 1, "charmer's flirt lands a tier warmer");
  assert.equal(_persTalkOutcome("compliment", "flat"), "warm", "and his compliment always lands");
  state().player.personality = "blunt";
  assert.equal(_persSocialMod("flirt"), 0, "the blunt man isn't smooth");
  assert.equal(_persTalkOutcome("compliment", "warm"), "flat", "flattery rings false from him");
  state().player.personality = "joker";
  assert.equal(_persTalkOutcome("joke", "flat"), "warm", "the joker's joke lands where others fall flat");
  assert.equal(_persTalkOutcome("tease", "cool"), "warm", "banter is his native tongue");
  state().player.personality = "operator";
  assert.equal(_scamLean(), 0.5, "the operator reads the con — halved scam odds");
  state().player.personality = "whiteknight";
  assert.equal(_scamLean(), 1.5, "the white knight is in deeper — worse odds");

  // integration: JOKER's joke on a cold stranger still lands warm (+happy)
  state().stage = "vacation"; state().room = "golden_dragon";
  state().player.personality = "joker";
  state().soc.drinks.kai = 0; _npcState("kai").trust = 0; _npcState("kai").mood = "";
  out = []; run("joke kai");
  assert.match(lastOut(), /สนุก/, "warm joke → +happy even from a standing start");

  // integration: OPERATOR gets the pre-pay tell on a risky (drunk-type) girl
  state().player.personality = "operator";
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().soc.drinks.dew = 6;
  out = []; run("barfine dew");
  assert.match(lastOut(), /Operator's instinct/, "he clocks the angle before the money moves");
});

test("mamasans read you: Nee clocks your manner, Peung clocks your origin", () => {
  state().stage = "vacation";
  const nee = (p) => { state().player.personality = p; state().room = "pink_lotus";
                       state().talked = {}; out = []; run("talk nee"); return lastOut(); };
  assert.match(nee("operator"), /working the room/i, "Nee recognises a fellow operator");
  assert.match(nee("whiteknight"), /the good one|so useful/i, "and prices the white knight highest");
  assert.match(nee("blunt"), /say what you mean/i, "and respects the blunt man");
  const peung = (o) => { state().player.origin = o; state().room = "golden_dragon";
                         state().talked = {}; out = []; run("talk peung"); return lastOut(); };
  assert.match(peung("monger"), /been here before/i, "Peung clocks the repeat monger");
  assert.match(peung("married"), /Thai wife/i, "and the ex-husband");
  assert.match(peung("running"), /not really here/i, "and the man running from something");
});

test("recognition spreads across the soi — the main mamas + Bert read you", () => {
  state().stage = "vacation";
  const read = (room, npc, set) => { set(); state().room = room; state().talked = {};
                                     out = []; run("talk " + npc); return lastOut(); };
  // personality readers
  assert.match(read("sunset_dreams", "malai", () => state().player.personality = "whiteknight"),
    /good heart/i, "Malai prices the white knight");
  assert.match(read("ruby_kiss", "saeng", () => state().player.personality = "operator"),
    /watch the room the way i/i, "Saeng clocks a fellow operator");
  // origin readers
  assert.match(read("cherry_pop", "toi", () => state().player.origin = "pi"),
    /police eyes/i, "Toi spots the ex-cop");
  const kes = read("kitten_corner", "kesinee", () => state().player.origin = "running");
  assert.match(kes, /you are hiding/i, "Kesinee reads the man running from something");
  // ...and her Bert-vouch trust fork still rides the origin greeting
  const t0 = _npcState("kesinee").trust;
  run("tell her bert sent you");
  assert.ok(_npcState("kesinee").trust >= t0 + 2, "the WDG vetting survives the origin read");
  // Bert (Beach Road) clocks your origin on the first meeting
  assert.match(read("stinky_bar", "bert", () => state().player.origin = "married"),
    /real version/i, "Bert clocks the returner");
  // the warm quiet-end mamas read a few signature types too (Malila: the man who came to breathe)
  assert.match(read("sandy_toes", "malila", () => state().player.origin = "running"),
    /came to breathe/i, "even the quiet-end mamas have signature reads");
});

test("Soi 6 cashiers: toms refuse the wrong team, kin refuse at any price, sponsors flip for money", () => {
  assert.equal(NPCS.joon.orientation, "gay", "a tom");
  assert.equal(NPCS.jun.type, "kin");
  assert.equal(NPCS.jenny.type, "sponsor");
  assert.ok(!NPCS.jenny.filler && !NPCS.joon.filler, "promoted from filler");
  state().stage = "vacation";
  // a tom cashier's barfine is a hard no (wrong shop)
  state().room = "golden_dragon"; run("barfine joon");
  assert.match(lastOut(), /wrong shop|like the ladies/i);
  // the mama's kin: family, not floor, at any price
  state().room = "sunset_dreams"; out = []; run("barfine jun");
  assert.match(lastOut(), /family|not floor/i);
  // the good-girl sponsor: off-limits until you outbid him
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().room = "pink_lotus"; state().money = 40000; state().soc.given = {};
  out = []; run("barfine jenny");
  assert.match(lastOut(), /not for sale|spoken|take care of me/i, "kept clean by the sponsor");
  assert.ok(!_sponsorFlipped("jenny"));
  // gifts accumulate toward her number (TIP feeds G.soc.given — and builds favor too)
  run("tip jenny 5000"); run("tip jenny 5000"); run("tip jenny 5000"); run("tip jenny 5000");
  assert.equal(state().soc.given.jenny, 20000, "the gifts log toward her number");
  assert.ok(_sponsorFlipped("jenny"), "20k outbids Klaus's monthly");
  out = []; run("talk to jenny"); out = []; run("sponsor");
  assert.match(lastOut(), /number too big|not clean anymore/i, "the facade drops — you bought that");
  out = []; run("barfine jenny");
  assert.ok(state().pendingBf, "flipped: now the barfine goes through");
});

test("sponsor-flip photo drip: gifts to a kept cashier text back escalating selfies, filed to the gallery", () => {
  state().stage = "vacation"; state().flags.act1Done = true;
  state().phone.contacts = { baimon: true };   // she texts back — needs your number
  state().money = 60000; state().soc.given = {};
  // pic1 crosses at ฿5k
  out = []; run("send 6000 to baimon");
  assert.match(lastOut(), /sent you something|CHECK MESSAGES/i, "a frame texts back on a gift");
  assert.doesNotMatch(lastOut(), /cheap charlie|number one/i, "no cheap-charlie patter for a sponsor girl");
  out = []; run("check messages");
  assert.match(lastOut(), /off-shift/i, "pic1 delivered");
  // pic2 at ฿10k
  run("send 5000 to baimon"); out = []; run("check messages");
  assert.match(lastOut(), /one shoulder|dressed up/i, "pic2 delivered");
  // pic3 (฿14k) must still ride the same send that crosses the ฿15k flip
  run("send 5000 to baimon"); out = []; run("check messages");
  assert.match(lastOut(), /beach/i, "the climax frame lands on the flipping send, not skipped");
  assert.ok(_sponsorFlipped("baimon"), "16k outbids Dave");
  const caps = _photoList().map(p => p.cap || "");
  assert.equal(caps.filter(c => /Baimon/.test(c)).length, 3, "all three frames filed to the gallery");
});

test("sponsor drip: a single lump sum jumps straight to the climax frame", () => {
  state().stage = "vacation"; state().flags.act1Done = true;
  state().phone.contacts = { jenny: true };
  state().money = 60000; state().soc.given = {};
  out = []; run("send 15000 to jenny");        // crosses all thresholds + the flip at once
  out = []; run("check messages");
  assert.match(lastOut(), /beach/i, "one big send delivers the highest unlocked frame");
  assert.ok(_sponsorFlipped("jenny"), "and she's flipped");
  assert.equal(state().soc.sponsorPix.jenny, 3, "all frames marked sent — no re-drip on later gifts");
});

test("bar etiquette: a girl with another customer declines your lady drink; insist and he turns", () => {
  state().stage = "vacation"; state().room = "pink_lotus"; state().money = 5000;
  let busy;
  for (let nt = 20; nt <= 55 && !busy; nt += 10) {
    state().nightTurn = nt;
    busy = _npcsHere().find(id => NPC_ROLES[id] === "hostess" && _girlBusy(id));
  }
  assert.ok(busy, "some hour has a Soi 6 girl sitting with another customer");
  // first offer: a polite decline, nothing spent
  run("buy drink for " + NPCS[busy].name);
  assert.match(lastOut(), /with customer|maybe later|I am busy|not polite/i, "she declines gracefully");
  assert.equal(state().money, 5000, "no money moves");
  // insist: she takes it, and her customer starts to turn
  out = []; run("buy drink for " + NPCS[busy].name);
  assert.equal(state().money, 4850, "the second one she takes");
  assert.match(lastOut(), /the man beside/i, "you've bought his whole attention");
});

test("Soi 6 mamas: sharp operators take a quiet house cut; beer-bar mamas run warm", () => {
  assert.equal(NPCS.nee.type, "operator", "the WDG flagship mama is an operator");
  assert.ok(!NPCS.bussaba.type, "the beer-bar mama is not");
  assert.ok(!NPCS.nee.filler && !NPCS.bussaba.filler, "both promoted from filler");
  state().stage = "vacation"; state().nightTurn = 40;
  state().room = "pink_lotus";
  assert.ok(_roomMamaOperator(), "an operator runs the flagship room");
  assert.equal(_barfinePrices("soi6", "joy").st, 750, "her 10% cut lifts the ฿700 base — the subtle mama tax");
  state().room = "sunset_rail";
  assert.ok(!_roomMamaOperator(), "the beer-bar mama takes no cut");
});

test("Nangfah: the spark in the crowd — a real plan, and no man is a financial strategy", () => {
  state().stage = "vacation"; state().room = "kitten_corner"; state().soc.drinks.nangfah = 8;
  run("talk to nangfah");
  out = []; run("your book");
  assert.match(lastOut(), /accounting|degree/i, "the real plan under the going-out clothes");
  out = []; run("plan");
  assert.match(lastOut(), /not a financial strategy/i, "she rejects the rescue outright — agency, not a victim");
});

test("the whole Soi 6 hostess cast is hand-authored — no procedural filler left", () => {
  const soi6Hostesses = Object.keys(NPCS).filter(id =>
    NPC_ROLES[id] === "hostess" &&
    ROOMS[NPCS[id].room || (NPCS[id].bars || [])[0]]?.region === "Soi 6");
  const stillFiller = soi6Hostesses.filter(id => NPCS[id].filler);
  assert.deepEqual(stillFiller, [], "every Soi 6 girl is a specific, authored person");
  assert.ok(soi6Hostesses.length >= 20, "the full cast is present");
});

test("Pink Lotus (WDG flagship): volatile (Puu) & moneypit (Belle) — the crazy bar", () => {
  assert.equal(NPCS.puu.type, "volatile");
  assert.equal(NPCS.belle.type, "moneypit");
  assert.ok(!NPCS.puu.filler && !NPCS.belle.filler, "promoted from filler");
  // volatile → the jealousy "scene" on barfine; an ordinary girl never triggers it
  let puuScene = 0, mayScene = 0;
  for (let i = 0; i < 40; i++) { state().rng = (i * 2654435761) >>> 0 || 1; if (_bfScamRoll("puu", false) === "scene") puuScene++; }
  for (let i = 0; i < 40; i++) { state().rng = (i * 40503) >>> 0 || 1; if (_bfScamRoll("may", false) === "scene") mayScene++; }
  assert.ok(puuScene > 8, "the volatile girl detonates often");
  assert.equal(mayScene, 0, "an ordinary girl never does");
  // moneypit → the text is always another escalating ask
  state().phone.inbox = []; _moneypitText("belle");
  assert.match(state().phone.inbox.at(-1).text, /\d{4}|hospital|landlord|emergency|need \d/i, "always another number");
});

test("the volatile scene resolves: you pay, you get a fight — hurt, and out on the soi", () => {
  let fired = false;
  for (let s = 1; s < 60 && !fired; s++) {
    state().stage = "vacation"; state().room = "pink_lotus"; state().money = 5000; state().happy = 20;
    state().hurt = 0; state().player.personality = "whiteknight";     // in deeper → eats it more
    state().pendingBf = { id: "puu", st: 600, lt: 1500 };
    state().rng = (s * 2654435761) >>> 0 || 1; out = [];
    _bfResolve("lt");
    if (/goes wrong before you reach the door/.test(lastOut())) {
      fired = true;
      assert.equal(state().hurt, 1, "banged up a notch");
      assert.ok(state().money < 5000, "the fine is gone");
      assert.notEqual(state().room, "pink_lotus", "hauled out to the soi");
    }
  }
  assert.ok(fired, "a scene triggers and resolves cleanly");
});

test("Kluay (lazy) & Benz (vain): indie-bar human types; lazy = you spend, get little", () => {
  assert.ok(!NPCS.kluay.filler && !NPCS.benz.filler, "promoted from filler");
  assert.equal(NPCS.kluay.type, "lazy");
  // the lazy vector: buy her many drinks, favor sticks only ~40% (a normal girl banks all)
  state().stage = "vacation"; state().room = "ruby_kiss"; state().money = 100000;
  const before = state().soc.drinks.kluay || 0;
  for (let i = 0; i < 20; i++) { state().rng = (i * 2654435761) >>> 0 || 1; run("buy drink for kluay"); }
  const gained = (state().soc.drinks.kluay || 0) - before;
  assert.ok(gained > 3 && gained < 16, "she banks the drink but rarely the warmth");
  // Benz runs the follower game, not the money game
  run("talk to benz"); out = []; run("content");
  assert.match(lastOut(), /algorithm|follower/i);
});

test("Dew (drunk) & Nook (party): the honest ordinary types — one has teeth, one doesn't", () => {
  assert.ok(!NPCS.dew.filler && !NPCS.nook.filler, "both promoted from filler");
  assert.equal(NPCS.dew.type, "drunk");
  assert.equal(NPCS.nook.type, "party");
  // the drunk vector: barfine her and the night is often a write-off ("mao"); an
  // ordinary girl never triggers it that way
  let dewMao = 0, kwanMao = 0;
  for (let i = 0; i < 40; i++) { state().rng = (i * 2654435761) >>> 0 || 1; if (_bfScamRoll("dew", false) === "mao") dewMao++; }
  for (let i = 0; i < 40; i++) { state().rng = (i * 40503) >>> 0 || 1; if (_bfScamRoll("kwan", false) === "mao") kwanMao++; }
  assert.ok(dewMao > 10, "the drink-too-much girl wrecks the night often");
  assert.equal(kwanMao, 0, "an ordinary girl doesn't");
  // Dew refuses the rescue in her own words (the anti-white-knight beat)
  state().stage = "vacation"; state().room = "golden_dragon"; state().soc.drinks.dew = 8;
  run("talk to dew"); out = []; run("you okay");
  assert.match(lastOut(), /not the one you fix/i);
  // Nook has no hidden layer — and that's honest, not a failing
  out = []; run("talk to nook");
  assert.match(lastOut(), /forget your name|call you handsome/i);
});

test("Kwan: the green rung — soft and simple, but self-possessed, not a dim sweet girl", () => {
  state().stage = "vacation"; state().room = "sunset_dreams";
  run("talk to kwan");
  assert.match(lastOut(), /everybody here miss somebody/i, "her gentle, un-sales ask");
  out = []; run("crane");
  assert.match(lastOut(), /grandmother teach me[\s\S]*quiet/i, "homesick hands, plain feeling");
  out = []; run("home");
  assert.match(lastOut(), /you get used to/i, "stranger: homesickness rendered plain, no violin");
  // a regular earns the plan under the softness — agency + the sharp reframe
  state().soc.drinks.kwan = 8; state().talked.kwan = ""; state().convo = null;
  run("talk to kwan");
  out = []; run("home");
  assert.match(lastOut(), /coffee shop[\s\S]*not small\. Just quiet/i, "her quiet plan, and the line under it");
});

test("Wilai: a different rung from Pia — the showwoman, and she reads your personality", () => {
  state().stage = "vacation"; state().room = "ruby_kiss";
  // a white knight gets punctured on sight — personality gates the greeting (anti-victim)
  state().player.personality = "whiteknight";
  run("talk to wilai");
  assert.match(lastOut(), /don't need saving[\s\S]*need customer/i, "she clocks the rescuer and reframes it");
  // any other type gets the normal showwoman patter + her qualifying ask
  state().convo = null; state().talked.wilai = ""; state().player.personality = "charmer";
  out = []; run("talk to wilai");
  assert.match(lastOut(), /you have my kiss already/i, "the kiss-glass close");
  assert.match(lastOut(), /how long you here/i, "she qualifies the lead");
  // stool is two-layer: agency for a stranger, the real plan once bonded
  out = []; run("stool");
  assert.match(lastOut(), /I am the window/i, "surface: she runs the window, not a victim");
  state().soc.drinks.wilai = 14; state().talked.wilai = ""; state().convo = null;
  run("talk to wilai");
  out = []; run("the window");                // → stool topic (rule)
  assert.match(lastOut(), /I have a deposit/i, "earned: the ambition under the show");
});

test("the in-prose reply prompt is trimmed: an answer cue for a question, choices for a fork, else nothing", () => {
  // The chip bar carries the generic topic/compliment/goodbye list every turn, so
  // the prose prompt no longer echoes it (that was redundant). It fires only when
  // it adds something: an answer cue for a pending question, or a node's choices.
  state().stage = "vacation"; state().room = "stinky_bar";
  out = []; run("talk to bert");
  // Bert's greeting puts a question to you → an answer cue, NOT the topic palette
  assert.match(lastOut(), /put that to you|just answer/i, "a pending question cues you to answer");
  assert.doesNotMatch(lastOut(), /GOODBYE\)/, "and it doesn't echo the topic palette (chips carry that)");
  // answer him; a following ordinary topic turn carries NO redundant prose palette
  out = []; run("just bored at home");   // a plain reply resolves the question
  out = []; run("league");
  assert.doesNotMatch(lastOut(), /GOODBYE\)/, "an ordinary turn leaves the options to the chip bar");
  // a live action-choice DOES earn the in-prose prompt
  out = []; state().room = "golden_dragon"; _convoEnd();
  run("talk to gavin"); if (typeof _setFlag === "function") _setFlag("heardWdgPitch");
  out = []; run("talk to gavin");
  // apostrophe stripped so the CAPS run stays one tappable kw (tap still resolves)
  assert.match(lastOut(), /TELL HIM YOURE IN/, "a real fork is surfaced in the prose");
  assert.match(lastOut(), /GOODBYE\)/, "and closes with GOODBYE");
  // leaving closes it — no prompt after goodbye
  out = []; run("goodbye");
  assert.doesNotMatch(lastOut(), /GOODBYE\)/, "gone once you take your leave");
});

test("dialogue choices: Bert's WDG-flip is a pick-a-side fork; effects land, closes once taken", () => {
  // (rely on the beforeEach's newGame — it also suppresses random saleng/peddler
  // events that would otherwise swallow the follow-up command mid-test)
  state().room = "stinky_bar"; state().quests.wdg_flip = "active";
  run("talk bert"); run("talk bert"); // returning greeting carries the fork
  assert.ok(_convoChoices().some(c => /push him to sell/i.test(c.label)), "the sell choice is offered");
  run("push him to sell"); // exact typed label wins over the PUSH verb (pre-verb pick)
  assert.equal(_faction("wdg"), 2, "carrying Gavin's pitch aligns you to WDG");
  assert.equal(_faction("indie"), -1);
  assert.ok(state().flags.wdgFlipTried);
  assert.ok(!_convoChoices().some(c => /sell/i.test(c.label)), "the fork closes once taken");
});

test("dialogue choices: the honest picture resolves the flip the other way", () => {
  state().room = "stinky_bar";
  ["heardWdgHistory", "heardWdgInside", "heardWdgPitch"].forEach(f => state().flags[f] = true);
  run("talk bert"); run("talk bert");
  assert.ok(_convoChoices().some(c => /honest picture/i.test(c.label)));
  run("give him the honest picture"); // number "2" or a chip tap would do the same
  assert.equal(_faction("indie"), 2);
  assert.equal(_faction("wdg"), -1);
  assert.ok(state().flags.wdgResolved);
});

test("flirt is orientation-aware: a man gets the awkward brush-off, no side effects", () => {
  state().room = "stinky_bar";
  run("flirt bert");
  assert.match(lastOut(), /not that way|wrong tree|steady on/i, "Bert deflects — awkward, not the favor tiers");
  assert.equal(_faction("wdg"), 0, "a whiffed pass moves no standing");
  assert.ok(!state().soc.heat.stinky_bar, "awkward costs no heat");
});

test("a saleng only interrupts a conversation if the partner bolts to it", () => {
  state().room = "candy_bar";
  const g = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  _doTalk(NPCS[g].name.split(" ")[0].toLowerCase(), null);
  assert.equal(state().convo, g, "in conversation");
  state().salengCart = "fruit"; state().salengRoom = state().room;
  // the vignette picks a random hostess each tick; when it lands on the partner
  // she's physically gone to the cart → the conversation ends (the "she jumps" rule)
  for (let i = 0; i < 60 && state().convo; i++) _salengVignette();
  assert.equal(state().convo, null, "she bolted to the cart mid-sentence → conversation over");
});

test("WDG-cast choices move faction, NPC-trust, and bond from the player's response", () => {
  // Gavin — leaning in is a WDG act (declining is free); apostrophe label typed plainly
  state().room = "golden_dragon"; state().flags.heardWdgPitch = true;
  run("talk gavin"); run("talk gavin");
  run("tell him youre in");
  assert.equal(_faction("wdg"), 1, "playing along aligns you to WDG");
  // Kesinee — Bert vouching earns the trust that unlocks her reveal
  state().room = "kitten_corner";
  run("talk kesinee");
  const t0 = _npcState("kesinee").trust;
  run("tell her bert sent you");
  assert.ok(_npcState("kesinee").trust >= t0 + 2, "Bert's name buys real trust");
  // Powers — needling the boss costs you WDG standing
  state().room = "orchid_room";
  run("talk powers");
  run("call it a room full of criminals");
  assert.equal(_faction("wdg"), 0, "the needle undoes Gavin's +1");
  // Joy — a warm response deepens the Regular bond
  state().room = "pink_lotus"; _npcState("joy").trust = 3;
  run("talk joy"); run("ask joy about future");
  run("tell her she deserves better");
  assert.equal(state().soc.drinks.joy, 1, "warmth deepens the bond");
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
  assert.match(lastOut(), /returns fire|out-Pattaya|spanks YOU|retaliates|returns the favour|harder/i); // a real reaction (pooled)
});

test("three bell rings: the room is yours — hostess reciprocates cold", () => {
  state().room = "neon_paradise"; // Noi, a hostess
  state().money = 2000;
  run("ring bell", "ring bell", "ring bell");
  assert.equal(state().soc.bells.neon_paradise, 3);
  out = [];
  run("fondle noi"); // zero drinks bought — but three bells top-tiers it anyway
  assert.match(lastOut(), /puts them where she wants|takes both your hands|arranges you|furniture/i);
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
  state().room = "buakhao_n";
  state().soc.banned.candy_bar = 0;
  state().turns = 5;
  run("enter candy");
  assert.equal(state().room, "buakhao_n");
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
  assert.match(lastOut(), /cheek|deflection|hug|Slow|free tonight/i);
});

test("the anonymous bar-bore (no named regular here): sober tips, drunk rambling, bell-glow", () => {
  state().room = "anchor_bar"; // a bar with no named regular — the archetype fills in
  // (seabreeze got Dieter when Jomtien was populated; anchor_bar stays anonymous all week)
  run("talk to patron");
  assert.match(lastOut(), /mamasan|cashiers/i);
  state().soc.drunk = 4;
  run("talk to patron");
  assert.match(lastOut(), /stool away/i);
  state().soc.bellAt.anchor_bar = state().turns;
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
  run("s", "kiss nok");
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
  state().flags.act1Done = true;     // rough wakes are a resident mechanic now (pre-act1 hard-fails)
  state().room = "ws_south";         // Walking Street → the arch
  state().nightTurn = 99;
  run("wait");
  assert.equal(state().room, "ws_gate");

  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true;
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

test("a resident's dehydration collapse: rough wake, broke", () => {
  state().flags.act1Done = true;     // pre-act1 collapse hard-fails now; residents wake rough
  state().flags.hasWallet = true;
  state().room = "jomtien_beach";    // beach region → the beach crash spot
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

test("watching the soi: the balcony's first-time tone-setter, then it varies; the pub is its own view", () => {
  state().room = "qv_room";
  // first time onto the balcony: the big orienting wall + directional hints
  out = []; run("balcony");
  assert.match(lastOut(), /kicked over a crate of neon|opens up underneath you/i, "the first-time tone-setter");
  assert.match(lastOut(), /DOWN the stairs|west-loud to east-deep/i, "with orientation hints");
  assert.ok(_flag("sawBalcony"), "flagged so it won't wall you again");
  // a later look varies from the pool — never the wall again
  out = []; run("watch soi");
  assert.doesNotMatch(lastOut(), /kicked over a crate of neon/i, "no repeated wall");
  assert.ok(_BALCONY_SCENES.some(s => lastOut().includes(s.slice(0, 40))), "a varied balcony scene instead");
  // the pub is a distinct, ground-level, behind-the-glass view
  state().room = "queen_vic";
  out = []; run("watch soi");
  assert.ok(_PUB_SOI_SCENES.some(s => lastOut().includes(s.slice(0, 40))), "the pub's own through-the-glass view");
  assert.doesNotMatch(lastOut(), /third-floor rail|recliner/i, "not the balcony copy");
});

test("a tapped title with an internal article still resolves (doCommand strips a/an/the anywhere)", () => {
  state().room = "queen_vic"; state().mode = "soi6"; state().day = 1; state().nightTurn = 10;
  // Mort's patron title is "an owlish old-timer scribbling in a notebook" — the
  // internal "a" gets filtered out of the arg, so the chip used to dead-end.
  out = []; run("talk to an owlish old-timer scribbling in a notebook");
  assert.match(lastOut(), /Mort/i, "the tapped patron title resolves despite the stripped internal article");
  // and an NPC title with an internal article (Doyle: "nursing a soda water")
  state().player.origin = "monger"; // Doyle active
  out = []; run("talk to a watchful older farang nursing a soda water");
  assert.match(lastOut(), /Doyle|clocks you/i, "same for an NPC title");
});

test("a venue's own name, tapped from inside it, doesn't walk you to your room", () => {
  // "Queen Vic Inn" (the pub) substring-collides with "Your Room — Queen Vic Inn",
  // so from inside the pub it used to route upstairs. Now: you're standing in it.
  state().hotel = "queenvic"; state().room = "queen_vic";
  state().visited = state().visited || {}; state().visited.queen_vic = true;
  out = []; run("travel queen vic inn");
  assert.match(lastOut(), /standing in it/i, "no navigation");
  assert.equal(state().room, "queen_vic", "you stayed put");
});

test("_passTime aborts a multi-tick action when the night ends — no phantom ticks past dawn", () => {
  // The old `if (G.over) …` guards never fired (G.over is never set true), so
  // short-time/massage/soapy loops ticked straight past _endNight into the next
  // night. _passTime stops the moment the day advances.
  state().stage = "vacation"; state().flags.act1Done = true;
  state().day = 3; state().nightTurn = 98; state().room = "sunset_rail";
  const ended = _passTime(6);
  assert.ok(ended, "it reports the night ended mid-pass");
  assert.equal(state().day, 4, "the day advanced (dawn came)");
  assert.ok(state().nightTurn <= 3, "and it stopped promptly — not 6 ticks deep into the new night");
});

test("_addBond moves a girl's bond and floors it at 0 (souring can't go negative)", () => {
  state().soc.drinks = {};
  assert.equal(_addBond("nok", 3), 3, "seeds from nothing");
  assert.equal(_addBond("nok", 2), 5, "and accumulates");
  assert.equal(state().soc.drinks.nok, 5, "written through to the counter");
  assert.equal(_addBond("nok", -9), 0, "souring past zero floors at 0, never negative");
  assert.equal(_addBond("ghost", -1), 0, "decaying an absent girl stays 0");
});

test("_hurt enforces the third-injury clinic rule uniformly (caps + ends the night)", () => {
  // Several injury sites bumped G.hurt with no `>= HURT_CAP` check, silently pinning
  // you at max with no ending. _hurt is the one gate now.
  state().stage = "vacation"; state().flags.act1Done = true;
  state().day = 3; state().nightTurn = 40; state().hurt = 2;
  const clinic = _hurt(2); // 2 + 2 saturates at the cap and trips the clinic
  assert.ok(clinic, "the third hit reports a hospitalisation");
  assert.equal(state().day, 4, "the night ended — you woke up the next day");

  // a non-fatal knock caps but does NOT end the night
  state().day = 3; state().nightTurn = 40; state().hurt = 0;
  assert.equal(_hurt(1), false, "a first knock does not hospitalise");
  assert.equal(state().hurt, 1);
  assert.equal(state().day, 3, "and the night carries on");
});

test("a hotel room's dead-direction refusal is indoor-appropriate, not a street line", () => {
  // qv_room only exits `down` — trying OUT used to give the street pool ("shuttered
  // shophouses, a parked Click"), nonsense from a third-floor room.
  state().room = "qv_room";
  out = []; run("out");
  assert.match(lastOut(), /only way out of the room is the stairs/i, "an indoor refusal");
  assert.doesNotMatch(lastOut(), /shophouse|parked Click|No road/i, "not the street pool");
  assert.match(lastOut(), /\(DOWN\)/, "with the real exit offered as a live tap");
  // a genuine street room still gets the street refusal
  state().room = "soi6_street";
  out = []; run("north");
  assert.doesNotMatch(lastOut(), /only way out of the room/i, "street rooms keep the street pool");
});

test("RESTART re-runs character creation in the CURRENT mode (Soi 6 stays Soi 6)", () => {
  // The bug: RESTART did newGame()+engineIntro() unconditionally, dumping a Soi 6
  // challenge player onto the beach/Act One. It must re-open the mode you're in.
  state().mode = "soi6"; state().player.origin = "monger"; state().room = "qv_room";
  state().flags.act1Done = true;
  run("restart");
  assert.equal(state().pendingChoice, "intro", "the taxi intro re-runs");
  assert.equal(state().introAfter, "soi6", "and it re-opens the Soi 6 week, not the beach");
  assert.equal(state().player.origin, null, "identity is cleared for the re-pick");
  // Full game: RESTART re-runs the taxi toward the beach opening, keeping the record
  newGame(); state().player.origin = "pi"; state().act1Best = 4; state().act1Tries = 2;
  run("restart");
  assert.equal(state().pendingChoice, "intro", "taxi re-runs in the full game too");
  assert.equal(state().introAfter, "beach", "toward the beach opening");
  assert.equal(state().act1Best, 4, "the personal-best record survives the restart");
  assert.equal(state().act1Tries, 2, "and the tries count");
});

test("reputation: gains throttle to +1/day, losses land in full and stack, act1 is exempt", () => {
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 2;
  assert.equal(state().rep, 0, "starts neutral");

  // a good day is worth +1 no matter how many good deeds
  assert.equal(_repGain(), true, "first good deed banks the day");
  assert.equal(_repGain(), false, "a second good deed the same day banks nothing");
  assert.equal(state().rep, 1, "still just +1 for the day");
  state().day = 3;
  assert.equal(_repGain(), true, "a new day, a new +1");
  assert.equal(state().rep, 2);

  // incidents land in full and stack within a night, uncapped by the daily gate
  _repHit(3); _repHit(2);
  assert.equal(state().rep, -3, "two incidents in one night both count (2 - 3 - 2)");

  // clamps
  state().rep = 0; for (let i = 0; i < 30; i++) _repHit(1);
  assert.equal(state().rep, REP_MIN, "floors at REP_MIN");

  // the opening quest is exempt — no reputation before you've found your feet
  state().flags.act1Done = false; state().rep = 0;
  assert.equal(_repGain(), false, "no gain during act1");
  _repHit(5);
  assert.equal(state().rep, 0, "no loss during act1 either");
});

test("reputation tiers + STANDING readout + a fresh vacation wipes the slate", () => {
  state().stage = "vacation"; state().flags.act1Done = true;
  const tierOf = r => { state().rep = r; return _repTier(); };
  assert.deepEqual([tierOf(-12), tierOf(-5), tierOf(0), tierOf(5), tierOf(12)], [-2, -1, 0, 1, 2]);

  state().rep = 6;
  out = []; run("standing");
  assert.match(lastOut(), /good sort/i, "STANDING reads your current tier");
  out = []; run("rep");
  assert.match(lastOut(), /good sort/i, "REP is the same readout");

  // a new vacation is a clean slate (the soi forgets a month later)
  state().rep = -8; state().repDay = 3;
  state().day = 8; state().pendingChoice = null;
  _newVacation();
  assert.equal(state().rep, 0, "reputation resets with the new trip");
  assert.equal(state().repDay, null, "and the daily-gain gate resets too");
});

test("reputation moves on real play: a big tip lifts it, a kickout craters it", () => {
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 2;
  state().room = "stinky_bar"; state().money = 5000;
  const girl = Object.keys(NPCS).find(id => _npcRoom(id) === "stinky_bar" && NPC_ROLES[id]);
  run(`tip ${girl} 200`);
  assert.equal(state().rep, 1, "a generous tip is a good deed (+1)");

  // that same night, get bounced — the loss dwarfs the day's gain
  _kickOut();
  assert.equal(state().rep, -2, "a kickout (-3) wipes the +1 and then some");
});

test("reputation colours a stranger's reception (±1 favor), but never a regular's", () => {
  state().stage = "vacation"; state().flags.act1Done = true;
  state().room = "stinky_bar";
  const girl = Object.keys(NPCS).find(id => _npcRoom(id) === "stinky_bar" && NPC_ROLES[id] === "hostess");
  state().soc.drinks = {};
  state().rep = 0; const base = _favor(girl);
  state().rep = 12; const warm = _favor(girl);
  state().rep = -12; const cold = _favor(girl);
  assert.equal(warm, base + 1, "a good name warms a stranger by 1");
  assert.equal(cold, base - 1, "a bad name cools a stranger by 1");
  // a regular (bond ≥ 3) is immune — earned bond outweighs the town's read
  state().soc.drinks[girl] = 5;
  state().rep = 12; const regWarm = _favor(girl);
  state().rep = -12; const regCold = _favor(girl);
  assert.equal(regWarm, regCold, "a regular's favour doesn't ride on your street rep");
});

test("the grapevine and the bounce move reputation the right way", () => {
  state().stage = "vacation"; state().flags.act1Done = true;
  state().room = "queen_vic";
  run("angela"); run("london");
  state().room = NPCS.bert.room; run("bert");

  // a cross-soi gossip catch docks 1
  state().rep = 5; state().repDay = state().day; // baseline + today's gain already spent
  state().convoQ = { id: "bert", key: "home" };
  run("manchester");
  assert.equal(state().rep, 4, "the grapevine catch docks 1");

  // lying to the same person's face docks 2
  state().rep = 5;
  state().convoQ = { id: "bert", key: "home" };
  run("london"); // different from what Bert now has (manchester)
  assert.equal(state().rep, 3, "a lie to her face docks 2");
});

test("reputation greets you at a stranger bar — but only at the notable tiers", () => {
  state().stage = "vacation"; state().flags.act1Done = true; state().nightTurn = 30;
  // a face on the soi: a warm welcome at a bar you don't know
  state().room = "beach_rd_c"; state().rep = 12; state().soc.greeted = {};
  out = []; _arriveAt("candy_bar");
  assert.match(lastOut(), /warmer|good ones|decided it likes/i, "a face gets a warm reception");
  // trouble: a cool one
  state().room = "beach_rd_c"; state().rep = -12; state().soc.greeted = {};
  out = []; _arriveAt("candy_bar");
  assert.match(lastOut(), /cools a half-degree|behind her hand|warm one/i, "trouble gets a cold shoulder");
  // a middling rep is unremarkable — no special line
  state().room = "beach_rd_c"; state().rep = 0; state().soc.greeted = {};
  out = []; _arriveAt("candy_bar");
  assert.doesNotMatch(lastOut(), /warmer|cools a half-degree|good ones|behind her hand/i, "a nobody gets no special reception");
});

test("QUIT/END/LOGOUT get a voiced refusal, not 'didn't parse'; RESET aliases RESTART", () => {
  // They were advertised in the autocomplete pool but had no handler — a typed
  // 'quit' fell through to the huh line, so the completion menu lied.
  state().stage = "vacation"; state().flags.act1Done = true;
  for (const v of ["quit", "end", "logout"]) {
    out = []; run(v);
    assert.match(lastOut(), /Nothing to quit|SLEEP|RESTART/i, `${v} gets the real answer`);
    assert.doesNotMatch(lastOut(), /didn't parse|no idea|blinks at you/i, `${v} isn't a parse miss`);
  }
  // RESET now means RESTART (start over from the taxi), not a parse miss
  newGame(); state().player.origin = "pi";
  out = []; run("reset");
  assert.equal(state().pendingChoice, "intro", "RESET re-runs character creation like RESTART");
});

test("_npcActions is the single source of a character's tap affordances (by role)", () => {
  // The terminal wheel used to hard-code the role→verb map; it now reads this.
  const short = id => _npcActions(id, false);
  const full = id => _npcActions(id, true);
  // everyone gets the safe basics
  for (const id of ["candy", "arm", "mala", "bert"]) {
    assert.deepEqual(short(id).slice(0, 2), ["talk", "examine"]);
    // PHOTO is off the card on purpose — on a character menu the word reads as
    // "show me a bigger picture of her" rather than "take one" (playtest).
    assert.ok(!short(id).includes("photo"), `${id}: photo stays off the character card`);
  }
  // a hostess: the full female economy on the long-press wheel
  const lek = Object.keys(NPC_ROLES).find(id => NPC_ROLES[id] === "hostess");
  // BARFINE takes the slot PHOTO left, but in the FULL menu only — it spends four
  // figures and ends the night, so it must never be a single mis-tap away
  assert.deepEqual(full(lek), ["talk", "examine", "buyher", "barfine", "flirt", "tip", "contact"]);
  assert.ok(!short(lek).includes("barfine"), "and never on the quick card");
  // cashier: buy-drink + tip/contact (the sponsor-cashier arc), no flirt; barfine only once flipped
  const cash = Object.keys(NPC_ROLES).find(id => NPC_ROLES[id] === "cashier" && !_sponsorFlipped(id));
  assert.deepEqual(full(cash), ["talk", "examine", "buyher", "tip", "contact"]);
  // host bar (gender-flipped): buyhim + hire
  assert.deepEqual(full("arm"), ["talk", "examine", "buyhim", "hire"]);
  // cabaret performer: the courtship rails, no barfine — the theatre keeps no ledger
  assert.deepEqual(full("mala"), ["talk", "examine", "buyher", "flirt", "tip", "contact"]);
  assert.deepEqual(full("petch"), ["talk", "examine", "buyher", "flirt", "tip", "contact"]);
  // a plain NPC (manager, unroled): a polite wai in the full wheel
  assert.deepEqual(full("bert"), ["talk", "examine", "wai"]);
  // a patron (not an NPC at all) and an unknown id: just the basics, no crash
  assert.deepEqual(full("glam"), ["talk", "examine"]);
  assert.deepEqual(full("nobody_here_xyz"), ["talk", "examine"]);
});

test("Act One is do-or-die: dawn without room 412 hard-resets to the beach", () => {
  // three milestones down the critical path, then the night runs out
  state().flags.knowWasHere = true;
  state().flags.knowMot = true;
  state().flags.knowOyHasIt = true;
  state().room = "beach_rd_c";
  state().money = 500;
  state().nightTurn = 99;
  run("wait");
  assert.match(lastOut(), /BEAT YOU HOME/, "the opening quest fails hard");
  assert.match(lastOut(), /THE LAST BAHT BUS/, "and the game restarts from the top");
  assert.equal(state().day, 2, "back to day two");
  assert.equal(state().room, "jomtien_beach", "back on the sand");
  assert.equal(state().stage, "act1");
  assert.ok(!state().flags.act1Done, "still the opening quest");
  assert.ok(!state().flags.knowMot, "the night's progress is wiped");
  assert.equal(state().act1Best, 3, "…except the high-water mark, which survives the reset");
});

test("Act One reset keeps a critical-path high-water mark, shown on the next run", () => {
  state().flags.knowWasHere = true;
  state().flags.knowMot = true;
  state().flags.knowOyHasIt = true;
  state().flags.knowDoorTrick = true;      // four milestones
  state().nightTurn = 99;
  run("wait");
  assert.equal(state().act1Best, 4);
  assert.match(lastOut(), /Furthest yet: 4\/7/, "a personal best is called out");
  assert.match(lastOut(), /Best run home so far: 4\/7/, "and echoed as the new run opens");
  // a worse run doesn't lower the mark
  state().flags.knowWasHere = true;         // just one this time
  state().nightTurn = 99;
  out = [];
  run("wait");
  assert.equal(state().act1Best, 4, "the best stands");
  assert.doesNotMatch(lastOut(), /Furthest yet/, "no false personal-best");
});

test("the taxi intro picks who you are (origin/personality/orientation), then opens the beach", () => {
  state().player.origin = null;  // a truly brand-new player, no identity yet
  out = [];
  engineIntro();
  assert.equal(state().pendingChoice, "intro", "the ride in gates the game");
  assert.match(lastOut(), /Tan/, "Tan is driving");
  // the language step is out while German is a frozen POC — origins come first
  assert.match(lastOut(), /homicide detective/, "the origins are offered first");
  run("4");                                   // the detective
  assert.match(lastOut(), /ask questions for a living/, "Tan reads you back");
  run("3");                                   // blunt
  run("2");                                   // open-minded
  assert.deepEqual(
    [state().player.origin, state().player.personality, state().player.orientation],
    ["pi", "blunt", "bi"], "all three land in G.player");
  assert.equal(state().pendingChoice, null, "the modal closes");
  assert.match(lastOut(), /face-down on\s+Jomtien beach|wallet is GONE/s, "and the beach opening follows");
});

test("origin NPCs: the archetype matching your pick is deactivated (you ARE him)", () => {
  state().room = "queen_vic";
  state().player.origin = "monger";   // you're the golfer, so the detective is a separate man
  assert.ok(_npcsHere().includes("doyle"), "Doyle the detective is in the world");
  state().player.origin = "pi";       // now you ARE the detective
  assert.ok(!_npcsHere().includes("doyle"), "your own archetype isn't a separate NPC");
  assert.equal(_findNpc("doyle"), null, "and you can't address him");
});

test("all seven origin archetypes are NPCs on Soi 6, each deactivated by its own pick, each a quest giver", () => {
  const origins = { doyle: "pi", wayne: "business", roy: "pension", macca: "redundancy",
                    pete: "running", rob: "married", barry: "monger" };
  const givers = {};
  for (const [qid, q] of Object.entries(QUESTS)) if (q.giver) givers[q.giver] = qid;
  for (const [id, origin] of Object.entries(origins)) {
    assert.equal(NPCS[id] && NPCS[id].origin, origin, `${id} carries origin "${origin}"`);
    assert.ok(givers[id], `${id} gives a quest`);
    state().room = _npcRoom(id);
    state().player.origin = origin === "pi" ? "monger" : "pi";  // you're someone else
    assert.ok(_npcsHere().includes(id), `${id} is present when you aren't him`);
    state().player.origin = origin;                             // you ARE him
    assert.ok(!_npcsHere().includes(id), `${id} is hidden when you're him`);
  }
});

test("Tan the driver: known from the intro, a hub whose knowingness escalates with the clues you gather", () => {
  // you rode in with him — he's a findable NPC at the soi mouth, no stranger
  state().player.origin = null; out = [];
  startSoi6Mode(); run("7"); run("1"); run("1");   // monger / charmer / straight (no language step)
  assert.ok(state().known.tan, "you know Tan after the taxi ride");
  assert.equal(_npcRoom("tan"), "soi6_street", "he's at the mouth of Soi 6");

  // the hub reveal needs you to have met a couple of the archetypes he drove
  state().room = "soi6_street"; state().player.origin = "pi"; // you're the detective, so he's driven the others
  out = []; run("ask tan about others");
  assert.doesNotMatch(lastOut(), /back seat|manifest/i, "he won't list them before you've met them");
  // KNOWING a name is not MEETING the man — a name printing in a room's roster
  // marks G.known, which is how a playtester got the full passenger list having
  // actually sat down with exactly one of them. It takes a conversation now.
  state().known.wayne = true; state().known.roy = true;
  out = []; run("ask tan about others");
  assert.doesNotMatch(lastOut(), /back seat|drove every one/i,
    "seeing a name on a roster doesn't count as having met him");
  state().talked.wayne = [0]; state().talked.roy = [0];
  out = []; run("ask tan about others");
  assert.match(lastOut(), /back seat|drove every one|ask the driver/i, "now he owns up to driving them all");
  // he names the two you've met, and points at the ones you haven't — the hub
  // works as an indirect guide to the rest of the cast, never as a quest marker
  assert.match(lastOut(), /Wayne|Roy/, "he names the men you actually sat with");
  assert.doesNotMatch(lastOut(), /\bPete\b|\bBarry\b/, "and doesn't spoil the ones you haven't");
  assert.match(lastOut(), /not met all of them|sitting still/i, "he points at the rest by place and habit");

  // the good-table topic: a smooth deflection until you've circled the quiet man
  // enough — and the chip palette must NOT advertise it before the fiction has
  // (the player hears of the table from prose, never from a menu; typed ASK is open)
  assert.ok(!_convoTopics("tan").includes("table"), "no 'table' chip before the clues exist");
  out = []; run("ask tan about table");
  assert.match(lastOut(), /don't ask about|not even me/i, "deflection before the clues add up");
  state().flags.orchidReported = true; state().flags.nameKept = true; state().flags.oldDaysHeard = true;
  assert.ok(_convoTopics("tan").includes("table"), "at ≥3 fragments the topic surfaces — the telegraph");
  out = []; run("ask tan about table");
  assert.match(lastOut(), /quiet man|drive taxis/i, "the near-confirmation — never quite stated");
  assert.ok(_flag("tanSuspected"), "hearing the near-confirmation arms the Orchid reveal");
});

test("the Orchid reveal: Tan at the good table — armed by the near-confirmation, fired on entry, once", () => {
  state().room = "orchid_room"; state().visited.orchid_room = true;
  // not armed yet: the room describes as normal, no reveal
  out = []; run("look");
  assert.doesNotMatch(out.join("\n"), /ridden behind it|arrivals ramp/i, "no reveal before he's armed it");
  assert.ok(!_flag("tanRevealed"));
  // armed: walking in (or LOOKing) pays off the whole web
  state().flags.tanSuspected = true;
  const happy0 = state().happy;
  out = []; run("look");
  assert.match(out.join("\n"), /you know that shirt|ridden behind it/i, "you recognise the airport driver");
  assert.match(out.join("\n"), /good table is empty/i, "and he's gone before your drink arrives");
  assert.ok(_flag("tanRevealed"), "the reveal flag sets");
  assert.ok(state().happy > happy0, "the payoff pays สนุก");
  // subsequent visits: a pooled you-know-now line, never the scene again
  out = []; run("look");
  const text = out.join("\n");
  assert.doesNotMatch(text, /ridden behind it/i, "the scene never replays");
  assert.ok(_TAN_TABLE_LINES.some(s => text.includes(s)), "a recurring good-table line from the pool");
  // and Tan's dialogue recalibrates: the table topic goes post-reveal
  state().room = "soi6_street"; state().player.origin = "pi";
  out = []; run("ask tan about table");
  assert.match(lastOut(), /never asked|full of tables/i, "post-reveal: confirmation stays unsaid");
  out = []; run("talk to tan");
  assert.match(lastOut(), /not the same at all|Good evening for a drive/i, "the greeting knows you know");
});

test("phone-Tan: the intro puts his card in your phone; the Soi 6 week needs no ride", () => {
  state().player.origin = null; out = [];
  startSoi6Mode(); run("7"); run("1"); run("1");   // monger / charmer / straight (no language step)
  assert.ok(state().phone.contacts.tan, "the airport card is your first contact");
  out = []; run("call tan");
  assert.match(lastOut(), /one soi|enjoy the falling/i, "one-soi week: he declines gracefully");
});

test("phone-Tan: the any-hour pickup is real — gated to the small hours, once a vacation", () => {
  state().phone.contacts.tan = true;
  // the do-or-die opening takes no shortcuts
  out = []; run("call tan");
  assert.match(lastOut(), /find the wallet|first night is on you/i, "no ride through Act One");
  // sandbox, buses still running: he points you at the ฿15 songthaew
  state().flags.act1Done = true; state().stage = "vacation";
  state().room = "beach_rd_c"; state().nightTurn = 30;
  out = []; run("call tan");
  assert.ok(_TAN_WAIT_LINES.some(s => out.join("\n").includes(s)), "before the cutoff: take the bus");
  assert.equal(state().room, "beach_rd_c", "no ride happened");
  // after the last bus: the grey sedan comes, door to door, free
  state().nightTurn = 85;
  const money0 = state().money;
  out = []; run("call tan");
  assert.match(out.join("\n"), /grey sedan|friendship rate/i, "the promise kept to the letter");
  assert.equal(state().room, _hotelRoomId(), "he sets you down at your own door");
  assert.equal(state().money, money0, "friendship rate — no fare");
  assert.equal(state().phone.tanRideVac, state().vacation, "the favour is spent");
  // same vacation, second call: tonight he is driving somebody
  state().room = "beach_rd_c"; state().nightTurn = 85;
  out = []; run("call tan");
  assert.ok(_TAN_BUSY_LINES.some(s => out.join("\n").includes(s)), "once a vacation — the parachute, not a taxi rank");
  assert.equal(state().room, "beach_rd_c", "no second ride");
  // calling from your own bed gets you told to sleep
  state().room = _hotelRoomId();
  out = []; run("call tan");
  assert.ok(_TAN_HOME_LINES.some(s => out.join("\n").includes(s)), "you are home, my friend");
});

test("phone-Tan: texts and transfers stay fixer-voiced, and the girl machinery ignores him", () => {
  state().flags.act1Done = true;
  state().phone.contacts.tan = true;
  // MESSAGE: no charm loop, no bond arithmetic — a fixer reply lands in the inbox
  out = []; run("message tan");
  assert.doesNotMatch(out.join("\n"), /short and sweet|charm/i, "not the girl path");
  assert.ok(state().phone.inbox.some(m => m.from === "tan" && _TAN_TEXT_REPLIES.includes(m.text)),
    "a fixer-voiced reply");
  assert.ok(!(state().soc.drinks.tan), "no bond bump");
  // SEND: the money comes straight back
  state().money = 2000;
  const money0 = state().money;
  out = []; run("send 500 to tan");
  assert.match(out.join("\n"), /comes straight back/i);
  assert.equal(state().money, money0, "he returns it");
  // the unprompted-text pool is ladies-only: with Tan as the sole contact it never fires
  state().phone.inbox = []; state().phone.lastText = -999;
  for (let i = 0; i < 40; i++) _maybeIncomingText();
  assert.equal(state().phone.inbox.length, 0, "Tan never texts the mama-sick patter");
  // and the black book stays a book of girls
  out = []; run("blackbook");
  assert.match(lastOut(), /book's empty/i, "the fixer doesn't rank on the bond ladder");
});

test("the safe answers to what a player actually types at a keypad", () => {
  // Regression: ENTER <digits> was the ONLY route, so `SAFE 719` and a bare
  // `719` — the two most natural inputs — hit the didn't-understand pool at
  // the climax of the opening quest.
  for (const cmd of ["safe 719", "719", "enter 719", "safe ๗๑๙"]) {
    newGame();
    state().player = { origin: "monger", personality: "joker", orientation: "straight" };
    state().room = "oy_office";
    out = []; run(cmd);
    assert.match(out.join("\n"), /clunk that sounds like forgiveness/,
      `"${cmd}" should open the safe`);
    assert.ok(_flag("hasWallet"), `"${cmd}" recovers the wallet`);
    assert.equal(state().money, WALLET_CASH, "and the prose's number IS the constant");
  }
  // a wrong number still costs you a try, in any phrasing
  newGame();
  state().player = { origin: "monger", personality: "joker", orientation: "straight" };
  state().room = "oy_office";
  out = []; run("safe 123");
  assert.ok(!_flag("hasWallet"));
  assert.ok(state().safeTries > 0, "a wrong code is a real attempt");
  // and SAFE with no number asks for one rather than falling through
  out = []; run("safe");
  assert.match(lastOut(), /Three digits/);
});

test("FOLLOW TAN: his standing food invite is real, once a night, and not during Act One", () => {
  state().lastPeddler = 9e9; state().lastSaleng = 9e9;
  state().room = "soi6_street";
  // Act One: he sends you after the wallet instead (the invite is a resident thing)
  delete state().flags.act1Done;
  out = []; run("follow tan");
  assert.match(lastOut(), /Find it\. THEN I feed you/i, "no free dinner before the wallet");
  assert.notEqual(state().soc.tanFedDay, state().day, "and nothing was consumed");

  // sandbox: the meal happens — feeds you, costs no baht, pays a little สนุก
  state().flags.act1Done = true;
  state().hunger = 80; state().thirst = 60; state().money = 500;
  const happy0 = state().happy, turn0 = state().turns;
  out = []; run("follow tan");
  const text = out.join("\n");
  assert.ok(_TAN_FOOD.some(s => text.includes(s)), "one of the authored carts");
  assert.ok(_TAN_FOOD_TALK.some(s => text.includes(s)), "…and the table talk");
  assert.ok(state().hunger < 30, "properly fed");
  assert.ok(state().thirst < 45, "and watered");
  assert.equal(state().money, 500, "he waves the money away — the fare is conversational");
  assert.ok(state().happy > happy0, "company pays");
  assert.ok(state().turns > turn0, "a meal costs night");
  assert.equal(state().soc.tanFedDay, state().day);

  // twice in one night: he laughs at you
  out = []; run("follow tan");
  assert.match(lastOut(), /Twice in one night|not your mother/i);
  // EAT WITH TAN is the same door (it used to hit the you're-not-carrying-that shrug)
  out = []; run("eat with tan");
  assert.match(lastOut(), /Twice in one night|not your mother/i, "same scene, other phrasing");
  // and the wheel offers it — the third surface
  assert.ok(_npcActions("tan", true).includes("follow"));
});

test("FOLLOW is a real verb everywhere else too — a voiced refusal, never a parse failure", () => {
  state().room = "stinky_bar";
  out = []; run("follow bert");
  assert.ok(_FOLLOW_NO.some(f => lastOut().includes(f("Bert"))), "Bert isn't leading a tour");
  assert.doesNotMatch(lastOut(), /didn't understand|didn't parse/i);
  out = []; run("follow nobody_at_all");
  assert.ok(_FOLLOW_NOBODY.some(s => lastOut().includes(s)), "and a voiced nobody-line");
  assert.doesNotMatch(lastOut(), /didn't understand|didn't parse/i);
});

test("canned replies: an NPC's question offers your own voice, by personality and origin", () => {
  state().lastPeddler = 9e9; state().lastSaleng = 9e9; // no encounter can eat the reply
  state().player = { origin: "pi", personality: "blunt", orientation: "straight" };
  state().room = "stinky_bar";
  out = []; run("talk to bert");
  // Bert asks "why"; a blunt player is offered the blunt line + the anybody one
  assert.equal(state().convoQ.key, "why");
  let reps = _askReplies("why");
  assert.ok(reps[0].includes("Next question"), "your personality's line comes first");
  assert.ok(reps.includes("Bit of both, if I'm honest"), "the anybody line rides along");
  assert.ok(reps.length <= 3, "capped — a bar chat, not a dialogue tree");
  assert.match(out.join("\n"), /Answer in your own words — or:/);
  assert.ok(_chipSet().map(c => c.cmd).includes(reps[0]), "the chip bar carries them");

  // a number picks one, and the TEXT is what's remembered (never the digit)
  out = []; run("1");
  assert.equal(state().player.said.why, reps[0]);
  assert.equal(state().convoQ, null, "the question is answered");

  // the origin axis answers the factual keys — and %home% quotes back a place
  state().player.origin = "married";
  assert.ok(_askReplies("home").includes("Buriram, half the year"), "origin picks the true answer");
  state().player.origin = "pi";
  assert.ok(_askReplies("home").includes("Chicago"));

  // an out-of-range digit re-prompts — it must never be stored as your answer.
  // (origin must not be "pi" here: you'd BE Doyle, and _npcActive hides him.)
  state().player.origin = "monger"; state().player.personality = "charmer";
  state().room = _npcRoom("doyle");
  run("talk to doyle");
  const before = JSON.stringify(state().player.said);
  out = []; run("9");
  assert.equal(JSON.stringify(state().player.said), before, "a stray digit isn't an answer");
  assert.match(out.join("\n"), /Answer in your own words/, "it re-prompts instead");
});

test("canned replies keep your story straight — or hand the grapevine the catch", () => {
  state().lastPeddler = 9e9; state().lastSaleng = 9e9;
  state().flags.act1Done = true; // reputation only runs in the sandbox
  state().player = { origin: "monger", personality: "joker", orientation: "straight" };
  // tell Bert your version
  state().room = "stinky_bar"; run("talk to bert"); run("1");
  const mine = state().player.said.why;
  // …tap the SAME voice for Pia (who asks the same key) — consistent, no catch
  state().room = _npcRoom("pia");
  out = []; run("talk to pia"); run("1");
  assert.equal(state().player.said.why, mine, "your voice is stable across the soi");
  // assert against the POOLS, never one string — _pickVary rotates variants
  const caught = t => _ANSWER_GOSSIP.some(f => t.includes(f("Pia", mine))) ||
                      _ANSWER_CAUGHT.some(f => t.includes(f("Pia")));
  assert.ok(!caught(out.join("\n")), "nothing to catch");
  // …but a different answer to the same question travels. Fresh week, same
  // two askers, second one answered in a different voice.
  newGame();
  state().lastPeddler = 9e9; state().lastSaleng = 9e9; state().flags.act1Done = true;
  state().player = { origin: "monger", personality: "joker", orientation: "straight" };
  state().room = "stinky_bar"; run("talk to bert"); run("1");
  const rep0 = state().rep;
  const told = state().player.said.why;
  state().room = _npcRoom("pia");
  out = []; run("talk to pia"); run("2");
  const text = out.join("\n");
  assert.ok(_ANSWER_GOSSIP.some(f => text.includes(f("Pia", told))), "told two ways — the grapevine has it");
  assert.ok(state().rep < rep0, "and the soi marks you down for it");
});

test("seed-of-the-day: _dailySeed is stable, startSoi6Mode takes it, and same seed + same commands = same week", () => {
  assert.equal(_dailySeed("2026-08-06"), _dailySeed("2026-08-06"), "stable hash");
  assert.notEqual(_dailySeed("2026-08-06"), _dailySeed("2026-08-07"), "dates differ");
  const s = _dailySeed("x");
  assert.ok(s >= 1 && s <= 2147483645, "lands in the LCG's range");

  const playOpening = seed => {
    state().player = { origin: "monger", personality: "joker", orientation: "straight" };
    startSoi6Mode({ seed, dailyId: "2026-08-06" });
    out = [];
    run("down"); run("buy beer"); run("out"); run("look");
    return out.join("\n");
  };
  const a = playOpening(777);
  assert.equal(state().dailyId, "2026-08-06", "the week knows it's the daily");
  const b = playOpening(777);
  assert.equal(a, b, "identical seed + commands → identical transcript (rule 2)");
  // and the daily line is advertised in the opening
  state().player = { origin: "monger", personality: "joker", orientation: "straight" };
  out = []; startSoi6Mode({ seed: 42, dailyId: "2026-08-06" });
  assert.match(out.join("\n"), /Today's soi — the 2026-08-06 daily/, "the opening names the daily");
  // PLAY AGAIN (no opts) is always a fresh, non-daily roll
  startSoi6Mode();
  assert.equal(state().dailyId, null, "the daily is once — a repeat week rolls its own");
});

test("the week card: nightLog records each night's ending and SHARE renders it, gate and all", () => {
  // the full game politely declines — the card is challenge furniture
  out = []; run("share");
  assert.match(lastOut(), /Soi 6 challenge thing/i);
  // a soi6 week logs its nights
  state().player = { origin: "monger", personality: "joker", orientation: "straight" };
  startSoi6Mode();
  assert.deepEqual(state().nightLog, [], "fresh week, empty spine");
  _endNight("barfine");
  _endNight("dawn");
  assert.deepEqual(state().nightLog, ["barfine", "dawn"]);
  // mid-week share: two emoji, five pending dots, no spoilers
  out = []; run("share");
  let text = out.join("\n");
  assert.match(text, /THE LAST BAHT BUS — Soi 6 \(free week\)/);
  assert.ok(text.includes("💋🌅·····"), "one emoji a night, the rest padded");
  assert.match(text, /สนุก \d+/);
  // week's end: the card auto-prints, and SHARE still answers through the gate
  state().day = 7;
  out = []; _endNight("sleep");
  assert.equal(state().pendingChoice, "vacation_end");
  text = out.join("\n");
  assert.match(text, /THE LAST BAHT BUS/, "the card is the week's parting shot");
  assert.match(text, /week complete/);
  out = []; run("share");
  assert.match(out.join("\n"), /💋🌅🛏····/, "three nights logged");
  assert.equal(state().pendingChoice, "vacation_end", "sharing doesn't answer the gate");
  assert.ok(_chipSet().map(c => c.cmd).includes("share"), "the chip bar offers the card");
});

test("the Peacock performers: real courtship for a bi player, the cabaret's own pass for a straight one", () => {
  state().flags.act1Done = true; state().stage = "vacation";
  state().room = "peacock_cabaret"; state().money = 5000;
  // straight (the beforeEach default): the flirt folds into the show — the
  // cabaret pool, never the bar-floor "the ladies are that way" pass
  out = []; run("flirt with petch");
  let text = out.join("\n");
  assert.ok(_LADYBOY_PASS_CAB.some(f => text.includes(f("Petch"))), "the show absorbs it");
  assert.ok(!_LADYBOY_PASS.some(f => text.includes(f("Petch"))), "not the bar-floor pass");
  // bi: falls through to the real social tiers
  state().player.orientation = "bi";
  out = []; run("flirt with petch");
  text = out.join("\n");
  assert.ok(out.length, "something answered");
  assert.ok(!_LADYBOY_PASS_CAB.concat(_LADYBOY_PASS).some(f => text.includes(f("Petch"))),
    "no pass for a bi player — she's a real option");
  // no barfine apparatus at the theatre, whoever's asking
  out = []; run("barfine petch");
  assert.ok(_PEACOCK_NO_BF.some(s => out.join("\n").includes(s)), "Miss Mala retires the question");
  // and the self-barfine thought never arrives at the cabaret
  state().nightTurn = 70; state().soc.drinks.petch = 13;
  for (let i = 0; i < 30; i++) _maybeSelfBarfine("petch");
  assert.ok(!state().pendingEnc, "no ledger to self-pay");
});

test("the Peacock bond arcs: the deeper cuts unlock at regular and her-farang tiers", () => {
  state().flags.act1Done = true;
  state().room = "peacock_cabaret";
  // a stranger gets the public dream
  out = []; run("ask petch about dream");
  assert.match(lastOut(), /Alcazar|biggest star in the smallest room/i, "the public version");
  assert.doesNotMatch(lastOut(), /Ploynapas/i, "the true version stays behind the bond");
  // a regular hears what happened with the scout
  state().soc.drinks.petch = 7;
  out = []; run("ask petch about dream");
  assert.match(lastOut(), /Ploynapas|pass me twice|cannot pass twice/i, "the true version");
  // her farang hears about Buriram
  state().soc.drinks.petch = 13;
  out = []; run("ask petch about family");
  assert.match(lastOut(), /gold chain|neighbours/i, "the mother who says 'star'");
  // Miss Mala: the daughters at regular, the name at her-farang
  state().soc.drinks.mala = 7;
  out = []; run("ask mala about girls");
  assert.match(lastOut(), /theatre of daughters|doses/i, "raise is the right word");
  state().soc.drinks.mala = 13;
  out = []; run("ask mala about name");
  assert.match(lastOut(), /cut a self|jewel/i, "the gem cutter's child");
});

test("NPC personality: their side of the axis gets the last word on compliment/joke/tease", () => {
  state().flags.act1Done = true;
  // a joker girl fires the tease straight back, stranger or not (Petch) — pin the
  // player to blunt so it's HER tilt doing the work, not the beforeEach joker's
  state().player.personality = "blunt";
  state().room = "peacock_cabaret";
  out = []; run("tease petch");
  let text = out.join("\n");
  assert.ok(_TALK_ACT_TEXT.tease.warm.some(f => text.includes(f("Petch"))), "the needle is the handshake");
  assert.ok(_NPC_PERS_NOTES.joker.some(f => text.includes(f("Petch"))), "and the note says why");
  // an operator hears the compliment, counts it, banks it — even fully warmed up
  // (player personality → joker, which has no compliment tilt of its own)
  state().player.personality = "joker";
  state().room = _npcRoom("mercedes");
  _npcState("mercedes").trust = 3; _npcState("mercedes").dstate = "familiar";
  out = []; run("compliment mercedes");
  text = out.join("\n");
  assert.ok(_TALK_ACT_TEXT.compliment.flat.some(f => text.includes(f("Mercedes"))), "counted, not felt");
  assert.ok(_NPC_PERS_NOTES.operator.some(f => text.includes(f("Mercedes"))), "the note explains the wall");
  // …and the operator outranks even a charmer player (NPC tilt is applied last)
  state().player.personality = "charmer";
  out = []; run("compliment mercedes");
  text = out.join("\n");
  assert.ok(_TALK_ACT_TEXT.compliment.flat.some(f => text.includes(f("Mercedes"))), "the operator outranks the charmer");
  // blunt Bert: flattery bounces off the tin roof
  state().player.personality = "joker";
  state().room = _npcRoom("bert");
  _npcState("bert").trust = 2; _npcState("bert").dstate = "familiar";
  out = []; run("compliment bert");
  text = out.join("\n");
  assert.ok(_TALK_ACT_TEXT.compliment.flat.some(f => text.includes(f("Bert"))), "say something true instead");
  // an untyped NPC is untouched by any of this — the tilt is strictly opt-in
  assert.equal(_npcPersTalkOutcome("lek", "compliment", "warm"), "warm");
  assert.equal(_npcPersTalkOutcome("lek", "joke", "flat"), "flat");
});

test("the detective's recon quest completes only after you've seen the Orchid's good table", () => {
  state().room = "queen_vic";
  state().player.origin = "monger";   // Doyle active
  state().quests.orchid_recon = "active";
  out = [];
  run("ask doyle about table");       // before the visit — a nudge, no completion
  assert.match(lastOut(), /back room|have a look|velvet-rope/i, "he sends you to look first");
  assert.ok(!_flag("orchidReported"), "nothing completes without the recon");

  state().visited = state().visited || {};
  state().visited.orchid_room = true; // now you've been inside
  out = [];
  run("ask doyle about table");
  assert.match(lastOut(), /soft-spoken Thai|the room bends|investigates you/i, "the reveal lands");
  assert.ok(_flag("orchidReported"), "the recon flag is set");
});

// The seven origin quests (one per playable origin — the one you ARE is
// deactivated). Each is given by its Soi 6 NPC, gated on trust, and completed by
// ASK <giver> ABOUT <topic>, which sets a doneFlag that _questTick pays out.
const _ORIGIN_QUESTS = [
  { qid: "orchid_recon", giver: "doyle", gOrigin: "pi",         topic: "table",    done: "orchidReported", pre: () => { state().visited = { orchid_room: true }; } },
  { qid: "nominee_deal", giver: "wayne", gOrigin: "business",   topic: "partner",  done: "nomineeWarned",  pre: () => { state().visited = { orchid_room: true }; } },
  { qid: "old_days",     giver: "roy",   gOrigin: "pension",    topic: "old days", done: "oldDaysHeard" },
  { qid: "easy_come",    giver: "macca", gOrigin: "redundancy", topic: "payout",   done: "payoutPaced" },
  { qid: "quiet_one",    giver: "pete",  gOrigin: "running",    topic: "name",     done: "nameKept" },
  { qid: "her_brother",  giver: "rob",   gOrigin: "married",    topic: "brother",  done: "brotherWord" },
  { qid: "wrong_shot",   giver: "barry", gOrigin: "monger",     topic: "photo",    done: "wrongShot",      pre: () => { state().visited = { orchid_room: true }; } },
];

test("every origin quest completes on ASK and pays its reward via _questTick", () => {
  for (const q of _ORIGIN_QUESTS) {
    newGame();
    state().stage = "vacation"; state().flags.act1Done = true;
    // be any origin BUT the giver's, so the giver NPC isn't deactivated
    state().player.origin = q.gOrigin === "pi" ? "monger" : "pi";
    state().player.personality = "joker"; state().player.orientation = "straight";
    assert.ok(_npcActive(q.giver), `${q.qid}: giver ${q.giver} is active for this identity`);
    if (q.pre) q.pre();
    state().room = _npcRoom(q.giver);          // present, and its own bar
    state().quests[q.qid] = "active";
    const money0 = state().money;
    out = [];
    run(`ask ${q.giver} about ${q.topic}`);
    assert.ok(_flag(q.done), `${q.qid}: the ASK set ${q.done}`);
    assert.equal(state().quests[q.qid], "done", `${q.qid}: _questTick closed it same-turn`);
    // NO banner: these are vignettes, and the ✦ QUEST COMPLETE chrome is what
    // made a two-turn scene read as a task the player had somehow finished
    // without understanding it (playtest, 2026-08-11).
    assert.doesNotMatch(lastOut(), /QUEST COMPLETE/, `${q.qid}: a vignette shouldn't print the quest banner`);
    const reward = QUESTS[q.qid].reward.money || 0;
    assert.equal(state().money, money0 + reward, `${q.qid}: paid its ฿${reward} reward`);
  }
});

test("an origin scene never offers itself as a job — it opens silently on TALK", () => {
  // Was: "a giver's job offer waits for you to answer their question" and "an
  // origin quest is offered on TALK once trust is earned, and ACCEPT activates
  // it". Both encoded the chrome we've just removed. The origin seven are
  // VIGNETTES now: the man whose life you didn't pick, telling you the thing he
  // tells nobody. No ✦ offer, no ACCEPT, no journal row — the giver just starts
  // talking to you properly once he knows you a little.
  state().stage = "vacation"; state().flags.act1Done = true;
  state().player.origin = "pi"; // not pension, so Roy is active
  state().room = _npcRoom("roy");

  // a near-stranger still gets nothing: the trust gate is the return visit
  _npcState("roy").trust = 0;
  assert.equal(_questAvailable("old_days"), false, "a cold giver opens nothing");
  out = []; run("talk roy");
  assert.doesNotMatch(lastOut(), /has a job for you|ACCEPT/i, "and no chrome on a first meeting");
  assert.ok(!state().quests.old_days, "nothing on the books yet");

  // trust is earned by coming back — every origin scene now needs a second
  // conversation at least (trust: 2 across all seven)
  assert.equal(QUESTS.old_days.trust, 2, "an origin scene takes more than one hello");
  _npcState("roy").trust = 2;
  assert.ok(_questAvailable("old_days"), "known enough now");
  out = []; run("talk roy");
  state().convoQ = null;       // his getting-to-know-you question, answered elsewhere
  out = []; run("talk roy");
  assert.doesNotMatch(lastOut(), /has a job for you|ACCEPT OLD_DAYS/i, "still never announced as a job");
  assert.equal(state().quests.old_days, "active", "it just quietly opened");

  // and it stays out of the player's job list and out of HINT
  out = []; run("quests");
  assert.doesNotMatch(out.join("\n"), /old days/i, "a vignette is not an adventure on the books");
});

test("_introMatch resolves a taxi-intro answer by number, exact id/label, and substring", () => {
  const t = ORIGINS;
  assert.equal(_introMatch("1", t).id, t[0].id, "a number picks by position");
  assert.equal(_introMatch("2", t).id, t[1].id);
  assert.equal(_introMatch("pi", t).id, "pi", "an exact id matches even under 4 chars");
  assert.equal(_introMatch("the detective", t).id, "pi", "an exact label matches");
  assert.equal(_introMatch("detective", t).id, "pi", "a ≥4-char substring of the label matches");
  assert.equal(_introMatch("invest", t).id, "business", "substring of 'The investor'");
  assert.equal(_introMatch("  PI. ", t).id, "pi", "whitespace + trailing punctuation are stripped");
  assert.equal(_introMatch("xyz", t), null, "a <4-char non-match is null (no wild substring)");
  assert.equal(_introMatch("99", t), null, "an out-of-range number falls through to null");
  assert.equal(_introMatch("", t), null, "empty is null");
});

test("the taxi intro gates Soi 6 mode too, then opens the week", () => {
  state().player.origin = null;
  out = [];
  startSoi6Mode();
  assert.equal(state().pendingChoice, "intro");
  assert.equal(state().introAfter, "soi6", "it will open the soi-6 week, not the beach");
  run("1"); run("7"); run("1"); run("1");     // English / monger / charmer / straight
  assert.equal(state().pendingChoice, null);
  assert.equal(state().mode, "soi6");
  assert.equal(state().room, "qv_room");
  assert.match(lastOut(), /planted your flag: SOI 6/, "the week's framing opens");
});

test("your identity is picked once and survives an Act One reset", () => {
  // beforeEach set monger/joker/straight; a hard fail must not re-ask it
  state().nightTurn = 99;
  run("wait");                                // dawn → _act1Fail → reset
  assert.equal(state().player.origin, "monger", "who you are carries across the reset");
  assert.notEqual(state().pendingChoice, "intro", "no second trip through the taxi");
  assert.match(lastOut(), /wallet is GONE|Jomtien beach/s, "straight back to the beach");
});

test("WHO AM I / IDENTITY report your character; the intro re-asks on nonsense", () => {
  assert.match((run("who am i"), lastOut()), /The monger.*Joker.*ladies/s);
  out = []; assert.match((run("identity"), lastOut()), /monger/i);
  // nonsense mid-intro just re-prompts
  state().player.origin = null; out = []; engineIntro();
  out = []; run("banana");
  assert.match(lastOut(), /a number, my friend/i, "Tan waves off a non-answer");
  assert.equal(state().pendingChoice, "intro", "still waiting");
});

test("the intro orients a brand-new player, then hands off to the hint loop", () => {
  out = [];
  engineIntro();                             // fresh game: act1Tries 0
  assert.match(lastOut(), /New here\?.*INVENTORY.*QUESTS/s, "run one teaches the interface");
  assert.doesNotMatch(lastOut(), /soi remembers|Best run home/, "no hint-loop chrome yet");
  state().act1Tries = 1;                      // once beaten, the orientation retires
  out = [];
  engineIntro();
  assert.doesNotMatch(lastOut(), /New here\?/, "the interface primer is a one-timer");
});

test("HINT is coy on the first run, then whispers the next step from round two", () => {
  // round one: no real hints, just the setup
  run("hint");
  assert.match(lastOut(), /No hints your first night/i);
  // a failure unlocks it (act1Tries → 1)
  state().nightTurn = 99;
  out = [];
  run("wait");                              // hard fail + reset
  assert.equal(state().act1Tries, 1, "the attempt counted");
  assert.match(lastOut(), /soi will whisper|type HINT/i, "and you're told hints are open now");
  // round two: HINT points at the first undone milestone (find out where you were)
  out = [];
  run("hint");
  assert.match(lastOut(), /soi whispers/i);
  assert.match(lastOut(), /Candy Bar mamasan|READ what's still/i, "step one: prove the night, ask Candy");
  // progress the path and the hint advances
  state().flags.knowWasHere = true;
  state().flags.knowMot = true;
  out = [];
  run("hint");
  assert.match(lastOut(), /Lek at Lucky Tiger|ASK LEK/i, "now it points at Lek for the fence");
  // wallet in hand → it stops nagging about clues
  state().flags.knowOyHasIt = true;
  state().flags.hasWallet = true;
  out = [];
  run("hint");
  assert.match(lastOut(), /room 412|before dawn/i, "last step: just get home");
});

test("HINT is offered in autocomplete", () => {
  assert.ok(engineComplete("hin").includes("hint"));
});

test("in the sandbox, HINT points at the active quest and where to go", () => {
  state().flags.act1Done = true;
  state().stage = "vacation";
  state().room = "beach_rd_c";
  state().quests.sangsom = "active";
  run("hint");
  assert.match(lastOut(), /Sister-Bar Run.*GIVE SANG SOM TO BEE/s, "the active quest and its move");
  assert.match(lastOut(), /Bee is at Candy Bar 2.*Myth Night/, "with the recipient's live location");
  // standing where Bee is → the 'where' clause self-suppresses
  state().room = "candy_bar_2";
  out = [];
  run("hint");
  assert.doesNotMatch(lastOut(), /Myth Night/, "no directions when you're already there");
});

test("sandbox HINT nudges an offer, then falls back when the books are empty", () => {
  state().flags.act1Done = true; state().stage = "vacation"; state().room = "beach_rd_c";
  state().quests.league = "offered";
  run("hint");
  assert.match(lastOut(), /ACCEPT LEAGUE/i, "an offer becomes an ACCEPT nudge");
  state().quests.league = undefined;
  out = [];
  run("hint");
  // the empty-books fallback names LIVE LEADS now rather than saying "talk to
  // people" — see _leads(). With a bare sandbox state there are no threads to
  // name, so it lands on the honest no-leads line.
  assert.match(out.join("\n"), /What's open:|Talk to people/i, "nothing on the books → go find one");
});

test("the quest journal shows the same live location as HINT", () => {
  state().flags.act1Done = true; state().stage = "vacation"; state().room = "beach_rd_c";
  state().quests.sangsom = "active";
  run("quests");
  assert.match(lastOut(), /Bee is at Candy Bar 2.*Myth Night/);
});

test("the bar manager: welcome shot, man drink, monopolise nudge — and NOT a lady", () => {
  state().flags.act1Done = true; state().stage = "vacation"; state().money = 1000;
  for (const k in ENCOUNTERS) state().encDone[k] = true; // silence street noise
  state().lastPeddler = 99999; state().lastPolice = 99999; // …and the cooldown-gated bar interruptions (peddler/police), so ticks don't eat a command
  assert.equal(NPCS.bert.manager, true, "Bert is the manager type");
  assert.ok(!NPC_ROLES.bert, "…and deliberately NOT in the lady-role map");
  // arriving is a free house shot, once per bar per night
  state().room = "beach_rd_s"; state().visited.stinky_bar = true;
  _arriveAt("stinky_bar");
  // assert against the POOL, not one line — this used to match a fixed
  // "House rule … first one's on me", which is precisely the coupling that
  // breaks the moment the line is varied (and it had to be varied: the generic
  // copy said "bud" in every manager's mouth, English ones included)
  const shotFired = () => _MGR_SHOT.some(l => lastOut().includes(_fmt(l, { n: "Bert" })));
  assert.ok(shotFired(), "the welcome shot");
  const drunkAfter = state().soc.drunk;
  out = [];
  _arriveAt("stinky_bar");
  assert.ok(!shotFired(), "only one welcome shot a night");
  assert.equal(state().soc.drunk, drunkAfter, "and no second free drunk tick");
  // a manager with his own `shot` pool uses it INSTEAD of the shared one — Bill
  // is thirty, English, and would never say "bud"
  out = []; state().room = "pratumnak_clubs"; state().visited.doghouse = true;
  _arriveAt("doghouse");
  assert.ok(NPCS.bill.shot.some(l => lastOut().includes(_fmt(l, { n: "Bill" }))),
    "Bill pours from his own pool");
  assert.ok(!_MGR_SHOT.some(l => lastOut().includes(_fmt(l, { n: "Bill" }))),
    "…and not from the generic one");
  // leaning on his time earns a nudge for a man drink
  state().room = "stinky_bar"; out = [];
  run("talk to bert", "ask bert about candy", "ask bert about owner");
  assert.match(lastOut(), /Stand us one|BUY MAN DRINK/i, "monopolise → nudge");
  // stand him one: costs a beer, builds goodwill, clears the debt
  out = [];
  run("buy man drink");
  assert.match(lastOut(), /speaking the language/i);
  assert.equal(state().money, 920, "a man drink is a beer's worth (฿80)");
  assert.equal(state().soc.manDrinks.bert, 1);
  assert.equal(state().soc.mgrChat.bert, 0, "the monopolise counter resets");
  // he is not a lady: no lady drink, no barfine
  out = [];
  run("buy lady drink for bert");
  assert.doesNotMatch(lastOut(), /lady drink for Bert/i, "you can't buy the manager a lady drink");
});

test("man drink is offered in the buy autocomplete only where a manager works", () => {
  state().flags.act1Done = true;
  state().room = "stinky_bar";
  assert.ok(engineComplete("buy ").includes("man drink"), "offered at Stinky's");
  state().room = "candy_bar";
  assert.ok(!engineComplete("buy ").includes("man drink"), "not where there's no manager");
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
  // Pink Lotus's mama Nee is a sharp operator (type:"operator") — her quiet 10% house
  // cut lifts the ฿700 base to ฿750, so ฿250 remains, not ฿300. The subtle mama tax.
  assert.equal(state().money, 250);
  assert.match(lastOut(), /Upstairs/i);
});

test("soi 6 drink-minimum: some girls want a few lady drinks before upstairs", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "sunset_dreams"; // Kwan, Soi 6
  state().money = 2000;
  state().nightTurn = 40;
  assert.equal(_soi6DrinkMin("kwan"), 5, "Kwan runs the policy this vacation");
  state().soc.drinks.kwan = 2; // past the base gate, short of the tariff
  run("barfine kwan");
  assert.ok(!state().pendingBf, "the ask is turned away, not opened");
  assert.match(lastOut(), /bar rule: 5 lady drink/i);
  // patience clears it — the tariff is a tab thing, re-checked each ask
  state().soc.drinks.kwan = 5;
  run("barfine kwan");
  assert.ok(state().pendingBf, "tariff met, upstairs is on the table");
  assert.match(lastOut(), /upfront as a menu/i);
  // reputation girls and the plain girls don't nickel-and-dime
  assert.equal(_soi6DrinkMin("joy"), 0, "Joy runs no policy this vacation");
});

// ── Massage: the legit heal, the oil special, and the soapy fishbowl ─────────
test("legit massage heals hurt and drunk, and refuses to sell the other thing", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "thai_massage";
  state().money = 1000;
  state().hurt = 2;
  state().soc.drunk = 4;
  run("massage");
  assert.equal(state().money, 700, "฿300 for the hour");
  assert.equal(state().hurt, 1, "the one mid-night repair for a banged-up night");
  assert.equal(state().soc.drunk, 2, "and it takes the edge off the Chang");
  assert.match(lastOut(), /actually mends you/i);
  run("massage special");
  assert.match(lastOut(), /Wrong shop/i, "Pensri doesn't do extras");
});

test("Moonshine Bar's house infusion dare is actually buyable", () => {
  // price auditor playtest (2026-08-23): the room's own prose ("Prik and Mek
  // ...dare you to try the house infusion") had no purchase path — BUY YA
  // DONG and DRINK YA DONG both refused.
  state().room = "moonshine_bar";
  state().money = 1000;
  run("buy ya dong");
  assert.equal(state().money, 900, `฿${YA_DONG_SHOT} a shot`);
  assert.match(lastOut(), /Prik pours/i);
  run("drink ya dong");
  assert.equal(state().money, 800, "DRINK routes to the same purchase");
});

test("Mama Yai's som tam arrives unasked, free, once a night — as promised", () => {
  // price auditor playtest (2026-08-23): the room's defining claim ("the som
  // tam arrives unasked and correct") was unreachable — BUY SOM TAM and BUY
  // FOOD both refused.
  state().room = "mama_yai";
  state().hunger = 80;
  run("eat");
  assert.equal(state().hunger, 50, "a real plate, free");
  assert.match(lastOut(), /arrives/i);
  run("eat");
  assert.match(lastOut(), /one plate a night/i, "capped once per night");
  assert.equal(state().hunger, 50, "the cap actually holds");
});

test("legit massage room prose promises the one flat price it actually charges", () => {
  // price auditor playtest (2026-08-23): Naklua Traditional and Ruean Sabai
  // both advertised a three-tier laminated list ("foot 250, Thai 300, herbal
  // compress 400" / "foot 250, Thai 300, oil 350") when the mechanic has
  // always been one flat ฿300 regardless of tier word — two of three
  // advertised prices were unreachable by any command. Fixed by rewording the
  // prose to match the mechanic rather than building unreachable tiers.
  for (const room of ["naklua_thai", "thai_massage"]) {
    const desc = ROOMS[room].desc;
    assert.doesNotMatch(desc, /\b250\b|\b350\b|\b400\b/, `${room} no longer promises a price it can't charge`);
    assert.match(desc, /300/, `${room} states the real flat price`);
  }
});

test("oil shop: base rub, then the warmth-gated special, capped once a night", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "smile_massage";
  state().money = 5000;
  run("massage");
  assert.equal(state().money, 4700, "฿300 oil base");
  assert.match(lastOut(), /SPECIAL/);
  const jaded0 = state().jaded;
  run("special");
  assert.equal(state().money, 4000, "the special is ฿700 on top of the base");
  assert.equal(state().jaded, jaded0 + 1, "a real release feeds the hedonic treadmill");
  assert.match(lastOut(), /finish work|my place/i, "the on-premises wall points off-shift");
  run("special"); // one is the ration
  assert.match(lastOut(), /Greedy|ration/i);
  assert.equal(state().money, 4000, "no double-dip");
  // and no barfine here — she's not a bar girl
  run("barfine waan");
  assert.match(lastOut(), /not a bar girl/i);
});

test("soapy fishbowl: pick a number, one set price, once a night", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "poseidon_soapy";
  state().money = 5000;
  run("soapy");
  assert.ok(state().pendingSoapy, "the menu is a modal that waits on a number");
  assert.match(lastOut(), /super star/i);
  run("71"); // the super-star tier
  assert.ok(!state().pendingSoapy, "picking resolves it");
  assert.equal(state().money, 2800, "฿2200 set package, no haggling");
  assert.match(lastOut(), /on the premises/i);
  run("soapy"); // once through Poseidon is plenty
  assert.match(lastOut(), /Again\?|plenty/i);
  assert.ok(!state().pendingSoapy);
});

test("the massage row spreads across town: generic parlors work like the flagships", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().money = 5000;
  // a generic oil parlor with no named masseuse still does the base + special
  state().room = "buakhao_oil";
  run("massage");
  assert.match(lastOut(), /the masseuse/i);
  run("special");
  assert.match(lastOut(), /finish work|my place/i);
  // a generic legit parlor still heals
  state().room = "jomtien_thai";
  state().hurt = 2;
  run("massage");
  assert.equal(state().hurt, 1, "legit massage mends anywhere in town");
  // the second soapy reads with its own manageress, not Poseidon's Toom
  state().room = "honey_soapy";
  run("soapy");
  assert.ok(state().pendingSoapy);
  assert.doesNotMatch(lastOut(), /Toom/, "the prose isn't hardwired to Poseidon");
});

test("Soi Honey: reachable off Second Road, three beer bars, one rotating mama", () => {
  // the soi has its OWN Second Road junction now: Diana, then Honey, then Myth
  // Night, then Central, which is the order they come in on the ground
  assert.equal(ROOMS.second_rd_honey.exits.e, "soi_honey_w");
  // Soi Buakhao has NO direct link to Second Road, at this end or any other —
  // it is a long soi and you leave it by one of its cross-sois (Klang, Diana,
  // LK, Honey) or off its foot at Pattaya Tai. The old second_rd_s ⟷ buakhao_s
  // exit was one hop standing in for that whole leg, and the map's last >90°
  // lie (99°) into the bargain.
  assert.equal(ROOMS.second_rd_s.exits.e, undefined, "no phantom cross-street to Buakhao");
  assert.equal(ROOMS.buakhao_s.exits.w, undefined, "and not from the other side either");
  for (const id of ["honey_trap", "queen_bee", "buzz_inn"]) {
    assert.equal(ROOMS[id].barType, "beer", `${id} is a beer bar`);
    const girls = Object.keys(NPCS).filter(n => NPC_ROLES[n] === "hostess" && _npcRoom(n) === id);
    assert.ok(girls.length >= 2, `${id} has its hostesses`);
  }
  // Kesorn owns all three and works one a night — present at exactly one
  const herBars = ["honey_trap", "queen_bee", "buzz_inn"].filter(id => _npcRoom("kesorn") === id);
  assert.equal(herBars.length, 1, "the mama is at exactly one of her bars tonight");
});

test("Soi Diana: threads Second Rd to Buakhao past LK Metro, four beer bars, KISS, Areca", () => {
  // through-soi: Second Rd → the three segments → Buakhao's 7/11 corner.
  // The soi hangs off its OWN Second Road junction (46 m away), not off
  // second_rd_c via a `diana:` key from 489 m up the road — that was the
  // pre-junction shortcut, it never had a way back, and it outlived the
  // junction that replaced it. See the one-way-exit invariant in world.test.js.
  assert.equal(ROOMS.second_rd_diana.exits.e, "diana_w");
  assert.equal(ROOMS.second_rd_c.exits.diana, undefined, "the old bypass is gone");
  assert.equal(ROOMS.diana_w.exits.e, "diana_mid");
  assert.equal(ROOMS.diana_mid.exits.e, "diana_e");
  assert.equal(ROOMS.diana_e.exits.e, "buakhao_n");
  // the far arm of the LK Metro L opens onto the soi
  // the alley opens onto Soi Diana at its ENTRANCE; the bend is a block further in
  assert.equal(ROOMS.diana_e.exits.lk, "lk_entrance");
  assert.equal(ROOMS.lk_entrance.exits.out, "diana_e", "…and back out the same mouth");
  // four populated bars — all beer (the go-go action is inside LK Metro, not on the soi)
  const bars = ["dollhouse", "sapphire", "sundowner", "cricketers"];
  assert.deepEqual(bars.map(b => ROOMS[b].barType), ["beer", "beer", "beer", "beer"]);
  for (const b of bars) {
    const girls = Object.keys(NPCS).filter(n => NPC_ROLES[n] === "hostess" && _npcRoom(n) === b);
    assert.ok(girls.length >= 2, `${b} is populated`);
  }
  // one madam, working exactly one of her four houses tonight
  assert.equal(bars.filter(b => _npcRoom("lawan") === b).length, 1);
  // KISS feeds you
  assert.ok(FOOD_STALLS.kiss, "KISS is on the menu");
});

test("Soi 7 (Jomtien): beach road to Second Rd, four beer bars, Rompho Market, KISS Jomtien", () => {
  // Soi 7 is the south side of the Jomtien rectangle, running W → M → E
  assert.equal(ROOMS.jomtien_soi_7_w.exits.w, "jomtien_beach_rd_s", "SW corner: beach-road south");
  assert.equal(ROOMS.jomtien_soi_7_w.exits.e, "jomtien_soi_7_m");
  assert.equal(ROOMS.jomtien_soi_7_m.exits.e, "jomtien_soi_7_e");
  assert.equal(ROOMS.jomtien_soi_7_e.exits.e, "jomtien_2nd", "SE corner: Second Road south");
  assert.ok(ROOMS.jomtien_2nd.seven, "7-Eleven on the corner");
  // across Second Road: Rompho Market and KISS are food VENUES you ENTER off the
  // road (Rompho off the Soi 7 corner, KISS off the middle), each leaving via out
  assert.ok(ROOMS.jomtien_2nd.venues.includes("soi_rompho"));
  assert.equal(ROOMS.soi_rompho.exits.out, "jomtien_2nd");
  assert.ok(ROOMS.jomtien_2nd_m.venues.includes("kiss_jomtien"));
  assert.equal(ROOMS.kiss_jomtien.exits.out, "jomtien_2nd_m");
  assert.ok(FOOD_STALLS.kiss_jomtien && FOOD_STALLS.soi_rompho, "both feed you");
  // the immigration office is flavor at the dark east end, not a room
  state().room = "jomtien_soi_7_e"; out = []; run("look");
  assert.match(lastOut(), /immigration/i);
  assert.ok(!ROOMS.chonburi_immigration, "immigration is a mention, not a place");
  // four beer bars, populated, with Sumalee working one of them
  const bars = ["lucky7", "seabreeze", "coconut", "sandbar"];
  assert.deepEqual(bars.map(b => ROOMS[b].barType), ["beer", "beer", "beer", "beer"]);
  for (const b of bars) {
    assert.ok(Object.keys(NPCS).filter(n => NPC_ROLES[n] === "hostess" && _npcRoom(n) === b).length >= 2, `${b} populated`);
  }
  assert.equal(bars.filter(b => _npcRoom("sumalee") === b).length, 1);
});

test("Thappraya Main Strip: reached east off the beach road, the mix of venues, Diamond the katoey mama", () => {
  // the strip is reached by walking east off the north end of the beach road — no climb off
  // the sand any more; the beach is a continuous sand lane parallel to the road
  assert.equal(ROOMS.jomtien_beach_rd_n.exits.e, "thappraya_w", "beach road bends east into the strip");
  assert.ok(!ROOMS.dongtan_beach.exits.up, "no up-climb off the sand");
  assert.equal(ROOMS.dongtan_beach.exits.e, "jomtien_beach_rd_n", "the overlap sand steps east onto its parallel road");
  // the sand and the road are PARALLEL lanes, one node each, and dongtan_rd_s had
  // no partner — so dongtan_beach_s went in between, and the sand steps to it
  assert.equal(ROOMS.dongtan_beach.exits.n, "dongtan_beach_s", "the sand runs on north up the Dongtan shore");
  assert.equal(ROOMS.dongtan_beach_s.exits.e, "dongtan_rd_s", "…and every sand node has its road opposite");
  assert.equal(ROOMS.jomtien_beach_rd_n.exits.n, "dongtan_rd_s", "the ROAD lane runs road-to-road, not onto the sand");
  assert.equal(ROOMS.thappraya_w.exits.e, "thappraya_mid");
  assert.equal(ROOMS.thappraya_mid.exits.e, "thappraya_e");
  assert.ok(ROOMS.thappraya_w.seven && ROOMS.thappraya_e.seven, "a 7-Eleven at each end");
  // Supertown alley is a side-soi off the strip's north side — a road now (not a
  // `super` verb), with its host bar and drag cabaret fronting it as venues
  assert.equal(ROOMS.thappraya_mid.exits.n, "supertown_alley", "mouth on the strip's north side");
  assert.equal(ROOMS.supertown_alley.exits.s, "thappraya_mid", "…and back");
  assert.equal(ROOMS.supertown_alley.exits.e, "supertown_elbow");
  // the hill room is NORTH of the complex, not east of it — Supertown sits at the
  // bend where Thappraya turns to climb, so the elbow goes up, not across
  assert.equal(ROOMS.supertown_elbow.exits.n, "thappraya_ext_s", "elbow onto the north extension");
  assert.equal(ROOMS.thappraya_ext_s.exits.s, "supertown_elbow", "…and back");
  assert.ok(!ROOMS.supertown_elbow.bar && !ROOMS.supertown_alley.barType, "the alley/elbow are pass-through, not bars");
  assert.ok(ROOMS.supertown_alley.venues.includes("adonis_club") &&
    ROOMS.supertown_elbow.venues.includes("peacock_cabaret"), "the host bar and cabaret front the alley");
  // the Pratumnak north extension: two roads climb the hill and join at the crest,
  // walkable as a loop back down the Dongtan sand and east onto the beach road / strip
  // (thappraya_e up → … → dongtan_rd_s → s → jomtien_beach_rd_n → e → thappraya_w)
  // the hill link carries BOTH a cardinal and `up`: 351° is 9° off due north,
  // so n is honest and — unlike a named exit — actually draws on the KML, which
  // is how this link came to look missing in the first place. `up` stays
  // because it is the better word for a climb.
  assert.equal(ROOMS.thappraya_e.exits.up, "thappraya_ext_s");
  assert.equal(ROOMS.thappraya_e.exits.n, "thappraya_ext_s");
  assert.equal(ROOMS.thappraya_ext_s.exits.n, "thappraya_ext_m");
  assert.equal(ROOMS.thappraya_ext_m.exits.n, "thappraya_ext_n");
  assert.equal(ROOMS.thappraya_ext_n.exits.w, "pratumnak_hill_rd");
  // the crest reaches Dongtan Beach Road through the Soi 5 turn, not in one
  // 1,119 m stride across a junction that is really there
  assert.equal(ROOMS.pratumnak_hill_rd.exits.w, "pratumnak_clubs");
  assert.equal(ROOMS.pratumnak_clubs.exits.w, "pratumnak_soi5");
  // the lower half of Soi 5 is two blocks of open-air bars now, so the crest
  // reaches Dongtan Beach Road through them rather than in one 532 m stride
  assert.equal(ROOMS.pratumnak_soi5.exits.w, "pratumnak_soi5_m");
  assert.equal(ROOMS.pratumnak_soi5_m.exits.w, "pratumnak_soi5_b");
  assert.equal(ROOMS.pratumnak_soi5_b.exits.w, "dongtan_rd_n", "the crest links both north ends");
  assert.equal(ROOMS.dongtan_rd_n.exits.s, "dongtan_rd_m");
  assert.equal(ROOMS.dongtan_rd_m.exits.s, "dongtan_rd_s");
  // the road lane runs road-to-road all the way down; you reach the sand by
  // stepping WEST off it, the way every other pair on this shore works
  assert.equal(ROOMS.dongtan_rd_s.exits.s, "jomtien_beach_rd_n", "the road lane continues onto Jomtien Beach Road");
  assert.equal(ROOMS.dongtan_rd_s.exits.w, "dongtan_beach_s", "…and the sand is a step west, not a step south");
  assert.notEqual(ROOMS.pratumnak_hill_rd.name, ROOMS.pratumnak_rd.name, "the two Pratumnak roads read distinctly");
  // the venue mix
  assert.equal(ROOMS.hyper.barType, "gogo");
  assert.equal(ROOMS.take_care_me.barType, "pub");
  assert.ok(ROOMS.take_care_me.band, "the rock pub has live music");
  assert.deepEqual(["arrow_bar", "cheeky_monkey", "the_office"].map(b => ROOMS[b].barType), ["beer", "beer", "beer"]);
  assert.deepEqual(["the_boardroom", "velvet_club"].map(b => ROOMS[b].barType), ["gents", "gents"]);
  // Diamond runs Hyper (fixed), Wimon the beer bars and Ampai the gents (rotating)
  assert.equal(NPC_ROLES.diamond, "mamasan");
  assert.equal(_npcRoom("diamond"), "hyper", "Diamond holds her own floor");
  assert.equal(["arrow_bar", "cheeky_monkey", "the_office"].filter(b => _npcRoom("wimon") === b).length, 1);
  assert.equal(["the_boardroom", "velvet_club"].filter(b => _npcRoom("ampai") === b).length, 1);
  // Hyper and the beer bars are populated
  for (const b of ["hyper", "arrow_bar", "the_boardroom"]) {
    assert.ok(Object.keys(NPCS).filter(n => NPC_ROLES[n] === "hostess" && _npcRoom(n) === b).length >= 2, `${b} populated`);
  }
});

test("venues: buildings are entered by name off a block, not a compass point; OUT honors the door", () => {
  state().flags.act1Done = true;
  // a migrated block's cardinal exits are roads only — its bars are in `venues`
  state().room = "thappraya_mid";
  assert.deepEqual(Object.keys(ROOMS.thappraya_mid.exits).sort(), ["e", "n", "w"], "roads only on the strip block");
  assert.ok(!Object.values(ROOMS.thappraya_mid.exits).some(to => ROOMS[to].bar), "no bar sits on a compass exit");
  assert.ok(ROOMS.thappraya_mid.venues.includes("hyper"));
  run("enter hyper");
  assert.equal(state().room, "hyper", "entered by name, no direction involved");
  run("out");
  assert.equal(state().room, "thappraya_mid", "OUT returns to the block");
  // a two-door venue: OUT returns you to whichever road you walked in from
  state().room = "thappraya_e"; run("enter take care me", "out");
  assert.equal(state().room, "thappraya_e", "in off the strip, out to the strip");
  state().room = "jomtien_2nd_n"; run("enter take care me", "out");
  assert.equal(state().room, "jomtien_2nd_n", "in off Second Road, out to Second Road");
});

test("Glam: the Cheeky Monkey regular, shuttled to Hyper, and protected", () => {
  const g = PATRONS.glam;
  assert.equal(g.home, "cheeky_monkey");
  assert.ok(g.protected, "age, money and standing put him off-limits");
  // early evening at Cheeky Monkey; escorted across to Hyper after 22:00
  state().nightTurn = 20; assert.equal(_patronRoom("glam"), "cheeky_monkey");
  state().nightTurn = 55; assert.equal(_patronRoom("glam"), "hyper");
  // harming a protected regular gets the swift repercussion, not the usual shrug
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().nightTurn = 20; state().room = "cheeky_monkey";
  out = []; run("kill glam");
  assert.match(lastOut(), /put you in the road|changes temperature/i);
  assert.ok((state().soc.heat.cheeky_monkey || 0) >= 2, "and it costs you heat");
});

test("_questWhere tracks a shuttled patron giver's live bar, not a stale room", () => {
  // oldrocker/quietmoney target Glam, who is at Cheeky Monkey early and walked over
  // to Hyper after 22:00. _questWhere must read his LIVE room, not a fixed one.
  state().room = "sunset_rail"; // somewhere else, so the clause isn't suppressed
  state().nightTurn = 20;
  const early = _questWhere("glam");
  assert.match(early, /Cheeky Monkey/, "before 22:00 he's at his home bar");
  state().nightTurn = 55;
  const late = _questWhere("glam");
  assert.match(late, /Hyper/, "after the shuttle the clue follows him to Hyper");
  assert.notEqual(early, late, "the where-clause actually moved with him");
  // and it self-suppresses when you're already with him
  state().room = "hyper";
  assert.equal(_questWhere("glam"), "", "no direction when you're in the room");
});

test("Fergie: haunts Buakhao & Tree Town, shifting tall tales, and the Bert/Candy landmine", () => {
  const f = PATRONS.fergie;
  assert.equal(f.home, "gold_rush");
  assert.ok(f.hops && f.haunts.includes("Soi Buakhao") && f.haunts.includes("Tree Town"));
  // region-limited hopping — never Candy's bar, never out of his two districts
  const seen = new Set();
  for (let d = 1; d <= 8; d++) { state().day = d; for (let t = 0; t < 40; t += 10) { state().nightTurn = t; seen.add(_patronRoom("fergie")); } }
  assert.ok(!seen.has("candy_bar"), "banned from Candy's, so he skips it");
  for (const r of seen) assert.ok(["Soi Buakhao", "Tree Town"].includes(ROOMS[r].region), `${r} out of his manor`);
  // the stories never agree with each other
  state().room = "gold_rush";
  state().patronTalk = { day: 1, talked: {} }; out = []; _patronTalk("fergie", "army"); const army = lastOut();
  state().patronTalk = { day: 1, talked: {} }; out = []; _patronTalk("fergie", "china"); const china = lastOut();
  assert.notEqual(army, china, "a different lie every time you probe");
  // Bert/Candy is a landmine: a cold warning most nights, an actual swing on his nasty ones
  let sawWarn = false, sawSwing = false;
  for (let d = 1; d <= 30 && !(sawWarn && sawSwing); d++) {
    state().day = d; state().hurt = 0; state().soc.heat = {}; out = [];
    _patronTalk("fergie", "bert");
    if (/swinging|HELL did you say/i.test(lastOut())) { sawSwing = true; assert.equal(state().hurt, 1, "a swing costs you a knock"); }
    else { sawWarn = true; assert.equal(state().hurt, 0, "a warning leaves you whole"); }
  }
  assert.ok(sawWarn && sawSwing, "some nights a warning, some nights he swings");
});

test("Nira: the scam-compound loan-shark hostess with the numbers hook", () => {
  assert.equal(NPC_ROLES.nira, "hostess");
  assert.equal(NPCS.nira.room, "neon_paradise");
  state().room = "neon_paradise";
  out = []; run("ask nira about money");
  assert.match(lastOut(), /twenty percent|ยี่สิบ/);
  out = []; run("ask nira about cambodia");
  assert.match(lastOut(), /compound|border/i);
});

test("Nira's loan: borrow at 20%, due in three days, one at a time", () => {
  state().flags.act1Done = true; state().stage = "expat";
  state().money = 1000; state().day = 2;
  // can't borrow away from her
  state().room = "beach_rd_c"; out = []; run("borrow 5000");
  assert.ok(!state().loan, "no lending away from Neon Paradise");
  // borrow at Neon Paradise: cash now, owe principal +20%, due in three days
  state().room = "neon_paradise"; out = []; run("borrow 5000");
  assert.equal(state().money, 6000, "the 5k lands in your pocket");
  assert.equal(state().loan.owed, 6000, "you owe 5000 + 20%");
  assert.equal(state().loan.dueDay, 5, "due three days out");
  // one loan at a time
  out = []; run("borrow 3000");
  assert.equal(state().money, 6000, "she won't stack a second loan");
  assert.match(lastOut(), /one loan at a time/i);
  // over the ceiling is refused
  state().loan = null; out = []; run("borrow 99999");
  assert.ok(!state().loan, "฿20,000 ceiling holds");
});

test("Nira's loan: repay on time clears it and earns her regard", () => {
  state().flags.act1Done = true; state().stage = "expat";
  state().room = "neon_paradise"; state().money = 10000; state().day = 2;
  run("borrow 5000");
  const bond = state().soc.drinks.nira || 0;
  out = []; run("repay 2000"); // partial
  assert.equal(state().loan.owed, 4000, "partial payment knocks it down");
  out = []; run("repay"); // the rest
  assert.ok(!state().loan, "paid in full, loan cleared");
  assert.equal(state().money, 9000, "spent exactly the 6000 owed on a 5000 loan");
  assert.ok((state().soc.drinks.nira || 0) > bond, "a man who pays earns her regard");
});

test("Nira's loan: miss the date and it compounds, then the cousins collect", () => {
  state().flags.act1Done = true; state().stage = "expat";
  state().room = "neon_paradise"; state().money = 10000; state().day = 2;
  run("borrow 5000"); // owe 6000, due day 5
  // three overdue nights: text, then asking-around, then a garnish
  state().money = 3000;
  state().day = state().loan.dueDay; _endNight("sleep"); // day 6
  assert.equal(state().loan.strikes, 1, "first overdue night: a warning text");
  assert.equal(state().loan.owed, 7200, "overdue compounds 20% a night");
  _endNight("sleep"); // day 7, strike 2
  assert.equal(state().loan.strikes, 2);
  const owedBefore = state().loan.owed, cash = state().money;
  _endNight("sleep"); // day 8, strike 3 — collection
  assert.ok(state().money < cash, "the cousins take the cash you're carrying");
  assert.ok(!state().loan || state().loan.owed < owedBefore, "and put it against the debt");
});

test("Hyper's upstairs: Diamond bond-gates the reveal, then ST goes on-site", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true; state().money = 5000;
  state().room = "hyper";
  out = []; run("ask diamond about upstairs");
  assert.ok(!state().flags.hyperUpstairs, "a stranger gets the deflection, not the secret");
  state().soc.drinks.diamond = 7; // regular tier — she trusts you now
  out = []; run("ask diamond about upstairs");
  assert.ok(state().flags.hyperUpstairs, "the trusted regular learns Hyper's upstairs");
  // ST at Hyper now flips from a take-out hotel to the on-site rooms
  state().nightTurn = 45;
  let onsite = false;
  for (const g of _npcsHere().filter(id => NPC_ROLES[id] === "hostess")) {
    state().soc.drinks[g] = 6; state().soc.bfRefused = {};
    out = []; run("barfine " + g);
    if (state().pendingBf) { out = []; run("short time"); if (/back stair|rooms the brothers/i.test(lastOut())) onsite = true; break; }
  }
  assert.ok(onsite, "short-time at Hyper goes up, not out");
});

test("the club pickup: a free-feeling night, then the ฿2,000 taxi", () => {
  state().flags.act1Done = true; state().flags.hasWallet = true; state().money = 5000;
  state().room = "ws_north"; state().nightTurn = 45;
  _startEnc("clubpickup");
  run("take her home");
  assert.ok(state().flags.taxiPending, "the night happened; the invoice is coming in the morning");
  const before = state().money; out = []; run("pay");
  assert.equal(before - state().money, 2000, "the morning 'taxi money'");
  assert.match(lastOut(), /good man|see you tonight/i);
  // and the other way: question it and the fantasy collapses
  state().money = 5000; state().room = "ws_south"; state().nightTurn = 45; state().encDone = {};
  _startEnc("clubpickup"); run("take her home"); out = []; run("bolt where do you live");
  assert.match(lastOut(), /amateur|record scratch|accountant/i);
});

test("gift-as-contract: 'free' is a tab, and tao rai closes it", () => {
  state().flags.act1Done = true; state().room = "promenade";
  state().money = 3000; state().encDone = {};
  _startEnc("freegift"); let before = state().money; out = []; run("accept thanks");
  assert.equal(before - state().money, 500, "accepting the 'free' gift signs for it — the debt is called in");
  state().money = 3000; state().encDone = {};
  _startEnc("freegift"); before = state().money; out = []; run("tao rai");
  assert.equal(before - state().money, 100, "asking the price closes the account for a token");
  assert.match(lastOut(), /not new here/i);
});

test("Supertown: the Peacock Cabaret drag revue is populated and watchable", () => {
  // the once-padlocked stage now opens onto a real venue with performers
  assert.equal(ROOMS.peacock_cabaret.bar, "The Peacock Cabaret");
  assert.ok(!ROOMS.peacock_cabaret.barType, "a cabaret, not a barfine bar");
  assert.equal(NPCS.mala.room, "peacock_cabaret");
  assert.equal(NPCS.petch.room, "peacock_cabaret");
  state().flags.act1Done = true; state().room = "supertown_elbow";
  run("enter peacock");
  assert.equal(state().room, "peacock_cabaret");
  // WATCH DRAG pays a happy point once a night, like the other free shows
  const h = state().happy; state().dragDay = 0;
  out = []; run("watch drag");
  assert.equal(state().happy, h + 1, "the show pays its สนุก");
  out = []; run("watch drag");
  assert.equal(state().happy, h + 1, "but only once a night");
  // the role-less performers still take a tip (drag-style, no barfine)
  state().money = 5000;
  out = []; run("tip petch 200");
  assert.equal(state().money, 4800, "Petch takes the tip");
});

test("The Adonis Club: a male host bar priced at the premium end, open to all", () => {
  // the venue + cast exist and it's NOT a barfine bar
  assert.equal(ROOMS.adonis_club.bar, "The Adonis Club");
  assert.ok(ROOMS.adonis_club.hostBar && !ROOMS.adonis_club.barType);
  for (const id of ["nott", "arm", "win"]) assert.equal(NPCS[id].room, "adonis_club");
  // premium pricing: 2x+ the female rates
  assert.ok(HOST_DRINK >= LADY_DRINK * 2, "a host drink is at least double a lady drink");
  assert.ok(HOST_OFF >= BF_GOGO * 2, "the off-fee at least doubles the go-go barfine");
  state().flags.act1Done = true; state().room = "adonis_club"; state().money = 10000;
  // BUY DRINK FOR runs the host track, not the (female-coded) lady-drink path
  out = []; run("buy drink for win");
  assert.equal(state().money, 10000 - HOST_DRINK);
  assert.equal(state().soc.drinks.win, 1, "the host warms up");
  // HIRE is the club off-fee
  out = []; run("hire arm");
  assert.equal(state().money, 10000 - HOST_DRINK - HOST_OFF);
});

test("Queer venues: a slur brings the classic fight, milder bashing just gets you barred", () => {
  // a slur or a swing → the fight scene: hurt, and barred from the whole strip
  state().flags.act1Done = true; state().stage = "expat"; state().money = 5000;
  state().hurt = 0; state().turns = 50; state().room = "adonis_club";
  out = []; run("you faggots");
  assert.ok(state().hurt >= 2, "you take a beating");
  assert.notEqual(state().room, "adonis_club", "and you're put out on the soi");
  assert.ok(state().soc.banned.adonis_club !== undefined && state().soc.banned.peacock_cabaret !== undefined,
    "the whole strip is barred to you");
  // and the ban actually holds on re-entry (these venues have no barType)
  run("adonis");
  assert.notEqual(state().room, "adonis_club", "the doorman turns you away");
  // milder bigotry (no slur, no swing) → ejection without the beating
  state().hurt = 0; state().turns = 50; state().room = "peacock_cabaret";
  out = []; run("you are all disgusting");
  assert.equal(state().hurt, 0, "no fists for a mere bigot");
  assert.notEqual(state().room, "peacock_cabaret", "but out you go");
  // legit commands in the venue are untouched
  state().room = "adonis_club"; state().soc.banned = {}; state().money = 10000;
  out = []; run("talk nott");
  assert.equal(state().room, "adonis_club", "talking is not a hate crime");
});

test("the Glam saga: four rungs from the tour story to 'He is my father'", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 5000;
  state().nightTurn = 5; // before Glam's shuttle to Hyper
  // 1 — Wimon offers; Glam's tour story (patron dialogue `sets`) completes it
  state().room = NPCS.wimon.room; run("talk wimon"); run("accept oldrocker");
  state().room = "cheeky_monkey";
  out = []; run("ask glam about music");
  assert.ok(state().flags.glamHeard, "the patron sets support fires");
  assert.equal(state().quests.oldrocker, "done");
  // 2 — the keys reach Diamond's shrine (generic GIVE, no whitelist)
  state().room = NPCS.wimon.room; run("talk wimon"); run("accept keys");
  assert.equal(state().itemLoc.foreman_keys, "inventory");
  state().room = "hyper";
  out = []; run("give keys to diamond");
  assert.match(lastOut(), /hang where they belong/);
  run("look");
  assert.equal(state().quests.keys, "done");
  // 3 — Diamond points you at the quiet money; Glam's lucid flash answers
  run("talk diamond"); run("accept quietmoney");
  state().room = "cheeky_monkey";
  out = []; run("ask glam about sons");
  assert.match(lastOut(), /There is no rest|inheritance/i);
  run("look");
  assert.equal(state().quests.quietmoney, "done");
  // 4 — with Wimon's blessing, Diamond says it out loud
  state().room = NPCS.wimon.room; run("talk wimon"); run("accept family");
  state().room = "hyper";
  out = []; run("ask diamond about glam");
  assert.match(lastOut(), /He is my father/);
  run("look");
  assert.equal(state().quests.family, "done");
});

test("Diamond deflects about Glam until the money truth is known", () => {
  state().flags.act1Done = true; state().room = "hyper";
  out = []; run("ask diamond about glam");
  assert.match(lastOut(), /old friend of the house/i, "the req gate holds");
  assert.ok(!state().flags.diamondTruth);
});

test("Candy's recce: eyes on all three new strips pays out", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 1000;
  state().room = NPCS.candy.room; run("talk candy"); run("accept recce");
  assert.equal(state().quests.recce, "active");
  for (const r of ["myth_rows", "tt_lane_3", "soi6_mid"]) { state().room = r; run("look"); }
  run("look");
  assert.equal(state().quests.recce, "done");
  assert.equal(state().money, 1300, "Candy pays ฿300 for the intel");
});

test("the scout flyer and the collection run complete on their flags", () => {
  // scout: Mala's flyer to Diamond
  state().flags.act1Done = true; state().stage = "expat"; state().money = 1000;
  state().room = "peacock_cabaret"; run("talk mala"); run("accept scout");
  assert.equal(state().itemLoc.revue_flyer, "inventory");
  state().room = "hyper";
  out = []; run("give flyer to diamond");
  assert.match(lastOut(), /consider it done/);
  run("look");
  assert.equal(state().quests.scout, "done");
  // debtrun: Nira's ฿500 for jogging Fergie's memory
  state().room = "neon_paradise"; run("talk nira"); run("accept debtrun");
  const before = state().money;
  out = []; _patronTalk("fergie", "debt");
  assert.match(lastOut(), /next week/i);
  run("look");
  assert.equal(state().quests.debtrun, "done");
  assert.equal(state().money, before + 500, "Nira pays the runner");
});

test("the Jomtien beach cats: Big One vets, Little One purrs, once a day pays", () => {
  state().flags.act1Done = true; state().stage = "expat";
  state().day = 3; state().catDay = 0; state().room = "jomtien_beach";
  assert.equal(state().itemLoc.soi_cats, "jomtien_beach", "the sisters hold the lounger");
  out = []; run("examine cats");
  assert.match(lastOut(), /Big One and Little One/);
  // reaching for the little one goes through her sister first — always
  const h = state().happy;
  out = []; run("pet little one");
  assert.match(lastOut(), /between your hand and her sister/);
  assert.equal(state().happy, h + 1, "the daily blessing");
  out = []; run("pet cats");
  assert.equal(state().happy, h + 1, "but only once a day");
  // they are not for taking
  out = []; run("take cats");
  assert.equal(state().itemLoc.soi_cats, "jomtien_beach");
});

test("Sai Krok: feed a soi dog once and you have a dog, whether you meant to or not", () => {
  state().flags.act1Done = true; state().stage = "expat";
  for (const k in ENCOUNTERS) state().encDone[k] = true; // silence street noise
  state().money = 1000; state().room = "beach_rd_c";
  // act-1 noodles are the accidental adoption fee
  out = []; run("feed dog");
  assert.ok(state().dog, "he choose you, na");
  assert.equal(state().itemLoc.noodles, null, "goodbye, dinner — hello, dog");
  // he follows: at heel outside, under the rail in open-air beer bars,
  // outside the door where there's a door
  out = []; run("look");
  assert.match(out.join("\n"), /pads at your heel/);
  state().room = "candy_bar"; // beer bar: open-air, no door to stop him
  out = []; run("look");
  assert.match(out.join("\n"), /under the rail/);
  state().room = "kinky"; // a go-go has a door, and he knows the rule
  out = []; run("look");
  assert.match(out.join("\n"), /folds up outside the door/);
});

test("Sai Krok pays his keep: dark sois, the scam muscle, and your pockets", () => {
  // the dark-soi dog threat is defused, never escalates
  state().flags.act1Done = true; state().stage = "expat";
  state().dog = { since: 1 }; state().money = 5000;
  state().hurt = 0; state().darkStreak = 0; state().lightOn = false;
  state().room = "ws_alley"; // dark
  run("look"); run("look"); run("look");
  assert.equal(state().hurt, 0, "no bites with your own dog on the soi");
  assert.ok(state().darkStreak <= 1, "the streak holds, never escalates");
  // the tonic-shop muscle recalculates
  state().room = "beach_rd_c"; state().tonicOwed = 0;
  _startEnc("tonic"); run("follow him to the shop");
  out = []; run("no, let me leave");
  assert.match(lastOut(), /recalculate/);
  assert.equal(state().money, 5000, "you walk out clean");
  assert.equal(state().tonicOwed, 0, "nothing to report — nothing was taken");
  // and a rough night doesn't empty your pockets
  state().money = 2222; state().room = "ws_north";
  _endNight("dawn");
  assert.ok(state().money > 0, "nobody works a farang whose dog is watching");
});

test("The Shamrock Dog: dog-gated quest, and the walk to the dead pub", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 1000;
  for (const k in ENCOUNTERS) state().encDone[k] = true; // silence street noise — a stray pendingEnc eats the next command
  // no dog: Bert never mentions it (reqFlags gate), and it can't be accepted
  state().dog = null; delete state().flags.hasDog; state().room = "stinky_bar";
  out = []; run("talk bert"); state().convoQ = null; run("talk bert"); // clear his 'why' so his first job (league) gets offered
  assert.ok(!/Shamrock Dog/.test(out.join("\n")), "no dog, no quest");
  out = []; run("accept shamrock");
  assert.notEqual(state().quests.shamrock, "active", "reqFlags holds against a direct ACCEPT");
  // adopt; a giver with a quest already on the table surfaces his NEXT job
  state().room = "beach_rd_c"; run("feed dog");
  state().room = "stinky_bar";
  state().convoQ = null; // his one 'why are you here' question already dealt with — don't hold the offer
  out = []; run("talk bert");
  assert.match(out.join("\n"), /Shamrock Dog/, "Bert recognises the dog at your heel");
  run("accept shamrock");
  // the walk: the scene fires once, the tag comes home, the quest completes
  state().room = "khao_talo_strip";
  out = []; run("look");
  assert.match(out.join("\n"), /SEAMUS/);
  assert.match(out.join("\n"), /soidog\.org/, "the Soi Dog Foundation shout-out rides the scene");
  assert.equal(state().itemLoc.brass_tag, "inventory");
  run("look");
  assert.equal(state().quests.shamrock, "done");
});

test("NAME DOG: rename him and every line of his re-letters, no strays", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 1000;
  for (const k in ENCOUNTERS) state().encDone[k] = true; // silence street noise
  // no dog, no naming rights
  state().dog = null;
  out = []; run("name dog rex");
  assert.match(lastOut(), /haven't got a dog/);
  // adopt, rename (parser lowercases input; the name gets its dignity back)
  state().room = "beach_rd_c"; run("feed dog");
  out = []; run("name dog biscuit");
  assert.equal(state().dog.name, "Biscuit");
  assert.match(lastOut(), /official: Biscuit/);
  // the whole repertoire re-letters: presence, examine, and no Sai Krok strays
  out = []; run("look");
  assert.match(out.join("\n"), /Biscuit pads at your heel/);
  assert.ok(!/Sai Krok/.test(out.join("\n")), "no stray default-name lines");
  out = []; run("examine biscuit");
  assert.match(lastOut(), /Biscuit: a Pattaya-special soi dog/);
  // bare NAME DOG reports the current name
  out = []; run("name dog");
  assert.match(lastOut(), /Biscuit/);
  // review fixes: he answers to the new name on every verb, and $-names render
  out = []; run("feed biscuit");
  assert.ok(!/Feed who, exactly/.test(lastOut()), "FEED knows his new name");
  state().itemLoc.moo_ping = "inventory";
  out = []; run("give moo ping to biscuit");
  assert.match(lastOut(), /gentleness/, "GIVE routes to the renamed dog");
  out = []; run("pet"); // bare PET away from the cats' beach = the dog at hand
  assert.match(lastOut(), /Biscuit/, "bare PET reaches your own dog");
  run("name dog bo$$");
  out = []; run("look");
  assert.match(out.join("\n"), /Bo\$\$ pads at your heel/, "replacement-magic $ names render literally");
});

test("the host bar serves your own beer, at host-bar prices", () => {
  state().flags.act1Done = true; state().money = 1000; state().room = "adonis_club";
  out = []; run("buy beer");
  assert.equal(state().money, 1000 - HOST_BEER);
  assert.match(lastOut(), /host-bar prices/);
});

test("Sai Krok socialises: beer-bar staff favor (once a night) and rain reactions", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().dog = { since: 1 };
  state().room = "candy_bar";
  // the favor roll is ~50% — across attempts it must fire, and only bump once per roll
  let bumps = 0;
  for (let i = 0; i < 30 && !bumps; i++) {
    state().soc.dogFavor = {};
    const staff = _npcsHere().filter(id => NPC_ROLES[id]);
    const before = staff.reduce((s, id) => s + (state().soc.drinks[id] || 0), 0);
    _dogBarFavor();
    bumps = staff.reduce((s, id) => s + (state().soc.drinks[id] || 0), 0) - before;
  }
  assert.equal(bumps, 1, "the fuss lands as exactly one bond bump");
  // once-per-bar-per-night guard
  const staff = _npcsHere().filter(id => NPC_ROLES[id]);
  const total = () => staff.reduce((s, id) => s + (state().soc.drinks[id] || 0), 0);
  const t = total();
  _dogBarFavor(); _dogBarFavor();
  assert.equal(total(), t, "no double-dipping the same bar tonight");
  // rain: he reacts where he's in sight — beer bar and street (prose rotates,
  // but every variant names him) — and not from behind a door
  state().rain = 0; out = []; _startRain(5);
  assert.match(out.join("\n"), /Sai Krok/, "a beer-bar rain reaction");
  state().rain = 0; state().room = "beach_rd_c"; out = []; _startRain(5);
  assert.match(out.join("\n"), /Sai Krok/, "a street rain reaction");
  state().rain = 0; state().room = "kinky"; out = []; _startRain(5);
  assert.ok(!/Sai Krok/.test(out.join("\n")), "out of sight behind a go-go door, no line");
});

test("Sai Krok travels: free on the songthaew, ฿10 for his own bike on a motosai", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 1000;
  // the baht bus: he rides along free, no fare complication, no dog line without a dog
  state().dog = null; state().room = "jomtien_beach_rd"; state().nightTurn = 10;
  run("ride bus to beach");
  out = []; run("pay " + state().pendingFare.price);
  assert.ok(!/Sai Krok/.test(out.join("\n")), "no dog, no line");
  assert.equal(state().room, "beach_rd_s");
  state().dog = { since: 1 }; state().money = 1000;
  state().room = "jomtien_beach_rd"; state().nightTurn = 10;
  run("ride bus to beach");
  const before = state().money;
  out = []; run("pay " + state().pendingFare.price);
  assert.match(out.join("\n"), /Sai Krok/, "he rides the songthaew");
  assert.equal(before - state().money, BUS_FARE, "no surcharge on the bus — he rides free");
  // motosai: one pillion seat, already full — a piwin waves over a buddy's
  // saleng for him, ฿10 on top of the fare (renamed dog re-letters correctly)
  state().dog = { since: 1, name: "Biscuit" }; state().room = "jomtien_beach_rd"; state().money = 1000;
  const beforeMoto = state().money;
  out = []; run("motosai to town");
  assert.match(out.join("\n"), /Biscuit/, "paid motosai ride, renamed dog");
  assert.ok(!/Sai Krok/.test(out.join("\n")), "no stray default name");
  assert.equal(beforeMoto - state().money, MOTOSAI_TOWN + DOG_MOTOSAI_FARE, "fare + his ฿10");
  // the broke pity-ride: free for both rider and dog, no ฿10
  state().room = "sukhumvit_crossing"; state().money = 0;
  out = []; run("motosai to town");
  assert.match(out.join("\n"), /Biscuit/, "the pity-ride dog line still fires");
  assert.equal(state().money, 0, "no charge for him either, not even the ฿10");
});

test("Areca Lodge is a fourth hotel you can check into", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().stage = "vacation";
  state().hotel = "sabai";
  state().room = "hotel_room";
  state().nightTurn = 2;
  state().money = 5000;
  assert.ok(_HOTELS.areca && _HOTELS.areca.room === "areca_room", "Areca is in the hotel table");
  run("checkout");
  assert.match(lastOut(), /Areca Lodge/i, "it's offered at the desk");
  run("areca");
  assert.equal(state().hotel, "areca");
  assert.equal(state().room, "areca_room", "you wake at the Areca now");
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

// ── v2 barfine seeds: the draw, the kept girl, and too much reality ─────────

test("a prized draw is blocked early, priced up, and gouged in prose", () => {
  // dao is a hash-picked draw at vacation 1; lek is not.
  assert.ok(_isDraw("dao"), "dao is a draw");
  assert.ok(!_isDraw("lek"), "lek is rank and file");
  // premium: a draw costs more to the bar than a plain go-go girl at base rate
  state().nightTurn = 40; // 22:00 — base window
  assert.ok(_barfinePrice("gogo", "dao") > _barfinePrice("gogo", "lek"),
    "the draw carries a premium");
  // and gets NO midnight discount
  state().nightTurn = 65;
  assert.ok(_barfinePrice("gogo", "dao") > _barfinePrice("gogo", "lek"),
    "still premium past midnight — no discount for a draw");
  // before midnight the mama won't let her go: a NO with a number on it
  state().nightTurn = 40;
  const r = _bfRefusal("dao", "gogo");
  assert.equal(r && r.kind, "draw");
  // after midnight the block lifts (she's takeable, at a price)
  state().nightTurn = 65;
  assert.ok(!_bfRefusal("dao", "gogo") || _bfRefusal("dao", "gogo").kind !== "draw",
    "the draw block lifts after midnight");
});

test("draw block shows the gouge and doesn't open a negotiation", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "tequila_queen"; // dao's bar
  state().money = 8000;
  state().nightTurn = 40;
  state().soc.drinks.dao = 6; // clears the favor gate
  run("barfine dao");
  assert.ok(!state().pendingBf, "no negotiation — it's a refusal");
  assert.match(lastOut(), /bring me many customer|after midnight/i);
});

test("a kept girl is off while her sponsor is in town — except family night", () => {
  assert.ok(_hasSponsor("gift"), "gift is a kept girl");
  // window runs days 2..4, family night is day 2 (computed from the hash)
  state().day = 3; // in town, not family night
  assert.equal((_bfRefusal("gift", "gogo") || {}).kind, "sponsor");
  state().day = 2; // his family night — she's free
  assert.notEqual((_bfRefusal("gift", "gogo") || {}).kind, "sponsor");
  state().day = 6; // sponsor's flown home
  assert.notEqual((_bfRefusal("gift", "gogo") || {}).kind, "sponsor");
});

test("long time can hand you the whole person: less สนุก, deeper bond", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "lucky_tiger";
  state().money = 3000;
  state().nightTurn = 50;
  state().day = 2;          // lek rolls the reality beat on day 2
  state().soc.drinks.lek = 6;
  const bond = state().soc.drinks.lek;
  run("barfine lek");
  run("long time");
  assert.equal(state().day, 3, "the night still ends");
  assert.match(lastOut(), /five-year|really know her/i, "the reality prose, not the fantasy");
  // +6 for the reality beat, less the −1 nightly bond decay = net +5 (a plain
  // grand ending would be +3 −1 = +2, so this cleanly reads as the deeper path)
  assert.ok(state().soc.drinks.lek >= bond + 5, "seeing the real her deepens the bond");
});

test("the night ride: a bonded lady offers to show you HER Pattaya", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 20000;
  state().room = NPCS.lek.room;
  // a stranger (no bond) never gets the offer — across every day (reset the bond
  // each iteration, since the honest-overnight fallback climbs it otherwise)
  let strangerOffered = false;
  for (let d = 2; d < 40; d++) {
    state().day = d; state().money = 20000; state().soc.bfRefused = {}; state().soc.drinks.lek = 0;
    state().pendingBf = { id: "lek", base: 1000 };
    out = []; _bfResolve("lt");
    if (/show you MY Pattaya/.test(out.join(""))) strangerOffered = true;
    state().pendingEnc = null; state().rideSeq = null;
  }
  assert.ok(!strangerOffered, "a stranger just gets the plain overnight, never the ride");
  // a regular (bond tier 2) gets it — day-stable, so search for a firing day
  let day = 0;
  for (let d = 2; d < 40 && !day; d++) {
    state().day = d; state().money = 20000; state().soc.bfRefused = {}; state().soc.drinks.lek = 8;
    state().pendingBf = { id: "lek", base: 1000 };
    out = []; _bfResolve("lt");
    if (/show you MY Pattaya/.test(out.join(""))) day = d;
    else { state().pendingEnc = null; state().rideSeq = null; }
  }
  assert.ok(day, "a lady who likes you offers the ride");
  assert.equal(state().pendingEnc, "nightride");
});

test("the night ride: stops cost money, pay non-jading สนุก, deepen the bond, and end the night", () => {
  state().flags.act1Done = true; state().stage = "expat"; state().money = 20000; state().day = 5;
  state().room = NPCS.lek.room; state().soc.drinks.lek = 8;
  // drive the loop directly, past the probabilistic offer
  state().rideSeq = { id: "lek", fine: 1000, spent: 0, stops: 0, sanuk: 0, seen: [] };
  state().pendingEnc = "nightride";
  const bond0 = state().soc.drinks.lek, happy0 = state().happy, money0 = state().money;
  run("ride on"); run("ride on"); run("ride on");
  assert.equal(state().rideSeq.stops, 3, "three stops taken");
  assert.ok(state().money < money0, "the night out costs real money");
  assert.ok(state().happy > happy0, "and pays its สนุก");
  assert.ok(state().soc.drinks.lek >= bond0 + 3, "every stop deepens the bond");
  // calling it ends the night (day rolls) via the barfine payoff
  const day0 = state().day;
  run("no, take me home with you");
  assert.equal(state().rideSeq, null, "the ride is over");
  assert.equal(state().day, day0 + 1, "and the night ends");
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
  // scam prose is POOLED (per the house rule) — assert the printed line is one of
  // the kind's pool variants, not a single fixed string (playtest 2026-08-22 found
  // the old fixed strings repeating verbatim). Pools: _SCAM_RUNNER/_MAO/_LEAVE.
  const pools = { runner: _SCAM_RUNNER, mao: _SCAM_MAO, leaveAfter: _SCAM_LEAVE };
  for (const [seed, kind] of [[2, "runner"], [5, "mao"], [8, "leaveAfter"]]) {
    newGame(); state().lastSaleng = 99999;
    state().flags.act1Done = true; state().flags.hasWallet = true;
    state().room = "candy_bar"; state().money = 5000; state().nightTurn = 40;
    state().soc.drinks.bua = 4;
    state().pendingBf = { id: "bua", st: 400, lt: 700, room: "candy_bar" };
    state().rng = seed;
    out = [];
    _bfResolve("lt");
    const gn = NPCS.bua.name;
    assert.ok(pools[kind].some(f => lastOut().includes(f(gn))),
      kind + " prose didn't come from its pool");
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
  // the honest upfront lady-time (aom's life-hash, day 1) — BEFORE any money
  newGame(); state().lastSaleng = 99999;
  state().flags.act1Done = true; state().flags.hasWallet = true;
  state().day = 1; state().room = "club_mirage"; state().money = 5000;
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

test("the ATM: withdraw pulls from the account, minus a fee, capped at ฿20k/day", () => {
  state().flags.hasWallet = true;
  state().room = "beach_rd_c"; // an ATM stands here
  state().bank = 100000; state().money = 0; state().atmDay = 0; state().atmToday = 0; state().day = 3;
  run("withdraw 5000");
  assert.equal(state().money, 5000, "฿5k to pocket");
  assert.equal(state().bank, 100000 - 5000 - 300, "principal + ฿300 fee off the account");
  // note guard: any ฿1k multiple is composable from the tray (2026-08-22 —
  // "withdraw 20000" used to force two pulls and a double fee); non-multiples refuse
  out = []; run("withdraw 2000");
  assert.doesNotMatch(lastOut(), /1,000.*5,000.*10,000/, "฿2k is two ฿1k notes — legal now");
  assert.equal(state().money, 7000, "the composable ฿2k paid out");
  out = []; run("withdraw 2500");
  assert.match(lastOut(), /1,000.*5,000.*10,000/, "a non-multiple still gets the notes line");
  assert.equal(state().money, 7000, "no change on a bad denomination");
  // daily cap: 5k + 2k + 10k = 17k drawn; the next 10k would be 27k → refused
  run("withdraw 10000");
  out = []; run("withdraw 10000");
  assert.match(lastOut(), /daily limit|left until tomorrow/i);
  assert.equal(state().money, 17000, "capped at ฿20k principal per day");
  // balance reads the account, pocket, and the day's allowance
  out = []; run("check balance");
  assert.match(lastOut(), /Account:.*in pocket:.*withdrawn today/i);
  // no wallet → no card → no cash
  state().flags.hasWallet = false;
  out = []; run("withdraw 1000");
  assert.match(lastOut(), /No card, no cash|wallet/i);
  // and only at an ATM
  state().flags.hasWallet = true; state().room = "qv_room";
  out = []; run("withdraw 1000");
  assert.match(lastOut(), /No ATM here/i);
});

test("Soi 6 mode: starts at the Queen Vic, confined to the soi, no bus out, sabai win", () => {
  startSoi6Mode();
  assert.equal(state().mode, "soi6");
  assert.equal(state().room, "qv_room");
  assert.equal(state().money, 1000);
  assert.equal(state().bank, 100000);
  assert.equal(state().hotel, "queenvic");
  assert.equal(state().day, 1);
  assert.ok(state().flags.hasWallet && state().flags.act1Done, "has card, skips Act One");
  assert.ok(state().battery >= 80, "starts charged — not the Act-One 13% that would kill the phone by turn 13");
  // confined: the roads out of the soi are refused; in-soi moves are fine
  state().room = "beach_rd_n";
  run("s"); // beach_rd_c is out of bounds
  assert.equal(state().room, "beach_rd_n", "can't leave the soi to the south");
  assert.match(lastOut(), /this trip|one street|entire world|edge of the soi/i);
  run("n"); // naklua_rd out of bounds
  assert.equal(state().room, "beach_rd_n");
  run("w"); // north_beach (across Beach Road) in bounds
  assert.equal(state().room, "north_beach", "the beach across the road is in bounds");
  run("e"); // and back to the junction, then east into the soi
  assert.equal(state().room, "beach_rd_n");
  run("e");
  assert.equal(state().room, "soi6_street", "east into the west end of the soi");
  run("e");
  assert.equal(state().room, "soi6_mid", "the new quiet middle stretch is in bounds");
  // the bus is waved on
  state().room = "beach_rd_n"; out = [];
  run("ride bus to walking street");
  assert.match(lastOut(), /wave it on|aren't yours/i);
  assert.equal(state().room, "beach_rd_n", "no leaving by bus");
  // week's end: สบายสบาย is the win, PLAY AGAIN restarts the mode
  state().day = 7; state().happy = 100; out = [];
  _endVacation();
  assert.match(lastOut(), /สบายสบาย|maxed the week/);
  assert.equal(state().pendingChoice, "vacation_end");
  run("play again");
  assert.equal(state().room, "qv_room");
  assert.equal(state().day, 1);
});

test("inventory surfaces the three condoms you start with, and drops them when spent", () => {
  startSoi6Mode();
  assert.equal(state().condoms, 3, "the week starts with three");
  run("inventory");
  assert.match(lastOut(), /3 condoms/, "visible in the carrying list");
  state().condoms = 1; out = [];
  run("i");
  assert.match(lastOut(), /1 condom\b/, "singular when down to one");
  state().condoms = 0; out = [];
  run("i");
  assert.doesNotMatch(lastOut(), /condom/, "gone from the list when spent");
});

test("TAKE agrees with EXAMINE on a generic _SCENERY fixture (no room-desc contradiction)", () => {
  // verb-auditor playtest (2026-08-23): EXAMINE POSTER answers via the
  // generic _SCENERY fallback in any room that plausibly has one, but TAKE's
  // "advertised fixture" check only scanned the room's own desc text — so a
  // room whose poster is purely generic-fallback flavor (not named in its
  // own desc) let EXAMINE POSTER succeed and TAKE POSTER call it "not here",
  // a same-room, same-turn contradiction.
  state().room = "moonshine_bar"; // a plain beer bar with no authored poster reads: entry
  run("examine poster");
  assert.doesNotMatch(lastOut(), /don't see that here/i);
  out = [];
  run("take poster");
  assert.match(lastOut(), /fixtures, not luggage/i);
});

test("EXAMINE BELL resolves the bell fixture, not a same-prefixed NPC named Belle", () => {
  // verb-auditor playtest (2026-08-23): _findNpc's fuzzy prefix match let
  // "bell" resolve to Belle (Pink Lotus) ahead of the room's own bell
  // mechanic. An exact name still wins outright.
  state().room = "pink_lotus";
  run("examine bell");
  assert.match(lastOut(), /RING BELL/i);
  out = [];
  run("examine belle");
  assert.doesNotMatch(lastOut(), /RING BELL/i, "the exact name still resolves to her");
});

test("EXAMINE PHONE is a home screen: battery, flashlight, and messages awaiting", () => {
  startSoi6Mode();
  state().battery = 64;
  out = [];
  run("examine phone");
  let screen = lastOut();
  assert.match(screen, /Battery 64%/, "battery up top");
  assert.match(screen, /flashlight off/, "light status shown");
  assert.match(screen, /No messages/, "empty inbox reads clean");
  // an unread text turns the screen into a call to action; bare PHONE hits it too
  out = [];
  _pushMsg("lek", "when you come see me na 🥺");
  run("phone");
  screen = lastOut();
  assert.match(screen, /1 unread message\b/);
  assert.match(screen, /CHECK MESSAGES/);
  // flashlight state is reflected
  out = []; state().lightOn = true;
  run("x phone");
  assert.match(lastOut(), /flashlight ON/);
  // a dead battery is a black mirror, not a dashboard
  out = []; state().battery = 0;
  run("examine phone");
  assert.match(lastOut(), /black mirror/i);
  assert.doesNotMatch(lastOut(), /Battery 0%/);
});

test("hotel-room minibar: two free waters a day, TAKE WATER quenches, restocks at rollover", () => {
  startSoi6Mode(); // starts in qv_room
  state().thirst = 80;
  out = [];
  run("open fridge");
  assert.match(lastOut(), /2 cold bottles/i, "starts stocked with two");
  out = []; run("take water");
  assert.ok(state().thirst <= 40, "a free bottle takes a big bite out of thirst");
  run("take water");
  out = []; run("take water");
  assert.match(lastOut(), /out of water|had your two/i, "only two a day");
  // next day housekeeping refills
  state().day = 2; state().thirst = 90;
  out = []; run("take water");
  assert.match(lastOut(), /1 free bottle left/i, "restocked to two overnight");
  assert.ok(state().thirst <= 50, "and it quenches");
  // CHECK/EXAMINE reach it too, and it's a room-only amenity
  state().room = "soi6_mid"; out = [];
  run("open fridge");
  assert.match(lastOut(), /no fridge out here/i, "there's no minibar on the pavement");
});

test("SLEEP: turn in from the room, or climb up from the pub below, to end the night", () => {
  startSoi6Mode(); // qv_room, day 1
  out = []; run("examine bed");
  assert.match(lastOut(), /SLEEP/i, "the bed advertises how to use it");
  // from the pub under your room, SLEEP walks you up and ends the night
  state().room = "queen_vic";
  out = []; run("sleep");
  assert.match(lastOut(), /climb the stairs|fall into bed/i, "you're walked up, not scolded");
  assert.equal(state().room, "qv_room", "and land in your room");
  assert.equal(state().day, 2, "the night is over");
  // and directly from the room
  out = []; run("sleep");
  assert.equal(state().day, 3, "SLEEP in the room ends the night too");
  // from a bar with no bed above, a clear pointer instead
  state().room = "pink_lotus"; out = [];
  run("sleep");
  assert.match(lastOut(), /bed's up|get there and SLEEP/i, "elsewhere, point at the room");
  assert.equal(state().day, 3, "and no night lost from the wrong place");
});

test("Soi 6 mode won't offer a quest you can't finish in the pocket (Shamrock is out of bounds)", () => {
  startSoi6Mode();
  state().flags.hasDog = true;
  _npcState("bert").trust = 2; // white_dish now needs a little rapport (trust>=2); this test is about geography, not trust
  const bertOffers = () => Object.keys(QUESTS).filter(q => QUESTS[q].giver === "bert" && _questAvailable(q));
  const offered = bertOffers();
  assert.ok(offered.includes("white_dish"), "the in-pocket White Dish job still offers");
  assert.ok(offered.includes("league"), "the in-pocket League job still offers");
  assert.ok(!offered.includes("shamrock"), "Shamrock (target on the Darkside) is suppressed in the confined week");
  // but the full game still offers it
  newGame(); state().mode = null; state().stage = "expat";
  state().flags.act1Done = true; state().flags.hasDog = true;
  assert.ok(bertOffers().includes("shamrock"), "the open-map game offers Shamrock as before");
});

test("dialogue state machine: Angela gates the heavy stuff behind trust, then opens up", () => {
  startSoi6Mode();
  state().room = "queen_vic"; state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  const st = () => state().npc.angela || {};
  // a stranger asking the heavy question is deflected — she won't open up cold
  out = []; run("ask angela about navy");
  assert.match(lastOut(), /some things you earn|service record/i, "deflected before trust");
  assert.ok(!(st().know && st().know.navy), "and she hasn't actually told you");
  // meeting her, then a couple of light topics, builds trust
  run("talk angela");
  assert.equal(st().dstate, "met", "the greeting advances her from stranger to met");
  run("ask angela about drew");
  run("ask angela about 90s");
  assert.ok(st().trust >= 3, "light topics warm her up (trust >= 3)");
  // now the Navy story unlocks and opens her up
  out = []; run("ask angela about navy");
  assert.match(lastOut(), /cryptologic|twelve years|DLI/i, "the real story, once earned");
  assert.ok(st().know.navy, "she's told you now (knowledge recorded)");
  assert.equal(st().mood, "open", "and it opened her up");
  // the greeting is now the warm, mood-aware one
  out = []; run("talk angela");
  assert.match(lastOut(), /honour guard|back on my side/i, "mood-aware returning greeting");
  // trust doesn't farm by re-asking — a repeat is the terse recap
  const t = st().trust;
  out = []; run("ask angela about drew");
  assert.equal(st().trust, t, "re-asking a warmed topic doesn't re-bump trust");
});

test("The Orchid Room: WDG's members-only back room, gated by standing, is the only place Powers is", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().room = "pink_lotus";
  state().lastSaleng = 99999; state().lastPeddler = 99999;
  // the velvet rope holds for a non-member
  out = []; run("go back");
  assert.match(lastOut(), /members|velvet rope|not tonight|White Dish|friends of the group/i, "the bouncer turns you away");
  assert.equal(state().room, "pink_lotus", "you don't get in");
  // once you're White Dish's man, the rope lifts
  state().faction.wdg = 2;
  out = []; run("go back");
  assert.equal(state().room, "orchid_room", "in you go");
  // Powers — never met anywhere else — holds court here, and fears only the syndicate
  assert.equal(_npcRoom("powers"), "orchid_room", "Powers is only ever here");
  out = []; run("ask powers about syndicate");
  assert.match(lastOut(), /not a topic|right number|don't want his name/i, "even Powers fears the one man he can't buy");
});

test("factions: Gavin's errand is opt-in — standing moves only on the deed, never on declining", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  const fac = () => state().faction;
  // hearing Gavin's pitch puts the errand on offer but changes nothing
  state().room = "golden_dragon";
  run("ask gavin about offer");
  assert.equal(state().quests.wdg_flip, "offered", "the counter-quest is on the table");
  assert.deepEqual(fac(), { wdg: 0, samson: 0, indie: 0, syndicate: 0 }, "ignoring it costs nothing");
  // even accepting is free — you can still walk away with no alignment
  run("accept wdg_flip");
  assert.equal(fac().wdg, 0, "accepting the job does not align you");
  // the deed does it: carry Gavin's pitch to Bert
  state().room = "stinky_bar";
  out = []; run("ask bert about selling");
  assert.match(lastOut(), /carrying his water|came for HIM/i, "Bert clocks the betrayal");
  assert.ok(fac().wdg > 0 && fac().indie < 0, "now you've taken a side");
  assert.equal(state().quests.wdg_flip, "done", "quest resolves (WDG pays the errand)");
  // and standing drives dialogue: Bert ices a WDG stooge
  out = []; run("talk bert");
  assert.match(lastOut(), /errand boy|drink it standing/i, "Bert ices you now");
  // the help-Bert-hold path is now closed — you can't do both
  assert.ok(!state().flags.wdgResolved, "and you never helped him hold");
});

test("factions: cross Bert (go WDG) and his girls close ranks — no barfine at the Stinky", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  state().room = "stinky_bar";
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  const nm = NPCS[girl].name.toLowerCase();
  // neutral: the usual barfine liturgy applies, not a loyalty block
  out = []; run("barfine " + nm);
  assert.doesNotMatch(lastOut(), /after Bert|closed to you|not here/i, "no loyalty block when you're neutral");
  // once you're White Dish's man, none of Bert's girls will go with you
  state().faction.wdg = 2;
  out = []; run("barfine " + nm);
  assert.match(lastOut(), /Bert|closed to you/i, "his girls refuse the barfine");
  // and it's Bert's bar only — other bars are unaffected
  state().room = "pink_lotus";
  const g2 = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  out = []; run("barfine " + NPCS[g2].name.toLowerCase());
  assert.doesNotMatch(lastOut(), /closed to you|not any girl/i, "the block is the Stinky only");
});

test("autocomplete: 'buy drink for' completes with the ladies present, not the bar menu", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  state().room = "pink_lotus";
  const here = _npcsHere().filter(id => NPC_ROLES[id]).map(id => NPCS[id].name.toLowerCase());
  const c = engineComplete("buy drink for ");
  assert.ok(c.length && c.every(n => here.includes(n)), "suggests the working ladies");
  assert.deepEqual(engineComplete("buy drink for j").sort(),
    here.filter(n => n.startsWith("j")).sort(), "and filters by the partial name");
  // the bar menu still completes normally for a bare buy
  assert.ok(engineComplete("buy ").includes("beer"), "bare BUY still lists the menu");
  // bras and the pastie game are deliberately undocumented finds — never chipped
  assert.ok(!engineComplete("buy ").includes("bra for"), "bra is off the menu chips");
  assert.ok(!engineComplete("buy bra for ").some(n => here.includes(n)), "and 'buy bra for' doesn't chip names either");
  assert.ok(!engineComplete("throw ").some(c => /cover|pastie|nipple/.test(c)), "the pastie game is not chipped");
});

test("factions: do right by Bert and his girls warm to you — an easy barfine at the Stinky", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  state().room = "stinky_bar";
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  const nm = NPCS[girl].name.toLowerCase();
  state().faction.indie = 2; // Bert's ally
  state().money = 5000;
  run("buy drink for " + nm); // just one lady drink — normally not enough at a beer bar
  out = []; run("barfine " + nm);
  assert.match(lastOut(), /did right by Bert|drink easy|warmer for it/i, "his girls don't make you work for it");
  assert.ok(state().pendingBf, "the barfine proceeds to the number");
});

test("White Dish quest: Kesinee vets you before she talks — the quest flag is trust-gated", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  state().room = "kitten_corner";
  // cold, she brushes you off and withholds the quest flag
  out = []; run("ask kesinee about white dish");
  assert.match(lastOut(), /who send you|not before/i, "vetted, not spilled");
  assert.ok(!state().flags.heardWdgInside, "quest flag withheld from a stranger");
  // earn a little trust and she talks straight — the flag lands
  run("talk kesinee");
  run("ask kesinee about kittens");
  out = []; run("ask kesinee about white dish");
  assert.match(lastOut(), /cleaner.*poorer|White Dish buy this bar/i, "the real intel, once earned");
  assert.ok(state().flags.heardWdgInside, "now the quest flag is set");
});

test("TALK TO PATRON resolves to a named regular present, not the faceless archetype", () => {
  startSoi6Mode(); state().flags.act1Done = true;
  state().lastSaleng = 99999; state().lastPeddler = 99999; // startSoi6Mode's newGame reset the beforeEach suppression
  state().room = "queen_vic"; state().lastSaleng = 99999; state().lastPeddler = 99999;
  out = []; run("talk to patron");
  assert.match(lastOut(), /Mort|Angela/, "a real named regular holds court at the Queen Vic");
  // de-hopped: a hopper stays anchored at its local all night
  state().nightTurn = 5; const early = _patronRoom("nigel");
  state().nightTurn = 45;
  assert.equal(_patronRoom("nigel"), early, "no hourly drift — reliably found");
});

test("adopting the soi dog gets you a Soi Dog Foundation donation text the next day", () => {
  startSoi6Mode();
  state().dog = { since: 1 };
  out = []; run("look");
  assert.doesNotMatch(lastOut(), /Soi Dog Foundation/i, "nothing the day you adopt him");
  // the following day it lands, from a non-NPC sender, with the real charity link
  state().day = 2;
  out = []; run("look");
  assert.match(lastOut(), /phone buzzes/i, "the Foundation texts the next day");
  out = []; run("check messages");
  assert.match(lastOut(), /Soi Dog Foundation:/, "rendered under the Foundation's name, not an NPC's");
  assert.match(lastOut(), /jabs, food/, "the Foundation's ask, in its own voice");
  assert.doesNotMatch(lastOut(), /https?:\/\//,
    "URL-free — the Shamrock scene keeps the game's ONE real-world link");
  // once only
  state().day = 3; out = []; run("look");
  assert.doesNotMatch(lastOut(), /phone buzzes/i, "fires exactly once");
});

test("a last-night adoption gets the Soi Dog text the same day (no next day to wait for)", () => {
  startSoi6Mode();
  state().day = 7;
  state().dog = { since: 7 };
  out = []; run("look");
  assert.match(lastOut(), /phone buzzes/i, "same-day on the final night of the capped week");
});

test("WATCH TV works in your hotel room, not only in bars", () => {
  startSoi6Mode(); // qv_room
  out = [];
  run("watch tv");
  assert.match(lastOut(), /room's TV|flatscreen/i, "the room has a telly");
  assert.doesNotMatch(lastOut(), /No TV out here/i, "no longer refused in the room");
});

test("Soi 6 mode: the clinic thread is fully reachable — condoms on the soi, symptoms, GET TESTED clears it", () => {
  startSoi6Mode();
  // protection is on-soi: the Soi 6 7-Eleven sells condoms
  state().room = "soi6_street";
  state().money = 500;
  const packs = state().condoms;
  run("buy condom");
  assert.ok(state().condoms > packs, "condoms buyable inside the confined mode");
  // an unprotected barfine's souvenir surfaces two mornings on, in-mode
  state().std = { day: state().day };
  state().day += 2;
  assert.ok(_stdSymptomatic(), "symptoms surface across the soi week");
  // GET TESTED works anywhere — the clinic verb isn't gated to a room or a mode
  out = [];
  run("get tested");
  assert.equal(state().std, null, "the free clinic clears it without leaving the soi");
});

test("every district's 7-Eleven presses the iconic cheese toastie", () => {
  state().room = "beach_rd_c";
  state().money = 100;
  state().hunger = 60;
  run("buy toastie");
  assert.equal(state().money, 65);
  assert.ok(state().hunger <= 25);
  // prose is pooled — the receipt-stamped line is one of the toastie variants
  assert.ok(_TOASTIE_LINES.some(s => lastOut().includes(s)), "a pooled toastie line");
});

test("the food/water survival prose is pooled (7-Eleven water, KISS & carts)", () => {
  // pools are non-trivial and free of blanks
  for (const [nm, pool] of [["water", _WATER_LINES], ["toastie", _TOASTIE_LINES], ["stall-eat", _STALL_EAT_LINES]]) {
    assert.ok(pool.length >= 4, `${nm}: pool has depth`);
    assert.ok(pool.every(s => typeof s === "string" && s.trim()), `${nm}: no blank lines`);
    assert.equal(new Set(pool).size, pool.length, `${nm}: no duplicates`);
  }
  // water at the 7-Eleven draws from the pool and quenches
  state().room = "beach_rd_c"; state().money = 100; state().thirst = 80;
  out = []; run("buy water");
  assert.ok(_WATER_LINES.some(s => lastOut().includes(s)), "pooled water line");
  assert.ok(state().thirst < 80, "thirst drops");
  // KISS names the dish, then a pooled (posture-neutral) eat line
  state().room = "kiss"; state().money = 300; state().hunger = 90;
  out = []; run("buy food");
  assert.ok(lastOut().includes(FOOD_STALLS.kiss.name), "names the KISS dish");
  assert.ok(_STALL_EAT_LINES.some(s => lastOut().includes(s)), "pooled eat line");
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
  state().room = "buakhao_n"; // Candy Bar is adjacent (the Soi Diana junction)
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

test("coconut bar: beach freelancer is cheaper than the soi, and needs a wallet first", () => {
  state().room = "north_beach";
  _startEnc("coconutbar");
  run("yes");
  assert.match(lastOut(), /mai mii tang|no money/i, "broke, no deal");
  assert.equal(state().day, 2, "night not spent");
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().money = 1200;
  state().rng = 1; // tiny first roll → the safe kind, ฿500
  delete state().encDone.coconutbar;
  _startEnc("coconutbar");
  run("yes");
  assert.equal(state().day, 3, "night over on the sand");
  assert.equal(state().money, 700); // ฿500, cheaper than a bar or the promenade rail
});

test("coconut bar: Muk makes it a ฿900 pair", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "north_beach";
  state().money = 2000;
  state().rng = 1; // the safe kind
  _startEnc("coconutbar");
  run("both of you");
  assert.ok(state().flags.hadThreesome);
  assert.equal(state().money, 1100);
  assert.equal(state().day, 3);
});

test("coconut bar: the dark sand bites — the risky kind robs you", () => {
  state().flags.act1Done = true;
  state().flags.hasWallet = true;
  state().room = "north_beach";
  state().money = 2000;
  state().happy = 30;
  state().rng = 40000; // big first roll → the robber
  _startEnc("coconutbar");
  run("yes");
  assert.equal(state().day, 3, "you still lost the night");
  assert.ok(state().money <= 500, `robbed of the rest (฿${state().money} left)`);
  assert.match(lastOut(), /emptied|gone/i);
});

test("Bangkok tourist: money insults her, manners are rewarded", () => {
  state().room = "ws_north";
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

test("a genuine unrelated command declines the tourist encounter and still runs (soft-encounter passthrough)", () => {
  // NPC-completionist playtest (2026-08-23): bkktourist/jptourist/britles/
  // punterwife are non-transactional soft pitches, but were missing from
  // _ENC_SOFT — a real top-level command (MEET her, chasing a masseuse's
  // number) was silently eaten as this encounter's implicit "no" instead of
  // declining it and then actually running.
  state().room = "buakhao_market";
  state().nightTurn = 50;
  state().offShift = { id: "masseuse1", name: "Nok", home: "jomtien_soi_7_w", day: state().day, ghost: false };
  state().itemLoc.masseuse_note = "inventory";
  _startEnc("bkktourist");
  run("meet her");
  assert.match(lastOut(), /moment passed without an answer/i);
  assert.match(lastOut(), /Nok texts back/i, "the real command ran after the pitch lapsed");
  assert.equal(state().offShift, null, "the off-shift thread actually resolved");
});

test("Japanese lady: read her right and it's a threesome; money is the wrong move", () => {
  state().room = "ws_north";
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
  state().room = "ws_north";
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
  state().room = "ws_north";
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
  state().room = "ws_north";
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
    "take bottle",                             // bottle @ the beach (South)
    "e", "take bottle", "read receipt",        // bottle @ the beach road south (7-Eleven corner)
    "w", "n", "light on", "n", "take bottle",  // up through the middle beach to dark Dongtan
    "s", "light off", "s",                     // back down the sand
    "s", "sell bottles",                       // to Auntie Nok at the Soi 7 beach end
    "n", "e", "n", "ride bus to beach road", "pay 15",  // up to the bus stop, ride out
    // Act 2 — the gossip chain. Soi Buakhao is five rooms now (Klang, Made in
    // Thailand, the Tree Town arch, North, the old market block, South), Candy
    // Bar sits on the Soi Diana junction where the real Cindy Bar stands, and
    // Tree Town is entered heading WEST off the soi, which is where it is.
    // up Second Road and cut inland through Soi Diana, which is how you reach
    // Candy Bar now that Buakhao's phantom cross-street to Second Road is gone.
    // This is also just where the bar is: Candy sits on the Buakhao ⟷ Soi Diana
    // junction, so arriving out of Soi Diana is the front door, not a detour.
    "e", "n", "e", "e", "e", "e", "candy", "talk to candy",   // Candy: Mot did it
    "out", "e", "talk to lek",                       // Lek at Lucky Tiger, east off the junction
    "out", "candy", "ask candy about wallet",        // Candy: som tam errand
    // There used to be a "Bank: helmet favour" leg here — south down Buakhao,
    // "w" onto the old cross-street, "talk to bank", "e" straight back. It was
    // dead the whole time: Bank works beach_rd_s and that leg never left Soi
    // Buakhao, so the talk reached nobody and the two moves cancelled. Deleting
    // the fictional exit only made it visible. Dropped rather than repaired —
    // the helmet is demonstrably not on the critical path, since act1Done is
    // reached without it, and a real Bank detour is 8 hops on a timed night.
    // north up Buakhao to the Tree Town arch, then west into the maze
    // (Soi Buakhao has separate junctions for Soi Diana, LK Metro and Soi Honey
    //  now, so the arch is three blocks north of Candy Bar rather than one)
    "out", "n", "n", "n", "w",                       // the arch
    "w", "w", "in",                                  // Starlight Bar
    "give helmet to pim", "ask pim about oy",        // pin part: lucky 9
    "out", "e", "in", "ask nong about oy",           // pin part: number 71
    "out", "w",
    "light on", "w", "w", "light off",               // dark corner → Rainbow Girls
    "give som tam to ploy",                          // door trick
    "ask dj about sabai sabai",                      // security sings
    "go office", "enter ๗๑๙",                        // the safe
    // Home — one growl-turn in the dark corner is survivable; save the battery
    "out", "out", "e", "e", "e", "e",
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
  assert.equal(state().room, "jomtien_beach_rd_s");
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
  assert.match(lastOut(), /street polices itself|orders a water|The swing stays/); // a pool now (liability playtest 2026-08-22)
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
  assert.ok(_NOBODY_NAME.some(s => lastOut().includes(s)), "a plain deny (pooled)");
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
  run("e", "n"); // up the beach road to the baht bus stop
  assert.ok(ROOMS[state().room].busStop);
  run("wave");
  assert.match(lastOut(), /He'll drop you/); // hail-anywhere: drop points, not stops
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

test("PHOTO <someone> collects a portrait, learns the name, and GALLERY lists it", () => {
  state().stage = "vacation"; state().room = "golden_dragon"; state().nightTurn = 30; state().battery = 80;
  const b = state().battery;
  // photograph him by his look, before you know he's "Gavin"
  run("photo the golf-shirted man");
  assert.ok(state().known.gavin, "the shot puts you on first-name terms");
  assert.ok(state().phone.photos.some(p => p.id === "gavin"), "saved to the gallery");
  assert.equal(state().battery, b - 1, "costs 1% battery");
  out = []; run("gallery");
  assert.match(lastOut(), /Gallery — 1 photo/);
  assert.match(lastOut(), /Gavin/);
  assert.match(lastOut(), /Golden Dragon/, "the gallery says where he holds court");
  // a second shot is a duplicate, not a fresh collectible
  out = []; run("photo gavin");
  assert.match(lastOut(), /for the collection|isn't complaining|never hurt a gallery/);
});

test("PHOTO obeys the go-go house rule unless she's your regular", () => {
  state().stage = "vacation"; state().room = "neon_paradise"; state().nightTurn = 30; state().battery = 80;
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  run("photo " + NPCS[girl].name);
  assert.match(lastOut(), /No photo|No camera/i, "a stranger's camera is refused");
  assert.ok(!state().phone.photos.some(p => p.id === girl), "nothing captured, no name learned");
  // become her farang and she sneaks one cheek-to-cheek
  state().phone.contacts[girl] = true;
  out = []; run("photo " + NPCS[girl].name);
  assert.ok(state().phone.photos.some(p => p.id === girl), "your regular poses for you");
  assert.match(lastOut(), /Only you|out of the mamasan|under the rail/i);
});

test("an empty gallery nudges you to start collecting", () => {
  state().stage = "vacation"; state().room = "queen_vic"; state().battery = 80;
  run("gallery");
  assert.match(lastOut(), /PHOTO someone/);
});

test("a lady who keeps photos texts you a selfie that files in the gallery", () => {
  state().stage = "vacation"; state().battery = 90; state().turns = 10;
  // Ping keeps photos (authored selfies)
  state().phone.contacts.ping = true;
  _maybePhotoText("ping");
  run("check messages");
  assert.match(lastOut(), /📷 Ping:/, "the selfie renders as a photo");
  assert.ok(state().phone.photos.some(p => p.id === "ping" && p.cap), "and lands in the gallery, captioned");
  assert.ok(state().known.ping, "receiving it puts you on name terms");
});

test("Wilai runs a pay-per-photo drip: teaser free, each next shot behind an escalating ask", () => {
  state().stage = "vacation"; state().battery = 90; state().money = 9000; state().turns = 10;
  state().phone.contacts.wilai = true;
  _startPicDeal("wilai");
  run("check messages");
  assert.equal(state().phone.picDeal.ask, 300, "the teaser lands and she pitches the first paid shot");
  assert.equal(state().phone.photos.filter(p => p.id === "wilai").length, 1, "teaser is free");
  // underpaying teases, doesn't deliver
  out = []; run("send 100 to wilai"); run("check messages");
  assert.match(lastOut(), /not quite|then i send/i);
  assert.equal(state().phone.photos.filter(p => p.id === "wilai").length, 1, "no new shot for a short payment");
  // paying the ask (or more) unlocks the next and raises the price
  out = []; run("send 500 to wilai"); run("check messages");
  assert.equal(state().phone.photos.filter(p => p.id === "wilai").length, 2, "paid shot delivered");
  assert.equal(state().phone.picDeal.ask, 500, "the ask escalates");
  // pay through to the end
  run("send 500 to wilai"); run("send 800 to wilai"); run("check messages");
  assert.ok(state().phone.picDeal.done, "the set runs out");
  assert.equal(state().phone.photos.filter(p => p.id === "wilai").length, 4, "four frames collected");
  out = []; run("gallery");
  assert.match(lastOut(), /Gallery — 4 photos/);
});

test("every character is named on sight — one consistent rule, no name-hiding", () => {
  // The "descriptive title until met" reveal was dropped: everyone (patrons and the
  // origin NPCs included) shows their name immediately, like the staff always have.
  state().stage = "vacation"; state().room = "queen_vic"; state().nightTurn = 30;
  run("look");
  assert.match(lastOut(), /Mort/, "the rail names Mort on sight (no 'owlish old-timer' screen)");
  assert.match(lastOut(), /Doyle/, "and the origin NPC is named too, not shown as a look");
  assert.doesNotMatch(lastOut(), /owlish old-timer|watchful older farang/, "no look substitutes for a name");
  // the label helpers always return the name now
  assert.equal(_npcLabel("doyle"), "Doyle", "NPC label is the name");
  assert.equal(_patronLabel("mort"), "Mort", "patron label is the name");
});

test("the ATM verb gates on your card and where you're standing", () => {
  // no wallet yet: the card is the whole problem
  run("withdraw");
  assert.match(lastOut(), /wallet is the whole problem/);
  state().flags.hasWallet = true;
  // card in hand, but no ATM in this room
  state().room = "hotel_room"; state().day = 2;
  out = []; run("atm");
  assert.match(lastOut(), /No ATM in reach|main drag/i);
  // at an ATM, bare ATM shows the balance and how to draw
  state().room = "soi6_street";
  state().bank = 80000; state().money = 500; state().atmDay = 0; state().atmToday = 0;
  out = []; run("atm");
  assert.match(lastOut(), /Account: ฿80,000/);
  assert.match(lastOut(), /WITHDRAW 1000/i);
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
    // bar vignette: the stool drill with patrons about, or (2026-08-22) the
    // empty-room monsoon register when nobody's at the rail — either is valid
    state().room = "candy_bar";
    state().turns = 101;
    _sayDrizzle();
    assert.ok(/barstools/i.test(lastOut()) || _RAIN_EMPTY_BAR.some(v => lastOut().includes(v.slice(0, 40))),
      "the bar rain vignette is neither the stool drill nor the empty-room register");
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
    state().room = "anchor_bar"; // no named regular — the anonymous football bore fills in
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
  run("s", "look at nok");
  assert.match(lastOut(), /vendor/i);
  out = [];
  run("look");
  assert.match(lastOut(), /Soi 7 Sands/);
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
  assert.match(out.join("\n"), /What's open:|Talk to people/i);
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

test("engineComplete: quests, contacts, watch, fare", () => {
  state().quests.sangsom = "offered";
  assert.ok(engineComplete("accept ").includes("sangsom"));
  state().quests.sangsom = "active";
  assert.ok(engineComplete("abandon ").includes("sangsom"));
  state().phone.contacts.fon = true;
  assert.deepEqual(engineComplete("message "), ["fon"]);
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

test("Junction bars: WATCH POLICE and WATCH SUNSET, one shared show-point a night", () => {
  state().room = "beach_rd_n"; // the foot of Soi 6
  state().pendingEnc = null;
  state().lastPeddler = 99999;
  state().nightTurn = 5; // ~18:30, the checkpoint window
  run("enter blue dog"); // Blue Dog holds the beach-side corner of the junction
  assert.equal(state().room, "blue_dog");
  assert.match(lastOut(), /checkpoint is in session/, "the checkpoint auto-announce is back");
  assert.match(lastOut(), /south of the soi/i, "and it reads at the new location");

  out = [];
  const happy0 = state().happy;
  // WATCH POLICE is the checkpoint show and pays the nightly point
  run("watch police");
  assert.match(lastOut(), /station|checkpoint|helmet|noodle|U-turn|processing|rail/i, "a shakedown vignette");
  assert.equal(state().happy, happy0 + 1, "first watch of the night pays");
  // WATCH SUNSET shares the same daily cap — no double-dip
  out = [];
  run("watch sunset");
  assert.match(lastOut(), /gold|islands|sky|bay|squid/i, "the bay does its thing");
  assert.equal(state().happy, happy0 + 1, "the nightly point is already spent");

  // it works from the Stinky Pinky across the junction too (fresh day)
  state().room = "stinky_bar"; state().blueDogDay = 0; out = [];
  run("watch police");
  assert.match(lastOut(), /station|checkpoint|helmet|noodle|U-turn|processing|rail/i, "checkpoint visible from the opposite corner");
  assert.equal(state().happy, happy0 + 2, "and pays there too on a fresh day");

  // after the window the checkpoint packs up; the bay stays open
  state().nightTurn = 30; // 21:00
  state().room = "blue_dog"; out = [];
  run("watch police");
  assert.match(lastOut(), /checkpoint|packed up|wrapped up/i, "show's over");
  out = [];
  run("watch sunset");
  assert.match(lastOut(), /squid|boat|embers|afterglow|night/i, "post-sunset bay");
});

test("WATCH SOI in the quiet middle (and its beer bars) pays the shared show-point", () => {
  startSoi6Mode();
  state().room = "soi6_mid";
  const happy0 = state().happy;
  out = [];
  run("watch soi");
  assert.match(lastOut(), /parade|soi|barker|noodle|som tam|neon/i, "a parade vignette");
  assert.equal(state().happy, happy0 + 1, "watching the parade pays once");
  // shares the free-show cap with the balcony and the junction
  out = [];
  run("watch"); // bare WATCH in the middle also people-watches
  assert.equal(state().happy, happy0 + 1, "no double-dip on the same day");
  // and it works from a front-row beer bar (fresh day)
  state().room = "bay_watch"; state().blueDogDay = 0; out = [];
  run("watch");
  assert.match(lastOut(), /parade|soi|barker|noodle|som tam|neon/i, "the Front Row is for watching");
  assert.equal(state().happy, happy0 + 2, "the Front Row pays on a fresh day");
});

test("noodle patrol: decline the pull and take a foam bop (worth a laugh and a point)", () => {
  startSoi6Mode();
  state().room = "soi6_street";
  const happy0 = state().happy;
  _startEnc("noodle");
  assert.match(lastOut(), /pool noodle/i, "the challenge is issued");
  run("no");
  assert.match(lastOut(), /foam|noodle|FWUMP|sanuk/i, "the bop lands");
  assert.equal(state().happy, happy0 + 1, "pure sanuk, +1");
  // going along instead just tows you toward her bar, no point of its own
  state().room = "soi6_deep"; delete state().encDone.noodle; out = [];
  _startEnc("noodle");
  run("yes");
  assert.match(lastOut(), /tows you|ENTER/i, "she hauls you toward the bar");
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

  // room description lists the patron in the "Here:" line; talk and topics work
  state().room = "silk_rose";
  state().pendingEnc = null; state().lastSaleng = 99999; state().lastPeddler = 99999;
  out = [];
  run("look");
  // named on sight now — no name-hiding
  assert.match(lastOut(), /Helmut/, "patron named on sight in the Here: line");
  assert.doesNotMatch(lastOut(), /\(61, German\)/, "age/nat is NOT on the presence line anymore");
  assert.doesNotMatch(lastOut(), /fastidious German with polished glasses/, "his look never replaces his name");
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
  // examine works too — and carries the age/nat that left the presence line
  out = [];
  run("x helmut");
  assert.match(lastOut(), /third stool from the left/);
  assert.match(lastOut(), /\(61, German\.\)/, "EXAMINE surfaces age + nationality");
});

test("one 'Here:' line lists staff and patrons together — no separate rail line", () => {
  state().stage = "vacation"; state().room = "queen_vic"; state().nightTurn = 30;
  out = []; run("look");
  const o = lastOut();
  assert.doesNotMatch(o, /At the rail:/, "the old split rail line is gone");
  const here = o.split("\n").find(l => l.startsWith("Here:"));
  assert.ok(here, "a single Here: presence line");
  assert.match(here, /Doyle/, "an NPC is on it");
  assert.match(here, /Mort/, "and a patron, on the same line");
  assert.doesNotMatch(here, /\(74, American\)/, "just emoji + name — no age/nat clutter on the line");
  // the age/nat now lives in EXAMINE
  out = []; run("x mort");
  assert.match(lastOut(), /\(74, American\.\)/, "EXAMINE carries the patron's age + nationality");
});

test("the bar's ambient regular is unreachable background, not an addressable NPC", () => {
  state().stage = "vacation"; state().room = "candy_bar"; state().day = 2; state().nightTurn = 30;
  delete state().soc.patronBusy.candy_bar;
  out = []; run("look");
  assert.ok(_BAR_REGULAR.some(s => lastOut().includes(s)), "the ambient line comes from the pool");
  // and there's no 'regular' entity you can actually open a conversation with
  out = []; run("talk regular");
  assert.doesNotMatch(lastOut(), /welded|fixture|drones|holds court/i, "the flavour isn't a talkable character");
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
  assert.ok(_NOBODY_NAME.some(s => lastOut().includes(s)), "unmet: a plain deny, no location leaked");
  state().known.candy = true; // now you've met her
  out = [];
  run("talk to candy");
  assert.match(lastOut(), /Candy isn't at this bar tonight — try Candy Bar\b/, "met: placed at tonight's bar");
  // anonymous staff are nobody, not 'elsewhere'
  out = [];
  run("talk to security");
  assert.ok(_NOBODY_NAME.some(s => lastOut().includes(s)), "a plain deny (pooled)");
});

test("the 'elsewhere' line says 'around here', not 'this bar', when you're not in a bar", () => {
  // addressing Auntie Nok (a beach-cart vendor) from the open sand must not claim
  // you're standing in a bar
  state().known.nok = true;
  state().room = "jomtien_beach";
  out = [];
  run("talk to auntie nok");
  assert.match(lastOut(), /Auntie Nok isn't around here tonight — try Soi 7 Sands/);
  assert.doesNotMatch(lastOut(), /this bar/, "no bar where there is no bar");
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
  // keep the two runs deterministic — a street encounter firing between them
  // (a peddler drifting in) would make the outputs differ for the wrong reason
  state().encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  state().lastPeddler = 99999; state().lastSaleng = 99999;
  const say = cmd => { // fresh seen-state so repeat-terseness doesn't skew it
    state().patronTalk = { day: state().day, talked: {} };
    out = []; run(cmd); return lastOut();
  };
  const noAbout = say("ask chuck money");
  const withAbout = say("ask chuck about money");
  assert.equal(noAbout, withAbout, "with and without 'about' reach the same reply");
  assert.ok(!_NOBODY_NAME.some(s => noAbout.includes(s)), "not a dead end");
});

test("the Phil triangle: read the phone, then tell him or warn her — not both ways", () => {
  state().pendingEnc = null; state().lastSaleng = 99999; state().lastPeddler = 99999;
  // the confrontation is gated on having seen the screenshots
  state().room = "night_bazaar";  // Nit moved with the cloth trade
  run("ask nit about somchai");
  assert.ok(!state().flags.warnedNit, "no warning before the phone");
  state().room = "stinky_bar";
  out = [];
  run("ask phil about phone");
  assert.ok(state().flags.readPhilPhone, "the screenshots land");
  assert.match(lastOut(), /สมชาย/, "the thread is in Thai");
  // branch: warn Nit first
  state().room = "night_bazaar";
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
  state().room = "night_bazaar";
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
  run("enter stinky"); // → The Stinky Pinky (regulars still call it the Stinky)
  assert.match(lastOut(), /squared/i, "Bert handles it");
  assert.equal(state().hotelDebt, 0);
  assert.ok(state().flags.tabSettled);
  state().hotelDebt = 900;
  out = [];
  run("out", "enter stinky");
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
  state().flags.sawBalcony = true; // past the one-time tone-setter; test the nightly perk on the pooled view
  state().blueDogDay = 0;
  const h1 = state().happy;
  out = [];
  run("watch soi");
  assert.ok(_BALCONY_SCENES.some(s => lastOut().includes(s.slice(0, 40))), "a balcony scene prints");
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

test("action breadcrumb (_traceLine) formats each verb shape", () => {
  assert.equal(_traceLine({ verb: "talk", target: "Nok" }), "· You talked to Nok");
  assert.equal(_traceLine({ verb: "ask", target: "Nok", extra: "beer" }), "· You asked Nok about beer");
  assert.equal(_traceLine({ verb: "ask", target: "Nok", extra: "" }), "· You asked Nok");
  assert.equal(_traceLine({ verb: "give", target: "Pim", extra: "helmet" }), "· You gave Pim the helmet");
  // article-aware: item names carry their own article — no "gave the a tiffin" (2026-08-17)
  assert.equal(_traceLine({ verb: "give", target: "Nont", extra: "a tiffin of fish" }), "· You gave Nont a tiffin of fish");
  assert.equal(_traceLine({ verb: "give", target: "Oy", extra: "your wallet" }), "· You gave Oy your wallet");
  assert.equal(_traceLine({ verb: "flirt", target: "Fon" }), "· You flirted with Fon");
  assert.equal(_traceLine({ verb: "kiss", target: "Fon" }), "· You kissed Fon");
  assert.equal(_traceLine({ verb: "go", target: "Soi 6" }), "· You went to Soi 6");
  assert.equal(_traceLine(null), "");
  assert.equal(_traceLine({}), "");
  // a long ask-topic is capped to keep the line short
  assert.equal(_traceLine({ verb: "ask", target: "Nok", extra: "one two three four five" }),
    "· You asked Nok about one two three four");
});

test("the breadcrumb prints after a command, infers movement, and explicit wins", () => {
  out = [];
  _trace("talk", "Nok"); _flushTrace("beach");
  assert.ok(lastOut().includes("· You talked to Nok"), "explicit trace prints");
  // no explicit trace + a room change → inferred movement line
  out = [];
  const dest = Object.keys(ROOMS)[0];
  state().room = dest;
  _flushTrace("__nowhere__");
  assert.ok(lastOut().includes("· You went to " + ROOMS[dest].name), "movement inferred");
  // an explicit trace beats the movement inference
  out = [];
  _trace("kiss", "Fon");
  state().room = dest;
  _flushTrace("__other__");
  assert.ok(lastOut().includes("· You kissed Fon"), "explicit wins");
  assert.ok(!lastOut().includes("went to"), "no movement line when explicit set");
  // nothing pending + no room change → silent
  out = [];
  _flushTrace(state().room);
  assert.equal(lastOut(), "", "silent when nothing happened");
});

// A bad night ends in prose, and prose is deliberately not a rules explanation:
// you black out, you wake somewhere, and the meters that did it were never on
// screen. The debrief is the game (not a character) saying what ended the night
// and what prevents it — the one place straight advice belongs, because it is
// mechanics rather than fiction.
test("a bad night ends with a debrief; a good one doesn't", () => {
  const ended = reason => {
    newGame();
    state().stage = "vacation"; state().flags.act1Done = true;
    state().room = "beach_rd_c";
    out = [];
    _endNight(reason);
    return out.join("\n");
  };

  for (const r of ["collapse", "blackout", "hurt", "accident", "robbed", "bfscam", "dawn"]) {
    const said = ended(r);
    assert.match(said, /WHAT HAPPENED/, `${r}: no debrief`);
    assert.match(said, /Next time:/, `${r}: no prevention line`);
  }
  // the endings that are not failures stay quiet
  for (const r of ["sleep", "barfine"]) {
    assert.doesNotMatch(ended(r), /WHAT HAPPENED/, `${r}: shouldn't be debriefed`);
  }

  // dawn is the same reason code with two opposite outcomes: on the street it's
  // a rough wake, in your own bed it's just morning. Telling a man who went to
  // bed that he was "still on the street" is the defect class this repo keeps
  // catching, so the at-home case returns nothing at all.
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().room = _hotelRoomId();
  out = [];
  _endNight("dawn");
  assert.doesNotMatch(out.join("\n"), /WHAT HAPPENED/, "dawn at home is not a bad night");

  // and the numbers are real, not decoration
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().room = "beach_rd_c"; state().thirst = 100; state().hunger = 40;
  out = [];
  _endNight("collapse");
  assert.match(out.join("\n"), /Thirst put you down/, "names the meter that actually did it");
  assert.match(out.join("\n"), /You hit 100/, "quotes the real value");
});

// The first-night nudges. A punter knows what to do in Pattaya; what he does
// not know is what this GAME rewards, and a measured player who doesn't already
// understand the quest system reaches none of the 21 quests on night one. These
// are two dim lines, once EVER each, and only where they are true.
test("the newbie nudges fire once, in order, and only where the advice works", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().money = 5000;

  // a pub with no hostesses cannot deliver "buy a lady a drink, then CONTACT her"
  state().room = "queen_vic"; out = [];
  _newbieNudge();
  assert.doesNotMatch(out.join("\n"), /nobody's number|bell over the rail/,
    "the Queen Vic has no hostesses — the advice would be a promise it can't keep");
  assert.ok(!_flag("tipNumber"), "and it doesn't burn the one-shot either");

  // a bar with staff: the number first, because it opens the phone/bond layer
  const bar = Object.keys(ROOMS).find(id => {
    if (ROOMS[id].barType !== "beer") return false;
    state().room = id;
    return _npcsHere().some(n => NPC_ROLES[n] === "hostess");
  });
  state().room = bar; out = [];
  _newbieNudge();
  assert.match(out.join("\n"), /nobody's number/, "the first tip is the number");
  assert.doesNotMatch(out.join("\n"), /bell over the rail/, "one at a time");

  // the bell comes next visit, not the same breath
  out = []; _newbieNudge();
  assert.match(out.join("\n"), /bell over the rail/, "the bell is the second tip");
  assert.match(out.join("\n"), new RegExp("฿" + BELL_PRICE), "and it quotes the real price");

  // and never again
  out = []; _newbieNudge();
  assert.equal(out.join("\n"), "", "both are once ever");
});

// The first job finds you — once, ever. _questOffer only fires at the end of
// TALKing to a giver, which assumes the player already knows that talking to
// people until something surfaces is what this game is. Measured: inside the
// Soi 6 pocket exactly ONE real quest is reachable by a new character, and it
// waits behind a conversation he has no reason to start.
test("a giver hails a player who has never had a quest, and only that once", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().quests = {}; state().questHailed = false;
  const bar = _npcRoom("bert");

  state().room = bar; out = [];
  _questHail();
  const said = out.join("\n");
  assert.match(said, /has a job for you/, "the giver opens with it");
  assert.match(said, /ACCEPT/, "and the live command follows");
  assert.ok(state().questHailed, "the one-shot is spent");

  // never again, even standing in front of a giver with work going
  out = []; _questHail();
  assert.equal(out.join("\n"), "", "once ever, not once a night");

  // and a player who already has quest history is never hailed at all
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().quests = { league: "done" }; state().questHailed = false;
  state().room = bar; out = [];
  _questHail();
  assert.equal(out.join("\n"), "", "you've had a job — you know how this works");
  assert.ok(!state().questHailed, "and it doesn't burn the one-shot declining");
});

// Tan's Act One ride. Measured, the opening's real difficulty is the map, not
// the mystery: beach → Candy Bar is 19 turns, Candy Bar → Oy 9, Oy → your own
// door 13. Over 40% of a 100-turn night walking, before any of the puzzle, and
// a first-timer walks it in the wrong order and eats a full reset for it.
test("CALL TAN in Act One drives you into town — once, free, telling you nothing", () => {
  newGame();
  state().phone.contacts = { tan: true };
  state().room = "jomtien_beach";
  const money0 = state().money, t0 = state().nightTurn;

  out = []; run("call tan");
  assert.equal(state().room, "buakhao_n", "he puts you down at the Diana end of Buakhao");
  assert.ok(state().nightTurn - t0 <= 2, "the whole ride costs about a turn, not nineteen");
  assert.equal(state().money, money0, "he has never taken money and you haven't got any");
  assert.match(out.join("\n"), /wallet is yours to find/, "he still won't solve it for you");

  // once a night, and he says so
  out = []; run("call tan");
  assert.match(out.join("\n"), /one time tonight|The rest is legs/i);
  assert.equal(state().room, "buakhao_n", "and doesn't move you again");

  // and he won't ferry you around town you're already standing in
  newGame();
  state().phone.contacts = { tan: true };
  state().room = "buakhao_n"; out = [];
  run("call tan");
  assert.match(out.join("\n"), /already in town/);
  assert.ok(!state().phone.tanAct1, "declining doesn't burn the one ride");
});

// Act One ends on the WALLET, not on getting to bed. A man who has just got his
// wallet back goes out; he does not walk thirteen turns home across town. That
// last leg was 13 of the 33-turn minimum run — nearly half of it, after the
// puzzle was already solved.
test("Act One completes the moment the wallet is in hand, wherever you are", () => {
  newGame();
  state().player = { origin: "monger", personality: "joker", orientation: "straight", said: {} };
  state().room = "rainbow_girls";
  state().flags.knowMot = true; state().flags.knowOyHasIt = true;
  out = []; run("wai oy"); run("ask oy about wallet");
  assert.ok(_flag("hasWallet"), "she hands it over to a polite man");
  assert.ok(_flag("act1Done"), "and that IS the end of the opening");
  assert.notEqual(state().room, "hotel_room", "you did not have to go home for it");
  assert.match(out.join("\n"), /ACT ONE COMPLETE/);
  assert.equal(state().stage, "vacation");

  // the emergency stash is in the room safe, so it waits in the room
  assert.ok(!_flag("roomSafeOpened"), "not collected in an LK Metro bar");
  const before = state().money;
  state().room = _hotelRoomId();
  _roomSafeBeat();
  assert.ok(_flag("roomSafeOpened"));
  assert.equal(state().money, before + SAFE_CASH, "collected when you get there");
  out = []; _roomSafeBeat();
  assert.equal(out.join("\n"), "", "and only once");
});

// Halfway through the opening night, a first-timer who hasn't found Candy and
// hasn't thought to use the card in his pocket gets the offer he didn't know to
// ask for — the fixer comes to him.
test("Tan calls a lost first-timer at the halfway mark", () => {
  newGame();
  state().phone.contacts = { tan: true };
  state().room = "jomtien_beach"; state().nightTurn = 49;
  out = []; run("look");
  assert.equal(state().room, "buakhao_n", "he drops you at the Diana end");
  assert.match(out.join("\n"), /Go find Candy/, "and points you at the one person who knows");

  // not if you already found her
  newGame();
  state().phone.contacts = { tan: true };
  state().room = "jomtien_beach"; state().nightTurn = 60; state().flags.knowMot = true;
  out = []; run("look");
  assert.equal(state().room, "jomtien_beach", "you're not lost — no rescue");

  // and it shares the one ride with the outgoing call
  newGame();
  state().phone.contacts = { tan: true };
  state().room = "jomtien_beach";
  run("call tan");
  state().nightTurn = 60; out = []; run("look");
  assert.doesNotMatch(out.join("\n"), /phone goes off/, "one lift a night, either direction");
});

// Live leads. Measured on day three: QUESTS, HINT and SCORE all answered "what
// should I do now?" with the same sentence — "the givers are out there, talk to
// people." True, and useless. The threads all existed; the game had just never
// named them.
test("with nothing on the books, the game names what's actually open", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 3;
  state().known = { bert: true };
  state().soc.drinks = { lek: 3 };
  state().visited = { beach_rd_c: true };
  state().room = "beach_rd_c";

  out = []; run("quests");
  const said = out.join("\n");
  assert.match(said, /What's open:/);
  assert.match(said, /Bert has something going/, "a man you have MET with work going");
  assert.match(said, /The Stinky Pinky/, "and where he actually is");
  assert.match(said, /Lek remembers you/, "the girl who is warmest to you");
  assert.match(said, /not set foot in/, "and somewhere you have never been");

  // a stranger's job is a spoiler, not a lead — only people you've met
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().known = {}; state().soc.drinks = {}; state().room = "beach_rd_c";
  out = []; run("quests");
  assert.doesNotMatch(out.join("\n"), /Bert has something going/,
    "you have not met him — naming him would be a spoiler");

  // HINT uses the same surface, so the two can never drift apart
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().known = { bert: true }; state().room = "beach_rd_c";
  out = []; run("hint");
  assert.match(out.join("\n"), /What's open:|Talk to people/);
});

// Collections get a denominator. All three existed and all three were
// invisible: the gallery had no total, the black book had no total, and the
// Thai you'd been shown was only ever visible in the trainer. A number with a
// denominator is a goal; a number on its own is trivia.
test("the collections show what's left, measured against people you've MET", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().known = { lek: true, candy: true, bert: true, nong: true, fon: true };
  state().phone.photos = [{ id: "lek", turn: 1 }, { id: "candy", turn: 2 }];
  state().phone.contacts = { lek: true };

  out = []; run("gallery");
  assert.match(out.join("\n"), /2 of the 5 faces you've met/,
    "the denominator is who you've met, not the 334-strong cast");

  out = []; run("who");
  assert.match(out.join("\n"), /1 number — out of 5 ladies|out of \d+ ladies/,
    "the black book counts against ladies you know");

  out = []; run("score");
  assert.match(out.join("\n"), /met 5 · 2 faces in the gallery · 1 number/,
    "and SCORE carries all three on the one screen a player checks");

  // everyone photographed reads as done, not as a shortfall
  state().phone.photos = ["lek", "candy", "bert", "nong", "fon"].map((id, i) => ({ id, turn: i }));
  out = []; run("gallery");
  assert.match(out.join("\n"), /everyone you've met is in here/);
});

// The morning ledger. A bad night has been legible since the WHAT HAPPENED
// debrief; a good one wasn't — you slept, the rent came off, and nothing said
// what the night had been. Failure explained itself and success didn't.
test("the morning says what last night was, as deltas", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 3;
  state().happy = 12; state().money = 5000;
  state().known = { lek: true }; state().phone.contacts = {};
  _nightSnapshot();

  // …a night happens…
  state().happy = 18; state().money = 3200;
  state().known.candy = true; state().known.bee = true;
  state().phone.contacts = { lek: true };
  state().day = 4;

  out = []; _morningLedger();
  const said = out.join("\n");
  assert.match(said, /\+6 สนุก/, "happiness delta");
  assert.match(said, /spent ฿1,800/, "money delta, formatted");
  assert.match(said, /met 2/, "people met");
  assert.match(said, /1 new number/);
  assert.match(said, /4 nights left/, "and the shape of the week");

  // a night where nothing measurable happened is not scolded
  _nightSnapshot();
  out = []; _morningLedger();
  assert.match(out.join("\n"), /A quiet one/);

  // and it only fires once per morning
  out = []; _morningLedger();
  assert.equal(out.join("\n"), "", "the snapshot is consumed");
});

// The unknown number. One joke a day; let them run, STOP them, or REPLY — and
// the reply is the interesting one, because the number belongs to Mort, who is
// already the in-fiction author of the Nite Owl column.
test("the daily joke: one a day, stoppable, and the sender has a name", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 3;

  _dailyJoke();
  assert.equal(state().phone.inbox.length, 1, "one text");
  assert.match(state().phone.inbox[0].fromName, /^\+66/, "from a number, not a contact");
  assert.match(state().phone.inbox[0].text, /REPLY, or STOP/, "the first one says what you can do");
  _dailyJoke();
  assert.equal(state().phone.inbox.length, 1, "and only one a day");

  // REPLY names him and makes him known
  out = []; run("reply");
  assert.match(out.join("\n"), /Mort/, "the sender introduces himself");
  assert.ok(state().known.mort, "and is a known character from here on");
  assert.ok(_flag("jokeWho"));

  // STOP ends it, and it stays ended
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 3;
  _dailyJoke();
  out = []; run("stop");
  assert.ok(_flag("jokeStop"));
  state().day = 4; _dailyJoke();
  assert.equal(state().phone.inbox.length, 1, "no more after STOP");

  // and nothing arrives during the opening — the wallet comes first
  newGame();
  state().day = 2; _dailyJoke();
  assert.equal(state().phone.inbox.length, 0, "not during Act One");
});

// He invited you for a beer over text. If you turn up and he greets you as a
// stranger, the invitation was a lie the game told.
test("Mort knows you answered his text when you walk in", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 3;
  _dailyJoke(); run("reply");
  state().room = "queen_vic"; out = [];
  run("talk to mort");
  assert.match(out.join("\n"), /one in forty/, "he places you on sight");
  assert.ok(_flag("mortMet"), "and it's spent — the next talk is normal");

  // a stranger still gets the stranger's greeting
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().room = "queen_vic"; out = [];
  run("talk to mort");
  assert.doesNotMatch(out.join("\n"), /one in forty/);

  // and telling him to STOP is not the same as replying
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true; state().day = 3;
  _dailyJoke(); run("stop");
  state().room = "queen_vic"; out = [];
  run("talk to mort");
  assert.doesNotMatch(out.join("\n"), /one in forty/, "you told him to stop; he did");
});

// The Glam saga is the best chain in the game and the easiest to never find:
// its giver is a mamasan on a three-bar rota and its subject is a patron in a
// bar you may never enter. Mort points at it — in character, and without
// spoiling it, because he genuinely does not know.
test("Mort points a player at Glam, after he's introduced himself, and never spoils it", () => {
  newGame();
  state().stage = "vacation"; state().flags.act1Done = true;
  state().room = "queen_vic";

  out = []; run("talk to mort");
  assert.doesNotMatch(out.join("\n"), /Cheeky Monkey/,
    "a stranger doesn't open with 'do something for an old man'");
  assert.match(out.join("\n"), /Mort/, "he introduces himself first");

  out = []; run("talk to mort"); run("talk to mort");
  assert.match(out.join("\n"), /Cheeky Monkey|Glam/, "then the lead comes");
  assert.ok(_flag("mortGlam"), "once");

  // he does NOT know about Diamond — that reveal is hers to make, at the end of
  // four quests, and nothing here may pre-empt it
  out = []; run("ask mort about glam");
  const said = out.join("\n");
  assert.doesNotMatch(said, /daughter|Diamond|kathoey|katoey/i,
    "Mort has a shape that doesn't add up, not the answer");
  assert.match(said, /why he sits THERE|does not spend his last years/,
    "what he has is the question, which is the right amount");

  // and once you know, he lets it go rather than printing it
  state().flags.diamondTruth = true;
  out = []; run("ask mort about glam");
  assert.match(out.join("\n"), /does not go in the column/);
});

// ── Playtest hardening (2026-08-17): the classes the blind runs exposed ───────

test("every venue opens to its own printed name from its own doorstep", () => {
  // The apostrophe class: ENTER CHEAP CHARLIE'S fell through to TRAVEL's "you
  // only know the way…" because the matcher was tested with one friendly name.
  // Enumerate the DATA axis: every venue, entered by the exact name the street
  // prints. Entry may be refused in voice (a gated club, a shut door) — what it
  // must never do is fall through to the travel handler or didn't-parse.
  startSoi6Mode(); G.flags.act1Done = true; G.stage = "vacation"; G.mode = null;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  let tried = 0;
  for (const [rid, room] of Object.entries(ROOMS)) {
    const doors = [];
    for (const v of room.venues || []) doors.push(v);
    for (const to of Object.values(room.exits || {})) {
      if (ROOMS[to] && ROOMS[to].bar) doors.push(to);
    }
    for (const vid of new Set(doors)) {
      const label = ROOMS[vid].bar || ROOMS[vid].name;
      G.room = rid; G.nightTurn = 5; G.rain = 0; G.pendingEnc = null; G.game = null;
      out = []; run("enter " + label.toLowerCase());
      const said = lastOut() || "";
      assert.doesNotMatch(said, /only know the way to bars and hotels/,
        `"enter ${label}" from ${rid} fell through to TRAVEL`);
      assert.doesNotMatch(said, /didn't parse|didn't understand/i,
        `"enter ${label}" from ${rid} didn't parse`);
      tried++;
    }
  }
  assert.ok(tried > 80, `only ${tried} doorways exercised — enumeration regressed?`);
});

test("the Act One reset carries identity and NOTHING conversational", () => {
  // The piggyback class: G.player.said rode the identity carry-over, so an NPC
  // grapevine-scolded you over an answer from a night that never happened. The
  // carry list is an ALLOWLIST — anything new on G.player must opt in here.
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight",
    said: { home: "leeds" }, heard: { home: true } };
  G.pendingChoice = null; G.stage = "act1";
  _act1Fail("dawn");
  assert.equal(G.player.origin, "monger", "identity must survive the reset");
  assert.equal(G.player.personality, "joker");
  assert.deepEqual(G.player.said, {}, "what you TOLD people must not survive — dawn wipes the slate");
  assert.equal(G.act1Tries, 1, "the attempt count survives (it unlocks HINT)");
});

test("the flower seller works open-air bars only, and the rose gifts your date", () => {
  startSoi6Mode(); G.flags.act1Done = true; G.stage = "vacation";
  const beerRoom = Object.keys(ROOMS).find(r => ROOMS[r].barType === "beer" &&
    Object.keys(NPC_ROLES).some(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === r));
  const g = Object.keys(NPC_ROLES).find(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === beerRoom);
  G.room = beerRoom; G.convo = g; G.soc.drinks = { [g]: 2 }; G.money = 5000;
  // it fires when you're courting a girl at an open-air bar
  let fired = false;
  for (let i = 0; i < 300 && !fired; i++) { G.flowerDay = 0; G.pendingEnc = null; _flowerTick(); if (G.pendingEnc === "flower") fired = true; }
  assert.ok(fired, "the flower seller never came to an open-air bar");
  const bond0 = G.soc.drinks[g];
  out = []; run("buy rose");
  assert.equal(G.itemLoc.rose, null, "the rose wasn't given (should be consumed to her)");
  assert.ok(G.soc.drinks[g] > bond0, "the gifted rose didn't warm her");
  // it does NOT work in an enclosed go-go
  const gogo = Object.keys(ROOMS).find(r => ROOMS[r].barType === "gogo" &&
    Object.keys(NPC_ROLES).some(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === r));
  if (gogo) {
    const g2 = Object.keys(NPC_ROLES).find(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === gogo);
    G.room = gogo; G.convo = g2; G.soc.drinks = { [g2]: 2 };
    let f2 = false;
    for (let i = 0; i < 300; i++) { G.flowerDay = 0; G.pendingEnc = null; _flowerTick(); if (G.pendingEnc === "flower") f2 = true; }
    assert.ok(!f2, "the flower seller wrongly worked an enclosed go-go");
  }
});

test("GIVE reacts by item kind: food and condoms warm a working girl, once a night", () => {
  // Design (2026-08-17): GIVE reacts to an item's `kind`, not a growing (item,npc)
  // switch. Food = care on this soi (+bond); condoms = practical + funny (+bond);
  // both once per girl per night; earmarked quest food still waves away safely.
  startSoi6Mode(); G.flags.act1Done = true;
  const room = Object.keys(ROOMS).find(r => ROOMS[r].barType &&
    Object.keys(NPC_ROLES).some(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === r));
  G.room = room;
  const g = Object.keys(NPC_ROLES).find(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === room);
  const nm = NPCS[g].name.toLowerCase();
  // food: consumed, +1 bond
  G.itemLoc.moo_ping = "inventory"; const b0 = G.soc.drinks[g] || 0;
  out = []; run("give moo ping to " + nm);
  assert.equal(G.itemLoc.moo_ping, null, "food not consumed on gift");
  assert.equal((G.soc.drinks[g] || 0) - b0, 1, "food gift didn't warm her");
  // second food same night: no extra bond (throttle)
  G.itemLoc.noodles = "inventory"; const b1 = G.soc.drinks[g] || 0;
  run("give noodles to " + nm);
  assert.equal((G.soc.drinks[g] || 0) - b1, 0, "food fondness farmable within a night");
  // condoms (a counter, not an item): taken, +1 bond, amusing
  G.condoms = 5; const b2 = G.soc.drinks[g] || 0;
  out = []; run("give condom to " + nm);
  assert.ok(G.condoms < 5, "condoms not taken");
  assert.equal((G.soc.drinks[g] || 0) - b2, 1, "condom gift didn't warm her");
  // earmarked quest food (som_tam) to a non-target girl waves away, kept
  G.itemLoc.som_tam = "inventory";
  out = []; run("give som tam to " + nm);
  assert.equal(G.itemLoc.som_tam, "inventory", "an earmarked quest bite was spent as a casual gift");
  // kind:"gift" — a bought present warms her (unthrottled: it cost money). A
  // saleng gift keeps bespoke prose; a generic gift item (shades) uses the pool.
  G.itemLoc.shades = "inventory"; const b3 = G.soc.drinks[g] || 0;
  out = []; run("give shades to " + nm);
  assert.equal(G.itemLoc.shades, null, "a gift wasn't consumed");
  assert.equal((G.soc.drinks[g] || 0) - b3, 1, "a gift didn't raise fondness");
});

test("quest/clue items warn on drop and a dropped one surfaces in QUESTS", () => {
  // Design ask (2026-08-17): a set-down quest item shouldn't be a silent trap.
  startSoi6Mode(); G.flags.act1Done = true; G.stage = "vacation";
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.room = "soi6_mid"; G.itemLoc.tiffin = "inventory"; G.dropped = {};
  // plain DROP is refused with a warning; the item stays carried
  out = []; run("drop tiffin");
  assert.match(lastOut(), /ANYWAY/, "no confirm hint on a keepsafe drop");
  assert.equal(G.itemLoc.tiffin, "inventory", "keepsafe item dropped without confirming");
  // DROP … ANYWAY overrides
  out = []; run("drop tiffin anyway");
  assert.equal(G.itemLoc.tiffin, "soi6_mid", "the ANYWAY override didn't drop it");
  assert.ok(G.dropped.tiffin, "the drop wasn't recorded for the journal");
  // QUESTS names where it is
  out = []; run("quests");
  assert.match(lastOut(), /left a tiffin.*soi 6|left a tiffin/i, "QUESTS doesn't surface the dropped item");
  // a keepsafe item at its SPAWN (never carried) must NOT show
  assert.doesNotMatch(lastOut(), /amulet/i, "a spawned (never-dropped) keepsafe item leaked into QUESTS");
  // picking it back up clears the reminder
  G.room = "soi6_mid"; run("take tiffin");
  out = []; run("quests");
  assert.doesNotMatch(lastOut(), /left a tiffin/i, "re-taking didn't clear the QUESTS reminder");
});

test("polite natural-language and Zork verbs stay voiced, and a question isn't an answer", () => {
  // Alan (widower, polite sentences) + the veteran (Zork ledger): the audience
  // types full courtesies and classic IF verbs; the house rule is no plausible
  // input dead-ends in didn't-parse. Also: a question BACK to her must not be
  // captured as her question's answer (it stored a "?" sentence as identity).
  startSoi6Mode(); G.flags.act1Done = true;
  const HUH = /didn't understand|didn't parse|soi blinks|no idea what/i;
  G.room = _npcRoom("noi") || G.room;
  for (const c of ["thank you", "i love you", "did you eat yet", "can i walk you home",
                   "touch it", "taste beer", "tell noi about mot", "verbose", "restore",
                   "move table", "close door", "good evening"]) {
    out = []; run(c);
    assert.doesNotMatch(lastOut(), HUH, `"${c}" dead-ended in the parse fallback`);
    assert.ok(lastOut().length > 0, `"${c}" printed nothing`);
  }
  // "i" alone is still inventory
  out = []; run("i");
  assert.match(lastOut(), /carrying|฿/i, "bare I still lists inventory");
  // a question back to a pending asker is not stored as the answer
  G.convo = "noi"; G.convoQ = { id: "noi", key: "home" };
  run("what is your name");
  assert.equal((G.player.said || {}).home, undefined, "a question was captured as an identity answer");
});

test("SHOW answers for every item shape, and DROP ALL keeps your pockets", () => {
  // SHOW <item> TO <npc> crashed for every non-receipt item (the fix passed the
  // whole arg as _doGive's itemWord; veteran playtest 2026-08-17, the session's
  // only pageerror). And DROP ALL substring-matched "all" into "w-ALL-et".
  startSoi6Mode(); G.flags.act1Done = true;
  G.room = _npcRoom("noi") || G.room;
  for (const c of ["show phone to noi", "show wallet to noi", "show me the money"]) {
    out = []; assert.doesNotThrow(() => run(c), c);
    assert.ok(lastOut().length > 0, `"${c}" printed nothing (the silent-crash shape)`);
  }
  const before = Object.entries(G.itemLoc).filter(([, l]) => l === "inventory").map(([i]) => i);
  out = []; run("drop all");
  const after = Object.entries(G.itemLoc).filter(([, l]) => l === "inventory").map(([i]) => i);
  assert.deepEqual(after, before, "DROP ALL moved something out of the pockets");
  assert.match(lastOut(), /decline/i, "and it answers in voice");
});

test("the quest journal never prints an un-earned clue's content", () => {
  // The information-flow class: the milestone LABEL is the safe PIN. Functional
  // tests asked "does the checklist render"; this one asks what it reveals.
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.pendingChoice = null; G.stage = "act1";
  out = []; run("quests");
  const journal = out.join("\n");
  assert.doesNotMatch(journal, /number 71|lucky 9/, "the journal leaked the safe PIN on turn one");
  assert.match(journal, /Clue: \(something you haven't found yet\)/, "the mask line shows instead");
  G.flags.pinPart71 = true;
  out = []; run("quests");
  assert.match(out.join("\n"), /number 71/, "an EARNED clue prints in full");
});

// ── The Nite Owl's Box 15 (docs/ctf.md) ──────────────────────────────────────
// A puzzle hidden for security-minded players. These tests exist because the
// content is INERT to the game — nothing calls it, no quest gates on it, and no
// playthrough touches it — so ordinary coverage would never notice it rotting.
// A "tidy-up" that regenerates the ciphertext, renames the phrase, or pools the
// ad would break a live puzzle silently and only strangers would find out.

// The same Vigenère any solver reaches for. Independent of the game code on
// purpose: if the engine ever grew its own cipher helper, testing the ad
// against that helper would only prove it is self-consistent.
function _vigenere(txt, key, dir) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ki = 0;
  return [...txt.toUpperCase()].map(c => {
    const i = A.indexOf(c);
    if (i < 0) return c;
    const k = A.indexOf(key[ki++ % key.length]);
    return A[(i + dir * k + 26) % 26];
  }).join("");
}

test("Box 15 decodes with the key the column prints in every issue", () => {
  const ct = _OWL_BOX15[1].replace(/[^A-Z]/g, "");
  assert.equal(_vigenere(ct, "HOOT", -1),
    "TOTHESOLVERTELLTHEOWLYOUCOUNTEDTHEHOOTS",
    "the ad no longer decodes — regenerate the puzzle deliberately or not at all");
});

test("the ad names its own key, and the key is on the page", () => {
  // "the same four letters in every issue" is the whole clue; HOOT is 4 letters
  // and _doColumn's signoff is fixed, so the hint stays true.
  assert.match(_OWL_BOX15[0], /four letters/);
  assert.equal("HOOT".length, 4);
  out = []; G.stage = "vacation"; _doColumn();
  const col = lastOut();
  assert.match(col, /HOOT/, "the key must still be printed in the column it unlocks");
  assert.ok(col.includes(_OWL_BOX15[1]), "and the ciphertext must actually run in the issue");
});

test("the ad is identical in every issue, for every player, forever", () => {
  // determinism is not a style preference here: solvers compare notes, and a
  // ciphertext that varied by day or by seed would make the puzzle unsharable
  const issues = new Set();
  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    for (const vac of [0, 1, 2]) {
      out = []; G.day = day; G.vacation = vac; G.stage = "vacation";
      _doColumn();
      issues.add(lastOut().split("\n").find(l => l.includes("Box 15")));
    }
  }
  assert.equal(issues.size, 1, "Box 15 drifted between issues");
});

test("the decoded instruction is a command the game actually answers", () => {
  // the plaintext tells you to TELL THE OWL YOU COUNTED THE HOOTS — if that
  // phrase ever stops being accepted, the puzzle dead-ends at the last step
  out = [];
  run("i counted the hoots");
  assert.match(lastOut(), /sanuk\{/, "the solution phrase no longer pays out");
  assert.equal(_flag("owlBox15"), true);
  for (const variant of ["counted the hoots", "I Counted The Hoots."]) {
    out = []; run(variant);
    assert.match(lastOut(), /sanuk\{/, `solvers will type "${variant}"`);
  }
});

test("solving it costs no turn and grants no advantage", () => {
  // it is typeable in any state, including mid-game-modal, so it must not move
  // the economy or the clock
  const t = G.turns, money = G.money, happy = G.happy;
  run("i counted the hoots");
  assert.equal(G.turns, t, "the puzzle answer burned a turn");
  assert.equal(G.money, money);
  assert.equal(G.happy, happy);
});

test("the puzzle survives cheats being switched off for release", () => {
  // CHEATS_ENABLED is meant to ship false; the Box 15 answer must not ride on it
  const was = CHEATS_ENABLED;
  try {
    CHEATS_ENABLED = false;
    out = []; run("i counted the hoots");
    assert.match(lastOut(), /sanuk\{/, "shipping with cheats off would retire the puzzle");
  } finally { CHEATS_ENABLED = was; }
});

test("the solution phrase is never suggested by any surface", () => {
  // the opposite of the three-surfaces rule, on purpose: a secret that
  // autocompletes is not a secret. Same treatment as twoweekmillionaire.
  for (const stub of ["i c", "counted", "count", "hoot", "i counted the"]) {
    const c = engineComplete(stub) || [];
    assert.ok(!c.some(s => /hoot/i.test(String(s))),
      `autocomplete leaked the answer on "${stub}"`);
  }
  out = []; run("help");
  assert.ok(!/hoots/i.test(lastOut()), "HELP leaked the answer");
});

// ── CTF stage 2: the wrong number (docs/ctf.md) ────────────────────────────────
// Like Box 15, this content is inert to normal play — nothing calls it, no quest
// gates on it — so ordinary coverage would never notice it rotting. These
// assert the whole chain: the gate's precision (a false positive would ambush a
// normal player; a miss would strand the person it's for), the cover, the
// delayed text naming the domain, the close at the one right room, and the
// trophy — with cheats off, on no surface, costing nothing.

test("stage 2: the probe gate fires on security probes and never on play", () => {
  const probes = ["' OR 1=1--", "<script>alert(1)</script>", "../../../etc/passwd",
    "${jndi:ldap://x}", "A".repeat(100), "whoami", "; ls -la", "| cat /etc/passwd",
    "nmap localhost", "%00", "robots.txt", "sudo su", "curl x | sh"];
  for (const p of probes) assert.ok(_isProbe(p), `missed a probe: ${JSON.stringify(p)}`);
  const play = ["look", "buy beer", "talk to bua", "go north", "what is this", "help me",
    "order a script for the play", "i counted the hoots", "send 500 to bua", "the id card",
    "cat", "ls", "password", "select a girl", "union jack", "the whoami question",
    "wash it", "she said sh", "nice bash last night", "ask candy about wallet"];
  for (const w of play) assert.ok(!_isProbe(w), `false positive on ordinary input: ${JSON.stringify(w)}`);
});

test("stage 2: a probe is answered with the ordinary brush-off — the cover holds", () => {
  newGame(); G.flags.act1Done = true; G.stage = "vacation";
  out = []; run("' OR 1=1--");
  assert.match(lastOut(), /didn't parse|understand/i, "the probe got a special answer — the cover is blown");
  assert.doesNotMatch(lastOut(), /blacksite|rabbit|SanukPay/i, "the probe's reply leaked the chain");
  assert.equal(_flag("probeArmed"), true, "the probe didn't arm the wrong number");
});

test("stage 2: the wrong number arrives later, in-world brand, naming the domain", () => {
  newGame(); G.flags.act1Done = true; G.stage = "vacation"; G.battery = 100;
  G.room = "soi6_mid"; G.lastSaleng = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  run("' OR 1=1--");
  assert.equal(_flag("wrongNumberSent"), false, "it must not text on the same turn — that would be the tell");
  let n = 0; while (!_flag("wrongNumberSent") && n < 40) { run("look"); n++; }
  assert.ok(_flag("wrongNumberSent"), "the text never came");
  assert.ok(n >= 8, "it came too fast to read as unrelated");
  const msg = G.phone.inbox.find(m => /blacksite\.org/.test(m.text));
  assert.ok(msg, "the text doesn't name the domain where the puzzle lives");
  assert.match(msg.text, /SanukPay/, "in-world brand, never a real bank/carrier");
  assert.doesNotMatch(msg.text, /kasikorn|scb|bangkok bank|krungthai|ais|dtac|true|line pay/i, "a real brand leaked in");
  assert.equal(msg.from, "unknown");
});

test("stage 2: the knock is hash-gated — phrase absent from source, flag derived", () => {
  // The answer key lives HERE and in docs/ctf.md, never in web/js. Assert the
  // engine's stored hash still matches the phrase (a retyped hash or a changed
  // normaliser would strand every solver silently), that no engine file carries
  // the phrase in plaintext, and that _sha256 is real (FIPS test vector).
  const PHRASE = "KNOCK, KNOCK FARANG";
  assert.equal(_sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "_sha256 is not SHA-256");
  assert.equal(_sha256(_knockNorm(PHRASE)), _RABBIT_KNOCK_SHA, "the stored hash no longer matches the phrase");
  for (const v of [PHRASE, "knock knock farang", "  Knock,   knock  farang!!", "KNOCK KNOCK FARANG."])
    assert.ok(_isRabbitKnock(v), `normalisation rejects "${v}"`);
  assert.ok(!_isRabbitKnock("knock knock"), "a partial knock must not open the door");
  assert.ok(!_isRabbitKnock("i followed the white rabbit"), "the old phrase is retired");
  for (const f of ["engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js", "world.js", "main.js", "term.js"]) {
    const src = readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
    assert.ok(!/knock,?\s*knock\s*farang/i.test(src), `${f} carries the phrase in plaintext — that's a grep, not a puzzle`);
  }
});

test("stage 2: the knock closes only at the White Rabbit, pays a flag, costs nothing", () => {
  newGame(); G.flags.act1Done = true; G.stage = "vacation";
  G.room = "soi6_mid"; out = [];
  run("knock, knock farang");
  assert.doesNotMatch(lastOut(), /sanuk\{/, "paid out in the wrong room");
  assert.equal(_flag("ctfRabbit"), false);
  G.room = "white_rabbit";
  const t = G.turns, money = G.money, happy = G.happy;
  out = []; run("KNOCK, KNOCK FARANG");
  assert.match(lastOut(), /sanuk\{3d190498fc4a2399ed773457\}/, "the derived flag changed — recompute docs/ctf.md if the phrase did");
  assert.equal(_flag("ctfRabbit"), true);
  assert.equal(G.turns, t, "burned a turn"); assert.equal(G.money, money); assert.equal(G.happy, happy);
  G.player = { origin: "monger", personality: "joker", orientation: "straight" }; // WHO AM I needs an identity
  out = []; run("who am i");
  assert.match(lastOut(), /followed the white rabbit/i, "no trophy in WHO AM I");
});

test("stage 2: survives cheats off, and no surface suggests the knock", () => {
  const was = CHEATS_ENABLED;
  try {
    CHEATS_ENABLED = false;
    newGame(); G.flags.act1Done = true; G.room = "white_rabbit";
    out = []; run("knock, knock farang");
    assert.match(lastOut(), /sanuk\{/, "shipping with cheats off would retire stage 2");
  } finally { CHEATS_ENABLED = was; }
  for (const stub of ["k", "kn", "knock", "knock,", "knock knock", "knock, knock f"]) {
    const c = engineComplete(stub) || [];
    assert.ok(!c.some(s => /farang/i.test(String(s))), `autocomplete leaked the knock on "${stub}"`);
  }
});

test("WHO AM I carries the trophy, and only after it is earned", () => {
  G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  out = []; run("who am i");
  assert.ok(!/Box 15/.test(lastOut()), "the trophy showed up unearned");
  run("i counted the hoots");
  out = []; run("who am i");
  assert.match(lastOut(), /Box 15/);
});
