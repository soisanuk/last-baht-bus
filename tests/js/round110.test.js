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
  const r = t("what does tan's mean?"); assert.match(r, /the bar goes with what it owes/);
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

// ── the deferred list, closed (2026-10-28, Mario: "fix the deferred lines") ──
test("Ollie: the Orchid doorman says the lounge is for the group's friends and guests", () => {
  sandbox(); for (const l of _ORCHID_BOUNCER) assert.match(l, /friends?\b/i);
  assert.ok(_ORCHID_BOUNCER.every(l => /guests/.test(l)));
  assert.ok(!_ORCHID_BOUNCER.some(l => /everybody knows how that works/i.test(l)));
});
test("Kieran: Tan's frontier text is in his own words, never the journal's narration", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife");
  for (const f of _frontier(8)) if (f.tan) assert.doesNotMatch(f.tan, /^You |You have never|You saw/);
  const fr = _frontier(8).filter(f => f.tan);
  if (fr.length) { const before = (G.phone.inbox || []).length; G.phone.stuckTan = null;
    for (const m of (G.phone.inbox || []).slice(before)) if (m.from === "tan") assert.doesNotMatch(m.text, /try this — You/); }
});
test("Kieran: a woman he was warm with stays in the black book after a month away, marked gone cold", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); G.soc.drinks.nina = 4;
  for (let i = 0; i < 20; i++) { G.room = _hotelRoomId(); out = []; _endNight("sleep"); }
  assert.equal(_bondTier("nina"), 0);
  const r = t("who"); assert.match(r, /Nina/); assert.match(r, /gone cold/);
  assert.match(t("black book"), /Nina/);
});
test("Ollie: QUESTS names where the name was HEARD, never 'Candy — at Your Room'", () => {
  sandbox(); G.stage = "expat"; G.known.candy = true; (G.namedBy = G.namedBy || {}).candy = { room: _hotelRoomId(), by: null };
  (G.visited = G.visited || {})[_hotelRoomId()] = true;
  const f = _frontier(8).find(x => x.kind === "person" && /Candy/.test(x.text));
  if (f) { assert.doesNotMatch(f.text, /— at /); assert.match(f.text, /while you were home/); }
});
test("Ruud: FIND TAN mid-conversation is where he is, not the woman's Tan lore", () => {
  sandbox(); G.known.tan = true; (G.talked = G.talked || {}).tan = [0]; G.nightTurn = 40; G.room = _npcRoom("cake");
  run("talk to cake"); const r = t("find tan");
  assert.doesNotMatch(r, /You asked Cake about/); assert.match(r, /walks the soi/);
});
test("Ruud: Tan on the walk turns his phone, not a glass he does not have, and leans on no car", () => {
  sandbox(); G.nightTurn = 40; assert.notEqual(_npcRoom("tan"), "soi6_street");
  const s = _tanOnFoot("\"Sell?\" Tan turns his glass a quarter. A small smile over the car roof. He settles back against the car.");
  assert.doesNotMatch(s, /glass|car/); assert.match(s, /phone a quarter/);
  G.nightTurn = 2; if (_npcRoom("tan") === "soi6_street") { assert.match(_tanOnFoot("Tan turns his glass a quarter."), /phone/); assert.match(_tanOnFoot("He settles back against the car."), /car/); }
});
test("Ruud: the manager walking back onto his floor is not pitched the stairs", () => {
  sandbox(); G.stage = "expat"; G.job = { kind: "manager", room: "jade_lounge", corp: true, since: G.day };
  G.room = "jade_lounge"; (G.visited = G.visited || {}).jade_lounge = true;
  for (let i = 0; i < 6; i++) { out = []; _describeRoom(); assert.doesNotMatch(said(), /nod at the stairs|then upstairs|talk about upstairs/); }
});
test("Ollie: an offered job can be declined, for free", () => {
  sandbox(); G.stage = "expat"; G.room = "stinky_bar"; G.jobOffer = { room: "stinky_bar", corp: false, day: G.day };
  const st0 = JSON.stringify(G.standing || {});
  const r = t("decline the job"); assert.equal(G.jobOffer, null); assert.doesNotMatch(r, /asked .* about/i);
  assert.equal(JSON.stringify(G.standing || {}), st0);
  assert.doesNotMatch(r, /\bher face\b/);   // Bert is a he
  G.jobOffer = { kind: "school", day: G.day }; t("no thanks to the job"); assert.equal(G.jobOffer, null);
});
test("Ruud: WORK typed at Tan's question says the shift was not started", () => {
  owner(); _setFlag("partnerTan"); G.nightTurn = 35; G.room = "stinky_bar"; out = []; _tanFavour();
  const r = t("work"); assert.match(r, /shift is not started/); assert.equal(G.pendingChoice, "tanfavour");
});
test("Ollie: a floor woman's text, said to his face, asserts nothing about now", () => {
  for (const f of _TEXT_SUBJECT_FLOOR.concat(_TEXT_SUBJECT_THAI)) assert.doesNotMatch(f("Lamai", "birthday tonight"), /Same now|Nothing change/);
});
test("Ollie: the massage board and the legit hour are pooled deep enough to walk four shops", () => {
  sandbox(); G.room = "klang_massage"; const seen = new Set();
  for (let i = 0; i < 4; i++) { out = []; G.money = 5000; G.nightTurn = 20; run("massage thai"); seen.add(said().slice(0, 40)); }
  assert.ok(seen.size >= 2, [...seen].join(" | "));
  assert.ok((String(_doMassage).match(/MASSAGE_LEGIT\)\}/g) || []).length >= 12);   // three lines a kind, four kinds
});
test("Ruud: the rail, the floor and the columnist answer for the sale — and Mort's notebook drops 'the American's shop'", () => {
  soldTo("plg"); G.room = "queen_vic";
  for (const id of ["terry", "mort", "doyle"]) { G.known[id] = true; (G.talked = G.talked || {})[id] = [0];
    const r = t(`ask ${id} about the stinky`); assert.doesNotMatch(r, /the American's shop/); assert.match(r, /Pattaya Leisure/); }
  owner(); G.room = "queen_vic"; G.known.mort = true; assert.doesNotMatch(t("ask mort about the stinky"), /the American's shop/);
});
test("Kieran: the homebody's verbs at the condo — each one answered, the nap an hour", () => {
  sandbox(); G.stage = "expat"; G.hotel = "condo"; G.condo = { since: G.day, deposit: 18000, short: 0 }; G.room = "condo_room";
  for (const c of ["tidy up", "make the bed", "lock the door", "make tea", "read a book"]) assert.doesNotMatch(t(c), /soi blinks|don't know|Not here/i, c);
  const n0 = G.nightTurn; t("nap"); assert.ok(G.nightTurn - n0 >= 10);
  for (const k of Object.keys(_HOME_LINES)) for (const l of _HOME_LINES[k]) assert.doesNotMatch(l, /goes dark|come on along|light outside has changed/);
});
test("Kieran: the juristic office answers rent, guests and the key from the lease's own figures", () => {
  sandbox(); G.stage = "expat"; G.hotel = "condo"; G.condo = { since: G.day, deposit: 18000, short: 0 }; G.room = "condo_room";
  assert.match(t("ask the office about rent"), new RegExp(_num(CONDO_RENT)));
  assert.match(t("ask juristic about guests"), /ID/);
  assert.match(t("ask the office about moving out"), /MOVE OUT/);
  assert.doesNotMatch(t("ask the office about the pool"), /Pool, no/);   // the condo has a pool (_HOTELS.condo.pool)
});
test("the sale says, in plain words, that the till's cash is the seller's and goes to his account", () => {
  for (const via of ["plg", "tan", "bert"]) {
    owner(); G.bar.cash = 12000; G.room = "stinky_bar"; const b0 = G.bank; out = []; _barSaleDo(via);
    assert.match(said(), /฿12,000 in the till comes with you/);
    assert.match(said(), /not for the money it has already made/);
    assert.ok(G.bank >= b0 + 12000);
    if (via === "tan") assert.doesNotMatch(said(), /on top of the price/);
  }
  owner(); G.bar.cash = 0; G.room = "stinky_bar"; out = []; _barSaleDo("plg"); assert.doesNotMatch(said(), /in the till comes with you/);
});

// ── the round 106 and 109 deferred lists, closed (2026-10-28) ──
test("Gary (109): READ DARTBOARD is not the Vic's kitchen board; the papers carry no real-world date", () => {
  sandbox(); G.room = "queen_vic"; assert.doesNotMatch(t("read dartboard"), /KITCHEN/); assert.match(t("read menu"), /KITCHEN/);
  if (typeof LOTTO !== "undefined" && LOTTO) assert.doesNotMatch(String(_doLottery), /lt\.date/);
  assert.doesNotMatch(String(_doScores || ""), /g\.d\}/);
});
test("Darren (109): the stand further along the same street is named as that, not 'on Soi Buakhao' on Soi Buakhao", () => {
  sandbox(); G.stage = "expat"; G.room = "buakhao_n"; const r = t("motosai");
  assert.doesNotMatch(r, /nearest is on Soi Buakhao/); assert.match(r, /further along Soi Buakhao/);
});
test("Hennie (109): a call the till cannot cover says where the rest comes from", () => {
  owner(); G.bar.cash = 423; G.shiftCall = "round"; out = []; _shiftPrompt();
  assert.match(said(), /till has ฿423/); assert.match(said(), /your own pocket/);
  G.bar.cash = 5000; out = []; _shiftPrompt(); assert.doesNotMatch(said(), /own pocket/);
});
test("Hennie (109): the owner's own water from an empty till is on the morning's line, and the month names money put into the bar", () => {
  owner(); G.bar.cash = 0; G.room = "stinky_bar"; _nightSnapshot(); run("buy water");
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.match(said(), /from the pocket for your own drinks' stock/);
});
test("Mehmet (106): stood, then gone before close, the bar's line says who closed", () => {
  owner(); G.bar.cash = 5000; G.room = "stinky_bar"; G.nightTurn = 0; _nightSnapshot(); run("work");
  while (G.nightTurn < 45) _tick();
  G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.match(said(), /you stood it till 22:30, and Bert closed/);
});
test("Desmond (106): Cartoon's repeat hello is not the first meeting's hold-still; LAST TIME pools are deeper", () => {
  const c = NPCS.jade_lounge_cartoon.dialogue[0]; assert.doesNotMatch(c.short, /Hold still/);
  assert.ok(_LAST_TIME_MEM.seen.length >= 15 && _LAST_TIME_MEM.st.length >= 3);
});
test("Desmond (106): the sunrise home is the same way from the same distance — a bike from far, every time", () => {
  assert.ok(_SUNRISE_END.filter(x => /\bbike\b/.test(x)).length >= 3);
  assert.match(String(_endNight), /_bike = !_walkHome/);
});
test("Mehmet (106): Tan's arrangements are told in the future on the night they are agreed", () => {
  const cl = SYNDICATE_JOBS.find(j => j.id === "cleaning"), sc = SYNDICATE_JOBS.find(j => j.id === "screen");
  assert.doesNotMatch(cl.yes, /has never been this clean/); assert.doesNotMatch(sc.yes, /arrive at nine, are finished/);
});
test("Mehmet (106): his own girls send no 'bar quiet' text about his own bar", () => {
  owner(); const id = "manow"; assert.equal(_textFits(id, "bar quiet tonight, boss angry"), false);
});
test("Mehmet (106): a shop masseuse answers ASK <her> <question>, and a dry night is not 'too much Chang'", () => {
  sandbox(); G.room = "klang_massage"; G.massageLog = { klang_massage: { last: G.day - 2, n: 1 } };
  assert.doesNotMatch(t("ask wilaiwan do you remember me"), /Nobody here goes by that/);
  G.massageLog = { klang_massage: { last: G.day - 1, n: 1 } }; G.lastNightWas = { day: G.day - 1, bars: { stinky_bar: 10 }, dry: { stinky_bar: true } };
  for (let i = 0; i < 4; i++) assert.doesNotMatch(t("ask wilaiwan about last night"), /too much Chang/);
});
test("Mehmet (106): CALL TAN says 'My friend.' once; his glass is a phone at the car too", () => {
  assert.doesNotMatch(String(_tanCall), /Two rings\. \\"My friend\./);
  sandbox(); G.nightTurn = 2; if (_npcRoom("tan") === "soi6_street") assert.doesNotMatch(_tanOnFoot("He turns his glass a quarter."), /glass/);
});
test("Mehmet (106): 'Back already?' is within the hour of the short time, never two hours on", () => {
  sandbox(); const id = "jade_lounge_cartoon"; G.room = _npcRoom(id); G.known[id] = true;
  G.wentWith = { [id]: { day: G.day, turn: G.nightTurn - 25, kind: "st" } };
  for (let i = 0; i < 6; i++) { G.soc.wentHello = {}; G.wentSaid = {}; out = []; _wentWithHello(id); assert.doesNotMatch(said(), /Back already/); }
});
test("Hennie (109): Tan's promise about coming into the bar is one his next visit keeps", () => {
  assert.ok(!NPCS.tan.dialogue.some(d => /will not come again until/.test(d.text || "")));
});
test("Mario: a profitable bar sold to the group opens the Orchid's rope; a bar sold even, or to Bert, does not", () => {
  const door = () => Object.keys(ROOMS).find(r => Object.values(ROOMS[r].exits || {}).includes("orchid_room"));
  soldTo("plg"); G.barSale.health = "profit"; G.flags = Object.assign(G.flags, {}); assert.ok(_orchidOpen());
  G.room = door(); const dir = Object.keys(ROOMS[G.room].exits).find(k => ROOMS[G.room].exits[k] === "orchid_room"); G.nightTurn = 40; run(dir); assert.equal(G.room, "orchid_room");
  soldTo("plg"); G.barSale.health = "even"; if (_faction("plg") < 2) assert.ok(!_orchidOpen());
  soldTo("bert"); if (_faction("plg") < 2) assert.ok(!_orchidOpen());
  owner(); G.bar.cash = 2000; G.room = "stinky_bar"; out = []; const saved = _barHealth; _barHealth = () => "profit";
  try { _barSaleDo("plg"); assert.match(said(), /The rope is down for you now/); } finally { _barHealth = saved; }
});
test("Mario: a profitable bar sold to the group comes with the manager's job at the premium, on the group's books", () => {
  owner(); G.bar.cash = 2000; G.room = "stinky_bar"; out = []; const saved = _barHealth; _barHealth = () => "profit";
  try { _barSaleDo("plg"); } finally { _barHealth = saved; }
  assert.match(said(), /Stay on behind the rail you built/);
  assert.ok(G.jobOffer && G.jobOffer.room === "stinky_bar" && G.jobOffer.corp && G.jobOffer.prem);
  assert.ok(_companyBar("stinky_bar"));
  out = []; run("take the job"); assert.equal(G.job && G.job.kind, "manager"); assert.equal(G.job.room, "stinky_bar");
  // a beer bar's wage with the premium — less than a Soi 6 manager's at the same premium (Mario)
  assert.equal(_mgrPay(G.job), Math.round(MGR_CASH_PAY * BAR_SALE_PREMIUM / 1000) * 1000);
  assert.ok(_mgrPay(G.job) < _mgrPay({ corp: true, prem: true, room: "pink_lotus" }));
  assert.equal(_mgrPay({ corp: true, room: "pink_lotus" }), MGR_PERMIT_PAY);
  // an even sale gets no offer
  owner(); G.bar.cash = 2000; G.room = "stinky_bar"; out = []; _barHealth = () => "even";
  try { _barSaleDo("plg"); } finally { _barHealth = saved; }
  assert.ok(!G.jobOffer); assert.doesNotMatch(said(), /Stay on behind the rail/);
});
