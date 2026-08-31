// Round 33 — the two Fable personas: Col (cold first-timer, verifying the new
// Auntie Nok opening) and Wes (the far side, cross-checking every claim he was
// told). One test per finding, so none of them can come back.
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

beforeEach(() => {
  out = []; newGame();
  G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  G.lastSaleng = 99999; G.lastPeddler = 99999; G.lastPolice = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
});

// ── Col: the opening's own tutorial line has to work ──

test("EXAMINE POCKETS turns out your pockets — the opening tells you to (Col)", () => {
  // "(EXAMINE what's in your pockets…)" is the first instruction the game
  // gives, and a literal-minded first-timer typed exactly that and got
  // "Nothing special about that — or it isn't here." The working verb was
  // buried in an ~80-line HELP.
  out = []; run("examine pockets");
  assert.match(text(), /You are carrying/, "pockets are your inventory");
  assert.doesNotMatch(text(), /isn't here|Nothing special/i);
  // …and the opening really does still say it, so this can't rot apart
  const nok = NPCS.nok.dialogue.find(d => /sleep on beach like soi dog/.test(d.text || ""));
  assert.match(nok.text, /EXAMINE what's in your pockets/, "the hint the fix exists for");
});

// ── Wes: the far side's claims, checked ──

test("a word that is exactly somebody's name never resolves to a coincidence (Wes)", () => {
  // ASK TAN ABOUT <person> is the stuck nudge's own printed hint, and in any
  // bar holding a girl with "tan" inside her name it was silently answered by
  // her: "tan" ⊂ Ra-TAN-a (substring), TAN-gmo (prefix), Nam-TAN.
  G.room = "lucky_tiger";
  assert.ok(_npcsHere().includes("ratana"), "premise: Ratana is here");
  assert.ok(!_npcsHere().includes("tan"), "premise: Tan is not");
  assert.equal(_findNpc("tan"), null, "his name is not hers");
  // she still answers to her own name, and to a real prefix of it
  assert.equal(_findNpc("ratana"), "ratana");
  assert.equal(_findNpc("ratan"), "ratana");
  // and where Tan IS, he is found
  G.room = _npcRoom("tan");
  assert.equal(_findNpc("tan"), "tan");
  // the useful answer: a named absentee gets placed, not brushed off
  G.room = "lucky_tiger"; G.known.tan = true; _setFlag("act1Done");
  out = []; run("ask tan about nigel");
  assert.match(text(), /Tan isn't at this bar/, "the elsewhere-router takes it");
});

test("last call knows what kind of room it is in (Wes)", () => {
  _setFlag("act1Done"); G.nightTurn = 55;
  // The Boathouse: a family fish restaurant, barType pub, no hostesses. It had
  // a mamasan it does not employ tap her watch and pitch a BARFINE — in the
  // room the game's own prose calls "the most respectable for miles".
  G.room = "lake_bar";
  assert.ok(!_npcsHere().some(n => NPC_ROLES[n] === "hostess"), "premise: nobody to barfine");
  out = []; _lastCall("lake_bar");
  assert.doesNotMatch(text(), /BARFINE|mamasan|take a lady home/i, "no sell where there is nothing to sell");
  assert.match(text(), /chairs start going up|shuts at midnight/i, "just the closing courtesy");
  // a real go-go still gets the pitch, and names whoever actually says it
  newGame(); _setFlag("act1Done"); G.nightTurn = 55; G.room = "pink_lotus";
  out = []; _lastCall("pink_lotus");
  assert.match(text(), /BARFINE/, "the sell survives where it belongs");
  const mama = _npcsHere().find(n => NPC_ROLES[n] === "mamasan");
  if (mama) assert.match(text(), new RegExp(NPCS[mama].name), "…and she is named, not generic");
});

test("a new question answered by an old line is not an accusation (Wes)", () => {
  // Lake Gary's greeting volunteers the Midnight Sun; asking him about it —
  // first time ever — answered "You asked me that one. Same answer. Memory
  // like a sieve, this town." The self-named-node path delivered his
  // already-spoken greeting through the terse-repeat brush-off.
  _setFlag("act1Done"); G.room = _npcRoom("gary");
  run("talk to gary");
  out = []; run("ask gary about midnight sun");
  assert.doesNotMatch(text(), /asked me that|Already told you|Same answer/i, "he was asked something new");
  assert.match(text(), /Midnight Sun/, "and the answer contains the thing asked about");
  // a genuine repeat is still terse — the brush-off isn't gone, just aimed
  // right. Assert against the POOL, not one of its lines: _pickVary rotates
  // them, so a single-string match is a coin flip (the house rule, and I broke
  // it writing this test).
  out = []; run("talk to gary"); out = []; run("talk to gary");
  assert.ok(_ASK_AGAIN_EN.some(f => text().includes(f("Lake Gary"))),
    "repeats still get the brush-off, whichever line comes up");
});

test("the Sundowner's fridge is the fridge its own description leads with (Wes)", () => {
  _setFlag("act1Done"); G.room = "lake_beer";
  assert.match(ROOMS.lake_beer.desc, /fridge/, "premise: the room opens with it");
  out = []; run("examine fridge");
  assert.doesNotMatch(text(), /No fridge out here/, "the hotel minibar line has no business here");
  assert.match(text(), /snapshots|magnets|tea|stand/i, "it reaches the room's own photos");
  // …and the hotel mini-bar still answers in a hotel room
  newGame(); _setFlag("act1Done"); G.room = "hotel_room";
  out = []; run("examine fridge");
  assert.match(text(), /mini-fridge|bottles? of water/i);
});

test("Boonsri can discuss the photo Neil says she put up (Wes)", () => {
  // Neil's `photo` node: "That one on Boonsri's fridge? Hers. She stuck it up
  // years back" — and she answered "that one I don't know, na", being a filler
  // mamasan. The game named her as the custodian of the object.
  const neil = NPCS.neil.dialogue.find(d => d.topic === "photo");
  assert.match(neil.text, /Boonsri's fridge\? Hers/, "premise: he names her");
  _setFlag("act1Done"); G.room = "lake_beer";
  run("talk to boonsri");
  out = []; run("ask boonsri about photo");
  assert.doesNotMatch(text(), /don't know about that|wrong girl|Not my story/i, "she owns the fridge");
  assert.match(text(), /Is mine|nineteen year/i, "…and it is her angle, not a retell of his");
  // her generated dialogue is untouched by the patch
  out = []; run("ask boonsri about plan");
  assert.match(text(), /bar honest|girls safe/i, "the filler build still works");
});

test("the lake stops claiming it is open once it shuts (Wes)", () => {
  // The street printed families under string lights and "THE BOATHOUSE… is
  // open for the fish" at 00:24, immediately before ENTER answered "Shutters
  // down". Every other after-hours street on this side has a lateDesc.
  assert.ok(ROOMS.lake_mabprachan.lateDesc, "the room has a night face");
  // it may still MENTION the string lights — saying they're off is the point —
  // but it must not repeat the claim the player can immediately disprove
  assert.doesNotMatch(ROOMS.lake_mabprachan.lateDesc, /open for the fish/,
    "it must not say the Boathouse is open after the Boathouse has shut");
  assert.match(ROOMS.lake_mabprachan.lateDesc, /chairs are up|cold|off\b/i,
    "it reads as the shut version of the street");
  // the examine text no longer makes a schedule claim the game can't keep
  assert.doesNotMatch(ROOMS.lake_bar.reads.photos, /closes early/,
    "it shuts at midnight with every other Darkside room");
});

// ── Mario's call: the soi runs its own shuttle ──

test("Soi Buakhao has the baht buses its own prose describes (Col + Mario)", () => {
  _setFlag("act1Done"); G.money = 500; G.room = "buakhao_n"; G.nightTurn = 10;
  out = []; run("ride bus");
  assert.doesNotMatch(text(), /No blue trucks come down here/, "the street stages them; the mechanic honours it");
  assert.match(text(), /drop you/, "it offers stops");
  // …and only its own: every stop on the list is on the soi
  const offered = BUS_LINES.buakhao;
  assert.ok(offered.every(id => /^buakhao_/.test(id)), "the shuttle runs the soi and nothing else");
  assert.ok(!offered.includes("buakhao_oil"), "the massage shop is off the road, not a stop");
  // a stop on the soi is the ordinary bench fare
  out = []; run("ride bus to pattaya tai");
  assert.equal(G.pendingFare.price, BUS_FARE, "bench seat, bench price");
  assert.ok(/^buakhao_/.test(G.pendingFare.dest));
});

test("off the soi you negotiate, and the price is the whole truck (Mario)", () => {
  _setFlag("act1Done"); G.money = 500; G.room = "buakhao_n"; G.nightTurn = 10;
  out = []; run("ride bus to naklua");
  assert.match(text(), /Not my route|take you special/i, "he leaves the route for a price");
  assert.equal(G.pendingFare.price, BUS_CHARTER, "charter, not fare");
  assert.ok(BUS_CHARTER > BUS_FARE * 5, "renting a truck is not a bench seat");
  const dest = G.pendingFare.dest;
  out = []; run("pay " + BUS_CHARTER);
  assert.equal(G.room, dest, "and paying it actually takes you there");

  // broke: he still names the number, and points at the free way out
  newGame(); _setFlag("act1Done"); G.money = 40; G.room = "buakhao_n"; G.nightTurn = 10;
  out = []; run("ride bus to naklua");
  assert.match(text(), /Ride to either end and walk/i, "the cheap route is stated");
  assert.equal(G.pendingFare, null, "nothing owing");

  // the charter is a Buakhao rule — the Jomtien local still refuses flatly,
  // which is its own pinned behaviour (persona B#13)
  newGame(); _setFlag("act1Done"); G.money = 500; G.room = "jomtien_beach_rd"; G.nightTurn = 10;
  out = []; run("ride bus to naklua");
  assert.match(text(), /shakes his head|not this route/i);
  assert.equal(G.pendingFare, null, "no charter where none was designed");
});

test("the Buakhao shuttle is never spliced into the town circuit", () => {
  // _busLinesFor completes the loop for beachrd/secondrd; the local must not
  // inherit that and quietly become a way across town for ฿15.
  G.room = "buakhao_n";
  const lines = _busLinesFor("buakhao_n");
  assert.deepEqual(lines, ["buakhao"], "one line, its own");
  const reachable = [...new Set(lines.flatMap(l => BUS_LINES[l]))];
  assert.ok(reachable.every(id => /^buakhao_/.test(id)), "and it reaches nowhere else");
  // both ends still touch a main road on foot, which is the honest cheap route
  assert.equal(ROOMS.buakhao_pt.exits.w, "pattaya_tai");
  assert.equal(ROOMS.buakhao_klang.exits.w, "pattaya_klang");
});

// ── Yuki (Opus, economy): the free-flirt economy, braked two ways ──

test("charm tapers across the RAIL — breadth pays less, depth does not (Yuki)", () => {
  // Measured: 40 bells at ฿15,200 paid +39 สนุก, then five flirts paid +15 for
  // ฿0 in the same room five turns later. The once-per-girl cap closed the
  // per-turn fountain and left the per-girl one open; with ~230 staff that is
  // still worth more than every priced source combined (สบายสบาย on day 4 of 7,
  // no money spent). The brake is on BREADTH — working one or two girls is
  // untouched, working the whole floor is not.
  _setFlag("act1Done"); G.room = "rainbow_girls"; G.money = 9000;
  const girls = _npcsHere().filter(i => NPC_ROLES[i] === "hostess");
  assert.ok(girls.length >= 4, "premise: a floor worth working");
  girls.forEach(g => { G.soc.drinks[g] = 6; });
  const paid = [];
  for (const g of girls) { const h = G.happy; run("flirt " + NPCS[g].name); paid.push(G.happy - h); }
  assert.ok(paid[0] >= 2, "the first connection of the night pays properly");
  assert.ok(paid[paid.length - 1] < paid[0], "…and the last one does not");
  assert.ok(paid.every((v, i) => i === 0 || v <= paid[i - 1]), "monotonically down the rail");
  // depth is explicitly NOT taxed: a fresh night restores the full rate
  G.nightTurn = 99; _endNight("dawn");
  assert.equal(G.soc.charmedN, 0, "the taper resets nightly");
});

test("a girl worked too hard gets annoyed, and it costs (Mario's call, round 33)", () => {
  _setFlag("act1Done"); G.room = "lucky_tiger"; G.money = 5000; G.soc.drinks.lek = 6;
  out = []; run("flirt lek");                       // 1: the spark
  assert.ok(G.happy > 0, "the first one pays");
  run("flirt lek");                                  // 2: escalates to a kiss
  out = []; run("flirt lek");                        // 3: cooling
  assert.ok(_FLIRT_AGAIN.some(f => text().includes(f("Lek"))), "she clocks the repetition");
  const beforeHappy = G.happy, beforeBond = G.soc.drinks.lek;
  run("flirt lek");                                  // 4
  out = []; run("flirt lek");                        // 5: enough
  assert.ok(_FLIRT_ANNOY.some(f => text().includes(f("Lek"))), "and then she's had enough");
  assert.ok(G.happy < beforeHappy, "it costs สนุก");
  assert.ok(G.soc.drinks.lek < beforeBond, "…and her patience with you");
  // …and the room eventually notices a man who won't take the hint
  const heat0 = G.soc.heat.lucky_tiger || 0;
  run("flirt lek", "flirt lek", "flirt lek");
  assert.ok((G.soc.heat.lucky_tiger || 0) > heat0, "the bar's own physics take over");
  // none of it outlives the night
  G.nightTurn = 99; _endNight("dawn");
  assert.deepEqual(G.soc.tries, {}, "tomorrow she has forgotten");
});
