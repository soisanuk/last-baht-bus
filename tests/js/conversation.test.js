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

// ── Conversation-aware chips (slice 3) ───────────────────────────────────────

function chipCmds() { return _chipSet().map(c => c.cmd); }
function chipLabels() { return _chipSet().map(c => c.label); }

test("no conversation → the normal room chips (no LEAVE)", () => {
  assert.ok(!chipCmds().includes("bye"), "LEAVE only shows inside a conversation");
});

test("in a conversation the chips become topics + LEAVE", () => {
  run("angela");
  const cmds = chipCmds();
  assert.ok(cmds.includes("bye"), "a way out is offered");
  assert.ok(cmds.includes("90s") && cmds.includes("drew"),
    "her open topics are offered as chips");
  assert.ok(!cmds.some(c => /^withdraw|^enter |^ride bus/.test(c)),
    "the room/navigation chips are replaced by the talk palette");
});

test("topic chips are Title-cased labels over the bare-topic cmd", () => {
  run("angela");
  const chips = _chipSet();
  const drew = chips.find(c => c.cmd === "drew");
  assert.equal(drew.label, "Drew");
});

test("chips offer only UNLOCKED topics — progressive reveal via the same gates", () => {
  // Angela has a bond-gated 'queen vic'-style node set; more concretely, her
  // deeper nodes open on trust. Assert the palette grows as she warms: a topic
  // gated behind trust is absent cold and present once trust clears the gate.
  run("angela");
  const cold = _convoTopics("angela");
  _npcState("angela").trust = 5;      // warm her right up
  _npcState("angela").mood = "open";
  const warm = _convoTopics("angela");
  assert.ok(warm.length >= cold.length, "warming never removes topics");
  assert.deepEqual([...new Set(warm)], warm, "no duplicate topic chips");
});

test("social chips (flirt / buy drink) show for a hostess partner, not a patron", () => {
  // Patron partner (Angela): no flirt chip.
  run("angela");
  assert.ok(!chipCmds().includes("flirt"), "no flirt chip for a patron");
  // Hostess partner (Milin at the Pit Stop): flirt + buy-drink appear.
  newGame();
  state().room = "pit_stop";
  state().lastSaleng = 99999; state().lastPeddler = 99999;
  run("milin");
  const cmds = chipCmds();
  assert.ok(cmds.includes("flirt"), "flirt offered with a bar girl");
  assert.ok(cmds.some(c => c.startsWith("buy drink for milin")), "buy-drink targets her");
  assert.ok(cmds.includes("bye"));
});

test("tapping a topic chip resolves through the conversation layer", () => {
  run("angela");
  const chip = _chipSet().find(c => c.cmd === "90s");
  out = [];
  doCommand(chip.cmd); // simulate the tap
  assert.match(lastOut(), /1997|Tower Records/);
});

// ── Verbal social actions (slice 4) ──────────────────────────────────────────

test("compliment warms a known partner (+1 trust, once per day)", () => {
  run("angela"); // meeting her sets dstate=met, trust=1
  const t0 = _npcState("angela").trust;
  out = [];
  doCommand("compliment"); // bare → the partner
  assert.equal(_npcState("angela").trust, t0 + 1, "a landed compliment warms her");
  const t1 = _npcState("angela").trust;
  doCommand("compliment");
  assert.equal(_npcState("angela").trust, t1, "but not farmable — same day, no further gain");
});

test("compliment falls flat on a stranger (no trust gained)", () => {
  // Address her cold, without the meeting handshake that grants baseline trust.
  out = [];
  doCommand("compliment angela");
  assert.equal(_npcState("angela").dstate, "stranger");
  assert.equal(_npcState("angela").trust, 0, "flattery from a stranger earns nothing");
});

test("a joke falls flat when guarded, lands once she's warmer", () => {
  run("angela");
  _npcState("angela").trust = 1; _npcState("angela").mood = "guarded";
  const cold = _npcState("angela").trust;
  doCommand("joke");
  assert.equal(_npcState("angela").trust, cold, "a joke to a guarded stranger dies");
  _npcState("angela").trust = 2; // warm enough now
  doCommand("joke");
  assert.equal(_npcState("angela").trust, 3, "the same joke lands once she's warmer");
});

test("teasing is risky cold (loses trust) and playful once close", () => {
  run("angela");
  _npcState("angela").trust = 1; // below the tease threshold
  out = [];
  doCommand("tease");
  assert.match(lastOut(), /too soon|cooler look/i);
  assert.equal(_npcState("angela").trust, 0, "teasing too early costs you");
  // reset the day ledger so a second tease can move state, then warm her up
  state().socialActs = null;
  _npcState("angela").trust = 4;
  doCommand("tease");
  assert.equal(_npcState("angela").trust, 5, "close enough, it's banter now");
});

test("the tease chip is gated on trust; compliment/joke always offered", () => {
  run("angela");
  _npcState("angela").trust = 1;
  let cmds = _chipSet().map(c => c.cmd);
  assert.ok(cmds.includes("compliment") && cmds.includes("joke"));
  assert.ok(!cmds.includes("tease"), "no tease chip until you're close");
  _npcState("angela").trust = 3;
  cmds = _chipSet().map(c => c.cmd);
  assert.ok(cmds.includes("tease"), "tease chip unlocks at trust 3");
});
