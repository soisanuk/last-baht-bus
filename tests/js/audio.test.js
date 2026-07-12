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

test("the doubled-grid covers are slowed to sit in the same tempo band as the rest", () => {
  // takeonme/whatislove/axelf/countdown are authored at 2x-4x written bpm so an
  // 8th-note step reads as a 16th; without an extra `slow` they'd race past the
  // ballads even after the global 0.75. Assert every track's *effective* tempo
  // lands in one band, so no track reads as "this one wasn't slowed".
  const eff = _audio.tracks().map(n => _audio.tempo(n));
  for (const t of eff) assert.ok(t > 0, "every track has an effective tempo");
  const hi = Math.max(...eff), lo = Math.min(...eff);
  assert.ok(hi / lo < 2.4, `perceived-tempo spread too wide: ${lo.toFixed(0)}-${hi.toFixed(0)}`);
  // the four fast covers specifically must carry the extra slow-down
  for (const n of ["takeonme", "whatislove", "axelf", "countdown"]) {
    assert.ok(_audio.tempo(n) < 190, `${n} still racing at ${_audio.tempo(n).toFixed(0)}`);
  }
});

test("when the DJ plays Sabai Sabai, the soundtrack is the song", () => {
  assert.equal(_trackForRoom("rainbow_girls"), _GOGO_SET); // a go-go, normally
  assert.equal(_trackForRoom("rainbow_girls", { sabaiPlaying: true }), "soi");
});
