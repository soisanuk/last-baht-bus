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

test("c4 AI: sees the ground fork coming and denies it (lookahead, not reflex)", () => {
  // Player holds ●● at bottom cols 2-3 with both flanks open. Any move except
  // col 1 or col 4 lets the player build .●●●. next turn — two winning ends,
  // unstoppable. The old one-ply AI played centre-on-top here and lost by
  // force; a bar shark takes a flank.
  const b = c4New();
  c4Drop(b, 2, 1); c4Drop(b, 3, 1); // ● ● on the floor
  c4Drop(b, 6, 2);                  // her counter parked on the edge
  const pick = c4Ai(b, seq([0]));
  assert.ok(pick === 1 || pick === 4, `denied the fork at ${pick}`);
});

test("c4 AI: same board + same seed = same move (rnd only breaks ties)", () => {
  const mk = () => {
    const b = c4New();
    c4Drop(b, 3, 1); c4Drop(b, 3, 2); c4Drop(b, 2, 1);
    return b;
  };
  assert.equal(c4Ai(mk(), seq([0.42])), c4Ai(mk(), seq([0.42])));
});

test("c4 AI: crushes the old one-ply reflex from the second seat", () => {
  // The retired AI, verbatim: win now → block → don't gift → centre.
  function oldAi(board, rnd) {
    const open = [];
    for (let c = 0; c < 7; c++) if (board[0][c] === 0) open.push(c);
    const wins = (col, who) => {
      if (c4Drop(board, col, who) < 0) return false;
      const w = c4Win(board) === who;
      c4Undrop(board, col);
      return w;
    };
    for (const c of open) if (wins(c, 1)) return c;
    for (const c of open) if (wins(c, 2)) return c;
    const safe = open.filter(c => {
      c4Drop(board, c, 1);
      const gift = board[0][c] === 0 && wins(c, 2);
      c4Undrop(board, c);
      return !gift;
    });
    const pool = safe.length ? safe : open;
    pool.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
    const best = pool.filter(c => Math.abs(c - 3) === Math.abs(pool[0] - 3));
    return best[Math.floor(rnd() * best.length)];
  }
  // old AI plays first (as 1), new AI second (as 2) — the harder seat.
  let rs = 7;
  const rnd = () => (rs = (rs * 48271) % 2147483647) / 2147483647;
  let newWins = 0, games = 10;
  for (let g = 0; g < games; g++) {
    const b = c4New();
    for (;;) {
      c4Drop(b, oldAi(b, rnd), 1);
      if (c4Win(b) || c4Full(b)) break;
      c4Drop(b, c4Ai(b, rnd), 2);
      if (c4Win(b) || c4Full(b)) break;
    }
    if (c4Win(b) === 2) newWins++;
  }
  assert.ok(newWins >= 8, `the shark won ${newWins}/${games} from the second seat`);
});

test("c4 render is a 6-line monospace grid plus column numbers", () => {
  const b = c4New();
  c4Drop(b, 0, 1);
  const lines = c4Render(b).split("\n");
  assert.equal(lines.length, 7);
  assert.equal(lines[5][0], "●");
  assert.equal(lines[6], "1  2  3  4  5  6  7");
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

// ── Killer pool ──────────────────────────────────────────────────────────────

test("killer: misses cost lives, eliminated players are skipped", () => {
  const g = kpNew(["You", "A", "B"], [0, 0.5, 0.5]);
  // You pot (chance 1), A misses, B misses ×3 → B out
  kpShot(g, seq([0]), 1);
  assert.equal(g.players[0].lives, 3);
  kpShot(g, seq([0.9]));           // A misses
  assert.equal(g.players[1].lives, 2);
  kpShot(g, seq([0.9]));           // B misses
  kpShot(g, seq([0]), 1);          // you pot
  kpShot(g, seq([0.9]));           // A misses again
  kpShot(g, seq([0.9]));           // B misses (1 left)
  kpShot(g, seq([0]), 1);
  kpShot(g, seq([0.9]));           // A out? A had 1 left → out
  assert.equal(g.players[1].lives, 0);
  // turn now skips A entirely
  const before = g.turn;
  assert.notEqual(g.players[before].lives, 0, "never lands on a dead player");
});

test("killer: last cue standing ends it", () => {
  const g = kpNew(["You", "A"], [0, 0.5]);
  for (let i = 0; i < 6 && !kpOver(g); i++) {
    kpShot(g, seq([0]), g.turn === 0 ? 1 : undefined); // you always pot
    if (!kpOver(g) && g.turn === 1) kpShot(g, seq([0.99])); // A always misses
  }
  assert.ok(kpOver(g));
  assert.equal(kpAlive(g)[0].name, "You");
  assert.match(kpRender(g), /You ●●●/);
  assert.match(kpRender(g), /✝/);
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
