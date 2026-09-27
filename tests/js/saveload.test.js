// THE SAVE/RELOAD HARNESS — class S of docs/persona-findings-ledger-analysis.md, the
// most severe class (24%) and the least instrumented (5%) before this file existed
// (2026-09-27, the coverage map's darkest column). Every modal state the engine can be
// in — each pendingChoice, each live game, each interactive encounter, the barfine
// negotiation, the soapy menu, the fare — is armed, and then:
//   1. the state round-trips through serializeGame/deserializeGame exactly;
//   2. the resume redraw (_renderResume) prints the same text on the reloaded copy
//      as on the live one, and moves no dice;
//   3. an answer given on the LIVE session and the same answer given after a reload
//      leave the two games in the same state — a modal that keeps something outside
//      G is the bug this catches;
//   4. a junk line into the modal is never silent, never answers it, and never
//      moves money or happiness (class G, the second-darkest column).
// A new modal gate (see CLAUDE.md: "Add a new modal gate to both doCommand and
// _renderResume") gets a row in MODALS here, or the map keeps it dark.
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
const capture = fn => { out = []; fn(); return text(); };

function base() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.bank = 50000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2; G.nightTurn = 30; G.room = "lucky_tiger";
}
function ownsBar() {
  G.stage = "expat"; _setFlag("expatLife");
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", "partnerCandy", "barOpen"]) _setFlag(f);
  G.bar.cash = 5000; G.bar.room = "stinky_bar"; G.nightTurn = 56; G.room = "stinky_bar"; G.hunger = 0; G.thirst = 0;
}
const hostessAt = room => Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _npcRoom(id) === room);
// the modal-bearing state, as one comparable string
const sig = () => JSON.stringify({
  pc: G.pendingChoice, enc: G.pendingEnc, game: G.game && { type: G.game.type, stake: G.game.stake }, bf: G.pendingBf, soapy: G.pendingSoapy, fare: G.pendingFare,
  money: G.money, bank: G.bank, happy: G.happy, day: G.day, nightTurn: G.nightTurn, room: G.room, hurt: G.hurt, drunk: G.soc.drunk,
  flags: Object.keys(G.flags).filter(k => G.flags[k]).sort(), rng: G.rng, bar: G.bar && G.bar.cash, affair: G.affair && G.affair.strain,
});
const pending = () => !!(G.pendingChoice || G.pendingEnc || G.game || G.pendingBf || G.pendingSoapy || G.pendingFare);

const MODALS = [
  { id: "intro", setup() { G.pendingChoice = "intro"; G.introStep = 0; G.introAfter = "beach"; }, answers: ["1", "3"] },
  { id: "vacation_end", setup() { G.day = 8; G.pendingChoice = "vacation_end"; }, answers: ["new vacation", "move to pattaya"] },
  { id: "checkout", setup() { G.room = _hotelRoomId(); G.nightTurn = 3; doCommand("checkout"); }, answers: ["queen vic", "2", "stay"] },
  { id: "rabbitjob", setup() { G.room = "white_rabbit"; _rabbitInterview(); }, answers: ["carry it", "keyboard", "not me"] },
  { id: "kidprice", setup() { G.known.nont = true; _kidPriceAsk(); }, answers: ["pay", "no", "ask"] },
  { id: "kidfavour", setup() { _kidFavourAsk(); }, answers: ["yes", "no", "ask"] },
  { id: "tanfavour", setup() { ownsBar(); _setFlag("partnerTan"); G.flags.partnerCandy = false; _tanFavour(); }, answers: ["yes", "no", "ask"] },
  { id: "bkkdinner", setup() { G.room = _hotelRoomId(); G.pendingChoice = "bkkdinner"; }, answers: ["decline"] },
  { id: "bkkbill", setup() { G.pendingChoice = "bkkbill"; }, answers: ["let", "grab"] },
  { id: "cham", setup() { G.room = _npcRoom("cream"); G.nightTurn = 45; G.pendingChoice = "cham"; }, answers: ["go", "not tonight"] },
  { id: "chamgift", setup() { G.room = _hotelRoomId(); G.pendingChoice = "chamgift"; }, answers: ["gift 500", "nothing"] },
  { id: "synjob", setup() { ownsBar(); G.pendingChoice = "synjob"; G.synJob = "cleaning"; }, answers: ["yes", "no", "ask"] },
  { id: "shift", setup() { ownsBar(); G.shiftCall = "tab"; G.shiftWho = hostessAt("stinky_bar"); G.pendingChoice = "shift"; }, answers: ["yes", "no"] },
  { id: "partner", setup() { G.stage = "expat"; _setFlag("expatLife"); G.partnerWho = "candy"; G.pendingChoice = "partner"; }, answers: ["yes", "no"] },
  { id: "affair", setup() { ownsBar(); G.affairWho = hostessAt("stinky_bar"); G.pendingChoice = "affair"; }, answers: ["stay", "step back"] },
  { id: "affaircrisis", setup() { ownsBar(); G.affair = { id: hostessAt("stinky_bar"), since: 1, strain: 2, floorSour: 0, crisSeen: [], warned: {} }; G.day = 30; G.affairCrisis = "rota"; G.pendingChoice = "affaircrisis"; }, answers: ["1", "2"] },
  { id: "sellbar", setup() { ownsBar(); G.pendingChoice = "sellbar"; }, answers: ["yes", "no"] },
  { id: "game:c4", setup() { _startC4(20); }, answers: ["drop 4", "quit"] },
  { id: "game:jp", setup() { _startJackpot("20"); }, answers: [null, "quit"], liveAnswer: () => _gameVerbs().find(v => v !== "flip" && v !== "quit") || "quit" },
  { id: "game:pool", setup() { _startPool(0); }, answers: ["shot", "quit"] },
  { id: "game:killer", setup() { G.day = 3; _startKiller(); }, answers: ["shot", "quit"] },
  { id: "game:darts", setup() { G.room = "cricketers"; _startDarts(); }, answers: ["big", "quit"] },
  { id: "game:quiz", setup() { G.day = 4; G.nightTurn = 25; G.room = _quizBars()[0]; _startQuiz(); }, answers: ["1", "quit"] },
  { id: "game:cli", setup() { G.room = "kitten_office"; _setFlag("rabbitOperator"); _startCli("plg_office"); }, answers: ["help", "ls", "exit"] },
  ...Object.keys(ENCOUNTERS).filter(id => ENCOUNTERS[id].interactive).map(id => ({
    id: "enc:" + id, setup() { G.room = "beach_rd_c"; _startEnc(id); }, answers: ["yes", "no", "pay", "leave", "hello"] })),
  { id: "barfine", setup() { const her = hostessAt("lucky_tiger"); G.pendingBf = { id: her, st: 500, lt: 1000, party: 2000, room: G.room, herMoney: false }; }, answers: ["short time", "long time", "take her out", "no"] },
  { id: "soapy", setup() { G.room = "emperor_soapy"; G.pendingSoapy = { room: G.room }; }, answers: ["1", "no"] },
  { id: "fare", setup() { G.room = "beach_rd_c"; G.pendingFare = { kind: "bus", price: BUS_FARE, dest: "beach_rd_s" }; }, answers: ["pay " + BUS_FARE, "pay 5"] },
];

// junk never STARTS with an answer word — "yes please maybe" is a yes, and the game is right to take it
const JUNK = ["photosynthesis", "look", "inventory", "help", "north", "buy beer", "talk to bert", "xyzzy", "42", "maybe later perhaps", "the", "map", "time", "diagnose", "wait 3", "save", "undo"];

for (const m of MODALS) {
  test(`${m.id}: round-trips, redraws identically, forks identically on an answer, and is never silent on junk`, () => {
    base(); m.setup();
    assert.ok(pending(), `${m.id}: the setup did not arm the modal`);
    // 1+2: the redraw on the live copy, then on the reloaded copy
    const rng0 = G.rng;
    const live = capture(() => _renderResume());
    assert.equal(G.rng, rng0, "the redraw moved the dice");
    const live2 = capture(() => _renderResume());   // a pooled prompt varies between two LIVE redraws — that is not drift
    const pooled = live2 !== live;
    const sig0 = sig(), blob = serializeGame();
    newGame(); deserializeGame(blob);
    assert.equal(sig(), sig0, "the modal state did not round-trip through the save");
    const reloaded = capture(() => _renderResume());
    assert.ok(reloaded.trim().length, "the reloaded copy redraws nothing");
    if (!pooled) assert.equal(reloaded, live, "the resume redraw differs from the live prompt");
    // 3: the same answer on the live session and after a reload
    for (const a of m.answers) {
      const answer = a == null ? m.liveAnswer() : a;
      deserializeGame(blob); const o1 = capture(() => doCommand(answer)); const s1 = sig();
      newGame(); deserializeGame(blob); const o2 = capture(() => doCommand(answer)); const s2 = sig();
      assert.equal(s2, s1, `${m.id}: "${answer}" leaves a different state after a reload`);
      assert.equal(!!o1.trim(), !!o2.trim(), `${m.id}: "${answer}" is silent on one side`);
    }
    // 4: junk is answered, never swallowed, never charged
    for (const j of JUNK) {
      newGame(); deserializeGame(blob);
      const before = { money: G.money, happy: G.happy, bank: G.bank };
      const o = capture(() => doCommand(j));
      assert.ok(o.trim().length, `${m.id}: "${j}" was swallowed silently`);
      if (pending()) assert.deepEqual({ money: G.money, happy: G.happy, bank: G.bank }, before, `${m.id}: "${j}" did not answer the modal but moved money or happiness`);
    }
  });
}

// ── the whole of G round-trips, whatever state the systems are in ────────────
// The modal harness above covers the states with a prompt; this covers the rest of
// the save — a parked saleng, a downpour, the dog, a loan, a lesson, a night ride's
// log — by putting every system into a non-default state and asserting the save is
// the identity. A field that serialises to something deserialize does not restore
// (a Set, a function, undefined vs null) shows up here first.
test("G round-trips through serializeGame/deserializeGame as the identity, with every system in a non-default state", () => {
  base();
  G.salengCart = "lingerie"; G.salengRoom = "lucky_tiger"; G.salengUntil = G.turns + 8;
  G.rain = 4; G.lastRain = G.turns; G.dog = { since: 1, name: "Sai Krok" };
  G.loan = { amount: 5000, due: G.day + 3 }; G.std = "itch"; G.taughtBy = { waen: 2 }; G.thaiSeen = ["สวัสดี"];
  G.rideLog = { lek: { day: 1, stops: 3, great: true } }; G.lastRide = "lek"; G.hangover = 2; G.hurt = 1;
  G.soc.drinks = { lek: 7 }; G.soc.drunk = 3; G.soc.soberNext = G.nightTurn + 12; G.phone.contacts = { lek: true, tan: true, priew: true };
  G.phone.photos = [{ id: "lek", turn: 4 }, { id: "ping", cap: "from the pool", turn: 9 }];
  G.quests = { league: "active", sangsom: "done" }; G.talked = { bert: [0, 2] }; G.known = { bert: true, lek: true };
  G.kpTitle = { lucky_tiger: { day: G.day, name: "you" } }; G.lastKp = { room: "lucky_tiger", day: G.day, names: ["Aek"], won: true };
  G.travelDark = { key: "a>b", turn: G.turns }; G.lastComp = { turn: G.turns, room: G.room }; G.player.teetotal = true;
  G.bar.cash = 1234; G.syn = { friction: 2, jobs: ["cleaning"] }; G.affair = { id: "lek", since: 1, strain: 3, floorSour: 1, crisSeen: ["rota"], warned: {} };
  const before = JSON.parse(serializeGame());
  newGame(); deserializeGame(JSON.stringify(before));
  const after = JSON.parse(serializeGame());
  // the one thing a reload may add: the room you are standing in is a room you have visited
  assert.ok(after.visited[before.room]); before.visited[before.room] = true;
  assert.deepEqual(after, before, "the save is not the identity — a field was dropped, defaulted or reshaped on the way back");
  // …and a second trip is still the identity (a migration that rewrites on every load would show here)
  newGame(); deserializeGame(JSON.stringify(after));
  assert.deepEqual(JSON.parse(serializeGame()), after);
});

// ── the night boundary: a room-bound modal does not follow you into the morning ──
test("SOAPY (or a barfine) on the last turn of a night does not leave its menu pending in your hotel bed", () => {
  // found by the soak's night-boundary invariant on its first run (2026-09-27)
  const saved = _rand;
  try {
    _rand = () => 0.99;
    base(); G.room = "emperor_soapy"; G.nightTurn = NIGHT_TURNS - 1; G.money = 9000;
    const d0 = G.day; doCommand("soapy");
    assert.equal(G.day, d0 + 1, "the night ended on that command");
    assert.equal(G.pendingSoapy, null, "the laminated menu did not follow you home");
    assert.equal(G.pendingBf, null);
    out = []; doCommand("look");
    assert.match(text(), /Your Room|Sabai|room/i, "the first command of the morning is yours, not the menu's");
  } finally { _rand = saved; }
});
