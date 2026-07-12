// The Last Baht Bus — game engine, part 5/5: the command surface — verb
// handlers, fast travel, the Zork ledger, autocomplete, the parser, and boot
// text. Loads last (see engine-core's header for the split's load-order contract).

// ── Verb handlers ──────────────────────────────────────────────────────────

const _DIRS = {
  n: "n", north: "n", s: "s", south: "s", e: "e", east: "e", w: "w", west: "w",
  in: "in", inside: "in", out: "out", outside: "out",
  alley: "alley", office: "office",
};

function _doGo(dirWord) {
  const dir = _DIRS[dirWord];
  const r = _room();
  if (!dir || !r.exits[dir]) { _say("You can't go that way."); return; }
  const to = r.exits[dir];
  // a downpour owns the street: nothing moves except into shelter
  if (G.rain > 0) {
    if (!_sheltered(to)) {
      if (_sheltered(G.room)) {
        _say("You get one step toward the door before the doorway itself talks " +
          "you out of it — a solid moving wall of water where the street used " +
          "to be. The mamasan doesn't even look up. Nobody leaves in this; " +
          "that's what the rain is FOR.");
      } else {
        _say("Not in this. The street is a river, the rain is horizontal, and " +
          "the awning above you is the entire habitable world. It can't last " +
          "much longer. Probably.");
      }
      return;
    }
    if (!_sheltered(G.room)) {
      _say("You pick your moment and dive through the doorway, shedding water " +
        "like a soi dog.", "dim");
    }
  }
  // hotel rooms open for their guests only
  const _hotelOf = Object.keys(_HOTELS).find(k => _HOTELS[k].room === to);
  if (_hotelOf && _hotelOf !== G.hotel && _flag("hasWallet")) {
    _say(`The ${_HOTELS[_hotelOf].name} desk takes one practiced look at you: ` +
      "\"Guest, sir?\" Your key card opens a different hotel tonight. The " +
      "smile that follows is kind and absolutely final.");
    return;
  }
  // room 412's key card is in the wallet: no wallet, no room
  if (to === "hotel_room" && !_flag("hasWallet")) {
    _say("The night clerk looks up, takes in the sand, the sunburn, the eyes. " +
      "“Key card, sir?” The key card is in your wallet. The wallet is out there " +
      "somewhere in the neon. He spreads his hands, genuinely sorry: no card, " +
      "no room, hotel policy since forever.", "alert");
    _say("(Get the wallet back. The trail is out there — the bar ladies know " +
      "everything that happens in this town.)", "dim");
    return;
  }
  // office door: locked unless the DJ has security singing
  if (to === "oy_office" && !_flag("officeOpen")) {
    if (_flag("sabaiPlaying")) {
      _setFlag("officeOpen");
      _say("Security are mid-chorus with their backs turned and their hearts full. " +
        "You slide behind the bar; the ห้ามเข้า door is unlocked, exactly as Ploy promised.");
    } else {
      _deliver("security", _pickDialogue("security"));
      return;
    }
  }
  // the lobby ATM: the daily damage, drawn on the way out
  if (G.room === _hotelRoomId() && G.stage === "vacation" && G.atmDay !== G.day) {
    G.atmDay = G.day;
    G.money += SAFE_CASH;
    _say(`You stop at the lobby ATM on the way out. It considers your card, sighs, ` +
      `and surrenders the daily damage: ฿${SAFE_CASH}. (฿${G.money} in pocket.)`, "dim");
  }
  _arriveAt(to);
}

// Arrival side-effects shared by _doGo and _doTravel: door policy, the room
// description, the light warning, the debt scene, quiz capture, standing
// invitations, street encounters. Everything that happens because you're
// suddenly *here*, however you got here.
function _arriveAt(to) {
  if (ROOMS[to].barType) {
    const b = G.soc.banned[to];
    if (b !== undefined) {
      if (G.turns - b < BAN_TURNS) {
        _say("The doorman's arm comes down like a toll gate, and the head-shake " +
          "is slow and final. Not tonight — or at least not this shift.", "alert");
        return;
      }
      delete G.soc.banned[to]; // shift change; you're merely on notice now
      G.soc.heat[to] = 1;
    }
    if (G.soc.patronBusy[to] === undefined) G.soc.patronBusy[to] = _rand() < 0.4;
  }
  G.room = to;
  _describeRoom(true);
  _lightNotice(); // walking in with the torch burning gets you clocked
  // the anti-Simon machine: when the book gets heavy, the town catches you
  if (G.hotelDebt >= 800 && !_flag("tabSettled") &&
      (G.room === "stinky_bar" || G.room === "candy_bar")) {
    _setFlag("tabSettled");
    const owed = G.hotelDebt;
    G.hotelDebt = 0;
    if (G.room === "stinky_bar") {
      _say("Bert refills without being asked. \"Night clerk at your hotel rang " +
        "around about a farang on the book,\" he says, racking the balls. " +
        `\"It's handled, bud. ฿${owed}, squared.\" He won't discuss it further ` +
        "and won't take it back. \"You buy the next man's beer. That's the " +
        "whole system.\"", "win");
    } else {
      _say("Candy sets your glass down and, with it, a folded receipt from your " +
        `hotel — ฿${owed}, marked PAID in the clerk's careful hand. \"Everybody's ` +
        "problems come to Candy,\" she says, already looking past you at the " +
        "soi. \"Even the ones you don't bring. You get famous when you owe " +
        "money, tilac. Be famous for something else.\"", "win");
    }
  }
  // quiz night: walk in during the window and the microphone finds you
  if (_quizHere()) { _startQuiz(); return; }
  // a standing invitation, honoured: she said come, and you came
  const inv = G.phone.invite;
  if (inv && inv.day === G.day && NPCS[inv.id].room === G.room) {
    G.phone.invite = null;
    G.soc.drinks[inv.id] = (G.soc.drinks[inv.id] || 0) + 1;
    _say(`${NPCS[inv.id].name} spots you from across the room and lights up like ` +
      "payday — the kept seat is produced, a cold towel appears, and for one whole " +
      "minute you are the only customer who has ever existed. Showing up counts " +
      "double in this town.", "win");
    _addHappy(2);
  }
  _maybeEncounter();
}

// ── Fast travel ────────────────────────────────────────────────────────────
// TRAVEL <bar|hotel>: autopilot to any bar (or your own hotel) you've stood
// in before. Costs exactly what walking would — the BFS hop count in turns,
// each paying full _tick — so it saves keystrokes, never time. Rain still
// owns the street, and the night can end (or a bar encounter corner you)
// mid-walk, same as walking by hand.

function _hops(from, to) {
  if (from === to) return 0;
  const seen = { [from]: 0 };
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    for (const nxt of Object.values(ROOMS[cur].exits || {})) {
      if (seen[nxt] !== undefined) continue;
      seen[nxt] = seen[cur] + 1;
      if (nxt === to) return seen[nxt];
      q.push(nxt);
    }
  }
  return null;
}

function _travelDests() {
  // never offers where you already stand — a zero-turn trip isn't a trip
  const out = Object.keys(G.visited).filter(id =>
    id !== G.room && ROOMS[id] && ROOMS[id].bar);
  // your hotel needs no discovering — knowing where you sleep is the premise
  const home = _hotelRoomId();
  if (home !== G.room) out.push(home);
  return out;
}

function _doTravel(arg) {
  const w = (arg || "").toLowerCase().replace(/^to (the )?/, "").trim();
  const dests = _travelDests();
  if (!w) {
    if (!dests.length) {
      _say("You don't know the way anywhere yet. Places join the list once you've stood in them.");
      return;
    }
    _say("You know the way to:", "dim");
    for (const id of dests) {
      const h = _hops(G.room, id);
      if (h === null) continue;
      _say(`  ${ROOMS[id].bar || ROOMS[id].name} — ${h} turn${h === 1 ? "" : "s"}`, "dim");
    }
    _say("(TRAVEL <place>. Walking pace — no shortcuts through the clock.)", "dim");
    return;
  }
  let dest = null;
  if (/^(hotel|my room|home|room)$/.test(w) ||
      _HOTELS[G.hotel].name.toLowerCase().includes(w)) {
    dest = _hotelRoomId();
  }
  if (!dest) {
    for (const id of dests) {
      const r = ROOMS[id];
      if ((r.bar && r.bar.toLowerCase().includes(w)) ||
          r.name.toLowerCase().includes(w)) { dest = id; break; }
    }
  }
  if (!dest) {
    const here = _room();
    if ((here.bar && here.bar.toLowerCase().includes(w)) ||
        here.name.toLowerCase().includes(w)) {
      _say("You're standing in it.");
      return;
    }
    _say("You only know the way to bars and hotels you've already found. (Bare TRAVEL lists them.)");
    return;
  }
  if (G.rain > 0) {
    _say("Not in this. The whole town is under the awnings waiting it out, and " +
      "so are you.");
    return;
  }
  if (dest === "hotel_room" && !_flag("hasWallet")) {
    _say("No key card, no room — the clerk was politely immovable about it. The wallet first.");
    return;
  }
  const hops = _hops(G.room, dest);
  if (hops === null) { _say("You can't get there from here."); return; }
  _say(`You point yourself at ${ROOMS[dest].bar || ROOMS[dest].name} and let your ` +
    `feet do the remembering — ${hops} turn${hops === 1 ? "" : "s"} of soi, neon, ` +
    "and shortcuts.", "dim");
  // walking pace: hops turns in total; doCommand pays the last at the bottom
  const startDay = G.day;
  for (let i = 0; i < hops - 1; i++) {
    _tick();
    if (G.day !== startDay || G.over) return; // the night ended mid-walk
    if (G.pendingEnc || G.game) {
      _say(`(${_clockStr()} — the street has other plans.)`, "dim");
      return;
    }
  }
  _arriveAt(dest);
}

function _doEnter(arg) {
  const r = _room();
  // digits → the safe
  const asThai = parseThaiDigits(arg.replace(/\s/g, ""));
  const asNum = /^\d+$/.test(arg) ? parseInt(arg, 10) : asThai;
  if (asNum !== null && !Number.isNaN(asNum) && arg) return _doSafe(asNum);
  if (!arg) return _doGo("in");
  // named bar adjacent to here
  const w = arg.toLowerCase();
  for (const [dir, to] of Object.entries(r.exits)) {
    const target = ROOMS[to];
    if (target.bar && target.bar.toLowerCase().includes(w)) return _doGo(dir);
    if (target.name.toLowerCase().includes(w)) return _doGo(dir);
  }
  _doTravel(w); // not adjacent — maybe it's somewhere you know the way to
}

function _doSafe(num) {
  if (G.room !== "oy_office") { _say("There's no keypad here."); return; }
  if (_flag("hasWallet")) { _say("The safe hangs open and empty. You've pushed your luck far enough."); return; }
  if (num === SAFE_PIN) {
    _say(`You press ${thaiDigits(SAFE_PIN)} — the number from the poster, and the ` +
      "lucky nine. A pause. A clunk that sounds like forgiveness. The safe swings open.");
    G.itemLoc.wallet = "inventory";
    _setFlag("hasWallet");
    G.money += 500;
    _say("(You take your wallet. Most of the cash is still in it — ฿500 back in " +
      "play — and there's a note inside, worth reading.)", "dim");
  } else {
    G.safeTries++;
    if (G.safeTries >= 3) {
      G.room = "tt_deep";
      G.safeTries = 0;
      _say("A third wrong code. Somewhere a buzzer buzzes. Two security guys appear " +
        "with the calm of men who enjoy their work, walk you out through the bar, " +
        "and deposit you in the lane with impeccable politeness.", "alert");
      _addHappy(-2);
      _describeRoom(true);
    } else {
      _say("The keypad blinks red. " + (G.safeTries === 2 ?
        "It feels like one more wrong try would be a mistake." :
        "Nothing happens. Yet."));
    }
  }
}

function _doTake(arg) {
  if (!arg) { _say("Take what?"); return; }
  if (_isDarkHere()) { _say("You grope around in the dark and find nothing but regret."); return; }
  const id = _findItem(arg, "room");
  if (!id) { _say("You don't see that here."); return; }
  const it = ITEMS[id];
  if (!it.portable) { _say(it.name === "marigold offering" ?
    "Taking a shrine offering? With YOUR luck tonight?" :
    "That's staying where it is."); return; }
  G.itemLoc[id] = "inventory";
  _say(`Taken: ${it.name}.`);
}

function _doDrop(arg) {
  const id = _inv().find(i => ITEMS[i].name.toLowerCase().includes(arg) ||
    ITEMS[i].aliases.some(a => a.includes(arg)));
  if (!id) { _say("You're not carrying that."); return; }
  G.itemLoc[id] = G.room;
  _say(`Dropped: ${ITEMS[id].name}.`);
}

function _doInventory() {
  const inv = _inv();
  _say(`฿${G.money} · phone ${G.battery}%${G.lightOn ? " (flashlight on)" : ""} · ` +
    `${_clockStr()} day ${G.day} · hunger ${G.hunger} · thirst ${G.thirst}`, "dim");
  _say(inv.length ? "You are carrying: " + inv.map(id => ITEMS[id].name).join(", ") + "." :
    "You are carrying nothing but experience.");
}

function _doExamine(arg) {
  if (!arg) return _describeRoom(true);
  const npc = _findNpc(arg);
  if (npc) { _say(NPCS[npc].desc); return; }
  const pat = _findPatron(arg);
  if (pat) { _say(PATRONS[pat].desc); return; }
  const id = _findItem(arg);
  if (id) { _say(ITEMS[id].desc); return; }
  if (arg === "sign") return _doRead("sign");
  _say("Nothing special about that — or it isn't here.");
}

function _doRead(arg) {
  if (/news|paper/.test(arg)) return _doPaper();
  if (arg.includes("sign")) {
    const s = _room().sign && SIGNS[_room().sign];
    if (!s) { _say("No signs worth reading here."); return; }
    _say(`The sign reads: ${s.th}`, "thai");
    _engineSpeak(s.th);
    _say(`(${s.hint})`, "dim");
    return;
  }
  const id = _findItem(arg);
  if (!id) { _say("You don't have that to read."); return; }
  const it = ITEMS[id];
  if (id === "receipt") {
    _say(it.readTh, "receipt"); // mono, un-enlarged Thai so the columns align
    _say(it.readEn);
    if (!_flag("knowWasHere")) {
      _setFlag("knowWasHere");
      _say("(Soi Buakhao, 3 a.m. That's a lead — and proof of where you were.)", "dim");
    }
    return;
  }
  if (id === "wallet") { _say(it.desc); return; }
  _say(it.desc);
}

function _doTalk(arg, topic) {
  const npc = _findNpc(arg);
  if (!npc) {
    const pat = _findPatron(arg);
    if (pat) { _patronTalk(pat, topic); return; }
    if (_inBar() && /patron|regular|expat|customer|guy|bloke|farang/.test(arg)) {
      _doPatron();
      return;
    }
    _say("Nobody by that name here.");
    return;
  }
  const d = _pickDialogue(npc, topic || null);
  if (!d) {
    _say(topic ? `${NPCS[npc].name} doesn't have much to say about that.` :
      `${NPCS[npc].name} smiles politely.`);
    return;
  }
  _deliver(npc, d);
  _questOffer(npc);
}

function _doWai(arg) {
  const npcs = _npcsHere();
  const target = arg ? _findNpc(arg) : (npcs.length === 1 ? npcs[0] : null);
  if (!target) {
    if (!npcs.length) { _say("You wai the empty street. A passing soi dog looks moved."); return; }
    _say("You press your palms together and wai the room in general. Approving nods.");
    for (const id of npcs) _waiEffect(id);
    return;
  }
  _say(`You wai ${NPCS[target].name} — palms together, small bow, like you mean it.`);
  _waiEffect(target);
}

function _waiEffect(id) {
  if (id === "oy" && !_flag("waiedOy")) {
    _setFlag("waiedOy");
    _say("Madam Oy's eyebrow rises one millimetre. From her, that's a standing ovation.", "dim");
    _addHappy(1);
  }
  if (id === "ploy" && !_flag("waiedPloy")) {
    _setFlag("waiedPloy");
    _say("Ploy's counting pauses for the first time tonight.", "dim");
    _addHappy(1);
  }
  if (id === "fon" && !_flag("greetedFon")) {
    _setFlag("greetedFon");
    _say("Fon lights up like the neon just found a new colour.", "dim");
    _addHappy(1);
  }
}

function _doSay(arg, targetWord) {
  const key = matchThaiPhrase(arg);
  const target = (targetWord || "").trim();

  // SAY <phrase> TO <person>: aim it at one person, get their reaction — the
  // directed cousin of the room-wide SAY below, and distinct from TALK (which
  // fires the NPC's own dialogue, not yours).
  if (target) {
    let id = _findNpc(target);
    const patronHere = _inBar() && /patron|regular|expat|customer|guy|bloke|farang/.test(target);
    if (!id && !patronHere) { _say("They're not here to hear it."); return; }
    const name = id ? NPCS[id].name : "the regular";
    if (!key) {
      _say(`You try a phrase on ${name}, who receives it with the fond, baffled ` +
        "smile of someone who did not catch a word but liked the effort.");
      return;
    }
    const phrase = THAI_PHRASES.find(p => p.key === key);
    _say(`You say to ${name}: “${phrase.th}” (${phrase.rom})`, "thai");
    _engineSpeak(phrase.th);
    _sayDirectedReact(key, id, name);
    return;
  }

  if (!key) { _say("You give it your best shot. A passing lady pats your arm kindly."); return; }
  const phrase = THAI_PHRASES.find(p => p.key === key);
  _say(`You say: “${phrase.th}” (${phrase.rom})`, "thai");
  _engineSpeak(phrase.th);
  if (key === "hello") {
    for (const id of _npcsHere()) _waiEffect(id);
    _say("Faces soften. One word of Thai buys more than a round of drinks here.");
  } else if (key === "thanks") {
    _say("Warm smiles all round. Manners are the strongest currency on the soi.");
  } else if (key === "how_much") {
    const r = _room();
    if (r.busStop) _say(`A driver leans out: “${thaiBaht(BUS_FARE)}” (${thaiNumRoman(BUS_FARE)} baht).`, "thai");
    else if (r.motosai) _say(`A piwin grins: “${thaiBaht(MOTOSAI_TOWN)} in town, ${thaiBaht(MOTOSAI_FAR)} to Darkside.”`, "thai");
    else _say("Nobody here is selling anything. Officially.");
  } else {
    _say("Laughter and approval. สนุก!");
  }
}

// One matched phrase, aimed at one person. `id` is null for the ambient bar
// regular. Greetings run the per-NPC unlock (_waiEffect) so SAY สวัสดี TO FON
// works like WAI FON; the rest are targeted flavor.
function _sayDirectedReact(key, id, name) {
  const role = id ? NPC_ROLES[id] : null;
  if (key === "hello") {
    if (id) _waiEffect(id); // fires greetedFon / waiedOy / waiedPloy once
    _say(`${name} returns it — palms not quite together, but the warmth is real.`);
    return;
  }
  if (key === "thanks") {
    _say(`${name} wais back, pleased. Manners are the strongest currency on the soi.`);
    return;
  }
  if (key === "how_much") {
    if (role) {
      _say(`${name} laughs. “For talk? Free, tilac.” She taps the lady-drink menu. ` +
        `“Everything else start at ฿${LADY_DRINK}.”`, "thai");
    } else if (id === "bank" || (id && NPCS[id].emoji === "🏍️")) {
      _say(`${name} grins: “${thaiBaht(MOTOSAI_TOWN)} in town, ${thaiBaht(MOTOSAI_FAR)} to Darkside.”`, "thai");
    } else {
      _say(`${name} spreads their hands. “Depends what you buying, boss.”`);
    }
    return;
  }
  if (key === "no") {
    _say(`${name} accepts the “mai ao” with theatrical, entirely insincere disappointment.`);
    return;
  }
  if (key === "delicious") {
    _say(`${name} beams. “Chai! Aroi mak.” Complimenting the food is never the wrong move.`);
    return;
  }
  // fun
  _say(`“Sanuk mak!” ${name} toasts the sentiment and the night nudges upward.`);
  _addHappy(1);
}

function _doGive(itemWord, npcWord) {
  const npc = _findNpc(npcWord);
  const id = _inv().find(i => ITEMS[i].name.toLowerCase().includes(itemWord) ||
    ITEMS[i].aliases.some(a => a.includes(itemWord)));
  if (!npc) { _say("They're not here."); return; }
  if (!id) { _say("You're not carrying that."); return; }
  if (id === "helmet" && npc === "pim") {
    G.itemLoc.helmet = null;
    const d = _pickDialogue("pim"); // helmet entry matches on hasHelmet
    _deliver("pim", d);
    _setFlag("helmetDelivered");
    return;
  }
  if (id === "som_tam" && npc === "ploy") {
    G.itemLoc.som_tam = null;
    _setFlag("somTamDelivered");
    const d = _pickDialogue("ploy");
    _deliver("ploy", d);
    return;
  }
  if (id === "sang_som" && npc === "bee") {
    G.itemLoc.sang_som = null;
    _setFlag("sangsomDelivered");
    _say("Bee receives the boxed bottle with both hands, reads the card, and for " +
      "two full seconds the franchise smile is just a person's. “Auntie send " +
      "THIS?” She sets it on the opening shelf, dead centre, label out, then " +
      "presses thank-you money into your hand over your objections. Family rules.", "win");
    return;
  }
  if (id.startsWith("bottle") && npc === "nok") return _doSellBottles();
  const SALENG_GIFTS = ["saleng_sandals", "saleng_heels", "saleng_lingerie"];
  if (SALENG_GIFTS.includes(id) && NPC_ROLES[npc]) {
    G.itemLoc[id] = null;
    G.soc.drinks[npc] = (G.soc.drinks[npc] || 0) + 1;
    const name = NPCS[npc].name;
    const GIFT_TEXT = {
      saleng_sandals: {
        hostess: `${name} opens the bag, holds up one sandal, turns it sole-up, and grins. ` +
          `She tries them on right here. They fit. She gives you a look that says she's ` +
          `choosing to be impressed by this. "You buy from saleng?" Yes. "Good price?"` +
          ` She decides yes. She keeps them on for the rest of the night.`,
        mamasan: `${name} examines the sandals with professional eyes — heel height, ` +
          `sequin quality, sole thickness — and nods approval. "My size also." ` +
          `She puts them straight into her bag and pats your shoulder once. Understood.`,
      },
      saleng_heels: {
        hostess: `${name} pulls a platform heel out and holds it up in the bar light, ` +
          `tilting it. Then she looks at you with a very specific expression: genuine ` +
          `but surprised. She steps out of her work flats and into the heels without ` +
          `sitting down, which is more impressive than it should be. "Fit perfectly." ` +
          `She beams. You feel like you did something right by accident.`,
        mamasan: `${name} takes the heels, looks at the sole, flips them over, and ` +
          `checks the stitching on the strap. Then she looks at you. "You know my size?" ` +
          `You didn't. They fit anyway. She slides them under her stool and tops up your ` +
          `drink without you asking.`,
      },
      saleng_lingerie: {
        hostess: `${name} peeks into the bag, goes very still for one beat, and then ` +
          `laughs — not embarrassed, just surprised. "You buy this for me?" She looks ` +
          `at you again, differently. "From saleng, right?" She folds the bag carefully ` +
          `and puts it in her work bag. She keeps smiling for the next ten minutes ` +
          `without quite explaining why.`,
        mamasan: `${name} opens the bag, closes it, and gives you a look you won't be ` +
          `able to describe later but will remember. "Good quality for saleng." She ` +
          `nods once, puts the bag in her drawer, and refills your drink herself. ` +
          `This is a significant gesture. She also doesn't mention it again.`,
      },
    };
    const role = NPC_ROLES[npc] === "mamasan" ? "mamasan" : "hostess";
    _say(GIFT_TEXT[id][role], "win");
    _addHappy(1);
    _maybeSelfBarfine(npc);
    return;
  }
  _say(`${NPCS[npc].name} waves it away with a smile.`);
}

function _doSellBottles() {
  if (G.room !== NPCS.nok.room) { _say("No bottle buyer here. Auntie Nok's cart is on Jomtien Beach Road."); return; }
  const bottles = _inv().filter(id => ITEMS[id].bottle);
  if (!bottles.length) { _say("\"No bottle, no baht, tilac.\" Fair."); return; }
  for (const b of bottles) G.itemLoc[b] = null;
  const paid = bottles.length * 5;
  G.money += paid;
  _say(`Auntie Nok counts the glass, nods, and presses coins into your hand: ฿${paid}. ` +
    `(You have ฿${G.money}.)`);
  if (G.money >= BUS_FARE && !_flag("gotBusFare")) {
    _setFlag("gotBusFare");
    _say("\"Enough for bus now! Go, go — town that way.\" She shoos you fondly.", "dim");
  }
}

function _doBuy(arg) {
  const r = _room();
  if (arg.includes("charger")) {
    if (!(r.shop && r.shop.charger) && !r.seven) { _say("No chargers sold here. Try a 7-Eleven."); return; }
    if (G.itemLoc.charger === "inventory") { _say("You already own one heroic charger."); return; }
    if (G.money < CHARGER_PRICE) { _say(`The charger is ฿${CHARGER_PRICE}. You have ฿${G.money}. The cashier's sympathy is genuine but unhelpful.`); return; }
    G.money -= CHARGER_PRICE;
    G.itemLoc.charger = "inventory";
    _say(`One USB charger, ฿${CHARGER_PRICE}. The doorbell jingles in celebration. (฿${G.money} left.)`);
    return;
  }
  if (/water|nam plao/.test(arg)) {
    const canBuy = r.shop || r.seven || _inBar() || FOOD_STALLS[G.room];
    if (!canBuy) { _say("No water for sale here. 7-Elevens, bars, and the street carts all have it."); return; }
    const price = _inBar() ? 20 : 10;
    if (G.money < price) { _say(`฿${price} for a cold bottle, and you don't have it. Grim.`); return; }
    G.money -= price;
    G.thirst = Math.max(0, G.thirst - 45);
    _say(`A cold bottle of water, gone in one go. Civilisation. (฿${G.money} left.)`);
    return;
  }
  if (r.seven && /toastie|cheese|sandwich|food|snack/.test(arg) && !FOOD_STALLS[G.room]) {
    if (G.money < 35) { _say(`The toastie is ฿35. You have ฿${G.money}. The doorbell jingles in sympathy.`); return; }
    G.money -= 35;
    G.hunger = Math.max(0, G.hunger - 40);
    _say("The iconic 7-Eleven cheese toastie, pressed twice while you wait, eaten " +
      "molten on the kerb like every farang before you back to the dawn of time. " +
      `There are worse religions. (฿${G.money} left.)`);
    _addHappy(1);
    return;
  }
  if (FOOD_STALLS[G.room] && /food|eat|toastie|mango|som tam|somtam|chicken|kebab|rice|snack/.test(arg)) {
    const f = FOOD_STALLS[G.room];
    if (G.money < f.price) { _say(`฿${f.price}, and you're short. The smell alone is worth half that, and free.`); return; }
    G.money -= f.price;
    G.hunger = Math.max(0, G.hunger - f.hunger);
    if (f.thirst) G.thirst = Math.max(0, Math.min(100, G.thirst - f.thirst));
    _say(`฿${f.price} buys ${f.name}. You eat it standing up like a local and feel ` +
      `the night improve. (฿${G.money} left.)`);
    _addHappy(1);
    return;
  }
  if (/beer|chang|leo|singha/.test(arg) && !arg.includes("drink")) {
    if (!_inBar()) { _say("The 7-Eleven fridge hums somewhere, but this calls for a bar stool."); return; }
    if (G.money < BEER_PRICE) { _say(`A big bottle is ฿${BEER_PRICE} here. You have ฿${G.money}. The cashier's calculator stays in the drawer.`); return; }
    if (/patron|regular|expat|him|guy|bloke/.test(arg)) {
      G.money -= BEER_PRICE;
      if (G.soc.patronMiffed[G.room]) {
        delete G.soc.patronMiffed[G.room];
        G.soc.heat[G.room] = Math.max(0, (G.soc.heat[G.room] || 0) - 1);
        _say(`A cold one slides down the bar to the regular. He studies it, studies ` +
          `you, and the shoulder unturns. “No harm done, lad.” Form restored. (฿${G.money} left.)`);
      } else {
        _say(`You stand the regular a Chang. He receives it like a sacrament and ` +
          `immediately begins a story about Walking Street in 2004. (฿${G.money} left.)`);
      }
      return;
    }
    G.money -= BEER_PRICE;
    G.soc.drunk++;
    G.thirst = Math.max(0, G.thirst - 20);
    const d = G.soc.drunk;
    _say(`One big Chang, cold enough to hurt. (฿${G.money} left.)` +
      (d >= 6 ? " The room has developed a gentle rotation." :
       d >= 4 ? " The neon is starting to smear pleasantly." :
       d >= 2 ? " The night improves by one bottle's worth." : ""));
    _addHappy(d <= 4 ? 1 : -1);
    _checkDrunk();
    return;
  }
  if (arg.includes("lady drink") || arg.includes("ladydrink") || arg.includes("drink")) {
    if (!_inBar()) { _say("Buy a drink where drinks are sold, tilac."); return; }
    const nameW = arg.replace(/\blady\b|\bdrinks?\b|\bfor\b/g, " ").trim();
    const girlsHere = _npcsHere().filter(id => NPC_ROLES[id]);
    const id = nameW ? _findNpc(nameW) : girlsHere[0];
    if (!id || !NPC_ROLES[id]) { _say(nameW ? "She's not working this bar." : "Nobody here to buy one for."); return; }
    if (G.money < LADY_DRINK) { _say(`Lady drinks are ฿${LADY_DRINK}. You have ฿${G.money}. The maths is not on your side.`); return; }
    G.money -= LADY_DRINK;
    G.soc.drinks[id] = (G.soc.drinks[id] || 0) + 1;
    _say(`One lady drink for ${NPCS[id].name} — ฿${LADY_DRINK} on the tab that is your life. (฿${G.money} left.)`);
    _addHappy(1);
    if (Object.keys(G.soc.drinks).length >= 4 && !G.soc.butterflyTeased) {
      G.soc.butterflyTeased = true;
      _say(`${NPCS[id].name} counts something on her fingers, eyes narrowing in ` +
        "delight: “Ohhh, I hear about you. BUTTERFLY!” She makes the wing motion. " +
        "The whole bar makes the wing motion. This is your reputation now.", "dim");
    }
    // the mamasan's blessing: her bar warms to you, and the house may pour one back
    if (NPC_ROLES[id] === "mamasan" && NPCS[id].room === G.room && !G.soc.mamaTreat[G.room]) {
      G.soc.mamaTreat[G.room] = true;
      _say(`${NPCS[id].name} raises the glass a centimetre in your direction — the ` +
        "royal assent. The temperature of the whole bar changes; from here on, " +
        "the girls treat you like a regular.", "dim");
      _addHappy(2);
      if (_rand() < 0.5) {
        G.soc.drunk++;
        G.thirst = Math.max(0, G.thirst - 20);
        _say("She flicks two fingers at the cashier and a cold one lands in front " +
          "of you. On the house.", "dim");
        _checkDrunk();
      }
    }
    // drink-sniping a girl who had the regular's attention: bad form
    if (G.soc.patronBusy[G.room] && !G.soc.patronMiffed[G.room] && NPC_ROLES[id] === "hostess") {
      G.soc.patronMiffed[G.room] = true;
      _say("Down the bar, the regular who has been buying her drinks all evening " +
        "goes very still over his Chang. Bad form, and every lady in the room " +
        "clocked it.", "alert");
      _addHeat(1);
    }
    if (id === "candy" && !_flag("knowMot")) {
      _setFlag("knowWasHere"); _setFlag("knowMot");
      _deliver("candy", _pickDialogue("candy"));
    } else if (id === "pim" && !_flag("pinPart9")) {
      _setFlag("helmetDelivered"); // she'll talk now regardless
      _deliver("pim", _pickDialogue("pim", "oy"));
    } else {
      _say(`${NPCS[id].name} toasts you and the conversation gets noticeably warmer.`);
    }
    _maybeSelfBarfine(id);
    return;
  }
  if (/\bbra\b|\bbrassiere\b/.test(arg)) {
    if (!_inBar()) { _say("The emergency bra is a bar-stool institution, not a street stall."); return; }
    const nameW = arg.replace(/\bbra\b|\bbrassiere\b|\bfor\b/g, " ").trim();
    const girlsHere = _npcsHere().filter(x => NPC_ROLES[x] === "hostess");
    const id = nameW ? _findNpc(nameW) : (girlsHere.length === 1 ? girlsHere[0] : null);
    if (!id || NPC_ROLES[id] !== "hostess") {
      _say(nameW ? "She's not one of the dancers, and would like you to know it." :
        girlsHere.length ? "Buy it for whom? BUY BRA FOR <name>." :
        "Nobody here is in the market for one.");
      return;
    }
    const name = NPCS[id].name;
    if (_favor(id) < 2) {
      _say(`You offer to buy ${name} a bra and she raises an eyebrow that could ` +
        "cut glass. “Buy me DRINK first, then we talk about my wardrobe.” " +
        "(Warm her up — a lady drink or two.)");
      return;
    }
    G.soc.bra = G.soc.bra || {};
    if (G.soc.bra[id]) {
      _say(`${name} is already wearing the one you bought, and enjoying the novelty ` +
        "of it roughly as much as you are.");
      return;
    }
    if (G.money < BRA_PRICE) {
      _say(`The mamasan's drawer bra runs ฿${BRA_PRICE}. You have ฿${G.money}. She ` +
        "keeps a straight face; the drawer stays shut.");
      return;
    }
    G.money -= BRA_PRICE;
    G.soc.bra[id] = true;
    _say(`The mamasan produces a lacy something from a drawer of legend, ${name} ` +
      "vanishes for a theatrical thirty seconds and returns having made the " +
      `evening's physics considerably more interesting. (-฿${BRA_PRICE}, ฿${G.money} left.)`, "win");
    _addHappy(1);
    _maybeSelfBarfine(id);
    return;
  }
  if (/\bband\b/.test(arg) && /\bround\b|\bdrink/.test(arg)) {
    if (!_inBar()) { _say("You'd need to be inside the bar to put a round on the tab."); return; }
    if (!_bandHere()) { _say("No band playing here tonight."); return; }
    if (G.money < BAND_ROUND) {
      _say(`A round for the band runs ฿${BAND_ROUND}. You have ฿${G.money}. The tip box ` +
        "is cheaper — TIP BAND [amount].");
      return;
    }
    const r = G.room;
    G.money -= BAND_ROUND;
    G.soc.bellAt[r] = G.turns;
    G.soc.bells[r] = (G.soc.bells[r] || 0) + 1;
    G.soc.heat[r] = 0;
    delete G.soc.patronMiffed[r];
    _say(`฿${BAND_ROUND} to the mama for the band. Four ice-cold Changs materialise on ` +
      "the monitor wedge — the vocalist nods, the guitarist raises his bottle, the " +
      "drummer doesn't stop playing but somehow conveys gratitude. The whole bar " +
      `notes this. (฿${G.money} left.)`, "win");
    _say("The girls approve of the gesture but point out, with their eyes, that the " +
      "bell is still up there.", "dim");
    _addHappy(2);
    return;
  }
  _say("Not for sale here.");
}

function _doRideBus(arg) {
  const r = _room();
  if (G.rain > 0) {
    _say("Headlights crawl past behind the wall of water, but no songthaew is " +
      "stopping — the drivers can't tell a fare from a lamppost in this.");
    return;
  }
  if (!r.busStop) { _say("No bus stop here. Look for one on the main roads."); return; }
  const lines = Object.entries(BUS_LINES).filter(([, stops]) => stops.includes(G.room));
  const reachable = [...new Set(lines.flatMap(([, stops]) => stops))].filter(s => s !== G.room);
  const w = (arg || "").toLowerCase();
  const dest = reachable.find(s =>
    ROOMS[s].name.toLowerCase().includes(w) || ROOMS[s].region.toLowerCase().includes(w));
  if (!w || !dest) {
    _say("The driver waits. Stops from here: " +
      reachable.map(s => ROOMS[s].name).join(" · "), "dim");
    return;
  }
  if (G.money < BUS_FARE) {
    _say(`You flag a bus and climb on… then remember. ฿${G.money} in your pocket, ` +
      `and the fare is ฿${BUS_FARE}. You climb off to the driver's eternal, silent judgement.`);
    return;
  }
  G.pendingFare = { kind: "bus", price: BUS_FARE, dest };
  _say("The blue songthaew rattles along the seafront, wind through the rails, the " +
    "town sliding past in smears of neon…");
  _say(`You hop off. The driver leans out and says: “${thaiBaht(BUS_FARE)}”`, "thai");
  _engineSpeak(thaiBaht(BUS_FARE));
  _say(`(${thaiNumRoman(BUS_FARE)} … he wants paying. PAY <amount>.)`, "dim");
}

function _doMotosai(arg) {
  const r = _room();
  if (G.rain > 0) {
    _say("The piwins are packed under the stand's awning, smoking, watching the " +
      "water rise. One meets your eye and laughs, not unkindly. Not for any " +
      "money, boss. Not in this.");
    return;
  }
  if (!r.motosai) { _say("No motosai stand here."); return; }
  const w = (arg || "").toLowerCase();
  const destKey = Object.keys(MOTOSAI_DESTS).find(k => w.includes(k) || k.includes(w));
  if (!w || !destKey) {
    _say("The piwin raises an eyebrow: where to? (" +
      Object.keys(MOTOSAI_DESTS).join(" · ") + ")", "dim");
    return;
  }
  const d = MOTOSAI_DESTS[destKey];
  let price = d.price;
  if (_flag("helmetDelivered") && price === MOTOSAI_TOWN) {
    price = 20;
  }
  if (G.money < price) {
    _say(`“${thaiBaht(price)},” says the piwin. You have ฿${G.money}. He shrugs — ` +
      "no hard feelings, no free rides.", "thai");
    return;
  }
  G.money -= price;
  G.room = d.room;
  G.darkStreak = 0;
  _say(`“${thaiBaht(price)}.” You pay${price === 20 ? " — Bank's special price" : ""}, ` +
    "swing on the back, and the piwin threads traffic like it owes him money. " +
    `That was the fastest ฿${price} of your life. (฿${G.money} left.)`, "thai");
  _engineSpeak(thaiBaht(price));
  _describeRoom(true);
  _maybeEncounter();
}

function _doPay(arg) {
  if (!G.pendingFare) { _say("Nobody's waiting to be paid."); return; }
  const amount = /^\d+$/.test(arg) ? parseInt(arg, 10) : parseThaiDigits(arg);
  const { price, dest } = G.pendingFare;
  if (amount === null || Number.isNaN(amount)) {
    _say(`He repeats, slower, the universal way: “${thaiBaht(price)}”. A number would help.`, "thai");
    return;
  }
  if (amount > G.money) { _say(`You don't have ฿${amount}.`); return; }
  if (amount < price) {
    _say(`He looks at the coins, then at you: “${thaiBaht(price)}!” Not a negotiation.`, "thai");
    return;
  }
  if (amount > price) {
    G.money -= amount;
    G.pendingFare = null;
    G.room = dest;
    _say(`He accepts your ฿${amount} with the serene absence of change-giving for which ` +
      "the profession is famous. An expensive listening lesson. (฿" + G.money + " left.)");
  } else {
    G.money -= amount;
    G.pendingFare = null;
    G.room = dest;
    _say(`฿${price}, exact. He taps the rail twice — thanks in driver — and is gone. (฿${G.money} left.)`);
  }
  G.darkStreak = 0;
  _describeRoom(true);
  _maybeEncounter();
}

function _doLight(on) {
  if (!_inv().includes("phone")) { _say("Your phone… you do still have your phone. Deep breaths."); return; }
  if (on) {
    if (G.battery === 0) { _say("The phone is dead. The flashlight is a memory."); return; }
    if (G.lightOn) { _say("The flashlight is already on, eating battery."); return; }
    G.lightOn = true;
    _say(`Flashlight on. (Battery: ${G.battery}% — it drains while it burns.)`);
    if (_room().dark) _describeRoom(true);
    else _lightNotice();
  } else {
    if (!G.lightOn) { _say("It's already off."); return; }
    G.lightOn = false;
    if (G.lightWarn.n > 0 && _room().barType === "gogo") {
      G.lightWarn.room = null; G.lightWarn.n = 0;
      _say("Flashlight off. The security shirts refold into the corner. The " +
        "mamasan's smile returns at its usual wattage, as if nothing happened — " +
        "because now, officially, nothing did.");
      return;
    }
    G.lightWarn.room = null; G.lightWarn.n = 0;
    _say("Flashlight off. Battery preserved; nerves, less so.");
  }
}

// A lit flashlight in a social space gets noticed. On a dark soi it's sense;
// under working neon it's either a fool or a camera — and in a go-go the house
// always assumes the camera. No photos is the one rule nobody bends.
function _lightNotice() {
  if (!G.lightOn || G.battery === 0 || _room().dark) return;
  const r = _room();
  const npcs = _npcsHere();
  if (!r.barType && !npcs.length) return;
  if (r.barType === "gogo") {
    G.lightWarn.mark = true; // this command's warning is spent; the tick skips
    _gogoLightWarn();
    return;
  }
  const girl = npcs.find(id => NPC_ROLES[id] === "hostess");
  let lines;
  if (girl) {
    const name = NPCS[girl].name;
    lines = [
      `${name} shields her eyes theatrically. "Hansum, why you have the torch? ` +
        `You look for your money? I save you time: it's gone."`,
      `${name} steps into the beam and strikes a pose. "Ooh, spotlight! You pay ` +
        `me like a star too, na?" The other girls are already laughing.`,
      `${name} leans over and gently pushes your phone hand down. "Tilac. The ` +
        `neon works fine. You look like you hunt ghosts."`,
    ];
  } else if (r.barType) {
    lines = [
      "The bartender squints into your beam and points, wordlessly, at the " +
        "fully functional lights overhead.",
      "\"Power cut is finish since 2015, boss,\" someone offers from the rail, " +
        "to general amusement.",
    ];
  } else {
    const name = NPCS[npcs[0]].name;
    lines = [
      `${name} tracks your flashlight beam with open amusement. On a street lit ` +
        `like a runway, you are the only one carrying your own sun.`,
      `${name} flicks a phone light back at you across the street — a little ` +
        `lighthouse conversation. You may be the joke here.`,
    ];
  }
  _say(lines[Math.floor(_rand() * lines.length)], "dim");
}

// Go-go escalation: two warnings about the light, then security ends the
// conversation. The counter is per-bar and resets when the light goes off
// or you leave; `mark` stops the entry notice and the same command's tick
// from counting as two warnings.
function _gogoLightWarn() {
  const w = G.lightWarn;
  if (w.room !== G.room) { w.room = G.room; w.n = 0; }
  w.n++;
  const npcs = _npcsHere();
  const mama = npcs.find(id => NPC_ROLES[id] === "mamasan");
  const who = mama ? NPCS[mama].name : "The mamasan";
  if (w.n === 1) {
    _say(`${who} is at your elbow before the beam settles, one flat hand over ` +
      "your phone, smile fixed: \"No photo. No video. House rule, tilac — the " +
      "girls dance, nobody films.\" Two security shirts have already unfolded " +
      "from the corner. Best switch that off.", "alert");
  } else if (w.n === 2) {
    _say(`${who} is back, and the smile is gone. \"OFF. Now.\" Behind her the ` +
      "two security shirts have stopped pretending to watch the stage. The DJ " +
      "has turned the music down half a notch, which somehow makes it worse.", "alert");
  } else {
    w.room = null; w.n = 0;
    _say("Nobody says anything this time. The music doesn't even pause.", "alert");
    _kickOut();
  }
}

function _doCharge() {
  if (!_inv().includes("charger")) { _say("You need a charger. 7-Elevens sell them."); return; }
  if (!_room().outlet) { _say("No outlet here. 7-Eleven has one; so do a couple of friendly bars."); return; }
  if (G.battery >= 100) { _say("Already full. A rare feeling of complete adequacy."); return; }
  G.battery = 100;
  G.lightOn = false;
  _say("You plug in and watch the number climb the way ancient man watched sunrise. " +
    "100%. You are reborn.");
  _addHappy(1);
}

function _doScore() {
  _say(`สนุก happiness: ${G.happy} — ${_happyLevel(G.happy)}`, "win");
  _say(`${_weekday()}, day ${G.day}${G.stage === "expat" ? " · expat life" : " of 7"} · ${_clockStr()} · ` +
    `฿${G.money} · battery ${G.battery}%` +
    (_quizDay() ? " · QUIZ NIGHT 20:00-22:00" : ""), "dim");
  _say(`hunger ${G.hunger} · thirst ${G.thirst}` +
    (G.soc.drunk ? ` · ${G.soc.drunk} bottle${G.soc.drunk > 1 ? "s" : ""} deep` : "") +
    (G.hurt ? ` · banged up (${G.hurt}/3)` : ""), "dim");
  if (_flag("act1Done")) _say(`✓ ACT ONE COMPLETE — scored ${G.score}` +
    (G.vacation > 1 ? ` · vacation #${G.vacation}` : ""), "dim");
  if (_unreadCount()) _say(`📱 ${_unreadCount()} unread message${_unreadCount() > 1 ? "s" : ""} (CHECK MESSAGES)`, "win");
  const active = Object.entries(QUESTS).filter(([qid]) => G.quests[qid] === "active");
  for (const [, q] of active) _say(`▶ ${q.name}`, "dim");
  for (const [f, label] of _ACT1_MILESTONES) if (_flag(f)) _say("✓ " + label, "dim");
}

// ── The Zork ledger ──────────────────────────────────────────────────────────
// Verbs a text adventure must answer, even when the answer is no. Zork always
// had something to say; "I didn't understand that" is a last resort, not a
// personality. Flavor only — nothing here moves game state beyond the tick.

function _doDrink(arg) {
  if (/water|nam/.test(arg)) { _doBuy("water"); return; }
  const w = arg.match(/^with (.+)$/);
  if (w) { _doBuy("lady drink " + w[1]); return; }
  if (!arg || /beer|chang|leo|singha|bottle|drink/.test(arg)) {
    if (!_inBar()) {
      _say("Nothing to drink out here but the humidity. Find a bar stool, or " +
        "a 7-Eleven fridge (BUY WATER).");
      return;
    }
    _doBuy("beer");
    return;
  }
  _say("The bar does beer, lady drinks, and water — in descending order of enthusiasm.");
}

function _doDiagnose() {
  const d = G.soc.drunk;
  const parts = [
    G.hunger >= 70 ? "hungry enough to envy the soi dogs" :
      G.hunger >= 40 ? "peckish, and every cart on the street smells personal" : "fed",
    G.thirst >= 70 ? "dry as a temple bell" :
      G.thirst >= 40 ? "thirsty" : "watered",
    d >= 6 ? `${d} bottles deep and navigating by neon` :
      d >= 3 ? `${d} bottles deep, the world pleasantly loose at the hinges` :
      d >= 1 ? `${d} bottle${d > 1 ? "s" : ""} in` : "stone sober, which is fixable",
  ];
  if (G.hurt) parts.push(`banged up (${G.hurt}/3 — a third strike ends the night)`);
  _say(`Self-diagnosis, ${_clockStr()}: ${parts.join(" · ")}.`);
  _say(`Phone ${G.battery}% · ฿${G.money} · สนุก ${G.happy} (${_happyLevel(G.happy)}). ` +
    "You will live, which in this town is both a prognosis and a lifestyle.", "dim");
}

function _doViolence() {
  if (_inBar()) {
    _say("Security has already noticed you noticing them: large, patient men " +
      "whose entire job is farangs having this exact idea. Beyond them, the " +
      "motosai stand. There is no version of this where you win, and several " +
      "where you swim home. The idea evaporates.");
  } else {
    _say("You know how this plays out: the motosai stand empties before your " +
      "first swing lands, and it does not empty in your favour. In Pattaya " +
      "the street polices itself. The urge passes, as urges here should.");
  }
}

function _doMagic(v) {
  if (v === "plugh") {
    _say("A hollow voice says the magic went out of that one around the same " +
      "time it went out of Walking Street.");
  } else if (v === "pray") {
    _say("The nearest spirit house glitters by a doorway, properly kept — " +
      "marigolds, incense, a strawberry Fanta with a straw in it. You add a " +
      "wai. It can't hurt, and everyone in this town has seen it help.");
  } else {
    _say("A hollow voice says “สบายสบาย.”");
  }
}

function _doHello(arg) {
  if (/sailor/.test(arg)) {
    _say("Nothing happens. The Royal Thai Navy is forty minutes down the road " +
      "in Sattahip, and it has heard them all.");
  } else if (_inBar()) {
    _say("“Herrooo, hansum man!” The nearest hostess returns your hello with " +
      "roughly four hundred percent interest. It's the house rate.");
  } else {
    _say("“HELLO WELCOME!” answer two bars at once, on reflex, without looking up.");
  }
}

const _SMELLS = {
  "Jomtien": "Salt, yesterday's sunscreen, grilled squid from a cart you can't see. Underneath it all, the sea — patient.",
  "Pratumnak": "Frangipani and cut grass. The hill smells like money sleeping.",
  "Beach Road": "Sea salt over two-stroke exhaust, coconut oil, and a base note of last night that nobody has hosed away yet.",
  "Second Road": "Traffic fumes, fried garlic, and the cold chemical exhale of mall air-con every time a door swings.",
  "Soi Buakhao": "Fish sauce off the som tam carts, motorbike exhaust, beer-soaked chipboard. The honest middle of town.",
  "Tree Town": "Perfume and spilled Chang in a closed loop — the complex recycles its own air like a space station.",
  "LK Metro": "Hot concrete, motorbike exhaust, and enough perfume to suggest the alley is having a conversation with itself.",
  "Walking Street": "Dry ice, cigarettes, a hundred perfumes at war, and beneath it the Gulf, comprehensively ignored.",
  "Soi 6": "Perfume applied with intent, cheap floor cleaner, and hotel soap from rooms rented by the hour.",
  "Myth Night": "Fresh paint and fryer oil — a complex still deciding what it wants to smell like when it grows up.",
  "Naklua": "Charcoal smoke, drying fish, temple incense. The town Pattaya used to be before Pattaya happened to it.",
  "Darkside": "Rain on hot dust, lake water, someone burning garden waste three sois over. You could almost be in Thailand.",
};

const _SOUNDS = {
  "Jomtien": "Waves, a beach dog arguing with a kite, the flat slap of sandals on the promenade.",
  "Pratumnak": "Wind in the palms and, far below, the whole town clearing its throat for the evening.",
  "Beach Road": "Baht bus diesel, wave-hiss, and a jet ski tout laughing at his own joke.",
  "Second Road": "Traffic in both directions, and a mall breathing muzak through its automatic doors.",
  "Soi Buakhao": "Motorbikes, Connect Four counters, and a dozen bars playing a dozen songs, every one of them Hotel California.",
  "Tree Town": "Bass bleeding through shared walls. The whole complex has one heartbeat, and it runs at about 128 bpm.",
  "LK Metro": "Go-go bass bouncing off concrete walls, motorbikes threading through, someone's sequins catching the light.",
  "Walking Street": "Doof-doof from six doorways, touts quoting prices, and a bell ringing somewhere — some hero is buying a bar a round.",
  "Soi 6": "Short songs, shorter negotiations, and laughter with a working edge on it.",
  "Myth Night": "A live band soundchecking the same four bars of a Scorpions song, apparently forever.",
  "Naklua": "Temple dogs, a wet market winding down, long-tail engines out on the water.",
  "Darkside": "Cicadas, karaoke drifting across the lake, and geckos calling the odds on it.",
};

function _doSmell() {
  if (_inBar()) {
    _say("Perfume, cold Chang, cigarette ghosts in the upholstery, and the " +
      "bleach that fights a nightly holding action against all three. Every " +
      "bar in town, one smell.");
    return;
  }
  _say(_SMELLS[_room().region] || "Pattaya. It's not describable, but it is memorable.");
}

function _doListen() {
  if (_bandHere()) {
    const lines = [
      "The band is mid-set: the guitarist squeezing a solo out of a song that has been " +
        "squeezed a thousand times before and still surrendering something new.",
      "Right now: a bass player who means it, a drummer keeping perfect time, and a " +
        "vocalist whose English is accented and whose pitch is exact.",
      "Four musicians doing the work of a jukebox and pulling it off by being visibly alive.",
      "The drummer hits the downbeat like he's making a point to someone who isn't listening.",
    ];
    _say(lines[G.turns % lines.length]);
    return;
  }
  if (_inBar()) {
    _say("Ice settling in buckets, Connect Four counters clacking, and the " +
      "chorus of “HELLO WELCOME” as somebody richer walks past outside.");
    return;
  }
  _say(_SOUNDS[_room().region] || "Pattaya, idling.");
}

function _doSwim() {
  if (!["jomtien_beach", "dongtan_beach"].includes(G.room)) {
    _say("The nearest swimmable water is a hotel pool you are not a guest of.");
    return;
  }
  if (G.soc.drunk >= 4) {
    _say("The Gulf at night, this many bottles in? The Pattaya Flying Club has " +
      "a swimming division too, and the membership plaque is the same wall. " +
      "You stay on the sand.");
    return;
  }
  _say("You wade in to your knees. The Gulf is bathwater with ambitions. " +
    "Somewhere off to your left a jet ski scam lies sleeping. It's actually " +
    "rather lovely, which nobody tells you about this town.");
}

function _doDance() {
  if (_room().barType === "gogo") {
    _say("You dance. The professionals up on the chrome observe with the mild " +
      "clinical interest of surgeons watching a man remove his own appendix. " +
      "One of them, kindly, copies you.");
  } else if (_inBar() && _bandHere()) {
    _say("You dance. The band — who have seen everything and played for all of it — " +
      "lock in harder, the drummer hitting the groove where it helps. A hostess " +
      "materialises at your elbow and either leads or follows, both equally convincing.");
    _addHappy(2);
  } else if (_inBar()) {
    _say("You dance between the stools. A hostess joins you instantly and " +
      "without inquiry — enthusiasm is the house style — and for eight bars " +
      "of luk thung you are the floor show.");
  } else if (_bandHere()) {
    _say("You dance in front of the stage. The guitarist points his headstock at you " +
      "approvingly. On the outside this looks ridiculous; on the inside you are having " +
      "the most fun you've had since you stopped caring what it looked like.");
    _addHappy(2);
  } else {
    _say("You dance alone on the pavement. A passing baht bus honks the beat, " +
      "which is generous, because you weren't keeping one.");
  }
}

function _doSing() {
  if (_inBar() && _bandHere()) {
    _say("You add your voice. The band adjusts — subtly, professionally — and you're on " +
      "pitch or something close enough that nobody here is grading. Three hostesses " +
      "join the chorus and the song stops being yours, which is the best thing that " +
      "can happen to it.");
    _addHappy(2);
  } else if (_inBar()) {
    _say("You give it a verse. Three hostesses join the chorus without asking " +
      "what the song is. It has never once mattered.");
  } else if (_bandHere()) {
    _say("You sing along from the crowd. The vocalist grins and points the microphone " +
      "at you for a bar. The correct response is to commit completely, and you do.");
    _addHappy(1);
  } else {
    _say("You sing to the street. Somewhere down the soi a karaoke bar " +
      "answers, worse. Honour is satisfied.");
  }
}

function _doBandRequest(song) {
  const KNOWN_SONGS = [
    ["hotel california", "Hotel California",
      "The guitarist closes his eyes for a beat. 'We just played it.' A pause. " +
      "'We'll play it again.' And they will."],
    ["wonderwall", "Wonderwall",
      "The bassist winces. 'Every night,' he says. 'Every. Night.' But the guitarist " +
      "is already counting them in."],
    ["sweet home alabama", "Sweet Home Alabama",
      "The vocalist grins: 'Classic.' The drummer gets the snare crack on the " +
      "downbeat exactly right."],
    ["highway to hell", "Highway to Hell",
      "The lead guitarist says nothing — just steps to the mic and plays the opening " +
      "riff. The bar wakes up a little."],
    ["brown eyed girl", "Brown Eyed Girl",
      "A safe choice, diplomatically received. The hostesses know this one and they " +
      "prove it, collectively and at volume."],
    ["one more night", "One More Night",
      "Phil Collins at eleven pm in Pattaya. The band plays it straight. You're not " +
      "sure if that's brave or inevitable."],
    ["smells like teen spirit", "Smells Like Teen Spirit",
      "The drummer brightens visibly. It is the one song in the set where he is " +
      "technically doing the most, and he knows it."],
  ];
  const sl = (song || "").toLowerCase().replace(/[^a-z ]/g, "").trim();
  const match = KNOWN_SONGS.find(([k]) => sl.includes(k));
  if (match) {
    _say(`You request ${match[1]}. ${match[2]}`);
    _addHappy(1);
  } else if (sl.length > 1) {
    _say(`The guitarist cups an ear. "${song}?" He shrugs — not in the current set. ` +
      "He counterproposes Hotel California. There is always Hotel California.");
  } else {
    _say("REQUEST [song name] — the band will try to play it, if they know it. " +
      "They almost certainly know Hotel California.", "dim");
  }
}

function _doBandTalk() {
  const lines = [
    "The vocalist leans forward at the break: 'Pattaya — good crowd. You want a " +
      "request? Put it in the box.' He means the tip box on the monitor wedge.",
    "The guitarist, between songs: 'How long we been here? Four years. Go home? " +
      "Home is expensive.' He hits a chord to end the conversation. It's a good chord.",
    "The drummer doesn't take breaks — just adjusts his grip, sips from a water " +
      "bottle, and checks his phone in the three minutes between sets. 'Request?' " +
      "he says without looking up.",
    "The bassist catches your eye. 'Don't ask us for Despacito,' she says. " +
      "'We will play it and it will ruin both our nights.'",
  ];
  _say(lines[(G.turns + G.day) % lines.length]);
}

function _doTime() {
  _say(`${_clockStr()}, ${_weekday()} — day ${G.day}` +
    (G.stage === "expat" ? " of the rest of your life." : " of 7."));
  const t = G.nightTurn;
  if (_quizDay()) {
    _say(t < 20 ? "(Quiz night tonight: 20:00–22:00, three bars, teachers in from Rayong.)" :
      _isQuizWindow() ? "(Quiz night is ON somewhere right now.)" :
      "(Quiz night has been and gone.)", "dim");
  }
  _say(t < 30 ? "(Early doors: barfines run ×1.5 until 21:00.)" :
    t >= 60 ? "(Past midnight: most beer bars have quietly dropped the barfine.)" :
    "(Prime time. Standard rates apply.)", "dim");
}

function _hourToTurn(h) { // 24h clock → nightTurn; the game lives 18:00–04:00
  if (h >= 18 && h <= 23) return (h - 18) * 10;
  if (h >= 0 && h <= 4) return (h + 6) * 10;
  return null;
}

function _doWait(arg) {
  if (!arg) { _say("You wait. Pattaya doesn't."); return; }
  let target = null;
  const until = arg.match(/^(?:until |till |for )?(?:(\d+)|midnight)\s*(am|pm)?$/);
  if (/midnight/.test(arg)) target = _hourToTurn(0);
  else if (until && until[1]) {
    let h = parseInt(until[1], 10);
    if (/^(?:until|till)/.test(arg)) {
      if (until[2] === "pm" && h < 12) h += 12;
      else if (!until[2] && h >= 5 && h <= 11) h += 12; // "until 9" means 21:00 here
      if (h === 12 && until[2] !== "pm") h = 0;         // "until 12" means midnight
      target = _hourToTurn(h % 24);
      if (target === null) { _say("The night runs 18:00 to 04:00. Daylight is for sleeping."); return; }
    } else {
      target = G.nightTurn + Math.min(h, 60); // WAIT <n> turns
    }
  }
  if (target === null) { _say("WAIT <turns>, or WAIT UNTIL <hour> (say, MIDNIGHT)."); return; }
  if (target <= G.nightTurn) { _say(`It's already ${_clockStr()}. Time only runs one way, even here.`); return; }
  const startDay = G.day, inbox0 = G.phone.inbox.length;
  // leave one turn for the tick every command pays at the bottom of doCommand
  while (G.nightTurn < target - 1) {
    _tick();
    if (G.day !== startDay) return; // the night ended out from under you
    if (G.pendingEnc || G.game) { _say(`(${_clockStr()} — so much for waiting.)`, "dim"); return; }
    if (G.phone.inbox.length > inbox0) { _say(`(${_clockStr()} — your phone interrupts.)`, "dim"); return; }
  }
  _say(`You let the night idle past — ice melting, songs turning over, the street ` +
    `rearranging itself. ${_clockStr()}.`);
}

function _doTip(arg) {
  const amtM = arg.match(/(\d+)/);
  const amount = amtM ? parseInt(amtM[1], 10) : 20;
  const nameW = arg.replace(/\d+|฿|baht/g, " ").trim();
  if (/\bband\b|\bmusicians?\b|tip.?box/.test(arg)) {
    if (!_bandHere()) { _say("No band playing here tonight."); return; }
    if (G.money < amount) { _say(`The tip box wants ฿${amount}; you have ฿${G.money}.`); return; }
    G.money -= amount;
    if (amount >= 100) {
      _say(`฿${amount} into the tip box. The guitarist catches your eye mid-riff and ` +
        "nods — you've been seen, which out here counts as a whole conversation. " +
        `(฿${G.money} left.)`, "win");
      _addHappy(1);
    } else {
      _say(`฿${amount} drops into the tip box on the monitor wedge. The band plays on, ` +
        `professionally. (฿${G.money} left.)`);
    }
    return;
  }
  if (!_inBar()) {
    if (_room().motosai) {
      _say("The piwins wave it away, grinning — you haven't ridden anywhere. Tips " +
        "settle debts here; they don't open accounts.");
    } else {
      _say("Tip who? The street works for itself.");
    }
    return;
  }
  const girls = _npcsHere().filter(id => NPC_ROLES[id]);
  const id = nameW ? _findNpc(nameW) : girls[0];
  if (!id || !NPC_ROLES[id]) { _say("Tip who? Name one of the ladies."); return; }
  if (G.money < amount) { _say(`Generosity of spirit, poverty of pocket: you have ฿${G.money}.`); return; }
  G.money -= amount;
  const name = NPCS[id].name;
  if (amount >= 100) {
    const bump = amount >= 300 ? 2 : 1;
    G.soc.drinks[id] = (G.soc.drinks[id] || 0) + bump;
    _say(`฿${amount}, folded small and passed with a wai. ${name} makes it vanish ` +
      `with a conjurer's economy, and the news crosses the bar by whole-room ` +
      `telepathy before your hand is back in your pocket. (฿${G.money} left.)`);
    _addHappy(1);
  } else {
    _say(`฿${amount} into ${name}'s tip jar. A warm smile, a small wai — noted, ` +
      `filed, appreciated. The big ledger, though, runs on lady drinks. (฿${G.money} left.)`);
  }
}

function _doWave(arg) {
  if (/bus/.test(arg) || (!arg && _room().busStop)) {
    _say("You put an arm out at road height. A blue songthaew swerves in within " +
      "four seconds — they can smell an undecided farang at three hundred metres.");
    _doRideBus("");
    return;
  }
  if (_inBar()) {
    _say("You wave. Every hostess in the bar waves back at full wingspan, " +
      "delighted, as though you had just invented it.");
    return;
  }
  _say("You wave. Somewhere down the soi, somebody waves back. It's that kind of town.");
}

const _MAP = `            NAKLUA ─ Sabai Palms Hotel
               │
             SOI 6
               │
  ~  BEACH RD N ─ Stinky Bar
  ~       │
  ~  BEACH RD C ─ CENTRAL ─ SECOND RD N
  ~       │ (Tequila  Mall      │
  ~       │   Queen)     PATTAYA KLANG ──► THE DARKSIDE
  ~       │                     │        (lake · Khao Talo · motosai out)
  ~       │            SECOND RD C ─ MYTH NIGHT
  ~       │                     │         │
  ~  BEACH RD S ──────── SECOND RD S   BUAKHAO N
  ~       │                     │  \\       ║ ═ LK METRO off the soi
  ~  WALKING ST                 │   ── BUAKHAO S
  ~       │                     │
  ~   (the gate)           PRATUMNAK ─ Buddha Hill
  ~                             │
  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  JOMTIEN ~ the beach where it all began`;

function _doMap() {
  _say("The bar-mat map of greater Pattaya, not to scale, like all bar maps:", "dim");
  _say(_MAP, "dim");
}

function _doPhoto() {
  if (G.battery <= 0) {
    _say("Your phone is dead. The moment goes unrecorded, like the best ones always do.");
    return;
  }
  G.battery--;
  if (_inBar()) {
    _say("The word “photo” assembles every hostess in the bar around you in " +
      "under two seconds, peace signs at maximum deployment. Your phone now " +
      "holds nine near-identical frames and one where everybody is beautiful. " +
      "That one gets kept.");
  } else if (["jomtien_beach", "dongtan_beach"].includes(G.room)) {
    _say("You photograph the Gulf doing its end-of-day routine. The photo will " +
      "not capture it. The photo has never once captured it. You take it anyway.");
  } else {
    _say("You take a photo you will never look at again. The neon doesn't " +
      "photograph. It never has.");
  }
}

function _doCall(arg) {
  if (!arg) { _say("Call who?"); return; }
  const id = _findNpc(arg);
  if (!id) { _say("Call who? Nobody by that name in your phone or your eyeline."); return; }
  if (G.battery <= 0) { _say("Dead phone. The town's most reliable excuse."); return; }
  const name = NPCS[id].name;
  _say(`You call ${name}. It rings out. Nine seconds later the phone buzzes in ` +
    `your hand: “ทำไมโทรมา 555 why you CALL???” — nobody in this town answers a ` +
    `phone. (MESSAGE ${name.toUpperCase()} instead.)`);
}

// CHECKOUT — after Act One, at the start of an evening, from your own room.
// The desk lists the other two hotels; the one you're leaving is understood.
function _doCheckout() {
  if (!_flag("act1Done")) {
    _say("Check out? You haven't managed to check IN yet — the key card is in " +
      "the wallet, and the wallet is the whole adventure.");
    return;
  }
  if (G.room !== _hotelRoomId()) {
    _say(`Checkout starts in your own room at the ${_HOTELS[G.hotel].name} — ` +
      "pack the bag first.");
    return;
  }
  if (G.nightTurn >= 10) {
    _say("Reception runs checkout at the start of the evening, before 19:00, " +
      "while the desk is still awake and the day sheet is still open. " +
      "Tomorrow, na.");
    return;
  }
  const others = Object.keys(_HOTELS).filter(k => k !== G.hotel);
  G.pendingChoice = "checkout";
  _say(`You set the key card on the desk at the ${_HOTELS[G.hotel].name}. The ` +
    "clerk produces the folio with the speed of a man who has seen farang " +
    "restlessness before, and gestures at the wide world:");
  _say(others.map(k =>
    `· (${_HOTELS[k].name.toUpperCase()} — ฿${_hotelRate(k)}/night)`).join("\n"), "dim");
  _say("(Name your new hotel — or STAY.)", "dim");
}

const _HOTEL_ARRIVALS = {
  sabai: "The baht bus north, the dark soi, the two palms — and 412, humming " +
    "its terrible faithful hum. The Sabai Palms takes you back the way Naklua " +
    "takes everyone back: without comment.",
  queenvic: "Terry watches your bag come up the stairs with the deep " +
    "satisfaction of a man whose lifestyle has just been endorsed. The balcony " +
    "room at the Queen Vic: below, Soi 6 is already warming up its evening " +
    "argument with itself.",
  metropole: "The Metropole lift hums you up the tower. Blackout curtains, " +
    "arctic aircon — and out the window, the LK Metro alley glowing below " +
    "like a lit fuse. The bellboy mentions the fire stairs again. Wink.",
};

function _doShower() {
  if (G.room !== _hotelRoomId()) {
    _say(`Your shower is back at the ${_HOTELS[G.hotel].name}, enjoying the solitude.`);
    return;
  }
  if (G.soc.drunk >= 3 || G.hurt) {
    _say("You stand under water of legendary pressure until the night stops " +
      "ringing. You emerge, if not a new man, at least a rinsed draft of one.");
  } else {
    _say("Water pressure that could strip paint, towels folded into swans. " +
      "Whatever else happens tonight, this part of Thailand kept its promises.");
  }
}

function _doAtmVerb() {
  if (G.stage === "act1") {
    _say("Your card was in the wallet. The wallet is the whole problem. Solve " +
      "that first and the money solves itself.");
    return;
  }
  if (G.stage === "expat") {
    _say("Expats don't do daily allowances — the savings came over with you. " +
      `฿${G.money} in pocket. (The foreign-card fee is ฿220 and the machine can ` +
      "smell your pension.)");
    return;
  }
  if (G.atmDay === G.day) {
    _say("Today's ฿3000 is already drawn and partly spent. The daily budget is " +
      "the only thing keeping this vacation to seven days instead of seven years.");
    return;
  }
  if (G.room === _hotelRoomId()) {
    G.atmDay = G.day;
    G.money += SAFE_CASH;
    _say(`You detour past the lobby ATM. It considers your card, sighs, and ` +
      `surrenders the daily damage: ฿${SAFE_CASH}. (฿${G.money} in pocket.)`);
    return;
  }
  _say("Your daily ฿3000 waits at the hotel lobby ATM — it pays out on your way " +
    "into the evening.");
}

function _doCheers() {
  if (!_inBar()) {
    _say("You toast the night air. The night, in fairness, has earned it.");
    return;
  }
  _say("“ชนแก้ว!” (chon gaew — glasses meet!) Every glass within reach angles " +
    "toward yours: the girls', the regular's, possibly the mamasan's calculator. " +
    "Nobody needs a reason. Not needing a reason is the entire custom.");
}

const _MISC_VERBS = {
  jump: "You jump. The pavement, a lifelong connoisseur of falling farangs, scores it a four.",
  climb: "The only climb worth doing here is Pratumnak Hill, and there's a road to the top with a view waiting on it.",
  throw: "You weigh it and mime the arc — and every piwin on the corner looks up at once, like meerkats. You put it down.",
  push: "You push. Pattaya, vast and humid, declines to move.",
  pull: "You pull. Pattaya holds. It has had stronger men than you, tilac.",
  knock: "Nobody knocks in this town. Doors are either open or they were never for you.",
  shout: "You shout at the night. “HELLO WELCOME!” answers a bar, instantly, out of pure muscle memory.",
};

const _HELP = `Common commands:
  LOOK · EXAMINE <thing> · TAKE <thing> · DROP <thing> · INVENTORY (I)
  N/S/E/W · IN/OUT · ENTER <place>
  TALK TO <person> · ASK <person> ABOUT <topic> · GIVE <thing> TO <person>
  WAI [person] · SAY <thai phrase> [TO <person>]
  RIDE BUS TO <place> · MOTOSAI TO <place> · PAY <amount>
  BUY <thing> · SELL BOTTLES · READ <thing> · READ SIGN
  WATCH TV (bars) · READ PAPER (bars & 7-Elevens) — the day's real headlines
  WATCH SUNSET · WATCH POLICE (Blue Dog, 6-7pm — best free show in town)
  WEATHER · SCORES (real football) · LOTTERY (the real GLO draw)
  PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL   (in the beer bars)
  FLIRT/KISS/SPANK/FONDLE <lady> · BUY DRINK FOR <lady> · BUY BEER
  THROW COVER [AT <lady>] (the ceiling game — warm her up first)
  BUY BRA FOR <lady> (฿200 — makes FONDLE more interesting)
  RING BELL (฿300, instant popularity) · TALK TO PATRON · BARFINE <lady>
  Live music (Fri/Sat, Rock Factory every night):
  DANCE · SING · REQUEST <song> · TIP BAND <amount> · BUY ROUND FOR BAND · TALK TO BAND
  EAT <food> · DRINK <thing> · BUY WATER / FOOD (street carts & 7-Elevens) · SLEEP (at the hotel)
  CHECKOUT (your room, before 19:00) — move hotels: Sabai Palms ฿400 · Queen Vic ฿700 · Metropole ฿1300
  DIAGNOSE (how bad is it) · AGAIN or G (repeat last command)
  TRAVEL <bar|hotel> (fast travel anywhere you've been — walking pace, bare TRAVEL lists)
  TIME · MAP · WAIT UNTIL <hour> · TIP <lady> <amount> · PHOTO · CHEERS
  QUESTS · ACCEPT <quest> · ABANDON <quest>
  CONTACT <lady> (swap numbers) · CONTACTS (your phonebook) · MESSAGE <lady> · CHECK MESSAGES
  SEND <amount> TO <lady> (banking app)
  LIGHT ON / LIGHT OFF · CHARGE PHONE
  SCORE (happiness & progress) · UNDO · RESTART   (the night autosaves itself)`;

// ── Autocomplete ─────────────────────────────────────────────────────────────
// engineComplete(input) → candidates for the input's final word, drawn from
// what makes sense right now (NPCs in the room, inventory, exits, contacts,
// quests on offer). Pure and DOM-free so it vm-tests like everything else:
// term.js renders and cycles, this decides — the terminal must not know
// rules, not even vocabulary. Easter-egg verbs are deliberately absent.

const _COMPLETE_VERBS = [
  "look", "examine", "take", "drop", "inventory", "go", "enter", "talk to",
  "ask", "give", "buy", "sell bottles", "pay", "wai", "say", "ride bus to",
  "motosai to", "travel", "light", "charge phone", "read", "use", "open", "play",
  "flirt", "kiss", "spank", "fondle", "throw cover", "ring bell", "barfine", "eat", "drink",
  "sleep", "tv", "weather", "scores", "lottery", "map", "time", "tip", "wave",
  "photo", "call", "shower", "withdraw", "cheers", "dance", "sing", "swim",
  "smell", "listen", "diagnose", "apologize", "quests", "accept", "abandon", "contact",
  "contacts", "message", "check messages", "send", "score", "wait", "again",
  "request", "help", "save", "load", "undo", "restart",
];

function _cInv() {
  return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === "inventory");
}
function _cItemWord(id) { return ITEMS[id].name.split(" ").pop().toLowerCase(); }
function _cNpcsHere() {
  return [..._npcsHere().map(id => NPCS[id].name.toLowerCase()),
    ..._patronsHere().map(id => PATRONS[id].name.toLowerCase())];
}

function _completePool(verb, ctx) {
  const girls = () => _npcsHere().filter(id => NPC_ROLES[id])
    .map(id => NPCS[id].name.toLowerCase());
  const contacts = () => Object.keys(G.phone.contacts)
    .filter(id => G.phone.contacts[id]).map(id => NPCS[id].name.toLowerCase());
  switch (verb) {
    case "talk": case "chat": case "wai": return _cNpcsHere();
    case "flirt": case "kiss": case "spank": case "fondle": case "tip":
    case "barfine": case "bf": return girls();
    case "ask": {
      if (ctx.length >= 2) { // ask <npc> [about] <topic> — her live topics
        const id = _findNpc(ctx[1]);
        if (id && NPCS[id].dialogue) {
          return NPCS[id].dialogue.filter(d => d.topic &&
            (!d.req || d.req.every(f => _flag(f))) &&
            (!d.notFlags || d.notFlags.every(f => !_flag(f))))
            .map(d => d.topic).filter(_topicKnown);
        }
        const pat = _findPatron(ctx[1]);
        if (pat) {
          return PATRONS[pat].dialogue.filter(d => d.topic)
            .map(d => d.topic).filter(_topicKnown);
        }
        return [];
      }
      return _cNpcsHere();
    }
    case "look": case "examine": case "x": case "inspect":
      return [..._cNpcsHere(), ..._cInv().map(_cItemWord),
        ...Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === G.room).map(_cItemWord)];
    case "take": case "get": case "grab":
      return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === G.room).map(_cItemWord);
    case "drop": // mid-c4 the columns; otherwise your pockets
      return _c4Choices().length ? _c4Choices() : _cInv().map(_cItemWord);
    case "flip": // mid-jackpot the legal moves ("3 4" and "7")
      return _jpChoices();
    case "read": case "use": return _cInv().map(_cItemWord);
    case "give":
      return ctx.length >= 2 ? _cNpcsHere() : _cInv().map(_cItemWord);
    case "buy": case "order": {
      const sItems = _salengItems();
      if (sItems.length) {
        // "buy " lists the cart; once an item is named, offer a lady to gift to
        const named = sItems.find(i => ctx.slice(1).join(" ").includes(i.split(" ")[0]));
        return named ? girls() : [...sItems, ...sItems.map(i => i + " for")];
      }
      return ["beer", "water", "lady drink for", "bra for", "charger", "toastie", "food",
        "round for band"];
    }
    case "go": case "walk": case "head": case "enter":
      return [...Object.keys(_room().exits),
        ..._travelDests().map(id => (ROOMS[id].bar || ROOMS[id].name).toLowerCase())];
    case "travel": case "goto":
      return _travelDests().map(id => (ROOMS[id].bar || ROOMS[id].name).toLowerCase());
    case "ride": case "catch": case "bus": {
      if (!_room().busStop) return [];
      const lines = Object.entries(BUS_LINES).filter(([, st]) => st.includes(G.room));
      return [...new Set(lines.flatMap(([, st]) => st))]
        .filter(s => s !== G.room).map(s => ROOMS[s].name.toLowerCase());
    }
    case "motosai": case "moto": case "taxi": return Object.keys(MOTOSAI_DESTS);
    case "accept":
      return Object.keys(QUESTS).filter(q =>
        G.quests[q] === "offered" || _questAvailable(q));
    case "abandon":
      return Object.keys(QUESTS).filter(q => G.quests[q] === "active");
    case "message": case "text": case "msg": case "call": case "dial":
    case "send": case "transfer": case "wire": return contacts();
    case "contact": return girls();
    case "play": case "challenge": return _playOptions();
    case "light": case "turn": return ["on", "off"];
    case "watch":
      return G.room === "blue_dog" ? ["police", "sunset", "tv"] : ["tv"];
    case "check": return ["messages"];
    case "throw": case "toss": case "chuck": case "fling":
      return ctx.length >= 2 ? girls() : ["cover", "pastie", "nipple cover"];
    case "say": case "speak":
      // a matched phrase already sitting there → offer who to aim it at
      return ctx.slice(1).some(w => matchThaiPhrase(w))
        ? _cNpcsHere() : ["sawatdee", "khop khun", "thao rai", "mai ao", "aroi", "sanuk", "sorry"];
    case "ring": return ["bell"];
    case "charge": return ["phone"];
    case "sell": return ["bottles"];
    case "wait": return ["until midnight", "until 9pm", "10"];
    default: return [];
  }
}

function engineComplete(input) {
  if (!G) return [];
  const raw = String(input || "").replace(/^\s+/, "").toLowerCase();
  if (!raw) return [];
  const endsSpace = /\s$/.test(raw);
  const words = raw.split(/\s+/).filter(Boolean);
  const last = endsSpace ? "" : words[words.length - 1];
  const ctx = (endsSpace ? words : words.slice(0, -1))
    .filter(w => !["the", "a", "an", "to", "at", "for", "with", "about", "my"].includes(w));
  let pool;
  if (G.pendingChoice === "vacation_end") pool = ["new vacation", "move to pattaya"];
  else if (G.pendingChoice === "checkout") {
    pool = [...Object.keys(_HOTELS).filter(k => k !== G.hotel)
      .map(k => _HOTELS[k].name.toLowerCase()), "stay"];
  } else if (G.game && !ctx.length) pool = _gameVerbs();
  else pool = ctx.length ? _completePool(ctx[0], ctx) : _COMPLETE_VERBS;
  const seen = new Set();
  const out = [];
  for (const c of pool) {
    const k = String(c).toLowerCase();
    if (!k || seen.has(k) || !k.startsWith(last) || k === last) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 8) break;
  }
  return out;
}

// ── Parser ─────────────────────────────────────────────────────────────────

function _norm(s) {
  return s.trim().replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/^(please |can you |go )/i, m => m.toLowerCase() === "go " ? "go " : "");
}

let _lastCmd = ""; // for AGAIN/G — deliberately not serialized; repeats die with the session

// ── Modal prompts + the resume redraw ──────────────────────────────────────
// doCommand routes every input through a chain of modal states, each of which
// silently swallows commands until answered: the airline choice, the hotel
// checkout desk, a live bar game, a street encounter, an unpaid fare. Each has
// a one-line prompt; these helpers are the single source of truth so the live
// prompt, the "that wasn't a valid answer" reprompt, and the resume redraw all
// read identically. See _renderResume.
function _vacationEndPrompt() {
  _say("(NEW VACATION · MOVE TO PATTAYA — the airline needs an answer.)", "dim");
}
function _checkoutPrompt() {
  const others = Object.keys(_HOTELS).filter(k => k !== G.hotel);
  _say("The clerk waits. (" +
    others.map(k => _HOTELS[k].name.toUpperCase()).join(" · ") + " · or STAY.)", "dim");
}
function _farePrompt() {
  _say(`The driver is still waiting: “${thaiBaht(G.pendingFare.price)}”. (PAY <amount>)`, "thai");
}

// After a restore (continue / undo, in main.js), redraw whatever modal prompt is
// currently gating input — otherwise the load shows only the room text while the
// hidden state eats the player's next command. ONE dispatcher over every gate in
// doCommand, in the same priority order; add a new modal state to both or the
// restore goes blind again (the class of bug that hit c4, jackpot, and saleng).
function _renderResume() {
  if (!G) return;
  // The "phone buzzed" nudge is a one-shot at arrival, so a reload with unread
  // texts loses it — re-surface the count (it otherwise only shows under SCORE).
  if (_unreadCount()) {
    _say(`📱 ${_unreadCount()} unread message${_unreadCount() > 1 ? "s" : ""} waiting (CHECK MESSAGES).`, "win");
  }
  if (G.pendingChoice === "vacation_end") { _vacationEndPrompt(); return; }
  if (G.pendingChoice === "checkout") { _checkoutPrompt(); return; }
  if (G.game) { _renderGame(); return; }
  if (G.pendingEnc) { _renderEncounter(); return; }
  if (G.pendingFare) { _farePrompt(); return; }
}

function doCommand(input) {
  if (!G) newGame();
  const raw = _norm(input);
  if (!raw) return;
  const lower = raw.toLowerCase();
  const words = lower.split(" ");
  const [v, ...rest] = words;
  const arg = rest.filter(w => !["the", "a", "an", "to", "at", "up", "my"].includes(w)).join(" ");

  // Hidden testing code (gated by CHEATS_ENABLED in engine-core.js). Works in
  // any state, costs no turn, and is never surfaced — a typed secret only.
  if (CHEATS_ENABLED && lower === "twoweekmillionaire") {
    G.money += 2000000;
    _say(`💰 Two-week millionaire: ฿2,000,000 for testing. (฿${G.money} in pocket.)`, "win");
    return;
  }

  // the week is over: the airline needs an answer before anything else
  if (G.pendingChoice === "vacation_end") {
    if (/^restart/.test(lower)) { newGame(); engineIntro(); return; }
    if (/vacation|holiday|again|fly back|new/.test(lower)) { _newVacation(); return; }
    if (/move|expat|stay|pattaya|remain/.test(lower)) { _goExpat(); return; }
    _vacationEndPrompt();
    return;
  }

  // mid-checkout: the desk is waiting on a hotel name
  if (G.pendingChoice === "checkout") {
    if (/stay|cancel|no|keep|never ?mind/.test(lower)) {
      G.pendingChoice = null;
      _say("You re-pocket the key card. The clerk re-files the folio and the " +
        "smile. Home is home.");
      return;
    }
    const pick = /sabai|palm|naklua|412/.test(lower) ? "sabai" :
      /queen|vic|balcony/.test(lower) ? "queenvic" :
      /metro|lk/.test(lower) ? "metropole" : null;
    if (!pick || pick === G.hotel) {
      _checkoutPrompt();
      return;
    }
    G.pendingChoice = null;
    G.hotel = pick;
    G.room = _hotelRoomId();
    _say(_HOTEL_ARRIVALS[pick], "win");
    _describeRoom(true);
    return;
  }

  // a live bar game captures every command until it ends (QUIT concedes)
  if (G.game) {
    if (lower === "q" || /^(quit|resign|concede|forfeit|leave)/.test(lower)) { _gameQuit(); _tick(); return; }
    _gameInput(lower);
    _tick();
    return;
  }

  // a live encounter demands a snap reaction: the next command IS the reaction
  if (G.pendingEnc && v !== "restart") {
    const enc = G.pendingEnc;
    G.pendingEnc = null;
    _ENC[enc](lower);
    _tick();
    _checkAct1();
    return;
  }

  // pending fare gates everything except paying, looking, help
  if (G.pendingFare && !["pay", "look", "l", "help", "i", "inventory", "say"].includes(v)) {
    _farePrompt();
    return;
  }

  // AGAIN / G — repeat the last free-form command (Infocom house rule).
  // Modal inputs above never land here, so a mid-game "g" stays a game move.
  if ((v === "again" || v === "g") && !arg) {
    if (!_lastCmd) { _say("Again what? You haven't done anything yet. Very Pattaya.", "dim"); return; }
    doCommand(_lastCmd);
    return;
  }
  _lastCmd = raw;

  if (_DIRS[v] !== undefined && words.length === 1) {
    _doGo(v); _tick(); _checkAct1(); return;
  }

  switch (v) {
    case "go": case "walk": case "head": {
      const gw = arg.replace(/^to (the )?/, "");
      if (!gw || _DIRS[gw] !== undefined) _doGo(gw);
      else _doTravel(gw); // "go candy bar" — a place, not a direction
      break;
    }
    case "travel": case "goto": _doTravel(arg); break;
    case "midnight": _doWait("until midnight"); break; // the help hint, tapped
    case "enter": _doEnter(arg); break;
    case "look": case "l":
      if (arg) _doExamine(arg); // "look at candy" = "examine candy"
      else _describeRoom(true);
      break;
    case "examine": case "x": case "inspect": case "search": _doExamine(arg); break;
    case "check":
      if (/^out/.test(arg)) _doCheckout();
      else if (/message|phone|text|inbox/.test(arg)) _readMessages();
      else _doExamine(arg);
      break;
    case "messages": case "msgs": case "inbox": _readMessages(); break;
    case "message": case "text": case "msg": _doMessage(arg); break;
    case "contacts": case "phonebook": _doContacts(); break;
    case "contact": case "number":
      if (!arg) _doContacts(); // bare CONTACT reads as "show my contacts"
      else _doContact(arg.replace(/^(with |for )/, ""));
      break;
    case "send": case "transfer": case "wire": _doSendMoney(arg); break;
    case "quests": case "quest": case "adventures": case "journal": _doQuests(); break;
    case "accept": _doAccept(arg); break;
    case "abandon": _doAbandon(arg); break;
    case "take": case "get": case "grab": case "pick":
      if (/^(photo|selfie|picture|pic)\b/.test(arg)) _doPhoto();
      else if (arg === "bus" || arg.startsWith("bus")) _doRideBus(arg.replace(/^bus\s*/, ""));
      else if (arg.startsWith("motosai") || arg.startsWith("bike")) _doMotosai(arg.replace(/^\S+\s*/, ""));
      else _doTake(arg.replace(/^up /, ""));
      break;
    case "drop": _doDrop(arg); break;
    case "i": case "inv": case "inventory": _doInventory(); break;
    case "read": _doRead(arg); break;
    case "talk": case "chat": {
      if (/\bband\b|\bmusicians?\b|\bguitar|\bbass|\bdrummer|\bvocalist|\bsinger/.test(arg) && _bandHere()) {
        _doBandTalk();
      } else {
        _doTalk(arg.replace(/^with /, ""), null);
      }
      break;
    }
    case "ask": {
      const m = arg.match(/^(.+?) about (.+)$/);
      if (m) _doTalk(m[1], m[2]);
      else _doTalk(arg, null);
      break;
    }
    case "request": { // song request = ask dj or live band
      if (_findNpc("dj")) _doTalk("dj", arg);
      else if (_bandHere()) _doBandRequest(arg);
      else _say("No DJ or band here to take requests.");
      break;
    }
    case "give": case "hand": case "deliver": {
      const m = arg.match(/^(.+?) (?:to )?(nok|auntie|bank|candy|lek|noi|ping|aom|joy|fon|gift|kwan|nong|pim|ploy|dj|oy|madam|daeng|gary|mot|security|bee|bert|mem)( .*)?$/);
      if (m) _doGive(m[1].trim(), m[2]);
      else _say("Give what to whom? (GIVE <thing> TO <person>)");
      break;
    }
    case "sell": _doSellBottles(); break;
    case "buy": case "order": _doBuy(arg); break;
    case "pay": _doPay(arg); break;
    case "wai": _doWai(arg); break;
    case "say": case "speak": {
      // SAY <phrase> [TO <person>] — "to" is stripped from `arg`, so split the
      // raw rest to keep the target. Directed sorry still routes to the apology.
      const said = rest.join(" ");
      const m = said.match(/^(.*?)\s+to\s+(.+)$/);
      const phraseText = (m ? m[1] : said).trim();
      const targetW = m ? m[2].replace(/^(the|a|an)\s+/, "").trim() : "";
      if (/^(sorry|khor ?thot|kho ?thot|ขอโทษ)/.test(phraseText)) _doApologize();
      else _doSay(phraseText, targetW);
      break;
    }
    case "apologize": case "apologise": case "apology": case "sorry":
      _doApologize(); break;
    case "ride": case "catch":
      if (arg.startsWith("bus")) _doRideBus(arg.replace(/^bus\s*/, ""));
      else if (arg.startsWith("motosai") || arg.startsWith("moto") || arg.startsWith("bike"))
        _doMotosai(arg.replace(/^\S+\s*/, ""));
      else _say("Ride what — the bus or a motosai?");
      break;
    case "bus": _doRideBus(arg); break;
    case "motosai": case "moto": case "taxi": _doMotosai(arg); break;
    case "light": case "flashlight": case "torch":
      if (/off/.test(arg)) _doLight(false);
      else if (/on/.test(arg)) _doLight(true);
      else _doLight(!G.lightOn); // bare LIGHT toggles
      break;
    case "turn":
      if (arg.includes("light") || arg.includes("torch") || arg.includes("flashlight"))
        _doLight(arg.includes("on"));
      else _say("Turn what?");
      break;
    case "charge": case "plug": _doCharge(); break;
    case "use":
      if (arg.includes("phone") || arg.includes("light")) _doLight(true);
      else if (arg.includes("charger")) _doCharge();
      else _say("Be more specific.");
      break;
    case "open":
      if (arg.includes("safe")) _say("The keypad wants three digits: ENTER <digits> — Thai numerals work too.");
      else _say("It doesn't open that way.");
      break;
    case "press": case "type": case "code": _doEnter(arg); break;
    case "play": case "challenge": _doPlay(arg); break;
    case "flirt": _doSocial("flirt", arg); break;
    case "kiss": case "snog": case "smooch": _doSocial("kiss", arg); break;
    case "spank": _doSocial("spank", arg); break;
    case "fondle": case "grope": _doSocial("fondle", arg); break;
    case "ring": case "bell": _doBell(); break;
    case "barfine": case "bf": _doBarfine(arg.replace(/^with /, "")); break;
    case "eat": _doEat(arg); break;
    case "checkout": case "check-out": _doCheckout(); break;
    case "sleep": case "bed": case "crash":
      if (!_flag("act1Done")) _say("Sleep where? The beach already had you once tonight. Get the wallet, get the room.");
      else if (G.room !== _hotelRoomId()) _say(`Your bed is at the ${_HOTELS[G.hotel].name}. It'll keep.`);
      else { _endNight("sleep"); return; }
      break;
    case "tv": _doTv(); break;
    case "weather": case "forecast": _doWeather(); break;
    case "scores": case "football": case "footy": case "match": _doScores(); break;
    case "lottery": case "lotto": _doLottery(); break;
    case "drink": case "sip": _doDrink(arg); break;
    case "diagnose": case "health": _doDiagnose(); break;
    case "kill": case "attack": case "hit": case "punch": case "fight": case "strangle":
      _doViolence(); break;
    case "xyzzy": case "plugh": case "pray": _doMagic(v); break;
    case "hello": case "hi": case "howdy": _doHello(arg); break;
    case "smell": case "sniff": _doSmell(); break;
    case "listen": case "hear": _doListen(); break;
    case "swim": _doSwim(); break;
    case "dance": _doDance(); break;
    case "sing": _doSing(); break;
    case "throw": case "toss": case "chuck": case "fling":
      // THROW COVER / THROW NIPPLE COVER / THROW PASTIE [AT <name>] — the ceiling
      // game; anything else keeps the old flavor refusal.
      if (/\b(cover|pastie|pasty|nipple|sticker)s?\b/.test(arg))
        _doThrowCover(arg.replace(/\b(nipple|cover|pastie|pasty|sticker)s?\b/g, "").trim());
      else _say(_MISC_VERBS["throw"]);
      break;
    case "jump": case "climb": case "push": case "pull":
    case "knock": case "shout": case "yell":
      _say(_MISC_VERBS[v === "yell" ? "shout" : v]); break;
    case "watch":
      if (G.room === "qv_room" && (!arg || /soi|street|balcony|show|chaos|girls/.test(arg)))
        _doWatchSoi();
      else if (G.room === "blue_dog" && (!arg || /police|road|show|shakedown|bike|checkpoint|sunset|bay|sea|view/.test(arg)))
        _doWatchBlueDog(arg);
      else if (!arg || /tv|news|television/.test(arg)) _doTv();
      else _say("You watch. It watches back. Pattaya.");
      break;
    case "wait": case "z": _doWait(arg); break;
    case "time": case "clock": _doTime(); break;
    case "tip": _doTip(arg); break;
    case "wave": _doWave(arg); break;
    case "map": _doMap(); break;
    case "photo": case "selfie": case "photograph": _doPhoto(); break;
    case "call": case "dial": _doCall(arg); break;
    case "shower": case "wash": _doShower(); break;
    case "withdraw": case "atm": _doAtmVerb(); break;
    case "cheers": case "toast": case "chon": _doCheers(); break;
    case "haggle": case "bargain":
      _say("Nobody's quoting you a price right now. Save it for the man with the " +
        "display board of watches.");
      break;
    case "score": _doScore(); break;
    case "help": case "?": _say(_HELP, "dim"); break;
    case "restart": newGame(); engineIntro(); return;
    default:
      // bare Thai phrase typed directly
      if (matchThaiPhrase(lower)) { _doSay(lower); break; }
      _say("I didn't understand that. (HELP lists commands.)", "dim");
      return; // no tick for parse errors
  }
  _tick();
  _questTick();
  _checkAct1();
}

// ── Boot text ──────────────────────────────────────────────────────────────

function engineIntro() {
  if (!G) newGame();
  _say("THE LAST BAHT BUS", "win");
  _say("a Pattaya misadventure · Soi Sanuk universe", "dim");
  _say("═══════════════════════════════════", "dim");
  _say("Day two of your week in Pattaya, and it starts like this: face-down on " +
    "Jomtien beach, sunset bleeding into the sea, your head pounding like a bass " +
    "bin outside Neon Paradise A-Go-Go. Day one went well, is the thing. Too well.");
  _say("Your wallet is GONE. Your phone reads 13% battery. Your hotel is in Naklua — " +
    "the whole town away. The baht bus is ฿15 a head.");
  _say("You have ฿0.");
  _say("It's going to be one of those nights.", "alert");
  _say("");
  _describeRoom(true);
  _say("(Type HELP for commands.)", "dim");
}
