// The Last Baht Bus — game engine, part 1/5: output plumbing, known names,
// game state (G, serialize/deserialize), hotels, patrons, look/describe, and
// per-turn bookkeeping (battery, darkness, soi dogs).
//
// The engine is split across five classic scripts sharing globals, loaded in
// order after world.js/games.js: engine-core → engine-encounters → engine-play
// → engine-systems → engine-parser (see index.html and the vm-test load lists).
// Core loads first because it declares G and the print/speak hooks the other
// parts reference; nothing runs at load beyond const initializers, so functions
// may live in any part. DOM-free at load and in every function (unit-tested via
// node:vm); output goes through an injected print callback — term.js supplies
// the real renderer, tests a capture buffer.

// ── Build config ────────────────────────────────────────────────────────────
// There's no build step, so this constant IS the switch. CHEATS_ENABLED gates
// the hidden testing codes; flip it to false to ship a clean production build
// (that's the intended default). Currently ON for in-game testing.
// Codes (typed, deliberately never surfaced in autocomplete/decoration):
//   twoweekmillionaire — grants ฿2,000,000 for spending (handled in doCommand).
let CHEATS_ENABLED = true;

// ── Output plumbing ────────────────────────────────────────────────────────

let _enginePrint = () => {};
let _engineSpeak = () => {}; // (thaiText) — TTS hook, no-op headless
let _engineSfx = () => {};   // (name) — one-shot sound hook, no-op headless

function engineInit(printFn, speakFn, sfxFn) {
  _enginePrint = printFn || (() => {});
  _engineSpeak = speakFn || (() => {});
  _engineSfx = sfxFn || (() => {});
}

// say(text, cls) — cls hints the renderer: "room", "thai", "dim", "alert", "win"
function _say(text, cls) {
  _learnNames(text);
  // collect the Thai the night shows you (capped, deduped) — the trainer
  // (same origin) reads it out of lbb_save and offers "words from the bus"
  if (G && G.thaiSeen) {
    for (const run of text.match(/[\u0E00-\u0E7F]{2,}/g) || []) {
      if (!G.thaiSeen.includes(run)) {
        G.thaiSeen.push(run);
        if (G.thaiSeen.length > 60) G.thaiSeen.shift();
      }
    }
  }
  _enginePrint(text, cls || "");
}

// ── Action breadcrumb ────────────────────────────────────────────────────────
// After a command's prose, a short past-tense line naming who/what you just
// acted on ("· You asked Nok about beer") so a long scroll doesn't lose the
// thread. Handlers call _trace() on their success path with the CANONICAL name;
// movement is inferred centrally by doCommand (a room change with no explicit
// trace). The line prints via _enginePrint so term.js decorate() chips the
// names — they stay tappable while still in context — but skips _say's
// name/Thai harvest (a breadcrumb isn't game prose).
let _pendingTrace = null;
function _trace(verb, target, extra) {
  _pendingTrace = { verb, target: target || "", extra: extra || "" };
}
const _TRACE_VERBS = {
  talk: "talked to", ask: "asked", give: "gave", go: "went to",
  flirt: "flirted with", kiss: "kissed", spank: "spanked", fondle: "fondled",
  compliment: "complimented", joke: "joked with", tease: "teased",
};
// pure + DOM-free: build the breadcrumb string (tested in engine.test.js)
function _traceLine(t) {
  if (!t || !t.verb) return "";
  const target = String(t.target || "").trim();
  const extra = String(t.extra || "").split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
  if (t.verb === "ask")
    return `· You asked ${target}${extra ? ` about ${extra}` : ""}`.trimEnd();
  if (t.verb === "give")
    return `· You gave ${target}${extra ? ` the ${extra}` : ""}`.trimEnd();
  const v = _TRACE_VERBS[t.verb] || t.verb;
  return `· You ${v}${target ? ` ${target}` : ""}`.trimEnd();
}
// Called by doCommand after each command: synthesise a movement breadcrumb when
// nothing explicit was set but the room changed, then print + clear.
function _flushTrace(prevRoom) {
  if (!_pendingTrace && prevRoom != null && G && G.room !== prevRoom &&
      typeof ROOMS !== "undefined" && ROOMS[G.room])
    _pendingTrace = { verb: "go", target: ROOMS[G.room].name, extra: "" };
  const t = _pendingTrace;
  _pendingTrace = null;
  if (!t) return;
  const line = _traceLine(t);
  if (line && typeof _enginePrint === "function") _enginePrint(line, "trace");
}

// Render-only markup: authored content wraps a span in {{…}} to mark it literal
// — the frontend must print it plainly and tap-decorate NOTHING inside (an item
// someone else owns, "grabs another {{phone}}"; a proper noun that isn't
// gossipable). The engine never emits it and never acts on it; term.js's
// decorate() is suppress-aware, and this strips the braces for any consumer that
// prints _say text WITHOUT decorate() (a plain log, a future served/2D frontend).
function stripMarkup(text) {
  return String(text == null ? "" : text).replace(/\{\{([\s\S]*?)\}\}/g, "$1");
}

// ── Known names ────────────────────────────────────────────────────────────
// A character is "known" once their name has actually appeared in the
// transcript — a presence line, a room description, someone's gossip. The
// flyout wheel only offers ask-topics about known people, so a first
// encounter with Bank can't dangle "ask about pim" before anything has ever
// mentioned Pim. Typed ASK stays permissive; only the UI hint is gated.

let _nameRx = null; // [id, /\bName\b/] pairs, built once from the rosters

function _learnNames(text) {
  if (!G || !G.known) return;
  if (!_nameRx) {
    _nameRx = [];
    const rosters = [NPCS, typeof PATRONS === "undefined" ? {} : PATRONS];
    for (const roster of rosters) {
      for (const [id, n] of Object.entries(roster)) {
        const last = n.name.split(" ").pop(); // "Madam Oy" → "Oy"
        if (!/^[A-Z]/.test(last)) continue;   // "security" is nobody's name
        _nameRx.push([id, new RegExp("\\b" + last + "\\b")]);
      }
    }
  }
  for (const [id, rx] of _nameRx) {
    if (!G.known[id] && rx.test(text)) G.known[id] = true;
  }
}

// The gate itself: a topic that is somebody's name is only *offered* — by
// the flyout wheel and the input autocomplete — once that character is
// known. Topics that aren't names always pass.
function _topicKnown(t) {
  if (!G || !G.known) return true; // save predates the gate: hide nothing
  const rosters = [NPCS, typeof PATRONS === "undefined" ? {} : PATRONS];
  for (const roster of rosters) {
    for (const [id, n] of Object.entries(roster)) {
      if (n.name.split(" ").pop().toLowerCase() === t) return !!G.known[id];
    }
  }
  return true;
}

// ── Game state ─────────────────────────────────────────────────────────────

let G = null;

function newGame() {
  G = {
    room: "jomtien_beach",
    money: 0,
    battery: 13,
    lightOn: false,
    lightWarn: { room: null, n: 0, mark: false }, // go-go no-photo escalation
    blueDogDay: 0,       // last day the Blue Dog show paid its happy point
    hotel: "sabai",      // where you're checked in: sabai | queenvic | metropole
    hotelDebt: 0,        // what's on the night clerk's book
    tonicOwed: 0,        // baht the hair-tonic shop fleeced you for, recoverable via a police REPORT
    curseOwed: 0,        // baht the beach fortune-teller's "cleansing" fleeced you for, likewise REPORT-recoverable
    loan: null,          // Nira's loan: { principal, owed, dueDay, strikes } or null
    thaiSeen: [],        // Thai runs the transcript has shown (the trainer's cross-app deck)
    qvDay: 0,            // last day the Queen Vic balcony paid its happy point
    dragDay: 0,          // last day the Peacock Cabaret drag revue paid its happy point
    catDay: 0,           // last day the Jomtien beach cats paid theirs
    dog: null,           // the accidentally-adopted soi dog: { since: day, name? } once you've fed him
    dogNudgeDay: 0,      // last day the un-adopted dog made his half-block approach
    patronTalk: { day: 0, talked: {} }, // patron dialogue book, reset daily
    turns: 0,
    wingmanUntil: 0,     // G.turns before which a wing-woman is vouching for you
    darkStreak: 0,
    flags: {},
    offShift: null,      // a masseuse's off-shift number you carry: {id,name,home,day,ghost}
    hospitalVisits: 0,   // morning-after hospital scenes seen — rotates the prose so repeats vary
    codaSeen: 0,         // dawn "her baht bus home" codas seen — rotates the prose so repeats vary
    known: {},           // charId → true once their name has printed (ask-topic gate)
    visited: { jomtien_beach: true }, // roomId → true once stood in (fast-travel gate)
    talked: {},          // npcId → [dialogue indices already delivered] (terse repeats)
    npc: {},             // per-character conversation state: id → {trust,mood,dstate,know} (see _npcState)
    convo: null,         // active conversation partner id — bare topics/actions aim here (see _convoActive)
    itNpc: null,         // last person addressed — the antecedent for "her/him/them" (see _resolveActor)
    convoQ: null,        // a question the partner has put to YOU, awaiting a reply: {id,key} (see _convoAsk/_convoAnswer)
    convoIdx: null,      // index of the partner's last-delivered node — its `choices` are the live action-choices (see _convoChoices)
    player: { said: {}, origin: null, personality: null, orientation: null },// what you've told NPCs + WHO YOU ARE (origin/personality/orientation, picked in the taxi intro; persists across Act One resets)
    faction: { wdg: 0, samson: 0, indie: 0, syndicate: 0 }, // standing with the powers (see _align) — only moves when you ACT, never for declining
    itemLoc: Object.fromEntries(
      Object.entries(ITEMS).map(([id, it]) => [id, it.location])),
    safeTries: 0,
    pendingFare: null,   // { kind:"bus"|"moto", price, dest } awaiting `pay`
    pendingBf: null,     // { id, st, lt, room } — barfine negotiation awaiting ST/LT/NO
    bfIncident: null,    // { id, room, kind, fine, day } — a girl ran a game; COMPLAIN for recourse
    bfStrikes: {},       //   girlId → complaints upheld against her (2 = the apology scene)
    bfSeq: null,         // { id, kind, fine, spent, room } — mid bar-hop/WS-party sequence
    rideSeq: null,       // { id, fine, spent, stops, sanuk, seen } — mid night-ride ("her Pattaya")
    pendingEnc: null,    // encounter id awaiting the player's snap reaction
    encPrompt: null,     // [[text, cls], …] of the pending encounter's prompt, so a restore can redraw it
    game: null,          // live bar mini-game state (connect 4 / jackpot / pool)
    soc: {               // bar social ledger
      drinks: {},        //   npcId → cumulative attention/favor = the BOND (persists within a vacation, cools 1/night; drives _bondTier — The Regular)
      mamaTreat: {},     //   roomId → true (the mamasan drank on you here)
      bellAt: {},        //   roomId → turn of the last bell ring (the glow)
      bells: {},         //   roomId → rings tonight; while the glow holds, 2 softens the rules, 3 = the room is yours
      heat: {},          //   roomId → how close you are to meeting security
      banned: {},        //   roomId → turn you were thrown out
      patronBusy: {},    //   roomId → the regular has a girl's attention
      patronMiffed: {},  //   roomId → you drink-sniped his girl (bad form)
      bra: {},           //   npcId → you bought her the bra (fondle bumps a tier)
      mgrShot: {},       //   roomId → the manager's free welcome shot poured tonight (nightly)
      mgrChat: {},       //   managerId → how hard you've leaned on him since your last man drink (nightly)
      manDrinks: {},     //   managerId → man drinks you've stood him (goodwill, persists the vacation)
      drunk: 0,          //   your own count tonight
    },
    encDone: {},         // encounters that already fired (once per game)
    lastEnc: 0,          // turn number of the last encounter (cooldown)
    rng: 1 + Math.floor(Math.random() * 2147483645), // seeded per game
    score: 0,
    happy: 0,            // สนุก — the long game. 100 = สบายสบาย.
    stage: "act1",       // act1 → vacation → expat
    mode: null,          // null = the full-game story; "soi6" = the Soi 6-only challenge
    vacation: 1,         // which trip this is
    day: 2,              // you lost day one to the beach
    nightTurn: 0,        // 10 turns ≈ 1 hour; the night runs 18:00–04:00
    hunger: 30,          // 0 fed … 100 collapse
    thirst: 40,          // 0 quenched … 100 collapse (you woke up dry)
    hurt: 0,             // 3 = a night in the clinic
    crashInjury: false,  // a motosai accident leaves you banged up the next night (hurt:1)
    condoms: 3,          // carried protection; consumed per barfine, buyable at any 7-Eleven
    std: null,           // {day} when contracted from an unprotected barfine; symptoms surface ~2 days on, GET TESTED clears it
    fridgeDay: 0,        // day the in-room minibar was last restocked (lazy; see _fridgeStock)
    fridgeWater: 2,      // free bottles of water left in the room fridge today (housekeeping refills 2/day)
    jaded: 0,            // the hedonic treadmill: conquests this window; each barfine/ST buys less สนุก, cools 1/day
    lastBusWarned: false, // the nightly last-baht-bus heads-up fires once per night
    bestHappy: 0,
    act1Best: 0,         // furthest point down the opening critical path ever reached; survives the do-or-die Act One reset
    act1Tries: 0,        // opening-quest attempts so far; ≥1 unlocks the round-2 HINT system (also survives the reset)
    pendingChoice: null, // "vacation_end" gates input at week's end
    bank: 100000,        // your account balance — the ATM draws pocket cash from this
    atmDay: 0,           // last day the ATM was used (pairs with atmToday for the daily cap)
    atmToday: 0,         // principal withdrawn today (resets when atmDay rolls over)
    lastPolice: -99,     // turn of the last boy-in-brown shakedown
    lastPeddler: -99,    // turn of the last bar-stool peddler visit
    lastSaleng: -99,     // turn of the last saleng (ซาเล้ง) mobile-cart visit
    salengCart: null,    // current saleng cart type ("food"|"shoes"|"lingerie"|"snacks")
    salengRoom: null,    // room the cart is parked at (a bar fixture, not modal)
    salengUntil: 0,      // turn the parked cart moves on
    salengSeen: {},      // cart type → true once the player has met that cart
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
      photos: [],        //   [{id, cap?, turn}] — the gallery (portraits you took + selfies she sent)
      picDeal: null,     //   {id, idx, ask} | {id, done} — the pay-per-photo drip
    },
    over: false,         // legacy field; the sandbox never ends the night
  };
  return G;
}

function serializeGame() { return JSON.stringify(G); }
// Restoring a save merges it over a fresh newGame() skeleton, so a field (or a
// sub-key of soc/phone/itemLoc/…) added AFTER the save was written simply keeps
// today's default — no hand-written "if (G.x === undefined)" backfill per
// feature, which is the bug class this replaces. One level deep: a plain-object
// field merges key-by-key (new items appear in itemLoc, soc gains bra, phone
// gains msgCd), everything else the save wins wholesale. Below the merge, only
// SEMANTIC migrations remain — repairs that need the save's own contents.
function deserializeGame(s) {
  const saved = JSON.parse(s);
  newGame(); // the skeleton: every current field at its current default
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  for (const [k, v] of Object.entries(saved)) {
    G[k] = (isObj(v) && isObj(G[k])) ? { ...G[k], ...v } : v;
  }
  // pre-stage saves (before the vacation sandbox): infer the stage and give the
  // body plausible mid-night meters — these depend on the save, not on defaults
  if (saved.stage === undefined) {
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
  G.visited[G.room] = true;  // wherever the save stands, you've at least been HERE
  G.over = false;            // pre-sandbox saves could be "over"; the night reopens
  if (!G.rng) G.rng = 1 + Math.floor(Math.random() * 2147483645); // a 0 seed sticks the LCG at 0
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

// Who the player chose to be in the taxi intro. Readable predicates for dialogue
// gates (when(st,G) => _isOrigin("pi")) and courtship routing. Before the intro
// runs they're null, so every check is false — a save with no identity behaves
// exactly as before.
function _isOrigin(id) { return G.player && G.player.origin === id; }
function _pers(id) { return G.player && G.player.personality === id; }
function _orient(id) { return G.player && G.player.orientation === id; }

// Pick a pool entry at random but never the one shown last (the IF "at random"
// default — pure random() clusters and droughts). `key` namespaces the one-deep
// memory so different callers don't clobber each other. Pool depth scales with
// how often the line is hit; the hottest loop actions get the deepest pools.
function _pickVary(pool, key) {
  if (!pool || pool.length < 2) return pool && pool[0];
  G._lastPick = G._lastPick || {};
  let i = Math.floor(_rand() * pool.length);
  if (i === G._lastPick[key]) i = (i + 1) % pool.length;
  G._lastPick[key] = i;
  return pool[i];
}

function _inv() {
  return Object.keys(G.itemLoc).filter(id => G.itemLoc[id] === "inventory");
}
function _here(id) { return G.itemLoc[id] === G.room; }
function _room() { return ROOMS[G.room]; }

function _isDarkHere() {
  return !!_room().dark && !(G.lightOn && G.battery > 0);
}

// Where an NPC is tonight. Most keep a fixed `room`; an owner of several bars
// carries a `bars` list and works them on alternate nights (pure function of the
// day, day-stable — unlike the hourly patron hop — so the location a player is
// pointed to stays true until dawn). This is the single source of NPC presence;
// read it, never `NPCS[id].room`, anywhere presence matters.
function _npcRoom(id) {
  const n = NPCS[id];
  if (n.bars && n.bars.length) return n.bars[G.day % n.bars.length];
  return n.room;
}

// Character-creation Phase B: the seven origin archetypes are all NPCs on Soi 6
// at once — except the one matching YOUR pick, who is deactivated because you ARE
// him. An `origin` field on an NPCS entry marks an archetype; _npcActive hides the
// chosen one from every presence/lookup path (all of which route through _npcsHere).
// Before the intro (no origin picked) everyone is active, so old saves are unchanged.
function _npcActive(id) {
  const n = NPCS[id];
  return !(n && n.origin && G.player && n.origin === G.player.origin);
}

function _npcsHere() {
  return Object.keys(NPCS).filter(id => _npcActive(id) && _npcRoom(id) === G.room);
}

// ── Hotels: where the key card works ───────────────────────────────────────
// After Act One, CHECKOUT at the start of an evening moves you. The hotel is
// your spawn point, shower, outlet, and lobby ATM — location is the amenity.
const _HOTELS = {
  // rate = vacation nightly; expatRate = the negotiated long-stay daily
  sabai:     { room: "hotel_room",     name: "Sabai Palms Hotel", rate: 400,  expatRate: 270 },
  queenvic:  { room: "qv_room",        name: "Queen Vic Inn",     rate: 700,  expatRate: 400 },
  areca:     { room: "areca_room",     name: "Areca Lodge",       rate: 900,  expatRate: 520 },
  metropole: { room: "metropole_room", name: "LK Metropole",      rate: 1300, expatRate: 730 },
};
const _HOTEL_DOWNGRADE = ["metropole", "areca", "queenvic", "sabai"];
const _DEBT_CAP = 2000;

function _hotelRate(k) {
  return G.stage === "expat" ? _HOTELS[k].expatRate : _HOTELS[k].rate;
}

// The folio slides under the door each morning. Can't cover it? The desk
// steps you down toward the Sabai Palms; broke even there, the night clerk
// adds it to the book — capped, never a spiral. The town catches people.
function _chargeRent() {
  if (!_flag("act1Done") || G.stage === "act1") return;
  if (G.hotelDebt && G.money >= G.hotelDebt + _hotelRate(G.hotel)) {
    G.money -= G.hotelDebt;
    _say(`(You settle the ฿${G.hotelDebt} on the book on your way past the desk. ` +
      "The ledger closes with real warmth.)", "dim");
    G.hotelDebt = 0;
  }
  if (G.money >= _hotelRate(G.hotel)) {
    G.money -= _hotelRate(G.hotel);
    _say(`(The folio slides under the door: ฿${_hotelRate(G.hotel)}` +
      (G.stage === "expat" ? " — the long-stay rate" : "") +
      `, the ${_HOTELS[G.hotel].name}. ฿${G.money} left.)`, "dim");
    return;
  }
  // step down toward the Sabai Palms
  let idx = _HOTEL_DOWNGRADE.indexOf(G.hotel);
  while (idx < _HOTEL_DOWNGRADE.length - 1 && G.money < _hotelRate(_HOTEL_DOWNGRADE[idx])) idx++;
  const to = _HOTEL_DOWNGRADE[idx];
  if (to !== G.hotel) {
    _say(`The ${_HOTELS[G.hotel].name} folio and your pockets have a short, frank ` +
      `exchange, and by noon your bag has made its own way to the ` +
      `${_HOTELS[to].name}. Nobody is unkind about it, which is somehow worse.`, "alert");
    G.hotel = to;
    G.room = _hotelRoomId();
  }
  const rate = _hotelRate(G.hotel);
  if (G.money >= rate) {
    G.money -= rate;
    _say(`(฿${rate} for the night. ฿${G.money} left — thin, but paid.)`, "dim");
  } else {
    G.hotelDebt = Math.min(_DEBT_CAP, G.hotelDebt + rate);
    _addHappy(-1);
    _say(`The night clerk takes in the situation and adds ฿${rate} to the book ` +
      `without a word — ฿${G.hotelDebt} on it now. His kindness is the heaviest ` +
      "thing you'll carry today.", "alert");
  }
}

function _hotelRoomId() { return _HOTELS[G.hotel].room; }
// Any hotel guest room — upstairs and behind a locked door, so no street dog,
// no soi encounter, reaches you here.
function _isHotelRoom(id) { return Object.values(_HOTELS).some(h => h.room === id); }

// ── Named patrons ──────────────────────────────────────────────────────────
// Hoppers drift to a hash-chosen bar each hour until 22:00, then settle at
// their home bar; non-hoppers never leave home. Pure function of
// (vacation, day, hour, id): same night, same hour, same stool — no state,
// no drift between LOOKs, shared-world-safe like _quizBars.
const _PATRON_HOP_ROOMS = Object.keys(ROOMS).filter(id => ROOMS[id].barType);

function _patronHour() { return Math.floor(G.nightTurn / 10); } // 0 = 18:00

function _patronRoom(id) {
  const p = PATRONS[id];
  if (p.days && !p.days.includes(G.day % 7)) return null; // not his night out
  // a shuttled regular: home bar early, escorted across to another later (Glam)
  if (p.shuttle) return _patronHour() >= p.shuttle.after ? p.shuttle.to : p.home;
  // De-hopped: regulars anchor their local, so TALK TO PATRON reliably finds a
  // real named person instead of an empty rail. (The hourly-drift machinery —
  // p.hops / p.haunts / p.avoids / _PATRON_HOP_ROOMS — is retired but left in the
  // data for now; flip this back to re-enable roaming.)
  return p.home;
}

function _patronsHere() {
  return Object.keys(PATRONS).filter(id => _patronRoom(id) === G.room);
}

function _findPatron(word) {
  const w = word.toLowerCase();
  const here = _patronsHere();
  for (const id of here) {
    if (id === w || PATRONS[id].name.toLowerCase() === w) return id;
  }
  for (const id of here) {
    if (PATRONS[id].name.toLowerCase().startsWith(w)) return id;
  }
  for (const id of here) {
    const t = PATRONS[id].title;
    if (t && !(G.known && G.known[id]) && (t.toLowerCase() === w ||
        (w.length >= 4 && t.toLowerCase().includes(w)))) return id;
  }
  return null;
}

// Same delivery contract as _deliver, but the seen-index book resets daily —
// a patron's stories are new again every night, which is very true to life.
// Persistent per-character conversation state — the small state machine behind a
// dialogue tree: how far the relationship's got (dstate), how much they'll open
// up (trust), how they're feeling (mood), and what they've told you (know). Nodes
// gate on it via `when(st, G)` and mutate it via `fx(st, G)`; both optional, so
// any dialogue entry that doesn't use them behaves exactly as before. Plain data,
// so it serialises with the save.
function _npcState(id) {
  return G.npc[id] || (G.npc[id] = { trust: 0, mood: "guarded", dstate: "stranger", know: {}, heard: {} });
}

// ── Active conversation context ──────────────────────────────────────────────
// A sticky "who am I talking to" pointer so the player can speak in bare topics
// and social actions without re-naming the partner each line ("90s" → ASK ANGELA
// ABOUT 90s; see _convoResolve). It rides the save like any G field, but every
// READ goes through _convoActive, which re-checks the partner is still in the
// room — so walking away, them leaving, or a barfine silently ends it. The
// parser layer that consumes this lives in engine-parser.js.
function _convoStart(id) { if (id) { G.convo = id; G.itNpc = id; if (G.known) G.known[id] = true; } } // talking to someone IS meeting them → you learn the name
function _convoName(id) {
  return (NPCS[id] && NPCS[id].name) || (PATRONS[id] && PATRONS[id].name) || id;
}
function _convoActive() {
  const id = G.convo;
  if (!id) return null;
  const here = (NPCS[id] && _npcRoom(id) === G.room) ||
               (PATRONS[id] && _patronsHere().includes(id));
  if (!here) { G.convo = null; G.convoQ = null; return null; } // partner gone → conversation (and any pending question) over
  return id;
}
function _convoEnd(quiet) {
  const id = G.convo;
  G.convo = null;
  G.convoQ = null;
  G.convoIdx = null;
  if (id && !quiet) _say(`You take your leave of ${_convoName(id)}.`, "dim");
}
// Pull-away interrupt: the NPC or the player is yanked out of the conversation
// (kickout, barfine, an encounter, night-end, the NPC bolting to a saleng cart).
// Silent by design — the pulling event narrates itself. Ambient events that touch
// neither party (rain, a saleng merely parking) must NOT call this.
function _convoInterrupt() { if (G.convo) _convoEnd(true); }

// The live action-choices: the `choices` on the partner's last-delivered node,
// filtered by any per-choice `when(st,G)` gate. Serializable — we store only the
// node index (G.convoIdx), never the choice objects (they carry fx functions).
// Schema: { label, text?, when?, sets?, fx?, topic? } — picking one applies its
// effects and prints text, then either jumps to `topic` or clears (see _runChoice).
function _convoChoices() {
  const id = _convoActive();
  if (id == null || G.convoIdx == null) return [];
  const arr = ((NPCS[id] || PATRONS[id] || {}).dialogue) || [];
  const d = arr[G.convoIdx];
  if (!d || !d.choices) return [];
  const st = _npcState(id);
  return d.choices.filter(c => !c.when || c.when(st, G));
}

// The other half of a conversation: the partner puts a question to YOU. A
// dialogue node carries `asks: {key, q}`; after it's delivered, we pose the
// question once (q printed if the node's text didn't already contain it) and
// arm G.convoQ so the next plain reply is captured (see _convoAnswer). Asked at
// most once per key per partner — no nagging.
function _convoAsk(id, d, st) {
  if (!d || !d.asks) return;
  const key = d.asks.key;
  st.know = st.know || {};
  if (st.know["asked_" + key]) return;
  st.know["asked_" + key] = true;
  if (d.asks.q) _say(d.asks.q);
  G.convoQ = { id, key };
}

// The callback half of the ask loop: a delivered line can quote back what the
// player told the town about themselves via a %key% token (e.g. "%home%. Still
// there?"). Only keys actually in G.player.said are filled — anything else is
// left untouched — and callback nodes gate on the value being known, so a token
// never shows raw. Title-cased for display.
function _fillSaid(s) {
  if (typeof s !== "string" || !(G.player && G.player.said)) return s;
  return s.replace(/%(\w+)%/g, (m, k) =>
    G.player.said[k] != null
      ? String(G.player.said[k]).replace(/\b\w/g, c => c.toUpperCase())
      : m);
}

// ── Scope & pronoun resolution ───────────────────────────────────────────────
// The Inform-style "it"/default-object idea, borrowed (not the NLP library that
// prompted it): bind a pronoun (her/him/them/it) or a bare/omitted target to who
// the player most obviously means. Antecedent order: the active conversation
// partner, then the last person we addressed (if still in scope), then — the
// disambiguation-by-uniqueness rule _doSocial/_doWai already used — the sole
// person in scope. Returns an id, or null when genuinely ambiguous (caller then
// asks "who do you mean?"). `pool` restricts the domain (social → girls only).
const _PRONOUN = /^(her|him|them|they|she|he|it|this|that|the (girl|lady|guy|man|bloke|woman|one))$/;
function _addressable() { return [..._npcsHere(), ..._patronsHere()]; }
function _lastActor() {
  const c = _convoActive();
  if (c) return c;
  if (G.itNpc && _addressable().includes(G.itNpc)) return G.itNpc;
  return null;
}
function _noteActor(id) { if (id) G.itNpc = id; } // remember, for the next pronoun
function _resolveActor(word, pool) {
  pool = pool || _addressable();
  const w = String(word || "").replace(/^with /, "").trim().toLowerCase();
  if (w && !_PRONOUN.test(w)) {                 // an actual name/word
    const id = _findNpc(w) || _findPatron(w);
    return pool.includes(id) ? id : null;
  }
  const ante = _lastActor();                    // pronoun or omitted → antecedent
  if (ante && pool.includes(ante)) return ante;
  return pool.length === 1 ? pool[0] : null;    // else the only candidate, if unambiguous
}

// The topics currently OPEN with a partner: their dialogue nodes whose gates
// (req/notFlags/bond/when) pass right now, in authored order, deduped. Mirrors
// the gate checks in _pickDialogue / _patronTalk, so the chip palette only ever
// offers what the partner would actually answer — which gives progressive reveal
// for free (a topic appears the moment its node unlocks on trust/flag). Sore
// subjects that would set a patron off (rage) are withheld — no rage-bait chips.
// A topic that's really another character's name (gossip / a cross-reference) —
// e.g. Angela's 'drew'. You ask about a person when you have a reason to, not
// off a chip suggestion, so these stay off the palette (a node can force one on
// with chip:true). Everything here is still typeable.
function _topicNamesCharacter(topic, partnerId) {
  const t = topic.toLowerCase();
  const hit = (map) => Object.keys(map).some(cid =>
    cid !== partnerId && (cid === t || (map[cid].name && map[cid].name.toLowerCase() === t)));
  return hit(NPCS) || hit(PATRONS);
}
function _convoTopics(id) {
  const st = _npcState(id);
  const p = PATRONS[id], n = NPCS[id];
  const nodes = (n && n.dialogue) || (p && p.dialogue) || [];
  const rage = (p && p.rage) || [];
  const out = [];
  for (const d of nodes) {
    if (!d.topic) continue;
    if (d.deflect) continue;              // a gated "come back when you've earned it" refusal — don't offer it as a chip
    if (d.chip === false) continue;       // a plot/quest node the quest flow drives — typeable, never suggested
    if (!d.chip && _topicNamesCharacter(d.topic, id)) continue; // gossip about a person — typeable, not suggested
    if (rage.some(k => d.topic.includes(k))) continue;
    if (d.req && d.req.some(f => !_flag(f))) continue;
    if (d.notFlags && d.notFlags.some(f => _flag(f))) continue;
    if (d.bond && n && _bondTier(id) < d.bond) continue;
    if (d.when && !d.when(st, G)) continue;
    if (!out.includes(d.topic)) out.push(d.topic);
  }
  return out;
}

// Faction standing with the powers of the night — WDG (Ryan Powers' Soi 6 rollup),
// samson (the brothers' Jomtien/Pratumnak takeover), indie (Bert & the holdouts),
// syndicate (the unnamed Thai muscle behind the envelopes). Standing only moves
// when the player ACTS on a faction (takes a job to its end, throws real weight
// behind it) — never for declining or ignoring. Staying out of the politics
// costs nothing, forever. Dialogue reads it via `when`; nodes move it via `_align`.
function _faction(name) { return (G.faction && G.faction[name]) || 0; }
function _align(name, delta) {
  if (!G.faction) G.faction = { wdg: 0, samson: 0, indie: 0, syndicate: 0 };
  G.faction[name] = Math.max(-5, Math.min(5, (G.faction[name] || 0) + delta));
}

function _patronTalk(id, topic) {
  if (G.patronTalk.day !== G.day) G.patronTalk = { day: G.day, talked: {} };
  _convoStart(id); // engaging a regular makes him the active conversation partner
  const p = PATRONS[id];
  const st = _npcState(id);
  // some regulars have a sore subject that turns them belligerent (Fergie: Bert,
  // Candy, their bars). On his nasty nights it turns into a swing.
  if (topic && p.rage && p.rage.some(k => topic.includes(k))) { _patronRage(id); return; }
  let d = null;
  for (const e of p.dialogue) {
    if (topic ? e.topic !== topic && !(e.topic && topic.includes(e.topic)) : e.topic) continue;
    if (e.when && !e.when(st, G)) continue; // state-machine condition: skip nodes whose state gate fails
    d = e;
    break;
  }
  if (!d) {
    if (topic) { _patronTalk(id, null); return; }
    _say(`${p.name} has said his piece for now.`);
    return;
  }
  const idx = p.dialogue.indexOf(d);
  const seen = G.patronTalk.talked[id] || (G.patronTalk.talked[id] = []);
  const repeat = seen.includes(idx);
  if (!repeat) seen.push(idx);
  // Same consistency as the NPCs: a repeat is the `short` gist, or a grizzled-
  // regular brush-off, so you never get the whole war story twice. Patron
  // dialogue is mostly pure flavour, but entries may carry `sets` (quest wiring
  // — Glam's lucid flashes) exactly like NPC dialogue; no `gives`, though.
  _say(_fillSaid(repeat ? (d.short || _patronAgain(id)) : d.text));
  if (d.sets) d.sets.forEach(f => _setFlag(f));
  if (!repeat && d.fx) d.fx(st, G); // state-machine effects, first delivery only (no farming trust by re-asking)
  // first contact IS the meeting — advance state + grant baseline trust here
  if (st.dstate === "stranger") { st.dstate = "met"; st.trust = Math.min(5, st.trust + 1); }
  _convoAsk(id, d, st); // …and the regular may put a question back to you
}

// A belligerent regular's sore subject. Whether it turns into a swing depends on
// his nightly state — the nights he's on the weed, the drunk turns nasty (a
// stable per-night hash, so it's the same all evening).
function _patronRage(id) {
  const name = PATRONS[id].name;
  // is he on the weed tonight? (~40% of nights). Mix the day through a big prime —
  // a bare _hh of consecutive day strings correlates in its low bits.
  let h = (G.vacation * 7919 + G.day * 104729 + 149) % 2147483647;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
  const nasty = ((h * 48271) % 2147483647) % 100 < 40;
  if (nasty) {
    _say(`You bring up the wrong name, and something behind ${name}'s eyes just closes. ` +
      "“...the HELL did you say to me?” He's off the stool and swinging before it lands — wild, " +
      "drunk, but a lifetime of car-park brawls in it. Hands haul him back; security and a piwin " +
      "fold him down like a deckchair while he roars Belfast at the ceiling. You come away with a " +
      "rung ear, a thumping heart, and a room full of people who'd very much rather you hadn't.", "alert");
    G.hurt = Math.min(3, G.hurt + 1);
    _addHeat(1);
    return;
  }
  _say(`You bring up Bert — or Candy, or their bars — and ${name} goes very still, then very ` +
    "quiet. “We don't talk about that. Or them. Not with me.” The flat calm is worse than " +
    "shouting; the knuckles round the bottle have gone white. “Drink up somewhere else, son.” " +
    "(Leave it — some night soon he won't be this sober.)", "alert");
}

// The rail regular's version of "you asked me that" — a male-expat grumble to
// the NPCs' fond soi brush-off (_askAgain).
const _PATRON_AGAIN = [
  n => `${n} gives you a flat look over the Chang. “Already told you that one, mate.”`,
  n => `“You asked me that,” ${n} says. “Memory like a goldfish. Get a round in and I might go again.”`,
  n => `${n} waves a hand. “Same story, same ending. Ask me something I haven't done to death.”`,
];
function _patronAgain(id) {
  return _PATRON_AGAIN[Math.floor(_rand() * _PATRON_AGAIN.length)](PATRONS[id].name);
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
  // a descriptive title before you know the name ("the manager" → bert). Only
  // while unknown; once known, the name paths above already catch them.
  for (const id of here) {
    const t = NPCS[id].title;
    if (t && !(G.known && G.known[id]) && (t.toLowerCase() === w ||
        (w.length >= 4 && t.toLowerCase().includes(w)))) return id;
  }
  return null;
}

// Descriptive-title-until-known: a character you haven't met shows their `title`
// (a look, not a name) in the world; once you know them — talked to them, took
// their photo, or someone named them (G.known) — the name. Opt-in: a character
// with no `title` always shows their name, so the roster converts over gradually
// and untitled NPCs are completely unaffected.
function _npcLabel(id) {
  const n = NPCS[id]; if (!n) return id;
  return (n.title && !(G.known && G.known[id])) ? n.title : n.name;
}
function _patronLabel(id) {
  const p = PATRONS[id]; if (!p) return id;
  return (p.title && !(G.known && G.known[id])) ? p.title : p.name;
}

// A named character the player addressed who isn't in THIS room — used to turn a
// flat "Nobody by that name here" (reads as a bug mid-conversation) into a placed
// answer. Patrons hop bars every hour, so promising a location would go stale by
// the time you got there — they get the generic "regulars drift about" line.
// Named NPCs keep a day-stable bar (Candy at Candy Bar today; when NPCs gain
// schedules — alternate-day bars, invited visits — NPCS[id].room still resolves
// to tonight's room), so point the player there. Anonymous staff (lowercase
// names) and not-yet-met characters stay a plain deny — no spoiling a place you
// were never shown.
function _elsewhereLine(word) {
  const w = String(word).toLowerCase().trim();
  if (!w) return null;
  // "this bar" only reads right when you're actually in one — you can address an
  // NPC from the beach or the street too.
  const here = _room();
  const notHere = here.bar || here.barType ? "isn't at this bar" : "isn't around here";
  const pid = Object.keys(PATRONS).find(id =>
    id === w || PATRONS[id].name.toLowerCase() === w);
  if (pid) return `${PATRONS[pid].name} ${notHere} right now — the regulars ` +
    "drift between bars through the night, and not every one of them comes out every evening.";
  const nid = Object.keys(NPCS).find(id => {
    const nm = NPCS[id].name;
    if (!/^[A-Z]/.test(nm) || !(G.known && G.known[id])) return false;
    return id === w || nm.toLowerCase() === w || nm.toLowerCase().split(" ").pop() === w;
  });
  if (nid) {
    const cur = _npcRoom(nid);
    // Point the player to her only when she's at one of HER OWN bars (a
    // multi-bar owner alternating nights). If she's somewhere else — an invited
    // visit elsewhere, once that exists — don't reveal it; just say she's out.
    const own = NPCS[nid].bars ? NPCS[nid].bars.includes(cur) : true;
    if (own && _barName(cur)) {
      return `${NPCS[nid].name} ${notHere} tonight — try ${_barName(cur)}.`;
    }
    return `${NPCS[nid].name} isn't here right now.`;
  }
  return null;
}

// First dialogue entry whose req/notFlags fit; topic filters "ask about".
// An unknown/locked topic falls back to the NPC's default (topicless) line —
// classic adventure behaviour: they answer with whatever they always say.
function _pickDialogue(npcId, topic) {
  const n = NPCS[npcId];
  const st = _npcState(npcId); // conversation state machine — see _npcState
  for (const d of n.dialogue) {
    if (topic ? d.topic !== topic && !(d.topic && topic.includes(d.topic)) : d.topic) continue;
    if ((d.req || []).some(f => !_flag(f))) continue;
    if ((d.notFlags || []).some(f => _flag(f))) continue;
    if (d.bond && _bondTier(npcId) < d.bond) continue; // a warmer line only a regular unlocks (The Regular)
    if (d.when && !d.when(st, G)) continue;            // state-machine condition (trust/mood/dstate/know)
    return d;
  }
  return topic ? _pickDialogue(npcId, null) : null;
}

// Generic "you asked that already" brush-offs, voiced as the soi's fond
// exasperation — the terse repeat for a pure-flavour line the writer never gave
// a `short`. Gender-neutral (no she/he), so any NPC can deliver one.
const _ASK_AGAIN = [
  n => `“Aiyah, you ask me that already,” ${n} says, half a laugh. “Same answer, na. Farang memory.”`,
  n => `${n} waves you off, fond. “You forget so fast? Buy a drink — maybe it come back.”`,
  n => `“Same-same,” ${n} says. “You already ask me this. We talk something new, or you talk to the wall.”`,
  n => `${n} gives you the look reserved for farang who repeat themselves. “Told you already, tilac.”`,
];
function _askAgain(npcId) {
  return _ASK_AGAIN[Math.floor(_rand() * _ASK_AGAIN.length)](NPCS[npcId].name);
}

function _deliver(npcId, d) {
  const n = NPCS[npcId];
  // Second time you hear a line, get the point, not the whole spiel. We track
  // which entries an NPC has delivered (by index) and, on a repeat, swap in the
  // entry's `short` gist and skip the Thai flourish. With no `short`, a pure
  // flavour line (no gives/sets payload) gets a generic brush-off so EVERY
  // repeat is terse — but a quest/clue entry that carries something re-readable
  // still repeats in full, so a player who forgot an instruction can re-read it.
  const idx = n.dialogue.indexOf(d);
  const seen = G.talked[npcId] || (G.talked[npcId] = []);
  const repeat = seen.includes(idx);
  const flavor = !d.gives && !(d.sets && d.sets.length);
  const terse = repeat && (!!d.short || flavor);
  if (!repeat) seen.push(idx);
  if (d.th && !terse) { _say(`${n.emoji} ${n.name}: “${d.th}” (${d.rom})`, "thai"); _engineSpeak(d.th); }
  _say(_fillSaid(terse ? (d.short || _askAgain(npcId)) : d.text));
  for (const f of d.sets || []) _setFlag(f);
  if (d.gives && G.itemLoc[d.gives] === null) {
    G.itemLoc[d.gives] = "inventory";
    _say(`(You now have the ${ITEMS[d.gives].name}.)`, "dim");
    if (d.gives === "wallet") {
      G.money += 500;
      _say("(Most of the cash is still in it — ฿500 back in play.)", "dim");
    }
  }
  const st = _npcState(npcId);
  if (!repeat && d.fx) d.fx(st, G);           // state-machine effects, first delivery only
  // first contact (any exchange) IS the meeting: advance the state and grant the
  // baseline trust here, so the meeting bonus never depends on which node fired.
  if (st.dstate === "stranger") { st.dstate = "met"; st.trust = Math.min(5, st.trust + 1); }
  // this node is now the live one — its `choices` (if any) become the action-choices
  G.convoIdx = G.convo === npcId ? idx : G.convoIdx;
  _convoAsk(npcId, d, st);                     // …and the partner may put a question back to you
}

// ── Look / describe ────────────────────────────────────────────────────────

// The buildings you can ENTER off this block. A migrated road node lists them
// explicitly in `venues`; an un-migrated one still hangs its bars on compass
// exits, so fall back to scanning those (identical to the old "Step inside"
// behaviour) until every district has been moved over.
function _venuesHere(r) {
  if (r.venues) return r.venues;
  const out = [];
  for (const to of Object.values(r.exits || {}))
    if (ROOMS[to] && ROOMS[to].bar && !out.includes(to)) out.push(to); // one bar, one listing
  return out;
}

function _describeRoom(full, forceFull) {
  const r = _room();
  const firstTime = !G.visited[G.room]; // full desc on first arrival + LOOK; brief ambient on revisit
  G.visited[G.room] = true; // standing in it is how places join the fast-travel list
  // Candy's recce quest: eyes on all three new drinking strips completes it
  // (flag is cheap and idempotent; _questTick only pays while the quest is active)
  if (G.visited.myth_rows && G.visited.tt_lane_3 && G.visited.soi6_mid) _setFlag("recceDone");
  // A downpour re-announces itself every time the room is described (LOOK, an
  // arrival, and crucially a restored save) — otherwise a reload mid-rain paints
  // a dry, walkable street and the movement block that follows reads as a bug.
  const raining = G.rain > 0;
  if (_isDarkHere()) {
    _say(`${r.name}`, "room");
    _say(raining
      ? "Pitch dark, and rain sheeting down through it — at least the weather keeps " +
        "the soi dogs kennelled. Your phone's flashlight would still help."
      : "It is pitch dark. If your phone has any battery left, its flashlight " +
        "would help. Sois this dark tend to have soi dogs in them.", "alert");
    return;
  }
  _say(r.name, "room");
  if (raining) {
    _say(_sheltered(G.room)
      ? "Rain hammers the roof — a proper rainy-season downpour outside, and nobody's " +
        "stepping into that until it eases."
      : "Rain is coming down in sheets; the awning overhead is the whole habitable " +
        "world until it passes.", "alert");
  }
  // brief-on-revisit (IF verbose/brief): a rotating ambient line instead of the
  // full desc when you're just walking back through a place you've already read.
  // Opt-in per room via `revisit`; LOOK and boot/restore force the full desc.
  if (full) _say(!firstTime && !forceFull && r.revisit ? _pickVary(r.revisit, "rv:" + G.room) : r.desc);
  const items = Object.keys(G.itemLoc).filter(id => _here(id));
  if (items.length) _say("You can see: " + items.map(id => ITEMS[id].name).join(", ") + ".");
  const npcs = _npcsHere();
  if (npcs.length) _say("Here: " + npcs.map(id => `${NPCS[id].emoji} ${_npcLabel(id)}`).join(", ") + ".");
  // Butterfly the dog: the girls dote on him at the door — a warmer welcome, once a night
  if (full && G.dog && G.dog.egg === "butterfly" && _inBar() &&
      npcs.some(id => NPC_ROLES[id]) && G.dog.btfDay !== G.day) {
    G.dog.btfDay = G.day;
    _addHappy(1);
    _say(_dogN("The girls clock Butterfly parked loyally at the door and melt — “aw, your dog, so " +
      "handsome na!” — and the welcome that lands on you runs a few degrees warmer than your face has earned."), "dim");
  }
  // A bar owner who alternates nights between her rooms: when this is one of her
  // bars but she's working the other one tonight, say so — otherwise the room
  // reads as hers with no sign of her.
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.bars && n.bars.includes(G.room) && _npcRoom(id) !== G.room) {
      _say(`${n.name} is working ${_barName(_npcRoom(id))} tonight; the floor staff keep this one running.`, "dim");
    }
  }
  const pats = _patronsHere();
  if (pats.length) {
    _say("At the rail: " + pats.map(id => {
      const p = PATRONS[id];
      // a titled patron you haven't met shows the look; otherwise the old
      // Name (age, nat) — so untitled patrons are unchanged.
      return (p.title && !(G.known && G.known[id]))
        ? `${p.emoji} ${p.title}`
        : `${p.emoji} ${p.name} (${p.age}, ${p.nat})`;
    }).join(", ") + ".");
  }
  const exits = Object.keys(r.exits);
  if (exits.length) _say("Exits: " + exits.join(", ") + ".", "dim");
  // Buildings fronting this block: entered by name or a tap, not by a compass
  // point (a busy soi can front 4–6 of them, and a door isn't a block away —
  // it's right here). "Exits" is roads only now; the venues list is the doors.
  const venues = _venuesHere(r);
  if (venues.length) {
    _say("Step inside: " + venues.map(id =>
      (ROOMS[id].bar || ROOMS[id].name).replace(/\s*\(.*\)$/, "")).join(", ") +
      ". (ENTER <name>)", "dim");
  }
  // the dog: at your heel outside; through the rail and under your stool in the
  // open-air beer bars (no door to stop him, and nobody would dream of it); by
  // the door everywhere else (dogs know the one rule and keep it better than
  // most customers)
  if (G.dog) {
    if (r.barType === "beer") {
      _say(_dogN("(Sai Krok trots in under the rail — no door to stop him — and folds up " +
        "beneath your stool.)"), "dim");
      _dogBarFavor();
    } else if (r.bar || r.barType || r.massage || r.soapy || r.hostBar) {
      _say(_dogN("(Sai Krok folds up outside the door, chin on paws, one ear on the room.)"), "dim");
    } else {
      _say(_dogN("Sai Krok pads at your heel, nose reading the street."), "dim");
    }
    if (G.room === "khao_talo_strip") _dogShamrock(); // the dead pub knows him
  } else if (_flag("act1Done") && !r.bar && !r.barType && !r.massage && !r.soapy &&
      !r.hostBar && !_isHotelRoom(G.room) && !_isDarkHere() && G.dogNudgeDay !== G.day && _rand() < 0.35) {
    // the un-adopted dog makes himself known: at most once a night, lit streets
    // only (never a hotel room — he can't climb to your balcony), and never
    // during Act One's tight opening
    G.dogNudgeDay = G.day;
    _say("A soi dog with one clipped ear falls in beside you for half a block, matching " +
      "your pace with off-duty professionalism, then peels away at the soi mouth with " +
      "one look back. (FEED DOG, if you'd like that to go differently.)", "dim");
  }
  // CAPS so the hints tap: the open kw prefills "ride bus to " and the
  // destination list rides the suggest bar — the whole fare is keyboard-free.
  if (r.busStop) _say("A baht bus can be caught here. (RIDE BUS TO <place>)", "dim");
  if (r.motosai) _say("A motosai stand is here. (MOTOSAI TO <place>)", "dim");
  if (r.atm) _say("An ATM stands against the wall. (WITHDRAW <amount> · CHECK BALANCE)", "dim");
  if (r.barType === "beer" || r.barType === "soi6") {
    _say("A Connect 4 frame and a Jackpot dice box sit within reach (PLAY …).", "dim");
  }
  if (r.barType === "gents") {
    _say("The couches along the wall have their curtains half-drawn; you are careful " +
      "where your eyes land. Buy a lady a drink and she'll settle in very close.", "dim");
  }
  if (r.massage === "legit") {
    _say("Reclining chairs, tiger balm, a price list on the wall. (MASSAGE — foot, Thai, or oil, " +
      "the one honest kind in town.)", "dim");
  } else if (r.massage === "oil") {
    _say("Curtained cubicles, a wall of mirrors, a small NO SEX sticker nobody quite believes. " +
      "(MASSAGE — then SPECIAL, up to you.)", "dim");
  }
  if (r.soapy) {
    _say("A wall of bright one-way glass, and behind it numbered girls on tiered benches. " +
      "(SOAPY to pick a number.)", "dim");
  }
  if (G.room === "hyper") {
    if (_flag("hyperUpstairs"))
      _say("(You know the back stair now — barfine a girl SHORT TIME and go UP, no take-out.)", "dim");
    else if (_bondTier("diamond") >= 2)
      _say("(Diamond has warmed to you — there's more to Hyper than the stage. ASK her ABOUT UPSTAIRS.)", "dim");
  }
  if (r.pool) {
    _say("A pool table waits under a low lamp (PLAY POOL)." +
      (_leagueTonight() ? " Tonight is LEAGUE NIGHT (PLAY KILLER, ฿100 in the ashtray)." : ""), "dim");
  }
  if (r.seven) _say("A 7-Eleven glows across the way (BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM).", "dim");
  if (_quizDay() && !r.barType) {
    const near = Object.values(r.exits).filter(to => _quizBars().includes(to));
    if (near.length && G.nightTurn < 40) {
      _say(near.map(_barName).join(" and ") +
        (near.length > 1 ? " have" : " has") + " a chalkboard out: QUIZ NIGHT " +
        "TONIGHT 8-10 — PRIZES. " +
        (G.nightTurn >= 20 ? "It's on right now; walk in and you're playing." :
          "Starts at 20:00; walk in during and you're playing."), "dim");
    }
  }
  if (_bandHere()) {
    const isBar = !!r.barType;
    _say("A live band is playing tonight." +
      (isBar ? " (DANCE · SING · REQUEST <song> · TIP BAND · BUY ROUND FOR BAND)" :
               " (DANCE · SING · REQUEST <song> · TIP BAND)"), "dim");
  }
  if (_salengHere()) { // a parked cart re-announces itself so a reload isn't blind to it
    const c = _SALENG_CARTS[G.salengCart];
    _say(c.here + " " + c.hint, "dim");
  }
  if (r.barType) {
    const girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess");
    _say(G.soc.patronBusy[G.room] ?
      "A sunburnt regular holds court at the far end" +
      (girl ? `, with ${NPCS[girl].name}'s full attention` : "") + "." :
      "A regular nurses a big Chang at the rail, radiating opinions.", "dim");
  }
  // The two junction bars look out on the evening's two free shows: the police
  // checkpoint down the road just south of the soi, and the bay sunset.
  if ((G.room === "blue_dog" || G.room === "stinky_bar") && _shakedownOn()) {
    _say("Down the road, just south of the soi, the evening checkpoint is in session: " +
      "officers waving over every bare-headed farang on a motorbike with the bored " +
      "precision of toll collectors. Half the rail is a regular who ducked in here to " +
      "dodge exactly that. (WATCH POLICE — or WATCH SUNSET, the bay's going gold too.)", "dim");
  }
  if (G.soc.lockIn && G.soc.lockIn[G.room]) {
    _say("The front door is bolted and the windows were always black. Inside is " +
      "the only place the night still exists, and it is making the most of the " +
      "fact. (OUT gets you unbolted — one way.)", "dim");
  }
  if (G.room === "police_station" && G.tonicOwed > 0) {
    _say(`You are still out ฿${G.tonicOwed} to the hair-tonic shop. (REPORT it here — ` +
      "for what that's worth.)", "dim");
  }
  if (G.room === "police_station" && G.curseOwed > 0) {
    _say(`You are still out ฿${G.curseOwed} to the beach fortune-teller. (REPORT it ` +
      "here to claw most of it back.)", "dim");
  }
  // Nok buys glass — say so, tappably, whenever you're holding some near her.
  // Act 1's first earner had no on-screen tap path (HELP only).
  if (_npcsHere().includes("nok") &&
      Object.keys(G.itemLoc).some(id => id.startsWith("bottle") && G.itemLoc[id] === "inventory")) {
    _say("Auntie Nok has clocked the glass you're carrying — she pays coin for " +
      "empties. (SELL BOTTLES)", "dim");
  }
}

// ── Turn bookkeeping: battery, darkness, soi dogs ──────────────────────────

function _tick() {
  G.turns++;
  G.nightTurn++;
  // a torch still burning in a go-go escalates; `mark` spends this command's
  // entry/toggle warning so one command never counts twice
  if (G.lightWarn.mark) G.lightWarn.mark = false;
  else if (G.lightOn && G.battery > 0 && _room().barType === "gogo") _gogoLightWarn();
  // the body keeps its own books
  if (G.nightTurn % 20 === 0 && G.soc.drunk > 0) G.soc.drunk--;
  if (G.nightTurn % 3 === 0) G.hunger++;
  if (G.nightTurn % 2 === 0) G.thirst++;
  if (G.hunger === 70) _say("(Your stomach growls loudly enough to turn heads. Eat something.)", "alert");
  if (G.thirst === 70) _say("(Your throat is sandpaper. Drink something — ideally water.)", "alert");
  if (G.hunger === 90) _say("(You are running on fumes. Food. Now.)", "alert");
  if (G.thirst === 90) _say("(Dizzy. The neon is doing things it shouldn't. WATER.)", "alert");
  if ((G.hunger >= 80 || G.thirst >= 80) && G.nightTurn % 10 === 0) {
    _addHappy(-1, G.thirst >= G.hunger ? "you're parched" : "you're starving");
  }
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
    _encPrompt(
      ["A peddler drifts in off the street with a display board of watches, a fan " +
        "of sunglasses, and — produced from an inner pocket with a meaningful eyebrow " +
        "— certain 'vitamins'. He stations himself at your elbow, patient as weather.", "alert"],
      ["(WATCH ฿300 · SUNGLASSES ฿150 · VITAMINS ฿200 · or NO.)", "dim"]);
  }
  // the ซาเล้ง (mobile bar cart) — a fixture for the girls, not a modal gate:
  // it parks at the bar for a while, the girls swarm it, and the player may buy
  // any time before it moves on. All of that lives in _salengTick (encounters).
  _salengTick();
  _closingTick(); // midnight: gents/Soi 6/Darkside give last call, then bolt or shutter
  _lastBusWarn();  // ~01:30: heads-up that the last ฿15 ride home is about to leave
  _maybeIncomingText();
  _soidogTick();   // the day after you adopt the soi dog, the Foundation texts for a donation
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
    // your own soi dog outranks the local franchise: the dark sois go quiet
    if (G.dog) {
      if (G.darkStreak === 0) {
        _say(_dogN("A growl starts somewhere in the dark ahead — and Sai Krok answers it, " +
          "once, low, without breaking stride. Silence. The dark has done the maths."), "dim");
      }
      G.darkStreak = 1; // held, never escalates
      return;
    }
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

