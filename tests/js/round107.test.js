// ROUND 107 (2026-10-25) — Priya (Opus, stream-edges: a live-streaming engineer working the Soi 6 cameras at the
// edges of the night and stacking every other state on them — "the room's audio isn't synced to its own video").
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
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000;
  G.nightTurn = 30; G.visited.jade_lounge = G.visited.pink_lotus = G.visited.peach_lounge = true;
};
const nextNight = () => { _endNight("sleep"); quiet(); G.nightTurn = 30; };
const withJoy = () => { _arriveAt("pink_lotus"); quiet(); G.soc.drinks.joy = 8; run("barfine joy"); run("take her out"); run("out"); quiet(); };
beforeEach(() => { newGame(); });

test("Priya: the stream pays its once-a-night สนุก on every night, not only the first of the trip", () => {
  sandbox(); _arriveAt("jade_lounge"); quiet();
  let h = G.happy; run("stream drink keng"); assert.equal(G.happy, h + 1);
  nextNight(); _arriveAt("jade_lounge"); quiet();
  h = G.happy; const s = t("stream drink keng"); assert.equal(G.happy, h + 1); assert.doesNotMatch(s, /paid you once tonight/);
});
test("Priya: the camera's chatter is not held back the next evening by last night's clock", () => {
  assert.ok(STATE_SCHEMA.socNight.includes("streamLast") && STATE_SCHEMA.socNight.includes("streamJoy"));
});
test("Priya: a phone bell to a bar she is not in asks, and NO and HOW MUCH are the phone's", () => {
  sandbox(); _arriveAt("jade_lounge"); quiet();
  assert.match(t("stream bell"), /YES to ring it/);
  const m = t("how much is that?"); assert.match(m, /baht from the account/); assert.doesNotMatch(m, /soi blinks/);
  const b0 = G.bank, n = t("no"); assert.match(n, /put the phone away/); assert.doesNotMatch(n, /Noted|shrugs/); assert.equal(G.bank, b0);
});
test("Priya: STREAM DRINK for the woman on your arm says she is on your arm", () => {
  sandbox(); withJoy(); assert.deepEqual(G.party.ids, ["joy"]);
  const b0 = G.bank, s = t("stream drink joy"); assert.match(s, /on your arm/); assert.equal(G.bank, b0);
});
test("Priya: the woman on your arm sees the phone, and the floor you sit on sees you buy for another bar", () => {
  sandbox(); withJoy();
  assert.match(t("stream drink keng"), /Joy/);
  sandbox(); _arriveAt("jade_lounge"); quiet();
  const s = t("stream bell peach lounge"); const girls = _npcsHere().filter(x => NPC_ROLES[x] === "hostess").map(x => NPCS[x].name);
  assert.ok(girls.some(g => s.includes(g)), s);
  assert.doesNotMatch(t("stream bell peach lounge"), new RegExp(_STREAM_ROOM_SAW.map(f => f("XX", "YY").slice(10, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")));
});
test("Priya: a bell she watched you ring is remembered as one she saw, and told once", () => {
  sandbox(); withJoy(); run("stream bell pink lotus");
  nextNight(); _arriveAt("pink_lotus"); quiet();
  const a = t("ask joy about bell"); assert.doesNotMatch(a, /not even here/); assert.match(a, /there|next to you|holding your arm/i);
  const b = t("ask joy about bell"); assert.ok(_STREAM_TOLD_FLOOR.some(f => b.includes(f("Joy", "bell").slice(0, 25))), b);
});
test("Priya: a phone drink she has already discovered is not discovered again, and 'my drink' is the drink", () => {
  sandbox(); _arriveAt("jade_lounge"); quiet(); run("stream drink keng"); run("stream bell peach lounge");
  nextNight(); _arriveAt("peach_lounge"); quiet();
  t("ask keng about stream");
  const s = t("ask keng about my drink"); assert.doesNotMatch(s, /Bell from the internet/);
  assert.ok(_STREAM_TOLD_FLOOR.some(f => s.includes(f("Keng", "drink").slice(0, 25))), s);
});
test("Priya: the handles the room toasts are on that room's own column, and yours joins it after you buy there", () => {
  sandbox(); _arriveAt("peach_lounge"); quiet(); G.nightTurn = 10;
  const col = _streamCol("peach_lounge");
  let toasts = [];
  for (let n = 10; n < 19; n++) { G.nightTurn = n; G.soc.streamLast = {}; out = []; _streamTick(); toasts.push(said()); }
  for (const line of toasts.filter(Boolean)) {
    const h = _STREAM_HANDLES.find(x => line.includes(x)); if (h) assert.ok(_streamCol("peach_lounge").includes(h) || col.includes(h), line);
  }
  _arriveAt("jade_lounge"); quiet(); run("stream drink keng");
  assert.ok(_streamCol("peach_lounge").includes(_myHandle()));
});
test("Priya: the link refuses an empty account and says what takes notes; a mamasan is the house, not a channel girl", () => {
  sandbox(); G.bank = 0; _arriveAt("jade_lounge"); quiet();
  assert.match(t("stream drink keng"), /BUY <HER> A DRINK/);
  G.bank = 50000; assert.match(t("stream drink nee"), /runs the floor/);
});
test("Priya: the phone screen lists the streams you know", () => {
  sandbox(); assert.match(t("phone"), /WATCH STREAM/);
});
test("Priya: a night spent across several bars is hours 'all told', not 'on the same stool'", () => {
  sandbox(); G.soc.barTurns = { jade_lounge: 40, peach_lounge: 12 };
  G.day = 3; out = []; _endNight("sleep"); assert.doesNotMatch(said(), /on the same stool at Jade/);
});
test("Priya: no mouth claims the phone bell was 'you and the German'", () => {
  assert.ok(!JSON.stringify(_TOWN.stream_bellme).includes("the German"));
});
test("Priya: ASK ABOUT VIKING reaches Mister Olaf", () => {
  assert.ok(_whaleIn("tell me about the viking"));
});
test("Priya: BUY FOOD says where something is cooking; BATTERY opens the phone", () => {
  sandbox(); G.room = "soi6_deep"; quiet();
  assert.doesNotMatch(t("buy food"), /Not for sale here/);
  assert.match(t("battery"), /Battery \d+%/);
});
