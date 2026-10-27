// SELLING THE BAR ON (2026-10-27) — the bar can be sold without the affair's door, to Pattaya Leisure (the most money,
// and the soi's opinion), through Tan (clean, his fee is the profit, his standing drops) or to Bert with Candy behind
// him (the least money, the soi's good word, only a bar standing up); and how it stood when it went decides whether a
// floor will hire the seller as its manager: under water never, about even after a while, making money at a premium.
import { test, beforeEach } from "node:test";
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
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const owner = (partner = "partnerCandy") => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); quiet();
  G.stage = "expat"; for (const f of ["expatLife", "barPremises", "barLicence", "barPartner", "barPaid", "barOpen", partner]) _setFlag(f);
  G.day = 40; G.money = 5000; G.bank = 10000; G.known.tan = true; G.known.bert = true; G.talked = Object.assign(G.talked || {}, { tan: [], bert: [], doug: [], fast_eddy: [] });
  Object.assign(G.bar, { room: "stinky_bar", cash: 8000, owed: 1500000, arrears: 0, rentOwed: 0, rentShort: 0, nights: BAR_SALE_MIN });
  G.room = "stinky_bar"; G.nightTurn = 30;
};
// an ownership at a given season-read net a night: the shape _barHealth reads
const month = perNight => { G.bar.perf = { n: 30, adj: perNight * 30 }; };
const due = () => _barRent() + BAR_MONTHLY;
const nightsAt = cover => month(Math.round(due() * cover / 30));
const askJob = () => {   // a cash bar whose floor knows him, asked the real way
  G.room = "lucky_tiger"; const mama = Object.keys(NPCS).find(i => NPC_ROLES[i] === "mamasan" && _npcRoom(i) === "lucky_tiger") ||
    Object.keys(NPCS).find(i => NPC_ROLES[i] === "mamasan" && NPCS[i].room === G.room);
  return mama;
};
beforeEach(() => { out = []; });

test("health reads the trailing month against rent and the note: under, even, profit", () => {
  owner();
  nightsAt(0.3); assert.equal(_barHealth(), "under");
  nightsAt(1.0); assert.equal(_barHealth(), "even");
  nightsAt(2.0); assert.equal(_barHealth(), "profit");
  G.bar.rentOwed = 15000; assert.equal(_barHealth(), "under", "rent behind is under water whatever the till says");
  G.bar.rentOwed = 0; G.bar.loan = { owed: 9000 }; assert.equal(_barHealth(), "even", "a bar owing Nont is not a bar making money");
});

test("the real night counts for the whole ownership, each night read for its season", () => {
  // the same thirty nights, traded in the deep low and in peak: the wet ones read better than they took, the peak ones worse
  const run30 = m0 => {
    owner(); G.season0 = m0; G.bar.perf = null; G.money = 1e7;
    const saved = _rand; let raw = 0;
    try { _rand = () => 0.5;
      for (let d = 1; d <= 30; d++) { G.day = d; G.bar.lastMonthDay = 1; G.bar.workedLast = true; G.bar.workedDay = d; G.bar.stoodTurns = 60;
        G.bar.loan = null; const c0 = G.bar.cash; _barNight(d); raw += G.bar.cash - c0; }
    } finally { _rand = saved; }
    return { raw, read: _barMonthNet().month, n: G.bar.perf.n };
  };
  const wet = run30(8), peak = run30(11);   // September, December
  assert.equal(wet.n, 30); assert.equal(peak.n, 30);
  assert.ok(wet.read > wet.raw, `a wet month reads above what it took (${wet.read} vs ${wet.raw})`);
  assert.ok(peak.read < peak.raw, `a peak month reads below what it took (${peak.read} vs ${peak.raw})`);
  // and it is the whole ownership, not a window: a second month adds to the count
  _barNight(31); assert.equal(G.bar.perf.n, 31);
});

test("SELL UP without the affair offers three buyers, and a question leaves it up", () => {
  owner(); nightsAt(1.5);
  const s = t("sell up");
  assert.equal(G.pendingChoice, "barsale");
  assert.match(s, /PLG — Pattaya Leisure/); assert.match(s, /TAN — he finds a buyer/); assert.match(s, /BERT — ฿/);
  // the offers and nothing else: no debts, no till, no season read on the screen (Mario, 2026-10-27)
  assert.doesNotMatch(s, /owed|note|ordinary month|season|till/);
  t("what happens if i sell to plg?"); assert.equal(G.pendingChoice, "barsale"); assert.ok(_barOwned(), "a question commits nothing");
  t("no"); assert.equal(G.pendingChoice, null); assert.ok(_barOwned());
});

test("Bert cannot carry a bar under water, and the prompt says why", () => {
  owner(); nightsAt(0.2);
  const s = t("sell up");
  assert.doesNotMatch(s, /BERT — /); assert.match(s, /Bert would, if it were standing up/);
  t("bert"); assert.equal(G.pendingChoice, "barsale", "BERT is not an answer when he cannot buy");
});

test("PLG: the money, the debts cleared, the soi cold — Bert at the Vic, his rail and the White Rabbit with him", () => {
  owner(); nightsAt(1.0); G.bar.arrears = 10000; G.known.doug = true;
  const bank0 = G.bank, rep0 = G.rep || 0, indie0 = _faction("indie"), dougT = _npcState("doug").trust, eddyT = _npcState("fast_eddy").trust;
  t("sell up"); const s = t("plg");
  assert.ok(_flag("barSoldOn") && _flag("barToPlg") && !_barOwned());
  assert.equal(G.bank - bank0, 8000 + BAR_SALE_PLG.even, "the till and the group's figure over the debts");
  assert.equal(G.barSale.via, "plg"); assert.equal(G.barSale.health, "even");
  assert.ok(G.rep < rep0 && _faction("indie") < indie0 && _faction("plg") > 0);
  assert.ok(_npcState("doug").trust < dougT || dougT === 0, "Bert's rail");
  assert.ok(_npcState("fast_eddy").trust < eddyT || eddyT === 0, "the White Rabbit");
  assert.match(s, /Gavin/);
  assert.equal(_npcRoom("bert"), "queen_vic", "Bert does not stay for the group");
  G.room = "stinky_bar"; assert.match(t("talk to doug"), new RegExp(_SOLD_RAIL_COLD.map(f => f("Doug").slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")));
  G.room = "queen_vic"; assert.match(t("talk to bert"), /outbid you/);
  G.room = "white_rabbit"; G.known.fast_eddy = true; assert.match(t("talk to eddy"), /Pattaya Leisure/);
});

test("Tan: debts cleared, no money but the till, his fee named, his standing down; Bert stays", () => {
  owner("partnerTan"); nightsAt(2.0);
  const bank0 = G.bank, syn0 = _faction("syndicate");
  t("sell up"); const s = t("tan");
  assert.equal(G.bank - bank0, 8000, "the till only — what it fetched over the debts is Tan's");
  assert.match(s, /my fee/);
  assert.equal(G.barSale.fee, BAR_SALE_PLG.profit);
  assert.ok(_faction("syndicate") < syn0);
  assert.equal(_npcRoom("bert"), "stinky_bar");
  G.room = "stinky_bar"; assert.match(t("talk to bert"), /Chonburi/);
});

test("Bert: the note his, Candy's name on the paper, what his bank book holds less what he won't carry, the rail warm", () => {
  owner("partnerTan"); nightsAt(1.0); G.bar.loan = { owed: 5000 }; G.known.doug = true;
  const bank0 = G.bank, rep0 = G.rep || 0;
  t("sell up"); const s = t("bert");
  assert.ok(_flag("barToBert"));
  assert.equal(G.bank - bank0, 8000 + BAR_SALE_BERT.even - 5000);
  assert.match(s, /Never had the deposit/); assert.match(s, /her name on the fifty-one/);
  assert.ok(G.rep > rep0);
  G.room = "stinky_bar"; assert.match(t("talk to bert"), /Customer/);
  assert.doesNotMatch(t("ask bert about opening"), /Nothing changes/, "the opening night does not come round again");
  assert.ok(!_barOwned());
});

test("nobody buys a bar with less than three months of books; BOOKS says how long; her door waits for nothing", () => {
  owner(); nightsAt(1.5); G.bar.nights = BAR_SALE_MIN - 10;
  assert.match(t("sell up"), /three months/); assert.equal(G.pendingChoice, null); assert.ok(_barOwned());
  assert.match(t("books"), /10 more nights/);
  G.bar.nights = BAR_SALE_MIN; t("sell up"); assert.equal(G.pendingChoice, "barsale");
});
test("the sale says, in one sentence, how it was run", () => {
  for (const [cover, re] of [[1.5, /You ran it well, and it sold like it\. Enjoy the money/], [1.0, /You kept it standing/], [0.2, /You ran it into the ground/]]) {
    owner(); nightsAt(cover); t("sell up"); assert.match(t("plg"), re);
  }
});

test("the owner's lines stop after a sale: BOOKS, WORK, DRAW, Bert's 'Boss', and SELL UP again", () => {
  owner(); nightsAt(1.0); t("sell up"); t("tan");
  assert.match(t("books"), /a man from Chonburi/);
  assert.match(t("work"), /sold it on/);
  assert.match(t("draw 100"), /no till of yours/);
  assert.match(t("sell up"), /Sold already/);
  G.room = "stinky_bar"; assert.doesNotMatch(t("talk to bert"), /^"Boss\./m);
  assert.doesNotMatch(t("ask bert about the note"), /a month to Ohio/);
});

test("hiring: under water never, about even after the cool-down, making money at a premium", () => {
  const mamaAt = room => Object.keys(NPCS).find(i => NPC_ROLES[i] === "mamasan" && NPCS[i].room === room);
  const room = Object.keys(ROOMS).find(r => ROOMS[r].bar && mamaAt(r) && !_companyBar(r) && r !== "stinky_bar" && r !== "white_rabbit");
  const ask = () => { G.jobOffer = null; out = []; _jobOffer(room, mamaAt(room)); return said(); };
  const knows = () => { const g = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && NPCS[i].room === room); G.soc.drinks[g] = 30; G.known[g] = true; };

  owner(); nightsAt(0.2); t("sell up"); t("plg"); knows();
  assert.equal(G.barSale.health, "under");
  assert.ok(!/A manager\?/.test(ask()) && !G.jobOffer, "never"); G.day += 400; assert.ok(!G.jobOffer && !/A manager\?/.test(ask()), "never means never");

  owner(); nightsAt(1.0); t("sell up"); t("tan"); knows();
  assert.match(ask(), /Ask me again in \d+ day/); assert.ok(!G.jobOffer);
  G.day += BAR_SALE_COOL; assert.match(ask(), new RegExp("฿" + _num(MGR_CASH_PAY) + " a month")); assert.ok(G.jobOffer);

  owner(); nightsAt(2.0); t("sell up"); t("tan"); knows();
  const pay = Math.round(MGR_CASH_PAY * BAR_SALE_PREMIUM / 1000) * 1000;
  assert.match(ask(), new RegExp("฿" + _num(pay) + " a month")); assert.ok(G.jobOffer && G.jobOffer.prem);
  G.room = room; t("take the job"); assert.ok(G.job && G.job.prem); assert.equal(_mgrPay(G.job), pay);
});

test("a bar lost for the rent reads as under water to every floor", () => {
  owner(); _barLost("landlord");
  assert.equal(G.barSale.health, "under"); assert.equal(G.barSale.via, "lost");
});

test("the three surfaces: SELL UP in the info menu and the completion while the bar is yours, and the gate's chips", () => {
  owner(); nightsAt(1.0);
  assert.ok(engineComplete("__info ").includes("sell up"));
  assert.ok(engineComplete("sell ").some(x => /up/.test(x)));
  run("sell up"); const chips = _chipSet().map(c => c.cmd || c[0] || c);
  assert.ok(JSON.stringify(chips).includes("plg") && JSON.stringify(chips).includes("bert"));
});

test("the affair's door is still its own sale, and still ends the game", () => {
  owner(); _setFlag("affairOffered"); G.affair = { id: "manow", since: G.day - 70, strain: 1, floorSour: 0, crisSeen: [], crisChose: {}, warned: {} };
  t("sell up"); assert.equal(G.pendingChoice, "sellbar");
});
