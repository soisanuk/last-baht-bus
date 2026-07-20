#!/usr/bin/env node
// Headless engine harness for ad-hoc feel-checks — replaces the ~8-line vm-load
// boilerplate (hand-typed 142× in a single session, and cwd-fragile because it
// used a relative "web/js/" path). Loads the full LBB engine via vm from an
// import.meta-relative path (so it works from ANY cwd — no two-repo trap), wires
// a capture buffer, exposes helpers on the global scope, then evaluates the
// snippet passed as argv[2] (or on stdin).
//
//   node tools/probe.mjs 'sandbox(); run("hint"); show()'
//   echo 'run("look"); show()' | node tools/probe.mjs
//
// In scope for your snippet:
//   G, NPCS, ROOMS, doCommand, engineComplete, newGame, _arriveAt, … — every
//   engine global (same realm the engine loads into, the trick tests/js use).
//   run(...cmds)  — doCommand each
//   out           — array of printed lines since the last show()
//   show(label?)  — print + clear the buffer (indented, newlines flattened)
//   lastOut()     — the buffer joined, for matching
//   sandbox(money=2000) — fresh game past Act One: vacation, funded, street noise off
//
// A bare newGame() at load leaves you at the Act One opening (saleng suppressed).

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
const FILES = ["thai", "world", "games", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"];
for (const f of FILES)
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

globalThis.out = [];
engineInit(t => globalThis.out.push(t), null, () => {});

globalThis.run = (...cmds) => { for (const c of cmds) doCommand(c); };
globalThis.lastOut = () => globalThis.out.join("\n");
globalThis.show = (label) => {
  if (label) console.log("== " + label + " ==");
  console.log(globalThis.out.map(l => "  " + String(l).replace(/\n/g, " ")).join("\n"));
  globalThis.out.length = 0;
};
// The common sandbox setup: past Act One, in a vacation, funded, street noise off.
globalThis.sandbox = (money = 2000) => {
  newGame();
  G.flags.act1Done = true; G.stage = "vacation"; G.money = money;
  G.lastSaleng = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  return G;
};

newGame();
G.lastSaleng = 99999;

let snippet = process.argv[2];
if (!snippet) { try { snippet = fs.readFileSync(0, "utf8"); } catch { snippet = ""; } }
if (!snippet.trim()) {
  console.log("usage: node tools/probe.mjs '<js snippet>'   " +
    "(in scope: G, run, out, show, lastOut, sandbox, and every engine global)");
  process.exit(0);
}
vm.runInThisContext(snippet, { filename: "probe-snippet" });
