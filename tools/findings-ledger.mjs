// The persona-findings ledger — what the personas CLAIMED and what came of it.
//
//   node tools/findings-ledger.mjs --stats            # by verdict, persona, model, lens
//   node tools/findings-ledger.mjs --round 53         # every row of one round
//   node tools/findings-ledger.mjs --verdict refuted  # every row with one verdict
//
// Two sources, merged: docs/persona-findings.json (hand-written at triage, one
// row per finding with a verdict — the only place a REFUTED or DESIGN finding is
// recorded), and the pinned tests (tests/js/round*.test.js, playtest*.test.js),
// each of whose test titles IS a fixed finding. Rounds before 51 are test-only:
// their refuted/design verdicts were written into commit bodies and the
// persona memory and were never data (the gap this file closes, 2026-09-26).
import fs from "node:fs";
import path from "node:path";
const root = new URL("..", import.meta.url).pathname;
const ledger = JSON.parse(fs.readFileSync(path.join(root, "docs/persona-findings.json"), "utf8"));
const rows = ledger.rows;
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i === -1 ? null : args[i + 1]; };

// pinned tests: round number → titles
const pins = {};
for (const f of fs.readdirSync(path.join(root, "tests/js")).filter(f => /^(round|playtest)\d+\.test\.js$/.test(f))) {
  const key = f.replace(/\.test\.js$/, "");
  const src = fs.readFileSync(path.join(root, "tests/js", f), "utf8");
  pins[key] = [...src.matchAll(/^test\("([^"]+)"/gm)].map(m => m[1]);
}

const count = (xs, k) => xs.reduce((a, r) => (a[k(r)] = (a[k(r)] || 0) + 1, a), {});
const show = (title, obj) => { console.log(`\n${title}`); for (const [k, v] of Object.entries(obj).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`); };

if (opt("--round")) {
  const r = String(opt("--round"));
  for (const x of rows.filter(x => x.round === r)) console.log(`[${x.verdict.padEnd(8)}] ${x.persona} (${x.model}, ${x.lens}): ${x.claim}${x.note ? "  — " + x.note : ""}`);
  const key = "round" + r; if (pins[key]) { console.log(`\npinned in ${key}.test.js: ${pins[key].length} tests`); for (const t of pins[key]) console.log("  · " + t); }
  process.exit(0);
}
if (opt("--verdict")) {
  for (const x of rows.filter(x => x.verdict === opt("--verdict"))) console.log(`r${x.round} ${x.persona} (${x.model}, ${x.lens}): ${x.claim}${x.note ? "  — " + x.note : ""}`);
  process.exit(0);
}
console.log(`── persona findings ledger ──  ${rows.length} rows with a verdict (rounds ${[...new Set(rows.map(r => r.round))].join(", ")})`);
show("by verdict", count(rows, r => r.verdict));
show("by persona", count(rows, r => `${r.persona} (${r.model}, ${r.lens})`));
const models = count(rows, r => r.model);
console.log("\nby model — rows, and how many the game could not reproduce or was right about (refuted)");
for (const m of Object.keys(models)) {
  const mine = rows.filter(r => r.model === m), ref = mine.filter(r => r.verdict === "refuted").length;
  console.log(`  ${m.padEnd(7)} ${String(mine.length).padStart(3)} rows · ${ref} refuted (${Math.round(100 * ref / mine.length)}%) · ${mine.filter(r => r.verdict === "fixed").length} fixed`);
}
show("by lens", count(rows, r => r.lens));
const total = Object.values(pins).reduce((a, x) => a + x.length, 0);
console.log(`\npinned tests (fixed findings, every round): ${total} across ${Object.keys(pins).length} files — the fixed half of rounds before 51 lives only here`);
console.log("  · a refuted or design verdict before round 51 is in the commit body or the persona memory, not in data");
