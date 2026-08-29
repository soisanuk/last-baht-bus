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

// ── MALCOLM #2/#3/#4: food the town describes and would not sell ───────────

test("a room whose prose puts a food vendor in it can be bought from", () => {
  // Five rooms advertised a vendor on the pavement and sold nothing: the last
  // late-night noodle carts on the Thappraya hill, the chestnut man on Beach
  // Road, Central's food court, the bazaar's food court, and the corner stall
  // the girls come out of Soi 6 to buy from. Named by a persona who planned his
  // day around meals, then found independently by afford-audit.
  for (const room of ["thappraya_ext_s", "beach_rd_soi7", "central_mall",
                      "night_bazaar", "second_rd_soi6"]) {
    sandbox();
    G.room = room; G.hunger = 70; G.nightTurn = 20;
    for (const i of Object.keys(_EDIBLE)) if (G.itemLoc[i] === "inventory") G.itemLoc[i] = null;
    const money = G.money, hunger = G.hunger;
    out = [];
    doCommand("buy food");
    assert.ok(G.money < money, `${room}: the generic BUY FOOD reaches the vendor the prose describes`);
    assert.ok(G.hunger < hunger, `${room}: …and it is actual food`);
  }
});

test("Mama Yai's kitchen serves whether you say BUY or EAT", () => {
  // Her room is "half bar, half kitchen" and the som tam "arrives unasked".
  // BUY answered "not at this hour" one command before EAT served a plate.
  for (const cmd of ["buy som tam", "eat som tam", "buy food"]) {
    sandbox();
    G.room = "mama_yai"; G.hunger = 70; G.nightTurn = 20;
    const money = G.money, hunger = G.hunger;
    out = [];
    doCommand(cmd);
    assert.ok(G.hunger < hunger, `"${cmd}" should get the plate`);
    assert.equal(G.money, money, "…and she never takes the money, which is the point of her");
  }
  // and the one-a-night rule holds however you phrase it
  doCommand("buy som tam");
  out = []; doCommand("buy food");
  assert.match(text(), /One plate a night/, "no buffet, by either verb");
});

test("(BUY FOOD) is only promised where there is a till", () => {
  // The hint rode in a pool shared by every street in the game, so it printed
  // in rooms with no stall — and the room that printed it then said "Not for
  // sale here". A parenthesised CAPS command is a promise.
  const noStall = Object.keys(ROOMS).find(r => !FOOD_STALLS[r] && !ROOMS[r].barType && !ROOMS[r].seven);
  assert.ok(noStall, "found a room with no food");
  sandbox(); G.room = noStall; out = [];
  doCommand("examine food stall");
  assert.doesNotMatch(text(), /\(BUY FOOD\)/, "no hint where there is no till");
  sandbox(); G.room = "thappraya_ext_s"; out = [];
  doCommand("examine food stall");
  assert.match(text(), /\(BUY FOOD\)/, "…and the hint where there is one");
  const money = G.money;
  doCommand("buy food");
  assert.ok(G.money < money, "the hint it printed is a promise it keeps");
});

// ── SHEILA: "nobody in this town can see the person on the next stool" ─────

test("the links the game already made in one direction now come back", () => {
  // Every one of these had a rich authored line going OUT and nothing coming
  // back, which is what made the town read as a lookup table rather than a
  // place. Daeng→Oy she called the biggest asymmetry in the game.
  const PAIRS = [["oy", "daeng"], ["nuan", "champa"], ["nuan", "boua"], ["nuan", "ampha"],
                 ["sumalee", "roger"], ["lek", "candy"]];
  for (const [who, about] of PAIRS) {
    sandbox();
    G.room = _npcWhere(who) || NPCS[who].room; G.nightTurn = 30;
    if (!_npcsHere().includes(who)) continue;
    doCommand("talk to " + who);
    out = [];
    doCommand(`ask ${who} about ${about}`);
    const said = text();
    assert.doesNotMatch(said, /above my pay grade|Not my department|Not my story|Search me|wrong girl/i,
      `${who} still has nothing to say about ${about}`);
    assert.ok(said.length > 150, `${who} on ${about} is a real answer`);
  }
});

test("Wayne and Gavin can see each other across one rail", () => {
  // The most obviously missing edge in the cast: Wayne is buying a bar, Gavin
  // buys bars up this soi for White Dish, and they drink in the same room.
  assert.equal(NPCS.wayne.room, NPCS.gavin.room, "premise: the same rail");
  sandbox();
  G.room = NPCS.wayne.room; G.nightTurn = 30;
  doCommand("talk to wayne");
  out = []; doCommand("ask wayne about gavin");
  assert.ok(text().length > 150);
  assert.doesNotMatch(text(), /above my pay grade|Not my story/i);
  doCommand("talk to gavin");
  out = []; doCommand("ask gavin about wayne");
  assert.match(text(), /looked at that unit|walked away/i,
    "and Gavin knows the thing the player most needs to hear");
});

test("the drummer is not a Soi 6 cashier", () => {
  // Josey described Jun on the stage in front of her; TALK TO JUN answered
  // "he isn't at this bar tonight — try Sunset Dreams Lounge", where the real
  // Jun keeps a till. A prose-only character sharing a name with a real NPC.
  assert.ok(!Object.keys(NPCS).some(i => /^boyet$/i.test(NPCS[i].name)),
    "his new name collides with nobody");
  const node = NPCS.josey.dialogue.find(d => d.topic === "drummer");
  assert.doesNotMatch(node.text + node.short, /\bJun\b/, "she no longer names him after the cashier");
  sandbox();
  G.room = NPCS.josey.room; G.nightTurn = 30;
  doCommand("talk to josey");
  out = []; doCommand("ask josey about boyet");
  assert.match(text(), /behind that kit/, "and he answers to the name she uses");
});

test("nothing I authored contradicts what the game already said", () => {
  // Three of my own new lines asserted things that were false about the world —
  // Daeng on a stage in 1991 (she is mid-forties), Ampha at thirty-one with a
  // daughter in school (she is mid-twenties and Nuan's young cousin), Roger on
  // that stool thirty years (he retired to Jomtien eighteen years ago). Caught
  // by reading the corpus, which is the only thing that catches this class.
  const oy = NPCS.oy.dialogue.find(d => d.topic === "daeng");
  assert.doesNotMatch(oy.text, /19\d\d/, "no date that ages Daeng out of her own description");
  const ampha = NPCS.nuan.dialogue.find(d => d.topic === "ampha");
  assert.doesNotMatch(ampha.text, /thirty-one|daughter/, "she is the young cousin who did the books");
  const roger = NPCS.sumalee.dialogue.find(d => d.topic === "roger");
  assert.match(roger.text, /Eighteen years/, "which is when he actually retired here");
});
