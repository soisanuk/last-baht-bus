// Chiptune background music, synthesised live with the Web Audio API — no
// audio assets, works offline and from file://. Step sequencer and tracks
// reused from the Soi Sanuk trainer (audio.js).
//
// The AudioContext is created lazily on the first music call, which always
// happens right after a typed command (a user gesture), satisfying autoplay
// policies. Volume is kept low so it never fights the TTS voice.

const _audio = (() => {
  let _actx = null, _musBus = null, _sfxBus = null, _noiseBuf = null;
  let _muted = false;
  try { _muted = localStorage.getItem("lbb_muted") === "1"; } catch (e) {}

  const MUS_VOL = 0.14;
  const SFX_VOL = 0.5;   // one-shots sit well above the music bed so a clang lands loud

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
    _sfxBus = _actx.createGain();
    _sfxBus.connect(_actx.destination);
    _applyMute();
    return _actx;
  }

  function _applyMute() {
    if (!_actx) return;
    _musBus.gain.value = _muted ? 0 : MUS_VOL;
    _sfxBus.gain.value = _muted ? 0 : SFX_VOL;
  }

  // A bar bell: a metallic CLANG. Bells sound un-pitched because their partials
  // are inharmonic (non-integer ratios), so a stack of clean triangles at bell
  // ratios reads as struck brass rather than a chord; a short band-passed noise
  // burst is the striker hitting the shell. Fast attack, long ring-out.
  function _clang(t0) {
    // Low base = heft, long decays = a ring you actually hear. The low "hum"
    // partial gives body; the higher inharmonic ones give the metallic bite.
    const base = 440;
    const partials = [ // [ratio, peak, decay-seconds]
      [0.50, 0.30, 2.6], [1.00, 0.46, 2.2], [1.19, 0.24, 1.7],
      [2.00, 0.30, 1.5], [2.66, 0.17, 1.1], [3.60, 0.11, 0.8],
    ];
    for (const [ratio, vol, dur] of partials) {
      const o = _actx.createOscillator(), g = _actx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(base * ratio, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(_sfxBus);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    _ensureNoiseBuf();
    const s = _actx.createBufferSource();
    s.buffer = _noiseBuf;
    const f = _actx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.8;
    const ng = _actx.createGain();
    ng.gain.setValueAtTime(0.35, t0);
    ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
    s.connect(f); f.connect(ng); ng.connect(_sfxBus);
    s.start(t0); s.stop(t0 + 0.13);
  }

  // ── The dog ────────────────────────────────────────────────────────────────
  // Same toolkit as the surf: filtered noise and oscillators, no samples. A
  // growl is not a low tone — it's a BUZZ, the chest rumble amplitude-modulated
  // at about 30 Hz, which is why a plain sine at 70 Hz sounds like a fridge and
  // this doesn't. Two slightly detuned saws beat against each other so it never
  // settles into a machine note, a bandpass stands in for the throat, and a
  // little noise rides on top as breath.
  function _growl(t0, opt) {
    const o = opt || {};
    const dur = o.dur || 0.95, f0 = o.f0 || 76, f1 = o.f1 || f0;
    const bright = o.bright || 600, peak = o.peak || 0.38;
    const amRate = o.amRate || 28, attack = o.attack || 0.12;
    _ensureNoiseBuf();

    const out = _actx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    out.gain.setValueAtTime(peak, t0 + dur * 0.66);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    out.connect(_sfxBus);

    // the rrrrr — modulate depth, never fully closing, or it chops into pulses
    const am = _actx.createGain();
    am.gain.setValueAtTime(0.55, t0);
    const lfo = _actx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(amRate, t0);
    lfo.frequency.linearRampToValueAtTime(amRate * 1.25, t0 + dur);
    const depth = _actx.createGain();
    depth.gain.value = 0.42;
    lfo.connect(depth); depth.connect(am.gain);
    am.connect(out);
    lfo.start(t0); lfo.stop(t0 + dur + 0.02);

    const throat = _actx.createBiquadFilter();
    throat.type = "bandpass";
    throat.frequency.setValueAtTime(bright, t0);
    throat.frequency.linearRampToValueAtTime(bright * (o.open || 1), t0 + dur);
    throat.Q.value = 1.4;
    throat.connect(am);

    for (const det of [1, 1.013]) {          // the beating is the animal in it
      const osc = _actx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f0 * det, t0);
      osc.frequency.linearRampToValueAtTime(f1 * det, t0 + dur);
      const g = _actx.createGain(); g.gain.value = 0.5;
      osc.connect(g); g.connect(throat);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    const s = _actx.createBufferSource();
    s.buffer = _noiseBuf;
    const nf = _actx.createBiquadFilter();
    nf.type = "bandpass"; nf.frequency.value = bright * 2.2; nf.Q.value = 0.7;
    const ng = _actx.createGain();
    ng.gain.value = o.breath == null ? 0.09 : o.breath;
    s.connect(nf); nf.connect(ng); ng.connect(am);
    s.start(t0); s.stop(t0 + dur);
  }

  // A snarl is a growl that has made up its mind: teeth first (a bright noise
  // transient — the lip coming off them), then a shorter, higher, rising growl.
  function _snarl(t0) {
    _ensureNoiseBuf();
    const s = _actx.createBufferSource();
    s.buffer = _noiseBuf;
    const f = _actx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 1800;
    const g = _actx.createGain();
    g.gain.setValueAtTime(0.42, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    s.connect(f); f.connect(g); g.connect(_sfxBus);
    s.start(t0); s.stop(t0 + 0.11);

    _growl(t0 + 0.02, { dur: 0.52, f0: 98, f1: 156, bright: 940, open: 1.5,
                        peak: 0.50, amRate: 38, attack: 0.035, breath: 0.17 });
  }

  function _note(freq, t0, dur, type, vol, dest) {
    const o = _actx.createOscillator();
    const g = _actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(dest || _musBus);
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
    // The Last Baht Bus — ORIGINAL, the title theme. I–V–vi–IV in C
    // (C G Am F: THE pop progression), because the ride home should sound
    // like every song you half-remember from the night. Retires the invented
    // Pattaya Pattaya placeholder — this one never claims to be anything else.
    bus: {
      bpm: 116, lead: "triangle", leadVol: 0.16, hat: true, bassEvery: 2,
      bass: [36, 31, 33, 29, 36, 31, 29, 31],   // C G Am F · C G F G
      melody: [
        67,null,64,null, 72,null,null,71,   // C: sol mi do' — ti left hanging
        71,null,67,null, 62,null,null,null, // G: answered down to re
        69,null,72,null, 76,null,74,72,     // Am: the lift — la do' mi' re' do'
        72,71,69,null, 65,null,null,null,   // F: eased back down
        67,null,64,null, 72,null,null,71,   // C: again
        71,null,67,null, 74,null,72,71,     // G: the higher answer
        69,null,72,null, 69,67,65,64,       // F: falling toward home
        62,null,64,null, 67,65,64,62,       // G: idling — the bus rolls on
      ],
    },

    // ── The originals: written for this game, filling what the covers
    // library lacks. Every cover above is minor-key; these are the major-key
    // side of the night. Progressions are common property — the melodies are
    // ours.

    // Last Call — the one the house band ends the night on. I–V–vi–IV in G,
    // re-struck held notes, the arms-around-strangers chorus. The songbook's
    // one anthem: 8 covers and not a single major key among them.
    lastcall: {
      bpm: 128, lead: "square", leadVol: 0.13, hat: true, bassEvery: 1,
      bass: [31, 26, 28, 36, 31, 26, 28, 36],   // G D Em C ×2
      melody: [
        74,74,null,71, 74,null,76,null,   // G: the shout — re-struck D'
        78,null,76,null, 74,null,76,null, // D: F#' E' D' E'
        76,76,null,74, 76,null,79,null,   // Em: reaching G'
        74,null,72,null, 71,null,72,74,   // C: stepping down, turning
        71,71,null,67, 71,null,74,null,   // G: the low phrase
        78,78,null,76, 74,null,76,null,   // D
        79,null,78,76, 78,null,76,74,     // Em: the peak, falling
        72,72,74,null, 71,null,69,67,     // C: down to sol — loop to the shout
      ],
    },
    // Slow Dance — the gents clubs' velvet-couch record. I–vi–IV–V in C:
    // the 50s prom loop (Stand By Me's chassis, nobody's melody). Sparse on
    // purpose — at this register the rests are the slow dance.
    slowdance: {
      bpm: 104, lead: "triangle", leadVol: 0.15, hat: false, bassEvery: 2,
      bass: [36, 33, 29, 31],               // C Am F G
      melody: [
        64,null,null,67, null,null,72,null,  // C: mi… sol… do'
        71,null,69,null, null,null,64,null,  // Am: ti la … mi
        65,null,69,null, 72,null,74,null,    // F: fa la do' re'
        71,null,67,null, 62,null,null,null,  // G: ti sol re
      ],
    },
    // After Hours — slow 12-bar blues in C, the form the library had nowhere:
    // the lounge record for the hour when nobody is performing anything.
    // The 12-bar is common property older than copyright itself.
    afterhours: {
      bpm: 100, lead: "triangle", leadVol: 0.14, hat: false, bassEvery: 2,
      bass: [36, 36, 36, 36, 29, 29, 36, 36, 31, 29, 36, 31],   // C×4 F F C C G F C G
      melody: [
        67,null,70,null, 72,null,null,null,   // C: sol te do' — asked slowly
        72,70,67,null, 65,null,null,null,     // C: answered down
        null,null,63,65, 66,65,63,60,         // C: the blues run, blue third
        60,null,null,null, null,null,67,70,   // C: rest… pickup
        72,null,75,null, 72,null,70,null,     // F: up to the blue seventh
        70,null,67,null, 65,null,63,null,     // F: easing off
        60,null,63,null, 65,66,67,null,       // C: the climb through the box
        70,null,67,null, null,null,null,null, // C: hanging
        74,null,72,null, 70,null,67,null,     // G: the turnaround starts
        65,null,66,null, 65,null,63,null,     // F: chromatic worry
        60,null,null,63, 65,null,66,67,       // C: gathering
        70,null,67,65, 63,null,60,null,       // G: and back to the top
      ],
    },
    // Two-Step — country I–IV–V in G, the homesick half of every expat
    // songbook: the one that empties the pool table and fills the rail.
    twostep: {
      bpm: 120, lead: "square", leadVol: 0.12, hat: true, bassEvery: 1,
      bass: [31, 31, 36, 31, 26, 36, 31, 26],   // G G C G · D C G D
      melody: [
        62,64,67,null, 71,null,69,67,     // G: the twang pickup
        69,null,67,64, 62,null,null,null, // G: settled
        64,67,72,null, 76,null,74,72,     // C: opened up
        71,null,67,null, null,null,62,64, // G: turning
        66,null,69,null, 74,null,72,69,   // D: the high lonesome bit
        72,null,76,74, 72,null,69,67,     // C: coming down
        67,71,74,null, 71,null,67,null,   // G: the chorus shape
        66,64,62,null, 64,66,64,62,       // D: walk back to the top
      ],
    },
    // Shuffle — 12-bar boogie in A, uptempo. Every house band's set has one;
    // now the game's does. Sawtooth for the grit.
    shuffle: {
      bpm: 132, lead: "sawtooth", leadVol: 0.10, hat: true, bassEvery: 1,
      bass: [33, 33, 33, 33, 38, 38, 33, 33, 28, 38, 33, 28],   // A×4 D D A A E D A E
      melody: [
        69,null,72,74, 75,74,72,69,       // A: THE riff
        69,null,72,74, 75,74,72,69,       // A: again — it's a riff
        76,null,74,72, 69,null,67,null,   // A: answered
        69,72,74,76, 79,null,76,74,       // A: climbing out
        74,null,72,null, 74,75,74,72,     // D: the riff up a box
        69,null,72,74, 75,74,72,69,       // D: home shape over IV
        69,null,72,74, 75,74,72,69,       // A: riff
        76,74,72,null, 69,null,72,null,   // A: breathing
        76,null,79,null, 76,null,74,null, // E: the shout
        74,null,75,74, 72,null,69,null,   // D: worried note
        69,72,74,75, 76,null,79,null,     // A: one more climb
        81,79,76,74, 72,null,69,null,     // E: turnaround from the top
      ],
    },
    // Molam — the phin riff, A minor pentatonic over an i–VII bounce.
    // The most Isan music there is, which makes it the most honest track in
    // the game: the workforce is from Isan, and on the Darkside the night
    // runs on the crowd's own music, not the customers'.
    molam: {
      bpm: 144, lead: "square", leadVol: 0.13, hat: true, bassEvery: 1,
      bass: [33, 33, 31, 33, 33, 31, 28, 33],   // Am Am G Am · Am G E Am
      melody: [
        69,72,69,67, 69,null,72,74,       // Am: the phin figure
        76,74,72,74, 72,69,67,69,         // Am: rolling
        67,74,72,74, 67,74,72,74,         // G: the hammered drone
        69,72,74,76, 74,72,69,null,       // Am: up and back
        81,null,79,76, 79,76,74,72,       // Am: the high call
        74,72,74,null, 72,74,67,null,     // G: answering
        76,null,74,72, 69,null,72,null,   // E: leaning home
        69,67,69,72, 69,null,null,null,   // Am: landed
      ],
    },
    // Chiwit — phleng phuea chiwit shape (Thai songs-for-life folk rock, the
    // Carabao idiom, original tune): I–IV–V in D, driving pentatonic riff.
    // What a Darkside bar actually has on: Thai rock, not the farang songbook.
    chiwit: {
      bpm: 138, lead: "square", leadVol: 0.13, hat: true, bassEvery: 1,
      bass: [38, 38, 31, 33, 38, 31, 33, 38],   // D D G A · D G A D
      melody: [
        74,null,71,69, 71,null,69,66,     // D: the riff
        69,null,66,64, 66,null,64,62,     // D: answered low
        62,64,66,67, 69,null,71,69,       // G: the run up
        69,66,69,null, 71,69,66,64,       // A: circling
        74,null,71,69, 71,null,69,66,     // D: riff again
        66,67,69,null, 74,null,71,69,     // G: higher
        66,null,64,null, 64,66,69,71,     // A: gathering
        74,74,null,69, 74,null,null,null, // D: planted
      ],
    },

    // Neon Rain — eurodance stab hook, G minor i–VI–VII on the doubled grid
    // (8ths as 16ths, same trick as whatislove). The go-go crate's first
    // original: until now the DJs owned nothing they spun.
    neonrain: {
      bpm: 240, slow: 0.7, lead: "square", leadVol: 0.12, hat: true, bassEvery: 2,
      bass: [31, 31, 27, 29],               // Gm Gm Eb F
      melody: [
        74,74,null,74, null,72,74,null,     // the stab
        74,74,null,74, null,74,75,74,       // stab, pushed
        75,null,72,null, 70,null,72,74,     // over Eb, darker
        72,null,70,69, 70,null,67,null,     // F resolving down
      ],
    },
    // Night Drive — italo-flavoured, Am F C G: vi–IV–I–V, the "sensitive"
    // rotation of the axis. The four-chords loop wearing sunglasses at 2am.
    nightdrive: {
      bpm: 126, lead: "square", leadVol: 0.13, hat: true, bassEvery: 1,
      bass: [33, 29, 36, 31],               // Am F C G
      melody: [
        76,null,74,72, 74,null,72,71,       // Am: circling down
        72,null,69,null, 71,72,74,null,     // F: lifting
        76,null,79,76, 74,null,72,null,     // C: the top
        71,74,71,null, 69,71,72,74,         // G: rolling back up
      ],
    },
    // City Pop — bright Thai-pop shape, E major I–vi–IV–V. The DJs play Thai
    // dance-pop between the farang hits; now the crate can too.
    citypop: {
      bpm: 118, lead: "triangle", leadVol: 0.15, hat: true, bassEvery: 1,
      bass: [28, 37, 33, 35],               // E C#m A B
      melody: [
        68,71,76,null, 75,null,73,71,       // E: the bright hook
        73,null,71,68, 69,null,71,null,     // C#m: shaded
        69,73,76,null, 73,null,71,69,       // A: open
        68,null,66,68, 71,null,75,null,     // B: leading home
      ],
    },
    // Chrome — synthwave, E minor i–VI–VII–v. A sibling for Walking Street's
    // "street" that lives in the go-go crate instead.
    chrome: {
      bpm: 124, lead: "sawtooth", leadVol: 0.11, hat: true, bassEvery: 1,
      bass: [28, 36, 26, 35],               // Em C D Bm
      melody: [
        76,null,null,74, 76,null,79,null,   // Em: held and lifted
        76,74,72,null, 71,null,72,74,       // C: falling through
        74,null,71,null, 69,null,71,72,     // D
        71,null,66,null, 67,69,71,74,       // Bm: climbing out
      ],
    },
    // Island — reggae skank in G, I–IV–I–V, every note on the offbeat.
    // No beach-town band survives without one.
    island: {
      bpm: 116, lead: "triangle", leadVol: 0.15, hat: true, bassEvery: 2,
      bass: [31, 36, 31, 26],               // G C G D
      melody: [
        null,71,null,71, null,74,null,72,   // the skank
        null,72,null,72, null,76,null,74,
        null,71,null,74, null,71,null,67,
        null,69,null,69, null,71,72,74,
      ],
    },
    // Surf Rock — E minor, machine-gun tremolo picking on the grid.
    // i–VII–VI–v, wet spring reverb implied.
    surfrock: {
      bpm: 150, lead: "sawtooth", leadVol: 0.11, hat: true, bassEvery: 1,
      bass: [28, 26, 36, 35],               // Em D C Bm
      melody: [
        76,76,76,76, 74,76,74,72,           // the tremolo run
        74,74,74,74, 72,74,71,69,
        72,72,72,72, 71,72,74,76,
        71,71,74,71, 76,74,72,71,
      ],
    },
    // Night Owl — soul groove in C, I–iii–IV–V, warm and unhurried.
    // The set the band plays while the night decides what it is yet.
    nightowl: {
      bpm: 112, lead: "triangle", leadVol: 0.16, hat: true, bassEvery: 2,
      bass: [36, 28, 29, 31],               // C Em F G
      melody: [
        67,null,64,67, 69,null,72,null,     // C: easing in
        71,null,67,null, 64,null,67,69,     // Em
        69,null,65,69, 72,null,74,72,       // F: reaching
        71,69,67,null, 62,64,67,null,       // G: rolling round
      ],
    },
    // Bossa — ii–V–I–vi in C, sparse and syncopated. The lounge's third
    // record: slow dance, slow blues, and now the one with the shrug in it.
    bossa: {
      bpm: 116, lead: "triangle", leadVol: 0.13, hat: false, bassEvery: 2,
      bass: [38, 31, 36, 33],               // Dm G C Am
      melody: [
        65,null,null,69, null,74,null,72,   // Dm: off the beat
        null,71,null,67, 74,null,71,null,   // G
        72,null,76,null, null,71,null,69,   // C: the sigh
        69,null,72,null, 71,69,67,64,       // Am: stepping down
      ],
    },
    // Luk Thung — molam's crooning sibling: D major pentatonic ballad,
    // I–vi–IV–V, ornamented like a singer bending the ends of lines.
    // Darkside-only, same reasoning as molam: the crowd's own music.
    lukthung: {
      bpm: 104, lead: "triangle", leadVol: 0.17, hat: false, bassEvery: 2,
      bass: [38, 35, 31, 33],               // D Bm G A
      melody: [
        69,null,71,69, 66,null,64,66,       // D: the croon
        64,66,69,null, 71,null,69,66,       // Bm: turned over
        71,69,66,64, 62,null,64,66,         // G: falling gently
        64,null,66,64, 62,64,66,69,         // A: the bend back up
      ],
    },

    // ── The covers library: what the house bands and go-go DJs actually play.
    // Chiptune approximations of the 80s/90s songbook — melodies transcribed
    // by ear onto the 8th-note grid, close enough to grin at.

    // Take On Me (a-ha, 1985) — the synth riff; bpm doubled so 8th steps
    // read as the original's 16ths. F#m D A E under it.
    takeonme: {
      bpm: 336, slow: 0.7, lead: "square", leadVol: 0.13, hat: true, bassEvery: 4,
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
      bpm: 248, slow: 0.7, lead: "square", leadVol: 0.12, hat: true, bassEvery: 2,
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
      bpm: 236, slow: 0.7, lead: "square", leadVol: 0.14, hat: true, bassEvery: 4,
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
      bpm: 236, slow: 0.7, lead: "square", leadVol: 0.14, hat: true, bassEvery: 4,
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

  // Effective bpm: every track plays at 75% of its written bpm (full speed felt
  // rushed), and the doubled/quadrupled-grid covers (takeonme/whatislove/axelf/
  // countdown) carry an extra `slow` factor on top so their inflated bpm doesn't
  // leave them racing while the ballads amble — a uniform *perceived* tempo. One
  // source of truth, shared by the scheduler and the tempo() probe.
  const _effBpm = t => t.bpm * 0.75 * (t.slow || 1);

  // The leak: the local set heard through a wall. Bass only, through a heavy
  // lowpass — no melody, no hat, no octave pop (150 Hz keeps none of it). The
  // set still advances underneath, so stepping inside resolves the thump you
  // were hearing into the song it always was.
  let _leakMode = false, _leakLPNode = null;
  function _leakLP() {
    if (!_leakLPNode) {
      _leakLPNode = _actx.createBiquadFilter();
      _leakLPNode.type = "lowpass";
      _leakLPNode.frequency.value = 150;
      _leakLPNode.connect(_musBus);
    }
    return _leakLPNode;
  }

  function _schedule() {
    while (_nextT < _actx.currentTime + 0.18) {
      const t = _track, spb = 30 / _effBpm(t);
      const bar = Math.floor(_step / 8) % t.bass.length;
      const pos = _step % 8;
      const root = t.bass[bar];
      if (_leakMode) {
        if (pos % t.bassEvery === 0) {
          _note(_f(root), _nextT, spb * 0.9, "triangle", 0.55, _leakLP());
        }
      } else {
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
      }
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
    _leakMode = false;
  }

  // Ambience: a looping noise bed with slow, irregular swells — the sea
  // arriving and withdrawing. The filter opens at each crest (the hiss of
  // the break) and settles back to a low rumble between waves.
  let _amb = null, _ambTimers = [], _ambName = null;

  function _ambStop() {
    for (const t of _ambTimers) clearTimeout(t);
    _ambTimers = [];
    if (_amb) { try { _amb.src.stop(); } catch (e) {} _amb = null; }
    _ambName = null;
  }

  function _ambience(name) {
    if (!_ctx()) return;
    if (_ambName === name && (_amb || _ambTimers.length)) return;
    _musicStop();
    _ambStop();
    _ambName = name;
    _ensureNoiseBuf();
    if (name !== "surf") { _townBed(name === "town"); return; }
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
      _ambTimers.push(setTimeout(swell, (up + down) * 1000 + 800 + Math.random() * 2500));
    };
    swell();
  }

  // The town at night, synthesized like the surf — no samples. Two layers:
  // night insects (short high-passed ticks in irregular clusters — the chirp
  // is the gap, not the tone) and, on lit streets, a low traffic rumble with
  // the odd motorbike passing. Dark rooms get the insects alone: losing the
  // rumble is what reads as "quieter", and the dark should feel it.
  function _townBed(traffic) {
    const bedName = _ambName;
    if (traffic) {
      const src = _actx.createBufferSource();
      src.buffer = _noiseBuf;
      src.loop = true;
      const f = _actx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 120;
      const g = _actx.createGain();
      g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(_musBus);
      src.start();
      _amb = { src, f, g };
    }
    const chirp = () => {
      if (_ambName !== bedName) return;
      let t = _actx.currentTime + 0.05;
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        _noise(t, 0.025, traffic ? 0.05 : 0.07, 5200 + Math.random() * 900);
        t += 0.07 + Math.random() * 0.05;
      }
      _ambTimers.push(setTimeout(chirp, 500 + Math.random() * 1900));
    };
    chirp();
    if (traffic) {
      const bike = () => {
        if (_ambName !== bedName) return;
        const t0 = _actx.currentTime + 0.05;
        const up = 0.9 + Math.random() * 0.6, down = 1.2 + Math.random() * 0.8;
        const src = _actx.createBufferSource();
        src.buffer = _noiseBuf;
        src.loop = true;
        const f = _actx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 2;
        f.frequency.setValueAtTime(250, t0);
        f.frequency.linearRampToValueAtTime(850, t0 + up);       // approaching
        f.frequency.linearRampToValueAtTime(180, t0 + up + down); // gone past
        const g = _actx.createGain();
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.09, t0 + up);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + up + down);
        src.connect(f); f.connect(g); g.connect(_musBus);
        src.start(t0);
        src.stop(t0 + up + down + 0.1);
        _ambTimers.push(setTimeout(bike, 9000 + Math.random() * 13000));
      };
      _ambTimers.push(setTimeout(bike, 2500 + Math.random() * 6000));
    }
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
    // The set heard through the wall: playlist machinery, bass only, lowpassed.
    // Keyed per REGION by the caller, so walking along the soi never restarts
    // the thump — it just keeps coming from whichever bar is nearest.
    leak(names, key) {
      if (!names.length || !_ctx()) return;
      if (_plKey === key && _timer && _leakMode) return;
      _ambStop();
      _musicStop();
      _leakMode = true;
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
    tempo(name) { return TRACKS[name] ? _effBpm(TRACKS[name]) : 0; }, // effective bpm (post-slowdown)
    ambience: _ambience,
    // One-shot effects. "bell" is the bar bell — two quick swings, a real clang.
    sfx(name) {
      if (!_ctx()) return;
      const t = _actx.currentTime + 0.02;
      if (name === "bell") {
        _clang(t);
        _clang(t + 0.17); // the second swing — clang-CLANG
      } else if (name === "growl") {
        _growl(t);        // the warning: he has seen something and you have not
      } else if (name === "snarl") {
        _snarl(t);        // the decision
      }
    },
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
// song itself. ("bus" is the title/continue-prompt theme — the original
// Last Baht Bus tune, not a venue track.)
const _STREET_TRACKS = {
  "Walking Street": "street",
  "LK Metro": "soi6",
  "Soi 6": "soi6",
};

// The set lists. Go-gos and Soi 6 bars run the synth/dance crate; beer bars
// and the pub get the house band's songbook (Sabai Sabai stays in rotation —
// the local hit always comes back around). No Wonderwall. House rule.
const _GOGO_SET = ["soi6", "neonrain", "careless", "whatislove", "nightdrive", "billiejean", "takeonme", "citypop", "axelf", "chrome"];
const _BAND_SET = ["soi", "zombie", "island", "prayer", "lastcall", "twostep", "nightowl", "shuffle", "surfrock", "countdown", "takeonme"];
// The Orchid and its kind: a curtained AC villa is not a pub-rock room. The
// slow doo-wop original plus the one cover that already lives at that tempo.
const _GENTS_SET = ["slowdance", "afterhours", "bossa", "careless"];
// Darkside bars: the crowd is local and the band is Thai — songs-for-life
// first, Sabai Sabai always, and the two covers every Thai rock band plays
// anyway. The farang songbook stays in town. Covers the lakeside pair too,
// which is exactly right: the Boathouse's families get Thai music, not Bon
// Jovi.
const _DARK_SET = ["chiwit", "molam", "lukthung", "soi", "zombie", "prayer"];

// Regions within earshot of the sea: streets here get the surf ambience
// instead of silence. Interiors lose the sea to walls and air conditioning.
const _SURF_REGIONS = new Set(["Jomtien", "Beach Road"]);
const _SURF_INTERIORS = new Set(["central_mall", "police_station", "short_time_motel"]);

// Between the songs and the silence, two street tiers — so the walk toward a
// bar is a gradient: surf → insects → distant bass → the song itself.
//
// Bar-lined regions LEAK: you hear the bass of the local set through the
// walls before you ever pick a door. It is genuinely the region's set list,
// so stepping inside resolves the thump into the song it always was. Which
// crate leaks is the region's dominant trade — Tree Town's maze centres on
// its go-gos, the rest are beer-bar streets.
const _LEAK_REGIONS = {
  "Soi Buakhao": { leak: _BAND_SET },
  "Soi Diana":   { leak: _BAND_SET },
  "Soi Honey":   { leak: _BAND_SET },
  "Myth Night":  { leak: _BAND_SET },
  "Tree Town":   { leak: _GOGO_SET },
};

// Ordinary lit streets get the town itself: traffic rumble, night insects,
// a motorbike passing. (Dark rooms get "night" instead — insects only,
// which is what makes the dark read as quieter.)
const _TOWN_REGIONS = new Set(["Second Road", "Thappraya", "Naklua", "Pratumnak", "Darkside"]);

// Interiors that are not bars: treatment rooms, kitchens, shops, your bed.
// The street tiers stop at these doors. (Madam Oy's office is deliberately
// NOT here — it sits behind her own go-go, and the bass through that wall
// is hers.)
function _roomIndoors(roomId, room) {
  return !!(room.massage || room.soapy || room.food || room.shop || room.hostBar ||
    /^Your Room/.test(room.name || "") || _SURF_INTERIORS.has(roomId));
}

// Pure track choice — a track name, a set list array, "surf" for the sea,
// or null for silence. The testable half of the system.
function _trackForRoom(roomId, flags) {
  if (roomId === "rainbow_girls" && flags && flags.sabaiPlaying) return "soi";
  const room = ROOMS[roomId];
  if (!room) return null;
  if (room.barType) {
    if (room.barType === "gents") return _GENTS_SET;
    if (room.region === "Darkside") return _DARK_SET;
    return room.barType === "gogo" || room.barType === "soi6" ? _GOGO_SET : _BAND_SET;
  }
  // your bed is yours — the Queen Vic room would otherwise inherit the
  // Soi 6 street track through the balcony
  if (/^Your Room/.test(room.name || "")) return null;
  // the dark is quieter, wherever it is — this also takes the Walking Street
  // service alley off the full synthwave it absurdly used to play. One
  // exception, written by the map itself: every dark room on the Jomtien
  // shore is a beach or a shore road, and the sea does not stop being
  // audible in the dark. Dark yields to surf; everything else goes quiet.
  if (room.dark && !(_SURF_REGIONS.has(room.region) && !_SURF_INTERIORS.has(roomId))) {
    return "night";
  }
  if (_STREET_TRACKS[room.region]) return _STREET_TRACKS[room.region];
  const lk = _LEAK_REGIONS[room.region];
  if (lk && !_roomIndoors(roomId, room)) return lk;
  if (_SURF_REGIONS.has(room.region) && !_SURF_INTERIORS.has(roomId)) return "surf";
  if (_TOWN_REGIONS.has(room.region) && !_roomIndoors(roomId, room)) return "town";
  return null;
}

function _audioForRoom(roomId, flags) {
  const track = _trackForRoom(roomId, flags);
  if (Array.isArray(track)) _audio.playlist(track, roomId);
  else if (track && track.leak) _audio.leak(track.leak, "leak:" + (ROOMS[roomId] || {}).region);
  else if (track === "surf" || track === "town" || track === "night") _audio.ambience(track);
  else if (track) _audio.music(track);
  else _audio.stop();
}
