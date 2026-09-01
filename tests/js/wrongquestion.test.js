// The wrong question (canon layer, 2026-09-01): once ever, from the pillion
// seat at a red light, she asks where you'd be if you'd never met — and the
// game answers with the player's OWN ledger, not an authored biography. The
// properties pinned here are the doctrine: it fires once, it reads the real
// record, the two branches are the same question landing on two different
// lives, and NO meter moves either way — being asked the truth is not a prize
// and not a fine.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "games.js", "engine-core.js", "engine-encounters.js",
  "engine-play.js", "engine-systems.js", "engine-parser.js"]) {
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8"));
}

let out = [];
engineInit((t, c) => out.push({ text: t, cls: c }));
const text = () => out.map(o => o.text).join("\n");

beforeEach(() => {
  out = []; newGame();
  G.player.origin = "monger"; G.player.personality = "joker"; G.player.orientation = "straight";
  G.money = 5000;
});

test("the question rides the real path once, and reads the real ledger", () => {
  // a churned book: three other names with drinks against them, a jaded run
  G.soc.drinks = { lek: 9, ping: 4, dao: 2, mook: 1 };
  G.jaded = 3;
  G.rideSeq = { id: "lek", fine: 0, spent: 0, stops: 1, sanuk: 0, seen: [] };
  G.pendingEnc = "nightride";
  out = []; _nightRide("ride on");
  assert.match(text(), /If you never meet me/, "she asks it over her shoulder");
  assert.match(text(), /3 names in the book the lady drinks kept/, "the cascade counts HIS record");
  assert.match(text(), /each round buying a little less/, "…including the treadmill's arithmetic");
  assert.match(text(), /Still looking for you/, "the right answer, and not exactly a true one");
  assert.match(text(), /she already had it/, "she never needed telling — the soi talks");
  assert.ok(_flag("rideQuestion"), "the flag is down");
  // and never again — not this ride, not any ride
  out = []; _nightRide("ride on");
  assert.doesNotMatch(text(), /If you never meet me/, "a genuinely one-time beat");
});

test("a nearly-empty book gets the other branch — same question, different life", () => {
  G.soc.drinks = { lek: 9 };            // she IS the book
  G.jaded = 0;
  out = []; _rideQuestion({ stops: 2 }, "lek", "Lek");
  assert.match(text(), /she is most of what is written in it/);
  assert.match(text(), /Wrong question, na/, "the title lands in her mouth");
  assert.doesNotMatch(text(), /Still looking for you/, "no canned lie needed here");
});

test("no meter moves in either branch — the other-ledger doctrine", () => {
  for (const book of [{ lek: 9, ping: 4, dao: 2, mook: 1 }, { lek: 9 }]) {
    newGame(); G.soc.drinks = { ...book }; G.jaded = 2;
    const happy = G.happy, jaded = G.jaded, bond = G.soc.drinks.lek;
    out = []; _rideQuestion({ stops: 2 }, "lek", "Lek");
    assert.equal(G.happy, happy, "no สนุก either way");
    assert.equal(G.jaded, jaded, "the treadmill is read, never touched");
    assert.equal(G.soc.drinks.lek, bond, "her bond neither pays nor charges");
  }
});

test("too early in the night, she doesn't ask", () => {
  out = []; _rideQuestion({ stops: 1 }, "lek", "Lek");
  assert.equal(text(), "", "the first stop is too soon for that question");
  assert.ok(!_flag("rideQuestion"), "and the once-ever is not spent");
});

test("the Owl carries the thesis to everyone who never takes the ride", () => {
  const l = _OWL_LETTERS.find(([q]) => /never walked into that bar/.test(q));
  assert.ok(l, "the letter is in the pool");
  assert.match(l[1], /wrong question/, "the reply names it");
  assert.match(l[1], /bar next door/, "…and gives the honest counterfactual");
  assert.match(l[1], /changed SINCE/, "…and the question worth asking instead");
});
