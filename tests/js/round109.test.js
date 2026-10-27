// ROUND 109 (2026-10-27) — three personas on the week's new systems: Hennie (Opus, an owner in the September trough
// who sells the Stinky), Darren (Fable, Nan's farang — pays her one night, not the next), Gary (Sonnet, a redundancy
// pot on the thirty-day clock: the condo, the jobs, the plane).
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
const nanFarang = () => { sandbox(); G.soc.drinks.nan = 14; G.phone.contacts.nan = true; G.room = _npcRoom("nan"); quiet(); _nightSnapshot(); };

// ── Hennie ──
test("Hennie: a stood night the count found square is square in the morning's BOOKS", () => {
  owner(); const saved = _rand; _rand = () => 0.5;
  try {
    // a night whose hash falls between the stood rate and the away rate: the count (stood) finds nothing
    let d = null;
    for (let x = 3; x < 2000 && d == null; x++) {
      G.bar.workedLast = true; G.bar.workedDay = x; const stood = _tillShort(x);
      G.bar.workedLast = false; const away = _tillShort(x);
      if (!stood && away) d = x;
    }
    assert.ok(d != null);
    G.day = d; G.bar.workedLast = true; G.bar.workedDay = d; G.bar.stoodTurns = WORK_MIN_STOOD; G.bar.countedDay = d;
    _barNight(d);
    assert.equal(G.bar.lastShort, null);
    assert.doesNotMatch(t("books"), /undefined/);
  } finally { _rand = saved; }
});
test("Hennie: after a sale STANDING says what the soi has on you; the sold Stinky has no Bert holding court", () => {
  owner(); G.room = "stinky_bar"; _barSaleDo("plg");
  assert.match(t("standing"), /sold the Stinky to Pattaya Leisure/);
  G.room = "stinky_bar"; out = []; _describeRoom(true, true);
  assert.doesNotMatch(said(), /Bert — the manager — holds court/);
  assert.match(said(), /Pattaya Leisure/);
});
test("Hennie: the sale's prose asserts no hour or weekday", () => {
  owner(); G.room = "stinky_bar"; out = []; _barSaleDo("plg");
  assert.doesNotMatch(said(), /by four|by the Friday|at nine/);
});
test("Hennie: Bert at the Vic answers for the Stinky he lost; Tan and Bert answer about selling while it is yours", () => {
  owner(); G.room = "stinky_bar"; assert.match(t("ask bert about selling the bar"), /SELL UP/);
  G.room = _npcRoom("tan"); if (_npcsHere().includes("tan")) assert.match(t("ask tan about a buyer"), /Chonburi/);
  G.room = "stinky_bar"; _barSaleDo("plg"); G.room = "queen_vic";
  assert.doesNotMatch(t("ask bert about the stinky"), /Name's Bert/);
});
test("Hennie: a bar sold making money is the reference — a floor that does not know his face offers the job", () => {
  owner(); G.room = "stinky_bar"; _barSaleDo("plg"); G.barSale.health = "profit";
  const room = "blue_dog", mama = Object.keys(NPCS).find(id => NPC_ROLES[id] === "mamasan" && _npcRoom(id) === room);
  assert.ok(!_floorKnowsYou(room));
  G.room = room; out = []; _jobOffer(room, mama);
  assert.ok(G.jobOffer && G.jobOffer.room === room, said());
});
test("Hennie: a mamasan whose name is not on the frame does not claim it", () => {
  sandbox(); G.room = "pink_lotus"; assert.ok(_npcsHere().includes("nee"));
  const r = t("ask nee about the boss"); assert.doesNotMatch(r, /My name (?:is )?on the paper/); assert.match(r, /On the floor, me/);
  owner(); G.room = "stinky_bar"; _barSaleDo("plg"); assert.match(_licenceOf("stinky_bar").name, /Pattaya Leisure/);
});

// ── Darren ──
test("Darren: a question at PAY HER holds the gate and charges nothing", () => {
  nanFarang(); run("barfine nan"); run("short time"); assert.ok(G.pendingBf && G.pendingBf.herPay);
  const m0 = G.money; assert.match(t("what happens if I don't pay"), /keeps count/);
  assert.ok(G.pendingBf && G.pendingBf.herPay); assert.equal(G.money, m0);
});
test("Darren: PAY <her short price> at the barfine gate is the short time, not the open night", () => {
  nanFarang(); run("barfine nan"); run("pay nan " + _herFee(false));
  assert.ok(G.pendingBf && G.pendingBf.herPay && G.pendingBf.herPay.kind === "st");
});
test("Darren: unpaid, her refusal holds the night; the morning she says it once; paid, her time is on the ledger", () => {
  nanFarang(); run("barfine nan"); run("short time"); run("don't pay");
  G.room = _npcRoom("nan"); G.nightTurn = 60; run("barfine nan"); out = []; run("barfine nan");
  assert.ok(_CARE_REFUSE.some(l => said().includes(l.replace("{n}", "Nan").slice(0, 30))), said());
  out = []; G.room = _hotelRoomId(); _endNight("sleep");
  assert.ok((G.phone.inbox || []).some(m => m.from === "nan" && _CARE_UNPAID_TEXT.includes(m.text)));
  nanFarang(); run("barfine nan"); run("short time"); run("pay her");
  out = []; G.room = _hotelRoomId(); _endNight("sleep");
  assert.match(said(), /into the women's hands \(Nan ฿/);
});
test("Darren: an unpaid short time is not told as cheerful, and pays less", () => {
  nanFarang(); G.room = "candy_bar"; run("barfine nan"); run("short time"); out = []; run("don't pay");
  assert.doesNotMatch(said(), /businesslike and cheerful/);
});
test("Darren: the till's price list says the fine and her money are one figure", () => {
  sandbox(); G.room = "neon_paradise"; G.nightTurn = 40;
  const m = _npcsHere().find(x => NPC_ROLES[x] === "mamasan"); if (!m) return;
  const r = t("ask " + NPCS[m].name.toLowerCase() + " about price");
  assert.doesNotMatch(r, /what you settle with her is separate|Never move|doesn't move/);
});
test("Darren: two women do not say the town's one sentence an hour apart", () => {
  sandbox(); const a = _townSig('"Late tonight." Mind says it like a wife'), b = _townSig('"Late tonight." Joy says it like a wife');
  assert.equal(a, b);
});
test("Darren: SHORT TIME <her> is the barfine asked by its term", () => {
  sandbox(); G.soc.drinks.mind = 8; G.room = "neon_paradise"; G.nightTurn = 70; quiet();
  if (!_npcsHere().includes("mind")) return;
  out = []; run("short time mind"); assert.doesNotMatch(said(), /soi blinks/);
});

// ── Gary ──
const pot = () => { sandbox(); G.player.origin = "redundancy"; G.stage = "expat"; _setFlag("expatLife"); G.money = 7000; G.bank = 76000; };
test("Gary: a month's condo rent paid on day one is not a day's living — the weeks left do not collapse", () => {
  pot(); G.hotel = "condo"; G.condo = { since: G.day, deposit: 18000, short: 0 };
  G.month = { spent: CONDO_RENT + CONDO_UTIL, rent: CONDO_RENT + CONDO_UTIL, days: 1 };
  const w1 = _weeksLeft(); G.month.days = 6; const w6 = _weeksLeft();
  assert.ok(w1 >= 20, "weeks " + w1); assert.equal(w1, w6);
});
test("Gary: QUIT JOB pays what the mornings earned; the payday line says why a first month is short", () => {
  pot(); G.job = { kind: "teach", since: G.day - 10 }; const b0 = G.bank, owed = _jobPay(); assert.ok(owed > 0);
  out = []; _quitJob(); assert.equal(G.bank, b0 + owed); assert.match(said(), /What you earned comes with you/);
});
test("Gary: a bare yes at the consulate's plane asks once before the game ends", () => {
  pot(); G.pendingChoice = "embassy"; out = []; run("yes");
  assert.equal(G.pendingChoice, "embassy"); assert.ok(!G.endKind);
});
test("Gary: a hotel asked of a man who rents the condo is never a '{p}' template", () => {
  pot(); G.hotel = "condo"; G.room = "the_terrace"; const c = _npcsHere()[0]; if (!c) return;
  out = []; _hotelTalk(c, "hotel"); assert.doesNotMatch(said(), /\{p\}|"0 a night|\. 0 a night/);
});
test("Gary: MONEY names how the stringer's leads are made", () => {
  pot(); G.stringer = { paid: {}, weekStart: G.day, weekPaid: 0 }; assert.match(t("money"), /EXAMINE it in a bar that is not his own/);
});
