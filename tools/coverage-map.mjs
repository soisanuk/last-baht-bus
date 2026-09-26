// The coverage MAP — systems × defect classes, to aim persona testing methodically.
//
//   node tools/coverage-map.mjs              # the matrix
//   node tools/coverage-map.mjs --dark       # dark cells ranked: no finding, no instrument, by severity prior
//   node tools/coverage-map.mjs --hot        # cells still producing findings in the last two rounds
//   node tools/coverage-map.mjs --numbers    # the scalar summary (dark / instrumented / hot / walked)
//   node tools/coverage-map.mjs --record     # …and append it, dated, to docs/coverage-map-history.json
//   node tools/coverage-map.mjs --system X   # one row in full
//
// ROWS are the game's systems (docs/systems.json — hand-grouped, but every soak
// EFFECTS id, pendingChoice modal, QUESTS id and ENCOUNTERS id must belong to one,
// and the tool lists the strays). COLUMNS are the defect classes A–S
// (docs/persona-findings-ledger-analysis.md §1). A CELL is lit by:
//   n   findings fixed in that system of that class (the ledger + its classification)
//   *   …and still arriving: at least one in the last two rounds (HOT)
//   ■   an instrument covers that class for that system, no finding yet
//   ·   DARK: nobody has found anything there and nothing mechanical looks
// The coverage union measures REACH (rooms, people, verbs); this measures where
// defects have been looked for, which the analysis showed is nearly orthogonal.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root = new URL("..", import.meta.url).pathname;
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i === -1 ? null : args[i + 1]; };

const SYS = J("docs/systems.json").systems;
const CLASSES = "ABCDEFGHIJKLMNPQRS".split("");
const NAMES = { A: "composition", B: "absence", C: "reachability", D: "promise", E: "economy", F: "state-blind", G: "modal", H: "cross-surface",
  I: "edge-blind", J: "return-channel", K: "clock", L: "predicate", M: "template", N: "town-can't-say", P: "parser", Q: "repetition", R: "world-claim", S: "save/reload" };
// severity prior per class: the severe+blocking share measured 2026-09-27 (analysis §1)
const SEV = { S: .24, C: .21, A: .17, I: .14, G: .15, B: .12, E: .12, J: .11, H: .11, R: .10, L: .04, D: .04, F: .03, P: .02, Q: 0, N: 0, M: 0, K: 0 };
// which classes an instrument covers, and for which systems (empty = every system)
const INSTRUMENTS = [
  { name: "promises/afford/asktopic/errand/examine", cls: ["D"] },
  { name: "askable-audit", cls: ["N"], systems: ["drinks", "calendar", "hotels", "barfine", "bell", "regulars"] },
  { name: "references.test", cls: ["K", "R"] },
  { name: "templates.test", cls: ["L", "M", "K"] },
  { name: "predicates.test", cls: ["I"], systems: ["party", "nightride", "affair", "barchain", "barbooks"] },
  { name: "dialogue-lifecycle", cls: ["J"], systems: ["quests", "conversation", "barchain", "heist", "act1"] },
  { name: "soak liveness", cls: ["B"], systems: SYS.filter(s => s.effects.length).map(s => s.id) },
  { name: "prose-corpus dossiers", cls: ["R", "F"], systems: ["worldprose", "filler", "regulars", "conversation"] },
];
const instrumented = (sys, cls) => INSTRUMENTS.filter(i => i.cls.includes(cls) && (!i.systems || i.systems.includes(sys))).map(i => i.name);
// not every class can occur in every system: a save/reload defect in the guardrails,
// a clock claim in the save layer. A cell that cannot hold a defect is blank, not dark,
// so the dark count is cells that COULD hold one. Exclusions per class.
const NA = {
  S: ["guardrails", "worldprose", "filler", "media"],
  G: s => !(s.modals.length || s.encounters.length || ["games", "bus", "motosai", "barfine", "conversation", "act1", "saveload", "presentation", "police", "quests", "phone"].includes(s.id)),
  J: s => !(s.quests.length || ["conversation", "regulars", "act1", "heist", "barchain", "phone", "orchid"].includes(s.id)),
  I: ["guardrails", "presentation", "saveload", "media", "worldprose", "identity", "calendar", "weather"],
  N: ["guardrails", "presentation", "saveload", "worldprose", "filler", "identity", "happiness", "vacation"],
  E: s => !["money", "drinks", "ladydrinks", "bell", "barfine", "party", "nightride", "cons", "hotels", "food", "saleng", "massage", "loans", "barchain", "barbooks", "procurement", "bus", "motosai", "games", "encounters", "happiness", "act1", "vacation", "heist", "phone", "thai", "clinic", "social", "sobriety", "affair", "cream"].includes(s.id),
  K: ["guardrails", "saveload", "presentation", "identity"],
  C: ["guardrails", "saveload", "presentation", "filler", "happiness"],
  R: ["saveload", "presentation"],
  P: ["guardrails", "filler", "happiness", "weather"],
  M: ["saveload", "presentation", "guardrails", "money", "clock"],
};
const applies = (s, cls) => { const r = NA[cls]; if (!r) return true; return typeof r === "function" ? !r(s) : !r.includes(s.id); };

// ── the ledger, with its classification and system tags joined by claim ──────
const ledger = J("docs/persona-findings.json").rows;
let classes = {}, systems = {};
try { classes = J("docs/persona-findings-classes.json").byClaim; } catch (e) {}
try { systems = J("docs/persona-findings-systems.json").byClaim; } catch (e) {}
const roundsTab = J("docs/persona-rounds.json").rounds;
const handPinned = new Set(ledger.map(r => r.pin).filter(p => /\.test\.js$/.test(p)).map(p => p.replace(/\.test\.js$/, "")));
const rows = ledger.map(r => ({ ...r }));
for (const f of fs.readdirSync(path.join(root, "tests/js")).filter(f => /^(round|playtest)\d+\.test\.js$/.test(f))) {
  const key = f.replace(/\.test\.js$/, "");
  if (handPinned.has(key)) continue;
  const src = fs.readFileSync(path.join(root, "tests/js", f), "utf8");
  const tab = roundsTab[key] || { personas: [] }, round = key.replace(/^round|^playtest/, "");
  for (const m of src.matchAll(/^test\("([^"]+)"/gm)) {
    const t = m[1], a = t.match(/\(([A-Z][a-z]+(?:-[A-Z][a-z]+)?)(?:[,/) ]|$)/);
    let who = a && tab.personas.find(p => p.name.toLowerCase() === a[1].toLowerCase());
    if (!who && tab.personas.length === 1) who = tab.personas[0];
    rows.push({ round, persona: who ? who.name : "", model: who ? who.model : "", lens: who ? who.lens : "", claim: t, verdict: "fixed", pin: f, source: "test" });
  }
}
for (const r of rows) {
  const key = classes[r.claim] ? r.claim : r.claim + (r.note ? "  — " + r.note : "");   // a triage row was classified as "claim  — note"
  const c = classes[key] || {}, s = systems[key] || {};
  for (const k of ["cls", "sev", "instrument", "between"]) if (r[k] == null && c[k] != null) r[k] = c[k];
  if (r.system == null && s.system) { r.system = s.system; r.system2 = s.system2 || ""; }
}
const fixed = rows.filter(r => r.verdict === "fixed" && r.cls && r.cls !== "X");
const roundNum = r => parseInt(String(r.round).replace(/\D/g, ""), 10) || 0;
const latest = Math.max(...fixed.map(roundNum));
const HOT_FROM = latest - 1;   // a finding in the last two rounds keeps the cell hot

// ── the guard: every derived atom belongs to a system ────────────────────────
const strays = [];
{
  const owned = k => new Set(SYS.flatMap(s => s[k]));
  const soak = fs.readFileSync(path.join(root, "tools/soak.mjs"), "utf8");
  for (const m of soak.matchAll(/id: "([a-z0-9_.]+)"/g)) if (!owned("effects").has(m[1])) strays.push("effect " + m[1]);
  const eng = ["core", "encounters", "play", "systems", "parser"].map(f => fs.readFileSync(path.join(root, `web/js/engine-${f}.js`), "utf8")).join("\n");
  for (const m of new Set([...eng.matchAll(/pendingChoice = "([a-z_0-9]+)"/g)].map(x => x[1]))) if (!owned("modals").has(m)) strays.push("modal " + m);
  const ctx = {}; vm.createContext(ctx);
  for (const f of ["thai", "world"]) vm.runInContext(fs.readFileSync(path.join(root, `web/js/${f}.js`), "utf8"), ctx);
  const W = vm.runInContext("({ QUESTS, ENCOUNTERS, ROOMS, NPCS })", ctx);   // top-level consts are lexical, not on the context object
  for (const q of Object.keys(W.QUESTS)) if (!owned("quests").has(q)) strays.push("quest " + q);
  for (const e of Object.keys(W.ENCOUNTERS)) if (!owned("encounters").has(e)) strays.push("encounter " + e);
  for (const s of SYS) for (const k of ["rooms", "npcs"]) for (const id of s[k]) if (!(k === "rooms" ? W.ROOMS : W.NPCS)[id]) strays.push(`${s.id}: unknown ${k.slice(0, -1)} ${id}`);
}

// ── walked: a persona whose coverage record touched the system's atoms ──────
const walked = {};
for (const f of fs.readdirSync(path.join(root, "docs/coverage")).filter(f => /^persona-.*\.json$/.test(f))) {
  const d = J("docs/coverage/" + f), who = f.slice(8, -5).split("-")[0];
  for (const s of SYS) {
    const hit = s.verbs.some(v => (d.verbs || []).includes(v)) || s.rooms.some(r => (d.rooms || []).includes(r)) || s.npcs.some(n => (d.npcs || []).includes(n));
    if (hit) (walked[s.id] = walked[s.id] || new Set()).add(who);
  }
}

// …and a persona who FILED a finding in a system has walked it, whatever their record touched
for (const r of fixed) if (r.persona) for (const s of [r.system, r.system2].filter(Boolean)) (walked[s] = walked[s] || new Set()).add(r.persona.toLowerCase());

// ── cells ────────────────────────────────────────────────────────────────────
const cell = {};
for (const r of fixed) {
  const sys = r.system || "?";
  for (const s of [sys, r.system2].filter(Boolean)) {
    const c = cell[s + "|" + r.cls] = cell[s + "|" + r.cls] || { n: 0, hot: 0, sev: 0 };
    c.n++; if (roundNum(r) >= HOT_FROM) c.hot++; if (/severe|blocking/.test(r.sev || "")) c.sev++;
  }
}
const untagged = fixed.filter(r => !r.system).length;

const glyph = (sys, k) => { const c = cell[sys.id + "|" + k]; if (c) return String(c.n).padStart(2) + (c.hot ? "*" : " "); if (!applies(sys, k)) return "   "; return instrumented(sys.id, k).length ? " ■ " : " · "; };

if (args.includes("--numbers") || args.includes("--record")) {
  let dark = 0, inst = 0, lit = 0, hot = 0, cells = 0;
  for (const s of SYS) for (const k of CLASSES) { if (!applies(s, k)) continue; cells++; const c = cell[s.id + "|" + k]; if (c) { lit++; if (c.hot) hot++; } else if (instrumented(s.id, k).length) inst++; else dark++; }
  const neverWalked = SYS.filter(s => !walked[s.id]).length;
  const d = new Date(), date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const out = { date, latestRound: latest, systems: SYS.length, cells, lit, hot, instrumented: inst, dark, systemsNeverWalked: neverWalked,
    findingsClassified: fixed.length, findingsUntagged: untagged, strays: strays.length,
    verdicts: Object.fromEntries(["fixed", "refuted", "design", "deferred"].map(v => [v, ledger.filter(r => r.verdict === v).length])) };
  console.log(JSON.stringify(out));
  if (args.includes("--record")) {
    const p = path.join(root, "docs/coverage-map-history.json");
    let h = []; try { h = J("docs/coverage-map-history.json"); } catch (e) {}
    h.push(out); fs.writeFileSync(p, JSON.stringify(h, null, 1) + "\n"); console.log(`recorded (${h.length} entries)`);
  }
  process.exit(0);
}
if (args.includes("--dark")) {
  const list = [];
  for (const s of SYS) for (const k of CLASSES) if (applies(s, k) && !cell[s.id + "|" + k] && !instrumented(s.id, k).length)
    list.push({ sys: s.id, k, prior: SEV[k], walkedBy: (walked[s.id] || new Set()).size, findings: CLASSES.reduce((a, x) => a + ((cell[s.id + "|" + x] || {}).n || 0), 0) });
  list.sort((a, b) => b.prior - a.prior || a.walkedBy - b.walkedBy || a.findings - b.findings);
  console.log(`── dark cells: ${list.length} — no finding ever, no instrument; ranked by the class's severity prior, then least-walked system ──`);
  console.log("  (a system nobody has walked is not clean, it is unexamined; 'walked' = a persona's coverage record touched its verbs/rooms/people)");
  // grouped by class: a column of dark cells is usually ONE missing instrument, not thirty persona runs
  for (const k of CLASSES) {
    const mine = list.filter(d => d.k === k); if (!mine.length) continue;
    console.log(`\n  ${k} ${NAMES[k]} — prior ${Math.round(100 * SEV[k])}% severe — ${mine.length} dark: ` + mine.map(d => d.sys + (d.walkedBy === 0 ? "°" : "")).join(" "));
  }
  console.log("\n  ° = a system no persona has walked at all");
  process.exit(0);
}
if (args.includes("--hot")) {
  console.log(`── hot cells: a finding in round ${HOT_FROM} or later ──`);
  for (const [key, c] of Object.entries(cell).filter(([, c]) => c.hot).sort((a, b) => b[1].hot - a[1].hot)) {
    const [s, k] = key.split("|"); const inst = instrumented(s, k);
    console.log(`  ${s.padEnd(13)} ${k} ${NAMES[k].padEnd(14)} ${c.hot} new of ${c.n}` + (inst.length ? `   ← an instrument covers this (${inst.join(", ")}): its list needs feeding` : ""));
  }
  process.exit(0);
}
if (opt("--system")) {
  const s = SYS.find(x => x.id === opt("--system")); if (!s) { console.log("no such system"); process.exit(1); }
  console.log(`${s.id} — ${s.name}\n  walked by: ${[...(walked[s.id] || [])].join(", ") || "nobody"}`);
  for (const k of CLASSES) { const c = cell[s.id + "|" + k], inst = instrumented(s.id, k); if (c || inst.length) console.log(`  ${k} ${NAMES[k].padEnd(14)} ${c ? c.n + " finding(s)" + (c.hot ? " (hot)" : "") : "-"}${inst.length ? "  instrument: " + inst.join(", ") : ""}`); }
  for (const r of fixed.filter(r => r.system === s.id || r.system2 === s.id)) console.log(`   · r${r.round} [${r.cls}] ${r.claim}`);
  process.exit(0);
}
// the matrix
console.log("── coverage map: systems × defect classes ──   n findings · * hot (last two rounds) · ■ instrumented, none yet · · dark");
console.log("system         " + CLASSES.map(k => " " + k + " ").join("") + "   walked  total   (blank = that class cannot occur in that system)");
for (const s of SYS) {
  const total = CLASSES.reduce((a, k) => a + ((cell[s.id + "|" + k] || {}).n || 0), 0);
  console.log(s.id.padEnd(14) + " " + CLASSES.map(k => glyph(s, k)).join("") + "   " + String((walked[s.id] || new Set()).size).padStart(4) + "   " + String(total).padStart(4));
}
console.log(`\n${fixed.length} classified findings, ${untagged} without a system tag` + (strays.length ? `\nSTRAYS (a derived atom no system owns): ${strays.join(", ")}` : "\nevery effect, modal, quest and encounter belongs to a system"));
