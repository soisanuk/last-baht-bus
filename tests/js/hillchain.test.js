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
  // …and the two COOLDOWN-gated interruptions, which encDone does not cover:
  // the peddler and the police run off G.lastPeddler/G.lastPolice, not the
  // ENCOUNTERS table. Missing them flaked this ~12% of runs. Same idiom as
  // engine.test.js.
  G.lastPeddler = 99999; G.lastPolice = 99999;
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

// ── the beach amulet ────────────────────────────────────────────────────────
// Found at the end of three rooms of sand with nothing on them, and the whole
// chain is built so the game never tells you what to do with it.
//
// What these protect, in order of how easy it is to wreck by being helpful:
//
//   1. WEARING IT COSTS SOMETHING. The cord came off it perished, so putting it
//      on takes a trip and twenty baht. If that ever becomes automatic on
//      pickup, the deliberate act — "this is mine now" — is gone.
//   2. EXACTLY ONE NOTICE. A piwin reads it, once ever, and says nothing
//      useful. A second reactor would turn a mystery into a quest marker.
//   3. NOK EXPLAINS NOTHING. Her thank-you is complete and unreadable. If a
//      future edit has her open up, the entire point collapses — the reading
//      belongs to Mort, later, elsewhere, and only if the player goes to get it.
test("amulet: it cannot be worn until the cord is replaced", () => {
  onTheHill();
  G.itemLoc.amulet = "inventory";
  const no = say("wear amulet");
  assert.match(no, /cord/i, "it tells you why not");
  assert.equal(G.amuletWorn, false);

  G.room = "jomtien_7eleven";
  say("buy cord");
  assert.equal(G.itemLoc.cord, "inventory", "a 7-Eleven sells one");
  say("wear amulet");
  assert.equal(G.amuletWorn, true, "now it goes on");
  assert.equal(G.itemLoc.cord, null, "and the cord is used up");
});

test("amulet: one piwin notice, once ever, and it explains nothing", () => {
  onTheHill();
  G.itemLoc.amulet = "inventory"; G.itemLoc.cord = "inventory"; say("wear amulet");
  out = []; G.room = "beach_rd_n"; _arriveAt("dolphin");
  const first = out.join("\n");
  assert.ok(_AMULET_PIWIN.some(l => first.includes(l)), "a piwin reads it");
  assert.doesNotMatch(first, /shrine|drown|memorial|widow|son\b/i,
    "…and gives away nothing — the mystery is the point");
  out = []; _arriveAt("beach_rd_n"); _arriveAt("dolphin");
  assert.ok(!_AMULET_PIWIN.some(l => out.join("\n").includes(l)), "and never again");
});

test("amulet: Nok takes it back and explains NOTHING; Mort explains, later", () => {
  onTheHill();
  G.itemLoc.amulet = "inventory"; G.itemLoc.cord = "inventory"; say("wear amulet");
  out = []; G.room = "jomtien_beach"; _arriveAt("jomtien_soi_7_beach_end");
  assert.ok(_NOK_AMULET.some(l => out.join("\n").includes(l)), "she sees it");

  const gave = say("give amulet to nok");
  assert.match(gave, /Thank you/, "she thanks you");
  assert.doesNotMatch(gave, /shrine|drown|son\b|nephew|husband/i,
    "she does not explain, and must never start");
  assert.ok(_flag("amuletReturned"));
  assert.equal(G.amuletWorn, false);

  // the reading is Mort's, and only if you go and ask
  G.room = "queen_vic";
  const mort = say("ask mort about amulet");
  assert.match(mort, /shrine/i, "he supplies what she could not");
});

test("amulet: the column prints the Owl's answer once, then goes back to the pool", () => {
  onTheHill();
  _setFlag("amuletReturned");
  const first = say("column");
  assert.ok(first.includes(_OWL_AMULET[1]), "the one-shot letter runs");
  const second = say("column");
  assert.ok(!second.includes(_OWL_AMULET[1]), "and not a second time");
});

// ── the piwins: buying sight ────────────────────────────────────────────────
// The motorbike-taxi men are at 35 stands and were scenery — TALK TO PIWIN
// answered "nobody here goes by that" while the room description said one was
// sitting right there. A pseudo-NPC rather than 35 filler entries, because that
// would be 35 portraits against an art budget already under strain, and because
// a piwin is a role before he is a person.
//
// What these hold:
//   1. He will NOT tell a stranger. That is the point, not an obstacle — the
//      value of knowing things here is not saying them, and a beer changes it.
//   2. The answer is honest about staleness. A hopper gets "I took him there
//      two hours ago, where he is now I don't know" — never a live marker.
//   3. He is looked up GLOBALLY. _findNpc is room-scoped, which is correct for
//      talking to someone and exactly wrong here: the whole service is people
//      who are not in front of you.
test("piwin: he sees everything and tells strangers nothing", () => {
  onTheHill();
  G.room = "dolphin"; G.known = { candy: true };
  const cold = say("ask piwin about candy");
  assert.match(cold, /I know everybody/, "he deflects");
  assert.doesNotMatch(cold, /Candy Bar/, "…and gives up no location");
});

test("piwin: a beer buys sight, and the answer knows how stale it is", () => {
  onTheHill();
  G.room = "dolphin"; G.known = { candy: true, nigel: true };
  say("buy piwin a beer");

  // a fixed NPC: definite, because she is where she is all night
  const fixed = say("ask piwin about candy");
  assert.match(fixed, /Candy Bar/, "he places her");
  // a hopper: he reports the DROP, with the time and the caveat in his own voice
  const hopper = say("ask piwin about nigel");
  assert.match(hopper, /hour ago/, "he timestamps it");
  assert.match(hopper, /don't know/i, "…and does not pretend to know where he is now");
});

test("piwin: the stand is not a bar, and he is not everywhere", () => {
  onTheHill();
  G.room = "north_beach";                      // no motosai
  assert.match(say("talk to piwin"), /No stand here/);
  assert.match(say("buy piwin a beer"), /No stand here/);
});

test("piwin: greased, he finishes the sentence he cut off about the amulet", () => {
  onTheHill();
  G.itemLoc.amulet = "inventory"; G.itemLoc.cord = "inventory"; say("wear amulet");
  G.room = "dolphin"; say("buy piwin a beer");
  out = []; G.room = "beach_rd_n"; _arriveAt("dolphin");
  assert.match(out.join("\n"), /auntie/i, "a man he knows gets the second half");

  // and a stranger still does not
  onTheHill();
  G.itemLoc.amulet = "inventory"; G.itemLoc.cord = "inventory"; say("wear amulet");
  out = []; G.room = "beach_rd_n"; _arriveAt("dolphin");
  assert.doesNotMatch(out.join("\n"), /auntie/i, "a stranger gets the shrug");
});
