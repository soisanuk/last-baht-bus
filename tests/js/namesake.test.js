// THE NAMESAKE AUDIT (2026-10-09). Names are labels and ids are the people: 31 display names are already
// shared, and Soi 6 is about to grow by two segments of named bars, so the common nicknames will repeat a
// dozen times. This plants five women called Rung in five bars and asks every surface that turns a NAME
// into a PERSON to pick the right one — or nobody, when nothing says which:
//   hearing a name (G.known / the journal), typing it where she is, typing it where she is not (the
//   elsewhere line), asking Nont or Tan where she is, and the per-room rule that one bar has one of her.
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

// five Rungs: the real one at the Lucky Tiger and four clones at four other beer bars
const BARS = ["lucky7", "seabreeze", "coconut", "sandbar"].filter(b => ROOMS[b]);
const RUNGS = ["rung"];
for (const b of BARS) {
  const id = "rung_" + b;
  NPCS[id] = { ...NPCS.rung, room: b, dialogue: NPCS.rung.dialogue };
  NPC_ROLES[id] = "hostess";
  RUNGS.push(id);
}
_nameRx = null;   // the name scanner is built lazily; rebuild it with the clones in

beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 5000; G.nightTurn = 30; out = [];
});
const knownRungs = () => RUNGS.filter(i => G.known[i]);

test("hearing a shared name marks the one in the room, the one whose bar the line names, or nobody", () => {
  G.room = "beach_rd_c"; _say("Somebody mentions Rung."); assert.deepEqual(knownRungs(), [], "a stranger's name is nobody yet");
  G.room = "lucky_tiger"; _say("Rung waves."); assert.deepEqual(knownRungs(), ["rung"], "the one in the room");
  G.room = "beach_rd_c"; _say(`Try Rung at ${_barName(BARS[0])}.`); assert.ok(G.known["rung_" + BARS[0]], "the one whose bar the line names");
  assert.equal(knownRungs().length, 2, "and no other");
});
test("typing her name finds the one in the room; asking where she is finds the one you have met", () => {
  G.room = BARS[1]; out = []; run("talk to rung"); assert.ok(G.talked["rung_" + BARS[1]], "the one in front of you");
  assert.equal(_npcByName("rung"), "rung_" + BARS[1], "in her own bar she is the one");
  G.room = "beach_rd_c"; assert.equal(_npcByName("rung"), "rung_" + BARS[1], "away from her, the one you have met");
  assert.equal(_npcByName("rung", { filter: i => i === "rung" }), "rung", "a caller's filter narrows it");
});
test("with nothing to go on a lookup names nobody, unless the caller needs somebody", () => {
  G.room = "beach_rd_c";
  assert.equal(_npcByName("rung"), null);
  assert.ok(RUNGS.includes(_npcByName("rung", { first: true })));
});
test("the elsewhere line and Nont place the Rung you know, not the first in the file", () => {
  G.room = BARS[2]; run("talk to rung");   // meet the third one
  G.room = "beach_rd_c"; out = []; run("talk to rung");
  assert.match(said(), new RegExp(_barName(BARS[2]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "placed at the bar of the one you met: " + said());
  G.room = _npcRoom("nont"); G.nightTurn = 40; out = []; run("ask nont about rung");
  assert.doesNotMatch(said(), new RegExp(_barName("lucky_tiger")), "Nont does not send you to the first Rung in the file");
});
test("one bar never has two women of one name (the rule that makes every other surface possible)", () => {
  const byRoom = {};
  for (const [id, n] of Object.entries(NPCS)) if (NPC_ROLES[id]) (byRoom[n.room] = byRoom[n.room] || []).push(String(n.name).toLowerCase());
  for (const r in byRoom) assert.equal(new Set(byRoom[r]).size, byRoom[r].length, "two of one name in " + r);
});
test("Tan places the Rung you met, and the journal's provenance is the one that was named", () => {
  G.room = BARS[3]; run("talk to rung");
  const r = _tanAbout("rung");
  assert.ok(r && !new RegExp(_barName("lucky_tiger")).test(r), "Tan does not answer for the first Rung in the file: " + r);
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); G.room = "beach_rd_c";
  _say(`Bert says to ask for Rung at ${_barName(BARS[0])}.`);
  assert.ok(G.namedBy["rung_" + BARS[0]], "provenance is on the one the line meant");
  assert.ok(!G.namedBy.rung, "and on nobody else");
});
