// Round 64 (2026-10-03): Gerry (the town-book survey — forty women asked the same three
// things, to validate round 63's dealing), Joanne (the diary-keeper — every text read,
// answered and asked about), Anil (systems collided — one companion carried through every
// verb the game has).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const W = new URL("../../web/js/", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(W + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const run = (c) => doCommand(c);
const said = () => out.map(o => o.text).join("\n");
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; out = [];
});
const party = (...ids) => { G.party = { ids, stops: 0, spent: 0, seen: {} }; };

// ── Joanne: the diary-keeper ────────────────────────────────────────────────────
test("a stranger who answered a topic first has met you: no welcome speech the next night", () => {
  G.room = NPCS.rose.room; G.nightTurn = 30; run("ask rose about candy");
  const greet = NPCS.rose.dialogue.findIndex(d => !d.topic);
  assert.ok(G.talked.rose.includes(greet), "her greeting is marked heard");
  _endNight("sleep"); G.room = NPCS.rose.room; G.nightTurn = 30; out = [];
  run("talk to rose");
  assert.ok(!said().includes(NPCS.rose.dialogue[greet].text), "the full welcome does not replay");
});
test("the hello-once counter resets at dawn", () => {
  G.soc.helloed = { lek: 2 };
  _endNight("sleep");
  assert.deepEqual(G.soc.helloed, {});
});
test("a woman can be asked about the text she sent you", () => {
  G.phone.contacts.lek = 1; G.room = _npcRoom("lek"); G.nightTurn = 20;
  _pushMsg("lek", "when you come see me?? i keep you seat every night");
  out = []; run("ask lek about your text");
  assert.match(said(), /i keep you seat/);
});
test("a mamasan and the lender text in the house register and never ask for money", () => {
  G.phone.contacts.candy = 1; G.phone.contacts.nira = 1; G.room = "beach_rd_c";
  const asks = /hospital|medicine|landlord|need \d|help little|send me/i;
  let n = 0;
  for (let i = 0; i < 6000 && n < 12; i++) {
    G.turns += 30; G.phone.lastText = 0;
    const L = G.phone.inbox.length; _maybeIncomingText();
    if (G.phone.inbox.length > L) { n++; assert.doesNotMatch(G.phone.inbox.at(-1).text, asks); }
  }
  assert.ok(n > 0, "some text arrived");
});
test("REPLY to the unknown number reaches the joker, not a contact", () => {
  let hit = false; const saved = _doJokeReply;
  try { _doJokeReply = () => { hit = true; }; run("reply unknown"); } finally { _doJokeReply = saved; }
  assert.ok(hit);
});
test("a quest reward sent through the bank app lands in the account", () => {
  const qid = Object.keys(QUESTS).find(q => QUESTS[q].reward && QUESTS[q].reward.money > 0 && NPCS[_qGiver(QUESTS[q])]);
  const q = QUESTS[qid];
  G.quests[qid] = "active"; G.room = "beach_rd_c";
  if (_npcsHere().includes(_qGiver(q))) return;   // giver here: pocket is right
  const pocket = G.money, bank = G.bank;
  _setFlag(q.doneFlag); _questTick();
  assert.equal(G.money, pocket); assert.equal(G.bank, bank + q.reward.money);
  assert.match(said(), /in the account/);
});
test("a mamasan's toast is never drunk to the mamasan", () => {
  const pool = _toastFor("candy");
  assert.ok(pool.length >= 4 && pool.every(f => !/mamasan/.test(f.toString())));
  assert.equal(_toastFor("lek").length, _TOAST_LINES.length);
});
test("a selfie already in the gallery is not texted again", () => {
  const id = Object.keys(NPCS).find(i => _selfiesFor(i).length > 0);
  G.phone.contacts[id] = 1;
  assert.ok(_maybePhotoText(id));
  for (const c of _selfiesFor(id)) _addPhoto(id, _selfieCap(c));
  assert.equal(_maybePhotoText(id), false);
});
test("the catfish text does not claim a history the trip hasn't had", () => {
  assert.ok(ENCOUNTERS.booking.intro.every(s => !/days ago/.test(s)));
});

// ── Anil: one companion through every verb ──────────────────────────────────────
test("the woman on your arm does not wait while you buy a special, a soapy or an off-shift meet", () => {
  party("lek"); G.money = 9000;
  const oil = Object.keys(ROOMS).find(k => ROOMS[k].massage && ROOMS[k].massage !== "legit");
  G.room = oil; out = []; run("special");
  assert.match(said(), /SEND LEK HOME/); assert.equal(G.money, 9000);
  const sp = Object.keys(ROOMS).find(k => ROOMS[k].soapy);
  G.room = sp; out = []; run("soapy");
  assert.match(said(), /SEND LEK HOME/); assert.equal(G.money, 9000);
});
test("BUY LEK A TOASTIE feeds Lek, and a stall plate FOR her is hers even when you are full", () => {
  party("lek");
  G.room = Object.keys(ROOMS).find(k => ROOMS[k].seven);
  const h = G.hunger; out = []; run("buy lek a toastie");
  assert.match(said(), /Lek/); assert.equal(G.hunger, h);
  G.room = Object.keys(FOOD_STALLS).find(k => ROOMS[k]); G.hunger = 0; out = [];
  run("buy food for lek");
  assert.match(said(), /Lek/);
});
test("the companion's rescue is the ledger's story, not 'the town put you somewhere'", () => {
  _endNight("sleep");
  party("lek"); G.room = "beach_rd_c"; G.nightTurn = 70;
  _endNight("blackout"); out = []; run("last night");
  assert.match(said(), /Lek got you home/); assert.doesNotMatch(said(), /town put you somewhere/);
});
test("DEBT names the loan you flew home with", () => {
  G.loan = { owed: 6000, dueDay: 3, strikes: 0 }; _newVacation();
  out = []; run("debt");
  assert.match(said(), /Nira/); assert.doesNotMatch(said(), /don't owe anybody/);
});
test("a bus with company quotes the fare it charges", () => {
  party("lek");
  const stop = Object.keys(ROOMS).find(k => ROOMS[k].busStop);
  G.room = stop; G.pendingFare = { kind: "bus", price: BUS_FARE * 2, dest: stop };
  out = []; _farePrompt();
  assert.match(said(), new RegExp(thaiBaht(BUS_FARE * 2)));
});
test("her chat off a bar floor does not steal an ice cube or rate the girl by the door", () => {
  party("lek"); G.room = "beach_rd_c";
  assert.ok(_partyTalkPool().every(f => !/ice cube|girl by the door/.test(f.toString())));
});
test("a woman met only through a barfine negotiation does not introduce herself afterwards", () => {
  G.room = _npcRoom("lek"); G.pendingBf = { id: "lek", st: 1000, lt: 2000 };
  _bfResolve("no");
  const greet = NPCS.lek.dialogue.indexOf(_pickDialogue("lek", null));
  assert.ok((G.talked.lek || []).includes(greet));
});
test("a regular's jealous snipe never names the woman on your arm or one who counts you a regular", () => {
  party("lek");
  const room = _npcRoom("lek");
  delete G.soc.patronBusy[room];
  G.room = "beach_rd_c"; _arriveAt(room);
  assert.notEqual(G.soc.patronBusy[room], "lek");
});
test("Tan feeds the company too", () => {
  party("lek"); G.room = NPCS.tan.room; G.nightTurn = 20;
  const b = G.soc.drinks.lek || 0;
  out = []; _tanFood();
  assert.match(said(), /Lek/); assert.ok((G.soc.drinks.lek || 0) > b);
});
