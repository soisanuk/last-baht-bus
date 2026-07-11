// Chiptune background music, synthesised live with the Web Audio API — no
// audio assets, works offline and from file://. Step sequencer and tracks
// reused from the Soi Sanuk trainer (audio.js).
//
// The AudioContext is created lazily on the first music call, which always
// happens right after a typed command (a user gesture), satisfying autoplay
// policies. Volume is kept low so it never fights the TTS voice.

const _audio = (() => {
  let _actx = null, _musBus = null, _noiseBuf = null;
  let _muted = false;
  try { _muted = localStorage.getItem("lbb_muted") === "1"; } catch (e) {}

  const MUS_VOL = 0.14;

  function _ctx() {
    if (_actx) {
      if (_actx.state === "suspended") _actx.resume();
      return _actx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _actx = new AC();
    _musBus = _actx.createGain();
    _musBus.connect(_actx.destination);
    _applyMute();
    return _actx;
  }

  function _applyMute() {
    if (!_actx) return;
    _musBus.gain.value = _muted ? 0 : MUS_VOL;
  }

  function _note(freq, t0, dur, type, vol) {
    const o = _actx.createOscillator();
    const g = _actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(_musBus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function _ensureNoiseBuf() {
    if (_noiseBuf) return;
    _noiseBuf = _actx.createBuffer(1, _actx.sampleRate * 0.2, _actx.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function _noise(t0, dur, vol, cutoff) {
    _ensureNoiseBuf();
    const s = _actx.createBufferSource();
    s.buffer = _noiseBuf;
    const f = _actx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = cutoff;
    const g = _actx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(_musBus);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  const _f = midi => 440 * Math.pow(2, (midi - 69) / 12);

  // Tracks from the Soi Sanuk trainer. melody[] = note-per-8th-step (null =
  // rest); prog[] = chord-arpeggio fallback.
  const TRACKS = {
    // Walking Street — driving synthwave, A minor (Am F G Em)
    street: {
      bpm: 126, lead: "square", leadVol: 0.14, hat: true, bassEvery: 1,
      bass: [33, 29, 31, 28],
      prog: [[69, 72, 76], [65, 69, 72], [67, 71, 74], [64, 67, 71]],
    },
    // Sabai Sabai (สบายสบาย, Bird Thongchai) — verse transcribed from MIDI:
    // D major, 125 bpm, 8 bars over D D D Bm Bm G A G. Madam Oy's song.
    soi: {
      bpm: 125, lead: "triangle", leadVol: 0.17, hat: false, bassEvery: 2,
      bass: [38, 38, 38, 35, 35, 31, 33, 31],
      melody: [
        null,null,null,66, 69,null,66,69,
        null,null,null,null, null,null,null,null,
        null,null,null,null, 66,69,null,69,
        71,null,66,66, null,null,null,null,
        null,null,null,null, null,null,null,69,
        69,null,67,null, 67,null,69,null,
        66,64,null,64, null,null,null,69,
        67,null,69,null, 67,null,66,64,
      ],
    },
    // Soi 6 / LK Metro — slinky D-minor groove (Dm Bb Gm A7)
    soi6: {
      bpm: 104, lead: "square", leadVol: 0.12, hat: true, bassEvery: 2,
      bass: [38, 34, 31, 33],
      prog: [[74, 77, 81], [70, 74, 77], [67, 70, 74], [69, 73, 76]],
    },
    // Pattaya Pattaya (พัทยา พัทยา) — C major folk-rock, the beach-road roll
    bus: {
      bpm: 114, lead: "square", leadVol: 0.14, hat: true, bassEvery: 2,
      bass: [36, 29, 33, 31],
      melody: [
        67,67,69,67, 64,null,62,null,
        60,null,62,64, 65,null,67,null,
        69,null,67,65, 64,null,62,null,
        64,62,60,null, 62,64,67,null,
      ],
    },

    // ── The covers library: what the house bands and go-go DJs actually play.
    // Chiptune approximations of the 80s/90s songbook — melodies transcribed
    // by ear onto the 8th-note grid, close enough to grin at.

    // Take On Me (a-ha, 1985) — the synth riff; bpm doubled so 8th steps
    // read as the original's 16ths. F#m D A E under it.
    takeonme: {
      bpm: 336, lead: "square", leadVol: 0.13, hat: true, bassEvery: 4,
      bass: [30, 26, 33, 28],
      melody: [
        78,78,74,71, null,71,null,76, null,76,null,76, 80,80,81,83,
        81,81,81,76, null,74,null,78, null,78,null,78, 76,76,78,76,
      ],
    },
    // Careless Whisper (George Michael, 1984) — the sax line, three falling
    // phrases and the climb back up. D minor; sawtooth does its best.
    careless: {
      bpm: 150, lead: "sawtooth", leadVol: 0.11, hat: false, bassEvery: 2,
      bass: [38, 31, 34, 33],
      melody: [
        81,79,77,72, 77,null,null,null, 77,74,72,69, 74,null,null,null,
        74,72,69,65, 69,null,null,null, 62,64,65,67, 69,71,72,74,
      ],
    },
    // What Is Love (Haddaway, 1993) — the synth stab hook, G minor,
    // eurodance tempo (8ths as 16ths again).
    whatislove: {
      bpm: 248, lead: "square", leadVol: 0.12, hat: true, bassEvery: 2,
      bass: [31, 27, 34, 29],
      melody: [
        74,74,null,74, null,72,74,null, 77,77,null,77, null,74,77,null,
        74,74,null,74, null,72,74,null, 70,null,72,null, 74,null,null,null,
      ],
    },
    // Billie Jean (Michael Jackson, 1983) — the bassline IS the song.
    // Triangle lead walking the F#m riff; the kick keeps its own counsel.
    billiejean: {
      bpm: 117, lead: "triangle", leadVol: 0.20, hat: true, bassEvery: 4,
      bass: [30],
      melody: [
        42,49,52,54, 52,49,47,49, 42,49,52,54, 52,49,47,49,
        42,49,52,54, 52,49,47,49, 54,52,49,52, 49,47,44,47,
      ],
    },
    // Zombie (The Cranberries, 1994) — the chorus, E minor, the one the
    // Filipina vocalist nails once a week. In your head, in your head.
    zombie: {
      bpm: 168, lead: "sawtooth", leadVol: 0.12, hat: true, bassEvery: 2,
      bass: [28, 24, 31, 26],
      melody: [
        76,74,71,null, 76,74,71,null, 79,null,78,76, 74,null,null,null,
        76,74,71,null, 76,74,71,null, 74,null,76,null, 74,71,null,null,
      ],
    },
    // Livin' on a Prayer (Bon Jovi, 1986) — chorus contour, E minor.
    // Whoa, we're half way there.
    prayer: {
      bpm: 123, lead: "square", leadVol: 0.14, hat: true, bassEvery: 2,
      bass: [28, 24, 26, 28],
      melody: [
        71,null,76,76, 74,76,null,null, 79,null,78,76, 74,null,76,null,
        71,null,76,76, 74,76,null,null, 81,null,79,76, 79,null,null,null,
      ],
    },
    // Axel F (Harold Faltermeyer, 1984) — the Beverly Hills Cop theme,
    // F minor. Born a synth instrumental; barely needs translating.
    axelf: {
      bpm: 236, lead: "square", leadVol: 0.14, hat: true, bassEvery: 4,
      bass: [29, 32, 34, 29],
      melody: [
        65,null,null,68, 68,null,65,null, 65,70,null,65, null,63,null,null,
        65,null,null,72, 72,null,65,null, 65,73,null,72, null,68,null,null,
        65,null,72,null, 77,null,65,null, 63,null,63,60, 67,null,65,null,
        null,null,null,null, null,null,null,null, null,null,null,null, null,null,null,null,
      ],
    },
    // The Final Countdown (Europe, 1986) — the hook, A minor, pickup
    // 16ths on a doubled grid. Every Filipino band owns this one.
    countdown: {
      bpm: 236, lead: "square", leadVol: 0.14, hat: true, bassEvery: 4,
      bass: [33, 29, 31, 28],
      melody: [
        null,null,null,null, 76,74,76,null, 69,null,null,null, null,null,null,null,
        null,null,null,null, 77,76,77,null, 76,null,74,null, null,null,null,null,
      ],
    },
  };

  let _track = null, _trackName = null, _step = 0, _nextT = 0, _timer = null;
  let _playlist = null, _plKey = null, _plIdx = 0; // the bar's record crate

  function _trackLen(t) { return t.melody ? t.melody.length : t.bass.length * 8; }

  function _hashStr(s) {
    let h = 7;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
    return h;
  }

  function _schedule() {
    while (_nextT < _actx.currentTime + 0.18) {
      // Every track plays at 75% of its written bpm — full speed felt rushed.
      const t = _track, spb = 30 / (t.bpm * 0.75);
      const bar = Math.floor(_step / 8) % t.bass.length;
      const pos = _step % 8;
      const root = t.bass[bar];
      if (pos % t.bassEvery === 0) {
        _note(_f(pos % 4 === 2 ? root + 12 : root), _nextT, spb * 0.9, "triangle", 0.45);
      }
      if (t.melody) {
        const mn = t.melody[_step % t.melody.length];
        if (mn !== null) _note(_f(mn), _nextT, spb * 0.85, t.lead, t.leadVol);
      } else {
        const chord = t.prog[bar];
        _note(_f(chord[_step % chord.length]), _nextT, spb * 0.8, t.lead, t.leadVol);
      }
      if (t.hat && pos % 2 === 1) _noise(_nextT, 0.03, 0.10, 7000);
      _step++;
      // playlist mode: after two full passes the DJ reaches for the next one
      if (_playlist && _step >= 2 * _trackLen(t)) {
        _plIdx = (_plIdx + 1) % _playlist.length;
        _track = TRACKS[_playlist[_plIdx]];
        _trackName = _playlist[_plIdx];
        _step = 0;
      }
      _nextT += spb;
    }
  }

  function _musicStop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    _track = _trackName = null;
    _playlist = _plKey = null;
  }

  // Ambience: a looping noise bed with slow, irregular swells — the sea
  // arriving and withdrawing. The filter opens at each crest (the hiss of
  // the break) and settles back to a low rumble between waves.
  let _amb = null, _ambTimer = null, _ambName = null;

  function _ambStop() {
    if (_ambTimer) { clearTimeout(_ambTimer); _ambTimer = null; }
    if (_amb) { try { _amb.src.stop(); } catch (e) {} _amb = null; }
    _ambName = null;
  }

  function _ambience(name) {
    if (!_ctx()) return;
    if (_ambName === name && _amb) return;
    _musicStop();
    _ambStop();
    _ambName = name;
    _ensureNoiseBuf();
    const src = _actx.createBufferSource();
    src.buffer = _noiseBuf;
    src.loop = true;
    const f = _actx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;
    const g = _actx.createGain();
    g.gain.value = 0.08;
    src.connect(f);
    f.connect(g);
    g.connect(_musBus);
    src.start();
    _amb = { src, f, g };
    const swell = () => {
      if (!_amb) return;
      const t = _actx.currentTime;
      const peak = 0.35 + Math.random() * 0.25;
      const up = 1.2 + Math.random() * 1.2;
      const down = 2.2 + Math.random() * 1.6;
      _amb.g.gain.cancelScheduledValues(t);
      _amb.g.gain.setValueAtTime(Math.max(_amb.g.gain.value, 0.08), t);
      _amb.g.gain.linearRampToValueAtTime(peak, t + up);
      _amb.g.gain.linearRampToValueAtTime(0.08, t + up + down);
      _amb.f.frequency.cancelScheduledValues(t);
      _amb.f.frequency.setValueAtTime(400, t);
      _amb.f.frequency.linearRampToValueAtTime(900 + Math.random() * 400, t + up);
      _amb.f.frequency.linearRampToValueAtTime(400, t + up + down);
      _ambTimer = setTimeout(swell, (up + down) * 1000 + 800 + Math.random() * 2500);
    };
    swell();
  }

  return {
    music(name) {
      if (!TRACKS[name] || !_ctx()) return;
      if (_trackName === name && _timer && !_playlist) return;
      _ambStop();
      _musicStop();
      _track = TRACKS[name];
      _trackName = name;
      _step = 0;
      _nextT = _actx.currentTime + 0.05;
      _timer = setInterval(_schedule, 60);
    },
    // A set list rather than a loop: each bar starts at its own point in the
    // rotation (hash of the key, so it's stable), two passes per song, then
    // on to the next. Re-calling with the same key leaves the set playing.
    playlist(names, key) {
      if (!names.length || !_ctx()) return;
      if (_plKey === key && _timer) return;
      _ambStop();
      _musicStop();
      _playlist = names;
      _plKey = key;
      _plIdx = _hashStr(key) % names.length;
      _track = TRACKS[names[_plIdx]];
      _trackName = names[_plIdx];
      _step = 0;
      _nextT = _actx.currentTime + 0.05;
      _timer = setInterval(_schedule, 60);
    },
    tracks() { return Object.keys(TRACKS); },
    ambience: _ambience,
    stop() { _musicStop(); _ambStop(); },
    muted() { return _muted; },
    toggleMute() {
      _muted = !_muted;
      try { localStorage.setItem("lbb_muted", _muted ? "1" : "0"); } catch (e) {}
      _applyMute();
      return _muted;
    },
  };
})();

// Music plays only where music actually plays: the neon streets (Walking
// Street, LK Metro, Soi 6) and inside any bar or go-go. Everywhere else —
// beaches, roads, markets, the hotel, the dark hill — the town is ambient
// noise the player imagines, not a soundtrack. Special case: when the DJ
// actually plays Sabai Sabai in Rainbow Girls, the soundtrack becomes the
// song itself. ("bus" survives as the title/continue-prompt theme.)
const _STREET_TRACKS = {
  "Walking Street": "street",
  "LK Metro": "soi6",
  "Soi 6": "soi6",
};

// The set lists. Go-gos and Soi 6 bars run the synth/dance crate; beer bars
// and the pub get the house band's songbook (Sabai Sabai stays in rotation —
// the local hit always comes back around). No Wonderwall. House rule.
const _GOGO_SET = ["soi6", "careless", "whatislove", "billiejean", "takeonme", "axelf"];
const _BAND_SET = ["soi", "zombie", "prayer", "countdown", "takeonme"];

// Regions within earshot of the sea: streets here get the surf ambience
// instead of silence. (Naklua stays quiet — the hotel soi faces inland.)
// Interiors lose the sea to walls and air conditioning.
const _SURF_REGIONS = new Set(["Jomtien", "Beach Road"]);
const _SURF_INTERIORS = new Set(["central_mall", "police_station", "short_time_motel"]);

// Pure track choice — a track name, a set list array, "surf" for the sea,
// or null for silence. The testable half of the system.
function _trackForRoom(roomId, flags) {
  if (roomId === "rainbow_girls" && flags && flags.sabaiPlaying) return "soi";
  const room = ROOMS[roomId];
  if (!room) return null;
  if (room.barType) {
    return room.barType === "gogo" || room.barType === "soi6" ? _GOGO_SET : _BAND_SET;
  }
  if (_STREET_TRACKS[room.region]) return _STREET_TRACKS[room.region];
  if (_SURF_REGIONS.has(room.region) && !_SURF_INTERIORS.has(roomId)) return "surf";
  return null;
}

function _audioForRoom(roomId, flags) {
  const track = _trackForRoom(roomId, flags);
  if (Array.isArray(track)) _audio.playlist(track, roomId);
  else if (track === "surf") _audio.ambience("surf");
  else if (track) _audio.music(track);
  else _audio.stop();
}
