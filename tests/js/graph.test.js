// The world graph's guard (docs/persona-findings-systemic.md §3, the substrate
// under 3.1 and 3.2). tools/gen-world-graph.mjs derives docs/world-graph.json
// from web/js/*.js — rooms, people, dialogue nodes, quests, flags, items,
// encounters, constants, and the edges between them — so a set question about
// the world ("which flags are set and never read", "which rooms nothing leads
// to") is a few lines against a JSON file instead of another vm-load and
// another hand-written list.
//
// Three jobs here, in descending order of how hard they gate:
//
//   (a) the committed graph is REPRODUCIBLE from the committed generator. Same
//       claim art.test.js makes about the scene manifest, for the same measured
//       reason: a generated file the repo cannot regenerate is a hand-edit by
//       another name, and comparing a few counts passes on a graph whose
//       generator can no longer produce it.
//   (b) STRUCTURAL INVARIANTS — every edge lands somewhere real. These gate.
//       Note the flag one: world.test.js already judges "every required flag is
//       settable" with a hand-kept `settable` allowlist. This does NOT repeat
//       that judgement; it asserts the graph AGREES with it — the graph derives
//       its engine setters by grepping `_setFlag("…")` and `G.flags.x =`, so if
//       the two ever disagree, either the allowlist has gone stale or the
//       grep has.
//   (c) ORPHANS — a REPORT, printed, not a gate, because "set and never read"
//       is a smell and not a defect: a flag can be a save-file record, and the
//       only honest thing the harness can do is name it and let a person judge.
//       The one exception is a node the ASK path can provably never reach, which
//       IS a defect and does gate, against a reasoned known-issue list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../..", import.meta.url));
const G = JSON.parse(readFileSync(new URL("../../docs/world-graph.json", import.meta.url), "utf8"));

const roomIds = new Set(G.rooms.map(r => r.id));
const npcIds = new Set(G.npcs.map(n => n.id));
const itemIds = new Set(G.items.map(i => i.id));
const questIds = new Set(G.quests.map(q => q.id));
const dialogueKeys = new Set(G.dialogue.map(d => d.key));
const flagByName = new Map(G.flags.map(f => [f.name, f]));
const edges = t => G.edges.filter(e => e.type === t);
const has = (o, k) => Array.isArray(o[k]) && o[k].length > 0;

test("the committed graph is REPRODUCIBLE from the committed generator", () => {
  const r = spawnSync("node", [root + "tools/gen-world-graph.mjs", "--check"],
    { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0,
    "docs/world-graph.json does not match its generator's output — either the world " +
    "changed without regenerating, or the graph was committed without the generator " +
    "change that makes it. Run: node tools/gen-world-graph.mjs\n" + (r.stderr || r.stdout || ""));
});

test("the graph is not silently empty (a loader break reports as a clean tree)", () => {
  assert.ok(G.rooms.length > 200, `expected 200+ rooms, saw ${G.rooms.length}`);
  assert.ok(G.npcs.length > 300, `expected 300+ people, saw ${G.npcs.length}`);
  assert.ok(G.dialogue.length > 2000, `expected 2000+ dialogue nodes, saw ${G.dialogue.length}`);
  assert.ok(G.quests.length > 30, `expected 30+ quests, saw ${G.quests.length}`);
  assert.ok(G.flags.length > 100, `expected 100+ flags, saw ${G.flags.length}`);
  assert.ok(G.constants.length > 100, `expected 100+ constants, saw ${G.constants.length}`);
  for (const t of ["EXIT", "VENUE", "LOCATED", "REQUIRES", "FORBIDS", "SETS", "GIVES",
    "DEPENDS", "DONE_BY", "GIVEN_BY", "AT", "SET_BY_ENGINE", "READ_BY_ENGINE",
    "READ_BY_DATA", "INTERPOLATES", "CONSULTS"])
    assert.ok(edges(t).length > 0, `no ${t} edges — the harvest for that kind broke`);
});

// ── (b) structural invariants ────────────────────────────────────────────────

test("every EXIT and VENUE edge lands in a real room", () => {
  const bad = [...edges("EXIT"), ...edges("VENUE")]
    .filter(e => !roomIds.has(e.to))
    .map(e => `${e.type} ${e.from} --${e.dir || ""}--> ${e.to}`);
  assert.deepEqual(bad, [], "an exit or a venue door leads to a room that does not exist");
});

test("every NPC is located in a real room (or honestly offmap)", () => {
  const bad = edges("LOCATED")
    .filter(e => e.to !== "(offmap)" && !roomIds.has(e.to))
    .map(e => `${e.from} (${e.kind}) --> ${e.to}`);
  assert.deepEqual(bad, [], "a character is stationed in a room that does not exist");
  // and everyone who is not offmap IS somewhere: `_npcRoom` is total (CLAUDE.md),
  // so a person with no LOCATED edge at all is a person the game can never place.
  const placed = new Set(edges("LOCATED").map(e => e.from));
  const nowhere = G.npcs.filter(n => !placed.has(n.id)).map(n => n.id);
  assert.deepEqual(nowhere, [], "these people have no room, no bars[] and no offmap flag");
});

test("every quest resolves: giver, dep, doneFlag, item, and where it sends you", () => {
  const bad = [];
  for (const q of G.quests) {
    if (q.giver && !npcIds.has(q.giver)) bad.push(`${q.id}: giver ${q.giver}`);
    if (q.giverIfSelf && !npcIds.has(q.giverIfSelf)) bad.push(`${q.id}: giverIfSelf ${q.giverIfSelf}`);
    for (const d of q.deps || []) if (!questIds.has(d)) bad.push(`${q.id}: dep ${d}`);
    if (q.item && !itemIds.has(q.item)) bad.push(`${q.id}: item ${q.item}`);
    // `at:` may be a closure (a two-leg quest's where-clause follows the step);
    // the generator reads its targets out of the closure's own source, so both
    // shapes are checked the same way here.
    for (const t of q.atTargets || [])
      if (!roomIds.has(t) && !npcIds.has(t)) bad.push(`${q.id}: at ${t}`);
    if (q.at && !(q.atTargets || []).includes(q.at)) bad.push(`${q.id}: at ${q.at} not in atTargets`);
    // a quest completes by observing a flag; a doneFlag nothing can set is a
    // quest that can be accepted and never finished
    if (q.doneFlag) {
      const f = flagByName.get(q.doneFlag);
      assert.ok(f, `${q.id}: doneFlag ${q.doneFlag} is not in the graph at all`);
      if (!has(f, "setByDialogue") && !has(f, "setByEngine") && !has(f, "setByReads"))
        bad.push(`${q.id}: doneFlag ${q.doneFlag} is set by nothing`);
    }
  }
  assert.deepEqual(bad, [], "quest references that resolve to nothing");
  const unresolved = edges("AT").filter(e => e.kind === "unresolved").map(e => `${e.from} -> ${e.to}`);
  assert.deepEqual(unresolved, [], "a quest's `at:` names neither a room nor a person");
});

test("every dialogue node's GIVES is a real item, and every SETS/REQUIRES edge has a node", () => {
  const badGive = G.dialogue.filter(d => d.gives && !itemIds.has(d.gives))
    .map(d => `${d.key} gives ${d.gives}`);
  assert.deepEqual(badGive, [], "a dialogue node hands over an item that does not exist");
  const badFrom = [...edges("SETS"), ...edges("REQUIRES"), ...edges("FORBIDS")]
    .filter(e => !dialogueKeys.has(e.from) && !questIds.has(e.from) && !String(e.from).startsWith("read:"))
    .map(e => `${e.type} from ${e.from}`);
  assert.deepEqual(badFrom, [], "a gate edge comes from something that is not a node, a quest or a room read");
});

test("items start somewhere real", () => {
  const bad = G.items
    .filter(i => i.location && i.location !== "inventory" && !roomIds.has(i.location))
    .map(i => `${i.id} in ${i.location}`);
  assert.deepEqual(bad, [], "an item starts in a room that does not exist");
});

test("every encounter fires in real rooms", () => {
  const bad = [];
  for (const e of G.encounters) for (const r of e.rooms || []) if (!roomIds.has(r)) bad.push(`${e.id}: ${r}`);
  assert.deepEqual(bad, [], "an encounter is armed in a room that does not exist");
});

test("the graph agrees with world.test.js: no required flag is unsettable", () => {
  // world.test.js owns the JUDGEMENT (its `settable` allowlist names every
  // engine-set flag by hand, with a reason each). This asserts the DERIVED
  // answer is the same one: nothing the data gates on is beyond the reach of
  // dialogue `sets:`, a room `reads:` node, or an engine `_setFlag` site. If
  // this goes red and world.test.js stays green, the allowlist has gained an
  // entry for a flag nothing actually sets any more.
  const unset = G.flags
    .filter(f => (has(f, "requiredBy") || has(f, "forbiddenBy") || has(f, "reqFlagOf")) &&
      !has(f, "setByDialogue") && !has(f, "setByEngine") && !has(f, "setByReads"))
    .map(f => f.name);
  assert.deepEqual(unset, [],
    "these flags gate content and nothing in the world or the engine sets them");
});

test("no dialogue node's gate contradicts itself", () => {
  const bad = [];
  for (const d of G.dialogue) {
    const req = new Set(d.req || []);
    for (const f of d.notFlags || []) if (req.has(f)) bad.push(`${d.key} needs AND forbids ${f}`);
  }
  assert.deepEqual(bad, [], "a node that can never be picked, whichever way the flag falls");
});

// ── a node the ASK path can provably never reach ─────────────────────────────
// `_pickDialogue` walks the array in order and takes the first entry whose gates
// hold (engine-core.js) — so an UNGATED node sitting earlier on the same topic
// key makes every later node on that key dead, whatever its own gate says. That
// is class J's shape (docs/persona-findings-systemic.md) reduced to arithmetic:
// the return channel is written, and the deflection in front of it answers first.
//
// Only the TOPICAL case gates. A shadowed topicless node is a different and
// weaker claim — `_selfNamedNode` and the conversation layer can still reach one
// by other routes — so those are printed in the report below instead.
const SHADOW_OK = new Map([
  // (the four found on 2026-09-15 — Fast Eddy's three post-job nodes, Fon's bond-2 shrine line — were fixed the same day)
]);

function shadowed() {
  const byNpc = new Map();
  for (const d of G.dialogue) (byNpc.get(d.npc) || byNpc.set(d.npc, []).get(d.npc)).push(d);
  const out = [];
  for (const list of byNpc.values()) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      // "ungated" means every gate the picker honours: req, notFlags, bond, when.
      if (has(a, "req") || has(a, "notFlags") || a.bond || a.hasWhen) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if ((a.topic || null) !== (b.topic || null)) continue;
        out.push({ key: b.key, by: a.key, topic: a.topic || null });
      }
    }
  }
  return out;
}

test("no topical dialogue node sits behind an ungated node on the same topic", () => {
  const dead = shadowed().filter(s => s.topic);
  const unlisted = dead.filter(s => !SHADOW_OK.has(s.key))
    .map(s => `${s.key} is unreachable — ${s.by} answers "${s.topic}" first, ungated`);
  assert.deepEqual(unlisted, [],
    "a node the ASK path can never reach. Either gate the node in front of it, move it " +
    "later in the array, or — if it is a deliberate one-time beat — add it to SHADOW_OK " +
    "with a reason:\n  " + unlisted.join("\n  "));
  // and the list stays honest: an entry that is no longer shadowed is a fixed
  // defect whose excuse should come out with it.
  const live = new Set(dead.map(s => s.key));
  const stale = [...SHADOW_OK.keys()].filter(k => !live.has(k));
  assert.deepEqual(stale, [], "SHADOW_OK entries that are no longer shadowed — prune them");
});

// ── (c) the orphan report ────────────────────────────────────────────────────

test("REPORT: orphans (printed, never a gate)", () => {
  const lines = [];
  const setters = f => has(f, "setByDialogue") || has(f, "setByEngine") || has(f, "setByReads");
  const readers = f => has(f, "requiredBy") || has(f, "forbiddenBy") || has(f, "readByEngine") ||
    has(f, "readByData") || has(f, "doneFlagOf") || has(f, "reqFlagOf");

  // A flag written and never consulted. Not automatically wrong — several are
  // deliberate save-file records a future feature reads — which is exactly why
  // this prints instead of failing.
  const writeOnly = G.flags.filter(f => setters(f) && !readers(f)).map(f => f.name);
  lines.push(`flags set and never read (${writeOnly.length}): ${writeOnly.join(" · ") || "none"}`);

  // A room nothing leads to. Zero today; a new room wired into no exit and no
  // venues[] would show up here before a player ever failed to find it.
  const inbound = new Set([...edges("EXIT"), ...edges("VENUE")].map(e => e.to));
  const unreachable = G.rooms.filter(r => !inbound.has(r.id)).map(r => r.id);
  lines.push(`rooms with no inbound exit and no venue door (${unreachable.length}): ` +
    (unreachable.join(" · ") || "none"));

  // The weaker half of the shadow check — reachable by other routes, so it is
  // information rather than a finding.
  const dim = shadowed().filter(s => !s.topic).map(s => `${s.key} behind ${s.by}`);
  lines.push(`topicless nodes behind an ungated topicless node (${dim.length}): ` +
    (dim.join(" · ") || "none"));

  // People nobody can bump into: not offmap, but stationed in a room nothing
  // reaches. Zero while the room check above is zero; kept because the two can
  // come apart (a room reachable only from a closed venue).
  const located = new Map();
  for (const e of edges("LOCATED")) if (e.to !== "(offmap)") located.set(e.from, e.to);
  const stranded = [...located].filter(([, r]) => !inbound.has(r)).map(([n, r]) => `${n} @ ${r}`);
  lines.push(`people in rooms nothing leads to (${stranded.length}): ${stranded.join(" · ") || "none"}`);

  console.log("\nworld-graph orphan report\n  " + lines.join("\n  ") + "\n");
  assert.ok(lines.length, "the report ran");
});
