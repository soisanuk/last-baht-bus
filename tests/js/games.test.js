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

// ── Pok Deng ─────────────────────────────────────────────────────────────────

// card by rank (1=A … 10, 11=J, 12=Q, 13=K) and suit (0=♠ 1=♥ 2=♦ 3=♣)
const pc = (rank, suit) => suit * 13 + (rank - 1);

test("pok deng: points are sum mod 10, aces one, faces and tens nothing", () => {
  assert.equal(pdPoints([pc(4, 0), pc(5, 1)]), 9);
  assert.equal(pdPoints([pc(1, 0), pc(9, 1)]), 0, "A + 9 wraps to 0");
  assert.equal(pdPoints([pc(13, 0), pc(10, 1), pc(12, 2)]), 0, "paint counts nothing");
  assert.equal(pdPoints([pc(7, 0), pc(8, 1), pc(9, 2)]), 4);
});

test("pok deng: a two-card 8 or 9 is a pok and locks the round", () => {
  assert.ok(pdIsPok([pc(4, 0), pc(5, 1)]));
  assert.ok(!pdIsPok([pc(4, 0), pc(3, 1)]));
  assert.ok(!pdIsPok([pc(2, 0), pc(3, 1), pc(4, 2)]), "three cards is never a pok");
  const g = { deck: [], you: [pc(4, 0), pc(5, 1)], her: [pc(2, 0), pc(2, 1)], next: 4 };
  assert.ok(pdLocked(g));
  assert.equal(pdHit(g), false, "no drawing against a pok");
  pdDealer(g);
  assert.equal(g.her.length, 2, "the bank stands on a lock too");
});

test("pok deng: deng — pairs and suited pay 2, the three-card hands 3 and 5", () => {
  assert.equal(pdDeng([pc(7, 0), pc(7, 1)]), 2, "pair");
  assert.equal(pdDeng([pc(7, 0), pc(2, 0)]), 2, "suited");
  assert.equal(pdDeng([pc(7, 0), pc(2, 1)]), 1, "junk");
  assert.equal(pdDeng([pc(11, 0), pc(11, 1), pc(11, 2)]), 5, "trips");
  assert.equal(pdDeng([pc(4, 2), pc(5, 2), pc(6, 2)]), 5, "straight flush");
  assert.equal(pdDeng([pc(4, 2), pc(9, 2), pc(13, 2)]), 3, "flush");
  assert.equal(pdDeng([pc(4, 0), pc(5, 1), pc(6, 2)]), 3, "straight");
  assert.equal(pdDeng([pc(1, 0), pc(2, 1), pc(3, 2)]), 3, "A-2-3 straight");
  assert.equal(pdDeng([pc(12, 0), pc(13, 1), pc(1, 2)]), 3, "Q-K-A round the corner");
  assert.equal(pdDeng([pc(4, 0), pc(9, 1), pc(13, 2)]), 1, "three-card junk");
});

test("pok deng: the bank draws on 4 or less and stands on 5", () => {
  const draw = { deck: [0, 0, 0, 0, pc(9, 3)], you: [pc(2, 0), pc(3, 1)], her: [pc(2, 1), pc(2, 2)], next: 4 };
  pdDealer(draw);
  assert.equal(draw.her.length, 3);
  assert.equal(draw.next, 5, "drew off the top of the deck");
  const stand = { deck: [], you: [pc(2, 0), pc(3, 1)], her: [pc(2, 1), pc(3, 2)], next: 4 };
  pdDealer(stand);
  assert.equal(stand.her.length, 2);
});

test("pok deng: settle — higher points win, winner's deng pays, ties push", () => {
  const r = pdResult({ you: [pc(4, 0), pc(5, 0)], her: [pc(4, 1), pc(4, 2)], deck: [], next: 4 });
  assert.deepEqual(r, { win: 1, mult: 2, you: 9, her: 8 }, "suited pok 9 beats pok 8 and pays double");
  const loss = pdResult({ you: [pc(2, 0), pc(3, 1)], her: [pc(3, 2), pc(4, 2)], deck: [], next: 4 });
  assert.equal(loss.win, -1);
  assert.equal(loss.mult, 2, "you pay HER deng on a loss");
  const push = pdResult({ you: [pc(2, 0), pc(5, 1)], her: [pc(3, 2), pc(4, 3)], deck: [], next: 4 });
  assert.deepEqual([push.win, push.mult], [0, 1]);
});

test("pok deng: a pok beats a drawn hand of equal points", () => {
  const g = { deck: [], you: [pc(4, 0), pc(4, 1)], her: [pc(2, 2), pc(3, 3), pc(3, 2)], next: 7 };
  assert.equal(pdPoints(g.you), pdPoints(g.her));
  assert.equal(pdResult(g).win, 1);
});

test("pok deng: same rnd stream, same deal — and the deck is a real permutation", () => {
  const rs = () => { let s = 12345; return () => (s = (s * 48271) % 2147483647) / 2147483647; };
  const a = pdNew(rs()), b = pdNew(rs());
  assert.deepEqual(a, b);
  assert.deepEqual([...a.deck].sort((x, y) => x - y), Array.from({ length: 52 }, (_, i) => i));
  assert.deepEqual(a.you, [a.deck[0], a.deck[2]], "dealt alternately, you first");
  assert.deepEqual(a.her, [a.deck[1], a.deck[3]]);
});

test("pok deng: a drawn round consumes the deck in strict order", () => {
  const g = { deck: [0, 0, 0, 0, pc(5, 3), pc(9, 3)], you: [pc(2, 0), pc(3, 1)], her: [pc(2, 1), pc(2, 2)], next: 4 };
  assert.ok(pdHit(g));
  assert.equal(pdHit(g), false, "one third card only");
  pdDealer(g);
  assert.deepEqual([g.you[2], g.her[2]], [pc(5, 3), pc(9, 3)]);
  // you 2+3+5 = 10 → 0; her 2+2+9 = 13 → 3. Her junk three-card hand pays ×1.
  assert.deepEqual(pdResult(g), { win: -1, mult: 1, you: 0, her: 3 });
});

test("pok deng: render is rank-and-suit text", () => {
  assert.equal(pdRender([pc(1, 0), pc(10, 1), pc(13, 3)]), "A♠ 10♥ K♣");
});

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
