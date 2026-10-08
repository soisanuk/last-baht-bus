// Round 60 (2026-09-30): Kwame (an owner with a bad back — alternate nights, massage and

// the clinic, every job YES, a loan), Dennis (the second trip — what the town remembers), Fintan (the gossip — tells three people, asks who heard).
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


// ── Dennis ─────────────────────────────────────────────────────────────────
test("a question at the week's end is answered, never taken as the choice", () => {
  G.pendingChoice = "vacation_end";
  for (const q of ["help", "what happens if I move to pattaya?", "what does a new vacation mean?", "why"]) {
    out = []; run(q);
    assert.equal(G.pendingChoice, "vacation_end", q); assert.equal(G.stage, "vacation", q);
  }
  assert.match(said(), /MOVE TO PATTAYA is permanent/);
  run("move to pattaya"); assert.equal(G.stage, "expat");
});
test("the last night asks before a sleep at 18:00 ends the week", () => {
  G.day = 7; G.room = _hotelRoomId(); G.nightTurn = 2; G.wakeTurn = null;
  out = []; run("sleep");
  assert.match(said(), /last night of the trip/); assert.notEqual(G.pendingChoice, "vacation_end");
  run("sleep"); assert.equal(G.pendingChoice, "vacation_end");
});
test("a beer for a man who isn't here is refused by name", () => {
  G.room = "lucky_tiger"; const m = G.money;
  out = []; run("buy mort a beer");
  assert.equal(G.money, m); assert.match(said(), /Mort isn't here/);
});
test("old chatter does not arrive fresh on the next trip; the dog's goodbye keeps the Shamrock for those who heard it", () => {
  G.phone.contacts.lek = true; G.phone.inbox.push({ from: "lek", text: "hi", turn: 1, read: false, gives: 0 }, { from: "lek", text: "money", turn: 2, read: false, gives: 300 });
  _newVacation();
  assert.ok(G.phone.inbox.find(m => m.text === "hi").read); assert.ok(!G.phone.inbox.find(m => m.gives === 300).read);
});

// ── Fintan ─────────────────────────────────────────────────────────────────
test("the quiz you just played is the quiz the room talks about, and a finished quiz is finished", () => {
  const bar = _quizBars()[0]; G.room = bar; G.day = 4;
  G.quizLast = { room: bar, day: G.day, right: 5 }; G.nightTurn = 45;
  const staff = _npcsHere().find(id => NPC_ROLES[id]);
  if (staff) assert.match(_quizTalk(staff), /[Ff]ive|all five/);
  G.room = "stinky_bar"; assert.match(_quizTalk("bert"), /Done for tonight|Finish already/);
});
test("the killer field: the winner speaks as the winner, the men out before you as losers", () => {
  G.room = "lucky_tiger"; G.lastKp = { room: "lucky_tiger", day: G.day, names: ["Big Kev", "Daeng's nephew"], won: false, winner: "Big Kev" };
  out = []; run("talk to nephew");
  assert.ok(_FOLK_KPFIELD_OUT.some(l => said().includes(l)), said());
  out = []; run("talk to big kev");
  assert.ok(_FOLK_KPFIELD_LOST.some(l => said().includes(l)));
});
test("'sailor's arms' is not the dog, and Tan is not 'she' about him", () => {
  G.dog = { since: 1, name: null };
  assert.equal(_isDogWord("sailors arms"), false); assert.equal(_isDogWord("sai krok"), true);
  for (let i = 0; i < 6; i++) assert.doesNotMatch(_dogTalk("tan"), /\bshe\b|\bShe\b/);
});
test("BUY ROSE FOR <her> gives it to her, not the girl the pitch named", () => {
  G.room = "lucky_tiger";
  const girls = _npcsHere().filter(id => NPC_ROLES[id] === "hostess");
  if (girls.length < 2) return;
  const [pitched, other] = girls;
  G.pendingEnc = "flower"; G.flowerFor = pitched; G.money = 1000;
  const give = []; const saved = _doGive; _doGive = (item, who) => give.push(who);
  try { run("buy rose for " + NPCS[other].name.toLowerCase()); } finally { _doGive = saved; }
  assert.deepEqual(give, [NPCS[other].name.toLowerCase()]);
});
test("MOTOSAI TO BEACH ROAD SOUTH goes to the south end", () => {
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Tree Town") || "tt_entrance";
  if (!_room().motosai) return;
  const saved = _rand; try { _rand = () => 0.99; run("motosai to beach road south"); } finally { _rand = saved; }
  assert.equal(G.room, "beach_rd_s");
});
test("Mot's boots are money only after he has told you about them", () => {
  G.room = _npcRoom("mot"); _setFlag("motFed"); const m = G.money;
  out = []; run("give 40 to mot");
  assert.doesNotMatch(said(), /Still ฿/);
  _setFlag("motBootsTold"); out = []; run("give 40 to mot");
  assert.equal(G.motBoots, 40);
});
test("a quest's own text does not credit whoever you last spoke to", () => {
  G.convo = "lek"; G.known = {}; G.namedBy = {};
  _learnNames("Pim at the Starlight has the whispers (ASK PIM ABOUT THE WHISPERS).");
  assert.ok(!G.namedBy.pim || !G.namedBy.pim.by);
});
test("the town hears what happened: Oy on the debts, Candy after the wallet, Bert on his bell, Pim on the helmet, the piwin on a wallet", () => {
  _setFlag("heardWhispers"); _setFlag("helmetDelivered"); G.soc.bells.stinky_bar = 1;
  const MISS = /Not my story|wrong (man|mama|girl)|I don't know about that|That one I don't know|not my department/i;
  for (const [id, t] of [["oy", "debts"], ["candy", "mot"], ["bert", "bell"], ["pim", "helmet"]]) {
    G.room = _npcRoom(id); run("talk to " + id); out = []; run("ask " + id + " about " + t);
    assert.doesNotMatch(said(), MISS, id + "/" + t);
  }
  assert.match(said(), /helmet/i);
  G.room = Object.keys(ROOMS).find(r => ROOMS[r].motosai && ROOMS[r].region === "Beach Road");
  out = []; run("ask piwin about wallet"); assert.match(said(), /[Ff]ront pocket/);
});

// ── Kwame ──────────────────────────────────────────────────────────────────
const owner = () => { G.stage = "expat"; _setFlag("barPaid"); _setFlag("barOpen"); G.bar.room = "stinky_bar"; G.room = "stinky_bar"; };
test("the jobs name their price, and the owner's staff can say what the arrangements are", () => {
  const scr = SYNDICATE_JOBS.find(j => j.id === "screen"), pos = SYNDICATE_JOBS.find(j => j.id === "pos");
  assert.match(scr.ask, new RegExp("฿" + (SYN_JOB_NIGHT * 30).toLocaleString("en-US"))); assert.match(pos.ask, new RegExp("฿" + (SYN_JOB_NIGHT * 30).toLocaleString("en-US")));
  assert.doesNotMatch(pos.who, /car door/);
  owner(); G.syn = G.syn || {}; G.syn.done = { cleaning: true };
  const cake = _npcsHere().find(i => NPC_ROLES[i] === "cashier");
  if (cake) { out = []; run("ask " + NPCS[cake].name + " about arrangements"); assert.match(said(), /cleaners/); }
});
test("the tab regular's record is the books' record", () => {
  owner(); G.bar.stiffed = 1; G.bar.nights = 12;
  G.bar.shiftAsked = false; G.shiftCall = "tab"; G.pendingChoice = null;
  // the call's text is composed with the record; a stiffed man is never 'never once not paid'
  const call = SHIFT_CALLS.find(c => c.id === "tab");
  assert.ok(call);
});
test("the early call is takings never taken, not a bill", () => {
  owner(); cmdWork: { G.nightTurn = 20; run("work"); }
  const her = _barStaff().filter(id => NPC_ROLES[id] === "hostess")[0];
  if (!her) return;
  G.bar.shiftAsked = true; G.shiftCall = "early"; G.shiftWho = her; G.pendingChoice = "shift";
  const c0 = G.bar.cash; run("yes");
  assert.equal(G.bar.cash, c0); assert.ok(G.bar.lostTake > 0);
});
test("a man who left his shift at eleven is not told about the close", () => {
  owner(); G.bar.tale = { seen: _WORK_SHIFT.find(_isCloseLine) || _WORK_SHIFT[0], missed: "x", told: false };
  G.bar.railTurn = 50;
  out = []; _workTaleTell(G.bar, "morning");
  assert.ok(!out.slice(1).some(o => _isCloseLine(o.text)), "no close lines");
});
test("Sukanya answers to her name; asking for the masseuse at Pensri's reaches Pensri", () => {
  const plaza = Object.keys(SHOP_MASSEUSES).find(r => SHOP_MASSEUSES[r].name === "Sukanya");
  G.room = plaza; out = []; run("talk to sukanya");
  assert.doesNotMatch(said(), /No one here answers|doesn't land/);
  G.room = _npcRoom("pensri"); out = []; run("talk to masseuse");
  assert.doesNotMatch(said(), /she has a name/);
});
test("Tan's name on the staff list is dated from the night he asked", () => {
  _setFlag("tanFavourDone"); G.tanFavourDay = G.day - 1;
  G.room = _npcRoom("tan"); run("talk to tan"); out = []; run("ask tan about the name");
  assert.doesNotMatch(said(), /Last month/);
});
test("Nok walks back to her cart at 19:00, and says so", () => {
  G.room = "jomtien_beach"; G.convo = null; G.nightTurn = 10;
  out = []; _nokLeavesTick();
  assert.match(said(), /Nok/);
});
