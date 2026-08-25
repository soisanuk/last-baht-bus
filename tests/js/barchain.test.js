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
  // silence ambient vendors and street noise. A peddler or saleng can arm
  // pendingEnc on any turn, and a live modal legitimately eats the next typed
  // command — which made these tests flake ~1 run in 20 with a peddler's
  // head-shake standing in for the answer. Same idiom engine.test.js uses.
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.pendingEnc = null;
}
const say = cmd => { out = []; doCommand(cmd); return out.join("\n"); };
// These are unit tests of specific mechanics, not of ambient bar life — but the
// bar is alive: a vendor can arm pendingEnc on any tick, and a live modal then
// legitimately eats the NEXT typed command (a peddler's head-shake standing in
// for the answer). Clearing beforehand isn't enough, because it's the PRECEDING
// command that arms it. So drain the gates immediately before anything we're
// about to assert on. Found by a 1-in-20 flake, not by reasoning.
const cmd = c => { G.pendingEnc = null; G.pendingChoice = null; G.game = null; return say(c); };
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
  G.room = "stinky_bar"; cmd("ask bert about buying");
  assert.ok(_flag("barPremises"), "Bert's answer sets the flag");
  say("look");
  assert.equal(G.quests.bar_premises, "done");

  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  G.quests.bar_licence = "active";
  G.room = "golden_dragon"; cmd("ask wayne about licence");
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
    assert.equal(G.pendingChoice, "partner", `${who} pitches, doesn't commit`);
    say("yes");
    assert.ok(_flag("barPartner"), `${who} should close the partnership step`);
    assert.ok(_flag(marker), `${who} should record which route was taken (${marker})`);
    say("look");
    assert.equal(G.quests.bar_partner, "done", `${who} route should complete the quest`);
  }
});

test("the two routes leave you standing in different places", () => {
  becomeExpat(); upToTheFork();
  G.room = "candy_bar"; say("ask candy about partnership"); say("yes");
  const candyF = { ...G.faction };

  becomeExpat(); upToTheFork();
  G.room = "soi6_street"; say("ask tan about partnership"); say("yes");
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
  G.room = "candy_bar"; say("ask candy about partnership"); say("yes");
  _setFlag("barPaid");                 // deposit settled — see _barDeposit
  G.quests.bar_opening = "active"; G.room = "stinky_bar";
  const candyNight = say("ask bert about opening");
  assert.ok(_flag("barOpen"));
  assert.match(candyNight, /paperwork pinned behind the till/,
    "Candy's night is legible: her name, first, where anyone can read it");

  becomeExpat(); upToTheFork();
  G.room = "soi6_street"; say("ask tan about partnership"); say("yes");
  _setFlag("barPaid");                 // deposit settled — see _barDeposit
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
    G.room = room; say(`ask ${who} about partnership`); say("yes");
    _setFlag("barPaid");                 // deposit settled — see _barDeposit
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
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", "barOpen"]) _setFlag(f);
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
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", partner, "barOpen"]) _setFlag(f);
  G.nightTurn = 35;          // an evening beat
  G.room = "stinky_bar";
  out = []; _arriveAt("stinky_bar");
  return out.join("\n");
}

test("the owner who opens up early and stays put still gets his partner's visit", () => {
  // actuary playtest 2026-08-23: _tanFavourDue/_synDue were checked ONLY from
  // _arriveAt and both need nightTurn >= 30 — so an owner who walked in before
  // the beat and never left (which is exactly what WORK encourages) never met
  // his own partner. 65 nights of ownership, zero visits. Same bug class as the
  // quiz's arrival-only capture, and the same fix: the tick finds you in situ.
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", "partnerTan", "barOpen"]) _setFlag(f);
  G.stage = "expat";
  G.room = "stinky_bar";
  G.nightTurn = 26;                 // in the bar BEFORE the beat is due
  out = []; _arriveAt("stinky_bar");
  assert.notEqual(G.pendingChoice, "tanfavour", "too early — nothing yet");
  // A bar vendor (the watch peddler) can arm pendingEnc from _tick on any turn,
  // independent of the ENCOUNTERS table — and the beat correctly defers while
  // any modal is live, so clear it: we're testing Tan's arrival, not the peddler.
  for (let i = 0; i < 8 && G.pendingChoice !== "tanfavour"; i++) { G.pendingEnc = null; _tick(); }
  assert.ok(G.nightTurn >= 30, "the hour came round while standing still");
  assert.equal(G.pendingChoice, "tanfavour", "and it found him at his own bar");
});

test("an honest working owner — WORK, then stand the rail — meets his shift call AND his procurement job", () => {
  // Cost-accountant playtest 2026-08-26 reported "40+ owned nights, zero
  // procurement jobs" and concluded the partnerTan endgame was invisible. It was
  // a MEASUREMENT artifact: her P&L-optimal play declared WORK and left for home
  // to save the wage, which the presence tick (_workPresenceTick) LAPSES — so the
  // "worked" nets she measured came from setting flags directly, never actually
  // standing at the bar at nightTurn>=30 where both beats are due. The honest
  // path — declare the shift and stay in it — meets both, because standing the
  // rail IS being at the bar past 21:00. This pins that so no future shortcut
  // measurement can misread a working feature as a dead one.
  becomeExpat();
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", "partnerTan", "barOpen", "tanAsked"]) _setFlag(f);
  G.room = "stinky_bar";
  G.money = 20000;
  G.syn = { done: {}, asked: {}, friction: 0, lastAskDay: null };
  say("work");
  assert.equal(G.bar.workedDay, G.day, "the shift is declared");
  let shiftSeen = false, synSeen = false, guard = 0;
  while (G.nightTurn < 58 && guard++ < 90) {
    if (G.pendingChoice === "shift") { shiftSeen = true; say("no"); }
    else if (G.pendingChoice === "synjob") { synSeen = true; say("no"); }
    else { say("wait 1"); }                   // stand still — never leave the rail
  }
  assert.equal(G.room, "stinky_bar", "he never left his own floor");
  assert.ok(G.bar.workedLast, "the shift never lapsed — he stood it");
  assert.ok(shiftSeen, "a publican's decision reached him while he worked");
  assert.ok(synSeen, "and so did the procurement beat — the endgame is not invisible to a working owner");
});

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

// ── Procurement: how work gets given out, and the price of staying out ──────
// Once you own the bar, cleaning / the screen / the till all run through
// partners. The content's frame is that this is ordinary business here and
// everywhere, so nothing in it is written as a scandal. Mechanically the rule
// is: neutrality is ALWAYS available and nothing is ever blocked — refusing
// costs you the frictionlessness, not the option.
// like ownsBarWith above, but WITHOUT walking in — these tests control arrival
// themselves, since arriving is what fires a procurement beat.
function ownsBar(partner) {
  becomeExpat();
  for (const f of ["barPremises", "barLicence", "barPartner", "barPaid", partner, "barOpen"]) _setFlag(f);
  G.nightTurn = 35;
  G.room = "stinky_bar";
}
const arriveAtBar = () => {
  if (G.syn) G.syn.lastAskDay = null;      // clear the one-a-night gate
  out = []; _arriveAt("stinky_bar"); return out.join("\n");
};

test("procurement only comes to the Tan route, and only after the free favour", () => {
  ownsBar("partnerCandy"); _setFlag("tanAsked");
  arriveAtBar();
  assert.notEqual(G.pendingChoice, "synjob", "Candy handles her own arrangements");

  ownsBar("partnerTan");               // tanAsked NOT set: the favour comes first
  arriveAtBar();
  assert.notEqual(G.pendingChoice, "synjob", "the small free ask precedes the priced one");

  _setFlag("tanAsked");
  arriveAtBar();
  assert.equal(G.pendingChoice, "synjob", "then the jobs start");
});

test("the jobs arrive in order, one a night", () => {
  ownsBar("partnerTan"); _setFlag("tanAsked");
  arriveAtBar();
  assert.equal(G.synJob, SYNDICATE_JOBS[0].id, "cleaning is the induction");
  say("yes");
  out = []; _arriveAt("stinky_bar");       // same night — no second ask
  assert.notEqual(G.pendingChoice, "synjob", "one procurement beat a night at most");
  G.day++; arriveAtBar();
  assert.equal(G.synJob, SYNDICATE_JOBS[1].id, "next night, next job");
});

test("saying yes buys the frictionless version", () => {
  ownsBar("partnerTan"); _setFlag("tanAsked");
  arriveAtBar();
  const before = G.faction.syndicate || 0;
  say("yes");
  assert.ok(G.syn.done.cleaning, "the job is on the books");
  assert.ok((G.faction.syndicate || 0) > before, "you're further inside");
  assert.equal(G.pendingChoice, null);
});

test("staying out is allowed, costs no standing, and blocks nothing", () => {
  ownsBar("partnerTan"); _setFlag("tanAsked");
  arriveAtBar();
  const no = say("no");
  assert.equal(G.faction.syndicate || 0, 0,
    "declining is not a deed against anybody — no standing moves");
  assert.equal(G.faction.wdg || 0, 0, "and nothing is done to you anywhere else");
  assert.ok(G.syn.friction >= 1, "what you lose is the frictionlessness");
  // the work still happens — neutrality is priced, never blocked
  assert.match(no, /you find somebody|hire two women|there are many people/i);
});

test("friction is weather at your own bar, and scales with how far outside you stay", () => {
  ownsBar("partnerTan"); _setFlag("tanAsked");
  arriveAtBar(); say("no");
  G.room = "candy_bar"; out = []; _synFrictionTick();
  assert.equal(out.length, 0, "somebody else's bar isn't your supply problem");

  G.room = "stinky_bar";
  let fired = 0;
  for (let i = 0; i < 40; i++) { G.syn.frictionDay = null; out = []; _synFrictionTick(); if (out.length) fired++; }
  assert.ok(fired > 0, "it should surface at your own bar");
  assert.ok(fired < 40, "…without becoming a drumbeat");
});

test("the don't-do-it-yourself rule is stated by a character, not narrated", () => {
  ownsBar("partnerTan"); _setFlag("tanAsked");
  arriveAtBar(); say("yes");               // cleaning
  G.day++; arriveAtBar();                  // the screen
  const why = say("ask");
  assert.match(why, /Thai people do that work|takes? it from them/i,
    "a farang up a ladder is taking work, and Tan is the one who says so");
});

test("nothing in this thread is written as a scandal", () => {
  // the frame is that this is ordinary business, here and everywhere — the only
  // local difference being that nobody pretends otherwise
  const prose = SYNDICATE_JOBS.map(j => [j.lead, j.ask, j.who, j.yes, j.perk, j.no].join(" ")).join(" ");
  for (const word of [/\bbribe/i, /\bcorrupt/i, /\bkickback/i, /\bmafia/i])
    assert.equal(word.test(prose), false, `procurement prose shouldn't reach for ${word}`);
});

// ── The books ───────────────────────────────────────────────────────────────
// The purchase is seller-financed, because the player cannot buy a bar: pocket
// plus bank tops out at ฿120,000 and an established Soi 6 beer bar is seven
// figures. Bert's existing line already implies it — "he'll take a regular over
// a company… he'll lose money on you, and he knows that too" — so the deposit
// empties you and the old man carries the rest. That monthly is what gives low
// season teeth and what makes the procurement decision cost something.
function readyToBuy() {
  becomeExpat();
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.room = "stinky_bar";
}

test("the deposit prose doesn't claim it's your last baht when it plainly isn't", () => {
  // actuary playtest 2026-08-23: "It is every baht you have" was unconditional,
  // and printed verbatim to a player holding ฿2m. True for the intended player,
  // who scrapes it together over several ATM days; a plain falsehood otherwise.
  readyToBuy();
  G.money = BAR_DEPOSIT;              // the intended case: it really is everything
  out = []; _barDeposit();
  assert.match(out.join("\n"), /every baht you have/);

  readyToBuy();
  G.money = BAR_DEPOSIT + 500000;     // a rich buyer
  out = []; _barDeposit();
  const rich = out.join("\n");
  assert.doesNotMatch(rich, /every baht you have/, "…and it doesn't lie to a rich one");
  assert.match(rich, /bar towel/, "same beat, honest wording");
});

test("you cannot buy a bar with what you have — the deposit is your ceiling", () => {
  readyToBuy();
  assert.ok(G.money < BAR_DEPOSIT, "expat savings alone must not cover it");
  out = []; _barDeposit();
  assert.equal(_flag("barPaid"), false, "short is short");
  assert.match(out.join("\n"), /short/, "and Bert says how short");

  G.money = BAR_DEPOSIT + 10000;          // a week at the ATM
  out = []; _barDeposit();
  assert.ok(_flag("barPaid"));
  assert.equal(G.money, 10000, "it takes every baht of the deposit");
  assert.equal(G.bar.owed, BAR_PRICE - BAR_DEPOSIT, "the old man carries the rest");
});

test("no deposit, no opening night", () => {
  readyToBuy();
  G.quests.bar_opening = "active";
  say("ask bert about opening");
  assert.equal(_flag("barOpen"), false, "the bar isn't yours until it's paid for");
});

test("a losing night comes out of your own pocket before it shows anywhere", () => {
  readyToBuy(); G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
  G.bar.cash = 0; G.money = 5000;
  // friction high enough that costs exceed even the best night's take, so every
  // night loses — otherwise the till builds a buffer and absorbs it, which is
  // itself the correct behaviour and why this needs forcing to observe.
  G.syn = { done: {}, asked: {}, friction: 20 };
  let covered = false;
  for (let i = 0; i < 10 && !covered; i++) { G.day++; out = []; _barSettle(); covered = /your own money went in/.test(out.join("\n")); }
  assert.ok(covered, "the owner quietly funds the shortfall — that's the job");
  assert.ok(G.money < 5000);
});

test("the old man is paid every thirty days, from the till then your pocket", () => {
  readyToBuy(); G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
  G.bar.cash = 200000;
  const before = G.bar.months;
  let paidLine = "";
  for (let i = 0; i < 31; i++) {
    G.day++; G.room = "stinky_bar"; _doWork(); out = []; _barSettle();
    if (/to the old man/.test(out.join("\n"))) paidLine = out.join("\n");
  }
  assert.equal(G.bar.months, before + 1, "one payment a month, not one a night");
  assert.match(paidLine, /paid from the till/, "and it comes out of the till first");
  // NB: not asserting the till shrank — a month of trade outpaces one payment,
  // which is the whole point of a bar that works.
});

test("refusing procurement is what makes the month hard — it's on the supply line forever", () => {
  const yearEnd = friction => {
    readyToBuy(); G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
    G.syn = { done: {}, asked: {}, friction };
    for (let d = 0; d < 360; d++) { G.day++; G.room = "stinky_bar"; _doWork(); out = []; _barSettle(); }
    return G.bar.cash;
  };
  const inside = yearEnd(0), outside = yearEnd(6);
  assert.ok(inside > 0, "a bar run inside the arrangement clears its monthly");
  assert.ok(outside < inside,
    "and every job you turned down is on the supply bill, every night, forever");
});

test("the note falls by what you actually paid — a partial payment isn't collected twice", () => {
  // publican playtest (2026-08-23), the worst finding in that report: a partial
  // month was taken IN FULL from the till and credited to nothing (`owed` only
  // ever fell by a flat BAR_MONTHLY, and only on months settled outright), then
  // the shortfall was billed again next month as arrears. ฿50,000 handed over
  // reduced the debt by ฿25,000.
  running();
  // Rent comes out first now (the landlord can re-let the room; the old man
  // cannot do anything at all), so the till is stocked with the rent on top of
  // the figure under test — what this asserts is the NOTE's arithmetic.
  const rent = _barRent();
  G.bar.owed = 1680000; G.bar.cash = rent + 22100; G.bar.lastMonthDay = 0;
  G.bar.arrears = 0; G.bar.months = 1; G.money = 0; G.day = 31;
  G.bar.rentOwed = 0; G.bar.rentShort = 0;
  const owed0 = G.bar.owed;
  const a = _barMonthly();
  assert.equal(a.paid, 22100, "the whole till went");
  assert.equal(G.bar.arrears, 2900, "and the shortfall is remembered");
  assert.equal(owed0 - G.bar.owed, 22100, "the principal falls by exactly what was handed over");

  G.bar.cash = rent + 27900; G.bar.lastMonthDay = 0; G.day = 62;
  const b = _barMonthly();
  assert.equal(b.paid, 27900, "next month collects the arrears on top");
  assert.equal(G.bar.arrears, 0);
  assert.equal(owed0 - G.bar.owed, 50000, "฿50,000 paid must clear ฿50,000 of debt, not ฿25,000");
});

test("the nightly line reconciles: what it says moved is what the till did", () => {
  // Work-event money landed straight in G.bar.cash and never entered the `take`
  // the settle line prints, so three nights in twelve the books did not add up.
  running();
  G.stage = "expat"; G.bar.lastMonthDay = G.day; G.money = 5000; G.rng = 991;
  for (let i = 0; i < 8; i++) {
    const before = G.bar.cash;
    G.room = "stinky_bar"; out = []; _doWork(); _endNight("dawn");
    const line = (out.join("\n").match(/\(The bar: .*?\)/) || [""])[0];
    const m = line.match(/฿(-?\d+) in, ฿(\d+) out/);
    if (!m) continue;
    assert.equal(Number(m[1]) - Number(m[2]), G.bar.cash - before,
      `night ${i + 1}: the line says ${m[1]} in / ${m[2]} out, the till moved ${G.bar.cash - before}`);
  }
});

test("an owner can take his own money out of his own till", () => {
  // publican playtest: money flowed INTO the till and never out, so 65 nights of
  // ownership ended with ฿3,637 in the drawer, ฿0 in pocket and hotel debt
  // accruing. Not a hard economy — an incoherent one.
  running();
  G.room = "stinky_bar"; G.bar.cash = 36000; G.money = 0;
  out = []; _doDraw("5000");
  assert.equal(G.money, 5000, "it reaches your pocket");
  assert.equal(G.bar.cash, 31000, "and leaves the till");
  out = []; _doDraw("");
  assert.equal(G.bar.cash, 0, "a bare DRAW empties the drawer");
  assert.equal(G.money, 36000);
  out = []; _doDraw("100");
  assert.match(out.join("\n"), /empty/i, "…and an empty drawer says so");
  // not from the pavement
  G.room = "beach_rd_n"; out = []; _doDraw("100");
  assert.match(out.join("\n"), /at the Stinky Pinky/i);
});

test("BOOKS reads as a state, never as two numbers that contradict each other", () => {
  // actuary playtest 2026-08-23: an underwater bar printed "Till: ฿-12822",
  // which reads as an accounting error rather than a bar in trouble; and a
  // month that rolled into arrears left `owed` untouched while the same screen
  // called it "Months paid", so the two lines disagreed by ฿50,000.
  running();
  G.bar.cash = -12822; G.bar.owed = 1680000; G.bar.months = 2;
  G.bar.nights = 65; G.bar.arrears = 33611;
  out = []; _doBooks();
  const books = out.join("\n");
  assert.doesNotMatch(books, /฿-/, "no raw negative in the drawer");
  assert.match(books, /empty, and ฿12822 behind it/, "underwater is stated as a state");
  assert.match(books, /Months elapsed/, "an unpaid month is elapsed, not paid");
  assert.doesNotMatch(books, /Months paid/, "…and doesn't claim otherwise");
  // …and a bar that IS square still says "paid"
  G.bar.arrears = 0; out = []; _doBooks();
  assert.match(out.join("\n"), /Months paid/, "a settled month reads as paid");
});

test("BOOKS is honest about all of it", () => {
  // NB: the CONTENT assertions call _doBooks() directly rather than typing the
  // verb. A bar vendor (watch peddler, saleng) can arm pendingEnc on any turn,
  // and a live modal legitimately eats the next input — so a typed "books" is
  // occasionally answered by a peddler's head-shake instead. That's correct
  // behaviour and made this test flake 1 run in ~20 before it was pinned.
  readyToBuy();
  out = []; _doBooks();
  assert.match(out.join("\n"), /deposit isn't paid|nothing to keep books on/i,
    "before the purchase there is nothing to look at");

  G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
  G.syn = { done: {}, asked: {}, friction: 3 };
  G.day += 31; out = []; _barSettle();
  out = []; _doBooks();
  const books = out.join("\n");
  assert.match(books, /Owed to the old man/, "the debt is the headline");
  assert.match(books, /over the going rate/, "…and the friction is itemised");
});

test("BOOKS is reachable as a typed verb", () => {
  readyToBuy();
  G.pendingEnc = null; G.pendingChoice = null;   // nothing gating input
  assert.match(cmd("books"), /deposit isn't paid|nothing to keep books on/i);
  assert.match(cmd("takings"), /deposit isn't paid|nothing to keep books on/i);
});

// ── The presence dilemma ────────────────────────────────────────────────────
// The expat stage's actual question: stand behind your own rail, or go out and
// have the night you moved here for. Both real, neither sustainable.
function running(friction = 0) {
  becomeExpat();
  for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
  G.room = "stinky_bar"; G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
  G.syn = { done: {}, asked: {}, friction };
}

test("WORK needs a bar of your own to work in", () => {
  becomeExpat();
  assert.match(cmd("work"), /don't own a bar/i);
  running();
  G.room = "candy_bar";
  assert.match(cmd("work"), /not in it|Bert is managing/i, "you can't work somebody else's rail");
  G.room = "stinky_bar";
  cmd("work");
  assert.equal(G.bar.workedDay, G.day, "a shift is a declared thing, once a night");
  assert.match(cmd("work"), /already on/i);
});

test("working roughly doubles the night — that's what makes going out a decision", () => {
  const takeOver = (work, nights) => {
    running(); let total = 0;
    for (let i = 0; i < nights; i++) {
      G.day++; G.room = "stinky_bar";
      if (work) _doWork();
      const before = G.bar.cash; out = []; _barSettle();
      total += G.bar.cash - before;
    }
    return total;
  };
  const worked = takeOver(true, 60), away = takeOver(false, 60);
  assert.ok(worked > away, "your own rail out-earns Bert's");
  assert.ok(worked > away * 1.5, `and by enough to matter (${worked} vs ${away})`);
});

test("the shift survives the night ending — the presence dilemma runs through the REAL path", () => {
  // The regression that matters. Every other test here calls _doWork() then
  // _barSettle() directly, same day — but the real game settles from _endNight,
  // AFTER G.day++, and the old `workedDay === G.day` test was therefore always
  // false at settle. The dilemma was inert for the entire expat stage and no
  // test could see it, because no test crossed the day boundary the bug lived on
  // (actuary playtest 2026-08-23: 65 owned nights, all settled as "Bert ran it").
  running();
  G.stage = "expat";
  G.room = "stinky_bar";
  G.rng = 4242;
  _doWork();
  assert.ok(G.bar.workedLast, "the shift is flagged when it's declared");
  const cash0 = G.bar.cash, day0 = G.day;
  _endNight("dawn");
  assert.equal(G.day, day0 + 1, "the night really did end");
  assert.equal(G.bar.away, 0, "a worked night doesn't count as an absence");
  assert.ok(G.bar.streak >= 1, "and it builds the grind streak");
  assert.ok(!G.bar.workedLast, "the flag is consumed, so tomorrow starts unworked");
  const workedTake = G.bar.cash - cash0;

  // the same night, not worked, on the same seed
  running();
  G.stage = "expat";
  G.room = "hotel_room";
  G.rng = 4242;
  const cash1 = G.bar.cash;
  _endNight("dawn");
  assert.equal(G.bar.away, 1, "an absent owner is counted absent");
  assert.ok(workedTake > G.bar.cash - cash1,
    `working the rail beats Bert on an identical seed (${workedTake} vs ${G.bar.cash - cash1})`);
});

test("a declared shift has to be STOOD — you can't clock on and go out", () => {
  // insider playtest (2026-08-23): WORK set the flag, fired the night's whole
  // event roll on the spot and returned control, so the trade the expat stage is
  // built on cost exactly one turn — declare, walk to the Queen Vic, drink
  // through the night, and it still settled as worked at the full multiplier.
  // Landed straight on top of the previous day's settle-time fix: the flag
  // worked, nothing checked you were still there.
  running();
  G.stage = "expat"; G.room = "stinky_bar"; G.nightTurn = 20;
  _doWork();
  assert.ok(G.bar.workedLast, "clocked on");
  G.room = "queen_vic";
  for (let i = 0; i < WORK_AWAY_BUDGET + 1; i++) _tick();
  assert.equal(G.bar.workedLast, false, "the shift lapses once you've spent the evening elsewhere");

  // …and staying put keeps it
  running();
  G.stage = "expat"; G.room = "stinky_bar"; G.nightTurn = 20;
  _doWork();
  for (let i = 0; i < WORK_AWAY_BUDGET + 10; i++) _tick();
  assert.ok(G.bar.workedLast, "a night actually spent behind your own rail still counts");
});

test("a year of unbroken shifts is rich and joyless — the grind is the cost", () => {
  running();
  let grind = 0;
  for (let i = 0; i < 40; i++) {
    // settle EVERY night — the real game always does (_endNight → _barSettle),
    // and a loop that works forty nights without one of them ever ending let
    // the presence-dilemma bug hide for as long as it did (actuary playtest
    // 2026-08-23): the shift flag is set on WORK and consumed at settle, so a
    // night that never settles leaves it standing.
    G.day++; G.room = "stinky_bar"; out = []; _doWork();
    if (/ten of them in a row|ten nights|look tired|forty seconds from this door/.test(out.join("\n"))) grind++;
    _barSettle();
  }
  assert.ok(G.bar.streak >= 10, "consecutive shifts accumulate");
  assert.ok(grind > 0, "a man who works every night has stopped living here, and the game says so");
  // one night out resets it
  G.day++; G.room = "candy_bar"; out = []; _barSettle();
  assert.equal(G.bar.streak, 0, "a single night out breaks the grind");
});

test("what you get from a shift is what HAPPENED, not the fact of working", () => {
  running();
  const seen = new Set();
  for (let i = 0; i < 400; i++) { G.day++; G.room = "stinky_bar"; out = []; _doWork(); }
  for (const k of Object.keys(G.bar.seen || {})) seen.add(k);
  assert.ok(seen.size >= 4, `several kinds of night should turn up (saw ${[...seen].join(",")})`);
  assert.ok(seen.has("millionaires") || seen.has("allin"),
    "some nights behind your own bar are the best nights you have");
});

test("faction standing is what keeps the police away — and nothing else does", () => {
  const policeNights = (friction, syndicate) => {
    running(friction); G.faction.syndicate = syndicate;
    for (let i = 0; i < 300; i++) { G.day++; G.room = "stinky_bar"; out = []; _doWork(); }
    return (G.bar.seen || {}).police || 0;
  };
  assert.equal(policeNights(6, 3), 0,
    "inside the arrangement it simply does not happen — that is what being inside IS");
  assert.equal(policeNights(0, 0), 0, "and with nothing refused there's no friction to notice");
  assert.ok(policeNights(6, 0) > 0,
    "outside it, with jobs refused, the licence and the staff list get looked at");
});

// ── Rent: the second creditor, and the one with teeth ────────────────────────
// Publican note (2026-08-25): the model had one monthly obligation, the old
// man's note, and he is written so as never to chase — so there was no monthly
// bill anybody could actually enforce. Real bars rent the shophouse. That is
// both the missing cost line and the missing failure state.

test("rent scales with what the room is, so a go-go prices itself", () => {
  running();
  assert.equal(_barRent(), BAR_RENT * RENT_MULT.beer, "the Stinky is a beer bar");
  const seen = new Set();
  for (const [type, mult] of Object.entries(RENT_MULT)) {
    assert.ok(mult >= 1, type + " must not be cheaper than a beer bar");
    seen.add(mult);
  }
  assert.ok(RENT_MULT.gogo > RENT_MULT.soi6 && RENT_MULT.soi6 > RENT_MULT.beer,
    "Walking Street costs more than Soi 6 costs more than a beer bar");
});

test("the landlord is paid before the old man, because only one of them can act", () => {
  running();
  const rent = _barRent();
  // enough for the rent and not a baht more
  G.bar.cash = rent; G.money = 0; G.bar.arrears = 0; G.bar.owed = 1680000;
  G.bar.rentOwed = 0; G.bar.rentShort = 0; G.bar.lastMonthDay = 0; G.day = 31;
  const m = _barMonthly();
  assert.equal(m.rentShort, 0, "the rent went");
  assert.equal(G.bar.rentOwed, 0);
  assert.equal(m.short, BAR_MONTHLY, "and the old man got nothing, which is survivable");
  assert.equal(G.bar.arrears, BAR_MONTHLY);
});

test("rent unpaid is remembered, and two months of it ends the lease", () => {
  running();
  G.bar.cash = 0; G.money = 0; G.bar.lastMonthDay = 0; G.day = 31;
  G.bar.rentOwed = 0; G.bar.rentShort = 0; G.bar.arrears = 0;
  const rent = _barRent();

  out = []; let m = _barMonthly(); _barArrearsTick(m);
  assert.equal(G.bar.rentOwed, rent, "month one is owed");
  assert.equal(G.bar.rentShort, 1);
  assert.ok(!_flag("barLost"), "one month is a conversation, not an eviction");
  assert.match(out.join("\n"), /teeth|rent/i, "and you are told which bill this is");

  G.bar.lastMonthDay = 0; G.day = 62;
  out = []; m = _barMonthly();
  assert.equal(m.rentMonths, 2, "two months short");
  _barArrearsTick(m);
  assert.ok(_flag("barLost"), "two months and the room is somebody else's");
  assert.equal(_flag("barOpen"), false);
  assert.match(out.join("\n"), /frontage|queue for the room/i, "the landlord's ending, not the partner's");
});

test("the partner's ending and the landlord's are different endings", () => {
  // Both routes exist and read differently — the fork has to pay off at the bad
  // end as well as the good one.
  running();                       // running() sets partnerTan
  G.bar.arrears = BAR_ARREARS_END; G.bar.rentOwed = 0; G.bar.rentShort = 0;
  out = []; _barArrearsTick({});
  const tan = out.join("\n");
  assert.ok(_flag("barLost"));
  assert.match(tan, /staff list|squared it with the old man/i, "Tan's version");
  assert.doesNotMatch(tan, /frontage/, "and not the landlord's");

  running(); G.flags.partnerTan = false; _setFlag("partnerCandy");
  G.bar.arrears = BAR_ARREARS_END; G.bar.rentOwed = 0; G.bar.rentShort = 0;
  out = []; _barArrearsTick({});
  assert.match(out.join("\n"), /lawyer|fourteen days/i, "Candy's version");
});

test("the nightly cost splits into nut, stock and wages — and a dead night is cheap", () => {
  running();
  G.rng = 4242;
  const nights = [];
  for (let i = 0; i < 40; i++) { G.day = 100 + i; G.bar.lastMonthDay = G.day; nights.push(_barNight()); }
  for (const n of nights) {
    assert.equal(n.nut + n.cogs + n.wages, n.costs, "the three lines are the whole bill");
    assert.ok(n.cogs > 0 && n.cogs < n.take, "stock is a share of what you sold");
  }
  // the point of a variable line: a thin night costs less than a fat one
  const lean = nights.slice().sort((a, b) => a.take - b.take)[0];
  const fat  = nights.slice().sort((a, b) => b.take - a.take)[0];
  assert.ok(lean.costs < fat.costs, "an empty bar is cheaper to run than a busy one");
});

test("a night away costs you money, which is what makes standing the rail a choice", () => {
  running();
  G.rng = 77; let W = 0, A = 0;
  for (let i = 0; i < 300; i++) {
    G.day = 200 + i; G.bar.lastMonthDay = G.day;
    const worked = i % 2 === 0;
    if (worked) { G.bar.workedLast = true; G.bar.workedDay = G.day; }
    const n = _barNight();
    if (worked) W += n.net; else A += n.net;
  }
  assert.ok(W / 150 > 2000, "your own rail clears real money");
  assert.ok(A / 150 < 0, "and Bert's shift does not cover itself — the away night is a cost");
});

test("the whole thing runs through the real path: nights end, months land, bars are lost", () => {
  // The repo rule: reach the subsystem the way the game does. _endNight is the
  // orchestrator that does G.day++ between the shifts, which is exactly the seam
  // that hid WORK doing nothing for 65 in-game nights.
  running();
  G.money = 0; G.bank = 0; G.bar.cash = 0; G.bar.lastMonthDay = G.day;
  G.bar.rentOwed = 0; G.bar.rentShort = 0;
  let months = 0;
  for (let i = 0; i < 100 && !_flag("barLost"); i++) {
    G.room = "hotel_room"; out = [];
    _endNight("dawn");
    if (out.join("\n").match(/Rent to the landlord/)) months++;
  }
  assert.ok(months >= 2, "months actually landed on the real path (saw " + months + ")");
  assert.ok(_flag("barLost"), "and a bar nobody stands in is eventually not yours");
});

// ── The floor, and the shift calls ───────────────────────────────────────────
// The presence dilemma was framed as takings-versus-everything-good, which made
// WORK the dutiful option by construction and left a repeat player executing a
// drill. These are the two fixes: a stood shift is where your own staff live,
// and the shift deals decisions rather than resolving itself.

test("your own staff are the role-carriers at your own bar, and never the manager", () => {
  running();
  const staff = _barStaff();
  assert.ok(staff.length >= 2, "a bar you own has a floor");
  for (const id of staff) {
    assert.ok(NPC_ROLES[id], id + " must carry a role");
    assert.ok(!NPCS[id].manager, "Bert is hired help, not somebody you court");
    assert.equal(_npcRoom(id), "stinky_bar");
  }
  assert.ok(!staff.includes("bert"));
});

test("standing your own rail builds bond with your own staff — earned, not bought", () => {
  running();
  G.room = "stinky_bar"; G.nightTurn = 20;
  cmd("work");
  const before = _barStaff().map(id => G.soc.drinks[id] || 0);
  for (let i = 0; i < 45; i++) cmd("time");
  const after = _barStaff().map(id => G.soc.drinks[id] || 0);
  assert.ok(after.some((n, i) => n > before[i]), "a night behind the bar is worth something");
  assert.equal(G.bar.floorN, WORK_FLOOR_MAX, "and it is capped, so it can't be farmed");
  // it SPREADS: the point is to know your floor, not to grind one of them
  assert.ok(after.filter((n, i) => n > before[i]).length >= 2,
    "the floor moments go to whoever you know least");
});

test("the floor only happens when you're actually standing it", () => {
  running();
  G.room = "stinky_bar"; G.nightTurn = 20;
  const before = _barStaff().map(id => G.soc.drinks[id] || 0);
  for (let i = 0; i < 45; i++) cmd("time");        // present, but no shift declared
  assert.deepEqual(_barStaff().map(id => G.soc.drinks[id] || 0), before,
    "standing about was always possible; declaring is what makes it a shift");
});

test("a shift deals one call a night, day-stable, and reading it can't reroll it", () => {
  running();
  G.room = "stinky_bar"; G.nightTurn = 20; G.day = 40;
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  cmd("work");
  for (let i = 0; i < 20 && G.pendingChoice !== "shift"; i++) cmd("time");
  assert.equal(G.pendingChoice, "shift", "the call arrived on the real path");
  const first = G.shiftCall;
  const rng = G.rng;
  // the redraw a reload does must be identical and must not touch the dice
  out = []; _renderResume();
  assert.match(out.join("\n"), /YES.*NO/, "a reload redraws the prompt, not a blank screen");
  assert.equal(G.rng, rng, "…and reading it consumes no dice");
  assert.equal(G.shiftCall, first);

  // NB: the file's cmd() helper deliberately DRAINS modals first (it exists to
  // stop ambient bar life eating an assertion), so answering one needs say().
  say("no");
  assert.equal(G.pendingChoice, null, "answering clears the gate");
  for (let i = 0; i < 20; i++) cmd("time");
  assert.notEqual(G.pendingChoice, "shift", "one call a night, not a stream");
});

test("every shift call is answerable both ways and settles the gate", () => {
  for (const call of SHIFT_CALLS) {
    for (const answer of ["yes", "no"]) {
      running();
      G.room = "stinky_bar"; G.nightTurn = 20; G.money = 50000;
      cmd("work");
      G.bar.shiftAsked = true; G.shiftCall = call.id; G.pendingChoice = "shift";
      if (call.id === "early") G.shiftWho = _barStaff()[0];
      say(answer);
      assert.ok(out.join("\n").trim().length > 40,
        call.id + "/" + answer + " must actually say something");
      assert.equal(G.pendingChoice, null, call.id + "/" + answer + " must clear the gate");
      assert.ok(Number.isFinite(G.bar.cash), call.id + "/" + answer + " kept the till a number");
      assert.ok(Number.isFinite(G.money));
    }
  }
});

test("a gibberish answer re-prompts instead of wedging the night", () => {
  // the modal-wedge invariant: every input-gating state must answer SOMETHING
  running();
  G.room = "stinky_bar"; G.nightTurn = 20;
  cmd("work");
  G.bar.shiftAsked = true; G.shiftCall = "round"; G.pendingChoice = "shift";
  say("xyzzy plugh");
  assert.equal(G.pendingChoice, "shift", "it waits");
  assert.match(out.join("\n"), /YES.*NO/, "and it re-asks rather than going silent");
});

test("the calls trade money against people in both directions", () => {
  // Not "nothing bad happens" — say what OUGHT to happen. Letting her go costs
  // the till and pays the person; holding her does the reverse.
  running(); G.room = "stinky_bar"; G.nightTurn = 20; cmd("work");
  const her = _barStaff().filter(id => NPC_ROLES[id] === "hostess")[0];
  G.soc.drinks[her] = 5;
  G.bar.shiftAsked = true; G.shiftCall = "early"; G.shiftWho = her; G.pendingChoice = "shift";
  const till0 = G.bar.cash, bond0 = G.soc.drinks[her];
  say("yes");
  assert.ok(G.bar.cash < till0, "a floor one short takes less money");
  assert.ok(G.soc.drinks[her] > bond0, "and she remembers it");

  running(); G.room = "stinky_bar"; G.nightTurn = 20; cmd("work");
  const her2 = _barStaff().filter(id => NPC_ROLES[id] === "hostess")[0];
  G.soc.drinks[her2] = 5;
  G.bar.shiftAsked = true; G.shiftCall = "early"; G.shiftWho = her2; G.pendingChoice = "shift";
  say("no");
  assert.ok(G.soc.drinks[her2] < 5, "and holding her costs the other side of the trade");
});

// ── The 51% fork is a decision, not an ask-ordering accident (2026-08-26) ────
// Publican playtest: the stage's flagship choice resolved on the first ASK with
// no confirmation, so a diligent player who asked Candy first (gated) then Tan
// stumbled into partnering Tan. Now each ASK PITCHES; a separate YES commits.
test("hearing a partner's pitch does not commit — you can sound out both first", () => {
  running(); G.flags.partnerTan = false; G.flags.barPartner = false;
  becomeExpat(); upToTheFork();
  // hear Candy — no commit
  G.room = "candy_bar"; say("ask candy about partnership");
  assert.equal(G.pendingChoice, "partner", "she pitches");
  assert.ok(!_flag("barPartner"), "…and nothing is signed yet");
  say("no");
  assert.ok(!_flag("barPartner") && !_flag("partnerCandy"), "declining commits to nobody");
  // now hear Tan — still free to choose
  G.room = "soi6_street"; say("ask tan about partnership");
  assert.equal(G.pendingChoice, "partner");
  say("yes");
  assert.ok(_flag("barPartner") && _flag("partnerTan"), "the YES commits to the one you chose");
  assert.ok(!_flag("partnerCandy"), "and not the one you passed on");
});

test("the partner pitch redraws on reload and re-asks on gibberish (modal invariant)", () => {
  running(); G.flags.partnerTan = false; G.flags.barPartner = false;
  becomeExpat(); upToTheFork();
  G.room = "candy_bar"; say("ask candy about partnership");
  const rng = G.rng;
  out = []; _renderResume();
  assert.match(out.join("\n"), /YES.*NO/, "a reload redraws the prompt");
  assert.equal(G.rng, rng, "…and consumes no dice");
  out = []; say("mushrooms");
  assert.equal(G.pendingChoice, "partner", "gibberish waits");
  assert.match(out.join("\n"), /YES.*NO/, "and re-asks");
});

test("once the fork is settled it cannot be re-opened", () => {
  running(); G.flags.partnerTan = false; G.flags.barPartner = false;
  becomeExpat(); upToTheFork();
  G.room = "soi6_street"; say("ask tan about partnership"); say("yes");
  assert.ok(_flag("partnerTan"));
  out = []; G.room = "candy_bar"; say("ask candy about partnership");
  assert.notEqual(G.pendingChoice, "partner", "the door is closed — barPartner excludes both nodes");
});

// ── The shift/floor content, blind-tested for the first time (2026-08-26) ────
test("a girl you let catch the eleven o'clock bus is off the floor for the night", () => {
  // publican F3: she was let go early, then passed mango down the bar twice
  running(); G.room = "stinky_bar"; G.nightTurn = 20; cmd("work");
  const her = _barStaff().filter(id => NPC_ROLES[id] === "hostess")[0];
  assert.ok(_npcsHere().includes(her), "on the floor first");
  G.bar.shiftAsked = true; G.shiftCall = "early"; G.shiftWho = her; G.pendingChoice = "shift";
  say("yes");
  assert.ok(!_npcsHere().includes(her), "gone — the floor really is one short");
  assert.ok(!_barStaff().includes(her) || _npcRoom(her) !== G.room, "and off the floor list");
  // …back tomorrow
  G.room = "hotel_room"; _endNight("dawn");
  assert.ok(!(G.soc.leftEarly && G.soc.leftEarly[her] === G.day), "the early-leave clears overnight");
});

test("floor moments deepen instead of retelling — a reveal is once, then the next", () => {
  // publican F4: Manow's "good ice" trust beat printed on night 2 AND night 11
  running(); G.room = "stinky_bar"; G.bar.room = "stinky_bar";
  const lines = [];
  for (let night = 0; night < 4; night++) {
    G.day = 100 + night;
    G.bar.workedLast = true; G.bar.workedDay = G.day;
    G.bar.floorN = 0; G.bar.floorTurn = -99;
    for (let t = 0; t < 50 && G.bar.floorN < WORK_FLOOR_MAX; t++) {
      G.turns += WORK_FLOOR_GAP; out = []; _workFloor();
      if (out.length) lines.push(out.join(" "));
    }
  }
  assert.ok(lines.length >= 8, "several floor moments landed");
  // within each girl's own lines, no verbatim repeat until her pool is spent
  const byGirl = {};
  for (const l of lines) {
    const who = ["Manow", "Lamai", "Cake"].find(n => l.includes(n)) || "?";
    (byGirl[who] = byGirl[who] || []).push(l);
  }
  for (const [who, ls] of Object.entries(byGirl)) {
    if (who === "?") continue;
    assert.equal(new Set(ls).size, ls.length, who + "'s reveals don't retell within the pool");
  }
});
