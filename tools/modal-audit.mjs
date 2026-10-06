#!/usr/bin/env node
// THE MODAL AUDIT — the wrong answer at a prompt is still an answer.
//
//   node tools/modal-audit.mjs            # full report
//   node tools/modal-audit.mjs --json
//   node tools/modal-audit.mjs --state synjob
//   node tools/modal-audit.mjs --show     # every probe's output, for reading by hand
//
// CLASS G (modal / input gating) was the ledger's top row for a month — 75 findings,
// 11% severe, 0% instrumented (docs/persona-findings-ledger-analysis.md). Every other
// hot class got a lint or an audit; this one lived on personas: Darren typed "what
// happens if I move to pattaya?" and moved to Pattaya; "1", "short time" and "calm
// down" typed a turn after the modal closed were parse failures; a Jackpot's DROP 7
// dropped a receipt; a question at a table cost a turn; a SLEEP typed minutes after
// the bed asked was taken as the answer. The shape of every one is the same: a GATE
// that owns the input, and an input the gate did not anticipate.
//
// So this audit ARMS every gate the engine has and types the inputs the gates kept
// mishandling:
//   · a NON-ANSWER ("what?", "huh?", "what happens if i say yes?") must leave the gate
//     up, commit nothing (day, money, bank), cost no turn, and SAY something — a
//     swallowed command with silence is the blind-modal class;
//   · a READ-ONLY verb (help, time, inventory, quests, journal, diagnose) must answer
//     under the prompt and leave it up (round 57's rule);
//   · a STALE answer — the gate's own chip labels typed the turn after it closed —
//     must never be a parse failure and never re-commit;
//   · a RELOAD mid-modal must redraw the question (_renderResume) with its options,
//     and the first chip must still work afterwards (class S, the other dark column);
//   · the CHIPS offered while the gate is up must each be accepted by it.
//
// WHAT COUNTS AS A GATE is read off the SOURCE, not a list: every `pendingChoice =
// "x"`, every key of _ENC, every `G.game = { type: "x"`, plus pendingBf / pendingFare
// / pendingSoapy — and a gate with no arming recipe in STATES (or a reason in SKIP)
// fails the audit, so a new modal is covered the day it is written or says why not.
// The parse-failure oracle is the engine's own _HUH pool, read live, so a rewritten
// brush-off cannot quietly turn this green.
//
// SIBLING: tests/js/saveload.test.js (2026-09-27) already round-trips every modal through a
// save and feeds it one junk line from a hand-kept MODALS table. This audit adds the probes
// that table never typed — the question-shaped answer, the read-only verbs, the gate's own
// labels a turn late, each offered chip — and reads the gate list off the source instead of
// a table, so a modal nobody registered fails here first.
//
// Arming goes through the gate's REAL setter wherever one exists (_taxiIntro,
// _endVacation, _doCheckout, _startEnc, _rabbitInterview, _affairAsk, _doBarfine,
// _doRideBus, _doSoapy …), because a hand-built state hides exactly the defects this
// is for (round 54's seed, CLAUDE.md). A gate whose recipe cannot be reached from a
// fresh game in a few calls is listed in SKIP with the pin that covers it instead.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
const SRC = {};
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"]) {
  SRC[f] = fs.readFileSync(new URL(f + ".js", JS), "utf8");
  vm.runInThisContext(SRC[f], { filename: f });
}

let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const said = () => out.join("\n");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const si = args.indexOf("--state");
const onlyState = si !== -1 ? args[si + 1] : null;
const SHOW = args.includes("--show");

// ── a fresh game, and the owner's game ────────────────────────────────────────
function base() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 5000; G.bank = 20000;
  G.room = "stinky_bar"; G.nightTurn = 30; G.rng = 12345;
  out = [];
}
function owner() {
  base();
  G.stage = "expat"; for (const f of ["expatLife", "barOpen", "barPaid", "barPartner", "partnerTan", "tanAsked", "tanFavourDone"]) _setFlag(f);
  G.tanFavourDay = G.day;
  G.bar = Object.assign(G.bar || {}, { room: "stinky_bar", cash: 20000, owed: 100000, worked: 5, declared: 5, stoodTurns: 30 });
  G.soc.drinks.manow = 15;
  G.affair = { id: "manow", since: G.day - 3, strain: 2, floorSour: 0, crisSeen: [], crisChose: {}, warned: {} };
}

// what gate owns the input right now — the order is doCommand's
const gate = () => G.pendingChoice ? "choice:" + G.pendingChoice
  : G.game ? "game:" + G.game.type
  : G.pendingEnc ? "enc:" + G.pendingEnc
  : G.pendingBf ? "bf" : G.pendingSoapy ? "soapy" : G.pendingFare ? "fare" : null;

// ── the recipes ──────────────────────────────────────────────────────────────
// { gate: what gate() must read after arm(), arm(), decline?: the answer that closes it
//   without committing anything (default: the last chip), noDecline?: every answer commits }
const STATES = {
  // pendingChoice
  intro:        { gate: "choice:intro", arm() { newGame(); G.player = { said: {}, lang: "en" }; _taxiIntro("beach"); }, noDecline: true },
  vacation_end: { gate: "choice:vacation_end", arm() { base(); G.day = 8; G.room = _hotelRoomId(); _endVacation(); }, noDecline: true },
  gameend:      { gate: "choice:gameend", arm() { owner(); G.lifeStats = { day: G.day, stood: 5, nights: 9, her: "manow" }; _gameEnd(); }, noDecline: true },
  checkout:     { gate: "choice:checkout", arm() { base(); G.room = _hotelRoomId(); G.nightTurn = 2; _doCheckout(); }, decline: "stay" },
  rabbitjob:    { gate: "choice:rabbitjob", arm() { owner(); G.room = "white_rabbit"; _rabbitInterview(); }, decline: "not me" },
  kidprice:     { gate: "choice:kidprice", arm() { owner(); G.room = "old_market"; _kidPriceAsk(); }, decline: "no" },
  kidfavour:    { gate: "choice:kidfavour", arm() { owner(); G.room = "stinky_bar"; _kidFavourAsk(); }, decline: "no" },
  sighting:     { gate: "choice:sighting", arm() { base(); G.room = "beach_rd_c"; G.known.nan = true; _sighting("nan"); }, decline: "raise your glass" },
  tanfavour:    { gate: "choice:tanfavour", arm() { owner(); G.flags.tanAsked = false; _tanFavour(); }, decline: "no" },
  bkkdinner:    { gate: "choice:bkkdinner", arm() { base(); G.stage = "expat"; G.bkk = { stage: 4, invite: G.day - 1 }; G.room = _hotelRoomId(); G.pendingChoice = "bkkdinner"; _bkkDinnerPrompt(); }, decline: "decline" },   // _bkkArcTick's two lines, without the arc's week of texts
  bkkbill:      { gate: "choice:bkkbill", arm() { base(); G.stage = "expat"; G.bkk = { stage: 4, invite: G.day - 1 }; G.room = _hotelRoomId(); G.pendingChoice = "bkkdinner"; _bkkGo(); }, decline: "let" },
  cham:         { gate: "choice:cham", arm() { base(); G.room = "metro_beer_garden"; G.nightTurn = 50; G.known.cream = true; _chamAsk(); }, decline: "not tonight" },
  chamgift:     { gate: "choice:chamgift", arm() { base(); G.room = _hotelRoomId(); G.chamNight = true; _chamMorning(); }, decline: "nothing" },
  synjob:       { gate: "choice:synjob", arm() { owner(); _synAsk(); }, decline: "no" },
  shift:        { gate: "choice:shift", arm() { owner(); G.nightTurn = 40; G.bar.worked = 5; G.bar.workedTurn = 0; _shiftAsk(); }, decline: "no" },
  partner:      { gate: "choice:partner", arm() { base(); G.stage = "expat"; _setFlag("expatLife"); G.room = "candy_bar"; G.pendingChoice = "partner"; G.partnerWho = "candy"; _partnerPrompt(); }, decline: "no" },
  affair:       { gate: "choice:affair", arm() { owner(); G.affair = null; G.nightTurn = 56; _affairAsk("manow"); }, decline: "step back" },
  affaircrisis: { gate: "choice:affaircrisis", arm() { owner(); G.nightTurn = 40; _affairCrisisAsk(AFFAIR_CRISES[0]); } },
  sellbar:      { gate: "choice:sellbar", arm() { owner(); _setFlag("affairOffered"); G.affair.since = G.day - 70; _doSellBar(); }, decline: "no" },
  // games
  c4:    { gate: "game:c4", arm() { base(); _startC4(); }, decline: "quit" },
  jp:    { gate: "game:jp", arm() { base(); _setFlag("jpLearned"); _startJackpot("100"); }, decline: "quit" },
  pool:  { gate: "game:pool", arm() { base(); G.room = "kingfisher"; _startPool(); }, decline: "quit" },
  kp:    { gate: "game:kp", arm() { base(); G.room = "kingfisher"; G.day = 3; _startKiller(); }, decline: "quit" },
  darts: { gate: "game:darts", arm() { base(); G.room = "queen_vic"; _startDarts(); }, decline: "quit" },
  quiz:  { gate: "game:quiz", arm() { base(); G.day = 4; G.nightTurn = 25; G.room = _quizBars()[0]; _startQuiz(true); }, decline: "quit" },
  cli:   { gate: "game:cli", arm() { owner(); G.room = "kitten_office"; _startCli("plg_office"); }, decline: "exit" },
  // the barfine, the soapy's menu, the fare
  bf:    { gate: "bf", arm() { base(); G.room = "candy_bar"; G.soc.drinks.nan = 8; _doBarfine("nan"); }, decline: "no" },
  soapy: { gate: "soapy", arm() { base(); G.room = "emperor_soapy"; G.money = 9000; _doSoapy(); }, decline: "no" },
  fare:  { gate: "fare", arm() { base(); G.room = "beach_rd_c"; G.nightTurn = 30; doCommand("wave"); doCommand("naklua road"); }, decline: "pay 15" },   // the fare is asked at the kerb you get off at; paying is the only way off it (the charter alone has WALK)
};
// every interactive encounter arms through _startEnc, in a room it can fire in
const ENC_ROOM = { freelancer: "beach_rd_c", booking: "hotel_room", jptourist: "ws_north", bkktourist: "ws_north",
  coconutbar: "jomtien_beach", seawall: "jomtien_beach", noodle: "soi6_mid", clubpickup: "ws_north", condofarang: "jomtien_beach",
  jogger: "promenade", influencer: "beach_rd_c", djslip: "ws_north", maze: "tt_entrance", pingpong: "ws_north", freegift: "beach_rd_c" };
for (const id of Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].interactive)) {
  STATES["enc:" + id] = { gate: "enc:" + id, arm() { base(); G.room = ENC_ROOM[id] || "beach_rd_c"; G.nightTurn = 50; _startEnc(id); }, decline: "no" };
}
// the pseudo-encounters with their own setters
Object.assign(STATES, {
  "enc:police":   { gate: "enc:police", arm() { base(); G.room = "beach_rd_c"; G.soc.drunk = 6; G.lastPolice = -100; const s = _rand; try { _rand = () => 0; _maybeEncounter(); } finally { _rand = s; } }, decline: "wai" },
  "enc:peddler":  { gate: "enc:peddler", arm() { base(); G.room = "sea_wall"; G.peddlerNight = 0; G.lastPeddler = -100; G.turns = 200; const s = _rand; try { _rand = () => 0; _tick(); } finally { _rand = s; } }, decline: "no" },
  "enc:selfbf":   { gate: "enc:selfbf", arm() { base(); G.room = "candy_bar"; G.nightTurn = 65; G.soc.drinks.nan = 12; G.soc.drinkCount = G.soc.drinkCount || {}; G.soc.drinkCount.nan = 6; const s = _rand; try { _rand = () => 0; _maybeSelfBarfine("nan"); } finally { _rand = s; } }, decline: "no" },
  "enc:flower":   { gate: "enc:flower", arm() { base(); G.room = "lucky_tiger"; G.soc.drinks.lek = 3; _convoStart("lek"); const s = _rand; try { _rand = () => 0; for (let i = 0; i < 30 && !G.pendingEnc; i++) _flowerTick(); } finally { _rand = s; } }, decline: "no" },
  "enc:lockdare": { gate: "enc:lockdare", arm() { base(); G.room = "night_heron"; G.nightTurn = 70; (G.soc.lockIn = G.soc.lockIn || {})[G.room] = true; (G.soc.lockInAt = G.soc.lockInAt || {})[G.room] = 55; _lockInTick(); }, decline: "no" },
  "enc:tonicshop": { gate: "enc:tonic", arm() { base(); G.room = "beach_rd_c"; G.nightTurn = 50; _startEnc("tonic"); doCommand("follow him to the shop"); }, decline: "leave" },
  "enc:curse":    { gate: "enc:fortune", arm() { base(); G.room = "beach_rd_c"; G.nightTurn = 50; _startEnc("fortune"); doCommand("read my palm"); }, decline: "leave" },
  "enc:catfish":  { gate: "enc:booking", arm() { base(); G.room = "hotel_room"; G.nightTurn = 50; _startEnc("booking"); const s = _rand; try { _rand = () => 0.99; doCommand("yes"); } finally { _rand = s; } }, decline: "send" },
  "enc:jpdeal":   { gate: "enc:jptourist", arm() { base(); G.room = "ws_north"; G.nightTurn = 50; _startEnc("jptourist"); doCommand("konbanwa"); }, decline: "no" },
});
// gates the recipes cannot reach from a fresh game in a few calls, with the pin that covers them
const SKIP = {
  "enc:bfhop": "armed only inside an LT barfine's scam roll (_bfScamRoll) — pinned by engine.test's bfhop sequence",
  "enc:bfparty": "armed only inside an LT barfine's scam roll — pinned by engine.test's bfparty sequence",
  "enc:nightride": "offered on an LT of a bonded lady by a day-stable hash — pinned by round47/round62 (Kenji, Piet)",
  "enc:powerbank": "a SOFT pitch (_ENC_SOFT): a direction typed into it walks — not a gate",
  "enc:bargirl": "a one-shot scene with no input (_ENC.bargirl takes none) — not a gate",
  "game:jp-tutorial": "the first-game tutorial is the same gate with every roll stopped — the jp recipe sets jpLearned",
};

// ── discovery: every gate the source knows ───────────────────────────────────
const discovered = new Set();
for (const f of ["engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"]) {
  for (const m of SRC[f].matchAll(/pendingChoice = "([a-z_0-9]+)"/g)) discovered.add("choice:" + m[1]);
  for (const m of SRC[f].matchAll(/G\.game = \{ type: "([a-z0-9]+)"/g)) discovered.add("game:" + m[1]);
}
for (const m of SRC.world.matchAll(/pendingChoice = "([a-z_0-9]+)"/g)) discovered.add("choice:" + m[1]);
for (const k of Object.keys(_ENC)) discovered.add("enc:" + k);
for (const g of ["bf", "soapy", "fare"]) discovered.add(g);
const covered = new Set(Object.values(STATES).map(s => s.gate));
const unarmed = [...discovered].filter(g => !covered.has(g) && !SKIP[g]);

// ── the oracle and the probes ────────────────────────────────────────────────
const HUH = new Set(_HUH);
const isHuh = () => out.some(l => HUH.has(l));
const NON_ANSWERS = ["what?", "huh?", "pardon?", "what happens if i say yes?"];
const READ_ONLY = ["help", "time", "inventory", "quests", "journal", "diagnose"];
const caps = s => [...String(s).matchAll(/\(([^()]*[A-Z]{2,}[^()]*)\)/g)].flatMap(m => m[1].match(/\b[A-Z][A-Z ]{1,}\b/g) || []).map(t => t.trim()).filter(t => t.length > 1);

// known-benign, each with its reason — "state|probe|detail"
const OK = {
  "enc:maze|readonly|help": "HELP at an encounter is a REACTION by design (round 57: an encounter keeps HELP) — in the Tree Town lanes it is asking the way, which is how being lost ends",
};

const findings = [];
const note = (state, probe, detail, msg) => {
  const key = `${state}|${probe}|${detail}`;
  if (OK[key]) return;
  findings.push({ state, probe, detail, msg });
};
const snap = () => ({ day: G.day, money: G.money, bank: G.bank, turn: G.nightTurn, gate: gate() });
const same = (a, b) => a.day === b.day && a.money === b.money && a.bank === b.bank && a.gate === b.gate;

let armed = 0, probes = 0;
for (const [name, st] of Object.entries(STATES)) {
  if (onlyState && name !== onlyState && st.gate !== onlyState) continue;
  // arm
  let saveArmed;
  try { st.arm(); } catch (e) { note(name, "arm", "threw", `arming threw: ${e.message}`); continue; }
  if (gate() !== st.gate) { note(name, "arm", "not-armed", `recipe left the gate at ${gate() || "nothing"}, wanted ${st.gate}`); continue; }
  armed++;
  const live = said(); const liveCaps = caps(live);
  saveArmed = serializeGame();
  const chips = _chipSet().map(c => c.cmd);
  if (!chips.length) note(name, "chips", "none", "no chip offered while the gate owns the input");
  if (SHOW) console.log(`\n══ ${name} ══\n${live}\n  chips: ${chips.join(" · ")}`);

  // 1. non-answers: gate up, nothing committed, no turn, something said
  for (const q of NON_ANSWERS) {
    deserializeGame(saveArmed); const before = snap(); out = []; probes++;
    try { doCommand(q); } catch (e) { note(name, "nonanswer", q, `threw: ${e.message}`); continue; }
    const after = snap();
    if (after.gate !== before.gate) note(name, "nonanswer", q, `"${q}" moved the gate ${before.gate} → ${after.gate || "closed"}`);
    else if (!same(before, after)) note(name, "nonanswer", q, `"${q}" committed something: day ${before.day}→${after.day}, money ${before.money}→${after.money}`);
    if (after.turn !== before.turn && after.gate === before.gate) note(name, "nonanswer", q + "|tick", `"${q}" cost a turn (${before.turn}→${after.turn}) and the gate is still up`);
    if (!out.length) note(name, "nonanswer", q + "|silent", `"${q}" was swallowed in silence`);
    if (isHuh()) note(name, "nonanswer", q + "|huh", `"${q}" was a parse failure under the prompt`);
    if (SHOW) console.log(`  [${q}] → ${said().slice(0, 160).replace(/\n/g, " ⏎ ")}`);
  }
  // 2. read-only verbs answer under the prompt
  for (const v of READ_ONLY) {
    deserializeGame(saveArmed); const before = snap(); out = []; probes++;
    try { doCommand(v); } catch (e) { note(name, "readonly", v, `threw: ${e.message}`); continue; }
    const after = snap();
    if (after.gate !== before.gate) note(name, "readonly", v, `${v.toUpperCase()} moved the gate ${before.gate} → ${after.gate || "closed"}`);
    else if (!same(before, after) || after.turn !== before.turn) note(name, "readonly", v, `${v.toUpperCase()} cost something under the prompt`);
    if (!out.length) note(name, "readonly", v, `${v.toUpperCase()} said nothing under the prompt`);
    if (isHuh()) note(name, "readonly", v + "|huh", `${v.toUpperCase()} was a parse failure under the prompt`);
  }
  // 3. the chips offered are each accepted
  for (const c of chips) {
    deserializeGame(saveArmed); out = []; probes++;
    try { doCommand(c); } catch (e) { note(name, "chip", c, `threw: ${e.message}`); continue; }
    if (isHuh()) note(name, "chip", c, `the offered chip "${c}" was a parse failure`);
    if (!out.length) note(name, "chip", c + "|silent", `the offered chip "${c}" was swallowed in silence`);
  }
  // 4. stale: close it, then type its own labels the turn after
  if (!st.noDecline) {
    const dec = st.decline || chips[chips.length - 1];
    deserializeGame(saveArmed); out = [];
    try { doCommand(dec); } catch (e) { note(name, "decline", dec, `threw: ${e.message}`); }
    if (gate() === st.gate) note(name, "decline", dec, `"${dec}" did not close the gate`);
    else if (!gate()) {
      const closed = serializeGame();
      for (const c of chips) {
        deserializeGame(closed); const before = snap(); out = []; probes++;
        try { doCommand(c); } catch (e) { note(name, "stale", c, `threw: ${e.message}`); continue; }
        if (isHuh()) note(name, "stale", c, `"${c}" typed the turn after the gate closed was a parse failure`);
        if (gate() === st.gate) note(name, "stale", c + "|rearm", `"${c}" typed after the gate closed re-armed it`);
        if (G.day !== before.day) note(name, "stale", c + "|night", `"${c}" typed after the gate closed ended the night`);
        if (SHOW) console.log(`  [stale ${c}] → ${said().slice(0, 120).replace(/\n/g, " ⏎ ")}`);
      }
    }
  }
  // 5. reload mid-modal: the question is redrawn with its options, and the first chip still works
  deserializeGame(saveArmed); out = []; probes++;
  try { _renderResume(); } catch (e) { note(name, "resume", "threw", `_renderResume threw: ${e.message}`); }
  if (gate() !== st.gate) note(name, "resume", "gate", `a reload lost the gate (${gate() || "nothing"})`);
  if (!out.length) note(name, "resume", "blind", "a reload redraws nothing — the prompt is up and invisible");
  else if (liveCaps.length) {
    const re = said();
    const missing = [...new Set(liveCaps)].filter(t => !re.includes(t));
    if (missing.length && missing.length === new Set(liveCaps).size) note(name, "resume", "options", `the redraw names none of the live prompt's options (${[...new Set(liveCaps)].join(" · ")})`);
  }
  if (chips.length) {
    out = []; probes++;
    try { doCommand(chips[0]); } catch (e) { note(name, "resume", "chip", `the first chip after a reload threw: ${e.message}`); }
    if (isHuh()) note(name, "resume", "chip", `the first chip after a reload ("${chips[0]}") was a parse failure`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({ discovered: [...discovered], unarmed, skipped: SKIP, armed, probes, findings }, null, 1));
} else {
  if (unarmed.length) console.log(`UNARMED gates (add a recipe to STATES or a reason to SKIP):\n  ${unarmed.join("\n  ")}\n`);
  const byState = {};
  for (const f of findings) (byState[f.state] = byState[f.state] || []).push(f);
  for (const [s, fs_] of Object.entries(byState)) {
    console.log(`── ${s}`);
    for (const f of fs_) console.log(`  ${f.probe.padEnd(10)} ${f.msg}`);
  }
  console.log(`\nmodal audit: ${discovered.size} gates in the source · ${armed} armed · ${Object.keys(SKIP).length} skipped with a reason · ${probes} probes · ${findings.length} findings` +
    (unarmed.length ? ` · ${unarmed.length} UNARMED` : ""));
  if (!findings.length && !unarmed.length) console.log("Every modal answers a question, a read-only verb, a stale answer and a reload.");
}
process.exitCode = findings.length || unarmed.length ? 1 : 0;
