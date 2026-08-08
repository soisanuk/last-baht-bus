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

// Capitalise a leading interpolation. A no-op for real NPC names (already
// capitalised); it fixes the staff-less "the hostess on shift" fallback when it
// opens a sentence ("the hostess racks the frame…" → "The hostess…").
function _ucfirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Who takes the seat across the table: a canon girl if one's here, else any
// of the bar's staff (the filler cast plays too). Returns { id, name } — id
// null only in a staffless room; her Connect 4 depth comes from _c4Depth(id).
function _gameHostess() {
  const here = _npcsHere();
  const id = here.find(n => CANON_HOSTESSES.includes(n)) ||
    here.find(n => NPC_ROLES[n]) || null;
  return { id, name: id ? NPCS[id].name : "the hostess on shift" };
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
  if (_room().darts) out.push("darts");
  return out;
}

// Legal Connect 4 drops right now — the wheel's and autocomplete's column
// list during a live game; empty whenever c4 isn't the game in progress.
function _c4Choices() {
  if (!G || !G.game || G.game.type !== "c4") return [];
  return ["1", "2", "3", "4", "5", "6", "7"]
    .filter(c => G.game.board[0][+c - 1] === 0);
}

// The two legal jackpot flips right now ("3 4" and "7") — the wheel's and
// autocomplete's move list while a roll is waiting on a pick; empty whenever
// jackpot isn't mid-roll (no pending choice).
function _jpChoices() {
  if (!G || !G.game || G.game.type !== "jp" || !G.game.pending) return [];
  return G.game.pending.map(mv => mv.join(" "));
}

// The words a live mini-game answers to — autocomplete's verb row while a
// game has the floor (every other verb is dead air until it ends).
function _gameVerbs() {
  if (!G || !G.game) return [];
  switch (G.game.type) {
    case "c4": return ["drop", "1", "2", "3", "4", "5", "6", "7", "q", "quit"];
    case "jp": return ["flip", ..._jpChoices(), "quit"];
    case "pool": case "killer": return ["shot", "power", "safety", "quit"];
    case "darts": return ["big", "steady", "finish", "quit"];
    case "quiz": return ["1", "2", "3", "quit"];
  }
  return ["quit"];
}

const _JUKEBOX_DEAD = [
  "You jab the buttons. Somewhere in its chest the jukebox makes a noise like a fridge " +
    "giving up — a descending mechanical groan, a click, and silence. It died in 2019 and " +
    "resents the reminder.",
  "The jukebox wheezes, spins up half a second of warped Thai pop pitched down to a dirge, " +
    "then coughs itself dark again. Pia doesn't look over. \"It don't work. Everybody try.\"",
  "A hopeful thunk from inside, a grinding whir, and then the specific silence of a machine " +
    "that has decided, permanently, against you. The playlist on the speakers plays on, indifferent.",
];

function _doPlay(arg) {
  if (G.game) { _say("One game at a time, champ."); return; }
  const w = arg.toLowerCase();
  // The Golden Dragon's jukebox has been dead since 2019 — poke it and it says so.
  if (/juke/.test(w) && G.room === "golden_dragon") { _say(_pickVary(_JUKEBOX_DEAD, "juke")); return; }
  if (w.includes("jackpot") || w.includes("dice")) return _startJackpot(w);
  if (w.includes("killer") || w.includes("league")) return _startKiller();
  if (w.includes("dart")) return _startDarts();
  if (w.includes("pool") || w.includes("8") || w.includes("billiard")) return _startPool();
  if (w.includes("connect") || w.includes("four") || w.includes("4")) return _startC4();
  const opts = _playOptions();
  if (opts.length) _say("Play what? " + opts.map(o => "PLAY " + o.toUpperCase()).join(" · ") + ".", "dim");
  else _say("Nothing to play here — the beer bars keep Connect 4 and Jackpot within reach.", "dim");
}

// ─ Connect 4 ─

function _startC4() {
  if (!_barGamesHere()) { _say("No Connect 4 board here — every beer bar keeps one within arm's reach."); return; }
  const { id, name } = _gameHostess();
  const depth = _c4Depth(id);
  const stake = _takeStake(C4_STAKE);
  G.game = { type: "c4", board: c4New(), opp: name, oppId: id, depth, stake };
  // the intro telegraphs the tier — read your opponent before you bet
  if (depth >= 8) {
    _say(`${_ucfirst(name)} has the Connect 4 frame up and loaded before you finish asking. ` +
      "This is not her first game today. It is not her hundredth.");
  } else if (depth <= 2) {
    _say(_fmt("{n} lights up, fetches the frame, and drops a counter on the way " +
      "over. She sorts the colours carefully and counts hers twice. Down the " +
      "bar, one of the older girls watches with something between fondness and pity.",
      { n: _ucfirst(name) }));
  } else {
    _say(_fmt("{n} racks the frame with the easy speed of a woman who plays " +
      "every shift, and gives you first drop like it costs her nothing. It doesn't.",
      { n: _ucfirst(name) }));
  }
  _say(stake ? _fmt("฿{s} on the table.", { s: stake }) :
    "You're broke, so this one's for sanuk — and her professional pride.");
  _say(c4Render(G.game.board));
  _say("(You're ●. Tap a column 1-7 to drop · Q quits.)", "dim");
}

// ─ The Darkside lock-in ─
// Out past Sukhumvit the law says midnight. What actually happens depends on
// the till: a customer or three spending freely — a bell rung, lady drinks
// flowing, the mamasan treated — and a lockIn-flagged bar (enclosed, aircon,
// windows painted out) bolts the front door instead of closing. Nobody in,
// nobody out, and the night stops being PG. Everyone else gets the shutters.
// State: G.soc.lockIn[room] (nightly, rides the soc reset). PG-13 wink per
// canon — referenced, never depicted.
function _lockedIn() { return !!(G.soc.lockIn && G.soc.lockIn[G.room]); }

function _barSpendTonight(room) {
  let drinks = 0;
  for (const [id, n] of Object.entries(G.soc.drinks)) {
    if (NPCS[id] && _npcRoom(id) === room) drinks += n;
  }
  return (G.soc.bells[room] || 0) >= 1 || G.soc.mamaTreat[room] || drinks >= 3;
}

// Bars that keep the law's hours: gentleman's clubs, most of Soi 6, and the
// Darkside all shut at MIDNIGHT (nightTurn 60). The Queen Vic pub and the town's
// beer bars and go-gos run to dawn. The exception is a Darkside lock-in — the
// bolt goes across and the party runs on for those already inside and spending.
function _closesMidnight(id) {
  const r = ROOMS[id];
  return !!(r && r.barType) &&
    (r.barType === "gents" || r.barType === "soi6" || r.region === "Darkside");
}
function _closedNow(to) {
  return _flag("act1Done") && _closesMidnight(to) && G.nightTurn >= 60 &&
    !(G.soc.lockIn && G.soc.lockIn[to]);
}
function _closedMsg(to) {
  const r = ROOMS[to];
  if (r.region === "Darkside")
    return "Shutters down, lights dead, chairs up. The Darkside keeps the law's " +
      "hours — officially. Somewhere along the strip one padded door still thumps " +
      "with bass from a bar that is definitely, legally, closed.";
  if (r.barType === "gents")
    return "The gentleman's club is dark and bolted. They keep gentleman's hours — " +
      "the afternoon-and-early trade is long done by midnight, before the go-gos " +
      "have hit their stride. Come back when the golf finishes tomorrow.";
  if (G.mode === "soi6")
    return "Soi 6's shutters are down, the frontages black, the sound systems finally " +
      "and mercifully off. Whatever you were after here shut at midnight — the beer bars " +
      "and the Queen Vic are what's still awake now.";
  return "Soi 6's shutters are down, the frontages black, the sound systems finally " +
    "and mercifully off. Whatever you were after here shut at midnight — it's " +
    "Walking Street or nowhere now.";
}
// 30-minute last call (nightTurn 55 ≈ 23:30), once per bar per night — a courtesy,
// and a nudge to BARFINE before the door shuts.
function _lastCall(id) {
  G.soc.lastCall = G.soc.lastCall || {};
  if (G.soc.lastCall[id]) return;
  G.soc.lastCall[id] = true;
  _say("Last call — the mamasan taps her watch: about half an hour to closing. " +
    "This place shuts at midnight, so if you mean to take a lady home tonight, now " +
    "is the moment to BARFINE. After the shutters come down it's the street.", "alert");
}

// The climax the game is named for: the ฿15 ride home has a curfew. One town-wide
// heads-up in the last half hour before the final songthaew (nightTurn 75–79 ≈ the
// 1 o'clock hour, last bus at LAST_BUS_TURN = 02:00) — a prompt to break for a main
// road, or commit to the piwin's tax / the dark walk / a rough wake.
function _lastBusWarn() {
  // Soi 6 mode can't ride the bus and is always steps from the Queen Vic — the
  // last-baht-bus race (and its warning) is a full-game mechanic only.
  if (G.mode === "soi6") return;
  if (!_flag("act1Done") || G.over || G.lastBusWarned) return;
  if (G.nightTurn < LAST_BUS_TURN - 5 || G.nightTurn >= LAST_BUS_TURN) return;
  if (G.room === _hotelRoomId()) return; // already home — no race left to run
  G.lastBusWarned = true;
  _say(_fmt("Somewhere a songthaew driver checks his watch and turns the truck toward the " +
    "depot. The last baht bus makes its final run at two — call it half an hour off. " +
    "Get to a main road for the ฿{fare} ride home, or the small hours belong to the piwins " +
    "and their prices. This is the hour the whole night has been counting down to.",
    { fare: BUS_FARE }), "alert");
}

// ── The bar manager ──────────────────────────────────────────────────────────
// A distinct NPC type (marked `manager:true` on the NPCS entry, deliberately NOT
// in NPC_ROLES so lady-logic — barfine/lady-drink/tip/contact — ignores him).
// Hired help, not the owner: keeps regulars company, pours free shots, and is
// stood a "man drink" back when you monopolise his time (_buyManDrink). Bert is
// the exemplar. Reading-customers / interrupt / burnout are deferred.
function _managerHere() {
  return _npcsHere().find(id => NPCS[id] && NPCS[id].manager) || null;
}
// The house welcome: a free shot, once per bar per night (sandbox only — the
// tutorial stays dry). You're expected to reciprocate with a man drink.
//
// This was one fixed string, which was wrong twice: it repeats (once per bar
// per night, across every bar with a manager), so the pools rule applies; and
// it put "bud" in every manager's mouth, which is right for Bert and Bob and
// absurd from a thirty-year-old Englishman. So — a shared pool, plus an
// optional per-manager `shot` pool on the NPCS entry for anyone whose voice the
// generic lines don't fit. {n} is the manager's name.
const _MGR_SHOT = [
  "{n} slides a shot down the bar before you've even sat: “House rule, bud — first one's " +
    "on me. Chok dee.” It goes down like a warm handshake.",
  "A shot arrives that you did not order. {n} is already looking elsewhere. “House pours " +
    "the first one. Don't get excited, everybody gets it.”",
  "{n} pours two, drinks one, and slides the other over. “To whatever brought you up the " +
    "road.” The glass is on the bar again before you've finished swallowing.",
  "“New face.” {n} sets a shot in front of you with two fingers. “First one's the house's. " +
    "After that we're strangers again.” He's grinning when he says it.",
  "The shot lands before the greeting does. “Chok dee,” says {n}, already turning back to " +
    "the till. “That one's mine. The rest are yours.”",
  "{n} nods at the stool, then at the shot he has just put on it. “Sit. Drink that. Then " +
    "tell me what you actually want.”",
];
function _managerWelcome() {
  if (!_flag("act1Done") || G.over) return;
  const id = _managerHere();
  if (!id) return;
  G.soc.mgrShot = G.soc.mgrShot || {};
  if (G.soc.mgrShot[G.room]) return;
  G.soc.mgrShot[G.room] = true;
  G.soc.drunk++;
  _addHappy(1);
  const pool = (NPCS[id].shot && NPCS[id].shot.length) ? NPCS[id].shot : _MGR_SHOT;
  _say(_fmt(_pickVary(pool, "mgrshot:" + id), { n: NPCS[id].name }) +
    " (Stand him a BUY MAN DRINK when you've been bending his ear.)", "win");
}

function _closingTick() {
  if (!_flag("act1Done") || G.over) return;
  if (!_closesMidnight(G.room) || _lockedIn()) return;
  const r = _room();
  // the last-call courtesy in the final half hour
  if (G.nightTurn >= 55 && G.nightTurn < 60) { _lastCall(G.room); return; }
  if (G.nightTurn < 60) return;
  // midnight. A Darkside bar with a spender bolts the door instead of shutting it.
  if (r.region === "Darkside" && r.lockIn && _barSpendTonight(G.room)) {
    (G.soc.lockIn = G.soc.lockIn || {})[G.room] = true;
    const mama = _npcsHere().find(n => NPC_ROLES[n] === "mamasan");
    _say(`Midnight. ${mama ? NPCS[mama].name : "The mamasan"} looks at the till, ` +
      "looks at you, and nods once to the cashier. The bolt goes across the " +
      "front door with a sound like a decision. The windows, you realise, were " +
      "always painted black.", "win");
    _say("Somebody turns the music up instead of down. Somebody else turns the " +
      "aircon colder. Clothing on the staff side of the bar becomes, by visible " +
      "increments, negotiable — and what happens after that stays inside the " +
      "paint. The Darkside closes at midnight. This is not closed. This is the " +
      "other thing.", "win");
    _say("(The party runs while the money does. OUT and she unbolts the door — " +
      "but there's no coming back in tonight.)", "dim");
    _addHappy(3);
    return;
  }
  // everyone else: shutters down, walked out to the street
  _say(r.region === "Darkside" ?
    "Midnight on the Darkside. The mamasan claps twice, the shutters start " +
    "down, and the ladies walk the last customers out with practiced fondness. " +
    "The bars that stay lively after this hour lock their doors first — and " +
    "they lock them for the customers already spending." :
    r.barType === "gents" ?
    "Midnight, and the club draws its shutters — gentleman's hours. A lady walks " +
    "you to the door with a kiss and a “come back tomorrow, na.” Whatever you " +
    "didn't get to here, you didn't get to." :
    "Midnight on Soi 6. The frontages roll down, the sound systems die mid-song, " +
    "and the ladies shoo the last punters back toward Beach Road. The party, such " +
    "as it was, is over.", "alert");
  // a barfine still mid-negotiation dies with the shutters — else its answer would
  // resolve against the street you've just been walked out onto (wrong barType/price).
  if (G.pendingBf) { G.pendingBf = null; _say("The half-finished barfine closes with the ledger — no deal, no harm, and the mamasan is already counting the till.", "dim"); }
  // Walk out. If the room we'd land in is ITSELF shut for the night (a back room
  // like the Orchid Room ejecting into its closed parent bar), keep following the
  // way out until we reach somewhere actually open — otherwise the player lands in
  // a closed bar that renders fully lively.
  let dest = r.exits && r.exits.out;
  for (let guard = 0; dest && _closedNow(dest) && guard < 4; guard++) {
    const next = ROOMS[dest].exits && ROOMS[dest].exits.out;
    if (!next || next === dest) break;
    dest = next;
  }
  if (dest) { G.room = dest; _describeRoom(true); }
}

// ─ Distractions at the board ─
// A parked saleng or a downpour pulls a girl's eyes off the game: she plays a
// tier down while it lasts — the shark like the floor, the floor like a new
// girl, a new girl barely at all. Never the mamasan. Checked per move (carts
// leave and rain stops mid-game); the transition prose keys off g.distKey,
// which rides the save so a restore doesn't re-announce it.
const _C4_DISTRACT = {
  food: n => `${n} keeps glancing past your shoulder at the food cart, nostrils ` +
    "working — she's counting moo ping skewers out there, not columns.",
  snacks: n => `${n} eyes the som-tam cart over your shoulder with open hunger, ` +
    "the pestle thudding out her heartbeat. Her drops come a beat late.",
  shoes: n => `${n} keeps stealing looks at the heels glittering on the shoe ` +
    "cart, playing you with one visible fraction of her attention.",
  lingerie: n => `${n} is barely at the table — the lingerie rack outside has ` +
    "her and two other girls in giggling conference between moves.",
  rain: n => `${n} watches the rain come down in sheets past the doorway, ` +
    "dropping her counters on autopilot.",
};
const _C4_REFOCUS = n => `${n}'s eyes come back to the board. The distraction ` +
  "has moved on. The girl across from you, unfortunately, has not.";
const _C4_IMMUNE = n => `${n} does not so much as glance at it. The board has ` +
  "her complete attention. It always did.";

function _c4Distraction() {
  if (_salengHere()) return G.salengCart;   // food | shoes | lingerie | snacks
  if (G.rain > 0) return "rain";
  return null;
}

// one rung down the ladder (see _c4Depth): 8 → 6 → 2 → 1
function _c4TierDown(d) { return d >= 8 ? 6 : d >= 6 ? 2 : 1; }

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
  // distractions: a saleng or a downpour costs the girls a tier — never the mama
  const cause = _c4Distraction();
  const immune = !!(g.oppId && NPC_ROLES[g.oppId] === "mamasan");
  let depth = g.depth || 8; // pre-tier saves: the shark
  if (cause && !immune) depth = _c4TierDown(depth);
  if ((cause || null) !== (g.distKey || null)) {
    if (cause) _say((immune ? _C4_IMMUNE : _C4_DISTRACT[cause])(g.opp));
    else if (!immune) _say(_C4_REFOCUS(g.opp));
    g.distKey = cause || null;
  }
  const ai = c4Ai(g.board, _rand, depth);
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
  const opp = _gameHostess().name; // jackpot is dice — no skill tier to carry
  const stake = _takeStake(want);
  // First game ever (flags.jpLearned unset): the hostess walks you through it —
  // every roll is a manual flip, even a forced one, so you learn the moves. After
  // that, forced single-option rolls auto-play and only real choices stop for you.
  const tutorial = !_flag("jpLearned");
  G.game = { type: "jp", tiles: jpNew(), opp, stake, pending: null, tutorial, taught: {} };
  _say(_fmt("{n} slides over the battered Jackpot box — nine tiles up, two dice, " +
    "the felt worn smooth by ten thousand losing farang. Flip the dice, or flip " +
    "their sum. Lowest score wins; shut the box and it's JACKPOT.", { n: _ucfirst(opp) }));
  _say(stake ? _fmt("฿{s} rides on it.", { s: stake }) : "No baht? Sanuk rules — loser drinks anyway.");
  if (tutorial) {
    _say(_fmt("{n} catches the look on your face and grins. \"First time, na? Okay — " +
      "I show you. Slow-slow. You do every flip yourself tonight; you learn faster " +
      "that way.\" She rolls for you.", { n: _ucfirst(opp) }));
  }
  _jpTurn();
}

// The FLIP prompt for a two-way roll: one tappable FLIP, the moves joined by
// "or" (a two-tile move grouped with "&", the join this file uses everywhere).
// One source of truth so the live turn, the illegal-move reprompt, and the
// resume redraw can't drift into three different formats.
function _jpHint(moves, tail) {
  return `(FLIP ${moves.map(m => m.join(" & ")).join(" or ")}${tail || ""})`;
}

// The hostess's first-game coaching — a beat the first time you meet each
// situation, then she lets you get on with it. Silent once you've learned.
function _jpTeach(g, moves) {
  if (!g.tutorial) return;
  if (moves.length === 2 && !g.taught.choice) {
    g.taught.choice = true;
    _say(_fmt("{n} leans in. \"Two ways here, na. Flip the two dice numbers — or " +
      "flip their sum, one tile. Never both. Whatever's still standing at the end " +
      "is your score, and low wins. You choose.\"", { n: g.opp }));
  } else if (moves.length === 1 && !g.taught.single) {
    g.taught.single = true;
    _say(_fmt("{n} taps the felt. \"This roll, only one way to play it — so play it. " +
      "Type the flip. The box doesn't move itself… not until you know it does.\"", { n: g.opp }));
  }
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
    // Normally a forced single-option roll auto-resolves; in the tutorial it
    // stops for you too, so you make every move and learn the game by playing it.
    if (moves.length === 1 && !g.tutorial) {
      jpFlip(g.tiles, moves[0]);
      _say(`You roll ${d1}+${d2} → flip ${moves[0].join(" & ")}.   [ ${jpRender(g.tiles)} ]`);
      if (jpScore(g.tiles) === 0) { _jpFinish(); return; }
      continue;
    }
    g.pending = moves;
    _say(`You roll ${d1}+${d2}.   [ ${jpRender(g.tiles)} ]`);
    _jpTeach(g, moves);
    _say(_jpHint(moves), "dim");
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
    _say(_jpHint(g.pending, " — those are the choices."), "dim");
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
  // You graduate by finishing your first full round — quit early and the hostess
  // patiently starts you over next time. From here the forced rolls auto-play.
  if (g.tutorial) {
    _setFlag("jpLearned");
    _say(`${g.opp} sweeps up the dice. "There — one whole round. Now you know ` +
      `Jackpot. Next time the forced rolls play themselves; only the real choices ` +
      `stop for you. Faster, na."`);
  }
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
  if (!_room().pool) { _say("Killer needs a real table. The Stinky Pinky's is the league's home felt."); return; }
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
  const opp = daeng ? "Daeng" : _L("a leathery expat off the rail who hasn't missed since 1997");
  const stake = _takeStake(POOL_STAKE);
  G.game = { type: "pool", you: 7, opp: 7, oppName: daeng ? "Daeng" : "the old boy",
    oppSkill: daeng ? 0.65 : 0.6, oppNext: null, oppWon: false, stake };
  _say(_fmt("You rack. {n} breaks — dry. Seven balls each, then the black.",
    { n: _ucfirst(opp) }));
  _say(stake ? _fmt("฿{s} under the corner cushion.", { s: stake })
    : "You're skint, so it's for the table — winner stays on.");
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

// ─ Darts (501) ─
// A staked bar game at any board (rooms flagged `darts:true`). Both start at 501
// and race to zero, checking out on a FINISH. Your aim is dragged down by drink,
// thirst, and hunger — the shakier you are, the wider the scatter. The opponent,
// annoyingly, doesn't have that problem.
const DARTS_STAKE = 40;

// Your steadiness, 0.25–1.0, pure over G. Clear-headed, watered and fed you throw
// at 1.0; every Chang past the second and every red-lining meter costs you aim —
// concentration and a steady hand are the first things the night takes.
function _dartsAim() {
  let aim = 1;
  const d = G.soc.drunk;
  if (d > 2) aim -= (d - 2) * 0.06;                                   // tipsy fine, hammered not
  if (G.thirst >= 80) aim -= 0.18; else if (G.thirst >= 55) aim -= 0.08;
  if (G.hunger >= 80) aim -= 0.18; else if (G.hunger >= 55) aim -= 0.08;
  return Math.max(0.25, Math.min(1, aim));
}

// One three-dart visit. mode "big" hunts the treble 20 (high variance); "steady"
// nurses singles. Pure given (mode, aim, rnd) → unit-testable. { score, darts }.
function _dartsVisit(mode, aim, rnd) {
  const darts = [];
  for (let i = 0; i < 3; i++) {
    const r = rnd();
    if (mode === "big") {
      if (r < aim * 0.42) darts.push(60);                              // treble 20
      else if (r < aim * 0.72) darts.push(20);                         // single 20
      else if (r < 0.9) darts.push([1, 5, 12, 20][Math.floor(rnd() * 4)]); // stray neighbour
      else darts.push(0);                                              // wire / off the board
    } else {
      if (r < aim) darts.push(20);
      else if (r < aim + (1 - aim) * 0.6) darts.push([5, 1, 19][Math.floor(rnd() * 3)]);
      else darts.push(0);
    }
  }
  return { score: darts.reduce((a, b) => a + b, 0), darts };
}

// A checkout attempt at `remaining` (must be ≤ 50). Pure. True on the exact finish —
// easier the smaller and tidier the number, and scaled by aim.
function _dartsFinish(remaining, aim, rnd) {
  if (remaining > 50 || remaining < 2) return false;
  const base = remaining <= 20 ? 0.6 : remaining <= 40 ? 0.42 : 0.3;
  return rnd() < base * aim;
}

// Why the arm's shaky tonight — names the meter costing the most aim, so the player
// can go fix it (water / food / slow the beers) instead of guessing.
function _dartsWobble() {
  const d = G.soc.drunk;
  if (G.thirst >= 55 && G.thirst >= G.hunger) return "Your mouth's chalk-dry and the board softens at the edges — a water would steady the arm.";
  if (G.hunger >= 55) return "Running on empty; that's not nerves in your hand, it's hunger. Food would help.";
  if (d > 2) return `${d} Changs in, and the treble twenty is doing a slow lap of itself. Steady does it.`;
  return "You're not quite at your steadiest tonight.";
}

function _startDarts() {
  if (!_room().darts) { _say("No dartboard here. The Office, the Cricketers, the sports bars — they keep one on the wall."); return; }
  // darts opponents are drinkers, not bar girls — only put a hostess on the oche
  // if one is actually working this room (never the "hostess on shift" fallback,
  // which would conjure one in a pub like the Queen Vic).
  const gh = _gameHostess();
  const opp = gh.id && _rand() < 0.5 ? gh.name : _L("a leathery expat with his own darts in a belt case");
  const stake = _takeStake(DARTS_STAKE);
  G.game = { type: "darts", you: 501, opp: 501, oppName: opp.length > 22 ? "the old boy" : opp, oppSkill: 0.62, stake };
  _say(_fmt("Chalk up: 501 each, straight off, check out on a double. {n} throws " +
    "for the bull to start and lands it like breathing.", { n: _ucfirst(opp) }));
  _say(stake ? _fmt("฿{s} on the shelf under the board.", { s: stake })
    : "You're skint — this one's for the sanuk and the sledging.");
  const aim = _dartsAim();
  if (aim < 0.72) _say(_dartsWobble(), "dim");
  _say("(Your throw: GO BIG (treble hunt) · STEADY (safe 20s) · FINISH when you're low · QUIT.)", "dim");
}

function _dartsStatus(g) { _say(`(You: ${g.you} · ${g.oppName}: ${g.opp}.)`, "dim"); }

function _dartsOppTurn(g) {
  if (_dartsFinish(g.opp, g.oppSkill, _rand)) {
    _endGame(false, 0, `${g.oppName} steps to the oche, barely sights it, and buries the double. ` +
      `Game. ${g.stake ? `Your ฿${g.stake} leaves the shelf.` : `"Bad luck, boss."`}`);
    return;
  }
  const { score } = _dartsVisit(g.opp <= 80 ? "steady" : "big", g.oppSkill, _rand);
  const next = g.opp - score;
  if (next < 2) _say(`${g.oppName} overcooks the visit and has to nurse it. Still ${g.opp}.`);
  else { g.opp = next; _say(`${g.oppName} rattles in ${score}. (${g.opp} left.)`); }
  _dartsStatus(g);
}

function _dartsInput(input) {
  const g = G.game;
  const mode = /\b(big|treble|ton|max|go)\b/.test(input) ? "big" :
    /\b(steady|safe|single|twenty|20)\b/.test(input) ? "steady" :
    /\b(finish|check|checkout|double|out|close)\b/.test(input) ? "finish" : null;
  if (!mode) { _dartsStatus(g); _say("(GO BIG · STEADY · FINISH (when low) · QUIT.)", "dim"); return; }
  const aim = _dartsAim();

  if (mode === "finish") {
    if (g.you > 50) { _say(`Too much left to check out (${g.you}) — score first: GO BIG or STEADY.`, "dim"); return; }
    if (_dartsFinish(g.you, aim, _rand)) {
      _endGame(true, g.stake * 2, "You call the double, take your time in a suddenly quiet bar, and post it " +
        `dead centre. ${g.stake ? `฿${g.stake * 2} off the shelf, and a nod from the old boy.` : "The bar erupts. Priceless."}`);
      return;
    }
    _say(aim < 0.6 ? "The dart sails wide — the arm just isn't yours tonight. No score." :
      "You catch the wire and it spits back out. Agonising. No score.");
    _dartsOppTurn(g);
    return;
  }

  const { score, darts } = _dartsVisit(mode, aim, _rand);
  if (g.you - score < 2) {
    _say(`${darts.join(", ")} — ${score}, and that busts it. Voided; still on ${g.you}.`, "alert");
  } else {
    g.you -= score;
    const pre = score >= 100 ? "The bar goes quiet for a beat. " : score === 0 ? "Three darts, nothing — grim. " : "";
    _say(`${pre}${darts.join(", ")} — ${score}. (${g.you} left.)`);
    if (g.you <= 50) _say("(Finishing range — FINISH to go for the double.)", "dim");
  }
  _dartsOppTurn(g);
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
    case "darts": _dartsInput(input); break;
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
    case "darts": _dartsStatus(g); break;
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
      if (g.pending) _say(_jpHint(g.pending), "dim");
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
// The Peacock Cabaret sells drinks and takes flirting seriously without any of
// the barType apparatus (no bells, games, closing hour, or barfine ledger) —
// social verbs and lady drinks treat it as a bar, everything else doesn't.
function _socialVenue() { return _inBar() || G.room === "peacock_cabaret"; }

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

// A ring (the bell, or a round for the band) bumps the room's ring count and
// refreshes the 25-turn glow. If the previous glow had already COOLED, the count
// restarts from zero — otherwise a stale early-evening 3-bell count would let a
// lone late ฿300 ring vault the room straight back to level 3+. Shared by both
// ring sites (the bell in _doBell, the band round in _doBuy).
function _ringBell(r) {
  const active = G.soc.bellAt[r] !== undefined && G.turns - G.soc.bellAt[r] < BELL_GLOW;
  G.soc.bells[r] = (active ? (G.soc.bells[r] || 0) : 0) + 1;
  G.soc.bellAt[r] = G.turns;
  G.soc.heat[r] = 0;
  delete G.soc.patronMiffed[r];
}

function _favor(id) {
  let f = G.soc.drinks[id] || 0;
  if (G.soc.mamaTreat[G.room]) f += 1;   // the mamasan's blessing travels
  if (G.soc.lockIn && G.soc.lockIn[G.room]) f += 3; // the lock-in: rules left with the last taxi
  if (_room().barType === "gents" && (G.soc.drinks[id] || 0) >= 1) f += 6; // gents club: buy her ONE drink and the staff get very hands-on (cold until you do)
  const bl = _bellLevel();               // more rings this visit, warmer room
  if (bl >= 3) f += 10;                  // three bells: the room is yours, hands-on
  else if (bl === 2) f += 4;             // two bells: much friendlier
  else if (bl === 1) f += 2;             // one bell: everybody loves the bell man
  if (_wingman()) f += 2;                // a wing-woman put in a good word
  if ((G.soc.drinks[id] || 0) < 3) {     // a stranger (below regular): first impressions ride on your name
    const rt = _repTier();               // ±1 only, never enough to override earned bond
    if (rt > 0) f += 1; else if (rt < 0) f -= 1;
  }
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
  _repHit(3); // being walked out by security is public and reads the same however you got there
  G.room = r.exits.out || Object.values(r.exits)[0];
  _describeRoom(true);
}

// Outcome text: [hard rebuff, soft rebuff, tolerate, lean in, reciprocate]
// Each reachable (kind × tier) slot is a small pool, drawn via _pickVary so the
// warm-up grind (repeated at the same tier while favour builds) doesn't wear a
// groove. flirt[0]/[1] stay null — SEV.flirt is 0, so flirt never drops that low.
// _fmt templates ({n}=name). EN output is byte-identical to the old interpolations;
// the German catalog reorders {n} as needed. Call site (fn(name)) is unchanged.
const _SOCIAL_TEXT = {
  flirt: [
    null, null,
    [
      n => _fmt("{n} receives your best line with the professional warmth of a woman who has heard nine thousand better ones tonight alone. “Ooo, so sweet, na.”", { n }),
      n => _fmt("{n} tilts her head, gives your line a two-second appraisal, and files it under harmless. “You funny man. Buy me drink, funny man.”", { n }),
    ],
    [
      n => _fmt("{n} laughs for real this time, touches your arm, and tells you something genuinely rude about the man at the end of the bar. Progress.", { n }),
      n => _fmt("{n} actually snorts, covers it, and leans an inch closer than the job requires. For a second the meter isn't running. Then it is again — but you saw it.", { n }),
    ],
    [
      n => _fmt("{n} slides onto the stool beside you, steals a sip of your drink, and starts flirting back with alarming professionalism. The other girls exchange looks.", { n }),
      n => _fmt("{n} decides you'll do for the night and turns the full wattage on — knee against yours, laughing before you finish the joke. The other girls give you up for lost.", { n }),
    ],
  ],
  kiss: [
    [
      n => _fmt("You lean in. {n} leans back — the full matador. The kiss lands on ambient air; a slap lands on you, precisely, like punctuation. The bar notices.", { n }),
      n => _fmt("You go for it; {n} simply isn't there. Where her face was is a flat palm and a look that could curdle Chang. “No.” Just the one word, and the bar heard it.", { n }),
    ],
    [
      n => _fmt("{n} presents a cheek at the last microsecond — professional deflection, executed with the footwork of a woman who has dodged far better. “Buy drink first, tilac.”", { n }),
      n => _fmt("{n} turns the kiss into a hug you didn't ask for and a laugh that closes the subject. “Slow, tilac. You want everything free tonight?”", { n }),
    ],
    [
      n => _fmt("A quick peck is permitted, the way one permits a puppy on a sofa. {n} pats your cheek: “Okay, okay. Sanuk.”", { n }),
      n => _fmt("A brief kiss is granted, then withdrawn like a sample. {n} taps your nose. “Enough. You greedy.”", { n }),
    ],
    [
      n => _fmt("{n} allows it — and takes her time about it. The cashier rings the till just to make a noise.", { n }),
      n => _fmt("{n} meets you halfway and holds it a beat past friendly. When she pulls back she's smiling at something she's decided not to tell you.", { n }),
    ],
    [
      n => _fmt("{n} kisses YOU, decisively, to a smattering of applause from the far end of the bar. You are now, officially, sitting with her.", { n }),
      n => _fmt("{n} takes your face in both hands and kisses you like she means the version of it she's selling. A glass goes up down the bar. You're hers for the night.", { n }),
    ],
  ],
  spank: [
    [
      n => _fmt("{n} catches your wrist mid-air with a speed that suggests long practice, and the look she gives you drops the bar five degrees. Somewhere behind you, security uncrosses its arms.", { n }),
      n => _fmt("Your hand doesn't get halfway. {n} steps out of range without appearing to move, and the temperature around you drops. A large man near the door stops chewing.", { n }),
    ],
    [
      n => _fmt("{n} sidesteps neatly. “Uh-uh. You not buy enough drink for that, tilac.” The mamasan's eyes flick your way like a till drawer closing.", { n }),
      n => _fmt("{n} pivots and your hand meets air. “Aht aht. That one cost more than you spend so far, tilac.” The till drawer of her eyes slides shut.", { n }),
    ],
    [
      n => _fmt("A token swat is absorbed with an eye-roll and precisely zero sincerity. “Hundred-fifty baht says you can try again, na.”", { n }),
      n => _fmt("A glancing swat lands and is filed with an unimpressed hum. “Mm. Buy two more drink, maybe I let you.” She's joking. Mostly.", { n }),
    ],
    [
      n => _fmt("{n} yelps theatrically, laughs, and returns fire twice as hard. Yours was a swat; hers is a correction.", { n }),
      n => _fmt("{n} jumps, laughs, and retaliates immediately and harder, to whoops from the next stool. You started a war you are structurally guaranteed to lose.", { n }),
    ],
    [
      n => _fmt("{n} struts past deliberately slowly — then spanks YOU on the way back, to a roar from the entire bar. You have been out-Pattaya'd.", { n }),
      n => _fmt("{n} lets it happen, turns, and returns the favour with interest and a wink, timing it for the exact moment the whole bar is looking. The applause is for her.", { n }),
    ],
  ],
  fondle: [
    [
      n => _fmt("Your hand sets off in a direction it has no visa for. {n} removes it like a bomb-disposal expert, and the smile she keeps on while doing it is the scariest thing you've seen tonight.", { n }),
      n => _fmt("Your hand embarks; {n} intercepts it at the border and hands it back, still smiling — the smile of a woman who has ended men for less and found it tedious.", { n }),
    ],
    [
      n => _fmt("{n} intercepts your hand and returns it to your own knee, patting it twice — stay. “Naughty hands drink more first, na.”", { n }),
      n => _fmt("{n} lifts your wandering hand by the wrist, sets it on the bar, and puts her cold drink in it. “Hold this. Safer.”", { n }),
    ],
    [
      n => _fmt("{n} tolerates approximately 1.5 seconds of wandering hand before redirecting it to the Connect 4 box. “Play this instead.”", { n }),
      n => _fmt("{n} allows the scenic route for exactly as long as it amuses her, then redirects your hand to your own beer. “Drink. Cool down, tilac.”", { n }),
    ],
    [
      n => _fmt("{n} settles in closer and lets the moment linger just past professional. The mamasan develops an intense interest in the till.", { n }),
      n => _fmt("{n} doesn't move your hand away this time — just raises an eyebrow that sets a price, and settles closer while you decide whether to pay it.", { n }),
    ],
    [
      n => _fmt("{n} takes both your hands, inspects them like market produce, and puts them where she wants them — around her waist, while she orders herself another lady drink on your tab. Checkmate, but you don't mind.", { n }),
      n => _fmt("{n} sighs, gives up the pretence, and arranges you around her like furniture she's chosen — then orders herself another lady drink on your tab, because winning shouldn't be free.", { n }),
    ],
  ],
};

// A farang man's pass only lands with a woman who's into men. Everyone else —
// another man, or a tom/tomboy who bats the other way — gets an awkward-to-hostile
// brush-off instead of the favor tiers, keyed to the target's disposition:
//   orientation "gay"  → the wrong-team let-down (she's into girls, same as you)
//   NPCS[id].flirtHostile → a cold, dangerous refusal (+heat)
//   otherwise          → awkward, brushed off good-naturedly
const _FLIRT_WRONGTEAM = [
  n => _fmt("{n} laughs, not unkindly. \"Aww, tilac — not my type. I like the ladies, same-same you.\" A pat on the cheek, and she's moved on.", { n }),
  n => _fmt("\"Handsome, but—\" {n} tips her head at a girl across the bar and grins. \"—wrong team, na. I bat the other way.\" No offence in it, plenty of amusement.", { n }),
];
const _FLIRT_AWKWARD = [
  n => _fmt("{n} blinks, then snorts. \"Ha — no. Not that way, mate. Buy me a beer if you like, but keep the eyelashes to yourself.\" More baffled than bothered.", { n }),
  n => _fmt("A beat of confusion, then {n} laughs it off and shifts his stool an inch away. \"Steady on, fella. Wrong tree entirely.\" Good-natured, but that's a no.", { n }),
];
const _FLIRT_HOSTILE = [
  n => _fmt("{n}'s face shuts like a door. \"No. Do that again and we have a problem.\" The temperature in your corner of the bar drops several degrees.", { n }),
  n => _fmt("\"You WHAT?\" {n} sets the glass down very deliberately. That is not a look you flirt through. Leave it.", { n }),
];
function _flirtUnwelcome(id, name) {
  const o = NPCS[id] && NPCS[id].orientation;
  let pool, hostile = false;
  if (o === "gay") pool = _FLIRT_WRONGTEAM;
  else if (NPCS[id] && NPCS[id].flirtHostile) { pool = _FLIRT_HOSTILE; hostile = true; }
  else pool = _FLIRT_AWKWARD;
  _say(_pickVary(pool, "flirtno:" + id)(name), hostile ? "alert" : "");
  if (hostile) { _addHeat(1); _addHappy(-1); }
  _noteActor(id);
}

// A ladyboy hostess. For a bi player she's a full courtship option (proceed); for a
// straight one, a gracious pass — and SHE reads YOU and declines, so her agency stays
// intact and it never plays as the punter rejecting her. Never a gag.
const _LADYBOY_PASS = [
  n => _fmt("{n} clocks you clocking her and is already three steps ahead. \"Not for you, tilac — no problem. I know my customer, and you are not him.\" No hurt in it; she's been read a thousand times and long since stopped minding which way it goes. \"Plenty girls here. Go, be happy.\"", { n }),
  n => _fmt("A slow, knowing smile. \"You didn't know? Now you know.\" {n} gives you the beat to decide, and reads the answer off your face before you find it. \"Is okay, tilac — you are not the first, and I am not offended. The ladies are that way.\" A graceful tilt of the head, and she turns to a customer looking for exactly her.", { n }),
];
// The cabaret's own pass: at an all-kathoey venue "the ladies are that way" is
// nonsense — a straight man's flirt gets folded into the show instead, and he
// leaves feeling like a star turn rather than a rejection. Same agency rule:
// SHE reads HIM, and the room loves them both for it.
const _LADYBOY_PASS_CAB = [
  n => _fmt("{n} receives the flirt, holds it up to the light like a tipped note, and hands it to the room: \"He is FLIRTING with me, everybody!\" The crowd roars. \"Tilac, you are adorable, and you are also a tourist in more ways than one, na.\" She pats your cheek, precise as choreography. \"Stay for the show. THAT part is for you.\"", { n }),
  n => _fmt("A beat, an eyebrow, and {n} reads you all the way down — the curiosity, the beer, the vacation — and grades it kindly. \"You don't want what you think you might want, tilac. Is okay. Half this room came in not sure and they are having the best night of the year.\" She spins your drink a quarter-turn like a compass. \"Watch. Cheer. Tip. That is your part, and you will be wonderful at it.\"", { n }),
];
function _ladyboyGate(id) {
  if (!NPCS[id] || !NPCS[id].ladyboy) return false; // not a ladyboy → proceed
  if (typeof _orient === "function" && _orient("bi")) return false; // open mind → a real option
  const cab = typeof _queerVenue === "function" && _queerVenue();
  _say(_pickVary(cab ? _LADYBOY_PASS_CAB : _LADYBOY_PASS, "lbpass")(NPCS[id].name));
  return true;                                       // straight player: a gracious pass
}

// ── Personality in the social system ───────────────────────────────────────
// The four non-whiteknight types finally bite here (whiteknight lives in the
// scam odds + authored openers). Charmer's flirt lands warmer; the Joker's
// jokes/banter land where a straight man's would fall flat; the Blunt man's
// flattery rings false (compliments don't land — but see his negotiation edge);
// the Operator's edge is in reading scams, not in charm. All keyed off _pers.
function _persSocialMod(kind) {
  if (typeof _pers !== "function") return 0;
  if (_pers("charmer") && kind === "flirt") return 1; // a charmer's flirt lands a tier warmer
  return 0;
}
function _persTalkOutcome(kind, outcome) {
  if (typeof _pers !== "function") return outcome;
  if (_pers("charmer") && kind === "compliment" && outcome === "flat") return "warm"; // he means it, and it shows
  if (_pers("joker") && kind === "joke" && outcome === "flat") return "warm";          // timing is his whole game
  if (_pers("joker") && kind === "tease" && outcome === "cool") return "warm";          // banter is his native tongue
  if (_pers("blunt") && kind === "compliment" && outcome === "warm") return "flat";     // flattery rings false from a blunt man
  return outcome;
}

// ── NPC personality — the other side of the same axis ──────────────────────
// Hand-authored NPCs opt in with a `personality:` field (same five ids as the
// player's PERSONALITIES table), and it tilts how YOUR compliment/joke/tease
// resolve on THEM. Applied AFTER the player's own tilt, so the NPC gets the
// last word: an operator mamasan stays unmoved by the charmer's best line,
// and a joker girl fires the tease back whoever's asking. When the tilt
// actually flips the outcome, a dim recognition note says why — the mechanic
// stays readable in the prose, never a silent die-roll.
const _NPC_PERS_NOTES = {
  operator: [
    n => `(${n} hears compliments the way a cashier hears coins — counted, banked, worth face value exactly.)`,
    n => `(Charm is a currency ${n} changes for a living. Yours isn't counterfeit; it is merely small.)`,
  ],
  blunt: [
    n => `(${n} doesn't traffic in flattery, in either direction. Say something true instead.)`,
    n => `(Flattery slides off ${n} like rain off a tin roof. Straight talk is the door in.)`,
  ],
  joker: [
    n => `(With ${n}, the needle IS the handshake.)`,
    n => `(${n} runs on banter the way this town runs on neon.)`,
  ],
  charmer: [
    n => `(${n} plays the compliment game professionally, and appreciates a fellow player.)`,
    n => `(Flattery is ${n}'s home ground — everything you serve comes back, prettier.)`,
  ],
  whiteknight: [
    n => `(${n} takes kindness the way dry ground takes rain — all of it, instantly.)`,
    n => `(A little warmth goes a long way with ${n}. Further than it should, probably.)`,
  ],
};
let _npcPersNote = null; // transient, printed by _doTalkAct right after the outcome line
function _npcPersTalkOutcome(id, kind, outcome) {
  const p = typeof NPCS !== "undefined" && NPCS[id] && NPCS[id].personality;
  if (!p) return outcome;
  let tilted = outcome;
  if (p === "joker") {
    if (kind === "joke" && outcome === "flat") tilted = "warm";   // banter is her native tongue too
    if (kind === "tease" && outcome === "cool") tilted = "warm";  // the needle is affection here
  } else if (p === "charmer") {
    if (kind === "compliment" && outcome === "flat") tilted = "warm"; // she plays the game back
  } else if (p === "blunt") {
    if (kind === "compliment" && outcome === "warm") tilted = "flat"; // flattery bounces off
  } else if (p === "operator") {
    if ((kind === "compliment" || kind === "joke") && outcome === "warm") tilted = "flat"; // charm gets counted, not felt
  } else if (p === "whiteknight") {
    if (kind === "compliment" && outcome === "flat") tilted = "warm"; // aches to be liked
  }
  if (tilted !== outcome && _NPC_PERS_NOTES[p]) {
    _npcPersNote = _pickVary(_NPC_PERS_NOTES[p], "npcpers:" + p)(NPCS[id].name);
  }
  return tilted;
}

// The Orchid Room's women belong to the corner tables — the patched MC president,
// the money from Munich, the quiet Thai everyone defers to — not to a walk-up punter.
// You're in here on sufferance, for a meeting, not to shop. Any pass gets the freeze.
const _ORCHID_NOTOUCH = [
  "The women in here aren't working the floor — they're the room's, the way the " +
    "Blue Label and the low light are the room's, draped over men you do not interrupt. " +
    "You're in the Orchid Room on sufferance, for business, not to shop. The soft-spoken " +
    "man in the unremarkable shirt clocks the thought before you finish it, and lets it go. This once.",
  "You reach, on reflex, and the room drops a degree. These girls belong to the corner " +
    "tables — the patched president, the money from Munich, the quiet Thai everyone defers " +
    "to — and a walk-up putting a hand out in HERE is a category error the whole room notes " +
    "at once. You came for a meeting. Act like it.",
];

function _doSocial(kind, targetWord) {
  // not a pickup room — the girls are the power players', and you're here on business
  if (G.room === "orchid_room") { _say(_pickVary(_ORCHID_NOTOUCH, "orchidno"), "alert"); return; }
  const w = (targetWord || "").replace(/^with /, "").trim();
  const here = _npcsHere();
  // Pronoun/default resolution: "flirt with her" → whoever you're dealing with;
  // bare "flirt" → the conversation partner, or the sole girl in scope.
  const id = _resolveActor(w, here);
  if (!id) {
    if (!w) { _say(`You ${kind} the ambience. The neon flickers back, noncommittally.`); return; }
    // a pronoun the scope couldn't pin down → ask, rather than a flat refusal
    if (_PRONOUN.test(w.toLowerCase()) && here.length > 1)
      _say(`Who do you mean? (${here.map(x => NPCS[x].name).join(", ")})`);
    else {
      // a visible rail regular is a punter, not staff — a brush-off, not "not here"
      const pat = _findPatron(w);
      if (pat) _say(`${_patronLabel(pat)} is a regular at the rail, not one of the girls — ` +
        "the look you get back ends the idea before it finishes forming.");
      else _say("They're not here.");
    }
    return;
  }
  _noteActor(id); // this person is now the antecedent for the next "her/him"
  const name = NPCS[id].name;
  const role = NPC_ROLES[id];
  _trace(kind, name); // breadcrumb (flirt/kiss/spank/fondle)

  // outside a bar this almost never goes well (the katoey encounter, handled
  // by its own resolver, is the famous exception; the Peacock counts as inside
  // — see _socialVenue)
  if (!_socialVenue()) {
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
    // any other non-staff target (a male manager, a patron): orientation-aware
    // brush-off, not a flat "would rather you didn't"
    _flirtUnwelcome(id, name);
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

  // a hostess who bats for the other team gets the wrong-team let-down, not the tiers
  if (NPCS[id].orientation === "gay") { _flirtUnwelcome(id, name); return; }
  // a ladyboy: welcomed courtship for a bi player, a gracious pass for a straight one
  // (she reads you and declines — agency intact). Bi → falls through to the tiers.
  if (_ladyboyGate(id)) return;
  // the bra you bought her makes fondling "more interesting" — one tier warmer
  const braBump = (kind === "fondle" && G.soc.bra && G.soc.bra[id]) ? 2 : 0;
  const net = _favor(id) - SEV[kind] + braBump + _persSocialMod(kind);
  let tier = net <= -3 ? 0 : net <= -1 ? 1 : net <= 1 ? 2 : net <= 3 ? 3 : 4;
  // flirt is the soft action: it has no tier-0/1 rejection pools (they're null),
  // so a very-low-favor flirt (e.g. a bad-rep stranger) must clamp UP to its lowest
  // defined tier — "filed under harmless" — rather than crash on a null pool.
  while (!_SOCIAL_TEXT[kind][tier]) tier++;
  const fn = _pickVary(_SOCIAL_TEXT[kind][tier], "soc:" + kind + tier);
  _say(fn(name), tier === 0 ? "alert" : tier >= 3 ? "win" : "");
  if (braBump && tier >= 3) _say("(The bra you bought her is, as advertised, doing work.)", "dim");
  if (tier === 0) { _addHeat(SEV[kind] >= 4 ? 2 : 1); _addHappy(-1); }
  else if (tier === 1 && SEV[kind] >= 4) _addHeat(1);
  else if (tier === 3) _addHappy(1);
  else if (tier === 4) _addHappy(3);
  if (tier >= 3) _maybeSelfBarfine(id);
  if (kind === "fondle" && tier === 4 && G.money >= LADY_DRINK) {
    G.money -= LADY_DRINK;
    _addBond(id, 1);
    _say(`(-฿${LADY_DRINK} for her drink. ฿${G.money} left, and worth it.)`, "dim");
  }
}

// ── Verbal social actions ────────────────────────────────────────────────────
// Banter that plays off the CONVERSATION state machine (trust/mood/dstate), as
// opposed to the physical _doSocial above (favor/severity, bar girls only).
// These work on anyone you can address — bar girl or patron — resolved through
// _resolveActor, so "compliment", "joke", "tease" all aim at the conversation
// partner with no target word. Each landing nudges state at most once per day,
// so rapport is built over nights, not farmed in one sitting. Outcome buckets:
// warm (landed), flat (no traction), cool (misfired). Every repeatable line
// ships a _pickVary pool. Gender-neutral: patrons and hostesses both pass here.
const _TALK_ACT_TEXT = {
  compliment: {
    warm: [
      n => `${n} takes it cleanly — a small, real smile, filed where the good ones go.`,
      n => `"You're sweet," ${n} says, meaning about sixty percent of it, which here is a lot.`,
      n => `${n} waves it off, pleased anyway. The warmth in the room ticks up a notch.`,
    ],
    flat: [
      n => `${n} takes the flattery the way you'd take a flyer — polite, unconvinced. Early for that.`,
      n => `A cool nod from ${n}. Compliments from strangers are weather here; the real warmth is earned.`,
    ],
  },
  joke: {
    warm: [
      n => `${n} laughs — the genuine kind, caught off guard. The table feels lighter.`,
      n => `That lands. ${n} snorts, tries not to encourage you, fails.`,
      n => `${n} groans, grins. "Okay — that one was good." The ice, such as it was, thins.`,
    ],
    flat: [
      n => `${n} gives you a courtesy smile with nothing behind it. Read the room, farang.`,
      n => `The joke dies in the air between you. ${n} was not, it turns out, in the mood.`,
    ],
  },
  tease: {
    warm: [
      n => `${n} fires straight back, quicker and meaner and delighted about it. A game you're both winning.`,
      n => `${n} gasps in mock outrage, swats at you. "You! I allow this only because I like you."`,
      n => `${n} matches you beat for beat — somewhere in the needling you've become people who needle each other.`,
    ],
    cool: [
      n => `Too soon. ${n}'s smile goes flat and formal; teasing is for people who've earned it.`,
      n => `${n} doesn't take it as play. A cool beat, a cooler look. You feel the ground you lost.`,
    ],
  },
};

// Per-day ledger so a landed action moves state only once each day (built over
// nights, not farmed). Lazy — survives old saves without a template migration.
function _socialLedger() {
  if (!G.socialActs || G.socialActs.day !== G.day) G.socialActs = { day: G.day, done: {} };
  return G.socialActs.done;
}

function _doTalkAct(kind, targetWord) {
  const id = _resolveActor(targetWord, _addressable());
  if (!id) {
    const pool = _addressable();
    if (pool.length > 1 && targetWord && _PRONOUN.test(targetWord.toLowerCase()))
      _say(`Who do you mean? (${pool.map(_convoName).join(", ")})`);
    else _say(`There's nobody here to ${kind}.`);
    return;
  }
  _noteActor(id);
  const name = _convoName(id);
  const st = _npcState(id);

  // How it lands is a function of how warm they already are.
  let outcome;
  if (kind === "compliment") outcome = (st.dstate === "stranger" || st.trust <= 0) ? "flat" : "warm";
  else if (kind === "joke")  outcome = (st.mood === "open" || st.trust >= 2) ? "warm" : "flat";
  else                        outcome = st.trust >= 3 ? "warm" : "cool"; // tease is earned
  outcome = _persTalkOutcome(kind, outcome);        // your personality tilts how it lands…
  outcome = _npcPersTalkOutcome(id, kind, outcome); // …and theirs gets the last word

  _say(_pickVary(_TALK_ACT_TEXT[kind][outcome], "act:" + kind + outcome)(name),
       outcome === "cool" ? "alert" : outcome === "warm" ? "win" : "");
  if (_npcPersNote) { _say(_npcPersNote, "dim"); _npcPersNote = null; }
  _trace(kind, name);

  // First state-moving outcome of this action today counts; repeats are just
  // talk. A flat (no-traction) attempt doesn't burn the day — you can try again
  // once you've warmed them up.
  const ledger = _socialLedger();
  const key = id + ":" + kind;
  if (outcome !== "flat" && !ledger[key]) {
    ledger[key] = true;
    if (outcome === "warm") { st.trust = Math.min(5, st.trust + 1); _addHappy(1); }
    else if (outcome === "cool") st.trust = Math.max(0, st.trust - 1);
  }
  // still talking to them → re-show the response palette in the prose
  if (typeof _convoPrompt === "function" && _convoActive() === id) _convoPrompt(id);
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
    _say(_fmt("The bell rope dangles there, daring you. A ring is a round for the " +
      "house — ฿{p} — and you have ฿{m}. Ringing a bell you " +
      "can't pay for is how farang end up in the khlong.", { p: BELL_PRICE, m: G.money }));
    return;
  }
  G.money -= BELL_PRICE;
  const r = G.room;
  _ringBell(r);
  _say("You reach up and RING THE BELL.", "win");
  const bt = _room().barType;
  const pool = bt === "pub" ? _BELL_PUB
    : (bt === "soi6" || bt === "gogo") ? _BELL_GOGO
    : _BELL_BEER; // beer bars, and any other bar-type, buy a round for the staff
  _say(`${_pickVary(pool, "bell:" + bt)} (-฿${BELL_PRICE}, ฿${G.money} left — reign while it lasts.)`);
  const rings = G.soc.bells[r];
  if (rings === 2) {
    _say("That's two bells this visit. The whole room's tilting hard your way now — " +
      "hardly anything you try lands wrong.", "win");
  } else if (rings === 3) {
    _say("Three bells. You own this place tonight — the whole room's looking the other " +
      "way on your behalf, and nobody is counting.", "win");
  } else if (rings > 3) {
    _say("Another bell on top of three. The room's been yours since the third; now " +
      "you're just making noise, and they love you for it.", "win");
  }
  _engineSfx("bell");
  _engineSpeak("ชนแก้ว");
  _addHappy(2);
}

// RING BELL means different things by venue. A go-go bell is a round for the
// stage and the floor; a beer-bar bell is a round for the handful of staff; a
// pub bell is the oldest magic there is — a round for the whole house.
const _BELL_GOGO = [
  "The bar detonates. Cheering from the girls, a drum-roll on the counter from the cashier, " +
    "the mamasan's first fully unguarded smile of the night. Drinks materialise down the length " +
    "of the bar and every lady in the room now knows your name.",
  "You ring it and the whole floor turns: the girls on stage break character to cheer, the ones " +
    "off it swarm the rail, the mamasan's guard drops for exactly one smile. A round for everyone " +
    "working tonight — and everyone working tonight now knows your name.",
  "The bell goes and the place ignites — a round for the stage and the floor both. Cheers over " +
    "the bass, a drum-roll from the cashier's cage, hands on your shoulders you didn't invite and " +
    "don't mind. For one whole song you are the most popular man on Soi 6.",
  "One pull and the room goes off: drinks down the whole rail, the girls whooping, the DJ " +
    "shouting something with your description in it. The mamasan lets you have this one.",
  "You haul the rope and the bar erupts — a round for the ladies on stage and off, every eye and " +
    "every smile suddenly aimed at you. Expensive way to be handsome. Works every time.",
];
const _BELL_BEER = [
  "A round for the staff, and the little beer bar loves you for it. The two or three girls behind " +
    "the rail cheer, the cashier bangs the counter, and a cold one lands in front of you before " +
    "you've even lowered your arm.",
  "The bell means the staff drink on you, and they do, gladly — whoops from behind the rail, a " +
    "bottle-opener drum-roll, the whole open front a few degrees warmer. Small bar, big welcome.",
  "You ring it: a round for everyone working the bar. The girls toast you, the cashier grins, and " +
    "a comped bottle finds its way back to your hand. Beer-bar economics — everybody wins.",
  "A round for the house, which here is a handful of staff and whoever wandered in off the soi. " +
    "Cheers, clinks, and your name suddenly known the length of a very short bar.",
  "The bell brings the staff's whole attention and their whole thanks: a cheer, a toast, a cold " +
    "one on the house right back at you. Cheap at the price for a bar this glad to see you.",
];
const _BELL_PUB = [
  "The pub erupts in the particular joy of the British abroad: a round for the house, on you. " +
    "Glasses go up the length of the bar, Terry included; someone starts a chant that never quite " +
    "finds its words. You are, briefly and expensively, everyone's best mate.",
  "You've bought the whole room a drink and the room lets you know it — cheers, a bottle raised " +
    "from every stool, the barman already lining them up, a hoarse 'GOOD MAN' from over by the " +
    "dartboard. This is precisely what the bell is for.",
  "A round for the house, the oldest magic in any pub. The drinkers turn as one, salute, and " +
    "settle back a notch friendlier. The staff get theirs too — nobody rings the bell and stiffs " +
    "the bar.",
  "The bell brings the whole room's head round, then the whole room's goodwill. Beers appear, " +
    "glasses clink, the regular who's ignored you all week decides you're alright after all. Cheap, " +
    "for a room full of temporary friends.",
  "You ring it and the pub does the thing pubs do: a ragged cheer, every glass raised, a round on " +
    "your tab with the staff cut in. Terry lifts his without a word — which, from Terry, is a " +
    "standing ovation.",
];

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
  // Prefer a real named regular over the faceless archetype: de-hopped locals
  // anchor their bars, so TALK TO THE REGULAR at the Queen Vic gets you Angela,
  // not "the regular." The anonymous bar-bore below only surfaces where no named
  // regular is holding court — which is also where his bar-girl asides fit.
  const here = _patronsHere();
  if (here.length) { _patronTalk(here[Math.floor(_rand() * here.length)], null); return; }
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
    const chat = ["The regular warms up over shared beers: bar gossip, fuel prices, which " +
      "mamasans danced where, back when. “Buy the mama a drink,” he confides. " +
      "“The girls treat you different after. House might even stand you one.”",
      "You and the regular put the world to rights. “See that bell?” he says, " +
      "pointing his bottle. “Ring it once and every girl in here loves you for " +
      "an hour. Expensive way to be handsome, but it works.”",
      "The regular tells you a long story about a night on Soi 6 in 2009 that " +
      "ends with the phrase “and THAT is why I can't go back to Bristol.” " +
      "Solid company, this man.",
      "The regular leans in, quieter: “You drink on Soi 6, you're drinking with " +
      "the White Dish Group, whoever's name is over the door. Front company. " +
      "Fella called Ryan Powers behind it — Brit, never here, always here. Bars " +
      "run fine. Just don't go asking who owns what.”",
    ];
    // the white-knight gag only makes sense where there's a hostess to moon over
    if (_npcsHere().some(id => NPC_ROLES[id] === "hostess")) {
      chat.push("The regular nods at a fresh-faced kid down the bar mooning over a hostess. " +
        "“White knight. Gonna try and rescue her by Friday, skint by Sunday, Flying " +
        "Club by high season if his mates don't fly him home first. Seen it a " +
        "hundred times.” He drinks. “The girls do the arithmetic better than we do.”");
    }
    _say(chat[Math.floor(_rand() * chat.length)]);
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

// ── The Regular: a persistent relationship, built on what you invest ─────────
// G.soc.drinks[id] already aggregates every kind of attention (lady drinks,
// MESSAGE charm, gifts, invites, self-barfines — and now barfines) and persists
// within a vacation, so it IS the bond. Tiers unlock recognition, the
// depth-beats-breadth conquest bonus (the anti-treadmill), and — at the top —
// she comes off the clock for you. It cools one notch a night in _endNight (tend
// it or lose it), and a new vacation starts everyone a stranger again.
function _bondTier(id) {
  const d = (G.soc.drinks && G.soc.drinks[id]) || 0;
  return d >= 13 ? 3 : d >= 7 ? 2 : d >= 3 ? 1 : 0; // stranger / face / regular / her farang
}
// Recognition on arrival — authorial narration (register-free; any quoted speech
// obeys her English). Varied by tier so a regular's welcome doesn't loop.
const _REL_GREET = {
  1: [
    n => `${n} clocks you from across the bar, and her face does something real for half a ` +
      "second before the professional smile catches up. She remembers you.",
    n => `${n} spots you and the practiced hello softens into a smaller, truer one. You're not ` +
      "a stranger in here any more.",
  ],
  2: [
    n => `${n} is off her stool before you're through the door — the kept seat appears, a cold ` +
      "towel, your drink the way you take it. For a minute you're the only customer who ever existed.",
    n => `${n} waves off the girl already heading for you — that one's hers — and slides in beside ` +
      "you like the seat was always saved. It was.",
    n => `${n} doesn't do the wide bar smile for you any more; she does the other one, the one that ` +
      "costs her something, and keeps your stool clear with a bag on it.",
  ],
  3: [
    n => `${n} lights up like payday and calls you the name she uses for nobody else. She's told her ` +
      "friends about you — you can tell by how they look over. Around here, that's as close to a " +
      "girlfriend as the arithmetic allows.",
    n => `${n} is across the room and under your arm before the door's shut, announcing you to the bar ` +
      "without a word. Whatever this is, she's stopped pretending it's business.",
    n => `The whole bar clocks it the moment ${n} sees you — the way she goes soft, the little nod the ` +
      "other girls give you. You're spoken for in here, and everyone knows it but you.",
  ],
};
function _relGreeting(id) {
  const t = _bondTier(id);
  if (t < 1) return;
  const pool = _REL_GREET[t];
  _say(pool[Math.floor(_rand() * pool.length)](NPCS[id].name), t >= 2 ? "win" : "");
}

// Walking into a bar where you're still a stranger, your street reputation
// arrives a half-step ahead of you — but only at the notable ends of the scale
// (a face on the soi, or trouble). Once per bar per night, and it stands down
// the moment a bar you actually know greets you by name (shares G.soc.greeted).
const _REP_ARRIVAL_GOOD = [
  "A hostess you've never met murmurs to the mamasan as you come in, and the welcome lands a shade warmer than a stranger earns — word's travelled up the soi ahead of you.",
  "The mamasan gives you the once-over, then the nod she keeps for the good ones. Somebody's been saying the right things about you on this street.",
  "You're barely through the beads before a seat and a smile find you — the easy reception of a man the soi has already decided it likes.",
];
const _REP_ARRIVAL_BAD = [
  "The welcome cools a half-degree as you clear the door — a look passes between the mama and the rail that says your name got here first, and not in a good way.",
  "A hostess clocks you, leans to the mamasan, says something behind her hand. Whatever the soi's been telling them about you, it walked in ahead of you.",
  "Nobody hurries over. The mama keeps one eye on you the way she keeps one on the till — you've a name out here now, and it isn't a warm one.",
];
function _repArrival() {
  if (!_flag("act1Done") || !ROOMS[G.room].barType) return;
  if (G.soc.greeted && G.soc.greeted[G.room]) return; // a bar you know already greeted you
  const t = _repTier();
  if (t !== 2 && t !== -2) return;                     // only the notable ends of the scale
  (G.soc.greeted = G.soc.greeted || {})[G.room] = true;
  _say(_pickVary(t === 2 ? _REP_ARRIVAL_GOOD : _REP_ARRIVAL_BAD, "repArrival"), t === 2 ? "win" : "alert");
}

// A regular you TALK to talks back like she knows you — the generic register for
// the FILLER hostesses only (Tinglish, per the English-ability canon; the mama/
// cashier and hand-authored NPCs speak in their OWN voice via `bond:` dialogue
// entries). Narration is authorial; her quoted speech is broken. At her-farang
// tier she reaches past her English for the phone translator — the canon
// deep-talk beat.
const _BOND_TALK = {
  2: [
    n => `${n} drops the drink-lady voice and sits close, real. "You again — good. I keep you ` +
      `seat. Yesterday you no come, I look look, no see you. Where you go?"`,
    n => `"How you sleep? You eat already?" ${n} asks — not the bar smile, the other one. "You ` +
      `look tired, tilac. Work too much. Everybody same same, but you I worry."`,
    n => `${n} tells you a small true thing — her mama phone today, the new girl lazy, her feet ` +
      `hurt in the heels. "I no tell customer this," she says, then laughs. "But you — you not ` +
      `really customer now, na."`,
  ],
  3: [
    n => `${n} wants to say a thing bigger than her English can carry, so she types it into her ` +
      "phone and turns the screen to you. The translation comes out flat and strange — something " +
      "about a door left open — but her face, watching you read it, is not flat at all.",
    n => `${n} puts her head on your shoulder, no reason, no ask. "My farang," she says to nobody, ` +
      `pleased. "Tonight no price, no show. When it you, everything off the clock."`,
    n => `"I tell my mother about you," ${n} says, watching your face for how you take it. "She ask ` +
      `when you come back. I say soon. You make me liar, na?" Only half a joke.`,
  ],
};
function _bondTalk(id) {
  const t = _bondTier(id) >= 3 ? 3 : 2;
  const pool = _BOND_TALK[t];
  _say(pool[Math.floor(_rand() * pool.length)](NPCS[id].name), t >= 3 ? "win" : "");
}

// Diminishing returns on raw conquest — the hedonic treadmill (see the
// lonely-punter canon). Each barfine / short-time buys 2 สนุก less than the last
// (G.jaded), floored at a real −4 penalty, so a binge night runs the ledger to
// zero and past it. jaded cools one notch a day (_endNight) and resets each
// vacation; presence, courtship, company and quests never touch it. AND a girl
// you've built a bond with (regular+, `id` passed) gives a +2 bonus and does NOT
// advance jaded — depth is the correct road, breadth is the treadmill.
function _conquestHappy(base, id) {
  const bonded = id && _bondTier(id) >= 2;
  const net = Math.max(base + (bonded ? 2 : 0) - 2 * G.jaded, -4);
  _addHappy(net); // _addHappy no-ops on 0, so a wash prints nothing
  if (bonded) {
    _say("(No treadmill with her — a night with someone who knows you doesn't cheapen. " +
      "It's the one that keeps giving.)", "dim");
  } else if (net <= 0) {
    _say("(The thrill just… doesn't arrive. Another one, and you barely felt it — " +
      "you mostly want to be alone now. Too many, too fast.)", "alert");
  } else if (net < base) {
    _say("(Good. Not like the first, though — something's wearing thin at the edges.)", "dim");
  }
  if (!bonded) G.jaded++;
}

function _addHappy(n, why) {
  if (!n) return;
  const before = _happyLevel(G.happy);
  G.happy = Math.max(0, G.happy + n);
  // `why` names the cause when the change would otherwise be a bare, unexplained
  // dock — e.g. the meter penalty firing on the same command as a game loss, so
  // two identical "(-1 สนุก)" lines don't read as a double-charge.
  _say(`(${n > 0 ? "+" : ""}${n} สนุก${why ? " — " + why : ""})`, "dim");
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

// ── Waking up rough ──────────────────────────────────────────────────────────
// Run the clock to dawn, drink into a blackout, or let hunger/thirst drop you,
// and you don't teleport comfortably home — you come to wherever the night left
// you, near where you passed out, phone dying and pockets turned out. Each spot
// carries a few prose variations (the last one terse). The region you passed
// out in picks the spot, so crashing deep in the Darkside strands you far from
// town — a night that ends badly costs you geography as well as baht.
const _CRASH_BATTERY = 15;             // "low battery" — barely enough for one call
const _CRASH_SPOTS = {
  beach: { room: "jomtien_beach", prose: [
    "You come to face-down on Jomtien sand, the tide a polite metre from your " +
      "shoes, a beach dog conducting a thorough and disappointed inspection. The " +
      "sun is already an accusation. Somewhere a sunbed vendor is laughing.",
    "Jomtien again. You surface under a leaning coconut palm with sand in " +
      "places sand has no business being, a stranger's flip-flop near your head, " +
      "and the specific headache the gulf breeze does nothing for.",
    "The beach had you. You wake to the slap-slap of morning joggers and a " +
      "massage lady folding her mat three feet away, who takes one look and " +
      "decides today is not the day to offer.",
    "Jomtien Beach. Sand, sun, regret.",
  ] },
  promenade: { room: "beach_rd_c", prose: [
    "You surface on a Beach Road bench, the promenade already busy pretending " +
      "not to see you, a baht bus idling at the kerb whose driver has clearly " +
      "watched you sleep for some time and finds it restful.",
    "The Beach Road palms and their fairy lights, off now in the daylight, stand " +
      "over you like unimpressed relatives. A street sweeper works around your " +
      "feet with the patience of a man who has done this many mornings.",
    "You wake sitting up on the seawall, tie of drool to your collar, watching " +
      "the same grey sea you were watching when the night closed. A 7-Eleven bag " +
      "of somebody's breakfast sits untouched beside you, either a gift or a warning.",
    "A Beach Road bench. The sea, unbothered.",
  ] },
  arch: { room: "ws_gate", prose: [
    "You come to on the kerb under the Walking Street arch, its neon dead in the " +
      "daylight, the great sign that promised everything now just scaffolding and " +
      "pigeons. Delivery bikes thread past your outstretched legs without comment.",
    "The arch. You wake propped against a shuttered go-go, the street hosed down " +
      "and empty, last night's flyers pasted to the wet concrete like fallen " +
      "leaves. Bali Hai pier glitters cruelly at the far end.",
    "Someone has tucked your own arm under your head like a pillow, which is " +
      "either kindness or theatre. Walking Street in the morning is a stage " +
      "between shows: stools stacked, floors mopped, the whole circus asleep.",
    "The Walking Street arch. Curtain down.",
  ] },
  buakhao: { room: "buakhao_market", prose: [
    "You wake in the Buakhao market forecourt among the crates, a vendor stacking " +
      "mangoes around you as though you were furniture that came with the stall, " +
      "which by now you nearly are.",
    "Soi Buakhao at dawn: the beer bars folded away, the market unfolding, and you " +
      "in the seam between them on a plastic stool that has seen this before. Someone " +
      "presses a bag of sliced pineapple into your hand and moves on before you can pay.",
    "You surface to the smell of grilling pork and the clatter of the market " +
      "setting up, a som tam lady eyeing you with the exact blend of pity and " +
      "commerce that keeps this street alive.",
    "The Buakhao market. Crates, mangoes, shame.",
  ] },
  naklua: { room: "naklua_rd", prose: [
    "You come to on the quiet end of Naklua Road, further north than you remember " +
      "going, the fishing boats clinking in the distance and not a farang in sight " +
      "to share the indignity with.",
    "Naklua. You wake against a temple wall, a monk sweeping past with a nod that " +
      "forgives everything and expects nothing, the morning almsround stepping " +
      "around you like weather.",
    "The old-Pattaya calm of Naklua holds you where you fell — a shophouse " +
      "awning, a cat, an auntie sluicing the pavement who redirects the water " +
      "around your shoes without breaking rhythm.",
    "Naklua Road. North, and alone.",
  ] },
  // The Soi 6 challenge: the pocket IS the world, so a rough wake stays in it —
  // never the off-map promenade/beach spots the fence would then refuse.
  soi6: { room: "soi6_street", prose: [
    "You come to on the Soi 6 pavement, back against a shuttered bar front. The " +
      "loudest hundred metres in Thailand has gone eerily silent — a soi dog, a " +
      "sweeper, the neon dead overhead. Whatever you were chasing last night got away.",
    "Soi 6 at dawn: the bars folded down to steel shutters, the beer smell hosed " +
      "toward the drains, and you in a plastic chair somebody left out, exactly " +
      "where the night mislaid you.",
    "You surface on a stool outside a closed bar, the soi grey and empty, a " +
      "cleaning lady working around your feet with the patience of someone who has " +
      "seen every possible way a farang can end a night.",
    "Soi 6. Shutters down, sun up, dignity pending.",
  ] },
  darkside: { room: "sukhumvit_crossing", prose: [
    "You wake at the Sukhumvit crossing, the six-lane highway roaring six inches " +
      "from your dreams, the Darkside behind you and the whole long ride back to " +
      "town in front. However you got out here, the night isn't telling.",
    "The Darkside kept you. You surface on the shoulder of Sukhumvit with truck " +
      "wash blowing over you every thirty seconds, a very long way from anywhere " +
      "you'd choose to be, calculating baht-bus fares you no longer have.",
    "Somewhere past the crossing a dog is winning an argument with another dog. " +
      "You're on the wrong side of the highway from the entire city, the sun " +
      "climbing, and the first cruel arithmetic of the day is: how do I get back?",
    "Sukhumvit crossing. Miles from home.",
  ] },
};
const _REGION_CRASH = {
  "Jomtien": "beach", "Pratumnak": "beach",
  "Beach Road": "promenade", "Second Road": "promenade", "Soi 6": "promenade",
  "Walking Street": "arch",
  "Soi Buakhao": "buakhao", "LK Metro": "buakhao", "Tree Town": "buakhao", "Myth Night": "buakhao",
  "Naklua": "naklua",
  "Darkside": "darkside",
};
function _crashSpotFor(roomId) {
  if (G.mode === "soi6") return _CRASH_SPOTS.soi6; // stay in-pocket, never off-map
  const reg = (ROOMS[roomId] && ROOMS[roomId].region) || "Jomtien";
  return _CRASH_SPOTS[_REGION_CRASH[reg] || "beach"];
}

// ── The clinic thread: an unprotected barfine's souvenir ─────────────────────
// You start the week with three condoms and can buy more at any 7-Eleven. Each
// barfine consumes one if you have it (near-zero risk); go without and there's a
// small chance the night leaves more than memories — silent for a day or two, then
// it surfaces in the morning and in DIAGNOSE, dragging สนุก until you GET TESTED
// (free public clinic, always available). Prevention is ฿40; the cure is dread,
// lost mornings, and a small humiliation. Fully fictionalised, non-punitive.
const STD_RISK = 0.10;   // chance an unprotected barfine infects you
const CONDOM_PRICE = 40; // a 7-Eleven pack
const CONDOM_PACK = 3;
const _STD_SAFE = [
  "(One of the condoms you were carrying gets used the way it's meant to. Unglamorous, unregretted.)",
  "(You had the sense, somewhere in the blur, to reach for the little foil square. Future-you exhales.)",
  "(Sober-you packed protection; drunk-you actually used it. A small miracle, quietly banked.)",
];
const _STD_MORNING = [
  "You wake with a wrongness you can't argue away any longer — a burn, an itch, a heat that isn't " +
    "the weather. Something the night handed you is asking to be dealt with. (DIAGNOSE, or GET TESTED.)",
  "The thing you've been calling 'probably nothing' is louder this morning. Whatever souvenir you " +
    "picked up wants seeing to. (GET TESTED at a clinic — it's free, and it won't clear on its own.)",
  "Another morning, another small alarm from below the belt. You've known what this is for a day now. " +
    "(GET TESTED — the longer you leave it, the longer it drags.)",
];
function _stdBarfineRoll() {
  if (G.lastBfChaste) { G.lastBfChaste = false; return; } // reality-LT night was sexless — no condom used, no risk
  if (G.condoms > 0) { G.condoms--; _say(_pickVary(_STD_SAFE, "stdsafe"), "dim"); return; }
  // no protection, and no immediate tell — the night keeps its secret a day or two
  if (!G.std && _rand() < STD_RISK) G.std = { day: G.day };
}
function _stdSymptomatic() { return !!(G.std && G.day - G.std.day >= 2); }
function _stdMorningTick() {
  if (!_stdSymptomatic()) return; // still incubating, or clean
  _say(_pickVary(_STD_MORNING, "stdmorn"), "alert");
  _addHappy(-2); // the untreated drag; GET TESTED ends it
}

// ── The morning after: the public hospital ───────────────────────────────────
// The one place in Pattaya where the marketplace vanishes — no barfine, no
// mamasan, no VIPs, everyone holding the same queue number. The game elides the
// day, so a night that ends in the hospital (violence, or a motosai crash)
// surfaces it. Rotating pools + fresh vignettes each
// visit keep the week's repeat mornings from reading identically. Fully
// fictionalised — archetypes off the ward, never real people. Insurance covers
// it: not a baht changes hands, which IS the point.
const _HOSP_WHY = {
  hurt: [
    "You surface under a strip light in a curtained bay, an eyebrow taped and a rib filing a " +
      "formal complaint every breath. The big public hospital off Soi Buakhao, south of the " +
      "market — the free one, the real one. Whatever last night's argument was, you lost it on points.",
    "You come to on a gurney parked in a corridor that smells of antiseptic and instant coffee, " +
      "one hand bandaged, a lump behind your ear you don't remember earning. Somebody poured you " +
      "into the district hospital while you were still insisting you were fine.",
    "Morning finds you in a plastic chair you don't remember taking, a fresh row of stitches " +
      "tugging at your scalp and a form on your knee in a script you can't read. The public " +
      "hospital past Candy Bar. The night caught up, the way it always eventually does.",
    "You wake to fluorescent light and the squeak of trolley wheels, an arm in a sling that " +
      "wasn't there at midnight and the taste of the pavement still in it somewhere. The district " +
      "hospital on Soi Buakhao. The city won last night; this is where it leaves the ones who argued.",
  ],
  accident: [
    "You surface to water-stained ceiling tiles and a leg wrapped ankle to knee, the road rash " +
      "down one forearm dressed in gauze that's already weeping through. Somewhere between one bar " +
      "and the next, the bike and the tarmac had a disagreement and you were the message. The " +
      "piwin, they tell you, walked away without a scratch.",
    "White light, iodine, and a wrist in fresh plaster you don't remember earning. The district " +
      "hospital off Soi Buakhao. The last clear frame is the back of a motorbike taxi and a corner " +
      "arriving too fast; the rest the road kept.",
    "You come to on a gurney with gravel still being tweezered out of your shoulder by a nurse who " +
      "has done this a thousand times and will do it a thousand more. A motosai, a slick of " +
      "somebody's spilled oil, a farang certain he was fine to ride. The town files another one " +
      "under Saturday night.",
    "A drip in your arm, a dressing across one cheekbone, and the specific ache of a body that met " +
      "the pavement at speed. You were on the back of a piwin's bike; then you were sliding; then " +
      "you were here. Pattaya collects this fare too.",
  ],
};
// The road moment itself — said the instant a ride goes wrong, before the ward
// morning. A real accident, distinct from the pass-out-and-wake-stranded _CRASH_.
const _MOTO_CRASH = [
  "The corner comes too fast. The piwin brakes, the back wheel steps out on something slick, and " +
    "the world goes sideways in a spray of sparks and somebody shouting. Then the tarmac, and then nothing.",
  "A pickup drifts wide out of an unlit soi with no warning. The piwin swerves, the bike won't hold " +
    "it, and the last thing you own is the sound of your own sandal leaving your foot. Then the road takes the rest.",
  "One second you're threading the late traffic, the next the front wheel finds a pothole the dark " +
    "was hiding and the bike bucks you both toward the oncoming lane. Horns, gravel, the sky where " +
    "the road should be. Lights out.",
];
// Survived a risky ride — the telegraph. Shown on elevated-risk rides that DON'T
// crash, so the danger is legible (and the eventual crash never "blind"): the
// near-miss teaches what the odds are before they ever collect.
const _MOTO_NEARMISS = [
  "The piwin takes the corner faster than your stomach agrees with, the back wheel skittering once " +
    "on the paint before it bites. You get there — heart going, knuckles white. That could have gone " +
    "the other way.",
  "Halfway there a dog, a pothole, and an oncoming pickup all arrive at once; the piwin threads the " +
    "needle and you don't, quite, come off. You climb down on legs that aren't sure they're yours. " +
    "Ride like that enough and one night the odds collect.",
  "You feel the bike step out under you on a slick of something, the piwin's boot goes down, and for " +
    "one long second the tarmac is very close. Then it isn't. He grins over his shoulder; you do not " +
    "grin back.",
];
// Odds a motosai ride ends in a real accident. Scales with drink, the small-hours
// window, and the fast Darkside highway run — near-zero on a sober, early, in-town
// hop. The delivered helmet (helmetDelivered) is a real payoff: it cuts the odds
// hard. Pure and capped, so it's unit-testable.
function _motoCrashRisk(drunk, late, darkside, helmet) {
  let risk = 0;
  if (drunk >= 3) risk += (drunk - 2) * 0.02;
  if (late) risk += 0.03;
  if (darkside) risk += 0.04;
  if (helmet) risk *= 0.4;
  return Math.min(risk, 0.22);
}
const _HOSP_SIGHTS = [
  "Across the bay of curtained cubicles the night's other arrivals are still landing: a farang " +
    "with a taped eyebrow and a police report he can't read, a lad two chairs down folded around " +
    "a phone he keeps not answering.",
  "Three girls off a late shift cluster at the desk, mascara gone to bruises under the strip " +
    "light, one of them white-lipped over an ankle that met a wet soi at speed in the wrong heels.",
  "A young man in the lab-test line can't keep his foot still, staring at the inside of his own " +
    "arm as if he could argue that little constellation of spots back into an allergy by tomorrow.",
  "Along the wall an old European folds and unfolds his hands in a wheelchair, long past " +
    "pretending; the Thai woman beside him — no younger — wears the kind of tiredness that isn't " +
    "from one night but from a hundred, the caregiving kind with no clocking-off.",
  "A girl unmistakably off the bars sits with both hands on a belly that's started to show, her " +
    "friend murmuring the encouragement you murmur when there's nothing else, and the room does " +
    "the arithmetic it doesn't say aloud.",
  "Two men in bleached Chang singlets and flip-flops stand where a queue used to be, holding a " +
    "paper number and the expression of men waiting for something nobody has explained, least of " +
    "all to them.",
];
const _HOSP_THESIS = [
  "No mamasan works this room. Nobody's buying, nobody's selling, nobody's in control. Everyone " +
    "holds the same crumpled number, everyone sits the same plastic chair, everyone is — for once " +
    "— on the same side of the counter.",
  "It's the one address in this town with no VIP list: no sponsors, no working girls, no marks. " +
    "Take away the neon and the drink and the money and Pattaya is just this — fragile people, " +
    "scared and hopeful and hurt, waiting to hear a number called.",
  "The marketplace, so loud out there, simply isn't in here. Strip the night off everyone and " +
    "what's left is a waiting room full of the same animal, holding the same slip of paper, hoping.",
];
const _HOSP_TOMORROW = [
  "And by the water cooler, half a memory made flesh: a girl you lent a few hundred baht a season " +
    "ago and never saw again — the LINE messages, the sick buffalo, the province she was forever " +
    "about to go home to. She clocks you, and for one second something crosses her face. Then she " +
    "smiles like the debt was a dream you had, and mouths one word across the room: “Tomorrow.” " +
    "You can't even be angry. It's almost poetic.",
  "And there, in the queue with everyone else, is one you know — a name half-forgotten, attached " +
    "to money you'll never see and a story about family and a hometown bus. She meets your eye, " +
    "unhurried, entirely unbothered, and gives you the smile and the word this whole town runs on: " +
    "“Tomorrow.” The counter takes her number before it takes yours.",
  "And in the plastic chairs opposite, a face you'd know anywhere: a girl who once cried you a river " +
    "and a rent shortfall and vanished the day after you paid it. She sees you see her. She doesn't " +
    "look away, doesn't blush — just lifts her chin a fraction and gives you the whole town in a word: " +
    "“Tomorrow.” Then she goes back to her phone.",
  "And three seats down, under the same strip light, is the one the money was for — the emergency, " +
    "the hospital up-country that may or may not have existed, the number that stopped answering. She " +
    "recognises you, and something almost like fondness crosses her face. “Tomorrow,” she mouths, and " +
    "you both know exactly what it's worth.",
];

// Soi 6 pocket variant — the challenge week never reaches Soi Buakhao or Candy
// Bar, so the ward is reframed to the north end near Naklua, off-map names dropped.
const _HOSP_WHY_SOI6 = {
  hurt: [
    "You surface under a strip light in a curtained bay, an eyebrow taped and a rib filing a " +
      "formal complaint every breath. The public hospital up past Naklua — the free one, the " +
      "real one. Whatever last night's argument on the soi was, you lost it on points.",
    "You come to on a gurney parked in a corridor that smells of antiseptic and instant coffee, " +
      "one hand bandaged, a lump behind your ear you don't remember earning. Somebody poured you " +
      "into the district hospital north of the beach while you were still insisting you were fine.",
    "You wake to fluorescent light and the squeak of trolley wheels, an arm in a sling that " +
      "wasn't there at midnight and the taste of the Soi 6 pavement still in it somewhere. The " +
      "public ward up the coast. The city won last night; this is where it leaves the ones who argued.",
  ],
};
function _hospitalMorning(reason) {
  const why = (G.mode === "soi6" && _HOSP_WHY_SOI6[reason]) ||
    _HOSP_WHY[reason] || (G.mode === "soi6" && _HOSP_WHY_SOI6.hurt) || _HOSP_WHY.hurt;
  _say(why[G.hospitalVisits % why.length], "alert");
  G.hospitalVisits++;
  const pool = _HOSP_SIGHTS.slice(), pick = [];
  for (let k = 0; k < 3 && pool.length; k++)
    pick.push(pool.splice(Math.floor(_rand() * pool.length), 1)[0]);
  _say(pick.join(" "), "room");
  _say(_HOSP_THESIS[Math.floor(_rand() * _HOSP_THESIS.length)], "dim");
  _say("(No charge — your travel insurance covers the public ward. In here, that makes you " +
    "exactly like everyone else: a number, waiting for it to be called.)", "dim");
  if (_rand() < 0.55) _say(_HOSP_TOMORROW[G.hospitalVisits % _HOSP_TOMORROW.length]);
}

// ── The dawn coda: her last baht bus ─────────────────────────────────────────
// The game's title, made flesh. After a big-illusion night (a barfine) the camera
// occasionally leaves YOU — passed out, sure you conquered the city — and follows
// HER home at 6 a.m.: the queen taken off like a costume, the hard bench, the
// coins, the money zipped away for a family this town never sees. A deliberate
// POV cutaway. Fully fictionalised, nameless — the archetype, not a real person.
const _CODA_CUT = [
  "You are already asleep — face-down, victorious, certain you conquered the city. So you miss " +
    "this part. Somewhere across town, under a lift's flat fluorescent light, the night is coming " +
    "off like a costume.",
  "You sleep the sleep of a man who won, and never see the other half of the night — the half " +
    "that starts the moment the door clicks shut behind her.",
  "The last thing you registered was the smoke machine and the bottle sparklers and how " +
    "untouchable she looked. You sleep. She doesn't, not yet. Across the city the spell is quietly " +
    "wearing off.",
];
const _CODA_DECON = [
  "In a bathroom that isn't yours the queen comes apart into her pieces: the tight dress folded " +
    "careful into a tote so it survives another night, the heels kicked off blistered feet, a wet " +
    "wipe dragging the red mouth and the smoky eyes down the sink until they're gone.",
  "Out of the bag comes the real uniform — a faded cartoon t-shirt gone soft with washing, grey " +
    "sweatpants, fifty-baht rubber flip-flops. The mile-long legs go back to being a tired " +
    "27-year-old's; the untouchable VIP disappears with the makeup, down a drain, in a hotel that " +
    "will forget her by checkout.",
  "She scrubs it all off — the lipstick, the eyeshadow, the whole performance — and what's left " +
    "in the mirror under the hard light is just a woman with dark circles who wants, more than " +
    "anything she was offered tonight, to sleep.",
];
const _CODA_HOME = [
  "6 a.m. on Second Road: exhaust and grilling moo ping and a yellow, sweaty light. She climbs " +
    "into the back of an empty baht bus — no leather, no laser, just a hard metal bench — and " +
    "folds her knees up against the chilly morning.",
  "In a small purse, past a broken lighter and a stub of lip gloss, she finds the notes and folds " +
    "them small into the hidden zip. That money isn't hers to spend: it's a hospital bill up-country " +
    "and a school uniform for a kid she sees four times a year. For the fare she digs out coins and " +
    "holds them in her fist.",
  "The baht bus screeches up to a dark, narrow soi in North Pattaya. She presses the buzzer, hands " +
    "the driver a few coins, and walks the last of the way to a windowless room at four thousand a " +
    "month — to sleep until three, then put the heels back on and do it again.",
];
const _CODA_CLOSE = [
  "Tourists fall in love with the 2 a.m. version and think the sparkle is the life. But the truest " +
    "version of a Pattaya girl is the one on the back of a baht bus at dawn, in sweatpants, a fistful " +
    "of coins, going home.",
  "That's the fare the last baht bus really carries — not you, weaving back to your hotel, but her, " +
    "going the other way: toward a room, a few hours' sleep, and a family that never sees this city.",
  "You'll wake at noon sure you shared something. She's already asleep across the city — the makeup " +
    "gone, the money hidden, an alarm set for the next performance. Only one of you was ever really there.",
];

function _cinderellaCoda() {
  _say(_CODA_CUT[G.codaSeen % _CODA_CUT.length], "dim");
  _say(_CODA_DECON[Math.floor(_rand() * _CODA_DECON.length)], "room");
  _say(_CODA_HOME[Math.floor(_rand() * _CODA_HOME.length)], "room");
  _say(_CODA_CLOSE[G.codaSeen % _CODA_CLOSE.length], "dim");
  G.codaSeen++;
}

function _endNight(reason) {
  // Idempotency: a mid-command multi-tick (WAIT through dawn) or a collapse on the
  // last night could re-enter here after the week's already ended — don't run the
  // whole night-end/_endVacation sequence twice.
  if (G.pendingChoice === "vacation_end") return;
  // The opening quest (Act One) is do-or-die: fail to reach room 412 before the
  // night ends — run to dawn, or drop from thirst/drink — and it's a HARD FAIL
  // that RESETS the game, not the sandbox's soft rough-wake. Only a progress
  // high-water mark survives (see _act1Fail).
  if (!_flag("act1Done") && (reason === "dawn" || reason === "collapse" || reason === "blackout")) {
    _act1Fail(reason);
    return;
  }
  G.game = null;
  G.pendingEnc = null;
  G.pendingFare = null;
  // the week's spine, one entry per night — what the share card renders.
  // Capped so an endless expat run can't grow the save without bound.
  if ((G.nightLog = G.nightLog || []).length < 30) G.nightLog.push(reason);
  switch (reason) {
    case "dawn":
      _say("The sky over the gulf goes grey, then pink, and even Pattaya blinks. " +
        "04:00. The last bars stack their stools; the baht buses carry home the " +
        "wreckage; somewhere a rooster who fears nothing starts up. You drift " +
        "back and let the day take you.", "room");
      break;
    case "collapse":
      _say((_flag("act1Done") && G.room === _hotelRoomId()) ?
        (G.thirst >= G.hunger ?
          "You make it as far as your own room and no further — the walls tilt, " +
          "the bed comes up to meet you, and dehydration takes the rest of the " +
          "night. At least you're home for it." :
          "You make it as far as your own room and no further — legs folding, you " +
          "go down onto your own mattress with your shoes still on. Hunger wins " +
          "the night, but it wins it in your own bed.") :
        (G.thirst >= G.hunger ?
          "The neon smears, the pavement tilts, and the last thing you register " +
          "is a motorcycle taxi vest and the words “mai pen rai, boss, I got you.” " +
          "Dehydration takes the rest of the night." :
          "Your legs vote no-confidence. You fold up gently next to a som tam cart " +
          "whose owner feeds you out of pure pity before calling you a ride. " +
          "Hunger wins the night."), "alert");
      _addHappy(-8);
      break;
    case "blackout":
      _say("Somewhere after that last bottle the film simply stops. There are " +
        "flashes — singing? a traffic cone? — and then nothing. Whatever the " +
        "night cost, the morning will hand you the invoice.", "alert");
      _addHappy(-5);
      break;
    case "hurt":
      _hospitalMorning("hurt"); // insurance covers the public ward — no bill
      _addHappy(-8);
      break;
    case "accident":
      _hospitalMorning("accident"); // a road accident — the ward, insurance, no bill
      _addHappy(-8);
      G.crashInjury = true; // wake tomorrow banged up (applied after the new-day reset)
      break;
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
      _stdBarfineRoll();   // protection used if carried; else the night may keep a secret
      _conquestHappy(G.lastBfBase || 10, G.lastBfId); // reality-LT sets a lower base
      if (_flag("act1Done") && _rand() < 0.35) _cinderellaCoda(); // her 6 a.m., occasionally
      break;
    case "bfscam": {
      // an operator ran her game on your long time — the veterans warned you.
      // G.bfIncident.kind carries which one; COMPLAIN at her bar for recourse.
      const inc = G.bfIncident || { kind: "runner", room: G.room, id: null };
      const gn = inc.id ? NPCS[inc.id].name : "She";
      if (inc.kind === "runner") {
        _say("Dinner is lovely. She is lovely. Then, over the last of the khao " +
          `man gai, her phone lights up and ${gn}'s whole face changes: “Mama! ` +
          "Emergency! My friend—” The story arrives pre-assembled and she with " +
          "it, already standing, already sorry, already gone. Much later you " +
          "hear — the soi always tells you eventually — that she was back on " +
          "her stool inside the hour. Or maybe it was Beach Road.", "alert");
        _addHappy(2);
      } else if (inc.kind === "mao") {
        _say(`${gn} matches you drink for drink all night, glorious company, ` +
          "right up until the room door closes and she becomes, instantly and " +
          "completely, the drunkest woman in Thailand. “Mao mak mak, tilac. " +
          "Cannot boom boom.” She is asleep in seconds, diagonal, snoring " +
          "delicately. At dawn she is gone with the light, fresh as laundry.", "alert");
        _addHappy(3);
      } else { // leaveAfter
        _say("The main event is everything advertised. Then, before the ceiling " +
          `fan has finished its applause, ${gn} is up, dressed, and kissing ` +
          "your cheek: “I go back bar, na? Mama need me.” Some men mind. " +
          "Standing in the doorway watching her go, you decide — mostly — not " +
          "to be one of them.", "dim");
        _addHappy(6);
      }
      if (inc.room && inc.kind !== "leaveAfter") {
        _say(`(The veterans at the rail called this one. COMPLAIN at ` +
          `${_barName(inc.room)} — the mamasan will want to know. Bad girls ` +
          "are bad business.)", "dim");
      }
      break;
    }
    case "bfscam2": // bfhop/bfparty told their own story; just point at recourse
      if (G.bfIncident) {
        _say(`(COMPLAIN at ${_barName(G.bfIncident.room)} — the mamasan will ` +
          "want to know. Bad girls are bad business.)", "dim");
      }
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
  G.jaded = Math.max(0, G.jaded - 1); // a day cools the treadmill one notch
  if (G.stage !== "expat" && G.day > 7) { _endVacation(); return; }
  let hangover = G.soc.drunk;
  G.soc.drunk = 0;
  // the Sabai Palms perk: Naklua quiet takes one size off the morning after
  const _quietHelped = _flag("act1Done") && G.hotel === "sabai" && hangover > 0;
  if (_quietHelped) hangover--;
  G.soc.bellAt = {};
  G.soc.bells = {};    // the bell COUNT resets too, not just the glow timer (bellAt) —
                       // else one week's three bells makes any later ฿300 ring an instant
                       // level-3 room (full heat amnesty, hands-on cap lifted) for free
  G.soc.heat = {};
  G.soc.banned = {};
  G.soc.bfBar = {};    // "a colleague already left with you" is a tonight thing — else one
                       // barfine locks every other girl at that bar for the whole vacation
  G.soc.bfRefused = {}; // life-refusals ("temple in the morning") are night-scoped
  G.soc.goWith = {};   // the "I go with you, na" opener re-arms each night
  G.soc.lockIn = {};   // Darkside lock-ins are per-night (their own comment says so)
  G.soc.bra = {};      // the fondle bump is a one-night thing (as CLAUDE.md documents)
  G.soc.lastCall = {}; // last-call warnings reset with the night
  G.soc.mgrShot = {};  // the manager pours a fresh welcome shot each night
  G.soc.dogFavor = {}; // and the beer-bar staff get to fuss over Sai Krok anew
  G.soc.mgrChat = {};  // and forgets last night's bar-leaning (manDrinks goodwill persists)
  G.lastBusWarned = false; // and the last-baht-bus heads-up fires once each night
  G.soc.greeted = {};  // a fresh night — she greets you anew
  G.lastBfId = null;   // clear the LT-ending bond hook
  G.lastBfBase = 10;   // and its สนุก base (reality-LT drops it to 4 for one night)
  // bonds cool a notch a night; tend them or lose them — unless a loyal dog (Hachiko) holds them
  if (_dogEgg() !== "loyal") for (const id in G.soc.drinks) _addBond(id, -1);
  G.soc.patronBusy = {};
  G.soc.patronMiffed = {};
  G.soc.apologized = {}; // a new shift will hear you out afresh
  G.soc.selfBf = false;
  G.soc.butterflyTeased = false;
  G.offstage = false; // never carry an "off with her" flag into a new night
  G.pendingBf = null; // a barfine still mid-negotiation at the bell dies with the night
  G.selfBfId = null;
  G.quizPlayed = {};
  G.phone.msgCd = {};
  G.phone.invite = null;
  for (const id in ENCOUNTERS) if (ENCOUNTERS[id].nightly) delete G.encDone[id]; // the street restocks
  G.hurt = 0;
  if (G.crashInjury) { G.hurt = 1; G.crashInjury = false; } // yesterday's spill still aches
  G.hunger = Math.min(85, 30 + hangover * 5);
  G.thirst = Math.min(90, 40 + hangover * 6);
  G.nightTurn = 0;
  G.darkStreak = 0;
  G.lightOn = false;
  G.safeTries = 0;
  // Where you wake. Run the clock to dawn, black out, or collapse from
  // hunger/thirst and you don't make it home: you come to rough, near where you
  // passed out (unless you're a resident already standing in your own room),
  // phone dying and pockets turned out. Every other ending — you slept at the
  // hotel, went home with her, woke in the clinic — lands you in a bed as before.
  const wouldRough = (reason === "dawn" || reason === "collapse" || reason === "blackout")
                && !(_flag("act1Done") && G.room === _hotelRoomId());
  // a rescue dog (Lassie) never leaves you in the gutter — he brings you home
  const rough = wouldRough && _dogEgg() !== "rescue";
  const crash = rough ? _crashSpotFor(G.room) : null;
  if (crash) {
    G.battery = _CRASH_BATTERY;
    if (!G.dog) G.money = 0;         // the town turns out the sleeping farang's pockets…
    // …unless a soi dog is sitting on them. Nobody negotiates with Sai Krok.
  } else if (_flag("act1Done")) {
    G.room = _hotelRoomId(); G.battery = 100;
  } else {
    G.room = "jomtien_beach"; G.battery = Math.max(G.battery, 20);
  }
  _say("");
  if (crash) {
    _say(crash.prose[Math.floor(_rand() * crash.prose.length)], "alert");
    _say(G.dog
      ? _dogN(`(Phone on ${_CRASH_BATTERY}%. Your pockets are untouched: Sai Krok spent the ` +
        "night sitting on your chest like a paperweight with teeth, and the town let " +
        "you both be. Nobody works a farang whose dog is watching.)")
      : `(Phone on ${_CRASH_BATTERY}%. ${_flag("hasWallet") ? "Wallet" : "Pockets"} ` +
        "turned out, empty — the town works the farang who don't make it home.)", "dim");
  }
  _chargeRent();                     // the folio bills you even if you slept rough…
  if (crash) G.room = crash.room;    // …but you wake where the night left you, not at the desk
  if (_quietHelped) _say("(Naklua quiet: the hangover wakes one size smaller.)", "dim");
  // Templated so one catalog entry covers every day of the week (the day number
  // was baked into the string, so `de` needed seven copies of the same sentence).
  _say(_fmt("── DAY {d}{home} — you " +
    "surface mid-afternoon, and by the time you're human again the sun is " +
    "sliding into the gulf and the neon is waking up ──",
    { d: G.day, home: G.stage === "expat" ? _L(" · PATTAYA, HOME") : _L(" of 7") }), "win");
  if (hangover >= 4) _say("(The hangover is a physical presence with opinions. Water. Food. Mercy.)", "alert");
  if (wouldRough && !rough && _dogEgg() === "rescue") {
    // NOT "the last baht bus" — this fires only on nights you failed to get home,
    // i.e. after the curfew that the game is named for. The piwins are the only
    // ride at that hour (see _doMotosai's small-hours gouge), and the dog-in-a-
    // saleng is already canon (_DOG_MOTOSAI).
    _say(_dogN("You should have woken rough — face-down where the night dropped you. Instead you're " +
      "in your own bed, shoes off, wallet on the side. Sai Krok nudged you awake, herded you to the " +
      "piwin stand like a sheep that owed him money — the buses long gone, the way they always are by " +
      "then — and rode the whole way home in the saleng behind you, upright and vigilant. Lassie " +
      "brought you back."), "win");
  }
  if (G.dog && !crash) {
    _say(_dogN("(Sai Krok is " + (G.hotel === "queenvic"
      ? "curled in the Queen Vic's doorway when you come down"
      : "asleep against your door when you surface") +
      ". One eye opens, the tail thumps twice, and the watch resumes.)"), "dim");
    if (_dogEgg() === "loyal" || _dogEgg() === "sanuk") {
      _addHappy(1);
      _say(_dogN(_dogEgg() === "loyal"
        ? "(He waited. Of course he waited. Something in you settles at the sight of him.)"
        : "(Sai Krok greets the new evening like it personally invited him. Hard not to catch it.)"), "dim");
    }
    if (_dogEgg() === "snack" && _rand() < 0.3) {
      G.money += 20;
      _say(_dogN("(Sai Krok drops something at your feet, pleased with himself: a damp, folded ฿20 " +
        "note the street lost and nobody claimed. Finders. +฿20.)"), "dim");
    }
  }
  if (G.dog) _setFlag("hasDog");      // backfill for saves that adopted before the flag existed
  _loanNightRoll();                   // Nira's loan compounds and her cousins escalate if you're late
  if (typeof _barSettle === "function") _barSettle();  // your own bar's night, and the old man's month
  _stdMorningTick();                  // an untreated infection makes itself known each morning
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
  if (G.mode === "soi6") {
    _say(`SOI 6 · DAY 7 — happiness ${G.happy}: ${_happyLevel(G.happy)}.` +
      (G.happy >= 100 ? " You maxed the week. ★"
                      : ` (Best week on the soi so far: ${G.bestHappy}.)`), "win");
    // the week card, Wordle-style — printed here so it's the last thing the
    // week leaves you with, and SHARE re-prints (and copies) it on demand
    for (const l of _shareCard()) _say(l, "win");
    _say("So — again?", "room");
    _say("(PLAY AGAIN — one more week on Soi 6. Fresh ฿100,000, fresh liver. " +
      "SHARE copies your week card.)", "dim");
    return;
  }
  _say(`VACATION ${G.vacation}: happiness ${G.happy} — ${_happyLevel(G.happy)}` +
    (G.bestHappy > G.happy ? ` (best trip so far: ${G.bestHappy})` : " (your best trip yet)"), "win");
  _say("So. What now?", "room");
  _say("(NEW VACATION — fly back next month. No lost wallet this time. Probably.)", "dim");
  _say("(MOVE TO PATTAYA — stop pretending you're going home. Make the move; live the sandbox.)", "dim");
}

// ── The departure ritual: killing the man the city made ──────────────────────
// Fly home at week's end and the last thing that happens is the airport scrub:
// the version of you Pattaya grew — the nickname, the bucket rum, the helmetless
// Click — has to die in a locked toilet so the one with the mortgage can board.
// Plays at the top of _newVacation (fly-home-and-return); NOT on _goExpat (you're
// staying). Rotates by G.vacation so repeat trips scrub differently. Fictionalised
// and nameless — the home life is generic archetype (a dog, a lawn, a cover story),
// never a named partner, and no brands.
const _SCRUB_OPEN = [
  "The taxi drops you at Departures and you move through the terminal like a fugitive, because " +
    "you are one. Over the next two hours the man Pattaya grew — the one who answered to a nickname, " +
    "drank rum from a plastic bucket at 2 p.m., rode a scratched Click through the rain with no " +
    "helmet — has to quietly die. You find the big handicap stall, lock the door, and begin the scrub.",
  "You know this ritual; you'll perform it again next trip. In a locked airport toilet you kill the " +
    "version of you the week grew and resurrect the one with the mortgage. Ninety minutes, and a " +
    "suitcase full of evidence.",
  "Departures again, and the fugitive's walk again — chin down, moving fast, a man carrying " +
    "contraband that is mostly himself. The week's version of you doesn't get to board this plane. " +
    "You find a stall, throw the bolt, and start taking him apart.",
  "The gate's in ninety minutes, and the surgery can't be rushed. Somewhere between the taxi rank " +
    "and seat 34K the man who sang Oasis flat at 3 a.m. has to become a man who files quarterly " +
    "reports. The airport toilet is the operating theatre.",
];
const _SCRUB_PHYSICAL = [
  "First the body. The neon singlet comes off — it reeks of stale beer, grilled pork, cheap vanilla " +
    "and decisions — rolled tight into a convenience-store bag and buried at the very bottom of the " +
    "case under the dirty socks, where evidence goes. From the pristine, untouched half of the " +
    "suitcase: a beige polo, sensible chinos, clean loafers. You brush your teeth like you're sanding " +
    "off a crime and splash the last soi's humidity off your face.",
  "You strip the beast and dress the accountant — the reeking singlet balled into plastic and sunk " +
    "under the laundry, the crisp polo and pressed chinos pulled from the side of the case you never " +
    "opened all week. In the mirror the tan almost passes for a golf tan, if you don't look too hard.",
  "Off with the costume: the singlet that smells like a small war crime folded into plastic and " +
    "pressed to the bottom of the bag, the flip-flops swapped for loafers that have never met a wet " +
    "soi. The polo still holds the fold-lines from the shop. In the mirror, a man who had a quiet week.",
  "You wash the city off in a steel sink — the humidity, the smoke, the faint sweetness of somebody " +
    "else's perfume — and dress in the clothes of a man with a lawn to mow. The tan is the only " +
    "witness left, and tans lie easily enough.",
];
const _SCRUB_DIGITAL = [
  "Then the phone, which is a bomb. The chat app first — forty messages an hour, crying bears, " +
    "“miss you already na ka” — long-pressed and gone without a glance. Then the gallery: a " +
    "hundred-odd blurry frames of buckets and neon and peace signs deleted, and then, because " +
    "amateurs get caught here, Recently Deleted, Select All, gone forever. It never happened.",
  "The lock screen is the last wire. You swap the red-lit selfie you don't quite remember taking for " +
    "a bright, high-res photo of the dog and the tidy lawn and the life that must never know. Then you " +
    "rehearse the lie about the cash you pulled out in three days: “the course only took cash, babe — " +
    "total scam.” Perfect.",
  "The phone is where careers die. You purge the chat threads unread — the crying bears, the " +
    "“papa miss you,” the voice notes you'll never play — then the gallery, then the folder amateurs " +
    "forget, until the device holds nothing but a man who went to a conference. Empty the trash. Twice.",
  "You run the sweep in order, the way you've learned to: messages, gallery, deleted-items, banking " +
    "history rehearsed into a story about greens fees and cash-only clubhouses. Last, the lock screen — " +
    "the blurry red-lit stranger swapped for the dog, the lawn, the smiling proof of the life you're " +
    "about to lie to.",
];
const _SCRUB_CALL = [
  "You walk out into the sterile, air-conditioned scent of Duty-Free, buy an apology-shaped bottle of " +
    "perfume, and the phone buzzes right on cue. You clear your throat, drop into your most exhausted " +
    "corporate register, and answer: “Hey babe. Honestly? Exhausting. So humid. Barely did anything but " +
    "network and eat bad hotel food. Just ready to sleep in my own bed.” The performance of a lifetime, " +
    "and it lands.",
  "The call comes as you reach the gate, and you become, instantly and completely, a bored man who " +
    "spent a week at conference tables. “Golf was alright. Bangkok traffic's a nightmare. Ready to be " +
    "home, babe.” A sigh, precisely weighted. She believes every word, because you've made it easy to.",
  "In the Duty-Free glare you buy the airport perfume that says sorry without saying why, and the " +
    "call lands as you pay. You answer as a man bored to the marrow: “Yeah, fine. Long week. Too much " +
    "networking, not enough sleep. Can't wait to be home.” Not a word of it true, every word believed.",
  "The phone goes as you reach the seat, and you slide, seamless, into the other voice — flatter, " +
    "wearier, entirely domestic. “Golf was okay. Weather was rough. Missed you, babe.” You've told " +
    "this one so many times it's started to feel like a second first language.",
];
const _SCRUB_CLOSE = [
  "You pocket the phone and walk toward boarding. The double life is secured; the illusion holds. The " +
    "city doesn't notice you leaving — it's already selling your booth to the next man who's sure he's different.",
  "The scrub is complete: the nickname's under the socks, the accountant's at the gate. In a month the " +
    "seatbelt sign will ping off over the gulf again, and you'll run the whole ritual in reverse.",
  "Boarding call. You walk the jet bridge a respectable man with a clean phone and a duty-free bag, " +
    "and behind you the city closes over the space where you stood without a ripple. Undefeated, as ever.",
  "The performance holds all the way to the seat. The week is a story about golf and traffic now, " +
    "filed and locked. Pattaya keeps the truth the way it keeps everyone's — cheaply, and forever.",
];

function _suvarnabhumiScrub() {
  const v = G.vacation;
  _say("═══════════════════════════════════", "dim");
  _say(_SCRUB_OPEN[v % _SCRUB_OPEN.length], "room");
  _say(_SCRUB_PHYSICAL[Math.floor(_rand() * _SCRUB_PHYSICAL.length)]);
  _say(_SCRUB_DIGITAL[Math.floor(_rand() * _SCRUB_DIGITAL.length)]);
  _say(_SCRUB_CALL[Math.floor(_rand() * _SCRUB_CALL.length)]);
  _say(_SCRUB_CLOSE[v % _SCRUB_CLOSE.length], "dim");
}

function _newVacation() {
  _suvarnabhumiScrub(); // kill "Sharky" and fly home — before the reset and the return
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
  G.atmDay = 0; G.atmToday = 0; // day resets to 1, so clear the daily-cap tracking or a day-1 withdrawal carries over
  G.tonicOwed = 0; // a month away forfeits any pending tonic-shop claim
  G.curseOwed = 0; // …and any pending fortune-teller claim
  G.loan = null;   // …but Nira's cousins do not forget; a month away writes it off all the same (for now)
  G.jaded = 0;     // a fresh trip, fresh enthusiasm — the treadmill resets
  G.rep = 0; G.repDay = null; // a month away and the soi's memory of your antics is a clean slate (expat keeps its rep — you live there)
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
  // gates the bar-owning chain: a seven-day vacation doesn't buy a bar, and the
  // closing line below promises one. reqFlags rather than a stage check so the
  // quests stay pure data.
  _setFlag("expatLife");
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

