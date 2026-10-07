#!/usr/bin/env node
// GO-GO AUDIT (2026-10-07). Mario: "most go-gos have 2-3 kinds of seating — the stage-side seats
// (you are strongly encouraged to tip there), the benches along the walls with small tables, and a VIP
// area or gallery. There is almost never a traditional bar that you belly up to." The women dance, sit
// with customers, work the door, or are on a break.
//
// A static scan cannot say which of the engine's ~550 bar-furniture lines can print INSIDE a go-go, so
// this plays them: every go-go, a battery of the verbs a man uses there, at several hours, bond tiers
// and dice seeds, and flags every printed line that seats anybody at a bar, on a stool or at the rail.
// Judged by what PRINTED, the way afford-audit judges by state, so a pool, an inline line and a
// generated woman's stored line are all caught the same way.
//
//   node tools/gogo-audit.mjs            report (exit 1 on findings)
//   node tools/gogo-audit.mjs --json     machine-readable
//   --quick                              one hour, two bond tiers: the test's gate (the full run is ~1 min)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(ROOT + "web/js/" + f + ".js", "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));

// what may NOT print in a go-go: the same shape the engine's own _FIT_GOGO filter skips
const RX = _FIT_GOGO;
const GOGO = Object.keys(ROOMS).filter(r => ROOMS[r].barType === "gogo");
const TOPICS = ["", "family", "home", "plan", "price", "wallet", "late", "free", "salary", "quota", "number", "drink", "bar", "here", "work", "mamasan", "girls", "money"];
const VERBS = id => [`talk to ${id}`, ...TOPICS.slice(1).map(t => `ask ${id} about ${t}`), `buy ${id} a drink`, `flirt with ${id}`, `kiss ${id}`, `spank ${id}`, `fondle ${id}`, `tip ${id} 100`, `examine ${id}`, `photo ${id}`, `contact ${id}`, `barfine ${id}`, "no"];
const ROOMVERBS = ["look", "buy beer", "buy water", "ring bell", "sit", "dance", "listen", "smell", "wait 3", "wait 30", "examine stage", "examine seat", "examine floor", "examine bar", "tao rai", "time", "throw cover", "go up"];

const findings = new Map();   // line → {room, cmd}
// only what printed while you were still inside the go-go, on the same night
const keep = (room, cmd, day) => {
  if (G.room !== room || (day != null && G.day !== day)) { out = []; return; }
  for (const t of out) for (const sentence of t.split(/(?<=[.!?”"])\s+/)) {
    if (!RX.test(sentence)) continue;
    const k = sentence.trim().slice(0, 220);
    if (!findings.has(k)) findings.set(k, { room, cmd });
  }
  out = [];
};

function fresh(seed, turn) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 50000; G.bank = 100000; G.nightTurn = turn;
  G.rng = seed; out = [];
}
for (const room of GOGO) {
  const QUICK = process.argv.includes("--quick");
  for (const [seed, turn] of QUICK ? [[31337, 75]] : [[11, 25], [31337, 75]]) {
    fresh(seed, turn);
    G.room = room; out = []; _describeRoom(true); keep(room, "(arrive)");
    for (const c of ROOMVERBS) { const day = G.day; try { doCommand(c); } catch (e) { out.push("THREW " + e.message); } keep(room, c, day); if (G.room !== room) { G.room = room; out = []; } }
    const people = (typeof _npcsHere === "function" ? _npcsHere() : []).filter(id => !NPCS[id].patron || true);
    for (const id of people) {
      for (const tier of QUICK ? [0, 14] : [0, 9, 14]) {
        G.soc.drinks[id] = tier; G.talked = {}; G.pendingBf = null; G.pendingEnc = null; G.pendingChoice = null; G.game = null;
        for (const c of VERBS(id)) { const day = G.day; try { doCommand(c); } catch (e) { out.push("THREW " + e.message); } keep(room, c + " [tier " + tier + "]", day); if (G.room !== room || G.day !== day) { G.room = room; G.nightTurn = turn; out = []; } }
      }
    }
  }
}
const rows = [...findings].map(([line, w]) => ({ line, ...w }));
if (process.argv.includes("--json")) { console.log(JSON.stringify(rows)); process.exit(0); }
for (const r of rows) console.log(`[${r.room}] ${r.cmd}\n    ${r.line}`);
console.log(rows.length ? `\n${rows.length} lines seat somebody at a bar inside a go-go.` : "Nobody leans on a bar in a go-go.");
process.exit(rows.length ? 1 : 0);
