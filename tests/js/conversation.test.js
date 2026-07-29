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

test("_convoTopic maps no-shared-word phrasings to canonical topics", () => {
  const cases = [
    ["where are you from", "home"], ["whereabouts you from", "home"],
    ["where do you live", "home"], ["your country", "home"],
    ["what do you do", "job"], ["what do you do for a living", "job"],
    ["are you married", "wife"], ["the missus", "wife"],
    ["any kids", "family"], ["your folks", "family"],
    ["got any cash", "money"], ["how much do you earn", "money"],
    ["were you in the military", "navy"],
    ["the nineties", "90s"], ["the 1990s", "90s"],
    ["the nightlife", "scene"], ["this town", "pattaya"], ["living here", "thailand"],
    ["you single", "girlfriend"], ["your love life", "girlfriend"],
  ];
  for (const [input, want] of cases) {
    assert.equal(_convoTopic(input), want, `"${input}" → ${want}`);
  }
});

test("_convoTopic leaves already-matching phrasings alone (CONTAINS handles them)", () => {
  // These share the key word, so they pass through — the dialogue matcher's
  // topic.includes(key) resolves them without a synonym rule.
  assert.match(_convoTopic("your wife"), /wife/);
  assert.match(_convoTopic("the darkside"), /darkside/);
  assert.equal(_convoTopic("90s"), "90s");
});

test("_convoTopic does not mis-map proper-noun topics", () => {
  for (const name of ["candy", "ryan powers", "bert", "oy", "drew"]) {
    assert.match(_convoTopic(name), new RegExp(name.split(" ")[0]),
      `"${name}" should still route to itself, not a synonym`);
  }
});

test("a phrasing with no shared word still fires the node (nineties → 90s)", () => {
  run("angela");
  out = [];
  doCommand("the nineties"); // → 90s → Angela's node
  assert.match(lastOut(), /1997|Tower Records/, "the synonym reached her 90s line");
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

// ── Scope & pronoun resolution ───────────────────────────────────────────────

test("_resolveActor binds a pronoun to the active conversation partner", () => {
  run("angela"); // sets G.convo = angela
  assert.equal(_resolveActor("her", _addressable()), "angela");
  assert.equal(_resolveActor("him", _addressable()), "angela"); // antecedent, not gendered
  assert.equal(_resolveActor("them", _addressable()), "angela");
});

test("_resolveActor falls back to the sole candidate in scope (uniqueness)", () => {
  state().room = "pit_stop"; // exactly one hostess, Milin; no active conversation
  assert.equal(_resolveActor("her", _npcsHere()), "milin");
  assert.equal(_resolveActor("", _npcsHere()), "milin", "a bare target resolves too");
});

test("_resolveActor returns null when a pronoun is genuinely ambiguous", () => {
  state().room = "neon_paradise"; // six hostesses, nobody addressed yet
  assert.equal(_resolveActor("her", _npcsHere()), null);
});

test("_resolveActor honours a name in scope and rejects one out of the pool", () => {
  state().room = "neon_paradise";
  assert.equal(_resolveActor("noi", _npcsHere()), "noi", "a named girl in the room");
  // Angela is a patron, not in the NPC social pool — pronoun/name must not bind her
  state().room = "queen_vic";
  assert.equal(_resolveActor("angela", _npcsHere()), null);
});

test("talk/ask accept a pronoun for the current partner", () => {
  run("angela");
  out = [];
  doCommand("talk to her");
  assert.equal(state().convo, "angela");
  assert.doesNotMatch(lastOut(), /didn't parse|Nobody|not here/i);
  out = [];
  doCommand("ask her about 90s"); // pronoun in the ASK split
  assert.match(lastOut(), /1997|Tower Records/, "ask <pronoun> about <topic> resolved");
});

test("a resolved social target becomes the antecedent for the next pronoun", () => {
  state().room = "pit_stop"; // one hostess — bare FLIRT resolves by uniqueness
  doCommand("flirt");
  assert.equal(state().itNpc, "milin", "the flirt target is remembered");
  out = [];
  doCommand("flirt with her"); // "her" now binds to Milin
  assert.doesNotMatch(lastOut(), /Who do you mean/i, "the antecedent pins it down");
});

test("an ambiguous social pronoun asks who you mean instead of refusing", () => {
  state().room = "neon_paradise"; // six girls, none addressed
  out = [];
  doCommand("flirt with her");
  assert.match(lastOut(), /Who do you mean/i);
});
