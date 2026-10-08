// Round 71 (2026-10-08) — two personas on what round 70 built.
// Callum Reid (Opus, lens: affair-night-out): an owner ten days into the affair, taking his girl out
// as often as she'd go. "A free win that turns into a trap with no gauge."
// Aurelio Bassi (Fable, lens: one-bar-week): six nights on one stool at the Silk Rose. "Fix the bill
// after a win, give the women the things they say out loud."
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
const ask = (id, t) => { G.convoQ = null; out = []; run(`ask ${id} about ${t}`); return said(); };
beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "blunt", orientation: "straight", said: {}, lang: "en" };
  G.stage = "expat"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 20000; G.bank = 50000; G.nightTurn = 30; G.room = "stinky_bar"; out = [];
});
const owner = () => { G.flags.barOpen = true; G.flags.barPaid = true; G.bar.room = "stinky_bar"; G.bar.owner = true; };
const affair = (extra) => { owner(); G.affair = Object.assign({ id: "manow", since: G.day - 20, strain: 6, floorSour: 0, crisSeen: [], warned: {}, discovered: false, soured: false, ended: false, crisDay: G.day }, extra); };
const goOut = () => { G.room = "stinky_bar"; G.affairOutAsk = null; run("take manow out"); while (G.pendingChoice) run("no"); run("take manow out"); };

// ── Callum: the night out ─────────────────────────────────────────────────────
test("TAKE HER OUT walks you out of the bar; she is a companion, not staff, wherever you go", () => {
  affair({}); goOut();
  assert.notEqual(G.room, "stinky_bar", "you walked out of your own bar");
  assert.ok(_outWithMe("manow"));
  G.room = "club_mirage"; out = []; run("dance with manow"); assert.doesNotMatch(said(), /goes back to the ice|puts the cloth down/);
  out = []; run("kiss manow"); assert.doesNotMatch(said(), /ice machine|Customers\.|back at the till/);
  out = []; _say(String(_usualHere())); assert.notEqual(_usualHere(), "manow");
});
test("GO HOME WITH her when she is on your arm goes home together; the morning says she was there", () => {
  affair({ strain: 4 }); G.hotel = "sabai"; goOut();
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.match(said(), /still asleep when you wake|Today I am a tourist/); assert.doesNotMatch(said(), /let herself in some time after five/);
  assert.doesNotMatch(said(), /\+10 สนุก/, "the night out home is not a barfine's +10");
});
test("the floor has a gauge and a remedy: BOOKS names it, the staff discuss it, a stood night mends it", () => {
  affair({ floorSour: 3 });
  out = []; _doBooks(); assert.match(said(), /The floor: closed to you/);
  run("talk to lamai"); assert.match(ask("lamai", "the floor"), /Closed|closed|customer smile|Nights on the rail/);
  G.bar.workedLast = true; G.bar.workedDay = G.day; G.bar.stoodTurns = 30; G.day++; out = [];
  _affairNight({ worked: true }); assert.equal(G.affair.floorSour, 2); assert.match(said(), /eased a notch/);
});
test("caught twice in one night is one night of being caught; the caught night pays nothing", () => {
  affair({ strain: 1 }); G.party = { ids: ["ing"], stops: 1, spent: 0, seen: {} };
  _affairCaught("bar"); const s1 = G.affair.strain; _affairCaught("bed", ["ing"]);
  assert.equal(G.affair.strain, s1, "the bed the same night adds nothing"); assert.ok(G.affair.caughtWith.includes("Ing"));
  const h = G.happy; _conquestHappy(10, "ing"); assert.equal(G.happy, h);
});
test("she remembers the rota as chosen, and last night out as last night out", () => {
  affair({ crisSeen: ["rota"], crisChose: { rota: "b" } }); run("talk to manow");
  assert.match(ask("manow", "rota"), /rota stand/); assert.doesNotMatch(said(), /You fix it/);
  G.affair.lastOut = G.day - 1; assert.match(ask("manow", "last night"), /not staff|dance/);
});
test("sent home, she is off the floor; the early bus names its girl; the colleague review is one line per mouth", () => {
  owner(); G.party = { ids: ["jiap"], stops: 0, spent: 0, seen: {} }; _partyGoodbye();
  assert.ok(!_npcActive("jiap") || (G.soc.leftEarly || {}).jiap === G.day);
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /'s early bus" : "an early bus"/);
  assert.equal(ENCOUNTERS.coconutbar.solo, true, "no 'why you walk the beach alone' with her on your arm");
});
test("TAKE <her> OUT when she is not here is a voiced line", () => {
  owner(); G.talked.manow = [0]; G.room = "beach_rd_c"; out = []; run("take manow out"); assert.doesNotMatch(said(), /You don't see that here/);
});

// ── Aurelio: the Silk Rose ────────────────────────────────────────────────────
test("no phantom jealous buyer on a rail of named men", () => {
  G.stage = "vacation"; G.room = "silk_rose"; G.season0 = 2; G.soc.patronBusy.silk_rose = "ton";
  out = []; run("buy lady drink for ton"); assert.doesNotMatch(said(), /buying Ton drinks all evening/);
});
test("CHECK BIN is the slips: a stake and its winnings are not on them", () => {
  G.stage = "vacation"; G.room = "silk_rose"; _arriveAt("silk_rose"); G.soc.arriveMoney.silk_rose = G.money;
  run("buy beer"); const beer = _beerPrice();
  G.money -= 100; G.offTill += 100; G.money += 300; G.offIn = (G.offIn || 0) + 300;
  out = []; run("check bin"); assert.match(said(), new RegExp("฿" + beer + " since you sat down"));
});
test("the house's one rule, its owner, its quota — all askable; the room's three things examinable", () => {
  G.stage = "vacation"; G.room = "silk_rose"; G.season0 = 2;
  for (const w of ["waew", "grace", "ton", "nid", "wa", "helmut"]) run("talk to " + w);
  assert.match(ask("waew", "third stool"), /Helmut/);
  assert.match(ask("waew", "owner"), /Bangkok/);
  assert.match(ask("waew", "quota"), /Grace keeps it/);
  assert.match(ask("grace", "owner"), /first of the month/);
  assert.match(ask("ton", "the argument"), /dive/);
  assert.match(ask("nid", "cat"), /Boss/);
  assert.match(ask("wa", "rules"), /third one is the hardest/);
  assert.match(ask("helmut", "football"), /marriage/);
  for (const k of ["flowers", "regulars", "third stool"]) { out = []; run("examine " + k); assert.doesNotMatch(said(), /isn't here|Whatever that is/, k); }
  out = []; run("sit on third stool"); assert.match(said(), /Helmut|Germany/);
});
test("the leaving line is each woman's own; a woman you met on an earlier night does not call you a first-timer", () => {
  G.stage = "vacation"; G.room = "silk_rose"; G.season0 = 2;
  const lines = new Set(["ton", "nid", "wa"].map(w => { G.soc.drinks[w] = 4; G.soc.leavingSaid = {}; return ask(w, "my flight home").split("\n")[0].replace(NPCS[w].name, "X"); }));
  assert.ok(lines.size >= 2, "not one sentence from three mouths");
  (G.metDay = G.metDay || {}).ton = G.day - 2; G.talked.ton = [0];
  assert.doesNotMatch(ask("ton", "me"), /First time I see you/);
});
test("a regular's miss is not 'mate' from a Stuttgart toolmaker; WHO does not call a mamasan a working girl", () => {
  assert.ok(!_PATRON_MISS.some(f => /mate/.test(f("Helmut", "his"))));
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /working girls you have actually met/);
});
test("an affair crisis answers 'what happens if…' with who pays, and a question naming an option does not commit it", () => {
  affair({ strain: 2 });
  _affairCrisisAsk(AFFAIR_CRISES.find(c => c.id === "rota"));
  const s0 = G.affair.strain, f0 = G.affair.floorSour;
  out = []; run("what happens if I choose 2?"); assert.match(said(), /the rota stands: Manow pays for it/); assert.match(said(), /the floor pays for it/);
  out = []; run("what if the rota stands?");
  assert.equal(G.pendingChoice, "affaircrisis", "the question did not choose");
  assert.equal(G.affair.strain, s0); assert.equal(G.affair.floorSour, f0);
  assert.doesNotMatch(said(), /฿?\d+ (strain|floor)/, "who pays, never a number");
  out = []; run("2"); assert.notEqual(G.pendingChoice, "affaircrisis");
});
