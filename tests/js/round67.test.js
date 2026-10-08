// Round 67 (2026-10-07) — three Fable personas aimed at the coverage map's dark cells:
// Lothar (owner-invoices-vs-mouths: a seeded owner who says yes to every job and reconciles the
// arrangements line against four mouths), Jens (thai-through-the-body), Marguerite
// (happiness-ledger, through the never-spoken-to names). Lothar's verdict: "the figures are
// right and the people have simply not been told what they said yesterday."
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const said = () => out.map(o => o.text).join("\n");
const run = c => doCommand(c);
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 9000; G.bank = 30000; G.nightTurn = 30; out = [];
});
const owner = () => {
  G.stage = "expat"; for (const f of ["expatLife", "barOpen", "barPaid", "barPartner", "partnerTan", "tanAsked", "tanFavourDone"]) _setFlag(f);
  G.tanFavourDay = G.day;
  G.bar = Object.assign(G.bar || {}, { room: "stinky_bar", cash: 20000, owed: 100000, worked: 5, declared: 5, stoodTurns: 30 });
  G.room = "stinky_bar";
};
const ask = (id, t) => { run(`talk to ${id}`); out = []; run(`ask ${id} about ${t}`); return said(); };

// ── Lothar ───────────────────────────────────────────────────────────────────
test("a man who has repaid Nira and asks about debt is square — never Pim's twelve thousand; REPAY reaches her loan", () => {
  G.room = "neon_paradise"; G.loanRepaid = 12000; G.loan = null;
  assert.match(ask("nira", "debt"), /square|owe me nothing|Not yours/);
  assert.doesNotMatch(said(), /Twelve thousand|it grows/);
  G.loan = { owed: 6000, dueDay: G.day + 2 }; assert.match(ask("nira", "repay"), /฿6,000/);
});
test("a text from your own staff can be asked about at your own bar, and a woman never texts the same thing twice inside her pool", () => {
  owner(); _pushMsg("lamai", "the uncle bring 3 crate short again. i write it. you pay only what come"); run("check messages");
  assert.match(ask("lamai", "crates"), /crate|uncle/i);
  assert.match(ask("lamai", "the uncle"), /crate|uncle/i);
  // the per-woman book: six lines from one pool before any repeats, then the book turns over
  const pool = ["a", "b", "c", "d", "e", "f"], got = []; const saved = _rand;
  try { _rand = () => 0.37; for (let i = 0; i < 6; i++) got.push(_staffTextPick("cake", pool)); } finally { _rand = saved; }
  assert.equal(new Set(got).size, 6, got.join(""));
  assert.ok(pool.includes(_staffTextPick("cake", pool)), "the seventh turns the book over rather than going silent");
});
test("Bert reads his own night in the first person; a hostess points at the woman who keeps the book", () => {
  owner(); G.bar.lastLines = { day: G.day - 1, take: 2552, nut: 250, cogs: 500, wages: 1800, mgr: 700, proc: 0, worked: false, declaredOnly: false, notes: [] };
  const b = ask("bert", "last night"); assert.match(b, /me ฿700|I ran it/); assert.doesNotMatch(b, /Bert ran it|Bert ฿/);
  assert.match(ask("mew", "the book"), /Cake|the till/); assert.doesNotMatch(said(), /opens the book|I write everything/);
});
test("the arrangements are pooled on the floor, and Tan answers the BOOKS word from his own table", () => {
  owner(); G.syn = _synState(); G.syn.done = { cleaning: true, screen: true };
  const lines = new Set(); const saved = _rand;
  try { for (const r of [0.01, 0.4, 0.8]) { _rand = () => r; lines.add(ask("lamai", "arrangements")); } } finally { _rand = saved; }
  assert.ok(lines.size >= 2, "one sentence came out of five mouths");
  G.room = _npcWhere("tan") || NPCS.tan.room; assert.match(ask("tan", "arrangements"), /cleaners and the screen men|฿240/);
  G.syn.done = {}; assert.match(ask("tan", "arrangements"), /none yet/);
});
test("the night after his favour Tan does not say he never comes", () => {
  owner(); G.room = _npcWhere("tan") || NPCS.tan.room;
  assert.match(ask("tan", "bar"), /I came once/);
  G.flags.tanAsked = false; G.talked.tan = []; assert.match(ask("tan", "bar"), /I do not come/);
});
test("the nurse names the price when the price is the question", () => {
  G.room = "second_rd_c"; out = []; run("ask nurse about price"); assert.match(said(), /Free for the basic/);
});
test("your own glass is a BOOKS line, so the itemisation ties to the till", () => {
  owner(); G.bar.lastOwnStock = 15; G.bar.lastLines = { day: G.day - 1, take: 2552, nut: 250, cogs: 500, wages: 1800, mgr: 700, proc: 0, worked: false, declaredOnly: false, notes: [] }; out = []; run("books"); assert.match(said(), /Your own glass: ฿15/);
  // and the hook that fills it
  G.bar.cash = 1000; G.bar.ownStock = 0; _ownStock(80, "water"); assert.ok(G.bar.ownStock > 0, "_ownStock writes the book");
});
test("the morning ledger names a walk-out", () => {
  G.room = "neon_paradise"; _kickOut(); assert.ok(G.kickedTonight && G.kickedTonight.n === 1);
  G.room = _hotelRoomId(); _nightSnapshot(); run("sleep"); run("sleep");
  assert.match((G.lastNightSaid || []).join("\n"), /walked out of Neon Paradise A-Go-Go by security/);
  assert.equal(G.kickedTonight, null, "reset for the new night");
});
test("a shift tale never moves money the books did not see; a reveal is habitual, not a claim about tonight", () => {
  assert.ok(!_WORK_SEEN.some(l => /buys a round for the rail/.test(l)));
  assert.ok(_FLOOR_CASHIER.some(l => /whatever the figure says/.test(l)) && !_FLOOR_CASHIER.some(l => /the night you were down|on a night you are down/.test(l)));   // habitual, and money-blind (Ossie, round 70)
  assert.match(SYNDICATE_JOBS.find(j => j.id === "screen").ask, /every month, like the cleaners/);
});
test("BORROW from the pavement after asking her points inside, not back at the question", () => {
  G.room = "neon_paradise"; run("talk to nira"); run("ask nira about loan");
  G.room = "ws_north"; out = []; run("borrow 5000"); assert.match(said(), /inside Neon Paradise|does not do business through a door/);
});

// ── Jens: Thai through the body ───────────────────────────────────────────────
const legitShop = () => Object.keys(ROOMS).find(r => ROOMS[r].massage === "legit");
test("เท่าไหร่ in a massage shop quotes the board; the board itself carries the figure", () => {
  G.room = legitShop(); out = []; run("เท่าไหร่"); assert.match(said(), new RegExp("฿" + MASSAGE_LEGIT));
  out = []; run("read price list"); assert.match(said(), new RegExp("฿" + MASSAGE_LEGIT));
});
test("MASSAGE on a street with a shop on it points at the door; thanks in a shop with a woman in it reach her", () => {
  G.room = "jomtien_beach_rd"; out = []; run("นวด"); assert.match(said(), /is right here|ENTER/);
  G.room = legitShop(); const shop = SHOP_MASSEUSES[G.room]; out = []; run("ขอบคุณครับ");
  if (shop && !_npcsHere().length) assert.match(said(), new RegExp(shop.name + " wais back"));
});
test("PAY at Nira's rail with a live loan is REPAY; the piwin places a venue by name", () => {
  G.room = "neon_paradise"; G.loan = { owed: 2400, dueDay: G.day + 2, borrowed: 2000 }; run("talk to nira");
  out = []; run("จ่ายห้าร้อย"); assert.equal(G.loan.owed, 1900, said());
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai); out = []; run("ask piwin about neon paradise");
  assert.match(said(), /Walking Street/); assert.doesNotMatch(said(), /Who\?/);
  out = []; run("ask piwin about clinic"); assert.match(said(), /Second Road/);
});
test("CHECK BIN is the total since you sat down — the Owl's column teaches it", () => {
  G.room = "beach_rd_c"; _arriveAt("candy_bar"); run("buy beer"); out = []; run("check bin");
  assert.match(said(), new RegExp("฿" + BEER_PRICE + " since you sat down|฿" + _beerPrice("candy_bar") + " since you sat down"));
  assert.ok(_OWL_ARRIVED.some(f => /CHECK BIN/.test(String(f))), "the column still teaches it");
  assert.ok(engineComplete("check ").some(c => /bin/.test(c)));
});
test("the glosses a Thai speaker reaches for: อ่านป้าย reads the sign, ข้อความ opens the inbox, ไม่ครับ is no, หนึ่ง answers the quiz", () => {
  G.room = "tt_entrance"; out = []; run("อ่านป้าย"); assert.match(said(), /read sign/);
  _pushMsg("tan", "you find the bus ok?"); out = []; run("ข้อความ"); assert.doesNotMatch(said(), /Message whom/);   // the inbox, not a send prompt
  assert.match(said(), /sends one back|you find the bus ok/);
  out = []; run("ไม่ครับ"); assert.match(said(), /เข้าใจ — no/);
  G.day = 4; G.nightTurn = 25; G.room = _quizBars()[0]; _startQuiz(true); out = []; doCommand("หนึ่ง");
  assert.doesNotMatch(said(), /microphone is patient/);
});
test("a NO in the breath after the masseuse's hands asked is the answer", () => {
  G.soc.specialAsk = { room: "lotus_oil", turn: G.turns }; G.room = "lotus_oil";
  if (!ROOMS[G.room]) { G.room = Object.keys(ROOMS).find(r => ROOMS[r].massage === "oil"); G.soc.specialAsk.room = G.room; }
  out = []; run("no"); assert.match(said(), /the hour is just an hour/);
});
test("the nurse's first visit is a first visit, and the clinic's clean line does not say free twice", () => {
  G.room = "second_rd_c"; G.testedDays = []; const saved = _rand;
  try { for (const r of [0.01, 0.4, 0.7, 0.99]) { _rand = () => r; out = []; run("talk to nurse"); assert.doesNotMatch(said(), /You come back\?/); } } finally { _rand = saved; }
  assert.ok(!_CLINIC_CLEAN.some(l => /and free, at that/.test(l)));
});
test("Bee's bottle is a topic before and after it lands; Jiap and Jeab do not share a Thai name", () => {
  G.room = NPCS.bee.room; run("talk to bee"); out = []; run("ask bee about sang som"); assert.match(said(), /gap|Not yet/);
  _setFlag("beeBanked"); out = []; run("ask bee about the bottle"); assert.match(said(), /My bottle|closed until my bar/);
  assert.notEqual(NPCS.jiap.th, NPCS.jeab.th);
});
test("the journal hears a region said aloud, and ASK TAN is offered only where Tan is", () => {
  _learnVenues("Bee? My Sang Som girl at Myth Night."); assert.ok(G.heardRegion && G.heardRegion["Myth Night"]);
  G.room = "stinky_bar"; const w = _questWhere("bee"); assert.match(w, /Myth Night/); assert.doesNotMatch(w, /ASK TAN/);
});

// ── Marguerite: the happiness ledger ─────────────────────────────────────────
test("a two-woman bar has no mamasan to pay, shake a head or look up", () => {
  G.room = "moonshine_bar"; G.nightTurn = 40; G.soc.drinks.mek = 15;
  assert.ok(!_npcsHere().some(n => NPC_ROLES[n] === "mamasan"), "Moonshine has no mamasan");
  assert.doesNotMatch(_bfPayee(), /mamasan/);
  assert.doesNotMatch(_mamaRef(), /girl on the till/);
});
test("a kept girl answers SHORT TIME with her calendar, not a yes", () => {
  const id = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && _hasSponsor(i) && !_drinksOnly(i));
  let d = G.day; for (let k = 0; k < 30 && !_sponsorInTown(id); k++) G.day = ++d;
  if (_sponsorInTown(id) && !_sponsorFamilyDay(id) && _npcActive(id)) {
    G.room = _npcRoom(id); G.nightTurn = 40; run(`talk to ${id}`); out = []; run(`ask ${id} about short time`);
    assert.match(said(), /take care me|Cannot now/); assert.doesNotMatch(said(), /You want go with me\? Okay/);
  }
});
test("the stated count is the count: buy exactly what she names and the barfine proceeds", () => {
  G.room = "lucky_tiger"; G.nightTurn = 40; G.money = 50000; run("talk to rung"); out = []; run("barfine rung");
  const m = said().match(/(one|\d+) more/); if (m) {
    const n = m[1] === "one" ? 1 : +m[1];
    for (let i = 0; i < n; i++) run("buy rung a drink");
    out = []; run("barfine rung"); assert.doesNotMatch(said(), /more, then we talk/);
  }
});
test("a woman with her own return node is not also given the town's; the first night's ledger keeps the opening's สนุก baseline", () => {
  G.prevBond = { thip: 3 }; G.returned = {}; G.room = "khao_talo_strip"; out = []; _arriveAt("mama_yai");
  assert.doesNotMatch(said(), /You come BACK!/);
  G.lastNight = { vacation: G.vacation, happy: 0, money: 5000, bank: 0 }; G.happy = 25; out = []; _morningLedger();
  assert.match((G.lastNightSaid || []).join("\n"), /\+25 สนุก/);
});
test("money that arrived in the account is on the morning ledger", () => {
  G.lastNight = { vacation: G.vacation, happy: G.happy, money: G.money, bank: 20000, atm: 0, atmFees: 0, sentB: 0 }; G.bank = 20300;
  out = []; _morningLedger(); assert.match((G.lastNightSaid || []).join("\n"), /฿300 arrived in the account/);
});
test("Mama Yai can discuss the Februaries once Thip has; Preeda's salon is her plan; the arch keeps no clock; Candy's vouch opens on CLUB", () => {
  G.room = "mama_yai"; run("talk to yai"); out = []; run("ask yai about thip"); assert.doesNotMatch(said(), /Nine Februaries/);
  G.talked.thip = [0]; out = []; run("ask yai about february"); assert.match(said(), /Nine Februaries/);
  assert.match(_pickDialogue("preeda", "salon").topic, /^plan/);
  assert.ok(!ROOMS.buakhao_tt.lateDesc.some(l => /Past three/.test(l)));
  assert.match(_pickDialogue("candy", "club").topic, /rose/);
});
test("the quiz badge keeps the clock; an open front is not a villa's; one text per woman per night", () => {
  G.day = 4; G.nightTurn = 25; out = []; run("score"); assert.match(said(), /QUIZ NIGHT 20:00-22:00/);
  G.nightTurn = 45; out = []; run("score"); assert.match(said(), /done for tonight/); assert.doesNotMatch(said(), /20:00-22:00/);
  G.room = "nottys_place"; assert.ok(!_roomFit(["the whole open front a few degrees warmer", "the room settles"]).some(l => /open front/.test(l)));
  G.phone.contacts.lek = true; G.phone.contacts.nan = true; G.known.lek = G.known.nan = true; (G.phone.textDay = {}).lek = G.day; G.phone.lastText = -100; G.room = "stinky_bar";
  const n0 = G.phone.inbox.length; const saved = _rand; try { _rand = () => 0; for (let i = 0; i < 6 && G.phone.inbox.length === n0; i++) { G.phone.lastText = -100; _maybeIncomingText(); } } finally { _rand = saved; }
  for (const m of G.phone.inbox.slice(n0)) assert.notEqual(m.from, "lek", "she texted already tonight — the other woman's turn");
});
test("the sunrise's bike home is paid for", () => {
  G.room = "beach_rd_c"; G.nightTurn = 112; G.money = 5000; run("watch sunrise"); out = []; run("watch sunrise");
  if (/\bbike\b/.test(said())) assert.match(said(), new RegExp("฿" + MOTOSAI_TOWN + " for the bike"));
});
