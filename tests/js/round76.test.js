// Round 76 (2026-10-09), aimed at the coverage map's dark cells.
// Bridget Halloran (Fable, lens: the-night-asked): one memorable thing a night, and the next evening she asks
// everybody who could have seen it — "the money remembers. The people don't."
// Stelian Moraru (Opus, lens: procurement-evening): an owner who says yes to every job and then goes out the
// same evening — "the people behind my rail only know the half of my evening that happened at the rail."
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
const ask = (id, t) => { G.convoQ = null; out = []; run(`ask ${id} about ${t}`); return said(); };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.lastSaleng = 99999; G.money = 7000; G.bank = 5000; G.nightTurn = 40; G.season0 = 2; out = [];
});
const owner = () => {
  G.stage = "expat"; G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true;
  G.bar.room = "stinky_bar"; G.bar.owner = true; G.room = "stinky_bar"; G.nightTurn = 20;
  _setFlag("tanFavourDone");   // his one ask is settled, so it does not answer every question at the rail
  _setFlag("plgResolved"); _setFlag("barPremises"); _setFlag("nomineeWarned"); _setFlag("barLicence");   // the chain an owner has walked
};

// ── Bridget: the town's memory of the night ──────────────────────────────────
test("the ride is the floor's news only while it is the latest night with her, and LAST NIGHT means last night", () => {
  G.day = 6; G.rideLog = { lek: { count: 1, day: 4, stops: 3, seen: ["disco"] } };
  G.lastNightWas = { day: 5, reason: "barfine", bar: "lucky_tiger", barTurns: 30, with: "lek" };   // she was walked out again since
  G.room = "lucky_tiger"; const mate = _npcsHere().find(x => x !== "lek" && NPC_ROLES[x] === "hostess");
  run("talk to " + NPCS[mate].name.toLowerCase());
  assert.doesNotMatch(ask(mate, "last night"), /on her own bike|vroom|back at dawn on her/i);
});
test("the night OUT is remembered by the woman you spent it with: the club and the sunrise", () => {
  G.day = 7; G.partyLog = { lek: { day: 6, rooms: ["club_mirage", "lucky_tiger"], sunrise: true } };
  G.room = _npcRoom("lek"); run("talk to lek");
  assert.doesNotMatch(ask("lek", "the club"), /We no go there/);
  assert.match(ask("lek", "the sunrise"), /sun|morning/i);
});
test("her own text does not answer LAST NIGHT, a wrong-number text is not read back, and Cream dates her night", () => {
  G.room = _npcRoom("lek"); G.phone.contacts.lek = true;
  G.phone.inbox = [{ from: "lek", text: "i dream about you last night na 💭❤️", day: G.day - 1 }];
  G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: "stinky_bar", barTurns: 30 };
  run("talk to lek"); assert.doesNotMatch(ask("lek", "last night"), /I text you/);
  G.phone.inbox = [{ from: "cream", text: "the money come na papa i buy the shoes", day: G.day, slip: true }];
  assert.equal(_textTalk("cream", "shoes"), false, "the wrong-number text was never for you");
  assert.ok(!_TEXT_SUBJECT_FLOOR.some(f => /boss/.test(f("X", "q"))), "no 'boss' from a woman who never called him that");
});
test("a mouth off the bar floor is nobody's witness — unless the police stopped you on its pavement", () => {
  G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: "lucky_tiger", barTurns: 30 };
  G.room = _npcRoom("orathai"); G.policeAt = { room: G.room, day: G.day - 1 };
  run("talk to orathai"); assert.doesNotMatch(ask("orathai", "last night"), /Weren't here|mate/);
  assert.match(said(), /saw|police|brown|pole/i);
});
test("the bar you walked her out of did not see your hours at another bar", () => {
  G.lastNightWas = { day: G.day - 1, reason: "sleep", bar: "lucky_tiger", barTurns: 30, leftFrom: "metro_beer", with: "cream" };
  const mb = Object.keys(ROOMS).find(k => _barName(k) && /metro beer/i.test(_barName(k)));
  if (!mb) return;
  G.lastNightWas.leftFrom = mb; G.room = mb; const near = _npcsHere().find(x => NPC_ROLES[x]);
  if (!near) return;
  run("talk to " + NPCS[near].name.toLowerCase());
  assert.doesNotMatch(ask(near, "last night"), /\d hour/);
});
test("the piwin on LAST NIGHT and her bike; a 7-Eleven door points inside; the torch resets per trip", () => {
  G.room = Object.keys(ROOMS).find(k => ROOMS[k].motosai && !ROOMS[k].dark) || "beach_rd_c";
  out = []; run("ask piwin about last night"); assert.doesNotMatch(said(), /Work\? This/);
  G.room = "jomtien_beach_rd_s"; out = []; run("buy toastie"); assert.match(said(), /enter the 7-Eleven/);
  G.lightOn = true; _newVacation(); assert.equal(G.lightOn, false);
});

// ── Stelian: the owner's floor ──────────────────────────────────────────────────
test("the soi's discovery is told at her rail, and says what she heard — no shoes she never saw", () => {
  owner(); G.affair = { id: "manow", since: G.day - 20, strain: 0, floorSour: 0, slipDay: G.day - 3, slipWith: ["Buppha"] };
  out = []; _affairNight({ worked: false });
  assert.ok(G.affair.discovered && G.affair.sceneDue);
  assert.doesNotMatch(said(), /folds it on the rail|takes off the apron/, "not at the wake");
  assert.ok(_affairSceneDue(), "at her rail it is due");
  assert.doesNotMatch(_affairSawLine(G.affair), /shoes/);
  assert.match(_affairSawLine(G.affair), /hear/);
});
test("after the catch her floor beats are staff ones, and the town's knowledge still answers in her mouth", () => {
  owner(); G.affair = { id: "manow", since: G.day - 20, strain: 3, floorSour: 0, soured: true, discovered: true, caughtWith: ["Buppha"], caughtHow: ["soi"] };
  const said0 = _AFFAIR_FLOOR.length; assert.ok(said0 > 0);
  out = []; G.soc.drinks.manow = 15; run("talk to manow"); out = []; run("ask manow about massage");
  assert.doesNotMatch(said(), /farang things|Ask me something about us/);
});
test("the owner's floor knows Nont, the venue by name, the staff list, the monks' morning and a settled slate", () => {
  owner(); G.bar.loan = { principal: 20000, left: 10000, owed: 12000, day: G.day - 2 };
  run("talk to cake"); assert.match(ask("cake", "nont"), /12,000|owe/);
  run("talk to bert"); assert.match(ask("bert", "pink lotus"), /Pattaya Leisure/);
  assert.match(ask("bert", "klang corner"), /Klang Corner/);
  assert.match(ask("cake", "the staff list"), /Nong Khai|list|wage/i);
  G.bar.calls = [{ id: "merit", day: G.day, yes: true }, { id: "tab", day: G.day, yes: true, paid: true }];
  assert.match(ask("lamai", "the monks"), /morning/i);
  assert.doesNotMatch(ask("lamai", "the tab"), /I will tell you which/);
});
test("Lamai on Tan, Bert on the bar he no longer sells you, a person's bar is that person", () => {
  owner();
  run("talk to lamai"); assert.doesNotMatch(ask("lamai", "tan"), /In the room, never/);
  run("talk to bert"); assert.doesNotMatch(ask("bert", "the bar"), /He'll carry you/);
  assert.doesNotMatch(ask("bert", "nigel's bar"), /Yours, boss|He'll carry you/);
});
test("a named masseuse remembers LAST TIME; Nont finds your own staff for nothing; one leave limit", () => {
  G.money = 9000; G.nightTurn = 30; G.room = _npcRoom("buppha"); run("massage oil"); run("special"); while (G.pendingChoice) run("yes");
  G.day++; G.nightTurn = 30; G.room = _npcRoom("buppha"); run("talk to buppha");
  assert.match(ask("buppha", "last time"), /yesterday|day ago/i);
  owner(); G.room = _npcRoom("nont"); const m = G.money; out = []; run("ask nont about manow");
  assert.equal(G.money, m, "no fee to find your own staff");
  assert.ok(!/Bert can hold a room for an hour\./.test(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8")));
});
test("TALK TO somebody else in the room is not small talk with the stranger in front of you", () => {
  G.room = _npcRoom("nont"); _startEnc("bkktourist");
  if (G.pendingEnc !== "bkktourist") return;
  out = []; run("talk to nont");
  assert.notEqual(G.pendingEnc, "bkktourist");
  assert.match(said(), /lapses|Nont/);
});

// ── the deferred bugs, fixed (2026-10-09) ────────────────────────────────────────
test("a stranger's first question gets the hello AND the answer", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 0; G.talked = {};
  out = []; run("ask lek about massage");   // a subject she has no node for: the first ask was spent on her hello
  const lines = out.filter(l => !/^·/.test(l.trim()) && l.trim());
  assert.ok(lines.length >= 2, "the hello and then an answer to the question: " + said());
});
test("at your own bar a remembered call outranks her own node; the fight is the punter; the Third Road listing is askable", () => {
  owner(); G.bar.calls = [{ id: "tab", day: G.day, yes: true }, { id: "turning", day: G.day, yes: true }];
  run("talk to cake"); assert.doesNotMatch(ask("cake", "the tab"), /Barfine and drinks are separate/);
  run("talk to bert"); assert.match(ask("bert", "the fight"), /turned out|binned|put him out|door knows/i);
  assert.match(ask("cake", "the listing"), /Third Road|sign/);
});
test("MY BAR at another bar is your bar", () => {
  owner(); G.room = "silk_rose"; run("talk to ton");
  assert.doesNotMatch(ask("ton", "my bar"), /Silk Rose\}\} is a quiet bar/);
});
test("her night's coda is pooled and she remembers the one it was; no last-bus warning after the airport taxi", () => {
  G.lastNightWas = { day: G.day - 1, reason: "barfine", bar: "lucky_tiger", barTurns: 30, with: "lek", quiet: false, coda: "noodle" };
  assert.match(_lastNightHers("lek", G.lastNightWas), /noodle/i);
  G.pendingChoice = "vacation_end"; G.lastBusWarned = false; G.nightTurn = LAST_BUS_TURN - 3; G.room = "beach_rd_c";
  out = []; _lastBusWarn(); assert.equal(out.join(""), "");
});
test("Lek's office is an Act One hint, and a story after it", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 8; run("talk to lek");
  assert.doesNotMatch(ask("lek", "office"), /cage/);
});
test("a shop masseuse answers your back, misses a stranger's name, and still talks about her life after the hour", () => {
  G.money = 9000; G.room = "klang_massage"; G.nightTurn = 30; run("massage thai");
  assert.match(ask("wilaiwan", "my back"), /shoulder|back/i);
  assert.match(ask("wilaiwan", "manow"), /don't know|Not my business/);
});
test("a round that does not land pays +1 and says why; your own glass from an empty till comes out of the pocket", () => {
  assert.ok(/roundLanded === false\) _addHappy\(1, "/.test(readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8")));
  owner(); G.bar.cash = 0; const m = G.money; out = []; run("buy beer");
  assert.ok(G.bar.cash >= 0, "the till does not go negative"); assert.ok(G.money < m || /empty/.test(said()));
});
test("a direction walks past the tonic tout; GO HOME WITH CREAM asks rather than fines; a charter reaches the street you named", () => {
  G.room = "beach_rd_c"; _startEnc("tonic"); const r = G.room; run("e"); assert.notEqual(G.room, r);
  G.room = "metro_garden"; G.nightTurn = 50; run("talk to cream"); out = []; run("go home with cream"); assert.match(said(), /ASK CREAM ABOUT LATE/);
  G.money = 5000; G.room = "buakhao_klang"; G.nightTurn = 30; run("ride bus to walking street");
  for (let i = 0; i < 4 && (G.pendingFare || G.pendingChoice || G.pendingEnc); i++) run("pay 200");
  assert.equal(G.room, "ws_gate");
});
test("her colleagues saw her go out with you", () => {
  G.day = 7; G.partyLog = { lek: { day: 6, rooms: ["club_mirage"] } }; G.room = _npcRoom("lek");
  const m = _npcsHere().find(x => x !== "lek" && NPC_ROLES[x] === "hostess");
  run("talk to " + NPCS[m].name.toLowerCase());
  assert.match(ask(m, "lek"), /out|OUT|tell us everything|own clothes/);
});

// ── the trainer's five words from Mario's two notes (2026-10-09): กด · เรียก · ยังไง · อันนี้ · จ๊ะ ──
test("a polite particle and a pointing word are courtesy, not commands", () => {
  assert.equal(_thaiToCmd("เบียร์ค่ะ"), "beer");
  assert.equal(_thaiToCmd("อันนี้เท่าไหร่"), "how much");
  assert.equal(_thaiToCmd("ขอน้ำครับ"), "buy water");
  assert.equal(_thaiToCmd("กด"), "press");
  assert.equal(_thaiToCmd("คะแนน"), false, "a word that merely starts like a particle is not one");
});
test("what's this called in Thai: somebody names a thing the room mentions, and จ๊ะ to a grown woman gets laughed at once", () => {
  G.room = "stinky_bar"; G.nightTurn = 30; out = []; run("อันนี้ภาษาไทยเรียกว่าอะไรจ๊ะ");
  assert.match(said(), /follows your finger/);
  assert.match(said(), /mama talk to me when I am five/);
  out = []; run("riak waa arai"); assert.doesNotMatch(said(), /mama talk to me/, "once a night");
});
test("กดดื่มได้ฟรีค่ะ: the cooler at Klang Corner is read in Thai, pressed once a day, and explained by the woman who wrote it", () => {
  G.room = "klang_massage"; G.nightTurn = 30; G.thirst = 60;
  out = []; run("read note"); assert.match(said(), /กดดื่มได้ฟรีค่ะ/);
  out = []; run("press tap"); assert.ok(G.thirst < 60); assert.match(said(), /you can read, then/);
  const th = G.thirst; out = []; run("กด"); assert.equal(G.thirst, th, "one cup a day");
  assert.match(ask("wilaiwan", "the note"), /Free, na/);
});
test("Waen sends the child register once, to a student she has taught twice", () => {
  G.phone.contacts.waen = true; G.talked.waen = [0]; G.flags.lessonTaken = true; G.flags.waenLink = true; G.taughtBy = 2; G.battery = 80;
  _waenTick(); assert.ok(_flag("waenChild"));
  assert.ok(G.phone.inbox.some(m => /ยังไง/.test(m.text) && /หนู/.test(m.text) && /ลูก/.test(m.text)));
  const n = G.phone.inbox.length; G.day++; _waenTick(); assert.ok(!G.phone.inbox.slice(n).some(m => /ยังไง/.test(m.text)), "once");
});

// ── the examine audit's batch, found with Compromise (2026-10-09) ────────────────
test("the things the prose puts in front of you answer EXAMINE: each was a dead end the Compromise harvest found", () => {
  const DEAD = new Set([..._NO_SUCH_THING, "You don't see that here."]);
  const pairs = [["tequila_queen", "bench"], ["dolphin", "bench"], ["half_moon_massage", "mirror"], ["second_rd_diana", "mirror"],
    ["emperor_soapy", "shower"], ["soi6_street", "sound systems"], ["jomtien_beach_rd_s", "air-con"], ["jomtien_beach_rd", "streetlights"],
    ["cheap_charlies", "garlic"], ["tt_deep", "squid"], ["candy_bar", "glasses"], ["pk_east", "trucks"], ["thappraya_w", "barkers"],
    ["hyper", "dancers"], ["jomtien_beach_m", "umbrellas"], ["klang_massage", "mats"], ["beach_north_end", "mats"], ["second_rd_india", "booth"]];
  for (const [r, n] of pairs) {
    if (!ROOMS[r]) continue;
    newGame(); G.flags.act1Done = true; G.stage = "vacation"; G.room = r; G.lightOn = true; G.nightTurn = 30;
    for (const k in ENCOUNTERS) G.encDone[k] = true; out = []; run("examine " + n);
    assert.ok(!out.some(l => DEAD.has(l)), `${r}: EXAMINE ${n} -> ${out[0]}`);
  }
  G.room = _npcRoom("tan"); out = []; run("examine car"); assert.match(said(), /grey sedan/, "the car where Tan stands is his");
  G.room = "queen_vic"; out = []; run("examine horn-rims"); assert.doesNotMatch(said(), /Traffic/, "horn-rims are not traffic");
});
test("Soi 6's close looks: what each room's prose names answers EXAMINE, and a bowl is not the Owl", () => {
  const DEAD = new Set([..._NO_SUCH_THING, "You don't see that here."]);
  for (const [r, n] of [["pink_lotus", "neon tubes"], ["pink_lotus", "velvet rope"], ["pink_lotus", "door"], ["orchid_room", "strobe"], ["golden_dragon", "qr sticker"],
    ["sunset_dreams", "mural"], ["kitten_corner", "paw print"], ["kitten_office", "cash bags"], ["kitten_office", "sticker"], ["cherry_pop", "bowl"],
    ["ruby_kiss", "lipstick marks"], ["queen_vic", "panelling"], ["qv_room", "balcony"], ["qv_room", "tv"], ["soi6_street", "pool noodle"], ["soi6_street", "sequins"],
    ["soi6_mid", "dartboard"], ["soi6_deep", "menu"]]) {
    newGame(); G.flags.act1Done = true; G.stage = "vacation"; G.room = r; G.lightOn = true; G.nightTurn = 30;
    for (const k in ENCOUNTERS) G.encDone[k] = true; out = []; run("examine " + n);
    assert.ok(!out.some(l => DEAD.has(l)) && !/Last Orders/.test(said()), `${r}: EXAMINE ${n} -> ${out[0]}`);
  }
  G.room = "qv_room"; out = []; run("examine tv"); assert.doesNotMatch(said(), /shophouse/, "your own flatscreen, not a neighbour's");
});
