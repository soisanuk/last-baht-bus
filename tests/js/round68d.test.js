// Round 68's deferred findings, handed over when last-baht-bus-bd closed (2026-10-08). Clifford
// reconciled the money, Lennart subedited after the German rip, Yusuf played with his thumbs.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai.js", "world.js", "games.js", "cli-sim.js", "engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js",
  "data.js", "examples.js", "tokeniser.js", "thai-script.js", "wordcard.js", "term.js"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"), { filename: f });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const SRC = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 20000; G.bank = 50000; G.nightTurn = 30; out = [];
});

// ── Clifford: the ledger ──────────────────────────────────────────────────────
test("a loan is net on both sides: the principal is neither a win coming in nor a spend going out", () => {
  _nightSnapshot();
  G.room = "neon_paradise"; run("borrow 10000"); const owed = G.loan.owed; run("buy beer"); run("repay " + owed);
  const realLoss = 20000 - G.money;
  out = []; _morningLedger();
  assert.match(G.lastNightSaid[0], new RegExp("down ฿" + _num(realLoss).replace(",", ",") + " on the night"));
  assert.match(G.lastNightSaid[0], new RegExp("฿" + _num(owed - 10000) + " of it interest"));
});
test("Nont's five percent is booked and named, and his notes are not 'the machine'", () => {
  _nightSnapshot(); G.nontCashCount = 1;   // a transfer that clears tonight
  G.room = NPCS.nont.room; run("cash 5000");
  out = []; _morningLedger();
  assert.match(G.lastNightSaid[0], /down ฿250 on the night/);
  assert.match(G.lastNightSaid[0], /฿4,750 through Nont, ฿250 his cut/);
  assert.doesNotMatch(G.lastNightSaid[0], /machine/);
});
test("CHECK BIN counts the slips: a borrow, a cash tip and a saleng buy are not on them", () => {
  G.room = "neon_paradise"; _arriveAt("neon_paradise"); G.soc.arriveMoney.neon_paradise = G.money;
  run("buy beer"); const beer = _beerPrice();
  run("borrow 5000"); run("tip nira 100");
  out = []; run("check bin");
  assert.match(said(), new RegExp("฿" + _num(beer) + " since you sat down"));
});
test("money prints with its separator everywhere: no raw ฿${…} left in the engine", () => {
  for (const f of ["engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
    const raw = [...SRC(f).matchAll(/฿\$\{(?!_num\()([^}]*)\}/g)].map(m => m[1]).filter(x => !/toLocaleString/.test(x));
    assert.deepEqual(raw, [], f);
    // …and the concatenated shape the money audit found: "฿" + G.money
    const cat = [...SRC(f).matchAll(/(?:฿|\\u0e3f)["'] *\+ *(?!_num\()([A-Za-z_][\w.]*)/g)].map(m => m[1]);
    assert.deepEqual(cat, [], f + " concatenation");
  }
  G.bank = 73900; G.room = "beach_rd_c"; out = []; run("send 99999999 to candy");
  assert.doesNotMatch(said(), /฿\d{5,}/, "no five-digit figure without its comma: " + said());
});

// ── Lennart: the subeditor ────────────────────────────────────────────────────
test("a greeting, a line to her by name, or another language is not the player's biography", () => {
  G.room = NPCS.bpom.room; run("talk to bpom");
  assert.ok(G.convoQ, "she asked something");
  run("guten abend bpom"); assert.ok(G.convoQ, "still waiting"); assert.deepEqual(G.player.said, {});
  run("sprichst du deutsch"); assert.ok(G.convoQ); assert.deepEqual(G.player.said, {});
  run("manchester"); assert.equal(Object.values(G.player.said)[0], "manchester", "a real answer is still an answer");
});
test("a bare name and a command that names her still pass while she waits", () => {
  G.room = "stinky_bar"; run("talk to bert");
  if (!G.convoQ) return;   // Bert's opener had no question tonight
  out = []; run("bert"); assert.doesNotMatch(said(), /takes the hello/);
});
test("Glam answers German, and a man is mein Junge, not liebchen", () => {
  G.room = _npcWhere("glam") || NPCS.glam.room; out = []; run("ask glam about deutsch");
  assert.match(said(), /Köln, Junge/);
  assert.ok(!NPCS.glam.dialogue.some(d => /liebchen/i.test(d.text + (d.short || ""))));
});
test("TAO RAI and WAI count on the Thai ladder", () => {
  G.room = "neon_paradise"; G.thaiSaid = {};
  run("tao rai"); run("wai nira");
  assert.ok(G.thaiSaid["tao rai"] && G.thaiSaid.wai);
});
test("a pronoun is the helper's: no raw .pronoun === anywhere in the engine", () => {
  for (const f of ["engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"])
    assert.doesNotMatch(SRC(f), /\.pronoun\s*===/, f);
  assert.equal(_pr("diamond").o, "her");
});

// ── Yusuf: thumbs only ────────────────────────────────────────────────────────
test("the bus's stops are buttons: every stop it prints leads the chip bar", () => {
  G.room = "buakhao_klang"; G.money = 500; run("ride bus");
  const chips = _chipSet().map(c => c.cmd).filter(c => c.startsWith("ride bus to"));
  assert.equal(chips.length, G.busAskStops.length); assert.ok(chips.length >= 2);
  out = []; run(chips[0]); assert.match(said(), /hop off|PAY/);
});
test("a named way out has a dock button, and the torch is offered before the dark", () => {
  G.room = "naklua_rd"; assert.ok(_navExtra().some(x => x.cmd === "go spa"));
  run("go spa"); assert.equal(G.room, "naklua_massage");
  G.room = "hotel_room"; G.lightOn = false; G.battery = 50;
  assert.ok(_chipSet().some(c => c.cmd === "light on"), "your room opens onto the dark hotel soi");
});
test("two items with one name: the tap offers TAKE on the one in this room", () => {
  const twins = Object.keys(ITEMS).filter(i => ITEMS[i].name === "empty Singha bottle");
  assert.ok(twins.length >= 2);
  for (const id of twins) {
    const room = G.itemLoc[id]; if (!room || room === "inventory") continue;
    G.room = room;
    assert.ok(_term.kwActions("item", "empty Singha bottle", false).some(a => a.t === "take"), room);
  }
});
