// Boot: wire terminal ↔ engine ↔ TTS ↔ music; autosave, continue-prompt, undo.
// The engine stays storage-free — all persistence lives here.

const SAVE_KEY = "lbb_save";
let _prevSnap = null;         // one-level undo snapshot
let _awaitingContinue = false;
let _awaitingReset = false;   // RESET arms a one-shot confirm before wiping the save

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
      _describeRoom(true, true); // restore / rewind: re-orient with the full desc
      _renderResume(); // redraw whatever modal prompt was gating input (game/encounter/checkout/fare/airline)
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
      _describeRoom(true, true); // restore / rewind: re-orient with the full desc
      _renderResume(); // rewound into a modal state — redraw its prompt (see engine _renderResume)
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

  // RESET wipes the save — a destructive one-way door, so it takes a confirmation.
  if (_awaitingReset) {
    _awaitingReset = false;
    if (["reset", "yes", "y", "confirm", "wipe"].includes(v)) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      _prevSnap = null; // the wipe isn't undoable — the confirm was the safety net
      newGame(); engineIntro(); _autosave();
      _term.print("⌫ Slate wiped — the wallet, the dog, the debts, the girls' patience, all of it. " +
        "A clean arrival on the beach, night one.", "alert");
    } else {
      _term.print("Reset cancelled — your night stands.", "dim");
    }
    _audioForRoom(G.room, G.flags);
    return;
  }
  if (v === "reset") {
    _awaitingReset = true;
    _term.print("⚠️  RESET erases your saved game from this device — permanently, no UNDO. " +
      "(RESTART just begins a fresh night; RESET wipes everything, records and all.)", "alert");
    _term.print("Type RESET again (or YES) to confirm — anything else cancels.", "alert");
    return;
  }

  // QUIT / END / LOGOUT — sign off for the night. Deferred while a mini-game or a
  // modal is live, so "quit" still concedes a game / answers a prompt as before.
  const busy = G.game || G.pendingEnc || G.pendingChoice || G.pendingBf || G.pendingSoapy || G.pendingFare;
  if (!busy && /^(quit|end|logout|log ?out|sign ?off|goodnight|good night)$/.test(v)) {
    const lvl = typeof _happyLevel === "function" ? _happyLevel(G.happy) : "";
    _term.print("You settle up, such as it is, and step out into it. The soi roars on without you — " +
      "it always does.", "win");
    _term.print(`Tonight so far: day ${G.day}${G.stage === "expat" ? " · Pattaya, home" : " of your trip"} · ` +
      `สนุก ${G.happy}${lvl ? ` — ${lvl}` : ""}.`, "dim");
    _term.print("Your night is saved on this device — reload any time to pick it up where you left off. " +
      "(RESET wipes it for a clean start.)", "dim");
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
    _term.renderChips([{ cmd: "yes", label: "YES — continue" }, { cmd: "no", label: "NO — start fresh" }]);
  } else {
    engineIntro();
    _autosave();
    _term.renderChips(); // paint the opening context chips
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
