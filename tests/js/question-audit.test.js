// THE QUESTION AUDIT, gated (2026-10-14): the hundred things a man asks the woman he is talking to must reach her —
// never a verb that took one word of it, never "didn't understand". The bucketed list is the writing queue, not a
// failure. tools/question-audit.mjs carries the reasoning; --mutate route proves the gate goes red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const tool = fileURLToPath(new URL("../../tools/question-audit.mjs", import.meta.url));
const run = (...a) => JSON.parse(execFileSync(process.execPath, [tool, "--json", ...a], { encoding: "utf8" }));

test("every question reaches her: no verb takes it, nothing fails to parse", () => {
  const r = run("--quick");
  assert.ok(r.asked > 250, "the sample asked");
  assert.deepEqual(r.findings, [], r.findings.map(f => `${f.c} ${f.id}: ${f.q} → ${f.o}`).join("\n"));
  // the writing queue was emptied on 2026-10-14 (the 32 subjects): keep it empty — a new question on the list needs
  // a subject, not the catch-all
  assert.equal(r.bucketed, 0, "every question has a subject that answers it");
});

test("the audit goes red without the routing rule", () => {
  assert.ok(run("--quick", "--mutate", "route").findings.length > 20);
});
