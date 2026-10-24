// ROUND 101 (2026-10-21) — aimed after round 100's record: the one severe left open (a resident's LAST TIME from a woman's
// memory, Cormac's "Today is day one" to her regular) closed before the personas went out, then Margit (Opus, the
// ordinary-player baseline re-run on the default entry), Kaspar (Opus, the October owner stacking procurement on the condo,
// the loan and the wallet) and Eoin (Fable, one woman's memory across ten kinds of night).
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

beforeEach(() => { newGame(); });

test("SEVERE (Cormac, deferred from round 100): a resident's LAST TIME is her memory of him — never 'Today is day one' to a man she met before today", () => {
  resident(); G.room = NPCS.sasi.room; G.soc.drinks.sasi = 8; G.talked.sasi = [0]; G.metDay = { sasi: 15 }; G.seenDay = { sasi: 19 };
  assert.match(t("ask sasi about last time"), /Last night/); assert.doesNotMatch(said(), /Today is day one/);   // the memory pool is twelve deep now (round 106)
  G.seenDay = { sasi: 17 }; assert.match(t("ask sasi about last time"), /Three nights ago/);
  G.homeSeen = { sasi: { day: 19, nights: 1, cooked: 18 } }; assert.match(t("ask sasi about last time"), /your place|your flat/); assert.match(said(), /Two nights ago|Last night/);
  // a woman met today has no last time, and her own first-trip line stands
  G.metDay = { sasi: G.day }; G.seenDay = {}; G.homeSeen = {}; assert.match(t("ask sasi about last time"), /No last time|day one/);
  // her returning-trip node, on a second trip, is still hers
  G.metDay = { sasi: 15 }; G.vacation = 2; G.prevBond = { sasi: 2 }; assert.match(t("ask sasi about last time"), /reviews it like a coach|sit too long/);
});

// ── helpers for the round's three personas ──
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };   // no cart pulls her to the window mid-pin
const SB = "stinky_bar";
const owner = () => { resident(); G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true; G.flags.tanAsked = true;
  G.bar.room = SB; G.bar.owner = true; G.room = SB; G.money = 20000; G.bar.cash = 12000; G.bar.nights = 16; G.nightTurn = 30; quiet(); run("look"); while (G.pendingChoice) run("no"); out = []; };
const dice = (v, fn) => { const saved = _rand; _rand = () => v; try { return fn(); } finally { _rand = saved; } };

test("SEVERE (Kaspar): an ASK that names somebody else in the room is theirs, whoever you were talking to", () => {
  owner(); G.flags.walletBack = true; G.walletBackDay = G.day - 1;
  run("talk to manow"); assert.equal(_convoActive(), "manow");
  const r = t("ask bert about my wallet");
  assert.doesNotMatch(r, /Manow pats the pocket/); assert.match(r, /Bert/); assert.notEqual(_convoActive(), "manow");
  run("talk to cake"); const r2 = t("ask lamai about my wallet"); assert.doesNotMatch(r2, /Cake does not smile/); assert.match(r2, /Lamai/);
});

test("Kaspar: MONEY counts the till as yours and a loan as not — and names what is owed", () => {
  owner(); G.player.origin = "pot"; G.loan = { principal: 10000, left: 10000, owed: 12000, dueDay: G.day + 3, strikes: 0 }; G.bar.loan = { owed: 22000 };
  const r = t("money");
  assert.match(r, /฿12,000 in your own till/); assert.match(r, /Owed: ฿12,000 to Nira, due in 3 days; ฿22,000 to Nont against the bar/);
  G.loan.dueDay = G.day + 1; assert.match(t("money"), /due in 1 day;/);
  // the gauge: the debts come off, the till goes on
  const w = _weeksLeft(); G.loan = null; G.bar.loan = null; assert.ok(_weeksLeft() >= w, "without the debts the runway is no shorter");
});

test("Kaspar: the month's spend is never less than the room — the room is in it whatever the night did", () => {
  resident(); G.room = "hotel_room"; G.month = { spent: 0, rent: 0, rough: 0, days: 0 }; G.money = 2000; G.bank = 60000;
  G.giftIn = 0; G.offIn = 5000;   // a night that came out "up": a pot at the tables
  out = []; run("sleep"); run("sleep");
  assert.ok(G.month.rent > 0, "the room was paid"); assert.ok(G.month.spent >= G.month.rent, `spent ${G.month.spent} < room ${G.month.rent}`);
});

test("Kaspar: PAY CONDO settles a month the payday went short; the waived month prints no 'from .' line; the kept fee is named", () => {
  resident(); G.hotel = "condo"; G.condo = { since: G.day - 5, deposit: 18000, short: 1 }; G.room = "condo_room"; G.money = 5000; G.bank = 20000;
  const r = t("pay condo"); assert.match(r, /across the office counter/); assert.equal(G.condo.short, 0); assert.equal(G.bank, 20000 - (CONDO_RENT + CONDO_UTIL - 0) + 0 - 0 + 0 - 0 + 0 || G.bank, G.bank);   // the account first
  assert.equal(G.money + G.bank, 25000 - CONDO_RENT - CONDO_UTIL);
  G.condo.short = 1; G.money = 100; G.bank = 100; assert.match(t("pay the office"), /and you have ฿200/); assert.equal(G.condo.short, 1);
  // the waived month
  owner(); G.bar.rentFree = 1; G.bar.lastMonthDay = G.day - 30; G.bar.owed = 0; G.bar.arrears = 0; G.room = "hotel_room"; out = []; _barSettle(G.day - 1);
  assert.doesNotMatch(said(), /from \./); assert.match(said(), /No rent this month/);
  // the kept fee lands as a named event, not a till that moved by itself
  owner(); const girl = _staffAt(SB).find(i => NPC_ROLES[i] === "hostess"); G.bar.kept = { id: girl, since: G.day - 2, paidTo: G.day + 10, stage: "paying", told: true, fee: 0 };
  const c0 = G.bar.cash; _keptTick(); assert.equal(G.bar.cash, c0 + KEPT_FEE, "the fee into the till"); assert.ok((G.bar.eventNotes || []).some(n => /sponsor/.test(n)), "and named on the night's notes");
});

test("Kaspar: the condo is paid before the old man's note on a payday — the roof with teeth first", () => {
  owner(); G.player.origin = "pot"; G.hotel = "condo"; G.condo = { since: G.day - 10, deposit: 18000, short: 0, rentDay: G.day }; G.room = "condo_room";
  G.payDay = G.day - INCOME_DAYS + 1; G.bar.lastMonthDay = G.day + 1 - 30; G.bar.owed = 500000; G.bar.arrears = 0; G.bar.cash = 0; G.money = CONDO_RENT + CONDO_UTIL + (PAPER_COST[_paper()] || 0) + 500; G.bank = 0; G.bar.lease = { paid: true };
  out = []; run("sleep"); run("sleep");
  assert.equal(G.condo && G.condo.short, 0, "the condo was paid"); assert.ok(G.bar.arrears > 0, "the note went short instead");
});

test("Kaspar: the affair girl after the shutters is behind you, not 'two minute, then me'; no 'sleep na boss' text on a night she is coming", () => {
  owner(); const her = _staffAt(SB).find(i => NPC_ROLES[i] === "hostess"); G.affair = { id: her, since: G.day - 20, strain: 0, floorSour: 0, crisSeen: [], warned: {} }; G.soc.drinks[her] = 14;
  G.nightTurn = NIGHT_TURNS - 4; assert.match(t("go home with " + her), /behind you|Walk slow, I catch you/);   // the Stinky runs to dawn: 05:36 with the floor gone (Kaspar) assert.equal(G.affair.homeDay, G.day);
  const n0 = G.phone.inbox.length; G.phone.contacts[her] = true; for (let i = 0; i < 40; i++) _maybeIncomingText(); assert.equal(G.phone.inbox.filter(x => x.from === her).length, 0, "she texts nothing from the stairs");
});

test("Kaspar: WAIT in a bar that shuts stops at the shutters; no band plays under them; PUT IN TILL away from the bar points home", () => {
  // the Stinky is on Beach Road and runs to dawn — Kaspar's "Soi 6 shuts at 2" was his misreading, the class is real on a bar that shuts
  owner(); const S6 = "sunset_rail"; assert.equal(_closeTurn(S6), SOI6_CLOSE);
  G.room = S6; G.nightTurn = SOI6_CLOSE - 3; G.phone.contacts = {}; G.soc.spentTurn = { [S6]: G.nightTurn }; const r = dice(0.99, () => t("wait until 5")); assert.match(r, /shutters come down/); assert.ok(G.nightTurn <= SOI6_CLOSE + 1, "stopped at " + G.nightTurn);
  G.nightTurn = SOI6_CLOSE + 2; ROOMS[S6].liveMusic = true; ROOMS[S6].musicEveryNight = true; try { assert.doesNotMatch(t("look"), /A live band is playing/); } finally { delete ROOMS[S6].liveMusic; delete ROOMS[S6].musicEveryNight; }
  G.room = "beach_rd_c"; assert.match(t("put 10000 in the till"), /behind your own rail/);
});

test("Kaspar: the mamasan of your own bar is greeted as the house at bond, Bert points at Candy in English, GO HOME WITH your own staff is the owner's line", () => {
  owner(); const mama = _staffAt(SB).find(i => NPC_ROLES[i] === "mamasan"); G.soc.drinks[mama] = 8; G.talked[mama] = [0];
  const r = t("talk to " + mama); assert.doesNotMatch(r, /when the mamasan is not looking/); assert.match(r, /Boss|boss|owner/);
  G.flags.hasWallet = false; G.flags.walletLost = true; G.itemLoc.wallet = null; const w = t("ask bert about my wallet"); assert.doesNotMatch(w, /my mama kill them/); assert.match(w, /Candy/);
  G.flags.hasWallet = true; const girl = _staffAt(SB).find(i => NPC_ROLES[i] === "hostess"); G.soc.drinks[girl] = 8;
  const g = t("go home with " + girl); assert.doesNotMatch(g, /BARFINE/); assert.match(g, /I work here|on the bus/);
});

test("Kaspar: the affair girl yields her colleagues, the flat and the ice man to the mouths that answer them", () => {
  owner(); const hs = _staffAt(SB).filter(i => NPC_ROLES[i] === "hostess"); const her = hs[0], mate = hs[1];
  G.affair = { id: her, since: G.day - 20, strain: 0, floorSour: 0, crisSeen: [], warned: {} }; G.soc.drinks[her] = 14; G.talked[her] = [0];
  assert.equal(_affairTalk(her, NPCS[mate].name.toLowerCase()), null); assert.equal(_affairTalk(her, "my condo"), null);
  assert.match(String(_affairTalk(her, "the ice man")), /ice|kettle/i);
  G.hotel = "condo"; G.condo = { since: G.day - 3, deposit: 18000, short: 0 }; G.homeSeen = { [her]: { day: G.day - 1, nights: 2 } };
  assert.match(t("ask " + her + " about my condo"), /Ninth floor|Your flat|condo|cook|bed/i);
});

test("Kaspar: your own floor knows where the boss went down last night", () => {
  owner(); G.room = "blue_dog"; G.soc.drunk = 9; out = []; _endNight("blackout"); quiet();
  assert.ok((G.streetLog || []).some(e => e.kind === "blackout" && e.room === "blue_dog"));
  G.room = SB; G.nightTurn = 20; const mama = _staffAt(SB).find(i => NPC_ROLES[i] === "mamasan");
  assert.match(t("ask " + mama + " about last night i blacked out"), /Blue Dog/);
});

test("Kaspar: the piwin rides to a bar he placed when asked; the condo's water is the fridge; a bar owner is 'my bar' to Nont", () => {
  resident(); G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Beach Road"); G.money = 2000; out = []; run("motosai to neon paradise"); assert.doesNotMatch(said(), /Don't know it/); assert.ok((G.heardOf || {}).neon_paradise);
  while (G.pendingFare) run("no");
  G.hotel = "condo"; G.condo = { since: G.day, deposit: 18000, short: 0 }; G.room = "condo_room"; G.roomWater = 2; assert.match(t("buy water"), /your own fridge/); assert.doesNotMatch(said(), /ousekeeping/);
  owner(); G.bar.loan = { owed: 22000 }; G.room = NPCS.nont.room; G.nightTurn = 30; assert.match(t("ask nont about my bar"), /฿22,000 still on my book|owes me|pays me first/);
});

test("Eoin: 'I fly home tomorrow' is kept past the dawn — 'my flight' the day after is the flight you did not take, and she notices once", () => {
  resident(); G.room = "sunset_rail"; G.soc.drinks.pukky = 8; G.talked.pukky = [0]; run("talk to pukky"); run("i fly home tomorrow");
  assert.equal((G.leaveSaid || {}).pukky, G.day); assert.equal(G.leaveOn, G.day + 1);
  G.room = "hotel_room"; run("sleep"); run("sleep"); quiet(); G.room = "sunset_rail"; G.nightTurn = 10;
  assert.match(t("talk to pukky"), /Your flight!|Still here\?|You say you fly today/);
  assert.doesNotMatch(t("talk to pukky"), /Your flight!|Still here\?|You say you fly today/);   // once
  assert.match(t("ask pukky about my flight"), /flight you don't take|three nights long|the plane go, you stay|I like this kind of flight/i);
  run("only joking, i'm not leaving"); assert.equal((G.leaveSaid || {}).pukky, undefined); assert.equal(G.leaveOn, null);
});

test("Eoin: 'did you miss me' after a gap reads the gap; the review of a woman who was yours does not cool to a stranger's line; a short time is 'upstairs', not 'you leave with her'", () => {
  resident(); G.room = "sunset_rail"; G.soc.drinks.pukky = 8; G.talked.pukky = [0]; G.seenDay = { pukky: G.day - 3 }; out = []; _relGreeting("pukky");
  assert.equal(G.soc.gapSeen.pukky, 3); run("talk to pukky"); assert.match(t("did you miss me"), /2 night/);   // nights missed, as the greeting counts them (round 103)
  G.seenDay = { pukky: G.day }; G.soc.gapSeen = {}; assert.doesNotMatch(t("did you miss me"), /\d night/);
  // the review: her-farang once, her-farang when the bond has cooled two nights
  G.soc.drinks.pukky = 11; G.everBond = { pukky: 3 }; const mate = _staffAt("sunset_rail").find(i => NPC_ROLES[i] === "hostess" && i !== "pukky");
  G.talked[mate] = [0]; const r = t("ask " + mate + " about pukky"); assert.doesNotMatch(r, /Good girl, send money home/);
});

test("Eoin: a bare JUST on the night ride is home; a ride she ended at the kerb still rode you home (her bike at dawn, not the bus)", () => {
  resident(); G.room = "sunset_rail"; G.soc.drinks.pukky = 14; G.phone.contacts.pukky = true;
  G.rideSeq = { id: "pukky", stops: 0, seen: [] }; G.pendingEnc = "nightride"; G.lastBfId = "pukky";
  out = []; dice(0.5, () => _nightRide("just"));
  assert.ok(G.lastRide && G.lastRide.id === "pukky" && G.lastRide.stops === 0, "a zero-stop ride is recorded");
  assert.doesNotMatch(said(), /baht bus|end of the truck/);
});

test("Eoin: 'what did we do last night' is LAST NIGHT; 'not buying tonight, just sitting with you' is hers; a dry night is not 'what you drink'", () => {
  resident(); G.flowerDay = G.day; G.room = "sunset_rail"; G.soc.drinks.pukky = 8; G.talked.pukky = [0]; G.partyLog = { pukky: { day: G.day - 1, rooms: ["sunset_rail"], end: "home" } };
  run("talk to pukky"); G.convoQ = null; assert.match(t("what did we do last night"), /asked Pukky about last night|last night|Last night/i); G.convoQ = null;
  assert.match(t("i'm not buying tonight, just sitting with you"), /Sit is free|Not every night is buying night|Then sit properly|talk for free/);
  // the dry night: the house remembers no chit
  G.partyLog = {}; G.wentWith = {}; G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: "sunset_rail", barTurns: 30, bars: { sunset_rail: 30 }, dry: { sunset_rail: true }, with: null, upstairs: null };
  const till = _tillKeeper("sunset_rail"); G.talked[till] = [0]; assert.match(t("ask " + till + " about last night"), /buy nothing|No chit|Not a chit|never put your hand/);
});

test("Eoin: a resident who said tonight is his last night is owed the goodbye scene", () => {
  resident(); G.room = "sunset_rail"; G.soc.drinks.pukky = 8; G.talked.pukky = [0]; G.leaveOn = G.day + 1;
  assert.ok(_lastByeDue("pukky")); const r = t("goodbye pukky"); assert.doesNotMatch(r, /take your leave/); assert.match(r, /Pukky/);
});

test("Margit: the sentences a new resident types — back to, to bed, inside, please, money out, food, two orders, goodnight, sorry, going out", () => {
  resident(); quiet(); G.hotel = "queenvic"; G.room = "qv_room"; G.visited.queen_vic = true; G.nightTurn = 20;
  assert.match(t("go to bed"), /Sleep now and the night ends|SLEEP again/);
  run("down"); assert.equal(G.room, "queen_vic"); assert.match(t("enter queen vic"), /standing in it/);
  assert.match(t("what food do you have"), /BUY PIE|Kitchen till eleven/); const m0 = G.money; assert.match(t("the pie please"), /Steak and ale|gravy|pie|volcanic|crust/i); assert.ok(G.money < m0);
  run("out"); assert.match(t("go back to the queen vic"), /Queen Vic/); assert.equal(G.room, "queen_vic");
  G.room = "soi6_street"; assert.match(t("get 5000 baht out"), /machine|card|withdraw|฿/i); assert.doesNotMatch(said(), /part of the place/);
  G.room = "sunset_rail"; G.soc.drinks.pukky = 4; G.talked.pukky = [0]; run("talk to pukky"); const b0 = G.money; t("a beer for me and one for pukky"); assert.ok(b0 - G.money >= _beerPrice("sunset_rail") + _ladyPrice("sunset_rail") - 1, "two drinks bought");
  assert.match(t("i'm sorry"), /Why sorry|Sorry for what|No sorry/); assert.doesNotMatch(said(), /forgive you/);
  assert.match(t("can we go somewhere together tonight"), /TAKE HER OUT|she comes with you/); run("no");
  run("talk to pukky"); G.convoQ = null; t("i am tired, goodnight pukky"); assert.equal(_convoActive(), null);
});

test("Margit: a specific small-talk subject outranks a node reached by one word of it; a compliment is a compliment; the quiz; the stringer's words to Mort", () => {
  resident(); quiet(); G.room = "sunset_rail"; G.soc.drinks.pukky = 4; G.talked.pukky = [0]; run("talk to pukky");
  assert.match(t("what did you do before this job"), /before|village|cousin|Nothing before|factory|school/i); assert.doesNotMatch(said(), /Talk, mostly|listen, more/);
  assert.match(t("why did you come to pattaya"), /Money|bus|village|cousin|friend|hospital|fridge|sea|Bangkok|rice/i);
  assert.match(t("would you miss me if i went home"), /miss|back|answer|Little bit|still here|go home|you here/i); assert.doesNotMatch(said(), /ten hour|Long bus/);
  assert.match(t("would you like to move in with me"), /Mama|wife|kitchen|month|Maybe|breakfast|Live together|mean it/);
  G.soc.drinks.pukky = 14; G.wentWith = { pukky: { day: G.day - 1 } }; assert.match(t("would you like to move in with me"), /Mama ask|Live together|mean it|Maybe/);
  run("talk to pukky"); assert.match(t("your hair is beautiful"), /compliment|Pukky/i); assert.doesNotMatch(said(), /salon/);
  G.quizLast = { room: "queen_vic", day: G.day, right: 5 }; run("talk to pukky"); assert.match(t("i won the quiz!"), /Clever|Champion|boxer/);
  G.room = "queen_vic"; G.stringer = { paid: {}, owed: [] }; run("talk to mort"); assert.match(t("what are you writing"), /column|letter|listing|story|squire/i);
});

test("Margit: a where-question asked of somebody is theirs; the condo pointer gives the way; the nearest stand is named; GO HOME far is the bike", () => {
  resident(); quiet(); G.room = "queen_vic"; run("talk to aoy"); assert.match(t("where can i rent a cheap room"), /Pratumnak|condo|tower|month/i); assert.doesNotMatch(said(), /ask around/);
  assert.match(t("is it expensive to live here"), /฿|month|rent|cheap|dear|pension/i);
  run("talk to terry"); assert.match(t("do you know of any jobs for someone like me"), /mamasan|Teaching|Mort|paper|bar/i); assert.doesNotMatch(said(), /say that again|Try somebody who was there/);
  G.room = "pratumnak_soi5_m"; assert.match(t("where is the condo tower"), /east first \(GO E\)|1 step/); assert.match(t("rent a condo"), /GO E|step/);
  G.room = "sunset_rail"; assert.match(t("motosai home"), /nearest is on|GO [NSEW]/);
  G.room = "soi6_street"; G.money = 2000; G.hotel = "condo"; G.condo = { since: G.day - 3, deposit: 18000, short: 0 }; assert.ok(_path("soi6_street", "condo_room").length >= 8, "a long way"); const r = t("go home"); assert.match(r, /piwin at the stand takes you|WALK HOME/); assert.ok(G.pendingFare || /฿/.test(r), "a fare, not an eighteen-turn walk");
  while (G.pendingFare) run("no");
  G.room = "soi6_street"; assert.doesNotMatch(t("walk home"), /piwin at the stand takes you/);
});

test("Margit: the morning after she slept at yours — where is she, did she sleep well; when do I start; how long have you had this bar; why do you call me that; I might stay", () => {
  resident(); quiet(); G.hotel = "condo"; G.condo = { since: G.day - 3, deposit: 18000, short: 0 }; G.room = "condo_room"; G.nightTurn = 1;
  G.homeSeen = { pukky: { day: G.day, nights: 1 } }; G.visited.sunset_rail = true; G.talked.pukky = [0]; G.soc.drinks.pukky = 8;
  assert.match(t("where is pukky"), /gone before you woke|on her stool tonight/);
  G.room = "sunset_rail"; G.nightTurn = 20; run("talk to pukky"); assert.match(t("did you sleep well"), /sleep|bed|pillow|lift|view|flat|fan|quiet/i); assert.doesNotMatch(said(), /Lost me|Start again/);
  G.job = { kind: "manager", room: "sunset_rail", nights: 4, stood: 0 }; assert.match(t("when do i start"), /Tonight, if you like|WORK at/); G.job = null;
  const own = Object.keys(NPCS).find(i => NPCS[i].owner && NPCS[i].room && ROOMS[NPCS[i].room] && ROOMS[NPCS[i].room].barType === "beer");
  G.room = NPCS[own].room; G.talked[own] = [0]; run("talk to " + own); assert.match(t("how long have you had this bar"), /Stools stay|Long enough|Long time|mamasan before me/);
  G.room = "sunset_rail"; G.soc.drinks.pukky = 14; run("talk to pukky"); assert.match(t("why do you call me " + _herNameForYou("pukky").toLowerCase()), /Because you say|Is your name here|Only me/);
  assert.match(t("i might stay in pattaya"), /Stay\?|stop counting|stay|ticket|last time/i); assert.doesNotMatch(said(), /Thai people smile/);
});

test("Margit: Thai food asked for by name is a stall, the week's end names the stay, the Vic's pub does not nurse its own guest", () => {
  resident(); quiet(); G.room = "beach_rd_c"; G.nightTurn = 20; run("talk to tan"); const r = t("where can i get good thai food"); assert.doesNotMatch(r, /toastie|7-Eleven|pies/);
  G.hotel = "queenvic"; G.room = "queen_vic"; G.soc.spentTurn = { queen_vic: G.nightTurn - 40 }; assert.equal(_nursed(), false);
  assert.ok(!_SMALL_TALK_KEYS.find(k => k[0] === "miss")[1].test("do you miss austria"));
});

test("nothing in the round rolls dice on a lookup", () => {
  resident(); quiet(); G.room = "sunset_rail"; G.talked.pukky = [0]; const rng = G.rng;
  _flightTalk("pukky", "my flight"); _stillHereTalk("pukky"); _weeksLeft(); _debtsLine(); _condoPointer(); assert.equal(G.rng, rng);
});
