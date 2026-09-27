// Round 54 (2026-09-27) — the first round aimed by the coverage map at its own
// dark cells: Rolf, the Reeperbahn publican, on a SEEDED owner save with a girl
// at her-farang tier (lens: owner-with-a-girl, classes I and F at the bar you
// own); Tomasz, who reads every line twice, before and after the state it
// describes moves (lens: before-and-after, class F); Joan, the returning tester
// who re-ran round 53's fixed list (lens: returning-tester, class S/regression).
// Rolf's severe was the seed's own shape: a `syn` without its books threw inside
// _tick from 21:00 and silently stopped the presence count, the affair's door
// and the floor for the rest of every night.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
const quiet = () => { for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.pendingEnc = null; };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  quiet(); G.peddlerNight = 2;
});
// the owner fixture, the way the game builds it (barchain.test's `running`)
function owner() {
  G.stage = "vacation"; G.day = 8; out = []; _goExpat(); quiet();
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.room = "stinky_bar"; G.money = BAR_DEPOSIT; _barDeposit(); G.bar.lease.paid = true; G.bar.lease.how = "cash"; _setFlag("barOpen");
  G.syn = { done: {}, asked: {}, friction: 0 }; out = [];
}

// ── Rolf: the seed's shape, and everything it hid ──────────────────────────
test("a save whose syn carries the meter but not the books does not throw inside _tick", () => {
  owner(); G.syn = { friction: 0 };   // Rolf's seed, exactly
  G.room = "stinky_bar"; G.nightTurn = 30; _setFlag("tanAsked");
  assert.doesNotThrow(() => { _synDue(); _synState(); });
  assert.deepEqual(Object.keys(G.syn).sort(), ["asked", "done", "friction"]);
  // and newGame carries the field, so deserializeGame's one-level merge backfills it
  assert.ok(newGame().syn && newGame().syn.done, "syn is a skeleton field now, not a lazy init");
});

test("a shift stood to the small hours settles as stood, with the tick running every turn past 21:00", () => {
  owner(); G.syn = { friction: 0 };
  G.room = "stinky_bar"; G.nightTurn = 12; _setFlag("tanAsked");
  const saved = _rand; try {
    _rand = () => 0.99;   // no shift call, no job, no drift — just the clock
    out = []; doCommand("work");
    for (let i = 0; i < 60 && G.nightTurn < 60; i++) { out = []; doCommand("wait"); if (G.pendingChoice) doCommand("no"); }   // a shift call is dealt by hash, not dice
    assert.ok(G.bar.stoodTurns >= WORK_MIN_STOOD, `stood ${G.bar.stoodTurns} turns by ${_clockStr()} — the counter must not freeze at 21:00`);
  } finally { _rand = saved; }
});

test("BOOKS counts nights STOOD, not nights declared", () => {
  owner();
  G.day++; G.room = "stinky_bar"; out = []; _doWork(); G.bar.stoodTurns = 3; _barSettle();   // declared, walked out
  G.day++; G.room = "stinky_bar"; out = []; _doWork(); G.bar.stoodTurns = WORK_MIN_STOOD; _barSettle();
  assert.equal(G.bar.declared, 2); assert.equal(G.bar.worked, 1); assert.equal(G.bar.lapses, 1);
  out = []; _doBooks();
  assert.match(text(), /Nights stood: 1 of 2/);
});

test("the note stops billing once it is paid, and BOOKS says so", () => {
  owner();
  G.bar.owed = 0; G.bar.arrears = 0; G.bar.cash = 60000; G.bar.lastMonthDay = G.day - 30;
  const m = _barMonthly();
  assert.ok(m.noteDone, "a paid-off note is a paid-off note");
  assert.equal(m.paid, 0);
  assert.equal(G.bar.cash, 60000 - _barRent(), "rent still bills; nothing goes to Ohio");
  out = []; _doBooks();
  assert.match(text(), /the note is paid/);
  assert.doesNotMatch(text(), /฿\{k\}|\{owed\}/, "no raw token on the page");
});

test("a lease marked paid with no route prints no raw {k} token", () => {
  owner(); G.bar.lease = { paid: true };   // the seed's shape
  out = []; _doBooks();
  assert.doesNotMatch(text(), /\{k\}/);
  assert.match(text(), /Key money: settled/);
});

test("the forty she found lands in the till, and the books agree with the drawer", () => {
  owner();
  const cash0 = G.bar.cash;
  G.bar.eventIn = 0; G.bar.eventNotes = [];
  // the floor line that names the money
  const id = _barStaff().find(x => NPC_ROLES[x] === "cashier");
  assert.ok(id, "the Stinky has a cashier");
  const pool = _FLOOR_CASHIER;
  const idx = pool.findIndex(s => /written off/.test(typeof s === "function" ? s("x") : s));
  assert.ok(idx >= 0, "the pool still carries the ฿40 line");
  G.bar.floorSaid = { [id]: pool.map((_, i) => i).filter(i => i !== idx) };   // only that line left unseen
  G.bar.workedDay = G.day; G.bar.workedLast = true; G.bar.floorN = 0; G.bar.floorTurn = -99; G.room = "stinky_bar";
  out = []; _workFloor();
  assert.match(text(), /written off/);
  assert.equal(G.bar.cash, cash0 + 40, "the note said +฿40 while the drawer stayed put (Rolf, night 13)");
  assert.equal(G.bar.eventIn, 40);
});

test("the tab settled tonight says so tonight; the prose no longer promises payday against a ledger that shows the money in", () => {
  owner(); G.shiftCall = "tab"; G.pendingChoice = "shift"; G.shiftWho = null;
  const saved = _rand; try {
    _rand = () => 0.99;   // > SHIFT_TAB_STIFF: he pays
    out = []; _shiftYes();
    assert.match(text(), /squares it before he goes/);
    assert.doesNotMatch(text(), /settles on (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
    assert.ok((G.bar.eventNotes || []).some(n => /settled/.test(n)));
  } finally { _rand = saved; }
});

test("the shift's tale is told when the small hours arrive, never at 19:00", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 12;
  out = []; _doWork();
  const t = text();
  assert.ok(!_WORK_SEEN.some(s => t.includes(s)), "what the night saw is not narrated before the night");
  assert.ok(!_WORK_MISSED.some(s => t.includes(s)));
  assert.ok(G.bar.tale && !G.bar.tale.told, "the tale is rolled and stashed");
  G.bar.stoodTurns = WORK_MIN_STOOD; G.nightTurn = WORK_TALE_TURN;
  out = []; _workPresenceTick();
  assert.ok(G.bar.tale.told, "told at the rail past the last bus");
  assert.ok(text().includes(G.bar.tale.seen));
});

test("a stood night that ends early tells its tale in the morning; a lapsed night has none", () => {
  owner();
  G.day++; G.room = "stinky_bar"; out = []; _doWork(); const seen = G.bar.tale.seen;
  G.bar.stoodTurns = WORK_MIN_STOOD; out = []; _barSettle();
  assert.match(text(), /The shift, as it went/); assert.ok(text().includes(seen));
  assert.equal(G.bar.tale, null);
  G.day++; G.room = "stinky_bar"; out = []; _doWork(); const seen2 = G.bar.tale.seen;
  G.bar.stoodTurns = 2; out = []; _barSettle();
  assert.ok(!text().includes(seen2), "Bert stood it; you have no tale of it");
  assert.equal(G.bar.tale, null);
});

test("a work event pays when it is told, not when it is rolled", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 12;
  const saved = _rand; try {
    _rand = () => 0.01;   // an event, the first in the table
    out = []; _doWork();
    const evt = WORK_NIGHTS.find(e => e.id === G.bar.tale.evt);
    assert.ok(evt, "an event was rolled");
    if (evt.money) assert.equal(G.bar.eventIn || 0, 0, "the till has not moved yet");
    assert.equal((G.bar.seen || {})[evt.id], undefined, "not seen yet");
    G.bar.stoodTurns = WORK_MIN_STOOD; G.nightTurn = WORK_TALE_TURN; out = []; _workPresenceTick();
    assert.equal(G.bar.seen[evt.id], 1, "seen once it is told");
  } finally { _rand = saved; }
});

test("your own staff text the guv'nor as staff, and never a customer's invite; a woman you sat with tonight does not text that you never come", () => {
  owner(); G.room = "hotel_room";
  const her = _barStaff().find(x => NPC_ROLES[x] === "hostess");
  G.phone.contacts[her] = true; G.soc.drinks[her] = 14;
  G.phone.inbox = []; G.phone.lastText = -999;
  const saved = _rand; try {
    _rand = () => 0.1;
    for (let i = 0; i < 6; i++) { G.turns += 40; _maybeIncomingText(); }
    const mine = G.phone.inbox.filter(m => m.from === her);
    assert.ok(mine.length, "she texts");
    for (const m of mine) assert.doesNotMatch(m.text, /come see me|you no come|other bar|keep you seat/, m.text);
    assert.equal(G.phone.invite, null);
  } finally { _rand = saved; }
  // and a girl elsewhere, sat with tonight
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; quiet();
  G.room = "beach_rd_c"; G.phone.contacts.lek = true; G.soc.drinks.lek = 14; G.soc.drinkCount = { lek: 2 };
  G.phone.inbox = []; G.phone.lastText = -999;
  const saved2 = _rand; try {
    _rand = () => 0.1;   // the invite branch when it is allowed
    for (let i = 0; i < 6; i++) { G.turns += 40; _maybeIncomingText(); }
    for (const m of G.phone.inbox.filter(m => m.from === "lek")) assert.doesNotMatch(m.text, /you no come|when you come see me|keep you seat/, m.text);
  } finally { _rand = saved2; }
});

test("TIME at your own bar does not quote you the barfine rate; the torch is not teased at the guv'nor; dawn there is a lock-up, not a taxi", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 20;
  out = []; _doTime();
  assert.doesNotMatch(text(), /Early doors: barfines/);
  assert.match(text(), /barfine book is shut to you/);
  G.lightOn = true; G.battery = 50; out = []; _lightNotice();
  assert.doesNotMatch(text(), /it's gone|pay me like a star/);
  G.nightTurn = NIGHT_TURNS - 1; G.money = 3000; out = []; _tick();
  assert.ok(_ALLNIGHTER_OWN.some(s => text().includes(s)), "the owner's own dawn");
  assert.ok(!_ALLNIGHTER_LINES.some(s => text().includes(s)));
});

test("the partner answers as the partner, the barman knows whose name is on the fifty-one, and procurement is somebody's department", () => {
  owner(); G.room = _npcRoom("tan"); G.nightTurn = 30;
  for (const t of ["bar", "partner", "stinky pinky"]) {
    out = []; _doTalkBody("tan", t);
    assert.match(text(), /Our bar|The paper is in a drawer/, `tan about ${t}`);
    assert.doesNotMatch(text(), /buy me a coffee|Not yet, na/);
  }
  G.room = "stinky_bar";
  out = []; _doTalkBody("bert", "tan"); assert.match(text(), /Fifty-one on paper/);
  out = []; _doTalkBody("bert", "procurement"); assert.match(text(), /Tan's side of the bar/);
});

test("at the bar you own an unmet staffer's hello on a miss is the guv'nor's, not the customer's", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30; G.talked = {};
  out = []; _doTalkBody("cake", "xyzzy");
  assert.doesNotMatch(text(), /Card or cash|New one/);
  assert.ok(_OWNER_GREET.cashier.some(s => text().includes(typeof s === "function" ? "" : s)) || /Boss|boss/.test(text()), "the owner greeting");
});

test("the anonymous bar-bore never prints beside a named rail; a rose is never pitched for the mamasan; a cart does not park in the rain", () => {
  G.room = "stinky_bar"; G.nightTurn = 30; G.soc.patronBusy.stinky_bar = true;
  const rail = _npcsHere().filter(id => !NPC_ROLES[id] && !NPCS[id].manager && !NPCS[id].filler && !NPCS[id].house);
  assert.ok(rail.length, "the Stinky has named men on the rail");
  out = []; _describeRoom(true);
  assert.doesNotMatch(text(), /red-faced fixture|part of the furniture|lifer|drones on|laughing on cue/);
  // the rose child
  G.room = "lucky_tiger"; const mama = _npcsHere().find(id => NPC_ROLES[id] === "mamasan");
  assert.ok(mama); G.convo = mama; G.soc.drinks[mama] = 3; G.flowerDay = 0;
  const saved = _rand; try { _rand = () => 0.01; out = []; _flowerTick(); assert.equal(G.flowerDay, 0, "no pitch for the mamasan"); } finally { _rand = saved; }
  // the cart
  G.room = "lucky_tiger"; G.rain = 5; G.lastSaleng = -99; G.salengCart = null; G.soc.salengBar = {};
  const saved2 = _rand; try { _rand = () => 0.01; _salengTick(); assert.equal(G.salengCart, null, "no cart in a downpour"); } finally { _rand = saved2; }
});

test("Blue Dog has no walls, and a refused direction says so; TIME's Tuesday is a weeknight", () => {
  G.room = "blue_dog"; out = []; doCommand("e");
  assert.doesNotMatch(text(), /wall with a beer fridge/);
  assert.ok(_NO_EXIT_OPENFRONT.some(s => text().includes(s)));
  assert.ok(!/Busy on a Tuesday/.test(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8")));
});

// ── Tomasz: before and after ─────────────────────────────────────────────
test("CHECKOUT marks the new hotel found; JOURNAL does not say you never found its door", () => {
  G.room = "hotel_room"; G.hotel = "sabai"; G.nightTurn = 2; G.money = 9000;
  out = []; doCommand("checkout"); out = []; doCommand("queen vic");
  assert.equal(G.room, "qv_room");
  assert.ok(G.visited.qv_room, "the room you stand in is visited");
  out = []; doCommand("journal");
  assert.doesNotMatch(text(), /Queen Vic.*never found the door/);
});

test("no drizzle vignette in a hotel room; the condom line does not credit drunk-you to a sober man", () => {
  G.room = "hotel_room"; G.lastDrizzle = -99; out = []; _sayDrizzle(); assert.equal(out.length, 0);
  G.room = "beach_rd_c"; out = []; _sayDrizzle(); // a street may (no bake → may print nothing; must not throw)
  G.condoms = 3; G.soc.drunk = 0; G.player.teetotal = true;
  for (let i = 0; i < 12; i++) { out = []; _stdBarfineRoll(); assert.doesNotMatch(text(), /drunk-you/); G.condoms = 3; }
});

test("ordering a beer un-says the teetotal declaration, out loud", () => {
  G.room = "lucky_tiger"; G.nightTurn = 30; G.player.teetotal = true;
  out = []; doCommand("buy beer");
  assert.equal(G.player.teetotal, false);
  assert.ok(_TEETOTAL_BROKEN.some(s => text().includes(s)));
  out = []; doCommand("diagnose"); assert.doesNotMatch(text(), /as ordered/);
});

test("Lek's late answer is tiered: her farang is taken, a stranger is 'not friend yet'", () => {
  G.room = "lucky_tiger"; G.nightTurn = 30;
  G.soc.drinks.lek = 0; out = []; _doTalkBody("lek", "late"); assert.match(text(), /not friend yet/);
  G.talked = {}; G.soc.drinks.lek = 14; out = []; _doTalkBody("lek", "late");
  assert.match(text(), /You, I take|You I take/); assert.doesNotMatch(text(), /not friend yet/);
});

test("Nok knows the wallet is back; the water counts as a drink at the socket; the rose without its seller is voiced", () => {
  _setFlag("hasWallet"); G.nightTurn = 30; G.room = _npcWhere("nok");   // the presence-aware room, not her data room
  out = []; _doTalkBody("nok", "wallet"); assert.match(text(), /have it back/); assert.doesNotMatch(text(), /Wallet gone\?/);
  G.room = "stinky_bar"; G.money = 3000; G.battery = 40; G.itemLoc.charger = "inv";
  out = []; doCommand("buy water"); out = []; doCommand("charge phone");
  assert.doesNotMatch(text(), /Buy a drink, then ask/);
  G.room = "lucky_tiger"; out = []; doCommand("buy rose for lek");
  assert.doesNotMatch(text(), /^Not for sale here\.$/m); assert.match(text(), /rose|flower/);
});

test("TAO RAI at an eatery quotes the board, not the bar stool", () => {
  G.room = "cheap_charlies_jt"; G.nightTurn = 30;
  out = []; doCommand("tao rai");
  assert.match(text(), /฿60/); assert.match(text(), /BUY FOOD/);
  assert.doesNotMatch(text(), /haven't been shown the price|the seat, not the bottle/);
});

test("EXAMINE ME at ฿0 is not solvent; PET CATS on the wrong sand points along the beach; a piwin knows the hotels", () => {
  G.money = 0; G.room = "beach_rd_c";
  for (let i = 0; i < 8; i++) { out = []; doCommand("examine me"); assert.doesNotMatch(text(), /solvent/); }
  G.room = "jomtien_beach_m"; out = []; doCommand("pet cats");
  assert.match(text(), /further along the sand/); assert.doesNotMatch(text(), /bar cats/);
  out = []; _piwinAbout("hotel"); assert.match(text(), /Sabai Palms|Queen Vic|Areca|Metropole/);
});

// ── Joan: the returning tester ───────────────────────────────────────────
test("WATCH SOI hands a declared teetotaller a soda, not a pint", () => {
  _setFlag("act1Done"); G.hotel = "queenvic"; G.room = "qv_room"; G.player.teetotal = true; G.nightTurn = 30;
  for (let i = 0; i < 6; i++) { G.blueDogDay = 0; out = []; _doWatchSoi(); assert.doesNotMatch(text(), /nurse the pint/); }
});

test("the hour-blind descs: no sunset asserted as NOW at the foot of Soi 6, the Stinky, the Blue Dog or Jomtien sand", () => {
  for (const r of ["beach_rd_s", "stinky_bar", "blue_dog", "jomtien_beach"]) {
    const d = String(ROOMS[r].desc);
    assert.doesNotMatch(d, /last smear of sunset|the sunset out over the water and the sand/, r);
  }
});
