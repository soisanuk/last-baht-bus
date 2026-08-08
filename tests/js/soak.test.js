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
// Two ceilings, because the two modes walk different halves of the game and a
// guard on one says nothing about the other. Soi 6 mode is the daily challenge:
// one street, no Act One. Vacation mode is the full game — the wallet quest, the
// hotels, the Darkside, everything the challenge never reaches. Until 2026-08-07
// only Soi 6 was ratcheted, so every de batch tightened a guard on the path
// FEWER players walk while the main path could regress unseen.
//
// A CEILING CAN MOVE BECAUSE THE MAP CHANGED, NOT THE PROSE. These count UNIQUE
// untranslated lines a random walk reaches, so anything that alters where the
// walk goes — new rooms, new exits, a new motosai stand — changes the number
// without a word of English being written. Before re-baselining, run
// `node tools/prose-corpus.mjs --delta`. If it reports 0 records, no new prose
// exists and the movement is REACHABILITY: more (or less) of the existing
// English is now findable. That is still a real change to the German
// experience, so it belongs in docs/i18n-de-gaps.md — but it is not the
// "someone added English without a de entry" failure this guard is named for,
// and bumping the number without checking is how a ratchet turns into a
// rubber stamp.
//
// Re-baselined 2026-08-08 after 14 piwin stands landed at nightlife junctions.
// prose-corpus --delta: 0 records. soi6 and act1 FELL (the fenced pocket walks
// tighter), vacation and expat rose (the open map walks wider). All four
// verified stable over three consecutive runs.
const DE_CEILINGS = [
  // 149 → 111 → 94. The last drop was a BUG FIX, not translation: a motosai
  // could ride out of the fenced pocket, so the walk was reaching town prose it
  // should never have seen. Fixing the fence took 17 lines off this number.
  { mode: "soi6", seeds: [1, 2, 3], nights: 2, ceiling: 94 },
  // vacation runs longer (4 nights × 5 seeds) because Act One occupies the first
  // two and the sandbox prose only starts after it. Verified stable across five
  // consecutive runs; ~240ms.
  // 309 → 391 → 274. It rose when the map got more connected and FELL hard once
  // the expansion settled, because the new rooms give the walk more places to be
  // and it spends fewer of its steps re-treading untranslated town prose.
  // 274 → 338 across the exit-fix pass. Soi 6 opens onto Second Road, Soi 5
  // connects the hill road to Walking Street, and Pattaya Soi 7 exists — three
  // new ways through, so the walk reaches further into untranslated town. All
  // reachability; --delta accounts for the new prose separately.
  { mode: "vacation", seeds: [1, 2, 3, 4, 5], nights: 4, ceiling: 316 },
  // act1 is the do-or-die opening — the wallet chain, the fail/reset screens, the
  // hint whispers. NEITHER other mode reaches it: soi6 force-sets act1Done, and
  // so does the soak's own vacation setup. It was unguarded until 2026-08-07, and
  // it could not be guarded before that either: _act1Fail's newGame() re-seeds
  // G.rng from Math.random, so five identical runs gave 156/144/143/152/143.
  // soak.mjs now pins a deterministic successor seed on reset.
  // 131 → … → 155. This one keeps RISING and it is honest every time. Act One's
  // route now runs through the new Soi Buakhao rooms, and removing the 2.45 km
  // Jomtien shortcut made the walk take more steps through more of them. Real
  // untranslated English on the path every player walks — the biggest single item
  // on the German backlog. Act One's route now
  // runs through five more Soi Buakhao rooms, and their prose has no de entries
  // yet. Real new English on the critical path — see docs/i18n-de-gaps.md.
  { mode: "act1", seeds: [1, 2, 3, 4, 5], nights: 3, ceiling: 137 },
  // expat: the endless stage, unreachable from the other modes (soi6 and the
  // soak's own vacation setup both force act1Done and stop there). Added with
  // the bar-owning chain.
  //
  // Scope this honestly: it covers the stage's AMBIENT prose — rooms, encounters,
  // system lines. It does NOT cover the bar-owning chain, or any other quest: the
  // soak plays randomly and a dep chain needs talk-until-offered → ACCEPT →
  // travel → a specific ASK at each step. A five-seed expat run offers zero
  // quests. Authored quest prose is guarded by scripted playthroughs instead
  // (tests/js/barchain.test.js).
  // 312 → 429 → 399, same story as vacation.
  { mode: "expat", seeds: [1, 2, 3, 4, 5], nights: 4, ceiling: 405 },
];

for (const { mode, seeds, nights, ceiling } of DE_CEILINGS) {
  test(`de coverage doesn't regress in ${mode} mode — English must not leak further ` +
    `into a German game`, () => {
    const uniq = new Set();
    for (const seed of seeds) {
      const r = runSoak({ seed, nights, mode, lang: "de" });
      for (const w of r.warns) if (w.kind === "langleak") uniq.add(w.line);
    }
    assert.ok(uniq.size <= ceiling,
      `de leaks rose to ${uniq.size} in ${mode} mode (ceiling ${ceiling}). New prose needs ` +
      `a de entry — see docs/i18n-de-gaps.md. Sample: ${[...uniq][0]?.slice(0, 90)}`);
  });
}
