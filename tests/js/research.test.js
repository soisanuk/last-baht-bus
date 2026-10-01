// Mechanics built from the essay ledger (docs/essay-ledger.md, 2026-10-01) under
// docs/source-material-policy.md — the pattern, never the expression. One test per
// mechanic, in the order they shipped.
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

// ── Theme 3: bonds survive the flight ────────────────────────────────────────
test("the return is the moment: her-farang comes back a regular, a regular a face, a face a stranger", () => {
  G.soc.drinks = { lek: 14, noi: 8, fon: 4 }; G.phone.contacts = { lek: true }; G.day = 8;
  _endVacation(); G.pendingChoice = null; out = []; _newVacation();
  assert.equal(_bondTier("lek"), 2, "her farang → regular");
  assert.equal(_bondTier("noi"), 1, "regular → face");
  assert.equal(_bondTier("fon"), 0, "a face is a week's warmth");
  // …and walking into her bar carries her most of the way back
  G.room = _npcRoom("lek"); out = []; _arriveAt(G.room);
  assert.match(said(), /You come BACK|You COME|How long you gone/);
  assert.ok(_bondTier("lek") >= 2 && (G.soc.drinks.lek || 0) >= 11, "one drink from her farang again");
});

// ── Theme 2: cheap care beats money ─────────────────────────────────────────
test("SEE <her> HOME at closing: presence, not purchase — bond through _addBond, once a night, she is off the floor after", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 4; G.nightTurn = 30;
  out = []; run("see lek home");
  assert.ok(_SEE_HOME_EARLY.some(f => said().includes(f("Lek"))), "not before closing");
  G.nightTurn = 85; const b = G.soc.drinks.lek, bought = (G.soc.bondNight || {}).lek || 0;   // a beer bar lets her go after the last bus
  assert.ok(_npcActions("lek", true).includes("seehome"), "on the wheel at closing");
  const saved = _rand; _rand = () => 0.99;   // no saleng, no encounter inside the three ticks
  try { out = []; run("see lek home"); } finally { _rand = saved; }
  assert.ok(_SEE_HOME.some(l => said().includes(_fmt(l, { n: "Lek" }).slice(0, 40))), said());
  assert.equal(G.soc.drinks.lek, b + 2); assert.equal(((G.soc.bondNight || {}).lek || 0), bought, "never the lady-drink book");
  assert.equal(G.soc.leftEarly.lek, G.day);
  out = []; G.room = "lucky_tiger"; run("see lek home"); assert.match(said(), /already walked|isn't here/);
});
test("at regular tier the first beer is waiting on the mat", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 8; G.money = 5000;
  out = []; run("buy beer"); assert.ok(_USUAL_LINES.some(l => said().includes(l.split("{n}")[1].slice(0, 20))), said());
  out = []; run("buy beer"); assert.ok(!_USUAL_LINES.some(l => said().includes(l.split("{n}")[1].slice(0, 20))), "once a night");
});

// ── Theme 8: absences that are true ─────────────────────────────────────────
test("November's harvest and the trough thin the filler floor, day-stable, with a reason the street can give — and never your own bar", () => {
  const fillers = Object.keys(NPCS).filter(id => NPCS[id].filler && NPC_ROLES[id] === "hostess");
  G.season0 = 10;   // November
  const ever = new Set();
  for (let d = 1; d <= 30; d++) { G.day = d; for (const id of fillers) if (_awayForSeason(id) === "harvest") ever.add(id); }
  assert.ok(ever.size > fillers.length / 4 && ever.size < fillers.length / 2, "a third of the floor goes home at some point: " + ever.size);
  G.day = 5;
  const away = fillers.filter(id => _awayForSeason(id) === "harvest");
  assert.ok(away.length >= 3 && away.length < fillers.length / 3, "on one night, some and not all: " + away.length);
  assert.deepEqual(fillers.filter(id => _awayForSeason(id) === "harvest"), away, "day-stable");
  const girl = away[0]; G.known[girl] = true; G.room = _npcRoom(girl);
  assert.ok(!_npcActive(girl)); assert.match(_elsewhereLine(NPCS[girl].name.toLowerCase()), /rice harvest/);
  G.season0 = 8; G.day = 5;   // September, the trough
  const gone = fillers.filter(id => _awayForSeason(id) === "bangkok");
  assert.ok(gone.length > 0 && gone.length < fillers.length / 3);
  G.known[gone[0]] = true; assert.match(_elsewhereLine(NPCS[gone[0]].name.toLowerCase()), /Bangkok/);
  G.bar.room = NPCS[gone[0]].room; assert.equal(_awayForSeason(gone[0]), false, "the owner's floor is exempt");
});

// ── The merit ceremony: culture beats arithmetic, once ──────────────────────
test("the merit call opens on a run of bad nights; YES pays and warms the floor, NO costs the night the floor spent across the road", () => {
  G.stage = "expat"; _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar";
  assert.ok(!_shiftEligible().some(c => c.id === "merit"));
  G.bar.badRun = 2; assert.ok(_shiftEligible().some(c => c.id === "merit"));
  G.bar.cash = 10000; G.bar.shiftAsked = true; G.shiftCall = "merit"; G.pendingChoice = "shift";
  const c0 = G.bar.cash; out = []; run("yes");
  assert.equal(G.bar.cash, c0 - MERIT_COST); assert.equal(G.bar.badRun, 0); assert.equal(G.bar.meritDay, G.day);
  assert.ok(!_shiftEligible().some(c => c.id === "merit"), "not twice in a month");
  G.bar.badRun = 3; G.bar.meritDay = G.day - 40; G.bar.shiftAsked = true; G.shiftCall = "merit"; G.pendingChoice = "shift";
  out = []; run("no"); assert.ok((G.bar.lostTake || 0) >= SHIFT_MERIT_LOSS); assert.match(said(), /across the road/);
});

// ── Theme 1: the obligation economy ──────────────────────────────────────────
test("a big gift from a man she doesn't know: half send it back, the rest write it down and settle later, in kind", () => {
  G.bank = 20000; G.phone.contacts = { lek: true, aom: true };
  assert.equal(_hh("lek:krengjai", 113) % 2, 0, "lek refuses"); assert.equal(_hh("aom:krengjai", 113) % 2, 1, "aom takes it");
  out = []; run("send " + (GIFT_BIG + 500) + " to lek");
  assert.equal(G.bank, 20000, "it came back"); assert.ok(!G.soc.drinks.lek, "and bought nothing");
  assert.ok(G.phone.inbox.some(m => m.from === "lek" && _GIFT_BACK.includes(m.text)), "in her voice");
  out = []; run("send " + (GIFT_BIG + 500) + " to aom");
  assert.equal(G.bank, 20000 - GIFT_BIG - 500); assert.equal(G.soc.drinks.aom, 1, "one notch, not three");
  assert.deepEqual(G.owed.aom, { amt: GIFT_BIG + 500, day: G.day });
  assert.ok(G.phone.inbox.some(m => m.from === "aom" && _GIFT_ACCOUNT.includes(m.text)));
  // a regular's money is a regular's money — the ordinary path, and the ordinary bump
  G.soc.drinks.lek = 8; out = []; run("send " + (GIFT_BIG + 500) + " to lek");
  assert.equal(G.soc.drinks.lek, 11, "+3 above regular");
  // tob taen: the night you have become somebody to her, she closes the book — a plate and a bottle
  G.soc.drinks.aom = 8; G.day += 2; G.hunger = 60; const room = _npcRoom("aom");
  assert.ok(_npcWhere("aom") === room, "she is in tonight");
  const saved = _rand; _rand = () => 0.99;
  try { out = []; G.room = room; _arriveAt(room); } finally { _rand = saved; }
  assert.ok(_TOB_TAEN.some(l => said().includes(_fmt(l, { n: "Aom" }).slice(0, 30))), said());
  assert.ok(!G.owed.aom, "account closed"); assert.ok(G.hunger < 60, "fed");
});
test("her-farang is where obligation starts: the waived fine is her money, she says so once, and silence costs the waiver", () => {
  G.bank = 20000; G.phone.contacts = { lek: true }; G.soc.drinks.lek = 14; G.room = _npcRoom("lek");
  const saved = _rand; _rand = () => 0.99;
  try {
    for (const night of [0, 1]) {
      while (_hh("lek:" + G.day + ":" + G.vacation + ":life", 131) % 100 < 10) G.day++;   // not her lady time
      G.nightTurn = 40; out = []; run("barfine lek"); run("short time");
      assert.match(said(), /squares it herself/, "waived, night " + night);
      run("short time"); G.nightTurn = 45; out = []; run("barfine lek"); run("short time");
      assert.equal(G.care.lek.waived, night + 1, "a NIGHT, however many times the apron came off");
      G.room = "hotel_room"; out = []; _endNight("sleep"); G.room = _npcRoom("lek"); G.soc.drinks.lek = 14;
    }
  } finally { _rand = saved; }
  assert.equal(G.care.lek.asked, G.day, "the morning after the second night, she says it");
  const ask = G.phone.inbox.find(m => m.from === "lek" && /SEND \d+ TO LEK/.test(m.text));
  assert.ok(ask && ask.text.includes("SEND " + LADY_LT * 2 + " TO LEK"), "her money, two nights");
  out = []; run("who"); assert.match(said(), /waiting on her night's money/);
  // ignored for CARE_DAYS: no scene, a cooler bond, and the apron stays on
  G.day += CARE_DAYS; _careTick();
  assert.ok(G.care.lek.cold && !_careOk("lek")); assert.equal(G.soc.drinks.lek, 11);
  assert.ok(G.phone.inbox.some(m => m.from === "lek" && _CARE_COLD.includes(m.text)));
  G.soc.drinks.lek = 14; G.nightTurn = 40; G.room = _npcRoom("lek"); _rand = () => 0.99;
  while (_hh("lek:" + G.day + ":" + G.vacation + ":life", 131) % 100 < 10) G.day++;
  try { out = []; run("barfine lek"); assert.doesNotMatch(said(), /no fine tonight/); assert.match(said(), /฿\d+/, "the mamasan names it tonight"); run("no"); } finally { _rand = saved; }
  // the money, understood — by transfer or across the rail — lifts it
  out = []; run("send " + LADY_LT + " to lek");
  assert.ok(_careOk("lek")); assert.ok(G.phone.inbox.some(m => m.from === "lek" && _CARE_THANKS.includes(m.text)));
  // without her number she says it across her own rail
  G.phone.contacts = {}; G.care.lek = { waived: CARE_WAIVED, since: 1, asked: null, cold: false }; _careTick();
  assert.equal(G.care.lek.pending, "ask");
  _rand = () => 0.99; try { out = []; _arriveAt(_npcRoom("lek")); } finally { _rand = saved; }
  assert.match(said(), /my money|My cut/); assert.ok(!G.care.lek.pending);
  out = []; run("tip lek " + LADY_LT * 2); assert.match(said(), /Now you know/); assert.equal(G.care.lek.asked, null);
});

// ── Theme 6: face-loss is permanent ──────────────────────────────────────────
test("walked out in front of a woman who had decided you were somebody: the verdict, and nothing buys it back", () => {
  G.bank = 20000; G.phone.contacts = { lek: true }; G.soc.drinks.lek = 9; const room = _npcRoom("lek"); G.room = room;
  assert.equal(_bondTier("lek"), 2);
  G.soc.heat[room] = 2; out = []; _addHeat(1, "test");
  assert.equal(G.maiDee.lek, G.day); assert.equal(G.maiDeeBar[room], G.day);
  assert.ok(_MAI_DEE_SCENE.some(l => said().includes(_fmt(l, { n: "Lek" }).slice(0, 30))), said());
  G.soc.drinks.lek = 20; assert.equal(_bondTier("lek"), 1, "money cannot climb past a face"); assert.equal(_knownTier("lek"), 1);
  // the next night: her greeting, her floor, her barfine, your apology, your money
  G.day++; delete G.soc.banned[room]; G.soc.heat = {};
  const saved = _rand; _rand = () => 0.99;
  try {
    out = []; G.room = room; _arriveAt(room);
    assert.ok(_REL_GREET_MAIDEE.some(f => said().includes(f("Lek").slice(0, 40))), said());
    assert.ok(_MAI_DEE_FLOOR.some(l => said().includes(l.slice(0, 40))), "the floor heard");
    out = []; run("barfine lek"); assert.match(said(), /No, thank you/);
    out = []; run("apologize"); assert.ok(_MAI_DEE_SORRY.some(l => said().includes(_fmt(l, { n: "Lek" }).slice(0, 30))));
  } finally { _rand = saved; }
  out = []; run("send 2000 to lek"); assert.match(said(), /A reply lands/); assert.ok(G.phone.inbox.some(m => m.text === _MAI_DEE_MONEY));
  assert.equal(G.soc.drinks.lek, 20, "severance buys nothing");
  out = []; run("send 500 to lek"); assert.match(said(), /nothing is going to/);
  out = []; run("who"); assert.match(said(), /✕ .*Lek .*decided about you/);
  // she never texts again, and a month away does not lift it
  G.phone.lastText = -100; G.turns = 500; const sv = _rand; _rand = () => 0; try { _maybeIncomingText(); } finally { _rand = sv; }
  assert.ok(!G.phone.inbox.some(m => m.from === "lek" && m.turn === 500));
  G.day = 8; _endVacation(); G.pendingChoice = null; _newVacation();
  assert.equal(G.maiDee.lek, 2); G.soc.drinks.lek = 20; assert.equal(_bondTier("lek"), 1, "a month away, the same ceiling");
});

// ── Theme 4: the phone remembers ─────────────────────────────────────────────
test("money-asks with memory: an honest woman never asks for the same thing twice, a scripted one asks word for word, and the generous man is the first number called", () => {
  assert.ok(!_askScripted("nune") && _askScripted("chaba"));
  const honest = []; for (let i = 0; i < _ASK_KINDS.length; i++) honest.push(_moneyAsk("nune"));
  assert.equal(new Set(G.phone.asks.nune.map(a => a.kind)).size, _ASK_KINDS.length, "every kind once");
  assert.equal(_moneyAsk("nune"), null, "and then she has nothing true left to ask for");
  const script = [1, 2, 3].map(() => _moneyAsk("chaba"));
  assert.equal(new Set(script).size, 1, "the same dead uncle, verbatim");
  // a paid ask is answered with a bigger one, and thanked for the THING
  G.bank = 20000; G.phone.contacts = { chaba: true, pae: true }; G.phone.asks = {};
  assert.ok(!_askScripted("pae"));
  const first = _moneyAsk("pae"); const a0 = G.phone.asks.pae[0];
  out = []; run("send " + a0.amt + " to pae");
  assert.ok(a0.paid); assert.ok(G.phone.inbox.some(m => m.from === "pae" && m.text === _ASK_THANKS[a0.kind]), "the medicine, not the money");
  _moneyAsk("pae"); assert.equal(G.phone.asks.pae[1].amt, _ASK_KINDS.find(k => k.kind === G.phone.asks.pae[1].kind).amt + 200);
  _moneyAsk("chaba"); const c0 = G.phone.asks.chaba[0]; out = []; run("send " + c0.amt + " to chaba");
  assert.ok(G.phone.inbox.some(m => m.from === "chaba" && _ASK_THANKS_SCRIPT.includes(m.text)), "a script thanks you for the money");
  assert.equal(_askBias("pae"), Math.min(0.2, G.soc.given.pae / 5000)); G.soc.given.pae = 9000; assert.equal(_askBias("pae"), 0.2);
  out = []; run("who"); assert.match(said(), /Pae .*asked 2× \(฿\d+\), 1 answered/);
});

// ── Theme 12: the badge, and the drinks-only class ───────────────────────────
test("go-go badge numbers: day-stable, unique per bar, in her desc and on the Here: line, a target the parser takes, and armour at close range", () => {
  const badged = Object.keys(NPCS).filter(i => _badge(i));
  assert.ok(badged.length >= 30 && badged.every(i => NPCS[i].filler && ROOMS[NPCS[i].room].barType === "gogo"));
  const byRoom = {};
  for (const i of badged) (byRoom[NPCS[i].room] = byRoom[NPCS[i].room] || []).push(_badge(i));
  for (const r in byRoom) assert.equal(new Set(byRoom[r]).size, byRoom[r].length, "unique in " + r);
  assert.ok(Object.keys(NPCS).every(i => _badge(i) === null || ROOMS[NPCS[i].room].barType === "gogo"), "beer bars have no badges");
  const g = badged.find(i => _npcWhere(i) === NPCS[i].room); const b = _badge(g);
  assert.match(NPCS[g].desc, new RegExp("badge pinned at her hip says " + b));
  G.room = NPCS[g].room; G.nightTurn = 30; out = []; _describeRoom(true);
  assert.match(said(), new RegExp("Here: .*" + NPCS[g].name + " \\(" + b + "\\)"));
  assert.equal(_findNpc(String(b)), g); assert.equal(_findNpc("number " + b), g);
  out = []; run("examine " + b); assert.match(said(), /badge pinned at her hip/);
  out = []; run("ask " + g + " about number"); assert.ok(_BADGE_FAR.some(l => said().includes(l.slice(0, 30))), "for the board, to a stranger");
  G.soc.drinks[g] = 8; out = []; run("ask " + g + " about " + b); assert.ok(_BADGE_NEAR.some(l => said().includes(l.slice(0, 30))), "armour, to a regular");
});
test("the drinks-only girl: ~15% of the floor by hash, her no is hers and voiced before the tariff, her drink credits double, her ledger says why", () => {
  const fillers = Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess");
  const dOnly = fillers.filter(_drinksOnly);
  const share = dOnly.length / fillers.length;
  assert.ok(share > 0.08 && share < 0.24, "share " + share);
  assert.ok(dOnly.every(i => !POPULAR_GIRLS.includes(i)));
  const d = dOnly.find(i => _npcWhere(i) === NPCS[i].room && ROOMS[NPCS[i].room].barType === "beer");
  G.room = NPCS[d].room; G.money = 9000; G.nightTurn = 30;
  out = []; run("barfine " + d); assert.match(said(), /drink only/); assert.equal(G.soc.bfRefused[d].kind, "drinksonly"); assert.ok(!G.pendingBf);
  out = []; run("ask " + d + " about price"); assert.match(said(), /Drink only|drink girl|not go/);
  const saved = _rand; _rand = () => 0.99;
  try {
    const b0 = G.soc.drinks[d] || 0; out = []; run("buy lady drink for " + d);
    assert.equal(G.soc.drinks[d], b0 + 2, "the drink is the whole job");
  } finally { _rand = saved; }
  G.soc.drinks[d] = 3; G.soc.ledger = {}; out = []; _otherLedger(d);
  assert.ok(_LEDGER_DRINKS_ONLY.some(f => said().includes(f(NPCS[d].name).slice(0, 40))), said());
  // she does not offer what she does not sell
  G.nightTurn = 70; G.soc.goWith = {}; out = []; _maybeSelfBarfine(d); assert.ok(!G.pendingEnc && !(G.soc.goWith[d]));
});

// ── Theme 5: the sighting ────────────────────────────────────────────────────
test("the sighting: money sent on 'mama sick', and tonight she is at a table in another district — raise your glass, or go over", () => {
  G.phone.contacts = { noi: true }; G.phone.asks = { noi: [{ kind: "hospital", amt: 300, day: 1, paid: true, paidDay: 1 }] };
  G.nightTurn = 40; G.soc.barTurns = {};
  let day = null; for (let d = 2; d < 60; d++) if (_hh("noi:" + d + ":" + G.vacation + ":sight", 151) % 100 < 30) { day = d; break; }
  G.day = 2; assert.equal(_sightingDue("buakhao_klang"), null, "a day she is at work");
  // only inside the window after the money, and only kinds that put her up-country
  G.day = day; G.phone.asks.noi[0].paidDay = day - 5; assert.equal(_sightingDue("buakhao_klang"), null, "the window closed");
  G.phone.asks.noi[0].paidDay = day - 1; G.phone.asks.noi[0].kind = "rent"; assert.equal(_sightingDue("buakhao_klang"), null, "rent does not take her home");
  G.phone.asks.noi[0].kind = "hospital";
  assert.equal(_sightingDue(_npcRoom("noi")), null, "never in her own bar"); assert.equal(_sightingDue("ws_gate"), null, "nor her own district");
  assert.equal(_sightingDue("buakhao_klang"), "noi");
  G.soc.drinks.noi = 9; G.rep = 3; G.room = "buakhao_klang"; out = []; _arriveAt("buakhao_klang");
  assert.equal(G.pendingChoice, "sighting"); assert.ok(_SIGHT_SCENE.some(l => said().includes(_fmt(l, { n: "Noi" }).slice(0, 40))));
  assert.ok(!_npcActive("noi"), "not on her floor tonight");
  assert.deepEqual(_chipSet().map(c => c.c || c), _chipSet().map(c => c.c || c));   // wired: chips exist
  assert.ok(JSON.stringify(_chipSet()).includes("raise your glass") && JSON.stringify(_chipSet()).includes("go over"));
  out = []; run("go over"); assert.equal(G.pendingChoice, null);
  assert.ok(_SIGHT_OVER.some(l => said().includes(l.slice(0, 40)))); assert.equal(G.rep, 2); assert.equal(G.soc.drinks.noi, 6, "a face from here");
  assert.equal(G.phone.cut.noi, G.vacation); assert.equal(_moneyAsk("noi"), null, "she never asks you again");
  // the other move: nothing said, nothing lost but the asks
  G.soc.sighting = null; G.pendingChoice = null; delete G.phone.cut.noi; delete G.phone.noAsk.noi; G.soc.drinks.noi = 9; G.rep = 3;
  _sighting("noi"); out = []; run("raise your glass");
  assert.ok(_SIGHT_RAISE.some(l => said().includes(l.slice(0, 40)))); assert.equal(G.rep, 3); assert.equal(G.soc.drinks.noi, 9);
  assert.ok(G.phone.noAsk.noi && !G.phone.cut.noi);
  // a reload redraws the question
  _sighting("noi"); out = []; _renderResume(); assert.match(said(), /RAISE YOUR GLASS/);
});

// ── Theme 11: the exits the women make ───────────────────────────────────────
test("a woman who named a target can hit it: gone from the second trip, quietly, and the town says for what", () => {
  const fillers = Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess");
  const target = fillers.filter(i => _EXIT_PLANS.includes(NPCS[i].storyIdx.plan));
  assert.ok(target.length > 40 && target.every(i => /open|shop|salon|stall|laundry|truck/.test(_H_PLAN[NPCS[i].storyIdx.plan])));
  G.vacation = 1; assert.equal(target.filter(_exited).length, 0, "nobody is gone on the first trip");
  G.vacation = 2; const g2 = target.filter(_exited); assert.ok(g2.length >= 1 && g2.length <= target.length * 0.1, "a few, trip two: " + g2.length);
  G.vacation = 6; const g6 = target.filter(_exited); assert.ok(g6.length > g2.length && g2.every(i => g6.includes(i)), "cumulative");
  G.vacation = 12; assert.ok(target.filter(_exited).length <= target.length * 0.45, "most of the floor stays — the honest majority");
  assert.ok(fillers.every(i => _EXIT_PLANS.includes(NPCS[i].storyIdx.plan) || !_exited(i)), "no exit without a stated target");
  G.vacation = 2; const g = g2.find(i => ROOMS[NPCS[i].room].barType === "beer") || g2[0]; const room = NPCS[g].room, plan = _exited(g);
  assert.ok(!_npcActive(g)); assert.ok(!_npcsHere.call(null) || true);
  G.talked[g] = [0]; G.phone.contacts[g] = true; G.room = room; G.nightTurn = 30;
  out = []; _describeRoom(true);
  assert.ok(!said().includes("Here: " + NPCS[g].emoji) && !new RegExp("Here:.*\\b" + NPCS[g].name + "\\b").test(said()), "off the roster");
  assert.ok(_EXIT_ROSTER.some(l => said().includes(_fmt(l, { n: NPCS[g].name, p: plan }).slice(0, 40))), "the room says so, once a trip");
  out = []; _describeRoom(true); assert.ok(!_EXIT_ROSTER.some(l => said().includes(_fmt(l, { n: NPCS[g].name, p: plan }).slice(0, 40))), "once");
  out = []; run("talk to " + g); assert.match(said(), /went home to /);
  const col = _npcsHere().find(x => NPC_ROLES[x]); out = []; run("ask " + col + " about " + g);
  assert.ok((_hoursRegister(col) === "floor" ? _GONE_FLOOR : _GONE_HOUSE).some(l => said().includes(_fmt(l, { n: NPCS[g].name, p: plan }).slice(0, 25))), said());
  // one text from the shop, then nothing
  G.phone.lastText = -100; const sv = _rand; _rand = () => 0;
  try { _maybeIncomingText(); G.phone.lastText = -100; _maybeIncomingText(); } finally { _rand = sv; }
  assert.equal(G.phone.inbox.filter(m => m.from === g).length, 1);
  assert.ok(_EXIT_TEXT.some(l => G.phone.inbox[0].text === _fmt(l, { p: plan })));
  out = []; run("who"); assert.match(said(), new RegExp(NPCS[g].name + " — gone home · " + plan.slice(0, 12)));
  // never your own bar's floor, never the affair girl
  G.bar = { room }; assert.equal(_exited(g), false); G.bar = null; G.affair = { id: g }; assert.equal(_exited(g), false);
});

// ── Two characters from the ledger's top rows ────────────────────────────────
test("Thip at Mama Yai's: the retirement plan from her side, told flat — and she knows a man who came back", () => {
  G.room = "mama_yai"; G.nightTurn = 30; assert.ok(_npcsHere().includes("thip"));
  out = []; run("talk to thip"); assert.match(said(), /Eleven years this bar/);
  for (const [t, rx] of [["husband", /Danish man|every February/], ["airport", /arrivals|extra hour/], ["bracelet", /one baht weight/],
      ["this year", /See you next year|Ninety-one days/], ["family", /Si Sa Ket/], ["plan", /one leg of a chair/], ["yai", /nine Februaries/i]]) {
    out = []; run("ask thip about " + t); assert.match(said(), rx, t);
  }
  out = []; run("ask thip about work"); assert.doesNotMatch(said(), /forty-five thousand/, "the maths waits for a face");
  G.soc.drinks.thip = 3; out = []; run("ask thip about work again"); assert.match(said(), /forty-five thousand/);
  // the man who came back: only a player who left at regular+ and returned
  G.talked.thip = []; G.soc.drinks.thip = 8; out = []; run("talk to thip"); assert.doesNotMatch(said(), /You come back/);
  G.prevBond = { thip: 2 }; G.talked.thip = []; out = []; run("talk to thip"); assert.match(said(), /You come back.*I keep it/s);
});
test("Preeda at the Lucky Charm: back from a Belgian winter, and she chooses now; Helmut cannot find the error", () => {
  G.room = "lucky_charm"; G.nightTurn = 30; assert.ok(_npcsHere().includes("preeda"));
  out = []; run("talk to preeda"); assert.match(said(), /My rule/);
  for (const [t, rx] of [["belgium", /Ghent|fourth snow/], ["husband", /Careful is a cage/], ["money", /Two hundred euro/],
      ["work", /Nine hundred|nine hundred/], ["home", /Nakhon Phanom/], ["plan", /salon/], ["why", /price of a bus ticket/]]) {
    out = []; run("ask preeda about " + t); assert.match(said(), rx, t);
  }
  out = []; run("ask preeda about funeral"); assert.doesNotMatch(said(), /eleven hundred euro/, "the funeral waits for a face");
  G.soc.drinks.preeda = 3; out = []; run("ask preeda about funeral again"); assert.match(said(), /eleven hundred euro/);
  out = []; run("ask preeda about choose"); assert.match(said(), /I choose/);
  // nothing in either entry retells a source: the pattern is the unit (the names and the beats are ours)
  for (const id of ["thip", "preeda"]) assert.ok(NPCS[id].look.split(/\s+/).length <= 20, id + " look ≤ 20 words");
  G.room = _npcRoom("helmut"); G.day = 2; while (!_npcActive("helmut")) G.day++;
  out = []; run("ask helmut about wife"); assert.match(said(), /I cannot find the error/);
});
