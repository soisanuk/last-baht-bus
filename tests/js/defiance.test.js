// The Darkside counterweight: Neil at The Sundowner (the couple who beat the
// machine by leaving it) and the grapevine that tells his story wrong (Nigel,
// in town). Two bars, two versions, no link — the player triangulates or never
// knows. Guards: the wrong version sets the flag, the true version never needs
// it, the payoff nodes fire only for a player who heard both, the tea-stand
// photograph reads in two tiers, and the Owl carries the ledger.
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

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  out = [];
});

test("Neil sits at The Sundowner, Nigel in town — the two bars never share a room", () => {
  assert.equal(NPCS.neil.room, "lake_beer");
  assert.equal(ROOMS[NPCS.neil.room].region, "Darkside");
  assert.notEqual(ROOMS[NPCS.nigel.room].region, "Darkside");
  G.room = "lake_beer";
  assert.ok(_regularsHere().includes("neil"));
});

test("Nigel's Darkside version is the wrong one, and it sets the grapevine flag", () => {
  G.room = NPCS.nigel.room;
  _doTalkBody("nigel", "darkside");
  assert.match(text(), /Neil/);
  assert.match(text(), /where the story ends/);
  assert.ok(_flag("heardNeilWrong"));
  // the crack never fires for a player who hasn't met Neil
  assert.doesNotMatch(text(), /Good luck to him/);
});

test("Neil's own telling needs no flag — the sidecar, the week at the cousin's, the railway shop, the dartboard", () => {
  G.room = "lake_beer";
  _doTalkBody("neil", "wife");
  assert.match(text(), /sidecar/);
  assert.match(text(), /She stayed/);
  assert.ok(_flag("neilStory"));
  out = [];
  _doTalkBody("neil", "darkside");
  // the crisis is his own mouth, and the sentence stays unfinished sixteen years on
  assert.match(text(), /doesn't finish it/);
  out = [];
  _doTalkBody("neil", "darkside");
  assert.match(text(), /railway/);
  assert.match(text(), /shop now/);
  out = [];
  _doTalkBody("neil", "son");
  assert.match(text(), /dartboard/i);
});

test("the triangulation payoff fires only for a player who heard both versions", () => {
  G.room = "lake_beer";
  out = [];
  _doTalkBody("neil", "nigel");           // without the grapevine flag: falls back, no payoff
  assert.doesNotMatch(text(), /Still telling it/);
  _setFlag("heardNeilWrong");
  out = [];
  _doTalkBody("neil", "nigel");
  assert.match(text(), /Still got his slip/);
  assert.match(text(), /three months|the book/i);
  // and back in town, Nigel cracks but does not convert
  _setFlag("neilStory");
  G.room = NPCS.nigel.room;
  out = [];
  _doTalkBody("nigel", "darkside");
  assert.match(text(), /three months/);
  assert.match(text(), /the book/i);
  assert.doesNotMatch(text(), /Graveyard/);
});

test("the price card on The Sundowner's fridge reads in two tiers", () => {
  G.room = "lake_beer";
  out = [];
  doCommand("examine photos");
  assert.match(text(), /price card/);
  assert.match(text(), /Nobody's name on it/);
  _setFlag("neilStory");
  out = [];
  doCommand("examine photos");
  assert.match(text(), /heaviest thing on this fridge/);
  assert.ok(G.examined && G.examined["lake_beer.photos"], "the noticer loop logs it");
  assert.ok(_OWL_NOTICED["lake_beer.photos"], "…and the Owl has a letter for it");
});

test("the conversation layer routes the phrasings onto the canonical topics", () => {
  assert.equal(_convoTopic("what about east pattaya"), "darkside");
  assert.equal(_convoTopic("the town lads"), "mates");
  assert.equal(_convoTopic("tell me about your daughter"), "daughter");
});

test("patrons get the synonym retry too — ASK NIGEL ABOUT NEIL reaches his darkside node", () => {
  G.room = NPCS.nigel.room;
  out = [];
  doCommand("ask nigel about neil");
  assert.match(text(), /Graveyard/);
  assert.ok(_flag("heardNeilWrong"));
});

test("the Owl's ledger entry exists and keeps the odds honest", () => {
  const l = _OWL_LETTERS.find(([q]) => /went native over the Darkside/.test(q));
  assert.ok(l, "the has-she-left-you-yet letter");
  assert.match(l[1], /sidecar/);
  assert.match(l[1], /nine times in ten/);
  assert.match(l[1], /Fewer than you hope/);
});

test("register: no fairy tale, no grading — the cost stays in every telling", () => {
  const all = NPCS.neil.dialogue.map(d => d.text + " " + (d.short || "")).join(" ");
  assert.doesNotMatch(all, /happy ending|fairy ?tale|true love|soul ?mate/i);
  assert.match(all, /ashamed|rusted|owing me/);
});
