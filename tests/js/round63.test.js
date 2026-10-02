// Round 63 (2026-10-02): Wendell (same-questions-every-bar — a widowed regular asking every
// mamasan and two girls the same five things in twenty bars), Marta (owner-interrupts-every-
// decision — the seeded wet-season owner, reloading mid-prompt), Desmond (the-town-explains —
// the seeded expat asking three people about everything that happened to him).
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
const ask = (id, topic) => { G.room = NPCS[id].room; G.nightTurn = 30; out = []; _doTalkBody(id, topic); return said(); };

// ── Wendell: the town book ───────────────────────────────────────────────────────────
test("no two women in town tell you the same family story while unheard ones remain", () => {
  const girls = Object.keys(NPCS).filter(id => NPCS[id].filler && NPC_ROLES[id] === "hostess").slice(0, _H_FAMILY.length);
  const heard = new Set();
  for (const id of girls) { ask(id, "family"); heard.add(G.storyOf[id].hfamily); }
  assert.equal(heard.size, girls.length, "every family line distinct across " + girls.length + " women");
  // and she tells YOU the same story again — the book is hers once dealt
  const first = girls[0], k = G.storyOf[first].hfamily; ask(first, "family"); assert.equal(G.storyOf[first].hfamily, k);
});
test("the mamasans do not share a son: family stories are dealt once across the town's mamas", () => {
  const mamas = Object.keys(NPCS).filter(id => NPCS[id].filler && NPC_ROLES[id] === "mamasan").slice(0, 8);
  const ks = mamas.map(id => { ask(id, "family"); return G.storyOf[id].mfamily; });
  assert.equal(new Set(ks).size, ks.length);
});
test("the town book leaves the baked text alone, so the corpus and the portraits see what they always saw", () => {
  const id = Object.keys(NPCS).find(i => NPCS[i].filler && NPC_ROLES[i] === "hostess");
  const n = NPCS[id], b = n.storyBits;
  assert.equal(n.dialogue[0].text, _H_GREET[b.greet]); assert.ok(b.greet < 5 && b.famWrap < 3 && b.planWrap < 3 && b.homeWrap < 3);
});
test("a woman in a bar with no mamasan never greets you with 'only my mama dangerous'", () => {
  const solo = Object.keys(NPCS).filter(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" &&
    !Object.keys(NPCS).some(m => NPC_ROLES[m] === "mamasan" && (NPCS[m].room === NPCS[id].room || (NPCS[m].bars || []).includes(NPCS[id].room))));
  for (const id of solo) { G.townTold = {}; G.storyOf = {}; const t = _townStory(id, NPCS[id].dialogue[0]).text; assert.doesNotMatch(t, /\bmama\b/i, id); }
});
test("Candy and Oy answer family, home and plan; an authored mamasan without lines answers from the house's stock; mamas miss in their own English", () => {
  for (const t of ["family", "home", "plan"]) assert.doesNotMatch(ask("candy", t), /not my story|wrong (girl|mama|woman)/i, "candy " + t);
  assert.match(ask("oy", "family"), /three bars and forty girls/);
  _setFlag("waiedOy"); assert.match(ask("oy", "family"), /Roi Et/);
  const authored = Object.keys(NPCS).find(id => NPC_ROLES[id] === "mamasan" && !NPCS[id].filler && !NPCS[id].dialogue.some(d => d.topic && /family/.test(d.topic)));
  if (authored) { const a = ask(authored, "family"); assert.ok(_M_FAMILY.some(l => a.includes(l.slice(1, 40))), authored + ": " + a); }
  const mama = Object.keys(NPCS).find(id => NPCS[id].filler && NPC_ROLES[id] === "mamasan");
  G.talked[mama] = [0]; const miss = ask(mama, "photosynthesis"); assert.ok(_TOPIC_MISS_HOUSE.some(f => miss.includes(f(NPCS[mama].name).slice(0, 25))), miss);
});
test("a girl answers FREE; WAIT UNTIL DAWN is a time", () => {
  const id = Object.keys(NPCS).find(i => NPCS[i].filler && NPC_ROLES[i] === "hostess");
  const a = ask(id, "free"); assert.ok(_H_FREE.some(l => a.includes(l.slice(1, 25))), a);
  G.room = "beach_rd_c"; G.nightTurn = 100; out = []; run("wait until dawn"); assert.doesNotMatch(said(), /WAIT <turns>/);
});

// ── Marta: the owner interrupted ──────────────────────────────────────────────────────
function owner() {
  G.stage = "expat"; for (const f of ["expatLife", "barPartner", "partnerTan", "barPaid", "barOpen", "tanFavourRefused"]) _setFlag(f);
  G.bar.lease = { paid: true }; G.money = 30000; G.bank = 50000; G.bar.cash = 5000; G.room = "stinky_bar"; G.nightTurn = 30;
}
test("REPAY NONT <n> pays n, a bare REPAY NONT pays it all, and a man with no loan is told Nont, not Nira", () => {
  owner(); G.room = _npcRoom("nont"); G.nightTurn = 40; G.bar.loan = { owed: 19377 };
  run("repay nont 5000"); assert.equal(G.bar.loan.owed, 14377); assert.equal(G.money, 25000);
  run("repay nont 1k"); assert.equal(G.bar.loan.owed, 13377);
  run("repay nont"); assert.equal(G.bar.loan, null);
  out = []; run("repay nont 50"); assert.match(said(), /owe Nont/);
});
test("the WORK declaration is the start of a night, never its end", () => {
  owner(); for (let k = 0; k < 8; k++) { G.bar.workedDay = 0; G.day = 20 + k; out = []; _doWork(); assert.doesNotMatch(said(), /finally empties|cash up|Nothing goes wrong|second wind/, "night " + k); }
});
test("a reload of a procurement prompt keeps Tan, the job and the figure; a shift call keeps the name; a question gets the stakes", () => {
  owner(); _synAsk(); if (G.pendingChoice === "synjob") { const job = _synJobById(G.synJob); out = []; _renderResume(); assert.ok(said().includes(job.ask.slice(0, 30))); out = []; run("what happens if I say no?"); assert.match(said(), /No is free/); }
  G.pendingChoice = null; G.shiftCall = "tab"; G.shiftLeadText = "LEAD"; G.shiftAskText = "ASK"; G.pendingChoice = "shift";
  out = []; _renderResume(); assert.match(said(), /LEAD[\s\S]*ASK/);
  out = []; run("how much is the slate?"); assert.match(said(), new RegExp("฿" + _num(SHIFT_TAB_TAKE)));
});
test("at your own bar a lost Connect 4 stake and your companion's drink ring into your own till; a companion is not your staff", () => {
  owner(); const c0 = G.bar.cash;
  const girl = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && NPCS[i].room === "pink_lotus");
  G.party = { ids: [girl], stops: 1, spent: 0, seen: {} };
  assert.ok(!_barStaff().includes(girl), "the girl on your arm is not on your floor");
  G.room = "beach_rd_c"; _arriveAt("stinky_bar"); assert.ok(G.bar.cash >= c0 + _ladyPrice() - 1, "her drink rang in");
});
test("Tan's text arrives two days after a no; the killer league is one a night", () => {
  owner(); G.tanNoteDay = G.day + 2; G.day += 2; G.battery = 80; const n0 = G.phone.inbox.length; _tanNoteTick();
  assert.equal(G.phone.inbox.length, n0 + 1); assert.equal(G.phone.inbox[G.phone.inbox.length - 1].from, "tan");
  G.lastKp = { room: "stinky_bar", day: G.day, names: [], won: false }; G.room = "stinky_bar"; G.day = 3; G.lastKp.day = 3; out = []; run("play killer"); assert.match(said(), /played for tonight|No league/);
});

// ── Desmond: the town explains ─────────────────────────────────────────────────────────
test("nobody texts you from across the table; a resident is not 'still in pattaya'", () => {
  assert.ok(String(_maybeIncomingText).includes("_npcsHere().includes(id)"));
});
test("a refusal holds when the same thing is asked as a topic", () => {
  const girl = Object.keys(NPCS).find(i => NPC_ROLES[i] === "hostess" && NPCS[i].filler);
  G.room = NPCS[girl].room; G.nightTurn = 70; G.talked[girl] = [0];
  G.soc.bfRefused = { [girl]: { kind: "temple", favor: 0 } };
  out = []; _doTalkBody(girl, "long time"); assert.doesNotMatch(said(), /BARFINE <name>|you want go with me/i);
});
test("Tan is staged at his parked car, not at the wheel, when you meet him on the soi", () => {
  assert.ok(!NPCS.tan.dialogue.some(d => /in the mirror|at the wheel|on the wheel/.test(String(d.text) + String(d.short || ""))));
});
test("an answer is a meeting: a woman who answered you does not introduce herself afterwards", () => {
  G.stage = "expat"; G.room = NPCS.cream.room; G.nightTurn = 70;
  out = []; run("ask near about cream"); assert.match(said(), /Cream/);
  assert.ok((G.talked.near || []).length > 0, "her hello is marked heard");
  out = []; run("ask near about photosynthesis");
  const hello = NPCS.near.dialogue.find(d => !d.topic);
  assert.ok(!said().includes(String(hello.text).slice(1, 30)), "no first-meeting speech after she has already answered");
  // every helper path, one shape: a stranger answered by ANY path is met afterwards
  const fresh = Object.keys(NPCS).find(i => NPCS[i].filler && NPC_ROLES[i] === "hostess" && NPCS[i].room !== G.room);
  G.room = NPCS[fresh].room; G.soc.bfRefused = { [fresh]: { kind: "temple", favor: 0 } };
  out = []; _doTalkBody(fresh, "long time"); assert.ok((G.talked[fresh] || []).length > 0);
});
