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

// ── Keith's small rows and Mario's rulings, 2026-11-03 ──
test("Keith: TAO RAI on Soi 6 names the room upstairs", () => {
  sandbox(); G.room = "ruby_kiss"; G.nightTurn = 40;   // a Soi 6 bar (the Silk Rose is Soi Buakhao's)
  assert.match(t("tao rai"), /room upstairs ฿[\d,]+ \(flat, all night/);
  G.room = "lucky_tiger"; assert.doesNotMatch(t("tao rai"), /room upstairs/);
});
test("Keith: the morning ledger names the bar's fine as its own movement", () => {
  sandbox(); G.room = _hotelRoomId(); _nightSnapshot();
  G.bfFinePaid = (G.bfFinePaid || 0) + 3700; G.money -= 3700;
  _endNight("sleep");
  assert.match(JSON.stringify(G.lastNightSaid), /฿3,700 of it to a till for her time off the floor/);
  assert.ok(STATE_SCHEMA.life.includes("bfFinePaid"));
});
test("Mario: a three-stop errand's where-clause follows the step — no atTargets", () => {
  sandbox();
  assert.equal(QUESTS.plg_deal.at(G), "terry");
  _setFlag("heardPlgHistory"); assert.equal(QUESTS.plg_deal.at(G), "kesinee");
  _setFlag("heardPlgInside"); assert.equal(QUESTS.plg_deal.at(G), "gavin");
  _setFlag("heardPlgPitch"); assert.equal(QUESTS.plg_deal.at(G), "bert");
  sandbox(); assert.equal(QUESTS.orchid_recon.at(G), "gavin");
  _align("plg", 2); assert.equal(QUESTS.orchid_recon.at(G), "orchid_room");
  G.visited.orchid_room = 1; assert.equal(QUESTS.orchid_recon.at(G), "doyle");
});

// ── Mario's ruling on Keith's major row (2026-11-03): each Soi 6 woman gets her own after-work answer, in her record ──
test("Keith: no two Soi 6 women share the after-work sentence — every one answers from her own record, never the town pool", () => {
  sandbox();
  const pool = [..._AFTER_WORK.floor, ..._AFTER_WORK.house, ..._AFTER_WORK.thai];
  const women = Object.keys(NPCS).filter(id => { const r = _npcRoom(id); return r && ROOMS[r] && ROOMS[r].region === "Soi 6" && _afterWorkTalk(id); });
  assert.ok(women.length >= 90, `the Soi 6 roster the answerer serves: ${women.length}`);
  const seen = new Map();
  for (const id of women) {
    const own = (NPCS[id].dialogue || []).find(d => d.topic === "after work|after hours");
    assert.ok(own && own.text && own.short, `${id} has her own after-work node, with a short for the retell`);
    assert.ok(!pool.includes(own.text), `${id}'s answer is not a pool line`);
    assert.ok(!seen.has(own.text), `${id} shares her answer with ${seen.get(own.text)}`);
    seen.set(own.text, id);
  }
  // through the real path, the three Keith heard share one cigarette: Nuch at the Vic, Sopha at Front Row, View at the Tamarind
  const ask = (id) => { sandbox(); G.nightTurn = 30; G.room = _npcRoom(id); const nm = NPCS[id].name.toLowerCase(); t(`talk to ${nm}`); return t(`ask ${nm} about after work`); };
  const a = ask("nuch"), b = ask("sopha"), c = ask("sweet_tamarind_view");
  assert.match(a, /count the keys/, a); assert.match(b, /four screen off/, b); assert.match(c, /cards down from the wall/, c);
  for (const s of [a, b, c]) assert.ok(!pool.some(p => s.includes(p.slice(1, 30))), "not the pool: " + s);
  // asked twice, she retells her own short — not the engine's brush-off, and not (Keith's minor row) her phone memory
  sandbox(); G.nightTurn = 30; G.room = _npcRoom("pukky"); t("talk to pukky"); t("ask pukky about after work");
  const again = t("ask pukky about after work");
  assert.match(again, /fan on three/, again); assert.doesNotMatch(again, /lonely ten|flat tire|Buy a drink|something new/);
  assert.match(t("ask pukky about after work again"), /lonely ten/);
  // a typed sentence reaches her line; a question with "open" in it keeps naming what pours after two (round 89's pin)
  sandbox(); G.nightTurn = 30; G.room = _npcRoom("kwan"); t("talk to kwan");
  assert.match(t("where do you go after work"), /last crane of the night/);
  assert.match(t("ask kwan about late"), /crane/);
  const open = t("ask kwan about open after two"); assert.doesNotMatch(open, /crane/, open);
  assert.ok(Object.keys(ROOMS).some(r => ROOMS[r].barType && _closeTurn(r) == null && open.includes(_barName(r))), open);
  sandbox(); G.nightTurn = 30; G.room = _npcRoom("air"); t("talk to air");
  assert.ok(pool.some(p => t("ask air about after work").includes(p.slice(1, 30))), "Air, the Blue Dog's cashier on Beach Road, still deals the pool");
});

test("Keith: Jinda's paper-and-the-room line is her own, not Nee's", () => {
  const jinda = NPCS.jade_lounge_jinda.dialogue.find(d => /^bar\|/.test(String(d.topic))).text;
  const nee = NPCS.nee.dialogue.filter(d => d.topic === "pattaya leisure").map(d => d.text);
  assert.ok(nee.length >= 1 && nee.every(x => /They own the paper\. I run the room\./.test(x)), "Nee keeps the company's phrasing");
  assert.doesNotMatch(jinda, /I run the room|have the paper/);
  assert.match(jinda, /name on the paper by the till is theirs/); assert.match(jinda, /is mine/);
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

// ── Mario's five calls on Gordon's and Ray's rows (2026-11-08) ──
test("Mario: a declined screen goes up at the list price, on the bar's books", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("partnerTan"); G.bar = { room: "stinky_bar", cash: 50000, drawn: 0 }; _setFlag("barOpen");
  const job = _synJobById("screen"); assert.ok(job);
  const cash = G.bar.cash; out = []; _synNoBody(job);
  assert.equal(G.bar.cash, cash - SCREEN_LIST); assert.match(said(), /list price/);
});
test("Mario: a bet is the owner's pocket — a lost stake never rings into his till", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); G.bar = { room: "stinky_bar", cash: 50000, drawn: 0 }; _setFlag("barOpen"); G.room = "stinky_bar";
  G.game = { type: "c4", stake: 500 }; const cash = G.bar.cash, money = G.money; out = [];
  _endGame(false, 0, "lost");
  assert.equal(G.bar.cash, cash, "the till is untouched"); assert.equal(G.money, money, "the stake left the pocket when it was laid, not now");
});
test("Ray: a question with no canned replies gets an open chip", () => {
  sandbox(); G.room = _npcRoom("pukky"); G.nightTurn = 30; t("talk to pukky");
  G.convoQ = { id: "pukky", key: "nickname_xyz", q: "what they call you when you were small?" };
  const chips = _chipSet();
  assert.ok(chips.some(c => c.label === "answer her…" && c.cmd.endsWith(" ")), JSON.stringify(chips.slice(0, 6)));
});
test("Ray: SEND HER HOME asks once, and FOLLOW keeps her", () => {
  sandbox(); G.room = "soi6_street"; G.nightTurn = 70; G.party = { ids: ["pukky"], stops: 0, spent: 0, seen: {} };
  assert.match(t("send pukky home"), /again if you mean it/); assert.ok(G.party && G.party.ids.includes("pukky"), "still on your arm");
  t("send pukky home"); assert.ok(!(G.party && G.party.ids && G.party.ids.includes("pukky")), "the second time means it");
});
test("Ray: the barfine picker never offers the mamasan or the till", () => {
  sandbox(); G.room = "ruby_kiss"; G.nightTurn = 40;
  const names = _completePool("barfine", ["barfine"]);
  for (const id of _npcsHere()) if (NPC_ROLES[id] === "mamasan" || NPC_ROLES[id] === "cashier") assert.ok(!names.some(n => n.toLowerCase() === NPCS[id].name.toLowerCase()), NPCS[id].name + " is on the list");
  assert.ok(_npcsHere().some(id => NPC_ROLES[id] === "hostess" && names.some(n => n.toLowerCase() === NPCS[id].name.toLowerCase())), "the hostesses are");
});
