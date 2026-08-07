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
  assert.ok(e.renders.length < e.portraits.length, "and some of it is still pixel art");
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

test("display names are marked English, so localisation can be added without a version bump", () => {
  const e = buildExport();
  assert.equal(e.lang, "en");
  // the shape allows a `de` sibling per entry later; saying so here is what stops
  // someone discovering it the hard way after Second Road has shipped
  assert.equal(e.venues.stinky_bar.de, undefined);
});
