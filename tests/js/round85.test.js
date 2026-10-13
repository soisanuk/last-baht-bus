// ROUND 85 (2026-10-13) — Martin Krebs (Opus), a Düsseldorf tester stacking states on the Soi 6 week:
// a girl on his arm through second bars, the Vic's eleven o'clock, the two o'clock shutters, games,
// encounters and reloads. "The till is the most reliable thing on Soi 6… The people are the opposite."
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
const party = (ids, room) => { G.party = { ids: ids.slice(), stops: 1, spent: 0, seen: { [room]: true }, rooms: Object.fromEntries(ids.map(i => [i, [room]])) }; };

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});

test("SEVERE: a companion on the last night says goodbye before the week ends", () => {
  G.day = 7; G.room = "soi6_street"; G.nightTurn = SUNRISE_TURN; party(["sweet_tamarind_alisa"], "sweet_tamarind");
  run("watch sunrise"); run("watch sunrise");
  assert.equal(G.pendingChoice, "vacation_end"); assert.equal(G.party, null, "she is not still on your arm on day 8");
});

test("her own floor knows her; a colleague who went home is still a colleague", () => {
  G.room = "pink_lotus"; const g = _npcsHere().filter(i => NPC_ROLES[i] === "hostess"); party([g[0]], "pink_lotus");
  out = []; run(`ask ${NPCS[g[1]].name.toLowerCase()} about ${NPCS[g[0]].name.toLowerCase()}`);
  assert.doesNotMatch(said(), /not staff here|by the look of her/);
  _partyGoodbye(); out = []; run(`ask ${NPCS[g[1]].name.toLowerCase()} about ${NPCS[g[0]].name.toLowerCase()}`);
  assert.doesNotMatch(said(), /Not mine to know|Not my story|wrong girl|Not a thing I know/);
});

test("she remembers the night: the greeting, the topic, and the other woman of a shared night", () => {
  G.room = "sweet_tamarind"; G.soc.drinkCount = { sweet_tamarind_alisa: 1 }; G.soc.drinks = { sweet_tamarind_alisa: 3 };
  run("barfine alisa"); run("take her out");
  assert.equal(G.wentWith.sweet_tamarind_alisa.kind, "out");
  _endNight("sleep"); G.nightTurn = 20; G.room = "sweet_tamarind"; out = []; run("talk to alisa");
  assert.doesNotMatch(said(), /you watch, you don't talk|First time this bar/); assert.ok([..._WENT_HELLO.outBig, ..._WENT_HELLO.outSmall].some(f => said().includes(f("Alisa").slice(0, 30))));
  G.partyMates = { sweet_tamarind_alisa: ["joy"] }; out = []; run("ask alisa about joy");
  if (NPCS.joy) assert.match(said(), /We go out together|friends, because of you/);
  G.wentWith.kluay = { day: G.day, kind: "st" }; G.room = "ruby_kiss"; out = []; run("talk to kluay");
  assert.ok(_WENT_HELLO.st.some(f => said().includes(f(NPCS.kluay.name))), said());   // the pool deepened (round 90)
});

test("with a woman on your arm: no pitch lines, no ST/LT on the menu or chips, no BARFINE last call, no colleague offered", () => {
  G.room = "ruby_kiss"; const g = _npcsHere().filter(i => NPC_ROLES[i] === "hostess" && i !== "chompoo"); party([g[0]], "ruby_kiss");
  assert.ok(_roomFit(["Buy me drink. Take me up.", "A quiet line."]).every(l => !/Take me up/.test(l)));
  G.pendingBf = { id: g[1], st: 700, lt: 1400, party: 1400, room: "ruby_kiss" };
  const cmds = _chipSet().map(c => c.cmd); assert.ok(!cmds.includes("short time") && !cmds.includes("long time"), cmds.join(","));
  out = []; _bfPrompt(); assert.doesNotMatch(said(), /SHORT TIME/); G.pendingBf = null;
  G.soc.lastCall = {}; G.nightTurn = SOI6_CLOSE - 4; out = []; _lastCall("ruby_kiss"); assert.doesNotMatch(said(), /BARFINE/);
  out = []; run("barfine " + NPCS[g[1]].name.toLowerCase()); assert.doesNotMatch(said(), /adds her to the night/, "her colleague will not steal a customer");
});

test("a kiss for another woman is seen; water for her at the 7-Eleven is drunk, not eaten", () => {
  G.room = "ruby_kiss"; const g = _npcsHere().filter(i => NPC_ROLES[i] === "hostess" && i !== "chompoo"); party([g[0]], "ruby_kiss");
  out = []; run("kiss " + NPCS[g[1]].name.toLowerCase()); assert.ok(_PARTY_JEALOUS.some(f => said().includes(f(NPCS[g[0]].name, NPCS[g[1]].name).slice(0, 25))));
  G.room = "soi6_street"; G.nightTurn = 90; out = []; run("buy water for " + NPCS[g[0]].name.toLowerCase());
  assert.doesNotMatch(said(), /where drinks are sold|eats a cold bottle/);
});

test("two companions: plural verbs at the night's end and on the stairs; the goodbye prompt names both", () => {
  G.room = "soi6_street"; party(["sweet_tamarind_alisa", "sweet_tamarind_ple"], "sweet_tamarind");
  out = []; run("send her home"); assert.match(said(), /SEND ALISA HOME · SEND PLE HOME/);
  out = []; _partyNightEnd("sleep"); assert.doesNotMatch(said(), /and \w+ (kicks|melts|watches|stays)/);
});

test("the small ones: her bar for Tan, the busy room, the usual, the coda twice, the DJ in a hotel room", () => {
  assert.doesNotMatch(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8"), /cheers you out the door/);
  assert.ok(ROOMS[Object.keys(ROOMS).find(k => ROOMS[k].lateWithSoi6)], "the foot of Soi 6 paints late with the soi");
  assert.equal(_lateTurn(Object.keys(ROOMS).find(k => ROOMS[k].lateWithSoi6)), SOI6_CLOSE);
  G.room = "sunset_rail"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess"); run("talk to " + NPCS[g].name.toLowerCase());
  out = []; run("what do you think pukky"); assert.doesNotMatch(said(), /didn't parse|didn't understand|blinks at you|No idea what/);
});
