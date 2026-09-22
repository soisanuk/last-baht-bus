#!/usr/bin/env node
// THE INVERSE AUDIT — can the town say what the town does?
//
//   node tools/askable-audit.mjs            # full report
//   node tools/askable-audit.mjs --json
//   node tools/askable-audit.mjs --fact closing
//
// THE FOURTH SIBLING, and the first one that runs the other way round.
// promises.test.js asserts a printed hint PARSES; afford-audit plays everything
// the prose says you can HAVE; asktopic-audit plays every ASK the prose
// PROMISES; errand-audit plays every instruction naming a person. All four
// start from something the game SAID, which means none of them can see the
// class a whole persona wave kept reporting (docs/persona-findings-systemic.md,
// class N): **the engine computes a schedule, a price or a rule, and nobody in
// the room can answer a question about it.** Nothing was promised, so nothing
// was broken; the town simply could not say what it does.
//
// Thirteen shrugs at "closing" while the shutters came down. A league chalked
// on four walls and "not my story" from the woman standing at the table. Mort
// unable to discuss his own column. Tan unable to say what kind of place a bar
// by name is. TAO RAI in a cabaret whose compère says "buy a drink".
//
// So the table below is the other direction: a FACT the engine holds, the words
// a player types to ask about it, and where to stand. The audit puts each
// question to a member of staff, a manager and a regular wherever the room has
// one, and reports the pairs that land on a miss.
//
// HOW A PASS IS JUDGED, and why it is not string matching: the engine's own miss
// pools are the oracle, built by RUNNING nonsense topics at a spread of the cast
// rather than transcribing the pools, so a rewritten brush-off can never quietly
// turn this green. Same reasoning as errand-audit's missOracle, and the same
// reason the soak's liveness ledger counts effects instead of asserting strings.
//
// A NOTE ON WHO SHOULD KNOW. Not every fact is every mouth's business, and the
// findings list says which mouth missed rather than collapsing to "the fact is
// unanswerable". The judgement calls that ARE settled live in OK below with the
// reason — a regular really may not know the house price list, and a cashier is
// not obliged to have an opinion on the Owl's column.

import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "lang", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const out = [];
engineInit(t => out.push(String(t)), null, () => {});

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const fi = args.indexOf("--fact");
const onlyFact = fi !== -1 ? args[fi + 1] : null;
const SHOW = args.includes("--show");   // every question and its answer, for reading a batch by hand

// ── the table: a fact the engine computes → the words a player types ────────
// `hour` is a nightTurn (10 per hour from 18:00); `day` is G.day, whose %7 the
// calendar helpers read (day 1 = Monday, so 4 = Thursday and 7 = Sunday).
// `roles` limits which of the room's mouths are expected to know.
const FACTS = [
  { fact: "closing", why: "_closesMidnight / closesAt / _closedNow — the engine knows to the turn",
    asks: ["closing", "what time do you close", "last call", "hours"],
    rooms: ["stinky_bar", "orchid_room", "queen_vic", "khao_talo_bar"], hour: 40 },
  // the mall is the `closesAt` case, and it has to be asked while it is OPEN —
  // at 22:00 the shutters are down and there is nobody in it to ask
  { fact: "closing", why: "closesAt 30 — a mall is not a bar and none of the midnight machinery applies",
    asks: ["closing", "what time do you close", "hours"],
    rooms: ["mikes_mall"], hour: 20 },

  // THE LARGEST NUMBER IN THE TRADE, and the woman who sets it would not say it —
  // while three cashiers promise "ask Mama anything, she will tell you the answer
  // and the price" (Helen, round 49). `roles` keeps it off the punter: the fine
  // is the house's business, not a customer's.
  { fact: "barfine", why: "_barfinePrices — tiered by venue and discounted after midnight, to the baht",
    asks: ["barfine", "bar fine", "how much to take a girl out"],
    rooms: ["lucky_tiger", "stinky_bar", "candy_bar"], roles: ["staff", "manager"], hour: 22 },

  // CLOSING'S MIRROR. Every member of staff in town answered "closing" and not
  // one could answer "what time do you open" — the fact is the VENUE'S CLASS,
  // which the engine has had all along (Brian, round 49, whose hobby is
  // punctuality; five nights, six kinds of mouth, one shrug each).
  { fact: "opening", why: "the venue's class is the hour — a gogo opens with its first set, a beer bar with the ice",
    asks: ["opening", "what time do you open", "opening time"],
    rooms: ["stinky_bar", "orchid_room", "queen_vic", "thai_massage", "soi6_bar_a"], hour: 20 },
  { fact: "opening", why: "opensAt — the one room in town with real shop hours",
    asks: ["opening", "what time do you open"],
    rooms: ["mikes_mall"], hour: 20 },
  // the engine models prime time, the season and a thinning rail, prints all of
  // it in TIME, and nobody in a room would say it out loud
  { fact: "busy", why: "_seasonTier / _benchOut / prime time — computed every night",
    asks: ["busy", "when does it get busy", "quiet"],
    rooms: ["stinky_bar", "queen_vic", "lucky_tiger"], hour: 20 },

  { fact: "quiz", why: "_quizDay / _isQuizWindow / _quizBars — a fixed weekly rule",
    asks: ["quiz"],
    rooms: ["queen_vic", "stinky_bar", "lucky_tiger"], hour: 22, day: 4 },

  { fact: "league", why: "_leagueTonight / _leagueIn — a count, not a weekday",
    asks: ["league", "killer pool"],
    rooms: ["stinky_bar", "lucky_tiger", "kingfisher"], hour: 25 },

  { fact: "roast", why: "_roastDay / _roastOn / _roastLeft — a finite Sunday dinner",
    asks: ["roast", "sunday", "food"],
    rooms: ["queen_vic"], hour: 20, day: 7 },

  { fact: "checkpoint", why: "the 18:00–19:00 Beach Road stop, honoured by EXAMINE and the prose",
    asks: ["checkpoint", "police"],
    rooms: ["blue_dog"], hour: 5 },

  { fact: "bus", why: "BUS_LINES / _busLinesFor — which trucks stop here and where they run",
    asks: ["bus", "songthaew"],
    rooms: ["beach_rd_s", "buakhao_pt", "jomtien_beach_rd"], hour: 30 },

  { fact: "prices", why: "_beerPrice / _ladyPrice / _barfinePrices — the till's own numbers",
    asks: ["price", "prices", "how much", "tao rai"],
    rooms: ["stinky_bar", "hyper", "the_boardroom", "peacock_cabaret",
      "emperor_soapy", "jomtien_soi_7_thai"], hour: 30,
    // a punter on the next stool is a customer, not the menu
    roles: ["staff", "manager"] },

  { fact: "venue class", why: "Tan reads a bar by name — _barName / barType",
    asks: [], tan: ["The Stinky Pinky", "Hyper", "The Orchid Room", "The Queen Vic"], hour: 30 },

  { fact: "the column", why: "_OWL_LEADS / _OWL_LISTINGS — Mort writes it; he can discuss it",
    asks: [], mort: ["column", "owl", "quiz"], hour: 30 },
];

// ── the oracle: the engine's own dead ends, built by RUNNING them ───────────
function fresh(room, hour, day) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
  G.money = 20000; G.hunger = 30; G.thirst = 30; G.battery = 100;
  G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.rain = 0; G.pendingEnc = null; G.pendingChoice = null;
  if (day != null) G.day = day;
  G.nightTurn = hour == null ? 30 : hour;
  G.room = room;
}

// THE ORACLE IS BUILT PER MOUTH, not once for the game, and that is the whole
// reliability of this tool. The miss pools branch on role and are then patched
// per character — a mamasan is told she is "the wrong mama" rather than the
// wrong girl, a patron gets his own grizzled pool, the masseuse has a fallback
// that lives nowhere near any of them — so a single global oracle marks a
// hostess's "not my story" as an ANSWER and the audit reports a clean town it
// has not actually asked. Ask the same mouth about nonsense enough times to
// exhaust its own pools, and the comparison is exact.
const NONSENSE = ["quantumfrogsalad", "zephyrquokka", "brontovaccine", "gralthumpery"];
const _oracles = new Map();
function oracleFor(room, who, hour, day) {
  const key = room + "|" + who.name;
  if (_oracles.has(key)) return _oracles.get(key);
  const lines = new Set();
  for (let i = 0; i < 80; i++)
    for (const l of replyLines(ask(room, who, NONSENSE[i % NONSENSE.length], hour, day)))
      lines.add(l.slice(0, 40));
  // the parser's own last resorts, which are not topic misses at all
  for (const s of ["I didn't understand", "That one didn't parse", "Nobody by that name",
    "isn't at this bar", "isn't around right now", "They're not here to ask",
    "Telling isn't the verb here"])
    lines.add(s.slice(0, 40));
  _oracles.set(key, lines);
  return lines;
}
// The conversation layer echoes "· You asked X about Y" after the reply; it is
// bookkeeping, not an answer, and it carries the TOPIC — so leaving it in makes
// every oracle entry unique to its own nonsense word and the audit reports a
// town that answers everything. (It did. The bullet is part of the line.)
const replyLines = reply => String(reply).split("\n")
  .map(l => l.trim()).filter(l => l && !/^[·•\s]*You asked /.test(l));
// A miss if the reply ADDS NOTHING the nonsense probe didn't also produce. Not
// `some`: a character with a standing chip line stapled under every reply (Duncan
// Powers) shares that line with his own oracle, so `some` calls his real answer
// a brush-off. `every` asks the right question — did anything new get said —
// and it only works because the topic echo is stripped first.
const isMiss = (reply, oracle) => {
  const ls = replyLines(reply);
  return !ls.length || ls.every(l => [...oracle].some(o => l.startsWith(o.slice(0, 30))));
};

// ── who is in the room, and what they are ──────────────────────────────────
// Derived from the engine, never hand-listed: a bar that gains a manager gains a
// mouth this audit starts asking. The "regular" test is _describeRoom's own
// `_railCrowd` shape — not `patron: true`, which Terry and Doyle predate.
//
// Plus the ANONYMOUS mouths, which are the whole point of half this table: a
// street's piwin, a shop's masseuse and a soapy's manageress are not NPCS
// entries and are exactly who a player asks about the bus, the tariff and the
// tiers. They come off the ROOM's own flags, so a new massage shop is covered
// the day it is authored.
function mouths(roles) {
  const here = (typeof _npcsHere === "function" ? _npcsHere() : []).filter(id => NPCS[id]);
  const kind = id => NPCS[id].manager ? "manager"
    : (NPC_ROLES[id] || NPCS[id].house) ? "staff"
    : NPCS[id].filler ? null
    : "regular";
  const picked = [];
  for (const want of roles || ["staff", "manager", "regular"]) {
    const id = here.find(i => kind(i) === want);
    if (id) picked.push({ role: want, id, name: NPCS[id].name });
  }
  const r = ROOMS[G.room] || {};
  const want = roles || ["staff", "manager", "regular"];
  if (want.includes("staff")) {
    if (r.motosai) picked.push({ role: "piwin", name: "piwin" });
    if (r.massage) picked.push({ role: "masseuse", name: "masseuse" });
    if (r.soapy) picked.push({ role: "manageress", name: "manageress" });
  }
  return picked;
}

function ask(room, who, topic, hour, day) {
  fresh(room, hour, day);
  if (who.id) (G.known = G.known || {})[who.id] = true;
  const name = who.name.toLowerCase();
  out.length = 0; doCommand("talk to " + name);
  out.length = 0; doCommand(`ask ${name} about ${topic}`);
  return out.join("\n").trim();
}

// ── known-benign, each with the reason it is not a finding ──────────────────
// Keyed "<fact>|<role>". EMPTY ON A CLEAN TREE, which is the point: the one
// standing judgement call — that a punter on the next stool is a customer and
// not the menu — is expressed where it belongs, as `roles: ["staff", "manager"]`
// on the prices row, so the question is never put to him rather than put and
// then excused. Put an entry here only when a mouth is genuinely asked and
// genuinely should not know, and write WHY.
const OK = new Map([]);

// ── play it ────────────────────────────────────────────────────────────────
const findings = [];
const suppressed = [];
let played = 0, skipped = 0;

for (const f of FACTS) {
  if (onlyFact && f.fact !== onlyFact) continue;

  // Tan reads a venue by name, from wherever he is
  for (const venue of f.tan || []) {
    const room = _npcWhere("tan") || NPCS.tan.room;
    if (!room) { skipped++; continue; }
    played++;
    const tan = { id: "tan", name: "Tan" };
    const reply = ask(room, tan, venue, f.hour);
    if (isMiss(reply, oracleFor(room, tan, f.hour)))
      findings.push({ fact: f.fact, why: f.why, who: "Tan", role: "the fixer",
        room, cmd: `ask tan about ${venue.toLowerCase()}`, reply: reply.slice(0, 120) });
  }

  // Mort stands behind his column
  for (const subj of f.mort || []) {
    const room = _npcWhere("mort") || NPCS.mort.room;
    if (!room) { skipped++; continue; }
    played++;
    const mort = { id: "mort", name: "Mort" };
    const reply = ask(room, mort, subj, f.hour);
    if (isMiss(reply, oracleFor(room, mort, f.hour)))
      findings.push({ fact: f.fact, why: f.why, who: "Mort", role: "regular",
        room, cmd: `ask mort about ${subj}`, reply: reply.slice(0, 120) });
  }

  for (const room of f.rooms || []) {
    if (!ROOMS[room]) { skipped++; continue; }
    fresh(room, f.hour, f.day);
    const who = mouths(f.roles);
    if (!who.length) { skipped++; continue; }
    for (const m of who) {
      const key = f.fact + "|" + m.role;
      // EVERY phrasing must miss before it is a finding: a player types one of
      // them, and the fact is answerable if any of them lands.
      const oracle = oracleFor(room, m, f.hour, f.day);
      let landed = null, last = "";
      for (const topic of f.asks) {
        played++;
        const reply = ask(room, m, topic, f.hour, f.day);
        last = reply;
        if (SHOW) console.log(`  [${f.fact}] ${room} / ${m.name} / ${topic} -> ` +
          (isMiss(reply, oracle) ? "MISS " : "ok   ") + reply.replace(/\n/g, " ").slice(0, 140));
        if (!isMiss(reply, oracle)) { landed = topic; break; }
      }
      if (landed) continue;
      if (OK.has(key)) { suppressed.push(`${key} — ${OK.get(key)}`); continue; }
      findings.push({ fact: f.fact, why: f.why, who: m.name, role: m.role, room,
        cmd: `ask ${m.name.toLowerCase()} about ${f.asks[0]}`,
        tried: f.asks, reply: last.slice(0, 120) });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ played, skipped, dead: findings.length, findings,
    suppressed: [...new Set(suppressed)] }, null, 1));
  process.exit(0);
}

console.log(`askable-audit: ${played} questions put, ${findings.length} unanswered, ` +
  `${new Set(suppressed).size} known-benign suppressed\n`);
for (const f of findings) {
  console.log(`✗ ${f.cmd.toUpperCase()}   [${f.room}, ${f.role}]`);
  console.log(`    the engine knows: ${f.why}`);
  if (f.tried && f.tried.length > 1) console.log(`    tried: ${f.tried.join(" · ")}`);
  console.log(`    ${f.reply.replace(/\n/g, " ")}`);
  console.log();
}
if (!findings.length) console.log("Every fact the town computes is a question somebody answers.");
if (skipped) console.log(`(${skipped} not played — nobody in the room, or the room doesn't exist.)`);
