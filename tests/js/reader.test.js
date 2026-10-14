// THE SENTENCE READER (2026-10-14) and the baseline player's fixes. Steve Marsh (Opus), a retired lorry driver
// who played the Soi 6 week the ordinary way on a phone, was stopped 18 times in seven nights — most of them the
// parser matching a WORD where he had said a SENTENCE. Mario: "at this point you might as well just bolt on NLP."
// _read() reads the sentence first (its kind, who it is about, when, and its act), the way Façade read its
// discourse acts; _readRoute routes the acts the word-matcher misread. Thai arrives translated, with its question
// particle, pronouns and time words carried through.
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

beforeEach(() => {
  newGame();
  G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});

test("the reader reads a sentence's kind, who it is about, its time and its act", () => {
  const cases = [
    ["i fly home in two days", { kind: "statement", about: "me", act: "leaving", time: "in two days" }],
    ["i'm going home soon", { kind: "statement", about: "me", act: "leaving", time: "soon" }],
    ["last night of the trip", { act: "leaving" }],
    ["remember me? doncaster rovers", { act: "remember" }],
    ["who's playing tonight", { kind: "question", time: "tonight", topic: "playing tonight" }],
    ["do you have kids", { kind: "question", about: "you", topic: "kids" }],
    ["buy her a drink", { act: "buyfor", about: "her" }],
    ["watch the football", { act: "watchsport" }],
    ["yes", { kind: "yes" }], ["no thanks", { kind: "no" }], ["goodnight", { kind: "farewell" }],
    ["leave", { act: "leaving", about: null }],
  ];
  for (const [t, want] of cases) { const R = _read(t); for (const [k, v] of Object.entries(want)) assert.equal(R[k], v, `${t}: ${k}`); }
});

test("telling her you are leaving reaches her, in the words a man uses — never her old text, never the ledger", () => {
  G.room = "sunset_dreams"; G.day = 6; G.soc.drinks.kwan = 10;
  G.phone.contacts = { kwan: true }; G.phone.inbox = [{ from: "kwan", text: "lucky day!! I win lottery small small 🎉 send you luck money", turn: 1, read: true }];
  run("talk to kwan");
  for (const c of ["i fly home in two days", "i'm going home soon", "last night of the trip"]) {
    G.soc.leavingSaid = {}; out = []; run(c);
    assert.doesNotMatch(said(), /lottery|files it somewhere|Nothing to report from last night|open a coffee/i, c + ": " + said());
    assert.ok(G.soc.leavingSaid.kwan != null, c + ": she heard it");
  }
});

test("a regular at the rail hears the leaving too", () => {
  G.room = "queen_vic"; G.nightTurn = 20; run("talk to terry"); out = []; run("last night of the trip");
  assert.doesNotMatch(said(), /somebody who was there|a little while/); assert.match(said(), /flight|home|last night/i);
});

test("a question back is not the answer to hers; REMEMBER ME and BUY HER A DRINK reach the woman in front of you", () => {
  G.room = "sunset_dreams"; G.soc.drinks.kwan = 4; run("talk to kwan");
  if (G.convoQ) { out = []; run("who's playing tonight"); assert.doesNotMatch(said(), /a beat late|repeats|files it/); }
  out = []; run("remember me? doncaster rovers"); assert.doesNotMatch(said(), /didn't understand|blinks/);
  const m = G.money; out = []; run("buy her a drink"); assert.equal(m - G.money, _ladyPrice());
  assert.doesNotMatch(said(), /not working this bar|nobody here by that name/);
});

test("WATCH THE FOOTBALL in a bar is the telly; a typed topic word on her chips is the topic", () => {
  G.room = "sunset_dreams"; out = []; run("watch the football"); assert.doesNotMatch(said(), /Specific views need the right spot/);
  G.room = NPCS.dew.room; run("talk to dew"); const m = G.money; out = []; run("drink"); assert.equal(m, G.money, "her drinking, not a ฿190 chit");
});

test("YES to a job just offered takes it", () => {
  const q = Object.keys(QUESTS).find(k => QUESTS[k].giver === "doyle");
  G.room = _npcRoom("doyle"); G.nightTurn = 20; assert.ok(_npcsHere().includes("doyle"));
  G.quests[q] = "offered"; G.lastOffer = { qid: q, giver: "doyle", turn: G.turns };
  out = []; run("yes"); assert.equal(G.quests[q], "active", said());
});

test("Thai is read the same way: the leaving, remembering, and a question with its particle", () => {
  assert.equal(_thaiToCmd("พรุ่งนี้ผมกลับบ้าน"), "tomorrow i go home");
  assert.equal(_thaiToCmd("คุณจำผมได้ไหม"), "do you remember me?");
  assert.equal(_thaiToCmd("คุณมีลูกไหม"), "do you have kids");
  assert.equal(_thaiToCmd("คุณมาจากไหน"), "where are you from");
  assert.equal(_read(_thaiToCmd("พรุ่งนี้ผมกลับบ้าน")).act, "leaving");
  G.room = "sunset_dreams"; G.soc.drinks.kwan = 10; run("talk to kwan"); out = []; run("พรุ่งนี้ผมกลับบ้าน");
  assert.ok(G.soc.leavingSaid && G.soc.leavingSaid.kwan != null, said());
});

test("an answer is said back, not filed somewhere", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); if (!G.convoQ) return;
  out = []; run("Rotterdam"); assert.match(said(), /Rotterdam/); assert.doesNotMatch(said(), /files it somewhere/);
});

test("a woman who knows you says hello as one on a later night; another bar's girl does not pitch a man with company", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); run("buy drink for kwan"); G.day++; G.soc.retHello = {}; G.soc.helloed = {};
  out = []; run("talk to kwan"); assert.doesNotMatch(said(), /sets another paper crane/);
  G.room = "hula_hula"; G.party = { ids: ["kwan"], stops: 1, spent: 0, seen: {} };
  const b = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && /tonight he say you/.test(JSON.stringify(NPCS[i].dialogue)));
  if (b) { out = []; run("talk to " + NPCS[b].name.toLowerCase()); assert.doesNotMatch(said(), /tonight he say you, me/); }
});

test("the small wrongs: the dog's mat, the fridge's one count, darts that drift, the Vic's card", () => {
  G.room = _hotelRoomId(); G.thirst = 90; out = []; run("take water"); out = []; run("drink water");
  assert.doesNotMatch(said(), /first of housekeeping's two/, "the second bottle is the second");
  const visits = []; for (let k = 0; k < 40; k++) visits.push(_dartsVisit("steady", 0.95, Math.random).score);
  assert.ok(new Set(visits).size > 1, "not 60 every time");
  G.room = "queen_vic"; G.nightTurn = 20; const m = G.money; out = []; run("food"); assert.equal(G.money, m, "the card, not a basket");
});

// ── the rerun's gaps (Steve, the second time round) ──────────────────────────────────────────────────────────────
test("anything else said to her is answered in character — never 'didn't parse' while she is listening", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null;
  for (const c of ["i'm here till sunday", "i'll miss you", "the weather is hot tonight", "great night tonight"]) {
    out = []; run(c); assert.doesNotMatch(said(), /didn't parse|didn't understand|blinks at you/, c + ": " + said());
  }
  out = []; run("nice blue dress"); assert.match(said(), /Kwan/);
  out = []; run("lok"); assert.ok(out.length, "a stray word still answers somehow");
});

test("WHAT'S YOUR NAME is answered with her name", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null;
  out = []; run("what's your name"); assert.match(said(), /Kwan/); assert.doesNotMatch(said(), /wrong girl|Not my story|don't know/);
});

test("with her on your arm: LET'S GO HOME goes home with her; WHERE DO YOU WANT TO GO follows her", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null; G.party = { ids: ["kwan"], stops: 1, spent: 0, seen: {} };
  out = []; run("where do you want to go"); assert.match(said(), /FOLLOW KWAN|Next place|Out first/i);
  out = []; run("let's go home"); assert.equal(G.room, _hotelRoomId(), said());
});

test("a bare LAST NIGHT said to the woman who spent it with you is hers, not the ledger", () => {
  G.room = "sunset_dreams"; G.day = 4; run("talk to kwan"); G.convoQ = null;
  G.partyLog = { kwan: { day: 3, rooms: ["sunset_dreams"] } };
  out = []; run("last night"); assert.doesNotMatch(said(), /Nothing to report|The morning ledger/i, said());
});

test("Kwan's family lives in Nan, as her own home answer says; a pie for her is hers", () => {
  assert.equal(_authoredStory("kwan").from, "Nan");
  G.room = "queen_vic"; G.nightTurn = 20; G.party = { ids: ["kwan"], stops: 1, spent: 0, seen: {} }; G.hunger = 50;
  const h = G.hunger, m = G.money; out = []; run("buy pie for kwan");
  assert.ok(G.hunger >= h, "he did not eat it"); assert.ok(G.money < m); assert.match(said(), /Kwan/); assert.doesNotMatch(said(), /watching the street/);
});

test("a compliment from a man she has gone out with is not 'early for that'", () => {
  G.room = "sunset_dreams"; G.wentWith = { kwan: { kind: "out", day: G.day - 1 } };
  for (let k = 0; k < 6; k++) { out = []; run("compliment kwan"); assert.doesNotMatch(said(), /Early for that|strangers are weather/); }
});

test("a question about her is not answered with her old text; told twice on two nights, she says she remembers", () => {
  G.room = "sunset_dreams"; G.soc.drinks.kwan = 10; G.phone.contacts = { kwan: true };
  G.phone.inbox = [{ from: "kwan", text: "tomorrow i work double shift, so tired", turn: 1, read: true, day: G.day }];
  run("talk to kwan"); G.convoQ = null; out = []; run("what are you doing tomorrow?");
  assert.doesNotMatch(said(), /double shift/, said());
  G.day = 5; run("i fly home in two days"); const first = said();
  G.day = 6; out = []; run("i fly home tomorrow"); assert.notEqual(said(), first); assert.match(said(), /already|yesterday|remember|first time|still here/i, said());
});

test("the dawn coda's close is a book, and a woman who rode you on her bike does not catch the baht bus", () => {
  const seen = []; for (let k = 0; k < 3; k++) { out = []; G.lastBfId = "pukky"; _cinderellaCoda(); seen.push(out[out.length - 1]); }
  assert.equal(new Set(seen).size, seen.length);
  G.rideLog = { pukky: { day: G.day - 3 } }; G.lastRide = null;
  for (let k = 0; k < 4; k++) { out = []; G.lastBfId = "pukky"; _cinderellaCoda(); assert.doesNotMatch(said(), /baht bus/i); }
});

test("no cart vignette while she has asked you something; carts are three hours apart", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.match(src, /!G\.convoQ && _rand\(\) < 0\.20/); assert.match(src, /G\.lastSaleng >= 30/);
});
