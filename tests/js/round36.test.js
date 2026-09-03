// Round 36 — Lionel, the stubborn regular (the four never-entered rooms):
// the Areca Lodge, the central beach, the Soi 8 bars, the short-time motel.
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
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;   // the Beach Road peddler (12%/tick in a bar) would otherwise interrupt a LOOK
});
const girlAt = room => Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _npcRoom(id) === room);

test("a question about the beach is not a favour: Tan's Beach Road node stays behind its own topic (Lionel)", () => {
  assert.equal(_selfNamedNode("tan", "beach"), null, "place furniture is not a topic");
  G.room = "soi6_street"; run("ask tan about beach");
  assert.ok(!_flag("debtSettled") && !_flag("owesTan"), "no side effect from a question about sand");
});

test("SWIM: your own hotel's pool, the sand a step away, and the old line only where true (Lionel)", () => {
  G.hotel = "areca"; G.room = "areca_room"; const h = G.happy;
  run("swim");
  assert.ok(_POOL_SWIM.some(l => text().includes(l)), "the Areca's garden pool");
  assert.equal(G.happy, h + 1);
  out = []; run("swim"); assert.equal(G.happy, h + 1, "once a day");
  G.room = "beach_rd_c"; out = []; run("swim");
  assert.match(text(), /one step west of here \(W\)/, "the promenade is right there");
  G.room = "promenade"; out = []; run("swim");
  assert.match(text(), /wade in to your knees/, "the promenade is the sand's edge");
  G.hotel = "sabai"; G.room = "hotel_room"; out = []; run("swim");
  assert.match(text(), /hotel pool you are not a guest of/, "the Sabai has no pool — the old line still has a home");
});

test("the promenade agrees with itself: the sea is there to see, examine, and walk onto (Lionel)", () => {
  G.room = "promenade";
  run("examine beach"); assert.match(text(), /The sand starts where the paving stops/);
  out = []; run("watch sunset"); assert.ok(_WATCH_SEA.some(l => text().includes(l)), "a sea view from the sea's edge");
  out = []; run("n"); assert.equal(G.room, "central_beach", "north along the sand");
  run("s"); assert.equal(G.room, "promenade");
  G.room = "central_beach"; out = []; run("watch sea"); assert.ok(_WATCH_SEA.some(l => text().includes(l)));
});

test("Soi 7 advertises the alley the IN exit leads to (Lionel)", () => {
  G.room = "pattaya_soi_7"; run("look");
  assert.match(text(), /unlit alley \(IN\)/);
  out = []; run("examine alley"); assert.match(text(), /lemongrass floor cleaner/);
  run("in"); assert.equal(G.room, "short_time_motel");
});

test("MOTOSAI TO HOTEL knows the Areca (Lionel)", () => {
  G.hotel = "areca"; G.room = "beach_rd_klang"; G.money = 2000;
  run("motosai to hotel");
  assert.doesNotMatch(text(), /where to\?/, "no re-prompt");
  assert.equal(G.room, MOTOSAI_DESTS["soi buakhao"].room, "the nearest stand to Soi Diana");
});

test("the desk runs your card before it posts your bag to Naklua (Lionel)", () => {
  G.hotel = "areca"; G.money = 450; G.bank = 94700; G.room = "areca_room";
  _chargeRent(false);
  assert.equal(G.hotel, "areca"); assert.equal(G.bank, 94700 - _HOTELS.areca.rate); assert.equal(G.money, 450);
  assert.match(text(), /runs your card/);
  G.bank = 0; G.money = 450; out = []; _chargeRent(false);
  assert.notEqual(G.hotel, "areca", "…and the ladder still runs when there is no card to run");
});

test("Somchith's rooms: alone is voiced, with company it is the short-time round, once a night (Lionel)", () => {
  G.room = "short_time_motel"; run("get room");
  assert.ok(_MOTEL_ALONE.some(l => text().includes(l)), "room is for two");
  out = []; run("ask somchith about short time"); assert.match(text(), /300 baht, two hours.*\(GET ROOM\)/s, "the trade's own question lands");
  out = []; run("ask somchith about room"); assert.match(text(), /GET ROOM/);
  const g = girlAt("neon_palm");
  G.party = { ids: [g], stops: 0, spent: 0, seen: {} }; G.money = 2000;
  const h = G.happy, b = G.soc.drinks[g] || 0, nt = G.nightTurn; out = [];
  run("get room");
  assert.ok(_MOTEL_ROOM_LINES.some(l => text().includes(_fmt(l, { n: NPCS[g].name, p: MOTEL_ROOM, m: 2000 - MOTEL_ROOM }).slice(0, 40))), "the scene");
  assert.equal(G.money, 2000 - MOTEL_ROOM);
  assert.equal(G.happy, h + 5, "the ST happy, through the treadmill");
  assert.equal(G.soc.drinks[g], b + 2, "the earned bond");
  assert.ok(G.nightTurn > nt, "the hour passes");
  assert.ok(G.party && G.party.ids[0] === g, "she is still on your arm");
  out = []; run("book room"); assert.ok(_MOTEL_AGAIN.some(l => text().includes(_fmt(l, { n: NPCS[g].name }))), "once is romance");
  assert.equal(G.money, 2000 - MOTEL_ROOM, "not charged twice");
  G.soc.motelWith = {}; G.money = 100; out = []; run("get room");
  assert.match(text(), /does not run a tab/); assert.equal(G.money, 100);
});

test("every motel phrasing a man with a girl on his arm tried rents the room (Lionel)", () => {
  const g = girlAt("neon_palm");
  for (const cmd of ["get room", "book room", "rent room", "take a room", "buy room", "short time", "pay somchith", "pay somchith 300", "room", "get key"]) {
    newGame(); _setFlag("act1Done"); G.money = 2000; G.room = "short_time_motel";
    G.party = { ids: [g], stops: 0, spent: 0, seen: {} }; out = [];
    run(cmd);
    assert.equal(G.money, 2000 - MOTEL_ROOM, cmd);
  }
});

test("GOODBYE / SEND HER HOME parts with a companion on your terms (Lionel)", () => {
  const g = girlAt("neon_palm");
  G.party = { ids: [g], stops: 2, spent: 0, seen: {} }; G.room = "neon_palm"; G.money = 1000;
  const b = G.soc.drinks[g] || 0;
  run("goodbye");
  assert.ok(_PARTY_GOODBYE.some(l => text().includes(_fmt(l, { who: NPCS[g].name, c: PARTY_TAXI / 2 }))));
  assert.equal(G.party, null); assert.equal(G.money, 1000 - PARTY_TAXI / 2); assert.equal(G.soc.drinks[g], b + 1);
  G.party = { ids: [g], stops: 0, spent: 0, seen: {} }; out = []; run(`send ${NPCS[g].name.toLowerCase()} home`);
  assert.equal(G.party, null, "the banking app doesn't eat it");
  out = []; run("send bee home"); assert.match(text(), /Nobody on your arm/, "voiced when there is nobody to send");
});

test("a bar girl answers the trade's own question — mama first, then her (Lionel)", () => {
  const g = girlAt("neon_palm"); G.room = "neon_palm";
  run(`ask ${NPCS[g].name.toLowerCase()} about short time`);
  assert.match(text(), /BARFINE <name>/, "the two-fee canon, with the verb");
  out = []; run(`ask ${NPCS[g].name.toLowerCase()} about how much`);
  assert.match(text(), /Mamasan first|BARFINE/);
});

test("the room says who runs the floor and who keeps the till (Lionel)", () => {
  G.room = "neon_palm"; run("look");
  // who is IN tonight is a per-night hash (a girl can be off), so derive the line
  const here = _npcsHere();
  const mama = here.find(id => NPC_ROLES[id] === "mamasan"), till = here.find(id => NPC_ROLES[id] === "cashier");
  if (mama && till) assert.match(text(), new RegExp(`\\(${NPCS[mama].name} runs the floor; ${NPCS[till].name} keeps the till\\.\\)`));
  else if (mama) assert.match(text(), /runs the floor and the till both/);
  else if (till) assert.match(text(), /keeps the till\.\)/);
  else assert.fail("Neon Palm has no role carrier tonight at all");
  const solo = Object.keys(ROOMS).find(r => ROOMS[r].barType && _soloMama(r) && _staffAt(r).length);
  if (solo) { G.room = solo; out = []; run("look"); assert.match(text(), /runs the floor and the till both/); }
});

test("a draw's flat midnight menu explains itself (Lionel)", () => {
  const d = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _isDraw(id) && ROOMS[_npcRoom(id)].barType === "beer" && !POPULAR_GIRLS.includes(id));
  assert.ok(d, "a draw exists in a beer bar");
  G.room = _npcRoom(d); G.nightTurn = 65; G.soc.drinks[d] = 6; G.soc.charmed = { [d]: true };
  G.pendingBf = { id: d, st: 600, lt: 600, party: 600 }; out = []; _bfPrompt();
  assert.match(text(), /is this bar's draw — the mama gives no midnight discount/);
});

test("from a Beach Road bar the short-time walk is to Somchith's (Lionel)", () => {
  assert.match(readFileSync(join(here, "../../web/js/engine-systems.js"), "utf8"), /alley off Soi 7 to Somchith's/);
});

test("TAKE on a fixture outside a bar doesn't blame the bar (Lionel)", () => {
  G.room = "short_time_motel"; run("take keys");
  assert.match(text(), /part of the place, not something you carry off/);
  assert.doesNotMatch(text(), /the bar would notice/);
});

test("a name with NO in it is not a no to the rose seller — the flirt runs (Lionel)", () => {
  G.room = "neon_palm";
  const noey = _npcsHere().find(id => NPC_ROLES[id] && /no/.test(NPCS[id].name.toLowerCase()));   // Noey keeps the till — a FLIRT still parses
  assert.ok(noey, "a girl whose name contains 'no'");
  G.pendingEnc = "flower"; G.flowerFor = noey; G.money = 1000;
  run("flirt " + NPCS[noey].name.toLowerCase());
  assert.match(text(), /steers the child on/, "the pitch lapses");
  assert.match(text(), /You flirted with/, "…and the flirt ran");
  assert.equal(G.pendingEnc, null); assert.equal(G.money, 1000, "no rose bought, no wave charged");
});

test("a soft pitch declined by an unrelated command says so BEFORE the decline prose (Lionel)", () => {
  G.room = "neon_palm"; G.pendingEnc = "peddler"; G.money = 1000;
  run("buy beer");   // a real action, not an observation verb (QUESTS/LOOK re-show the moment)
  const i = out.findIndex(o => /wasn't an answer/.test(o.text));
  const j = out.findIndex(o => /slow head-shake|re-shoulders/.test(o.text));
  assert.ok(i >= 0 && j > i, "note first, then the peddler moves on: " + i + " " + j);
});
