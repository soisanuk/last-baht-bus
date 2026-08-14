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
  assert.equal(_trackForRoom("ws_north"), "street");
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

test("every bar spins the right set: dance crate, songbook, velvet couch, or Thai rock", () => {
  for (const [id, room] of Object.entries(ROOMS)) {
    if (!room.barType) continue;
    const want =
      room.barType === "gents" ? _GENTS_SET :
      room.region === "Darkside" ? _DARK_SET :
      room.barType === "gogo" || room.barType === "soi6" ? _GOGO_SET : _BAND_SET;
    assert.equal(_trackForRoom(id), want, `${id} (${room.barType}, ${room.region})`);
  }
  // the routing is only interesting if each branch actually fires
  const hit = new Set(Object.entries(ROOMS).filter(([, r]) => r.barType)
    .map(([id]) => _trackForRoom(id)));
  for (const set of [_GOGO_SET, _BAND_SET, _GENTS_SET, _DARK_SET]) {
    assert.ok(hit.has(set), "a set list no venue plays is dead code");
  }
});

test("the set lists only contain songs the sequencer actually knows", () => {
  const known = _audio.tracks();
  for (const name of [..._GOGO_SET, ..._BAND_SET, ..._GENTS_SET, ..._DARK_SET]) {
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

test("the originals answer the four-chords review: the songbook has its major keys", () => {
  // The covers library is minor-key throughout — the review found no anthem,
  // no slow dance, no Thai rock beyond Sabai Sabai. These four are the fix;
  // losing one from its set would quietly reopen the gap.
  assert.ok(_BAND_SET.includes("lastcall"), "the band set keeps its anthem");
  assert.ok(_GENTS_SET.includes("slowdance"), "the gents keep their slow dance");
  assert.equal(_DARK_SET[0], "chiwit", "Darkside opens Thai — the order is the point");
  // and the title theme is the game's own song, at a title-screen amble
  const t = _audio.tempo("bus");
  assert.ok(t > 80 && t < 100, `title theme ambles, got ${t.toFixed(0)}`);
});

test("when the DJ plays Sabai Sabai, the soundtrack is the song", () => {
  assert.equal(_trackForRoom("rainbow_girls"), _GOGO_SET); // a go-go, normally
  assert.equal(_trackForRoom("rainbow_girls", { sabaiPlaying: true }), "soi");
});

// The dog's voice. Synthesized like the surf — filtered noise plus oscillators
// through the SFX bus, no samples — so it can be asserted structurally here
// even though the AudioContext never gets constructed in this suite.
test("growl and snarl exist as one-shot SFX and are built, not sampled", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/audio.js", import.meta.url)), "utf8");
  assert.match(src, /name === "growl"/, "sfx() dispatches a growl");
  assert.match(src, /name === "snarl"/, "sfx() dispatches a snarl");
  assert.match(src, /function _growl\(/);
  assert.match(src, /function _snarl\(/);
  // a growl is a BUZZ, not a low tone: amplitude modulation is the whole trick
  const growl = src.slice(src.indexOf("function _growl("), src.indexOf("function _snarl("));
  assert.match(growl, /createOscillator/, "has a voice");
  assert.match(growl, /am\.gain/, "amplitude-modulated — a plain low tone is a fridge");
  assert.match(growl, /sawtooth/, "harmonics, not a sine");
  assert.match(growl, /_sfxBus/, "goes to the SFX bus, so it mutes with the rest");
  assert.doesNotMatch(src, /\.mp3|\.wav|\.ogg/, "no samples anywhere in the audio layer");
});
