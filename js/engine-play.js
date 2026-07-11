// The Last Baht Bus — game engine, part 3/5: the night's activities — bar
// mini-games, bar social life, happiness (สนุก), and the clock/body/week.
// Loads after engine-core (see its header for the split's load-order contract).

// ── Bar mini-games ──────────────────────────────────────────────────────────
// Classic bar-table gambling: Connect 4 (the hostess never loses), Jackpot
// (the Thai shut-the-box dice game), and pool. Pure game logic lives in
// games.js; this section owns stakes, narration, and the modal G.game state —
// while a game is live, doCommand routes every input to _gameInput.

const C4_STAKE = 20, POOL_STAKE = 50, JP_MIN = 10, JP_MAX = 100, JP_DEFAULT = 20;

function _barGamesHere() {
  const bt = _room().barType;
  return bt === "beer" || bt === "soi6";
}

function _gameHostess() {
  const id = _npcsHere().find(n => CANON_HOSTESSES.includes(n));
  return id ? NPCS[id].name : "the hostess on shift";
}

// Stake escrow: taken up front, paid back ×2 on a win (×3 on a Jackpot).
// Broke players play "for sanuk" — no baht either way, pride still on the line.
function _takeStake(want) {
  const stake = Math.min(want, G.money);
  G.money -= stake;
  return stake;
}

// What's actually playable where you stand — the one list every surface
// (typed PLAY, the flyout wheel, autocomplete) draws from.
function _playOptions() {
  const out = [];
  if (_barGamesHere()) out.push("connect 4", "jackpot");
  if (_room().pool) {
    out.push("pool");
    if (_leagueTonight()) out.push("killer");
  }
  return out;
}

// Legal Connect 4 drops right now — the wheel's and autocomplete's column
// list during a live game; empty whenever c4 isn't the game in progress.
function _c4Choices() {
  if (!G || !G.game || G.game.type !== "c4") return [];
  return ["1", "2", "3", "4", "5", "6", "7"]
    .filter(c => G.game.board[0][+c - 1] === 0);
}

// The words a live mini-game answers to — autocomplete's verb row while a
// game has the floor (every other verb is dead air until it ends).
function _gameVerbs() {
  if (!G || !G.game) return [];
  switch (G.game.type) {
    case "c4": return ["drop", "1", "2", "3", "4", "5", "6", "7", "q", "quit"];
    case "jp": return ["flip", "quit"];
    case "pool": case "killer": return ["shot", "power", "safety", "quit"];
    case "quiz": return ["1", "2", "3", "quit"];
  }
  return ["quit"];
}

function _doPlay(arg) {
  if (G.game) { _say("One game at a time, champ."); return; }
  const w = arg.toLowerCase();
  if (w.includes("jackpot") || w.includes("dice")) return _startJackpot(w);
  if (w.includes("killer") || w.includes("league")) return _startKiller();
  if (w.includes("pool") || w.includes("8") || w.includes("billiard")) return _startPool();
  if (w.includes("connect") || w.includes("four") || w.includes("4")) return _startC4();
  const opts = _playOptions();
  if (opts.length) _say("Play what? " + opts.map(o => "PLAY " + o.toUpperCase()).join(" · ") + ".", "dim");
  else _say("Nothing to play here — the beer bars keep Connect 4 and Jackpot within reach.", "dim");
}

// ─ Connect 4 ─

function _startC4() {
  if (!_barGamesHere()) { _say("No Connect 4 board here — every beer bar keeps one within arm's reach."); return; }
  const opp = _gameHostess();
  const stake = _takeStake(C4_STAKE);
  G.game = { type: "c4", board: c4New(), opp, stake };
  _say(`${opp} has the Connect 4 frame up and loaded before you finish asking. ` +
    "This is not her first game today. It is not her hundredth.");
  _say(stake ? `฿${stake} on the table.` :
    "You're broke, so this one's for sanuk — and her professional pride.");
  _say(c4Render(G.game.board));
  _say("(You're ●. Tap a column 1-7 to drop · Q quits.)", "dim");
}

function _c4Input(input) {
  const g = G.game;
  const m = input.match(/[1-7]/);
  if (!m) { _gameBoard(); _say("Not a move — tap a column 1-7, or Q to quit.", "dim"); return; }
  if (c4Drop(g.board, +m[0] - 1, 1) < 0) { _say("That column is full to the brim."); return; }
  if (c4Win(g.board) === 1) {
    _say(c4Render(g.board));
    _endGame(true, g.stake * 2, `Four in a row. ${g.opp} stares at the board, then at you, ` +
      "then calls the whole bar over to see it. Someone takes a photo. You will be " +
      "legend here for up to forty-five minutes.");
    _setFlag("beatBargirlC4");
    return;
  }
  if (c4Full(g.board)) {
    _endGame(null, g.stake, `A draw. ${g.opp} looks almost impressed. Stakes back.`);
    return;
  }
  const ai = c4Ai(g.board, _rand);
  c4Drop(g.board, ai, 2);
  _say(c4Render(g.board));
  if (c4Win(g.board) === 2) {
    _endGame(false, 0, `${g.opp} drops column ${ai + 1} without breaking eye contact. ` +
      "Four in a row. She was three moves ahead the whole time, and you both know it." +
      (g.stake ? ` Your ฿${g.stake} joins the till.` : ""));
    return;
  }
  if (c4Full(g.board)) {
    _endGame(null, g.stake, `A draw. ${g.opp} looks almost impressed. Stakes back.`);
    return;
  }
  _say(`(She plays column ${ai + 1}. Your drop.)`, "dim");
}

// ─ Jackpot ─

function _startJackpot(w) {
  if (!_barGamesHere()) { _say("No Jackpot box here — beer bars keep the dice cup by the till."); return; }
  const betM = w.match(/\d+/);
  const want = Math.max(JP_MIN, Math.min(JP_MAX, betM ? parseInt(betM[0], 10) : JP_DEFAULT));
  const opp = _gameHostess();
  const stake = _takeStake(want);
  G.game = { type: "jp", tiles: jpNew(), opp, stake, pending: null };
  _say(`${opp} slides over the battered Jackpot box — nine tiles up, two dice, ` +
    "the felt worn smooth by ten thousand losing farang. Flip the dice, or flip " +
    "their sum. Lowest score wins; shut the box and it's JACKPOT.");
  _say(stake ? `฿${stake} rides on it.` : "No baht? Sanuk rules — loser drinks anyway.");
  _jpTurn();
}

function _jpTurn() {
  const g = G.game;
  for (;;) {
    const [d1, d2] = jpRoll(_rand);
    const moves = jpMoves(g.tiles, d1, d2);
    if (!moves.length) {
      _say(`You roll ${d1}+${d2} — nothing to flip. Stuck.`, "alert");
      _jpFinish();
      return;
    }
    if (moves.length === 1) {
      jpFlip(g.tiles, moves[0]);
      _say(`You roll ${d1}+${d2} → flip ${moves[0].join(" & ")}.   [ ${jpRender(g.tiles)} ]`);
      if (jpScore(g.tiles) === 0) { _jpFinish(); return; }
      continue;
    }
    g.pending = moves;
    _say(`You roll ${d1}+${d2}.   [ ${jpRender(g.tiles)} ]`);
    _say(`(FLIP ${moves[0].join(" ")} · FLIP ${moves[1].join(" ")})`, "dim");
    return;
  }
}

function _jpInput(input) {
  const g = G.game;
  if (!g.pending) { _jpTurn(); return; } // shouldn't happen; reroll
  const nums = (input.match(/\d/g) || []).map(Number).sort((a, b) => a - b);
  let move = g.pending.find(mv => mv.length === nums.length && mv.every((n, i) => n === nums[i]));
  if (!move && /sum/.test(input)) move = g.pending.find(mv => mv.length === 1);
  if (!move && /both|dice/.test(input)) move = g.pending.find(mv => mv.length === 2);
  if (!move) {
    _gameBoard();
    _say(`(FLIP ${g.pending[0].join(" ")} · FLIP ${g.pending[1].join(" ")} — those are the choices.)`, "dim");
    return;
  }
  jpFlip(g.tiles, move);
  g.pending = null;
  _say(`You flip ${move.join(" & ")}.   [ ${jpRender(g.tiles)} ]`);
  if (jpScore(g.tiles) === 0) { _jpFinish(); return; }
  _jpTurn();
}

function _jpFinish() {
  const g = G.game;
  const you = jpScore(g.tiles);
  if (you === 0) {
    _setFlag("hitJackpot");
    _endGame(true, g.stake * 3, "JACKPOT! Every tile down. The whole bar drinks and " +
      `${g.opp} pays triple with the face of a woman updating her opinion of you in real time.`);
    return;
  }
  _say(`Your score: ${you}. House rules — you drink for ${you} seconds while the bar counts.`);
  _engineSpeak(thaiNum(you));
  const her = jpAutoRound(_rand);
  _say(`${g.opp} takes the cup. ${her.rolls.join(" · ")}.`, "dim");
  if (her.score === 0) {
    _endGame(false, 0, `Every tile down — JACKPOT, hers. The bar erupts. You drink again, ` +
      `on principle${g.stake ? `, and your ฿${g.stake} stays with the till` : ""}.`);
  } else if (her.score < you) {
    _endGame(false, 0, `Her score: ${her.score}. Low wins — she wins.` +
      (g.stake ? ` Your ฿${g.stake} vanishes into the bra of commerce.` : " Sanuk, they said."));
  } else if (her.score > you) {
    _endGame(true, g.stake * 2, `Her score: ${her.score}. Low wins — YOU win. ` +
      `${g.opp} pays up with a wai and the sideways look reserved for lucky farang.`);
  } else {
    _endGame(null, g.stake, `Her score: ${her.score}. Dead even — stakes back, and she ` +
      "pours two shots of something evil to settle it spiritually.");
  }
}

// ─ Quiz night ─
// Thursday (day 1 = Monday), 20:00–22:00, at three bars drawn per-week by a
// pure hash — same three all night, whatever you save or undo. Walking into
// one mid-window makes you a contestant; the host does not take no.

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function _weekday() { return WEEKDAYS[G.day % 7]; }

// All calendar checks go through these helpers — in a future shared world the
// clock becomes the server's, and these are the only seams to re-plumb.
function _quizDay() { return G.day % 7 === 4; }

function _isQuizWindow() {
  return _quizDay() && G.nightTurn >= 20 && G.nightTurn < 40;
}

// Deterministic three bars for this particular Thursday (no _rand: reading
// the schedule must never advance the dice).
function _quizBars() {
  let h = G.vacation * 7919 + G.day * 104729 + 12345;
  const pool = [...QUIZ_BARS];
  const picked = [];
  for (let i = 0; i < 3; i++) {
    h = (h * 48271) % 2147483647;
    picked.push(pool.splice(h % pool.length, 1)[0]);
  }
  return picked;
}

function _quizHere() {
  return _isQuizWindow() && _quizBars().includes(G.room) && !G.quizPlayed[G.room];
}

function _startQuiz() {
  G.quizPlayed[G.room] = true;
  // five questions, drawn without repeats
  const pool = [...Array(QUIZ_POOL.length).keys()];
  const qs = [];
  for (let i = 0; i < 5; i++) qs.push(pool.splice(Math.floor(_rand() * pool.length), 1)[0]);
  G.game = { type: "quiz", qs, at: 0, right: 0 };
  _say("Too late — the microphone has already found you. “A NEW TEAM, ladies and " +
    "gentlemen!” Quiz night: five questions, the bar as your audience, prizes on " +
    "the board. A hostess hands you a pencil you will not need and a beer mat " +
    "you will.", "win");
  _say("(Answer 1, 2, or 3. QUIT slinks back out to the street.)", "dim");
  _quizAsk();
}

function _quizAsk() {
  const g = G.game;
  const item = QUIZ_POOL[g.qs[g.at]];
  _say(`Question ${g.at + 1} of 5: ${item.q}`, "room");
  item.opts.forEach((o, i) => _say(`  ${i + 1}. ${o}`, "dim"));
}

function _quizInput(input) {
  const g = G.game;
  const item = QUIZ_POOL[g.qs[g.at]];
  let pick = null;
  const m = input.match(/[1-3]/);
  if (m) pick = +m[0] - 1;
  else {
    const idx = item.opts.findIndex(o => o.toLowerCase().includes(input.trim()));
    if (idx >= 0 && input.trim().length > 1) pick = idx;
  }
  if (pick === null) { _gameBoard(); _say("1, 2, or 3 — the microphone is patient, the bar less so.", "dim"); return; }
  if (pick === item.a) {
    g.right++;
    _say(`“${item.opts[item.a]}” — CORRECT! The bar cheers like you cured something.`);
  } else {
    _say(`“${item.opts[pick]}”… the host winces on your behalf. It was ` +
      `“${item.opts[item.a]}”. The table of teachers from Rayong smirks.`, "alert");
  }
  g.at++;
  if (g.at < 5) { _quizAsk(); return; }
  // scoring
  const right = g.right;
  G.game = null;
  _say(`Final score: ${right} of 5.`, "room");
  if (right === 5) {
    G.money += 500;
    _setFlag("quizChamp");
    _say("A PERFECT ROUND. The host demands a bow; the bar demands a speech; the " +
      `board demands your name in chalk. First prize: ฿500 off the till. ` +
      `(฿${G.money} in pocket.)`, "win");
    _addHappy(5);
  } else if (right === 4) {
    G.money += 200;
    _say(`Second place overall — ฿200 and a round of applause you'll remember ` +
      `longer than the money. (฿${G.money}.)`, "win");
    _addHappy(3);
  } else if (right === 3) {
    G.soc.drunk++;
    G.thirst = Math.max(0, G.thirst - 20);
    _say("Respectable. The house stands you a consolation Chang, which is the " +
      "true and ancient purpose of quiz night.", "win");
    _addHappy(1);
    _checkDrunk();
  } else {
    _say("The host reads your score with the gentle tone reserved for tourists " +
      "and the recently concussed. “Next week, my friend. Study.” The teachers " +
      "from Rayong collect the prize, as always.");
  }
}

// ─ Killer pool (league night) ─

const KP_ENTRY = 100;
const KP_FIELD = [
  ["Bank's cousin Gop", 0.55], ["Big Kev", 0.6], ["a silent Finn", 0.65],
  ["Daeng's nephew", 0.5], ["a piwin still in his vest", 0.6],
];

function _leagueTonight() { return G.day % 3 === 0; }
function _isBandNight() { return G.day % 7 === 5 || G.day % 7 === 6; } // Fri or Sat
function _bandHere() {
  const r = _room();
  return !!(r.liveMusic && (r.musicEveryNight || _isBandNight()));
}
function _bandNearby() {
  if (_bandHere()) return true;
  return Object.values(_room().exits).some(to => {
    const r = ROOMS[to];
    return r && r.liveMusic && (r.musicEveryNight || _isBandNight());
  });
}

function _startKiller() {
  if (!_room().pool) { _say("Killer needs a real table. The Stinky Bar's is the league's home felt."); return; }
  if (!_leagueTonight()) {
    _say("No league tonight — killer runs every third night. " +
      (G.day % 3 === 2 ? "Tomorrow." : "Check back in a couple of days.") +
      " The table's free for a regular frame (PLAY POOL).", "dim");
    return;
  }
  if (G.money < KP_ENTRY) { _say(`Entry's ฿${KP_ENTRY} in the ashtray. You have ฿${G.money}. Spectating is free.`); return; }
  G.money -= KP_ENTRY;
  const field = [];
  const used = new Set();
  while (field.length < 4) {
    const i = Math.floor(_rand() * KP_FIELD.length);
    if (!used.has(i)) { used.add(i); field.push(KP_FIELD[i]); }
  }
  const names = ["You", ...field.map(f => f[0])];
  const skills = [0, ...field.map(f => f[1])];
  G.game = { type: "kp", kp: kpNew(names, skills), stake: KP_ENTRY * names.length };
  _say("League night. The ashtray fills with hundred-baht notes, the field chalks " +
    `up, and somebody racks. Five players, three lives each, ฿${G.game.stake} in ` +
    "the pot. Pot anything or lose a life; last cue standing takes the lot.");
  _say(kpRender(G.game.kp), "dim");
  _say("(Your shot each round: SHOT (safe, 60%) or POWER (flashy, 45% — glory or " +
    "grief). QUIT forfeits your lives.)", "dim");
}

function _kpInput(input) {
  const g = G.game;
  const kind = /power|smash/.test(input) ? "power" :
    /shot|pot|cut|hit|play|safe/.test(input) ? "shot" : null;
  if (!kind) { _gameBoard(); _say("SHOT or POWER — the table is waiting.", "dim"); return; }
  const you = kpShot(g.kp, _rand, kind === "power" ? 0.45 : 0.6);
  if (you.potted) {
    _say(kind === "power" ?
      "You lean into it — the ball SLAMS home and the bar goes quiet for one " +
      "beautiful second." : "Clean pot. The felt forgives you another round.");
  } else {
    _say(`Miss. ${you.player.lives > 0 ? `Life gone (${you.player.lives} left).` :
      "That was your last life. You're out."}`, you.out ? "alert" : "");
  }
  // the table plays around to you
  while (!kpOver(g.kp) && g.kp.turn !== 0) {
    const r = kpShot(g.kp, _rand);
    if (r.out) _say(`${r.player.name} misses and is OUT. A moment of silence; the moment ends.`, "dim");
    else if (!r.potted) _say(`${r.player.name} rattles it — a life gone.`, "dim");
  }
  if (kpOver(g.kp)) {
    const winner = kpAlive(g.kp)[0];
    if (winner && winner.name === "You") {
      _setFlag("wonLeague");
      _endGame(true, g.stake, `Last cue standing. The pot — ฿${g.stake} — is pushed ` +
        "across the felt with due ceremony, and the owner rings the bell himself. " +
        "League night belongs to you.");
    } else {
      _endGame(false, 0, `${winner ? winner.name : "The table"} takes the pot. You take ` +
        "a stool, and the bar takes your name for next league night. That's killer.");
    }
    return;
  }
  _say(kpRender(g.kp), "dim");
  _say("(Your shot.)", "dim");
}

// ─ Pool ─

function _startPool() {
  if (!_room().pool) { _say("No pool table here. The Midnight Sun has one; so does Daeng's place out on Khao Talo."); return; }
  const daeng = G.room === "khao_talo_bar";
  const opp = daeng ? "Daeng" : "a leathery expat off the rail who hasn't missed since 1997";
  const stake = _takeStake(POOL_STAKE);
  G.game = { type: "pool", you: 7, opp: 7, oppName: daeng ? "Daeng" : "the old boy",
    oppSkill: daeng ? 0.65 : 0.6, oppNext: null, oppWon: false, stake };
  _say(`You rack. ${opp} breaks — dry. Seven balls each, then the black.`);
  _say(stake ? `฿${stake} under the corner cushion.` : "You're skint, so it's for the table — winner stays on.");
  _say("(Each visit: SHOT, POWER, or SAFETY · QUIT concedes.)", "dim");
}

function _poolStatus(g) {
  _say(`(You: ${g.you || "on the black"} · ${g.oppName}: ${g.opp || "on the black"}.)`, "dim");
}

function _poolOppTurn(g) {
  const potted = poolOppVisit(g, _rand);
  if (g.oppWon) {
    _endGame(false, 0, `${g.oppName} clears up like it's a chore and rolls the black in ` +
      `dead-weight. Game over${g.stake ? ` — your ฿${g.stake} slides off the cushion` : ""}.`);
    return;
  }
  _say(potted === 0 ? `${g.oppName} rattles the jaws and swears softly. Your table.` :
    `${g.oppName} pots ${potted}, then runs out of angle. Your table.`);
  _poolStatus(g);
}

function _poolInput(input) {
  const g = G.game;
  const kind = /power|smash|break/.test(input) ? "power" :
    /safe|snook|tuck/.test(input) ? "safety" :
    /shot|pot|cut|hit|play|roll/.test(input) ? "shot" : null;
  if (!kind) { _gameBoard(); _say("(SHOT sensible · POWER greedy · SAFETY sneaky.)", "dim"); return; }
  const ev = poolShot(g, kind, _rand);
  switch (ev) {
    case "pot8win":
      _endGame(true, g.stake * 2, "The black glides in off the cushion like it was " +
        "always going there. You straighten up slowly, because legends move slowly." +
        (g.stake ? ` ฿${g.stake * 2} from under the cushion.` : ""));
      return;
    case "sink8lose":
      _endGame(false, 0, "POWER. The pack scatters gloriously — and the black wanders " +
        "across the table and drops. Silence. House rules are house rules" +
        (g.stake ? `; the stake stays under the cushion, which is no longer your cushion` : "") + ".");
      return;
    case "pot":
      _say(g.you === 0 ? "Clean pot — and that's your seven. On the BLACK." :
        `Clean. The ball drops with a click. (${g.you} left.) Still your shot.`);
      return;
    case "pot2":
      _say(g.you === 0 ? "Two thunder down off one brutal hit — that's your seven. On the BLACK." :
        `Two balls thunder down off one hit. The bar notices. (${g.you} left.) Still your shot.`);
      return;
    case "safety":
      _say("You tuck the cue ball behind traffic. Quietly vicious.");
      _poolOppTurn(g);
      return;
    case "miss":
      _say(g.you === 0 ? "The black wobbles in the jaws… and stays. Agony." : "Rattle. No drop.");
      _poolOppTurn(g);
      return;
  }
}

// ─ Shared plumbing ─

// won: true / false / null (push). payout is added to money (escrow already taken).
function _endGame(won, payout, text) {
  G.money += payout;
  G.game = null;
  _say(text, won === false ? "alert" : "win");
  if (won === true && payout) _say(`(฿${G.money} in pocket.)`, "dim");
  if (won === true) _addHappy(3);
  else if (won === false) _addHappy(-1);
}

function _gameQuit() {
  const g = G.game;
  G.game = null;
  if (g.type === "quiz") {
    _say("You mumble something about the toilet and keep walking, past the toilet, " +
      "out the door. Behind you the host announces your departure to the whole " +
      "bar. Some tuition is social.", "alert");
    G.room = _room().exits.out || Object.values(_room().exits)[0];
    _describeRoom(true);
    return;
  }
  _say(g.stake ? `You concede. The stake stays where stakes stay. (฿${G.money} left.)` :
    "You concede with what dignity remains.");
}

function _gameInput(input) {
  switch (G.game.type) {
    case "c4": _c4Input(input); break;
    case "jp": _jpInput(input); break;
    case "pool": _poolInput(input); break;
    case "kp": _kpInput(input); break;
    case "quiz": _quizInput(input); break;
  }
}

// Draw just the live game's board/state — no hint. Non-mutating (quiz re-asks
// its question, jp just shows the tiles). Shared by the resume redraw
// (_renderGame) and each handler's "that wasn't a move" reprompt.
function _gameBoard() {
  const g = G.game;
  if (!g) return;
  switch (g.type) {
    case "c4":   _say(c4Render(g.board)); break;
    case "jp":   _say(`[ ${jpRender(g.tiles)} ]`); break;
    case "kp":   _say(kpRender(g.kp), "dim"); break;
    case "pool": _poolStatus(g); break;
    case "quiz": _quizAsk(); break;
  }
}

// Re-render the live mini-game after a restore. serializeGame persists G.game,
// but the restore paths (continue / undo, in main.js) only re-describe the room
// — so a resumed game was invisible while still swallowing every command as a
// move. This redraws the board/state and the input hint for whatever's live, so
// the player can see the game is on and how to act. Called after deserializeGame.
function _renderGame() {
  const g = G.game;
  if (!g) return;
  _say("(A bar game is still in progress — here's where it stands:)", "dim");
  _gameBoard();
  switch (g.type) {
    case "c4":   _say("(You're ●. Tap a column 1-7 to drop · Q quits.)", "dim"); break;
    case "jp":
      if (g.pending) _say(`(FLIP ${g.pending[0].join(" ")} · FLIP ${g.pending[1].join(" ")})`, "dim");
      else _say("(Flip the dice — type anything to roll.)", "dim");
      break;
    case "kp":   _say("(Your shot: SHOT or POWER. QUIT forfeits your lives.)", "dim"); break;
    case "pool": _say("(Each visit: SHOT, POWER, or SAFETY · QUIT concedes.)", "dim"); break;
    case "quiz": _say("(Answer 1, 2, or 3. QUIT slinks back out.)", "dim"); break;
  }
}

// ── Bar social life ─────────────────────────────────────────────────────────
// Lady drinks buy goodwill, one girl at a time. Actions (flirt < kiss < spank
// < fondle) resolve against her favor: rebuffed → tolerated → leaned into →
// reciprocated. Roles cap the physical stuff — cashiers and mamasans allow
// light contact only, unless the bell has rung enough times tonight. Each bell
// ring while the glow holds warms the whole room a notch (_bellLevel/_favor):
// two bells and the girls are much friendlier; at three the room is yours —
// every action reciprocates and heat can't land (_addHeat is amnestied). Heat
// accumulates on bad behaviour; three strikes and security walks you out
// (in LK Metro, shared complex security bans you from every bar in the maze).

const SEV = { flirt: 0, kiss: 3, spank: 4, fondle: 5 };
const BELL_GLOW = 25;  // turns the whole bar loves you after a ring
const BAN_TURNS = 40;  // security shift length

function _inBar() { return !!_room().barType; }

function _bellActive() {
  const t = G.soc.bellAt[G.room];
  return t !== undefined && G.turns - t < BELL_GLOW;
}

// A friendly non-working woman (British lesbian, a punter's wife) who's taken a
// shine to you will vouch — the girls trust her, so you ride her credit briefly.
function _wingman() { return G.wingmanUntil > G.turns; }

// How many bells you've rung here while the glow still holds — the escalation
// dial for the whole room. 0 once it cools. Each ring makes the girls wilder;
// at 3 the room is yours (see _favor for warmth, _addHeat for the amnesty).
function _bellLevel() {
  return _bellActive() ? (G.soc.bells[G.room] || 0) : 0;
}

function _favor(id) {
  let f = G.soc.drinks[id] || 0;
  if (G.soc.mamaTreat[G.room]) f += 1;   // the mamasan's blessing travels
  const bl = _bellLevel();               // more rings this visit, warmer room
  if (bl >= 3) f += 10;                  // three bells: the room is yours, hands-on
  else if (bl === 2) f += 4;             // two bells: much friendlier
  else if (bl === 1) f += 2;             // one bell: everybody loves the bell man
  if (_wingman()) f += 2;                // a wing-woman put in a good word
  return f;
}

function _addHeat(n) {
  if (_bellLevel() >= 3) return;         // three bells deep — the room forgives everything
  const r = G.room;
  G.soc.heat[r] = (G.soc.heat[r] || 0) + n;
  if (G.soc.heat[r] >= 3) { _kickOut(); return; }
  if (G.soc.heat[r] === 2) {
    _say("(The mamasan is watching you now with the expression of a woman " +
      "pricing a problem. One more and you're somebody else's story.)", "alert");
  }
}

// APOLOGIZE / SAY SORRY: the wai-and-mean-it. Mollifies a miffed patron
// outright (like standing him a beer does), and burns off one point of heat —
// but only once per bar per night; after that the bar wants behavior, not words.
function _doApologize() {
  const r = G.room, s = G.soc;
  if (_inBar()) {
    if (s.patronMiffed[r]) {
      delete s.patronMiffed[r];
      s.heat[r] = Math.max(0, (s.heat[r] || 0) - 1);
      _say("You wai the regular and say it straight — out of line, my fault, " +
        "sorry. He studies you for a second, then waves it off with his bottle. " +
        "“Forget it, mate. Heat of the moment.” Form restored.");
      return;
    }
    if ((s.heat[r] || 0) > 0) {
      s.apologized = s.apologized || {};
      if (s.apologized[r]) {
        _say("You've spent tonight's apology here. Words are ฿0 and priced " +
          "accordingly — from here on the bar is watching what you do.");
        return;
      }
      s.apologized[r] = true;
      s.heat[r]--;
      _say("You put your hands together and offer the wai of a man who knows " +
        "exactly what he did. The mamasan holds your eye for a long moment — " +
        "then nods, once. The temperature in the room comes down a degree.");
      return;
    }
    _say("Nothing to apologize for. Tonight. The mamasan banks the credit " +
      "against future behavior, of which she has seen plenty.");
    return;
  }
  _say("You apologize to the street at large. A passing hostess pats your arm " +
    "— “up to you, na.” Pattaya forgives by default; it just doesn't forget.");
}

function _kickOut() {
  const here = G.room, r = _room();
  G.soc.banned[here] = G.turns;
  G.soc.heat[here] = 0;
  G.game = null; // any live game dies with your welcome
  _say("The decision is made somewhere above your pay grade. Security appears at " +
    "your elbow — polite, enormous, terribly final — and you are walked out and " +
    "deposited on the soi with your dignity in a doggy bag.", "alert");
  if (r.region === "Tree Town" || r.region === "LK Metro") {
    for (const [id, rm] of Object.entries(ROOMS)) {
      if (rm.region === r.region && rm.barType) G.soc.banned[id] = G.turns;
    }
    _say(`(The piwins outside radio ahead. You are now famous in every bar in ` +
      `${r.region}, in the worst way.)`, "alert");
  }
  _addHappy(-5);
  G.room = r.exits.out || Object.values(r.exits)[0];
  _describeRoom(true);
}

// Outcome text: [hard rebuff, soft rebuff, tolerate, lean in, reciprocate]
const _SOCIAL_TEXT = {
  flirt: [
    null, null,
    n => `${n} receives your best line with the professional warmth of a woman ` +
      "who has heard nine thousand better ones tonight alone. “Ooo, so sweet, na.”",
    n => `${n} laughs for real this time, touches your arm, and tells you ` +
      "something genuinely rude about the man at the end of the bar. Progress.",
    n => `${n} slides onto the stool beside you, steals a sip of your drink, and ` +
      "starts flirting back with alarming professionalism. The other girls exchange looks.",
  ],
  kiss: [
    n => `You lean in. ${n} leans back — the full matador. The kiss lands on ` +
      "ambient air; a slap lands on you, precisely, like punctuation. The bar notices.",
    n => `${n} presents a cheek at the last microsecond — professional deflection, ` +
      "executed with the footwork of a woman who has dodged far better. “Buy drink first, tilac.”",
    n => `A quick peck is permitted, the way one permits a puppy on a sofa. ` +
      `${n} pats your cheek: “Okay, okay. Sanuk.”`,
    n => `${n} allows it — and takes her time about it. The cashier rings the ` +
      "till just to make a noise.",
    n => `${n} kisses YOU, decisively, to a smattering of applause from the far ` +
      "end of the bar. You are now, officially, sitting with her.",
  ],
  spank: [
    n => `${n} catches your wrist mid-air with a speed that suggests long practice, ` +
      "and the look she gives you drops the bar five degrees. Somewhere behind you, " +
      "security uncrosses its arms.",
    n => `${n} sidesteps neatly. “Uh-uh. You not buy enough drink for that, tilac.” ` +
      "The mamasan's eyes flick your way like a till drawer closing.",
    n => `A token swat is absorbed with an eye-roll and precisely zero sincerity. ` +
      `“Hundred-fifty baht says you can try again, na.”`,
    n => `${n} yelps theatrically, laughs, and returns fire twice as hard. ` +
      "Yours was a swat; hers is a correction.",
    n => `${n} struts past deliberately slowly — then spanks YOU on the way back, ` +
      "to a roar from the entire bar. You have been out-Pattaya'd.",
  ],
  fondle: [
    n => `Your hand sets off in a direction it has no visa for. ${n} removes it ` +
      "like a bomb-disposal expert, and the smile she keeps on while doing it is " +
      "the scariest thing you've seen tonight.",
    n => `${n} intercepts your hand and returns it to your own knee, patting it ` +
      "twice — stay. “Naughty hands drink more first, na.”",
    n => `${n} tolerates approximately 1.5 seconds of wandering hand before ` +
      "redirecting it to the Connect 4 box. “Play this instead.”",
    n => `${n} settles in closer and lets the moment linger just past professional. ` +
      "The mamasan develops an intense interest in the till.",
    n => `${n} takes both your hands, inspects them like market produce, and puts ` +
      "them where she wants them — around her waist, while she orders herself " +
      "another lady drink on your tab. Checkmate, but you don't mind.",
  ],
};

function _doSocial(kind, targetWord) {
  const w = (targetWord || "").replace(/^with /, "").trim();
  const here = _npcsHere();
  const id = w ? _findNpc(w) : (here.length === 1 ? here[0] : null);
  if (!id) {
    _say(w ? "They're not here." :
      `You ${kind} the ambience. The neon flickers back, noncommittally.`);
    return;
  }
  const name = NPCS[id].name;
  const role = NPC_ROLES[id];

  // outside a bar this almost never goes well (the katoey encounter, handled
  // by its own resolver, is the famous exception)
  if (!_inBar()) {
    if (kind === "flirt") {
      _say(id === "nok" ?
        "Auntie Nok cackles like a drain and offers you a discount mango. Rejected, fondly." :
        `${name} receives the attempt the way one receives weather.`);
      return;
    }
    if (id === "bank" || id === "security") {
      const lost = Math.min(G.money, 20);
      G.money -= lost;
      _say(`You attempt it. ${name} removes your hand, folds it carefully back ` +
        "into your own pocket, and explains — kindly, the way you'd explain to a " +
        "child — what happens to farang who try that on the street. " +
        (lost ? `Somewhere in the lesson, ฿${lost} becomes a tuition fee.` :
          "The lesson is free, this once."), "alert");
      return;
    }
    if (id === "gary") {
      _say("Gary has been happily married for twenty-two years and radiates it " +
        "like lake air. The attempt dissolves before contact.");
      return;
    }
    _say(`THWACK. ${id === "nok" ? "The flat of Auntie Nok's flip-flop is faster " +
      "than the human eye. The whole soi applauds her." :
      `${name} makes it very clear, at street volume, that the bar rules do not ` +
      "apply where there are no bars. Faces appear in doorways. None of them are on your side."}`, "alert");
    return;
  }

  // bar staff who are not bar girls
  if (!role) {
    if (id === "security") {
      if (SEV[kind] >= 4) {
        _say(`You ${kind} security. There is a brief silence in which several ` +
          "large men become one organism.", "alert");
        G.soc.heat[G.room] = 3;
        _kickOut();
        return;
      }
      _say("Security accepts the compliment with a nod that suggests you should " +
        "go and sit down now.");
      return;
    }
    if (id === "dj_beer") {
      _say("DJ Beer converts your affection into a fist-bump without breaking the " +
        "crossfade. “Love you too, bro. Still no Wonderwall.”");
      return;
    }
    _say(`${name} would rather you didn't.`);
    return;
  }

  // role caps: cashiers and mamasans allow light contact only — until the
  // bell has rung enough to rewrite the rules of the room
  if (SEV[kind] >= 4 && role !== "hostess" && (G.soc.bells[G.room] || 0) < 2) {
    _say(role === "mamasan" ?
      `You do NOT do that to the mamasan. The room stops breathing. ${name} ` +
      "studies you the way one studies a stain, and the security boys begin " +
      "their slow, happy walk." :
      `${name} looks up from the till with the face of an accountant reviewing ` +
      "a crime. Cashiers keep the books, not the customers. (The bell has been " +
      "known to change the mathematics.)", "alert");
    _addHeat(2);
    return;
  }

  // the bra you bought her makes fondling "more interesting" — one tier warmer
  const braBump = (kind === "fondle" && G.soc.bra && G.soc.bra[id]) ? 2 : 0;
  const net = _favor(id) - SEV[kind] + braBump;
  const tier = net <= -3 ? 0 : net <= -1 ? 1 : net <= 1 ? 2 : net <= 3 ? 3 : 4;
  const fn = _SOCIAL_TEXT[kind][tier];
  _say(fn(name), tier === 0 ? "alert" : tier >= 3 ? "win" : "");
  if (braBump && tier >= 3) _say("(The bra you bought her is, as advertised, doing work.)", "dim");
  if (tier === 0) { _addHeat(SEV[kind] >= 4 ? 2 : 1); _addHappy(-1); }
  else if (tier === 1 && SEV[kind] >= 4) _addHeat(1);
  else if (tier === 3) _addHappy(1);
  else if (tier === 4) _addHappy(3);
  if (tier >= 3) _maybeSelfBarfine(id);
  if (kind === "fondle" && tier === 4 && G.money >= LADY_DRINK) {
    G.money -= LADY_DRINK;
    G.soc.drinks[id] = (G.soc.drinks[id] || 0) + 1;
    _say(`(-฿${LADY_DRINK} for her drink. ฿${G.money} left, and worth it.)`, "dim");
  }
}

// ─ The ceiling game ─
// Going commando is technically illegal in Thailand and cheerfully unenforced;
// a braless dancer wears nipple covers, and the bar sport is to peel one and
// fling it at the ceiling — how long it sticks, and who it lands on when it
// drops, is the whole joke. She only hands you the ammunition if she's warmed
// to you (favor ≥ 2; the bell, which lifts the whole room, counts). Landing on
// the regular is bad form (miffs him) and on the mamasan is real heat.
function _doThrowCover(targetWord) {
  if (!_inBar()) {
    _say("Out here there's no low ceiling and nobody wearing the ammunition. " +
      "The game is a bar sport.");
    return;
  }
  const here = _npcsHere();
  const girls = here.filter(x => NPC_ROLES[x] === "hostess");
  const w = (targetWord || "").trim();
  let id = w ? _findNpc(w) : (girls.length === 1 ? girls[0] : null);
  if (id && NPC_ROLES[id] !== "hostess") {
    _say(`${NPCS[id].name} is not playing that game — and the look she gives you ` +
      "says the covers stay exactly where they are.");
    return;
  }
  if (!id) {
    if (!girls.length) {
      _say("Nobody here is wearing any. The ceiling game needs a braless dancer " +
        "and a low ceiling, and this room is short one dancer.");
      return;
    }
    _say("Whose? There's a floor full of candidates — THROW COVER AT <name>.");
    return;
  }
  const name = NPCS[id].name;
  if (_favor(id) < 2) {
    _say(`You reach for ${name}'s nipple cover with the confidence of a man who ` +
      "has badly misjudged the room. She clamps a hand over it and laughs you off: " +
      "“Buy drink first, tilac, THEN maybe we play.” (No favor bought, no ammunition.)");
    return;
  }
  _say(`${name} peels one pastie off with a grin, presses it into your palm — ` +
    "“okay, farang, show me” — and half the bar tips its head back. You wind up " +
    "and fling it at the ceiling. THWP.", "win");
  const stick = 1 + Math.floor(_rand() * 6); // a 1–6 count of suspense
  if (stick >= 6) {
    _say("It STICKS. Dead centre, defying gravity and Thai law in one motion, and " +
      "it does not come down. The bar erupts; a cheer goes up the length of the " +
      "counter and someone starts a chant. Legend — for tonight, anyway.", "win");
    _addHappy(2);
    _engineSpeak("สุดยอด");
    return;
  }
  _say(`It clings for a heroic count of ${stick}, the whole bar tracking it like ` +
    "a penalty kick…");
  const roll = _rand();
  if (roll < 0.35) {
    _say("…then peels off and lands squarely back on YOU — in your own beer. The " +
      "bar loses it. You fish it out and wear it on your forehead like a medal. " +
      "Sanuk.");
    _addHappy(1);
  } else if (roll < 0.6) {
    const others = girls.filter(g => g !== id);
    const onName = others.length ? NPCS[others[Math.floor(_rand() * others.length)]].name
      : "the next dancer along";
    _say(`…then drops on ${onName}, who shrieks, laughs, and rockets it straight ` +
      "back at your head. Now it's a war, and the mamasan is pretending very hard " +
      "not to enjoy it.");
    _addHappy(1);
  } else if (roll < 0.85) {
    _say("…then parachutes down onto the bald spot of the regular at the end of the " +
      "bar. He does not find it as funny as you do. (Bad form — a beer for him might " +
      "cool it off.)", "alert");
    G.soc.patronMiffed[G.room] = true;
    _addHeat(1);
  } else {
    _say("…then lands, of all the shoulders in Pattaya, on the MAMASAN's. The room " +
      "goes quiet. She lifts it off between two fingers like a dead moth and gives " +
      "you the look that has closed better bars than this one.", "alert");
    _addHeat(2);
  }
}

// ─ The bell ─

function _doBell() {
  if (!_inBar()) { _say("No bell out here. The bell is a bar instrument, like the till."); return; }
  if (G.money < BELL_PRICE) {
    _say(`The bell rope dangles there, daring you. A ring is a round for the ` +
      `house — ฿${BELL_PRICE} — and you have ฿${G.money}. Ringing a bell you ` +
      "can't pay for is how farang end up in the khlong.");
    return;
  }
  G.money -= BELL_PRICE;
  const r = G.room;
  G.soc.bellAt[r] = G.turns;
  G.soc.bells[r] = (G.soc.bells[r] || 0) + 1;
  G.soc.heat[r] = 0;
  delete G.soc.patronMiffed[r];
  _say("You reach up and RING THE BELL.", "win");
  _say("The bar detonates. Cheering from the girls, a drum-roll on the counter " +
    "from the cashier, the mamasan's first fully unguarded smile of the night. " +
    "Drinks materialise down the length of the bar and every lady in the room " +
    `now knows your name. (-฿${BELL_PRICE}, ฿${G.money} left — reign while it lasts.)`);
  const rings = G.soc.bells[r];
  if (rings === 2) {
    _say("(That's two bells this visit. The girls are giddy now, the whole room " +
      "tilting hard your way — hardly anything you try lands wrong.)", "dim");
  } else if (rings >= 3) {
    _say("(THREE bells. You own this bar tonight. The ladies are all over you, " +
      "the mamasan's looking the other way, and nobody — nobody — is counting.)", "win");
  }
  _engineSpeak("ชนแก้ว");
  _addHappy(2);
}

// ─ Patrons ─

function _doPatron() {
  const s = G.soc;
  if (s.patronMiffed[G.room]) {
    _say("The regular gives you the shoulder of a man whose evening you dented " +
      "when you bought his girl that drink. Bad form, and he knows you know. " +
      "(A beer for him might mend it.)");
    return;
  }
  if (_bellActive()) {
    _say("“THAT'S the fella!” The regular toasts you with a Chang the size of a " +
      "fire extinguisher and insists on buying you one back. You are, briefly, " +
      "his favourite person alive.");
    s.drunk++;
    G.thirst = Math.max(0, G.thirst - 20);
    _addHappy(1);
    _checkDrunk();
    return;
  }
  const d = s.drunk;
  // the football comes first; the football always comes first
  if (_footy() && _rand() < 0.25) {
    const f = _footy();
    const team = _barTeam();
    const done = f.games.filter(x => x.done);
    const mine = done.filter(x => x.h === team || x.a === team);
    const g = mine.length ? mine[mine.length - 1] : done[done.length - 1];
    if (!g) {
      const nx = f.games.find(x => !x.done);
      _say(`“${nx.h} against ${nx.a},” the regular says, tapping the fixture ` +
        `list like a racing form. “Kickoff's two in the morning, our time. ` +
        `I'll be here. I'm always here.”`);
      return;
    }
    const winner = g.hs > g.as ? g.h : g.as > g.hs ? g.a : null;
    if (team && winner === team) {
      // the one football→mechanics crossing: his team won, everybody drinks
      _say(`The regular is INCANDESCENT with joy. “${_fmtGame(g)}! Did you SEE ` +
        `it?” You did not see it. It does not matter. He flags the cashier and ` +
        `buys the whole rail a round, you included, because tonight the world ` +
        `is just and ${team} are proof.`);
      s.drunk++;
      G.thirst = Math.max(0, G.thirst - 20);
      _addHappy(1);
      _checkDrunk();
    } else if (team && (g.h === team || g.a === team)) {
      _say(`“${_fmtGame(g)},” the regular says, and then nothing else for a ` +
        `while. Forty years he's given ${team}. The bar has learned to leave ` +
        `the silence alone; you learn it now too.`);
    } else {
      _say(`The regular delivers a full studio panel's worth of analysis on ` +
        `${_fmtGame(g)} — formations, refereeing, the state of the modern game — ` +
        `unpaid, unprompted, and unfinished. The ${f.league} is a wound that ` +
        `never closes.`);
    }
    return;
  }
  // the moaning index: no expat conversation survives contact with the baht
  if (_fxRates() && _rand() < 0.2) {
    const [code, sym, name] = _FX_CURRENCIES[Math.floor(_rand() * _FX_CURRENCIES.length)];
    const rate = _fxRates()[code];
    const golden = Math.round(rate * 1.25);
    _say(`The regular taps his phone calculator like it owes him money. ` +
      `“฿${rate}. That's what ${name} gets you now — ${sym}1, ฿${rate}. When I ` +
      `moved out here it was ฿${golden}. THIS TOWN USED TO BE CHEAP.” The girls ` +
      `mouth the speech along with him, word for word, nightly for nine years.`);
    return;
  }
  // the other liturgy: no expat has ever been the right temperature
  if (_wxNow() && _rand() < 0.15) {
    const wx = _wxNow();
    if (_wxRainy()) {
      _say("The regular nods at the doorway, where the rain has just started " +
        "ticking on the awning again and a hostess is already hauling the " +
        "street stools in. “Rainy season, mate. The girls love it — barfine " +
        "weather, they call it. Nobody goes home alone in the rain.” He says " +
        "it like a man quoting scripture, which, locally, he is.");
    } else {
      _say(`The regular fans himself with a beer mat. “${wx.temp} degrees,” he ` +
        `announces, as though personally wronged. “But it's not the heat, is it. ` +
        `It's the humidity.” The humidity, currently ${wx.humid}%, declines to comment.`);
    }
    return;
  }
  // the end of the rail, where the laser eyes never dimmed
  if (_btc() && _rand() < 0.1) {
    const b = _btc();
    _say(`From the end of the rail, the other regular — laser eyes still on ` +
      `his profile picture — announces to nobody: “฿${b.thb.toLocaleString("en-US")} ` +
      `a coin. I told everyone in 2019. Did they listen?” They didn't listen. ` +
      `They are not listening now, either, which he takes as further proof.`);
    return;
  }
  // a man with a paper and opinions — when there are headlines to have them about
  if (_newsFeed().length && _rand() < 0.25) {
    const h = _headline();
    _say(`The regular raps yesterday's paper with the back of his hand. ` +
      `“Seen this?” — “${h.t}”${h.s ? ` (${h.s})` : ""} — “Course, they don't ` +
      "tell you the HALF of it,” he adds, telling you none of it.");
    return;
  }
  if (d === 0) {
    _say(["The regular appraises you over his glass. “First night? Wai the " +
      "mamasan, mate. Doors open.”",
      "“Sober, are we,” says the regular, not unkindly. “The girls talk to the " +
      "cashiers, and the cashiers hear everything. That's free, that is.”",
    ][Math.floor(_rand() * 2)]);
  } else if (d <= 3) {
    _say(["The regular warms up over shared beers: bar gossip, fuel prices, which " +
      "mamasans danced where, back when. “Buy the mama a drink,” he confides. " +
      "“The girls treat you different after. House might even stand you one.”",
      "You and the regular put the world to rights. “See that bell?” he says, " +
      "pointing his bottle. “Ring it once and every girl in here loves you for " +
      "an hour. Expensive way to be handsome, but it works.”",
      "The regular tells you a long story about a night on Soi 6 in 2009 that " +
      "ends with the phrase “and THAT is why I can't go back to Bristol.” " +
      "Solid company, this man.",
      "The regular nods at a fresh-faced kid down the bar mooning over a hostess. " +
      "“White knight. Gonna try and rescue her by Friday, skint by Sunday, Flying " +
      "Club by high season if his mates don't fly him home first. Seen it a " +
      "hundred times.” He drinks. “The girls do the arithmetic better than we do.”",
      "The regular leans in, quieter: “You drink on Soi 6, you're drinking with " +
      "the White Dish Group, whoever's name is over the door. Front company. " +
      "Fella called Ryan Powers behind it — Brit, never here, always here. Bars " +
      "run fine. Just don't go asking who owns what.”",
    ][Math.floor(_rand() * 5)]);
    s.patronFriend = s.patronFriend || {};
    if (!s.patronFriend[G.room]) { s.patronFriend[G.room] = true; _addHappy(1); }
  } else {
    _say("You explain your theory about baht bus economics at what turns out to " +
      "be considerable length and volume. The regular studies his beer. The " +
      "regular moves one stool away.");
    if (d >= 6) _addHeat(1);
  }
}

// ── Happiness (สนุก) — the long game ─────────────────────────────────────────
// The Last Baht Bus is Act One. After it, Pattaya is a sandbox and the goal
// is the oldest one on the soi: get happy. Everything feeds the meter.

const HAPPY_LEVELS = [
  [100, "สบายสบาย — sabai sabai"],
  [50, "สบาย — sabai"],
  [25, "สนุก — sanuk"],
  [10, "โอเค — finding your feet"],
  [0, "เหนื่อย — running on empty"],
];

function _happyLevel(h) {
  return HAPPY_LEVELS.find(([t]) => h >= t)[1];
}

function _addHappy(n) {
  if (!n) return;
  const before = _happyLevel(G.happy);
  G.happy = Math.max(0, G.happy + n);
  _say(`(${n > 0 ? "+" : ""}${n} สนุก)`, "dim");
  const after = _happyLevel(G.happy);
  if (n > 0 && after !== before) {
    if (G.happy >= 100 && !_flag("sabaiSabai")) {
      _setFlag("sabaiSabai");
      _say("═══════════════════════════════════", "win");
      _say("★ สบายสบาย ★", "win");
      _say("Somewhere between the last laugh and this one, it happened: nowhere " +
        "to be, nothing owed, cold bottle, warm night, a city full of people who " +
        "know your name. You are, officially, happy. The DJ, unprompted, plays " +
        "your song.", "win");
      _engineSpeak("สบายสบาย");
      _say("(The night keeps going. So can you.)", "dim");
    } else {
      _say(`✨ ${after}`, "win");
    }
  }
}

// ── The clock, the body, the week ────────────────────────────────────────────
// Ten turns to the hour, nights run 18:00–04:00. Hunger and thirst creep up,
// drunk creeps down, and any of them redlining ends the night early. Days are
// slept through; the game is the nights. A vacation is seven days; expats
// don't count.

const NIGHT_TURNS = 100;

function _clockStr() {
  const h = (18 + Math.floor(G.nightTurn / 10)) % 24;
  return `${String(h).padStart(2, "0")}:00`;
}

function _checkDrunk() {
  if (G.soc.drunk >= 9) _endNight("blackout");
}

function _endNight(reason) {
  G.game = null;
  G.pendingEnc = null;
  G.pendingFare = null;
  switch (reason) {
    case "dawn":
      _say("The sky over the gulf goes grey, then pink, and even Pattaya blinks. " +
        "04:00. The last bars stack their stools; the baht buses carry home the " +
        "wreckage; somewhere a rooster who fears nothing starts up. You drift " +
        "back and let the day take you.", "room");
      break;
    case "collapse":
      _say(G.thirst >= G.hunger ?
        "The neon smears, the pavement tilts, and the last thing you register " +
        "is a motorcycle taxi vest and the words “mai pen rai, boss, I got you.” " +
        "Dehydration takes the rest of the night." :
        "Your legs vote no-confidence. You fold up gently next to a som tam cart " +
        "whose owner feeds you out of pure pity before calling you a ride. " +
        "Hunger wins the night.", "alert");
      _addHappy(-8);
      break;
    case "blackout": {
      const lost = Math.min(300, G.money);
      G.money -= lost;
      _say("Somewhere after that last bottle the film simply stops. There are " +
        "flashes — singing? a traffic cone? — and then nothing." +
        (lost ? ` The morning audit finds ฿${lost} unaccounted for.` : ""), "alert");
      _addHappy(-5);
      break;
    }
    case "hurt": {
      const bill = Math.min(500, G.money);
      G.money -= bill;
      _say("Enough. Tonight the city won on points. A quiet clinic off Third Road " +
        "patches you up with the efficiency of long practice" +
        (bill ? ` and relieves you of ฿${bill}` : "") +
        ". The nurse's parting wai contains multitudes.", "alert");
      _addHappy(-8);
      break;
    }
    case "barfine":
      _say("The rest is nobody's business but the soi's: a shared plate of khao " +
        "man gai at 3 a.m., the beach road with nobody on it, laughing at " +
        "nothing. What happens in Pattaya has already forgotten your name by " +
        "morning, fondly.", "win");
      if (_flag("act1Done") && G.stage !== "act1" && G.hotel === "sabai" && G.money >= 300) {
        G.money -= 300;
        _say("(Under the Sabai Palms' one working porch light, the night clerk " +
          "produces the joiner ledger: ฿300, and a look with footnotes.)", "dim");
      }
      _addHappy(10);
      break;
    case "sleep":
      _say("You call it. The air-con rattles its lullaby, the neon leaks through " +
        "the curtains, and Pattaya carries on politely without you.", "room");
      break;
    case "robbed": {
      const safeRoom = _flag("act1Done") && G.stage !== "act1" && G.hotel === "metropole";
      const lost = Math.min(G.money,
        safeRoom ? 1000 : 800 + Math.floor(_rand() * 2200));
      G.money -= lost;
      let took = "";
      if (!safeRoom) {
        for (const it of ["shades", "fake_rolex"]) {
          if (G.itemLoc[it] === "inventory") { G.itemLoc[it] = null; took = ITEMS[it].name; break; }
        }
      }
      _say("The night itself is fine — better than fine. It's the morning that " +
        "isn't. You surface at some colourless hour to an empty pillow, the door " +
        "on the latch, and the specific silence of a room that has been quietly, " +
        "expertly emptied. " +
        (lost ? `฿${lost} gone` : "Nothing left worth taking") +
        (took ? `, and your ${took} with it` : "") + ". No bar, no mamasan, no one " +
        "to complain to — freelance cut the other way. You didn't even hear her leave.",
        "alert");
      if (safeRoom) {
        _say("(The Metropole room safe held everything that mattered. She got the " +
          "pocket money and the lesson stayed cheap. The front desk has seen " +
          "this face before and offers coffee.)", "dim");
      }
      _addHappy(-6);
      break;
    }
  }
  G.day++;
  if (G.stage !== "expat" && G.day > 7) { _endVacation(); return; }
  let hangover = G.soc.drunk;
  G.soc.drunk = 0;
  // the Sabai Palms perk: Naklua quiet takes one size off the morning after
  const _quietHelped = _flag("act1Done") && G.hotel === "sabai" && hangover > 0;
  if (_quietHelped) hangover--;
  G.soc.bellAt = {};
  G.soc.heat = {};
  G.soc.banned = {};
  G.soc.patronBusy = {};
  G.soc.patronMiffed = {};
  G.soc.apologized = {}; // a new shift will hear you out afresh
  G.soc.selfBf = false;
  G.soc.butterflyTeased = false;
  G.selfBfId = null;
  G.quizPlayed = {};
  G.phone.msgCd = {};
  G.phone.invite = null;
  for (const id in ENCOUNTERS) if (ENCOUNTERS[id].nightly) delete G.encDone[id]; // the street restocks
  G.hurt = 0;
  G.hunger = Math.min(85, 30 + hangover * 5);
  G.thirst = Math.min(90, 40 + hangover * 6);
  G.nightTurn = 0;
  G.darkStreak = 0;
  G.lightOn = false;
  G.safeTries = 0;
  if (_flag("act1Done")) { G.room = _hotelRoomId(); G.battery = 100; }
  else { G.room = "jomtien_beach"; G.battery = Math.max(G.battery, 20); }
  _say("");
  _chargeRent();
  if (_quietHelped) _say("(Naklua quiet: the hangover wakes one size smaller.)", "dim");
  _say(`── DAY ${G.day}${G.stage === "expat" ? " · PATTAYA, HOME" : " of 7"} — you ` +
    "surface mid-afternoon, and by the time you're human again the sun is " +
    "sliding into the gulf and the neon is waking up ──", "win");
  if (hangover >= 4) _say("(The hangover is a physical presence with opinions. Water. Food. Mercy.)", "alert");
  _describeRoom(true);
}

function _endVacation() {
  G.pendingChoice = "vacation_end";
  G.bestHappy = Math.max(G.bestHappy, G.happy);
  _say("═══════════════════════════════════", "win");
  _say("The week is up. The taxi to the airport leaves in an hour, and the city " +
    "doesn't come to see you off — it just keeps roaring, the way it was " +
    "roaring before you came, the way it will roar after. From the highway " +
    "the neon shrinks to a smudge on the coast.", "win");
  _say(`VACATION ${G.vacation}: happiness ${G.happy} — ${_happyLevel(G.happy)}` +
    (G.bestHappy > G.happy ? ` (best trip so far: ${G.bestHappy})` : " (your best trip yet)"), "win");
  _say("So. What now?", "room");
  _say("(NEW VACATION — fly back next month. No lost wallet this time. Probably.)", "dim");
  _say("(MOVE TO PATTAYA — stop pretending you're going home. Make the move; live the sandbox.)", "dim");
}

function _newVacation() {
  G.stage = "vacation";
  G.vacation++;
  G.pendingChoice = null;
  G.day = 1;
  G.nightTurn = 0;
  G.happy = 0;
  delete G.flags.sabaiSabai;
  _setFlag("act1Done");
  _setFlag("hasWallet");
  G.money = SAFE_CASH;
  G.battery = 100;
  G.hunger = 20;
  G.thirst = 30;
  G.hurt = 0;
  G.soc = { drinks: {}, mamaTreat: {}, bellAt: {}, bells: {}, heat: {},
    banned: {}, patronBusy: {}, patronMiffed: {}, bra: {}, drunk: 0 };
  G.itemLoc.phone = "inventory";
  G.itemLoc.charger = "inventory";
  G.itemLoc.wallet = "inventory";
  G.hotel = "sabai"; // a fresh booking always starts where the story did
  G.room = "hotel_room";
  _say("");
  _say("A month of grey sky and greyer meetings, and then the seatbelt sign " +
    "pings off over the gulf. Same Sabai Palms. Same terrible, perfect bed. Room 412 " +
    `keeps your secrets. ฿${SAFE_CASH} in the safe, seven nights on the clock.`, "win");
  _say(`── VACATION ${G.vacation} · DAY 1 of 7 ──`, "win");
  _describeRoom(true);
}

function _goExpat() {
  G.stage = "expat";
  G.pendingChoice = null;
  _setFlag("act1Done");
  _setFlag("hasWallet");
  G.money += EXPAT_SAVINGS;
  G.nightTurn = 0;
  G.hunger = 20;
  G.thirst = 30;
  G.hurt = 0;
  G.soc.drunk = 0;
  G.battery = 100;
  G.hotel = "sabai"; // the long-stay rate is a 412 negotiation
  G.room = "hotel_room";
  _say("");
  _say("You don't board. It's remarkably little paperwork, in the end: a visa " +
    "run, a long-stay rate on room 412 negotiated over exactly one bottle of " +
    "Sang Som with the night clerk, and your savings wired over — " +
    `฿${EXPAT_SAVINGS}, blinking on an ATM screen like a dare. The soi absorbs ` +
    "the news without comment. Candy just sets out your glass.", "win");
  _say("★ EXPAT MODE — no flights, no clock on the week. The city is yours to " +
    "figure out. (They say the smart ones end up owning a bar…) ★", "win");
  _say(`── DAY ${G.day} · PATTAYA, HOME ──`, "win");
  _describeRoom(true);
}

