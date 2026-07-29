// Conversation layer (Slice 1): an active-conversation context so bare words
// resolve against the current partner — "angela" opens the chat, "90s" asks
// about it, "bye" ends it — without shadowing real verbs/directions. Prototyped
// on Angela, a hand-authored patron at the Queen Vic with topic + state nodes.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js", "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}

let out = [];
engineInit((text) => out.push(text), null, () => {});

function run(...cmds) { for (const c of cmds) doCommand(c); }
function lastOut() { return out.join("\n"); }
function state() { return G; }

// Sit the player in the Queen Vic pub where Angela holds the window seat, and
// suppress the random street encounters (they arm a pendingEnc that eats the
// next command — same guard the engine tests use).
beforeEach(() => {
  out = [];
  newGame();
  state().room = "queen_vic";
  state().lastSaleng = 99999;
  state().lastPeddler = 99999;
});

test("precondition: Angela (a patron) is present in the Queen Vic", () => {
  assert.ok(_patronsHere().includes("angela"), "Angela should be at queen_vic");
});

test("a bare NPC name opens a conversation and sets the partner", () => {
  doCommand("angela");
  assert.equal(state().convo, "angela", "talking to Angela makes her the partner");
  assert.match(lastOut(), /Discman|Angela/, "her greeting is delivered");
});

test("a bare topic word resolves against the active partner", () => {
  run("angela");
  out = [];
  doCommand("90s"); // → ASK ANGELA ABOUT 90s
  assert.equal(state().convo, "angela", "still in the conversation");
  assert.match(lastOut(), /1997|Tower Records/, "her 90s node fires from a bare topic");
});

test("a phrasing synonym maps to the canonical topic", () => {
  // "where are you from" → home; Angela has no home node, so she deflects —
  // but the point is it routed as an ASK, not a parse error.
  run("angela");
  out = [];
  doCommand("where are you from");
  assert.equal(state().convo, "angela");
  assert.doesNotMatch(lastOut(), /don't understand|Come again/i,
    "a known phrasing is not a parse error inside a conversation");
});

test("goodbye ends the conversation", () => {
  run("angela");
  out = [];
  doCommand("bye");
  assert.equal(state().convo, null, "leave-taking clears the partner");
  assert.match(lastOut(), /take your leave/i);
});

test("real verbs keep priority — a bare topic never shadows LOOK or MAP", () => {
  run("angela");
  const convoBefore = state().convo;
  out = [];
  doCommand("map"); // a global verb, must still open the map mid-conversation
  assert.equal(state().convo, convoBefore, "MAP doesn't disturb the conversation");
  assert.match(lastOut(), /soi|road|map|beach|jomtien|pattaya/i,
    "MAP produced the map, not an Angela line");
});

test("walking away silently ends the conversation (partner no longer present)", () => {
  run("angela");
  assert.equal(state().convo, "angela");
  state().room = "beach_rd_n"; // she's not here
  assert.equal(_convoActive(), null, "the partner-gone check clears a stale convo");
  assert.equal(state().convo, null);
});

test("an unknown word outside a conversation is still a parse error", () => {
  out = [];
  doCommand("florble");
  assert.equal(state().convo, null);
  // no crash, and it did not silently start/990 a conversation
});
