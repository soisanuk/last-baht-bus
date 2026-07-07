// The Last Baht Bus — game engine: state, parser, verb handlers, systems.
// DOM-free at load time and in every function (unit-tested via node:vm).
// Output goes through an injected print callback; term.js supplies the real
// renderer, tests supply a capture buffer.

// ── Output plumbing ────────────────────────────────────────────────────────

let _enginePrint = () => {};
let _engineSpeak = () => {}; // (thaiText) — TTS hook, no-op headless

function engineInit(printFn, speakFn) {
  _enginePrint = printFn || (() => {});
  _engineSpeak = speakFn || (() => {});
}

// say(text, cls) — cls hints the renderer: "room", "thai", "dim", "alert", "win"
function _say(text, cls) { _enginePrint(text, cls || ""); }

// ── Game state ─────────────────────────────────────────────────────────────

let G = null;

function newGame() {
  G = {
    room: "jomtien_beach",
    money: 0,
    battery: 13,
    lightOn: false,
    turns: 0,
    darkStreak: 0,
    flags: {},
    itemLoc: Object.fromEntries(
      Object.entries(ITEMS).map(([id, it]) => [id, it.location])),
    safeTries: 0,
    pendingFare: null,   // { kind:"bus"|"moto", price, dest } awaiting `pay`
    score: 0,
    over: false,
  };
  return G;
}

function serializeGame() { return JSON.stringify(G); }
function deserializeGame(s) { G = JSON.parse(s); return G; }

// ── Helpers ────────────────────────────────────────────────────────────────

function _flag(f) { return !!G.flags[f]; }
function _setFlag(f) { G.flags[f] = true; }

function _inv() {
  return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === "inventory");
}
function _here(id) { return G.itemLoc[id] === G.room; }
function _room() { return ROOMS[G.room]; }

function _isDarkHere() {
  return !!_room().dark && !(G.lightOn && G.battery > 0);
}

function _npcsHere() {
  return Object.entries(NPCS).filter(([, n]) => n.room === G.room).map(([id]) => id);
}

// where: "room", "inventory", or undefined (both, room first — so TAKE grabs
// the bottle on the ground, not the one already in your pocket)
function _findItem(word, where) {
  const w = word.toLowerCase();
  const inScope = id =>
    where === "room" ? G.itemLoc[id] === G.room :
    where === "inventory" ? G.itemLoc[id] === "inventory" :
    (G.itemLoc[id] === G.room || G.itemLoc[id] === "inventory");
  const matches = (id, it) => inScope(id) &&
    (it.name.toLowerCase().includes(w) || it.aliases.some(a => a === w || a.includes(w)));
  const pool = Object.entries(ITEMS).filter(([id, it]) => matches(id, it));
  if (!where && pool.length > 1) {
    const inRoom = pool.find(([id]) => G.itemLoc[id] === G.room);
    if (inRoom) return inRoom[0];
  }
  return pool.length ? pool[0][0] : null;
}

function _findNpc(word) {
  const w = word.toLowerCase();
  const here = _npcsHere();
  // exact id or exact name first (so "oy" is Madam Oy, not Pl-OY)
  for (const id of here) {
    if (id === w || NPCS[id].name.toLowerCase() === w) return id;
  }
  for (const id of here) {
    const name = NPCS[id].name.toLowerCase();
    if (name.startsWith(w) || name.split(" ").some(p => p.startsWith(w))) return id;
  }
  for (const id of here) {
    if (NPCS[id].name.toLowerCase().includes(w)) return id;
  }
  return null;
}

// First dialogue entry whose req/notFlags fit; topic filters "ask about".
// An unknown/locked topic falls back to the NPC's default (topicless) line —
// classic adventure behaviour: they answer with whatever they always say.
function _pickDialogue(npcId, topic) {
  const n = NPCS[npcId];
  for (const d of n.dialogue) {
    if (topic ? d.topic !== topic && !(d.topic && topic.includes(d.topic)) : d.topic) continue;
    if ((d.req || []).some(f => !_flag(f))) continue;
    if ((d.notFlags || []).some(f => _flag(f))) continue;
    return d;
  }
  return topic ? _pickDialogue(npcId, null) : null;
}

function _deliver(npcId, d) {
  const n = NPCS[npcId];
  if (d.th) { _say(`${n.emoji} ${n.name}: “${d.th}” (${d.rom})`, "thai"); _engineSpeak(d.th); }
  _say(d.text);
  for (const f of d.sets || []) _setFlag(f);
  if (d.gives && G.itemLoc[d.gives] === null) {
    G.itemLoc[d.gives] = "inventory";
    _say(`(You now have the ${ITEMS[d.gives].name}.)`, "dim");
    if (d.gives === "wallet") {
      G.money += 500;
      _say("(Most of the cash is still in it — ฿500 back in play.)", "dim");
    }
  }
}

// ── Look / describe ────────────────────────────────────────────────────────

function _describeRoom(full) {
  const r = _room();
  if (_isDarkHere()) {
    _say(`${r.name}`, "room");
    _say("It is pitch dark. If your phone has any battery left, its flashlight " +
      "would help. Sois this dark tend to have soi dogs in them.", "alert");
    return;
  }
  _say(r.name, "room");
  if (full) _say(r.desc);
  const items = Object.keys(G.itemLoc).filter(id => _here(id));
  if (items.length) _say("You can see: " + items.map(id => ITEMS[id].name).join(", ") + ".");
  const npcs = _npcsHere();
  if (npcs.length) _say("Here: " + npcs.map(id => `${NPCS[id].emoji} ${NPCS[id].name}`).join(", ") + ".");
  const exits = Object.keys(r.exits);
  if (exits.length) _say("Exits: " + exits.join(", ") + ".", "dim");
  if (r.busStop) _say("A baht bus can be caught here (ride bus to …).", "dim");
  if (r.motosai) _say("A motosai stand is here (motosai to …).", "dim");
}

// ── Turn bookkeeping: battery, darkness, soi dogs ──────────────────────────

function _tick() {
  G.turns++;
  if (G.lightOn && G.battery > 0) {
    G.battery--;
    if (G.battery === 0) {
      G.lightOn = false;
      _say("Your phone gives a final apologetic buzz and dies. The flashlight is gone.", "alert");
    } else if (G.battery === 5) {
      _say("(Phone battery: 5%. This is fine.)", "alert");
    }
  }
  if (_isDarkHere()) {
    G.darkStreak++;
    if (G.darkStreak === 1) {
      _say("Something shifts in the dark nearby. A low growl. You are likely to be " +
        "bitten by a soi dog.", "alert");
    } else if (G.darkStreak >= 2) {
      if (_inv().includes("noodles")) {
        G.itemLoc.noodles = null;
        G.darkStreak = 0;
        _say("A soi dog lunges out of the dark! You hurl the Mama noodles on pure " +
          "instinct. It catches the packet mid-air with terrifying grace and trots " +
          "off. Goodbye, dinner.", "alert");
      } else {
        const bitten = Math.min(G.money, 30);
        G.money -= bitten;
        G.darkStreak = 0;
        const exit = Object.values(_room().exits).find(to => !ROOMS[to].dark) ||
          Object.values(_room().exits)[0];
        G.room = exit;
        _say("A soi dog bites you! You flee blindly, shedding " +
          (bitten ? `฿${bitten} in dropped coins` : "what remains of your dignity") +
          ", and fetch up somewhere lit.", "alert");
        _describeRoom(true);
      }
    }
  } else {
    G.darkStreak = 0;
  }
}

// ── Endings ────────────────────────────────────────────────────────────────

function _checkEnding() {
  if (G.room !== "hotel_room" || G.over) return;
  G.over = true;
  let score = 0;
  const lines = [];
  if (_flag("hasWallet")) {
    score += 50;
    lines.push("✓ Wallet recovered (+50)");
    if (_flag("oyGaveWallet")) { score += 15; lines.push("✓ ...earned back with manners, not burglary (+15)"); }
  }
  if (G.battery > 0) { score += 10; lines.push(`✓ Phone survived at ${G.battery}% (+10)`); }
  if (G.money > 0) { score += Math.min(20, G.money); lines.push(`✓ ฿${G.money} still in pocket (+${Math.min(20, G.money)})`); }
  for (const [f, label] of [
    ["helmetDelivered", "Did Bank a solid"],
    ["somTamDelivered", "Fed Ploy the good som tam"],
    ["greetedFon", "Made Fon's evening with one word of Thai"],
    ["waiedOy", "Wai'd the Mamasan like you meant it"],
  ]) {
    if (_flag(f)) { score += 5; lines.push(`✓ ${label} (+5)`); }
  }
  if (_flag("pinPart71") && _flag("pinPart9")) { score += 5; lines.push("✓ Assembled the safe code from soi gossip (+5)"); }
  G.score = score;

  _say("═══════════════════════════════════", "win");
  if (_flag("hasWallet")) {
    _say("Room 412. You bolt the door, fall onto the terrible bed, and hold your " +
      "wallet up to the ceiling light like a trophy. Outside, Pattaya keeps roaring " +
      "without you — the bars, the buses, the whole neon machine. Somewhere out " +
      "there Cindy is polishing a glass, Bank is leaning on his bike, and Madam Oy " +
      "is counting money that is, for once, not yours.", "win");
    _say("★ HAPPY ENDING ★", "win");
  } else {
    _say("Room 412. No wallet. The bed accepts you anyway, the way Pattaya accepts " +
      "everyone eventually. Tomorrow there will be embassy phone calls, cancelled " +
      "cards, and a very awkward chat with reception. Tonight there is at least a " +
      "ceiling fan.", "win");
    _say("☂ GOING HOME ALONE (wallet edition) ☂", "win");
  }
  for (const l of lines) _say(l, "dim");
  _say(`FINAL SCORE: ${score}`, "win");
  _say("(Type RESTART to play again.)", "dim");
}

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
  G.room = to;
  _describeRoom(true);
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
  _say("You can't get there from here.");
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
      G.room = "lk_maze_4";
      G.safeTries = 0;
      _say("A third wrong code. Somewhere a buzzer buzzes. Two security guys appear " +
        "with the calm of men who enjoy their work, walk you out through the bar, " +
        "and deposit you in the lane with impeccable politeness.", "alert");
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
  _say(`฿${G.money} · phone ${G.battery}%${G.lightOn ? " (flashlight ON)" : ""}`, "dim");
  _say(inv.length ? "You are carrying: " + inv.map(id => ITEMS[id].name).join(", ") + "." :
    "You are carrying nothing but experience.");
}

function _doExamine(arg) {
  if (!arg) return _describeRoom(true);
  const npc = _findNpc(arg);
  if (npc) { _say(NPCS[npc].desc); return; }
  const id = _findItem(arg);
  if (id) { _say(ITEMS[id].desc); return; }
  if (arg === "sign") return _doRead("sign");
  _say("Nothing special about that — or it isn't here.");
}

function _doRead(arg) {
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
    _say(it.readTh, "thai");
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
  if (!npc) { _say("Nobody by that name here."); return; }
  const d = _pickDialogue(npc, topic || null);
  if (!d) {
    _say(topic ? `${NPCS[npc].name} doesn't have much to say about that.` :
      `${NPCS[npc].name} smiles politely.`);
    return;
  }
  _deliver(npc, d);
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
  }
  if (id === "ploy" && !_flag("waiedPloy")) {
    _setFlag("waiedPloy");
    _say("Ploy's counting pauses for the first time tonight.", "dim");
  }
  if (id === "fon" && !_flag("greetedFon")) {
    _setFlag("greetedFon");
    _say("Fon lights up like the neon just found a new colour.", "dim");
  }
}

function _doSay(arg) {
  const key = matchThaiPhrase(arg);
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
  if (id.startsWith("bottle") && npc === "nok") return _doSellBottles();
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
    if (!r.shop || !r.shop.charger) { _say("No chargers sold here. Try a 7-Eleven."); return; }
    if (G.itemLoc.charger === "inventory") { _say("You already own one heroic charger."); return; }
    if (G.money < CHARGER_PRICE) { _say(`The charger is ฿${CHARGER_PRICE}. You have ฿${G.money}. The cashier's sympathy is genuine but unhelpful.`); return; }
    G.money -= CHARGER_PRICE;
    G.itemLoc.charger = "inventory";
    _say(`One USB charger, ฿${CHARGER_PRICE}. The doorbell jingles in celebration. (฿${G.money} left.)`);
    return;
  }
  if (arg.includes("lady drink") || arg.includes("ladydrink") || arg.includes("drink")) {
    if (!r.bar) { _say("Buy a drink where drinks are sold, tilac."); return; }
    const npcs = _npcsHere().filter(id => CANON_HOSTESSES.includes(id));
    if (!npcs.length) { _say("Nobody here to buy one for."); return; }
    if (G.money < LADY_DRINK) { _say(`Lady drinks are ฿${LADY_DRINK}. You have ฿${G.money}. The maths is not on your side.`); return; }
    G.money -= LADY_DRINK;
    const id = npcs[0];
    _say(`One lady drink for ${NPCS[id].name} — ฿${LADY_DRINK} on the tab that is your life. (฿${G.money} left.)`);
    if (id === "cindy" && !_flag("knowMot")) {
      _setFlag("knowWasHere"); _setFlag("knowMot");
      _deliver("cindy", _pickDialogue("cindy"));
    } else if (id === "pim" && !_flag("pinPart9")) {
      _setFlag("helmetDelivered"); // she'll talk now regardless
      _deliver("pim", _pickDialogue("pim", "oy"));
    } else {
      _say(`${NPCS[id].name} toasts you and the conversation gets noticeably warmer.`);
    }
    return;
  }
  _say("Not for sale here.");
}

function _doRideBus(arg) {
  const r = _room();
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
}

function _doLight(on) {
  if (!_inv().includes("phone")) { _say("Your phone… you do still have your phone. Deep breaths."); return; }
  if (on) {
    if (G.battery === 0) { _say("The phone is dead. The flashlight is a memory."); return; }
    if (G.lightOn) { _say("The flashlight is already on, eating battery."); return; }
    G.lightOn = true;
    _say(`Flashlight on. (Battery: ${G.battery}% — it drains while it burns.)`);
    if (_room().dark) _describeRoom(true);
  } else {
    if (!G.lightOn) { _say("It's already off."); return; }
    G.lightOn = false;
    _say("Flashlight off. Battery preserved; nerves, less so.");
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
}

function _doScore() {
  _say(`Turns: ${G.turns} · ฿${G.money} · battery ${G.battery}%`, "dim");
  const milestones = [
    ["knowWasHere", "Worked out where you were last night"],
    ["knowMot", "Learned who lifted the wallet"],
    ["knowOyHasIt", "Traced the wallet to Madam Oy"],
    ["knowDoorTrick", "Learned the office door trick"],
    ["pinPart71", "Clue: the number 71"],
    ["pinPart9", "Clue: the lucky 9"],
    ["hasWallet", "WALLET RECOVERED"],
  ];
  for (const [f, label] of milestones) if (_flag(f)) _say("✓ " + label, "dim");
}

const _HELP = `Common commands:
  LOOK · EXAMINE <thing> · TAKE <thing> · DROP <thing> · INVENTORY (I)
  N/S/E/W · IN/OUT · ENTER <place>
  TALK TO <person> · ASK <person> ABOUT <topic> · GIVE <thing> TO <person>
  WAI [person] · SAY <thai phrase>
  RIDE BUS TO <place> · MOTOSAI TO <place> · PAY <amount>
  BUY <thing> · SELL BOTTLES · READ <thing> · READ SIGN
  LIGHT ON / LIGHT OFF · CHARGE PHONE
  SCORE · SAVE · LOAD · RESTART`;

// ── Parser ─────────────────────────────────────────────────────────────────

function _norm(s) {
  return s.trim().replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/^(please |can you |go )/i, m => m.toLowerCase() === "go " ? "go " : "");
}

function doCommand(input) {
  if (!G) newGame();
  if (G.over) {
    if (/^restart/i.test(input)) { newGame(); engineIntro(); return; }
    _say("The night is over. Type RESTART to play again.", "dim");
    return;
  }
  const raw = _norm(input);
  if (!raw) return;
  const lower = raw.toLowerCase();
  const words = lower.split(" ");
  const [v, ...rest] = words;
  const arg = rest.filter(w => !["the", "a", "an", "to", "at", "up", "my"].includes(w)).join(" ");

  // pending fare gates everything except paying, looking, help
  if (G.pendingFare && !["pay", "look", "l", "help", "i", "inventory", "say"].includes(v)) {
    _say(`The driver is still waiting: “${thaiBaht(G.pendingFare.price)}”. (PAY <amount>)`, "thai");
    return;
  }

  if (_DIRS[v] !== undefined && words.length === 1) {
    _doGo(v); _tick(); _checkEnding(); return;
  }

  switch (v) {
    case "go": case "walk": case "head": _doGo(arg); break;
    case "enter": _doEnter(arg); break;
    case "look": case "l": _describeRoom(true); break;
    case "examine": case "x": case "inspect": case "check": _doExamine(arg); break;
    case "take": case "get": case "grab": case "pick":
      if (arg === "bus" || arg.startsWith("bus")) _doRideBus(arg.replace(/^bus\s*/, ""));
      else if (arg.startsWith("motosai") || arg.startsWith("bike")) _doMotosai(arg.replace(/^\S+\s*/, ""));
      else _doTake(arg.replace(/^up /, ""));
      break;
    case "drop": _doDrop(arg); break;
    case "i": case "inv": case "inventory": _doInventory(); break;
    case "read": _doRead(arg); break;
    case "talk": case "chat": _doTalk(arg.replace(/^with /, ""), null); break;
    case "ask": {
      const m = arg.match(/^(.+?) about (.+)$/);
      if (m) _doTalk(m[1], m[2]);
      else _doTalk(arg, null);
      break;
    }
    case "request": { // song request = ask dj
      if (_findNpc("dj")) _doTalk("dj", arg);
      else _say("No DJ here to take requests.");
      break;
    }
    case "give": case "hand": case "deliver": {
      const m = arg.match(/^(.+?) (?:to )?(nok|auntie|bank|cindy|lek|noi|ping|aom|joy|fon|gift|kwan|nong|pim|ploy|dj|oy|madam|daeng|gary|mot|security)( .*)?$/);
      if (m) _doGive(m[1].trim(), m[2]);
      else _say("Give what to whom? (GIVE <thing> TO <person>)");
      break;
    }
    case "sell": _doSellBottles(); break;
    case "buy": case "order": _doBuy(arg); break;
    case "pay": _doPay(arg); break;
    case "wai": _doWai(arg); break;
    case "say": case "speak": _doSay(rest.join(" ")); break;
    case "ride": case "catch":
      if (arg.startsWith("bus")) _doRideBus(arg.replace(/^bus\s*/, ""));
      else if (arg.startsWith("motosai") || arg.startsWith("moto") || arg.startsWith("bike"))
        _doMotosai(arg.replace(/^\S+\s*/, ""));
      else _say("Ride what — the bus or a motosai?");
      break;
    case "bus": _doRideBus(arg); break;
    case "motosai": case "moto": case "taxi": _doMotosai(arg); break;
    case "light": case "flashlight": case "torch":
      _doLight(!/off/.test(arg)); break;
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
    case "wait": case "z": _say("You wait. Pattaya doesn't."); break;
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
  _checkEnding();
}

// ── Boot text ──────────────────────────────────────────────────────────────

function engineIntro() {
  if (!G) newGame();
  _say("THE LAST BAHT BUS", "win");
  _say("a Pattaya misadventure · Soi Sanuk universe", "dim");
  _say("═══════════════════════════════════", "dim");
  _say("You wake face-down on Jomtien beach. The sun is bleeding into the sea and " +
    "your head is pounding like a bass bin outside Neon Paradise A-Go-Go.");
  _say("Your wallet is GONE. Your phone reads 13% battery. Your hotel is in Naklua — " +
    "the whole town away. The baht bus is ฿15 a head.");
  _say("You have ฿0.");
  _say("It's going to be one of those nights.", "alert");
  _say("");
  _describeRoom(true);
  _say("(Type HELP for commands.)", "dim");
}
