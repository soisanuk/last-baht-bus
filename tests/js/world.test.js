// World data integrity: every exit resolves, all 16 canon bars are enterable,
// the full hostess roster is placed, and the gossip chain's flags connect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}

test("every exit points to a real room", () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    for (const [dir, to] of Object.entries(room.exits)) {
      assert.ok(ROOMS[to], `${id} exit ${dir} → ${to} (missing room)`);
    }
  }
});

test("every room is reachable from the start", () => {
  // BFS over walking exits, plus transit edges: standing at a bus stop opens
  // every stop on its lines; standing at a motosai stand opens every listed
  // destination. Iterate until the reachable set stops growing.
  const seen = new Set(["jomtien_beach"]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...seen]) {
      const room = ROOMS[id];
      const next = [...Object.values(room.exits), ...(room.venues || [])];
      if (room.busStop) {
        for (const [, stops] of Object.entries(BUS_LINES)) {
          if (stops.includes(id)) next.push(...stops);
        }
      }
      if (room.motosai) {
        next.push(...Object.values(MOTOSAI_DESTS).map(d => d.room));
      }
      for (const to of next) {
        if (!seen.has(to)) { seen.add(to); grew = true; }
      }
    }
  }
  for (const id of Object.keys(ROOMS)) {
    assert.ok(seen.has(id), `room ${id} unreachable`);
  }
});

test("all 20 canon bars exist as enterable rooms", () => {
  const barRooms = Object.values(ROOMS).filter(r => r.bar).map(r => r.bar);
  assert.equal(CANON_BARS.length, 20);
  for (const bar of CANON_BARS) {
    assert.ok(barRooms.includes(bar), `${bar} missing from map`);
  }
});

test("full canon hostess roster is placed in real rooms", () => {
  for (const key of CANON_HOSTESSES) {
    const npc = NPCS[key];
    assert.ok(npc, `hostess ${key} missing`);
    assert.ok(ROOMS[npc.room], `${key} placed in missing room ${npc.room}`);
  }
});

test("every NPC is in a real room and has dialogue", () => {
  for (const [id, npc] of Object.entries(NPCS)) {
    assert.ok(ROOMS[npc.room], `${id} in missing room ${npc.room}`);
    assert.ok(npc.dialogue.length > 0, `${id} has no dialogue`);
    // every NPC needs at least one unconditional fallback line
    const fallback = npc.dialogue.some(d => !d.req && !d.topic);
    assert.ok(fallback, `${id} has no unconditional fallback line`);
  }
});

test("every room has an OSM anchor, and every anchor a room", () => {
  // ROOM_GEO drives tools/gen-map.mjs (the neon map + exits audit) and any
  // future 2D frontend. Presentation-only, but coverage keeps it honest.
  for (const id of Object.keys(ROOMS)) {
    const g = ROOM_GEO[id];
    assert.ok(g, `${id} has no ROOM_GEO entry`);
    assert.ok(g[0] > 12.85 && g[0] < 12.99 && g[1] > 100.85 && g[1] < 101.0,
      `${id} anchored outside greater Pattaya (${g})`);
  }
  for (const id of Object.keys(ROOM_GEO)) {
    assert.ok(ROOMS[id], `ROOM_GEO orphan: ${id}`);
  }
});

test("dialogue items that give an item reference real items", () => {
  for (const [id, npc] of Object.entries(NPCS)) {
    for (const d of npc.dialogue) {
      if (d.gives) assert.ok(ITEMS[d.gives], `${id} gives missing item ${d.gives}`);
    }
  }
});

test("room signs reference real sign entries", () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    if (room.sign) assert.ok(SIGNS[room.sign], `${id} sign ${room.sign} missing`);
  }
});

test("gossip chain flags connect: every required flag is set somewhere", () => {
  const settable = new Set(["knowWasHere", "waiedOy", "waiedPloy", "greetedFon",
    "hasWallet", "gotBusFare", "somTamDelivered", "officeOpen",
    "act1Done",  // engine-set by _checkAct1 — gates sandbox-only quests (The Safe-Cracker)
    "tiffinDelivered", // engine-set by _doGive (tiffin → nont) — "Look in on my boy"
    "keysDelivered",   // engine-set by _doGive (foreman_keys → diamond) — Wimon's letterbox reads it
    "shamrockVisited", // engine-set by _dogShamrock (arriving on the strip with the dog) — Bert's afterword reads it
    "hatchPried",      // set by the Shamrock's reads: hatch node (sets/reveal) — Bert's key node reads it
    "beeBanked",       // engine-set by _doSendMoney (SEND 100 TO BEE) — Bee's investor ack reads it
    "glamTruth", // set by PATRON dialogue (Glam's lucid flash), which this scan doesn't cover
    "knowMikkel", // set by PATRON dialogue (Mikkel's intro), same blind spot as glamTruth
    "hasDog",    // set by the adoption action (FEED DOG), not dialogue
    "expatLife", // set by _goExpat — gates the bar-owning chain to the endless stage
    "barPaid",   // set by _barDeposit (the money has to actually exist), not dialogue
    // the beach amulet — all engine-set, none of them dialogue
    "amuletSeen",     // a piwin read it (_amuletNotice)
    "nokSawAmulet",   // Nok clocked it on arrival (_nokAmulet)
    "amuletReturned", // handed back (_nokTakeAmulet)
    "owlBox15",  // the Nite Owl's personals cipher was solved (_owlBox15Answer) — docs/ctf.md
    "owlAmulet",      // the column printed its one-shot letter (_doColumn)
  ]); // set by engine actions (read/wai/give/enter), not NPC dialogue
  for (const npc of Object.values(NPCS)) {
    for (const d of npc.dialogue) {
      for (const f of d.sets || []) settable.add(f);
    }
  }
  for (const [id, npc] of Object.entries(NPCS)) {
    for (const d of npc.dialogue) {
      for (const f of [...(d.req || []), ...(d.notFlags || [])]) {
        assert.ok(settable.has(f), `${id} requires flag ${f} that nothing sets`);
      }
    }
  }
});

test("items start in real locations", () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.location && item.location !== "inventory") {
      assert.ok(ROOMS[item.location], `${id} starts in missing room ${item.location}`);
    }
  }
});

test("bus lines and motosai destinations reference real rooms", () => {
  for (const [line, stops] of Object.entries(BUS_LINES)) {
    for (const s of stops) assert.ok(ROOMS[s], `bus line ${line} stop ${s} missing`);
    // a stop may serve several lines (beach_rd_s is the interchange) — the tag
    // only marks "a bus stops here"; line membership lives in BUS_LINES
    for (const s of stops) assert.ok(ROOMS[s].busStop, `${s} not tagged as a bus stop`);
  }
  for (const [name, d] of Object.entries(MOTOSAI_DESTS)) {
    assert.ok(ROOMS[d.room], `motosai dest ${name} → ${d.room} missing`);
    assert.ok(d.price > 0);
  }
});

test("encounters reference real, lit, street-side rooms", () => {
  for (const [id, e] of Object.entries(ENCOUNTERS)) {
    assert.ok(e.intro, `${id} has no intro`);
    assert.ok(e.rooms.length, `${id} has no rooms`);
    for (const r of e.rooms) {
      assert.ok(ROOMS[r], `${id} room ${r} missing`);
      assert.ok(!ROOMS[r].bar, `${id} room ${r} is a bar — encounters are street-only`);
      assert.ok(!ROOMS[r].dark, `${id} room ${r} is dark — the dark belongs to soi dogs`);
    }
  }
  // the items encounters hand out exist and start off-map
  assert.equal(ITEMS.moo_ping.location, null);
  assert.equal(ITEMS.hair_tonic.location, null);
});

test("bar-social roles reference real NPCs and cover the roster", () => {
  for (const [id, role] of Object.entries(NPC_ROLES)) {
    assert.ok(NPCS[id], `role assigned to missing NPC ${id}`);
    assert.ok(["hostess", "cashier", "mamasan"].includes(role), `${id}: odd role ${role}`);
  }
  for (const h of CANON_HOSTESSES) assert.ok(NPC_ROLES[h], `${h} has no role`);
});

test("every quest is well-formed: giver, deps, item, and at all resolve", () => {
  for (const [qid, q] of Object.entries(QUESTS)) {
    assert.ok(NPCS[q.giver], `${qid}: giver ${q.giver} is not an NPC`);
    for (const d of q.deps) assert.ok(QUESTS[d], `${qid}: dep ${d} is not a quest`);
    if (q.item) assert.ok(ITEMS[q.item], `${qid}: item ${q.item} missing`);
    if (q.at) assert.ok(typeof q.at === "function" || NPCS[q.at] || PATRONS[q.at] || ROOMS[q.at], `${qid}: at ${q.at} resolves to nothing`); // a function `at` follows the step (resolved live by _qAt)
    if (q.reqFlags) assert.ok(Array.isArray(q.reqFlags) && q.reqFlags.every(f => typeof f === "string"),
      `${qid}: reqFlags must be an array of flag names`);
    assert.ok(q.doneFlag && q.reward, `${qid}: needs doneFlag and reward`);
  }
});

test("the safe PIN's clue flags both exist in dialogue", () => {
  assert.equal(SAFE_PIN, 719);
  const allSets = Object.values(NPCS).flatMap(n => n.dialogue.flatMap(d => d.sets || []));
  assert.ok(allSets.includes("pinPart71"), "nothing sets pinPart71");
  assert.ok(allSets.includes("pinPart9"), "nothing sets pinPart9");
});

test("patrons: real home bars, complete profiles, unconditional fallback", () => {
  assert.ok(Object.keys(PATRONS).length >= 4, "a respectable regulars' bench");
  let hoppers = 0, homebodies = 0;
  for (const [id, p] of Object.entries(PATRONS)) {
    assert.ok(ROOMS[p.home], `${id} home ${p.home} missing`);
    assert.ok(ROOMS[p.home].barType, `${id} home ${p.home} is not a bar`);
    assert.ok(Number.isInteger(p.age) && p.age > 17 && p.age < 100, `${id} age`);
    assert.ok(p.nat && p.name && p.desc && p.emoji, `${id} profile incomplete`);
    assert.ok(p.dialogue.length > 0, `${id} has no dialogue`);
    assert.ok(p.dialogue.some(d => !d.topic), `${id} has no fallback line`);
    p.hops ? hoppers++ : homebodies++;
  }
  assert.ok(hoppers > 0, "somebody barhops");
  assert.ok(homebodies > 0, "somebody never leaves their stool");
});

test("patron day schedules are valid weekday indices", () => {
  for (const [id, p] of Object.entries(PATRONS)) {
    if (!p.days) continue;
    assert.ok(Array.isArray(p.days) && p.days.length > 0, `${id} days empty`);
    for (const d of p.days) {
      assert.ok(Number.isInteger(d) && d >= 0 && d <= 6, `${id} day ${d} out of range`);
    }
  }
});

test("no character name is silently written all-caps in their OWN room's desc (kills its mobile tap target)", () => {
  // term.js's kw-decorator matches character names CASE-SENSITIVELY (a plain
  // "Miss Mala" won't match "MISS MALA" in prose). The game's ALL-CAPS style is
  // for venue names / command hints — a character name in that style renders,
  // but stops being tappable in that sentence. Caught live 2026-07-22 (Peacock
  // Cabaret's arrival desc wrote "MISS MALA"/"PETCH" as subjects — the "Here:"
  // roster line still worked, but the flavour-text mention silently didn't).
  // Scoped to rooms the character actually stands in (not every room in the
  // game) — a short/common-word name (e.g. filler cashier "Care") will
  // coincidentally substring-match unrelated ALL-CAPS venue names elsewhere
  // (e.g. "TAKE CARE ME") with zero real tap-target ambiguity there.
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.name === n.name.toUpperCase()) continue; // e.g. single-letter/lowercase-first filler
    const rooms = n.bars ? n.bars : n.room ? [n.room] : [];
    const upper = n.name.toUpperCase();
    const re = new RegExp(`\\b${upper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    for (const rid of rooms) {
      const r = ROOMS[rid];
      if (r && r.desc) assert.ok(!re.test(r.desc),
        `${rid}: "${upper}" (${id}'s own room) — write "${n.name}" (natural case) so it stays tappable`);
    }
  }
});

// ── no one-way street-scale exits ───────────────────────────────────────────
// When a soi gets its own junction room, the pre-junction shortcut into it has
// to go, and twice in one day it didn't: second_rd_n kept a `soi8:` into Soi 8
// after second_rd_soi8 existed, and second_rd_c kept a `diana:` into Soi Diana
// from 489 m away. Both were one-way — you entered the soi from the wrong
// block and came back out somewhere else entirely — and both were INVISIBLE on
// the KML, because gen-kml only draws cardinal exits. Nothing caught them.
//
// The rule: if two GEOLOCATED rooms are a street apart (>150 m) and one links
// to the other, the other must link back somehow — by any exit name, in either
// direction. Doors into venues (in/out) are exempt, and so is anything under
// 150 m, which is a doorway rather than a street.
//
// This does NOT require reciprocal COMPASS words. Tree Town's Back Lane is
// deliberately non-reciprocal (see the ROOM_GEO header) and passes, because a
// way back exists even though it isn't the mirrored direction.
test("no one-way street-scale exit: a soi's old bypass must die when it gets a junction", () => {
  const m = (a, b) => Math.hypot((b[0] - a[0]) * 111320, (b[1] - a[1]) * 108501);
  const oneWay = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    if (!ROOM_GEO[id]) continue;
    for (const [dir, to] of Object.entries(r.exits || {})) {
      if (!ROOM_GEO[to] || dir === "in" || dir === "out") continue;
      if (m(ROOM_GEO[id], ROOM_GEO[to]) < 150) continue;
      if (Object.values(ROOMS[to].exits || {}).includes(id)) continue;
      oneWay.push(`${id} -${dir}-> ${to} (${m(ROOM_GEO[id], ROOM_GEO[to]).toFixed(0)}m, no way back)`);
    }
  }
  assert.deepEqual(oneWay, [],
    "a street-scale exit with no return — usually a shortcut left behind when the " +
    "destination got its own junction room:\n  " + oneWay.join("\n  "));
});

// ── no filler row may silently vanish ───────────────────────────────────────
// A filler girl's id was her nickname lowercased, so reusing a nickname did not
// error — the later row overwrote the earlier one and that girl silently MOVED
// bars. Five did (Club Mirage, Candy Bar 2, Las Vegas, Jasmine Garden) before
// anyone noticed, and nothing in the suite objected.
//
// _fillerId now scopes a taken nickname to <room>_<name>, so duplicates are
// legal and Thailand can have as many girls called Bow as it likes. This asserts
// the rows and the roster stay in step: every row produces its own NPC, at its
// own room. The failure it guards is silent data loss, which is why it counts
// rather than spot-checks.
test("every filler row produces its own NPC at its own bar — none is overwritten", () => {
  const rows = [
    ..._FILLER_HOSTESSES.map(r => [...r, "hostess"]),
    ..._FILLER_MAMAS.map(r => [...r, "mamasan"]),
    ..._FILLER_CASHIERS.map(r => [...r, "cashier"]),
  ];
  // (name, room) must be unique — the same girl twice in one bar IS a typo
  const seen = new Map(), dupes = [];
  for (const [name, , room] of rows) {
    const k = name + "@" + room;
    if (seen.has(k)) dupes.push(k); else seen.set(k, true);
  }
  assert.deepEqual(dupes, [], "the same filler name twice in one bar:\n  " + dupes.join("\n  "));

  const filler = Object.entries(NPCS).filter(([, n]) => n.filler);
  assert.equal(filler.length, rows.length,
    `${rows.length} filler rows produced ${filler.length} NPCs — a row was overwritten`);

  for (const [name, , room, role] of rows) {
    const hit = filler.filter(([, n]) => n.name === name && n.room === room);
    assert.equal(hit.length, 1, `${name} @ ${room} should appear exactly once`);
    assert.equal(NPC_ROLES[hit[0][0]], role, `${name} @ ${room} keeps her role`);
  }
});

// ── every character has a pronoun, and it agrees with their own prose ───────
// Added for the Second Road agent (2026-08-09): the export publishes `pronoun`
// so neither game has to infer one. Their report prose called a male manager
// "she" for six weeks, which is the failure this prevents.
//
// Two assertions, and the second is the one that will actually catch things.
// Completeness is easy to satisfy; AGREEMENT is what rots, because a desc gets
// rewritten and the field silently stops matching. So the field is checked
// against the character's own description, which is where the game says what
// it thinks they are.
//
// Note what is deliberately NOT asserted: any link between pronoun and role.
// The cast includes kathoey characters and a tom cashier, the writing has
// always used "she" for them, and the field reports the prose rather than
// imposing a rule about who may be what.
test("every NPC and patron resolves a pronoun, and it matches their own desc", () => {
  const all = [...Object.entries(NPCS), ...Object.entries(PATRONS)];
  const unresolved = all.filter(([id]) => !_pronoun(id)).map(([id]) => id);
  assert.deepEqual(unresolved, [],
    "no pronoun and no lady-role default — add an explicit `pronoun` to:\n  " +
    unresolved.join("\n  "));

  const HE = /\b(he|him|his)\b/gi, SHE = /\b(she|her|hers)\b/gi;
  const disagree = [];
  for (const [id, c] of all) {
    const p = _pronoun(id);
    if (p === "they") continue;                       // "security" is three men
    const h = (String(c.desc || "").match(HE) || []).length;
    const s = (String(c.desc || "").match(SHE) || []).length;
    if (h === 0 && s === 0) continue;                 // desc names no pronoun
    const says = h > s ? "he" : s > h ? "she" : null;
    if (says && says !== p) disagree.push(`${id}: field "${p}" but desc reads "${says}"`);
  }
  assert.deepEqual(disagree, [],
    "a pronoun contradicts the character's own description:\n  " + disagree.join("\n  "));
});

// A venue that CALLS itself a massage shop must be one mechanically. Half Moon
// and Hillside on Pratumnak shipped with the name, the bar entry and the prose
// but no `massage` flag, so MASSAGE in either answered "No massage bench here"
// while standing under the sign. The art pipeline found it — they typed as
// `street` and were about to be rendered as roads — which is the wrong place
// for it to surface, and the tempting fix (a name heuristic in the manifest
// generator) would have made the art right and left the shop broken, quietly,
// forever. So the check belongs here, against the world.
test("a room named for massage carries the flag that makes MASSAGE work", () => {
  const missing = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    if (!r.bar || !/\bmassage\b/i.test(r.bar)) continue;   // street rows aren't shops
    if (r.massage || r.soapy) continue;
    missing.push(`${id} ("${r.bar}")`);
  }
  assert.deepEqual(missing, [],
    "these rooms advertise massage but have neither `massage: \"legit\"|\"oil\"` nor " +
    "`soapy: true`, so the verb refuses inside the shop:\n  " + missing.join("\n  "));

  // and the flag's value has to be one the handler branches on
  const bad = Object.entries(ROOMS)
    .filter(([, r]) => r.massage && !["legit", "oil"].includes(r.massage))
    .map(([id, r]) => `${id}: massage=${JSON.stringify(r.massage)}`);
  assert.deepEqual(bad, [], "unknown massage kind (_doMassage handles legit and oil):\n  " + bad.join("\n  "));
});

// world.test.js loads only thai.js + world.js, so the engine's stripMarkup
// isn't in scope — the braces are render-only markup and a local strip is enough.
const _strip = t => String(t).replace(/\{\{|\}\}/g, "");

// ── Room prose must name the directions the room actually has ────────────────
// Persona reports A#4/A#5/A#15/B#12/B#17 (2026-08-23): four rooms pointed the
// player at a compass direction the exits table did not have, and one was
// written for a single approach so half the arrivals read it backwards.
test("no room's prose sends you a direction it doesn't have", () => {
  // Only checks the explicit "X is to the <dir>" shapes — a full NLP pass would
  // be noise. These are the phrasings that actually misled somebody.
  const DIRS = { north: "n", south: "s", east: "e", west: "w" };
  const bad = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    const desc = _strip(String(r.desc || ""));
    for (const m of desc.matchAll(/\b(?:opens?|runs?|lies?|is|climbs?|drops?)\s+(?:back\s+|on\s+|away\s+)?(?:to the\s+|up to the\s+)?(north|south|east|west)\b/gi)) {
      const dir = DIRS[m[1].toLowerCase()];
      if (!r.exits || !r.exits[dir]) bad.push(`${id}: prose says ${m[1]}, no ${dir} exit`);
    }
  }
  // A clause may legitimately describe geography beyond this room's own exits
  // ("Walking Street is on north" from a road that reaches it by another key),
  // so this is an allow-list, not a zero — each entry is a deliberate one.
  // Same discipline as the reference lint's OK list and afford-audit's AFFORD_OK:
  // a named exception with a reason, never a silent loosening of the matcher.
  const OK = new Set([
    // "the bars… with their fronts open to the west" — a description of which way
    // the buildings face, not a route out of the room. The sea IS west; there is
    // just no road across it.
    "beach_rd_soi8: prose says west, no w exit",
  ]);
  const real = bad.filter(b => !OK.has(b));
  assert.deepEqual(real, [], "prose direction with no matching exit");
});

test("Pratumnak Road's hill turning and pier are discoverable from the prose", () => {
  const r = ROOMS.pratumnak_rd;
  const desc = _strip(r.desc).toLowerCase();
  assert.ok(desc.includes("hill"), "the hill road is named");
  assert.ok(desc.includes("pier"), "so is the pier — both were exits-line-only");
  assert.equal(r.exits.hill, "pratumnak_hill_rd", "and HILL is the honest key for the crest");
});

test("Tree Town's Far Lane says which bar is which door", () => {
  // its w/e exits ARE bar doors, so mapping the maze by compass walks you indoors
  const desc = _strip(ROOMS.tt_lane_3.desc);
  assert.match(desc, /LUCKY CHARM BAR is the door west/);
  assert.match(desc, /MOONSHINE BAR the door east/);
});

test("LK Metro's main alley reads the same from both ends", () => {
  const desc = _strip(ROOMS.lk_main.desc);
  assert.doesNotMatch(desc, /behind you|Ahead the/,
    "arriving from Buakhao put the corner ahead and Buakhao behind — the prose said the opposite");
});
