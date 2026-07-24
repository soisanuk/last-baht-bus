// Brief-on-revisit (IF verbose/brief): the full room desc on first arrival and on
// LOOK, a short rotating ambient line when you just walk back through a place you've
// already read. Opt-in per room via `revisit`; rooms without it are unchanged.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(
    readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"),
    { filename: f });
}
let out = [];
engineInit(t => out.push(t), null, () => {});
beforeEach(() => { out = []; newGame(); });

test("full desc first, brief ambient on return, full again on LOOK", () => {
  // "power outlet" / "different haircuts" appear ONLY in the full desc — a revisit
  // line may deliberately echo "rose-pink"/"harbourmaster", so those aren't markers.
  G.room = "candy_bar"; // unvisited at newGame
  out = []; _describeRoom(true);
  assert.match(out.join("\n"), /power outlet|different haircuts/, "first visit is full");

  out = []; _describeRoom(true); // re-arrival
  const rev = out.join("\n");
  assert.ok(ROOMS.candy_bar.revisit.some(s => rev.includes(s)), "revisit shows a brief ambient line");
  assert.doesNotMatch(rev, /power outlet|different haircuts/, "…and not the full desc");

  out = []; _describeRoom(true, true); // LOOK forces full
  assert.match(out.join("\n"), /power outlet|different haircuts/, "LOOK always gives the full desc");
});

test("hyper has its own revisit pool", () => {
  G.room = "hyper";
  _describeRoom(true);            // first
  out = []; _describeRoom(true);  // return
  assert.ok(ROOMS.hyper.revisit.some(s => out.join("\n").includes(s)));
});

test("rooms without a revisit pool are unchanged — full desc every time", () => {
  G.room = "jomtien_beach"; // visited:true at init, and no revisit pool
  assert.ok(!ROOMS.jomtien_beach.revisit);
  out = []; _describeRoom(true);
  out = []; _describeRoom(true); // re-arrival still full
  assert.match(out.join("\n"), /Soft sand|loungers|sunset/, "still the full desc");
});
