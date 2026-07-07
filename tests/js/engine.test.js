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

test("cindy withholds until the receipt proves your night", () => {
  state().room = "cindy_bar";
  run("ask cindy about wallet");
  assert.match(lastOut(), /Show me you were even here/i);
  run("read receipt", "talk to cindy");
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
  state().room = "cindy_bar";
  run("play pool");
  assert.match(lastOut(), /No pool table here/i);
  assert.equal(state().game, null);
});

test("connect 4: stakes escrowed, quitting forfeits them", () => {
  state().room = "cindy_bar";
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
  state().room = "cindy_bar";
  run("play connect 4");
  assert.equal(state().game.stake, 0);
  assert.match(lastOut(), /sanuk/i);
  run("quit");
  assert.equal(state().money, 0);
});

test("connect 4: a live game captures commands until it ends", () => {
  state().room = "cindy_bar";
  run("play connect 4", "n");
  assert.equal(state().room, "cindy_bar", "no walking away mid-game");
  run("quit");
});

test("connect 4: winning pays double and sets the legend flag", () => {
  state().room = "cindy_bar";
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
  state().soc.banned.cindy_bar = 0;
  state().turns = 5;
  run("enter cindy");
  assert.equal(state().room, "buakhao_market");
  assert.match(lastOut(), /Not tonight/i);
  state().turns = 45;
  run("enter cindy");
  assert.equal(state().room, "cindy_bar");
  assert.equal(state().soc.heat.cindy_bar, 1, "back in, but on notice");
});

test("a drink for the mamasan buys the whole bar's goodwill", () => {
  state().room = "cindy_bar";
  state().money = 500;
  run("buy drink for cindy");
  assert.equal(state().soc.drinks.cindy, 1);
  assert.ok(state().soc.mamaTreat.cindy_bar);
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
  state().room = "cindy_bar";
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
  state().room = "cindy_bar";
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
  state().room = "cindy_bar";
  run("barfine cindy");
  assert.match(lastOut(), /She IS the bar/i);
  state().room = "jasmine_garden";
  state().soc.drinks.fon = 5;
  state().soc.heat.jasmine_garden = 1;
  run("barfine fon");
  assert.match(lastOut(), /Not tonight, tilac/i);
  assert.equal(state().day, 2);
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
  state().room = "cindy_bar";
  state().money = 500;
  state().happy = 99;
  run("ring bell");
  assert.ok(state().happy >= 100);
  assert.ok(state().flags.sabaiSabai);
  assert.match(lastOut(), /สบายสบาย/);
  run("look");
  assert.match(lastOut(), /Cindy Bar/);
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
    // Act 2 — the gossip chain
    "e", "n", "in", "talk to cindy",                 // Cindy: Mot did it
    "out", "n", "in", "talk to lek",                 // Lek: Oy has it
    "out", "s", "in", "ask cindy about wallet",      // Cindy: som tam errand
    "out", "s", "w", "talk to bank",                 // Bank: helmet favour
    // LK Metro
    "e", "e", "e", "e", "in",                        // Starlight Bar
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
