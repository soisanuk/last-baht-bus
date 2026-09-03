// Round 35 — three personas: Declan (Sonnet, the safe-cracker rerun after the
// hint fixes), Howard (Fable 5.1, the returning regular — two vacations with
// one woman), Stan (Opus, the lock-in regular who comes back the next night).
// One test per finding, so none of them can come back.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"));
}

let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
const flyHomeAndBack = () => { G.day = 8; _endVacation(); G.pendingChoice = null; _newVacation(); };

beforeEach(() => {
  out = []; newGame();
  G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  _setFlag("act1Done");
});

// ── Howard: the returning regular ───────────────────────────────────────────

// SEVERE. Her memory is not a meter. The bond-gated dialogue read the drinks
// book, which resets per vacation, so a man who came back after a month to a
// woman who had shown him her son's photo was told "we're not at the
// village-name part yet" until four drinks refilled the meter.
test("what she has told you survives the trip home (Howard F1)", () => {
  G.room = "lucky_tiger"; G.known.lek = true; G.soc.drinks = { lek: 14 }; G.phone.contacts = { lek: true };
  flyHomeAndBack();
  assert.equal(_bondTier("lek"), 0, "premise: this week's warmth has cooled");
  assert.equal(_knownTier("lek"), 3, "…but the tier she ever reached with you is kept");
  G.room = "lucky_tiger"; G.talked = {};
  out = []; run("ask lek about home");
  assert.match(text(), /Ban Phai/, "she still knows she told you the village");
  assert.doesNotMatch(text(), /village-name part yet/, "no re-gating behind the drinks");
  out = []; run("talk to lek");
  assert.doesNotMatch(text(), /Hello handsome! You play pool\?/, "and her hello is not night one's");
});

// SEVERE. The other-ledger reveals are once-per-girl-per-tier EVER by doctrine;
// wiping the book with the bonds replayed the ฿60 cut as news to a man she had
// shown the chit a month earlier.
test("the ledger she showed you is not shown again as news (Howard F2)", () => {
  G.room = "lucky_tiger"; G.soc.drinks = { lek: 14 }; G.soc.ledger = { lek: [1, 2, 3] };
  const seen0 = G.ledgerSeen;
  flyHomeAndBack();
  assert.deepEqual(G.soc.ledger.lek, [1, 2, 3], "the telling is remembered");
  assert.equal(G.ledgerSeen, 0, "…while the share card's per-week count still resets");
  G.room = "lucky_tiger"; G.soc.drinks = { lek: 7 };
  assert.equal(_otherLedger("lek"), false, "nothing is re-told");
  void seen0;
});

// "boyfriend".includes("oy") was true: ASK LEK ABOUT BOYFRIEND answered with
// Madam Oy, and on a repeat the "you forget so fast" brush-off for a topic
// never asked.
test("a short topic key never matches inside an unrelated word (Howard F7)", () => {
  G.room = "lucky_tiger"; G.known.lek = true;
  assert.notEqual((_pickDialogue("lek", "boyfriend") || {}).topic, "oy", "boyfriend is not Oy");
  assert.equal((_pickDialogue("lek", "oy") || {}).topic, "oy", "…while Oy is still Oy");
  // and the inflections the old substring rule got right still work
  assert.ok(_topicHits("clam", "clams") && _topicHits("sell", "selling") && _topicHits("son", "sons"));
  assert.ok(!_topicHits("oy", "boyfriend") && !_topicHits("dj", "adjust") && !_topicHits("ice", "notice"));
});

// "Lek laughing on cue beside him — the sort of scene you watch from across
// the bar" printed directly above "her whole evening visibly reorganises
// itself around your arrival".
test("the bar-bore is never draped with a girl who is yours (Howard F5)", () => {
  G.room = "lucky_tiger"; G.soc.drinks = { lek: 14 }; G.known.lek = true;
  G.soc.patronBusy.lucky_tiger = "lek";
  out = []; run("look");
  assert.doesNotMatch(text(), /Lek laughing on cue/, "your girl is not furniture");
});

// The morning-after ledger is a delta against a night-end snapshot; taken
// across the vacation reset it reported the reset itself.
test("the first morning of a new trip has no 'last night' (Howard F4)", () => {
  G.happy = 146; G.money = 5740; _nightSnapshot();
  flyHomeAndBack();
  assert.equal(G.lastNight, null, "the snapshot does not survive the flight");
});

// The last-bus dread does not apply from the pillion seat — that is the ride's
// whole design — and it printed between stops anyway.
test("the last-bus warning stays quiet on the back of her bike (Howard F11)", () => {
  G.nightTurn = LAST_BUS_TURN - 3; G.room = "beach_rd_c"; G.lastBusWarned = false;
  G.rideSeq = { id: "lek", fine: 0, spent: 0, stops: 2, sanuk: 0, seen: [] };
  out = []; _lastBusWarn();
  assert.equal(text(), "", "she's your ride");
  G.rideSeq = null; out = []; _lastBusWarn();
  assert.match(text(), /songthaew loops are thinning/, "…and on foot it still warns");
});

// The folio billed ฿400 of debt from an empty pocket, and the next line opened
// the room safe with ฿3,000 in it.
test("the act-one safe opens before the folio bills a man who just earned it (Howard F12)", () => {
  // Howard's real sequence: act one completed on walking in (the ฿3,000 is
  // then DUE, paid on the first time in the room), he slept, and the wake
  // billed the folio out of an empty pocket a line before the safe opened.
  G.stage = "vacation"; _setFlag("hasWallet"); G.act1SafeDue = true;
  G.money = 0; G.room = "hotel_room"; G.nightTurn = 40;
  out = []; _endNight("sleep");
  assert.equal(G.act1SafeDue, false, "the safe paid out at the wake");
  assert.ok(G.money > 0, "…and the money is in hand");
  assert.equal(G.hotelDebt || 0, 0, "so no debt was booked against the empty pocket first");
  const t = text();
  assert.ok(t.indexOf("3000") < t.indexOf("adds ฿") || t.indexOf("adds ฿") < 0,
    "the safe line comes before any folio line");
});

// The same three stops came round verbatim two nights apart, directly after
// "cannot step in same river".
test("the night ride remembers where it has taken you (Howard F8)", () => {
  G.money = 9000;
  const ride = () => { G.rideSeq = { id: "lek", fine: 0, spent: 0, stops: 0, sanuk: 0, seen: [] };
    G.pendingEnc = "nightride"; const ks = [];
    for (let i = 0; i < 3; i++) { _nightRide("ride on"); if (G.rideSeq) ks.push(G.rideSeq.seen.slice(-1)[0]); }
    G.pendingEnc = null; G.rideSeq = null; return ks; };
  const a = ride(), b = ride();
  assert.equal(a.filter(k => b.includes(k)).length, 0, "two nights, no repeated stop while the pool lasts");
});

// A coda that lands on ANY girl gave one with authored canon a hospital bill
// and a kid "she sees four times a year".
test("the LT coda invents no biography (Howard F10)", () => {
  for (const line of _CODA_HOME) assert.doesNotMatch(line, /hospital bill|four times a year/, "her facts are hers to tell");
});

// The volunteer-then-miss class: her desc has her beating two men at pool, she
// guesses your age, her plan names a shop and a cousin, the ledger a salary
// and a bonus — all missed.
test("Lek answers for what she volunteers (Howard F6)", () => {
  G.room = "lucky_tiger"; G.known.lek = true; G.soc.drinks = { lek: 14 };
  run("talk to lek");
  for (const [t, want] of [["pool", /Two year I play/], ["age", /Twenty-six/], ["shop", /my mother's house/],
    ["cousin", /Noi/], ["salary", /nine thousand/i], ["bonus", /little star/], ["sandals", /shoe is for walking/]]) {
    out = []; run("ask lek about " + t);
    assert.match(text(), want, "lek/" + t);
  }
});

// A single line at "your girl" tier was delivered identically nights five, six
// and seven.
test("her hello at a tier is not one line (Howard F15)", () => {
  G.room = "lucky_tiger"; G.known.lek = true; G.soc.drinks = { lek: 14 };
  const hello = d => { G.day = d; G.talked = {}; G.convo = null; out = []; run("talk to lek"); return text(); };
  assert.notEqual(hello(3), hello(4), "her-farang alternates");
  G.soc.drinks = { lek: 7 };
  assert.notEqual(hello(3), hello(4), "regular alternates");
});

// ── Declan: the safe-cracker rerun ──────────────────────────────────────────
// After round 34's hint fixes, a second man who won't bow STILL didn't find the
// route — at a different point. He walked Candy → Lek → Oy and never came back
// to Candy, because nothing says the way in runs through a woman you've already
// left behind; and at the office door, refused, he got a wall.

test("Candy's plain hello IS the errand once she knows Oy has it (Declan)", () => {
  G.stage = "act1"; G.flags = { knowWasHere: true, knowMot: true, knowOyHasIt: true }; G.money = 0;
  G.room = "candy_bar";
  out = []; run("talk to candy");
  assert.equal(G.itemLoc.som_tam, "inventory", "TALK alone hands over the box");
  assert.match(text(), /Oy said no|Ploy/, "…and names the door it opens");
  // and a man who hasn't reached Lek yet still gets her ordinary hello
  G.flags = { knowWasHere: true }; G.itemLoc.som_tam = "nowhere"; G.talked = {};
  out = []; run("talk to candy");
  assert.notEqual(G.itemLoc.som_tam, "inventory", "not before the world has told him Oy has it");
});

test("the guard on the office door leaks the song on a second try (Declan)", () => {
  G.stage = "act1"; G.flags = { knowMot: true, knowOyHasIt: true }; G.room = "rainbow_girls";
  out = []; run("go office");
  assert.doesNotMatch(text(), /Mamasan's song/, "first refusal is a wall — that's fine");
  out = []; run("go office");
  assert.match(text(), /Mamasan's song|Ask DJ/, "the second time, the bored man boasts");
  assert.equal(G.room, "rainbow_girls", "…and the door is still shut");
});

// The passthrough decline narrated a WAI on the player's behalf — for a man
// whose entire arc was refusing that gesture, then scored on manners.
test("the freelancer passthrough declines without a wai (Declan)", () => {
  G.room = "beach_rd_c"; _startEnc("freelancer");
  out = []; run("enter lucky tiger bar");
  assert.doesNotMatch(text(), /\bwai\b/i, "no gesture the player didn't choose");
  assert.equal(G.pendingEnc, null, "the offer lapses");
});

// DEMAND WALLET echoed "· You asked Madam Oy about demand wallet".
test("DEMAND is a voiced refusal, not an ASK in disguise (Declan)", () => {
  G.stage = "act1"; G.flags = { knowMot: true, knowOyHasIt: true }; G.room = "rainbow_girls"; G.known.oy = true;
  out = []; run("demand wallet");
  assert.doesNotMatch(text(), /asked .* about demand/, "no parser leak in the breadcrumb");
  assert.match(text(), /demand|order/i, "a voiced answer");
  // …and ORDER A BEER is still a purchase
  _setFlag("act1Done"); G.room = "lucky_tiger"; G.money = 500;
  run("order a beer");
  assert.equal(G.money, 500 - _beerPrice("lucky_tiger"), "ORDER <drink> buys");
});
