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
    talked: {},          // npcId → [dialogue indices already delivered] (terse repeats)
    itemLoc: Object.fromEntries(
      Object.entries(ITEMS).map(([id, it]) => [id, it.location])),
    safeTries: 0,
    pendingFare: null,   // { kind:"bus"|"moto", price, dest } awaiting `pay`
    pendingEnc: null,    // encounter id awaiting the player's snap reaction
    game: null,          // live bar mini-game state (connect 4 / jackpot / pool)
    soc: {               // bar social ledger
      drinks: {},        //   npcId → lady drinks bought tonight
      mamaTreat: {},     //   roomId → true (the mamasan drank on you here)
      bellAt: {},        //   roomId → turn of the last bell ring (the glow)
      bells: {},         //   roomId → total rings tonight (rules soften at 2)
      heat: {},          //   roomId → how close you are to meeting security
      banned: {},        //   roomId → turn you were thrown out
      patronBusy: {},    //   roomId → the regular has a girl's attention
      patronMiffed: {},  //   roomId → you drink-sniped his girl (bad form)
      bra: {},           //   npcId → you bought her the bra (fondle bumps a tier)
      drunk: 0,          //   your own count tonight
    },
    encDone: {},         // encounters that already fired (once per game)
    lastEnc: 0,          // turn number of the last encounter (cooldown)
    rng: 1 + Math.floor(Math.random() * 2147483645), // seeded per game
    score: 0,
    happy: 0,            // สนุก — the long game. 100 = สบายสบาย.
    stage: "act1",       // act1 → vacation → expat
    vacation: 1,         // which trip this is
    day: 2,              // you lost day one to the beach
    nightTurn: 0,        // 10 turns ≈ 1 hour; the night runs 18:00–04:00
    hunger: 30,          // 0 fed … 100 collapse
    thirst: 40,          // 0 quenched … 100 collapse (you woke up dry)
    hurt: 0,             // 3 = a night in the clinic
    bestHappy: 0,
    pendingChoice: null, // "vacation_end" gates input at week's end
    atmDay: 0,           // last day the lobby ATM paid out ฿3000
    lastPolice: -99,     // turn of the last boy-in-brown shakedown
    lastPeddler: -99,    // turn of the last bar-stool peddler visit
    selfBfId: null,      // hostess offering to barfine herself
    rain: 0,             // downpour turns remaining (0 = dry)
    lastRain: -99,       // turn the last downpour began
    lastDrizzle: -99,    // turn of the last light-rain vignette
    quests: {},          // questId → "offered" | "active" | "done" | "abandoned"
    quizPlayed: {},      // roomId → true (one quiz per bar per Thursday)
    phone: {             // the other half of your most important possession
      contacts: {},      //   npcId → true (you have her number)
      inbox: [],         //   [{from, text, turn, read, gives}]
      lastText: 0,       //   turn of the last incoming message
      msgCd: {},         //   npcId → day you last sweet-talked her by text
      invite: null,      //   {id, day} — she asked you to drop by tonight
    },
    over: false,         // legacy field; the sandbox never ends the night
  };
  return G;
}

function serializeGame() { return JSON.stringify(G); }
function deserializeGame(s) {
  G = JSON.parse(s);
  // older saves predate the encounter/mini-game systems — backfill the fields
  if (G.pendingEnc === undefined) G.pendingEnc = null;
  if (G.game === undefined) G.game = null;
  if (!G.soc) {
    G.soc = { drinks: {}, mamaTreat: {}, bellAt: {}, bells: {}, heat: {},
      banned: {}, patronBusy: {}, patronMiffed: {}, bra: {}, drunk: 0 };
  }
  if (G.happy === undefined) G.happy = 0;
  if (G.stage === undefined) {
    G.stage = G.flags && G.flags.act1Done ? "vacation" : "act1";
    G.vacation = 1;
    G.day = 2;
    G.nightTurn = Math.min(90, G.turns);
    G.hunger = 30;
    G.thirst = 40;
    G.hurt = 0;
    G.bestHappy = G.happy;
    G.pendingChoice = null;
  }
  if (G.atmDay === undefined) { G.atmDay = 0; G.lastPolice = -99; G.selfBfId = null; }
  if (G.rain === undefined) { G.rain = 0; G.lastRain = -99; }
  if (G.lastDrizzle === undefined) G.lastDrizzle = -99;
  if (!G.quests) G.quests = {};
  if (!G.phone) {
    G.phone = { contacts: {}, inbox: [], lastText: 0, msgCd: {}, invite: null };
  }
  if (G.lastPeddler === undefined) G.lastPeddler = -99;
  if (!G.quizPlayed) G.quizPlayed = {};
  if (!G.talked) G.talked = {};
  if (G.soc && !G.soc.bra) G.soc.bra = {};
  G.over = false; // pre-sandbox saves could be "over"; the night reopens
  if (!G.encDone) G.encDone = {};
  if (G.lastEnc === undefined) G.lastEnc = 0;
  if (!G.rng) G.rng = 1 + Math.floor(Math.random() * 2147483645);
  for (const id of Object.keys(ITEMS)) {
    if (!(id in G.itemLoc)) G.itemLoc[id] = ITEMS[id].location;
  }
  return G;
}

// Deterministic per-game RNG (Lehmer LCG). Living in G, it serialises with
// the save and rewinds with UNDO — no re-rolling an encounter by undoing.
function _rand() {
  G.rng = (G.rng * 48271) % 2147483647;
  return G.rng / 2147483647;
}

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
  // Second time you hear a line, get the point, not the whole spiel. We track
  // which entries an NPC has already delivered (by index) and, on a repeat,
  // swap in the entry's `short` gist and skip the Thai greeting flourish. An
  // entry without a `short` just repeats in full — no regression.
  const idx = n.dialogue.indexOf(d);
  const seen = G.talked[npcId] || (G.talked[npcId] = []);
  const terse = seen.includes(idx) && !!d.short;
  if (!seen.includes(idx)) seen.push(idx);
  if (d.th && !terse) { _say(`${n.emoji} ${n.name}: “${d.th}” (${d.rom})`, "thai"); _engineSpeak(d.th); }
  _say(terse ? d.short : d.text);
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
  if (r.barType === "beer" || r.barType === "soi6") {
    _say("A Connect 4 frame and a Jackpot dice box sit within reach (PLAY …).", "dim");
  }
  if (r.pool) {
    _say("A pool table waits under a low lamp (PLAY POOL)." +
      (_leagueTonight() ? " Tonight is LEAGUE NIGHT (PLAY KILLER, ฿100 in the ashtray)." : ""), "dim");
  }
  if (r.seven) _say("A 7-Eleven glows across the way (BUY TOASTIE / WATER / CHARGER).", "dim");
  if (_quizDay() && !r.barType) {
    const near = Object.values(r.exits).filter(to => _quizBars().includes(to));
    if (near.length && G.nightTurn < 40) {
      _say(near.map(to => ROOMS[to].bar || ROOMS[to].name).join(" and ") +
        (near.length > 1 ? " have" : " has") + " a chalkboard out: QUIZ NIGHT " +
        "TONIGHT 8-10 — PRIZES. " +
        (G.nightTurn >= 20 ? "It's on right now; walk in and you're playing." :
          "Starts at 20:00; walk in during and you're playing."), "dim");
    }
  }
  if (r.barType) {
    const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
    _say(G.soc.patronBusy[G.room] ?
      "A sunburnt regular holds court at the far end" +
      (girl ? `, with ${NPCS[girl].name}'s full attention` : "") + "." :
      "A regular nurses a big Chang at the rail, radiating opinions.", "dim");
  }
}

// ── Turn bookkeeping: battery, darkness, soi dogs ──────────────────────────

function _tick() {
  G.turns++;
  G.nightTurn++;
  // the body keeps its own books
  if (G.nightTurn % 20 === 0 && G.soc.drunk > 0) G.soc.drunk--;
  if (G.nightTurn % 3 === 0) G.hunger++;
  if (G.nightTurn % 2 === 0) G.thirst++;
  if (G.hunger === 70) _say("(Your stomach growls loudly enough to turn heads. Eat something.)", "alert");
  if (G.thirst === 70) _say("(Your throat is sandpaper. Drink something — ideally water.)", "alert");
  if (G.hunger === 90) _say("(You are running on fumes. Food. Now.)", "alert");
  if (G.thirst === 90) _say("(Dizzy. The neon is doing things it shouldn't. WATER.)", "alert");
  if ((G.hunger >= 80 || G.thirst >= 80) && G.nightTurn % 10 === 0) _addHappy(-1);
  if (G.hunger >= 100 || G.thirst >= 100) { _endNight("collapse"); return; }
  if (G.nightTurn >= NIGHT_TURNS) { _endNight("dawn"); return; }
  // rainy season: when the bake says storm, the sky sometimes proves it.
  // The stormy check comes first so a bake-less game never touches the dice.
  if (G.rain > 0) {
    G.rain--;
    if (G.rain === 0) {
      _say("The rain stops the way it started — all at once, like a tap. The " +
        "street steams, the music comes back up to volume, and the town picks " +
        "up exactly where it left off.", "alert");
    }
  } else if (_wxStormy() && G.turns - G.lastRain >= 30 && _rand() < 0.08) {
    _startRain(3 + Math.floor(_rand() * 6));
  } else if (_wxRainy() && G.turns - G.lastDrizzle >= 15 && _rand() < 0.06) {
    G.lastDrizzle = G.turns; // light rain: atmosphere only, never mechanics
    _sayDrizzle();
  }
  // the peddlers work the Beach Road bars, stool to stool
  if (!G.game && !G.pendingEnc && _inBar() && _room().region === "Beach Road" &&
      G.turns - G.lastPeddler >= 20 && _rand() < 0.12) {
    G.lastPeddler = G.turns;
    G.pendingEnc = "peddler";
    _say("A peddler drifts in off the street with a display board of watches, a fan " +
      "of sunglasses, and — produced from an inner pocket with a meaningful eyebrow " +
      "— certain 'vitamins'. He stations himself at your elbow, patient as weather.", "alert");
    _say("(WATCH ฿300 · SUNGLASSES ฿150 · VITAMINS ฿200 · or NO.)", "dim");
  }
  _maybeIncomingText();
  if (G.lightOn && G.battery > 0) {
    G.battery--;
    if (G.battery === 0) {
      G.lightOn = false;
      _say("Your phone gives a final apologetic buzz and dies. The flashlight is gone.", "alert");
    } else if (G.battery === 5) {
      _say("(Phone battery: 5%. This is fine.)", "alert");
    }
  }
  if (_isDarkHere() && !G.rain) { // even the soi dogs go to ground in a downpour
    G.darkStreak++;
    if (G.darkStreak === 1) {
      _say("Something shifts in the dark nearby. A low growl. You are likely to be " +
        "bitten by a soi dog.", "alert");
    } else if (G.darkStreak >= 2) {
      const food = ["noodles", "moo_ping"].find(id => _inv().includes(id));
      if (food) {
        G.itemLoc[food] = null;
        G.darkStreak = 0;
        _say(`A soi dog lunges out of the dark! You hurl the ${ITEMS[food].name} on ` +
          "pure instinct. It catches it mid-air with terrifying grace and trots " +
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
        _addHappy(-2);
        G.hurt++;
        if (G.hurt >= 3) { _endNight("hurt"); return; }
        _describeRoom(true);
      }
    }
  } else {
    G.darkStreak = 0;
  }
}

// ── Random street encounters ───────────────────────────────────────────────
// Rolled after arriving somewhere (walk, bus, motosai) in a lit street room.
// Scene data lives in ENCOUNTERS (world.js); outcomes live here. Interactive
// encounters set G.pendingEnc and the player's next command is their snap
// reaction — doCommand routes it to the matching _ENC resolver.

const ENC_COOLDOWN = 12; // min turns between encounters
const ENC_CHANCE = 0.3;  // roll per eligible arrival

function _maybeEncounter() {
  if (!G || G.over || G.pendingFare || G.pendingEnc) return;
  if (_isDarkHere() || _room().bar) return; // the dark belongs to the soi dogs
  // public drunkenness attracts the boys in brown (repeatable, unlike the rest)
  if (G.soc.drunk >= 5 && G.turns - G.lastPolice >= 30 && _rand() < 0.2) {
    G.lastPolice = G.turns;
    G.pendingEnc = "police";
    _say("A whistle, short and bored. A boy in brown detaches from the shade of a " +
      "power pole and takes up station directly in your weaving path, thumbs in " +
      "his belt. “You drink too much, my friend.” A statement, not a question. " +
      "“Have fine. Five hundred baht.”", "alert");
    _say("(He has all night. You, visibly, do not.)", "dim");
    return;
  }
  if (G.turns - G.lastEnc < ENC_COOLDOWN) return;
  const eligible = Object.keys(ENCOUNTERS).filter(id =>
    !G.encDone[id] && ENCOUNTERS[id].rooms.includes(G.room) &&
    (id !== "powerbank" || G.battery <= 30));
  if (!eligible.length || _rand() > ENC_CHANCE) return;
  _startEnc(eligible[Math.floor(_rand() * eligible.length)]);
}

function _startEnc(id) {
  const e = ENCOUNTERS[id];
  G.encDone[id] = true;
  G.lastEnc = G.turns;
  _say(e.intro, "alert");
  if (e.th) { _say(`“${e.th}” (${e.rom})`, "thai"); _engineSpeak(e.th); }
  if (e.interactive) {
    G.pendingEnc = id;
    if (e.hint) _say(e.hint, "dim");
  } else {
    _ENC[id]("");
  }
}

const _ENC = {
  selfbf(input) {
    const name = NPCS[G.selfBfId] ? NPCS[G.selfBfId].name : "She";
    G.selfBfId = null;
    if (/yes|yeah|sure|ok|of course|why not|please/.test(input)) {
      _say(`${name} settles her own fee with the till — a professional formality, ` +
        "handled in three seconds — and steers you out under the neon by the arm. " +
        "Being chosen, it turns out, is a different currency entirely.", "win");
      _addHappy(3);
      _endNight("barfine");
    } else {
      _say(`${name} takes it well — a small laugh, a smaller shrug — but something ` +
        "in the room closes like a till drawer. The other girls look at you the " +
        "way one looks at a man who returned a winning lottery ticket.");
      _addHappy(-1);
    }
  },

  police(input) {
    const exits = Object.values(_room().exits);
    const barRoom = exits.find(to => ROOMS[to].barType && G.soc.mamaTreat[to]);
    if (barRoom && _rand() < 0.7) {
      const mama = Object.entries(NPCS).find(([nid, n]) =>
        NPC_ROLES[nid] === "mamasan" && n.room === barRoom);
      _say(`A door bangs. ${mama ? NPCS[mama[0]].name : "The mamasan"} crosses the ` +
        "soi at ramming speed, already talking — fast, low Thai, one hand on the " +
        "officer's arm like an aunt collecting a nephew. Whatever is said ends " +
        "with a laugh, a wai in your direction, and the boy in brown evaporating " +
        "into the traffic. “You walk me back inside now,” she says, “and you " +
        "walk STRAIGHT.”", "win");
      _addHappy(2);
      return;
    }
    if (/wai|sorry|khrap|krub|apolog|sawatdee/.test(input)) {
      const f = Math.min(300, G.money);
      G.money -= f;
      _say("You wai first and apologise second, in Thai, both hands steady-ish. " +
        "The officer's arithmetic visibly adjusts for manners. " +
        (f ? `฿${f} changes hands inside a handshake old as the force itself. ` : "") +
        `“Drink water, my friend. Go home slow.” (฿${G.money} left.)`, "alert");
      _addHappy(-1);
    } else if (/pay|fine|give|baht|ok|yes|here/.test(input)) {
      const f = Math.min(500, G.money);
      G.money -= f;
      _say((f ? `฿${f} disappears into a shirt pocket with a receipt that will never ` +
        "exist. " : "He turns out your pockets, finds lint, and looks personally " +
        "offended. ") +
        "“Fine paid. No problem now. Sawatdee khrap.” The brown uniform strolls on, " +
        `scanning the crowd for the next swaying farang. (฿${G.money} left.)`, "alert");
      _addHappy(-2);
    } else {
      const f = Math.min(1000, G.money);
      G.money -= f;
      _say("You argue. His smile does not move, but a second uniform materialises " +
        "at your elbow, and the fine develops a friend. " +
        (f ? `฿${f} lighter, ` : "Pockets already empty, you are ") +
        "you are released into the night with a pat on the shoulder that means " +
        `it could always be worse. (฿${G.money} left.)`, "alert");
      _addHappy(-4);
    }
  },

  katoey(input) {
    if (/flirt|kiss|snog|fondle|grope|spank|charm|wink|lean in/.test(input)) {
      _say("You lean into it and flirt right back — to her enormous, cackling " +
        "delight. Both hands return instantly to visible airspace. “Oooooh, " +
        "hansum man SANUK!” She plants a lipstick mark on your cheek, pronounces " +
        "you number one, and strolls off having stolen nothing but the moment. " +
        "Respect, it turns out, is also currency on Beach Road.");
      _addHappy(2);
      return;
    }
    if (/pocket|wallet|push|shove|step|back|away|off|no|stop|hand|guard|hold|run/.test(input)) {
      _say("You clamp a hand over your pocket and step out of reach. She rolls her " +
        "eyes, entirely unembarrassed — “Cannot blame for trying, na~” — and struts " +
        "off down the road in search of drunker prey. Your baht survive.");
    } else if (G.money === 0) {
      G.money += 5;
      _say("Expert fingers sweep your pockets and find… lint. She steps back, looks " +
        "you up and down, and something like genuine pity crosses the perfect face. " +
        "A ฿5 coin is pressed into your palm. “For lucky, you poor thing.” She " +
        "leaves. You are now ฿5 richer and considerably poorer in spirit.");
    } else {
      const lost = Math.min(G.money, 40);
      G.money -= lost;
      _say("By the time you finish formulating a reply she is gone — melted into " +
        `the crowd, along with ฿${lost} from your pocket. The oldest two-handed ` +
        "trick on Beach Road, performed by a true professional. " +
        `(฿${G.money} left.)`, "alert");
      _addHappy(-2);
    }
  },

  bargirl() {
    G.money += 20;
    if (G.itemLoc.moo_ping === null) G.itemLoc.moo_ping = "inventory";
    _say("Before you can say a word she presses a ฿20 note and a moo ping skewer " +
      "into your hands, pats your cheek with tremendous sincerity, and says you " +
      "look EXACTLY like her mom's ex-boyfriend, who was a good man, jing jing, " +
      "and also always have bad night. Her friends drag her back inside, waving " +
      `apologies. (฿${G.money} — and dinner.)`);
    _say("(You now have the moo ping skewer.)", "dim");
    _addHappy(2);
  },

  brit(input) {
    if (/sorry|apolog|calm|mate|friend|wai|easy|misunderstand|mistake|my bad|buy you/.test(input)) {
      G.money += 50;
      _say("“…Nah. Nah, you’re alright, you’re alright.” The rage evaporates as " +
        "fast as it arrived, replaced by the crushing sentimentality of the very " +
        "drunk. “Sorry mate. Been a mad one.” He presses ฿50 into your hand — " +
        "“get yourself a beer, yeah?” — hugs you briefly but completely, and " +
        `lurches off toward the neon. (฿${G.money}.)`);
      _addHappy(1);
    } else if (/fight|punch|hit|swing|shove|push|square|come on|idiot|wanker|muppet yourself/.test(input)) {
      const lost = Math.min(G.money, 30);
      G.money -= lost;
      _say("A mistake. There is a brief, undignified tangle — and then two piwins " +
        "materialise out of nowhere, peel him off you with practised ease, and " +
        "walk him away like a wardrobe. In the shuffle you’ve shed " +
        (lost ? `฿${lost} in coins` : "nothing but your composure") +
        ". A piwin looks back at you: “No fighting, boss. Bad for everybody.”" +
        (lost ? ` (฿${G.money} left.)` : ""), "alert");
      _addHappy(-2);
      G.hurt++;
      if (G.hurt >= 3) _endNight("hurt");
    } else {
      _say("You blink at him with perfect, bottomless neutrality. Somewhere behind " +
        "the sunburn the thread is lost. “…Wrong bloke. Sorry pal.” He apologises " +
        "to you, then to a lamppost, and reels away into the night.");
    }
  },

  powerbank(input) {
    if (/yes|yeah|sure|ok|thank|khop|krub|krap|please|borrow|charge|why not/.test(input)) {
      G.battery = Math.min(100, G.battery + 30);
      _say("He plugs you in and you shoot the breeze — football, petrol prices, " +
        "whose girlfriend works where — while the number climbs. Twenty minutes " +
        `of Pattaya small talk later your phone reads ${G.battery}%. He waves ` +
        "away your thanks: “Next time, you take motosai, na?”");
      _addHappy(1);
    } else {
      _say("He shrugs and pockets the power bank — your funeral, boss — and goes " +
        "back to watching the street with professional calm.");
    }
  },

  freelancer(input) {
    const both = /both|two|friend|ning|threesome|them/.test(input);
    const yes = both || /yes|ok|sure|company|come|deal|her|why not/.test(input);
    if (!yes) {
      _say("You smile, wai lightly, and keep walking. “Mai pen rai~” — no offence " +
        "taken, none given. Behind you, she and Ning resume their professional " +
        "appraisal of the passing trade.");
      return;
    }
    if (!_flag("act1Done")) {
      _say("She reads the sand on your shirt and the ฿-nothing in your posture in " +
        "one glance, and laughs — kindly, but thoroughly. “Maybe tomorrow, hansum.” " +
        "Even Ning looks sympathetic.");
      return;
    }
    const price = both ? 1800 : 1000;
    if (G.money < price) {
      _say(`The number is ฿${price}. Your pocket says ฿${G.money}. She pats your ` +
        "cheek — “ATM broken? Sad story” — and turns back to the rail.");
      return;
    }
    G.money -= price;
    if (both) {
      _setFlag("hadThreesome");
      _say(`฿${price}, and Ning stops pretending not to listen. What follows — the ` +
        "motosai ride three-up (illegal, hilarious), the night bazaar snacks, the " +
        "hotel corridor shushing, and the rest of it — will be retold by you, " +
        "badly, for the rest of your life, to anyone who asks and several who " +
        "don't. (฿" + G.money + " left, every one of them irrelevant.)", "win");
      _addHappy(7);
      _endNight("barfine");
    } else {
      _say(`฿${price} settles it with no ledger and no mamasan — freelance means the ` +
        "commission is all hers. She takes your arm; the promenade approves.", "win");
      _endNight("barfine");
    }
  },

  pingpong(input) {
    if (!/yes|go|show|watch|see|up|why not|ok|sure/.test(input)) {
      _say("You wave him off. He keeps pace for half a block, price falling with " +
        "every step — six hundred, five hundred, FOUR hundred my friend — before " +
        "peeling away toward a stag party in matching singlets. They're doomed.");
      return;
    }
    if (G.money < 600) {
      _say("He walks you two steps up the stairs before the doorman's practiced eye " +
        "prices your pockets at under the minimum. You are returned to street level " +
        "with impressive economy.");
      return;
    }
    G.money -= 600;
    _setFlag("sawPingPong");
    _say("Up the stairs, ฿600 lighter before your eyes adjust. What follows is " +
      "briefly astonishing, mostly dispiriting, and involves exactly the projectile " +
      "sport advertised. Then the lights come up, your 'one drink' turns out to " +
      "have been three at ฿250 each — the bill is a laminated ambush, the doormen " +
      "are suddenly numerous, and you pay what it takes to leave.", "alert");
    const gouge = Math.min(400, G.money);
    G.money -= gouge;
    _say(`(฿${600 + gouge} total for the famous scam of Walking Street. Every farang ` +
      `pays the tuition exactly once. ฿${G.money} left.)`, "dim");
    _addHappy(-3);
  },

  peddler(input) {
    const deal = _flag("peddlerDeal");
    const px = { watch: deal ? 200 : 300, shades: deal ? 100 : 150, vits: deal ? 120 : 200 };
    if (/haggle|bargain|cheap|discount|too much|lower/.test(input)) {
      G.pendingEnc = "peddler"; // still at your elbow — next command is still the reaction
      if (deal) {
        _say("He clutches his chest — the international sign for “you are killing " +
          "me and my family”. The floor has been reached. " +
          `(WATCH ฿${px.watch} · SUNGLASSES ฿${px.shades} · VITAMINS ฿${px.vits} · or NO.)`);
        return;
      }
      G.flags.peddlerDeal = true;
      _say("You name a lower number in the local fashion — pained, apologetic, as " +
        "though the price wounded you both. A beat. Then the smile of a man " +
        "meeting a worthy opponent: “Okayyy. For you, special.” " +
        "(WATCH ฿200 · SUNGLASSES ฿100 · VITAMINS ฿120 · or NO.)");
      _addHappy(1);
      return;
    }
    delete G.flags.peddlerDeal;
    if (/watch|rolex/.test(input)) {
      if (G.money < px.watch) { _say(`฿${px.watch} for the 'Rolex'. He inspects your ฿` + G.money + " and moves along, unoffended."); return; }
      G.money -= px.watch;
      G.itemLoc.fake_rolex = "inventory";
      _say(`฿${px.watch}, and the 'Rolex' is yours — fitted on your wrist with jeweller's ` +
        `ceremony and a squeeze of the forearm. (฿${G.money} left.)`);
      _say("(You now have the genuine Rolex (allegedly).)", "dim");
      _addHappy(1);
    } else if (/glass|shade|sun/.test(input)) {
      if (G.money < px.shades) { _say(`฿${px.shades} for the RayBens, and you haven't got it. He tips an invisible hat.`); return; }
      G.money -= px.shades;
      G.itemLoc.shades = "inventory";
      _say(`฿${px.shades}. The RayBens go on immediately, indoors, at night. Perfect. (฿${G.money} left.)`);
      _say("(You now have the designer sunglasses.)", "dim");
      _addHappy(1);
    } else if (/vitamin|pill|med|blue/.test(input)) {
      if (G.money < px.vits) { _say(`฿${px.vits} for the 'vitamins'. Your pockets decline on your behalf.`); return; }
      G.money -= px.vits;
      G.itemLoc.vitamin_v = "inventory";
      _say(`฿${px.vits} changes hands with the discretion of a state secret, which fools ` +
        `no one — the whole bar saw, and the whole bar is delighted. (฿${G.money} left.)`);
      _say("(You now have the packet of 'vitamins'. The hostesses will NEVER let this go.)", "dim");
      _addHappy(1);
    } else {
      _say("A slow head-shake. He re-shoulders the display board — watches swinging " +
        "like wind chimes — and moves down the bar to a man who has already made " +
        "eye contact, the fatal error.");
    }
  },

  tonic(input) {
    if (/yes|buy|ok|sure|deal|take it|fine/.test(input)) {
      if (G.money < TONIC_PRICE) {
        _say(`You turn out your pockets: ฿${G.money}. He closes the briefcase with ` +
          "the quiet disappointment of a man who has badly misjudged his mark, " +
          "and evaporates.");
      } else {
        G.money -= TONIC_PRICE;
        G.itemLoc.hair_tonic = "inventory";
        _say(`Somehow — you will replay this moment for years — you hand over ฿${TONIC_PRICE} ` +
          "and receive one brown bottle. He shakes your hand with both of his, " +
          "wishes your family long life, and is gone before the receipt (there is " +
          `no receipt) hits the ground. (฿${G.money} left.)`);
        _say("(You now have the bottle of hair tonic.)", "dim");
        _addHappy(-1);
      }
    } else {
      _say("You keep walking. He keeps pace for exactly eleven more compliments, " +
        "then peels away toward a sunburnt couple with the smoothness of a man " +
        "who has done this ten thousand times tonight.");
    }
  },
};

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

function _doPlay(arg) {
  if (G.game) { _say("One game at a time, champ."); return; }
  const w = arg.toLowerCase();
  if (w.includes("jackpot") || w.includes("dice")) return _startJackpot(w);
  if (w.includes("killer") || w.includes("league")) return _startKiller();
  if (w.includes("pool") || w.includes("8") || w.includes("billiard")) return _startPool();
  if (w.includes("connect") || w.includes("four") || w.includes("4")) return _startC4();
  _say("Play what? CONNECT 4, JACKPOT [bet], POOL, or KILLER (league nights).", "dim");
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
  _say("(You're ●. DROP 1-7 · QUIT concedes.)", "dim");
}

function _c4Input(input) {
  const g = G.game;
  const m = input.match(/[1-7]/);
  if (!m) { _say("Pick a column: 1-7. (QUIT concedes.)", "dim"); return; }
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
    _say(`FLIP ${moves[0].join(" ")} or FLIP ${moves[1].join(" ")}?`, "dim");
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
    _say(`FLIP ${g.pending[0].join(" ")} or FLIP ${g.pending[1].join(" ")} — those are the choices.`, "dim");
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
  if (pick === null) { _say("1, 2, or 3 — the microphone is patient, the bar less so.", "dim"); return; }
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
  if (!kind) { _say("SHOT or POWER — the table is waiting.", "dim"); return; }
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
  _say(`(You: ${g.you || "on the BLACK"} · ${g.oppName}: ${g.opp || "on the black"}.)`, "dim");
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
  if (!kind) { _say("SHOT (sensible), POWER (greedy), or SAFETY (sneaky).", "dim"); return; }
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

// ── Bar social life ─────────────────────────────────────────────────────────
// Lady drinks buy goodwill, one girl at a time. Actions (flirt < kiss < spank
// < fondle) resolve against her favor: rebuffed → tolerated → leaned into →
// reciprocated. Roles cap the physical stuff — cashiers and mamasans allow
// light contact only, unless the bell has rung enough times tonight. Heat
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

function _favor(id) {
  let f = G.soc.drinks[id] || 0;
  if (G.soc.mamaTreat[G.room]) f += 1;   // the mamasan's blessing travels
  if (_bellActive()) f += 2;             // everybody loves the bell man
  return f;
}

function _addHeat(n) {
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
  if (r.region === "LK Metro") {
    for (const [id, rm] of Object.entries(ROOMS)) {
      if (rm.region === "LK Metro" && rm.barType) G.soc.banned[id] = G.turns;
    }
    _say("(Complex security radios ahead. You are now famous in every bar in " +
      "LK Metro, in the worst way.)", "alert");
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
      _addHappy(10);
      break;
    case "sleep":
      _say("You call it. The air-con rattles its lullaby, the neon leaks through " +
        "the curtains, and Pattaya carries on politely without you.", "room");
      break;
  }
  G.day++;
  if (G.stage !== "expat" && G.day > 7) { _endVacation(); return; }
  const hangover = G.soc.drunk;
  G.soc.drunk = 0;
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
  delete G.encDone.freelancer; // Beach Road restocks nightly
  G.hurt = 0;
  G.hunger = Math.min(85, 30 + hangover * 5);
  G.thirst = Math.min(90, 40 + hangover * 6);
  G.nightTurn = 0;
  G.darkStreak = 0;
  G.lightOn = false;
  G.safeTries = 0;
  if (_flag("act1Done")) { G.room = "hotel_room"; G.battery = 100; }
  else { G.room = "jomtien_beach"; G.battery = Math.max(G.battery, 20); }
  _say("");
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
  _say("NEW VACATION — fly back next month. (No lost wallet this time. Probably.)", "dim");
  _say("MOVE TO PATTAYA — stop pretending you're going home. Make the move; live the sandbox.", "dim");
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
  G.room = "hotel_room";
  _say("");
  _say("A month of grey sky and greyer meetings, and then the seatbelt sign " +
    "pings off over the gulf. Same hotel. Same terrible, perfect bed. Room 412 " +
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

// ── Barfine ──────────────────────────────────────────────────────────────────
// Canon: everywhere lets the ladies go with a customer for a fee; go-gos and
// Soi 6 are the expensive end. Soi 6 has "upstairs" — the night continues.
// Elsewhere, the barfine IS the rest of your night, and a very good one.

// The clock sets the rate: before 21:00 the mamasan charges for the whole
// lost shift (×1.5); after midnight most beer bars quietly waive the fee —
// except for the popular girls — and the flash joints just discount.
function _barfinePrice(bt, id) {
  const base = bt === "soi6" ? BF_SOI6 : bt === "gogo" ? BF_GOGO : BF_BEER;
  if (G.nightTurn < 30) return Math.round(base * 1.5 / 50) * 50;
  if (G.nightTurn >= 60) {
    if (bt === "beer" && !POPULAR_GIRLS.includes(id)) return 0;
    return Math.round(base * 0.75 / 50) * 50;
  }
  return base;
}

function _doBarfine(arg) {
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
  const price = _barfinePrice(bt, id);
  if (_favor(id) < (bt === "soi6" ? 2 : 4)) {
    _say(bt === "soi6" ?
      `${name} laughs, not unkindly: “Lady drink first, na. One or three.” Even ` +
      "Soi 6 has liturgy." :
      `${name} pats your hand: “You sweet. But buy me drink, talk to me a little — ` +
      "this is Pattaya, not a vending machine.”");
    return;
  }
  if (G.money < price) {
    _say(`The mamasan names it without looking up: ฿${price}` +
      (G.nightTurn < 30 ? " — early hours, peak rate; the whole shift walks out with her" : "") +
      `. You have ฿${G.money}. She returns to her book. The book is the whole answer.`);
    return;
  }
  G.money -= price;
  if (price === 0) {
    _say(`The mamasan glances at the clock — past midnight — closes the ledger, and ` +
      "waves the fee away with two fingers. The barfine walks out with the girl " +
      "soon anyway; only the famous ones stay on the book all night.", "dim");
  } else if (G.nightTurn >= 60 && POPULAR_GIRLS.includes(id)) {
    _say(`Past midnight the book usually closes — but not for ${name}. The mamasan ` +
      `taps the fee, unbudging: for HER, any hour is peak. ฿${price}.`, "dim");
  }
  if (bt === "soi6") {
    _say(`฿${price} to the till and ${name} takes your hand with the confidence of ` +
      "home advantage. “Upstairs” turns out to be exactly as advertised. Some " +
      "time later you are back on your stool, thinking about nothing at all, " +
      `while she fixes her hair in the till mirror. (฿${G.money} left.)`, "win");
    _addHappy(6);
    return;
  }
  _say((price ?
    `฿${price} to the mamasan, who enters it in the ledger with ceremony and ` +
    `gives ${name} a nod that means back by opening, mind. ` :
    `The mamasan gives ${name} a nod that means go on then, off the clock. `) +
    `${name} vanishes and reappears out of uniform — jeans, clean shirt, ordinary ` +
    `and lovely — and takes your arm like you're the one being rented.` +
    (price ? ` (฿${G.money} left.)` : ""), "win");
  _endNight("barfine");
}

// A regular's reward: late enough, liked enough, and she may pay her own
// barfine — an investment decision, and the highest compliment the soi pays.
function _maybeSelfBarfine(id) {
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
  _say(`${name} studies you for a long moment, does some private arithmetic, and ` +
    `calls something to the mamasan in fast Thai. Then, to you: “I pay my own ` +
    `barfine tonight. You don't tell anybody, na.” The other girls have gone ` +
    "very quiet. This does not happen.", "win");
  _say("(YES / NO — she is not going to ask twice.)", "dim");
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
    if (st === "active") { _say(`▶ ${q.name} — ${q.desc}`, "win"); shown++; }
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
    const bar = (ROOMS[n.room] && (ROOMS[n.room].bar || ROOMS[n.room].name)) || "around";
    const drinks = G.soc.drinks[id] || 0;
    const glow = drinks >= 6 ? " ❤" : drinks >= 3 ? " ✦" : "";
    _say(`  ${n.emoji} ${n.name} — ${bar}${glow}`, "dim");
  }
  _say("(MESSAGE <name> to charm · SEND <amount> TO <name> — the banking app.)", "dim");
}

function _doContact(arg) {
  const id = _findNpc(arg);
  if (!id) { _say("They're not here to ask."); return; }
  if (!NPC_ROLES[id]) { _say(`${NPCS[id].name} keeps that number for family and better customers.`); return; }
  if (G.phone.contacts[id]) { _say(`You already have ${NPCS[id].name}'s number. She knows you know.`); return; }
  if (_phoneDead()) return;
  if (NPCS[id].room !== G.room) { _say("Numbers get swapped in her bar, over a drink — not on the street."); return; }
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
function _maybeIncomingText() {
  if (G.battery <= 0 || G.game || G.pendingEnc) return;
  const contacts = Object.keys(G.phone.contacts);
  if (!contacts.length) return;
  if (G.turns - G.phone.lastText < 25) return;
  if (_rand() >= 0.08) return;
  const id = contacts[Math.floor(_rand() * contacts.length)];
  const name = NPCS[id].name;
  const roll = _rand();
  if (roll < 0.4) {
    G.phone.invite = { id, day: G.day };
    _pushMsg(id, `bar quiet tonight 😴 you come see ${name}?? I keep you seat 💺💕`);
  } else if (roll < 0.65) {
    _pushMsg(id, ["mama of me sick, need buy medicine 300 baht 🥺 you help?",
      "phone of me break!! need 500 for fix... you good heart na 🙏",
      "buffalo of family very sick 😭😭 200 baht help little bit?"][Math.floor(_rand() * 3)]);
  } else if (roll < 0.9) {
    _pushMsg(id, ["thinking of you na 💭", "you eat already?? 🍚", "sabai dee mai 😊",
      "last night SO funny 5555"][Math.floor(_rand() * 4)]);
  } else {
    _pushMsg(id, "lucky day!! I win lottery small small 🎉 send you luck money", 50);
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

// ── Food and water ───────────────────────────────────────────────────────────

const FOOD_STALLS = {
  jomtien_7eleven: { name: "a toastie, pressed while you wait", price: 35, hunger: 40, thirst: 0 },
  jomtien_beach_rd: { name: "a cold mango from Auntie Nok, salt and chilli on the side", price: 30, hunger: 25, thirst: 15 },
  buakhao_market: { name: "som tam from the cart, extra everything", price: 50, hunger: 55, thirst: -10 },
  naklua_rd: { name: "grilled chicken and sticky rice off a smoky cart", price: 60, hunger: 60, thirst: 0 },
  ws_gate: { name: "a late-night kebab of negotiable provenance", price: 89, hunger: 45, thirst: 0 },
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
  if (G.room === "hotel_room" && G.stage === "vacation" && G.atmDay !== G.day) {
    G.atmDay = G.day;
    G.money += SAFE_CASH;
    _say(`You stop at the lobby ATM on the way out. It considers your card, sighs, ` +
      `and surrenders the daily damage: ฿${SAFE_CASH}. (฿${G.money} in pocket.)`, "dim");
  }
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
  _say(`฿${G.money} · phone ${G.battery}%${G.lightOn ? " (flashlight ON)" : ""} · ` +
    `${_clockStr()} day ${G.day} · hunger ${G.hunger} · thirst ${G.thirst}`, "dim");
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
  if (!npc) {
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
  "LK Metro": "Perfume and spilled Chang in a closed loop — the complex recycles its own air like a space station.",
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
  "LK Metro": "Bass bleeding through shared walls. The whole complex has one heartbeat, and it runs at about 128 bpm.",
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
  } else if (_inBar()) {
    _say("You dance between the stools. A hostess joins you instantly and " +
      "without inquiry — enthusiasm is the house style — and for eight bars " +
      "of luk thung you are the floor show.");
  } else {
    _say("You dance alone on the pavement. A passing baht bus honks the beat, " +
      "which is generous, because you weren't keeping one.");
  }
}

function _doSing() {
  if (_inBar()) {
    _say("You give it a verse. Three hostesses join the chorus without asking " +
      "what the song is. It has never once mattered.");
  } else {
    _say("You sing to the street. Somewhere down the soi a karaoke bar " +
      "answers, worse. Honour is satisfied.");
  }
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

const _MAP = `            NAKLUA ─ your hotel
               │
             SOI 6
               │
  ~  BEACH RD N ─ Stinky Bar
  ~       │
  ~  BEACH RD C ─ CENTRAL ─ SECOND RD N
  ~       │ (Tequila  MALL      │
  ~       │   Queen)     PATTAYA KLANG ──► THE DARKSIDE
  ~       │                     │        (lake · Khao Talo —
  ~       │            SECOND RD C ─ MYTH NIGHT   motosai out)
  ~       │                     │         │
  ~  BEACH RD S ──────── SECOND RD S   BUAKHAO N
  ~       │                     │  \\       ║ (LK METRO off the soi)
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

function _doShower() {
  if (G.room !== "hotel_room") {
    _say("Your shower is in room 412 in Naklua, enjoying the solitude.");
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
  if (G.room === "hotel_room") {
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
  WAI [person] · SAY <thai phrase>
  RIDE BUS TO <place> · MOTOSAI TO <place> · PAY <amount>
  BUY <thing> · SELL BOTTLES · READ <thing> · READ SIGN
  WATCH TV (bars) · READ PAPER (bars & 7-Elevens) — the day's real headlines
  WEATHER · SCORES (real football) · LOTTERY (the real GLO draw)
  PLAY CONNECT 4 · PLAY JACKPOT [bet] · PLAY POOL   (in the beer bars)
  FLIRT/KISS/SPANK/FONDLE <lady> · BUY DRINK FOR <lady> · BUY BEER
  THROW COVER [AT <lady>] (the ceiling game — warm her up first)
  BUY BRA FOR <lady> (฿200 — makes FONDLE more interesting)
  RING BELL (฿300, instant popularity) · TALK TO PATRON · BARFINE <lady>
  EAT <food> · DRINK <thing> · BUY WATER / FOOD (street carts & 7-Elevens) · SLEEP (at the hotel)
  DIAGNOSE (how bad is it) · AGAIN or G (repeat last command)
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
  "motosai to", "light", "charge phone", "read", "use", "open", "play",
  "flirt", "kiss", "spank", "fondle", "throw cover", "ring bell", "barfine", "eat", "drink",
  "sleep", "tv", "weather", "scores", "lottery", "map", "time", "tip", "wave",
  "photo", "call", "shower", "withdraw", "cheers", "dance", "sing", "swim",
  "smell", "listen", "diagnose", "apologize", "quests", "accept", "abandon", "contact",
  "contacts", "message", "check messages", "send", "score", "wait", "again",
  "help", "save", "load", "undo", "restart",
];

function _cInv() {
  return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === "inventory");
}
function _cItemWord(id) { return ITEMS[id].name.split(" ").pop().toLowerCase(); }
function _cNpcsHere() { return _npcsHere().map(id => NPCS[id].name.toLowerCase()); }

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
            (!d.notFlags || d.notFlags.every(f => !_flag(f)))).map(d => d.topic);
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
    case "drop": case "read": case "use": return _cInv().map(_cItemWord);
    case "give":
      return ctx.length >= 2 ? _cNpcsHere() : _cInv().map(_cItemWord);
    case "buy": case "order":
      return ["beer", "water", "lady drink for", "bra for", "charger", "toastie", "food"];
    case "go": case "walk": case "head": case "enter":
      return Object.keys(_room().exits);
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
    case "play": case "challenge": return ["connect 4", "jackpot", "pool", "killer"];
    case "light": case "turn": return ["on", "off"];
    case "watch": return ["tv"];
    case "check": return ["messages"];
    case "throw": case "toss": case "chuck": case "fling":
      return ctx.length >= 2 ? girls() : ["cover", "pastie", "nipple cover"];
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
  const pool = ctx.length ? _completePool(ctx[0], ctx) : _COMPLETE_VERBS;
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

function doCommand(input) {
  if (!G) newGame();
  const raw = _norm(input);
  if (!raw) return;
  const lower = raw.toLowerCase();
  const words = lower.split(" ");
  const [v, ...rest] = words;
  const arg = rest.filter(w => !["the", "a", "an", "to", "at", "up", "my"].includes(w)).join(" ");

  // the week is over: the airline needs an answer before anything else
  if (G.pendingChoice === "vacation_end") {
    if (/^restart/.test(lower)) { newGame(); engineIntro(); return; }
    if (/vacation|holiday|again|fly back|new/.test(lower)) { _newVacation(); return; }
    if (/move|expat|stay|pattaya|remain/.test(lower)) { _goExpat(); return; }
    _say("NEW VACATION or MOVE TO PATTAYA — the airline needs an answer.", "dim");
    return;
  }

  // a live bar game captures every command until it ends (QUIT concedes)
  if (G.game) {
    if (/^(quit|resign|concede|forfeit|leave)/.test(lower)) { _gameQuit(); _tick(); return; }
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
    _say(`The driver is still waiting: “${thaiBaht(G.pendingFare.price)}”. (PAY <amount>)`, "thai");
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
    case "go": case "walk": case "head": _doGo(arg); break;
    case "enter": _doEnter(arg); break;
    case "look": case "l":
      if (arg) _doExamine(arg); // "look at candy" = "examine candy"
      else _describeRoom(true);
      break;
    case "examine": case "x": case "inspect": case "search": _doExamine(arg); break;
    case "check":
      if (/message|phone|text|inbox/.test(arg)) _readMessages();
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
      const m = arg.match(/^(.+?) (?:to )?(nok|auntie|bank|candy|lek|noi|ping|aom|joy|fon|gift|kwan|nong|pim|ploy|dj|oy|madam|daeng|gary|mot|security|bee|bert|mem)( .*)?$/);
      if (m) _doGive(m[1].trim(), m[2]);
      else _say("Give what to whom? (GIVE <thing> TO <person>)");
      break;
    }
    case "sell": _doSellBottles(); break;
    case "buy": case "order": _doBuy(arg); break;
    case "pay": _doPay(arg); break;
    case "wai": _doWai(arg); break;
    case "say": case "speak":
      if (/^(sorry|khor ?thot|kho ?thot|ขอโทษ)/.test(arg)) _doApologize();
      else _doSay(rest.join(" "));
      break;
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
    case "play": case "challenge": _doPlay(arg); break;
    case "flirt": _doSocial("flirt", arg); break;
    case "kiss": case "snog": case "smooch": _doSocial("kiss", arg); break;
    case "spank": _doSocial("spank", arg); break;
    case "fondle": case "grope": _doSocial("fondle", arg); break;
    case "ring": case "bell": _doBell(); break;
    case "barfine": case "bf": _doBarfine(arg.replace(/^with /, "")); break;
    case "eat": _doEat(arg); break;
    case "sleep": case "bed": case "crash":
      if (!_flag("act1Done")) _say("Sleep where? The beach already had you once tonight. Get the wallet, get the room.");
      else if (G.room !== "hotel_room") _say("Your bed is in Naklua — room 412. It'll keep.");
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
      if (!arg || /tv|news|television/.test(arg)) _doTv();
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
