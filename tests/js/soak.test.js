// The soak harness (tools/soak.mjs) in CI clothing: short seeded autoplayer runs
// asserting the invariant set (no throw, no NaN/runaway, no soft-lock, save
// round-trips), plus a pinned regression for its first catch — the Act One
// WAIT-across-dawn infinite loop. Importing runSoak loads the engine into this
// process's globals (soak.mjs's own vm loader), so this file must NOT vm-load
// the engine itself like the other test files do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runSoak } from "../../tools/soak.mjs";

test("soak: vacation mode, 3 nights — invariants hold", () => {
  const r = runSoak({ seed: 1, nights: 3, maxMs: 20_000 });
  assert.deepEqual(r.failures, [], JSON.stringify(r.failures[0] || {}));
  assert.ok(r.stats.nights >= 1 || r.stats.truncated, "made it through at least one night");
});

test("soak: soi6 challenge mode, 3 nights — invariants hold", () => {
  const r = runSoak({ seed: 3, nights: 3, mode: "soi6", maxMs: 20_000 });
  assert.deepEqual(r.failures, [], JSON.stringify(r.failures[0] || {}));
});

test("regression: Act One WAIT across dawn can't loop the same-day reset forever", () => {
  // The bug (soak seed 2): _act1Fail mid-wait rebuilds G to the SAME day number,
  // so _doWait's day guard passed and the loop ticked the fresh game back to dawn
  // forever. A tick-bomb turns any regression into a clean failure, not a hang.
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" }; // identity persists → no intro modal to save us
  G.nightTurn = 95;
  const orig = globalThis._tick;
  let ticks = 0;
  globalThis._tick = (...a) => {
    if (++ticks > 400) throw new Error("tick runaway — the dawn-reset wait loop is back");
    return orig(...a);
  };
  try { doCommand("wait 20"); } finally { globalThis._tick = orig; }
  assert.ok(ticks < 400, "WAIT returned after the reset instead of looping");
  assert.equal(G.stage, "act1", "the hard fail reset cleanly to a fresh Act One");
});

// ── the de-coverage ratchet ─────────────────────────────────────────────────
// The German gap is a MOVING TARGET: between batch 1 (2026-08-05) and 2026-08-07
// it grew from 682 to 925 unique leaking lines — not a regression, just feature
// work adding English prose faster than the catalog could follow. Closing the
// backlog once does nothing if the next feature silently re-opens it.
//
// So: a ratchet. Seeded de runs are deterministic and take ~0.1s, and this
// asserts the count of English lines leaking into a German game never RISES.
// It does not demand the backlog be finished — only that it stop growing.
//
// If this fails, you added player-facing prose without a `de` entry. Either add
// one to _CATALOGS.de (see docs/i18n-de-gaps.md for the pattern — template with
// _fmt FIRST if the line interpolates amounts), or, if the growth is deliberate
// and accepted, lower... no: RAISE this number in the same commit, so the
// tradeoff is visible in review rather than invisible in a sweep nobody runs.
const DE_LEAK_CEILING = 191;
test("de coverage doesn't regress — English must not leak further into a German game", () => {
  const uniq = new Set();
  for (const seed of [1, 2, 3]) {
    const r = runSoak({ seed, nights: 2, mode: "soi6", lang: "de" });
    for (const w of r.warns) if (w.kind === "langleak") uniq.add(w.line);
  }
  assert.ok(uniq.size <= DE_LEAK_CEILING,
    `de leaks rose to ${uniq.size} (ceiling ${DE_LEAK_CEILING}). New prose needs a de entry — ` +
    `see docs/i18n-de-gaps.md. Sample: ${[...uniq][0]?.slice(0, 90)}`);
});
