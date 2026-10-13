// ROUND 92 (2026-10-13) — Thomas Wiriyakul (Fable), a half-Thai Londoner who spoke to the whole Soi 6 week in Thai
// first and fell back to English only when Thai got nothing. "It has a Thai dictionary, not Thai ears: say ฝน and it
// goes looking for a girl called Fon, say มีลูกไหม to a woman mid-conversation and it blinks, and I literally could
// not go to bed in Thai." The questions of the week now reach the women in Thai, and the floor stops repeating itself.
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
  G.player = { origin: "golfer", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day; out = [];
});

test("SEVERE: a night ends in Thai — นอน twice, and ใช่ at the confirm", () => {
  G.room = "qv_room"; G.nightTurn = 50; const d = G.day;
  run("นอน"); assert.equal(G.day, d, "the first นอน asks"); run("นอน");
  assert.equal(G.day, d + 1, "the second นอน is meaning it: " + said());
  G.room = "qv_room"; G.nightTurn = 50; const d2 = G.day;
  run("sleep"); run("ใช่"); assert.equal(G.day, d2 + 1, "ใช่ is yes");
});

test("the week's questions translate: rain, last night, the present, children, after work — and the questions themselves", () => {
  const T = {
    "ถามปุ๊กกี้เรื่องฝน": "ask pukky about rain", "ถามปุ๊กกี้เรื่องเมื่อคืน": "ask pukky about last night",
    "ถามปุ๊กกี้เรื่องของขวัญ": "ask pukky about present", "ถามปุ๊กกี้เรื่องลูก": "ask pukky about children",
    "มาจากไหน": "where are you from", "มีลูกไหม": "do you have kids", "เหนื่อยไหม": "are you tired",
    "ที่ไหนยังเปิด": "where is still open", "พาปุ๊กกี้ไปเที่ยว": "take pukky out", "กลับโรงแรมกับปุ๊กกี้": "go home with pukky",
    "ส่งเงินสองร้อยให้จอย": "send 200 to joy", "ขอเบอร์ปุ๊กกี้": "contact pukky", "ไปทางตะวันตก": "go west", "ออกไป": "out",
    "สวัสดีครับปุ๊กกี้": "hello pukky", "ขอบคุณนะปุ๊กกี้": "thank you pukky",
  };
  for (const [th, en] of Object.entries(T)) assert.equal(_thaiToCmd(th), en, th);
});

test("ฝน after ABOUT is the rain; ฝน asked of is Fon", () => {
  assert.equal(_thaiToCmd("ถามฝน"), "ask fon");
  assert.equal(_thaiToCmd("ถามฝนเรื่องฝน"), "ask fon about rain");
});

test("a Thai name shared by several women means the one in the room: นุ่น at the Hula Hula is Noon", () => {
  G.room = NPCS.hula_hula_noon.room;
  assert.equal(_thaiToCmd("ถามนุ่นเรื่องเงิน"), "ask noon about money");
  out = []; run("ถามนุ่นเรื่องเงิน");
  assert.ok(!_NOBODY_NAME.some(f => said().includes(typeof f === "function" ? f("nune") : f)) && !/Nobody by that name/.test(said()), said());
});

test("a Thai question to the woman you are talking to reaches HER, LAST NIGHT included", () => {
  G.room = "sunset_rail"; run("talk to pukky");
  out = []; run("มาจากไหน"); assert.match(said(), /Pukky/); assert.match(said(), /Ubon/);
  out = []; run("เมื่อคืน"); assert.match(said(), /ask pukky about last night/);
  assert.doesNotMatch(said(), /Nothing to report from last night/, "not the ledger");
});

test("a verb-shaped Thai line is not the answer to somebody's pending question", () => {
  G.room = "queen_vic"; G.nightTurn = 20;
  G.convo = "doyle"; G.convoQ = { npc: "doyle", key: "why", turn: G.turns };
  out = []; run("ถาม xxyz เรื่องอะไรนะไม่รู้"); assert.doesNotMatch(said(), /takes it in|handed something over/, said());
});

test("a count is not dropped in silence: two beers pours one and says so", () => {
  G.room = "sunset_rail"; const m = G.money;
  out = []; run("buy 2 beers"); assert.match(said(), /One at a time/); assert.equal(m - G.money, _beerPrice());
  assert.equal(_thaiToCmd("ซื้อเบียร์สองขวด"), "buy beer 2");
});

test("the overheard Thai is a book for life: each line once, then silence; 'since eight' waits for nine", () => {
  G.player.said = {}; const saved = _rand;
  try {
    _rand = () => 0; globalThis._thaiFluent = () => true;
    G.room = "sunset_rail"; G.nightTurn = 20; const seen = [];
    for (let k = 0; k < 20; k++) { G.thaiHeardTurn = -99; out = []; _thaiOverheard(); if (said()) seen.push(said()); G.nightTurn = 40; }
    assert.ok(seen.length >= 3, "the floor was overheard: " + seen.length);
    assert.equal(new Set(seen).size, seen.length, "no line twice");
    assert.ok(seen.length <= _THAI_OVERHEARD.length);
    assert.ok(!seen.slice(0, 1).some(l => /since eight/.test(l)), "not before nine");
  } finally { _rand = saved; }
});

test("a witness tells it once, and a second mouth tells it differently (Bussaba and Numfon on Pukky)", () => {
  G.room = "sunset_rail"; G.partyLog = { pukky: { day: G.day - 1, rooms: ["sunset_rail", "bay_watch"] } };
  const staff = _npcsHere().filter(i => i !== "pukky" && (NPC_ROLES[i] || NPCS[i].house));
  const lines = [];
  for (const s of staff.slice(0, 2)) { out = []; run(`ask ${NPCS[s].name.toLowerCase()} about pukky`); lines.push(said()); }
  assert.equal(lines.length, 2, "two staff on the Shady Lady's floor");
  assert.notEqual(lines[0].split("\n")[0], lines[1].split("\n")[0], lines.join("\n---\n"));
  out = []; run(`ask ${NPCS[staff[0]].name.toLowerCase()} about last night`);
  assert.doesNotMatch(said(), /floor watched her go in her own clothes/, "the same mouth gives the gist: " + said());
});

test("the woman on your arm has an opinion of the bar you are drinking in", () => {
  G.room = "bay_watch"; G.party = { ids: ["pukky"], stops: 1, spent: 0, seen: { bay_watch: true } };
  out = []; run("ask pukky about this bar");
  assert.doesNotMatch(said(), /wrong girl|not my story|Not my story/, said());
});

test("the rose stood in front of her is a thing she saw", () => {
  G.room = "sunset_rail"; _streetSaw("rose", { for: "pukky" });
  out = []; run("ask pukky about rose"); assert.match(said(), /rose/i); assert.doesNotMatch(said(), /wrong girl|not my story/);
});

test("a beer bar's floor has no DJ, and no text claims a night you were not there", () => {
  assert.ok(!_TOWN.me_known.floor.some(l => /\bDJ\b/.test(l)));
  assert.ok(!_CHATTER.some(l => /last night/i.test(l)));
});

test("a covered table is covered: the small-hours Stinky does not have its pool table 'waiting under a low lamp'", () => {
  G.room = "stinky_bar"; G.nightTurn = 115;
  if (!ROOMS.stinky_bar.lateDesc || !ROOMS.stinky_bar.pool) return;
  out = []; _describeRoom(true); assert.doesNotMatch(said(), /waits under a low lamp/);
});

test("an after-work line does not hand a woman a daughter her own words never mention (Nuch)", () => {
  G.room = "queen_vic"; G.nightTurn = 20;
  out = []; run("ask nuch about after work"); assert.doesNotMatch(said(), /daughter|husband|my son/i, said());
});

test("one cart visit tells each scene once", () => {
  const saved = _rand;
  try {
    _rand = () => 0; G.room = "sunset_rail"; G.salengCart = "food"; G.salengRoom = G.room; G.salengUntil = G.turns + 50;
    const lines = []; for (let k = 0; k < 12; k++) { out = []; _salengVignette(); if (said()) lines.push(said()); }
    assert.ok(lines.length >= 3, "the cart was played with: " + lines.length);
    assert.equal(new Set(lines).size, lines.length);
  } finally { _rand = saved; }
});

test("Tan answers HOME; the eaten-yet greeting is romanised as itself", () => {
  G.room = _npcRoom("tan"); run("talk to tan"); G.convoQ = null;
  out = []; run("ask tan about home"); assert.match(said(), /My family is at home/);
  assert.equal(THAI_PHRASES.find(p => p.key === "eatenyet").rom, "kin khao rue yang");
});

test("Tan answers a Thai passenger in Thai once, then steers the ride back to English (one language path)", () => {
  newGame(); G.player = { said: {} }; _taxiIntro("soi6");
  out = []; run("ผมมาจากลอนดอน"); assert.match(said(), /พูดไทยเก่งมาก/); assert.match(said(), /speak English/);
  assert.equal(G.introStep, 0, "still the first question");
  out = []; run("สอง"); assert.doesNotMatch(said(), /พูดไทยเก่งมาก/, "once");
  assert.equal(G.introStep, 1);
});

test("the trainer's sixteen are parser words: the closing hour, the small hours, the stairs, the bar's barfine", () => {
  const T = { "ปิดกี่โมง": "what time do you close", "เลิกงานกี่โมง": "when do you finish", "กี่โมงแล้ว": "time",
    "ที่ไหนยังเปิดหลังตีสอง": "where is still open after two", "ถามปุ๊กกี้เรื่องหลังตีสอง": "ask pukky about after two",
    "คุยกับปุ๊กกี้": "talk to pukky", "ลงบันได": "down", "ออฟปุ๊กกี้": "barfine pukky", "โอนเงินสองร้อยให้จอย": "send 200 to joy",
    "ถามปุ๊กกี้เรื่องแผน": "ask pukky about plan", "ถามปุ๊กกี้เรื่องอีสาน": "ask pukky about isan", "ราตรีสวัสดิ์": "goodnight",
    "ถามปุ๊กกี้เรื่องกุหลาบ": "ask pukky about rose", "ถามปุ๊กกี้เรื่องรองเท้าแตะ": "ask pukky about sandals",
    "ถามปุ๊กกี้เรื่องชุดชั้นใน": "ask pukky about lingerie", "ถามปุ๊กกี้เรื่องควิซ": "ask pukky about quiz" };
  for (const [th, en] of Object.entries(T)) assert.equal(_thaiToCmd(th), en, th);
  G.room = "sunset_rail"; G.nightTurn = 30;
  out = []; run("ที่ไหนยังเปิดหลังตีสอง"); assert.match(said(), /Blue Dog|Stinky/); assert.doesNotMatch(said(), /ask around/);
  out = []; run("ปิดกี่โมง"); assert.match(said(), /[Tt]wo/);
});
