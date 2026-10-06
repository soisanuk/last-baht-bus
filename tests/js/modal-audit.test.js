// The modal audit is gated here (2026-10-07). Class G — modal / input gating — was the
// findings ledger's top row for a month: 75 findings, 11% severe, no instrument. The tool
// arms every gate the SOURCE knows (every `pendingChoice = "x"`, every _ENC key, every game
// type, the barfine, the soapy's menu, the fare) through its real setter and types the inputs
// the gates kept mishandling: a question-shaped non-answer, the read-only verbs, its own
// labels the turn after it closed, a reload mid-modal, every chip it offers. A new gate with
// no recipe fails here until somebody writes one or says why not — the same discipline as
// witness-audit's CLASS table and askable-audit's OK list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/modal-audit.mjs", import.meta.url));

test("every modal answers a question, a read-only verb, a stale answer and a reload — and every gate in the source has a recipe", () => {
  let raw;
  try { raw = execFileSync(process.execPath, [TOOL, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { raw = String(e.stdout || ""); if (!raw.trim()) throw e; }   // exit 1 on findings — the JSON is still on stdout
  const r = JSON.parse(raw);
  assert.ok(r.discovered.length >= 55, `the source discovery found ${r.discovered.length} gates — it used to find 60`);
  assert.ok(r.armed >= 50, `only ${r.armed} gates armed`);
  assert.deepEqual(r.unarmed, [], "a gate without a recipe or a SKIP reason");
  assert.deepEqual(r.findings.map(f => `${f.state} · ${f.probe} · ${f.msg}`), []);
});
