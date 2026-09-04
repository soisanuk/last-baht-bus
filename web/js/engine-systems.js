// The Last Baht Bus — game engine, part 4/5: standalone systems — barfine,
// quests, the phone (contacts/messages/banking), news, the sports desk/lottery,
// rainy season, food and water, and Act One.
// Loads after engine-core (see its header for the split's load-order contract).

// ── Barfine ──────────────────────────────────────────────────────────────────
// Canon: everywhere lets the ladies go with a customer for a fee; go-gos and
// Soi 6 are the expensive end. Soi 6 has "upstairs" — the night continues.
// Elsewhere, the barfine IS the rest of your night, and a very good one.

// The clock sets the rate: before 21:00 the mamasan charges for the whole
// lost shift (×1.5); after midnight most beer bars quietly waive the fee —
// except for the popular girls — and the flash joints just discount.
function _barfinePrice(bt, id) {
  let base = bt === "soi6" ? BF_SOI6 : bt === "gogo" ? BF_GOGO : bt === "gents" ? BF_GENTS : BF_BEER;
  const draw = _isDraw(id);
  if (draw) base = _round50(base * 1.5); // a prized draw is worth more to the bar
  if (G.nightTurn < 30) return _round50(base * 1.5);
  if (G.nightTurn >= 60) {
    if (draw) return base;                          // and gets no midnight discount
    if (bt === "beer" && !POPULAR_GIRLS.includes(id)) return 0;
    return _round50(base * 0.75);
  }
  return base;
}

// Short time vs long time. ST is the quoted rate — one round and off she goes,
// the night carries on. LT (generally overnight) costs more: beer ×1.75, go-go
// ×1.5, and Soi 6 — a volume business that hates losing a girl for a whole
// night — quotes a prohibitive early LT, sometimes more than a go-go fine.
// After midnight the collapse flattens everything: same fine either way.
// The sharp-operator mama running THIS room takes a quiet house cut on the fine —
// the subtle extraction the girls are too obvious for. Savvy players notice her bar
// runs a touch dearer; that's the whole point of a good mamasan.
function _roomMamaOperator() {
  const mama = _npcsHere().find(x => NPC_ROLES[x] === "mamasan");
  return !!(mama && NPCS[mama].type === "operator");
}
function _barfinePrices(bt, id) {
  let st = _barfinePrice(bt, id);
  let lt;
  // _barfinePrice is the BAR's fee, and 0 after midnight at a beer bar is the
  // truth about the bar. It is not the truth about her: the lady's money is
  // separate and still paid (LADY_ST / LADY_LT), so the quote never reads as
  // free. No house cut on it either — the operator's cut is on the FINE.
  if (st === 0) return { st: LADY_ST, lt: LADY_LT, herMoney: true };
  if (G.nightTurn >= 60) lt = st;
  else {
    const mult = bt === "soi6" ? (G.nightTurn < 30 ? 3 : 2) :
      bt === "gogo" ? 1.5 : bt === "gents" ? 1.5 : 1.75;
    lt = _round50(st * mult);
  }
  if (_roomMamaOperator()) { st = _round50(st * 1.1); lt = _round50(lt * 1.1); }
  return { st, lt };
}

// Which girls run games on a mark? MOST don't — it's the experienced
// operators, a stable hash-picked minority. The green girls are too new and
// too nervous, and the popular girls have a reputation worth more than one
// inflated fine. Liking you (favor ≥ 6) or a vouching wing-woman also keeps
// everyone honest — they play a newbie they can get away with, nobody else.
// A good-girl cashier (type:"sponsor") stays off-limits, kept clean by a western
// sponsor's monthly money — until you outbid him. G.soc.given[id] tracks the baht
// you've put on her (TIP + SEND); past the threshold the fidelity breaks and the
// barfine unlocks. The white knight who "rescues" her by paying is the one who
// breaks the thing he thinks he's saving.
const SPONSOR_FLIP = 15000;
function _sponsorFlipped(id) { return ((G.soc.given && G.soc.given[id]) || 0) >= SPONSOR_FLIP; }

function _bfShark(id) {
  if (POPULAR_GIRLS.includes(id)) return false;
  if (NPCS[id].c4 === 2) return false;            // the new girls play it straight
  if (NPCS[id].type === "operator") return true;  // an authored shark, by design
  return _hh(id, 97) % 100 < 35;
}
function _bfExploitable(id) {
  // A sponsor girl you've just outbid (flipped) has left a paying man FOR you —
  // her first night out isn't the moment she runs a scam, even if her hash marks
  // her a shark. She's earned honesty.
  if (NPCS[id].type === "sponsor" && _sponsorFlipped(id)) return false;
  if (!_bfShark(id)) return false;
  if (_wingman()) return false;
  // The white knight is the perfect mark: he over-invests and can't read the tells,
  // so bonding never buys him the safety a savvy punter earns at favor >= 6.
  if (typeof _pers === "function" && _pers("whiteknight")) return true;
  return _favor(id) < 6;
}

// Some girls are a bar's prized DRAW — new, small, pretty, worth keeping on the
// floor. Their take-out is blocked while they pull the early crowd (before
// midnight) and priced at a premium after: the barfine is an appraisal, not a
// fixed number. A stable hash-picked minority (shared-world-safe like _quizBars).
function _isDraw(id) {
  if (NPC_ROLES[id] !== "hostess") return false;
  // the draw refusal lifts at midnight — meaningless in a bar that CLOSES at midnight
  // (soi6/gents/Darkside), where it would just make her un-barfineable all night (the
  // featured Soi 6 shows were all hitting this). Draws only in bars open past midnight.
  if (_closesMidnight(_npcRoom(id))) return false;
  return _hh(id + ":" + G.vacation + ":draw", 61) % 100 < 15;
}
// A hash-picked minority are KEPT: a long-time sponsor pays them not to work
// while he's in town (a ~3-day window per vacation) — except his family night,
// when a free evening is a free evening.
function _hasSponsor(id) {
  return NPC_ROLES[id] === "hostess" && _hh(id + ":sponsor", 71) % 100 < 18;
}
function _sponsorStart(id) { return 2 + _hh(id + ":" + G.vacation + ":town", 53) % 4; } // days run 2..8
function _sponsorInTown(id) {
  if (!_hasSponsor(id)) return false;
  const s = _sponsorStart(id);
  return G.day >= s && G.day <= s + 2;
}
function _sponsorFamilyDay(id) {
  return _sponsorInTown(id) && G.day === _sponsorStart(id) + _hh(id + ":" + G.vacation + ":family", 89) % 3;
}

// Soi 6 upstairs drink-minimum. A hash-picked minority of Soi 6 girls (and the
// bars behind them) run a "buy me a few lady drinks before we go upstairs"
// policy — the bar wants its spend, the girl wants to warm up. It's quoted only
// when you make the move, and rushing the ask on a single drink is exactly what
// trips it; a couple more drinks and it lifts. Reputation girls don't bother.
// N (3–5) is stable per (girl, vacation), shared-world-safe like _quizBars.
function _soi6DrinkMin(id) {
  if (_room().barType !== "soi6" || NPC_ROLES[id] !== "hostess") return 0;
  if (POPULAR_GIRLS.includes(id)) return 0;
  const h = _hh(id + ":" + G.vacation + ":dmin", 83);
  if (h % 100 >= 40) return 0;        // ~40% run the policy
  return 3 + (h >>> 16) % 3;          // 3, 4, or 5
}

// ── Nira's loan: borrow at 20%, due in three days, and she always gets paid ──
// A village short-time loan run out of a go-go: BORROW at Neon Paradise, owe
// principal +20%, due in three days. Miss the date and it compounds 20% a night
// while her cousins escalate from a text, to asking around, to garnishing the
// cash in your pocket. One loan at a time. Pure-ish (only touches G + _say).
const LOAN_MAX = 20000, LOAN_MIN = 1000, LOAN_DAYS = 3;
function _loanRound(n) { return Math.ceil(n / 100) * 100; }          // to the hundred
function _loanTerms(amt) { return _loanRound(amt * 1.2); }           // principal +20%
function _withNira() { return _npcsHere().includes("nira"); }
function _parseBaht(arg) {
  const s = String(arg == null ? "" : arg).replace(/[,\s฿]/g, "");
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const t = parseThaiDigits(s);
  return t == null || Number.isNaN(t) ? null : t;
}

// What you owe, on demand — the readout that didn't exist. Covers Nira's loan,
// the hotel book and the old man's note, because a player carrying all three had
// no single place to see any of them (debt playtest 2026-08-24).
function _doDebt() {
  const lines = [];
  if (G.loan) {
    const late = G.day > G.loan.dueDay;
    lines.push(_fmt(late
      ? "Nira: ฿{o}, and it was due on day {d}. It goes up every night you leave it, and her cousins have your dawns."
      : "Nira: ฿{o}, due on day {d}. Early is cheaper than late, and late is not the expensive part.",
      { o: _num(G.loan.owed), d: G.loan.dueDay }));
  }
  if (G.hotelDebt > 0) {
    lines.push(_fmt("The hotel: ฿{h} on the book. Nobody checks out of a debt.",
      { h: _num(G.hotelDebt) }));
  }
  if (_barOwned() && G.bar && (G.bar.owed > 0 || G.bar.arrears > 0)) {
    lines.push(_fmt("The old man: ฿{o} left on the bar" +
      (G.bar.arrears > 0 ? ", and ฿{a} of it already late. He has not mentioned it." : "."),
      { o: _num(G.bar.owed), a: _num(G.bar.arrears || 0) }));
  }
  if (!lines.length) {
    _say("You don't owe anybody anything, which in this town is a kind of achievement " +
      "and not a permanent one.");
    return;
  }
  _say("── WHAT YOU OWE ──", "alert");
  for (const l of lines) _say(l);
  if (G.loan) _say("(REPAY <amount>, or REPAY to clear it.)", "dim");
}

function _doBorrow(arg) {
  if (G.money > 100000 && G.room === _npcRoom("nira")) {
    // she counts money for a living (millionaire playtest 2026-08-22)
    _say("Nira's eyes go to your pocket before they go to your face, and the calculator " +
      "stops. \"You want to borrow.\" A pause exactly long enough to be rude. \"From me. " +
      "Tonight.\" She goes back to counting. \"No. Whatever this is, it is not money, and " +
      "I only do money.\"");
    return;
  }
  if (G.loanSkipped && G.room === _npcRoom("nira")) {
    _say("Nira doesn't look up from the calculator. “You.” One word, and the whole last trip is in it. " +
      "“You fly home with my money. Now you want more?” She laughs, once, not warmly. “No. Not you. Not ever.”", "alert");
    return;
  }
  if (!_withNira()) {
    _say("Nobody here is lending. Nira reads the room from the stage at Neon Paradise, on " +
      "Walking Street — ASK her ABOUT LOAN first.", "dim");
    return;
  }
  if (G.loan) {
    _say(`"One loan at a time." Nira taps the bar. "You owe ฿${G.loan.owed}, due day ` +
      `${G.loan.dueDay}. REPAY that, then we talk about more."`, "alert");
    return;
  }
  let amt = _parseBaht(arg);
  if (!amt) {
    _say(`"How much?" Her pen hovers. (BORROW <amount> — up to ฿${LOAN_MAX}, pay back +20% ` +
      `in ${LOAN_DAYS} days.)`, "dim");
    return;
  }
  amt = Math.round(amt / 100) * 100;
  if (amt < LOAN_MIN) { _say(`"Under ฿${LOAN_MIN}? Ask your mother, not me."`, "dim"); return; }
  if (amt > LOAN_MAX) {
    _say(`"฿${LOAN_MAX} is your ceiling — I already worked out what you earn and rounded it ` +
      `down." She will not be moved.`, "dim");
    return;
  }
  const owed = _loanTerms(amt);
  G.loan = { principal: amt, owed, dueDay: G.day + LOAN_DAYS, strikes: 0 };
  G.money += amt;
  _say(`Nira counts out ฿${amt} without once breaking eye contact. "You pay back ฿${owed} by ` +
    `day ${G.loan.dueDay}. ยี่สิบ — twenty percent, like I said. After that day…" the smile ` +
    `stays warm and goes nowhere "…it grows, and my cousins get bored. Don't make them bored."`, "win");
  _say(`(You owe Nira ฿${owed}, due day ${G.loan.dueDay}. REPAY at Neon Paradise — pay early, ` +
    `pay whole, whatever you like.)`, "dim");
}

function _doRepay(arg) {
  if (!G.loan) { _say("You don't owe Nira a baht. Keep it that way.", "dim"); return; }
  if (!_withNira()) {
    _say(`You owe Nira ฿${G.loan.owed}${G.loan.strikes ? " (overdue)" : `, due day ${G.loan.dueDay}`}. ` +
      `Pay her at Neon Paradise on Walking Street.`, "dim");
    return;
  }
  let amt = arg ? _parseBaht(arg) : G.loan.owed;
  if (amt == null) amt = G.loan.owed;
  amt = Math.min(amt, G.loan.owed);
  if (amt <= 0) { _say('"Pay me something real."', "dim"); return; }
  if (G.money < amt) {
    _say(`You're ฿${amt - G.money} short of that. (You have ฿${G.money}; you owe ฿${G.loan.owed}.)`, "alert");
    return;
  }
  const late = G.loan.strikes > 0;
  G.money -= amt;
  G.loan.owed -= amt;
  if (G.loan.owed <= 0) {
    G.loan = null;
    _say(`Nira takes the last of it and, for the first time, the calculator behind her eyes ` +
      `clicks off. "Paid." ` + (late
        ? `"Late — but paid. I remember both." A nod that is almost respect.`
        : `"On time, even. You, I lend to again — better rate." That is a genuine smile.`), "win");
    _addBond("nira", late ? 1 : 2); // a man who pays earns her regard
    if (!late) _repGain(); // squaring a debt on time is good for your name; late is just even
  } else {
    _say(`"฿${amt}." She marks it in a little book. "Still ฿${G.loan.owed}` +
      (late ? ` — and climbing." ` : `, by day ${G.loan.dueDay}." `) + `Back to the stage.`, "room");
  }
}

// Called from _endNight after the day rolls: overdue loans compound and the
// cousins escalate. Text → asking around → garnishing the cash you carry.
function _loanNightRoll() {
  if (!G.loan || G.day <= G.loan.dueDay) return;
  G.loan.strikes = (G.loan.strikes || 0) + 1;
  G.loan.owed = _loanRound(G.loan.owed * 1.2); // overdue: +20% a night
  if (G.loan.strikes === 1) {
    _say(`(A text from a number you don't have: "You are late, na. It is ฿${G.loan.owed} now, ` +
      `and it only goes up. Come see me. — N")`, "alert");
  } else if (G.loan.strikes === 2) {
    _say(`(Two men you've never met were asking the bar staff about you last night — polite, ` +
      `patient, unhurried. You owe Nira ฿${G.loan.owed}. This is the last quiet night you get.)`, "alert");
  } else {
    const take = Math.min(G.money, G.loan.owed);
    G.money -= take;
    G.loan.owed -= take;
    _addHappy(-6);
    // A man with nothing, being carefully robbed of nothing, every dawn, was the
    // whole of the late-loan endgame: nine consecutive mornings printed the full
    // robbery scene over ฿0 (debt playtest 2026-08-24). They still come — that is
    // the point of them — but finding empty pockets is a different beat.
    if (take <= 0) {
      _say("(They are waiting at dawn again, and again there is nothing to take. One of them " +
        "looks at your empty hands for slightly too long. \"She knows you are still here,\" he " +
        "says, not unkindly, and they go. The arithmetic has not moved. It never moves in your " +
        `favour: ฿${_num(G.loan.owed)}.)`, "alert");
      return;
    }
    if (G.loan.owed <= 0) {
      G.loan = null;
      _say(`(Nira's cousins catch you outside the 7-Eleven. No drama, no marks — they just wait ` +
        `while you empty your pockets: ฿${_num(take)}. "Nira says thank you. She says don't do this ` +
        `again." Square. The lesson was never going to be cheap.)`, "alert");
    } else {
      // NB ฿{owed} here is what is LEFT after the sweep — the old wording read
      // "lift the ฿X off the ฿Y you owe", which invited the player to subtract
      // and land on a number that was never true.
      _say(`(Nira's cousins find you and lift the ฿${_num(take)} you're carrying. ` +
        `"The rest soon, na." They are very calm about it, and that is the frightening part. ` +
        `Still owing: ฿${_num(G.loan.owed)}.)`, "alert");
    }
  }
}

// ── The Adonis Club: a male host bar, priced at the premium end ──────────────
// The go-go gender-flipped, kept off the female-coded barfine engine. BUY DRINK
// FOR <host> warms him; HIRE <host> is the club "off" fee. Open to every
// orientation — engaging is the player's own choice, never assumed — and the
// prose is honest that most hosts are gay-for-pay (Arm) while a few (Win) are not.
const _HOSTS = ["arm", "win"];

// Which verbs a character affords, as frontend-agnostic action keys — the single
// source of truth the terminal wheel (and a future 2D tap UI) reads to decide
// which buttons to show. `full` is the long-press wheel; the short menu is the
// always-safe subset. Works for any character id: a patron (not in NPCS) or an
// unroled NPC gets the plain talk/examine/photo set. Rendering (labels, command
// strings, her/him) stays in the frontend; this returns only the SET.
// ── The street compass ──────────────────────────────────────────────────────
// Which of the four cardinals you can actually walk from here, and whether a
// compass is worth showing at all. Engine-side on purpose: term.js renders the
// wheel but must not know the map (rail 1). A bar has only `out`, so the
// compass stays out of venues — which is also how it can share the fab slot
// with the bell without either having to know about the other.
const _NAV_DIRS = ["n", "e", "s", "w"];

function _navDirs() {
  const ex = (_room() && _room().exits) || {};
  return _NAV_DIRS.filter(d => !!ex[d]);
}

// What you can step INTO from here, as ready-made commands. Two shapes exist in
// the world data and the player shouldn't have to know which is which: a room
// with one door carries `in: <room>`, a soi lined with bars carries `venues: []`
// and no `in` at all. Both come back as {cmd,label} so the compass's middle
// button can offer either without term.js reading the map (rail 1).
function _navEnter() {
  const r = _room();
  if (!r) return [];
  const out = [];
  if (r.exits && r.exits.in) {
    const nm = (typeof _barName === "function" && _barName(r.exits.in)) ||
      (ROOMS[r.exits.in] && ROOMS[r.exits.in].name) || "inside";
    out.push({ cmd: "in", label: nm });
  }
  for (const id of r.venues || []) {
    const nm = (typeof _barName === "function" && _barName(id)) ||
      (ROOMS[id] && ROOMS[id].name) || null;
    if (nm) out.push({ cmd: "enter " + nm.toLowerCase(), label: nm.replace(/\s*\(.*\)$/, "") });
  }
  return out;
}

// Show the compass outdoors — anywhere with a cardinal to take. Deliberately
// NOT "every room with exits": an interior's `out` is already one tap away in
// the scene panel and the chip bar, and a wheel with one live arrow and three
// dead ones reads as broken.
function _navHere() {
  // _sheltered() is the game's existing "indoors" test (rain uses it to decide
  // what counts as diving inside), so reuse it rather than inventing a second
  // definition that can drift from it. It misses the hotel rooms — they are
  // neither bar nor shop — and they are exactly the case that motivated this:
  // hotel_room lists BOTH `out` and `s` to the same soi, so a naive test lit
  // one arrow and greyed three, which reads as a broken compass.
  const r = _room();
  // …with ONE exception: a torch still burning indoors. The compass is a street
  // tool and hides inside, which took the torch button with it — so a player
  // who walked in from a dark lane with it on was told "best switch that off"
  // by prose, teased by the girls, and stood up at by go-go security, with no
  // tappable way to obey. Three separate times she had to reach for a keyboard
  // she does not enjoy using (round 24, Pauline). The compass shows indoors
  // only while the light is on, and _navDirs greys the directions out.
  if (!r || (typeof _sheltered === "function" && _sheltered(G.room)))
    return !!(G && G.lightOn);
  if (/^Your Room/.test(r.name || "")) return false;
  return _navDirs().length > 0;
}

function _npcActions(id, full) {
  const isNpc = !!(typeof NPCS !== "undefined" && NPCS[id]);
  const role = isNpc && typeof NPC_ROLES !== "undefined" ? NPC_ROLES[id] : null;
  const isHost = isNpc && _HOSTS.includes(id);
  const isPerformer = isNpc && typeof _CABARET_PERFORMERS !== "undefined" && _CABARET_PERFORMERS.includes(id);
  // PHOTO is off the card deliberately (playtest, 2026-08-11): on a character
  // menu it reads as "show me a bigger picture of her", not "take one" — a
  // tester tapped it expecting the portrait to enlarge and got the mamasan
  // confiscating his camera. The verb is untouched (typed, autocomplete, HELP,
  // and the gallery rows still enlarge on tap); it just stops advertising
  // itself in the one place its name is ambiguous.
  const acts = ["talk", "examine"];
  if (role) acts.push("buyher");             // hostess/cashier/mamasan economy
  else if (isHost) acts.push("buyhim");      // host bar, gender-flipped

  if (full) {
    // cabaret performers: the courtship rails (drinks/flirt/tip/contact) with
    // no barfine — the theatre keeps no ledger (_doBarfine's peacock branch)
    if (isPerformer) acts.push("flirt", "tip", "contact");
    // BARFINE stays on the long-press only, never the quick tap: it spends four
    // figures and ends the night, and term.test guards that deliberately. It
    // takes the slot PHOTO left in the FULL menu, which is where it belongs.
    // KISS/SPANK/FONDLE are deliberately NOT here — Dave's thumbs-only tap
    // audit (round 32, 2026-08-30) flagged them as untappable, but Mario's call
    // is they're slated for removal as separate verbs (extensions of FLIRT),
    // so exposing them further on the wheel would be wasted work.
    else if (role === "hostess") acts.push("barfine", "flirt", "tip", "contact");
    else if (role === "cashier") {           // the sponsor-cashier arc's verbs (were typed-only)
      acts.push("tip", "contact");
      if (typeof _sponsorFlipped === "function" && _sponsorFlipped(id)) acts.push("barfine");
    }
    else if (isHost) acts.push("hire");      // the club "off" fee
    else if (isNpc && !role) acts.push("wai"); // a plain punter/NPC — just a polite wai
    // Tan's standing food invite is a real option, so it gets the third surface
    // (parser + autocomplete + here). Hidden during Act One, when he refuses.
    if (id === "tan" && typeof _flag === "function" && _flag("act1Done")) acts.push("follow");
    if (id === "nont" && typeof _flag === "function" && _flag("hasWallet")) acts.push("cash");   // the priced fixer's verb on his own wheel
    // A WAI IS ALWAYS AVAILABLE TO A PERSON, and Act One is SOLVED with one:
    // the game says "(Manners might open it. A proper wai.)" and Madam Oy's
    // menu offered talk / examine / buy her a drink. A player who taps rather
    // than types could not finish the opening quest of the game (round 24,
    // Pauline, who plays on a phone because her thumbs hurt). Everyone gets it.
    if (NPCS[id] && !acts.includes("wai")) acts.push("wai");   // …but not at a name nobody has
    // Mot's dinner, same three-surface treatment: the wheel is where a player
    // who never guesses "buy mot dinner" finds it. Only while it's undone.
    if (id === "mot" && typeof _flag === "function" && !_flag("motFed")) acts.push("motdinner");
  }
  return acts;
}

function _hostBar() { return !!_room().hostBar; }
function _hostHere(arg) {
  const id = arg ? _findNpc(arg) : null;
  return _HOSTS.includes(id) ? id : null;
}

function _doHostDrink(arg) {
  const id = _hostHere(arg) || (!arg ? "arm" : null);
  if (!id) { _say("Buy a drink for which host — ARM (4) or WIN (9)? (BUY DRINK FOR WIN.)"); return; }
  if (G.money < HOST_DRINK) {
    _say(`A host drink is ฿${HOST_DRINK} — twice a lady drink, the premium end. You have ฿${G.money}.`);
    return;
  }
  G.money -= HOST_DRINK;
  _addBond(id, 1);
  _say(`฿${HOST_DRINK} for a host drink — twice what the girl bars charge, and ${NPCS[id].name} settles ` +
    `in warm and close and turns his whole attention on you like a spotlight. (฿${G.money} left.)`);
  _addHappy(1);
}

function _doHire(arg) {
  if (!_hostBar()) { _say("Nobody to hire here — that's a host-bar thing. The Adonis Club, in Supertown, Jomtien."); return; }
  const id = _hostHere(arg);
  if (!id) { _say("Hire which host — ARM (number 4) or WIN (number 9)? (HIRE WIN.)"); return; }
  if (!_flag("act1Done")) { _say("Not tonight — you've a wallet to find first."); return; }
  if (G.money < HOST_OFF) {
    _say(`The club "off" fee is ฿${HOST_OFF} — double a go-go barfine — before whatever you two settle ` +
      `after. You have ฿${G.money}.`);
    return;
  }
  G.money -= HOST_OFF;
  const bonded = (G.soc.drinks[id] || 0) >= 3;
  if (id === "win") {
    _say(`฿${HOST_OFF} to Nott, and Win — who isn't pretending, and you both know it — takes you out into ` +
      `the warm Jomtien night. Whatever you are, he meets it head-on and without a single performance note. ` +
      `Nott will scold him in the morning for how much he meant it. (฿${G.money} left.)`, "win");
  } else {
    _say(`฿${HOST_OFF} to Nott, and Arm trades the club grin for something easier the moment you're out the ` +
      `door. He's a professional and honest about it — gay-for-pay, a good night's work, nobody lied to ` +
      `anybody — which makes it, in its clean way, one of the more comfortable transactions in this town. ` +
      `(฿${G.money} left.)`, "win");
  }
  _addHappy(bonded ? 8 : 5);
  // The prose says you left the building; the game left you standing in it for a
  // single turn, with the host still on the roster (persona report A#13,
  // 2026-08-23). Compare the short-time barfine, which costs ~6 ticks. Same here.
  G.soc.hostOut = G.soc.hostOut || {};
  G.soc.hostOut[id] = true;                 // he is off the floor for tonight
  _passTime(Math.min(6, Math.max(0, NIGHT_TURNS - 1 - G.nightTurn)));
}

// Bert's girls, closing ranks after you threw in with White Dish. {name} is the
// girl you tried to barfine. Repeatable, so pooled.
const _BERT_LOYAL = [
  "{name} starts to smile, then something shutters behind her eyes — she's clocked whose water you " +
    "carry now. \"You come to Bert's bar, after Bert?\" She steps back off the stool. \"No. Not me, not " +
    "any girl here.\" The whole rail has gone quiet and cold. Bert looks after his girls; his girls look " +
    "after Bert. Not tonight, and not any night you're White Dish's man.",
  "You start the ask and {name} is already shaking her head, gently, finally. \"We know who buy our som " +
    "tam when it rain, tilac. Not the man with the QR code. Not you.\" She turns her shoulder; down the " +
    "bar another girl does the same, and another — a slow wave of no. Bert doesn't even look up from the felt.",
  "\"Barfine? Me?\" {name} laughs, and there's no fun in it. \"You sell out the man who keeps this bar " +
    "open, then you want to take his girl home?\" She flicks two fingers — not an invitation, a dismissal. " +
    "\"Every girl here heard what you did. The Stinky's closed to you, that way.\"",
  "{name} glances to Bert at the end of the bar, reads something in the set of his shoulders, and steps " +
    "back. \"Sorry, tilac. Not you. Not here.\" No anger — just a door quietly shut. Bert's girls don't " +
    "cross Bert, not for you, not for all the baht in Ryan Powers' spreadsheet.",
];
// The Peacock sells a show, not a night — no mamasan ledger, no fine, and Miss
// Mala has retired the question so many times it has its own choreography.
// Courtship with the performers runs on the honest rails instead: drinks, tips,
// bond, CONTACT — same for a bi player as for anyone she'd actually choose.
const _PEACOCK_NO_BF = [
  "Miss Mala doesn't even break stride at the mic. \"He wants to BARFINE somebody!\" The room " +
    "howls. \"Tilac, this is a THEATRE. You cannot barfine the show. You can tip the show, you " +
    "can buy the show a drink, you can fall in love a little — everybody does — but at two a.m. " +
    "the show goes home to its own bed to rest its face.\" A wink with the wattage of the rig. " +
    "\"Court like a gentleman or clap like one. Both are welcome.\"",
  "The idea reaches Miss Mala before the sentence does. \"No fine here, tilac — my stars are not " +
    "on a ledger.\" Said kindly, and with total finality, the way you'd tell a man the museum " +
    "pieces aren't for sale. \"You like one of my girls? Come back. Tip. Learn her name and use " +
    "it. That currency we take.\"",
];
function _doBarfine(arg) {
  // BARFINE at the girl on your own arm: the ledger has nothing to sell you
  if (G.party && G.party.ids && G.party.ids.length && arg) {
    const _pid = G.party.ids.find(i => arg.toLowerCase().includes(NPCS[i].name.toLowerCase()));
    if (_pid) {
      _say(_fmt("{n} laughs and squeezes your arm. \u201cTilac. You already pay for " +
        "tonight \u2014 I am HERE.\u201d Which, on reflection, is hard to argue with.",
        { n: NPCS[_pid].name }));
      return;
    }
  }
  const rm = _room();
  // The bar you OWN: these are your staff, and a barfine is a fee paid to the
  // bar — you'd be paying yourself. The verb quoted a fine for the owner's own
  // employee, flatly contradicting his mamasan's "cannot barfine your own bar"
  // (Ronnie, 2026-08-26). It's not a transaction here; it's the relationship layer.
  if (typeof _atOwnBar === "function" && _atOwnBar()) {
    _say(_pickVary(_OWN_BARFINE_NO, "ownbf"), "alert");
    return;
  }
  // the Orchid Room's women are the power players' — you're here for a meeting, not to shop
  if (G.room === "orchid_room") { _say(_pickVary(_ORCHID_NOTOUCH, "orchidno"), "alert"); return; }
  if (rm.hostBar) { _doHire(arg); return; }
  if (rm.massage === "oil") {
    _say("No barfine here — she's a masseuse, not a bar girl, and there's no mamasan to " +
      "square. Buy the massage, ask for the SPECIAL, and if you want the rest she'll tell " +
      "you to catch her after her shift.");
    return;
  }
  if (rm.massage === "legit") { _say("You are in a legitimate massage shop. Have a word with yourself. (MASSAGE)"); return; }
  if (rm.soapy) { _say("It doesn't work like that here — it's a set package. (SOAPY to pick a number.)"); return; }
  // the cabaret: performers, not floor — Miss Mala retires the idea with style
  if (G.room === "peacock_cabaret") { _say(_pickVary(_PEACOCK_NO_BF, "pcnobf")); return; }
  if (!_inBar()) { _say("Barfines are negotiated indoors, with the mamasan watching."); return; }
  const here = _npcsHere().filter(id => NPC_ROLES[id]);
  const id = arg ? _findNpc(arg) : (here.length === 1 ? here[0] : null);
  if (id === "cream") { _chamAsk(); return; } // the civilian at the table: the inevitable question (chameleon economy)
  if (!id || !NPC_ROLES[id]) { _say(arg ? "She's not working this bar." : "Barfine whom, exactly?"); return; }
  const name = NPCS[id].name, role = NPC_ROLES[id];
  if (role === "mamasan") { _say(`You cannot barfine ${name}. She IS the bar. She looks almost flattered. Almost.`); return; }
  // a ladyboy: for a straight player, a gracious pass; for a bi player, proceed normally
  if (_ladyboyGate(id)) return;
  // Cross Bert (go WDG) and his whole bar closes to you — the girls run on his
  // goodwill, not White Dish's, and none of them will go with the man who came
  // in to sell him out. (See Bert's iced greeting; same trigger.)
  if (G.room === "stinky_bar" && _faction("wdg") > 0) {
    _say(_pickVary(_BERT_LOYAL, "bertloyal").replace("{name}", name));
    return;
  }
  if (role === "cashier") {
    if (NPCS[id].orientation === "gay") {   // a tom — wrong shop, and she'll tell you
      _say(`${name} laughs — actually laughs. "Tilac, wrong shop. I like the ladies, same as ` +
        "you. Plenty girls here for you. Not me.\"");
      return;
    }
    if (NPCS[id].type === "kin") {           // family, not floor — at any price
      _say(`${name} doesn't look up from the till. "I am family here, not floor. No bell, no ` +
        "money, no night change that. Buy one of the girls a drink — I ring it up.\"");
      return;
    }
    if (NPCS[id].type === "sponsor" && !_sponsorFlipped(id)) {
      _say(`${name} shows you a fraction of {{her phone}} without quite meaning to — a farang ` +
        "name, a bank notification. \"I have someone. He take care of me, I stay good for him. " +
        "Not for sale, tilac.\" She means it — for now. Everything on this soi has a number, and " +
        "you have not reached hers.", "alert");
      return;
    }
    if (!NPCS[id].type && (G.soc.bells[G.room] || 0) < 2) {
      // The gate needs TWO rings, and the hint used to say so with no memory of
      // the one already rung — Reg rang the bell, then hit this same line as if
      // he hadn't (round 32, 2026-08-30). Say what it actually still wants.
      const rung = G.soc.bells[G.room] || 0;
      _say(`${name} taps the till: somebody has to count the money. (Cashiers do go, ` +
        `sometimes — for the right customer, on the right night. The bell defines both` +
        (rung === 1 ? " — and you're halfway there. One more ring." : ".") + ")");
      return;
    }
  }
  if (!_flag("act1Done")) {
    _say("And take her where? You have no room key, sand in your shoes, and a " +
      "wallet situation. Sort your night out first, Casanova.");
    return;
  }
  if ((G.soc.heat[G.room] || 0) > 0) {
    // The book shuts on heat — but a refusal citing "behaviour" the player was
    // never told about held all night with no path to comprehension (closer
    // playtest F5, 2026-08-26). Heat carries its cause now, and the finger
    // points at it.
    const _why = G.soc.heatWhy && G.soc.heatWhy[G.room];
    _say("The mamasan intercepts the negotiation with one raised finger. After " +
      "tonight's behaviour? “Not tonight, tilac.” The finger does not negotiate." +
      (_why ? ` (${_why} — the book closes for the shift. A new night forgets.)` : ""));
    return;
  }
  const bt = _room().barType;
  // Do right by Bert (or spite White Dish) and his whole bar warms to you: his
  // girls need less coaxing and won't turn a friend of Bert's down. The mirror
  // of the WDG-stooge freeze-out above.
  const bertAlly = G.room === "stinky_bar" && (_faction("indie") > 0 || _faction("wdg") < 0);
  // HARD day-level refusals pre-empt the favor gate: a kept girl with her
  // sponsor in town (or a mama-held draw) was NEVER coming tonight, but the
  // favor gate spoke first — so a punter courted her ~฿1,050 deep before the
  // one reason that was always true was allowed to surface (Gaz playtest,
  // 2026-08-17). Truth before tariff.
  if (!bertAlly && _isDraw(id) && G.nightTurn < 60) { _bfRefusalSay(id, { kind: "draw" }); return; }
  if (!bertAlly && _sponsorInTown(id) && !_sponsorFamilyDay(id)) { _bfRefusalSay(id, { kind: "sponsor" }); return; }
  // The SAME "already with another customer" state that declines a lady drink
  // (_girlBusy — Soi 6 etiquette, ~1 girl in 4 per hour) said nothing to the
  // barfine negotiation, so she could turn down a drink for being occupied and
  // then quote a whole night's fine thirty seconds later (Reg the publican,
  // round 32, 2026-08-30). One state, both consumers.
  if (!bertAlly && typeof _girlBusy === "function" && _girlBusy(id)) { _bfRefusalSay(id, { kind: "busy" }); return; }
  // Truth before tariff, part two (Gerry, round 34): the favor gate quoted
  // "one more lady drink, then we talk", he paid the stated condition twice,
  // and only then did the day-level life refusal speak — ฿380 for a no that
  // was always true. The deterministic day facts now pre-empt the tariff the
  // same way draw/sponsor/busy do; the favor-dependent refusals stay behind
  // the gate, because those genuinely ARE about the tab.
  if (!bertAlly) {
    const dayNo = _bfDayRefusal(id);
    if (dayNo) { _bfRefusalSay(id, dayNo); return; }
  }
  const _bfGate = bertAlly ? 1 : bt === "soi6" ? 2 : 4;
  if (_favor(id) < _bfGate) {
    // she names the REAL remaining count — a stated tariff that doesn't count
    // is a lie with a smile on it (grapevine playtest F12, 2026-08-25). That
    // fix only landed on the soi6 branch; Reg the publican caught the other
    // three venue classes still stonewalling with the same vague line no
    // matter how much he'd spent (round 32, 2026-08-30) — every branch now
    // names the count.
    const _need = Math.max(1, _bfGate - _favor(id));
    _say(bt === "soi6" ?
      `${name} laughs, not unkindly: “${_need === 1 ? "One more lady drink" :
        "Lady drink first, na. Two"}, then we talk.” Even ` +
      "Soi 6 has liturgy." :
      `${name} pats your hand: “You sweet. But buy me drink, talk to me a little — ` +
      `${_need === 1 ? "one more" : _need + " more"}, then we talk. This is ` +
      "Pattaya, not a vending machine.”");
    return;
  }
  if (bertAlly) {
    _say(`Word's got round that you did right by Bert, and the whole rail is a degree ` +
      `warmer for it. ${name} doesn't make you work for the yes — Bert's friends drink ` +
      "easy at the Stinky.", "dim");
  } else {
    // She can say no — and the sting is that it lands after the drinks you
    // invested in the rapport. Veterans ask early for exactly this reason.
    const refusal = _bfRefusal(id, bt);
    if (refusal) { _bfRefusalSay(id, refusal); return; }
  }
  // MAMA LETS HER GO — after midnight at a beer bar, the fine is waived, but
  // not for a walk-up: she lets a girl leave for nothing to a REGULAR, and to
  // anybody else once she has seen a drink each go across the bar, one for
  // you and one for the lady (Mario, 2026-09-03). Measured in the unit she
  // names — drinks bought tonight, here — never in favor.
  if (bt === "beer" && G.nightTurn >= 60 && !bertAlly && _barfinePrice(bt, id) === 0 &&
      _knownTier(id) < 2) {
    const mine = (G.soc.selfDrinks && G.soc.selfDrinks[G.room]) || 0;
    const hers = (G.soc.drinkCount && G.soc.drinkCount[id]) || 0;
    if (mine < 1 || hers < 1) {
      const mama = _npcsHere().find(n => NPC_ROLES[n] === "mamasan") ||
        (typeof _tillKeeper === "function" && _tillKeeper());
      const who = mama ? NPCS[mama].name : "The mamasan";
      _say(`${who} is already shaking her head, not at the girl — at the bar in front of you. ` +
        (mine < 1 && hers < 1 ? "\"Book is closed, no fine, she can go — but you sit in my bar and buy " +
          "nothing? One for you, one for her. Then we talk.\"" :
         mine < 1 ? "\"You buy for her and not for you? Sit like a customer. One beer. Then we talk.\"" :
          "\"No fine after midnight, tilac — but you don't take my girl dry. One drink for her. " +
          "Then we talk.\"") + " The head-shake is friendly. It is also final.", "dim");
      _say("(A drink each across her bar, and the book being closed is your good luck. " +
        "A regular she'd have let go already.)", "dim");
      return;
    }
  }
  // The negotiation. On Soi 6 the girl quotes upfront — volume business, no
  // mystery. Everywhere else the girl won't name the number (she gets a cut):
  // the mamasan or the cashier drifts over to do the arithmetic.
  const { st, lt, herMoney } = _barfinePrices(bt, id);
  G.pendingBf = { id, st, lt, party: _partyPrice(id, lt), room: G.room, herMoney: !!herMoney };
  // The Operator's edge made visible: on a girl who's actually running an angle,
  // his instinct flags it before the money moves (and _scamLean already halves his
  // odds of being taken). Fires once, on opening — the reprompt/redraw is _bfPrompt.
  if (typeof _pers === "function" && _pers("operator") &&
      (_bfExploitable(id) || NPCS[id].type === "drunk" || NPCS[id].type === "volatile")) {
    _say("(Operator's instinct, cold and useful: something here doesn't sit right — the " +
      "way she's counting the room, the too-quick yes. You keep a hand near your wallet " +
      "and your wits about you.)", "dim");
  }
  if (bt === "soi6") {
    _say(`${name} counts it out on her fingers, upfront as a menu — she quotes ` +
      "upstairs the way a noodle cart quotes noodles, one eye still counting " +
      `the room over your shoulder.` +
      (G.nightTurn < 30 && lt > st ? " The long-time number lands with a small " +
        "apologetic shrug: take a Soi 6 girl off the floor for a whole night " +
        "this early and the mamasan prices her like a go-go headliner." : ""));
  } else {
    const stf = _npcsHere().find(n => NPC_ROLES[n] === "mamasan") ||
      _npcsHere().find(n => NPC_ROLES[n] === "cashier");
    const who = stf ? NPCS[stf].name : "the mamasan";
    _say(`${name} brightens and says nothing at all about money — that is not ` +
      `her department, and the cut she gets from it is nobody's business. ` +
      `${who} materialises at your elbow with the pleasant, final air of ` +
      "someone who does this arithmetic all night.");
  }
  _bfPrompt();
}

// Why a girl turns the ask down. Refusals stick for the night (she doesn't
// flip-flop) EXCEPT the recoverable ones: "cheap" clears if her favor grows,
// "mess" clears when you sober up. "stealing" is the bar's social physics:
// one girl has already left this bar with you tonight (G.soc.bfBar), and no
// colleague will be seen taking another girl's customer — even if she's off
// shift or already gone. Life reasons (lady time, temple) are a stable hash
// per girl per day: honest, upfront, and immovable.
// The refusals that are true regardless of the tab — a colleague already left
// with you tonight, her day of the month, temple in the morning — checked
// BEFORE any tariff is quoted, so "one more drink, then we talk" can never
// front a no that was always coming (Gerry, round 34: ฿380 on a stated
// condition, then the hard refusal, then coaching to have asked earlier —
// when his first act in the bar HAD been to ask). The life roll here is the
// SAME pure hash _bfRefusal rolls, so the two can never disagree; the
// favor-dependent classes (cheap/dislike/mess) stay in _bfRefusal behind the
// gate, where a tariff is honest.
function _bfDayRefusal(id) {
  const held = G.soc.bfRefused && G.soc.bfRefused[id];
  if (held) {
    if (held.kind === "cheap" || held.kind === "mess") return null; // recoverable — the gate's business
    return { ...held, again: true };
  }
  const keep = kind => {
    (G.soc.bfRefused = G.soc.bfRefused || {})[id] = { kind, favor: _favor(id) };
    return G.soc.bfRefused[id];
  };
  if (G.soc.bfBar && G.soc.bfBar[G.room] && G.soc.bfBar[G.room] !== id) return keep("stealing");
  const life = _hh(id + ":" + G.day + ":" + G.vacation + ":life", 131) % 100;
  if (life < 10) return keep(life < 5 ? "period" : "temple");
  return null;
}

function _bfRefusal(id, bt) {
  const held = G.soc.bfRefused && G.soc.bfRefused[id];
  if (held) {
    if (held.kind === "cheap" && _favor(id) >= held.favor + 2) { delete G.soc.bfRefused[id]; return null; }
    if (held.kind === "mess" && G.soc.drunk < 4) { delete G.soc.bfRefused[id]; return null; }
    return { ...held, again: true };
  }
  const keep = kind => {
    (G.soc.bfRefused = G.soc.bfRefused || {})[id] = { kind, favor: _favor(id) };
    return G.soc.bfRefused[id];
  };
  // a prized DRAW: the mama won't let her go while she's pulling the early crowd.
  // Not held — it lifts at midnight (come back then, and pay a premium).
  if (_isDraw(id) && G.nightTurn < 60) return { kind: "draw" };
  // a KEPT girl whose sponsor is in town this week isn't working — unless it's
  // his family night. Also not held: it's a day thing, not a mood.
  if (_sponsorInTown(id) && !_sponsorFamilyDay(id)) return { kind: "sponsor" };
  // the upstairs drink-minimum: not a mood, a tariff — re-checked each ask so a
  // couple more lady drinks lifts it (not held; it's about your tab, not the day).
  const dmin = _soi6DrinkMin(id);
  // Measured in DRINKS, because that is the word she uses. It compared favor,
  // and a lazy-drink girl credits only ~40% of what she's bought (_boughtBond
  // rolls it), so "5 lady drink first" stood after the eighth drink and ฿1,520
  // — a named condition met, exceeded, and never honoured (Stan, round 35).
  const _bought = (G.soc.drinkCount && G.soc.drinkCount[id]) || 0;
  if (dmin && _bought < dmin) return { kind: "drinkmin", need: dmin, have: _bought };
  if (G.soc.bfBar && G.soc.bfBar[G.room] && G.soc.bfBar[G.room] !== id) return keep("stealing");
  if (G.soc.drunk >= 6 && _rand() < 0.5) return keep("mess");
  const gate = bt === "soi6" ? 2 : 4;
  if (_favor(id) < gate + 2 && _rand() < 0.2) return keep(_rand() < 0.5 ? "cheap" : "dislike");
  // day goes MID-key (not trailing) so consecutive days don't hash to consecutive
  // values — _hh has no output mixing, so a trailing ":day" made this ~10% refusal
  // cluster into week-long runs (a girl refused every night of the vacation). The
  // constant ":life" suffix diffuses the day through the polynomial. (Sibling
  // callers _nightRide/_bfResolve already put day mid-key for the same reason.)
  const life = _hh(id + ":" + G.day + ":" + G.vacation + ":life", 131) % 100;
  if (life < 10) return keep(life < 5 ? "period" : "temple");
  return null;
}

function _bfRefusalSay(id, r) {
  const name = NPCS[id].name;
  if (r.again) {
    // The held cheap refusal lifts at +2 favor, and the first hint said "ask
    // again" without saying how much — so a player who bought ONE more drink hit
    // a wall that mocked him for following instructions (Tyler, 2026-08-26: "the
    // only time I felt played by the interface instead of by the town"). The
    // re-ask is a legible meter now: progress is acknowledged, in her voice.
    if (r.kind === "cheap" && _favor(id) > r.favor) {
      _say(`${name} tilts her head — the arithmetic has moved, and she lets you ` +
        "see her notice. “Mmm. Warmer, tilac.” A beat, a smile with actual " +
        "warmth in it. “Not warm ENOUGH, na. One more, talk little bit more.”");
      return;
    }
    _say(`${name} just gives you the same small headshake as before. She told ` +
      "you already" + (r.kind === "cheap" ? " — and the tab hasn't changed her mind for her."
        : `; you're still ${G.soc.drunk} deep — under four, she looks again.`));
    return;
  }
  const lines = {
    period: `${name} squeezes your hand and tells you straight, before a single ` +
      "baht moves: “Cannot tonight, tilac. Lady time, jing jing.” The honest " +
      "ones tell you BEFORE the fine is paid. Remember that.",
    temple: `${name} makes an apologetic temple of her own hands: “Cannot, na. ` +
      "I go temple in morning, make merit for my family. Buddha first, boom " +
      "boom later.” It has the ring of complete truth.",
    draw: `${name} says yes with her whole face — but the mamasan is already at her ` +
      "shoulder, all smiles and steel: “This one very popular, she bring me many " +
      "customer. You want? Twenty-five lady drink, five thousand bar fine.” It is " +
      "not a price. It is a NO with a number on it. (Come back after midnight, when " +
      "the floor is thin — she'll be cheaper, but never cheap.)",
    sponsor: `${name} touches your arm, honestly sorry: “Cannot now, tilac. My ` +
      "friend — he take care me, I no working while he in town. You " +
      "understand, na?” Everyone understands. It's a calendar, not a heartbreak.",
    dislike: `${name} looks at you kindly, which is worse: “You nice man. But ` +
      "no, na.” She signals the mamasan off with one flick of the eyes, and " +
      "the ledger never even opens. No is a complete sentence here.",
    cheap: `${name} does a quick, visible arithmetic on your evening's tab — ` +
      // the count is HER drinks, so the prose must own that: "none of them hers"
      // printed at a man who'd bought her two by name (Tyler, 2026-08-26)
      ((G.soc.drinks[id] || 0) === 0 ? "not one lady drink on it" :
       (G.soc.drinks[id] || 0) === 1 ? "the one lady drink, nursed" :
       `${G.soc.drinks[id]} lady drinks — she counts each fondly, counts the hours too, and the maths still comes up short`) +
      " — and pats your knee: “Maybe you buy me " +
      "drink first, na? Talk more.” The words CHEAP CHARLIE hang politely " +
      "unspoken. (A couple more drinks' warmth, and ask again.)",
    mess: `${name} leans back an honest inch. “Ooh. You smell like whole bar, ` +
      "tilac. Maybe shower first, sleep little bit.” Hard to argue from " +
      `${G.soc.drunk} bottles deep. (Get under four bottles and she'll look again.)`,
    busy: `${name} is with somebody else right now — the man beside her, whose ` +
      "evening this currently is. “Later, tilac,” she says, not unkindly, with a " +
      "small tip of the head toward him. Etiquette runs both ways here.",
    stealing: `${name} shakes her head before you finish asking, voice dropped ` +
      "low: “Cannot, na. You go with girl from here already — everybody see. " +
      "I don't steal customer.” It doesn't matter that the other girl is " +
      "gone; the rules of the floor outlast the shift.",
    drinkmin: `${name} is up for it — hand already on your arm — but she tips her ` +
      `chin at the mamasan minding the till: “Sure sure, tilac, but bar rule: ` +
      `${r.need} lady drink first, then upstairs.” Not a brush-off. A tariff. ` +
      "(You moved a shade fast — the ones who rush the stairs on one drink " +
      "always hit this. Buy her a couple more and ask again.)",
  };
  _say(lines[r.kind] || lines.dislike, "alert");
  if (["dislike", "stealing"].includes(r.kind)) {
    _say("(The rail's advice, too late: if going home together is the plan, " +
      "ask EARLY — before the night's invested in the wrong stool.)", "dim");
  }
}

// The negotiation prompt — single source, so the live line, the invalid-answer
// reprompt, and the restore redraw all read identically (see _renderResume).
// ── TAKE HER OUT: the party barfine (design call 2026-08-25) ─────────────────
// "A lot of punters will barfine a lady (or two) to go party on WS, sometimes
// staying out until dawn." The companion state lives on G.party = { ids, stops,
// spent, seen }; _partyArrive pays each NEW venue, _partyNightEnd settles the
// goodbye by how the night actually ended, and SLEEP with company converts to
// the long-time close (engine-play, top of _endNight).
// What the FULL night costs, by how much she'd rather spend it with you. A
// regular or better goes for the plain LT fine (she wants the night); below
// that, the price is the payout that makes her whole for the earning night
// she's giving up — steeper when the rail is full, softer when it's empty.
function _partyPrice(id, lt) {
  if (!lt) return lt;   // past-midnight waiver: her earning night is over anyway
  const tier = (typeof _bondTier === "function") ? _bondTier(id) : 0;
  if (tier >= 2) return lt;
  let mult = tier === 1 ? PARTY_MULT_FACE : PARTY_MULT_STRANGER;
  mult += SEASON_PARTY_BUMP[_seasonTier()];   // the rail's fullness, priced into her night
  return Math.max(lt, Math.round(lt * mult / 50) * 50);
}
function _partyLabel() {
  const ids = (G.party && G.party.ids) || [];
  const names = ids.map(i => NPCS[i].name);
  return names.length === 2 ? names[0] + " and " + names[1] : (names[0] || "");
}
const _PARTY_JOIN = [
  "{n} is off her stool before the ink dries, one arm through yours like it has always lived there. The bar sends you off with a chorus of advice in two languages, none of it repeatable and all of it warm.",
  "{n} takes exactly ninety seconds — a word to the mamasan, a swipe of something at the mirror, shoes that mean business — and reappears at the door already laughing at where the night might go.",
  "The fine is barely in the book before {n} has your hand. \u201cOkay. Tonight I show you how Thai people party, na \u2014 you keep up or you go home.\u201d The whole rail cheers you out the door.",
  "{n} slips off the clock the way a professional does — completely, instantly — and something in her face changes into her OWN night out. \u201cCome. First we walk, then we dance, then we see.\u201d",
];
const _PARTY_JOIN2 = [
  "{n} looks at {other}, {other} looks at {n}, and something is agreed at a frequency you will never be cleared for. Two arms now, one on each of yours, and the street ahead visibly adjusts its expectations.",
  "\u201cShe come too?\u201d {n} grins at {other} like a co-conspirator. \u201cOhh, tilac. Now is PARTY.\u201d They flank you out the door, already talking across you in Thai, already deciding where you're all going.",
];
const _PARTY_ARRIVE = [
  "{who} makes an entrance of your arrival — a wave here, a shriek of recognition there; she knows somebody at every rail in this town, and tonight you're the one she brought.",
  "In the new light {who} looks around like a landlady inspecting a property, delivers a verdict in Thai you don't need translated, and steers you to the exact right spot at the bar. There is always an exact right spot. She always knows it.",
  "{who} orders before you've sat down — hers, and the right thing for you, in that order — and clinks your glass like the night has just now properly started. Every bar, it has just now properly started.",
  "Walking in with {who} changes what the room does with you: the staff read her, recalibrate, and upgrade you from tourist to somebody's guest. It is a better class of welcome and you did nothing to earn it.",
  "{who} clocks the room in one sweep — who's working, who's pretending to, which table is trouble — and parks you with your back to the wall like a professional. \u201cOkay. Here is good.\u201d It is.",
];
const _PARTY_ARRIVE_CLUB = [
  "The bass hits like weather and {who} comes ALIVE — this is her music, her floor, her hour. She hauls you into the lights and for a while nobody in the building is having a better night than the two of you, and everybody can tell.",
  "Inside the club {who} stops being your companion and becomes the event: hands up, eyes shut, word-perfect on a song you've never heard. You hold the drinks. It is somehow the best job you've ever had.",
  "{who} surveys the club floor like a general given favourable terrain, picks the spot the speakers aim past rather than at, and dances you into the small hours one song at a time.",
];
const _PARTY_DRINKS = [
  "(Hers arrives without anyone asking — she's with you, and every bar in town understands the arrangement instantly. \u0e3f{c} on the night.)",
  "(A drink lands in front of {who} before you've found the menu. The tab knows. The tab always knows. \u0e3f{c}.)",
  "(The staff take one look and bring {who} the usual she's never ordered here before. \u0e3f{c} joins the evening's arithmetic.)",
];
const _PARTY_BROKE = [
  "({who} clocks the state of the wallet in one glance and waves the drink off before it lands — \u201cwater, ka\u201d — smooth enough that only you saw the arithmetic happen.)",
  "(No drink this stop \u2014 {who} reads the pocket situation and toasts you with somebody's abandoned glass of ice instead, entirely unbothered.)",
];
const _PARTY_DAWN = [
  "Dawn catches the party still standing. {who} finds you a taxi with the effortless authority of a woman who has closed more clubs than you've visited, folds you into it, and takes the second one herself — \u201cSleep, tilac. Tonight was GOOD one.\u201d It was. It really was.",
  "The sky goes shell-pink over the last of the bass. {who} — barefoot now, shoes in hand, entirely unwrecked — walks you to the taxi rank through the morning shift, orders your driver home in Thai, and waves till you turn the corner.",
  "You do the whole night, all of it, and at first light {who} pronounces the verdict — \u201cyou party like Thai person. Almost.\u201d — and pours you homeward with a promise to sleep till two that you will both honour completely.",
];
const _PARTY_RESCUE = [
  "The night wins. Somewhere between one bar and the next your legs file for divorce — and {who} catches you, swears once in Thai, and takes over the way a professional takes over: taxi, address out of your own phone, \u0e3f{c} from your shirt pocket counted out in front of you so you'd know it was correct. You wake in your own bed because she put you there.",
  "It goes dark somewhere loud. What you get back are fragments: {who}'s voice negotiating a taxi, your own weight moving without your help, a door that turns out to be yours. \u0e3f{c} gone from your pocket for the fare — counted, correct, and cheap at five times the price.",
  "You fall off the night mid-sentence. {who} has seen it a hundred times and wastes none of it on drama: home, bed, shoes off, a bottle of water on the nightstand you will weep with gratitude for at noon. The taxi took \u0e3f{c} of your money. She took nothing but her leave.",
];
const _PARTY_SOFT_BYE = [
  "(In the mess of the night's ending, {who} squeezes your arm once — \u201cyou okay? okay\u201d — and is gone into the town she knows better than trouble does.)",
  "({who} melts away somewhere in the confusion, professionally unentangled, with a backward glance that says the night was fun while it was fun.)",
];
const _PARTY_HOME_NUDGE = [
  "({who} looks at the room, then at you, and starts unhooking an earring with an air of complete arrival. SLEEP when you're ready \u2014 or the night is still out there if you've got legs left.)",
  "({who} kicks her shoes into the corner like she lives here and falls backward onto the bed, arms out. \u201cYour hotel is BORING, tilac. But the bed is good.\u201d SLEEP to call it \u2014 or drag her out for one more.)",
];

// each NEW venue with company on your arm pays the night — company สนุก is
// presence, never conquest, so it goes nowhere near the jading treadmill
function _partyArrive(to) {
  const p = G.party;
  if (!p || !p.ids || !p.ids.length) return;
  if (to === _hotelRoomId()) {
    _say(_fmt(_pickVary(_PARTY_HOME_NUDGE, "partynudge"), { who: _partyLabel() }), "dim");
    return;
  }
  const r = ROOMS[to];
  if (!r || !(r.bar || r.barType)) return;
  if (p.seen[to]) return;
  p.seen[to] = true;
  const who = _partyLabel();
  const club = r.barType === "club" || r.barType === "gogo";
  _say(_fmt(_pickVary(club ? _PARTY_ARRIVE_CLUB : _PARTY_ARRIVE, "partyarr"), { who }));
  const dcost = _ladyPrice() * p.ids.length;
  if (G.money >= dcost) {
    G.money -= dcost;
    p.spent += dcost;
    for (const id of p.ids) _boughtBond(id, 1);
    _say(_fmt(_pickVary(_PARTY_DRINKS, "partydrink"), { who, c: dcost }), "dim");
  } else {
    _say(_fmt(_pickVary(_PARTY_BROKE, "partybroke"), { who }), "dim");
  }
  if (p.stops < PARTY_STOP_CAP) {
    p.stops++;
    _addHappy(1);
  }
}

// ── Nont, the priced fixer ────────────────────────────────────────────────────
// The second fixer, built to embody the factions doc's sentence: Thais deal in
// favours, foreigners pay cash. Tan gives the habit, free, for people you've
// met, and never takes money. Nont sells tonight's coordinates for anybody,
// moves money at five percent through an account that is a mule account in
// plain sight (the scam economy's seed, never named), and charges phones.
// Paying him builds nothing — no bond, no rep, no favour — which is the point
// of him. Every price is quoted before it is charged.
function _nontHere() { return _npcsHere().includes("nont"); }
const _NONT_LOCATE = [
  "He doesn't look up. “{n}? {where}.” A hand out, palm up, for the two hundred. “Tonight. Don't ask me tomorrow, tomorrow's another two hundred.”",
  "“{n}.” Two thumbs on the phone, four seconds. “{where}. Two hundred.” The tweezers go back into the phone before your notes have reached his pocket.",
  "“Easy one.” He names it without checking: “{where}.” Then the price, as if it were part of the sentence. “Two hundred, and I'm right.”",
];
function _nontLocate(topic) {
  const t = String(topic || "").trim().toLowerCase();
  if (!t) return false;
  const id = Object.keys(NPCS).find(i => i !== "nont" && (NPCS[i].name.toLowerCase() === t || i === t ||
    NPCS[i].name.toLowerCase().split(" ").pop() === t));
  if (!id) return false;
  if (id === "tan") { _say("“Tan?” The first laugh you've had out of him. “Tan finds YOU. Keep your money.”"); return true; }
  G.soc.nontTold = G.soc.nontTold || {};
  const room = typeof _npcWhere === "function" ? _npcWhere(id) : _npcRoom(id);
  const name = NPCS[id].name;
  if (!room) { _say(`“${name}? Not out tonight.” He waves the notes away before you've reached for them. “I don't charge for a no.”`); return true; }
  const where = `${_barName(room) || ROOMS[room].name}, over on ${ROOMS[room].region}`;
  if (typeof _closedNow === "function" && _closedNow(room)) {
    // "Sunset Dreams, two hundred" at half past midnight, to a bar that shut at twelve (Piotr, round 40)
    _say(`“${name}? ${_barName(room) || ROOMS[room].name} — and it shut at midnight, so no.” He waves the notes off. “Tomorrow's two hundred. Tonight's a no.”`);
    return true;
  }
  if (id === "kwan" && _flag("craneDelivered") && G.soc.craneDay === G.day) {
    // he unfolded her photograph one command ago; he does not get to charge for where she is
    _say(`“Kwan.” The tweezers stop. “${where}. You know that. I know that.” No hand out. “Not tonight.”`);
    return true;
  }
  if (G.soc.nontTold[id] === G.day) { _say(`“Told you already. ${where}. Same answer, same night, no charge.”`); return true; }
  if (G.money < NONT_LOCATE) {
    _say(`“Two hundred.” He looks at your hands, not your face. “You haven't got it. Come back when you have, or ask Tan and owe him instead.” (WITHDRAW at a machine, or CASH <amount> here.)`);
    return true;
  }
  G.money -= NONT_LOCATE;
  G.soc.nontTold[id] = G.day;
  _say(_fmt(_pickVary(_NONT_LOCATE, "nontlocate"), { n: name, where }) + ` (-฿${NONT_LOCATE}, ฿${G.money} left.)`);
  return true;
}
function _nontCash(arg) {
  if (!_nontHere()) { _say("No Nont here. His table is at the Old Market on Soi Buakhao, most nights. (CASH is his verb, not the town's.)"); return; }
  if (!_flag("hasWallet")) { _say("“Cash from what account?” He's not wrong: your card was in the wallet."); return; }
  const n = parseInt(String(arg || "").replace(/[^0-9]/g, ""), 10);
  if (!n || n < 500) { _say(`“Five hundred minimum, or it's not worth my thumbs.” (CASH <amount> — five percent, no card fee, no daily limit.)`); return; }
  if (n > (G.bank || 0)) { _say(`“The app says you haven't got that.” He turns the screen so you can see it: ฿${_num(G.bank || 0)}.`); return; }
  const cut = Math.round(n * NONT_CUT);
  G.bank -= n;
  G.nontCashCount = (G.nontCashCount || 0) + 1;
  const stuck = _hh("nontstuck:" + G.vacation + ":" + G.day + ":" + G.nontCashCount, 71) % 6 === 0;   // pure hash, no dice
  if (stuck) {
    G.nontStuck = (G.nontStuck || 0) + (n - cut);
    _say(`You send ฿${_num(n)} to a name you don't recognise. The app spins. Nont watches it spin, and something behind his eyes does a small calculation. ` +
      `“It's fine. The account's having a moment. Tomorrow — I'll have it for you tomorrow.” No notes tonight; the five percent he keeps regardless. (฿${_num(G.bank)} in the bank.)`, "alert");
    return;
  }
  G.money += n - cut;
  G.atmTotal = (G.atmTotal || 0) + (n - cut);   // your own money moving pocketward is not "up on the night" (Piotr, round 40)
  _say(`You send ฿${_num(n)} to a name you don't recognise; he counts ฿${_num(n - cut)} into your hand off a roll from the table drawer before the app has finished spinning. ` +
    `“Five percent.” No fee, no limit, no question. (฿${G.money} in pocket, ฿${_num(G.bank)} in the bank.)`);
}

// ── Somchith's rooms ─────────────────────────────────────────────────────────
// The short-time motel was a set with no play: authored counter, keys on a nail,
// a placed NPC, an ST barfine narrating "a short walk to a short-time hotel" —
// and a man who walked a taken-out girl in got coffee (Lionel, round 36). GET
// ROOM with a TAKE-HER-OUT companion is the short-time round in the room built
// for it: MOTEL_ROOM to the old man, the ST happy through the treadmill, the
// earned +2 bond, the condom roll, and the party carries on afterwards — she's
// still on your arm. Once per companion per night; alone is voiced, not blocked.
const _MOTEL_ALONE = [
  "Somchith looks past you, politely, for the second person. \"Room is for two, boss.\" He pours you a coffee instead, which is kinder than it sounds.",
  "\"You alone?\" No judgment in it. \"Then you don't need a room. Sit, drink coffee. Come back with somebody.\"",
  "He doesn't reach for the keys. \"Company first, room second. That is the order, in here.\" The thermos comes out instead.",
];
const _MOTEL_AGAIN = [
  "{n} laughs into your shoulder. \"Again? Once is romance, tilac. Two times is WORK.\" Somchith studies the alley with great interest.",
  "\"No, na.\" {n} pats your cheek. \"Same night, same room, same me? You save it.\" She takes your arm and steers you back toward the street.",
];
const _MOTEL_ROOM_LINES = [
  "฿{p} across the counter and Somchith unhooks a key without looking at which. {n} takes your hand up the stairs, kicks the shoes off inside the door, and the fan takes up its slow count. Later — a shower that runs cold, then colder, {n} fixing her hair in a mirror the size of a paperback, and the old man's nod as you pass the counter. (฿{m} left.)",
  "The key is warm from somebody else's pocket. Upstairs: a fan, a towel, a bottle of water sweating on the sill, and {n} being businesslike and fond in the same breath. Some time later you come down together, not quite together, and Somchith pours his coffee and does not look up. (-฿{p}, ฿{m} left.)",
  "฿{p} to the old man. {n} goes up the stairs ahead of you as if she has done these particular stairs before, which she has. The room is a bed and a fan and a window painted shut. Afterward she sits on the edge of the mattress doing up a strap and tells you, kindly, that you are not as bad as most. (฿{m} left.)",
  "Up the stairs behind {n}, past a door with a shoe outside it, into a room that smells of lemongrass and the last hour. The fan counts the minutes. When you come down the alley has its lights on and Somchith has a fresh cup poured. \"Okay?\" Okay. (-฿{p}, ฿{m} left.)",
];
function _motelRoom() {
  const ids = (G.party && G.party.ids) || [];
  if (!ids.length) { _say(_pickVary(_MOTEL_ALONE, "motelalone"), "dim"); return; }
  const id = ids[0], n = _partyLabel();
  G.soc.motelWith = G.soc.motelWith || {};
  if (G.soc.motelWith[id]) { _say(_fmt(_pickVary(_MOTEL_AGAIN, "motelagain"), { n }), "dim"); return; }
  if (G.money < MOTEL_ROOM) {
    _say(_fmt("\"{p} baht, the room.\" You have ฿{m}. Somchith does not run a tab, and {n} does not look surprised.", { p: MOTEL_ROOM, m: G.money, n }));
    return;
  }
  G.money -= MOTEL_ROOM;
  for (const i of ids) G.soc.motelWith[i] = true;
  _say(_fmt(_pickVary(_MOTEL_ROOM_LINES, "motelroom"), { n, p: MOTEL_ROOM, m: G.money }), "win");
  G.offstage = true;
  _passTime(Math.min(6, Math.max(0, NIGHT_TURNS - 1 - G.nightTurn)));
  G.offstage = false;
  _conquestHappy(ids.length > 1 ? 7 : 5, id);
  for (const i of ids) _addBond(i, 2);
  if (typeof _stdBarfineRoll === "function") _stdBarfineRoll();
  if (G.party) _say(_fmt("({n} takes your arm at the mouth of the alley. The night is still going.)", { n }), "dim");
}

// Parting with a companion on your own terms — a taxi home for her, a kiss at
// the kerb, the bond kept. The night used to have only two ways to end a party:
// dawn, or your bed (Lionel, round 36).
const _PARTY_GOODBYE = [
  "{who} reads it before you say it, and is fine — a kiss on the cheek, a hand on your chest, ฿{c} for the taxi accepted without ceremony. \"Tomorrow, na? You know where.\" The bike pulls off and the night is yours again, quieter.",
  "You put {who} in a taxi with ฿{c} and a promise you both know the weight of. She waves through the back window until the corner takes her.",
  "\"Okay, tilac.\" {who} is not offended; she has a phone full of tomorrow. ฿{c} for the ride, a squeeze of the arm, and she is a tail-light going the other way.",
  "Goodnight said properly, at the kerb, the way it should be: {who} on the back of a bike with ฿{c} folded into her hand, looking back once. The soi closes over the space she leaves.",
];
function _partyGoodbye() {
  const p = G.party;
  if (!p || !p.ids || !p.ids.length) return;
  const who = _partyLabel();
  const c = Math.min(G.money, Math.round(PARTY_TAXI / 2));
  G.money -= c;
  _say(_fmt(_pickVary(_PARTY_GOODBYE, "partygoodbye"), { who, c }), "dim");
  for (const id of p.ids) _addBond(id, 1);
  G.party = null;
}

// how the party ends is how the NIGHT ended — the goodbye reads the reason
function _partyNightEnd(reason) {
  const p = G.party;
  if (!p || !p.ids || !p.ids.length) return;
  const who = _partyLabel();
  if (reason === "allnighter") {
    _say(_fmt(_pickVary(_PARTY_DAWN, "partydawn"), { who }), "win");
    for (const id of p.ids) _addBond(id, 2);
    _addHappy(Math.min(3, 1 + Math.floor(p.stops / 2)));
  } else if (reason === "blackout" || reason === "collapse") {
    const fare = Math.min(G.money, PARTY_TAXI);
    G.money -= fare;
    _say(_fmt(_pickVary(_PARTY_RESCUE, "partyrescue"), { who, c: fare }), "win");
    for (const id of p.ids) _addBond(id, 2);
  } else {
    _say(_fmt(_pickVary(_PARTY_SOFT_BYE, "partybye"), { who }), "dim");
  }
  G.party = null;
}

function _bfPrompt() {
  const { st, lt, id } = G.pendingBf;
  const p = n => n ? "฿" + n : _L("waived — past midnight");
  // At her-farang tier she waives the fine herself — foreshadow it in the quote
  // so a price-shy player doesn't back out at a number that won't be charged
  // (Alan playtest, 2026-08-17: the lovely reveal only fired AFTER committing).
  if (id && typeof _bondTier === "function" && _bondTier(id) >= 3 && (st > 0 || lt > 0)) {
    _say(`(The mamasan starts to name a number; ${NPCS[id].name} waves her quiet — ` +
      "for YOU there's no fine tonight, she'll square it herself. SHORT TIME · LONG " +
      "TIME — overnight · TAKE HER OUT — she parties with you · or NO.)", "dim");
    return;
  }
  const pt = G.pendingBf.party != null ? G.pendingBf.party : lt;
  // ST ฿600 · LT ฿600 · TAKE HER OUT ฿600 with no explanation read as a bug
  // (Lionel, round 36) — it is the draw's midnight pricing; say so
  if (id && typeof _isDraw === "function" && _isDraw(id) && G.nightTurn >= 60)
    _say(`(${NPCS[id].name} is this bar's draw — the mama gives no midnight discount on her, and after ` +
      "twelve the fine is the same whichever way you take her.)", "dim");
  if (G.pendingBf.herMoney)
    _say("(No bar fine past midnight — the book is closed, and the mama wants nothing. " +
      "What follows is HER money, and she names it herself.)", "dim");
  _say(_fmt(pt > lt
    ? "(SHORT TIME {st} — one round, the night carries on · LONG TIME {lt} — overnight · " +
      "TAKE HER OUT {pt} — her WHOLE night, priced like one · NO backs out.)"
    : "(SHORT TIME {st} — one round, the night carries on · LONG TIME {lt} — overnight · " +
      "TAKE HER OUT {pt} — she comes with you, and the night keeps going · NO backs out.)",
    { st: p(st), lt: p(lt), pt: p(pt) }), "dim");
}

// The player answered the negotiation. kind: "st" | "lt" | "open" — open is
// the classic newbie mistake, money waved at an unnegotiated contract; an
// operator prices it accordingly and has already read you as a mark.
// The most intimate repeatable beat in the game gets a deep pool, not one
// string — it printed verbatim for two different women in one week (grapevine
// playtest F14, 2026-08-25). PG-13 by house rule; the variation is in the
// coming back down, never the going up.
const _ST_SOI6_LINES = [
  "with the confidence of home advantage. “Upstairs” turns out to be exactly as advertised. Some time later you are back on your stool, thinking about nothing at all, while she fixes her hair in the till mirror.",
  "and leads, unhurried, like a woman showing you her own house. Afterwards she reappears behind the rail mid-conversation with the cashier, as if the last half hour were a rumour you both heard somewhere.",
  "and takes the stairs first. When you come back down the bar has not moved an inch and neither has your beer; she pats your knee once in passing, all business, and the night simply resumes.",
  "— up the back stair, past the towel shelf, a door with a number painted on it in nail varnish. Later, on your stool, you find she has already ordered you a fresh one, on your tab, which seems fair.",
  "and the room upstairs is small, clean, and dealt with the efficiency of a woman who has a shift to get back to. She is downstairs before you are, laughing at something the mamasan said an hour ago.",
];

function _bfResolve(kind) {
  const { id, st, lt, party } = G.pendingBf;
  // With company already on your arm, the ledger only sells one thing: another
  // companion. An ST/LT mid-party would strand the girls you're out with.
  if (G.party && G.party.ids && G.party.ids.length && kind !== "party") {
    _say(_fmt("{who} glances past you — at {her} — and smiles without writing " +
      "anything. \u201cYou have company tonight already, tilac. She come TOO, or " +
      "she don't come.\u201d", { who: NPCS[id].name, her: _partyLabel() }), "dim");
    _say("(TAKE HER OUT \u00b7 or NO.)", "dim");
    return;
  }
  if (kind === "party" && G.party && G.party.ids && G.party.ids.length >= PARTY_MAX_GIRLS) {
    _say("The mamasan counts the company already hanging off you and laughs from " +
      "the belly. \u201cTwo is party, tilac. Three is TOUR GROUP \u2014 you need " +
      "minivan, guide flag, insurance.\u201d The ledger stays shut, kindly.", "dim");
    G.pendingBf = null;
    return;
  }
  G.pendingBf = null;
  const name = NPCS[id].name;
  const bt = _room().barType;
  let price = kind === "st" ? st : kind === "party" ? (party != null ? party : lt) : lt;
  G.bfOpen = false;
  let marked = false; // she read you as a newbie who'll swallow it
  if (kind === "open") {
    G.bfOpen = true; // the post-mortem's lesson depends on how the deal was struck
    if (_bfExploitable(id)) {
      marked = true;
      price = _round50(lt * 1.3);
      _say(`You put money on the bar without settling what it buys. ${name}'s ` +
        "smile widens one professional notch, and by the time the arithmetic " +
        "reaches you it has quietly become the long-time rate — plus a little " +
        "for the inconvenience of being asked. The price moved while you " +
        "weren't looking, and everyone at the till knows it.", "alert");
    } else {
      price = lt;
      _say(`You wave the money without settling terms. ${name} glances at the ` +
        "mamasan; the mamasan writes it up as long time, fair and square — " +
        "most girls don't play the games the rail warns you about. Still: ask " +
        "first, tilac. Short or long. It's how it's done.", "dim");
    }
    kind = "lt";
  }
  // her farang: at the top bond tier she squares the fine with the mamasan
  // herself and comes off the clock — you stopped being a customer to her.
  let offBook = false;
  if (_bondTier(id) >= 3 && price > 0) {
    offBook = true;
    price = 0;
    _say(`${name} doesn't so much as glance at the till. A word to the mamasan, a ` +
      "nod, a roll of the eyes at the very idea of a fine for YOU — and she's already " +
      "untying her apron. She squares it herself. You stopped being a customer to her " +
      "a while ago.", "win");
  }
  if (G.money < price) {
    if ((kind === "lt" || kind === "party") && st <= G.money && st < price) {
      // the menu she quoted had a line you CAN afford — the ledger stays open
      G.pendingBf = { id, st, lt, room: G.room };
      _say(`The number is ฿${price}, and your pocket says ฿${G.money}. The mamasan ` +
        `reads the arithmetic off your face without embarrassment — hers or yours — ` +
        `and taps the other line of the ledger: short time, ฿${st}. That one you can do.`);
      _say("(SHORT TIME · NO.)", "dim");
      return;
    }
    _say(`The number is ฿${price}. Your pocket says ฿${G.money}. The ledger ` +
      "closes with a soft, final flap, and the negotiation is over without " +
      "anyone saying so.");
    return;
  }
  G.money -= price;
  (G.soc.bfBar = G.soc.bfBar || {})[G.room] = id; // her colleagues saw you leave with her
  G.lastBfId = id; // so the LT ending's _conquestHappy knows who
  // butterflying: a regular of yours in the room watches you leave with another
  for (const other of _npcsHere()) {
    if (other !== id && NPC_ROLES[other] === "hostess" && _bondTier(other) >= 2) {
      _addBond(other, -3);
      _repHit(2); // jilting a regular in front of the bar is a bad look, and it travels
      (G.soc.miffed = G.soc.miffed || {})[other] = G.day; // …and her next hello is cooler for it
      _say(`(${NPCS[other].name} watches you leave with ${name} and turns very ` +
        "deliberately back to her phone. That will cost you — and not in baht.)", "dim");
    }
  }
  if (price === 0 && !offBook) {
    _say((typeof _bondTier === "function" && _bondTier(id) >= 3)
      ? `Past midnight the book is shut anyway — but ${name} makes a small show of ` +
        "checking, because the point was never the fee. Nobody was going to charge YOU."
      : "The mamasan glances at the clock — past midnight — closes the ledger, and " +
      "waves the fee away with two fingers. The barfine walks out with the girl " +
      "soon anyway; only the famous ones stay on the book all night.", "dim");
  } else if (G.nightTurn >= 60 && POPULAR_GIRLS.includes(id)) {
    _say(`Past midnight the book usually closes — but not for ${name}. The mamasan ` +
      `taps the fee, unbudging: for HER, any hour is peak. ฿${price}.`, "dim");
  }
  // ── TAKE HER OUT: the night CONTINUES, with her in it ──────────────────────
  // The honest mirror of the bfparty scam, the same way the night ride mirrors
  // bfhop: the real version of the thing the con imitates. No games, no fleece —
  // real modest costs (her drinks arrive wherever you land), real payoffs
  // (company สนุก, bond, and a companion who gets you home if the night wins).
  if (kind === "party") {
    // Below regular she says the math out loud before she says yes — the full
    // night is her whole earning shift, and nobody here pretends otherwise.
    const _ptier = (typeof _bondTier === "function") ? _bondTier(id) : 0;
    if (price > lt && _ptier < 2) {
      _say(_fmt(_ptier === 1
        ? "{n} tips her head at the number, not embarrassed by it. \u201cWhole night " +
          "with you, I no work no more tonight, na. Long time, the girl go back bar " +
          "after you sleep \u2014 full night is different thing.\u201d A grin. " +
          "\u201cBut okay. For you, I switch off the phone.\u201d"
        : "{n} looks at the room \u2014 " + (_lowSeason()
          ? "half empty, and both of you know it \u2014 and names the number without ceremony. \u201cSlow night anyway, tilac. You pay, I party. Good deal for both.\u201d"
          : "FULL, and both of you know it \u2014 and names the number plainly. \u201cHigh season, tilac. Tonight this stool make money all night. You want my whole night, the number is the whole night.\u201d No apology in it. It is just the price of her time, told straight."),
        { n: name }), "dim");
    }
    const p2 = (G.party && G.party.ids) ? G.party
      : (G.party = { ids: [], stops: 0, spent: 0, seen: {} });
    const second = p2.ids.length === 1;
    p2.ids.push(id);
    p2.seen[G.room] = true;   // her own bar is the start line, not a stop
    _say(_fmt(_pickVary(second ? _PARTY_JOIN2 : _PARTY_JOIN, "partyjoin"),
      { n: name, other: second ? NPCS[p2.ids[0]].name : "" }), "win");
    _say(second
      ? "(Two of them now. The town is going to remember this one. Lead on \u2014 her drinks land wherever you do.)"
      : "(She's WITH you now \u2014 the night keeps going. Lead on: her drinks land wherever you do, and the fun stacks with every new door. Home together ends it her way; dawn ends it the town's.)", "dim");
    _addHappy(1);
    return;
  }
  // ── SHORT TIME: one round, off she goes, the night carries on ──
  if (kind === "st") {
    if (bt === "soi6") {
      _say((price ? `฿${price} to the till and ${name} takes` :
        `No fee crosses the till — she squared it with the mama herself — and ${name} takes`) +
        " your hand " + _pickVary(_ST_SOI6_LINES, "stsoi6") +
        ` (฿${G.money} left.)`, "win");
      _conquestHappy(6, id);
    } else if (bt === "gents") {
      _say((price ? `฿${price} to Rose, discreetly, and ${name} takes` :
        `No fee to Rose tonight — she squared it herself — and ${name} takes`) +
        " your hand and walks you " +
        "to one of the deep couches along the wall. The curtain draws around it with " +
        "a soft brass rattle, the cold gold room carries on without you for a while, " +
        `and then you are back in your seat with a fresh drink you don't remember ` +
        `ordering. Nobody looked up. Nobody ever does. (฿${G.money} left.)`, "win");
      _conquestHappy(6, id);
    } else if (G.room === "hyper" && _flag("hyperUpstairs")) {
      // the Samson brothers' secret: the old short-time rooms upstairs — no take-out,
      // for the regulars Diamond trusts. A go-go that plays like Soi 6 for a friend.
      _say(`฿${price}, and instead of a taxi ${name} takes your hand and leads you up the back stair ` +
        "the menu doesn't mention — to one of the old rooms the brothers lived in while they built the " +
        "place. Diamond watches you go with the small nod she keeps for the house's friends. Some time " +
        `later you are back on your stool and the night has not even noticed you left. (฿${G.money} left.)`, "win");
      _conquestHappy(6, id);
    } else {
      const bar = _barName(G.room) || "the bar";
      // the town's one built short-time motel is the alley off Soi 7 — from a
      // Beach Road bar that IS the short walk (Lionel, round 36)
      const motel = _room().region === "Beach Road"
        ? "short walk up the unlit alley off Soi 7 to Somchith's, the motel with no sign, where a ceiling fan is"
        : "short walk to a short-time hotel with a ceiling fan";
      _say((price ? `฿${price} to the ledger, and a` : "A") +
        ` ${motel} doing its slow count over the ` +
        `proceedings. ${name} is businesslike and cheerful and gone within the hour — a kiss at ` +
        `the door, and she's back on her stool at ${bar} before your ice has melted. You amble ` +
        `back a few minutes behind her, and the night picks you up where it left off. (฿${G.money} left.)`, "win");
      _conquestHappy(5, id);
      G.offstage = true; // the hour away — the bar's ambient (saleng, etc.) isn't your scene
      // cap the skip so a late-night ST doesn't fast-forward you PAST dawn into an
      // involuntary rough wake — you got the short time; keep your last turns to get home.
      _passTime(Math.min(6, Math.max(0, NIGHT_TURNS - 1 - G.nightTurn)));
      G.offstage = false;
    }
    // A short-time deepens the bond a little — but only the FIRST of the night
    // with her. The +2 is EARNED bond, so it ignored the bought-bond nightly
    // cap, which meant the free her-farang loop funded its own precondition
    // (bond 13 → 109 on one girl in a week — Vikram, 2026-08-27). Going round
    // again the same evening is the same evening; it doesn't deepen anything.
    if (!(G.soc.bfNight && G.soc.bfNight[id] > 1)) _addBond(id, 2);
    // HELP says "a barfine uses one; go without at your peril" — and it was only
    // true of the OVERNIGHT path, so the one action a player can repeat all night
    // carried none of the risk the game promised (~50 short-times consumed 0 of 3
    // condoms, Vikram 2026-08-27). A stated rule the mechanics don't keep is the
    // defect this repo lints for everywhere else.
    _stdBarfineRoll();
    return;
  }
  // ── LONG TIME: overnight — unless she's running a game on you ──
  const scam = _bfScamRoll(id, marked);
  if (scam === "period") {
    // sprung before you even leave: the reveal comes AFTER the fine is paid
    if (G.soc.bfBar) delete G.soc.bfBar[G.room]; // she never actually left — don't lock the bar on her colleagues
    (G.soc.bfRefused = G.soc.bfRefused || {})[id] = { kind: "period", favor: _favor(id) }; // and she's out for the night — no instant re-quote
    G.bfIncident = { id, room: G.room, kind: "period", fine: price, day: G.day };
    _say(`The fine is barely in the ledger when ${name} leans close, all ` +
      "apology: “Cannot boom boom tonight, na. Lady time.” She pats your arm " +
      "and is somehow already back in the rotation of the room. At the till, " +
      "the mamasan's pen has stopped moving — she heard it too, and she knows " +
      "the shift roster better than anyone.", "alert");
    _say("(COMPLAIN — the mamasan is right there, and this is bad for business.)", "dim");
    return;
  }
  if (scam === "scene") {
    // jealousy detonates. You paid the fine and got a war instead of a night: a
    // scene, a shove, a thrown drink, the mamasan dragging her off you. Money gone,
    // banged up a notch, the whole bar watching.
    _addHappy(-4);
    _say(`It goes wrong before you reach the door. ${name} clocks something — a look ` +
      "you gave the girl at the rail, a name in your phone, a ghost only she can see — " +
      "and the sweet goes out of her like a fuse blowing. The shouting is in two " +
      "languages and the thrown drink is in neither. A shove, a nail catching your " +
      "cheek, and then the mamasan and two of the girls have her by the arms and you " +
      "by the shoulder, steering you out into the soi. Your ฿" + price + " bought that. " +
      "You're barred here for the night, and you'll feel the scratch tomorrow.", "alert");
    if (_hurt(1)) return;
    _kickOut();
    return;
  }
  if (scam === "barhop" || scam === "wsparty") {
    G.bfSeq = { id, kind: scam, fine: price, spent: 0, room: G.room };
    G.pendingEnc = scam === "barhop" ? "bfhop" : "bfparty";
    if (scam === "barhop") {
      _encPrompt(
        [`${name} reappears out of uniform, takes your arm — and steers, gently ` +
          "but with intent, away from the taxis. “One drink first, na? My " +
          "friend's bar, very close. She look after us.” The bar she means has " +
          "her photo on the wall and a cashier who greets her by a different " +
          "nickname.", "alert"],
        ["(YES, one drink · NO — the night you actually paid for.)", "dim"]);
    } else {
      _encPrompt(
        [`${name} scrolls her phone as you leave, lights up, and turns the ` +
          "screen to you: “My friends on Walking Street! We say hello, one " +
          "drink only, na? They love you already.” Two girls wave from the " +
          "photo. Neither of them has ever had one drink only.", "alert"],
        ["(YES, meet the friends · NO — the night you actually paid for.)", "dim"]);
    }
    return;
  }
  if (scam) { // runner | mao | leaveAfter — plays out across the night's end
    G.bfIncident = { id, room: G.room, kind: scam, fine: price, day: G.day };
    _say((price ?
      `฿${price} to the mamasan, who enters it in the ledger with ceremony and ` +
      `gives ${name} a nod that means back by opening, mind. ` :
      `The mamasan gives ${name} a nod that means go on then, off the clock. `) +
      `${name} vanishes and reappears out of uniform — jeans, clean shirt, ordinary ` +
      "and lovely — and takes your arm like you're the one being rented." +
      (price ? ` (฿${G.money} left.)` : ""), "win");
    _endNight("bfscam");
    return;
  }
  // A bonded lady (regular+) sometimes doesn't want the hotel yet — she wants to
  // show you HER Pattaya, on the back of her bike. The genuine mirror of bfhop's
  // kickback tour: no fleece, pure serendipity, and with her driving the last-bus
  // dread lifts for one night. Day-stable roll so the offer's consistent all night.
  if (_bondTier(id) >= 2 && _hh(id + ":" + G.day + ":ride", 53) % 100 < (_bondTier(id) >= 3 ? 80 : 55)) {
    G.rideSeq = { id, fine: price, spent: 0, stops: 0, sanuk: 0, seen: [] };
    G.offstage = true; // off the tourist map on her bike — the origin bar's saleng/ambient isn't your scene
    G.pendingEnc = "nightride";
    // Per GIRL, not per player: a global flag had the second woman ever to offer
    // you a ride open with "you want the same night again" — to someone you met
    // half an hour ago and had never been on a bike with (churner playtest
    // 2026-08-23). The reframe is hers to make, and only if it was hers before.
    const ridden = !!(G.rodeWith && G.rodeWith[id]);
    const offer = ridden
      ? `${name} takes your hand — and there's the scuffed Click again, already off its stand. ` +
        `"Not hotel yet," she says, mock-stern, reading the hope on your face. "I know, I know ` +
        `— you want the same night again. Cannot step in same river, na. But come — tonight is ` +
        `its own." She pats the seat.`
      : `${name} takes your hand — but instead of the taxi rank she wheels a scuffed Honda ` +
        `Click off its stand, thumbs it awake, and pats the seat behind her. "Tonight I not ` +
        `want hotel yet. Come — I show you MY Pattaya, the real one. Hold me tight, na, I ` +
        `drive little bit crazy."`;
    _encPrompt(
      [(price ? `฿${price} to the mamasan, and ` : "") + offer + ` (฿${G.money} left.)`, "win"],
      [`(RIDE with her into the night · or JUST the hotel — up to you.)`, "dim"]);
    return;
  }
  // the honest overnight. Sometimes it's the fantasy; sometimes long time hands you
  // the whole PERSON — the life story, the tears, the five-year-girlfriend morning —
  // the reality the fantasy edits out. Less สนุก tonight (the escape didn't escape),
  // but a deeper bond: you saw the real her. "Remind me not to do LT again."
  // Day-stable hash (like _bfShark) so the same girl the same night is consistent.
  if (_hh(id + ":" + G.day + ":real", 41) % 100 < 30) {
    _say((price ? `฿${price} to the mamasan, and ` : "") +
      `${name} comes home with you — and stays home, in every sense. Somewhere before ` +
      "midnight she stops being a fantasy and becomes a person: the whole life story, the " +
      "father, the sister, the kid up-country, thirty minutes of it, then tears you didn't " +
      "order over something you can't quite follow. You fall asleep before the sex. In the " +
      "morning she's dressed and cool and kisses your cheek at the door like a wife who's " +
      `decided something. You wanted a one-day girlfriend; you got a five-year one. (฿${G.money} left.)`, "");
    _say("(Long time is like that — you paid for the fantasy and she handed you the reality. " +
      "But you know her now, really know her. Some men call that the good part.)", "dim");
    G.lastBfPreTier = _bondTier(id); // the treadmill reads the tier SHE EARNED BEFORE tonight
    G.lastBfHonest = true;           // the ending's coda is the quiet one, not khao man gai at 3 a.m.
    _addBond(id, 6); // you saw the real her — the bond jumps
    G.lastBfBase = 4;                               // …and the escape didn't escape: less สนุก
    G.lastBfChaste = true;                          // "you fall asleep before the sex" — no STD/condom coda
    _endNight("barfine");
    return;
  }
  _say((price ?
    `฿${price} to the mamasan, who enters it in the ledger with ceremony and ` +
    `gives ${name} a nod that means back by opening, mind. ` :
    `The mamasan gives ${name} a nod that means go on then, off the clock. `) +
    `${name} vanishes and reappears out of uniform — jeans, clean shirt, ordinary ` +
    `and lovely — and takes your arm like you're the one being rented.` +
    (price ? ` (฿${G.money} left.)` : ""), "win");
  G.lastBfPreTier = _bondTier(id); // pre-accrual tier for the treadmill (see _conquestHappy)
  _addBond(id, 3); // a whole night together deepens the bond
  _endNight("barfine");
}

// ── The night ride: "her Pattaya" ───────────────────────────────────────────
// A bonded lady takes you off the tourist map on the back of her bike. Pure
// serendipity — each stop is random, you only choose RIDE ON or call it. The
// warm mirror of the bfhop kickback: no fleece, real places, and สนุก that does
// NOT jade (the "one deepening girl" reward at its peak). She's your ride, so the
// last-bus dread doesn't apply — the night runs as long as the two of you want.
const RIDE_MAX_STOPS = 6;   // after this the sky goes grey and she takes you home
const RIDE_MIN_CASH = 150;  // below this she reads your wallet and calls it, no shame

const _RIDE_HOP = [
  "She threads the bike out into the night — warm wind, neon smearing past, her hair " +
    "whipping your face, one hand leaving the bar to point at things you'll never remember. " +
    "Then she cuts down a soi you'd never have found alone and kills the engine.",
  "You hold on. She rides like the traffic laws are a rumour she's heard about — a gap here, " +
    "a red light treated as advisory there, laughing at your grip on her waist — and drops " +
    "you somewhere the guidebooks have never heard of.",
  "The bike coughs, catches, and carries the two of you off into the dark between the bright " +
    "places. She sings along to whatever's in her head. Ten wrong-way minutes later she pulls " +
    "up, kills the light, and grins over her shoulder: here.",
  "Off you go again — three lanes, no plan, her flip-flops steering as much as the bars. The " +
    "town rearranges itself around you, bright to dark to bright, and then she's braking, " +
    "already off the bike, already tugging your sleeve toward a doorway.",
];

const _RIDE_VENUES = [
  { key: "disco", lo: 500, hi: 1200, sanuk: 3, scenes: [
    n => `A Thai disco — no farang, no English, a live band murdering a luk thung ballad and ` +
      `the whole room in love with it. ${n} knows half the tables; a whisky set with your name ` +
      `misspelled on the bottle appears, soda and ice keep coming, and you are the exhibit and ` +
      `the guest of honour at once.`,
    n => `A string-band place off the Darkside — red lights, a singer in sequins. ${n} pulls ` +
      `you up to dance the way the aunties dance, all wrists and no hurry, and a bottle of Hong ` +
      `Thong lands with the ceremony of a christening. Nobody here is performing for anybody.`,
  ]},
  { key: "somtam", lo: 120, hi: 350, sanuk: 2, scenes: [
    n => `Plastic stools on a dark soi, a woman pounding a mortar like it owes her money. ${n} ` +
      `orders in a machine-gun burst of Isaan and watches your face when the som tam lands — ` +
      `"not spicy, I say NOT spicy" — as your whole head catches fire. Grilled chicken, sticky ` +
      `rice, her laughing too hard to eat. The cheapest joy in Thailand.`,
    n => `2am and she's hungry: a roadside table, moo ping smoking on the grill, som tam pla ra ` +
      `so pungent it arrives before the plate does. ${n} builds you the perfect bite and makes ` +
      `you eat it from her fingers, then howls at your tears. You've never been so awake.`,
  ]},
  { key: "wsclub", lo: 700, hi: 1500, sanuk: 3, scenes: [
    n => `Walking Street's big room — lasers, an imported DJ, ฿300 water. ${n} pulls you into ` +
      `the crush like she owns the floor, which for the next hour she does: a booth, bottle ` +
      `service you didn't quite agree to, the bass in your sternum, her mouthing the words with ` +
      `her eyes shut.`,
    n => `The superclub, three floors and three genres, ${n} navigating all of them by instinct. ` +
      `She dances backwards through the whole place daring you to keep up, cashes your baht into ` +
      `a bucket of something blue, and for a while you're the two youngest people alive.`,
  ]},
  { key: "karaoke", lo: 400, hi: 900, sanuk: 3, scenes: [
    n => `A host bar, of all places — pretty boys in waistcoats, and ${n} plus three friends who ` +
      `appear from nowhere, here to make YOU sing. A private room, a screen, a tambourine forced ` +
      `into your hand. You murder a Thai pop song you don't know; they score it 100 out of pure ` +
      `love and mockery, indistinguishable.`,
    n => `A karaoke box up an unmarked staircase. ${n} queues eleven songs, hands you the second ` +
      `mic, will not take no. Somewhere in the power ballad you stop being embarrassed. She films ` +
      `you "for evidence," and the way she's laughing you'd let her film anything.`,
  ]},
  { key: "friendbar", lo: 200, hi: 500, sanuk: 2, scenes: [
    n => `Her friend's actual bar — a hole in a wall, six stools, a dog asleep under one. The warm ` +
      `original that every "my friend's bar" scam is a forgery of: no kickback, just ${n}'s friend ` +
      `refusing to let you pay for the first round and then absolutely letting you pay for the ` +
      `rest, everyone delighted.`,
    n => `A beer bar down a lane — off-shift girls and their off-shift boyfriends, a speaker on ` +
      `something from 2009. ${n} is home here; you can see it in her shoulders coming down. She ` +
      `introduces you around by a nickname she's decided without telling you. You are "{{Nong}} ` +
      `Handsome" now. It sticks.`,
  ]},
  { key: "viewpoint", lo: 0, hi: 0, sanuk: 4, scenes: [
    n => `She rides you up Pratumnak in the dark, past the sleeping resorts, to the viewpoint — ` +
      `and there it is: the whole bay, the whole roaring town, laid out silent and glittering, ` +
      `too far up to hear. ${n} kills the engine. Neither of you says anything for a while. This ` +
      `is the part nobody sells you, and it's free, and it's the best thing in Pattaya.`,
    n => `The bike climbs to the Buddha hill overlook and stops. 3am. Below, the strip you've been ` +
      `drowning in all night is a smear of gold light and, from up here, completely quiet. ${n} ` +
      `leans back against you and points out her bar, her room, the hospital where her son was ` +
      `born — a whole life you're only now seeing the shape of. The wind does the talking.`,
    n => `"Somewhere dark, na? No people." She sounds smaller than she has all night. The bike ` +
      `climbs away from the neon until the town is a rumour below, and she parks facing the ` +
      `water and performs nothing at all — no wide smile, no laugh on cue, the makeup mostly ` +
      `gone. Just her head against your shoulder and the engine ticking cool. The smile she ` +
      `finds for you up here is a small, tired, fragile thing, and it is not for sale. It has ` +
      `never been for sale.`,
  ]},
  { key: "ranlao", lo: 300, hi: 700, sanuk: 3, scenes: [
    n => `A ran lao on South Pattaya Road — Thai live music, whisky sets, and a fifteen-minute ` +
      `queue that ${n} walks straight past on somebody's nod. Inside, the mystery of the quiet ` +
      `strip solves itself: everyone is HERE. Half the rail crews of the beer bars, out of ` +
      `uniform and off the clock, and the room sings every chorus back at the band. You are the ` +
      `only farang in the building, and with her hand on your arm, nobody minds at all.`,
    n => `A Thai music hall, tables of whisky-soda, and a roll call at every second one — ${n} ` +
      `trades wais and shrieks of greeting the whole way to your seats. The girls who pour ` +
      `drinks all week are being poured for tonight, and they tip like emperors. Somewhere in ` +
      `the second set she translates a lyric into your ear, gets it half right, and laughs too ` +
      `hard to finish.`,
  ]},
  { key: "afterhours", lo: 200, hi: 500, sanuk: 3, scenes: [
    n => `An after-hours room where the blackout curtains are load-bearing: outside the sky has ` +
      `gone traitorously bright, inside it is packed and pretending otherwise. Time starts ` +
      `dropping frames. At some point you surface mid-sentence with a freshly poured beer in ` +
      `front of you and ${n} laughing at something you apparently just said. You reach for your ` +
      `pocket; the table waves you off. Already paid. Forget about it.`,
    n => `The club the town's whole night shift disappears into when the shutters come down. ` +
      `${n} knows the door and the door knows her, and the hour stops meaning anything at all. ` +
      `When you finally step out blinking, the street is doing a whole honest morning around ` +
      `you — motorbikes, market bags, monks on the almsround — and none of it seems entirely ` +
      `plausible.`,
  ]},
  { key: "market", lo: 60, hi: 200, sanuk: 2, scenes: [
    n => `A night market winding down, half the stalls shuttered. ${n} buys roti with banana and ` +
      `condensed milk from a man closing up, splits it with you in the empty aisle, and haggles ` +
      `for a phone case you don't need out of pure sport. She wins. Of course she wins.`,
    n => `A cart selling nothing but grilled squid and cold Est, run by a grandmother who clearly ` +
      `raised ${n} or someone exactly like her. You eat standing under a bare bulb, moths and all, ` +
      `and it's somehow the most romantic thing that's happened to you in a year.`,
  ]},
];

function _pickRideVenue(seen) {
  // Soi 6 mode fences Walking Street off entirely (the mode blocks you from walking
  // there and calls it off-map), so a ride that drops you in "Walking Street's big
  // room" contradicts the pocket — drop it. Pratumnak stays: it's a hill overlook
  // she rides you up to, never a walkable pocket room.
  let venues = _RIDE_VENUES;
  if (G.mode === "soi6") venues = venues.filter(v => v.key !== "wsclub");
  // Prefer a stop this player has never been taken to on ANY ride, then one
  // not seen this ride, then anything: the same three stops came round
  // verbatim two nights apart, directly after she said "cannot step in same
  // river" — and after the game had called the first ride the one you'd never
  // catch again (Howard, round 35). The pool is small; the memory is cheap.
  const ever = G.rodeVenues || {};
  const fresh = venues.filter(v => !ever[v.key] && !seen.includes(v.key));
  const pool = fresh.length ? fresh : venues.filter(v => !seen.includes(v.key));
  const src = pool.length ? pool : venues;
  const pick = src[Math.floor(_rand() * src.length)];
  (G.rodeVenues = G.rodeVenues || {})[pick.key] = true;
  return pick;
}

function _nightRide(input) {
  const seq = G.rideSeq;
  if (!seq) { _say("The night's already carried you off. Sleep it off."); return; } // state lost — safety
  const id = seq.id, name = NPCS[id].name;
  const go = /\b(ride|yes|on|more|another|sure|ok|okay|go|keep|again|deeper|why not|lets?|come|drive)\b/.test(input) &&
    !/\bno\b|hotel|home|enough|call|done|bed|sleep|stop|tired|late|finish/.test(input);
  if (!go) return _endRide(seq, "choice");
  G.rideEverTaken = true; // you actually rode — kept for anything reading the global
  if (G.rideSeq && G.rideSeq.id) (G.rodeWith = G.rodeWith || {})[G.rideSeq.id] = true; // …and whose bike it was
  if (G.money < RIDE_MIN_CASH && seq.stops > 0) return _endRide(seq, "broke");
  // a random stop
  const venue = _pickRideVenue(seq.seen);
  seq.seen.push(venue.key); // _pickRideVenue avoids anything already seen this ride while the pool lasts
  let hi = Math.floor(_rand() * _RIDE_HOP.length);
  if (hi === seq.lastHop) hi = (hi + 1) % _RIDE_HOP.length; // and no back-to-back identical ride line
  seq.lastHop = hi;
  const hop = _RIDE_HOP[hi];
  const scene = venue.scenes[Math.floor(_rand() * venue.scenes.length)](name);
  const cost = venue.lo + Math.floor(_rand() * (venue.hi - venue.lo + 1));
  const paid = Math.min(cost, G.money);
  G.money -= paid;
  seq.spent += paid; seq.stops++; seq.sanuk += venue.sanuk;
  if (!/viewpoint|market|somtam/.test(venue.key)) G.soc.drunk++;   // a whisky set is a drink (Dex woke "stone sober" after six stops)
  _addBond(id, 1); // every stop deepens the bond
  _say(`${hop}\n\n${scene}` +
    (paid ? ` (฿${paid}. ฿${G.money} left.)` : " (Free. The best things here are.)"), "win");
  _addHappy(venue.sanuk); // does NOT jade — a bonded night is the one that keeps giving
  if (seq.stops >= RIDE_MAX_STOPS) return _endRide(seq, "dawn");
  _rideQuestion(seq, id, name);
  G.pendingEnc = "nightride";
  _encPrompt([`${name} looks back over her shoulder, engine idling, one eyebrow up.`, "room"],
    [`(RIDE ON — wherever she takes you next · or call it a night with her.)`, "dim"]);
}

// ── the wrong question (canon layer, 2026-09-01) ─────────────────────────────
// Once ever, from the pillion seat, at a red light between stops: she asks the
// question every man on this coast eventually gets asked. The essay it comes
// from answers it with an authored biography — the cascade of every name that
// came before. The game can do the one thing the essay can't: open the
// PLAYER'S actual ledger for the cascade — the drinks book, the gallery, the
// treadmill's flat arithmetic — so what the question shows depends entirely on
// how this player has actually played, and the two branches are the same
// question landing on two different lives. Doctrine holds at both ends: NO
// meter moves in either branch (being asked the truth is not a prize and not a
// fine — the other-ledger rule), she is never victim and never schemer, and
// nobody is graded. She asks because she already knows; the soi always talks.
// Fixed strings, not pools — a genuinely one-time beat.
function _rideQuestion(seq, id, name) {
  if (_flag("rideQuestion") || seq.stops < 2) return;
  _setFlag("rideQuestion");
  const names = Object.keys(G.soc.drinks || {})
    .filter(x => x !== id && (G.soc.drinks[x] || 0) > 0).length;
  const photos = _photoList().length;
  const record = names >= 3 || G.jaded >= 2 || photos >= 4;
  _say(`The light at the big junction goes red — one of the three in this town anyone actually ` +
    `honours — and ${name} puts a foot down, engine muttering, and asks it over her shoulder, ` +
    `casual as asking the time. "Tilac. If you never meet me — where you be now, you think?"`);
  if (record) {
    const bits = [];
    if (names) bits.push(`${names} name${names > 1 ? "s" : ""} in the book the lady drinks kept`);
    if (photos) bits.push(`${photos} photograph${photos > 1 ? "s" : ""} in the phone against your leg`);
    if (G.jaded > 0) bits.push("under all of it the flat arithmetic this town does, " +
      "each round buying a little less than the round before");
    const cascade = bits.length > 1
      ? bits.slice(0, -1).join(", ") + ", and " + bits[bits.length - 1]
      : bits[0];
    _say(`And before you can build an answer, the ledger opens itself and answers first: ` +
      `${cascade}. "Still looking for you," you say. It is the right answer. She lets ` +
      `it stand — a small "mm" into the wind, the light going green — and somewhere around third ` +
      `gear you understand that she didn't ask because she wanted the answer. She asked because ` +
      `she already had it.`, "dim");
  } else {
    _say(`You look for the answer and find the book nearly empty — she is most of what is ` +
      `written in it. "Home, probably," you say, honestly. "Asleep. Bored." She laughs — the ` +
      `real one, not the working one — and kicks the bike into gear as the light goes. "Good ` +
      `answer. Wrong question, na." And whatever she means by that rides with the two of you ` +
      `to the next place.`, "dim");
  }
}

function _endRide(seq, reason) {
  const id = seq.id, name = NPCS[id].name;
  G.rideSeq = null;
  G.pendingEnc = null;
  G.offstage = false; // back in the world (also belt-and-braces cleared by _endNight)
  if (seq.stops === 0) {
    // declined the offer outright — no sulk, just the hotel and a good honest night
    _say(`"Okay tilac — hotel then. Boring man." But she's smiling, no sting in it. She swings ` +
      `the bike around for the short hop to the room, and the night is exactly what you paid ` +
      `for: easy, warm, hers till morning. ${name} is asleep before you are.`, "win");
    _addBond(id, 3);
    G.lastBfId = id;
    _endNight("barfine");
    return;
  }
  const great = seq.stops >= 4;
  let close;
  if (reason === "broke") {
    close = `Somewhere past the fourth stop your wallet gives a polite, final cough. ${name} ` +
      `reads it in your face before you can say a word — "okay, enough, tilac, we go home now" — ` +
      `no sulk, no scene, just her hand squeezing yours on the bar. The empty pockets don't ` +
      `embarrass her, and that tells you more than the whole night did.`;
  } else if (reason === "dawn") {
    G.lastBfHonest = true;   // the quiet coda: the fun close's "khao man gai at 3 a.m." read backwards after "morning already" (Dex, round 38)
    close = `The sky over the gulf goes the colour of a bruise healing, and ${name} feels you ` +
      `notice it. "Aaah. Morning already. This town, na — always morning too soon." She points ` +
      `the bike toward a bed, hers or yours, and lets the last of the dark carry you there.`;
  } else {
    // Pooled (Frank, round 34): this close delivered verbatim on consecutive
    // nights — the game's best beat destroying itself on second delivery. The
    // old line also promised "you come see MY room" and the morning delivered
    // the Sabai and a joiner fee; no her-room scene exists, and an invitation
    // is a promise, so the promise is cut rather than kept badly.
    close = _pickVary([
      `"Okay," she says at last, killing the engine one final time. "Enough Pattaya for you ` +
        `tonight." The grin turns private. "Get on. Last ride." And it is.`,
      `She reads the hour off your face before you've found the words. "Mm. Home, tilac." ` +
        `The kick-start takes twice — she swears at it in Isan, fondly — and the last ride ` +
        `is the slow one, the town pouring past like it's already a memory.`,
      `"Finish?" No sting in it. She stretches until something in her shoulder clicks, ` +
        `swings a leg over the saddle, and pats the seat behind her. The engine catches ` +
        `first time, which she takes full credit for.`,
      `She doesn't argue. She buys two waters off a cart without being asked, hands you ` +
        `one, and points the bike home. Somewhere on the dark stretch she sings two lines ` +
        `of something Thai, quietly, to herself — not for you. That's the part you keep.`,
    ], "rideclose");
  }
  _say(close, "win");
  // The haunt line names THE one — a superlative that can only be true once,
  // so it prints once, ever (Frank got it verbatim twice in 24 hours, and the
  // second delivery unwrote the first).
  if (great && !_flag("rideHaunt")) {
    _setFlag("rideHaunt");
    _say(`(This is the one — the night with no plan that becomes the whole reason you keep coming ` +
      `back, the one you'll chase on every trip after and never quite catch again. ${name} won't ` +
      `remember it as anything special. That's the part that'll haunt you.)`, "dim");
  }
  // the dog kept the door all night — and gets an opinion about who you brought home
  if (G.dog) _say(_dogN(`You roll in as the sky pales, and Sai Krok is exactly where you left him: ` +
    `sitting at the door, ears up, having clearly not slept a wink on principle. He gives ${name} a ` +
    `long, level appraisal — then one slow thump of the tail. Approved. She crouches to him without ` +
    `being told, murmuring something in Thai, and your chest does a quiet thing about that it isn't ` +
    `ready to examine.`), "dim");
  _addBond(id, (great ? 4 : 2)); // on top of the per-stop bumps
  G.lastBfId = id;
  G.lastBfBase = 10 + Math.min(4, seq.stops); // a bigger night → a bigger memory at the payout
  _endNight("barfine");
}

// COMPLAIN — the recourse that makes a bar girl worth more than a freelancer.
// Back at the bar, the mamasan makes it right: refund, an introduction to a
// reliable girl, and on a repeat offence the apology scene. Not a morality
// play — "bad girls" talk costs her bar real money, and she knows it.
function _doComplain() {
  const inc = G.bfIncident;
  if (!inc) {
    _say("Nothing on the books to complain about. Give the city time.");
    return;
  }
  if (G.room !== inc.room) {
    _say(`Take it back to ${_barName(inc.room)} — the mamasan there will want ` +
      "to hear it, and not for your sake.");
    return;
  }
  const mama = _npcsHere().find(n => NPC_ROLES[n] === "mamasan");
  if (!mama) {
    _say("No mamasan holding court right now. This is a conversation for the " +
      "boss, not the floor.");
    return;
  }
  const mn = NPCS[mama].name, gn = NPCS[inc.id].name;
  if (inc.kind === "leaveAfter") {
    G.bfIncident = null;
    _say(`${mn} hears you out, then spreads her hands, genuinely unmoved: ` +
      `“Tilac. You barfine, you boom boom, she come home. Where is problem?” ` +
      "Around the till, nobody disagrees. You got the main event; the fine " +
      "bought what it bought.");
    return;
  }
  G.bfStrikes = G.bfStrikes || {};
  const strikes = (G.bfStrikes[inc.id] = (G.bfStrikes[inc.id] || 0) + 1);
  G.money += inc.fine;
  G.bfIncident = null;
  const detail = inc.kind === "runner" ? "the emergency that put her back on a stool within the hour" :
    inc.kind === "mao" ? "the mao mak mak performance" :
    inc.kind === "barhop" ? "the guided tour of her friends' tills" :
    inc.kind === "wsparty" ? "the three-girl Walking Street benefit night" :
    "the lady-time reveal, timed to the second the fine hit the ledger";
  if (strikes >= 2) {
    const purse = inc.fine > 0
      ? "counting your refund out of her OWN purse note by note"
      : "wai-ing an apology she clearly means — there was no fine to give back, she'd waived it herself";
    const tail = inc.fine > 0 ? `(฿${inc.fine} back — ฿${G.money}.)`
      : "(No baht to refund — she'd squared the fine herself — but the second strike is on the record now.)";
    _say(`You lay it out — ${detail}. ${mn}'s face does not change, which is how ` +
      `you know it's serious. One syllable across the room and ${gn} is standing ` +
      `in front of you, ${purse}, while the whole bar studies its drinks. “Second ` +
      `time,” ${mn} says to nobody in particular, in English, so it travels. The ` +
      `girls near the door make space around ${gn} the way people do around someone ` +
      `whose stool is already empty. ${tail}`, "win");
  } else {
    const line = inc.fine > 0
      ? `The refund appears from the till without ceremony. “Not morality, tilac. Business.” (฿${inc.fine} back — ฿${G.money}.)`
      : "There's nothing in the till to give back — you never paid, she'd waived the fine — but the note goes in the book all the same. “Not morality, tilac. Business.” (No baht changed hands; the wrong is logged.)";
    _say(`You lay it out — ${detail}. ${mn} listens with the stillness of a ` +
      "woman doing damage arithmetic: one unhappy farang tells ten, and “bad " +
      `girls” talk empties a bar faster than a raid. ${line}`, "win");
  }
  const rel = _npcsHere().find(n => n !== inc.id && NPC_ROLES[n] === "hostess" &&
    (POPULAR_GIRLS.includes(n) || NPCS[n].c4 === 2));
  if (rel) {
    _addBond(rel, 2);
    _say(`Then ${mn} turns, considers the floor, and beckons ${NPCS[rel].name} ` +
      `over with two fingers. “This one,” she says, like a guarantee. ` +
      `${NPCS[rel].name} sits beside you already half on your side.`, "dim");
  }
  _addHappy(1);
}

// Does she run a game tonight? Only an operator, only on a mark — the open
// contract doubles her confidence. Returns a scam kind or null.
// Personality tilts the scam odds: the white knight is in deeper and eats it more;
// the operator reads the tell and ducks the worst of it. Everyone else is baseline.
function _scamLean() {
  if (typeof _pers !== "function") return 1;
  if (_pers("whiteknight")) return 1.5;
  if (_pers("operator")) return 0.5;
  return 1;
}
function _bfScamRoll(id, marked) {
  if (_dogEgg() === "buffalo") return null; // the dog smells the con; every barfine stays honest
  // A drink-too-much girl doesn't need to be a shark to wreck the night — she's
  // simply too gone by the time you leave together (the "mao" ending). The white
  // knight, sure he'll look after her, takes her home more often and eats it more.
  if (NPCS[id].type === "drunk") {
    if (_rand() < 0.5 * _scamLean()) return "mao";
  }
  // A volatile girl: the night can detonate into a jealousy scene — a shouting match,
  // a thrown drink, sometimes a slap and the mamasan hauling her off you. The white
  // knight, in deeper and slower to leave, eats it more often.
  if (NPCS[id].type === "volatile") {
    if (_rand() < 0.4 * _scamLean()) return "scene";
  }
  if (!_bfExploitable(id)) return null;
  if (_rand() >= (marked ? 0.6 : 0.3) * _scamLean()) return null;
  const r = _rand();
  if (r < 0.15) return "period";
  if (r < 0.40) return "runner";
  if (r < 0.60) return "mao";
  if (r < 0.75) return "leaveAfter";
  // wsparty's whole scene is set on Walking Street, which Soi 6 mode fences off —
  // fold it into the pocket-neutral "my friend's bar, very close" barhop there.
  if (r < 0.90) return "barhop";
  return G.mode === "soi6" ? "barhop" : "wsparty";
}

// The indirect ask. A girl warming to you (favor 4-5 — below self-barfine
// territory) sometimes opens the subject herself, the way it's actually done:
// "I go with you, na" — never a number, never the word barfine. The numbers
// are the mamasan's department (she gets a cut, so she won't volunteer them),
// and many bars run a quota — X fines and lady drinks a month for the bonus —
// so the ask is business as much as affection. Once per girl per night.
function _maybeGoWithYou(id) {
  if (!_flag("act1Done") || G.pendingEnc || G.game || G.pendingBf) return;
  if (_atOwnBar()) return;                        // your own staff don't proposition you out of your own till
  if (G.party && G.party.ids && G.party.ids.includes(id)) return; // she's already yours tonight
  if (NPC_ROLES[id] !== "hostess") return;
  if ((G.soc.heat[G.room] || 0) > 0) return;
  if (G.soc.goWith && G.soc.goWith[id]) return;
  const f = _favor(id);
  if (f < 4 || f >= 6) return;
  if (_rand() >= 0.25) return;
  (G.soc.goWith = G.soc.goWith || {})[id] = true;
  _say(`${NPCS[id].name} leans in, suddenly and carefully casual: “I go with ` +
    "you, na? I want to go with you.” Which is as direct as it ever gets. Her " +
    "eyes flick to the till — the numbers are the mamasan's department, and " +
    `mama counts the month's fines like a farmer counts rain. (BARFINE ` +
    `${NPCS[id].name.toUpperCase()})`, "win");
}

// A regular's reward: late enough, liked enough, and she may pay her own
// barfine — an investment decision, and the highest compliment the soi pays.
function _maybeSelfBarfine(id) {
  _maybeGoWithYou(id); // the softer nudge shares every call site; it gates itself
  if (!_flag("act1Done") || G.pendingEnc || G.game) return;
  if (_atOwnBar()) return;                        // not at the bar you own — she works for you here
  if (G.party && G.party.ids && G.party.ids.includes(id)) return; // she is out with you, not on shift
  if (G.nightTurn < 60) return;                 // the thought arrives after midnight
  if (NPC_ROLES[id] !== "hostess") return;
  if (_queerVenue()) return;                    // the cabaret has no barfine to self-pay
  if ((G.soc.heat[G.room] || 0) > 0) return;
  if (G.soc.selfBf) return;                     // one such offer per night, city-wide
  if (_favor(id) < 6) return;
  if (_rand() >= 0.3) return;
  G.soc.selfBf = true;
  G.selfBfId = id;
  G.pendingEnc = "selfbf";
  const name = NPCS[id].name;
  _encPrompt(
    [`${name} studies you for a long moment, does some private arithmetic, and ` +
      `calls something to the mamasan in fast Thai. Then, to you: “I pay my own ` +
      `barfine tonight. You don't tell anybody, na.” The other girls have gone ` +
      "very quiet. This does not happen.", "win"],
    ["(YES / NO — she is not going to ask twice.)", "dim"]);
}

// ── Massage (three of the town's nine kinds) ─────────────────────────────────
// Canon: "massage" is the most elastic word in the language and the sign never
// tells you which kind. A LEGIT shop actually repairs you (the only mid-night
// fix for G.hurt) and refuses to sell the other thing; an OIL shop does the base
// rub, then the warmth-gated "special" (hand/mouth) — and the on-premises no-sex
// rule sends full service off to after her shift. SOAPY is its own modal below.
// These rooms have no barType on purpose, so no lady-drink/bell/barfine apparatus.
const MASSAGE_LEGIT = 300, MASSAGE_OIL = 300, MASSAGE_SPECIAL = 1000;

function _doMassage(arg) {
  const r = _room();
  if (r.soapy) { _doSoapy(); return; }   // wrong verb, right building — route it
  if (!r.massage) {
    _say("No massage bench here. The shops are off the tourist strips and along the " +
      "Second Road row — a foot rub by the Walking Street gate, or the pink-lit places up north.");
    return;
  }
  arg = (arg || "").replace(/^(a |for |the )/, "").trim();
  const wantsSpecial = /special|happy|extra|hand|mouth|boom|sex|sexy|finish/.test(arg);
  const she = _npcsHere().find(id => NPCS[id] && NPCS[id].masseuse);
  const name = she ? NPCS[she].name : "the masseuse";

  // ── Legit therapeutic: it heals, and it does not sell the other thing ──
  if (r.massage === "legit") {
    if (wantsSpecial) {
      _say(`${name} stops kneading just long enough to give you a look your mother would ` +
        "recognise. “Wrong shop, tilac. Down Second Road, plenty. Here — real massage only.” " +
        "The thumbs resume. You behave.");
      return;
    }
    if (G.money < MASSAGE_LEGIT) {
      _say(_fmt("A proper hour is ฿{p}; you have ฿{m}. {n} waves you to come back with " +
        "the fare — she isn't going anywhere.",
        { p: MASSAGE_LEGIT, m: G.money, n: name }));
      return;
    }
    G.money -= MASSAGE_LEGIT;
    const wasHurt = G.hurt, wasDrunk = G.soc.drunk;
    G.hurt = Math.max(0, G.hurt - 1);
    G.soc.drunk = Math.max(0, G.soc.drunk - 2);
    if (_passTime(6)) return;
    _say(`฿${MASSAGE_LEGIT}, and ${name} goes to work like she has a personal grudge against ` +
      "the knot under your shoulder blade — elbows, thumbs, one alarming manoeuvre involving " +
      "her heel and your spine. An hour later you unpeel off the mat rinsed, loosened, and " +
      `walking two inches taller. (฿${G.money} left.)`, "win");
    if (wasHurt > G.hurt) _say("(The banged-up ache eases a notch — this is the one place in " +
      "town that actually mends you, not just numbs you.)", "dim");
    if (wasDrunk > G.soc.drunk) _say("(And the Chang fog thins; she pressed something behind " +
      "your ear and the night stopped ringing.)", "dim");
    _addHappy(2);
    return;
  }

  // ── Oil shop: the base rub, then the warmth-gated "special" ──
  if (wantsSpecial) { _massageSpecial(she, name); return; }
  if (G.money < MASSAGE_OIL) {
    _say(_fmt("The oil massage is ฿{p}; you have ฿{m}. {n} pouts, forgives you instantly.",
      { p: MASSAGE_OIL, m: G.money, n: name }));
    return;
  }
  G.money -= MASSAGE_OIL;
  G.soc.drunk = Math.max(0, G.soc.drunk - 1);
  (G.soc.massaged = G.soc.massaged || {})[G.room] = G.day; // the base is done; special is on the table
  if (she) _addBond(she, 1); // a soft, cheap bond — no drinks, no mama cut
  if (_passTime(5)) return;
  _say(`฿${MASSAGE_OIL} and ${name} works warm oil down your back in the mirror-walled cubicle, ` +
    "humming, in no hurry. It is a genuinely good massage. It is also, quite clearly, not the " +
    "whole menu — somewhere around the base of your spine her thumbs ask a question. " +
    `(SPECIAL, if you're answering — ฿${MASSAGE_SPECIAL - MASSAGE_OIL} more.)`, "win");
  _addHappy(1);
}

function _massageSpecial(she, name) {
  if (G.soc.special && G.soc.special[G.room] === G.day) {
    _say(`${name} laughs and pats your cheek: “Greedy! Tomorrow, na.” One is the ration; the ` +
      "shop has a floor to work and so does she.");
    return;
  }
  const hadBase = G.soc.massaged && G.soc.massaged[G.room] === G.day;
  const price = hadBase ? MASSAGE_SPECIAL - MASSAGE_OIL : MASSAGE_SPECIAL;
  if (G.money < price) {
    _say(`The special runs ฿${price}${hadBase ? " on top" : ""}; you have ฿${G.money}. ${name} ` +
      "is sweet about it, but the oil stays strictly therapeutic.");
    return;
  }
  G.money -= price;
  (G.soc.special = G.soc.special || {})[G.room] = G.day;
  if (!hadBase && _passTime(3)) return;
  if (_passTime(3)) return;
  _say(`${name} checks the curtain, turns the radio up a notch, and ` +
    (hadBase ? "the massage quietly stops pretending to be only a massage" :
      "gives you the massage and the actual reason people come to Smile") +
    ". Hand and mouth, unhurried, her eyes finding yours in the wall of mirrors the whole time — " +
    `the “I like you” she led with turns out to be at least half true. (฿${G.money} left.)`, "win");
  _conquestHappy(4, she);        // a real release — feeds the hedonic treadmill, lightly
  if (she) _addBond(she, 1);
  // the on-premises wall, and the door it leaves open: her number, once per girl,
  // a real off-shift thread you carry — MEET her when the night's old, or she ghosts.
  const numKey = "gaveNumber_" + (she || G.room);
  if (G.offShift) {
    // already chasing someone's number — she reads it, unoffended
    _say(`Afterward she nods at the NO SEX sign, rueful — “{{Boom boom}} no can here, boss rule” — ` +
      `but you don't reach for a pen, and she laughs it off. “You have lady already, na? Mai pen rai.”`, "dim");
  } else if (_flag(numKey)) {
    // she's written you her number before (once per girl); the offer just stands
    _say(`Afterward she taps the NO SEX sign and grins. “{{Boom boom}} no can here — but you still ` +
      `have my number, na? Offer good: when I finish work, my place. Real one.”`, "dim");
  } else {
    _setFlag(numKey);
    G.itemLoc.masseuse_note = "inventory";
    G.offShift = { id: she || null, name, home: G.room, day: G.day,
      ghost: _hh((she || G.room) + ":" + G.day + ":offshift", 71) % 2 === 0 };
    _say(`Afterward she wipes her hands and tips her chin at the little NO SEX sign, rueful. ` +
      `“{{Boom boom}} no can here — boss rule, sticker everywhere. But when I finish work…” ` +
      `${name} biros a number onto a beer mat, folds it into your hand, and holds on a beat too long. ` +
      `“You come, na. Real one, my place.” (You pocket her number — MEET her when the night's old, ` +
      `or bin it.)`, "dim");
  }
}

const OFFSHIFT_TURN = 45; // she finishes work late — ~22:30 (nightTurn 0 = 18:00, dawn = 100)

// The off-shift meet: the note's payoff, and the mirror of the barfine. Late
// enough that she's off the floor, a genuine unhurried night in a real room —
// the "softer road" the SPECIAL seeds — but half of Pattaya's numbers are just
// numbers, so a day-stable coin (fixed when you pocketed it) decides whether she
// ever answers. One thread at a time; resolving it (meet OR ghost) closes it.
function _doMeetOffShift(arg) {
  if (!G.offShift || G.itemLoc.masseuse_note !== "inventory") {
    _say("You've nobody's number to chase tonight. (The kind of massage that isn't sometimes ends with one.)");
    return;
  }
  const os = G.offShift;
  if (G.nightTurn < OFFSHIFT_TURN) {
    _say(`Too early — ${os.name} is still on the shop floor. Her number's in your pocket; try when the night's old.`);
    return;
  }
  if (os.ghost) {
    G.itemLoc.masseuse_note = null; G.offShift = null;
    _say(`You text ${os.name}. Nothing. You text again; the little grey checkmark just sits there and ` +
      `stays grey. Some numbers are only ever numbers — a kindness at the end of a shift, meant and ` +
      `then not. You put the phone away.`, "dim");
    return;
  }
  const cost = Math.min(G.money, 300); // taxi both ways + a 7-Eleven raid — a fraction of any barfine
  G.money -= cost;
  G.itemLoc.masseuse_note = null;
  _say(`${os.name} texts back inside a minute — “you come? real one 🙂” — and an hour later you're ` +
    `somewhere unmistakably a real room and not a short-time one: her kettle, her drying laundry, a ` +
    `photo of a kid up-country turned face-down before you can ask. No mamasan, no barfine, no clock ` +
    `on the wall. Just ${os.name}, off the floor and entirely herself. ` +
    (cost ? `(฿${cost} for the taxi and a 7-Eleven raid — a fraction of the barfine you didn't pay.)` :
      `(Not a baht changes hands. Some nights the town forgets to charge you.)`), "win");
  _conquestHappy(9, os.id); // the softer road pays better than the fantasy
  if (os.id) _addBond(os.id, 4);
  G.offShift = null;
}

// ── Soapy massage: the fishbowl (ab ob nuat) — a modal, like the barfine gate ──
// The transparent big-ticket end of the trade: tiered, numbered girls behind
// glass; you pick a number, pay a set package, and everything after is on the
// premises. No haggling, no barfine games. A Thai-numbers hook by design — the
// hip discs read in Thai numerals; typing the Arabic number (or the tier) works.
const _SOAPY_TIERS = [
  { key: "star",  label: "star",       num: 35, price: 1500 },
  { key: "super", label: "super star", num: 71, price: 2200 },
  { key: "model", label: "model",      num: 99, price: 3000 },
];

function _doSoapy() {
  if (!_room().soapy) {
    _say("No fishbowl here. Poseidon, up on the Second Road massage row, is the one with the glass.");
    return;
  }
  if (!_flag("act1Done")) {
    _say("Four floors of soapy massage on a stolen-wallet budget? Sort the essentials first, Aquaman.");
    return;
  }
  if (G.soc.soapyDone === G.day) {
    _say(`${_soapyBoss()} takes one look and laughs. “Again? Go home, sleep, eat something — tomorrow.” ` +
      "Once through the soap is plenty for one night.");
    return;
  }
  G.pendingSoapy = { room: G.room };
  _soapyPrompt();
}

// The manageress of the soapy you're standing in (Poseidon's Toom, or a generic
// one at a filler soapland) — so the prose isn't hardwired to one venue.
function _soapyBoss() {
  const id = _npcsHere().find(n => NPCS[n] && NPCS[n].soapyBoss);
  return id ? NPCS[id].name : "the manageress";
}

// Single source for the live menu, the invalid-pick reprompt, and the resume
// redraw (see _renderResume — a new modal gate must redraw or the load is blind).
function _soapyPrompt() {
  _say(`${_soapyBoss()} slides the laminated menu across and nods at the glass. Pick a number:`, "dim");
  for (const t of _SOAPY_TIERS) _say(`  [${thaiDigits(t.num)}]  ${t.label} — ฿${t.price}`, "dim");
  _say(`(Say a number — ${_SOAPY_TIERS.map(t => t.num).join(" · ")} — or the tier name. NO backs out.)`, "dim");
}

// Returns true when it consumes the modal (paid or cancelled), false on a
// reprompt — so doCommand only spends a _tick on a real resolution.
function _soapyResolve(input) {
  if (/^(no\b|cancel|never|forget|leave|out|nothing|maybe|nvm)/.test(input)) {
    G.pendingSoapy = null;
    _say("You take one more look at the glass and decide your wallet has strong opinions. " +
      `${_soapyBoss()} shrugs, entirely unoffended — the fish keep swimming.`);
    return true;
  }
  const thai = parseThaiDigits(input);
  const num = thai != null ? thai : (/\d+/.test(input) ? parseInt(input.match(/\d+/)[0], 10) : null);
  let tier = num != null ? _SOAPY_TIERS.find(t => t.num === num) : null;
  if (!tier) tier = _SOAPY_TIERS.find(t =>
    input.includes(t.key) || input.includes(t.label) ||
    (t.key === "super" && /\bsuper\b/.test(input)) || (t.key === "model" && /\bmodel\b/.test(input)));
  if (!tier && /\bstar\b/.test(input)) tier = _SOAPY_TIERS[0]; // bare "star" → the entry tier
  if (!tier) { _say(`${_soapyBoss()} taps the glass, patient: “That number not here, tilac.”`, "dim"); _soapyPrompt(); return false; }
  if (G.money < tier.price) {
    G.pendingSoapy = null;
    _say(`Number ${thaiDigits(tier.num)} is the ${tier.label} tier — ฿${tier.price}. Your pocket says ` +
      `฿${G.money}. ${_soapyBoss()} closes the menu with a kind, final click: “Maybe the star, next time.”`);
    return true;
  }
  G.pendingSoapy = null;
  G.money -= tier.price;
  G.soc.soapyDone = G.day;
  if (_passTime(8)) return true; // the long ritual eats a chunk of night
  _say(`You point at ${thaiDigits(tier.num)}. A minute later number ${thaiDigits(tier.num)} — the ` +
    `${tier.label} — collects you with a professional smile and a numbered locker key. Upstairs: a warm ` +
    "tiled room, a bath the size of a small car, an air mattress, and no clock anywhere. She baths you " +
    "like it's a vocation, and the set package delivers precisely what the laminated menu promised — " +
    `everything, unhurried, on the premises. (฿${G.money} left.)`, "win");
  _conquestHappy(tier.key === "model" ? 7 : tier.key === "super" ? 6 : 5);
  return true;
}

// ── Quests (adventures) ──────────────────────────────────────────────────────
// Data in QUESTS (world.js). States in G.quests: undefined → offered (giver
// mentioned it) → active (ACCEPT) → done (doneFlag detected, reward paid) or
// abandoned (re-offerable). Dependencies gate the offer, not the talk.

// Act One's trail, shared by SCORE and the QUESTS journal. The founding
// adventure is NOT a QUESTS entry — it can't be accepted or abandoned, and
// its completion is a stage transition (_checkAct1), not a reward payout —
// but the journal observes its flags like any other part of the world.
const _ACT1_MILESTONES = [
  ["knowWasHere", "Worked out where you were last night"],
  ["knowMot", "Learned who lifted the wallet"],
  ["knowOyHasIt", "Traced the wallet to Madam Oy"],
  ["knowDoorTrick", "Learned the office door trick"],
  ["pinPart71", "Clue: the number 71"],
  ["pinPart9", "Clue: the lucky 9"],
  ["hasWallet", "WALLET RECOVERED"],
];

// How far down the opening critical path you got: milestones ticked, 0…7.
function _act1Progress() {
  return _ACT1_MILESTONES.reduce((n, [f]) => n + (_flag(f) ? 1 : 0), 0);
}

// The opening quest is do-or-die (called from _endNight when the night ends in
// Act One). No soft rough-wake — the game RESETS to the beach, keeping only a
// high-water mark of how far down the path you got, so each run measures against
// your best. The mark is the one thing carried across the newGame().
const _ACT1_FAIL_LEDE = {
  dawn: "The gulf goes grey, then pink. 04:00. The baht buses are carrying home " +
    "everyone but you — you never made it back to 412, and the beach has you again.",
  collapse: "Your body files its objection before the bed ever gets a vote. You " +
    "fold up on the pavement, a long dark town short of room 412.",
  blackout: "Somewhere the film simply stops. When it restarts it's morning, " +
    "you're on the sand, and 412 is exactly as far away as it was at sunset.",
  hurt: "One knock too many. A ward, a drip, a nurse who has seen your kind of night " +
    "before — and by the time they let you go, room 412 is a day you never finished.",
  accident: "The road took the decision out of your hands: a ward ceiling, a drip, and " +
    "room 412 exactly as far away as it was when the bike went over.",
};
function _act1Fail(reason) {
  const reached = _act1Progress(), total = _ACT1_MILESTONES.length;
  const prevBest = G.act1Best || 0, best = Math.max(prevBest, reached);
  const tries = (G.act1Tries || 0) + 1; // this run counts; ≥1 unlocks HINT next time
  const gotWallet = _flag("hasWallet");
  _say("═══════════════════════════════════", "alert");
  _say(_ACT1_FAIL_LEDE[reason] || _ACT1_FAIL_LEDE.dawn, "alert");
  _say(_fmt("THE NIGHT BEAT YOU HOME. You got {r} of {t} steps down the road back to " +
    "room 412{w}.", { r: reached, t: total,
      w: gotWallet ? " — wallet in hand, just not the hours left to spend it" : "" }), "alert");
  if (reached > prevBest) _say(_fmt("★ Furthest yet: {r}/{t}. The next run starts cold — " +
    "but you know the way a little better now.", { r: reached, t: total }), "win");
  else if (prevBest) _say(_fmt("(Your best is still {b}/{t}. Beat it.)",
    { b: prevBest, t: total }), "dim");
  if (tries === 1) _say("(One thing the beating buys you: from here on, the soi will " +
    "whisper. Type HINT when you're stuck.)", "dim");
  _say("Dawn wipes the slate. Same beach, same day two, same empty pockets — go again.", "room");
  _say("");
  const identity = G.player;  // who you are was decided in the taxi — not re-picked each attempt
  // …and so was the MONTH. G.season0 is seeded by the FRONTEND off the wall
  // clock at game creation (rule 1: the engine reads no clock); newGame()
  // below can only fall back to the November default, so a September arrival
  // turned into November across the reset — WEATHER said "deep low" on day
  // two and "high season proper" on the day-two-again that followed, while
  // the paper's lottery box kept saying 2026-09 (Malcolm, round 36).
  const season0 = G.season0;
  const dog = G.dog;          // and so was he: a companion is not part of the slate (dog-person playtest 2026-08-22)
  newGame();
  if (season0 != null) G.season0 = season0;   // same month you arrived in
  G.act1Best = best;      // the record…
  G.act1Tries = tries;    // …and the attempt count survive the reset (unlocking HINT)
  if (dog) {
    G.dog = dog; _setFlag("hasDog");
    _say(_dogN("(Sai Krok is still at your heel. Whatever the night wiped, it didn't wipe him — " +
      "he was there for all of it, and he's here for the next one.)"), "dim");
  }
  if (identity && identity.origin) {
    G.player = identity;
    // The card is canonically still in your pocket — the intro PROMISED "CALL
    // TAN — any hour" and a reset run answered "Call who?" (veteran playtest,
    // 2026-08-17). His number and name ride the reset with your identity.
    G.phone.contacts.tan = true;
    G.known.tan = true;
    // Identity survives; CONVERSATION MEMORY doesn't — "Dawn wipes the slate"
    // must include what you told people, or an NPC re-asks her question and then
    // grapevine-scolds you for answering it differently than in a night that
    // canonically never happened (mobile playtest, 2026-08-17).
    G.player.said = {}; G.player.heard = {};
  }
  engineIntro();
}

// Round-2+ HINT system: once the do-or-die opening has beaten you at least once
// (act1Tries ≥ 1), the soi whispers the next step — keyed to the first unreached
// milestone. The endgame hint names both routes to the wallet: the polite one
// (wai Madam Oy and she hands it back) and the safe-crack (her office when
// 'Sabai Sabai' plays; the code is her dancer's number 71 + a lucky 9).
const _ACT1_HINTS = [
  ["knowWasHere", "Start with proof you were even out last night — READ what's still in your " +
    "pockets, then take it to Candy, the Candy Bar mamasan. She misses nothing on this soi."],
  ["knowMot", "Candy remembers you leaving toward LK Metro with a little pickpocket, Mot, on " +
    "your heels. TALK to her about the wallet — a lady drink speeds the story along."],
  ["knowOyHasIt", "Mot fences everything he lifts to one buyer. Lek at Lucky Tiger saw him flash " +
    "cash this morning — ASK LEK where your wallet ended up."],
  ["hasWallet", "It's in Madam Oy's safe at Rainbow Girls, deep in the Tree Town maze off Buakhao's north end. Oy respects manners: WAI her " +
    "properly, then ask about the wallet — a polite man, she may just hand it back. (The hard way " +
    "in: slip into her office when DJ Beer plays 'Sabai Sabai', and crack the safe — her old " +
    "dancer's number was 71, and she puts a lucky 9 on the end of every code. Candy, Ploy, Pim and " +
    "Daeng each hold a piece \u2014 ASK ANY OF THEM ABOUT OY.)"],
];
// Resolve a quest's `at` (an NPC id or a room id) to a live location clause for
// a hint — where the person actually is TODAY (NPCs can move), which venue, and
// the geographic area. Returns "" when it isn't worth saying (unknown, or you're
// already standing there).
function _questWhere(at) {
  if (!at) return "";
  // One cast: the rail regulars are NPCS entries too, but their clause keeps
  // its own branch below — a regular can be ABSENT (days/season) and can MOVE
  // (Glam's shuttle), and this branch would confidently place the stool he
  // isn't on. Flag check, or the fold silently retires the drift warning.
  if (NPCS[at] && !NPCS[at].patron) {
    const room = _npcRoom(at);
    if (room === G.room || _npcsHere().includes(at)) return ""; // she's right here
    const r = ROOMS[room];
    return r ? _fmt(" {who} is at {v}, over in {r}.",
      { who: NPCS[at].name, v: _barName(room), r: r.region }) : "";
  }
  if (NPCS[at] && NPCS[at].patron) {
    // A patron giver moves too — a shuttled regular (Glam: home bar early, walked
    // across after 22:00) or, if hopping is ever re-enabled, an hourly drift. Read
    // his LIVE room via _npcWhere so the clue never points at a stale bar.
    const room = _npcWhere(at);
    // not out tonight: the journal said "find Fergie in his maze" and nothing else
    // for two nights (Colin, round 37) — name the local, and the man who knows
    if (!room) {
      const local = _barName(NPCS[at].room);
      return _fmt(" {who} isn't out tonight — {v} is his local. (ASK TAN ABOUT {WHO} knows his habits.)",
        { who: NPCS[at].name, v: local || "his bar", WHO: NPCS[at].name.toUpperCase() });
    }
    if (room === G.room || _regularsHere().includes(at)) return "";
    // A rail regular's location is true when it prints and can be false by the
    // time you walk there — the player was sent to the Cheeky Monkey and found
    // the Hyper (persona report A#3, 2026-08-23). Withholding it wastes the most
    // useful thing we know; promising it goes stale. So say BOTH: where he is,
    // and that he is a man who moves. Detected by asking _npcWhere where he
    // will be an hour from now — a pure hash, so it costs no dice.
    // Keyed on _willMove, not on a one-hour probe. The probe (mutate nightTurn,
    // re-ask, restore) was built for Glam's certain 22:00 shuttle, where it is
    // exactly right; against a 10%-an-hour drift it answers "no" nine times in
    // ten, so the caveat would almost never print and the clue would read as a
    // firm promise that goes stale two hours later.
    const _moves = (typeof _willMove === "function" && _willMove(at)) ||
      (function () {
        const t0 = G.nightTurn;
        G.nightTurn = Math.min(NIGHT_TURNS - 1, t0 + 10);
        const m = _npcWhere(at) !== room;
        G.nightTurn = t0;
        return m;                       // still catches Glam's shuttle
      })();
    const r = ROOMS[room];
    if (!r) return "";
    return _moves
      ? _fmt(" {who} is at {v} in {r} right now — though he drifts, so ask after him when you get there.",
          { who: NPCS[at].name, v: _barName(room), r: r.region })
      : _fmt(" {who} is at {v}, over in {r}.",
          { who: NPCS[at].name, v: _barName(room), r: r.region });
  }
  if (ROOMS[at]) {
    if (at === G.room) return "";
    const vn = _barName(at); // some venue names already lead with "The" (The Orchid Room)
    // the article is a FORK, not a slot: English needs one where the name lacks it,
    // German drops it before a proper venue name (no gender to guess at).
    return /^the\b/i.test(vn)
      ? _fmt(" That's {v}, in {r}.", { v: vn, r: ROOMS[at].region })
      : _fmt(" That's the {v}, in {r}.", { v: vn, r: ROOMS[at].region });
  }
  return "";
}

// QUIT / END / LOGOUT — a text adventure that saves after every move has
// nothing to log out OF; the front-end owns the start menu. Voice the refusal
// (house rule: a plausible verb gets an answer, never "didn't parse") and point
// at the real verbs. Frontend-agnostic on purpose — no "tab"/"window" here.
function _doQuit() {
  if (G.game) { _gameQuit(); return; } // a live mini-game: concede it (belt-and-braces; doCommand routes first)
  _say("Nothing to quit out here — the soi keeps your place between visits, so you " +
    "can wander off any time and pick up right where you stood. To turn in, (SLEEP) " +
    "ends the night; to start the whole trip over from the airport, (RESTART).", "dim");
}

function _doHint() {
  if (_flag("act1Done")) {
    // Sandbox: reuse the "next actionable step" idea for the quest journal —
    // point at one active quest (with where to go), else nudge an offer.
    // vignettes are excluded here too — HINT points at the next JOB, and an
    // origin scene is not one (it would also outrank real work forever,
    // since it stays "active" until you happen to ask the right topic).
    const active = Object.keys(QUESTS).filter(q => G.quests[q] === "active" && !QUESTS[q].vignette);
    if (active.length) {
      const q = QUESTS[active[0]];
      _say(_fmt("On the books: {name} — {desc}{where}",
        { name: _L(q.name), desc: _L(_qDesc(q)), where: _questWhere(_qAt(q) === q.giver ? _qGiver(q) : _qAt(q)) }), "win");
      return;
    }
    // the nudge never points at an alignment errand — "never push" is the doctrine,
    // and HINT was recommending Gavin's WDG job three nights running (expat playtest)
    // the bar chain's one hidden step: bar_premises done, bar_licence not yet
    // reachable — the answer is a man you have to get to KNOW (27-night playtest
    // 2026-08-22: four weeks of "Signin' Friday" and nothing pointed at Wayne)
    if (G.quests.bar_premises === "done" && !G.quests.bar_licence && _flag("expatLife")) {
      const w = _qGiver(QUESTS.bar_licence);
      const nm = NPCS[w] ? NPCS[w].name : "Wayne";
      _say(`Bert told you to find out what a farang can actually sign. The man who knows is ${nm}` +
        (w === "wayne" ? " — the loud Australian with the folder at the Golden Dragon, about to sign the wrong thing. Sit with him. Answer what he asks. He tells the straight version to a man he trusts, and to nobody else." : " — sit with him and ask about the LICENCE."), "win");
      return;
    }
    const offered = Object.keys(QUESTS).filter(q => G.quests[q] === "offered" && !QUESTS[q].noNudge);
    if (offered.length) {
      const q = QUESTS[offered[0]];
      const giver = NPCS[_qGiver(q)] ? NPCS[_qGiver(q)].name : "Someone";
      _say(_fmt("{giver} has a job going — “{name}”. Take it on with ACCEPT {id}.",
      { giver, name: _L(q.name), id: offered[0].toUpperCase() }), "win");
      return;
    }
    _say("The wallet's yours and the opening's behind you — out here there are no wrong " +
      "answers, only better nights.", "dim");
    _sayLeads(true);
    _say("(QUESTS lists jobs, WHO your black book, MAP the lay of the land.)", "dim");
    return;
  }
  if ((G.act1Tries || 0) < 1) {
    _say("No hints your first night, tilac — the town is yours to read. But it remembers a face: " +
      "miss home by dawn and you start over, and the second run… the soi begins to whisper.", "dim");
    return;
  }
  const reached = _act1Progress(), total = _ACT1_MILESTONES.length;
  // Diagnose the BLOCKER before reciting the chain. _ACT1_HINTS is keyed only on
  // quest progress, so a player stranded on the wrong side of the bay with no
  // fare and a dead phone was told to go and talk to a woman eight kilometres
  // away — "the one thing you already knew, at the moment you most needed
  // something else" (opening auditor 2026-08-23, and her top recommendation).
  // The chain hint is right when knowing the next name is the problem; when
  // getting there is the problem, say that instead.
  const _stuckSouth = /^(jomtien|dongtan|thappraya|pratumnak|buddha)/.test(G.room) &&
    G.money < BUS_FARE && !_flag("act1Done");
  if (_stuckSouth) {
    const _phoneDead = G.battery <= 0;
    _say("The soi whispers, and for once it isn't about the wallet: you are on the " +
      "wrong side of the bay with " + (G.money ? `฿${G.money}` : "nothing") +
      ` in your pocket, and the fare is ฿${BUS_FARE}. ` +
      (_phoneDead
        ? "Your phone is dead, so the easy way out is shut. Empty bottles are ฿5 " +
          "each to Auntie Nok at the Soi 7 end of the sand — the beach leaves them " +
          "everywhere, and a lit stretch will do it. (SELL BOTTLES once you've got a few.)"
        : "Before anything else: you have a number and he said any hour. (CALL TAN.)"), "win");
    // …and then the chain, because the blocker is HOW to get there and the chain
    // is what to do when you arrive. A player on the opening beach is technically
    // "stranded" from turn one, so suppressing the chain here would replace the
    // hint system rather than complete it.
  }
  const next = _ACT1_HINTS.find(([f]) => !_flag(f));
  _say(_fmt("The soi whispers — you're {r}/{t} of the way home. ", { r: reached, t: total }) +
    (next ? next[1] :
      "Everything's in hand. Now just get to room 412 in Naklua before dawn takes the night."), "win");
}

// The giver of a quest, allowing for the player BEING him: the seven origin
// archetypes are NPCs, and picking one deactivates that NPC — which silently
// deleted the only giver of `bar_licence` for the one origin built to want a bar
// (the investor IS Wayne; expat playtest 2026-08-22). A quest may name a
// `giverIfSelf` who steps in, and a dep whose giver is you is treated as lived.
function _qGiver(q) {
  if (q && q.giverIfSelf && q.giver && NPCS[q.giver] && !_npcActive(q.giver)) return q.giverIfSelf;
  return q ? q.giver : null;
}
function _qAt(q) { return typeof q.at === "function" ? q.at(G) : q.at; }
function _qDesc(q) {
  return (q.descIfSelf && _qGiver(q) !== q.giver) ? q.descIfSelf : q.desc;
}
function _questAvailable(qid) {
  const q = QUESTS[qid];
  const st = G.quests[qid];
  if (st === "active" || st === "done") return false;
  // reqFlags: world-state gates (e.g. "hasDog") — deps chain quests, reqFlags
  // gate on anything a flag can express
  if (q.reqFlags && !q.reqFlags.every(f => _flag(f))) return false;
  // trust: a giver won't hand you a personal/serious job until they know you
  // (see _npcState). Gates the offer AND accept, so you can't shortcut it.
  if (q.trust && _qGiver(q) && _npcState(_qGiver(q)).trust < q.trust) return false;
  // Soi 6 mode confines you to the pocket, so don't offer a job whose target
  // (a room, or an NPC's bar) lies outside it — e.g. the Shamrock Dog, out on
  // the Darkside. You'd accept it and have no way to finish it this trip.
  if (G.mode === "soi6") {
    // the GIVER must be reachable in the pocket — else you can never be offered it
    // in-fiction, yet ACCEPT-autocomplete (which lists _questAvailable) would still
    // surface it and let you accept a quest you can't finish (e.g. Candy's 'recce',
    // giver off-map at Candy Bar, and with no q.at to catch it below).
    const gv = _qGiver(q);
    const giverRoom = gv && (NPCS[gv] ? _npcRoom(gv) :
      NPCS[gv] && NPCS[gv].patron ? _npcWhere(gv) : null);
    if (giverRoom && !SOI6_ROOMS.has(giverRoom)) return false;
    // and the target (a room, or an NPC/patron's bar) must be in-pocket too
    if (q.at) {
      const targetRoom = ROOMS[q.at] ? q.at :
        NPCS[q.at] ? _npcRoom(q.at) :
        NPCS[q.at] && NPCS[q.at].patron ? _npcWhere(q.at) : null;
      if (targetRoom && !SOI6_ROOMS.has(targetRoom)) return false;
    }
  }
  // A dep you couldn't have done because you ARE its giver counts as lived — but
  // ONLY a VIGNETTE, which is what the waiver was always for: an origin scene
  // about the man you picked, which cannot happen because he is you. It used to
  // waive any dep whose giver was inactive, and that is transitive poison: pick
  // the investor origin and Wayne deactivates, so `bar_licence` (his JOB, not a
  // vignette) counted as lived, so Candy offered FIFTY-ONE PERCENT — step three
  // of the bar chain — to a man who had done none of the four steps. Accepting
  // it put an unfinishable quest permanently on the books, with a tappable hint
  // that only ever deflected, because the dialogue node behind it is correctly
  // gated (credit-analyst persona, round 20). A real job is never lived by
  // proxy; only the scene you embody is.
  return q.deps.every(d => G.quests[d] === "done" ||
    (QUESTS[d] && QUESTS[d].vignette && QUESTS[d].giver &&
     NPCS[QUESTS[d].giver] && !_npcActive(QUESTS[d].giver)));
}

// Called after a giver's dialogue lands: surface any offer they have.
// The offer-time form of a quest desc: same sentence, minus the parenthesised
// command, because that command is for after you accept. Trailing punctuation
// is tidied so "…hear it (ASK PETE ABOUT THE NAME)." doesn't become "…hear it ."
function _questPitch(desc) {
  return String(desc || "")
    .replace(/\s*\([A-Z0-9][^)]*\)\s*/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── The first job finds YOU ──────────────────────────────────────────────────
// _questOffer only fires at the end of TALKing to a giver, which assumes the
// player already knows that talking to people until something surfaces is what
// this game is. A first-timer does not. Measured: inside the Soi 6 pocket
// exactly ONE real quest is reachable by a new character (Bert's league night —
// trust 0, no deps, no flags), and it waits behind a conversation he has no
// reason to start.
//
// So the FIRST one comes to him. On arrival, if a giver here has a job going
// and the player has never had a quest in his life, the giver calls him over
// and the normal offer follows. Self-disabling the moment `G.quests` has
// anything in it at all — after your first job, you are expected to know how
// this works, and nobody hails you again for the rest of the game.
// Pronoun-free on purpose: the giver may be Candy or Bert alike, and the pool
// once hard-coded "his chin… of a man" — which misgendered every mamasan who
// offered a job (both playtests, 2026-08-17).
const _QUEST_HAIL = [
  "{who} looks up from the rail and picks you out. \u201cOi. You. Got a minute, or are you " +
    "just here to drink?\u201d",
  "\u201cHere \u2014 before you sit down.\u201d {who} has the look of somebody who has been " +
    "waiting all night for a face that isn't a regular's.",
  "{who} catches your eye and tips a head toward the quiet end of the bar \u2014 the " +
    "universal come-here of somebody with a job and nobody obvious to do it.",
];

function _questHail() {
  if (G.questHailed) return;                       // once ever, not once a night
  if (Object.keys(G.quests || {}).length) return;  // you've had a job — you know the drill
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (q.vignette || !_qGiver(q) || !_questAvailable(qid)) continue;
    if (!NPCS[_qGiver(q)] || _npcRoom(_qGiver(q)) !== G.room) continue;
    G.questHailed = true;
    _say(_fmt(_pickVary(_QUEST_HAIL, "qhail"), { who: NPCS[_qGiver(q)].name }), "win");
    _questOffer(_qGiver(q));
    return;
  }
}

function _questOffer(npcId) {
  // Don't pile a job offer on top of a question the giver just put to you — let
  // the player answer first (it reads as one overwhelming turn otherwise, and it's
  // unclear which thing to respond to). The offer surfaces next time you talk.
  if (G.convoQ) return;
  // a man who won't give you a stool won't give you his bar (completionist playtest 2026-08-22)
  if (npcId === "bert" && typeof _faction === "function" && _faction("wdg") > 0) return;
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (_qGiver(q) !== npcId || !_questAvailable(qid)) continue;
    // A VIGNETTE is not a job. The seven origin scenes — the man whose life you
    // didn't pick, telling you the thing he tells nobody — were wearing the full
    // quest chrome: a ✦ job offer, an ACCEPT, a journal row and a QUEST
    // COMPLETE, for what is two turns of talk. A playtester finished one and
    // said "I'm not even sure what that was about", which is what happens when
    // the frame promises a task and the content delivers a scene. So they open
    // silently the first time you get the giver talking, and end as a beat.
    if (q.vignette) { if (!G.quests[qid]) G.quests[qid] = "active"; continue; }
    if (G.quests[qid] === "offered") continue; // already on the table — surface the giver's NEXT job instead
    G.quests[qid] = "offered";
    // A quest's `desc` is the ACTIVE-quest instruction and its tappable command
    // usually only works once you've accepted — Pete's "(ASK PETE ABOUT THE
    // NAME)" gets you a shutter coming down until quiet_one is active. Printing
    // it at OFFER time put two commands on screen, of which the specific-looking
    // one was the wrong one, and a playtester did exactly what it said and got
    // brushed off. So strip the hint here; ACCEPT is the only live command at
    // this point, and QUESTS/HINT print the desc in full once it is.
    _say(_fmt("✦ {who} has a job for you: “{name}” — {desc}",
      { who: NPCS[npcId].name, name: _L(q.name), desc: _questPitch(_L(_qDesc(q))) }), "win");
    _say(`(ACCEPT ${qid.toUpperCase()} to take it on.)`, "dim");
    return; // one offer at a time keeps the bar chatter sane
  }
}

function _findQuest(word) {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  return Object.keys(QUESTS).find(qid =>
    qid === w || QUESTS[qid].name.toLowerCase().includes(w)) || null;
}

function _doAccept(arg) {
  // A NAMED QUEST THAT MATCHES NOTHING IS A MISS, NOT A DEFAULT. ACCEPT RECON
  // (for "Candy's Competition Recce") used to fall through to "the first thing
  // on offer" and silently accept The Sister-Bar Run instead — different quest,
  // no confirmation, and an item pushed into the player's hands (round 22). A
  // wrong quest accepted quietly is worse than a clean miss, every time.
  const offered = Object.keys(QUESTS).filter(q => G.quests[q] === "offered");
  const qid = arg ? _findQuest(arg) : (offered.length === 1 ? offered[0] : null);
  if (!qid) {
    if (arg) _say(`Nothing on offer by that name. (QUESTS lists what's on the table.)`);
    else if (offered.length > 1)
      _say("Accept which? " + offered.map(q => _L(QUESTS[q].name)).join(" · ") +
        " — name one. (QUESTS lists them.)");
    else _say("Accept what? (QUESTS lists what's on offer.)");
    return;
  }
  const q = QUESTS[qid];
  if (G.quests[qid] === "active") { _say("Already on it."); return; }
  if (G.quests[qid] === "done") { _say("That one's finished. Bask."); return; }
  // "(You now have the bottle of Sang Som.)" from a giver who was working her
  // other bar (Bronwyn, round 39): a quest with a THING to hand over is accepted
  // where she is; a flag-only errand can be taken on from the journal
  if (QUESTS[qid].item && NPCS[QUESTS[qid].giver] && NPCS[QUESTS[qid].giver].bars &&
      _npcRoom(QUESTS[qid].giver) !== G.room && !_npcsHere().includes(QUESTS[qid].giver)) {
    const gv = NPCS[QUESTS[qid].giver];
    const where = typeof _npcWhere === "function" && _npcWhere(QUESTS[qid].giver);
    _say(`${gv.name} isn't here to hand it over` + (where && _barName(where) ? ` — ${gv.pronoun === "he" ? "he's" : "she's"} at ${_barName(where)} tonight.` : "."));
    return;
  }
  if (G.quests[qid] !== "offered" && !_questAvailable(qid)) {
    _say("You've heard of it, but nobody's actually offered it to you yet."); return;
  }
  G.quests[qid] = "active";
  _say(_fmt("✦ Quest accepted: {name}", { name: _L(q.name) }), "win");
  _say(_qDesc(q), "dim");
  if (q.item && G.itemLoc[q.item] === null) {
    G.itemLoc[q.item] = "inventory";
    _say(`(You now have the ${ITEMS[q.item].name}.)`, "dim");
  }
}

function _doAbandon(arg) {
  if (G.stage === "act1" && (/wallet|baht bus|act/.test(arg) ||
      (!arg && !Object.keys(QUESTS).some(q => G.quests[q] === "active")))) {
    _say("Abandon your own wallet? It has your key card, your cash, and your " +
      "way home in it. No. This one you finish.");
    return;
  }
  const qid = _findQuest(arg) ||
    Object.keys(QUESTS).find(q => G.quests[q] === "active");
  if (!qid || G.quests[qid] !== "active") { _say("You're not on that job."); return; }
  G.quests[qid] = "abandoned";
  const q = QUESTS[qid];
  if (q.item && G.itemLoc[q.item] === "inventory") G.itemLoc[q.item] = null;
  _say(_fmt("✦ Abandoned: {name}. The soi forgives; the giver may offer it again.",
    { name: _L(q.name) }), "dim");
}

// ── Live leads ──────────────────────────────────────────────────────────────
// Measured on day three of a vacation: QUESTS, HINT and SCORE all answer the
// question "what should I do now?" with the same sentence — "the givers are out
// there, talk to people." True, and useless. It is the night-one discoverability
// wall again, except across the whole map with no hail to rescue you.
//
// So when nothing is on the books, say what is actually open, drawn from world
// state rather than from a list: a man you have MET who has work going, a girl
// who is warmer to you than the rest, a district you have not walked into yet.
// No new content — the threads all exist, and the game has simply never named
// them.
function _leads() {
  const out = [];

  // 1. someone you know, with a job going. Only people you have actually met:
  //    naming a stranger is a spoiler, not a lead.
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (q.vignette || G.quests[qid] || !q.giver) continue;
    if (!G.known || !G.known[q.giver] || !NPCS[q.giver]) continue;
    if (!_questAvailable(qid)) continue;
    const where = _questWhere(q.giver);
    out.push(_fmt("{who} has something going — worth another word.{where}",
      { who: NPCS[q.giver].name, where: where ? " " + where.trim() : "" }));
    break;
  }

  // 2. the girl who is warmest to you. The relationship layer is the deepest
  //    thing in here and the easiest to forget you have started.
  let best = null, bestN = 0;
  for (const [id, n] of Object.entries(G.soc.drinks || {})) {
    if (n > bestN && NPCS[id] && _npcRoom(id)) { best = id; bestN = n; }
  }
  if (best && bestN >= 2) {
    const bar = _barName(_npcRoom(best));
    out.push(_fmt("{who} remembers you{bar}. That goes somewhere, if you keep turning up.",
      { who: NPCS[best].name, bar: bar ? " at " + bar : "" }));
  }

  // 3. somewhere you have never set foot. The map is most of the game and a
  //    player who found one soi on night one will happily die on it all week.
  //    (Soi 6 mode: the pocket is the map — never point at Second Road.)
  const seen = {}, all = {};
  for (const [id, r] of Object.entries(ROOMS)) {
    if (G.mode === "soi6" && typeof SOI6_ROOMS !== "undefined" && !SOI6_ROOMS.has(id)) continue;
    all[r.region] = true;
    if (G.visited && G.visited[id]) seen[r.region] = true;
  }
  const unseen = Object.keys(all).filter(rg => !seen[rg] && rg !== "Myth Night");
  if (unseen.length) {
    let where = unseen[Math.floor(_hh("leads" + G.day, 7) % unseen.length)];
    // In soi6 mode, "Beach Road" is the pocket's OWN junction/beach corner
    // (beach_rd_n, stinky_bar, blue_dog, north_beach — four fenced-IN rooms),
    // not the wider off-limits district of the same name. Naming it bare
    // read as the game pointing outside its own fence, right after telling
    // the player "you're not leaving Soi 6 this trip" (Priya's cold-
    // onboarding playtest, round 32, 2026-08-30: "But the opening explicitly
    // said I'm not leaving Soi 6").
    if (G.mode === "soi6" && where === "Beach Road") where = "the foot of the soi, down by the water";
    // No claim about how you'd get there: some of these are a walk, some a bus,
    // and the lead shouldn't guess. What IS reliably true is that the districts
    // do not look like each other.
    out.push(_fmt("You have not set foot in {where} yet, and it looks nothing like this stretch.", { where }));
  }
  return out;
}

function _sayLeads(dim) {
  const l = _leads();
  if (!l.length) {
    _say("Nothing on the books, and nobody's asked you for anything. Talk to people — " +
      "the jobs in this town come out of conversations, not noticeboards.", dim ? "dim" : "room");
    return;
  }
  _say("Nothing on the books. What's open:", dim ? "dim" : "win");
  for (const line of l) _say("  · " + line, "dim");
}

function _doQuests() {
  let shown = 0;
  if (G.stage === "act1") {
    _say("▶ The Last Baht Bus — find your wallet, get back to room 412 in Naklua.", "win");
    for (const [f, label] of _ACT1_MILESTONES) {
      // A clue's LABEL is the clue (the safe digits) — mask it until it's earned,
      // or the journal spoils the PIN on turn one (mobile playtest, 2026-08-17).
      const shownLabel = (!_flag(f) && /^Clue:/.test(label)) ? "Clue: (something you haven't found yet)" : label;
      _say(_fmt("  {mark} {label}", { mark: _flag(f) ? "✓" : "·", label: _L(shownLabel) }), "dim");
    }
    shown++;
  } else if (_flag("act1Done") && G.mode !== "soi6") {
    // soi6 mode force-sets act1Done but never plays Act One — no wallet, no score
    _say(`✓ The Last Baht Bus — Act One, scored ${G.score}`, "dim");
    shown++;
  }
  const rows = Object.entries(QUESTS).filter(([qid, q]) => G.quests[qid] && !q.vignette);
  for (const [qid, q] of rows) {
    const st = G.quests[qid];
    if (st === "active") { _say(_fmt("▶ {name} — {desc}{where}",
      { name: _L(q.name), desc: _L(_qDesc(q)), where: _questWhere(_qAt(q) === q.giver ? _qGiver(q) : _qAt(q)) }), "win");
      // multi-leg quests get the Act One checklist treatment: without per-leg
      // progress a missed leg is indistinguishable from a bug (Marguerite)
      for (const leg of (q.legs || [])) {
        const done = (leg.rooms || []).some(r => G.visited[r]);
        _say(_fmt("  {mark} {label}", { mark: done ? "✓" : "·", label: _L(leg.label) }), "dim");
      }
      shown++; }
    else if (st === "offered") { _say(_fmt("✦ On offer: {name} (ACCEPT {id})",
      { name: _L(q.name), id: qid.toUpperCase() }), "dim"); shown++; }
    else if (st === "done") { _say(`✓ ${q.name}`, "dim"); shown++; }
  }
  // Dropped quest/clue items are tied back to the journal so a set-down never
  // becomes a silent loss (design ask, 2026-08-17): show each keepsafe item
  // that's lying on a room floor, and where. _barName renders a venue; unknown
  // ids fall back to the room's name.
  const _placeName = rid => (typeof _barName === "function" && _barName(rid)) ||
    (ROOMS[rid] && ROOMS[rid].name) || "somewhere back there";
  for (const [iid, it] of Object.entries(ITEMS)) {
    if (!it.keepsafe || !(G.dropped && G.dropped[iid])) continue; // player-dropped only, not spawned
    const loc = G.itemLoc[iid];
    if (loc && loc !== "inventory" && ROOMS[loc]) {
      _say(`⚠ You left ${it.name} at ${_placeName(loc)} — go back for it before you need it.`, "alert");
      shown++;
    }
  }
  if (!shown) _sayLeads(false);
  // …but an OFFER on the books means somebody HAS asked you for something, and
  // the nudge below says nobody has — printed two lines under the offer itself
  // (completionist playtest, Soi 6, 2026-08-29).
  else if (!rows.some(([qid]) => G.quests[qid] === "active" || G.quests[qid] === "offered") &&
      G.stage !== "act1") {
    _sayLeads(true);
  }
}

// Reward sweep — runs every turn; any active quest whose doneFlag has been
// set (by give/win/bank, wherever) completes here.
function _questTick() {
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (G.quests[qid] !== "active" || !_flag(q.doneFlag)) continue;
    G.quests[qid] = "done";
    if (!q.vignette) _say(`✦ QUEST COMPLETE: ${q.name}`, "win");
    if (q.reward.money) {
      G.money += q.reward.money;
      _say(`(+฿${q.reward.money} — ฿${G.money} in pocket.)`, "dim");
    }
    if (q.reward.happy) _addHappy(q.reward.happy);
    _repGain(); // seeing a job through is the sort of thing that earns you a name (throttled)
  }
}

// ── Tan's manifest: the hub as a soft guide ─────────────────────────────────
// He drove all seven of them in from the airport, so he is the one character who
// can place the whole cast. Authored as a fixed recital it named five men you
// had never met — a wall of strangers, and a spoiler. Generated, it does the
// job the arc actually wants: the ones you KNOW get his read on them; the ones
// you don't get a place and a habit, which is a direction to walk in without
// ever being a quest marker. Re-ask after meeting someone and it has moved on.
const _TAN_READ = {
  doyle:  "the detective, who thinks nobody can see him working",
  wayne:  "the Australian with the bar he should not buy",
  roy:    "the old one who remembers too much and minds it less than he says",
  macca:  "the one who got paid off and is spending it at exactly the wrong speed",
  pete:   "the quiet one, who booked under a name that is not his",
  rob:    "the married one, who is not married any more and has not told his mother",
  barry:  "the golfer who has never once found the course",
  kyle:   "the young one with the tripod, who wants to run a bar — and, Buddha help him, means it",
};
// {bar} is filled from _npcRoom at speaking time — the table once hard-coded
// "Sandy Toes" (a room id; the sign says The Verandah) and put Doyle "up in
// Naklua" when he drinks at the Queen Vic (expat playtest 2026-08-22)
const _TAN_WHERE = {
  doyle:  "an Englishman who sits where he can watch a door — {bar}",
  wayne:  "a loud Australian with a folder of paperwork, down {bar}",
  roy:    "an old fellow on the same stool every night, {bar}, since before you were coming here",
  macca:  "a man buying rounds he cannot afford, {bar} way",
  pete:   "a very quiet one at {bar}, corner stool, back to the wall",
  rob:    "a fellow at {bar} who looks like he is waiting for a phone call",
  barry:  "a man in golf clothes at {bar} who has not played golf",
  kyle:   "a young fellow at {bar} with a computer beside his soda water, pitching the mamasan a loyalty programme",
};
function _tanWhere(id) {
  return (_TAN_WHERE[id] || "someone, somewhere on the soi").replace("{bar}", _barName(_npcRoom(id)) || "a bar on the soi");
}

// TAN'S READ ON PEOPLE HE DRIVES, where the generic clause would be a lie about
// them. He is the town's locator and he was flattening the one character whose
// whole arc refuses the sentence he used: Mercedes, who says in her own voice
// "people see an old girl back on the stool and they think — poor thing… I send
// my mother money when I want. I chose it." One reused template contradicted
// three women who assert otherwise (round 23).
const _TAN_WHO = {
  nont: "was Rabbit's boy — the phone, the till, the talking between a farang and everybody else — " +
    "until I found him a table that doesn't end on a police corkboard. He sells you an answer for " +
    "two hundred. I give it to you for nothing. You know the difference now, and so does he",
  mercedes: "is back on that rail because she decided to be, which is not the same story as the others " +
    "and she will correct you if you get it wrong. Ask her yourself. She does not mind the question; " +
    "she minds the assumption",
};
// The generic read, pooled so forty women are not described by one sentence.
const _TAN_ROLE_READ = [
  "works the rail there. Steady, that one — the bar would notice if she stopped coming",
  "works there. She is one of the ones who turns up when she says she will, which on this road is a skill",
  "is on the floor there most nights. Good at the job, and the job is harder than it looks from a stool",
  "works the rail there. Sends money north, like most of them — and unlike most of them, she has a date in her head for stopping",
  "works there. Ask her about her own business sometime instead of yours; you will learn more",
];
const _TAN_SIGNOFF = [
  "\u201cI drive everybody, my friend. I do not drive their secrets.\u201d",
  "\u201cThat is what I have. The rest is theirs to tell you.\u201d",
  "\u201cI take people places. What they do there is not on the meter.\u201d",
  "\u201cYou want more than that, you buy the drink, not me.\u201d",
  "\u201cEverybody gets in my car. Nobody gets read out of it.\u201d",
];

// ASK TAN ABOUT <someone>: he promised "meet somebody, then ask me who they are"
// and answered "that one I don't know" for everyone off the manifest (completionist
// playtest 2026-08-22). The seven get his read (_TAN_READ); anyone else gets a
// driver's placing — where they drink, how long, and no secrets.
function _tanAbout(topic) {
  const t = String(topic || "").toLowerCase().trim();
  const id = Object.keys(NPCS).find(i => NPCS[i].name.toLowerCase() === t || i === t ||
      NPCS[i].name.toLowerCase().split(" ").pop() === t) ||
    null;
  if (!id || id === "tan") return false;
  if (_TAN_READ[id]) {
    if (!(G.known && G.known[id])) { _say("“Meet him first, my friend. Then I tell you who he is — and I will already know.”"); return true; }
    _say(`“${NPCS[id].name}.” The grin. “${_TAN_READ[id]}.”`);
    return true;
  }
  const n = NPCS[id];
  // a regular's absence must read (days / season): _npcWhere is the
  // activity-aware alias, where bare _npcRoom names the stool he isn't on
  const room = n.patron ? _npcWhere(id) : NPCS[id] ? _npcRoom(id) : _npcWhere(id);
  const where = room && _barName(room) ? _barName(room) : null;
  const she = n.pronoun === "she" || (NPCS[id] && NPC_ROLES[id]);
  // role-accurate: Tan is the hub who reads the real structure of the soi — so
  // he must not call a mamasan a rail girl (Settler playtest, 2026-08-26: "ask
  // tan about candy/oy" said "she works the rail there" of two owners).
  const _role = NPCS[id] && NPC_ROLES[id];
  // Tan is the LOCATOR, so for a man who drifts the useful answer isn't the bar
  // he happens to be in — it's the habit. He knows where everybody ends up.
  const clause = (n.patron && typeof _willMove === "function" && _willMove(id))
    ? "is round there somewhere before ten — he moves, that one. After ten you " +
      "will find him at " + (_barName(n.room) || "his own bar") + ". Always"
    : n.patron
    ? "drinks there most nights — " + (n.nat || "") + ", " + (n.age || "") + ", you know the type. " +
      _ANCHOR_NAMES[_anchorNight(id)] + ", always, whatever the season"
    : _role === "mamasan" ? "runs the floor there. Owns the room in everything but the paperwork — and sometimes that too. You do not get past her by accident"
    : _role === "cashier" ? "keeps the till there. Nothing crosses that bar she has not already counted twice"
    : _role === "manager" ? "runs the place for the owner. Different job — the man who is there so the owner does not have to be"
    : _TAN_WHO[id] ? _TAN_WHO[id]
    // The generic hostess read. Pooled per-person by a stable hash rather than
    // one sentence for every woman on the roster — "sends money home, same as
    // all of them" printed about EVERYBODY was the flattening a persona caught
    // (round 23), and the fix is not only Mercedes's exemption below: a locator
    // that says the same thing about forty women is telling you about none.
    : _role ? _TAN_ROLE_READ[_hh(id + ":tanread", 53) % _TAN_ROLE_READ.length]
    : "is somebody the soi knows";
  // No venue means he is not out tonight — and the clause says "drinks THERE most
  // nights", which with nothing in front of it is a pronoun with no antecedent
  // (Soi 6 completionist, 2026-08-29). Tan knows where a man drinks even when the
  // man isn't in it, so name his local and say he's not in it.
  if (!where && n.patron && _barName(n.room)) {
    _say(`“${n.name}?” Tan tips his head. “${_barName(n.room)} is his place — but not tonight, I think. ` +
      `Some nights a man stays home. Even here.”`);
    return true;
  }
  _say(`“${n.name}?” Tan considers the mirror. “${where ? where + ". " : ""}${she ? "She" : "He"} ${clause}.” A shrug at the road. ${_pickVary(_TAN_SIGNOFF, "tansign")}`);
  return true;
}
function _tanOthers() {
  const cast = ["doyle", "wayne", "roy", "macca", "pete", "rob", "barry", "kyle"]
    .filter(id => NPCS[id] && _npcActive(id));            // the one you ARE is not out there
  const met = cast.filter(id => G.known && G.known[id] && (G.talked && G.talked[id]));
  const rest = cast.filter(id => met.indexOf(id) < 0);

  // Too early: he doesn't hand a stranger the passenger list.
  if (!met.length) {
    _say("“The others?” Tan lets that sit a moment, and does not pick it up. " +
      `“You have been here ${G.day - 1 <= 1 ? "one day" : (G.day - 1) + " days"}, my friend. Meet somebody first — then ask me who they are, ` +
      "and I will tell you, because I will already know.”");
    return true;
  }

  _say("“The others.” The grin arrives. “I drove every one of them in from the airport, my friend. " +
    "One at a time, telling me everything before we reached Second Road. You want to know a town, " +
    "you don't ask the mayor — you ask the driver. The driver is the one man they forget is in the room.”");
  _say("He counts them off like a manifest, because that is precisely what he is doing: " +
    met.map(id => NPCS[id].name + ", " + _TAN_READ[id]).join("; ") + ".", "win");

  if (rest.length) {
    const pick = rest.slice(0, 2).map(id => _tanWhere(id));
    _say("“And you have not met all of them yet.” He taps the wheel, unhurried. “There is " +
      pick.join(", and ") + ". They are not hiding. They are only sitting still.”");
  } else {
    _say("“That is all of them,” he says, and something in it is almost fond. " +
      "“The whole soi came to town in my back seat. Now you have met the lot — which makes you " +
      "the only one of them who knows the others exist.”", "win");
  }
  return true;
}

// ── The phone: contacts, messages, the banking app ──────────────────────────
// CONTACT a girl in her own bar (favor ≥ 2) to swap numbers. Contacts text
// you unprompted — sweet nothings, bar invites, the occasional money story.
// MESSAGE sends charm; SEND <amt> TO <name> is the banking app. Everything
// needs a live battery.

function _phoneDead() {
  if (G.battery <= 0) { _say("Your phone is a black mirror. Charge it first."); return true; }
  return false;
}

const _CHATTER = ["thinking of you na 💭", "you eat already?? 🍚", "sabai dee mai 😊", "last night SO funny 5555",
  "bar quiet 😴 boss angry at everybody", "i see a dog look like you today 555 🐕", "my friend ask who is the farang always smiling. i say mine 😏",
  "rain rain rain ☔ nobody come", "you sleep?? it 9pm only, old man 555", "mama call, she say hello to you (she dont know you 555)"];
function _pushMsg(from, text, gives, fromName, photo) {
  // the same line twice running from the same sender reads as a bug (27-night
  // playtest) — and "running" was too narrow: the check only compared against
  // that sender's LAST message, so A, B, A slipped straight through and one
  // inbox read printed her mama-sick ask twice, verbatim, with another text
  // between them (Gerry, round 34). Any UNREAD copy from the same sender is a
  // duplicate, wherever it sits in the queue.
  const dupe = text && !gives && !photo &&
    G.phone.inbox.some(m => m.from === from && !m.read && m.text === text);
  if (dupe) text = _CHATTER[(G.turns + G.day) % _CHATTER.length];
  // …and if the substitute collides too, let the beat go rather than repeat it.
  if (dupe && G.phone.inbox.some(m => m.from === from && !m.read && m.text === text)) return;
  // a girl texting into a void stops at a few: an ignored phone accumulated ~70
  // unread — the same five strings ×8 — and dumped them wholesale at the arc's
  // emotional climax (Frank, 2026-08-26). Plain chatter caps at 3 unread per
  // sender; money and photos still land.
  if (text && !gives && !photo &&
      G.phone.inbox.filter(m => m.from === from && !m.read).length >= 3) return;
  // fromName carries a display name for senders that aren't NPCs (e.g. the Soi
  // Dog Foundation broadcast); NPC texts leave it null and render by NPCS name.
  // photo (a caption string) marks a texted selfie — rendered with her portrait
  // and filed in the gallery when read.
  G.phone.inbox.push({ from, text, turn: G.turns, read: false, gives: gives || 0,
    fromName: fromName || null, photo: photo || null });
  // a hard cap, read or unread: the phone keeps the newest 80 (code review 2026-08-22 —
  // the old trim ran before insertion and kept every unread, so a player who never
  // read could grow it without bound). An UNREAD message carrying money or a photo
  // must still pay out here, same as the >12-backlog skim in _readMessages does for
  // exactly this reason — otherwise a flooded inbox (85 texts is one bad night of
  // chatter) silently deletes a transfer nobody ever saw arrive (the Collector,
  // 2026-08-27).
  if (G.phone.inbox.length > 80) {
    for (const m of G.phone.inbox.slice(0, G.phone.inbox.length - 80)) {
      if (m.read) continue;
      if (m.gives) G.money += m.gives;
      if (m.photo && typeof _addPhoto === "function") _addPhoto(m.from, m.photo);
    }
    G.phone.inbox = G.phone.inbox.slice(-80);
  }
  G.phone.lastText = G.turns;
}

function _unreadCount() { return G.phone.inbox.filter(m => !m.read).length; }

function _doContacts() {
  if (_phoneDead()) return;
  const ids = Object.keys(G.phone.contacts).filter(id => G.phone.contacts[id]);
  if (!ids.length) {
    _say("Your LINE contacts: your mother, your bank, and a noodle shop in your " +
      "home town that closed in 2019. The local additions are earned — CONTACT " +
      "a lady in her own bar once she likes you. A drink or two usually does it.");
    return;
  }
  _say("Your phone, the local pages:");
  for (const id of ids) {
    const n = NPCS[id];
    // _npcRoom, not n.room: an owner on her alternate-night bar (Candy) should
    // list at TONIGHT's bar, or the number points you at an empty room.
    const bar = n.offmap ? "LINE only" : (_barName(_npcRoom(id)) || "around"); // Sao, Priew: no bar to point at
    const drinks = G.soc.drinks[id] || 0;
    const glow = drinks >= 6 ? " ❤" : drinks >= 3 ? " ✦" : "";
    _say(`  ${n.emoji} ${n.name} — ${bar}${glow}`, "dim");
  }
  _say("(MESSAGE <name> to charm · SEND <amount> TO <name> · WHO / BLACKBOOK — who likes you and how much.)", "dim");
}

// WHO / BLACKBOOK: the punter's little book — every lady whose number you carry,
// ranked by the bond (The Regular), where she works tonight, and whether she's
// asked you over. A relationship dashboard; reads state, changes nothing.
function _doBlackbook() {
  if (_phoneDead()) return;
  // the punter's book of GIRLS — the fixer doesn't rank on a bond ladder.
  // Bonded girls appear whether or not you have her NUMBER: HELP calls this
  // "your ladies, ranked by how they feel about you", and it answered "the black
  // book's empty" at a man with four girls at bond 5–22 (Vikram, 2026-08-27) —
  // the depth dashboard has to read the depth stat, or the mode whose whole
  // thesis is depth-over-breadth can't show you your own depth.
  const ids = Object.keys(G.phone.contacts).filter(id => G.phone.contacts[id] && NPC_ROLES[id]);
  for (const id of Object.keys(G.soc.drinks || {})) {
    if (NPC_ROLES[id] && NPCS[id] && _bondTier(id) >= 1 && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) {
    _say("The black book's empty. You earn names the honest way out here — CONTACT a " +
      "lady in her own bar once she likes you, and she goes in the book.");
    return;
  }
  ids.sort((a, b) => _bondTier(b) - _bondTier(a) || (G.soc.drinks[b] || 0) - (G.soc.drinks[a] || 0));
  _say("── YOUR BLACK BOOK ──", "win");
  const label = ["a name and a number", "knows your face", "a regular", "★ your girl"];
  const mark = ["·", "♡", "♥", "★"];
  for (const id of ids) {
    const n = NPCS[id], t = _bondTier(id);
    // the affair's endings reach the book (Frank, 2026-08-26: "★ your girl · The
    // Stinky Pinky" the morning after she'd gone home)
    if (G.affair && G.affair.ended && id === G.affair.id) {
      _say(G.affair.won
        ? `★ ${n.emoji || ""} ${n.name} — Prachuap, by the sea · the one you left with`
        : `· ${n.emoji || ""} ${n.name} — gone home · the one that ended`, G.affair.won ? "" : "dim");
      continue;
    }
    const bar = _barName(_npcRoom(id)) || "around";
    const invited = G.phone.invite && G.phone.invite.id === id && G.phone.invite.day === G.day
      ? " — asked you over tonight" : "";
    _say(`${mark[t]} ${n.emoji || ""} ${n.name} — ${bar} · ${label[t]}${invited}`, t >= 2 ? "" : "dim");
  }
  // Same denominator doctrine as the gallery: ladies you have actually met, not
  // the 283 on the payroll. It grows as you get out more, so the ratio is a
  // reason to walk somewhere rather than a scolding.
  const knownLadies = Object.keys(G.known || {}).filter(id => NPC_ROLES[id] && NPCS[id]).length;
  if (knownLadies > ids.length) {
    // "numbers" was accurate while the book was contacts-only; it now carries
    // bonded girls whose number you never asked for, so it counts entries
    const nums = ids.filter(id => G.phone.contacts[id]).length;
    _say(_fmt("({n} in the book ({p} number{s}) \u2014 out of {k} ladies you have actually met.)",
      { n: ids.length, p: nums, s: nums === 1 ? "" : "s", k: knownLadies }), "dim");
  }
  _say("(A bond cools a notch a night — tend the ones you mean to keep. MESSAGE / SEND / CONTACT.)", "dim");
}

function _doContact(arg) {
  const id = _findNpc(arg);
  if (!id) { _say("They're not here to ask."); return; }
  // Tan handed you the card at the airport — the number was always yours (this
  // path backfills saves from before he lived in the phone)
  if (id === "tan") {
    if (G.phone.contacts.tan) { _say("Tan's number has been in your pocket since the airport. He knows. (CALL TAN)"); return; }
    G.phone.contacts.tan = true;
    _say("You go to ask — and Tan just taps your shirt pocket, where the card from the " +
      "airport has been the whole time. \"Any hour,\" he says, the way other men say " +
      "good evening. (CALL TAN)", "win");
    return;
  }
  if (id === "cream") { _chamContact(); return; } // the civilian at the table (chameleon economy)
  // A pub barmaid is not a bar girl, and the "better customers" line implied a
  // door that spending more would open — a persona stood the Queen Vic's floor
  // ~15 drinks over nine nights chasing it (round 22). House staff get an honest
  // refusal instead: there is no number here, at any price.
  if (NPCS[id] && NPCS[id].house) {
    _say(`${NPCS[id].name} laughs, not unkindly. "You know where I am, love. I'm here every night — ` +
      `that's rather the point of me."`);
    return;
  }
  if (!NPC_ROLES[id]) { _say(`${NPCS[id].name} keeps that number for family and better customers.`); return; }
  if (G.phone.contacts[id]) { _say(`You already have ${NPCS[id].name}'s number. She knows you know.`); return; }
  if (_phoneDead()) return;
  if (_npcRoom(id) !== G.room) { _say("Numbers get swapped in her bar, over a drink — not on the street."); return; }
  if (_favor(id) < 2) {
    _say(`${NPCS[id].name} waggles her phone with a smile that means not yet, big ` +
      "spender. A drink or two usually changes the arithmetic.");
    return;
  }
  G.phone.contacts[id] = true;
  _say(_fmt(_pickVary(_CONTACT_SWAP_LINES, "contactswap"), { n: NPCS[id].name }), "win");
  _addHappy(1);
  if (id === "bee" && G.quests.bee_number === "active") {
    _say("Bee taps her banking app pointedly. “Investor send money NOW, na. Hundred " +
      "baht. For LUCK.” (SEND 100 TO BEE)", "dim");
  }
}

const _MORT_TEXT_REPLIES = [
  "Reply comes in under a minute: “Noted, squire. If it's usable it goes in the column. " +
    "If it's libellous it goes in the good notebook.”",
  "The typing dots run long for a man his age. “I'm on deadline. Which is to say I am " +
    "watching the soi and calling it work. Come by the Vic, the stool's cold.”",
  "“You texted an old columnist voluntarily. One in forty, like I said. Whatever it " +
    "was, tell it to me over a beer — my thumbs are for jokes, not conversation.”",
  "A joke comes straight back: “Q: Why does the columnist answer texts at this hour? " +
    "A: Deadline's the only wife who never went home to Udon.”",
];
const _CHAM_TEXT_REPLIES = [
  "\"hiii 😊 i at work na, boss watching. you come drink coffee? i make you good one ☕\"",
  "\"555 you think about me? i think about SLEEP. finish 4pm then sleep sleep 🥱\"",
  "\"cannot talk now, many customer 😩 farang all want oat milk. what is oat milk. talk later na 💚\"",
  "\"you free tonight? maybe i go see my friend again, maybe 😏 not sure. i tell you.\"",
  "\"good morning ☀️ apron on, hair up, good girl 555. you be good too na\"",
];
function _doMessage(arg) {
  if (_phoneDead()) return;
  const w = arg.toLowerCase().replace(/^(to )/, "");
  // the fixer texts like a fixer — no charm loop, no bond arithmetic
  if (w === "tan" && G.phone.contacts.tan) { _tanText(); return; }
  // the columnist texts like a columnist — you have his number the moment you
  // replied to the joke (playtest #7: the girl-refusal read wrong for Mort)
  // the clinic girl texts like herself — the same in both worlds (hospital mirage)
  if (w === "priew" && G.phone.contacts.priew) {
    G.battery = Math.max(0, G.battery - 1);
    _say(_flag("priewRevealed")
      ? "The reply comes fast, warm, entirely unembarrassed: \"you see me last night na 😊 " +
        "lunch still ok? i tell you first day — evening i work. you know now 555\" And that " +
        "is the whole of it: she never lied, and she is not going to start apologising for " +
        "your imagination."
      : "\"555 the eye man! ankle better na. lunch some day — only lunch, i work evening, " +
        "every day until late 😊\" Cheerful, unhurried, exactly what she said at the clinic.");
    return;
  }
  if (w === "mort" && _flag("jokeWho")) {
    G.battery = Math.max(0, G.battery - 1);
    _say(_pickVary(_MORT_TEXT_REPLIES, "morttext"));
    return;
  }
  // the barista texts like a barista — apron, boss, bus; never the bar (chameleon economy)
  if (w === "cream" && G.phone.contacts.cream) {
    G.battery = Math.max(0, G.battery - 1);
    _say(_pickVary(_CHAM_TEXT_REPLIES, "chamtext"));
    return;
  }
  const id = Object.keys(G.phone.contacts).find(c =>
    c === w || NPCS[c].name.toLowerCase().includes(w.split(" ")[0]));
  if (!id) { _say(w ? "No such number in your phone. (CONTACT a girl in her bar first.)" : "Message whom?"); return; }
  G.battery = Math.max(0, G.battery - 1);
  // after the affair's endings she doesn't text like a hostess (Frank, 2026-08-26:
  // "come see me tonight!!" the morning after the bag by the door)
  if (G.affair && G.affair.ended && id === G.affair.id) {
    _say(G.affair.won
      ? _pickVary([
          `The reply comes with a photo of a steaming bowl: "you taste better one when you home 😏 auntie say hello. HURRY UP." That last in English, all caps, learned specially.`,
          `"555 you miss me already?? good. i miss you too but i no tell you. oh — i just tell you. ok come home na ❤️"`,
        ], "wonmsg")
      : _pickVary([
          `Two grey ticks. Then, a long minute later, one word: "kha." Which from her means received, understood, and closed — the politest door in Thailand, shutting gently.`,
          `The ticks go blue and no reply comes. Somewhere in Sakon Nakhon she read it twice — you know she read it twice — and put the phone face down, the loudest thing she does.`,
        ], "gonemsg"));
    return;
  }
  if (G.phone.msgCd[id] === G.day) {
    _say(`You've already charmed ${NPCS[id].name} by text tonight. Twice is a pattern; ` +
      "three times is a case file.");
    return;
  }
  G.phone.msgCd[id] = G.day;
  _addBond(id, 1); // charm counts toward favor
  _say(`You send ${NPCS[id].name} something short and sweet with one emoji too many.`);
  if (_npcRoom(id) === G.room && _npcsHere().includes(id)) {
    // she is three stools away — "come see me tonight" read absurd (playtest 2026-08-22)
    _pushMsg(id, ["555 you text me?? i am HERE na 🙈", "tilac… look up 😂", "you shy? i sit RIGHT here 555 💕"][Math.floor(_rand() * 3)]);
    _say("(📱 Her phone buzzes in her hand. She reads it, looks up at you, and laughs. CHECK MESSAGES.)", "dim");
    return;
  }
  _pushMsg(id, ["555+ you funny", "miss you na 🥺", "come see me tonight!!",
    "work boring... you come make sanuk"][Math.floor(_rand() * 4)]);
  _say("(📱 She replies almost instantly. CHECK MESSAGES.)", "dim");
}

// ── Phone-Tan: the fixer in your contacts ───────────────────────────────────
// "You need a ride, any hour, you call me" is a spoken promise, so it's a real
// mechanic: CALL TAN answers (the one phone in Pattaya that does), and once per
// vacation — in the small hours after the last bus, or in a downpour — he
// actually comes and drives you home. Deliberately a parachute, not a taxi
// rank: the once-a-vacation limit keeps the last-bus dread intact, and before
// the cutoff he just tells you to take the bus. MESSAGE/SEND get their own
// fixer-voiced branches so the girl-charm machinery never misfires on him.
const _TAN_WAIT_LINES = [
  "\"The buses are still running, my friend. Fifteen baht, same as ever. Save my petrol " +
    "for when the town runs out of ways home — I will know when that is before you do.\"",
  "\"Now? You have legs, you have buses, you have a whole town still awake. Call me when " +
    "none of those are true. You will know the hour. So will I.\"",
  "\"Everything still runs, my friend. Even the piwins are honest for another hour or two. " +
    "I am the phone call you make after all of that stops being true.\"",
  "\"Not yet, my friend. The night has not run out of options — and I am strictly a " +
    "last-option man. It is better for both of us that way.\"",
];
const _TAN_BUSY_LINES = [
  "\"Tonight I am driving somebody, my friend.\" A pause you are not invited into. \"Even " +
    "I am one man. The piwins never sleep — you will be fine. You are always fine.\"",
  "\"Ah — tonight, no. Tonight the car is full.\" He doesn't say of what. \"One favour a " +
    "trip, my friend, that is the arithmetic of friendship. Walk careful.\"",
  "\"My friend, tonight I cannot. Some other passenger, some other errand — you don't " +
    "want the details and I don't give them. Next trip, the seat is yours again.\"",
  "\"No, my friend, not tonight — tonight I fix a different problem.\" Traffic noise, a " +
    "voice in the background that stops abruptly. \"Take care of yourself. You know how.\"",
];
const _TAN_HOME_LINES = [
  "\"My friend. You are calling me from your own room — I can hear the aircon. Sleep. " +
    "Even fixers sleep.\" Click.",
  "\"You are home, my friend. This is the one problem I cannot improve. Goodnight.\" Click.",
  "\"From your bed? 555. Go to sleep, my friend. Tomorrow the town will make you new " +
    "problems, and I will still be here.\" Click.",
];
const _TAN_RIDE_LINES = [
  "He drives the way he talks — smooth, unhurried, nothing wasted. Somewhere on Second " +
    "Road he asks, lightly, how the detective is finding his retirement, and you realise " +
    "you are paying the fare after all — just not in baht.",
  "The town slides past the windows, neon going out district by district. \"Good night?\" " +
    "he asks, and listens to your answer with slightly more attention than the question " +
    "deserved. The fare, you understand, is conversational.",
  "He takes a route home you have never once walked, past bars with no signs and lights " +
    "still on, and hums something tuneless and content. Twice he lifts two fingers off " +
    "the wheel to someone in a doorway, and twice the doorway waves back.",
  "\"You know what I like about you, my friend?\" he says at a red light that stays red " +
    "a suspiciously long time for him. \"You call exactly when you said you would need " +
    "to, and not before. A man who knows what a favour costs. Very rare in this town.\"",
];
// Tan calls YOU. Halfway through the opening night, if you still have not found
// Candy and have not thought to use the card in your pocket, the phone rings.
//
// Mario's design, and the reason it is better than the version where you must
// know to call: a first-timer who is lost does not know that being driven is an
// option, so the option has to come and find him. It fires on the same one-shot
// as the outgoing ride — take the lift either way, there is only one of them.
//
// He does not rescue the quest, only the geography: Buakhao at the Diana end,
// "go find Candy", gone.
function _tanRescue() {
  if (_flag("act1Done") || G.mode === "soi6") return;
  if (G.phone.tanAct1) return;                  // he has already driven you once
  if (G.nightTurn < 50) return;                 // halfway through the night
  if (_flag("knowMot")) return;                 // you found Candy on your own
  if (G.battery <= 0) return;                   // the phone is the whole mechanism
  if (!G.phone.contacts || !G.phone.contacts.tan) return;
  G.phone.tanAct1 = true;
  G.battery = Math.max(0, G.battery - 1);
  // Clock-aware, not "half past midnight": the rescue can fire from ~23:00 and a
  // hard-coded time contradicted TIME one command later (mobile playtest 2026-08-17).
  _say("Your phone goes off in your pocket, which is a surprise, because almost nobody " +
    "has the number. \u201cMy friend.\u201d Tan does not say how he knows. \u201cIt is " +
    _clockStr() + " and you are not where a man looking for his wallet would be.\u201d", "alert");
  _say("He is already close. The grey sedan pulls in without being told where, and the door " +
    "opens on aircon and quiet, and he does not make a single joke about the state of you.", "win");
  if (typeof _abandonGame === "function") _abandonGame("Tan's sedan");
  G.pendingEnc = null;
  G.room = "buakhao_n";
  G.darkStreak = 0;
  if (G.dog) _say(_dogN("Sai Krok goes in the back like a dog who has been in sedans before, and " +
    "Tan looks at him once in the mirror and says nothing at all, which from Tan is a welcome."), "dim");
  _say("He puts you down on Soi Buakhao at the Diana end, leans across to the open window, " +
    "and says it like a man giving directions to a bus stop: \u201cGo find Candy.\u201d " +
    "Then he is gone, and you are standing in the middle of the loudest soi in Pattaya with " +
    "no more excuses and rather less night than you started with.", "win");
  _describeRoom(true);
}

function _tanCall() {
  if (G.battery <= 0) { _say("Dead phone. The town's most reliable excuse."); return; }
  G.battery = Math.max(0, G.battery - 1);
  // nobody in this town answers a phone — except the man whose job is answering
  _say("Two rings. \"My friend.\" The one phone in Pattaya that answers.");
  if (G.mode === "soi6") {
    _say("\"A ride? My friend — the whole week is one soi. You can fall home from " +
      "anywhere on it. Enjoy the falling.\" Click.");
    return;
  }
  // ACT ONE. Measured, this is the opening's real difficulty: the beach is 19
  // turns from Candy Bar, Candy Bar 9 from Oy, Oy 13 from your own door — over
  // forty percent of a hundred-turn night spent walking, before any of the
  // actual puzzle, and a first-timer walks it room by room in the wrong order
  // and then eats a full reset. He is not failing the mystery. He is failing
  // the bus timetable.
  //
  // So Tan drives, and holds both of his positions at once: he will not find
  // the wallet for you — "first night is on you" stands — and he will not leave
  // a man he drove in from the airport walking it. The route is real and it is
  // eighteen moves: Jomtien Beach Road, Thappraya, then OVER Pratumnak — four
  // dark rooms with the soi-dog streak live, on a phone that starts at 13%.
  // Once. Free, because he never takes money. He tells you nothing.
  if (!_flag("act1Done")) {
    if (G.phone.tanAct1) {
      _say("\"Twice?\" A short laugh with something fond under it. \"My friend, I drive you " +
        "one time tonight. The rest is legs.\" Click.");
      return;
    }
    if (ROOMS[G.room] && ROOMS[G.room].region !== "Jomtien") {
      _say("\"You are already in town.\" A pause while he works out whether you know that. " +
        "\"Walk, my friend. It is four minutes and you will see something.\" Click.");
      return;
    }
    G.phone.tanAct1 = true;
    _say("You tell him where you are. There is a silence exactly long enough to be a man " +
      "deciding something. \"Do not move.\"", "win");
    _say("He is coming from the other end of town and the traffic on Thappraya does not " +
      "care who you are, so you get the sand off one arm and most of the other, and then the grey " +
      "sedan comes down the beach road without hurrying. He does not ask what happened. He " +
      "takes in the sand on your shirt and the sand in your hair and says nothing at all " +
      "about either, which is somehow worse than the joke you were braced for.", "win");
    _say("\"The wallet is yours to find,\" he says, pulling out. \"I told you at the airport, " +
      "first night is on you, and I mean it. But I am not going to sit at home knowing you " +
      "are walking over that hill in the dark with a dying phone.\" He turns the aircon up. \"This part is not " +
      "the game. The game starts when you get out.\"");
    if (typeof _abandonGame === "function") _abandonGame("Tan's sedan");
    G.pendingEnc = null;
    G.room = "buakhao_n";
    G.darkStreak = 0;
    if (G.dog) _say(_dogN("Sai Krok rides the back seat with his nose to the aircon vent. Tan " +
      "takes in the dog the way he took in the sand, and says nothing about that either."), "dim");
    _say("He puts you down on Soi Buakhao at the Diana end, points once DOWN the soi \u2014 " +
      "toward a rose-pink sign a few doors along the quiet side \u2014 and is gone before you " +
      "have finished thanking him. No money changes hands. He would not have taken it and " +
      "you have not got any.", "win");
    _describeRoom(true);
    return;
  }
  if (G.room === _hotelRoomId()) { _say(_pickVary(_TAN_HOME_LINES, "tanhome")); return; }
  if (G.nightTurn < LAST_BUS_TURN && !(G.rain > 0)) {
    _say(_pickVary(_TAN_WAIT_LINES, "tanwait"));
    return;
  }
  if (G.phone.tanRideVac === G.vacation) {
    _say(_pickVary(_TAN_BUSY_LINES, "tanbusy"));
    return;
  }
  // the ride — once a vacation, and he keeps the promise to the letter
  G.phone.tanRideVac = G.vacation;
  _say("You say where you are. \"Stay in the light. Seven minutes.\" It is six: the grey " +
    "sedan comes around the corner with the calm of a vehicle that has never once " +
    "hurried, and the door opens on aircon and quiet.", "win");
  _say(_pickVary(_TAN_RIDE_LINES, "tanride"));
  if (G.dog) _say(_dogN("Sai Krok gets the back seat without discussion, arranges himself " +
    "on the upholstery like a minor diplomat, and watches the town go by."), "dim");
  G.room = _hotelRoomId();
  G.darkStreak = 0;
  _say("He sets you down at your own door. \"Friendship rate,\" he says, waving the money " +
    "away before your hand reaches a pocket. \"The first one is free, my friend.\" You " +
    "will work out later that there is never a second one — per trip, the arithmetic of " +
    "friendship. The taillights take the corner without hurry.", "win");
  _addHappy(1);
  _describeRoom(true);
}
const _TAN_TEXT_REPLIES = [
  "K.",
  "speak, my friend 🙂",
  "driving. if it is money, no. if it is trouble, call.",
  "555 you bored. go make some sanuk, my friend — that is what the town is FOR.",
];
function _tanText() {
  G.battery = Math.max(0, G.battery - 1);
  _say("You text Tan — nothing much, the kind of message you'd send a mate.");
  _pushMsg("tan", _pickVary(_TAN_TEXT_REPLIES, "tantext"));
  _say("(📱 The reply is instant. Of course it is. CHECK MESSAGES.)", "dim");
}

// ── The stuck nudge: Tan notices you going round in circles ──────────────────
// A player FIGHTING THE PARSER looks nothing like one exploring. A topic that
// misses is ordinary conversation — a completionist works a man's whole
// repertoire and most of it lands on "not my story" — so a miss inside a
// conversation, and a terse repeat, never count here. What counts is the game
// failing to understand at all, and asking after somebody who isn't there.
//
// The threshold is deliberately high (ten, not three) and guarded on FLAILING:
// the run must span more than one place or target, or carry three outright
// parse failures. Ten misses aimed at one person is somebody mining a
// character; ten across four rooms is somebody lost. This is the first system
// that watches the player for failure, and the failure mode is nagging a
// competent one — so it errs toward never firing.
//
// Tan stays IN FICTION (he is the hub, he has your number, and he is the one
// character who would notice); the mechanical part goes in the narrator's
// parenthetical after it, which is the game's existing tap-hint idiom. Tan
// telling you to press a key would break him — the dog's donation line stays
// the only fourth wall in this game.
const STUCK_AT = 10;

function _stuckReset() { if (G && G.stuck) G.stuck = { n: 0, parse: 0, noname: 0, terse: false, spots: [] }; }

// kind: "parse" (the game understood nothing) · "noname" (asked for somebody
// who isn't here) · "terse" (a repeat gave the gist — never increments, only
// selects which hint Tan sends)
function _noteMiss(kind, subject) {
  if (!G || !G.stuck) return;
  const s = G.stuck;
  if (kind === "terse") { s.terse = true; return; }
  s.n++;
  if (kind === "parse") s.parse++; else s.noname++;
  // The "spot" is what you are failing AT, not merely where you stand: eleven
  // different names called into one bar is a man who has lost the whole cast,
  // and keying on the room alone read that as one place and stayed quiet.
  const spot = G.room + ":" + (subject || G.convo || "");
  if (s.spots.indexOf(spot) < 0 && s.spots.length < 12) s.spots.push(spot);
  if (s.n >= STUCK_AT && (s.spots.length > 1 || s.parse >= 3)) _tanUnstick();
}

function _tanUnstick() {
  // never mid-modal (you are not stuck, you are being asked something), never
  // twice a night, and never without the phone that is the whole mechanism
  if (G.pendingEnc || G.game || G.pendingChoice || G.pendingBf || G.pendingFare) return;
  if (G.stuckDay === G.day) return;
  if (G.battery <= 0 || !G.phone || !G.phone.contacts || !G.phone.contacts.tan) return;
  // his Act One rescue is his first contact; don't step on its entrance
  if (!_flag("act1Done") && !G.phone.tanAct1) return;
  const s = G.stuck;
  G.stuckDay = G.day;
  G.battery = Math.max(0, G.battery - 1);
  _stuckReset();
  _say("Your phone buzzes. Tan, who you have not texted, and who has a driver's " +
    "instinct for a man circling the same block twice.", "alert");
  if (s.noname > s.parse) {
    _pushMsg("tan", "you are looking for somebody, na? just ask me. i drive everybody in this town — " +
      "i know where they drink, what night, all of it 🙂");
    _say("(📱 CHECK MESSAGES — and then ASK TAN ABOUT <person>, any night, any bar.)", "dim");
    return;
  }
  if (s.terse) {
    _pushMsg("tan", "555 the old boys give you the short version? they do that. ask them AGAIN, " +
      "properly — a man likes to tell it twice if you make him.");
    _say("(📱 CHECK MESSAGES — “ask him about it again” gets the whole story back.)", "dim");
    return;
  }
  _pushMsg("tan", "my friend. you are going round and round. slow down, look, then say what you want — " +
    "the town is simple when you stop fighting it 🙂");
  _say("(📱 CHECK MESSAGES — HELP lists what the night understands.)", "dim");
}

const _CONTACT_SWAP_LINES = [
  "Phones come out, LINE QR codes are scanned, and {n} types your name into her contacts with three emoji you don't get to see. You have her number now — and she, forever, has yours.",
  "{n} holds her phone up for the scan, then corrects your spelling of your own name without asking. A sticker arrives before the phones are down: a bear, waving. It has begun.",
  "The QR dance, both phones at once, and {n} photographs you on the spot for the contact card — “so I remember which farang,” she says, kindly, as if that needed saying.",
  "{n} takes your phone off you, adds herself, and rings her own number from it to be sure. Somewhere in her bag her phone lights up with your name already in it. Efficient. Slightly chilling. Wonderful.",
];

function _doSendMoney(arg) {
  if (_phoneDead()) return;
  const m = arg.match(/(\d+)/);
  const amt = m ? parseInt(m[1], 10) : null;
  const nameW = arg.replace(/\d+|money|baht|to |฿/g, " ").trim();
  const id = Object.keys(G.phone.contacts).find(c =>
    c === nameW || NPCS[c].name.toLowerCase().includes(nameW.split(" ")[0] || "~"));
  if (!id) { _say("Send to whom? The banking app only knows your contacts."); return; }
  if (!amt || amt <= 0) { _say("How much? (SEND <amount> TO <name>)"); return; }
  if (amt > G.money) { _say(_fmt("The app regrets to inform you: ฿{m} available, ฿{a} dreamed of.", { m: G.money, a: amt })); return; }
  // Tan sends it straight back — his currency is favours, never baht
  if (id === "tan") {
    _say(_fmt("฿{a} crosses town in one green blink — and comes straight back in another, " +
      "before you've pocketed the phone.", { a: amt }));
    _pushMsg("tan", "I am not your mamasan, my friend. When I want something from you, I " +
      "will ask for it — and it will not be money. 🙂");
    _say("(📱 CHECK MESSAGES.)", "dim");
    return;
  }
  // Sao sends it back — a woman who wouldn't let you buy the coffee is not taking a transfer
  if (id === "sao") {
    _say(_fmt("฿{a} goes out — and comes back inside the minute, with a text.", { a: amt }));
    _pushMsg("sao", "Ha. No. 😄 Coffee's on me, remember? Keep it for the soi.");
    _say("(📱 CHECK MESSAGES.)", "dim");
    return;
  }
  G.money -= amt;
  (G.soc.given = G.soc.given || {})[id] = (G.soc.given[id] || 0) + amt; // toward a sponsor flip
  G.battery = Math.max(0, G.battery - 1);
  const bump = amt >= 500 ? 3 : amt >= 100 ? 2 : 1;
  _addBond(id, bump);
  if (_npcsHere().includes(id))
    _say(_fmt("฿{a}, phone to phone across the width of a bar — her handset buzzes in her hand " +
      "and she looks at it, then at you, and doesn't quite manage not to smile. (฿{m} left.)",
      { a: amt, m: G.money }));
  else
    _say(_fmt("฿{a} crosses town in one green blink. (฿{m} left.)", { a: amt, m: G.money }));
  // the girls who aren't in the bar economy answer in their own voices, not the
  // hostess patter (mobile playtest 2026-08-22: Priew got "tonight I take care YOU")
  if (id === "priew") {
    _pushMsg("priew", _flag("priewRevealed")
      ? "you send me money?? 😳 you know now where i work and you still send. you good man or crazy man 555 🙏 lunch is on me then"
      : "why you send?? 😳 i not need na, i have job. ok… i keep it for lunch. then I buy YOU lunch 555 🙏");
    _say("(📱 A reply lands before you've pocketed the phone.)", "dim");
    return;
  }
  if (id === "cream") {
    G.chamGifts = (G.chamGifts || 0) + amt;
    _pushMsg("cream", amt >= 500
      ? "omg 😳 thank you!! for what?? …ok. i buy the book for my english course ☕💚 you too kind na"
      : "555 thank you na ☕ i buy coffee with it. MY coffee, from MY shop, free anyway 😏");
    _say("(📱 A reply lands before you've pocketed the phone.)", "dim");
    return;
  }
  // paying into an active pics-drip: enough unlocks the next shot, short of it teases
  const deal = G.phone.picDeals && G.phone.picDeals[id];
  if (deal && !deal.done && deal.idx != null) {
    if (amt >= deal.ask) _advancePicDeal(id);
    else {
      _pushMsg(id, `😏 not quite na... ฿${deal.ask} then i send. this one i keep for tips 555`);
      _say("(📱 A reply lands before you've pocketed the phone.)", "dim");
    }
    return;
  }
  // a kept cashier: your gift goes toward outbidding her sponsor. She cracks a selfie
  // back at each threshold (incl. the one that flips her), and never texts the
  // cheap-charlie / number-one patter — a quiet thank-you, or the warm post-flip line.
  if (NPCS[id].type === "sponsor") {
    const dripped = _sponsorDrip(id);             // a frame may go out (its own CHECK MESSAGES nudge)
    // The flip payoff must still land when this same send crossed both ฿14k (the
    // climax frame) and ฿15k (the flip) — don't let the drip swallow "come see me na".
    if (_sponsorFlipped(id)) _pushMsg(id, "💗 come see me na, tilac");
    else if (!dripped) _pushMsg(id, amt >= 500 ? "khop khun ka 🙏 you too kind to me" : "thank you na 😊");
    if (!dripped) _say("(📱 A reply lands before you've pocketed the phone.)", "dim");
    return;
  }
  _pushMsg(id, amt >= 500 ? _pickVary(["🙏🙏🙏 you TOO good to me. tonight I take care YOU",
      "😭😭 why you so good?? i no forget this, promise", "OMG 🙏💕 you save me. tonight you no pay for nothing, i talk to mama"], "sendbig:" + id) :
    amt >= 100 ? _pickVary(["khop khun kha!! 💕 you number one", "thank you thank you 🙏 you sweet man",
      "💕💕 you good heart. i think of you tonight na", "khop khun mak mak 😘 i buy you beer when you come"], "sendmid:" + id) :
    _pickVary(["55555 cheap Charlie... but sweet 💕", "5555 what i can buy with this?? 😜 but thank you na",
      "small small 😆 but you think of me. ok 💕"], "sendsmall:" + id));
  _say("(📱 A reply lands before you've pocketed the phone.)", "dim");
  if (id === "bee" && amt >= 100 && G.quests.bee_number === "active") {
    _setFlag("beeBanked");
  }
}

function _readMessages() {
  if (_phoneDead()) return;
  if (!G.phone.inbox.length) { _say("No messages. The phone judges you gently."); return; }
  const unread = G.phone.inbox.filter(m => !m.read);
  // a long-ignored phone doesn't reprint its whole backlog — the newest dozen,
  // the rest skimmed and let go (Frank, 2026-08-26: a ~70-text dump at the
  // worst possible moment). Money still lands: mark the skipped read and bank.
  let show = unread.length ? unread : G.phone.inbox.slice(-3);
  if (show.length > 12) {
    const dropped = show.slice(0, show.length - 12);
    for (const m of dropped) {
      m.read = true;
      if (m.gives) { G.money += m.gives; _say(`(An older transfer surfaces in the scroll: +฿${m.gives}.)`, "win"); }
      if (m.photo && typeof _addPhoto === "function") _addPhoto(m.from, m.photo);
    }
    _say(_fmt("(You thumb past {n} older messages — the phone's way of telling you how long you've been gone.)", { n: dropped.length }), "dim");
    show = show.slice(-12);
  }
  for (const msg of show) {
    const sender = msg.fromName || (NPCS[msg.from] ? NPCS[msg.from].name : msg.from);
    if (msg.photo) {
      // a received selfie: the "📷 " prefix + her known name lets term.js drop her
      // portrait in inline; it also files into the gallery the first time it's read.
      // _L the inner content, not the composed line: the catalog is keyed by the raw
      // message text (a Taitch lady's drip words translate; everything else falls back
      // to English). The gallery still files the RAW cap so term.js _picFor can match it.
      _say(`📷 ${sender}: «${_L(msg.photo)}»`, "thai");
      if (msg.text) _say(`📱 ${sender}: “${_L(msg.text)}”`, "thai");
      if (!msg.read && typeof _addPhoto === "function") _addPhoto(msg.from, msg.photo);
    } else {
      _say(`📱 ${sender}: “${_L(msg.text)}”`, "thai");
    }
    if (!msg.read && msg.gives) {
      G.money += msg.gives;
      _say(`(She's transferred you ฿${msg.gives}. ฿${G.money} in pocket. This town.)`, "win");
    }
    msg.read = true;
  }
  if (!unread.length) _say("(Older messages, re-read for the warm glow.)", "dim");
}

// EXAMINE PHONE / PHONE — the home screen, not a static description: the two
// numbers you actually live by (battery, flashlight) up top, then whatever's
// waiting for you (unread texts, tonight's invite), then the lock-screen
// widgets a real phone shows — weather and the day's headlines. Weather and
// news ride the deploy-time news bake (WX_NOW / NEWS_FEED), which is absent
// offline and in tests, so both degrade to nothing rather than erroring —
// never gate anything on them.
function _doPhoneScreen() {
  if (G.battery <= 0) {
    _say("Your phone is a black mirror — no screen, no flashlight, no lifeline. " +
      "Charge it first: a 7-Eleven sells chargers, and some bars let you plug in.");
    return;
  }
  // lead with the time, the way a phone does; battery and flashlight underneath
  _say(`📱 ${_clockStr()} · day ${G.day}`, "dim");
  _say(`🔋 Battery ${G.battery}%${G.battery <= 20 ? " — get to a charger" : ""} · ` +
    `flashlight ${G.lightOn ? "ON" : "off"}`, "dim");
  const unread = _unreadCount();
  if (unread) {
    _say(`📬 ${unread} unread message${unread > 1 ? "s" : ""} waiting — CHECK MESSAGES.`, "win");
  } else if (G.phone.inbox.length) {
    _say("📭 No new messages.", "dim");
  } else {
    _say(Object.keys(G.phone.contacts || {}).length
      ? "📭 No messages yet. (CONTACT a lady and she'll start texting.)"
      : "📭 No messages — nobody has your number yet. (CONTACT a lady and she'll start texting.)", "dim");
  }
  if (G.phone.invite && G.phone.invite.day === G.day && NPCS[G.phone.invite.id]) {
    _say(`📌 ${NPCS[G.phone.invite.id].name} asked you to come by her bar tonight.` +
      ((typeof _closedNow === "function" && _closedNow(_npcRoom(G.phone.invite.id))) ? " (Her bar has shut for the night — she'll keep the seat tomorrow.)" : ""), "dim");
  }
  const nPhotos = (Array.isArray(G.phone.photos) ? G.phone.photos : []).filter(p => NPCS[p.id]).length;
  if (nPhotos) _say(`📸 ${nPhotos} photo${nPhotos > 1 ? "s" : ""} in your gallery — GALLERY.`, "dim");
  const wx = _wxLine();
  if (wx) _say(`🌤️  Pattaya — ${wx}`, "dim");
  const feed = _newsFeed();
  if (feed.length) {
    const seen = new Set();
    for (let i = 0; i < 6 && seen.size < 2; i++) {
      const h = _headline();
      if (h && !seen.has(h.t)) { seen.add(h.t); _say(`📰 ${h.t}`, "thai"); }
    }
    _say("(READ PAPER for the rest, or WATCH TV.)", "dim");
  }
  _say(G.owlRead ? "🦉 This week's Nite Owl is in your inbox — OWL." :
    "🦉 The Nite Owl's weekly newsletter sits unread in your inbox — OWL.", "dim");
}

// Adopt a soi dog and the Soi Dog Foundation somehow has your number by the next
// day (word travels fast on the soi), hitting you up for a donation with the real
// charity link — same day if you took him in on the last night of a capped week,
// so a day-seven adoption doesn't miss it. Fires once.
function _soidogTick() {
  if (!G.dog || _flag("soidogTexted") || G.battery <= 0) return;
  const cappedLastDay = (G.mode === "soi6" || G.stage === "vacation") && G.day >= 7;
  if (G.day > G.dog.since || (cappedLastDay && G.day === G.dog.since)) {
    _setFlag("soidogTexted");
    _pushMsg("soidog",
      // Diegetic SMS, no URL: the Shamrock scene carries the game's ONE real-world
      // link (canon rule) — this text keeps the warmth and loses the fourth wall.
      "Word on the soi says you've adopted one of Pattaya's own — khob khun, khun jai dee! " +
      "🐕 The rest of them still need jabs, food, and a vet who works for smiles. Give a " +
      "thought to the ones still on the street tonight 🙏",
      0, "Soi Dog Foundation");
    _say("(📱 Your phone buzzes — a text from the Soi Dog Foundation. CHECK MESSAGES.)", "dim");
  }
}

// Contacts text first, sometimes. Sweet nothings, invitations with a reward
// for showing up, and money stories — this IS Pattaya.
// Contacts text unprompted — scaled by the bond (The Regular). A girl you've
// become a regular/farang for MISSES you: she texts more often, is weighted more
// likely to be the one who does, and her messages skew to invites and longing
// ("when you come see me?") rather than the mama-sick game she'd never run on her
// own farang. New/face contacts still send the classic scam-ask mix.
// A lady's texted selfies. Story girls author their own `selfies` for character;
// filler hostesses get a small hash-picked pool in _buildHostess. PG-13, Tinglish,
// Google-Translate-and-emoji — the same voice they text in.
const _SELFIE_CAPS = [
  "new dress 👗 you like?? 😊", "beach today 🏖️ miss you na",
  "me and my friend eat MK 🍲😋", "new hair!! 💇‍♀️ good mai? 555",
  "waiting work 💕 i think about you", "555 my cat 🐈 cute like me na 😽",
  "gym today 💪 strong for my farang", "sunset Jomtien 🌅 wish you here",
  "market this morning 🛵 buy food for mama", "new nail 💅 pink you favourite na",
];

function _selfiesFor(id) {
  const n = NPCS[id];
  return (n && Array.isArray(n.selfies)) ? n.selfies : [];
}
// A selfie entry is either a bare caption string (filler) or {cap, pic} (authored
// girls with distinct art); term.js resolves the pic — the engine only needs the cap.
function _selfieCap(e) { return typeof e === "string" ? e : (e && e.cap) || ""; }

// The moneypit's asks — always another emergency, the number always higher. Not a
// scam exactly (some are even true); just a bottomless need pointed at a soft target.
const _MONEYPIT_ASKS = [
  "mama go hospital 😢 need 2000 this time. only you i can ask 🙏",
  "landlord come today 😭 i short 3500... you help little bit? i pay back promise promise",
  "phone break AGAIN 😩 4000 for new one, i cannot work without it na 💔",
  "brother crash motorbike 😰 family need 5000 emergency. you my only good man 😢🙏",
  "aiyo big problem, i tell you when i see you 😭 but i need 8000 quick. you the only one 💔",
];
function _moneypitText(id) {
  const wk = typeof _pers === "function" && _pers("whiteknight");
  const i = wk ? Math.min(_MONEYPIT_ASKS.length - 1, 2 + Math.floor(_rand() * 3))
               : Math.floor(_rand() * 3);
  _pushMsg(id, _MONEYPIT_ASKS[i]);
}

// She just sends a photo, no words — files to the gallery on read.
function _maybePhotoText(id) {
  const caps = _selfiesFor(id);
  if (!caps.length) return false;
  _pushMsg(id, "", 0, null, _selfieCap(caps[Math.floor(_rand() * caps.length)]));
  return true;
}

// The kept-cashier "loosening" drip. A type:"sponsor" girl (Jenny, Baimon) is off the
// market — kept clean by a farang's monthly money — until your gifts (G.soc.given)
// outweigh his and she flips (_sponsorFlipped, SPONSOR_FLIP). On the way there she
// cracks: each gift-threshold she crosses texts back the next, less-guarded selfie —
// the wordless "it's working" signal that makes the ฿15k arc discoverable. Needs your
// number (she texts). Returns true iff at least one frame went out (the caller then
// skips its own generic reply). sponsorPix counts frames sent; it rides G.soc, so it
// resets each vacation with `given`.
function _sponsorDrip(id) {
  const n = NPCS[id];
  if (!n || n.type !== "sponsor") return false;   // NOT gated on flipped: the send that
  // crosses ฿15k also crosses pic3's ฿14k, so the climax frame must still go out on it.
  const frames = n.sponsorPics;
  if (!frames || !frames.length) return false;
  if (!(G.phone.contacts && G.phone.contacts[id])) return false;   // she texts you — needs the number
  const given = (G.soc.given && G.soc.given[id]) || 0;
  const sent = (G.soc.sponsorPix && G.soc.sponsorPix[id]) || 0;
  let target = sent;
  while (target < frames.length && given >= frames[target].at) target++;
  if (target <= sent) return false;
  // send EVERY newly-crossed frame, not just the highest — a lump sum that crosses
  // two thresholds at once used to jump straight to the top frame and mark the
  // skipped ones as already-sent, so the exact play the game's own arc teaches
  // ("outbid Klaus") permanently forfeited the earlier frames for the vacation
  // (the Collector, 2026-08-27). Three texts landing together reads fine — "she's
  // been saving these."
  for (let i = sent; i < target; i++) {
    const f = frames[i];
    _pushMsg(id, f.words || "😘", 0, null, f.cap);
  }
  (G.soc.sponsorPix = G.soc.sponsorPix || {})[id] = target;
  _say("(📱 She's sent you something. CHECK MESSAGES.)", "dim");
  return true;
}

// The pay-per-photo drip (Gift's hustle). paidPics is an ordered set; the first is
// a free teaser, each later one costs its `ask`. Opening it sends the teaser + the
// pitch and arms G.phone.picDeals[id]; SEND >= ask advances it (see _doSendMoney).
// Keyed per NPC (not a single shared slot) — Wilai is the only paidPics girl today,
// but a shared slot would let her finished drip permanently block a second one
// (the Collector, 2026-08-27 — caught by code review before it could go live).
function _startPicDeal(id) {
  const pics = NPCS[id] && NPCS[id].paidPics;
  if (!pics || !pics.length) return;
  G.phone.picDeals = G.phone.picDeals || {};
  _pushMsg(id, pics[0].words || "hi handsome 😘 i take picture just for you...", 0, null, pics[0].cap);
  if (pics.length > 1) {
    G.phone.picDeals[id] = { idx: 1, ask: pics[1].ask };
    _pushMsg(id, `😏 you like?? more sexy waiting... only ฿${pics[1].ask} i send next one 💸`);
  } else {
    G.phone.picDeals[id] = { done: true };
  }
}

function _advancePicDeal(id) {
  const deal = G.phone.picDeals[id], pics = NPCS[id].paidPics;
  const shot = pics[deal.idx];
  _pushMsg(id, shot.words || "😘💕", 0, null, shot.cap);
  const next = deal.idx + 1;
  if (next < pics.length) {
    G.phone.picDeals[id] = { idx: next, ask: pics[next].ask };
    _pushMsg(id, `like?? 😏 next one better... ฿${pics[next].ask} 💸`);
  } else {
    G.phone.picDeals[id] = { done: true };
    _pushMsg(id, `that ALL i got here na 🙈 rest you come ${_barName(_npcRoom(id)) || "see me"} see LIVE 😘`);
  }
  _say("(📱 She's sent something. CHECK MESSAGES.)", "dim");
}

// ── The unknown number ──────────────────────────────────────────────────────
// Once a day somebody you have never given your number to texts you a joke.
// You can let them keep coming, you can STOP them, or you can REPLY — and the
// reply is the interesting one, because the number belongs to Mort.
//
// That is not a coincidence dressed as one: Mort is already the in-fiction
// author of the Nite Owl column, already carries the spiral notebook, and the
// game already has _OWL_JOKES as "the universe's own canon" in his voice. A
// seventy-four-year-old columnist mass-texting gags to strangers to find out
// which ones land is the most Mort thing available, and it costs no new canon.
//
// Register: bar jokes, not filth. PG-13 house rule — the punchline is the
// town, never the anatomy.
const _JOKE_TEXTS = [
  "Q: How many farang does it take to change a lightbulb? A: None. He’s been " +
    "meaning to ask the girlfriend’s brother about it since November.",
  "Q: What’s the difference between a two-week millionaire and a bar bill? " +
    "A: The bar bill knows exactly when it’s finished.",
  "A man tells his lady he’s going home tomorrow. She cries for eleven " +
    "minutes. He books another week. She stops crying at exactly the same second the " +
    "booking confirmation arrives. Nobody has ever explained this.",
  "Q: Why does the piwin always know where you’ve been? A: Because he took " +
    "you there, boss.",
  "A tourist asks the mamasan if the girls are friendly. She says: for you, " +
    "very friendly. He says how friendly. She says: how much friendly you want?",
  "Q: What do you call a farang who has learned three words of Thai? " +
    "A: Engaged.",
  "Sign in a Soi 6 bar: NO SEX IN THE TOILET. Sign under it, smaller: " +
    "PLEASE USE THE ROOM UPSTAIRS, IS ONLY 600.",
  "Q: How do you make a small fortune running a bar in Pattaya? " +
    "A: Arrive with a large one.",
  "He said he came for the temples. Nine years later he can name four " +
    "hundred girls and no temples.",
  "Q: What’s the most expensive drink on Walking Street? " +
    "A: The one you buy at 4 a.m. because you don’t want the night to be over.",
];

// ── The reverse savior: Sao, and the dinner in Sathorn ───────────────────────
// Canon essay (2026-08-15): the farang savior complex Pattaya spends years
// feeding, and its collapse when the girl he met OUTSIDE the bars turns out to
// be hi-so. Expat-only (the resident is the man it's about; the two-week man
// never learns), once per game, on a REALISTIC clock: she has a life in
// Bangkok, so weeks pass between beats and the player has time to build the
// noodle-cart picture. G.bkk = { met, stage } — 1: number given, 2: coffee
// text sent, 3: invitation sent, 4: dinner offered (pendingChoice), done.
// Nothing mechanical happens on the collapse: the payoff is the room, read.
// ── The chameleon economy (Cream, the civilian at the table) ───────────────
// The inevitable question, asked of a girl who isn't staff: her wide-eyed
// pull-back, the speech — every word of it true — and then "I just wanted to
// try." No price is ever named; that is the whole trap. GO · NOT TONIGHT.
function _chamAsk() {
  if (!_flag("act1Done")) { _say("Cream laughs at you. \"You drunk na. Go home.\""); return; }
  if (G.pendingChoice) return;
  if (!_flag("chamDone")) {
    _say("You ask it — the only question there is on this street, however you dress it. " +
      "Her eyes go wide. She actually pulls back in the chair, a hand flat on the table " +
      "between you, and the look on her face is shock with a little hurt folded into it.", "alert");
    _say("\"How much?\" The voice is small. \"I don't know. I— I am a barista. I never go " +
      "with a customer. Never.\" She looks at the cocktail, at the bar where her friend is " +
      "working, back at you. \"I just talk to you because I like you. I just…\" The hand " +
      "comes off the table. \"I just wanted to try.\"");
    _say("Somewhere behind your sternum a balloon inflates. Nobody has named a number, and " +
      "you notice — later, much later — that nobody is going to.", "dim");
  } else {
    _say("You ask it again, a night later, and this time there is no pull-back: a small " +
      "smile into the glass, a look at the bar. \"You know already how it works na,\" she " +
      "says — which is true, and is also the only thing about it she has ever said plainly.");
  }
  G.pendingChoice = "cham";
  _chamPrompt();
}
// The civilian's verbs: she is not staff, so the lady-drink / flirt / contact
// machinery must not answer for her (blind playtest 2026-08-22: BUY DRINK FOR
// CREAM poured the patron war-story, FLIRT got "not that way, mate").
function _chamDrink() {
  if (G.money < _beerPrice()) { _say(`A drink for Cream runs ฿${_beerPrice()}, and you're short. She waves it off: "Next time na."`); return; }
  G.money -= _beerPrice();
  G.soc.chamDrinks = (G.soc.chamDrinks || 0) + 1;
  _say(_pickVary([
    `She puts a hand up — "No no, I have—" — looks at her glass, which is mostly ice, and lets you. ` +
      `"Ok. One." A cocktail arrives that nobody calls a lady drink, because it isn't one. (฿${G.money} left.)`,
    `"You don't have to—" she says, and then, when it comes, "…ok, thank you na," and clinks it against ` +
      `yours with a small conspiratorial face, like two people getting away with something. (฿${G.money} left.)`,
    `She lets you, after the correct amount of not letting you. No bell, no ledger, no mamasan ` +
      `counting — just a drink, bought for a girl at a table, like anywhere. (฿${G.money} left.)`,
  ], "chamdrink"));
  _addHappy(1);
}
function _chamFlirt() {
  _say(_pickVary([
    "She laughs, looks down, looks up through her hair. \"You flirt me? Ooh.\" Pleased, and not " +
      "hiding it, and not doing anything with it either — which is exactly the thing.",
    "A shy sideways smile into the cocktail. \"You very smooth na. I think you say this to the bar " +
      "girl too.\" She is teasing you. She is enjoying it.",
    "\"Ohh — no, stop,\" she says, and doesn't mean stop, and her ears go pink, which no bar girl's do.",
  ], "chamflirt"));
  _addHappy(1);
}
function _chamContact() {
  if (G.phone.contacts.cream) { _say("You have Cream's LINE — she typed it in herself. (MESSAGE CREAM)"); return; }
  _say("\"My LINE?\" She tilts her head. \"For what — coffee?\" She laughs, and doesn't say no, and " +
    "doesn't give it either. \"Maybe later na. If you nice.\"");
}
function _chamPrompt() {
  _say("She is already gathering her phone and her little bag, not looking at you, the way " +
    "you don't look at a thing you've decided. (GO with her · NOT TONIGHT)", "dim");
}
function _chamDecline() {
  G.pendingChoice = null;
  _say("You say not tonight, and mean something you couldn't spell out. She nods quickly, " +
    "relieved or disappointed or neither — the face gives you nothing to price. \"Ok na. " +
    "Maybe another time.\" She types something into your phone before you've offered it: " +
    "her LINE. \"You come coffee shop. Daytime. I make you latte, good one.\"", "dim");
  G.phone.contacts.cream = true;
  G.known.cream = true;
  _setFlag("chamAsked");
}
function _chamGo() {
  G.pendingChoice = null;
  _say("You go. She puts her arm through yours on the soi like a civilian — no hand on " +
    "the wallet, no glance back at a mamasan, no mamasan to glance at — and in the " +
    "motosai's mirror she is looking at her phone with a small private smile. At the " +
    "hotel she types her LINE into your phone unasked: \"so you can find me. Daytime. " +
    "Coffee shop.\" In the lift she says it once more, to the floor indicator: \"I never " +
    "do this.\"");
  G.phone.contacts.cream = true;
  G.known.cream = true;
  _setFlag("chamAsked");
  G.chamNight = true;
  G.lastBfId = null;
  // the treadmill: whatever he tells himself, it's the same product
  _conquestHappy(8);
  _endNight("cham");
}
// The morning: she's dressed before you're awake, hair going up into the bun,
// the bus to Naklua at ten to eight. She asks for nothing. The gift — if there
// is one — is YOUR verb, named by you, which is the entire design. For a white
// knight the hand is on the wallet before the decision is; everyone else is
// simply offered the moment. Ungraded: she thanks him shyly whatever he does.
function _chamMorning() {
  if (!G.chamNight) return;
  _say("She is up before you, dressed, hair going up into a modest bun in the mirror " +
    "with three pins held in her teeth — the transformation is quick and unshowy and " +
    "complete. A folded green apron goes into the little bag. \"Bus ten to eight,\" she " +
    "says round the pins. \"Naklua. I late, boss angry.\" She has asked for nothing. She " +
    "stands by the door a second longer than leaving takes.", "room");
  if (_pers("whiteknight")) {
    _say("(Your hand is already on your wallet. You notice it there — it arrived before " +
      "you did. Not a rate; she never named one. A gift, because she's so sweet, and " +
      "works so hard.)", "dim");
  }
  G.pendingChoice = "chamgift";
  _chamGiftPrompt();
}
function _chamGiftPrompt() {
  _say(_pers("whiteknight")
    ? `(GIFT ${CHAM_GIFT} · GIFT <amount> · NOTHING)`
    : "(GIFT <amount> · NOTHING)", "dim");
}
function _chamGift(amt) {
  if (amt > 0 && amt > G.money) {
    _say(`You haven't got ฿${amt} on you. (GIFT <amount> · NOTHING)`, "dim");
    return;
  }
  G.pendingChoice = null;
  G.chamNight = false;
  G.chamGifts = (G.chamGifts || 0) + amt;
  _setFlag("chamDone");
  if (amt >= CHAM_GIFT) {
    G.money -= amt;
    _say(`You give her ฿${amt} — to help out, you say, and she looks at the notes and ` +
      "then at you and the thanks is shy and complete, eyes down, both hands. \"You so " +
      "kind. Too kind.\" It goes into the little bag beside the apron. A kiss on the cheek " +
      "that lands like a receipt nobody issued.", "win");
  } else if (amt > 0) {
    G.money -= amt;
    _say(`You give her ฿${amt} — for the bus, for breakfast, for nothing in particular. ` +
      "She folds it small and the thanks is shy and exactly the same size as the note, " +
      "which you notice and decide not to. A kiss on the cheek; the door.", "dim");
  } else {
    _say("You don't. She thanks you anyway — a beat slower, the same shy smile — kisses " +
      "your cheek, and goes to catch the bus to Naklua. The door closes softly. Nothing " +
      "was owed; nothing was asked; you are not sure, standing there, which of those two " +
      "sentences you are going to tell yourself.", "dim");
  }
  _say("(At eight she'll tie on the green apron and steam milk for the next farang through " +
    "the door, and smile. A week's wages in a night, or a bus fare, or a kiss — and if " +
    "anyone asks, she's a barista. She is.)", "dim");
}
// Her texts: apron selfies — proof of an honest life, manufactured daily for a
// market of three — and, once, the slip: a message meant for another papa.
function _chamTick() {
  if (!(G.phone && G.phone.contacts && G.phone.contacts.cream)) return;
  if (G.battery <= 0 || G.game || G.pendingEnc || G.pendingChoice) return;
  if (G.turns - (G.phone.lastText || 0) < 30) return;
  if (G.room === _npcRoom("cream") && _npcActive("cream")) return; // not while she's at the next table
  const since = G.day - (G.chamContactDay || G.day);
  if (!G.chamContactDay) G.chamContactDay = G.day;
  if (!_flag("chamSlip") && since >= 1 && _rand() < 0.12) {
    _setFlag("chamSlip");
    _pushMsg("cream", "thank you for this month na papa 🙏 you different from other farang, i " +
      "always say. i buy the book for my english course like you tell me ☕💚");
    _pushMsg("cream", "omg sorry!! wrong person 555 😳 that is my… uncle. how are you na? you sleep well?");
    G.phone.lastText = G.turns;
    _say("(📱 Your phone buzzes twice — Cream. CHECK MESSAGES.)", "dim");
    return;
  }
  if (_rand() < 0.08 && _maybePhotoText("cream")) {
    G.phone.lastText = G.turns;
    _say("(📱 Your phone buzzes — Cream sent a photo. CHECK MESSAGES.)", "dim");
  }
}

function _bkkArcTick() {
  const b = G.bkk;
  if (!b || _flag("bkkArcDone") || G.battery <= 0 || !_flag("expatLife")) return;
  const since = G.day - b.met;
  // 2a: the coffee text — 3-5 nights on, day-stable per game
  if (b.stage === 1 && since >= 3 + (_hh("bkk1" + G.vacation, 11) % 3)) {
    b.stage = 2; b.coffee = G.day;
    _pushMsg("sao", "Hey. Back in BKK, drowning in work. Down again in a couple of weeks — " +
      "that coffee? There's a place on Second Road that does actual flat whites. My " +
      "treat, I owe you for the wait-with-me. 😊");
    _say("(📱 Your phone buzzes — Sao. CHECK MESSAGES.)", "dim");
    return;
  }
  // 2b: the invitation — 7-10 nights after the coffee text
  if (b.stage === 2 && G.day - b.coffee >= 7 + (_hh("bkk2" + G.vacation, 13) % 4)) {
    b.stage = 3; b.invite = G.day;
    _pushMsg("sao", "Ok this is a bit forward but — Saturday, dinner in Bangkok, with the " +
      "family? Dad's curious about the farang who didn't try to buy me a drink. Don't " +
      "panic, it's just dinner. Car will pick you up at your hotel at four. Say yes. 🙏");
    _say("(📱 Your phone buzzes — Sao. CHECK MESSAGES.)", "dim");
    return;
  }
  // 3: the car is outside — the next night, at your hotel, before you go out
  if (b.stage === 3 && G.day > b.invite && _isHotelRoom(G.room) && !G.pendingChoice) {
    b.stage = 4;
    G.pendingChoice = "bkkdinner";
    _bkkDinnerPrompt();
  }
}
function _bkkDinnerPrompt() {
  _say("Your phone: “Car's outside. Grey Alphard, driver's called Boy. See you at " +
    "seven! 🚗” — and outside, sure enough, a grey van idles under the porch light " +
    "with the patience of something that is paid by the day.", "alert");
  _say("(GO to Bangkok · DECLINE and stay on the soi)", "dim");
}
function _bkkDecline() {
  G.pendingChoice = null;
  _setFlag("bkkArcDone");
  _say("You text a sorry-something-came-up. Three dots for a long time. Then: “No " +
    "worries at all! Another time 😊” — and you know, the way you know a door has " +
    "closed in another room, that there won't be one. The van pulls away with no " +
    "hurry at all. It was never really waiting for you.", "dim");
}
function _bkkGo() {
  G.pendingChoice = null;
  _setFlag("bkkArcDone");
  const wk = _pers("whiteknight");
  _say("The van's aircon is set to museum. Two hours of motorway, the driver silent " +
    "and impeccable, and then Sathorn: towers, a hotel lobby the size of a bus " +
    "station, and a lift that goes up without you feeling it. Not a street stall. " +
    "A private room of a Chinese restaurant — thick carpet that eats your footsteps, " +
    "cold as a bank, a heavy round table with a glass lazy susan, and Sao, in " +
    "something simple that cost more than it looks, saying “You CAME” like it's " +
    "a small victory.");
  _say("The door opens and her father walks in. Tailored polo, the calm of a man who " +
    "gives instructions for a living, and on his wrist a Rolex that is — you look " +
    "twice — the real thing. Not awe, when he looks at you. Polite, clinical " +
    "interest. A waiter sets a bottle of Blue Label on the table and the father " +
    "waves him off and pours your glass himself, over ice, a splash, exactly right.");
  _say("The lazy susan turns: lobster, abalone, things that cost more than your " +
    "month's rent in Jomtien. You try to hold your end up. " +
    (wk
      ? "You find yourself talking about Pattaya, about what you've SEEN there — the " +
        "girls, the families they send money to, the men who don't help and the ones " +
        "who do — and you hear yourself say, to this table, that you've always tried " +
        "to be one of the ones who helps. It sounds noble in Jomtien. In this room it " +
        "sounds like a man describing the pond he is king of."
      : "You talk about the online work, the plans, how much you love Thailand — the " +
        "pitch that lands so cleanly in the bars off Beach Road, delivered here with " +
        "the alpha volume slightly up."));
  _say("The father listens to all of it, carefully, smiling warmly. He takes a sip of " +
    "the Blue Label. “That is very nice,” he says. “It is good for a young man to " +
    "have a little hobby, so he doesn't get bored.”", "alert");
  _say("Hobby. The word goes off like a gunshot and nobody but you hears it. Sao " +
    "laughs at something her father says next — sweetly, fondly, a daughter's laugh " +
    "— and you look at her wrist and see, for the first time, that the bracelet you " +
    "took for costume jewellery is Cartier, and always was.");
  _say("The bill comes in a black leather folder. Your hand goes to your wallet on " +
    "instinct — the Pattaya reflex, the one that shows the room your standing — and " +
    "her father, mid-story about a golf trip to Japan, doesn't so much as glance at " +
    "the numbers: he sets a black metal card on the folder and keeps talking.");
  _say("(Reach for it anyway, or let it go. GRAB · LET)", "dim");
  G.pendingChoice = "bkkbill";
}
function _bkkBill(grab) {
  G.pendingChoice = null;
  if (grab) {
    _say("You reach for it anyway — a farang gesture, loud in the quiet room. The " +
      "father lifts one hand a centimetre off the tablecloth, and it is over. Not " +
      "unkind. Simply not a question. Sao's eyes flick to you and away. Nobody says " +
      "anything, which is worse than anything they could have said.", "alert");
    _repHit(1);
    _addHappy(-2);
  } else {
    _say("You let it go, and thank him, and mean it — the only move in the room that " +
      "was yours to make well. He nods, once. It costs you nothing, and it is the one " +
      "thing you did all evening that a man at that table would have done.");
    _repGain();
  }
  _say("In the lift going down you understand, with the clarity of cold air, your " +
    "place in the real hierarchy of this country — the one the tourist never sees. " +
    "You weren't the savior. You weren't pulling anyone out of anything. To this " +
    "family you were their educated daughter's amusing, slightly poor, exotic " +
    "friend — a nice boy she practises her English on. Nobody said so. Nobody had to.");
  _say("Pattaya spends years teaching a man that money buys anything here. Bangkok " +
    "takes one dinner to remind him whose money it is.", "win");
  if (_pers("whiteknight")) {
    // +2 so it survives the night's own -1 cooling: the mark is meant to last a
    // day past the dinner. Insight, not the treadmill — "the useful kind."
    G.jaded = (G.jaded || 0) + 2;
    _say("(You came as the one who helps. You leave knowing what that looked like from " +
      "the other side of the table. A notch more jaded — the useful kind.)", "dim");
  }
  _addHappy(1); // the honest kind: you saw something true
  _endNight("bkkdinner");
}

function _dailyJoke() {
  if (!_flag("act1Done") || G.battery <= 0) return;
  if (_flag("jokeStop")) return;                 // he took the hint
  if (G.phone.jokeDay === G.day) return;         // one a day, like a vitamin
  // Not while you're in the room with him — a man texting gags to a stranger
  // he can see reads wrong (playtest #6). Tomorrow's joke waits for tomorrow;
  // tonight's just waits for you to leave the pub.
  if (G.room === "queen_vic") return;
  G.phone.jokeDay = G.day;
  const n = (G.phone.jokeN = (G.phone.jokeN || 0) + 1);
  const body = _JOKE_TEXTS[_hh("joke" + G.vacation + "_" + n, 41) % _JOKE_TEXTS.length]
    .replace(/^Unknown: /, "");
  G.phone.inbox.push({
    // the phone learns what it has been told: after he introduces himself the
    // number has a name (Gordon, round 37 — still "+66 8• ••• ••••" three nights on)
    from: "unknown", fromName: _flag("jokeWho") ? "Mort" : "+66 8" + (_hh("num" + G.vacation, 17) % 9) + " ••• ••••",
    text: body + (n === 1 ? "  (You have no idea who this is. REPLY, or STOP them.)" : ""),
    read: false,
  });
}

// STOP / UNSUBSCRIBE — he is old, not rude. One text and it is over.
function _doJokeStop() {
  if (_flag("jokeStop")) { _say("You already told him. He took it well, which was worse."); return; }
  if (!G.phone.jokeN) { _say("Nobody's texting you anything you'd want stopped."); return; }
  _setFlag("jokeStop");
  _say("You text back STOP.", "dim");
  _say("The reply is instant: “Understood. Sorry to have bothered you — genuinely. " +
    "You’d be amazed how many just never answer at all.” Nothing after that. The " +
    "phone is quiet in a way it was not before.", "alert");
}

// REPLY — the number has a man on the end of it, and he is delighted.
function _doJokeReply() {
  if (!G.phone.jokeN) { _say("Reply to what? Nobody's sent you anything."); return; }
  if (_flag("jokeStop")) { _say("You told him to stop. He stopped. That's the sort of man he is."); return; }
  if (_flag("jokeWho")) {
    const inTonight = typeof _npcWhere === "function" && _npcWhere("mort") === "queen_vic";
    _say(inTonight
      ? "“Ha! Still reading them. Good man. Come and find me — Queen Vic, the end stool with the notebook. I'm on it now.”"
      : "“Ha! Still reading them. Good man. Not in tonight, mind — the knees. Queen Vic tomorrow, the end stool with the notebook.”", "thai");
    return;
  }
  _setFlag("jokeWho");
  (G.known = G.known || {}).mort = true;
  _say("You text back. The typing dots start immediately, which tells you something " +
    "about how the sender's evening is going.", "dim");
  _say("“Somebody answered! Do you know how rare that is?” A pause. “Mort. I write the " +
    "column — the OWL. Used to be the back page; now it lands in your inbox, been going " +
    "longer than most of these bars. I test the jokes on the numbers I collect. Most people " +
    "never reply, some tell me to stop, and about one in forty writes back.” Another pause. " +
    "“You’re one in forty. Come and have a beer, Queen Vic. I’ll buy — I’ve a use for a man " +
    "who answers his phone.”" +
    ((typeof _npcWhere === "function" && _npcWhere("mort") === "queen_vic") ? "" :
      " A second text, a beat later: “Not tonight, mind — I’m in my slippers. Tomorrow.”"), "thai");
  _say("(Mort. Queen Vic, most nights, end stool. OWL pulls up this week's issue.)", "dim");
}

function _maybeIncomingText() {
  if (G.battery <= 0 || G.game || G.pendingEnc) return;
  // ladies only: the unprompted-text machinery (invites, scam-asks, selfies) is
  // girl-voiced through and through — Tan (no NPC_ROLES entry) texts back when
  // texted, never into the mama-sick patter
  let contacts = Object.keys(G.phone.contacts).filter(id => NPC_ROLES[id]);
  // the affair's endings reach the phone too (Frank, 2026-08-26: the in-love
  // text pool kept sending the morning after she left). Gone is gone — silence
  // is her whole statement. Won gets its own register: Prachuap, not a barstool.
  if (G.affair && G.affair.ended) {
    const her = G.affair.id;
    contacts = contacts.filter(id => id !== her);
    if (G.affair.won && G.phone.contacts[her] && G.turns - G.phone.lastText >= 60 &&
        _hh("wontext:" + G.day, 17) % 100 < 20 && !(G.phone.wonTextDay === G.day)) {
      G.phone.wonTextDay = G.day;
      G.phone.lastText = G.turns;
      _pushMsg(her, _pickVary([
        "auntie teach me the broth today. secret is TIME, same like everything 555 you come home when you finish there na ❤️",
        "two customer today say same thing: best noodle in soi!! i no tell them my farang wash the bowls 😏",
        "sea very quiet tonight. i sit outside the shop and think how we get here. lucky, na. both of us. come home soon 🌙",
      ], "wontext"));
      _say("(📱 Your phone buzzes — CHECK MESSAGES.)", "dim");
      return;
    }
  }
  if (!contacts.length) return;
  if (G.turns - G.phone.lastText < 25) return;
  const maxT = Math.max(0, ...contacts.map(_bondTier));
  if (_rand() >= 0.06 + 0.02 * maxT) return;   // regulars miss you, so they text more
  // weight the pick toward the girls you've built something with
  // Presence check: a girl you are LOOKING AT does not text that she misses you
  // — Nong texted "i keep you seat every night, you no come i sad" from the next
  // stool (Alan playtest, 2026-08-17). Girls in the room sit the round out.
  const away = contacts.filter(c => _npcRoom(c) !== G.room);
  if (!away.length) return;
  const pool = [];
  for (const c of away) for (let i = 0; i <= _bondTier(c); i++) pool.push(c);
  const id = pool[Math.floor(_rand() * pool.length)];
  const buzz = () => _say("(📱 Your phone buzzes — CHECK MESSAGES.)", "dim");
  // the pics-hustle girl opens her drip the first time she texts, then nudges
  // until you pay through it
  if (NPCS[id].paidPics && !(G.phone.picDeals && G.phone.picDeals[id])) { _startPicDeal(id); buzz(); return; }
  {
    const deal = G.phone.picDeals && G.phone.picDeals[id];
    if (deal && !deal.done) {
      _pushMsg(id, `you see my photo?? 😏 more waiting for you... ฿${deal.ask} 💸`);
      buzz(); return;
    }
  }
  // a lady who keeps photos sometimes just sends one, out of the blue
  if (_selfiesFor(id).length && _rand() < 0.25) { _maybePhotoText(id); buzz(); return; }
  // a moneypit contact turns nearly every text into an ask, and the numbers climb;
  // the white knight gets steered to the top of the list and can't say no.
  if (NPCS[id].type === "moneypit") { _moneypitText(id); buzz(); return; }
  const name = NPCS[id].name, t = _bondTier(id), roll = _rand();
  if (t >= 3) { // her farang: longing, jealousy, the real ones — no scam game on you
    if (roll < 0.45) { G.phone.invite = { id, day: G.day };
      _pushMsg(id, _pickVary([
        `when you come see me?? 🥺 i keep you seat every night, you no come i sad 💔`,
        `i tell mamasan tonight my farang come. dont make me liar na 😤❤️`,
        `bar so boring without you 😩 come, i already tell the girls you funny one`,
      ], "invite3")); }
    else _pushMsg(id, ["i dream about you last night na 💭❤️", "you go other bar?? 😤 i see you i KNOW 👀",
      "miss you so much cannot sleep 😢", "my farang 🥰 you still in pattaya na? no go home yet, i not finish with you 555"][Math.floor(_rand() * 4)]);
  } else if (t >= 2) { // regular: invites and warmth, a little needy
    if (roll < 0.45) { G.phone.invite = { id, day: G.day };
      _pushMsg(id, _pickVary([
        `bar quiet tonight 😴 you come see ${name}?? i keep you seat 💺💕`,
        `you where na? 👀 come sit with ${name}, i save you the good stool`,
        `tonight have music! you come? ${name} wait you 🎶🍺`,
      ], "invite2")); }
    else if (roll < 0.6) _pushMsg(id, _pickVary([
      `family of me sick need medicine 300 🥺 you help little bit na? (SEND 300 TO ${NPCS[id].name.toUpperCase()})`,
      `mama go hospital today 😢 i short 300 for medicine... you can? (SEND 300 TO ${NPCS[id].name.toUpperCase()})`,
      `sorry ask you na 🙏 room rent tomorrow, i short 300. next month i pay you back (SEND 300 TO ${NPCS[id].name.toUpperCase()})`,
      `little brother school fee 300 😔 i no like ask but you good heart (SEND 300 TO ${NPCS[id].name.toUpperCase()})`,
    ], "ask2:" + id));
    else _pushMsg(id, _CHATTER[Math.floor(_rand() * _CHATTER.length)]);
  } else { // a name and a number: the classic mix, scam-ask heavy
    if (roll < 0.3) { G.phone.invite = { id, day: G.day };
      _pushMsg(id, `bar quiet tonight 😴 you come see ${name}?? i keep you seat 💺💕`); }
    else if (roll < 0.65) _pushMsg(id, ["somebody in family sick, need buy medicine 300 baht 🥺 you help?",
      "phone of me break!! need 500 for fix... you good heart na 🙏",
      "buffalo of family very sick 😭😭 200 baht help little bit?",
      "motorbike of me broken 😩 mechanic say 400. you help little? i pay back",
      "no customer 3 day already 😢 mama angry. 300 for room na, please",
      "papa need medicine, pharmacy 250 baht. sorry i ask you 🙏🙏"][Math.floor(_rand() * 6)]);
    else if (roll < 0.9) _pushMsg(id, _CHATTER[Math.floor(_rand() * _CHATTER.length)]);
    else _pushMsg(id, "lucky day!! I win lottery small small 🎉 send you luck money", 50);
  }
  _say("(📱 Your phone buzzes — CHECK MESSAGES.)", "dim");
}

// ── The news ─────────────────────────────────────────────────────────────────
// Real headlines, baked into news-data.js at deploy time (scripts/fetch-news
// + the news workflow). Presentation flavor ONLY — never gate logic on them;
// the tests run without the feed and everything must still work.

function _newsFeed() { return typeof NEWS_FEED === "undefined" ? [] : NEWS_FEED; }

function _fxRates() { return typeof FX_RATES === "undefined" ? null : FX_RATES; }

const _FX_CURRENCIES = [
  ["USD", "$", "the dollar"], ["GBP", "£", "the pound"],
  ["AUD", "A$", "the Aussie dollar"], ["EUR", "€", "the euro"],
];

function _fxLine() {
  const fx = _fxRates();
  if (!fx) return null;
  return _FX_CURRENCIES.map(([c, sym]) => `${sym}1 = ฿${fx[c]}`).join(" · ");
}

function _wxNow() { return typeof WX_NOW === "undefined" ? null : WX_NOW; }

function _wxDesc(code) {
  if (code >= 95) return "thunder somewhere over the Gulf";
  if (code >= 80) return "showers queuing up offshore";
  if (code >= 61) return "rain coming in off the sea";
  if (code >= 51) return "a drizzle nobody dresses for";
  if (code >= 45) return "haze sitting flat on the water";
  if (code >= 2) return "cloud stacked over Koh Larn";
  return "not a cloud with the nerve";
}

function _wxLine() {
  const wx = _wxNow();
  if (!wx) return null;
  return `${wx.temp}°, ${wx.humid}% humidity, ${_wxDesc(wx.code)}` +
    (wx.rain >= 40 ? `, ${wx.rain}% chance of rain` : "");
}

// ── The sports desk, the lottery, and the other pensions ─────────────────────
// FOOTY / LOTTO / GOLD / BTC ride the same bake as the headlines. All flavor,
// with ONE sanctioned mechanical crossing (the regular's team wins → he buys
// a round), guarded rain-style: the data check precedes any dice.

function _footy() { return typeof FOOTY === "undefined" ? null : FOOTY; }
function _lotto() { return typeof LOTTO === "undefined" ? null : LOTTO; }
function _gold() { return typeof GOLD === "undefined" ? null : GOLD; }
function _btc() { return typeof BTC === "undefined" ? null : BTC; }

// every bar's regular has a lifelong allegiance — hashed from the bar id over
// the teams in the current bake, so it never wavers mid-deploy
function _barTeam() {
  const f = _footy();
  if (!f) return null;
  const teams = [...new Set(f.games.flatMap(g => [g.h, g.a]))].sort();
  if (!teams.length) return null;
  let h = 0;
  for (const ch of G.room) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return teams[h % teams.length];
}

function _fmtGame(g) {
  return g.done ? `${g.h} ${g.hs}–${g.as} ${g.a}` : `${g.h} v ${g.a}`;
}

function _footyLine() {
  const f = _footy();
  if (!f) return null;
  const done = f.games.filter(g => g.done);
  const next = f.games.find(g => !g.done);
  const bits = [];
  if (done.length) bits.push(done.slice(-2).map(_fmtGame).join(" · "));
  if (next) bits.push(`next up ${_fmtGame(next)}`);
  return bits.length ? `${f.league}: ${bits.join(" — ")}` : null;
}

function _doScores() {
  const f = _footy();
  if (!f) {
    _say("No signal on the sports front. The season, like everything else " +
      "here, resumes when it resumes.");
    return;
  }
  _say(`${f.league}:`);
  // the telly reported a result SCORES never listed (Colin, round 37): results
  // first, then the fixtures — the same bake, read the same way as _footyLine
  const done = f.games.filter(g => g.done).slice(-3), next = f.games.filter(g => !g.done).slice(0, 5);
  for (const g of done) _say("  " + _fmtGame(g), "dim");
  for (const g of next) _say(`  ${g.d} — ${g.h} v ${g.a}`, "dim");
  const team = _inBar() && _barTeam();
  if (team) {
    _say(`(The regular here supports ${team}. You didn't ask. You never have to.)`, "dim");
  }
}

function _doLottery() {
  const lt = _lotto();
  if (!lt) {
    _say("The GLO draw is the 1st and the 16th, and any hostess can recite the " +
      "calendar from memory. No results to hand out here.");
    return;
  }
  _say(`Last GLO draw (${lt.date}): first prize ${lt.first} · last two ${lt.last2}` +
    (lt.back3 && lt.back3.length ? ` · back three ${lt.back3.join(" / ")}` : ""));
  _say("You don't have a ticket. Every girl in every bar can fix that by " +
    "tomorrow lunchtime.", "dim");
}

// ── Rainy season ─────────────────────────────────────────────────────────────
// The one sanctioned crossing from the weather bake into mechanics: a stormy
// WMO code ENABLES downpours, but every roll still goes through G.rng — same
// seed, same night. No bake, no rain: tests and file:// behave as ever.

function _wxStormy() {
  const wx = _wxNow();
  return !!wx && (wx.code >= 95 || [63, 65, 81, 82].includes(wx.code));
}

// any rain in the forecast at all — drizzle families, showers, thunder, or
// just high odds. Enables the LIGHT-RAIN vignettes: pure atmosphere, no
// mechanics, the town performing its wet-season drill.
function _wxRainy() {
  const wx = _wxNow();
  return !!wx && ((wx.code >= 51 && wx.code <= 82) || wx.code >= 95 || wx.rain >= 50);
}

// The empty-bar monsoon register: rain hammering a room with nobody in it. The
// rule from the canon essay: low season has NO drama — the emptiness is the event.
const _RAIN_EMPTY_BAR = [
  "The rain owns the roof and the room belongs to nobody. The pool table is under its " +
    "cover; two of the girls share a thin blanket on the corner sofa, faces lit blue by " +
    "their phones; the speaker plays a DJ mix to an audience of stacked stools.",
  "The girl nearest the door has pulled her bare feet up onto the plastic stool, chin " +
    "on her knees, watching the street flood. Nobody has bought anything in an hour and " +
    "nobody has said anything either. The rain is doing all the talking.",
  "Somebody's soi dog has claimed the doorway step, shaking itself into a tight wet " +
    "ball — a temporary truce with humanity, ratified without a word. The girls let it " +
    "lie. In this weather everything gets to come in off the street except money.",
  "The neon runs its colours into the puddle at the threshold. Behind the rail the " +
    "cashier counts a drawer that doesn't need counting, twice, because the counting " +
    "is something to do. The rain does not care whose rent is due.",
];

const _DRIZZLE_BAR = [
  "A few fat drops hit the awning, then a few more. Without a word, two of " +
    "the girls slip out and bring the street-side barstools in, stacking them " +
    "dry — a drill they could run asleep. The mamasan glances at the sky, " +
    "unimpressed. The music doesn't miss a beat.",
  "Light rain starts ticking on the roof. The hostess nearest the door " +
    "leans out, palm up, and delivers the verdict — “nit noi.” Nothing. She " +
    "goes back to her phone. The barstools come in anyway. The barstools " +
    "always come in.",
  "Rain on the tin, soft and then less soft. Somebody turns the music up one " +
    "notch to cover it, which is the whole of the bar's weather policy.",
  "The awning starts to drum. A girl reaches out without looking and drags the " +
    "sandwich board in by one corner, mid-sentence, mid-laugh — the soi's reflexes " +
    "are older than she is.",
  "The gutter out front starts to run. One of the girls swaps her heels for the " +
    "flip-flops she keeps behind the bar for exactly this, without breaking off her " +
    "story, and carries on barefoot-adjacent and entirely unbothered.",
  "A warm drizzle beads on the neon and makes the whole front of the bar glow " +
    "softer. The mama sends a boy for the good umbrella — not for the customers, " +
    "for the sound system — and the night carries on underneath it.",
  "Rain feathers down, just enough to send the smokers back under the awning. For " +
    "a few minutes the bar is fuller than it was, everyone driven in off the kerb, " +
    "and the takings tick up for reasons the weather app would never predict.",
  "It starts to spit, and a hostess tips her face up into it for one second before " +
    "she remembers her make-up and ducks back under, laughing at herself. The stools " +
    "come in around her while she does.",
];
function _sayDrizzle() {
  const alt = G.turns % 2 === 0; // variant by parity — no dice for flavor
  if (_inBar()) {
    // LOW SEASON'S OTHER REGISTER (monsoon-purgatory canon, 2026-08-22): when the
    // rain has the room to itself — no patrons at the rail — the drill prose is
    // wrong; the event is the emptiness. Atmosphere only, no drama by rule.
    const _talking = typeof _convoActive === "function" && !!_convoActive();
    const dead = typeof _regularsHere === "function" && !_regularsHere().length && !_talking &&
      !(typeof _salengHere === "function" && _salengHere()) &&  // a cart the girls are swarming: not a dead room (Ronnie, 2026-08-26)
      !(typeof _barSpendTonight === "function" && _barSpendTonight(G.room)); // you just bought a round: not dead
    if (dead && _room().barType === "beer") {
      const staff = _npcsHere().filter(n => NPC_ROLES[n] === "hostess").length;
      const pool = _RAIN_EMPTY_BAR.filter(s => (_room().pool || !/pool table/.test(s)) && (staff >= 2 || !/two of the girls/.test(s)));
      _say(_pickVary(pool.length ? pool : _RAIN_EMPTY_BAR, "rainempty"), "dim");
      return;
    }
    // Enclosed venues (the gents villas, anywhere aircon-shut) have no street-side
    // stools to rescue — the open-front drill read wrong inside the Orchid
    // (mobile playtest 2026-08-17). They get the rain as sound, not chore.
    // …and a pub is not a street bar: no girls, no mamasan, no awning to
    // rescue stools from under. The Vic's rain is on the far side of the
    // glass, which is much of what a pub is for (grapevine F5, 2026-08-25).
    if (_room().barType === "pub") {
      _say(alt
        ? "Rain arrives on the front glass in a long diagonal sweep. Inside " +
          "nothing changes at all — the commentary, the fridge hum, somebody's " +
          "crisps — and that nothing is the whole point of the place."
        : "The soi outside blurs and empties; a girl from the bar opposite " +
          "sprints past the window holding a stool over her head. In here the " +
          "rain is weather on a screen. Somebody turns the football up.", "dim");
      return;
    }
    const enclosed = _room().barType === "gents";
    if (enclosed) {
      _say(alt ?
        "Rain arrives on the roof, politely muffled — in here it is somebody " +
        "else's problem, which is much of what the room charges for." :
        "A change in the air, and the sound of rain starting somewhere beyond " +
        "the aircon. One of the girls glances up; nobody moves.", "dim");
      return;
    }
    _say(_DRIZZLE_BAR[(G.day * 7 + Math.floor(G.turns / 15)) % _DRIZZLE_BAR.length], "dim");
  } else {
    // no dice for weather flavour: the variant is a function of the day and
    // the turn, not _rand() — and no baht bus on the Darkside, where the songthaews
    // don't run (desktop playtest 2026-08-22)
    const dark = _room().region === "Darkside";
    const pool = dark ? _DRIZZLE_DARK : _DRIZZLE_STREET;
    _say(pool[(G.day * 7 + Math.floor(G.turns / 15)) % pool.length], "dim");
  }
  // The dog's rain repertoire lived only in _startRain (a full downpour, which
  // needs a stormy weather-bake) — so a dog-lover on an ordinary week never saw
  // it (dog-person playtest, 2026-08-26). A lighter drizzle line, deterministic
  // (no dice — same rule as the rest of _sayDrizzle) and occasional (parity), so
  // he's present in the light rain too.
  if (G.dog && alt && !_inBar()) {
    _say(_dogN(_DOG_DRIZZLE[(G.day + Math.floor(G.turns / 15)) % _DOG_DRIZZLE.length]), "dim");
  }
}
// Light-rain (not downpour) dog beats — the everyday version of _DOG_RAIN_STREET.
const _DOG_DRIZZLE = [
  "Sai Krok gives the drizzle exactly the attention it deserves, which is none, and keeps reading the street through it.",
  "A few drops darken Sai Krok's coat and he does not dignify them with a shake — this is not, in his professional judgement, weather.",
  "Sai Krok trots half a pace closer under the eaves with you, unbothered, a dog who has out-sat a thousand of these and expects to out-sit a thousand more.",
];
const _DRIZZLE_STREET = [
  "A soft rain drifts in off the Gulf. Up the road a baht bus pulls over " +
    "mid-route and the driver hops out, unhurried, to roll the canvas rain " +
    "guards down the sides — the passengers clip the last one themselves, a " +
    "crew that has clearly done this before. It pulls away trailing spray.",
  "Light rain, barely worth the name. The pavement goes glossy and the neon " +
    "doubles itself in it. Umbrellas appear from nowhere — the vendors sell " +
    "them mid-shower, naturally — and the town carries on at exactly the same " +
    "speed, slightly shinier.",
  "A fine rain, more mist than weather. A piwin tucks his bike under an awning " +
    "and lights a cigarette with the patience of a man who is paid by the fare, " +
    "not the hour. Two girls share one umbrella and one phone between three bars.",
  "Drizzle, warm as breath. The soi smells suddenly of wet concrete and grilled " +
    "squid. Nobody hurries; hurrying in this town is what the rain is for.",
];
const _DRIZZLE_DARK = [
  "A soft rain comes across the lake and the road. A motosai pulls in under a " +
    "bar's tin roof and the piwin and the mamasan exchange the whole weather " +
    "forecast in one look. Out here nobody runs for it.",
  "Light rain on tin roofs, which is the loudest thing on the Darkside. The " +
    "fairy lights smear. A dog relocates one metre to the left and considers " +
    "the matter closed.",
  "Drizzle over the soi, and the smell of wet earth under the charcoal — out here " +
    "the rain still lands on ground, not pavement. Somewhere off the road a TV goes up a notch.",
];

function _sheltered(id) {
  const r = ROOMS[id];
  return !!(r.bar || r.barType || r.shop || r.outlet) ||
    id === "police_station" || id === "oy_office";
}

// two to three downpours a night for six nights, the same two sentences each
// time (Trevor, round 39): the start and the stop are pools now
const _RAIN_START = [
  "The sky lets go all at once — rainy-season rain, hammering the roof like applause, sheeting off the awning in a solid curtain.",
  "No warning, no first drops: the rain arrives as a wall, and the noise of it on tin is the only sound left in the world.",
  "A single fat drop on the back of your hand, then the whole sky follows it down. The awning bows. The gutters give up inside a minute.",
  "The air goes green, the neon doubles in the wet, and then the rain comes down like something spilled — all of it, at once, the way it only rains here.",
];
function _startRain(len) {
  G.rain = len;
  G.lastRain = G.turns;
  if (_inBar()) {
    _say(_pickVary(_RAIN_START, "rainstart") + " The street " +
      "empties in five seconds flat. Nobody is going anywhere for a while.", "alert");
    _say("(Nowhere to be. Nothing to be done about it. สบาย.)", "dim");
    _addHappy(1);
  } else if (_sheltered(G.room)) {
    _say("Rain arrives like a verdict — the world outside the glass goes " +
      "grey-white and deafening. In here: dry, humming air-con, and the smug " +
      "particular pleasure of watching weather happen to other people.", "alert");
  } else if (_room().seven) {
    _say("The sky lets go all at once. You make the 7-Eleven awning in three " +
      "strides, joining a motorbike, two hostesses, and a monk — the full " +
      "congregation of the stranded. The street becomes a river with " +
      "headlights in it. Even the soi dogs have vanished.", "alert");
    _say("(Pinned until it passes. There are worse chapels — the toasties are " +
      "right there.)", "dim");
  } else {
    _say("The sky lets go all at once — a grey-white wall of rainy-season rain " +
      "marching up the street. You make the nearest awning already soaked. " +
      "The street becomes a river with motorbikes in it. Even the soi dogs " +
      "have vanished; nothing with sense stays out in this.", "alert");
    _say("(Pinned until it passes — though a doorway close enough to dive " +
      "through would still take you. GO <somewhere inside>, or wait it out.)", "dim");
  }
  // Sai Krok reacts when he's in sight: with you on the street, or under your
  // stool at an open-air beer bar. (Outside a closed venue he's got his own
  // arrangements — every dog on this soi knows a dry spot you don't.)
  if (G.dog) {
    if (_room().barType === "beer") {
      _say(_dogN(_DOG_RAIN_BAR[Math.floor(_rand() * _DOG_RAIN_BAR.length)]), "dim");
    } else if (!_sheltered(G.room)) {
      _say(_dogN(_DOG_RAIN_STREET[Math.floor(_rand() * _DOG_RAIN_STREET.length)]), "dim");
    }
  }
}

// The dog's rainy-season repertoire — a few variants each so a wet week
// doesn't play the same line every squall.
const _DOG_RAIN_BAR = [
  "Sai Krok was under your stool before the third drop landed — seniority in these " +
    "matters — and now stands, unhurried, to shake a full body-length of spray across " +
    "four stools. The whole rail lifts its beers in one practiced motion. Nobody " +
    "minds. Much. He resettles against your foot, smug and dry.",
  "Sai Krok relocates, without visible urgency, from under your stool to the exact " +
    "geometric centre of the bar's dry footprint — which is under the till. The " +
    "cashier will step over him for the next hour and never once comment.",
  "Thunder cracks somewhere over the gulf, and every girl in the bar checks Sai Krok " +
    "first — the soi's true seismometer. He yawns. The bar relaxes on his authority " +
    "and the music comes back up.",
  "Sai Krok watches the water sheet off the awning with a connoisseur's eye, taking " +
    "the vintage's measure — then folds up and falls asleep mid-downpour. The rail " +
    "finds this magnificent and toasts him accordingly.",
];
const _DOG_RAIN_STREET = [
  "Every soi dog in Pattaya has vanished — except yours. Sai Krok presses against " +
    "your shins under the awning, one wet rag of a dog, entirely unbothered. He has " +
    "out-waited a thousand of these and finds your surprise at the weather gently " +
    "amusing.",
  "Sai Krok leans his whole soaked weight against your leg and begins, gently, to " +
    "steam. The smell is monsoon-flavoured regret. Loyalty has a price, and tonight " +
    "the price is this smell.",
  "Sai Krok takes one look at your chosen shelter, dismisses it, and herds you two " +
    "doorways down to a dry spot he clearly already knew about. Dogs keep maps of " +
    "this town that men would pay real money for.",
  "Sai Krok sits precisely at the awning's drip-line, nose out, letting the rain " +
    "hammer his snout — some private annual ritual between him and the season. Then " +
    "one enormous shake, and he rejoins you as if nothing passed between them.",
];

// A shared songthaew is an open truck bed — a dog riding along is one of the
// most ordinary sights in Thailand, free, no fuss. A motosai is one bike, one
// pillion seat, already full — physically no room for him, so he takes his own
// route and is simply THERE when the bike pulls in (the same "dogs keep maps
// of this town" competence established in the rain reactions).
const _DOG_BUS = [
  "Sai Krok vaults into the truck bed like he's done it a hundred times — which, " +
    "you're beginning to suspect, he has — ears back, tongue out, thoroughly " +
    "unbothered by forty kilometres an hour. He's down and at your heel again " +
    "before the songthaew's fully stopped rolling.",
  "The driver doesn't even glance twice as Sai Krok hops up onto the bench across " +
    "from you, settles, and rides the whole way with the bored dignity of a " +
    "commuter who has seen this route a thousand times. Nobody pays for a dog.",
  "Sai Krok rides the tailgate the whole way, nose into the wind, ears doing " +
    "something aerodynamically improbable. An old woman with a sack of rice pats " +
    "his head at the second stop and he accepts it like a toll.",
];
// No dedicated price clause baked in here — _doMotosai appends the actual
// ฿10 callout (or omits it, on the free pity-ride) once the flavor's picked,
// so these describe the ARRANGEMENT only.
const _DOG_MOTOSAI = [
  "The piwin doesn't even blink — one shout down the row and a second driver " +
    "swings a saleng round, tailgate down, a ramp for a dog who's clearly done " +
    "this before. Sai Krok trots up it like a gentleman boarding a first-class " +
    "carriage.",
  "\"Ai, dog too?\" The piwin laughs, waves over a mate idling by the stand, " +
    "and the two of them settle Sai Krok into the saleng's flatbed with more " +
    "ceremony than they gave you. He rides sitting bolt upright, surveying " +
    "his kingdom.",
  "A word passes between the piwins in Thai too fast to catch, and a second " +
    "bike peels off the rank — a battered saleng, motor coughing awake — with " +
    "Sai Krok already installed in the back before you've finished climbing " +
    "onto your own ride.",
];

function _doWeather() {
  if (G.rain > 0) {
    _say("Current conditions: a wall of water, personally experienced. Your " +
      "phone's weather app agrees, redundantly, from inside its dry pocket.");
    _saySeasonNote();
    return;
  }
  const wx = _wxNow();
  if (!wx) {
    _say("Your phone's weather app spins, gives up, and shows you yesterday. " +
      "Hot, it says. It was.");
    _saySeasonNote();
    return;
  }
  _say(`Your phone's weather app: ${wx.temp}° and feeling like more, ` +
    `${wx.humid}% humidity, ${_wxDesc(wx.code)}. High of ${wx.hi}°, ` +
    `${wx.rain}% chance of rain. Tomorrow's forecast is also Pattaya.`);
  _saySeasonNote(wx);
}

// The calendar season, for anyone (not just an owner) — the wet/dry half of the
// year an experienced punter plans a trip around. Deterministic, no dice, no bake.
// The real-weather bake (today's sky) and the game calendar (the time of year)
// drift apart on a long expat save, so the two lines can read as a contradiction
// — "73% chance of rain" over "cool, dry months" (Gordon, 2026-08-26). When the
// sky and the season pull opposite ways, a one-clause bridge names which is which.
function _saySeasonNote(wx) {
  const tier = _seasonTier(), month = _SEASON_MONTHS[_seasonMonth()];
  const note =
    tier === "peak" ? `And it's ${month}: peak season. The soi is full, the rooms are dear, and every bar is two-deep.` :
    tier === "high" ? `And it's ${month}: high season proper — the cool, dry months the whole calendar bends around.` :
    tier === "shoulder" ? `And it's ${month}: the hot season now, the crowd thinning between the winter rush and the rains.` :
    tier === "low" ? `And it's ${month}: low season. The monsoon's in, the bars are quiet, and the girls are keen.` :
    `And it's ${month}: the deep low — wettest and emptiest of all. For a certain kind of punter, the finest month there is.`;
  _say(note, "dim");
  wx = wx || _wxNow();
  if (wx) {
    const skyWet = wx.rain >= 50 || (wx.code >= 51 && wx.code <= 82) || wx.code >= 95;
    const dry = tier === "peak" || tier === "high";
    if (dry && skyWet) _say(`(Whatever the app's caught today, ${month} is the dry half of the year — a shower now is the exception, not the season.)`, "dim");
    else if (_wetSeason() && !skyWet) _say(`(A dry evening, but don't be fooled — it's ${month}, and the monsoon collects its debts.)`, "dim");
  }
}

// Real baked headlines occasionally include genuinely grim news (a dead teenager
// in a suitcase surfaced in the phone during a comedy playthrough — Alan, 2026-08-17).
// Filter the darkest keywords from the in-fiction surfaces: this is a nightlife
// romp, not a wire service. Flavour only, so dropping a few is free.
const _GRIM_RE = /\b(dead|death|died|kill(?:ed|ing)?|murder|suicide|rape|body|bodies|corpse|suffocat|abus|molest|overdose|fatal|massacre|hang(?:ed|ing)|drown|stab|shot|shoot)\b/i;
function _newsClean() {
  return _newsFeed().filter(h => !_GRIM_RE.test(h.t + " " + (h.s || "")));
}
function _headline() {
  const feed = _newsClean();
  const all = _newsFeed();
  const use = feed.length ? feed : all; // if a whole bake is grim, better a headline than none
  return use.length ? use[Math.floor(_rand() * use.length)] : null;
}

function _sayHeadline(h) {
  _say(`“${h.t}”${h.s ? " — " + h.s : ""}`, "thai");
}

// Blue Dog house speciality: the 18:00-19:00 police checkpoint across the road,
// and a bay sunset in the same hour. Watching either is worth a happy point,
// once a night — after that it's just spectating.
function _shakedownOn() { return G.nightTurn < 10; } // 18:00-19:00, ten turns/hour

const _SHAKEDOWN_SCENES = [
  "Down the road, just south of the soi mouth, an officer steps off the kerb with " +
    "one raised glove and a big Australian on a rented PCX pulls over with the face " +
    "of a man doing sums. Helmet: yes. License: the wallet comes out slowly... too " +
    "slowly. He is walked toward the station at a gentle, unhurried, absolutely " +
    "non-negotiable pace. The rail scores it a 7.",
  "A farang on a Click 125 clocks the checkpoint from two hundred metres, executes " +
    "a U-turn so sudden his flip-flop comes off, and vanishes up a side soi. The " +
    "rail erupts. One of the officers applauds, sincerely, without moving from his " +
    "spot. The flip-flop stays where it fell, a small monument.",
  "No helmet, no license, board shorts: the full house. He tries the confused-" +
    "tourist opening; the officer counters with the laminated card in four languages " +
    "and an on-the-spot number. When he makes the mistake of protesting, two of them " +
    "walk him off toward the station — off-camera, for 'processing.' At the rail, a " +
    "man who did the same walk last week raises his Chang in silent brotherhood.",
  "Two officers working the evening tide just south of the junction with the calm of " +
    "men netting fish at the river mouth. Thais and helmets sail through unwaved; a " +
    "bare-headed gap-year kid gets pulled mid-wheelie, which even the rail agrees was earned.",
  "A Norwegian on a scooter, girlfriend riding pillion in a sundress and not a helmet " +
    "between them, gets the glove. He argues the toss on the fine; the officer's face " +
    "does not change; a second officer drifts over the way a second officer always does. " +
    "Two minutes later the Norwegian is a great deal poorer and the girlfriend is doing " +
    "the maths on his behalf.",
  "The checkpoint runs like a car wash — wave, stop, check, fine, release, next — until " +
    "a Brit tries to film it 'for his rights.' The phone is not confiscated, exactly. It " +
    "is just very firmly suggested that the phone go away; the phone goes away; and the " +
    "number on the fine goes up a notch for the trouble.",
  "A whole convoy of stag-do lads on matching rented bikes hits the checkpoint at once and " +
    "scatters like startled pigeons — U-turns, kerb-jumps, one straight up a side soi the " +
    "wrong way. The officers pick off the slowest with the bored inevitability of a man " +
    "closing a gate. The rail awards style points.",
  "Somebody's clearly done this before: helmet on, license out, cash folded to the right " +
    "amount before he's even fully stopped, the whole transaction over in fifteen seconds " +
    "flat with a nod on both sides. The rail respects it. That, they agree, is how you take " +
    "a Tuesday checkpoint.",
];

// WATCH at the two junction bars (Blue Dog, Stinky Pinky) at the foot of Soi 6,
// which face Beach Road and the bay across it. Two shows: the evening police
// checkpoint (set up on Beach Road just south of the soi mouth from about five,
// working the helmetless-farang tide — a paperwork stop, an on-the-spot fine, and
// an off-camera "processing" walk for anyone who protests) and the bay sunset.
// WATCH POLICE picks the checkpoint, WATCH SUNSET picks the bay; bare WATCH gives
// whichever is live. One happy point a night, shared with the balcony/parade.
const _SUNSET_GOLD = [
  "Out past the road and the sand the bay does the whole production number: gold, then " +
    "rose, then a violet that no camera has ever come home with. The islands go to " +
    "silhouette. Behind you the beer signs buzz on one by one, taking over the shift. " +
    "Nobody at the rail says anything, which is how you can tell it's good.",
  "The sun goes down over the bay like it's being paid to: the water hammered copper, the " +
    "sky bleeding orange into something with no name, the islands flattening to cutouts. " +
    "Somewhere a phone camera gives up. The rail watches in the particular silence that " +
    "means it's worth watching.",
  "West, past the traffic and the sand, the whole sky commits — gold at the waterline, rose " +
    "stacked above it, a high cold violet at the top the day saves for last. The squid boats " +
    "prick on one by one. Nobody talks over it.",
  "The bay does its trick again and it works again: the sun sitting fat and red on the " +
    "horizon, the water going to beaten metal, the light warming every sunburnt face at the " +
    "rail for exactly as long as it lasts. Which is never long enough.",
  "Down goes the sun and the whole junction softens with it — the neon not yet winning, the " +
    "sky running colours no paint catalogue would dare, the islands black paper against them. " +
    "A good minute to be exactly here and nowhere else.",
];
const _SUNSET_DARK = [
  "The sun is long gone; across the road the bay is a dark sheet stitched with squid-boat " +
    "lights. Still worth watching, in the way embers are.",
  "The show's over — the bay a black expanse pricked with the green-white lights of the " +
    "squid fleet working the dark. Pretty, in a leftover way, but the paying part has set.",
  "Only the afterglow now, a bruise of colour low over the islands and the boats lit up " +
    "beyond. You watch the embers a while; the main event finished without you.",
  "Night owns the bay now — dark water, boat lights, the last stain of colour draining off " +
    "the far edge. Beautiful still, the way a shut-up fairground is beautiful.",
];
const _SHAKEDOWN_DONE = [
  "The checkpoint packed up around seven — the officers folded their operation like a market " +
    "stall and rode off, a couple of them helmetless themselves. The road south is just a road " +
    "again. The bay, however, is still open.",
  "Nothing to watch down the road now — the checkpoint's long done, the cones gone, the " +
    "officers off to wherever officers go once the tide of helmetless farang thins. The road's " +
    "just a road. Try the bay.",
  "The show south of the soi wrapped up hours ago; the last fined tourist is long since " +
    "processed and back on his rented bike, helmet now conspicuously on. The sunset seat's " +
    "still yours, though.",
  "Checkpoint's over — packed up on the dot and rolled off in a loose, unhurried convoy. " +
    "Whatever drama the road had, it's spent. The bay keeps later hours.",
];
function _doWatchJunction(arg) {
  const sunset = /sunset|bay|sea|view|\bsun\b/.test(arg || "");
  if (sunset || !_shakedownOn()) {
    if (_shakedownOn()) {
      _say(_pickVary(_SUNSET_GOLD, "sunsetgold"));
    } else if (sunset) {
      _say(_pickVary(_SUNSET_DARK, "sunsetdark"));
      return;
    } else {
      _say(_pickVary(_SHAKEDOWN_DONE, "shakedowndone"));
      return;
    }
  } else {
    _say(_pickVary(_SHAKEDOWN_SCENES, "shakedown"));
  }
  if (G.blueDogDay !== G.day) {
    G.blueDogDay = G.day;
    _addHappy(1);
    _say("(Best free show at the foot of the soi. +1 สนุก.)", "win");
  }
}

// The quiet middle of Soi 6 (and the beer bars along it) as free theatre: you
// watch the parade instead of being pulled into it. One happy point a night,
// shared with the balcony and the junction show (all the same "free show" cap).
const _PARADE_SCENES = [
  "From your stool the whole soi streams past: a barker at the west end loses a " +
    "customer to the bar across the way and takes it personally; a hen party in " +
    "matching sashes gets gently herded out of one front and into the next; the " +
    "TikTok kid with the ring light films it all for people who'll never smell it.",
  "A farang two beers in tries to haggle a barfine down by miming his own poverty; " +
    "the mama mimes back, better; it ends in a handshake and a lady drink. Down the " +
    "way a foam pool noodle catches some slower tourist across the shoulders and the " +
    "whole front cackles.",
  "The parade does its thing a few feet off the deck: a pull, a giggle, a wrist taken " +
    "and released, a man walking very fast with his eyes down while three girls call " +
    "him handsome anyway. You sip and score it privately.",
  "Two girls share one plate of som tam between customers; a third tries a new English " +
    "line on a passing German and lands it; a soi dog supervises from the gutter. Best " +
    "cheap theatre in town, and your seat's already paid for.",
  "A tout at the east end reels one in with a foam noodle and pure persistence; a " +
    "bachelor party debates a bar by committee and picks wrong; a girl leans out of a " +
    "front to wave at a regular by name. Nobody bothers you. You wave the next round over.",
  "The soi performs and you spectate: the flip-flops, the neon, the offers overlapping " +
    "into one warm wall of noise, and the small real pleasure of watching all of it from " +
    "a stool where nobody is trying to climb into your lap.",
];
function _doWatchParade() {
  _say(_pickVary(_PARADE_SCENES, "parade"));
  if (G.blueDogDay !== G.day) {
    G.blueDogDay = G.day;
    _addHappy(1);
    _say("(Best cheap seat on the soi. +1 สนุก.)", "win");
  }
}

// The Queen Vic balcony: the whole of Soi 6 as theatre, nightly, included in the
// rate. One happy point a night, shared cap with the junction and the parade.
const _BALCONY_SCENES = [
  "You take the recliner. Below, Soi 6 performs: the barkers working the walkers, a hen " +
    "party being gently herded out of Golden Dragon, two girls from Pink Lotus sharing one " +
    "plate of som tam between customers, and the TikTok kid with the ring light filming it " +
    "all for people who will never smell it. Two balconies over, Terry raises his beer " +
    "without looking. You raise yours.",
  "From the rail the soi is a lit aquarium: a bachelor party circling a doorway like fish " +
    "deciding on the bait, a girl leaning out to reel one in by the shirt, a foam noodle " +
    "descending on some dawdler two bars down. Terry, two balconies over, has clearly seen " +
    "this exact scene a thousand times and rates tonight's a solid six.",
  "You put your feet on the rail. Below, the whole circus: neon fighting neon, a farang " +
    "haggling a barfine with his hands, a hostess laughing like a car alarm, a soi dog " +
    "threading the whole mess untouched like he owns the lease. The bass comes up through " +
    "the floor and into the recliner. You let it.",
  "The soi throws its light and noise up the wall and you catch it all from the cheap seats: " +
    "a stag-do losing a man to a doorway, a mama counting her girls with her eyes, the " +
    "ring-light kid getting in everyone's way. Terry lifts his beer. Two balconies of quiet " +
    "smugness, overlooking the loudest hundred metres in Thailand.",
  "Down in the tank, the eight-o'clock shift change: fresh girls out front stretching and " +
    "scanning, tired ones slipping upstairs, a barker resetting his voice for the next wave " +
    "of walkers. You've paid for the best seat in the house and it costs nothing extra to " +
    "keep it. The recliner agrees.",
  "A whole play in one glance from the rail: boy meets girl, girl names price, boy does " +
    "sums, girl loses patience and takes the next boy, first boy pretends it was his idea to " +
    "leave. Repeated, with variations, all the way down the soi. Terry salutes the classics.",
  "The parade churns below and you spectate from above, gloriously uninvolved — the grabs " +
    "and the giggles and the offers all aimed at pavement level, none of it able to climb " +
    "two floors to your recliner. Best seat, cheapest ticket, no hands on your wrist. Bliss.",
];

// The pub-window vantage (ground floor, Queen Vic). Eye-level, glass between you
// and the grab; the calm inside against the storm outside — the opposite of the
// balcony's serene distance.
const _PUB_SOI_SCENES = [
  "You take a stool by the window. On the far side of the glass Soi 6 goes about its business at eye level — a " +
    "tout's patter, a girl's laugh pitched to carry, a farang being steered by the elbow toward a doorway he is " +
    "pretending to resist. In here: aircon, a dartboard, a pint going warm at exactly your own pace. The glass does " +
    "the rest.",
  "Through the Vic's front window the soi plays as a silent film with the bass leaking under the door — a barfine " +
    "haggled in mime, a hen party spilling off the kerb, a soi dog trotting through the lot of it on business of his " +
    "own. Terry doesn't turn from his corner. After a minute, neither do you.",
  "An arm's length of pavement and a pane of glass between you and the whole circus: the leaning-out, the " +
    "sleeve-grabbing, the WHERE YOU GO landing on the window like rain. Inside, a dart thunks the board and somebody " +
    "swears amiably about the football. The calm side of the glass has a lot to recommend it.",
  // (the late pool below answers after the shutters — this one is the show)
  "Street level, front row: the parade presses right up to the window — a price named on someone's fingers, a boy " +
    "doing the arithmetic, a mama watching her girls the way a cat watches a door. In the Vic it is just wood and " +
    "cold air and the low talk of men who found their stool and mean to keep it.",
  "The soi at arm's length through the glass — louder and grabbier down here than it ever looks from up top, every " +
    "offer aimed at pavement height. You nurse the pint; the window holds. Terry lifts his without looking, a man who " +
    "has watched this exact hundred metres longer than some of the girls out there have been alive.",
];
// One spectator happy-point a night, shared across every vantage (balcony, pub
// window, the quiet-middle parade, the Blue Dog show) via G.blueDogDay.
// _addHappy already prints "(+1 สนุก)", so the caller's line must NOT repeat
// it — spotted in a soak transcript, where the two landed back to back and read
// like a double award. The kind of defect only sequence shows.
// Buddha Hill (docs/map-coverage.md) — Pratumnak's standing pull, and deliberately
// NOT a spectator point: WATCH SOI and the Blue Dog are watching the parade and share
// the one-a-night budget (G.blueDogDay). This is the opposite — contemplation, the one
// calm beat above the treadmill — so it gets its own daily budget like the beach cats
// (G.buddhaDay) and pays NON-jading _addHappy. A genuine step out of the hustle, once a
// day, for a real climb. _addHappy prints its own สนุก line; don't repeat it.
const _BUDDHA_LINES = [
  "You sit on the low wall by the Buddha and let the bay do the talking. Down there a hundred " +
    "thousand people are chasing the night; up here there's just the warm wind, the incense, and " +
    "the long gold curve of a coast that was beautiful before any of it and will be after. " +
    "Something in your chest unknots a notch.",
  "A temple cat threads the railing. Two Thai kids photograph the Buddha and the bay and go. You " +
    "stay, watching the light change over the water and the neon come up as the sky goes down. " +
    "Nobody up here wants anything from you — it's almost unnerving how badly you needed that.",
  "The offerings at the Buddha's feet are today's: marigolds, a red Fanta, a folded note. You add " +
    "nothing and take nothing, just stand in the quiet with the whole shining mess of Pattaya laid " +
    "small and harmless below, and for a few minutes the treadmill lets go of your ankle.",
  "You watch a baht bus crawl the coast road far below, no bigger than a beetle, ferrying " +
    "somebody's night somewhere. From up here it's all lights and motion, pretty and pointless and " +
    "quietly magnificent. You breathe out. The Buddha does not comment. That's rather the appeal.",
];
const _BUDDHA_AGAIN = [
  "You've had your quiet for today; sit any longer and it stops being peace and starts being " +
    "hiding. You leave the Buddha to it.",
  "The bay's still there and the Buddha's still patient, but you've already taken your minute " +
    "today. Twice in a day is greedy. Back down you go.",
  "You've already had the view today, and it doesn't get truer the second time. You let it be.",
];
function _doWatchBuddha() {
  if (G.buddhaDay === G.day) { _say(_pickVary(_BUDDHA_AGAIN, "buddha_again")); return; }
  G.buddhaDay = G.day;
  if (!_flag("sawBuddhaHill")) {
    _setFlag("sawBuddhaHill");
    _say("You climb the last of the steps and the noise just… stops. The big golden Buddha sits " +
      "with the patience of something that has watched this bay fill with neon and will watch it " +
      "empty again, and below him the whole coast lays itself out — the beach, the pier, Walking " +
      "Street a pink smear at the far end, the entire roaring machine shrunk to a thing you could " +
      "cover with a thumb. Up here you can hear yourself think, which after the soi is either a " +
      "relief or a problem, depending on the thoughts. You stand a while. The city keeps roaring, " +
      "faithfully, without you. It's the first time all trip you haven't been counting something.", "win");
  } else {
    _say(_pickVary(_BUDDHA_LINES, "buddha"), "win");
  }
  _addHappy(2);
}

function _soiSpectateHappy(msg) {
  if (G.blueDogDay !== G.day) {
    G.blueDogDay = G.day;
    _addHappy(1);
    _say(msg, "win");
  }
}

// The upper vantage: your third-floor balcony over the Queen Vic. The FIRST look
// is the tone-setter — a vibrant, orienting wall that lays the whole soi out and
// points you at what to do (once per game; `sawBalcony` resets with newGame).
// Every look after that draws the varied _BALCONY_SCENES pool, so no repeated wall.
const _WATCH_SOI_LATE = [
  "Street level, after the show: the grilles are down along the far side, one neon left burning by mistake, " +
    "a boy hosing the pavement with the concentration of a man who has done it a thousand nights. The parade " +
    "has gone home; the soi is just a road again, and the window frames it like a photograph of somewhere else.",
  "Nothing moves out there but a dog and a sweeper, and once, slowly, a motorbike with two girls on it going " +
    "home in their own clothes. From up here you can see the whole length of the soi and every shutter on it, " +
    "and the quiet is the loudest thing you have heard all night.",
  "The window at this hour shows you the bones: a strip of lit doorways gone dark one at a time, a cashier's " +
    "cage with the light still on and nobody in it, a cat where the dancer was. Two of the shutters are graffitied " +
    "and you have never once seen them before, because they are never down when you are.",
];
function _doWatchSoi() {
  if (!_flag("sawBalcony")) {
    _setFlag("sawBalcony");
    _say("You step out to the third-floor rail, and Soi 6 opens up underneath you like somebody kicked over a crate of neon.");
    _say("Four hundred metres of it, wall to wall, and you're perched right over the middle: both ends flaring away " +
      "from you — go-go fronts throwing pink light and bass up the walls, west toward Beach Road and east toward Second, " +
      "the signs getting bigger and the promises smaller the further out they go — with the quieter stretch laid out " +
      "directly below, close enough to eavesdrop. The parade never stops. Barkers working the walkers. Girls leaning " +
      "out of doorways to reel a passing shirt in by the sleeve — HANDSOME MAN, WHERE YOU GO — half of them meaning it, " +
      "all of them counting. A stag party circling a lit doorway like fish deciding on the bait. A som-tam cart, a kid " +
      "with a ring light livestreaming the whole street to people who'll never actually stand in it, a soi dog threading " +
      "the mess like he holds the lease on it.");
    _say("It is gaudy and it is grubby and — you can feel it already — it is going to be very hard to leave.");
    // The soi runs between Beach Rd and Second Rd; the songthaew passes those, not
    // the soi itself. In the Soi 6 week you never leave — you sleep right up here,
    // over the quiet middle — so the last-bus worry only belongs to the full game.
    const _close = G.mode === "soi6"
      ? "The loud ends bracket the calm middle you're perched over. Pace your baht — one street, one week, and you sleep right up here above the thick of it."
      : "The loud ends bracket the calm middle. Pace your baht, and keep an ear out for the last songthaew home off Beach Road.";
    _say("Somewhere down there is a week's worth of trouble with your name on it. (It's all just DOWN the stairs — " +
      "the pub first, then out into the soi. " + _close + ")", "dim");
  } else {
    _say(_pickVary(G.nightTurn >= 60 ? _WATCH_SOI_LATE : _BALCONY_SCENES, G.nightTurn >= 60 ? "soilate" : "balcony"));
  }
  _soiSpectateHappy("(Best seat above the best free show.)");
}

// The ground vantage: the Queen Vic's front window. Same soi, opposite feeling —
// eye-level, an arm's length of pavement and a pane of glass between you and the
// whole grabby circus, the pub's cold-aircon calm behind you. Its own pool.
function _doWatchPubSoi() {
  // after the shutters the window shows a different street (Malcolm, r36:
  // "the parade presses right up to the window" at 01:30, beside the room's
  // own "shutters down and its neon off")
  if (G.nightTurn >= 60) _say(_pickVary(_WATCH_SOI_LATE, "soilate"));
  else _say(_pickVary(_PUB_SOI_SCENES, "pubsoi"));
  _soiSpectateHappy("(A pint, and the whole circus safely behind glass.)");
}

// The Jomtien beach cats: Big One and Little One, the two gray-and-white
// sisters on the lounger. Petting them is a small daily blessing — one happy
// point a night, same house rules as the sunsets and the free shows. Big One
// vets every hand before it gets anywhere near her sister; that's the deal.
const _PET_LINES = [
  "Sai Krok accepts the ear-scratch with his eyes half-shut and his attention " +
    "fully open — somewhere behind you a motorbike slows, and the rumble starts low " +
    "in his chest before you've even registered it. The bike moves on. So does the " +
    "rumble. You get the last of the scratch in undisturbed.",
  "Sai Krok leans the whole of his weight into your shin while you scratch the spot " +
    "behind his ear, and lets out a sigh that has the whole street in it.",
  "You crouch; Sai Krok closes the distance and puts his chin on your knee. Thirty seconds of " +
    "that, and the night is a measurably better night.",
  "A two-handed rub down Sai Krok's ribs. His back leg goes on its own — the old circuit — and " +
    "he looks mildly betrayed by it, then forgives you both.",
  "Sai Krok tolerates the fuss the way a professional tolerates praise: he was going to " +
    "do the job anyway. The tail, unprofessionally, thumps twice.",
];
const _PET_OUTSIDE = [
  "You step out to the door for him. He is exactly where you left him, chin on paws, and he " +
    "accepts the scratch without getting up — on duty, after all. Back inside the room carries on.",
  "He's outside, where the house rules put him. You go to the door; one ear turns, the tail " +
    "thumps the step, and he leans into your hand for as long as you'll stand there.",
];
// A bar cat is not the Jomtien beach pair and is not yours; she is staff, and
// she is the one deciding how this goes.
const _PET_BAR_CAT = [
  "She permits it, in the way of a creature doing you a favour it may revoke. Two seconds of a flat warm skull under your palm, and then she is a foot further along the rail with her back to you, having made her point.",
  "One eye opens. It considers your hand, your face, and your standing in this establishment, in that order, and closes again without any part of her moving. You take that as a yes and are, on balance, correct.",
  "A brief hard head-butt into your knuckles \u2014 all business, no sentiment \u2014 and then she is off down the bar to a man who has been feeding her longer than you have been in the country.",
];
function _doPet(arg) {
  // his by name, or bare PET when he's the animal at hand (the beach cats keep
  // priority on their own sand)
  if (G.dog && (_isDogWord(arg || "") ||
      (!arg && G.itemLoc.soi_cats !== G.room))) {
    const r = _room();
    const outside = (r.bar || r.barType || r.massage || r.soapy || r.hostBar) && r.barType !== "beer";
    _say(_dogN(outside
      ? _pickVary(_PET_OUTSIDE, "petout")
      : _pickVary(_PET_LINES, "pet")));
    return;
  }
  if (G.itemLoc.soi_cats !== G.room) {
    // A room whose OWN prose keeps a cat ("a cat that outranks everyone" at The
    // Sandbar) must not answer "nothing here wants petting" — EXAMINE CAT
    // described her one command earlier (persona report A#16, 2026-08-23).
    if (/\bcats?\b/.test(arg || "") && /\bcats?\b/i.test(String(_room().desc || ""))) {
      _say(_pickVary(_PET_BAR_CAT, "petbarcat"));
      return;
    }
    _say(/dog/.test(arg || "")
      ? "You haven't got a dog. The soi's freelancers accept food, not affection — " +
        "though the one with the clipped ear has been known to reconsider for dinner. (FEED DOG.)"
      : "Nothing here wants petting. The soi dogs are on duty and know it, and the " +
        "bar cats work strictly for the kitchen.");
    return;
  }
  const little = /little/.test(arg || "");
  if (G.catDay === G.day) {
    _say(little
      ? "Little One is asleep against her sister's flank, one ear still up. Big One " +
        "meets your eye over her: not a chance, and you both know it. You leave them be."
      : "Big One accepts one more slow stroke on behalf of the management, then closes " +
        "her eyes — the audience is over. Little One never stirs. The sea carries on.");
    return;
  }
  if (little) {
    _say("You reach toward Little One and Big One is simply THERE — not hostile, not " +
      "hurried, just between your hand and her sister, the way she has been since they " +
      "were kittens. She inspects your knuckles with the thoroughness of a customs " +
      "officer. A long moment. Then one slow blink, and she steps aside exactly one " +
      "cat-width: permitted. Little One creeps out from her sister's lee and headbutts " +
      "your shin like it's a secret.", "win");
  } else {
    _say("Big One watches your hand all the way in, decides — one slow blink — and " +
      "allows it, chin first. Somewhere in the middle of it Little One materialises " +
      "under your other hand, purring at a frequency that must be doing structural " +
      "damage to the lounger. Big One keeps one eye on the sea and one on her sister. " +
      "She always has.", "win");
  }
  G.catDay = G.day;
  _addHappy(1); // _addHappy prints its own (+1 สนุก) — don't repeat it in the flavor line
  _say("(The best two locals on the beach.)", "dim");
}

// ── Sai Krok, the accidentally-adopted soi dog ──────────────────────────────
// Feed a soi dog once and you have a dog: he follows you bar to bar (waiting
// outside — dogs know the rules), sleeps against your hotel door, and pays his
// keep in protection: the dark sois go quiet (see the darkStreak block), the
// scam muscle recalculates around him (tonic shop / curse ritual), and nobody
// works the pockets of a passed-out farang whose dog is watching. There is no
// un-adopting him. Nobody consulted you. That is how soi dogs work.
// His registered name is whatever you've renamed him to; the soi's name for
// him ("Sai Krok" — sausage) is the default and all the prose is written in
// it, so _dogN() re-letters any dog line at render time. NAME DOG <name>.
function _dogName() { return (G.dog && G.dog.name) || "Sai Krok"; }
// function replacer so names render literally ("Bo$$" — $-sequences are magic
// in string replacements and would silently mangle)
//
// _L FIRST, then re-letter. The order is load-bearing: this runs inside the
// _say(...) argument, so without it _say would receive a string with the
// player's OWN dog name already substituted in — "…and Bo answers it, once,
// low" — which matches no catalog key and made every dog line untranslatable
// for anyone who used RENAME DOG. Keying on the authored "Sai Krok" form keeps
// one entry per line for all names; the German value carries "Sai Krok" too and
// gets re-lettered here. (_say re-runs _L on the result; it won't match, which
// is harmless.)
function _dogN(s) { return _L(s).replace(/Sai Krok/g, () => _dogName()); }
// does this word mean the dog? covers the defaults and whatever he's named now
function _isDogWord(a) {
  return /dog|sai|krok/.test(a) ||
    !!(G.dog && G.dog.name && a.includes(G.dog.name.toLowerCase()));
}

// ── Tan calls the favour in ──────────────────────────────────────────────────
// The payoff of the partnerTan route. All game he refuses money — SEND him baht
// and the app bounces it back — and his line is "when I want something from you,
// I will ask for it, and it will not be money." He meant it, and this is the ask.
//
// Design rules this beat obeys:
//   · It is SMALL. Not a shipment, not a crime. A name on a staff list — the
//     smallness IS the point: what's being established is that he can ask.
//   · He is not menacing, and never becomes menacing. He is the same warm man
//     who bought you lunch. The unease has to come from the arrangement, not
//     from his manner, or it's a different (worse, stock) story.
//   · Refusing is FREE. The faction doctrine is that standing moves on the deed
//     and declining costs nothing, forever — so NO moves no standing, triggers
//     no reprisal, and closes the thread warmly. The sting is a sentence, not a
//     penalty.
//   · Only the Tan route can ever see it. Candy's 51% is pinned behind the till
//     in a Bangkok lawyer's handwriting; there is nothing to call in.
function _tanFavourDue() {
  return _flag("partnerTan") && _flag("barOpen") && !_flag("tanAsked") &&
    G.room === "stinky_bar" && G.nightTurn >= 30;   // an evening beat, not a dawn one
}

function _tanFavour() {
  _setFlag("tanAsked");
  G.pendingChoice = "tanfavour";
  _say("");
  _say("Tan comes into your bar.", "alert");
  _say("He has never done that. He didn't come on opening night — he sent a " +
    "crate and a smiley and was somewhere else, being somewhere else. Tonight " +
    "he is here, in the polo shirt you would forget the instant you looked away, " +
    "and he waits at the end of the rail until Bert has finished pouring rather " +
    "than cutting in front of a customer.");
  _say("\"My friend.\" The same warmth. It is not a performance; it never was. " +
    "\"The bar is good. Busy on a Tuesday — that is the real test, not " +
    "Saturday.\" He turns down the beer Bert offers him, the way he turns down " +
    "everything.");
  _say("Then he puts a folded slip of paper on the bar, and does not push it " +
    "across.");
  _tanFavourPrompt();
}

function _tanFavourPrompt() {
  _say("\"A name. Put it on your staff list — the papers, the address, the wage " +
    "each month. She will not work a shift; you do not need to meet her. I pay " +
    "the wage, you pay nothing.\" A small, apologetic tilt of the head, as " +
    "though the imposition were the paperwork. \"She needs to be employed by " +
    "somebody real. That is all.\"", "alert");
  _say("(YES · NO · ASK what it's for)", "dim");
}

// He answers straight, because he always has. It doesn't make it smaller.
function _tanFavourAsk() {
  _say("\"Of course. You should ask.\" He does not hesitate, and he does not " +
    "look around the room first, which is somehow worse than if he had.");
  _say("\"She is Lao. Came over at Nong Khai when she was nineteen, and her " +
    "permit is with a company in Bangkok that does not exist any more.\" He says " +
    "it the way you would read out a bus timetable. \"So on paper she is " +
    "nothing. A person who is nothing on paper cannot open a bank account, " +
    "cannot rent, cannot be sick in a hospital that asks questions — and if the " +
    "wrong policeman is bored on the wrong day, she is at the border by " +
    "Friday.\" A shrug. \"She is somebody's daughter. Not mine. It does not " +
    "matter whose.\"");
  _say("\"Nothing happens in your bar. Nobody comes. In one year a man from " +
    "the labour office looks at a list and sees a name on it, and that is the " +
    "whole of it, my friend.\" He waits. \"And if you say no, that is also the " +
    "whole of it.\"");
  _tanFavourPrompt();
}

function _tanFavourYes() {
  G.pendingChoice = null;
  _setFlag("tanFavourDone");
  _align("syndicate", 2);
  _say("You take the slip. Tan does not thank you extravagantly — a nod, the " +
    "way you would nod at a man who held a door — and that restraint is the " +
    "most eloquent thing about him.", "win");
  _say("\"Good. Bert will put her on the book Monday.\" He is already half " +
    "turned toward the door and whatever is next. Then, without any change in " +
    "tone: \"And if anyone from the land office comes to the bar, or anyone " +
    "asking who owns what — you do not answer, you call me. Any hour. This is " +
    "not a worry, my friend. This is only how it works.\"");
  _say("Nothing bad happens. Nothing bad happens all week, or the week after. " +
    "The name sits on the staff list in Bert's neat capitals between two girls " +
    "who actually exist, and the wage goes out and comes back, and the bar is " +
    "busy on Tuesdays.");
  _say("(★ You are inside somebody's web of favours now. It cost you nothing, " +
    "which is the part to think about.)", "dim");
  _addHappy(2);
}

function _tanFavourNo() {
  G.pendingChoice = null;
  _setFlag("tanFavourRefused");
  // no _align: declining is free, always. The cost here is one sentence.
  _say("\"No,\" you say. \"I'm sorry.\"");
  _say("There is no pause at all — no flicker, no cooling. He picks the slip " +
    "back up and it is gone into a pocket before you have finished the " +
    "apology.", "alert");
  _say("\"Of course. Do not be sorry.\" And he means that too; that is the " +
    "maddening thing. \"It is your bar.\"");
  _say("He shakes your hand, tells Bert the table is looking well, and is out " +
    "the door and into the grey sedan inside a minute. He texts you two days " +
    "later about nothing in particular, exactly as he always has.");
  _say("It is a while before it occurs to you that the bar is fifty-one percent " +
    "his, and that he could simply have written the name on the list himself, " +
    "and that he came in and asked instead.", "dim");
}

// ── Working your own bar: the presence dilemma ───────────────────────────────
// The one decision the expat stage is actually about. WORK commits your evening
// to your own rail: the takings come in properly, the staff steady, and you get
// the quiet satisfaction of a good night's trade. What it costs is the night —
// no encounters, no new faces, no soi. Go out instead and the bar runs on Bert,
// who is very good and is not the owner.
//
// Deliberately NOT a passive location check. The player could always have stood
// in their own bar; making it a declared shift is what turns standing about into
// a choice, gives it a cost, and lets the prose acknowledge it.
const _WORK_SHIFT = [
  "You take the far end of the rail, where you can see the door and the till at " +
    "the same time, and you do not sit down again for five hours.",
  "Bert hands you a cloth without being asked, which is either respect or a " +
    "test, and by eleven you have stopped wondering which.",
  "You work the room the way you used to work a bar as a customer, except that " +
    "now every conversation has a second job, and you are surprised how little " +
    "you mind.",
  "Nothing goes wrong. That is what a good night is: a long list of things that " +
    "did not go wrong, and nobody but you will ever know the list existed.",
  "There is an hour, somewhere around ten, where the room finds its own tempo and " +
    "you stop steering it and just keep it topped up. You have read about this in " +
    "other men's words about other trades. It is better than they made it sound.",
  "You get the round-timing right for once — in before the lull instead of after " +
    "it — and you feel it land like a snooker player feels a long pot drop, a small " +
    "private competence nobody at the rail will ever notice you having.",
  "Your feet go first, then your lower back, then a kind of second wind that Bert " +
    "clearly recognises, because he sets a water in front of you without a word and " +
    "does not smirk, quite.",
  "At close you cash out with Bert, and the two of you stand in the quiet afterward " +
    "not saying much, the way people do who have got a room through a night together. " +
    "It is the most companionable silence you have had in a long time.",
];
const _WORK_SEEN = [
  "A regular you have never spoken to asks whether you're the new owner, is told " +
    "yes, and buys a round for the rail on the strength of it.",
  "One of the girls corrects your Thai in front of a customer, delightedly, and " +
    "the customer tips her for it.",
  "The pool table has a bad cushion. You learn this from a man who has been " +
    "complaining about it for two years to somebody who could never fix it.",
  "Two of the girls have a system for the ice that nobody explained to you, and " +
    "it is better than yours would have been.",
  "A punter tries a story on you that Bert has clearly heard forty times, and you " +
    "watch Bert not react from the other end of the bar, and you learn more about " +
    "running a bar in that one held silence than in a week of standing behind it.",
  "The cashier flags a note to the light, decides against it, and slides it back " +
    "with an apology so gracious the man never once feels accused. You could not " +
    "have done that. You make a point of learning how she did.",
  "One of the older girls sits a lonely regular somewhere he can see the football " +
    "without having to talk, and checks on him twice, and it is not on any rota. " +
    "That is your bar being good at the thing your bar is for, with no help from you.",
  "A group comes in loud and wrong and somehow leaves an hour later as regulars, " +
    "and when you trace back how, it was three small things the mamasan did and one " +
    "she stopped you doing.",
];
// what you gave up
// ten nights straight behind your own rail. The bar is doing well.
const _WORK_GRIND = [
  "You moved to this town for the nights. You have now spent ten of them in a " +
    "row on the working side of the same four metres of teak.",
  "A customer asks how long you've been out here and you have to think about " +
    "it, and the number that comes back is not the number you'd have given a " +
    "month ago, because a month ago you were still going out in it.",
  "The soi is forty seconds from this door. You know exactly what it sounds " +
    "like tonight, and you have known for ten nights, and you have not been in " +
    "it once.",
  "Bert says you look tired. Bert, who has done this for eleven years and looks " +
    "like a man who sleeps beautifully, says you look tired.",
];
const _WORK_MISSED = [
  "Somewhere out there the soi is doing what it does without you, which is the " +
    "arrangement you signed up for and still feels like a window you walked past.",
  "Your phone buzzes twice. You look at it at two in the morning, both times too " +
    "late to matter.",
  "A song you associate with a particular night comes on, and you are behind a " +
    "bar for it, which is not the same as being in front of one.",
  "A crowd goes past the front on their way somewhere louder, mid-laugh, mid-plan, " +
    "and for a second you are one of them and then you are the man wiping the bar " +
    "they walked past.",
  "You catch the far-off thump of a bass line that isn't your bar's, and your feet " +
    "know the walk to it, and your feet are staying exactly where they are.",
  "Somebody you'd have liked to run into is in town — you know because she posts a " +
    "photo from a bar you know, three sois away — and you double-tap it from behind " +
    "your own till and get back to the round.",
  "The last bus goes past empty at gone two, the one you used to sweat catching, " +
    "and you watch it go with the mild detachment of a man who now has somewhere he " +
    "has to be until dawn regardless.",
];

function _canWork() { return _barOwned() && G.room === "stinky_bar"; }
// Standing in the bar you OWN. The punter-flattery channels (a girl offering to
// barfine herself out of your OWN till, the newbie "buy a lady a drink for her
// number" nudge, the manager's welcome shot) have no business firing here — your
// staff don't work you like a walk-in (Keith, 2026-08-26).
function _atOwnBar() { return _barOwned() && G.bar && G.room === G.bar.room; }

// One roll per shift over WORK_NIGHTS (world.js). Most nights return nothing,
// which is deliberate: the great night and the bad night only mean something
// against a run of ordinary ones. Note `weightFn` — police attention scales
// with how far outside the arrangement you've stayed, and is gated off
// entirely once you're properly inside it. That is what being inside IS, and
// it's the first place faction standing changes a night rather than a label.
const WORK_EVENT_ODDS = 0.42;   // the rest of the time, nothing worth reporting

function _workNight() {
  if (_rand() > WORK_EVENT_ODDS) return null;
  const pool = WORK_NIGHTS.filter(e => !e.when || e.when(G));
  const weights = pool.map(e => e.weightFn ? e.weightFn(G) : e.weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const draw = () => {
    let roll = _rand() * total, p = pool[0];
    for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) { p = pool[i]; break; } }
    return p;
  };
  let pick = draw();
  // not the same event two nights running (Keith, 2026-08-26: the two-week
  // millionaires rang the bell verbatim on consecutive nights). One reroll.
  if (pick.id === (G.bar && G.bar.lastWorkEvt) && pool.length > 1) pick = draw();
  if (G.bar) G.bar.lastWorkEvt = pick.id;
  _say(pick.text, (pick.happy || 0) < 0 ? "alert" : "win");
  if (pick.money) {
    G.bar.cash += pick.money;
    // …and remember it, so the night's own summary can account for it. Work
    // events landed straight in the till and never entered the `take` the settle
    // line prints, so three nights in twelve the books did not add up — the
    // event announces itself in the moment, but the settle line is the only
    // summary a player reads the next afternoon (publican playtest 2026-08-23).
    G.bar.eventCash = (G.bar.eventCash || 0) + pick.money;
    _say(_fmt(pick.money > 0 ? "(฿{amt} on the night, over the ordinary take.)"
      : "(฿{amt} out of the till.)", { amt: Math.abs(pick.money) }), "dim");
  }
  // a genuinely good night behind your own bar counts, and counts honestly —
  // it does NOT go through the treadmill, because it isn't a conquest.
  if (pick.happy) _addHappy(pick.happy);
  (G.bar.seen = G.bar.seen || {})[pick.id] = (G.bar.seen[pick.id] || 0) + 1;
  return pick;
}

// Your own bar never said it was yours. WORK and BOOKS lived in the parser and
// nowhere else — not in HELP either, as a publican playtest found the next day
// (2026-08-23) by grepping the whole HELP output as an owner and finding none of
// WORK / MIND / BOOKS / TAKINGS. HELP carries them now; this is the surface in
// the room where they apply — a three-surfaces
// violation that hid the expat stage's central decision from anyone who hadn't
// read HELP, and hid it from every automated instrument too: the soak's hint
// channel replays the CAPS commands a room prints, so a room that printed none
// could never be worked (docs/testing-gap-analysis.md). Once a night, on
// arrival at your own bar, before the shift is declared.
const _BAR_OWNER_NUDGE = [
  "The stools are yours, the till is yours, and so is the decision: stand behind it tonight, or go out and have the night you moved here for. (WORK · BOOKS · DRAW <amount>)",
  "Bert has it in hand, which is exactly the problem — he always has it in hand, and the takings say so. (WORK the rail tonight · BOOKS for the damage.)",
  "Your name isn't over the door — the old man's still is — but the float in that drawer is yours to grow or not. (WORK · BOOKS)",
  "Nobody needs you here. That is the whole trouble with owning it: turning up has to be a choice you make. (WORK · BOOKS)",
];
function _barOwnerNudge() {
  if (!_barOwned() || G.room !== "stinky_bar") return;
  if (G.bar.workedDay === G.day) return;          // already on tonight
  if (G.bar.nudgeDay === G.day) return;           // once a night
  G.bar.nudgeDay = G.day;
  _say(_pickVary(_BAR_OWNER_NUDGE, "barowner"), "dim");
}

function _doWork() {
  if (!_barOwned()) {
    _say(_flag("barSold")
      ? "You're retired, in the specific and enviable sense. If your hands miss the " +
        "rail, there's a noodle counter in Prachuap that could use them mornings."
      : _flag("barLost")
      ? "Not any more. You can stand at that rail as long as you like; you " +
        "just have to buy the drinks like everybody else."
      : _flag("barPartner")
      ? "Not yet. Until the deposit's paid it's still somebody else's rail."
      : "You don't own a bar. Standing behind somebody else's is a different job, " +
        "and they have people for it.");
    return;
  }
  if (G.room !== "stinky_bar") {
    _say(_fmt("Your bar is the Stinky Pinky, and you are not in it. Bert is " +
      "managing beautifully, which is the problem.", {}));
    return;
  }
  if (G.bar.workedDay === G.day) {
    _say("You're already on. Bert has stopped offering you a stool.");
    return;
  }
  G.bar.workedDay = G.day;
  // Set the settle-time flag HERE, when the shift is actually declared, rather
  // than deriving it at settle from `workedDay === G.day`: _barSettle runs from
  // _endNight AFTER G.day++, so that comparison was always false and the entire
  // presence dilemma was silently inert — takings never used WORK_TAKINGS,
  // BAR_PRESENT never landed, `away` never reset and the grind streak could
  // never build (actuary playtest 2026-08-23: 65 nights of ownership, every one
  // settled as "Bert ran it", including nights spent wholly behind the bar).
  // _barNight consumes and clears it, so it cannot leak into a later night.
  G.bar.workedLast = true;
  G.bar.awayTurns = 0;               // the presence clock starts now (_workPresenceTick)
  G.bar.stoodTurns = 0;
  G.bar.floorN = 0; G.bar.floorTurn = -99;   // …and the floor's moments start with it
  G.bar.workedTurn = G.turns;        // the call needs the room to settle first
  G.bar.worked = (G.bar.worked || 0) + 1;
  G.bar.away = 0;
  _say(_pickVary(_WORK_SHIFT, "workshift"), "win");
  _say(_pickVary(_WORK_SEEN, "workseen"));
  _say(_pickVary(_WORK_MISSED, "workmissed"), "dim");
  _say("(You're working tonight. The takings will show it — and so will the " +
    "night you didn't have. TIME to check the hour, BOOKS for the damage.)", "dim");
  const streak = (G.bar.streak = (G.bar.streak || 0) + 1);
  // What you get out of a shift is WHAT HAPPENED, not the fact of working. Most
  // nights that's nothing — and the nothing is what makes the other two land.
  _workNight();
  // …and a man who works every night in Pattaya has quietly stopped living in
  // Pattaya, however good the takings are.
  if (streak >= 10) {
    _say(_pickVary(_WORK_GRIND, "workgrind"), "alert");
    _addHappy(-1);
  }
}

// A declared shift has to be STOOD. WORK set the flag, fired the night's whole
// event roll on the spot and returned control, so the trade the entire expat
// stage is built on cost one turn: declare, then walk to the Queen Vic and drink
// through the night, and it still settled as worked at the full multiplier
// (insider playtest 2026-08-23 — landing straight on top of the settle-time fix
// from the day before: the flag works, nothing checked you were still there).
// A publican can nip out; he cannot spend the evening somewhere else. Cumulative,
// because three trips out is not minding a bar either.
const WORK_AWAY_BUDGET = 15;   // turns off your own floor before the shift lapses
// …and a floor at the NEAR end: declare, walk home, sleep — ninety seconds on
// the premises settled at the full worked multiplier (Keith, round 40). A shift
// is at least two hours stood; short of that the night is Bert's.
const WORK_MIN_STOOD = 20;
function _workPresenceTick() {
  const b = G.bar;
  if (!_barOwned() || !b || b.workedDay !== G.day || !b.workedLast) return;
  if (G.room === "stinky_bar") { b.stoodTurns = (b.stoodTurns || 0) + 1; return; }
  b.awayTurns = (b.awayTurns || 0) + 1;
  if (b.awayTurns === Math.floor(WORK_AWAY_BUDGET / 2)) {
    _say("(Your bar is open, your name is on the shift, and you are not in it. " +
      "Bert can hold a room for an hour. He has been holding it for one.)", "dim");
    return;
  }
  if (b.awayTurns >= WORK_AWAY_BUDGET) {
    b.workedLast = false;                 // the takings will read as Bert's, because they were
    b.workedDay = -1;                     // …and the night can't be re-declared
    // Counted, because "declared but never settled as worked" is BOTH the correct
    // outcome here and the exact shape of the round-13 bug (where the settle
    // silently never saw the shift at all). Without this the liveness ledger
    // cannot tell an abandoned shift from a broken one — it asserted equality and
    // went green only while no walk happened to wander off. See soak.test.js.
    b.lapses = (b.lapses || 0) + 1;
    _say(_pickVary([
      "Somewhere behind you the evening stopped being a shift and became a night out. Bert has the rail, Bert has had it for hours, and the takings will say so.",
      "You meant to look in. You did not look in. Whatever the Stinky Pinky did tonight, it did without you — and the books only ever record which of those it was.",
      "The shift is over in the only way a shift can be over when nobody was standing it: quietly, and in Bert's favour.",
    ], "worklapse"), "alert");
  }
}

// ── The floor, and what a night behind it is actually for ────────────────────
// The presence dilemma was built as takings-versus-everything-good, which made
// WORK the dutiful option by construction: money is instrumental (it services a
// debt so you can keep the bar so you can work more), and สนุก, encounters and
// the girls were all on the other side of the trade. Loss-aversion carried it,
// and loss-aversion works exactly once — a second-run player just executes the
// drill.
//
// The fix is not more vignettes, it is the framing. You EMPLOY these women. A
// publican knows his own staff better than anyone else on the soi knows them,
// because he is there every night and so are they. So a stood shift is now the
// most reliable place in the game to build bond — earned by presence, never
// bought, which is why it goes through _addBond and not _boughtBond and why the
// lady-drink taper has nothing to say about it.
//
// The trade the stage is about therefore becomes FOUR PEOPLE DEEPLY versus the
// whole soi shallowly, which is a real choice, matches the depth-beats-breadth
// doctrine already in _conquestHappy, and gives a repeat player a reason to buy
// the bar that a particular girl works at.
const WORK_FLOOR_GAP = 12;   // turns between floor moments
const WORK_FLOOR_MAX = 3;    // …and how many a night can hold

// Whoever is on YOUR floor tonight — role-carrying staff at the owned bar, in a
// stable order. Derived from _npcRoom so it survives NPC movement, and from
// NPC_ROLES so a manager (hired help, not staff-you-court) is correctly absent.
function _barStaff() {
  const room = (G.bar && G.bar.room) || "stinky_bar";
  return Object.keys(NPCS)
    .filter(id => _npcRoom(id) === room && NPC_ROLES[id] && !NPCS[id].manager && _npcActive(id))
    .sort();
}

// Working alongside somebody is not flirting with them, and the prose has to
// know the difference: these are competence moments, not courtship. The bond
// they build is the kind you cannot buy a round of drinks to get.
const _FLOOR_HOSTESS = [
  "{who} shows you where the good ice is kept, which is not where the ice is kept. It is a small thing to be trusted with and she does not make a speech about it.",
  "A punter asks {who} something in the doorway and she answers him without turning round, because she is watching your hands on the optic and has decided they are wrong. When he has gone she fixes them, once, and does not mention it again.",
  "Between customers {who} teaches you the two words for the ice bucket and laughs at your first attempt in a way that is entirely kind and entirely unrestrained.",
  "{who} has done this for six years and you have done it about five minutes by comparison, and somewhere in the middle of a busy hour that stops being embarrassing and starts being useful.",
  "You catch {who} watching the door the way you have started watching it. She catches you catching her, and something passes between you that is nothing at all to do with drinks.",
  "{who} eats her rice standing up, out of the way of the till, the way people do when the room is theirs. She holds the box out. You take some. It is very good and much too spicy and she enjoys that enormously.",
  "{who} has a whole language of glances with the girl at the far end that you are only now learning to read — a lift of the chin that empties an ashtray, a look that fetches a fresh bucket before you knew you were low. She is running half the room without a word and letting you think you noticed.",
  "The optic sticks. {who} hits it in one exact place with the heel of her hand and it pours clean, then shows you the place, then makes you do it, and does not let you off until you can do it without looking.",
];
const _FLOOR_MAMA = [
  "{who} tells you which of tonight's punters not to serve a fourth to, and is right, and does not say so afterwards.",
  "\"That one.\" {who} does not point. \"He has been three times this week and he has not spent one baht more than the beer. He is lonely, not cheap. Different price.\" It is the most useful sentence anyone has said to you about your own trade.",
  "{who} rearranges two stools by about a foot each and the whole rail sits differently for the rest of the night. You ask her how she knew. She looks at you as if you had asked how she knew it was dark.",
  "A tour group put their heads in, decide against it, and move on. {who} watches them go without regret. \"Good,\" she says. \"They drink one, they take photograph, they make the girls tired.\"",
  "One of the girls has come in with a face on her, quiet, wrong. {who} moves her off the front and onto the till section without a word to anyone, and by the second hour the girl is laughing again. You never learn what it was. That is also the job.",
  "A man three drinks in starts to get loud with a girl who does not want it. {who} is between them before you have set your glass down — not fast, not a scene, just suddenly there with a smile like a closed door — and he is outside and pointed at the taxis and does not quite know how.",
  "\"Tonight, slow. Tomorrow, football — you order more Chang, more ice, put two more girl on.\" {who} says the week the way you would read a tide table. She has never been wrong about a Tuesday in her life.",
];
const _FLOOR_CASHIER = [
  "{who} counts the float in front of you, twice, slowly, in a way that is unmistakably a lesson and unmistakably not an accusation.",
  "{who} finds ฿40 you had already written off, three hours after you wrote it off, and puts it in front of you without comment.",
  "You get the change wrong and {who} corrects it before the customer notices, and the customer never does notice, and that is the whole of her job described.",
  "{who} keeps the book in a hand so small and so exact that you can read a whole night off one page. She turns it round so you can.",
  "A note comes over the bar and {who} holds it up to the light for half a second before it goes in the drawer, the way you hold up every note now, because she does, because there are two floating on the soi this week and she has already seen one.",
  "A big farang tries to pay a ฿180 tab with a fistful of ten-baht coins, half a joke and half a test. {who} counts it in front of him faster than he can follow, gets to the number, and thanks him so sincerely that the joke dies of embarrassment.",
  "At close {who} squares the drawer to the baht, writes the figure, and turns the book to you — and the night you were down, she does not soften it or explain it. She just shows you. A till that lies to the owner is no use to anybody, and she has decided you are the kind who can read a bad night straight.",
];

function _floorPool(id) {
  const role = NPC_ROLES[id];
  return role === "mamasan" ? _FLOOR_MAMA
    : role === "cashier" ? _FLOOR_CASHIER
    : _FLOOR_HOSTESS;
}

// One moment at a time, spaced out, and always to the person you know LEAST —
// so a long run of shifts spreads across the floor instead of pouring into
// whoever the sort happened to put first.
// Her beats, once it's real: not competence moments any more and not courtship
// either — two people running one room. Dealt first each worked night while the
// affair lives; the ordinary floor rotation continues around her (minus her).
const _AFFAIR_FLOOR = [
  "{who} calls a drinks order down the bar in Thai, then repeats the one word of it you didn't catch, quietly, just for you — the town's whole language problem solved one glass at a time.",
  "A punter gets long-winded with {who} and she flags you with the corner of one eyebrow — not a rescue, a review — and handles him herself before you're halfway down the rail, and grins at you for coming anyway.",
  "In the dead half-hour {who} does the stock count with you, her calling, you chalking, a two-person rhythm the bar never taught either of you. The mamasan watches from the till and permits it.",
  "{who} banks her tips in the shared tin behind the optics now — never asked, never announced. You noticed the first night. She knows you noticed. Neither of you has said a word about it, because some ledgers are better unspoken.",
  "Close of night, {who} perches on the customer side while you wipe down, telling you which punters are decent and which merely spend — an intelligence briefing no owner ever buys at any price, given free, nightly, to exactly one man in town.",
  "You watch {who} rescue a shy first-timer from his own silence, set him up with a game of Connect 4 and a girl who'll be kind, and realise she is better at your job than you are, and find you don't mind at all.",
];
function _workFloor() {
  if (!_workedTonight() || G.room !== ((G.bar && G.bar.room) || "stinky_bar")) return;
  const b = G.bar;
  if ((b.floorN || 0) >= WORK_FLOOR_MAX) return;
  if (G.turns - (b.floorTurn || -99) < WORK_FLOOR_GAP) return;
  // the affair rewires the floor: her beat leads each worked night, and once the
  // room has turned (floorSour ≥ 3) the OTHERS' moments stop — the depth you
  // chose, priced in the breadth you lost. The one-time line is in _affairWarn.
  const afId = (typeof _affairLive === "function" && _affairLive()) ? G.affair.id : null;
  if (afId && b.floorDay !== G.day && _npcActive(afId)) {
    b.floorDay = G.day;
    b.floorTurn = G.turns; b.floorN = (b.floorN || 0) + 1;
    // her beats are REVEALS like everyone's — in order, no retell until the pool
    // is dry (the shared-tin moment retold identically on three nights under a
    // bare _pickVary; Frank, 2026-08-26 — the exact class floorSaid exists for)
    const asaid = (b.floorSaid = b.floorSaid || {});
    const aheard = asaid[afId + ":us"] = asaid[afId + ":us"] || [];
    let apool = _AFFAIR_FLOOR.map((_, i) => i).filter(i => !aheard.includes(i));
    if (!apool.length) { aheard.length = 0; apool = _AFFAIR_FLOOR.map((_, i) => i); }
    aheard.push(apool[0]);
    _say(_fmt(_AFFAIR_FLOOR[apool[0]], { who: _npcLabel(afId) }));
    return;
  }
  if (afId && (G.affair.floorSour || 0) >= 3) {
    // The closed floor was a silent ABSENCE of moments, and absence is invisible
    // — the arc's biggest announced cost read as words only (Frank, 2026-08-26).
    // One visible closed-register beat a night: the same women, working
    // perfectly, telling you nothing.
    if (b.closedDay !== G.day) {
      b.closedDay = G.day;
      b.floorTurn = G.turns;
      _say(_pickVary([
        "The cashier squares the float with her back half-turned, finishes, and files the book without turning it round for you. She used to turn it round.",
        "Two of the girls are laughing at something down the far end and it stops — not guiltily, just efficiently — when you drift within earshot. The service tonight is perfect. That's how you can tell.",
        "The mamasan tells you the night is 'fine, boss', which is true, and complete, and the end of the sentence. There was a time she'd have told you which punter to watch. You chose who you chose.",
        "A drink order goes wrong and gets fixed before you see it — you only catch the after-ripple, the glance that checks whether you noticed. The floor covers for itself now. You are somebody it covers FROM.",
      ], "floorclosed"), "dim");
    }
    return;
  }
  let staff = _barStaff();
  if (afId) staff = staff.filter(id => id !== afId);
  if (!staff.length) return;
  const seen = (b.floorSeen = b.floorSeen || []);
  let pool = staff.filter(id => !seen.includes(id));
  if (!pool.length) { seen.length = 0; pool = staff; }
  pool.sort((a, c) => ((G.soc.drinks[a] || 0) - (G.soc.drinks[c] || 0)));
  const id = pool[0];
  seen.push(id);
  b.floorTurn = G.turns;
  b.floorN = (b.floorN || 0) + 1;
  const linePool = _floorPool(id);
  const said = (b.floorSaid = b.floorSaid || {});
  const heard = said[id] = said[id] || [];
  let idxPool = linePool.map((_, i) => i).filter(i => !heard.includes(i));
  if (!idxPool.length) { heard.length = 0; idxPool = linePool.map((_, i) => i); } // exhausted: start over
  const pick = idxPool[0];   // her reveals in order — each shift a new one, no repeat until the pool's dry
  heard.push(pick);
  _say(_fmt(linePool[pick], { who: _npcLabel(id) }));
  _addBond(id, 1);
}

// ── The shift calls: a night you play, not a wager you watch ────────────────
// One a night, dealt on the tick while you are actually standing your own rail,
// resolved through the standard pendingChoice modal (doCommand intercept +
// _renderResume + _chipSet + engineComplete + a shared prompt helper). Nothing
// here is obviously correct, which is the point: each one trades money against
// people, and the stage is about which of those you are actually here for.
const SHIFT_TAB_TAKE   = 1200;   // what a tab is worth to a night
const SHIFT_TAB_STIFF  = 0.35;   // …and how often it never comes back
const SHIFT_EARLY_COST = 600;    // a floor one short
const SHIFT_ROUND_COST = 500;    // what getting them in costs the till
const SHIFT_ROUND_TAKE = 900;    // …and what the room does about it
const SHIFT_FLAT_LOSS  = 400;    // a night nobody lifted

function _shiftCallById(id) { return SHIFT_CALLS.find(c => c.id === id) || null; }

// The one call that needs a person attached picks her at ask time, so the prose
// and the bond land on the same woman — and the SAME woman every time, because
// the ask carries a biography (a boy at her sister's). The son is a canon claim,
// not reusable filler: it fired for Manow for weeks and then verbatim for the
// CASHIER the night after Manow left (Frank, 2026-08-26 — the exact prose-claim
// defect class this repo lints for). One stable hash-picked hostess per bar owns
// the boy; if she's off the floor, the call simply isn't dealt tonight.
function _earlyGirl() {
  const room = (G.bar && G.bar.room) || "stinky_bar";
  const hers = Object.keys(NPCS)
    .filter(id => _npcRoom(id) === room && NPC_ROLES[id] === "hostess")
    .sort((a, b) => _hh(a + ":boy", 13) - _hh(b + ":boy", 13));
  const her = hers[0];
  return her && _npcActive(her) && _barStaff().includes(her) ? her : null;
}
function _shiftEligible() {
  return SHIFT_CALLS.filter(c => c.id !== "early" || !!_earlyGirl());
}

function _shiftDue() {
  const b = G.bar;
  return _workedTonight() && G.room === ((b && b.room) || "stinky_bar") &&
    !b.shiftAsked && G.nightTurn >= 18 &&
    G.turns - (b.workedTurn || 0) >= 6 &&   // let the room settle before it asks you something
    !G.pendingChoice && !G.pendingEnc && !G.game;
}

function _shiftAsk() {
  const b = G.bar;
  const pool = _shiftEligible();
  if (!pool.length) return;
  // Day-stable, and a pure hash rather than _rand() — reading a reload must not
  // reroll which call the night dealt you (same rule as _quizBars).
  const h = (G.vacation * 7919 + G.day * 104729 + 4177) >>> 0;
  const call = pool[h % pool.length];
  b.shiftAsked = true;
  G.shiftCall = call.id;
  G.shiftWho = null;
  if (call.id === "early") {
    G.shiftWho = _earlyGirl();   // the boy has ONE mother — see _earlyGirl
    if (!G.shiftWho) { G.pendingChoice = null; return; }
  }
  const who = G.shiftWho ? _npcLabel(G.shiftWho) : "";
  // lead/ask may be a POOL (array) — the flagship publican beats retold verbatim
  // same girl, same speech, across nights (Keith, 2026-08-26). Pick per call id.
  const pick = (f, k) => _fmt(Array.isArray(f) ? _pickVary(f, "shift:" + call.id + ":" + k) : f, { who });
  _say("");
  _say(pick(call.lead, "lead"), "alert");
  _say(pick(call.ask, "ask"));
  _shiftPrompt();
  G.pendingChoice = "shift";
}

// ── The 51% fork: sound them out, then COMMIT on purpose ─────────────────────
// The stage's flagship decision. Asking Candy/Tan about the partnership PITCHES
// them (their dialogue node, which arms this) — the commit is a separate YES, so
// you can hear both before you choose, and can't stumble into a partner by
// ask-ordering (publican playtest 2026-08-26).
function _partnerPrompt() {
  const who = G.partnerWho;
  _say(_fmt(who === "tan"
    ? "(Hand Tan 51% of your bar? He asks nothing, takes nothing \u2014 which is its own kind of price. YES \u00b7 NO \u2014 think on it.)"
    : "(Make Candy your 51%? Slow, lawyered, everything on paper. YES \u00b7 NO \u2014 think on it.)", {}), "dim");
}
function _partnerYes() {
  const who = G.partnerWho;
  G.pendingChoice = null; G.partnerWho = null;
  if (_flag("barPartner")) return;   // already settled (belt-and-braces)
  _setFlag("barPartner");
  if (who === "tan") {
    _setFlag("partnerTan");
    _align("indie", 1); _align("wdg", -1); _align("syndicate", 1);
    _say("\"Good.\" It is done by Tuesday, the way he said. It costs you nothing at " +
      "all \u2014 no lawyer, no signature you kept a copy of, no figure anywhere. " +
      "Just a land office that turned out to be his wife's cousin, and a lunch " +
      "afterward that he paid for. You own a bar now. You also, somewhere with no " +
      "paper on it, owe a man a thing he has not yet named.", "win");
  } else {
    _setFlag("partnerCandy");
    _align("indie", 2); _align("wdg", -2);
    _say("\"Then we do it right.\" The Bangkok lawyer takes his time and a stack " +
      "of paper you actually read, and at the end of it Candy's name is on 51% of " +
      "your bar and yours is on the rest, and every way it could go wrong is " +
      "written down and signed. It is not romantic. It is the safest thing you " +
      "have done since you got off the plane, and you both know it.", "win");
  }
  if (typeof _questTick === "function") _questTick();  // the fork completes the barPartner quest now
}
function _partnerNo() {
  const who = G.partnerWho;
  G.pendingChoice = null; G.partnerWho = null;
  _say(who === "tan"
    ? "\"Of course.\" Tan is already reaching for the sedan door, entirely unbothered. " +
      "\"It is a big thing. You think. The offer does not go anywhere \u2014 I do not " +
      "change my mind, and neither, I think, do you.\" The offer stands; so does the " +
      "other one."
    : "Candy nods, unsurprised and unhurt. \"Good. You should think. A man who says " +
      "yes to fifty-one percent in one night is not a man I want holding forty-nine.\" " +
      "The offer stands \u2014 hers, and the other one too, whenever you know your own mind.");
}

function _shiftPrompt() {
  const call = _shiftCallById(G.shiftCall);
  _say(_fmt("(YES \u2014 {label} \u00b7 NO)",
    { label: call ? call.yesLabel : "your call" }), "dim");
}

// takings the shift itself moved, added to the night at settle
function _shiftTake(n) {
  const b = G.bar;
  b.eventCash = (b.eventCash || 0) + n;
  if (n) b.cash += n;
}

function _shiftClear() { G.pendingChoice = null; G.shiftCall = null; G.shiftWho = null; }

function _shiftYes() {
  const call = _shiftCallById(G.shiftCall);
  const who = G.shiftWho;
  if (!call) { _shiftClear(); return; }
  _say(_fmt(call.yes, { who: who ? _npcLabel(who) : "" }), "win");
  if (call.id === "tab") {
    _shiftTake(SHIFT_TAB_TAKE);
    _repGain();
    if (_rand() < SHIFT_TAB_STIFF) {
      // the docket outlives the man. Not malice — he simply stops coming in,
      // which is how bar debts actually end.
      _shiftTake(-SHIFT_TAB_TAKE);
      G.bar.stiffed = (G.bar.stiffed || 0) + 1;
      _say(_fmt("(The docket is still under the till a week later. He is not " +
        "barred and nobody has said a word about it; he has simply started " +
        "drinking somewhere he doesn't owe \u0e3f{amt}.)", { amt: SHIFT_TAB_TAKE }), "alert");
    } else {
      _say("(He settles on Thursday, in full, and stands you one out of it.)", "dim");
    }
  } else if (call.id === "early") {
    _shiftTake(-SHIFT_EARLY_COST);
    if (who) { _addBond(who, 2); (G.soc.leftEarly = G.soc.leftEarly || {})[who] = G.day; }
  } else if (call.id === "round") {
    // IT IS A GAMBLE, AND IT SAYS SO: "a round on the house here might buy the
    // whole back half of the night — or it does nothing, and you're down the
    // cost of it." It used to be a guaranteed +฿400 against a guaranteed −฿400
    // for declining: an ฿800 swing with one correct answer, which an ex-publican
    // spotted in three reproductions and called "not a decision, a free button"
    // (round 24, Keith). The shift calls are meant to be decisions where none is
    // obviously right.
    //
    // The MONEY is the bet; the GOODWILL is not. You bought the room a drink and
    // the floor watched you do it, so the bond and the สนุก land either way —
    // what you are gambling is whether it turns the night.
    if (_rand() < 0.6) {
      _shiftTake(SHIFT_ROUND_TAKE - SHIFT_ROUND_COST);
      _say("It lands. The rail thickens, somebody puts money in the jukebox, and the " +
        "hour that was going to end the night starts it again instead.", "win");
    } else {
      _shiftTake(-SHIFT_ROUND_COST);
      _say("It does not land. They drink it, they thank you, and they go anyway \u2014 " +
        "some nights are just over and no amount of free Chang argues them out of it.", "dim");
    }
    _addHappy(2);                       // your room, your night — never jading
    _repGain();
    for (const id of _barStaff()) _addBond(id, 1);
  } else if (call.id === "turning") {
    // The one with an actual downside. Most nights a publican's word is enough;
    // occasionally it is not, and you own the bar either way.
    if (_rand() < 0.72) {
      _say("He looks at you, works out in about a second and a half that you are " +
        "the one whose name is over the door, and lets himself be walked to the " +
        "front like it was his idea. Bert says nothing at all, which from Bert is " +
        "a standing ovation.", "win");
      _repGain();
      for (const id of _barStaff()) _addBond(id, 1);
    } else {
      _say("It goes the other way. There is a shove, and a stool, and a very " +
        "short piece of shouting, and then it is over and he is outside and you " +
        "have a forearm you are going to notice tomorrow. The room settles. " +
        "Somebody sweeps up.", "alert");
      G.hurt = (G.hurt || 0) + 1;
      _shiftTake(-SHIFT_FLAT_LOSS);
    }
  }
  _shiftClear();
}

function _shiftNo() {
  const call = _shiftCallById(G.shiftCall);
  const who = G.shiftWho;
  if (!call) { _shiftClear(); return; }
  _say(_fmt(call.no, { who: who ? _npcLabel(who) : "" }));
  if (call.id === "tab") {
    _shiftTake(-SHIFT_FLAT_LOSS);
  } else if (call.id === "early") {
    if (who) _addBond(who, -1);
    // and the rest of the floor watched her ask
    const rest = _barStaff().filter(id => id !== who);
    if (rest.length) _addBond(rest[0], -1);
  } else if (call.id === "round") {
    // …and declining is not a guaranteed loss either. Sometimes the room finds
    // its own second wind, which is exactly why a publican hesitates.
    if (_rand() < 0.65) _shiftTake(-SHIFT_FLAT_LOSS);
    else _say("It picks up on its own, the way it sometimes does, and you saved the " +
      "money. You will never know whether the round would have done better.", "dim");
  } else if (call.id === "turning") {
    const rest = _barStaff();
    if (rest.length) _addBond(rest[0], -1);
    _say("(Nobody says anything. Bert least of all. It is not a thing you did " +
      "wrong \u2014 it is only a thing they saw.)", "dim");
  }
  _shiftClear();
}

// Are you working the rail TONIGHT? True only during the night itself — by the
// time the books settle the day has already rolled, so settle reads the
// `workedLast` snapshot instead (see _endNight and _barNight).
function _workedTonight() { return _barOwned() && G.bar.workedDay === G.day; }

// ── The staff affair ─────────────────────────────────────────────────────────
// Constants + the crisis table in world.js (see the block comment there for the
// design law: structural failure, never a morality tale; two meters, no free
// answers; the good ending is a summit most attempts die on).
// State: G.affair = null | { id, since, strain, floorSour, crisSeen, slipDay,
//   discovered, soured, warned, offeredDay, ended, gone, scarUntil, won }.
function _affairLive() { return !!(G.affair && !G.affair.ended); }
function _affairGirl() { return _affairLive() ? G.affair.id : null; }
function _affairHer() { return G.affair ? _npcLabel(G.affair.id) : ""; }

// The door only appears deep in the relationship layer: her-farang tier with a
// girl who works YOUR floor, during a stood shift, late — she stays after close.
function _affairDue() {
  if (G.affair || (G.affairCool && G.day - G.affairCool < 14)) return null;
  if (!_workedTonight() || G.room !== ((G.bar && G.bar.room) || "stinky_bar")) return null;
  if (G.nightTurn < 55) return null;   // last-call hour — the room thinning out
  const her = _barStaff().filter(id => NPC_ROLES[id] === "hostess" && _bondTier(id) >= AFFAIR_BOND_GATE)
    .sort((a, b) => (G.soc.drinks[b] || 0) - (G.soc.drinks[a] || 0))[0];
  return her || null;
}

function _affairAsk(her) {
  G.affairWho = her;
  G.pendingChoice = "affair";
  _say("");
  _say(_fmt("Last call comes and goes, and {her} doesn't. She squares her section away " +
    "the way she always does, and then — instead of the wai and the wave and the walk to " +
    "the bike — she sits down on the customer side of your own bar, in front of you, and " +
    "puts her chin in her hand.", { her: _npcLabel(her) }), "alert");
  _say("\"Everybody already think it,\" she says, in the voice she doesn't use on the " +
    "floor. \"Mama think it. The girls think it. My mother — \" a small laugh — \"my " +
    "mother PLAN it.\" She turns a beer mat over, once. \"So. I am asking you the thing " +
    "nobody ask out loud. What am I? I work for you, or I am your lady? Because I cannot " +
    "be both good. Nobody can be both.\"");
  _affairPrompt();
}
function _affairPrompt() {
  _say("(STAY — make it real · STEP BACK.)", "dim");
}
function _affairYes() {
  const her = G.affairWho;
  G.pendingChoice = null; G.affairWho = null;
  G.affair = { id: her, since: G.day, strain: 0, floorSour: 0, crisSeen: [], warned: {} };
  _setFlag("affairBegun");
  _say(_fmt("You come round the bar — the wrong side, the customer side, HER side — and " +
    "sit down next to her, and that is the whole of the answer. She looks at you for a " +
    "long moment, checking it, and then the smile arrives: not the rail smile, not the " +
    "lady-drink smile. One you haven't seen before. \"Okay,\" {her} says, like a deal " +
    "closing. \"Okay. But boss —\" the old word, retired in the same breath — \"this town " +
    "eats couples. You know this, na? We do it anyway.\"", { her: _npcLabel(her) }), "win");
  _say("(She's yours now, and the bar knows it by morning. What the bar does with the " +
    "knowing — that's the next two months.)", "dim");
  _addHappy(3);   // the beginning is real — and never through the treadmill
}
function _affairNo() {
  const her = G.affairWho;
  G.pendingChoice = null; G.affairWho = null;
  G.affairCool = G.day;
  _say(_fmt("You say it kindly, and honestly, and it doesn't matter how: the answer is " +
    "the answer. {her} nods — once, businesslike, taking the knock the way she'd take it " +
    "from any customer, which is exactly the wall the two of you just agreed to keep. " +
    "\"Okay. Good night, boss.\" She's gone in two minutes. The floor runs perfectly the " +
    "next night, and the night after, and nothing whatsoever is wrong, in the specific " +
    "way of a thing that has been decided.", { her: _npcLabel(her) }));
}

// ── the crises: one per ~6 days, dealt in authored order, each once ──────────
function _affairCrisisDue() {
  if (!_affairLive() || G.pendingChoice || G.pendingEnc || G.game) return null;
  const a = G.affair;
  if (G.day - a.since <= AFFAIR_HONEYMOON) return null;      // the honeymoon is honest
  if (G.room !== ((G.bar && G.bar.room) || "stinky_bar")) return null;
  if (G.nightTurn < 25) return null;
  if (a.crisDay === G.day) return null;
  if ((G.day - a.since) % 6 !== 3) return null;              // the cadence, day-stable
  const next = AFFAIR_CRISES.find(c => !a.crisSeen.includes(c.id));
  return next || null;
}
function _affairCrisisAsk(c) {
  const a = G.affair;
  a.crisDay = G.day; a.crisSeen.push(c.id);
  G.affairCrisis = c.id;
  G.pendingChoice = "affaircrisis";
  const mama = _barStaff().find(id => NPC_ROLES[id] === "mamasan");
  const ctx = { her: _affairHer(), mama: mama ? _npcLabel(mama) : "The mamasan" };
  _say("");
  _say(_fmt(c.lead, ctx), "alert");
  _say(_fmt(c.ask, ctx));
  _affairCrisisPrompt();
}
function _affairCrisisPrompt() {
  const c = AFFAIR_CRISES.find(x => x.id === G.affairCrisis);
  if (!c) return;
  const opts = [c.a, c.b, c.c].filter(Boolean)
    .map((o, i) => (i + 1) + " — " + o.label.toUpperCase());
  _say("(" + opts.join(" · ") + ".)", "dim");
}
function _affairCrisisAnswer(k) {
  const c = AFFAIR_CRISES.find(x => x.id === G.affairCrisis);
  const a = G.affair;
  if (!c || !a) { G.pendingChoice = null; return; }
  const o = k === "a" ? c.a : k === "b" ? c.b : c.c;
  if (!o) { _affairCrisisPrompt(); return; }
  if (o.money && G.money < o.money) {
    _say(_fmt("(That answer is ฿{n}, and you're carrying ฿{m}. The maths answers before you do — pick again.)",
      { n: o.money, m: G.money }), "dim");
    _affairCrisisPrompt();
    return;
  }
  G.pendingChoice = null; G.affairCrisis = null;
  if (o.money) G.money -= o.money;
  const mama = _barStaff().find(id => NPC_ROLES[id] === "mamasan");
  _say(_fmt(o.text, { her: _affairHer(), mama: mama ? _npcLabel(mama) : "The mamasan" }));
  if (o.strain) a.strain += o.strain;
  if (o.floor) a.floorSour += o.floor;
  _affairWarn();
}

// threshold-crossing lines, once each — the meters made audible without a HUD
function _affairWarn() {
  const a = G.affair; if (!a || a.ended) return;
  if (a.strain >= 9 && !a.warned.s9) { a.warned.s9 = true;
    _say(_fmt("({her} has started sleeping at her cousin's two nights a week. Nobody has said the word for what is happening, which is how it happens.)", { her: _affairHer() }), "alert");
  } else if (a.strain >= 6 && !a.warned.s6) { a.warned.s6 = true;
    _say(_fmt("(Something in the way {her} says goodnight has gone formal. You could fix it tonight. You could also tell yourself it's nothing, which is what most men in this town do at exactly this point.)", { her: _affairHer() }), "alert");
  }
  if (a.floorSour >= 3 && !a.warned.f3) { a.warned.f3 = true;
    _say("(The floor has closed to you. Not rudely — professionally. The girls work, the drinks land, and not one of them tells you anything true any more. You chose her over the room, and the room heard.)", "alert");
  }
  if (a.strain >= AFFAIR_BREAK) _affairEnd("break");
}

// ── the nightly account, from _barSettle ─────────────────────────────────────
function _affairNight(n) {
  const a = G.affair;
  if (!a || a.ended) return;
  const honeymoon = G.day - a.since <= AFFAIR_HONEYMOON;
  if (n.worked) {
    if (honeymoon) {
      _addHappy(1);   // it is simply good, and it never touches the treadmill
      if (!a.warned.h1) { a.warned.h1 = true;
        _say(_fmt("(The best nights the bar has ever had are, not coincidentally, these: {her} on the floor, you behind the rail, and the two of you running one room on shared glances.)", { her: _affairHer() }), "win");
      }
    } else {
      a.strain = Math.max(0, a.strain - AFFAIR_STRAIN_WORK);
    }
  } else if (!honeymoon) {
    a.strain += AFFAIR_STRAIN_AWAY;
    if (_lowSeason()) a.strain += 1;    // the money worry is in the room with you
  }
  // the soi always talks: a conquest since it began WILL reach her
  if (a.slipDay != null && !a.discovered) {
    const forced = G.day - a.slipDay >= 3;
    if (forced || _hh("affdisc:" + G.vacation + ":" + G.day, 89) % 100 < 45) {
      a.discovered = true; a.soured = true; a.strain += 8;
      _say("");
      _say(_fmt("{her} knows. Of course she knows — she works in the industry the news is made of; the girl you were with has a friend who has a cousin on this very soi. She doesn't shout. She takes off the apron, folds it on the rail, and asks you one question in the flat voice: \"Why I stop working, if you don't?\" There is no good answer, and both of you stand there while you don't give it.", { her: _affairHer() }), "alert");
      _say("(Whatever the two of you salvage from here, one thing is gone for good: the version where you leave this town together. She will never again believe the machine doesn't own you too.)", "dim");
    }
  }
  _affairWarn();
  if (!G.affair || G.affair.ended) return;   // the warn may have broken it
  // the door: two months carried lightly, never soured, and a healthy bar to sell
  if (!a.soured && G.day - a.since >= AFFAIR_GOOD_DAYS && a.strain <= AFFAIR_GOOD_STRAIN &&
      G.bar.arrears === 0 && (G.bar.rentShort || 0) === 0 && G.bar.cash >= 0 && n.worked &&
      (!a.offeredDay || G.day - a.offeredDay >= 7)) {
    a.offeredDay = G.day;
    _setFlag("affairOffered");
    _say("");
    _say(_fmt("After close, {her} counts the till with you — she's earned the right and " +
      "the floor knows better than to mind — and somewhere in the counting she says it, " +
      "casually, the way the biggest things get said: \"My auntie shop, in Prachuap. By " +
      "the sea. She old now. Two room on top.\" She squares the notes. \"A bar eats " +
      "nights. A noodle shop eats mornings. I only say.\" She has never once asked you " +
      "for anything, which is how you know what this is.", { her: _affairHer() }), "win");
    _say("(There is exactly one buyer for a going Soi 6 bar and everybody has always " +
      "known who. The note would clear. There would be something left. (SELL UP), if " +
      "you ever mean to — the door doesn't stay open in this town.)", "dim");
  }
}

// ── endings ──────────────────────────────────────────────────────────────────
function _affairEnd(cause) {
  const a = G.affair; if (!a || a.ended) return;
  const her = _affairHer();
  a.ended = true; a.gone = true; a.scarUntil = G.day + AFFAIR_SCAR_DAYS;
  G.pendingChoice = null; G.affairCrisis = null;
  _say("");
  if (cause === "bleed") {
    _say(_fmt("{her} stays for the last week of it — through the tape measure and the " +
      "man with the fridge opinions — because leaving a sinking man is not a thing she " +
      "does. She goes home to Nong Khai the day after the shutters, with her wages paid " +
      "to the baht because you made sure of that one thing. At the bus station she holds " +
      "your face in both hands. \"Not your fault. Not my fault.\" A small, terrible " +
      "shrug. \"Town's fault, na.\" It is the kindest possible version of losing " +
      "everything at once.", { her }), "alert");
  } else {
    _say(_fmt("{her} doesn't make a scene, because she has spent eight years learning " +
      "exactly how not to. There is a bag by the door of the room you half-share, packed " +
      "the calm way, and she waits until you've seen it before she says anything. \"I " +
      "love you same-same,\" she says, and you believe her, which is the worst part. " +
      "\"But in this bar I am not your lady and I am not a hostess. I am a problem " +
      "wearing a nice dress. The girls know it. Mama know it. YOU know it.\" She picks " +
      "up the bag. \"Nobody did bad. The job did bad.\" The door is very quiet behind " +
      "her, and the bar opens on time the next night, and it is never quite your room " +
      "again.", { her }), "alert");
    _addHappy(-6);
  }
  _say("(The floor takes a while to forgive the whole chapter — not her, and not quite " +
    "you either. Takings will say so for a while.)", "dim");
}

// SELL UP — only ever meaningful through the door she opened. Without it, the
// voiced truth: there is one buyer, and walking to them cold means walking away
// with nothing (the seller-financed note owns most of the bar's value).
function _doSellBar() {
  if (!_barOwned()) {
    _say(_flag("barSold")
      ? "Sold, signed, and spent on a life. The Stinky trades on without you, which was the whole idea."
      : "Nothing to sell. Your worldly goods fit in a hotel safe.");
    return;
  }
  if (!_flag("affairOffered")) {
    _say("Sell the Stinky? There's exactly one buyer on this soi and everybody knows " +
      "who — and a man who walks in NEEDING to sell gets the needing-to-sell price: " +
      "the note cleared and a handshake. Bert would say you'd want a reason worth " +
      "more than the bar. You haven't got one. Yet.");
    return;
  }
  G.pendingChoice = "sellbar";
  _sellBarPrompt();
}
function _sellBarPrompt() {
  _say(_fmt("Sell up — the note cleared, ~฿{n} banked, and the rest of it hers and yours? " +
    "This is the door, and it shuts behind you. (YES — sell up · NO — not yet.)",
    { n: AFFAIR_SALE }), "alert");
}
function _sellBarYes() {
  G.pendingChoice = null;
  const her = _affairHer();
  const tan = _flag("partnerTan");
  _setFlag("barSold"); _setFlag("affairWon");
  G.flags.barOpen = false;
  G.bank = (G.bank || 0) + AFFAIR_SALE;
  if (G.affair) { G.affair.ended = true; G.affair.won = true; }
  const id = G.affair && G.affair.id;
  if (id) { G.phone.contacts[id] = true; G.soc.drinks[id] = 20; }
  G.bar = { cash: 0, owed: 0, arrears: 0, months: 0, lastMonthDay: 0, nights: 0,
    best: 0, workedLast: false, rentOwed: 0, rentShort: 0, pocketDrawn: 0 };
  _say("");
  _say(tan
    ? "Tan handles the sale the way he handles everything: one phone call you never " +
      "hear, one meeting you attend but do not speak at, and a number that is exactly " +
      "fair — not a baht of friendship in it either direction, which from him is a kind " +
      "of respect. \"The fifty-one per cent,\" he says at the end, and slides his copy " +
      "across the table to you, torn once, cleanly. \"A man leaving does not owe. This " +
      "is the whole of the rule.\" It is the only gift he has ever given you, and it is " +
      "enormous."
    : "Candy runs the sale like the professional she has spent twenty years becoming: " +
      "the lawyer, the letters, the note settled to the satang, White Dish paying the " +
      "going-concern price because with Candy across the table there is no other price " +
      "available. At the signing she looks at the pair of you over her glasses. \"You " +
      "know how many times I see a man LEAVE this town rich in the right way?\" She " +
      "stamps the page. \"Now is one.\"", "win");
  _say(_fmt("The last morning, the two of you walk down to the water — because it all " +
    "started at a beach, though neither of you says so — and {her} stands with her feet " +
    "in the shallows doing arithmetic out loud: the auntie's shophouse, two rooms on " +
    "top, a noodle pot her mother is already arguing about. Behind you the town is " +
    "sleeping off its own night, the way it always is, the way it will be tonight and " +
    "every night, with somebody else behind the rail and somebody else counting the " +
    "till and somebody else certain he is different.\n\nYou got out with the girl and " +
    "the money and the morning. Nobody does. You did.", { her }), "win");
  _addHappy(12);   // the biggest single happiness in the game, and it never touches the treadmill
  _say("(สบายสบาย has a postcode now. The sandbox is still yours — Pattaya is an hour " +
    "away and old habits keep a room ready — but the machine's claim on you is settled " +
    "in full.)", "dim");
}
function _sellBarNo() {
  G.pendingChoice = null;
  _say("Not yet. The bar opens at six, the way it does. She doesn't mention Prachuap " +
    "again that week — she said it once, which for her was the whole of the asking.");
}

// ── The bar's books ──────────────────────────────────────────────────────────
// The purchase is seller-financed (see the constants in world.js): a deposit
// that empties you, then BAR_MONTHLY to the old man every thirty days for six
// years. That obligation is the engine of the whole expat stage — it's owed
// whether or not it rains, which is what gives low season teeth and what makes
// the procurement decision cost something instead of merely reading well.
//
// Kept deliberately small and legible: nightly take, nightly costs, a monthly
// payment. No staff roster, no stock, no depreciation. The bar's till (G.bar.cash)
// is separate from your pocket so that a good week at the bar and a good week
// for you are different things.

// ── Season (the year's shape) ────────────────────────────────────────────────
// One game month per SEASON_MONTH_DAYS of G.day, anchored on G.season0 — the
// start month the frontend seeds from the real calendar (default November for a
// clockless boot). Everything derives from the day count, so it's deterministic
// and every player reads the same year. See SEASON_MULT in world.js.
function _season0() {
  const m = G.season0;
  return (typeof m === "number" && m >= 0 && m <= 11) ? m : SEASON_DEFAULT_M0;
}
function _seasonMonthOn(day) {   // 0 = Jan … 11 = Dec, for a given G.day value
  return (_season0() + Math.floor((Math.max(1, day) - 1) / SEASON_MONTH_DAYS)) % 12;
}
function _seasonMonth() { return _seasonMonthOn(G.day); }
function _seasonTakingsOn(day) { return SEASON_MULT[_seasonMonthOn(day)]; }
function _seasonTakings() { return _seasonTakingsOn(G.day); }
function _seasonTierOn(day) {
  const m = _seasonMonthOn(day);
  if (m === 11 || m === 0) return "peak";       // Dec–Jan, the winter-holiday boom
  if (m === 10 || m === 1) return "high";       // Nov, Feb — the cool-season shoulders
  if (m >= 2 && m <= 4) return "shoulder";      // Mar–May, hot and thinning (Songkran aside)
  if (m >= 5 && m <= 7) return "low";           // Jun–Aug, the monsoon settles in
  return "deeplow";                             // Sep–Oct, wettest and emptiest
}
function _seasonTier() { return _seasonTierOn(G.day); }
// The lean months — what the old binary _lowSeason() meant, kept for the prose
// and the events that gate on "is the town empty". Now the wet half of the year.
function _lowSeason() { const t = _seasonTier(); return t === "low" || t === "deeplow"; }
// The wet half of the year (SW monsoon). Deterministic — the rain SYSTEM leans on
// this so low season actually feels like low season; the bake still supplies the
// sky (no bake, no rain — the byte-identical rule holds because _wxRainy/_wxStormy
// are both false without a bake, so no dice roll in a bakeless game).
function _wetSeason() { return _lowSeason(); }
const _SEASON_LABEL = {
  peak: "peak season", high: "high season", shoulder: "hot season",
  low: "low season", deeplow: "the deep low season",
};
const _SEASON_MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function _barOwned() { return _flag("barOpen") && !!G.bar; }

// ── The deposit ──────────────────────────────────────────────────────────────
// The one moment in the arc where the money has to actually exist. Fires at
// your own bar once the 51% is settled; until it's paid there is no opening
// night. It clears the way ฿120k actually moves — a TRANSFER from the account
// to the old man's bank, the pocket topping up only what the account can't
// (Mario, 2026-09-04: nobody carries it through the ATM; that version cost
// ฿1,800 in fees and stranded ฿500 below the note size — Keith, round 40). If
// you're short, Bert names the shortfall against everything you have.
function _barDepositDue() {
  return _flag("barPartner") && !_flag("barPaid") && G.room === "stinky_bar";
}

function _barDeposit() {
  const bank = G.bank || 0, have = G.money + bank;
  if (have < BAR_DEPOSIT) {
    if (G.soc.depositNagDay === G.day) return;
    G.soc.depositNagDay = G.day;
    _say(_fmt("Bert has the figure written on the back of a docket. \"Deposit's " +
      "฿{dep}, and the old man carries the rest — ฿{monthly} a month, six " +
      "years. Rent's ฿{rent}, separate, to the fella that owns the building.\" " +
      "He slides it over. \"Straight to his bank, from yours — nobody's counting " +
      "that on a towel. You're ฿{short} short, bud, pocket and account together.\"",
      { dep: BAR_DEPOSIT, monthly: BAR_MONTHLY, rent: _barRent(),
        short: BAR_DEPOSIT - have }), "alert");
    return;
  }
  _setFlag("barPaid");
  // the account first, the pocket for whatever the account can't cover — and the
  // pocket share is the BAR's ledger, not tonight's spending (the morning line)
  const fromBank = Math.min(bank, BAR_DEPOSIT), fromPocket = BAR_DEPOSIT - fromBank;
  G.bank = bank - fromBank;
  G.money -= fromPocket;
  if (fromPocket) G.bar.pocketDrawn = (G.bar.pocketDrawn || 0) + fromPocket;
  G.bar.owed = BAR_PRICE - BAR_DEPOSIT;
  G.bar.lastMonthDay = G.day;
  _say("");
  // "every baht you have" was unconditional — a plain falsehood for a rich player
  // (actuary playtest 2026-08-23: printed while holding ฿2m).
  _say(_fmt(G.money + G.bank > 0
    ? "Bert reads the old man's account number off the docket and you type it into " +
      "the app with the care of a man who has never sent ฿{dep} anywhere. Two " +
      "screens, a thumbprint, and the number on the front of your banking app is " +
      "smaller in a way that does not look like a bar yet.{pocket}"
    : "Bert reads the old man's account number off the docket and you type it into " +
      "the app with the care of a man who has never sent ฿{dep} anywhere. Two " +
      "screens, a thumbprint, and it is every baht you have, gone to Ohio in the " +
      "time it takes the ice to settle.{pocket}",
    { dep: BAR_DEPOSIT,
      pocket: fromPocket ? _fmt(" The account was ฿{p} light of it; the rest goes across the bar in notes, which Bert counts twice without appearing to.", { p: fromPocket }) : "" }), "alert");
  _say(_fmt("\"Right.\" Bert doesn't make a thing of it. \"Rest is ฿{monthly} " +
    "a month for six years, direct to him, and he'll not chase you for it " +
    "because he's not the sort and he's not well enough — which if you've any " +
    "sense you'll find worse than if he was.\" He writes the date on the docket " +
    "and pins it behind the till, next to nothing else.",
    { monthly: BAR_MONTHLY }));
  // Rent has to be said OUT LOUD before the player commits, and by the one man
  // positioned to say it. The deposit-and-note line enumerated the money and
  // quietly omitted the bill that can actually end you, which is exactly the
  // defect class the repo lints for everywhere else (publican note 2026-08-25).
  _say(_fmt("\"One more and then I'll leave you to it.\" Bert taps the docket " +
    "twice. \"You've bought the BAR. You've not bought the BUILDING — nobody " +
    "ever does. Rent's ฿{rent} a month to the fella that owns the shophouse, " +
    "every thirty days from tonight, and he's nothing like the old man.\" He lets that sit. " +
    "\"Miss the old man and you'll feel bad. Miss the rent twice and there's a " +
    "lad with a tape measuring your frontage. I've seen it done to better bars " +
    "than this one.\"", { rent: _barRent() }), "alert");
  if (typeof _lowSeason === "function" && _lowSeason()) {
    // the one thing a publican buying in the wet needs told BEFORE the money
    // moves — BOOKS said "this is the month a cushion is for" the morning after
    // he had handed over the cushion (Keith, round 40)
    _say("\"And you're buying in the wet.\" He says it to the docket, not to you. \"Trade's " +
      "half what it is at Christmas and the rent isn't. Every fella that's bought " +
      "in the rains has spent the first two months feeding the bar out of his own " +
      "pocket and wondering what he's done. Stand it every night you can, draw " +
      "nothing you don't need, and the cool season pays you back. It does. Eventually.\"", "alert");
  }
  _say(_fmt("(You owe ฿{owed}, and ฿{rent} a month to the landlord on top. The " +
    "bar is yours the day it opens — ASK BERT ABOUT OPENING.)",
    { owed: G.bar.owed, rent: _barRent() }), "win");
  _leaseAsk();
}

// ── The lease: the landlord's money, and the season he asks in ──────────────
// Re-papering the lease is the moment his money moves, and he is the creditor
// who prefers cash (Mario, 2026-09-04: some landlords still would rather notes
// than a money trail, and a full cash payment on a large sum is negotiable).
// Key money at list by transfer, or a discount for notes in full — the discount
// set by the season you sign in (LEASE_CASH_OFF; none at peak, when he has a
// queue), and the wet buys a rent-free month, because an empty shutter till
// November is his alternative. Getting the notes together is YOUR problem, and
// every route already exists: the ATM, Nont's CASH, the till. A pendingChoice
// modal wired the standard five ways; LATER leaves it due at the first rent
// (full figure, by transfer) unless PAY KEY MONEY settles it in notes first.
function _leaseTerms() {
  const tier = _seasonTier();
  const key = _barRent() * LEASE_KEY_MONTHS;
  const off = LEASE_CASH_OFF[tier] || 0;
  return { key, off, cash: Math.round(key * (1 - off) / 100) * 100, tier, wet: tier === "low" || tier === "deeplow" };
}
function _leaseAsk() {
  const t = _leaseTerms();
  G.bar.lease = { key: t.key, cash: t.cash, off: t.off, tier: t.tier, wet: t.wet, paid: false, how: null, billed: false };
  if (t.wet) G.bar.rentFree = LEASE_WET_FREE;
  const l = G.bar.lease;
  const terms =
    l.tier === "peak" ? "\"And it's December, so he's a queue for the room and he knows it. Key money's the full month, notes or the app, makes no odds to him this time of year — and it's due with the first rent.\"" :
    l.wet ? _fmt("\"And here's the thing about buying in the rains. He'd rather half a rent than an empty shutter till November — so the first month's rent is off, and if the key money comes in NOTES, all of it, he'll knock {pct}% off. Cash he can put in a drawer. A transfer he has to explain to somebody.\"", { pct: Math.round(l.off * 100) }) :
    _fmt("\"Now. Key money for the lease — one month, to re-paper it in your name. Full whack on the app, or {pct}% off if it's notes, all of it, in his hand. He's not fussy about where notes come from and he's very fussy about where transfers go.\"", { pct: Math.round(l.off * 100) });
  _say("\"One more, and this one's the landlord's.\" Bert lowers his voice, which he never does. " + terms, "alert");
  _say(_fmt(l.off
    ? "(Key money ฿{key}, due with the first rent — or ฿{cash} in notes any time before then: PAY KEY MONEY. The app, at the full figure, whenever: TRANSFER KEY MONEY. Getting the notes together is your problem — the machine, the till, or whoever you know who turns bank into cash.)"
    : "(Key money ฿{key}, due with the first rent — PAY KEY MONEY in notes or TRANSFER KEY MONEY from the account, whenever, same figure.)",
    { key: l.key, cash: l.cash }), "dim");
}
function _leaseCash() {
  const l = G.bar.lease, b = G.bar;
  const pot = Math.max(0, b.cash) + G.money;
  if (pot < l.cash) {
    _say(_fmt("He wants ฿{cash} in notes, all of it, and between the till and your pocket you have ฿{have}. Get the rest together — the machine, or whoever you know who turns bank into cash — and it stays on the first rent till then.", { cash: l.cash, have: pot }));
    return;
  }
  const fromTill = Math.min(Math.max(b.cash, 0), l.cash), fromPocket = l.cash - fromTill;
  b.cash -= fromTill; if (fromPocket > 0) { G.money -= fromPocket; b.pocketDrawn = (b.pocketDrawn || 0) + fromPocket; }
  l.paid = true; l.how = "cash";
  _say(_fmt("฿{cash} in notes, counted onto the bar, counted again into an envelope that has been ready under the till since this morning. Nobody writes anything down. \"He'll be round for a soda he doesn't drink. That's the receipt.\"{off}",
    { cash: l.cash, off: l.off ? _fmt(" ฿{saved} under the list, for keeping it off paper.", { saved: l.key - l.cash }) : "" }), "win");
}
function _leaseTransfer() {
  const l = G.bar.lease;
  const bank = G.bank || 0;
  if (G.money + bank < l.key) {
    _say(_fmt("Pocket and account together come to ฿{have}; the key money is ฿{key}. It stays on the first rent.", { have: G.money + bank, key: l.key }));
    return;
  }
  const fromBank = Math.min(bank, l.key), fromPocket = l.key - fromBank;
  G.bank = bank - fromBank; G.money -= fromPocket;
  if (fromPocket) G.bar.pocketDrawn = (G.bar.pocketDrawn || 0) + fromPocket;
  l.paid = true; l.how = "transfer";
  _say(_fmt("฿{key} across on the app to an account number Bert reads twice. The landlord's daughter sends a sticker back, which is the closest that family comes to a receipt.{off}",
    { key: l.key, off: l.off ? _fmt(" (He'd have taken ฿{cash} in notes. You paid for the paper.)", { cash: l.cash }) : "" }), "win");
}

// what tonight's trade did. Called once from _endNight when you own the place.
// settleDay is the day the night was PLAYED — _endNight runs this after G.day++,
// so it passes G.day-1, and the graded takings read the month you actually
// traded in rather than the morning-after one (the last night of a month was
// settling at the next month's rate — Gordon, 2026-08-26). Defaults to G.day for
// a direct call (a test settling "tonight").
function _barNight(settleDay) {
  const b = G.bar;
  const day = (settleDay != null) ? settleDay : G.day;
  b.nights++;
  const tier = _seasonTierOn(day);
  const low = tier === "low" || tier === "deeplow";
  let take = BAR_TAKINGS + Math.floor(_rand() * BAR_SWING);
  // the presence dilemma, in one line. Working your own rail is worth roughly
  // double an evening spent elsewhere — which is exactly what makes going out
  // a decision instead of a default.
  // The shift flag set by _doWork, consumed below — see the note there. The day
  // guard is belt-and-braces: settle runs either on the same day (a direct call)
  // or the morning after (via _endNight, which has already done G.day++), so a
  // flag older than that is stale and must not count.
  let worked = !!b.workedLast && (b.workedDay === G.day || b.workedDay === G.day - 1);
  let declaredOnly = false;
  if (worked && (b.stoodTurns || 0) < WORK_MIN_STOOD) { worked = false; declaredOnly = true; b.lapses = (b.lapses || 0) + 1; }
  take = Math.round(take * (worked ? WORK_TAKINGS : AWAY_TAKINGS));
  if (worked) take += BAR_PRESENT;
  take = Math.round(take * _seasonTakingsOn(day));   // graded by the month you traded in, peak → trough
  // the affair: the floor knows, and the till says so — worse once the room has
  // turned, and a scar for a while after a break (the chapter, not the girl)
  if (typeof _affairLive === "function") {
    if (_affairLive()) take = Math.round(take * ((G.affair.floorSour || 0) >= 3 ? AFFAIR_DRAG_SOUR : AFFAIR_DRAG));
    else if (G.affair && G.affair.gone && G.affair.scarUntil && day < G.affair.scarUntil)
      take = Math.round(take * AFFAIR_DRAG);
  }
  // two months behind and the floor is thin — you can watch it happen in the till
  if (b.shortStaff) take = Math.round(take * BAR_SHORT_STAFF);
  // nights away pile up; the staff notice before the books do
  b.away = worked ? 0 : (b.away || 0) + 1;
  b.floorN = 0; b.shiftAsked = false;    // tomorrow's floor and tomorrow's call
  if (!worked) b.streak = 0;   // one night out and the grind resets
  // ── what the night cost ────────────────────────────────────────────────
  // Fixed nut + what you actually sold + the people who sold it, instead of one
  // flat figure that did not care how the night went. A dead night is now
  // genuinely cheap, which is the thing a landlord recognises and the thing the
  // old model made impossible (publican playtest 2026-08-23).
  //
  // The wages line is what finally puts the presence dilemma on the P&L rather
  // than only on the takings multiplier: when you are not behind the rail you
  // are PAYING somebody to be. That is the trade in one number.
  //
  // Friction is a SUPPLY problem, so it loads the nut and the stock — never the
  // wages. Each refused procurement job is +8% on what you buy, forever.
  const friction = (G.syn && G.syn.friction) || 0;
  const supplyMult = 1 + friction * BAR_FRICTION;
  const nut = Math.round(BAR_NUT * supplyMult);
  const cogs = Math.round(take * BAR_COGS * supplyMult);
  const wages = BAR_WAGES + (worked ? 0 : BAR_MGR_NIGHT);
  // Procurement you ACCEPTED is a standing cost — the invoice you pay for the
  // frictionlessness. Refusing is cheaper on paper (this line is ฿0) and buys the
  // weather instead; accepting is the same trade the other way (Keith, 2026-08-26:
  // accepted jobs never billed, so the fork was "free upgrade vs permanent tax").
  const synJobs = (G.syn && G.syn.done) ? Object.keys(G.syn.done).filter(k => G.syn.done[k]).length : 0;
  const proc = synJobs * SYN_JOB_NIGHT;
  const costs = nut + cogs + wages + proc;
  const net = take - costs;
  b.cash += net;
  if (net > b.best) b.best = net;
  // a losing night is covered out of the till; when the till is empty the owner
  // puts his hand in his own pocket, because that is what owning means. Only
  // when BOTH are empty is the bar actually underwater — a visible state, not a
  // silent negative number.
  let fromPocket = 0;
  if (b.cash < 0) {
    fromPocket = Math.min(G.money, -b.cash);
    G.money -= fromPocket;
    b.pocketDrawn = (b.pocketDrawn || 0) + fromPocket;   // the bar's own ledger, not the night's spending
    b.cash += fromPocket;
  }
  const underwater = b.cash < 0;
  b.workedLast = false;   // consumed: tomorrow starts unworked
  // The till already moved by the event money during the night. Categorise it by
  // SIGN, not lump it into the take: a bell-millionaire (+) is income and rides
  // the "in" line; a staff birthday (−) is a spend and belongs on the "out"
  // line — folding it into the take printed "฿-4 in" on a trough night when the
  // graded take was smaller than the cake (cost-accountant/publican playtests).
  const evt = b.eventCash || 0;
  b.eventCash = 0;
  const evtIn = Math.max(0, evt), evtCost = Math.max(0, -evt);
  // the itemised night, for BOOKS — one "in" and one "out" hid a ฿400 gap a
  // twenty-year publican could not name (Keith, round 40)
  b.lastLines = { day, take: take + evtIn, nut, cogs, wages: BAR_WAGES, mgr: worked ? 0 : BAR_MGR_NIGHT, proc, evtIn, evtCost, worked, declaredOnly };
  return { take: take + evtIn, costs, evtCost, net: net + evt, low, friction, fromPocket, underwater, declaredOnly,
    worked, away: b.away, nut, cogs, wages, proc };
}

// What the room costs, by what the room is. Reads the owned bar's own barType so
// that a second bar (the Shamrock hook) prices itself with no new code.
function _barRent() {
  const r = ROOMS[G.bar && G.bar.room ? G.bar.room : "stinky_bar"];
  const mult = (r && RENT_MULT[r.barType]) || 1;
  return BAR_RENT * mult;
}

// The month, in the order a publican actually pays it: the landlord first,
// because he can re-let the room by Friday, and the old man second, because he
// cannot do anything at all. Till first, pocket second, arrears third — for
// both, but only one of them is dangerous to be behind on.
function _barMonthly() {
  const b = G.bar;
  if (G.day - b.lastMonthDay < 30) return null;
  b.lastMonthDay = G.day;
  b.months++;
  // ── the landlord, first ──────────────────────────────────────────────
  let rent = _barRent(), waived = false, keyBilled = 0;
  if ((b.rentFree || 0) > 0) { b.rentFree--; rent = 0; waived = true; }   // signed in the wet: a month off
  const l = b.lease;
  if (l && !l.paid && !l.billed) { l.billed = true; l.paid = true; l.how = "billed"; keyBilled = l.key; }   // LATER: the full figure, with the first rent
  const rentOwedNow = rent + keyBilled + (b.rentOwed || 0);
  let rentDue = rentOwedNow, rentFrom = [];
  let take = Math.min(Math.max(b.cash, 0), rentDue);
  if (take > 0) { b.cash -= take; rentDue -= take; rentFrom.push("the till"); }
  if (rentDue > 0) {
    const pk = Math.min(G.money, rentDue);
    if (pk > 0) { G.money -= pk; b.pocketDrawn = (b.pocketDrawn || 0) + pk; rentDue -= pk; rentFrom.push("your own pocket"); }
  }
  // capture what was handed over BEFORE the owed figure is overwritten
  const rentPaid = rentOwedNow - rentDue;
  b.rentOwed = rentDue;
  b.rentShort = rentDue > 0 ? (b.rentShort || 0) + 1 : 0;

  // ── the old man, with whatever is left ───────────────────────────────
  const owedNow = BAR_MONTHLY + b.arrears;
  let due = owedNow, paidFrom = [];
  const fromTill = Math.min(Math.max(b.cash, 0), due);
  if (fromTill > 0) { b.cash -= fromTill; due -= fromTill; paidFrom.push("the till"); }
  if (due > 0) {
    const fromPocket = Math.min(G.money, due);
    if (fromPocket > 0) { G.money -= fromPocket; b.pocketDrawn = (b.pocketDrawn || 0) + fromPocket; due -= fromPocket; paidFrom.push("your own pocket"); }
  }
  b.arrears = due;
  // The principal falls by what you ACTUALLY handed over, not by a flat
  // BAR_MONTHLY on settled months only. The old rule collected a partial
  // payment in full and credited it to nothing, then billed the shortfall again
  // the next month as arrears — so ฿22,100 paid moved `owed` by zero, and two
  // months costing ฿50,000 reduced the debt by ฿25,000 (publican playtest
  // 2026-08-23, and the worst single finding in that report: the whole expat
  // stage hangs on this note).
  const paid = owedNow - due;
  if (paid > 0) b.owed = Math.max(0, b.owed - paid);
  return { paidFrom, short: due, month: b.months, paid,
    cleared: Math.max(0, owedNow - BAR_MONTHLY - due),
    rent, rentFrom, rentShort: rentDue, rentMonths: b.rentShort, rentPaid, waived, keyBilled };
}

// ── the note's teeth ────────────────────────────────────────────────────────
// The old man never chases. That is true, it is the best-written thing in the
// arc, and it stays. But the bar is 51% somebody else's, and THAT person can
// act — which is the whole point of the fork, finally paying off at the bad end
// as well as the good one. Candy's route is written down and gives you notice;
// Tan's is a phone call you are told about afterwards. Neither is a game over:
// you are an expat without a bar, and the sandbox carries on.
const _RENT_LATE = [
  "The landlord's daughter comes for the rent, on the thirtieth day as she always does, and this time there is a conversation instead of a receipt. She is perfectly pleasant about it. She writes the date on the back of her own hand where you can see her do it.",
  "The rent is not there and everybody knows it before you say it — Bert, the girls, the man who brings the ice. Nobody is unkind. That is somehow the worst available option.",
  "The landlord himself comes, which he has not done once, and he stays for a soda he does not drink. He tells you about the last farang who had the room. It is not a threat and it is not a story about a threat. It is just the last farang who had the room.",
];
const _ARREARS_WARN = [
  "Bert mentions the arrears the way he mentions the weather \u2014 once, without looking up, and then not again. \"He'll not ask, bud. That's the trouble with him.\"",
  "The docket behind the till has a second date pencilled under the first. Nobody drew attention to it. Somebody wrote it.",
];
const _ARREARS_BITE = [
  "One of the girls doesn't come in, and the reason given is a cousin's wedding. Bert doesn't offer an opinion on the wedding. The floor runs one short, and it shows in the till before it shows anywhere else.",
  "A second girl is suddenly working a bar two doors down. Nobody was sacked and nobody resigned; the floor is simply thinner than it was, and thin floors take less money.",
];
function _barArrearsTick(m) {
  const b = G.bar;
  if (!b) return;
  // The landlord's fuse is short and it burns first. He does not escalate in
  // stages the way the note does, because he does not have to: there is a queue
  // for the room and everyone in it pays on the first.
  if ((b.rentShort || 0) >= RENT_GRACE) { _barLost("landlord"); return; }
  if ((b.rentOwed || 0) > 0 && !b.rentWarned) {
    b.rentWarned = true;
    _say(_pickVary(_RENT_LATE, "rentlate"), "alert");
    _say("(Rent is the one that has teeth. Miss it again and the room is " +
      "somebody else's. BOOKS.)", "dim");
  }
  if (b.rentOwed === 0) b.rentWarned = false;
  if (b.arrears <= 0) { b.shortStaff = false; return; }
  if (b.arrears >= BAR_ARREARS_END) { _barLost("partner"); return; }
  if (b.arrears >= BAR_ARREARS_BITE) {
    if (!b.shortStaff) {
      b.shortStaff = true;
      _say(_pickVary(_ARREARS_BITE, "arrbite"), "alert");
      _say("(Two months behind. The floor is thin, and a thin floor takes less. " +
        "BOOKS.)", "dim");
    }
    return;
  }
  // if the rent was the story this month, the note's polite cough can wait: two
  // near-identical beats about a date written down read as one beat, badly.
  if (b.arrears >= BAR_ARREARS_WARN && !b.arrearsWarned && !(b.rentOwed > 0)) {
    b.arrearsWarned = true;
    _say(_pickVary(_ARREARS_WARN, "arrwarn"), "dim");
  }
}

function _barLost(cause) {
  const tan = _flag("partnerTan");
  _say("");
  if (cause === "landlord") {
    // The plainest ending in the game, and deliberately so: nobody wrongs you,
    // nobody makes a speech, and the room is simply worth more to somebody who
    // pays on the first. Two months is all the room ever owed you.
    _say("There is no letter and no meeting. There is a man measuring the " +
      "frontage at four in the afternoon with a tape and a phone, and a second " +
      "man behind him with an opinion about where a fridge would go. They are " +
      "not rude to you. They assume you work there.", "alert");
    _say("The landlord is apologetic in the specific way of a man who is not " +
      "sorry: two months is two months, and there is a queue for the room. The " +
      "fit-out you paid for stays with the shophouse, because that was always " +
      "the deal and you read it, or you were told you had.", "alert");
    _say("There is a queue for the room because there has been a company in it " +
      "for two years, waiting, and a company pays on the first. White Dish take " +
      "the lease and the old man's paper in the same week, for less than either " +
      "was worth, which is what patience buys.", "alert");
    _say(tan
      ? "Tan hears before you tell him and rings once, briefly, to say that this " +
        "one was not something he could have moved. You believe him. It is the " +
        "first time all year he has told you a thing he could not do."
      : "Candy takes it better than you do, which is its own small humiliation. " +
        "\"Fifty-one of nothing,\" she says, and orders a drink like a customer, " +
        "and pays for it.", "alert");
  } else _say(tan
    ? "Tan does not come to the bar to tell you. You find out because the staff " +
      "list has a name on it that is not yours, and because Bert — who has known " +
      "for two days and has been deciding how to say it — finally says it. \"He " +
      "squared it with the old man. Whole thing, one payment.\" There is no " +
      "paperwork to look at. There was never any paperwork. \"He said to tell you " +
      "there's no hard feeling in it, and bud, I believe him, and that's the part " +
      "I'd think about.\"\n\nBert turns the bottle a quarter turn. \"White Dish had " +
      "a number in with the old man by the Tuesday. Your man moved on the Monday.\" " +
      "He lets that sit exactly as long as it needs. \"He didn't do it for you.\""
    : "Candy's lawyer sends a letter, because Candy's arrangements are the kind " +
      "that involve letters. It gives you fourteen days and it is scrupulously " +
      "polite. She comes herself on the last of them, sits at the good table like " +
      "any other customer, and does not once say I told you. \"Fifty-one is my " +
      "name on this, tilac. My name cannot be on a thing that does not pay.\" She " +
      "settles the old man in full the same week, which is the part that stings, " +
      "and sells the lease on the week after that, because there is exactly one " +
      "buyer for a Soi 6 bar and everybody has always known who. \"I am sorry,\" " +
      "she says, and means it. \"You did a good thing, before. It was only ever " +
      "going to hold as long as you could pay.\"",
    "alert");
  // Not a phone shop. The Stinky Pinky is a going concern on the foot of Soi 6
  // and the only buyer for one of those has been waiting two years — so the bar
  // reopens as itself, refitted, with the name kept because the name has value.
  // Your one uncomplicated good deed, undone, and trading well.
  _say(_flag("partnerTan") && cause !== "landlord"
    ? "The Stinky Pinky opens tomorrow, the way it opened before you, and the " +
      "regulars will be in it. The girls keep their jobs. Nothing about the room " +
      "changes at all, which is how you know whose it is now."
    : "It shuts for six weeks. It reopens as the Stinky Pinky — they keep the " +
      "name, because the name is the only thing they were ever short of — with a " +
      "menu, a card machine, and a girl on the door in a company polo. Bert " +
      "doesn't stay. The regulars go anyway, most of them, and are perfectly " +
      "happy there, which you find you mind more than the money.", "alert");
  // if the affair was still running, this is the slow bleed's true ending —
  // losing the bar and the reason you kept it in the same week
  if (typeof _affairLive === "function" && _affairLive()) _affairEnd("bleed");
  _setFlag("barLost");
  G.flags.barOpen = false;
  G.bar = { cash: 0, owed: 0, arrears: 0, months: 0, lastMonthDay: 0, nights: 0,
    best: 0, workedLast: false, rentOwed: 0, rentShort: 0 };
  _addHappy(-8);
}

// BOOKS / TAKINGS — the player has to be able to look at it. Deliberately terse
// and slightly unhelpful, like a real set of bar books.
// The owner's draw. Money flowed INTO the till (a losing night comes out of your
// pocket) and never came out of it — so a publican playtest finished 65 nights
// of ownership with ฿3,637 in his own drawer, ฿0 in his pocket and ฿2,000 of
// hotel debt accruing −1 สนุก a morning, with no legal way to buy a beer
// (2026-08-23). That is not a hard economy, it is an incoherent one: the two
// arms of the stage's central choice weren't connected by any pipe.
//
// Deliberately plain — no ceremony, no limit but what's in the drawer, and it
// costs a turn like everything else. The tension the design wants is between
// what you take out and what the old man is owed, and that tension only exists
// once taking out is possible at all.
const _DRAW_LINES = [
  "You count it out of the drawer yourself, which is the only part of owning a bar nobody warns you about: it is your money and it still feels like stealing.",
  "Out of the till, into your pocket, and the note goes in the book — Bert doesn't look up, because Bert has watched owners do this for thirty years.",
  "You take it out the way a landlord takes it out: quickly, without counting twice in front of the staff, and with a note of the figure.",
];
function _doDraw(arg) {
  if (!_barOwned()) {
    _say(`${_flag("barLost")
      ? "There is no till of yours to take anything out of. There was."
      : "You'd need a till of your own to take anything out of. (Yours is the Stinky Pinky's, once it's yours.)"}`);
    return;
  }
  if (G.room !== "stinky_bar") {
    _say("Your till is at the Stinky Pinky, and so, therefore, is your money.");
    return;
  }
  const b = G.bar;
  if (b.cash <= 0) {
    _say(b.cash < 0
      ? _fmt("The drawer is ฿{short} behind, not ahead. There is nothing in it to take, and you know exactly whose problem that is.", { short: -b.cash })
      : "The drawer is empty. A bar that has taken nothing tonight has nothing for you either.");
    return;
  }
  let amount = /all|everything|lot/.test(arg) ? b.cash : parseInt(String(arg).replace(/[^\d]/g, ""), 10);
  if (!amount || amount <= 0) amount = b.cash;
  if (amount > b.cash) {
    _say(_fmt("There's ฿{cash} in the drawer. You can't take out what the night didn't put in.", { cash: b.cash }));
    return;
  }
  b.cash -= amount;
  G.money += amount;
  b.drawn = (b.drawn || 0) + amount;
  _say(_fmt("{line} (฿{amt} out of the till. ฿{cash} left in it; ฿{money} on you.)",
    { line: _pickVary(_DRAW_LINES, "bardraw"), amt: amount, cash: b.cash, money: G.money }), "win");
  if (b.arrears > 0) {
    _say(_fmt("(You are ฿{a} behind with the old man. He will not mention it. That is the arrangement.)",
      { a: b.arrears }), "dim");
  }
}

function _doBooks() {
  if (!_barOwned()) {
    // A bar you HAD is not a bar you never bought. Reading "the deposit isn't
    // paid" at a man who paid it and lost the place is the state-blind-prose
    // defect exactly.
    _say(_flag("barSold")
      ? "The books are somebody else's problem now, at the fair price, with the " +
        "note cleared. The only ledger you keep these days fits on the back of a " +
        "noodle-shop receipt, and it balances."
      : _flag("barLost")
      // The ending says it reopens as the Stinky Pinky with a menu, a card
      // machine and a girl on the door — and BOOKS said a phone shop stood
      // where the docket used to be pinned. Two endings for one room, four days
      // apart (round 24, Keith). The room is still there; it is simply not
      // yours, which is the harder version anyway.
      ? "There are no books \u2014 not yours, anyway. The bar is still there, with your " +
        "name off the paper and somebody else's card machine on the counter, and " +
        "the docket you used to pin your takings to is a laminated drinks menu now."
      : _flag("barPaid")
      ? "Paid, not open — the books start on opening night. (ASK BERT ABOUT OPENING.)"
      : _flag("barPartner")
      ? "Not yet. The deposit isn't paid, so there is nothing to keep books on."
      : "You don't own a bar. Your books are your pocket, and you know what's in it.");
    if (_flag("barPaid") && G.bar && G.bar.lease) _sayLease();   // the landlord's money is due before the door opens
    return;
  }
  const b = G.bar;
  _say("── THE STINKY PINKY ──", "win");
  // The till reads as a state, not a raw negative: a bar whose drawer shows
  // "฿-12822" looks like an accounting error rather than a bar in trouble.
  _say(_fmt(b.cash < 0
    ? "Till: empty, and ฿{short} behind it   ·   Owed to the old man: ฿{owed}"
    : "Till: ฿{cash}   ·   Owed to the old man: ฿{owed}",
    { cash: b.cash, short: -b.cash, owed: b.owed }));
  // `months` counts months ELAPSED, not months settled — a month you couldn't
  // cover rolls into arrears and leaves `owed` untouched, so labelling it "paid"
  // put two contradictory numbers on one screen (actuary playtest 2026-08-23).
  _say(_fmt(b.arrears > 0
    ? "Months elapsed: {m} of {term}   ·   Nights open: {n}"
    : "Months paid: {m} of {term}   ·   Nights open: {n}",
    { m: b.months, term: BAR_TERM, n: b.nights }));
  _say(_fmt("Rent: ฿{r} a month to the landlord, every thirty days from the night you opened.", { r: _barRent() }), "dim");
  _sayLease();
  const ll = b.lastLines;
  if (ll) {
    _say(_fmt("Last night: ฿{take} in{evt}. Out: nut ฿{nut} · stock ฿{cogs} · wages ฿{wages}{mgr}{proc}{cost} — {who}.",
      { take: ll.take, evt: ll.evtIn ? _fmt(" (฿{e} of it the night's luck)", { e: ll.evtIn }) : "",
        nut: ll.nut, cogs: ll.cogs, wages: ll.wages,
        mgr: ll.mgr ? _fmt(" · Bert ฿{m}", { m: ll.mgr }) : "",
        proc: ll.proc ? _fmt(" · the arrangements ฿{p}", { p: ll.proc }) : "",
        cost: ll.evtCost ? _fmt(" · the night's own bill ฿{c}", { c: ll.evtCost }) : "",
        who: ll.declaredOnly ? "declared, not stood" : ll.worked ? "you stood it" : "Bert ran it" }), "dim");
  }
  _say(_fmt("Nights stood: {w} of {n}. A stood night takes about a third more over the rail and saves Bert's ฿{m}.", { w: b.worked || 0, n: b.nights || 0, m: BAR_MGR_NIGHT }), "dim");
  if (b.drawn) _say(_fmt("Taken out by you, all told: ฿{d}.", { d: b.drawn }), "dim");
  if (b.cash > 0 && G.room === "stinky_bar") _say("(DRAW <amount> takes it out of the till and into your pocket.)", "dim");
  if (b.rentOwed > 0) {
    // With RENT_GRACE at 2 the only figure this ever shows is one month, because
    // the second month is an eviction rather than a line in the books.
    _say(_fmt(b.rentShort >= 2
      ? "Rent owing: ฿{r} \u2014 {n} months behind, which is all the room ever owed you."
      : "Rent owing: ฿{r} \u2014 {n} month{s} behind. He asked once, pleasantly. There is not a third time.",
      { r: b.rentOwed, n: b.rentShort, s: b.rentShort === 1 ? "" : "s" }), "alert");
  }
  if (b.arrears > 0) _say(_fmt("In arrears: ฿{a}. He hasn't asked.", { a: b.arrears }), "alert");
  // The third surface. A publican who is short walks the money round, and the
  // verb existed nowhere in HELP or the books — REPAY was listed for the loan
  // shark and DRAW for your own till, and nothing for the two creditors who can
  // actually finish you (round 24, Keith).
  if (b.rentOwed > 0 || b.arrears > 0)
    _say("(You can settle either of them now, out of the till or your own pocket: " +
      (b.rentOwed > 0 ? "PAY RENT" : "") + (b.rentOwed > 0 && b.arrears > 0 ? " \u00b7 " : "") +
      (b.arrears > 0 ? "PAY THE NOTE" : "") + ".)", "dim");
  if (_flag("partnerCandy"))
    _say("Supply, ice, the screen, the cleaning — Candy's side of the paper, and nobody rings you about any of it. Yours is the stool the farang regulars can see.", "dim");
  const friction = (G.syn && G.syn.friction) || 0;
  if (friction) {
    _say(_fmt("Supply is costing you about {pct}% over the going rate — the jobs " +
      "you didn't give out are on this line, every night, forever.",
      { pct: Math.round(friction * BAR_FRICTION * 100) }), "dim");
  }
  _sayBarSeason();
}

// The landlord's money, on the books — readable from the deposit on, since it
// is due before the door opens.
function _sayLease() {
  const b = G.bar, l = b && b.lease;
  if (!l) return;
  _say(l.paid
    ? (l.how === "cash" ? _fmt("Key money: ฿{c} paid, in notes, off paper.", { c: l.cash })
      : l.how === "transfer" ? _fmt("Key money: ฿{k} paid, on the app.", { k: l.key })
      : _fmt("Key money: ฿{k}, billed with the first rent.", { k: l.key }))
    : _fmt("Key money: ฿{k} due with the first rent — or ฿{c} in notes before then (PAY KEY MONEY).", { k: l.key, c: l.cash }), "dim");
  if ((b.rentFree || 0) > 0) _say("First month's rent: off — you signed in the wet.", "dim");
}

// The year read off the till, in a publican's terms. Names the month and what
// the trade does in it — the graded curve made legible, and the thing an
// experienced hand watches the calendar for.
function _sayBarSeason() {
  const tier = _seasonTier(), month = _SEASON_MONTHS[_seasonMonth()];
  const pct = Math.round((_seasonTakings() - 1) * 100);
  const line =
    tier === "peak" ? `It's ${month} — peak season. Everyone you know is in town and the till knows it (about +${pct}% on the trade). Make hay.` :
    tier === "high" ? `It's ${month} — high season, the cool months. The trade sits about where it should.` :
    tier === "shoulder" ? `It's ${month} — the hot season. The crowd thins (about ${pct}% on the trade); Songkran aside, it's a quiet stretch.` :
    tier === "low" ? `It's ${month} — low season. The rains have set in and the trade with them (about ${pct}%). It will pass. It always passes.` :
    `It's ${month} — the deep low. Wettest, emptiest, cheapest (about ${pct}% on the trade). This is the month a cushion is for.`;
  _say(line, "dim");
}

function _barSettle(settleDay) {
  if (!_barOwned()) return;
  const n = _barNight(settleDay);   // the night played (G.day-1 from _endNight); the monthly cycle stays on G.day
  const m = _barMonthly();
  // the nightly line is quiet; the monthly one is not
  // BOOKS states an underwater till as a state ("empty, and ฿N behind it"); this
  // line printed a raw "Till: ฿-760", which reads as an accounting error rather
  // than a bar in trouble. Same wording in both places now.
  _say(_fmt(G.bar.cash < 0
    ? "(The bar: ฿{take} in, ฿{costs} out{low}{who}. Till: empty, and ฿{short} behind it.)"
    : "(The bar: ฿{take} in, ฿{costs} out{low}{who}. Till: ฿{cash}.)",
    { take: n.take, costs: n.costs + (n.evtCost || 0), cash: G.bar.cash, short: -G.bar.cash,
      low: n.low ? _L(" — low season") : "",
      who: n.worked ? _L(" — you worked it") : _L(" — Bert ran it") }), "dim");
  if (n.declaredOnly)
    _say("(You put your name on the shift and then you weren't there for it. Bert stood the night; the takings are his kind.)", "dim");
  if (n.away === WORK_DRIFT) {
    _say("Bert mentions, without making anything of it, that one of the girls " +
      "asked whether you still own the place. He told her yes. He did not tell " +
      "you which girl.", "alert");
  } else if (n.away > WORK_DRIFT && n.away % WORK_DRIFT === 0) {
    // an absent owner costs bonds, not baht — the books are the last to know
    const ids = Object.keys(G.soc.drinks || {}).filter(id => NPCS[id] && NPCS[id].room === "stinky_bar");
    const her = ids.sort((a, b2) => (G.soc.drinks[b2] || 0) - (G.soc.drinks[a] || 0))[0];
    if (her && G.soc.drinks[her] > 0) {
      G.soc.drinks[her] = Math.max(0, G.soc.drinks[her] - 1);
      _say(_fmt("{who} has started saying your name the way the staff at the " +
        "other bars do. Politely.", { who: NPCS[her].name }), "alert");
    } else {
      _say("The bar is fine. The bar is completely fine, and walking into it " +
        "feels a little more like walking into somebody else's.", "alert");
    }
  }
  if (n.fromPocket > 0) {
    _say(_fmt("(The till didn't cover it. ฿{amt} of your own money went in to " +
      "keep the lights on — nobody saw you do it, which is most of the job.)",
      { amt: n.fromPocket }), "alert");
  }
  if (n.underwater) {
    _say("(The bar is running on nothing at all now. Bert hasn't said anything. " +
      "Bert wouldn't.)", "alert");
    _addHappy(-1);
  }
  if (n.friction && n.low) {
    _say("(Low season, and you buy everything at list. This is the month that " +
      "finds out whether you have a cushion.)", "dim");
  }
  if (typeof _affairNight === "function") _affairNight(n);   // the affair's nightly account
  if (!m) return;
  // Rent reads first because it was paid first, and because a player who is
  // short needs to see which of the two shortfalls is the one that matters.
  if (m.waived) _say("(No rent this month — the wet-season month he gave you to get the door open.)", "dim");
  if (m.keyBilled) _say(_fmt("(The key money rode on this bill at the full ฿{k} — the notes never turned up.)", { k: m.keyBilled }), "dim");
  if (m.rentShort <= 0) {
    _say(_fmt("Rent to the landlord: ฿{amt}, from {src}. He counts it in " +
      "front of you, every month, and it has never once been wrong.",
      { amt: m.rentPaid, src: _L(m.rentFrom.join(" and ")) }), "dim");
  } else {
    _say(_fmt("Rent to the landlord: ฿{short} of it isn't there.", { short: m.rentShort }), "alert");
    _addHappy(-1);
  }
  _barArrearsTick(m);
  if (_flag("barLost")) return;
  if (m.short <= 0) {
    _say(_fmt("Month {n} to the old man: ฿{amt}, paid from {src}. He does not " +
      "acknowledge it. He never does; the money simply goes, and somewhere in " +
      "Ohio a man you have met once is still alive and still owns a little less " +
      "of your bar.", { n: m.month, amt: BAR_MONTHLY, src: _L(m.paidFrom.join(" and ")) }), "win");
  } else {
    _say(_fmt("Month {n} to the old man: you are ฿{short} short.", { n: m.month, short: m.short }), "alert");
    _say("Nothing happens. No call, no letter, no lawyer — he is not the sort " +
      "and he is not well enough. The shortfall simply rolls onto next month, " +
      "and you carry it around with you, which turns out to be the heaviest way " +
      "anyone has ever collected a debt.", "alert");
    _addHappy(-2);
  }
}

// ── Procurement, and the price of staying out of it ──────────────────────────
// Once you own a bar, work gets given out through partners: cleaning, the
// screen behind the bar, the till. The jobs themselves are data (SYNDICATE_JOBS,
// world.js); this is the machinery and the consequences.
//
// The frame, because the obvious version of this content is wrong: it is not
// corruption being discovered by a farang. It's how business is done here and
// everywhere — the only local difference is that nobody troubles to pretend
// otherwise. Nobody in the thread treats it as a scandal, and the words "bribe"
// and "corruption" never appear. Gavin's "White Dish looks after its friends"
// is the same sentence in a British accent.
//
// NEUTRALITY IS ALWAYS AVAILABLE AND NOTHING IS EVER BLOCKED. Refuse and the
// work still gets done, often cheaper on the invoice. What you lose is the
// frictionlessness: you pay list, you wait, the paperwork finds you. It's
// survivable while the bar is busy. `G.syn.friction` is that meter, and the
// pressure test is low season, when the margin that absorbed it isn't there.
function _synState() {
  if (!G.syn) G.syn = { done: {}, asked: {}, friction: 0 };
  return G.syn;
}

// the next job he hasn't put to you yet — asked in table order
function _synNextJob() {
  if (!_flag("partnerTan") || !_flag("barOpen")) return null;
  const st = _synState();
  return SYNDICATE_JOBS.find(j => !st.asked[j.id]) || null;
}

function _synDue() {
  return G.room === "stinky_bar" && G.nightTurn >= 30 &&
    _flag("tanAsked") &&                  // the free favour comes first
    _synState().lastAskDay !== G.day &&   // one procurement beat a night, at most
    !!_synNextJob();
}

function _synAsk() {
  const job = _synNextJob();
  if (!job) return;
  const st = _synState();
  st.asked[job.id] = true;
  st.lastAskDay = G.day;
  G.pendingChoice = "synjob";
  G.synJob = job.id;
  _say("");
  if (job.first) {
    _say("Tan is at the end of your rail again, waiting for Bert to finish " +
      "pouring rather than cutting in front of a customer.");
  }
  _say(job.lead, "alert");
  _say(job.ask);
  _synPrompt();
}

function _synJobById(id) { return SYNDICATE_JOBS.find(j => j.id === id) || null; }

function _synPrompt() {
  const job = _synJobById(G.synJob);
  _say(_fmt("(YES · NO · ASK — {label})", { label: job ? job.whoLabel : "ask about it" }), "dim");
}

function _synWho() {
  const job = _synJobById(G.synJob);
  if (job) _say(job.who);
  _synPrompt();
}

function _synYes() {
  const job = _synJobById(G.synJob);
  G.pendingChoice = null; G.synJob = null;
  if (!job) return;
  _synState().done[job.id] = true;
  _align("syndicate", 2);
  _say(job.yes, "win");
  if (job.perk) _say(job.perk, "dim");
  if (job.first) {
    _say("(★ You are a partner now, and partners' interests get looked after " +
      "first. That is not a Thai arrangement — it's the arrangement everywhere. " +
      "Here nobody troubles to hide it.)", "dim");
  }
}

function _synNo() {
  const job = _synJobById(G.synJob);
  G.pendingChoice = null; G.synJob = null;
  if (!job) return;
  const st = _synState();
  st.friction = (st.friction || 0) + 1;
  // no _align: staying out is not a deed against anybody, and nothing is done
  // to you. The cost is that nothing is done FOR you either.
  _say(job.no);
  _say("Nothing is done to you. Nothing at all is done to you, and that turns " +
    "out to be the whole of it.", "dim");
  if (st.friction === 1) {
    _say("The bin men go back to coming when they come. The beer uncle keeps " +
      "quoting the invoice price, perfectly friendly about it. A delivery is " +
      "short and the shortage is nobody's fault.", "dim");
  } else {
    _say("It is a little heavier each time. You could not point at a single " +
      "thing that was done to you, and you would be right, and the bar is " +
      "harder to run every month.", "dim");
  }
}

// Refusing isn't an event, it's weather — felt at your own bar over months.
// Everything here is survivable and none of it is retaliation; it is the
// ordinary cost of paying list price and waiting your turn.
const _SYN_FRICTION = [
  "The beer uncle's Hilux comes at eleven instead of nine. Not a problem, " +
    "except the fridges were empty until eleven.",
  "A crate you paid for isn't in the delivery. The uncle is genuinely sorry, " +
    "rings somebody, shrugs. It arrives Thursday. It is Saturday.",
  "One of the girls asks, very politely, whether the bar is going to be all " +
    "right. You say yes. She nods as though you had said something else.",
  "A form you have never seen before needs a stamp from an office that shuts " +
    "at three. It costs you an afternoon and is entirely correct.",
  "Two of the mamasans on the strip stop asking you to their bars' birthdays. " +
    "Nothing is said. You simply stop being on the list.",
  "The invoice price again. You mention, lightly, that you heard there was a " +
    "better number. The uncle agrees that there is, doesn't offer it, and helps " +
    "you carry the crates in.",
];

function _synFrictionTick() {
  const st = _synState();
  if (!st.friction || G.room !== "stinky_bar") return;
  if (st.frictionDay === G.day) return;
  // scales with how far outside you've stayed, and never becomes a drumbeat
  if (_rand() > Math.min(0.25 + st.friction * 0.12, 0.6)) return;
  st.frictionDay = G.day;
  _say(_pickVary(_SYN_FRICTION, "synfriction"), "dim");
}

// ── Dog-name easter eggs ─────────────────────────────────────────────────────
// Name your soi dog after a famous hound or a bit of Pattaya slang and he picks
// up a modest power (stored on G.dog.egg, applied at hooks across the engine).
// Matching is deliberately loose — accents stripped, common variants covered — so
// nobody has to type "Hachikō" exactly. One egg at a time; rename away and it's
// lost. `reject` eggs refuse the name outright (XYZZY gets the Zork treatment).
function _normEgg(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ").trim();
}
const _DOG_EGGS = [
  { key: "xyzzy", reject: true, test: /\b(xyzzy|plugh|plover)\b/,
    line: "You say the old magic word to the dog. A hollow voice says, \"Fool.\" XYZZY never " +
      "opened anything that mattered, and it does not open a dog. He keeps the name he had, and " +
      "his opinion of you." },
  { key: "rescue", test: /\b(lassie|lassy)\b/,
    line: "\"Lassie.\" He tilts his head like he's heard it in a former life spent hauling children " +
      "out of wells. From here on, if the night ever puts you face-down where you shouldn't be, he " +
      "won't leave you there — he'll bring you home." },
  { key: "guard", test: /\b(cerberus|kerberos|cerebus|cujo|rex|rintintin|rin ?tin ?tin)\b/,
    line: "A guard-dog's name, and he grows into it on the spot — squares up on his one clipped ear " +
      "like the other two heads are on back-order. The boys in brown will find somewhere else to " +
      "stand tonight; nobody shakes down a man with a hound like that at heel." },
  { key: "loyal", test: /\b(hachiko|hachi)\b/,
    line: "\"Hachiko.\" He doesn't know the story — the dog who waited nine years at the station for a " +
      "man who never came — but he lives it anyway. Name him that and he never drifts: what you build " +
      "holds overnight, and every morning he's exactly where you left him, glad past all reason." },
  { key: "snack", test: /\b(scooby|scoob|scoobydoo)\b/,
    line: "\"Scooby.\" Something in him answers to the promise of a snack with religious immediacy. Feed " +
      "him now and he covers it himself, nosing scraps from the gutter like a pro — and now and then " +
      "he digs up something the street dropped and nobody missed." },
  { key: "butterfly", test: /\b(butterfly|butterflies|btf)\b/,
    line: "\"Butterfly\" — the word for a man who flits girl to girl, worn now by a dog who does the " +
      "exact opposite, loyal as a shadow. The bar girls get the joke instantly and love him for it. " +
      "Walk a girl bar with Butterfly at the door and the welcome runs warmer than your face has earned." },
  { key: "sanuk", test: /\b(sanuk|sabai|fun)\b|สนุก|สบาย/,
    line: "\"Sanuk.\" สนุก — fun, the whole point of this town in one word. You named your dog Fun and he " +
      "agrees completely, all the time, about everything. It's contagious; the nights run a little " +
      "brighter with him in them." },
  { key: "buffalo", test: /\b(buffalo|kwai|kwaai|khwai)\b|ควาย/,
    line: "\"Buffalo\" — ควาย, after the sick one, the eternal up-country emergency that empties farang " +
      "wallets. Your dog is a walking cynicism detector now: when a story's being spun to part you from " +
      "your baht, he growls low, and somehow the story never quite lands." },
  { key: "knight", test: /\b(white ?knight|whiteknight|galahad|sir ?galahad)\b/,
    line: "\"White Knight.\" The soi's word for the farang certain he can save one. The dog wears it " +
      "better than any of them — he actually rescues strays, herding the smaller soi dogs clear of the " +
      "traffic without being asked. No magic, just a good heart doing what good hearts do." },
];
function _dogEggFor(raw) {
  const n = _normEgg(raw);
  return _DOG_EGGS.find(e => e.test.test(n)) || null;
}
function _dogEgg() { return (G.dog && G.dog.egg) || null; }

function _doNameDog(arg) {
  if (!G.dog) { _say("You haven't got a dog to name. The soi's freelancers already have names — several each."); return; }
  // doCommand lowercases all input, so re-dignify the name with title case
  const name = (arg || "").replace(/\b(the|my|dog|him|to|as|rename|name|call)\b/g, " ")
    .replace(/["'`«»]/g, "").replace(/\s+/g, " ").trim().slice(0, 24)
    .split(" ").map(w => (w.charAt(0).toUpperCase() + w.slice(1))).join(" ").trim();
  if (!name) {
    _say(`He answers — when he chooses to — to ${_dogName()}. (NAME DOG <something> to change it.)`);
    return;
  }
  const egg = _dogEggFor(name);
  if (egg && egg.reject) { _say(egg.line, "dim"); return; } // named but refused (XYZZY)
  const old = _dogName();
  G.dog.name = name;
  G.dog.egg = egg ? egg.key : null; // a plain name clears any prior power
  if (egg) {
    _say(egg.line, "win");
    if (egg.key === "sanuk") _addHappy(2); // naming him Fun is its own small joy
    return;
  }
  _say(`"${name}," you try, and he looks up — not because he understands, but because ` +
    `you said it in the voice that sometimes means chicken. Close enough. It's official: ` +
    `${name}.` + (old === "Sai Krok"
      ? " The soi will keep calling him Sai Krok regardless — tenure — and he will keep " +
        "answering to both, and to any word said in the chicken voice."
      : ` The soi never learned "${old}" either, and remains loyal to Sai Krok. He answers ` +
        "to all of the above, and to the chicken voice."), "win");
}

// GOOD BOY / STAY / HEEL / WHISTLE / COME — the things a dog person says out loud.
// Voiced, pooled, no happy farm (PET already pays the once-a-day point).
const _DOG_PRAISE = {
  good: [
    "“Good boy.” The tail goes — once, twice — and he looks up with the dignified pleasure of a " +
      "dog who knew that already and is glad you've caught up.",
    "You tell him he's a good boy. He accepts it the way the soi accepts weather: without " +
      "comment, and entirely.",
    "“Good dog.” The ears come forward, the whole back end wags, and for one second he is a puppy " +
      "and not a four-year veteran of the strip.",
  ],
  stay: [
    "“Stay.” He stays — he was going to anyway — and watches you go with the look of a dog who " +
      "thinks this is a test and intends to pass it.",
    "He sits, on the word, as if he has been waiting years for somebody to say it properly.",
  ],
  heel: ["“Heel.” He is already there. He glances up as if to ask what you thought the arrangement was."],
  whistle: [
    "You whistle. Sai Krok arrives at your knee with the weary promptness of a man answering a bell.",
    "One whistle and he's up and at your side, and a bar girl across the soi laughs: “Ooh, he know!”",
  ],
  come: ["“Come.” He comes — no hurry, no doubt — and sits, and looks up: well?"],
};
function _dogPraise(v) {
  const pool = _DOG_PRAISE[v] || _DOG_PRAISE.good;
  _say(_dogN(_pickVary(pool, "dogpraise:" + (v || "good"))));
}
function _doFeedDog(arg) {
  if (arg && /\bcats?\b|kitten|big one|little one/.test(arg)) {
    _say(G.itemLoc.soi_cats === G.room
      ? "Big One takes the offering off your fingers with the gravity of a customs official, " +
        "then lets Little One have the rest. Nobody says thank you; that isn't the arrangement."
      : "No cats here to feed — the beach pair work the Jomtien sand, and the bar cats work strictly for the kitchen.");
    return;
  }
  // FEED MOT is the fourth honest phrasing of Madam Oy's instruction, and it was
  // landing on the dog handler's brush-off.
  if (arg && /\bmot\b/.test(arg) && _npcsHere().includes("mot")) { _motDinner(); return; }
  if (arg && !/him|it/.test(arg) && !_isDogWord(arg)) { _say("Feed who, exactly? The whole soi is hungry."); return; }
  if (G.dog) {
    if (_dogEgg() === "snack") {
      _say(_dogN("You reach for your wallet; Sai Krok is already three moves ahead, nosing a " +
        "forgotten skewer out from under a cart and crunching it down bone and all. Scooby feeds " +
        "Scooby. He leans his weight against your leg by way of a receipt."));
      return;
    }
    const food = ["noodles", "moo_ping"].find(id => _inv().includes(id));
    if (food) {
      G.itemLoc[food] = null;
      _say(_dogN(`Sai Krok takes the ${ITEMS[food].name} from your hand with a gentleness that ` +
        "would astonish everyone who has ever seen him clear a doorway, eats it in one " +
        "efficient movement, and leans his whole weight against your leg. Resource " +
        "management, done correctly."));
    } else if (_isHotelRoom(G.room)) {
      _say(_dogN("Nothing up here a dog would thank you for — room service doesn't do " +
        "skewers. Sai Krok reads your empty hands, forgives you on the spot, and goes " +
        "back to guarding the door from the inside."));
    } else if (G.money >= 20 && _inBar()) {
      G.money -= 20;
      _say(_dogN(`฿20 to the kitchen for a skewer, passed down under the rail. Sai Krok takes it ` +
        `off the plate with great delicacy and eats it under your stool, and the bar ` +
        `pretends not to notice, warmly. (฿${G.money} left.)`));
    } else if (G.money >= 20) {
      G.money -= 20;
      _say(_dogN(`฿20 to a grill cart for a chicken skewer, which Sai Krok receives like a ` +
        `salary — owed, not begged. He eats, checks the street both ways, and falls ` +
        `back in at your heel. (฿${G.money} left.)`));
    } else {
      _say(_dogN("You have nothing for him. Sai Krok reads your empty hands, forgives you " +
        "instantly and completely, and keeps walking with you anyway. Dogs are better " +
        "than us and it isn't close."));
    }
    return;
  }
  const r = _room();
  if (r.bar || r.barType || r.massage || r.soapy || r.hostBar) {
    _say("No dogs in the venues — even the boldest soi dog respects the one rule. " +
      "The hungry ones work the street outside.");
    return;
  }
  if (_isHotelRoom(G.room)) {
    _say("No street dog is climbing to your room, tilac. You meet them where they " +
      "live — down on the soi, or out on the sand.");
    return;
  }
  if (_isDarkHere()) {
    _say("Whatever is circling you out there in the dark is hunting, not begging. " +
      "Feeding it is a different transaction entirely — see it lit first.");
    return;
  }
  const onSand = G.room === "north_beach"; // he's playing in the surf, not pacing the soi
  const food = ["noodles", "moo_ping"].find(id => _inv().includes(id));
  if (!food && G.money < 20) {
    _say(onSand
      ? "The dog in the shallows clocks your empty hands from twenty feet, decides you are " +
        "not, after all, dinner, and goes back to fighting the sea. Come back with food."
      : "A soi dog with one clipped ear materialises at the smell of your optimism, " +
        "finds no food and no funds, and dematerialises. Fair.");
    return;
  }
  const approach = onSand
    ? "The soi dog with one clipped ear comes bounding out of the shallows — sea-slick, sand " +
      "to the eyebrows, radiant about it — and skids to a polite stop at your feet"
    : "A soi dog with one clipped ear has been pacing you for half a block, close enough to " +
      "be polite about it";
  if (food) {
    G.itemLoc[food] = null;
    _say(`${approach}. You crouch and hold out the ${ITEMS[food].name}. He takes it with ` +
      "shocking gentleness, eats it in one movement, and then — this is the part nobody warns " +
      "you about — looks at you. Properly. Files something away.", "win");
  } else {
    G.money -= 20;
    _say(`${approach}. There is always somebody grilling something within twenty ` +
      "metres in this town, and ฿20 is a chicken skewer wherever it is. He takes it " +
      "with shocking gentleness, eats it in one movement, and then — this is the part " +
      `nobody warns you about — looks at you. Properly. Files something away. (฿${G.money} left.)`, "win");
  }
  G.dog = { since: G.day };
  _setFlag("hasDog"); // quest gate — see QUESTS reqFlags
  _say((onSand
    ? "A couple picking along the tideline laugh at your face: “Ohhh. He choose you, na.”"
    : "A passing bar girl laughs at your face: “Ohhh. He choose you, na.”") +
    " The soi calls him Sai Krok — sausage — after his one great subject. From here on he " +
    "pads at your heel, waits outside every bar, and sleeps " +
    (G.hotel === "queenvic" ? "in the Queen Vic's doorway, down on the soi" : "against your door") +
    ". Nobody " +
    "consulted you. That is how it works. (He's yours now: NAME DOG <something> if " +
    "you'd rather he answered to yours.)", "win");
  _addHappy(2);
}

// The Shamrock scene: walk him onto the Khao Talo strip — past the dead Irish
// pub with the sun-bleached sign — and the dog's history surfaces. Fires once
// ever (the flag completes Bert's "The Shamrock Dog" quest if it's on the
// books, but the scene itself belongs to anyone who makes the walk).
// ── The Orchid reveal — the payoff of the whole Tan web ─────────────────────
// Armed by hearing his near-confirmation ("quiet men drive taxis" sets
// tanSuspected); fires once, from _describeRoom, the next time you walk into
// the Orchid Room and actually LOOK at the good table. He never says the words
// — the reveal is a thing you see, not a thing anyone states. The recurring
// lines afterwards are deliberately about YOUR knowing, never about whether
// he's sitting there tonight: the room's revisit pool already places "the
// quiet Thai man" freely, and his roster room stays soi6_street, so asserting
// his presence here would promise a TALK target the engine can't honour.
const _TAN_TABLE_LINES = [
  "The good table again. You know now. Knowing does not make the room feel smaller — it " +
    "makes one ordinary grey sedan, parked somewhere out there in the night, feel very " +
    "much larger.",
  "You keep your eyes off the good table with the studied ease of a man not looking at " +
    "anything in particular. You never asked. Nobody ever said. That arithmetic is what " +
    "lets you keep walking in here.",
  "The MC president defers toward the good table the way he always did. You are the only " +
    "customer in the room who knows exactly how far that deference has to travel to " +
    "reach its object.",
  "The good table sits in its pool of low light. Whoever is or isn't at it tonight, you " +
    "know whose it is — and you order your drink, and you do not look. Much.",
];
function _tanOrchidReveal() {
  if (!_flag("tanSuspected")) return;
  if (_flag("tanRevealed")) { _say(_pickVary(_TAN_TABLE_LINES, "tantable"), "dim"); return; }
  _setFlag("tanRevealed");
  _say("You look at the good table. Properly, this time — past the strobe, past the skin, " +
    "past the Blue Label — at the soft-spoken Thai man in the unremarkable shirt whom the " +
    "whole room bends toward. And the floor of the evening drops away, because you know " +
    "that shirt. You have ridden behind it for two hours with your luggage in the boot.", "win");
  _say("Tan. The airport driver. The forgettable polo, the pleasant bottomless smile — " +
    "holding court without raising his voice while a patched MC president leans in for a " +
    "ruling and gets one, quietly, like weather being decided. \"I drive and I fix.\" Both " +
    "true. Neither the whole of it.", "win");
  _say("He sees you seeing him. One beat. Two. Then the smallest nod in Thailand — the nod " +
    "from the arrivals ramp, my friend, welcome to Pattaya — and he turns back to his " +
    "table, and the room closes over the moment like water. By the time your drink " +
    "arrives, the good table is empty.", "win");
  _addHappy(3);
}

function _dogShamrock() {
  if (_flag("shamrockVisited")) return;
  _setFlag("shamrockVisited");
  _say(_dogN("Sai Krok is suddenly not at your heel. He is ahead of you — moving with a " +
    "purpose you have never seen in him, straight past the Water Buffalo's rail, past " +
    "the Firefly, all the way down to the dark end of the strip. To the dead pub. THE " +
    "SHAMROCK, says the sun-bleached sign, and under it he sits at the shuttered door " +
    "and waits. Not whining. Waiting — the way a dog waits for a shift to start."), "win");
  _say("Daeng comes out of her place wiping her hands, looks once, and goes very soft. " +
    "“Ohh,” she says. “Paddy dog. You Paddy dog, na.” She crouches and takes his face " +
    "in both hands. “Four year. FOUR YEAR he walking.” Behind the shutter hasp, gone " +
    "green with the seasons, something glints: a brass tag. You work it free — SEAMUS, " +
    "it says. THE SHAMROCK. GOOD BOY.", "win");
  G.itemLoc.brass_tag = "inventory";
  _say(_dogN("(You now have the brass tag.) Sai Krok stays at the door exactly as long as " +
    "he needs to — a minute, maybe two, the whole strip quietly not watching — then " +
    "stands, shakes from nose to tail, and comes back to your heel. Done. Whatever he " +
    "came to collect, he has it now. So do you."), "dim");
  _addHappy(3);
  // The one fourth-wall line in the game, and he earned it.
  _say("(Real dogs sit on real steps like that one, all over Thailand. The Soi Dog " +
    "Foundation sterilises, vaccinates, patches up, and rehomes them — " +
    "https://www.soidog.org/content/make-donation if this one earned a tip.)", "dim");
  _questTick(); // the quest completes in the same breath as the scene, not one LOOK later (completionist playtest 2026-08-22)
}

// In the open-air beer bars the dog is a social asset: everyone likes a dog
// lover in Thailand, and the staff fuss over him — sometimes that warmth lands
// on you as real favor (a bond bump with whoever fussed). Rolls once per bar
// per night, ~half the time, from the presence line in _describeRoom.
// 21 scenes deep, because he's a permanent fixture and the rotation shouldn't
// wear through in a week. Each takes the fussing staffer's name.
const _DOG_FAVOR_SCENES = [
  n => `${n} spots Sai Krok before she spots you, produces an ice-bucket lid of water ` +
    `from nowhere, and sets it down with ceremony. "Handsome MAN," she tells him — him, ` +
    `not you — and by the transitive property of Thai dog diplomacy, some of it lands ` +
    `on you anyway.`,
  n => `${n} crouches to Sai Krok's level and conducts a full interview in Thai — his ` +
    `week, his opinions, the state of the soi. He answers with his tail. When she ` +
    `stands, some of that warmth comes up with her and settles on you.`,
  n => `A plate appears under Sai Krok's nose — grilled chicken, "mistake order, cannot ` +
    `sell" — and ${n} watches him eat with pure uncomplicated delight. A man whose ` +
    `dog is loved is halfway to being loved himself. House rules.`,
  n => `${n} photographs Sai Krok from four angles for the bar's Facebook page. He is ` +
    `the most engagement they will get all month and carries it well. You are visible ` +
    `in the background of the winning shot, captioned simply "customer". Fame.`,
  n => `${n} studies Sai Krok a long moment and delivers the verdict: good dog, old ` +
    `soul — "maybe a monk, last time." The theology is above your pay grade, but a man ` +
    `travelling with a former monk enjoys a certain standing.`,
  n => `${n} finds the clipped ear and inspects it with real concern, turning his head ` +
    `gently by the chin. Whatever old story she reads there, she decides it ended well ` +
    `— with you — and your next beer arrives colder than the last.`,
  n => `${n} swings the bar's one standing fan eleven degrees to point at Sai Krok. The ` +
    `entire climate diplomacy of the rail is redrawn around a sleeping dog, and your ` +
    `stool, by no accident, sits squarely in the slipstream.`,
  n => `The girls convene over Sai Krok and vote on his breed. Deliberation is intense. ` +
    `${n} delivers the finding — "Pattaya special. Best breed." — and you are handed a ` +
    `cold towel for no reason anyone explains.`,
  n => `${n} sets down the last of her own khao man gai for him without a word, like ` +
    `it was always his. When you try to pay for it, the look you get is genuinely ` +
    `offended. Some things are between her and the dog.`,
  n => `Sai Krok performs his one trick — sitting very, very straight — and the bar ` +
    `reacts like a title fight. "Ohhh, HIGH-SO," ${n} declares, and the dignity of ` +
    `the household, yours included, is upgraded on the spot.`,
  n => `${n} settles beside Sai Krok and tells him, in Thai, at length, about her own ` +
    `dog back home — the one her mother is minding. He listens the way she needed ` +
    `someone to listen. Afterward she treats you a shade like family.`,
  n => `${n} produces a scrap of checked phakhama cloth and ties it around Sai Krok's ` +
    `neck — "for handsome." He wears it like a medal ceremony. The room approves of ` +
    `you both, in that order, and the order is correct.`,
  n => `"A dog choosing a farang — good luck, you know." ${n} says it like settled ` +
    `case law. "He choose you. Everybody see." The rail nods along, and you are ` +
    `treated, from here on, as a man vouched for.`,
  n => `Sai Krok rests his chin on the rail cushion, and ${n} starts absent-mindedly ` +
    `dealing him into the conversation — a question here, a "na?" there — like a ` +
    `regular of long standing. Which, you realise, he now is. And so are you.`,
  n => `${n} scolds you — actually scolds you — for walking him in this heat, then ` +
    `feeds Sai Krok ice cubes one at a time from her hand while he crunches them ` +
    `with his eyes shut. You are forgiven by association, on conditions.`,
  n => `The bar's own cat descends from the till to inspect Sai Krok. He offers his ` +
    `nose with elaborate, old-fashioned courtesy; détente is achieved. "Even the cat ` +
    `like you now," ${n} reports, "and the cat like NOBODY." High office.`,
  n => `A packet of the staff's own dried squid makes its way down the bar, girl to ` +
    `girl, and ends under Sai Krok's nose. He receives it like communion. ${n} has ` +
    `already named you "squid dog papa" and it is, apparently, permanent.`,
  n => `${n} declares the stool beside you "his" and props a laminated RESERVED sign ` +
    `against it. The joke will be old by tomorrow and permanent by next week, which ` +
    `is how all the best bar institutions start.`,
  n => `An old regular pronounces, to nobody, that a bar with a sleeping dog in it is ` +
    `a lucky bar. ${n} hears it, weighs it, and decides it is true — and that you, ` +
    `as the luck's registered owner, drink among friends now.`,
  n => `${n} practices her English on Sai Krok — "Hello handsome, how are you today, ` +
    `I am fine thank you" — and he listens better than any farang she's tried it on. ` +
    `Your patience while she finishes the whole lesson is noted and banked.`,
  n => `Sai Krok tours the length of the bar greeting each girl strictly in order of ` +
    `seniority, like a shift inspection. "Very professional," ${n} says, watching him ` +
    `work. The audit passes. So, somehow, do you.`,
];
function _dogBarFavor() {
  const fav = (G.soc.dogFavor = G.soc.dogFavor || {});
  if (fav[G.room]) return;
  fav[G.room] = true;
  if (_rand() >= 0.5) return; // tonight this bar is busy; the fuss stays small
  const staff = _npcsHere().filter(id => NPC_ROLES[id]);
  if (!staff.length) return;
  const id = staff[Math.floor(_rand() * staff.length)];
  const name = NPCS[id].name;
  let si = Math.floor(_rand() * _DOG_FAVOR_SCENES.length);
  // the phakhama scene gives him a scarf — once, ever (he was handed two, playtest 2026-08-22)
  const scarf = _DOG_FAVOR_SCENES.findIndex(f => /phakhama/.test(String(f)));
  if (si === scarf && G.dogPhakhama) si = (si + 1) % _DOG_FAVOR_SCENES.length;
  if (si === scarf) G.dogPhakhama = true;
  _say(_dogN(_DOG_FAVOR_SCENES[si](name)), "win");
  _addBond(id, 1);
  _say(`(Everyone likes a dog lover in Thailand — ${name} warms to you.)`, "dim");
}

// The Peacock Cabaret drag revue: the one door in Supertown that's open to
// everyone. One happy point a night, same house rules as the Blue Dog show.
const _DRAG_SCENES = [
  "Petch takes the stage in a gown made mostly of light and lip-syncs a Thai " +
    "heartbreak ballad so completely that a sunburnt husband three tables over " +
    "is quietly, helplessly crying, and his wife is filming HIM.",
  "A whip-fast disco number, four queens in formation, and a costume reveal so " +
    "well-timed the whole room gasps as one — then roars. Miss Mala works the " +
    "front tables like a general reviewing troops who adore her.",
  "Miss Mala does the comedy number: she picks the stiffest farang in the room " +
    "(you clock, too late, that it is you), sits in your lap, calls you 'husband' " +
    "for a verse and a half, and hands you back to the night a local hero.",
  "A ballad, no tricks, just Petch and a spotlight and a voice she isn't even " +
    "using — and for three minutes the mirrored little room feels like the " +
    "thousand-seat stage she's saving for.",
];
function _doWatchDrag() {
  _say(_DRAG_SCENES[Math.floor(_rand() * _DRAG_SCENES.length)]);
  if (G.dragDay !== G.day) {
    G.dragDay = G.day;
    _addHappy(1);
    _say("(The best show in Jomtien, and the door's open to everyone. +1 สนุก. TIP the performers.)", "win");
  }
}

function _doTv() {
  const inRoom = _isHotelRoom(G.room);
  if (!_inBar() && !inRoom) { _say("No TV out here. The street is the channel."); return; }
  _say(inRoom ?
    "You thumb the room's TV on. A wall-mounted flatscreen, the hotel's welcome " +
    "channel giving up to actual programming: the news, sound low, Thai subtitles racing." :
    "The TV over the bar plays the news — sound off, Thai subtitles racing, " +
    "nobody's eyes on it but yours.");
  const h = _headline();
  if (h) {
    _sayHeadline(h);
    const h2 = _headline();
    if (h2 && h2.t !== h.t) _sayHeadline(h2);
    const fx = _fxLine();
    if (fx) _say(`The ticker crawls underneath: ${fx}`, "dim");
    const wx = _wxLine();
    if (wx) _say(`Then the weather girl, beaming at a map of the Gulf: ${wx}. ` +
      "Nobody who lives here needed telling.", "dim");
    const fb = _footyLine();
    if (fb) _say(`Then sport — ${fb}. Kickoff, as ever, at an hour Pattaya ` +
      "calls late and football calls prime time.", "dim");
    const lt = _lotto();
    if (lt) _say(`And the lottery numbers from the ${lt.date} draw crawl past — ` +
      `first prize ${lt.first}, last two ${lt.last2}. Somewhere a cashier checks her ` +
      "ticket against them without hope, and is proven right.", "dim");
    _say(inRoom ?
      "You absorb the state of the world from the edge of the bed and decide, on balance, " +
      "that it can wait until you've had a night out." :
      "The bar absorbs the state of the world and orders another round at it.", "dim");
  } else {
    _say(inRoom ?
      "Tonight it's muay thai highlights and the lottery draw. You watch two rounds, " +
      "content, and let the rest wash over you." :
      "Tonight it's muay thai highlights and the lottery draw. The bar approves " +
      "of both, loudly.", "dim");
  }
}

// Nobody props a folded broadsheet in a bar any more — the news lives on the
// phone. READ PAPER thumbs it there (battery-gated), and the only print left is
// the 7-Eleven rack and the Queen Vic's soft stack for the older hands.
function _doPaper() {
  const at7 = !!_room().seven, atQV = G.room === "queen_vic", onPhone = !at7 && !atQV;
  if (onPhone && G.battery <= 0) {
    _say("The news lives on a screen these days, and yours is a black mirror. A 7-Eleven " +
      "sells chargers and still racks a few print copies; the Queen Vic keeps yesterday's " +
      "for the older hands.");
    return;
  }
  const feed = _newsFeed();
  if (!feed.length) {
    _say("Nothing doing — a crossword someone's already ruined and a property " +
      "supplement nobody has ever read. The news, as ever, is the street.");
    return;
  }
  _say(onPhone ?
    "You thumb the news on your phone, the way everyone reads it now:" :
    at7 ?
    "You skim the rack by the till, cold air on your neck:" :
    "The Queen Vic still keeps a paper for the regulars — yesterday's, soft with " +
    "humidity and beer rings, still mostly true:");
  const seen = new Set();
  for (let i = 0; i < 6 && seen.size < 3; i++) {
    const h = _headline();
    if (h && !seen.has(h.t)) { seen.add(h.t); _sayHeadline(h); }
  }
  const fx = _fxLine();
  if (fx) _say(`Corner of the business page, the numbers every expat reads first: ${fx}`, "thai");
  const au = _gold();
  if (au && au.baht) _say(`Below them, gold at ฿${_num(au.baht)} ` +
    "the baht-weight — the number every mamasan reads first.", "dim");
  const wx = _wxLine();
  if (wx) _say(`The weather box promises ${wx} — which the sky will ignore ` +
    "on its own schedule.", "dim");
  const fb = _footyLine();
  if (fb) _say(`Back page — ${fb}.`, "dim");
  const lt = _lotto();
  if (lt) _say(`And the lottery results from ${lt.date} in their careful little ` +
    `box: ${lt.first}, last two ${lt.last2}. Every bar in town knows somebody ` +
    "who was one digit off.", "dim");
  _say("Somewhere in there, the fuel prices explain your bus fare.", "dim");
}

// ── The Nite Owl column ──────────────────────────────────────────────────────
// The old back-page institution: Mort's weekly hoot (see NPCS.mort — he
// writes it "to stay sane"). It's the canon dispenser — the scene's own hard-won
// wisdom rendered as a columnist's dry copy: a lead opinion, a bar listing, a
// reader letter with his reply, a joke, and the signoff. Day+vacation-stable
// (shared-world-safe like _quizBars), so it rotates daily and reads the same for
// everyone that day. Pure flavor — gates nothing.
const _OWL_LEADS = [
  "Another one this month, squire, on Sukhumvit, on foot, at three in the morning — a man of " +
    "our vintage who had drunk exactly enough to read a gap in eight lanes of traffic that " +
    "wasn't there. The Owl has written this paragraph before and will write it again, because " +
    "the highway takes a handful every year and the arithmetic never changes: the drivers are " +
    "drunk, the bikes run dark, the pickups do ninety, and you are a soft thing in a dark shirt " +
    "who has misjudged one distance. The piwins cross it forty times a night for a hundred baht. " +
    "Pay the hundred baht. The Owl is not being funny.",
  "A reader of the dignified sort writes that he would never, ever date a bar girl — " +
    "he has found a BARISTA, squire, green apron and all, met quite by chance at a table " +
    "in LK Metro where she was visiting a friend, and she has never done anything like " +
    "this before. The Owl has read this letter, near enough word for word, some forty " +
    "times, and offers the dignified reader one thought and no comfort: demand creates " +
    "supply. The coast noticed that men like you would pay a premium to not be customers, " +
    "and it built the thing you asked for — an honest job for the alibi, and a table that " +
    "isn't a stool. She is not lying to you, squire. She is a product. You wrote the spec.",
  "A reader writes that he has found a NORMAL girl, squire — met her at the " +
    "dentist, or the bank, or the immigration queue, somewhere daylight and " +
    "respectable, and she has a normal job. The Owl wishes him joy and offers " +
    "one piece of arithmetic: half this town works evenings. The mirage was " +
    "never where she works. The mirage is the word 'normal' — there are only " +
    "people, squire, each with an economy, and yours is showing.",
  "It is low season, squire, and the tourist board would like you to know the beaches " +
    "are uncrowded. Here is what uncrowded means from the other side of the rail: the " +
    "rain stops the customers but it does not stop a single meter in this town — the " +
    "rent meter, the loan meter back up-country, the little brother's school-fee meter. " +
    "The girls sit out the flood under thin blankets doing arithmetic you would not " +
    "wish on an accountant. Next time a barkeep looks pleased to see you in September, " +
    "understand that the pleasure is real.",
  "A reader mourns that Pattaya 'lost its soul in 1998.' It didn't, squire. In 1998 the baht was fifty to the dollar and you had a full head of hair. The city is doing precisely what it always did — adapting faster than you can. The town never grew a conscience. You just grew old.",
  "Newcomers keep asking why she wants money if she loves them. Wrong question. Liang du — to feed and care for — IS the love here, not a substitute for it. The man who says 'I love you' and won't pay the rent is, in the local accounting, useless. Learn the word before you learn her name.",
  "A gentleman panics: his lady had ฿180,000 last month and ฿5,000 this week. She isn't robbing you, chief. Money here is a river, not a reservoir — it flows through and does its job. Ask where it went and you may as well ask where the wind went.",
  "Every season a man swears his cashier — his mamasan — his single mum — is 'different, not like the others.' She is exactly like the others; she simply has a chair. There are no diamonds in the rough on this street. Only levels of the game. And if you think you aren't playing, sir, you have already lost.",
  "The old boys grumble the pretty girls have vanished. They haven't, grandad — they've decamped to Bang Saen and Sri Racha, where the money is Thai and the exchange rate is nobody's problem. As one put it to me, sweetly: 'farang cannot afford us now.' Just need to earn more.",
  "Another one went off a balcony this week. It is never the woman that does it — it's the isolation, and the shame of a man who bragged too loud to ask for help. If your mate's gone quiet, don't send flowers. Buy him a beer and SIT with him. That is the entire cure, and it costs a beer.",
  "She forgives her jobless Thai boyfriend three days' cheating and screams at YOU for smelling of massage oil. You are not the villain, squire — you are the stable ATM, and one gets audited while the other gets forgiven. Do not audition for bad-boy on a sponsor's salary.",
  "A first-timer reports a 'free' welcome drink and feels he's beaten the house. He has not. That drink was an interview, and he passed the part where he thinks he's clever. By closing time the tab will have four figures and one of them won't be him.",
  "Every year a foreign paper 'discovers' the world's oldest profession in the Land of Smiles as though we invented it. I have watched it ply its trade in New York and London, Amsterdam and Hamburg, Rome and Tokyo — it is no more Thai than the moon is. Supply meets demand; it is here to stay; and the published figures should be taken with a barrel of salt and a slice of lime.",
  "Every night a pair of them takes a corner table on the cultural sightseeing tour — one overpriced beer, arms crossed, here to watch the fallen women and feel taller for it. And every night, the same quiet collapse: the girl on stage turns out to be twenty-one, radiant, and kind, and the superiority curdles into something that needs another drink. Here is what nobody tells the sightseers, squire. I have sat in these rooms a thousand nights, and the only person in them with a clean soul is usually the one being looked down on. She dances to make the room happy — all of it. Even the corner table.",
  "Bars change names and the girls rotate street to street, but every door on this coast has its fixture. I know a doorman who, three years back, sat on the pavement opposite every night until four — a Thai man may wait outside a farang bar, never drink in it — to take one of the girls home. She left through that door with a customer and didn't come back. He crossed the road and asked the mamasan for the job. The new girls call him P', send him out for som tam, and know nothing; ask how long he's worked there and you get 'three years', and nothing else. The monks call it ploi wang — letting go. Some men let go of everything except the geography.",
  "A reader walked the neon on a Friday night — thin crowds on the strip, empty stools in the maze — and pronounces the town dead. That same midnight, squire, there was a fifteen-minute queue outside a ran lao on South Pattaya Road, and every second face at every table inside was one he'd have recognised from behind a bar. The pulse hasn't stopped. It clocked off, changed its clothes, and went out to spend its own money where the music is Thai and the prices are honest. The town is not dead. You are walking down the wrong streets.",
  "Rents rise, the tea money rises with every contract renewal, and so the price of your beer rises to meet them — that is the whole economics of this coast in one sentence. The bakshish never stops, no matter who sits in which chair. Only the ingenuous believe it can be halted, and the ingenuous don't last a season.",
  "They set a closing time and call it reform. It reforms nothing — the market wants four a.m., or six, and the market finds a way: a bolted door on the Darkside, a painted-out window, a party that closes for no clock. Business hours belong to business, not the almanac.",
  "Low season, and the town's a ghost of itself — a beach walk to yourself before noon, hotels checking in one guest a night. Which makes it, for the naughty boy, the finest season of all: bars crammed with ladies and empty of men, and the ladies keen. Not desperate, mind — they've the family money still — just keen to make more. There is no better time to be the only customer in the room.",
  "Newcomers assume a man moves to Pattaya for the nightlife. He does not. He moves for the CONVENIENCE — beach, beer, dinner, market and mischief all inside a short and laid-back walk, and none of Bangkok's grind. You needn't be a player to have a fine time here. Half the contented ones gave up the bar stool years ago and never told their friends back home.",
  "Walking Street, once eighty go-gos deep, is down to thirty — and the thirty that remain are giants, two French houses swallowing the little ma-and-pa bars whole. Shooting galleries flank the sois, Russian families photograph the rifles, and on a Friday it is not Sin City but downtown Mumbai. Neither better nor worse than the street I first walked. Just utterly, completely different.",
  "The town has quietly sorted itself by passport. Walking Street belongs to the South Asian crowd and the giant Indian clubs; Buakhao and LK Metro to the balding Brit; North Pattaya to the Chinese coach parties; Pratumnak and Jomtien, more each year, to the Russians. One coast, four cities, sharing a beach and not much else. Draw your own map, squire, and tip accordingly.",
  "A man asks me when Pattaya was at its best. Not the cheapest year, chief — the years it had CHARACTERS. The fellow on the spangled bicycle. The famous beauty on her stool at the top of the Street who broke a hundred hearts before anyone whispered she'd once been a he. The parrot man. The lady under the tarantulas. Bars run for FUN by lunatics who owned them, not branches of a chain with a spreadsheet. You never knew what you'd see next. That was the magic, and it's the thing that's gone.",
  "A reminder, printed once a season and ignored twice: do NOT behave like an asshole here. Kick the wrong man on the wrong step and by week's end the internet has your life story, the Governor has your visa, and you're on a flight away from your wife, your dog and your whole life. The town forgives a great deal. It does not forgive a scene with a camera on it.",
  "A reader tries to name the thing that isn't quite love. Four years, the same lady, fifteen visits — a customer still, and yet more than a customer; she remembers everything he likes and throws her whole self into the hours. Watching her ride off into the Jomtien sun, money and all, he feels something real. Not love, he insists — 'a kind of in-the-moment love.' I know exactly what he means, and so, quietly, does half this coast. The transaction and the tenderness are not enemies here. That's the part they'll never get back home.",
  "A reader files a long-time night under 'remind me never again': he books a lovely girl overnight and gets — a girl. Thirty minutes of her life story before bed, tears over a father and a sister and a child he can't keep straight, a sulk when HE talks too much, a cold shoulder in the night, no morning cuddle. 'She acts like a five-year girlfriend, not the one-day girlfriend you want.' Precisely, squire. Short time sells you the fantasy; long time delivers the person — the whole weeping, needing, remembering person. Most men don't want a girlfriend. They want the FEELING of one, for an hour, credits rolled before the third act. Know which you're buying.",
  "A young buck asks how to keep three ladies from ever meeting. Wrong ambition, squire — you cannot; the coast is too small and the LINE app too fast. The trick was never secrecy, it is TRADECRAFT: pay cash, so no bank QR flashes your legal name across her screen like a wanted poster; never post the sunset while you are still sitting in it; and above all do not bring her to the room, where there is always one hair on the pillow that is not hers. Get any of it wrong and you become the one thing this town is genuinely merciless about — a free video. Nobody minds a butterfly, chief. They mind a clumsy one.",
  // The reverse savior (canon essay, 2026-08-15): the Orchid reveal turned on the reader's own ego
  "This town spends years feeding a farang one idea about himself: benefactor. Every Thai family is a village, a leaning house, a sick buffalo and a Western Union counter, and the man on three thousand dollars a month remote is king of all he surveys. Then one day he meets a girl OUTSIDE the bars — good English, pays for her own coffee, 'family business in Bangkok' — and his Pattaya brain hears noodle cart. She takes him to dinner in Sathorn. Private room, thick carpet, a father in a tailored polo who pours the Blue Label himself and listens, warmly, to the online-business speech, and says: 'That is very nice. Good for a young man to have a little hobby.' HOBBY, squire. Like a gunshot. Pattaya teaches you money buys anything here. Bangkok reminds you the real money in this country was never yours to spend.",
];
// The Owl's answer to the amulet, printed once and never again. Written as the
// column would carry it: a reader's letter, third-hand, and a reply that
// explains the three things a farang cannot see — what an untended-looking
// shrine actually means, why the clay is unworn inside a worn case, and why she
// could not possibly have told him. Mort's register stays dry; he is a
// columnist, not a chorus.
const _OWL_AMULET = [
  "'Found an amulet on the sand right down the far end past the works, where nobody goes. " +
    "Wore it a week. Gave it to the drinks-cart lady when she asked for it, and she barely " +
    "said thank you. Did I do something wrong?'",
  "You did the only right thing available to you, squire, and got the only thanks that was " +
    "hers to give. Three things you could not have known. A spirit house with no offerings " +
    "AND no rubbish is not neglected — it is kept; somebody carries the leavings away, " +
    "because food left out brings dogs. An amulet whose case is worn to nothing while the " +
    "clay inside is sharp was not worn for years — it was made afterwards. And she said " +
    "nothing because saying it would have made you a man who needed comforting, and she " +
    "had a shrine to tidy. I have written that story eleven times in forty years and never " +
    "once printed it. This is the twelfth, and I have printed nothing you could use to find " +
    "her.",
];

const _OWL_LETTERS = [
  ["A hostess writes (translated from the Thai by her cashier, who added commentary " +
    "your columnist has removed): 'My friend tell me raise my price, everybody raise " +
    "now, know your worth. I raise. My one customer of the week say did I think this " +
    "is Dubai, and block. Now friend is asleep and I am hungry. What is my worth, Owl?'",
   "Your worth, little sister, is not the number and never was — but the STREET sets " +
    "the number, and the street does not read motivational posts. Your friend gave " +
    "you advice she will never have to pay for; that is the cheapest thing on this " +
    "soi and the most expensive to accept. Go back to your old price and eat. The " +
    "Owl has held his rate card at these premises for forty years, and it has kept " +
    "him fed if not rich."],
  ["A Thai wife writes: 'Met my farang on Beach Road in '89. Two children, a finance degree this year, maybe law school. Mixed marriage is hard and culture harder — but marriage is the START of the bumpy ride, not the happy ending.'",
   "I am happy for you, madam. Alas, you are in the minority."],
  ["'Relocating to Pattaya for work — what monthly income is normal living?'",
   "Define normal. Bus or Bolt? Noodle stall or the German place? Room or condo? For some, ฿25,000 is plenty; for others ฿100,000 won't cover the lady drinks. Tell me your vices and I'll cost your month."],
  ["'Booked a ten-out-of-ten off the app. She knocked at half one, three inches taller and ten years older than her photographs.'",
   "The camera adds ten kilos and the filter removes twenty. On these apps 'on my way' is a tense unknown to grammar. Pay for what knocks on the door, never for what glows on the screen."],
  ["'My wife's neighbour is ever so helpful with the repairs — devoted chap, really. Splendid fellow.'",
   "I'm sure he is. Buy him a beer. Then ask her, casually, when exactly the two of them met."],
  ["'Which is the honest soi?'",
   "Soi 6 will rob you to your face; Walking Street prefers to do it behind your back. At least one of them looks you in the eye. Honesty, on this coast, is a matter of angle."],
  ["A reader wants romance settled by post: 'OWL — met her on my third night and can't shake the thought: if I'd never walked into that bar, where would I be now?'",
   "The Owl gets this letter every dry season and the answer never changes: son, that is the " +
    "wrong question. You'd be in the bar next door, is where you'd be, asking it about somebody " +
    "else. This town has never once changed a man's direction — it just sells him a fresh " +
    "horizon every night, and the horizon works on commission. The question worth asking is " +
    "whether your direction has changed SINCE. If you need a bird in a bar rag to tell you, " +
    "there's your answer as well."],
  ["'The pretty one at the bar bought ME the drink and waved my wallet away. Have I, at last, cracked it?'",
   "You have cracked something. Report back at closing time, and bring the receipt."],
  ["A visitor writes, shaken: 'Took a freelancer home, had the sense to check her ID — twenty, it said. An hour after she left she was back with two constables and a SECOND card putting her at seventeen. Statutory, they said. Five hundred thousand baht or the station. I bargained to forty and flew home the next morning, vowing never again.'",
   "A vicious old trap, and an expensive lesson in reading the room instead of the card. One photo the size of a postage stamp fits a great many faces, and a girl with two ID cards has a friend, a plan, and a cut for the boys in brown. If she is coy about her age, squire, she is telling you her age."],
  ["'Where does my barfine actually go?'",
   "To the house, chief — every baht. The publican takes the fine; the lady keeps only what she makes from you after. Most beer-bar girls draw no salary at all — they work the quota, the lady drinks, and your generosity. Now you know where you stand: which is to say, paying twice."],
  ["'I ran a smashing pub back home. Put me in touch with a bar owner who needs a manager?'",
   "I used to make those introductions. Then I watched them, one after another, prove unable to grasp the first rule of a Thai bar, and watched the owners fire them before they went broke. Run your OWN if you must — with your OWN money — and we'll talk at closing time."],
  ["A reader warns: 'A go-go where you sign a chit for every drink. Signed all night — fourteen hundred baht by my count. At the door they wanted TWENTY thousand. I disputed it; it turned physical, my glasses went flying, the police came. Both sides dug in. I paid the fourteen hundred and left, swearing to warn every soul I meet.'",
   "The clip joint, alive and well. A signed chit in a dim room is a blank cheque, squire, and the muscle by the door is the collections department. Stick to the big-name houses where the bill is the bill; in the sign-here shops, the only winning move is not to sit down."],
  ["A reader muses: 'My flight over was packed to the doors. Is it truly a terrible low season, or have things simply CHANGED — the aging HOBITS thinning out, and folk coming to holiday rather than throw a week's wages at a pretty face?'",
   "Happy Old Boys In Thailand, for the uninitiated — a dwindling tribe. You may be right. The money that once crossed a bar now buys a beach chair and a seafood lunch. The girls noticed before you did; it's why half of them are in Bang Saen."],
  ["A reader explains the arithmetic of a kept lady: 'Her sponsor flies in, so she's not working — he pays a generous remittance for exactly that. But today's a family day for him, penned in with the wife and kids, and a girl with a free evening…'",
   "…is a girl with a free evening. Everyone is discreet, everyone is paid, and nobody, technically, is doing anything wrong. This is not a scandal, squire. This is a calendar."],
  ["A hopeful reader asks: 'One reads about the girls who make it out — the house in the village, the flight to Europe, the snow. Has anyone actually SEEN a happy ending, or is it all forum talk?'",
   "I have seen exactly one kind, squire, and it involves no snow. Drive twenty minutes into the Darkside, past the railway tracks: an open-air shophouse, six coin-op washing machines, a nail corner. The proprietor kept a notebook under her mattress for three years and banked a sponsor's allowance like a fund manager — rent, mother, and the rest into an account no boyfriend knew existed. One Tuesday she hit her number, paid her last 500-baht uniform fee, and walked out into the afternoon. The sponsor was blocked within the week; the contract was concluded, and he had received precisely what he paid for. She answers to no mamasan now and owns the lease. That is the real happy ending on this coast — a laundry bought in cash, by a woman who beat the house. Her old roommate, meanwhile, is still on the soi, waiting for the prince. The prince was never coming, madam. He was the seed capital."],
  ["A regular writes, wounded: 'My girl of two seasons has left the bar — and not for a bigger wallet. Somebody saw her at a mookata place with a Thai fellow in an office shirt. I would have paid anything. What did he pay?'",
   "Nothing, squire, and that is the entire point. You never saw him coming because he does not come to the bar — he waits in the car park in a sensible Honda, and he knows every single thing you are afraid she is hiding, and he stays anyway. His mother is against it, his friends tell him to 'be careful', and he is paying in a currency you do not hold: face. Against that, your wallet is confetti. Wish her well, sir. This is the one way out of here that the town does not own."],
  ["A reader, nine months in, writes with some swagger: 'Took her out of a go-go and set her up in my condo. She threw out the bikinis, cooks every night, drinks nothing. The bitter old boys in the sports bars are simply doing it wrong — treat them like human beings and they change.'",
   "Delighted for you, squire. Now a small prophecy, free of charge: one day the phone will ring from up-country — a brother, a motorbike, a hospital, a number with four zeros — and your answer will be worth more than nine months of home cooking. Pay it and you are her harbour. Explain about boundaries instead, and you will come home to a wardrobe of modest jeans and one suitcase gone. Nobody will have played you. The bar is not a place, sir. It is a survival mechanism, and it never closes."],
  ["A reader writes, quietly: 'Three weeks now — same girl, every single night. Dinners, the beach, coffee on my balcony of a morning. Neither of us has so much as looked at anyone else. This morning I told her she could give the bar away, we'd make a weekend of the islands. She smiled and said lovely — but send mama the fine before three, or would I rather just cover her salary by the month?'",
   "Sit down, squire. For twenty-one days you were in a relationship and she was at work, and the terrible truth of this coast is that from the outside the two are indistinguishable — that is the entire product. Nobody cheated you. She kept her side flawlessly; by her lights 'special customer' is the warmest thing there is to be. Was any of it real? The coast declines to answer. It always declines. The only question it will price for you is the one she asked: by the night, or by the month."],
  ["A reader's ordeal: a massage shop by his hotel, ฿600 for oil. In the room she demands 'special'; he declines and asks for his money back — and she ERUPTS, screaming 'pervert', the mamasan hurling shoes and a flower vase, both daring him to call the police: 'many customers say that, nobody calls.' He fled. But his hotel manager heard, went white, and marched round with the bell boy and a guard — four men. The girls scattered; the ฿600 came back with ฿200 on top.'",
   "There's the whole coast in one story: a shop that will scream you into surrendering your own refund, and a hotel man who'll walk three of his staff round the corner to get it back for a guest. The town will rob you and the town will catch you, often on the same street. Tip the bell boy. Then tip him again."],
  ["A reader writes, singed: 'Brought last night's lady back to the condo and scrubbed the place spotless. This morning today's lady found ONE hairpin down the side of the sofa, and I have not known peace since.'",
   "One hairpin is a signed confession, squire, and your condo becomes an active crime scene the instant a second guest crosses the threshold. The old hands play away games only — her room, a short-time, anywhere but the one address a wronged woman can find again at three in the morning. A man who brings them home is not a butterfly. He is a defendant."],
  ["A reader writes: 'Met a Bangkok girl on Second Road — no bar, no agenda, she paid for the lattes. Her family had a \"business.\" I pictured a noodle stall. Dinner turned out to be a private room in Sathorn, her father put a black metal card on the bill without looking at it, and I noticed, six months in, that her bracelet was real Cartier. I have felt about four inches tall since. Was I a fool?'",
   "You were a tourist, chief, which is a fool on a schedule. Two lessons for the price of one dinner. First: the lattes were the tell — a woman who won't let you pay is not auditioning you for savior. Second, and mind this one: nobody in that room was unkind to you. Warm as the Blue Label. That is how you know exactly where you stood."],
  ["A sports-bar regular writes, with some satisfaction: 'Mate of ours went native over the " +
    "Darkside years back — took a dancer home, we all told him. Then the money went, so she'll " +
    "have been gone inside the week. Nobody's seen him since. Another one for your ledger, Owl.'",
   "The Owl keeps that ledger, squire, and this entry reads differently from the east side of " +
    "the highway. Your mate's money went, and the lady went out at low tide and dug clams off " +
    "the Naklua flats, and cooked them, and stayed. There was a tea stand after — lopsided, " +
    "twenty-five baht a cup, a baby in a sling — and there is a bakery now, and the ledger says " +
    "so in her handwriting. You are not wrong about the odds; nine times in ten the meter runs " +
    "dry and the bed is empty, and I have printed those nine without flinching. But a man who " +
    "only counts the ones who come back to the bar will never count the ones who didn't need " +
    "to. Fewer than you hope, squire. More than you sneer."],
];
const _OWL_JOKES = [
  "A constable pulls a weaving driver over. 'You drinking?' Driver: 'Depends — you buying?'",
  "TIT, as the vendor said, flogging me the pirate Hannibal while swearing blind the pirate Thai film was illegal. This Is Thailand.",
  "The rail, on ageing: 'Sixty's the worst — always need to pee and nothing comes.' The eighty-year-old: 'I pee at six sharp, like a racehorse.' 'Then what's wrong with eighty?' 'I don't wake till seven.'",
  "A reader lists why an aeroplane beats a woman: it comes with an operating manual, it flies any time of the month, and it has no in-laws. He is, one senses, single.",
  "Weather: a low pressure off China, which means rain by the weekend. Buy a bumbershoot before you're wading, not after. 'Nuff said.",
  "Overheard, marketing seminar, a Sukhumvit hotel: 'Teamwork — a lot of people doing what I say.' They'll go far, that one.",
  "Public service warning: some of the sealed condom packets on sale are, on opening, entirely empty. In this town a man cannot trust even the packaging. Caveat emptor.",
  "A beer-bar owner, mournful into his till: 'sorriest crop of tourists I've ever seen.' The new coach parties buy their beer at the market, drink it on the department-store steps, and eat where it's cheapest. The street will survive them; it always has.",
  "A pack of local lads, puffed up and late-teens, jostling any farang with a Thai girl on his arm — 'you think you're better than us.' Nobody thinks anything, son. Go to bed. TAT, please note.",
  "An oxymoron for the season, sent by a reader: fire water. 'Nuff said.",
  "For the gentleman whose afternoons hang heavy: the town keeps a handful of go-go bars open in daylight — a pretty line-up, a cold room, hands to yourself. Want the hands-ON version? That's the gentleman's club's department, and it too opens when the golf finishes. Choose your afternoon accordingly.",
  "Soi 6 lately: ten ladies to every man, frontages flung open, and every bar's sound system turned past distortion into open warfare with its neighbour's. A party zone now, not the sneak-away it was. My hearing and I reached the halfway point and turned back. Bring earplugs, or a younger man's ears.",
  "A tip worth more than the nightlife: the six-table seafood shack out at Naklua — no reservations, no view, no service to speak of, and food from another planet at a price that shames the tourist traps. Nine dishes for three, two and a half thousand baht, and we over-ordered. Go hungry, go early.",
  "The Beach Road stroll is an international bazaar now. The local ladies go for a thousand, most of them; the Russians ask fifteen hundred, a Turkish lady two, and the Uzbek — pick of the promenade — the same. The African ladies hold a fixed fifteen hundred by open collusion, and heaven help the sister who undercuts. Add five hundred for the fool who won't wrap up.",
  "Half the small go-gos are zombies — dead on their feet, unable to cover the electric bill let alone the girls, shuffling on out of habit. They were zombies before Covid. Sooner or later they reform, repurpose into a live-music room, or lie down. The street is thinning itself, and not gently.",
  "Two sights that tell you everything: the queue of ladies at the Buakhao wire-transfer window on the first of the month, collecting from a boyfriend in Farangland who believes he's the only one — and, cruising past them, a gentleman's club's promo van got up like a knocking shop on wheels, honking for trade. Supply, meet demand. Demand, meet the wire desk.",
  "The eternal dilemma of the night's first bar: a flat-out ten sits in front of you, and it's only nine o'clock. Take her now and cap the adventure early, or press on and gamble the night turns up better? Half of Pattaya's regret is the ten a man walked past 'to keep his options open.' Seize the moment, or 'no regrets, press on' — both are wisdom. Only dithering is a mistake.",
  "A reader nearly took a tiny new beauty home — she'd have gone for two thousand — when the mamasan blocked the door: 'this one is small, she brings me many customers; you want her, twenty-five lady drinks and a five-thousand fine.' The girl cried; he left. A barfine is never a fixed price, squire — it's what the girl is worth to the bar THAT night, and a fresh little draw is worth keeping on the floor. The number isn't a robbery. It's an appraisal.",
  "For the specialist: the town keeps a fetish club or two — a grand entrance fee, more again for a private room, and a roster of older ladies who, be warned, mostly DOMINATE. Go to be dominated and you're in business; go to dominate and you'll find the market thin. Know your role before you pay at the door.",
  "A butterfly paid his lady's bar bill by QR to look the big man, and PromptPay did what PromptPay does — printed his full legal name across her screen like a wanted poster. He loves cash now. So, it turns out, does she; she looked him up.",
  "New spectator sport on the Beach Road promenade: two ladies who discovered over the same seafood platter that they share a boyfriend, and the boyfriend discovering that a man cannot outrun a flip-flop thrown sidearm. Admission, one phone. Streaming now.",
  "Q: What does a Bangkok father call your online business? A: A hobby. Q: What does he call the bill? A: Nothing — he doesn't look at it.",
];
// FOR THE NEWLY ARRIVED — the five words, in the Owl's voice, a standing slot
// for a player's first week (accessibility pass, 2026-09-03: every one of these
// is taught somewhere in the game, but an outsider met the word before the
// teaching). Prices are the constants, never digits.
const _OWL_ARRIVED = [
  () => "FOR THE NEWLY ARRIVED, since the Owl gets the same five questions every high season. " +
    "A BARFINE is two fees, squire, and the second is the one you'll forget: the bar's, to let " +
    "her leave her stool, and then hers, agreed between the two of you and never written on any " +
    "board. SHORT TIME is one round and she's back on the stool; LONG TIME is the night. A LADY " +
    `DRINK is ฿${LADY_DRINK} for a glass of something coloured, of which she keeps a cut — it is ` +
    "the rent on her attention and the only honest price in the room. The MAMASAN runs the floor " +
    "and the CASHIER runs the money; in a small bar they are one woman who has not had a night " +
    `off since the war. The blue trucks are SONGTHAEWS — ฿${BUS_FARE}, sit, hop off, pay at the ` +
    "back — and the lads on the corner in the vests are PIWINS, motorbike taxis, who will take " +
    "you anywhere for a price that goes up after two. That's the vocabulary. The grammar you " +
    "learn on a stool.",
  () => "A NOTE FOR FIRST-TIMERS, because a reader wrote in asking what the difference is. A " +
    "BEER BAR is a stool with the street on one side and a girl on the other; a SOI 6 BAR is " +
    "the same stool with a staircase behind it; a GO-GO is a stage, chrome, and a bell that " +
    "buys the room a round; a GENTLEMAN'S CLUB is a sofa behind a curtain in a villa with " +
    `the air-con set to Norway. A beer there is ฿${BEER_PRICE} at the cheapest and climbs by ` +
    "the class of the room, and nobody will tell you the number until it's in your hand — ask " +
    "(tao rai, squire: how much) before the glass lands. And one more: everybody in every one " +
    "of these rooms would rather you ASKED than looked. This is a town that talks. Use it.",
  () => "THE OWL'S PHRASEBOOK, abridged, for the man who arrived Tuesday. SAWATDEE (hello) and " +
    "KHOP KHUN (thanks) will get you further than the whole Lonely Planet. TILAC is what she " +
    "calls you; it means darling and it means nothing. FARANG is you. A WAI — hands together, " +
    "small bow — is worth more at the right moment than a five-hundred note at the wrong one, " +
    "and the Owl has watched a wallet come back on the strength of one. MAO is drunk; you will " +
    "be told you are. And CHEAP CHARLIE is what they call the man who read this column and " +
    "still didn't buy her the drink. Don't be him. Don't be the other one either.",
];
const _OWL_LISTINGS = [
  "STINKY BAR (Beach Road North), the American's shop, runs killer pool every third night — ฿100 in the ashtray, last cue standing takes the pot. His felt, his rules, his Singha.",
  "BLUE DOG (Beach Road North) keeps the best sunset seats on the strip and, six-to-seven nightly, the finest free show in town: the checkpoint across the road, farang and their paperwork, no cover charge.",
  "MAMA YAI'S (the Darkside) — som tam that arrives unasked and correct, beer ten baht under town, and a wall of photographs that knows everyone's second wife. Eat first, cry after.",
  "QUIZ NIGHT lands Thursday at the bars the chalkboards will name — walk in during and you're a contestant, no appeal. Five right buys ฿500 and your name in chalk. The teachers from Rayong will beat you regardless.",
  "THE ORCHID CLUB (Naklua) is NOT holding an event, has never held one, and would thank the press not to notice it exists. Discretion, gentlemen. Mai pen rai.",
  "CANDY BAR (Soi Buakhao), the mamasan's own — sharp as a razor, warm as a Chang on a hot night. She'll price your wallet before you sit and your story before you tell it. Buy her a drink; it's cheaper than the alternative.",
  "QUEEN VIC (Soi 6): the one air-conditioned pub on the wildest soi in the world, where the residents watch the circus from across the street and mourn the days before the paper changed hands. Cold beer, warm company, no illusions.",
  "THE LAST BAHT BUS is a lie the tourists tell each other. The songthaews run all night — sparse after two, on the long loop, but they run — and the bikes and the meter-cheats never stop. The only bus you can truly miss is the one you're too far gone to catch: too drunk for the pillion, too tired to stand the kerb, too sick to care. The curfew, gentlemen, was always on YOU. The Owl has closed more nights than he'll admit and never once failed to get home. He does not recommend the method.",
  "DONGTAN & SOI 7 (Jomtien) — the coast for men who've stopped auditioning. The Sandbar, the Lucky 7, a warm beer and a cool argument about the football, and not one soul will grab your sleeve. A third cheaper and a mile quieter. Come when the loud end has worn you thin; you'll wonder why you fought it.",
  "BUDDHA HILL (Pratumnak) at dusk — climb past the treadmill of the soi to the big gold Buddha, the whole bay laid out and cooling below. No cover, no bar bill, no bell; the one view on this coast that asks nothing back. The Owl files his best columns up there. Or claims to.",
  "THE HAIR-TONIC MAN and the curse-remover two pitches down both work Beach Road on a commission drawn from your own gullibility. Ask the price BEFORE you follow anyone down a side soi; if the number swells at the shop door, the police station takes reports — and a cut. Mai pen rai is not a payment plan.",
];
// Box 15 — the standing classified, and the game's hidden puzzle (docs/ctf.md).
//
// Three deliberate departures from house style, all forced by what this is:
//   1. NOT pooled and NOT _owlPick'd. Every other line in the column varies;
//      this one must be identical in every issue for every player forever, or
//      solvers cannot compare notes and a solution cannot be verified. A paid
//      classified running unchanged for years is also exactly what a real one
//      does, so the fiction covers the exception.
//   2. {{…}} around the ciphertext — it is data, not prose. Nothing in it should
//      ever become a tappable keyword if a future filler girl is named ACHAL.
//   3. No _rand(), so it consumes no dice and the soak transcripts are unmoved.
//
// The key is HOOT: four letters, printed at the foot of every column since the
// game shipped, and the ad says so if you read it as an instruction rather than
// as an old man being arch. Solution and full chain: docs/ctf.md.
// The noticer's reward: EXAMINE a distinctive fixture (an authored `reads:` —
// logged in G.examined by _roomRead) and the Owl may run a letter about that
// exact object. The player is never named; the coincidence is the wink. Letters
// exist only for these flagship fixtures — the map grows with the canon.
const _OWL_NOTICED = {
  "lake_beer.photos": ["A reader out at the lake writes that among the birthdays and the fish on " +
    "The Sundowner's fridge there is one snapshot that doesn't belong — a crooked tea stand, a " +
    "baby in a sling — and asks whose it is.",
    "Ask the quiet man on the end stool, squire, and buy him the one bottle he drinks. Or don't, " +
    "and leave it where it is. It has been the heaviest thing on that fridge for years, and it " +
    "weighs what a magnet weighs."],
  "tequila_queen.mirror ball": ["A reader asks after the Tequila Queen's mirror ball, specifically the dark " +
    "patch where the tiles are gone, and whether management might finally fix it.",
    "Fix it? Squire, that dark patch has seniority over half the dancers. It sweeps the room " +
    "like weather, everyone drinks under it, and I am told on good authority it has a name. " +
    "Some things in this town are broken in the exact shape of themselves. Leave them be."],
  "the_gecko.gecko": ["A reader reports being introduced, by name, to a gecko he never saw, in a bar " +
    "the size of a wardrobe on Pratumnak, and wants to know if he was being had.",
    "You were not. Somchai is real, salaried in insects, and has outlasted two owners and a " +
    "lease dispute. Plenty of staff on this coast you'll never see either. He clicks twice " +
    "for regulars. You were being welcomed."],
  "anchor_bar.wheel": ["A reader writes that he has now heard four different stories about which boat " +
    "the Anchor's ship's wheel came off, told by four different regulars, all eyewitnesses.",
    "All four are true, chief. That is what a good fixture is FOR. The wheel came off exactly " +
    "one boat, and I know which, and I am taking it to the crematorium with me. Buy the " +
    "storyteller a beer and stop auditing."],
  "stinky_bar.skunk": ["A reader confesses he has grown fond of the cartoon skunk over the Stinky " +
    "Pinky and wonders what that says about him.",
    "It says you've been here about three nights. The skunk is the finest sign on Beach Road " +
    "precisely because it is terrible — it promises nothing, delivers exactly that, and " +
    "buzzes while doing it. Fondness for it is the first symptom of residency. There is no cure."],
  "short_time_motel.keys": ["A reader was struck by the ring of numbered keys on a nail at a certain " +
    "motel, and the old man who never once looks at them, and asks how he keeps track.",
    "Forty years of practice and nothing else to think about, squire. That nail is the most " +
    "accurate booking system in the province. The chains and their key cards should come " +
    "and take notes — quietly, and not after midnight, when the register is full."],
  "second_rd_mall.crocodile": ["A reader photographed the crocodile on the spit outside the mall and asks, " +
    "reasonably, who eats it.",
    "Thais, by the skewer, at a fair price. The farang photograph it and buy a toastie. The " +
    "crocodile, I am told, finds both responses acceptable. It is the best-adjusted party " +
    "on that pavement and it has been dead since Tuesday."],
  "white_rabbit.jar": ["A reader up in Naklua noticed a tip jar rather fuller than the bar around it " +
    "and asks the Owl what he makes of that.",
    "I make of it what I make of every miracle in this town: somebody is paying for something, " +
    "and it is not the beer. The Owl does not investigate miracles north of the Dolphin. " +
    "Neither, if you are wise, do you."],
  "kingfisher.bird": ["A reader on Pratumnak demands to know, once and for all, what species of bird " +
    "is painted over the Kingfisher's bar.",
    "I consulted a book, squire, and the book asked me to stop. It has a kingfisher's blue, a " +
    "myna's attitude, a duck's undercarriage and a heron's neck, and the painter was working " +
    "from love, not ornithology. It is a Kingfisher. Species: local."],
};

const _OWL_BOX15 = [
  "• PERSONALS, Box 15 — Gentleman of long residence, technical disposition, " +
  "seeks correspondent of the same. I have signed off with the same four letters " +
  "in every issue I have ever written and not one of you has asked me why. " +
  "Discretion assured. Reply in kind:",
  "{{ACHAL GCECS FMLZZ MOSCP SMCNJ CIGAS RMOSV HVHG}}",
];


// ── The QR sticker at the LK Metro mouth (docs/ctf.md) ───────────────────────
// The CTF's secondary pointer, for a player who never thinks to try
// /.well-known/. A real, scannable QR: EXAMINE POSTER at lk_entrance finds the
// sticker, EXAMINE QR prints this.
//
// BAKED, never encoded at runtime — the game has no build step and no deps, so
// tools/gen-qr.mjs generates this offline and round-trips it (it decodes the
// printed characters back to the URL, so a rendering bug cannot ship). Re-run
// that tool if _QR_TARGET ever changes; do not hand-edit the block.
const _QR_TARGET = "https://soisanuk.github.io/last-baht-bus/.well-known/security.txt";
const _QR_STICKER = [
  "                                         ",
  "                                         ",
  "    █▀▀▀▀▀█ ▄ █ ▀ █▄█ ▀▀█▄▄▀  █▀▀▀▀▀█    ",
  "    █ ███ █ ▄▄▄ █▄▄▀ ▄ ▀█▀▄█▄ █ ███ █    ",
  "    █ ▀▀▀ █ ▄█ ▄▄▀▀▄▀▀▀▀▀█ ▀▀ █ ▀▀▀ █    ",
  "    ▀▀▀▀▀▀▀ ▀▄█▄▀ █ ▀ █▄█▄█▄▀ ▀▀▀▀▀▀▀    ",
  "    ██▀▀▀ ▀██▀▄▀▄█ ▀██▄█ ▄██▀▀▄▀ ▀▄█▄    ",
  "     █ ▀▀ ▀▀▄ ▀ ▄▀▀██ ▄▄█▄▄ ▄▄█  ▀▄▀     ",
  "    █ ▄█▀ ▀▀ █▀ ▀▀█▀████ ▄██▀ ▄ ▀▀ ▄▄    ",
  "    ▄ ▀█▄▄▀██ ▀█▀ ▀▀▀  ▄▀█▀▄▀▀█▀█ ▄▀     ",
  "    ▄█ ▀▄▀▀   ▄▀▄██▀▄█▄▄█  ██▀▄▀▀▄ █▄    ",
  "    ▀   █ ▀███▄ ▄  ██▀▀ ███▄██▄▄ ▀▄▀     ",
  "    ▄▄  ▀ ▀ █▄▀ ▀▀█▀▄█▄▄█▄▀▄▀▀▄▀▀▄ █▄    ",
  "    █  ▀█▀▀ ▀███▀ ▀▀▀▀▄▄ ▄   ▄▀▄▀█▄▀     ",
  "    ▀ ▀▀  ▀▀▄▄▀▀▄▄ ▀██▄▄▄▄▀▄█▀▀▀█▀▄ █    ",
  "    █▀▀▀▀▀█ ▀██ ▄█▀▀█▀  ██▄██ ▀ ██▄█     ",
  "    █ ███ █ █▀█ ▀ ▀  ▀ █  ▀ ██▀▀█▄       ",
  "    █ ▀▀▀ █ █ ██▀ ▄▀▄▀  ▄█   █▀  █▄▀     ",
  "    ▀▀▀▀▀▀▀ ▀▀ ▀     ▀  ▀ ▀▀▀  ▀▀  ▀     ",
  "                                         ",
  "                                         ",
].join("\n");

function _owlPick(arr, salt) {
  let h = salt >>> 0;
  for (const ch of String(G.day) + ":" + String(G.vacation)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return arr[h % arr.length];
}
// The Nite Owl went digital years back — it lands as an email newsletter now,
// read on the phone (battery-gated, like anything on the phone). The one holdout
// is the Queen Vic, the Owl's home base (he's a patron there, not the guvnor),
// where the pub still runs off a few hard copies for its columnist: read there it
// needs no battery. Box 15 — the CTF anchor — rides in the body either way, so it
// survives whichever form the issue takes.
function _doColumn() {
  G.owlRead = true;   // the banner stops calling it unread (Gordon, round 37)
  if (G.room === "queen_vic") {
    _say("The Queen Vic still runs off a few hard copies for the regulars — the last bar in " +
      "town that bothers, and the Owl's home patch. A thin stack by the till, going soft, " +
      "this week's:", "dim");
  } else {
    if (G.battery <= 0) {
      _say("The Owl's an email newsletter these days — Mort folded the print run, kept the " +
        "opinions — and your phone's a black mirror. Charge it, or grab a hard copy at the " +
        "Queen Vic, where he holds court.");
      return;
    }
    _say("You pull up the Nite Owl in your inbox. Mort took it online years back, grousing the " +
      "whole way — 'the paper died, squire, not me' — and it lands most nights now, unasked, " +
      "in the mail of anyone who ever stood him a beer:", "dim");
  }
  _say("── THE NITE OWL ── Mort's hoot, still going, out of spite ──", "win");
  _say(_owlPick(_OWL_LEADS, 1));
  // the standing first-week slot: gone once you've been here a week (a resident reads past it)
  if ((G.vacation || 1) <= 1 && G.day <= 7) _say("• " + _owlPick(_OWL_ARRIVED, 53)(), "dim");
  _say("• " + _owlPick(_OWL_LISTINGS, 7), "dim");
  // one-shot: if the amulet went back and the Owl has not had his say yet, he
  // gets it this issue instead of a pooled letter
  let letter, reply;
  const noticed = Object.keys(G.examined || {}).filter(k => _OWL_NOTICED[k]);
  if (_flag("amuletReturned") && !_flag("owlAmulet")) {
    _setFlag("owlAmulet");
    [letter, reply] = _OWL_AMULET;
  } else if (noticed.length && _owlPick([0, 1], 43)) {
    // the noticer slot: a letter about a fixture YOU actually examined — the
    // player is never named, the coincidence is the wink. Day-stable like the
    // rest of the issue (hash, no dice), alternating with the ordinary pool.
    [letter, reply] = _OWL_NOTICED[_owlPick(noticed, 47)];
  } else {
    [letter, reply] = _owlPick(_OWL_LETTERS, 13);
  }
  // The pool holds two authored styles: a bare quote ("'Which is the honest
  // soi?'") that needs an attribution, and a letter that introduces its own
  // writer ("A Thai wife writes: …"). A blanket prefix doubled the latter —
  // "A reader writes: A Thai wife writes:" — for six of nine letters. Spotted
  // in a soak transcript, where the column renders assembled; the template and
  // the letter are each perfectly fine on their own page.
  _say(/^['"“]/.test(letter) ? "• A reader writes: " + letter : "• " + letter);
  _say("  OWL: " + reply);
  _say("• " + _owlPick(_OWL_JOKES, 29), "dim");
  _say(_OWL_BOX15[0], "dim");
  _say("  " + _OWL_BOX15[1], "dim");
  _say("BUT, I DON'T GIVE A HOOT!", "win");
}

// EXAMINE QR at the LK Metro mouth. Printed with its own "qr" class because it
// has to come out black-on-white with square-ish modules whatever theme the
// player is in — the terminal is neon on black, and an inverted QR is one most
// scanners simply refuse. The class is presentation (index.html), the payload
// is data (_QR_STICKER); the engine just says which is which.
function _doQrSticker() {
  _say("You get your phone up to it. It's a sticker, printed not drawn, and newer " +
    "than anything else on this wall — the corners are still stuck down.");
  _say(_QR_STICKER, "qr");
  _say("Underneath, in biro, somebody has drawn a small rabbit.", "dim");
}

// The payoff for decoding Box 15. Grants nothing mechanical on purpose — no
// money, no สนุก, no favor — because it can be typed in any state (mid-jackpot,
// mid-encounter) and a puzzle reward that moved the economy would have to care
// about that. It is a trophy: a flag string to post, and one line in WHO AM I
// that nothing else in the game can put there.
function _owlBox15Answer() {
  const first = !_flag("owlBox15");
  if (first) _setFlag("owlBox15");
  if (typeof _npcWhere === "function" && _npcWhere("mort") === G.room) {
    // answered to his face, which is the version he'd want. Lands on his own
    // established line — forty years of writing to people who never write back
    // — because that loneliness is what Box 15 has been for all along.
    _say("The biro stops mid-click. Mort looks at you over the horn-rims for rather " +
      "longer than he looks at anything.", "win");
    _say("\"Box fifteen.\" He does not write it down. \"Forty years of putting words in " +
      "front of people who never write back. Four letters at the foot of every issue, " +
      "just to see if anybody was reading properly.\" The notebook closes. \"Somebody " +
      "was reading properly.\"", "win");
  } else if (first) {
    _say("Somewhere across town, an old man reading his own column out loud to nobody " +
      "stops mid-sentence.", "win");
    _say("Box 15 has been answered. Forty years of asking, and somebody counted.", "win");
  } else {
    _say("Box 15 stays answered. He is still telling people about it.", "win");
  }
  _say("sanuk{the_owl_gave_a_hoot_after_all}", "win");
}

// ── SHA-256, pure JS, synchronous ─────────────────────────────────────────────
// The engine has no crypto (no browser APIs by rule; crypto.subtle is async and
// absent in the vm anyway), and FNV-1a is 32-bit — fine for seeds, a lunch
// break to brute against a short phrase. A password check wants a real hash.
// Standard FIPS 180-4; ASCII/UTF-8 input; returns lowercase hex.
function _sha256(str) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = [];
  for (const ch of unescape(encodeURIComponent(String(str)))) bytes.push(ch.charCodeAt(0));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const W = new Array(64);
  for (let off = 0; off < bytes.length; off += 64) {
    for (let t = 0; t < 16; t++) W[t] = ((bytes[off+4*t]<<24)|(bytes[off+4*t+1]<<16)|(bytes[off+4*t+2]<<8)|bytes[off+4*t+3]) >>> 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t-15],7) ^ rotr(W[t-15],18) ^ (W[t-15]>>>3);
      const s1 = rotr(W[t-2],17) ^ rotr(W[t-2],19) ^ (W[t-2]>>>10);
      W[t] = (W[t-16] + s0 + W[t-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
  }
  return H.map(x => x.toString(16).padStart(8, "0")).join("");
}

// ── CTF stage 2: the wrong number (docs/ctf.md) ──────────────────────────────
// The gate is the good part: it arms only when somebody types an OBVIOUS
// security probe at the game prompt — nobody does that by accident, and the
// person it's for announces themselves in the first five minutes. The parser
// answers with the ordinary brush-off (the cover); this just arms a delayed text.
//
// The text is a canon-accurate Thai scam SMS from an IN-WORLD brand (never a
// real bank/carrier — White Dish doctrine) carrying a link to Mario's own
// domain, blacksite.org. That domain is where the un-greppable half of the
// puzzle lives: the site itself just redirects (a taken-down scam page, to a
// clicker), and the real clue is a DNS TXT record — which is what a security
// pro checks and a normal player never will. The TXT hands back the in-game
// close: a phrase to say at the White Rabbit, which is how the bar the map
// never points at is meant to be found. Second flag; trophy in WHO AM I.
//
// Same three rule-breaks as Box 15, same reasons (docs/ctf.md): fixed strings,
// on no surface, NOT gated by CHEATS_ENABLED (it grants nothing — trophy only).
const _PROBE_RE = /'\s*or\s+1\s*=\s*1|union\s+select|<script[\s>]|javascript:|onerror\s*=|\.\.\/\.\.\/|\/etc\/passwd|cmd\.exe|\/bin\/sh|\$\{jndi:|\$\{\w+:|%00|\bnmap\b|\bsqlmap\b|\bnikto\b|\bmetasploit\b|;\s*(?:ls|cat|id|whoami|uname)\b|\|\s*(?:ls|cat|id|whoami)\b|^\s*(?:whoami|sudo|curl|wget|nc|bash|sh)\b|\|\s*(?:sh|bash)\b|robots\.txt|\.git\/|\.env\b|wp-admin|phpmyadmin|(.)\1{79,}/i;
function _isProbe(raw) { return _PROBE_RE.test(raw); }
function _probeSeen() {
  // arm once per game; the text needs a working phone and a sandbox player
  if (_flag("probeArmed") || _flag("wrongNumberSent")) return;
  _setFlag("probeArmed");
  G.probeAt = G.turns;
}
function _wrongNumberTick() {
  if (!_flag("probeArmed") || _flag("wrongNumberSent")) return;
  if (!_flag("act1Done") || G.battery <= 0 || G.pendingEnc || G.game) return;
  if (G.turns - (G.probeAt || 0) < 8 + (_hh("wn" + G.vacation, 19) % 8)) return; // 8-15 turns later
  _setFlag("wrongNumberSent");
  G.phone.inbox.push({
    from: "unknown",
    fromName: "+66 6" + (_hh("wnnum" + G.vacation, 23) % 9) + " ••• ••••",
    text: "[SanukPay] Your parcel could not be delivered — customs fee ฿19 unpaid. " +
      "Confirm your details within 24h to avoid return: blacksite.org  Ref: WR-0x1E",
    read: false,
  });
  _say("(📱 Your phone buzzes — an unknown number. CHECK MESSAGES.)", "dim");
}
// The close. THE PHRASE IS NOT IN THIS FILE — visible ciphertext, earned key
// (docs/ctf.md's founding rule): the source holds only the SHA-256 of the
// normalised phrase, and the phrase itself lives in the DNS TXT record on
// Mario's domain, which is the whole reason a domain was needed. Grepping this
// file yields a hex string. The flag is DERIVED from the phrase too (a slice of
// a second hash), so it can't be printed without knowing it. Tests hold the
// answer key, same as docs/ctf.md does.
const _RABBIT_KNOCK_SHA = "cf0396f661596e7794501d84ffc796924bf8a0591f4b2cad37eb422afe9db723";
function _knockNorm(s) {
  return String(s).toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
}
function _isRabbitKnock(input) { return _sha256(_knockNorm(input)) === _RABBIT_KNOCK_SHA; }
function _whiteRabbitAnswer(input) {
  const first = !_flag("ctfRabbit");
  if (G.room !== "white_rabbit") {
    _say("You say it to the street. The street, correctly, ignores you. Wrong room — " +
      "there is exactly one bar in this town where those words mean anything.", "dim");
    return;
  }
  if (first) _setFlag("ctfRabbit");
  _say("Eddy stops wiping the glass. He doesn't put it down; he just stops.", "win");
  _say("\"Huh.\" A long look, the vanity gone out of it for once. \"That number's been " +
    "dead three years. The domain's been dead longer. And you walked in here off a TXT " +
    "record.\" He sets the glass down at last. \"Most people who find this bar find it " +
    "'cause a piwin got lost. You found it 'cause you knew what to look for and " +
    "where nobody would think to.\" The grin comes back, but a different one — the one " +
    "under the one he wears. \"Sit. First one's on the house. Second one you'll pay " +
    "for, because I'm not stupid, whatever the sign says.\"", "win");
  if (first) _say("Down the rabbit hole. There is no back up.", "win");
  else _say("He's told everybody. Everybody has stopped listening. He hasn't stopped telling.", "win");
  // the flag is a function of the knock — no phrase, no flag
  _say("sanuk{" + _sha256("rabbit:" + _knockNorm(input)).slice(0, 24) + "}", "win");
}

// ── Food and water ───────────────────────────────────────────────────────────

const FOOD_STALLS = {
  jomtien_7eleven: { name: "a toastie, pressed while you wait", price: 35, hunger: 40, thirst: 0 },
  mikes_mall: { name: "the fifty-baht plate from the top-floor food court, honestly enough food", price: 50, hunger: 55, thirst: 0 },
  cheap_charlies: { name: "fried rice off the wok, the board the same board it has always been", price: 60, hunger: 55, thirst: 0 },
  jomtien_soi_7_m: { name: "som tam off the lone cart doing quiet business, extra lime", price: 50, hunger: 50, thirst: -5 },
  cheap_charlies_jt: { name: "fried rice off the wok, the board the same board it has always been", price: 60, hunger: 55, thirst: 0 },
  jomtien_beach_rd: { name: "a cold mango from Auntie Nok, salt and chilli on the side", price: 30, hunger: 25, thirst: 15 },
  buakhao_market: { name: "som tam from the cart, extra everything", price: 50, hunger: 55, thirst: -10 },
  lake_bar: { name: "a whole grilled lake fish, salt-crusted, som tam on the side", price: 180, hunger: 65, thirst: 5 },
  naklua_rd: { name: "grilled chicken and sticky rice off a smoky cart", price: 60, hunger: 60, thirst: 0 },
  ws_gate: { name: "a late-night kebab of negotiable provenance", price: 89, hunger: 45, thirst: 0 },
  kiss: { name: "a proper plate off the mile-long menu at KISS — pad kaprao, or a burger if the soul needs it", price: 120, hunger: 70, thirst: 10 },
  kiss_jomtien: { name: "the same mile-long KISS menu, Jomtien branch — pad kaprao, or a burger if the soul needs it", price: 120, hunger: 70, thirst: 10 },
  soi_rompho: { name: "grilled chicken, sticky rice and som tam from a Rompho Market stall", price: 60, hunger: 60, thirst: -5 },
  // The squid cart at the bottom-of-everything junction. Its own prose has
  // advertised it ("Somebody is selling grilled squid to a queue") since the
  // room was written, with nothing behind it — found by tools/afford-audit.mjs,
  // 2026-08-23. A 2am songthaew stop with a queue at a cart is exactly where a
  // hungry player waiting for a truck should be able to eat.
  pattaya_tai: { name: "grilled squid off the cart at the junction, chilli sauce in a twist of bag", price: 70, hunger: 50, thirst: -10 },
  // ── Round 23: five rooms whose prose put a food vendor on the pavement and
  // sold nothing. Found by a persona who planned his whole day around meals, and
  // then found INDEPENDENTLY by afford-audit once it stopped testing the
  // player's pocket instead of the room. In each, the prose was already specific
  // about what is being sold and by whom; all that was missing was the till.
  thappraya_ext_s: { name: "a bowl off the last late-night noodle cart before the hill", price: 50, hunger: 45, thirst: -8 },
  // "a man selling roasted chestnuts nobody buys" — so buy some. The joke lands
  // better when you are the one person on Beach Road who does.
  beach_rd_soi7: { name: "a paper cone of roasted chestnuts from the man nobody buys from", price: 40, hunger: 25, thirst: 0 },
  central_mall: { name: "a fifty-baht plate from the food court, arctic air included", price: 50, hunger: 55, thirst: 0 },
  night_bazaar: { name: "a plate of something fried and garlicky from the bazaar food court", price: 50, hunger: 50, thirst: -5 },
  // The girls come out of the soi in ones and twos to buy from it, which is the
  // strongest possible statement that a stall is open and serving.
  second_rd_soi6: { name: "whatever the corner stall is doing tonight, in a bag with a rubber band", price: 40, hunger: 40, thirst: -5 },
  // the crocodile outside Central. Priced as the novelty it is — the stall makes
  // its living off people who photograph it, and charges the ones who don't.
  second_rd_mall: { name: "a crocodile skewer off the spit outside Central, charred and startlingly good", price: 120, hunger: 55, thirst: -10 },
};

const _EDIBLE = { moo_ping: 35, som_tam: 50, noodles: 20 };

// The Queen Vic's kitchen, on Aoy's stated hours: basket and chips till
// eleven, after that only crisp (grapevine playtest F6, 2026-08-25 — she had
// the order pad out and the room sold nothing).
// ── The Queen Vic's kitchen ────────────────────────────────────────────────
// _qvMenu() is THE card: one helper, consumed by READ MENU, by _doBuy's routing,
// by autocomplete and by the flyout, so the card and the till cannot disagree.
// Same idiom as _salengItems/_playOptions (the three-surfaces rule).
//
// Hours are the whole character of the place: full menu until eleven, then the
// cook goes home and it is crisps or nothing — that gate already existed and is
// kept. The roast is Sunday only, until nine, and finite.
function _qvClosed() { return G.nightTurn >= 50; }        // 23:00, cook goes home

// How many roasts are left. PURE — no dice, so a reload cannot reroll it and the
// number on the card is the number at the till. The ROOM eats them too, at a
// cover every ROAST_PACE turns, which is what makes the HOUR matter and not just
// the day: turn up at six and there are sixteen, turn up at twenty to nine and
// you are choosing between the last two.
function _roastLeft() {
  if (!_roastDay()) return 0;
  const mine = (G.qvRoast && G.qvRoast.day === G.day) ? G.qvRoast.mine : 0;
  return Math.max(0, ROAST_COVERS - Math.floor(G.nightTurn / ROAST_PACE) - mine);
}
function _roastOn() { return _roastHour(_nightHour()) && _roastLeft() > 0; }

function _qvMenu() {
  if (_qvClosed()) return QV_MENU.filter(d => d.id === "crisps");
  return QV_MENU.filter(d => (d.id !== "roast" || _roastOn()) && (d.id !== "curry" || _curryDay()));
}
function _qvMatchDish(input) {
  const t = String(input || "").toLowerCase();
  return _qvMenu().find(d => d.aliases.some(a => t.includes(a))) || null;
}
// Does this name ANYTHING the kitchen has ever done — on the card tonight or
// not? Routing and availability are different questions: asking for a pie at
// midnight is a kitchen question, and the kitchen's answer is "cook went home",
// not the generic "Not for sale here" the bar gives a man asking for a helicopter.
function _qvNamesDish(input) {
  const t = String(input || "").toLowerCase();
  return QV_MENU.some(d => d.aliases.some(a => t.includes(a)));
}
// What the card says about the roast when you cannot have it — the REASON, in
// Aoy's voice, because "not available" is the answer that teaches a player
// nothing about when to come back.
function _roastNote() {
  if (!_roastDay()) return "Roast — Sundays only, till nine. \u201cCome Sunday, tilac. Early.\u201d";
  if (!_roastHour(_nightHour())) return "Roast — off. \u201cNine o'clock, finish. You come early next week, na.\u201d";
  if (_roastLeft() <= 0) return "Roast — gone. \u201cAll finish! You see the time? Next Sunday you come SIX o'clock.\u201d";
  const n = _roastLeft();
  return "\u0e3f" + QV_ROAST + " \u2014 the Sunday roast, and Aoy holds up fingers: \u201c" + n +
    " left" + (n <= 3 ? " only" : "") + ", tilac.\u201d";
}

// The curry's sibling to _roastNote — no covers to count, just the day.
function _curryNote() {
  return "Curry — Fridays only. “Friday curry, tilac. Today is not Friday.”";
}

function _qvKitchen(arg) {
  const wantsRoast = /roast|beef|yorkshire|sunday/.test(arg || "");
  const wantsCurry = /curry|madras|friday/.test(arg || "");
  // Asked for the roast when there isn't one: answer with the REASON and the
  // hour to come back at, never a flat refusal. This is the line that teaches a
  // player the pub has a week in it.
  if (wantsRoast && !_roastOn()) { _say(_roastNote()); return; }
  if (wantsCurry && !_curryDay() && !_qvClosed()) { _say(_curryNote()); return; }
  if (_qvClosed() && !/crisp/.test(arg || "")) {
    _say("Aoy doesn't even reach for the pad. \u201cKitchen close, tilac \u2014 cook go " +
      "home eleven o'clock, same as England.\u201d A bag of crisps lands on the bar " +
      "instead, unbidden. \u201cCrisp. \u0e3f" + QV_CRISPS + ". Salt and vinegar. Is this or nothing.\u201d");
  }
  if (_fullNo()) return;                  // the kitchen keeps its food, you keep your money
  const dish = _qvMatchDish(arg) ||
    // A bare BUY FOOD / BUY DINNER with no dish named: she picks, because there
    // is one right answer before eleven and only one option after.
    (_qvClosed() ? QV_MENU.find(d => d.id === "crisps") : QV_MENU.find(d => d.id === "basket"));
  if (!dish) { _say("Not on tonight's card. (READ MENU.)"); return; }
  if (G.money < dish.price) {
    _say(_fmt("The kitchen wants \u0e3f{p} and your pocket holds \u0e3f{m}. Aoy files the " +
      "order pad away without comment, which is its own comment.", { p: dish.price, m: G.money }));
    return;
  }
  G.money -= dish.price;
  G.hunger = Math.max(0, G.hunger - dish.hunger);
  if (dish.thirst) G.thirst = Math.max(0, G.thirst + dish.thirst);
  if (dish.id === "roast") {
    G.qvRoast = (G.qvRoast && G.qvRoast.day === G.day) ? G.qvRoast : { day: G.day, mine: 0 };
    G.qvRoast.mine++;
    _say(_fmt("{line} (\u0e3f{m} left.)", { line: _pickVary(_QV_ROAST_LINES, "qvroast"), m: G.money }), "win");
    _addHappy(2);                    // a proper sit-down Sunday dinner, 8,000 miles from it
    const left = _roastLeft();
    if (left > 0 && left <= 3)
      _say(_fmt("(Aoy chalks the number down: {n} left.)", { n: left }), "dim");
    else if (left <= 0)
      _say("(Aoy wipes the board. That was the last one.)", "dim");
    return;
  }
  if (dish.id === "crisps") {
    _say(_fmt("\u0e3f{p} for a bag of crisps. They are exactly what they are. (\u0e3f{m} left.)",
      { p: dish.price, m: G.money }));
    return;
  }
  const pool = dish.id === "basket" ? _QV_BASKET_LINES : _QV_DISH_LINES[dish.id];
  _say(_fmt("{line} (\u0e3f{m} left.)", { line: _pickVary(pool, "qvdish:" + dish.id), m: G.money }), "win");
  _addHappy(1);
}

// The card itself, rendered from _qvMenu() so the prices come from the constants
// and the list cannot drift from what the till will take.
function _qvCard() {
  _say("The Queen Vic \u2014 KITCHEN", "win");
  for (const d of _qvMenu())
    if (d.id !== "roast" && d.id !== "curry") _say("  \u0e3f" + d.price + " \u2014 " + d.name, "dim");
  if (_curryDay()) {
    const curry = QV_MENU.find(d => d.id === "curry");
    if (!_qvClosed()) _say("  \u0e3f" + curry.price + " \u2014 " + curry.name, "dim");
  } else _say("  " + _curryNote(), "dim");
  _say("  " + _roastNote(), "dim");
  _say(_qvClosed()
    ? "(Cook went home at eleven. BUY CRISPS.)"
    : "(Kitchen till eleven. BUY " + (_roastOn() ? "ROAST" : "PIE") + ", or name anything on it.)", "dim");
}

// A roast in Thailand is a specific act of homesickness performed in public, and
// the pub knows exactly what it is doing. Pooled deep because Sunday comes round
// every week and the expat stage runs for a year.
const _QV_ROAST_LINES = [
  "It arrives on a plate too hot to hold: beef, three roast potatoes with the corners gone dark, a Yorkshire like a small collapsed hat, and gravy in its own jug because the cook has opinions. Somebody two tables down says \u201cbloody hell\u201d with real feeling.",
  "Aoy sets it down and stands there half a second longer than she needs to, watching your face. The carrots are done properly. The gravy is not from a packet and she wants you to notice, and you do, and something passes between you that neither of you says.",
  "Beef, potatoes, a Yorkshire, and the greens that in England you would have left. You do not leave them. Eight thousand miles will do that to a man and a plate of cabbage.",
  "The plate comes out under a cloud of its own steam and the whole rail turns to look, the way men do, and one of them says what they always say, which is that you'd pay triple for this at home and it wouldn't be as good.",
  "It is enormous and it is Sunday and outside the door it is thirty-one degrees. The cook, whom you have never seen, has put a whole roast dinner into the tropics for the twelfth year running, and nobody has ever asked him to stop.",
];
const _QV_DISH_LINES = {
  pie: [
    "The pie comes with the pastry lid slightly off-centre, which is how you know a person made it. Steak, ale, a chip mountain, and Aoy's small nod of approval at a man who orders properly.",
    "It arrives volcanic. You go in too early and pay for it, and Aoy, passing, says \u201cSlowly, tilac\u201d without breaking stride or looking at you.",
    "Steak and ale, and the gravy inside is doing the work of a much more expensive dish. The cook made four this morning. This is the third.",
  ],
  curry: [
    "Friday's curry, which has been Friday's curry since Tuesday and is all the better for it. It comes with rice, a poppadum nobody promised, and a heat that arrives about ten seconds late.",
    "The curry lands with a small dish of something green that Aoy declines to explain. It is superb and it is not, by any measure, an English curry, and neither of those facts is a complaint.",
    "He makes too much every Friday and it improves all week, which is either good kitchen management or the reason the pub still has a kitchen. Either way it is very good and there is far too much of it.",
  ],
  plough: [
    "Cheese, pickle, a bread roll, half a tomato and two things off the pickle jar. It is exactly what it says and it is the correct order in this heat, which is the sort of thing you only work out in your second week.",
    "The cold option, and the only plate in Pattaya that comes with a knife you're expected to use on cheese. Aoy brings extra pickle without being asked, having formed a view.",
    "A ploughman's, assembled by a woman from Ubon who has never been to England and has the details exactly right because Nuch showed her once, eleven years ago.",
  ],
};

const _QV_BASKET_LINES = [
  "Aoy writes it without asking what you want, because there is one right answer. The basket arrives molten: chips, scampi, a sausage riding shotgun, vinegar in a bottle sticky enough to be structural. It is England with the heating on.",
  "The basket-and-chips lands with a bottle of vinegar and a roll of kitchen paper, which is the whole of the Vic's table service and the whole of what the dish requires. Somebody's fryer knows exactly what it is doing.",
  "Ten minutes and the kitchen hatch bangs: basket, chips, the pie because he made pie. Aoy delivers it with the quiet pride of a woman whose fryer has never once been beaten on this street.",
]

function _doEat(arg) {
  // "EAT WITH TAN" is the other natural phrasing of his standing food invite —
  // route it to the same scene rather than the you're-not-carrying-that shrug.
  if (arg && /\btan\b/.test(arg) && _npcsHere().includes("tan")) { _tanFood(); return; }
  // ...and the same for Mot. Priya tried seven phrasings of the dinner Madam Oy
  // and Mot both promise — buy mot dinner, buy khao man gai, buy food for mot,
  // give 40 to mot, follow mot, eat with mot — and every one dead-ended. The
  // house rule is that a plausible verb never falls through to an item-parse
  // error; a verb the game's own prose TOLD you to type certainly must not.
  if (arg && /\bmot\b/.test(arg) && _npcsHere().includes("mot")) { _motDinner(); return; }
  // Cherry Pop's bowl of maraschino cherries: a real nibble, but not a hunger
  // farm — one free cherry a night, the rest is just décor you're pawing at.
  if (arg && /\bcherr/.test(arg) && G.room === "cherry_pop") {
    if (G.cherryDay === G.day) {
      _say("You've already had your cherry off the communal bowl tonight. A second dig " +
        "under the mamasan's eye is a look you can't afford.");
      return;
    }
    G.cherryDay = G.day;
    G.hunger = Math.max(0, G.hunger - 1);
    _say("You fish a maraschino cherry from the sticky bowl and eat it. Syrupy, artificial, " +
      "faintly of the last decade — but it's something, and the hunger notices, barely.");
    return;
  }
  // Mama Yai's whole pitch is that the som tam "arrives unasked" — so it has
  // to actually arrive on EAT (bare, or naming it), not refuse like every
  // other unbuyable BUY SOM TAM in town (price auditor playtest, 2026-08-23:
  // the room's own defining claim was unreachable by any command).
  if (G.room === "mama_yai" && (!arg || /som ?tam|food|plate|dinner|kitchen/.test(arg))) {
    if (G.mamaYaiDay === G.day) {
      _say("Mama Yai clocks you eyeing the kitchen again. \"One plate a night, tilac — " +
        "I'm not running a buffet.\" She's not wrong.");
      return;
    }
    G.mamaYaiDay = G.day;
    G.hunger = Math.max(0, G.hunger - 30);
    _say("Nobody took your order. A plate of som tam just arrives, pounded to order, " +
      "correct in every way — fish sauce, lime, the chilli count of someone who trusts " +
      "you can take it. \"Kin, kin,\" Mama Yai says, already walking off. On the house, " +
      "same as it is for everyone.", "win");
    _addHappy(1);
    return;
  }
  if (G.room === "queen_vic" && (!arg || /food|basket|chip|crisp|pie|scampi/.test(arg))) {
    _qvKitchen(arg); return;
  }
  const inv = _inv().filter(i => _EDIBLE[i] !== undefined);
  const id = arg ? inv.find(i => ITEMS[i].name.toLowerCase().includes(arg) ||
    ITEMS[i].aliases.some(a => a.includes(arg))) : inv[0];
  if (!id && (FOOD_STALLS[G.room] || _room().food)) { _doBuy(arg || "food"); return; } // a kitchen: EAT means order — the named dish, if you named one
  if (!id) { _say(arg ? "You're not carrying that, or it isn't food." : "Nothing edible on you. The street sells everything."); return; }
  if (id === "som_tam" && _flag("somTamAccepted") && !_flag("somTamDelivered")) {
    _say("It's Ploy's som tam. You eat Ploy's som tam. It is magnificent, and you " +
      "are a terrible person.", "alert");
  } else {
    _say(`You eat the ${ITEMS[id].name}. ` + (id === "noodles" ? "Dry. Crunchy. A choice." : "Better than it has any right to be."));
  }
  G.itemLoc[id] = null;
  G.hunger = Math.max(0, G.hunger - _EDIBLE[id]);
  if (id === "noodles") G.thirst = Math.min(100, G.thirst + 10);
  _addHappy(1);
}

// ── Act One: The Last Baht Bus ───────────────────────────────────────────────
// Reaching Room 412 with the wallet completes the intro quest — scored, and
// converted into a happiness head start. The night does NOT end.

// The opening ends when you have the WALLET, not when you have gone to bed.
// Mario's call and he is right: the objective a player actually feels is
// getting his wallet back, and a man who has just got it back does not walk
// thirteen turns home across town, he goes out. Measured, that last leg was
// 13 of the 33-turn minimum run — nearly half of it, spent after the puzzle
// was already solved.
//
// The room safe stays a room thing (see _roomSafeBeat): it is in your room, so
// you collect it when you get there, whenever that is.
// The emergency stash is in the room safe, and the room safe is in the room.
// It used to be part of the Act One screen because that screen fired at your
// bed; now the screen fires wherever you are standing when the wallet turns up,
// so the money waits for you like the safe always did.
function _roomSafeBeat() {
  if (G.mode === "soi6") return; // no wallet was ever lost on the Soi 6 week — no "emergency stash" either (playtest 2026-08-22)
  if (!_flag("act1Done") || _flag("roomSafeOpened")) return;
  if (G.room !== _hotelRoomId()) return;
  _setFlag("roomSafeOpened");
  G.act1SafeDue = false;
  G.money += SAFE_CASH;
  _say(`Your own room, and the key card works. The safe in the wardrobe opens on the ` +
    `second try: passport, return ticket \u2014 and the emergency stash you very nearly ` +
    `forgot you packed. \u0e3f${SAFE_CASH}. (\u0e3f${G.money} in pocket. The vacation is ` +
    "officially back on.)", "win");
}

function _checkAct1() {
  if (!_flag("hasWallet") || _flag("act1Done")) return;
  _setFlag("act1Done");
  G.act1SafeDue = true; // the room safe owes you the stash — paid on your first time IN the room, walked or respawned
  let score = 0;
  const lines = [];
  score += 50;
  lines.push("✓ Wallet recovered (+50)");
  if (_flag("oyGaveWallet")) { score += 15; lines.push("✓ ...earned back with manners, not burglary (+15)"); }
  if (G.battery > 0) { score += 10; lines.push(`✓ Phone survived at ${G.battery}% (+10)`); }
  if (G.money > 0) { score += Math.min(20, G.money); lines.push(`✓ ฿${G.money} still in pocket (+${Math.min(20, G.money)})`); }
  for (const [f, label] of [
    ["helmetDelivered", "Did Bank a solid"],
    ["somTamDelivered", "Fed Ploy the good som tam"],
    ["greetedFon", "Made Fon's evening with one word of Thai"],
    ["waiedOy", "Wai'd the Mamasan like you meant it"],
    ["beatBargirlC4", "Beat a bargirl at Connect Four (unheard of)"],
    ["hitJackpot", "Shut the box — JACKPOT"],
  ]) {
    if (_flag(f)) { score += 5; lines.push(`✓ ${label} (+5)`); }
  }
  if (_flag("pinPart71") && _flag("pinPart9")) { score += 5; lines.push("✓ Assembled the safe code from soi gossip (+5)"); }
  if (G.itemLoc.hair_tonic === "inventory") { score += 2; lines.push("✓ Proud owner of one bottle of miracle hair tonic (+2, condolences)"); }
  G.score = score;

  _say("═══════════════════════════════════", "win");
  _say("You get somewhere with light and check it properly, the way a man checks a " +
    "wallet he did not expect to see again: cards, key card, the cash. It is all " +
    "there, or near enough. Around you Pattaya carries on exactly as it was — the " +
    "bars, the buses, the whole neon machine, entirely indifferent to the best " +
    "thing that has happened to you all week.", "win");
  _say("★ ACT ONE COMPLETE: THE LAST BAHT BUS ★", "win");
  for (const l of lines) _say(l, "dim");
  _say(`ACT ONE SCORE: ${score}`, "win");
  // The polite route skips three milestones outright — you never need the door
  // trick or either half of the safe code if you wai the mamasan and simply
  // ask. That is the intended best answer and it should not read as having
  // missed something; but the player should know there WAS another way in,
  // because that is content he has not seen and a reason to come back.
  if (_flag("oyGaveWallet") && _act1Progress() < _ACT1_MILESTONES.length) {
    _say("(Being polite is one way of solving a problem. There was another way into that " +
      "office tonight — a door, a song, and a number the soi would have told you if you had " +
      "asked the right four people. It is still there.)", "dim");
  }
  _addHappy(Math.max(5, Math.round(score / 4)));
  _setFlag("act1Done"); // stage advances
  G.stage = "vacation";
  _say("");
  _say("You could go back to the hotel and lie down. Nobody would blame you. But " +
    "the key card is in your hand for the first time tonight, the city is only " +
    "just getting started, and for the first time since you woke up on that sand " +
    "nobody out here has anything of yours.", "room");
  _say(`★ THE VACATION IS YOURS — ${8 - G.day} night${8 - G.day === 1 ? "" : "s"} ` +
    "left. Goal: สบายสบาย — get happy. ★", "win");
  _say("(SCORE tracks happiness, the clock, and your body. Eat, drink water, " +
    "don't get bitten. SLEEP here ends a night on your terms; the city ends it " +
    "otherwise. RESTART any time for a fresh trip.)", "dim");
}


// ── Settling up early, which is the whole point of having a landlord ────────
// The monthly sweep takes rent first, then the note (only one of them can act:
// miss the old man and you carry it, miss the rent two months and somebody is
// measuring your frontage). This is the same order, done on purpose, mid-month,
// with the money you have now — and crucially it CLEARS THE EVICTION CLOCK,
// because a month that gets paid is not a month you were short.
function _payCreditor(arg) {
  // PAY KEY MONEY (notes, the cash price) / TRANSFER KEY MONEY (the app, the list price)
  if (/key|pae ?jia|lease/i.test(arg || "") && G.bar && G.bar.lease) {   // due before opening night, so above the owned gate
    const b = G.bar, l = b.lease;
    if (!l) { _say("No lease in your name to pay key money on."); return; }
    if (l.paid) { _say(l.how === "billed" ? "It went on the first rent at the full figure. That ship has sailed, at list." : "Paid, and he has the envelope to prove it — or would, if he kept receipts."); return; }
    if (/transfer|app|bank|wire/i.test(arg || "")) _leaseTransfer(); else _leaseCash();
    return;
  }
  if (!_barOwned() || !G.bar) {
    _say("You have no landlord and no note. Whatever you owe in this town, you owe it to somebody else.");
    return;
  }
  const b = G.bar;
  const wantsNote = /note|old man|bert|arrears/i.test(arg || "") && !/rent|landlord/i.test(arg || "");
  const rentOwed = Math.max(0, b.rentOwed || 0);
  const arrears = Math.max(0, b.arrears || 0);
  const target = wantsNote ? arrears : rentOwed;
  const who = wantsNote ? "the old man" : "the landlord";
  if (target <= 0) {
    _say(rentOwed || arrears
      ? `Nothing outstanding to ${who}. (You are ฿${_num(rentOwed || arrears)} behind with the other one.)`
      : "Square with both of them. It is a good feeling and it does not last.");
    return;
  }
  const pot = Math.max(0, b.cash) + G.money;
  if (pot <= 0) { _say(`You have nothing to give ${who}, from the till or out of your own pocket.`); return; }
  const pay = Math.min(target, pot);
  const fromTill = Math.min(Math.max(b.cash, 0), pay);
  b.cash -= fromTill;
  const fromPocket = pay - fromTill;
  if (fromPocket > 0) { G.money -= fromPocket; b.pocketDrawn = (b.pocketDrawn || 0) + fromPocket; }
  const src = [fromTill > 0 ? "the till" : null, fromPocket > 0 ? "your own pocket" : null].filter(Boolean).join(" and ");
  if (wantsNote) {
    b.arrears = arrears - pay;
    _say(`฿${_num(pay)} out of ${src}, into the old man's account. He does not ring to acknowledge it; ` +
      `he never has.` + (b.arrears > 0 ? ` ฿${_num(b.arrears)} still on the slate.` : " Straight with him."), "win");
    return;
  }
  b.rentOwed = rentOwed - pay;
  if (b.rentOwed <= 0) {
    // THE POINT OF THE VERB. Two short months lose you the bar; paying stops
    // the clock, which is exactly what a publican walks the money round for.
    const wasShort = b.rentShort || 0;
    b.rentShort = 0;
    _say(`฿${_num(pay)} out of ${src}, counted twice and handed over. He writes it in the book, ` +
      `puts the book away, and shakes your hand — which he did not do last time.` +
      (wasShort ? " The clock he started is stopped." : ""), "win");
  } else {
    _say(`฿${_num(pay)} out of ${src}. He takes it, counts it, and does not pretend it is all of it. ` +
      `฿${_num(b.rentOwed)} still short, and he is still counting the months.`, "alert");
  }
}
