// ROUND 105 (2026-10-23) — aimed at the dark edge cells, the laundering month-after, and 30 never-spoken-to women.
// Ruth (Opus, the edges of the hours: "the town keeps its hours better than most hospitals I've rota'd… the cracks are
// at the hand-overs"), Ingrid (Sonnet, the laundering jobs a month after: "it agrees with itself on the money, and on the
// day, and not on the memory"), Callum (Opus after Fable's limit, the never-met: "in Dundee we'd call that a script").
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
const src = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8");
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 20000;
};
const DUAN = "the_gecko_duan";

beforeEach(() => { newGame(); });

// ── Callum: the never-met ──────────────────────────────────────────────────────
test("Callum: TELL <her> my name is X is kept, not asked back as a subject", () => {
  sandbox(); G.room = NPCS[DUAN].room; G.nightTurn = 30; quiet(); run("talk to duan");
  assert.match(t("tell duan my name is callum"), /Callum/); assert.equal(G.toldTo[DUAN].name.v, "callum");
});

test("Callum: a thing she named in her own story can be followed up — the baby, the loan — never 'I told you already'", () => {
  sandbox(); G.room = NPCS[DUAN].room; G.nightTurn = 30; quiet(); run("talk to duan"); run("ask duan about family");
  const a = t("where is your baby now?"); assert.doesNotMatch(a, /already|Farang memory|wrong girl|Not my story/); assert.match(a, /[Bb]aby/);
  const b = t("ask duan about the loan"); assert.doesNotMatch(b, /Nira/); assert.match(b, /loan/i);
  assert.equal(_ownWordTalk("candy", "the cleaning"), false, "an authored woman's own nodes answer her words");
});

test("Callum: nobody remembers him for things he never did; the return greetings are deeper than a week", () => {
  const all = [...Object.values(_TOWN.me_seen).flat()].join(" ");
  assert.doesNotMatch(all, /drink Chang|thank you to the mamasan|look at the football|near the fan|stay late|Same order/);
  assert.match(src("engine-parser"), /I remember your face\./);
});

test("Callum: 'I see you every week' is not said to a man she met tonight; 'why Pattaya' and 'why this bar' are two questions", () => {
  sandbox(); G.stage = "expat"; G.hotel = "condo"; G.room = NPCS[DUAN].room; G.nightTurn = 30; quiet(); run("talk to duan");
  assert.doesNotMatch(t("i live here now"), /every week|Yours are not new/);
  G.room = NPCS.nam.room; run("talk to nam"); assert.doesNotMatch(t("why did you come to pattaya?"), /Why this bar/);
});

test("Callum: the small prose — Mamasan Mem is not 'Mama Mamasan', a told place keeps its comma, a go-go has no fan, the drizzle reads open doors", () => {
  assert.equal(_mamaLabel("Mamasan Mem"), "Mamasan Mem");
  assert.match(src("engine-parser"), /X: v\.replace\(\/\\\.\\s\+\/g, ", "\)/);
  assert.ok(_FIT_GOGO.test("close to the fan"));
  assert.match(src("engine-systems"), /const _openHere = \(_room\(\)\.venues/);
  assert.ok(_mamaRev_len() >= 10);
});
function _mamaRev_len() { return (src("engine-parser").match(/deeper than three across a dozen bars[\s\S]*?\];/)[0].match(/`/g).length / 2) + 3; }

// ── Ingrid: the laundering jobs, a month after ─────────────────────────────────
test("Ingrid: the people in a job remember it — Nont by the sheet, Hong's first hello by the count", () => {
  sandbox(); G.quests.verification = "done"; G.questDoneDay = { verification: 1, covers: 1 }; G.day = 40;
  G.room = NPCS.nont.room; G.nightTurn = 30; quiet(); run("talk to nont"); assert.match(t("do you remember me?"), /The sheet/);
  G.quests.covers = "done"; G.room = "jasmine_garden"; quiet(); assert.match(t("talk to hong"), /one who count/);
});

test("Ingrid: a month on, Colin is not still waiting, Nont has heard the bar shut, Orathai's company is closed, Hong's envelope is given", () => {
  sandbox(); _setFlag("presaleSlips"); _setFlag("presaleReported"); _setFlag("presaleDone"); G.quests.presale = "done";
  G.room = NPCS.colin.room; G.nightTurn = 30; quiet(); run("talk to colin"); assert.doesNotMatch(t("ask colin about presale"), /Nothing yet/);
  _setFlag("verifSold"); G.questDoneDay = { verification: 1, fiftyone: 1 }; G.day = 40;
  G.room = NPCS.nont.room; quiet(); run("talk to nont"); assert.match(t("ask nont about nigel"), /Shut/);
  _setFlag("fiftyoneSigned"); _setFlag("fiftyoneTipped"); G.room = NPCS.orathai.room; quiet(); run("talk to orathai");
  assert.match(t("ask orathai about the company"), /closed last week/);
  _setFlag("coversTold"); G.room = "jasmine_garden"; quiet(); run("talk to hong"); assert.match(t("ask hong about the envelope"), /leave it, I give it/);
});

test("Ingrid: one brass plate — Nigel's; Reginald keeps a framed certificate; Nigel's bar shut last week", () => {
  const w = src("world");
  assert.doesNotMatch(w, /stool there and a brass plate|stool and a brass plate/);
  assert.match(w, /Last week\. Felt like three months/);
});

// ── Ruth: the edges of the hours ───────────────────────────────────────────────
test("Ruth: a place with its own closing time shows you out — the mall at nine", () => {
  sandbox(); G.room = "mikes_mall"; G.nightTurn = ROOMS.mikes_mall.closesAt - 1; quiet();
  run("wait"); assert.notEqual(G.room, "mikes_mall"); assert.match(said(), /shown to the doors|holds the door|exit/);
});

test("Ruth: closing questions asked of nobody, WAIT UNTIL never overshoots the minute, a dead phone reads no balance", () => {
  sandbox(); G.room = "second_rd_diana"; G.nightTurn = 20;
  assert.match(t("what time does mike's mall close"), /21:00/); assert.match(t("when does the 7-eleven stop selling beer"), /midnight/);
  G.room = "queen_vic"; G.nightTurn = 40; run("wait until 22:55"); assert.equal(_clockStr(), "22:54");
  G.room = "stinky_bar"; G.battery = 0; assert.match(t("check balance"), /black mirror/);
});

test("Ruth: the woman who owns the bar raises her own finger; the empty rail has no buyer to go still; the checkpoint just packed up at seven", () => {
  sandbox(); G.room = "metro_garden"; G.nightTurn = 50; G.soc.heat.metro_garden = 1; quiet();
  assert.doesNotMatch(t("barfine near"), /The mamasan/);
  assert.match(src("engine-parser"), /_bellHeads\(G\.room\)\.men > 0/);
  assert.match(src("engine-systems"), /The checkpoint has only just packed up/);
});

test("Ruth: the roast sold out is 'gone', not 'nine o'clock'; the woman beside you is in the sunrise; the bolt is remembered", () => {
  assert.match(src("engine-systems"), /gone before nine is gone/);
  sandbox(); G.room = "beach_rd_c"; G.nightTurn = SUNRISE_TURN + 2; G.party = { ids: ["nan"], stops: 0, spent: 0, seen: {} };
  out = []; run("watch sunrise"); run("watch sunrise"); assert.match(said(), /Nan/);
  sandbox(); G.room = "night_heron"; G.nightTurn = 30; G.lockedInAt = { night_heron: G.day - 1 }; quiet();
  const s = _npcsHere().find(x => NPC_ROLES[x]); run("talk to " + NPCS[s].name); assert.match(t("ask " + NPCS[s].name + " about last night"), /bolt/i);
});
