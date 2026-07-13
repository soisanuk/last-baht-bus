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
function _say(text, cls) { _learnNames(text); _enginePrint(text, cls || ""); }

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
    qvDay: 0,            // last day the Queen Vic balcony paid its happy point
    patronTalk: { day: 0, talked: {} }, // patron dialogue book, reset daily
    turns: 0,
    wingmanUntil: 0,     // G.turns before which a wing-woman is vouching for you
    darkStreak: 0,
    flags: {},
    known: {},           // charId → true once their name has printed (ask-topic gate)
    visited: { jomtien_beach: true }, // roomId → true once stood in (fast-travel gate)
    talked: {},          // npcId → [dialogue indices already delivered] (terse repeats)
    itemLoc: Object.fromEntries(
      Object.entries(ITEMS).map(([id, it]) => [id, it.location])),
    safeTries: 0,
    pendingFare: null,   // { kind:"bus"|"moto", price, dest } awaiting `pay`
    pendingEnc: null,    // encounter id awaiting the player's snap reaction
    encPrompt: null,     // [[text, cls], …] of the pending encounter's prompt, so a restore can redraw it
    game: null,          // live bar mini-game state (connect 4 / jackpot / pool)
    soc: {               // bar social ledger
      drinks: {},        //   npcId → lady drinks bought tonight
      mamaTreat: {},     //   roomId → true (the mamasan drank on you here)
      bellAt: {},        //   roomId → turn of the last bell ring (the glow)
      bells: {},         //   roomId → rings tonight; while the glow holds, 2 softens the rules, 3 = the room is yours
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
  if (G.encPrompt === undefined) G.encPrompt = null;
  if (G.game === undefined) G.game = null;
  if (!G.lightWarn) G.lightWarn = { room: null, n: 0, mark: false };
  if (!G.known) G.known = {};
  if (!G.visited) G.visited = { [G.room]: true };
  if (G.blueDogDay === undefined) G.blueDogDay = 0;
  if (!G.hotel) G.hotel = "sabai";
  if (G.hotelDebt === undefined) G.hotelDebt = 0;
  if (G.qvDay === undefined) G.qvDay = 0;
  if (!G.patronTalk) G.patronTalk = { day: 0, talked: {} };
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
  if (G.lastSaleng === undefined) { G.lastSaleng = -99; G.salengCart = null; }
  if (G.salengRoom === undefined) { G.salengRoom = null; G.salengUntil = 0; G.salengSeen = {}; }
  if (!G.quizPlayed) G.quizPlayed = {};
  if (!G.talked) G.talked = {};
  if (G.soc && !G.soc.bra) G.soc.bra = {};
  if (G.wingmanUntil === undefined) G.wingmanUntil = 0;
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

function _npcsHere() {
  return Object.keys(NPCS).filter(id => _npcRoom(id) === G.room);
}

// ── Hotels: where the key card works ───────────────────────────────────────
// After Act One, CHECKOUT at the start of an evening moves you. The hotel is
// your spawn point, shower, outlet, and lobby ATM — location is the amenity.
const _HOTELS = {
  // rate = vacation nightly; expatRate = the negotiated long-stay daily
  sabai:     { room: "hotel_room",     name: "Sabai Palms Hotel", rate: 400,  expatRate: 270 },
  queenvic:  { room: "qv_room",        name: "Queen Vic Inn",     rate: 700,  expatRate: 400 },
  metropole: { room: "metropole_room", name: "LK Metropole",      rate: 1300, expatRate: 730 },
};
const _HOTEL_DOWNGRADE = ["metropole", "queenvic", "sabai"];
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
  if (!p.hops || _patronHour() >= 4) return p.home; // by 22:00 everyone's home
  let h = G.vacation * 7919 + G.day * 104729 + _patronHour() * 48271 + 1;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
  h = (h * 48271) % 2147483647;
  // some patrons have bars they will not set foot in (creditors, history)
  let i = h % _PATRON_HOP_ROOMS.length;
  while (p.avoids && p.avoids.includes(_PATRON_HOP_ROOMS[i])) {
    i = (i + 1) % _PATRON_HOP_ROOMS.length;
  }
  return _PATRON_HOP_ROOMS[i];
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
  return null;
}

// Same delivery contract as _deliver, but the seen-index book resets daily —
// a patron's stories are new again every night, which is very true to life.
function _patronTalk(id, topic) {
  if (G.patronTalk.day !== G.day) G.patronTalk = { day: G.day, talked: {} };
  const p = PATRONS[id];
  let d = null;
  for (const e of p.dialogue) {
    if (topic ? e.topic !== topic && !(e.topic && topic.includes(e.topic)) : e.topic) continue;
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
  // Same consistency as the NPCs: a repeat is the `short` gist, or — patron
  // dialogue being pure flavour (no gives/sets anywhere) — a grizzled-regular
  // brush-off, so you never get the whole war story twice.
  _say(repeat ? (d.short || _patronAgain(id)) : d.text);
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
  return null;
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
  const pid = Object.keys(PATRONS).find(id =>
    id === w || PATRONS[id].name.toLowerCase() === w);
  if (pid) return `${PATRONS[pid].name} isn't at this bar right now — the regulars ` +
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
    const room = ROOMS[cur];
    if (own && room && (room.bar || room.name)) {
      return `${NPCS[nid].name} isn't at this bar tonight — try ${room.bar || room.name}.`;
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
  for (const d of n.dialogue) {
    if (topic ? d.topic !== topic && !(d.topic && topic.includes(d.topic)) : d.topic) continue;
    if ((d.req || []).some(f => !_flag(f))) continue;
    if ((d.notFlags || []).some(f => _flag(f))) continue;
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
  _say(terse ? (d.short || _askAgain(npcId)) : d.text);
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
  G.visited[G.room] = true; // standing in it is how places join the fast-travel list
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
  if (full) _say(r.desc);
  const items = Object.keys(G.itemLoc).filter(id => _here(id));
  if (items.length) _say("You can see: " + items.map(id => ITEMS[id].name).join(", ") + ".");
  const npcs = _npcsHere();
  if (npcs.length) _say("Here: " + npcs.map(id => `${NPCS[id].emoji} ${NPCS[id].name}`).join(", ") + ".");
  // A bar owner who alternates nights between her rooms: when this is one of her
  // bars but she's working the other one tonight, say so — otherwise the room
  // reads as hers with no sign of her.
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.bars && n.bars.includes(G.room) && _npcRoom(id) !== G.room) {
      const other = ROOMS[_npcRoom(id)];
      _say(`${n.name} is working ${other.bar || other.name} tonight; the floor staff keep this one running.`, "dim");
    }
  }
  const pats = _patronsHere();
  if (pats.length) {
    _say("At the rail: " + pats.map(id =>
      `${PATRONS[id].emoji} ${PATRONS[id].name} (${PATRONS[id].age}, ${PATRONS[id].nat})`).join(", ") + ".");
  }
  const exits = Object.keys(r.exits);
  if (exits.length) _say("Exits: " + exits.join(", ") + ".", "dim");
  // Which of those exits are bars you can walk straight into. "Exits: w, e"
  // alone never says a bar is behind them, and the prose doesn't always name
  // it — so list them by name (tappable) with the direction and the ENTER verb.
  const barDirs = new Map(); // bar name → a direction (prefer a compass one over "in")
  for (const [dir, to] of Object.entries(r.exits)) {
    const b = ROOMS[to].bar;
    if (!b) continue;
    if (!barDirs.has(b) || (barDirs.get(b) === "in" && dir !== "in")) barDirs.set(b, dir);
  }
  if (barDirs.size) {
    _say("Step inside: " + [...barDirs].map(([b, d]) => `${b} (${d})`).join(", ") +
      ". (ENTER <name>)", "dim");
  }
  if (r.busStop) _say("A baht bus can be caught here (ride bus to …).", "dim");
  if (r.motosai) _say("A motosai stand is here (motosai to …).", "dim");
  if (r.barType === "beer" || r.barType === "soi6") {
    _say("A Connect 4 frame and a Jackpot dice box sit within reach (PLAY …).", "dim");
  }
  if (r.pool) {
    _say("A pool table waits under a low lamp (PLAY POOL)." +
      (_leagueTonight() ? " Tonight is LEAGUE NIGHT (PLAY KILLER, ฿100 in the ashtray)." : ""), "dim");
  }
  if (r.seven) _say("A 7-Eleven glows across the way (BUY TOASTIE · BUY WATER · BUY CHARGER).", "dim");
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
  if (G.room === "blue_dog" && _shakedownOn()) {
    _say("Across the road, the evening checkpoint is in session: officers on both " +
      "sides of Beach Road, waving over every farang on a motorbike with the bored " +
      "precision of toll collectors. The whole rail is watching. (WATCH POLICE — " +
      "or WATCH SUNSET, the bay is doing its thing too.)", "dim");
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

