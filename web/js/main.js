// Boot: wire terminal ↔ engine ↔ TTS, handle save/load (engine is storage-free).

const SAVE_KEY = "lbb_save";

function _dispatch(cmd) {
  const v = cmd.trim().toLowerCase();
  if (v === "save") {
    try {
      localStorage.setItem(SAVE_KEY, serializeGame());
      _term.print("Game saved. The soi will wait.", "dim");
    } catch (e) {
      _term.print("Couldn't save (storage unavailable).", "alert");
    }
    return;
  }
  if (v === "load") {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) { _term.print("No saved night found.", "dim"); return; }
      deserializeGame(s);
      _term.print("Game loaded. Where were we…", "dim");
      doCommand("look");
    } catch (e) {
      _term.print("Couldn't load that save.", "alert");
    }
    return;
  }
  doCommand(cmd);
}

document.addEventListener("DOMContentLoaded", () => {
  engineInit(
    (text, cls) => _term.print(text, cls),
    th => _tts.speak(th)
  );
  _term.init(_dispatch);
  newGame();
  engineIntro();
});
