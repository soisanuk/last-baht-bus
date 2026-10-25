// THE ADVERSARIAL CODE REVIEW (2026-10-25): eight reviewers, seven systems each, docs/architecture.md as the map, every
// finding proven with a probe. These pin the defects fixed from it. Two classes came out of more than one report:
// a REFUSAL read as a yes (an unanchored "pay|ok|sure" took ฿1,900 for "not sure"), and a DAY STAMP that did not age
// when a new trip reset G.day (the booking app, the rose seller, the laundering payouts, a bank review — _ageBooks now
// sweeps every G.<x>Day and the absolute deadlines).
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

test("Act One: WATCH SUNRISE is a dawn — the race is lost, not dodged", () => {
  sandbox("act1"); G.day = 2; G.room = "beach_rd_c"; G.nightTurn = SUNRISE_TURN + 1;
  const tries = G.act1Tries || 0; _endNight("sunrise");
  assert.equal(G.act1Tries, tries + 1, "the fail screen ran"); assert.equal(G.day, 2, "back to the beach, day two");
});

test("a refusal is not a yes: the tonic shop, the curse, the freelancer and the police keep their hands off the money", () => {
  for (const no of ["i won't pay", "not sure", "i'm broke", "no thanks, another time"]) assert.ok(_isRefusal(no), no);
  for (const yes of ["yes", "ok", "pay it", "sure, why not"]) assert.ok(!_isRefusal(yes), yes);
  sandbox(); G.room = "beach_rd_c"; G.soc.drunk = 6; G.money = 3000;
  G.pendingEnc = "police"; G.lastPolice = G.turns; const m = G.money; dice(0.99, () => doCommand("i won't pay"));
  assert.equal(G.money, m, "\"I won't pay\" paid the fine");
});

test("the mamasan's rescue is rolled once a stop, not again on every stall", () => {
  sandbox(); G.lastPolice = 50; G.soc.policeRoll = { at: 50, ok: false };
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.match(src, /G\.soc\.policeRoll && G\.soc\.policeRoll\.at === G\.lastPolice/);
});

test("the bus: a man who cannot pay for his companion's seat is told so, and a fare he cannot pay can be walked away from", () => {
  sandbox(); G.room = "beach_rd_c"; G.money = 20; G.party = { ids: ["nan"], stops: 0, spent: 0, seen: {} };
  t("ride bus"); assert.equal(G.pendingFare, null, "no fare gate he cannot answer");
  G.pendingFare = { kind: "bus", price: 30 }; t("walk"); assert.equal(G.pendingFare, null);
});

test("a downpour refuses the crossing before the highway is rolled", () => {
  sandbox(); G.room = "sukhumvit_crossing"; G.rain = 5; G.itemLoc.umbrella = null;
  const day = G.day; dice(0.0, () => doCommand("e"));
  assert.equal(G.day, day, "the truck never came for a step the rain refused"); assert.equal(G.room, "sukhumvit_crossing");
});

test("CHECKOUT from the condo is refused: the lease and its deposit are MOVE OUT's", () => {
  sandbox("expat"); G.hotel = "condo"; G.condo = { deposit: 18000, since: 1 }; G.room = "condo_room"; G.nightTurn = 2;
  assert.match(t("checkout"), /MOVE OUT/); assert.equal(G.hotel, "condo"); assert.equal(G.pendingChoice, null);
});

test("SELL UP after the affair broke or soured is the closed door, not the Prachuap ending", () => {
  sandbox("expat"); G.flags.barOpen = true; G.flags.barPaid = true; G.bar.room = "stinky_bar"; _setFlag("affairOffered");
  G.affair = { id: "manow", soured: true }; G.room = "stinky_bar";
  out = []; _doSellBar(); assert.notEqual(G.pendingChoice, "sellbar"); assert.match(said(), /gone, or gone sour/);
});

test("the house closing on killer pool hands back your entry, not the pot", () => {
  sandbox(); G.game = { type: "kp", stake: KP_ENTRY * 5 }; const m = G.money;
  _abandonGame("The shutters come down", true); assert.equal(G.money, m + KP_ENTRY);
});

test("telling Tan you are leaving, in answer to his own question, is the leaving — never a crash", () => {
  sandbox(); G.convoQ = { id: "tan", key: "came_for" }; G.convo = "tan";
  assert.doesNotThrow(() => _convoAnswer("it's my last night"));
});

test("Thai numbers ending in สิบเอ็ด", () => {
  assert.equal(parseThaiWords("สามสิบเอ็ด"), 31); assert.equal(parseThaiWords("ห้าสิบเอ็ด"), 51); assert.equal(parseThaiWords("สิบเอ็ด"), 11);
});

test("SEND reads a thousands separator", () => {
  sandbox(); G.phone.contacts.lek = true; G.bank = 5000;
  assert.match(t("send 1,500 to lek"), /฿1,500 goes out/, "fifteen hundred, to Lek — not one baht to nobody");
});

test("Nira does not lend to a man with no wallet (Act One)", () => {
  sandbox("act1"); G.room = _npcRoom("nira"); G.money = 0;
  assert.match(t("borrow 20000"), /Find your wallet first/); assert.ok(!G.loan);
});

test("a new trip ages the day stamps and the deadlines, so trip two's day N is not trip one's", () => {
  sandbox(); G.day = 6; G.bookingDay = 6; G.mamaYaiDay = 6; G.acctUntil = 30; G.jobPay = [{ due: 9, kind: "msg" }];
  G.massageLog = { smile_massage: { last: 5 } }; _newVacation();
  assert.ok(G.bookingDay < 1 && G.mamaYaiDay < 1, "once-a-day stamps are in the past"); assert.ok(G.acctUntil < 1, "the review ended with the trip");
  assert.ok(G.jobPay[0].due <= 1, "the payout comes due"); assert.ok(G.massageLog.smile_massage.last < 1);
});

test("a ride that reaches dawn never leaves _onRide() stuck true", () => {
  sandbox(); G.rideSeq = { id: "lek", stops: 1, seen: [] }; G.room = "beach_rd_c"; _endNight("dawn");
  assert.equal(G.rideSeq, null); assert.ok(!_onRide());
});

test("the lock-in counts tonight's spending, and a night's tipping resets at dawn", () => {
  sandbox(); G.soc.drinks.dokmai = 9;   // the trip's bond, not tonight's book
  assert.ok(!_barSpendTonight("night_heron"), "last week's drinks bolt no door");
  G.soc.tipBond = 3; G.room = "hotel_room"; _endNight("sleep"); assert.equal(G.soc.tipBond, 0);
});

test("a quest pays once a life, however it is reopened", () => {
  sandbox(); const qid = Object.keys(QUESTS).find(q => QUESTS[q].reward && QUESTS[q].reward.money);
  G.quests[qid] = "active"; _setFlag(QUESTS[qid].doneFlag); const m0 = G.money + G.bank; _questTick();
  const paid = G.money + G.bank - m0; assert.ok(paid > 0);
  G.quests[qid] = "active"; _questTick(); assert.equal(G.money + G.bank - m0, paid, "paid again");
});

test("the barfine prompt in a bar with nobody on the floor names nobody", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /since there is nobody on the floor tonight to do the arithmetic for her/);
});

test("the walk-out's verdict never falls on the woman walked out with you", () => {
  sandbox(); G.room = "stinky_bar"; G.soc.drinks.manow = 14; G.party = { ids: ["manow"], stops: 0, spent: 0, seen: {} };
  out = []; _maiDeeScene(["manow"]); assert.ok(!(G.maiDee || {}).manow);
});

test("ABANDON with a name that matches nothing abandons nothing", () => {
  sandbox(); const qid = Object.keys(QUESTS).find(q => !QUESTS[q].item); G.quests[qid] = "active";
  t("abandon glamxx"); assert.equal(G.quests[qid], "active");
});

test("the dog keeps the wallet too, and the Vic's curry makes you thirsty", () => {
  sandbox("expat"); G.dog = { since: 1 }; G.blackouts = 5;
  assert.equal(_walletLostRoll("blackout"), false);
  sandbox(); G.room = "queen_vic"; G.thirst = 20; const card = _qvMenu().find(d => /curry/i.test(d.name || d.id || ""));
  if (card) { doCommand("buy " + (card.name || card.id).toLowerCase()); assert.ok(G.thirst >= 20, "the curry quenched thirst"); }
});

// ── the second pass: the 29 left by the first ─────────────────────────────────
test("the end of the week starts the next trip clean; the night's own calls never survive it", () => {
  sandbox(); G.lastBfBase = 4; G.crashInjury = true; G.lastBfId = "lek"; _newVacation();
  assert.equal(G.lastBfBase, 10); assert.ok(!G.crashInjury); assert.equal(G.lastBfId, null);
  sandbox(); G.room = "hotel_room"; G.pendingChoice = "synjob"; _endNight("sleep"); assert.equal(G.pendingChoice, null);
});

test("I DON'T DRINK is honoured by the quiz and the ride; DECLINE gives back what was poured", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  assert.match(src, /right === 3\) \{\n\s*if \(!\(G\.player && G\.player\.teetotal\)\) G\.soc\.drunk\+\+/);
  sandbox(); G.soc.drunk = 0; G.room = "stinky_bar"; _compDrink(2); const u = G.lastComp.units; assert.ok(u >= 2);
  doCommand("decline"); assert.equal(G.soc.drunk, 0);
});

test("the intro reads an orientation by its own words", () => {
  assert.equal(_introMatch("bi, to be honest", ORIENTATIONS).id, "bi");
  assert.equal(_introMatch("straight", ORIENTATIONS).id, "straight");
});

test("a paid hour that would run into dawn is refused before the money moves", () => {
  sandbox(); G.nightTurn = NIGHT_TURNS - 3; const m = G.money;
  assert.ok(_tooLateFor(10, "A proper hour")); assert.equal(G.money, m);
  assert.ok(!_tooLateFor(2, "x"));
});

test("Cloze's board: one go a night, and a letter is not a word", () => {
  sandbox(); G.room = "cloze"; const w = _boardWord();
  t("answer " + w.rom.slice(0, 1)); assert.notEqual(G.boardWon, G.day, "one letter won it");
  assert.match(t("answer " + w.rom), /One go a night/);
});

test("the cart asks who 'for X' is rather than buying it for you", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.match(src, /For whom\? The saleng man waits/);
});

test("the condo: the advance is the first month, a short month is collected, the hotel's book is settled not wiped", () => {
  sandbox("expat"); G.payDay = 1; G.room = "pratumnak_soi5"; G.money = 0; G.bank = 60000; G.hotelDebt = 900; G.nightTurn = 2;
  doCommand("rent a condo"); doCommand("rent a condo"); assert.equal(G.hotel, "condo");
  assert.equal(G.bank, 60000 - CONDO_RENT * CONDO_DEPOSIT_MONTHS - CONDO_RENT - 900, "the book came out of the same money");
  const line = _condoMonth(); assert.match(line, /advance you paid at the desk/);
});

test("the platform's first payday is the days held, and the school's paper needs a month", () => {
  sandbox("expat"); G.job = { kind: "teach", since: G.day - 3 };
  assert.ok(_jobPay() < TEACH_PAY / 5, "three days is not a month");
  G.job.firstPaid = true; assert.ok(_jobPay() >= TEACH_PAY * 0.4);
});

test("at your own bar the till is the house side of a game, and a bell's round rings into it", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  assert.match(src, /a game the house lost/); assert.match(src, /G\.bar\.ownBells/);
});

test("Cream, Sao and the Orchid read the room", () => {
  const s = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(s, /function _chamAsk\(\) \{[\s\S]{0,300}_partyBlocksTrade\(\)/);
  assert.match(s, /G\.nightTurn < 50 && !\(G\.party/);
  sandbox(); G.room = "orchid_room"; G.money = 5000; const m = G.money; doCommand("tip 100"); assert.equal(G.money, m);
});

test("the free ride reads the fare charged; MOTOSAI HOME stops a man on the bench at the door; another hotel is a guest's", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.match(src, /G\.money < \(typeof _motoFare === "function" \? _motoFare\(d\) : d\.price\)/);
  assert.match(src, /ROOMS\[G\.motoHomeDoor\]\.dark && !G\.street/);
  assert.match(src, /if \(_hotelOf && _hotelOf !== G\.hotel\) \{/);
});

test("a YES belongs to the newest prompt, and a blown box closes the heist job", () => {
  const p = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.match(p, /startsWith\("streambell:"\) && !\(G\.pendingChoice/);
  sandbox(); G.quests.rabbit_heist = "active"; G.room = "kitten_office"; out = []; _boxBlown(); assert.equal(G.quests.rabbit_heist, "abandoned");
});
