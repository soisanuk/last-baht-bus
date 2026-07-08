// Engine tests: parser, systems (money/battery/darkness), puzzle gating, and
// a full scripted playthrough from the beach to the happy ending.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}

let out = [];
engineInit((text) => out.push(text));

function run(...cmds) {
  for (const c of cmds) doCommand(c);
}
function lastOut() { return out.join("\n"); }
function state() { return G; } // vm globals share this realm

beforeEach(() => { out = []; newGame(); });

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
  assert.equal(state().room, "lk_maze_4");
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
  run("ring bell", "ring bell"); // also clears the heat
  assert.equal(state().soc.bells.rainbow_girls, 2);
  state().soc.drinks.ploy = 4;
  run("spank ploy"); // favor 4 + bell 2 − severity 4 = lean-in
  assert.match(lastOut(), /returns fire/i);
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
    "out", "n", "in", "talk to lek",                 // Lek: Oy has it
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
  state().room = "candy_bar";
  run("dance", "sing");
  assert.match(lastOut(), /floor show/);
  assert.match(lastOut(), /never once mattered/);
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
  // exits of the current room
  const exits = engineComplete("go ");
  assert.ok(exits.length && exits.every(d => ROOMS.candy_bar.exits[d]));
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
