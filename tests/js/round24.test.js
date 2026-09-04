// ROUND 24 — three blind Opus personas on ground the earlier rounds never
// touched. Keith (ran two pubs for nineteen years; 68 in-game nights, bought a
// bar, ran it, lost it), Jojo (does the daily puzzle on the tram), Pauline (64,
// on a phone, arthritis in both thumbs, taps only).
//
// Between them they found the two hard blocks in the game: a cautious player
// cannot reach the expat endgame, and a tapping player cannot finish Act One.
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
  G.money = 20000;
  out = [];
}
beforeEach(() => sandbox());

// ── KEITH: the offer both partners say still stands ───────────────────────

function atPartnerChoice() {
  sandbox();
  G.stage = "expat";
  _setFlag("expatLife"); _setFlag("wdgResolved"); _setFlag("barPremises"); _setFlag("barLicence");
  G.quests.bar_partner = "active"; G.money = 200000;
  G.room = _npcWhere("candy"); G.nightTurn = 30;
  doCommand("talk to candy");
}

test("declining the 51% does not delete the expat endgame", () => {
  // The pitch arms pendingChoice through the node's fx, and effects fire on
  // FIRST delivery only — so saying "let me think" once made the flagship
  // decision of the whole stage permanently unreachable: no re-ask, no AGAIN,
  // no other route, quest active forever. And Candy PRAISES you for declining:
  // "a man who says yes to fifty-one percent in one night is not a man I want
  // holding forty-nine." The game rewarded caution and then locked its own
  // endgame (round 24, Keith, who finished his session only by reaching round
  // the back of the machine).
  atPartnerChoice();
  doCommand("ask candy about the partnership");
  assert.equal(G.pendingChoice, "partner", "the pitch arms the choice");
  out = []; doCommand("no");
  assert.match(text(), /offer stands|You should think/i, "she says it stands");
  doCommand("ask candy about the partnership");
  assert.equal(G.pendingChoice, "partner", "…and it does");
  doCommand("yes");
  assert.ok(_flag("barPartner"), "the decision can be taken after sleeping on it");
  assert.ok(_flag("partnerCandy"));
});

test("both partners re-arm, and fxAlways is what makes an offer an offer", () => {
  for (const who of ["candy", "tan"]) {
    const node = NPCS[who].dialogue.find(d => String(d.topic).split("|")[0] === "partnership");
    assert.ok(node && node.fx, `${who} pitches through an fx`);
    assert.ok(node.fxAlways, `${who}'s offer re-arms on the re-ask`);
  }
});

// ── PAULINE: a tapping player has to be able to finish the game ───────────

test("everyone can be waied, because Act One is solved with one", () => {
  // "(Manners might open it. A proper wai.)" — and Madam Oy's long-press menu
  // was talk / examine / buy her a drink. A player who taps rather than types
  // could not complete the opening quest of the game.
  sandbox();
  G.room = _npcWhere("oy") || NPCS.oy.room;
  assert.ok(_npcActions("oy", true).includes("wai"), "the mamasan who gates Act One");
  for (const id of _npcsHere()) assert.ok(_npcActions(id, true).includes("wai"), id + " can be waied");
  assert.ok(!_npcActions("nobody_here_xyz", true).includes("wai"), "…but not a name nobody has");
});

test("the fare chip pays the fare it advertises", () => {
  // The chip read "pay ฿15" and sent bare "pay", which the driver refuses —
  // "a number would help" — so the one tappable answer to the fare prompt
  // failed, in the mechanic the game is named after.
  sandbox();
  G.pendingFare = { price: 15 };
  const chips = _chipSet();
  assert.equal(chips.length, 1);
  assert.match(chips[0].label, /฿15/, "the label promises fifteen");
  assert.equal(chips[0].cmd, "pay 15", "and the command carries it");
});

// ── JOJO: the daily's one promise is that it is the same for everyone ─────

test("reading your own scoreboard is free", () => {
  // Every readout burned a turn. The dice are seeded and shared; the CLOCK was
  // not — so two people playing the same daily who checked their score a
  // different number of times were not in the same world. She proved it: same
  // seed, same commands, one fewer SCORE, and a ฿1,050 barfine became a refusal.
  G.room = "queen_vic";
  for (const cmd of ["score", "time", "inventory", "map", "diagnose", "share", "help", "quests"]) {
    const turn = G.nightTurn, turns = G.turns;
    doCommand(cmd);
    assert.equal(G.nightTurn, turn, `${cmd} must not advance the night`);
    assert.equal(G.turns, turns, `${cmd} must not advance the turn counter`);
  }
});

test("…but looking at the WORLD still costs a turn", () => {
  // The line is your own state vs the room. Making everything free would stop
  // the night moving at all.
  G.room = "queen_vic";
  for (const cmd of ["look", "weather", "listen"]) {
    const turn = G.nightTurn;
    doCommand(cmd);
    assert.ok(G.nightTurn > turn, `${cmd} is an act in a room, and costs a turn`);
  }
});

test("a double-tapped SLEEP cannot eat a whole night", () => {
  // The guard was suppressed when the previous command was a sleep — and the
  // sleep that ENDED THE PREVIOUS NIGHT counted, so the new night's sleep was
  // read as confirming a warning nobody had given. She lost a seventh of a
  // seven-night daily to one keystroke, and night one trains the double-tap
  // because the first SLEEP is swallowed by a modal.
  G.room = "hotel_room"; G.nightTurn = 85; G.wakeTurn = G.turns;
  doCommand("sleep");
  const day = G.day;
  G.wakeTurn = G.turns;                    // freshly woken, as you are
  out = []; doCommand("sleep");
  assert.match(text(), /the whole night goes with it/, "the bed asks if you mean it");
  assert.equal(G.day, day, "and the night is still there");
  doCommand("sleep");
  assert.equal(G.day, day + 1, "…but a real confirmation is honoured");
});

// ── KEITH: a publican's decision that had one correct answer ──────────────

test("the round on the house is the gamble its own prose describes", () => {
  // "It might buy the whole back half of the night — or it does nothing, and
  // you're down the cost of it." It was +฿400 guaranteed against −฿400 for
  // declining: an ฿800 swing with one right answer. An ex-publican reproduced
  // it three times and called it "not a decision, a free button".
  const outcomes = { yes: new Set(), no: new Set() };
  for (const ans of ["yes", "no"]) {
    for (let i = 0; i < 40; i++) {
      sandbox();
      G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); _setFlag("barPaid");
      G.bar = { cash: 20000, note: 0, arrears: 0, rentShort: 0, month: 0, floorSaid: {}, pocketDrawn: 0 };
      G.room = "stinky_bar";
      G.rng = (i + 1) * 104729 % 2147483647;
      G.pendingChoice = "shift"; G.shiftCall = "round";
      const before = G.bar.cash;
      doCommand(ans);
      outcomes[ans].add(G.bar.cash - before);
    }
  }
  assert.ok(outcomes.yes.size > 1, `YES is a gamble, not a payout (${[...outcomes.yes]})`);
  assert.ok(outcomes.no.size > 1, `and declining is not a guaranteed loss (${[...outcomes.no]})`);
  assert.ok([...outcomes.yes].some(v => v < 0), "sometimes you are down the cost of it, as the prose says");
});

test("the goodwill is not the gamble — the floor saw you do it either way", () => {
  sandbox();
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); _setFlag("barPaid");
  G.bar = { cash: 20000, note: 0, arrears: 0, rentShort: 0, month: 0, floorSaid: {}, pocketDrawn: 0 };
  G.room = "stinky_bar";
  const staff = _barStaff();
  const before = staff.map(id => G.soc.drinks[id] || 0);
  G.pendingChoice = "shift"; G.shiftCall = "round";
  doCommand("yes");
  const after = staff.map(id => G.soc.drinks[id] || 0);
  assert.ok(after.some((v, i) => v > before[i]), "you bought the room a drink and they know it");
});

// ── PAULINE: things the game told her to do and gave her no button for ─────

test("killer pool offers its moves, not just a way to forfeit", () => {
  // The league game's type is "kp", and the chip bar tested for "pool" and
  // "killer" — so a tapping player paid ฿100 to enter a quest-relevant game and
  // could only QUIT. _gameVerbs already knew about "kp", which is exactly how a
  // three-surfaces rule fails: two agree and the third is silently missing.
  for (const [type, want] of [["kp", ["shot", "power", "quit"]],
                              ["pool", ["shot", "power", "safety", "quit"]],
                              ["darts", ["go big", "steady", "finish", "quit"]],
                              ["quiz", ["1", "2", "3", "quit"]]]) {
    sandbox();
    G.game = { type };
    assert.deepEqual(_chipSet().map(c => c.cmd), want, `${type} chips its own moves`);
    // and the two surfaces agree
    const verbs = _gameVerbs();
    for (const w of want) if (w !== "go big") assert.ok(verbs.some(v => w.startsWith(v) || v === w),
      `${type}: "${w}" is on the chip bar and in the completion pool`);
  }
});

test("the rain offers a way to wait it out", () => {
  // "GO <somewhere inside>, or wait it out" — and WAIT was on no chip, in no
  // menu, nowhere. Her only tappable move was LOOK, eight times, before she
  // gave up and typed. The rain is frequent; this is the most-needed chip in
  // the game for somebody who does not type.
  sandbox();
  G.room = "soi6_street"; G.rain = 5;
  assert.ok(_chipSet().some(c => /^wait/.test(c.cmd)), "pinned by rain, WAIT is offered");
  G.rain = 0;
  assert.ok(!_chipSet().some(c => /^wait/.test(c.cmd)), "and not when it's dry");
});

test("the torch can be switched off in the room that tells you to", () => {
  // The compass is a street tool and hides indoors, which took the torch button
  // with it — so a player who walked into a go-go with it on was told "best
  // switch that off", teased by the girls and stood up at by security, with no
  // tappable way to obey. Three times she had to reach for the keyboard.
  sandbox();
  G.room = "stinky_bar"; G.lightOn = false;
  assert.equal(_navHere(), false, "no compass indoors");
  G.lightOn = true;
  assert.equal(_navHere(), true, "…unless the torch is still burning");
  assert.deepEqual(_navDirs(), [], "and it offers no directions, only the light");
});

// ── KEITH: the two creditors, and the building after it goes ──────────────

function owning(opts) {
  sandbox();
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); _setFlag("barPaid");
  G.bar = Object.assign({ cash: 0, note: 0, arrears: 0, rentShort: 0, rentOwed: 0,
    month: 0, drawn: 0, floorSaid: {}, pocketDrawn: 0 }, opts || {});
  G.room = "stinky_bar"; G.nightTurn = 30;
}

test("you can pay the landlord, and paying stops his clock", () => {
  // He comes to the bar in person to say "there is not a third time", you have
  // money in the till, and PAY RENT answered "Nobody's waiting to be paid."
  // Nineteen years behind a bar: "the most unbelievable thing in the game."
  owning({ cash: 9000, rentOwed: 15000, rentShort: 1 });
  G.money = 8000;
  out = [];
  doCommand("pay rent");
  assert.equal(G.bar.rentOwed, 0, "the money reaches him");
  assert.equal(G.bar.rentShort, 0, "and the eviction clock is stopped — the point of the verb");
  assert.equal(G.bar.cash + G.money, 2000, "taken from the till first, then your pocket");
});

test("a part payment is taken, and honestly described", () => {
  owning({ cash: 3000, rentOwed: 15000, rentShort: 1 });
  G.money = 0;
  out = [];
  doCommand("pay rent");
  assert.equal(G.bar.rentOwed, 12000);
  assert.equal(G.bar.rentShort, 1, "still short, so the clock is still running");
  assert.match(text(), /still short|still counting/i, "and he does not pretend it is all of it");
});

test("the old man's note can be settled too, and he never chases it", () => {
  owning({ cash: 20000, arrears: 9000 });
  out = [];
  doCommand("pay the note");
  assert.equal(G.bar.arrears, 0);
  assert.match(text(), /does not ring/i, "in character: he has never once chased you");
});

test("PAY RENT is on three surfaces, and only when you owe", () => {
  owning({ cash: 5000, rentOwed: 15000, arrears: 9000, rentShort: 1 });
  assert.deepEqual(engineComplete("pay "), ["rent", "the note"], "autocomplete offers what you owe");
  out = []; doCommand("books");
  assert.match(text(), /PAY RENT/, "and the books point at the verb");
  owning({ cash: 5000 });
  assert.deepEqual(engineComplete("pay "), [], "nothing owed, nothing offered");
  // …and the fare still keeps first refusal, on the mechanic the game is named for
  sandbox(); G.pendingFare = { price: 15 };
  assert.deepEqual(engineComplete("pay "), ["15"]);
});

test("when the bar goes, the building knows", () => {
  // Four days after White Dish took the lease, Bert was still on his stool
  // telling the man who bought it and lost it that the old man would carry him.
  sandbox();
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barLost");
  assert.notEqual(_npcRoom("bert"), "stinky_bar",
    "the ending says in as many words that Bert doesn't stay");
  G.room = _npcRoom("bert"); G.nightTurn = 30;
  out = []; doCommand("talk to bert");
  assert.match(text(), /wrong side of a bar|It was the month/,
    "and he has something to say to you about it");
  assert.doesNotMatch(text(), /Welcome to the Stinky|carry you/,
    "not the welcome speech, and never the sales pitch again");
});

test("BOOKS and the ending agree about what the room became", () => {
  // The ending: it reopens as the Stinky Pinky with a menu and a card machine.
  // BOOKS: a phone shop stands where the docket used to be pinned.
  sandbox();
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barLost");
  out = []; doCommand("books");
  assert.doesNotMatch(text(), /phone shop/, "one room, one fate");
  assert.match(text(), /still there/, "it is still a bar; it is just not yours");
  out = []; doCommand("draw 500");
  assert.match(text(), /There was\./, "and DRAW speaks to a man who HAD a till");
});

// ── the second-order items ────────────────────────────────────────────────

test("a drink costs what the room costs", () => {
  // Barfines already tiered — Gold Rush ST ฿600 against a Soi 6 ฿1,150 — which
  // made ฿80 a beer and ฿150 a lady drink in a beer bar, a Soi 6 bar AND a
  // Walking Street go-go conspicuous. "A go-go's beer is the whole reason a
  // go-go can afford the chrome" (round 24, Keith).
  const beer = r => _beerPrice(r), lady = r => _ladyPrice(r);
  const beerBar = Object.keys(ROOMS).find(r => ROOMS[r].barType === "beer");
  const gogo = Object.keys(ROOMS).find(r => ROOMS[r].barType === "gogo");
  const soi6 = Object.keys(ROOMS).find(r => ROOMS[r].barType === "soi6");
  assert.equal(beer(beerBar), BEER_PRICE, "the beer bar is the baseline the game was balanced in");
  assert.equal(lady(beerBar), LADY_DRINK);
  assert.ok(beer(gogo) > beer(soi6), "a go-go charges more than a Soi 6 bar");
  assert.ok(beer(soi6) > beer(beerBar), "…which charges more than a beer bar");
  assert.ok(lady(gogo) > lady(beerBar));
  for (const r of [beerBar, gogo, soi6]) {
    assert.equal(beer(r) % 10, 0, "nobody on this soi quotes ฿87");
    assert.equal(lady(r) % 10, 0);
  }
});

test("the quote and the charge are the same number", () => {
  // The prices are interpolated into pooled prose, so a helper that only fixed
  // the charge would have the girl quote one figure and the till take another.
  const gogo = Object.keys(ROOMS).find(r => ROOMS[r].barType === "gogo");
  sandbox();
  G.room = gogo; G.nightTurn = 30; G.money = 9000;
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  if (!girl) return;
  const before = G.money;
  out = [];
  doCommand("buy drink for " + NPCS[girl].name);
  const spent = before - G.money;
  if (!spent) return;                       // she declined; not this test's business
  assert.equal(spent, _ladyPrice(gogo), "the till takes the venue price");
  assert.match(text(), new RegExp(String(spent)), "and the prose quotes the same one");
});

test("the share card gives the score something to be measured against", () => {
  // "Wordle's 3/6 works because everyone knows the range. สนุก 134 tells you
  // and me nothing — is that good?" (round 24, Jojo). And: "฿9,085 in pocket is
  // not a brag, it's leftover cash and it clutters the line."
  sandbox();
  G.mode = "soi6"; G.day = 8; G.nightLog = ["barfine", "sleep", "dawn"];
  G.happy = 134; G.bestHappy = 150;
  let line = _shareCard().find(l => /สนุก/.test(l));
  assert.match(line, /best 150/, "a previous best is the comparison a daily player has");
  G.bestHappy = 100;
  line = _shareCard().find(l => /สนุก/.test(l));
  assert.match(line, /new best/, "and beating it is the thing worth posting");
  G.bestHappy = 0;
  line = _shareCard().find(l => /สนุก/.test(l));
  assert.doesNotMatch(line, /best/, "a first run has nothing to compare to, and says nothing");
  assert.ok(!_shareCard().some(l => /in pocket/.test(l)), "leftover cash is not a score");
});

test("the three Soi 6 men know each other, and the girl who runs his own bar", () => {
  // "Roy, Rob and Barry drink in three adjacent bars and are total strangers to
  // one another and to their own bars' mamasans." Barry offers to introduce you
  // to the girls and could not discuss the one who runs his own front stools.
  const PAIRS = [["barry", "wilai"], ["wilai", "barry"], ["barry", "roy"],
                 ["roy", "barry"], ["rob", "barry"]];
  for (const [who, about] of PAIRS) {
    sandbox();
    G.room = _npcWhere(who) || NPCS[who].room; G.nightTurn = 30;
    if (!_npcsHere().includes(who)) continue;
    doCommand("talk to " + who);
    out = [];
    doCommand(`ask ${who} about ${about}`);
    assert.doesNotMatch(text(), /pay grade|Not my department|Not my story|Search me|wrong girl/i,
      `${who} still has nothing to say about ${about}`);
    assert.ok(text().length > 140, `${who} on ${about} is a real answer`);
  }
});
