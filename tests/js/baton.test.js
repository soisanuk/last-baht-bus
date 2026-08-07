// The baton — LBB's half of the handoff to Second Road.
//
// Second Road (docs/second-road-plan.md) is the macro companion: weeks and
// seasons, several venues, a separate codebase. The two games share one
// character, and what keeps their clocks from diverging is that the save is a
// BATON — held by exactly one game at a time, handed over at dawn. Divergence
// isn't caused by two clocks; it's caused by two concurrent writers.
//
// This file is the LBB side of that contract. The mirror of it belongs in
// Second Road, and the coupling rots silently if only one side is tested.
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
beforeEach(() => { out = []; newGame(); });

// a character with some miles on them
function livedIn() {
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  G.day = 8; _goExpat();
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.room = "stinky_bar"; G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
  G.soc.drinks = { nong: 9, manow: 4 };
  G.syn = { done: { cleaning: true }, asked: { cleaning: true }, friction: 2 };
  _align("syndicate", 2);
  G.thaiSeen = ["สบาย", "เท่าไหร่"];
  G.nightTurn = 0;
}

test("a baton only changes hands at dawn", () => {
  livedIn();
  assert.equal(batonReady().ok, true, "night resolved, nothing pending");
  assert.ok(exportBaton(), "…so it exports");

  G.nightTurn = 40;
  assert.equal(batonReady().ok, false, "mid-night is not a handoff point");
  assert.equal(exportBaton(), null);

  // …but the clock is CONTINUOUS: the command that ends a night starts the next,
  // so nightTurn is a value the game passes through rather than rests at. A
  // consumer that plays a night to its end is one or two ticks into the next one
  // and must still be able to hand back. Second Road hit this exactly.
  G.nightTurn = 1;
  assert.equal(batonReady().ok, true, "a night that has barely begun is still dawn");
  G.nightTurn = 2;
  assert.equal(batonReady().ok, true);
  G.nightTurn = 3;
  assert.equal(batonReady().ok, false, "and the window is narrow on purpose");

  G.nightTurn = 0; G.pendingChoice = "tanfavour";
  assert.equal(batonReady().ok, false, "nor is a question somebody is waiting on");
  assert.match(batonReady().why, /waiting on an answer/);
});

test("the character crosses: who you are, what you did, who your people are", () => {
  livedIn();
  const b = exportBaton();
  assert.equal(b.v, BATON_VERSION, "versioned, because the coupling has to be able to break loudly");
  assert.equal(b.day, G.day);
  assert.deepEqual(b.player, G.player);
  assert.equal(b.flags.barOpen, true, "what has happened");
  assert.equal(b.bar.owed, G.bar.owed, "the books and the debt to the old man");
  assert.equal(b.faction.syndicate, G.faction.syndicate, "standing");
  assert.equal(b.syn.friction, 2, "how far outside the arrangement you've stayed");
  assert.deepEqual(b.soc.drinks, { nong: 9, manow: 4 }, "bonds — the macro game's real resource");
  assert.deepEqual(b.thaiSeen, ["สบาย", "เท่าไหร่"], "already shared with the trainer");
  assert.equal(typeof b.rng, "number", "determinism has to survive the handoff or replay dies");
});

test("a body in a night does not cross — a macro turn hasn't got one", () => {
  livedIn();
  G.hunger = 70; G.thirst = 55; G.battery = 12; G.soc.drunk = 4; G.hurt = 2;
  const b = exportBaton();
  for (const k of ["hunger", "thirst", "battery", "hurt", "nightTurn",
                   "pendingChoice", "pendingEnc", "pendingBf", "game", "room"]) {
    assert.equal(b[k], undefined, `${k} describes a night, and there isn't one on the other side`);
  }
  assert.equal(b.soc.drunk, undefined, "…including how drunk you were when you handed over");
});

test("it round-trips: hand it over, get it back, and the character is intact", () => {
  livedIn();
  const before = {
    day: G.day, money: G.money, owed: G.bar.owed, friction: G.syn.friction,
    syndicate: G.faction.syndicate, drinks: { ...G.soc.drinks },
    happy: G.happy, player: { ...G.player }, rng: G.rng,
  };
  const b = JSON.parse(JSON.stringify(exportBaton()));   // over the wire

  newGame();                                             // a cold engine
  assert.equal(importBaton(b).ok, true);

  assert.equal(G.day, before.day);
  assert.equal(G.money, before.money);
  assert.equal(G.bar.owed, before.owed);
  assert.equal(G.syn.friction, before.friction);
  assert.equal(G.faction.syndicate, before.syndicate);
  assert.deepEqual(G.soc.drinks, before.drinks);
  assert.equal(G.happy, before.happy);
  // NB not deepEqual: the import merges onto a fresh skeleton, so fields the
  // baton didn't carry (player.lang, player.said) come back at today's default
  // rather than as undefined. That tolerance is the feature — it's what stops
  // the coupling needing a migration whenever either game grows a field.
  for (const k of Object.keys(before.player)) assert.equal(G.player[k], before.player[k]);
  assert.equal(G.rng, before.rng, "same dice stream on the far side");
  assert.ok(_flag("barOpen"), "and you still own a bar");
});

test("coming back, you arrive at dawn with a clean body", () => {
  livedIn();
  const b = exportBaton();
  newGame();
  importBaton(b);
  assert.equal(G.nightTurn, 0, "the macro game ran weeks; the night starts fresh");
  assert.equal(G.pendingChoice, null);
  assert.equal(G.pendingEnc, null);
  assert.equal(G.game, null);
});

test("a baton from the wrong version is refused, not guessed at", () => {
  livedIn();
  const b = exportBaton();
  b.v = 999;
  const r = importBaton(b);
  assert.equal(r.ok, false);
  assert.match(r.why, /version/, "cross-repo coupling rots silently unless it breaks loudly");
  assert.equal(importBaton(null).ok, false);
  assert.equal(importBaton("nonsense").ok, false);
});

test("fields Second Road has never heard of keep today's defaults", () => {
  // the same tolerance deserializeGame has: a baton written by an older build
  // must not blank out state added since. This is what stops the coupling
  // needing a migration every time either game grows a field.
  livedIn();
  const b = exportBaton();
  delete b.bar;            // as though Second Road predates the books
  delete b.syn;
  newGame();
  assert.equal(importBaton(b).ok, true);
  assert.ok(G.bar, "the skeleton's default survives rather than becoming undefined");
  assert.equal(G.bar.owed, 0);
  assert.equal(G.day, b.day, "…and everything the baton DID carry still lands");
});
