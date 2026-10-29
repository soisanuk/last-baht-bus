// ROUND 112 (2026-10-29) — three personas at what had just shipped: Luc (Fable, a wine importer who wants through the
// Orchid's rope and keeps a notebook of who said what), Graham (Opus, an owner selling the Stinky at ninety nights and
// reconciling every offer to the baht), Darren (Sonnet, a phone player who only taps). Plus the minor deferred rows
// closed the same day (Cormac's told facts, Nuch's key, the street said aloud, Nont's name on everyone's tongue).
import { test } from "node:test";
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
const t = c => { out = []; run(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; _setFlag("tanFavourRefused"); G.tanFavourDay = G.day; };
const sandbox = () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; quiet(); G.money = 20000; G.bank = 50000; G.nightTurn = 30;
};
const talk = id => { G.room = _npcRoom(id); G.convo = null; run("talk to " + NPCS[id].name.toLowerCase()); out = []; };
const soldTo = via => { G.stage = "expat"; _setFlag("expatLife"); G.barSale = { day: G.day - 1, via, health: "profit", paid: 0, fee: 0, till: 0 };
  _setFlag("barSoldOn"); if (via === "plg") _setFlag("barToPlg"); if (via === "bert") _setFlag("barToBert"); };

// ── Graham: the sale ──
test("Graham: Gavin knows he bought the Stinky — no pitch, no errand", () => {
  sandbox(); soldTo("plg"); _setFlag("heardPlgPitch");
  talk("gavin"); G.talked.gavin = []; G.convo = null;
  assert.match(t("talk to gavin"), /sold us the Stinky/);
  const r = t("ask gavin about the offer"); assert.match(r, /paper you signed/); assert.doesNotMatch(r, /owner's unwell/);
  assert.equal(_questAvailable("plg_flip"), false, "Gavin's errand is withdrawn once the bar is sold");
  sandbox(); _setFlag("barPaid"); _setFlag("heardPlgPitch"); assert.equal(_questAvailable("plg_flip"), false, "…or while the bar is his");
});
test("Graham: the Orchid opened by a sale says where its door is, and the door works", () => {
  sandbox(); soldTo("plg"); G.room = _streetOf("pink_lotus"); G.nightTurn = 40;
  assert.match(t("enter orchid"), /back of Pink Lotus.*BACK/);
  run("enter pink lotus"); run("back"); assert.equal(G.room, "orchid_room");
});
test("Graham: a manager pours the house shot only behind his own bar", () => {
  sandbox(); G.room = "queen_vic"; const saved = _npcsHere; try { globalThis._npcsHere = () => ["bert"]; assert.equal(_managerHere(), null); } finally { globalThis._npcsHere = saved; }
  sandbox(); G.room = "stinky_bar"; if (_npcsHere().includes("bert")) assert.equal(_managerHere(), "bert");
});
test("Graham: Bert's 'who owns it' fits who does", () => {
  sandbox(); _setFlag("barPaid"); talk("bert"); assert.match(t("ask bert who owns this bar"), /You do, bud/);
  sandbox(); soldTo("bert"); talk("bert"); assert.match(t("ask bert who owns this bar"), /Candy, on the paper/);
});
test("Graham: no staff text asserts a weekday the game did not compute", () => {
  assert.doesNotMatch(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8"), /tomorrow is friday/);
});
test("Graham: a woman kept off the floor is not 'across the road' in BOOKS", () => {
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.cash = 2000; G.bar.nights = 10;
  const w = Object.keys(NPCS).find(i => NPCS[i].room === "stinky_bar" && NPC_ROLES[i] === "hostess");
  G.bar.gone = { [w]: { day: G.day, kept: true } }; G.room = "stinky_bar";
  assert.doesNotMatch(t("books"), /Across the road/);
  G.bar.gone = { [w]: { day: G.day } }; assert.match(t("books"), /Across the road/);
});
test("Graham: the buyer's possessive reads as English, and the sale's debts are named", () => {
  sandbox(); soldTo("tan"); assert.equal(_barBuyerPoss(), "the Chonburi man's");
  sandbox(); G.stage = "expat"; _setFlag("expatLife"); _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.bar.cash = 5000; G.bar.nights = 95; G.bar.owed = 1605000;
  G.room = "hotel_room"; out = []; _barSaleDo("plg");
  assert.match(said(), /You make the call from here/);
  assert.match(said(), /the note to Ohio, ฿1,605,000/);
  assert.ok(G.bankNotes.some(n => /clear of the ฿1,605,000 note/.test(n)), G.bankNotes.join(" | "));
});
test("Graham: the rail's word on the sale is a pool, sentence-cased, and Gavin is not in it", () => {
  assert.ok(_SALE_SAID.punter.length >= 5 && _SALE_SAID.floor.length >= 4 && _SALE_SAID.house.length >= 4);
  for (const k of ["floor", "house", "punter"]) for (const f of _SALE_SAID[k]) assert.doesNotMatch(f("N", "a man from Chonburi Tan found", "profit"), /(?:^|["“]|\. )a man from/);
  sandbox(); soldTo("plg"); G.known.gavin = 1; assert.equal(_saleTalk("gavin", "the stinky"), false);
});
test("Graham: Tan counts the buyers SELL UP lists, and DECLINE never genders the house", () => {
  assert.doesNotMatch(NPCS.tan.dialogue.map(d => d.text).join(" "), /two buyers/);
  sandbox(); G.jobOffer = { room: "stinky_bar", corp: true, day: G.day, prem: true }; G.room = "soi6_street";
  const saved = _rand; try { for (let i = 0; i < 6; i++) { G.jobOffer = { room: "stinky_bar", corp: true, day: G.day }; out = []; _declineJob(); assert.doesNotMatch(said(), /The house[^.]*\bshe\b/); } } finally { _rand = saved; }
});
test("Graham: the supply line names a cancelled arrangement too", () => {
  assert.match(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8"), /didn't give out, or took back/);
});
test("Graham: Candy on a sale to Bert is the fifty-one, not hearsay", () => {
  sandbox(); soldTo("bert"); G.known.candy = 1; G.metDay = { candy: 1 }; talk("candy");
  assert.match(t("ask candy about the sale"), /My name on the paper/);
});

// ── Luc: the Orchid ──
const orchid = () => { sandbox(); _align("plg", 2); G.room = "orchid_room"; G.nightTurn = 50; };
test("Luc: every mouth in the Orchid quotes the guest's list, not the floor's", () => {
  orchid(); talk("sudjai"); G.room = "orchid_room";
  const r = t("ask sudjai about prices"); assert.match(r, /For guest, that is all/); assert.doesNotMatch(r, /lady drink|short time|the bell/);
});
test("Luc: 'it is looked after' pours a drink that costs nothing", () => {
  orchid(); talk("powers"); G.room = "orchid_room"; const m = G.money;
  const r = t("ask about that quiet table"); assert.match(r, /looked after/); assert.match(r, /On the house/); assert.equal(G.money, m);
});
test("Luc: Gavin and Doyle answer about Vasseur; Doyle closes his own job", () => {
  sandbox(); talk("gavin"); assert.match(t("ask gavin about vasseur"), /Laurent\?/);
  sandbox(); talk("doyle"); assert.match(t("ask doyle about vasseur"), /name on the lease/);
  G.visited.orchid_room = 1; _setFlag("orchidReported");
  assert.match(t("ask doyle about the orchid"), /You've been through it/);
  assert.match(t("ask doyle about thai man"), /Forget his face/);
});
test("Luc: Bert's freeze is his mood, not a hello he trades for a warmer one", () => {
  sandbox(); G.room = "stinky_bar"; _npcState("bert").dstate = "acquaint"; G.metDay = { bert: 1 }; _align("plg", 1); _setFlag("plgFlipTried");
  run("talk to bert"); G.day++; G.convo = null; G.convoQ = null;
  const r = t("talk to bert"); assert.match(r, /errand boy/); assert.doesNotMatch(r, /There he is/);
});
test("Luc: the floor calls Vasseur the owner who is rarely down, never 'every night'", () => {
  orchid(); for (const w of ["nune", "pae"]) { talk(w); G.room = "orchid_room"; const r = t(`ask ${w} about vasseur`); assert.match(r, /not often|isn't often/); assert.doesNotMatch(r, /every night|Best customer/); }
});
test("Luc: 'quiet bar' never fits the Orchid or a go-go", () => {
  orchid(); assert.ok(!_roomFit(["Here is quiet bar. I like.", "Good bar for me."]).some(l => /quiet bar/.test(l)));
});
test("Luc: Pattaya Leisure is not Pattaya", () => {
  assert.equal(_topicHits("pattaya", "pattaya leisure"), false);
  assert.equal(_topicHits("pattaya leisure", "pattaya leisure"), true);
  sandbox(); talk("nigel"); assert.doesNotMatch(t("ask nigel about pattaya leisure"), /1998/);
});
test("Luc: Candy says which orchid is which", () => {
  sandbox(); talk("candy"); const r = t("ask candy about orchid"); assert.match(r, /Pink Lotus/); assert.match(r, /ASK CANDY ABOUT ROSE/);
});
test("Luc: no floor line promises a story it never tells", () => {
  assert.ok(!_FIXTURE_FLOOR.some(l => /Then maybe I tell/.test(l)));
});

// ── Darren: by thumb ──
test("Darren: the last warning before a collapse says the night goes with it", () => {
  sandbox(); G.room = "soi6_street"; G.thirst = 89; G.warned = {}; G.nightTurn = 31; out = []; G.thirst = 90; run("wait");
  assert.match(said(), /BUY WATER — or you go down where you stand/);
});
test("Darren: the clinic the prose names is a tap away", () => {
  sandbox(); G.room = "second_rd_c"; out = []; _describeRoom(true); assert.match(said(), /\(GET TESTED\)/);
});
test("Darren: the Bangkok tourist's moves are chips", () => {
  sandbox(); G.room = "second_rd_c"; _startEnc("bkktourist");
  const chips = _chipSet().map(c => c.cmd || c[0] || c); for (const w of ["wai", "sawatdee", "walk on"]) assert.ok(chips.includes(w), JSON.stringify(chips));
});
test("Darren: a quest id is said in words — ACCEPT ORCHID INTRO, and that is what ACCEPT reads", () => {
  assert.equal(_qWord("orchid_intro"), "ORCHID INTRO");
  sandbox(); G.quests.orchid_intro = "offered"; run("accept orchid intro"); assert.equal(G.quests.orchid_intro, "active");
});
test("Darren: after a gap the house's memory still has a chip", () => {
  sandbox(); talk("lek"); G.metDay = { lek: G.day }; G.day += 2; G.room = _npcRoom("lek");
  assert.ok(_situationTopics("lek").first.includes("last time"));
});

// ── the deferred rows ──
test("Cormac: a home with a comma, a past job and an age are kept, and said back", () => {
  sandbox(); talk("pukky");
  run("i come from galway, in ireland"); run("i was a teacher"); run("i am 58"); run("i was a bit drunk");
  assert.deepEqual({ h: G.toldTo.pukky.home.v, j: G.toldTo.pukky.job.v, a: G.toldTo.pukky.age.v }, { h: "galway", j: "teacher", a: "58" });
  assert.ok(_TOLD_KEYS.includes("age") && _TOLD_BACK.floor.age && _TOLD_BACK.house.age);
});
test("Nuch: the room key is a rooms question, not the menu", () => {
  sandbox(); talk("nuch"); assert.match(t("ask nuch about key card"), /room|Six/i);
});
test("Owain: a street's landmark is said as a landmark", () => {
  assert.equal(_streetPhrase("buakhao_n"), "Soi Buakhao by Soi Diana");
  assert.equal(_streetPhrase("buakhao_market"), "Soi Buakhao by the Old Market");
  assert.equal(_streetPhrase("soi6_west_in"), "Soi 6's inner west");
  assert.equal(_streetPhrase("beach_rd_n"), "Beach Road, foot of Soi 6");
});
test("Owain: Nont's name is not everybody's 'name' topic", () => {
  sandbox(); talk("pukky"); assert.doesNotMatch(t("ask pukky about nont"), /nickname/);
  talk("nont"); assert.match(t("ask nont about nont"), /Alex or Nont/);
});
