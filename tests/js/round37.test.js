// Round 37 — Darren (the Darkside commute) and Gordon (the phone as an object).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(join(here, "../../web/js", f), "utf8"), { filename: f });
}
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");
const run = (...cmds) => { for (const c of cmds) doCommand(c); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 5000; G.nightTurn = 30;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2;
});

// ── Darren ──
test("the Darkside is not an island: the crossing walks west to Soi Buakhao, and TRAVEL walks it (Darren)", () => {
  G.room = "sukhumvit_crossing"; run("w"); assert.equal(G.room, "sukhumvit_verge");
  assert.ok(ROOMS.sukhumvit_verge.dark, "and it is dark — the streak counts");
  run("w"); assert.equal(G.room, "buakhao_pt");
  G.room = "khao_talo"; G.visited.stinky_bar = true; G.hunger = 0; G.thirst = 0; const t0 = G.turns;
  run("travel stinky pinky");
  assert.equal(G.room, "stinky_bar"); assert.ok(G.turns - t0 >= 10, "a long walk, paid in ticks: " + (G.turns - t0));
});

test("Sukhumvit is a main road: the Pattaya Tai trucks stop at the crossing (Darren)", () => {
  assert.deepEqual(_busLinesFor("sukhumvit_crossing"), ["sukhumvit"]);
  assert.ok(_busLinesFor("pattaya_tai").includes("sukhumvit"), "…and run from the Pattaya Tai junction");
  G.room = "sukhumvit_crossing"; G.money = 500;
  run("ride bus to pattaya tai", "pay 15");
  assert.equal(G.room, "pattaya_tai"); assert.equal(G.money, 485);
  G.room = "khao_talo"; out = []; run("bus");
  assert.match(text(), /Pattaya Tai trucks stop at the Sukhumvit crossing/, "a soi with no trucks points at the highway");
});

test("the drunk balk out east doesn't promise a bench that isn't there (Darren)", () => {
  G.room = "khao_talo"; G.soc.drunk = 8; G.motoBalkTurn = null; G.money = 1000;
  run("motosai to naklua");
  assert.ok(_MOTO_DRUNK_NO_EAST.some(l => text().includes(l)), "the east pool");
  assert.doesNotMatch(text(), /the bus will have you/);
  G.room = "second_rd_c"; G.motoBalkTurn = null; out = []; run("motosai to naklua");
  assert.ok(_MOTO_DRUNK_NO.some(l => text().includes(l)), "in town, the bench is real");
});

test("the pity ride is remembered, and the next paid fare settles it (Darren)", () => {
  G.room = "khao_talo"; G.money = 0; G.soc.drunk = 0;
  run("motosai to naklua");
  assert.equal(G.room, "naklua_rd"); assert.equal(G.pityOwed, MOTOSAI_TOWN); assert.equal(G.pityRides, 1);
  G.money = 1000; G.day++; G.room = "khao_talo"; G.money = 0; run("motosai to naklua");
  assert.match(text(), /Again, boss\?/, "the second time he knows you");
  assert.equal(G.pityOwed, MOTOSAI_TOWN * 2);
  G.money = 1000; G.room = "naklua_rd"; out = []; run("motosai to soi buakhao");
  assert.match(text(), /the night you have nothing/); assert.equal(G.pityOwed, 0);
  assert.equal(G.money, 1000 - MOTOSAI_TOWN * 2 - _motoFare(MOTOSAI_DESTS["soi buakhao"]) , "fare plus the debt of honour");
});

test("no stand means no stand — even in the rain, even in your room; bare GRAB is the app (Darren)", () => {
  G.room = "hotel_room"; G.rain = 3; run("motosai to darkside");
  assert.match(text(), /No piwin in here/); assert.doesNotMatch(text(), /awning/);
  out = []; run("grab"); assert.match(text(), /piwins on the corner ARE the app/);
  out = []; run("bolt"); assert.match(text(), /piwins on the corner ARE the app/);
});

test("TAO RAI at a stand quotes the fares — and the quote is the charge (Darren)", () => {
  G.room = "khao_talo"; G.nightTurn = 85; G.money = 5000; G.dog = null;
  run("tao rai");
  const q = +(text().match(/naklua ฿(\d+)/) || [0, 0])[1];
  assert.ok(q > 0, text().slice(0, 200));
  const saved = _rand;
  try { _rand = () => 0.99; out = []; run("motosai to naklua"); }   // the small-hours crash roll is not what this pins
  finally { _rand = saved; }
  assert.equal(5000 - G.money, q);
});

test("the piwin knows where the trucks run (Darren)", () => {
  G.room = "khao_talo"; run("ask piwin about bus"); assert.match(text(), /Highway/);
  G.room = "second_rd_c"; out = []; run("ask piwin about bus"); assert.match(text(), /Bus\? Here, yes/);
});

test("the near-miss prints after you got on, never before (Darren)", () => {
  const src = readFileSync(join(here, "../../web/js/engine-parser.js"), "utf8");
  const pay = src.indexOf("That was the fastest ฿");
  const near = src.indexOf("if (nearMiss) _say(_pickVary(_MOTO_NEARMISS");
  assert.ok(pay > 0 && near > pay, "near-miss line after the fare line");
});

test("no downpour during the opening race (Darren)", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  globalThis.WX_NOW = { temp: 29, humid: 92, code: 95, hi: 30, rain: 90 };
  try {
    G.encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
    G.room = "second_rd_c";
    for (let i = 0; i < 150; i++) { G.hunger = 0; G.thirst = 0; G.nightTurn = 5; _tick(); }
    assert.equal(G.rain, 0, "Act One stays dry");
  } finally { delete globalThis.WX_NOW; }
});

test("a downpour does not follow you through sleep; a lock-in has no cart fashion show (Darren/Gordon)", () => {
  G.rain = 5; G.room = "hotel_room"; _endNight("sleep"); assert.equal(G.rain, 0);
  newGame(); _setFlag("act1Done"); G.room = "night_heron"; G.soc.lockIn = { night_heron: true };
  G.salengCart = "lingerie"; G.salengRoom = "night_heron"; G.salengUntil = G.turns + 50;
  out = []; for (let i = 0; i < 40; i++) _salengTick();
  assert.equal(out.filter(o => /saleng/i.test(o.text)).length, 0, "no vignette behind a bolted door");
});

// ── Gordon ──
test("the gallery files a photo where the shutter went (Gordon)", () => {
  const owner = Object.keys(NPCS).find(id => NPCS[id].bars && NPCS[id].bars.length > 1 && NPC_ROLES[id]);
  assert.ok(owner, "a rotating owner");
  const there = _npcRoom(owner); const other = NPCS[owner].bars.find(b => b !== there);
  G.room = there; run("photo " + NPCS[owner].name.toLowerCase());
  assert.ok(_hasPortrait(owner));
  out = []; run("gallery");
  assert.match(text(), new RegExp(NPCS[owner].name + " — " + _barName(there).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  G.day++; // she rotates; the entry doesn't
  out = []; run("gallery");
  assert.match(text(), new RegExp(_barName(there).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("the phone learns what it is told: Tan has your number, Mort has a name, the Owl was read (Gordon)", () => {
  G.phone.contacts = { tan: true }; G.phone.inbox = []; run("phone");
  assert.match(text(), /No messages yet/); assert.doesNotMatch(text(), /nobody has your number/);
  _setFlag("jokeWho"); G.phone.jokeDay = 0; G.room = "beach_rd_c"; _dailyJoke();
  assert.equal(G.phone.inbox[G.phone.inbox.length - 1].fromName, "Mort");
  G.owlRead = false; out = []; run("phone"); assert.match(text(), /sits unread/);
  run("owl"); out = []; run("phone"); assert.match(text(), /This week's Nite Owl is in your inbox/);
});

test("Mort's invitation is honest about whether he is in tonight (Gordon)", () => {
  _setFlag("jokeWho"); G.phone.jokeN = 1;
  const inTonight = _npcWhere("mort") === "queen_vic";
  run("reply");
  assert.match(text(), inTonight ? /I'm on it now/ : /Not in tonight/);
});

test("charging takes the minutes it takes, and a bar's socket is for customers (Gordon)", () => {
  G.itemLoc.charger = "inventory"; G.battery = 5; G.room = "beach_rd_c"; const t = G.turns;
  run("charge phone");
  assert.equal(G.battery, 100); assert.ok(G.turns - t >= 3, "ticks passed: " + (G.turns - t));
  const bar = Object.keys(ROOMS).find(r => ROOMS[r].outlet && ROOMS[r].barType);
  if (bar) {
    G.battery = 5; G.room = bar; out = []; run("charge phone");
    assert.match(text(), /for customers/); assert.equal(G.battery, 5);
    G.soc.selfDrinks = { [bar]: 1 }; out = []; run("charge phone"); assert.equal(G.battery, 100);
  }
});

test("the noodle girl's bar has a name, so ENTER can follow through (Gordon)", () => {
  G.room = "soi6_street"; G.pendingEnc = "noodle"; run("yes");
  assert.match(text(), /\(ENTER [A-Z' ]+ to follow it through/);
  assert.doesNotMatch(text(), /\(ENTER to follow/);
});

test("the booking pitch is pooled, and an encounter intro may be an array (Gordon)", () => {
  assert.ok(Array.isArray(ENCOUNTERS.booking.intro) && ENCOUNTERS.booking.intro.length >= 3);
  G.room = "hotel_room"; G.nightTurn = 75; _startEnc("booking");
  assert.ok(ENCOUNTERS.booking.intro.some(l => text().includes(l)));
  assert.ok(G.encPrompt && G.encPrompt.some(l => ENCOUNTERS.booking.intro.includes(l[0])), "the stash holds the picked one");
  G.pendingEnc = null;
});

test("the money-ask texts and the thank-yous are pools, not one template with the name swapped (Gordon)", () => {
  const src = readFileSync(join(here, "../../web/js/engine-systems.js"), "utf8");
  assert.match(src, /mama go hospital today/); assert.match(src, /motorbike of me broken/);
  assert.match(src, /"sendmid:" \+ id/);
});

// ── Crossing Sukhumvit on foot (Mario, 2026-09-03) ──
test("both rooms say what the highway does to people on foot", () => {
  assert.match(ROOMS.sukhumvit_crossing.desc, /kills a handful of people/);
  assert.match(ROOMS.sukhumvit_crossing.desc, /\(MOTOSAI TO DARKSIDE\)/, "and name the sane answer as a verb");
  assert.match(ROOMS.sukhumvit_verge.desc, /people die on this road every year/);
});

test("the crossing on foot is a roll: clean, a clip, or the ward — bus and bike never roll (Mario)", () => {
  const saved = _rand;
  try {
    _rand = () => 0.99;                       // the dice are kind
    G.room = "sukhumvit_crossing"; out = []; run("e");
    assert.equal(G.room, "khao_talo_strip");
    assert.ok(_CROSS_CLEAN.some(l => text().includes(l)), "the act is felt even when it goes fine");
    _rand = () => 0.0;                        // the dice are cruel: first roll hits, second picks the truck
    G.room = "sukhumvit_crossing"; G.soc.drunk = 0; const day = G.day; out = []; run("e");
    assert.ok(_CROSS_HIT.some(l => text().includes(l)));
    assert.equal(G.day, day + 1, "the night ended in the ward");
    assert.equal(G.nightLog[G.nightLog.length - 1], "roadhit");
    assert.ok(_HOSP_WHY.roadhit.some(l => text().includes(l)), "a pedestrian's morning, not a pillion's");
    let seq = [0.0, 0.9];                     // hit, but not the truck: the clip
    _rand = () => seq.shift() ?? 0.99;
    G.room = "sukhumvit_crossing"; G.soc.drunk = 0; G.hurt = 0; out = []; run("e");
    assert.equal(G.hurt, 1); assert.equal(G.room, "khao_talo_strip");
    assert.ok(_CROSS_CLIP.some(l => text().includes(l)));
    // the bus doesn't roll: same cruel dice, no crossing prose
    _rand = () => 0.0; G.room = "sukhumvit_crossing"; G.money = 500; G.nightTurn = 30; out = [];
    run("ride bus to pattaya tai", "pay 15");
    assert.equal(G.room, "pattaya_tai"); assert.ok(!_CROSS_HIT.some(l => text().includes(l)));
  } finally { _rand = saved; }
});

test("drink and the small hours raise the crossing's risk; TRAVEL through it pays the same roll", () => {
  const saved = _rand;
  try {
    // the risk is what the roll is compared against: at 8 drinks, late, a 0.3 roll is a hit; sober early it is not
    _rand = () => 0.3;
    G.room = "sukhumvit_crossing"; G.soc.drunk = 0; G.nightTurn = 30; out = []; run("e");
    assert.equal(G.room, "khao_talo_strip", "sober, early: 0.3 clears a 4% risk");
    _rand = () => 0.3; G.room = "sukhumvit_crossing"; G.soc.drunk = 8; G.nightTurn = 85; G.hurt = 0; out = []; run("e");
    assert.ok(G.hurt >= 1 || G.nightLog[G.nightLog.length - 1] === "roadhit", "eight deep at three a.m., the same roll is a hit");
    newGame(); _setFlag("act1Done"); G.money = 5000; for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
    _rand = () => 0.99; G.room = "khao_talo"; G.visited.stinky_bar = true; G.hunger = 0; G.thirst = 0; out = [];
    run("travel stinky pinky");
    assert.ok(_CROSS_CLEAN.some(l => text().includes(l)), "TRAVEL walked the crossing and it was narrated");
  } finally { _rand = saved; }
});

// ── A motosai ride takes the time the road takes (Mario, 2026-09-03) ──
test("a bike is one turn within the district or the next one over, and a turn more per district beyond", () => {
  assert.equal(_districtHops("Beach Road", "Beach Road"), 0);
  assert.equal(_districtHops("Beach Road", "Naklua"), 1);
  assert.equal(_districtHops("Beach Road", "Darkside"), 3);
  assert.equal(_districtHops("Jomtien", "Darkside"), 4);
  const ride = (from, to) => {
    newGame(); _setFlag("act1Done"); G.money = 5000; G.soc.drunk = 0; G.dog = null; G.nightTurn = 30;
    for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
    G.hunger = 0; G.thirst = 0; G.room = from; const t = G.turns; out = []; run("motosai to " + to);
    assert.equal(G.room, MOTOSAI_DESTS[to].room, from + " → " + to + " arrived");
    return G.turns - t;
  };
  const expect = (from, to) => Math.max(1, _districtHops(ROOMS[from].region, MOTOSAI_DESTS[to].room && ROOMS[MOTOSAI_DESTS[to].room].region));
  for (const [from, to] of [["pattaya_klang", "beach road"], ["pattaya_klang", "darkside"], ["khao_talo", "jomtien"], ["naklua_rd", "walking street"]]) {
    assert.ok(ROOMS[from].motosai, from + " has a stand");
    assert.equal(ride(from, to), expect(from, to), from + " → " + to);
  }
  assert.ok(expect("khao_talo", "jomtien") >= 3, "the far corner to the far corner is a long ride");
  assert.match(text(), /minutes of it/, "and the pay line says how long it was");
  G.money = 0; G.room = "khao_talo"; const t = G.turns; out = []; run("motosai to naklua");
  assert.equal(G.turns - t, expect("khao_talo", "naklua"), "the mercy ride takes the same road");
});

// ── The ride itself (Mario, 2026-09-03) ──
test("the ride is a pool: the weaving, the hands on the first ride, three-up with a girl, a second bike for two", () => {
  const go = () => { G.hunger = 0; G.thirst = 0; G.soc.drunk = 0; G.dog = null; G.room = "pattaya_klang"; G.money = 5000; out = []; run("motosai to naklua"); return text(); };
  newGame(); _setFlag("act1Done"); for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true; G.peddlerNight = 2;
  let t = go();
  assert.ok(_MOTO_RIDE_SHORT.some(l => t.includes(l)), "a short hop's ride line");
  assert.ok(_MOTO_HANDS.some(l => t.includes(l)), "the first ride: where do the hands go");
  t = go(); assert.ok(!_MOTO_HANDS.some(l => t.includes(l)), "…only the first");
  G.room = "pattaya_klang"; out = []; run("motosai to darkside");
  assert.ok(_MOTO_RIDE_LONG.some(l => text().includes(l)), "a long haul's ride line");
  const girls = Object.keys(NPCS).filter(id => NPC_ROLES[id] === "hostess").slice(0, 2);
  G.party = { ids: [girls[0]], stops: 0, spent: 0, seen: {} }; t = go();
  assert.ok(_MOTO_THREE_UP.some(l => t.includes(_fmt(l, { n: NPCS[girls[0]].name }))), "three-up with her");
  // two girls: half the rides are four-up (canon: it happens), the rest a second bike and fare
  const names = NPCS[girls[0]].name + " and " + NPCS[girls[1]].name;
  let four = 0, second = 0;
  for (let i = 0; i < 12; i++) {
    G.party = { ids: girls, stops: 0, spent: 0, seen: {} }; t = go();
    if (_MOTO_FOUR_UP.some(l => t.includes(_fmt(l, { n: names })))) { four++; assert.equal(G.money, 5000 - _motoFare(MOTOSAI_DESTS.naklua), "four-up is one fare"); }
    else if (_MOTO_SECOND_BIKE.some(l => t.includes(_fmt(l, { n: names })))) { second++; assert.equal(G.money, 5000 - 2 * _motoFare(MOTOSAI_DESTS.naklua), "a second bike is a second fare"); }
  }
  assert.ok(four >= 1 && second >= 1, `both happen: four-up ${four}, second bike ${second}`);
  G.party = { ids: girls, stops: 0, spent: 0, seen: {} }; G.room = "pattaya_klang"; G.money = _motoFare(MOTOSAI_DESTS.naklua); out = []; run("motosai to naklua");
  assert.ok(_MOTO_FOUR_UP.some(l => text().includes(_fmt(l, { n: names }))), "broke: always four-up");
  assert.doesNotMatch(t, /threads traffic like it owes him money\. That/, "the old fixed sentence is gone as a fixed sentence");
});

// ── Colin, the Cheap Charlie: every baht accounted for ──
test("the beer names its price on the line that charges it, and the fifth one says why it cost สนุก (Colin)", () => {
  G.room = "candy_bar"; G.soc.drunk = 0; run("buy beer");
  assert.match(text(), new RegExp(`\\(-฿${_beerPrice()}, ฿${G.money} left\\.\\)`));
  G.room = "tequila_queen"; out = []; run("buy beer");
  assert.match(text(), new RegExp(`-฿${_beerPrice("tequila_queen")}`), "a go-go's Chang says what it is");
  G.soc.drunk = 5; out = []; run("buy beer"); assert.match(text(), /One past the sweet spot/);
  G.room = "beach_rd_c"; out = []; run("buy water"); assert.match(text(), /\(-฿10, ฿/);
});

test("TAO RAI in a bar is the price list nobody hands you (Colin)", () => {
  G.room = "candy_bar"; run("tao rai");
  assert.match(text(), new RegExp(`beer ฿${_beerPrice()} · lady drink ฿${_ladyPrice()} · water ฿20 · the bell ฿${_bellPrice("candy_bar")}`));
});

test("the ATM says the fee before you commit, the piwin's rumour is a street thing, and a street with a 7-Eleven has no mamasan (Colin)", () => {
  _setFlag("hasWallet"); G.room = "beach_rd_c"; run("check balance"); assert.match(text(), /foreign-card fee ฿300 a pull/);
  G.room = "candy_bar"; out = []; run("ride bus"); assert.match(text(), /trucks are a rumour/);
  G.room = "buddha_hill"; out = []; run("drink fanta"); assert.match(text(), /No bar out here/);
  G.room = "soi6_deep"; G.rain = 3; G.itemLoc.umbrella = null; out = []; run("w");
  assert.match(text(), /edge of the awning/); assert.doesNotMatch(text(), /mamasan/);
});

test("bars whose own prose says cheap are cheaper at the till; ya dong is paint-stripper money (Colin)", () => {
  for (const id of ["the_growler", "container_8", "reload_bar", "craft_cargo", "rabbit_hole", "lucky_charm", "moonshine_bar", "dolphin_bar"])
    assert.equal(_beerPrice(id), BEER_PRICE - 10, id);
  assert.ok(YA_DONG_SHOT < BEER_PRICE);
  assert.match(NPCS.aek.dialogue.map(d => d.text).join(" "), new RegExp(`pool's ฿${POOL_STAKE} a rack`), "Aek quotes the stake the table takes");
});

test("a patron giver who isn't out: the journal names his local and the man who knows his habits (Colin)", () => {
  const saved = _npcWhere;
  try {
    _npcWhere = id => id === "fergie" ? null : saved(id);
    const w = _questWhere("fergie");
    assert.match(w, /isn't out tonight/); assert.match(w, /ASK TAN ABOUT FERGIE/);
  } finally { _npcWhere = saved; }
});

test("the British woman's hint carries a verb, and TALK is decent (Colin)", () => {
  assert.match(ENCOUNTERS.britles.hint, /TALK to her, or CHEERS/);
  G.room = "ws_gate"; G.pendingEnc = "britles"; run("talk to her");
  assert.ok(G.wingmanUntil > G.turns, "the wingman buff");
});

test("SCORES reads the same bake as the telly: results, then fixtures (Colin)", () => {
  globalThis.FOOTY = { league: "Test League", teams: ["A", "B", "C", "D"], games: [
    { d: "Sat", h: "A", a: "B", hs: 0, as: 1, done: true }, { d: "Sun", h: "C", a: "D" }, { d: "Sun", h: "A", a: "D" }] };
  try { out = []; run("scores"); assert.match(text(), /A 0.*1 B|A 0–1 B|0-1/); assert.match(text(), /C v D/); }
  finally { delete globalThis.FOOTY; }
});

test("drinks that are poured are on your tab — the prose stopped promising free ones (Colin)", () => {
  const src = readFileSync(join(here, "../../web/js/world.js"), "utf8");
  assert.match(src, /signals the barman for his own/); assert.match(src, /on your tab, obviously/);
  assert.match(src, /and the chit lands with it/); assert.match(src, /in your hand and on your chit/);
  assert.doesNotMatch(src, /Forty baht gets " \+\n\s*"you a plate/);
  assert.match(ROOMS.cheap_charlies_jt.desc, /\(BUY FOOD\.\)/);
  assert.match(ROOMS.pratumnak_hill_rd.desc, /clubs are down the west side \(W\)/);
});
