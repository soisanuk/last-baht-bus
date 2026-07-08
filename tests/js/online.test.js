// Online-readiness: the whole game core runs headless per-player inside an
// isolated vm context — the exact shape of a server hosting many sessions in
// one Node process (websocket in → doCommand → print callbacks out). This
// test IS the deployment model; if it passes, a multi-player host needs no
// engine changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SOURCES = ["thai.js", "world.js", "games.js", "engine.js"].map(f =>
  readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"));

// One player session = one vm context with its own globals, its own G, and
// its own output channel. This is what a server would create per connection.
function newSession() {
  const ctx = vm.createContext({});
  for (const src of SOURCES) vm.runInContext(src, ctx);
  const out = [];
  vm.runInContext("var __out;", ctx);
  ctx.__out = (text, cls) => out.push({ text, cls });
  vm.runInContext("engineInit((t, c) => __out(t, c)); newGame();", ctx);
  return {
    ctx,
    out,
    send(cmd) { ctx.__cmd = cmd; vm.runInContext("doCommand(__cmd)", ctx); },
    state() { return vm.runInContext("G", ctx); },
    save() { return vm.runInContext("serializeGame()", ctx); },
    load(s) { ctx.__save = s; vm.runInContext("deserializeGame(__save)", ctx); },
  };
}

test("two sessions in one process are fully isolated", () => {
  const a = newSession();
  const b = newSession();
  a.send("e");
  a.send("take bottle");
  b.send("n"); // b walks into the dark instead
  assert.equal(a.state().room, "jomtien_beach_rd");
  assert.equal(b.state().room, "dongtan_beach");
  assert.equal(a.state().itemLoc.bottle3, "inventory");
  assert.equal(b.state().itemLoc.bottle3, "jomtien_beach_rd", "b's world untouched by a");
  assert.notEqual(a.state().rng, b.state().rng, "independent dice");
  assert.ok(a.out.length && b.out.length, "each session got its own output");
});

test("a session round-trips through a save string across contexts (cloud save)", () => {
  const a = newSession();
  a.send("e");
  a.send("take bottle");
  const blob = a.save(); // what a server would persist per account
  const later = newSession(); // fresh context — different process, other day
  later.load(blob);
  assert.equal(later.state().room, "jomtien_beach_rd");
  assert.equal(later.state().itemLoc.bottle3, "inventory");
  later.send("sell bottles"); // Nok is right here
  assert.equal(later.state().money, 5, "play continues seamlessly");
});

test("same seed, same transcript — the engine is a deterministic replayable core", () => {
  const script = ["e", "take bottle", "s", "buy charger", "look", "n", "n", "wait"];
  const runWith = seed => {
    const s = newSession();
    s.state().rng = seed;
    s.state().money = 100;
    for (const c of script) s.send(c);
    return s.out.map(o => o.text).join("\n");
  };
  assert.equal(runWith(424242), runWith(424242),
    "identical seeds and commands produce identical output — replay/audit-grade");
});
