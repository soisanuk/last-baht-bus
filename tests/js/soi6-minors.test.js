// Regression tests for the second-shakedown minors batch (2026-08-04): off-map
// prose staying in-pocket in soi6 mode, bus/travel/nav messaging accuracy, the
// sponsor-flip dialogue polish, and the bar-social niceties. Each test pins the
// exact behaviour a finding reported broken, so the fixes can't quietly regress.
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
engineInit(t => out.push(t), null, () => {});
const REAL_RAND = globalThis._rand;
const S = () => G;
const last = () => out.join("\n");
beforeEach(() => {
  out = []; newGame(); globalThis._rand = REAL_RAND;
  S().stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  S().lastSaleng = 99999; S().lastPeddler = 99999;
  for (const id of Object.keys(ENCOUNTERS)) S().encDone[id] = true;
});

// ── bar-social ───────────────────────────────────────────────────────────────

test("bell ring count resets once the glow lapses (no stale level-3 restore)", () => {
  S().room = "stinky_bar"; S().money = 99999;
  doCommand("ring bell"); doCommand("ring bell"); doCommand("ring bell");
  assert.equal(_bellLevel(), 3, "three quick rings escalate to level 3");
  S().turns += 30;                          // BELL_GLOW (25) lapses
  assert.equal(_bellLevel(), 0, "cooled glow reads level 0");
  doCommand("ring bell");
  assert.equal(S().soc.bells.stinky_bar, 1, "a later lone ring restarts the count");
  assert.equal(_bellLevel(), 1, "…and buys level 1, not a stale level 4");
});

test("midnight inside the Orchid Room ejects past closed Pink Lotus to the street", () => {
  S().room = "orchid_room"; S().nightTurn = 60;
  _closingTick();
  assert.equal(S().room, "soi6_street", "the eject chain lands somewhere actually open");
});

test("a named male regular gets the beer you buy him — you don't drink it for him", () => {
  S().room = "queen_vic"; S().money = 1000;
  const drunk0 = S().soc.drunk;
  doCommand("buy terry a beer");
  // against the POOL, not one string — the line was a fixed sentence until
  // round 19, which is how every man in the bar came to repay a drink with
  // Terry's own anecdote
  assert.ok(_STAND_BEER.some(t => last().includes(_fmt(t, { who: "Terry", drink: "a cold one" }))),
    "the bottle goes down the bar, in one of the pooled ways");
  assert.equal(S().soc.drunk, drunk0, "your own drunk counter doesn't move");
  out = [];
  doCommand("buy drink for terry");
  assert.match(last(), /Terry/, "the drink phrasing routes to him too");
  assert.doesNotMatch(last(), /not working this bar/i);
});

test("standing a drink is a bar-rail gesture — a street/massage name never routes there", () => {
  S().room = "jomtien_soi_7_beach_end"; S().money = 1000;   // Auntie Nok's mango cart, not a bar
  doCommand("buy drink for nok");
  assert.doesNotMatch(last(), /stand .* a Chang|slides down the bar/i,
    "no rail to slide a Chang down out here");
});

test("BUY autocomplete only offers what the room sells", () => {
  S().room = "ruby_kiss"; S().mode = "soi6";       // a Soi 6 bar: no toastie/food/charger
  let pool = _completePool("buy", ["buy"]);
  for (const item of ["toastie", "food", "charger"])
    assert.ok(!pool.includes(item), `soi6 bar must not suggest "${item}"`);
  S().mode = null; S().room = "jomtien_2nd";       // a 7-Eleven street room: full set
  pool = _completePool("buy", ["buy"]);
  for (const item of ["toastie", "charger", "condom"])
    assert.ok(pool.includes(item), `seven room should suggest "${item}"`);
});

// ── bus / travel / nav ───────────────────────────────────────────────────────

test("RIDE BUS refusals describe the real situation, in the right order", () => {
  S().mode = "soi6";
  S().room = "pink_lotus";                          // indoors: no songthaew narration
  doCommand("ride bus");
  assert.match(last(), /No blue trucks come down here/); // hail-anywhere: off-route, not "no stop"
  assert.doesNotMatch(last(), /songthaew slows/);
  out = []; S().room = "beach_rd_n"; S().nightTurn = 82;  // the frame beats the hour
  doCommand("ride bus");
  // curfew rework (2026-08-25): there is no depot any more — in soi6 mode the
  // frame refusal answers at ANY hour, before the small-hours wait can charge
  // a challenge player ticks for a ride the mode won't allow
  assert.match(last(), /wave it on|aren't yours this week/);
  assert.doesNotMatch(last(), /\(MOTOSAI/, "no MOTOSAI ad at a stop with no stand");
  out = []; S().nightTurn = 30;                     // pre-curfew at a pocket stop
  doCommand("ride bus");
  assert.match(last(), /routes out of here aren't yours/);
});

test("the bus-stop room hint tracks bus availability", () => {
  S().room = "beach_rd_c"; S().nightTurn = 82;
  _describeRoom(true);
  assert.match(last(), /bench sits empty/);
  assert.doesNotMatch(last(), /can be caught here/);
  out = []; S().nightTurn = 30;
  _describeRoom(true);
  assert.match(last(), /can be caught here/);
});

test("TRAVEL disambiguates the Queen Vic pub from your same-named room", () => {
  S().hotel = "queenvic";
  S().visited = { queen_vic: true };
  S().room = "north_beach";
  doCommand("travel queen vic inn");
  assert.match(last(), /point yourself at Queen Vic Inn/, "the PUB wins the name match");
  out = []; S().room = "north_beach";
  doCommand("travel home");
  assert.equal(S().room, "qv_room", "the home keyword still routes upstairs");
  out = [];
  doCommand("travel home");
  assert.match(last(), /standing in it/i, "no zero-hop self-trip from your own room");
});

test("bare TRAVEL at a walk-dead-end suppresses the empty header", () => {
  // the crossing walks west now (Darren, round 37), so the empty list comes from
  // having visited nowhere, not from a fence
  // the crossing walks west now (Darren, round 37) and the hotel is always on
  // the list — the one empty case left is standing in that hotel room with
  // nowhere else discovered
  S().room = _hotelRoomId(); S().visited = {};
  doCommand("travel");
  assert.doesNotMatch(last(), /You know the way to:/);
});

test("GO <bar> fronting this block enters first-try, like ENTER", () => {
  S().mode = "soi6"; S().room = "soi6_street"; S().visited = {};
  doCommand("go pink lotus");
  assert.equal(S().room, "pink_lotus", "unvisited but adjacent: walk in");
});

// ── off-map prose in soi6 mode ───────────────────────────────────────────────

test("soi6-mode closed-bar and hospital prose stay in-pocket", () => {
  S().mode = "soi6";
  assert.doesNotMatch(_closedMsg("pink_lotus"), /Walking Street/);
  out = []; S().hospitalVisits = 0;
  _hospitalMorning("hurt");
  assert.doesNotMatch(last(), /Soi Buakhao|Candy Bar/);
  S().mode = null; out = []; S().hospitalVisits = 0;
  _hospitalMorning("hurt");
  assert.match(last(), /Soi Buakhao/, "full game keeps the original ward");
});

test("collapsing in your own room reads as your own bed, not a som tam cart", () => {
  S().room = _hotelRoomId(); S().hunger = 100; S().thirst = 0;
  _endNight("collapse");
  assert.match(last(), /your own (room|mattress|bed)/);
  assert.doesNotMatch(last(), /som tam cart/);
});

test("soi6 mode drops the Walking Street ride venue and folds wsparty into barhop", () => {
  S().mode = "soi6";
  for (let i = 0; i < 60; i++)
    assert.notEqual(_pickRideVenue([]).key, "wsclub", "no fenced superclub on her route");
  const shark = Object.keys(NPCS).find(id =>
    NPC_ROLES[id] === "hostess" && !NPCS[id].type && _bfShark(id));
  assert.ok(shark, "a hash shark exists to test with");
  let seq;
  globalThis._rand = () => seq.shift() ?? 0.5;
  seq = [0.1, 0.95];                                // pass the scam gate, land the wsparty tail
  assert.equal(_bfScamRoll(shark, false), "barhop", "soi6: the party folds into the hop");
  S().mode = null; seq = [0.1, 0.95];
  assert.equal(_bfScamRoll(shark, false), "wsparty", "full game: same dice, the WS party");
});

// ── sponsor-flip dialogue ────────────────────────────────────────────────────

test("topic aliases mirror the sponsor girls without stealing literal keys", () => {
  S().room = "pink_lotus";
  doCommand("ask jenny about boyfriend");
  assert.match(last(), /Klaus/, "Jenny answers the other girl's word");
  out = []; S().room = "kitten_corner";
  doCommand("ask baimon about sponsor");
  assert.match(last(), /Dave/, "Baimon answers the canonical key");
  out = []; S().room = "cherry_pop";
  doCommand("ask mercedes about german");
  assert.match(last(), /Munich/, "a literal node keyed on a synonym word still wins");
});

test("the flip changes her greeting, buys honesty, and survives the drip crossing", () => {
  S().soc.given = { jenny: 16000 };
  S().room = "pink_lotus";
  doCommand("talk to jenny");
  assert.match(last(), /ring in my bag/, "post-flip greeting, not 'I am spoken for'");
  assert.doesNotMatch(last(), /I am spoken for/);
  assert.equal(_bfExploitable("jenny"), false, "a just-flipped girl doesn't run the scam");
  // one SEND that crosses both the ฿14k climax frame and the ฿15k flip
  S().soc.given = { jenny: 13500 }; S().soc.sponsorPix = { jenny: 2 };
  S().phone.contacts = { jenny: true }; S().money = 5000; out = [];
  doCommand("send 2000 to jenny");
  const texts = S().phone.inbox.map(m => m.text || m.photo).join("\n");
  assert.match(texts, /just for you/, "the ฿14k frame still goes out");
  assert.match(texts, /come see me na/, "…and the flip line isn't swallowed by it");
});
