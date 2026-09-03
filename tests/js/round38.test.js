// Round 38 — Dex (the 9am survivor) and Frank returning on an old save.
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
  G.peddlerNight = 2;
});

// ── Dex ──
test("Candy's som-tam errand greeting is Act One's — it stays behind hasWallet (Dex)", () => {
  G.flags = { act1Done: true, hasWallet: true, knowOyHasIt: true }; G.room = "candy_bar";
  run("talk to candy");
  assert.doesNotMatch(text(), /no wallet in your hand, so Oy said no/);
});

test("the two junctions have a late face: no 'busiest crossroads at two' beside an empty bench (Dex)", () => {
  assert.match(ROOMS.pattaya_tai.lateDesc, /gone sparse/); assert.match(ROOMS.beach_rd_s.lateDesc, /one at a time/);
  G.room = "pattaya_tai"; G.nightTurn = 85; run("look");
  assert.doesNotMatch(text(), /busiest crossroads in the city/);
});

test("the police modal reads whole words: WAIT is not WAI, BARFINE is not a FINE (Dex)", () => {
  G.room = "buakhao_n"; G.money = 2000; G.soc.drunk = 5;
  G.pendingEnc = "police"; run("wait until 3");
  assert.equal(G.money, 2000, "no ฿300 for a verb the game advertises");
  assert.equal(G.pendingEnc, "police", "he waits");
  run("barfine lek"); assert.equal(G.money, 2000, "not a payment either");
  run("pay"); assert.equal(G.money, 1500);
});

test("the smell refusal says the number it lifts at (Dex)", () => {
  const src = readFileSync(join(here, "../../web/js/engine-systems.js"), "utf8");
  assert.match(src, /Get under four bottles and she'll look again/);
  assert.match(src, /under four, she looks again/);
  assert.doesNotMatch(src, /Sober up and try again/);
});

test("standing at dawn on a pavement is not 'closing the place' (Dex)", () => {
  G.room = "buakhao_n"; G.nightTurn = 99; out = []; _endNight("dawn");
  assert.ok(_ALLNIGHTER_STREET.some(l => text().includes(l)));
  assert.doesNotMatch(text(), /stacking stools around you/);
});

test("a club's floor heaves in its own words — no low-season bare-wood rail line there (Dex)", () => {
  const club = Object.keys(ROOMS).find(id => ROOMS[id].barType === "club");
  if (!club) return;
  G.season0 = 8; G.day = 3; G.room = club; run("look");
  assert.ok(!_BAR_THIN.some(l => text().includes(l)), "the thin line is a rail's line");
});

test("the Japanese traveller fires on the street, and her intro stands outside (Dex)", () => {
  assert.match(ENCOUNTERS.jptourist.intro, /outside a go-go's open front/);
  assert.ok(ENCOUNTERS.jptourist.rooms.every(r => !ROOMS[r].barType));
});

test("the after-hours question has an answer: LATE / AFTER / KARAOKE land on 'late' for Lek and the filler girls (Dex)", () => {
  G.room = "lucky_tiger"; run("ask lek about after hours");
  assert.match(text(), /On the bike|friend take you somewhere/);
  const g = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && _npcRoom(id) === "candy_bar");
  G.room = "candy_bar"; out = []; run(`ask ${NPCS[g].name.toLowerCase()} about karaoke`);
  assert.match(text(), /After|Thai disco|Thai place|motorbike|she drive/);
  assert.equal(_convoTopic("where do you go after"), "late");
});

test("ASK LEK ABOUT PRICE is her price story, remembered or not yet told (Frank)", () => {
  G.room = "lucky_tiger"; _setFlag("heardPriceStory"); run("ask lek about price");
  assert.match(text(), /Same as I tell you in the rain/);
  newGame(); _setFlag("act1Done"); G.room = "lucky_tiger"; out = []; run("ask lek about price");
  assert.match(text(), /rainy night|when it's raining/);
});

test("DIAGNOSE and the piwin agree on the number (Dex)", () => {
  G.soc.drunk = 5; run("diagnose"); assert.match(text(), /piwins will still take/);
  G.soc.drunk = 7; out = []; run("diagnose"); assert.match(text(), /past what any piwin will carry/);
});

test("the night ride's whisky sets are drinks; a ride that ends at dawn gets the quiet coda (Dex)", () => {
  const src = readFileSync(join(here, "../../web/js/engine-systems.js"), "utf8");
  assert.match(src, /if \(!\/viewpoint\|market\|somtam\/\.test\(venue\.key\)\) G\.soc\.drunk\+\+/);
  assert.match(src, /reason === "dawn"\) \{\n\s*G\.lastBfHonest = true/);
});

// ── Frank ──
test("the morning summary never diffs against a previous vacation's snapshot (Frank)", () => {
  G.lastNight = { vacation: (G.vacation || 0) + 5, happy: 138, money: 3931, atm: 0, atmFees: 0, known: 0, talked: 0, nums: 0, faces: 0 };
  G.happy = 30; G.money = 470; out = []; _morningLedger && _morningLedger();
  assert.doesNotMatch(text(), /-108/);
  // and an old save's stamp-less snapshot is dropped on load
  const blob = serializeGame(); const obj = JSON.parse(blob); obj.lastNight = { happy: 138, money: 3931 };
  deserializeGame(JSON.stringify(obj));
  assert.equal(G.lastNight, null);
});

test("the share card names the game you played (Frank)", () => {
  G.nightLog = ["barfine", "sleep"]; const card = _shareCard().join("\n");
  assert.match(card, /the full week/); assert.doesNotMatch(card, /Soi 6 \(free week\)/);
});

test("the third TALK to a girl who has said hello is not a doorbell — but the second is the gist (Frank)", () => {
  G.room = "lucky_tiger"; G.soc.drinks.lek = 14;
  run("talk to lek"); const first = text();
  out = []; run("talk to lek"); const second = text();
  out = []; run("talk to lek"); const third = text();
  assert.ok(!_HELLO_AGAIN.some(l => second.includes(_fmt(l, { n: "Lek", N: "LEK" }))), "the second talk is her gist, not the wave-off");
  assert.ok(_HELLO_AGAIN.some(l => third.includes(_fmt(l, { n: "Lek", N: "LEK" }))), "the third asks for a subject");
  assert.notEqual(third.split("\n")[0], second.split("\n")[0]);
});

test("the same texted selfie doesn't file twice; the wrong hotel's desk points you home; the dry ATM names the nearest (Frank)", () => {
  assert.ok(_addPhoto("lek", "bar quiet 😴 you come play?? 💕")); assert.ok(!_addPhoto("lek", "bar quiet 😴 you come play?? 💕"));
  G.hotel = "sabai"; G.room = "buakhao_n"; _setFlag("hasWallet"); run("hotel");
  assert.match(text(), /Your room is at the Sabai Palms Hotel — TRAVEL HOME/);
  G.room = "naklua_rd"; out = []; run("withdraw 1000");
  assert.doesNotMatch(text(), /Soi 6 has one/);
});

test("the ride line is one sentence after a seat sentence; the darts opponent gets a capital (Frank)", () => {
  const saved = _rand; _rand = () => 0.99;
  try {
    G.room = "pattaya_klang"; G.dog = null; G.motoRides = 0; run("motosai to naklua");
    assert.doesNotMatch(text(), /swing on the back, There/); assert.doesNotMatch(text(), /anyway\. and the/);
  } finally { _rand = saved; }
  const src = readFileSync(join(here, "../../web/js/engine-play.js"), "utf8");
  assert.match(src, /_oppCap\} rattles in/);
});

test("Eddy's nudge is a soda; a cashier on the floor is the answer to 'who minds the shop' (Frank)", () => {
  assert.match(NPCS.fast_eddy.nudge, /soda with lime/);
  assert.match(readFileSync(join(here, "../../web/js/engine-core.js"), "utf8"), /_tillKeeper\(G\.room\) : _coverGirl\(G\.room\)/);
});

// ── Hamish ──
test("a rotating owner's elsewhere line names the district — two bars are called the Sundowner (Hamish)", () => {
  G.day = 2; G.room = "cricketers"; _describeRoom(true);
  assert.match(text(), /Lawan is working Sundowner Bar, over on Soi Diana, tonight/);
});

test("a named exit typed into a soft pitch walks you off — the decline AND the move (Hamish)", () => {
  const room = Object.keys(ROOMS).find(id => ROOMS[id].exits && ROOMS[id].exits.alley && ENCOUNTERS.freelancer.rooms.includes(id))
    || Object.keys(ROOMS).find(id => ROOMS[id].exits && ROOMS[id].exits.alley);
  assert.ok(room, "a room with an alley exit");
  G.room = room; G.pendingEnc = "freelancer"; run("alley");
  assert.equal(G.pendingEnc, null, "the pitch lapsed");
  assert.equal(G.room, ROOMS[room].exits.alley, "…and you walked");
});
