// Round 53 (2026-09-26) — three lenses nobody had played: Neville, fourteen years
// sober, who drinks soda all night and refuses every poured shot (lens: sober);
// Marek, the ship's engineer who keeps the body ledger and holds the game to its
// own meters (lens: body-ledger); Clive, the hotel reviewer who slept in all four
// (lens: hotel-hopper). Neville's severe: eight units of drink reached a man who
// ordered none of them, and the sentence "I don't drink" had no verb.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

// ── Neville ──────────────────────────────────────────────────────────────────
test("I DON'T DRINK is a verb: declared once, the house stops pouring and the readout stops calling sobriety fixable", () => {
  G.room = "stinky_bar"; G.nightTurn = 30;
  out = []; doCommand("i don't drink");
  assert.equal(G.player.teetotal, true);
  assert.ok(_TEETOTAL_SAID.some(s => text().includes(s)), "voiced");
  // a comp — the bell's bottle back across the rail — is declined on his behalf
  G.soc.drunk = 0; out = []; doCommand("ring bell");
  assert.equal(G.soc.drunk, 0, "the bell's bottle never reached the meter");
  assert.ok(_COMP_DECLINED.some(s => text().includes(s)), "and the decline is said, not silent");
  // the manager's welcome shot, the same
  G.soc.mgrShot = {}; G.soc.drunk = 0; out = []; _managerWelcome();
  assert.equal(G.soc.drunk, 0, "the welcome shot is not poured into him");
  out = []; doCommand("diagnose");
  assert.match(text(), /stone sober, as ordered/);
  assert.doesNotMatch(text(), /which is fixable/);
  // a bare DRINK is the soft option, not a Chang
  const m0 = G.money; out = []; doCommand("drink");
  assert.equal(G.soc.drunk, 0); assert.ok(G.money < m0, "a soda was bought");
  assert.match(text(), /soda water/i);
});

test("anyone can hand a just-poured comp back inside two turns; a stale DECLINE has nothing to refuse", () => {
  G.room = "stinky_bar"; G.nightTurn = 30; G.soc.drunk = 0;
  doCommand("ring bell");
  assert.equal(G.soc.drunk, 1, "the bell's bottle landed (Mario's ruling: comped drinks are drinks)");
  out = []; doCommand("decline");
  assert.equal(G.soc.drunk, 0, "…and went back across the rail");
  assert.ok(_COMP_BACK.some(s => text().includes(s)));
  doCommand("wait"); doCommand("wait"); doCommand("wait");
  out = []; doCommand("refuse");
  assert.match(text(), /Nothing's been put in front of you/);
});

test("BUY BEER FOR <lady> is her drink, not yours", () => {
  G.room = "lucky_tiger"; G.nightTurn = 30; G.soc.drunk = 0;
  for (const c of ["buy beer for lek", "buy lek a sprite", "buy coke for lek"]) {
    const n0 = (G.soc.drinkCount || {}).lek || 0;
    doCommand("wait 4");   // her glass has to run dry between rounds
    out = []; doCommand(c);
    assert.equal(G.soc.drunk, 0, `${c}: nothing on YOUR meter`);
    assert.equal(((G.soc.drinkCount || {}).lek || 0), n0 + 1, `${c}: one on hers`);
  }
});

test("the soft drink you asked for is the one that comes, and a 7-Eleven does not sell you a seat", () => {
  G.room = "stinky_bar"; G.nightTurn = 30;
  out = []; doCommand("buy coke"); assert.match(text(), /Coke/); assert.doesNotMatch(text(), /Sprite|soda water/);
  out = []; doCommand("buy sprite"); assert.match(text(), /Sprite/);
  assert.ok(!_SOFT_LINES.some(s => /at nine/.test(s)), "the soft pool no longer tells the time");
  const seven = Object.keys(ROOMS).find(r => ROOMS[r].seven && !ROOMS[r].barType);
  G.room = seven; out = []; doCommand("buy coke");
  assert.doesNotMatch(text(), /seat under you/, "no seat on a pavement");
  assert.match(text(), /-฿20/);
});

test("the town answers a sober man: SOBER / ALCOHOL land on a register, and Eddy's own answer still comes first", () => {
  G.room = "stinky_bar"; doCommand("talk to bert"); out = []; doCommand("ask bert about sober");
  assert.ok(_SOBER_HOUSE.some(s => text().includes(s.replace("{n}", "Bert"))), "the house register");
  G.room = "lucky_tiger"; doCommand("talk to lek"); out = []; doCommand("ask lek about alcohol");
  assert.ok(_SOBER_FLOOR.some(s => text().includes(s.replace("{n}", "Lek"))), "the floor register");
  G.room = _npcRoom("fast_eddy"); doCommand("talk to eddy"); out = []; doCommand("ask eddy about sober");
  assert.ok(!_SOBER_HOUSE.some(s => text().includes(s.replace("{n}", "Fast Eddy"))), "an authored node outranks the pool");
});

test("a Soi 6 bell has no stage; the Vic's TAO RAI has no lady drink; TRAVEL knows when you are already in the district", () => {
  G.room = "kitten_corner"; G.nightTurn = 30; out = []; doCommand("ring bell");
  assert.doesNotMatch(text(), /girls on stage/); assert.ok(_BELL_SOI6.some(s => text().includes(s)));
  G.room = "queen_vic"; out = []; doCommand("tao rai");
  assert.doesNotMatch(text(), /lady drink/);
  G.room = "soi6_deep"; G.heardOf.queen_vic = true; out = []; doCommand("travel queen vic inn");
  assert.doesNotMatch(text(), /over in Soi 6/); assert.match(text(), /on this side of town/);
});

// ── Marek ────────────────────────────────────────────────────────────────────
test("sobering runs from the first drink, one unit per twenty turns — not on the wall clock", () => {
  G.room = "stinky_bar"; G.nightTurn = 59; G.soc.drunk = 0; G.soc.soberNext = null;
  G.soc.drunk = 1; _tick();            // nightTurn → 60: the old code sobered you here
  assert.equal(G.soc.drunk, 1, "a beer bought at 23:54 is not gone at midnight");
  for (let i = 0; i < 19; i++) _tick();
  assert.equal(G.soc.drunk, 1, "…nor at 01:54");
  _tick();
  assert.equal(G.soc.drunk, 0, "twenty turns after the drink, it is");
  // a second drink does not reset the clock — a steady drinker still sobers
  G.nightTurn = 30; G.soc.drunk = 1; G.soc.soberNext = null; _tick();
  for (let i = 0; i < 10; i++) _tick();
  G.soc.drunk += 1;                    // another beer, ten turns in
  for (let i = 0; i < 10; i++) _tick();
  assert.equal(G.soc.drunk, 1, "the first unit came off on the original schedule");
});

test("EXAMINE ME sees the drunk and the bandaged; DIAGNOSE names the hangover", () => {
  G.room = "stinky_bar"; G.soc.drunk = 7; out = []; doCommand("examine me");
  assert.match(text(), /survey was conducted drunk/, "G.soc.drunk, not the G.drunk that never existed");
  G.soc.drunk = 0; G.hurt = 1; out = []; doCommand("examine me");
  assert.match(text(), /dressing somewhere under the shirt/);
  G.hurt = 0; G.hangover = 2; out = []; doCommand("diagnose");
  assert.match(text(), /hungover/);
  assert.doesNotMatch(text(), /DIAGNOSE if you want numbers/);
});

test("the truck is not milder than the bike: roadhit wakes you hurt and docks the same สนุก", () => {
  G.room = "sukhumvit_crossing"; G.happy = 20; const d0 = G.day;
  _nightSnapshot();   // the morning ledger needs a baseline to diff against (it sets G.lastNight)
  const saved = _rand; _rand = () => 0.5;
  try { _endNight("roadhit"); } finally { _rand = saved; }
  assert.equal(G.day, d0 + 1); assert.equal(G.hurt, 1, "banged up, like the bike"); assert.equal(G.happy, 12);
  out = []; doCommand("last night");
  assert.match(text(), /highway put you in the ward/, "the ledger carries the night's worst news");
});

test("REPLY <contact> is a message to them, CALL a LINE contact is voiced, WHO counts the other numbers", () => {
  G.room = "second_rd_c"; G.nightTurn = 30; const t0 = G.nightTurn;
  doCommand("get tested");
  assert.ok(G.phone.contacts.priew, "Priew is met at the clinic");
  assert.ok(G.nightTurn - t0 >= 4, "the test takes its twenty minutes: " + (G.nightTurn - t0));
  G.phone.jokeN = 1;
  out = []; doCommand("reply priew hello");
  assert.doesNotMatch(text(), /Queen Vic|Mort/, "not Mort's number");
  assert.match(text(), /555|lunch/, "her reply");
  out = []; doCommand("call priew"); assert.match(text(), /LINE contact/);
  out = []; doCommand("who"); assert.match(text(), /1 other number/);
  const seen = new Set(); for (let i = 0; i < 6; i++) { out = []; doCommand("message priew"); seen.add(text()); }
  assert.ok(seen.size >= 2, "her reply is pooled");
});

test("ENTER CLINIC at the junction is the test; ASK TAN ABOUT FOOD is his invitation", () => {
  G.room = "second_rd_c"; out = []; doCommand("enter clinic");
  assert.doesNotMatch(text(), /daytime/); assert.match(text(), /negative|clean|Clean/);
  G.room = _npcWhere("tan"); doCommand("talk to tan"); out = []; doCommand("ask tan about food");
  assert.match(text(), /FOLLOW TAN/);
});

test("the carts the prose sells: moo ping in the Tree Town lane, a pie at the Cricketers, the mall's menu, a shut cart points at the open one", () => {
  G.nightTurn = 26; G.hunger = 80;
  for (const [room, cmd] of [["tt_lane_2", "buy moo ping"], ["cricketers", "buy pie"]]) {
    G.room = room; G.hunger = 80; const m0 = G.money; out = []; doCommand(cmd);
    assert.ok(G.money < m0 && G.hunger < 80, `${room}: ${cmd} moves money and hunger`);
  }
  G.room = "mikes_mall"; G.nightTurn = 10; out = []; doCommand("read menu"); assert.match(text(), /khao man gai/);
  G.room = "second_rd_mall"; G.nightTurn = 26; G.hunger = 80; out = []; doCommand("buy fruit");
  assert.match(text(), /still trading here/, "the shut cart names the open one");
});

test("Beach Road knows where the sea is; the Vic's crisps are charged; the second bottle is the second bottle", () => {
  G.room = "beach_rd_s"; out = []; doCommand("w"); assert.match(text(), /West is the sea/);
  out = []; doCommand("swim"); assert.match(text(), /promenade/); assert.doesNotMatch(text(), /hotel pool/);
  assert.ok(!_MOTO_RIDE_BEACH.some(s => /on your left/.test(s)), "no left/right claim on a road that runs both ways");
  G.room = "queen_vic"; G.nightTurn = 56; G.hunger = 60; const m0 = G.money; out = []; doCommand("buy pie");
  assert.match(text(), /crisps/); assert.equal(G.money, m0 - QV_CRISPS, "a bag that lands is a bag that's paid for");
  G.hunger = 5; G.soc.qvCrisped = false; const m1 = G.money; out = []; doCommand("buy pie");
  assert.equal(G.money, m1, "a full man is not landed on");
  G.room = "hotel_room"; G.roomWater = 0; G.thirst = 90;
  doCommand("drink water"); out = []; doCommand("drink water");
  assert.match(text(), /second bottle/); assert.doesNotMatch(text(), /stands sentry/);
});

test("a สนุก dock at the floor prints what moved, and the quiz has more than one smirk", () => {
  G.happy = 0; out = []; _addHappy(-2);
  assert.doesNotMatch(text(), /-2 สนุก/); assert.match(text(), /already on the floor/);
  assert.ok(_QUIZ_WRONG_TAIL.length >= 4);
});

// ── Clive ────────────────────────────────────────────────────────────────────
test("SAFE / KEYPAD / PIN / CODE: the keypad prompt belongs to Oy's office, your room has the shoebox, and nowhere else has a keypad", () => {
  G.room = "areca_room"; G.hotel = "areca";
  for (const c of ["safe", "keypad", "code", "pin"]) { out = []; doCommand(c); assert.match(text(), /shoebox/, c); }
  G.room = "stinky_bar"; out = []; doCommand("keypad"); assert.match(text(), /Nothing in front of you takes a code/);
  G.room = "oy_office"; out = []; doCommand("safe"); assert.match(text(), /Three digits, on the keypad/);
});

test("TRAVEL takes the room's own printed name, any dash", () => {
  G.room = "beach_rd_c"; G.hotel = "sabai";
  for (const c of ["travel Your Room — Sabai Palms Hotel", "travel your room - sabai palms hotel", "travel your room"]) {
    G.room = "beach_rd_c"; out = []; doCommand(c);
    assert.notEqual(G.room, "beach_rd_c", c);
  }
});

test("the town answers for its four beds, by rate and by register", () => {
  G.room = "queen_vic"; G.nightTurn = 30; doCommand("talk to mort"); out = []; doCommand("ask mort about metropole");
  assert.match(text(), new RegExp("LK Metropole.*" + _hotelRate("metropole")), "a named hotel, its rate");
  G.room = "stinky_bar"; doCommand("talk to bert"); out = []; doCommand("ask bert about where to stay");
  assert.match(text(), /\d{3}/, "a generic ask names the nearest bed, with its rate");
  assert.ok(Object.values(_HOTELS).some(h => text().includes(h.name)));
});
