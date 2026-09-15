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
  for (const f of fr) if (f.kind === "person") assert.doesNotMatch(f.cmd, /TRAVEL/, "TRAVEL only for a bar you have stood in");
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
