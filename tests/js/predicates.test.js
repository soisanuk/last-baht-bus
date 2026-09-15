// PREDICATE–CONSUMER REGISTRY (docs/persona-findings-systemic.md §3.1, class I).
//
// THE CLASS, in one sentence: a predicate exists, the mechanic's CORE consults
// it, and its EDGES don't. Round 47's three relationship personas found ~20
// between them and every fix was the same edit — add the predicate to one more
// consumer. The jilt loop souring the girl already on your arm; the police not
// seeing her; the nurse pitching a lady drink across her; the roster listing her
// as floor staff; the affair girl quoting her own barfine to the man she went
// home with; his cashier "keeping an eye on" the owner; her texts asking the
// boss for rent; the bar's drizzle narrated from her pillion seat. Each reads
// correctly where it is written. Nothing enumerates where else it should be.
//
// THIS FILE IS THAT ENUMERATION, and it is the ONLY authored artifact in the set
// — tools/gen-world-graph.mjs derives which functions DO consult each predicate,
// and the report at the bottom prints the ones this registry has not claimed.
// The registry cannot find the next consumer on its own. THE RULE THAT GOES WITH
// IT CAN, and it is the point of the file:
//
//   *** Any new `_say` site that describes a bar, a girl, the police or the room
//   *** must be added to this registry for every predicate it could be wrong
//   *** under, at the time it is written. Half of round 47's class-I findings
//   *** were sites written AFTER the predicate already existed.
//
// Asserted by source inspection: each named function's body is sliced by brace
// matching and must mention the predicate. A few consumers satisfy it in an
// EQUIVALENT form rather than by the helper's name — a room-scoped site cannot
// call `_atOwnBar()`, which reads `G.room`, and a couple predate the helper.
// Those carry `needs:` plus the reason, which also makes them the work queue for
// §3.4 (name the predicate, then lint the raw form out).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ENGINE = ["engine-core.js", "engine-encounters.js", "engine-play.js",
  "engine-systems.js", "engine-parser.js"];
const SRC = {};
for (const f of ENGINE)
  SRC[f] = readFileSync(fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
const GRAPH = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../docs/world-graph.json", import.meta.url)), "utf8"));

// Brace-matched slice from a declaration. The engine is flat classic script, so
// a top-level `function NAME(` is always at column 0; an `_ENC` resolver is a
// method two spaces in, which is why the anchor is a regex and not a name.
function slice(anchor) {
  for (const f of ENGINE) {
    const m = anchor.exec(SRC[f]);
    anchor.lastIndex = 0;
    if (!m) continue;
    const s = SRC[f];
    let d = 0, j = s.indexOf("{", m.index);
    for (; j < s.length; j++) {
      if (s[j] === "{") d++;
      else if (s[j] === "}" && !--d) { j++; break; }
    }
    return { file: f, text: s.slice(m.index, j) };
  }
  return null;
}
const fnBody = name => slice(new RegExp("^function\\s+" + name + "\\s*\\(", "m"));
// the one consumer that is not a top-level function: the police resolver lives
// in the `_ENC` table, which is where every interactive encounter's reaction is
const encBody = name => slice(new RegExp("^  " + name + "\\s*\\(", "m"));

// ── the registry ─────────────────────────────────────────────────────────────
// Every entry below was CONFIRMED true against the sources on 2026-09-15 before
// it was written down; an entry that names a function which does not consult its
// predicate is a lie the next person has to discover, which is worse than a
// short list.
const MUST_CONSULT = {
  // You are on the back of her bike. The town you rode away from must stop
  // narrating itself at you.
  "_onRide()": [
    { fn: "_tick", why: "the five ambient calls it guards — see the dedicated test below" },
    { fn: "_lastBusWarn", needs: "G.rideSeq",
      why: "predates the helper and reads half of it raw; she IS your ride, so the dread lifts" },
  ],

  // A companion is on your arm (the party barfine). She is a person in the room
  // for every purpose the room has.
  "G.party": [
    { fn: "_bfResolve", why: "the jilt loop — a regular of yours souring must not count the girl you are WITH" },
    { fn: "_describeRoom", why: "the Here: line — she is standing there" },
    { fn: "_doBarfine", why: "the ledger only sells you another companion" },
    { fn: "_nursed", why: "her drinks are on the chit; nobody pitches a lady drink across her" },
    { fn: "_maybeEncounter", why: "the `solo` gate — the street does not proposition a man with company" },
    { fn: "_npcRoom", why: "she is in YOUR room wherever you are — which is how _maybeIncomingText's " +
      "away-filter stops texting you from your own elbow, by delegation rather than by its own check" },
    { fn: "_endNight", why: "the three endings: your bed, the dawn goodbye, the companion rescue" },
    { fn: "_arriveAt", why: "_partyArrive — every new venue pays her round" },
    { enc: "police", why: "the police resolver: the officer can see her" },
  ],

  // You are in the staff affair. The bar you own contains your girlfriend and
  // her colleagues, and none of them can be addressed as if it did not.
  "_affairLive()": [
    { fn: "_ownBarTalk", why: "the guv'nor register yields to her" },
    { fn: "_relGreeting", why: "she does not greet you as a returning customer" },
    { fn: "_maybeIncomingText", why: "her texts are not a contact's invites" },
    { fn: "_doTalkBody", why: "the colleague-review block — the other girls know" },
    { fn: "_workFloor", why: "her beats replace the floor rotation's while it is live" },
    { fn: "_affairNight", needs: "G.affair",
      why: "the nightly account reads the object straight (`!a || a.ended` is _affairLive inlined)" },
    { fn: "_conquestHappy", why: "fidelity is absolute — a slip anywhere marks it" },
  ],

  // You are standing in the bar you own. Your staff do not work you like a
  // walk-in, and the house's angles are yours.
  "_atOwnBar()": [
    { fn: "_addHeat", why: "you cannot be thrown out of your own bar" },
    { fn: "_doBuy", why: "the lady-drink branch: busy/contested does not apply to your own girl" },
    { fn: "_ladyDrinkCharge", why: "her drink rings into your own till" },
    { fn: "_housePatience", why: "the seat-rent clock — and by delegation _nursed, which calls it first" },
    { fn: "_endNight", why: "the own-bar rescue: your staff carry you home with your pockets intact" },
    { fn: "_maybeSelfBarfine", why: "the punter-flattery channels are gated off at your own bar" },
    { fn: "_pushyBar", needs: "G.bar.room === room",
      why: "room-scoped, so it cannot use the G.room-reading helper; same question, honest form" },
    { fn: "_lastBusWarn", needs: "G.bar && G.bar.room",
      why: "same shape — standing your own rail, the last bus is not yours" },
  ],
};

for (const [pred, consumers] of Object.entries(MUST_CONSULT)) {
  test(`${pred} is consulted everywhere it can be wrong`, () => {
    const missing = [];
    for (const c of consumers) {
      const b = c.enc ? encBody(c.enc) : fnBody(c.fn);
      const label = c.enc ? `_ENC.${c.enc}` : c.fn;
      assert.ok(b, `${label} is not in the engine any more — prune or rename the registry entry`);
      const needle = c.needs || pred.replace(/\(\)$/, "");
      if (!b.text.includes(needle))
        missing.push(`${label} [${b.file}] no longer mentions ${JSON.stringify(needle)} — ${c.why}`);
    }
    assert.deepEqual(missing, [],
      `${pred} dropped out of a consumer that needs it:\n  ` + missing.join("\n  "));
  });
}

test("_onRide() guards every ambient beat _tick fires at a passenger", () => {
  // The precise claim, because this one is a five-line pattern rather than a
  // mention: inside _tick, each of these calls sits on a line that also asks
  // _onRide(). A sixth ambient call added without the guard narrates the town
  // at somebody who has left it.
  const b = fnBody("_tick");
  assert.ok(b, "_tick");
  for (const call of ["_sayDrizzle", "_salengTick", "_railTick", "_lastBusWarn", "_thaiOverheard"]) {
    const lines = b.text.split("\n").filter(l => new RegExp("\\b" + call + "\\(\\)").test(l));
    assert.ok(lines.length, `_tick no longer calls ${call}() — has it moved? update the registry`);
    for (const l of lines)
      assert.ok(l.includes("_onRide()"),
        `_tick calls ${call}() without the ride guard:\n    ${l.trim()}`);
  }
});

test("every registry entry names a predicate the graph knows about", () => {
  // The graph derives the predicate list; the registry must not drift off it,
  // or this file would be asserting things about a helper nobody has any more.
  const known = new Set(GRAPH.predicates.map(p => p.name));
  const strays = Object.keys(MUST_CONSULT).filter(p => !known.has(p));
  assert.deepEqual(strays, [],
    "registry predicates missing from docs/world-graph.json's PREDICATES list — " +
    "add them to tools/gen-world-graph.mjs or drop them here");
});

test("REPORT: functions that consult a predicate and are not in the registry", () => {
  // Candidates for the next entry, straight off the graph's CONSULTS edges.
  // Printed, never a gate: consulting a predicate is not the same as being
  // REQUIRED to, and half of these are the predicate's own machinery. What the
  // list is for is the opposite direction — a consumer here that is obviously
  // load-bearing and is not registered above is the next class-I finding, found
  // before a persona finds it.
  const lines = [];
  for (const p of GRAPH.predicates) {
    const registered = new Set((MUST_CONSULT[p.name] || []).map(c => c.fn).filter(Boolean));
    const extra = p.consumers.filter(f => !registered.has(f));
    lines.push(`${p.name} — registered ${registered.size}, also consulted by ${extra.length}:`);
    lines.push("    " + (extra.join(" · ") || "none"));
  }
  console.log("\npredicate consumers not in MUST_CONSULT\n  " + lines.join("\n  ") + "\n");
  assert.ok(lines.length, "the report ran");
});
