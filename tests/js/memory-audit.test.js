// The memory audit is gated here (2026-10-13). "She doesn't remember me" came back in fourteen persona
// rounds before an instrument held it (ledger, class J/B): Alisa two nights after his bed, Kluay forty
// minutes after the short time, three women denying he had been in their bar, a colleague "not mine to
// know" to her own floor. tools/memory-audit.mjs plays each kind of night (two lady drinks, a short time,
// a long time, a night out, a night out sent home) with each woman on the Soi 6 floor through the game's
// own verbs, and the next evening puts three questions — a bare TALK, LAST NIGHT, and a colleague asked
// about her — against a control game with no event. A stranger's greeting, the stranger's answer, or a
// colleague's shrug is a finding; MEMORY_OK holds the benign ones with their reasons.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/memory-audit.mjs", import.meta.url));
const run = (...flags) => {
  let raw;
  try { raw = execFileSync(process.execPath, [TOOL, "--json", ...flags], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }); }
  catch (e) { raw = String(e.stdout || ""); if (!raw.trim()) throw e; }
  return JSON.parse(raw);
};

test("memory audit: a woman remembers the night she spent with you, and so does her floor", () => {
  const r = run("--quick");
  assert.ok(r.plays >= 20, "the audit played its nights: " + r.plays);
  assert.deepEqual(r.findings.map(f => `${f.key}: ${f.msg}`), [], "a NEW memory finding — fix the engine, or add it to MEMORY_OK with a reason");
});

test("memory audit goes red when she forgets (--mutate)", () => {
  assert.ok(run("--quick", "--mutate", "wenthello").findings.length > 0, "a woman who forgot the night went unseen");
});
