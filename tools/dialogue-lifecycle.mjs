#!/usr/bin/env node
// DIALOGUE LIFECYCLE audit — a topic a quest OPENS must stay answerable after
// the quest closes. (docs/persona-findings-systemic.md §3.2, class J.)
//
//   node tools/dialogue-lifecycle.mjs            # full report
//   node tools/dialogue-lifecycle.mjs --json
//   node tools/dialogue-lifecycle.mjs --quest keys
//   DL_DEBUG=wimon:keys node tools/dialogue-lifecycle.mjs --quest keys   # one pair, stage by stage
//
// THE CLASS. A dialogue node gated on a quest being ACTIVE goes dark the moment
// the quest completes, and the mouth that sent you cannot hear the answer you
// brought back. Round 47 found five by hand: Wimon saying "not yet" about a
// scene the player had just played, Diamond unable to discuss the keys she hung
// herself, Mala unable to hear "consider it done", Bill still pitching an order
// already placed, and Tan's Eddy node sitting unreachable behind the locator for
// its whole life. Every one of them reads correctly on its own page — the defect
// is a STATE the writing never sits next to, which is the same sentence
// docs/prose-defects.md wrote about contradictions in prose, now true of gates.
//
// WHAT THIS DOES. For every quest, walk the flag trajectory the player walks —
// the quest unoffered, offered, active, each `sets:` its giver and its
// destination fire along the way, then done — and at each stage ask every topic
// alias on every node of every character the quest touches. A topic that had a
// TOPICAL answer at an earlier stage and has none at a later one is a return
// channel that closed.
//
// HOW A MISS IS JUDGED, and why it is not a string list. `_pickDialogue` falling
// through to the topicless entry is the STRUCTURAL signal, and it is not enough
// on its own: the real talk path retries through `_CONVO_TOPIC_RULES`, then
// `_selfNamedNode`, then the staff/closing/league answers, so plenty of
// structural fall-throughs are answered anyway. So every candidate is replayed
// through the real command (`ask <who> about <topic>`) and judged against a miss
// oracle built by RUNNING — same doctrine as tools/errand-audit.mjs, with two
// corrections that a first cut of this tool needed and that are worth keeping
// written down, because both made it report a clean tree while broken:
//   · the oracle is PER CHARACTER and per STAGE. The brush-off pools are keyed
//     on role, register and pronoun, so a pool sampled off five people does not
//     contain Wimon's "Not yet, na. Maybe later." and a mutation that should
//     have gone red came back green.
//   · the oracle calls the engine's LINE GENERATORS as well as asking nonsense.
//     `_topicMiss` is "I have nothing on that"; `_topicLocked` is "I have that
//     and cannot discuss it yet" — the sentence a CLOSED CHANNEL prints, and the
//     one no nonsense word can ever provoke, because nonsense matches no node.
// Verify the instrument can fail. `--mutate <npc>#<index>` drops a node before
// the sweep, but since the engine's miss path started reading the seen-book
// (2026-09-15) a dropped successor is no longer a defect — the gist answers in
// its place — so the mutation to use is the ENGINE one: revert that check in
// _doTalkBody's miss path and the 21 original findings come back (verified
// 2026-09-16). That is the class this tool exists for.
// re-creates the round-47 Wimon finding that earned the successor nodes.
//
// WHAT IT CANNOT SEE. A node whose gate is a `when(st, G)` closure reading
// something other than flags and quest state — a bond tier, an hour, a meter —
// is evaluated at whatever the harness's default is, which is honest but narrow:
// this walks the QUEST's axis, not every axis. And a topic that answers with the
// WRONG thing (a stale line rather than no line) is a contradiction, not a
// closure, and belongs to the dossier pass.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "lang", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const out = [];
engineInit(t => out.push(String(t)), null, () => {});

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const qi = argv.indexOf("--quest");
const onlyQuest = qi !== -1 ? argv[qi + 1] : null;
// A green audit proves nothing unless the instrument can be shown to go red.
// `--mutate <npc>#<index>` drops a node before the sweep, so the round-47
// findings can be re-created on demand: the successor node Arturo's report
// earned is exactly what a mutation removes.
//   node tools/dialogue-lifecycle.mjs --quest keys --mutate wimon#5 --mutate wimon#1
for (let i = 0; i < argv.length; i++) {
  if (argv[i] !== "--mutate") continue;
  const [id, idx] = String(argv[i + 1] || "").split("#");
  if (NPCS[id] && NPCS[id].dialogue[+idx]) NPCS[id].dialogue[+idx] = { text: "(removed by --mutate)" };
}

// ── the trajectory ───────────────────────────────────────────────────────────

const aliasesOf = d => String(d.topic || "").split("|").map(s => s.trim()).filter(Boolean);
const atTargets = (at) => {
  if (typeof at === "string") return [at];
  if (typeof at !== "function") return [];
  // a two-leg quest's `at:` is a closure; its legs are the string literals in it
  return [...new Set([...String(at).matchAll(/"([A-Za-z0-9_]+)"|'([A-Za-z0-9_]+)'/g)]
    .map(m => m[1] || m[2]).filter(t => ROOMS[t] || NPCS[t]))];
};

// Everyone the quest touches: the giver, wherever it sends you, and anybody
// whose own nodes trade in the flags this quest moves — that last one is how
// Diamond (who hangs the keys) and Wimon (who reads the letterbox) come into
// the same sweep without either being named on the quest.
function castFor(qid, q) {
  const cast = new Set();
  if (q.giver) cast.add(q.giver);
  if (q.giverIfSelf) cast.add(q.giverIfSelf);
  for (const t of atTargets(q.at)) if (NPCS[t]) cast.add(t);

  const axis = new Set([...(q.reqFlags || []), q.doneFlag].filter(Boolean));
  for (const id of cast) for (const d of (NPCS[id] || {}).dialogue || [])
    for (const f of d.sets || []) axis.add(f);
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.filler) continue;   // generated staff carry no quest wiring
    for (const d of n.dialogue || []) {
      const touches = [...(d.sets || []), ...(d.req || []), ...(d.notFlags || [])];
      if (touches.some(f => axis.has(f))) { cast.add(id); break; }
    }
  }
  return [...cast].filter(id => NPCS[id]);
}

// The stages, in the order a player reaches them. Each is a mutation applied to
// a fresh game; they are CUMULATIVE, exactly as a playthrough is.
function stagesFor(qid, q, cast) {
  const base = ["act1Done", "hasWallet", ...(q.reqFlags || [])];
  // a quest inside the bar chain is only reachable from the endless stage
  const chain = new Set(["expatLife"]);
  const deps = [];
  const walk = (id, seen = new Set()) => {
    for (const d of (QUESTS[id] || {}).deps || []) {
      if (seen.has(d)) continue;
      seen.add(d);
      if (QUESTS[d] && QUESTS[d].doneFlag) deps.push(QUESTS[d].doneFlag);
      if ((QUESTS[d].reqFlags || []).some(f => chain.has(f))) base.push("expatLife");
      walk(d, seen);
    }
  };
  walk(qid);

  const stages = [
    { name: "before", flags: [...base, ...deps], quests: {} },
    { name: "offered", flags: [...base, ...deps], quests: { [qid]: "offered" } },
    { name: "active", flags: [...base, ...deps], quests: { [qid]: "active" } },
  ];
  // then every `sets:` the cast fires while the quest is live, in dialogue
  // order — the mid-quest states, which is where the return channels actually
  // open and close (keysDelivered, heardWhispers, tiffinDelivered…).
  // …and only from the GIVER and the DESTINATION, not the whole cast. The wider
  // cast is swept for topics, but its `sets:` are other quests' branches — the
  // Rabbit arc's mule/operator/kid flags are mutually exclusive, and setting all
  // of them at once builds a state no player is ever in, which then "goes dark"
  // in ways nobody can reach.
  const spine = new Set([q.giver, q.giverIfSelf, ...atTargets(q.at)].filter(Boolean));
  const mid = [];
  for (const id of spine)
    for (const d of (NPCS[id] || {}).dialogue || [])
      for (const f of d.sets || []) if (!mid.includes(f) && f !== q.doneFlag) mid.push(f);
  const acc = [];
  for (const f of mid) {
    acc.push(f);
    stages.push({ name: "active+" + f, flags: [...base, ...deps, ...acc], quests: { [qid]: "active" } });
  }
  stages.push({
    name: "done",
    flags: [...base, ...deps, ...acc, ...(q.doneFlag ? [q.doneFlag] : [])],
    quests: { [qid]: "done" },
  });
  return stages;
}

function apply(stage, q, cast) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = stage.flags.includes("expatLife") ? "expat" : "vacation";
  G.money = 20000; G.hunger = 40; G.thirst = 40; G.battery = 100; G.nightTurn = 30;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
  G.rain = 0; G.pendingEnc = null; G.pendingChoice = null;
  for (const f of stage.flags) _setFlag(f);
  for (const [k, v] of Object.entries(stage.quests)) G.quests[k] = v;
  // a trust-gated quest's nodes are written for somebody who has answered her,
  // so the whole cast is seated at the gate rather than at zero
  const trust = q.trust || 0;
  for (const id of cast) { _npcState(id).trust = Math.max(_npcState(id).trust, trust); (G.known = G.known || {})[id] = true; }
}

// ── the miss oracle: built by running, never transcribed ──────────────────────

function place(id) {
  const room = (typeof _npcWhere === "function" && _npcWhere(id)) ||
    (typeof _npcRoom === "function" && _npcRoom(id)) || NPCS[id].room || (NPCS[id].bars || [])[0];
  if (!room || !ROOMS[room]) return null;
  G.room = room;
  return _npcsHere().includes(id) ? room : null;
}

// A miss is what THIS mouth says in THIS state about a subject it has nothing
// on — so the oracle is built by asking that exact person, in that exact stage,
// about a word that is in no topic table anywhere, and keeping whatever comes
// back. A shared oracle sampled off five characters is not enough: the brush-off
// pools are per role and per person, and Wimon's own "Not yet, na. Maybe later."
// appears in none of them, so a mutation test that should have gone red came
// back clean. Same doctrine as errand-audit's missOracle, one scope tighter.
const NONSENSE = ["quantumfrogsalad", "zibbleplex", "wubthorpe", "flangistan"];

// Compare on the SHAPE of the reply, not the letters: strip the asked word (some
// brush-offs quote it back), the transcript's own "· You asked …" echo line, and
// whitespace. What is left is the pooled sentence itself.
function shape(lines, asked) {
  return lines.filter(l => !/^·/.test(String(l)))
    .join(" ")
    .replace(new RegExp(asked, "gi"), "«t»")
    .replace(/\s+/g, " ")
    .trim();
}

function askShape(id, alias) {
  const who = String(NPCS[id].name).toLowerCase();
  out.length = 0; doCommand("talk to " + who);
  out.length = 0; doCommand(`ask ${who} about ${alias}`);
  return shape(out, alias);
}

// The parser's own dead ends — refusals rather than pooled brush-offs, and the
// only part of the oracle that is a list, because they are not reachable by
// asking a present character about anything.
const DEAD_ENDS = ["I didn't understand", "That one didn't parse", "isn't around right now",
  "Nobody by that name", "isn't at this bar", "They're not here to ask"];

// THE LOCKED POOL is the half a nonsense probe cannot reach, and it is the half
// this audit is about. `_topicMiss` is what a character says about a subject
// they have nothing on; `_topicLocked` is what they say about a subject they DO
// have and cannot discuss yet — "Not yet, na. Maybe later." — which is precisely
// the sentence a closed return channel prints. No nonsense word can make it
// appear (nonsense matches no node), so the oracle calls the engine's own line
// generators instead: still derived by running, never transcribed, and a
// rewritten pool is picked up on the next run for free.
// A CLOSED channel and a SPENT one are different things, and only the first is a
// finding. "Not my story" / "Not yet, na" mean she has nothing, or won't yet;
// "We've done that one" means the player HEARD it and is asking twice — the
// terse-repeat doctrine working, not a return channel going dark (2026-09-16,
// once the model started marking what the player heard).
const GENERATORS = ["_topicMiss", "_topicLocked"];
const SPENT = ["_askAgain", "_patronAgain"];
function generatedMisses(id, which) {
  const shapes = new Set();
  for (const g of which || GENERATORS) {
    const fn = globalThis[g];
    if (typeof fn !== "function") continue;
    for (let i = 0; i < 40; i++) {
      try { shapes.add(String(fn(id)).replace(/\s+/g, " ").trim()); } catch { break; }
    }
  }
  return [...shapes].filter(Boolean);
}

// ── the sweep ────────────────────────────────────────────────────────────────

// Structural: does `_pickDialogue` hand back a node that actually answers THIS
// topic, rather than falling through to the character's standing line?
function answersTopic(id, alias) {
  const d = _pickDialogue(id, alias);
  return d && d.topic && _topicHits(d.topic, alias) ? d : null;
}

// Behavioural: what a player gets when they type it, against what that same
// person says about nothing at all. Only a candidate the structural pass already
// flagged is replayed, because each one costs a couple of dozen turns.
// `heard` are the node indices that ANSWERED at an earlier stage. A player only
// reaches the later stage by having heard them — that is how the flag moved —
// and since 2026-09-15 the miss path reads the seen-book and gives the gist
// instead of the lock. Modelling the flags without the hearing made the harness
// see a "Not yet, na" the player never gets (its own 21-entry benign list).
function reallyMisses(stage, q, cast, id, alias, heard) {
  const seat = () => { apply(stage, q, cast); if (heard && heard.length) (G.talked[id] = G.talked[id] || []).push(...heard); };
  const pool = new Set();
  for (const word of NONSENSE) {
    for (let i = 0; i < 3; i++) {
      seat();
      if (!place(id)) return null;             // not out tonight — no claim either way
      pool.add(askShape(id, word));
    }
  }
  seat();
  if (!place(id)) return null;
  for (const s of generatedMisses(id, GENERATORS)) pool.add(s);
  const spent = generatedMisses(id, SPENT);
  const reply = askShape(id, alias);
  // heard it already: the doctrine's terse second telling, not a closed door
  if (spent.some(p => p && reply.includes(p))) return { miss: false, reply: reply.slice(0, 120) };
  // containment, not equality: a brush-off can come wrapped (a Thai-fluency
  // refusal, a chip nudge appended under it) and it is still a brush-off.
  const miss = [...pool].some(p => p && reply.includes(p)) ||
    DEAD_ENDS.some(d => reply.includes(d));
  return { miss, reply: reply.slice(0, 120) };
}

const findings = [];
let quests = 0, pairs = 0, played = 0;

for (const [qid, q] of Object.entries(QUESTS)) {
  if (onlyQuest && qid !== onlyQuest) continue;
  quests++;
  const cast = castFor(qid, q);
  const stages = stagesFor(qid, q, cast);

  // topic → [stage names where it answered], per character
  for (const id of cast) {
    const aliases = [...new Set((NPCS[id].dialogue || []).flatMap(aliasesOf))];
    for (const alias of aliases) {
      pairs++;
      const answered = [], nodes = [];
      for (const st of stages) {
        apply(st, q, cast);
        const d = answersTopic(id, alias);
        nodes.push(d);
        answered.push(!!d);
      }
      // DL_DEBUG=<npc>:<topic> traces one pair across the trajectory — the only
      // way to tell "the node closed" from "the harness never reached it".
      if (process.env.DL_DEBUG === id + ":" + alias)
        console.error(qid, id, alias, stages.map((s, i) => s.name + "=" + answered[i]).join(" "));
      // a return channel CLOSED: answered at some stage, silent at a later one
      const first = answered.indexOf(true);
      if (first === -1) continue;
      const lastSilent = answered.lastIndexOf(false);
      if (lastSilent <= first) continue;
      // confirm at the LAST stage that went silent, through the real command
      const at = stages[lastSilent];
      // every node that answered before it went silent — what the player heard
      const heard = [...new Set(nodes.slice(0, lastSilent).filter(Boolean)
        .map(d => NPCS[id].dialogue.indexOf(d)).filter(i => i >= 0))];
      const r = reallyMisses(at, q, cast, id, alias, heard);
      if (process.env.DL_DEBUG === id + ":" + alias) console.error("replay", at.name, JSON.stringify(r));
      if (!r) continue;
      played++;
      if (!r.miss) continue;
      // The finding belongs to the NODE, not to the word: one node carries up
      // to six aliases ("partner|partnership|fifty-one|51 percent|…") and
      // reporting each as its own line turned three closed channels into
      // twenty. `key` is the address a known-issue list can hold steady.
      const topicKey = (nodes[first] || {}).topic || alias;
      findings.push({
        key: id + "|" + topicKey, quest: qid, npc: id, name: NPCS[id].name,
        topic: alias, topicKey,
        openedAt: stages[first].name, closedAt: at.name, reply: r.reply,
      });
    }
  }
}

// One character can lose one topic across several quests that share the flag
// axis — report the person and the topic once, naming the quest that opened it.
const seen = new Set();
const unique = findings.filter(f => {
  const k = f.key;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

if (asJson) {
  console.log(JSON.stringify({ quests, pairs, played, findings: unique }, null, 1));
  process.exit(0);
}

console.log(`dialogue-lifecycle: ${quests} quests, ${pairs} (person, topic) pairs walked, ` +
  `${played} replayed, ${unique.length} closed\n`);
for (const f of unique) {
  console.log(`✗ ASK ${f.name.toUpperCase()} ABOUT ${f.topic.toUpperCase()}   [${f.quest}]`);
  console.log(`    answers at "${f.openedAt}", silent at "${f.closedAt}"`);
  console.log(`    ${f.reply}`);
}
if (!unique.length) console.log("Every topic a quest opens stays answerable.");
