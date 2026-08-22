// Bar mini-games: Connect 4, Jackpot (Thai shut-the-box dice), and pool.
// Pure game logic only — no DOM, no G, no output. Every random decision takes
// an injected rnd() (the engine passes its save-seeded _rand), so games are
// deterministic per save and fully testable. The engine (engine-*.js) owns the
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

// The hostess plays Connect 4 every shift of her life — the score sheet says
// beating her is "unheard of", so she reads the board like one: a real
// lookahead (negamax + alpha-beta), not a one-ply reflex. The old reflex AI
// lost to any double-threat fork; this one sets them.

// Positional value of a board from `who`'s side: every 4-window scored by its
// counts (a live three is nearly a threat, a live two is a lean), centre
// column weighted — the standard club heuristic.
function _c4Eval(board, who) {
  const opp = 3 - who;
  let score = 0;
  for (let r = 0; r < C4_ROWS; r++) {
    if (board[r][3] === who) score += 6;
    else if (board[r][3] === opp) score -= 6;
  }
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      for (const [dr, dc] of dirs) {
        const r3 = r + dr * 3, c3 = c + dc * 3;
        if (r3 < 0 || r3 >= C4_ROWS || c3 < 0 || c3 >= C4_COLS) continue;
        let mine = 0, theirs = 0;
        for (let k = 0; k < 4; k++) {
          const v = board[r + dr * k][c + dc * k];
          if (v === who) mine++; else if (v === opp) theirs++;
        }
        if (mine && theirs) continue; // dead window
        if (mine === 3) score += 40; else if (mine === 2) score += 6;
        else if (theirs === 3) score -= 45; else if (theirs === 2) score -= 6;
      }
    }
  }
  return score;
}

const _C4_ORDER = [3, 2, 4, 1, 5, 0, 6]; // centre-out: better moves first = better pruning

// Did the stone just placed at (r,c) complete four? Only lines through that
// square — the full-board c4Win scan is too slow inside the search.
function _c4WinAt(board, r, c) {
  const v = board[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let k = 1;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < C4_ROWS && cc >= 0 && cc < C4_COLS && board[rr][cc] === v) {
        k++; rr += dr * s; cc += dc * s;
      }
    }
    if (k >= 4) return true;
  }
  return false;
}

// Negamax with alpha-beta, from `who` to move. Any immediate win short-circuits
// (so moves played in the main loop never complete four — children stay clean).
// Wins score higher the sooner they land; a full board is a draw.
function _c4Negamax(board, depth, alpha, beta, who) {
  for (const c of _C4_ORDER) {
    if (board[0][c] !== 0) continue;
    const row = c4Drop(board, c, who);
    const won = _c4WinAt(board, row, c);
    c4Undrop(board, c);
    if (won) return 100000 + depth;
  }
  if (depth === 0) return _c4Eval(board, who);
  let best = -Infinity;
  for (const c of _C4_ORDER) {
    if (board[0][c] !== 0) continue;
    c4Drop(board, c, who);
    const v = -_c4Negamax(board, depth - 1, -beta, -alpha, 3 - who);
    c4Undrop(board, c);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? 0 : best; // no legal moves: draw
}

// Depth 8 beat the old reflex AI 20-0 from the SECOND seat in testing (depth 6
// dropped games, depth 7 is oddly worse — horizon parity); still theoretically
// beatable, first player with perfect play wins Connect 4.
function c4Ai(board, rnd, depth = 8) {
  const open = _C4_ORDER.filter(c => board[0][c] === 0);
  const wins = (col, who) => {
    if (c4Drop(board, col, who) < 0) return false;
    const w = c4Win(board) === who;
    c4Undrop(board, col);
    return w;
  };
  for (const c of open) if (wins(c, 2)) return c;             // win now
  for (const c of open) if (wins(c, 1)) return c;             // block you
  let best = [], bestV = -Infinity;
  for (const c of open) {
    c4Drop(board, c, 2);
    const v = -_c4Negamax(board, depth - 1, -Infinity, Infinity, 1);
    c4Undrop(board, c);
    if (v > bestV) { bestV = v; best = [c]; }
    else if (v === bestV) best.push(c);
  }
  return best[Math.floor(rnd() * best.length)]; // rnd only tie-breaks equals
}

// Text board for the terminal (monospace, pre-wrap). ● you, ○ her.
function c4Render(board) {
  const sep = "  "; // wider columns: clearer to read, bigger tap gaps on mobile
  const rows = board.map(r => r.map(v => v === 1 ? "●" : v === 2 ? "○" : "·").join(sep));
  return rows.join("\n") + "\n" + ["1", "2", "3", "4", "5", "6", "7"].join(sep);
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

// ── Killer pool ──────────────────────────────────────────────────────────────
// League-night elimination: everyone antes up, everyone gets three lives.
// One shot per turn — pot anything or lose a life. Last cue standing takes
// the pot. players: [{name, skill, lives}]; index 0 is always you.

function kpNew(names, skills) {
  return {
    players: names.map((name, i) => ({ name, skill: skills[i] || 0.55, lives: 3 })),
    turn: 0,
  };
}

function kpAlive(g) { return g.players.filter(p => p.lives > 0); }

function kpOver(g) { return kpAlive(g).length <= 1; }

// Resolve one shot for the player whose turn it is. `chance` overrides skill
// (your shot style); AI passes undefined. Returns { player, potted, out } and
// advances the turn past eliminated players.
function kpShot(g, rnd, chance) {
  const p = g.players[g.turn];
  const potted = rnd() < (chance !== undefined ? chance : p.skill);
  if (!potted) p.lives--;
  const out = p.lives === 0;
  do {
    g.turn = (g.turn + 1) % g.players.length;
  } while (g.players[g.turn].lives === 0 && !kpOver(g));
  return { player: p, potted, out };
}

function kpRender(g) {
  return g.players.map(p =>
    `${p.name} ${p.lives > 0 ? "●".repeat(p.lives) : "✝"}`).join(" · ");
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
