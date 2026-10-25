// THE TYPEOF GUARDS (the architecture review of 2026-10-25, finding 4). Engine code called engine code as
// `typeof _x === "function" && _x()` because some tests loaded a subset of files — but every test and the game load the
// whole engine (and world, thai, games), so the guard protected nothing and turned a renamed function into a silently
// disabled feature. 885 lines were unguarded mechanically; the rest are if/else forms left for hand editing. This is a
// RATCHET: the count of guards whose target the engine itself defines may only fall. Guards for genuinely optional
// globals (cli-sim, the frontend's hooks, the news bake) are not counted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const D = f => readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8");
const CEILING = 204;   // lower this when you remove more; never raise it

test("engine-internal typeof guards only ever fall", () => {
  const defs = new Set();
  for (const f of ["thai", "world", "games", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"]) {
    const s = D(f);
    for (const m of s.matchAll(/^function (\w+)\s*\(/gm)) defs.add(m[1]);
    for (const m of s.matchAll(/^(?:const|let|var) (_\w+)\s*=/gm)) defs.add(m[1]);
  }
  for (const m of D("cli-sim").matchAll(/^function (\w+)\s*\(/gm)) defs.delete(m[1]);
  let n = 0; const where = {};
  for (const f of ["engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
    for (const m of D(f).matchAll(/typeof (_\w+) === "function"/g)) if (defs.has(m[1])) { n++; where[f] = (where[f] || 0) + 1; }
  assert.ok(n <= CEILING, `${n} engine-internal typeof guards (ceiling ${CEILING}) — a new one hides a rename; call the function directly. ${JSON.stringify(where)}`);
});
