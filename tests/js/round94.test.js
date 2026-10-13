// ROUND 94 (2026-10-14) — Ruth Abernethy (Opus), a Glasgow stage manager who made two or three things happen at once
// every night of the Soi 6 week and checked whether each part of the game noticed the others: "The money and the clock
// are a good crew… The people are a different department. Each of them hears only her own cue." The composition class:
// the woman on your arm forgotten by the street, by her own bar, by the games she played and the night she shared.
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

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});
const onArm = (id, room) => { G.party = { ids: [id], stops: 1, spent: 0, seen: room ? { [room]: true } : {} }; };

test("SEVERE: a street KISS to the woman on your arm is hers to answer, not a stranger's slap — and she remembers it", () => {
  G.room = "soi6_street"; G.soc.drinks.pukky = 14; onArm("pukky");
  out = []; run("kiss pukky"); assert.doesNotMatch(said(), /THWACK|faces appear in doorways/i, said());
  out = []; run("ask pukky about the kiss"); assert.doesNotMatch(said(), /don't know|not my story/i); assert.match(said(), /street|kiss/i);
});

test("the woman whose bar it is sees who you brought, cools, and does not flirt back that night", () => {
  G.room = "ruby_kiss"; G.soc.drinks.pukky = 14; onArm("kluay");
  out = []; _arriveAt("sunset_rail"); assert.match(said(), /Pukky/); assert.ok(G.miffed && G.miffed.pukky === G.day);
  assert.ok(G.soc.drinks.pukky < 14, "the bond cools");
  out = []; run("flirt pukky"); assert.doesNotMatch(said(), /decides you'll do/); assert.match(said(), /busy|friend/i);
});

test("a thing bought FOR her off the peddler is never announced as yours", () => {
  G.room = "sunset_rail"; onArm("pukky"); G.pendingEnc = "peddler"; out = [];
  run("buy sunglasses for pukky"); assert.match(said(), /RayBens/); assert.doesNotMatch(said(), /You now have the designer sunglasses|go on immediately/);
});

test("TAKE HER OUT means the woman in front of you, not a barfine asked earlier in another bar", () => {
  G.lastBfAsk = "pukky"; G.room = "ruby_kiss"; run("talk to kluay");
  out = []; run("take her out"); assert.doesNotMatch(said(), /Pukky isn't at this bar/);
});

test("a went-with hello three nights on says 'the other night'; two women on one arm is not a quiet night", () => {
  G.room = "ruby_kiss"; G.day = 6;
  G.wentWith = { kluay: { kind: "out", day: 3 } }; G.partyLog = { kluay: { day: 3, rooms: ["ruby_kiss"] } }; G.partyMates = { kluay: ["pukky"] };
  out = []; _wentWithHello("kluay"); assert.doesNotMatch(said(), /\b[Ll]ast night\b/); assert.doesNotMatch(said(), /Quiet|don't go far/);
});

test("the dawn coda gives no woman an address or a cousin, and does not repeat itself", () => {
  assert.ok(!_CODA_HOME.some(l => /Pattaya Tai|cousin/.test(l)) && !_CODA_CLOSE.some(l => /cousin/.test(l)));
  const seen = []; for (let k = 0; k < 3; k++) { out = []; G.lastBfId = "pukky"; _cinderellaCoda(); seen.push(out[2]); }
  assert.equal(new Set(seen).size, seen.length);
});

test("a room's own lines read who is in it: no pitch with her on your arm, nobody named who is gone", () => {
  assert.doesNotMatch(ROOMS.ruby_kiss.desc, /Kluay and Benz/);
  G.room = "ruby_kiss"; G.visited.ruby_kiss = true; onArm("kluay", "ruby_kiss");
  for (let k = 0; k < 6; k++) { const l = _roomLinesFit(ROOMS.ruby_kiss.revisit, "ruby_kiss"); assert.ok(!l.some(x => /Kluay|upstairs|drink, room, price/.test(x)), l.join("|")); }
  G.room = "soi6_deep"; G.visited.soi6_deep = true;
  const st = _roomLinesFit(ROOMS.soi6_deep.revisit, "soi6_deep"); assert.ok(!st.some(x => /intercept you|hands already reaching|upstairs/.test(x)));
});

test("a game, the band, a dance with her is hers to talk about, and the floor saw it", () => {
  G.room = "sunset_rail"; G.soc.drinks.pukky = 8; onArm("pukky");
  run("play connect 4"); run("quit");
  out = []; run("ask pukky about connect 4"); assert.doesNotMatch(said(), /wrong girl|not my story/i);
  const col = _npcsHere().find(i => NPC_ROLES[i] && i !== "pukky");
  out = []; run(`ask ${NPCS[col].name.toLowerCase()} about connect 4`); assert.match(said(), /Pukky/);
});

test("the open front the police stop happened outside is a witness to it", () => {
  G.room = "soi6_mid"; _streetSaw("police");
  G.room = "sunset_rail"; const s = _npcsHere().find(i => NPC_ROLES[i]);
  out = []; run(`ask ${NPCS[s].name.toLowerCase()} about the police`); assert.match(said(), /stop|police/i);
});

test("the temple is a pool, and it waits a day for his her-farang on his last night", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /temple-no/);
  G.day = 7; G.soc.drinks.pukky = 14; assert.equal(_templeWaits("pukky"), true);
});

test("ten minutes is not an hour on that stool; 18:06 in your room is not after the shutters", () => {
  G.room = "qv_room"; G.nightTurn = 1; out = []; run("wait 1"); assert.doesNotMatch(said(), /after the shutters/);
});

test("a witness gives the gist once, then is a colleague again", () => {
  G.room = "sunset_rail"; G.partyLog = { pukky: { day: G.day - 1, rooms: ["sunset_rail"] } };
  const s = _npcsHere().find(i => i !== "pukky" && (NPC_ROLES[i] || NPCS[i].house));
  const asks = []; for (let k = 0; k < 4; k++) { out = []; run(`ask ${NPCS[s].name.toLowerCase()} about pukky`); asks.push(said()); }
  assert.ok(asks.filter(a => /told you|tell you already/i.test(a)).length <= 1, asks.join("\n---\n"));
});

test("TOMORROW, to a woman told you leave tomorrow, is about that", () => {
  G.day = 7; G.room = "sunset_rail"; G.soc.drinks.pukky = 8; (G.soc.leavingSaid = {}).pukky = G.turns;
  out = []; run("ask pukky about tomorrow"); assert.match(said(), /fly|airport|safe flight/i);
});

test("the mamasan does not 'decide you exist' for a man who has sat in her bar for days", () => {
  G.room = "sunset_rail"; G.visitDay = { sunset_rail: 1 }; G.day = 5; G.soc.drinks.pukky = 8;
  for (let k = 0; k < 6; k++) { out = []; run("tip pukky 2000"); assert.doesNotMatch(said(), /decides you exist/); }
});

test("two of the same gift in one night are two", () => {
  G.room = "sunset_rail"; for (let k = 0; k < 2; k++) _giftNote("pukky", { kind: "item", item: "lingerie" });
  G.day++; out = []; run("ask pukky about the lingerie"); assert.match(said(), /Two|both/i);
});
