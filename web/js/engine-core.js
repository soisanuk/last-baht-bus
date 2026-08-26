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
// Localization: translate an English source string to the player's language, with
// English fallback for any un-catalogued string. The catalog lives in lang.js
// (`_CATALOGS`, loaded before the engine); it may be absent (tests/headless), so
// guard for it. When lang === "en" (the default, ~all players) this is a no-op —
// zero cost on the hot output path. Only whole FIXED strings match; interpolated
// composites fall back to English until their pieces are wrapped in _L() (which is
// why the catalog is keyed by exact English source, mirroring the th/rom pattern).
function _L(s) {
  const lang = G && G.player && G.player.lang;
  if (!lang || lang === "en" || typeof _CATALOGS === "undefined" || !_CATALOGS[lang]) return s;
  const hit = _CATALOGS[lang][s];
  return hit != null ? hit : s;
}

// Localised string interpolation: for a line whose values are spliced in at
// runtime (money, clock, counts), a flat source-string catalog can't match the
// composed result. Author it as an English TEMPLATE with {named} placeholders,
// catalogue that template (the German value can reorder the placeholders for word
// order), and fill it here. English fallback when the template isn't catalogued.
//   _say(_fmt("day {day} of 7.", { day: G.day }))
function _fmt(en, params) {
  return _L(en).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null) ? params[k] : m);
}

function _say(text, cls) {
  _learnNames(text); // name/Thai harvest run on the ENGLISH source (language-independent)
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
  _enginePrint(_L(text), cls || ""); // …but the player sees it in their language
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
function _traceCancel() { _pendingTrace = null; } // a refused action leaves no breadcrumb
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
    return `· You gave ${target}${extra ? (/^(a|an|the|your|his|her|their)\b/i.test(extra) ? ` ${extra}` : ` the ${extra}`) : ""}`.trimEnd();
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
    buddhaDay: 0,        // last day you took the quiet at the Buddha Hill viewpoint
    loopDay: 0,          // last day riding the loop for its own sake paid its happy
    rep: 0,              // the soi's collective read on you (−20..+20); slow to build, quick to lose
    repDay: null,        // last day a good deed banked its +1 (the shared daily gain cap)
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
    examined: {},        // "room.readKey" → 1 — distinctive fixtures you've looked at (the Owl's noticer slot)
    visited: { jomtien_beach: true }, // roomId → true once stood in (fast-travel gate)
    talked: {},          // npcId → [dialogue indices already delivered] (terse repeats)
    npc: {},             // per-character conversation state: id → {trust,mood,dstate,know} (see _npcState)
    convo: null,         // active conversation partner id — bare topics/actions aim here (see _convoActive)
    itNpc: null,         // last person addressed — the antecedent for "her/him/them" (see _resolveActor)
    convoQ: null,        // a question the partner has put to YOU, awaiting a reply: {id,key} (see _convoAsk/_convoAnswer)
    convoLapsed: {},     // …and questions you walked away from, re-asked next time you talk to them
    darkDoorDay: -1,     // the once-a-night "there's no lights out there" nudge at your own door
    convoIdx: null,      // index of the partner's last-delivered node — its `choices` are the live action-choices (see _convoChoices)
    player: { said: {}, lang: "en", origin: null, personality: null, orientation: null },// what you've told NPCs + WHO YOU ARE (lang + origin/personality/orientation, picked in the taxi intro; persists across Act One resets)
    faction: { wdg: 0, samson: 0, indie: 0, syndicate: 0 }, // standing with the powers (see _align) — only moves when you ACT, never for declining
    itemLoc: Object.fromEntries(
      Object.entries(ITEMS).map(([id, it]) => [id, it.location])),
    dropped: {},         // keepsafe item ids the player DROPPED (vs spawned) — QUESTS surfaces these
    flowerDay: 0,        // day the flower-seller last worked you (once/night)
    flowerSeen: 0,       // …and how many times you've met her — the rerun reads as recognition
    party: null,         // TAKE HER OUT: { ids, stops, spent, seen: {roomId: true} } — the night continues with her
    flowerFor: null,     // who the offered rose is for
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
    dailyId: null,       // "YYYY-MM-DD" when this week is the seeded daily challenge (frontend passes the date in — the engine never reads a clock)
    nightLog: [],        // how each night ended (_endNight reason strings, capped) — the share card's spine
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
    amuletWorn: false,   // the beach amulet is round your neck (needs a cord first — see _doWear)
    lastBusWarned: false, // the nightly last-baht-bus heads-up fires once per night
    bestHappy: 0,
    act1Best: 0,         // furthest point down the opening critical path ever reached; survives the do-or-die Act One reset
    act1Tries: 0,        // opening-quest attempts so far; ≥1 unlocks the round-2 HINT system (also survives the reset)
    pendingChoice: null, // "vacation_end" gates input at week's end
    shiftCall: null,     // …and "shift" gates it on the call your own rail just put to you
    partnerWho: null,    // …and "partner" gates it on the 51% pitch you just heard
    shiftWho: null,      // the staff member a call is about, when it is about one
    bank: 100000,        // your account balance — the ATM draws pocket cash from this
    atmDay: 0,           // last day the ATM was used (pairs with atmToday for the daily cap)
    // the bar you own, once you own one (see _barSettle). `owed` is what's still
    // due to the old man; `arrears` is what you failed to pay him and haven't
    // made up. Nightly trade lands in `cash` — the bar's own till, kept separate
    // from your pocket so a good week at the bar isn't the same as a good week.
    bar: { cash: 0, owed: 0, arrears: 0, months: 0, lastMonthDay: 0, nights: 0, best: 0,
      workedLast: false, rentOwed: 0, rentShort: 0, pocketDrawn: 0 },
    atmToday: 0,         // principal withdrawn today (resets when atmDay rolls over)
    lastPolice: -99,     // turn of the last boy-in-brown shakedown
    questHailed: false,  // the one time a giver calls you over (see _questHail)
    sevenAt: null,       // the 7-Eleven street you're currently standing inside
                         // (see _sevenIn) — cleared when you leave the room
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
    season0: SEASON_DEFAULT_M0,  // start month (0=Jan); the frontend re-seeds off the real calendar

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

// ── The baton: handing the character to Second Road and back ────────────────
// Second Road (docs/second-road-plan.md) is the macro companion — weeks and
// seasons, multiple venues — in a separate codebase. The two games share one
// character, and the rule that keeps their clocks from diverging is that the
// save is a BATON: held by exactly one game at a time, handed over at dawn.
// Divergence isn't caused by two clocks, it's caused by two concurrent writers.
//
// This is deliberately NOT serializeGame(). A full save carries a body in a
// night — hunger, battery, drunk, the pending modal gates, the turn clock — and
// a macro turn has none of those. Handing them over would be handing over state
// nobody on the other side can honour. So the baton is an explicit subset, and
// the ephemera are dropped rather than trusted.
const BATON_VERSION = 1;

// what crosses: the character, and the world's memory of them
const BATON_FIELDS = [
  "day", "vacation", "stage", "mode",
  "player", "flags", "quests", "known", "talked",
  "bar", "syn", "faction", "rep", "repDay",
  "money", "bank", "loan", "hotel", "hotelDebt",
  "happy", "bestHappy", "jaded", "sabaiSabai",
  "phone", "dog", "thaiSeen", "itemLoc",
  "rng",              // determinism has to survive the handoff or replay dies
  "act1Best", "act1Tries",
];
// bonds are the macro game's real resource — who your people are. The rest of
// `soc` is per-night bookkeeping (bells, heat, refusals) and stays behind.
const BATON_SOC_FIELDS = ["drinks", "bfBar", "bfStrikes"];

// A baton changes hands at dawn: the night resolved, the books settled, no modal
// mid-question. _endNight is that seam.
//
// But THE CLOCK IS CONTINUOUS, and the first version of this rule assumed
// otherwise. The command that ends a night immediately begins the next one, so
// `nightTurn === 0` is a value the game passes through rather than rests at —
// there is no persistent dawn to wait for. A consumer that played a night to its
// end and then tried to hand back was refused for being "mid-night" one turn
// into a night it had not played. Found by Second Road doing exactly that.
//
// So the seam is "a night that has barely begun". Nothing in the baton depends
// on nightTurn (the body deliberately doesn't cross), so a couple of ticks in
// costs nothing; what the rule is really guarding is a handover in the MIDDLE of
// a night, and that it still refuses.
const BATON_DAWN_TURNS = 2;
function batonReady() {
  if (!G) return { ok: false, why: "no game" };
  if (G.nightTurn > BATON_DAWN_TURNS) return { ok: false, why: "mid-night — finish the night first" };
  for (const gate of ["pendingChoice", "pendingEnc", "pendingBf", "pendingSoapy",
                      "pendingFare", "game"]) {
    if (G[gate]) return { ok: false, why: "something is waiting on an answer (" + gate + ")" };
  }
  return { ok: true };
}

function exportBaton() {
  const r = batonReady();
  if (!r.ok) return null;
  const out = { v: BATON_VERSION };
  for (const k of BATON_FIELDS) if (G[k] !== undefined) out[k] = G[k];
  out.soc = {};
  for (const k of BATON_SOC_FIELDS) if (G.soc && G.soc[k] !== undefined) out.soc[k] = G.soc[k];
  return out;
}

// Coming back the other way. Merges onto a fresh skeleton exactly like
// deserializeGame, so a field Second Road has never heard of keeps today's
// default rather than becoming undefined — the same reason the save format
// tolerates being older than the code.
function importBaton(b) {
  if (!b || typeof b !== "object") return { ok: false, why: "not a baton" };
  if (b.v !== BATON_VERSION) return { ok: false, why: "baton version " + b.v + ", expected " + BATON_VERSION };
  newGame();
  for (const k of BATON_FIELDS) if (b[k] !== undefined && _safeMergeKey(k)) {
    const isObj = v => v && typeof v === "object" && !Array.isArray(v);
    G[k] = (isObj(b[k]) && isObj(G[k])) ? { ...G[k], ...b[k] } : b[k];
  }
  if (b.soc) for (const k of BATON_SOC_FIELDS) if (b.soc[k] !== undefined) G.soc[k] = b.soc[k];
  // a body arrives fresh: the macro game ran weeks, not a night
  G.nightTurn = 0;
  // …and it arrives WHERE IT LIVES. newGame()'s default room is the Act One
  // rough-wake spot on the sand, so a resident with a hotel, a bar and 33 names
  // in his phone was handed back waking on Jomtien beach every time
  // (persistence playtest 2026-08-23). "A body arrives fresh" covers the meters,
  // not the address.
  if (_flag("act1Done") && typeof _hotelRoomId === "function") {
    const home = _hotelRoomId();
    if (home && ROOMS[home]) { G.room = home; G.visited[home] = true; }
  }
  if (!ROOMS[G.room]) G.room = "jomtien_beach";
  G.pendingChoice = null; G.pendingEnc = null; G.game = null;
  _sanitizeState();   // a baton is data on the wire too — same finite/in-range guard as a save
  return { ok: true };
}

function serializeGame() { return JSON.stringify(G); }
// Restoring a save merges it over a fresh newGame() skeleton, so a field (or a
// sub-key of soc/phone/itemLoc/…) added AFTER the save was written simply keeps
// today's default — no hand-written "if (G.x === undefined)" backfill per
// feature, which is the bug class this replaces. One level deep: a plain-object
// field merges key-by-key (new items appear in itemLoc, soc gains bra, phone
// gains msgCd), everything else the save wins wholesale. Below the merge, only
// SEMANTIC migrations remain — repairs that need the save's own contents.

// A key a hostile save/baton must never be allowed to merge THROUGH: assigning
// to G["__proto__"] walks the prototype rather than setting an own field. The
// merge below is also shallow, which happens to block global pollution — but a
// security invariant must be DELIBERATE, not a side effect of an implementation
// choice a future deep-merge would quietly undo (griefer playtest D2, 2026-08-26).
function _safeMergeKey(k) { return k !== "__proto__" && k !== "constructor" && k !== "prototype"; }

// Load-bearing scalars a save must not be able to poison with NaN/Infinity/
// negative/oversized values — the render path and the tick math both assume
// finite, in-range numbers, and a corrupt save otherwise leaks "฿null · สนุก
// NaN" into the status header and throws from ordinary commands (griefer
// playtest R1, 2026-08-26). Belt for the single-player own-box case; load-
// bearing the day a server ingests or replays these blobs.
// [path, min, max] — a one-level "soc.x" path reaches the nested meters.
const _SANE_SCALARS = [
  ["money", 0, 1e9], ["bank", 0, 1e9], ["hotelDebt", 0, 1e6],
  ["happy", 0, 100], ["bestHappy", 0, 100], ["jaded", 0, 100],
  ["hunger", 0, 100], ["thirst", 0, 100], ["hurt", 0, 3], ["battery", 0, 100],
  ["day", 1, 1e7], ["vacation", 1, 1e6], ["turns", 0, 1e9], ["score", 0, 1e6],
  ["nightTurn", 0, (typeof NIGHT_TURNS !== "undefined" ? NIGHT_TURNS : 100)],
  ["soc.drunk", 0, 20], ["rep", -20, 20],
];
const _SANE_ARRAYS = [["thaiSeen", 60], ["nightLog", 30]];
function _sanitizeState() {
  for (const [path, min, max] of _SANE_SCALARS) {
    const [a, b] = path.split(".");
    const obj = b ? G[a] : G;
    if (!obj) continue;
    const key = b || a;
    const v = obj[key];
    obj[key] = Number.isFinite(v) ? Math.max(min, Math.min(max, Math.trunc(v))) : min;
  }
  // rng: an integer seed in the LCG's live range, or reseed (the old guard
  // caught 0/NaN but not Infinity or a huge value that garbles the stream)
  if (!Number.isInteger(G.rng) || G.rng < 1 || G.rng > 2147483646) {
    G.rng = 1 + Math.floor(Math.random() * 2147483645);
  }
  for (const [key, cap] of _SANE_ARRAYS) {
    if (!Array.isArray(G[key])) G[key] = [];
    else if (G[key].length > cap) G[key] = G[key].slice(-cap);
  }
}

function deserializeGame(s) {
  const saved = JSON.parse(s);
  newGame(); // the skeleton: every current field at its current default
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  for (const [k, v] of Object.entries(saved)) {
    if (!_safeMergeKey(k)) continue;
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
  // a room that isn't a real room would strand the player in an undefined world
  if (!ROOMS[G.room]) G.room = "jomtien_beach";
  G.visited[G.room] = true;  // wherever the save stands, you've at least been HERE
  G.over = false;            // pre-sandbox saves could be "over"; the night reopens
  _sanitizeState();          // finite, in-range scalars; capped arrays; a live rng seed
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
  // A companion you took OUT is wherever YOU are — one override here and every
  // presence consumer (TALK, BUY DRINK, kiss, PHOTO, the Here: line, the
  // elsewhere-router) sees her at your side instead of insisting she's back at
  // her bar while the arrival prose narrates her on your arm (closer playtest
  // F1, 2026-08-26: the paid whole-night companion was invisible to every
  // targeted verb).
  if (G.party && G.party.ids && G.party.ids.includes(id)) return G.room;
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
  if (n && n.offmap) return false; // exists for the phone, never stands in a room (Sao — Bangkok)
  // a late-window civilian (Cream at her friend's bar from ten): `from` is a nightTurn
  if (n && n.from != null && G.nightTurn < n.from) return false;
  if (n && n.sandbox && !_flag("act1Done")) return false; // not part of the opening quest's street
  // sent home early on a shift call — off the rail for the rest of the night
  if (G.soc && G.soc.leftEarly && G.soc.leftEarly[id] === G.day) return false;
  // a host you took off the floor tonight is off the floor (HIRE narrated
  // leaving the building while leaving him standing there — persona A#13)
  if (G.soc && G.soc.hostOut && G.soc.hostOut[id]) return false;
  return !(n && n.origin && G.player && n.origin === G.player.origin);
}

// "the mamasan" is asserted all over the bar prose, but she is not always in the
// room: a CHAIN shares one mamasan (Candy covers both Candy Bars), so on the
// nights she works the other one her first bar has none at all — and the prose
// went on logging drinks in her biro and refereeing the ceiling game regardless.
// Reported independently by two playtests on the same day (2026-08-23), which is
// what makes it structural. Every bar has a cashier, so the till is the fallback:
// somebody is always keeping the book, it just isn't always her.
// NB callable only at RUNTIME — it reads G, so it must not be used in a
// top-level const initializer (the drizzle pool learned this the hard way).
function _mamaHere() {
  return _npcsHere().find(x => NPC_ROLES[x] === "mamasan") || null;
}
function _mamaRef(cap) {
  // through _L: this is interpolated INTO an already-translated sentence, so an
  // untranslated word here would leave "der Kuli von the mamasan" in a de run.
  const s = _L(_mamaHere() ? "the mamasan" : "the cashier");
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
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
// `rough` = you did not wake behind your own door, so nothing slid under it.
// The bill is the same; the delivery cannot be (persona reports A#12 / B#19,
// 2026-08-23 — a folio sliding under a door while the player wakes among the
// crates in the Buakhao market forecourt).
function _chargeRent(rough) {
  if (!_flag("act1Done") || G.stage === "act1") return;
  if (G.hotelDebt && G.money >= G.hotelDebt + _hotelRate(G.hotel)) {
    G.money -= G.hotelDebt;
    _say(`(You settle the ฿${G.hotelDebt} on the book on your way past the desk. ` +
      "The ledger closes with real warmth.)", "dim");
    G.hotelDebt = 0;
  }
  if (G.money >= _hotelRate(G.hotel)) {
    G.money -= _hotelRate(G.hotel);
    _say(`(${rough ? "The folio is waiting at the desk when you finally get back" :
      "The folio slides under the door"}: ฿${_hotelRate(G.hotel)}` +
      (G.stage === "expat" ? " — the long-stay rate" : "") +
      `, the ${_HOTELS[G.hotel].name}. ฿${G.money} left.)`, "dim");
    return;
  }
  // step down toward the Sabai Palms — but NOT in the Soi 6 challenge, whose whole
  // world is the one pocket: a downgrade there would strand you at the off-map Sabai
  // (outside SOI6_ROOMS) with the fence refusing every exit. Keep the Queen Vic and
  // let the debt book below instead (capped, same as anywhere).
  if (G.mode !== "soi6") {
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
  }
  const rate = _hotelRate(G.hotel);
  if (G.money >= rate) {
    G.money -= rate;
    _say(`(฿${rate} for the night. ฿${G.money} left — thin, but paid.)`, "dim");
  } else {
    G.hotelDebt = Math.min(_DEBT_CAP, G.hotelDebt + rate);
    _addHappy(-1);
    _say(_fmt("The night clerk takes in the situation and adds ฿{r} to the book " +
      "without a word — ฿{d} on it now. His kindness is the heaviest " +
      "thing you'll carry today.", { r: rate, d: G.hotelDebt }), "alert");
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

// Low season empties the RAIL, not just the till. A share of the regulars stay
// in on any given night in the lean months — day-stable pure hash of (id,
// vacation, day), so it doesn't flicker as you re-enter and every player agrees
// (rule #6). This is what finally lets the season reach the ROOM (both publican
// playtests, 2026-08-26: the rail read identical in Sept and Dec) and unlocks the
// empty-bar monsoon register, which was unreachable while the bench never thinned.
function _patronOut(id) {
  if (!_flag("act1Done")) return false;              // the opening night's cast is fixed
  const stay = { peak: 0, high: 0.05, shoulder: 0.22, low: 0.45, deeplow: 0.6 };
  const p = (typeof _seasonTier === "function") ? (stay[_seasonTier()] || 0) : 0;
  if (p <= 0) return false;
  return _hh(id + ":" + G.vacation + ":" + G.day + ":pout", 71) % 100 < Math.round(p * 100);
}
function _patronRoom(id) {
  const p = PATRONS[id];
  if (p.days && !p.days.includes(G.day % 7)) return null; // not his night out
  if (_patronOut(id)) return null;                        // low season: some regulars stay in

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
    if (!t || (G.known && G.known[id])) continue;
    const tt = _titleNorm(t), ww = _titleNorm(w);
    if (tt === ww || (ww.length >= 4 && tt.includes(ww))) return id;
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
function _convoStart(id) {
  if (!id) return;
  // Switching partners LAPSES a pending question from the old one — the doc'd
  // "changes the subject" rule, enforced at the switch itself. Without this the
  // old asker's numbered answer prompt kept re-printing under the new partner's
  // turns while a typed digit routed to the new partner (mobile playtest,
  // 2026-08-17, Bpom's question haunting Roger's conversation).
  if (G.convoQ && G.convoQ.id !== id) {
    const who = _convoName(G.convoQ.id);
    // the question isn't spent — next time that node lands it can be asked again
    const ost = _npcState(G.convoQ.id);
    if (ost && ost.know) delete ost.know["asked_" + G.convoQ.key];
    // …but clearing `asked_` was NOT enough on its own: the dialogue ENTRY that
    // carried the ask is already in G.talked, so re-talking gave the brush-off
    // and the question was never put again — while the whole consistency system
    // hangs on answering it (persona report B#15, 2026-08-23). Remember it, and
    // re-ask on the next conversation with that person.
    (G.convoLapsed = G.convoLapsed || {})[G.convoQ.id] = { key: G.convoQ.key, q: G.convoQ.q || "" };
    G.convoQ = null;
    _say(`(${who}'s question goes unanswered — you've turned to ${_convoName(id)}.)`, "dim");
  }
  G.convo = id; G.itNpc = id;
  // coming back to somebody whose question you walked away from: they ask again,
  // once, because a question that can never be re-offered is a dead end
  const lapsed = G.convoLapsed && G.convoLapsed[id];
  if (lapsed && !G.convoQ) {
    delete G.convoLapsed[id];
    if (lapsed.q) {
      _say(`${_convoName(id)} comes back to it, because ${_sheHe(id).s} was actually asking.`, "dim");
      _say(lapsed.q);
      G.convoQ = { id, key: lapsed.key, q: lapsed.q };
      // re-mark it asked, or the node's own _convoAsk prints the question a
      // second time in the same reply (grapevine playtest F15, 2026-08-25)
      const lst = _npcState(id);
      lst.know = lst.know || {};
      lst.know["asked_" + lapsed.key] = true;
    }
  }
  if (G.known) G.known[id] = true; // talking to someone IS meeting them → you learn the name
}
function _convoName(id) {
  return (NPCS[id] && NPCS[id].name) || (PATRONS[id] && PATRONS[id].name) || id;
}
function _convoActive() {
  const id = G.convo;
  if (!id) return null;
  const here = (NPCS[id] && _npcRoom(id) === G.room) ||
               (PATRONS[id] && _patronsHere().includes(id));
  if (!here) { // partner gone → conversation over; the question isn't spent, she can ask again
    if (G.convoQ) { const ost = _npcState(G.convoQ.id); if (ost && ost.know) delete ost.know["asked_" + G.convoQ.key]; }
    G.convo = null; G.convoQ = null; return null;
  }
  return id;
}
// she/he/they for a character the engine is ABOUT to pronoun — same logic the
// repeat-brush-off already uses (a working role or a filler girl reads she).
function _sheHe(id) {
  const n = NPCS[id] || PATRONS[id];
  if (!n) return { s: "they", o: "them", p: "their" };
  const she = n.pronoun === "she" || !!NPC_ROLES[id] || !!n.filler;
  const he = n.pronoun === "he";
  return she ? { s: "she", o: "her", p: "her" } :
    he ? { s: "he", o: "him", p: "his" } : { s: "they", o: "them", p: "their" };
}

function _convoEnd(quiet) {
  const id = G.convo;
  // an unanswered question survives the interruption: she comes back to it
  // next time, same as when you turn to somebody else mid-ask
  if (G.convoQ && G.convoQ.q) {
    (G.convoLapsed = G.convoLapsed || {})[G.convoQ.id] = { key: G.convoQ.key, q: G.convoQ.q };
  }
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
function _convoChoices(remembered) {
  const id = _convoActive();
  if (id == null) return [];
  const arr = ((NPCS[id] || PATRONS[id] || {}).dialogue) || [];
  let idx = G.convoIdx;
  let d = idx != null ? arr[idx] : null;
  // the live node carries no choices (an intervening ask): fall back to the last
  // node that did, so a printed label still fires (completionist playtest 2026-08-22)
  if ((!d || !d.choices) && remembered && G.convoChoiceMemo && G.convoChoiceMemo[id] != null) {
    idx = G.convoChoiceMemo[id]; d = arr[idx];
  }
  if (!d || !d.choices) return [];
  const st = _npcState(id);
  if (remembered === "raw") return d.choices.slice(); // every label the node ever printed, gate or no gate
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
  // …and a question you already ANSWERED is never asked again, whatever cleared
  // the asked_ marker (a midnight kick-out, a lapse, a teardown). Re-asking is
  // how an honest answer that evolved with time ("first time in" → "third time
  // in", both true) got punished as a lie (grapevine playtest F1, 2026-08-25).
  if (st.heard && st.heard[key] != null) return;
  st.know["asked_" + key] = true;
  if (d.asks.q) _say(d.asks.q);
  // Keep the question itself. _renderResume redraws the answer cue after a
  // reload, but the QUESTION lived only in the scrollback — so a restored
  // player came back to "Answer in your own words — or: 1) …" with no way to
  // read what had been put to them (persistence playtest 2026-08-23).
  G.convoQ = { id, key, q: d.asks.q || "" };
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
// syndicate (Tan's network — NOT muscle and not a jao pho: phu kwang khwang,
// dealing in favours rather than cash. The envelopes on the good table are what
// WDG pays to be tolerated, because a foreigner can't be owed a favour — see
// docs/factions-thai.md). Standing only moves
// when the player ACTS on a faction (takes a job to its end, throws real weight
// behind it) — never for declining or ignoring. Staying out of the politics
// costs nothing, forever. Dialogue reads it via `when`; nodes move it via `_align`.
function _faction(name) { return (G.faction && G.faction[name]) || 0; }
function _align(name, delta) {
  if (!G.faction) G.faction = { wdg: 0, samson: 0, indie: 0, syndicate: 0 };
  G.faction[name] = Math.max(-5, Math.min(5, (G.faction[name] || 0) + delta));
}

function _patronTalk(id, topic, _retried) {
  if (G.patronTalk.day !== G.day) G.patronTalk = { day: G.day, talked: {} };
  _convoStart(id); // engaging a regular makes him the active conversation partner
  const p = PATRONS[id];
  const st = _npcState(id);
  // some regulars have a sore subject that turns them belligerent (Fergie: Bert,
  // Candy, their bars). On his nasty nights it turns into a swing.
  if (topic && p.rage && p.rage.some(k => topic.includes(k))) { _patronRage(id); return; }
  if (topic && /\bquiz\b|trivia/.test(topic) && !p.dialogue.some(e => e.topic === "quiz")) { _say(_quizTalk()); return; }
  if (topic && /\bdarts?\b/.test(topic) && !p.dialogue.some(e => e.topic === "darts")) { _say(_dartsTalk()); return; }
  // the dog at your heel is a subject everyone at the rail has (dog-person playtest 2026-08-22)
  if (topic && G.dog && (/\bdogs?\b|sai ?krok|\bpuppy\b/.test(topic) || _isDogWord(topic)) &&
      !p.dialogue.some(e => e.topic === "dog")) {
    _say(_dogN(_DOG_TALK_EN[Math.floor(_rand() * _DOG_TALK_EN.length)](p.name)));
    return;
  }
  let d = null;
  for (const e of p.dialogue) {
    if (topic ? e.topic !== topic && !(e.topic && topic.includes(e.topic)) : e.topic) continue;
    // full parity with _pickDialogue: the documented contract is that patron
    // entries share the NPC schema, but req/notFlags were silently ignored here
    // — a bkkArcDone-gated node fired for everyone (caught 2026-08-22)
    if ((e.req || []).some(f => !_flag(f))) continue;
    if ((e.notFlags || []).some(f => _flag(f))) continue;
    if (e.when && !e.when(st, G)) continue; // state-machine condition: skip nodes whose state gate fails
    d = e;
    break;
  }
  if (!d) {
    if (topic) {
      // parity with _doTalkBody: a literal miss retries through the synonym map
      // (_CONVO_TOPIC_RULES) before giving up — "ask nigel about neil" reaches
      // his darkside node the same way "ask jenny about boyfriend" reaches
      // sponsor. One retry only, so a rule cycle can't recurse.
      const norm = !_retried && typeof _convoTopic === "function" ? _convoTopic(topic) : topic;
      if (norm !== topic) { _patronTalk(id, norm, true); return; }
      // first contact still gets his greeting in full; after that a real miss
      // says so — re-delivering the greeting's short ("You again.") read as a
      // man refusing to talk (playtests 2026-08-22)
      if (!(G.patronMet && G.patronMet[id])) { _patronTalk(id, null, true); return; }
      // Mort is the town's designated observer — "I watch, I write it down" —
      // so ASK MORT ABOUT <a person he'd know> must pay off, not dead-end
      // (Settler playtest, 2026-08-26). He knows exactly who; he just does not
      // hand it across a bar, and he points at where the gossip actually lives.
      if (id === "mort") {
        const who = String(topic).trim();
        const known = Object.keys(NPCS).find(i => NPCS[i].name.toLowerCase() === who ||
            NPCS[i].name.toLowerCase().split(" ").pop() === who) ||
          Object.keys(PATRONS).find(i => i !== "mort" && (PATRONS[i].name.toLowerCase() === who ||
            PATRONS[i].name.toLowerCase().split(" ").pop() === who));
        if (known) {
          const nm = NPCS[known] ? NPCS[known].name : PATRONS[known].name;
          _say(`Mort's biro stops. He looks at you over the horn-rims, and for a second ` +
            `you see forty years of watching behind them. “${nm}.” He does not write ` +
            `it down; he already has, somewhere. “I know exactly who that is. But I do not ` +
            `put people in the column by their names, to their faces, across a bar. That is ` +
            `not the job.” The biro starts again. “Read the COLUMN. If they are in it, ` +
            `they are in it as everybody — the only fair way to do it.”`, "dim");
          return;
        }
      }
      _say(_PATRON_MISS[Math.floor(_rand() * _PATRON_MISS.length)](p.name, _patronHis(id)));
      return;
    }
    _say(`${p.name} has said his piece for now.`);
    return;
  }
  const idx = p.dialogue.indexOf(d);
  const seen = G.patronTalk.talked[id] || (G.patronTalk.talked[id] = []);
  // the intro is met-once, not met-nightly: a resident who drinks with Mort every
  // evening shouldn't get the full "I write the Nite Owl…" each day (playtest
  // 2026-08-22). G.patronMet persists where the daily seen-book resets.
  G.patronMet = G.patronMet || {};
  const repeat = seen.includes(idx) || (!d.topic && !!G.patronMet[id]);
  if (!repeat) seen.push(idx);
  if (!d.topic) G.patronMet[id] = true;
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
    if (_hurt(1)) return;
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
// (n, his) — `his` is the patron's possessive, "his"/"her": Sandra and Angela
// were going back to "his glass" (German-mode playtest 2026-08-22)
const _PATRON_MISS = [
  (n, his) => `${n} shrugs. “Not one I know anything about, mate.”`,
  (n, his) => `“Search me,” ${n} says, and goes back to ${his} glass. “Ask me something I've actually got an opinion on.”`,
  (n, his) => `${n} turns a hand over on the bar: nothing in it. “Couldn't tell you. Not my story.”`,
];
const _PATRON_AGAIN = [
  (n, his) => `${n} gives you a flat look over ${his} Chang. “Already told you that one, mate.”`,
  (n, his) => `“You asked me that,” ${n} says. “Memory like a goldfish. Get a round in and I might go again.”`,
  (n, his) => `${n} waves a hand. “Same story, same ending. Ask me something I haven't done to death.”`,
];
function _patronHis(id) { return PATRONS[id] && PATRONS[id].pronoun === "she" ? "her" : "his"; }
function _patronAgain(id) {
  return _PATRON_AGAIN[Math.floor(_rand() * _PATRON_AGAIN.length)](PATRONS[id].name, _patronHis(id));
}

// where: "room", "inventory", or undefined (both, room first — so TAKE grabs
// the bottle on the ground, not the one already in your pocket)
function _findItem(word, where) {
  const w = word.toLowerCase();
  const inScope = id =>
    where === "room" ? G.itemLoc[id] === G.room :
    where === "inventory" ? G.itemLoc[id] === "inventory" :
    (G.itemLoc[id] === G.room || G.itemLoc[id] === "inventory");
  // WORD boundaries, not raw substring. `includes` meant any short noun that
  // happens to sit inside an item's name hijacked it — EXAMINE WALL handed back
  // "your wallet", anywhere in the game, and worst of all in Act One, where a
  // player who has NOT found the wallet could be told they had (thorough-player
  // playtest 2026-08-23). A query still matches a whole word of a multi-word
  // name ("bottle" → "empty Leo bottle", "charger" → "USB charger") and still
  // matches a name that merely starts with it ("sunglass" → "sunglasses"),
  // which is what the loose test was actually there for.
  const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alts = [...new Set([w, w.replace(/s$/, "")])].filter(Boolean).map(esc);
  const wordRe = new RegExp("\\b(?:" + alts.join("|") + ")s?\\b", "i");
  const hit = str => wordRe.test(String(str));
  const matches = (id, it) => inScope(id) &&
    (hit(it.name) || it.aliases.some(a => a === w || hit(a)));
  const pool = Object.entries(ITEMS).filter(([id, it]) => matches(id, it));
  if (!where && pool.length > 1) {
    const inRoom = pool.find(([id]) => G.itemLoc[id] === G.room);
    if (inRoom) return inRoom[0];
  }
  return pool.length ? pool[0][0] : null;
}

// Titles are stored with their articles ("an owlish old-timer scribbling in a
// notebook"), but doCommand strips filler words (a/an/the/to/at/my) from ANYWHERE
// in an arg — so a tapped title arrives as "owlish old-timer scribbling in notebook".
// Normalise both sides the same way when matching a title, or an INTERNAL article
// (Mort's "in a notebook") silently breaks resolution while a leading-only one
// (Angela's "a grey…") survives.
function _titleNorm(s) {
  return String(s || "").toLowerCase().split(/\s+/)
    .filter(x => !["the", "a", "an", "to", "at", "my"].includes(x)).join(" ");
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
    if (!t || (G.known && G.known[id])) continue;
    const tt = _titleNorm(t), ww = _titleNorm(w);
    if (tt === ww || (ww.length >= 4 && tt.includes(ww))) return id;
  }
  return null;
}

// Everyone is named on sight — one consistent rule across the whole cast (the
// "descriptive title until met" reveal was dropped: gating a few characters while
// the ~230 staff were named on sight read as inconsistent, per playtest). The
// `title` fields + _findNpc/_findPatron look-resolution stay in the data (harmless,
// still let "talk to the owlish old-timer" resolve), but they never replace a name
// in the UI. To restore reveal-on-met, gate these on `!(G.known && G.known[id])`.
function _npcLabel(id) {
  const n = NPCS[id]; return n ? n.name : id;
}
function _patronLabel(id) {
  const p = PATRONS[id]; return p ? p.name : id;
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
    if (!_npcActive(nid)) return `${NPCS[nid].name} isn't around right now.`; // not in at this hour / not here at all
    const cur = _npcRoom(nid);
    // Point the player to her only when she's at one of HER OWN bars (a
    // multi-bar owner alternating nights). If she's somewhere else — an invited
    // visit elsewhere, once that exists — don't reveal it; just say she's out.
    const own = NPCS[nid].bars ? NPCS[nid].bars.includes(cur) : true;
    if (own && _barName(cur)) {
      // her bar has shut for the night: don't send the player to a padlock
      if (typeof _closedNow === "function" && _closedNow(cur)) {
        return `${NPCS[nid].name} ${notHere} — ${_barName(cur)} has shut for the night. Tomorrow.`;
      }
      // Name the REGION too when it's somewhere you haven't been: "try Candy Bar 2"
      // is useless if Candy Bar 2 is in Myth Night, a region you've never walked,
      // because it isn't in the TRAVEL list and GO won't find it. That cost an
      // insider playtest a full in-game night on the one quest the endgame hangs
      // on (2026-08-23).
      const reg = (ROOMS[cur] || {}).region;
      const unseen = reg && !Object.keys(G.visited || {}).some(r => (ROOMS[r] || {}).region === reg);
      return `${NPCS[nid].name} ${notHere} tonight — try ${_barName(cur)}` +
        (unseen ? `, over in ${reg}.` : ".");
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
  n => `“Aiyah, I tell you this already,” ${n} says, half a laugh. “Same answer, na. Farang memory.”`,
  n => `${n} waves you off, fond. “You forget so fast? Buy a drink — maybe it come back.”`,
  n => `“Same-same,” ${n} says. “I tell you this one already. We talk something new, or you talk to the wall.”`,
  n => `${n} gives you the look reserved for farang who repeat themselves. “Told you already, tilac.”`,
];
// The English-register twin: a farang regular (Lake Gary, Bert, Eddy, the
// origin archetypes) saying "you asked me that" in Tinglish read as a bug in
// two blind playtests (2026-08-22). Thai-voiced = the staff roles and filler.
const _ASK_AGAIN_EN = [
  n => `“You asked me that one,” ${n} says. “Same answer. Memory like a sieve, this town.”`,
  n => `${n} gives you a look. “We've done that one. Ask me something I haven't answered.”`,
  n => `“Already told you,” ${n} says, not unkindly. “Buy a round and I'll pretend it's new.”`,
];
// The farang cast: everyone else hand-authored is Thai (Nok, Tan, DJ Beer, the
// piwins…) and was getting "No idea, mate — not my department" (Thai-speaker
// playtest 2026-08-22). A farang set is shorter and safer than guessing from `th`.
const _FARANG_NPCS = new Set(["gavin", "powers", "doyle", "wayne", "roy", "macca", "pete", "rob", "barry",
  "doug", "terry", "bill", "bob", "fast_eddy", "thomas", "bert", "phil", "gary"]);
function _thaiVoice(id) {
  const n = NPCS[id];
  if (!n) return true;
  if (NPC_ROLES[id] || n.filler || n.masseuse || n.ladyboy) return true;
  if (typeof _HOSTS !== "undefined" && _HOSTS.includes(id)) return true;
  if (_FARANG_NPCS.has(id) || n.manager || n.origin) return false;
  return true;
}
function _askAgain(npcId) {
  const pool = _thaiVoice(npcId) ? _ASK_AGAIN : _ASK_AGAIN_EN;
  return pool[Math.floor(_rand() * pool.length)](NPCS[npcId].name);
}
// An unknown topic is NOT a repeat: before this, a miss fell through to the
// topicless greeting, whose repeat path then told the player "you asked me
// that already" about a question they had never asked (both blind playtests,
// 2026-08-22). Voiced by register; the greeting stays unspent.
const _TOPIC_MISS_TH = [
  n => `${n} tilts her head. “That one I don't know, na. Ask me something else.”`,
  n => `“Hm?” ${n} laughs it off. “I don't know about that. You ask the wrong girl.”`,
  n => `${n} shrugs, easy. “Not my story, that. Ask me something I know.”`,
];
const _TOPIC_MISS_EN = [
  n => `${n} shakes his head. “Can't help you there. Not my department.”`,
  n => `“That one's above my pay grade,” ${n} says. “Ask me something I'd actually know.”`,
  n => `${n} turns a hand over: nothing in it. “No idea, mate. Try somebody who was there.”`,
];
const _TOPIC_LOCKED_TH = [
  n => `${n} looks at you a moment, then lets it go. “Not yet, na. Maybe later.”`,
  n => `Something crosses ${n}'s face and is put away again. “Ask me another time.”`,
];
const _TOPIC_LOCKED_EN = [
  n => `${n} considers you, and the glass, and decides against it. “Another time.”`,
  n => `“Not tonight,” ${n} says, in the tone of a door being left on the latch.`,
];
function _topicLocked(npcId) {
  const pool = _thaiVoice(npcId) ? _TOPIC_LOCKED_TH : _TOPIC_LOCKED_EN;
  return pool[Math.floor(_rand() * pool.length)](NPCS[npcId].name);
}
// "ask <her> about dog": the dog-favor scenes promise a topic (an invitation is a
// promise), and the generic miss line said "not my story" (dog-person playtest
// 2026-08-22). Voiced by register; Daeng has her own once the Shamrock has spoken.
const _DOG_TALK_TH = [
  n => `${n} looks down at Sai Krok and then at you, pleased. “He good dog. Where you find him? Soi dog the best — already he know everything, na. You lucky he choose you.”`,
  n => `“Him?” ${n} laughs. “He come every night now, I think. I save him the chicken bone.” She crouches to Sai Krok's level. “Na, handsome? You like me more than him.”`,
  n => `${n} says something to Sai Krok in Thai, soft, the way you talk to a child or a grandfather. “I tell him be good boy for you,” she says. “He say ok.”`,
];
const _DOG_TALK_EN = [
  n => `“Good-looking dog, that,” ${n} says. “Soi dogs make the best ones. They've already survived the worst of it before you turn up — anything after that is a bonus to them.”`,
  n => `${n} glances down at Sai Krok. “He picked you, didn't he. They do that. You don't get a say, and you wouldn't want one.”`,
];
function _dogTalk(npcId) {
  if (npcId === "daeng" && _flag("shamrockVisited")) {
    return _dogN("Daeng wipes her hands and looks down at Sai Krok with the softness she " +
      "showed at the Shamrock's door. “Paddy dog. Four year he walk that strip, every night, " +
      "waiting for the shutter go up. Now he walk with you.” She nods, once, as if a ledger " +
      "had balanced. “Good. He need somebody to walk with.”");
  }
  const pool = _thaiVoice(npcId) ? _DOG_TALK_TH : _DOG_TALK_EN;
  return _dogN(pool[Math.floor(_rand() * pool.length)](NPCS[npcId].name));
}
// "ask <anyone> about quiz / darts": TIME knew, nobody else did (gambler playtest
// 2026-08-22). One honest line, register-neutral, computed from the schedule.
function _quizTalk() {
  const bars = (typeof _quizBars === "function") ? _quizBars().map(b => _barName(b)).filter(Boolean) : [];
  if (typeof _quizDay === "function" && _quizDay()) {
    return `“Quiz? Tonight, na — eight till ten.” A thumb over the shoulder at the soi. “${bars.join(", ")}. Five questions, prize on the board. You clever? Go.”`;
  }
  // count- and mode-honest: the challenge runs it at one bar (the Vic), the
  // full game at three the day's hash picks (grapevine playtest F2, 2026-08-25)
  return G.mode === "soi6"
    ? "“Quiz night is Thursday — eight o'clock, at the Queen Vic. The pub does it. Prize money, teachers from Rayong, no appeal. Check the TIME.”"
    : "“Quiz night is Thursday — eight o'clock, prize money. Which bars, you ask on the day. Check the TIME, everybody know.”";
}
function _dartsTalk() {
  if (_room().darts) return "“Darts? Board's on the wall. Chalk's on the string. PLAY DARTS, if you think you can.”";
  const where = Object.keys(ROOMS).filter(r => ROOMS[r].darts).map(r => _barName(r)).filter(Boolean).slice(0, 5);
  return `“Not here — no board.” A shrug at the town. “${where.join(", ")} keep one. Ask for the chalk.”`;
}
function _topicMiss(npcId) {
  const n = NPCS[npcId];
  const she = n.pronoun === "she" || NPC_ROLES[npcId] || n.filler;
  const pool = _thaiVoice(npcId) ? _TOPIC_MISS_TH : _TOPIC_MISS_EN;
  let line = pool[Math.floor(_rand() * pool.length)](n.name);
  if (!she && pool === _TOPIC_MISS_TH) line = line.replace("her head", "his head").replace("the wrong girl", "the wrong man");
  if (she && pool === _TOPIC_MISS_EN) line = line.replace("shakes his head", "shakes her head");
  return line;
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
  const firstEver = !repeat && seen.length === 0;
  if (!repeat) seen.push(idx);
  if (d.th && !terse) { _say(`${n.emoji} ${n.name}: “${d.th}” (${d.rom})`, "thai"); _engineSpeak(d.th); }
  _say(_fillSaid(terse ? (d.short || _askAgain(npcId)) : d.text));
  // Courted before you ever talked (drinks first, introductions after — a
  // legitimate Pattaya order of operations): the authored greeting reads
  // tone-deaf if it pretends the ledger is blank, so acknowledge it under the
  // intro rather than rewriting every intro (playtest #12).
  if (firstEver && (G.soc.drinks[npcId] || 0) >= 2 &&
      ["hostess", "cashier", "mamasan"].includes(NPC_ROLES[npcId])) {
    _say(_pickVary([
      "(The introduction is a formality — the lady drinks got there first, and " +
        "the smile she says it with is already yours.)",
      "(She says it like a first hello, but her hand finds your arm with the " +
        "ease of a woman whose ledger already has your name in it.)",
      "(First names, at last — several drinks after the drinks made them " +
        "unnecessary. Both of you enjoy the ceremony anyway.)",
    ], "courtfirst"), "dim");
  }
  for (const f of d.sets || []) _setFlag(f);
  if (d.gives && G.itemLoc[d.gives] === null) {
    G.itemLoc[d.gives] = "inventory";
    // article-aware: "your wallet" must not become "the your wallet"
    _say(`(You now have ${/^(your|the|a|an)\b/i.test(ITEMS[d.gives].name) ? "" : "the "}${ITEMS[d.gives].name}.)`, "dim");
    if (d.gives === "wallet") {
      G.money += WALLET_CASH;
      _say(`(Most of the cash is still in it — ฿${WALLET_CASH} back in play.)`, "dim");
    }
  }
  const st = _npcState(npcId);
  if (!repeat && d.fx) d.fx(st, G);           // state-machine effects, first delivery only
  // first contact (any exchange) IS the meeting: advance the state and grant the
  // baseline trust here, so the meeting bonus never depends on which node fired.
  if (st.dstate === "stranger") { st.dstate = "met"; st.trust = Math.min(5, st.trust + 1); }
  // this node is now the live one — its `choices` (if any) become the action-choices
  G.convoIdx = G.convo === npcId ? idx : G.convoIdx;
  if (d.choices && d.choices.length) (G.convoChoiceMemo = G.convoChoiceMemo || {})[npcId] = idx; // typed labels outlive the next ask (27-night playtest)
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

// The bar's ambient regular — atmosphere, NOT a person you can reach. He's
// deliberately never in the "Here:" list and can't be talked to, so the wording
// has to read as furniture-you-overhear, not an unmet character (an undelivered
// promise otherwise). Pooled — it prints on every bar describe. The "busy" pool
// takes the clause naming whichever hostess he's monopolising.
const _BAR_REGULAR = [
  "Down the far end, a knot of regulars are welded to the bar, deep in an argument only they follow — part of the furniture, not the cast.",
  "A lifer holds down the corner stool, holding forth at the room in general; the kind of fixture you nod past, never actually meet.",
  "The far stools run to the usual weathered faces — here before you, here after you, and not looking for anyone new tonight.",
  "Somewhere down the bar a regular drones on to nobody in particular, background hum under the music.",
];
const _BAR_REGULAR_BUSY = [
  g => _fmt("Down the far end a sunburnt regular holds court{g}, sealed in his own little world — no seam in it for you to get a word through.", { g }),
  g => _fmt("A red-faced fixture works the far stools{g}, mid-story, mid-myth; whatever that is, it isn't yours to join.", { g }),
  g => _fmt("At the far end a regular reigns{g} — the sort of scene you watch from across the bar, not one you walk into.", { g }),
];

// Where the dog actually settles. Keyed on what the room IS rather than on
// whether it happens to carry a `bar` display name, which put him at your heel
// inside an air-conditioned mall with security guards who wai, and folded him up
// "outside the door" of an open-air market that has no door and is, of all the
// places in this town, the one most full of dogs (persona report A#21,
// 2026-08-23).
function _dogSpot(r) {
  if (r.barType === "beer") return "under";                 // open front, no door to stop him
  if (/market|bazaar/i.test(r.name || "")) return "heel";   // tarpaulins and scraps: his country
  if (/\bmall\b|central festival/i.test(r.name || "")) return "outside";  // glass, aircon, guards
  if (r.bar || r.barType || r.massage || r.soapy || r.hostBar) return "outside";
  if (_isHotelRoom(G.room) || r.shop || r.food) return "mat";
  return "heel";
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
      : G.dog
      ? _dogN("It is pitch dark. Your phone's flashlight would help — though the " +
        "growl waiting somewhere in it is a soi-dog problem, and soi-dog problems " +
        "are, these days, Sai Krok's department.")
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
  // a street can carry a post-midnight paint (`lateDesc`): the Khao Talo prose
  // kept advertising Mama Yai's charcoal smoke after the shutters (playtest 2026-08-22)
  const late = r.lateDesc && typeof _closesMidnight === "function" && G.nightTurn >= 60;
  if (full) _say(late ? r.lateDesc : (!firstTime && !forceFull && r.revisit ? _pickVary(r.revisit, "rv:" + G.room) : r.desc));
  const items = Object.keys(G.itemLoc).filter(id => _here(id));
  if (items.length) {
    // An item may carry a `sight:` line that places it in the scene ("...at the
    // foot of the spirit house") instead of the bare name-list — for things where
    // WHERE it lies is part of the room. Items without one fall into the list.
    const placed = items.filter(id => ITEMS[id].sight), listed = items.filter(id => !ITEMS[id].sight);
    placed.forEach(id => _say(_L(ITEMS[id].sight)));
    if (listed.length) _say(_L("You can see: ") + listed.map(id => _L(ITEMS[id].name)).join(", ") + ".");
  }
  // The coconut bar (north_beach): its ladies are an encounter, not roster NPCs,
  // so LOOK never listed them and a player couldn't tell they were approachable
  // (playtest, 2026-08-15). State-aware: working until the night's encounter is
  // spent, empty stools after.
  if (G.room === "north_beach") {
    _say(G.encDone && G.encDone.freelancer
      ? "The freelance stools under the palms sit empty now — the night's trade has moved on."
      : "Under the coconut palms, the freelance stools are working — a cigarette ember, " +
        "a low laugh, eyes reading the sand for a walk-up. (TALK TO THE LADIES, if you like.)", "dim");
  }
  const npcs = _npcsHere();
  const pats = _patronsHere();
  // One presence line for everyone actually in the room — staff and patrons in the
  // same "Here:" list (it used to split into "Here:" + "At the rail:", which read
  // like two separate crowds and confused who you could talk to). NPCs carry just
  // their name; patrons still carry (age, nat).
  const here = npcs.map(id => `${NPCS[id].emoji} ${_npcLabel(id)}`)
    .concat(pats.map(id => `${PATRONS[id].emoji} ${PATRONS[id].name}`)); // just emoji + name — age/nat live in EXAMINE
  if (here.length) _say(_L("Here: ") + here.join(", ") + ".");
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
  // The Orchid good table: once Tan's near-confirmation has armed it, walking in
  // (or LOOKing) pays off the whole hidden-hub arc — see _tanOrchidReveal.
  if (G.room === "orchid_room") _tanOrchidReveal();
  const exits = Object.keys(r.exits);
  if (exits.length) _say(_L("Exits: ") + exits.join(", ") + ".", "dim");
  // A warning at the DOOR, not after you have walked through it. The only way
  // out of your own hotel room is an unlit soi with a dog in it, and a player on
  // day four lost the entire night at nightTurn 2 without a single successful
  // action (persona report A#2, 2026-08-23). Once a night, in your own room,
  // while the torch is off and the exit is dark.
  if (full && _isHotelRoom(G.room) && !G.lightOn && G.battery > 0 &&
      G.darkDoorDay !== G.day && r.exits) {
    const darkOut = Object.values(r.exits).some(to => ROOMS[to] && ROOMS[to].dark);
    if (darkOut) {
      G.darkDoorDay = G.day;
      _say("(The soi outside has no working lights, and it has dogs. LIGHT ON " +
        "before you step out — the phone does it, and it costs almost nothing.)", "dim");
    }
  }
  // Buildings fronting this block: entered by name or a tap, not by a compass
  // point (a busy soi can front 4–6 of them, and a door isn't a block away —
  // it's right here). "Exits" is roads only now; the venues list is the doors.
  let venues = _venuesHere(r);
  // the Orchid is somewhere you get SENT, not somewhere you find — keep it off the door list until you have been
  if (!_flag("orchidVouched") && !_flag("orchidReported")) venues = venues.filter(id => id !== "orchid_club");
  // …but not in your own hotel room, whose single DOWN/OUT is the venue the
  // exit-scan fallback would otherwise re-list as "Step inside: <the bar below>".
  if (venues.length && G.room !== _hotelRoomId()) {
    _say(_L("Step inside: ") + venues.map(id =>
      (ROOMS[id].bar || ROOMS[id].name).replace(/\s*\(.*\)$/, "")).join(", ") +
      _L(". (ENTER <name>)"), "dim");
  }
  // the dog: at your heel outside; through the rail and under your stool in the
  // open-air beer bars (no door to stop him, and nobody would dream of it); by
  // the door everywhere else (dogs know the one rule and keep it better than
  // most customers)
  if (G.dog && G.dogRoomSeen === G.room) {
    // already announced here — a LOOK doesn't walk him in again (playtest 2026-08-22);
    // he's simply where he is
    const _spot = _dogSpot(r);
    if (_spot === "under") _say(_dogN("(Sai Krok is under your stool, one ear up.)"), "dim");
    else if (_spot === "outside") _say(_dogN("(Sai Krok, outside the door, chin on paws.)"), "dim");
    else if (_spot === "mat") _say(_dogN("(Sai Krok is on the mat by the door.)"), "dim");
    else _say(_dogN("Sai Krok pads at your heel, nose reading the street."), "dim");
  } else if (G.dog) {
    G.dogRoomSeen = G.room;
    const _spot = _dogSpot(r);
    if (_spot === "under") {
      _say(_dogN("(Sai Krok trots in under the rail — no door to stop him — and folds up " +
        "beneath your stool.)"), "dim");
      _dogBarFavor();
    } else if (_spot === "outside") {
      _say(_dogN("(Sai Krok folds up outside the door, chin on paws, one ear on the room.)"), "dim");
    } else if (_spot === "mat") {
      _say(_dogN("(Sai Krok turns three circles on the mat inside the door and drops, chin on paws.)"), "dim");
    } else if (/market|bazaar/i.test(r.name || "")) {
      _say(_dogN("(Sai Krok is three stalls ahead before you have finished arriving. This is " +
        "his industry, and he has contacts in it.)"), "dim");
    } else {
      _say(_dogN("Sai Krok pads at your heel, nose reading the street."), "dim");
    }
    if (G.room === "khao_talo_strip") _dogShamrock(); // the dead pub knows him
  } else if (_flag("act1Done") && !r.bar && !r.barType && !r.massage && !r.soapy &&
      !r.hostBar && !_isHotelRoom(G.room) && !_isDarkHere() && !G.rain && G.dogNudgeDay !== G.day && _rand() < 0.35) {
    // the un-adopted dog makes himself known: at most once a night, lit streets
    // only (never a hotel room — he can't climb to your balcony), and never
    // during Act One's tight opening
    G.dogNudgeDay = G.day;
    _say(_pickVary([
      "A soi dog with one clipped ear falls in beside you for half a block, matching " +
        "your pace with off-duty professionalism, then peels away at the soi mouth with " +
        "one look back. (FEED DOG, if you'd like that to go differently.)",
      "The clipped-ear dog is at the soi mouth again, sitting like a man waiting for a bus. He " +
        "watches you pass with no expectation whatsoever, which is somehow worse. (FEED DOG, if you like.)",
      "Nose down, one ear up, the clipped-ear dog checks the gutter ahead of you, finds nothing, " +
        "and glances back as if you might be the something. (FEED DOG — or don't; he's heard it before.)",
    ], "dognudge"), "dim");
  }
  // CAPS so the hints tap: the open kw prefills "ride bus to " and the
  // destination list rides the suggest bar — the whole fare is keyboard-free.
  // Only promise an EASY bus when one will come quickly: in the rain none
  // stops, and in the Soi 6 week the routes out aren't yours. The small hours
  // don't kill the stop any more — they make it a wait (design call 2026-08-25:
  // the buses run all night, sparse after two; the only curfew is on you).
  if (r.busStop) {
    if (G.mode === "soi6" || G.rain > 0) { /* the RIDE BUS refusal / rain block covers it */ }
    else if (G.nightTurn >= LAST_BUS_TURN)
      _say("The bus-stop bench sits empty at this hour — a songthaew will come, " +
        "eventually, to whoever waits. (RIDE BUS TO <place>, and settle in.)", "dim");
    else _say("A baht bus can be caught here. (RIDE BUS TO <place>)", "dim");
  }
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
      (_leagueTonight() ? ` Tonight is LEAGUE NIGHT (PLAY KILLER, ฿${KP_ENTRY} in the ashtray).` : ""), "dim");
  }
  if (r.seven) _say("A 7-Eleven glows across the way (BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM).", "dim");
  if (_quizDay() && !r.barType) {
    const near = [...new Set(Object.values(r.exits))].filter(to => _quizBars().includes(to));
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
  if (typeof _hasPoster === "function" && _hasPoster()) {
    _say("A promo poster of one of the girls hangs by the door. (POSTER)", "dim");
  }
  if (_salengHere()) { // a parked cart re-announces itself so a reload isn't blind to it
    const c = _SALENG_CARTS[G.salengCart];
    _say(c.here + " " + c.hint, "dim");
  }
  if (r.barType) {
    if (G.soc.patronBusy[G.room]) {
      // name the SAME girl the snipe-jealousy keys on (parser); legacy `true`
      // falls back to the first hostess present
      const busyId = G.soc.patronBusy[G.room];
      const _descHas = id2 => new RegExp("\\b" + NPCS[id2].name + "\\b").test(String(r.desc || ""));
      const girl = (typeof busyId === "string" && _npcsHere().includes(busyId))
        ? busyId
        : _npcsHere().find(id => NPC_ROLES[id] === "hostess" &&
            id !== (typeof _convoActive === "function" && _convoActive()) && !_descHas(id));
      const g = girl ? `, ${NPCS[girl].name} laughing on cue beside him` : "";
      if (girl) _say(_pickVary(_BAR_REGULAR_BUSY, "barReg")(g), "dim");
      else _say(_pickVary(_BAR_REGULAR, "barReg"), "dim");
    } else {
      _say(_pickVary(_BAR_REGULAR, "barReg"), "dim");
    }
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

// Pass time inside a multi-tick action (short-time, massage, soapy, night ride,
// etc.). Ticks up to n times but ABORTS the moment the night actually ends —
// _endNight advances G.day, so a day change is the signal. Returns true if the
// night ended mid-pass (the caller should stop). Replaces the old `if (G.over)`
// guards, which never fired (G.over is never set true), so those loops used to
// tick straight past _endNight into the next night.
function _passTime(n) {
  const startDay = G.day;
  for (let i = 0; i < n; i++) {
    _tick();
    if (G.day !== startDay || G.pendingChoice === "vacation_end") return true;
  }
  return false;
}

// Take n points of injury, capped, and enforce the "third one puts you in the
// clinic" rule uniformly — several sites (the barfine jealousy scene, poaching
// anger) used to bump hurt WITHOUT the hospital check, silently pinning you at
// max with no ending. Print the injury prose first, then `if (_hurt(n)) return;`.
const HURT_CAP = 3;
function _hurt(n) {
  G.hurt = Math.min(HURT_CAP, (G.hurt || 0) + n);
  if (G.hurt >= HURT_CAP) { _endNight("hurt"); return true; }
  return false;
}

// Move a girl's bond (G.soc.drinks[id]) by n and return the new total. n may be
// negative (souring, nightly decay); the bond floors at 0. This IS _bondTier's
// underlying counter — the one place attention of every kind is tallied.
function _addBond(id, n) {
  G.soc.drinks[id] = Math.max(0, (G.soc.drinks[id] || 0) + n);
  return G.soc.drinks[id];
}

// Round a baht figure to the nearest ฿50 — how every negotiated price on the soi
// lands (mamasan maths, never odd change).
function _round50(n) { return Math.round(n / 50) * 50; }

// ── Reputation: the soi's collective read on you ────────────────────────────
// A single town-wide standing, distinct from per-girl bond / per-NPC trust /
// per-bar heat / faction alignment. It colours how STRANGERS receive you before
// you've earned anything with them. Deliberately asymmetric: good conduct is
// throttled to +1 a day (a good day is a good day, no matter how many rounds you
// stand), while incidents land in full and stack — reputation is slow to build,
// quick to lose. Only tracked once the opening quest is behind you (act1Done);
// player-local, so it stays per-player in any future shared world.
const REP_MIN = -20, REP_MAX = 20;
function _repGain() {
  if (!_flag("act1Done")) return false;
  if (G.repDay === G.day) return false;      // today's goodwill is already banked
  G.repDay = G.day;
  G.rep = Math.min(REP_MAX, (G.rep || 0) + 1);
  return true;
}
function _repHit(n) {                          // an incident: lands in full, uncapped, stacks
  if (!_flag("act1Done")) return false;
  G.rep = Math.max(REP_MIN, (G.rep || 0) - Math.abs(n));
  return true;
}
function _repTier() {                          // −2..+2, drives effects + the label
  const r = G.rep || 0;
  if (r <= -10) return -2;
  if (r <= -3) return -1;
  if (r >= 10) return 2;
  if (r >= 3) return 1;
  return 0;
}
const _REP_LABELS = {
  "-2": "trouble — a name that walks into the bar a step ahead of you",
  "-1": "a bit of a liability — the soi has stories, and not the fond kind",
  "0": "nobody in particular yet — the soi hasn't made up its mind",
  "1": "a good sort, the kind the mamas nod to",
  "2": "a proper face on the soi — known, and mostly liked",
};

function _tick() {
  if (typeof _questTick === "function") _questTick();
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
  // latched threshold warnings: hunger/thirst only tick up every 2-3 turns, so an
  // `=== 70` check fired 2-3× while the meter dwelt on the value. Fire once on the
  // crossing, re-arm only after the meter drops back below (eat/drink and re-cross).
  G.warned = G.warned || {};
  const _warn = (k, on, m) => { if (on) { if (!G.warned[k]) { _say(m, "alert"); G.warned[k] = true; } } else G.warned[k] = false; };
  _warn("h70", G.hunger >= 70 && G.hunger < 90, "(Your stomach growls loudly enough to turn heads. Eat something.)");
  _warn("t70", G.thirst >= 70 && G.thirst < 90, "(Your throat is sandpaper. Drink something — ideally water.)");
  _warn("h90", G.hunger >= 90, "(You are running on fumes. Food. Now.)");
  _warn("t90", G.thirst >= 90, "(Dizzy. The neon is doing things it shouldn't. WATER.)");
  if ((G.hunger >= 80 || G.thirst >= 80) && G.nightTurn % 10 === 0) {
    _addHappy(-1, G.thirst >= G.hunger ? "you're parched" : "you're starving");
  }
  if (typeof _tanRescue === "function") _tanRescue();   // the fixer finds a lost first-timer
  if (G.hunger >= 100 || G.thirst >= 100) { _endNight("collapse"); return; }
  if (G.nightTurn >= NIGHT_TURNS) { _endNight("dawn"); return; }
  // rainy season: when the bake says storm, the sky sometimes proves it — and
  // in the SW-monsoon months (the calendar wet season) even an ordinary rainy
  // sky opens up, because that is what those months ARE. The bake still gates
  // every path, so a bake-less game never touches the dice (both _wx* return
  // false without WX_NOW) and stays byte-identical.
  if (G.rain > 0) {
    G.rain--;
    if (G.rain === 0) {
      _say("The rain stops the way it started — all at once, like a tap. The " +
        "street steams, the music comes back up to volume, and the town picks " +
        "up exactly where it left off.", "alert");
    }
  } else if (_wxStormy() && G.turns - G.lastRain >= 30 && _rand() < 0.08) {
    _startRain(3 + Math.floor(_rand() * 6));
  } else if (_wetSeason() && _wxRainy() && G.turns - G.lastRain >= 30 && _rand() < 0.11) {
    // the monsoon-months amplifier: a rainy (not stormy) sky becomes a downpour
    _startRain(3 + Math.floor(_rand() * 6));
  } else if (_wxRainy() && G.turns - G.lastDrizzle >= 15 && _rand() < (_wetSeason() ? 0.10 : 0.05)) {
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
  if (typeof _flowerTick === "function") _flowerTick(); // open-air-bar flower seller (once/night, when courting a girl)
  _closingTick(); // midnight: gents/Soi 6/Darkside give last call, then bolt or shutter
  // Quiz capture was only checked on ARRIVAL, so the obvious punter move —
  // settle in early with a pint — missed the quiz entirely even after TIME
  // advertised it (Gaz playtest, 2026-08-17). If the window opens while you're
  // already sitting in a quiz bar, the microphone finds you at your stool.
  if (typeof _quizHere === "function" && !G.game && !G.pendingEnc && !G.pendingChoice && _quizHere()) {
    _say("The chalkboard goes up, the microphone crackles, and the room turns as one " +
      "— you were here first, so you're playing.", "win");
    _startQuiz(true);
  }
  // Same bug class as the quiz above, and the same fix: Tan's favour and the
  // procurement beats were checked ONLY on arrival at your own bar, and both
  // need nightTurn >= 30 — so the owner who opens up early and stays put (which
  // is exactly what WORK encourages) never met his own partner. 65 nights of
  // ownership without a single one (actuary playtest 2026-08-23). If the hour
  // comes round while you're already stood behind your own bar, it finds you.
  if (!G.game && !G.pendingEnc && !G.pendingChoice && !G.pendingBf && !G.pendingFare) {
    if (typeof _tanFavourDue === "function" && _tanFavourDue()) { _tanFavour(); return; }
    if (typeof _shiftDue === "function" && _shiftDue()) { _shiftAsk(); return; }
  if (typeof _synDue === "function" && _synDue()) { _synAsk(); return; }
  }
  if (typeof _workPresenceTick === "function") _workPresenceTick(); // a declared shift has to be stood
  if (typeof _workFloor === "function") _workFloor();          // …and a stood shift is where your own staff live
  _lastBusWarn();  // ~01:30: heads-up that the last ฿15 ride home is about to leave
  _maybeIncomingText();
  if (typeof _wrongNumberTick === "function") _wrongNumberTick(); // CTF stage 2 (docs/ctf.md), only if a probe armed it
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
        _say(_dogN(_pickVary([
          "A growl starts somewhere in the dark ahead — and Sai Krok answers it, " +
            "once, low, without breaking stride. Silence. The dark has done the maths.",
          "Something moves at the edge of the light. Sai Krok doesn't growl; he simply stops, " +
            "and looks at it, and whatever it was decides it has business elsewhere.",
          "Eyes in the dark, three pairs. Sai Krok walks on past them at your heel with the " +
            "flat indifference of a dog who knows all three by name and rates none of them.",
          "A bark from an unlit gateway; Sai Krok's head turns a quarter-inch and the bark " +
            "finishes mid-syllable. The soi's franchise knows the franchise-holder.",
        ], "doggrowl")), "dim");
        _engineSfx("growl");   // the prose says he answers it; let him
      }
      G.darkStreak = 1; // held, never escalates
      return;
    }
    G.darkStreak++;
    if (G.darkStreak === 1) {
      _say("Something shifts in the dark nearby. A low growl. You are likely to be " +
        "bitten by a soi dog.", "alert");
      _engineSfx("growl");   // theirs, not yours — the warning you get instead of a dog
    } else if (G.darkStreak >= 2) {
      const food = ["noodles", "moo_ping"].find(id => _inv().includes(id));
      if (food) {
        G.itemLoc[food] = null;
        G.darkStreak = 0;
        _engineSfx("snarl");   // it lunges here too — the food just buys the ending
        _say(`A soi dog lunges out of the dark! You hurl the ${ITEMS[food].name} on ` +
          "pure instinct. It catches it mid-air with terrifying grace and trots " +
          "off. Goodbye, dinner.", "alert");
      } else {
        const bitten = Math.min(G.money, 30);
        G.money -= bitten;
        G.darkStreak = 0;
        const exit = Object.values(_room().exits).find(to => !ROOMS[to].dark) ||
          Object.values(_room().exits)[0];
        const _toDark = !!(ROOMS[exit] || {}).dark;
        G.room = exit;
        _engineSfx("snarl");   // it has stopped warning you
        // "…and fetch up somewhere lit" was unconditional, but the light-seeking
        // exit is a preference with a fallback: where EVERY exit is dark (five
        // rooms — the Thappraya climb, Dongtan middle, Buddha Hill, two Jomtien
        // beach nodes) you land in the dark and the line says otherwise. Reported
        // independently by TWO playtests (churner 2026-08-23, opening auditor the
        // same day), which is what makes it structural rather than a nitpick —
        // and it matters, because you can be bounced dark-to-dark and take
        // consecutive bites toward the three-strike reset.
        _say("A soi dog bites you! You flee blindly, shedding " +
          (bitten ? `฿${bitten} in dropped coins` : "what remains of your dignity") +
          (_toDark
            ? ", and fetch up somewhere no better lit than the last one."
            : ", and fetch up somewhere lit."), "alert");
        _addHappy(-2);
        G.hurt++;
        // The three-strike counter lived only in DIAGNOSE, so a player who never
        // typed it met a hidden third strike (opening auditor 2026-08-23).
        if (G.hurt < 3) _say(`(Bitten — that's ${G.hurt} of 3. A third ends the night in the ward.)`, "alert");
        if (G.hurt >= 3) { _endNight("hurt"); return; }
        _describeRoom(true);
      }
    }
  } else {
    G.darkStreak = 0;
  }
}

