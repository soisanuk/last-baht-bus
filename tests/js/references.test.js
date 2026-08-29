// Reference lint (design backlog §4, tier 1): prose that NAMES something must
// name something real. Catches the class where a rename orphans old prose — a
// bar loses its `bar:` label, a character is renamed (the Tan/Taan collision),
// a venue is cut — and the lines that pointed at it keep pointing.
//
// Deliberately shaped as a CORPUS test like decorate.test.js: it scans all the
// prose rather than checking hand-listed cases, so a new bad reference fails the
// suite with no wordlist to maintain. Sibling of the promise lint (verbs resolve)
// and the dossier pivot (claims agree) — see docs/prose-defects.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const SRC = p => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const world = SRC("../../web/js/world.js");

// The corpus tool is the single source of "what prose exists" — reuse it rather
// than re-implementing collection (it covers tables, pools AND function bodies).
const records = execFileSync("node",
  [fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url)), "--json"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .trim().split("\n").filter(Boolean).map(l => JSON.parse(l));

test("the corpus is actually collecting (guards against a silent extraction break)", () => {
  assert.ok(records.length > 4000, `only ${records.length} records — collection regressed?`);
  const groups = new Set(records.map(r => r.group));
  for (const g of ["npc", "room", "pool", "fn"]) assert.ok(groups.has(g), `missing group: ${g}`);
});

test("every venue-shaped name in prose is a real venue", () => {
  const bars = new Set([...world.matchAll(/bar: "([^"]+)"/g)].map(m => m[1]));
  const names = new Set([...world.matchAll(/name: "([^"]+)"/g)].map(m => m[1]));
  // hotels live in _HOTELS (engine-core), not a world.js table
  for (const m of SRC("../../web/js/engine-core.js").matchAll(/name: "([^"]+)"/g)) names.add(m[1]);
  // Places the fiction names on purpose that are NOT playable rooms: a dead bar
  // in a nostalgia list, the expats' black joke for the condo balconies.
  const FICTIONAL = new Set(["The Marine Bar", "Pattaya Flying Club", "The Pattaya Flying Club"]);
  const CAND = /\b([A-Z][a-z]+(?: [A-Z][a-z]+){1,3}(?: Bar| Lounge| Club| A-Go-Go| Go-Go| Inn| Hotel))\b/g;
  const bad = [];
  for (const r of records) {
    for (const m of r.text.matchAll(CAND)) {
      const v = m[1];
      if (bars.has(v) || names.has(v) || FICTIONAL.has(v)) continue;
      // an article in front of a real venue is just English
      if (bars.has(v.replace(/^The /, "")) || names.has(v.replace(/^The /, ""))) continue;
      bad.push(`${r.ref}: "${v}"`);
    }
  }
  assert.deepEqual(bad, [], "prose names a venue that doesn't exist (rename orphan?)");
});

test("a venue placed in a district by prose is actually IN that district", () => {
  // The containment lint the 2026-08-17 playtest proved was missing: every clue
  // in the wallet quest said Rainbow Girls was at LK Metro while the room said
  // region: "Tree Town" — and it passed every existing check, because the venue
  // existed, the district existed, and all four wrong claims AGREED with each
  // other. Existence and consistency were linted; the RELATION never was. This
  // joins prose claims against the world graph: a real venue name with a real
  // district name in its close context must name the venue's own region —
  // unless the true region also appears (a "moved from X to Y" is honest).
  const load = f => vm.runInThisContext(SRC("../../web/js/" + f));
  // vm top-level consts land in the global LEXICAL scope — bare identifier, not
  // globalThis (the documented gotcha).
  if (typeof ROOMS === "undefined") { load("thai.js"); load("world.js"); }
  const R = ROOMS;
  const venueRegion = new Map();
  for (const room of Object.values(R)) {
    if (room.bar && room.region) venueRegion.set(room.bar, room.region);
  }
  const regions = [...new Set(Object.values(R).map(r => r.region).filter(Boolean))];
  const WIN = 90; // chars of context either side that count as "a claim about it"
  // Cross-references the fiction makes on purpose (each verified true by hand,
  // 2026-08-17): "Second Road" near Rompho/Soi 7 is the JOMTIEN second road
  // (local usage, not the Pattaya region); the Blue Dog sits ON Beach Road at
  // the foot/mouth of Soi 6; soi6_deep honestly says the soi runs on TOWARD
  // Second Road; the Adonis Club's "Supertown, Jomtien" is the colloquial name
  // for the complex off Thappraya.
  // Entries may use [] in place of an array index; the comparison strips indices
  // so inserting a dialogue node never re-opens a settled question.
  const OK = new Set([
    'npc.sumalee.dialogue[].text: "Rompho Market" placed in "Second Road" (is Jomtien)',
    'room.soi_rompho.desc: "Rompho Market" placed in "Second Road" (is Jomtien)',
    'room.jomtien_2nd.desc: "Rompho Market" placed in "Second Road" (is Jomtien)',
    'room.beach_rd_n.revisit[1]: "Blue Dog" placed in "Soi 6" (is Beach Road)',
    'room.stinky_bar.desc: "Blue Dog" placed in "Soi 6" (is Beach Road)',
    'room.soi6_deep.revisit[0]: "Kitten Corner" placed in "Second Road" (is Soi 6)',
    'engine-systems.js:_doHire[0]: "The Adonis Club" placed in "Jomtien" (is Thappraya)',
  ]);
  const bad = [];
  for (const rec of records) {
    for (const [venue, region] of venueRegion) {
      let idx = rec.text.indexOf(venue);
      while (idx !== -1) {
        const ctx = rec.text.slice(Math.max(0, idx - WIN), idx + venue.length + WIN);
        for (const other of regions) {
          if (other === region) continue;
          if (venue.includes(other)) continue;          // "Tree Town Bar"-style self-hits
          if (!ctx.includes(other)) continue;
          if (ctx.includes(region)) continue;           // the truth is present too
          // a region name that is part of a DIFFERENT venue's name in the same
          // breath ("Soi 6" inside "Soi 6 challenge") still counts — that's the
          // defect. Only the OK list excuses a hit.
          const key = `${rec.ref}: "${venue}" placed in "${other}" (is ${region})`;
          // Compare with the ARRAY INDEX STRIPPED. Keying an allowlist on
          // dialogue[3] means the next person to author a node above it trips a
          // lint about prose they never touched — which is exactly what happened
          // when Sumalee gained a line about Roger and her Rompho entry slid to
          // [4]. The claim is about the text, not about where it sits.
          if (!OK.has(key) && !OK.has(key.replace(/\[\d+\]/g, "[]"))) bad.push(key);
        }
        idx = rec.text.indexOf(venue, idx + 1);
      }
    }
  }
  assert.deepEqual(bad, [], "prose puts a venue in the wrong district — the Rainbow Girls class");
});

test("every character named in an instruction is somebody you can address", () => {
  // "ask Candy", "give it to Ploy" — an instruction pointing at a person who
  // doesn't exist is a dead end the player can't act on.
  const last = new Set([...world.matchAll(/name: "([^"]+)"/g)].map(m => m[1].split(" ").pop()));
  const NOT_PEOPLE = new Set(["The", "Pattaya", "Thai", "Soi", "Beach", "Walking", "Second",
    "Naklua", "Jomtien", "Bangkok", "Buakhao", "God", "Mama", "Madam", "Miss", "Khun",
    "Lady", "Sang", "Sabai", "Jack"]);
  const REF = /\b(?:ask|tell|see|find|talk to|give it to|take it to) ([A-Z][a-z]{2,})\b/g;
  const bad = [];
  for (const r of records) {
    for (const m of r.text.matchAll(REF)) {
      const n = m[1];
      if (last.has(n) || NOT_PEOPLE.has(n)) continue;
      bad.push(`${r.ref}: "${m[0]}"`);
    }
  }
  assert.deepEqual(bad, [], "prose sends the player to somebody who isn't in the game");
});

test("prose doesn't hard-code a price that already has a constant", () => {
  // The Nu-฿90-beer class: a number typed into prose drifts the moment the
  // constant moves.
  //
  // Two things force this to scan the SOURCE, not the corpus. (1) world.js
  // records are evaluated, so a correctly-concatenated `"฿" + BEER_PRICE` is
  // indistinguishable from a typed "฿80". (2) The economy reuses round numbers —
  // ฿300 is the ATM fee AND a Thai massage AND the joiner fee; ฿500 is the quiz
  // prize AND the wallet — so only constants with a DISTINCTIVE value can be
  // checked this way at all. Source-scanning fixes (1); (2) is why the guarded
  // list is short and a couple of genuine collisions are named below.
  const FILES = ["world.js", "engine-core.js", "engine-encounters.js",
    "engine-play.js", "engine-systems.js", "engine-parser.js"];
  const num = k => Number((world.match(new RegExp(`const ${k}\\s*=\\s*(\\d+)`)) || [])[1]);
  const GUARDED = ["BEER_PRICE", "LADY_DRINK", "BUS_FARE"].map(k => [k, num(k)]);
  const OK = [
    /SUNGLASSES ฿150/, /BUY SANDALS ฿150/, /BUY LINGERIE ฿150/, // not lady drinks
    /฿80 BOLT/,                                                 // a taxi that costs a beer
    /opts: \[/,   // QUIZ_POOL: the number IS the question — options must be literal
  ];
  const bad = [];
  for (const f of FILES) {
    SRC("../../web/js/" + f).split("\n").forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "");     // a comment may quote a price freely
      for (const [name, v] of GUARDED) {
        if (!v || !new RegExp(`฿${v}\\b`).test(code)) continue;
        if (code.includes(name)) continue;          // concatenated — that's the fix
        if (OK.some(re => re.test(code))) continue; // a different thing that costs the same
        bad.push(`${f}:${i + 1}: ฿${v} typed out; use ${name}`);
      }
    });
  }
  assert.deepEqual(bad, [], "a price is hard-coded in prose instead of tracking its constant");
});

// ── Layer 2: claims (docs/prose-defects.md) ─────────────────────────────────
// tools/prose-claims.mjs turns prose into claims about the world and checks
// them against the world: attribute-slot conflicts per subject (the minibus
// shape — two vehicles for one Tan), location claims vs where an NPC actually
// is, and spoken invitations vs the verbs that would deliver them. Genuine
// conflicts are recorded IN THE TOOL with a reason, so this test just asserts
// the report is empty. Proven against an injected minibus, not just a clean run.
test("prose claims agree with the world", () => {
  const out = execFileSync("node",
    [fileURLToPath(new URL("../../tools/prose-claims.mjs", import.meta.url)), "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const findings = JSON.parse(out);
  assert.deepEqual(findings, [],
    "a prose claim contradicts the world (or needs a reason in the tool's OK list)");
});
