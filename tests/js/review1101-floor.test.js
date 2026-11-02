// THE ADVERSARIAL CODE REVIEW (2026-11-01), the floor group: the body and the sobriety meter (S8), the barfine and
// the party (S5), the Orchid's own closing hour (S6-8 / S3-8 / S10-7) and the manager's shift against his bar's
// shutter (S3-9). Each pin reaches the system through its real entry point where one exists.
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

// ── S8: the body, the sobriety meter ──────────────────────────────────────────

test("S8-1: the sobering clock restarts at dawn — tomorrow's first beer wears off in twenty turns, not at last night's deadline", () => {
  sandbox(); G.money = 50000; G.room = "stinky_bar";
  for (let i = 0; i < 40; i++) t("wait");
  for (let i = 0; i < 4; i++) t("buy beer");
  for (let i = 0; i < 30; i++) t("wait");
  assert.ok(G.soc.drunk > 0 && G.soc.soberNext > 20, "the night ends with drink in him and a late deadline");
  G.room = _hotelRoomId(); const d = G.day; t("sleep");
  for (let k = 0; G.day === d && k < 10; k++) t("yes");
  assert.notEqual(G.day, d, "slept through to the next evening");
  assert.equal(G.soc.soberNext, null, "the deadline went with the night");
  quiet(); G.room = "stinky_bar"; t("buy beer"); assert.equal(G.soc.drunk, 1);
  let n = 0; while (G.soc.drunk > 0 && n < 200) { t("wait"); n++; }
  assert.ok(n <= 21, `one unit wore off after ${n} waits; it should take about twenty`);
});

test("S8-2: the regular's round back is a comp — I DON'T DRINK holds, it pays once a bar a night, and DECLINE has a glass to refuse", () => {
  sandbox(); G.room = "stinky_bar"; G.player.teetotal = true; G.soc.bellAt[G.room] = G.turns;
  const h0 = G.happy;
  for (let i = 0; i < 4; i++) t("talk to patron");
  assert.equal(G.soc.drunk, 0, "a declared teetotaller was poured four");
  assert.equal(G.happy - h0, 1, "the round paid สนุก on every repeat");
  sandbox(); G.room = "stinky_bar"; G.soc.bellAt[G.room] = G.turns;
  for (let i = 0; i < 3; i++) t("talk to patron");
  assert.equal(G.soc.drunk, 1, "one round back, not one a sentence");
  sandbox(); G.room = "stinky_bar"; G.soc.bellAt[G.room] = G.turns;
  t("talk to patron"); assert.ok(G.lastComp, "the round is a comp DECLINE can hand back");
  t("decline"); assert.equal(G.soc.drunk, 0);
  // Bert's "two more for the road" is a comp too
  sandbox(); G.room = "stinky_bar"; G.player.teetotal = true;
  dice(0.1, () => t("buy man drink"));
  assert.equal(G.soc.drunk, 0, "the manager's 'for the road' poured into a teetotaller");
});

test("S8-3: a mamasan's treat that blacks him out stops there — no round, toast or thirst refund in the next evening", () => {
  sandbox(); G.room = "stinky_bar"; G.soc.drunk = 8;
  let thirstAtWake = null; const _e = _endNight;
  _endNight = function (...a) { const r = _e.apply(this, a); thirstAtWake = G.thirst; return r; };
  try { dice(0.1, () => t("buy lamai a drink")); } finally { _endNight = _e; }
  assert.notEqual(thirstAtWake, null, "the comp blacked him out");
  assert.equal(G.thirst, thirstAtWake, "the treat eased the new evening's thirst");
  const s = said(), wake = s.indexOf("film simply stops") >= 0 ? s.indexOf("film simply stops") : s.search(/You come to|You wake|surface/);
  assert.ok(!/A small toast from Lamai/.test(s), "the purchase's toast printed in the next evening");
  const flick = s.indexOf("flicks two fingers");
  assert.ok(flick < 0 || wake < 0 || flick < wake, "her round printed after the morning");
});

test("S8-4: losing the shift brawl at two strikes is the third strike — the night ends in the ward", () => {
  sandbox("expat"); G.room = "stinky_bar";
  G.bar = { room: "stinky_bar", cash: 20000, note: 0, arrears: 0, rentShort: 0, month: 0, floorSaid: {}, pocketDrawn: 0 };
  G.hurt = 2; const d = G.day; G.pendingChoice = "shift"; G.shiftCall = "turning";
  dice(0.99, () => t("yes"));
  assert.notEqual(G.day, d, "pinned at 3/3 with the night still running");
  assert.ok(G.hurt < HURT_CAP);
});

test("S8-5: EAT refuses a full man at his own bar and keeps his carried food (FULL_AT)", () => {
  sandbox("expat"); _setFlag("barOpen"); G.room = "stinky_bar";
  G.bar = { room: "stinky_bar", cash: 20000, note: 0, arrears: 0, rentShort: 0, month: 0, floorSaid: {}, pocketDrawn: 0 };
  G.hunger = 0; G.itemLoc.noodles = "inv"; const m = G.money;
  t("eat"); t("eat");
  assert.equal(G.money, m, "the own-bar plate charged a man at hunger 0");
  assert.equal(G.itemLoc.noodles, "inv", "the carried noodles were eaten at hunger 0");
});

test("S8-6: a ya dong, a host-bar beer and Bert's free beer un-say I DON'T DRINK", () => {
  sandbox(); G.room = "moonshine_bar"; G.player.teetotal = true; t("buy ya dong");
  assert.ok(G.soc.drunk > 0); assert.equal(G.player.teetotal, false, "ya dong");
  sandbox(); G.room = "adonis_club"; G.player.teetotal = true; t("buy beer");
  assert.ok(G.soc.drunk > 0); assert.equal(G.player.teetotal, false, "host-bar beer");
  sandbox(); G.room = "stinky_bar"; G.flags.bertFreeBeer = true; G.player.teetotal = true; t("buy beer");
  assert.ok(G.soc.drunk > 0); assert.equal(G.player.teetotal, false, "Bert's free beer");
});

test("S8-7: TALK TO PATRON in a go-go puts nobody on a stool, at a rail or down a bar", () => {
  const hadBtc = typeof globalThis.BTC !== "undefined";
  globalThis.BTC = { thb: 2400000 };
  try {
    sandbox(); G.room = "tequila_queen"; G.soc.drunk = 5;
    const a = dice(0.99, () => t("talk to patron"));
    sandbox(); G.room = "tequila_queen";
    const b = dice(0.05, () => t("talk to patron"));
    assert.match(a + b, /regular/);
    for (const s of [a, b]) assert.doesNotMatch(s.split("\n").filter(l => /regular/.test(l)).join("\n"), _FIT_GOGO);
  } finally { if (!hadBtc) delete globalThis.BTC; }
});

test("S8-8: the Blue Dog's revisit pool is hour-blind — no setting sun at 23:00", () => {
  const NOW = /\b(?:the )?sun (?:keeps |is |still )?(?:going|goes|setting|sinking|dropping)\b/i;
  for (const l of ROOMS.blue_dog.revisit) assert.doesNotMatch(l, NOW);
});

test("S8-9: 'no thanks, I don't drink' hands a fresh comp back and declares; 'i'm teetotal' and 'i am sober' are understood", () => {
  sandbox(); G.room = "stinky_bar"; _compDrink(1); t("no thanks, i don't drink");
  assert.equal(G.soc.drunk, 0, "the comp stayed in him"); assert.equal(G.player.teetotal, true, "nothing was declared");
  for (const s of ["i'm teetotal", "i am sober"]) {
    sandbox(); G.room = "stinky_bar"; t(s); assert.equal(G.player.teetotal, true, s);
  }
});

test("S8-10: a night-ride stop past the blackout line ends the ride — she gets him to a bed", () => {
  for (const v of [0.05, 0.3, 0.6, 0.95]) {
    sandbox(); G.money = 50000; G.room = "stinky_bar";
    const id = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
    G.nightTurn = 30; G.rideSeq = { id, seen: [], stops: 0, spent: 0, sanuk: 0, lastHop: -1 }; G.pendingEnc = "nightride"; G.soc.drunk = 8;
    const d = G.day;
    dice(v, () => { for (let i = 0; i < 4 && G.day === d; i++) { t("ride on"); if (G.day === d) assert.ok(G.soc.drunk < 9, `on the pillion at ${G.soc.drunk} (dice ${v})`); } });
    if (G.day !== d) assert.equal(G.rideSeq, null);
  }
});

// ── S5: the barfine and the party ────────────────────────────────────────────

test("S5-2: a bare BARFINE in a staffless pub never re-sells the woman already on your arm", () => {
  sandbox(); G.money = 20000; G.room = "sunset_rail"; G.nightTurn = 30; G.soc.drinkCount = { pukky: 1 }; G.soc.drinks.pukky = 8;
  t("barfine pukky"); t("take her out"); assert.deepEqual(G.party.ids, ["pukky"]);
  t("out"); t("enter queen vic"); const m = G.money;
  t("barfine"); t("take her out");
  assert.equal(G.money, m, "charged for her a second time");
  assert.deepEqual(G.party.ids, ["pukky"], "her id twice in the party");
});

test("S5-3: a self-barfine books the night to HER, and is never offered with another woman on your arm", () => {
  sandbox(); G.money = 50000; G.peddlerNight = 99; G.room = "stinky_bar"; G.nightTurn = 40; G.soc.drinks.jiap = 8;
  t("barfine jiap"); t("short time"); G.pendingEnc = null;
  G.room = "sunset_rail"; G.nightTurn = 65; G.soc.drinks.pukky = 8; G.soc.drinkCount = { pukky: 1 };
  G.soc.bells.sunset_rail = 3; G.soc.bellAt.sunset_rail = G.turns;
  dice(0.1, () => _maybeSelfBarfine("pukky")); assert.equal(G.pendingEnc, "selfbf");
  const d = G.day; const s = t("yes");
  assert.notEqual(G.day, d);
  assert.ok(G.wentWith && G.wentWith.pukky, "the night is written down as hers");
  assert.doesNotMatch(s, /same night now/, "Jiap's repeat-night jading was applied to Pukky's night");
  sandbox(); G.money = 50000; G.peddlerNight = 99; G.room = "stinky_bar"; G.nightTurn = 40; G.soc.drinks.jiap = 8;
  t("barfine jiap"); t("take her out"); G.pendingEnc = null;
  G.room = "sunset_rail"; G.nightTurn = 65; G.soc.drinks.pukky = 8; G.soc.drinkCount = { pukky: 1 };
  dice(0.1, () => _maybeSelfBarfine("pukky"));
  assert.notEqual(G.pendingEnc, "selfbf", "offered in front of the woman on his arm");
});

test("S5-4: GO HOME WITH her from the bench takes nobody to a room the desk will not open", () => {
  sandbox("expat"); G.money = 20000; G.peddlerNight = 99; G.street = { since: 1, nights: 2, swept: 0 };
  G.room = "stinky_bar"; G.nightTurn = 60; G.soc.drinks.jiap = 8;
  t("barfine jiap"); t("take her out"); G.pendingEnc = null;
  t("go home with jiap");
  assert.notEqual(G.room, _hotelRoomId(), "walked into the hotel room on the bench");
  assert.ok(!G.party || !G.party.ids || !G.party.ids.length, "she went home on her own");
});

test("S5-5: a manager cannot barfine his own bar's cashier", () => {
  for (let d = 2; d < 8; d++) {
    sandbox("expat"); G.money = 20000; G.day = d;
    G.job = { kind: "manager", room: "sunset_rail", corp: false, nights: 4, stood: 3, weekStood: 1, weekStart: 1, strikes: 0, since: 1 };
    G.room = "sunset_rail"; G.nightTurn = 40; t("ring bell"); t("ring bell"); G.soc.drinks.numfon = 8;
    const m = G.money; t("barfine numfon");
    assert.equal(G.pendingBf, null, `day ${d}: the ledger opened on his cashier`);
    t("short time"); assert.equal(G.money, m);
  }
});

test("S5-6: a colleague asked about upstairs after you left with a girl from her bar says the floor's rule, not a price", () => {
  sandbox(); G.money = 50000; G.peddlerNight = 99; G.room = "pink_lotus"; G.nightTurn = 40;
  const hs = _npcsHere().filter(i => NPC_ROLES[i] === "hostess"); G.soc.drinkCount = {};
  for (const h of hs) { G.soc.drinks[h] = 3; G.soc.drinkCount[h] = 1; }
  dice(0.99, () => { t("barfine joy"); t("short time"); });
  G.pendingEnc = null;
  assert.equal(_bfDayPeek("puu"), "stealing");
  const s = dice(0.99, () => t("ask puu about upstairs"));
  assert.doesNotMatch(s, /Short time, ฿/, "she quoted a price the floor's rule had already answered");
});

test("S5-7: the Soi 6 one-drink rule reads tonight's tip, not a tip from an earlier night of the trip", () => {
  sandbox(); G.money = 20000; G.peddlerNight = 99; G.room = "pink_lotus"; G.nightTurn = 30;
  t("tip joy 300"); _endNight("sleep"); quiet();
  G.pendingEnc = null; G.peddlerNight = 99; G.room = "pink_lotus"; G.nightTurn = 30;
  const s = dice(0.99, () => t("barfine joy"));
  assert.match(s, /BUY DRINK FOR JOY/, "last night's tip waived tonight's drink");
  assert.equal(G.pendingBf, null);
});

test("S5-8: a short time at a gentlemen's club names that club's payee and splits her money from the house's", () => {
  sandbox(); G.money = 50000; G.peddlerNight = 99; G.room = "succubus"; G.nightTurn = 35;
  const h = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && !_isDraw(i));
  G.soc.drinks[h] = 4; G.soc.drinkCount = { [h]: 1 };
  const s = dice(0.99, () => { t("barfine " + h); return t("short time"); });
  assert.doesNotMatch(s, /Rose/, "Notty's mamasan named at the Succubus");
  assert.match(s, new RegExp(`into ${NPCS[h].name}'s own hand`));
  assert.doesNotMatch(s, /couches along the wall/, "Notty's curtained couches in a room that has none");
});

test("S5-10: the go-go bell pool and _FIT_GOGO keep the rail and the length of the bar out of a go-go", () => {
  sandbox(); G.room = "hyper"; G.nightTurn = 40;
  for (const l of _roomFit(_BELL_GOGO)) assert.doesNotMatch(l, /\brail\b|length of the bar/);
  assert.ok(_FIT_GOGO.test("drinks down the whole rail") && _FIT_GOGO.test("down the length of the bar"));
});

// ── the Orchid's own hour; the manager's shift ───────────────────────────────

test("S6-8 / S3-8: the Orchid Room's four o'clock close says four o'clock, not Soi 6's two", () => {
  sandbox("expat"); _setFlag("expatLife"); G.room = "orchid_room"; G.nightTurn = _closeTurn("orchid_room") - 1;
  const s = t("wait");
  assert.doesNotMatch(s, /Two o'clock on Soi 6/);
  assert.match(s, new RegExp(_closeClock("orchid_room") + " o'clock", "i"));
});

test("S10-7: asked about closing in the Orchid Room, she says its hour, not midnight", () => {
  sandbox(); G.mode = "soi6"; G.room = "orchid_room"; G.nightTurn = 30; G.metDay = { nune: G.day - 2 }; G.soc.drinks.nune = 4;
  const s = t("ask nune about closing");
  assert.doesNotMatch(s, /Twelve|Midnight|half eleven/i);
  assert.match(s, new RegExp(_closeClock("orchid_room"), "i"));
});

test("S3-9: a manager's shift his bar's shutter would cut short is refused, not taken and struck", () => {
  sandbox("expat"); G.money = 20000; _setFlag("expatLife"); G.payDay = G.day; G.room = "water_buffalo"; G.nightTurn = 10;
  const h = Object.keys(NPCS).find(n => _npcRoom(n) === "water_buffalo" && NPC_ROLES[n] === "hostess");
  G.soc.drinks[h] = 20; G.talked[h] = [0]; G.known[h] = true;
  _jobOffer("water_buffalo", "wandee"); t("take the job"); assert.equal(G.job && G.job.kind, "manager");
  G.nightTurn = _closeTurn("water_buffalo") - WORK_MIN_STOOD + 4;
  t("work");
  assert.notEqual(G.job.shiftDay, G.day, "a shift that cannot reach WORK_MIN_STOOD before the shutter was taken");
});
