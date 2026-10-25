// GATES (engine-core) is every G.pendingChoice prompt in one table — the architecture review of 2026-10-25, finding 5.
// A prompt is wired five ways, and a missing surface used to be found by a persona (or the modal audit, after the fact).
// This fails when a prompt the source raises is not in GATES, or lacks its answer, redraw, chips, completion or audit
// recipe — so the five surfaces are checked when the prompt is written. GATES' `carry` is what _endNight keeps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const files = ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"];
const srcs = {};
for (const f of files) { srcs[f] = readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"); vm.runInThisContext(srcs[f], { filename: f + ".js" }); }
const all = Object.values(srcs).join("\n");
const audit = readFileSync(fileURLToPath(new URL("../../tools/modal-audit.mjs", import.meta.url)), "utf8");

test("every prompt the source raises is in GATES, and every GATES entry is raised somewhere", () => {
  const raised = [...new Set([...all.matchAll(/pendingChoice = "([a-z0-9_]+)"/g)].map(m => m[1]))];
  assert.deepEqual(raised.filter(g => !GATES[g]), [], "add these to GATES in engine-core");
  assert.deepEqual(Object.keys(GATES).filter(g => !raised.includes(g)), [], "GATES lists a prompt nothing raises");
});

test("every prompt is wired five ways: answer, redraw, chips, completion, and an audit recipe", () => {
  const surfaces = { "its answer (_doCommandInner)": _doCommandInner.toString(), "its redraw (_renderResume)": _renderResume.toString(),
    "its chips (_chipSet)": _chipSet.toString(), "its completion (engineComplete)": engineComplete.toString() };
  const gaps = [];
  for (const g of Object.keys(GATES)) {
    for (const [what, src] of Object.entries(surfaces)) if (!src.includes(`"${g}"`)) gaps.push(`${g}: ${what}`);
    if (!audit.includes(g)) gaps.push(`${g}: a recipe in tools/modal-audit.mjs`);
  }
  assert.deepEqual(gaps, []);
});

test("the night keeps only the prompts GATES says carry", () => {
  engineInit(() => {});
  for (const [g, def] of Object.entries(GATES)) {
    newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
    G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation"; G.day = 3; G.room = "hotel_room";
    G.pendingChoice = g; _endNight("sleep");
    if (!def.carry) assert.notEqual(G.pendingChoice, g, `${g} survived the night`);
  }
});
