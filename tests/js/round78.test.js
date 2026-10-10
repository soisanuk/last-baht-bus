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
