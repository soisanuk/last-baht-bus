// ROUND 110 (2026-10-28) — three personas: Ruud (Opus, an owner who sells at the three-month line and lives on as
// the man who had the bar), Ollie (Fable, an October owner stacking the job, the massage shop and the Orchid Room),
// Kieran (Sonnet, a redundancy pot who rents the condo and lives in it).
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
const owner = () => { sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.cash = 2000; G.bar.nights = BAR_SALE_MIN; };

// ── found building Ruud's seed ──
test("Bert's word on a kept girl gone quiet counts the nights once", () => {
  owner(); G.bar.kept = { id: "manow", stage: "lapsed", lapsed: G.day - 59 };
  _keptAsk(); assert.doesNotMatch(G.keptAskText, /nights nights/); assert.match(G.keptAskText, /59 nights, no money/);
  G.bar.kept.lapsed = G.day - 2; _keptAsk(); assert.match(G.keptAskText, /Two nights, no money/);
});

// ── Ruud ──
const soldTo = via => { owner(); G.room = "stinky_bar"; out = []; _barSaleDo(via); out = []; };
test("Ruud: after a sale the bar's frictions are not his — no stamp, no Hilux, no 'will the bar be all right'", () => {
  soldTo("plg"); const st = _synState(); st.friction = 3; st.frictionDay = -1;
  const saved = _rand; _rand = () => 0;
  try { G.room = "stinky_bar"; out = []; _synFrictionTick(); assert.equal(said(), ""); } finally { _rand = saved; }
});
test("Ruud: WHERE IS MY BAR knows he sold it; it never finds the Golden Dragon", () => {
  soldTo("plg"); G.room = "soi6_west_in"; const r = t("where is my bar");
  assert.doesNotMatch(r, /Golden Dragon/); assert.match(r, /You sold it/);
  owner(); G.room = "soi6_west_in"; assert.match(t("where is my bar"), /Stinky/);
});
test("Ruud: Bert's Candy line is the owner's; after a sale Tan answers selling for the sale that was made", () => {
  soldTo("plg"); G.room = "queen_vic"; assert.doesNotMatch(t("ask bert about candy"), /You went with Tan/);
  const tn = NPCS.tan.dialogue;
  const pick = topic => tn.find(n => n.topic && n.topic.split("|").includes(topic) && (!n.req || n.req.every(f => _flag(f))) && (!n.when || n.when(_npcState("tan"), G)));
  _setFlag("partnerTan"); _setFlag("tanAsked");
  assert.match(pick("selling").text, /fifty-one was a name in my drawer/);
  assert.match(pick("partner").text, /The group/);
  soldTo("bert"); _setFlag("partnerTan"); assert.match(pick("selling").text, /Candy's name on the fifty-one/);
});
test("Ruud: Bert off his own rail drinks a man's drink as a customer, not as a manager", () => {
  soldTo("plg"); G.room = "queen_vic"; assert.ok(_npcsHere().includes("bert"));
  const r = t("buy man drink"); assert.doesNotMatch(r, /a manager who likes you/);
});
test("Ruud: a girl who left before the sale stays gone after it", () => {
  owner(); G.bar.gone = { manow: { day: G.day - 5, kept: true } }; G.room = "stinky_bar"; _barSaleDo("plg");
  G.room = "stinky_bar"; assert.ok(!_npcsHere().includes("manow"));
  assert.ok(!_EXIT_TEXT_KEPT.some(l => /angry in group, i see/.test(l)));
});
test("Ruud: MONEY quotes the manager's wage the offer named, and a company job pays through the books", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); G.player.origin = "redundancy";
  G.job = { kind: "manager", room: "jade_lounge", corp: true, prem: true, nights: 6, stood: 0, since: G.day };
  const r = t("money"); assert.match(r, new RegExp("฿" + _num(_mgrPay(G.job)).replace(",", ",") + " through the books")); assert.doesNotMatch(r, /the envelope at the bar/);
});
test("Ruud: TAKE THE JOB in another bar does not hire him at the last bar that offered", () => {
  sandbox(); G.stage = "expat"; G.jobOffer = { room: "jade_lounge", corp: true, day: G.day }; G.room = "pink_lotus";
  out = []; _takeJob(); assert.ok(!G.job); assert.match(said(), /Jade Lounge's/);
});
test("Ruud: an independent floor does not pay the premium to the man who sold to the group", () => {
  soldTo("plg"); G.barSale.health = "profit";
  const room = Object.keys(ROOMS).find(r => !_companyBar(r) && Object.keys(NPCS).some(id => NPC_ROLES[id] === "mamasan" && _npcRoom(id) === r) && r !== "stinky_bar");
  const mama = Object.keys(NPCS).find(id => NPC_ROLES[id] === "mamasan" && _npcRoom(id) === room);
  G.room = room; out = []; _jobOffer(room, mama);
  if (G.jobOffer) assert.equal(G.jobOffer.prem, false);
});
test("Ruud: a farang manager tells a kept girl's going in his own English", () => {
  owner(); G.room = "stinky_bar"; G.bar.gone = { manow: { day: G.day - 3, kept: true } };
  assert.ok(!_thaiHouse("bert")); assert.ok(_GONE_FARANG_KEPT.length >= 2);
  assert.ok(_GONE_FARANG_KEPT.every(l => !/stop paying|I take her name/.test(l)));
});
test("Ruud: a question at the sale prompt gets one plain sentence and holds the gate", () => {
  owner(); G.room = "stinky_bar"; G.pendingChoice = "barsale"; const m0 = G.money, b0 = G.bank;
  const r = t("what does tan's mean?"); assert.match(r, /what the bar owes comes out of the price/);
  assert.equal(G.pendingChoice, "barsale"); assert.equal(G.money, m0); assert.equal(G.bank, b0);
});
test("Ruud: BOOKS after the sale says what it went for", () => {
  soldTo("plg"); assert.match(t("books"), new RegExp("฿" + _num(G.barSale.paid)));
  soldTo("tan"); assert.match(t("books"), /nothing in the hand/);
});
test("Ruud: one dear night early in the month does not halve the weeks; a new month does not reset them", () => {
  sandbox(); G.stage = "expat"; G.player.origin = "redundancy"; G.money = 20000; G.bank = 300000; G.hotel = "condo"; G.condo = { since: G.day, deposit: 0, short: 0 };
  G.monthRate = 400; G.month = { spent: 400 * 4, rent: 0, days: 4 }; const a = _weeksLeft();
  G.month.spent += 3500; const b = _weeksLeft(); assert.ok(b > a * 0.7, a + " → " + b);
  G.month = { spent: 0, rent: 0, days: 0 }; const c = _weeksLeft(); assert.ok(Math.abs(c - a) <= 2, a + " vs " + c);
});

// ── Ollie ──
test("Ollie: a till that went under names the pocket after it, so the folio's figure is not the last word", () => {
  owner(); G.room = _hotelRoomId(); _nightSnapshot(); G.bar.pocketNight = 500; G.money -= 500; out = []; _morningLedger();
  assert.match(said(), new RegExp("into the till when it went under, on top of that — ฿" + _num(G.money) + " in the pocket now"));
});
test("Ollie: a shift declared too late to stand is not taken", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 55; out = []; _doWork();
  assert.notEqual(G.bar.workedDay, G.day); assert.match(said(), /Too late/);
  owner(); G.room = "stinky_bar"; G.nightTurn = 30; out = []; _doWork(); assert.equal(G.bar.workedDay, G.day);
});
test("Ollie: Tan's screen pitch does not assume the cleaners he was refused; Bert's book and Tan's 'tonight' agree", () => {
  const sc = SYNDICATE_JOBS.find(j => j.id === "screen"); assert.doesNotMatch(sc.ask, /cleaners/);
  owner(); G.room = "stinky_bar"; out = []; _tanFavourYes(); assert.doesNotMatch(said(), /on the book tomorrow/);
});
test("Ollie: Nee does not call a resident a tourist; the house's miss line does not tell him to ask about the bar he asked about", () => {
  sandbox(); G.stage = "expat"; const nee = NPCS.nee.dialogue.filter(n => n.topic === "pattaya leisure");
  const open = nee.find(n => n.when(_npcState("nee") && { trust: 3 }, G)); assert.match(open.text, /for a man who lives here/);
  assert.ok(_TOPIC_MISS_THAI.every(f => !/This bar — everything/.test(f("X"))));
});

// ── Kieran ──
const tenant = () => { sandbox(); G.stage = "expat"; _setFlag("expatLife"); G.player.origin = "redundancy"; G.hotel = "condo"; G.condo = { since: G.day, deposit: 18000, short: 0 }; G.room = "condo_room"; };
test("Kieran: the condo's things are the condo's — the TV, the air-con, the chair, the bay, the key", () => {
  tenant();
  assert.match(t("watch tv"), /no TV in the flat/); assert.doesNotMatch(t("examine tv"), /shophouse/);
  assert.match(t("examine aircon"), /air-con unit that actually works/); assert.doesNotMatch(t("examine chair"), /pavement/);
  assert.match(t("examine bay"), /ninth floor/); assert.doesNotMatch(t("examine window"), /somebody else's air-conditioning\./);
  assert.match(t("sit on the balcony"), /balcony/); assert.doesNotMatch(t("sit on the chair"), /edge of the bed/);
});
test("Kieran: the payday digest counts what is left after the condo's month, not before", () => {
  tenant(); G.condo.since = G.day - 40; G.money = 20000; G.bank = 40000; G.month = { spent: 9000, rent: 0, days: 30 };
  G.payDay = G.day - INCOME_DAYS; _incomeTick();
  const line = (G.monthLine || []).join(" "); const m = line.match(/฿([\d,]+) between the pocket and the account/);
  assert.ok(m, line); assert.equal(Number(m[1].replace(/,/g, "")), G.money + G.bank);
});
test("Kieran: MOTOSAI HOME from his own door is no ride and no fare", () => {
  tenant(); G.room = "pratumnak_soi5"; G.nightTurn = 30; const m0 = G.money; out = []; _doMotosai("home");
  assert.equal(G.money, m0); assert.equal(G.room, "pratumnak_soi5"); assert.match(said(), /Is your home/);
});
test("Kieran: a full man does not cook again for sixty baht", () => {
  tenant(); G.hunger = 0; const m0 = G.money; t("cook"); assert.equal(G.money, m0);
  G.hunger = 60; t("cook"); assert.equal(G.money, m0 - CONDO_MEAL);
});
test("Kieran: PAY RENT answers a tenant; the lease says the account and the month's day, not a payday he hasn't got", () => {
  tenant(); assert.match(t("pay rent"), /out of the account on your month's day/);
  assert.doesNotMatch(t("rent a condo"), /on the payday/);
});
test("Kieran: a soon retest at the clinic is called soon, and the test is what costs nothing", () => {
  tenant(); G.room = "second_rd_c"; G.nightTurn = 20; G.testedDays = [G.day - 4]; out = []; _doClinic();
  assert.doesNotMatch(said(), /Again\? Good — sensible man/); assert.match(said(), /4 day ago/);
  assert.ok(_CLINIC_CLEAN.every(l => !/— it costs nothing at all/.test(l)));
});
