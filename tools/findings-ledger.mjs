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

// pinned tests: file → titles, and each title → a derived FIXED row, attributed to
// a persona through docs/persona-rounds.json (a trailing "(Name…)" on the title,
// else the round's only persona, else the round alone)
const roundsTab = JSON.parse(fs.readFileSync(path.join(root, "docs/persona-rounds.json"), "utf8")).rounds;
const pins = {}, derived = [];
const handPinned = new Set(rows.map(r => r.pin).filter(p => /\.test\.js$/.test(p)).map(p => p.replace(/\.test\.js$/, "")));
for (const f of fs.readdirSync(path.join(root, "tests/js")).filter(f => /^(round|playtest)\d+\.test\.js$/.test(f))) {
  const key = f.replace(/\.test\.js$/, "");
  const src = fs.readFileSync(path.join(root, "tests/js", f), "utf8");
  pins[key] = [...src.matchAll(/^test\("([^"]+)"/gm)].map(m => m[1]);
  if (handPinned.has(key)) continue;   // the hand rows already carry this file's findings
  const tab = roundsTab[key] || { personas: [] };
  const round = key.replace(/^round|^playtest/, "");
  for (const title of pins[key]) {
    const m = title.match(/\(([A-Z][a-z]+(?:-[A-Z][a-z]+)?)(?:[,/) ]|$)/);
    let who = m && tab.personas.find(p => p.name.toLowerCase() === m[1].toLowerCase());
    if (!who && tab.personas.length === 1) who = tab.personas[0];
    derived.push({ round, persona: who ? who.name : "", model: who ? who.model : "", lens: who ? who.lens : "", claim: title, verdict: "fixed", note: "", pin: f, source: "test" });
  }
}
const all = rows.concat(derived);

const count = (xs, k) => xs.reduce((a, r) => (a[k(r)] = (a[k(r)] || 0) + 1, a), {});
const show = (title, obj) => { console.log(`\n${title}`); for (const [k, v] of Object.entries(obj).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`); };

if (opt("--round")) {
  const r = String(opt("--round"));
  for (const x of all.filter(x => x.round === r)) console.log(`[${x.verdict.padEnd(8)}] ${x.persona} (${x.model}, ${x.lens}): ${x.claim}${x.note ? "  — " + x.note : ""}`);
  const key = "round" + r; if (pins[key]) { console.log(`\npinned in ${key}.test.js: ${pins[key].length} tests`); for (const t of pins[key]) console.log("  · " + t); }
  process.exit(0);
}
if (opt("--verdict")) {
  for (const x of all.filter(x => x.verdict === opt("--verdict"))) console.log(`r${x.round} ${x.persona} (${x.model}, ${x.lens}): ${x.claim}${x.note ? "  — " + x.note : ""}`);
  process.exit(0);
}
console.log(`── persona findings ledger ──  ${all.length} rows: ${rows.length} written at triage (rounds ${[...new Set(rows.map(r => r.round))].join(", ")}) + ${derived.length} fixed findings derived from the pinned tests`);
console.log(`   attributed to a persona: ${all.filter(r => r.persona).length} · to a round only: ${all.filter(r => !r.persona).length} · with a model: ${all.filter(r => r.model).length}`);
show("by verdict", count(all, r => r.verdict));
show("by round (fixed findings)", count(all.filter(r => r.verdict === "fixed"), r => "r" + r.round));
show("by persona (top)", Object.fromEntries(Object.entries(count(all.filter(r => r.persona), r => `${r.persona} (${r.model || "?"}, ${r.lens || "?"})`)).sort((a, b) => b[1] - a[1]).slice(0, 25)));
const models = count(all.filter(r => r.model), r => r.model);
console.log("\nby model — rows, and how many the game could not reproduce or was right about (refuted)");
for (const m of Object.keys(models)) {
  const mine = all.filter(r => r.model === m), verd = rows.filter(r => r.model === m), ref = verd.filter(r => r.verdict === "refuted").length;
  console.log(`  ${m.padEnd(7)} ${String(mine.length).padStart(3)} rows · ${mine.filter(r => r.verdict === "fixed").length} fixed · refuted ${ref}/${verd.length} of the rows that had a triage verdict${verd.length ? " (" + Math.round(100 * ref / verd.length) + "%)" : ""}`);
}
show("by lens (top)", Object.fromEntries(Object.entries(count(all.filter(r => r.lens), r => r.lens)).sort((a, b) => b[1] - a[1]).slice(0, 20)));
const total = Object.values(pins).reduce((a, x) => a + x.length, 0);
console.log(`\npinned tests: ${total} across ${Object.keys(pins).length} files (rounds 1–18 predate the roundNN convention: their fixes are in engine.test.js and are not counted here)`);
console.log("  · a refuted or design verdict before round 51 is in the commit body or the persona memory, not in data — the refuted rate is trustworthy from round 51 on");
