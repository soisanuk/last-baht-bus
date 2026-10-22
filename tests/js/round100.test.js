// ROUND 100 (2026-10-21) — three personas on the resident's month: Willem (Opus, ordinary-player-baseline on the new default
// entry — 52 stops, twelve of them finding where a man rents a flat), Renata (Opus, resident-month-stacker — "each subsystem
// only hears its own cue"), Cormac (Fable, one woman courted through a condo — "the people were wrong about where I live").
// The class is one: the resident's new systems were invisible to the people. The money reconciled for all three.
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
const resident = () => {
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); _setFlag("expatLife"); G.itemLoc.wallet = "inventory"; for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.stage = "expat"; G.paper = "longstay"; G.thaiAccount = true; G.hotel = "sabai"; G.day = 20; G.money = 8000; G.bank = 60000; G.payDay = 20; G.month = { spent: 0, rent: 0, rough: 0, days: 0 };
  G.room = "hotel_room"; G.nightTurn = 30; out = [];
};
const sleep = () => { out = []; run("sleep"); run("sleep"); return said(); };
const SB = "sweet_tamarind";
const hire = () => { G.room = SB; for (const id of _staffAt(SB)) if (NPC_ROLES[id] === "hostess") { G.soc.drinks[id] = 8; G.talked[id] = [0]; } const m = _staffAt(SB).find(i => NPC_ROLES[i] === "mamasan") || _tillKeeper(SB); run("talk to " + m); run("ask " + m + " about a job"); run("take the job"); assert.ok(G.job && G.job.room === SB, "hired"); return m; };
const condo = () => { G.room = "pratumnak_soi5"; run("rent a condo"); run("rent a condo"); assert.equal(G.hotel, "condo"); };

beforeEach(() => { newGame(); });

test("SEVERE (Willem): where a man rents a flat is answerable — the narrator, a regular, the house, Tan; a bare 'condo' asked of a regular is the hill, not his stool", () => {
  resident(); G.room = "queen_vic"; assert.match(t("where can i live cheaper"), /Pratumnak Soi 5.*RENT A CONDO/);
  assert.match(t("how much is a condo"), /฿9,000 a month/); assert.match(t("ask terry about condo"), /Pratumnak/); assert.match(t("ask terry about a flat"), /Pratumnak/);
  G.room = "soi6_street"; run("talk to tan"); assert.match(t("ask tan about condo"), /Pratumnak Soi 5 — the top of the soi/);
  assert.match(t("hint"), /You live here.*RENT A CONDO/); assert.match(t("help"), /Living here:.*RENT A CONDO/);
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1"); G.nightTurn = 30; assert.match(t("where can i rent a condo"), /A holiday has a hotel/);
});

test("SEVERE (Renata): 'my job', 'my loan', 'my flat' are the PLAYER's — answered from his state by every mouth, Tan in his own words", () => {
  resident(); G.room = "soi6_street"; run("talk to tan");
  assert.match(t("ask tan about my job"), /You have none|No job/); assert.match(t("ask tan about my loan"), /owe nobody|No loan/);
  assert.match(t("ask tan about my flat"), /Still Sabai Palms|A guest/);
  hire(); G.room = "soi6_street"; assert.match(t("ask tan about my job"), /Sweet Tamarind/);
  G.loan = { owed: 12000, dueDay: G.day + 2, prin: 10000 }; assert.match(t("ask tan about my loan"), /฿12,000, 2 days/); G.loan = null;
  condo(); G.room = "soi6_street"; assert.match(t("ask tan about my flat"), /Pratumnak|condo/);
  G.room = "queen_vic"; assert.match(t("ask terry about my job"), /Sweet Tamarind/); assert.match(t("ask terry about my flat"), /Pratumnak/);
});

test("SEVERE (Renata, Willem): the manager is the manager at his bar — the floor's hello, no nurse, last call is his, the close is his, the envelope waits at the bar and MONEY says so, a quit is noticed", () => {
  resident(); const m = hire(); run("work"); const g = _staffAt(SB).find(i => NPC_ROLES[i] === "hostess");
  assert.match(t("talk to " + g), /Boss|manager|Khun manager/i); assert.match(t("is my shift done"), /4 nights a week at Sweet Tamarind.*more turns on the rail/);
  assert.match(t("when do i get paid"), /payday.*envelope at the bar/);
  G.nightTurn = 76; G.soc.lastCall = {}; out = []; _closingTick(); assert.match(said(), /yours to call, boss/); assert.doesNotMatch(said(), /BARFINE/);
  G.nightTurn = 30; out = []; for (let i = 0; i < 25; i++) run("wait 1"); assert.doesNotMatch(said(), /wants a drink bought|Lonely\? Buy lady drink/, "no nurse on the man standing the rail");
  G.nightTurn = 81; out = []; _closingTick(); assert.match(said(), /you are the one who shoos|pulls the shutter down yourself/);
  G.job.stood = 9; G.day = G.payDay + 30; G.room = _hotelRoomId(); G.nightTurn = 30; const s = sleep(); assert.match(s, /envelope — ฿.*is at the bar/); assert.ok(G.envelopeDue);
  assert.match(t("money"), /An envelope of ฿.*waiting at Sweet Tamarind/);
  G.room = SB; G.nightTurn = 30; const m0 = G.money; out = []; run("talk to " + m); assert.match(said(), /envelope/); assert.ok(G.money > m0); assert.equal(G.envelopeDue, null);
  run("quit job"); assert.ok(G.jobQuit); G.soc.quitSaid = {}; assert.match(t("talk to " + g), /You quit|Customer again|no more boss|Mama stand it now|The rail is mine again|Now I stand it/);
  assert.match(t("ask " + g + " about my job"), /quit|Customer again|no more boss|Bert stand it now|Sweet Tamarind|none/);
});

test("SEVERE (Cormac): the condo is a home when a woman is in it — the ride says Pratumnak, the close is the balcony over the bay, COOK FOR HER feeds her, and she remembers the flat", () => {
  resident(); condo(); const her = "lek"; G.soc.drinks.lek = 8; G.talked.lek = [0]; G.room = NPCS.lek.room; G.nightTurn = 60;
  G.party = { ids: ["lek"], stops: 0, spent: 0, seen: [] }; out = []; _partyHome("lek"); assert.equal(G.room, "condo_room");
  assert.doesNotMatch(said(), /hotel's name/); assert.match(said(), /Pratumnak Soi 5|the few doors|taxi in the downpour|songthaew|home/i);
  assert.match(t("cook for lek"), /Two plates|for two|plates on the floor/); assert.equal((G.homeSeen.lek || {}).cooked, G.day);
  out = []; run("sleep"); run("sleep"); assert.doesNotMatch(said(), /watching the soi you just left|street still loud under the window|soi's music coming up through the floor|neon leaks through the curtains/);
  assert.ok(G.homeSeen.lek && G.homeSeen.lek.nights >= 1, "she woke in the flat: " + JSON.stringify(G.homeSeen));
  G.room = NPCS.lek.room; G.nightTurn = 30; run("talk to lek"); assert.match(t("ask lek about my flat"), /Ninth floor|balcony|not a hotel|rice was wrong|the flat|kitchen|lift|the view|the bed|quiet|cook/i);
  G.room = "queen_vic"; assert.match(t("ask terry about my flat"), /balcony|cooking|Pratumnak/i);
  assert.match(t("examine fridge") + (G.room = "condo_room", t("examine fridge")), /eggs|rice|your name on nothing/i); assert.doesNotMatch(said(), /housekeeping/);
  G.battery = 40; assert.match(t("charge phone"), /Your own socket/); assert.equal(G.battery, 100);
  assert.match(t("go north"), /the lift, or nine flights/);
});

test("the month's book: the deposit held is not spending, the first month is the room, the payday's rent is the new month's spend, the forfeit is named", () => {
  resident(); G.room = "hotel_room"; sleep(); condo();
  assert.ok(G.month.rent >= 9000, "the first month is the room: " + G.month.rent); assert.equal(G.monthAdj, 18000);
  G.room = "condo_room"; sleep(); assert.ok(G.month.spent < 12000 && G.month.spent >= 9000, "the deposit is not on the month: " + JSON.stringify(G.month));
  G.day = G.payDay + 30; sleep(); assert.ok(G.month.rent >= 11000 && G.month.spent >= 11000, "the payday's rent is on both sides: " + JSON.stringify(G.month));
  out = []; run("move out"); run("move out"); assert.equal(G.hotel, "sabai"); G.room = _hotelRoomId(); const s = sleep(); assert.match(s, /deposit kept by the office/);
});

test("Willem's own sentences: 'ok i take the job', 'number now', 'what's to eat', 'let's go to my place', 'is there a pool', 'retired, a pension' in the taxi", () => {
  resident(); G.room = SB; for (const id of _staffAt(SB)) if (NPC_ROLES[id] === "hostess") { G.soc.drinks[id] = 8; G.talked[id] = [0]; } const m = _staffAt(SB).find(i => NPC_ROLES[i] === "mamasan") || _tillKeeper(SB);
  run("talk to " + m); run("ask " + m + " about a job"); t("ok i take the job"); assert.ok(G.job, "the job was taken"); run("quit job");
  const g = _staffAt(SB).find(i => NPC_ROLES[i] === "hostess"); run("talk to " + g); G.soc.drinks[g] = 4; assert.doesNotMatch(t("number now?"), /not here to ask|didn't parse/);
  G.room = "queen_vic"; assert.doesNotMatch(t("what's to eat"), /The soi blinks|didn't parse/);
  G.room = SB; run("talk to " + g); assert.match(t("let's go to my hotel"), /SHORT TIME|LONG TIME|barfine|fine|not tonight|mama|upstairs|lady drink first|we go up|the stairs are open|One drink/i);
  G.hotel = "areca"; assert.match(t("is there a pool"), /SWIM/);
  newGame(); startSoi6Mode(); run("retired. ferry engineer, a pension"); assert.equal(G.player.origin, "pension");
});

test("the straight-home night is not 'every bar you go'; a different night is a different witness telling; Candy's lady drink tells the story", () => {
  resident(); G.partyLog = { lek: { day: G.day - 1, rooms: [], danced: false } }; G.wentWith = { lek: { day: G.day - 1, kind: "out" } }; G.room = NPCS.lek.room; G.nightTurn = 30; G.soc.drinks.lek = 8; G.talked.lek = [0];
  out = []; _wentWithHello("lek"); const a = said() || t("talk to lek"); assert.match(a, /straight to yours|no bar|No bar|your place and the fan/i);
  newGame(); G.player = { origin: "monger", personality: "straight", orientation: "straight", said: {}, lang: "en" }; G.stage = "act1"; G.day = 2; G.room = "candy_bar"; G.nightTurn = 30; G.money = 2000;
  out = []; run("buy candy a drink"); assert.ok(_flag("knowMot"), "the drink sets the flag"); assert.match(said(), /Mot|LK Metro|Three a.m/, "and tells the story, not a greeting");
});
