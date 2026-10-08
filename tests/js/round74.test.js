// Round 74 (2026-10-08), aimed at the laundering material the day it shipped.
// Graham Pryce (Fable, lens: paper-reader): a retired fraud detective who read 41 frames in nine districts — "the paper
// tells me exactly one true thing: whoever is standing nearest the till tonight."
// Vince Mallory (Opus, lens: crooked-completionist): every job done the way that pays, then a month on the soi — "every
// envelope landed before the bloke who was meant to deliver it had got his shoes on."
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
const ask = (id, t) => { G.convoQ = null; out = []; run(`ask ${id} about ${t}`); return said(); };
const look = room => { G.room = room; G.nightTurn = 40; G.soc.licLook = {}; out = []; run("examine licence"); return said(); };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 7000; G.bank = 5000; G.nightTurn = 40; G.season0 = 2; out = [];
});

// ── Graham: the paper records the owner, not the rota ────────────────────────
test("a frame names its owner whichever of her bars she works tonight; the authored owners agree with their walls", () => {
  const hive = Object.keys(ROOMS).find(r => ROOMS[r].bar === "The Hive");
  for (const d of [3, 4, 5, 6, 7]) { G.day = d; assert.match(look(hive), /in the name of Kesorn, who owns three of these/, "day " + d); }
  assert.match(_licenceOf("stinky_bar").line, /an American's/); assert.match(_licenceOf("kitten_corner").name, /Pattaya Leisure/); assert.match(_licenceOf("golden_dragon").name, /Pattaya Leisure/);
  assert.match(_licenceOf("white_rabbit").line, /Eddy is on the paper.*NUAN/s);
  assert.equal(_licenceOf("paradise_nights").kind, "company", "a wristband club is not the cheapest kind of bar there is to lose");
  assert.match(_licenceOf("mama_yai").line, /does not take 'Mama' as a first name/);
  for (const r of NPCS.lawan.bars) assert.equal(_licenceOf(r).owner, "lawan", r);
});
test("no chorus: the owner's own reaction is a pool, and the detective's eye never calls the usual arrangement rare", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /rarer than it sounds/);
  G.player.origin = "pi"; assert.doesNotMatch(look("cloze"), /Two million, to the baht/, "Cloze's eye reads Cloze's paper");
  assert.doesNotMatch(look("sandy_toes"), /a woman's name/, "the Verandah's eye reads the Verandah's paper");
});
test("the nominee is named, and the same name on several companies is noticed — Orathai among them", () => {
  const gogos = Object.keys(ROOMS).filter(r => ["gogo", "gents"].includes(ROOMS[r].barType) && _licenceOf(r) && _licenceOf(r).nominee === "Orathai Wongsuwan");
  assert.ok(gogos.length >= 2, "Orathai signs for more than one room");
  look(gogos[0]); assert.match(said(), /ORATHAI WONGSUWAN/);
  look(gogos[1]); assert.match(said(), /Orathai Wongsuwan again — the same 51\.00/);
});
test("the paper is askable: the owner, her staff, Nont and Orathai on the lawyer, Mort on his company, Eddy on his permit, Tan on the frame", () => {
  G.room = "candy_bar"; G.day = 2; run("talk to candy"); assert.match(ask("candy", "licence"), /Mine|Is me/); assert.doesNotMatch(said(), /wrong woman/);
  G.room = "lucky_tiger"; run("talk to ging"); assert.match(ask("ging", "the owner"), /Ratana/);
  G.room = "buakhao_market"; run("talk to nont"); assert.match(ask("nont", "the lawyer"), /Second Road/);
  run("talk to orathai"); assert.match(ask("orathai", "the lawyer"), /Benjawan/);
  G.room = "queen_vic"; run("talk to mort"); assert.match(ask("mort", "director"), /director/i);
  G.room = "white_rabbit"; run("talk to eddy"); assert.match(ask("eddy", "licence"), /Nuan's name on the fifty-one/);
  G.room = _npcRoom("tan"); run("talk to tan"); assert.match(ask("tan", "registration"), /Second Road/);
});
test("a lapsed TELL chip is 'that moment's passed', not the verb lecture; YES at a night's end means it; EXAMINE FRAME is the frame", () => {
  G.room = "lucky_tiger"; G.nightTurn = 50; G.itemLoc.bar_listing = "inventory"; G.quests.verification = "active";
  run("talk to nigel"); run("ask nigel about the listing"); run("talk to ging");
  out = []; run("tell him it's been three bars in two years"); assert.doesNotMatch(said(), /Telling isn't the verb/);
  G.room = _hotelRoomId(); G.nightTurn = 20; out = []; run("sleep"); const d0 = G.day; run("yes"); assert.equal(G.day, d0 + 1, "yes slept");
  G.room = "lucky_tiger"; G.nightTurn = 40; out = []; run("examine frame"); assert.match(said(), /commercial registration/);
});
test("the regulars row is a town-wide book: one line is not two bars' sentence, nor one woman's about two men", () => {
  G.nightTurn = 50; const seen = {};
  for (const [id, n] of Object.entries(NPCS)) {
    if (!n.patron || !n.room || !ROOMS[n.room] || !ROOMS[n.room].bar) continue;
    const st = Object.keys(NPCS).filter(i => (NPC_ROLES[i] === "cashier" || NPC_ROLES[i] === "mamasan") && NPCS[i].room === n.room); if (!st.length) continue;
    G.room = n.room; run("talk to " + st[0]); const t = ask(st[0], n.name.toLowerCase()).replace(n.name, "X").replace(NPCS[st[0]].name, "N").split("·")[0].trim();
    if (_TOWN.regular.house.concat(_TOWN.regular.floor).some(l => t.startsWith(String(l).slice(0, 6).replace(/\{\w+\}/g, "")))) (seen[t] = seen[t] || []).push(st[0] + "@" + n.room);
  }
  const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
  assert.ok(dup.length <= 1, "at most the pigeonhole's one repeat: " + JSON.stringify(dup));
  assert.ok(_TOWN_WIDE.has("regular") && _TOWN_WIDE.has("owner"));
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /about \{his\} divorce|my daughter a schoolbag|photo of \{his\} dog/, "a pooled line asserts no biography of the man or the speaker");
});
test("the eleven words the trainer added reach their verbs: borrow, interest, debt, the bill, goodbye, the wallet, moving, Cream, the stalls", () => {
  const want = { "ยืมเงินสองพัน": "borrow 2000", "ถามนิราเรื่องดอกเบี้ย": "ask nira about interest", "ถามนิราเรื่องหนี้": "ask nira about debt",
    "เช็คบิล": "check bin", "ลาก่อน": "goodbye", "ถามแคนดี้เรื่องกระเป๋าสตางค์": "ask candy about wallet", "กระเป๋าตังค์": "wallet",
    "ย้ายมาอยู่พัทยา": "move to pattaya", "ถามครีม": "ask cream", "ขอหมูปิ้ง": "buy moo ping", "ขอจระเข้": "buy crocodile" };
  for (const [th, en] of Object.entries(want)) assert.equal(_thaiToCmd(th), en, th);
  G.room = "neon_paradise"; G.nightTurn = 30; run("talk to nira"); run("ยืมเงินสองพัน"); assert.ok(G.loan, "borrowed in Thai");
  G.room = "second_rd_mall"; G.hunger = 60; const m0 = G.money; run("ขอจระเข้"); assert.ok(G.money < m0, "the crocodile is sold in Thai");
  G.room = _hotelRoomId(); G.pendingChoice = "vacation_end"; run("ย้ายมาอยู่พัทยา"); assert.equal(G.stage, "expat");
});
