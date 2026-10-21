// THE COVERAGE MAP'S ROWS ARE KEPT, not remembered (2026-10-21).
//
// The map (tools/coverage-map.mjs) is systems × defect classes, and it is what a persona
// round is aimed by. Two ways it went wrong without anybody noticing, both measured that day:
//   1. A feature shipped and its derived atoms (a modal, a quest, a soak effect) belonged to no
//      system. The tool listed them as STRAYS and nothing failed: the kept-girl modal sat there
//      for two days, the four laundering quests and the name on the wall for thirteen.
//   2. Triage wrote a free word into a finding's `system` ("condo", "dialogue", "staff-affair")
//      that is not a row id. About a thousand findings sat under sixty such names, so the condo
//      read hot while the system it belongs to read dark — and a round was aimed off that.
// Both are gated here. A new feature fails this file until it is placed on the map in the same
// commit (docs/systems.json), and a new triage word fails until it is a row id or an alias.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const J = p => JSON.parse(readFileSync(fileURLToPath(new URL("../../" + p, import.meta.url)), "utf8"));
const TOOL = fileURLToPath(new URL("../../tools/coverage-map.mjs", import.meta.url));
const SYS = J("docs/systems.json");
const IDS = new Set(SYS.systems.map(s => s.id));
const ALIAS = SYS.aliases || {};

test("every alias points at a real row, and no alias shadows a row id", () => {
  const bad = Object.entries(ALIAS).filter(([, v]) => !IDS.has(v)).map(([k, v]) => `${k} → ${v}`);
  assert.deepEqual(bad, [], "an alias whose target is not a system id");
  assert.deepEqual(Object.keys(ALIAS).filter(k => IDS.has(k)), [], "an alias that is also a row id is never read");
});

test("every finding's system is a row of the map — an id, or an alias for one", () => {
  const ok = x => !x || IDS.has(x) || IDS.has(ALIAS[x]);
  const rows = J("docs/persona-findings.json").rows;
  const tagged = Object.values(J("docs/persona-findings-systems.json").byClaim);
  const bad = new Map();
  for (const r of [...rows, ...tagged]) for (const s of [r.system, r.system2]) if (!ok(s)) bad.set(s, (bad.get(s) || 0) + 1);
  assert.deepEqual([...bad].map(([k, n]) => `${k} (${n})`), [],
    "a triage word that is no system: add it to docs/systems.json `aliases`, or tag the finding with a row id");
});

test("every derived atom belongs to a system, and the map joins every finding (the tool's own count)", () => {
  const n = JSON.parse(execFileSync(process.execPath, [TOOL, "--numbers"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim().split("\n").pop());
  if (n.strays) {
    const tail = execFileSync(process.execPath, [TOOL], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    assert.fail("a modal, quest, encounter or soak effect no system owns — place it in docs/systems.json:\n" + (tail.match(/STRAYS[^\n]*/) || [""])[0]);
  }
  assert.equal(n.unknownSystems, 0, "a ledger row names a system the map has no row for");
});

test("a predicate a system claims is in the predicate registry's graph list", () => {
  const known = new Set((J("docs/world-graph.json").predicates || []).map(p => p.name));
  const bad = SYS.systems.flatMap(s => s.predicates.filter(p => !known.has(p)).map(p => `${s.id}: ${p}`));
  assert.deepEqual(bad, [], "add it to PREDICATES in tools/gen-world-graph.mjs and register its consumers in predicates.test.js");
});
