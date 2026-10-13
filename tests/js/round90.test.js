// ROUND 90 (2026-10-13) — Sam (Opus), a Thai-Australian delivery driver who plays one-handed on a 390×844 phone
// and NEVER types. "I got through a whole week one-thumbed… but the girls don't remember what we did, and I can't
// ask them." The class is REACHABILITY: what rounds 84–89 taught the town to answer (last night, the sunrise, the
// present, the rain, after work, the hours) answered only typed questions. _situationTopics puts each on the chip
// palette where the answer fires; the dawn has a chip; a companion's wheel offers her lead, a dance, her ride home.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const MISS = /Not my story|not my story|Not mine to know|wrong woman|wrong girl|don't know about that|didn't understand|didn't parse/;
const src = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");

beforeEach(() => {
  newGame();
  G.player = { origin: "redundant", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 30; G.flowerDay = G.day; out = [];
});

test("SEVERE: last night, the rain, the present and the hours are chips, and every one of them answers", () => {
  G.room = _npcRoom("pukky"); G.phone.contacts.pukky = true;
  run("buy drink for pukky"); run("tip pukky 300"); _startRain(3); G.rain = 0;
  _endNight("sleep"); G.room = _npcRoom("pukky"); G.nightTurn = 20; out = [];
  const t = _convoTopics("pukky");
  for (const k of ["last night", "the rain", "your present", "after work", "closing time", "open after two"]) assert.ok(t.includes(k), k + " in " + t.join(","));
  assert.deepEqual(t.slice(0, 3), ["last night", "your present", "the rain"], "the night's own topics lead");
  for (const k of ["last night", "the rain", "your present", "after work", "closing time", "open after two"]) {
    G.talked = {}; out = []; run("ask pukky about " + k); assert.doesNotMatch(said(), MISS, k + ": " + said());
  }
});

test("SEVERE: the dawn has a chip outdoors at five, and none in an enclosed room", () => {
  G.room = "soi6_mid"; G.nightTurn = SUNRISE_TURN; assert.ok(_chipSet().some(c => c.cmd === "watch sunrise"));
  G.nightTurn = SUNRISE_TURN - 5; assert.ok(!_chipSet().some(c => c.cmd === "watch sunrise"), "not before the sky moves");
  G.nightTurn = SUNRISE_TURN; G.room = "pink_lotus"; if (ROOMS.pink_lotus.barType === "gogo") assert.ok(!_chipSet().some(c => c.cmd === "watch sunrise"));
});

test("a woman on your arm: her lead, a dance, her ride home on the wheel and the chips — no barfine", () => {
  G.room = _npcRoom("pukky"); G.party = { ids: ["pukky"], stops: 1, spent: 0, seen: { [G.room]: true }, rooms: { pukky: [G.room] } };
  const acts = _npcActions("pukky", true);
  assert.ok(acts.includes("leadme") && acts.includes("sendhome") && acts.includes("danceher")); assert.ok(!acts.includes("barfine"));
  const chips = _chipSet().map(c => c.cmd);
  assert.ok(chips.includes("follow pukky") && chips.includes("send pukky home")); assert.ok(!chips.includes("barfine "));
  out = []; run("talk to pukky"); assert.doesNotMatch(said(), /somebody else's floor|girl by the door/, "her own bar, the only girl on it");
});

test("a night out's greeting fits the night it was; two women, two greetings", () => {
  const [a, b] = ["pukky", "joy"].filter(i => NPCS[i]);
  G.wentWith = { [a]: { day: G.day - 1, kind: "out" }, [b]: { day: G.day - 1, kind: "out" } };
  G.partyLog = { [a]: { rooms: [NPCS[a].room] }, [b]: { rooms: [NPCS[b].room] } };
  G.room = NPCS[a].room; out = []; _wentWithHello(a); const l1 = said();
  assert.ok(_WENT_HELLO.outSmall.some(f => l1.includes(f(NPCS[a].name))), l1);
  if (b) { G.room = NPCS[b].room; out = []; _wentWithHello(b); assert.notEqual(said().replace(NPCS[b].name, "X"), l1.replace(NPCS[a].name, "X")); }
});

test("money she asked for and got is thanked for the thing, the day after, though her money story was told", () => {
  G.room = _npcRoom("pukky"); G.phone.contacts.pukky = true; run("ask pukky about money");
  G.phone.asks = { pukky: [{ kind: "medicine", amt: 300 }] }; run("send 300 to pukky");
  _endNight("sleep"); G.room = _npcRoom("pukky"); G.nightTurn = 20; out = []; run("ask pukky about money");
  assert.match(said(), /medicine/); assert.doesNotMatch(said(), /already|talk to the wall/);
});

test("one hostess with a mamasan and a cashier is still one girl: no 'the girls' in her room's pools", () => {
  G.room = _npcRoom("pukky");
  if (_npcsHere().filter(i => NPC_ROLES[i] === "hostess").length !== 1) return;
  const fit = _roomFit(["Two of the girls slip out for noodles.", "The cashier counts the float."]);
  assert.deepEqual(fit, ["The cashier counts the float."]);
});

test("an early take-out closes on an early night; the house remembers whose fine it took", () => {
  G.room = _npcRoom("pukky"); G.party = { ids: ["pukky"], stops: 1, spent: 0, seen: {}, rooms: { pukky: [G.room] } };
  G.room = _hotelRoomId(); G.nightTurn = 34; out = []; _endNight("sleep");
  assert.doesNotMatch(said(), /only opens at two|3 a\.m\.|at four|watched the two of you all evening/);
  const mama = Object.keys(NPCS).find(i => NPC_ROLES[i] === "mamasan" && NPCS[i].room === NPCS.pukky.room);
  if (mama) { G.wentWith = { pukky: { day: G.day - 1, kind: "st" } }; G.room = NPCS.pukky.room; G.nightTurn = 20; out = []; run("talk to " + NPCS[mama].name.toLowerCase());
    assert.match(said(), new RegExp(NPCS.pukky.name)); }
});

test("the small ones: a number named, sand not road, the last night spent, she's already in the room, no beer chip after midnight, PLAY is free, the map's fence", () => {
  assert.match(NPCS.kai.dialogue.find(d => d.topic === "game").text, /฿\d/);
  assert.match(src("engine-encounters.js"), /"sand" : "road"/);
  G.day = 7; G.room = _hotelRoomId(); G.nightTurn = 80; out = []; run("sleep"); assert.doesNotMatch(said(), /final night unspent/);
  G.day = 3; G.party = { ids: ["pukky"], stops: 1, spent: 0, seen: {}, rooms: {} }; G.endWarn = null; out = []; run("sleep");
  assert.doesNotMatch(said(), /comes up with you/); assert.match(said(), /already in the room/);
  G.party = null; G.endWarn = null; G.room = "soi6_street"; G.nightTurn = 65;
  assert.ok(!engineComplete("buy ").some(x => /^buy (beer|lady drink)/.test(x)), engineComplete("buy ").join(","));
  G.room = _npcRoom("pukky"); const t = G.nightTurn; run("play"); assert.equal(G.nightTurn, t);
  assert.doesNotMatch(_MAP_SOI6 ? _MAP_SOI6.join("\n") : "", /7.Eleven across the road/);
});
