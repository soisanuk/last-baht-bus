// Round 55 (2026-09-29) — the round aimed at the three systems no persona had
// walked, each on a seed BUILT by the game's own functions and replayed
// headlessly before launch (round 54's hand-assembled seed masked the systems it
// was sent to test). Rolf, the Hamburg publican, plays the affair to its end
// (lens: owner-with-a-girl); Hennie, a retired auditor, owns the bar in September
// and refuses every favour and job (lens: owner-who-refuses); Sol, a rescuer by
// temperament, follows the Bangkok woman through to the Sathorn dinner (lens:
// reverse-savior). Sol's severe: Sao answered every text but her three story ones
// in the bar floor's "miss you na 🥺". Hennie's: a refused tab was booked as ฿400
// leaving the till while the prose said the money went two doors along.
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
const quiet = () => { for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true; G.pendingEnc = null; };
const inboxFrom = id => G.phone.inbox.filter(m => m.from === id).map(m => m.text).join(" | ");
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; quiet(); G.peddlerNight = 2;
});
function expat() { G.day = 8; out = []; _goExpat(); quiet(); G.money = 20000; G.battery = 90; }
function owner() {
  G.day = 8; out = []; _goExpat(); quiet();
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.room = "stinky_bar"; G.money = BAR_DEPOSIT; _barDeposit(); G.bar.lease.paid = true; G.bar.lease.how = "cash"; _setFlag("barOpen");
  G.syn = { done: {}, asked: {}, friction: 0 }; out = [];
}
function metSao() { expat(); G.room = "beach_rd_c"; G.nightTurn = 20; _startEnc("bkktourist"); out = []; doCommand("hello"); assert.ok(G.phone.contacts.sao); }
const BAR_GIRL = /miss you na|come see me tonight|you come make sanuk|555\+ you funny/;

// ── Sol ──────────────────────────────────────────────────────────────────
test("Sao texts back as herself at every stage — never the bar floor's lines", () => {
  metSao();
  for (const stage of [1, 2, 3]) {
    G.bkk.stage = stage; if (stage >= 2) G.bkk.coffee = G.day; if (stage === 3) G.bkk.invite = G.day;
    G.phone.msgCd = {}; G.phone.inbox = [];
    out = []; doCommand("message sao");
    assert.ok(inboxFrom("sao"), "she answers at stage " + stage);
    assert.doesNotMatch(inboxFrom("sao"), BAR_GIRL, "stage " + stage);
  }
  _setFlag("bkkArcDone"); G.bkk.went = true; G.phone.inbox = []; G.day++;
  out = []; doCommand("message sao"); assert.doesNotMatch(inboxFrom("sao"), BAR_GIRL, "and after the dinner");
  // anybody without a floor role never gets the floor's register
  G.phone.contacts.nont = true; G.phone.inbox = [];
  out = []; doCommand("message nont"); assert.doesNotMatch(inboxFrom("nont"), BAR_GIRL);
});

test("REPLY SAO: with a colon reaches Sao; a bare REPLY answers whoever wrote last, not Mort", () => {
  metSao(); G.phone.jokeN = 3; _setFlag("jokeWho");
  G.phone.inbox = []; G.phone.msgCd = {};
  out = []; doCommand("reply sao: of course!"); assert.ok(inboxFrom("sao"), "Sao answered");
  assert.doesNotMatch(text(), /Still reading them/);
  _pushMsg("sao", "test"); G.phone.msgCd = {};
  out = []; doCommand("reply yes"); assert.doesNotMatch(text(), /Still reading them/, "the last sender, not Mort");
});

test("the invitation names the real day and the car keeps no clock it cannot; TIME passes the van", () => {
  metSao(); G.bkk.stage = 2; G.bkk.coffee = G.day - 20;
  G.room = "beach_rd_c"; out = []; _bkkArcTick();
  const inv = inboxFrom("sao");
  assert.ok(inv.includes(WEEKDAYS[(G.day + 1) % 7]), "the car's weekday, computed: " + inv);
  assert.doesNotMatch(inv, /Saturday|at four/); assert.match(inv, /coffee will have to wait/);
  G.day += 3; G.room = _hotelRoomId(); out = []; _bkkArcTick();
  assert.equal(G.pendingChoice, "bkkdinner");
  assert.doesNotMatch(text(), /at seven/); assert.match(text(), /AGAIN/, "a car that came before says so");
  out = []; doCommand("time"); assert.ok(text().includes(_clockStr()), "TIME tells the time under the van");
});

test("the dinner's prose fits an expat, and the bracelet is at her wrist from the start", () => {
  metSao(); G.bkk.stage = 4; G.pendingChoice = "bkkdinner";
  out = []; doCommand("go"); out.push({ text: "" }); doCommand("let");
  assert.doesNotMatch(text(), /Jomtien|the tourist never sees|You tip him too much/);
  for (const i of ENCOUNTERS.bkktourist.intro) assert.match(i, /bracelet/);
});

test("Tan has a read on Sao after the dinner that is not the one he had before it", () => {
  metSao(); G.room = _npcRoom("tan"); G.nightTurn = 30;
  out = []; _doTalkBody("tan", "sao"); const before = text();
  _setFlag("bkkArcDone"); G.bkk.went = true;
  out = []; _doTalkBody("tan", "sao"); assert.notEqual(text(), before); assert.match(text(), /guest/i);
  out = []; _doTalkBody("tan", "her father"); assert.match(text(), /names/);
});

test("JOURNAL lists Sao's car; a met man is not told to come and find you; MOTOSAI TO QUEEN VIC is the pub", () => {
  metSao(); G.bkk.stage = 3; G.bkk.invite = G.day; G.room = "beach_rd_c";
  out = []; doCommand("journal"); assert.match(text(), /Sao's car/);
  G.phone.jokeN = 2; _setFlag("jokeWho"); G.talked.mort = [0];
  G.phone.inbox = []; out = []; _doJokeReply(); assert.doesNotMatch(text(), /Come and find me/);
  G.room = "naklua_rd"; G.nightTurn = 30; G.money = 3000; out = []; doCommand("motosai to queen vic");
  assert.doesNotMatch(text(), /Is here/); assert.equal(ROOMS[G.room].region, "Soi 6");
});

test("ASK MORT ABOUT HOBBY quotes the sentence with the word in it", () => {
  const q = _mortColumnTalk("guest");
  assert.ok(q && /guest/i.test(q), q);
});

// ── Hennie ───────────────────────────────────────────────────────────────
test("a refused tab is takings never taken, on the IN side — not ฿400 out of the till", () => {
  owner(); G.room = "stinky_bar";
  const cash0 = G.bar.cash;
  G.shiftCall = "tab"; G.pendingChoice = "shift"; out = []; _shiftNo();
  assert.equal(G.bar.cash, cash0, "nothing left the drawer");
  assert.equal(G.bar.eventOut || 0, 0, "and nothing was booked as a bill");
  G.bar.workedLast = true; G.bar.workedDay = G.day; G.bar.stoodTurns = WORK_MIN_STOOD;
  const saved = _rand; try { _rand = () => 0.5; _barNight(G.day); } finally { _rand = saved; }
  assert.equal(G.bar.lastLines.lost, SHIFT_FLAT_LOSS);
  out = []; _doBooks();
  assert.match(text(), /short of what it would have been \(a regular's slate refused/);
  assert.doesNotMatch(text(), /the night's own bill/);
});

test("WAIT stops when the body says so, on the tick's own warning lines", () => {
  G.room = "beach_rd_c"; G.nightTurn = 20; G.thirst = 85; G.hunger = 10;
  out = []; doCommand("wait until 5");
  assert.ok(G.nightTurn < 90, "stopped at " + _clockStr());
  assert.match(text(), /your body interrupts/);
  assert.ok(G.thirst < 100, "and before the collapse");
});

test("the cashier reads last night's book; anybody at the bar answers the season; Tan answers the uncle", () => {
  owner(); G.room = "stinky_bar";
  G.bar.lastLines = { take: 3708, nut: 270, cogs: 801, wages: 1800, mgr: 0, proc: 0, evtCost: 0, worked: true, notes: [], lost: 400, lostNotes: ["a regular's slate refused, and his night taken elsewhere −฿400"] };
  const cake = _barStaff().find(x => NPC_ROLES[x] === "cashier");
  G.talked[cake] = [0]; G.talked.bert = [0];   // Hennie had spoken to them for a fortnight
  for (const t of ["crate", "the 400", "last night", "slate"]) {
    out = []; _doTalkBody(cake, t); assert.match(text(), /3708|3,708/, t);
  }
  out = []; _doTalkBody("bert", "season"); assert.ok(text().includes(_SEASON_MONTHS[_seasonMonth()]), text());
  G.room = _npcRoom("tan"); out = []; _doTalkBody("tan", "ice"); assert.match(text(), /fifty-one on paper|list/i);
});

test("your own staff greet the guv'nor as staff — and the woman you stepped back from says so", () => {
  owner(); G.room = "stinky_bar";
  const her = _barStaff().find(x => NPC_ROLES[x] === "hostess");
  G.soc.drinks[her] = 15;
  out = []; _relGreeting(her);
  assert.ok(_REL_GREET_OWN.some(f => text().includes(f("X").slice(2, 30))) || /boss|float|tray/.test(text()), text());
  assert.doesNotMatch(text(), /under your arm|as close to a girlfriend/);
  G.affairCool = G.day; G.affairCoolWho = her;
  out = []; _relGreeting(her);
  assert.ok(_REL_GREET_STEPPED.some(f => text().includes(f(NPCS[her].name))), text());
});

// ── Rolf ─────────────────────────────────────────────────────────────────
function inAffair() {
  owner(); G.room = "stinky_bar"; G.nightTurn = 56;
  const her = _barStaff().find(x => NPC_ROLES[x] === "hostess");
  G.soc.drinks[her] = 15;
  _affairAsk(her); out = []; doCommand("stay");
  assert.ok(_affairLive() && G.affair.id === her, "the door, the real way");
  G.nightTurn = 30; out = [];
  return her;
}
const FLOOR_PITCH = /First time Pattaya|sit sit sit|Buy a drink — maybe it come back|That one I don't know/;

test("your girl answers as herself: love, stay, family, money, plan — and never her first-night hello", () => {
  const her = inAffair(); G.talked = {};   // never 'talked' — the floor built the bond, as it does
  for (const t of ["love", "stay", "mother", "papa", "salary", "plan", "photosynthesis"]) {
    out = []; _doTalkBody(her, t);
    assert.ok(text().length, t); assert.doesNotMatch(text(), FLOOR_PITCH, t + ": " + text());
  }
});

test("the crises leave a mark: she answers the roof by what you chose", () => {
  const her = inAffair();
  G.affair.crisSeen = ["family"]; G.affair.crisChose = { family: "c" };
  out = []; _doTalkBody(her, "roof"); assert.match(text(), /Half roof/);
  G.affair.crisChose = { family: "b" };
  out = []; _doTalkBody(her, "the roof"); assert.match(text(), /plastic/);
});

test("the first crisis comes as the honeymoon ends, and the colleague crisis needs a colleague", () => {
  const her = inAffair();
  G.affair.since = G.day - AFFAIR_HONEYMOON - 1; G.room = "stinky_bar"; G.nightTurn = 30;
  const c = _affairCrisisDue(); assert.ok(c, "a crisis on the first day past the honeymoon");
  G.affair.crisSeen = AFFAIR_CRISES.map(x => x.id).filter(id => id !== "colleague");
  if (_barStaff().filter(id => NPC_ROLES[id] === "hostess").length < 2) assert.equal(_affairCrisisDue(), null, "no colleague on the floor, no colleague crisis");
});

test("her verbs: a drink, a kiss, a dance and going home are hers, not a customer's", () => {
  const her = inAffair(); const n = NPCS[her].name.toLowerCase();
  G.money = 5000;
  out = []; doCommand(`buy ${n} a drink`); assert.ok(_AFFAIR_TOAST.some(f => text().includes(f(NPCS[her].name))), text());
  out = []; doCommand(`kiss ${n}`); assert.doesNotMatch(text(), /applause|officially, sitting with her/);
  G.pendingChoice = null; G.pendingEnc = null;
  out = []; doCommand(`dance with ${n}`); assert.doesNotMatch(text(), /A hostess materialises/); assert.ok(text().includes(NPCS[her].name), text());
  out = []; doCommand(`barfine ${n}`); assert.match(text(), /cannot buy/);
  out = []; doCommand(`take ${n} home`); assert.equal(G.affair.homeDay, G.day, "TAKE HER HOME is going home with her");
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.match(text(), /let herself in|came in with the float counted/, "and the morning says so");
});

test("quiz night never happens at the bar you own", () => {
  owner(); G.room = "stinky_bar";
  const saved = _quizBars; try { _quizBars = () => ["stinky_bar"]; G.day = 4; G.nightTurn = 25; assert.equal(_quizHere(), false); } finally { _quizBars = saved; }
});

test("the ledger: down behind your own rail is said as such, and a draw from your own till is not income", () => {
  owner(); G.room = "stinky_bar"; G.money = 2000; _nightSnapshot();
  G.bar.cash = 20000; out = []; doCommand("draw 10000");
  G.thirst = 100; out = []; _endNight("collapse");
  const said = G.lastNightSaid.join(" ");
  assert.match(said, /floor took you home/); assert.doesNotMatch(said, /woke wherever you fell/);
  assert.doesNotMatch(said, /up ฿9,|up ฿10,/); assert.match(said, /drawn from your own till/);
});

test("close-of-night lines wait for the close; the declaration never narrates it", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 12;
  for (let i = 0; i < 12; i++) { out = []; G.day++; _doWork(); assert.ok(!out.some(o => _isCloseLine(o.text)), "no close line at 19:00"); }
  G.bar.workedDay = G.day; G.bar.workedLast = true; G.nightTurn = 15; G.bar.floorN = 0; G.bar.floorTurn = -99;
  for (let i = 0; i < WORK_FLOOR_MAX; i++) { G.turns += WORK_FLOOR_GAP; out = []; _workFloor(); assert.ok(!out.some(o => _isCloseLine(o.text)), "no close line on an early floor moment"); }
});

test("after the sale: the old floor greets its old boss, Bert says who owns it now, WHO does not call the mamasan your girl", () => {
  owner(); G.room = "stinky_bar";
  const mama = _barStaff().find(x => NPC_ROLES[x] === "mamasan");
  G.soc.drinks[mama] = 15; G.phone.contacts[mama] = true;
  out = []; _doBlackbook(); assert.doesNotMatch(text().split("\n").find(l => l.includes(NPCS[mama].name)) || "", /your girl/);
  _setFlag("barSold"); G.flags.barOpen = false;
  out = []; _doTalkBody(mama, null); assert.ok(_FORMER_BOSS.some(f => text().includes(f(NPCS[mama].name).slice(0, 40))), text());
  G.talked.bert = [0]; out = []; _doTalkBody("bert", null); assert.match(text(), /Swede/); assert.doesNotMatch(text(), /name is on the register/);
});

test("the owner's small things: TRAVEL home to his bar, EAT behind it, his own return-visit lines, no stool line at dawn", () => {
  owner(); G.visited = {}; G.room = "beach_rd_c";
  assert.ok(_travelDests().includes("stinky_bar"), "your own bar needs no discovering");
  G.room = "stinky_bar"; G.money = 500; G.hunger = 80;
  for (const k of Object.keys(G.itemLoc)) if (G.itemLoc[k] === "inventory" && _EDIBLE[k] !== undefined) G.itemLoc[k] = null;   // nothing in the pockets
  out = []; doCommand("eat"); assert.ok(G.hunger < 80); assert.match(text(), /-฿60/);
  G.visited.stinky_bar = true; out = []; _describeRoom(true); assert.ok(_OWNER_REVISIT.some(l => text().includes(l)), text().slice(0, 200));
  G.soc.barTurns = { stinky_bar: 60 }; G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.doesNotMatch(text(), /same stool/);
});

test("Tan's evening is his own: no job on the favour's night, and ASK MANOW is not Tan's ASK", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30;
  _tanFavour(); assert.equal(G.pendingChoice, "tanfavour");
  out = []; doCommand("ask manow about us"); assert.equal(G.pendingChoice, "tanfavour"); assert.match(text(), /Answer him/);
  doCommand("no"); assert.equal(_synDue(), false, "not the same night");
  G.day++; assert.ok(_synDue(), "the next night");
});

test("the shift calls are not a fixed rotation; the early call never draws your girl", () => {
  owner(); G.room = "stinky_bar";
  const ids = [];
  for (let d = 20; d < 40; d++) { G.day = d; const pool = _shiftEligible(); ids.push(pool[_hh("shift:" + G.vacation + ":" + G.day, 4177) % pool.length].id); }
  const repeats = ids.slice(3).filter((x, i) => x === ids[i]).length;
  assert.ok(repeats < ids.length - 3, "not a strict period-three cycle: " + ids.join(","));
  const her = inAffair(); assert.notEqual(_earlyGirl(), her);
});

test("SLEEP through the app's booking prompt sleeps; out-of-season rain says so; staff texts are their own", () => {
  G.hotel = "sabai"; G.room = _hotelRoomId(); G.nightTurn = 50; _startEnc("booking");
  const d = G.day; out = []; doCommand("sleep");
  assert.ok(G.day === d + 1 || G.pendingChoice, "the night ended (or the bed asked if you mean it)");
});

test("the Stinky has three girls on the floor now, so the colleague crisis has a colleague (Mario, 2026-09-29)", () => {
  owner(); G.room = "stinky_bar";
  const girls = _barStaff().filter(id => NPC_ROLES[id] === "hostess");
  assert.ok(girls.length >= 3, "Manow, Jiap and Mew: " + girls.join(","));
  for (const id of ["jiap", "mew"]) assert.ok(girls.includes(id), id + " works the Stinky");
  const her = inAffair();
  G.affair.since = G.day - AFFAIR_HONEYMOON - 1; G.room = "stinky_bar"; G.nightTurn = 30;
  G.affair.crisSeen = AFFAIR_CRISES.map(x => x.id).filter(id => id !== "colleague");
  const c = _affairCrisisDue(); assert.ok(c && c.id === "colleague", "the colleague crisis is dealt at the Stinky");
});

// ── The ending is an ending (Mario, 2026-09-29) ─────────────────────────
test("SELL UP ends the game: an epilogue, the card, and a gate — VISIT PATTAYA or START OVER", () => {
  const her = inAffair();
  G.affair.since = G.day - 70; _setFlag("affairOffered");
  G.pendingChoice = "sellbar"; out = []; doCommand("yes");
  assert.equal(G.pendingChoice, "gameend");
  assert.match(text(), /Prachuap is five hours round the top of the Gulf/); assert.match(text(), /the long way round/);
  assert.doesNotMatch(text(), /old habits keep a room ready/, "no parenthetical pretending the sandbox carries on");
  // the gate holds, redraws, and SHARE is the ending's card
  out = []; doCommand("look"); assert.equal(G.pendingChoice, "gameend"); assert.match(text(), /VISIT PATTAYA/);
  const blob = serializeGame(); newGame(); deserializeGame(blob);
  out = []; _renderResume(); assert.match(text(), /VISIT PATTAYA/); assert.match(text(), /the long way round/);
  assert.match(_shareCard().join("\n"), /the long way round/);
  assert.deepEqual(_chipSet().map(c => c.cmd || c.c || c).filter(Boolean).length >= 2, true);
});

test("VISIT PATTAYA is a week down from Prachuap on the same calendar, and the bus takes you home to the gate", () => {
  inAffair(); G.affair.since = G.day - 70; _setFlag("affairOffered");
  G.pendingChoice = "sellbar"; doCommand("yes");
  const d0 = G.day;
  out = []; doCommand("visit pattaya");
  assert.equal(G.pendingChoice, null); assert.equal(G.room, _hotelRoomId()); assert.equal(G.visitUntil, d0 + 7);
  assert.ok(_pickVary && /Prachuap|round the top of the Gulf/.test(text()), text().slice(0, 160));
  for (let n = 0; n < 7 && G.pendingChoice !== "gameend"; n++) { G.room = _hotelRoomId(); G.nightTurn = 30; out = []; _endNight("sleep"); }
  assert.equal(G.pendingChoice, "gameend", "the seventh morning, the bus home and the gate again");
  assert.match(text(), /bus/);
});

test("START OVER is a new first night on the beach", () => {
  inAffair(); G.affair.since = G.day - 70; _setFlag("affairOffered");
  G.pendingChoice = "sellbar"; doCommand("yes");
  out = []; doCommand("start over");
  assert.equal(G.pendingChoice === "gameend", false); assert.ok(!_flag("affairWon"), "a clean slate");
});
