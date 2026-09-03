// Nont, the priced fixer — Tan's mirror. See CLAUDE.md.
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
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.money = 5000; G.bank = 50000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2; G.room = "buakhao_market";
  assert.ok(_nontHere(), "Nont is at his table");
});

test("the locator: anybody, tonight, ฿200 — and nothing else moves", () => {
  const target = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _npcWhere(id) && !NPCS[id].filler);
  const rep = G.rep, bond = G.soc.drinks[target] || 0, trust = _npcState("nont").trust;
  run(`ask nont about ${NPCS[target].name.toLowerCase()}`);
  assert.equal(G.money, 5000 - NONT_LOCATE);
  assert.match(text(), new RegExp(_barName(_npcWhere(target)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(text(), /over on/, "…with the district");
  assert.equal(G.rep, rep); assert.equal(G.soc.drinks[target] || 0, bond); assert.equal(_npcState("nont").trust, trust, "no favour, no bond, no rep");
  out = []; run(`ask nont about ${NPCS[target].name.toLowerCase()}`);
  assert.equal(G.money, 5000 - NONT_LOCATE, "the same answer the same night is free");
  assert.match(text(), /Told you already/);
});

test("no charge for a no, a laugh for Tan, a refusal when broke", () => {
  const saved = _npcWhere; _npcWhere = id => id === "lek" ? null : saved(id);
  try { run("ask nont about lek"); assert.equal(G.money, 5000); assert.match(text(), /don't charge for a no/); }
  finally { _npcWhere = saved; }
  out = []; run("ask nont about tan"); assert.equal(G.money, 5000); assert.match(text(), /Tan finds YOU/);
  G.money = 100; out = []; run("ask nont about candy"); assert.equal(G.money, 100); assert.match(text(), /haven't got it/);
  assert.match(text(), /ask Tan and owe him instead/, "the contrast is the design");
});

test("Tan still takes no money for the same question", () => {
  G.room = "soi6_street"; G.known.candy = true; const m = G.money;
  run("ask tan about candy"); assert.equal(G.money, m);
});

test("CASH: five percent, no card fee, no daily cap, ฿500 minimum, from the account", () => {
  // the first transfer of a night has a one-in-six "moment" by pure hash — stand on a night whose hash is clean
  while (_hh("nontstuck:" + G.vacation + ":" + G.day + ":1", 71) % 6 === 0) G.day++;
  run("cash 2000");
  assert.equal(G.money, 5000 + 1900); assert.equal(G.bank, 48000);
  assert.equal(G.atmFees || 0, 0, "no ATM fee"); assert.equal(_atmDrawnToday(), 0, "not the machine's cap");
  out = []; run("cash 300"); assert.match(text(), /Five hundred minimum/); assert.equal(G.bank, 48000);
  out = []; run("cash 99999"); assert.match(text(), /haven't got that/);
  G.room = "candy_bar"; out = []; run("cash 1000"); assert.match(text(), /No Nont here/);
});

test("one transfer in six has a moment, and lands at the next wake", () => {
  let stuckSeen = false, landed = false;
  for (let i = 0; i < 40 && !stuckSeen; i++) {
    G.day = 2 + i; G.nontCashCount = 0; G.bank = 50000; G.money = 5000; G.nontStuck = 0; out = [];
    run("cash 1000");
    if (/having a moment/.test(text())) {
      stuckSeen = true;
      assert.equal(G.money, 5000, "no notes tonight"); assert.equal(G.bank, 49000, "the account is down");
      assert.equal(G.nontStuck, 950);
      G.room = "hotel_room"; out = []; _endNight("sleep");
      landed = /sorted/.test(text()) && G.money > 5000 && G.nontStuck === 0;
    }
  }
  assert.ok(stuckSeen, "the hash makes it happen within forty nights");
  assert.ok(landed, "…and the money comes back a day late");
});

test("CHARGE PHONE at his table needs no charger: ฿50, three ticks", () => {
  G.battery = 5; G.itemLoc.charger = null; const t = G.turns;
  run("charge phone");
  assert.equal(G.battery, 100); assert.equal(G.money, 5000 - NONT_CHARGE); assert.ok(G.turns - t >= 3);
});

test("three surfaces, and the menu in his own mouth", () => {
  assert.ok(_COMPLETE_VERBS.includes("cash"));
  assert.ok(_npcActions("nont", true).includes("cash"));
  assert.ok(engineComplete("cash ").length > 0, "amounts complete at his table");
  out = []; run("talk to nont"); assert.match(text(), /Tan does favours\. I do prices/);
  out = []; run("ask nont about prices"); assert.match(text(), /Pay me and we're square|Me you pay and/);
  out = []; run("withdraw 1000"); assert.match(text(), /foreign-card fee/, "the machine beside him still charges the fee — that is the contrast");
});
