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
  // One cast since the patron fold: Angela IS addressable now (talk/examine/
  // photo all reach her by name). What must NOT happen is a social verb
  // landing on her — that guard moved from table membership to the caller's
  // pool, which is exactly what this asserts: the filtered pool _doSocial
  // resolves against rejects her, the full pool binds her.
  state().room = "queen_vic";
  assert.equal(_resolveActor("angela", _npcsHere()), "angela", "addressable in the one cast");
  assert.equal(_resolveActor("angela", _npcsHere().filter(id => !NPCS[id].patron)), null,
    "…but the social pool a flirt resolves against still refuses to bind her");
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
  // The chip carries the FULL ask, not the bare topic: a bare word is resolved by
  // doCommand's verb switch first, so any topic that is also a global verb fired
  // the verb instead (tapping Auntie Nok's "wallet" in Act One printed your
  // pocket balance — round 17). The label is still the bare topic.
  assert.ok(cmds.includes("ask angela about 90s"), "her open thematic topics are offered as chips");
  assert.ok(!cmds.some(c => /^withdraw|^enter |^ride bus/.test(c)),
    "the room/navigation chips are replaced by the talk palette");
});

test("topic chips are Title-cased labels over an unambiguous ask", () => {
  run("angela");
  const chips = _chipSet();
  const qv = chips.find(c => c.cmd === "ask angela about queen vic");
  assert.ok(qv, "the topic chip addresses the partner by name");
  assert.equal(qv.label, "Queen Vic", "…and still READS as the bare topic");
});

test("person/gossip topics (another character's name) aren't offered as chips", () => {
  run("angela");
  const topics = _convoTopics("angela");
  assert.ok(!topics.includes("drew"), "Drew is a person — typeable, but not suggested");
  assert.ok(topics.includes("90s"), "thematic topics are still offered");
  // and _topicNamesCharacter recognises names, not arbitrary words
  assert.equal(_topicNamesCharacter("drew", "angela"), true);
  assert.equal(_topicNamesCharacter("90s", "angela"), false);
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

test("a gated-refusal topic isn't offered as a chip until it truly unlocks", () => {
  run("angela"); // trust 1 — below the depression/navy gate
  let topics = _convoTopics("angela");
  assert.ok(!topics.includes("depression"), "she'd only refuse — don't offer it");
  assert.ok(!topics.includes("navy"), "same for her service record");
  _npcState("angela").trust = 5; // earned
  topics = _convoTopics("angela");
  assert.ok(topics.includes("depression") && topics.includes("navy"),
    "once the real node opens, the topic surfaces");
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
  const chip = _chipSet().find(c => c.label === "90s");
  out = [];
  doCommand(chip.cmd); // simulate the tap
  assert.match(lastOut(), /1997|Tower Records/);
});

// The defect the ask-form fixes, pinned on the character it was found on: a
// topic that is ALSO a global readout verb must reach the person you're talking
// to, not the readout. "wallet" during Act One is the whole quest.
test("a topic chip whose word is also a global verb still asks the person", () => {
  state().room = _npcRoom("nok");
  run("nok");
  const chip = _chipSet().find(c => c.label.toLowerCase() === "wallet");
  assert.ok(chip, "Auntie Nok offers the wallet topic");
  out = [];
  doCommand(chip.cmd);
  assert.match(lastOut(), /ask.*Nok about wallet|Beach at night|bar ladies/i,
    "the tap must reach Nok, not print your pocket balance");
  assert.doesNotMatch(lastOut(), /in your pocket\./);
});

// ── Verbal social actions (slice 4) ──────────────────────────────────────────

// ── Bert: trust-gated quest + audit (slice follow-up) ────────────────────────

test("Bert won't offer the White Dish job until he trusts you", () => {
  state().room = "stinky_bar";
  assert.equal(_questAvailable("white_dish"), false, "a stranger doesn't get the serious ask");
  run("bert"); // meeting grants only baseline trust (1) — still below the gate
  assert.notEqual(state().quests.white_dish, "offered", "meeting alone isn't enough");
  assert.equal(_questAvailable("white_dish"), false);
  _npcState("bert").trust = 2; // rapport earned
  assert.equal(_questAvailable("white_dish"), true, "now he'll bring it up");
  out = [];
  run("bert");
  assert.match(lastOut(), /White Dish/, "and talking surfaces the offer");
});

test("chatting Bert up builds trust toward the gate (pool talk warms him)", () => {
  state().room = "stinky_bar";
  run("bert");                       // trust 1
  const t0 = _npcState("bert").trust;
  run("ask bert about pool");        // a rapport topic
  assert.equal(_npcState("bert").trust, t0 + 1, "his pool table is a way in");
});

test("Bert's chips exclude quest topics (offer/sell) and the person topic (candy)", () => {
  state().room = "stinky_bar";
  run("bert");
  const topics = _convoTopics("bert");
  assert.ok(!topics.includes("offer") && !topics.includes("sell"),
    "quest topics are driven by the quest flow, not suggested as chips");
  assert.ok(!topics.includes("candy"), "Candy is a person — typeable, not a chip");
  assert.ok(topics.includes("pool"), "his flavour topics still surface");
});

test("Bert guards the Candy topic until he trusts you (audit: deflect node)", () => {
  state().room = "stinky_bar";
  run("bert"); // trust 1
  out = [];
  run("ask bert about candy");
  assert.match(lastOut(), /all you need|for now, bud/i, "guarded from a near-stranger");
  _npcState("bert").trust = 3;
  out = [];
  run("ask bert about candy");
  assert.match(lastOut(), /his and not hers|whole of it/i, "opens up once earned");
});

test("Kesinee guards the White Dish intel until trust — no offer-then-refuse chip", () => {
  state().room = "kitten_corner";
  run("kesinee"); // meet → trust 1, below her white-dish gate (2)
  assert.ok(!_convoTopics("kesinee").includes("white dish"),
    "at low trust she'd only brush you off — don't dangle it as a chip");
  assert.ok(!_convoTopics("kesinee").includes("police"),
    "same for the police/envelope intel (gated at trust 3)");
  _npcState("kesinee").trust = 2;
  assert.ok(_convoTopics("kesinee").includes("white dish"),
    "once she trusts you it's on the palette");
  // deflect only hides the chip — asking still delivers, so the quest still works
  out = [];
  run("ask kesinee about white dish");
  assert.ok(state().flags.heardWdgInside, "the quest flag still lands when asked");
  assert.match(lastOut(), /cleaner|poorer/i);
});

test("Doug guards the raw Ryan Powers story until you've stuck around", () => {
  state().room = "stinky_bar";
  run("doug"); // meet → trust 1, below his gate
  assert.ok(!_convoTopics("doug").includes("ryan"),
    "at trust<2 he'd only ask if you're a reporter — don't dangle it as a chip");
  _npcState("doug").trust = 2;
  assert.ok(_convoTopics("doug").includes("ryan"), "once you've stuck around it surfaces");
  out = [];
  run("ask doug about ryan"); // deflect hides the chip, not the answer
  assert.match(lastOut(), /ring light|coward|Lambo/i, "the raw version lands when asked");
});

test("Joy: chatting builds trust, and her future cracks open once earned", () => {
  state().room = "pink_lotus";
  run("joy");
  const t0 = _npcState("joy").trust;
  run("ask joy about dream");
  assert.equal(_npcState("joy").trust, t0 + 1, "the genuine 'what's YOUR dream' moment warms her");
  out = [];
  run("ask joy about future"); // trust 2 — still the cheerful deflection
  assert.match(lastOut(), /five year|three minutes/i, "not yet — she laughs it off");
  _npcState("joy").trust = 3;
  out = [];
  run("ask joy about future"); // the earned beat
  assert.match(lastOut(), /the app|up to the app/i, "once trusted, the present-tense cheer cracks");
  assert.ok(_npcState("joy").know.wdgCost, "and she's let you see the cost from the girl's side");
});

// ── NPCs drive the conversation: they ask, you answer, they remember ─────────

test("an NPC puts a question to you and remembers the answer", () => {
  state().room = "queen_vic";
  run("angela"); // her greeting asks where home is
  assert.ok(state().convoQ && state().convoQ.key === "home", "she poses the question");
  const t = _npcState("angela").trust;
  out = [];
  run("london");
  assert.equal(state().player.said.home, "london", "the answer is remembered");
  assert.equal(state().convoQ, null, "the question is resolved");
  assert.equal(_npcState("angela").trust, t + 1, "opening up warms her a little");
  assert.match(lastOut(), /files it|question put away/i, "she acknowledges it");
});

test("telling an NPC a different answer than before is caught", () => {
  state().room = "queen_vic";
  run("angela"); run("london"); // heard.home = london
  state().convoQ = { id: "angela", key: "home" }; // she asks again, another night
  out = [];
  run("manchester");
  assert.match(lastOut(), /not what you told me|had you down differently/i, "she catches the change");
  assert.equal(state().player.said.home, "manchester", "memory updates to the latest");
});

test("the soi grapevine: tell one person X, tell another Y, the second hears about it", () => {
  // Angela hears "london"; over at Stinky's, Bert — who never asked before — still
  // catches the discrepancy, because word gets around. A soft, trust-neutral catch.
  state().room = "queen_vic";
  run("angela"); run("london");
  assert.equal(state().player.said.home, "london");

  // cross the town to a fresh partner in his own bar, and answer differently
  state().room = NPCS.bert.room;
  run("bert"); // engage him so he's the active present partner
  const t0 = _npcState("bert").trust;
  state().convoQ = { id: "bert", key: "home" };
  out = [];
  run("manchester");
  assert.match(lastOut(), /the soi talks|word travels|nothing's really private|had you from/i, "the grapevine catches the change");
  assert.doesNotMatch(lastOut(), /files it|question put away/i, "it is NOT the warm 'opened up' ack");
  assert.equal(_npcState("bert").trust, t0, "a caught discrepancy earns no trust bump");
  assert.equal(state().player.said.home, "manchester", "global memory tracks the latest telling");
  assert.equal(_npcState("bert").heard.home, "manchester", "and this partner now has their own record");

  // telling THIS partner the same thing again is clean (consistent with them)
  state().convoQ = { id: "bert", key: "home" };
  out = [];
  run("manchester");
  assert.match(lastOut(), /files it|question put away|takes it in/i, "consistent re-telling is acknowledged, not caught");
});

test("a consistent story across the soi is NOT caught (same answer to two people)", () => {
  state().room = "queen_vic";
  run("angela"); run("london");
  state().room = NPCS.bert.room;
  run("bert");
  const t0 = _npcState("bert").trust;
  state().convoQ = { id: "bert", key: "home" };
  out = [];
  run("london"); // same story
  assert.doesNotMatch(lastOut(), /the soi talks|word travels|had you from/i, "no catch — the story holds up");
  assert.equal(_npcState("bert").trust, t0 + 1, "and telling a straight story warms the new person");
});

test("a pending question lapses when you change the subject", () => {
  state().room = "queen_vic";
  run("angela"); // asks home
  assert.ok(state().convoQ);
  out = [];
  run("90s"); // ask one of her topics instead of answering
  assert.equal(state().convoQ, null, "the question lapses");
  assert.match(lastOut(), /1997|Tower Records/, "and the topic you asked is delivered");
  assert.ok(!(state().player.said && state().player.said.home), "the dodge wasn't recorded as an answer");
});

test("a real command while a question pends is not captured as the answer", () => {
  state().room = "queen_vic";
  run("angela");
  out = [];
  run("look");
  assert.ok(!(state().player.said && state().player.said.home), "LOOK is a command, not an answer");
});

test("walking away clears a pending question", () => {
  state().room = "queen_vic";
  run("angela");
  assert.ok(state().convoQ);
  state().room = "beach_rd_n"; // partner no longer present
  assert.equal(_convoActive(), null);
  assert.equal(state().convoQ, null, "no orphaned question hanging over an empty stool");
});

test("Joy asks your dream back, and it is remembered", () => {
  state().room = "pink_lotus";
  run("joy");
  run("ask joy about dream"); // her node literally asks "what is YOUR dream?"
  assert.ok(state().convoQ && state().convoQ.key === "dream");
  out = [];
  run("a quiet bar");
  assert.equal(state().player.said.dream, "a quiet bar");
});

test("an NPC quotes back what you told them (richer callback)", () => {
  state().room = "queen_vic";
  run("angela"); run("london"); run("bye"); // she now knows home = london
  out = [];
  run("angela"); // return visit
  assert.match(lastOut(), /London/, "she opens by quoting your hometown back");
});

test("_fillSaid fills %key% tokens from memory, leaves unknown ones and percentages", () => {
  state().player = { said: { home: "london" } };
  assert.equal(_fillSaid("From %home%, then?"), "From London, then?");
  assert.equal(_fillSaid("Your %job%?"), "Your %job%?", "unknown key untouched");
  assert.equal(_fillSaid("a 12% imperial stout"), "a 12% imperial stout", "no false match on percentages");
});

test("filler hostesses are inquisitive but shallow (they ask a small question)", () => {
  const h = Object.keys(NPCS).find(id => NPCS[id].filler && NPCS[id].dialogue[0].asks);
  assert.ok(h, "the hostess factory attaches a shallow ask");
  state().room = _npcRoom(h);
  state().lastSaleng = 99999; state().lastPeddler = 99999;
  run(h);
  assert.ok(state().convoQ && state().convoQ.id === h, "she puts a small question to you");
  assert.ok(["home", "stay", "girlfriend", "return"].includes(state().convoQ.key),
    "and it's one of the stock, limited-English openers");
});

test("an expat regular asks a broader question (Bert)", () => {
  state().room = "stinky_bar";
  run("bert");
  assert.ok(state().convoQ && state().convoQ.key === "why",
    "Bert asks what brought you out here — the deeper kind of question");
});

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

// ── An NPC's own advertised subject must be an ask-topic ─────────────────────
// The class the personas keep reporting and no lint can find: a character
// volunteers a noun in their own greeting (or their room prose does), and the
// word they used misses. It resists automation because the findings are words
// that are topics NOWHERE in the game yet, so no vocabulary harvest can propose
// them (see tools/asktopic-audit.mjs's header). So they get pinned by hand as
// each one is found — persona reports A#18 / B#4, 2026-08-23.
test("subjects a character volunteers about themselves resolve", () => {
  const miss = /above my pay grade|Not my story|I don't know about that|That one I don't know|No idea, mate|Search me|Not one I know|wrong girl|Couldn't tell you/i;
  const cases = [
    ["bob",     "succubus",                 "wife",        /Thirty-one years|runs the floor/],
    ["bob",     "succubus",                 "kinnaree",    /Thirty-one years|runs the floor/],
    ["bob",     "succubus",                 "house rules", /hands to yourself|whole list/i],
    ["nott",    "adonis_club",              "hosts",       /Host bars are small|gold walls/],
    ["nont",    "buakhao_market",           "sim",         /chip in it|This is the college/],
    ["sumalee", "coconut",                  "bar",         /Fourteen stools|quiet money/i],
    ["nok",     "jomtien_soi_7_beach_end",  "bottles",     /Glass one|every night is the good part/i],
    ["bert",    "stinky_bar",               "soi 6",       /Guest houses|Soi Six/],
  ];
  for (const [who, room, topic, want] of cases) {
    newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
    G.room = room; G.pendingEnc = null;
    out = []; doCommand("talk to " + who);
    out = []; G.pendingEnc = null; doCommand("ask " + who + " about " + topic);
    const said = out.join("\n");
    assert.doesNotMatch(said, miss, `ask ${who} about ${topic} must not deflect`);
    assert.match(said, want, `ask ${who} about ${topic} must reach the real answer`);
  }
});

test("Colin answers for the hill he has lived on for nine years", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  G.room = "the_terrace"; G.pendingEnc = null;
  out = []; doCommand("talk to colin");
  out = []; G.pendingEnc = null; doCommand("ask colin about pratumnak");
  assert.match(out.join("\n"), /Nine years|the hill/i);
});

// ── The consistency system judges substance, not spelling ────────────────────
// The grapevine playtest (F1, 2026-08-25) was told "fifteen years on the
// street, mind" by one girl and "fifteen years, love" by another and got
// caught "lying" — four instances, while a liar repeating his lie verbatim
// sailed through. The compare is now substance; a question once answered is
// never re-asked; and the four questions sharing one memory key got their own.
test("a consistent story told in different words is not a lie", () => {
  assert.ok(_saidAgrees(
    "first time in this one - fifteen years on the street, mind",
    "fifteen years, love. the street itself is the somebody"), "same fifteen years");
  assert.ok(_saidAgrees("third time in, love", "third time in, love"), "verbatim always agrees");
  assert.ok(_saidAgrees("dunno", "maybe"), "nothing substantive on either side is not a lie");
  assert.ok(!_saidAgrees("Chicago", "London"), "an actual lie is still a lie");
  assert.ok(!_saidAgrees("a wife back in Leeds", "single, never married"), "and so is this one");
});

test("answering consistently to two different people earns trust, not a rep hit", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight",
    said: { home: "Sheffield, fifteen years coming here" } };
  const st = _npcState("pukky"); st.heard = {}; st.know = {};
  G.convoQ = { id: "pukky", key: "home", q: "?" };
  const rep0 = G.rep || 0;
  out = []; _convoAnswer("fifteen years, love — Sheffield born");
  assert.ok((G.rep || 0) >= rep0, "no rep hit for a consistent story");
  assert.doesNotMatch(out.join("\n"), /That's what I heard|tell it different|had you from/);
});

test("a question you already answered is never asked again", () => {
  newGame();
  const st = _npcState("pukky");
  st.heard = { thisbar: "first time in this one" }; st.know = {};
  out = []; G.convoQ = null;
  _convoAsk("pukky", { asks: { key: "thisbar", q: "First time this bar?" } }, st);
  assert.equal(out.length, 0, "she has your answer; asking again invites the evolved-truth trap");
  assert.equal(G.convoQ, null);
});

test("the four first-time questions no longer share one memory slot", () => {
  // Pukky's "First time this bar?" (per-bar, time-varying), the filler girls'
  // "First time Pattaya?" (= the trips question), and "You come back tomorrow?"
  // must each remember their own answer.
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  const returnAsks = [...src.matchAll(/key: "return"/g)].length;
  assert.equal(returnAsks, 1, "exactly one question still lives on the return key");
  assert.ok(ASK_REPLIES.thisbar && ASK_REPLIES.thisbar.length >= 3, "and the new key has replies");
});

test("a lapsed question re-asked on return prints its paragraph once, not twice", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "queen_vic";
  for (let i = 0; i < 8 && !G.convoQ; i++) { out = []; doCommand("talk to angela"); }
  assert.ok(G.convoQ, "she asked");
  const q = G.convoQ.q;
  doCommand("ask mort about column");         // lapse it
  out = []; doCommand("talk to angela");      // she comes back to it
  const text = out.join("\n");
  const firstIdx = text.indexOf(q.slice(0, 40));
  assert.ok(firstIdx >= 0, "the question is re-put");
  assert.equal(text.indexOf(q.slice(0, 40), firstIdx + 1), -1,
    "…and only once — the node's own ask must not double it");
});

// ── Subjects the street volunteered and then missed on (grapevine round) ─────
test("grapevine round: every volunteered subject now answers", () => {
  const miss = /above my pay grade|Not my story|I don't know about that|That one I don't know|No idea|Search me|wrong girl|Couldn't tell you/i;
  const cases = [
    ["somo",  "bay_watch",  "ninety-five squad", /Fowler|McManaman/],
    ["somo",  "bay_watch",  "squad",             /Fowler|McManaman/],
    ["barry", "ruby_kiss",  "golf",              /travel bag|clubs ARE the golf/i],
    ["mort",  "queen_vic",  "cipher",            /back issues|cares to count/],
    ["mort",  "queen_vic",  "soi 6",             /opens the shutters|tells you the price/],
    ["toi",   "cherry_pop", "mercedes",          /real thing|Best English/],
    ["preaw", "ruby_kiss",  "saeng",             /Thirty year|my aunt/i],
    ["wilai", "ruby_kiss",  "plan",              /my own bar|cover charge/],
    ["mercedes", "cherry_pop", "munich",         /Munich|Germany/],
  ];
  for (const [who, room, topic, want] of cases) {
    newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
    for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
    G.room = room; G.pendingEnc = null;
    out = []; doCommand("talk to " + who);
    out = []; G.pendingEnc = null; doCommand(`ask ${who} about ${topic}`);
    const said = out.join("\n");
    assert.doesNotMatch(said, miss, `ask ${who} about ${topic}`);
    assert.match(said, want, `ask ${who} about ${topic} reaches the real answer`);
  }
});

test("Mort's four-letter dare deflects in character and never spoils the puzzle", () => {
  // The dare is the CTF's own breadcrumb (docs/ctf.md) — he must answer AS
  // HIMSELF without naming the key or the counting phrase.
  newGame(); _setFlag("act1Done"); G.room = "queen_vic";
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  doCommand("talk to mort");
  out = []; doCommand("ask mort about four letters");
  const said = out.join("\n");
  assert.match(said, /back issues|cares to count/);
  assert.doesNotMatch(said, /HOOT|hoot/, "the key stays a secret");
  assert.doesNotMatch(said, /counted the hoots/i, "and so does the answer phrase");
});

test("an aliased ask to a GATED node gets 'not yet', never 'not my story'", () => {
  // "ask bert about white dish" normalizes to his gated ryan-powers node; the
  // gate probe used to test only the raw words, so his own story was disowned.
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = "stinky_bar"; doCommand("talk to bert");
  out = []; G.pendingEnc = null; doCommand("ask bert about white dish");
  assert.doesNotMatch(out.join("\n"), /above my pay grade|Not my story|No idea/i);
});

test("a kept girl answers for the sponsor she herself cited", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  const kept = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && _hasSponsor(id));
  assert.ok(kept, "the hash always keeps somebody");
  G.room = _npcRoom(kept);
  doCommand("talk to " + NPCS[kept].name);
  for (const word of ["sponsor", "friend"]) {
    out = []; G.pendingEnc = null; doCommand(`ask ${NPCS[kept].name} about ${word}`);
    assert.match(out.join("\n"), /arrangement, not love story|working girl again|He send every month|He fly home/i,
      `${word} answers in her own voice`);
  }
});

test("money sent to her phone is remembered at her rail", () => {
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  const girl = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && NPCS[id].filler && !_hasSponsor(id));
  G.soc.given = {}; G.soc.given[girl] = 300;
  G.room = _npcRoom(girl);
  doCommand("talk to " + NPCS[girl].name);
  out = []; G.pendingEnc = null; doCommand(`ask ${NPCS[girl].name} about medicine`);
  assert.match(out.join("\n"), /You help me that time|no forget/i,
    "the phone and the bar share a memory");
});

// ── The fabulist round: the lie-detector's other tail (2026-08-25) ───────────
// Roy planted four genuine same-key contradictions; two escaped through a
// single shared token — "years" agreed widowhood with a 22-year marriage, and
// an endearment tic ("sweetheart") made him structurally uncatchable.
test("time-units and endearments no longer alibi a contradiction", () => {
  assert.ok(!_saidAgrees(
    "Widowed, love. Five years ago",
    "A wife, sweetheart. Twenty-two years married, back in Manchester with the dogs"),
    "the classic lie — marital status told two ways — is caught");
  assert.ok(!_saidAgrees(
    "Dentist, sweetheart. Perth molars",
    "The Marriott, sweetheart. Presidential floor"),
    "a verbal tic is not an alibi");
  // …and the leniency that matters survives
  assert.ok(_saidAgrees(
    "fifteen years on the street, mind",
    "fifteen years, love. the street itself is the somebody"),
    "a consistent story in different words still agrees");
  assert.ok(_saidAgrees("Sheffield, born and bred", "Sheffield. It'll keep"), "same place, same story");
});

test("the job question and the hotel question no longer share a memory slot", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/world.js", import.meta.url)), "utf8");
  assert.equal([...src.matchAll(/key: "hotel"/g)].length, 1,
    "exactly one question still lives on the hotel key");
  assert.ok(ASK_REPLIES.job && ASK_REPLIES.job.length >= 3, "and the job key has replies");
});

test("an interrupted question survives the interruption", () => {
  // Nina bolted to a saleng cart mid-ask and her question died forever —
  // _convoEnd cleared it without the lapse store (fabulist F4).
  newGame(); G.stage = "expat"; _setFlag("act1Done");
  const girl = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess" && NPCS[id].filler);
  G.room = _npcRoom(girl);
  _convoStart(girl);
  G.convoQ = { id: girl, key: "girlfriend", q: "You have somebody, na?" };
  _convoInterrupt();                       // the cart / the kickout / the bell
  assert.equal(G.convoQ, null, "the moment is gone");
  assert.ok(G.convoLapsed && G.convoLapsed[girl], "…but the question is not");
  out = [];
  _convoStart(girl);                       // next TALK
  assert.ok(G.convoQ && G.convoQ.key === "girlfriend", "she comes back to it");
});

test("the catch quotes your words in your own case, with her own pronouns", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "expat"; _setFlag("act1Done");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  // tell one girl Manchester — through the real pipe, so the raw case is kept
  G.room = "cherry_pop"; G.pendingEnc = null;
  const g1 = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
  _convoStart(g1);
  G.convoQ = { id: g1, key: "home", q: "?" };
  doCommand("Manchester, love. Rain with a cathedral in it");
  assert.equal(G.player.said.home, "Manchester, love. Rain with a cathedral in it",
    "stored with the capital M the player typed");
  // tell another girl Perth — the grapevine catch must quote the raw words
  const g2 = _npcsHere().find(id => NPC_ROLES[id] === "hostess" && id !== g1);
  if (g2) {
    _convoStart(g2);
    G.convoQ = { id: g2, key: "home", q: "?" };
    out = [];
    doCommand("Perth, mate. Western Australia");
    const said = out.join("\n");
    assert.match(said, /Manchester/, "the catch quotes the actual lie, capital and all");
    assert.doesNotMatch(said, /stop them|They let/, "and she is she, not they");
  }
});

// ── Settler + dog-lover reruns (2026-08-26) ──────────────────────────────────
test("Tan reads a mamasan as a mamasan, not a rail girl", () => {
  // Settler #1: the hub who "drives everybody" called Candy and Oy (owners)
  // "she works the rail there. Sends money home, same as all of them."
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  NPCS.tan.room = "stinky_bar"; G.room = "stinky_bar";
  for (const [who, want] of [["candy", /runs the floor/], ["oy", /runs the floor/], ["bee", /works the rail/]]) {
    G.known[who] = true;
    out = []; doCommand("ask tan about " + who);
    assert.match(out.join("\n"), want, `Tan on ${who} (${NPC_ROLES[who]})`);
    if (NPC_ROLES[who] === "mamasan") assert.doesNotMatch(out.join("\n"), /works the rail/, who + " is not a rail girl");
  }
});

test("Mort, the town's observer, answers about people in his own voice", () => {
  // Settler #2: ASK MORT ABOUT <person> dead-ended on every name
  newGame(); _setFlag("act1Done"); G.room = "queen_vic";
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  doCommand("talk to mort");
  out = []; doCommand("ask mort about angela");
  const said = out.join("\n");
  assert.match(said, /I know exactly who that is|Read the COLUMN|not the job/,
    "he knows them, and points at the column");
  assert.doesNotMatch(said, /Not one I know|Not my story|Search me/i, "no dead-end for a person he'd know");
  // …and a nonsense word still misses normally
  out = []; doCommand("ask mort about quantumfrog");
  assert.doesNotMatch(out.join("\n"), /I know exactly who that is/);
});

test("Candy's Orchid brief answers to 'orchid', not only to 'rose'", () => {
  // Settler #4: the volunteered word (orchid) missed; the node is keyed on rose
  newGame(); G.stage = "expat"; _setFlag("act1Done"); _setFlag("expatLife");
  for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true;
  G.room = _npcRoom("candy"); doCommand("talk to candy");
  out = []; G.pendingEnc = null; doCommand("ask candy about orchid");
  assert.doesNotMatch(out.join("\n"), /I don't know|Not my story|wrong girl/i);
  // …and "orchid room" still routes to Doyle's recon topic, not Candy's rose
  assert.equal(_convoTopic("orchid room"), "table", "the room reference stays Doyle's");
  assert.equal(_convoTopic("orchid"), "rose", "the place reference is Candy's");
});
