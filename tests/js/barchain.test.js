// The bar-owning chain: premises → licence → staff → opening night.
//
// This is the expat stage's reason to exist — _goExpat's closing line promises
// it ("They say the smart ones end up owning a bar…"), so the chain is what
// turns that from a wink into a door.
//
// Why a scripted playthrough rather than a soak ceiling: the soak's policy plays
// randomly, and a dep-chained quest line is not reachable at random. It needs
// talk-until-offered, ACCEPT, travel, and a specific ASK at each step. Checked
// while building this — a five-seed expat soak offers ZERO quests and prints not
// one line of this chain. That's true of all 20 quests, not just these four: the
// soak measures ambient prose, never authored quest content. So the chain gets
// the guard that actually fits it.
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

beforeEach(() => { out = []; becomeExpat(); });

test("the chain is expat-only — a seven-day vacation doesn't buy a bar", () => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const q of ["bar_premises", "bar_licence", "bar_staff", "bar_opening"])
    assert.equal(_questAvailable(q), false, `${q} must not be offered on a vacation`);

  becomeExpat();
  assert.ok(_flag("expatLife"), "_goExpat sets the gate flag");
  assert.equal(_questAvailable("bar_premises"), true, "the chain opens once you stay");
});

test("the licence step is gated on having warned Wayne — you learn the trap before you dodge it", () => {
  G.quests.bar_premises = "done"; _setFlag("barPremises");
  assert.equal(_questAvailable("bar_licence"), false,
    "without nominee_deal done, Wayne has no reason to give you the straight answer");

  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  assert.equal(_questAvailable("bar_licence"), true,
    "warning Wayne off the nominee deal is what earns the honest version");
});

test("Bert eventually offers the premises — his rota reaches it", () => {
  G.room = "stinky_bar";
  let offered = null;
  // He asks the player a question on first contact, and _questOffer defers while
  // one is pending; a multi-quest giver then rotates. Play it like a player: talk,
  // answer if asked, repeat.
  for (let i = 0; i < 8 && !offered; i++) {
    const t = say("talk to bert");
    if (/The Dead Shamrock/.test(t)) offered = t;
    else if (G.convoQ) say("nothing much, mate");
  }
  assert.ok(offered, "Bert never got round to offering The Dead Shamrock");
  assert.match(offered, /ACCEPT BAR_PREMISES/i, "the offer names the command that takes it");
});

test("each step completes off its giver's answer, and pays out", () => {
  const step = (qid, room, cmd, flag) => {
    G.quests[qid] = "active";
    G.room = room;
    say(cmd);
    assert.ok(_flag(flag), `${qid}: asking should set ${flag}`);
    say("look");                       // _questTick completes on the next turn
    assert.equal(G.quests[qid], "done", `${qid} should have completed`);
  };
  const happy0 = G.happy;

  step("bar_premises", "khao_talo_bar", "ask daeng about shamrock", "barPremises");

  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  step("bar_licence", "golden_dragon", "ask wayne about licence", "barLicence");
  step("bar_staff", "candy_bar", "ask candy about staff", "barStaff");
  step("bar_opening", "candy_bar", "ask candy about opening", "barOpen");

  assert.ok(G.happy > happy0, "finishing the chain should leave you happier than it found you");
});

test("the givers hold their answers back until the step before is done", () => {
  // Out of order, the chain must not leak its later beats — asking Candy about
  // staff before there's a licence should not hand you a bar.
  G.room = "candy_bar";
  say("ask candy about staff");
  assert.equal(_flag("barStaff"), false, "no staff before a licence");
  G.room = "golden_dragon";
  say("ask wayne about licence");
  assert.equal(_flag("barLicence"), false, "no licence before premises");
});

test("opening night names the people who got you there", () => {
  for (const f of ["barPremises", "barLicence", "barStaff"]) _setFlag(f);
  G.quests.bar_opening = "active";
  G.room = "candy_bar";
  const t = say("ask candy about opening");
  // The payoff is a scene, not a receipt: the staff Candy sent, the neighbour who
  // watches, and the one regular who turns up because of course he does.
  for (const who of ["mamasan", "Daeng", "Bert"])
    assert.match(t, new RegExp(who), `opening night should feature ${who}`);
});
