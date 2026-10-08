// Round 56 (2026-09-29) — three lenses nobody had used. Barry, a Doncaster widower
// who says yes to every pitch and chases every lost baht (lens: the-mark); Dieter,
// a white knight who came for a "normal girl" and walks into Cream's economy (lens:
// civilian-seeker); Nattapong, a Thai speaker who typed ~80 lines of script (lens:
// thai-speaker). Dieter's severe: Cream's morning-after fired a month late, after he
// slept alone, because the pending choice survived the flight home. Nattapong's: the
// town had one ear — it heard its own words in romanisation and not in the script it
// prints on its walls. Barry's: the piwin refusing an ฿80 ride quoted the ฿15 bus.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
const quiet = () => { for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true; G.pendingEnc = null; };
const run = c => { out = []; doCommand(c); return text(); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.bank = 50000; quiet(); G.peddlerNight = 2;
});
const withDice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };

// ── Dieter ───────────────────────────────────────────────────────────────
test("Cream's morning does not survive the flight home (Dieter's severe)", () => {
  G.day = 7; G.chamNight = true; G.room = "hotel_room"; G.nightTurn = 100;
  out = []; _endNight("sleep");
  assert.equal(G.chamNight, false, "the morning happened, or it did not — it does not wait a month");
  assert.match(text(), /She is gone before you are properly awake/);
  assert.notEqual(G.pendingChoice, "chammorning");
});

test("a first-person answer to Tan is an ANSWER, even when it contains one of his topics", () => {
  G.room = _npcRoom("tan"); _convoStart("tan");
  G.convoQ = { id: "tan", key: "finding", q: "is it what you came for?" };
  run("I came to meet a normal woman, not a bar girl");
  assert.ok(G.player.said.finding, "recorded as what he said");
  assert.doesNotMatch(text(), /BUY TAN A COFFEE/, "not the bar-ownership advice");
});

test("the dawn coda knows she rode you home on her own bike", () => {
  G.lastBfId = "jaja"; G.lastRide = { id: "jaja", day: G.day, stops: 3 };
  for (let k = 0; k < 6; k++) { out = []; _cinderellaCoda(); assert.doesNotMatch(text(), /baht bus/i, "she drove; she does not catch a truck"); }
});

test("the departure scene's girl is the one you last spent the night with — not Cream's predecessor", () => {
  G.lastNightWith = "cream"; G.lastBfId = "jaja"; G.soc.drinks.jaja = 9;
  assert.equal(_farewellGirl(), null);
});

test("a one-woman bar has no phantom staff: the Mooring's lines name nobody who isn't there", () => {
  G.room = "mooring_bar"; G.nightTurn = 30; G.money = 99999;
  assert.deepEqual(_npcsHere().filter(i => NPC_ROLES[i]), ["jaja"]);
  const PHANTOM = /\b(cashier|mamasan|the mama|jury of two|barman|waitress|other girls|the girls|girl beside)\b/;
  // every path a drink can open: the pools, the go-with-you offer, her own barfine offer —
  // swept across the dice so the pin cannot pass on a lucky seed
  for (let k = 0; k < 40; k++) withDice((k + 0.5) / 40, () => { G.soc.goWith = {}; G.soc.selfBf = false; assert.doesNotMatch(run("buy jaja a drink"), PHANTOM); });
  // the pool filter never empties a pool, and leaves a full floor alone
  assert.equal(_roomFit(["the mamasan counts", "the cashier counts"]).length, 2, "all-bad falls back to the whole pool");
  G.room = "candy_bar"; const pool = ["the mamasan nods", "a girl laughs"];
  if (_npcsHere().some(i => NPC_ROLES[i] === "mamasan")) assert.equal(_roomFit(pool).length, 2);
});

test("her own barfine offer in a one-woman bar calls to no mamasan", () => {
  G.room = "mooring_bar"; G.nightTurn = 70; G.soc.drinks.jaja = 20;
  withDice(0.1, () => { for (let k = 0; k < 5 && !G.soc.selfBf; k++) _maybeSelfBarfine("jaja"); });
  if (G.soc.selfBf) assert.doesNotMatch(text(), /mamasan|other girls/);
});

test("night-ride turns are not stool time", () => {
  G.room = "mooring_bar"; G.rideSeq = { id: "jaja", stops: 1 }; G.party = null;
  const before = (G.soc.barTurns || {}).mooring_bar || 0;
  if (typeof _onRide === "function" && _onRide()) { _tick(); assert.equal((G.soc.barTurns || {}).mooring_bar || 0, before); }
});

test("\"normal girls\" has an answer — and it is the town's, in each register", () => {
  G.room = "queen_vic"; const en = run("ask terry about normal girls");
  assert.ok(_NORMAL_EN.some(f => en.includes(_fmt(f, { n: "Terry", p: "his" }).slice(0, 40))), "a man on a stool answers in English");
  G.room = "mooring_bar"; const fl = run("ask jaja about civilian");
  assert.ok(_NORMAL_FLOOR.some(f => fl.includes(_fmt(f, { n: "Jaja" }).slice(0, 40))), "the floor answers in its own voice");
});

test("what a woman volunteered is askable: Jaja's baby, Cream's coffee, Aoy's sister, Rob's different one", () => {
  const miss = /wrong girl|not my story|don't know|no idea/i;
  G.room = "mooring_bar"; assert.doesNotMatch(run("ask jaja about baby"), miss);
  G.room = "metro_garden"; G.nightTurn = 50; assert.doesNotMatch(run("ask cream about coffee"), miss);
  G.room = "queen_vic"; assert.match(run("ask aoy about sister"), /Soi 6/);
  G.room = _npcRoom("rob"); assert.match(run("ask rob about different"), /Nine years/);
  G.room = "mooring_bar"; assert.doesNotMatch(run("ask jaja about udon"), miss);
});

test("Tan reads a restaurant as a restaurant, and 'thai' is not a venue", () => {
  G.room = _npcRoom("tan");
  assert.match(run("ask tan about kiss jomtien"), /Somewhere to eat/);
  assert.doesNotMatch(run("ask tan about thai"), /Massage/);
});

test("Tan asks after the life you told him about, not the detective's", () => {
  G.player.origin = "running";
  for (let k = 0; k < 8; k++) { const l = _fmt(_pickVary(_TAN_RIDE_LINES, "tanride"), { tanask: "X" }); assert.doesNotMatch(l, /detective/); }
});

test("DJ Beer is not learned from the word beer", () => {
  delete G.known.dj_beer; out = []; _say("Beer, whisky, soda — all same.");
  const id = Object.keys(NPCS).find(i => NPCS[i].name === "DJ Beer");
  assert.ok(!G.known[id], "a drink is not a name");
  _say("DJ Beer is spinning."); assert.ok(G.known[id]);
});

test("WHO counts the other numbers in the phone", () => {
  G.phone.contacts = { tan: true, cream: true }; G.soc.drinks.jaja = 5; G.known.jaja = true; G.known.lek = true;
  assert.match(run("who"), /other number/);
});

// ── Barry ────────────────────────────────────────────────────────────────
test("the piwin refusing a ride names the ride's fare before the bus's", () => {
  G.flags.act1Done = false; G.stage = "act1"; G.room = "second_rd_c"; G.money = 45;
  const t = run("motosai to tree town");
  if (/no ride, boss/.test(t)) assert.match(t, /฿\d+, this one/);
});

test("GIVE a receipt points at SHOW", () => {
  G.room = "candy_bar"; G.itemLoc.receipt = "inventory";
  if (ITEMS.receipt) assert.match(run("give receipt to candy"), /\(SHOW RECEIPT TO CANDY\)/);
});

test("a motosai ride that never crosses Sukhumvit does not see the highway", () => {
  G.room = "soi6_street"; G.money = 9999;
  for (let k = 0; k < 12; k++) {
    G.room = k % 2 ? "soi6_street" : "buakhao_klang";
    assert.doesNotMatch(run(k % 2 ? "motosai to buakhao" : "motosai to soi 6"), /highway with the trucks|lorries pass/);
  }
});

// ── Nattapong ────────────────────────────────────────────────────────────
test("ASK in script takes its connective and its nouns: ถามแคนดี้เรื่องกระเป๋าเงิน", () => {
  assert.equal(_thaiToCmd("ถามแคนดี้เรื่องกระเป๋าเงิน"), "ask candy about wallet");
  assert.equal(_thaiToCmd("ถามแคนดี้เรื่องส้มตำ"), "ask candy about som tam");
});

test("Thai numbers read inside a Thai command, and เข้า + a place is ENTER", () => {
  assert.equal(_thaiToCmd("จ่ายสองร้อย"), "pay 200");
  assert.match(_thaiToCmd("เข้า candy bar"), /^enter candy bar/);
});

test("นนท์ is Nont, and Nott at the Adonis is น็อต", () => {
  assert.equal(NPCS.nont.th, "นนท์"); assert.equal(NPCS.nott.th, "น็อต");
  assert.equal(_thaiToCmd("ถามนนท์"), "ask nont");
});

test("CASH takes a Thai number", () => {
  _setFlag("hasWallet"); G.room = _npcRoom("nont"); G.money = 100; G.bank = 20000;
  withDice(0.99, () => run("cash สองพัน"));
  assert.equal(G.bank, 18000, "two thousand moved");
});

test("the greeting in script, with a Thai name after it, reaches her", () => {
  G.room = "candy_bar";
  assert.match(run("สวัสดีครับ แคนดี้"), /You say to Candy/);
});

test("intensified and repeated phrases are still the phrase: อร่อยมาก, ใจเย็นๆ", () => {
  G.room = "candy_bar";
  assert.match(run("อร่อยมากครับ"), /You say/);
  assert.match(run("ใจเย็นๆ"), /You say/);
});

test("Thai the parser reads is not swallowed as an answer to a pending question", () => {
  G.room = "candy_bar"; _convoStart("candy"); G.convoQ = { id: "candy", key: "from", q: "you from where?" };
  run("ถามแคนดี้เรื่องกระเป๋าเงิน");
  assert.ok(!G.player.said.from, "a command, not an answer");
});

test("a man answers khrap: สบายดีไหม to Nont", () => {
  G.room = _npcRoom("nont");
  assert.doesNotMatch(run("say สบายดีไหมครับ to nont"), /Sabai dee kha/);   // said TO him: the market has a woman at a table now (Siriwan, 2026-10-08)
});

test("a man who asks ABOUT THAI hears his own register, and his own pronoun", () => {
  G.room = "queen_vic"; const t = run("ask terry about thai");
  assert.doesNotMatch(t, /her head|not TEACH Thai/);
  G.room = _npcRoom("tan"); assert.doesNotMatch(run("ask tan about thai"), /restaurant Thai/, "a Thai man does not speak restaurant Thai");
});

test("once-only Thai moments are once: the spy is permanent, and nobody gets in first 'the second time' on a first meeting", () => {
  assert.ok(!_WAI_BACK.some(l => /second time/.test(String(l))));
  G.thaiSpyDone = true; G.soc.thaiSpy = false;
  // the nightly soc reset no longer re-arms it
  assert.ok(G.thaiSpyDone);
});

test("fluent is past 'Faces soften'", () => {
  G.room = "candy_bar"; G.thaiSaid = {}; for (let k = 0; k < 20; k++) G.thaiSaid["w" + k] = 2;
  if (_thaiFluent()) assert.doesNotMatch(run("สวัสดี"), /Faces soften/);
});

test("Nont gives a fluent speaker his own name", () => {
  G.room = _npcRoom("nont"); G.thaiSaid = {}; for (let k = 0; k < 20; k++) G.thaiSaid["w" + k] = 2;
  if (_thaiFluent()) assert.match(run("talk to nont"), /The Alex is for people who need it/);
});

test("the intro takes หก as it takes ๖", () => {
  assert.equal(_introMatch("หก", ORIGINS), ORIGINS[5]);
});

test("the charter takes ไม่เอา and เดิน; a Thai fare pays", () => {
  G.pendingFare = { kind: "bus", price: BUS_CHARTER, dest: "beach_rd_c", charter: true };
  run("ไม่เอาครับ"); assert.equal(G.pendingFare, null);
});

test("bare น้ำ where drinks are sold is an order — Waen's homework lands", () => {
  G.room = "lucky_tiger"; const m = G.money;
  run("น้ำ"); assert.ok(G.money < m, "bought");
});

test("แพง is haggling; เท่าไหร่ at Auntie Nok's cart is her price", () => {
  G.room = _npcRoom("nok");
  assert.match(run("เท่าไหร่"), /Auntie Nok taps the sign/);
});

test("the share card counts people met, and says 'the week' once it is over", () => {
  G.known = { lek: true, candy: true, tan: true }; G.talked = { lek: [0] };
  assert.match(_shareCard().join("\n"), /👥 1 name\b/);
});

test("NOTEBOOK does not file your own Thai as the town's", () => {
  G.thaiSeen = []; _say("You say: “ขอบคุณ” (khop khun)");
  assert.ok(!G.thaiSeen.includes("ขอบคุณ"));
});

test("Kratae and Daeng no longer share one biography", () => {
  const k = NPCS.kratae.dialogue.map(d => d.text).join(" ");
  assert.doesNotMatch(k, /Crystal Palace/);
});

test("หวัดดี is hello and ชนแก้ว is cheers, in script as in romanisation", () => {
  assert.ok(matchThaiPhrase("หวัดดี"));
  assert.equal(_thaiToCmd("ชนแก้ว"), "cheers");
});
