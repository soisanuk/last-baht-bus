// THE LAUNDERING QUESTS (2026-10-08) — four jobs built from Mario's investigations and good-standing research,
// structure only: The Covers (a till that says three times the stools), Fifty-One (the woman who signs the
// fifty-one), Under Verification (a bar that can be sold and not owned), Pre-Sale (the chat that was a bank).
// Each is walked both ways through doCommand; declining is free, both outcomes complete, nobody is graded.
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
const sit = (room, turns) => { G.room = room; G.nightTurn = 30; for (let i = 0; i < turns; i++) { G.nightTurn = 30 + i; run("wait"); } };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 7000; G.bank = 5000; G.nightTurn = 30; G.season0 = 2; out = [];
});
const stand = id => { for (const day of [G.day, 3, 4, 5, 6, 7, 8]) for (const turn of [50, 30, 70]) { G.day = day; G.nightTurn = turn; G.room = _npcRoom(id); if (_npcsHere().includes(id)) return; } throw new Error("cannot stand with " + id); };
const offer = (giver, qid) => { stand(giver); run("talk to " + giver); assert.equal(G.quests[qid], "offered", `${giver} offers ${qid}: ` + said().slice(-200)); out = []; run("accept " + qid); assert.equal(G.quests[qid], "active"); };

test("THE COVERS: the count is yours, the signature is Hong's — told, she initials the nights she saw; faked, an envelope", () => {
  offer("grace", "covers");
  G.room = "jasmine_garden"; assert.match(ask("hong", "the count"), /stools are there/);
  G.soc.barTurns = { jasmine_garden: 19 }; G.room = "jasmine_garden"; out = []; run("wait"); assert.ok(_flag("coversCounted")); assert.match(said(), /you have counted/);
  assert.match(ask("randy", "how many"), /Eight on a good night/);
  G.convoQ = null; out = []; run("ask hong about the count"); assert.match(said(), /how many men/);
  out = []; run("1"); assert.ok(_flag("coversTold")); assert.equal(G.quests.covers, "done"); assert.match(said(), /initial the nights I saw/);
  G.room = "silk_rose"; assert.match(ask("grace", "hong"), /stopped signing/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" }; G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.season0 = 2; G.money = 7000;
  offer("grace", "covers"); G.soc.barTurns = { jasmine_garden: 20 }; G.room = "jasmine_garden"; run("wait");
  const m0 = G.money; G.convoQ = null; run("ask hong about the count"); out = []; run("2"); assert.ok(_flag("coversFaked")); assert.equal(G.money, m0 + 2000); assert.equal(G.quests.covers, "done");
  G.room = "silk_rose"; assert.match(ask("grace", "hong"), /I did not ask you what you counted/);
});

test("FIFTY-ONE: the papers walk to the woman who signs; Reginald hears who she is, or pays for the walk", () => {
  offer("reginald", "fiftyone"); assert.equal(G.itemLoc.share_papers, "inventory");
  G.room = "buakhao_market"; run("talk to orathai");
  assert.match(ask("orathai", "the companies"), /Eleven companies|I own nothing/);
  assert.match(ask("nont", "orathai"), /Eleven this year|never owned a stool/);
  out = []; run("give papers to orathai"); assert.ok(_flag("fiftyoneSigned")); assert.equal(G.itemLoc.share_papers, "gone"); assert.match(said(), /ASK REGINALD ABOUT ORATHAI/);
  stand("reginald"); G.convoQ = null; out = []; run("ask reginald about orathai"); assert.match(said(), /something about the lady/);
  out = []; run("1"); assert.ok(_flag("fiftyoneTold")); assert.equal(G.quests.fiftyone, "done"); assert.match(said(), /sleeping partner/);
  assert.match(ask("reginald", "orathai"), /second paper/);
  // the other door
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" }; G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.season0 = 2; G.money = 7000;
  offer("reginald", "fiftyone"); G.room = "buakhao_market"; run("give papers to orathai");
  stand("reginald"); const m0 = G.money; G.convoQ = null; run("ask reginald about orathai"); out = []; run("2"); assert.ok(_flag("fiftyoneTipped")); assert.equal(G.money, m0 + 1000); assert.equal(G.quests.fiftyone, "done");
});

test("UNDER VERIFICATION: the tills remember the unit; Nigel is warned, or buys the fourth sign", () => {
  offer("nont", "verification"); assert.equal(G.itemLoc.bar_listing, "inventory");
  G.room = "lucky_tiger"; run("talk to ging"); assert.match(ask("ging", "the listing"), /Three signs|fourth sign/);
  G.room = "silk_rose"; run("talk to grace"); assert.match(ask("grace", "the listing"), /three bars/);
  G.room = "lucky_tiger"; G.nightTurn = 50; run("talk to nigel"); G.convoQ = null; out = []; run("ask nigel about the listing"); assert.match(said(), /What do they say about it/);
  out = []; run("1"); assert.ok(_flag("verifWarned")); assert.equal(G.quests.verification, "done"); assert.match(said(), /Nobody's selling it/);
  G.room = "buakhao_market"; assert.match(ask("nont", "nigel"), /You told him/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" }; G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.season0 = 2; G.money = 7000;
  offer("nont", "verification"); G.room = "lucky_tiger"; G.nightTurn = 50; run("talk to nigel"); const m0 = G.money; G.convoQ = null; run("give listing to nigel"); out = []; run("2");
  assert.ok(_flag("verifSold")); assert.equal(G.money, m0 + 3000); assert.equal(G.quests.verification, "done");
  assert.match(ask("nigel", "your bar"), /Fourth name/); G.room = "buakhao_market"; assert.match(ask("nont", "nigel"), /He bit/);
});

test("PRE-SALE: the chat was a bank — the slips go to Eddy's thread, or the twelve names go to Nont", () => {
  G.room = "the_terrace"; G.nightTurn = 50; run("talk to colin"); assert.equal(G.quests.presale, "offered", said().slice(-300)); assert.match(ask("colin", "the slips"), /Ask me about the pre-sale first/);
  G.convoQ = null; out = []; run("ask colin about the pre-sale"); assert.match(said(), /I'm not leaving Thailand/);
  run("accept presale"); assert.equal(G.quests.presale, "active"); assert.match(ask("colin", "the slips"), /It was never a chat. It was a bank/); assert.ok(_flag("presaleSlips"));
  G.room = "white_rabbit"; G.nightTurn = 30; run("talk to eddy"); G.convoQ = null; out = []; run("ask eddy about the slips"); assert.match(said(), /a case.*Tuesday/s);
  out = []; run("1"); assert.ok(_flag("presaleReported")); assert.equal(G.quests.presale, "done");
  G.room = "the_terrace"; G.nightTurn = 50; assert.match(ask("colin", "the slips"), /a case with a number/);
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" }; G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.season0 = 2; G.money = 7000;
  G.room = "the_terrace"; G.nightTurn = 50; run("talk to colin"); run("accept presale"); G.convoQ = null; run("ask colin about the slips"); assert.ok(_flag("presaleSlips"));
  G.room = "buakhao_market"; run("talk to nont"); const m0 = G.money; G.convoQ = null; out = []; run("ask nont about the list"); assert.match(said(), /Three thousand|three thousand/); out = []; run("1");
  assert.ok(_flag("presaleSold")); assert.equal(G.money, m0 + 3000); assert.equal(G.quests.presale, "done");
  G.room = "the_terrace"; G.nightTurn = 50; assert.match(ask("colin", "the slips"), /recovery service/);
});

test("declining is free, and the four are well-formed", () => {
  for (const q of ["covers", "fiftyone", "verification", "presale"]) {
    assert.ok(QUESTS[q].giver in NPCS && (QUESTS[q].at in NPCS || QUESTS[q].at in ROOMS), q);
    assert.equal(QUESTS[q].reward.money, undefined, q + ": the money comes from the choice, not the journal");
  }
  assert.equal(NPCS.orathai.room, "buakhao_market"); assert.equal(_npcRoom("orathai"), "buakhao_market");
  offer("grace", "covers"); const h = G.happy, r = G.rep; out = []; run("abandon covers"); assert.notEqual(G.quests.covers, "active"); assert.equal(G.happy, h); assert.equal(G.rep, r);
});
