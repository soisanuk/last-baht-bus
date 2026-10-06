// Round 66 (2026-10-06, Fable): Gwen (town-book depth — 57 women, 15 bars: the seeds were
// distinct and the WRAPPERS repeated, two women on one floor back to back), Rolf (the owner's
// night off on the seeded save — the woman on his arm invisible to his own floor and to the
// girl he sleeps with), Darren (the modal mis-tapper — every question answered wrong first).
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
const owner = () => {
  G.stage = "expat"; _setFlag("expatLife"); _setFlag("barOpen"); _setFlag("barPaid"); _setFlag("barPartner"); _setFlag("partnerTan");
  G.bar = Object.assign(G.bar || {}, { room: "stinky_bar", cash: 20000, owed: 100000, worked: 5, declared: 5 });
  G.soc.drinks.manow = 15;
  G.affair = { id: "manow", since: G.day - 3, strain: 2, floorSour: 0, crisSeen: [], crisChose: {}, warned: {} };
  _setFlag("tanAsked"); _setFlag("tanFavourDone"); G.tanFavourDay = G.day;   // or Tan's favour (then the procurement beat) swallows the next command at the bar
};

// ── Gwen: the wrapper is the sentence she notices ────────────────────────────
test("the wrappers are as deep as the seeds, and the town never deals one floor the same wrapper twice while another remains", () => {
  assert.ok(_H_FAMILY_WRAP.length >= 24 && _H_PLAN_WRAP.length >= 24 && _H_HOME_WRAP.length >= 24);
  const girls = Object.keys(NPCS).filter(id => NPCS[id].filler && NPC_ROLES[id] === "hostess" && _npcActive(id));
  const byRoom = {};
  for (const id of girls) (byRoom[NPCS[id].room] = byRoom[NPCS[id].room] || []).push(id);
  // every floor with two or more girls: ask them all, no wrapper twice on that floor
  for (const [room, ids] of Object.entries(byRoom)) {
    if (ids.length < 2) continue;
    const wraps = new Set();
    for (const id of ids) { ask(id, "family"); const w = G.storyOf[id].hfamwrap; assert.ok(!wraps.has(w), room + ": wrapper " + w + " twice"); wraps.add(w); }
  }
});
test("a plan never names a relative the family line has buried", () => {
  assert.ok(_storyClash(10, 21), "papa gone → no tuk-tuk for papa");
  assert.ok(_storyClash(21, 22), "four brothers, only me → no daughter's school");
  assert.ok(!_storyClash(0, 21));
  // dealt: a woman whose family is "papa gone" is never dealt the tuk-tuk
  const id = Object.keys(NPCS).find(i => NPCS[i].filler && NPC_ROLES[i] === "hostess" && _npcActive(i));
  G.storyOf = { [id]: { hfamily: 10 } }; G.townTold = { hplan: Object.fromEntries([...Array(40).keys()].filter(i => i !== 21 && i !== 0).map(i => [i, "x"])) };
  ask(id, "plan");
  assert.notEqual(G.storyOf[id].hplan, 21);
});
test("the house answers HOME, GIRLS and MONEY — generated and authored alike", () => {
  const mama = Object.keys(NPCS).find(i => NPCS[i].filler && NPC_ROLES[i] === "mamasan" && _npcActive(i));
  const cash = Object.keys(NPCS).find(i => NPCS[i].filler && NPC_ROLES[i] === "cashier" && _npcActive(i));
  assert.match(ask(mama, "home"), new RegExp(NPCS[mama].storyBits.from.replace(/[{}]/g, "")));
  assert.match(ask(cash, "home"), new RegExp(NPCS[cash].storyBits.from.replace(/[{}]/g, "")));
  // authored: Candy's girls, Jenny's money, Peung's home
  const cg = ask("candy", "girls"); assert.ok(_M_GIRLS.some(l => cg.includes(l.slice(1, 30))), cg);
  ask("jenny");   // her hello first — a stranger's first word is the greeting, whatever you asked
  const jm = ask("jenny", "money");   // asked ONCE — the second ask is the terse gist
  assert.ok(_C_MONEY.some(l => jm.includes(l.slice(1, 30))), jm);
  assert.doesNotMatch(ask("joon", "money"), /on my side of the counter/);
});
test("the White Rabbit is Lao and says so; Malai's daughter is Jun; Oy owns her floor", () => {
  assert.match(ask("nuan", "home"), /Savannakhet/); assert.match(ask("champa", "home"), /Lao/); assert.match(ask("boua", "home"), /Lao/);
  assert.doesNotMatch(ask("nuan", "family"), /Sattahip/);
  assert.match(ask("malai", "family"), /Jun/);
  assert.doesNotMatch(ask("oy", "girls"), /Not mine/);
});
test("a fluent girl keeps her English on question two; the house repeats itself in its own register", () => {
  const a = ask("nira", "family");
  assert.ok(_H_FAMILY_WRAP_EN.some(w => a.includes(w("x").slice(5, 25))) || !/\bna\b|tilac/.test(a), a);
  ask("oy", "home"); const again = ask("oy", "home");
  assert.doesNotMatch(again, /Farang memory|Aiyah/);
});
test("the house's miss does not invite the question just asked, and the mamasan's miss has no tilac", () => {
  for (const f of _TOPIC_MISS_HOUSE) { const t = f("X"); assert.doesNotMatch(t, /or the girls/); assert.doesNotMatch(t, /tilac/); }
});

// ── Rolf: the woman on your arm, on your own floor ───────────────────────────
test("a companion from another bar is not your staff, and your floor sees her", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30;
  G.party = { ids: ["lek"], stops: 0, spent: 0, seen: {} };
  assert.ok(!_ownBarStaff("lek"));
  out = []; _partyArrive("stinky_bar");
  assert.ok(G.affair.discovered && G.affair.soured, "she saw it");
  assert.match(said(), /sees Lek/);
});
test("a girl in your bed on a night of the affair is seen, and the tender morning line does not print", () => {
  owner(); G.room = _hotelRoomId(); G.nightTurn = 70; G.affair.homeDay = G.day;
  G.party = { ids: ["lek"], stops: 1, spent: 0, seen: {} };
  out = []; _endNight("sleep");
  assert.ok(G.affair.discovered, "discovered");
  assert.doesNotMatch(said(), /asleep before you had said anything|telling you who was drunk/);
  assert.match(said(), /two pairs of shoes/);
});
test("after she found out, the greeting, the apology and the floor's review all know", () => {
  owner(); G.affair.soured = true; G.affair.discovered = true;
  G.room = "stinky_bar"; G.nightTurn = 30;
  out = []; _relGreeting("manow"); assert.ok(_REL_GREET_AFFAIR_SOUR.some(f => said().includes(f("Manow").slice(0, 40))));
  out = []; run("apologize"); assert.match(said(), /Sorry is a word|Don't do the thing again/);
  out = []; _doTalkBody("lamai", "manow"); assert.match(said(), /not happy/);
});
test("the affair girl answers her own topics (late, free) and the man on the fifty-one", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30;
  out = []; _doTalkBody("manow", "late"); assert.doesNotMatch(said(), /No idea, na|Bert know everything useless/);
  out = []; _doTalkBody("manow", "tan"); assert.match(said(), /Tan/);
});
test("TAKE MANOW OUT and TAKE MANOW FOR DINNER answer in her voice", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30;
  out = []; run("take manow out"); assert.match(said(), /I work here, boss/);
  out = []; run("take manow for dinner"); assert.match(said(), /our dinner/);
});
test("a companion's drinks at your own bar are a BOOKS line of their own", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30; G.party = { ids: ["lek"], stops: 0, spent: 0, seen: { stinky_bar: true } };
  G.bar.ownDrinks = 0; G.bar.guestDrinks = 0;
  run("buy drink for lek");
  assert.ok((G.bar.guestDrinks || 0) > 0); assert.equal(G.bar.ownDrinks || 0, 0);
});
test("the rose family never pitches the owner at his own rail", () => {
  owner(); G.room = "stinky_bar"; G.nightTurn = 30; G.convo = "manow"; G.soc.drinks.manow = 15;
  const saved = _rand; try { _rand = () => 0.01; out = []; _flowerTick(); } finally { _rand = saved; }
  assert.doesNotMatch(said(), /rose/i);
});
test("the elsewhere line does not say 'over in Soi 6' on Soi 6", () => {
  G.room = "soi6_mid"; G.known.doyle = true; G.talked.doyle = [0];
  const l = _elsewhereLine("doyle");
  if (l && /Soi 6/.test(ROOMS[_npcRoom("doyle")].region)) assert.doesNotMatch(l, /over in Soi 6/);
});

// ── Darren: a question is not an answer ──────────────────────────────────────
test("the Soi 6 week's-end gate explains on a question and commits only on the choice", () => {
  newGame(); startSoi6Mode(); G.pendingChoice = "vacation_end"; G.happy = 51; const v = G.vacation, d = G.day;
  out = []; run("what happens if i play again?");
  assert.equal(G.pendingChoice, "vacation_end"); assert.equal(G.happy, 51);
  assert.match(said(), /SHARE first/);
  run("play again"); assert.notEqual(G.pendingChoice, "vacation_end");
});
test("'what?' to her question asks her to repeat it — it is never stored as your answer", () => {
  G.room = _npcRoom("lek"); G.nightTurn = 20;
  G.convo = "lek"; G.convoQ = { id: "lek", key: "home", q: "\"You from where?\"" };
  out = []; run("what?");
  assert.ok(G.convoQ, "still asked"); assert.equal((G.player.said || {}).home, undefined); assert.match(said(), /You from where/);
});
test("'what?' at an encounter puts the prompt again and resolves nothing", () => {
  G.room = "beach_rd_c"; G.encDone = {};
  _startEnc("brit"); if (!G.pendingEnc) return;
  const enc = G.pendingEnc; out = []; run("what?");
  assert.equal(G.pendingEnc, enc, "still pending");
});
test("the early-sleep confirm disarms after a command or two", () => {
  G.room = _hotelRoomId(); G.nightTurn = 2; G.wakeTurn = G.turns; G.day = 7;
  run("sleep"); assert.match(said(), /SLEEP again if you mean it/); const day = G.day;
  run("look"); run("look"); run("look");
  out = []; run("sleep");
  assert.equal(G.day, day, "a sleep five inputs later is warned again, not taken");
});
test("DROP <digit> after the game is over is not your pockets; a stale modal answer is 'that moment has passed'", () => {
  G.room = "stinky_bar"; G.itemLoc.receipt = "inventory";
  out = []; run("drop 7"); assert.match(said(), /that game is over/); assert.equal(G.itemLoc.receipt, "inventory");
  out = []; run("short time"); assert.match(said(), /moment has passed/);
  out = []; run("3"); assert.match(said(), /moment has passed/);
});
test("the cart holds its pitch while a barfine is on the table", () => {
  G.room = "stinky_bar"; G.pendingBf = { id: "manow", st: 500, lt: 1000 };
  G.salengCart = null; G.lastSaleng = 0;
  const saved = _rand; try { _rand = () => 0.0; out = []; _salengTick(); } finally { _rand = saved; }
  assert.equal(G.salengCart, null);
});
test("a question in a table game costs no turn", () => {
  G.room = "stinky_bar"; G.money = 2000; run("play connect 4"); if (!G.game) return;
  const t = G.turns; run("what if i drop 4?"); assert.equal(G.turns, t);
});
test("the chip bar offers no bus on the Soi 6 week and no shuttered bar", () => {
  newGame(); startSoi6Mode(); G.pendingChoice = null; G.room = "soi6_mid"; G.nightTurn = 70;
  const chips = _chipSet().map(c => c.cmd);
  assert.ok(!chips.includes("ride bus"));
  for (const v of ROOMS.soi6_mid.venues || []) if (_closedNow(v)) assert.ok(!chips.some(c => c === "enter " + (ROOMS[v].bar || ROOMS[v].name).toLowerCase()));
});
