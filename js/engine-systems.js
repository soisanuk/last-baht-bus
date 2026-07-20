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
  if (draw) base = Math.round(base * 1.5 / 50) * 50; // a prized draw is worth more to the bar
  if (G.nightTurn < 30) return Math.round(base * 1.5 / 50) * 50;
  if (G.nightTurn >= 60) {
    if (draw) return base;                          // and gets no midnight discount
    if (bt === "beer" && !POPULAR_GIRLS.includes(id)) return 0;
    return Math.round(base * 0.75 / 50) * 50;
  }
  return base;
}

// Short time vs long time. ST is the quoted rate — one round and off she goes,
// the night carries on. LT (generally overnight) costs more: beer ×1.75, go-go
// ×1.5, and Soi 6 — a volume business that hates losing a girl for a whole
// night — quotes a prohibitive early LT, sometimes more than a go-go fine.
// After midnight the collapse flattens everything: same fine either way.
function _barfinePrices(bt, id) {
  const st = _barfinePrice(bt, id);
  if (G.nightTurn >= 60) return { st, lt: st };
  const mult = bt === "soi6" ? (G.nightTurn < 30 ? 3 : 2) :
    bt === "gogo" ? 1.5 : bt === "gents" ? 1.5 : 1.75;
  return { st, lt: Math.round(st * mult / 50) * 50 };
}

// Which girls run games on a mark? MOST don't — it's the experienced
// operators, a stable hash-picked minority. The green girls are too new and
// too nervous, and the popular girls have a reputation worth more than one
// inflated fine. Liking you (favor ≥ 6) or a vouching wing-woman also keeps
// everyone honest — they play a newbie they can get away with, nobody else.
function _bfShark(id) {
  if (POPULAR_GIRLS.includes(id)) return false;
  if (NPCS[id].c4 === 2) return false; // the new girls play it straight
  return _hh(id, 97) % 100 < 35;
}
function _bfExploitable(id) {
  return _bfShark(id) && _favor(id) < 6 && !_wingman();
}

// Some girls are a bar's prized DRAW — new, small, pretty, worth keeping on the
// floor. Their take-out is blocked while they pull the early crowd (before
// midnight) and priced at a premium after: the barfine is an appraisal, not a
// fixed number. A stable hash-picked minority (shared-world-safe like _quizBars).
function _isDraw(id) {
  return NPC_ROLES[id] === "hostess" && _hh(id + ":" + G.vacation + ":draw", 61) % 100 < 15;
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

function _doBarfine(arg) {
  const rm = _room();
  if (rm.massage === "oil") {
    _say("No barfine here — she's a masseuse, not a bar girl, and there's no mamasan to " +
      "square. Buy the massage, ask for the SPECIAL, and if you want the rest she'll tell " +
      "you to catch her after her shift.");
    return;
  }
  if (rm.massage === "legit") { _say("You are in a legitimate massage shop. Have a word with yourself. (MASSAGE)"); return; }
  if (rm.soapy) { _say("It doesn't work like that here — it's a set package. (SOAPY to pick a number.)"); return; }
  if (!_inBar()) { _say("Barfines are negotiated indoors, with the mamasan watching."); return; }
  const here = _npcsHere().filter(id => NPC_ROLES[id]);
  const id = arg ? _findNpc(arg) : (here.length === 1 ? here[0] : null);
  if (!id || !NPC_ROLES[id]) { _say(arg ? "She's not working this bar." : "Barfine whom, exactly?"); return; }
  const name = NPCS[id].name, role = NPC_ROLES[id];
  if (role === "mamasan") { _say(`You cannot barfine ${name}. She IS the bar. She looks almost flattered. Almost.`); return; }
  if (role === "cashier" && (G.soc.bells[G.room] || 0) < 2) {
    _say(`${name} taps the till: somebody has to count the money. (Cashiers do go, ` +
      "sometimes — for the right customer, on the right night. The bell defines both.)");
    return;
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
  if (_favor(id) < (bt === "soi6" ? 2 : 4)) {
    _say(bt === "soi6" ?
      `${name} laughs, not unkindly: “Lady drink first, na. One or three.” Even ` +
      "Soi 6 has liturgy." :
      `${name} pats your hand: “You sweet. But buy me drink, talk to me a little — ` +
      "this is Pattaya, not a vending machine.”");
    return;
  }
  // She can say no — and the sting is that it lands after the drinks you
  // invested in the rapport. Veterans ask early for exactly this reason.
  const refusal = _bfRefusal(id, bt);
  if (refusal) { _bfRefusalSay(id, refusal); return; }
  // The negotiation. On Soi 6 the girl quotes upfront — volume business, no
  // mystery. Everywhere else the girl won't name the number (she gets a cut):
  // the mamasan or the cashier drifts over to do the arithmetic.
  const { st, lt } = _barfinePrices(bt, id);
  G.pendingBf = { id, st, lt, room: G.room };
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
  const life = _hh(id + ":" + G.vacation + ":" + G.day, 131) % 100;
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
  const p = n => n ? "฿" + n : "waived — past midnight";
  _say(`(SHORT TIME ${p(st)} — one round, the night carries on · LONG TIME ` +
    `${p(lt)} — overnight · NO backs out.)`, "dim");
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
      price = Math.round(lt * 1.3 / 50) * 50;
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
      G.soc.drinks[other] = Math.max(0, (G.soc.drinks[other] || 0) - 3);
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
      _say(`฿${price} to the till and ${name} takes your hand with the confidence of ` +
        "home advantage. “Upstairs” turns out to be exactly as advertised. Some " +
        "time later you are back on your stool, thinking about nothing at all, " +
        `while she fixes her hair in the till mirror. (฿${G.money} left.)`, "win");
      _conquestHappy(6, id);
    } else if (bt === "gents") {
      _say(`฿${price} to Rose, discreetly, and ${name} takes your hand and walks you ` +
        "to one of the deep couches along the wall. The curtain draws around it with " +
        "a soft brass rattle, the cold gold room carries on without you for a while, " +
        `and then you are back in your seat with a fresh drink you don't remember ` +
        `ordering. Nobody looked up. Nobody ever does. (฿${G.money} left.)`, "win");
      _conquestHappy(6, id);
    } else {
      _say((price ? `฿${price} to the ledger and a` : "A") +
        ` short walk later the short-time hotel's ceiling fan is doing its slow ` +
        `count over the proceedings. ${name} is businesslike, cheerful, and ` +
        "gone within the hour — a kiss on the cheek at the door, back to her " +
        `stool before the ice in your last drink has melted. (฿${G.money} left.)`, "win");
      _conquestHappy(5, id);
      for (let i = 0; i < 6; i++) { // the hour passes; the night carries on
        if (G.over) return;
        _tick();
      }
    }
    G.soc.drinks[id] = (G.soc.drinks[id] || 0) + 2; // a short-time deepens the bond a little
    return;
  }
  // ── LONG TIME: overnight — unless she's running a game on you ──
  const scam = _bfScamRoll(id, marked);
  if (scam === "period") {
    // sprung before you even leave: the reveal comes AFTER the fine is paid
    G.bfIncident = { id, room: G.room, kind: "period", fine: price, day: G.day };
    _say(`The fine is barely in the ledger when ${name} leans close, all ` +
      "apology: “Cannot boom boom tonight, na. Lady time.” She pats your arm " +
      "and is somehow already back in the rotation of the room. At the till, " +
      "the mamasan's pen has stopped moving — she heard it too, and she knows " +
      "the shift roster better than anyone.", "alert");
    _say("(COMPLAIN — the mamasan is right there, and this is bad for business.)", "dim");
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
    G.soc.drinks[id] = (G.soc.drinks[id] || 0) + 6; // you saw the real her — the bond jumps
    G.lastBfBase = 4;                               // …and the escape didn't escape: less สนุก
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
  G.soc.drinks[id] = (G.soc.drinks[id] || 0) + 3; // a whole night together deepens the bond
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
    G.soc.drinks[rel] = (G.soc.drinks[rel] || 0) + 2;
    _say(`Then ${mn} turns, considers the floor, and beckons ${NPCS[rel].name} ` +
      `over with two fingers. “This one,” she says, like a guarantee. ` +
      `${NPCS[rel].name} sits beside you already half on your side.`, "dim");
  }
  _addHappy(1);
}

// Does she run a game tonight? Only an operator, only on a mark — the open
// contract doubles her confidence. Returns a scam kind or null.
function _bfScamRoll(id, marked) {
  if (!_bfExploitable(id)) return null;
  if (_rand() >= (marked ? 0.6 : 0.3)) return null;
  const r = _rand();
  if (r < 0.15) return "period";
  if (r < 0.40) return "runner";
  if (r < 0.60) return "mao";
  if (r < 0.75) return "leaveAfter";
  if (r < 0.90) return "barhop";
  return "wsparty";
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
      _say(`A proper hour is ฿${MASSAGE_LEGIT}; you have ฿${G.money}. ${name} waves you to ` +
        "come back with the fare — she isn't going anywhere.");
      return;
    }
    G.money -= MASSAGE_LEGIT;
    const wasHurt = G.hurt, wasDrunk = G.soc.drunk;
    G.hurt = Math.max(0, G.hurt - 1);
    G.soc.drunk = Math.max(0, G.soc.drunk - 2);
    for (let i = 0; i < 6; i++) { if (G.over) return; _tick(); }
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
    _say(`The oil massage is ฿${MASSAGE_OIL}; you have ฿${G.money}. ${name} pouts, forgives you instantly.`);
    return;
  }
  G.money -= MASSAGE_OIL;
  G.soc.drunk = Math.max(0, G.soc.drunk - 1);
  (G.soc.massaged = G.soc.massaged || {})[G.room] = G.day; // the base is done; special is on the table
  if (she) G.soc.drinks[she] = (G.soc.drinks[she] || 0) + 1; // a soft, cheap bond — no drinks, no mama cut
  for (let i = 0; i < 5; i++) { if (G.over) return; _tick(); }
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
  if (!hadBase) for (let i = 0; i < 3; i++) { if (G.over) return; _tick(); }
  for (let i = 0; i < 3; i++) { if (G.over) return; _tick(); }
  _say(`${name} checks the curtain, turns the radio up a notch, and ` +
    (hadBase ? "the massage quietly stops pretending to be only a massage" :
      "gives you the massage and the actual reason people come to Smile") +
    ". Hand and mouth, unhurried, her eyes finding yours in the wall of mirrors the whole time — " +
    `the “I like you” she led with turns out to be at least half true. (฿${G.money} left.)`, "win");
  _conquestHappy(4, she);        // a real release — feeds the hedonic treadmill, lightly
  if (she) G.soc.drinks[she] = (G.soc.drinks[she] || 0) + 1;
  // the on-premises wall, and the door it leaves open (a seed: no live off-shift meet yet)
  _say(`Afterward she wipes her hands and tips her chin at the little NO SEX sign, rueful. ` +
    "“Boom boom no can here — boss rule, sticker everywhere. But when I finish work…” " +
    `${name} writes something on the back of your hand in eyeliner and folds your fingers over ` +
    "it. “You come, na. Real one, my place.” (A number, and an open invitation — a softer road " +
    "than any barfine. Whether you ever walk it is another night's business.)", "dim");
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
  for (let i = 0; i < 8; i++) { if (G.over) return true; _tick(); } // the long ritual eats a chunk of night
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
  _say(`THE NIGHT BEAT YOU HOME. You got ${reached} of ${total} steps down the road ` +
    `back to room 412` +
    (gotWallet ? " — wallet in hand, just not the hours left to spend it" : "") + ".", "alert");
  if (reached > prevBest) _say(`★ Furthest yet: ${reached}/${total}. The next run starts ` +
    "cold — but you know the way a little better now.", "win");
  else if (prevBest) _say(`(Your best is still ${prevBest}/${total}. Beat it.)`, "dim");
  if (tries === 1) _say("(One thing the beating buys you: from here on, the soi will " +
    "whisper. Type HINT when you're stuck.)", "dim");
  _say("Dawn wipes the slate. Same beach, same day two, same empty pockets — go again.", "room");
  _say("");
  newGame();
  G.act1Best = best;      // the record…
  G.act1Tries = tries;    // …and the attempt count survive the reset (unlocking HINT)
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
    return r ? ` ${NPCS[at].name} is at ${_barName(room)}, over in ${r.region}.` : "";
  }
  if (ROOMS[at]) {
    if (at === G.room) return "";
    return ` That's the ${_barName(at)}, in ${ROOMS[at].region}.`;
  }
  return "";
}

function _doHint() {
  if (_flag("act1Done")) {
    // Sandbox: reuse the "next actionable step" idea for the quest journal —
    // point at one active quest (with where to go), else nudge an offer.
    const active = Object.keys(QUESTS).filter(q => G.quests[q] === "active");
    if (active.length) {
      const q = QUESTS[active[0]];
      _say(`On the books: ${q.name} — ${q.desc}${_questWhere(q.at)}`, "win");
      return;
    }
    const offered = Object.keys(QUESTS).filter(q => G.quests[q] === "offered");
    if (offered.length) {
      const q = QUESTS[offered[0]];
      const giver = NPCS[q.giver] ? NPCS[q.giver].name : "Someone";
      _say(`${giver} has a job going — “${q.name}”. Take it on with ACCEPT ${offered[0].toUpperCase()}.`, "win");
      return;
    }
    _say("The wallet's yours and the opening's behind you — out here there are no wrong answers, " +
      "only better nights. Nothing on the books: the givers are out there, so TALK to people. " +
      "(QUESTS lists jobs, WHO your black book, MAP the lay of the land.)", "dim");
    return;
  }
  if ((G.act1Tries || 0) < 1) {
    _say("No hints your first night, tilac — the town is yours to read. But it remembers a face: " +
      "miss home by dawn and you start over, and the second run… the soi begins to whisper.", "dim");
    return;
  }
  const reached = _act1Progress(), total = _ACT1_MILESTONES.length;
  const next = _ACT1_HINTS.find(([f]) => !_flag(f));
  _say(`The soi whispers — you're ${reached}/${total} of the way home. ` + (next ? next[1] :
    "Everything's in hand. Now just get to room 412 in Naklua before dawn takes the night."), "win");
}

function _questAvailable(qid) {
  const q = QUESTS[qid];
  const st = G.quests[qid];
  if (st === "active" || st === "done") return false;
  return q.deps.every(d => G.quests[d] === "done");
}

// Called after a giver's dialogue lands: surface any offer they have.
function _questOffer(npcId) {
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (q.giver !== npcId || !_questAvailable(qid)) continue;
    G.quests[qid] = "offered";
    _say(`✦ ${NPCS[npcId].name} has a job for you: “${q.name}” — ${q.desc}`, "win");
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
  _say(`✦ Quest accepted: ${q.name}`, "win");
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
  _say(`✦ Abandoned: ${q.name}. The soi forgives; the giver may offer it again.`, "dim");
}

function _doQuests() {
  let shown = 0;
  if (G.stage === "act1") {
    _say("▶ The Last Baht Bus — find your wallet, get back to room 412 in Naklua.", "win");
    for (const [f, label] of _ACT1_MILESTONES) {
      _say(`  ${_flag(f) ? "✓" : "·"} ${label}`, "dim");
    }
    shown++;
  } else if (_flag("act1Done")) {
    _say(`✓ The Last Baht Bus — Act One, scored ${G.score}`, "dim");
    shown++;
  }
  const rows = Object.entries(QUESTS).filter(([qid]) => G.quests[qid]);
  for (const [qid, q] of rows) {
    const st = G.quests[qid];
    if (st === "active") { _say(`▶ ${q.name} — ${q.desc}${_questWhere(q.at)}`, "win"); shown++; }
    else if (st === "offered") { _say(`✦ On offer: ${q.name} (ACCEPT ${qid.toUpperCase()})`, "dim"); shown++; }
    else if (st === "done") { _say(`✓ ${q.name}`, "dim"); shown++; }
  }
  if (!shown) _say("No adventures on the books. The givers are out there — talk to people.");
  else if (!rows.some(([qid]) => G.quests[qid] === "active") && G.stage !== "act1") {
    _say("(The givers are out there — talk to people.)", "dim");
  }
}

// Reward sweep — runs every turn; any active quest whose doneFlag has been
// set (by give/win/bank, wherever) completes here.
function _questTick() {
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (G.quests[qid] !== "active" || !_flag(q.doneFlag)) continue;
    G.quests[qid] = "done";
    _say(`✦ QUEST COMPLETE: ${q.name}`, "win");
    if (q.reward.money) {
      G.money += q.reward.money;
      _say(`(+฿${q.reward.money} — ฿${G.money} in pocket.)`, "dim");
    }
    if (q.reward.happy) _addHappy(q.reward.happy);
  }
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

function _pushMsg(from, text, gives) {
  G.phone.inbox.push({ from, text, turn: G.turns, read: false, gives: gives || 0 });
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
  const ids = Object.keys(G.phone.contacts).filter(id => G.phone.contacts[id]);
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
  _say("(A bond cools a notch a night — tend the ones you mean to keep. MESSAGE / SEND / CONTACT.)", "dim");
}

function _doContact(arg) {
  const id = _findNpc(arg);
  if (!id) { _say("They're not here to ask."); return; }
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
  G.soc.drinks[id] = (G.soc.drinks[id] || 0) + 1; // charm counts toward favor
  _say(`You send ${NPCS[id].name} something short and sweet with one emoji too many.`);
  _pushMsg(id, ["555+ you funny", "miss you na 🥺", "come see me tonight!!",
    "work boring... you come make sanuk"][Math.floor(_rand() * 4)]);
  _say("(📱 She replies almost instantly. CHECK MESSAGES.)", "dim");
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
  if (amt > G.money) { _say(`The app regrets to inform you: ฿${G.money} available, ฿${amt} dreamed of.`); return; }
  G.money -= amt;
  G.battery = Math.max(0, G.battery - 1);
  const bump = amt >= 500 ? 3 : amt >= 100 ? 2 : 1;
  G.soc.drinks[id] = (G.soc.drinks[id] || 0) + bump;
  _say(`฿${amt} crosses town in one green blink. (฿${G.money} left.)`);
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
    _say(`📱 ${NPCS[msg.from].name}: “${msg.text}”`, "thai");
    if (!msg.read && msg.gives) {
      G.money += msg.gives;
      _say(`(She's transferred you ฿${msg.gives}. ฿${G.money} in pocket. This town.)`, "win");
    }
    msg.read = true;
  }
  if (!unread.length) _say("(Older messages, re-read for the warm glow.)", "dim");
}

// Contacts text first, sometimes. Sweet nothings, invitations with a reward
// for showing up, and money stories — this IS Pattaya.
// Contacts text unprompted — scaled by the bond (The Regular). A girl you've
// become a regular/farang for MISSES you: she texts more often, is weighted more
// likely to be the one who does, and her messages skew to invites and longing
// ("when you come see me?") rather than the mama-sick game she'd never run on her
// own farang. New/face contacts still send the classic scam-ask mix.
function _maybeIncomingText() {
  if (G.battery <= 0 || G.game || G.pendingEnc) return;
  const contacts = Object.keys(G.phone.contacts);
  if (!contacts.length) return;
  if (G.turns - G.phone.lastText < 25) return;
  const maxT = Math.max(0, ...contacts.map(_bondTier));
  if (_rand() >= 0.06 + 0.02 * maxT) return;   // regulars miss you, so they text more
  // weight the pick toward the girls you've built something with
  const pool = [];
  for (const c of contacts) for (let i = 0; i <= _bondTier(c); i++) pool.push(c);
  const id = pool[Math.floor(_rand() * pool.length)];
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
}

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
  "An officer steps off the kerb with one raised glove and a big Australian on a " +
    "rented PCX pulls over with the face of a man doing sums. Helmet: yes. " +
    "License: the wallet comes out slowly... too slowly. He is escorted toward " +
    "the station at a gentle, unhurried, absolutely non-negotiable pace. The " +
    "Blue Dog rail scores it a 7.",
  "A farang on a Click 125 spots the checkpoint from two hundred metres, executes " +
    "a U-turn so sudden his flip-flop comes off, and disappears down a side soi. " +
    "The rail erupts. One of the officers applauds, sincerely, without moving " +
    "from his spot. The flip-flop stays where it fell, a small monument.",
  "No helmet, no license, board shorts: the full house. He tries the confused-" +
    "tourist opening; the officer counters with the laminated card in four " +
    "languages. They walk to the station together like old friends, one of them " +
    "฿2000 lighter in advance. At the rail, a man who clearly did the same walk " +
    "last week raises his Chang in silent brotherhood.",
  "Two officers on each side of the road, working the evening tide with the calm " +
    "of men netting fish at the river mouth. Thais sail through unwaved. A " +
    "gap-year kid gets pulled mid-wheelie, which even the rail agrees was earned.",
];

function _doWatchBlueDog(arg) {
  const sunset = /sunset|bay|sea|view/.test(arg || "");
  if (sunset || !_shakedownOn()) {
    if (_shakedownOn()) {
      _say("The bay does the whole production number: gold, then rose, then a " +
        "violet that no camera has ever come home with. The islands go to " +
        "silhouette. Behind you the beer signs buzz on one by one, taking over " +
        "the shift. Nobody at the rail says anything, which is how you can tell " +
        "it's good.");
    } else if (sunset) {
      _say("The sun is long gone; the bay is a dark sheet stitched with squid-boat " +
        "lights. Still worth watching, in the way embers are.");
      return;
    } else {
      _say("The checkpoint packed up at seven on the dot — the officers folded " +
        "their operation like a market stall and rode off, mostly helmetless. " +
        "The road is just a road again. The bay, however, is still open.");
      return;
    }
  } else {
    _say(_SHAKEDOWN_SCENES[Math.floor(_rand() * _SHAKEDOWN_SCENES.length)]);
  }
  if (G.blueDogDay !== G.day) {
    G.blueDogDay = G.day;
    _addHappy(1);
    _say("(Best free show in Pattaya. +1 สนุก.)", "win");
  }
}

// The Queen Vic balcony: the whole of Soi 6 as theatre, nightly, included
// in the rate. One happy point a night, same house rules as the Blue Dog.
function _doWatchSoi() {
  _say("You take the recliner. Below, Soi 6 performs: the barkers working the " +
    "walkers, a hen party being gently herded out of Golden Dragon, two girls " +
    "from Pink Lotus sharing one plate of som tam between customers, and the " +
    "TikTok kid with the ring light filming it all for people who will never " +
    "smell it. Two balconies over, Terry raises his beer without looking. " +
    "You raise yours.");
  if (G.blueDogDay !== G.day) {
    G.blueDogDay = G.day;
    _addHappy(1);
    _say("(Best seat above the best free show. +1 สนุก.)", "win");
  }
}

function _doTv() {
  if (!_inBar()) { _say("No TV out here. The street is the channel."); return; }
  _say("The TV over the bar plays the news — sound off, Thai subtitles racing, " +
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
      "Nobody in the bar needed telling.", "dim");
    const fb = _footyLine();
    if (fb) _say(`Then sport — ${fb}. Kickoff, as ever, at an hour Pattaya ` +
      "calls late and football calls prime time.", "dim");
    const lt = _lotto();
    if (lt) _say(`And the lottery numbers from the ${lt.date} draw crawl past — ` +
      `first prize ${lt.first}, last two ${lt.last2}. A cashier checks her ` +
      "ticket against them without hope, and is proven right.", "dim");
    _say("The bar absorbs the state of the world and orders another round at it.", "dim");
  } else {
    _say("Tonight it's muay thai highlights and the lottery draw. The bar approves " +
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
  "STINKY BAR (Beach Road North), the American's shop, runs killer pool every third night — ฿100 in the ashtray, last cue standing takes the pot. His felt, his rules, his Budweiser.",
  "BLUE DOG (Beach Road North) keeps the best sunset seats on the strip and, six-to-seven nightly, the finest free show in town: the checkpoint across the road, farang and their paperwork, no cover charge.",
  "MAMA YAI'S (the Darkside) — som tam that arrives unasked and correct, beer ten baht under town, and a wall of photographs that knows everyone's second wife. Eat first, cry after.",
  "QUIZ NIGHT lands Thursday at three bars the chalkboards will name — walk in during and you're a contestant, no appeal. Five right buys ฿500 and your name in chalk. The teachers from Rayong will beat you regardless.",
  "THE ORCHID CLUB (Naklua) is NOT holding an event, has never held one, and would thank the press not to notice it exists. Discretion, gentlemen. Mai pen rai.",
  "CANDY BAR (Soi Buakhao), the mamasan's own — sharp as a razor, warm as a Chang on a hot night. She'll price your wallet before you sit and your story before you tell it. Buy her a drink; it's cheaper than the alternative.",
  "QUEEN VIC (Soi 6): the one air-conditioned pub on the wildest soi in the world, where the residents watch the circus from across the street and mourn the days before the paper changed hands. Cold beer, warm company, no illusions.",
];
function _owlPick(arr, salt) {
  let h = salt >>> 0;
  for (const ch of String(G.day) + ":" + String(G.vacation)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return arr[h % arr.length];
}
function _doColumn() {
  _say("── THE NITE OWL ── Mort's weekly hoot, still going, out of spite ──", "win");
  _say(_owlPick(_OWL_LEADS, 1));
  _say("• " + _owlPick(_OWL_LISTINGS, 7), "dim");
  const [letter, reply] = _owlPick(_OWL_LETTERS, 13);
  _say("• A reader writes: " + letter);
  _say("  OWL: " + reply);
  _say("• " + _owlPick(_OWL_JOKES, 29), "dim");
  _say("BUT, I DON'T GIVE A HOOT!", "win");
}

// ── Food and water ───────────────────────────────────────────────────────────

const FOOD_STALLS = {
  jomtien_7eleven: { name: "a toastie, pressed while you wait", price: 35, hunger: 40, thirst: 0 },
  jomtien_beach_rd: { name: "a cold mango from Auntie Nok, salt and chilli on the side", price: 30, hunger: 25, thirst: 15 },
  buakhao_market: { name: "som tam from the cart, extra everything", price: 50, hunger: 55, thirst: -10 },
  naklua_rd: { name: "grilled chicken and sticky rice off a smoky cart", price: 60, hunger: 60, thirst: 0 },
  ws_gate: { name: "a late-night kebab of negotiable provenance", price: 89, hunger: 45, thirst: 0 },
  kiss: { name: "a proper plate off the mile-long menu at KISS — pad kaprao, or a burger if the soul needs it", price: 120, hunger: 70, thirst: 10 },
  kiss_jomtien: { name: "the same mile-long KISS menu, Jomtien branch — pad kaprao, or a burger if the soul needs it", price: 120, hunger: 70, thirst: 10 },
  soi_rompho: { name: "grilled chicken, sticky rice and som tam from a Rompho Market stall", price: 60, hunger: 60, thirst: -5 },
};

const _EDIBLE = { moo_ping: 35, som_tam: 50, noodles: 20 };

function _doEat(arg) {
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

function _checkAct1() {
  if (G.room !== "hotel_room" || _flag("act1Done")) return;
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
  _say("Room 412. You bolt the door, fall onto the terrible bed, and hold your " +
    "wallet up to the ceiling light like a trophy. Outside, Pattaya keeps roaring " +
    "without you — the bars, the buses, the whole neon machine. Somewhere out " +
    "there Candy is polishing a glass, Bank is leaning on his bike, and Madam Oy " +
    "is counting money that is, for once, not yours.", "win");
  _say("★ ACT ONE COMPLETE: THE LAST BAHT BUS ★", "win");
  for (const l of lines) _say(l, "dim");
  _say(`ACT ONE SCORE: ${score}`, "win");
  _addHappy(Math.max(5, Math.round(score / 4)));
  G.money += SAFE_CASH;
  _say(`The room safe opens on the second try. Passport, return ticket — and the ` +
    `emergency stash you very nearly forgot: ฿${SAFE_CASH}. (฿${G.money} in ` +
    "pocket. The vacation is officially back on.)", "win");
  _setFlag("act1Done"); // stage advances
  G.stage = "vacation";
  _say("");
  _say("You could sleep. But the shower works, the wallet is fat enough, and " +
    "through the window the whole electric city is just getting started — and for " +
    "the first time tonight, nobody in it has anything of yours.", "room");
  _say(`★ THE VACATION IS YOURS — ${8 - G.day} night${8 - G.day === 1 ? "" : "s"} ` +
    "left. Goal: สบายสบาย — get happy. ★", "win");
  _say("(SCORE tracks happiness, the clock, and your body. Eat, drink water, " +
    "don't get bitten. SLEEP here ends a night on your terms; the city ends it " +
    "otherwise. RESTART any time for a fresh trip.)", "dim");
}

