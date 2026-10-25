// STATE_SCHEMA (engine-core) declares how long every field of G lives — the architecture review of 2026-10-25, finding 3.
// The code review's two biggest classes were lifetime bugs: a nightly book never reset (tipBond; salengBar made three carts
// a night three a trip) and a day stamp never aged across a trip. Every G field and G.soc key the source names must be
// declared once, so a new field arrives with its lifetime decided rather than discovered by a persona.
// Fix a failure by adding the name to the right list in STATE_SCHEMA.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const files = ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"];
const srcs = {};
for (const f of files) { srcs[f] = readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"); vm.runInThisContext(srcs[f], { filename: f + ".js" }); }
engineInit(() => {});
const all = Object.values(srcs).join("\n");

test("every G field the source names has exactly one lifetime", () => {
  const top = new Set([...all.matchAll(/\bG\.([a-zA-Z_$][\w$]*)/g)].map(m => m[1])); top.delete("soc");
  newGame(); for (const k of Object.keys(G)) if (k !== "soc") top.add(k);
  const lists = ["night", "trip", "life"].map(l => new Set(STATE_SCHEMA[l]));
  const missing = [...top].filter(k => !lists.some(s => s.has(k)));
  assert.deepEqual(missing, [], "add these to STATE_SCHEMA (night / trip / life): " + missing.join(" "));
  const twice = [...top].filter(k => lists.filter(s => s.has(k)).length > 1);
  assert.deepEqual(twice, [], "in two lifetimes: " + twice.join(" "));
});

test("every G.soc key is nightly or per trip, never both", () => {
  const soc = new Set([...all.matchAll(/G\.soc\.([a-zA-Z_$][\w$]*)/g)].map(m => m[1]));
  const n = new Set(STATE_SCHEMA.socNight), t = new Set(STATE_SCHEMA.socTrip);
  const missing = [...soc].filter(k => !n.has(k) && !t.has(k));
  assert.deepEqual(missing, [], "add these to STATE_SCHEMA.socNight or socTrip: " + missing.join(" "));
  assert.deepEqual([...soc].filter(k => n.has(k) && t.has(k)), []);
});

test("every once-a-day stamp (G.<x>Day) is aged across a trip", () => {
  const day = new Set(STATE_SCHEMA.day);
  const stamps = [...new Set([...all.matchAll(/\bG\.([a-zA-Z_]*[a-z]Day)\b/g)].map(m => m[1]))];
  assert.deepEqual(stamps.filter(k => !day.has(k)), [], "add these to STATE_SCHEMA.day");
  newGame(); G.stage = "vacation"; _setFlag("act1Done"); G.day = 6; G.bookingDay = 6; G.flowerDay = 5;
  _newVacation(); assert.ok(G.bookingDay < 1 && G.flowerDay < 1);
});

test("a nightly key nobody reset by hand is reset at dawn by its type (salengBar, steered)", () => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); G.stage = "vacation"; G.room = "hotel_room";
  G.soc.salengBar = { a: 1, b: 1, c: 1 }; G.soc.steered = { x: [1, 2] };
  _endNight("sleep");
  assert.deepEqual(G.soc.salengBar, {}, "three carts a night, not three a trip"); assert.deepEqual(G.soc.steered, {});
});
