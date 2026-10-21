// MARIO'S RULINGS OF 2026-10-22, after round 102: (1) a manager cannot barfine his own girls — prohibited — and his drinks at
// his own bar are complimentary; (2) no baht bus goes up Pratumnak — you walk up to Thepprasit Road or take a bike, and every
// sizable condo has one or two piwin at its gate; (3) the laundering jobs pay both doors, and the crooked door's higher pay
// carries a risk that comes back; (4) Nont's ฿200 locate is confirmed before it is paid.
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
const SL = "sunset_rail";   // the Shady Lady: Pukky, Bussaba (mamasan), Numfon (cashier)
// the hill seed, the game's own way: the Soi 6 man who cancelled the ticket, the lease signed at the tower, Pukky at regular
const hill = () => {
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1");
  G.player.origin = "pension"; quiet(); G.day = 8; G.pendingChoice = "vacation_end"; run("continue"); run("cancel the ticket");
  G.money = 12000; G.bank = 60000; G.room = "pratumnak_soi5"; G.nightTurn = 2; run("rent a condo"); run("rent a condo");
  assert.equal(G.hotel, "condo", "the lease signed");
  G.soc.drinks.pukky = 9; G.phone.contacts.pukky = true; G.talked.pukky = [0]; (G.metDay = G.metDay || {}).pukky = 3; (G.seenDay = G.seenDay || {}).pukky = G.day - 1;
  quiet(); out = [];
};
const hire = () => { G.room = SL; G.nightTurn = 20; run("talk to bussaba"); run("ask bussaba about a job"); run("take the job"); assert.ok(G.job && G.job.room === SL, "hired"); };

beforeEach(() => { newGame(); });

test("a manager cannot barfine his own floor — BARFINE, TAKE OUT and GO HOME WITH are refused, and no money moves", () => {
  hill(); hire(); const m = G.money;
  for (const c of ["barfine pukky", "take pukky out", "go home with pukky"]) {
    const r = t(c); assert.match(r, /manager|boss|the job|my floor/i, c); assert.equal(G.pendingBf || null, null, c); assert.equal(G.party || null, null, c);
  }
  assert.equal(G.money, m, "nothing paid");
  assert.equal(_myFloorGirl("pukky"), true); assert.equal(_myFloorGirl(Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && NPCS[id].room !== SL)), false, "another bar's girl is not his floor");
});

test("a manager's drinks at his own bar are on the house: his beer, his water, and his girl's lady drink", () => {
  hill(); hire(); quiet(); const m = G.money, till = G.bar && G.bar.cash;
  assert.match(t("buy beer"), /on the house|manager/i); assert.equal(G.money, m, "the beer");
  t("buy water"); assert.equal(G.money, m, "the water");
  t("buy pukky a drink"); assert.equal(G.money, m, "the lady drink");
  // …and only at his own bar
  G.room = "soi6_middle_bar_1" in ROOMS ? "soi6_middle_bar_1" : Object.keys(ROOMS).find(r => ROOMS[r].barType === "soi6" && r !== SL);
  G.nightTurn = 20; quiet(); const m2 = G.money; t("buy beer"); assert.ok(G.money < m2, "another bar charges");
});

test("Pratumnak: no baht bus up the hill — the street says the trucks are on Thepprasit and the bikes wait at the tower's gate", () => {
  const p = ROOMS.pratumnak_soi5;
  assert.match(p.desc, /motorbike taxi|piwin/i); assert.match(p.desc, /Thepprasit/);
  hill(); G.room = "beach_rd_s" in ROOMS ? "beach_rd_s" : "pattaya_tai"; G.nightTurn = 20;
  const r = t("ride bus home"); assert.match(r, /no baht bus goes up Pratumnak/); assert.match(r, /Thepprasit/); assert.match(r, /MOTOSAI HOME/);
});

test("Nont's ฿200 is named and waits for a YES — another command lets it go, and a YES pays it", () => {
  G.player = { origin: "monger", personality: "joker", orientation: "straight" }; _setFlag("act1Done"); _setFlag("hasWallet");
  G.stage = "vacation"; G.money = 5000; G.room = "buakhao_market"; G.nightTurn = 30; quiet();
  const target = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _npcWhere(id) && !NPCS[id].filler);
  const nm = NPCS[target].name.toLowerCase();
  assert.match(t(`ask nont about ${nm}`), /YES to pay ฿200/); assert.equal(G.money, 5000, "nothing on the ask");
  t("look"); t("yes"); assert.equal(G.money, 5000, "a YES after another command is not his");
  t(`ask nont about ${nm}`); t("yes"); assert.equal(G.money, 5000 - NONT_LOCATE, "the confirmed fee");
  assert.match(said(), new RegExp(_barName(_npcWhere(target)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // asking the same name twice is a confirmation too
  G.soc.nontTold = {}; G.money = 5000; t(`ask nont about ${nm}`); t(`ask nont about ${nm}`); assert.equal(G.money, 5000 - NONT_LOCATE);
});

// ── the laundering doors ──
const choice = lab => { for (const [id, n] of Object.entries(NPCS)) for (const d of n.dialogue || []) for (const c of d.choices || []) if (c.label === lab) return [id, c]; };
const pick = (lab) => { const [id, c] = choice(lab); c.fx && c.fx(_npcState(id), G); return id; };
const hitDay = (kind, want) => { for (let d = 1; d < 400; d++) if ((_hh("launder:" + kind + ":" + d, 7) % 100 < LAUNDER_RISK_PCT) === want) return d; };

test("every laundering job pays its honest door — less than the crooked one", () => {
  newGame(); _setFlag("act1Done"); G.money = 1000;
  pick("Tell him who she is"); assert.equal(G.money, 1000 + LAUNDER_HONEST.fiftyone, "Reginald pays the walk");
  for (const [lab, who] of [["Tell her the number", "hong"], ["Tell him it's been three bars in two years", "nont"], ["Give him the slips", "colin"]]) {
    pick(lab); const p = G.jobPay[G.jobPay.length - 1]; assert.equal(p.who, who, lab); assert.ok(p.amt > 0, lab);
  }
  assert.ok(LAUNDER_HONEST.covers < 2000 && LAUNDER_HONEST.fiftyone < 1000 && LAUNDER_HONEST.verification < 3000 && LAUNDER_HONEST.presale < 3000, "the crooked door pays more");
  // the hand payout waits for the person; the text carries the money
  G.jobPay = [{ due: G.day, kind: "hand", who: "hong", amt: 1000, line: "envelope {amt}" }, { due: G.day, kind: "msg", who: "colin", amt: 1500, line: "sent" }];
  G.room = "beach_rd_c"; _questTick(); assert.equal(G.jobPay.length, 1, "Hong is not here; Colin's text went");
  assert.equal(G.phone.inbox[G.phone.inbox.length - 1].gives, 1500);
  G.room = _npcRoom("hong"); const m = G.money; out = []; _questTick(); assert.equal(G.money, m + 1000); assert.match(said(), /฿1,000/);
});

test("the Name on the Wall pays Orathai's fee when it closes", () => {
  newGame(); _setFlag("act1Done"); G.quests.nameonwall = "active"; _setFlag(QUESTS.nameonwall.doneFlag);
  G.room = _npcRoom("orathai"); const m = G.money; _questTick(); _questTick();
  assert.equal(G.money, m + LAUNDER_HONEST.nameonwall);
});

test("a crooked door books its risk by a pure hash of the day — never dice — and only some of the time", () => {
  for (const k of ["covers", "fiftyone", "verification", "presale"]) {
    newGame(); G.day = hitDay(k, false); assert.equal(_launderArm(k), false, k + " clean"); assert.equal(G.launderRisk.length, 0);
    newGame(); G.day = hitDay(k, true); const r0 = G.rng; assert.equal(_launderArm(k), true, k + " hit"); assert.equal(G.rng, r0, "no dice");
    const due = G.launderRisk[0].due - G.day; assert.ok(due >= LAUNDER_RISK_MIN && due < LAUNDER_RISK_MIN + LAUNDER_RISK_SPAN, k);
  }
  newGame(); G.day = hitDay("covers", true); pick("Tell her it adds up"); assert.equal(G.launderRisk.length, 1, "the choice arms it");
});

test("the risk lands at the wake before the ledger, takes its cost, and the ledger names it", () => {
  for (const k of ["covers", "fiftyone", "verification"]) {
    newGame(); _setFlag("act1Done"); G.stage = "vacation"; G.money = 3000; G.bank = 20000; const rep = G.rep || 0;
    G.launderRisk = [{ kind: k, due: G.day + 1 }]; G.nightTurn = 30; G.room = "beach_rd_c"; quiet(); _nightSnapshot(); out = [];
    _endNight("sleep");
    assert.equal(G.launderRisk.length, 0, k); assert.ok((G.rep || 0) < rep, k + " the town noticed");
    assert.ok(G.money + G.bank <= 23000 - LAUNDER_COST[k], k + " the cost left pocket or account");
    assert.match(said(), new RegExp("฿" + _num(LAUNDER_COST[k])), k + " named on the ledger");
  }
  newGame(); _setFlag("act1Done"); G.stage = "vacation"; G.launderRisk = [{ kind: "presale", due: G.day + 1 }]; G.room = "beach_rd_c"; quiet(); _nightSnapshot(); out = [];
  const cap = _atmCap(); _endNight("sleep");
  assert.equal(_atmCap(), Math.round(cap / 2), "the bank halves the daily cash"); assert.match(_acctNote(), /list you sold/);
  assert.match(said(), /halved while the bank looks/);
});
