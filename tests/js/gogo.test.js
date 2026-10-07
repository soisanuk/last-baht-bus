// A go-go has no bar to lean on (Mario, 2026-10-07). Seating is the front row at the stage, where a
// man is expected to tip; the benches along the walls with small tables; and a VIP area or gallery.
// The women dance, sit with customers, work the door, or are on a break. tools/gogo-audit.mjs plays
// every go-go with the verbs a man uses there and fails on any printed line that seats somebody at a
// bar, on a stool or at the rail. The engine's _FIT_GOGO filter is the mechanical half; this is the
// proof that what actually prints obeys it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("nobody leans on a bar in a go-go: every go-go, played", () => {
  let raw;
  try { raw = execFileSync(process.execPath, [fileURLToPath(new URL("../../tools/gogo-audit.mjs", import.meta.url)), "--json", "--quick"], { encoding: "utf8", maxBuffer: 1 << 26 }); }
  catch (e) { raw = String(e.stdout || ""); if (!raw.trim()) throw e; }
  const rows = JSON.parse(raw);
  assert.deepEqual(rows.map(r => `[${r.room}] ${r.cmd}: ${r.line}`), []);
});

import { readFileSync } from "node:fs";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const fresh = room => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 9000; G.nightTurn = 30; G.room = room; out = [];
};

test("SIT in a go-go takes one of its three kinds of seat — and a beer bar keeps its stools", () => {
  const seen = new Set();
  for (let k = 0; k < 12; k++) { fresh("windmill"); G.rng = 1000 + k * 7919; doCommand("sit"); seen.add(out.join(" ")); }
  const all = [...seen].join("\n");
  assert.match(all, /bench along the wall|wall bench/); assert.match(all, /tip/);
  assert.doesNotMatch(all, /stool|the rail/);
  fresh("sundowner"); doCommand("sit"); assert.match(out.join(" "), /stool|rail/, "the beer bar's own furniture");
});

test("the room's furniture word: a seat and a table in a go-go, a stool and the bar elsewhere", () => {
  fresh("windmill"); assert.equal(_seat(), "seat"); assert.equal(_ledge(), "the table");
  fresh("sundowner"); assert.equal(_seat(), "stool"); assert.equal(_ledge(), "the bar");
  // the filter skips a stool line in a go-go and leaves it alone in a bar
  const pool = ["She pats the stool.", "She pats the seat beside you."];
  fresh("windmill"); assert.deepEqual(_roomFit(pool), ["She pats the seat beside you."]);
  fresh("sundowner"); assert.equal(_roomFit(pool).length >= 1, true);
});

test("doCommand's switch has no duplicate case labels: the second one is dead code", () => {
  // SIT's location lines (stools in a bar, seats in a go-go, sand, kerb) sat under a second
  // `case "sit"` for their whole life and never printed; SNAP never reached PHOTO, KILL SIM never
  // reached the SIM, ORDER HIM never reached the demand case, SET DOWN THE BOX never reached the box.
  const src = readFileSync(fileURLToPath(new URL("../../web/js/engine-parser.js", import.meta.url)), "utf8");
  const body = src.slice(src.indexOf("function doCommand("), src.indexOf("\nfunction _doFollow("));
  const seen = new Set(), dup = [];
  for (const m of body.matchAll(/case ("[^"]+")\s*:/g)) { if (seen.has(m[1])) dup.push(m[1]); seen.add(m[1]); }
  assert.deepEqual(dup, []);
  fresh("windmill"); doCommand("snap"); assert.doesNotMatch(out.join(" "), /Nothing here to break|You break nothing/);
});
