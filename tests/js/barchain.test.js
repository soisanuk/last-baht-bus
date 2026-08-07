// The bar-owning chain: premises → licence → partner → opening night.
//
// The bar is THE STINKY PINKY, and that's the design. You already spent
// `white_dish` talking Bert out of selling it to Ryan Powers; the ailing
// American owner is still ailing, and holding isn't a plan. So the arc pays off
// — the only buyer who isn't WDG is you, and Gavin loses a bar to a regular.
//
// The third step is a FORK, and it's the interesting one. Fifty-one percent has
// to be a person. Candy's yes is slow, written, and costs a Bangkok lawyer.
// Tan's is instant, free, and costs nothing you can see — from a man who has
// refused money all game and said, in as many words, "when I want something from
// you, I will ask for it, and it will not be money."
//
// Why a scripted playthrough rather than a soak ceiling: the soak plays randomly
// and cannot reach a dep chain (talk-until-offered → ACCEPT → travel → a
// specific ASK). A five-seed expat run offers zero quests. That's true of all
// the game's quests; soak ceilings measure ambient prose only.
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

// Reach the endless stage the way a player does: finish the week, then stay.
function becomeExpat() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  G.day = 8;
  _goExpat();
}
const say = cmd => { out = []; doCommand(cmd); return out.join("\n"); };
// you saved the bar from White Dish — the precondition for being offered it
const savedTheBar = () => { G.quests.white_dish = "done"; _setFlag("wdgResolved"); };
// walk the chain up to (not including) the partner fork
function upToTheFork() {
  savedTheBar();
  G.quests.bar_premises = "done"; _setFlag("barPremises");
  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  G.quests.bar_licence = "done"; _setFlag("barLicence");
  G.quests.bar_partner = "active";
}

beforeEach(() => { out = []; becomeExpat(); });

test("the chain is expat-only — a seven-day vacation doesn't buy a bar", () => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  savedTheBar();
  assert.equal(_questAvailable("bar_premises"), false, "not on a vacation");

  becomeExpat(); savedTheBar();
  assert.ok(_flag("expatLife"), "_goExpat sets the gate flag");
  assert.equal(_questAvailable("bar_premises"), true, "the chain opens once you stay");
});

test("you're only offered the bar because you saved it from White Dish", () => {
  assert.equal(_questAvailable("bar_premises"), false,
    "without white_dish resolved, there's no reason Bert brings this to you");
  savedTheBar();
  assert.equal(_questAvailable("bar_premises"), true);
});

test("the licence step is gated on having warned Wayne — you meet the trap before you dodge it", () => {
  savedTheBar();
  G.quests.bar_premises = "done"; _setFlag("barPremises");
  assert.equal(_questAvailable("bar_licence"), false, "nominee_deal not done");
  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  assert.equal(_questAvailable("bar_licence"), true);
});

test("premises and licence complete off their givers' answers", () => {
  savedTheBar();
  G.quests.bar_premises = "active";
  G.room = "stinky_bar"; say("ask bert about buying");
  assert.ok(_flag("barPremises"), "Bert's answer sets the flag");
  say("look");
  assert.equal(G.quests.bar_premises, "done");

  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  G.quests.bar_licence = "active";
  G.room = "golden_dragon"; say("ask wayne about licence");
  assert.ok(_flag("barLicence"));
  say("look");
  assert.equal(G.quests.bar_licence, "done");
});

// ── the fork ────────────────────────────────────────────────────────────────
test("the partnership is a real choice: either partner completes the step", () => {
  for (const [who, room, marker] of [["candy", "candy_bar", "partnerCandy"],
                                     ["tan", "soi6_street", "partnerTan"]]) {
    becomeExpat(); upToTheFork();
    G.room = room;
    say(`ask ${who} about partnership`);
    assert.ok(_flag("barPartner"), `${who} should close the partnership step`);
    assert.ok(_flag(marker), `${who} should record which route was taken (${marker})`);
    say("look");
    assert.equal(G.quests.bar_partner, "done", `${who} route should complete the quest`);
  }
});

test("the two routes leave you standing in different places", () => {
  becomeExpat(); upToTheFork();
  G.room = "candy_bar"; say("ask candy about partnership");
  const candyF = { ...G.faction };

  becomeExpat(); upToTheFork();
  G.room = "soi6_street"; say("ask tan about partnership");
  const tanF = { ...G.faction };

  // Candy is the public, legible route: a hard shove away from the rollup.
  assert.ok(candyF.wdg < tanF.wdg, "Candy's route costs you more with White Dish");
  // Tan's is quiet, and puts you inside somebody's web of favours.
  assert.ok((tanF.syndicate || 0) > (candyF.syndicate || 0),
    "the Tan route should register as an obligation the Candy route doesn't");
  assert.equal(candyF.syndicate || 0, 0, "Candy's paperwork owes nobody anything");
});

test("opening night is told differently depending on who signed", () => {
  becomeExpat(); upToTheFork();
  G.room = "candy_bar"; say("ask candy about partnership");
  G.quests.bar_opening = "active"; G.room = "stinky_bar";
  const candyNight = say("ask bert about opening");
  assert.ok(_flag("barOpen"));
  assert.match(candyNight, /paperwork pinned behind the till/,
    "Candy's night is legible: her name, first, where anyone can read it");

  becomeExpat(); upToTheFork();
  G.room = "soi6_street"; say("ask tan about partnership");
  G.quests.bar_opening = "active"; G.room = "stinky_bar";
  const tanNight = say("ask bert about opening");
  assert.ok(_flag("barOpen"));
  assert.match(tanNight, /no paperwork behind the till|Do you know what you've agreed to/,
    "Tan's night is the same happy room with nothing anyone can point at");
  assert.notEqual(candyNight, tanNight, "the fork has to be visible at the payoff");
});

test("Gavin turns up either way — he loses the bar to a regular", () => {
  for (const [who, room] of [["candy", "candy_bar"], ["tan", "soi6_street"]]) {
    becomeExpat(); upToTheFork();
    G.room = room; say(`ask ${who} about partnership`);
    G.quests.bar_opening = "active"; G.room = "stinky_bar";
    assert.match(say("ask bert about opening"), /Gavin/,
      `${who} route: Gavin should still walk in and buy a beer`);
  }
});

test("the givers hold their answers back until the step before is done", () => {
  G.room = "candy_bar"; say("ask candy about partnership");
  assert.equal(_flag("barPartner"), false, "no partner before a licence");
  G.room = "soi6_street"; say("ask tan about partnership");
  assert.equal(_flag("barPartner"), false, "…by either route");
  G.room = "golden_dragon"; say("ask wayne about licence");
  assert.equal(_flag("barLicence"), false, "no licence before premises");
});

test("the dead Shamrock is a sequel hook, not part of this chain", () => {
  // It's out on the Darkside, where neither WDG nor the Samsons have a reason to
  // care — a different set of powers, and a later arc. Daeng only raises it once
  // you already run a bar.
  savedTheBar();
  G.room = "khao_talo_bar";
  assert.equal(/Shamrock/.test(say("ask daeng about shamrock")), false,
    "she shouldn't be dangling a second bar at someone who hasn't opened a first");
  for (const f of ["barPremises", "barLicence", "barPartner", "barOpen"]) _setFlag(f);
  assert.match(say("ask daeng about shamrock"), /Shamrock/,
    "once you own one, she mentions the next");
});

// ── Tan calls the favour in ─────────────────────────────────────────────────
// The payoff of the partnerTan route, and the reason the fork isn't cosmetic.
// He refused money all game — SEND him baht and the app bounces it back — and
// said "when I want something from you, I will ask for it, and it will not be
// money." This is him asking, and it's deliberately small: a name for the staff
// list. What's being established is that he CAN ask.
function ownsBarWith(partner) {
  becomeExpat();
  for (const f of ["barPremises", "barLicence", "barPartner", partner, "barOpen"]) _setFlag(f);
  G.nightTurn = 35;          // an evening beat
  G.room = "stinky_bar";
  out = []; _arriveAt("stinky_bar");
  return out.join("\n");
}

test("Tan comes to the bar and asks — but only if he's the one who signed", () => {
  const tan = ownsBarWith("partnerTan");
  assert.match(tan, /Tan comes into your bar/, "the partnerTan route comes due");
  assert.equal(G.pendingChoice, "tanfavour", "it gates input like any modal");

  const candy = ownsBarWith("partnerCandy");
  assert.equal(/Tan comes into your bar/.test(candy), false,
    "Candy's 51% is a Bangkok lawyer's paperwork — there is nothing to call in");
  assert.notEqual(G.pendingChoice, "tanfavour");
});

test("the modal answers on all its surfaces, and swallows anything else", () => {
  ownsBarWith("partnerTan");
  assert.deepEqual(_chipSet().map(c => c.cmd), ["yes", "no", "ask"],
    "touch players get the answers as chips");
  const stray = say("dance");
  assert.match(stray, /Tan waits/, "an unrelated command doesn't escape the modal");
  assert.equal(G.pendingChoice, "tanfavour", "…and doesn't answer it either");
  assert.match(say("ask"), /She is Lao/, "ASK gets a straight answer");
  assert.equal(G.pendingChoice, "tanfavour", "…and re-prompts rather than deciding for you");
});

test("saying yes puts you inside somebody's web of favours", () => {
  ownsBarWith("partnerTan");
  say("yes");
  assert.ok(_flag("tanFavourDone"));
  assert.equal(G.pendingChoice, null);
  assert.ok(G.faction.syndicate >= 2, "the obligation is now on the books");
});

test("saying no is free — the cost is a sentence, not a penalty", () => {
  ownsBarWith("partnerTan");
  const no = say("no");
  assert.ok(_flag("tanFavourRefused"));
  assert.equal(G.faction.syndicate || 0, 0,
    "faction doctrine: standing moves on the deed, declining costs nothing");
  assert.equal(G.faction.wdg || 0, 0, "…and triggers no reprisal anywhere else");
  // the sting is that he could have written the name himself and came and asked
  assert.match(no, /fifty-one percent|It is your bar/i);
});

test("he asks once, ever", () => {
  ownsBarWith("partnerTan");
  say("no");
  out = []; _arriveAt("stinky_bar");
  assert.equal(/Tan comes into your bar/.test(out.join("\n")), false,
    "tanAsked is set on the ask itself, so it can't re-fire after either answer");
});
