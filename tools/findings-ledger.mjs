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
// the classification (docs/persona-findings-classes.json), joined by claim text;
// a row written at triage may carry cls/sev/instrument itself and wins
let classes = {};
try { classes = JSON.parse(fs.readFileSync(path.join(root, "docs/persona-findings-classes.json"), "utf8")).byClaim; } catch (e) {}
for (const r of all) { const c = classes[r.claim]; if (c) for (const k of ["cls", "cls2", "instrument", "why_none", "between", "sev", "conf"]) if (r[k] == null) r[k] = c[k]; }
const NAMES = { A: "composition", B: "absence", C: "reachability", D: "promise", E: "economy", F: "state-blind prose", G: "modal/input", H: "cross-surface",
  I: "edge-blind", J: "return-channel", K: "clock-in-prose", L: "wrong predicate", M: "one template", N: "town can't say", P: "parser/vocab", Q: "repetition",
  R: "world-claim", S: "save/reload", X: "design pin" };

const count = (xs, k) => xs.reduce((a, r) => (a[k(r)] = (a[k(r)] || 0) + 1, a), {});
const show = (title, obj) => { console.log(`\n${title}`); for (const [k, v] of Object.entries(obj).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`); };

if (opt("--round")) {
  const r = String(opt("--round"));
  for (const x of all.filter(x => x.round === r)) console.log(`[${x.verdict.padEnd(8)}] ${x.persona} (${x.model}, ${x.lens}): ${x.claim}${x.note ? "  — " + x.note : ""}`);
  const key = "round" + r; if (pins[key]) { console.log(`\npinned in ${key}.test.js: ${pins[key].length} tests`); for (const t of pins[key]) console.log("  · " + t); }
  process.exit(0);
}
if (args.includes("--aim")) {
  // WHERE TO POINT THE NEXT PERSONA: the classes that are severe AND that no instrument
  // sees, with the lenses that have produced them (docs/persona-findings-ledger-analysis.md §4)
  const fx = all.filter(r => r.verdict === "fixed" && r.cls && r.cls !== "X");
  console.log("── aim ──  severe share and instrument coverage by class, with the lenses that found each");
  const byC = {};
  for (const r of fx) { const c = byC[r.cls] = byC[r.cls] || { n: 0, sev: 0, inst: 0, lens: {} }; c.n++; if (/severe|blocking/.test(r.sev)) c.sev++; if (r.instrument && r.instrument !== "none") c.inst++; if (r.lens) c.lens[r.lens] = (c.lens[r.lens] || 0) + 1; }
  const rank = Object.entries(byC).sort((a, b) => (b[1].sev / b[1].n - b[1].inst / b[1].n) - (a[1].sev / a[1].n - a[1].inst / a[1].n));
  for (const [c, v] of rank) {
    const top = Object.entries(v.lens).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l, n]) => `${l}×${n}`).join(" ");
    console.log(`  ${c} ${NAMES[c].padEnd(18)} n=${String(v.n).padStart(3)}  severe ${String(Math.round(100 * v.sev / v.n)).padStart(3)}%  instrument ${String(Math.round(100 * v.inst / v.n)).padStart(3)}%   ${top}`);
  }
  console.log("\n  a class high on severe and low on instrument is where a persona still earns its keep;");
  console.log("  the lenses listed are the ones that have produced it — pick one of those, or a new lens with the same shape");
  process.exit(0);
}
if (opt("--verdict")) {
  for (const x of all.filter(x => x.verdict === opt("--verdict"))) console.log(`r${x.round} ${x.persona} (${x.model}, ${x.lens}): ${x.claim}${x.note ? "  — " + x.note : ""}`);
  process.exit(0);
}
console.log(`── persona findings ledger ──  ${all.length} rows: ${rows.length} written at triage (rounds ${[...new Set(rows.map(r => r.round))].join(", ")}) + ${derived.length} fixed findings derived from the pinned tests`);
console.log(`   attributed to a persona: ${all.filter(r => r.persona).length} · to a round only: ${all.filter(r => !r.persona).length} · with a model: ${all.filter(r => r.model).length}`);
show("by verdict", count(all, r => r.verdict));
const cl = all.filter(r => r.cls);
if (cl.length) {
  show("by class (classified fixed findings)", Object.fromEntries(Object.entries(count(cl.filter(r => r.cls !== "X"), r => `${r.cls} ${NAMES[r.cls]}`))));
  show("by severity", count(cl.filter(r => r.cls !== "X"), r => r.sev || "?"));
  show("instrument that could have caught it", count(cl.filter(r => r.cls !== "X"), r => r.instrument || "?"));
  console.log(`\n  design/doctrine pins counted as fixed rows (class X): ${cl.filter(r => r.cls === "X").length} — not findings; excluded above`);
}
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
