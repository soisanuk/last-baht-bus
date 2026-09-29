// Round 57 (2026-09-29) — aimed by the coverage map at its darkest walkable cells and its
// uninstrumented class. Mick (Fable, owner-inside) owns the Stinky in September and says
// yes to every job and favour, then asks the town about them; Terence (Fable, body-care) is
// a retired postman with a bad back doing a massage a day and the clinic twice; Helga (Opus,
// modal-interrupter) does something else at every prompt and reloads. Mick's severe: his
// own mamasan and cashier answered every question with "Evening, boss" — the own-bar hello
// never wrote to the dialogue book, so they were strangers forever. Terence's: the masseuse
// who gave him her number told him in the same minute that it was "only massage". Helga's:
// a polite "no thanks" to a policeman took the ฿1,000 ARGUE branch.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
const quiet = () => { for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true; G.pendingEnc = null; };
const run = c => { out = []; doCommand(c); return text(); };
const withDice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.bank = 50000; quiet(); G.peddlerNight = 2;
});
function owner() {
  G.day = 8; out = []; _goExpat(); quiet();
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.room = "stinky_bar"; G.money = BAR_DEPOSIT; _barDeposit(); G.bar.lease.paid = true; G.bar.lease.how = "cash"; _setFlag("barOpen");
  G.syn = { done: {}, asked: {}, friction: 0 }; out = []; G.money = 9000;
}
const inPool = (pool, t) => pool.some(l => { const seg = String(typeof l === "function" ? l("§") : l).split("§").sort((a, b) => b.length - a.length)[0]; return seg.length > 12 && t.includes(seg.slice(0, 30)); });

// ── Mick ─────────────────────────────────────────────────────────────────
test("your own staff are met: a question to the mamasan or the cashier is answered, not greeted (Mick's severe)", () => {
  owner(); const mama = _npcsHere().find(i => NPC_ROLES[i] === "mamasan"), till = _npcsHere().find(i => NPC_ROLES[i] === "cashier");
  assert.ok(mama && till);
  const greets = [...(_OWNER_GREET.mamasan || []), ...(_OWNER_GREET.cashier || [])];
  for (const [who, q] of [[mama, "tan"], [till, "last night"], [till, "the books"]]) {
    const t = run(`ask ${NPCS[who].name.toLowerCase()} about ${q}`);
    assert.ok(!inPool(greets, t), `${who} on ${q} gave the hello: ${t.slice(0, 120)}`);
  }
});

test("Bert on Tan once Tan has come in and asked; 'candy' is Candy, not Tan", () => {
  owner(); _setFlag("tanFavourDone"); G.syn.done.cleaning = true;
  assert.match(run("ask bert about tan"), /he came in/i);
  assert.doesNotMatch(run("ask bert about candy"), /Fifty-one on paper/);
  assert.match(run("ask bert about the girl"), /On the book/);
});

test("an alias written with an article can be asked: the parser strips 'the'", () => {
  assert.ok(_topicHits("the name|her name", "name"));
  _setFlag("partnerTan"); _setFlag("tanFavourDone");
  G.room = _npcRoom("tan"); assert.match(run("ask tan about the name"), /on the list/i);
});

test("Tan answers for the three jobs he brought", () => {
  owner(); G.syn.done = { cleaning: true, screen: true, pos: true }; G.room = _npcRoom("tan");
  assert.match(run("ask tan about cleaning"), /That is the cleaning/);
  assert.match(run("ask tan about screen"), /trunking/);
  assert.match(run("ask tan about till"), /one number/);
});

test("the town knows who owns the Stinky — at your own rail and across town", () => {
  owner(); const t1 = run("ask doug about this bar");
  assert.ok(Object.values(_TOWN.owner).flat().some(l => t1.includes(l.split("{")[0].slice(0, 12)) ) || /owner|yours|your bar/i.test(t1), t1);
  G.room = "queen_vic"; G.talked.terry = [0];   // a stranger gets his hello first
  assert.match(run("ask terry about stinky pinky"), /bought it|owner|Yours|yours|You own/i);
});

test("the piwin knows what month it is and where a massage is", () => {
  G.room = "soi6_street";
  assert.doesNotMatch(run("ask piwin about season"), /Who\?/);
  assert.match(run("ask piwin about massage"), /Real one/);
});

test("the season sits inside a sentence in lower case", () => {
  G.season0 = 8; G.room = "stinky_bar";
  for (let k = 0; k < 6; k++) assert.doesNotMatch(run("ask bert about season"), /is The dead/);
});

test("the tab's stiff is told tonight, not 'a week later'", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /"\(The docket is still under the till a week later/);
});

test("Candy does not greet a bar owner as the man with no wallet", () => {
  owner(); G.room = _npcRoom("candy");
  assert.doesNotMatch(run("talk to candy"), /no wallet to put it in/);
});

test("the cleaners' monthly figure is named from the constant", () => {
  const job = SYNDICATE_JOBS.find(j => j.id === "cleaning");
  assert.match(job.ask, new RegExp("฿" + SYN_JOB_NIGHT * 30));
});

test("a floor reveal is told once by the BAR, never the same line by two women", () => {
  owner(); const staff = _barStaff(); if (staff.length < 2) return;
  _floorReveal = () => true;   // eslint-disable-line
  for (let night = 0; night < 30; night++) {
    G.day = 100 + night; G.bar.workedLast = true; G.bar.workedDay = G.day; G.bar.floorN = 0; G.bar.floorTurn = -99; G.bar.stoodTurns = 99;
    for (let t = 0; t < 10; t++) { G.turns += WORK_FLOOR_GAP; _workFloor(); }
  }
  assert.equal(new Set(G.bar.floorTold).size, G.bar.floorTold.length);
});

// ── Terence ──────────────────────────────────────────────────────────────
test("the masseuse remembers: talks after the hour, is someone after the special, knows you the next day (Terence's severe)", () => {
  G.room = "lotus_oil"; G.nightTurn = 30;
  const t0 = run("talk to masseuse");
  assert.ok(_FOLK_MASSEUSE.some(l => t0.includes(l.slice(0, 30))), "a stranger in the doorway gets the shop");
  run("massage");
  const t1 = run("ask masseuse about life");
  assert.ok(_FOLK_MASSEUSE_AFTER.some(l => t1.includes(l.slice(0, 30))), "after the hour she talks");
  run("special");
  const t = run("ask masseuse about name");
  assert.doesNotMatch(t, /Only massage/); assert.ok(_FOLK_MASSEUSE_SPECIAL.some(l => t.includes(l.slice(0, 30))));
  G.day++; G.soc.massaged = {}; G.soc.special = {};
  const t2 = run("talk to masseuse");
  assert.ok(_FOLK_MASSEUSE_BACK.some(l => t2.includes(l.slice(0, 30))), "the next day she knows the shoulders");
});

test("the kind he asks for is the kind he gets, and he can say it his way", () => {
  G.room = "papaya_massage"; G.nightTurn = 30;
  const t = run("thai massage");
  assert.match(t, /does it Thai/); assert.doesNotMatch(t, /warm oil down your back/);
  assert.match(run("read price list"), /./); assert.doesNotMatch(text(), /don't have that to read/);
  G.room = "naklua_thai"; assert.match(run("tao rai"), /herbal/);
});

test("a soapy's manageress sells the fishbowl, not a foot rub", () => {
  G.room = "emperor_soapy"; const t = run("talk to manageress");
  assert.ok(_FOLK_SOAPY.some(l => t.includes(l.slice(0, 30))), t);
});

test("the clinic has a nurse, and the second visit is a second visit", () => {
  G.room = "second_rd_c"; run("get tested");
  assert.match(run("get tested"), /test tonight already/);
  const tn = run("talk to nurse");
  assert.ok(_FOLK_NURSE.some(l => tn.includes(l.slice(0, 30))), tn);
  G.day++; assert.match(run("get tested"), /Again\?/);
});

test("DIAGNOSE notices the massage", () => {
  G.room = "naklua_thai"; G.nightTurn = 30; run("massage");
  assert.match(run("diagnose"), /the back, for once/);
});

test("TRAVEL takes a door you have read on a street you walked", () => {
  G.visited.beach_rd_s = true; G.room = "beach_rd_c";
  const v = (ROOMS.beach_rd_s.venues || []).find(x => ROOMS[x].bar);
  if (!v) return;
  run("travel " + _barName(v).toLowerCase());
  assert.equal(G.room, v);
});

test("Pensri answers the board she stands under, and the hurt is a (MASSAGE)", () => {
  G.room = _npcRoom("pensri");
  assert.match(run("ask pensri about aloe"), /Aloe/);
  assert.match(run("ask pensri about hurt"), /\(MASSAGE\)/);
});

test("the prose stops claiming things that aren't so: Papaya's street, the sea wall on Buakhao, the app history", () => {
  assert.doesNotMatch(ROOMS.papaya_massage.desc, /Soi Diana/);
  G.room = "buakhao_n"; for (let k = 0; k < 8; k++) { G.encDone.freelancer = false; delete G.encDone.freelancer; out = []; _startEnc("freelancer"); assert.doesNotMatch(text(), /sea wall/); G.pendingEnc = null; }
  assert.doesNotMatch(JSON.stringify(ENCOUNTERS.booking), /barely remember making/);
});

test("a massage shop's terse repeat never offers a drink", () => {
  G.room = "thai_massage";
  for (let k = 0; k < 20; k++) assert.doesNotMatch(_askAgain("pensri"), /drink/);
});

// ── Helga ────────────────────────────────────────────────────────────────
test("a polite no to the police is warned once, never charged as an argument (Helga's severe)", () => {
  G.room = "beach_rd_n"; G.money = 2000; _startEnc && (G.pendingEnc = "police"); G.encPrompt = [["intro line", "alert"]];
  run("no thanks"); assert.equal(G.money, 2000, "no money moved on a polite no");
  assert.equal(G.pendingEnc, "police");
  assert.deepEqual(G.encPrompt, [["intro line", "alert"]], "the stored prompt is still his introduction");
  run("no"); assert.equal(G.money, 1000, "the second no is the argument, and he said so");
});

test("read-only verbs answer under any prompt, and the prompt stays", () => {
  G.room = "lucky_tiger"; G.nightTurn = 30;
  const girl = _npcsHere().find(i => NPC_ROLES[i] === "hostess"); G.soc.drinks[girl] = 10;
  G.pendingBf = { id: girl, st: 500, lt: 900, party: 1000, room: G.room };
  const t0 = G.nightTurn;
  assert.match(run("time"), /\d\d:\d\d/); assert.ok(G.pendingBf, "the barfine still waits");
  run("inventory"); assert.ok(G.pendingBf); assert.equal(G.nightTurn, t0, "no turn spent");
});

test("say goodbye ends the chat, not the paid night; the night-ender is its own chip", () => {
  G.room = "lucky_tiger"; G.nightTurn = 30;
  const girl = _npcsHere().find(i => NPC_ROLES[i] === "hostess");
  G.party = { ids: [girl], stops: 1, spent: 0, seen: {} }; _convoStart(girl);
  assert.ok(_chipSet().some(c => /send .* home/.test(c.c || c.cmd || c)), "a send-her-home chip");
  run("bye"); assert.ok(G.party && G.party.ids.includes(girl), "still with you");
});

test("a bare number at the fare prompt pays it", () => {
  G.room = "beach_rd_s"; G.pendingFare = { kind: "bus", price: BUS_FARE, dest: "pattaya_tai" }; G.money = 100;
  run(String(BUS_FARE)); assert.equal(G.pendingFare, null); assert.equal(G.money, 100 - BUS_FARE);
});

test("a reload under a pay-on-arrival fare redraws the kerb you are on", () => {
  G.room = "beach_rd_s"; G.pendingFare = { kind: "bus", price: BUS_FARE, dest: "pattaya_tai" };
  out = []; _describeRoom(true);
  assert.ok(text().includes(ROOMS.pattaya_tai.name)); assert.doesNotMatch(text(), /Exits:/);
});

test("a drawn Jackpot says the stake came back", () => {
  G.money = 100; G.game = { type: "jp", stake: 20 }; G.money -= 20; out = [];
  _endGame(null, 20, "Dead even."); assert.match(text(), /฿20 back/);
});

test("the room's furniture: no gutter in the pub, no mamasan in a pub's downpour, no promised question", () => {
  G.room = "queen_vic";
  for (let k = 0; k < 12; k++) { G.soc.drunk = 0; assert.doesNotMatch(run("buy beer"), /gutter/); }
  assert.ok(!_TOAST_LINES.some(f => /asks you something/.test(f("X"))));
});

test("_roomFit reads a line's source and never calls it (the seeded stream must not move)", () => {
  G.room = "mooring_bar"; let called = 0;
  const pool = [() => { called++; return "the mamasan nods"; }, () => { called++; return "a quiet word"; }];
  const fit = _roomFit(pool); assert.equal(called, 0); assert.equal(fit.length, 1);
});

test("a killer-pool winner's name opens its sentence in capitals", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  assert.match(src, /const _wn = winner \? winner\.name\.charAt\(0\)\.toUpperCase\(\)/);
});

test("the cleaning job's inside price is 5% off the stock, on the books (Mario's call)", () => {
  owner(); G.bar.stoodTurns = 99;
  assert.equal(_barCogs(), BAR_COGS);
  G.syn.done.cleaning = true;
  assert.equal(_barCogs(), BAR_COGS * SYN_INSIDE_PRICE);
  G.bar.workedDay = G.day; G.bar.workedLast = true; out = []; _barSettle();
  const ll = G.bar.lastLines; if (ll && ll.take) assert.equal(ll.cogs, Math.round(ll.take * BAR_COGS * SYN_INSIDE_PRICE * (1 + (G.syn.friction || 0) * BAR_FRICTION)));
  out = []; doCommand("books"); if (ll && ll.take) assert.match(text(), /inside price/);
});
