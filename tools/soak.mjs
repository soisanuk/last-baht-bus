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
  for (const f of ["thai", "world", "games", "lang", "engine-core", "engine-encounters",
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
    if (!cmd) { cmd = pick(wildPool()); source = "wild"; }
    if (cmd.endsWith(" ")) { cmd = resolvePrefill(cmd); if (!cmd) continue; }

    // execute
    if (process.env.SOAK_PIN) fs.writeFileSync(process.env.SOAK_PIN,
      JSON.stringify({ phase: "exec", cmd, save: serializeGame() }));
    if (process.env.SOAK_TRACE) fs.writeSync(1, "→ " + cmd + " [" + source + "] d" + G.day + " nt" + G.nightTurn + " " + G.room + "\n");
    const mark = buf.length;
    const modalBefore = modalActive(); // a game-move's output must never be banked as room hints
    const tCmd = Date.now();
    try { doCommand(cmd); } catch (e) {
      fail("throw", cmd + " → " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e));
      break;
    }
    if (process.env.SOAK_TRACE) fs.writeSync(1, "  ✓ done\n");
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
  return { seed, mode, stats, failures, warns, transcript, seen };
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
  process.exit(anyFail ? 1 : 0);
}
