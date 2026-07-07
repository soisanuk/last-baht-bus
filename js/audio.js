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

  function _noise(t0, dur, vol, cutoff) {
    if (!_noiseBuf) {
      _noiseBuf = _actx.createBuffer(1, _actx.sampleRate * 0.2, _actx.sampleRate);
      const d = _noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
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
  };

  let _track = null, _trackName = null, _step = 0, _nextT = 0, _timer = null;

  function _schedule() {
    while (_nextT < _actx.currentTime + 0.18) {
      const t = _track, spb = 30 / t.bpm;
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
      _nextT += spb;
    }
  }

  function _musicStop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    _track = _trackName = null;
  }

  return {
    music(name) {
      if (!TRACKS[name] || !_ctx()) return;
      if (_trackName === name && _timer) return;
      _musicStop();
      _track = TRACKS[name];
      _trackName = name;
      _step = 0;
      _nextT = _actx.currentTime + 0.05;
      _timer = setInterval(_schedule, 60);
    },
    stop: _musicStop,
    muted() { return _muted; },
    toggleMute() {
      _muted = !_muted;
      try { localStorage.setItem("lbb_muted", _muted ? "1" : "0"); } catch (e) {}
      _applyMute();
      return _muted;
    },
  };
})();

// Region → track. Pratumnak Hill is deliberately silent (dark hill, no neon).
// Special case: when the DJ actually plays Sabai Sabai in Rainbow Girls, the
// soundtrack becomes the song itself.
const _REGION_TRACKS = {
  "Jomtien": "bus",
  "Beach Road": "bus",
  "Naklua": "bus",
  "Walking Street": "street",
  "Soi Buakhao": "soi",
  "LK Metro": "soi6",
  "Soi 6": "soi6",
  "Darkside": "soi",
};

function _audioForRoom(roomId, flags) {
  if (roomId === "rainbow_girls" && flags && flags.sabaiPlaying) {
    _audio.music("soi");
    return;
  }
  const region = ROOMS[roomId] && ROOMS[roomId].region;
  const track = _REGION_TRACKS[region];
  if (track) _audio.music(track);
  else _audio.stop();
}
