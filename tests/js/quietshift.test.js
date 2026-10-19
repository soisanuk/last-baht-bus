// THE QUIET SHIFT CHANGE (canon essay, 2026-10-19 — structure only, docs/source-material-policy.md): a kept girl's
// sponsor pays the bar a daily fee to keep her off the floor; he stops paying and she stops coming; the house's threat
// to send her photo round is empty — there is no list — and the floor reads it in silence, each waiting her turn.
// Two carriers: the kept EXIT town-wide (a third of the kept girls leave this way, through _exited's "kept"), and the
// OWNER'S kept girl (the fee in BOOKS, the lapse, Bert with the bar phone — a modal; either answer loses her, only
// sending it costs the floor's regard). The manager is Bert, not the essay's; nobody and no venue is named.
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
const owner = () => { G.stage = "expat"; G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true; G.bar.room = "stinky_bar"; G.bar.owner = true; G.room = "stinky_bar"; G.money = 20000; G.bar.cash = 5000; G.flags.tanAsked = true; run("look"); while (G.pendingChoice) run("no"); out = []; };

beforeEach(() => {
  newGame();
  G.player = { origin: "redundancy", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true; G.nightTurn = 30; out = [];
});

// ── C: the kept exit, town-wide ──
test("a third of the kept girls leave with their sponsor on a later trip; every consumer removes her, and the pools branch", () => {
  const kept = Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess" && _hasSponsor(i));
  G.vacation = 8; G.day = 3;
  const gone = kept.filter(i => _exited(i) === "kept");
  assert.ok(gone.length >= kept.length / 5 && gone.length <= kept.length / 2, `${gone.length} of ${kept.length}`);
  // a kept woman whose bar has no OTHER exited hostess, so the roster line is hers
  const id = gone.find(g => !Object.keys(NPCS).some(o => o !== g && NPCS[o].room === NPCS[g].room && NPC_ROLES[o] === "hostess" && _exited(o))) || gone[0];
  assert.equal(_npcActive(id), false, "off her floor");
  G.room = NPCS[id].room; G.talked[id] = [0]; G.exitSaid = {}; out = []; _describeRoom();
  assert.match(said(), /sponsor|out with customer|condo/i, "the roster line is the kept one: " + said());
  assert.doesNotMatch(said(), /She go home\. She kept/, "never the plan pool with the sentinel in it");
  const col = Object.keys(NPCS).find(i => NPCS[i].room === NPCS[id].room && i !== id && NPC_ROLES[i] === "hostess" && _npcActive(i));
  if (col) { run("talk to " + NPCS[col].name.toLowerCase()); out = []; run("ask " + NPCS[col].name.toLowerCase() + " about " + NPCS[id].name.toLowerCase());
    assert.match(said(), /sponsor|group|nobody answer|brave|no list|photo|condo|her man/i, said()); }
  G.vacation = 1; assert.notEqual(_exited(id), "kept", "not on the first trip");
});

test("her one text is the kept one, and the black book says where she went", () => {
  const kept = Object.keys(NPCS).filter(i => NPCS[i].filler && NPC_ROLES[i] === "hostess" && _hasSponsor(i));
  G.vacation = 8; const id = kept.find(i => _exited(i) === "kept");
  G.phone.contacts = G.phone.contacts || {}; G.phone.contacts[id] = true;
  G.phone.lastText = -100; G.phone.exitTexted = {}; out = [];
  _maybeIncomingText(); run("check messages");
  assert.match(said(), /sukhumvit|not work bar|finish bar|not come bar/i, said());
  out = []; run("blackbook"); assert.match(said(), /with her sponsor/);
});

// ── A: the owner's kept girl ──
test("the fee is a BOOKS line while he pays; she is off the floor; then the fee stops and the board says out with customer", () => {
  owner(); G.bar.nights = 14; G.day = 20;
  const hs = _barStaff().filter(i => NPC_ROLES[i] === "hostess");
  _keptTick();
  if (!G.bar.kept) { G.bar.kept = { id: hs[0], since: G.day, paidTo: G.day + 3, stage: "paying", told: false, fee: 0 }; }
  const id = G.bar.kept.id;
  assert.equal(_npcActive(id), false, "kept off the floor");
  G.nightTurn = 20; out = []; run("look"); assert.match(said(), /sponsor.*fee|fee.*sponsor/i, "Bert tells you: " + said());
  const c0 = G.bar.cash; G.day++; _keptTick(); assert.equal(G.bar.cash, c0 + KEPT_FEE, "the fee into the till");
  out = []; run("books"); assert.match(said(), /out with her sponsor/);
  G.bar.kept.paidTo = G.day; G.day++; _keptTick(); G.day++; _keptTick();
  assert.equal(G.bar.kept.stage, "lapsed");
  out = []; run("books"); assert.match(said(), /out with customer/);
  assert.equal(_railLostOn(G.day), 0, "nothing yet");
});

test("three nights of silence: Bert with the phone — a question keeps the gate; LET HIM sends it and the floor goes quiet; she is gone either way", () => {
  owner(); G.day = 30; const id = _barStaff().filter(i => NPC_ROLES[i] === "hostess")[0];
  G.bar.kept = { id, since: 10, paidTo: 20, stage: "lapsed", lapsed: 27, told: true, fee: 5000 };
  G.nightTurn = 30; assert.ok(_keptDue()); out = []; run("look");
  assert.equal(G.pendingChoice, "keptgirl"); assert.match(said(), /photo/);
  assert.deepEqual(_chipSet().map(c => c.cmd), ["no", "let him"]);
  out = []; run("what does it cost?"); assert.equal(G.pendingChoice, "keptgirl"); assert.match(said(), /no list/i);
  G.happy = 20; const h = G.happy; out = []; run("let him");
  assert.equal(G.pendingChoice, null); assert.ok(G.bar.gone[id] && G.bar.gone[id].kept); assert.equal(_npcActive(id), false);
  assert.match(said(), /silence|nobody says anything/i); assert.match(said(), /no list/i);
  assert.ok(G.bar.floorQuietUntil > G.day, "the floor is quiet with you"); assert.ok(G.happy < h, "and it is on the meter, named");
  assert.equal(_railLostOn(G.day), 0, "a kept girl took no rail with her");
  out = []; run("books"); assert.match(said(), /off the board/); assert.match(said(), /quiet with you/);
  const col = _barStaff().find(i => NPC_ROLES[i] === "hostess" && i !== id);
  run("talk to " + NPCS[col].name.toLowerCase()); while (G.pendingChoice) run("no");   // the night's procurement offer may be dealt on the next command
  run("talk to " + NPCS[col].name.toLowerCase()); out = []; run("ask " + NPCS[col].name.toLowerCase() + " about " + NPCS[id].name.toLowerCase());
  assert.match(said(), /sponsor|group|nobody answer|brave|no list|photo|condo|her man/i, "her colleagues answer where she went: " + said());
});

test("NO is free: she is gone the same, nothing on the floor, nothing on the meter", () => {
  owner(); G.day = 30; const id = _barStaff().filter(i => NPC_ROLES[i] === "hostess")[0];
  G.bar.kept = { id, since: 10, paidTo: 20, stage: "lapsed", lapsed: 27, told: true, fee: 5000 };
  G.nightTurn = 30; run("look"); assert.equal(G.pendingChoice, "keptgirl");
  const h = G.happy; out = []; run("no");
  assert.equal(G.pendingChoice, null); assert.ok(G.bar.gone[id] && G.bar.gone[id].kept);
  assert.equal(G.happy, h); assert.ok(!G.bar.floorQuietUntil); assert.match(said(), /no list/i);
});

test("the Owl has the lead, and nothing copies the essay's distinctive phrases", () => {
  assert.ok(_OWL_LEADS.some(l => /THERE IS NO LIST/.test(l)));
  const all = [..._OWL_LEADS, ..._EXIT_ROSTER_KEPT, ..._GONE_FLOOR_KEPT, ..._GONE_HOUSE_KEPT, ..._EXIT_TEXT_KEPT,
    readFileSync(fileURLToPath(new URL("../../web/js/engine-systems.js", import.meta.url)), "utf8").match(/function _kept[\s\S]*?function _workPresenceTick/)[0]].join("\n");
  assert.doesNotMatch(all, /almost always silent|illusion of authority|wants exclusivity|envying her nerve|into the void|wall of text|\bGary\b/i);
});
