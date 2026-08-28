#!/usr/bin/env node
// QUEST-REACHABILITY audit — every quest sends you somewhere; this checks you
// can actually get there while holding it.
//
//   node tools/quest-audit.mjs           # full report
//   node tools/quest-audit.mjs --json
//   node tools/quest-audit.mjs --quest introduction
//
// WHY THIS EXISTS, AND WHAT IT ADDS TO asktopic-audit.mjs.
//
// The ASK-promise audit already checks that every "(ASK <who> ABOUT <what>)" the
// game prints is a question that character answers. It reports 0 unanswered —
// including ASK ROSE ABOUT CANDY, the hint on the "An Introduction" quest. Rose
// does answer about Candy. But Rose is inside the Orchid Club, and _doGo refuses
// that door until `orchidVouched`, which is set by exactly one dialogue node
// (Candy's `rose`) that carries chip:false and is named nowhere. A narrative
// persona held the quest for three in-game nights and never got in (round 18).
//
// So the promise was honoured AS A QUESTION and broken AS A JOURNEY. The old
// audit could never catch it: it asks "does she answer?", never "can he stand
// where she is?". Those are different questions and this file asks the second.
//
// METHOD: empirical, and judged by STATE, never by reply text (refusal prose is
// pooled and varies — the afford-audit lesson). For each quest we build the
// state of a player who has just accepted it (deps satisfied, reqFlags set,
// right stage), resolve its `at` to a room, stand in a room that adjoins that
// one, try to walk in the way a player would, and then look at G.room. Either
// you moved or you didn't.
//
// WHAT IT CANNOT CATCH, stated plainly:
// - A quest with no `at` is invisible to it (nothing to route to). Those are
//   reported as SKIPPED, not as passes — an unmeasured quest is not a clean one.
//   Exactly one qualifies today (`recce`, which has three targets on purpose and
//   carries its own per-leg checklist). The first version of this file skipped
//   FOUR, and the other three were its own fault: their `at` names a patron, and
//   the resolver only knew about NPCS and ROOMS. Worth remembering as the shape
//   of instrument error here — the tool reported the game incomplete when it was
//   the tool that was, and it did so in a reassuring format.
// - It tests the door, not the errand: a reachable room whose NPC then refuses
//   the required ASK is the OTHER audit's job.
// - It stands the player NEXT to the target and walks in. It does not prove the
//   player could FIND that neighbouring room, which is the Myth Night class
//   (three quest texts point there, it is reachable from buakhao_myth, and a
//   determined tester still never found the seam). The discoverability column
//   flags targets that no travel/motosai surface will offer an undiscovered
//   player, but "can a human find this on foot" is not mechanically decidable.

import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

if (typeof globalThis.newGame === "undefined") {
  const JS = new URL("../web/js/", import.meta.url);
  for (const f of ["thai", "world", "games", "lang", "engine-core", "engine-encounters",
    "engine-play", "engine-systems", "engine-parser"])
    vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });
}

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const ONE = args.includes("--quest") ? args[args.indexOf("--quest") + 1] : null;

let out = [];
engineInit(t => out.push(String(t)), null, () => {});

// ── the state a player is in the moment the quest goes active ────────────────
// Deps are satisfied by setting their doneFlags (the quest system observes the
// world, so a done quest IS its flag), and the stage is raised far enough that
// reqFlags like expatLife can hold.
function stateFor(id) {
  const q = QUESTS[id];
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.stage = "vacation";
  _setFlag("act1Done"); _setFlag("hasWallet");
  G.money = 20000;
  Object.keys(ENCOUNTERS).forEach(k => { G.encDone[k] = true; });
  G.lastSaleng = 99999; G.lastPeddler = 99999;
  for (const dep of q.deps || []) {
    const d = QUESTS[dep];
    if (d) { G.quests[dep] = "done"; _setFlag(d.doneFlag); }
  }
  for (const f of q.reqFlags || []) _setFlag(f);
  if ((q.reqFlags || []).includes("expatLife") || (q.deps || []).length > 2) {
    G.stage = "expat"; _setFlag("expatLife");
  }
  G.quests[id] = "active";
  out = [];
}

// ── where the quest points, resolved the way HINT resolves it ────────────────
// PATRONS COUNT. The first version of this resolver checked NPCS and ROOMS only,
// so every quest whose `at` names a bar regular (Glam, Fergie) reported as "no
// `at` to route to" — and those are the targets that MOVE, hash-picked to a new
// bar every in-game hour until they settle at 22:00. That is the highest-risk
// reachability case in the game, and the audit was blind to exactly it: a
// narrative persona spent a session unable to find Fergie and was told only that
// "the regulars drift between bars" (round 18). An instrument that skips its
// hardest cases and prints the rest as clean is worse than no instrument.
function targetRoom(q) {
  let at = q.at;
  if (typeof at === "function") { try { at = at(G); } catch (e) { return null; } }
  if (!at) return null;
  // One cast since the patron fold: a regular is an NPCS entry too, and his
  // absences (days / season) plus Glam's shuttle live in _npcActive/_npcRoom —
  // which is what the alias reads. Resolving him through bare _npcRoom would
  // name the stool he isn't on tonight.
  if (NPCS[at]) {
    try { return NPCS[at].patron ? _patronRoom(at) : _npcRoom(at); } catch (e) { return null; }
  }
  return ROOMS[at] ? at : null;
}

// A shuttled/scheduled regular is somewhere different by hour. KEYED ON THE
// FLAG, not on table membership: when the fold made every patron an NPCS entry,
// a `PATRONS[at]` test here would have gone permanently false and this sweep
// would have died silently — the audit failing by PASSING, the exact regression
// its own header warns about.
function patronHours(at) {
  return (NPCS[at] && NPCS[at].patron) ? [0, 20, 40, 60, 80] : [null];
}

// a room that adjoins the target: either an exit into it, or it fronts the block
function neighbourOf(target) {
  for (const [id, r] of Object.entries(ROOMS)) {
    if (id === target) continue;
    for (const [d, to] of Object.entries(r.exits || {})) if (to === target) return { id, cmd: "go " + d };
    if ((r.venues || []).includes(target)) {
      const nm = (_barName(target) || ROOMS[target].name || "").replace(/\s*\(.*\)$/, "");
      return { id, cmd: "enter " + nm.toLowerCase() };
    }
  }
  return null;
}

// Is the target's whole DISTRICT off the transport map? Asked per-region, not
// per-room, on purpose: TRAVEL only lists rooms you have already stood in, so
// per-room the answer is "no" for nearly every bar in the game and the column is
// 27 rows of noise. What actually strands a player is a region the motosai will
// not take them to at all — they have to already know which street the seam is
// on. Myth Night is the live case: three quest texts name it, `myth_night` is
// even flagged `motosai: true` as a STAND you can hail from, and MOTOSAI_DESTS
// has no entry that goes there. You can ride out and not back in.
// A drop-off ADJOINING the district counts as served: the Tree Town motosai stand
// is `buakhao_tt`, which is region-labelled Soi Buakhao because it sits at the
// mouth of the maze — the ride does take you there, and flagging it was the
// heuristic crying wolf on its first run.
function districtOnTransportMap(target) {
  const region = (ROOMS[target] || {}).region;
  if (!region) return true;
  for (const d of Object.values(MOTOSAI_DESTS || {})) {
    const drop = ROOMS[d.room] || {};
    if (drop.region === region) return true;
    for (const to of Object.values(drop.exits || {}))
      if ((ROOMS[to] || {}).region === region) return true;
    if ((drop.venues || []).some(v => (ROOMS[v] || {}).region === region)) return true;
  }
  return false;
}

const rows = [];
for (const [id, q] of Object.entries(QUESTS)) {
  if (ONE && id !== ONE) continue;
  stateFor(id);
  // walk a hopper's night: same quest, several hours, first failure wins
  let target = null, hourNote = "";
  for (const hr of patronHours(q.at)) {
    if (hr !== null) { G.nightTurn = hr; }
    const t = targetRoom(q);
    if (!t) continue;
    target = t;
    if (!neighbourOf(t)) { hourNote = hr === null ? "" : ` (at nightTurn ${hr})`; break; }
  }
  if (!target) { rows.push({ id, name: q.name, verdict: "SKIPPED", why: "no `at` to route to" }); continue; }

  const nb = neighbourOf(target);
  if (!nb) { rows.push({ id, name: q.name, target, verdict: "NO-DOOR", why: "no room in the world leads into it" }); continue; }

  G.room = nb.id;
  out = [];
  const before = G.room;
  try { doCommand(nb.cmd); } catch (e) {
    rows.push({ id, name: q.name, target, verdict: "THREW", why: String(e.message).slice(0, 80) });
    continue;
  }
  const moved = G.room === target;
  const reply = out.join(" ").replace(/\s+/g, " ").slice(0, 150);
  rows.push({
    id, name: q.name, target,
    verdict: moved ? "OK" : "BLOCKED",
    from: before, cmd: nb.cmd,
    findable: districtOnTransportMap(target),
    why: moved ? "" : reply + hourNote,
  });
}

// THE INSTRUMENT MUST HAVE DONE WORK. A tool that audits nothing reports clean
// (afford-audit shipped with exactly that bug and the assertion is what caught
// it), so fail loudly rather than printing a reassuring empty table.
const measured = rows.filter(r => r.verdict !== "SKIPPED");
if (!ONE && measured.length < 5) {
  console.error(`quest-audit: only ${measured.length} quests were actually routed — the audit is broken, not the game.`);
  process.exit(2);
}

if (JSON_OUT) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

const blocked = rows.filter(r => r.verdict === "BLOCKED" || r.verdict === "NO-DOOR" || r.verdict === "THREW");
const unfindable = rows.filter(r => r.verdict === "OK" && !r.findable);
const skipped = rows.filter(r => r.verdict === "SKIPPED");

console.log(`quest-audit: ${rows.length} quests, ${measured.length} routed, ${blocked.length} blocked\n`);
if (blocked.length) {
  console.log("── the quest is live and the door is shut ──");
  for (const r of blocked) {
    console.log(`  ${r.id} (${r.name})`);
    console.log(`    → ${r.target}   [${r.verdict}]  ${r.cmd || ""} from ${r.from || "?"}`);
    console.log(`    ${r.why}`);
  }
  console.log("");
}
if (unfindable.length) {
  console.log("── reachable on foot, but the whole district is off the transport map ──");
  console.log("   (walk-in works; TRAVEL lists only what you've already found, and the");
  console.log("    motosai list is fixed — so a quest can name a place nothing takes you to)");
  for (const r of unfindable) console.log(`  ${r.id} → ${r.target}`);
  console.log("");
}
if (skipped.length) {
  console.log(`── not measured (${skipped.length}): no \`at\` field, so there is nothing to route ──`);
  console.log("  " + skipped.map(r => r.id).join(" · ") + "\n");
}
if (!blocked.length) console.log("Every quest with an `at` can be walked into while you hold it.");
