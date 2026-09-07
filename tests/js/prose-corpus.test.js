// tools/prose-corpus.mjs prints the RENDER beside each record on --delta/--taps:
// the taps decorate() would produce, and an ⚠ for a third-person "the <item>" that
// taps YOUR item. Sixteen such phones passed the text-only review (2026-09-07);
// the column exists so the reviewer sees what the player will tap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const tool = fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url));
const run = (...a) => execFileSync("node", [tool, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

test("--taps prints the taps a record renders, and the corpus carries no third-person item tap", () => {
  const o = run("--group", "room,quest,npc,pool,fn", "--taps");
  assert.match(o, /\[taps: /, "the render column is printed");
  assert.match(o, /\[taps: [^\]]*Candy\(npc\)/, "a name is a tap");
  // the tool's own warning shape, not any ⚠ a record happens to contain (the quest journal prints one)
  assert.doesNotMatch(o, /^\s+⚠ third-person/m, "every third-person phone is wrapped — the sweep and the review column agree");
});

test("without --taps the dump is text only, and the header carries the checklist", () => {
  const o = run("--group", "quest");
  assert.doesNotMatch(o, /\[taps: /);
  const src = execFileSync("cat", [tool], { encoding: "utf8" });
  assert.match(src, /THE DELTA CHECKLIST/); assert.match(src, /never in the same shell chain as the commit/);
});
