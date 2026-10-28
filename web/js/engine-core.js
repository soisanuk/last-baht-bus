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
let CHEATS_ENABLED = false;

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
// THE LOCALIZATION SEAM, DORMANT (see docs/i18n-seam.md). _L translates an English
// source string to the player's language with English fallback; it reads a catalog
// global `_CATALOGS` that NO FILE DEFINES TODAY — the German translation was retired
// in 2026-10 because a catalog keyed by exact English source has to be re-keyed every
// time a line of prose moves, and it was. So this is identity for every player, and
// the `typeof` guard is what makes that safe rather than a crash.
// It is kept, with its ~80 call sites, because the seam is the cheap part and the
// marked strings are the expensive part: reviving a language means writing a catalog
// and restoring one LANGUAGES entry, not re-plumbing the engine. Only whole FIXED
// strings match — interpolated composites go through _fmt below.
function _L(s) {
  const lang = G && G.player && G.player.lang;
  if (!lang || lang === "en" || typeof _CATALOGS === "undefined" || !_CATALOGS[lang]) return s;
  const hit = _CATALOGS[lang][s];
  return hit != null ? hit : s;
}

// String interpolation: for a line whose values are spliced in at runtime (money,
// clock, counts), author it as a TEMPLATE with {named} placeholders and fill it
// here, rather than concatenating. Named slots are why this is worth a helper —
// they can be reordered by a translation without touching the call site, which is
// the seam's half of _fmt (docs/i18n-seam.md); the other half is simply that a
// template reads better than a string built with +. Unfilled slots are a bug the
// soak catches (its `defmt` warning).
//   _say(_fmt("day {day} of 7.", { day: G.day }))
function _fmt(en, params) {
  // a number standing after ฿ prints with its separator, whoever passed it raw (the money
  // audit, F: "฿{take}" printed ฿12500 on the settle line, BOOKS and the shift call)
  return _L(en).replace(/(\u0e3f?)\{(\w+)\}/g, (m, cur, k) => (params && params[k] != null)
    ? cur + (cur && typeof params[k] === "number" ? _num(params[k]) : params[k]) : m);
}

// Thousands formatting for a money/count figure. Call this rather than
// .toLocaleString() at the call site: the bare form defaults to the RUNTIME's
// locale, not the game's, so a machine set to de-DE used to print ฿150.000 in an
// English game. Pinning the locale here is what keeps every price identical for
// every player on every machine. Part of the dormant seam (docs/i18n-seam.md):
// a revived language picks its locale here, in one place.
function _num(n) {
  return Number(n).toLocaleString("en-US");
}

// Plural suffix for an {s} slot in an _fmt template, so a count and its noun
// agree without the call site branching. English-only, which is the whole game
// today. Worth knowing if a language ever comes back (docs/i18n-seam.md): a
// language that pluralizes differently cannot share one {s} placeholder, and
// this needs a per-noun suffix argument again — "3 Kondoms" for "3 Kondome" was
// the bug that proved it.
function _plural(n) {
  return n === 1 ? "" : "s";
}

function _say(text, cls) {
  _learnNames(text); // name/Thai harvest run on the ENGLISH source (language-independent)
  // collect the Thai the night shows you (capped, deduped) — the trainer
  // (same origin) reads it out of lbb_save and offers "words from the bus"
  // your own sentence echoed back is not the town talking (Nattapong, round 56: NOTEBOOK
  // filed his typed Thai under what the town had said at him)
  if (G && G.thaiSeen && !/^You say( to [^:]+)?:/.test(text)) {
    for (const run of text.match(/[\u0E00-\u0E7F]{2,}/g) || []) {
      if (!G.thaiSeen.includes(run)) {
        G.thaiSeen.push(run);
        // 300, not 60: SCORE reports thaiSeen.length as a running total ("N Thai
        // words picked up"), so a cap a real playthrough could actually reach
        // made the counter silently freeze while the FIFO quietly drained words
        // out the back — words a real player earned, and words the trainer app
        // reads out of this same save for its own practice deck (the Collector,
        // 2026-08-27). 300 short strings is a couple KB; the save can afford it.
        if (G.thaiSeen.length > 300) G.thaiSeen.shift();
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
  const _ew = String(t.extra || "").split(/\s+/).filter(Boolean);   // eight words, and say so when cut ("who else should i" — Siobhan, round 77)
  const extra = _ew.slice(0, 8).join(" ") + (_ew.length > 8 ? "…" : "");
  if (t.verb === "ask")
    return `· You asked ${target}${extra ? ` about ${extra}` : ""}`.trimEnd();
  if (t.verb === "give")
    return `· You gave ${target}${extra ? (/^(a|an|the|your|his|her|their)\b/i.test(extra) || /^\w+'s\b/.test(extra) ? ` ${extra}` : ` the ${extra}`) : ""}`.trimEnd();
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
  if (line) _enginePrint(line, "trace");
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

const _NOT_A_NAME = /\bmoo ping\b|\bping[- ]?pong\b|\bsom tam\b|\bsang ?som\b|\bDear (?:lady|boy|girl|sir|madam|friend|me|god|heart|old|chap|fellow|Khun|Mister|Mr)\b|(?:^|[“"(]\s*)Dear\b(?=[^.!?]{0,40},)/gi;   // "Dear lady" is not Dear (Ingrid, round 103)
const _NOT_A_NAME_CAPS = /\b(?:BUY|GIVE|HOLD|HOLDING)\s+(?:A\s+)?ROSES?\b|\bROSES?\s+(?:FOR|TO)\b|\bGIFT\s+(?=[<$\d])|\bABOUT ICE\b/g;
function _learnNames(text) {
  if (!G || !G.known) return;
  if (!_nameRx) {
    _nameRx = [];
    const rosters = [NPCS];
    for (const roster of rosters) {
      for (const [id, n] of Object.entries(roster)) {
        // "Madam Oy" → "Oy" — but DJ Beer is not "Beer": Auntie Nok's "Beer, whisky,
        // soda — all same" filed him as somebody she mentioned (Dieter and Nattapong, round 56)
        const last = /^(Beer)$/.test(n.name.split(" ").pop()) ? n.name : n.name.split(" ").pop();
        if (!/^[A-Z]/.test(last)) continue;   // "security" is nobody's name
        // …in prose case OR in the tappable-hint case: "(ASK GAVIN at the
        // Golden Dragon…)" printed his name and taught nobody it, so the
        // elsewhere-line that would have placed him never fired and a man
        // walked the whole map for a bar one ENTER away (Nige, round 36)
        _nameRx.push([id, new RegExp("\\b" + last + "\\b"), new RegExp("\\b" + last.toUpperCase() + "\\b")]);
      }
    }
  }
  // A venue's display name is blanked before the scan, and the CAPS form of a
  // name counts only inside parentheses — the tap idiom "(ASK ROSE …)" — never in
  // prose capitals: "SILK ROSE shares the block" filed Rose, the mamasan at Notty's,
  // as somebody you had heard of (Ruth, round 47).
  _learnVenues(text);
  let scan = text;
  if (_venueRx) for (const [, , vname] of _venueRx) {
    const esc = vname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    scan = scan.replace(new RegExp("\\b(?:" + esc + "|" + esc.toUpperCase() + "|" + esc.replace(/ Bar$/i, "").toUpperCase() + ")\\b", "g"), m => " ".repeat(m.length));
  }
  // A word that is somebody's name is not always somebody: MOO PING taught the journal two Pings
  // (Lennart, round 68 — the Gilt Cage twins met the saleng's hint), and BUY ROSE, GIFT <amount>,
  // SOM TAM and ABOUT ICE are the same shape. Blanked before the scan; a hint that means the
  // person ("ASK CANDY ABOUT ROSE") still teaches her.
  scan = scan.replace(_NOT_A_NAME, m => " ".repeat(m.length)).replace(_NOT_A_NAME_CAPS, m => " ".repeat(m.length));
  const parens = (scan.match(/\([^)]*\)/g) || []).join(" ");
  // A SHARED NAME MARKS ONE WOMAN, NOT EVERY WOMAN WHO WEARS IT (the namesake audit, 2026-10-09): "Fon"
  // printed in one bar taught the journal both Fons. The one meant is the one in the room, or the one
  // whose bar the same line names; with neither, a stranger's name is nobody yet.
  const _hits = _nameRx.filter(([id, rx, rxCaps]) => rx.test(scan) || rxCaps.test(parens));
  const _bySrc = new Map();
  for (const h of _hits) { const k = h[1].source; if (!_bySrc.has(k)) _bySrc.set(k, []); _bySrc.get(k).push(h); }
  const _here = typeof _npcsHere === "function" ? _npcsHere() : [];
  const _meant = [];
  for (const grp of _bySrc.values()) {
    if (grp.length === 1) { _meant.push(grp[0]); continue; }
    const pres = grp.find(([id]) => _here.includes(id));
    if (pres) { _meant.push(pres); continue; }
    const byBar = grp.filter(([id]) => { const r = typeof _npcRoom === "function" ? _npcRoom(id) : NPCS[id].room; const bn = r ? _barName(r) : null; return bn && String(text).includes(bn); });
    if (byBar.length === 1) _meant.push(byBar[0]);
  }
  for (const [id, rx, rxCaps] of _meant) {
    if (!G.known[id] && (rx.test(scan) || rxCaps.test(parens))) {
      G.known[id] = true;
      // provenance: the frontier HINT can say "Candy mentioned her, at Candy Bar"
      // instead of "somebody mentioned Bee" (design note, 2026-09-15)
      if (G.namedBy) {
        // …and only a line with SPEECH in it is somebody mentioning: a quest's own text printed
        // while you happened to be talking to Ploy credited her with naming Pim (Fintan, round 60)
        const by = (/[“"]/.test(String(text)) && _convoActive()) || null;
        // a name on the room's Here: line is a face you SAW, not somebody mentioned (Ines, round 47)
        G.namedBy[id] = { room: G.room, by, day: G.day, seen: !by && _npcsHere().includes(id) };
      }
    }
  }
}
// A venue whose NAME printed before you stood in it is a frontier edge — "you've
// heard the name, never been". Same harvest as names, over the display names.
let _venueRx = null;
let _regionRx = null;
function _learnVenues(text) {
  if (!G || !G.heardOf) return;
  if (!_venueRx) {
    _venueRx = [];
    for (const [id, r] of Object.entries(ROOMS)) {
      if (!r.bar || r.bar.length < 5) continue;
      const esc = String(r.bar).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      _venueRx.push([id, new RegExp("\\b" + esc + "\\b"), String(r.bar)]);
    }
  }
  for (const [id, rx] of _venueRx) {
    if (!G.heardOf[id] && !(G.visited && G.visited[id]) && rx.test(text)) G.heardOf[id] = true;
  }
  // …and a REGION said aloud ("my Sang Som girl at Myth Night") is heard too (Jens, round 67)
  if (!_regionRx) _regionRx = [...new Set(Object.values(ROOMS).map(r => r.region).filter(Boolean))].map(rg => [rg, new RegExp("\\b" + rg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b")]);
  G.heardRegion = G.heardRegion || {};
  for (const [rg, rx] of _regionRx) if (!G.heardRegion[rg] && rx.test(text)) G.heardRegion[rg] = true;
}

// The gate itself: a topic that is somebody's name is only *offered* — by
// the flyout wheel and the input autocomplete — once that character is
// known. Topics that aren't names always pass.
// A MULTI-WORD NAME IS GATED ON BOTH HALVES. This compared a topic only to the
// LAST word of a name, so "duncan" matched nothing, fell through to "not a
// person" and TOPICS listed Laurent Vasseur before the player had met him — the
// one thing the gate exists to prevent. A blanket any-word match is the wrong
// fix: most multi-word names here are HONORIFIC + name (Auntie Nok, Mama Yai,
// Madam Oy, Mamasan Mem, Lake Gary), where the last word already is the name and
// gating the first would hide the `lake` topic behind Lake Gary and `mama`
// behind Mama Yai. So a first word counts only when it is not town vocabulary —
// DERIVED from room/bar names and NPC_ROLES, plus the four honorifics that no
// room happens to contain. Built once; NPCS and ROOMS do not change at runtime.
const _NAME_EPITHETS = new Set(["miss", "khun", "dj", "fast"]);
let _gateWordMap = null;
function _nameGateWords() {
  if (_gateWordMap) return _gateWordMap;
  const town = new Set(Object.values(typeof NPC_ROLES !== "undefined" ? NPC_ROLES : {}));
  for (const r of Object.values(ROOMS))
    for (const w of `${r.bar || ""} ${r.name || ""}`.toLowerCase().split(/[^a-z]+/))
      if (w) town.add(w);
  _gateWordMap = new Map();
  for (const [id, n] of Object.entries(NPCS)) {
    const full = String(n.name).toLowerCase(), parts = full.split(" ");
    const forms = new Set([full, parts[parts.length - 1]]);
    for (const w of parts.slice(0, -1))
      if (w && !town.has(w) && !_NAME_EPITHETS.has(w)) forms.add(w);
    for (const f of forms) if (!_gateWordMap.has(f)) _gateWordMap.set(f, id);
  }
  return _gateWordMap;
}
function _topicKnown(t) {
  if (!G || !G.known) return true; // save predates the gate: hide nothing
  const id = _nameGateWords().get(String(t).toLowerCase());
  return id === undefined ? true : !!G.known[id];
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
    showDay: 0,          // …and a go-go's stage (WATCH SHOW, round 69)
    catDay: 0,           // last day the Jomtien beach cats paid theirs
    buddhaDay: 0,        // last day you took the quiet at the Buddha Hill viewpoint
    loopDay: 0,          // last day riding the loop for its own sake paid its happy
    rep: 0,              // the soi's collective read on you (−20..+20); slow to build, quick to lose
    repDay: null,        // last day a good deed banked its +1 (the shared daily gain cap)
    dog: null,           // the accidentally-adopted soi dog: { since: day, name? } once you've fed him
    dogNudgeDay: 0,      // last day the un-adopted dog made his half-block approach
    dogRegion: null,     // the district the un-adopted dog was first seen in — his manor
    atmIn: 0,          // notes put back into the account at a machine (DEPOSIT)
    weekStart: null,   // pocket + account when the Soi 6 week began: the card's "spent" is start less end
    loanBorrowed: 0, loanRepaid: 0,   // running totals, like atmTotal: a loan is not a win on the morning ledger (Malcolm, round 59)
    blackouts: 0, walletLostDay: null, walletHeld: null,   // the second wallet (2026-10-21)
    homeSeen: {}, flatTold: {}, street: null, streetDone: null, roomPrepaid: null, glass: 0, potDay: null, envelopeDue: null, ledgerNotes: [], monthAdj: 0, monthClosing: null, monthRate: null, barSat: {},   // the resident's integration pass (round 100)
    loanPrin: 0, nontPrin: 0, nontCut: 0, nontOut: 0, offTill: 0, offIn: 0, skipRepaid: 0, quizWon: 0, giftIn: 0, lastNightBye: null,   // quiz prizes and a note pressed on you (round 93); principal repaid (not a cost), Nont's five percent, his notes (Clifford, round 68)
    motoHomeDoor: null,
    tanFavourDay: null, // the day Tan's name went on your staff list — her story is dated from it // a MOTOSAI TO HOTEL ride ends at the hotel door, set and spent inside _doMotosai
    streetLog: [],       // what happened on the pavement, and who was there to see it (_streetSaw — round 87)
    gifts: {},           // what you gave each woman, thing or baht, three days back: she remembers it (_giftNote — rounds 87–88)
    rideLog: {},         // night rides per girl: {count, day, stops, great} — she remembers, and so does "late"
    lastRide: null,      // {id, day, stops} — the coda knows she has a bike
    selfBfHold: 0,       // the self-barfine offer stands for a command or two
    safeMoneyDay: 0,     // the day Madam Oy's safe money landed
    safeMoneyLedger: false,
    metDay: {},
    massageLog: {},     // room → {last, n}: the shop remembers you (round 57)
    testedDays: [],     // clinic visits this vacation (round 57)
    metRoom: {},
    ownRescueDay: 0,     // the morning after going down behind your own rail (the ledger says so)
    tanFavourDay: 0,
    shiftAskText: null, // the shift call's question, for the resume redraw
    lifeStats: null,    // the long game's figures, kept at SELL UP for the ending's card
    visitUntil: 0,      // a week down from Prachuap after the good ending: the day the bus goes home     // the night Tan asked his favour — no job is put to you the same night         // …and where (JOURNAL RECORD said Candy Bar 2 of a woman met at Candy Bar)          // id → the day you first spoke (a greeting that says "since you left" needs you to have LEFT)   // …and whether the NEXT ledger has netted it in yet (see _morningLedger)
    chamDays: [],        // the distinct nights you sat with Cream — after a few, CONTACT nudges toward the question
    turns: 0,
    wingmanUntil: 0,     // G.turns before which a wing-woman is vouching for you
    darkStreak: 0,
    flags: {},
    offShift: null,      // a masseuse's off-shift number you carry: {id,name,home,day,ghost}
    hospitalVisits: 0,   // morning-after hospital scenes seen — rotates the prose so repeats vary
    returnHello: {},     // npc id → the vacation a written woman last gave her return greeting (Aurelio, round 71)
    acctBase: 0, acctUntil: 0, acctDay: null, acctWhy: null, launderRisk: [], launderBack: {}, streamSpent: 0, streamDrinks: {},   // the laundering doors' risk book (2026-10-22)   // the accountant's call: Nont's total at the last call, the review's end, the call's day
    coversNights: {},    // day → the men counted at Jasmine Garden that night (The Covers: a pattern is three nights, Mario 2026-10-08)
    licencesRead: {},    // room → the registered name read off the paper by the till (EXAMINE LICENCE, 2026-10-08)
    reviewOf: {},        // "speaker>colleague:kind" → the line she gives about her (round 77: an opinion is kept, not re-dealt nightly)
    frontierSaid: {},    // "vacation:cycle:phase" → the inner west's frontier line was told (Soi 6 expansion, 2026-10-09)
    questDoneDay: {},    // quest id → the day it completed (the follow-ups a month later: Orathai closes, the police read the paper)
    bankIn: 0,           // baht that ARRIVED in the account (_bankIn) — the morning ledger names it
    bankNotes: [],       // what the arrivals were, for the ledger's sentence (the pension, a reward)
    destitute: 0,        // consecutive roofless mornings (expat); DESTITUTE_DAYS is the plane
    destituteDay: null,  // the last morning counted
    roofless: null,      // the morning the clerk did not write you down (set by _chargeRent at the cap)
    keptBy: null,        // { id, since, nights } while a woman who knows you keeps you
    keptByUsed: false,   // her offer comes once a life
    endKind: null,       // how the game ended: "sold" (Prachuap) or "repatriated"
    condo: null,         // { since, deposit, short, guestsTold } while you rent the Pratumnak condo (G.hotel === "condo")
    paper: null,         // tourist / longstay / permit (the expat stage; null on a holiday) — see PAPER_COST in world.js
    paperUntil: null,    // a lost permit's paper lasts to this day, then falls back to the origin's
    paperFlag: null,     // the day an incident read the wrong paper (a company bar remembers PAPER_FLAG_DAYS)
    hangover: 0,         // last night's, set at the wake; DIAGNOSE reads it
    cmdN: 0,             // commands typed (not ticks): a once-a-command rule reads it (the go-go torch)
    boardTried: null,    // the day you last guessed Cloze's board — one go a night
    questPaid: {},       // qid → true once its reward is paid; a reopened quest never pays twice
    jobFired: null,      // { room, day, kind } — the last bar that took the keys back (2026-10-24)
    firedBars: {},       // room → day: bars that will never hire him as manager again
    barSale: null,       // { day, via: plg|tan|bert|lost, health: profit|even|under, paid, fee, till } — how his bar went, which every floor hiring a manager reads
    job: null,           // { kind: "teach" } or { kind: "manager", room, corp, nights, stood, weekStood, weekStart, strikes, shiftDay, shiftStood }
    jobOffer: null,      // a bar's terms, on the table till dawn ({ room, corp, day })
    payDay: null,        // the expat stage's clock: the day the last payday fell (set by _goExpat), INCOME_DAYS apart
    payCount: 0,         // paydays so far (a salary stops after its months)
    month: { spent: 0, rent: 0, rough: 0 },   // this month's book: what the nights cost, what the room cost, the rough mornings (the nomad's retainer reads them)
    sentTotal: 0,        // baht SENT to contacts over the game — the hospital queue's "money you'll never see" needs a debt to point at
    codaSeen: 0,         // dawn "her baht bus home" codas seen — rotates the prose so repeats vary
    known: {},           // charId → true once their name has printed (ask-topic gate)
    namedBy: {},         // charId → {room, by, day} the first time the name printed — the frontier says who mentioned them, and where
    heardOf: {},         // roomId → true once a venue's display name printed before you stood in it (the frontier's "heard the name, never been")
    lastNightWas: null,  // {day, reason, bar, barTurns, with, endRoom} — what the town could have seen of your night (LAST NIGHT asked of a witness)
    lastGate: null,      // {cmds, turn} — the chips the last modal offered, so its labels typed late are 'that moment has passed' (_staleModalAnswer)
    endWarn: null,       // {kind, day, turn} — a night-ending choice asked once, armed for the next command (_endConfirm)
    tanAsked: {},        // charId → day you asked Tan about them (the frontier retires the "ask Tan" note)
    exitTried: {},       // "room:dir" → day a way was tried and refused (the frontier stops offering it that night)
    examined: {},        // "room.readKey" → 1 — distinctive fixtures you've looked at (the Owl's noticer slot)
    visited: { jomtien_beach: true }, // roomId → true once stood in (fast-travel gate)
    visitDay: {},        // roomId → the day you first stood in it: a greeting that says "your face is new" checks it (Ray, round 78)
    // roomId → true once a Darkside bar has bolted the door with you inside.
    // PERMANENT, unlike the nightly G.soc.lockIn: it is the difference between
    // a good customer and a face the door opens for (_lockInWelcome).
    lockedInAt: {},
    talked: {},          // npcId → [dialogue indices already delivered] (terse repeats)
    npc: {},             // per-character conversation state: id → {trust,mood,dstate,know} (see _npcState)
    convo: null,         // active conversation partner id — bare topics/actions aim here (see _convoActive)
    itNpc: null,         // last person addressed — the antecedent for "her/him/them" (see _resolveActor)
    convoQ: null,        // a question the partner has put to YOU, awaiting a reply: {id,key} (see _convoAsk/_convoAnswer)
    convoLapsed: {},     // …and questions you walked away from, re-asked next time you talk to them
    darkDoorDay: -1,     // the once-a-night "there's no lights out there" nudge at your own door
    convoPage: 0,        // which window of their open topics the chip bar is showing (see TOPICS)
    boxJob: null,        // Rabbit's mule job while it's live: {turns,heat,done} (see _boxTick)
    eddyBackDay: 0,      // Rabbit gone to ground until this day (see _ccibVisit / _npcActive)
    stickFiles: [],      // what has been copied onto Rabbit's stick (READ STICK)
    cliLockedDay: 0,     // the day the office laptop locked you out — not tonight means not tonight
    cliSat: 0,           // sittings at that laptop (the second gets a shorter paragraph)
    rabbitDataDay: 0,    // the day the data landed — the CCIB visit is the morning AFTER
    rabbitWay: null,     // which way into the PLG office you took: "mule" | "operator" (see _rabbitJobYes/_rabbitJobKeyboard)
    ccibRadar: null,     // who CCIB has a file on after the heist: {player,eddy,nont} — set at the morning scene, rides the export (docs/bangkok-concept.md)
    ccibLowUntil: 0,     // the lay-low window end (G.day), see _ccibLowTick
    motoAsked: 0,        // the turn the piwin last asked "where to?" — a bare place typed next answers him
    travelDark: null,    // {key, turn}: TRAVEL stopped at the edge of the dark; the same TRAVEL again walks it
    lastComp: null,      // {turn, room}: the house just poured you one — a refusal in the next two turns hands it back
    lastNightSaid: null,
    lastNightNotice: null, // the Soi 6 week's "last night" notice, said once   // the morning ledger, kept so LAST NIGHT can reprint it
    motBoots: 0,         // baht handed to Mot toward the football boots he named at dinner
    kyleVouchDay: 0,     // the day Bert agreed to give Kyle a shift; _kyleTick lands the shift after it
    kidRefusedDay: 0,    // the day you told Nont no; the kid path re-opens the day after
    ccibLoud: 0,         // loud acts inside the window (see _ccibLoud) — the teeth
    ccibLoudNight: {},   // {kind: day} — one count per kind per night
    kidJobDay: 0,        // the day you paid Nont; his text lands the day after (see _kidTick)
    convoIdx: null,      // index of the partner's last-delivered node — its `choices` are the live action-choices (see _convoChoices)
    player: { said: {}, lang: "en", origin: null, personality: null, orientation: null, teetotal: false },   // lang: the dormant localization seam's switch — nothing sets it off "en" today (docs/i18n-seam.md)   // teetotal: I DON'T DRINK, declared once — the house stops pouring (Neville, round 53)// what you've told NPCs + WHO YOU ARE (lang + origin/personality/orientation, picked in the taxi intro; persists across Act One resets)
    faction: { plg: 0, samson: 0, indie: 0, syndicate: 0 }, // standing with the powers (see _align) — only moves when you ACT, never for declining
    itemLoc: Object.fromEntries(
      Object.entries(ITEMS).map(([id, it]) => [id, it.location])),
    dropped: {},         // keepsafe item ids the player DROPPED (vs spawned) — QUESTS surfaces these
    flowerDay: 0,        // day the flower-seller last worked you (once/night)
    flowerSeen: 0,       // …and how many times you've met her — the rerun reads as recognition
    party: null,         // TAKE HER OUT: { ids, stops, spent, seen: {roomId: true} } — the night continues with her
    flowerFor: null,     // who the offered rose is for
    trade: { yes: 0, no: 0, lean: 0 },   // the trade's offers, by what you did with them: a paid night (yes), a no to a proposition (no), a flirt (lean) — a man who only says no is not sent the app's girls or told to collect numbers (Mario, after Margaret's round, 2026-10-10)
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
      roundFor: {},      //   npcId → you stood them one, so the next story comes in full
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
    // consecutive HARD friction (parse failures + not-founds), for the stuck
    // nudge — see _noteMiss/_tanUnstick. Resets the moment the world moves.
    stuck: { n: 0, parse: 0, noname: 0, terse: false, spots: [] },
    stuckDay: 0,         // Tan's unstick text fires at most once a night
    pityRideDay: 0,      // the piwin's free ride for a broke man — once a night, not a taxi service
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
    bar: { room: "stinky_bar",   // the bar you'd own — _atOwnBar compared G.room to a field nothing set, so every own-bar guard was dead in play (Keith, round 40)
      cash: 0, owed: 0, arrears: 0, months: 0, lastMonthDay: 0, nights: 0, best: 0,
      workedLast: false, rentOwed: 0, rentShort: 0, pocketDrawn: 0,
      // the bar-failure cycle (docs/bar-failure-cycle.md): the landlord's rises, your two levers, the women who left, Nont's money, the bar opposite
      rentUp: 0, markup: "list", terms: "commission", gone: {}, notice: null, takeLog: [], trafficLog: [], loan: null, oppStart: 0, oppSaid: {} },
    affair: null,        // the staff affair (engine-systems) — null until she stays after close
    // procurement (engine-systems): the jobs put to you, the ones you took, the
    // friction of the ones you didn't. It lived only in a lazy init, so a save
    // that carried `syn` in any other shape threw inside _tick from 21:00 on —
    // and everything after the dispatcher (the presence count, the affair's door,
    // the floor) silently stopped for the night (Rolf, round 54).
    syn: { done: {}, asked: {}, friction: 0 },
    affairCool: 0,       // day a STEP BACK was given; the door re-opens after a fortnight
    affairCoolWho: null, // …and to whom (her greeting knows, for a month)
    roomWater: 0,        // complimentary hotel bottles drunk today (2/day, housekeeping restocks)
    ledgerSeen: 0,       // how many of the other ledger's reveals you've been shown (engine-play)
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
    rainDay: 0,          // the day the last downpour began — one a night, never two
    lastDrizzle: -99,    // turn of the last light-rain vignette
    season0: SEASON_DEFAULT_M0,  // start month (0=Jan); the frontend re-seeds off the real calendar

    quests: {},          // questId → "offered" | "active" | "done" | "abandoned"
    quizLast: null,      // {room, day, right}: tonight's quiz, as the room remembers it
    // The obligation economy and the verdict (essay ledger themes 1 and 6, 2026-10-01)
    owed: {},            // npcId → {amt, day}: a big gift she took from a man she didn't know yet — an account she settles later, a little bigger
    care: {},            // npcId → {waived, since, asked, cold}: the fines she waived for her farang, and whether he understood what they cost her
    maiDee: {},          // npcId → day: "you no good man" — a public scene in front of a bonded woman; permanent, money cannot reverse it
    maiDeeBar: {},       // roomId → day: her bar's floor heard, the way floors do
    everBond: {},        // npcId → the highest bond tier you ever reached with her — what she has told you is not a meter (Piet, round 62)
    givenEver: {},       // npcId → every baht you ever sent or tipped her, across trips — remembered in person
    quizPlayed: {},      // roomId → true (one quiz per bar per Thursday)
    // KING OF THE TABLE. Killer is a one-night knockout — the pot IS the prize,
    // and there are no rankings in it anywhere, in this town or any other. What a
    // bar keeps is informal: whose name is behind the till until somebody takes it
    // off them. Which is exactly what Bert's own prose promised and nothing
    // delivered — 'that goes up behind the till tonight', 'defend it next league
    // night' — while the loss line said 'the bar takes your name for next league
    // night' and no name was taken (Mario asked, 2026-09-16). roomId →
    // {since, defended}. Held until lost, never on a timer; cleared by a vacation,
    // because a month away is how you stop being anybody's champion.
    kpTitle: {},
    lastKp: null,        // {room, day, names, won}: tonight's killer field, so the men you played are people afterwards
    phone: {             // the other half of your most important possession
      contacts: {},      //   npcId → true (you have her number)
      inbox: [],         //   [{from, text, turn, read, gives}]
      lastText: 0,       //   turn of the last incoming message
      msgCd: {},         //   npcId → day you last sweet-talked her by text
      invite: null,      //   {id, day} — she asked you to drop by tonight
      photos: [],        //   [{id, cap?, turn}] — the gallery (portraits you took + selfies she sent)
      asks: {},          //   npcId → [{kind, amt, day, paid}]: every money-ask she ever texted — the phone remembers, even when she hopes you don't
      picDeals: {},      //   npcId → {idx, ask} | {done} — the pay-per-photo drip, one slot per girl
                         //   (a single shared slot would let one finished drip permanently block
                         //   every other paidPics NPC — see engine-systems.js's _startPicDeal)
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
  if (_flag("act1Done")) {
    const home = _hotelRoomId();
    if (home && ROOMS[home]) { G.room = home; G.visited[home] = true; }
  }
  if (!ROOMS[G.room]) G.room = "jomtien_beach";
  G.pendingChoice = null; G.pendingEnc = null; G.game = null;
  _sanitizeState();   // a baton is data on the wire too — same finite/in-range guard as a save
  return { ok: true };
}

// ── STATE_SCHEMA: how long every field of G lives (the architecture review of 2026-10-25, finding 3) ──
// A field's lifetime used to be implied by where it was stored, and the code review's two biggest defect classes were
// lifetime bugs (nightly books never reset, day stamps never aged). Every top-level G field and every G.soc key the source
// names is declared here, ONCE: tests/js/state-schema.test.js fails on one that is not, so a new field arrives with its
// lifetime decided. "night" is reset at dawn by _endNight, "trip" by _newVacation, "life" never; "day" lists the
// absolute day numbers and day-keyed books _ageBooks moves back across a trip. G.soc is rebuilt by _newVacation (keeping
// its few life-long books), so its keys are "night" (reset at dawn — _endNight resets every one listed, by type) or "trip".
const STATE_SCHEMA = {
  night: (
    "bank battery chamNight checkoutNight crashInjury darkStreak encPrompt enteredVia game hangover hunger hurt " +
    "jaded kickedTonight kpPlayed lastBfBase lastBfHonest lastBfId lastBfPreTier lastBfWhy lastBusWarned " +
    "lastNightWas lightOn monthClosing nightTurn nontStuck offstage party partyLog peddlerNight pendingBf pendingEnc " +
    "pendingFare pendingSoapy quizPlayed rain rideSeq room roomWater roughLost safeTries salengCart selfBfId thirst " +
    "wakeTurn ").trim().split(/\s+/),
  trip: (
    "atmDay atmToday care curseOwed everBond happy hotel weekStart lastNight lastNightSaid ledgerSeen loan loanSkipped " +
    "loanSkippedOwed money nightLog pendingChoice prevBond rep repDay returned stage testedDays tonicOwed ").trim().split(/\s+/),
  life: (
    "_lastPick acctBase acctDay acctUntil acctWhy act1Best atmIn act1SafeDue act1Tries affair affairCool affairCoolWho " +
    "affairCrisis affairOutAsk affairWho afterWorkOf amuletWorn askArm askArmPrev askTold atmFees atmTotal bankIn " +
    "bankNotes bar barSale barSat bestHappy bfIncident bfNo bfOpen bfSeq bfStrikes bkk blackouts blueDogDay boardTried " +
    "boardWon bookingDay boxJob bruise buddhaDay busAskStops busAskTurn busCameTurn busWaitTurn catDay ccibLoud " +
    "ccibLoudNight ccibLowUntil ccibRadar chamContactDay chamDays chamGifts chamLast cherryDay cliLockedDay cliSat " +
    "clozeFree cmdN codaBook codaSeen condo condoPaid condoTermsRead condoms convo convoChoiceMemo convoHour " +
    "convoIdx convoLapsed convoPage convoQ coversNights dailyId dailySeed darkDoorDay day destitute destituteDay dog " +
    "dogNudgeDay dogPhakhama dogRegion dogRoomSeen dogTagged dragDay drizzleTurn dropped drunk eddyBackDay encDone " +
    "endKind endWarn envelopeDue examined exitSaid exitTried faction firedBars flags flatTold flowerDay flowerFor " +
    "flowerSeen freeTeaDay fridgeDay fridgeWater frontierSaid giftIn giftLog gifts givenEver glass halfThaiClocked " +
    "heardOf heardRegion homeSeen hospitalVisits hotelDebt insulted introAfter introStep itNpc itemLoc jadeSaid job " +
    "jobFired jobOffer jobPaid jobPay jobQuit joinSaid joinerDay joinerPaid keptAskText keptBy keptByLog keptByUsed " +
    "keptOffer kidJobDay kidRefusedDay kissLog known kpLost kpTitle kyleVouchDay ladyTime lastBfAsk lastBfChaste " +
    "lastCoda lastComp lastConquest lastDrizzle lastEnc lastGame lastGate lastKp lastNightBye lastNightNotice " +
    "lastNightWith lastOffer lastPeddler lastPolice lastRain lastRide lastSaleng launderBack launderRisk leaveLine " +
    "leaveOn leaveSaid ledgerNotes levelsSeen licNominees licencesRead lifeStats lightWarn loanBorrowed loanPrin " +
    "loanRepaid lockedInAt loopDay maiDee maiDeeBar maiDeeMoney mamaYaiDay massageLog massageSpend metDay metRoom " +
    "miffed missTarget mode month monthAdj monthLine monthRate mortDeclined mortDeclinedDay motBoots motoAsked motoBalkTurn " +
    "motoHomeDoor motoRides motoRiding namedBy nokLeftDay nontBorrowed nontCashCount nontCashed nontCut nontOut " +
    "nontPayNow nontPrin nontRepaid npc offIn offShift offTill officeTries over overheardSaid owed owlRead " +
    "ownRescueDay paper paperFlag paperPaid paperShort paperUntil partnerWho partyLed partyMates partyRescued " +
    "patronTalk payCount payDay phone pityOwed pityRideDay pityRides player policeAt policePaid poolDay poolHold " +
    "potDay presaleSlipsDay prevRoom priewDay priewSeen priewTextDay probeAt questDoneDay questHailed questPaid " +
    "quests quizLast quizSeen quizWon qvDay qvRoast rabbitDataDay rabbitWay rainDay rainOnRide returnGreetUsed " +
    "returnHello reviewOf revisitSaid rideEverTaken rideLog rivalLog rng rodeVenues rodeWith roofless roomNight " +
    "roomPrepaid roomWaterDay rosesGiven safeMoneyDay safeMoneyLedger saidKha saidKhrap salengRoom salengSaid " +
    "salengSeen salengUntil score seaDay season0 seenDay selfBfHold sentTotal sevenAt shiftAskText shiftCall " +
    "shiftLeadText shiftWho shopMet showDay showerTurn sighting skipRepaid smallTalk socialActs somTamTestDay " +
    "stayedPast std stickFiles storyOf streamBellOk streamBells streamDrinks streamSpent streamTold street streetDone streetLog " +
    "stringer stuck stuckDay sunriseDay syn synJob talked tamarindDay tanAsked tanFavourDay tanNoteDay taught " +
    "taughtBy thaiAccount thaiHeardTurn thaiSaid thaiScript thaiSeen thaiSpyDone thaiUsed tipExist toldTo townLines " +
    "townTold trade travelDark turns vacation visitDay visitUntil visited waenDay walletBackDay walletHeld " +
    "walletLedger walletLedgerN walletLostAt walletLostDay walletLostNow warned wentSaid wentWith wingmanUntil " +
    "withHer x ").trim().split(/\s+/),
  day: (
    "acctDay acctUntil atmDay blueDogDay bookingDay buddhaDay catDay chamContactDay cherryDay cliLockedDay " +
    "darkDoorDay destituteDay dogNudgeDay dragDay eddyBackDay flowerDay freeTeaDay fridgeDay jobPay joinerDay " +
    "kidJobDay kidRefusedDay kyleVouchDay launderRisk loopDay mamaYaiDay massageLog metDay mortDeclinedDay " +
    "nokLeftDay ownRescueDay paperFlag paperUntil payDay pityRideDay poolDay potDay presaleSlipsDay priewDay " +
    "priewTextDay questDoneDay qvDay rabbitDataDay rainDay repDay roomWaterDay safeMoneyDay seaDay seenDay showDay " +
    "somTamTestDay std stuckDay sunriseDay tamarindDay tanFavourDay tanNoteDay visitDay waenDay walletBackDay " +
    "walletLostDay ").trim().split(/\s+/),
  socNight: (
    "huhHint apologized backDoorTonight banned barTurns bellAt bells bfBar bfNight bfRefused bondCapSaid bondNight bought " +
    "bra butterflyTeased charmed charmedN contested danceNoted dancePaid dogFavor drinkCount drinkNight drunk fed " +
    "gaveCondom giftLines goWith greeted heat heatWhy helloed hostOut joyRooms lastCall leftEarly leftFrom " +
    "leftLockIn lockIn mgrChat mgrShot patronBusy patronMiffed photoJoy photoNoted salengBar selfBf selfDrinks " +
    "steered streamJoy streamLast streamMine streamSeenBy tanWas tipBond tries ").trim().split(/\s+/),
  socTrip: (
    "arriveBook arriveMoney askedHere awaySaid beats bondHeard bondSaid byeSaid chamDrinks clinicCompany coconutDone " +
    "comped craneDay declined depositNagDay dogScenesSeen drinks fonPour freeNight gapSeen gifted given glassRooms " +
    "grease jaTease jobHello jobMemHello khaSaid kpChall leavingSaid ledger ledgerHeard licLook lockInAt lockInCheck " +
    "lockInCoda lockInDare lockInLast maiDeeSaid mamaTreat mamaTreatNight mamaWarm manDrinks massaged mgrTrustNight " +
    "moneyTick motelWith ninaFed niraWater noEnglish nontTold padded policeRoll policeTell policeWarned pubShut " +
    "quitSaid qvCrisped retHello rivalSaw roastGoneSeen roundFor roundTold seenHome shutOut sightedOff sighting " +
    "soapyDone soberNext softDrink special specialAsk spentTurn sponsorPix staySaid stoodFor storyTold streamAway " +
    "streamBell streamWon streetLook tanFedDay thaiPraised thaiSpy tickRoom torchNoticed " +
    "townSaid usualSaid waiBack walletPointed wentHello whaleBell whaleBellAt witnessSaid workSaid ").trim().split(/\s+/),
};

// ── GATES: every G.pendingChoice prompt, in one place (the architecture review of 2026-10-25, finding 5) ──
// A prompt is wired five ways — its answer in _doCommandInner, its redraw in _renderResume, its chips in _chipSet, its
// completion in engineComplete, and a recipe in tools/modal-audit.mjs — and tests/js/gates.test.js fails on a prompt
// that is not in this table or is missing a surface. `carry: true` is a prompt that belongs to the morning or survives
// the night (it is armed at the wake, or it is a question across a day); every other prompt goes with the night that
// raised it (_endNight clears it). `why` says in a line what the prompt asks.
const GATES = {
  intro:        { carry: true,  why: "the taxi ride's three questions: who you are" },
  vacation_end: { carry: true,  why: "the week is over: a new trip, or move to Pattaya (or the Soi 6 week's card)" },
  soi6continue: { carry: true,  why: "the Soi 6 week's CONTINUE: another week, or cancel the ticket" },
  gameend:      { carry: true,  why: "the ending: visit Pattaya or start over" },
  embassy:      { carry: true,  why: "destitute, the third morning: the consulate's plane, or the bench" },
  keptby:       { carry: true,  why: "destitute: her offer of her mat" },
  chamgift:     { carry: true,  why: "the morning after Cream: what to leave on the table" },
  bkkdinner:    { carry: true,  why: "Sao's car to the Sathorn dinner" },
  kidfavour:    { carry: true,  why: "Tan's read on the kid's run: owe him for the boy" },
  affair:       { carry: false, why: "she stays after close: the affair's door" },
  affaircrisis: { carry: false, why: "one of the affair's crises" },
  bkkbill:      { carry: false, why: "the Sathorn dinner's bill" },
  cham:         { carry: false, why: "Cream's GO or NOT TONIGHT" },
  checkout:     { carry: false, why: "which hotel to move to" },
  keptgirl:     { carry: false, why: "Bert with the bar phone: the kept girl's sponsor" },
  kidprice:     { carry: false, why: "Nont's price for the kid's run" },
  partner:      { carry: false, why: "the 51%: Candy or Tan, confirmed" },
  rabbitjob:    { carry: false, why: "Eddy's interview: CARRY IT, KEYBOARD, THE KID, NOT ME" },
  barsale:      { carry: false, why: "SELL UP: Pattaya Leisure, Tan's buyer, Bert — or keep it" },
  sellbar:      { carry: false, why: "SELL UP, confirmed" },
  shift:        { carry: false, why: "a shift call at your own rail" },
  sighting:     { carry: false, why: "she is at a kerb table with another farang" },
  synjob:       { carry: false, why: "a procurement job offered at your own bar" },
  tanfavour:    { carry: false, why: "Tan asks for a name on the staff list" },
};
function _gateCarries(id) { return !!(GATES[id] && GATES[id].carry); }

// the nightly G.soc keys _endNight does not reset by hand, reset by type at dawn (salengBar and steered were never reset:
// three carts a night became three a trip — the architecture review, 2026-10-25)
let _SOC_HAND_RESET = null;
function _resetNightSoc() {
  if (!_SOC_HAND_RESET) _SOC_HAND_RESET = new Set([..._endNight.toString().matchAll(/G\.soc\.([a-zA-Z_]\w*) = /g)].map(m => m[1]));
  for (const k of STATE_SCHEMA.socNight) {
    if (_SOC_HAND_RESET.has(k)) continue;
    const v = G.soc[k]; if (v === undefined) continue;
    G.soc[k] = Array.isArray(v) ? [] : v && typeof v === "object" ? {} : typeof v === "number" ? 0 : typeof v === "boolean" ? false : null;
  }
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
  // NOT capped at 100: สบายสบาย is a MILESTONE, not a ceiling — the game says so
  // out loud ("non-terminal"), and a strong week runs well past it (439 measured,
  // Vikram 2026-08-27). Capping here silently deleted every point above 100 on
  // each deserialize, which meant UNDO *and every autosave-continue* handed a
  // 117-สนุก player back a 100 (Marguerite, 2026-08-27). Still bounded, because
  // the point of this table is to reject corruption, not to score the game.
  ["happy", 0, 1e6], ["bestHappy", 0, 1e6], ["jaded", 0, 100],
  ["hunger", 0, 100], ["thirst", 0, 100], ["hurt", 0, 3], ["battery", 0, 100],
  ["day", 1, 1e7], ["vacation", 1, 1e6], ["turns", 0, 1e9], ["score", 0, 1e6],
  // resolved AT SANITIZE TIME: NIGHT_TURNS lives in engine-play, which loads after this file,
  // so a value read here was always the fallback 100 — every continue after 04:00 wound the
  // clock back to 04:00 and WATCH SUNRISE refused (Priya, round 58). Nights run to 120.
  ["nightTurn", 0, () => (typeof NIGHT_TURNS !== "undefined" ? NIGHT_TURNS : 120)],
  ["soc.drunk", 0, 20], ["rep", -20, 20],
];
const _SANE_ARRAYS = [["thaiSeen", 300], ["nightLog", 30]];
function _sanitizeState() {
  for (const [path, min, max] of _SANE_SCALARS) {
    const [a, b] = path.split(".");
    const obj = b ? G[a] : G;
    if (!obj) continue;
    const key = b || a;
    const v = obj[key];
    const mx = typeof max === "function" ? max() : max;
    obj[key] = Number.isFinite(v) ? Math.max(min, Math.min(mx, Math.trunc(v))) : min;
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
  // a morning snapshot with no vacation stamp predates the stamp (2026-09-03) and
  // may be from a PREVIOUS vacation — it reported "-108 สนุก" on the best night of
  // the next one (Frank, round 38). Drop it; the first morning is just quiet.
  if (G.lastNight && G.lastNight.vacation == null) G.lastNight = null;
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
  // the Naklua villa's room id was `orchid_club` until 2026-09-15 (renamed: it is
  // not the Orchid Room, and the id kept saying it was)
  if (G.room === "orchid_club") G.room = "nottys_place";
  // THE PATTAYA LEISURE RENAME (2026-09-23). The group and its owner were renamed
  // out of an identifiability risk — the old fictional names were derivations of a
  // real Pattaya business and a real person, which is what defamation turns on here,
  // not whether the real name was used (docs/guardrails.md). The DISPLAY names are
  // prose, but the faction key, two quest ids and five flags ride the save, so a
  // player mid-arc would silently lose their standing and their progress. Runs AFTER
  // the merge, on G, so it is order-proof: a fresh skeleton has none of the old keys.
  {
    const f = G.faction;
    // the faction skeleton already carries plg: 0, so an `=== undefined` guard
    // would never fire here — the old key existing is the whole condition
    if (isObj(f) && f.wdg !== undefined) { if (!f.plg) f.plg = f.wdg; delete f.wdg; }
    const q = G.quests;
    if (isObj(q)) {
      if (q.white_dish !== undefined && q.plg_deal === undefined) { q.plg_deal = q.white_dish; delete q.white_dish; }
      if (q.wdg_flip !== undefined && q.plg_flip === undefined) { q.plg_flip = q.wdg_flip; delete q.wdg_flip; }
    }
    const fl = G.flags;
    if (isObj(fl)) for (const [was, now] of [
      ["wdgResolved", "plgResolved"], ["wdgFlipTried", "plgFlipTried"],
      ["heardWdgPitch", "heardPlgPitch"], ["heardWdgInside", "heardPlgInside"],
      ["heardWdgHistory", "heardPlgHistory"],
    ]) if (fl[was] !== undefined && fl[now] === undefined) { fl[now] = fl[was]; delete fl[was]; }
  }
  if (G.visited && G.visited.orchid_club) { G.visited.nottys_place = true; delete G.visited.orchid_club; }
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
// THE SECOND WALLET is out: the opening's chain is live again in the expat stage (2026-10-21)
function _walletHunt() { return !!(G && G.flags && G.flags.walletLost && !G.flags.hasWallet); }
// THE RESIDENT'S ROOF AND RAIL (round 100): a man in a condo is not a guest, and a man standing his job's rail is not a customer
function _inCondo() { return !!(G && G.hotel === "condo"); }
function _homeWord() { return _inCondo() ? "your flat" : "the hotel"; }            // "JUST the hotel" → "JUST home"
function _homeSaid() { return _inCondo() ? "Pratumnak Soi 5" : "the hotel's name"; }   // what she says to the piwin
function _atJobBar() { return !!(G && G.job && G.job.kind === "manager" && G.room === G.job.room); }
// …and on SHIFT there tonight: the close is his to call only on a night he declared it (Brendan, round 102:
// "last call — yours to call, boss" on his night off)
function _onShift() { return _atJobBar() && G.job.shiftDay === G.day; }
// a woman on the floor he manages, wherever he is standing: a manager does not barfine his own girls (Mario, 2026-10-22)
function _myFloorGirl(id) { return !!(G && G.job && G.job.kind === "manager" && NPCS[id] && NPC_ROLES[id] === "hostess" && (NPCS[id].room === G.job.room || (NPCS[id].bars || []).includes(G.job.room))); }
function _jobBarStaff(id) { return !!(G && G.job && G.job.kind === "manager" && NPCS[id] && (NPCS[id].room === G.job.room || (NPCS[id].bars || []).includes(G.job.room)) && (NPC_ROLES[id] || NPCS[id].manager)); }
// what the recovered wallet gives back — the opening's ฿500, or what the second wake took
function _walletCash() { return G && G.walletHeld != null ? G.walletHeld : WALLET_CASH; }

// ── Named predicates for the questions the code keeps asking ────────────────
// Class L (docs/persona-findings-systemic.md §3.4) is the right question asked
// of the wrong field, and it is a NAMING problem: `G.known` and `G.talked` both
// read as "knows her" at the call site, and `region !== "Jomtien"` reads as
// "out of town" until you are standing in Thappraya. The names below are the
// fix; the source lint in tests/js/templates.test.js keeps them the fix.

// MET, not merely NAMED. `_learnNames` marks a character known the first time
// their name PRINTS — a room description, a lead, somebody else's story — so
// `G.known` means "the transcript has said this name", which is the right gate
// for a SPOILER (`_topicKnown`, the flyout wheel's ask-topics) and the wrong
// gate for anything that means acquaintance. Two shipped on it: Kruu Waen
// texted homework to a stranger (Judith, round 47), and a bar manager could
// never once say "new face", because his own room description had introduced
// him one line before the welcome shot was poured.
// THE NAMESAKE POLICY (2026-10-09): names are labels and ids are the people — 31 names are already
// shared and the soi is about to grow. A name typed or asked resolves to the namesake in the room, else
// the one you have met most recently, else the one you know of if only one, else nobody (or, with
// opts.first, the first) — never silently the first woman of that name in the file.
function _npcByName(name, opts = {}) {
  const t = String(name || "").toLowerCase().trim();
  if (!t) return null;
  const c = Object.keys(NPCS).filter(i => (!opts.filter || opts.filter(i)) &&
    (String(NPCS[i].name).toLowerCase() === t || String(NPCS[i].name).toLowerCase().split(" ").pop() === t));
  // an id typed as itself wins — unless it is also one of several women by that NAME (rung is the
  // Lucky Tiger's id and every Rung's name), where the id is an accident of who was written first
  if (NPCS[t] && (!opts.filter || opts.filter(t)) && c.length <= 1) return t;
  if (c.length <= 1) return c[0] || null;
  const here = typeof _npcsHere === "function" ? _npcsHere() : [];
  const h = c.find(i => here.includes(i)); if (h) return h;
  const met = c.filter(i => (G.talked && G.talked[i] && G.talked[i].length) || (G.soc && G.soc.drinks && G.soc.drinks[i]));
  if (met.length) return met.sort((a, b) => ((G.seenDay || {})[b] || (G.metDay || {})[b] || 0) - ((G.seenDay || {})[a] || (G.metDay || {})[a] || 0))[0];
  const known = c.filter(i => G.known && G.known[i]);
  if (known.length === 1) return known[0];
  return opts.first ? c[0] : null;
}
function _met(id) { return !!(G.talked && G.talked[id]); }
// The man who keeps saying no (Margaret, the prude persona, 2026-10-10): she declined the
// freelancer, the barfine and every offer, asked the town about its temples, and was still
// sent the app's girl at one a.m. and told a bar girl's number is how the week gets
// interesting. A no to a proposition counts; a paid night or a flirt undoes it.
function _tradeMark(kind) { const t = G.trade || (G.trade = { yes: 0, no: 0, lean: 0 }); t[kind] = (t[kind] || 0) + 1; }
function _refusing() { const t = G.trade || {}; return (t.no || 0) > 0 && !(t.yes || 0) && !(t.lean || 0); }

// IN TOWN, as Tan means it when he says "walk, it is four minutes": the bar
// districts you can actually walk between. Jomtien and Thappraya are the far
// side of the bay, Pratumnak is the hill in between, and the Darkside is across
// eight lanes of Sukhumvit — from any of the four that sentence is a lie, which
// is what a stranded player on the hill was told (Judith, round 47).
const _OUT_OF_TOWN = ["Jomtien", "Thappraya", "Pratumnak", "Darkside"];
function _inTown(room) {
  const r = ROOMS[room || G.room];
  return !!r && _OUT_OF_TOWN.indexOf(r.region) < 0;
}

// A CONTACT WHO TEXTS YOU UNPROMPTED. `NPC_ROLES[id]` is "works a bar floor",
// which is nearly the same set and not the same question: Priew, the girl from
// the clinic queue, is a LINE contact with no bar and no role, and never once
// sent a message in her life (Judith, round 47). Tan is deliberately outside it
// — he answers, he does not chat.
function _texts(id) { return !!(NPC_ROLES[id] || id === "priew"); }

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
// A pooled line in a bar may name people the bar does not have. Jaja's Mooring is one
// woman, and the town's pools still sent her drink past a cashier, relayed a joke to "a
// delighted jury of two", and had the mama send a boy for the umbrella (Dieter and
// Nattapong, round 56 — eleven phantom colleagues at one bar, the same at Cloze and the
// Metro Beer Garden). The class fix: inside a bar, a line naming a role nobody on this
// floor holds is skipped, and the whole pool comes back if that leaves nothing, so no
// pool can ever go silent. A pure filter — the dice still pick.
const _FIT_NOBODY = /\b(girl beside (?:her|you)|nearest girl|other girls?|the girls|two of the girls|new girl|jury of two|down the rail|colleagues?|barman|waitress|sends a boy|a boy for)\b/i;
const _FIT_MAMA = /\b(mamasan|the mama)\b/i;
const _FIT_TILL = /\b(cashier|the till|on the till)\b/i;
// A GO-GO HAS NO BAR TO LEAN ON (Mario, 2026-10-07): seating is the stage-side seats (tip if you sit
// there), the wall benches with small tables, and a VIP area or gallery; drinks come from the
// waitresses. The women dance, sit with customers, work the door, or are on a break. So in a go-go a
// pooled line that puts anybody on a stool, at the rail or along a bar is skipped.
const _FIT_GOGO = /\b(the fan|near the fan|to the fan|bar ?stools?|stools?|the rail|down the rail|along the rail|(?:along|down|up|across|behind|over|on|at|leans? on|propped on|elbows? on) the bar\b|(?:end|far end|other end) of the bar|bar[- ]?top|belly up|bartenders?|barm[ae]n|football|the telly|the tv|pours|polish(?:es|ing)|wip(?:es|ing) (?:the|a|her) glass|on the mat|the rail is)\b/i;   // …nor the beer bar's texture: the match on, a dancer pouring, the usual on the mat (Henrik, round 69)
function _isGogo(room) { const r = ROOMS[room || G.room]; return !!(r && r.barType === "gogo"); }
// the room's furniture in one word, for a line that must print in a bar AND a go-go: a beer bar keeps
// its stools and its bar top, a go-go has seats and small tables (Mario, 2026-10-07)
function _seat(room) { return _isGogo(room) ? "seat" : "stool"; }
function _ledge(room) { return _isGogo(room) ? "the table" : "the bar"; }
function _hasBarman(room) {
  const to = room || G.room, r = ROOMS[to] || {};
  if (to === G.room && _npcsHere().some(i => NPCS[i] && (NPCS[i].manager || (NPCS[i].house && _pronoun(i) === "he")))) return true;
  return /\b(barm[ae]n|bartenders?)\b/i.test(String(r.desc || "") + " " + (Array.isArray(r.revisit) ? r.revisit.join(" ") : ""));
}
function _roomFit(pool) {
  if (!pool || pool.length < 2 || !G || !G.room || !ROOMS[G.room] || !ROOMS[G.room].barType) return pool;
  if (typeof _npcsHere !== "function" || typeof NPC_ROLES === "undefined") return pool;
  const staff = _npcsHere().filter(i => NPC_ROLES[i]);
  const roles = new Set(staff.map(i => NPC_ROLES[i]));
  const bad = [];
  if (staff.length <= 1) bad.push(_FIT_NOBODY);
  // one hostess with a mamasan and a cashier is still ONE girl: "two of the girls slip out", "her friends look over"
  // at the Shady Lady, where Pukky is the floor (Sam, round 90)
  else if (staff.filter(i => NPC_ROLES[i] === "hostess").length <= 1) bad.push(/\b(other girls?|the girls|two of the girls|her friends|girl beside her|nearest girl|the girls have)\b/i);
  if (!roles.has("mamasan")) bad.push(_FIT_MAMA);
  if (!roles.has("cashier") && staff.length <= 1) bad.push(_FIT_TILL);
  if (ROOMS[G.room].barType === "gents" || ROOMS[G.room].indoors) bad.push(/open[- ]front/i);
  if (_isGogo()) bad.push(_FIT_GOGO);   // "the whole open front a few degrees warmer" in an aircon villa (Marguerite, round 67)
  // a BARMAN is a man behind the bar, and most bars have none: the women pour (Ray, round 78 — "the
  // barman builds her drink" at the Sweet Tamarind, run by View, Tukta and three nieces). A line naming
  // one needs a manager on the floor or a room whose own prose has him.
  if (!_hasBarman()) bad.push(/\b(barm[ae]n|bartenders?)\b/i);
  // …and a WAITRESS carries drinks in a go-go or a room whose prose has one, not to a rail where the
  // women pour (Joost, round 81: "the waitress" at the Sweet Tamarind)
  if (!_isGogo() && !/\bwaitress/i.test(String(ROOMS[G.room].desc || "") + " " + (Array.isArray(ROOMS[G.room].revisit) ? ROOMS[G.room].revisit.join(" ") : ""))) bad.push(/\bwaitress(es)?\b/i);
  // with a woman on your arm the floor does not pitch you: "Buy me drink. Take me up", a girl sliding into
  // your lap, "why you sit alone?" — four rooms, Mercedes and Joy beside him (Martin, round 85)
  if (G.party && G.party.ids && G.party.ids.length) bad.push(/take me up|we go up|nod at the stairs|into your lap|across you|sit alone|why you alone|buy me (a )?drink/i);
  if (!bad.length) return pool;
  // read a function line's SOURCE, never call it: a pool line may roll dice or touch state, and
  // a filter that runs it shifts the seeded stream (round 57 found the soak's path had moved)
  const txt = l => typeof l === "string" ? l : typeof l === "function" ? String(l) : "";
  const ok = pool.filter(l => { const s = txt(l); return !bad.some(r => r.test(s)); });
  return ok.length ? ok : pool;
}
// AN AMERICAN DOES NOT SAY "MATE" (Mario, 2026-10-24). The shared registers — a punter on his stool, a farang on the
// house side — were written in British idiom, and the rail that speaks them is mostly American (Doyle, Mort, Angela,
// Randy, Bert, Bob, Eddy). While an American is the one talking, a pool's lines whose SPEECH carries a British marker
// are skipped when a neutral sibling exists, and swapped word for word when none does. Narration (the narrator is
// British, by house style) is outside the quotes and never touched. Tan is exempt: Ohio and the pavement both
// taught him, and his mixed vocabulary is his (Mario). So is Mort: forty-one years of a British paper's subs.
const _BRIT_SPEECH = /\b(mate|mates|bloke|blokes|fortnight|holidays?|squire|cropper|fair play|motorway|pavement|telly|proper|lads?|quid|rubbish|bloody|knackered|brilliant|sorted|chuffed|skint|dodgy|innit|cheers|you'?ve not|they'?ll not|i'?ll not|half (?:six|seven|eight|nine|ten|eleven|twelve|one|two|three)|petrol|lorry|loo|mum|mums|arse|cuppa|blimey|bollocks|reckon|cracking|gutted|on the tools|(?:i|he|she|they|we|you|it)'?(?:ll|d) not|stand us one|stand (?:a man|me|us|him) a drink|punters?|mind\.|as such|rather the point|haven'?t the room|turns up|cop shop|pot the black|civili[sz]ed|year and a bit|near enough|for ever|old boy|the pair of them|dearest|of an? (?:evening|night)|the bins|lying about|poke about|across the road)\b/i;
const _US_SWAP = [
  [/,\s*mate\b/gi, ""], [/\bmate,\s*/gi, ""], [/\bmates\b/gi, "buddies"], [/\bmate\b/gi, "buddy"],
  [/\bblokes\b/gi, "guys"], [/\bbloke\b/gi, "guy"], [/\bfortnight\b/gi, "two weeks"], [/\bholidays\b/gi, "vacations"], [/\bholiday\b/gi, "vacation"],
  [/\bsquire\b/gi, "friend"], [/\bcame a cropper\b/gi, "took a spill"], [/\bfair play\b/gi, "good for you"], [/\bmotorway\b/gi, "highway"],
  [/\bpavement\b/gi, "sidewalk"], [/\btelly\b/gi, "TV"], [/\bproper\b/gi, "real"], [/\blads\b/gi, "guys"], [/\blad\b/gi, "kid"], [/\bquid\b/gi, "bucks"],
  [/\brubbish\b/gi, "garbage"], [/\bbloody\s+/gi, ""], [/\bknackered\b/gi, "beat"], [/\bbrilliant\b/gi, "great"], [/\bsorted\b/gi, "taken care of"],
  [/\bchuffed\b/gi, "pleased"], [/\bskint\b/gi, "broke"], [/\bdodgy\b/gi, "shady"], [/\binnit\b/gi, "right"], [/\bcheers\b/gi, "thanks"],
  [/\byou'?ve not got\b/gi, "you don't have"], [/\byou'?ve not\b/gi, "you haven't"], [/\bthey'?ll not\b/gi, "they won't"], [/\bi'?ll not\b/gi, "I won't"],
  [/\bhalf (six|seven|eight|nine|ten|eleven|twelve|one|two|three)\b/gi, "$1-thirty"], [/\bpetrol\b/gi, "gas"], [/\blorry\b/gi, "truck"], [/\bloo\b/gi, "bathroom"],
  [/\bmums\b/gi, "moms"], [/\bmum\b/gi, "mom"], [/\barse\b/gi, "ass"], [/\bcuppa\b/gi, "coffee"], [/\bblimey\b/gi, "man"], [/\bbollocks\b/gi, "nonsense"],
  [/\b(i|he|she|they|we|you|it)'?ll not\b/gi, "$1 won't"], [/\b(i|he|she|they|we|you|it)'?d not\b/gi, "$1 wouldn't"],
  [/\bstand us one\b/gi, "buy me one"], [/\bstand (a man|me|us|him) a drink\b/gi, "buy $1 a drink"], [/\bpunters\b/gi, "customers"], [/\bpunter\b/gi, "customer"],
  [/,\s*mind\./gi, "."], [/\bas such\b/gi, "really"], [/\brather the point\b/gi, "kind of the point"], [/\bhaven'?t the room\b/gi, "don't have room"],
  [/\bturns up\b/gi, "shows up"], [/\bcop shop\b/gi, "police station"], [/\bpot the black\b/gi, "sink the eight"], [/\bcivili[sz]ed\b/gi, "sane"],
  [/\ba year and a bit\b/gi, "a year and change"], [/\byear and a bit\b/gi, "a year and change"], [/\bnear enough\b/gi, "pretty much"], [/\bfor ever\b/gi, "forever"],
  [/\bold boy\b/gi, "old guy"], [/\bthe pair of them\b/gi, "the two of them"], [/\bdearest\b/gi, "most expensive"], [/\bof an evening\b/gi, "in the evening"],
  [/\bof a night\b/gi, "at night"], [/\bthe bins\b/gi, "the trash"], [/\blying about\b/gi, "lying around"], [/\bpoke about\b/gi, "poke around"], [/\bacross the road\b/gi, "across the street"],
  [/\breckon\b/gi, "figure"], [/\bcracking\b/gi, "great"], [/\bgutted\b/gi, "crushed"], [/\bon the tools\b/gi, "working with your hands"],
];
const _QUOTED = /[“"][^”"]*[”"]/g;
// THE VOICES (Mario, 2026-10-24, after the American pass): the same filter, one table per kind of English. An
// American or a Canadian gets the lists above; an AUSTRALIAN keeps mate, reckon and arvo but not the Englishman's
// squire, guv'nor or "half ten"; a man whose English is his SECOND language (a German, a Dane) speaks a plain,
// correct English — none of the regulars' British slang ("came a cropper", "taking the piss", "bloke") and no "half
// ten", which a German hears as half past NINE. The British and the Irish keep everything; nobody's narration moves.
const _AU_SPEECH = /\b(squire|guv'?nor|innit|blimey|bollocks|cheerio|half (?:six|seven|eight|nine|ten|eleven|twelve|one|two|three)|(?:i|he|she|they|we|you|it)'?(?:ll|d) not|you'?ve not|stand us one|of an? (?:evening|night)|whilst|proper job)\b/i;
const _AU_SWAP = [
  [/\bsquire\b/gi, "mate"], [/\bguv'?nor\b/gi, "boss"], [/\binnit\b/gi, "eh"], [/\bblimey\b/gi, "strewth"], [/\bbollocks\b/gi, "rubbish"], [/\bcheerio\b/gi, "see ya"],
  [/\bhalf (six|seven|eight|nine|ten|eleven|twelve|one|two|three)\b/gi, "$1-thirty"],
  [/\b(i|he|she|they|we|you|it)'?ll not\b/gi, "$1 won't"], [/\b(i|he|she|they|we|you|it)'?d not\b/gi, "$1 wouldn't"], [/\byou'?ve not\b/gi, "you haven't"],
  [/\bstand us one\b/gi, "shout us one"], [/\bof an evening\b/gi, "of a night"], [/\bwhilst\b/gi, "while"], [/\bproper job\b/gi, "good job"],
];
const _ESL_SPEECH = /\b(mate|mates|bloke|blokes|lads?|cropper|fair play|taking the piss|piss-?take|innit|squire|guv'?nor|blimey|bollocks|knackered|chuffed|gutted|skint|dodgy|quid|sorted|cracking|reckon|cheers|telly|bloody|bugger\w*|sod|cheeky|proper|half (?:six|seven|eight|nine|ten|eleven|twelve|one|two|three)|(?:i|he|she|they|we|you|it)'?(?:ll|d) not|you'?ve not|stand us one|punters?|of an? (?:evening|night)|whilst|as such|turns up|cop shop|y'?all|gonna|wanna|ain'?t|dude|buddy)\b/i;
const _ESL_SWAP = [
  [/,\s*mate\b/gi, ""], [/\bmate,\s*/gi, ""], [/\bmates\b/gi, "friends"], [/\bmate\b/gi, "friend"], [/\bblokes\b/gi, "men"], [/\bbloke\b/gi, "man"], [/\blads\b/gi, "men"], [/\blad\b/gi, "boy"],
  [/\bcame a cropper\b/gi, "had a fall"], [/\bfair play\b/gi, "good for you"], [/\btaking the piss\b/gi, "making fun"], [/\binnit\b/gi, "no?"], [/\bsquire\b/gi, "my friend"], [/\bguv'?nor\b/gi, "boss"],
  [/\bblimey\b/gi, "well"], [/\bbollocks\b/gi, "nonsense"], [/\bknackered\b/gi, "tired"], [/\bchuffed\b/gi, "happy"], [/\bgutted\b/gi, "sorry"], [/\bskint\b/gi, "broke"], [/\bdodgy\b/gi, "not honest"],
  [/\bquid\b/gi, "money"], [/\bsorted\b/gi, "done"], [/\bcracking\b/gi, "very good"], [/\breckon\b/gi, "think"], [/\bcheers\b/gi, "thank you"], [/\btelly\b/gi, "TV"], [/\bbloody\s+/gi, ""],
  [/\bcheeky\b/gi, "bold"], [/\bproper\b/gi, "real"], [/\bhalf (six|seven|eight|nine|ten|eleven|twelve|one|two|three)\b/gi, "$1-thirty"],
  [/\b(i|he|she|they|we|you|it)'?ll not\b/gi, "$1 will not"], [/\b(i|he|she|they|we|you|it)'?d not\b/gi, "$1 would not"], [/\byou'?ve not\b/gi, "you have not"],
  [/\bstand us one\b/gi, "buy me one"], [/\bpunters\b/gi, "customers"], [/\bpunter\b/gi, "customer"], [/\bof an evening\b/gi, "in the evening"], [/\bof a night\b/gi, "at night"],
  [/\bwhilst\b/gi, "while"], [/\bas such\b/gi, "really"], [/\bturns up\b/gi, "comes"], [/\bcop shop\b/gi, "police station"],
  [/\by'?all\b/gi, "you"], [/\bgonna\b/gi, "going to"], [/\bwanna\b/gi, "want to"], [/\bain'?t\b/gi, "is not"], [/\bdude\b/gi, "friend"], [/\bbuddy\b/gi, "friend"],
];
const _VOICES = { us: [_BRIT_SPEECH, _US_SWAP], ca: [_BRIT_SPEECH, _US_SWAP], au: [_AU_SPEECH, _AU_SWAP], esl: [_ESL_SPEECH, _ESL_SWAP] };
const _NAT_VOICE = [[/americ|yank|u\.s\./i, "us"], [/canad/i, "ca"], [/austral|aussie|new zealand|kiwi/i, "au"],
  [/german|danish|dane|dutch|swed|norw|finn|french|swiss|austrian|belgian|russian|ital|polish|spanish|portug|czech|japanese|korean|chinese|indian|israeli/i, "esl"]];
function _voiceKind(id) {
  const n = id && typeof NPCS !== "undefined" && NPCS[id];
  if (!n || id === "tan" || id === "mort") return null;   // Tan's mixed vocabulary, Mort's British paper's register (Mario, 2026-10-24)
  if (n.voice) return n.voice;   // an explicit voice on the record wins
  const nat = String(n.nat || "");
  if (nat) { const v = _NAT_VOICE.find(([re]) => re.test(nat)); return v ? v[1] : null; }
  if (typeof NPC_ROLES !== "undefined" && NPC_ROLES[id] && !n.manager) return null;   // the floor speaks its own registers
  const said = String(n.desc || "").slice(0, 260) + " " + String(n.look || "");
  if (/\bAmerican\b/.test(said)) return "us";
  if (/\bCanadian\b/.test(said)) return "ca";
  if (/\bAustralian\b|\bAussie\b/.test(said)) return "au";
  if (/\b(German|Danish|Dutch|Swedish|Norwegian|French|Swiss|Austrian|Belgian|Russian)\b/.test(said) && !/\bspeaks? (?:German|French)\b/.test(said)) return "esl";
  return null;
}
function _americanVoice(id) { return _voiceKind(id) === "us"; }
function _speechOf(l) { const s = typeof l === "function" ? String(l) : String(l || ""); const q = s.match(_QUOTED); return q ? q.join(" ") : s; }
function _swapSay(text, swaps) {
  return String(text).replace(_QUOTED, q => {
    let o = q; for (const [re, to] of swaps) o = o.replace(re, (m, g1) => { let r = to.replace("$1", g1 || ""); r = r.replace(/^i\b/, "I"); return m[0] === m[0].toUpperCase() && r ? r[0].toUpperCase() + r.slice(1) : r; });
    return o.replace(/\s+([,.!?])/g, "$1").replace(/([“"])\s+/g, "$1");
  });
}
function _usSay(text) { return _swapSay(text, _US_SWAP); }
// …and a single line a helper RETURNS rather than picks from a pool (the busy hour, the bars still open, the manager's nudge)
function _usLine(npc, line) { const v = npc && _VOICES[_voiceKind(npc)]; return v && typeof line === "string" ? _swapSay(line, v[1]) : line; }
function _voiceFit(pool) {
  const v = Array.isArray(pool) && pool.length && typeof _talkingTo !== "undefined" && _VOICES[_voiceKind(_talkingTo)];
  if (!v) return pool;
  const plain = pool.filter(l => !v[0].test(_speechOf(l)));
  if (plain.length) return plain;
  return pool.map(l => typeof l === "function" ? (...a) => _swapSay(l(...a), v[1]) : _swapSay(l, v[1]));
}
function _pickVary(pool, key) {
  pool = _voiceFit(_roomFit(pool));
  if (!pool || pool.length < 2) return pool && pool[0];
  G._lastPick = G._lastPick || {};
  // no line again until half the pool has been said (Steve's fifth run: Jiab's lines and the morning-after paragraphs
  // came word for word on different nights — a one-deep memory only stops the line said just now). One roll, as before,
  // so the seeded stream does not move; the walk to the next unsaid index is bounded by the pool.
  const keep = Math.max(1, Math.floor(pool.length / 2));
  let recent = G._lastPick[key]; recent = Array.isArray(recent) ? recent : recent == null ? [] : [recent];
  let i = Math.floor(_rand() * pool.length);
  for (let k = 0; k < pool.length && recent.includes(i); k++) i = (i + 1) % pool.length;
  G._lastPick[key] = recent.concat(i).slice(-keep);
  return pool[i];
}

// THE PAPER BY THE TILL (the laundering material, 2026-10-08): every bar hangs a licence and a registration that
// nobody reads. This derives one from the data — the sign is never the operator. A small bar is a commercial
// registration in the name of the woman who actually owns it (the mamasan, or the one woman who is the bar), no
// capital, no accounts; a go-go is a company at exactly one work permit's worth of capital; the groups carry two
// permits; your own bar is 51/49 to the share, with the partner's full name on it. A few names are winks, and one
// name turns up on four unrelated bars across town, which is the research's nominee test made into a hidden job.
const BENJAWAN_BARS = ["the_bucket", "gold_rush", "water_buffalo", "two_stools"];
const _LICENCE_CO = [["Siam Neon", "Entertainment"], ["Golden Orchid", "Entertainment"], ["Blue Marlin", "Leisure"], ["Eastern Star", "Entertainment"], ["Sunrise Coast", "Leisure"], ["Lotus Night", "Entertainment"], ["Pattaya Dream", "Leisure"], ["Thai Smile", "Entertainment"]];
// the Thai name on 51.00 of a company: the nominees the lawyers send farang to. Orathai is three of the eight —
// the research's nominee test (one person, many venues, no apparent means), there to be noticed (Graham, round 74:
// "a Thai name on 51.00 … that I am never given")
const _LICENCE_NOMINEE = ["Orathai Wongsuwan", "Supaporn Kaewmanee", "Orathai Wongsuwan", "Wanpen Chaiyasit", "Kanya Boonmee", "Orathai Wongsuwan", "Rattana Saetang", "Siriluk Thongdee"];
const _PLG_ROOMS = ["pink_lotus", "kitten_corner", "golden_dragon", "orchid_room", "jade_lounge", "peach_lounge"];   // the group's own rooms by the game's own prose: Kesinee "runs one of their bars", the Dragon's "new owners", the flagship, the back room
function _licenceNominee(room) { return _LICENCE_NOMINEE[_hh("nom:" + room, 29) % _LICENCE_NOMINEE.length]; }
// THE OWNER, NOT THE ROTA (Graham, round 74: the Hive's frame changed its name between Wednesday and Sunday): the woman
// whose name is on a registration is the mamasan whose bar it is — her `room` or one of her `bars` — wherever she is tonight
function _licenceOwner(room) {
  const mama = Object.keys(NPCS).find(i => NPC_ROLES[i] === "mamasan" && (NPCS[i].room === room || (NPCS[i].bars || []).includes(room)));
  if (mama) return mama;
  const staff = Object.keys(NPCS).filter(i => NPC_ROLES[i] && (NPCS[i].room === room || (NPCS[i].bars || []).includes(room)));
  return staff.length === 1 ? staff[0] : null;
}
function _licenceOf(room) {
  const r = ROOMS[room]; if (!r || !r.bar) return null;
  const fmt = n => "\u0e3f" + _num(n);
  const samson = [...(NPCS.bill && NPCS.bill.bars || []), ...(NPCS.wimon && NPCS.wimon.bars || []), "hyper"];
  const nom = _licenceNominee(room);
  if (room === "stinky_bar" && !_flag("barToPlg")) {   // sold to the group, it is on the group's paper (below)
    if (_barOwned() && G.bar && room === G.bar.room) {
      const tan = _flag("partnerTan");
      return { kind: "company", name: "Stinky Pinky Beach Bar Co., Ltd.", capital: 2000000, nominee: tan ? "Thanakorn Srisawat" : "Kanokwan Pholsiri",
        line: `A company, capital ${fmt(2000000)} — one work permit's worth, which is one more than you hold. Shareholders, to the share: ${tan ? "Thanakorn Srisawat" : "Kanokwan Pholsiri"} — ${tan ? "Tan" : "Candy"}, by a name you have never once heard anyone use — 51.00, and a farang name that is yours, 49.00. The building is on none of it.` };
    }
    return { kind: "company", name: "Stinky Pinky Co., Ltd.", capital: 2000000, nominee: nom,
      line: `Stinky Pinky Co., Ltd., capital ${fmt(2000000)} — one work permit's worth, an American's, issued years ago to the owner Bert talks about and has not seen behind this rail since his heart started arguing with him. On 51.00 of it, in smaller type, ${nom.toUpperCase()}.` };
  }
  if (_PLG_ROOMS.includes(room) || r.owner === "plg" || r.plg || (room === "stinky_bar" && _flag("barToPlg"))) return { kind: "company", name: "Pattaya Leisure (Holdings) Co., Ltd.", capital: 4000000, nominee: null, line: `Pattaya Leisure (Holdings) Co., Ltd., capital ${fmt(4000000)} — two permits' worth. The group's own name, which is not on the sign either, and the same paper in every room the group runs: one company, so that the whole of it opens or shuts at once.` };
  if (samson.includes(room)) return { kind: "company", name: "Samson Brothers Hospitality Co., Ltd.", capital: 4000000, nominee: null, line: `Samson Brothers Hospitality Co., Ltd., capital ${fmt(4000000)}: two work permits, one of them Bill's. Three beer bars, three clubs and a go-go on one company — the brothers bought the paperwork once and have been adding rooms to it since.` };
  if (room === "white_rabbit") return { kind: "company", name: "White Rabbit Naklua Co., Ltd.", capital: 2000000, nominee: NPCS.nuan ? NPCS.nuan.name : nom, line: `White Rabbit Naklua Co., Ltd., capital ${fmt(2000000)} — one permit, the manager's, so Eddy is on the paper as the one farang this room is allowed. On 51.00 of it: ${NPCS.nuan ? NPCS.nuan.name.toUpperCase() : nom.toUpperCase()}, which is what "he signs the papers" meant, word for word.` };
  if (room === "queen_vic") return { kind: "company", name: "Mind The Step Co., Ltd.", capital: 2000000, nominee: nom, line: `Mind The Step Co., Ltd., capital ${fmt(2000000)}, one permit — the pub's, since a farang pulls the pints. Somebody on this rail named the company, and the same somebody signs a column the same way.` };
  if (room === "cloze") return { kind: "company", name: "Soi Sanuk Language Co., Ltd.", capital: 1000000, nominee: null, line: `Soi Sanuk Language Co., Ltd., capital ${fmt(1000000)} — a school's paper, not a bar's, because the bar is the classroom. The licence to sell beer hangs beside it, in Kruu Waen's own name.` };
  if (room === "succubus") return { kind: "company", name: "Kinnaree Hospitality Ltd., Part.", capital: 1000000, nominee: null, line: `Kinnaree Hospitality Ltd., Part., capital ${fmt(1000000)} — the married man's permit, half price, and her name first because it has to be. Thirty years on the hill on exactly that paper.` };
  if (room === "sandy_toes") return { kind: "registration", name: "Last Baht Beach Bar", owner: null, line: "A commercial registration — no capital, no accounts — in the name LAST BAHT BEACH BAR, which is not what the sign says and never was. Whoever registered it had a sense of humour about the hour, or about the money." };
  if (BENJAWAN_BARS.includes(room)) return { kind: "registration", name: "Benjawan Srisuk", owner: null, line: "A commercial registration — no capital, no accounts, no permit — in the name of one BENJAWAN SRISUK, dated 2019. Nobody on the floor is called Benjawan." };
  if (r.barType === "gogo" || r.barType === "gents" || r.barType === "club") {
    const [a, b] = _LICENCE_CO[_hh("lic:" + room, 23) % _LICENCE_CO.length];
    return { kind: "company", name: `${a} ${b} Co., Ltd.`, capital: 2000000, nominee: nom, line: `${a} ${b} Co., Ltd., capital ${fmt(2000000)} — exactly one work permit's worth, for a farang who is not on the floor tonight and whose name is not on the sign either. On 51.00 of it, in smaller type: ${nom.toUpperCase()}.` };
  }
  const own = _licenceOwner(room);
  if (own) {
    const n = NPCS[own].name, title = /^mama\b/i.test(n);
    const shown = title ? "her own name, which is not the one the soi calls her — the registrar does not take 'Mama' as a first name" : `the name of ${n}`;
    return { kind: "registration", name: title ? "Khun " + n.replace(/^mama\s+/i, "") : n, owner: own, line: `A commercial registration — no capital, no accounts, no permit, the cheapest kind of bar there is to lose — in ${shown}${(NPCS[own].bars || []).length > 1 ? `, who owns ${["", "one", "two", "three", "four", "five", "six"][NPCS[own].bars.length] || NPCS[own].bars.length} of these and works them in turn` : ""}.` };
  }
  return { kind: "registration", name: "a name that is not the sign's", owner: null, line: "A commercial registration — no capital, no accounts — in a Thai name that is not the sign's and belongs to nobody working this floor: an owner who does not come in." };
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
const _TAN_ROUNDS = ["soi6_street", "soi6_west_in", "soi6_mid", "soi6_east_in", "soi6_deep"];   // the soi's five stretches
const _TAN_LEAVES = ["Tan finishes his coffee, nods to you, and walks on down the soi.", "Tan checks the street the way he checks everything and drifts off up the soi, unhurried.", "Tan touches your arm — \"later, my friend\" — and moves on along the soi."];
const _TAN_COMES = ["Tan comes strolling up the soi with a coffee in his hand and stops beside you as if he'd meant to.", "Tan wanders into the stretch you're standing on, sees you, and raises the cup.", "Tan appears at your elbow, from wherever he was, the way he does."];
const _TAN_HOME = ["Tan looks at his watch, says \"midnight, my friend — home\", and walks off towards the car.", "\"Home,\" Tan says, as the clock turns over. \"Tomorrow, early.\" He goes."];
// his round, narrated where it touches you: he leaves the stretch you're on, comes to it, or goes home at midnight
function _tanWalkTick() {
  if (!NPCS.tan || NPCS.tan.room !== "soi6_street" || !_flag("act1Done")) return;
  if (G.convo === "tan") return;   // he is frozen while you talk
  const now = _npcActive("tan") ? _npcRoom("tan") : null, was = G.soc.tanWas;
  G.soc.tanWas = now;
  if (was === undefined || was === now) return;
  if (was === G.room && !now) _say(_pickVary(_TAN_HOME, "tanhome"), "dim");
  else if (was === G.room) _say(_pickVary(_TAN_LEAVES, "tanleaves"), "dim");
  else if (now === G.room) _say(_pickVary(_TAN_COMES, "tancomes"), "dim");
}
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
  // Glam's escorted evening — home bar early, wheeled across after 22:00.
  if (n.shuttle) return _inShuttle(n, _nightHour()) ? n.shuttle.to : n.room;
  // Auntie Nok's evening feed: her own dialogue says "morning AND night, ten
  // year" — the morning half is outside the simulated clock entirely (the
  // night runs 18:00-04:00), but the evening half is a recurring, checkable
  // fact of the world, not just the one scripted wake-up scene. First hour of
  // every night (18:00-18:59), she's at jomtien_beach with the cats; frozen to
  // the hour a conversation STARTED at (same idiom as _hopRoom, below) so a
  // long first chat with her doesn't have her vanish mid-sentence the moment
  // the clock ticks past 19:00.
  if (id === "nok") {
    const hour = (G.convo === id && G.convoHour != null) ? G.convoHour : _nightHour();
    if (hour === 0) return "jomtien_beach";
  }
  // Tan walks the soi (Mario, 2026-10-26): the first hour at his car where he dropped you, then a stretch of Soi 6 an
  // hour by a pure hash of the night, until midnight, when he goes home (`until` on his record). Frozen while you talk.
  if (id === "tan" && NPCS.tan.room === "soi6_street") {
    const hour = (G.convo === id && G.convoHour != null) ? G.convoHour : _nightHour();
    if (hour > 0) return _TAN_ROUNDS[_hm("tanroam:" + G.vacation + ":" + G.day + ":" + hour, 29) % _TAN_ROUNDS.length];
  }
  // A character the WORLD moved. Declarative, because the alternative is a
  // special case in _npcRoom per character: {flag, room}, and when the flag is
  // set that is simply where they are now. Today it is Bert after the bar goes
  // — the losing ending says in as many words that he doesn't stay, and then he
  // was still on his stool four days later telling the man who bought it and
  // lost it that the old man would carry him (round 24, Keith).
  if (n.movesTo && [].concat(n.movesTo.flag).some(f => _flag(f))) return n.movesTo.room;
  // …and the rail drifts early doors (see _hopsNow / _hopRoom).
  if (_hopsNow(id)) return _hopRoom(id);
  return n.room;
}

// ── The early-doors drift ───────────────────────────────────────────────────
// A regular has one local but not one stool: before ten he is somewhere in his
// own manor, and where exactly is a matter of who was buying. From 22:00 he is
// at his local, which is why "go and find him" errands work at all — the back
// half of the night is stable on purpose (Mario, 2026-08-29).
//
// This RE-ANIMATES the retired hourly-hop system rather than inventing one. That
// system was ripped out because a location was true when printed and false when
// you arrived, and a persona gave up hunting Fergie on the strength of it. What
// is different now: _npcWhere reports absence, _elsewhereLine places people,
// Tan's locator is advertised, and _questWhere hedges — the game can ask, place
// and hedge, which it could not in the hop's first life.
//
// PURE HASH, NEVER DICE, and that is a hard constraint rather than a preference:
// _questWhere detects movement by mutating G.nightTurn, re-asking _npcWhere and
// restoring it. A _rand() anywhere in this path would burn dice on a lookup and
// desync the seeded daily.
const HOP_CHANCE = 10;   // per cent, per hour
const HOP_SETTLE = 4;    // 22:00 — from here he is at his local

// Who is loose tonight. Working staff never drift (they are ON), and the guard
// reads G.convo DIRECTLY — calling _convoActive() here would recurse forever,
// since it asks _npcsHere() which asks this. A man mid-conversation with you
// does not wander off mid-sentence: _convoActive clears a live conversation the
// instant its partner leaves the room, silently, and destroys the question he
// had put to you along with it.
// SPLIT IN TWO, and the split is the whole of a bug. _canHop is about the MAN —
// is he the sort who drifts at all — and consults no clock. _hopsNow adds "and
// it is still early", which is about the HOUR. Folding the two together meant
// _railRoomAt(id, 3), asked at 22:00, answered "he was home at nine" for every
// hopper in the game: from === to, and the ten-o'clock homecoming was never
// narrated once. Two personas caught it independently in one round — one watched
// a man leave with a proper line and reappear in silence, the other had a man
// vanish from under her while she stood in the room. The rail thinned and never
// filled. Anything asking about an hour that is not now must use _canHop.
function _canHop(id) {
  const n = NPCS[id];
  if (!n || !n.hops) return false;
  if (NPC_ROLES[id] || n.manager || n.filler || n.house) return false;
  if (G.mode === "soi6") return false;   // the challenge fences the map; drifting leaves it
  return true;
}
function _hopsNow(id) {
  return _canHop(id) && _nightHour() < HOP_SETTLE;
}

// His manor: the bars of the districts he actually drinks in — `haunts` when
// authored (Fergie works Buakhao AND Tree Town), else his home district — minus
// the bars he will not set foot in (`avoids`: creditors, a ban, history). Both
// fields are original authored intent from the hop's first life.
// Deliberately CLOCK-INDEPENDENT: filtering on _closesMidnight (a property of
// the room) rather than _closedNow (a property of the hour) keeps the pool the
// same all evening, which is what lets the cumulative walk below stay pure.
// The bars a regular never drifts INTO: the ones that kept the law's midnight
// before Soi 6 moved to two — gentleman's clubs, the Soi 6 short-time fronts
// and the Darkside. Frozen on purpose: the drift is over by ten, so the closing
// hour never mattered to it, and a moved hour must not re-roll the town's walks.
function _lawHoursBar(r) {
  return !!(r && r.barType) && (r.barType === "gents" || r.barType === "soi6" || r.region === "Darkside");
}
function _hopPool(id) {
  const n = NPCS[id];
  const home = ROOMS[n.room];
  if (!home) return [];
  const regions = (n.haunts && n.haunts.length) ? n.haunts : [home.region];
  const avoids = n.avoids || [];
  return Object.keys(ROOMS).filter(r =>
    ROOMS[r].barType && regions.indexOf(ROOMS[r].region) >= 0 &&
    avoids.indexOf(r) < 0 &&
    !_lawHoursBar(ROOMS[r]));
}

// A CUMULATIVE walk, not a per-hour teleport: he starts at his local and moves
// on one bar for each hour the dice of the world said "one more, then". Pure in
// (id, vacation, day, hour), so it can be asked about ANY hour — which is what
// lets a pointer say where he was and where he will have got to.
function _hopRoom(id, hourArg) {
  const n = NPCS[id];
  const pool = _hopPool(id);
  if (pool.length < 2) return n.room;
  let i = pool.indexOf(n.room);
  if (i < 0) i = 0;
  // A man mid-conversation with you does not wander off mid-sentence, so while
  // you are talking his clock stops: he stays exactly where he was when you sat
  // down. Freezing the HOUR rather than pinning the room matters — pinning him
  // home would teleport him out of a drift bar you were standing in, killing the
  // conversation this guard exists to protect, and returning G.room instead
  // would make him follow you around the town forever, because _convoActive
  // clears a stale conversation only by noticing he ISN'T where you are.
  const hour = hourArg != null ? hourArg
    : (G.convo === id && G.convoHour != null) ? G.convoHour : _nightHour();
  // QUIZ NIGHT IS THE ONE PLACE HE GOES ON PURPOSE. Everything else here is
  // aimless — a man finishing a beer and trying the next bar along — and aimless
  // movement alone reads as scenery that shuffles. On a Thursday, most of the
  // rail turns up where the quiz is: _quizBars() is already a pure hash of
  // (vacation, day), so the pull costs no machinery, holds across a save, and in
  // a shared world every player would agree on it without a word passing between
  // them (rule 6). Two men in three, so the other bars are thinner, not empty.
  if (_isQuizHour(hour) &&
      _hh(id + ":" + G.vacation + ":" + G.day + ":quiz", 97) % 3 !== 0) {
    const quiz = _quizBars().filter(r => pool.indexOf(r) >= 0);
    if (quiz.length) return quiz[0];
  }
  // AND THE ROAST PULLS THE SAME WAY. Sunday before nine, and a man whose manor
  // holds the Queen Vic is having his dinner there — which is what a roast is FOR
  // in a town eight thousand miles from the country that invented it. Same pure
  // hash, same shape, and it is the second reason in the game to be somewhere at
  // a particular hour on a particular day.
  if (_roastHour(hour) &&
      pool.indexOf("queen_vic") >= 0 &&
      _hh(id + ":" + G.vacation + ":" + G.day + ":roast", 89) % 4 !== 0) return "queen_vic";
  // The walk starts at hour ONE: at opening time every man is at his own local,
  // which is both the truer picture (you arrive at your bar, then you drift) and
  // a deliberate removal of a whole class of flake — the suite's default hour is
  // 0, so a drift on the opening hour would make any test that stands the player
  // at a regular's home bar fail one run in ten.
  for (let h = 1; h <= hour; h++) {
    if (_hh(id + ":" + G.vacation + ":" + G.day + ":" + h + ":hop", 71) % 100 < HOP_CHANCE)
      i = (i + 1) % pool.length;
  }
  return pool[i];
}

// ── The rail, seen moving ───────────────────────────────────────────────────
// The drift is worth nothing to a player who only ever sees its results. Two
// nights of a different roster reads as sloppy authoring; ONE man draining his
// glass and saying he's off to the Bucket is the whole mechanic explained in a
// sentence, and it is the difference between scenery that shuffles and a town
// with somewhere else in it.
//
// The idiom is the saleng's (_salengTick): the TRANSITION prints once, from the
// tick that made it, and only to a player standing in one of the two rooms —
// the standing state is _describeRoom's job. Nothing is said about a bar you
// cannot see into, which is also the honest rule: you learn that the rail moves
// by watching it move, not by being told.
//
// PRONOUN-FREE ON PURPOSE. Every hopper is a man today, but Angela and Sandra
// sit on the same bench and only their `hops: false` keeps them out of these
// pools — an author unanchoring one of them should not have to remember to come
// back here (my own _STAND_BEER said "he" for exactly that reason, round 20).
const _RAIL_LEAVES = [
  n => n + " drains the glass, slaps the bar twice, and is gone before the ice has settled.",
  n => n + " stands, pats the pockets in the usual order — {{phone}}, wallet, {{phone}} again — and heads off.",
  n => n + " signs off with a wave that takes in the whole bar and nobody in particular.",
  n => "“Right,” says " + n + ", to no one in particular, and goes.",
  n => n + " settles up, says something over the bar that gets a laugh, and wanders out into the soi.",
  n => n + " looks at the glass, then at the door, and picks the door.",
];
const _RAIL_ARRIVES = [
  n => n + " comes in, scans the rail out of habit, and takes a stool.",
  n => n + " arrives already talking, and is halfway through the sentence before sitting down.",
  n => n + " appears at the rail, nods at the room, and settles in.",
  n => n + " turns up, orders without being asked, and gets comfortable.",
  n => n + " ducks in out of the heat, sees the stool is free, and takes it.",
];
// Thursday, and they came for a reason — worth its own line, because this is
// the beat that tells the player the movement has a schedule behind it.
const _RAIL_QUIZ = [
  n => n + " arrives with the air of someone who has checked what night it is.",
  n => n + " comes in for the quiz, and makes no secret of wanting the win.",
  n => n + " turns up early for the quiz, which is how you can tell it matters.",
];
// Glam has been wheeled across to the other bar at ten every night of this
// game's life, and it has never once been said out loud.
// GLAM WALKS, ESCORTED — THERE IS NO WHEELCHAIR (Mario, 2026-09-07). The saleng is
// how he ARRIVES on the strip and how he is shuttled home at the end; the crossing
// between the two bars is done on his feet, one arm held by his companion or the
// Hyper mama, and on a bad night by both of them with a dancer sent out to help.
// His desc always said this; only these two pools had invented the chair.
// A shuttle is a WINDOW, not a one-way trip: he goes over for the music and comes
// back to his own bar after an hour (`until`, exclusive). Omit `until` for a move
// that stands for the rest of the night.
function _inShuttle(n, hour) {
  return hour >= n.shuttle.after && (n.shuttle.until == null || hour < n.shuttle.until);
}
const _GLAM_GOES = [
  "Glam's companion appears at his elbow without being asked, and the pair of them set off for " +
    "the other bar at the pace of a man who has all night and intends to use it.",
  "Glam checks his watch, taps the rail twice, and stands — slowly, and with a hand under each " +
    "arm, because the mama has come out from behind her own till to take the other one.",
  "“Same time,” says Glam, and goes out into the road between his companion and one of the " +
    "girls, who has been sent across for exactly this and does not mind.",
];
const _GLAM_COMES = [
  "Glam comes in on his companion's arm, settles at his usual angle to the rail, and has a " +
    "drink in front of him before he has finished sitting down.",
  "The doorway takes Glam and his companion two abreast and slowly, and then he is installed at the rail with " +
    "the air of a man arriving exactly on time.",
  "Glam arrives on somebody's arm and greets the bar like a man opening a meeting.",
];

// Where somebody stands at a GIVEN hour, settle and shuttle included — the form
// the narration needs, since it compares this hour against the one before it.
function _railRoomAt(id, hour) {
  const n = NPCS[id];
  if (!n) return null;
  if (n.shuttle) return _inShuttle(n, hour) ? n.shuttle.to : n.room;
  if (!_canHop(id)) return n.room;       // the MAN, not the hour — see _canHop
  return hour >= HOP_SETTLE ? n.room : _hopRoom(id, hour);
}

// Auntie Nok's evening feed ends at 19:00 and she walks back to her cart — and a man
// standing on the beach watched her vanish between two commands, told "isn't around
// here tonight" about the woman he had been talking to (Anand, round 59). The move
// is narrated once, the way the rail's is.
function _nokLeavesTick() {
  // the first tick from seven, once a day — a conversation running across 19:00 had her vanish without a word (Priya, round 58)
  if (!G || G.offstage || G.room !== "jomtien_beach" || G.nightTurn < 10 || G.nokLeftDay === G.day || G.convo === "nok") return;
  if (!_npcActive("nok")) return;
  _say(_pickVary([
    "Auntie Nok collects the cats' bowl, tells them something firm in Thai, and heads back up the sand toward her cart at Soi 7.",
    "The cats have eaten; Auntie Nok is done. She rinses the bowl in the edge of the sea, waves it at you like a flag, and walks back to her cart at Soi 7.",
    "Auntie Nok checks the sky as if it had a clock in it, and apparently it does. \"Cart, na — somebody steal my bottles.\" Back up the beach to Soi 7.",
  ], "nokleaves"), "dim");
  G.nokLeftDay = G.day;
}
function _railTick() {
  if (!G || G.offstage || G.game || G.pendingEnc || G.pendingChoice) return;
  if (!_inBar()) return;
  const hour = _nightHour();
  // Movement happens on the hour, so this is the only tick that can have one to
  // report — and hour 0 has no hour before it to compare against.
  if (hour < 1 || G.nightTurn % 10 !== 0) return;
  let said = 0;
  for (const id of Object.keys(NPCS)) {
    if (said >= 2) break;                 // a rail is not a railway station
    const n = NPCS[id];
    if (!n.shuttle && !n.hops) continue;
    if (G.convo === id) continue;         // his clock is stopped; he has not moved
    if (!_npcActive(id)) continue;
    const from = _railRoomAt(id, hour - 1), to = _railRoomAt(id, hour);
    if (!from || from === to) continue;
    const name = _npcLabel(id);
    if (to === G.room) {
      said++;
      if (n.shuttle) _say(_pickVary(_GLAM_COMES, "glamIn"), "dim");
      else if (_isQuizHour(hour) &&
               _quizBars().indexOf(to) >= 0) _say(_pickVary(_RAIL_QUIZ, "railQuiz")(name), "dim");
      else _say((G.missTarget && G.turns - G.missTarget.turn <= 1 && G.missTarget.w && String(name).toLowerCase().includes(G.missTarget.w) ? "Speak of the devil — " : "") + _pickVary(_RAIL_ARRIVES, "railIn")(name), "dim");
    } else if (from === G.room) {
      said++;
      if (n.shuttle) _say(_pickVary(_GLAM_GOES, "glamOut"), "dim");
      else _say(_pickVary(_RAIL_LEAVES, "railOut")(name), "dim");
    }
  }
}

// ── You cannot buy your way to happy on a full stomach ─────────────────────
// THE WORST FINDING OF ROUND 23, and it had been there all along: every plate in
// the game paid +1 สนุก with no cap and no check, so a persona stood outside a
// 7-Eleven and ate THIRTY-THREE cheese toasties on a hunger meter already at
// zero — ฿35 a happiness point, no diminishing return — and rode it to 100, the
// สบายสบาย the whole long game is built around, without meeting a soul. It also
// made the food prose lie to his face: every plate narrated "the hunger backs
// off" while there was no hunger to back off from.
//
// The fix is the honest one rather than a cap: a man who is not hungry does not
// want another plate. Food still tops you up when you're peckish (above FULL_AT);
// below it, the vendor keeps his food and you keep your money.
const _TOO_FULL = [
  "You look at it and your stomach, which has been paying attention, declines on your behalf.",
  "Not a chance. You couldn't manage another mouthful and it would be rude to waste it.",
  "You are, it turns out, entirely full. The thought of another plate is faintly upsetting.",
  "Your body files an objection. There is nowhere to put it.",
  "You've eaten. Another plate now would be a purchase, not a meal. Save it for when it's hunger.",
];
function _tooFull() { return G.hunger < FULL_AT; }
// Returns true if it printed a refusal — every food path checks it before taking
// money, so the guard and the charge can never drift apart.
function _fullNo() {
  if (!_tooFull()) return false;
  _say(_pickVary(_TOO_FULL, "tooFull"), "dim");
  return true;
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
  // …and the symmetric one: a man who says he goes home. Neil's own first line
  // is "one bottle, most nights, then home — ten minutes' walk past the
  // railway, and she likes me in by nine", and he was on the rail at three in
  // the morning. A character's stated habit is a claim about the world, and the
  // prose review exists to catch exactly this (same shape as David's stated
  // beer nights, which the season used to override). It also earns the arc: the
  // best story on the lake is only there if you get out to it early.
  if (n && n.until != null && G.nightTurn >= n.until) return false;
  // A pub that shuts at eleven sends its people home with it: the barmaid and the
  // whole rail are out of the Vic's door at its closing (Mario, 2026-10-11).
  { const home = n && n.room && ROOMS[n.room];
    if (home && home.barType && home.closesAt != null && G.nightTurn >= home.closesAt && _flag("act1Done")) return false; }
  if (n && n.sandbox && !_flag("act1Done")) return false; // not part of the opening quest's street
  if (G.soc && G.soc.sightedOff && G.soc.sightedOff[id] === G.day) return false;   // seen tonight at a table three districts from her stool (theme 5)
  // sent home early on a shift call — off the rail for the rest of the night
  if (G.soc && G.soc.leftEarly && G.soc.leftEarly[id] === G.day) return false;
  // home for the harvest, or gone to Bangkok till the rain stops (essay ledger theme 8)
  if (_awayForSeason(id)) return false;
  if (_exited(id)) return false;   // she hit the thing she said, and went (theme 11)
  if (G.bar && G.bar.kept && G.bar.kept.id === id && G.bar.kept.stage !== "done") return false;   // kept off your own floor by a sponsor's daily fee (the quiet shift change)
  if (G.bar && G.bar.gone && G.bar.gone[id]) return false;   // she gave you her notice, and you let it run (the bar-failure cycle)
  // the affair's endings take her off the floor for good: gone home to Isaan
  // after a break, or by the sea in Prachuap after the earned ending
  if (G.affair && G.affair.ended && (G.affair.gone || G.affair.won) && id === G.affair.id) return false;
  // a host you took off the floor tonight is off the floor (HIRE narrated
  // leaving the building while leaving him standing there — persona A#13)
  if (G.soc && G.soc.hostOut && G.soc.hostOut[id]) return false;
  if (id === "fast_eddy" && G.eddyBackDay && G.day < G.eddyBackDay) return false;   // gone to ground after the coffee (days, not a nightly flag)
  if (n && typeof n.hidden === "function" && n.hidden(G)) return false;   // a data-driven absence (a company that ceased to exist)
  // The regulars' bench (patron: true) keeps its two absences from the old
  // separate table, keyed on the flag so the STAFF never thin (barchain.test
  // pins that): `days` holds a working man to his nights out (David's Mon/Fri),
  // and _benchOut sits a season-scaled share of the bench at home in the lean
  // months. Absence lives HERE and not in _npcRoom so _npcRoom stays total —
  // an inactive man still HAS a local, he just isn't on its stool tonight,
  // which is exactly what _elsewhereLine's "isn't around right now" reads.
  if (n && n.patron) {
    if (n.days && !n.days.includes(G.day % 7)) return false;
    if (_benchOut(id)) return false;
  }
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
// …and the woman who WRITES the chit is the till-keeper, not whoever runs the floor (Siobhan, round 77:
// "the mamasan's biro logs ฿190" at the Sweet Tamarind, where Tukta keeps the till)
function _tillRef(cap) {
  const tk = typeof _tillKeeper === "function" ? _tillKeeper(G.room) : null;
  if (!tk || !_npcsHere().includes(tk)) return _mamaRef(cap);
  const s = NPC_ROLES[tk] === "cashier" ? _L("the cashier") : NPC_ROLES[tk] === "mamasan" ? _L("the mamasan") : NPCS[tk].name;
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
}
function _mamaRef(cap) {
  // through _L: this is interpolated INTO an already-translated sentence, so an
  // untranslated word here would leave "der Kuli von the mamasan" in a de run.
  // …and on a one-woman bar there is no mamasan AND no cashier, so it named a
  // second member of staff who has never worked there (round 43, the one-person
  // bar audit — sixteen bars of eighty-eight are somebody on her own).
  const cashier = _npcsHere().some(x => NPC_ROLES[x] === "cashier");
  // …and on a two-girl floor the money is kept by one of the two, not by a till girl nobody has met (Marguerite, round 67)
  const tk = typeof _tillKeeper === "function" ? _tillKeeper(G.room) : null;
  const s = _L(_mamaHere() ? "the mamasan" : cashier ? "the cashier" : tk && NPCS[tk] && _npcsHere().includes(tk) ? NPCS[tk].name : "the house");
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
  areca:     { room: "areca_room",     name: "Areca Lodge",       rate: 900,  expatRate: 520, pool: true }, // "a window over the garden pool"
  metropole: { room: "metropole_room", name: "LK Metropole",      rate: 1300, expatRate: 730, pool: true },
  condo:     { room: "condo_room",     name: "condo on Pratumnak", rate: 0, expatRate: 0, pool: true, monthly: true },   // by the month, on the payday's clock (2026-10-20) — never a desk, never on the ladder
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
  if (G.hotel === "condo") return;
  if (G.keptBy) return;   // her mat: no folio (destitution, 2026-10-20)
  if (G.roomPrepaid === G.day - 1) { G.roomPrepaid = null; return; }   // the night was paid at the desk, or by Bert: no folio under the door for it
  if (G.street) { G.roofless = G.day; return; }   // a bench takes no folio: the desk does not bill a man it did not house (Alun, round 104)   // a roof by the month bills on the payday (_condoMonth), not under the door
  if (G.hotelDebt && G.money >= G.hotelDebt + _hotelRate(G.hotel)) {
    G.money -= G.hotelDebt;
    _say(`(You settle the ฿${_num(G.hotelDebt)} on the book on your way past the desk. ` +
      "The ledger closes with real warmth.)", "dim");
    G.hotelDebt = 0;
  }
  const _monthRoom = (n) => { if (G.stage === "expat" && G.month) { G.month.rent = (G.month.rent || 0) + n; G.roomNight = (G.roomNight || 0) + n; } };   // roomNight: the ledger counts the room into the month's spend even on a night that was "up" (Kaspar, round 101: "฿1,080 spent, ฿1,350 of it the room")   // the month's book counts what was PAID for the room (Dougal, round 97: "฿2,160 of it the room" from a book at its cap)
  if (G.money >= _hotelRate(G.hotel)) {
    G.money -= _hotelRate(G.hotel); _monthRoom(_hotelRate(G.hotel));
    _say(`(${G.checkoutNight ? "Checkout: the last night settled at the desk on the way to the taxi" : rough ? "The folio is waiting at the desk when you finally get back" :
      "The folio slides under the door"}: ฿${_num(_hotelRate(G.hotel))}` +
      (G.stage === "expat" ? " — the long-stay rate" : "") +
      `, the ${_HOTELS[G.hotel].name}. ฿${_num(G.money)} left.)`, "dim");
    return;
  }
  // A guest with ฿94,700 in the account and ฿450 in his pocket had his bag posted
  // to Naklua (Lionel, round 36). The desk runs the card before it runs you out.
  if ((G.bank || 0) >= _hotelRate(G.hotel)) {
    G.bank -= _hotelRate(G.hotel); _monthRoom(_hotelRate(G.hotel));
    _say(`(Light pockets; ${_walletHunt() ? "the desk takes a transfer from the app instead — the card went with the wallet" : "the desk runs your card instead"}. ฿${_num(_hotelRate(G.hotel))}, the ` +
      `${_HOTELS[G.hotel].name}, off the account — ฿${_num(G.bank)} in the bank.)`, "dim");
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
    G.money -= rate; _monthRoom(rate);
    _say(`(฿${_num(rate)} for the night. ฿${_num(G.money)} left — thin, but paid.)`, "dim");
  } else {
    const owedBefore = G.hotelDebt;
    G.hotelDebt = Math.min(_DEBT_CAP, G.hotelDebt + rate);
    _addHappy(-1);
    // At the cap the book STOPS — and it used to go on announcing a charge it
    // wasn't making, six nights running against a total that hadn't moved since
    // day 18 (credit-analyst persona, round 20). The generosity is the point of
    // this beat, so say what it actually is once you're past the arithmetic:
    // he is no longer writing you down, which is worse to owe than money.
    _say(G.hotelDebt > owedBefore
      ? _fmt("The night clerk takes in the situation and adds ฿{r} to the book " +
        "without a word — ฿{d} on it now. His kindness is the heaviest " +
        "thing you'll carry today.", { r: rate, d: G.hotelDebt })
      : _fmt("The night clerk doesn't reach for the book. He stopped writing you " +
        "down somewhere around ฿{d} and has not mentioned it since, which is a " +
        "different kind of debt and a heavier one.", { d: G.hotelDebt }), "alert");
    if (G.hotelDebt <= owedBefore && G.stage === "expat") G.roofless = G.day;   // nothing written, nothing paid: no roof this morning (destitution, 2026-10-20)
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

// Low season empties the RAIL, not just the till. A share of the regulars stay
// in on any given night in the lean months — day-stable pure hash of (id,
// vacation, day), so it doesn't flicker as you re-enter and every player agrees
// (rule #6). This is what finally lets the season reach the ROOM (both publican
// playtests, 2026-08-26: the rail read identical in Sept and Dec) and unlocks the
// empty-bar monsoon register, which was unreachable while the bench never thinned.
// Two bars can share a name — they do in the real town, and the game keeps both
// (a Sundowner on Soi Diana, Neil's on the lake). A POINTER to one of them has
// to say which: a man sent after Neil was being sent four districts wrong
// (prose review, 2026-09-04).
function _dupeBar(room) {
  // normalised, because the pair that actually collides is "The Sundowner" and
  // "Sundowner Bar" — a player hears one name and walks to either
  const norm = x => String(x || "").toLowerCase().replace(/^the /, "").replace(/ (bar|pub|club)$/, "").trim();
  const n = norm(_barName(room));
  return !!n && Object.keys(ROOMS).some(r => r !== room && norm(_barName(r)) === n);
}
function _anchorNight(id) { return _hh(id + ":anchor", 5) % 7; }   // 0 = Sunday … 6 = Saturday (day 1 is a Monday)
const _ANCHOR_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
function _benchOut(id) {
  if (!_flag("act1Done")) return false;              // the opening night's cast is fixed
  // A MAN WHO NAMED HIS NIGHTS KEEPS THEM. David is the only character in this
  // game who hands the player a hard schedule — "Mondays and Fridays are my days
  // off so those are my beer days" — and a persona wrote it down, planned an
  // evening on it, walked to the Stinky on a Monday and found an empty stool.
  // Measured before the fix: absent on 19 of 32 of his own stated nights in the
  // deep-low months. The season may quietly thin a bench nobody was promised;
  // it may not falsify the one thing a character told you to rely on. This is
  // the promise doctrine applied to a rota — an invitation is a promise, and so
  // is a timetable.
  if (NPCS[id] && NPCS[id].days && NPCS[id].days.includes(G.day % 7)) return false;
  // …and EVERY regular has one night a week that is his, season or no season
  // (Vic, round 40: Randy stayed in seven nights of seven in a September week,
  // by the per-night hash alone — a man nobody can find is not a regular).
  // Pure hash of the id, so Tan can name the night.
  if ((G.day % 7) === _anchorNight(id)) return false;
  // …and a man the ROOM calls a fixture is one: the Vic's own desc puts Mort's
  // notebook at the far end "most nights, as much a fixture as the dartboard",
  // and a September persona found the stool empty nine visits of nine — the
  // season kept him in on exactly her nights (Brenda, round 47). `fixture: true`
  // on the entry; the desc is the claim, this keeps it.
  if (NPCS[id] && NPCS[id].fixture) return false;
  const stay = { peak: 0, high: 0.05, shoulder: 0.22, low: 0.45, deeplow: 0.6 };
  const p = (typeof _seasonTier === "function") ? (stay[_seasonTier()] || 0) : 0;
  if (p <= 0) return false;
  return _hh(id + ":" + G.vacation + ":" + G.day + ":pout", 71) % 100 < Math.round(p * 100);
}
// Where a character actually IS tonight, or null if they are not out at all.
// _npcRoom answers "which room is theirs" and is deliberately total; this is
// the presence-aware form, and the two differ for anyone _npcActive can hide:
// a regular on his teaching night or sat at home in low season, a girl sent
// home early, an origin archetype you ARE. Use this wherever you would print
// or promise a location — a stool he isn't on is worse than saying nothing.
function _npcWhere(id) {
  return _npcActive(id) ? _npcRoom(id) : null;
}

// The rail crowd in this room: the named regulars (patron: true), as opposed to
// the staff working it. Still a meaningful question after the fold — the bar's
// ambient prose thins when nobody is at the rail, and TALK TO THE REGULAR wants
// a real name before it falls back to the anonymous bar-bore.
function _regularsHere() {
  return _npcsHere().filter(id => NPCS[id].patron);
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
  if (G.convo !== id) G.convoPage = 0;   // a page into Bert means nothing with Lek
  G.convoHour = _nightHour(); // his drift clock stops while you're talking (see _hopRoom)
  // Switching partners LAPSES a pending question from the old one — the doc'd
  // "changes the subject" rule, enforced at the switch itself. Without this the
  // old asker's numbered answer prompt kept re-printing under the new partner's
  // turns while a typed digit routed to the new partner (mobile playtest,
  // 2026-08-17, Bpom's question haunting Roger's conversation).
  if (G.convoQ && G.convoQ.id !== id) {
    const who = _convoName(G.convoQ.id), _qid = G.convoQ.id;
    // the question isn't spent — next time that node lands it can be asked again
    const ost = _npcState(G.convoQ.id);
    if (ost && ost.know) delete ost.know["asked_" + G.convoQ.key];
    // …but clearing `asked_` was NOT enough on its own: the dialogue ENTRY that
    // carried the ask is already in G.talked, so re-talking gave the brush-off
    // and the question was never put again — while the whole consistency system
    // hangs on answering it (persona report B#15, 2026-08-23). Remember it, and
    // re-ask on the next conversation with that person.
    (G.convoLapsed = G.convoLapsed || {})[G.convoQ.id] = { key: G.convoQ.key, q: G.convoQ.q || "", day: G.day };
    G.convoQ = null;
    _say(`(${who}'s question will keep — you've turned to ${_convoName(id)}, and ${_sheHe(_qid).s} will ask again.)`, "dim");   // "goes unanswered" read as a penalty for greeting the room (Margaret, round 78)
  }
  const _same = G.convo === id;
  G.convo = id; G.itNpc = id;
  // coming back to somebody whose question you walked away from: they ask again,
  // once, because a question that can never be re-offered is a dead end
  const lapsed = G.convoLapsed && G.convoLapsed[id];
  // …but a question she put aside a moment ago for YOURS, in the same conversation, is still waiting on your answer
  // after she gives hers — it is not re-asked and not lost (Steve's fourth run: "Doncaster Rovers")
  if (lapsed && !G.convoQ && _same && lapsed.back != null && G.turns - lapsed.back <= 3) { /* kept for the answer */ }
  else if (lapsed && !G.convoQ) {
    delete G.convoLapsed[id];
    // the same night only: "First time this bar?" five nights and three drinks later (Bernard, round 88)
    if (lapsed.q && !lapsed.dodged && (lapsed.day == null || lapsed.day === G.day)) {
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
  return (NPCS[id] && NPCS[id].name) || id;
}
function _convoActive() {
  const id = G.convo;
  if (!id) return null;
  const here = NPCS[id] && _npcsHere().includes(id);
  if (!here) { // partner gone → conversation over; the question isn't spent, she can ask again
    if (G.convoQ) { const ost = _npcState(G.convoQ.id); if (ost && ost.know) delete ost.know["asked_" + G.convoQ.key]; }
    G.convo = null; _convoDrop(true); return null;
  }
  return id;
}
// A question left unanswered is remembered (G.convoLapsed) so a numbered reply
// typed a beat late gets the drift line rather than a parse failure — every
// site that clears convoQ without an answer goes through here (Gareth, round 46).
// `dodged`: you changed the subject (or she left) — remembered for the digit
// courtesy only, never re-asked; a walk-away (dodged=false) is re-asked next talk.
// WHAT A FRONTEND SHOWS WHILE YOU ARE TALKING TO SOMEBODY (Mario, 2026-10-03:
// "an indicator of some sort when locked into dialogue mode … show portrait
// thumbnail and basic info"). Pure — it reads G and never clears it; the
// partner-left cleanup stays _convoActive's, on the next command. Engine-side so
// a 2D or served frontend draws the same card without knowing the rules.
// what she REMEMBERS of you (_knownTier), not this week's warmth — and "a stranger"
// read as a slap after three drinks, a number swap and her own flirting text (Dev, round 65)
const _CARD_TIER = ["just met", "knows your face", "you're a regular", "her farang"];
function _convoCard() {
  if (!G) return null;
  // a quiz, a game, an encounter or a modal question owns the input: the card's
  // "bye" went to the quiz as a wrong answer (Margaret, round 65)
  if (G.game || G.pendingEnc || G.pendingBf || G.pendingFare || (G.pendingChoice && G.pendingChoice !== "intro")) return null;
  const _pids = (G.party && G.party.ids) || [];
  let id = G.convo;
  // not talking to anybody, but a woman is on your arm: the card says so — after
  // TAKE HER OUT nothing on screen showed she was with you (Margaret, round 65)
  const companion = !(id && NPCS[id] && _npcsHere().includes(id)) && _pids.length ? _pids[0] : null;
  if (companion) id = companion;
  if (!id || !NPCS[id] || !_npcsHere().includes(id)) return null;
  const n = NPCS[id], role = NPC_ROLES[id];
  const out = _pids.includes(id);
  // a companion works somewhere else: her own bar, not the one you are standing in
  // ("on the floor · Front Row Bar" for a Pink Lotus girl — Margaret, round 65)
  const where = out ? "out with you" + ((_barName(NPCS[id].room)) ? " · from " + _barName(NPCS[id].room) : "")
    : (_barName(G.room)) || (_room() && _room().name) || "";
  if (companion) return { id, name: _pids.length > 1 ? _pids.map(p => NPCS[p].name).join(" & ") : n.name, line: where, tier: null, cold: false, asking: false, companion: true };
  const job = role === "mamasan" ? "mamasan" : role === "cashier" ? "on the till" : role === "hostess" ? "on the floor"
    : n.manager ? "runs the bar" : n.patron ? (n.room === G.room ? "drinks here" : "a regular") : n.masseuse ? "masseuse" : "";
  const badge = typeof _badge === "function" ? _badge(id) : null;
  const line = out ? where : [job + (badge ? " #" + badge : ""), where].filter(Boolean).join(" · ");
  let tier = null, cold = false;
  if (role) {
    if (_maiDee(id)) { tier = "she has made up her mind about you"; cold = true; }
    else if (_affairLive() && G.affair.id === id) tier = "your girl";
    else if (_atOwnBar()) tier = "your staff";
    else {
      const k = typeof _knownTier === "function" ? _knownTier(id) : _bondTier(id);
      tier = k === 0 && G.phone && G.phone.contacts && G.phone.contacts[id] ? "has your number" : _CARD_TIER[k];
    }
  }
  return { id, name: n.name, line, tier, cold, asking: !!(G.convoQ && G.convoQ.id === id) };
}
function _convoDrop(dodged) {
  // `back`: when it was put aside — a short answer in the next few turns is still hers (Steve's fourth run, "Doncaster Rovers")
  if (G.convoQ && G.convoQ.q) (G.convoLapsed = G.convoLapsed || {})[G.convoQ.id] = { key: G.convoQ.key, q: G.convoQ.q, dodged: !!dodged, day: G.day, back: dodged ? G.turns : null };
  G.convoQ = null;
}
// she/he/they for a character the engine is ABOUT to pronoun — same logic the
// repeat-brush-off already uses (a working role or a filler girl reads she).
function _sheHe(id) {
  const n = NPCS[id];
  if (!n) return { s: "they", o: "them", p: "their" };
  const pn = typeof _pronoun === "function" ? _pronoun(id) : n.pronoun;   // the field wins, then the role default (a man on a role is "he")
  const she = pn === "she" || (!pn && !!n.filler);
  const he = pn === "he";
  return she ? { s: "she", o: "her", p: "her" } :
    he ? { s: "he", o: "him", p: "his" } : { s: "they", o: "them", p: "their" };
}

function _convoEnd(quiet) {
  const id = G.convo;
  // an unanswered question survives the interruption: she comes back to it
  // next time, same as when you turn to somebody else mid-ask
  if (G.convoQ && G.convoQ.q) {
    (G.convoLapsed = G.convoLapsed || {})[G.convoQ.id] = { key: G.convoQ.key, q: G.convoQ.q, day: G.day };
  }
  G.convo = null;
  G.convoQ = null;
  G.convoIdx = null;
  if (id && !quiet) {
    // "You take your leave of Fon" with Fon still on your arm (Ingrid, round 62): the chat
    // ends, the company does not
    if (G.party && G.party.ids && G.party.ids.includes(id)) _say(`${_convoName(id)} lets the subject go and keeps your arm.`, "dim");
    else _say(`You take your leave of ${_convoName(id)}.`, "dim");
  }
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
  const arr = ((NPCS[id] || {}).dialogue) || [];
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
  // a question that does not fit a resident: "how long you stay?" to the man who lives here, "you got money in
  // anything out here?" to the man whose bar he is sitting in (László, round 73)
  if (key === "stay" && G.stage === "expat") return;
  if (key === "trips" && G.metDay && G.metDay[id] != null && G.metDay[id] < G.day) return;   // "You again… I remember" and then "First time Pattaya?" (Meaw — Lorraine, round 95)
  if (key === "invested" && _barOwned()) return;
  st.know = st.know || {};
  if (st.know["asked_" + key]) return;
  // …and a question you already ANSWERED is never asked again, whatever cleared
  // the asked_ marker (a midnight kick-out, a lapse, a teardown). Re-asking is
  // how an honest answer that evolved with time ("first time in" → "third time
  // in", both true) got punished as a lie (grapevine playtest F1, 2026-08-25).
  if (st.heard && st.heard[key] != null) return;
  // one floor puts a question to you once a night: Rung asked "the old man of Pattaya" question Oat had asked
  // at the same bar an hour before (Gareth, round 103)
  { const book = (G.soc.askedHere = G.soc.askedHere || {}), k = G.room + ":" + key;
    if (book[k] && book[k] !== id && G.room && ROOMS[G.room] && ROOMS[G.room].barType) return;
    book[k] = id; }
  st.know["asked_" + key] = true;
  if (d.asks.q) _say(d.asks.q);
  // Keep the question itself. _renderResume redraws the answer cue after a
  // reload, but the QUESTION lived only in the scrollback — so a restored
  // player came back to "Answer in your own words — or: 1) …" with no way to
  // read what had been put to them (persistence playtest 2026-08-23).
  G.convoQ = { id, key, q: d.asks.q || "", turn: G.turns };
}

// The callback half of the ask loop: a delivered line can quote back what the
// player told the town about themselves via a %key% token (e.g. "%home%. Still
// there?"). Only keys actually in G.player.said are filled — anything else is
// left untouched — and callback nodes gate on the value being known, so a token
// never shows raw. Title-cased for display.
// Tan's lines were written at his parked car and over a glass; on his walk down the soi
// (every hour but the first) the gesture travels with him and the car stays at the mouth
const _TAN_FOOT = [
  [/\b(?:Tan )?turns (?:his|the) glass a quarter(?:, the way he does)?/g, m => (/^Tan /.test(m) ? "Tan turns" : "turns") + " his phone a quarter on his palm, the way he does"],
  [/\bHe turns the glass\./g, "He turns the phone on his palm."],
  [/ over the car roof/g, ""],
  [/He settles back against the car\./g, "He settles his shoulder against a shopfront shutter."],
  [/He lets the name sit on the roof of the car between you/g, "He lets the name sit in the air between you"],
  [/He counts it on the roof of the car\./g, "He counts it on his fingers."],
  [/Tan considers the roof of the car\./g, "Tan considers the soi."],
  [/He does not come off the car\./g, "He does not come off the wall."],
  [/He opens the car door for you, courteous as ever\./g, "He steps aside to let you pass, courteous as ever."],
];
function _tanOnFoot(s) {
  const r = _npcRoom("tan");
  if (_servesDrinks(r)) return s;   // in a bar the glass is real
  // at the car or on the walk there is no glass (Mehmet, round 106: "turns his glass a quarter" over the car roof);
  // the car lines hold only at the car
  for (const [re, to] of _TAN_FOOT) if (r !== "soi6_street" || /glass/.test(String(re))) s = s.replace(re, to);
  return s;
}
function _fillSaid(s) {
  if (typeof s !== "string" || !(G.player && G.player.said)) return s;
  // Title-case only what looks like a PLACE (a few words, no sentence
  // punctuation, no apostrophes) — a canned reply that is a sentence came
  // back as "Back Home. It'Ll Keep." (Nige, round 36). A sentence is quoted
  // as said.
  return s.replace(/%(\w+)%/g, (m, k) => {
    if (G.player.said[k] == null) return m;
    const v = String(G.player.said[k]);
    const placeLike = v.split(/\s+/).length <= 4 && !/[.!?,;:']/.test(v);
    return placeLike ? v.replace(/\b\w/g, c => c.toUpperCase()) : v;
  });
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
// One cast: _npcsHere already includes the flagged regulars, so spreading
// _regularsHere in as well would list every patron twice — and break
// _resolveActor's sole-candidate rule (a room with one patron would read as two
// people and refuse the pronoun).
function _addressable() { return _npcsHere(); }
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
    const id = _findNpc(w); // one cast — _findNpc resolves the regulars too
    return pool.includes(id) ? id : null;
  }
  const ante = _lastActor();                    // pronoun or omitted → antecedent
  if (ante && pool.includes(ante)) return ante;
  return pool.length === 1 ? pool[0] : null;    // else the only candidate, if unambiguous
}

// The topics currently OPEN with a partner: their dialogue nodes whose gates
// (req/notFlags/bond/when) pass right now, in authored order, deduped. Mirrors
// the gate checks in _pickDialogue, so the chip palette only ever
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
  return hit(NPCS);
}
// `all` is the TOPICS verb's list, and it is DELIBERATELY LONGER than the chip
// bar's (Maureen, round 47 — she ran TOPICS PIM twice, bought two lady drinks
// between, and was told both times that Pim had nothing open, in the minutes
// Pim was answering a borrowed-name subplot, a quest turn-in and the safe clue).
// Two of the three suppressions below are CHIP ETIQUETTE, not honesty: don't
// dangle a node the quest flow drives, and don't invite a player to gossip about
// a person they had no reason to name. Neither is a reason to tell somebody who
// TYPED a character's name that she has nothing to say. So the verb keeps the
// gates (which are what "answerable this turn" means) and drops the etiquette —
// person-name topics still wait on _topicKnown, so nothing spoils a name the
// transcript has never printed.
function _convoTopics(id, opts) {
  const all = !!(opts && opts.all);
  const st = _npcState(id);
  const n = NPCS[id];
  const nodes = (n && n.dialogue) || [];
  const rage = (n && n.rage) || [];
  const out = [];
  for (const d of nodes) {
    if (!d.topic) continue;
    if (d.deflect) continue;              // a gated "come back when you've earned it" refusal — don't offer it as a chip
    // `chip: false` means DON'T SUGGEST THIS ANYWHERE and the author meant it:
    // round 47 opened these into TOPICS and put Gavin's, Bert's, Oy's and
    // Sumalee's `offer` on the menu as the bare word "offer", and — the severe
    // one — Tan's `debt`, a node that SETS debtSettled and owesTan, so a player
    // reading the list top to bottom spent the one favour Tan gives without
    // knowing he had called it in (Colm, round 47). What that round got right is
    // that some of these are real SUBJECTS a woman will discuss (Pim's whispers,
    // Daeng's Shamrock) and only the chip BAR needed to stay short. So the flag
    // has a third value: `chip: "topics"` — listed by the verb, never suggested
    // by the bar. A node that DOES something stays `chip: false`.
    if (d.chip === false) continue;
    if (d.chip === "topics" && !all) continue;
    if (!d.chip && _topicNamesCharacter(d.topic, id)) {
      if (!all || !_topicKnown(String(d.topic).split("|")[0])) continue; // gossip about a person — typeable, not suggested
    }
    if (rage.some(k => d.topic.includes(k))) continue;
    if (d.req && d.req.some(f => !_flag(f))) continue;
    if (d.notFlags && d.notFlags.some(f => _flag(f))) continue;
    if (d.bond && n && _knownTier(id) < d.bond) continue;
    if (d.when && !d.when(st, G)) continue;
    { const _t = String(d.topic).split("|")[0]; if (!out.includes(_t)) out.push(_t); }   // the chip shows the first alias
  }
  // what the ENGINE answers about the night and the hours is a topic too — last night, the sunrise, the present, the
  // rain first (timely), after work and the hours last (Sam, round 90: a thumb could ask none of it)
  const sit = typeof _situationTopics === "function" ? _situationTopics(id) : null;
  if (!sit) return out;
  return [...sit.first.filter(t => !out.includes(t)), ...out, ...sit.last.filter(t => !out.includes(t))];
}

// Faction standing with the powers of the night — PLG (Laurent Vasseur's Soi 6 rollup),
// samson (the brothers' Jomtien/Pratumnak takeover), indie (Bert & the holdouts),
// syndicate (Tan's network — NOT muscle and not a jao pho: phu kwang khwang,
// dealing in favours rather than cash. The envelopes on the good table are what
// PLG pays to be tolerated, because a foreigner can't be owed a favour — see
// docs/factions-thai.md). Standing only moves
// when the player ACTS on a faction (takes a job to its end, throws real weight
// behind it) — never for declining or ignoring. Staying out of the politics
// costs nothing, forever. Dialogue reads it via `when`; nodes move it via `_align`.
function _faction(name) { return (G.faction && G.faction[name]) || 0; }
function _align(name, delta) {
  if (!G.faction) G.faction = { plg: 0, samson: 0, indie: 0, syndicate: 0 };
  G.faction[name] = Math.max(-5, Math.min(5, (G.faction[name] || 0) + delta));
}

// _patronTalk is GONE (patron fold, stage 2): the rail regulars deliver through
// _doTalkBody/_deliver like everyone else. What was distinct about it survives
// inside those: the nightly seen-book and met-once greeting (_deliver), the
// always-terse repeat in the _patronAgain voice (_deliver), the _PATRON_MISS
// pool (_topicMiss), the rage pre-empt and Mort's knows-everyone beat (both in
// _doTalkBody). Its quiz/darts/dog pre-empts were duplicates of the ones the
// NPC path already had. tests/js/patronfold.test.js pins the lot.

// A belligerent regular's sore subject. Whether it turns into a swing depends on
// his nightly state — the nights he's on the weed, the drunk turns nasty (a
// stable per-night hash, so it's the same all evening).
function _patronRage(id) {
  const name = NPCS[id].name;
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
  (n, his) => `${n} shrugs. “Not one I know anything about.”`,   // "mate" from a Stuttgart toolmaker (Aurelio, round 71)
  (n, his) => `“Search me,” ${n} says, and goes back to ${his} glass. “Ask me something I've actually got an opinion on.”`,
  (n, his) => `${n} turns a hand over: nothing in it. “Couldn't tell you. Not my story.”`,
];
const _PATRON_AGAIN = [
  (n, his) => `${n} gives you a flat look over ${his} glass. “Already told you that one.”`,
  (n, his) => `“You've had that one,” ${n} says. “It doesn't improve with telling.”`,
  (n, his) => `${n} waves a hand. “Same story, same ending. Ask me something I haven't done to death.”`,
];
// THE RAIL'S NIGHTLY BOOK, with its day-reset in exactly one place. A regular's
// stories are new every night, so this resets on the day — and everything that
// reads it must come through here, dialogue `when` gates included: those are
// evaluated during node selection, BEFORE the first delivery of the evening, so
// a gate reading G.patronTalk.talked directly saw YESTERDAY's entries and fired
// a "you've talked to him tonight" node on a night you hadn't (caught folding
// the talk paths together, 2026-08-28).
// Have you got this character talking at all — as opposed to just saying hello?
// (The form dialogue gates want; Mort's Glam lead is offered mid-conversation,
// never on the doorstep.) One permanent book since retells were retired.
function _patronSeen(id) { return ((G.talked && G.talked[id]) || []).length > 0; }
// Subject / object / possessive for anybody, for class M
// (docs/persona-findings-systemic.md §3.5): a template written for one person
// and handed another. The mixed casts are the ones to watch — the managers are
// all men, the floor is all women, and the bench is mostly men and three women:
// Angela, Sandra and Josey are exactly who a hard-coded "he" gets wrong.
// Reads world.js's `_pronoun(id)`, which is the ONE resolver (most role-carriers
// carry no `pronoun` field at all and fall through its lady-role default — a
// second copy of that rule here would read half the cast as men).
// Money that ARRIVES in the account (a reward by the app, a transfer in a text, the sale):
// counted, so the morning ledger names it rather than inferring it from the balance — an
// inference that a rent charged to the card zeroed (the money audit, defect A, 2026-10-08)
// She is on your arm tonight (a companion): not behind any rail, not serving anyone. The affair's
// at-the-bar lines and the usual's "she has it on the mat" were firing in other bars and on the
// beach with the owner's girl beside him (Callum, round 71).
// NOTTY'S OPENS ON A NAME: sent by somebody who has run bars here a long time (Candy, Rose, Doyle's
// recon) — or the man who runs one himself (Mario, 2026-10-08: owning a bar is the name; Ossie,
// round 70, the Stinky's owner, was told he had "no standing to ring"). A sold bar still counts.
function _nottysOpen() {
  return _flag("orchidSent") || _flag("orchidVouched") || _flag("orchidReported") ||
    (_barOwned()) || _flag("barSold");
}
function _outWithMe(id) { return !!(G.party && G.party.ids && G.party.ids.includes(id)); }
function _bankIn(n) { n = Math.max(0, Math.round(n || 0)); G.bank = (G.bank || 0) + n; G.bankIn = (G.bankIn || 0) + n; }
// _hh FINALISED: _hh is near-linear in its last characters (day 9 and day 10 land one apart), so any roll keyed on a
// day wants this — consecutive days were one result for a whole week (Ingrid, round 103: two crooked doors, 17 nights,
// nothing back). New rolls use it; old ones keep _hh, because changing them would move every seeded result.
function _hm(s, salt) {
  let h = _hh(s, salt);
  h = (h ^ (h >>> 16)) >>> 0; h = Math.imul(h, 0x45d9f3b) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x45d9f3b) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
function _pr(id) {
  const p = typeof _pronoun === "function" ? _pronoun(id) : (NPCS[id] || {}).pronoun;
  return p === "she" ? { s: "she", o: "her", p: "her" }
    : p === "they" ? { s: "they", o: "them", p: "their" }
    : { s: "he", o: "him", p: "his" };
}
function _patronHis(id) { return _pr(id).p; }
function _patronAgain(id) {
  return _PATRON_AGAIN[Math.floor(_rand() * _PATRON_AGAIN.length)](NPCS[id].name, _patronHis(id));
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
  // a bare number on a go-go floor is a badge (theme 12): BARFINE 42, EXAMINE 42
  if (/^(?:no\.?\s*|number\s*|#)?(\d{1,3})$/.test(w)) {
    const num = +w.match(/(\d{1,3})$/)[1];
    const hit = here.find(id => _badge(id) === num);
    if (hit) return hit;
  }
  // exact id or exact name first (so "oy" is Madam Oy, not Pl-OY)
  for (const id of here) {
    if (id === w || NPCS[id].name.toLowerCase() === w) return id;
  }
  // A WORD THAT IS EXACTLY SOMEBODY'S NAME IS A REQUEST FOR THAT PERSON, and
  // must never be satisfied by a coincidence inside whoever happens to be
  // standing here: "tan" is Tan, not Ra-TAN-a, Nam-TAN or TAN-gmo (the last by
  // the name-prefix pass, the others by the substring pass). Tan is the hub the
  // game itself teaches you to ask about people — ASK TAN ABOUT <person> is the
  // stuck nudge's own printed hint — so in any bar holding a girl whose name
  // contains his, the game's own advice was silently answered by her (Wes,
  // round 33, 2026-09-01). Same doctrine as the patron strictness below, one
  // rung wider: the bell→Belle collision class.
  //
  // Returning null is the RIGHT answer, not a shrug: the callers route a named
  // absentee to _elsewhereLine, which says where he actually is — far more
  // useful than a hostess answering in his place.
  if (Object.keys(NPCS).some(id =>
      id === w || String(NPCS[id].name || "").toLowerCase() === w)) return null;
  // The regulars (patron: true) keep the STRICTER matching the old _findPatron
  // had: exact, name-prefix, title — never word-prefix or substring. The bench
  // is two dozen short common names ("ron", "dave", "superman"), and letting
  // them into the fuzzy passes is the bell→Belle collision class: a stray "s"
  // in "supermarket" must not resolve to a man at the rail.
  for (const id of here) {
    const name = NPCS[id].name.toLowerCase();
    if (name.startsWith(w)) return id;
    if (!NPCS[id].patron && name.split(" ").some(p => p.startsWith(w))) return id;
  }
  for (const id of here) {
    if (!NPCS[id].patron && NPCS[id].name.toLowerCase().includes(w)) return id;
  }
  // A ROLE is an address too. TALK TO MAMASAN / CASHIER / MANAGER is what a man
  // says on a floor whose staff he has not been introduced to — the game's own
  // prose names them by role ("the mamasan drifts over") — and it answered
  // "nobody goes by that" on every rail with a filler mama (Malcolm, round 47,
  // 2026-09-14). The room's role-carrier answers; a girl NAMED Mama would have
  // resolved on the exact-name pass above.
  {
    const rw = w.replace(/^the\s+/, "").replace(/[\s-]/g, "");
    const role = ({ mamasan: "mamasan", mama: "mamasan", mamma: "mamasan", cashier: "cashier",
                    manager: "manager", barman: "manager", boss: "manager" })[rw];
    if (role) {
      const hit = here.find(id => role === "manager" ? NPCS[id].manager
                                : (typeof NPC_ROLES !== "undefined" && NPC_ROLES[id] === role));
      if (hit) return hit;
    }
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
// `title` fields + _findNpc look-resolution stay in the data (harmless,
// still let "talk to the owlish old-timer" resolve), but they never replace a name
// in the UI. To restore reveal-on-met, gate these on `!(G.known && G.known[id])`.
function _npcLabel(id) {
  const n = NPCS[id]; return n ? n.name : id;
}

// A named character the player addressed who isn't in THIS room — used to turn a
// flat "Nobody by that name here" (reads as a bug mid-conversation) into a placed
// answer. Patrons hop bars every hour, so promising a location would go stale by
// the time you got there — that was TRUE while the hop existed and is not any
// more: the regulars were de-hopped (they anchor their local), and the vague
// line survived the change, so the game was telling players a man "drifts
// between bars" while he sat on the same stool all night. A narrative persona
// gave up looking for Fergie on the strength of it (round 18). They are placed
// like anyone else now; what they keep is an ABSENCE the staff don't have — a
// teaching night, or a low-season evening in — and _npcActive already answers
// that with "isn't around right now", which is both true and useful.
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
  const _cands = Object.keys(NPCS).filter(id => String(NPCS[id].name || "").toLowerCase() === w)
    .sort((a, b) => (((G.soc.drinks || {})[b] || 0) + (G.phone.contacts[b] ? 10 : 0) + ((G.everBond || {})[b] || 0) * 3) - (((G.soc.drinks || {})[a] || 0) + (G.phone.contacts[a] ? 10 : 0) + ((G.everBond || {})[a] || 0) * 3));
  // two Fons: the one you know is the one you mean (Ingrid, round 62) — but only among namesakes
  // you may be TOLD about: picking the likelier of two strangers placed an unmet story character the
  // moment a second woman took her name (the Gilt Cage twins, 2026-10-07).
  const _placeable = id => /^[A-Z]/.test(NPCS[id].name || "") && (NPCS[id].patron || (G.known && G.known[id]) ||
    (G.phone && G.phone.contacts[id]) || ((G.soc.drinks || {})[id] > 0) || (G.talked && G.talked[id]));   // her number, a drink, a word: you know her
  const _known = _cands.length > 1 ? _cands.filter(_placeable) : [];
  const nid = (_known.length ? _known[0] : null) || Object.keys(NPCS).find(id => {
    const nm = NPCS[id].name;
    // A regular is placed whether or not you've been introduced: his name is
    // painted on the room he drinks in, and the staff will tell you. The
    // met-gate is for the STORY cast, where naming an unmet character's bar
    // spoils a place you were never shown.
    if (!/^[A-Z]/.test(nm) || !(NPCS[id].patron || (G.known && G.known[id]))) return false;
    return id === w || nm.toLowerCase() === w || nm.toLowerCase().split(" ").pop() === w;
  });
  if (nid) {
    // A MAN WHO GOES HOME IS PLACED, NOT HIDDEN. "Isn't around right now" is for
    // somebody the world is concealing; Neil's whole character is one bottle and
    // home past the railway by nine, and telling a player nothing sends him back
    // at midnight to fail again. Say the hour. (Above the hiding line, which
    // keeps every genuinely-concealed case — David on a school night, an origin
    // archetype you ARE.)
    if (NPCS[nid].until != null && G.nightTurn >= NPCS[nid].until)
      // Generic on purpose — this line used to be Neil's own phrasing ("one
      // bottle most nights and out before nine"), which fit him but would
      // misfire on any OTHER `until`-gated NPC once one existed (Somsak,
      // round 32: "one hour before I go home", not Neil's habit at all).
      // …and never name the bar the player is STANDING IN as the place to
      // find him — "The Sundowner, early doors, is where you'll find him",
      // delivered at the Sundowner, reads as a riddle (Gerry, round 34).
      return `${NPCS[nid].name} ${notHere} — ${_pr(nid).s}'ll have gone home for the night. ` +
        (NPCS[nid].room === G.room
          ? `Back here early doors is when you'll catch ${_pr(nid).o}.`
          : `${_barName(NPCS[nid].room)}${_dupeBar(NPCS[nid].room) ? " out in " + (ROOMS[NPCS[nid].room].region || "") : ""}, early doors, is where you'll find ${_pr(nid).o}.`);
    // gone for good comes before gone for the season (theme 11 before theme 8)
    const _gone = _exited(nid);
    if (_gone === "kept") return `${NPCS[nid].name} ${notHere} — she isn't on any floor now. Her sponsor stopped paying the bar and she stopped coming, the girls say; a condo on the far side of Sukhumvit, and the message the boss put in the group got no answer from anybody.`;
    if (_gone) return `${NPCS[nid].name} ${notHere} — she isn't anywhere on the soi. She went home to ${_gone}, the way she always said she would, and the girls say it quietly, like good news they are not sure they are allowed.`;
    // an absence with a reason the floor can give (theme 8): the harvest, or Bangkok
    const _away = _awayForSeason(nid);
    if (_away === "harvest") return `${NPCS[nid].name} ${notHere} — home for the rice harvest. Ten days, the girls say, and nobody argues with the rice.`;
    if (_away === "bangkok") return `${NPCS[nid].name} ${notHere} — gone to Bangkok till the rain stops, the way the smart ones do in the trough. Back when the money is.`;
    if (nid === "priew" && G.priewSeen && G.priewSeen.day === G.day && G.priewSeen.room === G.room)
      return "Priew is working the far table, on the clock — the tray, the laugh, the Russians. After the round, maybe; not before.";   // "isn't around" a line after the scene sat her down (Jens, round 67)
    if (!_npcActive(nid)) return `${NPCS[nid].name} isn't around right now.`; // not in at this hour / not here at all
    const cur = _npcRoom(nid);
    // Point the player to her only when she's at one of HER OWN bars (a
    // multi-bar owner alternating nights). If she's somewhere else — an invited
    // visit elsewhere, once that exists — don't reveal it; just say she's out.
    // Tan walks the soi by the hour: say the stretch he is on and that he moves
    if (nid === "tan" && _TAN_ROUNDS.includes(cur))
      return `Tan ${notHere} — he walks the soi until midnight, a stretch an hour. About now he is along ${ROOMS[cur].name}; he will have moved on by the next hour, and he looks in on the bars as he passes.`;
    const own = NPCS[nid].bars ? NPCS[nid].bars.includes(cur) : true;
    if (own && _barName(cur)) {
      // her bar has shut for the night: don't send the player to a padlock
      // a door you were walked out of is shut to you too — TRAVEL walked 11 turns to the doorman's arm (Fintan, round 60)
      if (G.soc && G.soc.banned && G.soc.banned[cur] !== undefined && G.turns - G.soc.banned[cur] < BAN_TURNS)
        return `${NPCS[nid].name} is at ${_barName(cur)}, but that door isn't open to you tonight.`;
      if (_closedNow(cur)) {
        return `${NPCS[nid].name} ${notHere} — ${_barName(cur)} has shut for the night. Tomorrow.`;
      }
      // Name the REGION too when it's somewhere you haven't been: "try Candy Bar 2"
      // is useless if Candy Bar 2 is in Myth Night, a region you've never walked,
      // because it isn't in the TRAVEL list and GO won't find it. That cost an
      // insider playtest a full in-game night on the one quest the endgame hangs
      // on (2026-08-23).
      const reg = (ROOMS[cur] || {}).region;
      const unseen = reg && !Object.keys(G.visited || {}).some(r => (ROOMS[r] || {}).region === reg);
      // A DRIFTING man is not "at X tonight" — that is an hour-true fact dressed
      // as a night-true one, which is precisely the lie the old "the regulars
      // drift between bars" line told in reverse. Say where he is, say that he
      // moves, and name the local he'll be at from ten, which is the useful part.
      if (_willMove(nid)) {
        // PRESENT tense, not past: `cur` is where he IS, right now — "he was at
        // X a little while ago" described a live fact in the past tense, which
        // reads as "you've just missed him" the moment before it's checked (Reg
        // the publican watched Doyle leave the Vic, then got told he "was" at
        // The Shady Lady while sitting in it — round 32, 2026-08-30). The hedge
        // belongs on the FUTURE (he may move before you arrive), not the present.
        const pr = _pr(nid);
        return `${NPCS[nid].name} ${notHere} — ${pr.s}'s at ${_barName(cur)} right now, ` +
          `but ${pr.s} drifts about ${pr.p} end of town before ten, so ${pr.s} may not still be ` +
          `there by the time you are. Ask after ${pr.o} when you get there, or catch ` +
          `${pr.o} at ${_barName(NPCS[nid].room)} later on; ${pr.s} always ends up there.`;
      }
      return `${NPCS[nid].name} ${notHere} tonight — try ${_barName(cur)}` +
        (unseen && reg !== (_room() && _room().region) ? `, over in ${reg}.` : ".");   // not "over in Soi 6" said on Soi 6 (Rolf, round 66)
    }
    return `${NPCS[nid].name} isn't here right now.`;
  }
  return null;
}

// First dialogue entry whose req/notFlags fit; topic filters "ask about".
// An unknown/locked topic falls back to the NPC's default (topicless) line —
// classic adventure behaviour: they answer with whatever they always say.
// A topic key matches the asked topic whole-word, never as a substring:
// "boyfriend".includes("oy") was true, so "ask lek about boyfriend" answered with
// Madam Oy — and every short key (oy, dj, ice, bank) could be found inside an
// unrelated word (annoying, adjust, notice, embankment). Howard, round 35.
// Multi-word keys ("sabai sabai", "walking street") still match inside a
// longer ask, and a key may carry a short inflection — "clams" reaches
// "clam", "selling" reaches "sell", "sons" reaches "son" (the first cut of
// this rule was whole-word both ends and broke all three). What it must never
// do is start mid-word: the boundary BEFORE the key is the whole fix.
function _topicHits(key, asked) {
  if (!key || !asked) return false;
  if (String(key).includes("|")) return String(key).split("|").some(k => _topicHits(k, asked));   // aliases: "1998|pattaya|beach road" (Hamish/Trevor, rounds 38–39)
  // the parser strips articles, so an alias written "the name" could never be asked:
  // the topics list printed "the name" for Tan, and asking him about it missed (Mick, round 57)
  key = String(key).replace(/^(the|a|an) (?=\S)/, "");
  if (key === asked) return true;
  const esc = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // a key of two letters takes no slack: "wa" + three letters is water, watch and wai,
  // Preeda's "ex" was answering EXPAT and her "no" NONT and NOTE (Silk Rose floor, 2026-10-08)
  // …and a longer key takes only an INFLECTION, never any three letters: "wat" + "er" was water, so ASK TAN ABOUT WATER
  // got his temple (Alun, round 104). Plurals, tenses and the possessive still reach it: kids, married, drinking, tan's.
  const slack = key.length <= 2 ? "" : "(?:s|es|ies|ed|d|ing|'s|ren|n|r|y)?";
  const stem = key.length > 3 && /y$/i.test(key) ? esc.slice(0, -1) + "(?:y|y's|ys|ies|ied|ying)" : esc + slack;   // marry → married, family → families
  const m = new RegExp("(^|[^a-z0-9])" + stem + "([^a-z0-9]|$)", "i").exec(String(asked));
  if (!m) return false;
  // "women who don't WORK" is not the job topic (Desmond, round 63)
  return !/\b(don'?t|doesn'?t|do not|not|never|no)\s+$/i.test(String(asked).slice(0, m.index + m[1].length));
}

// a node's gates, exactly as the pick honours them
// MARK A HELLO HEARD without delivering it — a woman you have negotiated a
// night with has met you, and must not introduce herself the next time you
// TALK (Anil, round 64: Lek's "Hello, welcome" after a night on her bike).
function _markHello(id) {
  const dl = NPCS[id] && NPCS[id].dialogue;
  if (!dl || !G.talked) return;
  const seen = G.talked[id] || [];
  if (seen.some(i => dl[i] && !dl[i].topic)) return;
  const hello = _pickDialogue(id, null), k = hello ? dl.indexOf(hello) : -1;
  if (k >= 0 && _plainHello(hello)) (G.talked[id] = seen).push(k);
}
// only an UNGATED greeting is an introduction: a state-gated hello (Tan after the
// reveal, a her-farang welcome) is news, and marking it heard would bury it
function _plainHello(d) { return !!d && !d.topic && !d.req && !d.notFlags && !d.when && !d.bond; }
function _nodeOpen(npcId, d, st) {
  if ((d.req || []).some(f => !_flag(f))) return false;
  if ((d.notFlags || []).some(f => _flag(f))) return false;
  if (d.bond && _knownTier(npcId) < d.bond) return false; // a warmer line only a regular unlocks (The Regular)
  if (d.when && !d.when(st || _npcState(npcId), G)) return false;   // state-machine condition (trust/mood/dstate/know)
  return true;
}
// an alias that IS the word asked, not merely a word inside it
function _topicExact(key, asked) {
  const a = String(asked || "").toLowerCase().trim();
  return !!key && String(key).split("|").some(k => k.trim().replace(/^(the|a|an) (?=\S)/, "").toLowerCase() === a);
}
function _pickDialogue(npcId, topic) {
  const n = NPCS[npcId];
  const st = _npcState(npcId); // conversation state machine — see _npcState
  // THE PRINTED LABEL LANDS ON ITS OWN NODE: TOPICS prints Waen's "teacher" and the ask
  // landed on her lesson pitch, whose alias "teach" caught "teacher" one node earlier;
  // "two jobs" landed on the career node through "job" (the dialogue walk, 2026-10-02).
  // An exact alias wins before the fuzzy match is consulted.
  if (topic) for (const d of n.dialogue) if (d.topic && _topicExact(d.topic, topic) && _nodeOpen(npcId, d, st)) return d;
  for (const d of n.dialogue) {
    if (topic ? !(d.topic && _topicHits(d.topic, topic)) : d.topic) continue;
    if (!_nodeOpen(npcId, d, st)) continue;
    return d;
  }
  return topic ? _pickDialogue(npcId, null) : null;
}

// A MAN CAN TALK ABOUT WHAT HE HIMSELF SAID. The commonest complaint across two
// persona rounds was a character volunteering a name and then disowning it one
// command later: Nira resolves the whole Pim/Bank arc with "then you say the
// name Pim" and doesn't recognise "Pim" the very next line; Roger's own
// description has him married to Lek and asking you the football score, and
// misses on both; Doug pitches "the portfolio" and hasn't heard of it. Eight
// instances found by two testers independently, and they are the tip: every
// proper noun in every node is a word the player may reasonably type next.
//
// So a miss gets one more chance before the brush-off: if any node this
// character can currently reach NAMES the thing — as a proper noun, capitalised
// in his own text — that node is the answer. Capitalisation is the whole trick.
// It is what distinguishes "Lek", "Surin", "PattayaChain" and "Discman" from
// "money" or "bar", so a passing mention of a common word can't hijack a topic,
// and it needs no synonym table to maintain: the writing IS the index.
//
// Gates are honoured exactly as _pickDialogue honours them — a locked node stays
// locked, or this would leak content ahead of its trigger.
function _selfNamedNode(npcId, topic) {
  const n = NPCS[npcId];
  if (!n || !topic) return null;
  const st = _npcState(npcId);
  // Common words are not topics: ASK CANDY ABOUT LAST NIGHT answered with her
  // Bee node because "night" appears in it (Malcolm, round 36). The same
  // stop-list the grapevine uses, plus the soi's furniture nouns.
  const _STOP = typeof _SAID_STOP !== "undefined" ? _SAID_STOP : new Set();
  // …and the town's own furniture: "Beach" in "Beach Road" is not a topic, or
  // asking Tan about the beach landed on his once-a-vacation favour node because it
  // names Bank's stand (Lionel, round 36 — a favour fired by a question about sand)
  const _FURNITURE = new Set(["night", "last", "tonight", "girl", "girls", "drink", "drinks", "money",
    "time", "here", "there", "come", "back", "good", "little", "thing", "things", "about", "some", "more", "long", "short",   // "long time" was May's "Long day?" hello (Liam, round 93)
    "beach", "road", "street", "town", "city", "hotel", "market", "pattaya", "jomtien", "naklua", "bangkok",
    "thai", "thailand", "farang", "english", "isan",
    "club", "clubs", "room", "house", "shop", "place", "soi"]);   // "gentlemen's club" is not Bert's Pattaya Flying Club (Ossie, round 70)   // asking Tan about speaking thai got the PLG speech through "A Thai man" (Nattapong, round 56)
  let words = String(topic).toLowerCase().split(/[^a-z0-9']+/)
    .filter(w => w.length >= 4 && !_STOP.has(w) && !_FURNITURE.has(w));
  // A MAN'S OWN NAME IN HIS OWN NODE IS A STAGE DIRECTION, NOT A TOPIC. Prose
  // narrates the speaker constantly — "Terry considers the ceiling", "Mort caps
  // the biro" — so without this, asking Terry about himself matched his own narration
  // and answered with whatever node happened to name him first. Once the pub's
  // rail gained cross-topics that was his opinion of DOYLE, delivered fluently
  // and confidently: a persona believed it for two nights and came away thinking
  // Terry was the ex-copper (round 23). Asking a man about himself must fall
  // through to a real self-topic if he has one, or to a miss — never to a
  // sentence that merely mentions him.
  const own = String(n.name || "").toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
  words = words.filter(w => own.indexOf(w) < 0);
  if (!words.length) return null;
  for (const d of n.dialogue) {
    if (d.topic && _topicHits(d.topic, topic)) continue; // the topic path already had its go
    if ((d.req || []).some(f => !_flag(f))) continue;
    if ((d.notFlags || []).some(f => _flag(f))) continue;
    if (d.bond && _knownTier(npcId) < d.bond) continue;
    if (d.when && !d.when(st, G)) continue;
    const body = String(d.text || "");
    // a two-word name is one name: "klang corner" is not "Kitten Corner" because both say Corner
    // (Stelian, round 76 — Bert's PLG speech for a massage shop he had just recommended)
    if (words.length >= 2 && !words.every(w => new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(body))) continue;
    for (const w of words) {
      // Case-SENSITIVE, whole word: "Lek" in his own sentence is a person, "lek"
      // would also match the middle of nothing useful. Deliberately no lookbehind
      // to exclude sentence-start capitals — the regex has to parse on every
      // browser this ships to, and a node opening with the very word you asked
      // about is the right answer anyway.
      const cap = w[0].toUpperCase() + w.slice(1);
      if (new RegExp("\\b" + cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(body)) return d;
    }
  }
  return null;
}

// Generic "you asked that already" brush-offs, voiced as the soi's fond
// exasperation — the terse repeat for a pure-flavour line the writer never gave
// a `short`. Gender-neutral (no she/he), so any NPC can deliver one.
const _ASK_AGAIN = [
  n => `“Tai laew, I tell you this already,” ${n} says, half a laugh. “Same answer, na. Farang memory.”`,
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
  // the rail regulars (one cast since the patron fold): 23 western expats who
  // must not get the Tinglish miss pool — but Somsak is Thai, so key on the
  // profile card he already carries, not on the flag alone
  if (n.nat && n.nat !== "Thai") return false;   // any westerner with a profile card, rail or bench (Henning, round 104)
  return true;
}
// THE FLUENT THAI REGISTER (the dialogue walk's readers, 2026-10-02): Tan went to film
// school in Ohio, Nont speaks unaccented English, Jun reads at university, and all of them
// were brushing a repeat off in Tinglish — "or you talk to the wall". Their own voices are
// fluent, so their repeat is too. Named, like _FARANG_NPCS, because no field marks fluency.
const _FLUENT_THAI = new Set(["oy", "tan", "nont", "jun", "wilawan", "rose", "ampai", "gift", "nangfah", "mala",
  "duangjai", "pae", "mercedes", "chompoo", "somchith", "nit", "tul", "waen", "kesinee", "wimon", "preeda", "thip"]);
const _ASK_AGAIN_FLUENT = [
  n => `“You asked me that one already,” ${n} says, with a small smile. “Same answer. Ask me something new.”`,
  n => `“We have done that one.” ${n} lets it rest there. “I don't mind saying it twice. It won't be better the second time.”`,
  n => `${n} gives you a patient look. “I told you. Try me on something I haven't answered.”`,
];
// a Thai mamasan or cashier repeating herself (Mario, 2026-10-18): no "mate", no idiom, no "tilac" — and no Google,
// she just says it is the same answer and moves you on
const _ASK_AGAIN_THAI = [
  n => `“You ask me already,” ${n} says. “Same answer. Ask me something new, na.”`,
  n => `${n} gives you a look. “This one, finish already. Ask me something I don't answer yet.”`,
  n => `“I tell you already,” ${n} says, not unkindly. “Buy one more round — then I make it new for you.”`,
];
function _askAgain(npcId) {
  // a mamasan or a cashier repeats herself in her own English, not "Farang memory, na"
  // (Gwen, round 66: Madam Oy, undefeated since 2009, in a floor girl's brush-off)
  // …and the Vic's women, house without a role: "Same-same… talk to the wall" from a pub whose own lines are dry and exact (Ploy, 2026-10-13)
  const _house = typeof NPC_ROLES !== "undefined" && (NPC_ROLES[npcId] === "mamasan" || NPC_ROLES[npcId] === "cashier" || (NPCS[npcId] && NPCS[npcId].house));
  let pool = _FLUENT_THAI.has(npcId) ? _ASK_AGAIN_FLUENT : (_thaiVoice(npcId) && !_house) ? _ASK_AGAIN
    : (_house && _thaiHouse(npcId)) ? _ASK_AGAIN_THAI : _ASK_AGAIN_EN;
  // a massage shop sells no drinks: "Buy a drink — maybe it come back" from Pensri (Terence, round 57)
  if (_room() && (_room().massage || _room().soapy)) pool = pool.filter(f => !/drink/.test(String(f)));
  return _pickVary(pool, "askagain:" + G.room)(NPCS[npcId].name);   // two regulars said "Told you already, tilac" in the same minute (Henrik, round 69): a room does not repeat itself
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
  n => `${n} turns a hand over: nothing in it. “No idea. Try somebody who was there.”`,   // Bert is American: no "mate" (Desmond, round 63)
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
  n => `“Your dog?” ${n} reaches down and Sai Krok permits one ear to be scratched, no more. “He come in, he sit by door, he watch the street for us. Better than security, cheaper.”`,
  n => `${n} wrinkles her nose at Sai Krok. “He smell like the soi, na. Same same everybody here at four o'clock.” She feeds him a corner of her toast anyway.`,
  n => `“Sai Krok!” ${n} says it like a greeting to a regular. “He know which bar give food. He come here first, then he come you. Don't be jealous.”`,
  n => `${n} looks at Sai Krok for a long moment. “My papa have dog like this, in the village. Same ear. He wait at the gate every day for the school bus.” She doesn't finish the story and doesn't need to.`,
];
const _DOG_TALK_TH_HE = [
  n => `${n} looks down at Sai Krok, then at you. “Soi dog. The best kind — already he know everything. He choose you, not the other way.”`,
  n => `${n} says something short to Sai Krok in Thai, the way one old acquaintance greets another. “I tell him look after you,” he says. “He say he already does.”`,
];
const _DOG_TALK_EN = [
  n => `“Good-looking dog, that,” ${n} says, with a nod at Sai Krok. “Soi dogs make the best ones. They've already survived the worst of it before you turn up — anything after that is a bonus to them.”`,
  n => `${n} glances down at Sai Krok. “He picked you, didn't he. They do that. You don't get a say, and you wouldn't want one.”`,
  n => `“Sai Krok's been doing the rounds,” ${n} says. “Comes in, checks the floor, checks the door, leaves. Better manners than half the customers.”`,
  n => `${n} looks down at Sai Krok. “Feed him rice, not the chicken bones the girls slip him. And don't let him near the Sukhumvit side after dark.”`,
];
function _dogTalk(npcId) {
  if (npcId === "daeng" && _flag("shamrockVisited")) {
    return _dogN("Daeng wipes her hands and looks down at Sai Krok with the softness she " +
      "showed at the Shamrock's door. “Paddy dog. Four year he walk that strip, every night, " +
      "waiting for the shutter go up. Now he walk with you.” She nods, once, as if a ledger " +
      "had balanced. “Good. He need somebody to walk with.”");
  }
  // the Thai pool crouches and says "she" — Tan got it (Fintan, round 60)
  const pool = _thaiVoice(npcId) ? (_pr(npcId).s === "he" ? _DOG_TALK_TH_HE : _DOG_TALK_TH) : _DOG_TALK_EN;
  // dealt from the town's book: Pukky and Nee gave the one chicken-bone line (Aisling, round 87)
  const f = typeof _pickTownLine === "function" ? _pickTownLine(pool, "dogtalk:" + (pool === _DOG_TALK_EN ? "en" : "th")) : pool[Math.floor(_rand() * pool.length)];
  return _dogN(f(NPCS[npcId].name));
}
// "ask <anyone> about quiz / darts": TIME knew, nobody else did (gambler playtest
// 2026-08-22). One honest line, register-neutral, computed from the schedule.
function _quizTalk(npc) {
  const bars = (typeof _quizBars === "function") ? _quizBars().map(b => _barName(b)).filter(Boolean) : [];
  // an English pensioner does not say "na" (Brenda, round 47: eleven mouths, one hostess's sentence)
  // …and a Thai mamasan, cashier or pub woman is not a farang either: the Thai house voice, never "tilac" (Mario, 2026-10-18)
  const th = !!npc && _thaiHouse(npc);
  const farang = !th && npc && NPCS[npc] && (NPCS[npc].patron || NPCS[npc].manager || NPCS[npc].house || _pronoun(npc) === "he");
  // THE QUIZ YOU JUST PLAYED, and the one that is over: a perfect round at the Starlight, and
  // the woman who chalked his name said "tonight, eight till ten, go" — as did ten others, some
  // at a quarter to three (Fintan, round 60)
  const q = G.quizLast && G.quizLast.day === G.day ? G.quizLast : null;
  // …and the night after: the board was wiped, the people who watched it go up were not (Dagny, round 91: four mouths, one schedule)
  const qy = G.quizLast && G.quizLast.day === G.day - 1 ? G.quizLast : null;
  if (!q && qy && npc && (_npcRoom(npc) === qy.room || (NPCS[npc] && NPCS[npc].room === qy.room) || (qy.present || []).includes(npc))) {
    return qy.right === 5
      ? (farang ? _pickTownLine(["“Last night — all five. They've wiped the board, but people remember a clean sweep. The teachers from Rayong were not amused.”",   // one line, two men on one rail (Hal, round 96)
          "“You're the clean sweep. Board's wiped, but the Rayong table hasn't forgiven you yet.”", "“Five out of five last night — I was here. They'll be checking your phone next Thursday.”"], "quiz5y:f") : _pickTownLine(["“Last night you get five from five! The teacher table very angry, hahaha. I tell everybody.”", "“All five last night! Everybody talk about it. Teacher table go home early, very angry.”", "“The board is clean now, but I remember — five from five. You clever, or you cheat?” A grin."], "quiz5y:t"))
      : qy.right >= 3
        ? (farang ? `“${qy.right} out of five last night. Decent. The Rayong lot still won.”` : `“Last night ${qy.right} from five, na. Not bad. Next Thursday you beat the teachers.”`)
        : (farang ? `“Last night? ${qy.right} out of five. We don't talk about it.”` : `“Last night… ${qy.right}.” A kind face. “Next Thursday, na.”`);
  }
  if (q && _npcRoom(npc) === q.room) {
    return q.right === 5
      ? (farang ? _pickTownLine(["“You were the one with all five. It's on the board — the whole bar watched it go up.”", "“All five. I watched it go up on the board. The teachers' table went very quiet.”", "“Clean sweep, that was you. Don't let the Rayong lot buy you a drink — it'll be a test.”"], "quiz5:f")
        : _pickTownLine(["“You! Five from five — your name is on the board, na. Everybody see.”", "“Five, five, five, five, five!” A finger for each. “Your name on the board. Teacher table very angry, hahaha.”", "“Clever man! All five. I see the board — everybody see.”"], "quiz5:t"))
      : q.right >= 3
        ? (farang ? `“${q.right} out of five. Respectable. The teachers from Rayong got more — they always do.”` : `“${q.right} from five! Not bad, ${th ? "na" : "tilac"}. The teacher table always win.”`)
        : (farang ? `“${q.right} out of five.” A kind look. “It's a hard board. Next Thursday.”` : `“${q.right}...” A kind face. “Is okay. Next Thursday you study, na.”`);
  }
  if (_quizDay() && G.nightTurn >= 40) {
    return farang ? `“Done for tonight — it runs eight till ten.${q && q.right === 5 ? " Heard somebody cleaned a board, mind." : ""} Next one's next Thursday.”`
      : `“Finish already, na — eight till ten only.${q && q.right === 5 ? " I hear somebody get five!" : ""} Next Thursday.”`;
  }
  if (farang) {
    if (_quizDay())
      return `“Quiz? Tonight — eight till ten. ${bars.join(", ")}. Five questions, prize on the board, teachers from Rayong marking it. No appeal.”`;
    return G.mode === "soi6"
      ? "“Thursdays, eight o'clock, here at the Vic. Prize money, teachers from Rayong, no appeal. It's on the TIME.”"
      : "“Thursdays, eight o'clock, prize money. Which bars — you ask on the day, or check the TIME.”";
  }
  if (_quizDay()) {
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
// THE TOWN BOOK (Wendell, round 63 — twenty bars, the same five questions, and two
// mamasans with one son of twenty-four who thinks the money comes from a hotel, three
// women with one husband who left the baby and the motorbike loan). The generated floor
// draws its stories from shared pools, deduplicated per BAR at build time; across a town
// of 213 women that cannot hold. So the story is dealt when it is TOLD: a woman tells you
// the next story in the pool nobody in town has told you yet, and that is her story to
// you from then on (G.storyOf). The _bondPick / _ledgerPick doctrine: a pool shared
// across a cast and remembered per person reads as one woman with several faces.
// Player-local (rule 8), like the bond books. The baked node text is the default and
// what the corpus reviews; delivery is where the book is consulted.
function _townPick(npc, axis, len, base, ok) {
  const book = (G.townTold = G.townTold || {}), mine = ((G.storyOf = G.storyOf || {})[npc] = G.storyOf[npc] || {});
  if (mine[axis] != null && mine[axis] < len) return mine[axis];
  const told = (book[axis] = book[axis] || {});
  let found = null;
  for (let k = 0; k < len; k++) { const c = (base + k) % len; if ((told[c] == null || told[c] === npc) && (!ok || ok(c))) { found = c; break; } }
  if (found == null) {
    // the town has told you all of them: then one nobody at HER bar has told, walking from
    // her own (Gwen, round 66 — Orn and Gigi, consecutive stools, one paragraph)
    const myRoom = NPCS[npc] && (NPCS[npc].room || (NPCS[npc].bars || [])[0]);
    const roomOf = id => NPCS[id] && (NPCS[id].room || (NPCS[id].bars || [])[0]);
    for (let k = 0; k < len; k++) { const c = (base + k) % len; if ((!ok || ok(c)) && roomOf(told[c]) !== myRoom) { found = c; break; } }
    if (found == null) found = base % len;
  }
  told[found] = npc; mine[axis] = found;
  return found;
}
function _townStory(npc, d) {
  const n = NPCS[npc];
  if (!d || !d.story || !n || !n.storyBits) return null;
  const b = n.storyBits, room = n.room;
  // a go-go has no bar to lean on: never deal a woman there a line that puts her on a stool (2026-10-07)
  const _gg = _isGogo(room);
  const fit = (pool, ok) => i => (!_gg || !_FIT_GOGO.test(String(pool[i]))) && (!ok || ok(i));
  const taken = axis => (typeof _storyTaken === "function" ? _storyTaken(room)[axis] : new Set());
  switch (d.story) {
    case "greet": {
      // "only my mama dangerous" from a woman who works a bar with no mamasan (Jaja, round 63)
      const noMama = !Object.keys(NPCS).some(id => NPC_ROLES[id] === "mamasan" && (NPCS[id].room === room || (NPCS[id].bars || []).includes(room)));
      const gi = _townPick(npc, "hgreet", _H_GREET.length, b.greet, fit(_H_GREET, c => !(noMama && /\bmama\b/i.test(_H_GREET[c]))));
      // her short follows HER greeting: Bua's second night borrowed Oat's "heart big big" (Gerry, round 64)
      return { text: _H_GREET[gi], short: typeof _H_GREET_SHORT_OF !== "undefined" ? _H_GREET_SHORT_OF[gi] : undefined };
    }
    case "family": {
      const _pl = (G.storyOf && G.storyOf[npc] && G.storyOf[npc].hplan != null) ? G.storyOf[npc].hplan : null;
      const c = _townPick(npc, "hfamily", _H_FAMILY.length, b.family, fit(_H_FAMILY, i => (i === b.family || !taken("family").has(i)) && !(_pl != null && _storyClash(i, _pl))));
      const w = _townPick(npc, "hfamwrap", _H_FAMILY_WRAP.length, b.famWrap, fit(_H_FAMILY_WRAP, null));
      return { text: _H_FAMILY_WRAP[w](_H_FAMILY[c].replace(/\{from\}/g, b.from)) };
    }
    case "plan": {
      const _fa = (G.storyOf && G.storyOf[npc] && G.storyOf[npc].hfamily != null) ? G.storyOf[npc].hfamily : b.family;
      const c = _townPick(npc, "hplan", _H_PLAN.length, b.plan, fit(_H_PLAN, i => (i === b.plan || !taken("plan").has(i)) && !(_storyClash(_fa, i))));
      const w = _townPick(npc, "hplanwrap", _H_PLAN_WRAP.length, b.planWrap, fit(_H_PLAN_WRAP, null));
      return { text: _H_PLAN_WRAP[w](_H_PLAN[c]) };
    }
    case "home": return { text: _H_HOME_WRAP[_townPick(npc, "hhomewrap", _H_HOME_WRAP.length, b.homeWrap, fit(_H_HOME_WRAP, null))](b.from) };   // one book for the WRAPPER across every province: keyed by province, eight women from eight provinces said "Long bus, ten hour" (Lorraine, round 95)   // keyed by province: two Buriram women, one sentence (Nattapong, round 56)
    case "free": return { text: _H_FREE[_townPick(npc, "hfree", _H_FREE.length, b.free || 0, fit(_H_FREE, null))] };
    case "mgreet": { const i = _townPick(npc, "mgreet", _M_GREET.length, b.greet, fit(_M_GREET, null)); return { text: _M_GREET[i], short: _M_GREET_SHORT[i] }; }
    case "mfamily": { const bad = (typeof _M_FAM_CLASH !== "undefined" && _M_FAM_CLASH[b.story]) || []; return { text: _M_FAMILY[_townPick(npc, "mfamily", _M_FAMILY.length, b.family, fit(_M_FAMILY, i => !bad.includes(i)))] }; }
    case "mplan": return { text: _M_PLAN[_townPick(npc, "mplan", _M_PLAN.length, b.plan, fit(_M_PLAN, null))] };
    case "cfamily": return { text: _C_FAMILY[_townPick(npc, "cfamily", _C_FAMILY.length, b.family, fit(_C_FAMILY, null))].replace(/\{from\}/g, b.from) };
    case "mgirls": return { text: _M_GIRLS[_townPick(npc, "mgirls", _M_GIRLS.length, b.girls || 0, fit(_M_GIRLS, null))] };
    case "mhome": return { text: _M_HOME[_townPick(npc, "mhome", _M_HOME.length, b.home || 0, fit(_M_HOME, null))](b.from) };
    case "chome": return { text: _C_HOME[_townPick(npc, "chome", _C_HOME.length, b.home || 0, fit(_C_HOME, null))](b.from) };
    case "cgreet": { const i = _townPick(npc, "cgreet", _C_GREET.length, b.greet || 0, fit(_C_GREET, null)); return { text: _C_GREET[i], short: _C_GREET_SHORT[i] }; }
    case "cmoney": return { text: _C_MONEY[_townPick(npc, "cmoney", _C_MONEY.length, b.money || 0, fit(_C_MONEY, null))] };
    case "cplan": return { text: _C_PLAN[_townPick(npc, "cplan", _C_PLAN.length, b.plan || 0, fit(_C_PLAN, null))] };
  }
  return null;
}
// a mamasan or cashier answers a miss in the English she uses for everything else, not the
// floor's "na" (Wendell, round 63: Jom, Orm, Jeab and Da fluent in every answer but the miss)
const _TOPIC_MISS_HOUSE = [
  n => `${n} considers it and sets it aside. “Not a thing I know. Ask me about this bar.”`,
  n => `“That one, I cannot help you with.” ${n} is perfectly pleasant about it. “Ask me something on my side of the counter.”`,
  n => `${n} gives a small, practised shrug. “Wrong woman for that one. The girls, the drinks, the price — those I know.”`,
  n => `“No.” ${n} says it the way she says a price: flat, final, not unfriendly. “Not mine to know.”`,
];
// the same miss in the Thai house voice (Mario, 2026-10-18): confident, short, and back to her side of the counter
const _TOPIC_MISS_THAI = [
  n => `${n} thinks about it, then puts it away. “This one I don't know. Ask me about this bar.”`,
  n => `“That one, I cannot help.” ${n} is perfectly pleasant about it. “Ask me something my side of the counter, na.”`,
  n => `${n} gives a small, practised shrug. “That one, wrong woman. The girls, the drink, the price — this, I know.”`,
  n => `“No.” ${n} says it the way she says a price: flat, final, not unfriendly. “Not my business to know.”`,
  n => `${n} shakes her head once. “Not this one. Ask me the bar, the girls, the price — those I know.”`,
  n => `“Hm.” ${n} goes back to what she was doing. “Somebody else know that. Not me.”`,
  n => `“That I don't know.” ${n} is not sorry about it. “Many thing I don't know. The till, I know.”`,
  n => `${n} lets it pass, the way she lets a joke pass. “Another question, na. One I can answer.”`,
];
function _topicMiss(npcId) {
  const n = NPCS[npcId];
  // The rail keeps its own voice. A regular's "not my story" is a man turning a
  // hand over on the bar — near the staff's English miss pool in register, but
  // authored separately and worth keeping distinct now that one function serves
  // both casts.
  if (n.patron) return _PATRON_MISS[Math.floor(_rand() * _PATRON_MISS.length)](n.name, _patronHis(npcId));
  const she = _pronoun(npcId) === "she" || (!_pronoun(npcId) && !!n.filler);
  const house = /^(mamasan|cashier)$/.test(NPC_ROLES[npcId] || "") || (typeof _FLUENT_THAI !== "undefined" && _FLUENT_THAI.has(npcId));
  const pool = house && she ? (_thaiHouse(npcId) ? _TOPIC_MISS_THAI : _TOPIC_MISS_HOUSE) : (_thaiVoice(npcId) && npcId !== "tan" && npcId !== "nont") ? _TOPIC_MISS_TH : _TOPIC_MISS_EN;   // Tan is fluent: "That one I don't know, na" was his (László, round 73)
  // a woman out of her own bar (on your arm in another) does not say "this bar, I know everything about" (Martin, round 85)
  const _away = NPCS[npcId].room && NPCS[npcId].room !== G.room;
  let _pool = _away ? pool.filter(f => !/this bar|my side of the counter/.test(String(f))) : pool;
  // "the till, I know" is the till keeper's line — a mamasan beside a cashier does not claim the drawer
  if (_tillKeeper(G.room) !== npcId) _pool = _pool.filter(f => !/The till, I know/.test(String(f)));
  let line = _pickVary(_pool.length ? _pool : pool, "miss:" + npcId)(n.name);   // not the same brush-off twice running from one mouth (Desmond, round 63)
  if (!she && pool === _TOPIC_MISS_TH) line = line.replace("her head", "his head").replace("the wrong girl", "the wrong man");
  if (she && NPC_ROLES[npcId] === "mamasan") line = line.replace("the wrong girl", "the wrong mama");   // Candy is nobody's girl (Margarethe, round 47)
  if (she && pool === _TOPIC_MISS_EN) line = line.replace("shakes his head", "shakes her head");
  return line;
}

// `asNew`: the player asked a genuinely NEW question that this (already-spoken)
// node happens to answer — the _selfNamedNode path, where a man's own greeting
// volunteered a proper noun and the player typed it back. He has not repeated
// himself, so the "you asked me that already" brush-off is a false accusation
// AND carries no information: asking Lake Gary about the Midnight Sun, which he
// himself had just name-dropped, was answered "You asked me that one. Same
// answer. Memory like a sieve, this town." on the FIRST ever ask (Wes, round
// 33, 2026-09-01 — "a cross-checker's verb, gaslit on first use").
// The first sentence of the first thing a node SAYS, closed — the gist of a story you have heard,
// for a node with no authored `short` (round 77).
function _gistOf(txt) {
  const t = String(txt || "");
  const q = t.match(/"([^"]+)"|“([^”]+)”/);
  if (!q) return t.split(/(?<=[.!?])\s/)[0];
  const said = (q[1] || q[2]).split(/(?<=[.!?])\s/)[0].replace(/[,;:—–-]\s*$/, "");
  return "\"" + said + (/[.!?]$/.test(said) ? "" : "…") + "\"";
}
function _deliver(npcId, d, full, asNew) {
  const n = NPCS[npcId];
  // Second time you hear a line, get the point, not the whole spiel. We track
  // which entries an NPC has delivered (by index) and, on a repeat, swap in the
  // entry's `short` gist and skip the Thai flourish. With no `short`, a pure
  // flavour line (no gives/sets payload) gets a generic brush-off so EVERY
  // repeat is terse — but a quest/clue entry that carries something re-readable
  // still repeats in full, so a player who forgot an instruction can re-read it.
  const idx = n.dialogue.indexOf(d);
  // ONE BOOK, PERMANENT, FOR EVERYONE. The regulars used to re-tell in full
  // every night (their own nightly book) while the staff went terse forever —
  // and once the fold put both on the same rail, a player drinking with all
  // four Queen Vic men noticed within three nights that Angela replayed her
  // whole speech while Terry two stools along gave the gist. The nightly book
  // encoded which authoring block a character came from, nothing about the
  // character. NOBODY RETELLS UNLESS ASKED: a repeat is the gist, and `opts.full`
  // (a player saying "…again") is the only way back to the whole thing.
  const seen = G.talked[npcId] || (G.talked[npcId] = []);
  const repeat = seen.includes(idx);
  const flavor = !d.gives && !(d.sets && d.sets.length);
  // A quest/clue node (gives/sets) still re-reads in full — re-reading an
  // instruction you were given isn't a retell, it's the journal working. Asking
  // for the story again (`full`) beats everything.
  // "Buy a round and I'll pretend it's new" — the brush-off pools have offered
  // that deal on every repeated topic in the game, and nothing honoured it: a
  // completionist bought Terry a beer, asked again, and got the identical
  // brush-off (Soi 6, 2026-08-29). A drink now buys one telling, in full.
  // …a STORY, though, never the hello. A lady drink sets roundFor, so buying a
  // woman a drink un-tersed her topicless greeting and she introduced herself
  // again — in full, with the Thai and "I no speak English good" — to a man who
  // had bought her eighteen drinks. Buying the drink was what made her forget
  // him, which is a cruel joke on the one playstyle the game rewards (Geraint,
  // round 48). A repeat greeting falls through to _HELLO_AGAIN as it should.
  const _rtKey = npcId + ":" + idx;
  const bought = !!(G.soc && G.soc.roundFor && G.soc.roundFor[npcId]) && !!d.topic &&
    !((G.soc.roundTold || {})[_rtKey]);   // four drinks were four full retellings of one story (Dieter, round 56)
  const terse = repeat && !full && !bought && (!!d.short || flavor);
  if (bought && !terse && G.soc.roundFor) { delete G.soc.roundFor[npcId]; if (repeat) (G.soc.roundTold = G.soc.roundTold || {})[_rtKey] = true; } // spent
  const firstEver = !repeat && seen.length === 0;
  if (!repeat) seen.push(idx);
  if (terse && !asNew) { if (typeof _noteMiss === "function") _noteMiss("terse"); }
  else if (typeof _stuckReset === "function") _stuckReset(); // a new line landed: the world moved
  if (d.th && !terse) { _say(`${n.emoji} ${n.name}: “${d.th}” (${d.rom})`, "thai"); _engineSpeak(d.th); }
  // the brush-off keeps its speaker's register — the rail's grizzled pool for a
  // regular, the soi's fond one for everyone else — and says how to get the rest
  // …and on the asNew path a node with no `short` gives its TEXT rather than a
  // brush-off: the gist is fine (it still answers), the brush-off is not.
  const _ts = typeof _townStory === "function" ? _townStory(npcId, d) : null;   // the town book — see _townPick
  const _txt = (_ts && _ts.text) || d.text, _sh = (_ts && _ts.short) || d.short;
  // …a node you have HEARD, reached by another word in it, is still a retelling: it answers with
  // its gist — the first sentence she said — and never the whole speech again (Siobhan, round 77:
  // "surin", "norway" and "wales" each replayed the whole node). Unheard, asNew tells it in full.
  const _line = _fillSaid(terse
    ? (_sh || (asNew ? _gistOf(_txt) : (n.patron ? _patronAgain(npcId) : _askAgain(npcId))))
    : _txt);
  _say(npcId === "tan" ? _tanOnFoot(_line) : _line);
  // Courted before you ever talked (drinks first, introductions after — a
  // legitimate Pattaya order of operations): the authored greeting reads
  // tone-deaf if it pretends the ledger is blank, so acknowledge it under the
  // intro rather than rewriting every intro (playtest #12).
  if (firstEver && (G.soc.drinks[npcId] || 0) >= 2 && ((G.soc.drinkCount || {})[npcId] || 0) >= 1 &&   // DRINKS bought, not the floor's bond (Hal, round 62: "several drinks after" to a girl he never bought one)
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
      const _wc = _walletCash(); G.money += _wc; G.walletLedger = true; G.walletLedgerN = _wc;
      _say(_wc > 0 ? `(${G.walletHeld != null ? "Some" : "Most"} of the cash is still in it — ฿${_num(_wc)} back in play${G.walletHeld != null ? "; the rest paid for somebody's week" : ""}.)` : "(The cash is gone; the cards and the key card are what came back.)", "dim");
    }
  }
  const st = _npcState(npcId);
  // State-machine effects fire on FIRST delivery only — right for almost
  // everything, and catastrophic for a node whose effect ARMS AN OFFER. The 51%
  // partner pitch sets pendingChoice through its fx, so declining once made the
  // flagship decision of the whole expat stage permanently unreachable: no
  // re-ask, no "…AGAIN", no other route, and the quest sat active forever. And
  // Candy PRAISES you for declining — "a man who says yes to fifty-one percent
  // in one night is not a man I want holding forty-nine" — so the game rewards
  // caution and then deletes its own endgame for it (round 24, Keith, who could
  // only finish his session by reaching round the back of the machine).
  // `fxAlways` is the opt-in for effects that are an OFFER rather than a change.
  if ((!repeat || d.fxAlways) && d.fx) d.fx(st, G);
  // first contact (any exchange) IS the meeting: advance the state and grant the
  // baseline trust here, so the meeting bonus never depends on which node fired.
  if (st.dstate === "stranger") { st.dstate = "met"; st.trust = Math.min(5, st.trust + 1); { const md = (G.metDay = G.metDay || {}); if (md[npcId] == null) md[npcId] = G.day; } (G.metRoom = G.metRoom || {})[npcId] = G.room; }   // the first meeting stays the first (a drink can meet her before a word does)
  // this node is now the live one — its `choices` (if any) become the action-choices
  G.convoIdx = G.convo === npcId ? idx : G.convoIdx;
  if (d.choices && d.choices.length) (G.convoChoiceMemo = G.convoChoiceMemo || {})[npcId] = idx; // typed labels outlive the next ask (27-night playtest)
  _convoAsk(npcId, d, st);                     // …and the partner may put a question back to you
}

// Is this a man who will not be where you leave him? Keyed on the FLAG and the
// hour, deliberately not on a one-hour probe: at 10% an hour the probe answers
// "no" about nine times in ten, so a clue would read as a firm promise and go
// stale two hours later. Anyone drifting tonight gets the caveat, every time.
function _willMove(id) {
  const n = NPCS[id];
  return !!(n && n.hops && _hopsNow(id));
}

// ── Look / describe ────────────────────────────────────────────────────────

// The buildings you can ENTER off this block. A migrated road node lists them
// explicitly in `venues`; an un-migrated one still hangs its bars on compass
// exits, so fall back to scanning those (identical to the old "Step inside"
// behaviour) until every district has been moved over.
function _venuesHere(r) {
  if (r.venues) return r.venues;
  const out = [];
  // a windowless interior whose only exit is OUT is not "beside" the bar it opens
  // into — the back office listed Kitten Corner under "Step inside" (Ray, r45)
  const keys = Object.keys(r.exits || {});
  if (!r.bar && !r.barType && keys.length === 1 && keys[0] === "out") return out;
  for (const to of Object.values(r.exits || {}))
    if (ROOMS[to] && ROOMS[to].bar && !out.includes(to)) out.push(to); // one bar, one listing
  return out;
}

// The bar's ambient regular — atmosphere, NOT a person you can reach. He's
// deliberately never in the "Here:" list and can't be talked to, so the wording
// has to read as furniture-you-overhear, not an unmet character (an undelivered
// promise otherwise). Pooled — it prints on every bar describe. The "busy" pool
// takes the clause naming whichever hostess he's monopolising.
// Walking back into the bar you OWN is not a customer's return — "the table's free,
// the Singha's cold, and Bert has a theory about your last shot" (Rolf, round 55)
const _OWNER_REVISIT = [
  "Back behind your own sign. The till light is on, the ice is in, and the room does the small reorganisation a room does when the owner walks in.",
  "Your bar. Bert lifts the chalk an inch in greeting and goes back to the cue. Somebody has swept; somebody always has, before you arrive.",
  "The Stinky, from the owner's side of the door: you check the fridge light, the float, the fan, before you've decided to check anything.",
  "In off the soi into your own room. The regulars nod the way men nod at the landlord of a pub, which you now are, near enough.",
];
// the bar you manage: the floor's pitch is for the customers, not the man who keeps its book
const _MANAGER_REVISIT = [
  "Back on your floor. The girls look up the way a floor looks up at the manager — a glance to see what kind of night you have brought in — and go back to the customers.",
  "In through the door you are paid to stand behind. The cashier tips the float book an inch toward you; the music does not change for you, and should not.",
  "Your shift's room again. The mamasan reads your face before she reads the door, and a girl who was halfway off her stool sits back down: you are not a customer.",
  "Back at the bar you manage, from the staff side of the room. The stools, the ice, the board — you check them before you have decided to check anything.",
  "The floor you run for somebody else's name. Nobody pitches you; a girl asks if the ice is coming, which is the kind of thing they ask the manager.",
];
const _BAR_REGULAR = [
  "Down the far end, a knot of regulars are welded to the bar, deep in an argument only they follow — part of the furniture, not the cast.",
  "A lifer holds down the corner stool, holding forth at the room in general; the kind of fixture you nod past, never actually meet.",
  "The far stools run to the usual weathered faces — here before you, here after you, and not looking for anyone new tonight.",
  "Somewhere down the bar a regular drones on to nobody in particular, background hum under the music.",
];
// a go-go has benches and a front row, never a bar to be welded to (Ingrid, round 103, at the Las Vegas)
const _BAR_REGULAR_GOGO = [
  "Along the wall benches, a knot of regulars have their usual table and an argument only they follow — part of the furniture, not the cast.",
  "A lifer holds down the end of the front row, tipping by the habit of years; the kind of fixture you nod past, never actually meet.",
  "The back benches run to the usual weathered faces — here before you, here after you, and not looking for anyone new tonight.",
  "Somewhere along the benches a regular drones on to the waitress, background hum under the music.",
];
const _BAR_REGULAR_GOGO_BUSY = [
  g => _fmt("At the end of the front row a sunburnt regular holds court{g}, sealed in his own little world — no seam in it for you to get a word through.", { g }),
  g => _fmt("A red-faced fixture has the corner bench{g}, mid-story, mid-myth; whatever that is, it isn't yours to join.", { g }),
];
const _BAR_REGULAR_BUSY = [
  g => _fmt("Down the far end a sunburnt regular holds court{g}, sealed in his own little world — no seam in it for you to get a word through.", { g }),
  g => _fmt("A red-faced fixture works the far stools{g}, mid-story, mid-myth; whatever that is, it isn't yours to join.", { g }),
  g => _fmt("At the far end a regular reigns{g} — the sort of scene you watch from across the bar, not one you walk into.", { g }),
];
// Low season, the rail thinned (no named regulars in): the anonymous crowd would
// contradict the empty room the season just emptied (Ronnie, 2026-08-26 — "a
// red-faced fixture works the far stools" printed two lines above "the room
// belonged to nobody"). The far end is where nobody is.
const _BAR_THIN = [
  "The far stools are empty tonight — the regulars who'd usually be welded to them are home, or wherever the low season sends them. The bar feels bigger and quieter than it should.",
  "Nobody's holding down the corner stool. In season there'd be a lifer there holding forth; tonight it's just the stool, and the fan turning over it.",
  "The rail runs mostly to bare wood down the far end, and a lot of stools nobody's paying to sit on. Low season does this.",
  "Down the far end it is bare wood and a fan. Whoever usually fills it is somewhere cheaper this month, and will be back when the flights are.",
];
// The same beat where there IS floor staff to notice it with. The generic pool
// used to name "a hostess or two, the mama" and printed it in a sports pub with
// nobody in it at all (Maureen, round 47).
const _BAR_THIN_STAFFED = [
  "The rail runs mostly to bare wood down the far end. A hostess or two, whoever has the till, and a lot of stools nobody's paying to sit on. Low season does this.",
  "The girls have the far half of the bar to themselves and are using it to sit down, which in season they never get to do. Nobody minds you noticing.",
];

// Where the dog actually settles. Keyed on what the room IS rather than on
// whether it happens to carry a `bar` display name, which put him at your heel
// inside an air-conditioned mall with security guards who wai, and folded him up
// "outside the door" of an open-air market that has no door and is, of all the
// places in this town, the one most full of dogs (persona report A#21,
// 2026-08-23).
// He is at your heel in a great many places and the line said "nose reading the
// street" in all of them, including a police station counter and the sand at
// Dongtan (Bill, round 44). Pooled, and pavement-free.
const _DOG_HEEL = [
  "Sai Krok pads at your heel, reading the ground ahead of you.",
  "Sai Krok is at your heel, half a step back, checking things you have not noticed.",
  "Sai Krok keeps station at your left knee, nose up, entirely at ease.",
  "Sai Krok falls in beside you and stays there, the way he has since the night you fed him.",
];

function _dogSpot(r) {
  if (r.barType === "beer") return "under";                 // open front, no door to stop him
  if (/market|bazaar/i.test(r.name || "")) return "heel";   // tarpaulins and scraps: his country
  if (/\bmall\b|central festival/i.test(r.name || "")) return "outside";  // glass, aircon, guards
  if (r.bar || r.barType || r.massage || r.soapy || r.hostBar) return "outside";
  if (r.indoors || G.room === "police_station" || G.room === "oy_office") return "outside";   // an office, a desk sergeant: he waits by the door (Owen, round 46)
  if (_isHotelRoom(G.room)) return "mat";            // your own door, your own dog
  // A 7-Eleven does not admit a street dog, and a restaurant does not either —
  // both were printing the hotel-mat line, so he turned three circles on a mat
  // that does not exist, inside a shop that would never have him (Bill, r44).
  // (r.seven is a STREET that has a 7-Eleven on it, not a shop room — he stays
  //  at your heel out there.)
  if (r.shop || r.food) return "outside";
  return "heel";
}

// the roster's one line about a woman who left (narration; the floor's words are hers)
// the kept exit's roster line (the quiet shift change, 2026-10-19): the board said "out with customer" for a week
const _EXIT_ROSTER_KEPT = [
  "{n}'s stool has somebody else on it. The girl beside you follows your look. “She go with her sponsor. He stop pay the bar, she stop come.” A shrug with something underneath it. “Boss write big message in the group. Everybody read. Nobody answer.”",
  "No {n}. Her name was on the board all last week — ‘out with customer’, the woman on the till says, and then it was not on the board. “She have a condo now. Other side of Sukhumvit.” She says it like a weather report, and does not say what she thinks of the weather.",
  "You look for {n}, and the girl who catches you looking does not smile. “She finish. Her man take her — no more bar.” A pause. “Boss say he send her photo to every bar. Nobody care. Every bar take her tomorrow.” And then, quieter: “Lucky one.”",
];
const _EXIT_ROSTER = [
  "{n}'s stool has somebody else on it. When you ask, the girl beside you says it the way people say good news they are not sure they are allowed: “She go home. She {p} now. End of last month.” One morning the locker was empty, and that was the whole of the leaving.",
  "No {n}. Not on a night off — gone. “She finish,” the woman on the till says, and then, because you keep looking at the stool: “She {p} now. Like she always say.” She says it flat, and then she says, “Good,” and goes back to the book.",
  "You look for {n} and the girl who catches you looking shakes her head, smiling. “She not here, she go home. She {p} now — the thing she always talk about.” A pause. “She send photo. Small shop. Very small.” She holds her fingers an inch apart, pleased.",
];
// A room's return lines are a BOOK, not a coin: every line before any repeats — the balcony's WHERE YOU GO
// SEXY MAN came round two mornings running (Kevin, round 84). One roll, as _pickVary always spent.
// A ROOM'S OWN LINES READ WHO IS IN IT (Ruth, round 94): with a woman on your arm the floor does not pitch you
// ("Come upstairs, tilac. Why we pretend?", "drink, room, price"), and a line naming one of this room's women
// who is not on her floor — gone home, or on your arm — is not said. The whole pool comes back if nothing is left.
const _ROOM_PITCH = /\bupstairs\b|why we pretend|short time|long time|in your lap|across you|drink, room, price|the rest\?|hand on your thigh|choose me|the offer against your ear|noodle finds your|noodle to your|wrist-grabs|to intercept you|hands already reaching|HANDSOME!|call you handsome|the entire economy walking past|hand finds your arm|grab accordingly|read your wallet|offers? (?:you|at you)|before you.ve picked a bar|hand on your wrist|calls you handsome|a plan for you|fingers find yours|the pitch is/i;
// …and when every line on a street is a pitch, the street with a woman on your arm (rather than the pitch back)
const _ROOM_WITH_HER = [
  "Back along the soi with {who} on your arm, and the doorways look straight past you — the wrist-grabs go to the next man, the noodles stay down. Company is the one thing on this street nobody tries to sell you.",
  "The fronts call to everybody but you. {who} nods to a girl she knows, says something in Thai that makes them both laugh, and steers you on.",
  "A tout starts his line, sees {who}, and turns it into a wave. On this soi a man with somebody on his arm is off the market, and the market respects it.",
  "The neon is the same and the noise is the same, but the soi treats you like a resident tonight: nobody reaches, nobody calls. {who} has your arm and the whole street can see it.",
];
const _ROOM_WITH_HER_RE = /^(?:Back along the soi with|The fronts call to everybody|A tout starts his line|The neon is the same and the noise)/;
function _roomLinesFit(pool, room) {
  const withHer = !!(G.party && G.party.ids && G.party.ids.length);
  const absent = Object.keys(NPCS).filter(i => NPC_ROLES[i] && (NPCS[i].room === room) && (!_npcsHere().includes(i) || (withHer && G.party.ids.includes(i))));
  // …and a bar where a woman on the floor is already yours (regular or better) does not pitch you as a walk-in: the
  // floor knows whose you are (Steve's rerun, at the bar the room itself had called him "spoken for" in)
  const spoken = !withHer && !!(ROOMS[room] && ROOMS[room].barType) &&
    _npcsHere().some(i => NPC_ROLES[i] === "hostess" && NPCS[i].room === room && _knownTier(i) >= 2);
  const f = pool.filter(l => (!(withHer || spoken) || !_ROOM_PITCH.test(String(l))) &&
    !absent.some(i => new RegExp("\\b" + String(NPCS[i].name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(String(l))));
  if (!f.length && withHer && !(ROOMS[room] && ROOMS[room].barType)) return _ROOM_WITH_HER.map(l => _fmt(l, { who: typeof _partyLabel === "function" ? _partyLabel() : "her" }));
  return f.length ? f : pool;
}
function _revisitPick(pool, room) {
  pool = _roomLinesFit(pool, room);
  const book = (G.revisitSaid = G.revisitSaid || {}), said = (book[room] = book[room] || []);
  let fresh = pool.filter(l => !said.includes(String(l).slice(0, 50)));
  if (!fresh.length) { book[room] = []; fresh = pool; }
  const line = _pickVary(fresh, "rv:" + room);
  book[room].push(String(line).slice(0, 50));
  return line;
}
// A SENTENCE OF THE PAINT THAT SEATS THE WOMAN ON YOUR ARM is dropped while she is on it (Hal, round 96: "Kwan folds
// napkins into cranes at the end of the rail" with Kwan listed "(with you)"). Her name, whole-word; the rest of the paint stands.
const _STINKY_PLG_REVISIT = [
  "Back into the Stinky Pinky — lime and cue chalk still, the trophies still three deep, and a card machine on the counter now.",
  "The pool bar takes you back. The girl in the company polo on the door smiles the company smile; the end stool has a different man on it.",
  "The Stinky again, the group's now: the same skunk over the door, a new menu in a plastic sleeve, the table brushed like a green.",
  "You step back into the crack of cue balls. Across the junction the Blue Dog's rail faces the bay. The end stool is somebody else's.",
];
function _stinkySoldDesc(via, desc) {
  const d = String(desc);
  if (via === "bert") return d.replace("Bert — the manager — holds court", "Bert — the owner now, Candy's name on the fifty-one — holds court");
  return d.replace(/^An American-run beer bar/, "A Pattaya Leisure beer bar now")
    .replace(/Bert — the manager — holds court from the end stool with a bottomless Singha and opinions on everyone's break\./, "A girl in a company polo works the door, a card machine sits where Bert's chalk lived, and the end stool has nobody holding court from it.")
    .replace("half of Bert's regulars ducked in here to dodge it once and never left", "half of the old regulars ducked in here to dodge it once and stayed, until the group bought it");
}
function _dropCompanionLines(text) {
  const ids = (G && G.party && G.party.ids) || [];
  if (!ids.length || typeof text !== "string") return text;
  const names = ids.map(id => NPCS[id] && NPCS[id].name).filter(Boolean);
  if (!names.length) return text;
  const parts = text.split(/(?<=[.!?])\s+/), kept = parts.filter(s => !names.some(nm => new RegExp("\\b" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(s)));
  return kept.length && kept.length < parts.length ? kept.join(" ") : text;
}
function _describeRoom(full, forceFull) {
  // THE LAST NIGHT SAYS SO on its first look (Dougie, round 96: nothing told him until he tried to go to bed)
  if (G && G.mode === "soi6" && _lastNight() && G.lastNightNotice !== G.day && !G.pendingChoice && G.nightTurn < 20) {
    // its own marker: it used G.lastNightSaid, the morning ledger, and LAST NIGHT went blank on night 7 (review 2026-10-25)
    G.lastNightNotice = G.day; _say("(The last night of the week. Whatever it is you came for, this is the night for it.)", "alert");
  }
  // a pay-on-arrival fare has landed you already: a reload redrew the stop you LEFT, bars and
  // exits and all, under a driver waiting at the other end (Helga, round 57)
  if (G.pendingFare && !G.pendingFare.charter && G.pendingFare.dest && ROOMS[G.pendingFare.dest] && G.pendingFare.dest !== G.room) {
    _say(_fmt("You are on the kerb at {where}, and the {who} is still leaning out of the window waiting to be paid.",
      { where: ROOMS[G.pendingFare.dest].name, who: G.pendingFare.kind === "bus" ? "driver" : "piwin" }));
    return;
  }
  const r = _room();
  const firstTime = !G.visited[G.room]; // full desc on first arrival + LOOK; brief ambient on revisit
  G.visited[G.room] = true; // standing in it is how places join the fast-travel list
  if (G.visitDay && G.visitDay[G.room] == null) G.visitDay[G.room] = G.day;
  // Candy's recce quest: eyes on all three new drinking strips completes it
  // (flag is cheap and idempotent; _questTick only pays while the quest is active)
  // Tree Town's far end is TWO rooms a player could reasonably read as "the far
  // lane" (Far Lane / Deep Corner) — accept either, or a correct walk reads as a
  // broken quest (Marguerite, 2026-08-27). Legs + labels live on the QUESTS entry.
  if (G.visited.myth_rows && (G.visited.tt_lane_3 || G.visited.tt_deep) && G.visited.soi6_mid) _setFlag("recceDone");
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
      : (_room().darkGlow ? _room().darkGlow + " " : "") + "It is pitch dark. If your phone has any battery left, its flashlight " +
        "would help. Sois this dark tend to have soi dogs in them.", "alert");
    return;
  }
  _say(r.name, "room");
  if (raining) {
    _say(_underRoof(G.room)
      ? "Rain hammers the roof — a proper " + (!_wetSeason() ? "out-of-season" : "rainy-season") + " downpour outside, and nobody's " +
        "stepping into that until it eases."
      : /beach|sand|shore/i.test(String(r.name) + " " + (r.region || "")) && !(r.seven || r.venues)
      ? "Rain is coming down in sheets on the open sand, and there is no awning on a beach — only the rain and you, until it passes."   // "no awning on a beach" live, "the awning overhead" on reload (Priya, round 58)
      : "Rain is coming down in sheets; the awning overhead is the whole habitable " +
        "world until it passes.", "alert");
  }
  // brief-on-revisit (IF verbose/brief): a rotating ambient line instead of the
  // full desc when you're just walking back through a place you've already read.
  // Opt-in per room via `revisit`; LOOK and boot/restore force the full desc.
  // a street can carry a post-midnight paint (`lateDesc`): the Khao Talo prose
  // kept advertising Mama Yai's charcoal smoke after the shutters (playtest 2026-08-22)
  // …and a lateDesc may be a POOL, like every other repeatable line in the game
  // (Mario, 2026-09-04): a man who stays out to dawn every night reads it more
  // often than he reads the daytime paint.
  const late = r.lateDesc && G.nightTurn >= _lateTurn(G.room);
  // a bar you sold is painted as its buyer runs it: the group's has no Bert in it, Bert's has him as its owner
  const sold = G.room === "stinky_bar" && G.barSale && G.barSale.via !== "tan" ? G.barSale.via : null;
  const lateP = sold === "plg" && Array.isArray(r.lateDesc) ? r.lateDesc.filter(l => !/\bBert\b/.test(l)) : r.lateDesc;
  if (full) _say(_dropCompanionLines(late && lateP && lateP.length ? (Array.isArray(lateP) ? _pickVary(lateP, "late:" + G.room + (sold || "")) : lateP)
    : (!firstTime && !forceFull && r.revisit ? _revisitPick(_atOwnBar() ? _OWNER_REVISIT : _atJobBar() ? _MANAGER_REVISIT : sold === "plg" ? _STINKY_PLG_REVISIT : r.revisit, G.room)
      : (_atOwnBar() ? String(r.desc).replace(/^An American-run beer bar/, "Your beer bar — the old man's name still over the door —") : sold ? _stinkySoldDesc(sold, r.desc) : r.desc))));   // owned, it is not "American-run" (Marta, round 63)
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
    _say(G.soc && G.soc.coconutDone   // its own book: a freelancer met on another street did not empty these stools (Margaret, round 78)
      ? "The freelance stools under the palms sit empty now — the night's trade has moved on."
      : "Under the coconut palms, the freelance stools are working — a cigarette ember, " +
        "a low laugh, eyes reading the sand for a walk-up. (TALK TO THE LADIES, if you like.)", "dim");
  }
  const npcs = _npcsHere();
  // One presence line for everyone actually in the room — staff and patrons in
  // the same "Here:" list (it used to split into "Here:" + "At the rail:",
  // which read like two separate crowds). One cast now: _npcsHere carries the
  // flagged regulars too, so a second patron map would list every one twice.
  // Just emoji + name for all — a patron's (age, nat) lives in EXAMINE.
  // a girl on your arm is not "on the floor" — the roster listed her back among
  // the staff in her own bar the moment after "one arm through yours" (Lars, round 47)
  const _onArm = id => G.party && G.party.ids && G.party.ids.includes(id);
  const _badgeOf = id => _room().barType === "gogo" ? _badge(id) : null;   // the floor knows her by the number (theme 12)
  // a girl on your arm has unpinned the number — she is with you, not on the board
  const here = npcs.map(id => `${NPCS[id].emoji} ${_npcLabel(id)}${_onArm(id) ? " (with you)" : _badgeOf(id) ? " (" + _badgeOf(id) + ")" : ""}`);
  if (here.length) _say(_L("Here: ") + here.join(", ") + ".");
  // a girl already sitting with a customer says so where you can see it: "the man beside her" was
  // nobody on the Here: line (Margaret, round 78). The customers are the room's, not the cast's.
  if (typeof _girlBusy === "function") {
    const busy = npcs.filter(id => _girlBusy(id)).map(id => NPCS[id].name);
    if (busy.length) _say(`(${busy.length === 1 ? busy[0] + " is" : busy.slice(0, -1).join(", ") + " and " + busy[busy.length - 1] + " are"} sitting with ${busy.length === 1 ? "a customer" : "customers"}.)`, "dim");
  }
  // A punter knows the mama and the cashier the moment he sits down — the game
  // didn't say, and a man bought eight lady drinks for two cashiers and a
  // mamasan before EXAMINE told him (Lionel, round 36). One dim line, roles only.
  if (full && r.barType && npcs.length) {
    const mama = npcs.find(id => NPC_ROLES[id] === "mamasan");
    const till = npcs.find(id => NPC_ROLES[id] === "cashier");
    const roles = mama && till ? `${NPCS[mama].name} runs the floor; ${NPCS[till].name} keeps the till.`
      : mama ? `${NPCS[mama].name} runs the floor and the till both.`
      : till ? `${NPCS[till].name} keeps the till.` : "";
    if (roles) _say("(" + roles + ")", "dim");
  }
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
  // One line for the room, not one per absent owner — the Boardroom printed the
  // template twice for Bill and Ampai, and said "over on Thappraya" to a man
  // standing on Thappraya (Owen, round 46). Names the girl the till is left with.
  {
    const away = Object.entries(NPCS).filter(([id, n]) => n.bars && n.bars.includes(G.room) && _npcRoom(id) !== G.room);
    if (away.length) {
      const cover = typeof _tillKeeper === "function" ? _tillKeeper(G.room) : _coverGirl(G.room);
      // the district is ALWAYS named (two bars are called the Sundowner — Hamish, round 38);
      // "over on" only when it is another district, "along" when it is this one
      const where = ([id]) => { const rm = _npcRoom(id); const reg = ROOMS[rm] && ROOMS[rm].region;
        return _barName(rm) + (reg ? (reg !== _room().region ? `, over on ${reg},` : `, along ${reg},`) : ","); };
      // two owners at the same other bar: one clause, not the template twice (Henri, round 47)
      const sameBar = away.length > 1 && away.every(a => _npcRoom(a[0]) === _npcRoom(away[0][0]));
      const line = sameBar ? `${away.map(a => a[1].name).join(" and ")} are both working ${where(away[0])}`
        : away.map(a => `${a[1].name} is working ${where(a)}`).join(" and ");
      _say(`${line} tonight` + (cover ? `, and it is ${NPCS[cover].name} on the till — the one ${away.length === 1 ? _pr(away[0][0]).s : "they"} leave${away.length === 1 ? "s" : ""} it with.`
                                       : `; the floor staff keep this one running.`), "dim");
    }
  }
  // THE EXIT IS QUIET (theme 11): a girl you had spoken to is gone from this floor
  // — not to a man, to the thing she said — and the room says so once a trip.
  if (r.barType) {
    const said = (G.exitSaid = G.exitSaid || {});
    if (said[G.room] !== G.vacation) {
      const gone = Object.keys(NPCS).find(id => NPCS[id].room === G.room && NPC_ROLES[id] === "hostess" &&
        G.talked && G.talked[id] && _exited(id));
      if (gone) {
        said[G.room] = G.vacation;
        _say(_fmt(_pickVary(_exited(gone) === "kept" ? _EXIT_ROSTER_KEPT : _EXIT_ROSTER, "exitroster"), { n: NPCS[gone].name, p: _exited(gone) }), "dim");
      }
    }
  }
  // The Orchid good table: once Tan's near-confirmation has armed it, walking in
  // (or LOOKing) pays off the whole hidden-hub arc — see _tanOrchidReveal.
  if (G.room === "orchid_room") _tanOrchidReveal();
  _oppTick();   // the bar opposite, seen from your own doorway
  _frontierTick();   // the group buying Soi 6's inner west, a front at a time
  _streamDescribe();   // the camera corner while the big tipper is online (2026-10-22)
  _streetLookTick();   // the plane refused: the floor looks past a man who slept out
  // the Soi 6 week's fence is a refusal, not a road: the East End listed "e" every night (Aisling, round 87 — the compass already knew)
  const exits = Object.keys(r.exits).filter(d => !(G.mode === "soi6" && typeof SOI6_ROOMS !== "undefined" && !SOI6_ROOMS.has(r.exits[d])));
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
      _say(G.dog ? _dogN("(The soi outside has no working lights. Sai Krok knows every dog on it, but you still have to see the kerb — LIGHT ON " +
        "before you step out.)") : "(The soi outside has no working lights, and it has dogs. LIGHT ON " +
        "before you step out — the phone does it, and it costs almost nothing.)", "dim");   // a dog warning to a man whose dog is on the mat (Priya, round 58)
    }
  }
  // Buildings fronting this block: entered by name or a tap, not by a compass
  // point (a busy soi can front 4–6 of them, and a door isn't a block away —
  // it's right here). "Exits" is roads only now; the venues list is the doors.
  let venues = _venuesHere(r);
  // Notty's is somewhere you get SENT, not somewhere you find — keep it off the door list until you have been
  if (!_nottysOpen())
    venues = venues.filter(id => id !== "nottys_place"); // you get SENT to Notty's — see Candy's `rose` node
  // …but not in your own hotel room, whose single DOWN/OUT is the venue the
  // exit-scan fallback would otherwise re-list as "Step inside: <the bar below>".
  // A door that will refuse you is not a door you're invited through. After
  // midnight on the Darkside the room's own prose says every bar shut — and
  // then listed four of them under "Step inside", all of which answer with the
  // shutters (Gerry, round 34). Drop the shut ones; if that empties the list,
  // say nothing rather than inviting nobody anywhere.
  const _shut = id => _closedNow(id);
  const _open = venues.filter(id => !_shut(id));
  const _lockedDoor = _lockInDoorHere();
  if (_open.length && G.room !== _hotelRoomId()) {
    _say(_L("Step inside: ") + _open.map(id =>
      (ROOMS[id].bar || ROOMS[id].name).replace(/\s*\(.*\)$/, "")).join(", ") +
      _L(". (ENTER <name>)"), "dim");
  } else if (venues.length && !_open.length && !_lockedDoor && G.room !== _hotelRoomId()) {
    // the street still has its doors; they are simply all shut right now
    _say(_L("Every door on this stretch is shut for the night."), "dim");
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
    else _say(_dogN(_pickVary(_DOG_HEEL.filter(l => !(G.dog && G.dog.since === G.day && /since the night you fed him/.test(l))), "doghere")), "dim");   // half an hour after feeding him (Steve)
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
      _say(_dogN(_pickVary(_DOG_HEEL.filter(l => !(G.dog && G.dog.since === G.day && /since the night you fed him/.test(l))), "doghere")), "dim");
    }
    if (G.room === "khao_talo_strip") _dogShamrock(); // the dead pub knows him
  } else if (_flag("act1Done") && !r.bar && !r.barType && !r.massage && !r.soapy &&
      !r.hostBar && !r.indoors && !_isHotelRoom(G.room) && !_isDarkHere() && !G.rain && G.dogNudgeDay !== G.day && _rand() < 0.35) {
    // the un-adopted dog makes himself known: at most once a night, lit streets
    // only (never a hotel room — he can't climb to your balcony), and never
    // during Act One's tight opening
    G.dogNudgeDay = G.day;
    // one dog, one manor: he was met in Naklua and turned up on the hill and at
    // the Walking Street gate the same week (Henri, round 47). The first sighting
    // pins his district; the nudge only fires there after that. FEED DOG still
    // works anywhere — a dog you call is a dog who came looking.
    if (G.dogRegion && r.region && G.dogRegion !== r.region) return;
    if (!G.dogRegion && r.region) G.dogRegion = r.region;
    _say(_pickVary([
      "A soi dog with one clipped ear falls in beside you for half a block, matching " +
        "your pace with off-duty professionalism, then peels away at the next corner with " +
        "one look back. (FEED DOG, if you'd like that to go differently.)",
      "The clipped-ear dog is on his corner again, sitting like a man waiting for a bus. He " +
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
  // on the Soi 6 week the stand is scenery — every ride is refused by the week's own fence, and its sixteen fares
  // were a tease to a man pricing the cheapest way home (Liam, round 93)
  if (r.motosai) _say(G.mode === "soi6" ? "A motosai stand is here, the piwins in their vests waiting on fares out of the soi — not yours this week. Soi 6 is the whole map." : "A motosai stand is here. (MOTOSAI TO <place>)", "dim");
  if (r.atm) _say("An ATM stands against the wall. (WITHDRAW <amount> · CHECK BALANCE)", "dim");
  if (r.barType === "beer" || r.barType === "soi6") {
    _say("A Connect 4 frame and a Jackpot dice box sit within reach (PLAY …).", "dim");
  }
  if (r.barType === "gents") {
    _say("The couches along the wall have their curtains half-drawn; you are careful " +
      "where your eyes land. Buy a lady a drink and she'll settle in very close.", "dim");
  }
  if (r.massage === "legit") {
    // every legit shop claimed to be THE one honest kind, and the hint left herbal off the
    // board it stands under (Terence, round 57)
    _say("Reclining chairs, tiger balm, a price list on the wall. (MASSAGE — foot, Thai, oil " +
      "or herbal; real massage only.)", "dim");
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
    // the late paint covers the table for the night — the line beneath it said it "waits under a low lamp" (Thomas, round 92)
    const _covered = r.lateDesc && G.nightTurn >= _lateTurn(G.room) && /table covered/.test([].concat(r.lateDesc).join(" "));
    _say((_covered ? "The pool table is under its cover for the night, and the cover comes off for anyone who asks (PLAY POOL)." : "A pool table waits under a low lamp (PLAY POOL).") +
      (_leagueTonight() ? ` Tonight is LEAGUE NIGHT (PLAY KILLER, ฿${_num(KP_ENTRY)} in the ashtray).` : ""), "dim");
  }
  if (r.seven) _say("A 7-Eleven glows across the way " + (typeof _sevenMenu === "function" ? _sevenMenu() : "(BUY TOASTIE · BUY WATER · BUY CHARGER · BUY CONDOM)") + ".", "dim");
  if (_quizDay() && !r.barType) {
    const near = [...new Set([...Object.values(r.exits), ...(r.venues || [])])].filter(to => _quizBars().includes(to));
    if (near.length && G.nightTurn < 40) {
      // a quiz you have already played tonight is not an invitation (Kevin, round 84: 5/5, and the board still said walk in)
      const played = near.every(to => G.quizPlayed && G.quizPlayed[to]);
      _say(near.map(_barName).join(" and ") +
        (near.length > 1 ? " have" : " has") + " a chalkboard out: QUIZ NIGHT " +
        "TONIGHT 8-10 — FIVE RIGHT WINS ฿" + _num(QUIZ_PRIZE) + ". " +
        (played ? "You've had your go tonight; the board has your team's chalk on it." :
          G.nightTurn >= 20 ? "It's on right now; walk in and you're playing." :
          "Starts at 20:00; walk in during and you're playing."), "dim");
    }
  }
  if (_bandHere() && !(_closedNow(G.room)) && !(_closeTurn(G.room) != null && G.nightTurn >= _closeTurn(G.room))) {   // "a live band is playing" at 02:18 under the shutters (Kaspar, round 101)
    const isBar = !!r.barType;
    _say("A live band is playing tonight." +
      (isBar ? " (DANCE · SING · REQUEST <song> · TIP BAND · BUY ROUND FOR BAND)" :
               " (DANCE · SING · REQUEST <song> · TIP BAND)"), "dim");
  }
  if (_hasPoster()) {
    _say("A promo poster of one of the girls hangs by the door. (POSTER)", "dim");
  }
  // Your name on the slate is standing state, so the ROOM carries it — the title
  // used to exist only in one arrival line on league nights, and the bar it hung
  // in said nothing about it on any other night (Kevin, round 50).
  if (G.kpTitle && G.kpTitle[G.room]) {
    const _t = G.kpTitle[G.room];
    _say("Your name is on the slate behind the till" +
      (_t.defended ? `, with ${_t.defended === 1 ? "a mark" : _t.defended + " marks"} beside it` : "") + ".", "dim");
  }
  if (_salengHere()) { // a parked cart re-announces itself so a reload isn't blind to it
    const c = _SALENG_CARTS[G.salengCart];
    _say(c.here + " " + c.hint, "dim");
  }
  if (r.barType && !(_shutHere())) {   // the shut Vic has no rail to describe
    // The season reaches the FURNITURE too: an emptied low-season rail (no named
    // regulars in) gets the thinned line, not the anonymous crowd — which would
    // otherwise disagree with the empty-bar register on the same screen.
    // "Nobody's holding down the corner stool" printed in a room whose own desc
    // says Terry holds it down and whose Here: line lists him (Soi 6, round 21).
    // _regularsHere counts the flagged BENCH; the rail as a player sees it is
    // anyone present who isn't working — Terry, Doyle and Doug are role-less
    // customers who predate the flag and are just as much "a lifer holding
    // forth" as any of them.
    const _railCrowd = _npcsHere().filter(id2 =>
      !NPC_ROLES[id2] && !NPCS[id2].manager && !NPCS[id2].filler && !NPCS[id2].house);
    const _thin = _lowSeason() && !_railCrowd.length &&
      !(_lockedIn()) &&   // "low season, bare wood" during a lock-in party (Declan, round 58)
      ["beer", "soi6", "gents", "pub"].includes(r.barType);   // a club's floor "heaves" in its own desc — no bare-wood rail there (Dex, round 38)
    if (_thin) {
      // "the girls have the far half of the bar to themselves" printed at Cloze,
      // which is one woman (Colm, round 47) — the staffed pool wants a FLOOR,
      // not a member of staff.
      const _nStaff = _npcsHere().filter(id2 => NPC_ROLES[id2]).length;
      const _staffed = _nStaff > 1;
      // "a hostess or two" under a Here: line of five named women (Priya, round 58)
      if (_nStaff <= 3) _say(_pickVary(_staffed ? _BAR_THIN_STAFFED : _BAR_THIN, "barThin"), "dim");
    } else if (G.soc.patronBusy[G.room] && !_railCrowd.length) {
      // …and never beside a NAMED rail: "a red-faced fixture works the far
      // stools" printed under a Here: line reading Doug, Phil and Dave, who are
      // the fixture (Rolf and Tomasz, round 54, independently). The men on the
      // rail are the cast; the anonymous lifer is for a rail with nobody on it.
      // name the SAME girl the snipe-jealousy keys on (parser); legacy `true`
      // falls back to the first hostess present
      const busyId = G.soc.patronBusy[G.room];
      const _descHas = id2 => new RegExp("\\b" + NPCS[id2].name + "\\b").test(String(r.desc || ""));
      // The _descHas guard has to apply to the STORED girl too, not just the
      // fallback search: the Anchor Bar's own description says "Namfon pours a
      // cold one before you've picked a seat", and the same Namfon was then
      // "laughing on cue beside" a regular in his own little world with no seam
      // to get a word through — one staffer, two places, three lines apart
      // (Gerry, round 34). A woman the room has already placed can't be
      // simultaneously unavailable somewhere else in it.
      // …nor a girl who is YOURS. "Lek laughing on cue beside him — the sort of
      // scene you watch from across the bar, not one you walk into" printed
      // directly above "her whole evening visibly reorganises itself around
      // your arrival — the kept seat" (Howard, round 35). A regular-or-better
      // is not furniture for the anonymous lifer to be draped with.
      const _mine = id => _knownTier(id) >= 2;
      const _talking = (_convoActive()) || G.convo;   // not beside him at the far end while she talks to you (Waen, Ingrid round 103)
      const girl = (typeof busyId === "string" && _npcsHere().includes(busyId) && !_descHas(busyId) && !_mine(busyId) && busyId !== _talking)
        ? busyId
        : _npcsHere().find(id => NPC_ROLES[id] === "hostess" &&
            id !== _talking && !_descHas(id) && !_mine(id));
      const g = girl ? `, ${NPCS[girl].name} laughing on cue beside him` : "";
      const _gg = _isGogo();
      if (girl) _say(_pickVary(_gg ? _BAR_REGULAR_GOGO_BUSY : _BAR_REGULAR_BUSY, "barReg")(g), "dim");
      else _say(_pickVary(_gg ? _BAR_REGULAR_GOGO : _BAR_REGULAR, "barReg"), "dim");
    } else if (!_railCrowd.length) {
      // THE ANONYMOUS BAR-BORE IS FOR A ROOM WITH NOBODY IN IT. Printed at the
      // Queen Vic — "a knot of regulars welded to the bar… part of the furniture,
      // not the cast" — while Doyle, Terry, Mort and Angela sat named on the
      // Here: line and every one of them talks. A persona who had come to this
      // town specifically for the company read it as the game telling him the
      // blokes he came for weren't worth crossing the floor to meet (round 22).
      // Real people outrank furniture; if the rail has names, say nothing.
      _say(_pickVary(_isGogo() ? _BAR_REGULAR_GOGO : _BAR_REGULAR, "barReg"), "dim");
    }
  }
  // The two junction bars look out on the evening's two free shows: the police
  // checkpoint down the road just south of the soi, and the bay sunset.
  if ((G.room === "blue_dog" || G.room === "stinky_bar") && _shakedownOn()) {
    _say("Down the road, just south of the soi, the evening checkpoint is in session: " +
      "officers waving over every bare-headed farang on a motorbike with the bored " +
      "precision of toll collectors. Half the rail is a regular who ducked in here to " +
      "dodge exactly that." + (G.rain > 0 ? " (WATCH POLICE.)" : " (WATCH POLICE — or WATCH SUNSET, the bay's going gold too.)"), "dim");
  }
  if (G.soc.lockIn && G.soc.lockIn[G.room]) {
    _say("The front door is bolted and the windows were always black. Inside is " +
      "the only place the night still exists, and it is making the most of the " +
      "fact. (OUT gets you unbolted — one way.)", "dim");
  }
  if (G.room === "police_station" && G.tonicOwed > 0) {
    _say(`You are still out ฿${_num(G.tonicOwed)} to the hair-tonic shop. (REPORT it here — ` +
      "for what that's worth.)", "dim");
  }
  if (G.room === "police_station" && G.curseOwed > 0) {
    _say(`You are still out ฿${_num(G.curseOwed)} to the beach fortune-teller. (REPORT it ` +
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
// ── Districts, and the distance between them ────────────────────────────────
// A district is a room's `region`; two districts touch when any exit joins
// them. Derived from ROOMS once (pure, no dice), so a new road changes the
// answer with no new code. _districtHops is the BFS distance — 0 same, 1
// adjacent — and is what a motosai ride's length reads (Mario, 2026-09-03: a
// bike was one turn regardless of distance, which made it strictly dominant;
// same or adjacent district stays one turn, every district beyond that is at
// least one more).
let _districtAdj = null;
function _districtHops(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 0;
  _districtBuild();
  const path = _districtPath(a, b);
  if (!path) return 3; // unconnected on the map: call it a long way
  // a long district costs its own turn when you ride THROUGH it (LONG_DISTRICTS)
  const long = typeof LONG_DISTRICTS !== "undefined" ? LONG_DISTRICTS : {};
  let d = path.length - 1;
  for (let i = 1; i < path.length - 1; i++) d += long[path[i]] || 0;
  return d;
}
// A once-a-night downpour that always won its first roll opened EVERY September
// night at six and pinned a man on the hotel soi (Graham, round 47). The night's
// earliest cloudburst is a day-stable hash: some nights it comes at seven, some
// at one, some it never gets round to it.
// on the back of her bike, between stops: the room you left is not the room you are in
function _onRide() { return G.pendingEnc === "nightride" || !!G.rideSeq; }
function _rainEarliest() { return _hh("rainstart:" + G.day + ":" + G.vacation + ":x", 41) % 70; }   // day MID-key: a trailing day clustered the first downpour at half past six five nights of seven (Ingrid, round 62)
function _districtBuild() {
  if (!_districtAdj) {
    _districtAdj = {};
    for (const r of Object.values(ROOMS)) for (const to of Object.values(r.exits || {})) {
      const x = r.region, y = ROOMS[to] && ROOMS[to].region;
      if (!x || !y || x === y) continue;
      (_districtAdj[x] = _districtAdj[x] || new Set()).add(y);
      (_districtAdj[y] = _districtAdj[y] || new Set()).add(x);
    }
  }
}
// The districts a ride passes through, start and end inclusive — the fewest
// crossings; null when the map doesn't join them. Pure, no dice.
function _districtPath(a, b) {
  if (!a || !b) return null;
  if (a === b) return [a];
  _districtBuild();
  const prev = { [a]: null }; let q = [a];
  while (q.length) {
    const x = q.shift();
    for (const y of _districtAdj[x] || []) {
      if (y in prev) continue;
      prev[y] = x;
      if (y === b) { const out = [b]; let c = b; while (prev[c]) { c = prev[c]; out.unshift(c); } return out; }
      q.push(y);
    }
  }
  return null;
}
// A PAID STRETCH OF TIME THAT WOULD RUN INTO THE DAWN is refused before the money moves (review 2026-10-25: a massage
// bought minutes before six took the money and ended the night without the hour)
function _tooLateFor(turns, what) {
  if (G.nightTurn + turns < NIGHT_TURNS) return false;
  _say(`(${what || "That"} takes longer than the night has left — it is nearly six. Nothing is charged.)`, "dim");
  return true;
}
function _passTime(n) {
  const startDay = G.day, g0 = G;
  for (let i = 0; i < n; i++) {
    _tick();
    if (G !== g0 || G.day !== startDay || G.pendingChoice === "vacation_end") return true;   // _act1Fail swaps in a fresh G on the same day number (review 2026-10-25)
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
  _ccibLoud("incident");   // an incident is attention, and attention is the one thing a watched man cannot afford
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
  _questTick();
  G.turns++;
  G.nightTurn++;
  // a torch still burning in a go-go escalates; `mark` spends this command's
  // entry/toggle warning so one command never counts twice
  if (G.lightWarn.mark) G.lightWarn.mark = false;
  else if (G.lightOn && G.battery > 0 && _room().barType === "gogo") _gogoLightWarn();
  // the body keeps its own books
  // one unit per twenty turns from the first drink of the night — it used to fire on
  // the wall clock's multiples of twenty, so a beer bought at 23:54 was gone by
  // midnight and one bought at 00:06 lasted two hours (Marek, round 53). The clock
  // starts when the meter leaves zero and is NOT reset by the next drink, or a
  // steady drinker would never sober.
  if (G.soc.drunk > 0) {
    if (G.soc.soberNext == null) G.soc.soberNext = G.nightTurn + 20;
    if (G.nightTurn >= G.soc.soberNext) { G.soc.drunk--; G.soc.soberNext = G.nightTurn + 20; }
  } else G.soc.soberNext = null;
  if (G.nightTurn % 3 === 0) G.hunger++;
  if (G.nightTurn % 2 === 0) G.thirst++;
  // latched threshold warnings: hunger/thirst only tick up every 2-3 turns, so an
  // `=== 70` check fired 2-3× while the meter dwelt on the value. Fire once on the
  // crossing, re-arm only after the meter drops back below (eat/drink and re-cross).
  G.warned = G.warned || {};
  const _warn = (k, on, m) => { if (on) { if (!G.warned[k]) { _say(m, "alert"); G.warned[k] = true; } } else G.warned[k] = false; };
  _warn("h70", G.hunger >= 70 && G.hunger < 90, "(Your stomach growls loudly enough to turn heads. Eat something.)");
  // in your own hotel room the fix is on the tray — say so, or a rain-pinned
  // resident dies of thirst beside the kettle (Frank, 2026-08-26)
  const _inOwnRoom = G.room === _hotelRoomId() && (G.roomWater || 0) < 2;
  _warn("t70", G.thirst >= 70 && G.thirst < 90, _inOwnRoom
    ? "(Your throat is sandpaper — and the two complimentary bottles are right there by the kettle. DRINK WATER.)"
    : "(Your throat is sandpaper. Drink something — ideally water.)");
  _warn("h90", G.hunger >= 90, "(You are running on fumes. Food. Now.)");
  _warn("t90", G.thirst >= 90, _inOwnRoom
    ? "(Dizzy. The neon is doing things it shouldn't. The house bottles are on the tray — DRINK WATER.)"
    : "(Dizzy. The neon is doing things it shouldn't. WATER.)");
  if ((G.hunger >= 80 || G.thirst >= 80) && G.nightTurn % 10 === 0) {
    _addHappy(-1, G.thirst >= G.hunger ? "you're parched" : "you're starving");
  }
  _tanRescue();   // the fixer finds a lost first-timer
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
      // after the shutters there is no music to come back up (Callum, round 89, on the shut West End at 02:20)
      const _shut = G.nightTurn >= _lateTurn(G.room) && !(ROOMS[G.room] && ROOMS[G.room].barType && !(_shutHere()));
      _say(_shut ? "The rain stops the way it started — all at once, like a tap. The shut fronts drip, the street " +
        "steams under the lights that are left, and the town goes back to being asleep."
        : "The rain stops the way it started — all at once, like a tap. The " +
        "street steams, the music comes back up to volume, and the town picks " +
        "up exactly where it left off.", "alert");
    }
  // No downpours during the opening race: a September start ate eighteen of
  // the hundred turns in four blocked-move downpours and the do-or-die night was
  // lost to weather nobody chose (Darren, round 37). Drizzle still prints.
  // ONE DOWNPOUR A NIGHT (Mario, 2026-09-14). Thirteen in five nights, each
  // pinning the player three to six turns, cost Colm a quiz, a bed and a mall by
  // three turns — "wet season done honestly; plays as a random five-turn stun
  // every twenty turns". The 30-turn cooldown stays for the drizzle beneath it;
  // the downpour itself checks G.rainDay BEFORE the dice so a second roll on the
  // same night burns nothing.
  } else if (_flag("act1Done") && G.rainDay !== G.day && G.nightTurn >= _rainEarliest() && _wxStormy() && G.turns - G.lastRain >= 30 && _rand() < 0.08) {
    _startRain(3 + Math.floor(_rand() * 6));
  } else if (_flag("act1Done") && G.rainDay !== G.day && G.nightTurn >= _rainEarliest() && _wetSeason() && _wxRainy() && G.turns - G.lastRain >= 30 && _rand() < 0.11) {
    // the monsoon-months amplifier: a rainy (not stormy) sky becomes a downpour
    _startRain(3 + Math.floor(_rand() * 6));
  } else if (_wxRainy() && G.turns - G.lastDrizzle >= 15 && G.turns - (G.lastRain || -99) >= 20 && _rand() < (_wetSeason() ? 0.10 : 0.05)) {   // not straight after a downpour: "the rain is doing all the talking" seven turns after it stopped (Kevin, round 84)
    G.lastDrizzle = G.turns; // light rain: atmosphere only, never mechanics
    if (!_onRide()) _sayDrizzle();   // the bar you rode away from does not narrate its gutter (Kenji, round 47)
  }
  // the peddlers work the Beach Road bars, stool to stool — but a bar gets a
  // couple of passes a night, not six (Frank, 2026-08-26: 4–6 identical visits
  // in one long evening on one stool)
  if (!G.game && !G.pendingEnc && _inBar() && _room().region === "Beach Road" &&
      // not on the back of her bike (Desmond, round 63)
      G.turns - G.lastPeddler >= 20 && !(_onRide()) && (G.peddlerNight || 0) < (_atOwnBar() ? (G.day % 2 ? 1 : 0) : 2) && _rand() < 0.12) {   // your own rail every other night, not every night (Hal, round 62)   // he works YOUR rail once a night, not twice — thirty shifts of it (Keith, round 40)
    G.lastPeddler = G.turns;
    G.peddlerNight = (G.peddlerNight || 0) + 1;
    G.pendingEnc = "peddler";
    _encPrompt(
      [_pickVary(_PEDDLER_PITCH, "peddlerPitch"), "alert"],
      ["(WATCH ฿300 · SUNGLASSES ฿150 · VITAMINS ฿200 · or NO.)", "dim"]);
  }
  // the ซาเล้ง (mobile bar cart) — a fixture for the girls, not a modal gate:
  // it parks at the bar for a while, the girls swarm it, and the player may buy
  // any time before it moves on. All of that lives in _salengTick (encounters).
  if (!_onRide()) _salengTick();
  if (!_onRide()) _thaiOverheard();
  // her bike is not your stool: six minutes at the Mooring and a night ride read as
  // "three hours on the same stool" (Dieter, round 56)
  if ((_inBar() || (G.room === "mikes_mall" && NPCS.wilf && NPCS.wilf.room === G.room)) && !(_onRide())) (G.soc.barTurns = G.soc.barTurns || {})[G.room] = ((G.soc.barTurns || {})[G.room] || 0) + 1;   // Wilf's food court is his local: an evening at his table is a night he saw you (Ruth, round 105)   // presence, for the regular's bond (Trevor, round 39)
  // the house's patience clock (_nursed): money spent in this bar since last tick,
  // or a fresh arrival, resets it — one hook, every till (Mario, 2026-09-04)
  if (_inBar() && (G.room !== G.soc.tickRoom || G.money < (G.soc.moneyTick == null ? G.money : G.soc.moneyTick)))
    (G.soc.spentTurn = G.soc.spentTurn || {})[G.room] = G.turns;
  G.soc.moneyTick = G.money; G.soc.tickRoom = G.room;
  if (!_onRide()) _railTick();
  _tanWalkTick();   // Tan on his round: said when he comes or goes from where you stand
  _streamTick();   // the group's cameras at work (2026-10-22)     // the hour turns and somebody drains a glass and moves on
  _nokLeavesTick();
  _flowerTick(); // open-air-bar flower seller (once/night, when courting a girl)
  _closingTick(); // midnight: gents/Soi 6/Darkside give last call, then bolt or shutter
  _lockInTick(); // …and behind a bolted door, the night has an interior
  // Quiz capture was only checked on ARRIVAL, so the obvious punter move —
  // settle in early with a pint — missed the quiz entirely even after TIME
  // advertised it (Gaz playtest, 2026-08-17). If the window opens while you're
  // already sitting in a quiz bar, the microphone finds you at your stool.
  if (!G.game && !G.pendingEnc && !G.pendingChoice && _quizHere()) {
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
    if (_affairSceneDue()) { _affairDiscoverScene(); return; }
    if (_ccibDue()) { _ccibVisit(); return; }
    if (_tanFavourDue()) { _tanFavour(); return; }
    if (_acctDue()) { _acctCall(); return; }
    if (_keptNewsDue()) { _keptNews(); return; }
    if (_keptDue()) { _keptAsk(); return; }
    if (_shiftDue()) { _shiftAsk(); return; }
    if (_synDue()) { _synAsk(); return; }
    // the staff affair: the she-stays-after-close beat, then its crises
    if (typeof _affairDue === "function") {
      const _aw = _affairDue();
      if (_aw) { _affairAsk(_aw); return; }
      const _ac = _affairCrisisDue();
      if (_ac) { _affairCrisisAsk(_ac); return; }
    }
  }
  _workPresenceTick(); // a declared shift has to be stood
  _jobCounselTick();   // the mama's word about the girls, said at his own bar (2026-10-24)
  if (G.job && G.job.kind === "manager" && G.job.shiftDay === G.day && G.room === G.job.room) {   // a manager's shift is stood the same way
    G.job.shiftStood = (G.job.shiftStood || 0) + 1; G.job.shiftLast = G.nightTurn;   // when he was last on it: the shutter is the man who was there at close (Tomás, round 103)
    if (G.job.shiftStood === 1 || G.job.shiftStood % 10 === 0) for (const id of (typeof _staffAt === "function" ? _staffAt(G.room) : [])) (G.seenDay = G.seenDay || {})[id] = G.day;   // the floor saw you (Dougal: "10 night you no come" to the man on its rail)
  }
  _workFloor();          // …and a stood shift is where your own staff live
  if (!_onRide()) _lastBusWarn();  // ~01:30: heads-up that the last ฿15 ride home is about to leave
  _maybeIncomingText();
  _dailyJoke();   // the unknown number keeps its own hour, not your first step outside
  _wrongNumberTick(); // CTF stage 2 (docs/ctf.md), only if a probe armed it
  _soidogTick();   // the day after you adopt the soi dog, the Foundation texts for a donation
  _waenTick();
  _tanNoteTick();   // Kruu Waen's homework, free, once a day
  _boxTick();      // Rabbit's box, while it's live and you're in the office
  _ccibLowTick();  // the lay-low window: a second look, and the day it lifts
  _kidTick();          // the kid's offscreen run lands as a text the next day
  _kyleTick();        // …and Kyle carries the ice on a later night than the vouch
  if (G.lightOn && G.battery > 0) {
    G.battery--;
    if (G.battery === 0) {
      G.lightOn = false;
      _say("Your phone gives a final apologetic buzz and dies. The flashlight is gone.", "alert");
    } else if (G.battery === 5) {
      _say("(Phone battery: 5%. This is fine.)", "alert");
    }
  }
  // ...and they are not your problem at all while you are OFFSTAGE — away from
  // this room for the duration of a scene (an hour on a short time, four minutes
  // round the corner at Mot's cart). The saleng and the last-call tick already
  // honour the flag; the dark street did not, so a boy walking you to chicken and
  // rice ended with a dog lunging out of the black at you (round 22).
  if (_isDarkHere() && !G.rain && !G.offstage) { // even the soi dogs go to ground in a downpour
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
          (bitten ? `฿${_num(bitten)} in dropped coins` : "what remains of your dignity") +
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


// The two drink prices, by venue class. The constants stay the BASE (a beer bar
// is ×1), so every existing quote reads the same in the bars the game was
// balanced in, and the chrome costs what chrome costs. Both round to ฿10 —
// nobody on this soi quotes ฿87.
function _drinkMult(room) {
  const r = ROOMS[room || G.room];
  // A venue can sell drinks without being a bar-girl bar: the cabaret and the
  // host club carry `drinks: <class>` instead of a barType, precisely so none
  // of the go-go apparatus (barfine, lady drinks, mamasan) reaches them.
  const t = r && (r.barType || r.drinks);
  const base = (typeof DRINK_MULT !== "undefined" && DRINK_MULT[t]) || 1;
  return base * (typeof _barMarkup === "function" ? _barMarkup(room || G.room) : 1);   // the owner's own board (the bar-failure cycle)
}
// `beerOff` is a room's authored discount — "the beer is ten baht cheaper than
// town" was a claim two rooms made in their own prose while the till charged
// town money (Gerry r34, Stan r35). Honored here rather than reworded: the
// claim is the character of the place.
function _beerPrice(room) {
  const r = (typeof ROOMS !== "undefined" && ROOMS[room || G.room]) || {};
  // …and Cloze's board: get tonight's word right and the drinks are half price
  // in here until dawn (the sign says the rule is enforced; now it is)
  const half = (room || G.room) === "cloze" && G.boardWon === G.day ? 0.5 : 1;
  // a venue whose beer is priced apart from its lady drinks (Soi 6: the receipts ring a beer at 140 against a 210 lady drink)
  const t = r.barType || r.drinks, bm = typeof BEER_MULT !== "undefined" && BEER_MULT[t] ? BEER_MULT[t] / ((typeof DRINK_MULT !== "undefined" && DRINK_MULT[t]) || 1) : 1;
  return Math.max(10, Math.round(BEER_PRICE * _drinkMult(room) * bm * half / 10) * 10 - (r.beerOff || 0));
}
// WATER IN A BAR COSTS THE CHEAPEST THING WITH ALCOHOL IN IT — you pay for the seat, not the bottle
// (Mario, 2026-10-27). That is the beer everywhere but the Moonshine Bar, whose house shot is cheaper.
function _waterPrice(room) {
  const r = room || G.room;
  return Math.min(_beerPrice(r), r === "moonshine_bar" ? YA_DONG_SHOT : Infinity);
}
function _ladyPrice(room) { return Math.round(LADY_DRINK * _drinkMult(room) / 10) * 10; }
// THE BELL IS A ROUND FOR EVERYONE IN THE ROOM, priced per head (Mario, 2026-10-10, on Ray: a
// flat ฿300–380 "bought the whole bar a round" at Kitten Corner, five girls and the mamasan at
// ฿190 a lady drink — his mates would ring it on turn one). Every working woman present is a lady
// drink, every man and every woman on the customer side of the rail is a beer, and the punters the
// room has but the cast does not name are counted by a pure hash of (room, day, hour), thinner in
// the wet — no dice, so quoting it moves nothing. BELL_PRICE is the floor: an empty bar's round.
const _BELL_CROWD = { beer: 3, soi6: 3, gents: 3, pub: 6, gogo: 8, club: 10, host: 3 };
function _bellHeads(room) {
  const to = room || G.room;
  const r = ROOMS[to] || {};
  const party = (G.party && G.party.ids) || [];
  const here = Object.keys(NPCS).filter(id => _npcWhere(id) === to || (to === G.room && party.includes(id)));
  const women = here.filter(id => NPC_ROLES[id] && !party.includes(id)).length + party.filter(id => to === G.room).length;
  const named = here.length - women;
  const base = _BELL_CROWD[r.barType || r.drinks] || 3;
  let anon = Math.floor(base / 2) + _hh(to + ":" + G.day + ":" + Math.floor((G.nightTurn || 0) / 10) + ":crowd", 7) % (base + 1);
  if (_lowSeason()) anon = Math.floor(anon * 0.6);
  return { women, men: named + Math.max(0, anon - named) };
}
function _bellPrice(room) {
  const h = _bellHeads(room);
  const n = h.women * _ladyPrice(room) + h.men * _beerPrice(room);
  return Math.max(BELL_PRICE, Math.round(n / 10) * 10);
}

// WHO RUNS THE MONEY HERE. Not every bar has a cashier: a big go-go splits the
// jobs, but on a small bar the owner IS the mamasan IS the cashier — one woman
// who has to be there every single night, unless she has a girl she trusts
// enough to leave the till with (very often a relative). That is the real shape
// of the trade and the doc used to claim the opposite — "every hostess venue
// gets exactly one mamasan and one cashier" — which made 33 of 87 bars read as
// broken data when they were simply small (Mario, correcting round 34).
//
// So: the cashier if the bar employs one, else the mamasan, who is doing both
// jobs and should be written as doing both jobs.
function _staffAt(room) {
  const to = room || G.room;
  // A girl you have taken out is not WORKING, wherever the two of you are.
  // _npcRoom deliberately puts a companion at your side so every targeted verb
  // reaches her — which meant she also read as staff of whatever bar you walked
  // her into, and as still on the rota at her own (round 43 barfine audit). She
  // is present; she is not on shift.
  const party = (G.party && G.party.ids) || [];
  return Object.keys(NPCS).filter(id => !party.includes(id) && _npcActive(id) && _npcRoom(id) === to);
}
function _tillKeeper(room) {
  const here = _staffAt(room);
  return here.find(n => NPC_ROLES[n] === "cashier") ||
    here.find(n => NPC_ROLES[n] === "mamasan") ||
    // …and the second half of the same canon: "unless she has a girl she can
    // depend on while she is away, often a relative". An owner who works three
    // bars in rotation is AT one of them tonight, so on the other two nobody
    // held the money at all — which is not a data gap (they have an owner), it
    // is the cover girl the fiction never named. The longest-serving girl
    // present is minding it: day-stable, no dice, and nobody new is invented.
    _coverGirl(room);
}
// Who is on the till while the owner is at another of her bars. Null when the
// owner is here, or when there is nobody to leave it with.
function _coverGirl(room) {
  const to = room || G.room;
  const here = _staffAt(to);
  if (here.some(n => NPC_ROLES[n] === "cashier" || NPC_ROLES[n] === "mamasan")) return null;
  const owned = Object.keys(NPCS).some(n =>
    (NPC_ROLES[n] === "mamasan" || NPC_ROLES[n] === "cashier") &&
    Array.isArray(NPCS[n].bars) && NPCS[n].bars.includes(to));
  const girls = here.filter(n => NPC_ROLES[n] === "hostess");
  if (!girls.length) return null;
  // an away owner leaves it with somebody; a bar that never had one is small
  // enough that the woman working it IS the one who takes your money
  if (!owned && girls.length > 1) return null;
  return girls[_hh(to + ":till", 29) % girls.length];
}
// The owner of a rotating bar, wherever she is tonight — so the cover can name her.
function _barOwner(room) {
  const to = room || G.room;
  return Object.keys(NPCS).find(n =>
    (NPC_ROLES[n] === "mamasan" || NPC_ROLES[n] === "cashier") &&
    Array.isArray(NPCS[n].bars) && NPCS[n].bars.includes(to)) || null;
}
// …and true when she's doing the double shift, which is what earns the line.
function _soloMama(room) {
  const here = _staffAt(room);
  return !here.some(n => NPC_ROLES[n] === "cashier") &&
    here.some(n => NPC_ROLES[n] === "mamasan");
}
