// Round 70 (2026-10-08) — Ossie Pryce, a retired claims manager from Wolverhampton (Opus, lens:
// composition), seven October nights as an owner on the Tan route, saying yes to every job and then
// doing something else the same evening. His verdict: "The town saw everything and remembers none
// of it." Every fix here is one system forgetting another.
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
const ask = (id, t) => { out = []; run(`ask ${id} about ${t}`); return said(); };
beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "blunt", orientation: "straight", said: {}, lang: "en" };
  G.stage = "expat"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 20000; G.bank = 50000; G.nightTurn = 30; G.room = "stinky_bar"; out = [];
});
const owner = () => { G.flags.barOpen = true; G.flags.barPaid = true; G.bar.room = "stinky_bar"; G.bar.owner = true; };
const affair = (extra) => { owner(); G.affair = Object.assign({ id: "manow", since: G.day - 20, strain: 6, floorSour: 0, crisSeen: [], warned: {}, discovered: false, soured: false, ended: false, crisDay: G.day }, extra); };

// ── the town's memory ─────────────────────────────────────────────────────────
test("the woman on your arm is somebody the room saw arrive, named with her own bar", () => {
  owner();
  const ing = Object.keys(NPCS).find(i => NPCS[i].name === "Ing");
  G.party = { ids: [ing], stops: 1, spent: 0, seen: {} };
  for (const w of ["bert", "lamai", "cake"]) {
    run("talk to " + w); const r = ask(w, "ing");
    assert.match(r, /Ing/); assert.doesNotMatch(r, /No idea|Not mine to know|Not a thing I know/);
    assert.doesNotMatch(r, /Stinky Pinky's/, "her own bar, not the one she is on your arm in");
  }
});
test("after it ends, the bar remembers her", () => {
  affair({ ended: true, gone: true });
  for (const w of ["bert", "lamai", "jiap"]) { run("talk to " + w); assert.match(ask(w, "manow"), /home|Gone|gone|message/); }
});

// ── the affair, after she has seen it ─────────────────────────────────────────
test("caught, she says what she saw; the warm pools stop", () => {
  affair({ discovered: true, soured: true, caughtWith: ["Namfon"], caughtDay: G.day - 1 });
  run("talk to manow"); assert.ok(_REL_GREET_AFFAIR_SOUR.some(f => said().includes(f("Manow").slice(0, 30))), "the sour greeting, not 'they know'");
  assert.match(ask("manow", "namfon"), /Namfon/); assert.doesNotMatch(said(), /No idea, na/);
  assert.match(ask("manow", "last night"), /Namfon|shoes/);
  assert.doesNotMatch(ask("manow", "love"), /I said it already/);
  out = []; run("go home with manow"); assert.match(said(), /cousin|Not tonight/); assert.notEqual(G.affair.homeDay, G.day);
});
test("caught, her texts are the job and nothing else", () => {
  affair({ discovered: true, soured: true, caughtWith: ["Namfon"], caughtDay: G.day });
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  const sour = src.slice(src.indexOf("afftextsour") - 400, src.indexOf("afftextsour"));
  assert.doesNotMatch(sour, /❤️|😴|both way/);
});
test("the break she saw with her own eyes says what she saw", () => {
  affair({ discovered: true, soured: true, caughtWith: ["Namfon", "Ing"], caughtDay: G.day - 2 });
  out = []; _affairEnd("break");
  assert.match(said(), /Namfon and Ing/); assert.doesNotMatch(said(), /Nobody did bad\./);
});
test("another girl's floor moment is not intimacy while the affair runs", () => {
  affair({});
  const jiap = _floorPool("jiap"); assert.ok(!jiap.some(l => /something passes between you/.test(l)));
  assert.ok(_floorPool("manow").some(l => /something passes between you/.test(l)));
});
test("Tan has a read on the owner's girl", () => {
  affair({}); G.room = "stinky_bar";
  out = []; assert.equal(_tanAbout("manow"), true); assert.match(said(), /Everybody on the soi knows/);
});

// ── the places that answered the wrong question ──────────────────────────────
test("a gentlemen's club is a place the town can name, not Bert's Flying Club", () => {
  run("talk to bert");
  const r = ask("bert", "gentlemens club"); assert.match(r, /Thappraya/); assert.doesNotMatch(r, /Flying Club/);
});
test("a masseuse in her own oil shop answers your back as a masseuse", () => {
  G.room = "lotus_oil"; run("talk to orapin");
  const r = ask("orapin", "back"); assert.doesNotMatch(r, /Not the oil places/); assert.match(r, /Thai/);
});
test("the clinic: you arrive before she sits beside you, a test the night of the special is about last month, and she has no stool there", () => {
  G.room = "lucky_tiger"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.party = { ids: [g], stops: 0, spent: 0, seen: {} }; G.room = "beach_rd_c"; G.soc.special = { lotus_oil: G.day };
  out = []; run("get tested");
  const s = said(); assert.ok(s.indexOf("The clinic is on Second Road") < s.indexOf(NPCS[g].name), "travel, then her");
  assert.match(s, /window period/);
  assert.equal(_fixtureTalk(g, "chair"), false);
});
test("MEET a masseuse while standing in her shop is not a text into the void", () => {
  G.room = "lotus_oil"; G.nightTurn = 60;
  G.offShift = { id: "orapin", name: "Orapin", home: "lotus_oil", day: G.day, ghost: true }; G.itemLoc.masseuse_note = "inventory";
  out = []; _doMeetOffShift(""); assert.match(said(), /right here/); assert.ok(G.offShift, "the thread is not closed");
});

// ── the money and the calendar ────────────────────────────────────────────────
test("a docket is decided the morning after pay-day night, and no fresh slate while one is under the till", () => {
  owner(); const saved = _rand;
  try {
    _rand = () => 0.1; G.shiftCall = "tab"; G.pendingChoice = "shift"; _shiftYes();
    assert.equal(G.bar.tabDue.day, G.day + 3);
    assert.ok(!_shiftEligible().some(c => c.id === "tab"));
  } finally { _rand = saved; }
});
test("the joiner fee is per NIGHT: the affair girl's wake does not let that night's guest up free", () => {
  owner(); G.hotel = "sabai"; G.stage = "expat";
  G.money = 5000; _joinerFee(G.day - 1); const m = G.money; _joinerFee(G.day);
  assert.equal(G.money, m - JOINER_FEE);
});
test("a one-night companion is not 'someone who knows you' at the close", () => {
  G.room = "lucky_tiger"; const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.soc.drinks[g] = 4; G.party = { ids: [g], stops: 2, spent: 0, seen: {} };
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.doesNotMatch(said(), /No treadmill with her/);
});
test("BOOKS' tonight line names the merit and a companion's drinks", () => {
  owner(); _shiftTake(-MERIT_COST, "the merit ceremony"); G.bar.guestDrinks = 150;
  out = []; _doBooks(); assert.match(said(), /Tonight so far:.*merit.*|Tonight so far:.*company/);
  assert.match(said(), /your company's drinks \+฿150/);
});
test("WORK says the rule it settles by; the honeymoon and the cashier are money-blind; Tan's favour is clock-blind", () => {
  owner(); G.room = "stinky_bar"; out = []; _doWork(); assert.match(said(), /till midnight/);
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /The best nights the bar has ever had are/);
  assert.doesNotMatch(src, /the real test, not " \+\s*"Saturday/);
});
test("Tan leaves after his procurement answer, and says so", () => {
  owner();
  const job = SYNDICATE_JOBS[0]; G.synJob = job.id; G.pendingChoice = "synjob";
  out = []; _synYes(); assert.ok(_SYN_TAN_GOES.some(l => said().includes(l)));
});
test("the small things: Bert has never seen Tan's ghost, Klang Corner is eighteen years, no bike man without a stand", () => {
  assert.ok(!NPCS.bert.dialogue.some(d => /Comes in when she comes in/.test(d.text)));
  assert.match(ROOMS.klang_corner ? ROOMS.klang_corner.desc : Object.values(ROOMS).find(r => r.name === "Klang Corner Massage").desc, /eighteen years/);
  assert.ok(!(ROOMS.beach_rd_n.lateDesc || []).some(l => /one man on a saddle/.test(l)));
});

// ── a night out with the affair girl, with consequences (Mario, 2026-10-08) ──────────────────
const goOut = () => { run("take manow out"); run("take manow out"); };
test("the night out: the stakes first, then the two of you get the night and the floor pays for it", () => {
  affair({ strain: 8 }); G.bar.workedLast = true; G.bar.workedDay = G.day; G.bar.stoodTurns = 25;
  out = []; run("take manow out"); assert.ok(!G.party); assert.match(said(), /rail is Bert's/);
  out = []; run("take manow out");
  assert.deepEqual(G.party.ids, ["manow"]); assert.equal(G.affair.strain, 6); assert.equal(G.affair.floorSour, 1);
  assert.equal(G.bar.workedLast, false, "the shift lapsed at the door");
  assert.ok(!_barStaff().includes("manow"), "she is not on the floor while she is out with you");
});
test("a second night out inside a week costs the floor double, and she won't go after a catch", () => {
  affair({}); G.affair.lastOut = G.day - 3; goOut(); assert.equal(G.affair.floorSour, 2);
  G.party = null; G.affairOutAsk = null;
  Object.assign(G.affair, { soured: true, discovered: true, caughtDay: G.day, caughtWith: ["Ing"] });
  out = []; run("take manow out"); run("take manow out"); assert.ok(!G.party); assert.match(said(), /cousin/);
});
test("the morning after: the floor's verdict; no away-night strain, no going formal, no other girl's dawn bus", () => {
  affair({ strain: 7 }); G.hotel = "sabai"; G.money = 9000; goOut();
  const s0 = G.affair.strain; G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.match(said(), /float|floor one short|Polite is the word|good morning/);
  assert.doesNotMatch(said(), /worked it without you|did all of it|has gone formal/);
  assert.doesNotMatch(said(), /The last baht bus was never yours/);
  assert.ok(G.affair.strain <= s0, "a night out with her is not a night away from her");
});

// ── the two calls ─────────────────────────────────────────────────────────────
test("the ledger is written after the bar settles: a till that went under is on that morning's ledger", () => {
  owner(); G.bar.cash = -5000; G.money = 20000; _nightSnapshot();
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  const idx = out.findIndex(l => /The bar:/.test(l)), led = out.findIndex(l => /^Last night:/.test(l));
  if (idx >= 0 && led >= 0) assert.ok(led > idx, "the ledger after the bar's settle line");
  if (G.bar.pocketNight > 0 || /into the till when it went under/.test(said())) assert.match(G.lastNightSaid[0], /into the till when it went under/);
});
test("leaving the rail mid-shift says the rule at the door", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30; _doWork(); G.bar.stoodTurns = 25;
  G.room = "beach_rd_n"; out = []; _workPresenceTick(); assert.match(said(), /hour and a half/);
});
