// ROUND 96 (2026-10-20) — the Soi 6 challenge, three ways: Marcus (Opus, the daily player — the same seed twice, the
// card on a forum, every prompt at the week's end), Hal (Fable, one woman all week on the Verandah and every witness
// asked the next evening — "the bar I sat in alone swore it watched me leave with her"), Dougie (Opus, the title's own
// question: a man who asks when the last bus is, in the words he'd use at a kerb). The money and the daily held; the
// defects were the words the game would not take and the things it said about the night it had not seen.
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
const t = c => { out = []; run(c); return said(); };
const soi6 = () => { startSoi6Mode(); run("1"); run("3"); run("1"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.nightTurn = 30; out = []; };

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; out = [];
});

// ── Hal ──
test("SEVERE: only the bar she left from saw you leave with her — the one you sat in alone says you walked out straight", () => {
  soi6(); G.day = 3; G.room = "stinky_bar";
  G.lastNightWas = { day: 2, reason: "barfine", bar: "stinky_bar", barTurns: 20, bars: { stinky_bar: 20, candy_bar: 30 }, with: "lamai", leftFrom: "candy_bar", endRoom: "candy_bar" };
  run("talk to cake"); const a = t("ask cake about last night");
  assert.doesNotMatch(a, /with Lamai|leave with|left with/i, a); assert.match(a, /hour/i);
  G.lastNightWas.leftFrom = "stinky_bar"; G.talked.cake = []; run("talk to cake");
  assert.match(t("ask cake about last night"), /with Lamai/i, "the bar she left from says so");
});

test("a drink bought for her makes her the woman you are talking to; TOPICS her does the same and lapses the other's question", () => {
  soi6(); G.room = "stinky_bar"; G.money = 3000;
  run("talk to cake"); run("buy manow a drink"); assert.equal(G.convo, "manow", "the drink is the conversation (Hal: 'do you like me?' went to the cashier)");
  run("talk to jiap"); assert.equal(G.convo, "jiap");
  if (G.convoQ) { const q = G.convoQ.key; t("topics manow"); assert.equal(G.convo, "manow"); assert.ok(!G.convoQ, "her question lapsed, not answered"); assert.ok(!(G.player.said || {})[q], "'topics manow' is not his " + q); }
});

test("a verb-shaped line is never filed as an answer to her question", () => {
  soi6(); G.room = "stinky_bar"; run("talk to jiap");
  G.convoQ = { id: "jiap", key: "stay", q: "How long holiday?" };
  run("topics jiap"); assert.ok(!(G.player.said || {}).stay, "TOPICS is a verb, not a stay: " + JSON.stringify(G.player.said));
  G.convoQ = { id: "jiap", key: "stay", q: "How long holiday?" }; run("two weeks");
  assert.equal((G.player.said || {}).stay, "two weeks", "a plain answer still lands");
});

// ── Dougie ──
test("SEVERE: THE LAST BAHT BUS takes 'when is the last bus', the songthaew you TAKE, the taxi you GRAB, and a tuk tuk", () => {
  soi6(); G.room = "soi6_street";
  for (const c of ["when is the last bus", "when's the next baht bus", "last bus?", "take the songthaew", "grab the baht bus", "baht bus"])
    assert.doesNotMatch(t(c), new RegExp(_HUH.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")), c + " → " + said());
  assert.match(t("grab a taxi"), /piwin|MOTOSAI|app/i); assert.match(t("tuk tuk"), /piwin|MOTOSAI|app/i);
  assert.match(t("take a motorbike taxi"), /piwin|motosai|where to|stand|Soi 6 is the entire world|edge of the soi|one street|those were the terms/i, said());   // the week's fence is the honest answer to a bike
});

test("the peddler's WATCH is the product, never WATCH SUNRISE", () => {
  soi6(); G.room = "soi6_street"; G.money = 1000; G.pendingEnc = "peddler"; run("watch sunrise");
  assert.equal(G.money, 1000, "nothing bought"); assert.notEqual(G.itemLoc.fake_rolex, "inventory"); assert.notEqual(G.itemLoc.shades, "inventory", "nor the shades on SUN-rise");
  G.pendingEnc = "peddler"; run("watch"); assert.equal(G.money, 700, "the Rolex is still ฿300 on the word alone");
});

test("the last night of the week says so on its first look, and TIME offers no league night past it", () => {
  soi6(); G.day = 7; G.nightTurn = 5; G.room = "qv_room";
  assert.match(t("look"), /last night of the week/i); assert.doesNotMatch(t("look"), /last night of the week/i, "once");
  assert.match(t("time"), /No league night left/); assert.doesNotMatch(said(), /night after next|tomorrow/);
  G.day = 3; G.lastNightSaid = 0; assert.doesNotMatch(t("look"), /last night of the week/i);
});

test("'it's my last night' is the leaving; the ATM clause adds its fee; the awning has its comma", () => {
  assert.ok(_isLeavingSaid("it's my last night"), "my last night"); assert.ok(_isLeavingSaid("last night here tomorrow i fly"));
  assert.ok(!_isLeavingSaid("last night was mental"), "a night that happened is not the leaving");
  const y = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  assert.match(y, /plus \\u0e3f\$\{_num\(fees\)\} in fees/); assert.doesNotMatch(y, /of that in fees/);
  const s = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(s, /nearest awning, already soaked/);
  const p = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.doesNotMatch(p, /say that at eleven o'clock|around eleven o'clock/, "a clock claim the game did not compute (class K)");
});

// ── Marcus ──
test("the card: a calendar row, not a moon that reads as an eighth night; what the week cost", () => {
  soi6(); G.money = 400; G.atmTotal = 2000; G.nightLog = ["home", "home", "barfine"];
  const card = _shareCard().join("\n");
  assert.doesNotMatch(card, /🌙/); assert.match(card, /🗓 /); assert.match(card, /💸 ฿2,600 spent/, card);
  assert.doesNotMatch(card, /in pocket|left\b/, "the pocket stays off the card (round 24's call)");
});

test("the week's-end gate: HELP explains it, SCORE and SHARE answer once, LOOK looks, NO and 'today's soi' are voiced, RESTART is a chip", () => {
  soi6(); G.day = 8; G.pendingChoice = "vacation_end"; G.room = "soi6_street";
  assert.match(t("help"), /PLAY AGAIN is a fresh week/); assert.equal(G.pendingChoice, "vacation_end");
  assert.match(t("score"), /สนุก happiness/); assert.equal((said().match(/THE LAST BAHT BUS — Soi 6/g) || []).length, 0, "SCORE is the score; the card is SHARE's");
  assert.equal((t("share").match(/THE LAST BAHT BUS — Soi 6/g) || []).length, 1, "the card once under SHARE");
  assert.match(t("look"), /Soi 6/); assert.equal(G.pendingChoice, "vacation_end");
  assert.match(t("no"), /Nothing to say no to/); assert.match(t("today's soi"), /start panel/);
  assert.deepEqual(_chipSet().map(c => c.cmd), ["continue", "play again", "share", "restart"]);
  assert.ok(engineComplete("res").some(c => /^restart/.test(c)), "and in the completion");
});

test("her quote on Soi 6 names the split the ledger pays", () => {
  soi6(); G.room = "stinky_bar"; G.nightTurn = 40; G.money = 5000;
  const g = _npcsHere().find(i => NPC_ROLES[i] === "hostess"); run("talk to " + g);
  const a = t("ask " + g + " about price");
  if (/bar take/i.test(a)) { assert.match(a, new RegExp(`฿${_num(LADY_ST)} for me`), a); assert.match(a, /Short time ฿/); }
});

test("nobody texts you from your arm or from the front of her own bike", () => {
  soi6(); G.room = "soi6_street"; G.phone.contacts = { manow: true, lamai: true };
  G.party = { ids: ["manow"], stops: 0, spent: 0, seen: {} }; G.rideSeq = { id: "lamai", stops: 0 };
  G.phone.lastText = -100; const saved = _rand; try { _rand = () => 0.01; for (let i = 0; i < 12; i++) _maybeIncomingText(); } finally { _rand = saved; }
  const from = (G.phone.inbox || G.phone.messages || []).map(m => m.from || m.id);
  assert.ok(!from.includes("manow") && !from.includes("lamai"), "texts from: " + from.join(","));
});

test("Kwan's Nont errand is not dealt on the fenced week", () => {
  const kw = NPCS.kwan && NPCS.kwan.dialogue.find(d => /My brother\?/.test(d.text));
  assert.ok(kw && typeof kw.when === "function"); G.mode = "soi6"; assert.equal(kw.when({}, G), false); G.mode = null; assert.equal(kw.when({}, G), true);
});

// ── the second batch ──
test("the piwin reads the street he stands on: no Sukhumvit from Soi 6, no ride on the fenced week, a road is a road", () => {
  soi6(); G.room = "soi6_street";
  const a = t("ask piwin about the bus"); assert.match(a, /Beach Road, Second Road/); assert.doesNotMatch(a, /Sukhumvit|I take you/);
  const b = t("ask piwin about second road"); assert.doesNotMatch(b, /Massage|Get on/); assert.match(b, /Not this week/);
});

test("the leaving day is the day he said, and TELL <her> it's my last night is the leaving", () => {
  soi6(); G.day = 3; G.room = NPCS.pukky.room; run("talk to pukky");
  const a = t("i fly home the day after tomorrow"); assert.match(a, /day after tomorrow/i); assert.doesNotMatch(a, /after the day after/); assert.equal(G.leaveOn, 5);
  G.day = 7; G.room = NPCS.joy.room; G.soc.leavingSaid = {}; run("talk to joy");
  const b = t("tell joy its my last night"); assert.doesNotMatch(b, /Not my story|don't know|wrong girl/i); assert.match(b, /tomorrow|fly|home|last/i);
  assert.equal(_leaveDays("three more days"), 3); assert.equal(_leaveDays("tomorrow"), 1);
});

test("the flight, the sun and the 7-Eleven's hours are questions with answers; GOODBYE twice is voiced", () => {
  soi6(); G.room = "soi6_street";
  assert.match(t("fly home"), /Soi 6|one street|rule|edge of the soi|rest of the city/i); assert.match(t("when does the sun come up"), /05:00|behind the town/);
  assert.match(t("how late is the 7-eleven open"), /never shuts|midnight/);
  G.room = NPCS.pukky.room; run("talk to pukky"); assert.match(t("say goodbye to pukky"), /leave of Pukky|goodbye/i);
  assert.match(t("ask pukky about goodbye"), /already|heard you/i); assert.doesNotMatch(said(), /soi blinks|didn't understand/i);
});

test("a table is furniture the street knows: WHERE IS A POOL TABLE and the floor name the fence's own, never Pratumnak", () => {
  soi6(); G.room = "soi6_street"; G.heardOf = G.heardOf || {}; G.heardOf.kingfisher = true; G.visited = G.visited || {}; G.visited.kitten_corner = true;
  const a = t("where is a pool table"); assert.doesNotMatch(a, /Pratumnak|ask around/i); assert.match(a, /Kitten Corner/);
  G.room = NPCS.pukky.room; run("talk to pukky"); const b = t("ask pukky about pool table"); assert.doesNotMatch(b, /Pratumnak|Walking Street/);
});

test("a dance never danced is her own subject; 'somebody at home' is her man; the night she spent with you outranks the drinks book", () => {
  soi6(); G.day = 3; G.room = NPCS.kwan.room; run("talk to kwan");
  G.partyLog = { kwan: { day: G.day - 1, rooms: ["sweet_tamarind"], ended: "home", danced: false } };
  assert.doesNotMatch(t("ask kwan about dance"), /Only Sweet Tamarind|One bar is enough/);
  assert.match(t("do you have somebody at home?"), /boyfriend|husband|man|nobody|no one|only you/i); assert.doesNotMatch(said(), /\bNan\b/);
  assert.match(t("ask kwan about me"), /sleep|wake up|stool|talk in his sleep/i);
});

test("the paint does not seat the woman on your arm at the end of the rail", () => {
  soi6(); G.room = NPCS.kwan.room; G.party = { ids: ["kwan"], stops: 0, spent: 0, seen: {} };
  out = []; _describeRoom(true, true); assert.doesNotMatch(said(), /Kwan folds napkins/); assert.match(said(), /pink light|mural|open front/i);
  G.party = null; out = []; _describeRoom(true, true); assert.match(said(), /Kwan folds napkins/);
});

test("the girl on the end of the noodle is somebody: named at the capture, by her colleagues, and by herself; no two colleagues sing one line", () => {
  soi6(); G.room = "soi6_mid"; G.day = 3;
  G.pendingEnc = "noodle"; out = []; run("yes");
  const ev = (G.streetLog || []).find(e => e.kind === "noodle"); assert.ok(ev && ev.bar, "the capture is logged");
  if (ev.by) {
    assert.match(said(), new RegExp("noodle is " + NPCS[ev.by].name)); G.day++; G.room = ev.bar;
    const cols = _npcsHere().filter(i => i !== ev.by && (NPC_ROLES[i] === "hostess" || NPC_ROLES[i] === "mamasan" || NPC_ROLES[i] === "cashier")).slice(0, 2);
    const lines = cols.map(c => { run("talk to " + c); return t("ask " + c + " about the noodle"); });
    if (lines.length === 2) assert.notEqual(lines[0].split("\n")[0], lines[1].split("\n")[0], "two women, one sentence");
    run("talk to " + ev.by); assert.match(t("ask " + ev.by + " about the noodle"), /me\b|Me\b/);
  }
});

test("Mort is a man of his word about beer; the early-night close has more than two codas; the daily says what same dice means", () => {
  const mort = NPCS.mort.dialogue.find(d => (d.sets || []).includes("mortMet")); assert.ok(typeof mort.fx === "function");
  G.room = "queen_vic"; G.soc.drunk = 0; G.talked.mort = []; _setFlag("jokeWho"); run("talk to mort"); assert.equal(G.soc.drunk, 1, "the second bottle landed");
  const y = readFileSync(fileURLToPath(new URL("../../web/js/engine-play.js", import.meta.url)), "utf8");
  assert.ok(/\["shower",/.test(y) && /\["balcony",/.test(y));
  const p = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  assert.match(p, /Type the same, get the same/);
});

test("CONTINUE at the Soi 6 week's end: the same soi a month on, the people remembering you (Mario's call on Marcus)", () => {
  soi6(); G.room = NPCS.pukky.room; run("talk to pukky"); G.day = 8; G.soc.drinks.pukky = 14; G.soc.drinks.somo = 4; G.phone.contacts = G.phone.contacts || {}; G.phone.contacts.pukky = true; G.money = 2400; G.bank = 80000;
  G.pendingChoice = "vacation_end"; G.room = "soi6_street"; G.nightLog = ["home", "barfine"];
  assert.deepEqual(_chipSet().map(c => c.cmd), ["continue", "play again", "share", "restart"]);
  assert.ok(engineComplete("cont").some(c => /^continue/.test(c)));
  assert.match(t("what's the difference?"), /CONTINUE keeps the people/); assert.equal(G.pendingChoice, "vacation_end");
  out = []; run("continue"); assert.equal(G.pendingChoice, "soi6continue", "CONTINUE has two doors");
  assert.deepEqual(_chipSet().map(c => c.cmd), ["another week", "cancel the ticket", "not yet"]);
  assert.match(t("what's the difference?"), /ANOTHER WEEK.*CANCEL THE TICKET/s); assert.equal(G.pendingChoice, "soi6continue");
  run("not yet"); assert.equal(G.pendingChoice, "vacation_end", "NOT YET is the card again"); run("continue");
  out = []; run("another week");
  assert.equal(G.pendingChoice, null); assert.equal(G.mode, "soi6"); assert.equal(G.day, 1); assert.equal(G.vacation, 2);
  assert.equal(G.room, "qv_room"); assert.equal(G.hotel, "queenvic"); assert.equal(G.money, SOI6_POCKET); assert.equal(G.bank, 82400, "the pocket flew home into the account");
  assert.equal(G.soc.drinks.pukky, 7, "her-farang comes back a regular"); assert.ok(!G.soc.drinks.somo, "a face is a week's warmth");
  assert.ok(G.phone.contacts.pukky, "her number survives"); assert.deepEqual(G.nightLog, []);
  assert.match(said(), /SOI 6 · WEEK 2 · DAY 1 of 7/); assert.match(said(), /people on it have/); assert.doesNotMatch(said(), /Sabai Palms/);
  assert.match(_shareCard().join("\n"), /week 2/);
  G.room = _streetOf(NPCS.pukky.room); G.nightTurn = 30; out = []; run("enter " + _barName(NPCS.pukky.room).toLowerCase()); run("talk to pukky");
  assert.match(said(), /back|again|remember|miss|month/i, "she knows you: " + said());
});

test("CANCEL THE TICKET: the Soi 6 week's man never goes home — the fence lifts, the people and the money stay, the expat stage opens at the Vic", () => {
  soi6(); G.room = NPCS.pukky.room; run("talk to pukky"); G.day = 8; G.soc.drinks.pukky = 14; G.money = 2400; G.bank = 80000; G.dailyId = "2026-10-20";
  G.pendingChoice = "vacation_end"; G.room = "soi6_street"; run("continue"); out = []; run("cancel the ticket");
  assert.equal(G.pendingChoice, null); assert.equal(G.stage, "expat"); assert.equal(G.mode, null, "the fence is down"); assert.ok(!G.dailyId, "a life is not a seed");
  assert.ok(_flag("expatLife")); assert.equal(G.room, "qv_room"); assert.equal(G.hotel, "queenvic"); assert.equal(G.money, 2400 + EXPAT_SAVINGS); assert.equal(G.bank, 80000);
  assert.equal(G.soc.drinks.pukky, 14, "nobody flew anywhere: she knows you exactly as well as last night"); assert.equal(G.vacation, 1);
  assert.match(said(), /ticket goes in the bin/); assert.match(said(), /EXPAT MODE/); assert.doesNotMatch(said(), /room 412|Sabai Palms/);
  assert.ok(G.thaiAccount, "a resident's bank book"); assert.ok(_flag("hasWallet") && _flag("act1Done"), "the card was in the wallet from night one — no safe, no Act One");
  G.nightTurn = 30; G.room = "soi6_street"; out = []; run("e"); run("e"); run("e"); run("e");
  assert.notEqual(G.room, "soi6_street", "the street has an end now: " + G.room); assert.doesNotMatch(said(), /Soi 6 is the entire world|one street|those were the terms/);
  G.room = "soi6_street"; out = []; run("travel jomtien"); assert.doesNotMatch(said(), /Soi 6 is the entire world|one street|those were the terms/);
});
