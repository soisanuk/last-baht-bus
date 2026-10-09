// The happiness audit is gated here (2026-10-09). Class E — economy — had 93 findings and 3%
// instrument coverage, and the lens behind most of them was a persona reading the สนุก meter
// before and after every command (round 75: SING paid +2 a turn forever; losing a her-farang
// regular cost nothing). tools/happiness-audit.mjs plays every argument-free engine verb and the
// social verbs aimed at each person present, REPS times in one room and one night, and checks:
// the meter moves by what was printed (H1), a free act pays once (H2), and a permanent loss is
// charged and named (H3). Every finding must be on HAPPY_OPEN (real) or HAPPY_OK (benign); a
// NEW one fails here, and a listed one that no longer reproduces asks to be deleted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/happiness-audit.mjs", import.meta.url));
const run = (...flags) => JSON.parse(execFileSync(process.execPath, [TOOL, "--json", ...flags],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

test("happiness audit (--quick): every finding is known, and the audit did work", () => {
  const r = run("--quick");
  assert.ok(r.stats.scenes >= 4 && r.stats.verbs >= 400 && r.stats.losses >= 3, JSON.stringify(r.stats));
  assert.deepEqual(r.findings.filter(f => f.inv === "ERROR").map(f => f.key + " " + f.msg), [], "a verb threw");
  assert.deepEqual(r.unknown, [], "a NEW happiness finding — fix the engine, or list it in HAPPY_OPEN / HAPPY_OK");
  assert.deepEqual(r.fixed, [], "a HAPPY_OPEN row no longer reproduces — delete it");
});

test("happiness audit goes red when a cap or a loss is broken (--mutate)", () => {
  assert.ok(run("--quick", "--mutate", "floor").unknown.some(k => /:sing:H2$/.test(k)), "the floor cap forgotten went unseen");
  assert.ok(run("--quick", "--mutate", "loss").unknown.includes("loss:maidee:H3"), "an uncharged verdict went unseen");
});
