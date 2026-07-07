// Bar mini-games: Connect 4, Jackpot (Thai shut-the-box dice), and pool.
// Pure game logic only — no DOM, no G, no output. Every random decision takes
// an injected rnd() (the engine passes its save-seeded _rand), so games are
// deterministic per save and fully testable. The engine (engine.js) owns the
// betting, narration, and the modal G.game state that drives these.

// ── Connect 4 ────────────────────────────────────────────────────────────────
// board[row][col], row 0 = top; 0 empty, 1 you, 2 the hostess.

const C4_ROWS = 6, C4_COLS = 7;

function c4New() {
  return Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(0));
}

// Drop into col (0-based). Returns the landing row, or -1 if the column is full.
function c4Drop(board, col, who) {
  if (col < 0 || col >= C4_COLS || board[0][col] !== 0) return -1;
  let row = C4_ROWS - 1;
  while (board[row][col] !== 0) row--;
  board[row][col] = who;
  return row;
}

function c4Undrop(board, col) {
  for (let row = 0; row < C4_ROWS; row++) {
    if (board[row][col] !== 0) { board[row][col] = 0; return; }
  }
}

// 0 = no winner yet, 1/2 = winner.
function c4Win(board) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const v = board[r][c];
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        let k = 1;
        while (k < 4 &&
          r + dr * k >= 0 && r + dr * k < C4_ROWS &&
          c + dc * k >= 0 && c + dc * k < C4_COLS &&
          board[r + dr * k][c + dc * k] === v) k++;
        if (k === 4) return v;
      }
    }
  }
  return 0;
}

function c4Full(board) {
  return board[0].every(v => v !== 0);
}

// The hostess plays Connect 4 every shift of her life: take the win, block
// yours, don't hand you one on top of her move, then fight for the middle.
function c4Ai(board, rnd) {
  const open = [];
  for (let c = 0; c < C4_COLS; c++) if (board[0][c] === 0) open.push(c);
  const wins = (col, who) => {
    if (c4Drop(board, col, who) < 0) return false;
    const w = c4Win(board) === who;
    c4Undrop(board, col);
    return w;
  };
  for (const c of open) if (wins(c, 2)) return c;             // win now
  for (const c of open) if (wins(c, 1)) return c;             // block you
  const safe = open.filter(c => {                             // no gift on top
    c4Drop(board, c, 2);
    const gift = board[0][c] === 0 && wins(c, 1);
    c4Undrop(board, c);
    return !gift;
  });
  const pool = safe.length ? safe : open;
  pool.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));     // centre first
  const best = pool.filter(c => Math.abs(c - 3) === Math.abs(pool[0] - 3));
  return best[Math.floor(rnd() * best.length)];
}

// Text board for the terminal (monospace, pre-wrap). ● you, ○ her.
function c4Render(board) {
  const rows = board.map(r => r.map(v => v === 1 ? "●" : v === 2 ? "○" : "·").join(" "));
  return rows.join("\n") + "\n1 2 3 4 5 6 7";
}

// ── Jackpot ──────────────────────────────────────────────────────────────────
// The Thai bar dice game: nine tiles 1–9 face up, roll two dice; each roll you
// flip EITHER the two tiles matching the dice (doubles: the number, once) OR
// the single tile matching their sum (if ≤ 9). Stuck = score the face-up sum
// (low is good, you drink that many seconds); all nine down = JACKPOT.

// tiles: array of 9 booleans, index i ↔ tile i+1 face-up.
function jpNew() {
  return Array(9).fill(true);
}

function jpRoll(rnd) {
  return [1 + Math.floor(rnd() * 6), 1 + Math.floor(rnd() * 6)];
}

// Legal moves for a roll — each move is the sorted list of tile numbers it
// flips. At most two options: the dice tiles and/or the sum tile.
function jpMoves(tiles, d1, d2) {
  const up = n => n >= 1 && n <= 9 && tiles[n - 1];
  const moves = [];
  if (d1 === d2) {
    if (up(d1)) moves.push([d1]);
  } else if (up(d1) && up(d2)) {
    moves.push([d1, d2].sort((a, b) => a - b));
  } else if (up(d1) || up(d2)) {
    moves.push([up(d1) ? d1 : d2]); // only one dice tile still up: flip it
  }
  const sum = d1 + d2;
  if (up(sum) && !moves.some(m => m.length === 1 && m[0] === sum)) {
    moves.push([sum]);
  }
  return moves;
}

function jpFlip(tiles, move) {
  for (const n of move) tiles[n - 1] = false;
}

function jpScore(tiles) {
  return tiles.reduce((s, upNow, i) => s + (upNow ? i + 1 : 0), 0);
}

// Play a full round on the "always take the sum" strategy (mean ≈ 15.3 —
// the best simple strategy per the analysis this game is lifted from).
// Returns { score, rolls } where rolls is a compact transcript.
function jpAutoRound(rnd) {
  const tiles = jpNew();
  const rolls = [];
  for (;;) {
    const [d1, d2] = jpRoll(rnd);
    const moves = jpMoves(tiles, d1, d2);
    if (!moves.length) { rolls.push(`${d1}+${d2} — stuck`); break; }
    const move = moves.find(m => m.length === 1 && m[0] === d1 + d2) || moves[0];
    jpFlip(tiles, move);
    rolls.push(`${d1}+${d2}→${move.join(",")}`);
    if (jpScore(tiles) === 0) break;
  }
  return { score: jpScore(tiles), rolls };
}

function jpRender(tiles) {
  return tiles.map((up, i) => up ? String(i + 1) : "·").join(" ");
}

// ── Pool ─────────────────────────────────────────────────────────────────────
// Abstract bar 8-ball: seven balls each, then the black. Shot styles trade
// pot chance against risk; sinking the black early loses on the spot.

const POOL_SHOTS = {
  shot:   { pot: 0.65, pot8: 0.55 },              // the sensible cut
  power:  { pot: 0.45, pot8: 0.35, bonus: 0.35,   // showing off: may pot two…
            sink8: 0.08 },                        // …may sink the black early
  safety: { pot: 0,    snooker: 0.25 },           // opponent shoots at 0.25
};

// One shot of yours. Mutates g, returns an event string id:
// "pot" | "pot2" | "pot8win" | "miss" | "safety" | "sink8lose"
function poolShot(g, kind, rnd) {
  const s = POOL_SHOTS[kind] || POOL_SHOTS.shot;
  if (kind === "safety") { g.oppNext = s.snooker; return "safety"; }
  const on8 = g.you === 0;
  if (kind === "power" && !on8 && rnd() < s.sink8) return "sink8lose";
  if (rnd() < (on8 ? s.pot8 : s.pot)) {
    if (on8) return "pot8win";
    g.you--;
    if (kind === "power" && g.you > 0 && rnd() < s.bonus) { g.you--; return "pot2"; }
    return "pot";
  }
  return "miss";
}

// The opponent's whole visit in one go. Returns balls potted this visit;
// sets g.oppWon if they cleared up and dropped the black.
function poolOppVisit(g, rnd) {
  let chance = g.oppNext !== null ? g.oppNext : g.oppSkill;
  g.oppNext = null;
  let potted = 0;
  for (;;) {
    const on8 = g.opp === 0;
    if (rnd() >= (on8 ? chance - 0.1 : chance)) break;
    if (on8) { g.oppWon = true; break; }
    g.opp--;
    potted++;
    chance = g.oppSkill; // the snooker only spoils the first shot
  }
  return potted;
}
