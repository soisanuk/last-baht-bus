// THE ENGINE PROSE PASS (2026-11-01/02, docs/engine-prose-2026-11.md): every `_say` literal and
// engine-file pool read by seven readers who had the batch and the context sheet and no source,
// their findings verified at the site, and the classes fixed pinned here AGAINST POOLS AND BODIES,
// never one string. The classes: a mamasan saying tilac (the floor's word, never hers), a price
// typed in digits beside its constant, an hour the engine did not compute, British idiom in an
// American's quoted speech, beer-bar furniture in a line a go-go can print, a fixed string that
// prints nightly, a moral grade, and two records that disagreed about one fact.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SRC = {};
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"]) {
  SRC[f] = readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8");
  vm.runInThisContext(SRC[f], { filename: f + ".js" });
}
let out = [];
engineInit(t => out.push(String(t)));
const said = () => out.join("\n");
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation";
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.lastSaleng = 1e9; G.lastPeddler = 1e9; G.money = 5000; out = [];
};
beforeEach(sandbox);

// brace-matched body of a top-level function, from whichever engine file declares it
function body(name) {
  for (const f of Object.keys(SRC)) {
    const s = SRC[f], m = new RegExp("^function\\s+" + name + "\\s*\\(", "m").exec(s);
    if (!m) continue;
    let d = 0, j = s.indexOf("{", m.index);
    for (; j < s.length; j++) { if (s[j] === "{") d++; else if (s[j] === "}" && !--d) { j++; break; } }
    return s.slice(m.index, j);
  }
  throw new Error("no function " + name);
}
// a pool's lines as text, whether strings or functions
const lines = pool => (Array.isArray(pool) ? pool : Object.values(pool).flat()).map(l => typeof l === "function" ? String(l) : String(l));
const QUOTED = /[“"][^”"]*[”"]/g;
const speech = s => (s.match(QUOTED) || []).join(" ");

// ── tilac: the floor's word, never the mamasan's ─────────────────────────────
test("a mamasan never says tilac: the pools and bodies where she is the one talking carry none", () => {
  for (const [name, pool] of Object.entries({ _GOGO_UPSTAIRS, _PEACOCK_NO_BF, _LOCKIN_WALKOUT, _NURSE_BAR, _SEAT_LINES }))
    for (const l of lines(pool)) assert.doesNotMatch(l, /tilac/i, name);
  // the Thai repeat-ask pool is dealt to a mamasan too, so it keeps to "na"
  for (const l of lines(_ASK_AGAIN)) assert.doesNotMatch(l, /tilac/i, "_ASK_AGAIN");
  for (const fn of ["_doComplain", "_soapyResolve", "_barLost", "_doEat"]) assert.doesNotMatch(body(fn), /tilac/i, fn);
  // the barfine desk: the lines the mamasan says ("my girl", "the mamasan counts") are hers; a girl's "cannot tonight, tilac" stays
  assert.doesNotMatch(body("_doBarfine"), /midnight, tilac|Two is party, tilac|company tonight already, tilac|Not tonight, tilac\.” The finger/);
  assert.doesNotMatch(body("_bfResolve"), /Two is party, tilac|company tonight already, tilac/);
});

test("the narrator does not borrow the floor's word either: the no-bar refusal is a pool in his own voice", () => {
  assert.ok(_NO_DRINKS_HERE.length >= 3);
  for (const l of _NO_DRINKS_HERE) assert.doesNotMatch(l, /tilac/i);
  G.room = Object.keys(ROOMS).find(r => !ROOMS[r].barType && !ROOMS[r].seven && !ROOMS[r].venues && !ROOMS[r].hotel && !ROOMS[r].massage && !ROOMS[r].motosai && !FOOD_STALLS[r] && !ROOMS[r].soapy && !ROOMS[r].hostBar);
  out = []; doCommand("buy lady drink");
  assert.ok(_NO_DRINKS_HERE.some(l => said().includes(l)), "the real BUY path deals from the pool: " + said());
});

// ── digits: a price is read, never typed ─────────────────────────────────────
test("prices that have a constant read it: the killer-pool beer, the ashtray, the quiz prize, the 7-Eleven water, the Soi 6 room, the week's stake", () => {
  assert.ok(_FOLK_KPFIELD_LOST.some(l => l.includes("฿" + _num(BEER_PRICE))) && !_FOLK_KPFIELD_LOST.some(l => /฿100\b/.test(l)), "the loser's beer costs what a beer costs");
  assert.ok(_OWL_LISTINGS.some(l => l.includes("฿" + _num(KP_ENTRY) + " in the ashtray")), "the Owl's listing reads KP_ENTRY");
  assert.ok(_OWL_LISTINGS.some(l => l.includes("Five right buys ฿" + _num(QUIZ_PRIZE))), "…and QUIZ_PRIZE");
  assert.ok(_JOKE_TEXTS.some(l => l.includes("IS ONLY " + _num(BF_SOI6))), "the joke text names the real room fee");
  assert.match(SRC["engine-play"], /Water is ฿" \+ _num\(SEVEN_WATER\)/, "the debrief's water is SEVEN_WATER");
  for (const [fn, re] of [["_tableHint", /KP_ENTRY/], ["_endVacation", /SOI6_BANK/], ["_tanBasics", /SEVEN_WATER/], ["_taxiAsk", /CLUB_TAXI/]])
    assert.match(body(fn), re, fn + " reads its constant");
  assert.match(SRC["engine-parser"], /does it for ฿" \+ _num\(NONT_CHARGE\)/, "the kid at the table charges NONT_CHARGE");
  assert.ok(_TAN_WAIT_LINES.some(l => l.includes(BUS_FARE + " baht, same as ever")), "Tan's fare is BUS_FARE");
});

// ── the clock: an hour the engine did not compute is not asserted ────────────
test("'it is nearly six' was a guess: the too-late refusal prints the computed clock", () => {
  G.room = "stinky_bar"; G.nightTurn = 112; out = [];
  assert.equal(_tooLateFor(10, "A massage"), true);
  assert.match(said(), new RegExp(_clockStr(112).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(said(), /nearly six/);
});
test("pooled small talk and owner greetings no longer name the month, the weekday or the hour as now", () => {
  for (const l of lines(_SMALL_TALK)) assert.doesNotMatch(l, /Is October|even when is Tuesday|for a Tuesday|too early to know/, l.slice(0, 60));
  for (const l of lines(_OWNER_GREET)) assert.doesNotMatch(l, /Quiet start|Slow hour now|Busy soon/, l.slice(0, 60));
  assert.doesNotMatch(body("_lastNightHers"), /two o'clock|four in the morning|Three o'clock, beach/);
  for (const l of lines(_RIDE_STOP_MEMORY)) assert.doesNotMatch(l, /two in the morning/);
  for (const l of lines(_WORK_MISSED)) assert.doesNotMatch(l, /two in the morning/);
  assert.doesNotMatch(body("_streetTalk"), /October/, "the rain is the season's, not a month's");
});

// ── voice: an American's quoted speech carries no British marker ─────────────
test("Bert's lease, deposit and arrears speeches, and Nont's and Eddy's texts, are American in the quotes", () => {
  for (const fn of ["_barDeposit", "_leaseAsk"]) assert.doesNotMatch(speech(body(fn)), _BRIT_SPEECH, fn);
  for (const l of lines(_ARREARS_WARN)) assert.doesNotMatch(speech(l), _BRIT_SPEECH, "_ARREARS_WARN");
  assert.doesNotMatch(body("_ccibVisit"), /That's me gone/);
  assert.doesNotMatch(body("_endNight"), /“sorted\.”/);
  assert.doesNotMatch(body("_doApologize"), /Forget it, mate/);
  for (const l of lines(_ORCHID_DEFLECT)) assert.doesNotMatch(l, /\bMate\b/, "Vasseur is French");
});

// ── furniture: a line a go-go can print names no stool, rail or bar ──────────
test("the go-go filter knows a bar's edge and a counter, and the bare literals a go-go reaches lost their stools", () => {
  for (const s of ["the cap popped off against the edge of the bar", "a drum-roll on the counter", "down the length of the bar"]) assert.match(s, _FIT_GOGO, s);
  for (const l of lines(_BELL_GOGO)) assert.doesNotMatch(l, /the counter|length of the bar/, "_BELL_GOGO");
  assert.doesNotMatch(body("_doThrowCover"), /end of the " \+\s*"bar/);
  assert.match(body("_bfRefusalSay"), /_seat\(\) \+ " beside you is simply empty/);
  for (const fn of ["_partyTalk", "_lastNightHers", "_seenHomeTalk"]) assert.doesNotMatch(body(fn), /at the bar top/, fn + " reads _ledge()");
  assert.doesNotMatch(body("_doBorrow"), /Nira taps the bar/);
  assert.ok(_BEER_LINES.length >= 8, "the commonest purchase in the game deals from a deeper pool");
});

// ── fixed strings that print nightly are pools ───────────────────────────────
test("the Soi 6 shutters, the thank-you aphorism and the no-bar refusal are dealt, not fixed", () => {
  assert.ok(_SOI6_SHUT.length >= 4 && _MANNERS_LINES.length >= 4);
  G.room = "soi6_mid"; G.nightTurn = SOI6_CLOSE + 5;
  const seen = new Set(); for (let i = 0; i < 12; i++) seen.add(_closedMsg("pink_lotus").split(" What's")[0].split(" It's")[0]);
  assert.ok(seen.size >= 2, "the closed message varies: " + [...seen].join(" | "));
  assert.doesNotMatch(body("_doSay"), /"Warm smiles all round\. Manners are the strongest currency on the soi\."/);
  assert.doesNotMatch(body("_sayDirectedReact"), /pleased\. Manners are the strongest currency/);
});

// ── nobody is moral-graded ───────────────────────────────────────────────────
test("the incident debrief owns the problem without grading the woman", () => {
  assert.doesNotMatch(SRC["engine-play"], /[Bb]ad girls are bad business/);
  assert.doesNotMatch(body("_doTalkCore"), /She is better than you/);
});

// ── two records about one fact now agree ─────────────────────────────────────
test("the dossier pass: the dawn is behind the town, the curry is Friday's, a beer-bar girl has a base, the school is on Second Road", () => {
  assert.doesNotMatch(_ACT1_FAIL_LEDE.dawn, /gulf goes/);
  assert.doesNotMatch(body("_endRide"), /sky over the gulf/);
  for (const l of lines(_QV_DISH_LINES)) assert.doesNotMatch(l, /improves all week/);
  for (const l of lines(_OWL_LETTERS)) assert.doesNotMatch(l, /draw no salary at all/);
  assert.doesNotMatch(SRC["engine-parser"], /school on Third Road/);
  assert.doesNotMatch(body("_taxiIntro"), /Ninety minutes of motorway/);
  assert.doesNotMatch(body("_doBandTalk"), /Despacito,' she says/, "one bassist, one pronoun");
});
