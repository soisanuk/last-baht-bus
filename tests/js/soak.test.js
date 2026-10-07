// The soak harness (tools/soak.mjs) in CI clothing: short seeded autoplayer runs
// asserting the invariant set (no throw, no NaN/runaway, no soft-lock, save
// round-trips), plus a pinned regression for its first catch — the Act One
// WAIT-across-dawn infinite loop. Importing runSoak loads the engine into this
// process's globals (soak.mjs's own vm loader), so this file must NOT vm-load
// the engine itself like the other test files do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runSoak } from "../../tools/soak.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── The liveness ledger ─────────────────────────────────────────────────────
// Every other assertion in this file is a SAFETY property — nothing bad happens.
// These two are LIVENESS — something good does. Class-B defects
// (docs/playtest-findings-analysis.md) are liveness failures by definition, and
// the reason none of them was ever caught is that the project had no way to say
// "this ought to happen sometimes". See EFFECTS in tools/soak.mjs.
function tally(seeds, opts) {
  const tot = {};
  for (const seed of seeds) {
    const r = runSoak({ seed, ...opts });
    assert.deepEqual(r.failures, [], JSON.stringify(r.failures[0] || {}));
    for (const [k, v] of Object.entries(r.liveness || {})) tot[k] = (tot[k] || 0) + v;
  }
  return tot;
}

test("liveness: a declared shift always reaches the books", () => {
  // THE round-13 regression, expressed as an invariant rather than a fixture.
  // _barSettle runs from _endNight after G.day++, so a settle-time test of
  // `workedDay === G.day` is always false and the whole presence dilemma goes
  // silent. Verified by reintroducing the bug: declared stayed at 4 and worked
  // dropped to 0, which is precisely this assertion.
  //
  // Stated as a BALANCE, not an equality. A declared shift has two honest ends:
  // it is stood and settles as worked, or it is abandoned and lapses (round 15 —
  // walk away from your own rail for long enough and the takings become Bert's).
  // The equality this used to assert was true only by accident: it went green
  // while no seeded walk happened to wander off, and the first trajectory that
  // did wander read as the round-13 regression. Every declared shift must still
  // ACCOUNT for itself — what must never happen is a shift that neither settles
  // nor lapses, which is exactly what going silent looks like.
  //
  // THE SAMPLE IS THE FRAGILE PART, AND IT HAS NOW COST TWO SESSIONS. Standing a
  // shift is "stay in one room for 20 turns", which is the one thing a random
  // walker is built not to do — so `worked` is a rare-event count, and ANY change
  // to the walker's vocabulary re-rolls every seed's trajectory. Measured
  // 2026-09-07: adding one entry to _COMPLETE_VERBS ("last night"), touching no
  // bar code at all, moved 12 seeds x 6 nights from declared 14 / worked 6 to
  // declared 6 / worked 0 — a red suite with the game unchanged. At 32 seeds x 10
  // nights the walker declares ~14 and stands ~4 of them, so a re-roll landing on
  // zero is under 1%. If this assertion goes red, FIRST check whether the diff
  // touched the walker's vocabulary (_COMPLETE_VERBS, engineComplete, the soak's
  // own channels) — that is the dice moving, not the mechanic dying. The balance
  // assertion above is the one that actually watches the bar.
  const t = tally([...Array(32)].map((_, i) => i + 1), { nights: 10, mode: "barowner" });
  assert.ok(t["bar.night.settled"] > 0, "the bar's books settle at all");
  assert.equal(t["bar.night.worked"] + t["bar.shift.lapsed"], t["bar.shift.declared"],
    `every declared shift must either settle as worked or lapse (declared ${t["bar.shift.declared"]}, ` +
    `worked ${t["bar.night.worked"]}, lapsed ${t["bar.shift.lapsed"]}) — an unaccounted shift ` +
    `is the presence dilemma going silent`);
  assert.ok(t["bar.night.worked"] > 0,
    "at least one shift across twelve seeds is actually STOOD to the end of the night — " +
    "zero worked against a positive declared count is the round-13 bug itself");
  assert.ok(t["bar.shift.declared"] > 0,
    "the soak can still REACH work at all — if this fails the instrument has gone blind, " +
    "not the game (check the engine-vocabulary channel and the owner's WORK/BOOKS nudge)");
});

test("economy: no command moves the pocket without printing a figure (class E, the silent-money invariant)", () => {
  // Colin (round 37) made the rule — the beer names its price on the line that charges it —
  // and the soak now checks it after every command of every seed. Its first run found
  // TAKE HER OUT charging ฿2,000 under a line that said she "names the number plainly".
  const hits = [];
  for (const seed of [1, 2, 3, 4]) for (const mode of ["vacation", "expat", "barowner"]) {
    const r = runSoak({ seed, nights: 6, mode });
    for (const w of r.warns) if (w.kind === "silent-money") hits.push(`${mode}/${seed}: '${w.cmd}' in ${w.room} (${w.delta}) — ${w.line}`);
  }
  assert.deepEqual(hits, [], "money moved with no ฿ on the page");
});

test("surfaces: every word the autocomplete offers is a word the parser takes (class H/P, vocab-huh)", () => {
  // the engine's own engineComplete candidates, typed back; a HUH is the surfaces disagreeing
  const hits = [];
  for (const seed of [1, 2, 3, 4]) for (const mode of ["vacation", "expat"]) {
    const r = runSoak({ seed, nights: 6, mode });
    for (const w of r.warns) if (w.kind === "vocab-huh") hits.push(`${mode}/${seed}: '${w.cmd}' in ${w.room}`);
  }
  assert.deepEqual(hits, [], "the autocomplete offered a word the parser refused");
});

test("liveness: the expat stage's own beats fire without being led there", () => {
  // Both were arrival-only until round 13 and never fired for an owner who
  // opened up early and stayed — 61 nights with G.syn untouched.
  const t = tally([1, 2, 3, 4, 5, 6], { nights: 6, mode: "barowner" });
  assert.ok(t["tan.favour.asked"] > 0, "Tan comes and asks");
  assert.ok(t["procurement.asked"] > 0, "procurement is offered");
});

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

// ── the blind spot gets soaked too ──────────────────────────────────────────
// The walker's centre of gravity leaves most of the map unentered: one run
// stands in 11-16% of the rooms, and the union of every seeded run across all
// four modes reaches 68%. Which means the invariant suite has never once
// entered Pratumnak, Tree Town, Myth Night or the Darkside — districts a month
// old — and "failures 0" was silent about all of them.
//
// Fixed by STARTING somewhere rather than by making the walker roam, because
// the default walk still matters as a stable baseline for every other test in
// this file. --start is additive: the default walk is untouched, and seeding
// runs inside the blind spot lifts union coverage from 63% to 89%. What
// remains is mostly gated by design (oy_office needs the door trick,
// orchid_room needs PLG standing) — a random walker SHOULD NOT reach those.
//
// Two seeds per district, kept small so this stays cheap; the wide sweep (156
// runs) is a manual pass, and this is the regression guard for it.
const BLIND_SPOT_STARTS = [
  "pratumnak_clubs",    // the two gentleman's clubs
  "pratumnak_soi5_m",   // the Samson beer bars
  "jomtien_beach_s2",   // the dead-end sand spur
  "tt_entrance",        // Tree Town's maze
  "myth_night",         // the night market
  "khao_talo_strip",    // the Darkside
];
for (const start of BLIND_SPOT_STARTS) {
  test(`soak: invariants hold starting inside ${start} — the walk never gets here on its own`, () => {
    for (const seed of [1, 2]) {
      const r = runSoak({ seed, nights: 3, mode: "expat", start, maxMs: 20_000 });
      assert.deepEqual(r.failures, [],
        `${start} seed ${seed}: ` + JSON.stringify(r.failures[0] || {}));
      assert.deepEqual(r.warns, [], `${start} seed ${seed} warned: ` + JSON.stringify(r.warns[0] || {}));
    }
  });
}
