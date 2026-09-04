// Round 41 — Des Moriarty, the Cork publican who reconciles (the money paths after the lease/transfer/Thai-account changes).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
const stub = (fn) => { const saved = _rand; _rand = () => 0.5; try { fn(); } finally { _rand = saved; } };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});
function expat() { G.stage = "expat"; _setFlag("expatLife"); G.thaiAccount = true; }
function ownsBar() {
  expat(); for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", "partnerCandy", "barOpen"]) _setFlag(f);
  G.bar.cash = 5000; G.nightTurn = 35; G.room = "stinky_bar"; G.hunger = 0; G.thirst = 0;
}

test("a dep chain names its next door when the last one closes (Des)", () => {
  expat(); for (const f of ["barPremises", "nomineeWarned"]) _setFlag(f); G.quests.bar_premises = "done"; G.quests.nominee_deal = "done";
  G.quests.bar_licence = "active"; _setFlag("barLicence"); out = []; _questTick();
  assert.match(text(), /QUEST COMPLETE/); assert.match(text(), /The next door: “Fifty-One Percent” — Candy has it/);
});

test("Bert points PARTNER at both names, and answers the money he briefed (Des)", () => {
  expat(); _setFlag("barLicence"); G.room = "stinky_bar"; out = []; run("ask bert about partner");   // his pointer waits for the licence, like both partners do
  assert.match(text(), /ASK CANDY ABOUT THE PARTNERSHIP · ASK TAN ABOUT THE PARTNERSHIP/);
  ownsBar(); G.bar.lease = { key: 15000, cash: 13500, off: 0.1, tier: "high", paid: false };
  out = []; run("ask bert about key money"); assert.match(text(), /PAY KEY MONEY/);
  out = []; run("ask bert about the note"); assert.match(text(), /\(PAY THE NOTE · PAY NOTE <amount>\)/);
  out = []; run("ask bert about rent"); assert.match(text(), /Every thirty days/);
  out = []; run("ask bert about cash"); assert.match(text(), /ASK TAN ABOUT NONT/);
  G.day = 2; G.room = "candy_bar"; out = []; run("ask candy about buying a bar"); assert.match(text(), /the order you pay them is the whole trade/i);
});

test("going down behind your own rail: the floor gets you home, pockets intact (Des)", () => {
  ownsBar(); G.money = 3000; G.thirst = 100;
  stub(() => _endNight("collapse"));
  assert.equal(G.room, _hotelRoomId()); assert.equal(G.roughLost, 0, "nobody turned out the guv'nor's pockets"); assert.ok(G.money >= 3000 - 400, "only the hotel folio moved");
  assert.ok(_OWN_BAR_RESCUE.some(l => text().includes(l.slice(0, 40))), "the rescue line");
  // …and the same collapse in somebody else's bar is still the rough wake
  ownsBar(); G.room = "candy_bar"; G.money = 3000; stub(() => _endNight("collapse"));
  assert.notEqual(G.room, _hotelRoomId()); assert.ok(G.money < 3000);
});

test("'฿2,111 of it lifted' when the night's spend was ฿111 — the bigger theft is not 'of it' (Des)", () => {
  G.money = 5000; _nightSnapshot(); G.money = 4889; G.roughLost = 2111; out = []; _morningLedger();
  assert.match(text(), /down ฿111 on the night/); assert.match(text(), /฿2,111 lifted while you were out/); assert.doesNotMatch(text(), /of it lifted/);
});

test("the guv'nor drinks his own stock: nothing off the pocket, the wholesale share off the till (Des)", () => {
  ownsBar(); const m = G.money, c = G.bar.cash;
  run("buy soda"); assert.equal(G.money, m); assert.equal(G.bar.cash, c - Math.round(_beerPrice() * BAR_COGS)); assert.match(text(), /own stock/);
  out = []; run("buy beer"); assert.equal(G.money, m); assert.equal(G.bar.cash, c - 2 * Math.round(_beerPrice() * BAR_COGS)); assert.equal(G.soc.drunk, 1);
  out = []; run("buy lamai a drink"); assert.equal(G.money, m - _ladyPrice()); assert.equal(G.bar.cash, c - 2 * Math.round(_beerPrice() * BAR_COGS) + _ladyPrice(), "her drink still rings into the till");
});

test("the night's own money is kept by sign and by name — a football finish and a round on the house are two lines, not ฿1,700 of luck (Des)", () => {
  ownsBar(); G.bar.workedLast = true; G.bar.workedDay = G.day; G.bar.stoodTurns = WORK_MIN_STOOD;
  _barEvent(2200, "a football finish"); _shiftTake(-500, "a round on the house");
  const n = _barNight(G.day);
  assert.equal(G.bar.lastLines.evtIn, 2200); assert.equal(G.bar.lastLines.evtCost, 500); assert.equal(n.take - (n.costs + n.evtCost), n.net);
  out = []; run("books"); assert.match(text(), /a football finish \+฿2,200 · a round on the house −฿500/);
  G.bar.eventCash = -2500; const n2 = _barNight(G.day); assert.equal(n2.evtCost, 2500, "a pre-split save still folds in by sign");
});

test("the Bangkok lawyer sends a bill, and Tan's coffee costs sixty baht once (Des)", () => {
  expat(); for (const f of ["barPremises", "barLicence"]) _setFlag(f); G.bank = 100000; G.money = 5000;
  G.partnerWho = "candy"; G.pendingChoice = "partner"; out = []; _partnerYes();
  assert.equal(G.bank, 100000 - LAWYER_FEE); assert.match(text(), /lawyer's bill is ฿12,000/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" }; _setFlag("act1Done");
  G.room = "soi6_street"; G.money = 1000; G.known.tan = true; out = [];
  run("ask tan about buying a bar"); assert.match(text(), /BUY TAN A COFFEE/);
  // asking about coffee is a question, not a purchase — it was charging ฿60 (prose review)
  out = []; run("ask tan about coffee"); assert.equal(G.money, 1000); assert.match(text(), /buy me one\?|BUY TAN A COFFEE/);
  out = []; run("buy tan a coffee"); assert.equal(G.money, 1000 - COFFEE_PRICE); assert.match(text(), /Who really owns his own bar/);
  out = []; run("ask tan about coffee"); assert.equal(G.money, 1000 - COFFEE_PRICE, "the repeat is a gist, not a second coffee");
  out = []; run("ask tan about buying a bar"); assert.match(text(), /whose name goes on the fifty-one/);
  G.money = 10; G.flags.tanCoffee = false; delete G.talked.tan; out = []; run("buy tan a coffee");
  assert.equal(G.money, 10, "no coffee on ten baht"); assert.match(text(), /buy me one\?/);
});

test("PAY NOTE 5000 pays five thousand, not the till (Des)", () => {
  ownsBar(); G.bar.arrears = 18000; G.bar.cash = 9000; G.money = 500;
  out = []; run("pay note 5000"); assert.equal(G.bar.arrears, 13000); assert.equal(G.bar.cash, 4000); assert.equal(G.money, 500);
  out = []; run("pay the note"); assert.equal(G.bar.cash, 0); assert.equal(G.bar.arrears, 13000 - 4000 - 500);
});

test("Nont's pitch changes for a man with a Thai bank book (Des)", () => {
  expat(); G.room = _npcRoom("nont"); G.nightTurn = 30; G.known.nont = true; out = []; run("ask nont about menu");
  assert.match(text(), /money the book never sees/); assert.doesNotMatch(text(), /card fee, no daily limit/);
  assert.match(_cashMan(), /Nont/);
});

test("the counter has people at it: the cook nods, the stools shuffle along (Des)", () => {
  for (const id of ["cheap_charlies", "cheap_charlies_jt", "kiss", "kiss_jomtien", "soi_rompho"]) {
    G.room = id;
    out = []; run("talk to cook");
    assert.ok(_FOLK_COOK.some(l => text().includes(l.slice(0, 40))), `${id}: the cook answers`);
    out = []; run("talk to the regulars");
    assert.ok(_FOLK_COUNTER.some(l => text().includes(l.slice(0, 40))), `${id}: the counter answers`);
    assert.ok((ROOMS[id].revisit || []).length >= 4, `${id}: a second look is not the same paragraph`);
  }
  // …and the wok woman is not given the stranger-on-a-soi brush-off
  G.room = "cheap_charlies_jt"; out = []; run("talk to the woman on the wok");
  assert.ok(!_FOLK_GENERIC.some(l => text().includes(l.slice(0, 40))));
  // a bar is not an eatery: the pool doesn't leak
  G.room = "candy_bar"; out = []; run("talk to cook");
  assert.ok(!_FOLK_COOK.some(l => text().includes(l.slice(0, 40))));
});

test("prose review: the 51% is not the bar, and peak season is two months (slice 4)", () => {
  expat(); for (const f of ["barPremises", "barLicence"]) _setFlag(f);
  G.partnerWho = "tan"; G.pendingChoice = "partner"; out = []; _partnerYes();
  assert.doesNotMatch(text(), /You own a bar now/, "the deposit is still to pay — _doWork says so in the same state");
  assert.match(text(), /deposit is still/);
  out = []; _doWork(); assert.match(text(), /Until the deposit's paid/);
  // January is peak too, and the landlord's line said December in it
  for (const [m0, name] of [[11, "December"], [0, "January"]]) {
    newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
    _setFlag("act1Done"); expat(); for (const f of ["barPremises", "barLicence", "barPartner", "partnerCandy"]) _setFlag(f);
    G.season0 = m0; G.day = 9; G.room = "stinky_bar"; G.money = 130000; G.bank = 0;
    assert.equal(_seasonTier(), "peak"); out = []; _barDeposit();
    assert.match(text(), new RegExp(`it's ${name}, so he's a queue`));
  }
});

test("prose review: the own-bar rescue wakes you in YOUR hotel, not room 412 (slice 2)", () => {
  ownsBar(); G.hotel = "metropole"; G.money = 3000; G.thirst = 100;
  stub(() => _endNight("collapse"));
  assert.equal(G.room, _hotelRoomId());
  assert.doesNotMatch(text(), /room 412/, "the Sabai's room number on a man living in the Metropole");
});

test("prose review: 'nobody walks Sukhumvit' is no longer true, and 'what should I do' knows the stage (slice 5)", () => {
  assert.doesNotMatch(readFileSync(join(here, "../../web/js/engine-parser.js"), "utf8"), /nobody walks Sukhumvit/);
  G.room = "beach_rd_c"; assert.ok(_path("beach_rd_c", "khao_talo"), "the Darkside is walkable");
  out = []; run("what should i do");
  assert.doesNotMatch(text(), /about your wallet/, "he has had the wallet back for weeks");
  assert.match(text(), /this town runs on asking/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "act1"; G.room = "jomtien_beach"; out = []; run("what should i do");
  assert.match(text(), /about your wallet/, "…but in the opening it is the wallet");
});

test("prose review: the roast doesn't decide where you grew up, and OUT is tappable in every sibling (slice 3)", () => {
  const roast = _QV_ROAST_LINES.join(" ");
  assert.doesNotMatch(roast, /in England|Eight thousand miles/, "the player's nationality is his own");
  for (const l of _NO_EXIT_IN) assert.match(l, /\(OUT\)/, "CAPS only decorate inside parens: " + l.slice(0, 40));
});

test("prose review slice 1: the claims the authored cast was making", () => {
  const W = readFileSync(join(here, "../../web/js/world.js"), "utf8");
  // Candy is 38 and the friendship is twenty years everywhere else
  assert.doesNotMatch(W, /Forty years and she still knows/);
  // the player's age and nationality are his own
  assert.doesNotMatch(W, /since before you were born/);
  // a British narrator writes grey
  assert.doesNotMatch(W, /gray-and-white|gray sisters/);
  // constants own the numbers
  assert.doesNotMatch(W, /Come you 2500|now\? 2500, no bar/);
  // Nont's greeting sells only what the parser knows
  assert.doesNotMatch(W, /Phone unlocked, screen fixed/);
  for (const d of NPCS.nont.dialogue.filter(d => /ASK NONT ABOUT/.test(d.text || "")))
    assert.match(d.text, /BUY SIM/, "every menu names the SIM it sells");
  // the errand's own word answers: security says "ask DJ, he tell you the song"
  G.room = "rainbow_girls"; G.known.dj = true; out = []; run("ask dj about the song");
  assert.doesNotMatch(text(), /wrong man|don't know about that/);
  // two bars share a name, so the pointer says which town it is in
  assert.equal(_dupeBar("lake_beer"), true); assert.equal(_dupeBar("stinky_bar"), false);
  G.room = "candy_bar"; G.known.neil = true; out = []; run("talk to neil");
  assert.match(text(), /Sundowner/); assert.match(text(), /Darkside/, "…and the man four districts away is placed");
});

test("the signed photo behind the bottles answers a close look (slice 1)", () => {
  G.room = "candy_bar_2"; out = []; run("examine photo");
  assert.match(text(), /The first Candy Bar/); assert.match(text(), /สู้ๆ/);
  out = []; run("examine framed photo"); assert.match(text(), /The first Candy Bar/);
});
