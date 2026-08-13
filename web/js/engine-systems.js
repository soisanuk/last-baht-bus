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

function _doBorrow(arg) {
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
    if (G.loan.owed <= 0) {
      G.loan = null;
      _say(`(Nira's cousins catch you outside the 7-Eleven. No drama, no marks — they just wait ` +
        `while you empty your pockets: ฿${take}. "Nira says thank you. She says don't do this ` +
        `again." Square. The lesson was never going to be cheap.)`, "alert");
    } else {
      _say(`(Nira's cousins find you and lift the ฿${take} you're carrying off the ฿${G.loan.owed} ` +
        `you owe. "The rest soon, na." They are very calm about it. That's the frightening part.)`, "alert");
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
  if (!r || (typeof _sheltered === "function" && _sheltered(G.room))) return false;
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
  const rm = _room();
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
      _say(`${name} taps the till: somebody has to count the money. (Cashiers do go, ` +
        "sometimes — for the right customer, on the right night. The bell defines both.)");
      return;
    }
  }
  if (!_flag("act1Done")) {
    _say("And take her where? You have no room key, sand in your shoes, and a " +
      "wallet situation. Sort your night out first, Casanova.");
    return;
  }
  if ((G.soc.heat[G.room] || 0) > 0) {
    _say("The mamasan intercepts the negotiation with one raised finger. After " +
      "tonight's behaviour? “Not tonight, tilac.” The finger does not negotiate.");
    return;
  }
  const bt = _room().barType;
  // Do right by Bert (or spite White Dish) and his whole bar warms to you: his
  // girls need less coaxing and won't turn a friend of Bert's down. The mirror
  // of the WDG-stooge freeze-out above.
  const bertAlly = G.room === "stinky_bar" && (_faction("indie") > 0 || _faction("wdg") < 0);
  if (_favor(id) < (bertAlly ? 1 : bt === "soi6" ? 2 : 4)) {
    _say(bt === "soi6" ?
      `${name} laughs, not unkindly: “Lady drink first, na. One or three.” Even ` +
      "Soi 6 has liturgy." :
      `${name} pats your hand: “You sweet. But buy me drink, talk to me a little — ` +
      "this is Pattaya, not a vending machine.”");
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
  // The negotiation. On Soi 6 the girl quotes upfront — volume business, no
  // mystery. Everywhere else the girl won't name the number (she gets a cut):
  // the mamasan or the cashier drifts over to do the arithmetic.
  const { st, lt } = _barfinePrices(bt, id);
  G.pendingBf = { id, st, lt, room: G.room };
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
  if (dmin && _favor(id) < dmin) return { kind: "drinkmin", need: dmin };
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
    _say(`${name} just gives you the same small headshake as before. She told ` +
      "you already; the answer hasn't changed since your last drink.");
    return;
  }
  const lines = {
    period: `${name} squeezes your hand and tells you straight, before a single ` +
      "baht moves: “Cannot tonight, tilac. Lady time, jing jing.” The honest " +
      "ones tell you BEFORE the fine is paid. Remember that.",
    temple: `${name} makes an apologetic temple of her own hands: “Cannot, na. ` +
      "I go temple in morning, make merit with my mama. Buddha first, boom " +
      "boom later.” It has the ring of complete truth.",
    draw: `${name} says yes with her whole face — but the mamasan is already at her ` +
      "shoulder, all smiles and steel: “This one very popular, she bring me many " +
      "customer. You want? Twenty-five lady drink, five thousand bar fine.” It is " +
      "not a price. It is a NO with a number on it. (Come back after midnight, when " +
      "the floor is thin — she'll be cheaper, but never cheap.)",
    sponsor: `${name} touches your arm, honestly sorry: “Cannot this week, tilac. My ` +
      "friend here — he take care me, so I no working while he in town. You " +
      "understand, na?” Everyone understands. It's a calendar, not a heartbreak.",
    dislike: `${name} looks at you kindly, which is worse: “You nice man. But ` +
      "no, na.” She signals the mamasan off with one flick of the eyes, and " +
      "the ledger never even opens. No is a complete sentence here.",
    cheap: `${name} does a quick, visible arithmetic on your evening's tab — ` +
      "the one lady drink, nursed — and pats your knee: “Maybe you buy me " +
      "drink first, na? Talk more.” The words CHEAP CHARLIE hang politely " +
      "unspoken. (Warm her up properly and ask again.)",
    mess: `${name} leans back an honest inch. “Ooh. You smell like whole bar, ` +
      "tilac. Maybe shower first, sleep little bit.” Hard to argue from " +
      `${G.soc.drunk} bottles deep. (Sober up and try again.)`,
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
function _bfPrompt() {
  const { st, lt } = G.pendingBf;
  const p = n => n ? "฿" + n : _L("waived — past midnight");
  _say(_fmt("(SHORT TIME {st} — one round, the night carries on · LONG TIME {lt} — overnight · NO backs out.)",
    { st: p(st), lt: p(lt) }), "dim");
}

// The player answered the negotiation. kind: "st" | "lt" | "open" — open is
// the classic newbie mistake, money waved at an unnegotiated contract; an
// operator prices it accordingly and has already read you as a mark.
function _bfResolve(kind) {
  const { id, st, lt } = G.pendingBf;
  G.pendingBf = null;
  const name = NPCS[id].name;
  const bt = _room().barType;
  let price = kind === "st" ? st : lt;
  let marked = false; // she read you as a newbie who'll swallow it
  if (kind === "open") {
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
      _say(`(${NPCS[other].name} watches you leave with ${name} and turns very ` +
        "deliberately back to her phone. That will cost you — and not in baht.)", "dim");
    }
  }
  if (price === 0 && !offBook) {
    _say("The mamasan glances at the clock — past midnight — closes the ledger, and " +
      "waves the fee away with two fingers. The barfine walks out with the girl " +
      "soon anyway; only the famous ones stay on the book all night.", "dim");
  } else if (G.nightTurn >= 60 && POPULAR_GIRLS.includes(id)) {
    _say(`Past midnight the book usually closes — but not for ${name}. The mamasan ` +
      `taps the fee, unbudging: for HER, any hour is peak. ฿${price}.`, "dim");
  }
  // ── SHORT TIME: one round, off she goes, the night carries on ──
  if (kind === "st") {
    if (bt === "soi6") {
      _say((price ? `฿${price} to the till and ${name} takes` :
        `No fee crosses the till — she squared it with the mama herself — and ${name} takes`) +
        " your hand with the confidence of " +
        "home advantage. “Upstairs” turns out to be exactly as advertised. Some " +
        "time later you are back on your stool, thinking about nothing at all, " +
        `while she fixes her hair in the till mirror. (฿${G.money} left.)`, "win");
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
      _say((price ? `฿${price} to the ledger, and a` : "A") +
        ` short walk to a short-time hotel with a ceiling fan doing its slow count over the ` +
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
    _addBond(id, 2); // a short-time deepens the bond a little
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
    _encPrompt(
      [(price ? `฿${price} to the mamasan, and ` : "") +
        `${name} takes your hand — but instead of the taxi rank she wheels a scuffed Honda ` +
        `Click off its stand, thumbs it awake, and pats the seat behind her. "Tonight I not ` +
        `want hotel yet. Come — I show you MY Pattaya, the real one. Hold me tight, na, I ` +
        `drive little bit crazy." (฿${G.money} left.)`, "win"],
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
  const pool = venues.filter(v => !seen.includes(v.key));
  const src = pool.length ? pool : venues;
  return src[Math.floor(_rand() * src.length)];
}

function _nightRide(input) {
  const seq = G.rideSeq;
  if (!seq) { _say("The night's already carried you off. Sleep it off."); return; } // state lost — safety
  const id = seq.id, name = NPCS[id].name;
  const go = /\b(ride|yes|on|more|another|sure|ok|okay|go|keep|again|deeper|why not|lets?|come|drive)\b/.test(input) &&
    !/\bno\b|hotel|home|enough|call|done|bed|sleep|stop|tired|late|finish/.test(input);
  if (!go) return _endRide(seq, "choice");
  if (G.money < RIDE_MIN_CASH && seq.stops > 0) return _endRide(seq, "broke");
  // a random stop
  const venue = _pickRideVenue(seq.seen);
  seq.seen.push(venue.key); if (seq.seen.length > 3) seq.seen.shift(); // no immediate venue repeats
  let hi = Math.floor(_rand() * _RIDE_HOP.length);
  if (hi === seq.lastHop) hi = (hi + 1) % _RIDE_HOP.length; // and no back-to-back identical ride line
  seq.lastHop = hi;
  const hop = _RIDE_HOP[hi];
  const scene = venue.scenes[Math.floor(_rand() * venue.scenes.length)](name);
  const cost = venue.lo + Math.floor(_rand() * (venue.hi - venue.lo + 1));
  const paid = Math.min(cost, G.money);
  G.money -= paid;
  seq.spent += paid; seq.stops++; seq.sanuk += venue.sanuk;
  _addBond(id, 1); // every stop deepens the bond
  _say(`${hop}\n\n${scene}` +
    (paid ? ` (฿${paid}. ฿${G.money} left.)` : " (Free. The best things here are.)"), "win");
  _addHappy(venue.sanuk); // does NOT jade — a bonded night is the one that keeps giving
  if (seq.stops >= RIDE_MAX_STOPS) return _endRide(seq, "dawn");
  G.pendingEnc = "nightride";
  _encPrompt([`${name} looks back over her shoulder, engine idling, one eyebrow up.`, "room"],
    [`(RIDE ON — wherever she takes you next · or call it a night with her.)`, "dim"]);
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
    close = `The sky over the gulf goes the colour of a bruise healing, and ${name} feels you ` +
      `notice it. "Aaah. Morning already. This town, na — always morning too soon." She points ` +
      `the bike toward a bed, hers or yours, and lets the last of the dark carry you there.`;
  } else {
    close = `"Okay," she says at last, killing the engine one final time. "Enough Pattaya for you ` +
      `tonight. Now—" and the grin turns private "—now you come see MY room, not some hotel. ` +
      `Get on. Last ride." And it is.`;
  }
  _say(close, "win");
  if (great) {
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
    _say(`You lay it out — ${detail}. ${mn}'s face does not change, which is how ` +
      `you know it's serious. One syllable across the room and ${gn} is standing ` +
      "in front of you, wai-ing low, counting your refund out of her OWN purse " +
      `note by note while the whole bar studies its drinks. “Second time,” ${mn} ` +
      "says to nobody in particular, in English, so it travels. The girls near " +
      `the door make space around ${gn} the way people do around someone whose ` +
      `stool is already empty. (฿${inc.fine} back — ฿${G.money}.)`, "win");
  } else {
    _say(`You lay it out — ${detail}. ${mn} listens with the stillness of a ` +
      "woman doing damage arithmetic: one unhappy farang tells ten, and “bad " +
      "girls” talk empties a bar faster than a raid. The refund appears from " +
      `the till without ceremony. “Not morality, tilac. Business.” (฿${inc.fine} ` +
      `back — ฿${G.money}.)`, "win");
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
  newGame();
  G.act1Best = best;      // the record…
  G.act1Tries = tries;    // …and the attempt count survive the reset (unlocking HINT)
  if (identity && identity.origin) G.player = identity;
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
  ["hasWallet", "It's in Madam Oy's safe at Rainbow Girls, LK Metro. Oy respects manners: WAI her " +
    "properly, then ask about the wallet — a polite man, she may just hand it back. (The hard way " +
    "in: slip into her office when DJ Beer plays 'Sabai Sabai', and crack the safe — her old " +
    "dancer's number was 71, and she puts a lucky 9 on the end of every code. Candy, Ploy, Pim and " +
    "Daeng each hold a piece.)"],
];
// Resolve a quest's `at` (an NPC id or a room id) to a live location clause for
// a hint — where the person actually is TODAY (NPCs can move), which venue, and
// the geographic area. Returns "" when it isn't worth saying (unknown, or you're
// already standing there).
function _questWhere(at) {
  if (!at) return "";
  if (NPCS[at]) {
    const room = _npcRoom(at);
    if (room === G.room || _npcsHere().includes(at)) return ""; // she's right here
    const r = ROOMS[room];
    return r ? _fmt(" {who} is at {v}, over in {r}.",
      { who: NPCS[at].name, v: _barName(room), r: r.region }) : "";
  }
  if (PATRONS[at]) {
    // A patron giver moves too — a shuttled regular (Glam: home bar early, walked
    // across after 22:00) or, if hopping is ever re-enabled, an hourly drift. Read
    // his LIVE room via _patronRoom so the clue never points at a stale bar.
    const room = _patronRoom(at);
    if (!room || room === G.room || _patronsHere().includes(at)) return "";
    const r = ROOMS[room];
    return r ? _fmt(" {who} is at {v}, over in {r}.",
      { who: PATRONS[at].name, v: _barName(room), r: r.region }) : "";
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
        { name: _L(q.name), desc: _L(q.desc), where: _questWhere(q.at) }), "win");
      return;
    }
    const offered = Object.keys(QUESTS).filter(q => G.quests[q] === "offered");
    if (offered.length) {
      const q = QUESTS[offered[0]];
      const giver = NPCS[q.giver] ? NPCS[q.giver].name : "Someone";
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
  const next = _ACT1_HINTS.find(([f]) => !_flag(f));
  _say(_fmt("The soi whispers — you're {r}/{t} of the way home. ", { r: reached, t: total }) +
    (next ? next[1] :
      "Everything's in hand. Now just get to room 412 in Naklua before dawn takes the night."), "win");
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
  if (q.trust && q.giver && _npcState(q.giver).trust < q.trust) return false;
  // Soi 6 mode confines you to the pocket, so don't offer a job whose target
  // (a room, or an NPC's bar) lies outside it — e.g. the Shamrock Dog, out on
  // the Darkside. You'd accept it and have no way to finish it this trip.
  if (G.mode === "soi6") {
    // the GIVER must be reachable in the pocket — else you can never be offered it
    // in-fiction, yet ACCEPT-autocomplete (which lists _questAvailable) would still
    // surface it and let you accept a quest you can't finish (e.g. Candy's 'recce',
    // giver off-map at Candy Bar, and with no q.at to catch it below).
    const giverRoom = q.giver && (NPCS[q.giver] ? _npcRoom(q.giver) :
      PATRONS[q.giver] ? _patronRoom(q.giver) : null);
    if (giverRoom && !SOI6_ROOMS.has(giverRoom)) return false;
    // and the target (a room, or an NPC/patron's bar) must be in-pocket too
    if (q.at) {
      const targetRoom = ROOMS[q.at] ? q.at :
        NPCS[q.at] ? _npcRoom(q.at) :
        PATRONS[q.at] ? _patronRoom(q.at) : null;
      if (targetRoom && !SOI6_ROOMS.has(targetRoom)) return false;
    }
  }
  return q.deps.every(d => G.quests[d] === "done");
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
const _QUEST_HAIL = [
  "{who} lifts his chin at you from behind the rail. \u201cOi. You. Got a minute, or are you " +
    "just here to drink?\u201d",
  "\u201cHere \u2014 before you sit down.\u201d {who} has the look of a man who has been waiting " +
    "for somebody to walk in who isn't a regular.",
  "{who} catches your eye and jerks his head, the universal come-here of a man with something " +
    "he wants doing and nobody obvious to do it.",
];

function _questHail() {
  if (G.questHailed) return;                       // once ever, not once a night
  if (Object.keys(G.quests || {}).length) return;  // you've had a job — you know the drill
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (q.vignette || !q.giver || !_questAvailable(qid)) continue;
    if (_npcRoom(q.giver) !== G.room || !NPCS[q.giver]) continue;
    G.questHailed = true;
    _say(_fmt(_pickVary(_QUEST_HAIL, "qhail"), { who: NPCS[q.giver].name }), "win");
    _questOffer(q.giver);
    return;
  }
}

function _questOffer(npcId) {
  // Don't pile a job offer on top of a question the giver just put to you — let
  // the player answer first (it reads as one overwhelming turn otherwise, and it's
  // unclear which thing to respond to). The offer surfaces next time you talk.
  if (G.convoQ) return;
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (q.giver !== npcId || !_questAvailable(qid)) continue;
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
      { who: NPCS[npcId].name, name: _L(q.name), desc: _questPitch(_L(q.desc)) }), "win");
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
  const qid = _findQuest(arg) ||
    Object.keys(QUESTS).find(q => G.quests[q] === "offered");
  if (!qid) { _say("Accept what? (QUESTS lists what's on offer.)"); return; }
  const q = QUESTS[qid];
  if (G.quests[qid] === "active") { _say("Already on it."); return; }
  if (G.quests[qid] === "done") { _say("That one's finished. Bask."); return; }
  if (G.quests[qid] !== "offered" && !_questAvailable(qid)) {
    _say("You've heard of it, but nobody's actually offered it to you yet."); return;
  }
  G.quests[qid] = "active";
  _say(_fmt("✦ Quest accepted: {name}", { name: _L(q.name) }), "win");
  _say(q.desc, "dim");
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
  const seen = {}, all = {};
  for (const [id, r] of Object.entries(ROOMS)) {
    all[r.region] = true;
    if (G.visited && G.visited[id]) seen[r.region] = true;
  }
  const unseen = Object.keys(all).filter(rg => !seen[rg] && rg !== "Myth Night");
  if (unseen.length) {
    // No claim about how you'd get there: some of these are a walk, some a bus,
    // and the lead shouldn't guess. What IS reliably true is that the districts
    // do not look like each other.
    out.push(_fmt("You have not set foot in {where} yet, and it looks nothing like this stretch.",
      { where: unseen[Math.floor(_hh("leads" + G.day, 7) % unseen.length)] }));
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
      _say(_fmt("  {mark} {label}", { mark: _flag(f) ? "✓" : "·", label: _L(label) }), "dim");
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
      { name: _L(q.name), desc: _L(q.desc), where: _questWhere(q.at) }), "win"); shown++; }
    else if (st === "offered") { _say(_fmt("✦ On offer: {name} (ACCEPT {id})",
      { name: _L(q.name), id: qid.toUpperCase() }), "dim"); shown++; }
    else if (st === "done") { _say(`✓ ${q.name}`, "dim"); shown++; }
  }
  if (!shown) _sayLeads(false);
  else if (!rows.some(([qid]) => G.quests[qid] === "active") && G.stage !== "act1") {
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
};
const _TAN_WHERE = {
  doyle:  "an Englishman who sits where he can watch a door — the pub up in Naklua",
  wayne:  "a loud Australian with a folder of paperwork, down the Golden Dragon",
  roy:    "an old fellow on the same stool every night, Cherry Pop, since before you were coming here",
  macca:  "a man buying rounds he cannot afford, Sunset Dreams way",
  pete:   "a very quiet one at the Sandy Toes, corner stool, back to the wall",
  rob:    "a fellow at the Kitten Corner who looks like he is waiting for a phone call",
  barry:  "a man in golf clothes at the Ruby Kiss who has not played golf",
};

function _tanOthers() {
  const cast = ["doyle", "wayne", "roy", "macca", "pete", "rob", "barry"]
    .filter(id => NPCS[id] && _npcActive(id));            // the one you ARE is not out there
  const met = cast.filter(id => G.known && G.known[id] && (G.talked && G.talked[id]));
  const rest = cast.filter(id => met.indexOf(id) < 0);

  // Too early: he doesn't hand a stranger the passenger list.
  if (!met.length) {
    _say("“The others?” Tan lets that sit a moment, and does not pick it up. " +
      "“You have been here two days, my friend. Meet somebody first — then ask me who they are, " +
      "and I will tell you, because I will already know.”");
    return true;
  }

  _say("“The others.” The grin arrives. “I drove every one of them in from the airport, my friend. " +
    "One at a time, telling me everything before we reached Second Road. You want to know a town, " +
    "you don't ask the mayor — you ask the driver. The driver is the one man they forget is in the room.”");
  _say("He counts them off like a manifest, because that is precisely what he is doing: " +
    met.map(id => NPCS[id].name + ", " + _TAN_READ[id]).join("; ") + ".", "win");

  if (rest.length) {
    const pick = rest.slice(0, 2).map(id => _TAN_WHERE[id]);
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

function _pushMsg(from, text, gives, fromName, photo) {
  // fromName carries a display name for senders that aren't NPCs (e.g. the Soi
  // Dog Foundation broadcast); NPC texts leave it null and render by NPCS name.
  // photo (a caption string) marks a texted selfie — rendered with her portrait
  // and filed in the gallery when read.
  G.phone.inbox.push({ from, text, turn: G.turns, read: false, gives: gives || 0,
    fromName: fromName || null, photo: photo || null });
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
    const bar = _barName(_npcRoom(id)) || "around";
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
  // the punter's book of GIRLS — the fixer doesn't rank on a bond ladder
  const ids = Object.keys(G.phone.contacts).filter(id => G.phone.contacts[id] && NPC_ROLES[id]);
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
    _say(_fmt("({n} number{s} \u2014 out of {k} ladies you have actually met.)",
      { n: ids.length, s: ids.length === 1 ? "" : "s", k: knownLadies }), "dim");
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
  _say(`Phones come out, LINE QR codes are scanned, and ${NPCS[id].name} types your ` +
    "name into her contacts with three emoji you don't get to see. You have her " +
    "number now — and she, forever, has yours.", "win");
  _addHappy(1);
  if (id === "bee" && G.quests.bee_number === "active") {
    _say("Bee taps her banking app pointedly. “Investor send money NOW, na. Hundred " +
      "baht. For LUCK.” (SEND 100 TO BEE)", "dim");
  }
}

function _doMessage(arg) {
  if (_phoneDead()) return;
  const w = arg.toLowerCase().replace(/^(to )/, "");
  // the fixer texts like a fixer — no charm loop, no bond arithmetic
  if (w === "tan" && G.phone.contacts.tan) { _tanText(); return; }
  const id = Object.keys(G.phone.contacts).find(c =>
    c === w || NPCS[c].name.toLowerCase().includes(w.split(" ")[0]));
  if (!id) { _say(w ? "No such number in your phone. (CONTACT a girl in her bar first.)" : "Message whom?"); return; }
  G.battery = Math.max(0, G.battery - 1);
  if (G.phone.msgCd[id] === G.day) {
    _say(`You've already charmed ${NPCS[id].name} by text tonight. Twice is a pattern; ` +
      "three times is a case file.");
    return;
  }
  G.phone.msgCd[id] = G.day;
  _addBond(id, 1); // charm counts toward favor
  _say(`You send ${NPCS[id].name} something short and sweet with one emoji too many.`);
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
  _say("Your phone goes off in your pocket, which is a surprise, because almost nobody " +
    "has the number. \u201cMy friend.\u201d Tan does not say how he knows. \u201cIt is " +
    "half past midnight and you are not where a man looking for his wallet would be.\u201d", "alert");
  _say("He is already close. The grey sedan pulls in without being told where, and the door " +
    "opens on aircon and quiet, and he does not make a single joke about the state of you.", "win");
  G.room = "buakhao_n";
  G.darkStreak = 0;
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
    _say("It takes him the best part of half an hour \u2014 he is coming from the other end of " +
      "town and the traffic on Thappraya does not care who you are \u2014 and then the grey " +
      "sedan comes down the beach road without hurrying. He does not ask what happened. He " +
      "takes in the sand on your shirt and the sand in your hair and says nothing at all " +
      "about either, which is somehow worse than the joke you were braced for.", "win");
    _say("\"The wallet is yours to find,\" he says, pulling out. \"I told you at the airport, " +
      "first night is on you, and I mean it. But I am not going to sit at home knowing you " +
      "are walking over that hill in the dark with a dying phone.\" He turns the aircon up. \"This part is not " +
      "the game. The game starts when you get out.\"");
    G.room = "buakhao_n";
    G.darkStreak = 0;
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
  G.money -= amt;
  (G.soc.given = G.soc.given || {})[id] = (G.soc.given[id] || 0) + amt; // toward a sponsor flip
  G.battery = Math.max(0, G.battery - 1);
  const bump = amt >= 500 ? 3 : amt >= 100 ? 2 : 1;
  _addBond(id, bump);
  _say(_fmt("฿{a} crosses town in one green blink. (฿{m} left.)", { a: amt, m: G.money }));
  // paying into an active pics-drip: enough unlocks the next shot, short of it teases
  const deal = G.phone.picDeal;
  if (deal && !deal.done && deal.id === id && deal.idx != null) {
    if (amt >= deal.ask) _advancePicDeal();
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
  _pushMsg(id, amt >= 500 ? "🙏🙏🙏 you TOO good to me. tonight I take care YOU" :
    amt >= 100 ? "khop khun kha!! 💕 you number one" : "55555 cheap Charlie... but sweet 💕");
  _say("(📱 A reply lands before you've pocketed the phone.)", "dim");
  if (id === "bee" && amt >= 100 && G.quests.bee_number === "active") {
    _setFlag("beeBanked");
  }
}

function _readMessages() {
  if (_phoneDead()) return;
  if (!G.phone.inbox.length) { _say("No messages. The phone judges you gently."); return; }
  const unread = G.phone.inbox.filter(m => !m.read);
  const show = unread.length ? unread : G.phone.inbox.slice(-3);
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
    _say("📭 No messages — nobody has your number yet. (CONTACT a lady and she'll start texting.)", "dim");
  }
  if (G.phone.invite && G.phone.invite.day === G.day && NPCS[G.phone.invite.id]) {
    _say(`📌 ${NPCS[G.phone.invite.id].name} asked you to come by her bar tonight.`, "dim");
  }
  const nPhotos = (Array.isArray(G.phone.photos) ? G.phone.photos : []).filter(p => NPCS[p.id] || PATRONS[p.id]).length;
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
    _say("(READ PAPER or WATCH TV for the rest.)", "dim");
  }
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
      "Word on the soi says you've adopted one of Pattaya's own — khob khun, khun jai dee! " +
      "🐕 The rest of them still need jabs, food, and a vet who works for smiles. Pay it " +
      "forward for the dogs still on the street: https://www.soidog.org/content/make-donation 🙏",
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
// number (she texts). A lump sum jumps straight to the highest frame unlocked. Returns
// true iff a frame went out (the caller then skips its own generic reply). sponsorPix
// counts frames sent; it rides G.soc, so it resets each vacation with `given`.
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
  const f = frames[target - 1];                          // the highest newly-unlocked frame
  _pushMsg(id, f.words || "😘", 0, null, f.cap);
  (G.soc.sponsorPix = G.soc.sponsorPix || {})[id] = target;
  _say("(📱 She's sent you something. CHECK MESSAGES.)", "dim");
  return true;
}

// The pay-per-photo drip (Gift's hustle). paidPics is an ordered set; the first is
// a free teaser, each later one costs its `ask`. Opening it sends the teaser + the
// pitch and arms G.phone.picDeal; SEND >= ask advances it (see _doSendMoney).
function _startPicDeal(id) {
  const pics = NPCS[id] && NPCS[id].paidPics;
  if (!pics || !pics.length) return;
  _pushMsg(id, pics[0].words || "hi handsome 😘 i take picture just for you...", 0, null, pics[0].cap);
  if (pics.length > 1) {
    G.phone.picDeal = { id, idx: 1, ask: pics[1].ask };
    _pushMsg(id, `😏 you like?? more sexy waiting... only ฿${pics[1].ask} i send next one 💸`);
  } else {
    G.phone.picDeal = { id, done: true };
  }
}

function _advancePicDeal() {
  const deal = G.phone.picDeal, id = deal.id, pics = NPCS[id].paidPics;
  const shot = pics[deal.idx];
  _pushMsg(id, shot.words || "😘💕", 0, null, shot.cap);
  const next = deal.idx + 1;
  if (next < pics.length) {
    G.phone.picDeal = { id, idx: next, ask: pics[next].ask };
    _pushMsg(id, `like?? 😏 next one better... ฿${pics[next].ask} 💸`);
  } else {
    G.phone.picDeal = { id, done: true };
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

function _dailyJoke() {
  if (!_flag("act1Done") || G.battery <= 0) return;
  if (_flag("jokeStop")) return;                 // he took the hint
  if (G.phone.jokeDay === G.day) return;         // one a day, like a vitamin
  G.phone.jokeDay = G.day;
  const n = (G.phone.jokeN = (G.phone.jokeN || 0) + 1);
  const body = _JOKE_TEXTS[_hh("joke" + G.vacation + "_" + n, 41) % _JOKE_TEXTS.length]
    .replace(/^Unknown: /, "");
  G.phone.inbox.push({
    from: "unknown", fromName: "+66 8" + (_hh("num" + G.vacation, 17) % 9) + " ••• ••••",
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
    _say("“Ha! Still reading them. Good man. Come and find me — Queen Vic, most nights, " +
      "the end stool with the notebook.”", "thai");
    return;
  }
  _setFlag("jokeWho");
  (G.known = G.known || {}).mort = true;
  _say("You text back. The typing dots start immediately, which tells you something " +
    "about how the sender's evening is going.", "dim");
  _say("“Somebody answered! Do you know how rare that is?” A pause. “Mort. I write the " +
    "column — the OWL, back page, been running longer than most of these bars. I test " +
    "the jokes on the numbers I collect. Most people never reply, some tell me to stop, " +
    "and about one in forty writes back.” Another pause. “You’re one in forty. Come and " +
    "have a beer, Queen Vic. I’ll buy — I’ve a use for a man who answers his phone.”", "thai");
  _say("(Mort. Queen Vic, most nights, end stool. COLUMN reads what he actually prints.)", "dim");
}

function _maybeIncomingText() {
  if (G.battery <= 0 || G.game || G.pendingEnc) return;
  // ladies only: the unprompted-text machinery (invites, scam-asks, selfies) is
  // girl-voiced through and through — Tan (no NPC_ROLES entry) texts back when
  // texted, never into the mama-sick patter
  const contacts = Object.keys(G.phone.contacts).filter(id => NPC_ROLES[id]);
  if (!contacts.length) return;
  if (G.turns - G.phone.lastText < 25) return;
  const maxT = Math.max(0, ...contacts.map(_bondTier));
  if (_rand() >= 0.06 + 0.02 * maxT) return;   // regulars miss you, so they text more
  // weight the pick toward the girls you've built something with
  const pool = [];
  for (const c of contacts) for (let i = 0; i <= _bondTier(c); i++) pool.push(c);
  const id = pool[Math.floor(_rand() * pool.length)];
  const buzz = () => _say("(📱 Your phone buzzes — CHECK MESSAGES.)", "dim");
  // the pics-hustle girl opens her drip the first time she texts, then nudges
  // until you pay through it
  if (NPCS[id].paidPics && !G.phone.picDeal) { _startPicDeal(id); buzz(); return; }
  if (G.phone.picDeal && !G.phone.picDeal.done && G.phone.picDeal.id === id) {
    _pushMsg(id, `you see my photo?? 😏 more waiting for you... ฿${G.phone.picDeal.ask} 💸`);
    buzz(); return;
  }
  // a lady who keeps photos sometimes just sends one, out of the blue
  if (_selfiesFor(id).length && _rand() < 0.25) { _maybePhotoText(id); buzz(); return; }
  // a moneypit contact turns nearly every text into an ask, and the numbers climb;
  // the white knight gets steered to the top of the list and can't say no.
  if (NPCS[id].type === "moneypit") { _moneypitText(id); buzz(); return; }
  const name = NPCS[id].name, t = _bondTier(id), roll = _rand();
  if (t >= 3) { // her farang: longing, jealousy, the real ones — no scam game on you
    if (roll < 0.45) { G.phone.invite = { id, day: G.day };
      _pushMsg(id, `when you come see me?? 🥺 i keep you seat every night, you no come i sad 💔`); }
    else _pushMsg(id, ["i dream about you last night na 💭❤️", "you go other bar?? 😤 i see you i KNOW 👀",
      "miss you so much cannot sleep 😢", "my farang 🥰 when you come back thailand? i wait"][Math.floor(_rand() * 4)]);
  } else if (t >= 2) { // regular: invites and warmth, a little needy
    if (roll < 0.45) { G.phone.invite = { id, day: G.day };
      _pushMsg(id, `bar quiet tonight 😴 you come see ${name}?? i keep you seat 💺💕`); }
    else if (roll < 0.6) _pushMsg(id, "mama of me sick need medicine 300 🥺 you help little bit na?");
    else _pushMsg(id, ["thinking of you na 💭", "you eat already?? 🍚", "sabai dee mai 😊",
      "last night SO funny 5555"][Math.floor(_rand() * 4)]);
  } else { // a name and a number: the classic mix, scam-ask heavy
    if (roll < 0.3) { G.phone.invite = { id, day: G.day };
      _pushMsg(id, `bar quiet tonight 😴 you come see ${name}?? i keep you seat 💺💕`); }
    else if (roll < 0.65) _pushMsg(id, ["mama of me sick, need buy medicine 300 baht 🥺 you help?",
      "phone of me break!! need 500 for fix... you good heart na 🙏",
      "buffalo of family very sick 😭😭 200 baht help little bit?"][Math.floor(_rand() * 3)]);
    else if (roll < 0.9) _pushMsg(id, ["thinking of you na 💭", "you eat already?? 🍚", "sabai dee mai 😊",
      "last night SO funny 5555"][Math.floor(_rand() * 4)]);
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
  for (const g of f.games.slice(-8)) {
    _say("  " + (g.done ? _fmtGame(g) : `${g.d} — ${g.h} v ${g.a}`), "dim");
  }
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

function _sayDrizzle() {
  const alt = G.turns % 2 === 0; // variant by parity — no dice for flavor
  if (_inBar()) {
    _say(alt ?
      "A few fat drops hit the awning, then a few more. Without a word, two of " +
      "the girls slip out and bring the street-side barstools in, stacking them " +
      "dry — a drill they could run asleep. The mamasan glances at the sky, " +
      "unimpressed. The music doesn't miss a beat." :
      "Light rain starts ticking on the roof. The hostess nearest the door " +
      "leans out, palm up, and delivers the verdict — “nit noi.” Nothing. She " +
      "goes back to her phone. The barstools come in anyway. The barstools " +
      "always come in.", "dim");
  } else {
    _say(alt ?
      "A soft rain drifts in off the Gulf. Up the road a baht bus pulls over " +
      "mid-route and the driver hops out, unhurried, to roll the canvas rain " +
      "guards down the sides — the passengers clip the last one themselves, a " +
      "crew that has clearly done this before. It pulls away trailing spray." :
      "Light rain, barely worth the name. The pavement goes glossy and the neon " +
      "doubles itself in it. Umbrellas appear from nowhere — the vendors sell " +
      "them mid-shower, naturally — and the town carries on at exactly the same " +
      "speed, slightly shinier.", "dim");
  }
}

function _sheltered(id) {
  const r = ROOMS[id];
  return !!(r.bar || r.barType || r.shop || r.outlet) ||
    id === "police_station" || id === "oy_office";
}

function _startRain(len) {
  G.rain = len;
  G.lastRain = G.turns;
  if (_inBar()) {
    _say("The sky lets go all at once — rainy-season rain, hammering the roof " +
      "like applause, sheeting off the awning in a solid curtain. The street " +
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
    return;
  }
  const wx = _wxNow();
  if (!wx) {
    _say("Your phone's weather app spins, gives up, and shows you yesterday. " +
      "Hot, it says. It was.");
    return;
  }
  _say(`Your phone's weather app: ${wx.temp}° and feeling like more, ` +
    `${wx.humid}% humidity, ${_wxDesc(wx.code)}. High of ${wx.hi}°, ` +
    `${wx.rain}% chance of rain. Tomorrow's forecast is also Pattaya.`);
}

function _headline() {
  const feed = _newsFeed();
  return feed.length ? feed[Math.floor(_rand() * feed.length)] : null;
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
    _say(_pickVary(_BALCONY_SCENES, "balcony"));
  }
  _soiSpectateHappy("(Best seat above the best free show.)");
}

// The ground vantage: the Queen Vic's front window. Same soi, opposite feeling —
// eye-level, an arm's length of pavement and a pane of glass between you and the
// whole grabby circus, the pub's cold-aircon calm behind you. Its own pool.
function _doWatchPubSoi() {
  _say(_pickVary(_PUB_SOI_SCENES, "pubsoi"));
  _soiSpectateHappy("(A pint, and the whole circus safely behind glass.)");
}

// The Jomtien beach cats: Big One and Little One, the two gray-and-white
// sisters on the lounger. Petting them is a small daily blessing — one happy
// point a night, same house rules as the sunsets and the free shows. Big One
// vets every hand before it gets anywhere near her sister; that's the deal.
function _doPet(arg) {
  // his by name, or bare PET when he's the animal at hand (the beach cats keep
  // priority on their own sand)
  if (G.dog && (_isDogWord(arg || "") ||
      (!arg && G.itemLoc.soi_cats !== G.room))) {
    _say(_dogN("Sai Krok accepts the ear-scratch with his eyes half-shut and his attention " +
      "fully open — somewhere behind you a motorbike slows, and the rumble starts low " +
      "in his chest before you've even registered it. The bike moves on. So does the " +
      "rumble. You get the last of the scratch in undisturbed."));
    return;
  }
  if (G.itemLoc.soi_cats !== G.room) {
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
  _addHappy(1);
  _say("(The best two locals on the beach. +1 สนุก.)", "dim");
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
];

function _canWork() { return _barOwned() && G.room === "stinky_bar"; }

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
  let roll = _rand() * total, pick = pool[0];
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { pick = pool[i]; break; }
  }
  _say(pick.text, (pick.happy || 0) < 0 ? "alert" : "win");
  if (pick.money) {
    G.bar.cash += pick.money;
    _say(_fmt(pick.money > 0 ? "(฿{amt} on the night, over the ordinary take.)"
      : "(฿{amt} out of the till.)", { amt: Math.abs(pick.money) }), "dim");
  }
  // a genuinely good night behind your own bar counts, and counts honestly —
  // it does NOT go through the treadmill, because it isn't a conquest.
  if (pick.happy) _addHappy(pick.happy);
  (G.bar.seen = G.bar.seen || {})[pick.id] = (G.bar.seen[pick.id] || 0) + 1;
  return pick;
}

function _doWork() {
  if (!_barOwned()) {
    _say(_flag("barPartner")
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

// did you work tonight? read at settle
function _workedTonight() { return _barOwned() && G.bar.workedDay === G.day; }

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

// one month in four, the town empties and the beer bars find out who has a
// cushion. Derived from the day count so it's deterministic and reads the same
// for every player.
function _lowSeason() { return Math.floor(G.day / 30) % 4 === 2; }

function _barOwned() { return _flag("barOpen") && !!G.bar; }

// ── The deposit ──────────────────────────────────────────────────────────────
// The one moment in the arc where the money has to actually exist. Fires at
// your own bar once the 51% is settled; until it's paid there is no opening
// night. If you're short, Bert tells you how short — the ATM caps at ฿20k a
// day, so assembling it is a few days' work, and that grind is deliberate: it
// is the last thing that happens before the bar stops being an idea.
function _barDepositDue() {
  return _flag("barPartner") && !_flag("barPaid") && G.room === "stinky_bar";
}

function _barDeposit() {
  if (G.money < BAR_DEPOSIT) {
    if (G.soc.depositNagDay === G.day) return;
    G.soc.depositNagDay = G.day;
    _say(_fmt("Bert has the figure written on the back of a docket. \"Deposit's " +
      "฿{dep}, and the old man carries the rest — ฿{monthly} a month, six " +
      "years.\" He slides it over. \"You're ฿{short} short, bud. Bank won't give " +
      "you it all in one day either.\"",
      { dep: BAR_DEPOSIT, monthly: BAR_MONTHLY, short: BAR_DEPOSIT - G.money }), "alert");
    return;
  }
  _setFlag("barPaid");
  G.money -= BAR_DEPOSIT;
  G.bar.owed = BAR_PRICE - BAR_DEPOSIT;
  G.bar.lastMonthDay = G.day;
  _say("");
  _say(_fmt("You count out ฿{dep}. It is every baht you have, and it does not " +
    "look like very much on a bar towel.", { dep: BAR_DEPOSIT }), "alert");
  _say(_fmt("\"Right.\" Bert doesn't make a thing of it. \"Rest is ฿{monthly} " +
    "a month for six years, direct to him, and he'll not chase you for it " +
    "because he's not the sort and he's not well enough — which if you've any " +
    "sense you'll find worse than if he was.\" He writes the date on the docket " +
    "and pins it behind the till, next to nothing else.",
    { monthly: BAR_MONTHLY }));
  _say(_fmt("(You owe ฿{owed}. The bar is yours the day it opens — ASK BERT " +
    "ABOUT OPENING.)", { owed: G.bar.owed }), "win");
}

// what tonight's trade did. Called once from _endNight when you own the place.
function _barNight() {
  const b = G.bar;
  b.nights++;
  const low = _lowSeason();
  let take = BAR_TAKINGS + Math.floor(_rand() * BAR_SWING);
  // the presence dilemma, in one line. Working your own rail is worth roughly
  // double an evening spent elsewhere — which is exactly what makes going out
  // a decision instead of a default.
  const worked = _workedTonight();
  take = Math.round(take * (worked ? WORK_TAKINGS : AWAY_TAKINGS));
  if (worked) take += BAR_PRESENT;
  if (low) take = Math.round(take * LOW_SEASON);
  // nights away pile up; the staff notice before the books do
  b.away = worked ? 0 : (b.away || 0) + 1;
  if (!worked) b.streak = 0;   // one night out and the grind resets
  // every procurement job you turned down is on the supply bill, permanently
  const friction = (G.syn && G.syn.friction) || 0;
  const costs = Math.round(BAR_COSTS * (1 + friction * BAR_FRICTION));
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
    b.cash += fromPocket;
  }
  const underwater = b.cash < 0;
  return { take, costs, net, low, friction, fromPocket, underwater, worked, away: b.away };
}

// the old man's money, every thirty days. Comes out of the till first, your
// pocket second, and becomes arrears third — he is never chased, never rings,
// and that is worse.
function _barMonthly() {
  const b = G.bar;
  if (G.day - b.lastMonthDay < 30) return null;
  b.lastMonthDay = G.day;
  b.months++;
  let due = BAR_MONTHLY + b.arrears, paidFrom = [];
  const fromTill = Math.min(b.cash, due);
  if (fromTill > 0) { b.cash -= fromTill; due -= fromTill; paidFrom.push("the till"); }
  if (due > 0) {
    const fromPocket = Math.min(G.money, due);
    if (fromPocket > 0) { G.money -= fromPocket; due -= fromPocket; paidFrom.push("your own pocket"); }
  }
  b.arrears = due;
  if (due <= 0) b.owed = Math.max(0, b.owed - BAR_MONTHLY);
  return { paidFrom, short: due, month: b.months };
}

// BOOKS / TAKINGS — the player has to be able to look at it. Deliberately terse
// and slightly unhelpful, like a real set of bar books.
function _doBooks() {
  if (!_barOwned()) {
    _say(_flag("barPartner")
      ? "Not yet. The deposit isn't paid, so there is nothing to keep books on."
      : "You don't own a bar. Your books are your pocket, and you know what's in it.");
    return;
  }
  const b = G.bar;
  _say("── THE STINKY PINKY ──", "win");
  _say(_fmt("Till: ฿{cash}   ·   Owed to the old man: ฿{owed}", { cash: b.cash, owed: b.owed }));
  _say(_fmt("Months paid: {m} of {term}   ·   Nights open: {n}",
    { m: b.months, term: BAR_TERM, n: b.nights }));
  if (b.arrears > 0) _say(_fmt("In arrears: ฿{a}. He hasn't asked.", { a: b.arrears }), "alert");
  const friction = (G.syn && G.syn.friction) || 0;
  if (friction) {
    _say(_fmt("Supply is costing you about {pct}% over the going rate — the jobs " +
      "you didn't give out are on this line, every night, forever.",
      { pct: Math.round(friction * BAR_FRICTION * 100) }), "dim");
  }
  if (_lowSeason()) _say("It's low season. It will pass. It always passes.", "dim");
}

function _barSettle() {
  if (!_barOwned()) return;
  const n = _barNight();
  const m = _barMonthly();
  // the nightly line is quiet; the monthly one is not
  _say(_fmt("(The bar: ฿{take} in, ฿{costs} out{low}{who}. Till: ฿{cash}.)",
    { take: n.take, costs: n.costs, cash: G.bar.cash,
      low: n.low ? _L(" — low season") : "",
      who: n.worked ? _L(" — you worked it") : _L(" — Bert ran it") }), "dim");
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
  if (!m) return;
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

function _doFeedDog(arg) {
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
    _say(`${approach}. ฿20 at a grill cart buys a chicken skewer; he takes it with shocking ` +
      "gentleness, eats it in one movement, and then — this is the part nobody warns you " +
      `about — looks at you. Properly. Files something away. (฿${G.money} left.)`, "win");
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
  _say(_dogN(_DOG_FAVOR_SCENES[Math.floor(_rand() * _DOG_FAVOR_SCENES.length)](name)), "win");
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

function _doPaper() {
  if (!_room().seven && !_inBar()) {
    _say("No paper to hand. The 7-Elevens keep a rack; every bar has yesterday's " +
      "copy going soft on the counter.");
    return;
  }
  const feed = _newsFeed();
  if (!feed.length) {
    _say("The rack holds a crossword someone's already ruined and a property " +
      "supplement nobody has ever read. The news, as ever, is the street.");
    return;
  }
  _say(_room().seven ?
    "You skim the rack by the till, cold air on your neck:" :
    "Yesterday's paper, soft with humidity and beer rings, still mostly true:");
  const seen = new Set();
  for (let i = 0; i < 6 && seen.size < 3; i++) {
    const h = _headline();
    if (h && !seen.has(h.t)) { seen.add(h.t); _sayHeadline(h); }
  }
  const fx = _fxLine();
  if (fx) _say(`Corner of the business page, the numbers every expat reads first: ${fx}`, "thai");
  const au = _gold();
  if (au && au.baht) _say(`Below them, gold at ฿${au.baht.toLocaleString("en-US")} ` +
    "the baht-weight — the number every mamasan reads first.", "dim");
  const wx = _wxLine();
  if (wx) _say(`The weather box promises ${wx} — printed on paper already ` +
    "gone soft agreeing with it.", "dim");
  const fb = _footyLine();
  if (fb) _say(`Back page — ${fb}.`, "dim");
  const lt = _lotto();
  if (lt) _say(`And the lottery results from ${lt.date} in their careful little ` +
    `box: ${lt.first}, last two ${lt.last2}. Every bar in town knows somebody ` +
    "who was one digit off.", "dim");
  _say("Somewhere in there, the fuel prices explain your bus fare.", "dim");
}

// ── The Nite Owl column ──────────────────────────────────────────────────────
// The old back-page institution: Mort's weekly hoot (see PATRONS.mort — he
// writes it "to stay sane"). It's the canon dispenser — the scene's own hard-won
// wisdom rendered as a columnist's dry copy: a lead opinion, a bar listing, a
// reader letter with his reply, a joke, and the signoff. Day+vacation-stable
// (shared-world-safe like _quizBars), so it rotates daily and reads the same for
// everyone that day. Pure flavor — gates nothing.
const _OWL_LEADS = [
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
];
const _OWL_LISTINGS = [
  "STINKY BAR (Beach Road North), the American's shop, runs killer pool every third night — ฿100 in the ashtray, last cue standing takes the pot. His felt, his rules, his Singha.",
  "BLUE DOG (Beach Road North) keeps the best sunset seats on the strip and, six-to-seven nightly, the finest free show in town: the checkpoint across the road, farang and their paperwork, no cover charge.",
  "MAMA YAI'S (the Darkside) — som tam that arrives unasked and correct, beer ten baht under town, and a wall of photographs that knows everyone's second wife. Eat first, cry after.",
  "QUIZ NIGHT lands Thursday at three bars the chalkboards will name — walk in during and you're a contestant, no appeal. Five right buys ฿500 and your name in chalk. The teachers from Rayong will beat you regardless.",
  "THE ORCHID CLUB (Naklua) is NOT holding an event, has never held one, and would thank the press not to notice it exists. Discretion, gentlemen. Mai pen rai.",
  "CANDY BAR (Soi Buakhao), the mamasan's own — sharp as a razor, warm as a Chang on a hot night. She'll price your wallet before you sit and your story before you tell it. Buy her a drink; it's cheaper than the alternative.",
  "QUEEN VIC (Soi 6): the one air-conditioned pub on the wildest soi in the world, where the residents watch the circus from across the street and mourn the days before the paper changed hands. Cold beer, warm company, no illusions.",
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
function _doColumn() {
  _say("── THE NITE OWL ── Mort's weekly hoot, still going, out of spite ──", "win");
  _say(_owlPick(_OWL_LEADS, 1));
  _say("• " + _owlPick(_OWL_LISTINGS, 7), "dim");
  // one-shot: if the amulet went back and the Owl has not had his say yet, he
  // gets it this issue instead of a pooled letter
  let letter, reply;
  if (_flag("amuletReturned") && !_flag("owlAmulet")) {
    _setFlag("owlAmulet");
    [letter, reply] = _OWL_AMULET;
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
  if (typeof _patronRoom === "function" && _patronRoom("mort") === G.room) {
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

// ── Food and water ───────────────────────────────────────────────────────────

const FOOD_STALLS = {
  jomtien_7eleven: { name: "a toastie, pressed while you wait", price: 35, hunger: 40, thirst: 0 },
  jomtien_beach_rd: { name: "a cold mango from Auntie Nok, salt and chilli on the side", price: 30, hunger: 25, thirst: 15 },
  buakhao_market: { name: "som tam from the cart, extra everything", price: 50, hunger: 55, thirst: -10 },
  lake_bar: { name: "a whole grilled lake fish, salt-crusted, som tam on the side", price: 180, hunger: 65, thirst: 5 },
  naklua_rd: { name: "grilled chicken and sticky rice off a smoky cart", price: 60, hunger: 60, thirst: 0 },
  ws_gate: { name: "a late-night kebab of negotiable provenance", price: 89, hunger: 45, thirst: 0 },
  kiss: { name: "a proper plate off the mile-long menu at KISS — pad kaprao, or a burger if the soul needs it", price: 120, hunger: 70, thirst: 10 },
  kiss_jomtien: { name: "the same mile-long KISS menu, Jomtien branch — pad kaprao, or a burger if the soul needs it", price: 120, hunger: 70, thirst: 10 },
  soi_rompho: { name: "grilled chicken, sticky rice and som tam from a Rompho Market stall", price: 60, hunger: 60, thirst: -5 },
  // the crocodile outside Central. Priced as the novelty it is — the stall makes
  // its living off people who photograph it, and charges the ones who don't.
  second_rd_mall: { name: "a crocodile skewer off the spit outside Central, charred and startlingly good", price: 120, hunger: 55, thirst: -10 },
};

const _EDIBLE = { moo_ping: 35, som_tam: 50, noodles: 20 };

function _doEat(arg) {
  // "EAT WITH TAN" is the other natural phrasing of his standing food invite —
  // route it to the same scene rather than the you're-not-carrying-that shrug.
  if (arg && /\btan\b/.test(arg) && _npcsHere().includes("tan")) { _tanFood(); return; }
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
  const inv = _inv().filter(i => _EDIBLE[i] !== undefined);
  const id = arg ? inv.find(i => ITEMS[i].name.toLowerCase().includes(arg) ||
    ITEMS[i].aliases.some(a => a.includes(arg))) : inv[0];
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
  if (!_flag("act1Done") || _flag("roomSafeOpened")) return;
  if (G.room !== _hotelRoomId()) return;
  _setFlag("roomSafeOpened");
  G.money += SAFE_CASH;
  _say(`Your own room, and the key card works. The safe in the wardrobe opens on the ` +
    `second try: passport, return ticket \u2014 and the emergency stash you very nearly ` +
    `forgot you packed. \u0e3f${SAFE_CASH}. (\u0e3f${G.money} in pocket. The vacation is ` +
    "officially back on.)", "win");
}

function _checkAct1() {
  if (!_flag("hasWallet") || _flag("act1Done")) return;
  _setFlag("act1Done");
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

