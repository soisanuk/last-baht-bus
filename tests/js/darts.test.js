// Darts (501): a staked bar game at any board (rooms flagged `darts:true`), vs a
// regular, checking out on a FINISH. The hook the design turns on: your aim is
// dragged down by drink, thirst, and hunger — the opponent's isn't.
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
const REAL_RAND = _rand;
beforeEach(() => { out = []; newGame(); globalThis._rand = REAL_RAND; _setFlag("act1Done"); });

test("_dartsAim: clear-headed, fed and watered throws at 1.0", () => {
  G.soc.drunk = 0; G.thirst = 20; G.hunger = 20;
  assert.equal(_dartsAim(), 1);
  G.soc.drunk = 2; assert.equal(_dartsAim(), 1, "a couple beers is still fine");
});

test("_dartsAim: drink, thirst and hunger each drag it down, floored at 0.25", () => {
  G.soc.drunk = 6; G.thirst = 20; G.hunger = 20;
  const drunk = _dartsAim();
  assert.ok(drunk < 1 && drunk > 0.5, "six beers hurts but doesn't cripple");
  G.thirst = 85; G.hunger = 85;
  assert.ok(_dartsAim() < drunk, "dehydrated and starving on top is worse");
  G.soc.drunk = 12;
  assert.ok(_dartsAim() >= 0.25, "never below the floor");
});

test("_dartsVisit: 'big' can post up to 180, 'steady' tops out near 60", () => {
  globalThis._rand = () => 0; // every dart hits its best
  assert.equal(_dartsVisit("big", 1, () => 0).score, 180, "three treble 20s");
  assert.equal(_dartsVisit("steady", 1, () => 0).score, 60, "three single 20s");
});

test("_dartsVisit: a wrecked aim scatters — misses drag the score down", () => {
  const clear = _dartsVisit("big", 1, () => 0.5).score;
  const drunk = _dartsVisit("big", 0.3, () => 0.5).score;
  assert.ok(drunk <= clear, "lower aim never scores more on the same roll");
});

test("_dartsFinish: a three-dart visit checks out to 170, and bogeys never go", () => {
  // Was capped at 50, which is a ONE-dart finish and refused 80 — D20-D20, or
  // T20-D10 — a standard two-dart out (persona report B#16, 2026-08-23).
  assert.equal(_dartsFinish(171, 1, () => 0.01), false, "nothing checks out above 170");
  assert.equal(_dartsFinish(80, 1, () => 0.01), true, "80 is a real checkout");
  assert.equal(_dartsFinish(170, 1, () => 0.01), true, "…and so is the big fish");
  assert.equal(_dartsFinish(169, 1, () => 0.01), false, "169 is a bogey number");
  assert.equal(_dartsFinish(159, 1, () => 0.01), false, "so is 159");
  assert.equal(_dartsFinish(20, 1, () => 0.01), true, "tidy finish lands on a good roll");
  assert.equal(_dartsFinish(20, 1, () => 0.99), false, "…and misses on a bad one");
  // …and the odds fall away with the number, which is the whole point
  const odds = n => { let hit = 0; for (let i = 0; i < 400; i++) if (_dartsFinish(n, 1, () => i / 400)) hit++; return hit; };
  assert.ok(odds(20) > odds(80) && odds(80) > odds(150), "shorter checkouts are likelier");
});

test("PLAY DARTS only where there's a board", () => {
  G.room = "jomtien_beach"; out = []; run("play darts");
  assert.match(out.join("\n"), /No dartboard here/);
  const board = Object.keys(ROOMS).find(id => ROOMS[id].darts);
  G.room = board; G.money = 200; out = []; run("play darts");
  assert.equal(G.game.type, "darts");
  assert.equal(G.game.you, 501);
  assert.equal(G.money, 160, "฿40 stake escrowed");
});

test("a called finish wins, pays 2x the stake, and lifts สนุก", () => {
  G.room = Object.keys(ROOMS).find(id => ROOMS[id].darts); G.money = 200;
  run("play darts"); // stake 40 → money 160
  G.game.you = 24; const before = G.money, h = G.happy;
  globalThis._rand = () => 0.01; // guarantee the checkout
  out = []; run("finish");
  assert.equal(G.game, null, "game over");
  assert.equal(G.money, before + 80, "2x the ฿40 stake back");
  assert.ok(G.happy > h, "the win feels good");
});

test("FINISH is refused while too much is left", () => {
  G.room = Object.keys(ROOMS).find(id => ROOMS[id].darts); G.money = 200;
  run("play darts"); G.game.you = 180;
  out = []; run("finish");
  assert.match(out.join("\n"), /No checkout on 180/);
  assert.ok(G.game, "still playing");
});

test("darts is offered by PLAY and by the chip bar where there's a board", () => {
  G.room = Object.keys(ROOMS).find(id => ROOMS[id].darts);
  assert.ok(_playOptions().includes("darts"));
  G.money = 200; run("play darts");
  assert.ok(_chipSet().some(c => c.cmd === "finish"), "mid-game chips are the darts moves");
});

function run(cmd) { doCommand(cmd); }
