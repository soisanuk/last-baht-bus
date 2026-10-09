#!/usr/bin/env node
// HAPPINESS audit — the สนุก meter moves by what it says, pays a free act once, and charges a loss.
//
//   node tools/happiness-audit.mjs            # every scene, the findings and a summary line
//   node tools/happiness-audit.mjs --quick    # the fast subset (what tests/js/happiness-audit.test.js gates)
//   node tools/happiness-audit.mjs --json     # machine-readable
//   node tools/happiness-audit.mjs --verbose  # each verb's per-repeat payouts
//   node tools/happiness-audit.mjs --mutate floor|loss   # break a cap or a loss: the audit must go red
//
// WHY THIS EXISTS. Class E of the persona-findings ledger (economy) had 93 findings and 3%
// instrument coverage, and the lens that produced most of them was the happiness ledger: a
// persona reading the meter before and after every command. Round 75's Pete found SING paying
// +2 a turn forever ("a lad with a microphone outscores a man who held a woman's hand on a hill
// at three in the morning, ten to one") and losing a her-farang regular for good costing nothing.
// Both are mechanical, so both belong to an instrument, not to the next persona.
//
// THE VERBS COME FROM THE ENGINE (CLAUDE.md: derive an instrument's reach, never hand-list it):
// every argument-free entry of _COMPLETE_VERBS, plus the social verbs aimed at each person present
// (flirt, kiss, dance with, photo, wai, cheers, pet). A verb that moves you, ends the night or
// raises a prompt is not a stay-verb and is skipped after its first play; a handful that end the
// session are never typed.
//
// THE INVARIANTS (each verb played REPS times in one room, one night, from a fresh snapshot):
//   H1 the printed figure — every change to G.happy on a command equals the sum of the
//      "(±N สนุก …)" figures that command printed. A silent move of the meter fails here.
//   H2 a free act pays once — if repeats 2..REPS cost nothing and still pay สนุก, that is a farm.
//      Paid acts (a beer, the bell, a tip) are left to their own tapers and the money audit.
//   H3 a permanent loss is priced and named — the verdict on a her-farang regular, the end of the
//      affair and losing the bar each lower the meter AND print a reason with the figure.
//
// Findings are keyed scene:verb:inv. HAPPY_OPEN lists real defects not yet fixed (with a
// diagnosis), HAPPY_OK benign ones (with a reason); the gate fails on anything else, and on a
// listed row that no longer reproduces (delete it — the fix landed).
import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const argv = process.argv.slice(2);
const QUICK = argv.includes("--quick"), JSON_OUT = argv.includes("--json"), VERBOSE = argv.includes("--verbose");
const MUTATE = argv.includes("--mutate") ? argv[argv.indexOf("--mutate") + 1] : null;
const REPS = 6;

let out = [];
engineInit(t => out.push(String(t)), null, () => {});

if (MUTATE === "floor") globalThis._floorJoy = n => { _addHappy(n); return true; };   // the cap forgotten
if (MUTATE === "loss") { const real = _maiDeeScene; globalThis._maiDeeScene = here => { const h = G.happy; real(here); G.happy = h; }; }

// ── the lists ──────────────────────────────────────────────────────────────────
const HAPPY_OPEN = {
  // "scene:verb:inv": "diagnosis — fix site"
};
const HAPPY_OK = {
  // "scene:verb:inv": "why it is benign"
};
const NEVER = new Set(["restart", "quit", "reset", "end", "logout", "load", "save", "undo", "sleep", "again", "unsubscribe", "break sim", "work"]);

// ── the scenes ─────────────────────────────────────────────────────────────────
const base = () => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.flags.act1Done = true; G.flags.hasWallet = true;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.lastSaleng = 99999; G.peddlerNight = 9; G.money = 20000; G.bank = 20000; G.battery = 100;
  G.hunger = 10; G.thirst = 10; G.season0 = 10; G.nightTurn = 40; G.happy = 20;
};
const SCENES = [
  { id: "bandbar", quick: true, set() { G.day = 5; G.room = "lucky_tiger"; } },
  { id: "beerbar", quick: true, set() { G.room = "stinky_bar"; } },
  { id: "beach", quick: true, set() { G.room = "jomtien_beach"; } },
  { id: "poolroom", quick: true, set() { G.hotel = "areca"; G.room = _hotelRoomId(); } },
  { id: "gogo", set() { G.room = "tequila_queen"; } },
  { id: "pub", set() { G.room = "queen_vic"; } },
  { id: "qvroom", set() { G.hotel = "queenvic"; G.room = _hotelRoomId(); } },
  { id: "street", set() { G.room = "beach_rd_c"; } },
];

// ── the figures printed ───────────────────────────────────────────────────────
const printed = lines => lines.reduce((s, l) => {
  for (const m of String(l).matchAll(/\(([+-]\d+) สนุก/g)) s += Number(m[1]);
  return s;
}, 0);
const reasoned = lines => lines.some(l => /\([+-]\d+ สนุก — [^)]+\)/.test(String(l)));

const findings = [];
const add = (key, inv, msg) => findings.push({ key, inv, msg });
const stats = { scenes: 0, verbs: 0, plays: 0, losses: 0 };

function stayed(room, day) {
  return G.room === room && G.day === day && !G.pendingChoice && !G.pendingEnc && !G.game && !G.pendingBf && !G.pendingFare;
}
function play(cmd) {
  out = [];
  const h0 = G.happy, m0 = G.money + G.bank;
  try { doCommand(cmd); } catch (e) { return { err: String(e && e.message || e) }; }
  stats.plays++;
  return { dh: G.happy - h0, dm: (G.money + G.bank) - m0, fig: printed(out), lines: out.slice() };
}

for (const sc of SCENES) {
  if (QUICK && !sc.quick) continue;
  base(); sc.set();
  const snap = serializeGame();
  stats.scenes++;
  const people = _npcsHere();
  const verbs = _COMPLETE_VERBS.filter(v => !NEVER.has(v));
  for (const id of people) {
    const nm = NPCS[id].name.toLowerCase();
    verbs.push(`flirt ${nm}`, `kiss ${nm}`, `dance with ${nm}`, `photo ${nm}`, `wai ${nm}`, `cheers ${nm}`);
  }
  if (sc.id === "beach") verbs.push("pet cats");
  for (const v of verbs) {
    newGame(); deserializeGame(snap);
    const room = G.room, day = G.day;
    const reps = [];
    for (let i = 0; i < REPS; i++) {
      const r = play(v);
      if (r.err) { add(`${sc.id}:${v}:ERROR`, "ERROR", r.err); break; }
      reps.push(r);
      // H1: the meter moved by what was printed
      if (r.dh !== r.fig) add(`${sc.id}:${v}:H1`, "H1", `moved ${r.dh}, printed ${r.fig}`);
      if (!stayed(room, day)) break;
    }
    stats.verbs++;
    if (VERBOSE && reps.some(r => r.dh)) console.log(`${sc.id} · ${v}: ${reps.map(r => (r.dh > 0 ? "+" : "") + r.dh + (r.dm ? `/฿${r.dm}` : "")).join(" ")}`);
    // H2: repeats that cost nothing and still pay
    const later = reps.slice(1);
    if (later.length >= 2 && later.every(r => r.dm === 0) && later.reduce((s, r) => s + Math.max(0, r.dh), 0) > 0)
      add(`${sc.id}:${v}:H2`, "H2", `repeats paid ${later.map(r => r.dh).join(",")} for nothing`);
  }
}

// H3: the losses — each must lower the meter and name why
const LOSSES = [
  { id: "maidee", run() { G.room = _npcRoom("lek"); G.soc.drinks.lek = 14; _maiDeeScene(["lek"]); } },
  { id: "affairbreak", run() {
      G.stage = "expat"; G.bar.room = "stinky_bar"; G.flags.barOpen = true;
      G.affair = { id: "manow", day: G.day - 70, strain: 12, floorSour: 0 }; _affairEnd("break"); } },
  { id: "barlost", run() { G.stage = "expat"; G.bar.room = "stinky_bar"; G.flags.barOpen = true; G.flags.barPaid = true; _barLost("landlord"); } },
];
for (const L of LOSSES) {
  base(); out = []; const h0 = G.happy;
  try { L.run(); } catch (e) { add(`loss:${L.id}:ERROR`, "ERROR", String(e && e.message || e)); continue; }
  stats.losses++;
  if (!(G.happy < h0)) add(`loss:${L.id}:H3`, "H3", "a permanent loss moved nothing on the meter");
  else if (!reasoned(out)) add(`loss:${L.id}:H3why`, "H3", "the loss is charged without a reason beside the figure");
}

// ── report ─────────────────────────────────────────────────────────────────────
const seen = new Set(findings.map(f => f.key));
const unknown = [...seen].filter(k => !(k in HAPPY_OPEN) && !(k in HAPPY_OK));
const fixed = Object.keys(HAPPY_OPEN).filter(k => !seen.has(k) && (!QUICK || SCENES.find(s => s.id === k.split(":")[0] && s.quick) || k.startsWith("loss:")));
if (JSON_OUT) { console.log(JSON.stringify({ stats, findings, unknown, fixed })); process.exit(0); }
for (const f of findings) console.log(`${f.key in HAPPY_OPEN ? "·" : f.key in HAPPY_OK ? "○" : "✗"} ${f.key}  ${f.msg}`);
if (fixed.length) console.log(`\nno longer reproduce (delete from HAPPY_OPEN): ${fixed.join(", ")}`);
console.log(`\nhappiness-audit: ${stats.scenes} scenes · ${stats.verbs} verbs · ${stats.plays} plays · ${stats.losses} losses · ${unknown.length} new finding(s)`);
