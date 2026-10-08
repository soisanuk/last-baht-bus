#!/usr/bin/env node
// THE COMPOSITION AUDIT — two systems live at once, and one of them forgets the other.
//
//   node tools/composition-audit.mjs                # every pair, the findings and a summary
//   node tools/composition-audit.mjs --pair companion,ownbar
//   node tools/composition-audit.mjs --state teetotal   # one state alone and in every pair
//   node tools/composition-audit.mjs --verbose      # each finding's offending lines in full
//   node tools/composition-audit.mjs --json
//   node tools/composition-audit.mjs --mutate <name>    # break one state on purpose: the audit must go red
//   node tools/composition-audit.mjs --dump --pair a,b  # print every play's output, for reading by hand
//   node tools/composition-audit.mjs --dice 0.05        # exploratory: another constant for the stubbed dice
//
// WHY THIS EXISTS. Class A of the persona-findings ledger — COMPOSITION — ranked as the
// worst-covered severe class (`node tools/findings-ledger.mjs --aim`): 71 findings, 17%
// severe, 7% instrumented. Every one was a persona living two states at once: a woman on
// your arm treated as a customer at your own bar; the affair girl handed the house's welcome
// shot by her own staff; a teetotal man's comp landing on the meter; a FLIRT that ignored a
// verdict of face-loss; a pending question from her eaten by a verb. Rounds 66, 70 and 71
// found these by hand. tests/js/predicates.test.js is the static half (a predicate must be
// MENTIONED by every consumer it names); this is the dynamic half — it LIVES the two states
// and plays the verbs, so it finds the consumer nobody thought to register.
//
// HOW. A table of STATES, each with
//   · env   — where it has to be (a room, an hour, Act One) — merged across a pair; a clash
//             is an impossible pair, skipped with the reason;
//   · arm   — a recipe through the game's OWN functions (the party barfine's TAKE HER OUT,
//             _maiDeeScene, _lockInBegin, _startRain, TALK to the woman whose first line
//             asks a question, `i don't drink` typed). Where the engine has no setter short
//             of a week's play (the affair, the owner's books) the recipe sets the same
//             fields round71.test's affair()/owner() helpers do;
//   · live  — a check that the recipe took. A pair the game's own path refuses to arm
//             together is reported as UNREACHABLE, never as a finding;
//   · inv   — the state's INVARIANTS: what must hold while it is live, judged by STATE
//             CHANGE wherever state can tell (meters, money, G fields, who is in G.party),
//             and by a narrow forbidden-text regex only where it can't.
// The VERBS are derived from the engine: the chip bar the game offers in that state
// (_chipSet), every action _npcActions(id, true) affords each woman in play mapped through
// the frontend's own _NPC_ACT table (read out of term.js, so a new wheel action is played
// the day it ships), plus the handful every player types in a bar.
//
// For each state ALONE (in its own env) and each PAIR, every verb is played from the same
// armed snapshot, then every live state's invariants are checked, plus the universal ones
// (no throw, no template residue, money finite and ≥ 0, no parse failure, no woman standing in
// the room denied by a verb aimed at her — each only where the bare game in that room does not
// do it too). A violation that a state shows ALONE is a STANDING finding (that state is wrong on
// its own, reported once, keyed by role). A violation that appears only in a PAIR is a
// COMPOSITION finding; if the state alone in the pair's room also shows it, the report says so
// — for a state that is nothing but its room (pushy, act1, broke) that IS the composition.
// Both kinds are gated.
//
// A false positive is the enemy (a lint whose every hit is benign teaches people to skip it), so
// every invariant is narrow and every finding on the first run was reproduced by hand before it
// went into COMP_OPEN. What was tried and dropped as too noisy is in the report at the bottom of
// tests/js/composition-audit.test.js.
//
// THE GATE (tests/js/composition-audit.test.js). A finding is keyed
// `<a>+<b>|<inv>|<verb>` (solo: `<a>|<inv>|<verb>`), with the woman's id in the verb
// replaced by her role (<companion>, <affair>, <maidee>, <asker>, <floor>) so the key does not
// move when the cast does. COMP_OK lists benign findings (each with a reason); COMP_OPEN
// lists REAL defects this instrument found and nobody has fixed yet, each with a one-line
// diagnosis of where the fix belongs. A NEW finding fails the test; a fixed one simply stops
// reproducing and the test asks for its row to be deleted.
//
// RULE 2 OF CLAUDE.md: no loop here depends on the dice varying. _rand is stubbed to a
// constant for the whole run (restored at exit), so a pair and its controls see identical
// dice however many each consumed while arming — a constant is what makes "only in the
// pair" mean composition rather than luck — and every loop is over a fixed list.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const said = () => out.join("\n");

const args = process.argv.slice(2);
const AS_JSON = args.includes("--json"), VERBOSE = args.includes("--verbose");
const argOf = k => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || "") : ""; };
const ONLY_PAIR = argOf("--pair") ? argOf("--pair").split(",").sort().join("+") : "";
const ONLY_STATE = argOf("--state");
const MUTATE = argOf("--mutate");
const DUMP = args.includes("--dump");   // print every play's output (use with --pair / --state)

// ── the known lists ─────────────────────────────────────────────────────────
// COMP_OK: benign findings, each with the reason it is not a defect.
const COMP_OK = {
  // (none — every finding on the first run was reproduced by hand and is real; see COMP_OPEN)
};
// COMP_OPEN: real defects found by this instrument and not yet fixed, grouped by root cause: one
// diagnosis (the file and function where the fix belongs), every key that defect produces. Each was
// reproduced by hand through the real path (TRAVEL in, a _kickOut and a night's sleep, typed
// commands) on 2026-10-08. Delete a group's rows when its fix lands — the test asks for it.
const _OPEN = (why, keys) => Object.fromEntries(keys.map(k => [k, why]));
const COMP_OPEN = {
  // (none — the first run's seven were fixed the same day, 2026-10-08: _affairOut reads the rain, _pushyUpsell
  // returns with a woman on your arm, _doBarfine refuses your own staff before the companion branch, WHO lists a
  // companion at HER bar, DANCE/TIP/CONTACT read the verdict, and your own staff give the boss no customer register
  // on FLIRT, CONTACT, SEE HOME or a lady drink; pinned in round73.test)
};

// ── dice ─────────────────────────────────────────────────────────────────────
const DICE = argOf("--dice") ? +argOf("--dice") : 0.5;
const _realRand = _rand;
_rand = () => DICE;

// ── the women ────────────────────────────────────────────────────────────────
const DEFAULT_ROOM = "lucky_tiger";   // a beer bar with a mamasan, a cashier and three girls; not pushy, not yours
const OWN_ROOM = "stinky_bar";        // the bar the owner's save owns (G.bar.room from newGame)
const COMPANION = "nan";              // Candy Bar's — out with you from another bar, the common case
const AFFAIR = "manow";               // the Stinky's — the affair is with your own hostess, by construction
const role = id => NPC_ROLES[id];
const hostessesHere = () => _npcsHere().filter(id => role(id) === "hostess" && !NPCS[id].patron);
const NAME = id => (NPCS[id] && NPCS[id].name) || id;
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const named = (cmd, id) => !!id && new RegExp("\\b" + esc(NAME(id).toLowerCase()) + "\\b").test(cmd);

// ── the base game, under an env ──────────────────────────────────────────────
function base(env) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.lastSaleng = 99999; G.peddlerNight = 2; G.lastPolice = 1e9;
  G.money = 5000; G.bank = 20000; G.rng = 12345;
  if (env.act1) { G.stage = "act1"; }
  else { G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); }
  for (const r of [DEFAULT_ROOM, OWN_ROOM, "white_rabbit", "candy_bar", "breakwater", "night_heron"]) G.visited[r] = true;
  G.room = env.room || DEFAULT_ROOM;
  G.nightTurn = env.nightTurn != null ? env.nightTurn : 30;
  if (env.drunk) G.soc.drunk = env.drunk;
}
function ownerFlags() {
  G.stage = "expat";
  for (const f of ["expatLife", "barOpen", "barPaid", "barPartner", "partnerTan", "tanAsked", "tanFavourDone"]) _setFlag(f);
  G.tanFavourDay = G.day;
  G.bar = Object.assign(G.bar || {}, { room: OWN_ROOM, cash: 20000, owed: 100000, worked: 5, declared: 5, stoodTurns: 0 });
}

// The customer register: lines the floor speaks to a walk-in it is working. Each is quoted from
// the engine (a lady drink's first pool line, the FLIRT tier-2 pool, CONTACT's not-yet, SEE HOME's
// stranger gate). Said to your own staff, your girlfriend or the woman on your arm, it is the
// composition class exactly: one system forgot the other was live. Kept to whole phrases, so a
// warm line that merely mentions a drink is never read as a pitch.
const CUSTOMER_PITCH = /smile calibrated to the exact value|Buy her a drink first; be a face|not yet, big spender|Buy me drink, funny man|offering to carry your bag/;
const pitchTo = (r, id) => named(r.cmd, id) && CUSTOMER_PITCH.test(r.text) ? r.text.match(CUSTOMER_PITCH)[0] : null;
// a person standing in the room, aimed at by name, and the verb's FIRST line says she isn't
const DENIED = /not working this bar|isn't here to|They're not here|nobody here by that name|doesn't land on anyone|You don't see that here/;

// ── the states ───────────────────────────────────────────────────────────────
// inv: { name: (pre, post, run) => message | null }   run = { cmd, text, lines, c, dayChanged }
// An invariant that only means something within one night returns null when the night ended.
const PARTING = /^(goodbye|good ?night|bye|send .* home|see .* home|sleep|go home|follow )/;
const STATES = {
  // A woman on your arm (the party barfine, TAKE HER OUT). She is company, not a customer.
  companion: {
    order: 50, env: {},
    arm(c) {
      const room = G.room;
      G.room = "candy_bar"; G.soc.drinks[COMPANION] = 8;
      _doBarfine(COMPANION); doCommand("take her out");
      if (G.room !== room) _arriveAt(room);
      c.her.companion = COMPANION;
    },
    live: () => _outWithMe(COMPANION),
    inv: {
      // nobody walks off your arm on a verb that was not a parting
      stays: (a, b, r) => r.dayChanged || PARTING.test(r.cmd) || !a.party.includes(COMPANION) || b.party.includes(COMPANION) ? null
        : `${NAME(COMPANION)} left the party on "${r.cmd}"`,
      // the jilt loop, the souring paths — none of them count the woman you are WITH
      bond: (a, b, r) => r.dayChanged || (b.drinks[COMPANION] || 0) >= (a.drinks[COMPANION] || 0) ? null
        : `her bond fell ${a.drinks[COMPANION]} → ${b.drinks[COMPANION]}`,
      // the house does not chalk a lady drink to your tab with her on your arm — not hers (her drinks are
      // on the party's chit already) and not another girl's across her: _nursed's doctrine, "nobody
      // pitches a lady drink across her"
      padded: (a, b) => {
        if (!a.party.includes(COMPANION) || b.paddedAll.length <= a.paddedAll.length) return null;
        const who = b.paddedAll.filter(x => !a.paddedAll.includes(x)).map(NAME).join(", ") || "a girl";
        return `the pushy upsell chalked a lady drink for ${who} to your tab with ${NAME(COMPANION)} on your arm`;
      },
      // a line that offers to barfine her, while she is out with you on a barfine
      "barfine-offer": (a, b, r) => {
        const m = r.text.match(new RegExp("\\(BARFINE " + esc(NAME(COMPANION).toUpperCase()) + "\\b[^)]*\\)"));
        return m ? `offered ${m[0]}` : null;
      },
      // the negotiation is never re-opened on her (the ledger only sells another companion)
      rebarfine: (a, b) => b.pendingBf === COMPANION && a.pendingBf !== COMPANION ? "a fresh barfine negotiation opened on the woman already on your arm" : null,
      // she is placed at the bar she WORKS, not at whichever bar you walked her into (_npcRoom follows you)
      misplaced: (a, b, r) => {
        const home = NPCS[COMPANION].room, here = _barName(a.room);
        if (!here || a.room === home) return null;
        const m = r.text.match(new RegExp(esc(NAME(COMPANION)) + " — " + esc(here)));
        return m ? `placed at ${here}, the bar you walked her into: "${m[0]}"` : null;
      },
      pitched: (a, b, r) => { const m = pitchTo(r, COMPANION); return m ? `the woman on your arm got the customer register: "${m}"` : null; },
    },
  },
  // Standing at the bar you own. Your staff don't work you like a walk-in; the house's angles are yours.
  ownbar: {
    order: 10, env: { room: OWN_ROOM },
    arm() { ownerFlags(); },
    live: () => _atOwnBar(),
    inv: {
      heat: (a, b, r) => r.dayChanged || b.own.heat <= a.own.heat ? null : `heat rose at your own bar (${a.own.heat} → ${b.own.heat})`,
      walked: (a, b, r) => !r.dayChanged && b.own.banned && !a.own.banned ? "you were banned from your own bar" : null,
      "house-shot": (a, b) => b.own.mgrShot && !a.own.mgrShot ? "your own manager stood you the house's welcome shot" : null,
      padded: (a, b) => b.own.padded && !a.own.padded ? "your own bar padded a lady drink onto your tab" : null,
      "own-barfine": (a, b) => b.pendingBf && b.pendingBf !== a.pendingBf && a.ownStaff.includes(b.pendingBf)
        ? `a barfine negotiation opened on your own staff (${NAME(b.pendingBf)})` : null,
      // your own staff, worked like a walk-in
      pitched: (a, b, r) => {
        const id = a.ownStaff.find(x => named(r.cmd, x) && !(a.affairLive && x === AFFAIR));
        const m = id && pitchTo(r, id);
        return m ? `your own staff (${NAME(id)}) gave the guv'nor the customer register: "${m}"` : null;
      },
      // a hint to buy your own staff out, printed at your own bar (the affair girl's TAKE OUT excepted — it is hers)
      "staff-offer": (a, b, r) => {
        for (const x of a.ownStaff) {
          if (a.affairLive && x === AFFAIR) continue;
          const m = r.text.match(new RegExp("\\((BARFINE|TAKE) " + esc(NAME(x).toUpperCase()) + "\\b[^)]*\\)"));
          if (m) return `offered ${m[0]} for your own staff at your own bar`;
        }
        return null;
      },
    },
  },
  // The staff affair, live, at your own bar with her on the floor (where it starts, and where it is lived).
  affair: {
    order: 15, env: { room: OWN_ROOM },
    arm(c) {
      ownerFlags();
      G.affair = { id: AFFAIR, since: G.day - 20, strain: 6, floorSour: 0, crisSeen: [], crisChose: {}, warned: {},
        discovered: false, soured: false, ended: false, crisDay: G.day };
      G.soc.drinks[AFFAIR] = 15;      // the door opens only at her-farang tier (_affairDue)
      G.talked[AFFAIR] = [0];
      c.her.affair = AFFAIR;
    },
    live: () => _affairLive() && G.affair.id === AFFAIR,
    // her own verbs are two-step: the first ask states the stakes, the second goes
    verbs: ["take {n} out; take {n} out", "go home with {n}"],
    inv: {
      alive: (a, b, r) => r.dayChanged || !a.affairLive || b.affairLive ? null : `the affair ENDED on "${r.cmd}"`,
      soured: (a, b, r) => r.dayChanged || !a.affair || a.affair.soured || !b.affair || !b.affair.soured ? null : `the affair SOURED on "${r.cmd}"`,
      // her barfine is her own verb (TAKE HER OUT / GO HOME WITH), never the bar's negotiation
      "bf-negotiation": (a, b) => b.pendingBf === AFFAIR && a.pendingBf !== AFFAIR ? "the bar's barfine negotiation opened on your girlfriend" : null,
      pitched: (a, b, r) => { const m = pitchTo(r, AFFAIR); return m ? `your girlfriend got the customer register: "${m}"` : null; },
    },
  },
  // I DON'T DRINK, said once. Every comp is declined on his behalf.
  teetotal: {
    order: 60, env: {},
    arm() { doCommand("i don't drink"); },
    live: () => !!(G.player && G.player.teetotal),
    inv: {
      meter: (a, b, r) => r.dayChanged || !b.teetotal || b.drunk <= a.drunk ? null
        : `a teetotal man's meter rose ${a.drunk} → ${b.drunk} and he is still teetotal`,
    },
  },
  // A verdict of face-loss: she watched you walked out by security. Nothing you buy moves her.
  maidee: {
    order: 40, env: {},
    arm(c) {
      const M = hostessesHere().find(id => !Object.values(c.her).includes(id));
      if (!M) return;
      G.soc.drinks[M] = 8;            // a regular — the verdict needs someone who had decided you were somebody
      _maiDeeScene([M]);              // the real setter: _kickOut calls it with whoever watched
      c.her.maidee = M;
    },
    live: c => !!c.her.maidee && _maiDee(c.her.maidee),
    inv: {
      "verdict-stays": (a, b, r) => a.maiDee.includes(r.c.her.maidee) && !b.maiDee.includes(r.c.her.maidee) ? "the verdict cleared" : null,
      // a verb aimed at her warms nothing: no สนุก off her (a purchase and a snapshot are the drink's and the camera's)
      warmed: (a, b, r) => {
        const M = r.c.her.maidee;
        if (r.dayChanged || !named(r.cmd, M) || /^(buy|photo|x |examine)/.test(r.cmd)) return null;
        if (b.charmed.includes(M) && !a.charmed.includes(M)) return `"${r.cmd}" charmed a woman who has decided you are not a good man`;
        return b.happy > a.happy ? `"${r.cmd}" paid สนุก (${a.happy} → ${b.happy}) off a woman who has decided about you` : null;
      },
      // she never texts again — so she does not hand over her number either
      number: (a, b, r) => !a.contacts.includes(r.c.her.maidee) && b.contacts.includes(r.c.her.maidee) ? "she swapped numbers after the verdict" : null,
      texts: (a, b, r) => {
        const M = r.c.her.maidee;
        return b.inboxFrom.filter(f => f === M).length > a.inboxFrom.filter(f => f === M).length ? "she texted you after the verdict" : null;
      },
    },
  },
  // She asked YOU something (an `asks` node) and is waiting on the answer.
  asker: {
    order: 90, env: {},
    arm(c) {
      for (const id of hostessesHere()) {
        if (Object.values(c.her).includes(id)) continue;
        const save = serializeGame();
        doCommand("talk to " + NAME(id).toLowerCase());
        if (G.convoQ && G.convoQ.id === id) { c.her.asker = id; c.key = G.convoQ.key; return; }
        deserializeGame(save);
      }
    },
    live: c => !!(G.convoQ && G.convoQ.id === c.her.asker),
    inv: {
      // no verb in this list is an answer: a command must never be filed as what you told her
      eaten: (a, b, r) => {
        const k = r.c.key;
        return a.said[k] === b.said[k] && a.heard === b.heard ? null
          : `"${r.cmd}" was filed as your answer to her question (${k}: ${JSON.stringify(b.said[k])})`;
      },
    },
  },
  // A Darkside lock-in: the door is bolted behind a spender after midnight.
  lockin: {
    order: 20, env: { room: "night_heron", nightTurn: 70 },
    arm() { _lockInBegin(G.room); },
    live: () => _lockedIn(),
    inv: {
      bolt: (a, b, r) => r.dayChanged || a.room !== b.room || !a.lockIn || b.lockIn ? null : `the bolt came off on "${r.cmd}" with you still inside`,
    },
  },
  // A downpour. Moves are refused unless the next room is a roof.
  rain: {
    order: 30, env: {},
    arm() { _startRain(8); },
    live: () => G.rain > 0,
    inv: {
      shelter: (a, b, r) => r.dayChanged || !(a.rain > 0 && b.rain > 0) || a.room === b.room || !_sheltered(a.room) || _sheltered(b.room) ? null
        : `"${r.cmd}" walked you out of ${a.room} into the downpour at ${b.room}`,
    },
  },
  // Act One: the wallet night. The sandbox's systems are not open yet.
  act1: {
    order: 5, env: { act1: true }, envOnly: true,
    arm() {},
    live: () => G.stage === "act1" && !_flag("act1Done"),
    inv: {
      rep: (a, b) => b.rep === a.rep ? null : `standing moved in Act One (${a.rep} → ${b.rep}) — reputation opens with the sandbox`,
      stage: (a, b, r) => r.dayChanged || b.stage === a.stage ? null : `the stage moved ${a.stage} → ${b.stage}`,
    },
  },
  // A pushy rail: the house pours its comps heavy, and a girl is chalked to your tab once you're three in.
  // No invariant of its own — it exists to be composed (with a companion, a teetotaller, a verdict).
  pushy: {
    order: 25, env: { room: "breakwater", drunk: 2 }, envOnly: true,
    arm() {},
    live: () => _pushyBar(G.room),
    inv: {},
  },
  // Skint: nothing in the pocket or the account. Every till, chit and round must say so rather than
  // go below zero (the universal money invariant is the check; no invariant of its own).
  broke: {
    order: 95, env: {}, envOnly: true,
    arm() { G.money = 0; G.bank = 0; },   // last, so a companion was paid for before the money ran out
    live: () => G.money === 0 && G.bank === 0,
    inv: {},
  },
};

// Pairs the game cannot produce, with the reason (a recipe COULD force them; a finding there
// would be about a state no player reaches).
const IMPOSSIBLE = {
  "act1+ownbar": "you own a bar only in the expat stage",
  "act1+affair": "the affair is an owner's",
  "act1+rain": "no downpours before act1Done (round 41)",
  "act1+pushy": "the comp and padding machinery opens with the sandbox (_managerWelcome, _pushyUpsell)",
  "act1+lockin": "a lock-in begins in _closingTick, which does not run before act1Done",
  "affair+ownbar": "the affair state IS standing at your own bar with her on the floor — the pair is the state",
  "maidee+ownbar": "a verdict needs a walk-out, and your own bar cannot walk you out",
  "affair+maidee": "a verdict needs a walk-out, and your own bar cannot walk you out",
};

// ── snapshots ────────────────────────────────────────────────────────────────
function snap(c) {
  const ids = Object.values(c.her);
  const drinks = {};
  for (const id of ids) drinks[id] = (G.soc.drinks && G.soc.drinks[id]) || 0;
  const a = G.affair;
  const asker = c.her.asker;
  const here = _npcsHere();
  return {
    day: G.day, room: G.room, here, ownStaff: here.filter(id => _ownBarStaff(id)),
    money: G.money, bank: G.bank, drunk: G.soc.drunk || 0, rep: G.rep || 0,
    happy: G.happy || 0, stage: G.stage, party: ((G.party && G.party.ids) || []).slice(), drinks,
    affair: a ? { strain: a.strain, soured: !!a.soured, ended: !!a.ended } : null, affairLive: _affairLive(),
    teetotal: !!(G.player && G.player.teetotal), maiDee: Object.keys(G.maiDee || {}),
    said: Object.assign({}, (G.player && G.player.said) || {}),
    heard: asker ? JSON.stringify(((_npcState(asker) || {}).heard) || {}) : "",
    // room-scoped books are read for a NAMED room, never G.room — a verb that walks you elsewhere
    // must not compare one bar's book before with another bar's after
    own: { heat: (G.soc.heat || {})[OWN_ROOM] || 0, banned: (G.soc.banned || {})[OWN_ROOM] != null,
      mgrShot: !!((G.soc.mgrShot || {})[OWN_ROOM]), padded: ((G.soc.padded || {})[OWN_ROOM]) || null },
    paddedAll: Object.values(G.soc.padded || {}),
    lockIn: !!((G.soc.lockIn || {})[G.room]), rain: G.rain || 0,
    pendingBf: G.pendingBf ? G.pendingBf.id : null,
    charmed: Object.keys(G.soc.charmed || {}).filter(k => G.soc.charmed[k]),
    contacts: Object.keys((G.phone && G.phone.contacts) || {}).filter(k => G.phone.contacts[k]),
    inboxFrom: ((G.phone && G.phone.inbox) || []).map(m => m.from),
  };
}

// ── universal invariants ─────────────────────────────────────────────────────
const HUH = new Set(_HUH);
const RESIDUE = /\bundefined\b|\bNaN\b|\[object \w+\]|\$\{|%[a-z]+%|\{[a-z]+\}/;
function universal(a, b, r) {
  const v = {};
  if (r.threw) v.threw = `threw: ${r.threw}`;
  const res = r.lines.find(l => RESIDUE.test(stripMarkup(l)));
  if (res) v.residue = `template residue: ${res.slice(0, 160)}`;
  if (!Number.isFinite(b.money) || b.money < 0) v.money = `pocket ${b.money}`;
  if (!Number.isFinite(b.bank) || b.bank < 0) v.bank = `account ${b.bank}`;
  if (r.lines.some(l => HUH.has(l))) v.huh = "parse failure";
  // a woman standing in the room, aimed at by name, and the verb says she isn't
  const tgt = a.here.find(id => NPCS[id] && !NPCS[id].patron && /^[A-Z]/.test(NAME(id)) && named(r.cmd, id));
  if (tgt && !r.cmd.includes(";")) {
    const m = r.lines.slice(0, 2).join(" ").match(DENIED);
    if (m) v.denied = `${NAME(tgt)} is standing right here and "${r.cmd}" said: "${m[0]}"`;
  }
  return v;
}

// ── verbs ────────────────────────────────────────────────────────────────────
// the frontend's own map from an action key to a command (term.js _NPC_ACT), read off the source
const NPC_ACT = (() => {
  const src = fs.readFileSync(new URL("term.js", JS), "utf8");
  const at = src.indexOf("const _NPC_ACT = {");
  const blk = src.slice(at, src.indexOf("};", at));
  const m = {};
  for (const x of blk.matchAll(/^\s+(\w+):\s+(l => \(\{.*\}\)),?\s*$/gm)) {
    try { m[x[1]] = new Function("return " + x[2])(); } catch { /* an entry this reader can't evaluate */ }
  }
  return m;
})();
// the handful every player types in a bar, generic and aimed at a woman (the wheel's own
// actions come from _npcActions; these are the typed ones it does not carry)
const BAR_VERBS = ["look", "wait", "buy beer", "buy water", "drink", "toast", "dance", "sing", "ring bell",
  "check bin", "tao rai", "time", "diagnose", "who", "apologize", "books"];
// arrival is where most of the house's attention lands (_arriveAt: the welcome shot, the party's round,
// the greeting, the catch), so two of the verbs are arrivals: back in through the same door, and a
// TRAVEL across town to a bar whose manager stands the house shot
const ARRIVALS = () => [`out; enter ${(_barName(G.room) || "").toLowerCase()}`, "travel white rabbit"];
// "wait 20" lets the night's own ticks land on the state (a dare, a text, a floor moment, a crisis)
BAR_VERBS.push("wait 20");
const HER_VERBS = ["kiss {n}", "buy beer for {n}", "tip {n} 100", "photo {n}", "dance with {n}", "take {n} out",
  "ask {n} about family", "see {n} home"];
const SKIP_VERB = /^(sleep|long time|lt|watch sunrise|again|g|undo|restart|quit|reset|end|logout|save|load|share|\d+)$/;

function verbsFor(c) {
  const vs = new Set(BAR_VERBS);
  for (const a of ARRIVALS()) vs.add(a);
  const women = Object.values(c.her);
  if (c.floor) women.push(c.floor);
  for (const [st, id] of Object.entries(c.her)) for (const t of STATES[st].verbs || []) vs.add(t.split("{n}").join(NAME(id).toLowerCase()));
  for (const id of women) {
    const n = NAME(id).toLowerCase();
    for (const t of HER_VERBS) vs.add(t.replace("{n}", n));
    for (const k of _npcActions(id, true)) {
      const f = NPC_ACT[k]; if (!f) continue;
      const a = f(n); if (a.go) vs.add(a.c);
    }
  }
  for (const ch of _chipSet()) {
    const cmd = String(ch.cmd || "");
    if (!cmd || cmd.endsWith(" ")) continue;
    if (c.key && _askReplies(c.key).includes(cmd)) continue;   // a canned reply IS an answer, by design
    vs.add(cmd);
  }
  return [...vs].filter(v => !SKIP_VERB.test(v));
}
// a verb's key, with each woman's name replaced by her role, so a key survives a recast
function verbKey(cmd, c) {
  let k = cmd;
  const women = Object.entries(c.her);
  if (c.floor) women.push(["floor", c.floor]);
  for (const [r, id] of women) k = k.replace(new RegExp("\\b" + esc(NAME(id).toLowerCase()) + "\\b", "g"), "<" + r + ">");
  return k.replace(/^out; enter .*$/, "out; enter <here>");
}

// ── arming a combo ───────────────────────────────────────────────────────────
function envOf(ids) {
  const env = {};
  for (const id of ids) for (const [k, v] of Object.entries(STATES[id].env)) {
    if (k in env && env[k] !== v) return { clash: `${k}: ${env[k]} vs ${v}` };
    env[k] = v;
  }
  return env;
}
function arm(ids, env) {
  out = [];
  base(env);
  const c = { her: {}, key: null };
  for (const id of [...ids].sort((x, y) => STATES[x].order - STATES[y].order)) {
    try { STATES[id].arm(c); } catch (e) { return { error: `arming ${id} threw: ${e.message}` }; }
  }
  for (const id of ids) if (!STATES[id].live(c)) return { error: `${id} did not take` };
  c.floor = hostessesHere().find(id => !Object.values(c.her).includes(id)) || null;
  out = [];
  return { c, save: serializeGame() };
}
// --mutate <name>: make one consumer FORGET a state, the way the class's real defects do, to prove the
// instrument sees it (a tool that does no work reports no findings — the test runs these)
const MUTATIONS = {
  // every comp lands on the meter, declared or not
  teetotal: () => { globalThis._compDrink = (n) => { G.soc.drunk += n || 1; }; },
  // the heat book forgets whose bar it is
  ownbar: () => { globalThis._addHeat = (n) => { G.soc.heat[G.room] = (G.soc.heat[G.room] || 0) + n; }; },
  // the jilt loop counts the woman on your arm: a drink for another girl docks her
  companion: () => {
    const orig = globalThis._ladyDrinkCharge;
    globalThis._ladyDrinkCharge = function (id, ...rest) {
      const r = orig.call(this, id, ...rest);
      for (const p of (G.party && G.party.ids) || []) if (p !== id) G.soc.drinks[p] = Math.max(0, (G.soc.drinks[p] || 0) - 1);
      return r;
    };
  },
};
if (MUTATE) {
  if (!MUTATIONS[MUTATE]) { console.error("no mutation " + MUTATE + " — try " + Object.keys(MUTATIONS).join(", ")); process.exit(2); }
  MUTATIONS[MUTATE]();
}

// ── playing ──────────────────────────────────────────────────────────────────
function play(armed, ids, cmd) {
  deserializeGame(armed.save);
  const c = armed.c;
  const a = snap(c);
  out = [];
  let threw = null;
  try { for (const part of cmd.split("; ")) doCommand(part); } catch (e) { threw = e.message; }
  const b = snap(c);
  const r = { cmd, c, text: said(), lines: out.slice(), threw, dayChanged: b.day !== a.day };
  if (DUMP) console.log(`\n[${ids.join("+") || "base"} @ ${G.room}] > ${cmd}\n  ` + r.text.replace(/\n/g, "\n  "));
  const v = universal(a, b, r);
  for (const id of ids) for (const [name, f] of Object.entries(STATES[id].inv)) {
    let m = null;
    try { m = f(a, b, r); } catch (e) { m = `invariant threw: ${e.message}`; }
    if (m) v[id + ":" + name] = m;
  }
  return { v, text: r.text };
}

// ── the run ──────────────────────────────────────────────────────────────────
const names = Object.keys(STATES);
const combos = [];
for (const a of names) for (const b of names) if (a < b) combos.push([a, b]);
const findings = [], unreachable = [], stats = { pairs: 0, solos: 0, plays: 0 };
const soloCache = new Map();   // `${state}@${envKey}|${cmd}` → violation map
const armedCache = new Map();
const soloText = new Map();    // the same key → what the play printed (for --verbose)

function armedFor(ids, env) {
  const k = ids.join("+") + "@" + JSON.stringify(env);
  if (!armedCache.has(k)) armedCache.set(k, arm(ids, env));
  return armedCache.get(k);
}
function soloRun(id, env, cmd) {
  const k = id + "@" + JSON.stringify(env) + "|" + cmd;
  if (!soloCache.has(k)) {
    const armed = armedFor([id], env);
    if (armed.error) soloCache.set(k, null);
    else { stats.plays++; const p = play(armed, [id], cmd); soloText.set(k, p.text); soloCache.set(k, p.v); }
  }
  return soloCache.get(k);
}
function baseRun(env, cmd) {
  const k = "base@" + JSON.stringify(env) + "|" + cmd;
  if (!soloCache.has(k)) {
    const armed = armedFor([], env);
    soloCache.set(k, (stats.plays++, play(armed, [], cmd).v));
  }
  return soloCache.get(k);
}
const standing = new Set();   // `${state}|${inv}|${verbKey}` of every STANDING finding
function report(kind, ids, inv, cmd, msg, text, c) {
  const vk = verbKey(cmd, c);
  if (kind === "solo") standing.add(ids[0] + "|" + inv + "|" + vk);
  // a pair that only repeats a state's standing defect is not composition: report it once, as standing
  else if (ids.some(s => standing.has(s + "|" + inv + "|" + vk))) return;
  const key = (kind === "pair" ? ids.join("+") : ids[0]) + "|" + inv + "|" + vk;
  if (COMP_OK[key]) return;
  findings.push({ key, kind, states: ids, inv, cmd, msg, text: VERBOSE ? text : undefined, open: COMP_OPEN[key] || null });
}

// solo: each state in its own env — a STANDING violation (the state is wrong on its own)
for (const id of names) {
  if (ONLY_STATE && id !== ONLY_STATE) continue;
  if (ONLY_PAIR && !ONLY_PAIR.split("+").includes(id)) continue;
  const env = envOf([id]);
  const armed = armedFor([id], env);
  if (armed.error) { unreachable.push({ combo: id, why: armed.error }); continue; }
  stats.solos++;
  deserializeGame(armed.save);
  for (const cmd of verbsFor(armed.c)) {
    const v = soloRun(id, env, cmd), bv = baseRun(env, cmd);
    if (!v) continue;
    for (const [inv, msg] of Object.entries(v)) {
      if (!inv.includes(":") && bv[inv]) continue;   // a universal the bare game shares is not this state's
      report("solo", [id], inv, cmd, msg, soloText.get(id + "@" + JSON.stringify(env) + "|" + cmd) || "", armed.c);
    }
  }
}
// pairs: a violation the pair shows and neither state shows alone in the same env is COMPOSITION
for (const [x, y] of combos) {
  const pk = x + "+" + y;
  if (ONLY_PAIR && pk !== ONLY_PAIR) continue;
  if (ONLY_STATE && x !== ONLY_STATE && y !== ONLY_STATE) continue;
  if (IMPOSSIBLE[pk]) { unreachable.push({ combo: pk, why: "impossible: " + IMPOSSIBLE[pk] }); continue; }
  const env = envOf([x, y]);
  if (env.clash) { unreachable.push({ combo: pk, why: "env clash — " + env.clash }); continue; }
  const armed = armedFor([x, y], env);
  if (armed.error) { unreachable.push({ combo: pk, why: armed.error }); continue; }
  stats.pairs++;
  deserializeGame(armed.save);
  for (const cmd of verbsFor(armed.c)) {
    stats.plays++;
    const { v, text } = play(armed, [x, y], cmd);
    const vb = baseRun(env, cmd);
    for (const [inv, msg] of Object.entries(v)) {
      const universal_ = !inv.includes(":");
      if (universal_ && vb[inv]) continue;   // the bare game in this room does it too: a room defect, not composition
      // The controls. A state's STANDING findings (in its own env, keyed by role) are dropped by
      // report(). Beyond that, each state alone in the PAIR's env is consulted — but only to annotate:
      // a state like `pushy` is nothing but its room, so "the companion alone at the pushy bar" IS the
      // composition, and dropping on that control would hide it (it did, on the first run).
      const vx = soloRun(x, env, cmd) || {}, vy = soloRun(y, env, cmd) || {};
      if (universal_ && (vx[inv] || vy[inv])) continue;
      // (an env-only partner — pushy, act1, broke — has no arming to subtract: its room IS the state)
      const alone = STATES[x].envOnly || STATES[y].envOnly ? [] : [x, y].filter(s => (s === x ? vx : vy)[inv]);
      report("pair", [x, y], inv, cmd, msg + (alone.length ? `  [${alone.join(", ")} alone in this room too]` : ""), text, armed.c);
    }
  }
}
_rand = _realRand;

// ── output ───────────────────────────────────────────────────────────────────
const keys = new Set(findings.map(f => f.key));
const unknown = [...keys].filter(k => !COMP_OPEN[k]);
const fixed = Object.keys(COMP_OPEN).filter(k => !keys.has(k) && !ONLY_PAIR && !ONLY_STATE);
if (AS_JSON) {
  console.log(JSON.stringify({ stats, unreachable, findings, unknown, fixed }, null, 1));
} else {
  const by = {};
  for (const f of findings) (by[f.key.split("|")[0]] = by[f.key.split("|")[0]] || []).push(f);
  for (const [g, fs_] of Object.entries(by)) {
    console.log(`── ${g}${fs_[0].kind === "pair" ? "  (composition)" : "  (standing)"}`);
    const seen = new Set();
    for (const f of fs_) {
      if (seen.has(f.key)) continue; seen.add(f.key);
      console.log(`  ${f.open ? "OPEN " : "NEW  "}${f.inv.padEnd(26)} ${f.cmd.padEnd(28)} ${f.msg}`);
      if (VERBOSE && f.text) console.log("      " + f.text.replace(/\n/g, "\n      ").slice(0, 1200));
    }
  }
  if (unreachable.length) console.log("\nunreachable/skipped:\n  " + unreachable.map(u => `${u.combo}: ${u.why}`).join("\n  "));
  if (fixed.length) console.log("\nCOMP_OPEN rows that no longer reproduce (delete them):\n  " + fixed.join("\n  "));
  console.log(`\ncomposition audit: ${names.length} states · ${stats.solos} armed alone · ${stats.pairs} pairs armed · ` +
    `${stats.plays} plays · ${keys.size} findings (${unknown.length} new, ${keys.size - unknown.length} open)`);
}
process.exitCode = unknown.length || fixed.length ? 1 : 0;
