// ROUND 106 (2026-10-24) — aimed at the coverage map's dark cells: Mehmet (Opus, procurement then the massage and the
// Orchid the same evening, asked about the next night), Desmond (Opus, the absent resident: nights away, sleeps
// through, a payday — "this town logs the money to the baht"), Ines (Sonnet, the night ride and Cream, asked of the
// whole town — "nobody lies, nobody volunteers").
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
const t = c => { out = []; run(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 20000;
};
beforeEach(() => { newGame(); });

// ── Ines ──
test("Ines: a memory from the last trip is 'last trip', never '-6 nights ago'", () => {
  sandbox(); G.day = 7; G.soc.drinks.lek = 8; G.talked.lek = [0]; (G.metDay = G.metDay || {}).lek = 3; G.wentWith = { lek: { day: 7, kind: "lt" } };
  _newVacation(); G.room = _npcRoom("lek"); G.nightTurn = 20; quiet(); run("talk to lek");
  const s = t("ask lek about last time"); assert.doesNotMatch(s, /-\d+ nights/); assert.match(s, /last trip/i);
});
test("Ines: TAKE CREAM OUT is her night, not 'You don't see that here'; LATE is on her chips", () => {
  sandbox(); G.room = NPCS.cream.room; G.nightTurn = 50; quiet();
  assert.doesNotMatch(t("take cream out"), /don't see that here/);
  sandbox(); G.room = NPCS.cream.room; G.nightTurn = 50; quiet(); run("talk to cream"); assert.ok(_convoTopics("cream").includes("late"));
});
test("Ines: Near saw Cream leave with you; Lek's bike is askable; the piwin knows your hotel", () => {
  assert.match(readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8"), /sawcream/);
  sandbox(); G.room = _npcRoom("lek"); G.nightTurn = 30; quiet(); G.soc.drinks.lek = 8; run("talk to lek"); assert.match(t("ask lek about her bike"), /bike/i);
  sandbox(); G.room = "naklua_rd"; G.nightTurn = 30; quiet(); assert.match(t("ask piwin about the hotel"), /Sabai/);
});

// ── Desmond ──
test("Desmond: the payday's condo bill is the new month's alone; the closing month holds last night", () => {
  sandbox(); G.player.origin = "pension"; _goExpat(); G.bank = 90000; quiet();
  G.room = "pratumnak_soi5"; G.nightTurn = 2; run("rent a condo"); run("rent a condo"); assert.equal(G.hotel, "condo");
  G.room = "condo_room"; G.nightTurn = 100; _endNight("sleep"); G.payDay = G.day + 1 - INCOME_DAYS;
  G.room = "stinky_bar"; G.nightTurn = 20; quiet(); run("buy beer"); G.room = "condo_room"; G.nightTurn = 100; out = []; _endNight("sleep");
  assert.deepEqual([G.month.spent, G.month.rent], [CONDO_RENT + CONDO_UTIL, CONDO_RENT + CONDO_UTIL]);
  const line = said().split("\n").find(l => /The month, to last night's close/.test(l)) || "";
  const n = +((line.match(/฿([\d,]+) spent/) || [])[1] || "0").replace(/,/g, "");
  assert.ok(n < 2 * (CONDO_RENT + CONDO_UTIL), "the closing month does not also carry the coming month's rent: " + line.slice(0, 90));
});
test("Desmond: a woman's gap is measured even after she cools, and LAST TIME reads the last night you sat on her floor", () => {
  sandbox(); G.stage = "expat"; const c = "jade_lounge_cartoon"; G.room = "jade_lounge"; G.nightTurn = 30; quiet(); G.soc.drinks[c] = 4; G.talked[c] = [0]; (G.metDay = G.metDay || {})[c] = G.day;
  for (let i = 0; i < 5; i++) run("wait"); G.room = _hotelRoomId(); G.nightTurn = 100; _endNight("sleep");
  for (let n = 0; n < 6; n++) { G.room = _hotelRoomId(); G.nightTurn = 100; _endNight("sleep"); }
  G.room = "jade_lounge"; G.nightTurn = 30; quiet(); run("talk to cartoon");
  assert.match(t("ask cartoon about last time"), /week ago/i);
  assert.match(t("did you miss me?"), /6 night/);
});
test("Desmond: Bert's 'Back already' is the same night only; Terry, Doyle and Bert answer how long you were away", () => {
  const ba = NPCS.bert.dialogue.find(d => /"Back already\."/.test(d.text || ""));
  sandbox(); G.metDay = { bert: G.day - 6 }; assert.ok(!ba.when(_npcState("bert"), G), "not six nights on");
  sandbox(); G.stage = "expat"; G.day = 20; G.barSat = { queen_vic: 12, stinky_bar: 12 };
  G.room = "queen_vic"; G.nightTurn = 20; quiet(); run("talk to terry");
  assert.match(t("did you miss me?"), /week/); assert.match(t("what did i miss?"), /week|nothing/i);
  G.room = "stinky_bar"; quiet(); run("talk to bert"); assert.match(t("how long was i gone?"), /week/); assert.match(t("ask bert about last time"), /week/);
});
test("Desmond: a mamasan's LAST TIME is the count, not 'this week, second time' a week on; the first meeting stays the first", () => {
  sandbox(); G.stage = "expat"; G.day = 20; G.room = "jade_lounge"; G.nightTurn = 20; quiet(); const j = "jade_lounge_jinda";
  (G.metDay = G.metDay || {})[j] = 10; G.talked[j] = [0]; G.barSat = { jade_lounge: 12 }; run("talk to jinda");
  assert.match(t("ask jinda about last time"), /week/i); assert.equal(G.metDay[j], 10);
});

const owner = () => { G.stage = "expat"; G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true; G.flags.tanAsked = true;
  G.bar.room = "stinky_bar"; G.bar.owner = true; G.room = "stinky_bar"; G.money = 20000; G.bar.cash = 12000; G.bar.nights = 16; G.day = 20; G.nightTurn = 30; G.bar.shiftAsked = true; G.flags.tanFavourDone = true; G.pendingChoice = null; _synState().lastAskDay = G.day; quiet(); };
test("Mehmet: his own floor knows whether he stood the rail, when he left, or that Bert ran it", () => {
  sandbox(); owner(); G.bar.lastLines = { day: G.day - 1, worked: false, declaredOnly: false, railTurn: 0 }; run("talk to bert");
  assert.match(t("ask bert who ran the bar last night"), /I ran it|weren't in/);
  sandbox(); owner(); G.bar.lastLines = { day: G.day - 1, worked: true, declaredOnly: false, railTurn: 37 }; run("talk to bert");
  assert.match(t("ask bert did i stand the rail last night"), /till 21:42/);
});
test("Mehmet: the punter, the slate man two bars up and the till company are askable; the new screen is in the room", () => {
  sandbox(); owner(); G.bar.calls = [{ id: "turning", day: G.day - 1, yes: true }, { id: "tab", day: G.day - 2, yes: true }]; G.bar.stiffedDay = G.day - 1; run("talk to bert");
  assert.match(t("ask bert about the punter"), /turned out|put out/); assert.match(t("ask bert who drinks two bars up"), /two bars up/);
  assert.doesNotMatch(t("ask bert about the till company"), /Till's honest/);
  _synState().done.screen = G.day - 1; assert.match(t("examine screen"), /new screen/);
});
test("Mehmet and Benoît: Tan's 'the Orchid' is the good table; Tan answers the merit call at his bar", () => {
  sandbox(); G.room = _npcRoom("tan") || "soi6_west"; G.nightTurn = 30; quiet(); run("talk to tan");
  assert.match(t("ask tan about the orchid"), /good table|tables you do not ask/i);
  G.bar.calls = [{ id: "merit", day: G.day - 1, yes: true }]; assert.match(t("ask tan about the monks"), /monks|merit/i);
});
