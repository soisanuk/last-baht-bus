// THE REACHABILITY HARNESS — class C of docs/persona-findings-ledger-analysis.md
// (21% severe, 28% instrumented before this file; the coverage map's second-darkest
// severe column, 2026-09-27). Personas found it by hand three times: a critical path
// a broke, dark or first-night player could not walk. This walks it for them:
//   1. the world is one connected component over exits + venue doors, except the
//      rooms that are DOCUMENTED as reached another way (an invitation, a seeded arc);
//   2. every quest's `at` is on foot from the beach, every crash spot and every hotel;
//   3. from every crash spot, broke and on a low battery, TRAVEL HOME walks home on the
//      REAL path (doCommand, the light on, the dice stubbed so nothing interrupts);
//   4. every venue door a street lists ENTERs from that street when it is open, and
//      OUT returns to a street.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text, cls) => out.push({ text, cls }));
const text = () => out.map(o => o.text).join("\n");
function base() {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  _setFlag("act1Done"); G.stage = "vacation"; G.money = 9000;
  for (const e of Object.keys(ENCOUNTERS)) G.encDone[e] = true;
  G.peddlerNight = 2; G.nightTurn = 30;
}
const nbrs = r => Object.values(ROOMS[r].exits || {}).concat(ROOMS[r].venues || []).filter(x => ROOMS[x]);
function component(from) { const seen = new Set([from]), q = [from]; while (q.length) { const c = q.shift(); for (const n of nbrs(c)) if (!seen.has(n)) { seen.add(n); q.push(n); } } return seen; }
// rooms reached by something other than walking, each with the reason
const NOT_ON_FOOT = {
  orchid_room: "invite-only: somebody takes you in (invite: true)",
  nottys_place: "you are SENT (Candy's rose node); off the door list until then",
};

test("the world is one walk: every room reaches every other over exits and venue doors, or says why not", () => {
  const all = Object.keys(ROOMS), main = component("jomtien_beach");
  const cut = all.filter(r => !main.has(r) && !NOT_ON_FOOT[r] && !ROOMS[r].invite && !ROOMS[r].offmap);
  assert.deepEqual(cut, [], "rooms not reachable on foot from the beach and not documented as reached another way");
  // …and the walk is two-way: from every room you can get back to the beach
  const stranded = all.filter(r => main.has(r) && !component(r).has("jomtien_beach"));
  assert.deepEqual(stranded, [], "rooms you can walk into and never walk out of");
});

test("every quest's `at` is on foot from the beach, every crash spot and every hotel", () => {
  const starts = ["jomtien_beach", ...Object.values(_CRASH_SPOTS).map(c => c.room), ...Object.values(_HOTELS).map(h => h.room)].filter(r => ROOMS[r]);
  const bad = [];
  for (const [q, spec] of Object.entries(QUESTS)) {
    if (!spec.at) continue;
    const dests = ROOMS[spec.at] ? [spec.at] : NPCS[spec.at] ? (NPCS[spec.at].bars || [NPCS[spec.at].room]).filter(Boolean) : [];
    for (const d of dests) for (const s of starts) if (!ROOMS[d].invite && !ROOMS[d].offmap && _path(s, d) === null) bad.push(`${q}: ${s} → ${d}`);
  }
  assert.deepEqual(bad, [], "a quest points at a place a player cannot walk to from where the game leaves him");
});

test("from every crash spot, broke and on a low battery, TRAVEL HOME walks home on the real path", () => {
  const saved = _rand;
  try {
    _rand = () => 0.99;
    for (const [k, spot] of Object.entries(_CRASH_SPOTS)) {
      if (k === "soi6") continue;
      for (const hotel of Object.keys(_HOTELS)) {
        base(); G.hotel = hotel; G.room = spot.room; G.money = 0; G.battery = _CRASH_BATTERY; G.lightOn = true; G.hunger = 20; G.thirst = 20;
        out = []; doCommand("travel home");
        assert.equal(G.room, _HOTELS[hotel].room, `crash spot ${k} → ${hotel}: TRAVEL HOME ended at ${G.room}\n${text().slice(-400)}`);
      }
    }
  } finally { _rand = saved; }
});

test("every venue door a street lists ENTERs from that street when open, and OUT returns to a street", () => {
  const saved = _rand; const bad = [];
  try {
    _rand = () => 0.99;
    for (const [street, r] of Object.entries(ROOMS)) {
      for (const v of (r.venues || [])) {
        if (!ROOMS[v] || ROOMS[v].invite || v === "nottys_place") continue;
        base(); G.room = street; G.nightTurn = 30; G.visited[street] = true;
        const nm = (ROOMS[v].bar || ROOMS[v].name).replace(/\s*\(.*\)$/, "");
        if (typeof _closedNow === "function" && _closedNow(v)) continue;
        out = []; doCommand("enter " + nm.toLowerCase());
        if (G.room !== v) { bad.push(`${street}: ENTER ${nm} → ${G.room} :: ${text().split("\n")[0].slice(0, 90)}`); continue; }
        out = []; doCommand("out");
        if (G.room === v) bad.push(`${v}: OUT stayed inside :: ${text().split("\n")[0].slice(0, 90)}`);
      }
    }
  } finally { _rand = saved; }
  assert.deepEqual(bad, [], "a listed door that does not open, or a room with no way out");
});
