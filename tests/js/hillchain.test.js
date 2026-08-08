// Pratumnak: the Bill & Bob chain — ice → order → the bet on the wall.
//
// The hill is the only place in town where two factions sit thirty metres apart
// and are CIVIL about it, and the groundwork was all laid before the quests
// existed: Bill went over and introduced himself his first week, Kinnaree noted
// he brought flowers, and Bob is generous about a competitor taking his trade.
// So this is not a rivalry arc. It is two decent men across a road, and the
// player carrying the one sentence neither can say to the other.
//
// What the tests are actually protecting, in order of how easy it is to break:
//
//   1. FACTION DOCTRINE (docs/factions-thai.md). Standing moves only on a DEED,
//      declining is free forever, and nothing may push an alignment. The one
//      deed here moves BOTH sides up, because it genuinely helps both — if a
//      later edit makes helping Bob cost Samson standing, that is the doctrine
//      breaking and this file should say so loudly.
//   2. The Q3 gate is a WORLD OBSERVATION, not a dialogue counter: Bob's answer
//      depends on whether you have actually stood at Bali Hai. Two nodes, same
//      topic, split on G.visited — an easy thing to collapse by accident.
//   3. The dep chain holds, so the payoff can't be reached out of order.
//
// Scripted rather than soaked, for the reason barchain.test.js gives: the soak
// plays randomly and cannot reach a dep chain (talk-until-offered → ACCEPT →
// travel → a specific ASK), so soak ceilings measure ambient prose only.
import { test } from "node:test";
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

// The sandbox a player reaches by finishing Act One. Ambient vendors silenced:
// a saleng or peddler can arm pendingEnc on any tick, and a live modal
// legitimately eats the NEXT typed command — the same flake barchain.test.js
// documents.
function onTheHill() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  G.money = 4000;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.pendingEnc = null;
  G.salengCart = null;
}
const say = cmd => { out = []; doCommand(cmd); return out.join("\n"); };
const tick = () => { out = []; doCommand("look"); };   // let _questTick settle a doneFlag

// Walk the chain to just before `stop`, so each test starts from a real state
// rather than a hand-set flag soup.
function playTo(stop) {
  onTheHill();
  G.room = "succubus";
  say("talk to bob"); say("accept hill_ice");
  if (stop === "q1") return;
  G.room = "doghouse";
  say("ask bill about ice"); tick();
  if (stop === "q2") return;
  say("talk to bill"); say("accept hill_order");
  G.room = "succubus";
  say("ask bob about order"); tick();
  if (stop === "q3") return;
  say("talk to bob"); say("accept hill_photo");
}

test("hill chain: the ice, the order, and the bet all complete in sequence", () => {
  playTo("q3");
  assert.equal(G.quests.hill_ice, "done", "Bill's straight answer closes the first");
  assert.equal(G.quests.hill_order, "done", "carrying it to Bob closes the second");

  say("talk to bob"); say("accept hill_photo");
  // he sends you to look, and will not take an answer you have not been to get
  const before = say("ask bob about photograph");
  assert.match(before, /Go and stand down at Bali Hai/, "unvisited: he sends you");
  assert.notEqual(G.quests.hill_photo, "done", "…and does not settle it");

  G.room = "bali_hai"; tick();
  G.room = "succubus";
  const after = say("ask bob about photograph");
  assert.match(after, /Neither of us/, "visited: the bet resolves");
  tick();
  assert.equal(G.quests.hill_photo, "done");
});

test("hill chain: the deed moves BOTH factions up — the hill is where they get along", () => {
  playTo("q2");
  say("talk to bill"); say("accept hill_order");
  const before = { ...G.faction };
  G.room = "succubus";
  say("ask bob about order"); tick();
  assert.equal(G.faction.samson, before.samson + 1, "Bill's favour lands");
  assert.equal(G.faction.indie, before.indie + 1, "…and so does Bob's");
  assert.equal(G.faction.wdg, before.wdg, "nobody else is touched");
  assert.equal(G.faction.syndicate, before.syndicate);
});

test("hill chain: declining costs nothing, ever — the faction doctrine", () => {
  // walk past all of it, take nothing, and standing must not move a point
  onTheHill();
  const zero = JSON.stringify(G.faction);
  G.room = "succubus"; say("talk to bob"); tick();
  G.room = "doghouse"; say("talk to bill"); tick();
  assert.equal(JSON.stringify(G.faction), zero, "ignoring the hill is free");

  // and abandoning mid-chain is free too, and re-offerable
  playTo("q1");
  const before = JSON.stringify(G.faction);
  say("abandon hill_ice");
  assert.equal(JSON.stringify(G.faction), before, "abandoning is free");
  assert.ok(_questAvailable("hill_ice"), "…and the job comes back");
});

test("hill chain: the deps gate — no skipping to the payoff", () => {
  onTheHill();
  assert.ok(_questAvailable("hill_ice"), "the first is open to anyone");
  assert.ok(!_questAvailable("hill_order"), "the second needs the first");
  assert.ok(!_questAvailable("hill_photo"), "the third needs the second");
  playTo("q2");
  assert.ok(_questAvailable("hill_order"), "…and opens once the ice is understood");
  assert.ok(!_questAvailable("hill_photo"), "the third still waits");
});

test("hill chain: Bill will not make the offer himself, and says why", () => {
  // The whole point of the middle quest is that Bill CANNOT do the thing he can
  // trivially do. If this line ever collapses into "Bill sorts it out", the
  // chain loses its reason to involve the player at all.
  playTo("q2");
  const why = say("ask bill about order");
  assert.match(why, /I'm not a neighbour any more/, "he names the cost of offering");
  assert.match(why, /Say it to him like it's yours/, "…and hands it to you");
  assert.notEqual(G.quests.hill_order, "done", "talking to Bill does not resolve it");
});
