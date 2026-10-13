// The chorus audit is gated here (2026-10-13). "The same line from two women" came back in sixteen persona
// rounds before an instrument held it (ledger, class M). tools/chorus-audit.mjs asks a week's ten women on
// the Soi 6 floor the same subjects in one game — the hello, the town's small talk, family, home, plan, last
// time, remember me, the closing hour, the league, the goodbye, her text — and fails when three or more of
// them say one sentence. Pairs are reported, not gated: a pool dealt distinct until it runs out will
// eventually pair, and that is the doctrine working; a chorus is a pool shallower than a week or a line that
// was never pooled. The floor's brush-offs (the topic-miss pools) are a register and are skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/chorus-audit.mjs", import.meta.url));
const run = (...flags) => {
  let raw;
  try { raw = execFileSync(process.execPath, [TOOL, "--json", ...flags], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }); }
  catch (e) { raw = String(e.stdout || ""); if (!raw.trim()) throw e; }
  return JSON.parse(raw);
};

test("chorus audit: no three of a week's women say one sentence", () => {
  const r = run("--quick");
  assert.ok(r.women >= 8, "the audit asked its women: " + r.women);
  assert.deepEqual(r.findings.map(f => `${f.women.length}× "${f.sentence}"`), [], "a NEW chorus — deepen the pool, deal it town-wide, or add it to CHORUS_OK with a reason");
});

test("chorus audit goes red when every woman gets one goodbye (--mutate)", () => {
  assert.ok(run("--quick", "--mutate", "leaving").findings.length > 0, "a one-line goodbye pool went unseen");
});
