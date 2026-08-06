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
