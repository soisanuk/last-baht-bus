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

// ── Stan: the lock-in regular, economy judge ────────────────────────────────

// BLOCKER. OUT / ROUND THE BACK paid +2 สนุก a cycle, uncapped — a free farm to
// the summit in fifty keystrokes — and re-admitted the same night against the
// printed "no coming back in tonight".
test("the alley door is not a สนุก farm and honours the one-way rule (Stan 1/11)", () => {
  G.day = 5; G.nightTurn = 70; G.lockedInAt = { khao_talo_bar: 3 }; G.room = "khao_talo";
  const h0 = G.happy;
  run("round the back"); const h1 = G.happy;
  assert.equal(G.room, "khao_talo_bar"); assert.equal(h1 - h0, 2, "the welcome pays once");
  run("out"); run("round the back");
  assert.equal(G.room, "khao_talo", "walked out tonight: the bolt stays");
  assert.equal(G.happy, h1, "…and nothing more is paid");
  // …and the next night the door knows him again
  G.nightTurn = 99; _endNight("dawn"); G.nightTurn = 70; G.room = "khao_talo";
  run("round the back");
  assert.equal(G.room, "khao_talo_bar", "tomorrow the welcome is back");
});

// ฿17,141 in the pocket at the airport became ฿3,000 a month later, unmentioned.
test("the pocket flies home with you (Stan 2)", () => {
  G.money = 17141; G.bank = 76400; G.day = 8;
  _endVacation(); G.pendingChoice = null; out = []; _newVacation();
  assert.equal(G.bank, 76400 + 17141, "into the account");
  assert.equal(G.money, SAFE_CASH, "the float in the safe, as before");
  assert.match(text(), /went into the account/, "…and it says so");
});

// "5 lady drink first" stood after the eighth drink and ฿1,520: the tariff is
// named in drinks and was measured in favor, which a lazy-drink girl credits
// at ~40%.
test("the Soi 6 drink tariff is measured in the unit it is quoted in (Stan 4)", () => {
  G.room = "sunset_dreams"; G.money = 5000; G.nightTurn = 40;
  assert.equal(_soi6DrinkMin("kwan"), 5, "premise: Kwan runs the policy");
  NPCS.kwan.type = "lazy";                 // the worst case: 40% credited
  G.soc.drinks.kwan = 3;
  for (let i = 0; i < 5; i++) run("buy drink for kwan");
  assert.equal(G.soc.drinkCount.kwan, 5, "five drinks bought, five counted");
  out = []; run("barfine kwan");
  assert.doesNotMatch(text(), /5 lady drink first/, "a met tariff is a met tariff");
  delete NPCS.kwan.type;
});

test("you cannot buy a ride to the kerb you are standing on (Stan 5)", () => {
  G.room = "khao_talo"; G.money = 2000;
  out = []; run("motosai to khao talo");
  assert.equal(G.money, 2000, "no fare taken");
  assert.match(text(), /Is here/, "the one free thing a piwin has ever done");
});

// The TRAVEL refusal quoted ฿50 to Walking Street; the bike charged ฿160.
test("the quoted motosai fare is the charged one (Stan 6)", () => {
  G.room = "khao_talo"; G.visited.neon_paradise = true; G.money = 5000; G.nightTurn = 85;
  out = []; run("travel neon paradise");   // a Walking Street bar; the refusal names the stop
  const quoted = +(text().match(/฿(\d+) at this hour/) || text().match(/฿(\d+)\)/) || [0, 0])[1];
  assert.ok(quoted > 0, "a fare is quoted: " + text().slice(0, 120));
  const before = G.money; G.dog = null;
  run("motosai to walking street");
  assert.equal(before - G.money, quoted, "…and it is what the piwin took");
});

test("the piwin doesn't claim the buses are gone (Stan 7)", () => {
  G.room = "khao_talo"; G.money = 5000; G.nightTurn = 85;
  out = []; run("motosai to walking street");
  assert.doesNotMatch(text(), /long tucked up/, "the buses run all night, sparse — that's the 2026-08-25 rework");
});

test("a room that claims cheaper beer charges cheaper beer (Stan 8)", () => {
  assert.match(ROOMS.water_buffalo.desc, /ten baht cheaper/, "premise: its own claim");
  assert.equal(_beerPrice("water_buffalo"), _beerPrice("khao_talo_bar") - 10, "the till agrees");
  assert.equal(_beerPrice("white_rabbit"), _beerPrice("naklua_bars") - 10);
});

// A mother and a seven-year-old with roses walked into a bolted after-hours bar.
test("the street does not reach inside a bolted door (Stan 10)", () => {
  G.room = "khao_talo_bar"; G.soc.lockIn = { khao_talo_bar: true }; G.encDone = {}; G.lastEnc = -999;
  for (let i = 0; i < 40; i++) { G.pendingEnc = null; _maybeEncounter(); assert.equal(G.pendingEnc, null, "nobody comes in"); }
});

test("the after-hours pointer names the door on this street (Stan 12)", () => {
  G.day = 5; G.nightTurn = 70; G.lockedInAt = { khao_talo_bar: 3, night_heron: 3 };
  G.room = "khao_talo_strip"; out = []; run("enter the water buffalo");
  assert.match(text(), new RegExp(_barName("night_heron")), "the Heron is on this stretch");
  assert.doesNotMatch(text(), new RegExp(_barName("khao_talo_bar")), "not the first bar you were ever locked in");
});

test("the night ledger counts the ATM fee (Stan 14)", () => {
  _setFlag("hasWallet"); G.money = 1000; G.bank = 20000;
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].atm); _nightSnapshot();
  run("withdraw 3000"); assert.ok(G.atmFees > 0, "premise: a withdrawal happened");
  G.money -= 50;
  out = []; _morningLedger();
  assert.match(text(), new RegExp("down ฿" + _num(50 + ATM_FEE)), "the fee left the account, but it was spent");
});

test("TIME keeps minutes (Stan 15)", () => {
  assert.equal(_clockStr(55), "23:30"); assert.equal(_clockStr(61), "00:06"); assert.equal(_clockStr(0), "18:00");
});

// STANDING's coaching says "stand a round", and a week of bells moved nothing.
test("a bell is a round, and rounds are deeds (Stan 16)", () => {
  G.room = "lucky_tiger"; G.money = 5000; G.rep = 0; G.repDay = 0; G.day = 3;
  run("ring bell");
  assert.ok(G.rep > 0, "the readout's own advice now counts");
});

test("Gary and Daeng answer for what Ron and the key put in your mouth (Stan 17)", () => {
  G.nightTurn = 20; G.room = _npcRoom("gary"); G.known.gary = true;
  out = []; run("ask gary about darkside"); assert.match(text(), /sums|noise stops/i);
  G.room = "khao_talo_bar"; G.known.daeng = true;
  out = []; run("ask daeng about bar"); assert.match(text(), /Twelve year|mine/);
  // a filler girl can be asked about the salary and quota the ledger reveals name
  G.room = "khao_talo_bar"; G.soc.drinks = { ying: 4 };
  out = []; run("ask ying about salary"); assert.match(text(), /small-small|the drink/i);
  out = []; run("ask ying about quota"); assert.match(text(), /number for the month/i);
});

test("no double possessive on a bar whose name ends in s (Stan 18)", () => {
  const bad = Object.keys(NPCS).filter(id => /'s's/.test(NPCS[id].desc || ""));
  assert.deepEqual(bad, [], "Mama Yai's' girls, not Mama Yai's's");
});

// "you have bought her two" — after eight.
test("the ledger beat counts her real drinks (Stan 19)", () => {
  G.room = "khao_talo_bar"; G.soc.drinks = { ying: 8 }; G.soc.drinkCount = { ying: 8 }; G.soc.ledger = { ying: [1] };
  assert.equal(_bondTier("ying"), 2);
  out = []; _otherLedger("ying");
  if (/Thirty drink a month/.test(text())) assert.match(text(), /bought her 8\b/, "her arithmetic is her arithmetic");
});

test("EXAMINE the bar you're standing in is the bar (Stan 20)", () => {
  G.room = "shamrock"; out = []; run("examine shamrock");
  assert.match(text(), /dead pub/i, "the room's own close look");
  G.room = "dolphin_bar"; out = []; run("examine dolphin");
  assert.match(text(), /house paint/, "…but a thing the bar is named after answers first");
});

test("HELP's hotel list is the checkout's (Stan 22)", () => {
  for (const k of Object.keys(_HOTELS)) assert.ok(_HELP.includes("฿" + _HOTELS[k].rate), _HOTELS[k].name + " is listed");
});

test("SEND to a woman standing next to you says so (Stan 24)", () => {
  G.room = "lucky_tiger"; G.money = 2000; G.phone.contacts = { lek: true }; G.soc.drinks = { lek: 4 };
  out = []; run("send 200 to lek");
  assert.doesNotMatch(text(), /crosses town/, "she is across the bar, not across town");
});

test("no cashier is named where the bar has none (Stan 25)", () => {
  G.room = "cheap_charlies_jt"; G.money = 10;
  out = []; run("buy beer");
  assert.doesNotMatch(text(), /cashier's calculator/, "the room has no cast");
});

// ── the lock-in's interior (Stan 9 → Mario's register) ──────────────────────
// Behind the bolt there was nothing: WAIT 15 inside a bolted door got the
// ordinary bar text back, and "the party runs while the money does" was never
// enforced. What's behind it now, all through the real _tick.

const bolt = () => { G.room = "khao_talo_bar"; G.money = 9000; G.nightTurn = 60;
  G.soc.bells = { khao_talo_bar: 1 }; _closingTick(); assert.ok(_lockedIn(), "premise: bolted"); };
const nights = (from, to, each) => { for (let t = from; t <= to && !G.over; t++) { G.nightTurn = t; out = []; (each || (() => run("wait 1")))(t); } };

test("the interior escalates by the stage the night has reached", () => {
  bolt();
  const seen = { loosen: 0, games: 0, dark: 0 };
  nights(61, 90, t => { run("wait 1");
    if (_LOCKIN_LOOSEN.some(l => text().includes(l.slice(0, 40)))) seen.loosen++;
    if (_LOCKIN_GAMES.some(l => text().includes(l.slice(0, 40)))) seen.games++;
    if (_LOCKIN_DARK.some(l => text().includes(l.slice(0, 40)))) seen.dark++;
    if (G.pendingEnc === "lockdare") run("keep my seat");
    if (t % 12 === 0) run("buy beer");                    // the till sees you
  });
  assert.ok(seen.loosen >= 1 && seen.games >= 1 && seen.dark >= 1, JSON.stringify(seen));
  assert.ok(_lockedIn(), "spending kept you inside");
});

test("the dare lands once, JOIN IN elides time and pays as company, keeping your seat is free", () => {
  bolt();
  nights(61, 73, () => { if (G.pendingEnc === "lockdare") return; run("wait 1"); });   // never feed the wait INTO the dare
  assert.equal(G.pendingEnc, "lockdare", "the dice come round to you");
  assert.ok(Array.isArray(G.encPrompt) && /JOIN IN/.test(G.encPrompt.map(l => l[0]).join(" ")), "prompt stashed for resume");
  // resume redraw works
  out = []; _renderResume(); assert.match(text(), /JOIN IN/, "a reload redraws the dare");
  const h0 = G.happy, j0 = G.jaded, t0 = G.nightTurn, b0 = G.soc.drinks.ying || 0;
  out = []; run("join in");
  assert.equal(G.pendingEnc, null);
  assert.ok(_LOCKIN_JOIN.some(l => text().includes(l.slice(0, 30))), "the paint keeps what it keeps");
  assert.ok(G.nightTurn > t0 + 3, "time was elided");
  assert.equal(G.happy - h0, 3, "company pays"); assert.equal(G.jaded, j0, "…and never jades");
  assert.ok((G.soc.drinks.ying || 0) > b0, "the girls in the room warm to you — earned, not bought");
  // never twice in a night
  nights(G.nightTurn + 1, 95, () => { run("wait 1"); assert.notEqual(G.pendingEnc, "lockdare", "one dare a night"); if (G.nightTurn % 12 === 0) run("buy beer"); });
  // and keeping your seat is voiced and costs nothing
  newGame(); _setFlag("act1Done"); for (const k in ENCOUNTERS) G.encDone[k] = true; bolt();
  nights(61, 73, () => { if (G.pendingEnc !== "lockdare") run("wait 1"); });
  const h1 = G.happy; out = []; run("keep my seat");
  assert.ok(_LOCKIN_DECLINE.some(l => text().includes(l.slice(0, 30)))); assert.equal(G.happy, h1);
});

test("the party runs while the money does — and walks you out when it doesn't", () => {
  bolt();
  let warned = false, walked = false;
  for (let t = 61; t <= 99 && !walked; t++) {                  // stop AT the walkout — ticking on to dawn resets the night
    G.thirst = 20; G.hunger = 20; G.nightTurn = t; out = [];    // the body is not the subject here — the till is
    run("wait 1"); if (G.pendingEnc === "lockdare") run("keep my seat");
    if (_LOCKIN_ROUND.some(f => text().includes(f("Daeng").slice(0, 30)))) warned = true;
    if (!_lockedIn() && G.room !== "khao_talo_bar") walked = true;
  }
  assert.ok(warned, "the temperature drops first");
  assert.ok(walked, "…then she walks you out, the same courtesy as midnight");
  assert.ok(G.soc.leftLockIn.khao_talo_bar, "and the bolt stays shut to you tonight");
});

test("the coda: the last punter leaves, and the room turns back into a workplace", () => {
  bolt();
  let coda = 0, after = 0;
  nights(61, 99, t => { G.thirst = 20; G.hunger = 20; run("wait 1"); if (G.pendingEnc === "lockdare") run("keep my seat"); if (t % 10 === 0) run("buy beer");
    if (_LOCKIN_CODA.some(l => text().includes(l.slice(0, 30)))) coda++;
    else if (coda && (_LOCKIN_DARK.concat(_LOCKIN_GAMES).some(l => text().includes(l.slice(0, 30))))) after++; });
  assert.equal(coda, 1, "once, near dawn");
  assert.equal(after, 0, "and no party vignette after the party is over");
});

test("nothing prints behind an unbolted door, and the dread stays outside a bolted one", () => {
  G.room = "khao_talo_bar"; G.nightTurn = 30; out = []; _lockInTick();
  assert.equal(text(), "", "the interior belongs to the lock-in only");
  bolt(); G.nightTurn = LAST_BUS_TURN - 3; G.lastBusWarned = false; out = []; _lastBusWarn();
  assert.equal(text(), "", "no last-bus warning inside a party that runs till dawn");
});

test("the register stays PG-13 — the narrator never looks directly", () => {
  const all = [..._LOCKIN_LOOSEN, ..._LOCKIN_GAMES, ..._LOCKIN_DARK, ..._LOCKIN_JOIN, ..._LOCKIN_CODA,
    ..._LOCKIN_DARE.map(f => f("X")), ..._LOCKIN_DECLINE];
  for (const l of all) assert.doesNotMatch(l, /\b(naked|nude|fuck|cock|tits|pussy|blowjob|orgasm)\b/i, l.slice(0, 50));
  assert.ok(all.length >= 25, "deep pools — a lock-in is a repeatable night");
});
