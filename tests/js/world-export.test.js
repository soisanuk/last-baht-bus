// docs/world-export.json — the single sanctioned coupling to Second Road.
//
// Same doctrine as the scene manifest: a GENERATED file is the interface, and
// world.js is never read directly by anything outside this repo. world.js is
// ~640KB, almost all of it dialogue and prose that a macro game can't use;
// vendoring it would import a game engine's worth of strings to obtain a list of
// venues and their coordinates.
//
// These tests do two jobs. They keep the export in sync (a world.js change that
// should have moved it fails here rather than drifting silently), and they
// enforce the boundary — night content must not leak across.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildExport, renderExport, EXPORT_VERSION } from "../../tools/gen-world-export.mjs";

const committed = readFileSync(
  fileURLToPath(new URL("../../docs/world-export.json", import.meta.url)), "utf8");

test("the committed export is in sync with world.js", () => {
  assert.equal(renderExport(), committed,
    "docs/world-export.json is stale — run: node tools/gen-world-export.mjs");
});

test("it carries what a macro game actually needs", () => {
  const e = buildExport();
  assert.equal(e.v, EXPORT_VERSION, "versioned, so the coupling can break loudly");
  assert.ok(e.counts.venues > 150, "every room, because every room is a place on a map");
  assert.equal(e.counts.geolocated, e.counts.venues,
    "…and every one of them geolocated — ROOM_GEO is the whole point");
  assert.ok(e.counts.people > 200);
  assert.equal(e.canonBars.length, 20);

  const stinky = e.venues.stinky_bar;
  assert.equal(stinky.bar, "The Stinky Pinky", "the trading name, not the room id");
  assert.equal(stinky.barType, "beer");
  assert.equal(stinky.geo.length, 2);
  assert.ok(stinky.geo[0] > 12.8 && stinky.geo[0] < 13.0, "real latitude");

  const bert = e.people.bert;
  assert.equal(bert.name, "Bert");
  assert.equal(bert.room, "stinky_bar");
  assert.equal(bert.manager, true, "roles a macro game hires and fires on");
});

test("the export says which art track each portrait is on", () => {
  // A consumer can't tell a 96×96 pixel bust from an 832×1088 render without
  // fetching and measuring, and they need different crops — Second Road got this
  // wrong first and a character came out unrecognisable. So the boundary reports
  // it. See the art contract in Second Road's HANDOFF §2b.
  const e = buildExport();
  assert.ok(Array.isArray(e.renders));
  assert.ok(e.renders.length > 0, "some of the cast has been through the art pipeline");
  // This used to assert renders < portraits — "and some of it is still pixel
  // art" — which was a fact about the migration being half done, not a property
  // of the export, and it failed the moment the last placeholder was replaced.
  // What the boundary owes a consumer is that the two lists AGREE: every render
  // is a portrait, and the count never exceeds the cast.
  assert.ok(e.renders.length <= e.portraits.length,
    "a render that isn't in the portrait index means the two lists have drifted");
  for (const id of e.renders) {
    assert.ok(e.portraits.includes(id), `${id} is a render but not a portrait`);
  }
  assert.equal(e.renders.includes("bert"), true, "Bert has been generated");
});

test("a venue's trading name is separate from its room label", () => {
  // LBB names the dead pub "The Shamrock (closed)" because here it is closed.
  // A consumer that can REOPEN it must not inherit our state baked into a
  // string — Second Road printed "the float at The Shamrock (closed)" before
  // this existed, which is state leaking across a boundary as prose.
  const e = buildExport();
  const s = e.venues.shamrock;
  assert.equal(s.bar, "The Shamrock", "the trading name is clean");
  assert.equal(s.closed, true, "…and the state is data");
  assert.match(s.name, /closed/, "while OUR label still says what it is here");
});

test("the export says which portraits have a thumbnail", () => {
  // Consumers use this to decide whether to TRY the thumb chain. Guessing costs
  // a 404 per portrait without one, and 205 of 277 are pixel art that will never
  // have one — 205 wasted requests on a roster view.
  const e = buildExport();
  assert.ok(Array.isArray(e.thumbs));
  for (const id of e.thumbs) {
    assert.ok(e.renders.includes(id), `${id} has a thumb but isn't a render`);
  }
  const noThumb = e.renders.filter(id => !e.thumbs.includes(id));
  assert.deepEqual(noThumb, [], "every render should have one — run portrait_gen's thumb pass");
});

test("the baked thumb list matches the export", () => {
  // term.js has no module loader and can't fetch (it must work from file://), so
  // the thumb set is baked as a classic-script global. Two sources of truth is
  // one too many, so this pins them together.
  const js = readFileSync(
    fileURLToPath(new URL("../../web/js/portrait-thumbs.js", import.meta.url)), "utf8");
  const ids = JSON.parse(js.match(/new Set\((\[[^)]*\])\)/)[1]);
  assert.deepEqual(ids.sort(), [...buildExport().thumbs].sort(),
    "web/js/portrait-thumbs.js is stale — run: node tools/gen-world-export.mjs");
});

test("night content does not cross — the boundary is the point", () => {
  const raw = JSON.stringify(buildExport());
  // dialogue is ~90% of world.js and none of it is usable at macro scale
  for (const key of ["dialogue", "topic", "notFlags", "revisit", "asks", "gives"]) {
    assert.equal(raw.includes(`"${key}"`), false, `${key} leaked into the export`);
  }
  const e = buildExport();
  for (const p of Object.values(e.people)) assert.equal(p.dialogue, undefined);
  // EXITS especially: a walking graph for a game about walking. The macro game
  // has coordinates, which is strictly better for a map and implies nobody walks.
  for (const v of Object.values(e.venues)) {
    assert.equal(v.exits, undefined, "exits are LBB's, not Second Road's");
    assert.equal(v.desc, undefined, "room prose stays where the prose is read");
  }
});

test("the portrait index covers the cast", () => {
  const e = buildExport();
  assert.ok(e.portraits.length > 250);
  // a face missing here becomes a broken image in Second Road months later, so
  // it fails at the boundary instead
  const noFace = Object.keys(e.people).filter(id => !e.portraits.includes(id));
  assert.deepEqual(noFace, [], "every person in the export has a portrait");
  const noPatronFace = Object.keys(e.patrons).filter(id => !e.portraits.includes(id));
  assert.deepEqual(noPatronFace, [], "…and every patron");
});

test("regeneration is stable — a reorder in world.js is not a content change", () => {
  assert.equal(renderExport(), renderExport(), "keys sorted, no clock in the file");
  assert.equal(committed.includes("generated"), false,
    "a timestamp would make the sync test fail on every run");
});

test("the export says which venues are actually verified", () => {
  // LBB ships one playable mode because the geography outside the reworked
  // districts is still suspect. Second Road has been told to honour the same
  // restriction, and it can only do that if the boundary crosses as data.
  const e = buildExport();
  assert.ok(Array.isArray(e.playable.soi6), "keyed by mode name, so unlocking a district adds a key");
  assert.equal(e.playable.soi6.length, SOI6_ROOMS.size, "…and it IS the engine's fence, not a copy of it");
  assert.deepEqual(e.playable.soi6, [...SOI6_ROOMS].sort());
  for (const id of e.playable.soi6) {
    assert.ok(e.venues[id], `${id} is fenced-in but not a venue`);
  }
});

test("the pocket cannot be re-derived by filtering on region", () => {
  // The trap this exists to stop: four of the nineteen are region "Beach Road",
  // and one of them is the bar the entire ownership chain is about. A consumer
  // that filters `region === "Soi 6"` loses it and looks correct doing so.
  const e = buildExport();
  const byRegion = e.playable.soi6.filter(id => e.venues[id].region === "Soi 6");
  assert.notEqual(byRegion.length, e.playable.soi6.length,
    "if this ever passes, the trap is gone and the warning above can go too");
  assert.equal(e.venues.stinky_bar.region, "Beach Road");
  assert.ok(e.playable.soi6.includes("stinky_bar"), "…and the Stinky is in the pocket");
});

test("display names are marked English, so localisation can be added without a version bump", () => {
  const e = buildExport();
  assert.equal(e.lang, "en");
  // the shape allows a `de` sibling per entry later; saying so here is what stops
  // someone discovering it the hard way after Second Road has shipped
  assert.equal(e.venues.stinky_bar.de, undefined);
});

// ── the export explains itself, because its readers cannot read us ──────────
// The Second Road agent's contract forbids reading LBB source; they consume
// this file and nothing else. So when I handed them a caveat and pointed at the
// reasoning in web/js/world.js, the only people able to act on it were the ones
// not allowed to see it. Anything that BINDS a consumer has to travel with the
// data.
//
// This asserts the notes block exists and stays honest — specifically that the
// two claims a consumer would act on are still true of the payload, rather than
// prose that drifted away from it.
test("the export carries its own caveats, and they match the data", () => {
  const e = buildExport();
  assert.ok(e.notes && typeof e.notes === "object", "there is a notes block");
  for (const k of ["contract", "geo", "exits", "pronoun"])
    assert.ok(typeof e.notes[k] === "string" && e.notes[k].length > 40,
      `notes.${k} says something useful`);

  // the geo note promises an `estimated` flag — it has to actually be there,
  // and only on the coarse pins
  const est = Object.entries(e.venues).filter(([, v]) => v.estimated);
  assert.ok(est.length > 0, "the estimated flag is in use, as the note claims");
  for (const [id, v] of est) {
    const dp = Math.max(String(v.geo[0]).split(".")[1]?.length || 0,
                        String(v.geo[1]).split(".")[1]?.length || 0);
    assert.ok(dp < 5, `${id}: flagged estimated, so it should be a coarse pin`);
  }
  for (const [id, v] of Object.entries(e.venues)) {
    if (v.estimated || !v.geo) continue;
    const dp = Math.max(String(v.geo[0]).split(".")[1]?.length || 0,
                        String(v.geo[1]).split(".")[1]?.length || 0);
    assert.ok(dp >= 5, `${id}: coarse pin but not flagged — the note would be lying`);
  }

  // the exits note promises they are absent. If a future edit exports them,
  // the note becomes false and this fails rather than the consumer finding out.
  for (const v of Object.values(e.venues))
    assert.equal(v.exits, undefined, "exits stay out, as the note says");
});
