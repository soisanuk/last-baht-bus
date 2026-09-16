// Round 49 (2026-09-16) — three personas aimed off the coverage query rather than
// intuition: Brian, who drinks between opening time and midnight and whose hobby is
// punctuality (lens: early-doors); Gary, who will not set foot on Soi 6 or Beach Road
// (lens: off-the-soi); Helen, an employment-rights caseworker who asks everybody what
// their job actually is (lens: the-interviewer). Brian and Helen independently
// collected the SAME closing sentence from eleven mouths in seven bars.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});
const ask = (room, who, topic) => { G.room = room; out = []; doCommand(`ask ${who} about ${topic}`); return text(); };
const miss = /not my story|wrong (girl|man|mama)|I don't know about that|That one I don't know|No idea, mate|doesn't land on anyone|Can't help you there/i;

test("a property is not a comment: nothing is swallowed by a trailing line comment", () => {
  // `water: true` and a dialogue node's `deflect: true` had each been absorbed into
  // the `//` comment on their own line — silent, invisible to every test, and the
  // mall's food court could not sell a bottle of water for its whole life.
  assert.equal(ROOMS.mikes_mall.water, true, "the mall's food court sells water");
  const gated = NPCS.fast_eddy.dialogue.filter(d => /rabbit job/.test(d.topic || ""));
  assert.ok(gated.some(d => d.deflect), "the heist deflect is a deflect");
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  const swallowed = src.split("\n")
    .map((l, i) => [i + 1, l])
    // a SWALLOWED property always has code before the `//` — a whole-line comment
    // that happens to mention `offmap:true` in prose is not a finding
    .filter(([, l]) => !/^\s*\/\//.test(l) && /\/\/[^"']*\b[a-zA-Z_]+: +(true|false|[0-9]+) *,? *$/.test(l));
  assert.deepEqual(swallowed.map(([n]) => n), [], "a trailing // comment has eaten a property");
});

test("the town can answer its own hours, and not in one voice", () => {
  // Brian asked a hostess, a cashier, a mamasan, a manager, a pub waitress and a
  // masseuse over five nights: every one of them answers "closing" and not one
  // could answer its mirror.
  const openers = ["kade", "bert"];
  for (const who of openers) {
    const r = _npcRoom(who);
    assert.doesNotMatch(ask(r, who, "opening"), miss, who + " knows what time the place opens");
    assert.doesNotMatch(ask(r, who, "busy"), miss, who + " knows when it fills up");
  }
  // …and the closing answer is POOLED: eleven mouths gave one sentence.
  const said = new Set();
  for (const g of Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "hostess").slice(0, 8)) {
    const line = ask(_npcRoom(g), g, "closing").split("·")[0].trim();
    if (line && !miss.test(line)) said.add(line);
  }
  assert.ok(said.size >= 3, "the floor has more than one way to say it (got " + said.size + ")");
});

test("a parlour answers as a parlour, and the woman who runs it is the house", () => {
  // Pensri gave the bar's "last man off the stool, and that's usually me" in a
  // room with reclining chairs and no stools, and could not quote the ฿300 list
  // on her own wall — she carries no NPC_ROLES entry (Helen, at Ruean Sabai).
  const r = _npcRoom("pensri");
  const close = ask(r, "pensri", "closing");
  assert.doesNotMatch(close, miss);
  assert.doesNotMatch(close, /stool|dawn/i, "a massage shop is not an all-night bar");
  assert.doesNotMatch(ask(r, "pensri", "price"), miss, "she quotes her own board");
  assert.doesNotMatch(ask(r, "pensri", "opening"), miss);
});

test("a manager does not answer in a bar girl's Tinglish, and one boss gets more than one review", () => {
  // Bert gave back "You be nice to me, she know that too" — verbatim what a
  // hostess said two nights earlier, from a man written in Ohio English.
  const bert = ask("stinky_bar", "bert", "lamai");
  assert.doesNotMatch(bert, /\btilac\b|\bna\b[.,”]|she know that too/i, "the register belongs to the speaker");
  // Cake and Lamai reviewed the same manager identically, back to back.
  const staff = _staffAt("stinky_bar").filter(x => x !== "bert" && (NPC_ROLES[x] || NPCS[x].manager));
  const reviews = new Set(staff.map(x => ask("stinky_bar", NPCS[x].name, "bert").split("·")[0].trim()));
  assert.ok(reviews.size === staff.length, "colleagues do not share one sentence about the boss");
});

test("'my bar' is an ownership claim, and a mamasan does not own the bar", () => {
  const mamas = Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "mamasan" && !NPCS[id].owner).slice(0, 5);
  assert.ok(mamas.length >= 2, "there are mamasans who own nothing");
  for (const id of mamas) {
    const line = ask(_npcRoom(id), id, "bar");
    if (miss.test(line)) continue;
    assert.doesNotMatch(line, /"My bar\./, NPCS[id].name + " does not own the place");
  }
});

test("a meal said to be on the house is on the house — once", () => {
  _setFlag("lakeFishFree");
  G.room = "lake_bar"; G.hunger = 80;
  for (const k of Object.keys(G.itemLoc)) if (/noodle|moo_ping|toastie/.test(k)) G.itemLoc[k] = null;
  let before = G.money;
  out = []; doCommand("eat");
  assert.equal(G.money, before, "Duangjai said the fish was on the house");
  assert.ok(G.hunger < 80, "…and it was food");
  before = G.money; G.hunger = 80;
  out = []; doCommand("eat");
  assert.ok(G.money < before, "the second one is a fish like any other");
});

test("the first morning of a new trip reports the night that was played", () => {
  G.day = 7; G.money = 5000;
  _newVacation();
  assert.ok(G.lastNight, "a fresh baseline for the new trip's first night");
  G.nightTurn = 100; G.money = 4140;
  _endNight("dawn");
  out = []; doCommand("last night");
  assert.doesNotMatch(text(), /First morning in town/, "a night was played and it is on the books");
});

test("Wilf is on the bench, and a regular's local may be a kitchen", () => {
  assert.equal(NPCS.wilf.patron, true);
  assert.ok(Number.isInteger(NPCS.wilf.age) && NPCS.wilf.nat, "the profile the bench invariant checks");
  assert.doesNotMatch(ask("mikes_mall", "wilf", "opening"), miss, "the one place in town with real hours can state them");
});

test("the mamasan quotes the number she sets — the cashiers promise she will", () => {
  // Three cashiers say "ask Mama anything, she will tell you the answer and the
  // price", and at three bars she could not discuss the barfine. Worse, the
  // natural phrasing — "how much to take a girl out" — reached _priceTalk and
  // came back with a list of drinks (Helen, round 49).
  G.nightTurn = 40;
  const mamas = Object.keys(NPC_ROLES).filter(id => NPC_ROLES[id] === "mamasan").slice(0, 4);
  assert.ok(mamas.length >= 2);
  for (const id of mamas) {
    const room = _npcRoom(id);
    if (!ROOMS[room] || !ROOMS[room].barType) continue;
    const bf = _barfinePrices(ROOMS[room].barType);
    for (const phrasing of ["barfine", "bar fine", "how much to take a girl out"]) {
      G.room = room; out = []; doCommand(`ask ${id} about ${phrasing}`);
      const said = text();
      assert.doesNotMatch(said, miss, `${id} answers "${phrasing}"`);
      assert.ok(said.includes("฿" + bf.st) || said.includes("฿" + bf.lt),
        `${id} quotes what the till will charge ("${phrasing}")`);
    }
    // …and it is on her price list, because that is what the cashier promised
    G.room = room; out = []; doCommand(`ask ${id} about price`);
    assert.match(text(), /barfine|her own money/i, `${id}'s price list carries the fine`);
  }
});

test("a promise that states its own condition opens when the condition is met", () => {
  // "Come and sit with me on a night the rain has killed the pool and nobody
  // wants anything. I tell you the whole thing then." Helen bought four lady
  // drinks, sat through the rain, asked again — and got the deflection back,
  // because the story is a topicless beat fired by TALK and she was ASKING.
  G.room = "lucky_tiger"; G.soc.drinks.lek = 5; G.day = 2; G.rain = 0;
  out = []; doCommand("ask lek about price");
  assert.match(text(), /night the rain has killed the pool/, "a dry night still sends you looking");
  assert.ok(!_flag("heardPriceStory"));
  G.rain = 4;
  out = []; doCommand("ask lek about price");
  assert.match(text(), /did I think this is Dubai/, "the night she named opens it");
  assert.ok(_flag("heardPriceStory"), "and it is heard exactly once");
  out = []; doCommand("ask lek about price");
  assert.match(text(), /Same as I tell you in the rain/, "afterwards she answers as somebody who told you");
});
