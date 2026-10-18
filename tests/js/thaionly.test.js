// THE THAI-ONLY WEEK (2026-10-17) — Anan Wongsakul (Opus), a Thai-born forklift driver from Perth who typed only
// Thai script on the Soi 6 week: 28 stops, and "numbers and 'go west' work fine, the moment you talk to her like a
// person it tells you to try English." The trainer added twenty-seven words for him (thaicab 2c8f750); these are the
// parser rows they made possible, and the three faults the probe of them found.
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
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.bank = 50000; G.nightTurn = 40; G.flowerDay = G.day;
  G.room = "sunset_rail"; out = [];
});

test("the trainer's new words are commands: the barfine's two words, the ATM, the inbox, a drink for her, the leaving", () => {
  const want = {
    "ชั่วคราว": "short time", "ค้างคืน": "long time", "กดเงิน": "withdraw", "ดูข้อความ": "check messages",
    "เลี้ยงน้อง": "buy her a drink", "อาบน้ำ": "shower", "ฝันดีนะ": "goodnight", "ไปก่อนนะ": "bye", "บาย": "bye",
    "ทำบุญ": "temple", "ข้างนอก": "out", "ขอสิงห์": "buy beer", "ขอไลน์หน่อย": "contact", "เล่นเกม": "play",
    "อายุเท่าไหร่": "how old are you?", "น้องชื่ออะไร": "what's your name", "พี่คิดถึงน้อง": "i miss you",
    "พรุ่งนี้กลับบ้าน": "i go home tomorrow", "ผมมาจากโคราช": "i'm from korat", "ผมชื่อ anan": "my name is anan",
  };
  for (const [th, en] of Object.entries(want)) assert.equal(_thaiToCmd(th), en, th);
});

test("อายุเท่าไหร่ asks her age, not the price list", () => {
  run("talk to pukky"); G.convoQ = null; out = [];
  run("อายุเท่าไหร่"); assert.doesNotMatch(said(), /Beer ฿|lady drink ฿|price list/i, said()); assert.match(said(), /Pukky/);
});

test("the Thai compliment comes from the woman you are talking to, never from the next stool", () => {
  run("talk to pukky"); G.convoQ = null; out = [];
  run("น้องชื่ออะไร"); run("พี่คิดถึงน้อง"); run("อายุเท่าไหร่");
  const praisers = Object.keys(G.soc.thaiPraised || {});
  assert.deepEqual(praisers.filter(id => id !== "pukky"), [], "nobody else butts in: " + praisers);
});

test("a feeling said while her question is waiting is said to her, not filed as the answer", () => {
  run("talk to pukky");
  G.convoQ = { id: "pukky", key: "nickname", q: "What they call you when you were small?", turn: G.turns, shown: true };
  out = []; run("พี่คิดถึงน้อง");
  assert.equal((G.player.said || {}).nickname, undefined, "not his childhood name");
  assert.doesNotMatch(said(), /^\s*"I\." Pukky/m);
});

test("'I'm from Korat' answers her where-you-from, and a Thai woman knows Korat", () => {
  run("talk to pukky");
  G.convoQ = { id: "pukky", key: "home", q: "Where you from?", turn: G.turns, shown: true };
  out = []; run("ผมมาจากโคราช");
  assert.equal(G.player.said.home, "korat"); assert.equal(G.convoQ, null);
  G.convoQ = null; out = []; run("i am from buriram");
  assert.doesNotMatch(said(), /I don't know it/, said()); assert.match(said(), /Buriram/);
});
