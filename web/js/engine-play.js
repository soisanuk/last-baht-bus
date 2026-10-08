// The Last Baht Bus — game engine, part 3/5: the night's activities — bar
// mini-games, bar social life, happiness (สนุก), and the clock/body/week.
// Loads after engine-core (see its header for the split's load-order contract).

// ── Bar mini-games ──────────────────────────────────────────────────────────
// Classic bar-table gambling: Connect 4 (the hostess never loses), Jackpot
// (the Thai shut-the-box dice game), and pool. Pure game logic lives in
// games.js; this section owns stakes, narration, and the modal G.game state —
// while a game is live, doCommand routes every input to _gameInput.

// C4_STAKE / POOL_STAKE / JP_* live in world.js now — Aek quotes POOL_STAKE in her dialogue, and world.js loads first

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
function _gameHostess(pref) {
  const here = _npcsHere();
  // "PLAY CONNECT 4 WITH RATANA": an opponent named and present takes the frame
  // (the mamasan IS the shark tier — gambler playtest 2026-08-22 asked for her and got Lek)
  if (pref) {
    const p = here.find(n => NPC_ROLES[n] && NPCS[n].name.toLowerCase() === pref) ||
      here.find(n => NPC_ROLES[n] && NPCS[n].name.toLowerCase().startsWith(pref));
    if (p) return { id: p, name: NPCS[p].name };
  }
  const id = here.find(n => CANON_HOSTESSES.includes(n)) ||
    here.find(n => NPC_ROLES[n]) || null;
  if (pref && id) _say(`(Nobody here answers to "${pref}" for a game — ${NPCS[id].name} has the frame tonight.)`, "dim");
  return { id, name: id ? NPCS[id].name : "the hostess on shift" };
}

// Stake escrow: taken up front, paid back ×2 on a win (×3 on a Jackpot).
// Broke players play "for sanuk" — no baht either way, pride still on the line.
function _takeStake(want) {
  const stake = Math.min(want, G.money);
  if (stake > 0 && stake < want) _say(`(Short stake — she takes what's there: ฿${_num(stake)} against the table's ฿${_num(want)}.)`, "dim");
  G.money -= stake; G.offTill = (G.offTill || 0) + stake;   // a stake is not a slip in the cup (Aurelio, round 71)
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
    case "cli": return typeof cliOptions === "function" && typeof CLI_SCENARIOS !== "undefined"
      ? cliOptions(CLI_SCENARIOS[G.game.scenario], G.game.cli) : ["exit"];
    case "c4": return ["drop", "1", "2", "3", "4", "5", "6", "7", "q", "quit"];
    case "jp": return ["flip", ..._jpChoices(), "quit"];
    case "pool": case "killer": return ["shot", "power", "safety", "quit"];
    case "kp": return ["shot", "power", "quit"]; // the league game (type "kp") — SHOT/POWER only
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
  if (w.includes("connect") || w.includes("four") || /\b4\b/.test(w)) {
    const m = w.match(/\b(\d{2,9})\b/); // a trailing stake: PLAY CONNECT 4 100 (7 figures fell through the old 2–5)
    const vs = (w.match(/\b(?:with|vs|against)\s+([a-z]+)/) || [])[1];
    return _startC4(m ? +m[1] : undefined, vs);
  }
  // "8" alone used to mean 8-ball — so PLAY CONNECT 4 80 started POOL (gambler playtest 2026-08-22)
  if (/\bpool\b|\b8[- ]?ball\b|billiard|snooker/.test(w)) return _startPool(w);
  const opts = _playOptions();
  if (opts.length) _say("Play what? " + opts.map(o => "(PLAY " + o.toUpperCase() + ")").join(" · "), "dim");
  else _say("Nothing to play here — the beer bars keep Connect 4 and Jackpot within reach.", "dim");
}

// ─ Connect 4 ─

function _startC4(want, vs) {
  if (!_barGamesHere()) { _say("No Connect 4 board here — every beer bar keeps one within arm's reach."); return; }
  const { id, name } = _gameHostess(vs);
  const depth = _c4Depth(id);
  // her table, her limit — the ladder that makes the weak opponent unfarmable
  // (min-maxer playtest 2026-08-22 called it the best-designed number in the
  // build). It just never said so out loud (millionaire playtest, same day).
  const cap = depth >= 8 ? 500 : depth >= 6 ? 200 : 20;
  if (want && want > cap) {
    _say(`${_ucfirst(name)} looks at the money and laughs, not unkindly. "Too much, tilac. ` +
      `My table is ฿${_num(cap)}." She is not negotiating; a bigger board is a bigger opponent.`, "dim");
  }
  const stake = _takeStake(Math.min(want || C4_STAKE, cap));
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
// THE DOOR OPENS FOR A FACE IT KNOWS (Mario's call, round 34). Every Darkside
// street after midnight advertises "one padded door still thumping" and there
// was no command, price, favour or reputation that got you through it from
// outside — the biggest tease in the game for the player who came looking for
// exactly this (Gerry). A man who has been bolted in HERE before is not a
// walk-up: he is somebody the mamasan let into the back half of her night
// once, and that is a thing this town remembers. So he can come back — and
// nobody else can, which keeps the lock-in earned rather than merely open.
// …but never on the night you walked out of it. OUT is one-way and the
// lock-in's own closing line promises exactly that ("no coming back in
// tonight"); a door that reopened the same evening would make a liar of it.
// A PREVIOUS night's welcome is what carries.
function _lockInWelcome(to) {
  const r = ROOMS[to];
  const when = G.lockedInAt && G.lockedInAt[to];
  return !!(r && r.region === "Darkside" && r.lockIn && G.nightTurn >= 60 &&
    _flag("act1Done") && when && when < G.day &&
    !(G.soc.lockIn && G.soc.lockIn[to]) &&
    !(G.soc.leftLockIn && G.soc.leftLockIn[to]));   // walked out tonight: the bolt stays (Stan, r35)
}
function _closedNow(to) {
  // A venue may name its OWN closing turn (Mario, 2026-09-07: Mike's Mall shuts at
  // nine like every mall in Thailand). `closesAt` is a nightTurn; it is checked
  // before the bar path, because a mall is not a bar and none of the midnight
  // machinery — last call, the Darkside bolt, the lock-in — applies to it.
  const r = ROOMS[to];
  if (r && r.closesAt != null) return _flag("act1Done") && G.nightTurn >= r.closesAt;
  return _flag("act1Done") && _closesMidnight(to) && G.nightTurn >= 60 &&
    !(G.soc.lockIn && G.soc.lockIn[to]) && !_lockInWelcome(to);
}
// Which bar off the street you're standing in has a back door open to you
// tonight — the target of ROUND THE BACK, and what the street's own line names.
function _lockInDoorHere() {
  const r = _room();
  const near = [].concat(r.venues || [], Object.values(r.exits || {}));
  return near.find(id => typeof id === "string" && _lockInWelcome(id)) || null;
}
// A shop or mall that keeps daytime hours, seen from outside after they end.
const _SHUT_EARLY = [
  "The shutters are down and the lights inside are the two the guard leaves on. Whatever they sell in there, they sell it to people who get up in the morning.",
  "Closed. A grille across the entrance, a security man on a plastic chair with his phone, and the whole building doing an impression of a place that was never open.",
  "Shut for the night. The escalators are stopped mid-stride behind the glass and the air coming off the doors is no longer cold.",
]
;
function _closedMsg(to) {
  const r = ROOMS[to];
  if (r && r.closesAt != null)
    return _pickVary(_SHUT_EARLY, "shutearly:" + to);
  if (r.region === "Darkside") {
    // The tease has to stop being a tease once the player can answer it. For a
    // man who has been bolted in somewhere on this side, the padded door is no
    // longer an unreachable rumour — it is a specific address, and the line
    // says so (Gerry, round 34, who read the old one on three separate nights
    // and could never find a way through it).
    // …the door on THIS street first: standing outside the Night Heron, just
    // walked out of its own lock-in, the line named Daeng's Place — the first
    // bar you were ever bolted into, not the one whose bolt you just heard
    // (Stan, round 35).
    const mine = (typeof _lockInDoorHere === "function" && _lockInDoorHere()) ||
      Object.keys(ROOMS).find(id => _lockInWelcome(id));
    return "Shutters down, lights dead, chairs up. The Darkside keeps the law's " +
      "hours — officially. Somewhere along the strip one padded door still thumps " +
      "with bass from a bar that is definitely, legally, closed." +
      (mine ? ` And you know which one, and roughly who is behind it: ${_barName(mine)}, ` +
        "and not through the front. (ROUND THE BACK)" : "");
  }
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
  const mins = Math.max(0, (60 - G.nightTurn) * 6);
  if (mins <= 6) return; // at the shutters there is no last call, only the shutters
  const when = mins >= 25 ? _L("about half an hour") : _fmt(_L("about {n} minutes"), { n: mins });
  // WHO IS TELLING YOU, AND WHETHER THERE IS ANYTHING TO BARFINE. This was one
  // fixed string for every midnight-closing room, so the lake's family fish
  // restaurant — the room the game's own prose calls "the most respectable for
  // miles — no neon, no touts, no trouble" — had a mamasan it does not employ
  // tap her watch and proposition the player on his way out (Wes, round 33,
  // 2026-09-01: the worst register break of his week). Same doctrine as the
  // _HEAT_FIRST fix: never narrate staff the room does not have, and never
  // sell a transaction the room does not offer.
  const here = _npcsHere();
  const mama = here.find(n => NPC_ROLES[n] === "mamasan");
  const sellable = here.some(n => NPC_ROLES[n] === "hostess");
  if (!sellable) {
    _say(_fmt("Last call — chairs start going up on the far tables: {when} to closing. " +
      "This place shuts at midnight.", { when }), "alert");
    return;
  }
  _say(_fmt("Last call — {who}: {when} to closing. " +
    "This place shuts at midnight, so if you mean to take a lady home tonight, now " +
    "is the moment to BARFINE. After the shutters come down it's the street.",
    { who: mama ? _fmt(_L("{n} taps her watch"), { n: NPCS[mama].name })
                : _L("somebody behind the bar taps a watch"), when }), "alert");
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
  if (G.pendingBf) return;   // not between SHORT TIME · LONG TIME and the answer (Kenji, round 47)
  if (G.nightTurn < LAST_BUS_TURN - 5 || G.nightTurn >= LAST_BUS_TURN) return;
  if (G.room === _hotelRoomId()) return; // already home — no race left to run
  if (typeof _workedTonight === "function" && _workedTonight() && G.room === ((G.bar && G.bar.room) || "")) return;   // standing his own rail: the last bus is not his (Malcolm, round 47)
  // …and not from the pillion seat of a night ride, whose whole design is that
  // she's your ride and the dread lifts (Howard, round 35: it printed between
  // stops on the back of her bike).
  if (G.rideSeq) return;
  if (_lockedIn()) return;   // …nor from inside a bolted party that runs till dawn
  G.lastBusWarned = true;
  const mins = Math.max(5, (LAST_BUS_TURN - G.nightTurn) * 6);
  _say(_fmt("Somewhere out there the songthaew loops are thinning — the last baht bus of " +
    "the easy hour is making its rounds, and after two the ฿{fare} ride home becomes a " +
    "wait at a kerb that keeps whoever stands on it. Call it {mins}. Get to a main road " +
    "while they're still frequent, or spend the small hours in whatever state you're in, " +
    "in public, waiting. This is the hour the night starts counting you instead.",
    { fare: BUS_FARE, mins: mins >= 25 ? _L("half an hour") : _fmt(_L("{n} minutes"), { n: mins }) }), "alert");
}

// ── The piwins, and buying sight ─────────────────────────────────────────────
// The motorbike-taxi men are the only people in this town who see all of it.
// They are at 35 stands and they were, until now, scenery: `motosai: true` on a
// room, a line of prose, and TALK TO PIWIN answering "nobody here goes by that"
// while the description said one was sitting right there.
//
// Deliberately a pseudo-NPC rather than 35 filler entries. Real NPCs would get
// the three surfaces for free, but they would also cost 35 portraits against an
// art budget already heading somewhere uncomfortable — and a piwin is a ROLE
// before he is a person. He is a person too, though, so each stand's man is
// hash-stable: the same fellow every time you come back to that corner.
//
// What you buy from him is not a ride. It is SIGHT. He knows who he dropped
// where and when, and he will not tell a stranger, because the whole value of
// knowing things in this town is not saying them. A beer changes that, and the
// second beer changes it more. Nothing here is a quest marker: he answers about
// people, honestly, with the staleness built into the answer — he tells you
// where he TOOK her and what time, not where she is now, because he does not
// know that either.
const _PIWIN_NAMES = ["Wit", "Chai", "Nueng", "Somphon", "Tui", "Beer", "Koi", "Chart"];
function _piwinHere() { return !!(_room() && _room().motosai) && !_isDarkHere(); }
function _piwinName() { return _PIWIN_NAMES[_hh(G.room, 11) % _PIWIN_NAMES.length]; }
function _grease() { G.soc.grease = G.soc.grease || {}; return G.soc.grease[G.room] || 0; }
function _addGrease(n) {
  G.soc.grease = G.soc.grease || {};
  G.soc.grease[G.room] = (G.soc.grease[G.room] || 0) + n;
}

const _PIWIN_HELLO = [
  "The piwin looks up from his phone, reads you as somebody not going anywhere, and " +
    "goes back to it. Not rude. Just accurate.",
  "He tips his chin at you and says nothing. The orange vest is folded on the seat " +
    "behind him and the engine is cold; he is off, more or less, and you are not a fare.",
  "\"Go where?\" He is already half off the seat. When it turns out you are not going " +
    "anywhere he settles back without any sign of disappointment.",
];
const _PIWIN_WARM = [
  "\"Ah, you again.\" He shifts along the bench to make a space that was already there.",
  "He raises the beer you bought him an inch, which on this bench is a whole greeting.",
  "\"Sit, sit.\" Room is made. The phone goes face-down, which is the actual courtesy.",
];
function _piwinTalk() {
  const g = _grease();
  _say(_pickVary(g > 0 ? _PIWIN_WARM : _PIWIN_HELLO, "piwintalk"));
  if (g === 0) {
    _say("(These men see the whole town and tell nobody. BUY PIWIN A BEER — then ask him " +
      "about somebody.)", "dim");
  }
}

const PIWIN_BEER = 60;   // a stand beer, off the cart, cheaper than a bar
function _piwinBeer() {
  if (G.money < PIWIN_BEER) {
    _say(_fmt("A beer off the cart is ฿{p}. You have ฿{m}.", { p: PIWIN_BEER, m: G.money }));
    return;
  }
  G.money -= PIWIN_BEER;
  _addGrease(1);
  const g = _grease();
  _say(_fmt(g === 1
    ? "You put a cold one in his hand. He looks at it, then at you, and the transaction " +
      "he had you filed under quietly changes category. \"Chok dee.\" He does not thank " +
      "you in words and the beer is gone in three pulls. (฿{m} left.)"
    : "Another one. He takes it as a matter of course now, which is the point — you are " +
      "no longer a man buying a piwin a beer, you are a man who buys him a beer. " +
      "(฿{m} left.)", { m: G.money }), "win");
  _repGain();
}

// What he'll tell you about somebody. Gated on the beer, honest about staleness,
// and never a marker: a hopper's answer is where he DROPPED her and when.
function _piwinAbout(who) {
  const g = _grease();
  // _findNpc is ROOM-scoped, which is right for "talk to X" and
  // exactly wrong here: you ask a piwin about people who are not in front of
  // you. That is the entire service.
  const w = String(who || "").trim().toLowerCase();
  const byName = src => Object.keys(src).find(k =>
    k === w || String(src[k].name || "").toLowerCase() === w ||
    String(src[k].name || "").toLowerCase().split(" ").pop() === w);
  if (/^(?:the )?(?:bus|buses|songthaews?|trucks?|baht bus|blue trucks?)$/.test(w)) {
    // "ask piwin about bus" got "Who?" (Darren, round 37) — the one thing every
    // piwin knows is where the trucks run, and out east the answer is the highway
    const lines = typeof _busLinesFor === "function" ? _busLinesFor(G.room) : [];
    _say(lines.length
      ? "\"Bus? Here, yes.\" He tips his chin at the road. \"Stand there, hand up. Late, you wait — but it come. Always come.\""
      : "\"Bus? Not down here, boss. Highway.\" He points west, toward the sodium glow. \"Sukhumvit — the Pattaya Tai truck stop at the crossing. Or —\" a pat on the seat behind him \"— I take you.\"");
    return;
  }
  // HIS OWN JOB, before the person lookup. Every non-person subject fell into
  // "Who? Don't know this one" — work, the fares, the stand, the vest, the rain —
  // from the one man on the corner all night who is the obvious person to ask
  // (Brian and Helen, round 49, independently).
  // a subject is not a person: "Who? Don't know this one" to MASSAGE and SEASON (Terence and
  // Mick, round 57). The piwin knows where the shops are and what month it is.
  if (/\b(massage|massages|masseuse|spa|foot rub|back)\b/.test(w)) {
    const legit = Object.keys(ROOMS).find(k => ROOMS[k].massage === "legit" && ROOMS[k].region === _room().region) || "thai_massage";
    // the street the door is on, not the district: "Second Road" sent Graeme up the wrong mile (round 58)
    const _st = Object.keys(ROOMS).find(k => (ROOMS[k].venues || []).includes(legit));
    _say(_fmt(_pickVary([
      "\"Massage? Real one or the other one?\" He grins at your face. \"Real one — {b}, on {s}. Very strong hands. The other one, every street with pink light.\" A pat on the seat.",
      "\"Real massage?\" He thinks about it properly. \"{b}. {s}. The lady there walk on your back — you cry, then you sleep.\" A pat on the seat. \"I take you.\"",
      "\"The pink one or the real one?\" He laughs before you answer. \"Real one is {b}, {s}. Pink one, you find by yourself, everybody do.\"",
    ], "piwinmassage"), { b: _barName(legit), s: _st ? ROOMS[_st].name : ROOMS[legit].region }));
    return;
  }
  if (/\b(season|low season|high season|wet season|rainy season|monsoon|busy|quiet)\b/.test(w)) {
    _say(_seasonTier() === "deeplow" || _seasonTier() === "low"
      ? "\"Season?\" He looks at the empty road. \"No season. Rain season. Farang stay home, I sit here, I count the dogs.\""
      : "\"Season good, boss.\" He counts the traffic with his chin. \"Everybody here, everybody want a bike. December I buy new tyre.\"");
    return;
  }
  if (/\borchid\b/.test(w)) { _say("\"The Orchid?\" He does not pat the seat. \"Nobody drive you there, boss. That one, you get taken. Ask the man who takes you.\""); return; }   // "room" read as the hotel (László, round 73)
  if (/\b(work|job|fares?|the stand|stand|vest|jacket|number|queue|rain|police|helmet|pay|money|tip|night|hours|boss|licen[cs]e|crash|accident|drunk|hotels?|room|sleep|bed|food|eat|eating|hungry|noodles?|som tam|rice|dinner|wallet|pickpocket)\b/.test(w)) {
    const say =
      /\b(work|job|hours|night|boss)\b/.test(w) ? "\"Work? This.\" He pats the seat. \"Six in the evening to whenever. No boss — the vest is the boss. Queue is the boss.\" He nods down the line of bikes. \"He go first, then him, then me. Cheating the queue is how you lose the vest.\"" :
      /\b(fares?|pay|money|tip)\b/.test(w) ? _fmt("\"Fare is fare, boss. In town {t}. The Darkside {f}. After the sparse hour, more.\" He does not apologise for any of it. \"Tip? Up to you. Most farang: no. Some farang: yes. Thai: never, and I still take them.\"", { t: "฿" + _num(MOTOSAI_TOWN), f: "฿" + _num(MOTOSAI_FAR) }) +
        // the mates' rate is the fare he actually charges you (Wiremu, round 59)
        (_flag("helmetDelivered") ? " A grin. \"For you, twenty. Every stand know the helmet man.\"" : "") :
      /\b(vest|jacket|number|queue|licen[cs]e)\b/.test(w) ? "\"The vest is the stand.\" He plucks the orange nylon. \"Number is my number. No vest, no stand — you ride from the side of the road, police take the bike. Vest cost more than the bike, some year.\"" :
      /\b(food|eat|eating|hungry|noodles?|som tam|rice|dinner)\b/.test(w) ? (FOOD_STALLS[G.room]
        ? _fmt("\"Eat? Right there, boss.\" A chin at the stall. \"{s}. I eat there every night — if it was bad I am dead already.\"", { s: FOOD_STALLS[G.room].name.replace(/^(a |an |the )/, "").replace(/,.*$/, "") })
        : "\"Eat?\" He thinks about it properly. \"7-Eleven, toastie, if you are lazy. Buakhao market, the old one, if you are hungry — I take you, ten minutes.\" He pats the seat.") :   // "Who? Don't know this one" (Marek, round 53)
      /\b(hotels?|room|sleep|bed)\b/.test(w) ? "\"Hotel? Which one?\" He counts them on the handlebar. \"Sabai Palms up Naklua. The Queen Vic on Soi 6, over the pub. Areca on Diana, has the pool. Metropole, the tower by LK Metro.\" A shrug. \"Say which one, boss. You don't say, I choose, and the one I choose is the one that gives me twenty baht.\" He grins. \"So say.\"" :   // Joan, round 54: "hotel" got the stranger shrug
      /\b(wallet|pickpocket|my money|money stolen)\b/.test(w) ? "\"Wallet?\" He pats his own front pocket, which is where his lives. \"Front pocket, boss. Walking Street, the back pocket is a donation.\"" :   // "who? don't know this one" (Fintan, round 60)
      /\b(rain)\b/.test(w) ? "\"Rain?\" He points at the plastic poncho folded under the seat. \"Rain is good. Nobody want to walk. Rain is money.\" A beat. \"Bad rain is bad. Bad rain, everybody home.\"" :
      /\b(police|helmet)\b/.test(w) ? "\"Helmet for me, always.\" He taps it. \"For you — better yes. Police stand at the bottom of Soi 6, six to seven. Farang no helmet is the best money they make all day.\"" :
      "\"Crash?\" He looks at you as if you have asked whether the sea is wet. \"Everybody crash. Little bit. I don\u2019t crash with a customer. Customer crash, no more customer.\"";
    _say(say);
    return;
  }
  const id = byName(NPCS);
  // a PLACE is the piwin's whole trade: "ask piwin about rainbow girls" got "Who?"
  // from the man Nok says knows every door in town (Anand, round 59)
  if (!id) {
    const k = _pnm(w.replace(/^(the|a|an) /, ""));
    // the whole name, or a name that BEGINS with what he was asked and isn't short — "neon paradise" for
    // Neon Paradise A-Go-Go got "Who?" from the man who drives there nightly (Jens, round 67; _tanAbout's rule)
    const venue = k.length >= 3 && (Object.keys(ROOMS).find(v => ROOMS[v].bar && [k, k + " bar"].includes(_pnm(ROOMS[v].bar))) ||
      (k.length >= 5 && Object.keys(ROOMS).find(v => ROOMS[v].bar && _pnm(ROOMS[v].bar).startsWith(k))));
    if (/\b(clinic|tested|std|the doctor)\b/.test(w)) { _say("\"Clinic?\" He knows the one you mean without asking which. \"Second Road, by Central — glass door, next to the pharmacy. Free. I take you, nobody look.\""); return; }
    const region = k.length >= 3 && [...new Set(Object.values(ROOMS).map(r => r.region).filter(Boolean))].find(rg => _pnm(rg) === k);
    if (venue === "nottys_place") { _say("\"Notty's?\" He grins. \"The wall, I know. The wall, I cannot open.\""); return; }
    // the Old Market and the boy with the phones: every stand in town knows both (Graham, round 74: "Who?")
    if (/\b(old market|the market|buakhao market)\b/.test(w)) { _say("\"Old Market? Soi Buakhao, the middle, by the noodle carts.\" He pats the seat. \"Everybody know. Get on.\""); return; }
    if (/\bnont\b/.test(w)) { _say("\"Nont?\" A short laugh. \"The boy with the phones, Old Market, the folding table of phone cases. Every piwin know Nont. Half of us charge our phone there.\""); return; }
    if (venue && ROOMS[venue].invite) { _say(_fmt("\"{v}?\" He does not pat the seat. \"Nobody drive you there, boss. That one, you get taken.\"", { v: _barName(venue) })); return true; }   // the piwin placed the Orchid Room and then re-asked where to (László, round 73)
    if (venue) { _say(_fmt("\"{v}? {r}.\" He pats the seat. \"Everybody know. Get on.\"", { v: _barName(venue), r: ROOMS[venue].region })); return; }
    if (region) { _say(_fmt("\"{r}?\" As if you had asked him where the sea is. \"Get on, boss.\"", { r: region })); return; }
  }
  if (!id) { _say("\"Who?\" He shrugs, entirely unbothered. \"Don't know this one.\""); return; }
  const label = NPCS[id].name;
  if (id === "nont") { _say("\"Nont?\" A short laugh. \"The boy with the phones, Old Market, the folding table of phone cases. Every piwin know Nont. Half of us charge our phone there.\""); return; }   // the one name every stand knows (Graham, round 74)
  if (!(G.known && G.known[id])) {
    _say("\"Mm.\" He does not know the name either, or does not care to. \"Lot of people.\"");
    return;
  }
  if (g === 0) {
    _say(_fmt("\"{n}?\" He looks at you for a moment longer than the question needs, and " +
      "then back at his phone. \"Sure. I know everybody.\" That is the whole answer, and " +
      "it is a complete sentence.", { n: label }));
    _say("(He isn't being difficult. You just haven't bought him anything.)", "dim");
    return;
  }
  // One cast now — but a regular's absence must still read: on David's work
  // night or a low-season stay-in, _npcWhere answers null (inactive) where a
  // bare _npcRoom would happily name the stool he isn't on.
  if (NPCS[id].offmap) { _say(_fmt("\"{n}? Nobody drives her. She call you, or she don't.\"", { n: label })); return; }
  const room = NPCS[id].patron ? _npcWhere(id) : _npcRoom(id);
  const where = room ? (_barName(room) || (ROOMS[room] && ROOMS[room].name)) : null;
  if (!where) { _say(_fmt("\"{n}. Not tonight, I think. Not seen.\"", { n: label })); return; }
  if (ROOMS[room] && ROOMS[room].invite) {   // a room you are taken into (Margarethe, round 47)
    _say(_fmt("\"{n}. {w} — behind the Pink Lotus.\" He shakes his head. \"You don't get in there by asking a piwin, and I don't take you. Somebody take you, or nobody.\"", { n: label, w: where }));
    return;
  }
  const hopper = !!(NPCS[id].patron && NPCS[id].hops);
  if (hopper) {
    _say(_fmt("He thinks, and it is a real think — he is going through his own evening. " +
      "\"{n}. I take him {w}, maybe two hour ago.\" A shrug that is not indifference but " +
      "accuracy. \"Where he is NOW, I don't know. Man like that, he move.\"",
      { n: label, w: where }));
  } else {
    _say(_fmt("\"{n}.\" No hesitation at all. \"{w}. Every night this week.\" He says it " +
      "the way you would give somebody the time.", { n: label, w: where }));
  }
  if (g >= 2) {
    _say("He adds something else, unprompted, because two beers is a different " +
      "relationship from one: \"You want, I take you. No charge. You buy me beer, I " +
      "don't take your money also — is not how it works.\"", "dim");
  }
}

// ── The amulet: what the town makes of it ────────────────────────────────────
// Two notices, and the restraint is the design. The piwin is the ONLY reliable
// one, because motorbike-taxi men genuinely all wear amulets — the job kills
// people — and they read each other's. He can tell it is neither shop-bought
// nor temple issue, and that is all he will say.
//
// Deliberately NOT a trail of breadcrumbs. A second reaction would turn the
// mystery into a checklist ("quest active"), so there is one notice, once ever,
// and after that the player is holding a fact and no instructions. The only
// other thing they know is where they found it — so going back to that beach
// has to be their own deduction, which is the whole point, because Nok is
// twenty-odd hops from anywhere they live and nobody wanders past her.
const _AMULET_PIWIN = [
  "The piwin takes your fare, then stops — he has seen the amulet. He leans in without " +
    "asking, turns it over on its cord with two fingers, and looks at the back for a long " +
    "moment. Then he lets go of it. “Not from shop,” he says. “Not from temple also.” He " +
    "hands you your change and does not explain, and does not quite look at you again.",
  "Your change comes back slower than it should. The piwin is looking at your chest — at " +
    "the amulet — and when he sees you notice he taps his own, under his shirt, the way a " +
    "man shows you his union card. Then he turns yours over, reads the back, and puts it " +
    "down flat against you again. “Where you get?” Nothing in the question is casual.",
  "He clocks it while you are still counting out the fare, and the easy patter stops. A " +
    "long look, a thumb across the worn back of it, and a short breath through the nose. " +
    "“This one, somebody make it,” the piwin says. “Not buy. Make.” He kicks the bike over " +
    "before you can ask what the difference is.",
];
function _amuletNotice() {
  if (!G.amuletWorn || _flag("amuletSeen") || _flag("amuletReturned")) return;
  if (!_room().motosai) return;
  _setFlag("amuletSeen");
  _say(_pickVary(_AMULET_PIWIN, "amuletpiwin"), "alert");
  // …and if you have ever bought this man a beer, he says the second thing. He
  // would not tell a stranger, which was always the reason he stopped talking —
  // not mystery for its own sake, just the ordinary rule that knowing things is
  // worth nothing once you have said them.
  if (_grease() > 0) {
    _say("Then, because it is you: \"My auntie have one like this.\" He holds two " +
      "fingers a small distance apart, meaning small, or meaning quiet. \"Not for wear. " +
      "For remember somebody.\" He kicks the bike over. \"Anyway. Where you go?\"", "dim");
  }
}

// Nok, and the door that closes politely.
//
// She does not explain, and that is the point rather than a gap. A woman
// tidying a shrine for a drowned boy does not explain it to a farang who has
// just taken the amulet off it — explaining would make him someone who has to
// be consoled, and she has a shrine to tidy. Her thank-you is COMPLETE. The
// player simply cannot read it, which is this game's oldest move: nobody hands
// over what actually matters and you never get a briefing.
//
// The reading comes later and elsewhere, from Mort, who has watched this coast
// for fifty years and writes it down. Some players will never go and ask, and
// will carry an unexplained snub for the rest of the game. That is a correct
// outcome, not a missed one.
const _NOK_AMULET = [
  "Auntie Nok looks up from her phone with the bottle-price face on, and then she does " +
    "not. She has seen it. She puts the {{phone}} down — actually down, screen to the cart — " +
    "and opens her hand flat on the cart, and waits.",
  "She is halfway through telling you the price of a Leo when she stops. Her eyes go to " +
    "the amulet and stay there, and the whole cheerful machinery of the cart switches off. " +
    "She opens her hand on the cart and does not say anything at all.",
];
function _nokAmulet() {
  if (!G.amuletWorn || _flag("amuletReturned")) return;
  if (G.room !== _npcRoom("nok")) return;
  if (_flag("nokSawAmulet")) return;
  _setFlag("nokSawAmulet");
  _say(_pickVary(_NOK_AMULET, "nokamulet"), "alert");
  _say("(She wants it. GIVE AMULET TO NOK — or don't.)", "dim");
}
// Handing it back. No reward, no warmth, no quest journal tick — she says thank
// you correctly and goes back to work, and the player is left holding nothing
// and no explanation.
function _nokTakeAmulet() {
  G.itemLoc.amulet = null;
  G.amuletWorn = false;
  _setFlag("amuletReturned");
  _say("She takes it off you the moment it is off your neck, closes her hand round it, " +
    "and says “Thank you, kha.” Twice. The second one is quieter and is not for you.\n\n" +
    "Then she picks the {{phone}} back up. The cooler hums. A boy comes for a bag of ice and " +
    "she serves him, and the price of a Leo is what it was, and the evening carries on " +
    "exactly as it was going to. She does not mention it again, that night or any other.",
    "win");
  _addHappy(3);
  _repGain();
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
  if (typeof _atOwnBar === "function" && _atOwnBar()) return; // your own manager doesn't stand you the house's shot
  const id = _managerHere();
  if (!id) return;
  G.soc.mgrShot = G.soc.mgrShot || {};
  if (G.soc.mgrShot[G.room]) return;
  G.soc.mgrShot[G.room] = true;
  _addHappy(1);
  let pool = (NPCS[id].shot && NPCS[id].shot.length) ? NPCS[id].shot : _MGR_SHOT;
  // "New face" on a fifth visit read as amnesia (27-night playtest 2026-08-22)
  if ((G.soc.manDrinks && G.soc.manDrinks[id]) || _met(id)) pool = pool.filter(s => !/New face/.test(s));
  if (!pool.length) pool = _MGR_SHOT.filter(s => !/New face/.test(s));
  _say(_fmt(_pickVary(pool, "mgrshot:" + id), { n: NPCS[id].name, bar: _barName(G.room) || "the bar" }) +
    " (Stand him a BUY MAN DRINK when you've been bending his ear.)", "win");
  _compDrink(1);
}

// ── Comped drinks ────────────────────────────────────────────────────────────
// A free drink is still a drink. The bell's comped bottle and the lock-in's
// party never touched the meter, so a man could be handed six and walk out
// sober (round 36) — every free pour now goes through _compDrink. And the
// Owl's letter has carried the canon for a year: "that drink was an
// interview". _pushyBar marks the rails where it is — a stable quarter of the
// town's bars, by pure hash, never your own — and there a comp is poured
// HEAVY (one extra on the meter), and if it tips you past the line where a
// sober man would notice, a girl is on the next stool with a lady drink
// already chalked to you (Mario, 2026-09-03: comped drinks are a way for an
// unscrupulous mama to get you spending). Once a bar a night; the chit is
// real money, the bar's book says you bought her one (mama's midnight gate
// reads it), and the girl is genuinely grateful — the angle is the house's,
// not hers. A player who stays under three drinks is never padded: the
// defence is sobriety, which is the thesis of the whole game.
function _pushyBar(room) {
  const r = ROOMS[room];
  if (!r || !["beer", "soi6", "gogo", "gents"].includes(r.barType)) return false;
  if (typeof _barOwned === "function" && _barOwned() && G.bar && G.bar.room === room) return false;
  return _hh(room, 131) % 100 < 25;
}
const _COMP_HEAVY = [
  "It's poured without a measure — a proper glass, not a shot — and whoever poured it watches you drink it.",
  "Heavy pour. The kind of free drink that is mostly the drink.",
  "Free, and about a double, and put down in front of you with a little too much attention paid to it going down.",
  "It's filled to the brim, and whoever filled it waits. Not for thanks.",
  "It arrives large. In this town a free drink is an interview, and the size of it is the first question.",
];
const _COMP_PADDED = [
  "{n} is on the stool beside you with a lady drink you don't remember buying, and the cashier has already chalked it. (-฿{p}, ฿{m} left.) She is very grateful. She is not the one who ordered it.",
  "Somewhere between the free one and the next, {n} sat down, a drink came for her, and the chit went on your tab without anybody asking. (-฿{p}, ฿{m} left.) You notice it a beat late, which was the idea.",
  "The bar's arithmetic: one free drink for you, one lady drink for {n} at ฿{p}, and nobody said the second part out loud. (฿{m} left.) She clinks your glass. Her smile is real; the drink was the mamasan's.",
  "{n} arrives with her drink already in her hand and your name already on the chit. (-฿{p}, ฿{m} left.) You could argue it. Three drinks in, you don't.",
  "A hand on your shoulder, {n} on the next stool, the cashier writing. Lady drink, ฿{p}, yours. (฿{m} left.) That is what the free one was for.",
];
// A comped drink is a drink (Mario, 2026-09-03) — but a man who has SAID he
// doesn't drink is not poured one (Neville, round 53: eight units reached a
// fourteen-years-sober man who ordered none of them, and the one barman in the
// same club as him poured a free one without asking). I DON'T DRINK once, and the
// house remembers: the shot goes back across the rail or to the next stool, the
// meter is untouched. Anyone else can hand a comp back inside two turns.
const _COMP_DECLINED = [
  "The glass stops in front of you and goes no further. \"Soda water, slice,\" you say, and it's poured for the next stool instead; nobody minds and nobody remembers.",
  "You leave it where it was put. The barman clocks it, says nothing, and it finds a hand that wanted it inside the minute.",
  "\"Not for me.\" A nod, no argument — this town has seen every kind of man and the ones who don't drink are the least trouble it gets.",
  "It sits there being a drink. You go on being a man with a soda, and somebody down the rail is a drink up on the night.",
];
function _compDrink(n) {
  n = n || 1;
  if (G.player && G.player.teetotal) { _say(_pickVary(_COMP_DECLINED, "compdecl"), "dim"); return; }
  G.lastComp = { turn: G.turns, room: G.room };
  const heavy = _pushyBar(G.room) && !_lockedIn();   // a bolted door is a bar that loves you, not one working you
  G.soc.drunk += n + (heavy ? 1 : 0);
  G.thirst = Math.max(0, G.thirst - 20 * n);
  (G.soc.comped = G.soc.comped || {})[G.room] = (G.soc.comped[G.room] || 0) + 1;
  if (heavy) _say(_pickVary(_COMP_HEAVY, "compheavy"), "dim");
  const day = G.day;
  _checkDrunk();
  if (heavy && G.day === day) _pushyUpsell();
}
function _pushyUpsell() {
  G.soc.padded = G.soc.padded || {};
  if (G.soc.padded[G.room]) return;
  if (G.party && G.party.ids && G.party.ids.length) return;   // her drink would be chalked with another woman on your arm (composition audit, 2026-10-08)
  if (G.soc.drunk < 3) return;                 // sober, you'd notice — and she knows it
  if (G.money < _ladyPrice()) return;
  const girls = _npcsHere().filter(id => NPC_ROLES[id] === "hostess");
  if (!girls.length) return;
  const id = girls[_hh(G.room + ":" + G.day, 7) % girls.length];   // pure hash, no dice
  G.soc.padded[G.room] = id;
  _ladyDrinkCharge(id);
  (G.soc.drinkCount = G.soc.drinkCount || {})[id] = (G.soc.drinkCount[id] || 0) + 1;
  _boughtBond(id, 1);
  _say(_fmt(_pickVary(_COMP_PADDED, "comppadded"), { n: NPCS[id].name, p: _ladyPrice(), m: G.money }), "dim");
}

function _closingTick() {
  if (!_flag("act1Done") || G.over) return;
  if (!_closesMidnight(G.room) || _lockedIn()) return;
  const r = _room();
  // the last-call courtesy in the final half hour
  if (G.nightTurn >= 55 && G.nightTurn < 60) { _lastCall(G.room); return; }
  if (G.nightTurn < 60) return;
  if (G.offstage) return;
  // midnight. A Darkside bar with a spender bolts the door instead of shutting it.
  if (r.region === "Darkside" && r.lockIn && _barSpendTonight(G.room)) {
    _lockInBegin(G.room);
    // …and the house remembers who was inside, and WHICH NIGHT. G.soc.lockIn
    // is nightly; this is the permanent one — the difference between a
    // customer who spent well once and a face the door knows (_lockInWelcome).
    // The day matters because OUT is one-way and says so: walking out doesn't
    // buy you back in tonight, it buys you in from tomorrow.
    (G.lockedInAt = G.lockedInAt || {})[G.room] = G.day;
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
  if (G.game) _abandonGame("Midnight calls it");
  if (G.pendingEnc) {
    G.pendingEnc = null; G.encPrompt = null;
    _say("(Whatever was being offered, the shutters settle it — the moment goes " +
      "home with everybody else.)", "dim");
  }
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

// ── THE LOCK-IN'S INTERIOR ──────────────────────────────────────────────────
// The entry beat was superb and there was nothing behind it: "the party runs
// while the money does" was never enforced, and a man could WAIT 15 inside a
// bolted door and get the ordinary bar text back — "the far stools are empty
// tonight" printed inside a music-up, aircon-cold, after-hours party (Stan,
// round 35). This is what's behind the bolt.
//
// A lock-in is a wild party with a lot of sexual shenanigans in it — not the
// off-the-clock som-tam-and-cards room, which is what the bar becomes AFTER
// the last punter leaves (Mario). So the register is PG-13 the way film does
// it: the cutaway, evidence not acts, sound and light, the lifer's euphemism,
// your own part elided ("what happens after that stays inside the paint"),
// and comedy. The narrator never looks directly. Three stages by turns inside
// — loosening, the games, lights down — then dawn's evidence; one dare that
// can land on YOU; a round expected while the money runs; and the coda for
// the man still there when the room turns back into a workplace. Pooled, all
// of it: a lock-in is a repeatable night. Explicit tier stays a pack hook.
const _LOCKIN_LOOSEN = [
  "Somebody turns the music up a notch and nobody turns it down. The cashier, who has counted " +
    "every baht in this building for six years, has taken her shoes off under the till and " +
    "is not counting anything.",
  "The mamasan pours a round nobody ordered and doesn't write it down, which in this room is " +
    "roughly the equivalent of a declaration of war on the calendar.",
  "A girl comes back from the toilet in a different top. Then a different girl does. A pattern " +
    "is forming and you are choosing not to be the man who points it out.",
  "The regular at the end — asleep since eleven — is gently relocated to two chairs pushed together " +
    "by two girls and a cashier, with the practised handling of people who have moved this exact regular before.",
  "The bell rings. Nobody paid for it. The mamasan looks at the rope, looks at the girl holding " +
    "the rope, and lets it go, which is a thing you have never once seen her do.",
  "Phones go into a biscuit tin behind the bar, one after another, without anybody asking. " +
    "Yours is politely held out for. The tin has a lid. The lid goes on.",
];
const _LOCKIN_GAMES = [
  "The dice game at the corner table has rules nobody explains and stakes that are visibly not " +
    "money — and, around the third round, your full attention on the grain of the bar top, " +
    "which has a cigarette burn the shape of Thailand you had not noticed before.",
  "A kiss is auctioned for the tip jar. The bidding is brisk, in three currencies, and won by a " +
    "man who then loses it again in a dare within the minute. The tip jar does well out of both.",
  "Somebody's boyfriend arrives through the back on a Wave, is handed a beer and a plate, sits " +
    "at the bar with his back to the room, and does not turn around once. He has done this " +
    "before. It is the wisest thing anyone in the building is doing.",
  "A punter who has lost a bet has to sing, and the song is the one everybody knows, and by " +
    "the chorus two of the girls are on the bar and one of the girls is on the punter, and the " +
    "mamasan is refereeing with a wooden spoon.",
  "\"Ah,\" says the lifer at the end, watching the far corner with the fond, unfocused eye of " +
    // "It is not Thursday" was a claim about tonight that the line never checked —
    // and a lock-in on a Thursday made the joke contradict the calendar. The
    // vagueness IS the joke, so it keeps it and drops the day (class K).
    "a man who has seen it. \"The Thursday thing.\" He does not elaborate, and nobody " +
    "in the room asks him which Thursday.",
  "A shirt goes over the bell rope. A second shirt goes over the first. You are fairly sure " +
    "neither of them started the evening on the customer side of the bar.",
];
const _LOCKIN_DARK = [
  "The lamp at the dark end goes off. It does not come back on. The music does not get louder, " +
    "exactly, but it gets closer.",
  "The room has split into the part with the light on, which is where you are, and the part " +
    "without, which is where the laughing is coming from — a low, constant, private laughing " +
    "that has no punchline you're going to hear.",
  "Out the back — past the toilets, through a door you had not clocked — water runs for a long " +
    "time, stops, starts again. Two people go through that door. One, later, comes back.",
  "You become extremely interested in the label on your bottle. It is a good label. It has a " +
    "lot going on. Behind you the bell rings again, and again nobody has paid for it.",
  "The mamasan sits down next to you, the first time she has sat all night, and lights a " +
    "cigarette, and watches the dark end of her own bar with the expression of a woman doing " +
    "sums she has done before. \"Sabai?\" she asks you. It is not really a question.",
];
const _LOCKIN_DARE = [
  n => `The dice come round the table to you. ${n} holds the cup out, one eyebrow up, and the ` +
    `whole corner goes quiet in the specific way a corner goes quiet when it has decided you are ` +
    `next. The stakes are whatever the last man lost. (JOIN IN · or keep your seat.)`,
  n => `${n} arrives at your stool with a shot in each hand and the look of a woman delivering ` +
    `a verdict. "Everybody play. You play." The room has turned to watch you decide, which is ` +
    `its own kind of pressure. (JOIN IN · or keep your seat.)`,
  n => `A hand on your collar from behind — ${n}'s — and a voice in your ear that does not ` +
    `quite make the offer in words. The corner is waiting. The light at the dark end is ` +
    `already off. (JOIN IN · or keep your seat.)`,
];
const _LOCKIN_JOIN = [
  "You get up. What happens after that stays inside the paint — but the shirt on the bell rope " +
    "is yours by the end of it, and you are not sure at which point that happened, and nobody is " +
    "going to tell you.",
  "You go. You have been in this room before, and the next hour arrives in pieces: a song you " +
    "did not hear start, a glass somebody put in your hand, a joke you are laughing at from the " +
    "middle. When you look up you are sitting somewhere else.",
  "You join in. It is later, afterwards. The mamasan puts a water in front of you without a " +
    "word, and the girl who dealt you in is back behind the bar in a different top, counting " +
    "the tip jar with an expression of professional satisfaction.",
  "The dice are kind to you and then extremely unkind, and the room enjoys both, and somewhere " +
    "in the unkind part the lamp at your end goes off too. What the paint keeps, the paint keeps.",
];
const _LOCKIN_DECLINE = [
  "You keep your seat. Nobody minds — this room has a long memory for men who join in and no " +
    "memory at all for men who don't. The dice go on round without you; the party does not.",
  "You raise your bottle an inch in a gesture that means thank you and no, and the corner " +
    "accepts it with a cheer that is only slightly mocking. Your stool, at least, is safe.",
  "\"Next time,\" you say, and the girl with the shots shrugs a shoulder that says there is " +
    "always a next time and you will always say that. The game moves on. So does the night.",
];
const _LOCKIN_ROUND = [
  n => `${n} looks at the till, looks at the bar in front of you — the same bottle it was ` +
    `twenty minutes ago — and looks away again, which from a mamasan is a sentence.`,
  n => `The temperature in your corner drops a degree. Nothing is said. ${n} sends a girl past ` +
    `you to the next stool and the girl stays there, and the party goes on being a party ` +
    `about a metre further away than it was.`,
  n => `${n} wipes the bar in front of you, slowly, all the way to the edge, and puts a menu ` +
    `down where the cloth was. She does not open it. She does not need to.`,
];
const _LOCKIN_WALKOUT = [
  n => `${n} comes round the bar, takes your elbow with real warmth, and walks you to the door ` +
    `the way she walked the others at midnight. "Goodnight, tilac. Tomorrow, na." The bolt ` +
    `slides, the night air comes in for exactly as long as you take, and goes back across ` +
    `behind you. The party runs while the money does. It has run out of yours.`,
  n => `"Tilac." ${n}, at your shoulder, not unkind. "Is late for you." It is not late for ` +
    `anybody else in the room, and both of you know that is the point. She sees you out ` +
    `herself; the bolt goes back with the same flat sound; behind it, the music does not ` +
    `even pause.`,
];
const _LOCKIN_CODA = [
  "The last punter goes out through the front, walked by two girls to the bolt and back, and " +
    "the room changes state without anybody announcing it: the music down, the lamp back on, " +
    "the shirts off the bell rope and folded. The mamasan sits with her shoes off and counts. " +
    "Somebody produces som tam in a plastic bag and four spoons. You are, it appears, still here, " +
    "and nobody has asked you to leave, which is its own kind of admission.",
  "It empties the way a tide goes out — one man, then two, then the boyfriend on the Wave — " +
    "and what's left is a bar with the lights on and the staff in their own clothes, a deck of " +
    "cards coming out of the till drawer, and a girl asleep across two stools with her feet in the " +
    "cashier's lap. Nobody is performing anything. You are being allowed to watch.",
  "By the time the room is only staff, it is a different room: the mamasan eating standing up, " +
    "the cashier doing the count out loud in Isan, two of the girls sharing a cigarette on the " +
    "step out the back with the alley door propped. One of them looks round at you, decides " +
    "something, and goes back to the cigarette. You have been filed under furniture. It is a " +
    "compliment.",
  "The party is over and the night isn't: the cards are out at the corner table, real money now, " +
    "small money, the girls' own, and the dealing is fast and merciless and in a dialect. Nobody " +
    "deals you in. Nobody deals you out either. The mamasan puts a water in front of you and a " +
    "plate you didn't order, and the sky outside the painted glass is not yet anything.",
];
// Once, when the door bolts — from midnight or from the alley. The interior
// clock starts here; everything below is turns since.
function _lockInBegin(room) {
  (G.soc.lockIn = G.soc.lockIn || {})[room] = true;
  (G.soc.lockInAt = G.soc.lockInAt || {})[room] = G.nightTurn;
  (G.lockedInAt = G.lockedInAt || {})[room] = G.day;   // the permanent record (_lockInWelcome)
  (G.soc.lockInCheck = G.soc.lockInCheck || {})[room] = { turn: G.nightTurn, money: G.money };
}
let _lockInBusy = false;   // a dare's elided time must not print vignettes into itself
function _lockInTick() {
  if (!_lockedIn() || G.over || G.pendingEnc || G.pendingChoice || G.game || _lockInBusy) return;
  const room = G.room, r = _room();
  const since = G.nightTurn - ((G.soc.lockInAt || {})[room] || G.nightTurn);
  const mama = _npcsHere().find(n => NPC_ROLES[n] === "mamasan") ||
    (typeof _tillKeeper === "function" && _tillKeeper(room));
  const mname = mama ? NPCS[mama].name : "The mamasan";
  // THE PARTY RUNS WHILE THE MONEY DOES. Every 15 turns inside: has the till
  // seen you? First miss, the temperature drops; second, she walks you out
  // with the same courtesy she used at midnight. Spending resets the clock.
  const chk = (G.soc.lockInCheck = G.soc.lockInCheck || {})[room] || (G.soc.lockInCheck[room] = { turn: G.nightTurn, money: G.money });
  if (G.money < chk.money) { chk.money = G.money; chk.turn = G.nightTurn; chk.warned = false; }
  else if (G.nightTurn - chk.turn >= 15) {
    if (!chk.warned) { chk.warned = true; chk.turn = G.nightTurn; _say(_pickVary(_LOCKIN_ROUND, "lockinround")(mname), "dim"); }
    else {
      delete G.soc.lockIn[room];
      (G.soc.leftLockIn = G.soc.leftLockIn || {})[room] = true;
      _say(_pickVary(_LOCKIN_WALKOUT, "lockinout")(mname), "alert");
      const dest = r.exits && r.exits.out;
      if (dest) { G.room = dest; _describeRoom(true); }
      return;
    }
  }
  // the coda: the last punter leaves before dawn, and the room turns back
  // into a workplace with you still in it
  if (G.nightTurn >= 92 && !(G.soc.lockInCoda || {})[room]) {
    (G.soc.lockInCoda = G.soc.lockInCoda || {})[room] = true;
    _say(_pickVary(_LOCKIN_CODA, "lockincoda"), "room");
    return;
  }
  // the dare lands once, early in the games
  if (since >= 12 && !(G.soc.lockInDare || {})[room]) {
    const girl = _npcsHere().find(n => NPC_ROLES[n] === "hostess");
    if (girl) {
      (G.soc.lockInDare = G.soc.lockInDare || {})[room] = true;
      G.pendingEnc = "lockdare";
      _encPrompt([_pickVary(_LOCKIN_DARE, "lockindare")(NPCS[girl].name), "alert"]);
      return;
    }
  }
  // a vignette every eight turns, from the stage the night has reached — but
  // not once the coda has turned the room back into a workplace
  if ((G.soc.lockInCoda || {})[room]) return;
  const last = (G.soc.lockInLast || {})[room];
  if (last != null && G.nightTurn - last < 8) return;
  if (last == null && since < 4) return;
  (G.soc.lockInLast = G.soc.lockInLast || {})[room] = G.nightTurn;
  const pool = since < 10 ? _LOCKIN_LOOSEN : since < 22 ? _LOCKIN_GAMES : _LOCKIN_DARK;
  const key = since < 10 ? "lockin1" : since < 22 ? "lockin2" : "lockin3";
  _say(_pickVary(pool, key), "dim");
}
// The dare's resolver (G.pendingEnc = "lockdare"). JOIN IN elides time — the
// paint keeps what it keeps — and pays as COMPANY does: non-jading สนุก and a
// real bond with the girls in the room (_addBond, not _boughtBond: nothing was
// bought). Keeping your seat costs nothing and is voiced.
function _lockInDare(input) {
  const yes = /\b(join|yes|in|go|dare|ok|okay|sure|why not|do it|play|deal me)\b/.test(input) &&
    !/\b(no|keep|seat|stay|watch|pass|not)\b/.test(input);
  if (!yes) { _say(_pickVary(_LOCKIN_DECLINE, "lockindecline"), "dim"); return; }
  _lockInBusy = true;
  try { for (let i = 0; i < 5 && !G.over; i++) _tick(); } finally { _lockInBusy = false; }
  _say(_pickVary(_LOCKIN_JOIN, "lockinjoin"), "win");
  _compDrink(2);                               // the paint keeps what it keeps; the meter keeps the drinks
  (G.soc.lockInLast = G.soc.lockInLast || {})[G.room] = G.nightTurn;   // the elision IS the beat; no vignette on its heels
  for (const id of _npcsHere()) if (NPC_ROLES[id] === "hostess") _addBond(id, 1);
  _addHappy(3, "the party, and being in it");
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
  if (!m) { _gameBoard(); _say("Not a move — tap a column 1-7, or Q to quit.", "dim"); return false; } // not a move: no tick
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
    if (g.stake && typeof _atOwnBar === "function" && _atOwnBar() && G.bar) { G.bar.cash += g.stake; if (typeof _barEvent === "function") _barEvent(g.stake, "a Connect 4 stake lost to the house"); }   // and named in BOOKS (the money audit, E2)   // "joins the till" — your own (Marta, round 63)
    _endGame(false, 0, _pickVary(_C4_LOSS, "c4loss")(g.opp, ai + 1) +
      (g.stake ? ` Your ฿${_num(g.stake)} joins the till.` : ""));
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
  const asked = betM ? parseInt(betM[0], 10) : JP_DEFAULT;
  const want = Math.max(JP_MIN, Math.min(JP_MAX, asked));
  if (asked > JP_MAX) _say(`(House max on the Jackpot is ฿${_num(JP_MAX)} — the rest stays in your pocket.)`, "dim");
  // Connect 4 honoured "with <name>" and Jackpot silently ignored it, so a man
  // who asked for the mamasan by name got dealt to a floor girl with no comment
  // (Trev, round 44). Dice carry no skill tier — but who shakes the cup at you
  // is the whole reason you asked.
  const vs = (w.match(/\b(?:with|vs|against)\s+([a-z]+)/) || [])[1];
  const opp = _gameHostess(vs).name;
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
      "flip their sum, one tile. Never both — though if one of the pair is already down, the other on its own is fine. Whatever's still standing at the end " +
      "is your score, and low wins. You choose.\"", { n: g.opp }));
  } else if (moves.length === 1 && !g.taught.single) {
    g.taught.single = true;
    _say(_fmt("{n} taps the felt. \"This roll, only one way to play it — so play it. " +
      "Make the flip — tap it or type it. The box doesn't move itself… not until you know it does.\"", { n: g.opp }));
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
    g.pending = moves; g.roll = [d1, d2];   // the redraw names the roll it came from (Priya, round 58)
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
  _say(`Your score: ${you}. House rules — you drink for ${you} seconds while the bar counts` +
    (G.player && G.player.teetotal ? " — soda water, and they count anyway." : "."));
  _engineSpeak(thaiNum(you));
  const her = jpAutoRound(_rand);
  _say(`${g.opp} takes the cup. ${her.rolls.join(" · ")}.`, "dim");
  if (her.score === 0) {
    _endGame(false, 0, `Every tile down — JACKPOT, hers. The bar erupts. You drink again, ` +
      `on principle${g.stake ? `, and your ฿${_num(g.stake)} stays with the till` : ""}.`);
  } else if (her.score < you) {
    _endGame(false, 0, `Her score: ${her.score}. Low wins — she wins.` +
      (g.stake ? ` Your ฿${_num(g.stake)} vanishes into the bra of commerce.` : " Sanuk, they said."));
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
// Sunday, and the roast is on until nine. Authored here beside the other calendar
// checks because rule 5 forbids scattering `G.day % …` arithmetic: in a shared
// world the clock becomes the server's and these helpers are the only seams to
// re-plumb. _roastHour TAKES the hour for the same reason _isQuizHour does — the
// rail's drift probes hours that are not now, and reading G.nightTurn inside that
// probe answers about the wrong hour.
function _roastDay() { return G.day % 7 === 0; }
function _roastHour(hour) { return _roastDay() && hour < 3; }   // last orders at 21:00
// "The Friday curry" was on the card every night of the week — a name that
// promises a day and a kitchen that didn't check it (Reg the publican, round
// 32, 2026-08-30). Day-gated like the roast, minus the finite-covers scarcity
// (it's the card's second dish, not the anchor).
function _curryDay() { return G.day % 7 === 5; }
// The night's hour, 0 = 18:00. The only turn→hour conversion in the game, so
// the regulars' drift, Glam's shuttle and anything else that asks "what time is
// it" share one seam. (_clockStr renders a display string and is not a
// comparator.)
function _nightHour() { return Math.floor(G.nightTurn / 10); }

// ── The first night ─────────────────────────────────────────────────────────
// A punter knows what to do in Pattaya. What he does not know is what this GAME
// rewards, and the opening currently hands him a street and the word สบายสบาย.
// Measured: 21 quests exist and a player who does not already know the quest
// system reaches none of them, so night one is "walk into a bar, buy a drink"
// and nothing escalates.
//
// Two nudges, once EVER each, dim, and only inside a bar where they are true.
// Not a tutorial and not a quest — one concrete thing to want, and one pointer
// at the best button in the game.
//
//  1. a number. CONTACT is achievable in twenty minutes, it is exactly what
//     this audience came for, and it opens the whole phone/bond layer.
//  2. the bell. ฿300 and the room detonates — the single best moment the game
//     has, and nothing has ever told a new player it is there.
function _newbieNudge() {
  if (!_inBar() || G.soc.drunk >= 6) return;
  if (typeof _atOwnBar === "function" && _atOwnBar()) return; // the owner isn't a newbie in his own bar
  // …and only where the advice is TRUE. The Queen Vic is a pub with no
  // hostesses at all, so "buy a lady a drink, then CONTACT her" is a promise
  // its own room cannot keep — which is the defect this repo keeps catching.
  const ladies = _npcsHere().filter(id => NPC_ROLES[id] === "hostess");
  if (!ladies.length) return;
  // …and only while it's TRUE: "nobody's number is in your phone" printed at a
  // man carrying his girl's number (Frank, 2026-08-26 — a false claim, the class
  // the repo lints for)
  const _hasLadyNum = Object.keys(G.phone.contacts || {}).some(id => G.phone.contacts[id] && NPC_ROLES[id]);
  if (!_flag("tipNumber") && !_hasLadyNum && G.stage !== "expat" && G.money >= _ladyPrice(G.room)) {   // not at ฿0 (Malcolm, round 59)   // not to a man who owns a bar (Mick, round 57)
    _setFlag("tipNumber");
    _say("(A thought, since you're here: no bar girl's number is in your phone yet. Buy a lady a " +
      "drink or two until she's warm to you, then CONTACT her — that's how the rest of this " +
      "week gets interesting.)", "dim");
    return;                                   // one at a time; the bell keeps
  }
  const bellPrice = _bellPrice(G.room);
  if (!_flag("tipBell") && G.money >= bellPrice * 2) {
    _setFlag("tipBell");
    _say(_fmt("(There's a bell over the rail. \u0e3f{p} rings it and buys the whole bar a round " +
      "\u2014 every lady in the room learns your name in about four seconds. It is the most " +
      "money you can spend here on being liked. RING BELL.)", { p: bellPrice }), "dim");
  }
}

// Fon's opening pour.// Fon's opening pour. WEDNESDAY, and only in the first hour of the evening —
// a calendar check like the quiz, not a die roll, so it is a thing a player can
// learn and come back for rather than a thing that happens at random.
//
// Deliberately ONCE A WEEK and nowhere else. The luck notes are explicit that
// this is folk practice and not liturgy, so staging it nightly at every bar
// would be both wrong and exactly the ambient nagging Mario warned against. One
// girl, one bar, one evening: if you are standing in the Jasmine Garden early
// on a Wednesday you see it, and otherwise you hear about it from her.
function _fonPourDay() { return G.day % 7 === 3; }

function _fonPour() {
  if (G.room !== "jasmine_garden" || !_fonPourDay()) return;
  if (G.nightTurn >= 10) return;                 // the first hour only — this is opening
  if (G.soc.fonPour === G.day) return;           // once, however many times you come back
  if (!_npcsHere().includes("fon")) return;
  G.soc.fonPour = G.day;
  _say("Fon comes out from behind the ferns with a bottle of something clear and cheap and " +
    "does not see you. At the edge where the bar's tiles stop and the soi begins she crouches, " +
    "and pours a thin circle of it onto the concrete \u2014 unhurried, not performing, lips " +
    "moving over something too quiet to catch. Then she stands, wais once at the spirit house, " +
    "and goes back in for the ice. The whole thing takes eleven seconds.", "win");
  _say("(She has not noticed you watching. You could ASK FON ABOUT THE SHRINE.)", "dim");
}

// Hour-taking form, because the rail drift needs to ask about an hour that
// isn't now: _hopRoom is probed at past and future hours by the arrival
// narration and by _questWhere, and reading G.nightTurn inside that probe would
// answer about the wrong hour. Same seam rule as _quizDay/_weekday (CLAUDE.md
// rule 5) — the window arithmetic lives here once.
function _isQuizHour(hour) { return _quizDay() && hour >= 2 && hour < 4; }
function _isQuizWindow() {
  return _quizDay() && G.nightTurn >= 20 && G.nightTurn < 40;
}

// Deterministic three bars for this particular Thursday (no _rand: reading
// the schedule must never advance the dice).
// ── The bar's own poster ────────────────────────────────────────────────────
// Go-gos advertise with a promo poster of one of their own girls, and the game
// already said so before the art existed: Crystal Palace's description has "a
// faded poster of numbered dancers from a different decade" on its back wall.
// So the poster is a CLAIM the world can check — the woman on it works here,
// and you can go and find her at the rail.
//
// Which girl is a pure hash of (room, vacation), not `_rand()`: a poster is a
// printed object, so it must not change when you walk out and back in, and
// reading one must not advance the dice (same rule as _quizBars).
const _POSTER_LINES = [
  n => `The promo poster by the door: ${n}, lit like a film premiere and about ` +
       `two sizes more confident than anyone actually is at 9pm.`,
  n => `A poster in a scratched perspex frame — ${n}, chin up, the bar's name ` +
       `somewhere behind her in letters the printer clearly enjoyed.`,
  n => `${n} on the wall by the stairs, sun-bleached down one side where the ` +
       `door's been propped open every night for years.`,
  n => `The poster: ${n}, photographed on a better night than tonight, which ` +
       `is the entire art form.`,
  n => `A curling poster of ${n}, one corner gone, the tape older than the tape ` +
       `holding the corner before it.`,
];
// She is HERE, and that is the point of the whole thing.
const _POSTER_PRESENT = [
  n => `${n} is on the rail tonight, ten feet away and considerably more real.`,
  n => `${n} is working. The poster flatters her; she does not appear to need it.`,
  n => `${n} catches you reading it and gives you the look of someone who has ` +
       `watched a great many men read it.`,
];

// The poster girls are the filler hostesses — the authored characters have
// their own faces and their own stories, and a bar advertises with staff, not
// with its mamasan.
function _posterGirls(room) {
  return Object.keys(NPCS).filter(id => {
    const n = NPCS[id];
    return n.filler && NPC_ROLES[id] === "hostess" && _npcRoom(id) === room;
  }).sort();
}
function _posterGirl(room) {
  const pool = _posterGirls(room);
  if (!pool.length) return null;
  let h = G.vacation * 7919 + 31 * room.length + 12345;
  for (let i = 0; i < room.length; i++) h = (h * 48271 + room.charCodeAt(i)) % 2147483647;
  return pool[h % pool.length];
}
function _hasPoster() { return _room().barType === "gogo" && !!_posterGirl(G.room); }

function _doPoster() {
  const id = _posterGirl(G.room);
  if (!id) { _say("No poster in here worth the name."); return; }
  const n = NPCS[id].name;
  _say(_pickVary(_POSTER_LINES, "poster")(n));
  // The frontend swaps this prefix for the real poster image (term.js
  // _addAvatars), exactly like a gallery row.
  _say("Poster — " + n, "dim");
  if (_npcsHere().includes(id)) _say(_pickVary(_POSTER_PRESENT, "posterHere")(n), "dim");
  G.known[id] = true;   // you have read her name off a poster; you know it now
}

function _quizBars() {
  // The Soi 6 challenge cannot leave the street, and none of QUIZ_BARS is on
  // it — so TIME and two NPCs promised an event the mode could not deliver
  // (grapevine playtest F2, 2026-08-25). In-mode, quiz night is the pub's:
  // the Queen Vic running a Thursday quiz is the most natural thing it does.
  if (G.mode === "soi6") return ["queen_vic"];
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
  // never at the bar you own: the mamasan handed the owner a pencil mid-shift, and
  // QUIT threw him out of his own door onto Beach Road (Rolf, round 55)
  if (typeof _atOwnBar === "function" && _atOwnBar()) return false;
  return _isQuizWindow() && _quizBars().includes(G.room) && !G.quizPlayed[G.room];
}

function _startQuiz(seated) {
  G.quizPlayed[G.room] = true;
  // Bert's numbered menu came back above quiz question 2 after a reload, and "2" answered the
  // quiz; after the quiz, "2" answered Bert (Priya, round 58). The quiz takes the moment.
  if (G.convoQ && typeof _convoDrop === "function") _convoDrop(true);
  // five questions, drawn without repeats
  // no question twice in one night — three bars run it, and Q1 at Candy Bar came
  // back as Q4 at the Lucky Tiger (gambler playtest 2026-08-22)
  if (!G.quizSeen || G.quizSeen.day !== G.day) G.quizSeen = { day: G.day, qs: [] };
  let pool = [...Array(QUIZ_POOL.length).keys()].filter(i => !G.quizSeen.qs.includes(i));
  if (pool.length < 5) pool = [...Array(QUIZ_POOL.length).keys()];
  const qs = [];
  for (let i = 0; i < 5; i++) qs.push(pool.splice(Math.floor(_rand() * pool.length), 1)[0]);
  G.quizSeen.qs.push(...qs);
  G.game = { type: "quiz", qs, at: 0, right: 0 };
  _say((seated
    ? "“A NEW TEAM, ladies and gentlemen!” "
    : "Too late — the microphone has already found you. “A NEW TEAM, ladies and gentlemen!” ") +
    "Quiz night: five questions, the bar as your audience, prizes on " +
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

const _QUIZ_WRONG_TAIL = [   // one sentence five times in a night (Marek, round 53)
  "The table of teachers from Rayong smirks.",
  "Somebody at the back says the right answer a beat too late, loudly, as if that counted.",
  "The host taps the mic. \"Close. Not close enough for money.\"",
  "A pen goes down on the next table with the satisfaction of a man who knew.",
  "The quizmaster reads it again, slower, for the benefit of nobody.",
];
function _quizInput(input) {
  const g = G.game;
  const item = QUIZ_POOL[g.qs[g.at]];
  let pick = null;
  const m = input.trim().match(/^(?:answer\s*)?([1-3])$/i); // a bare digit — not "tip rung 100" (playtest 2026-08-22)
  const _tw = !m && typeof parseThaiWords === "function" ? parseThaiWords(input.trim()) : null;   // หนึ่ง / สอง / สาม (Jens, round 67)
  if (m) pick = +m[1] - 1;
  else if (_tw >= 1 && _tw <= 3) pick = _tw - 1;
  else {
    const idx = item.opts.findIndex(o => o.toLowerCase().includes(input.trim()));
    if (idx >= 0 && input.trim().length > 1) pick = idx;
  }
  if (pick === null) { _gameBoard(); _say("1, 2, or 3 — the microphone is patient, the bar less so.", "dim"); return false; } // not an answer: no tick
  if (pick === item.a) {
    g.right++;
    _say(`“${item.opts[item.a]}” — CORRECT! The bar cheers like you cured something.`);
  } else {
    _say(`“${item.opts[pick]}”… the host winces on your behalf. It was ` +
      `“${item.opts[item.a]}”. ` + _pickVary(_QUIZ_WRONG_TAIL, "quizwrong"), "alert");
  }
  g.at++;
  if (g.at < 5) { _quizAsk(); return; }
  // scoring
  const right = g.right;
  G.game = null;
  G.quizLast = { room: G.room, day: G.day, right };   // the town can say how it went (Fintan, round 60)
  _say(`Final score: ${right} of 5.`, "room");
  if (right === 5) {
    G.money += 500;
    _setFlag("quizChamp");
    _say("A PERFECT ROUND. The host demands a bow; the bar demands a speech; the " +
      `board demands your name in chalk. First prize: ฿500 off the till. ` +
      `(฿${_num(G.money)} in pocket.)`, "win");
    _addHappy(5);
  } else if (right === 4) {
    G.money += 200;
    _say(`Second place overall — ฿200 and a round of applause you'll remember ` +
      `longer than the money. (฿${_num(G.money)}.)`, "win");
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
const KP_FIELD_DARK = [ // the Darkside league has its own regulars (27-night playtest: the same five at Daeng's and the Stinky)
  ["Daeng's nephew", 0.5], ["a retired Dutch dredger", 0.6], ["Mama Yai's husband", 0.55],
  ["the Water Buffalo's Tuesday man", 0.65], ["a lad off the lake boats", 0.5],
];

function _leagueTonight() { return G.day % 3 === 0; }
// nights until the next league night (0 = tonight) — the fixture walks round
// the week, which is the thing nobody could say out loud (Brenda, round 47)
function _leagueIn() { return (3 - (G.day % 3)) % 3; }
function _isBandNight() { return G.day % 7 === 5 || G.day % 7 === 6; } // Fri or Sat
function _bandHere() {
  const r = _room();
  return !!(r.liveMusic && (r.musicEveryNight || _isBandNight()));
}
function _bandNearby() {
  if (_bandHere()) return true;
  const here = _room();
  return [...Object.values(here.exits), ...(here.venues || [])].some(to => {
    const r = ROOMS[to];
    return r && r.liveMusic && (r.musicEveryNight || _isBandNight());
  });
}

function _startKiller() {
  if (!_room().pool) { _say("Killer needs a real table. " + _tableHint()); return; }
  if (!_leagueTonight()) {
    _say("No league tonight — killer runs every third night. " +
      (G.day % 3 === 2 ? "Tomorrow." : "Check back in a couple of days.") +
      " The table's free for a regular frame (PLAY POOL).", "dim");
    return;
  }
  if (G.lastKp && G.lastKp.day === G.day && G.lastKp.room === G.room) { _say("The league's played for tonight — the chalk's wiped and the field has gone back to its beers. Next league night, same table. (PLAY POOL for a frame.)", "dim"); return; }   // the same field, a second entry, a second pot (Marta, round 63)
  if (G.money < KP_ENTRY) { _say(`Entry's ฿${_num(KP_ENTRY)} in the ashtray. You have ฿${_num(G.money)}. Spectating is free.`); return; }
  G.money -= KP_ENTRY;
  const field = [];
  const used = new Set();
  const roster = _room().region === "Darkside" ? KP_FIELD_DARK : KP_FIELD; // one pool for both the draw and the pick (code review 2026-08-22)
  // A CONSTANT rnd() PICKS ONE INDEX FOREVER. Re-rolling on a collision spins
  // without end the moment the dice do not vary — and the project's own persona
  // skill instructs `_rand = () => 0.99` for stubbing, so the documented testing
  // practice hung the process (found 2026-09-17 as a wedged probe, three hours
  // old). Walk to the next free seat instead of re-rolling: same distribution
  // under real dice, terminates under any dice at all.
  while (field.length < 4 && used.size < roster.length) {
    let i = Math.floor(_rand() * roster.length) % roster.length;
    for (let k = 0; k < roster.length && used.has(i); k++) i = (i + 1) % roster.length;
    used.add(i); field.push(roster[i]);
  }
  const names = ["You", ...field.map(f => f[0])];
  const skills = [0, ...field.map(f => f[1])];
  G.game = { type: "kp", kp: kpNew(names, skills), stake: KP_ENTRY * names.length };
  (G.kpPlayed = G.kpPlayed || {})[G.room] = true;   // you turned up: the title is defended by PLAYING, won or lost
  // the men you are about to play are people for the rest of the night — a
  // player who has just put four frames past Big Kev could not say a word to
  // him afterwards (Kevin, round 50). `won` is filled in at the end of the frame.
  G.lastKp = { room: G.room, day: G.day, names: G.game.kp.players.filter(p => p.name !== "You").map(p => p.name), won: false };
  _say("League night. The ashtray fills with hundred-baht notes, the field chalks " +
    `up, and somebody racks. Five players, three lives each, ฿${_num(G.game.stake)} in ` +
    "the pot. Pot anything or lose a life; last cue standing takes the lot.");
  _say(kpRender(G.game.kp), "dim");
  _say("(Your shot each round: SHOT (safe, 60%) or POWER (flashy, 45% — glory or " +
    "grief). QUIT forfeits your lives.)", "dim");
}

// WHERE THE TABLES ARE, DERIVED. Two hard-coded signposts named two different
// pairs of bars, neither list matching the other and neither including the Lucky
// Tiger — of EIGHT tables in town. Asked in the Blue Dog, the pool line sent a
// man to Walking Street and the Darkside and never mentioned the Stinky Pinky
// across the road, which that room's own description can see (Kevin, round 50).
// Derived from the rooms, nearest first, and it obeys the notebook's law: a
// venue is named only once you have stood in it or heard its name.
function _tableHint() {
  const here = G.room;
  const tables = Object.keys(ROOMS).filter(id => ROOMS[id].pool && id !== here);
  const known = tables.filter(id => (G.visited && G.visited[id]) || (G.heardOf && G.heardOf[id]));
  if (!known.length) return "You would have to ask around for a table — half the beer bars have one, and this is not one of them.";
  const near = known.filter(id => ROOMS[id].region === _room().region);
  const pick = (near.length ? near : known).slice(0, 3);
  const names = pick.map(id => _barName(id) + (near.length ? "" : ", over in " + ROOMS[id].region));
  const list = names.length === 1 ? names[0]
    : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  return (near.length ? "No table in here. Nearest you know of: " : "No table in here. The ones you know: ") + list + ".";
}

const _KP_POT = [
  "{who} pots, unhurried, and chalks up without looking at you.",
  "{who} takes his shot, drops it, and steps back to let you have the table like a man doing you a favour.",
  "{who} pots. The table goes quiet the way tables do when they were expecting you to.",
];
// …and none of those may be said to a man who is OUT: "steps back to let you
// have the table" landed one line under "That was your last life" (Kevin, round
// 50). Once you are eliminated the table stops addressing you, which is exactly
// what being out feels like.
const _KP_POT_OUT = [
  "{who} pots, unhurried, and chalks up. Nobody is playing for your benefit now.",
  "{who} drops it and the frame moves on without reference to you.",
  "{who} pots. From a stool it is a different game, and a quieter one.",
];

// A league frame runs a dozen shots and the pot line was ONE string, so it read
// three turns running like a jukebox stuck on a song (Trev, round 44).
const _KP_MY_POWER = [
  "You lean into it — the ball SLAMS home and the bar goes quiet for one beautiful second.",
  "You hit it like you mean it. The pocket takes it whole and the cue ball keeps travelling out of pure surprise.",
  "Everything goes into the shot. It drops with a bang somebody at the rail feels through their glass.",
  "No finesse, all conviction. In it goes, and the man keeping score raises an eyebrow he has not raised all night.",
];
const _KP_MY_POT = [
  "Clean pot. The felt forgives you another round.",
  "Down it goes, quietly, the way the good ones do. Nobody says anything, which is how you know.",
  "You take your time and it drops on the slow side of the pocket. Still counts.",
  "A tidy one. The cue ball sits exactly where you left it, which is the part that actually takes practice.",
  "In. Somebody at the rail says something in Thai that is almost certainly about your hairline.",
  "It rattles the jaws, thinks about it, and drops. You take that.",
];

function _kpInput(input) {
  const g = G.game;
  const kind = /power|smash/.test(input) ? "power" :
    /shot|pot|cut|hit|play|safe/.test(input) ? "shot" : null;
  if (!kind) { _gameBoard(); _say("SHOT or POWER — the table is waiting.", "dim"); return false; } // not a move: no tick
  const you = kpShot(g.kp, _rand, kind === "power" ? 0.45 : 0.6);
  if (you.potted) {
    _say(kind === "power" ? _pickVary(_KP_MY_POWER, "kppower") : _pickVary(_KP_MY_POT, "kpmypot"));
  } else {
    _say(`Miss. ${you.player.lives > 0 ? `Life gone (${you.player.lives} left).` :
      "That was your last life. You're out."}`, you.out ? "alert" : "");
  }
  // the table plays around to you — BOUNDED, because the exit condition is a miss
  // and a non-varying rnd() never produces one (see the field builder above)
  let _around = 0;
  while (!kpOver(g.kp) && g.kp.turn !== 0 && _around++ < 400) {
    const r = kpShot(g.kp, _rand);
    if (r.out) _say(`${_ucfirst(r.player.name)} misses and is OUT. A moment of silence; the moment ends.`, "dim");
    else if (!r.potted) _say(`${_ucfirst(r.player.name)} rattles it — a life gone.`, "dim");
    else if (kpAlive(g.kp).length <= 2) {
      const _mine = kpAlive(g.kp).some(p => p.name === "You");   // out = the table stops addressing you
      _say(_fmt(_pickVary(_mine ? _KP_POT : _KP_POT_OUT, "kppot" + (_mine ? "" : "out")), { who: _ucfirst(r.player.name) }), "dim");
    }
  }
  if (kpOver(g.kp)) {
    const winner = kpAlive(g.kp)[0];
    // who took the pot, so the man who went out before you does not talk like him (Fintan, round 60)
    if (G.lastKp && G.lastKp.room === G.room) G.lastKp.winner = winner ? winner.name : null;
    if (winner && winner.name === "You") {
      // Bert's quest is King of the Killer TABLE — "every third night, RIGHT
      // HERE" — and the flag fired for a win at any pool bar in town, so his
      // chalk went up behind his own till for a game he never saw (round 47
      // quest sweep). Killer runs everywhere; his league is his.
      if (QUESTS.league && G.room === _qAt(QUESTS.league)) _setFlag("wonLeague");   // his table is wherever the quest says it is
      // THE NAME BEHIND THE TILL. Held, defended, and taken off you — the only
      // persistence killer supports, because killer itself is a one-night
      // knockout with no standings anywhere. See G.kpTitle in engine-core.
      if (G.lastKp && G.lastKp.room === G.room) G.lastKp.won = true;
      const _held = (G.kpTitle = G.kpTitle || {})[G.room];
      let _crown;
      if (_held) {
        _held.defended = (_held.defended || 0) + 1;
        _crown = _held.defended === 1
          ? " Your name was already up behind the till. It stays up, and the man who came closest buys you one, which is the rule."
          : _held.defended < 4
          ? ` That is ${_held.defended} defences. The rail has started saying it out loud when you walk in, which is either a compliment or a target.`
          : ` ${_held.defended} defences. Somewhere in this bar a man is practising specifically for you, and you will not know which one until he does it.`;
      } else {
        G.kpTitle[G.room] = { since: G.day, defended: 0 };
        _crown = " Your name goes up behind the till, in chalk, spelled the way somebody thought it sounded.";
      }
      _endGame(true, g.stake, `Last cue standing. The pot — ฿${_num(g.stake)} — is pushed ` +
        "across the felt with due ceremony, and " +
        ((typeof _tillKeeper === "function" && _tillKeeper(G.room)) ? `${NPCS[_tillKeeper(G.room)].name} rings the bell herself. ` : "the man behind the bar rings the bell himself. ") +
        "League night belongs to you." + _crown);
    } else {
      // …and losing it is how it comes off you. "The bar takes your name for next
      // league night" was a promise nothing kept: no name was taken, and the next
      // league night was identical.
      const _was = (G.kpTitle = G.kpTitle || {})[G.room];
      let _fall = " a stool, and the bar takes your name for next league night. That's killer.";
      if (_was) {
        delete G.kpTitle[G.room];
        _fall = _was.defended
          ? ` a stool. The chalk behind the till is wiped and rewritten in front of you, after ${_was.defended === 1 ? "one defence" : _was.defended + " defences"}. Nobody says anything about it. That is the worst part, and they know it.`
          : " a stool, and your name comes down off the till about ninety seconds after it went up. The rail is magnificent about it, which is worse.";
      }
      const _wn = winner ? winner.name.charAt(0).toUpperCase() + winner.name.slice(1) : "The table";   // "a piwin still in his vest" opened a sentence (Helga, round 57)
      _endGame(false, 0, `${_wn} takes the pot. You take` + _fall);
    }
    return;
  }
  _say(kpRender(g.kp), "dim");
  _say("(Your shot.)", "dim");
}

// ─ Pool ─

function _startPool(w) {
  if (!_room().pool) { _say(_tableHint()); return; }
  // PLAY POOL 500 silently racked for ฿50 and said nothing — Jackpot announces
  // its house max in exactly this situation and pool did not (Gerry, round 34).
  // The stake is the TABLE's, not yours: a bar table plays for what a bar table
  // plays for, and a man offering ten times that is offering a hustle nobody
  // here wants. Say so, rather than quietly pocketing the difference.
  const askedM = String(w || "").match(/\d+/);
  if (askedM && parseInt(askedM[0], 10) !== POOL_STAKE)
    _say(`(The table plays for ฿${_num(POOL_STAKE)}, same as it always has. Nobody here is ` +
      "interested in a bigger number — that's a different kind of evening.)", "dim");
  // PLAY POOL WITH <her> — Connect 4 has taken a named opponent since the
  // gambler playtest and pool never did, so Lek's own hello ("You play pool?")
  // advertised a frame you could not rack against her: the one game she is
  // canonically unbeatable at, and every attempt silently played the old boy
  // off the rail instead (Frank, round 34).
  const vs = (String(w || "").match(/\b(?:with|vs|against)\s+([a-z]+)/) || [])[1];
  const her = vs ? _gameHostess(vs) : null;
  const daeng = G.room === "khao_talo_bar" && !(her && her.id);
  const opp = (her && her.id) ? NPCS[her.id].name
    : daeng ? "Daeng" : _L("a leathery expat off the rail who hasn't missed since 1997");
  const stake = _takeStake(POOL_STAKE);
  G.game = { type: "pool", you: 7, opp: 7,
    oppName: (her && her.id) ? NPCS[her.id].name : daeng ? "Daeng" : "the old boy",
    // she plays her tier: the canon pool girls are sharks and say so
    oppSkill: (her && her.id) ? (CANON_HOSTESSES.includes(her.id) ? 0.7 : 0.55)
      : daeng ? 0.65 : 0.6,
    oppId: (her && her.id) || null, oppNext: null, oppWon: false, stake };
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
    if (!g.stake && G.poolHold) delete G.poolHold[G.room];   // the table goes with the frame
    _endGame(false, 0, `${g.oppName} clears up like it's a chore and rolls the black in ` +
      `dead-weight. Game over${g.stake ? ` — your ฿${_num(g.stake)} slides off the cushion` : ""}.`);
    return;
  }
  _say(potted === 0 ? `${String(g.oppName).charAt(0).toUpperCase() + String(g.oppName).slice(1)} rattles the jaws and swears softly. Your table.` :
    `${_ucfirst(g.oppName)} pots ${potted}, then runs out of angle. Your table.`);
  _poolStatus(g);
}

function _poolInput(input) {
  const g = G.game;
  // losing the frame loses the table with it — "winner stays on" cuts both ways
  const _dropHold = () => { if (!g.stake && G.poolHold) delete G.poolHold[G.room]; };
  const kind = /power|smash|break/.test(input) ? "power" :
    /safe|snook|tuck/.test(input) ? "safety" :
    /shot|pot|cut|hit|play|roll/.test(input) ? "shot" : null;
  if (!kind) { _gameBoard(); _say("(SHOT sensible · POWER greedy · SAFETY sneaky.)", "dim"); return; }
  const ev = poolShot(g, kind, _rand);
  switch (ev) {
    case "pot8win": {
      // "WINNER STAYS ON" WAS AN EMPTY PHRASE. Won for the table four times in a
      // week and nothing followed it: no challenger, no hold, not a word (Kevin,
      // round 50). A frame played for nothing is played for the table, so the
      // table is what you win — and the next man is already chalking.
      let _stay = "";
      if (!g.stake) {
        const _h = (G.poolHold = G.poolHold || {});
        _h[G.room] = (_h[G.room] === undefined ? 0 : _h[G.room]) + 1;
        const _n = _h[G.room];
        _stay = " You stay on. " + (_n === 1
          ? "Somebody is already chalking a cue without being asked, which is the whole of the arrangement. (PLAY POOL)"
          : _n < 4
          ? `That is ${_n} on the bounce. The next one racks without discussing it. (PLAY POOL)`
          : `${_n} frames without losing the table. Men are arriving to watch now, which is a different kind of pressure. (PLAY POOL)`);
      }
      _endGame(true, g.stake * 2, "The black glides in off the cushion like it was " +
        "always going there. You straighten up slowly, because legends move slowly." +
        (g.stake ? ` ฿${_num(g.stake * 2)} from under the cushion.` : "") + _stay);
      return;
    }
    case "sink8lose":
      _dropHold();
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
// A visit is THREE darts, so the real checkout range runs to 170 — 80 is D20-D20
// or T20-D10 and every arrows player in the building knows it. The old cap of 50
// modelled a ONE-dart finish and refused a standard two-dart out (persona report
// B#16, 2026-08-23). Above 50 you have to score before you double, so the odds
// fall away with the number; the classic bogeys stay genuinely impossible.
const _DARTS_BOGEY = [169, 168, 166, 165, 163, 162, 159];
function _dartsFinish(remaining, aim, rnd) {
  if (remaining > 170 || remaining < 2 || _DARTS_BOGEY.includes(remaining)) return false;
  const base = remaining <= 20 ? 0.6 : remaining <= 40 ? 0.42 : remaining <= 50 ? 0.3 :
    remaining <= 80 ? 0.2 : remaining <= 110 ? 0.12 : 0.05;
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
  if (!_room().darts) {
    const boards = Object.keys(ROOMS)
      .filter(id => ROOMS[id].darts && G.visited && G.visited[id])
      .map(id => _barName(id)).filter(Boolean);
    _say("No dartboard here. " + (boards.length
      ? boards.join(", ") + " — they keep one on the wall."
      : "The sports bars and the British pubs keep one on the wall; you haven't been in one yet."));
    return;
  }
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
      `Game. ${g.stake ? `Your ฿${_num(g.stake)} leaves the shelf.` : `"Bad luck, boss."`}`);
    return;
  }
  const { score } = _dartsVisit(g.opp <= 80 ? "steady" : "big", g.oppSkill, _rand);
  const next = g.opp - score;
  const _oppCap = g.oppName.replace(/^(\w)/, c => c.toUpperCase());
  if (next < 2) _say(`${_oppCap} overcooks the visit and has to nurse it. Still ${g.opp}.`);
  else { g.opp = next; _say(`${_oppCap} rattles in ${score}. (${g.opp} left.)`); }
  _dartsStatus(g);
}

function _dartsInput(input) {
  const g = G.game;
  const mode = /\b(big|treble|ton|max|go)\b/.test(input) ? "big" :
    /\b(steady|safe|single|twenty|20)\b/.test(input) ? "steady" :
    /\b(finish|check|checkout|double|out|close)\b/.test(input) ? "finish" : null;
  if (!mode) {
    _say("Not while you're at the oche — the arrows have your attention.", "dim");
    _dartsStatus(g);
    _say("(GO BIG · STEADY · FINISH · QUIT.)", "dim");
    return;
  }
  const aim = _dartsAim();

  if (mode === "finish") {
    if (g.you > 170 || _DARTS_BOGEY.includes(g.you)) {
      _say(`No checkout on ${g.you} — score first: GO BIG or STEADY.`, "dim"); return; }
    if (_dartsFinish(g.you, aim, _rand)) {
      _endGame(true, g.stake * 2, "You call the double, take your time in a suddenly quiet bar, and post it " +
        `dead centre. ${g.stake ? `฿${_num(g.stake * 2)} off the shelf, and a nod from the old boy.` : "The bar erupts. Priceless."}`);
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
    if (g.you <= 170 && !_DARTS_BOGEY.includes(g.you)) {
      _say(g.you <= 50 ? "(Finishing range — FINISH to go for the double.)"
        : "(Checkout is on from here — FINISH, if you fancy it.)", "dim");
    }
  }
  _dartsOppTurn(g);
}

// ─ Shared plumbing ─

// won: true / false / null (push). payout is added to money (escrow already taken).
function _endGame(won, payout, text) {
  G.money += payout; G.offIn = (G.offIn || 0) + payout;   // …and the pot coming back is not a refund on the chits
  if (G.game) G.lastGame = { type: G.game.type, stake: G.game.stake || 0, room: G.room }; // REMATCH / DOUBLE
  G.game = null;
  _say(text, won === false ? "alert" : "win");
  if (won === true && payout) _say(`(฿${_num(G.money)} in pocket.)`, "dim");
  // a push hands the stake back too, and said nothing (the soak's silent-money check, round 57)
  else if (won === null && payout) _say(`(Your ฿${_num(payout)} back — ฿${_num(G.money)} in pocket.)`, "dim");
  if (won === true) _addHappy(3);
  else if (won === false) _addHappy(-1);
}

// A game can't follow you out of the bar: Tan's sedan moved a live Connect 4 to
// Soi Buakhao and it kept running (gambler playtest 2026-08-22). The stake stays.
function _abandonGame(why) {
  if (!G.game) return;
  const g = G.game;
  G.game = null;
  _say(`(${why} — the ${g.type === "c4" ? "Connect 4" : g.type === "jp" ? "Jackpot" : g.type === "quiz" ? "quiz" : "game"} dies with the stool you left` +
    (g.stake ? `; the ฿${_num(g.stake)} stays with the house` : "") + ".)", "dim");
}
const _C4_LOSS = [
  (o, c) => `${o} drops column ${c} without breaking eye contact. Four in a row. She was three moves ahead the whole time, and you both know it.`,
  (o, c) => `Column ${c}, and ${o} doesn't even look at the board — she's looking at you. Four. "Again?" she says, which is not a question about the game.`,
  (o, c) => `${o} taps column ${c} home and the rail makes the small noise a rail makes. Four in a row; you never saw the second threat, and she never let on there was one.`,
  (o, c) => `A counter drops into column ${c} like a coin into a till. ${o} says nothing. Four in a row says it for her.`,
];
function _gameQuit() {
  if (G.game) G.lastGame = { type: G.game.type, stake: G.game.stake || 0, room: G.room }; // REMATCH / DOUBLE after a concede too
  const g = G.game;
  if (g.type === "cli") { _cliInput("exit"); return; }   // the terminal: walk away, keep what you copied
  G.game = null;
  if (g.type === "quiz") {
    _say("You mumble something about the toilet and keep walking, past the toilet, " +
      "out the door. Behind you the host announces your departure to the whole " +
      "bar. Some tuition is social.", "alert");
    G.room = _room().exits.out || Object.values(_room().exits)[0];
    _describeRoom(true);
    return;
  }
  _say(g.stake ? `You concede. The stake stays where stakes stay. (฿${_num(G.money)} left.)` :
    "You concede with what dignity remains.");
}

function _gameInput(input) {
  // TRYING TO START A GAME YOU ARE ALREADY PLAYING is not a move. `play pool` at
  // a live pool table was executed as a SHOT, because "play" sits in the shot
  // verb regex — a free stroke for a typo (Kevin, round 50). _doPlay already
  // refuses this; the live-game router never reached it.
  const _gi = String(input || "").trim().toLowerCase();
  if (/^(play|start|join)\b/.test(_gi) || /^(pool|killer|connect ?4|connect four|jackpot|dice|darts)$/.test(_gi)) {
    const _same = { pool: "pool", kp: "killer", c4: "connect 4", jp: "jackpot", darts: "darts", quiz: "the quiz", cli: "that" }[G.game.type];
    _say(`You are already on ${_same}. One game at a time, champ. (QUIT to walk away.)`, "dim");
    _gameBoard();
    return;
  }
  // A QUESTION IS NOT A MOVE: "what if I flip 7?" flipped the 7 (Marta, round 63). Thinking
  // out loud is free; the move is the plain command. Not the quiz or the terminal, where a
  // question can be the answer.
  if (G.game.type === "cli" && (/^(what|wha|huh|eh|pardon|sorry|say again|hm+)\??$/.test(_gi) || /^(what if|what happens|should i|can i|could i|is it|which)\b/.test(_gi))) {
    _say("(The terminal doesn't do questions. HELP lists its commands; EXIT walks away.)", "dim");   // a shrug typed at the prompt is not a minute of the trace (modal-audit, 2026-10-07)
    return false;
  }
  if (!/^(quiz|cli)$/.test(G.game.type) && (/\?\s*$/.test(_gi) || /^(what if|what happens|should i|can i|could i|is it|which)\b/.test(_gi))) {
    const opts = typeof _gameVerbs === "function" ? _gameVerbs().slice(0, 6).map(v => v.toUpperCase()) : [];
    _say("Thinking out loud is free — the table waits for the move itself." + (opts.length ? ` (${opts.join(" · ")})` : ""), "dim");
    _gameBoard();
    return false;   // free means free: it cost a turn (Darren, round 66)
  }
  switch (G.game.type) {
    case "cli": return _cliInput(input);
    case "c4": return _c4Input(input);
    case "jp": return _jpInput(input);
    case "pool": return _poolInput(input);
    case "kp": return _kpInput(input);
    case "quiz": return _quizInput(input);
    case "darts": return _dartsInput(input);
  }
}

// Draw just the live game's board/state — no hint. Non-mutating (quiz re-asks
// its question, jp just shows the tiles). Shared by the resume redraw
// (_renderGame) and each handler's "that wasn't a move" reprompt.
function _gameBoard() {
  const g = G.game;
  if (!g) return;
  switch (g.type) {
    case "cli":  _cliBoard(); break;
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
  _say(g.type === "cli" ? "(The terminal, where you left it:)" : "(A bar game is still in progress — here's where it stands:)", "dim");
  _gameBoard();
  // WHAT'S RIDING ON IT. The stake is escrowed when the game starts and named in
  // the opening line; a resume redrew a perfect board and never mentioned the
  // money, so a player coming back to his phone knew what he was allowed to do
  // but not what it would cost him to quit (round 17). Playing "for sanuk" (the
  // broke player's stake-free game) is worth saying out loud too — that it costs
  // nothing is exactly the thing he can't tell from the board.
  if (g.stake > 0) {
    _say(g.type === "kp"
      ? _fmt("(฿{e} of yours is in the pot of ฿{s}. QUIT concedes it.)", { e: KP_ENTRY, s: g.stake })   // ฿500 "of yours" was the pot (Arturo, round 47)
      : _fmt("(฿{s} of yours is on the table. QUIT concedes it.)", { s: g.stake }), "dim");
  } else if (g.opp) {
    _say("(Nothing is riding on this one — you're playing for สนุก.)", "dim");
  }
  switch (g.type) {
    case "cli":  _say("(HELP lists what the machine does. Every command is a tap. EXIT leaves it as you found it.)", "dim"); break;
    case "c4":   _say("(You're ●. Tap a column 1-7 to drop · Q quits.)", "dim"); break;
    case "jp":
      if (g.pending && g.roll) _say(`You rolled ${g.roll[0]}+${g.roll[1]}.   [ ${jpRender(g.tiles)} ]`);
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
// WHO WILL POUR YOU ONE. Wider than _inBar on purpose: the Peacock's own
// compere says "buy a drink, tip a girl, laugh loud" and the room then
// refused BUY BEER and BUY WATER while its menu line offered both (Marco,
// round 44) — because a cabaret deliberately carries no barType. _inBar
// still gates the bar-girl machinery; this gates the bar.
function _servesDrinks(room) { const r = (room && ROOMS[room]) || _room(); return !!(r.barType || r.drinks); }
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
  // Standing a round for the house is the archetypal good deed on this soi, and
  // STANDING's own coaching line tells the player to "stand a round" — while a
  // week of bells moved the readout not at all (Gerry r34, Stan r35). The
  // +1/day throttle still applies; this just lets the bell be a source.
  if (typeof _repGain === "function") _repGain("a round for the house");
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
  if (G.maiDeeBar && G.maiDeeBar[G.room]) f -= 1;   // the floor's group chat had it by the next shift
  return f;
}

// The first point of heat used to land in silence — and heat > 0 shuts the whole
// bar's barfine book (see _bfRefusal), so a player could earn a bar-wide refusal
// citing "tonight's behaviour" without ever being told anything had happened.
// TWO independent playtests hit exactly this on the same day (2026-08-23, the
// churner at Lucky Tiger and the publican at Candy Bar), which by the house rule
// makes it structural rather than a phrasing quirk. The caller narrates the ACT;
// this narrates the room deciding to remember it.
const _HEAT_FIRST = [
  "The mamasan doesn't say anything. She just looks over, once, and goes back to her ledger — and the room's temperature has changed by about a degree.",
  "Somewhere behind you a stool creaks as somebody turns to watch. Nothing is said. Something is noted.",
  "The cashier's eyes come up off the till, rest on you for exactly as long as it takes, and go back down. You are, from this moment, being kept an eye on.",
  "A look passes between two of the girls — quick, unhurried, entirely legible. The room has filed that one.",
];
// A flat pool named a mamasan/cashier/"two of the girls" whether or not the
// room actually staffs one — the Naklua corner bars run one hostess each and
// no mamasan or cashier, so the room could narrate staff nobody could then
// TALK TO (Reg the publican, round 32, 2026-08-30). Filter to roles actually
// present; the stool-creak line names nobody and is always safe.
function _heatFirstPool() {
  const here = _npcsHere();
  const pool = [_HEAT_FIRST[1]];
  if (here.some(n => NPC_ROLES[n] === "mamasan")) pool.push(_HEAT_FIRST[0]);
  if (here.some(n => NPC_ROLES[n] === "cashier")) pool.push(_HEAT_FIRST[2]);
  if (here.filter(n => NPC_ROLES[n] === "hostess").length >= 2) pool.push(_HEAT_FIRST[3]);
  return pool;
}
function _addHeat(n, why) {
  if (_bellLevel() >= 3) return;         // three bells deep — the room forgives everything
  if (typeof _atOwnBar === "function" && _atOwnBar()) return;   // your own cashier does not "keep an eye on you" (Graham, round 47)
  const r = G.room;
  const before = G.soc.heat[r] || 0;
  G.soc.heat[r] = before + n;
  // heat remembers its cause, so the shut barfine book can point at the act
  // instead of citing "behaviour" nobody named (closer playtest F5, 2026-08-26)
  if (why) (G.soc.heatWhy = G.soc.heatWhy || {})[r] = why;
  if (G.soc.heat[r] >= 3) { _kickOut(); return; }
  if (before === 0 && G.soc.heat[r] === 1) {
    _say(_pickVary(_heatFirstPool(), "heat1"), "dim");
  }
  if (G.soc.heat[r] === 2) {
    const hasMama = _npcsHere().some(nid => NPC_ROLES[nid] === "mamasan");
    _say(hasMama
      ? "(The mamasan is watching you now with the expression of a woman " +
        "pricing a problem. One more and you're somebody else's story.)"
      : "(Somebody behind that bar is watching you now, the way you watch a " +
        "problem you're pricing. One more and you're somebody else's story.)",
      "alert");
  }
}

// APOLOGIZE / SAY SORRY: the wai-and-mean-it. Mollifies a miffed patron
// outright (like standing him a beer does), and burns off one point of heat —
// but only once per bar per night; after that the bar wants behavior, not words.
const _MAI_DEE_TALK = [
  n => `${n} answers the way a ticket window answers — a sentence, correct, with the shutter half down behind it. "Mm. Ask mama." Then she is serving somebody else.`,
  n => `"That one?" ${n} considers whether it is worth a sentence, and gives you a short one, in the bar voice, and the bar voice is all you are getting from now on.`,
  n => `${n} is polite about it. She is polite about everything now; it is the most expensive thing anyone has ever done to you, and it costs her nothing.`,
];
const _MAI_DEE_SOCIAL = [
  n => `${n} lets the line land, and looks at you the way a receptionist looks at a man who has made a joke at the desk: pleasantly, briefly, and without any of it going in.`,
  n => `${n} smiles, exactly as much as the job requires, and moves your empty an inch to the left. That is the whole of her reply, and it is complete.`,
  n => `"Mm." ${n} does not stop wiping the rail. Nothing warms, nothing cools; there is simply nobody at the other end of it any more.`,
];
const _MAI_DEE_SORRY = [
  "{n} accepts the wai the way she would accept a bill — correctly, with a small nod, and nothing changes in her face at all. “Mai pen rai.” It is the most final thing anybody has said to you in this town.",
  "You say it properly and she lets you finish. “Ok.” She even smiles. Then she goes to serve somebody, and you understand that the apology was received, and filed, and that the file is closed.",
];
function _doApologize() {
  const r = G.room, s = G.soc;
  if (_npcsHere().includes("nira") && (G.loanSkipped || (G.loan && G.loan.strikes))) {   // not "the mamasan banks the credit" to the moneylender (Gordie, round 72)
    _say(`Nira lets you finish. "Sorry is free," she says. "That is why I don't sell it." The calculator stays where it is. (REPAY at her stool.)`);
    return;
  }
  // the woman who found out is in the room: the apology is hers to take or not (Rolf, round 66 — "Nothing to apologize for. Tonight.")
  if (typeof _affairLive === "function" && _affairLive() && G.affair.soured && _npcsHere().includes(G.affair.id)) {
    const a = G.affair, n = NPCS[a.id].name;
    if (a.sorryDay === G.day) { _say(`${n} heard you the first time. "Okay," she said. It is still okay, in the sense that nothing has changed.`); return; }
    a.sorryDay = G.day; a.strain = Math.max(0, a.strain - 1);
    _say(_pickVary([
      `${n} lets you finish. "Okay," she says, and goes back to the glasses. "Sorry is a word. I have a lot of words from men." A beat. "Tomorrow, be here. That is not a word."`,
      `"Sorry." ${n} tries the word out. "In Thai we don't say it so much. We just don't do the thing again." She looks at you. "So. Don't do the thing again."`,
    ], "affairsorry")); return;
  }
  if (_inBar()) {
    const judged = _npcsHere().find(_maiDee);
    if (judged) { _say(_fmt(_pickVary(_MAI_DEE_SORRY, "maideesorry"), { n: NPCS[judged].name })); return; }
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
  if (typeof _ccibLoud === "function") _ccibLoud("incident");
  G.soc.banned[here] = G.turns;
  G.soc.heat[here] = 0;
  (G.soc.heatWhy = G.soc.heatWhy || {})[here] = "walked out of here by security, in front of the whole bar";   // the shut book on re-entry names THIS, not a stale drinks
  G.kickedTonight = { n: ((G.kickedTonight || {}).n || 0) + 1, where: _barName(here) || r.name };   // the morning ledger names it (Lothar, round 67: "−3 สนุก" with no reason)-buying man (Marcus, round 61)
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
  _maiDeeScene(_npcsHere());   // who WATCHED — read before the room changes
  G.room = r.exits.out || Object.values(r.exits)[0];
  _describeRoom(true);
}

// FACE-LOSS IS PERMANENT (essay ledger theme 6, 2026-10-01). A public scene in front of
// a woman who had decided you were somebody — walked out by security while she watched —
// is not a bad night; it is a reclassification. From here she is polite and exact and
// nothing you buy moves her (the tier caps at a face in _bondTier/_knownTier), her
// barfine is a no with nothing to negotiate, the money you send is taken as a goodbye,
// and the women she works with heard about it the way floors do. There is no apology
// that reaches it and no price, which is the whole point: the game has had souring you
// could buy back, and the corpus is unanimous that this one you cannot. Keyed on the
// bonded women PRESENT, never the room — a stranger's bar has no verdict to give.
const _MAI_DEE_SCENE = [
  "{n} watched the whole of it from behind the rail. She did not look away and she did not come over, and the look on her face is not anger. Anger you could work with.",
  "Somewhere in the middle of being walked out you catch {n}'s eye, and it is already a different eye — level, polite, finished. Something that took weeks has just closed in a second, in front of everybody.",
  "{n} does not say anything. She picks up a glass that does not need picking up and turns, deliberately, to the woman beside her, and that small turn is the sentence.",
];
function _maiDeeScene(here) {
  if (!_flag("act1Done")) return;
  for (const id of here) {
    if (!NPC_ROLES[id] || _bondTier(id) < 2 || _maiDee(id)) continue;
    (G.maiDee = G.maiDee || {})[id] = G.day;
    (G.maiDeeBar = G.maiDeeBar || {})[G.room] = G.day;
    _say(_fmt(_pickVary(_MAI_DEE_SCENE, "maideescene"), { n: NPCS[id].name }), "alert");
  }
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
      n => _fmt("{n} pretends to fan herself with a coaster, deadpan — “Hoo. Too much, tilac” — but she's still standing here, and the coaster's still going.", { n }),
      n => _fmt("{n} relays your line down the rail in rapid Thai; a delighted jury of two returns a verdict in your favour. She translates none of it and looks pleased.", { n }),
      n => _fmt("{n} narrows her eyes like she's checking your line for hidden fees, finds none, and awards you a real smile — the unprofessional kind.", { n }),
      n => _fmt("“You practise this?” {n} asks, genuinely curious, which is somehow better than a yes.", { n }),
    ],
    [
      n => _fmt("{n} slides onto the stool beside you, steals a sip of your drink, and starts flirting back with alarming professionalism. The other girls exchange looks.", { n }),
      n => _fmt("{n} decides you'll do for the night and turns the full wattage on — knee against yours, laughing before you finish the joke. The other girls give you up for lost.", { n }),
      n => _fmt("{n} takes your hand and studies the palm with mock gravity. “Long life. Big trouble. I am the trouble.” She keeps the hand.", { n }),
      n => _fmt("Something shifts — {n} stops working the room and starts spending the evening, which is a different thing entirely, and everyone at the rail can tell.", { n }),
      n => _fmt("{n} calls something down the bar without looking away from you; a drink appears that you didn't buy. “From me,” she says, enjoying your face. “Can happen.”", { n }),
      n => _fmt("{n} leans in close enough that the next thing is said AT your ear rather than to it, in Thai, untranslated — and she declines, grinning, to repeat it.", { n }),
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
      n => _fmt("{n} allows it — and takes her time about it. Somebody rings the till just to make a noise.", { n }),
      n => _fmt("{n} meets you halfway and holds it a beat past friendly. When she pulls back she's smiling at something she's decided not to tell you.", { n }),
    ],
    [
      n => _fmt("{n} kisses YOU, decisively, to a smattering of applause from across the room. You are now, officially, sitting with her.", { n }),
      n => _fmt("{n} takes your face in both hands and kisses you like she means the version of it she's selling. Somebody across the room raises a glass. You're hers for the night.", { n }),
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
// Going round again on a girl who already warmed to you tonight. Cooling
// first — she is not offended, she is BUSY, and the warmth costs her the stool
// she could be filling. Then genuine irritation. Register per the house rule:
// she is a working woman running out of patience, never shrill, never a
// victim, and never a meter with a face on it. (Round 33 — the brake that
// belongs to her rather than to the economy.)
const _FLIRT_AGAIN = [
  n => _fmt("{n} gives you the same smile a size smaller. She has already said yes to your company tonight; you are asking her to say it twice, and there are stools either side of you she is not working.", { n }),
  n => _fmt("“You say that one already, tilac.” {n} says it lightly — but she says it, and her eyes go briefly to the door, and to the room between you and it.", { n }),
  n => _fmt("{n} laughs half a beat later than last time. The warmth is real and it is not new, and you can watch her price how much of the night to spend on a man repeating himself.", { n }),
  n => _fmt("A pat on the arm from {n}: the kind that means yes, yes, and also means now something else. She has been charming since six o'clock and you are not the only stool.", { n }),
];
const _FLIRT_ANNOY = [
  n => _fmt("{n}'s smile stays exactly where it is and everything behind it leaves. “Okay,” she says. “Okay.” It is not agreement. It is the sound of a woman waiting for a man to finish.", { n }),
  n => _fmt("“Enough now, na.” {n} says it without heat, which is worse, and turns a shoulder those few degrees that end a conversation without ending a customer.", { n }),
  n => _fmt("{n} looks at you the way you would look at a phone that will not stop buzzing. “You tell me already. Three time.” She lets it sit. The girl beside her is very carefully not watching.", { n }),
  n => _fmt("The professional warmth goes out of {n} like a light on a timer. “I work, tilac.” She picks up a cloth that did not need picking up, and is somewhere else for a while.", { n }),
];
const _FLIRT_HOSTILE = [
  n => _fmt("{n}'s face shuts like a door. \"No. Do that again and we have a problem.\" The temperature in your corner of the bar drops several degrees.", { n }),
  n => _fmt("\"You WHAT?\" {n} sets the glass down very deliberately. That is not a look you flirt through. Leave it.", { n }),
];
function _flirtUnwelcome(id, name) {
  if (id === "cream" && typeof _chamFlirt === "function") { _chamFlirt(); return; } // the civilian at the table
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
  n => _fmt("A beat, an eyebrow, and {n} reads you all the way down — the curiosity, the beer, the vacation — and grades it kindly. \"You don't want what you think you might want, tilac. Is okay. Half this room came in not sure and they are having the best night of the year.\" She points your drink at the stage like a compass needle. \"Watch. Cheer. Tip. That is your part, and you will be wonderful at it.\"", { n }),
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
// BARFINE at the bar you OWN: a fine paid to the bar is a fine paid to yourself.
// The girls are staff, not stock; if there's a courtship it goes through the
// relationship layer, not the till.
const _OWN_BARFINE_NO = [
  "Barfine one of your own girls? The fine goes to the bar. You own the bar. You would be handing money from one pocket to the other and the mamasan would watch you do it with an expression you'd never live down. If you like one of them, you're the boss — you talk to her, same as anyone, and see where it goes. There is no docket for that.",
  "There's no barfine to pay here — it's your bar, they're your staff, and the fee is a fee to yourself. That's not how it works from this side of the rail. A girl who works for you isn't shopped for; if there's something there, it's the long way round, the same as it would be for any regular. Off the clock, not off a docket.",
  "You catch yourself and stop. These are your employees, and \"barfining\" one is just moving your own money in a circle while the whole floor pretends not to notice. Whatever this is, it isn't a transaction — not at your own bar. Talk to her like a person; the rest is between the two of you.",
];

const _OWN_STAFF_FLIRT = [
  "{n} laughs, the real one. \"Boss. Save it for the customers — they pay for it.\"",
  "\"Flirt with me? I work for you.\" {n} pats your cheek like an auntie. \"Flirt with the farang at the end. He has money and no wife.\"",
  "{n} looks at the rail, where two customers are watching. \"Not in front of the stools, boss. Very bad for business.\" She is smiling.",
];
function _doSocial(kind, targetWord) {
  // not a pickup room — the girls are the power players', and you're here on business
  if (G.room === "orchid_room") { _say(_pickVary(_ORCHID_NOTOUCH, "orchidno"), "alert"); return; }
  const w = (targetWord || "").replace(/^with /, "").trim();
  // A social verb aimed at an animal gets shut down flat, not a location miss —
  // "they're not here" read like it would work if he WERE (playtest, 2026-08-15).
  // One guard covers flirt/kiss/spank/fondle; PET stays the wholesome verb.
  const animal = (typeof _isDogWord === "function" && _isDogWord(w)) ||
    /\b(cats?|kittens?|big one|little one)\b/i.test(w);
  if (animal) {
    _say(kind === "flirt"
      ? "He's a dog. He likes you fine already — that's what the tail is for. (PET him, if you must.)"
      : "No. Firmly, completely, no — and the look you get from the nearest " +
        "bystander suggests you should hear how that sounded. Animals get PET, " +
        "fed, and left in peace. That is the whole menu.", "alert");
    return;
  }
  // One cast table, so the regulars stand in _npcsHere now — but a social verb
  // must never LAND on one. Resolve against the non-patron pool (bare FLIRT in a
  // room whose only company is a punter stays aimed at the ambience, not at
  // him), and catch a NAMED regular first for the authored brush-off — which
  // used to live in the failure branch, back when table membership did this
  // guard's job.
  const here = _npcsHere().filter(x => !NPCS[x].patron);
  const pat = w && !_PRONOUN.test(w.toLowerCase()) ? _findNpc(w) : null;
  // your own staff: the boss gets no customer register — "Buy me drink, funny man" from the woman on his payroll
  // (composition audit, 2026-10-08)
  if (pat && NPCS[pat].patron) {
    _say(`${_npcLabel(pat)} is a regular ${_isGogo() ? "here" : "at the rail"}, not one of the girls — ` +
      "the look you get back ends the idea before it finishes forming.");
    return;
  }
  // Pronoun/default resolution: "flirt with her" → whoever you're dealing with;
  // bare "flirt" → the conversation partner, or the sole girl in scope.
  const id = _resolveActor(w, here);
  // your own staff: the boss gets no customer register on a FLIRT — "Buy me drink, funny man" from the woman on
  // his payroll (composition audit, 2026-10-08). FLIRT only: a kiss still runs the tiers, and the heat they carry.
  if (kind === "flirt" && id && typeof _ownBarStaff === "function" && _ownBarStaff(id) && !(typeof _affairLive === "function" && _affairLive() && id === G.affair.id)) {
    _say(_fmt(_pickVary(_OWN_STAFF_FLIRT, "ownflirt"), { n: NPCS[id].name }));
    return;
  }
  if (!id) {
    if (!w) { _say(`You ${kind} the ambience. The neon flickers back, noncommittally.`); return; }
    // a pronoun the scope couldn't pin down → ask, rather than a flat refusal
    if (_PRONOUN.test(w.toLowerCase()) && here.length > 1)
      _say(`Who do you mean? (${here.map(x => NPCS[x].name).join(", ")})`);
    else _say("They're not here.");
    return;
  }
  _noteActor(id); // this person is now the antecedent for the next "her/him"
  const name = NPCS[id].name;
  const role = NPC_ROLES[id];
  _trace(kind, name); // breadcrumb (flirt/kiss/spank/fondle)
  // your girl is not "sitting with you, officially, to a smattering of applause"
  // (Rolf, round 55): the affair has its own register, and the room already knows
  if (typeof _affairLive === "function" && _affairLive() && id === G.affair.id && (kind === "flirt" || kind === "kiss") && G.affair.soured) {
    _say(_pickVary([`${name} turns her cheek, not her mouth. "Not tonight, boss."`, `${name} steps back half a pace, which is all the answer there is.`], "affairkisssour")); return;
  }
  if (typeof _affairLive === "function" && _affairLive() && id === G.affair.id && (kind === "flirt" || kind === "kiss") && _outWithMe(id)) {
    _say(_pickVary([   // out together: no till, no ice machine, no customers (Callum, round 71)
      `${name} kisses you in the middle of the pavement as if nobody in this town has ever seen it done, which is not true and does not matter.`,
      `${name} laughs into it. "Nobody count tonight," she says. "Not even Cake."`,
      `${name} pulls you in by the shirt front. "Out here I am not staff," she says, and proves it.`,
    ], "affairkissout")); return;
  }
  if (typeof _affairLive === "function" && _affairLive() && id === G.affair.id && (kind === "flirt" || kind === "kiss")) {
    _say(_pickVary([
      `${name} lets you, briefly, and then puts a finger on your chest and pushes you back a step. "Customers." But she is smiling.`,
      `${name} kisses you quickly, where the ice machine hides you from the room, and is back at the till before you've straightened up.`,
      `"Later," ${name} says, which from her is a promise with a time on it.`,
    ], "affairkiss"));
    return;
  }

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
        (lost ? `Somewhere in the lesson, ฿${_num(lost)} becomes a tuition fee.` :
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
  // SHE NOTICES A MAN WHO WON'T TAKE THE HINT. Once she has already warmed to
  // you tonight, going round again is not more charm — it is the same charm
  // asked for twice, from a woman with a floor to work and a quota on it. So
  // the arc is: charm → a kiss (the escalation below) → "you said that one
  // already" → "enough now, na", the last with a real cost.
  //
  // This is the free economy's OTHER brake, and deliberately the diegetic one:
  // _charmHappy polices working the whole rail, this polices working one girl
  // to death, and it is about HER patience rather than about a meter (Mario's
  // call, round 33). Counted per girl per night and kind-agnostic — it sits
  // ABOVE the flirt→kiss rewrite on purpose, because after the first attempt
  // every "flirt" IS a kiss, and a counter keyed on the verb would never fire.
  const tries = (G.soc.tries = G.soc.tries || {});
  tries[id] = (tries[id] || 0) + 1;
  if ((G.soc.charmed || {})[id] && tries[id] >= 3) {
    if (tries[id] < 5) { _say(_pickVary(_FLIRT_AGAIN, "flirtagain")(name)); return; }
    _say(_pickVary(_FLIRT_ANNOY, "flirtannoy")(name), "alert");
    _addHappy(-1, "she has had enough of being worked");
    _addBond(id, -1);
    // and past a certain point the ROOM notices, which is the bar's own physics
    if (tries[id] >= 7) _addHeat(1, "working a girl who had already asked you to stop");
    return;
  }
  // FLIRT auto-escalates on repetition: once she's already responded warmly
  // tonight (G.soc.charmed — the same flag that gates the once-a-night สนุก
  // spark below), a SECOND flirt reads as an invitation to kiss, not a repeat
  // of the first. The player never needs to know the word KISS exists to
  // reach it — SPANK/FONDLE stay out of this ladder entirely, a manual,
  // undiscovered find for a player who goes looking (Mario's call, round 32).
  // Placed after every special-case early return above, so it only ever
  // touches the ordinary tier-resolution path below — the only path that can
  // set `charmed` in the first place.
  // THE VERDICT CLOSES THE VERBS: the page said "nothing reopens it" and FLIRT still
  // poured a free drink and +3 สนุก the next night (Marcus, round 61)
  if (typeof _maiDee === "function" && _maiDee(id)) {
    _say(_pickVary(_MAI_DEE_SOCIAL, "maideesocial")(NPCS[id].name), "dim");
    return;
  }
  if (kind === "flirt" && G.soc.charmed && G.soc.charmed[id]) kind = "kiss";
  // the bra you bought her makes fondling "more interesting" — one tier warmer
  const braBump = (kind === "fondle" && G.soc.bra && G.soc.bra[id]) ? 2 : 0;
  const net = _favor(id) - SEV[kind] + braBump + _persSocialMod(kind);
  let tier = net <= -3 ? 0 : net <= -1 ? 1 : net <= 1 ? 2 : net <= 3 ? 3 : 4;
  // flirt is the soft action: it has no tier-0/1 rejection pools (they're null),
  // so a very-low-favor flirt (e.g. a bad-rep stranger) must clamp UP to its lowest
  // defined tier — "filed under harmless" — rather than crash on a null pool.
  while (tier < 4 && !_SOCIAL_TEXT[kind][tier]) tier++;   // bounded: tier 4 is always defined
  const fn = _pickVary(_SOCIAL_TEXT[kind][tier], "soc:" + kind + tier);
  _say(fn(name), tier === 0 ? "alert" : tier >= 3 ? "win" : "");
  if (braBump && tier >= 3) _say("(The bra you bought her is, as advertised, doing work.)", "dim");
  if (tier === 0) { _addHeat(SEV[kind] >= 4 ? 2 : 1); _addHappy(-1); }
  else if (tier === 1 && SEV[kind] >= 4) _addHeat(1);
  else if (tier >= 3) {
    // The flirt fountain, closed (optimizer playtest 2026-08-22): a warm girl's
    // reciprocation paid +1/+3 สนุก per TURN, free and unthrottled — a ฿0 line
    // that outpriced every paid activity 10-40x and bypassed the treadmill
    // (which only polices conquests). Same doctrine as the treadmill, applied
    // here: the FIRST spark with a girl each night pays; after that the charm
    // is real but the novelty isn't — favor still accrues, prose still plays,
    // สนุก doesn't restack. Per girl per night (G.soc.charmed, nightly reset).
    const charmed = (G.soc.charmed = G.soc.charmed || {});
    if (!charmed[id]) {
      charmed[id] = true;
      _charmHappy(tier === 4 ? 3 : 1);
    }
  }
  if (tier >= 3) _maybeSelfBarfine(id);
  if (kind === "fondle" && tier === 4 && G.money >= _ladyPrice()) {
    G.money -= _ladyPrice();
    _addBond(id, 1);
    _say(`(-฿${_num(_ladyPrice())} for her drink. ฿${_num(G.money)} left, and worth it.)`, "dim");
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
  // a rail regular resolves through _findNpc now (one cast) — but he was never
  // a candidate for the ceiling game: fall through to the same "Whose?" /
  // "nobody here is wearing any" answers the old table split produced (the
  // she-voiced staff refusal below must not land on a 67-year-old at the rail)
  if (id && NPCS[id].patron) id = null;
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
      "back at your head. Now it's a war, and " + _mamaRef() + " is pretending very hard " +
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
  // …except the one the street itself names. Naklua Road's prose puts a brass
  // bell on Notty's wall, and RING BRASS BELL answered "no bell out here"
  // (Gerry, round 34). It exists; what you lack is the standing to use it.
  // …and a man who HAS been sent presses it and is expected: the bell was the one
  // door on the street that told the sent man "no bell out here" (Anand, round 59)
  if (!_inBar() && G.room === "naklua_rd" && _nottysOpen()) {
    const _byName = !(_flag("orchidSent") || _flag("orchidVouched") || _flag("orchidReported"));
    _say(_byName
      ? "You press the brass bell once. A grille slides back; a woman's eyes look at you, and then past you, the way a mamasan reads a man at her door. \"The Stinky,\" she says — not a question. The grille closes, and the gate is open. A man with a bar on Soi 6 is a name here, whether or not anybody sent him."
      : "You press the brass bell once, the way a man who has been sent presses it. Somewhere behind " +
      "the wall a lock thinks about it, and then the gate is simply open.", "dim");
    _doEnter("notty's place");
    return;
  }
  if (!_inBar() && G.room === "naklua_rd" && !_nottysOpen()) {
    _say("The brass bell on Notty's wall is the only bell out here, and it is not " +
      "the ringing kind — not for you. A man who has been sent presses it once and is " +
      "expected. A man who found it presses it and stands in a lane listening to nothing " +
      "happen. You leave it alone, which is the correct read.", "dim");
    return;
  }
  if (!_inBar()) { _say("No bell out here. The bell is a bar instrument, like the till."); return; }
  const price = _bellPrice(G.room);
  if (G.money < price) {
    _say(_fmt("The bell rope dangles there, daring you. A ring is a round for the " +
      "house — ฿{p} — and you have ฿{m}. Ringing a bell you " +
      "can't pay for is how farang end up in the khlong.", { p: price, m: G.money }));
    return;
  }
  G.money -= price;
  const r = G.room;
  _ringBell(r);
  _say("You reach up and RING THE BELL.", "win");
  const bt = _room().barType;
  const pool = bt === "pub" ? _BELL_PUB
    : bt === "soi6" ? _BELL_SOI6 : bt === "gogo" ? _BELL_GOGO
    : _BELL_BEER; // beer bars, and any other bar-type, buy a round for the staff
  const _solo = _staffAt(G.room).length === 1 && bt !== "gogo";
  _say(`${_pickVary(_solo ? _BELL_SOLO : pool, _solo ? "bellsolo" : "bell:" + bt)} (-฿${_num(price)}, ฿${_num(G.money)} left — reign while it lasts.)`);
  if (pool === _BELL_BEER) _compDrink(1);      // every line in that pool hands one back across the rail
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
  _boughtHappy(2);
}

// RING BELL means different things by venue. A go-go bell is a round for the
// stage and the floor; a beer-bar bell is a round for the handful of staff; a
// pub bell is the oldest magic there is — a round for the whole house.
// Soi 6: a stool bar with the street for a stage — the go-go pool's "girls on stage
// break character" rang on a street whose own desc says "no stages" (Neville, round 53)
const _BELL_SOI6 = [
  "The bell goes and the whole frontage turns round: the girls on the stools cheer, the ones out on the pavement come in to see who did it, and the cashier is already pouring. The street hears it two doors down.",
  "You ring it and Soi 6 does what Soi 6 does with a bell — a cheer from the stools, a round down the rail, and a girl from the bar opposite shouting across that she heard that.",
  "The bell, and a cheer like a goal: every stool, the mamasan, the tout at the door. Drinks go down the length of the bar and the pavement gets a look at the man who rang it.",
];
const _BELL_GOGO = [
  "The bar detonates. Cheering from the girls, a drum-roll on the counter from the cashier, " +
    "the mamasan's first fully unguarded smile of the night. Drinks materialise down the length " +
    "of the bar and every lady in the room now knows your name.",
  "You ring it and the whole floor turns: the girls on stage break character to cheer, the ones " +
    "off it swarm the front row, the mamasan's guard drops for exactly one smile. A round for everyone " +
    "working tonight — and everyone working tonight now knows your name.",
  "The bell goes and the place ignites — a round for the stage and the floor both. Cheers over " +
    "the bass, a drum-roll from the cashier's cage, hands on your shoulders you didn't invite and " +
    "don't mind. For one whole song you are the most popular man on the soi.",
  "One pull and the room goes off: drinks down the whole rail, the girls whooping, the DJ " +
    "shouting something with your description in it. The mamasan lets you have this one.",
  "You haul the rope and the bar erupts — a round for the ladies on stage and off, every eye and " +
    "every smile suddenly aimed at you. Expensive way to be handsome. Works every time.",
];
// A bar with one woman in it: the bell still works, it is simply a different
// scene, and the crowd lines were describing staff who are not there.
const _BELL_SOLO = [
  "You ring it, and the round is for a staff of one. She laughs at the sound of it — one bell, one girl, one cold bottle pushed back across the rail at you — and for the next ten minutes this is the friendliest bar in Pattaya, because there is nobody in it to disagree.",
  "The bell in a one-woman bar is an odd, lovely noise: too big for the room, and she rings the last of it herself with a fingernail. \"For me? Okay!\" A bottle for her, a bottle back for you, and the whole ceremony costs less than a round anywhere with a crowd in it.",
  "A round for the house, and the house is her. She toasts you with something she was already drinking, tops your bottle up before it is empty, and says the thing every small bar says to a man who rings the bell early: \"You come back, na.\"",
];
const _BELL_BEER = [
  "A round for the staff, and the little beer bar loves you for it. The two or three girls behind " +
    "the rail cheer, the cashier bangs the counter, and a cold one lands in front of you before " +
    "you've even lowered your arm.",
  "The bell means the staff drink on you, and they do, gladly — whoops from behind the rail, a " +
    "bottle-opener drum-roll, the whole open front a few degrees warmer, and a bottle back across the rail for you. Small bar, big welcome.",
  "You ring it: a round for everyone working the bar. The girls toast you, the cashier grins, and " +
    "a comped bottle finds its way back to your hand. Beer-bar economics — everybody wins.",
  "A round for the house, which here is a handful of staff and whoever wandered in off the soi. " +
    "Cheers, clinks, a cold one pushed back at you, and your name suddenly known the length of a very short bar.",
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
  // The anonymous bar-bore cannot be at a rail the room has just described as
  // empty. In the lean months _describeRoom prints the thinned register — "the
  // far stools are empty tonight, the regulars who'd usually be welded to them
  // are home" — and TALK TO PATRON then produced one of them, talking football
  // (Gerry, round 34). Same condition, same answer: nobody there.
  const railCrowd = _npcsHere().filter(id =>
    !NPC_ROLES[id] && !NPCS[id].manager && !NPCS[id].filler && !NPCS[id].house);
  if (typeof _lowSeason === "function" && _lowSeason() && !railCrowd.length) {
    _say("You look down the rail for somebody to talk to and find stools. The lean " +
      "months take the regulars first — they're home, or they're economising, or " +
      "they're simply not the sort to drink in an empty room.", "dim");
    return;
  }
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
  const here = _regularsHere();
  if (here.length) { _doTalk(NPCS[here[Math.floor(_rand() * here.length)]].name); return; }
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
      `“฿${_num(rate)}. That's what ${name} gets you now — ${sym}1, ฿${_num(rate)}. When I ` +
      `moved out here it was ฿${_num(golden)}. THIS TOWN USED TO BE CHEAP.” ` + (_room().barType === "gogo"
        ? `Nobody on the stage can hear him, which he has never once noticed.`   // the rail's ritual, not a go-go's (Henrik, round 69)
        : `The girls mouth the speech along with him, word for word, nightly for nine years.`));
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
      `his profile picture — announces to nobody: “฿${_num(b.thb)} ` +
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
      "the Pattaya Leisure Group, whoever's name is over the door. Front company. " +
      "Fella called Laurent Vasseur behind it — Frenchman, never here, always here. Bars " +
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
  const t = d >= 13 ? 3 : d >= 7 ? 2 : d >= 3 ? 1 : 0; // stranger / face / regular / her farang
  // the verdict: a woman who has decided you are not a good man will still serve you, and
  // remember your face, and nothing you buy climbs past that (essay ledger theme 6)
  return _maiDee(id) ? Math.min(t, 1) : t;
}
function _maiDee(id) { return !!(G.maiDee && G.maiDee[id]); }
// WHAT SHE HAS TOLD YOU does not reset with the drinks book. _bondTier is THIS
// week's warmth and it cools between trips — by a tier, not to nothing (2026-10-01) — the barfine waiver,
// the favor bias, the kept seat all read it. But the bond-gated DIALOGUE was
// reading it too, so a man who came back after a month to a woman who had
// shown him her son's photo and named her village was told "we're not at the
// village-name part yet" until four drinks refilled the meter (Howard, round
// 35). Her memory is not a meter. This is the tier she has ever reached with
// you, and it is what her dialogue gates on.
function _knownTier(id) {
  // the tier she EVER reached with you: Lek un-told her son on the fourth trip, once the
  // week's warmth had cooled to nothing (Piet, round 62) — her memory is not a meter
  const t = Math.max(_bondTier(id), (G.prevBond && G.prevBond[id]) || 0, (G.everBond && G.everBond[id]) || 0);
  return _maiDee(id) ? Math.min(t, 1) : t;   // what she told you once she will not tell you again
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
    (n, k) => `${n} lights up like payday and calls you ${k} — the name she uses for nobody else, ` +
      "decided one night without consulting you and never once dropped since. She's told her " +
      "friends about you; you can tell by how they look over. Around here, that's as close to a " +
      "girlfriend as the arithmetic allows.",
    n => `${n} is across the room and under your arm before the door's shut, announcing you to the bar ` +
      "without a word. Whatever this is, she's stopped pretending it's business.",
    n => `The whole bar clocks it the moment ${n} sees you — the way she goes soft, the little nod the ` +
      "other girls give you. You're spoken for in here, and everyone knows it but you.",
  ],
};
// after she found out: the rail is still yours, she is still on it, and that is the whole greeting
const _REL_GREET_AFFAIR_SOUR = [
  n => `${n} is behind the rail. She does not look up when you come in, and she does not need to; the water is on your stool because that is the job. The rest of it is not.`,
  n => `${n} says "boss" the way Cake says it. Nobody on the floor looks at either of you, which takes some arranging.`,
  n => `${n} has your stool clear. She wipes the one next to it too, slowly, as if to say that both are for customers now.`,
];
const _REL_GREET_AFFAIR = [
  n => `${n} does not come to the door, because she is already behind the rail and the rail is yours; she looks up, once, the look that is not for customers, and goes back to the glass she was polishing. That is the whole greeting. It is enough.`,
  n => `${n} clocks you in and says nothing to the room about it, which in this bar is the loudest thing she could do. The girls have stopped looking over. They know.`,
  n => `${n} has your stool clear and a water on it — not a drink, a water — and the small nod that means the ice came, the float is right, and she missed you, in that order.`,
];
// Your OWN staff greet the guv'nor, not a customer: "under your arm before the
// door's shut… stopped pretending it's business" printed at your own bar, the
// morning after you had stepped back from her (Hennie, round 55).
const _REL_GREET_OWN = [
  n => `${n} looks up from the ice when you come in — "boss" — and has your water on the rail before you've reached it.`,
  n => `${n} gives you the nod the floor gives the owner: you're here, the float's right, nothing's on fire.`,
  n => `${n} is mid-order and doesn't stop; she lifts two fingers off the tray at you, which from her is a speech.`,
];
const _REL_GREET_STEPPED = [
  n => `${n} says "boss" exactly as she always did, which is the whole of it. The other girls watch her say it.`,
  n => `${n} is polite and quick and somewhere else, the way a person is with a door they closed on purpose.`,
  n => `${n} has your stool clear. She does not sit on the customer side any more; she didn't have to be asked.`,
];
// The verdict's register: polite, exact, nothing to push against. She is not angry — anger
// would be a door. Register-free narration; her one line obeys her English.
const _REL_GREET_MAIDEE = [
  n => `${n} sees you come in and serves you the way she serves anybody — the smile, the towel, the right change — and the seat she used to keep is somebody else's, and has been since that night.`,
  n => `${n} says hello, and it is a complete hello with nothing after it. You could sit here all week and it would not get any longer.`,
  n => `${n} looks up, places you, and goes back to her phone. Not a snub; a filing. Whatever you were to her was decided in front of a room, and rooms do not undecide.`,
];
// the return greeting: per woman, and the town never hands two women one line on one trip
// (Piet, round 62: Lek's and Nan's welcomes identical, word for word, twice)
function _returnGreetPick(id, pool) {
  const used = (G.returnGreetUsed = G.returnGreetUsed || {});
  const town = (used["*"] = used["*"] || []), mine = (used[id] = used[id] || []);
  let idx = pool.map((_, i) => i).filter(i => !mine.includes(i) && !town.includes(i));
  if (!idx.length) idx = pool.map((_, i) => i).filter(i => !mine.includes(i));
  if (!idx.length) idx = pool.map((_, i) => i);
  const i = idx[_hh(id + ":return:" + (G.vacation || 1), 23) % idx.length];
  mine.push(i); town.push(i); if (town.length > pool.length - 1) town.shift();
  return pool[i];
}
function _relGreeting(id) {
  if (_maiDee(id)) { _say(_pickVary(_REL_GREET_MAIDEE, "relmaidee")(NPCS[id].name), "dim"); return; }
  if (typeof _affairLive === "function" && _affairLive() && id === G.affair.id) {   // your girl, not "as close as the arithmetic allows" (Graham, round 47)
    // …unless she has found out (Rolf, round 66: "the small nod that means she missed you" the evening after the apron came off)
    if (G.affair.soured) { _say(_pickVary(_REL_GREET_AFFAIR_SOUR, "relaffairsour")(NPCS[id].name), "dim"); return; }
    _say(_pickVary(_REL_GREET_AFFAIR, "relaffair")(NPCS[id].name), "win"); return;
  }
  if (typeof _atOwnBar === "function" && _atOwnBar() && typeof _barStaff === "function" && _barStaff().includes(id)) {
    const stepped = G.affairCool && G.affairCoolWho === id && G.day - G.affairCool < 30;
    _say(_pickVary(stepped ? _REL_GREET_STEPPED : _REL_GREET_OWN, stepped ? "relstepped" : "relown")(NPCS[id].name), "dim"); return;
  }
  const t = _bondTier(id);
  if (t < 1) return;
  // four nights in the hotel and nobody said where you'd been (Piet, round 62): a regular notices a gap
  const gap = (G.seenDay || {})[id] != null ? G.day - G.seenDay[id] : 0;
  if (t >= 2 && gap >= 3 && (G.soc.awaySaid = G.soc.awaySaid || {})[id] !== G.day) {
    G.soc.awaySaid[id] = G.day;
    _say(_pickVary(_REL_GREET_AWAY, "relaway:" + id)(NPCS[id].name, gap), "win");
    return;
  }
  const pool = _REL_GREET[t];
  _say(pool[Math.floor(_rand() * pool.length)](NPCS[id].name, _herNameForYou(id)), t >= 2 ? "win" : "");
  const _arm = G.party && G.party.ids && G.party.ids.find(p => p !== id && NPCS[p]);
  if (_arm && t >= 2) _say(_pickVary([
    (n, c) => `— and then ${n} sees who is on your arm. The towel goes back under the rail. ${c} gets the smile that is all teeth; you get the one that keeps the book.`,
    (n, c) => `Then ${n} clocks ${c}'s hand in yours, and does not say a word about it, and the kept seat is, suddenly, just a stool.`,
  ], "relarm")(NPCS[id].name, NPCS[_arm].name), "dim");   // the kept seat with another woman holding your hand (Ingrid, round 62)
}
const _REL_GREET_AWAY = [
  (n, g) => `${n} sees you and does the arithmetic out loud. "${g} night you no come." Not angry; counting. "I think you go home. I think you find other bar." A beat, and the stool is wiped. "Sit. Tell me which one it was."`,
  (n, g) => `"Where you GO?" ${n}, from across the room, before hello. "${g} night! I ask Tan, I ask everybody." She has not asked anybody. She has counted, which is worse. "Sit down. You look tired. Sit."`,
  (n, g) => `${n} looks at you a second longer than the bar smile needs. "You sick? ${g} night I keep your seat, then I stop." She keeps it again, without saying so, by putting her bag on it.`,
];

// The name she calls you and nobody else. It was only ever SPOKEN on a night
// ride, while the her-farang greeting had been *describing* it — unsaid — every
// time you walked in (Geraint, round 47: eleven nights at that tier and he never
// once heard it). One list, keyed on HER, so the woman who named you on the back
// of a bike is using the same name across the rail the next evening.
const _HER_NAME_FOR_YOU = ["{{Nong}} Handsome", "Khun Big", "Farang Neung", "Papa Bear", "Mister Tomorrow", "Khun Slow"];
function _herNameForYou(id) { return _HER_NAME_FOR_YOU[_hh(String(id) + ":nick", 29) % _HER_NAME_FOR_YOU.length]; }

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
    n => `${n} does the thing she does when the mamasan is not looking: kicks one heel off under ` +
      `the rail and flexes her foot, and catches you seeing it, and does not put it back on. ` +
      `"Eight hour," she says. "You no tell."`,
    n => `"You want know something?" ${n} leans in like it is gossip and it is not. "The song. This ` +
      `one, every night, four year." She tips her head at the speaker. "I hate it so much I love ` +
      `it now. Is my song. Nobody know that."`,
    n => `${n} eats. Properly — a bag of something from the cart, elbows on the bar, no performance ` +
      `at all — and carries on the conversation round it. It takes you a second to notice that ` +
      `she has stopped working while she is sitting with you.`,
    n => `"My friend ask me today who is the farang I talk about," ${n} says, and then looks ` +
      `absolutely horrified at herself, and busies herself with the ice. The subject is closed. ` +
      `The subject is extremely not closed.`,
    n => `${n} corrects you — gently, but she corrects you — on something you said two nights ago ` +
      `and got wrong. Nobody in a bar corrects a customer. "Is not like that," she says. "I tell ` +
      `you properly, you listen." And she does, and you do.`,
  ],
  3: [
    n => `${n} wants to say a thing bigger than her English can carry, so she types it into her ` +
      "phone and turns the screen to you. The translation comes out flat and strange — something " +
      "about a door left open — but her face, watching you read it, is not flat at all.",
    n => `${n} puts her head on your shoulder, no reason, no ask. "My farang," she says to nobody, ` +
      `pleased. "Tonight no price, no show. When it you, everything off the clock."`,
    n => `"I tell my mother about you," ${n} says, watching your face for how you take it. "She ask ` +
      `when you come back. I say soon. You make me liar, na?" Only half a joke.`,
    n => `${n} shows you her {{phone}} without being asked: a photograph of a room. Bare, clean, a fan, ` +
      `a folded mattress, one shelf. "My room," she says. "Nobody see this. You see this." Then ` +
      `she takes the {{phone}} back, embarrassed, and talks about something else for ten minutes.`,
    n => `She is quiet a while, which she never is. Then: "You know what is the hard part? Not the ` +
      `work." ${n} turns the glass round on the mat. "Is that I am good at it. Long time I am good ` +
      `at it. What else I am good at, I never find out."`,
    n => `"I have a bad day," ${n} says, flatly, like reporting weather, and does not decorate it ` +
      `or ask you to fix it. She just sits with you and lets the bad day be in the room, which is ` +
      `a thing she would not do in front of a customer, and you both know it.`,
    n => `${n} takes your hand and turns it over, looking at the palm like she is reading it, and ` +
      `is not reading it. "Farang hand. No work in it." No judgement — an observation, the way you ` +
      `would notice the weather. "My papa hand, you can see everything. Rice, then the factory, ` +
      `then nothing." A beat. "He was proud of the nothing. He earn it."`,
  ],
};
// Which lines a woman has already given YOU, and which you have heard from
// anybody. Three lines a tier was a "small true thing" told five nights running
// and then told again by a woman in another bar — the exact shape the floor
// moments already solved with floorSaid (Geraint, round 48). Her own book comes
// first; the town-wide one breaks a tie so two women do not share a confidence.
// LEK'S PRICE STORY STATES ITS OWN CONDITION — "come and sit with me on a night
// the rain has killed the pool" — and a player who met it, bought four lady
// drinks and asked again got the deflection back (Helen, round 49). The story is
// a TOPICLESS node fired by TALK, and she was ASKING, so the topic node answered
// first, forever. One predicate, consulted by both: when the night she named has
// arrived, the deflection stands down and the ask falls through to her.
function _lekPriceNight() {
  return !_flag("heardPriceStory") && _bondTier("lek") >= 1 &&
    (G.rain > 0 || (G.lastRain >= 0 && G.turns - G.lastRain < 15)) &&   // rain you can see from the step, not the bake's odds — "the flood carries a plastic bag past" on a dry night (Piet, round 62)
    !_flag("fed26") && !(G.game && G.game.type === "pool") && !_leagueTonight();
}

function _bondPick(id, tier, pool, skip) {
  const said = (G.soc.bondSaid = G.soc.bondSaid || {});
  const mine = said[id + ":" + tier] = said[id + ":" + tier] || [];
  const heard = (G.soc.bondHeard = G.soc.bondHeard || {})[tier] = (G.soc.bondHeard[tier] || []);
  // `skip` is a set of INDICES into the full pool — the caller used to hand in a filtered copy,
  // which shifted every index the books were keeping (the "yesterday you no come" variant was
  // marked told when its neighbour was)
  let pick = pool.map((_, i) => i).filter(i => !mine.includes(i) && !(skip && skip.includes(i)));
  // the room's own cast: "the new girl lazy" from a woman who works alone (Dieter, round 56)
  const _fit = new Set(_roomFit(pool).map(l => pool.indexOf(l)));
  if (pick.some(i => _fit.has(i))) pick = pick.filter(i => _fit.has(i));
  // A CONFIDENCE IS TOLD ONCE — by her, and by the town. The old fallbacks ("round again"
  // for her, the heard list for the town) handed Greta one secret from three women in a
  // fortnight (round 61). Nothing fresh means nothing: the caller prints the everyday line.
  const fresh = pick.filter(i => !heard.includes(i));
  if (!fresh.length) return null;
  const i = fresh[_hh(id + ":bond" + tier + ":" + mine.length, 17) % fresh.length];
  mine.push(i);
  heard.push(i);
  return pool[i];
}
// a bonded woman with no confidence left tonight — warm, ordinary, and nobody else's line
const _BOND_SPENT = [
  n => `${n} is glad to see you in the plain way, which is the real way: a hand on your arm, your drink before you ask, and nothing to tell you tonight because she has told you the things, and that is what being told things buys.`,
  n => `${n} sits, and does not perform, and asks about your day as if your day were a thing. It is quieter than the first nights. It is better than the first nights.`,
  n => `${n} leans on the rail beside you and watches the room with you instead of working you, which is the most expensive thing on the menu and is not on it.`,
];
// Your own staff, at the bar you own, talk to you as the guv'nor — not as a
// walk-in to be greeted and pitched (Keith, 2026-08-26: a filler mamasan offered
// to introduce the OWNER to his own girls; a hostess asked her employer "first
// time Pattaya?"). Register steps up by role, same as everywhere: the mamasan is
// fluent and runs the floor at you, the cashier is businesslike, the hostess is
// Tinglish and just glad the boss is in.
const _OWNER_GREET = {
  mamasan: [
    n => `"Boss." ${n} gives you the nod she keeps for you and nobody else. "Quiet start, but the crowd not come yet. Two girl late — I already call them. You want I put more ice on, or we see how it go?"`,
    n => `${n} is at your elbow before you've got your jacket off, low and quick: "One girl, her papers — the office want new photo, I fix, don't worry. Everything else clean. Good you come in tonight, boss."`,
    n => `"Ah, the owner arrives." ${n} says it dry, fond. "Sit, sit — is your bar, but you still sit. I run the floor, you watch the door. Twenty year, I know my half. You learning yours."`,
  ],
  cashier: [
    n => `${n} glances up from the drawer. "Evening, boss. Till started clean, I show you the book at close." Back to the count. With you, she is all business, which is the compliment.`,
    n => `"You're in." ${n} turns the book a quarter so you can see the running figure without asking. "Slow hour. It'll pick up. It always picks up." She does not look worried, so you decide not to be.`,
    n => `${n} slides last night's docket across without being asked and taps one line — a comp she wants you to initial. Everything above board, everything witnessed. She runs your money like it's her reputation, because it is.`,
    n => `"Boss." ${n} doesn't look up from the count, but two fingers rise from the notes in greeting — the exact amount of ceremony a till in progress can spare, and from her, warmth.`,
  ],
  hostess: [
    n => `"Boss! You here!" ${n} lights up — not the customer smile, the real one. "I like when you work. More fun. You want I bring you water? Boss cannot be drunk one, haha."`,
    n => `${n} bumps your arm on her way past with a tray. "Busy soon, na. You stay behind bar tonight? Good. When you here, the mama not shout so much." A wink, and she's gone to her section.`,
    n => `"Boss, boss —" ${n} reports the night's gossip in one breath: which regular is in a mood, which girl has new shoes, what the bar next door is charging now. Staff intelligence, delivered like a weather bulletin.`,
    n => `${n} points you at the ice bin with her chin as she passes — running low, her way of saying the boss may as well be useful. You fetch the ice. The floor approves of an owner who fetches the ice.`,
  ],
};
const _OWNER_PITCH = {
  mamasan: [
    n => `${n} looks at you like you've made a joke, then decides you have. "Introduce you? Boss — every girl in here already work for YOU." She laughs, low. "You want to know one, you TALK to her. Is your bar. Cannot barfine your own bar, tilac."`,
    n => `"Aiyah." ${n} waves it off, amused. "I sell the girls to the customer, not to the man who pay their wage. You like one of them, that is a different thing, and it is your own business — but there is no fine to pay yourself, na."`,
  ],
  cashier: [
    n => `${n} raises an eyebrow at the drawer. "Barfine? Boss, the fine come to this till — your till. You want to move money from your pocket to your own bar?" A small, dry smile. "Just go talk to her."`,
  ],
  hostess: [
    n => `${n} giggles. "You want girl? Boss, you the boss! I cannot charge you, mama kill me." She leans in, conspiratorial. "You like someone here, you just be nice. Free for you. Owner privilege, na."`,
  ],
};
function _ownBarStaff(id) {
  // her HOME room, not where she is standing: _npcRoom puts a companion in your room,
  // so a Blue Dog girl on your arm got the "fetch the ice" greeting (Rolf, round 66)
  const home = NPCS[id] && (NPCS[id].room || (NPCS[id].bars || [])[0]);
  return typeof _atOwnBar === "function" && _atOwnBar() && G.bar &&
    NPCS[id] && NPCS[id].filler && NPC_ROLES[id] && home === G.bar.room &&
    !((G.party && G.party.ids) || []).includes(id);
}
// topic null → the greeting; a customer-pitch topic → the redirect. Personal
// topics (family, plan, home) return false and fall through to normal dialogue —
// an owner can ask his mamasan after her grandchildren.
const _OWNER_PITCH_TOPICS = /^(girls?|lady|ladies|barfine|price|introduce|women)$/i;
// The woman you went home with, answering as herself (Rolf, round 55 — sixty nights
// of the affair, and every question outside the strain words fell to the floor's
// pools: her first-night hello to "love", "buy a drink — maybe it come back" to her
// own mother, the crises leaving no mark). Crisis-aware: G.affair.crisSeen and the
// choice made (crisChose) are what she remembers.
const _AFFAIR_MISS = [
  n => `${n} thinks about it and gives up, fond. "No idea, na. Ask me something about us."`,
  n => `"Hm?" ${n} is counting glasses and loses the count. "No idea, na. You know more than me about farang things."`,
  n => `${n} shrugs with one shoulder, which is how she says the question is for somebody else. "Ask Bert. Bert know everything useless."`,
];
// the subjects she answers differently once she has seen it with her own eyes
const _AFFAIR_SOUR_RE = /\b(shoes|hotel|last night|the girl|other girl|that girl|caught|saw|sorry|forgive|love|in love|feelings?|stay|together|you and me|us|plan|future|after close|after work)\b/;
function _affairTalk(id, tt) {
  if (!tt) return null;
  const a = G.affair || {}, seen = a.crisSeen || [], chose = a.crisChose || {}, n = NPCS[id].name;
  const pick = (k, lines) => _pickVary(lines, "afftalk:" + k);
  // AFTER SHE HAS SEEN IT (Ossie, round 70: the woman she watched on his arm got "No idea, na.
  // Ask me something about us", and LAST NIGHT got her own fond text read back)
  if (a.soured && a.caughtWith && a.caughtWith.length) {
    const other = a.caughtWith.find(w => new RegExp("\\b" + w.toLowerCase() + "\\b").test(tt));
    if (other || /\b(shoes|hotel|last night|the girl|other girl|that girl|caught|saw|see)\b/.test(tt)) return pick("sourother", [
      `"${other || a.caughtWith[0]}." ${n} says the name the way she reads a chit back: correct, and not hers. "I see her. I see the shoes. You want me to say more, you are asking the wrong person to make you feel better."`,
      `${n} keeps wiping. "${other || a.caughtWith[0]}? Nice girl. Good manners. She sit where I sit." A beat. "Ask me something about the bar, boss."`,
    ]);
  }
  if (a.soured && /\b(sorry|forgive|love|in love|feelings?|stay|together|you and me|us|plan|future|after close|after work)\b/.test(tt)) return pick("sour", [
    `"Now?" ${n} doesn't stop counting. "Now is staff. I tell you when it is not staff. Maybe I tell you."`,
    `${n} looks at you for exactly as long as she looks at a customer. "That word is for before. Before is finished. Ask me again in a long time."`,
  ]);
  if (/\b(love|in love|feelings?|love me)\b/.test(tt)) return pick("love", [
    `${n} doesn't look up from the glass she's drying. "Love is farang word. Thai word is — you come every night, I come every night. Same thing, more work." She holds the glass to the light. "Yes. Okay? Yes."`,
    `"You ask me that HERE?" ${n} tips her head at the rail, the girls, Cake's pen. "Ask me when the float is counted and there is no customer." A beat. "The answer is the same. I only want to say it with nobody paying for a drink."`,
    `${n} looks at you for a long second. "I don't say it every day like farang movie. I say it one time. I said it already. Remember or don't."`,
  ]);
  if (/\b(stay|together|you and me|girlfriend|after close|after work)\b/.test(tt)) return pick("stay", [
    `"Stay?" ${n} laughs. "I stay. Every night I stay. You are the one who go home to hotel like tourist."`,
    `${n} lowers her voice. "After close I am not staff. Before close I am staff. You must know which one you talk to." She almost smiles. "Now is staff."`,
  ]);
  if (/\b(roof|the roof|the house|house)\b/.test(tt) && seen.includes("family")) return pick("roof:" + (chose.family || "a"), {
    a: [`"The roof is finish." ${n} shows you a photo on her phone — tin, new, shining, her father standing under it like a man at a ribbon-cutting. "Mama say thank you. She not say it to you. She say it to me, same thing."`],
    b: [`${n} does not look at you. "The roof is fine. My brother fix with plastic. Is Thai roof now." She says it lightly, and the lightness is the whole of it.`],
    c: [`"Half roof." ${n} almost laughs. "Mama tell everybody: the farang pay half and tell the truth. In the village this is very strange man." A pause. "She like you more, I think. Don't tell her I say."`],
  }[chose.family || "a"] || [`"The roof is okay now."`]);
  if (/\b(tan|partner|fifty|51|the other owner)\b/.test(tt)) return pick("tan", [
    `"Khun Tan?" ${n} does not lower her voice, which is its own answer. "He own half the paper and none of the floor. He never look at me twice, and I am glad. A man who look at you twice in this town want something."`,
    `${n} wipes the same glass again. "Tan is your business. Tan is also the reason nobody ask the owner for his work permit." A shrug. "So I say nothing bad about Tan. Not even quietly."`,
  ]);
  if (/\b(village|home|hometown|where you from)\b/.test(tt)) return pick("home", [
    `"Home?" ${n} names the village like a place on a bus timetable. "Five hours. The bus is terrible. One day I show you, and you will hate it, and you will say it is beautiful to be polite."`,
    `"Up north-east. You know it already — I say it the first night." ${n} almost smiles. "Now it is where the money go. Here is where I am."`,
  ]);
  if (/\b(mother|mama|mum|mom|papa|father|dad|family|brother|sister)\b/.test(tt) && a.soured) return pick("familysour", [
    `"Mama is fine." ${n} leaves it there, which she never used to.`,
    `"Family okay." The cloth goes round the glass once more. "They don't ask about you now. I don't tell."`,
  ]);
  if (/\b(mother|mama|mum|mom|papa|father|dad|family|brother|sister)\b/.test(tt)) return pick("family", [
    `"Mama?" ${n} laughs. "Mama ask about you every call. What you eat, if you are fat yet. I say not yet."`,
    `"Papa fix motorbikes in the village. He not say much about you. He say one thing: a farang with a bar is still a farang." A shrug. "He will like you. Slowly. Like Papa like everything."`,
  ]);
  if (/\b(rota|late shift|friday|shift|schedule)\b/.test(tt)) return !seen.includes("rota")
    ? pick("rota0", [`"Mama make the rota. I work the rota. Is simple until it is not."`])
    : chose.rota === "b"   // the rota stood: she remembers THAT (Callum, round 71 — she thanked him for fixing it)
    ? pick("rotab", [`"The rota stand." ${n} shrugs, too lightly. "I work the Friday, I smile at the hand-grabbers. You were right, boss. I hate that you were right."`])
    : pick("rota", [`"The rota." ${n} makes a face. "You fix it, now everybody see you fix it. Next time I ask Mama, not you. Is better for both."`]);
  if (/\b(last night|yesterday|the night out|out|our night|the beach|the club)\b/.test(tt) && a.lastOut === G.day - 1 && !a.soured) return pick("outlast", [
    `"Last night?" ${n} smiles at the bar top, not at you. "Last night I was not staff. Tonight I am staff. Both are true, boss." A beat. "Ask me again tomorrow, maybe I tell you more."`,
    `${n} laughs. "You dance very bad. I tell everybody you dance good." She lowers her voice. "The floor know, na. Mama know. Was worth it."`,
  ]);
  if (/\b(mamasan|mama lamai|lamai)\b/.test(tt) && seen.includes("mamasan")) return pick("mama", [
    `"Lamai and me?" ${n} is quiet for a moment. "She is right, you know. A floor has one voice. I only don't like it when it is not mine."`,
  ]);
  if (/\b(old customer|customer|regular|the old man|him)\b/.test(tt) && seen.includes("regular")) return pick("cust", [
    `"The old customer?" ${n} shakes her head. "He come, he drink, he go home. You let it ride. Is the right thing. Is also the thing I cry about in the toilet, one time. Only one time."`,
  ]);
  if (/\b(free|free drink|the free drink|free shot)\b/.test(tt)) return pick("free", [   // "Free drink is for customer" — to the boss (Ossie, round 70)
    `"Free?" ${n} laughs. "Boss, I pour your free one myself. Is the only free thing in this bar, and it is for you."`,
  ]);
  if (/\b(salary|quota|wage|lady drink|drinks?|tips?|money)\b/.test(tt)) return pick("money", [
    `"Quota?" ${n} snorts. "Cake write my drinks same as everybody. Then she write them again on your page. Two books for one girl."`,
    `${n} taps the tip tin under the bar. "Everything go in there, same as the others. I am not the owner's girl on the tin. On the tin I am staff."`,
  ]);
  if (/\b(plan|future|dream|later|next year)\b/.test(tt)) return pick("plan", [
    `"Plan?" ${n} looks at the bar, then at you, and for once does not make a joke of it. "Before, plan was: work, send money, go home at forty. Now I don't know the plan. You are in it. Is scary, na."`,
  ]);
  return null;
}

// After SELL UP the floor you sold still knows you — Lamai's first-ever hello, "New
// face. Good. I am the mamasan", to the man she worked for sixty-six nights (Rolf, round 55)
const _FORMER_BOSS = [
  n => `${n} sees you and laughs. "Old boss! You come to drink, or you come to check the ice?" She pours before you've said.`,
  n => `"Hey — the man who sold us." ${n} says it without any edge at all. "New boss okay. Not like you. Okay."`,
  n => `${n} wais you properly, which she never did when you signed her wages. "You look happy. Good. Somebody should."`,
];
function _ownBarTalk(id, topic) {
  if (_flag("barSold") && !topic && G.bar && NPCS[id] && NPCS[id].filler && NPC_ROLES[id] && _npcRoom(id) === G.bar.room) {
    _say(_pickVary(_FORMER_BOSS, "formerboss")(NPCS[id].name)); return true;
  }
  if (!_ownBarStaff(id)) return false;
  // the affair girl is past the staff registers entirely — her tier-3 bond
  // dialogue (the phone-translator deep talk) is the true voice now
  if (typeof _affairLive === "function" && _affairLive() && id === G.affair.id) {
    // …but she does not quote the man she went home with her barfine (Graham,
    // round 47: "my price is my price" four mornings running), and she has an
    // answer for the things the strain lines say about her
    const tt = String(topic || "").toLowerCase();
    if (tt && _OWNER_PITCH_TOPICS.test(tt)) {
      _say(_pickVary([
        n => `${n} looks at you for a second as if you had spoken Dutch. "Price?" She goes back to the glasses. "You know the price, boss. You are paying it every night. Not in baht."`,
        n => `"Barfine." ${n} does not laugh, which is how you know it landed. "Ask mama. Then ask her whose name she writes." A beat. "Then come home."`,
        n => `${n} tips her chin at the room. "The girls have a price. I have a boss. Which one you asking, na?" She is not entirely joking.`,
      ], "affairpitch")(NPCS[id].name)); return true;
    }
    const _said = _affairTalk(id, tt);
    if (_said) { _say(_said); return true; }
    // TOPICS promised late and free and both missed (Rolf, round 66): a topic HER OWN
    // node answers is hers to answer, in her own words — only the pitch is replaced
    { const own = tt && _pickDialogue(id, tt);
      if (own && own.topic && typeof _topicHits === "function" && _topicHits(own.topic, tt)) return false; }
    if (tt && /\b(cousin|formal|goodnight|us|strain|distance|what is wrong|what's wrong|angry|sleeping)\b/.test(tt)) {
      const a = G.affair;
      _say(_pickVary(a.strain >= 6 ? [
        n => `${n} keeps her hands busy with a cloth that is already clean. "My cousin has a room and no questions. Some nights I want the no questions." She looks up. "You want to fix it, you know where the fixing is. It is not here, at the rail."`,
        n => `"Formal?" ${n} says the word back like a customer's word. "I say goodnight the way I can say it. You want the other way — be here the other way."`,
      ] : [
        n => `${n} shrugs it off, warm. "Nothing wrong. Nothing wrong is the thing I am telling you. Buy me nothing, sit with me, that is the price today."`,
        n => `"Us?" ${n} laughs, short and real. "Us is fine. Us is the only thing in this bar that is not on a chit. Don't put it on one."`,
      ], "affairus")(NPCS[id].name)); return true;
    }
    // anything else she does not know, she says in HER voice — not the floor's "that
    // one I don't know", and never her first-night hello (Rolf, round 55)
    if (tt) { _say(_pickVary(_AFFAIR_MISS, "affairmiss")(NPCS[id].name)); return true; }
    if (G.affair.soured) { _say(_pickVary(_REL_GREET_AFFAIR_SOUR, "relaffairsour")(NPCS[id].name), "dim"); return true; }   // the girls "know" — what they know changed (Ossie, round 70)
    _say(_pickVary(_REL_GREET_AFFAIR, "relaffair")(NPCS[id].name)); return true;
  }
  const role = NPC_ROLES[id];
  const _t = String(topic || "").toLowerCase();
  // THE TERMS AND THE BOARD are the owner's own decisions, and his staff answer them as
  // staff — Lamai answered her salary in the customer register ("enough that I care
  // whether you come back") and Cake said the price never changes the night the board
  // moved (Greta, round 61)
  if (_t && /\b(salary|salaries|commission|cut|quota|wages?|terms|flat money|flat salary)\b/.test(_t)) {
    const sal = typeof _barTerms === "function" && _barTerms() === "salary";
    _say(_pickVary(role === "hostess" ? (sal ? [
        n => `${n} shrugs, pleased and a little embarrassed about being pleased. "Flat money, no quota. Quiet night, same money. First time in this town I know what I get on the first." She taps the bar. "Other bar, the girls ask me how. I say, ask my boss."`,
        n => `"Salary?" ${n} says it carefully, like a word she is still trying on. "Good for me, boss. Not so good for you, maybe, on a quiet month — I can count." A beat. "I stay. That is what it buys you."`,
      ] : [
        n => `${n} fans the chits in her phone case without being asked. "The cut, boss. ฿${_num(LADY_CUT)} a drink, same as every bar. Full rail, good month. Thin rail—" she closes the case "—thin month. You know that. You set the board."`,
        n => `"Commission." ${n} does the arithmetic on her fingers, quickly, and stops. "Same as the trade. Is fair when the room is full. When it is not full, is fair for the bar." She says it without heat. "I count the stools. Everybody count the stools."`,
      ]) : role === "mamasan" ? (sal ? [
        n => `${n} nods at the floor. "Flat money suits them. It suits me — nobody cries over a quiet Tuesday. It does not suit the wages line on a wet one, and you will see that before I do."`,
        n => `"Salary." ${n} approves of it the way she approves of anything: by not objecting. "They stay. The good ones especially. You are paying for that every night, boss, including the nights nobody comes."`,
      ] : [
        n => `${n} flicks a nail at the board. "They live on the cut, boss. A full rail is their money; a dear board is your money and their quiet month. Nobody has to say it. They can all count."`,
        n => `"The trade's terms." ${n} shrugs. "Base and the drinks. It is how every bar on this soi pays, and it is why every girl on this soi knows what the bar across the road pays."`,
      ]) : (sal ? [
        n => `${n} turns the wages line round for you. "Flat salary, ฿${_num(BAR_SALARY_NIGHT)} a night on top, every night. I write it whether they sold a drink or not." She does not editorialise. She never does.`,
      ] : [
        n => `${n} squares the chits. "Base and the cut — ฿${_num(BAR_WAGES)} a night for the floor before a drink is sold, and the cut on what they sold, end of the month. A thin board is a thin envelope; they open it in front of me."`,   // no figure (Hal, round 62)
      ]), "ownterms:" + role)(NPCS[id].name));
    return true;
  }
  if (_t && /\b(board|prices?|the chalk|dear|expensive|cheap)\b/.test(_t) && G.bar) {
    const mk = G.bar.markup || "list";
    const word = { cheap: "ten under the soi", list: "the soi's own numbers", up: "fifteen over", steep: "thirty over" }[mk];
    _say(_pickVary(role === "cashier" ? [
      n => `${n} glances at the board without turning her head. "${word.charAt(0).toUpperCase() + word.slice(1)}. I charge what the chalk says, boss. Ask the girls what it costs them."`,
      n => `"The board?" ${n} taps the till. "I ring what it says. ${word.charAt(0).toUpperCase() + word.slice(1)}, since you wrote it." A pause. "The old regulars read it before they sit down now."`,
    ] : [
      n => `${n} looks at the board, then at you, and says only: "${word.charAt(0).toUpperCase() + word.slice(1)}, boss." It is not a complaint. It is an inventory.`,
      n => `"The chalk." ${n} shrugs. "You write it, I sell it. ${mk === "list" || mk === "cheap" ? "Customer happy, I happy." : "Customer read it twice. Some sit down. Some don't."}"`,
    ], "ownboard:" + role)(NPCS[id].name));
    return true;
  }
  // the books and the jobs before the customer pools: the cashier told her own boss
  // "one for the bar, one for her" about MONEY (Kwame, round 60)
  if (_t && /\b(money|till|takings|books?|float|arrangements?|cleaning|cleaners|screen|pos|till man|jobs?|contracts?|last night)\b/.test(_t) &&
      typeof _townTalk === "function" && _townTalk(id, _t)) return true;
  // the family the shift call just put on a bus: Manow's mother came in on the
  // overnight bus, and the next night her family answer was "I not see them long
  // time" (Rolf, round 54). Five days of her knowing you know.
  const _kin = G.bar && G.bar.earlyDay && G.bar.earlyDay[id];
  if (_t && role === "hostess" && _kin != null && G.day - _kin <= 5 &&
      /\b(family|mother|mama|mum|mom|home|kid|kids|son|boy|child)\b/.test(_t)) {
    const boy = typeof _girlHasBoy === "function" && _girlHasBoy(id);
    _say(_pickVary(boy ? [
      n => `"My boy?" ${n} has her phone out before you finish the word. "Look — new school shoe. Too big. He grow into it." Another photo. Another.`,
      n => `${n} laughs. "He sleep in my bed, I sleep on the floor. Is fine. He go back soon." She does not say how soon, and she does not look like she is counting.`,
    ] : [
      n => `${n} brightens. "Mama? She here! Sleep in my room, cook for me like I am twelve. I take her temple, then she go home." A roll of the eyes that fools nobody.`,
      n => `"Mama see the bar," ${n} says. "She say: small. I say: my boss own it, not me." She seems very pleased with the answer.`,
    ], "ownkin")(NPCS[id].name));
    return true;
  }
  // "us", before there is an us: a bonded hostess of your own answers with the
  // position, which is the antagonist of that story (Rolf, round 54, whose own
  // girl had nothing to say to "us / love / stay"). Tier 2+ only — a girl who
  // barely knows you has nothing to say to it either.
  if (_t && role === "hostess" && _bondTier(id) >= 2 &&
      /\b(us|love|stay|together|feelings?|you and me|girlfriend|after close)\b/.test(_t)) {
    _say(_pickVary([
      n => `${n} laughs, and then doesn't. "Boss. You are boss." She taps the bar between you. "Boss and girl — everybody know that story. Everybody know the end also." She goes back to the ice.`,
      n => `"Love?" ${n} says it the way you would say a price you cannot afford. "I like you, boss. Liking is free. The other one cost the whole bar." A shrug. "Maybe. Not tonight."`,
      n => `${n} looks at the mamasan, then at you. "Stay after, you mean?" Very quiet. "When I stay after, everybody see. Then you are not boss for them any more. You think about it, na."`,
    ], "ownus")(NPCS[id].name));
    return true;
  }
  if (topic && _OWNER_PITCH_TOPICS.test(topic)) {
    const pool = _OWNER_PITCH[role]; if (!pool) return false;
    _say(_pickVary(pool, "ownerpitch:" + role)(NPCS[id].name)); return true;
  }
  if (!topic && _bondTier(id) < 2) {   // a bonded staffer keeps her warmer personal hello
    const pool = _OWNER_GREET[role]; if (!pool) return false;
    _say(_pickVary(pool, "ownergreet:" + role)(NPCS[id].name)); return true;
  }
  // …and that warmer hello has to BE the bonded one. Falling through here sent a
  // bonded employee to _deliver's topicless node — "New face. Good. I am the
  // mamasan" from the woman who had called him boss for three weeks, with the
  // first-names tag under it (Malcolm, round 47, nights 22–23).
  if (!topic && _bondTier(id) >= 2) {
    // a STEP BACK holds for the month in her hello too — four nights after it Manow had her head on
    // his shoulder, "my farang… everything off the clock" (Greta, round 61)
    if (G.affairCool && G.affairCoolWho === id && G.day - G.affairCool < 30) { _say(_pickVary(_REL_GREET_STEPPED, "relstepped")(NPCS[id].name), "dim"); return true; }
    _bondTalk(id); return true;
  }
  return false;
}

// ── The other ledger ─────────────────────────────────────────────────────────
// The asymmetry, made mechanical. A farang sees prices; she sees a share, a
// quota, a month. Same numbers, other books — and the transaction never shows
// the paying man the second set. Generalised from Lek's rainy-night price story
// (the one node in the game that did this, gated on one girl and one weather),
// because a game about being a regular somewhere should let you find out what
// being a regular COSTS the other party (design note 2026-08-26).
//
// Rules this content lives by, all inherited from canon:
//  · She TELLS you, or you SEE a thing (a tally, a screen). The game never
//    narrates her interior — no "she feels", no "secretly she". Register is
//    flat and factual: Lek reading a receipt, not a confession.
//  · Never a victim, never a schemer. She is a working woman describing work.
//  · NO สนุก, no bond, no reward. Being told the truth is not a prize you win —
//    and paying happiness for it would be the crassest possible reading. The
//    only thing that changes is what YOU know.
//  · Numbers come from constants (world.js), never typed into prose.
const _OTHER_LEDGER = {
  // tier 1 — the cut. The first thing the arithmetic hides: what you hand over
  // is not what she receives.
  1: [
    (n) => `The next lady drink that goes on your chit, ${n} does a thing you have seen her do twenty ` +
      `times without once reading it: she takes the chit, folds it, and tucks it into the band of ` +
      `her phone case with the others. Not a keepsake — a tally. "For counting, end of month." ` +
      `She fans them like a small hand of cards, unembarrassed. "This one, I get ฿${_num(LADY_CUT)}." ` +
      `The drink was ฿${_num(_ladyPrice())}. She says the difference like a sum she checked years ago, and ` +
      `goes back to the story she was telling.`,
    (n) => `"You want to know something funny?" ${n} turns the chit over so you can see the bar's ` +
      `stamp. "Farang always say — I buy you drink, expensive one, good for you." She taps the ` +
      `stamp, once. "Bar take most. I take ฿${_num(LADY_CUT)}." No complaint in it at all; she is ` +
      `explaining a system she lives inside, to a man who has only ever ` +
      `seen it from the customer's side. "Is okay. Still better if you buy. Just — is not what you think it is, na."`,
    (n) => (_isGogo() ? `${n} makes you look at her drink when the waitress sets it down, because she tells you to. Ice to the top, ` +
      `a short pour, tonic over it until the colour went.` : `${n} makes you watch the barman build her drink, because she tells you to. Ice to the top, ` +
      `a short pour, tonic over it until the colour goes.`) + ` "Lady drink," she says, and turns the glass ` +
      `so the ice knocks. "Weak one. Must be." She has eight of these in her if the night goes well, ` +
      `and a girl who cannot take eight is a girl who goes home early. It costs ฿${_num(_ladyPrice())}, ` +
      `of which ฿${_num(LADY_CUT)} is hers — she says it the way she'd tell you which songthaew goes to ` +
      `Naklua, and asks whether you want another one.`,
  ],
  // tier 2 — the cost of you. Being liked is expensive: the seat she keeps is
  // the seats she doesn't fill, and the month is counted in drinks, not affection.
  2: [
    (n) => `Two men come in, look the room over, and settle at the far end with somebody else. ` +
      `${n} watches them go with an expression that is not jealousy and not regret — it is ` +
      `arithmetic. "Thirty drink a month," she says, when she catches you noticing. "After that, ` +
      `bonus." Tonight she has sat with you, only you, most of the evening, and you have bought her ` +
      `${(() => { const c = (G.soc.drinkCount && G.soc.drinkCount[_ledgerFor]) || 0; return c === 0 ? "nothing" : c === 1 ? "one" : c === 2 ? "two" : String(c); })()}. ` +
      `"You are good company." A shrug, entirely without accusation. "Good company is not ` +
      `thirty drink."`,
    (n) => `The mamasan's book is open on the till and, for once, angled where you can see it: a ` +
      `column of names, a column of marks. ${n}'s row is shorter than the girl's beside her. ` +
      `"She sit with four man tonight," ${n} says, following your eyes, matter-of-fact. "I sit ` +
      `with one." She does not add anything to that, and does not move away either, and both of ` +
      `those facts are the whole of what she is telling you.`,
    (n) => `"You know why I keep your seat?" ${n} asks it lightly, and answers it lightly, which ` +
      `does not make it less of an answer. "Because you come back. Man who come back is worth ` +
      `more than man who spend big one time — for me, not for bar. Bar want big one time." A beat. ` +
      `"So when mama say why you no work the door tonight, I say: he come back. And she look at ` +
      `the book." The book, you now understand, does not have a column for that.`,
    (n) => `A man at the far end has been talking to the mamasan for a while now and looking this way ` +
      `while he does it. ${n} says something across the room — pleasant, short, final — and the ` +
      `mamasan spreads her hands at him and goes back to her phone. "He want take me out." ${n} ` +
      `picks her glass back up. "I say I sit with my friend." She does not tell you what that was ` +
      `worth and does not appear to want you to ask. The sum was done in front of you regardless, ` +
      `and you are now a man who has watched it being done.`,
  ],
  // tier 3 — the arithmetic of a life. The month, the household, the years —
  // the figures the man across the table is one line item inside.
  3: [
    (n) => `${n} shows you her phone: a bank app, an amount, a date. "Every month, same day." ` +
      `฿${_num(HOME_SEND)} goes north — her mother, somebody's school fees, a roof somebody keeps meaning ` +
      `to finish. The bar's salary is ฿${_num(BAR_SALARY)}; the rest is drinks, and drinks are you and ` +
      `men like you. "So." She locks the {{phone}} and puts it face-down, the way she does. "Now you ` +
      `know all my number. Nobody know all my number." It is not said as a burden. It is said as ` +
      `an accounting, handed over.`,
    (n) => `The talk goes somewhere it has not been before, and ${n} does the sum out loud without ` +
      `being asked: what a good month clears, what is left after the room and the sending, how ` +
      `many months of that make the thing she is saving toward. The number of months is large ` +
      `enough that she laughs at it herself. "Long time, na." She turns the glass. "Everybody ` +
      `think we make money fast here. Fast money is one night. Slow money is the one you keep."`,
    (n) => `"How old you think I am?" You are wise enough not to answer. ${n} tells you anyway, ` +
      `and then tells you how long she has done this, and the second number is most of the first ` +
      `one's adult life. "Girl come nineteen, twenty. Go home when?" She lifts a shoulder. ` +
      `"Depend." Across the room somebody rings the bell and the room cheers, and she cheers too, on ` +
      `time, professionally, and then turns back to you and picks the sentence up exactly where ` +
      `she left it.`,
    (n) => `You ask where she stays and get a longer answer than the question earned: a room off ` +
      `Buakhao, ฿${_num(ROOM_RENT)} her share of it, two other girls, a rice cooker, one fan that works. ` +
      `When the bar is near enough for walking she walks it, at three in the morning, rather than ` +
      `pay the late fare — and says so without a flicker, because the late fare is the late fare ` +
      `and she can count. "Is not far." She considers that. "Is far when rain."`,
  ],
};
// Fires when you sit down with a girl whose bond has crossed into a tier whose
// ledger you have not been shown. Once per girl per tier, ever — it is a reveal,
// not a repeatable line. Deliberately on TALK (you sat with her) rather than on
// the bond crossing itself: an earned interstitial, in her mouth, in the room.
// the drinks-only girl's tier-one reveal: the cut is the same, the conclusion is hers
const _LEDGER_DRINKS_ONLY = [
  (n) => `${n} folds your chit into her phone case with the others, and when you look at the stack ` +
    `she fans it for you. "This is my money. ฿${_num(LADY_CUT)}, each." She counts, lips moving, stops. ` +
    `"Eight tonight. Other girl, she go with customer, she get more — one time. Then he go home, ` +
    `and she sit here same like me, with no chits." She taps the stack. "I like the small money that ` +
    `come every night. Mama not like it. Mama not sit here."`,
  (n) => `"You know why I not go?" ${n} turns the chit so you can see the stamp. "Barfine, the bar take. ` +
    `Lady money, I take, one time. Lady DRINK, I take ฿${_num(LADY_CUT)} — every time." She lifts the glass. ` +
    `"Every time is more than one time. I can count. Mama can count too, but mama count different ` +
    `things."`,
]
function _otherLedger(id) {
  if (!NPC_ROLES[id] || !G.soc.drinks) return false;
  // THE OTHER LEDGER IS A CUSTOMER'S BEAT. All three tiers fired on the owner's own
  // staff — "Bar take most. I take ฿60… still better if you buy", to the man who
  // sets the cut, whose till her drink rings into; the salary, to the man who
  // pays it (Malcolm, round 47, 26 nights). At your own bar the asymmetry is
  // yours to know from the other side, and it does not need explaining to you.
  if (typeof _ownBarStaff === "function" && _ownBarStaff(id)) return false;
  if (!_inBar()) return false;   // "two men look along the rail" in a by-the-hour motel (Ingrid, round 62)
  const t = _bondTier(id);
  if (t < 1) return false;
  const book = (G.soc.ledger = G.soc.ledger || {});
  const seen = book[id] = book[id] || [];
  // the LOWEST unseen tier fires first: a girl who warmed to you fast still
  // starts the telling at the cut — the reveals are a sequence, not a menu
  const due = [1, 2, 3].find(x => x <= t && !seen.includes(x));
  if (!due) return false;
  _ledgerFor = id;                       // the tier-2 beat reads tonight's real drink count (Stan, r35: "two" after eight)
  const pool = due === 1 && typeof _drinksOnly === "function" && _drinksOnly(id) ? _LEDGER_DRINKS_ONLY : _OTHER_LEDGER[due];
  if (!pool) return false;
  seen.push(due);
  G.ledgerSeen = (G.ledgerSeen || 0) + 1;   // how much of the other side you've been shown
  _say("");
  _say(_ledgerPick(id, due, pool)(NPCS[id].name), "thai");
  return true;
}

// The ledger book is PER WOMAN, so it could never repeat itself to you — and a
// second woman handed you the first one's script anyway. Geraint (round 47,
// eleven nights on four women) had Lek's folded-chit reveal come back verbatim
// as Wilai's, and Nan's quota reveal again as Toey's: the tier is a thing the
// TOWN shows you once, so the memory has to be town-wide. Pure hash, never dice
// (a reveal must not depend on how many turns you took to reach it).
function _ledgerPick(id, tier, pool) {
  const heard = (G.soc.ledgerHeard = G.soc.ledgerHeard || {});
  const told = heard[tier] = heard[tier] || [];
  let pick = pool.map((_, i) => i).filter(i => !told.includes(i));
  if (!pick.length) { told.length = 0; pick = pool.map((_, i) => i); }
  const i = pick[_hh(id + ":ledger" + tier + ":" + told.length, 23) % pick.length];
  told.push(i);
  return pool[i];
}

function _bondTalk(id) {
  const t = _bondTier(id) >= 3 ? 3 : 2;
  let pool = _BOND_TALK[t];
  // "Yesterday you no come, I look look" is a claim — she said it to a man who had
  // spent the previous night WITH her (one-girl playtest 2026-08-22). G.seenDay
  // records the last day you sat with her; skip that variant if it was yesterday.
  const last = (G.seenDay || {})[id];
  const skip = (t === 2 && last != null && last >= G.day - 1) ? [0] : [];
  const line = _bondPick(id, t, pool, skip);   // hers first, then the town's — see _bondPick
  _say((line || _pickVary(_BOND_SPENT, "bondspent:" + id))(NPCS[id].name), line && t >= 3 ? "win" : "");
}

// Diminishing returns on raw conquest — the hedonic treadmill (see the
// lonely-punter canon). Each barfine / short-time buys 2 สนุก less than the last
// (G.jaded), floored at a real −4 penalty, so a binge night runs the ledger to
// zero and past it. jaded cools one notch a day (_endNight) and resets each
// vacation; presence, courtship, company and quests never touch it. AND a girl
// you've built a bond with (regular+, `id` passed) gives a +2 bonus and does NOT
// advance jaded — depth is the correct road, breadth is the treadmill.
function _conquestHappy(base, id) {
  // caught at your own rail tonight, the night does not pay (Callum, round 71: the betrayal netted +12)
  if (typeof _affairLive === "function" && G.affair && G.affair.caughtDay === G.day && id !== G.affair.id) {
    _say("(Whatever the night was meant to be, it isn't now. It pays nothing.)", "dim"); G.lastConquest = { night: G.day, net: 0 }; return;
  }
  // The affair's fidelity line: every conquest in the game funnels through here,
  // so ONE slip anywhere — a barfine, a freelancer, the booking app — while the
  // affair runs marks it. The soi always talks; she learns within days
  // (_affairNight), and the good ending is gone for good. Absolute by design:
  // this is the gate most players die on, and it should be.
  if (typeof _affairLive === "function" && _affairLive() && id !== G.affair.id &&
      G.affair.slipDay == null) {
    G.affair.slipDay = G.day;
  }
  // …and WHO it was, so the gossip that reaches her names a woman she can name back (László, round 73: soured by the
  // soi, Manow answered "ask Bert" to the name — the caught-in-person register only knew the women she saw)
  if (typeof _affairLive === "function" && _affairLive() && id && id !== G.affair.id && NPCS[id]) {
    const sw = (G.affair.slipWith = G.affair.slipWith || []); if (!sw.includes(NPCS[id].name)) sw.push(NPCS[id].name);
  }
  // The tier is read PRE-accrual when the barfine path stashed it: the honest-LT
  // bond pay (+3/+6) lands before _endNight runs this, so a standard 4-drink
  // courtship hit 4+3=7 = tier 2 and the treadmill NEVER engaged for the
  // binge-a-night pattern it exists to price (Gaz playtest, 2026-08-17).
  const tier = (id && id === G.lastBfId && G.lastBfPreTier != null)
    ? G.lastBfPreTier : (id ? _bondTier(id) : 0);
  G.lastBfPreTier = null;
  // THE BYPASS IS A NIGHT-TO-NIGHT REWARD, NOT A WITHIN-NIGHT ONE. "One
  // deepening girl stays rewarding while churn jades" means coming back to her
  // TOMORROW doesn't cheapen — it never meant the eleventh time this evening.
  // Un-scoped, it made the anti-churn design its own exploit: bonded ⇒ no
  // treadmill, her-farang ⇒ the fine waived, so BARFINE → SHORT TIME → repeat
  // paid +7 for ฿0 on a 9-turn loop, forever (Vikram, 2026-08-27: 439 สนุก vs a
  // stated summit of 100, one NPC spoken to). So the bypass — and the earned
  // bond that funded it — applies to the FIRST conquest with her each night;
  // after that the evening is repetition and the treadmill prices it as such.
  const first = !(id && G.soc.bfNight && G.soc.bfNight[id]);
  if (id) (G.soc.bfNight = G.soc.bfNight || {})[id] = (G.soc.bfNight[id] || 0) + 1;
  const bonded = id && tier >= 2 && first;
  const net = Math.max(base + (bonded ? 2 : 0) - 2 * G.jaded, -4);
  _addHappy(net); // _addHappy no-ops on 0, so a wash prints nothing
  G.lastConquest = { night: G.day, net, id };
  if (bonded) {
    _say("(No treadmill with her — a night with someone who knows you doesn't cheapen. " +
      "It's the one that keeps giving.)", "dim");
  } else if (id && !first && tier >= 2) {
    // she is still your regular; this is just the same evening going round again
    _say(_pickVary([
      "(Again, and she is fond about it, and something in the room has still gone flat. " +
        "It is the same night now, not a new one — that is what tomorrow is for.)",
      "(She goes along with it, easy as ever. But the evening has spent what it had; " +
        "you are repeating a thing rather than doing it.)",
    ], "bfrepeat"), "dim");
  } else if (net <= 0) {
    _say("(The thrill just… doesn't arrive. Another one, and you barely felt it — " +
      "you mostly want to be alone now. Too many, too fast.)", "alert");
  } else if (net < base) {
    _say("(Good. Not like the first, though — something's wearing thin at the edges.)", "dim");
  }
  if (!bonded) G.jaded++;
}

// Money-for-happiness (a lady drink, a big tip, the band's box) is the cheapest
// สนุก in the game and had no brake at all: ฿100 = +1, uncapped, so a ฿100k bank
// bought a thousand points against a goal of a hundred, and forty drinks at one
// rail hit สบายสบาย on day three (min-maxer playtest 2026-08-22). The conquest
// treadmill (_conquestHappy) never covered this line.
//
// The fix keeps a real night generous and kills the grind: the first few
// purchases of an evening pay in full, then the room stops being impressed.
// Presence, conversation, quests and the night ride are untouched — the slow
// road to สบายสบาย stays fully rewarding, which is the whole design.
// The bond ladder's matched brake, and the sibling of _boughtHappy below.
// Bond tiers are 3 / 7 / 13 (a face / a regular / her farang) and the ladder is
// meant to be climbed by TURNING UP: recognition, the kept seat, the waived
// fine and the night ride are what a woman gives someone who came back. Lady
// drinks were uncapped, so fourteen of them bought a total stranger the top of
// the ladder in fourteen in-game minutes — the tier-4 close-up, the deep-talk
// beat, the off-book barfine and the ride, from a woman met that turn (churner
// playtest 2026-08-23). The TIP site already carried this rule in its own
// comment ("money buys attention, not intimacy… the rest of the ladder is
// drinks, talk and turning up") and capped itself; drinks are the call site
// that rule never reached — the third time a class fix has landed on some of
// its sites and not all (see docs/playtest-findings-analysis.md §2.4).
//
// So: a night of buying can lift one woman a tier, not three. Purchased bond
// only — a short-time, an honest long-time, a rose she watched you buy and the
// ride's own stops all stay direct _addBond, because those are things that
// happened, not things you paid for.
const BOND_NIGHT_CAP = 6;
let _ledgerFor = null;   // whose ledger beat is rendering (a beat's arithmetic must be HER arithmetic)
function _boughtBond(id, n) {
  if (!id || !n || n < 0) return 0;
  const book = (G.soc.bondNight = G.soc.bondNight || {});
  const had = book[id] || 0;
  const grant = Math.max(0, Math.min(n, BOND_NIGHT_CAP - had));
  if (!grant) {
    // Say the wall out loud, once a night per girl. The cap is the load-bearing
    // "money can't rush this" rule — and it was invisible: fifty more drinks and
    // ฿7,500 went into a silent stop, every one printing its cheerful little
    // confirmation (Vikram, 2026-08-27). One line closes it, in her voice.
    const said = (G.soc.bondCapSaid = G.soc.bondCapSaid || {});
    if (!said[id] && NPCS[id]) {
      said[id] = true;
      _say(_pickVary([
        "(She takes it and she means the thank-you — but she is as warm as money gets tonight. " +
          "The rest of the way is time, not baht.)",
        "(Another one lands the same as the last. Whatever else she is going to think of you, " +
          "she is not going to think it tonight, and not because of a drink.)",
      ], "bondcap"), "dim");
    }
    return 0;
  }
  book[id] = had + grant;
  _addBond(id, grant);
  return grant;
}

// THE BREADTH TAPER ON CHARM — the free sibling of _boughtHappy, and it exists
// because the flirt payout became the entire economy. Measured (Yuki, round 33,
// 2026-09-01): 40 bells at ฿15,200 paid +39 สนุก, and five turns later in the
// same room five flirts paid +15 for ฿0 — ฿390/สนุก against ฿0/สนุก. The
// once-per-girl-per-night cap added in 2026-08-22 closed the per-TURN fountain
// and left the per-GIRL one open; with ~230 staff on the roster that converted
// an infinite tap into a very large finite one, still worth more than every
// priced source in the game combined. สบายสบาย on day 4 of 7, no money spent.
//
// The brake is on BREADTH specifically, not on charm — the doctrine is that
// presence and courtship stay rewarding while churn does not (the conquest
// treadmill exempts them for exactly that reason). So this counts DISTINCT
// girls charmed tonight: the first two pay in full, and working your way down
// the rail pays less with each new face. Going deep with one or two is
// untouched; farming a room of eight is worth about what two are.
function _charmHappy(n) {
  if (!n) return;
  const c = (G.soc.charmedN = (G.soc.charmedN || 0) + 1);
  _addHappy(Math.max(0, n - Math.max(0, c - 2)));
}
function _boughtHappy(n) {
  if (!n) return;
  const c = (G.soc.bought = (G.soc.bought || 0) + 1);
  if (c <= 6) return _addHappy(n);                        // an ordinary generous night: full value
  if (c === 7) _say("(Past six bought tonight, a drink stops paying you in สนุก every time — it still pays her.)", "dim");   // the silent taper (Marguerite, round 67)
  if (c <= 14) { if (c % 2 === 0) _addHappy(n); return; } // half rate
  if (c % 3 === 0) _addHappy(n);                          // a grind: a third, and it stays a third
}
function _addHappy(n, why) {
  if (!n) return;
  const before = _happyLevel(G.happy);
  const was = G.happy;
  G.happy = Math.max(0, G.happy + n);
  const moved = G.happy - was;   // "(-2 สนุก)" printed at zero while nothing moved (Marek, round 53)
  // `why` names the cause when the change would otherwise be a bare, unexplained
  // dock — e.g. the meter penalty firing on the same command as a game loss, so
  // two identical "(-1 สนุก)" lines don't read as a double-charge.
  if (moved) _say(`(${moved > 0 ? "+" : ""}${moved} สนุก${why ? " — " + why : ""})`, "dim");
  else if (n < 0) _say("(สนุก is already on the floor — it cannot go lower, only longer.)", "dim");
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

// THE NIGHT RUNS TO 06:00 (Mario, 2026-09-07). It ended at 04:00, which put every
// dawn line in the game two hours early — the all-nighter pools describe monks on
// alms round and pressure-washed pavement, and WATCH SUNRISE opened at 02:30 and
// narrated a school run. 120 turns at six minutes each is 18:00 → 06:00, which is
// when Pattaya actually hands over. Costs ~8 hunger and ~10 thirst on an idle
// night (measured), well inside the 100 redline. Every absolute nightTurn gate
// (midnight = 60, last bus = 80) keeps its meaning.
const NIGHT_TURNS = 120;

function _clockStr(turn) {
  const t = turn == null ? G.nightTurn : turn;
  const h = (18 + Math.floor(t / 10)) % 24;
  // six minutes a turn: "about half an hour to closing" and TIME saying 23:00
  // in the same breath was a man watching the clock being told the wrong one
  // (Stan, round 35)
  const m = (t % 10) * 6;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
const _OWN_BAR_RESCUE = [
  "You go down behind your own rail, and the last thing you hear is Bert saying \"right\" in the voice he uses for a keg. You wake in your own bed with your shoes off and lined up, your wallet on the nightstand with a Stinky Pinky beer mat on top of it, and a note in a hand you don't recognise: EAT SOMETHING. The floor got you home. The floor always gets the guv'nor home.",
  "The room tilts and the floor comes up, and then it's the mamasan's voice, very calm, and a taxi that smells of jasmine, and your own bed. Your pockets are exactly as you left them — you own the people who'd have turned them out. There is a bottle of water on the nightstand that wasn't there.",
  "You don't remember the taxi. Bert paid it, out of the till, and wrote it on the docket under the date like any other line — which is the only lecture you'll get. Your wallet is where a wallet should be. The girls know before you do that the guv'nor went down last night, and none of them will mention it, which is worse.",
];
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
  if (G.condoms > 0) {
    G.condoms--;
    // "drunk-you actually used it" is a claim about the meter; a sober LT gets the
    // other two (Tomasz, round 54: teetotal, and told drunk-him had done it)
    const pool = G.soc.drunk >= 3 && !(G.player && G.player.teetotal) ? _STD_SAFE : _STD_SAFE.filter(s => !/drunk-you/.test(s));
    _say(_pickVary(pool, "stdsafe"), "dim"); return;
  }
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
  roadhit: [
    "You surface under water-stained ceiling tiles with a leg in a cage of steel pins and the " +
      "taste of the road still in your mouth. Sukhumvit. On foot. The nurse who changes the " +
      "dressing says the word farang to a colleague in a tone you don't need translating: the " +
      "highway gets a few of you every year, and this year it got you and let you keep the leg.",
    "White light, a collarbone strapped, a headache with the shape of a pickup in it. The last " +
      "clear frame is eight lanes of sodium and a gap that wasn't. A policeman came, they tell " +
      "you, took no statement, and left; nobody is looking for the driver, because nobody ever is.",
    "You come to with gravel still being tweezered out of your back and a plaster cast drying on " +
      "an arm you don't remember putting out. The ward has seen this before. It has seen this " +
      "before THIS MONTH — the bed opposite is a Russian who tried the same crossing on Tuesday.",
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
  "Across the bay of curtained cubicles the night's other arrivals are still landing: a farang holding a bag of ice to his jaw and a receipt he keeps re-reading, a lad two chairs down who has taken his shoes off for no reason anyone can see.",
  "Two girls off a late shift sit either side of a third who is holding her wrist very still in her lap, the three of them sharing one bottle of water and nobody's phone, for once, lit.",
  "A man in the lab-test line is explaining to the woman beside him, at length and in English, that it is nothing, and she is agreeing with him in the voice people use for children.",
  "Along the wall an old European in a wheelchair has gone to sleep with his mouth open, and the Thai woman beside him — no younger — has her hand on his arm and her eyes on the number board, and has had them there for hours.",
  "A girl who was plainly dancing somewhere two hours ago sits with a cardigan over the costume and both hands flat on her stomach, listening to her friend count the weeks on her fingers, twice, and get a different answer.",
  "Two men in matching vests stand where a queue used to be, holding one paper number between them, with the faces of men who have been told to wait and not what for.",
];
const _HOSP_THESIS = [
  "Nobody is running this room. There is no mamasan, no number on a dress, no bell; a slip of paper from a machine decides the order, and the machine has never heard of any of you.",
  "It is the one address in this town where the money stops working at the door. Inside, the night has been taken off everyone like a coat, and what is left is a row of plastic chairs and a board that calls numbers.",
  "The trade is loud out there and simply absent in here. A farang, a dancer, a piwin and a grandmother hold the same kind of paper and wait for the same kind of voice, and for an hour the town has no sides.",
];
// …and the same queue for a man with no debts in it — she still says the word
const _HOSP_TOMORROW_CLEAN = [
  "And by the water cooler, a face from a bar you can't place: a girl who once told you the " +
    "whole story — the buffalo, the province, the bus home she was forever about to catch — and " +
    "never once asked you for a baht, which you now realise was the more expensive version. She " +
    "clocks you, smiles like you're an old joke she's fond of, and mouths one word across the " +
    "room: “Tomorrow.”",
  "And there, in the queue with everyone else, is one you half-know — a name from a rail, " +
    "attached to a story about family and a hometown bus. She meets your eye, unhurried, " +
    "entirely unbothered, and gives you the smile and the word this whole town runs on: " +
    "“Tomorrow.” The counter takes her number before it takes yours.",
  "And in the plastic chairs opposite, a girl who once cried you a river across a bar and was " +
    "laughing at the next table by the time you'd found a tissue. She sees you see her. She " +
    "raises her queue ticket an inch, like a toast. “Tomorrow.”",
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
  // the "money you'll never see" queue needs a debt to point at: a man who never
  // sent anybody a baht gets the version without one (Desmond, round 47)
  if (_rand() < 0.55) _say((G.sentTotal || 0) > 0
    ? _HOSP_TOMORROW[G.hospitalVisits % _HOSP_TOMORROW.length]
    : _HOSP_TOMORROW_CLEAN[G.hospitalVisits % _HOSP_TOMORROW_CLEAN.length]);
}

// ── The dawn coda: her last baht bus ─────────────────────────────────────────
// The game's title, made flesh. After a big-illusion night (a barfine) the camera
// occasionally leaves YOU — asleep, sure you conquered the city — and follows
// HER home at dawn: the night taken off piece by piece, the hard bench, the fare
// ready in her hand, the money put away for people this town never sees. A
// deliberate POV cutaway. Nameless — the archetype, not a person. (Rebuilt
// 2026-10-01 under docs/source-material-policy.md: pattern kept, every beat new.)
const _CODA_CUT = [
  "You are already asleep — face-down, victorious, certain you conquered the city. So you miss " +
    "this part. Across town the morning shift has started, and she is on it.",
  "You sleep the sleep of a man who won, and never see the other half of the night — the half " +
    "that belongs to her, and begins when yours is over.",
  "The last thing you registered was how untouchable she looked under the lights. You sleep. " +
    "She doesn't, not yet. The town is going from neon to daylight and she has to cross it.",
];
const _CODA_DECON = [
  "She doesn't scrub anything off. She has learned the night comes off on its own by eight. " +
    "What she does, on the pavement outside, is take the earrings out and put them in the " +
    "{{phone}} case, where the money is, and unpin the number from her dress.",
  "Out of the bag comes the day: a man's rain jacket over the dress, the heels into the bag " +
    "heel-first the way she has done it a thousand times, a hair tie off her wrist. Whoever " +
    "she was at the rail is folded up smaller than a towel.",
  "At a cart on the corner she buys the first iced coffee of the day and drinks half of it " +
    "standing up, with the market setting up around her, and nobody looks at her twice, " +
    "which is the point of the cart and the hour.",
];
const _CODA_HOME = [
  "Dawn on the main road, the sky the colour of a weak tea and the first trucks already " +
    "running. She swings up onto the bench of a baht bus with one other woman aboard, who is " +
    "also not talking, and sits where the metal is warm from the engine.",
  "The fare is ฿" + _num(BUS_FARE) + " and she has it ready before the truck stops, because having it " +
    // No biography here: this coda lands on ANY girl, and it used to give a
    // woman with her own authored canon a hospital bill and a kid "she sees
    // four times a year" that contradicted what she'd told him all week
    // (Howard, round 35). The image stays; the facts are hers to tell.
    "ready is the last thing tonight she can decide, and home is forty minutes off. The notes are already in the zip at the " +
    "back of the {{phone}} case. That money has an address, and it isn't hers.",
  "She presses the buzzer at a lane off the top of Pattaya Tai, drops the coin on the tray, " +
    "and walks the last of it home past a woman sweeping. A shared room; a cousin who works days, " +
    "so the one bed is always warm and never shared. Asleep by seven. The alarm is at three.",
];
const _CODA_CLOSE = [
  "The last baht bus was never yours. It is hers — going the other way, at dawn, with the " +
    "fare ready and the night folded up in a bag.",
  "You'll wake at noon sure you shared something. She was asleep by seven, and you are the " +
    "part of the night she will not mention to the cousin at three.",
  "That is the whole of the trick. The town lights her up for you and then switches her off " +
    "and sends her home on a bench, and only one of those two things costs money.",
];

function _cinderellaCoda() {
  _say(_CODA_CUT[G.codaSeen % _CODA_CUT.length], "dim");
  _say(_CODA_DECON[Math.floor(_rand() * _CODA_DECON.length)], "room");
  // she rode you home on her own bike; she is not climbing into a baht bus (Kenji, round 47)
  // the coda runs before the day turns, so the ride is TODAY's (Dieter, round 56: the bike
  // line never fired, and she caught a baht bus home after driving him all night)
  const _rode = !!(G.lastRide && G.lastRide.id === G.lastBfId && G.lastRide.day >= G.day - 1);
  _say(_rode
    ? "Dawn on the main road, the sky the colour of a weak tea. She kicks the bike awake, puts on the helmet " +
      "she did not wear all night because the police are up now, and is gone into the first traffic without " +
      "looking back. The receipt is her tail-light, then not even that."
    : _CODA_HOME[Math.floor(_rand() * _CODA_HOME.length)], "room");
  const _close = _rode ? _CODA_CLOSE.filter(l => !/baht bus/.test(l)) : _CODA_CLOSE;
  _say(_close[G.codaSeen % _close.length], "dim");
  G.codaSeen++;
}

// ── The debrief ─────────────────────────────────────────────────────────────
// A bad night ends in prose, and prose is deliberately not a rules explanation:
// you black out, you wake somewhere, and the meters that did it were never on
// screen. That is fine as fiction and useless as feedback — a player who cannot
// see WHY has no way to play differently tomorrow.
//
// So a bad ending gets a short mechanical debrief: what ended the night, the
// number behind it, and the one thing that prevents it. Register matters here.
// This is the GAME talking, like DIAGNOSE or the Act One fail screen — never a
// character. The house ethic is that nobody in the fiction warns you (the
// veteran-mirror doctrine, docs); a rules panel is not the fiction.
//
// Deliberately NOT pooled. Prose that repeats gets variants; information that
// repeats should read the same every time, or the player cannot tell whether
// something changed.
const _DEBRIEF = {
  collapse: () => ({
    what: G.thirst >= G.hunger ? "Thirst put you down." : "Hunger put you down.",
    why: "Hunger and thirst climb every turn and end the night at 100. " +
      "You hit " + Math.max(G.hunger, G.thirst) + ".",
    next: "Water is ฿10 at any 7-Eleven and drops thirst by 45 — the cheapest " +
      "insurance in the game. DIAGNOSE shows both meters any time.",
  }),
  blackout: () => ({
    what: "You drank past the point where the night keeps going.",
    why: "Every drink is one unit; nine ends the evening on the spot. " +
      "You do not get a warning at eight.",
    next: "You sober one unit per 20 turns, so pacing works. Water, food and " +
      "time between rounds all buy you drinks later.",
  }),
  hurt: () => ({
    what: "You took one knock too many and finished the night in hospital.",
    why: "Injuries stack; the third one ends the night wherever you are.",
    next: "Trouble comes from the same places twice — a soi dog in the dark, " +
      "a shakedown you argue with, a bar you have been thrown out of. " +
      "The flashlight and a polite wai are both cheaper than the third knock.",
  }),
  accident: () => ({
    what: "The motorbike found the one bit of gravel it was looking for.",
    why: "A motosai ride is the one RIDE in the game that can " +
      "hurt you, and drink makes it likelier.",
    next: "The baht bus is ฿" + _num(BUS_FARE) + " and cannot crash you. After two it goes " +
      "sparse rather than away — you wait at the kerb instead of riding straight off. " +
      "TIME tells you how thin they are running.",
  }),
  robbed: () => ({
    what: "You went with a freelancer and woke up lighter.",
    why: "No bar, no mamasan, no recourse — that is the whole trade-off of a " +
      "freelancer over a barfine, and it is the price when the roll goes badly.",
    next: "A bar girl comes with a bar behind her: if something goes wrong, " +
      "COMPLAIN to the mamasan actually works. The Metropole safe keeps your " +
      "valuables out of it either way.",
  }),
  // Two different lessons, and the newbie one used to go to a man who had named
  // his terms out loud (min-maxer playtest 2026-08-22). G.bfOpen records whether
  // money moved before a tier was said.
  bfscam: () => (G.bfOpen ? {
    what: "The barfine was a game, and you were the mark.",
    why: "Agreeing to terms you have not heard is the newbie mistake the soi is " +
      "built around — PAY or YES with no number said out loud is an open contract.",
    next: "Settle it before money moves: SHORT TIME or LONG TIME names the deal, " +
      "and TAO RAI asks the price. Afterwards, COMPLAIN at her bar is real recourse.",
  } : {
    what: "The barfine was a game, and you were the mark.",
    why: "You did it properly — terms named, price agreed, money after — and she ran " +
      "it anyway. Nothing you could have said would have stopped that one; correctness " +
      "on your side was never the whole of it.",
    next: "That is what the mamasan is FOR. COMPLAIN at her bar: a house that takes " +
      "the fine owns the problem, and bad girls are bad business.",
  }),
  // Dawn in your OWN ROOM is not a bad night — same reason code, opposite
  // outcome (see the `wouldRough` test below: being home exempts you). Saying
  // "you were still on the street" to a man who went to bed would be the exact
  // defect this file keeps catching elsewhere, so it returns nothing.
  dawn: () => (_flag("act1Done") && G.room === _hotelRoomId()) ? null : ({
    what: "The night will run out at dawn, wherever you are.",
    why: "A night is " + NIGHT_TURNS + " turns and ends at 06:00. STANDING at " +
      "dawn is legal — the all-nighter taxis you home in the light and bills " +
      "the morning instead (a heavier hangover, a slower start). PASSING OUT " +
      "first — blackout, collapse — is what costs you up to ฿" + _num(ROUGH_WAKE_CAP) +
      " of what you are carrying" +
      (G.dog ? " — unless a soi dog happens to be sitting on it." : "."),
    next: "SLEEP in your own room ends the night on your terms and keeps it. " +
      "The buses run all night but go sparse after two (TIME says) — flag one " +
      "and wait the kerb out, pay the piwin's night rate while he'll still have " +
      "you, or walk. The real cutoff is you: too drunk and the bikes refuse a " +
      "falling-off risk; too far gone and the night ends where you stand.",
  }),
};
_DEBRIEF.bfscam2 = _DEBRIEF.bfscam;

// ── The morning ledger ──────────────────────────────────────────────────────
// A BAD night has been legible since the WHAT HAPPENED debrief landed. A good
// one was not: you slept, the rent came off, the day divider printed, and
// nothing anywhere said what the night had actually been. Failure explained
// itself and success did not, which is backwards for a game trying to make you
// want another one.
//
// This is the joint between the two surfaces built alongside it — live leads
// answer "what do I do tonight", the collection denominators answer "what am I
// collecting", and neither answers "how did last night go, and what does that
// leave me". That is the moment a player decides whether to keep going.
//
// Everything here is a DELTA against a snapshot taken as the night ends, so it
// costs no new state beyond one small object.
function _nightSnapshot() {
  // The bar's own pocket draws (a losing night covered, the monthly bill) settle
  // AFTER this snapshot, so they'd otherwise land on the NEXT morning's "down ฿X
  // on the night" — a publican reading "down ฿290" the morning he handed over
  // ฿40k rent+note called the book a liar (Gordon, 2026-08-26). They belong to
  // the BAR ledger, not the night's personal spending, so track and exclude them.
  if (G.bar) { G.bar.pocketDrawn = 0; G.bar.pocketNight = 0; }
  G.lastNight = {
    vacation: G.vacation,   // a snapshot from a previous vacation reported "-108 สนุก" on the best night of the next (Frank, round 38)
    happy: G.happy,
    money: G.money,
    tillDrawn: (G.bar && G.bar.drawn) || 0,
    atm: G.atmTotal || 0,
    atmFees: G.atmFees || 0,
    bank: G.bank || 0, held: G.nontStuck || 0, bankIn: G.bankIn || 0,   // the account, Nont's overnight hold, and what ARRIVED (Marguerite, round 67; the money audit)
    loanB: G.loanBorrowed || 0, loanR: G.loanRepaid || 0, loanP: G.loanPrin || 0, nontP: G.nontPrin || 0,
    nontCut: G.nontCut || 0, nontOut: G.nontOut || 0,   // Nont's five percent and the notes he counted out (Clifford, round 68)
    spcB: G.massageSpend || 0, joinB: G.joinerPaid || 0, jobB: G.jobPaid || 0,
    nontB: G.nontBorrowed || 0, nontR: G.nontRepaid || 0, sentB: G.sentTotal || 0, skipR: G.skipRepaid || 0, polB: G.policePaid || 0, bookB: G.hotelDebt || 0,   // the bar's lender, and the banking app — both named on the ledger (Greta and Marcus, round 61)
    known: Object.keys(G.known || {}).length,
    talked: Object.keys(G.talked || {}).length + Object.keys(G.shopMet || {}).length,
    nums: Object.keys(G.phone.contacts || {}).filter(id => G.phone.contacts[id] && NPC_ROLES[id]).length,
    faces: new Set((_photoList() || []).map(p => p.id)).size,
  };
}

function _morningLedger() {
  const b = (G.lastNight && (G.lastNight.vacation == null || G.lastNight.vacation === G.vacation)) ? G.lastNight : null;   // a stamp-less snapshot is a pre-stamp save; deserializeGame drops those
  if (!b) {
    // The first morning has no baseline to diff against, and used to leave
    // lastNightSaid empty — so LAST NIGHT told a player who had just slept that he
    // hadn't (assertion auditor, 2026-09-14: a flat false negative, on the one
    // morning he was most likely to read it). Say what is true instead.
    G.lastNightSaid = ["(First morning in town — nothing to measure last night against yet. From tomorrow this is the night's ledger.)"];
    G.safeMoneyLedger = false;
    return;
  }
  G.lastNight = null;
  const bits = [];
  // the night's worst news first: LAST NIGHT after the bike crash read only the money
  // and the สนุก, and after the truck read "+12 สนุก" (Marek, round 53)
  const _lastEnd = (G.nightLog || []).slice(-1)[0];
  const _endReason = _lastEnd && typeof _lastEnd === "object" ? _lastEnd.reason : _lastEnd;
  const _ENDED = { accident: "the bike put you in the ward", roadhit: "the highway put you in the ward", hurt: "the ward, three strikes",
    blackout: "blacked out — the town put you somewhere", collapse: "collapsed and woke wherever you fell", robbed: "robbed", bfscam: "her game, not yours" };
  // down behind your own rail, the floor took you home: "woke wherever you fell" was
  // printed to a man who woke in his own bed (Rolf, round 55)
  if (_endReason && G.ownRescueDay === G.day && (_endReason === "collapse" || _endReason === "blackout")) bits.push("went down behind your own rail, and the floor took you home");
  else if (_endReason && G.partyRescued && (_endReason === "collapse" || _endReason === "blackout")) bits.push(`went down, and ${G.partyRescued} got you home`);
  else if (_endReason && _ENDED[_endReason]) bits.push(_ENDED[_endReason]);
  const dh = G.happy - b.happy;
  if (dh) bits.push((dh > 0 ? "+" : "") + dh + " \u0e2a\u0e19\u0e38\u0e01");
  const drawn = (G.atmTotal || 0) - (b.atm || 0); // ATM cash isn't "income" (27-night playtest: "up ฿18,880")
  const barDraw = (G.bar && G.bar.pocketDrawn) || 0; // the bar's own bills report on the bar's line, not here
  const fees = (G.atmFees || 0) - (b.atmFees || 0);   // ATM fees leave the account, not the pocket
  // a DRAW from your own till is your money moving pockets, not income: ฿10,000 out of
  // the drawer read "up ฿9,685 on the night" (Rolf, round 55)
  const tillDraw = Math.max(0, ((G.bar && G.bar.drawn) || 0) - (b.tillDrawn || 0));
  // borrowed money is a DEBT, not a good night: a ฿5,000 loan read "up ฿2,875 on the
  // night" to a man who had spent ฿2,125 (Malcolm, round 59). Repayment is a real spend,
  // but it is named, so the down figure is not a mystery.
  const borrowed = (G.loanBorrowed || 0) - (b.loanB != null ? b.loanB : (G.loanBorrowed || 0));
  const repaid = (G.loanRepaid || 0) - (b.loanR != null ? b.loanR : (G.loanRepaid || 0));
  // money that ARRIVED in the account — a quest reward, a gift by text — nets against the night,
  // and is named: "down ฿825" ignored Candy's ฿300 recce (Marguerite, round 67)
  const sentNight = (G.sentTotal || 0) - (b.sentB != null ? b.sentB : (G.sentTotal || 0));
  const received = b.bankIn != null ? (G.bankIn || 0) - b.bankIn : (b.bank != null ? Math.max(0, ((G.bank || 0) - b.bank) + drawn + fees + sentNight) : 0);
  // a loan is net on both sides: the principal is not income coming in, and paying it back is
  // not spending going out — only what is paid past the principal is (Clifford, round 68)
  const since = (k, now) => now - (b[k] != null ? b[k] : now);
  const nontBn = since("nontB", G.nontBorrowed || 0);
  const prinN = since("loanP", G.loanPrin || 0), nontPrinN = since("nontP", G.nontPrin || 0);
  const nontCutN = since("nontCut", G.nontCut || 0), nontOutN = since("nontOut", G.nontOut || 0);
  // the night is what left pocket, account and Nont's hold TOGETHER, less what is not spending:
  // a loan in, principal out, the till's money and the bar's own bills, and a send (named on
  // its own); an arrival nets in, and is named too (Marguerite, round 67). Inferring the arrival from the balance lost any
  // account spend without its own counter — the card paying the room (the money audit, A and B)
  const wealth = (m, k, h) => m + k + h;
  const spent = b.bankIn != null
    ? wealth(b.money, b.bank, b.held || 0) - wealth(G.money, G.bank || 0, G.nontStuck || 0) - sentNight + borrowed + nontBn - prinN - nontPrinN + tillDraw - barDraw
    : b.money + drawn - G.money - barDraw + fees + tillDraw + borrowed + nontBn - prinN - nontPrinN + nontCutN - received;
  // THE FIGURE IS POCKET AND ACCOUNT TOGETHER, and on a night the machine was used
  // it has to SAY so: the assertion auditor (2026-09-14) withdrew ฿2,000, paid ฿400
  // rent, watched his pocket go UP ฿1,600 and was told "down ฿700" — which is
  // right (rent plus the ฿300 fee, the draw not being income) and reads as a lie
  // to anybody watching the notes in his hand. The arithmetic was never wrong; the
  // sentence was unsupported by its own wording.
  const machine = drawn - nontOutN, _via = [];
  if (machine > 0) _via.push(`\u0e3f${_num(machine)} came out of the machine` + (fees > 0 ? `, \u0e3f${_num(fees)} of that in fees` : ""));
  if (nontOutN > 0) _via.push(`\u0e3f${_num(nontOutN)} through Nont, \u0e3f${_num(nontCutN)} his cut`);
  else if (nontCutN > 0) _via.push(`Nont's \u0e3f${_num(nontCutN)} cut, the rest held in his account overnight`);
  const via = _via.length ? ` (across pocket and account \u2014 ${_via.join("; ")})` : "";
  // The safe tag goes on the ledger that actually netted the money, which is the
  // NEXT ledger after it landed — keyed on the day it fired a morning late for a
  // man who slept the wallet night in his own room, because the safe pays at that
  // wake BEFORE the ledger runs (Tomasz and Joan, round 54)
  const safeIn = !!G.safeMoneyLedger; G.safeMoneyLedger = false;
  const walletIn = !!G.walletLedger; G.walletLedger = false;   // the wallet's ฿500 netted in unnamed (Terence, round 57)
  const safeTag = safeIn ? " (with the room safe's stash netted in)" : walletIn ? ` (with the wallet's ฿${_num(WALLET_CASH)} back in it)` : "";   // it was never Madam Oy's money (Rolf, round 55)
  if (spent > 0) bits.push("down \u0e3f" + _num(spent) + " on the night" + via + safeTag);   // Kenji, round 47: "down ฿1,747" on a ฿4,450 night
  else if (spent < 0) bits.push("up \u0e3f" + _num(-spent) + " on the night" + via + safeTag);
  if (tillDraw > 0) bits.push("\u0e3f" + _num(tillDraw) + " drawn from your own till");
  // …and the other direction: a till that went under took the owner's own money, and
  // "down ฿270" on those mornings left ฿1,478 unaccounted for (Kwame, round 60)
  const topUp = (G.bar && G.bar.pocketNight) || 0;   // only the till's shortfall — rent and the note stay on the bar's page
  if (topUp > 0) bits.push("\u0e3f" + _num(topUp) + " of your own money into the till when it went under");
  if (borrowed > 0) bits.push("\u0e3f" + _num(borrowed) + " borrowed from Nira \u2014 a debt, not a win");
  const polN = (G.policePaid || 0) - (b.polB != null ? b.polB : (G.policePaid || 0));
  if (polN > 0) bits.push("\u0e3f" + _num(polN) + " of it to the police");   // a fine was lumped into "down" (Gordie, round 72)
  const spcN = (G.massageSpend || 0) - (b.spcB != null ? b.spcB : (G.massageSpend || 0));   // the specials and the joiner fee were in "down" and nowhere else (László, round 73)
  if (spcN > 0) bits.push("\u0e3f" + _num(spcN) + " of it on the massage table");
  const jobN = (G.jobPaid || 0) - (b.jobB != null ? b.jobB : (G.jobPaid || 0));   // a job's money, in cash, named (Vince, round 74: "up ฿3,100" for ฿4,000 of fees)
  if (jobN > 0) bits.push("\u0e3f" + _num(jobN) + " paid to you for a job");
  const joinN = (G.joinerPaid || 0) - (b.joinB != null ? b.joinB : (G.joinerPaid || 0));
  if (joinN > 0) bits.push("\u0e3f" + _num(joinN) + " the joiner fee at the desk");
  const bookN = (G.hotelDebt || 0) - (b.bookB != null ? b.bookB : (G.hotelDebt || 0));
  if (bookN > 0) bits.push("\u0e3f" + _num(bookN) + " more on the hotel book (\u0e3f" + _num(G.hotelDebt) + " in all)");
  const skipR = (G.skipRepaid || 0) - (b.skipR != null ? b.skipR : (G.skipRepaid || 0));
  if (skipR > 0) bits.push("\u0e3f" + _num(skipR) + " to Nira against the loan you flew home with");
  if (repaid > 0) bits.push("\u0e3f" + _num(repaid) + " repaid to Nira" + (repaid - prinN > 0 ? ` (\u0e3f${_num(repaid - prinN)} of it interest)` : ""));
  const nontB = (G.nontBorrowed || 0) - (b.nontB != null ? b.nontB : (G.nontBorrowed || 0));
  const nontR = (G.nontRepaid || 0) - (b.nontR != null ? b.nontR : (G.nontRepaid || 0));
  if (nontB > 0) bits.push("\u0e3f" + _num(nontB) + " borrowed from Nont for the bar \u2014 a debt, not a win");
  if (nontR > 0) bits.push("\u0e3f" + _num(nontR) + " repaid to Nont" + (nontR - nontPrinN > 0 ? ` (\u0e3f${_num(nontR - nontPrinN)} of it interest)` : ""));
  // a SEND leaves the account, which "pocket and account together" has to show — ฿1,500 to
  // a woman was invisible on the one figure a man keeping books reads (Marcus, round 61)
  const sentN = (G.sentTotal || 0) - (b.sentB != null ? b.sentB : (G.sentTotal || 0));
  if (sentN > 0) bits.push("\u0e3f" + _num(sentN) + " sent from the account through the banking app");
  // "down ฿111 · ฿2,111 of it lifted" — a bigger theft than the night's spend is not "of it" (Des, round 41)
  if (G.roughLost > 0) bits.push("\u0e3f" + _num(G.roughLost) + (spent > 0 && G.roughLost <= spent ? " of it lifted while you were out" : " lifted while you were out"));
  const _metNow = Object.keys(G.talked || {}).length + Object.keys(G.shopMet || {}).length;
  const dk = _metNow - (b.talked != null ? b.talked : _metNow);
  if (dk > 0) bits.push("met " + dk);
  const dn = Object.keys(G.phone.contacts || {}).filter(id => G.phone.contacts[id] && NPC_ROLES[id]).length - b.nums;
  if (dn > 0) bits.push(dn + " new number" + (dn > 1 ? "s" : ""));
  const df = new Set((_photoList() || []).map(p => p.id)).size - b.faces;
  if (df > 0) bits.push(df + " new face" + (df > 1 ? "s" : "") + " in the gallery");

  // THE MORNING LEDGER IS ONE FRAME, AND IT CARRIES THE NIGHT'S WORST NEWS (Stuart,
  // round 47): black out, get your pockets emptied, close the app because you are not
  // proud of yourself, come back — and ฿1,181 is gone with the game saying nothing. Keep
  // what was said so LAST NIGHT can say it again.
  if (received > 0) bits.push(`฿${_num(received)} arrived in the account`);
  if (G.bruise && G.bruise.day === G.day - 1) { bits.push("nursing " + G.bruise.what); G.bruise = null; }
  if (G.lastNightWas && G.lastNightWas.day === G.day - 1 && G.lastNightWas.kicked)
    bits.push(`walked out of ${G.lastNightWas.kicked.where} by security${G.lastNightWas.kicked.n > 1 ? ", twice" : ""} — the night's bad news, and the สนุก it cost`);
  G.partyRescued = null;
  G.lastNightSaid = [
    bits.length ? "Last night: " + bits.join(" \u00b7 ")
      : "(A quiet one. It happens, and the week is long enough to carry a few.)",
    _fmt("\u0e2a\u0e19\u0e38\u0e01 {h} \u2014 {label}{left}",
      { h: G.happy, label: _happyLevel(G.happy),
        left: G.stage === "expat" ? "" : " \u00b7 " + (8 - G.day) + " night" + (8 - G.day === 1 ? "" : "s") + " left" }),
  ];
  for (const l of G.lastNightSaid) _say(l, "dim");
}

function _nightDebrief(reason) {
  const make = _DEBRIEF[reason];
  if (!make) return;                       // sleep, barfine — those went fine
  const d = make();
  if (!d) return;                          // the reason fired, but it went fine
  _say("── WHAT HAPPENED ──", "alert");
  _say(d.what, "alert");
  _say(d.why, "dim");
  _say("Next time: " + d.next, "dim");
}

const _SCAM_RUNNER = [
  gn => "Dinner is lovely. She is lovely. Then, over the last of the khao " +
    `man gai, her phone lights up and ${gn}'s whole face changes: “Mama! ` +
    "Emergency! My friend—” The story arrives pre-assembled and she with " +
    "it, already standing, already sorry, already gone. Much later you " +
    "hear — the soi always tells you eventually — that she was back on " +
    "her stool inside the hour. Or maybe it was Beach Road.",
  gn => `${gn} is warm all the way to the room door, and then the phone rings — ` +
    "it always rings — and it is always the sister, the landlord, the baby, the " +
    "bike. “Five minute, tilac, I come back, promise promise.” The five minutes " +
    "are the last you will see of her. The taxi she takes is one you paid for.",
  gn => "Somewhere between the second beer and the key card, the emergency lands: " +
    `${gn} reads the screen, stricken, and is already gathering her things. It is ` +
    "flawless work — you find yourself comforting HER on the way out — and it is " +
    "only on the walk home, alone, that the timing starts to look rehearsed. It was.",
  gn => `${gn} excuses herself to the bathroom with her handbag, which is the tell ` +
    "you will learn to read by next trip. A polite wait, then a longer one, then the " +
    "cashier's careful non-eye-contact that tells you the bathroom has a second door " +
    "and she has known where it is for years.",
];
const _SCAM_MAO = [
  gn => `${gn} matches you drink for drink all night, glorious company, ` +
    "right up until the room door closes and she becomes, instantly and " +
    "completely, the drunkest woman in Thailand. “Mao mak mak, tilac. " +
    "Cannot boom boom.” She is asleep in seconds, diagonal, snoring " +
    "delicately. At dawn she is gone with the light, fresh as laundry.",
  gn => `The moment the door shuts, ${gn}'s careful sway becomes a full list to ` +
    "port. “So sleepy, tilac, sorry sorry.” She is horizontal and unconscious " +
    "before you have your shoes off, a masterclass in a woman who has done this " +
    "exactly as many times as it took to perfect. You sleep beside a stranger and " +
    "wake beside nobody.",
  gn => `${gn} orders one more “for the room” on the way up and drinks yours too, ` +
    "and by the time the aircon kicks in she is a dead weight of giggles and then " +
    "just dead weight. “Tomorrow, na. Tomorrow for sure.” Tomorrow does not, in the " +
    "event, come.",
];
const _SCAM_LEAVE = [
  gn => "The main event is everything advertised. Then, before the ceiling " +
    `fan has finished its applause, ${gn} is up, dressed, and kissing ` +
    "your cheek: “I go back bar, na? Mama need me.” Some men mind. " +
    "Standing in the doorway watching her go, you decide — mostly — not " +
    "to be one of them.",
  gn => `Afterward ${gn} is already reaching for her dress, phone in the other ` +
    "hand, thumbs going. “Busy night, tilac — mama text me twice.” A kiss aimed " +
    "roughly at your cheek and she is gone before the tab has cooled, back to the " +
    "rail where the night is still selling.",
  gn => `${gn} stays exactly as long as the arithmetic requires and not one minute ` +
    "more — a warm, brisk, entirely professional goodbye, and the door clicks, and " +
    "the room is suddenly very quiet and very much yours alone. You paid for the " +
    "long time. You got the short one. Nobody lied; nobody quite told the truth either.",
];

// Dawn on your feet: the whole arc — and then the taxi home in the light.
// dawn at the bar you OWN: nobody carries you home, you put the stools up
const _ALLNIGHTER_OWN = [
  "06:00 and the last customer is a man asleep with his cheek on the rail. You wake him kindly, put the stools up, count the float twice because your eyes have stopped agreeing with each other, and pull the shutter down on your own bar. The bike home is the longest ten minutes in Pattaya.",
  "Dawn comes in under the shutter you never quite closed. The girls are gone, the ice has been water for an hour, and the till is right, which is the only thing about the night that is. You lock your own door from the outside and go home in the light.",
  "The sweepers are working Beach Road when you finally kill the lights. There is a particular quiet in an empty bar that is yours — the fans ticking down, a glass nobody claimed — and you stand in it for a minute before you lock up and let a piwin take you to bed.",
  "You close your own bar at six in the morning, which is not a thing a customer ever has to do. Chairs up. Float in the bag. Shutter, padlock, the key that sticks. The street is pink and completely uninterested in how hard the night was.",
];
const _ALLNIGHTER_LINES = [
  "The music finally stops and the room is suddenly a room: strip lights, wet floor, chairs. The club empties into the soft light, the street sweepers work around the wreckage, and a taxi with its windows down carries you home through a town changing shifts — night people going to bed, monks already walking. You did the whole night. All of it.",
  "06:00 arrives and finds you still standing, which at this point feels like a citation for valour. You share a taxi with two strangers and a man asleep in a party hat, watch the neon give up section by section, and let yourself in as the breakfast carts light their first burners. The bed takes you like an old friend.",
  "Dawn. The music stops being music and becomes memory; the lights come up on faces that have all earned the morning. You walk out into pink light and pressure-washed pavement, flag the first songthaew of the DAY shift, and ride home with the wind doing what it can for you. The night is over because it ran out of night.",
  "You close the place. Not a figure of speech — a woman in rubber gloves is stacking stools around you when you finally surface, and outside the sky is the colour of the inside of a shell. The ride home smells of jasmine from somewhere and last night from you. Worth it. Ask again at noon.",
];
// dawn inside somewhere that isn't a bar — an office, a motel counter (Owen, round 46: "still upright on the soi" printed in a windowless office)
// You waited for it on purpose and then went home. The night ends on the sky,
// not on your legs (Mario, 2026-09-07: "watching the sunrise should end the night").
const _SUNRISE_END = [
  "You watch it all the way up, which takes longer than anybody expects and is over faster " +
    "than it looks. Then the light is just daylight, the town is just a town, and there is nothing " +
    "left to stay for. You get a bike home with the sun on the back of your neck.",
  "The sky finishes what it was doing. Somewhere behind you a shutter goes up, and a woman " +
    "starts frying something for people who have slept. You are not one of them, and you have never " +
    "minded less. Home, unhurried, in the light.",
  "It comes up behind the town the way it always does — over the hills, over Sukhumvit, over the " +
    "traffic — and lands on the water last of all. You stay until it does. Then you go to bed like " +
    "a man who has finished something.",
]
;
const _ALLNIGHTER_INDOORS = [
  "The light changes under the door before anything else does, and you are, somehow, still upright to notice it. Outside, the sweepers; in here, the fluorescent tube that has been the whole night's sky.",
  "Dawn arrives as a strip of grey under the door and a change in the traffic note. You have been indoors for all of it and you can feel every hour in your back.",
  "The air-con clicks off on its timer and that is how you know it is morning. You get up. Nothing in here has moved but you.",
];
const _ALLNIGHTER_STREET = [
  "The sky goes grey over the soi and you are, somehow, still upright on it. The sweepers work round you; a noodle cart is setting up where a bar's tables were an hour ago. A taxi with two strangers in it slows, and the driver waves you in for the price of the light, which this once is nothing.",
  "06:00 finds you on the pavement, which at this point counts as an achievement. The shutters are down the length of the street and the first monks are out. You share a taxi home with a man who says nothing and a woman who says everything.",
  "Dawn on the kerb. The neon has been off long enough that you'd forgotten the street had a colour. A songthaew with three sleeping girls in the back takes you most of the way for the day rate, and the driver does not ask.",
];
// ANY PLAYER CHOICE THAT ENDS THE NIGHT ASKS ONCE (Mario, 2026-10-07 — Darren typed a
// label and the night went with it; the early-sleep confirm was the only one). The first
// time prints what goes with the night and arms G.endWarn for the NEXT command only; the
// same choice typed again inside that window goes through. Returns true to proceed. The
// modals (LONG TIME, the encounters' YES, Cream's GO, Sao's car) carry the warning in
// their own prompt instead — a modal is already a question — and LONG TIME asks twice.
function _endConfirm(kind, text) {
  const w = G.endWarn;
  if (w && w.kind === kind && w.day === G.day && G.turns - w.turn <= 1) { G.endWarn = null; return true; }
  G.endWarn = { kind, day: G.day, turn: G.turns };
  _say(text, "dim");
  return false;
}
const _JOINER_LINES = [
  "(Under the Sabai Palms' one working porch light, the night clerk produces the joiner ledger: ฿{f}, and a look with footnotes.)",
  "(The night clerk doesn't ask who she is. The joiner ledger has one column, and it says ฿{f}.)",
  "(The Sabai's desk: the joiner book slides across without the clerk looking up — ฿{f}, her ID, your room number. He has never once asked anybody what they do for a living.)",
];
// any woman who goes up to your room at the Sabai, once a night — the clerk charges the guest, not the trade
function _joinerFee(night = G.day) {   // the NIGHT she came up: a fee charged at the next wake stamped the new day and let that night's guest in free (Ossie, round 70)
  if (!_flag("act1Done") || G.stage === "act1" || G.hotel !== "sabai") return;
  if (G.joinerDay === night) return;
  if (G.money < JOINER_FEE) {   // broke, it goes on the book like the room does — not waved through (Gordie, round 72)
    G.joinerDay = night; G.hotelDebt = (G.hotelDebt || 0) + JOINER_FEE;
    _say(_fmt("(The night clerk writes the joiner fee in the book instead — ฿{f}, on top of whatever else is in there. ฿{d} on the book now.)", { f: _num(JOINER_FEE), d: _num(G.hotelDebt) }), "dim");
    return;
  }
  G.joinerDay = night; G.money -= JOINER_FEE; G.joinerPaid = (G.joinerPaid || 0) + JOINER_FEE;   // named on the morning ledger (László, round 73)
  _say(_fmt(_pickVary(_JOINER_LINES, "joiner"), { f: JOINER_FEE }), "dim");
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
  G.roughLost = 0;   // per-night: last night's mugging doesn't haunt tonight's ledger
  // The all-nighter (design call 2026-08-25): the classic arc — pub, go-go,
  // a WS club, dawn — is the town's most ordinary big night, and the game
  // filed it as a mugging. A man still STANDING when the sky goes grey didn't
  // pass out; he stayed out. He shares a taxi home in the morning light and
  // pays in BODY, not baht. The rough wake still belongs to blackout and
  // collapse — the states that actually mean unconsciousness — and Act One's
  // dawn stays a hard fail below (that night IS a race). One rename here makes
  // every downstream rough-wake site correct without touching them.
  if (reason === "dawn" && _flag("act1Done") && G.room !== _hotelRoomId()) reason = "allnighter";
  // SLEEP with company IS the long-time ending — taking her home was the whole
  // point of taking her out, and the close pays for the evening she spent on
  // your arm (stops feed the base, the pair adds its premium).
  let _bedIds = null;   // who was in the bed when SLEEP converted to the LT close (read by the affair's morning)
  if (reason === "sleep" && G.party && G.party.ids && G.party.ids.length === 1 && typeof _affairLive === "function" && _affairLive() && G.party.ids[0] === G.affair.id) {
    // THE NIGHT OUT ENDS AT HOME, NOT IN A BARFINE: the long-time close paid +10 as a conquest,
    // which made the night out the always-right answer (Callum, round 71). She comes home with you;
    // the morning knows she was there.
    _bedIds = G.party.ids.slice();
    G.affair.homeDay = G.day; G.affair.together = G.day;
    _addHappy(Math.min(3, 1 + Math.floor((G.party.stops || 0) / 2)));   // company, never the treadmill
    _say(_fmt("You come home together, {n} with her shoes in her hand and nothing to count for once. The last of the night is nobody's business.", { n: _affairHer() }), "win");
    G.party = null;
  }
  if (reason === "sleep" && G.party && G.party.ids && G.party.ids.length) {
    const _pids = G.party.ids; _bedIds = _pids.slice();
    G.lastBfId = _pids[0];
    G.lastBfHonest = false;   // the fun close: khao man gai at 3 a.m., fondly
    G.lastBfBase = Math.min(14, 10 + Math.floor(G.party.stops / 2) + (_pids.length > 1 ? 2 : 0));
    G.lastBfPreTier = _bondTier(_pids[0]);   // read her tier BEFORE the close's bond, as the barfine path does: a one-night companion was told "someone who knows you" (Ossie, round 70)
    for (const _pid of _pids) _addBond(_pid, 3);
    _say(_fmt(_pids.length > 1
      ? "The three of you fall through your door somewhere past the point of counting, still laughing at a thing none of you can remember. {who} claim the shower in shifts and the bed by consensus, and the night finishes the way the best ones do — off the clock, off the books, unhurried."
      : (_isHotelRoom(G.room) && G.party.stops === 0
        ? "{who} kicks off her shoes by the door as if she has always kicked them off there. The last of the night is nobody's business and unhurried about being so."
        : "You bring {who} home the long way, through a town that has watched the two of you all evening and approves. The door closes on the last of the night, and what's left of it is nobody's business and unhurried about being so."),
      { who: _partyLabel() }), "win");
    G.party = null;
    reason = "barfine";
  }
  // what the town could have SEEN of your night — the stool you sat longest on, who you left
  // with, how it ended — for LAST NIGHT asked of a witness the morning after (class N, 2026-10-07:
  // Desmond asked three people about everything that happened to him and nobody could say)
  {
    const _bt = G.soc && G.soc.barTurns ? Object.entries(G.soc.barTurns).sort((a, b) => b[1] - a[1])[0] : null;
    G.lastNightWas = { day: G.day, reason, bar: _bt ? _bt[0] : null, barTurns: _bt ? _bt[1] : 0, leftFrom: G.soc.leftFrom || null,
      with: (_bedIds && _bedIds[0]) || G.lastBfId || null, endRoom: G.room, kicked: G.kickedTonight || null };
    G.kickedTonight = null;
  }
  if (!_flag("act1Done") && ["dawn", "collapse", "blackout", "hurt", "accident", "roadhit"].includes(reason)) {
    _act1Fail(reason);
    return;
  }
  // Anything still in flight ends WITH THE NIGHT, and says so. These three were
  // dropped silently: a live Connect 4's escrowed stake vanished with no
  // concession line and no refund, and G.encPrompt was left holding a dead
  // shakedown's prompt lines into the next day, where a restore would redraw
  // them (stress-test playtest 2026-08-23). _abandonGame keeps the stake — the
  // house rule for a frame you walked out on — but announces it.
  if (G.game && typeof _abandonGame === "function") _abandonGame("The night ran out mid-frame");
  G.game = null;
  // An encounter prompt issued on the night's last turn used to print and
  // then silently cease to exist — a ฿2,500 STAY-or-SEND was shown and the
  // decision evaporated between two lines of the same command (Gerry, round
  // 34). The night may take the choice with it, but it says so now. Only the
  // clock/body endings — the scripted endings (barfine, scams, the ride)
  // manage their own encounter state and must not collect a stray aside.
  if (G.pendingEnc && /^(dawn|allnighter|collapse|blackout|hurt)$/.test(reason)) {
    _say("(Whatever was on offer goes with the night — that door closes unanswered, " +
      "and owes you nothing.)", "dim");
  }
  G.pendingEnc = null;
  // the soapy's laminated menu and a barfine still on the table do not follow you
  // into the morning: SOAPY typed on the last turn of a night left its menu pending
  // in your own hotel bed, swallowing the day's first command (the soak's
  // night-boundary invariant, 2026-09-27 — the first class-A catch it made)
  G.pendingSoapy = null; G.pendingBf = null;
  // a saleng parked at a bar does not sit there through the dawn — it was still at
  // Tequila Queen at 06:00 for a man who woke on Beach Road (the soak's night-boundary
  // invariant, its second catch, 2026-09-27)
  G.salengCart = null; G.salengRoom = null; G.salengUntil = 0;
  G.encPrompt = null;
  G.pendingFare = null;
  // the week's spine, one entry per night — what the share card renders.
  // Capped so an endless expat run can't grow the save without bound.
  if ((G.nightLog = G.nightLog || []).length < 30) G.nightLog.push(reason);
  let _herDawn = false;
  if (reason === "allnighter" && typeof _partyNightEnd === "function" &&
      G.party && G.party.ids && G.party.ids.length) {
    _partyNightEnd(reason);   // she finds you the taxi BEFORE the morning takes it
    _herDawn = true;          // …and one dawn is enough: the generic sky printed after hers (Jacko, round 42)
  }
  switch (reason) {
    case "dawn":
      // NO HOUR IN THIS LINE. It said 04:00 for the game's whole life and kept
      // saying it after the night was lengthened to 06:00 (2026-09-07) — the
      // clock moved and the prose didn't, which is the whole of class K. The sky
      // is the time; nothing here needs a number.
      _say("The sky over the gulf goes grey, then pink, and even Pattaya blinks. " +
        "The last bars stack their stools; the baht buses carry home the " +
        "wreckage; somewhere a rooster who fears nothing starts up. You drift " +
        "back and let the day take you.", "room");
      break;
    case "sunrise":
      // You stayed out for it deliberately, which is the difference: the all-nighter
      // is what happens to you, this is what you did. Same body cost, more สนุก.
      { let _l = _pickVary(_SUNRISE_END, "sunriseEnd");   // "you get a bike home" charged nothing (Marguerite, round 67)
        if (/\bbike\b/.test(_l) && G.money < MOTOSAI_TOWN) _l = _pickVary(_SUNRISE_END.filter(x => !/\bbike\b/.test(x)), "sunriseEnd");
        if (/\bbike\b/.test(_l)) { G.money -= MOTOSAI_TOWN; _l += ` (฿${_num(MOTOSAI_TOWN)} for the bike — ฿${_num(G.money)} left.)`; }
        _say(_l, "win"); }
      _addHappy(3);
      break;
    case "allnighter":
      // A bolted lock-in has its own dawn: the generic line had "the club
      // empties into the soft light" for a man sealed behind a padded door in
      // a bar with painted-out windows (Gerry, round 34). The bolt goes back
      // first, and the street is a surprise when it arrives.
      if (G.soc.lockIn && G.soc.lockIn[G.room]) {
        _say("Somebody works the bolt back — that same flat sound, running the other " +
          "way — and the door comes open on a morning nobody in here had budgeted for. " +
          "The black paint on the windows had been doing its job all night. You step out " +
          "into a Darkside dawn: dogs, roosters, one motorbike, and a sky already too " +
          "bright, and behind you the stools go up as if none of it happened.", "win");
      } else if (!_herDawn) {
        // the guv'nor does not "share a taxi with two strangers" out of his own bar;
        // he locks up (Rolf, round 54)
        _say(_pickVary(typeof _atOwnBar === "function" && _atOwnBar() ? _ALLNIGHTER_OWN : _inBar() ? _ALLNIGHTER_LINES : (_underRoof(G.room) ? _ALLNIGHTER_INDOORS : _ALLNIGHTER_STREET), typeof _atOwnBar === "function" && _atOwnBar() ? "allnighterown" : _inBar() ? "allnighter" : (_underRoof(G.room) ? "allnighterin" : "allnighterst")), "win");
      }
      if (!_herDawn) _addHappy(2); // the big night out is a WIN — the invoice is the morning (her goodbye paid its own)
      break;
    case "collapse":
      // behind your own rail the floor's rescue tells it (below); the street version
      // printed first and put a piwin and Bert on the same taxi (Rolf, round 55)
      if (typeof _atOwnBar === "function" && _atOwnBar()) { _addHappy(-8); break; }
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
    case "roadhit":
      _hospitalMorning("roadhit");  // the highway, on foot — the ward, insurance, no bill
      _addHappy(-8);
      G.crashInjury = true;         // a pickup is not milder than a scooter: wake banged up, same as the bike (Marek, round 53)
      break;
    case "accident":
      _hospitalMorning("accident"); // a road accident — the ward, insurance, no bill
      _addHappy(-8);
      G.crashInjury = true; // wake tomorrow banged up (applied after the new-day reset)
      break;
    case "cham":
      _say("The rest happens in a hotel room like any other, and is unlike anything, and " +
        "you know even while it's happening that you'll never be able to say which. She " +
        "falls asleep with her phone under the pillow. You lie there a long time feeling " +
        "like a man who has won something nobody else in this town even knew was on " +
        "offer.", "win");
      _joinerFee();   // the clerk cannot tell a pharmacist from a bar girl
      break;
    case "bkkdinner":
      _say("The van brings you back at one in the morning through a town that has been " +
        "loud without you. Boy says goodnight in English. You reach for your wallet out of habit, and he is " +
        "already shaking his head, with the exact expression his employer used on the bill.", "dim");
      break;
    case "barfine":
      _say(G.lastBfHonest
        ? "The rest is quieter than the night you paid for: the fan, her breathing, the " +
          "street going on without you. What happens in Pattaya has already forgotten your " +
          "name by morning — not unkindly."
        : "The rest is nobody's business but the soi's: a shared plate of khao " +
          "man gai at 3 a.m., the beach road with nobody on it, laughing at " +
          "nothing. What happens in Pattaya has already forgotten your name by " +
          "morning, fondly.", "win");
      G.lastBfHonest = false;
      _joinerFee();
      _stdBarfineRoll();   // protection used if carried; else the night may keep a secret
      _conquestHappy(G.lastBfBase || 10, G.lastBfId); // reality-LT sets a lower base
      if (_flag("act1Done") && _rand() < 0.35 && !(G.affair && G.affair.id === G.lastBfId)) _cinderellaCoda(); // her 6 a.m., occasionally — not your own girl's, who went home with you
      break;
    case "bfscam": {
      // an operator ran her game on your long time — the veterans warned you.
      // G.bfIncident.kind carries which one; COMPLAIN at her bar for recourse.
      const inc = G.bfIncident || { kind: "runner", room: G.room, id: null };
      const gn = inc.id ? NPCS[inc.id].name : "She";
      if (inc.kind === "runner") {
        _say(_pickVary(_SCAM_RUNNER, "scamRunner")(gn), "alert");
        _addHappy(2);
      } else if (inc.kind === "mao") {
        _say(_pickVary(_SCAM_MAO, "scamMao")(gn), "alert");
        _addHappy(3);
      } else { // leaveAfter
        _say(_pickVary(_SCAM_LEAVE, "scamLeave")(gn), "dim");
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
        (lost ? `฿${_num(lost)} gone` : "Nothing left worth taking") +
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
  // The debrief goes HERE — after the ending's own prose, before the morning —
  // so it is the first thing in a long night-end rather than the last, and the
  // wall-anchored scroll (term.js) lands the player on it.
  _nightDebrief(reason);
  // A TITLE HELD BY A MAN WHO DOES NOT TURN UP IS NOT HELD. Bert's own line is
  // "defend it next league night, or don't — champions get to be busy", so not
  // showing has to cost the thing: on a league night at a bar where your name is
  // behind the till, somebody else plays for it, and if you were not there they
  // win it. Run BEFORE G.day++, because tonight is the night just played.
  _kpTitleTick();
  G.day++;
  G.jaded = Math.max(0, G.jaded - 1); // a day cools the treadmill one notch
  // a visit from Prachuap ends at its week: the bus home, and the ending's gate again
  if (G.visitUntil && G.day >= G.visitUntil) { _morningLedger(); _nightSnapshot(); _visitHome(); return; }
  if (G.stage !== "expat" && G.day > 7) {
    // The last night of the week used to be strictly free: this return sits
    // ABOVE the rough-wake block, so the debrief printed "not making it home
    // costs you the cash in your pocket" and then the vacation ended with every
    // baht intact — making it optimal to blow the bankroll and pass out in the
    // road on night seven (stress-test playtest 2026-08-23). The town doesn't
    // check your flight date. Rent, the respawn and the loan roll are correctly
    // skipped — you are not waking up here tomorrow — but the pockets go.
    const _lastRough = (reason === "dawn" || reason === "collapse" || reason === "blackout") &&
      !(_flag("act1Done") && G.room === _hotelRoomId()) && _dogEgg() !== "rescue" && !G.dog &&
      !(G.party && G.party.ids && G.party.ids.length) && !(typeof _atOwnBar === "function" && _atOwnBar());
    if (_lastRough && G.money > 0) {
      G.roughLost = Math.min(G.money, ROUGH_WAKE_CAP);
      G.money -= G.roughLost;
      _say(`(Pockets turned out on the last night of the week — ฿${_num(G.roughLost)} ` +
        "gone. The town has no idea you had a flight, and would not have cared.)", "dim");
    }
    // Cream's night was the last one: her morning happens here or never — it rode the
    // flight home and fired a month later, after he slept alone (Dieter, round 56)
    if (G.chamNight) {
      G.chamNight = false;
      _say("She is gone before you are properly awake — a bun, a bag, the door closing softly, " +
        "\"bus ten to eight\" said to the room. There is a coffee on the side table she must have " +
        "gone down for. She asked for nothing, and there is no morning left to offer her anything in.", "room");
    }
    // the last night of the week still gets its ledger, and the next morning
    // does not net two nights into one (Kenji, round 47)
    _morningLedger();
    _nightSnapshot();
    _endVacation();
    return;
  }
  // capture BEFORE the goodbye clears it: the rescue decision below reads this.
  // (The dawn goodbye printed ABOVE the switch already — see the pre-switch
  // hook — so at first light she pours you into the taxi before the wake
  // narration takes it home; the rescue reads the other way round, after the
  // film stops.)
  const _hadParty = !!(G.party && G.party.ids && G.party.ids.length);
  if (typeof _partyNightEnd === "function" && G.party && G.party.ids && G.party.ids.length) {
    _partyNightEnd(reason);
  }
  let hangover = G.soc.drunk;
  G.soc.drunk = 0;
  // the Sabai Palms perk: Naklua quiet takes one size off the morning after
  const _quietHelped = _flag("act1Done") && G.hotel === "sabai" && hangover > 0;
  if (_quietHelped) hangover--;
  if (reason === "allnighter") hangover += 2; // the all-nighter's invoice arrives in the evening meters
  G.soc.bellAt = {};
  G.soc.bells = {};    // the bell COUNT resets too, not just the glow timer (bellAt) —
                       // else one week's three bells makes any later ฿300 ring an instant
                       // level-3 room (full heat amnesty, hands-on cap lifted) for free
  G.soc.heat = {};
  G.soc.heatWhy = {};
  G.soc.banned = {};
  G.soc.bfBar = {};    // "a colleague already left with you" is a tonight thing — else one
                       // barfine locks every other girl at that bar for the whole vacation
  G.soc.bfRefused = {}; // life-refusals ("temple in the morning") are night-scoped
  G.soc.helloed = {};   // "the hello lands once a night" — so it lands again tomorrow (Joanne, round 64)
  G.soc.goWith = {};   // the "I go with you, na" opener re-arms each night
  G.soc.lockIn = {};   // Darkside lock-ins are per-night (their own comment says so)
  G.soc.leftLockIn = {};        // …as is having walked out of one
  G.soc.backDoorTonight = {};   // …and the once-a-night welcome at the alley door
  G.soc.bra = {};      // the fondle bump is a one-night thing (as CLAUDE.md documents)
  G.soc.lastCall = {}; // last-call warnings reset with the night
  G.soc.mgrShot = {};  // the manager pours a fresh welcome shot each night
  G.soc.dogFavor = {}; // and the beer-bar staff get to fuss over Sai Krok anew
  G.soc.hostOut = {};  // …and a host you took off the floor is back on it tomorrow
  G.soc.leftEarly = {}; // …and a girl you let catch the eleven o'clock bus is back tomorrow
  G.soc.mgrChat = {};  // and forgets last night's bar-leaning (manDrinks goodwill persists)
  G.roomWater = 0;     // housekeeping restocks the two complimentary bottles
  G.peddlerNight = 0;  // …and the peddler's per-bar-night visit count resets
  G.lastBusWarned = false; // and the last-baht-bus heads-up fires once each night
  G.soc.bfNight = {};  // …and tomorrow IS a new night: the bonded bypass re-arms per girl
  G.soc.greeted = {};  // a fresh night — she greets you anew
  G.soc.fed = {};      // fed-a-girl fondness is once per girl per night
  G.soc.charmed = {};  // the first spark of the night pays สนุก; repeats charm, not restack
  G.soc.charmedN = 0;  // …and the breadth taper (_charmHappy) starts each night at full rate
  G.soc.tries = {};    // …and last night's patience is not held against you tonight
  G.soc.contested = {}; // a forced drink's standoff doesn't outlive the shift
  G.soc.gaveCondom = {}; // as is the (amusing) condom fondness
  G.lastBfId = null;   // clear the LT-ending bond hook
  G.lastBfBase = 10;   // and its สนุก base (reality-LT drops it to 4 for one night)
  // bonds cool a notch a night; tend them or lose them — unless a loyal dog (Hachiko) holds them
  // a resident who comes by every few nights must be able to KEEP a local (27-night
  // playtest 2026-08-22: both contacts strangers by day 35) — expat bonds cool a
  // notch every third night, vacation bonds nightly as before
  if (_dogEgg() !== "loyal" && (G.stage !== "expat" || G.day % 3 === 0)) for (const id in G.soc.drinks) _addBond(id, -1);
  // THE REGULAR, BY PRESENCE: six nights on the same stool, ฿2,400 on one girl,
  // and by Saturday she "knows your face" — the nightly cool-off ate a modest
  // man's whole evening (Trevor, round 39). The bar you sat longest in tonight
  // (≥30 turns — three hours) earns its girls a notch that isn't bought, through
  // _addBond like the floor: the drinks taper has nothing to say about it.
  if (_flag("act1Done") && G.soc.barTurns) {
    const [top, n] = Object.entries(G.soc.barTurns).sort((a, b) => b[1] - a[1])[0] || [];
    if (top && n >= 30 && ROOMS[top] && ROOMS[top].barType) {
      const girls = _staffAt(top).filter(id => NPC_ROLES[id] === "hostess");
      for (const id of girls) _addBond(id, 1);
      // "The girls there will know the face" — said eight times to the owner about
      // his own employees (Malcolm, round 47). Same beat, the guv'nor's register.
      // …and nothing at all to the owner after a stood shift: twelve hours behind his own
      // rail is not "three hours on the same stool" (Rolf, round 55)
      if (girls.length && !(G.bar && top === G.bar.room && _flag("barOpen")))
        _say(`(Three hours on the same ${_seat(top)} at ${_barName(top)} is its own kind of drink. The girls there will know the face.)`, "dim");
      // and the man behind the rail: presence is how a manager decides you're not a tourist
      const mgr = _staffAt(top).find(id => NPCS[id] && NPCS[id].manager);
      // your own manager already knows your face — "(Bert will know it too.)" hung orphaned
      // under a suppressed line, every night (Mick, round 57)
      if (mgr && !(G.bar && top === G.bar.room && _flag("barOpen"))) { const mst = _npcState(mgr); if ((mst.trust || 0) < 3) { mst.trust = (mst.trust || 0) + 1; _say(`(${NPCS[mgr].name} will know it too.)`, "dim"); } }
    }
  }
  G.soc.barTurns = {};   // tonight's stools, not the vacation's — the line fired on a night slept through in the hotel (Keith, round 40)
  G.soc.patronBusy = {};
  G.soc.patronMiffed = {};
  G.soc.apologized = {}; // a new shift will hear you out afresh
  G.soc.selfBf = false;
  G.soc.butterflyTeased = false;
  G.soc.bought = 0;          // the room's patience with a chequebook resets each night (_boughtHappy)
  G.soc.bondNight = {};      // …and so does how far a night of buying can carry one girl (_boughtBond)
  G.soc.drinkNight = {};     // …and who you actually bought a DRINK for (the butterfly tease)
  G.soc.drinkCount = {};     // …and how many each (the Soi 6 drink tariff)
  G.soc.selfDrinks = {};     // …and the beers you bought yourself, per bar (mama's midnight gate)
  // A new night never inherits last night's breadcrumb (round 34).
  if (typeof _traceCancel === "function") _traceCancel();
  G.soc.bondCapSaid = {};    // …so the "as warm as money gets tonight" line can land again tomorrow
  G.offstage = false; // never carry an "off with her" flag into a new night
  G.pendingBf = null; // a barfine still mid-negotiation at the bell dies with the night
  G.selfBfId = null;
  G.quizPlayed = {};
  G.kpPlayed = {};
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
  // …and a barfined companion never leaves you in the gutter either: she has
  // poured worse than you into worse taxis (see _partyNightEnd for the scene)
  // …and your own staff never leave you in the gutter either: a man who goes
  // down behind his own rail is carried home by the floor he pays (Des, round
  // 41: three collapses on his own shift, three Beach Road benches, pockets out)
  const _ownBarRescue = (reason === "collapse" || reason === "blackout") && typeof _atOwnBar === "function" && _atOwnBar();
  const rough = wouldRough && _dogEgg() !== "rescue" && !_hadParty && !_ownBarRescue;
  const crash = rough ? _crashSpotFor(G.room) : null;
  if (crash) {
    G.battery = _CRASH_BATTERY;
    // The town turns out the sleeping farang's pockets — but a man doesn't carry
    // his whole life in a shirt pocket, and ฿1.4M vanishing to one line read as
    // broken rather than cruel (millionaire playtest 2026-08-22). What's lost is
    // what a pocket holds; the rest was never on you.
    if (!G.dog) {
      G.roughLost = Math.min(G.money, ROUGH_WAKE_CAP);
      G.money -= G.roughLost;
    }
    // …unless a soi dog is sitting on them. Nobody negotiates with Sai Krok.
  } else if (_flag("act1Done")) {
    G.room = _hotelRoomId(); G.battery = 100;
    G.enteredVia = null; // a venue's door-memory must not send OUT of your room across town (liability playtest 2026-08-22)
  } else {
    G.room = "jomtien_beach"; G.battery = Math.max(G.battery, 20);
  }
  G.rain = 0;   // a downpour does not follow you through sleep — one pinned a man in his room at 18:00 (Gordon, round 37)
  if (G.nontStuck) {   // the account's moment passes overnight: the money lands in your ACCOUNT, not your hand (Piotr, round 40: cash teleporting into a sleeping man's pocket)
    G.bank = (G.bank || 0) + G.nontStuck;
    _say(`(A text from Nont at some hour you slept through: “sorted.” ฿${_num(G.nontStuck)} of your own money, back in your account a day late — ฿${_num(G.bank)} there now. Draw it or don't.)`, "dim");
    G.nontStuck = 0;
  }
  _say("");
  if (_ownBarRescue) { _say(_pickVary(_OWN_BAR_RESCUE, "ownrescue"), "alert"); G.ownRescueDay = G.day; }
  if (crash) {
    _say(crash.prose[Math.floor(_rand() * crash.prose.length)], "alert");
    _say(G.dog
      ? _dogN(`(Phone on ${_CRASH_BATTERY}%. Your pockets are untouched: Sai Krok spent the ` +
        "night sitting on your chest like a paperweight with teeth, and the town let " +
        "you both be. Nobody works a farang whose dog is watching.)")
      : `(Phone on ${_CRASH_BATTERY}%. ${_flag("hasWallet") ? "Wallet" : "Pockets"} ` +
        `turned out — ฿${_num(G.roughLost || 0)} gone; the town works the farang who ` +
        "don't make it home." + (G.money > 0
          ? ` They left you ฿${_num(G.money)}, which is either mercy or arithmetic.)`
          : ")"), "dim");
  }
  // A man who got the wallet back last night and made it home wakes in his
  // own room with the safe's ฿3,000 still DUE (paid on the first time in the
  // room); the folio used to bill him ฿400 of debt out of an empty pocket,
  // and the very next line opened that safe — "his kindness is the heaviest
  // thing you'll carry today", followed by the money that made the kindness
  // unnecessary (Howard, round 35). The safe pays first; the later call no-ops.
  if (!crash && G.act1SafeDue && G.room === _hotelRoomId() && typeof _roomSafeBeat === "function")
    _roomSafeBeat();
  if (!crash && (_hadParty || _bedIds) && typeof _affairLive === "function" && _affairLive() && !(_bedIds || (G.party && G.party.ids) || []).includes(G.affair.id) && typeof _affairCaught === "function") _affairCaught("bed", _bedIds);   // two women in one bed and neither saw the other (Rolf, round 66)
  else if (!crash && typeof _affairMorning === "function") _affairMorning();   // she came home with you (Rolf, round 55)
  _chargeRent(!!crash);              // the folio bills you even if you slept rough…
  if (crash) G.room = crash.room;    // …but you wake where the night left you, not at the desk
  if (_quietHelped) _say("(Naklua quiet: the hangover wakes one size smaller.)", "dim");
  // Templated so one catalog entry covers every day of the week (the day number
  // was baked into the string, so `de` needed seven copies of the same sentence).
  // the morning she stayed has a 7:50 bus in it — "mid-afternoon" printed above it (Desmond, round 63)
  if (G.chamNight) _say(_fmt("── DAY {d}{home} — grey light, far too early, and somebody else in the " +
    "room is already dressed. The rest of the day you will sleep through ──",
    { d: G.day, home: G.stage === "expat" ? _L(" · PATTAYA, HOME") : _L(" of 7") }), "win");
  else _say(_fmt("── DAY {d}{home} — you " +
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
      : ((G.nightLog || [])[(G.nightLog || []).length - 1] === "allnighter"
        ? "up the stairs at your heel and asleep on the step before you've found the key"
        : "asleep against your door when you surface")) +
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
  if (typeof _careTick === "function") _careTick();   // the fines she waived have a number, and a morning she says it
  if (typeof _barSettle === "function") _barSettle(G.day - 1);  // grade the night just played, not the morning-after month
  // THE LEDGER COMES AFTER EVERYTHING THE WAKE MOVES (Ossie, round 70: the till's shortfall came out
  // of his pocket a turn after the ledger printed and appeared a morning late). The bar's settle,
  // Nira's cousins and the care ask all belong to the night just played, so they are on its ledger.
  _morningLedger();
  // The NEXT morning's baseline is taken HERE, at wake — not at night end. Taken
  // at _endNight, the deltas only spanned the sleep (i.e. the rent), so every
  // morning read "Last night: spent ฿400" no matter what the evening cost (two
  // personas hit it independently, 2026-08-17). Wake-to-wake covers the night.
  _nightSnapshot();
  _stdMorningTick();                  // an untreated infection makes itself known each morning
  G.wakeTurn = G.turns;               // the SLEEP-on-waking guard reads this (engine-parser "sleep")
  G.enteredVia = null;
  _describeRoom(true);
  // the emergency stash is in the room safe — a player whose every wake is a
  // barfine/blackout respawn never WALKED in, and the safe's own text claimed he had
  if (G.act1SafeDue && typeof _roomSafeBeat === "function" && G.room === _hotelRoomId()) _roomSafeBeat();
  if (typeof _chamMorning === "function") _chamMorning(); // the barista's bus is at ten to eight (chameleon economy)
}

// ── The goodbye ──────────────────────────────────────────────────────────────
// You could spend a whole week with one woman — waive her barfine, sit at the
// top of her ledger, be "your girl" in the black book — and the week ended with
// nothing from her at all. She didn't text, the narrator didn't mention her,
// and the airport beat that followed was written for the churn player (Frank,
// round 34, whose entire run was one girl). For a game whose stated doctrine is
// depth-beats-breadth, the one ending the depth player earned did not exist.
//
// The return side was already built — G.prevBond keeps her peak tier so her bar
// greets a man who comes back. This is the other half of that.
//
// DOCTRINE: no meter moves. The week is being scored on this very screen, and a
// goodbye that paid สนุก would turn the last real moment of a relationship into
// a bonus. It costs nothing and pays nothing; only what you know changes — the
// same rule the other-ledger reveals follow. Never victim, never schemer: she
// has her own week starting tomorrow and you are not the whole of it.
// Pool index rides G.vacation like the airport scrub, so repeat trips differ.
function _farewellGirl() {
  // "Jaja put you in the taxi herself… the last night you saw her" — the last night was
  // with somebody else (Dieter, round 56). The last night's woman, if she's a regular;
  // if the last night was a woman off the floor, nobody from the floor claims it.
  if (G.lastNightWith === "cream") return null;
  if (G.lastBfId && NPCS[G.lastBfId] && NPC_ROLES[G.lastBfId] && _bondTier(G.lastBfId) >= 2) return G.lastBfId;
  let best = null, bestT = 0;
  for (const id of Object.keys(G.soc.drinks || {})) {
    if (!NPCS[id] || !NPC_ROLES[id]) continue;
    const t = _bondTier(id);
    if (t > bestT || (t === bestT && best && (G.soc.drinks[id] > G.soc.drinks[best]))) {
      if (t >= 2) { best = id; bestT = t; }
    }
  }
  return best;
}

const _GOODBYE_REGULAR = [
  n => `You go in on the last night, because not going in would be its own kind of ` +
    `statement. ${n} is working — of course she is, and the rail is three ` +
    `deep — and she gets to you between two other tables, wipes her hands on the cloth, ` +
    `and gives you thirty entirely undivided seconds. "So. Tomorrow you go." Not a ` +
    `question. "Okay. You come back, you know where I am. I don't move, na." Somebody ` +
    `calls her name from the far end. She goes.`,
  n => `${n} finds out you're flying from somebody else, which tells you something about ` +
    `how the soi carries news and something else about how many people were counting. ` +
    `"Why you not TELL me," she says, genuinely put out, and then immediately lets you ` +
    `off. "{{Mai pen rai}}. Next time you tell me before, and I take the night off, and we ` +
    `eat somewhere not here." It is offered like a small business proposal, which is how ` +
    `she offers everything she means.`,
  n => `The last night is not a scene. ${n} pours, you drink, the football is on, and ` +
    `at some point she says "you fly tomorrow, na" to the glass she's polishing ` +
    `rather than to you, and that is the entire acknowledgement either of you makes. At ` +
    `the door she squeezes your arm once, hard, and is already turning back to the room ` +
    `before you're through it.`,
];

const _GOODBYE_FARANG = [
  n => `${n} knows the date. She has known it since the night you told her, and she has ` +
    `not mentioned it once, which you did not notice until now. On the last morning she ` +
    `is there before the taxi, in yesterday's t-shirt with her hair up, holding two ` +
    `coffees from the place on the corner and looking mildly annoyed about the whole ` +
    `arrangement.\n\n"I don't do this," she says. "Airport, crying, all that — no. ` +
    `Stupid." She hands you the coffee. "So I do it here instead, quick, and then I go ` +
    `sleep." She does it here instead. It is quick. Neither of you is any good at it.`,
  n => `${n} does not come to see you off, and her text says plainly why: ` +
    `"because then i stand there like idiot, and after you go i still stand there." She ` +
    `writes it flatly, the way she says the price of things. What she does instead is put ` +
    `you in the taxi herself at the hotel, argue with the driver about the airport fare ` +
    `on your behalf, win, and walk back up the soi without looking round — which she has ` +
    `clearly decided in advance and executes exactly.`,
  n => `The last hour, ${n} is quiet in a way you have not seen in a week of noise. Then, ` +
    `on the step outside the hotel with the taxi already waiting: "One thing. When you ` +
    `go home — don't send me money." Your face must do something, because she laughs and ` +
    `puts a hand flat on your chest. "No, no. Not proud. Is because then it become a ` +
    `JOB, na, and I have a job." A shrug, and the real thing underneath it. "This one is ` +
    `not the job. I want to keep it not the job."`,
];

function _lastGoodbye() {
  const id = _farewellGirl();
  if (!id) return;
  const name = NPCS[id].name;
  const pool = _bondTier(id) >= 3 ? _GOODBYE_FARANG : _GOODBYE_REGULAR;
  // she cannot "find out from somebody else" if you told her, or if she spent
  // the last night with you (Anil, round 64): skip the hearsay variant then
  const _knows = ((G.soc.leavingSaid || {})[id] != null) || G.lastBfId === id ||
    ((G.party && G.party.ids) || []).includes(id) || !!(G.rideLog && G.rideLog[id] && G.rideLog[id].day >= G.day - 1);
  let _gi = G.vacation % pool.length;
  if (_knows && pool === _GOODBYE_REGULAR && _gi === 1) _gi = 2;
  _say(pool[_gi](name), "room");
  // …and she has a week of her own starting tomorrow. Stated once, without
  // sentiment, because the alternative is a woman who exists only while the
  // player is looking at her.
  if (_bondTier(id) >= 3)
    _say(`(Tonight she works. Tomorrow she works. The soi does not observe your ` +
      `departure, and neither, particularly, does she — which is not the same as ` +
      `not minding.)`, "dim");
}

function _endVacation() {
  if (G.nontStuck) {   // a delayed transfer never landed across the reset (Piotr, round 40): it lands in the account before the week is scored
    G.bank = (G.bank || 0) + G.nontStuck;
    _say(`(Nont's delayed ฿${_num(G.nontStuck)} lands in your account on the last morning. He does not lose money; he'd be dead.)`, "dim");
    G.nontStuck = 0;
  }
  G.pendingChoice = "vacation_end";
  G.bestHappy = Math.max(G.bestHappy, G.happy);
  // "the city doesn't come to see you off" was printed to a man whose dog was
  // asleep against his door (Bill, round 44). The city doesn't. He does.
  const _dogBye = G.dog ? _dogN(_pickVary([
    // the shuttered pub is the Shamrock reveal: only a man who has heard it may be told it (Dennis, round 60)
    _flag("shamrockVisited")
      ? "Sai Krok is on the mat by the door when the taxi is called, and does not get up, and does not stop watching you. He has done this before, at a shuttered pub on the Darkside, and he knows how it goes."
      : "Sai Krok is on the mat by the door when the taxi is called, and does not get up, and does not stop watching you. Whatever he knows about people leaving, he learned before you, and he knows how it goes.",
    "You leave the last of the water down for Sai Krok. He drinks it, and then sits by the case, which is the argument he is able to make.",
    "Sai Krok walks you to the lobby doors and stops at the line where the aircon ends, because he has never once come further, and looks up at you with his whole plan showing.",
  ], "dogbye")) : null;
  _say("═══════════════════════════════════", "win");
  _say("The week is up. The taxi to the airport leaves in an hour, and the city " +
    "doesn't come to see you off — it just keeps roaring, the way it was " +
    "roaring before you came, the way it will roar after. From the highway " +
    "the neon shrinks to a smudge on the coast.", "win");
  if (_dogBye) _say(_dogBye, "room");
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
  if (G.loan && G.loan.owed > 0) {
    // the loan doesn't fly home with you — but the face does (broke playtest 2026-08-22).
    // NB the FLAG is deliberately not set here: this runs before the player has
    // chosen, and setting it now blacklisted a man who chose MOVE TO PATTAYA,
    // never boarded, and was still being garnished nightly — told to his face
    // that he "flew home with her money" (debt playtest 2026-08-24). _newVacation
    // sets it, because that is the branch on which he actually leaves.
    _say(`(You owe Nira ฿${_num(G.loan.owed)}. The airport is the one place her cousins don't come, and she ` +
      "knows it, and she will remember the face. Pattaya keeps its books.)", "alert");
  }
  _lastGoodbye();
  _say("So. What now?", "room");
  // The two options come from _vacationEndPrompt, NOT from here: this is the one
  // screen in the game where a choice is permanent and one-way, and on a resume
  // it used to redraw as "(NEW VACATION · MOVE TO PATTAYA — the airline needs an
  // answer.)" — two unexplained CAPS phrases, no week's score, nothing saying one
  // of them ends the holiday for good (interrupted-player persona, round 17).
  _vacationEndPrompt();
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
  "The taxi drops you at Departures and you move through the terminal like a man carrying something he shouldn't, because you are. Over the next two hours the man the week grew — the one who answered to a nickname, drank from a bucket before dark, rode pillion with no helmet and a girl's arms round him — has to quietly stop existing. You find the big accessible stall, lock the door, and begin.",
  "You know this ritual; you'll perform it again next trip. In a locked airport toilet the version of you the week grew is taken apart and the one with the mortgage is reassembled from the clean side of the suitcase. Ninety minutes, and a bag full of evidence.",
  "Departures again, and the same walk — chin down, moving fast, a man whose contraband is mostly himself. The week's version of you doesn't get to board this plane. You find a stall, throw the bolt, and start.",
  "The gate's in ninety minutes, and the surgery can't be rushed. Somewhere between the taxi rank and seat 34K the man who sang the wrong words to every chorus at three in the morning has to become a man who files quarterly reports. The airport toilet is the operating theatre.",
];
const _SCRUB_PHYSICAL = [
  "First the body. The bar's football shirt comes off — it smells of the rail, the grill, somebody's perfume and three decisions — goes into the plastic bag the toothbrush came in, and is pushed to the bottom of the case under the shoes. From the side of the suitcase you never opened all week: the collared shirt, the trousers with a crease, the watch you took off on the first night. You wash your face in a steel sink as if the week could be rinsed.",
  "You strip the week and dress the man who went to a conference — the football shirt bagged and buried under the shoes, the collared shirt pulled from the side of the case you never opened. In the mirror the tan nearly passes for a golf tan, if nobody looks at the line where the singlet stopped.",
  "Off with the costume: the shirt that smells like the inside of a bar folded into plastic and pressed to the bottom of the bag, the flip-flops swapped for shoes that have never met a wet soi. The collared shirt still holds the fold-lines from the shop. In the mirror, a man who had a quiet week.",
  "You wash the town off in a steel sink — the smoke, the grill, the faint sweetness of somebody else's perfume — and dress as a man with a lawn to mow. The tan is the only witness left, and tans lie easily enough.",
];
const _SCRUB_DIGITAL = [
  "Then the phone, which is the dangerous part. The chat app first — forty messages a day, hearts, a voice note you never played — long-pressed and gone without a glance. Then the gallery: a hundred-odd blurry frames of neon and raised glasses deleted, and then, because this is where men get caught, the folder the phone keeps for thirty days, emptied as well. It never happened.",
  "The lock screen is the last wire. You swap the red-lit photo you don't quite remember taking for the dog on the lawn, and rehearse the story about the cash you drew in three days: the course took cash, the hotel took cash, the whole country takes cash. Perfect.",
  "The phone is where careers end. You purge the threads unread — the hearts, the 'papa', the voice notes you'll never play — then the gallery, then the folder that keeps what you deleted, until the device holds nothing but a man who went to a conference. Empty it. Twice.",
  "You run the sweep in order, the way you've learned to: messages, photos, the deleted-items folder, the banking app's history rehearsed into greens fees and a cash-only clubhouse. Last, the lock screen — the stranger under the red light swapped for the dog and the lawn and the life you are about to lie to.",
];
const _SCRUB_CALL = [
  "You walk out into the cold scent of Duty-Free, buy the bottle of perfume that says sorry without saying why, and the phone rings on cue. You clear your throat, drop into the tired voice, and answer: “Hey. Honestly? Knackering. So humid. Meetings and bad hotel food. Just want my own bed.” The performance of a lifetime, and it lands.",
  "The call comes as you reach the gate, and you become, instantly and completely, a bored man who spent a week at conference tables. “Golf was alright. Traffic was a nightmare. Ready to be home.” A sigh, precisely weighted. Every word believed, because you have made it so easy to.",
  "In the Duty-Free glare you buy the apology in a bottle, and the call lands as you pay. You answer bored to the marrow: “Yeah, fine. Long week. Too many people, not enough sleep. Can't wait to be back.” Not a word of it true, every word believed.",
  "The phone goes as you reach the seat, and you slide into the other voice — flatter, wearier, entirely domestic. “Golf was okay. Weather was rough. Missed you.” You've told this one so many times it has started to feel like a second first language.",
];
const _SCRUB_CLOSE = [
  "You pocket the phone and walk toward boarding. The double life holds; nobody at the gate can see the week on you. The town doesn't notice you leaving — it is already pouring your stool's beer for the next man who's sure he's different.",
  "The scrub is complete: the week's shirt is under the shoes, the man with the mortgage is at the gate. In a month the seatbelt sign will ping off over the gulf again, and you'll run the whole ritual in reverse.",
  "Boarding call. You walk the jet bridge a respectable man with a clean phone and a duty-free bag, and behind you the town closes over the space where you stood without a ripple.",
  "The performance holds all the way to the seat. The week is a story about golf and traffic now, filed and locked. Pattaya keeps the truth the way it keeps everyone's — cheaply, and forever.",
];

const _SCRUB_ALONE = [
  "The phone stays dark, which is its own kind of performance: no call to take in the other " +
    "voice, nobody waiting to be told about golf. You delete the photos anyway, out of a habit " +
    "that belongs to other men, and then stop, and leave the last one.",
  "There is nobody to ring. You notice that in Duty-Free, standing in front of the perfume that " +
    "says sorry without saying why, with no one to say it to — and put it back, and buy a coffee, " +
    "and sit with the week a minute longer than the other men at the gate are allowed to.",
  "No lock screen to swap. Nobody checks it. You scroll the week once — the rail, the neon, the " +
    "face that kept your seat — and keep all of it, because there is no reason on earth not to.",
];
const _SCRUB_CLOSE_ALONE = [
  "Boarding call. You walk the jet bridge the same man who walked in, carrying the week instead of " +
    "hiding it, and behind you the city closes over the space where you stood without a ripple.",
  "The performance, such as it is, is simply not to need one. In a month the seatbelt sign will ping " +
    "off over the gulf again and the soi will have kept your stool, or not, and you'll find out which.",
];
function _suvarnabhumiScrub() {
  const v = G.vacation;
  _say("═══════════════════════════════════", "dim");
  _say(_SCRUB_OPEN[v % _SCRUB_OPEN.length], "room");
  // the man at the gate is the one you chose in the taxi: a pensioner has no conference and no
  // quarterly reports to dress for (Piet, round 62 — "a pension, and twenty years of coming back")
  const _home = l => !(typeof _isOrigin === "function" && (_isOrigin("pension") || _isOrigin("redundancy") || _isOrigin("running"))) || !/conference|quarterly|careers|mortgage|lawn/i.test(l);
  const _hasNumbers = Object.keys(G.phone.contacts || {}).some(k => G.phone.contacts[k] && NPC_ROLES[k]);   // no hearts to purge with nobody's number (Pieter, round 73)
  const _phys = _SCRUB_PHYSICAL.filter(_home), _dig = _SCRUB_DIGITAL.filter(_home).filter(l => _hasNumbers || !/hearts|papa|voice note/.test(l)), _call = _SCRUB_CALL.filter(_home), _close = _SCRUB_CLOSE.filter(_home);
  _say((_phys.length ? _phys : _SCRUB_PHYSICAL)[Math.floor(_rand() * (_phys.length || _SCRUB_PHYSICAL.length))]);
  if (typeof _isOrigin === "function" && _isOrigin("monger")) {
    _say((_dig.length ? _dig : _SCRUB_DIGITAL)[Math.floor(_rand() * (_dig.length || _SCRUB_DIGITAL.length))]);
    _say((_call.length ? _call : _SCRUB_CALL)[Math.floor(_rand() * (_call.length || _SCRUB_CALL.length))]);
    _say((_close.length ? _close : _SCRUB_CLOSE)[v % (_close.length || _SCRUB_CLOSE.length)], "dim");
  } else {
    _say(_SCRUB_ALONE[v % _SCRUB_ALONE.length]);
    _say(_SCRUB_CLOSE_ALONE[v % _SCRUB_CLOSE_ALONE.length], "dim");
  }
}

function _newVacation() {
  G.chamNight = false;   // a morning that did not happen does not happen a month later (Dieter, round 56)
  G.testedDays = [];     // the day count restarts, so the clinic's memory does too (round 57)
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
  // The pocket flies home with you. ฿17,141 in hand at the airport became
  // ฿3,000 in the safe a month later with no line of prose acknowledging the
  // other fourteen grand — for a player whose whole strategy was underspending,
  // that deleted the reward for playing well (Stan, round 35). It goes into
  // the account; the safe's ฿3,000 is the fresh float, as before.
  if (G.money > 0) {
    G.bank = (G.bank || 0) + G.money;
    _say(`(The ฿${_num(G.money)} you flew home with went into the account at the airport — ` +
      `฿${_num(G.bank)} there now. The safe holds the float.)`, "dim");
  }
  G.money = SAFE_CASH;
  G.battery = 100;
  G.hunger = 20;
  G.thirst = 30;
  G.hurt = 0;
  G.atmDay = 0; G.atmToday = 0; // day resets to 1, so clear the daily-cap tracking or a day-1 withdrawal carries over
  G.tonicOwed = 0; // a month away forfeits any pending tonic-shop claim
  G.curseOwed = 0; // …and any pending fortune-teller claim
  // The balance is written off by the month away (for now) — but the FACE is
  // remembered, and this is the branch where the player actually flew home with
  // her money, so this is where the flag belongs (it used to be set at the gate,
  // before the choice, and so fired on the MOVE TO PATTAYA path too).
  if (G.loan && G.loan.owed > 0) { G.loanSkipped = true; G.loanSkippedOwed = G.loan.owed; }
  G.loan = null;   // …but Nira's cousins do not forget; a month away writes it off all the same (for now)
  G.jaded = 0;     // a fresh trip, fresh enthusiasm — the treadmill resets
  // a month's worth of old chatter does not arrive fresh on the plane home — "i still smile
  // from last night" sat unread into the next trip (Dennis, round 60). Money and photos stay
  // unread, so they still land when read.
  if (G.phone && G.phone.inbox) for (const m of G.phone.inbox) if (!m.gives && !m.photo) m.read = true;
  G.rep = 0; G.repDay = null; // a month away and the soi's memory of your antics is a clean slate (expat keeps its rep — you live there)
  // The bond ledger resets per vacation by design — but a regular+ girl does not
  // forget a face in a month. Keep the peak tiers so her bar can greet you once.
  G.prevBond = {};
  for (const id of Object.keys(G.soc.drinks || {})) {
    const t = typeof _bondTier === "function" ? _bondTier(id) : 0;
    if (t >= 2) G.prevBond[id] = t;
  }
  G.returned = {};
  G.care = {};   // the waiver tier does not survive the flight, so neither does its account; G.owed and G.maiDee do — one is a kindness she still owes, the other is permanent
  // What she has TOLD you survives the trip home. The other-ledger reveals
  // are once-per-girl-per-tier EVER by doctrine, and wiping the book with the
  // bonds replayed the ฿60 cut as news to "a man who has been inside it for a
  // week" — her own words — a month after she showed him the chit in her
  // phone case (Howard, round 35). The share card's per-week COUNT still
  // resets below (ledgerSeen); only the memory of the telling is kept.
  const _told = G.soc.ledger || {};
  // …and so do the confidence books: every bond line from the first trip was retold word
  // for word on the second, sometimes by the other woman (Piet, round 62). What she has
  // told you is not a meter and not a week's warmth.
  const _bondSaid = G.soc.bondSaid || {}, _bondHeard = G.soc.bondHeard || {}, _ledgerHeard = G.soc.ledgerHeard || {}, _storyTold = G.soc.storyTold || {};
  for (const id of Object.keys(G.soc.drinks || {})) { const t = typeof _bondTier === "function" ? _bondTier(id) : 0; if (t > ((G.everBond = G.everBond || {})[id] || 0)) G.everBond[id] = t; }
  G.soc = { drinks: {}, mamaTreat: {}, bellAt: {}, bells: {}, heat: {},
    banned: {}, patronBusy: {}, patronMiffed: {}, bra: {}, drunk: 0, ledger: _told,
    bondSaid: _bondSaid, bondHeard: _bondHeard, ledgerHeard: _ledgerHeard, storyTold: _storyTold };
  // THE RETURN IS THE MOMENT (essay ledger theme 3, 2026-10-01 — the most consistent
  // claim in the source corpus, and the one the game contradicted): a man who went
  // home and came back is not a stranger. Her-farang comes back a regular, a
  // regular comes back a face; the return greeting's bump then carries her most
  // of the way back. Below regular nothing carries — a face is a week's warmth.
  for (const id of Object.keys(G.prevBond)) G.soc.drinks[id] = G.prevBond[id] >= 3 ? 7 : 3;
  // The share card's spine and its "told true" count are THIS week's, not a
  // lifetime tally — nightLog untouched here meant a fresh vacation's SHARE
  // showed the previous vacation's 7 nights and falsely declared "week
  // complete" on day 1; ledgerSeen kept counting reveals that G.soc.ledger
  // (just wiped above, same as the bonds) had already forgotten, so replaying
  // a tier-1 reveal with a rebuilt regular double-counted it (the Collector,
  // 2026-08-27).
  G.nightLog = [];
  G.ledgerSeen = 0;
  // The morning-after ledger is a delta against a night-end snapshot; taken
  // across the vacation reset it reported the reset itself — "−119 สนุก · down
  // ฿5,740 on the night" for a month spent at home (Howard, round 35).
  G.lastNight = null;
  // …and the TEXT of it, or LAST NIGHT on day one of a fresh trip reprints the
  // final morning of the trip before it — the snapshot was cleared and the
  // sentence it produced was not.
  G.lastNightSaid = null;
  // …and then a FRESH baseline for the night about to start, or the first
  // morning of every new trip reports "nothing to measure against yet" over a
  // night that was actually played (Brian, round 49, ฿860 down and told nothing).
  // Taken AFTER the reset, so Howard's finding stands: the reset is never in the delta.
  if (typeof _nightSnapshot === "function") _nightSnapshot();
  G.itemLoc.phone = "inventory";
  G.itemLoc.charger = "inventory";
  G.itemLoc.wallet = "inventory";
  G.hotel = "sabai"; // a fresh booking always starts where the story did
  G.room = "hotel_room";
  _say("");
  _say("A month of grey sky and greyer meetings, and then the seatbelt sign " +
    "pings off over the gulf. Same Sabai Palms. Same terrible, perfect bed. Room 412 " +
    `keeps your secrets. ฿${_num(SAFE_CASH)} in the safe, seven nights on the clock.`, "win");
  _say(`── VACATION ${G.vacation} · DAY 1 of 7 ──`, "win");
  // …and the other half of the goodbye: she texted while you were in the air.
  // G.prevBond was just computed from the week you flew home from, and her
  // number survives the trip, so the phone is where the relationship keeps
  // going when the player isn't there — which is what a phone is for, and what
  // this one was silent about (Frank, round 34: "she doesn't text").
  // Not a scam-ask, no money, no invite — she is just a person you know now.
  const _her = Object.keys(G.prevBond || {})
    .filter(id => G.prevBond[id] >= 3 && NPCS[id] && (G.phone.contacts || {})[id])
    .sort((a, b) => G.prevBond[b] - G.prevBond[a])[0];
  if (_her && typeof _pushMsg === "function") {
    _pushMsg(_her, [
      "landed ok?? 🛬 tell me when you home. not tomorrow. TODAY 😤",
      "bar so boring last night. nobody play pool with me 🎱 come back",
      "my mother ask who is farang always in the photo 555 i say nobody. she not believe me",
      "you forget your lighter here. i keep it. is mine now, sorry na 🔥",
    ][G.vacation % 4]);
    _say("(📱 One unread, sent while you were somewhere over the gulf. CHECK MESSAGES.)", "dim");
  }
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
  if (G.lastNight) G.lastNight.money += EXPAT_SAVINGS;   // the wire is not "up ฿19,275 on the night" (Keith, round 40)
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
    `฿${_num(EXPAT_SAVINGS)}, in your pocket by the time the clerk finishes his ` +
    "cigarette. The soi absorbs the news without comment. Candy just sets out your glass.", "win");
  if (G.dog) _say(_dogN(_pickVary([
    "Sai Krok, who was never told and never asked, turns three circles on the mat by the door of room 412 and drops, chin on paws. As far as he is concerned nothing has been decided today; you were always going to stay.",
    "The only one who gets told is Sai Krok, and you tell him out loud, feeling every inch the fool. He thumps his tail twice on the tile. Motion carried.",
    "Somewhere in the paperwork it stops being a holiday, and the moment goes by unmarked except by a dog on a mat who has been waiting four years for somebody to not get on the plane.",
  ], "dogstay")), "room");
  if (G.money > EXPAT_SAVINGS * 4) {
    // a man who arrives carrying a fortune shouldn't be told he has ฿20,000
    // (millionaire playtest 2026-08-22)
    _say(`(On top of what you were already carrying — ฿${_num(G.money - EXPAT_SAVINGS)} — which nobody ` +
      "here asks about and everybody here notices.)", "dim");
  }
  // a resident has a Thai account of his own — the difference between a tourist
  // and an expat at every ATM in the kingdom (Mario, 2026-09-04)
  G.thaiAccount = true;
  _say("The visa comes with a bank book: a Thai account in your own name, which is " +
    "the difference between a tourist and a resident at every ATM in the kingdom — " +
    "no card fee, and a counter that will hand you real money for a real purchase.", "dim");
  _say("★ EXPAT MODE — no flights, no clock on the week. The city is yours to " +
    "figure out. (They say the smart ones end up owning a bar…) ★", "win");
  _say(`── DAY ${G.day} · PATTAYA, HOME ──`, "win");
  _describeRoom(true);
}


// A manager who is currently giving you the cold shoulder. Today that is Bert,
// frozen while your Pattaya Leisure standing is above zero and you have not yet put
// it right by him — the same test his greeting node makes, in one place, so a
// second surface cannot drift out of agreement with the first (round 22).
function _mgrIced(id) {
  return id === "bert" && _faction("plg") > 0 && !_flag("plgResolved");
}

// ─ The operator's terminal (cli-sim.js) ─
// The simulator is a portable pure module; THIS is the LBB host wiring. G.game
// carries { type: "cli", scenario, cli: <plain state> } so a save resumes the
// puzzle; every command routes through _cliInput while it's live; won pays the
// quest by flag; the bonus file becomes an item. No stake — nothing is escrowed.
function _startCli(scenarioId) {
  if (typeof cliNew !== "function" || typeof CLI_SCENARIOS === "undefined") { _say("The screen stays dark."); return; }
  const sc = CLI_SCENARIOS[scenarioId];
  if (!sc) { _say("The screen stays dark."); return; }
  G.game = { type: "cli", scenario: scenarioId, cli: cliNew(sc, _rand), stake: 0 };
  if (typeof _ccibWire === "function") _ccibWire();   // the operator run uses a wire too
  if (G.cliSat) {   // a second sitting — not the same paragraph verbatim (Pri, r45)
    G.cliSat++;
    _say("Back at the desk. The golf course, the cursor, the chair still warm from you. The vault has " +
      "locked itself again behind you, the way it does, and nothing else has changed, which is the " +
      "point of the place.", "alert");
    _cliBoard(); return;
  }
  G.cliSat = 1;
  _say("You sit. The chair is still warm. The lock screen is a golf course and it is not locked " +
    "— somebody went for a cigarette in the middle of something and the machine is still in the " +
    "middle of it. A cursor blinks in a black window over the golf course, waiting for a person " +
    "who isn't you.", "alert");
  _say("(It's a filing cabinet, not a bomb: HELP lists what it does. LS looks around, READ opens a " +
    "file, CD goes into a folder. Find the file, COPY it to Rabbit's stick, EXIT when you're done. " +
    "Every command is a tap; nothing here needs typing.)", "dim");
  _cliBoard();
}
function _cliBoard() {
  const g = G.game; if (!g || g.type !== "cli") return;
  const sc = CLI_SCENARIOS[g.scenario];
  _say(cliPrompt(sc, g.cli), "dim");
}
function _cliInput(input) {
  const g = G.game;
  const sc = CLI_SCENARIOS[g.scenario];
  const r = cliInput(sc, g.cli, input, _rand);
  for (const l of r.output) _say(l, "room");
  for (const f of r.took) { G.stickFiles = G.stickFiles || []; if (!G.stickFiles.includes(f)) G.stickFiles.push(f); }
  if ((r.took.includes("takings_2023.xlsx") || r.took.includes("2023-11.pdf")) && !_flag("invoicesCopied")) { _setFlag("invoicesCopied");
    _say("(Onto the stick, beside whatever else is there: paper. A sales sheet a twelve-stool bar could not have poured, and an invoice for a cleaner who never came. Nothing anybody wants. Proof that you understood.)", "dim"); }
  // the bonus: Rabbit's old regulars, copied on the way past
  if (r.took.includes("regulars_2019.xls") && G.itemLoc.trade_book !== "inventory") {
    G.itemLoc.trade_book = "inventory";
    _say("(Two hundred-odd rows of somebody's regulars go onto the stick alongside whatever " +
      "else is on it. Not what you came for. Worth having.)", "dim");
  }
  if (!r.done) { _cliBoard(); return true; }
  G.game = null;
  if (r.won) {
    _say("The file is on the stick. You back out the way you came in — folders closed, window " +
      "the size it was, the golf course back over everything — and the machine goes on waiting " +
      "for its owner exactly as it was. Nothing happened here. That is the entire skill.", "win");
    _setFlag("rabbitData"); G.rabbitDataDay = G.day;   // completes rabbit_heist at the next _questTick
    return true;
  }
  if (r.lost) {
    G.cliLockedDay = G.day;   // "not tonight" is a rule now, not a sentence (Pri, r45: sat back down in four seconds)
    const have = (G.stickFiles || []).length;
    _say("You get up. The chair is warm and the screen is locked" +
      (have ? ", and whatever is on the stick is on the stick." : " and there is nothing on the stick worth the name.") +
      " Nobody saw. Nobody knows. It can be tried again — the machine will be left unlocked again, " +
      "because it always is — but not tonight.", "alert");
    return true;
  }
  // walked away (EXIT): keep what you copied, no flag either way
  _say("(You leave it as you found it. Whatever's on the stick is on the stick.)", "dim");
  return true;
}
