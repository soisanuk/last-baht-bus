// Boot: wire terminal ↔ engine ↔ TTS ↔ music; autosave, continue-prompt, undo.
// The engine stays storage-free — all persistence lives here.

const SAVE_KEY = "lbb_save";
let _prevSnap = null;         // one-level undo snapshot
let _awaitingContinue = false;

function _autosave() {
  try { localStorage.setItem(SAVE_KEY, serializeGame()); } catch (e) {}
}

function _dispatch(cmd) {
  const v = cmd.trim().toLowerCase();

  if (_awaitingContinue) {
    if (["yes", "y", "continue"].includes(v)) {
      _awaitingContinue = false;
      try { deserializeGame(localStorage.getItem(SAVE_KEY)); } catch (e) {}
      _term.print("Welcome back. Where were we…", "dim");
      _describeRoom(true);
      if (G.game) _renderGame(); // a live bar game was saved — redraw it, don't leave it invisible
    } else if (["no", "n", "new", "restart"].includes(v)) {
      _awaitingContinue = false;
      newGame();
      engineIntro();
      _autosave();
    } else {
      _term.print("YES to continue your night, NO to start fresh.", "dim");
      return;
    }
    _audioForRoom(G.room, G.flags);
    return;
  }

  if (v === "undo") {
    if (_prevSnap) {
      deserializeGame(_prevSnap);
      _prevSnap = null;
      _term.print("⌫ Rewound one command.", "dim");
      _describeRoom(true);
      if (G.game) _renderGame(); // rewound into a live game — redraw the board
      _autosave();
    } else {
      _term.print("Nothing to rewind — UNDO reaches back one command only.", "dim");
    }
    _audioForRoom(G.room, G.flags);
    return;
  }

  if (v === "save" || v === "load") {
    _term.print("The night saves itself after every command now. UNDO rewinds one.", "dim");
    return;
  }

  _prevSnap = serializeGame();
  doCommand(cmd);
  _autosave();
  _audioForRoom(G.room, G.flags);
}

document.addEventListener("DOMContentLoaded", () => {
  engineInit(
    (text, cls) => _term.print(text, cls),
    th => _tts.speak(th),
    name => _audio.sfx(name)
  );
  _term.init(_dispatch);

  const muteBtn = document.getElementById("mute-btn");
  muteBtn.textContent = _audio.muted() ? "🔇" : "🔊";
  muteBtn.addEventListener("click", () => {
    muteBtn.textContent = _audio.toggleMute() ? "🔇" : "🔊";
    if (!_audio.muted()) _audioForRoom(G.room, G.flags);
  });

  newGame();
  let savedLive = false;
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) savedLive = !JSON.parse(s).over;
  } catch (e) {}

  if (savedLive) {
    _awaitingContinue = true;
    _term.print("THE LAST BAHT BUS", "win");
    _term.print("a Pattaya misadventure · Soi Sanuk universe", "dim");
    _term.print("═══════════════════════════════════", "dim");
    _term.print("A night in progress was found on this device.");
    _term.print("Continue your night? (YES / NO)", "alert");
  } else {
    engineIntro();
    _autosave();
  }

  // Web Audio must be unlocked inside a real user gesture — on iOS a touch,
  // elsewhere any key/click works. First gesture also starts the room track.
  const startMusic = () => {
    document.removeEventListener("pointerdown", startMusic);
    document.removeEventListener("keydown", startMusic);
    if (!_awaitingContinue) _audioForRoom(G.room, G.flags);
    else _audio.music("bus"); // title music while the prompt waits
  };
  document.addEventListener("pointerdown", startMusic);
  document.addEventListener("keydown", startMusic);
});
