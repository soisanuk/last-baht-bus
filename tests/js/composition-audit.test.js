// The composition audit is gated here (2026-10-08). Class A of the persona-findings ledger —
// COMPOSITION, two systems live at once and one of them forgetting the other — ranked as the
// worst-covered severe class (`node tools/findings-ledger.mjs --aim`: 71 findings, 17% severe,
// 7% instrumented); rounds 66, 70 and 71 found its defects by hand. tools/composition-audit.mjs
// arms STATES through the game's own paths (a companion out on the party barfine, your own bar,
// the staff affair, I DON'T DRINK, a verdict of face-loss, her pending question, a lock-in, a
// downpour, Act One, a pushy rail, an empty pocket), plays the verbs the engine offers in each
// (the chip bar, the wheel's actions for every woman in play, the bar handful, two arrivals) alone
// and in every pair, and checks each live state's invariants by state change wherever state can
// tell. tests/js/predicates.test.js is the static half; this is the dynamic one.
//
// Every finding must be on the tool's COMP_OPEN (a real defect, with the file and function where
// the fix belongs) or COMP_OK (benign, with a reason). A NEW finding fails here; a fixed one stops
// reproducing and the test asks for its COMP_OPEN row to be deleted, so the list cannot rot.
//
// Considered and dropped as too noisy (so nobody rebuilds them): a "no สนุก change" invariant on
// the verdict for purchases and photos (a lady drink and a first portrait pay their own +1 whoever
// she is — the verdict is about HER warmth, so the check is limited to the verbs that ask for it);
// pair-env controls as a FILTER (the companion alone at the pushy bar is the composition, and
// filtering on it hid the padding finding — the control now only annotates); a broad "customer
// register" regex (any "buy me", any "drink") — the pitch list is five whole phrases quoted from
// the engine; a "her drinks moved the till" check at your own bar (the money audit owns the till).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/composition-audit.mjs", import.meta.url));
const run = (...flags) => {
  let raw;
  try { raw = execFileSync(process.execPath, [TOOL, "--json", ...flags], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { raw = String(e.stdout || ""); if (!raw.trim()) throw e; }   // exit 1 on a new finding — the JSON is still on stdout
  return JSON.parse(raw);
};

test("composition audit: every finding is a known open defect or a benign one, and the audit did work", () => {
  const r = run();
  // an instrument that does no work reports no findings (afford-audit's lesson)
  assert.ok(r.stats.solos >= 10, `only ${r.stats.solos} states armed alone`);
  assert.ok(r.stats.pairs >= 30, `only ${r.stats.pairs} pairs armed — a recipe stopped taking`);
  assert.ok(r.stats.plays >= 2000, `only ${r.stats.plays} plays`);
  // the pairs the recipes refuse are the ones the game refuses; a NEW unreachable pair means a recipe broke
  const refused = r.unreachable.filter(u => !/^impossible|^env clash/.test(u.why)).map(u => u.combo).sort();
  assert.deepEqual(refused, ["act1+companion", "act1+maidee", "affair+asker", "asker+ownbar"],
    "a pair stopped arming (or started) — check the recipe, then this list");
  assert.deepEqual(r.findings.filter(f => f.inv === "threw").map(f => f.msg), [], "a verb threw under a pair of states");
  assert.deepEqual(r.unknown, [], "a NEW composition finding — fix the engine, or add it to COMP_OPEN (real, with a diagnosis) / COMP_OK (benign, with a reason)");
  assert.deepEqual(r.fixed, [], "a COMP_OPEN row no longer reproduces — the fix landed; delete the row");
});

test("composition audit goes red when a consumer forgets a state (--mutate)", () => {
  // every comp lands on the meter: a teetotal man's drink count rises
  assert.ok(run("--mutate", "teetotal", "--state", "teetotal").unknown.some(k => /\|teetotal:meter\|/.test(k)), "a comp on a sober man went unseen");
  // the heat book forgets whose bar it is
  assert.ok(run("--mutate", "ownbar", "--state", "ownbar").unknown.some(k => /\|ownbar:heat\|/.test(k)), "heat at your own bar went unseen");
  // the jilt loop counts the woman on your arm
  assert.ok(run("--mutate", "companion", "--state", "companion").unknown.some(k => /\|companion:bond\|/.test(k)), "a companion's bond docked went unseen");
});
