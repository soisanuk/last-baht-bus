// THE DEFERRED SWEEP (2026-10-24) — the rows rounds 103–105 left deferred, closed in one pass: the staff texts,
// the hand-overs of the manager's month, the town hearing about a crash and a police stop, and a dozen small
// answers the personas could not get (Gareth, Ingrid, Tomás, Alun, Benoît, Callum, Ruth).
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
const src = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8");
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 20000;
};
beforeEach(() => { newGame(); });

test("texts: 'bar quiet, you come' is not sent from a shut bar or to a man who sat there tonight; the staff pools are deeper than a week", () => {
  sandbox(); const id = "pukky", r = _npcRoom(id);
  assert.equal(_textFits(id, "bar quiet tonight, you come?"), true);
  G.soc.barTurns = { [r]: 5 }; assert.equal(_textFits(id, "bar quiet tonight, you come?"), false);
  assert.equal(_textFits(id, "my mama ok"), true);
  G.soc.barTurns = {}; G.nightTurn = (_closeTurn(r) ?? NIGHT_TURNS) + 2;
  if (_closedNow(r)) assert.equal(_textFits(id, "same stool free"), false);
  assert.match(src("engine-systems"), /the bulb outside go again/);
});

test("Ingrid: bed before ten wakes to a morning, not 'surface mid-afternoon'", () => {
  sandbox(); G.room = _hotelRoomId(); G.nightTurn = 14; out = []; _endNight("sleep");
  assert.doesNotMatch(said(), /surface mid-afternoon/);
});

test("Ingrid: GO HOME from a bar at 02:36 takes the stand outside the door, not fifteen turns of dark", () => {
  sandbox(); const bar = Object.keys(ROOMS).find(r => ROOMS[r].barType && !ROOMS[r].motosai && ROOMS[r].exits && ROOMS[r].exits.out && ROOMS[ROOMS[r].exits.out].motosai && (_path(r, _hotelRoomId()) || []).length >= 8);
  G.room = bar; G.nightTurn = 86; quiet(); run("go home");
  assert.equal(G.room, _hotelRoomId()); assert.match(said(), /piwin at the stand/);
});

test("Ingrid: a bare COUNT at the covers stool counts, even mid-conversation; Waen is not at the far end while she talks to you", () => {
  sandbox(); G.quests.covers = "active"; G.room = "jasmine_garden"; G.nightTurn = 30; quiet(); run("talk to hong");
  assert.match(t("count"), /men on the stools/);
  assert.match(src("engine-core"), /busyId !== _talking/);
});

test("Tomás: the job bar's mamasan's drink is the house's; the manager's three questions are answered", () => {
  sandbox(); G.stage = "expat"; const room = "jasmine_garden"; G.job = { kind: "manager", room, nights: 5, stood: 2, weekStood: 1 };
  G.room = room; G.nightTurn = 30; quiet(); const m = G.money; run("buy ple a drink");
  assert.equal(G.money, m, "no chit for the mamasan at the bar he manages");
  assert.match(t("do i drink free if i work here?"), /house's/);
  assert.match(t("how is the takings tonight?"), /envelope|cup|cashier/);
  assert.match(t("how was my shift last night?"), /counted|turns behind the rail/);
});

test("Tomás and Benoît: the crash and the police stop are the town's news the next evening", () => {
  sandbox(); G.room = "soi6_mid"; G.nightTurn = 40; _streetSaw("crash", { where: "soi6_mid", how: "accident" });
  G.day++; G.room = "stinky_bar"; G.nightTurn = 20; quiet();
  const s = _npcsHere().find(x => NPC_ROLES[x] === "hostess"); run("talk to " + NPCS[s].name);
  assert.ok(_situationTopics(s).first.includes("the crash"));
  assert.match(t("ask " + NPCS[s].name + " about the crash"), /hospital|ambulance|bike|road/i);
  assert.match(src("engine-play"), /_streetSaw\("crash"/);
  assert.match(src("engine-parser"), /streetpolheard/);
});

test("Tomás: the shift is on the ledger, the waiting envelope is in the runway, the condo tenant's warning is the bikes", () => {
  assert.match(src("engine-play"), /a shift stood at \$\{_barName\(j\.room\)\}/);
  assert.match(src("engine-play"), /G\.envelopeDue \? G\.envelopeDue\.amt : 0/);
  sandbox(); G.stage = "expat"; G.hotel = "condo"; G.room = "soi6_mid"; G.nightTurn = LAST_BUS_TURN - 3; out = []; _lastBusWarn();
  assert.match(said(), /No truck goes up Pratumnak/); assert.doesNotMatch(said(), /songthaew loops/);
});

test("Tomás: INVITE points at AFTER WORK, and a bare LATE is after the shift; a movement command walks past the fortune teller", () => {
  assert.match(src("engine-parser"), /ASK <name> ABOUT AFTER WORK/);
  assert.ok(_AFTER_WORK_RE.test("late"));
  sandbox(); G.room = "beach_rd_c"; G.nightTurn = 30; _startEnc("fortune"); const ex = Object.keys(_room().exits)[0], to = _room().exits[ex];
  run("go " + ex); assert.equal(G.room, to); assert.equal(G.pendingEnc, null);
});

test("Tomás: SEE HOME walks a woman who told you about her bike to her bike", () => {
  assert.match(src("engine-systems"), /G\.smallTalk\[id\]\.moto != null/);
});

test("Alun: the consulate's card on the bench is the consulate's; the job's tier is named as 'regular'", () => {
  sandbox(); G.street = { nights: 2 }; G.room = "beach_rd_c"; assert.match(t("examine card"), /consulate's card/);
  assert.match(src("engine-play"), /Knowing a face is not enough/);
});

test("Benoît: the affair girl remembers the sunrise and the shoes; a dish is where to eat", () => {
  assert.match(src("engine-play"), /pick\("outsun"/);
  assert.match(src("engine-parser"), /khao man gai\|som \?tam/);
});

test("Callum: she says she remembers you, then no 'I think maybe you forget me'; 'how did you come to Pattaya' is the why-here", () => {
  assert.match(src("engine-parser"), /if \(k >= 1\) \(G\.soc\.retHello/);
  assert.ok(_SMALL_KEYS_has("how did you come to pattaya?"));
  assert.doesNotMatch(src("engine-play"), /for my brother school/);
});
function _SMALL_KEYS_has(s) { return /how \(\?:did\|do\) you come \(\?:to\|here\)/.test(src("engine-play")) && /\bhow (?:did|do) you come (?:to|here)\b/.test(s); }

test("Ingrid: Ple owns Jasmine Garden in Hong's and Grace's mouths; Reginald answers the papers a month on; 'the bank' to Nont is not Bank", () => {
  assert.doesNotMatch(src("world"), /She told the owner the month does not add up/);
  const r = NPCS.reginald.dialogue.find(d => /landlord of furniture/.test(d.text || ""));
  assert.match(r.topic, /the fixtures/); assert.match(r.topic, /papers/);
  sandbox(); G.room = NPCS.nont.room; G.nightTurn = 30; quiet(); run("talk to nont");
  const m = G.money; assert.doesNotMatch(t("ask nont about the bank"), /Two hundred/); assert.equal(G.askArm, null); assert.equal(G.money, m);
  assert.match(t("ask nont about bank"), /Two hundred/);
});

test("Ingrid: the job's own floor knows the job", () => {
  sandbox(); G.quests.covers = "active"; G.room = "jasmine_garden"; G.nightTurn = 30; quiet(); run("talk to fon");
  assert.match(t("ask fon about the count"), /count/i); assert.doesNotMatch(said(), /not my story|wrong girl/i);
});

test("Ruth: an evening at Wilf's table is a night he saw you", () => {
  sandbox(); G.room = "mikes_mall"; G.nightTurn = 10; quiet(); run("talk to wilf"); for (let i = 0; i < 6; i++) run("wait");
  G.room = "beach_rd_c"; _endNight("sleep"); G.room = "mikes_mall"; G.nightTurn = 10; quiet(); run("talk to wilf");
  assert.doesNotMatch(t("ask wilf about last night"), /you weren't/);
});

test("Gareth: one floor asks a question once a night", () => {
  sandbox(); G.room = "stinky_bar"; const a = "manow", b = "jiap", d = { asks: { key: "testkey", q: "Q?" } };
  _convoAsk(a, d, _npcState(a)); G.convoQ = null; out = []; _convoAsk(b, d, _npcState(b));
  assert.doesNotMatch(said(), /Q\?/);
});

test("Ingrid: a job's fee by text is named as the job's on the ledger", () => {
  assert.match(src("engine-systems"), /a job's fee from/);
  sandbox(); G.jobPay = [{ kind: "msg", who: "colin", line: "whip-round", amt: 1500, due: G.day }]; _questTick();
  const m = G.phone.inbox[G.phone.inbox.length - 1]; assert.equal(m.job, true);
});
