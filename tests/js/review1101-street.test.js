// THE ADVERSARIAL CODE REVIEW (2026-11-01), the street group: getting around (the bus, the fare), the street's
// encounters and cons, the dog, the night ride, the massage shops, MEET and Cream's last night. The class the last
// review believed closed came back: street resolvers that read a refusal as a yes from an unanchored substring.
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
const t = c => { out = []; doCommand(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = (stage = "vacation") => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  if (stage !== "act1") { _setFlag("act1Done"); _setFlag("hasWallet"); }
  G.stage = stage; quiet(); G.money = 5000; G.bank = 20000;
};
const dice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
beforeEach(() => { newGame(); });

// arm one street encounter where it fires, and answer it through the real parser
const pitch = (id, room, answer, turn = 75) => {
  sandbox(); G.day = 3; G.nightTurn = turn; G.room = room; G.encDone[id] = false;
  _startEnc(id); const m = G.money, d = G.day;
  dice(0.3, () => t(answer));
  return { paid: m - G.money, ended: G.day !== d };
};

test("S7-1: the club pickup reads a refusal as a refusal, at the door and at the morning's ฿2,000", () => {
  // through the real entry: OUT of a club arms it
  sandbox(); G.day = 3; G.nightTurn = 50; G.room = "paradise_nights"; G.encDone.clubpickup = false; G.lastEnc = -99;
  dice(0, () => t("out")); assert.equal(G.pendingEnc, "clubpickup", "OUT of the club armed the pickup");
  const h = G.happy, m = G.money, d = G.day;
  dice(0.5, () => t("i don't want to come back with you"));
  assert.equal(G.day, d, "no night with her"); assert.equal(G.money, m, "no joiner fee"); assert.equal(G.happy, h);
  assert.ok(!_flag("taxiPending"), "no ฿2,000 armed");
  for (const no of ["no", "no thanks", "i don't want to"]) {
    sandbox(); G.day = 3; G.nightTurn = 50; G.room = "ws_south"; G.encDone.clubpickup = false;
    _startEnc("clubpickup"); dice(0.5, () => t("take her home"));
    assert.equal(G.pendingEnc, "clubpickup", "the morning ask is up");
    const m0 = G.money; t(no);
    assert.equal(m0 - G.money, 0, `"${no}" paid the taxi money`);
    assert.match(said(), /For a TAXI/, `"${no}" is the refusal's scene`);
  }
});

test("S7-2: the club pickup's night is a real night — she comes back to your room and the ask lands at the wake", () => {
  sandbox(); G.day = 3; G.nightTurn = 50; G.room = "ws_south"; G.encDone.clubpickup = false;
  _startEnc("clubpickup"); dice(0.5, () => t("take her home"));
  assert.equal(G.day, 4, "the night ended"); assert.equal(G.room, _hotelRoomId(), "you wake in your room, where she came back to");
  assert.equal(G.pendingEnc, "clubpickup"); assert.ok(_flag("taxiPending"));
  assert.doesNotMatch(said(), /Morning\. She does/, "no typed morning");
  // a question about the ask is not the answer to it: nothing paid, the ask stays, no turn
  const m = G.money, n = G.nightTurn; t("what?");
  assert.equal(G.money, m); assert.equal(G.pendingEnc, "clubpickup"); assert.equal(G.nightTurn, n, "a non-answer cost a turn");
  t("pay"); assert.equal(m - G.money, CLUB_TAXI); assert.doesNotMatch(said(), /at nine/, "no hour the game did not compute");
  // the week's last night: the checkout is the morning, and there is no ask on top of it
  sandbox(); G.day = 7; G.nightTurn = 50; G.room = "ws_south"; G.encDone.clubpickup = false;
  _startEnc("clubpickup"); dice(0.5, () => t("take her home"));
  assert.notEqual(G.pendingEnc, "clubpickup", "an ask armed on top of the week's end");
});

test("S7-3: the cons' first steps take no money on a refusal", () => {
  for (const no of ["i won't follow you", "don't show me anything", "i'm fine", "i don't want your tonic"]) {
    const r = pitch("tonic", "beach_rd_c", no, 20);
    assert.equal(r.paid, 0, `tonic: "${no}" paid`); assert.ok(!_flag("tonicShop"), `tonic: "${no}" walked into the shop`);
  }
  assert.equal(pitch("tonic", "beach_rd_c", "buy the 99 bottle", 20).paid, TONIC_PRICE, "a yes still buys");
  for (const no of ["ok maybe later", "fine, i'd rather not", "sure, not tonight"]) {
    const r = pitch("fortune", "beach_rd_c", no, 20);
    assert.equal(r.paid, 0, `fortune: "${no}" paid`); assert.ok(!_flag("curseRitual"), `fortune: "${no}" opened the ritual`);
  }
  assert.equal(pitch("fortune", "beach_rd_c", "read my palm", 20).paid, FORTUNE_READ, "a yes still reads");
});

test("S7-4: the sea wall, the booking app, the ping-pong tout and the free amulet hear a refusal", () => {
  for (const [id, room, no] of [["seawall", "beach_rd_top", "i'd rather not"], ["seawall", "beach_rd_top", "i'm broke"],
    ["booking", "hotel_room", "i'm broke"], ["pingpong", "ws_gate", "i'm broke"],
    ["freegift", "promenade", "maybe later"], ["freegift", "promenade", "not tonight"], ["freegift", "promenade", "thank you, no"]]) {
    const r = pitch(id, room, no);
    assert.equal(r.paid, 0, `${id}: "${no}" paid`); assert.ok(!r.ended, `${id}: "${no}" ended the night`);
  }
  assert.ok(pitch("seawall", "beach_rd_top", "yes").ended, "a yes at the wall is still the night");
  assert.equal(pitch("freegift", "promenade", "accept thanks").paid, GIFT_DEBT, "taking the 'free' thing still signs for it");
  // a line the amulet woman does not understand leaves her holding it out — it neither accepts nor closes the gate
  const r = pitch("freegift", "promenade", "tao rai? what does that mean");
  assert.equal(r.paid, 0); assert.equal(G.pendingEnc, "freegift", "the gate closed on a question");
});

test("S7-5: RIDE THE LOOP with company is refused before it starts when the seats cannot be paid", () => {
  sandbox(); G.money = BUS_FARE; G.room = "beach_rd_c"; G.nightTurn = 20; G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} };
  const h = G.happy, n = G.nightTurn;
  t("ride the loop");
  assert.equal(G.pendingFare, null, "a fare he cannot pay"); assert.equal(G.happy, h, "the lap was ridden");
  assert.equal(G.nightTurn - n, 1, "the circuit's ticks were spent"); assert.match(said(), /a seat a head/);
});

test("S7-6: FEED DOG under a roof is refused — the station, Oy's office, the CCIB front, the 7-Eleven", () => {
  for (const rm of ["police_station", "oy_office", "eastern_seaboard", "jomtien_7eleven"]) {
    sandbox(); G.room = rm; G.nightTurn = 10; t("feed dog");
    assert.ok(!G.dog, `adopted a soi dog inside ${rm}`); assert.match(said(), /where they live/);
  }
  sandbox(); G.room = "beach_rd_c"; G.nightTurn = 10; t("feed dog"); assert.ok(G.dog, "the street still adopts");
});

test("S7-7: the fare gate — a bare PAY costs no turn, and a refusal gets the driver, not the parser's miss", () => {
  sandbox(); G.money = 500; G.room = "beach_rd_c"; G.nightTurn = 20; t("ride bus to naklua");
  assert.ok(G.pendingFare, "the fare is up");
  for (const c of ["i won't pay", "i don't have it", "pay"]) {
    const n = G.nightTurn; const s = t(c);
    assert.ok(G.pendingFare, `"${c}" dropped the fare`); assert.equal(G.nightTurn, n, `"${c}" cost a turn`);
    assert.match(s, /สิบห้าบาท/, `"${c}" did not get the driver's prompt`);
  }
});

test("S6-4: the night ride hears \"i don't want to go\" and \"let's not\" as the end of it, and a non-answer costs no turn", () => {
  for (const no of ["i don't want to go", "let's not"]) {
    sandbox(); G.nightTurn = 60; G.rideSeq = { id: "noi", fine: 0, spent: 0, stops: 0, sanuk: 0, seen: [] }; G.pendingEnc = "nightride";
    t(no);
    assert.ok(!G.rodeVenues, `"${no}" rode to a stop`); assert.doesNotMatch(said(), /carries the two of you off/, `"${no}" rode`);
  }
  sandbox(); G.nightTurn = 60; G.rideSeq = { id: "noi", fine: 0, spent: 0, stops: 0, sanuk: 0, seen: [] }; G.pendingEnc = "nightride";
  t("what?"); t("hang on");
  assert.equal(G.nightTurn, 60, "a non-answer cost a turn"); assert.equal(G.pendingEnc, "nightride"); assert.equal(G.rideSeq.stops, 0, "\"hang on\" rode");
});

test("S6-5: \"massage no happy ending\" is the plain oil hour, not the SPECIAL", () => {
  sandbox(); G.room = "smile_massage"; G.nightTurn = 40; const m = G.money;
  t("massage no happy ending");
  assert.ok(m - G.money < MASSAGE_SPECIAL, "the special was charged"); assert.ok(!(G.soc.special && G.soc.special.smile_massage));
});

test("S6-6: the soapy menu reads \"not the model\" and \"i don't want 99\" as a no", () => {
  for (const no of ["not the model", "i don't want 99"]) {
    sandbox(); G.room = "poseidon_soapy"; G.nightTurn = 40; t("soapy"); const m = G.money;
    t(no); assert.equal(G.money, m, `"${no}" bought a tier`); assert.equal(G.pendingSoapy, null);
  }
});

test("S6-7: MEET is refused when the hour does not fit the night, and the bar does not tick while you are at hers", () => {
  const arm = () => { sandbox(); G.offShift = { id: null, name: "Fon", home: "smile_massage", day: G.day, ghost: false }; G.itemLoc.masseuse_note = "inventory"; };
  arm(); G.room = "beach_rd_c"; G.nightTurn = NIGHT_TURNS - 3; const m = G.money, d = G.day;
  t("meet her");
  assert.equal(G.money, m, "charged for an hour the night does not have"); assert.equal(G.day, d, "the night ended inside her room");
  assert.equal(G.itemLoc.masseuse_note, "inventory", "the number was spent");
  arm(); G.room = "stinky_bar"; G.nightTurn = 60; G.lastPeddler = -99; G.peddlerNight = 0;
  dice(0.05, () => t("meet her"));
  const back = said().indexOf("walks you down to the soi"), elbow = said().indexOf("at your elbow");
  assert.ok(back >= 0, "the walk back was told");
  assert.ok(elbow < 0 || elbow > back, "the bar's peddler armed at your elbow while you were at her place");
});

test("S6-9: a night with Cream on the week's last night is remembered: chamDone, and no first-time pull-back next trip", () => {
  sandbox(); G.day = 7; G.room = _npcRoom("cream"); G.nightTurn = 50;
  t("barfine cream"); t("go");
  assert.ok(_flag("chamDone"), "the night she went home with him was forgotten");
  assert.ok(G.chamLast && G.chamLast.gift === 0);
});
