// Round 73 (2026-10-08), aimed at the coverage map's darkest cells — composition and the edges.
// László Varga (Opus, lens: composition-stacking): a Szeged restaurateur turned October owner who says yes to
// every deal at his own rail and then stacks a massage and the Orchid on the same evening. "This town keeps a
// perfect book of what I paid and forgets what I did."
// Pieter Vos (Fable, lens: thai-skint-edges): eleven years married into Udon, a Thai keyboard, ฿2,200 — the
// loan, the police, the stalls and Cream, in script first. "My Thai keyboard opens maybe a third of the doors."
// And the COMPOSITION AUDIT's first seven findings (tools/composition-audit.mjs), fixed the day it was built.
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
const src = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 7000; G.bank = 5000; G.nightTurn = 30; G.room = "stinky_bar"; out = [];
});
const owner = () => { G.stage = "expat"; G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true; G.bar.room = "stinky_bar"; G.bar.owner = true; G.room = "stinky_bar"; G.money = 20000; run("look"); while (G.pendingChoice) run("no"); out = []; };

// ── Pieter: the edges, in Thai ──────────────────────────────────────────────
test("GIVE NIRA 100 and ให้นิรา 100 reach the loan you flew home with; the recipient may come first", () => {
  G.room = "neon_paradise"; G.loanSkipped = true; G.loanSkippedOwed = 900;
  out = []; run("give nira 100"); assert.equal(G.loanSkippedOwed, 800); assert.doesNotMatch(said(), /not here|somewhere else/);
  out = []; run("ให้นิรา 100"); assert.equal(G.loanSkippedOwed, 700);
  out = []; run("give 700 to nira"); assert.equal(G.loanSkipped, false);
});
test("Nira answers the question every borrower asks, and a man leaving with her money", () => {
  G.room = "neon_paradise"; run("talk to nira");
  assert.match(ask("nira", "what if i cant pay"), /Day one late|cousins/); assert.doesNotMatch(said(), /Bar pay me/);
  run("borrow 2000"); assert.match(ask("nira", "my flight home"), /airport is far|Pay first/);
  G.loan = null; G.loanRepaid = 900; G.skipRepaid = 900; G.flags.debtTruth = false;
  const seen = new Set(); for (let i = 0; i < 8; i++) seen.add(ask("nira", "debt"));
  assert.ok([...seen].some(s => /paid late, and you paid/.test(s)), "a month late is not 'on the day'");
  assert.ok(![...seen].some(s => /paid on the day/.test(s)));
});
test("a Thai 'I am NOT drunk' is a soft no to the police, not a paid apology; a Thai fare with จ่าย in front pays", () => {
  G.money = 1000; G.soc.drunk = 5; G.room = "beach_rd_c"; G.pendingEnc = "police";
  out = []; run("ไม่ได้เมาครับ"); assert.equal(G.money, 1000, "no fine on a no"); assert.equal(G.pendingEnc, "police"); assert.match(said(), /not one of the options/);
  out = []; run("ขอโทษครับ"); assert.equal(G.money, 1000 - POLICE_WAI);
  G.pendingEnc = null; G.room = "beach_rd_c"; G.pendingFare = { kind: "bus", price: BUS_FARE, dest: "beach_rd_c" }; const m0 = G.money;
  out = []; run("จ่ายสิบห้า"); assert.equal(G.money, m0 - BUS_FARE); assert.ok(!G.pendingFare);
});
test("the room that walked you out does not deny you were in it; the bar you left her from saw you go", () => {
  G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: "metro_garden", barTurns: 30, with: null, kicked: { n: 1, where: "Neon Paradise A-Go-Go" } };
  G.room = "neon_paradise"; run("talk to jeab"); assert.match(ask("jeab", "last night"), /walked out|on the pavement|Security walk you out/);
  G.lastNightWas = { day: G.day - 1, reason: "barfine", bar: "stinky_bar", barTurns: 30, with: "cream", leftFrom: "metro_garden" };
  G.room = "metro_garden"; G.nightTurn = 50; run("talk to near"); assert.doesNotMatch(ask("near", "last night"), /You not here|somebody else's room|Not this room/);
  G.room = "thappraya_massage"; G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: "stinky_bar", barTurns: 30, with: null };
  assert.match(ask("masseuse", "last night"), /Not on my table|shoulders say so/);
});
test("GO HOME WITH a woman who is not on your arm points at the word for it", () => {
  G.room = "metro_garden"; G.nightTurn = 50; run("talk to cream");
  out = []; run("go home with cream"); assert.match(said(), /\(BARFINE CREAM\)/);
  out = []; run("take cream home"); assert.match(said(), /\(BARFINE CREAM\)/); assert.doesNotMatch(said(), /You don't see that here/);
});
test("คืนเงิน is REPAY, ขอข้าวผัด at a chicken cart is refused by name, and the source keeps no Thai the trainer lacks", () => {
  assert.equal(_thaiToCmd("คืนเงิน 500"), "repay 500");
  assert.equal(_thaiToCmd("ขอข้าวผัด"), "buy fried rice");
  G.room = "naklua_rd"; G.hunger = 80; const m0 = G.money; out = []; run("buy fried rice"); assert.equal(G.money, m0); assert.match(said(), /No fried rice here/);
  assert.doesNotMatch(src("engine-parser"), /ยืม\/ดอกเบี้ย/);
});

// ── László: the stack, remembered ───────────────────────────────────────────
test("the floor remembers the shift's own decisions: the monks, the slate, her bus, the man put out", () => {
  owner(); run("talk to lamai"); run("talk to bert");
  G.bar.badRun = 3; G.shiftCall = "merit"; G.shiftWho = null; _shiftYes();
  assert.match(ask("lamai", "the monks"), /Nine monks|monks/); assert.doesNotMatch(said(), /wrong woman/);
  G.shiftCall = "tab"; _shiftYes(); assert.match(ask("bert", "the tab"), /slate|pay-day/);
  G.shiftCall = "early"; G.shiftWho = "jiap"; _shiftNo(); assert.match(ask("lamai", "jiap's bus"), /Jiap asked for her bus|You kept her/);
  G.shiftCall = "turning"; _shiftYes(); assert.match(ask("bert", "that man"), /turned out|put him out|door knows/);
  assert.ok(G.bar.calls.length >= 4);
});
test("last night's football is Bert's to tell; the man on the fifty-one is askable at your own bar; 'my bar' is yours", () => {
  owner(); G.bar.lastEvents = ["a football finish +฿2,200"]; run("talk to bert"); run("talk to lamai"); run("talk to cake");
  assert.match(ask("bert", "the football"), /football finish/); assert.match(said(), /2,200/);
  assert.doesNotMatch(ask("lamai", "tan"), /football|cannot help you/); assert.match(said(), /fifty-one|paper/);
  assert.notEqual(ask("lamai", "tan"), ask("cake", "tan"), "two mouths, two sentences");
  assert.doesNotMatch(ask("lamai", "my bar"), /Not my story|Not a thing I know/);
});
test("WORK after midnight is refused, not taken and voided at the wake; her bus is not dealt at half past eleven", () => {
  owner(); G.nightTurn = 100; out = []; run("work"); assert.match(said(), /midnight has gone/); assert.notEqual(G.bar.workedDay, G.day);
  assert.match(src("engine-systems"), /c\.id !== "early" \|\| \(!!her && G\.nightTurn < 45/);
});
test("a resident is not asked how long he stays, nor the owner whether he owns anything; Tan misses in English", () => {
  G.stage = "expat"; const st = {}; G.convoQ = null; _convoAsk("nid", { asks: { key: "stay", q: "How long you stay?" } }, st); assert.ok(!G.convoQ);
  owner(); G.convoQ = null; _convoAsk("doug", { asks: { key: "invested", q: "You got money in anything?" } }, {}); assert.ok(!G.convoQ);
  G.room = _npcRoom("tan"); G.nightTurn = 30; run("talk to tan"); assert.doesNotMatch(ask("tan", "photosynthesis"), /, na\./);
});
test("the masseuse remembers last time; nobody drives you to the Orchid; the ledger names the table and the desk", () => {
  G.room = "klang_massage"; G.massageLog = { klang_massage: { last: G.day - 1, n: 2 } };
  assert.match(_masseuseTalk("last time"), /Yesterday|hands remember/);
  const st = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Beach Road");
  G.room = st; out = []; run("motosai to orchid"); assert.match(said(), /you get taken/i);
  out = []; run("ask piwin about orchid room"); assert.match(said(), /you get taken/i); assert.doesNotMatch(said(), /Hotel\?/);
  _nightSnapshot(); G.hotel = "sabai"; G.money = 5000; _joinerFee(G.day); G.money -= MASSAGE_SPECIAL; G.massageSpend = (G.massageSpend || 0) + MASSAGE_SPECIAL;
  _morningLedger(); const l = G.lastNightSaid[0]; assert.match(l, /on the massage table/); assert.match(l, /joiner fee/);
});
test("the figures in Tan's job prompts carry their separators, and Bert's cleaners are the cleaners", () => {
  assert.equal((src("world").match(/\(SYN_JOB_NIGHT \* 30\)\.toLocaleString\("en-US"\)/g) || []).length, 3);
  assert.match(src("world"), /the cleaners, the screen men — those come through her/);
  assert.match(src("engine-systems"), /_synState\(\)\.done\[job\.id\] = G\.day/, "the cleaners start tomorrow, so the first ฿120 bills from the night after");
});

// ── the composition audit's first seven ─────────────────────────────────────
test("a woman on your arm: the house pads nobody's tab, WHO lists her at her own bar, your own bar refuses her the barfine", () => {
  G.party = { ids: ["nan"], stops: 1, spent: 0, seen: {} }; G.room = "breakwater"; G.soc.drunk = 4; G.soc.padded = {};
  _pushyUpsell(); assert.ok(!G.soc.padded.breakwater, "no lady drink chalked with her on your arm");
  G.phone.contacts.nan = true; G.soc.drinks.nan = 8; out = []; _doBlackbook(); assert.match(said(), new RegExp("Nan — " + _barName(NPCS.nan.room)));
  owner(); G.party = { ids: ["nan"], stops: 1, spent: 0, seen: {} }; out = []; run("barfine jiap"); assert.doesNotMatch(said(), /She come TOO|TAKE JIAP OUT/i); assert.match(said(), /your own|staff|fee to yourself/i);
});
test("the verdict closes DANCE, TIP and CONTACT; the affair girl will not go out in a downpour", () => {
  G.room = "candy_bar"; G.soc.drinks.lek = 8; G.maiDee = { lek: G.day }; run("talk to lek");
  for (const c of ["dance with lek", "tip lek 100", "contact lek"]) { const h = G.happy; out = []; run(c); assert.equal(G.happy, h, c); assert.ok(!G.phone.contacts.lek, c); }
  owner(); G.affair = { id: "manow", since: G.day - 20, strain: 6, floorSour: 0, crisSeen: [], warned: {}, discovered: false, soured: false, ended: false, crisDay: G.day };
  G.rain = 5; out = []; run("take manow out"); run("take manow out"); assert.equal(G.room, "stinky_bar"); assert.match(said(), /Ask me when it stops/);
});
test("your own staff give the boss no customer register: FLIRT, CONTACT, SEE HOME, a lady drink", () => {
  owner(); run("talk to jiap");
  out = []; run("flirt with jiap"); assert.doesNotMatch(said(), /Buy me drink, funny man|calibrated/); assert.match(said(), /Boss|boss|I work for you/);
  out = []; run("contact jiap"); assert.ok(G.phone.contacts.jiap); assert.doesNotMatch(said(), /big spender/);
  G.nightTurn = 56; out = []; run("see jiap home"); assert.doesNotMatch(said(), /carry your bag/);
  G.nightTurn = 30; const till = G.bar.cash; out = []; run("buy lady drink for jiap"); assert.ok(G.bar.cash > till); assert.doesNotMatch(said(), /calibrated to the exact value/);
  const audit = readFileSync(fileURLToPath(new URL("../../tools/composition-audit.mjs", import.meta.url)), "utf8");
  assert.match(audit, /const COMP_OPEN = \{\n  \/\/ \(none/, "the audit's open list is empty");
});

// ── round 73's leftovers (2026-10-08) ───────────────────────────────────────
test("the soi names the woman: a gossip catch souring the affair knows who, and her register names her", () => {
  owner(); G.affair = { id: "manow", since: G.day - 20, strain: 0, floorSour: 0, crisSeen: [], warned: {}, discovered: false, soured: false, ended: false, crisDay: G.day };   // strain 0: the discovery's +8 must not break it
  _conquestHappy(5, "lek"); assert.deepEqual(G.affair.slipWith, ["Lek"]);
  G.affair.slipDay = G.day - 3; G.bar.workedLast = false; G.day++; out = []; _affairNight({ worked: false });
  assert.ok(G.affair.soured); assert.ok(G.affair.caughtWith.includes("Lek"));
  G.room = "stinky_bar"; G.flags.tanFavourDone = true; while (G.pendingChoice) run("no"); run("talk to manow"); while (G.pendingChoice) run("no");
  assert.match(ask("manow", "lek"), /Lek/); assert.doesNotMatch(said(), /Ask Bert|No idea/);
});
test("CALL TAN from his partner is about the bar, not a lift; TRAVEL announces only when it sets off", () => {
  owner(); G.phone.contacts.tan = true; G.room = "beach_rd_c"; G.nightTurn = 30; out = []; run("call tan");
  assert.match(said(), /Partner|fifty-one|you own a bar/i); assert.doesNotMatch(said(), /last-option man/);
  G.stage = "vacation"; G.flags.barOpen = false; G.flags.barPaid = false; G.bar.owner = false;
  G.room = "jomtien_beach_rd"; G.lightOn = false; G.visited.hotel_room = true; G.nightTurn = 30;
  const path = _path(G.room, "pratumnak_clubs") || [];
  if (path.length && ROOMS[path[0]] && ROOMS[path[0]].dark) { G.visited.doghouse = true; out = []; run("travel doghouse"); assert.doesNotMatch(said(), /let your feet do the remembering/); }
});
test("a prompt takes its answer in Thai: ไป at Cream's door, ไม่ at a yes/no", () => {
  G.room = "metro_garden"; G.nightTurn = 50; G.money = 5000; run("talk to cream");
  G.pendingChoice = "chameleon"; out = []; run("ไม่"); assert.match(said(), /เข้าใจ — no/);
  G.pendingChoice = null; G.pendingEnc = "police"; G.money = 1000; G.soc.drunk = 5; G.room = "beach_rd_c"; out = []; run("ไม่ได้เมาครับ");
  assert.equal(G.money, 1000, "the police keep their own reading of a Thai no");
});
test("THE ACCOUNTANT'S CALL: Nont's money in quantity is a story; she rings in the evening; half the cash for a month", () => {
  owner(); G.room = "stinky_bar"; G.nontOut = ACCT_THRESHOLD + 5000; G.nightTurn = 70;
  assert.equal(_acctDue(), false, "not at gone midnight: an accountant rings after dinner");
  G.nightTurn = 30; assert.equal(_acctDue(), true);
  const cap = _atmCap(); out = []; _acctCall(); assert.match(said(), /Khun Wipa/); assert.match(said(), /Nobody is accusing anybody/);
  assert.equal(_atmCap(), Math.round(cap / 2)); assert.equal(_acctDue(), false, "once, until the money moves again and the gap passes");
  run("talk to bert"); assert.match(ask("bert", "the accountant"), /half your cash for a month/);
  G.room = "buakhao_market"; run("talk to nont"); assert.match(ask("nont", "the accountant"), /use me smaller/);
  G.day += ACCT_REVIEW_DAYS; assert.equal(_atmCap(), cap, "the review ends");
});
