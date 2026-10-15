// THE BASELINE PLAYER'S OWN WORDS (2026-10-14). Steve Marsh — a retired lorry driver on a phone, the Soi 6 week played
// the ordinary way — was stopped 18, 24, 22 and 22 times in four runs. A fresh run types different sentences, so the
// count moves ±4 on its own and cannot show progress; this file is the fixed half. Every sentence that stopped him in
// runs 3 and 4, replayed where he said it, must now get the right kind of answer. A new baseline run's stops are
// ADDED here, so the number can only go down.
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
const HUH = /didn't understand|didn't parse|soi blinks|No idea what you're after/;

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 25; G.day = 3; G.flowerDay = G.day; out = [];
});
const talkTo = id => { G.room = _npcRoom(id); run("talk to " + NPCS[id].name.toLowerCase()); G.convoQ = null; out = []; };
const onArm = id => { G.party = { ids: [id], stops: 1, spent: 0, seen: {} }; };
// [who, setup, the line he typed, must NOT match, must match (optional)]
const CASES = [
  // run 3
  ["kwan", null, "where can I get food round here", /ask around/, /7-Eleven|Queen Vic|kitchen/],
  ["kwan", null, "where's good to eat round here?", /ask around/, /7-Eleven|Queen Vic|kitchen/],
  ["kwan", () => onArm("kwan"), "where shall we go?", /ask around/],
  ["kwan", () => onArm("kwan"), "you having a good time?", /wrong girl|Not my story/],
  ["kwan", null, "what you making", /Next time|long story|wrong girl/, /fold|crane|grandmother/i],
  ["kwan", null, "back in a minute love", /side of the building|Bins/],
  ["kwan", null, "night kwan", /don't know/],
  ["ladybird_bar_pao", null, "you like it here?", HUH],
  ["kwan", null, "fancy coming out with me tonight?", HUH],
  ["sweet_tamarind_jiab", null, "why did you leave pink lotus", /The stool is the rest/],
  ["terry", null, "how long you been coming here", /pay grade/],
  ["terry", null, "where you from", /department/],
  ["terry", null, "I'm off home tomorrow", /take your leave/],
  // run 4
  ["kwan", () => { G.soc.drinks.kwan = 2; (G.soc.drinkCount = G.soc.drinkCount || {}).kwan = 2; }, "you want to come back to my hotel?", /Queen Vic Inn\. 700/, /SHORT TIME|LONG TIME|short time|long time/],
  ["barry", null, "look at the photos", /isn't here|Nothing special/],
  ["somo", null, "what time is it", /long story|Secret|tell/, /\d\d:\d\d/],
  ["somo", null, "you eaten?", /Secret/, /Kin laew/],
  ["somo", () => { G.soc.drinks.somo = 6; G.day = 5; }, "missed me?", /wrong girl|Not my story/],
  ["somo", null, "how's your boy?", /You first/],
  ["somo", null, "tell me about your boy", /Telling isn't the verb/],
  ["somo", () => { (G.miffed = G.miffed || {}).somo = G.day - 1; }, "sorry about last night", /mamasan banks/],
  ["somo", () => { G.day = 5; }, "I'm going home Sunday", /Tomorrow you fly/],
  ["nina", () => onArm("nina"), "having fun?", /Not my story|wrong girl/],
  ["terry", () => { G.day = 7; }, "last night mate, fly home tomorrow", /somebody saw you|Not on this rail/],
  // run 5 — the men dodged "where you from?" with deflections; the plans pool misfired; nothing is said back that wasn't a name
  ["terry", () => { G.room = "queen_vic"; G.nightTurn = 20; }, "where you from?", /when we know each other|more than one beer|You first/],
  ["barry", null, "where you from?", /when we know each other|more than one beer|You first/, /England/],
  ["angela", () => { G.nightTurn = 20; }, "where you from then?", /You first/],
  ["kwan", null, "what you doing tomorrow?", /no hurry tonight|Still have time/],
  ["kwan", null, "I'll be back next year", /Still have time|no hurry/],
  ["kwan", null, "any good bars I should try?", /ask around/],
];
for (const [who, setup, line, bad, good] of CASES) {
  test(`Steve to ${who}: "${line}"`, () => {
    talkTo(who); if (setup) setup(); out = []; run(line);
    assert.doesNotMatch(said(), bad, said()); assert.doesNotMatch(said(), HUH, said());
    if (good) assert.match(said(), good, said());
  });
}

test("Steve to Somo: a game asked for as a man asks it starts the game", () => {
  talkTo("somo"); run("fancy a game of connect four?"); assert.ok(G.game && G.game.type === "c4", said());
});

test("Steve to Somo: 'Doncaster Rovers', after asking her where she's from, is still the answer to 'who you support?'", () => {
  G.room = "bay_watch"; run("talk to somo"); assert.equal(G.convoQ && G.convoQ.key, "team");
  run("where are you from?"); out = []; run("doncaster rovers");
  assert.doesNotMatch(said(), /wrong girl|Not my story/, said()); assert.ok(G.player.said && G.player.said.team, said());
});

test("Steve: WAIT 30 is half an hour, not three", () => {
  G.room = "soi6_street"; const t = G.nightTurn; run("wait 30"); assert.ok(G.nightTurn - t <= 6, G.nightTurn - t);
  const t2 = G.nightTurn; run("wait 12 turns"); assert.ok(G.nightTurn - t2 >= 12);
});

test("Steve: a regular is not given her first-meeting line on a later night", () => {
  talkTo("somo"); G.soc.drinks.somo = 8; G.metDay = { somo: 2 }; G.day = 4; G.soc.helloed = {}; G.soc.retHello = {};
  out = []; run("talk to somo"); assert.doesNotMatch(said(), /sweetheart thing/, said());
});

test("Steve: FOLLOW her does not walk you into the bar of another woman who is yours", () => {
  G.soc.drinks.somo = 10; G.room = "soi6_mid"; onArm("nina");
  for (let d = 1; d < 8; d++) { G.day = d; G.party.seen = {}; G.room = "soi6_mid"; out = []; _partyFollow("nina"); assert.notEqual(G.room, "bay_watch", said()); }
});

test("Steve: the rose seller is never two nights running", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.match(src, /G\.day - G\.flowerDay < 2/);
});

test("Steve (run 5): a sentence nothing reads gets 'I don't understand' in her own English — never a deflection that pretends", () => {
  talkTo("kwan"); out = []; run("what's the story with the frog?");
  assert.ok(_NOT_UNDERSTOOD.floor.some(l => said().includes(l.replace("{n}", "Kwan").slice(0, 25))), said());
  for (const pool of Object.values(_NOT_UNDERSTOOD)) assert.ok(pool.length >= 10);
  assert.ok(!_NOT_UNDERSTOOD.house.concat(_NOT_UNDERSTOOD.floor).some(l => /\blove\b|didn't catch/.test(l)), "no British idiom in a Thai mouth (Mario)");
});

// ── run 5: what he did for her, the last night's close, repeats, and the smaller ones ─────────────────────────────
const J = "sweet_tamarind_jiab";
test("Steve (run 5): she remembers the medicine he paid for, and the temple she turned him down for", () => {
  talkTo(J); G.day = 4; G.phone.asks = { [J]: [{ kind: "medicine", amt: 300, paid: true, paidDay: 4 }] };
  out = []; run("how is your mum?"); assert.doesNotMatch(said(), /talk to the wall|You forget so fast|already/, said());
  out = []; run("is your family ok now? the medicine?"); assert.doesNotMatch(said(), /talk to the wall|tell you this one already/, said());
  G.bfNo = { [J]: { kind: "temple", day: 3 } }; out = []; run("how was the temple?");
  assert.doesNotMatch(said(), /Buddhist, of course/); assert.match(said(), /monk|temple|string|merit/i);
});

test("Steve (run 5): 'how is your son?' on a later night is news, not a brush-off", () => {
  G.day = 1; talkTo(J); run("do you have kids?"); G.day = 2; G.soc.helloed = {}; talkTo(J);
  out = []; run("how is your son?"); assert.doesNotMatch(said(), /already|talk to the wall|forget so fast|Same answer/, said());
});

test("Steve (run 5): the last night has no noon, and a ride home before midnight is not dawn", () => {
  G.day = 7; G.lastBfId = "pukky";
  for (let k = 0; k < 6; k++) { out = []; _cinderellaCoda(); assert.doesNotMatch(said(), /wake at noon/); }
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /G\.nightTurn >= SUNRISE_TURN - 15 \? `You roll in as the sky pales/);
});

test("Steve (run 5): a pooled line is not said again until half its pool has been", () => {
  const pool = ["a", "b", "c", "d", "e", "f"]; const seen = [];
  for (let k = 0; k < 3; k++) seen.push(_pickVary(pool, "steve5test"));
  assert.equal(new Set(seen).size, 3, seen.join(","));
});

test("Steve (run 5): take her back to my room, maybe later, one more drink first, goodbye, darts with her", () => {
  talkTo(J); G.soc.drinks[J] = 4; (G.soc.drinkCount = G.soc.drinkCount || {})[J] = 2;
  run("barfine jiab"); assert.ok(G.pendingBf); out = []; run("maybe later love"); assert.equal(G.pendingBf, null, said());
  const m = G.money; out = []; run("one more drink first"); assert.ok(G.money < m, said());
  G.party = { ids: [J], stops: 1, spent: 0, seen: {} }; out = []; run("take jiab back to my room"); assert.equal(G.room, _hotelRoomId(), said());
  G.party = null; G.room = "queen_vic"; G.nightTurn = 20; G.party = { ids: [J], stops: 1, spent: 0, seen: {} };
  out = []; run("play darts with jiab"); assert.match(said(), /Jiab throws/, said());
  assert.ok(!_chipSet().some(c => /finish/.test(c.cmd)), "no FINISH on 501"); G.game = null;
  G.day = 7; G.party = null; G.room = _npcRoom(J); G.soc.drinks[J] = 8; talkTo(J);
  out = []; run("goodbye"); assert.doesNotMatch(said(), /You take your leave/, said()); assert.ok(G.lastNightBye, "the goodbye scene");
});
