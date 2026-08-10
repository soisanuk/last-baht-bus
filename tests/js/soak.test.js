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
//
// Re-baselined again 2026-08-08 for the Dolphin roundabout — see the vacation
// entry below, which is the worked example of how to tell a map change from a
// prose regression. soi6 and act1 did not move at all: soi6 is fenced out of
// Naklua, and act1 walks through the new room but its five lines shipped with
// German, so the two effects cancelled to exactly zero.
const DE_CEILINGS = [
  // 149 → 111 → 94. The last drop was a BUG FIX, not translation: a motosai
  // could ride out of the fenced pocket, so the walk was reaching town prose it
  // should never have seen. Fixing the fence took 17 lines off this number.
  { mode: "soi6", seeds: [1, 2, 3], nights: 2, ceiling: 107 },
  // 94 → 107: the origin seven became vignettes, so the soi6 walk now REACHES
  // their scenes instead of stopping at an ACCEPT it never types. More English
  // seen, none added — the leak was always there, behind a gate the soak couldn't open.

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
  //
  // 250 → 317 on the Dolphin roundabout, and this one is worth reading, because
  // the obvious diagnosis was wrong TWICE. The new leaks are the Orchid, Mort at
  // the Queen Vic, the Soi Diamond go-gos — central Pattaya, nowhere near Naklua,
  // so it is not prose around the new room. Nor is it pure sampling churn from
  // the RNG diverging: measured symmetrically at 20 seeds, the reachable-leak set
  // goes 624 → 688 (32 lost, 96 gained), so the walk really does get further.
  //
  // The cause is that the roundabout is a stop on BOTH bus lines — the network's
  // first two-line interchange — so a wandering player can now cross the town by
  // songthaew instead of only riding out and back. A pathfinding change, not a
  // prose change; --delta was 5 records, all of them the new room, all translated.
  //
  // The lesson for the next person to hit this: five seeds is a SAMPLE, not a
  // census (20 seeds see 688 lines where 5 see 317). A jump in this number is not
  // evidence of new debt, and a fall is not evidence of progress. Only --delta
  // measures debt. This ceiling measures where the walk goes.
  //
  // 317 → 344 on the south-end rework, and unlike the Dolphin move this one IS
  // partly real debt: three new rooms (Soi Buakhao's Pattaya Tai foot, the Soi
  // Diamond junction, the Pratumnak-end stretch) shipped with 17 lines of
  // English and no de entries. --delta reported exactly those 18 records. They
  // are NOT on the Act One path — act1 held at 126, which is the evidence — so
  // they go on the ranked backlog in docs/i18n-de-gaps.md rather than being
  // translated at birth the way the Dolphin's five lines were.
  // 344 → 355 on wiring Bali Hai to the hill road. --delta: 1 record (the one
  // desc I edited). The rest is the pier ceasing to be a dead end — Walking
  // Street now has an on-ramp to Pratumnak, so the walk reaches the hill and
  // the Jomtien side from the strip instead of only from Second Road.
  // 355 → 324 on the Pratumnak Soi 5 turn. FELL, and not because anything got
  // translated — a node on the hill route redistributes where the walk spends
  // its steps. Tightened rather than left slack.
  // 324 → 333 for the two Pratumnak gentleman's clubs. Real debt, not
  // reachability: two venues and three authored characters is a lot of new
  // English. --delta reported 45 records. Off the Act One path (act1 held at
  // 132), so they join the ranked backlog.
  // 333 → 322 for the six lower-Soi-5 venues. FELL despite a lot of new English,
  // because more rooms means the walk spreads thinner over them. Tightened.
  // 322 → 285 → 279 for the Central Mall junction and the crocodile. Fell; tightened.
  { mode: "vacation", seeds: [1, 2, 3, 4, 5], nights: 4, ceiling: 315 },  // +10: the Beach Road corner is 5 new lines and a node the
  // walk fans out from at the top of the seafront
  // 310 → 315 for the Myth Night rework: eleven rooms rewritten to what the
  // place actually is (open-air beer bars, one shared DJ) plus the DJ-slip
  // encounter. Only +5 because it REPLACED English rather than adding much —
  // the craft-beer bars it displaced were already leaking.
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
  // 126 → 132 on the Bali Hai ⟷ hill road link, and this is the first thing all
  // week to move act1 at all — every other map change left it at exactly 126,
  // which is what told us those rooms were off the critical path. This one
  // isn't a critical-path change either: the wallet run goes north to Naklua
  // and never nears the hill. It is that a player CAN now wander off the south
  // end of Walking Street and onto a dark hill road during the do-or-die night,
  // which is a real road and a real way to lose the night.
  // 132 → 135. Five new English lines exist (the mall's service road) and the
  // Act One walk can wander past them — but the CRITICAL path does not: the
  // wallet route goes up Second Road and cuts through Soi Diana, well north of
  // the mall. So backlog, same call as the Soi 5 venues.
  { mode: "act1", seeds: [1, 2, 3, 4, 5], nights: 3, ceiling: 105 },  // de batch 7: the first act1 drop from actual
  // +1 (act1 104→105, expat 455→456): the HELP screen gained a line telling
  // desktop players that RIGHT-CLICK opens the full wheel. The SOI6 help is
  // translated and absorbed it; the FULL help has never had a de entry at all,
  // so it leaks wholesale and is one line longer now. Pre-existing gap, on the
  // ranked backlog in docs/i18n-de-gaps.md — not worth 30 lines of unreviewed
  // German shipped as a side effect of a UI fix.

  // TRANSLATION rather than a map change — 115 → 104  // FELL 28 on the southern beach spur: it is a
  // three-room dead end with no road access, so an Act One walk that wanders
  // down it spends those turns on new prose instead of re-treading town
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
  // 312 → 429 → 399, same story as vacation. 430 → 421 on the Dolphin roundabout
  // — tightened rather than left slack, since a ratchet that only ever loosens
  // stops being one. 421 → 428 for the three new south-end rooms.
  // 419 → 451, a big move for one room: splitting second_rd_c's two jobs gives
  // the walk another node to fan out from in the middle of Second Road.
  { mode: "expat", seeds: [1, 2, 3, 4, 5], nights: 4, ceiling: 456 },
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

// ── the blind spot gets soaked too ──────────────────────────────────────────
// The walker's centre of gravity leaves most of the map unentered: one run
// stands in 11-16% of the rooms, and the union of every seeded run across all
// four modes reaches 68%. Which means the invariant suite has never once
// entered Pratumnak, Tree Town, Myth Night or the Darkside — districts a month
// old — and "failures 0" was silent about all of them.
//
// Fixed by STARTING somewhere rather than by making the walker roam, because
// every de ceiling above is calibrated against the current movement policy and
// changing it would re-roll all four. --start is additive: the default walk is
// untouched, and seeding runs inside the blind spot lifts union coverage from
// 63% to 89%. What remains is mostly gated by design (oy_office needs the door
// trick, orchid_room needs WDG standing) — a random walker SHOULD NOT reach
// those.
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
      const real = r.warns.filter(w => w.kind !== "langleak");
      assert.deepEqual(real, [], `${start} seed ${seed} warned: ` + JSON.stringify(real[0] || {}));
    }
  });
}
