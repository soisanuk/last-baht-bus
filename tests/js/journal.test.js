// The known subgraph: the frontier HINT and the JOURNAL (design note in
// docs/design-backlog.md, 2026-09-15). The one law: the frontier is built ONLY
// from what the transcript printed — it may name a person whose name printed,
// a room you stood in, a venue whose name printed, a region and a direction,
// and never an unvisited room or an unmet person. It observes; no meter moves.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../web/js/", import.meta.url));
for (const f of ["thai.js", "world.js", "games.js", "cli-sim.js", "engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"])
  vm.runInThisContext(fs.readFileSync(root + f, "utf8"), { filename: f });

let out = [];
engineInit((t, c) => out.push({ text: String(t), cls: c }));
const text = () => out.map(o => o.text).join("\n");
function fresh() {
  newGame(); G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 3000;
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true; G.peddlerNight = 2;
  out = [];
}
// every proper noun the frontier is allowed to print, given G
function allowed() {
  const ok = new Set();
  for (const id of Object.keys(G.known || {})) if (NPCS[id]) ok.add(NPCS[id].name);
  for (const r of Object.keys(G.visited || {})) if (ROOMS[r]) { ok.add(ROOMS[r].name); if (ROOMS[r].bar) ok.add(ROOMS[r].bar); }
  for (const r of Object.keys(G.heardOf || {})) if (ROOMS[r] && ROOMS[r].bar) ok.add(ROOMS[r].bar);
  return ok;
}
function spoils(lines) {
  const ok = allowed(), bad = [];
  const names = new Set(Object.values(NPCS).filter(n => !n.filler).map(n => n.name));
  const rooms = new Set(Object.values(ROOMS).flatMap(r => [r.name, r.bar].filter(Boolean)));
  for (const l of lines) {
    for (const nm of names) if (!ok.has(nm) && new RegExp("\\b" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(l)) bad.push(`${nm} in "${l}"`);
    for (const nm of rooms) if (!ok.has(nm) && nm.length > 4 && l.includes(nm)) bad.push(`${nm} in "${l}"`);
  }
  return bad;
}

test("a fresh sandbox's frontier is exits only, and names nothing the transcript hasn't", () => {
  fresh();
  const fr = _frontier(8);
  assert.ok(fr.length >= 1);
  assert.ok(fr.every(f => f.kind === "exit"), "nothing but ways out of the one room you stood in");
  assert.deepEqual(spoils(fr.map(f => f.text)), []);
  assert.ok(fr.every(f => !/Jomtien Soi 7|Beach Road/.test(f.text)), "the far side of an exit is never named");
});

test("after a conversation the frontier has provenance, and still never spoils", () => {
  fresh(); G.room = "stinky_bar"; G.visited.stinky_bar = true;
  doCommand("talk to bert"); doCommand("ask bert about white dish");
  const fr = _frontier(8);
  const person = fr.find(f => f.kind === "person");
  assert.ok(person, "a name that printed and a face never met");
  assert.match(person.text, /Bert mentioned/, "who said it");
  assert.match(person.text, /at The Stinky Pinky/, "and where");
  assert.deepEqual(spoils(fr.map(f => f.text)), []);
  for (const f of fr) if (f.kind === "person" && f.cmd) assert.doesNotMatch(f.cmd, /TRAVEL/, "TRAVEL only for a bar you have stood in");
  // walk to Candy Bar and Bee's bar becomes a TRAVEL when known
  assert.ok(G.namedBy.kesinee && G.namedBy.kesinee.by === "bert" && G.namedBy.kesinee.room === "stinky_bar");
});

test("the frontier is a projection: reading it moves no meter and costs no turn", () => {
  fresh(); G.room = "stinky_bar"; doCommand("talk to bert");
  const h = G.happy, t = G.turns, m = G.money;
  out = []; doCommand("journal"); doCommand("journal record"); doCommand("notes"); _frontier();
  assert.equal(G.happy, h); assert.equal(G.turns, t); assert.equal(G.money, m);
  assert.match(text(), /what is open/); assert.match(text(), /the record/);
});

test("JOURNAL is three-surfaced and HINT falls through to the frontier", () => {
  assert.ok(_COMPLETE_VERBS.includes("journal"));
  assert.match(_helpFirstPage(), /JOURNAL/);
  assert.match(_HELP, /JOURNAL/);
  fresh(); G.room = "stinky_bar"; doCommand("talk to bert"); doCommand("ask bert about white dish");
  for (const q of Object.keys(QUESTS)) G.quests[q] = "done";   // nothing on the books
  out = []; doCommand("hint");
  assert.match(text(), /mentioned|never took|never found|never asked/, "the frontier is the hint when the books are empty");
  assert.deepEqual(spoils(out.map(o => o.text)), []);
});

test("a venue whose name printed before you found it is a frontier edge", () => {
  fresh(); G.room = "stinky_bar";
  _say("Terry drinks at Queen Vic Inn most nights.");
  assert.ok(G.heardOf.queen_vic, "heard of");
  const v = _frontier(8).find(f => f.kind === "venue");
  assert.ok(v && /Queen Vic Inn/.test(v.text));
  G.visited.queen_vic = true;
  assert.ok(!_frontier(8).find(f => f.kind === "venue" && /Queen Vic/.test(f.text)), "found: no longer an edge");
});

test("Tan's stuck nudge texts the frontier, not a shrug", () => {
  fresh(); G.room = "stinky_bar"; G.visited.stinky_bar = true; doCommand("talk to bert"); doCommand("ask bert about white dish");
  G.phone.contacts.tan = true; G.phone.battery = 80; G.stuck = { noname: 0, parse: 0, terse: false }; G.stuckDay = 0;
  out = []; _tanUnstick();
  const msg = (G.phone.inbox || []).slice(-1)[0];
  assert.ok(msg && msg.from === "tan");
  assert.match(String(msg.text), /try this — /);
  assert.deepEqual(spoils([String(msg.text)]), []);
});

// ── Ines's round (2026-09-16): the law tightened ─────────────────────────────

test("an unmet person's note carries provenance and never a location; Tan and Act One are excluded", () => {
  fresh(); G.room = "stinky_bar"; G.visited.stinky_bar = true;
  doCommand("talk to bert"); doCommand("ask bert about white dish");
  const people = _frontier(10).filter(f => f.kind === "person");
  assert.ok(people.length);
  for (const p of people) {
    assert.doesNotMatch(p.text, /is at|is out|over in|tonight/, "where they are is Tan's to tell: " + p.text);
    assert.match(p.text, /mentioned|You saw/);
    assert.ok(!p.cmd || !/ASK TAN/.test(p.cmd), "no ASK TAN when Tan is not here: " + p.cmd);
    assert.doesNotMatch(p.text, /\bTan\b/);
  }
  // Act One: no people, no venues — only ways and topics
  fresh(); G.flags.act1Done = false; G.stage = "act1"; G.room = "stinky_bar"; G.visited.stinky_bar = true;
  doCommand("talk to bert");
  assert.ok(_frontier(10).every(f => f.kind === "exit" || f.kind === "topic"));
});

test("a venue whose door you stood at is found; a way refused tonight is not offered; asking Tan retires the note", () => {
  fresh(); G.room = "beach_rd_n"; G.visited.beach_rd_n = true;
  const v = (ROOMS.beach_rd_n.venues || [])[0]; assert.ok(v);
  _say(`Somebody says ${ROOMS[v].bar} is the place.`);
  assert.ok(G.heardOf[v] || G.visited[v], "heard of");
  assert.ok(!_frontier(10).some(f => f.kind === "venue" && f.text.includes(ROOMS[v].bar)), "its door is on a street you walked");
  // a refused way
  G.room = "rainbow_girls"; G.visited.rainbow_girls = true;
  const before = _frontier(10).find(f => f.kind === "exit" && /OFFICE/.test(f.cmd || ""));
  G.exitTried["rainbow_girls:office"] = G.day;
  assert.ok(!_frontier(10).find(f => f.kind === "exit" && /OFFICE/.test(f.cmd || "")), "not offered again tonight" + (before ? "" : " (no office way listed at all)"));
  // Tan asked → the person note retires
  G.room = "stinky_bar"; G.visited.stinky_bar = true; doCommand("talk to bert"); doCommand("ask bert about white dish");
  const id = _frontier(10).filter(f => f.kind === "person").length ? Object.keys(G.known).find(k => !_met(k) && NPCS[k] && !NPCS[k].filler && k !== "tan" && !NPCS[k].offmap) : null;
  if (id) { G.tanAsked[id] = G.day; assert.ok(!_frontier(10).some(f => f.kind === "person" && f.text.includes(NPCS[id].name)), "retired"); }
});

test("a face seen on the Here: line is 'you saw', not 'somebody mentioned'; the small hours name your bed", () => {
  fresh(); G.room = "queen_vic"; G.visited.queen_vic = true; G.known = {}; G.namedBy = {};
  _describeRoom(true);
  const seen = Object.keys(G.namedBy).filter(id => G.namedBy[id].seen);
  assert.ok(seen.length, "the rail's names were seen, not mentioned");
  const f = _frontier(10).find(x => x.kind === "person");
  if (f) assert.match(f.text, /^You saw /);
  G.nightTurn = LAST_BUS_TURN; G.room = "stinky_bar";
  const home = _frontier(10).find(x => x.kind === "home");
  assert.ok(home && /Your bed is at/.test(home.text) && home.cmd === "TRAVEL HOTEL");
});

test("JOURNAL is not swallowed by the fare prompt", () => {
  fresh(); G.room = "beach_rd_c"; G.pendingFare = { kind: "bus", price: BUS_FARE, dest: "beach_rd_n" };
  out = []; doCommand("journal");
  assert.match(text(), /what is open/); assert.ok(G.pendingFare, "and the driver is still waiting");
  G.pendingFare = null;
});

// ── Ruth's round (2026-09-16): the spoiler hunter ────────────────────────────

test("a bar's name is not a person's: SILK ROSE does not teach you Rose", () => {
  fresh(); G.known = {}; G.namedBy = {};
  _say("The lane: SILK ROSE, a massage shop, and the Old Market beyond.");
  assert.ok(!G.known.rose, "Rose is the mamasan at Notty's, not a lane");
  _say("Candy says Rose keeps a clean villa.");
  assert.ok(G.known.rose, "her own name, said, still counts");
});

test("an unmet person's note never points at a door, and the quest journal names a venue only once you have heard it", () => {
  fresh(); G.room = "naklua_rd"; G.visited.naklua_rd = true; G.known.rose = true; G.namedBy.rose = { room: "naklua_rd", by: null, day: G.day };
  const p = _frontier(10).find(f => f.kind === "person" && /Rose/.test(f.text));
  if (p) assert.ok(!p.cmd || !/ENTER|TRAVEL/.test(p.cmd), "no door for the unmet: " + p.cmd);
  // the quest journal: Pim at Starlight, unheard of
  G.room = "rainbow_girls"; G.visited.rainbow_girls = true; G.heardOf = {}; delete G.talked.pim;
  const w = _questWhere("pim");
  assert.doesNotMatch(w, /Starlight|Tree Town/, "not before the name has printed: " + w);
  assert.match(w, /ask around|ASK TAN/);
  G.heardOf[_npcRoom("pim")] = true;
  assert.match(_questWhere("pim"), /Starlight/, "heard of: named");
  // TRAVEL's refusal likewise
  G.heardOf = {}; out = []; doCommand("travel naklua traditional massage");
  assert.doesNotMatch(text(), /Naklua Traditional Massage is over in/);
});

test("the Act One checklist does not name Madam Oy on the beach, and a dead phone's notes are from memory", () => {
  fresh(); G.flags.act1Done = false; G.stage = "act1"; G.known = {}; out = []; _doQuests();
  assert.doesNotMatch(text(), /Madam Oy/); assert.match(text(), /somebody/);
  G.known.oy = true; out = []; _doQuests(); assert.match(text(), /Madam Oy/);
  fresh(); G.battery = 0; out = []; doCommand("journal"); assert.match(text(), /from memory/);
});
