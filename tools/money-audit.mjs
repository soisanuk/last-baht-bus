#!/usr/bin/env node
// MONEY audit — every baht that moved is accounted for on a surface the player reads.
//
//   node tools/money-audit.mjs            # every scenario, the findings and a summary line
//   node tools/money-audit.mjs --quick    # the fast subset (what tests/js/money-audit.test.js gates)
//   node tools/money-audit.mjs --json     # machine-readable
//   node tools/money-audit.mjs --verbose  # print each night's ledger and the audit's own book
//   node tools/money-audit.mjs --only <scenario-id>
//   node tools/money-audit.mjs --trace    # every command, its output and the pocket/bank either side
//   node tools/money-audit.mjs --mutate atm|bin|till   # break one counter: the audit must go red
//
// WHY THIS EXISTS. Class E of the persona-findings ledger (economy: "money that moved
// without a clear reason", the morning ledger and the books disagreeing with what
// happened) had 74 findings and 4% instrument coverage — every one of them was a
// persona with a calculator. The ledger (`_morningLedger`) and BOOKS (`_doBooks`) are
// each a hand-kept set of counters (G.atmTotal, G.loanBorrowed, G.nontCut, G.offTill,
// G.bar.lastLines …), and a counter is only as good as the site that remembered to
// bump it. This audit keeps its OWN book, independently of those counters, and checks
// the printed surfaces against it.
//
// HOW IT KEEPS ITS OWN BOOK. It watches four balances — pocket (G.money), account
// (G.bank), money in transit at Nont's (G.nontStuck) and the owner's till (G.bar.cash)
// — and attributes every change to the thing that caused it:
//   · the scenario step that typed it, which declares what the command MEANS (a spend,
//     an ATM pull, a loan, a send, a till draw…) — never how much it should cost;
//   · a handful of wrapped engine functions for the movements no command names (rent at
//     the wake, the bar's settle and its monthly bill, Nira's cousins at dawn, a quest
//     reward or a texted transfer landing in the account).
// Loan principal is tracked by the audit itself, principal first. The engine's ledger
// counters are never read to compute an expectation — only to explain a finding.
//
// THE INVARIANTS (each night, on the real path: doCommand, the tick, _endNight by SLEEP
// or the clock, _arriveAt by moving):
//   I1 conservation — the change in pocket + account + money in transit equals what the
//      ledger's PRINTED figures add up to (down/up, sent, borrowed, repaid principal,
//      drawn from the till) less the bar's pocket bills it deliberately leaves to the
//      bar's page. An account movement the ledger never mentions fails here.
//   I2 the printed figures — each figure the ledger prints (down/up, the machine and its
//      fees, Nont's notes and cut, Nira and Nont borrowed/repaid/interest, sent, drawn
//      from the till, the till top-up, arrived in the account) equals the audit's book.
//   I3 the till — for an owner, the till's movement from one settle to the next equals
//      the sum of the BOOKS lines (take, nut, stock, wages, Bert, salary, arrangements,
//      Nont's cut, the night's own bill, own girls' drinks, guest drinks, own glass) plus
//      the DRAWs and PUTs as printed, the top-up, and the month's bill off the till.
//   I4 CHECK BIN — the figure it prints equals what the pocket paid on slips since you
//      sat down (the scenario marks which steps are slips; tips, the saleng, loans and
//      the till are not).
//   I0 a read-only command (BOOKS, CHECK BIN, LEDGER…) moved no money.
//   I5 every ฿ figure printed on any surface carries its thousands separator (one row per
//      command verb, with examples).
//
// THE SCENARIOS (each built through the game's own functions — the owner is
// tools/persona-seed.mjs's expatOwner, move for move): a tourist's bar night (beers, lady
// drinks, a tip, the saleng, a short time, the ATM, a massage, the clinic, the bus, a
// motosai) and his money nights (Nira borrowed, repaid in part and whole; Nont's CASH; a SEND;
// a long time); the account (rent on the card, a quest reward by app beside Nont's notes,
// Nont's account "having a moment"); a TAKE HER OUT party (her drinks at the next door, the
// motel, SEND HER HOME); an expat's loan left to the cousins; a blackout's rough wake; and the
// owner — a stood shift with his own glass, his girls' drinks, DRAW and PUT IN TILL; a night
// away; PRICES UP and TERMS SALARY; BORROW at Nont's table with the garnish and REPAY NONT;
// a companion and a lost Connect 4 stake at his own rail; the month's bill off an empty till.
//
// THE GATE (tests/js/money-audit.test.js runs --quick). A finding is keyed
// `<scenario>#n<night>:<invariant>:<field>` (I5: `fmt:<verb>`). MONEY_OK lists genuinely benign findings,
// each with a reason (same discipline as AFFORD_OK). MONEY_OPEN lists REAL engine
// defects this instrument found and nobody has fixed yet, each with the figures and a
// diagnosis of which function is wrong: the test asserts every finding is in one list
// or the other, so the suite stays green while the open defects stay visible, and a
// fixed defect simply stops appearing (delete its row).
//
// RULE 2 OF CLAUDE.md: no loop here depends on dice varying. Dice are the game's own
// seeded G.rng (fixed per scenario); a step that needs a particular roll stubs _rand to
// a constant for that one command, and every loop is bounded by a count.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

let out = [];
engineInit(t => out.push(String(t)), null, () => {});

const args = process.argv.slice(2);
const QUICK = args.includes("--quick"), AS_JSON = args.includes("--json"), VERBOSE = args.includes("--verbose");
const _onlyAt = args.indexOf("--only");
const ONLY = _onlyAt >= 0 ? (args[_onlyAt + 1] || "") : "";

// ── the known lists ─────────────────────────────────────────────────────────
// MONEY_OK: findings that are genuinely benign. Each entry needs a reason.
const MONEY_OK = [
  // (none — every finding on the first run was a real defect; see MONEY_OPEN)
];
// MONEY_OPEN: real defects found by this instrument, not yet fixed in the engine. The
// gate asserts findings ⊆ MONEY_OK ∪ MONEY_OPEN; delete a row when its fix lands (the
// report lists the rows that no longer reproduce). Grouped by root cause: one `why` per
// defect, every key that defect produces.
const _OPEN = (why, keys) => keys.map(key => ({ key, why }));
const MONEY_OPEN = [
  // A — the account side of the ledger is clamped away. _morningLedger (engine-play.js) infers
  // money that ARRIVED in the account as `received = max(0, Δbank + drawn + fees + sent)` and
  // nets it into "down ฿X". An account OUTFLOW with no counter of its own makes that sum
  // negative, the max() zeroes it, and the outflow vanishes from every figure: rent the desk
  // runs on the card (_chargeRent, "Light pockets; the desk runs your card instead") is the one
  // the scenarios hit — the 400/270 a night that the I1 rows below cannot place. The same
  // clamp would swallow any other card/transfer spend (TRANSFER KEY MONEY, the lawyer's bill,
  // the deposit by transfer). Fix: compute the night's figure from pocket + account together
  // and keep arrivals as an explicit counter (a quest reward by app, a texted transfer, Nont's
  // held notes landing), rather than inferring them from a residual and clamping it.
  ..._OPEN("A: an account outflow with no counter (rent run on the card) is clamped out of the ledger — _morningLedger's received = max(0, …)", [
    "tourist-account#n1:I1:conservation", "tourist-account#n1:I2:spent",       // ฿80 printed; ฿480 left (฿400 rent off the card)
    "expat-overdue#n7:I1:conservation", "expat-overdue#n7:I2:spent",           // the cousins empty the pocket; ฿270 rent off the card unprinted
    "expat-overdue#n8:I1:conservation", "expat-overdue#n8:I2:spent",
    "expat-blackout#n1:I1:conservation", "expat-blackout#n1:I2:spent",         // the rough wake empties the pocket; the card pays ฿270, unprinted
    "expat-blackout#n2:I1:conservation", "expat-blackout#n2:I2:spent",
  ]),
  // B — Nont's cut is missing from the received sum. _nontCash takes `n` from the account and
  // puts `n - cut` in the pocket, booking `n - cut` to G.atmTotal (as `drawn`) and `cut` to
  // G.nontCut. _morningLedger's received = Δbank + drawn + fees + sent leaves the cut out, so a
  // night with Nont's notes AND a real arrival understates the arrival by the cut and overstates
  // "down" by it: a ฿300 recce reward and CASH 2000 printed "down ฿300 … ฿200 arrived in the
  // account" for a true "down ฿200 … ฿300 arrived". Fix: add nontCutN to the received sum.
  ..._OPEN("B: _morningLedger's received sum omits Nont's cut (nontCutN), so an arrival on a CASH night is understated by the cut and down overstated by it", [
    "tourist-account#n2:I1:conservation", "tourist-account#n2:I2:spent", "tourist-account#n2:I2:received",
  ]),
  // C — Nont's bar loan: the garnish never reduces the principal. _barNight takes a quarter of
  // the take off the top and lowers b.loan.owed, but not b.loan.left, so every pocket REPAY
  // NONT is booked as principal (_loanPrincipal) and the loan's interest is never named on any
  // surface: borrow ฿10,000 (owe ฿11,000), garnishes ฿2,005 + ฿1,024, repay ฿2,000 then
  // ฿5,971 — ฿11,000 paid, ฿1,000 of it interest, and the morning says "฿5,971 repaid to Nont"
  // with no interest and "down ฿270". BOOKS meanwhile prints the whole ฿3,029 of garnish as
  // "Nont's cut", a cost. Fix: _loanPrincipal(b.loan, garnish, …) in _barNight (and decide which
  // surface carries the interest — the audit's principal-first reading puts it on the last repay).
  ..._OPEN("C: _barNight's garnish lowers b.loan.owed but not b.loan.left, so REPAY NONT is all principal and the loan's interest is never named", [
    "owner-nontloan#n3:I2:spent", "owner-nontloan#n3:I2:nontInt",
  ]),
  // D — CHECK BIN at your own rail reads a till DRAW as a refund and a PUT as a slip.
  // _doCheckBin's `moved` nets out G.offTill, Nira's loan and G.atmTotal, but not the owner's own
  // till: DRAW 1000 after a ฿150 lady drink printed "nothing in it" (since − pocket − moved was
  // −850, clamped to 0), and PUT 500 IN TILL would be counted as a ฿500 slip. Fix: arriveBook
  // also keeps G.bar.drawn and G.bar.floated (and Nont's bar loan), and `moved` nets them.
  ..._OPEN("D: _doCheckBin's moved ignores DRAW / PUT IN TILL at your own bar (arriveBook lacks G.bar.drawn and G.bar.floated)", [
    "owner-stood#n1:I4:checkbin@stinky_bar",
  ]),
  // E — money that rings into your own till with no BOOKS line. (1) _partyArrive
  // (engine-systems.js) at your own bar credits G.bar.cash with the companion's drink but never
  // adds it to G.bar.guestDrinks, the line BOOKS prints for exactly that ("the drinks of the girl
  // you brought in from another bar"); the ordinary BUY DRINK FOR her does. (2) _c4Input
  // (engine-play.js:~1071) puts a lost Connect 4 stake in your own till ("joins the till") and
  // books it nowhere — no line, no _barEvent. Each leaves the till ฿N off its own itemisation.
  ..._OPEN("E1: _partyArrive at your own bar rings her drink into the till without G.bar.guestDrinks", ["owner-party#n1:I3:till"]),
  ..._OPEN("E2: _c4Input puts a lost stake in your own till with no BOOKS line (_barEvent or a field)", ["owner-games#n1:I3:till"]),
  // F — money printed without its thousands separator. Round 68 linted `฿${…}` without _num,
  // but two other shapes print raw figures: a number handed to _fmt as a raw param ("฿{take}",
  // "฿{amt}", "฿{cash}" — the settle line, BOOKS' itemised night and till, DRAW, the shift call's
  // ฿2500) and plain concatenation ("฿" + G.money — the beer/water/lady-drink "(฿7920 left.)"
  // lines, the ST/LT/TAKE HER OUT menu, the motel). Fix at the sites, or have _fmt format any
  // numeric param that follows a ฿, and widen the round68d lint to both shapes.
  ..._OPEN("F: raw ฿ figures (no separator) via _fmt numeric params and \"฿\" + n concatenation", [
    "fmt:buy", "fmt:barfine", "fmt:get", "fmt:wait", "fmt:draw", "fmt:sleep", "fmt:books",
  ]),
];

// --mutate <name>: break one counter on purpose, to show the instrument goes red when the
// books are wrong (a tool that does no work reports no findings — the test runs these).
const _mutAt = args.indexOf("--mutate");
const MUTATE = _mutAt >= 0 ? (args[_mutAt + 1] || "") : "";
const STATS = { scenarios: 0, nights: 0, ledgers: 0, tills: 0, bins: 0, steps: 0 };   // proof the instrument did work

// ── the accountant ──────────────────────────────────────────────────────────
const bal = () => ({ p: G.money || 0, b: G.bank || 0, s: G.nontStuck || 0, t: (G.bar && G.bar.cash) || 0 });
const W = (x) => x.p + x.b + x.s;   // pocket + account + money in transit at Nont's
let A = null;      // the audit's state for the running scenario
const ctx = [];    // attribution context: the step's kind, overridden inside wrapped engine functions

function newBook() {
  return { cons: 0, machine: 0, fees: 0, nontNotes: 0, nontCut: 0, niraIn: 0, niraOut: 0, niraInt: 0,
    nontIn: 0, nontOut: 0, nontInt: 0, sent: 0, tillDraw: 0, topUp: 0, barBills: 0, bankIn: 0, w0: 0, cmds: [] };
}
function cur() { return ctx.length ? ctx[ctx.length - 1] : "spend"; }
function flush(kind) {
  if (!A) return;
  const now = bal(), m = A.mark;
  const d = { p: now.p - m.p, b: now.b - m.b, s: now.s - m.s, t: now.t - m.t };
  A.mark = now;
  if (d.p || d.b || d.s || d.t) attribute(d, kind);
}
function principalFirst(leftKey, amt) {
  const p = Math.min(amt, Math.max(0, A[leftKey]));
  A[leftKey] -= p;
  return amt - p;   // the interest part
}
function attribute(d, kind) {
  const bk = A.book, w = d.p + d.b + d.s;
  A.till.moves[kind] = (A.till.moves[kind] || 0) + d.t;
  switch (kind) {
    case "atm": bk.machine += d.p; bk.fees += -w; bk.cons += -w; break;
    case "nontcash": bk.nontNotes += d.p; bk.nontCut += -w; bk.cons += -w; break;
    case "borrow-nira": bk.niraIn += w; A.niraLeft += w; break;
    case "repay-nira": { const o = -w; bk.niraOut += o; bk.niraInt += principalFirst("niraLeft", o); break; }
    case "borrow-nont": bk.nontIn += w; A.nontLeft += w; break;
    case "repay-nont": { const o = -w; bk.nontOut += o; bk.nontInt += principalFirst("nontLeft", o); break; }
    case "send": bk.sent += -d.b; bk.cons += -(d.p + d.s); break;
    case "draw": bk.tillDraw += d.p; bk.cons += -(d.b + d.s); break;
    case "put": bk.barBills += -d.p; bk.cons += -(d.b + d.s); break;
    case "barnight": bk.topUp += -d.p; bk.barBills += -d.p; bk.cons += -(d.b + d.s); break;
    case "barmonthly": case "barsettle": bk.barBills += -d.p; bk.cons += -(d.b + d.s); break;
    case "income": bk.bankIn += d.b; bk.cons += -(d.p + d.s); break;
    case "none":
      if (w) finding("I0", "readonly", 0, w, `a read-only command moved ฿${w} (pocket ${d.p}, account ${d.b})`);
      bk.cons += -w; break;
    default: bk.cons += -w;   // "spend", "rent": money left you for something
  }
}
// wrap an engine function so the money it moves is attributed to `kind`
function wrap(name, kind, after, before) {
  const orig = globalThis[name];
  if (typeof orig !== "function") throw new Error("money-audit: no engine function " + name);
  globalThis[name] = function (...a) {
    flush(cur()); ctx.push(kind);
    const pre = before ? before(...a) : null;
    try { return orig.apply(this, a); }
    finally { flush(kind); ctx.pop(); if (after) after(pre, ...a); }
  };
}
const loanOwed = () => (G.bar && G.bar.loan && G.bar.loan.owed) || 0;
wrap("_chargeRent", "rent");
// Nont's garnish comes off the till inside the night's settle. It is a payment on HIS loan,
// so the audit's own principal-first book counts it: what the pocket repays later is then
// principal only as far as the garnishes left any.
wrap("_barNight", "barnight", (owed0) => {
  if (!A) return;
  const g = owed0 - loanOwed();
  if (g > 0) { const p = Math.min(g, Math.max(0, A.nontLeft)); A.nontLeft -= p; A.garnish += g; }
}, loanOwed);
wrap("_barMonthly", "barmonthly");
// _endNight settles the bar AFTER the morning ledger and the snapshot, so the settle books the
// night just closed (A.night - 1) and its pocket bills fall in the next ledger's window — which
// is why the ledger excludes G.bar.pocketDrawn and names only the till's top-up (pocketNight).
wrap("_barSettle", "barsettle", () => {
  if (A && _barOwned()) { A.till.settled = true; A.till.night = A.night - 1; A.till.cmds = (A.prevCmds || []).slice(); }
});
wrap("_loanNightRoll", "repay-nira");
wrap("_questTick", "income");
wrap("_readMessages", "income");
{ // the window boundaries: the ledger reads the book; the snapshot opens a new one
  const ledger = globalThis._morningLedger;
  globalThis._morningLedger = function (...a) {
    flush(cur());
    const pre = { pocketDrawn: (G.bar && G.bar.pocketDrawn) || 0, baseline: !!G.lastNight, roughLost: G.roughLost || 0 };
    const r = ledger.apply(this, a);
    if (A && pre.baseline) checkLedger(pre);
    return r;
  };
  const snap = globalThis._nightSnapshot;
  globalThis._nightSnapshot = function (...a) {
    flush(cur());
    const r = snap.apply(this, a);
    if (A) { A.prevCmds = A.book.cmds; A.book = newBook(); A.book.w0 = W(bal()); A.night++; STATS.nights++; }
    return r;
  };
  const arrive = globalThis._arriveAt;
  globalThis._arriveAt = function (to, ...rest) {
    flush(cur());
    const r = arrive.call(this, to, ...rest);
    if (A && G.room === to) { A.slips[to] = 0; A.sat = to; }
    return r;
  };
}

// ── the findings ────────────────────────────────────────────────────────────
let FINDINGS = [];
function finding(inv, field, expected, got, msg, night = A.night, cmds = null) {
  const key = `${A.id}#n${night}:${inv}:${field}`;
  if (FINDINGS.some(f => f.key === key)) return;
  FINDINGS.push({ key, scenario: A.id, night, inv, field, expected, got, msg,
    commands: cmds || (A.book ? A.book.cmds.slice() : []), said: (inv === "I1" || inv === "I2") ? ((G.lastNightSaid || [])[0] || "") : "" });
}

// ── reading the printed surfaces ───────────────────────────────────────────
const N = (s) => parseInt(String(s).replace(/,/g, ""), 10);
function parseLedger(line) {
  const P = { spent: 0, machine: 0, fees: 0, nontNotes: 0, nontCut: 0, niraIn: 0, niraOut: 0, niraInt: 0,
    nontIn: 0, nontOut: 0, nontInt: 0, sent: 0, tillDraw: 0, topUp: 0, received: 0 };   // a rough wake's "lifted" is inside down/up
  const g = (re) => { const m = line.match(re); return m; };
  let m;
  if ((m = g(/down ฿([\d,]+) on the night/))) P.spent = N(m[1]);
  if ((m = g(/up ฿([\d,]+) on the night/))) P.spent = -N(m[1]);
  if ((m = g(/฿([\d,]+) came out of the machine(?:, ฿([\d,]+) of that in fees)?/))) { P.machine = N(m[1]); P.fees = m[2] ? N(m[2]) : 0; }
  if ((m = g(/฿([\d,]+) through Nont, ฿([\d,]+) his cut/))) { P.nontNotes = N(m[1]); P.nontCut = N(m[2]); }
  if ((m = g(/Nont's ฿([\d,]+) cut, the rest held/))) P.nontCut = N(m[1]);
  if ((m = g(/฿([\d,]+) drawn from your own till/))) P.tillDraw = N(m[1]);
  if ((m = g(/฿([\d,]+) of your own money into the till/))) P.topUp = N(m[1]);
  if ((m = g(/฿([\d,]+) borrowed from Nira/))) P.niraIn = N(m[1]);
  if ((m = g(/฿([\d,]+) repaid to Nira(?: \(฿([\d,]+) of it interest\))?/))) { P.niraOut = N(m[1]); P.niraInt = m[2] ? N(m[2]) : 0; }
  if ((m = g(/฿([\d,]+) borrowed from Nont/))) P.nontIn = N(m[1]);
  if ((m = g(/฿([\d,]+) repaid to Nont(?: \(฿([\d,]+) of it interest\))?/))) { P.nontOut = N(m[1]); P.nontInt = m[2] ? N(m[2]) : 0; }
  if ((m = g(/฿([\d,]+) sent from the account/))) P.sent = N(m[1]);
  if ((m = g(/฿([\d,]+) arrived in the account/))) P.received = N(m[1]);
  return P;
}

function checkLedger(pre) {
  STATS.ledgers++;
  const bk = A.book, line = (G.lastNightSaid || [])[0] || "";
  const P = parseLedger(line);
  const wNow = W(bal()), dW = wNow - bk.w0;
  // I1 — the printed ledger closes against the balances
  const recon = -P.spent - P.sent - pre.pocketDrawn + P.tillDraw + P.niraIn + P.nontIn
    - (P.niraOut - P.niraInt) - (P.nontOut - P.nontInt);
  if (recon !== dW)
    finding("I1", "conservation", dW, recon,
      `pocket+account+transit moved ฿${dW} over the night; the ledger's printed figures account for ฿${recon} ` +
      `(unexplained ฿${dW - recon})`);
  // I2 — each printed figure against the audit's own book
  const exp = {
    spent: bk.cons + bk.niraInt + bk.nontInt - bk.bankIn,
    machine: bk.machine, fees: bk.machine ? bk.fees : 0, nontNotes: bk.nontNotes, nontCut: bk.nontCut,
    niraIn: bk.niraIn, niraOut: bk.niraOut, niraInt: bk.niraInt, nontIn: bk.nontIn, nontOut: bk.nontOut, nontInt: bk.nontInt,
    sent: bk.sent, tillDraw: bk.tillDraw, topUp: bk.topUp, received: bk.bankIn,
  };
  for (const k of Object.keys(exp))
    if (exp[k] !== P[k]) finding("I2", k, exp[k], P[k], `the ledger prints ${k} ฿${P[k]}; the audit's book says ฿${exp[k]}`);
  if (VERBOSE) console.log(`   [${A.id} n${A.night}] ${line}\n      book: ${JSON.stringify(Object.fromEntries(Object.entries(bk).filter(([k, v]) => k !== "cmds" && v)))} ΔW=${dW}`);
}

// I3 — read BOOKS after an owner's settle, and close the till
function checkTill() {
  const T = A.till;
  if (!T.settled) return;
  T.settled = false; STATS.tills++;
  out = [];
  step({ c: "books", k: "none" });
  const txt = out.join("\n");
  const m = txt.match(/Last night: ฿([\d,]+) in(?:[^.]*?)\. Out: ([^—]*)—/);
  const tNow = bal().t;
  if (!m) { finding("I3", "books-line", "a Last night line", "none", "BOOKS printed no itemised night after a settle", T.night, T.cmds); T.mark = tNow; T.moves = {}; T.draws = 0; T.puts = 0; return; }
  const items = {};
  for (const part of m[2].split("·")) {
    const mm = part.match(/^\s*(.*?)\s*฿([\d,]+)/);
    if (mm) items[mm[1].replace(/\s*\(.*\)$/, "")] = N(mm[2]);
  }
  const take = N(m[1]);
  const costs = Object.values(items).reduce((a, b) => a + b, 0);
  const pick = (re) => { const x = txt.match(re); return x ? N(x[1]) : 0; };
  const own = pick(/Your own girls' drinks, on your chit and into the till: ฿([\d,]+)/);
  const guest = pick(/brought in from another bar, on your chit and into the till: ฿([\d,]+)/);
  const glass = pick(/Your own glass: ฿([\d,]+) of wholesale/);
  const monthly = -(T.moves.barmonthly || 0);   // the month's bill off the till, measured (it is printed in the settle prose, not in BOOKS)
  const expected = take - costs + own + guest - glass - T.draws + T.puts + T.topUp - monthly;
  const actual = tNow - T.mark;
  if (VERBOSE) console.log(`   [${A.id} till] Δ${actual} vs BOOKS ${expected} (in ${take}, out ${JSON.stringify(items)}, own ${own}, guest ${guest}, glass ${glass}, draws ${T.draws}, puts ${T.puts}, top-up ${T.topUp}, month ${monthly}); moves ${JSON.stringify(T.moves)}`);
  if (expected !== actual)
    finding("I3", "till", actual, expected,
      `the till moved ฿${actual} from one settle to the next; BOOKS (in ฿${take}, out ${JSON.stringify(items)}, own girls ฿${own}, ` +
      `guests ฿${guest}, own glass ฿${glass}) with draws ฿${T.draws}, puts ฿${T.puts}, top-up ฿${T.topUp}, month ฿${monthly} accounts for ฿${expected} ` +
      `(unexplained ฿${actual - expected}; mid-night moves by kind ${JSON.stringify(T.moves)})`, T.night, T.cmds);
  T.mark = tNow; T.moves = {}; T.draws = 0; T.puts = 0; T.topUp = 0;
}

// I5 — a figure the player reads carries its separator. Round 68 made `฿${…}` wrap _num and
// linted the raw form, but a number handed to _fmt as a raw param ("฿{take}") or concatenated
// ("฿" + G.money) passes that lint and prints "฿8741". Keyed on the command's VERB, not on
// the scenario, the night or the prose (pools vary), so a surface is one row with examples.
function checkFormat(txt, cmd) {
  const re = /฿-?(\d{4,})(?![\d,])/g;
  const verb = String(cmd).split(/\s+/)[0];
  const key = `fmt:${verb}`;
  let m;
  while ((m = re.exec(txt))) {
    const around = "…" + txt.slice(Math.max(0, m.index - 40), m.index + m[0].length + 24).replace(/\s+/g, " ") + "…";
    let f = FINDINGS.find(x => x.key === key);
    if (!f) {
      f = { key, scenario: A.id, night: A.night, inv: "I5", field: "separator", expected: "฿" + _num(N(m[1])), got: "฿" + m[1], examples: [], commands: [] };
      FINDINGS.push(f);
    }
    if (f.examples.length < 6 && !f.examples.some(e => e.replace(/\d/g, "") === around.replace(/\d/g, ""))) { f.examples.push(around); if (!f.commands.includes(cmd)) f.commands.push(cmd); }
    f.msg = `฿ figures printed without the thousands separator after ${verb.toUpperCase()}: ${f.examples.join(" | ")}`;
  }
}

// ── a step ─────────────────────────────────────────────────────────────────
// A step is a command and what it MEANS: { c, k (kind), slip (a CHECK BIN slip), rand
// (a constant for _rand during this one command), go (arrive somewhere first) }.
function step(s) {
  if (typeof s === "string") s = { c: s };
  const kind = s.k || "spend";
  if (s.go) { // arrive the way walking does: the street outside, then _arriveAt
    if (s.go === HOME) s = { ...s, go: _hotelRoomId() };
    const street = Object.keys(ROOMS).find(r => (ROOMS[r].venues || []).includes(s.go));
    if (street && G.room !== street) G.room = street;
    const pg = G.money;
    out = [];
    ctx.push("spend"); const sr = _rand; if (s.rand != null) globalThis._rand = () => s.rand; try { _arriveAt(s.go); } finally { flush("spend"); ctx.pop(); globalThis._rand = sr; }
    if (args.includes("--trace")) console.log(`  > [n${A.night} → ${s.go}]  (฿${pg}→฿${G.money})\n      ` + out.join("\n").replace(/\n/g, "\n      ").slice(0, 600));
    checkFormat(out.join("\n"), "go");
    if (s.slipGo && A.slips[s.go] != null) A.slips[s.go] += pg - G.money;   // her drinks at the door are on this bar's chit
    if (G.room !== s.go) throw new Error(`${A.id}: could not arrive at ${s.go} (in ${G.room}): ${out.slice(-3).join(" | ")}`);
    if (!s.c) return;
  }
  s = resolve(s);   // a name only the room you now stand in can give
  if (s.fn) { ctx.push(kind); try { s.fn(); } finally { flush(kind); ctx.pop(); } }
  if (!s.c) return;
  const savedRand = _rand;
  if (s.rand != null) globalThis._rand = () => s.rand;
  const p0 = G.money, room = G.room;
  A.book.cmds.push(s.c); STATS.steps++;
  out = [];
  ctx.push(kind);
  try { doCommand(s.c); }
  finally { flush(kind); ctx.pop(); globalThis._rand = savedRand; }
  const txt = out.join("\n");
  A.log.push({ night: A.night, c: s.c, out: txt });
  if (args.includes("--trace")) console.log(`  > [n${A.night} ${room}] ${s.c}  (฿${p0}→฿${G.money}, bank ฿${G.bank})\n      ` + txt.replace(/\n/g, "\n      ").slice(0, 900));
  if (s.slip && A.slips[room] != null) A.slips[room] += p0 - G.money;
  if (kind === "draw") { const m = txt.match(/฿([\d,]+) out of the till/); A.till.draws += m ? N(m[1]) : 0; }
  if (kind === "put") { const m = txt.match(/฿([\d,]+) of your own into the float/); A.till.puts += m ? N(m[1]) : 0; }
  { const m = txt.match(/฿([\d,]+) of your own money went in to keep the lights on/); if (m) A.till.topUp += N(m[1]); }
  if (/^check bin$/.test(s.c)) {   // I4
    STATS.bins++;
    const m = txt.match(/฿([\d,]+) since you sat down/);
    const got = m ? N(m[1]) : (/nothing in it/.test(txt) ? 0 : null);
    const exp = A.slips[room] != null ? A.slips[room] : 0;
    if (got !== exp) finding("I4", "checkbin@" + room, exp, got, `CHECK BIN at ${room} printed ฿${got}; the slips since you sat down came to ฿${exp}`);
  }
  checkFormat(txt, s.c);
  if (s.expect && !s.expect.test(txt)) throw new Error(`${A.id}: "${s.c}" did not do what the scenario needs (${s.expect}): ${txt.slice(0, 300)}`);
  checkTill();
}

// ── the setups, built through the game's own functions ───────────────────────
const IDENT = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.pendingEnc = null; G.lastSaleng = 1e9; G.lastPolice = 1e9; };
function tourist({ day = 3, money = 8000, bank = 80000, seed = 424242 } = {}) {
  newGame();
  G.rng = seed;
  G.player = { ...IDENT };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = day;
  G.money = money; G.bank = bank; G.battery = 100; G.nightTurn = 8;
  _setFlag("roomSafeOpened"); G.act1SafeDue = false;
  G.room = _hotelRoomId();
  quiet();
}
// tools/persona-seed.mjs's expatOwner, verbatim in its moves (that file runs at import)
function owner({ season0 = null, day = 14, money = 9000, bank = 60000, seed = 777 } = {}) {
  newGame();
  G.rng = seed;
  G.player = { ...IDENT };
  if (season0 != null) G.season0 = season0;
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 8;
  out = []; _goExpat();
  G.quests.plg_deal = "done"; _setFlag("plgResolved");
  G.quests.bar_premises = "done"; _setFlag("barPremises");
  G.quests.nominee_deal = "done"; _setFlag("nomineeWarned");
  G.quests.bar_licence = "done"; _setFlag("barLicence");
  G.room = _npcRoom("tan"); G.nightTurn = 30;
  G.partnerWho = "tan"; G.pendingChoice = "partner"; out = []; _partnerYes();
  G.quests.bar_partner = "done";
  G.room = "stinky_bar"; G.bank = 200000; G.money = 5000; out = []; _barDeposit();
  if (!_flag("barPaid")) throw new Error("deposit did not clear: " + out.join(" | "));
  out = []; if (G.bar.lease && !G.bar.lease.paid) _leaseTransfer();
  _setFlag("barOpen"); G.quests.bar_opening = "done";
  for (let n = 0; n < 30 && G.day < day; n++) { G.room = "stinky_bar"; G.nightTurn = 12; out = []; _doWork(); G.bar.stoodTurns = WORK_MIN_STOOD; G.room = _hotelRoomId(); _endNight("sleep"); }
  G.money = money; G.bank = bank; G.room = _hotelRoomId(); G.nightTurn = 8; G.battery = 100;
  G.hunger = 10; G.thirst = 10; G.soc.drunk = 0; G.hurt = 0; G.pendingChoice = null;
  _setFlag("roomSafeOpened"); G.act1SafeDue = false;
  quiet();
}

// an expat without a bar: the endless calendar, for a debt that has time to go overdue
function expat({ money = 3000, bank = 60000, seed = 99 } = {}) {
  newGame();
  G.rng = seed;
  G.player = { ...IDENT };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); G.day = 8;
  out = []; _goExpat();
  G.money = money; G.bank = bank; G.room = _hotelRoomId(); G.nightTurn = 8; G.battery = 100;
  _setFlag("roomSafeOpened"); G.act1SafeDue = false;
  quiet();
}

// ── the scenarios ──────────────────────────────────────────────────────────
// A night is a list of steps; it ends by its own last step (SLEEP, a LONG TIME, the
// clock) or, failing that, by SLEEP at home. A `dyn` step is a function returning steps,
// evaluated when it is reached (a name or a count only the running game knows).
// `quick: true` puts a scenario in the --quick subset.
const HOME = "@hotel";
const drinks = (who, n) => Array.from({ length: n }, () => ({ c: "buy drink for " + who, slip: true }));
// stand a shift: wait at your own rail until it counts, answering any call put to you NO
const standShift = (rounds = 8) => Array.from({ length: rounds }, () => ({ dyn: () =>
  G.pendingChoice ? [{ c: "no" }] : ((G.bar.stoodTurns || 0) >= WORK_MIN_STOOD + 2 ? [] : [{ c: "wait 5" }]) }));
const clearModal = { dyn: () => (G.pendingChoice || G.pendingEnc) ? [{ c: "no" }] : [] };
// Nont's "account is having a moment" is a pure hash of (vacation, day, count): CASH until it sticks
const cashUntilStuck = { dyn: () => {
  for (let k = 1; k <= 24; k++)
    if (_hh("nontstuck:" + G.vacation + ":" + G.day + ":" + ((G.nontCashCount || 0) + k), 71) % 6 === 0)
      return Array.from({ length: k }, () => ({ c: "cash 500", k: "nontcash" }));
  return [];
} };
const SCENARIOS = [
  { id: "tourist-bar", quick: true, setup: () => tourist({ day: 3 }), nights: [
    [ // beers, lady drinks, a tip, the saleng, a short time, the ATM, a massage, the clinic, a bus and a bike
      { go: "candy_bar", c: "buy beer", slip: true, rand: 0.99, expect: /฿/ },
      { c: "buy drink for @girl", slip: true, expect: /฿/ },
      { c: "tip @girl 100", expect: /฿100/ },
      { c: "buy water", slip: true },
      { c: "check bin", k: "none" },
      { fn: () => _salengSpawn() },
      { c: "buy @saleng", expect: /฿/ },
      { c: "check bin", k: "none" },
      ...drinks("@girl", 4),
      { c: "barfine @girl", rand: 0.5, expect: /SHORT TIME/ }, { c: "short time", slip: true, rand: 0.5, expect: /฿/ },
      { c: "check bin", k: "none" },
      { go: "buakhao_klang", c: "withdraw 2000", k: "atm", expect: /counts out/ },
      { go: "klang_massage", c: "thai massage", rand: 0.5, expect: /฿/ },
      { go: "buakhao_klang", c: "bus" }, { c: "old market" }, { c: "pay 15", expect: /฿15/ },
      { go: "second_rd_c", c: "get tested" },
      { c: "motosai to hotel", expect: /฿/ },
      { c: "sleep" },
    ],
    [ // Nira: borrow; Nont's notes; a send
      { go: "neon_paradise", c: "borrow 5000", k: "borrow-nira", expect: /counts out/ },
      { c: "buy beer", slip: true },
      { c: "check bin", k: "none" },
      { go: "buakhao_market", c: "cash 5000", k: "nontcash", expect: /Five percent|moment/ },
      { go: "candy_bar", c: "buy drink for @girl", slip: true, rand: 0.99 }, { c: "contact @girl" },
      { c: "send 500 to @girl", k: "send", expect: /฿500/ },
      { go: HOME, c: "sleep" },
    ],
    [ // repay part, then the rest (the interest); a long time ends the night
      { go: "neon_paradise", c: "repay 3000", k: "repay-nira", expect: /฿3,000/ },
      { c: "check bin", k: "none" },
      { c: "repay", k: "repay-nira", expect: /Paid/ },
      { c: "check bin", k: "none" },
      { go: "candy_bar", c: "buy beer", slip: true, rand: 0.99 },
      ...drinks("@girl", 4),
      { c: "barfine @girl", rand: 0.99, expect: /LONG TIME/ }, { c: "long time", rand: 0.99 }, { c: "long time", rand: 0.99 },
      clearModal,
    ],
  ] },
  { id: "tourist-account", quick: true, setup: () => tourist({ day: 3, money: 300, bank: 50000, seed: 31337 }), nights: [
    [ // light pockets: the hotel runs the card at the wake
      { go: "candy_bar", c: "buy beer", slip: true },
      { go: HOME, c: "sleep" },
    ],
    [ // a quest reward through the bank app, and Nont's notes, on one night
      { fn: () => { G.quests.recce = "active"; _setFlag("recceDone"); } },
      { go: "buakhao_market", c: "look", expect: /bank app/ },
      { c: "cash 2000", k: "nontcash", expect: /Five percent/ },
      { go: HOME, c: "sleep" },
    ],
    [ // Nont's account "has a moment" — it lands at the wake, inside the same night's book
      { go: "buakhao_market" },
      cashUntilStuck,
      { go: HOME, c: "sleep" },
    ],
  ] },
  { id: "tourist-party", quick: true, setup: () => tourist({ day: 3, money: 9000, bank: 40000, seed: 8080 }), nights: [
    [ // TAKE HER OUT: her whole night, her drinks auto-billed at the next door, the motel, a goodnight
      { go: "candy_bar", c: "buy beer", slip: true, rand: 0.99 },
      ...drinks("@girl", 5),
      { c: "barfine @girl", rand: 0.99, expect: /TAKE HER OUT/ }, { c: "take her out", slip: true, rand: 0.99, expect: /฿/ },
      { go: "silk_rose", slipGo: true, rand: 0.99 },
      { c: "buy beer", slip: true },
      { c: "check bin", k: "none" },
      { go: "short_time_motel", c: "get room", rand: 0.5, expect: /฿/ },
      { c: "send @girl home", expect: /฿/ },
      { go: HOME, c: "sleep" },
    ],
  ] },
  { id: "expat-overdue", quick: false, setup: () => expat({ money: 3000, bank: 60000 }), nights: [
    [ { go: "neon_paradise", c: "borrow 2000", k: "borrow-nira", expect: /counts out/ }, { go: HOME, c: "sleep" } ],
    ...Array.from({ length: 6 }, () => [ { go: HOME, c: "sleep" } ]),   // due, then strikes; the cousins collect at the third
    [ { go: "neon_paradise", c: "repay", k: "repay-nira" }, { go: HOME, c: "sleep" } ],
  ] },
  { id: "owner-stood", quick: true, setup: () => owner({ day: 14, money: 9000, bank: 60000 }), nights: [
    [ // a stood shift, the guv'nor's own glass, his girls' drinks, the till in and out, CHECK BIN at his own rail
      { go: "stinky_bar", c: "work", expect: /working tonight/ },
      ...standShift(),
      { c: "buy beer", expect: /own stock/ },
      { c: "buy water", expect: /own stock/ },
      { c: "buy drink for manow", slip: true, expect: /฿/ },
      { c: "check bin", k: "none" },
      { c: "draw 1000", k: "draw", expect: /out of the till/ },
      { c: "check bin", k: "none" },
      { c: "put 500 in till", k: "put", expect: /into the float/ },
      { c: "check bin", k: "none" },
      { go: HOME, c: "sleep" },
    ],
    [ // a night away: Bert stands it
      { go: "candy_bar", c: "buy beer", slip: true },
      { go: HOME, c: "sleep" },
    ],
  ] },
  { id: "owner-levers", quick: false, setup: () => owner({ day: 16, money: 9000, bank: 60000, seed: 4242 }), nights: [
    [ // PRICES UP, then a stood night at the dear board
      { go: "stinky_bar", c: "prices up", expect: /Fifteen/ }, { c: "work" }, ...standShift(), { c: "buy drink for manow" },
      { go: HOME, c: "sleep" },
    ],
    [ // TERMS SALARY, then a night away on the flat wage
      { go: "stinky_bar", c: "terms salary", expect: /Salary/ }, clearModal,
      { go: HOME, c: "sleep" },
    ],
    [ { go: "stinky_bar", c: "prices list" }, { go: HOME, c: "sleep" } ],
  ] },
  { id: "owner-nontloan", quick: true, setup: () => owner({ day: 14, money: 4000, bank: 30000, seed: 5150 }), nights: [
    [ // BORROW at Nont's table: the money comes to the pocket, the garnish off the till
      { go: "buakhao_market", c: "borrow 10000", k: "borrow-nont", expect: /counts ฿10,000/ },
      { go: "stinky_bar", c: "work" }, ...standShift(),
      { go: HOME, c: "sleep" },
    ],
    [ // the garnish again, and a part repayment at his table
      { go: "buakhao_market", c: "repay nont 2000", k: "repay-nont", expect: /฿2,000/ },
      { go: HOME, c: "sleep" },
    ],
    [ // the rest, interest and all
      { go: "buakhao_market", c: "repay nont", k: "repay-nont", expect: /Square/ },
      { go: HOME, c: "sleep" },
    ],
  ] },
  { id: "owner-party", quick: false, setup: () => owner({ day: 15, money: 9000, bank: 40000, seed: 6060 }), nights: [
    [ // a girl from another bar on your arm, at your own rail: her drinks ring into your till
      { go: "candy_bar", c: "buy beer", slip: true, rand: 0.99 },
      ...drinks("@girl", 5),
      { c: "barfine @girl", rand: 0.99, expect: /TAKE HER OUT/ }, { c: "take her out", rand: 0.99, expect: /฿/ },
      { go: "stinky_bar", rand: 0.99 },
      { c: "buy drink for @girl", expect: /฿/ },
      { c: "send @girl home" },
      { go: HOME, c: "sleep" },
    ],
    [ { go: HOME, c: "sleep" } ],
  ] },
  { id: "owner-games", quick: false, setup: () => owner({ day: 15, money: 9000, bank: 40000, seed: 1212 }), nights: [
    [ // a stake lost at Connect 4 on your own rail ("joins the till"), the bell, a tip to your own girl
      { go: "stinky_bar", c: "play connect 4 100", expect: /฿100|stake/i },
      ...Array.from({ length: 22 }, () => ({ dyn: () => (G.game && G.game.type === "c4") ? [{ c: "drop 1" }] : [] })),
      { c: "ring bell" },
      { c: "tip manow 100" },
      { go: HOME, c: "sleep" },
    ],
    [ { go: HOME, c: "sleep" } ],
  ] },
  { id: "expat-blackout", quick: false, setup: () => expat({ money: 5000, bank: 20000, seed: 4040 }), nights: [
    [ // drink until the night ends where you stand: the rough wake turns the pockets out
      { go: "candy_bar", c: "buy beer", rand: 0.99 },
      ...Array.from({ length: 16 }, () => ({ c: "buy beer" })),
    ],
    [ { go: HOME, c: "sleep" } ],
  ] },
  { id: "owner-month", quick: false, setup: () => owner({ day: 35, money: 6000, bank: 40000, seed: 2718 }), nights: [
    // the thirtieth night from opening: rent and the note come off the till, then off the pocket
    [ { go: "stinky_bar", c: "work" }, ...standShift(), { go: HOME, c: "sleep" } ],
    [ { go: HOME, c: "sleep" } ],
    [ { go: "stinky_bar", c: "draw all", k: "draw", expect: /out of the till/ }, { go: HOME, c: "sleep" } ],   // an empty till the night the bill falls
    [ { go: HOME, c: "sleep" } ],
  ] },
];

// steps that need run-time names (a saleng item) are resolved as they run
function resolve(s) {
  if (typeof s !== "object" || !s.c) return s;
  let c = s.c;
  if (c.includes("@saleng")) {
    const items = typeof _salengItems === "function" ? _salengItems() : [];
    const it = items[0];
    c = c.replace("@saleng", it ? (it.item || it.name || it) : "noodles");
  }
  if (c.includes("@girl")) {
    // a hostess on THIS floor tonight, chosen once a night: not the one the rail's regular is
    // keeping in colas, not a drinks-only girl, not a draw or a kept girl (each refuses a barfine)
    if (!A.girl || A.girlNight !== A.night || (!_npcsHere().includes(A.girl) && !((G.party && G.party.ids) || []).includes(A.girl))) {
      const busy = (G.soc.patronBusy || {})[G.room];
      A.girl = _npcsHere().find(id => NPC_ROLES[id] === "hostess" && id !== busy &&
        !(typeof _drinksOnly === "function" && _drinksOnly(id)) && !(typeof _isDraw === "function" && _isDraw(id)) &&
        !(typeof _hasSponsor === "function" && _hasSponsor(id)) && !(typeof _soleStaff === "function" && _soleStaff(id))) || null;
      A.girlNight = A.night;
      if (!A.girl) throw new Error(`${A.id}: no hostess to court at ${G.room}`);
    }
    c = c.replace(/@girl/g, NPCS[A.girl].name.toLowerCase());
  }
  return c === s.c ? s : { ...s, c };
}

function runScenario(sc) {
  A = null;   // the setup is not audited: it is the game's own functions building a state, not a night played
  sc.setup();
  A = { id: sc.id, night: 0, book: newBook(), mark: { p: 0, b: 0, s: 0, t: 0 }, niraLeft: 0, nontLeft: 0, garnish: 0,
    slips: {}, sat: null, log: [], till: { mark: 0, moves: {}, draws: 0, puts: 0, topUp: 0, settled: false } };
  A.mark = bal(); A.till.mark = bal().t;
  _nightSnapshot();   // the night's baseline, as the real path takes at every wake
  A.night = 1; STATS.nights--;   // that snapshot opens night one; it closes nothing
  const play = (list, n0) => {
    for (const s of list) {
      if (A.night !== n0) return;
      if (s.dyn) { play(s.dyn(), n0); continue; }
      const r = s;
      step(r);
      if (A.night === n0 && r.c === "sleep") step({ c: "sleep" });   // SLEEP before the small hours asks once
    }
  };
  for (const night of sc.nights) {
    const n0 = A.night;
    play(night, n0);
    if (A.night === n0) { play([clearModal], n0); step({ go: HOME, c: "sleep" }); if (A.night === n0) step({ c: "sleep" }); }
    if (A.night === n0) throw new Error(`${sc.id}: night ${n0} never ended`);
  }
  A = null;
}
// ── the mutations (see --mutate above) ────────────────────────────────────
const MUTATIONS = {
  // the ATM forgets to tell the ledger: the notes read as income (I1/I2)
  atm: () => { const o = _doWithdraw; globalThis._doWithdraw = function (...a) { const t = G.atmTotal; const r = o.apply(this, a); G.atmTotal = t; return r; }; },
  // a tip forgets it was off the slips: CHECK BIN counts it (I4)
  bin: () => { const o = _doTip; globalThis._doTip = function (...a) { const t = G.offTill; const r = o.apply(this, a); G.offTill = t; return r; }; },
  // the settle moves the till by a sum BOOKS never prints (I3)
  till: () => { const o = _barNight; globalThis._barNight = function (...a) { const r = o.apply(this, a); G.bar.cash += 7; return r; }; },
};
if (MUTATE) {
  if (!MUTATIONS[MUTATE]) { console.error(`money-audit: no mutation "${MUTATE}" (have: ${Object.keys(MUTATIONS).join(", ")})`); process.exit(2); }
  MUTATIONS[MUTATE]();
}

const chosen = SCENARIOS.filter(s => (!QUICK || s.quick) && (!ONLY || s.id === ONLY));
const ran = [];
for (const sc of chosen) {
  try { runScenario(sc); ran.push(sc.id); STATS.scenarios++; }
  catch (e) { FINDINGS.push({ key: `${sc.id}#setup:ERROR`, scenario: sc.id, inv: "ERROR", msg: String(e && e.stack || e) }); A = null; }
}
const okKeys = new Set(MONEY_OK.map(o => o.key));
const openKeys = new Set(MONEY_OPEN.map(o => o.key));
const ranSet = new Set(ran);
const couldSee = (key) => key.includes("#") ? ranSet.has(key.split("#")[0]) : (!QUICK && !ONLY);
const report = {
  mode: QUICK ? "quick" : ONLY ? "only:" + ONLY : "full", mutate: MUTATE || null,
  scenarios: ran, stats: STATS, findings: FINDINGS,
  unknown: FINDINGS.filter(f => !okKeys.has(f.key) && !openKeys.has(f.key)).map(f => f.key),
  open: FINDINGS.filter(f => openKeys.has(f.key)).map(f => f.key),
  benign: FINDINGS.filter(f => okKeys.has(f.key)).map(f => f.key),
  fixed: MONEY_OPEN.filter(o => couldSee(o.key) && !FINDINGS.some(f => f.key === o.key)).map(o => o.key),
};
if (AS_JSON) { console.log(JSON.stringify(report, null, 1)); }
else {
  for (const f of FINDINGS) {
    const tag = okKeys.has(f.key) ? "ok" : openKeys.has(f.key) ? "OPEN" : "NEW";
    const why = (MONEY_OPEN.find(o => o.key === f.key) || MONEY_OK.find(o => o.key === f.key) || {}).why;
    console.log(`[${tag}] ${f.key}\n   ${f.msg}` + (f.expected !== undefined ? `\n   expected ${f.expected}, got ${f.got}` : "") +
      (f.said ? `\n   ledger: ${f.said}` : "") + (f.commands && f.commands.length ? `\n   commands: ${f.commands.join(" ; ")}` : "") +
      (why ? `\n   known: ${why}` : ""));
  }
  for (const k of report.fixed) console.log(`[FIXED?] ${k} — on MONEY_OPEN and no longer reproduces; delete its row`);
  console.log(`money-audit${MUTATE ? " (mutate " + MUTATE + ")" : ""}: ${ran.length} scenario(s), ${STATS.nights} night(s), ${STATS.ledgers} ledger(s), ${STATS.tills} till(s), ${STATS.bins} CHECK BIN(s), ${STATS.steps} command(s) — ` +
    `${FINDINGS.length} finding(s): ${report.unknown.length} new, ${report.open.length} open, ${report.benign.length} benign; ${report.fixed.length} open row(s) no longer reproduce`);
}
process.exit(0);
