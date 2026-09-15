// Template & predicate lints — classes K (multi-stop clock), L (the wrong
// predicate) and M (one template, many people) from
// docs/persona-findings-systemic.md. Three different instruments, in one file
// because they share a thesis: **a fact the engine already holds, consulted in
// some places and not in others.** The prose lints next door read what a string
// SAYS; these read what the code ASKS.
//
//   1. THE CLOCK, in the scenes that repeat. A re-enterable encounter step must
//      cost more than a turn, or a three-stop night ends at the minute it began
//      and then narrates dawn. Driven through doCommand, because the defect is
//      in what the ORCHESTRATOR does between the calls (CLAUDE.md's real-path
//      rule): each resolver was correct on its own.
//   2. THE PREDICATE, by source inspection. `G.known` and `G.talked` both read
//      as "knows her"; `_sheltered` and `_underRoof` both read as "indoors";
//      `region !== "Jomtien"` reads as "out of town". The named helpers
//      (`_met`, `_texts`, `_inTown`, `_underRoof`, `_pr`) are the fix and this
//      is what keeps them the fix. Every allow-list entry carries the reason the
//      raw form is right THERE — which is the only thing that makes a list like
//      this worth having, per AFFORD_OK.
//   3. THE PRONOUN, as a REPORT and deliberately not a gate. 318 corpus records
//      interpolate a person and contain a bare pronoun, and the overwhelming
//      majority are honest: a pool written for the floor is written for women
//      because the floor is women. Gating that would be a lint whose every hit
//      is benign. The report prints counts by file so the number is watched, and
//      the fixing is aimed by hand at the sites whose cast has BOTH genders in
//      it (§3.5's "advisory list first").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const SRC = p => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const ENGINE = ["engine-core.js", "engine-encounters.js", "engine-play.js",
  "engine-systems.js", "engine-parser.js"];

for (const f of ["thai.js", "world.js", "games.js", "lang.js", ...ENGINE])
  vm.runInThisContext(SRC("../../web/js/" + f), { filename: f });

let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const text = () => out.join("\n");

function sandbox() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight" };
  G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
  G.money = 40000; G.hunger = 20; G.thirst = 20; G.battery = 100;
  G.lastSaleng = G.lastPeddler = G.lastPolice = G.lastEnc = 99999;
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.rain = 0; G.pendingEnc = null; G.pendingChoice = null;
}

// ── 1. a scene that repeats must spend the night it narrates ────────────────
// The night ride already had this right (RIDE_STOP_TURNS) because a persona
// walked it; the bar-hop did not, and said so out loud — "her friend's bar
// swallows an hour" while the clock moved six minutes. Measured across ONE step
// of each sequence, through doCommand, from a state the game could really be in.
//
// The bar-hop's SECOND yes and the whole Walking Street party end the night
// outright (`_endNight`), which is the clock's own terminus and not a step; the
// tonic two-step is the documented exception below.
test("a re-enterable encounter step costs more than one turn of the night", () => {
  const step = (setup, cmd) => {
    sandbox(); setup();
    const t0 = G.nightTurn, d0 = G.day;
    out = []; doCommand(cmd);
    return { moved: G.day !== d0 ? Infinity : G.nightTurn - t0, ended: G.day !== d0 };
  };
  const ride = step(() => {
    G.room = "lucky_tiger"; G.nightTurn = 62; G.soc.drinks.lek = 13;
    G.rideSeq = { id: "lek", stops: 0, spent: 0, seen: [], sanuk: 0 };
    G.pendingEnc = "nightride";
  }, "ride on");
  assert.ok(ride.moved > 1, `a night-ride stop spent ${ride.moved} turn(s)`);

  const hop = step(() => {
    G.room = "candy_bar"; G.nightTurn = 40;
    G.bfSeq = { id: "bua", kind: "barhop", fine: 700, spent: 0, room: "candy_bar" };
    G.pendingEnc = "bfhop";
  }, "yes, one drink");
  assert.ok(hop.moved > 1, `a bar-hop stop spent ${hop.moved} turn(s) — the prose says an hour`);

  // the party is one step and it closes the night; assert that, so a future
  // rewrite that makes it re-enterable lands here instead of shipping silent.
  const party = step(() => {
    G.room = "candy_bar"; G.nightTurn = 40;
    G.bfSeq = { id: "bua", kind: "wsparty", fine: 700, spent: 0, room: "candy_bar" };
    G.pendingEnc = "bfparty";
  }, "yes, meet the friends");
  assert.ok(party.ended, "the Walking Street party still ends the night in one step");
});

// Known-benign, with the reason: the tonic tout's two-step is the one
// re-enterable sequence whose steps really are minutes. Its own prose sets the
// scale — "thirty seconds down a side soi" — and the back room is a single
// pressured exchange you walk out of, not a stop you spend an hour in.
test("the tonic two-step is short because its own prose says it is short", () => {
  sandbox();
  G.room = "beach_rd_c"; G.nightTurn = 30; G.encDone.tonic = false;
  _startEnc("tonic");
  out = []; doCommand("follow him to the shop");
  assert.equal(G.pendingEnc, "tonic", "the shop re-arms the encounter");
  assert.match(text(), /Thirty seconds down a side soi/,
    "if this stops saying thirty seconds, the step needs to start costing turns");
});

// ── 2. the wrong predicate, by source inspection ────────────────────────────

// Blank out comments and string/template literals: a lint that reads prose
// ABOUT a predicate instead of a call TO it reports its own documentation as the
// defect (the comment above `_navHere` names `_sheltered()` while not calling
// it). ONE left-to-right scan, not a chain of regexes, and both halves of that
// are load-bearing. A chain strips backticks independently of quotes, so a lone
// ` inside a "…" string opens a template literal that runs for two thousand
// lines; and DELETING rather than blanking takes the line numbers with it. The
// first draft did both, collapsed engine-systems.js from 10,003 lines to 5,219,
// and went green on three injected regressions.
function codeOf(src) {
  let out = "", i = 0;
  const n = src.length;
  const skip = c => (out += c === "\n" ? "\n" : " ");
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") skip(src[i++]); continue; }
    if (c === "/" && src[i + 1] === "*") {
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) skip(src[i++]);
      skip(" "); skip(" "); i += 2; continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c; skip(" "); i++;
      while (i < n) {
        if (src[i] === "\\") { skip(" "); skip(" "); i += 2; continue; }
        if (src[i] === q) { skip(" "); i++; break; }
        if (src[i] === "\n" && q !== "`") break;   // unterminated: a regex's quote, not a string
        skip(src[i++]);
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}
const lines = f => codeOf(SRC("../../web/js/" + f)).split("\n");

test("`G.known` is never read as 'have I met them' — that is `_met`", () => {
  // G.known is written by _learnNames the first time a name PRINTS, so it means
  // "the transcript has said this name". That is the right gate for a spoiler
  // and the wrong one for acquaintance: Waen texted homework to a stranger and
  // the manager's welcome shot could never say "new face", because his own room
  // description had introduced him a line earlier.
  const OK = [
    ["engine-core.js", "the resolver, the spoiler gates and the writes all live here: " +
      "_learnNames writes it, _topicKnown and _npcLabel gate an OFFERED name on it, " +
      "and _elsewhereLine uses it to decide whether naming somebody's bar is a spoiler."],
    ["engine-play.js", "_piwinAbout asks whether YOU have heard the name you just typed — " +
      "a spoiler gate on the player's knowledge, not on the acquaintance."],
    ["engine-parser.js", "_addPhoto WRITES it: photographing somebody teaches you their name."],
    ["engine-systems.js", "_doQuests masks an unreached Act One step's name on it — a spoiler gate on " +
      "what the transcript has printed (Ruth, round 47: 'Madam Oy' on the beach); _frontier and " +
      "the journal read it as 'named to you', which is exactly what it means."],
  ];
  const bad = [];
  for (const f of ENGINE) {
    if (OK.some(([file]) => file === f)) continue;
    lines(f).forEach((l, i) => {
      if (/G\.known\s*\[/.test(l) && !/G\.known\s*\[[^\]]*\]\s*=[^=]/.test(l))
        bad.push(`${f}:${i + 1}: ${l.trim()}`);
    });
  }
  assert.deepEqual(bad, [],
    "reading G.known as 'met' — use _met(id), or add the file to this test's OK list " +
    "with the reason the spoiler gate is what you meant");
});

test("a SET of districts is a named predicate, not a regex at the call site", () => {
  // The single-region tests are fine and there are twenty of them — the Darkside
  // lock-in, Soi 6's etiquette, the Beach Road motel — each a rule about one
  // named place. What is never fine is a GROUP of regions written inline: that
  // is a concept ("in town", "the far side of the bay") wearing a regex, and the
  // one that shipped told a man stranded on Pratumnak to walk it (round 47).
  // _inTown is the named form; new groups belong beside it in engine-core.
  const REGIONS = [...new Set(Object.values(ROOMS).map(r => r.region).filter(Boolean))];
  const named = REGIONS.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const SET = new RegExp(`(?:\\/\\^?\\((?:${named})(?:\\|[^)]*)\\)|\\[\\s*(?:""|''|\`\`)[^\\]]*\\]\\s*\\.(?:includes|indexOf))`);
  const bad = [];
  for (const f of ENGINE) {
    if (f === "engine-core.js") continue;   // _OUT_OF_TOWN and _inTown live there
    lines(f).forEach((l, i) => {
      if (!/\.region\b/.test(l)) return;
      if (SET.test(l)) bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 110)}`);
    });
  }
  assert.deepEqual(bad, [],
    "a group of regions tested inline — give it a name in engine-core.js (see _inTown)");
});

test("`_sheltered` is never used to mean 'there is a roof over your head'", () => {
  // _sheltered means "you can dive in HERE", which is true of a street with a
  // 7-Eleven on it — and Soi 6's two street rooms are exactly that, `outlet`
  // pavement with venues and a bike stand. _underRoof is the roof question, and
  // four sites had been asking the wrong one: the downpour re-announce told you
  // rain was hammering "the roof" on an open soi, the dawn narration gave the
  // Soi 6 pavement the INDOORS all-nighter, the dog went quiet in the rain, and
  // the compass hid itself on the game's most-walked street.
  const OK = new Map([
    ["_sheltered", "its own definition."],
    ["_underRoof", "it is built ON _sheltered — the roof test is shelter minus the street."],
    ["_startRain", "ANDed with `shop || police_station || oy_office`, which is a roof by name."],
    ["_doGo", "the rain move-gate: can you dive into the DESTINATION. That is exactly " +
      "_sheltered's question; the roof claims in the same block already use _underRoof."],
    ["_doTravel", "same question, once per hop of a walked route."],
    ["_rainDiveIn", "same question, for a venues[] door that skips _doGo."],
  ]);
  const bad = [];
  for (const f of ENGINE) {
    let fn = "(top level)";
    lines(f).forEach((l, i) => {
      // top-level declarations only — an inner `const to = …` is not the
      // enclosing function, and treating it as one turns the OK map into noise
      const m = /^(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/.exec(l);
      if (m) fn = m[1] || m[2];
      if (/_sheltered\s*\(/.test(l) && !OK.has(fn))
        bad.push(`${f}:${i + 1} in ${fn}: ${l.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(bad, [],
    "_sheltered() outside the rain move-gate — did you mean _underRoof()? If not, add the " +
    "function to this test's OK map with the reason diving-in is the question you asked");
});

test("the named predicates answer the questions they are named for", () => {
  // The helpers themselves, because a lint that enforces a helper nobody checked
  // is a lint that enforces a bug.
  sandbox();
  assert.equal(_met("bert"), false, "a name you have merely read is not a man you have met");
  G.known.bert = true;
  assert.equal(_met("bert"), false, "…still not, and this is the whole point of the pair");
  G.room = _npcRoom("bert"); doCommand("talk to bert");
  assert.equal(_met("bert"), true, "talking to him is meeting him");

  assert.equal(_inTown("stinky_bar"), true);
  for (const r of ["jomtien_beach", "sukhumvit_crossing", "khao_talo_bar"])
    assert.equal(_inTown(r), false, `${r} is not somewhere you walk into town from`);
  assert.equal(_inTown("pratumnak_rd"), false, "the hill is not in town");

  assert.equal(_texts("priew"), true, "the girl from the clinic is a contact who texts");
  assert.equal(_texts("lek"), true);
  assert.equal(_texts("tan"), false, "Tan answers; he does not chat");

  assert.deepEqual(_pr("bert"), { s: "he", o: "him", p: "his" });
  assert.deepEqual(_pr("angela"), { s: "she", o: "her", p: "her" }, "three of the bench are women");
  assert.equal(_pr("lek").s, "she", "a role-carrier with no `pronoun` field still reads right");
});

// ── 3. the pronoun report (advisory — never a gate) ─────────────────────────
const records = execFileSync("node",
  [fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url)), "--json"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .trim().split("\n").filter(Boolean).map(l => JSON.parse(l));

test("REPORT: prose that interpolates a person and hard-codes a pronoun", () => {
  const PERSON = /\{(?:n|who|name|her|him|his|she|he|girl|lady)\}|\$\{(?:n|who|name|nm|gn|girl|lady)\}|\$\{NPCS\[|\$\{_npcLabel/;
  const BARE = /\b(?:he|she|him|her|his|hers)\b/i;
  const byFile = {};
  for (const r of records) {
    if (!PERSON.test(r.text)) continue;
    const blanked = r.text.replace(/\$\{[^}]*\}/g, " ").replace(/\{\w+\}/g, " ");
    if (!BARE.test(blanked)) continue;
    const f = r.ref.includes(":") ? r.ref.split(":")[0] : r.group;
    byFile[f] = (byFile[f] || 0) + 1;
  }
  const total = Object.values(byFile).reduce((a, b) => a + b, 0);
  console.log(`  pronoun report — ${total} records interpolate a person and name a pronoun:`);
  for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]))
    console.log(`    ${String(n).padStart(4)}  ${f}`);
  console.log("    (most are honest: a pool for the floor is written for women because the " +
    "floor is women. Read the ones whose cast has both genders in it — _pr(id) is the fix.)");
  // The only assertion is that the report is still MEASURING. A silent zero here
  // means the corpus or the heuristic broke, which is the failure mode of every
  // advisory instrument nobody gates on.
  assert.ok(total > 50, `the scan found ${total} — the heuristic or the corpus regressed`);
});
