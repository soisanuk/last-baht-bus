#!/usr/bin/env node
// Soak harness (docs/design-backlog.md §1): a seeded monte-carlo autoplayer over
// the vm-loaded engine. Finding is free (node); model tokens are for judging.
//
//   node tools/soak.mjs --nights 50 --seed 7 --mode vacation
//   node tools/soak.mjs --mode soi6 --nights 20 --transcript /tmp/soak.txt
//   node tools/soak.mjs --start pratumnak_clubs   # begin inside a blind spot
//
// Modes: vacation (sandbox past Act One, encounters LIVE) · soi6 (the challenge
// week, intro answered by policy) · expat (the endless stage; the only mode that
//   reaches the bar-owning chain) · act1 (the do-or-die opening; resets expected).
//
// Per-turn invariants (FAIL, exit 1): doCommand never throws; money/meters/day
// finite and in loose bounds (NaN and runaway catchers, not balance tuning);
// night always ends (soft-lock detector: forced WAITs must reach dawn — a world
// rebuild via RESTART/_act1Fail re-baselines the counters); the save is STABLE
// from the second round-trip (save-compat deliberately unions skeleton defaults
// in, so serialize∘deserialize is not identity — but must be idempotent after).
//
// COVERAGE IS REPORTED BECAUSE IT IS LOW, and "failures 0" reads like a
// stronger claim than it is. One six-night run stands in 11-16% of the rooms;
// the union of 32 runs across all four modes reaches 68%, leaving 74 rooms no
// soak has ever entered. The blind spot has two shapes: outlying districts the
// walker's centre of gravity never reaches (Pratumnak, Tree Town, Myth Night,
// the Darkside), and VENUES — 52 of those 74 are rooms you have to go inside,
// so even on a street the walker walks, it stays on the street.
//
// Deliberately NOT fixed by making the walker explore harder. Every de ceiling
// in tests/js/soak.test.js is calibrated against the current movement policy,
// so changing it would re-roll all four and destroy the one measurement that
// tracks the German gap. The honest move is to print the number and let a
// reader discount the result accordingly.
//
// Debugging a finding: SOAK_TRACE=1 prints each command pre/post; SOAK_PIN=<file>
// persists {phase, cmd, save} before every step, so a kill -9 mid-hang leaves a
// perfect synchronous repro (deserialize the save, run the cmd). stats.slow
// collects any command over 250ms. First catches (2026-08): the Act One
// WAIT-across-dawn infinite loop, and KISS's dead 'BIG BEER' tap.
//
// Heuristics (WARN, reported not fatal): the HINT-TAP — every parenthesized
// CAPS command the game prints (the decorate() tap idiom) is preferentially
// played back while still in that room; a "didn't understand" reply flags an
// undelivered promise. In soi6 mode, printed off-pocket place names flag too.
//
// Policy: same seed → same run (policy has its own LCG; G.rng is seeded from
// the same base), so every finding is a replayable repro.

import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ── engine load (probe.mjs pattern: import.meta-relative, cwd-proof) ─────────
if (typeof globalThis.newGame === "undefined") {
  const JS = new URL("../web/js/", import.meta.url);
  for (const f of ["thai", "world", "games", "cli-sim", "lang", "engine-core", "engine-encounters",
    "engine-play", "engine-systems", "engine-parser"])
    vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });
}

// ── policy PRNG (separate from G.rng so peeking never burns game dice) ───────
let _pseed = 1;
const prand = () => (_pseed = (_pseed * 48271) % 2147483647) / 2147483647;
const pick = arr => arr[Math.floor(prand() * arr.length)];

// ── hint extraction: the decorate() cmd idiom, approximated ──────────────────
// ALL-CAPS runs inside literal parens are tappable commands; <placeholders>
// fold into an open prefill; [x] tails drop. "·" and "/" separate options.
function extractHints(line) {
  const hints = [];
  for (const m of String(line).matchAll(/\(([^()]+)\)/g)) {
    for (let part of m[1].split(/[·/]/)) {
      part = part.replace(/\[[^\]]*\]/g, " ").trim();
      const cut = part.indexOf("<");
      const openEnded = cut >= 0;
      if (openEnded) part = part.slice(0, cut);
      const toks = [];
      for (const t of part.trim().split(/\s+/)) {
        if (/^[A-Z0-9''&-]+[,.!?]?$/.test(t) && /[A-Z]/.test(t)) toks.push(t.replace(/[,.!?]$/, ""));
        else break;
      }
      if (!toks.length) continue;
      const cmd = toks.join(" ").toLowerCase();
      if (cmd.length < 2 || /^(ok|a|i)$/.test(cmd)) continue;
      hints.push(openEnded || /\s(to|for)$/.test(cmd) ? cmd + " " : cmd);
    }
  }
  return hints;
}

// resolve a prefill ("ride bus to ") with engineComplete's own candidates
function resolvePrefill(cmd) {
  for (let i = 0; i < 2 && cmd.endsWith(" "); i++) {
    let cands = [];
    try { cands = engineComplete(cmd) || []; } catch (e) { return null; }
    if (!cands.length) return null;
    cmd = cmd + pick(cands);
    try { if ((engineComplete(cmd + " ") || []).length && prand() < 0.3) cmd += " "; } catch (e) {}
  }
  return cmd.trim() ? cmd.trim() : null;
}

const WILD_STATIC = ["look", "wait 3", "time", "inventory", "diagnose", "smell", "listen",
  "buy beer", "buy water", "dance", "sing", "eat", "drink", "hint", "quests", "score",
  "check messages", "map", "cheers"];

// The walker's vocabulary must come from the ENGINE, not from the list above.
// Measured 2026-08-23 (docs/testing-gap-analysis.md §2.3): WILD_STATIC is 19
// hand-written strings against a parser that switches on 322 verbs, so 94% of
// the verb surface was never typed. WORK was one of them — across four seeds
// and 2,592 expat commands the walker stood in the player's own bar constantly
// and never once typed it, which is how a mechanic that did nothing for 65
// nights survived every soak ever run. A hand-written pool encodes the same
// mental model as the code it is meant to test.
//
// The source is engineComplete — the engine's OWN autocomplete, the same
// surface the keyboard offers a player, so it grows with the game for free.
// It caps at 8 candidates per prefix, so a capped letter is expanded a second
// level ("w" is full, so "wa".."wz" are asked too) or verbs past the cap stay
// invisible — which is exactly how `work` hid behind `watch`/`weather`/`wave`.
const _AZ = "abcdefghijklmnopqrstuvwxyz".split("");
function engineVocab() {
  const set = new Set();
  try {
    for (const ch of _AZ) {
      const c = engineComplete(ch) || [];
      for (const x of c) set.add(x);
      if (c.length >= 8) for (const ch2 of _AZ)
        for (const x of (engineComplete(ch + ch2) || [])) set.add(x);
    }
  } catch (e) { /* vocabulary must never kill the run */ }
  // destructive/meta verbs would end or reset the run rather than exercise it
  for (const v of [...set])
    if (/^(restart|reset|quit|end|logout|undo|handover|resume|unsubscribe|toggle|load)\b/.test(v)) set.delete(v);
  return [...set];
}

// Coverage-guided, for the same reason coverage-guided fuzzing beats the dumb
// kind: uniform sampling over ~113 verbs needs thousands of commands to reach
// any particular one, which is no better than the hand list for a short run.
// Preferring verbs this run hasn't issued yet turns "eventually" into "this run".
let _triedVerbs = new Set();
const ENGINE_VERB_RATE = 0.18;
function engineVerbPick() {
  const vocab = engineVocab();
  if (!vocab.length) return null;
  // Recycle once most of the vocabulary has been seen: a verb only exercises its
  // mechanic in the right ROOM (WORK on the beach is a voiced refusal, not a
  // shift), so one pass over the verb list is not one pass over the game. Each
  // recycle re-explores from wherever the walk has since wandered.
  if (_triedVerbs.size >= vocab.length * 0.7) _triedVerbs.clear();
  const fresh = vocab.filter(v => !_triedVerbs.has(v));
  const v = pick(fresh.length ? fresh : vocab);
  _triedVerbs.add(v);
  return v;
}

function wildPool() {
  const pool = [...WILD_STATIC];
  try {
    const r = ROOMS[G.room] || {};
    for (const d of Object.keys(r.exits || {})) pool.push("go " + d);
    const here = _npcsHere();
    for (const id of here.slice(0, 3)) {
      const n = NPCS[id].name.toLowerCase();
      pool.push("talk to " + n, "buy drink for " + n, "flirt with " + n);
      if (prand() < 0.3) pool.push("tip " + n + " 100", "barfine " + n, "photo " + n);
      // the talk-acts (player + NPC personality tilts both live here)
      if (prand() < 0.3) pool.push("compliment " + n, "tease " + n, "joke");
    }
    // the phone: messages, transfers, and the fixer's any-hour promise
    const contacts = Object.keys((G.phone && G.phone.contacts) || {}).filter(c => G.phone.contacts[c]);
    if (contacts.length && prand() < 0.4) {
      const c = NPCS[contacts[Math.floor(prand() * contacts.length)]];
      if (c) {
        const cn = c.name.toLowerCase();
        pool.push("message " + cn, "send 100 to " + cn, "call " + cn);
      }
    }
    if (r.barType) pool.push("ring bell", "play connect 4", "play jackpot");
    if (r.atm) pool.push("withdraw 1000", "check balance");
    if (r.busStop) pool.push("ride bus to ");
    if (r.seven) pool.push("buy toastie");
    const home = Object.values(_HOTELS).some(h => h.room === G.room);
    if (home) pool.push("sleep", "watch tv");
    const visited = Object.keys(G.visited || {});
    if (visited.length && prand() < 0.4) {
      const v = ROOMS[pick(visited)];
      if (v && v.bar) pool.push("travel " + v.bar.toLowerCase());
    }
  } catch (e) { /* pool building must never kill the run */ }
  return pool;
}

// ── The liveness ledger ──────────────────────────────────────────────────────
// Every invariant this harness had was a SAFETY property — "nothing bad
// happens": no throw, no NaN, no negative money, no soft-lock, no wedged modal.
// Not one was a LIVENESS property — "something good happens" (Lamport, 1977).
// Class-B defects (docs/playtest-findings-analysis.md) are liveness failures by
// definition: WORK computing nothing for 65 nights, the room safe never paying,
// the procurement beat never firing. A suite of safety assertions cannot express
// the sentence that would have caught any of them.
//
// So: name the effects that ought to occur, count how often each actually does,
// and report the ZEROES. A zero is either dead content or a bug, and the harness
// deliberately does not try to tell you which — a human reads the list in
// seconds, which is the whole point. `modes` says where an effect is REACHABLE;
// outside those it is not expected and not reported as missing.
//
// Predicates read a flat snapshot of G taken before and after each command, so
// they observe the world rather than the implementation — `bar.night.worked`
// reads `away`, which reset to 0 only on a worked night both before and after
// the fix, and so would have gone to zero while the bug was live.
function liveSnap() {
  const b = G.bar || {}, soc = G.soc || {}, ph = G.phone || {};
  const drinks = soc.drinks || {};
  return {
    day: G.day, money: G.money, happy: G.happy, room: G.room,
    barNights: b.nights || 0, barAway: b.away || 0, barWorked: b.worked || 0,
    barLapses: b.lapses || 0,
    barMonths: b.months || 0, barCash: b.cash || 0,
    barRentOwed: b.rentOwed || 0, barLost: !!(G.flags && G.flags.barLost),
    barFloor: b.floorN || 0, barShiftAsked: !!b.shiftAsked,
    synAsked: Object.keys((G.syn && G.syn.asked) || {}).length,
    synDone: Object.keys((G.syn && G.syn.done) || {}).length,
    affairLive: !!(G.affair && !G.affair.ended),
    affairEnded: !!(G.affair && G.affair.ended),
    questsDone: Object.values(G.quests || {}).filter(q => q === "done").length,
    questsActive: Object.values(G.quests || {}).filter(q => q === "active").length,
    bondMax: Math.max(0, ...Object.values(drinks)),
    contacts: Object.keys(ph.contacts || {}).length,
    photos: (ph.photos || []).length,
    bells: Object.values(soc.bells || {}).reduce((a, n) => a + n, 0),
    nights: (G.nightLog || []).length,
    dog: G.dog ? 1 : 0, hurt: G.hurt || 0, rep: G.rep || 0, jaded: G.jaded || 0,
    tanAsked: !!(G.flags || {}).tanAsked,
    safeOpened: !!(G.flags || {}).roomSafeOpened,
    act1Done: !!(G.flags || {}).act1Done,
    barOpen: !!(G.flags || {}).barOpen,
  };
}

const ALL_MODES = ["act1", "vacation", "soi6", "expat"];
const SANDBOX = ["vacation", "soi6", "expat"];
// `why`, where present, is the reason this effect may legitimately read zero:
// either the random walker cannot produce the play that causes it, or the run is
// too short. Those are reported SEPARATELY from the ones with no excuse — a
// ledger whose zero-list is mostly known-benign trains the reader to skip it,
// which is the same rot the afford-audit's AFFORD_OK exists to prevent. An
// effect with no `why` that reads zero is a question somebody must answer.
const EFFECTS = [
  // the night, the body, the money
  // NB act1 is excluded: a night-end there is _act1Fail, which rebuilds the
  // world (nightLog wiped, day back to 2), so the effect is unobservable by
  // design rather than absent.
  { id: "night.ended",        modes: SANDBOX,   hit: (a, b) => b.nights > a.nights },
  { id: "money.spent",        modes: ALL_MODES, hit: (a, b) => b.money < a.money },
  { id: "happy.gained",       modes: ALL_MODES, hit: (a, b) => b.happy > a.happy },
  { id: "moved.room",         modes: ALL_MODES, hit: (a, b) => b.room !== a.room },
  // the social machine
  { id: "bell.rung",          modes: SANDBOX,   hit: (a, b) => b.bells > a.bells },
  { id: "bond.built",         modes: SANDBOX,   hit: (a, b) => b.bondMax > a.bondMax },
  { id: "bond.regular.tier",  modes: SANDBOX,   hit: (a, b) => a.bondMax < 7 && b.bondMax >= 7,
    why: "needs ~7 drinks concentrated on ONE girl; a random walk spreads them" },
  { id: "contact.swapped",    modes: SANDBOX,   hit: (a, b) => b.contacts > a.contacts },
  { id: "photo.taken",        modes: SANDBOX,   hit: (a, b) => b.photos > a.photos },
  { id: "reputation.moved",   modes: SANDBOX,   hit: (a, b) => b.rep !== a.rep },
  { id: "treadmill.jaded",    modes: SANDBOX,   hit: (a, b) => b.jaded > a.jaded,
    why: "needs a conquest, which needs a barfine the walker rarely completes" },
  // quests
  { id: "quest.accepted",     modes: SANDBOX,   hit: (a, b) => b.questsActive > a.questsActive },
  { id: "quest.completed",    modes: SANDBOX,   hit: (a, b) => b.questsDone > a.questsDone,
    why: "a dep chain needs talk-until-offered → ACCEPT → travel → a specific ASK (CLAUDE.md)" },
  // Act One's own payoff. act1 only — every other mode pre-sets the flag, so
  // there the effect cannot fire and its absence would mean nothing.
  { id: "act1.completed",     modes: ["act1"],  hit: (a, b) => !a.act1Done && b.act1Done,
    why: "the wallet quest is a specific chain of ASKs a random walk will not produce" },
  { id: "roomsafe.paid",      modes: ["act1"],  hit: (a, b) => !a.safeOpened && b.safeOpened,
    why: "gated behind completing Act One in-run" },
  // The expat endgame. barowner ONLY: the four dep-gated quests to owning a bar
  // are unclimbable by a random walk, so in plain expat these would read zero
  // for a reason that has nothing to do with whether they work.
  { id: "bar.night.settled",  modes: ["barowner"], hit: (a, b) => b.barNights > a.barNights },
  { id: "bar.night.worked",   modes: ["barowner"], hit: (a, b) => b.barNights > a.barNights && b.barAway === 0 },
  { id: "bar.shift.declared", modes: ["barowner"], hit: (a, b) => b.barWorked > a.barWorked },
  { id: "bar.floor.moment",   modes: ["barowner"], hit: (a, b) => b.barFloor > a.barFloor },
  { id: "bar.shift.called",   modes: ["barowner"], hit: (a, b) => !a.barShiftAsked && b.barShiftAsked },
  { id: "bar.shift.lapsed",   modes: ["barowner"], hit: (a, b) => b.barLapses > a.barLapses,
    why: "a shift declared and then not stood — correct behaviour, and the reason " +
      "declared and worked are allowed to differ" },
  { id: "bar.month.paid",     modes: ["barowner"], hit: (a, b) => b.barMonths > a.barMonths,
    why: "the old man is paid every 30 days; a short run never reaches one" },
  { id: "bar.rent.missed",    modes: ["barowner"], hit: (a, b) => b.barRentOwed > a.barRentOwed,
    why: "the rent lands on the same 30-day cycle, and only bites a bar nobody stands in" },
  { id: "bar.lost",           modes: ["barowner"], hit: (a, b) => !a.barLost && b.barLost,
    why: "two missed rents or three missed notes — many months of neglect, not a short run" },
  { id: "tan.favour.asked",   modes: ["barowner"], hit: (a, b) => !a.tanAsked && b.tanAsked },
  { id: "affair.begun",       modes: ["barowner"], hit: (a, b) => !a.affairLive && b.affairLive,
    why: "the door needs her-farang tier (13+ drinks) with your OWN staff plus a stood " +
      "shift to last call — courtship a random walk cannot produce (tested in barchain)" },
  { id: "affair.ended",       modes: ["barowner"], hit: (a, b) => !a.affairEnded && b.affairEnded,
    why: "an ending needs a beginning; see affair.begun" },
  { id: "procurement.asked",  modes: ["barowner"], hit: (a, b) => b.synAsked > a.synAsked },
];
const EFFECT_WHY = new Map(EFFECTS.filter(e => e.why).map(e => [e.id, e.why]));

const modalActive = () =>
  !!(G.pendingChoice || G.pendingEnc || G.game || G.pendingBf || G.pendingSoapy || G.pendingFare);

function modalPool() {
  const pool = [];
  try { for (const c of _chipSet()) pool.push(c.cmd); } catch (e) {}
  if (G.pendingFare) pool.push("pay " + G.pendingFare.price);
  if (!pool.length) pool.push("yes", "no", "1", "2", "3", "quit", "leave", "pay");
  return pool;
}

// deep-equal for the save round-trip (order-insensitive via parsed objects)
function deepEq(a, b, path = "") {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null) return path + ": " + JSON.stringify(a) + " != " + JSON.stringify(b);
  if (typeof a !== "object") return Object.is(a, b) ? null : path + ": " + a + " != " + b;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = deepEq(a[k], b[k], path + "." + k);
    if (d) return d;
  }
  return null;
}

// ── language-leak heuristic (the de sweep) ───────────────────────────────────
// Deliberately English things: CAPS command tokens, paren hint groups, venue/brand
// names, Thai script + romanisations, ฿ amounts. Strip those, then vote with
// language-distinctive stopwords — a line that still reads as English prose in a
// de run is a catalog coverage gap. Precision over recall: 3+ EN votes, EN > 2x DE.
const _EN_STOP = /\b(the|and|you|your|of|with|she|he|his|they|that|this|from|have|are|was|what|into|but|not|it's|its|her)\b/gi;
const _DE_STOP = /\b(und|nicht|das|der|die|ist|ein|eine|einen|mit|für|auf|aus|sich|dich|dir|du|zu|dem|den|im|ich|es|wie|noch|schon|kein|keine|mehr|aber|oder|wenn|dann|nur|auch|jetzt|hier|schon)\b/gi;
function langLeak(line) {
  let t = String(line).replace(/\{\{[^{}]*\}\}/g, " ");  // {{…}} is decorate-suppression markup, not _fmt
  if (/\{[a-z_]+\}/.test(t)) return "defmt";           // an unfilled _fmt placeholder reached the player
  t = t.replace(/\([^()]*\)/g, " ")                    // hint groups are English by design
       .replace(/[A-Z]{2,}[A-Z0-9 ]*/g, " ")            // CAPS command tokens
       .replace(/[\u0E00-\u0E7F]+/g, " ")              // Thai stays Thai
       .replace(/฿[\d,]+/g, " ");
  if (t.length < 30) return null;
  const en = (t.match(_EN_STOP) || []).length, de = (t.match(_DE_STOP) || []).length;
  return en >= 3 && en > de * 2 ? "langleak" : null;
}

const OFFPOCKET = /(Walking Street|Soi Buakhao|Buakhao|LK Metro|Tree Town|Myth Night|Jomtien)/;
const OFFPOCKET_OK = ["in 2004", "Nite Owl", "DON'T GIVE A HOOT", "up-country"];
// The town's media are canon-sanctioned reminiscence surfaces — the Nite Owl
// column, the paper, the TV all speak town-wide by design (backlog §1: the
// off-pocket grep excludes reminiscence). Suppress the check for lines those
// verbs printed; per-line markers can't cover every letter/listing in a pool.
const OFFPOCKET_MEDIA_CMD = /^(column|owl|read( |$)|watch( |$)|scores|lottery|lotto|weather)/;

export function runSoak(opts = {}) {
  const seed = opts.seed ?? 1;
  const nights = opts.nights ?? 5;
  const mode = opts.mode ?? "vacation";
  const maxCommands = opts.maxCommands ?? nights * 300 + 500;
  const lang = opts.lang || null;  // e.g. "de": force G.player.lang each turn (survives intro/resets)
  _pseed = (seed * 2654435761 % 2147483646) + 1;
  _triedVerbs = new Set();          // coverage-guided verb picking is per-run

  const buf = [];
  // stripMarkup, like any non-decorate() consumer: {{…}} is render-only
  // tap-suppression markup, and leaving it raw makes transcripts read
  // differently from the game — noise for anyone reviewing one.
  engineInit(t => buf.push(typeof stripMarkup === "function"
    ? stripMarkup(String(t)) : String(t)), null, () => {});
  newGame();
  if (mode === "vacation") {
    G.flags.act1Done = true; G.stage = "vacation"; G.money = 3000;
  } else if (mode === "expat") {
    // the endless stage. Reached in play by choosing to stay at the week's end,
    // and NOT reachable from the other soak modes — so without this, everything
    // gated on expatLife (the whole bar-owning chain) is invisible to every
    // ceiling. _goExpat does the flags, the savings and the room.
    G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
    G.day = 8; _goExpat();
  } else if (mode === "soi6") {
    G.player = null; startSoi6Mode();
  } else if (mode === "barowner") {
    // The expat stage WITH the bar already bought. Needed because the chain to
    // owning one is four dep-gated quests (talk-until-offered → ACCEPT → travel
    // → a specific ASK), which a random walker cannot climb — CLAUDE.md says as
    // much, and the liveness ledger proved it: every bar effect read 0 in expat
    // mode not because the mechanics were broken but because the walker never
    // owned a bar. Without this start state the whole expat endgame — the
    // presence dilemma, the books, the monthly, procurement — is unreachable by
    // any automated instrument the project has.
    G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
    G.day = 8; _goExpat();
    for (const f of ["barPremises", "barLicence", "barPartner", "partnerTan"]) _setFlag(f);
    G.room = "stinky_bar";
    G.money = BAR_DEPOSIT; _barDeposit(); _setFlag("barOpen");
    G.money = 8000;                       // a working float, not the deposit's aftermath
  } // act1: raw opening, resets expected
  // Seed the GAME dice AFTER mode setup — startSoi6Mode() runs its own newGame(),
  // which re-seeds G.rng from Math.random and silently broke soi6 determinism.
  G.rng = (seed * 48271 % 2147483646) + 1;
  // --start <room>: drop the walker somewhere specific. Purely ADDITIVE — the
  // default is unchanged, so every de ceiling stays calibrated against the same
  // walk. This exists because the walker's centre of gravity leaves 74 rooms
  // unentered by any run, so the only way to soak an outlying district (or a
  // block of new venues) is to begin inside it.
  if (opts.start) {
    if (!ROOMS[opts.start]) throw new Error("--start: no such room " + opts.start);
    G.room = opts.start;
    G.visited[opts.start] = true;
  }

  const maxMs = opts.maxMs ?? 90_000;
  const t0 = Date.now();
  const failures = [], warns = [], transcript = [];
  const liveness = {};                       // effect id → times observed
  // barowner is expat plus the bar, so it can reach everything expat can AND the
  // bar-only effects; the bar ones are tagged barowner-only because plain expat
  // cannot climb the chain to them.
  const _reach = mode === "barowner" ? ["expat", "barowner"] : [mode];
  for (const e of EFFECTS) if (e.modes.some(m => _reach.includes(m))) liveness[e.id] = 0;
  const seen = new Set();          // rooms this run actually stood in
  const stats = { commands: 0, nights: 0, vacations: 0, understoodMisses: 0, truncated: false };
  let hintQueue = [], hintRoom = null, lastDay = G.day, lastTurns = G.turns,
    cmdsThisNight = 0, forcedWaits = 0, spins = 0, modalStreak = 0;

  const fail = (kind, detail) => failures.push({ kind, detail, at: stats.commands,
    day: G.day, nightTurn: G.nightTurn, room: G.room });

  const snapshotNums = () => ({ money: G.money, hunger: G.hunger, thirst: G.thirst,
    battery: G.battery, drunk: G.soc && G.soc.drunk, happy: G.happy, day: G.day,
    nightTurn: G.nightTurn, turns: G.turns });

  while (stats.commands < maxCommands && stats.nights < nights && !failures.length) {
    if (Date.now() - t0 > maxMs) { stats.truncated = true; break; }  // wall-clock cap
    if (++spins > maxCommands * 4) { fail("spin", "policy can't produce commands"); break; }
    if (lang) {  // the de-sweep: language pinned no matter what the intro picked or a reset cleared
      if (!G.player) G.player = { origin: "monger", personality: "joker", orientation: "straight" };
      G.player.lang = lang;
    }
    // choose
    if (process.env.SOAK_PIN) fs.writeFileSync(process.env.SOAK_PIN,
      JSON.stringify({ phase: "select", save: serializeGame() }));
    let cmd = null, source = "wild";
    if (modalActive()) {
      // a live mini-game (C4 depth 8 ≈ 140ms/AI move) would otherwise dominate
      // wall-clock — concede often enough to keep the night moving
      cmd = (G.game && prand() < 0.3) ? "quit" : pick(modalPool());
      source = "modal";
    } else if (cmdsThisNight > 600) {
      cmd = "wait 10"; source = "forced"; forcedWaits++;
      if (forcedWaits > 90) { fail("softlock", "600+ commands then 90 forced WAITs without the night ending"); break; }
    } else if (hintQueue.length && G.room === hintRoom && prand() < 0.5) {
      cmd = hintQueue.shift(); source = "hint";
      if (cmd.endsWith(" ")) { cmd = resolvePrefill(cmd); if (!cmd) continue; }
    } else if (prand() < 0.45) {
      const chips = [];
      try { for (const c of _chipSet()) chips.push(c.cmd); } catch (e) {}
      if (chips.length) { cmd = pick(chips); source = "chip"; }
      if (cmd && cmd.endsWith(" ")) { cmd = resolvePrefill(cmd); }
    }
    // the engine-vocabulary channel: its own branch, not an entry diluted into
    // the wild pool (as one draw among ~35 it fired ~0.05% of turns and `work`
    // still never came up across 2,592 commands)
    if (!cmd && !modalActive() && prand() < ENGINE_VERB_RATE) {
      const v = engineVerbPick();
      if (v) { cmd = prand() < 0.25 ? v + " " : v; source = "vocab"; }
    }
    if (!cmd) { cmd = pick(wildPool()); source = "wild"; }
    if (cmd.endsWith(" ")) { cmd = resolvePrefill(cmd); if (!cmd) continue; }

    // execute
    if (process.env.SOAK_PIN) fs.writeFileSync(process.env.SOAK_PIN,
      JSON.stringify({ phase: "exec", cmd, save: serializeGame() }));
    if (process.env.SOAK_TRACE) fs.writeSync(1, "→ " + cmd + " [" + source + "] d" + G.day + " nt" + G.nightTurn + " " + G.room + "\n");
    const mark = buf.length;
    const liveBefore = liveSnap();     // the liveness ledger's "before"
    const modalBefore = modalActive(); // a game-move's output must never be banked as room hints
    const tCmd = Date.now();
    try { doCommand(cmd); } catch (e) {
      fail("throw", cmd + " → " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e));
      break;
    }
    if (process.env.SOAK_TRACE) fs.writeSync(1, "  ✓ done\n");
    // liveness: what did this command actually cause? (see EFFECTS)
    try {
      const liveAfter = liveSnap();
      for (const e of EFFECTS)
        if (liveness[e.id] !== undefined && e.hit(liveBefore, liveAfter)) liveness[e.id]++;
    } catch (err) { /* the ledger must never kill a run */ }
    const dtCmd = Date.now() - tCmd;
    if (dtCmd > 250) (stats.slow = stats.slow || []).push({ cmd, ms: dtCmd, day: G.day, room: G.room });
    stats.commands++; cmdsThisNight++;
    const lines = buf.slice(mark);
    transcript.push("❯ " + cmd + "   [" + source + "]");
    for (const l of lines) transcript.push(l);

    // harvest hints from THIS room's output (stale on room change)
    if (G.room !== hintRoom) { hintQueue = []; hintRoom = G.room; }
    // Modal options (encounters, barfine terms, game moves) die with the modal —
    // checked BEFORE and after — and a command during which the night ended is
    // never harvested at all: its output straddles two worlds (a "play jackpot"
    // whose start-tick hits dawn prints the (FLIP …) prompt AND the beach
    // wake-up, and the flip would be banked against the sand — the seed-6
    // false positive).
    const nightEndedThisCmd = G.day !== lastDay || G.turns < lastTurns;
    if (!modalBefore && !modalActive() && !nightEndedThisCmd)
      for (const l of lines) for (const h of extractHints(l))
        if (!hintQueue.includes(h) && hintQueue.length < 12) hintQueue.push(h);

    // the promise-catcher: a played hint that the parser disowns
    if (source === "hint" && lines.some(l => /didn't understand/i.test(l))) {
      stats.understoodMisses++;
      warns.push({ kind: "hint-miss", cmd, room: G.room, at: stats.commands });
    }
    if (mode === "soi6" && !OFFPOCKET_MEDIA_CMD.test(cmd)) for (const l of lines)
      if (OFFPOCKET.test(l) && !OFFPOCKET_OK.some(s => l.includes(s)))
        warns.push({ kind: "offpocket", line: String(l).slice(0, 140), at: stats.commands });
    if (lang && G.player && G.player.lang === lang) for (const l of lines) {
      const kind = langLeak(l);
      if (kind) warns.push({ kind, line: String(l).slice(0, 400), at: stats.commands, cmd });
    }

    // invariants
    const n = snapshotNums();
    for (const [k, v] of Object.entries(n))
      if (v !== undefined && v !== null && (typeof v !== "number" || !Number.isFinite(v)))
        fail("nan", k + " = " + v + " after '" + cmd + "'");
    if (n.money < 0) fail("money", "negative: " + n.money + " after '" + cmd + "'");
    if (n.hunger < 0 || n.hunger > 150 || n.thirst < 0 || n.thirst > 150)
      fail("meter", `hunger ${n.hunger} thirst ${n.thirst} after '${cmd}'`);
    if (n.battery < 0 || n.battery > 100) fail("meter", "battery " + n.battery);
    if (n.day > 400) fail("runaway", "day " + n.day);
    // modal-wedge detector (design doc §1: "modal states always answerable").
    // The modal pool draws from _chipSet + fallbacks, so a healthy modal clears
    // within a handful of tries; 60 consecutive gated commands means the chips
    // don't include an answer the gate accepts (the seed-12 ST/LT wedge).
    modalStreak = modalActive() ? modalStreak + 1 : 0;
    if (modalStreak > 60)
      fail("modal-wedge", "input gated for " + modalStreak + " consecutive commands (" +
        JSON.stringify({ pendingChoice: G.pendingChoice, pendingEnc: G.pendingEnc,
          game: G.game && G.game.type, pendingBf: !!G.pendingBf,
          pendingSoapy: !!G.pendingSoapy, pendingFare: !!G.pendingFare }) + ")");

    if (stats.commands % 150 === 0) {
      // Save-compat merges skeleton defaults IN (e.g. visited.jomtien_beach), so
      // serialize∘deserialize is deliberately not identity. The stability invariant
      // is idempotence from the second pass: once merged, further round-trips must
      // change nothing.
      const s1 = serializeGame(); deserializeGame(s1);
      const s2 = serializeGame(); deserializeGame(s2);
      const s3 = serializeGame();
      const diff = deepEq(JSON.parse(s2), JSON.parse(s3));
      if (diff) fail("save-roundtrip", diff);
    }

    if (G.day !== lastDay || G.turns < lastTurns) {
      stats.nights++; lastDay = G.day; cmdsThisNight = 0; forcedWaits = 0;
      if (G.turns < lastTurns) {
        stats.resets = (stats.resets || 0) + 1; // RESTART / act1 hard-fail rebuilt the world
        // …and _act1Fail's newGame() re-seeded G.rng from Math.random, so from
        // here the run diverges: same seed, different transcript. That is correct
        // for a PLAYER (a fresh attempt deserves fresh dice) but it makes act1
        // mode unreplayable, so the harness pins a deterministic successor seed.
        // Same hazard the startSoi6Mode comment above records — this is the other
        // door into it, and the one the de-coverage ratchet walked through.
        G.rng = ((seed * 48271 * (stats.resets + 1)) % 2147483646) + 1;
      }
    }
    if (G.room) seen.add(G.room);
    lastTurns = G.turns;
    if (G.pendingChoice === "vacation_end") stats.vacations++;
  }

  stats.roomsSeen = seen.size;
  stats.roomsTotal = Object.keys(ROOMS).length;
  return { seed, mode, stats, failures, warns, transcript, seen, liveness };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf("--" + name);
    return i > 0 ? process.argv[i + 1] : dflt;
  };
  const seeds = String(arg("seed", "1")).split(",").map(Number);
  const nights = Number(arg("nights", 5));
  const mode = arg("mode", "vacation");
  const lang = arg("lang", null);
  const leakTally = new Map();  // normalised line → count, across all seeds
  const liveTally = new Map();  // effect id → times observed, across all seeds
  const tPath = arg("transcript", null);
  let anyFail = false;

  for (const seed of seeds) {
    const r = runSoak({ seed, nights, mode, lang, start: arg("start", null) });
    for (const x of r.warns) if (x.kind === "langleak" || x.kind === "defmt") {
      const key = (x.kind === "defmt" ? "⚠ {unfilled} " : "") + x.line.slice(0, 400);
      leakTally.set(key, (leakTally.get(key) || 0) + 1);
    }
    const w = {};
    for (const x of r.warns) w[x.kind] = (w[x.kind] || 0) + 1;
    for (const [k, v] of Object.entries(r.liveness || {})) liveTally.set(k, (liveTally.get(k) || 0) + v);
    const cov = Math.round(100 * r.stats.roomsSeen / r.stats.roomsTotal);
    console.log(`seed ${seed} [${mode}]: ${r.stats.commands} cmds, ${r.stats.nights} nights, ` +
      `${r.stats.vacations} vacation-ends, warns ${JSON.stringify(w)}, failures ${r.failures.length}, ` +
      `rooms ${r.stats.roomsSeen}/${r.stats.roomsTotal} (${cov}%)`);
    for (const x of r.warns.slice(0, 8))
      console.log("  WARN " + x.kind + ": " + (x.line || (`'${x.cmd}'` + (x.room ? " in " + x.room : ""))));
    for (const f of r.failures) {
      anyFail = true;
      console.log("  FAIL " + f.kind + " @cmd " + f.at + " (day " + f.day + ", nt " + f.nightTurn +
        ", " + f.room + "): " + f.detail);
      console.log("  repro: node tools/soak.mjs --seed " + seed + " --mode " + mode + " --nights " + nights);
      console.log("  ── last transcript lines ──");
      for (const l of r.transcript.slice(-40)) console.log("  " + String(l).replace(/\n/g, " "));
    }
    if (tPath) fs.writeFileSync(tPath.replace(/(\.\w+)?$/, m => "-" + seed + (m || ".txt")),
      r.transcript.join("\n"));
  }
  if (leakTally.size) {
    console.log("\n── language-leak report (unique lines × occurrences across seeds) ──");
    for (const [line, n] of [...leakTally].sort((a, b) => b[1] - a[1]))
      console.log(String(n).padStart(4) + "×  " + line);
  }
  if (liveTally.size) {
    // The liveness ledger. A ZERO is the interesting line: either the content is
    // dead or the mechanic is broken, and this harness deliberately does not
    // guess which — a human reads the list in seconds. (See EFFECTS.)
    console.log("\n── liveness ledger (effects observed across all seeds) ──");
    const rows = [...liveTally].sort((a, b) => a[1] - b[1]);
    for (const [id, n] of rows)
      if (n > 0) console.log("  ·        " + id.padEnd(24) + String(n).padStart(5));
    const zeroes = rows.filter(r => r[1] === 0).map(r => r[0]);
    const excused = zeroes.filter(id => EFFECT_WHY.has(id));
    const bare = zeroes.filter(id => !EFFECT_WHY.has(id));
    for (const id of excused)
      console.log("  ○ zero   " + id.padEnd(24) + "  expected: " + EFFECT_WHY.get(id));
    for (const id of bare)
      console.log("  ✗ NEVER  " + id.padEnd(24) + "  ← no reason on file; dead content, or a bug");
    if (!bare.length) console.log("  Every effect with no excuse on file fired at least once.");
    else if (seeds.length < 5) console.log(`  (only ${seeds.length} seed(s) — a bare zero here may just be ` +
      "unreached rather than dead; re-run with --seed 1,2,3,4,5,6 before believing it.)");
  }
  process.exit(anyFail ? 1 : 0);
}
