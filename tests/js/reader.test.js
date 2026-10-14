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

test("a German sentence to one of the three German-speaking women is German to her, not 'didn't understand'", () => {
  for (const id of _GERMAN_LADIES) {
    G.room = _npcRoom(id); run("talk to " + id); G.convoQ = null;
    for (const c of ["woher kommst du", "hast du kinder", "danke schön"]) {
      out = []; run(c); assert.ok(_GERMAN_QUIP[id].some(f => said().includes(f(NPCS[id].name).slice(0, 30))), id + " / " + c + ": " + said());
    }
  }
  G.room = "queen_vic"; run("talk to terry"); out = []; run("woher kommst du");
  assert.match(said(), /didn't understand|didn't parse|soi blinks|no idea/i, "Terry has no German");
});

// ── the routing rule (Steve's third run, the hundred questions) ───────────────────────────────────────────────────
test("a question about her reaches her before a verb takes one of its words", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null;
  const cases = [["where did you learn english?", /You'd have to ask around/], ["who looks after your kids?", /black book/],
    ["can you speak english?", /best shot/], ["is the mamasan nice?", /Not my story/], ["you like it here?", /blinks|No idea/]];
  for (const [c, bad] of cases) { out = []; run(c); assert.doesNotMatch(said(), bad, c + ": " + said()); assert.match(said(), /Kwan|she|She/, c); }
});

test("an endearment marks a line as said to her: back in a minute love, come on love let's go home, ok love buy beer", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null;
  out = []; run("back in a minute love"); assert.doesNotMatch(said(), /side of the building/); assert.ok(_HEARD.floor.back.some(l => said().includes(l.slice(0, 20))), said());
  const m = G.money; out = []; run("ok love, buy beer"); assert.ok(G.money < m, "the beer was bought");
  G.party = { ids: ["kwan"], stops: 1, spent: 0, seen: {} }; run("talk to kwan"); out = []; run("come on love, let's go home");
  assert.equal(G.room, _hotelRoomId(), said());
});

test("where can I eat is answered by anyone, with real open food inside the week", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null;
  out = []; run("where can I get food round here"); assert.match(said(), /7-Eleven|Queen Vic|kitchen/); assert.doesNotMatch(said(), /ask around/);
  G.convo = null; G.room = "soi6_street"; out = []; run("where's good to eat?"); assert.match(said(), /7-Eleven|Queen Vic/);
});

test("a drunk Brit on the step does not eat the withdrawal", () => {
  G.room = "soi6_street"; const m = G.money; _startEnc("brit"); out = []; run("withdraw 10000"); assert.equal(G.money - m, 10000, said());
});

test("Jenny's Singapore: her aiyoo and her lah are hers, and nobody else's", () => {
  G.room = _npcRoom("jenny"); run("talk to jenny"); out = []; run("ask jenny about singapore"); assert.match(said(), /Golden Mile/);
  const src = ["engine-core", "engine-play", "engine-parser", "engine-systems", "engine-encounters"].map(f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8")).join("\n");
  // every "aiyoo" and "lah" in the engine sits inside Jenny's own German quip
  const jb = src.indexOf("// Jenny —"), je = src.indexOf("// Chompoo", jb);
  const hits = [...src.matchAll(/\baiyo+\b|\blah\b/gi)].map(m => m.index).filter(i => !/\/\/[^\n]*$/.test(src.slice(src.lastIndexOf("\n", i), i)));
  assert.ok(hits.length >= 2 && hits.every(i => i > jb && i < je), String(hits.length));
});

// ── the 32 subjects (2026-10-14) ─────────────────────────────────────────────────────────────────────────────────
test("a feeling is answered by how well she knows you; her bike is the bike the night ride puts her on", () => {
  G.room = "sunset_dreams"; run("talk to kwan"); G.convoQ = null;
  out = []; run("do you love me?"); const cool = said();
  assert.ok(_SMALL_TALK.love.cool.some(l => cool.includes(l.slice(1, 30))), cool);
  G.soc.drinks.kwan = 14; G.smallTalk = {}; out = []; run("do you love me?");
  assert.ok(_SMALL_TALK.love.warm.some(l => said().includes(l.slice(1, 30))), said());
  out = []; run("do you have a motorbike?");
  assert.ok(said().toLowerCase().includes(_rideBikeMine("kwan").toLowerCase().split(/[,—]/)[0].replace(/^a /, "").trim()), said());
});

test("every new subject pool is deeper than a week's ten women, and none of its lines gives a woman kin or a province", () => {
  const keys = ["spicy", "drink", "smoke", "moto", "temple", "football", "music", "sing", "dance", "ghosts", "sign", "mantype", "farang", "oldmen", "marry", "manymen", "girls", "weather", "looks", "lonely", "sendhome", "gohome", "drinkcut"];
  for (const k of keys) { assert.ok(_SMALL_TALK[k].length >= 10, k); for (const l of _SMALL_TALK[k]) assert.doesNotMatch(l.replace("Buriram United", ""), /\bmy (son|daughter|husband|father|brother|sister)\b|Udon|Buriram|Sisaket|Ubon|Khon Kaen|Korat/, k + ": " + l); }
  for (const k of ["love", "likeme"]) for (const t of ["cool", "warm"]) assert.ok(_SMALL_TALK[k][t].length >= 10, k + t);
});
