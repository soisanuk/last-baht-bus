// ROUND 78 (2026-10-09/10) — the punter and the prude on Soi 6, run one after the other: Ray (the
// punter, a twenty-trip regular reading every price against what he paid) and Margaret (the prude,
// who refused everything and asked the town about its temples — "better written than he deserves").
// Mario's calls on Margaret's content findings (2026-10-10): the rose seller's daughter is eighteen;
// a man who keeps saying no is not sent the app's girl or told to collect numbers; the 18+ notice
// names the punter frame and the right to say no. The anonymous joke texts stay as they are.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const src = f => readFileSync(fileURLToPath(new URL(`../../web/${f}`, import.meta.url)), "utf8");

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; out = [];
});

const roseRail = () => {
  const room = Object.keys(ROOMS).find(r => ROOMS[r].barType === "beer" &&
    Object.keys(NPC_ROLES).some(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === r));
  const g = Object.keys(NPC_ROLES).find(x => NPC_ROLES[x] === "hostess" && _npcRoom(x) === room);
  G.room = room; _convoStart(g); G.soc.drinks = { [g]: 2 };
  return g;
};

test("the rose seller's daughter is eighteen: every line about her says so, none says child", () => {
  for (const seen of [0, 1, 1]) {
    roseRail(); G.flowerSeen = seen; out = [];
    let fired = false;
    for (let i = 0; i < 400 && !fired; i++) { G.flowerDay = 0; G.pendingEnc = null; _flowerTick(); fired = G.pendingEnc === "flower"; }
    assert.ok(fired);
    if (!seen) assert.match(said(), /eighteen/);
    out = []; run("wave");
    assert.doesNotMatch(said(), /\b(child|kid|little girl|seven)\b/i);
  }
  // the source of every rose line: no child left in it anywhere
  const enc = src("js/engine-encounters.js");
  const block = enc.slice(enc.indexOf("function _flowerTick"), enc.indexOf("function _salengTick")) +
    enc.slice(enc.indexOf("  flower(input) {"), enc.indexOf("  selfbf(input) {"));
  assert.doesNotMatch(block.replace(/\/\/.*$/gm, ""), /\b(child|kid|little girl|seven-year|tiny)\b/i);
  assert.doesNotMatch(ITEMS.rose.desc, /\bkid\b|asleep/);
});

test("a man who only says no is not sent the app's girl", () => {
  G.room = "hotel_room"; G.hotel = "sabai"; G.nightTurn = 80; G.bookingDay = -9; G.lastEnc = -999;
  delete G.encDone.booking;
  const offered = () => { const saved = _rand; try { _rand = () => 0; G.pendingEnc = null; _maybeEncounter(); return G.pendingEnc === "booking"; } finally { _rand = saved; } };
  assert.ok(offered(), "a man who has refused nothing still gets the app");
  G.pendingEnc = null; G.encPrompt = null; G.bookingDay = -9; delete G.encDone.booking;
  _tradeMark("no");
  assert.ok(_refusing());
  assert.ok(!offered(), "a man who has only said no does not");
  _tradeMark("lean");   // a flirt on the floor
  assert.ok(!_refusing(), "a flirt undoes it");
});

test("a no to the barfine, the freelancer or the self-barfine is a no; a paid night is a yes", () => {
  G.room = "candy_bar";
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  G.pendingBf = { id: girl, st: 1000, lt: 2000 };
  run("no");
  assert.ok(_refusing(), "the barfine's NO counts");
  _conquestHappy(5, girl);
  assert.ok(!_refusing(), "a night paid for is not a refusal");
  newGame(); _setFlag("act1Done"); G.room = "beach_rd_c"; G.pendingEnc = "freelancer"; run("no");
  assert.ok(_refusing(), "walking past the freelancer counts");
});

test("the number nudge waits for a lady drink, and never reaches a man who has said no", () => {
  G.room = "candy_bar"; _setFlag("tipBell");
  out = []; _newbieNudge();
  assert.doesNotMatch(said(), /no bar girl's number/, "not on the first step through the door");
  const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  G.soc.drinkCount = { [girl]: 1 };
  _tradeMark("no");
  out = []; _newbieNudge();
  assert.doesNotMatch(said(), /no bar girl's number/, "not to a man who has refused");
  G.trade = { yes: 0, no: 0, lean: 0 };
  out = []; _newbieNudge();
  assert.match(said(), /no bar girl's number/, "a man buying drinks still hears it");
  assert.doesNotMatch(said(), /gets interesting/);
});

test("JUST LOOKING is said once, costs nothing, and its promise is what it does", () => {
  G.room = "soi6_mid";
  const m = G.money; out = []; run("just looking");
  assert.ok(_refusing()); assert.equal(G.money, m);
  assert.ok(_NOT_BUYING_SAID.some(l => said().includes(l)));
  for (const l of _NOT_BUYING_SAID) assert.doesNotMatch(l, /stops? pitching|stop trying to sell you/, "the street still asks; only the app goes quiet");
  out = []; run("not interested"); assert.match(said(), /Already said/);
  assert.match(src("js/engine-parser.js"), /JUST LOOKING — say it once/, "on the HELP card");
});

test("the 18+ notice names the punter frame and the right to say no", () => {
  const html = src("index.html");
  const notice = html.slice(html.indexOf('<div id="start-age"'), html.indexOf("</div>", html.indexOf('<div id="start-age"')));
  assert.match(notice, /18\+/); assert.match(notice, /You play a man/); assert.match(notice, /customer/); assert.match(notice, /say no/);
});

// ── THE PRICE PASS (Mario's calls on Ray, 2026-10-10) ─────────────────────────────────────────────
test("Soi 6 short time is upstairs and long time is out of the bar, and the money is said as its two fees", () => {
  G.room = "ruby_kiss"; G.nightTurn = 40;
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && i !== "chompoo");
  G.soc.drinkCount = { [g]: 1 }; out = []; run("barfine " + NPCS[g].name.toLowerCase());
  assert.match(said(), /SHORT TIME [^·]*upstairs/); assert.match(said(), /LONG TIME [^·]*leaves the bar with you/);
  const st = G.pendingBf.st; out = []; run("short time");
  assert.match(said(), new RegExp(`฿${_num(st - LADY_ST)} to the till for the bar's fine, ฿${_num(LADY_ST)} into ${NPCS[g].name}'s own hand`), "her money is seen to be paid");
});

test("more drinks, more fun — unless she is a throughput girl, who likes a man who goes straight up", () => {
  const soi6 = Object.keys(NPCS).filter(i => NPC_ROLES[i] === "hostess" && ROOMS[NPCS[i].room] && ROOMS[NPCS[i].room].barType === "soi6");
  const thru = soi6.filter(_throughput), drinky = soi6.filter(i => !_throughput(i));
  assert.ok(thru.length > soi6.length / 5 && thru.length < soi6.length / 2, "a minority, varies by girl: " + thru.length + "/" + soi6.length);
  G.soc.drinkCount = { [drinky[0]]: 4, [thru[0]]: 4 };
  assert.equal(_stDrinkBonus(drinky[0]).n, 3, "four drinks pay three");
  assert.equal(_stDrinkBonus(thru[0]).n, 0, "four drinks are wasted on her");
  G.soc.drinkCount = { [drinky[0]]: 1, [thru[0]]: 1 };
  assert.equal(_stDrinkBonus(drinky[0]).n, 0); assert.equal(_stDrinkBonus(thru[0]).n, 2, "the one drink and up: her favourite");
});

test("the bell is a round for everyone in the room, priced per head", () => {
  G.room = "kitten_corner";
  const h = _bellHeads("kitten_corner");
  assert.equal(_bellPrice("kitten_corner"), Math.max(BELL_PRICE, Math.round((h.women * _ladyPrice() + h.men * _beerPrice()) / 10) * 10));
  assert.ok(_bellPrice("kitten_corner") >= 1000, "a full Soi 6 bar is four figures (Ray: ฿1,200 or more)");
  assert.ok(_bellPrice("queen_vic") < _bellPrice("kitten_corner"), "a pub round is beers, not lady drinks");
  const p = _bellPrice("kitten_corner"); assert.equal(_bellPrice("kitten_corner"), p, "quoting it moves nothing");
  G.money = p + 50; out = []; run("ring bell"); assert.equal(G.money, 50, "quoted is charged");
  for (const l of _BELL_BEER) assert.doesNotMatch(l, /round for the staff|Cheap at the price/, "a beer-bar bell is the whole bar's round");
});

test("the 7-Eleven sells beer until midnight, and Soi 6 has one of its own; the other is across Second Road", () => {
  G.room = "soi6_street"; G.nightTurn = 30; const m = G.money, d = G.soc.drunk;
  out = []; run("buy beer"); assert.equal(G.money, m - SEVEN_BEER); assert.equal(G.soc.drunk, d + 1);
  G.nightTurn = 60; out = []; run("buy beer"); assert.equal(G.money, m - SEVEN_BEER, "past midnight the fridge is chained");
  assert.ok(_SEVEN_BEER_SHUT.some(l => said().includes(l)));
  assert.deepEqual(Object.keys(ROOMS).filter(r => ROOMS[r].region === "Soi 6" && ROOMS[r].seven), ["soi6_street"]);
  assert.ok(ROOMS.second_rd_soi6.seven, "across Second Road");
  G.room = "sweet_tamarind"; G.nightTurn = 30; out = []; run("buy water"); assert.equal(G.money, m - SEVEN_BEER - _beerPrice(), "water in a bar is still the beer's price (Mario)");
});

// ── THE BUG PASS (Ray's and Margaret's findings, 2026-10-10) ──────────────────────────────────────
const askOf = (room, who, what) => { G.room = room; run("talk to " + who); out = []; run(`ask ${who} about ${what}`); return said(); };

test("a long time pays the bar's fine and her money, each named", () => {
  G.room = "sweet_tamarind"; const g = "sweet_tamarind_ple"; G.soc.drinkCount = { [g]: 1 };
  const saved = _rand; let lt;
  try { _rand = () => 0.99; run("barfine ple"); lt = G.pendingBf.lt; run("long time"); out = []; run("long time"); } finally { _rand = saved; }   // no game rolled on the honest night
  assert.match(said(), new RegExp(`฿${_num(lt - LADY_LT)} to [^,]+ for the bar's fine, entered in the ledger with ceremony, ฿${_num(LADY_LT)} into Ple's own hand`));
});

test("on Soi 6 anyone working can say what upstairs, short time and her money are, at the till's prices", () => {
  const st = (() => { G.room = "sweet_tamarind"; return _barfinePrices("soi6", "sweet_tamarind_ple").st; })();
  assert.match(askOf("sweet_tamarind", "ple", "short time"), new RegExp("฿" + _num(st)));
  assert.match(askOf("firecracker_bar", "fah", "upstairs"), /Upstairs|stairs/);
  assert.match(askOf("sweet_tamarind", "view", "the staircase"), /upstairs|stairs/);
  assert.match(askOf("pink_lotus", "nee", "her money"), new RegExp("฿" + LADY_ST));
});

test("LAST NIGHT is last night's exit, not the last exit ever", () => {
  G.soc.leftFrom = "sweet_tamarind"; _endNight("sleep"); _endNight("sleep");
  assert.equal(G.lastNightWas.leftFrom, null, "night 3's long time does not answer for night 4");
});

test("a word inside a word does not lock a subject: Tan's 'ice' was in 'price' and 'police'", () => {
  G.room = "soi6_street";
  assert.doesNotMatch(askOf("soi6_street", "tan", "short time"), /Not yet, na/);
  assert.match(askOf("soi6_street", "tan", "police"), /boys in brown/);
  assert.match(askOf("soi6_street", "tan", "temple"), /Big Buddha/);
  G.room = "stinky_bar"; assert.doesNotMatch(askOf("stinky_bar", "bert", "selling"), /pay grade|department/, "a word's START still gates: sell → selling");
});

test("a bare TALK to somebody whose question is open restates it", () => {
  G.room = "soi6_street"; G.mode = "soi6"; run("talk to tan");
  if (G.convoQ && G.convoQ.id === "tan") { out = []; run("talk to tan"); assert.match(said(), /question is still open/); }
});

test("the women answer what they raised: the monk, the teacher, the garden, the problem, leaving, mama", () => {
  assert.match(askOf("ladybird_bar", "somsri", "the monk"), /my son/i);
  assert.doesNotMatch(said(), /tonic|curse/i);
  assert.match(askOf("ladybird_bar", "somsri", "the garden"), /apple tree/);
  assert.match(askOf("pink_lotus", "belle", "problem"), /motorbike/);
  assert.match(askOf("kitten_corner", "aum", "leaving"), /one year/i);
  assert.match(askOf("stinky_bar", "manow", "mama"), /dangerous/);
});

test("standing a regular the drink she named earns her trust: Angela's navy, after a Singha", () => {
  G.room = "queen_vic"; run("talk to angela"); run("ask angela about navy"); G.day++;
  run("talk to angela"); run("buy drink for angela");
  assert.match(askOf("queen_vic", "angela", "navy"), /Twelve years/);
});

test("the trade's words are a question with an answer", () => {
  G.room = "sweet_tamarind";
  for (const q of ["what is a barfine?", "what is a lady drink", "whats short time", "what does tilac mean"]) { out = []; run(q); assert.doesNotMatch(said(), /blinks|didn't parse|No idea/, q); }
});

test("TELL <her> <something> is said to her; GIVE <her> <n> FOR <a reason> pays and she hears the reason", () => {
  G.room = "sandy_toes"; run("talk to nina"); out = []; run("tell nina i fly home tomorrow");
  assert.doesNotMatch(said(), /Telling isn't the verb/);
  G.room = "kitten_corner"; run("talk to aum"); const m = G.money; out = []; run("give aum 500 for her brother's school");
  assert.equal(G.money, m - 500); assert.match(said(), /brother's school/);
});

test("Kesinee's vetting answers her question, not a hello that asked none", () => {
  G.room = _npcRoom("kesinee"); run("talk to kesinee");
  assert.ok(!_convoChoices("raw").some(c => /bert sent you/i.test(c.label)), "no choices on the hello");
  run("ask kesinee about pattaya leisure");
  assert.ok(_convoChoices("raw").some(c => /bert sent you/i.test(c.label)), "the choices answer 'who send you?'");
});

test("the room says who is with a customer; the noodle girls and the police answer; the frames are inside", () => {
  G.room = "soi6_street"; out = []; run("talk to noodle girl"); assert.doesNotMatch(said(), /Nobody by that name/);
  out = []; run("police"); assert.doesNotMatch(said(), /didn't parse|No idea/);
  G.room = "soi6_mid"; out = []; run("examine licence"); assert.match(said(), /inside, in a frame by each till/);
  assert.ok(!_hasBarman("sweet_tamarind"), "no barman at the Tamarind");
});

test("the prose stops asserting what didn't happen", () => {
  assert.doesNotMatch(String(ROOMS.soi6_mid.desc), /nothing upstairs/);
  assert.ok(Array.isArray(ROOMS.qv_room.lateDesc) && ROOMS.qv_room.lateDesc.every(l => !/shriek|HANDSOME MAN!/.test(l)));
  for (const l of ENCOUNTERS.booking.intro) assert.doesNotMatch(l, /written off|half forgotten/);
  for (const l of [].concat(ENCOUNTERS.freelancer.intro)) assert.doesNotMatch(l, /not necessarily Tuesday/);
  assert.equal(HAPPY_LEVELS[HAPPY_LEVELS.length - 1][1].includes("running on empty"), false);
  assert.doesNotMatch(_fmt(_STAND_BEER[0], { who: "Angela", drink: NPCS.angela.drink }), /Angela Singha/);
});
