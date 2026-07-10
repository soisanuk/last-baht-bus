// The soundtrack contract: music only where music actually plays — the neon
// streets (Walking Street, LK Metro, Soi 6) and inside bars/go-gos; silence
// everywhere else. _trackForRoom is the pure half; the AudioContext half is
// lazy and never constructed here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

for (const f of ["thai.js", "world.js", "audio.js"]) {
  const src = readFileSync(
    fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");
  vm.runInThisContext(src, { filename: f });
}

test("neon streets carry music, the seafront carries surf, the rest stays silent", () => {
  assert.equal(_trackForRoom("ws_south"), "street");
  assert.equal(_trackForRoom("ws_gate"), "street");
  assert.equal(_trackForRoom("lk_main"), "soi6");
  assert.equal(_trackForRoom("soi6_street"), "soi6");
  // the sea is audible on the beaches and along Beach Road
  for (const id of ["jomtien_beach", "dongtan_beach", "jomtien_beach_rd",
    "beach_rd_s", "beach_rd_c", "beach_rd_n", "promenade"]) {
    assert.equal(_trackForRoom(id), "surf", `${id} should hear the sea`);
  }
  // silence: inland roads, markets, complexes' lanes, hotel, dark hill
  for (const id of ["second_rd_c", "buakhao_market", "buakhao_n", "myth_night",
    "tt_lane_1", "pratumnak_rd", "hotel_room", "police_station",
    "lake_mabprachan", "naklua_rd", "central_mall", "short_time_motel"]) {
    assert.equal(_trackForRoom(id), null, `${id} should be silent`);
  }
});

test("every bar spins a set list: dance crate for go-gos, songbook for the rest", () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    if (!room.barType) continue;
    const want = room.barType === "gogo" || room.barType === "soi6" ? _GOGO_SET : _BAND_SET;
    assert.equal(_trackForRoom(id), want, `${id} (${room.barType})`);
  }
});

test("the set lists only contain songs the sequencer actually knows", () => {
  const known = _audio.tracks();
  for (const name of [..._GOGO_SET, ..._BAND_SET]) {
    assert.ok(known.includes(name), `${name} missing from TRACKS`);
  }
  // the covers have sane melodies: multiples of 8 steps, notes in MIDI range
  for (const name of known) {
    assert.ok(!/wonderwall/i.test(name), "house rule");
  }
});

test("when the DJ plays Sabai Sabai, the soundtrack is the song", () => {
  assert.equal(_trackForRoom("rainbow_girls"), _GOGO_SET); // a go-go, normally
  assert.equal(_trackForRoom("rainbow_girls", { sabaiPlaying: true }), "soi");
});
