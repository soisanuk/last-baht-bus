// Round 61 (2026-10-02): Greta (owner-prices — a Hamburg publican on the seeded owner save,
// working the board and the terms), Marcus (obligation-ledger — one woman courted properly,
// then disgraced in front of her), Nadia (number-not-name — the go-gos, the badges, and the
// women who say no). The first round aimed at the mechanics built from the essay ledger.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const W = new URL("../../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(W + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const run = (c) => doCommand(c);
const said = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; out = [];
});
function _owner() {
  G.stage = "expat"; for (const f of ["expatLife", "barPartner", "partnerCandy", "barPaid", "barOpen"]) _setFlag(f);
  G.day = 10; G.bar.lastMonthDay = 10; G.bar.owed = 1680000; G.bar.cash = 30000; G.bar.lease = { paid: true }; G.money = 20000; G.bank = 50000;
  Object.assign(G.bar, { rentUp: 0, takeLog: [], trafficLog: [], notice: null, gone: {}, months: 0, noticeDay: 0, markup: "list", terms: "commission", loan: null });
  G.room = "stinky_bar"; G.nightTurn = 30;
}
const _night = (stood) => { G.day++; if (stood) { G.bar.workedLast = true; G.bar.workedDay = G.day - 1; G.bar.stoodTurns = 40; } out = []; _barSettle(G.day - 1); return said(); };

// ── Greta ────────────────────────────────────────────────────────────────────
test("the price lever has a visible cost inside a fortnight: the morning names the thinner chits, and the notice is checked nightly, never only at the month", () => {
  _owner(); const saved = _rand; _rand = () => 0.5;
  try {
    G.season0 = 3; run("prices steep");
    let noticeDay = null, mech = false;
    for (let i = 0; i < 20 && !noticeDay; i++) { const t = _night(i % 2 === 0); if (/chits ran about 25% thinner/.test(t)) mech = true; if (G.bar.notice) noticeDay = G.day; }
    assert.ok(mech, "the morning states the mechanism");
    assert.ok(noticeDay && noticeDay - 10 <= 16, "a notice inside sixteen nights of a steep board, no month boundary needed: " + noticeDay);
    out = []; run("books"); assert.match(said(), /has given notice/);
  } finally { _rand = saved; }
});
test("the docket itemises the flat salary and Nont's cut; the wholesaler ignores the chalkboard; the ledger names Nont, not Nira", () => {
  _owner(); const saved = _rand; _rand = () => 0.5;
  try {
    run("terms salary"); _night(false);
    const ll = G.bar.lastLines; assert.equal(ll.salary, BAR_SALARY_NIGHT);
    out = []; run("books"); assert.match(said(), /the flat salary ฿500/);
    const sum = ll.nut + ll.cogs + ll.wages + ll.mgr + ll.salary + (ll.proc || 0);
    assert.match(said(), new RegExp("wages ฿" + _num(ll.wages))); assert.ok(sum > 0);
    // the wholesaler reads list, not the board
    G.bar.terms = "commission"; G.bar.markup = "list"; G.room = "stinky_bar"; G.money = 5000; G.bar.cash = 10000;
    out = []; run("buy water"); const c0 = 10000 - G.bar.cash;
    G.bar.markup = "steep"; G.bar.cash = 10000; out = []; run("buy water"); const c1 = 10000 - G.bar.cash;
    assert.equal(c0, c1, "the stock cost does not move with the markup");
    // Nont's cut is on the docket and the luck is his to leave
    G.bar.markup = "list"; G.room = "hotel_room"; _endNight("sleep");   // the ledger is a delta against the last wake's snapshot
    G.room = _npcRoom("nont"); G.nightTurn = 40; run("borrow 10000");
    const t = _night(false); assert.match(t, /the night's luck he leaves you/); assert.ok(G.bar.lastLines.garnish > 0);
    out = []; run("books"); assert.match(said(), /Nont's cut ฿[\d,]+/);
    G.room = "hotel_room"; _endNight("sleep"); out = []; run("last night"); assert.match(said(), /borrowed from Nont for the bar/); assert.doesNotMatch(said(), /from Nira/);
  } finally { _rand = saved; }
});
test("own staff text the guv'nor in the staff register at every tier; Nont answers LOAN; TALK TO BERT ABOUT RENT is an ask; the bar opposite is examinable and counts its days", () => {
  _owner();
  G.phone.contacts = { lamai: true }; G.soc.drinks.lamai = 4; G.room = "hotel_room"; G.phone.lastText = -100;
  const saved = _rand; _rand = () => 0.01;
  try { for (let i = 0; i < 40 && !G.phone.inbox.length; i++) { G.phone.lastText = -100; _maybeIncomingText(); } } finally { _rand = saved; }
  assert.ok(G.phone.inbox.length && G.phone.inbox.every(m => !/SEND \d+ TO/.test(m.text)), "never a money-ask from your own staff");
  G.room = _npcRoom("nont"); G.nightTurn = 40; out = []; run("ask nont about loan"); assert.match(said(), /Ten percent on the day|BORROW/);
  G.room = "stinky_bar"; out = []; run("talk to bert about rent"); assert.doesNotMatch(said(), /Nobody here goes by that/);
  out = []; run("examine the bar opposite"); assert.ok(_OPP_LINES.some(p => p.some(l => said().includes(l.slice(0, 40)))));
  out = []; run("ask bert about the bar opposite"); assert.match(said(), /Across the road|The Dane/);
  G.bar.oppStart = G.day - 9; out = []; run("books"); assert.match(said(), /The bar opposite: .* — 9 days into it/);
});

// ── Marcus ───────────────────────────────────────────────────────────────────
test("the verdict closes every verb: FLIRT, SEE HOME, MESSAGE, TALK, the shut book names the walk-out, the torch does not tease her", () => {
  G.phone.contacts = { lek: true }; G.soc.drinks.lek = 9; const room = _npcRoom("lek"); G.room = room; G.bank = 9000;
  G.soc.heat[room] = 2; out = []; _addHeat(1, "test"); assert.ok(G.maiDee.lek);
  G.day++; delete G.soc.banned[room]; G.soc.heat = {}; G.room = room; G.nightTurn = 85; G.soc.drinks.lek = 20;
  out = []; run("flirt with lek"); assert.ok(_MAI_DEE_SOCIAL.some(f => said().includes(f("Lek").slice(0, 30)))); assert.equal(G.soc.drinks.lek, 20);
  out = []; run("see lek home"); assert.match(said(), /No, thank you/);
  out = []; run("message lek"); assert.match(said(), /Read. No reply/);
  out = []; run("ask lek about last night"); assert.ok(_MAI_DEE_TALK.some(f => said().includes(f("Lek").slice(0, 30))), said());
  // the shut book after a walk-out names the walk-out, on the night you come back
  G.soc.banned[room] = -99999; G.soc.heat[room] = 0; out = []; _arriveAt(room);
  out = []; run("barfine lek"); assert.match(said(), /No, thank you|walked out of here by security/);
  G.lightOn = true; G.battery = 50; G.soc.torchNoticed = {}; out = []; _lightNotice(); assert.doesNotMatch(said(), /Lek/);
});
test("money-asks: never from a woman you sit with, never twice inside three days, 'again' needs a before; the care ask is in the book and she answers its words; the ledger shows a SEND", () => {
  G.stage = "expat";   // the days add up past a week here, and a vacation's end would swallow the SEND
  G.phone.contacts = { nune: true }; G.room = _npcRoom("nune"); G.day = 3;
  assert.equal(_moneyAsk("nune"), null, "never while you sit on her stool");
  G.room = "jomtien_beach"; assert.ok(_moneyAsk("nune")); assert.equal(_moneyAsk("nune"), null, "not twice inside three days");
  G.day += 3; assert.ok(_moneyAsk("nune"));
  // the scripted girl's first paid ask is not "again"
  G.phone.contacts.chaba = true; G.bank = 20000; G.day += 3; _moneyAsk("chaba"); const a = G.phone.asks.chaba[0];
  out = []; run("send " + a.amt + " to chaba"); assert.ok(!G.phone.inbox.some(m => /again/.test(m.text)));
  // the care ask is counted, and answered across the rail
  G.phone.contacts.lek = true; G.care = { lek: { waived: 2, since: 1, asked: null, cold: false } }; G.day += 1; _careTick();
  assert.ok(G.phone.asks.lek.some(x => x.kind === "care" && !x.paid));
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 14; out = []; run("ask lek about cut"); assert.ok(_CARE_TALK.asked.some(f => said().includes(f("Lek").slice(0, 25))), said());
  out = []; run("who"); assert.match(said(), /Lek .*asked 1×/);
  // the morning ledger sees the transfer
  G.room = "hotel_room"; G.sentTotal = 0; G.lastNight = { ...(G.lastNight || {}), sentB: 0 }; _endNight("sleep");
  G.bank = 9000; run("send 1500 to lek"); G.room = "hotel_room"; out = []; _endNight("sleep"); run("last night");
  assert.match(said(), /฿1,500 sent from the account/);
});
test("GO HOME WITH <companion> is the hint's own phrasing; the woman on your arm has an opinion about a drink bought elsewhere", () => {
  G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} }; G.room = _npcRoom("noi"); G.money = 9000; G.nightTurn = 50;
  const saved = _rand; _rand = () => 0.99;
  try {
    // Lek on your arm must be HERE for the aside: _npcsHere lists the party
    out = []; run("buy lady drink for noi");
    assert.ok(_PARTY_JEALOUS.some(f => said().includes(f("Lek", "Noi").slice(0, 30))), said());
    G.room = _npcRoom("lek"); G.lightOn = true; G.battery = 60; out = []; run("go home with lek");
    assert.ok(_PARTY_HOME.some(l => said().includes(_fmt(l, { n: "Lek" }).slice(0, 30))), said());
    assert.ok(_isHotelRoom(G.room), "the ride back is the fast travel");
  } finally { _rand = saved; }
});

// ── Nadia ────────────────────────────────────────────────────────────────────
test("the stated count is the count; a held refusal restates its kind; a kept girl is refused before the draw's midnight promise; the drinks-only girl tells you why", () => {
  // a man who bought her the stated drinks never meets CHEAP CHARLIE
  const d = Object.keys(NPCS).find(i => _drinksOnly(i) && _npcWhere(i) === NPCS[i].room);
  G.room = NPCS[d].room; G.money = 9000; G.nightTurn = 30;
  out = []; run("barfine " + d); out = []; run("barfine " + d); assert.match(said(), /drink only. It was never about the tab/);
  out = []; run("ask " + d + " about why"); assert.ok(_LEDGER_DRINKS_ONLY.some(f => said().includes(f(NPCS[d].name).slice(0, 30))), said());
  // sponsor before draw: the pre-midnight refusal of a kept draw is the calendar, not a price
  const kept = Object.keys(NPCS).filter(i => NPC_ROLES[i] === "hostess" && _isDraw(i) && _hasSponsor(i) && ROOMS[NPCS[i].room].barType === "beer");
  if (kept.length) {
    const k = kept[0]; G.room = NPCS[k].room; G.nightTurn = 40;
    for (let day = 1; day < 40; day++) { G.day = day; if (_sponsorInTown(k) && !_sponsorFamilyDay(k)) break; }
    if (_sponsorInTown(k) && !_sponsorFamilyDay(k)) { assert.equal(_bfRefusal(k, "beer").kind, "sponsor"); }
  }
});
test("every dancer wears a number; the house answers for them; TRAVEL pockets the torch at a go-go's door; her colleagues name a seasonal absence", () => {
  const authored = Object.keys(NPCS).filter(i => !NPCS[i].filler && NPC_ROLES[i] === "hostess" && ROOMS[NPCS[i].room].barType === "gogo");
  assert.ok(authored.length && authored.every(i => _badge(i)), "the authored dancers wear one too");
  const g = authored.find(i => _npcWhere(i) === NPCS[i].room); G.room = NPCS[g].room; G.nightTurn = 30;
  out = []; run("examine " + g); assert.match(said(), /badge pinned at her hip says \d+/);
  const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan"); if (mama) { out = []; run("ask " + mama + " about numbers"); assert.match(said(), /board|number/i); }
  // TRAVEL into a go-go with the torch lit
  G.room = "second_rd_c"; G.visited.neon_paradise = true; G.lightOn = true; G.battery = 50; G.soc.lightWarn = {};
  const saved = _rand; _rand = () => 0.99; try { out = []; run("travel neon paradise"); } finally { _rand = saved; }
  assert.equal(G.lightOn, false); assert.match(said(), /pocket the torch/);
  // a colleague names the woman gone to Bangkok
  G.season0 = 9; G.day = 2; const away = Object.keys(NPCS).find(i => _awayForSeason(i) === "bangkok" && !_exited(i));
  G.room = NPCS[away].room; const col = _npcsHere().find(i => NPC_ROLES[i] && i !== away); assert.ok(col);
  out = []; run("ask " + col + " about " + away); assert.match(said(), /Bangkok/);
});

// ── the deferred three ───────────────────────────────────────────────────────
test("a confidence is told once by her and once by the town; a stepped-back girl keeps her distance for the month; BOOKS answers under a prompt", () => {
  G.soc.drinks = { lek: 9, noi: 9, fon: 9 };
  const pool = _BOND_TALK[2]; const seen = new Set();
  for (let k = 0; k < pool.length + 6; k++) { const l = _bondPick(["lek", "noi", "fon"][k % 3], 2, pool); if (l) { assert.ok(!seen.has(l), "the town tells a secret once"); seen.add(l); } }
  assert.equal(seen.size, pool.length, "every line went out once, and then nothing");
  G.room = _npcRoom("lek"); out = []; _bondTalk("lek"); assert.ok(_BOND_SPENT.some(f => said().includes(f("Lek").slice(0, 30))), said());
  // the stepped-back affair girl
  G.stage = "expat"; for (const f of ["expatLife", "barPartner", "partnerCandy", "barPaid", "barOpen"]) _setFlag(f);
  G.room = "stinky_bar"; G.soc.drinks.manow = 14; G.affairCool = G.day; G.affairCoolWho = "manow"; G.talked.manow = [0];
  out = []; assert.ok(_ownBarTalk("manow", null)); assert.ok(_REL_GREET_STEPPED.some(f => said().includes(f("Manow").slice(0, 30))), said());
  // BOOKS under a prompt
  G.pendingChoice = "affair"; out = []; run("books"); assert.match(said(), /THE STINKY PINKY/); assert.equal(G.pendingChoice, "affair");
  G.pendingChoice = null;
});
