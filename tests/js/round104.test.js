// ROUND 104 (2026-10-23) — aimed at the newest systems: the bench (the plane refused, built the day before and never walked),
// the phone barstool (the stream bell, two days old) and an owner's small hours. Alun (Opus, the bench: "the bench itself was
// honest… but the hotel kept tucking me into Room 412 and charging me for the privilege"), Wes (Sonnet, the phone barstool:
// "the best-kept book I've seen… they remember the bell and the handle but not the glass"), Benoît (Opus after Fable's limit,
// an October owner who never goes to bed before the sun: "the woman I courted caught me in bed with nobody").
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
// the bench: a pensioner broke at the Sabai, the third morning brings the consulate, STAY
const bench = () => {
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); quiet();
  G.stage = "expat"; _setFlag("expatLife"); G.paper = "tourist"; G.payDay = 5; G.day = 20; G.hotel = "sabai"; G.room = "hotel_room"; G.nightTurn = 30;
  G.hotelDebt = _DEBT_CAP; G.money = 0; G.bank = 0; G.keptByUsed = true; G.destitute = 2; G.destituteDay = G.day;
  run("sleep"); run("sleep"); assert.equal(G.pendingChoice, "embassy"); run("stay"); assert.ok(G.street); quiet(); out = [];
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };

beforeEach(() => { newGame(); });

// ── Alun: the bench ───────────────────────────────────────────────────────────
test("Alun: a night on a bench is not billed — no folio, no lullaby, no 'mid-afternoon'; he wakes where he lay down", () => {
  bench(); G.money = 435; G.room = "buakhao_klang"; G.nightTurn = 70;
  const s = sleep();
  assert.equal(G.money, 435, "the desk does not bill a man it did not house"); assert.ok(G.street, "still on the bench");
  assert.doesNotMatch(s, /air-con rattles|folio slides|surface mid-afternoon/); assert.match(s, /first light on a bench/);
  assert.equal(G.room, "buakhao_klang", "he wakes where he lay down");
});

test("Alun: the room is the desk's — the key stays on its hook until CHECK IN pays the folio and a night, and that night is not billed again", () => {
  bench(); G.room = _streetOf ? "naklua_rd" : "naklua_rd";
  assert.match(t("go to my room") + t("travel hotel"), /key stays on its hook|The book first/);
  assert.notEqual(G.room, "hotel_room");
  G.money = 300; assert.match(t("check in"), /฿2,2|before the key/); assert.ok(G.street, "not enough");
  G.money = 3000; const s = t("check in"); assert.match(s, /room again/i); assert.equal(G.street, null); assert.equal(G.hotelDebt, 0);
  const m = G.money; G.room = "hotel_room"; sleep(); assert.equal(G.money, m, "the night paid at the desk is not billed under the door");
});

test("Alun: the payday is a roof — the desk runs the card the morning real money lands", () => {
  bench(); G.room = "beach_rd_c"; G.bank = 9000; const s = sleep();
  assert.equal(G.street, null); assert.match(s, /runs your card|room again/i);
});

test("Alun: the town knows a man who sleeps out — the floor, the house, the rail and Tan say so; Nira lends nothing, by either word", () => {
  bench(); G.room = "stinky_bar"; G.hotelDebt = 0; G.nightTurn = 30; quiet();
  run("talk to manow"); const a = t("ask manow about the bench"); assert.ok(_TOWN.street_me.floor.some(l => a.includes(_fmt(l, { n: "Manow" }).slice(0, 30))), a);
  G.room = _npcRoom("tan"); run("talk to tan"); assert.match(t("ask tan about sleeping out"), /piwins|consulate|Pride/);
  G.room = _npcRoom("nira"); run("talk to nira"); assert.match(t("ask nira about a loan"), /door/); assert.match(t("borrow 2000"), /door|roof|room/);
});

test("Alun: on the bench nobody pitches him, no woman asks him for medicine, HINT counts the bench, and the consulate hears the payday", () => {
  bench();
  for (const id of ["freelancer", "tonic", "fortune", "peddler", "booking", "flower"]) delete G.encDone[id];
  const src0 = src("engine-encounters"); assert.match(src0, /G\.street && \["freelancer", "tonic", "fortune", "peddler", "booking", "flower"\]/);
  G.phone.contacts.pukky = true; assert.equal(_moneyAsk("pukky"), null);
  assert.match(t("hint"), /nights? on the bench/);
  G.pendingChoice = "embassy"; assert.match(t("my pension comes in ten days"), /not need me|glad/); assert.equal(G.pendingChoice, "embassy");
  G.pendingChoice = null; assert.match(t("where can i sleep?"), /benches/); assert.match(t("where is the police station?"), /Soi 9/);
});

test("Alun: the end of the pot after eleven, once a night; the kerb's empties after midnight, sold at Nok's cart", () => {
  bench(); const stall = Object.keys(FOOD_STALLS)[0]; G.room = stall; G.hunger = 80; G.nightTurn = 30;
  assert.match(t("eat"), /after eleven/); G.nightTurn = 70; t("eat"); assert.ok(G.hunger <= 45); assert.match(t("eat"), /had the end/);
  G.room = "beach_rd_c"; G.nightTurn = 70; let got = 0;
  for (let d = 0; d < 6 && !got; d++) { G.day += 1; G.soc.glassRooms = {}; t("collect bottles"); got = G.glass || 0; }
  assert.ok(got > 0, "a night's empties");
  G.room = _npcRoom("nok"); const m = G.money; t("sell bottles"); assert.equal(G.money, m + got * 5); assert.equal(G.glass, 0);
});

test("Alun: Bert squaring the book houses a man on the bench, out loud", () => {
  bench(); G.room = "naklua_rd"; out = []; _arriveAt("stinky_bar");
  assert.equal(G.street, null); assert.match(said(), /tonight's on me|room again/i);
});

// ── Wes: the phone barstool ────────────────────────────────────────────────────
test("Wes: a STREAM BELL with no bar named says which bar and the price, and rings only on YES", () => {
  sandbox(); G.nightTurn = 30; G.visited.lucky_tiger = true; G.room = "soi6_mid"; const b0 = G.bank;
  assert.match(t("stream bell"), /would ring Lucky Tiger Bar's bell/); assert.equal(G.bank, b0, "nothing charged on the question");
  t("yes"); assert.ok(G.bank < b0);
  const b1 = G.bank; t("ring the bell on the stream"); assert.equal(G.bank, b1, "the natural phrasing asks too"); t("look"); assert.equal(G.bank, b1, "the arm lapses");
});

test("Wes: WHO'S ONLINE / IS SILVERFOX ON / STREAMS read the channels; a stream drink to nobody says nobody; MY DRINK is the stream's subject", () => {
  sandbox(); G.nightTurn = 30; G.visited.jade_lounge = true; G.visited.lucky_tiger = true; G.room = "soi6_mid";
  assert.match(t("who's online?"), /The channels you know/); assert.match(t("is silverfox on?"), /Jade Lounge/); assert.match(t("streams"), /The channels you know/);
  assert.match(t("stream drink silverfox_leeds"), /Nobody called/);
  const g = Object.keys(NPCS).find(x => NPCS[x].room === "lucky_tiger" && NPC_ROLES[x] === "hostess" && _npcWhere(x) === "lucky_tiger");
  t("stream drink " + NPCS[g].name); G.room = "lucky_tiger"; t("talk to " + NPCS[g].name);
  const a = t("ask " + NPCS[g].name + " about my drink"); assert.doesNotMatch(a, /don't know|wrong girl/); assert.match(a, /YOU|name|camera/i);
});

test("Wes: WALK ON walks on — it is not TRAVEL to a bar with 'on' in its name", () => {
  sandbox(); G.room = Object.keys(ROOMS).find(k => ROOMS[k].region === "Tree Town"); G.visited.honey_trap = true; const r = G.room;
  t("walk on"); assert.equal(G.room, r);
});

test("Wes: the stream's memory pools are deeper than a week of women", () => {
  assert.ok(_TOWN.stream_me.floor.length >= 9); assert.ok(_TOWN.stream_bellme.floor.length >= 7);
});

// ── Benoît: an owner's small hours ─────────────────────────────────────────────
test("Benoît: the affair's bed catch needs somebody in the bed — never the party already cleared, never a sunrise, never her", () => {
  const s = src("engine-play");
  assert.match(s, /if \(!crash && _bedIds && _bedIds\.length && (?:typeof _affairLive === "function" && )?_affairLive\(\) && !_bedIds\.includes\(G\.affair\.id\)/);
  assert.doesNotMatch(s, /\(_hadParty \|\| _bedIds\) && (?:typeof )?_affairLive/);
});

test("Benoît: a shift stood to midnight is not lapsed by taking her out after it", () => {
  assert.match(src("engine-systems"), /const _stoodOut = worked && G\.nightTurn >= 60 && \(b\.stoodTurns \|\| 0\) >= WORK_MIN_STOOD;/);
});

test("Benoît: FOLLOW the affair girl on your arm leads the way — no throw, no silence", () => {
  sandbox(); G.room = "lk_entrance"; G.nightTurn = 62; G.party = { ids: ["manow"], stops: 0, spent: 0, seen: { stinky_bar: true }, affair: true };
  G.affair = { id: "manow", since: G.day - 20, strain: 2 };
  assert.doesNotThrow(() => run("follow manow")); assert.match(t("follow her"), /Manow/);
});

test("Benoît: a barfine a turn before the shutters is refused before the menu; rain begun mid-ride is told after the ride starts", () => {
  sandbox(); G.room = "stinky_bar"; const ct = _closeTurn("stinky_bar") ?? NIGHT_TURNS;
  if (_closeTurn("stinky_bar") != null) { G.nightTurn = ct - 1; const g = _npcsHere().find(x => NPC_ROLES[x] === "hostess"); assert.match(t("barfine " + NPCS[g].name), /closing/); assert.equal(G.pendingBf, null); }
  assert.match(src("engine-parser"), /if \(G\.rainOnRide\) \{ G\.rainOnRide = false;/);
});

test("Benoît: a masseuse answers massage, and last night on her own table", () => {
  sandbox(); const r = NPCS.pensri.room; G.room = r; G.nightTurn = 30; run("talk to pensri");
  assert.match(t("ask pensri about massage"), /฿300/);
  G.massageLog = { [r]: { last: G.day - 1, n: 1 } }; assert.match(t("ask pensri about last night"), /You were|You come in after the bars/);
});

test("Benoît: where to get a massage names a shop; Henning misses in English; 'lyon, in france' keeps 'in' small; an owner is believed", () => {
  sandbox(); G.room = "beach_rd_c"; G.nightTurn = 30;
  assert.match(t("where can i get a massage?"), /The nearest shop/);
  run("talk to henning"); assert.doesNotMatch(t("ask henning about football"), /na\./);
  G.player.said.home = "lyon, in france"; const id = _npcsHere().find(x => NPC_ROLES[x]) || null;
  assert.equal("lyon, in france".replace(/\b\w+/g, (m, i) => i > 0 && /^(?:in|of|the|and)$/i.test(m) ? m.toLowerCase() : m.charAt(0).toUpperCase() + m.slice(1)), "Lyon, in France");
  assert.match(src("engine-parser"), /\/\^\(\?:in\|of\|the\|and\|de\|la\|le\|du\|von\|van\|on\|near\|by\)\$\/i\.test\(m\)/);
});

test("Benoît: the morning tale of a man who left the rail early says nothing of what he 'missed' behind it", () => {
  assert.match(src("engine-systems"), /if \(!_leftEarly\) _say\(t\.missed, "dim"\);/);
});

test("Benoît: a text quoted back is never a quote inside a quote", () => {
  for (const f of [..._TEXT_SUBJECT_HOUSE, ..._TEXT_SUBJECT_THAI]) assert.doesNotMatch(f("N", "x"), /^"“/);
});

test("the camera pick fills {hp}: a man shakes HIS head, and no slot prints raw", () => {
  sandbox(); G.room = "stinky_bar"; G.nightTurn = 20; quiet();
  for (let i = 0; i < 6; i++) { const a = t("ask bert about the camera"); assert.doesNotMatch(a, /\{hp\}|Bert shakes her head/); }
});
