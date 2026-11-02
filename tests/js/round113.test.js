// ROUND 113 (2026-11-02) — the Fable third, on the merged tree of the three November reviews: Keith (a retired ESL
// teacher from Leeds, lens reads-every-line-aloud) played the Soi 6 week and reported every line that rang wrong with
// the room, the speaker and the clock. The Opus and Sonnet personas follow on next week's allowance.
import { test } from "node:test";
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
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000; G.nightTurn = 30;
};
const SRC = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");

test("Keith: the sniped regular has been at it 'since he sat down' at twenty to seven, not 'all evening'", () => {
  sandbox(); G.nightTurn = 6; assert.equal(_snipeSince(), "since he sat down");
  G.nightTurn = 40; assert.equal(_snipeSince(), "all evening");
  for (const f of _SNIPE_LINES) {
    const early = f("Pukky", "since he sat down");
    assert.doesNotMatch(early, /all (evening|night)/, early);
    assert.doesNotMatch(early, /temperature/, "the heat line that follows already reads the room's temperature");
    assert.match(f("Pukky", "all evening"), /Pukky/);
  }
  assert.match(SRC, /_pickVary\(_SNIPE_LINES, "snipe"\)\(NPCS\[id\]\.name, _snipeSince\(\)\)/, "the caller passes the clock");
  assert.match(SRC, /the man who was buying \{n\}'s drinks \{s\}/, "…and so does the heat's cause");
});

test("Keith: a ladyboy who said it at hello does not ask 'you didn't know?' at the barfine", () => {
  sandbox(); G.room = _npcRoom("poy"); G.nightTurn = 30;
  assert.equal(_ladyboyToldAtHello("poy"), false, "not before she has said hello");
  run("talk to poy");
  assert.equal(_ladyboyToldAtHello("poy"), true);
  for (let i = 0; i < 4; i++) {
    out = []; assert.equal(_ladyboyGate("poy"), true);
    assert.doesNotMatch(said(), /You didn't know\?|Not for you, tilac/);
    assert.match(said(), /told you at hello|said it first thing|tell you at hello/);
  }
  assert.ok(_LADYBOY_PASS_TOLD.length >= 3);
});

test("Keith: a drink for the woman on your arm is not a smile calibrated to the baht", () => {
  sandbox(); G.room = "sandy_toes"; G.nightTurn = 40; G.party = { ids: ["nina"] }; G.known.nina = 1;
  assert.equal(_outWithMe("nina"), true);
  for (let i = 0; i < 6; i++) {
    const r = t("buy nina drink");
    assert.doesNotMatch(r, /calibrated to the exact value/, r);
    assert.match(r, /Nina/);
  }
});

test("Keith: Somo knows Leeds — the old names off her uncle's radio", () => {
  for (const v of ["Leeds, for my sins", "leeds united", "West Ham", "Forest"]) {
    const r = _somoTeam(v); assert.match(r, /I know them/, v); assert.doesNotMatch(r, /Small club\?/, v);
  }
  assert.match(_somoTeam("Yeovil"), /Small club\?/);
  assert.match(_somoTeam("Liverpool"), /Right answer/);
});

test("Keith: Somsri diagnoses the third night on the third night, not the second", () => {
  sandbox(); G.room = "ladybird_bar"; G.nightTurn = 30;
  G.day = 2; let r = t("talk to somsri"); assert.doesNotMatch(r, /Third night\?/, r); assert.match(r, /Early|third night/);
  sandbox(); G.room = "ladybird_bar"; G.nightTurn = 30;
  G.day = 3; r = t("talk to somsri"); assert.match(r, /Third night\?/, r);
});

// ── Mario's ruling on Keith's severe row (2026-11-03): conversations are two-party only ──
test("Keith: a question belongs to the conversation it was asked in — turning away drops it, and the new partner takes the line", () => {
  sandbox(); G.room = _npcRoom("somo"); G.nightTurn = 40;
  t("talk to somo"); assert.equal(G.convoQ && G.convoQ.key, "team", "Somo asks");
  const r = t("talk to nu");
  assert.match(r, /Somo lets her question go/); assert.equal(G.convoQ, null);
  assert.ok(!(G.convoLapsed && G.convoLapsed.somo), "not kept for later");
  t("leeds united");
  assert.ok(!(G.player.said && G.player.said.team), "Somo never got the answer through Nu");
  t("talk to somo"); assert.equal(G.convoQ, null, "and she does not come back to it");
  assert.equal(typeof _answerOwner, "undefined", "no answer is routed to another asker by its words");
});

// ── Gordon (Opus, lens claims-ledger): an owner through the money — five dawns, three buyers, every figure checked ──
const owner = () => { sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.cash = 2000; G.bar.nights = BAR_SALE_MIN; };

test("Gordon: the night's own money is named in BOOKS by what it was, never by its id ('allin +฿1,500')", () => {
  for (const ev of WORK_NIGHTS) if (ev.money) assert.ok(ev.label && /\s/.test(ev.label), `${ev.id} carries a label`);
  owner(); G.room = "stinky_bar"; G.nightTurn = 40; G.bar.eventNotes = [];
  const allin = WORK_NIGHTS.find(e => e.id === "allin"); _barEvent(allin.money, allin.label || allin.id);
  out = []; _doBooks(); assert.match(said(), /every regular in at once \+฿1,500/); assert.doesNotMatch(said(), /\ballin\b|\bfooty\b|\bmillionaires\b/);
});

test("Gordon: the bell on your own rail names the ฿200 of stock the till never saw", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 40; G.money = 20000; G.bar.eventNotes = []; const c0 = G.bar.cash, m0 = G.money;
  run("ring bell");
  const price = m0 - G.money, keep = G.bar.cash - c0;
  assert.equal(keep, Math.round(price * (1 - BAR_COGS)));
  assert.equal(G.bar.eventNotes.length, 1); assert.match(G.bar.eventNotes[0], new RegExp(`฿${_num(price)} less its stock \\+฿${_num(keep)}`));
});

test("Gordon: a regular's slate still on the docket goes with the bar, named at the signing and on the morning's ledger", () => {
  for (const via of ["plg", "bert", "tan"]) {
    owner(); G.room = "stinky_bar"; G.bar.tabDue = { day: G.day + 2, amt: 1200, pays: true }; G.ledgerNotes = [];
    const saved = _npcRoom; out = []; _barSaleDo(via);
    assert.match(said(), /A regular's slate, ฿1,200, is still on the docket/, via);
    assert.ok(G.ledgerNotes.some(n => /slate of ฿1,200 left on the docket/.test(n)), via + ": the morning names it");
    assert.equal(G.bar.tabDue, undefined, via + ": the docket is not yours any more");
  }
});

test("Gordon: the Tan sale's morning names the note that went with the bar, and whose fee the rest was", () => {
  owner(); G.room = "stinky_bar"; G.bar.owed = 1605000; G.ledgerNotes = []; out = []; _barSaleDo("tan");
  assert.ok(G.ledgerNotes.some(n => /the note to Ohio, ฿1,605,000, went to the Chonburi man/.test(n) && /Tan's fee/.test(n)));
  owner(); G.bar.owed = 1605000; G.ledgerNotes = []; out = []; _barSaleDo("plg");
  assert.ok(!G.ledgerNotes.some(n => /Chonburi/.test(n)), "the PLG morning says it on the price line already");
});

test("Gordon: TIME on a quiz night does not name the owner's own bar as a venue (the quiz never plays there)", () => {
  owner(); let day = null;
  for (let d = G.day; d < G.day + 400 && day == null; d++) { G.day = d; if (_quizDay() && _quizBars().includes("stinky_bar")) day = d; }
  assert.ok(day != null, "a quiz night at the Stinky exists in the hash");
  G.day = day; G.room = "stinky_bar"; G.nightTurn = 25;
  assert.equal(_quizHere(), false);
  out = []; run("time");
  assert.doesNotMatch(said(), /Quiz night[^\n]*Stinky/); assert.match(said(), /your own rail, where you are the house/);
  G.day = day; G.room = "beach_rd_c"; out = []; run("time"); assert.doesNotMatch(said(), /Quiz night[^\n]*Stinky/, "it is yours wherever you stand");
  G.flags.barOpen = false; out = []; run("time"); assert.match(said(), /Quiz night[^\n]*Stinky/, "for a man who owns no bar it is a venue like any other");
});

test("Gordon: the morning that names what came out of the machine names what went in", () => {
  sandbox(); G.stage = "expat"; G.money = 12000; G.bank = 30000; G.atmIn = 0; _nightSnapshot();
  G.room = "dongtan_rd_n"; assert.ok(ROOMS[G.room].atm); run("deposit 5000"); assert.equal(G.money, 7000);
  G.day++; out = []; _morningLedger();
  assert.match(G.lastNightSaid[0], /฿5,000 went into the machine, pocket to account/);
  assert.doesNotMatch(G.lastNightSaid[0], /down ฿5,000|up ฿5,000/, "a deposit is not a night's spending");
});

test("Gordon: BOOKS' 'up N%' is the rent's actual step — ฿15,000 to ฿17,500 is seventeen percent, not fifteen", () => {
  owner(); G.bar.rentUp = 0; const base = _barRent(); G.bar.rentUp = BAR_RENT_RISE;
  const pct = Math.round((_barRent() / base - 1) * 100);
  assert.equal(_barRentUpPct(), pct); assert.notEqual(pct, 15, "the ฿500 rounding makes the step bigger than the constant");
  G.room = "stinky_bar"; out = []; _doBooks(); assert.match(said(), new RegExp(`up ${pct}% since you opened`));
});

test("Gordon: the cashier's texts do not ask the boss to bring what no verb can bring", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /small notes\. 20s\. bank close at 4 so you bring na/);
  assert.match(src, /tomorrow i go bank before open for 20s/);
});

test("Gordon: the close-of-night figure she turns to you is BOOKS' figure, and the line says so", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /writes the figure in the book, and turns it to you — the same figure BOOKS gives you/);
});

test("Gordon: a toast at the bar he manages never catches the cashier's eye for a chit nobody writes", () => {
  sandbox(); G.stage = "expat"; G.job = { kind: "manager", room: "stinky_bar" }; G.room = "stinky_bar"; G.soc.selfDrinks = { stinky_bar: 1 };
  assert.ok(_atJobBar());
  for (const f of _toastFor("jiap")) assert.doesNotMatch(f.toString(), /chit/);
  G.job = null; assert.ok(_toastFor("jiap").some(f => /chit/.test(f.toString())), "a customer's drink still has its chit");
});

// ── Ray (Sonnet, lens taps-only-phone): the Soi 6 week on a phone, never a typed word ──
const soi6 = () => { sandbox(); G.mode = "soi6"; G.money = 30000; };
const sniped = (id) => {   // a state where the regular at her elbow is buying her drinks, by the engine's own test
  G.room = _npcRoom(id); G.known[id] = 1; G.soc.drinks[id] = 1; G.soc.drinkCount = {}; G.soc.patronBusy[G.room] = id; G.soc.patronMiffed[G.room] = false; G.soc.heat[G.room] = 0;
  for (let t = 20; t < 90; t += 3) { G.nightTurn = t; if (_snipeOn(id)) return true; }
  return false;
};

test("Ray: the Soi 6 barfine does not say 'one drink first, then upstairs' over a regular who is buying her drinks", () => {
  soi6(); assert.ok(sniped("pukky"), "the engine can put a regular at Pukky's elbow");
  out = []; run("barfine pukky");
  assert.doesNotMatch(said(), /BUY DRINK FOR PUKKY|Then upstairs|One lady drink first/);
  assert.match(said(), /Another lady, or another bar/); assert.match(said(), /since he sat down|all evening/);
  assert.equal(G.soc.heat[G.room] || 0, 0, "asking costs nothing");
  // the same predicate the lady drink reads: buying it anyway is still the bad form it was
  out = []; run("buy pukky drink"); assert.ok(G.soc.patronMiffed[G.room], "the drink over his head still fires the snipe");
  assert.ok(_BF_SNIPED.length >= 3);
  // …and never on your own rail
  G.flags.barOpen = true; G.bar.room = G.room; assert.equal(_snipeOn("pukky"), false); G.flags.barOpen = false;
});

test("Ray: 'last time' on the night itself is not 'all night, and in the morning' — the night is not finished", () => {
  soi6(); const id = "may"; G.room = _npcRoom(id); G.known[id] = 1; G.nightTurn = 50;
  (G.wentWith = G.wentWith || {})[id] = { day: G.day, turn: 30, kind: "out" };
  out = []; assert.equal(_wentWithTalk(id, "last time"), true);
  assert.doesNotMatch(said(), /in the morning|All night/); assert.match(said(), /not finished|Last time is now|Buy the ending first/);
  G.wentWith[id] = { day: G.day - 1, turn: 30, kind: "lt" }; out = []; _wentWithTalk(id, "last time"); assert.match(said(), /Last night|All night|Long night/);
  G.wentWith[id] = { day: G.day, turn: 30, kind: "st" }; out = []; _wentWithTalk(id, "last time"); assert.match(said(), /Upstairs, tonight|Tonight, upstairs/);
});

test("Ray: BUY LINGERIE FOR <lady> completes to the women in the room, the way a drink does", () => {
  soi6(); G.room = _npcRoom("pukky"); G.nightTurn = 30;
  const names = _npcsHere().filter(i => NPC_ROLES[i] === "hostess").map(i => NPCS[i].name.toLowerCase());
  assert.ok(names.length >= 1);
  const got = engineComplete("buy lingerie for ");
  for (const n of names.slice(0, 3)) assert.ok(got.includes(n), `${n} in ${JSON.stringify(got)}`);
  assert.ok(!got.includes("beer"));
});

test("Ray: Mort's READ THE COLUMN is a parenthesised hint, so a thumb can tap it", () => {
  const texts = []; const walk = v => { if (typeof v === "string") texts.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  walk(NPCS.mort.dialogue || NPCS.mort.nodes || NPCS.mort);
  const hits = texts.filter(t => /READ THE COLUMN/.test(t));
  assert.ok(hits.length >= 3, "the three lines are still there");
  for (const t of hits) assert.match(t, /\(READ THE COLUMN[^)]*\)/, t.slice(0, 80));
});

test("Ray: the wheel and the chip name the woman-on-your-arm action the same way", () => {
  const term = readFileSync(fileURLToPath(new URL("../../web/js/term.js", import.meta.url)), "utf8");
  assert.match(term, /leadme:\s*l => \(\{ t: "follow her"/); assert.doesNotMatch(term, /let her lead/);
});
