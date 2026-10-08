// Round 75 (2026-10-09), aimed at the night ride and the happiness ledger.
// Pete Hollis (Opus, lens: happiness-ledger): a seeded regular reading the meter before and after every command —
// "a lad with a microphone outscores a man who held a woman's hand on a hill at three in the morning, ten to one."
// Ruairi Doyle (Fable, lens: sao-and-town): a month-old resident on Beach Road asking the town about everything that
// happened to him — "the till remembers every baht; what it does not remember is anything that happened to the man."
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
const withDice = (v, fn) => { const saved = _rand; try { _rand = () => v; return fn(); } finally { _rand = saved; } };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 7000; G.bank = 5000; G.nightTurn = 40; G.season0 = 2; out = [];
});

// ── Pete: the meter ───────────────────────────────────────────────────────────
test("the floor pays once a room a night: forty SINGs are one, and dancing WITH her is worth dancing alone", () => {
  G.day = 5; G.room = "lucky_tiger";
  const h0 = G.happy; run("sing"); const h1 = G.happy;
  assert.ok(h1 > h0, "the first song pays");
  for (let i = 0; i < 6; i++) { run("sing"); run("dance"); }
  assert.equal(G.happy, h1, "every song after it is sung, printed, and free");
  G.soc.joyRooms = {}; G.soc.drinks.lek = 8; G.room = _npcRoom("lek");
  const h2 = G.happy; run("dance with lek"); assert.equal(G.happy - h2, 2, "with her, +2");
});
test("a woman who has decided about you takes the drink because the bar counts it, and nothing warms", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 9; G.maiDee = { lek: G.day - 3 };
  const h = G.happy, m = G.money; out = []; run("buy lek a drink");
  assert.ok(G.money < m, "she still takes the chit");
  assert.equal(G.happy, h, "no +1 from the verdict");
  assert.doesNotMatch(said(), /warmer/);
});
test("losing a her-farang regular to the verdict is priced on the meter, by what she was, and named", () => {
  G.room = _npcRoom("lek"); G.soc.drinks.lek = 14; G.happy = 30; out = [];
  _maiDeeScene(["lek"]);
  assert.equal(G.happy, 22); assert.match(said(), /Lek has decided about you/);
});
test("the ledger says why: the ride's stops in a long-time, the treadmill's first step, the new trip's zero, the sea", () => {
  G.soc.drinks.lek = 8; out = []; _conquestHappy(12, "lek"); assert.match(said(), /\+2 for the stops she showed you/);
  G.jaded = 0; out = []; _conquestHappy(5); assert.match(said(), /first one of the trip lands in full/);
  out = []; _conquestHappy(5); assert.doesNotMatch(said(), /first one of the trip/, "said once a trip");
  out = []; _vacationEndPrompt(); assert.match(said(), /starts again at zero/);
  G.room = "jomtien_beach"; G.soc.drunk = 0; const h = G.happy; run("swim"); assert.equal(G.happy, h + 1); run("swim"); assert.equal(G.happy, h + 1, "once a day");
});
test("the night ride waits on a non-answer, and water is bought at the stop", () => {
  G.soc.drinks.lek = 9; G.money = 3000; G.thirst = 70;
  G.rideSeq = { id: "lek", fine: 0, spent: 0, stops: 1, sanuk: 0, seen: ["somtam"] };
  G.pendingEnc = "nightride"; G.encPrompt = [["Lek looks back over her shoulder.", "room"]];
  run("what?"); assert.equal(G.pendingEnc, "nightride", "a shrug is not goodbye");
  out = []; run("buy water");
  assert.equal(G.pendingEnc, "nightride"); assert.ok(G.thirst < 70); assert.equal(G.money, 2980); assert.match(said(), /water/i);
  run("home"); assert.notEqual(G.pendingEnc, "nightride", "a real no still ends it");
});
test("a rough wake leaves room to reach water: the meters wake below the drain line", () => {
  G.soc.drunk = 9; G.room = "buakhao_klang"; _endNight("blackout");
  assert.ok(G.thirst <= 75 && G.hunger <= 70, `thirst ${G.thirst}, hunger ${G.hunger}`);
});
test("the Sabai's quiet needs you to wake there", () => {
  G.hotel = "sabai"; G.soc.drunk = 5; G.room = "buakhao_klang"; out = []; _endNight("blackout");
  assert.doesNotMatch(said(), /Naklua quiet/);
  G.soc.drunk = 5; G.room = _hotelRoomId(); out = []; _endNight("sleep");
  assert.match(said(), /Naklua quiet/);
});
test("an insult is noted till dawn and an apology settles it", () => {
  G.room = "queen_vic"; G.nightTurn = 30; run("insult terry");
  out = []; run("talk to terry"); assert.match(said(), /used up its patience|not one word more|still in the room/);
  out = []; run("apologize"); assert.match(said(), /Okay|Forget it/);
  out = []; run("talk to terry"); assert.doesNotMatch(said(), /used up its patience|not one word more|still in the room/);
});
test("claims without a cause: the clock-blind reveal, the usual's week, the chit nobody has watched, the column's mailing list, a big room's bell", () => {
  G.room = "lucky_tiger"; G.soc.barTurns = {}; _ledgerFor = "lek";
  assert.match(_OTHER_LEDGER[2][0]("Lek"), /since you came in/);
  G.soc.barTurns = { lucky_tiger: 40 }; assert.match(_OTHER_LEDGER[2][0]("Lek"), /most of the evening/);
  assert.ok(!_USUAL_LINES.some(l => /for a week/.test(l)));
  assert.doesNotMatch(String(_OTHER_LEDGER[1][0]), /seen her do twenty/);
  for (let i = 0; i < 8; i++) { G.room = "rock_factory"; G.money = 9000; G.soc.bells = {}; G.soc.bellAt = {}; out = []; run("ring bell"); run("yes");
    assert.doesNotMatch(said(), /very short bar|Small bar|little beer bar/); }
});
test("a sunrise inland has no bay in it, and the column reaches a man who never stood Mort a beer", () => {
  for (let i = 0; i < 5; i++) { G.room = "buakhao_klang"; G.nightTurn = SUNRISE_TURN; out = []; run("watch sunrise");
    const first = out.find(l => /sky|light|grey|dawn|gold/i.test(l)) || ""; assert.doesNotMatch(first, /\b(bay|sea)\b/i); }
  out = []; G.battery = 80; run("owl"); assert.doesNotMatch(said(), /stood him a beer/);
});
test("Cheap Charlie's board sells WHATEVER SHE MADE TODAY; a wrong flip at Jackpot is free", () => {
  G.room = "cheap_charlies"; G.hunger = 60; const m = G.money; run("order whatever she made today"); assert.ok(G.money < m);
  G.room = "lucky_tiger"; G.money = 2000; _startJackpot("20");
  assert.ok(G.game && G.game.pending, "a roll is waiting");
  const t = G.nightTurn; run("flip 99"); assert.equal(G.nightTurn, t, "not a move, not a minute");
});
test("a quiz answered right five times does not cheer one sentence five times", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  const m = src.match(/CORRECT! ` \+ _pickVary\(\[([\s\S]*?)\], "quizright"\)/);
  assert.ok(m, "the correct-answer line is a pool"); assert.ok((m[1].match(/",/g) || []).length >= 4, "five lines deep");
});

// ── Ruairi: the town ───────────────────────────────────────────────────────────
test("a woman who has made you a regular does not run a game on you (the white knight excepted, by design)", () => {
  const shark = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _bfShark(id) && NPCS[id].type !== "sponsor");
  G.soc.drinks[shark] = 0; assert.equal(_bfExploitable(shark), true, "a stranger is a mark");
  G.soc.drinks[shark] = 8; assert.equal(_bfExploitable(shark), false, "a regular is not");
  G.player.personality = "whiteknight"; assert.equal(_bfExploitable(shark), true, "the white knight stays the perfect mark");
});
test("after midnight her money goes to her, not into the ledger with ceremony", () => {
  G.room = _npcRoom("lek"); G.nightTurn = 70; G.soc.drinks.lek = 3;
  G.pendingBf = { id: "lek", st: LADY_ST, lt: LADY_LT, party: LADY_LT * 2, room: G.room, herMoney: true };
  withDice(0.99, () => { out = []; _bfResolve("lt"); });
  assert.doesNotMatch(said(), /enters it in the ledger/);
});
test("the woman you woke up with saw you this morning: no absence greeting the evening after", () => {
  G.seenDay = { manow: G.day - 5 }; G.lastBfId = "manow"; G.room = _hotelRoomId(); _endNight("sleep");
  assert.equal(G.seenDay.manow, G.day);
});
test("Bert answers about Tan without the partnership; a man on a beer-bar stool answers as a punter", () => {
  G.room = "stinky_bar"; run("talk to bert"); assert.match(ask("bert", "tan"), /The driver|Never been in here/);
  assert.equal(_hoursRegister("doug"), "punter"); assert.equal(_hoursRegister("lamai"), "house");
});
test("the colleague review knows about the game she ran and the complaint that followed", () => {
  G.room = _npcRoom("jiap"); G.soc.drinks.jiap = 8; G.bfStrikes = { jiap: 1 };
  const mate = _npcsHere().find(x => x !== "jiap" && NPC_ROLES[x]);
  run("talk to " + NPCS[mate].name.toLowerCase());
  assert.match(ask(mate, "jiap"), /complain|talking-to|shout|handled|careful/i);
});
test("her own night is askable by its details, and the reason she gave is a subject", () => {
  G.lastNightWas = { day: G.day - 1, reason: "barfine", bar: "stinky_bar", barTurns: 50, with: "jiap", endRoom: _hotelRoomId(), quiet: false };
  G.room = _npcRoom("jiap"); run("talk to jiap");
  assert.match(ask("jiap", "khao man gai"), /khao man gai|chicken rice|plate|beach/i);
  G.soc.bfRefused = { mew: { kind: "temple" } }; G.room = _npcRoom("mew"); run("talk to mew");
  assert.match(ask("mew", "temple"), /monks|merit|wat/i);
});
test("the stool's hours are the hours the room will quote; no capital in the middle of a sentence", () => {
  G.room = "stinky_bar"; G.soc.barTurns = { stinky_bar: 52 }; G.nightTurn = 90; out = []; G.room = _hotelRoomId(); _endNight("sleep");
  assert.match(said(), /Five hours on the same stool/);
  assert.ok(!Object.values(_TOWN.saw || {}).flat().some(l => /\{h\}, \{W\}/.test(l)), "{W} opens a sentence");
});
test("Sao hears the answer to her own question and does not ask it again", () => {
  G.stage = "expat"; G.phone.contacts.sao = true; G.bkk = { met: 1, stage: 2, askedPat: true }; G.battery = 80;
  run("reply sao the sunrise comes up behind the town over the hills"); run("check messages");
  assert.ok(G.bkk.heardPat); assert.match(said(), /sunrise/i);
  for (let i = 0; i < 6; i++) _saoReply("");
  assert.ok(!(G.phone.inbox || []).slice(-6).some(m => /isn't a bar/.test(m.text || m.msg || "")), "the question is retired");
});
test("the two room scams pass the clerk like any guest", () => {
  G.hotel = "sabai"; G.money = 3000; G.bfIncident = { kind: "leaveAfter", room: "stinky_bar", id: "manow", day: G.day };
  out = []; _endNight("bfscam"); assert.ok(G.joinerDay != null, "the joiner fee is charged");
});
