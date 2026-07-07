// Bar mini-game logic: Connect 4 board/AI, Jackpot rules (per the
// timecomplexity.blogspot.com analysis the game is lifted from), and pool.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const src = readFileSync(
  fileURLToPath(new URL("../../web/js/games.js", import.meta.url)), "utf8");
vm.runInThisContext(src, { filename: "games.js" });

// deterministic rnd from a fixed sequence
const seq = a => { let i = 0; return () => a[i++ % a.length]; };

// ── Connect 4 ────────────────────────────────────────────────────────────────

test("c4: drops stack from the bottom and full columns refuse", () => {
  const b = c4New();
  assert.equal(c4Drop(b, 3, 1), 5);
  assert.equal(c4Drop(b, 3, 2), 4);
  for (let i = 0; i < 4; i++) c4Drop(b, 3, 1);
  assert.equal(c4Drop(b, 3, 1), -1, "column 3 is full");
});

test("c4: detects horizontal, vertical, and diagonal wins", () => {
  let b = c4New();
  for (const c of [0, 1, 2, 3]) c4Drop(b, c, 1);
  assert.equal(c4Win(b), 1, "horizontal");
  b = c4New();
  for (let i = 0; i < 4; i++) c4Drop(b, 6, 2);
  assert.equal(c4Win(b), 2, "vertical");
  b = c4New();
  // staircase: 1 at (5,0),(4,1),(3,2),(2,3)
  c4Drop(b, 0, 1);
  c4Drop(b, 1, 2); c4Drop(b, 1, 1);
  c4Drop(b, 2, 2); c4Drop(b, 2, 2); c4Drop(b, 2, 1);
  c4Drop(b, 3, 2); c4Drop(b, 3, 2); c4Drop(b, 3, 2); c4Drop(b, 3, 1);
  assert.equal(c4Win(b), 1, "diagonal");
});

test("c4 AI: takes its winning move", () => {
  const b = c4New();
  for (let i = 0; i < 3; i++) c4Drop(b, 5, 2); // three hers in column 5
  assert.equal(c4Ai(b, seq([0])), 5);
});

test("c4 AI: blocks the player's three in a row", () => {
  const b = c4New();
  for (const c of [1, 2, 3]) c4Drop(b, c, 1); // player threatens 0 and 4
  const pick = c4Ai(b, seq([0]));
  assert.ok(pick === 0 || pick === 4, `blocked at ${pick}`);
});

test("c4 render is a 6-line monospace grid plus column numbers", () => {
  const b = c4New();
  c4Drop(b, 0, 1);
  const lines = c4Render(b).split("\n");
  assert.equal(lines.length, 7);
  assert.equal(lines[5][0], "●");
  assert.equal(lines[6], "1 2 3 4 5 6 7");
});

// ── Jackpot ──────────────────────────────────────────────────────────────────

test("jackpot: both dice tiles up → flip both or flip the sum", () => {
  const t = jpNew();
  assert.deepEqual(jpMoves(t, 2, 5), [[2, 5], [7]]);
});

test("jackpot: only one dice tile up → the single tile is legal (blog's 5+6→6)", () => {
  const t = jpNew();
  jpFlip(t, [5]);
  assert.deepEqual(jpMoves(t, 5, 6), [[6]]); // sum 11 is off the board
});

test("jackpot: neither tile up → only the sum (blog's 2+6→8)", () => {
  const t = jpNew();
  jpFlip(t, [2, 6]);
  assert.deepEqual(jpMoves(t, 2, 6), [[8]]);
});

test("jackpot: doubles flip the number or twice the number", () => {
  const t = jpNew();
  assert.deepEqual(jpMoves(t, 3, 3), [[3], [6]]);
  jpFlip(t, [3]);
  assert.deepEqual(jpMoves(t, 3, 3), [[6]]);
  assert.deepEqual(jpMoves(t, 5, 5), [[5]], "10 is off the board");
});

test("jackpot: stuck when nothing is legal, score is the face-up sum", () => {
  const t = jpNew();
  jpFlip(t, [5, 6, 2]); // blog's example end-state has 1 3 4 7 9 up
  jpFlip(t, [8]);
  assert.deepEqual(jpMoves(t, 5, 6), []);
  assert.equal(jpScore(t), 1 + 3 + 4 + 7 + 9); // 24, as in the blog
});

test("jackpot: auto round always prefers the sum and terminates", () => {
  // dice: 3,4 → sum strategy flips 7 (not 3&4)
  const t = jpNew();
  const moves = jpMoves(t, 3, 4);
  const sumMove = moves.find(m => m.length === 1 && m[0] === 7);
  assert.ok(sumMove);
  for (let s = 1; s < 40; s += 7) {
    const r = jpAutoRound(seq([s / 40, 0.2, 0.7, 0.4, 0.9, 0.1]));
    assert.ok(r.score >= 0 && r.score <= 44);
    assert.ok(r.rolls.length > 0);
  }
});

test("jackpot: a full shut-out scores 0", () => {
  const t = jpNew();
  for (let n = 1; n <= 9; n++) jpFlip(t, [n]);
  assert.equal(jpScore(t), 0);
  assert.equal(jpRender(t), "· · · · · · · · ·");
});

// ── Pool ─────────────────────────────────────────────────────────────────────

test("pool: a made shot decrements, a power shot can pot two", () => {
  const g = { you: 7, opp: 7, oppSkill: 0.6, oppNext: null, oppWon: false };
  assert.equal(poolShot(g, "shot", seq([0.1])), "pot");
  assert.equal(g.you, 6);
  assert.equal(poolShot(g, "power", seq([0.5, 0.1, 0.1])), "pot2"); // no sink8, pot, bonus
  assert.equal(g.you, 4);
});

test("pool: power can sink the black early and lose on the spot", () => {
  const g = { you: 5, opp: 7, oppSkill: 0.6, oppNext: null, oppWon: false };
  assert.equal(poolShot(g, "power", seq([0.01])), "sink8lose");
});

test("pool: clearing seven puts you on the black; potting it wins", () => {
  const g = { you: 0, opp: 7, oppSkill: 0.6, oppNext: null, oppWon: false };
  assert.equal(poolShot(g, "shot", seq([0.1])), "pot8win");
  assert.equal(poolShot(g, "shot", seq([0.99])), "miss");
});

test("pool: safety snookers the opponent's first shot only", () => {
  const g = { you: 5, opp: 3, oppSkill: 0.6, oppNext: null, oppWon: false };
  assert.equal(poolShot(g, "safety", seq([0])), "safety");
  assert.equal(g.oppNext, 0.25);
  // opp misses the snookered shot at 0.3 ≥ 0.25 …
  assert.equal(poolOppVisit(g, seq([0.3])), 0);
  assert.equal(g.oppNext, null, "snooker spent");
  // …then a clean visit runs three and drops the black
  assert.equal(poolOppVisit(g, seq([0.1])), 3);
  assert.ok(g.oppWon);
});
