// ROUND 23 — three blind Opus personas on the Queen Vic build. Derek re-run (the
// controlled comparison against his own logged week), Malcolm (plans his day
// around meals), Sheila (maps who knows whom).
//
// The verdict first, because the round was a re-test: Derek's "the pub doesn't
// have a Tuesday in it" became "yes, and it survived every prediction I made";
// Malcolm called the Vic "the one honest kitchen in Pattaya" and confirmed every
// quoted price was the price charged; Sheila graded the pub's rail the gold
// standard. What is pinned here is what they broke.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");

function sandbox() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  G.money = 99999;
  out = [];
}
beforeEach(() => sandbox());

// ── MALCOLM #1: happiness was on sale at ฿35 a point ───────────────────────

test("you cannot eat when you are not hungry", () => {
  // He ate THIRTY-THREE cheese toasties on a hunger meter already at zero, each
  // paying +1 สนุก with no cap, and rode it to 100 — สบายสบาย, the whole long
  // game's goal — at a shop counter, without meeting a soul.
  G.room = "soi6_street"; G.hunger = 0;
  const happy = G.happy, money = G.money;
  for (let i = 0; i < 25; i++) doCommand("buy toastie");
  assert.equal(G.money, money, "not one baht taken");
  assert.equal(G.happy, happy, "and not one point of happiness sold");
  assert.ok(_TOO_FULL.some(l => text().includes(l)), "he is told why, in his own body's voice");
});

test("a hungry man eats, and the happiness a meal can buy is bounded", () => {
  G.room = "soi6_street"; G.hunger = 95;
  const happy = G.happy;
  let ate = 0;
  for (let i = 0; i < 25; i++) { const m = G.money; doCommand("buy toastie"); if (G.money < m) ate++; }
  assert.ok(ate >= 2 && ate <= 4, `a starving man eats a few plates, not twenty-five (${ate})`);
  assert.equal(G.happy - happy, ate, "one point per plate that was actually wanted");
  assert.ok(G.hunger < FULL_AT, "and he stops when he's full");
});

test("the guard covers every counter, not just the one he found", () => {
  // A fix that only closed the 7-Eleven would have moved the exploit one room.
  for (const [room, cmd] of [["soi6_street", "buy toastie"], ["queen_vic", "buy pie"],
                             ["soi6_street", "buy noodles"]]) {
    sandbox(); G.room = room; G.hunger = 0; G.nightTurn = 10;
    const money = G.money, happy = G.happy;
    doCommand(cmd);
    assert.equal(G.money, money, `${cmd} at ${room} took money on a full stomach`);
    assert.equal(G.happy, happy, `${cmd} at ${room} sold happiness on a full stomach`);
  }
});

// ── DEREK #1: a man answering about himself with his own stage direction ───

test("asking a man about himself never returns his opinion of somebody else", () => {
  // Prose narrates the speaker constantly — "Terry considers the ceiling" — and
  // _selfNamedNode matched that, so once the rail gained cross-topics ASK TERRY
  // ABOUT TERRY returned his read on DOYLE, fluently and confidently. Derek
  // believed it for two nights and came away thinking Terry was the ex-copper.
  G.room = "queen_vic"; G.day = 4; G.nightTurn = 40;
  for (const who of ["terry", "angela", "mort", "doyle"]) {
    doCommand("talk to " + who);
    out = [];
    doCommand(`ask ${who} about ${who}`);
    const said = text();
    for (const other of ["terry", "angela", "mort", "doyle", "pete"]) {
      if (other === who) continue;
      const node = NPCS[who].dialogue.find(d => d.topic === other);
      if (node) assert.ok(!said.includes(node.text.slice(0, 60)),
        `${who} answered about himself with his ${other} node`);
    }
  }
});

test("…and each of them has a real answer about himself", () => {
  // Derek: "the single most natural thing a man does on his second night in a
  // pub." An honest miss was the floor; this is the ceiling.
  G.room = "queen_vic"; G.day = 4; G.nightTurn = 40;
  for (const who of ["terry", "angela", "mort", "doyle", "pete"]) {
    const self = NPCS[who].dialogue.find(d => d.topic === who);
    assert.ok(self, `${who} can be asked about himself`);
    assert.ok(String(self.text).length > 150, `…and it is a real answer`);
  }
});

// ── SHEILA #1: three staff sending you to the bar you are standing in ──────

test("Candy's own staff point at Candy, not at a map", () => {
  // The loudest immersion break she hit, and on the Act One critical path: Nan,
  // Bua and Gam all sent her across town to Candy Bar while she stood in Candy
  // Bar with Candy three feet away. The filler wallet line is written for a girl
  // in some OTHER bar; the generator was handing it to Candy's own floor.
  delete G.flags.hasWallet;                // the node is notFlags-gated on it —
  // without this the test passes because nothing fires at all, which is the
  // weakest way a test can be green.
  G.room = "candy_bar"; G.nightTurn = 20;
  assert.equal(_npcWhere("candy"), "candy_bar", "premise: she is in tonight");
  let asked = 0;
  for (const g of _npcsHere().filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess")) {
    doCommand("talk to " + g);
    out = [];
    doCommand(`ask ${g} about wallet`);
    assert.match(text(), /Candy/, `${g} should still point at Candy`);
    assert.doesNotMatch(text(), /Go Candy Bar|Soi Buakhao side|go Buakhao/i,
      `${g} sent the player to the bar he is standing in`);
    asked++;
  }
  assert.ok(asked >= 2, "premise: Candy Bar has floor staff to ask");
});

test("a girl at any OTHER bar still gives the directions, which is the point of the line", () => {
  delete G.flags.hasWallet;
  G.room = "lucky_tiger"; G.nightTurn = 20;
  assert.notEqual(_npcWhere("candy"), "lucky_tiger", "premise");
  const g = _npcsHere().find(i => NPCS[i].filler && NPC_ROLES[i] === "hostess");
  doCommand("talk to " + g);
  out = [];
  doCommand(`ask ${g} about wallet`);
  assert.match(text(), /Candy/, "she still points the player at Candy");
});

// ── DEREK #2 / the roast the game never mentioned ──────────────────────────

test("Doyle names the door instead of gesturing at it", () => {
  // He said "she'll tell you herself, she'd far rather you asked" — and Derek
  // asked four ways and got brushed off by a woman he'd drunk beside for eight
  // nights. A promise in prose has to name the topic a player can type.
  G.room = "queen_vic"; G.day = 4; G.nightTurn = 40;
  doCommand("talk to doyle");
  out = []; doCommand("ask doyle about angela");
  assert.match(text(), /NAVY/i, "he names the topic");
  out = []; doCommand("talk to angela"); out = [];
  doCommand("ask angela about the navy");
  assert.ok(text().length > 150, "…and the door opens");
  assert.doesNotMatch(text(), /Not my story|Search me/i);
});

test("the roast announces itself on the day, and quotes its price", () => {
  // Derek sat in this pub on a Sunday and found the kitchen on the Monday. A
  // roast nobody is told about is a roast nobody eats. Malcolm, separately:
  // "the only day-and-hour-gated dish in the game and it never quotes a price."
  G.room = "queen_vic"; G.day = 7; G.nightTurn = 10;
  out = []; doCommand("talk to aoy");
  assert.match(text(), /SUNDAY/i, "on the day she leads with it");
  assert.match(text(), new RegExp("฿" + QV_ROAST), "and says what it costs");
  sandbox(); G.room = "queen_vic"; G.day = 4; G.nightTurn = 10;
  out = []; doCommand("talk to aoy");
  assert.doesNotMatch(text(), /IS SUNDAY/i, "and doesn't on a Wednesday");
  out = []; doCommand("ask aoy about kitchen");
  assert.match(text(), new RegExp("฿" + QV_ROAST), "though the kitchen brief names it any day");
});
