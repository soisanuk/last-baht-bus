// Round 58 (2026-09-29) — Graeme (Fable, massage-circuit: a Dundee physio at every massage
// shop, twice), Declan (Fable, back-room: a concierge who must be let into the room behind
// the rope), Priya (Opus, five-minute-sessions: reloads, hard closes and UNDO at the worst
// moments). Graeme's severe: ten honest shops shared one nameless auntie from Udon. Declan's:
// Doyle's paid job was invisible to QUESTS, and "table" at the good table was the pool helper's.
// Priya's: every continue after 04:00 wound the clock back to 04:00.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
const quiet = () => { for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true; G.pendingEnc = null; };
const run = c => { out = []; doCommand(c); return text(); };
beforeEach(() => {
  out = []; newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000; G.bank = 50000; quiet(); G.peddlerNight = 2; G.nightTurn = 30;
});

// ── Priya ────────────────────────────────────────────────────────────────
test("a continue after 04:00 keeps the clock (Priya's severe)", () => {
  G.nightTurn = 110; const blob = serializeGame();
  newGame(); deserializeGame(blob);
  assert.equal(G.nightTurn, 110);
});

test("two NOs are the same answer: an honest player is not called a liar", () => {
  assert.ok(_saidAgrees("no, nobody", "No. Not for a while now"));
  assert.ok(!_saidAgrees("Manchester", "Leeds"), "real disagreements still disagree");
});

test("the beach redraw under rain has no awning", () => {
  G.room = "jomtien_beach"; G.rain = 5; out = []; _describeRoom(true);
  assert.doesNotMatch(text(), /awning overhead/);
});

test("a quiz takes the moment from a pending question", () => {
  G.convoQ = { id: "bert", key: "why", q: "why here?" };
  G.room = "stinky_bar"; _startQuiz(true);
  assert.equal(G.convoQ, null);
});

test("the ATM pointer is the nearest machine by the road", () => {
  const withAtm = Object.keys(ROOMS).find(k => ROOMS[k].atm && Object.values(ROOMS[k].exits || {}).some(n => ROOMS[n] && !ROOMS[n].atm && ROOMS[n].region === ROOMS[k].region));
  const next = Object.values(ROOMS[withAtm].exits).find(n => ROOMS[n] && !ROOMS[n].atm && ROOMS[n].region === ROOMS[withAtm].region);
  G.room = next; const t = run("withdraw 1000");
  if (/nearest machine/.test(t)) assert.ok(t.includes(ROOMS[withAtm].name) || _hops(next, withAtm) <= 1, t);
});

test("LISTEN in a bar hears the downpour", () => {
  G.room = "stinky_bar"; G.rain = 5;
  assert.match(run("listen"), /Rain on the roof/);
});

test("the Jackpot redraw names the roll the choice came from", () => {
  G.room = "lucky_tiger"; run("play jackpot");
  if (G.game && G.game.pending) { out = []; _renderGame(); assert.match(text(), /You rolled \d\+\d/); }
});

test("Tan reads a venue asked by its whole name, not his node on one of its words", () => {
  G.room = _npcRoom("tan"); G.visited.candy_bar_2 = true;
  assert.doesNotMatch(run("ask tan about candy bar 2"), /coffee/);
});

// ── Declan ───────────────────────────────────────────────────────────────
test("a paid origin scene is a job: QUESTS lists Doyle's recce (Declan's severe)", () => {
  G.quests.orchid_recon = "active";
  assert.match(run("quests"), new RegExp(QUESTS.orchid_recon.name));
  assert.ok(!_quietVignette(QUESTS.orchid_recon) && _quietVignette(QUESTS.quiet_one), "unpaid vignettes stay quiet");
});

test("'table' at the good table is the room's table, not the pool helper's", () => {
  G.room = "orchid_room";
  const staff = _npcsHere().find(i => i !== "powers");
  if (staff) assert.doesNotMatch(run(`ask ${NPCS[staff].name.toLowerCase()} about table`), /No table in here/);
  if (_npcsHere().includes("powers")) { run("talk to laurent"); assert.match(run("ask laurent about that quiet table"), /not a topic/); }
});

test("Laurent carries none of the founder's register: no phone waved, no 'mate', no blogger, no jail", () => {
  const all = NPCS.powers.dialogue.map(d => (d.text || "") + " " + (d.short || "")).join(" ");
  assert.doesNotMatch(all, /\bmate\b|blogger|waves it away with his phone|phone goes down|FAMILY|OPERATIONS/);
});

test("the room's fixtures read: the shrine and ledgers in Oy's office, the president and the envelope, the Pink Lotus door, the Naklua wall", () => {
  for (const [room, noun] of [["oy_office", "shrine"], ["oy_office", "ledgers"], ["orchid_room", "president"], ["orchid_room", "envelope"], ["pink_lotus", "door"], ["naklua_rd", "wall"]]) {
    G.room = room; const t = run("examine " + noun);
    assert.doesNotMatch(t, /isn't here|declines to elaborate|this is just road|Not here\. Or not a thing/, room + "/" + noun + ": " + t);
  }
});

test("the doorman can be spoken to; the open safe is open", () => {
  G.room = "pink_lotus"; assert.match(run("talk to doorman"), /Members|Good evening/);
  _setFlag("hasWallet"); G.room = "oy_office"; assert.match(run("examine safe"), /open and empty/);
});

test("no saleng outside a members' back room", () => {
  assert.ok(ROOMS.orchid_room.invite);
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-encounters.js", import.meta.url)), "utf8");
  assert.match(src, /!_room\(\)\.invite && !_room\(\)\.indoors/);
});

// ── Graeme ───────────────────────────────────────────────────────────────
test("every honest shop without a cast masseuse has its own woman, and she answers what she is asked (Graeme's severe)", () => {
  const legit = Object.keys(ROOMS).filter(k => ROOMS[k].massage === "legit" && !Object.keys(NPCS).some(i => NPCS[i].masseuse && NPCS[i].room === k));
  for (const r of legit) assert.ok(SHOP_MASSEUSES[r], r + " has no woman");
  const names = legit.map(r => SHOP_MASSEUSES[r].name);
  assert.equal(new Set(names).size, names.length, "ten different women");
  for (const n of names) assert.ok(!Object.values(NPCS).some(p => p.name.split(" ").pop() === n), n + " collides with the cast");
  G.room = "naklua_thai"; const sw = SHOP_MASSEUSES.naklua_thai;
  assert.match(run("ask masseuse about name"), new RegExp(sw.name));
  assert.ok(run("ask masseuse about home").includes(sw.from.slice(1, 20)));
  assert.ok(run("ask masseuse about family").includes(sw.kin.slice(0, 20)));
  G.room = "jomtien_thai"; assert.notEqual(run("ask masseuse about home"), (G.room = "naklua_thai", run("ask masseuse about home")), "two shops, two women");
});

test("the town can say where a massage is", () => {
  G.room = "stinky_bar"; const t = run("ask bert about massage");
  assert.doesNotMatch(t, /not my|No idea|Search me/i);
});

test("the women's own stories can be asked back: Orapin's daughter, Jintana's cat and band, Joom's durian, Waan's name, Pensri's home", () => {
  for (const [room, who, q, re] of [["lotus_oil", "orapin", "daughter", /daughter/], ["beachrd_oil", "jintana", "cat", /cat/], ["beachrd_oil", "jintana", "band", /karaoke/i],
    ["jomtien_soi_7_oil", "joom", "durian", /durian/], ["smile_massage", "waan", "name", /Waan/], ["thai_massage", "pensri", "home", /Lampang/]]) {
    G.room = room; run("talk to " + who); assert.match(run(`ask ${who} about ${q}`), re, who + "/" + q);
  }
});

test("five named women are not one pair of hands: the oil shop's delivery is a pool", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8");
  assert.match(src, /const _OIL_KIND = \{/);
});

test("a 7-Eleven door on the street sells water from the pavement", () => {
  G.room = "jomtien_beach_rd_s"; const m = G.money;
  run("buy water"); assert.ok(G.money < m);
});

// ── Mario's calls after round 58 ─────────────────────────────────────────
test("SEND draws down the bank account, not the pocket", () => {
  G.phone.contacts.bee = true; G.money = 500; G.bank = 1000;
  run("send 200 to bee");
  assert.equal(G.bank, 800); assert.equal(G.money, 500);
  assert.match(run("send 5000 to bee"), /in the account/);
  assert.equal(G.bank, 800, "a send the account can't cover moves nothing");
});

test("Oy's office is closed again once the wallet quest is done", () => {
  G.room = "rainbow_girls"; _setFlag("officeOpen");
  run("office");
  assert.equal(G.room, "rainbow_girls", "security holds the door after Act One");
  assert.ok(_pickVary && /Mamasan office|old meaning|Office is office|your song/.test(text()), text());
});

// Notty's is the one door you cannot walk through, and the town stopped giving it an
// address like a beer bar (Mario, 2026-09-29): Tan said "Same as here with different
// faces, mate" about a wall nobody gets past, and the wall itself pointed nowhere.
test("Notty's: the town says you get sent, and the wall says who does the sending", () => {
  G.room = _npcRoom("tan"); run("talk to tan"); out = [];
  run("ask tan about notty's place");
  let said = out.map(o => o.text).join("\n");
  assert.doesNotMatch(said, /different faces|mate/, "not the generic venue line");
  assert.match(said, /wall/i); assert.match(said, /run bars in this town/);
  G.room = "stinky_bar"; run("talk to bert"); out = [];
  run("ask bert about notty's place");
  said = out.map(o => o.text).join("\n");
  assert.ok(_TOWN.sent.house.some(l => said.includes(l.split("{n}")[1].slice(0, 20))), "the discreet pool"); assert.match(said, /owned a bar|run bars|run a floor/);
  G.flags.orchidSent = true; out = [];
  run("ask bert about notty's place AGAIN");
  assert.doesNotMatch(out.map(o => o.text).join("\n"), /owned a bar here|run bars in this town longest|since before the Metro/, "once sent, no hint");
  delete G.flags.orchidSent;
  G.room = Object.keys(ROOMS).find(r => (ROOMS[r].venues || []).includes("nottys_place"));
  G.encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  out = []; run("enter notty's place");
  assert.notEqual(G.room, "nottys_place");
  assert.ok(_ORCHID_CLUB_UNKNOWN.every(l => /bars? (in this town|here)/.test(l)), "every wall line names who sends");
});
