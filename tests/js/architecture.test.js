// docs/architecture.md stays true to the code (2026-10-24). The doc is hand-written, but a doc that names a function that
// was renamed last month lies quietly, and a system shipped without a section is invisible to the next person — so:
// every system in docs/systems.json has exactly one section, every `_function`, `G.field` and CONSTANT the prose names
// exists in web/js, and the generated parts (the index, the facts blocks) are current. Fix a failure by editing the
// prose, or by running `node tools/gen-architecture.mjs` for the generated parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lint, render } from "../../tools/gen-architecture.mjs";

const DOC = fileURLToPath(new URL("../../docs/architecture.md", import.meta.url));
const doc = readFileSync(DOC, "utf8");

test("every system has a section, and every name the doc uses exists in the source", () => {
  const p = lint(doc);
  assert.deepEqual(p, [], "\n" + p.join("\n"));
});

test("the generated index and facts are current (run node tools/gen-architecture.mjs)", () => {
  assert.equal(render(doc), doc);
});

test("the lint goes red on a name that does not exist, a missing section and a top-level field that is only a word", () => {
  const bad = doc.replace("**What it is.**", "**What it is.** It calls `_noSuchFunction`, reads `G.inv` and `NO_SUCH_CONSTANT`.")
    .replace(/<!-- system: act1 -->/, "<!-- system: act1-gone -->");
  const p = lint(bad).join("\n");
  assert.match(p, /_noSuchFunction/); assert.match(p, /G\.inv\b/); assert.match(p, /NO_SUCH_CONSTANT/);
  assert.match(p, /no section for system `act1`/); assert.match(p, /act1-gone/);
});
