// Boot: wire terminal ↔ engine ↔ TTS ↔ music; autosave, continue-prompt, undo.
// The engine stays storage-free — all persistence lives here.

const SAVE_KEY = "lbb_save";
let _prevSnap = null;         // one-level undo snapshot
let _awaitingContinue = false;
let _awaitingReset = false;   // RESET arms a one-shot confirm before wiping the save

function _autosave() {
  try { localStorage.setItem(SAVE_KEY, serializeGame()); } catch (e) {}
}

// The mode-select / intro overlay shown on a fresh start (see index.html
// #start-overlay). Continuing a saved night bypasses it.
function _showStartMenu() {
  // Fresh-start gateway (boot with no save, RESET, or continue→NO): clear any
  // in-memory state so a full RESET actually re-runs character creation (the taxi
  // intro), not just wipes the save. Without this, a lingering G.player.origin from
  // the session makes startSoi6Mode restore it and skip the intro straight to the
  // Queen Vic. (The automatic in-game resets — _act1Fail, new week — still keep
  // identity on purpose; this only affects the explicit fresh-start paths.)
  newGame();
  const ov = document.getElementById("start-overlay");
  if (!ov) { engineIntro(); _autosave(); _term.renderChips(); return; } // safety net
  document.getElementById("start-menu").hidden = false;
  document.getElementById("start-intro").hidden = true;
  _applyFullGate();
  ov.hidden = false;
}

// Reflect the TOGGLE FULL pref onto the splash button. Called at boot and
// whenever the start menu is shown, so the unlock survives a reload.
// ── Text size (phone readability for older eyes — docs/voice-narration.md's
// first lever). Presentation only: scales BODY font-size, which the terminal
// prose and the input inherit while every rem-based piece of chrome (header,
// fabs, chips, the ASCII bar-mat map, the QR) stays put. The pref lives here
// in localStorage, never in G — saves, determinism and the vm suite can't
// see it, and gameplay is untouched by design.
const _FONT_STEPS = [
  { px: 15, name: "standard" },
  { px: 17, name: "large" },
  { px: 19, name: "larger" },
  { px: 21, name: "largest" },
];
function _fontStep() {
  let px = 15;
  try { px = parseInt(localStorage.getItem("lbb_font_px"), 10) || 15; } catch (e) {}
  const i = _FONT_STEPS.findIndex(f => f.px === px);
  return i >= 0 ? i : 0;
}
function _applyFontSize() {
  const f = _FONT_STEPS[_fontStep()];
  document.body.style.fontSize = f.px === 15 ? "" : f.px + "px";
  const btn = document.getElementById("font-fab");
  if (btn) btn.title = "Text size: " + f.name;
}
function _cycleFontSize() {
  const next = _FONT_STEPS[(_fontStep() + 1) % _FONT_STEPS.length];
  try { localStorage.setItem("lbb_font_px", String(next.px)); } catch (e) {}
  _applyFontSize();
  _term.print("▦ Text size: " + next.name + ".", "dim");
}

// ── The splash marquee: the poster deck on a 10-second neon rotation ─────────
// Every pin-up poster the art track has shipped (plus the commissioned
// splash.webp vista, which joins the deck the day it exists). Random starting
// point each load, sequential wrap, one strike every 10s while the overlay is
// up. A file that fails to load self-heals out of the deck, so this list
// drifting behind the art directory costs a missing rotation slot, never a bug.
// CURATED to the neon photoreal register (2026-08-15): 14 of the 36 posters
// came back in a flat vintage-mural style (aof, beam, boom, cherry, dao, fah,
// gift, ice, mook, noi, orn, praew, sara, view) — a different visual language
// that jars on the splash. They stay in the game's poster feature; they're
// just out of this rotation until rerolled. Contact-sheet review, Mario's call.
const _SPLASH_DECK = ["splash",
  "aoi", "aom", "bow", "fang", "gib", "gigi", "jum", "nam", "namwan", "naree",
  "nice", "noey", "pancake", "pang", "ploen", "pop", "sai", "sasi", "toey",
  "tukta", "yada", "yui"];
function _splashInit() {
  const wrap = document.getElementById("start-art-wrap");
  const overlay = document.getElementById("start-overlay");
  if (!wrap || !overlay) return;
  const layers = wrap.querySelectorAll("img");
  const deck = [..._SPLASH_DECK];
  let i = Math.floor(Math.random() * deck.length);
  let front = 0; // which layer is on top
  function swap(url) {
    const inc = layers[1 - front], out = layers[front];
    inc.src = url;
    inc.classList.remove("lit", "dim");
    void inc.offsetWidth;              // restart the strike animation
    out.classList.remove("lit"); out.classList.add("dim");
    inc.classList.add("lit");
    front = 1 - front;
  }
  function advance(step, tries) {
    if (!deck.length) { wrap.remove(); return; }
    if ((tries || 0) >= deck.length) { wrap.remove(); return; }
    i = (i + step + deck.length) % deck.length;
    const id = deck[i];
    const pre = new Image();
    pre.onload = () => swap(pre.src);
    pre.onerror = () => { deck.splice(i, 1); if (i >= deck.length) i = 0; advance(0, (tries || 0) + 1); };
    pre.src = "art/posters/" + id + ".webp";
  }
  advance(0, 0);
  setInterval(() => { if (!overlay.hidden) advance(1, 0); }, 10000);
}

function _applyFullGate() {
  const btn = document.querySelector('#start-menu .start-mode[data-mode="full"]');
  if (!btn) return;
  let on = false;
  try { on = localStorage.getItem("lbb_full_on") === "1"; } catch (e) {}
  btn.disabled = !on;
  const desc = btn.querySelector(".start-mode-desc");
  if (desc) desc.textContent = on
    ? "The whole coast — Jomtien to Naklua, lost wallet and all. Day two of seven."
    : "The whole coast — Jomtien to Naklua, lost wallet and all. Coming soon.";
}

// THE FULL GAME: the seven-day vacation, opening on the beach with no wallet.
// startSoi6Mode has its own setup; this is just the ordinary game, which is
// what engineIntro() has always started.
function _startFull() {
  const ov = document.getElementById("start-overlay");
  if (ov) ov.hidden = true;
  newGame();
  engineIntro();
  _autosave();
  _term.renderChips();
  _audioForRoom(G.room, G.flags);
}

function _startGame(daily) { // START / TODAY'S SOI on the Soi 6 intro panel
  const ov = document.getElementById("start-overlay");
  if (ov) ov.hidden = true;
  if (daily) {
    // Seed-of-the-day: the engine never reads a clock (shared-world rule 1),
    // so the DATE is computed here and handed in as a string — everyone who
    // presses TODAY'S SOI on the same calendar day gets the same week.
    const d = new Date().toISOString().slice(0, 10);
    startSoi6Mode({ seed: _dailySeed(d), dailyId: d });
  } else {
    startSoi6Mode();
  }
  _autosave();
  _term.renderChips();
  _audioForRoom(G.room, G.flags);
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
      _showStartMenu();
      return;
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

  // TOGGLE_V0 / TOGGLE_V1 — hidden switches for the visual layers (the v0 scene
  // panel; v1 hotspots when they land). Deliberately unsurfaced like the cheat
  // codes: no autocomplete, no decoration, no HELP line — but NOT gated on
  // CHEATS_ENABLED (display modes, not advantages). Default OFF. The prefs are
  // presentation, so they live here in localStorage ("lbb_v0_on"/"lbb_v1_on",
  // read by scene.js) and never in G — saves, determinism, and the vm suite
  // can't see them. v1 renders on v0's panel, so v1 needs v0 on too.
  const tog = v.match(/^toggle[_ ]?v([01])$/);
  if (tog) {
    const key = "lbb_v" + tog[1] + "_on";
    // Each switch has its OWN default, so "what is it now" can't be one
    // expression: v0 (the scene panel) is on unless explicitly "0"; v1
    // (hotspots) is off unless explicitly "1". Flipping reads the effective
    // state first, or the first TOGGLE_V0 of a fresh browser would "turn on"
    // a panel that was already showing.
    let on = false;
    try {
      const cur = tog[1] === "0" ? localStorage.getItem(key) !== "0"
                                 : localStorage.getItem(key) === "1";
      on = !cur;
      localStorage.setItem(key, on ? "1" : "0");
    } catch (e) {}
    _term.print(`▦ v${tog[1]} ${tog[1] === "0" ? "scene panel" : "hotspots"}: ${on ? "ON" : "OFF"}`, "dim");
    if (typeof _updateScene === "function") _updateScene();
    return;
  }

  // TOGGLE FULL — unlocks THE FULL GAME on the splash. The full coast is built
  // and playable, but it is not what a new player should be handed first, so
  // the button ships disabled and this is the key to it. Same unsurfaced
  // treatment as the other toggles: no autocomplete, no HELP, not a cheat.
  if (/^toggle[_ ]?full$/.test(v)) {
    let on = false;
    try {
      on = localStorage.getItem("lbb_full_on") !== "1";
      localStorage.setItem("lbb_full_on", on ? "1" : "0");
    } catch (e) {}
    _applyFullGate();
    _term.print(`▦ THE FULL GAME on the start menu: ${on ? "UNLOCKED" : "locked"}` +
      (on ? " — RESET (or finish this night) to see the menu." : ""), "dim");
    return;
  }

  // FONT / TEXT SIZE cycles the reading size — same unsurfaced treatment as the
  // display toggles (no autocomplete, no HELP): the Aa button is the surface,
  // this is the keyboard path.
  if (/^(font( size)?|text ?size)$/.test(v)) { _cycleFontSize(); return; }

  // RESET wipes the save — a destructive one-way door, so it takes a confirmation.
  if (_awaitingReset) {
    _awaitingReset = false;
    if (["reset", "yes", "y", "confirm", "wipe"].includes(v)) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      _prevSnap = null; // the wipe isn't undoable — the confirm was the safety net
      _term.print("⌫ Slate wiped — the debts, the dog, the girls' patience, all of it.", "alert");
      _showStartMenu();
      return;
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

  // ── THE BATON ────────────────────────────────────────────────────────────
  // Hand this character to the macro game and take it back. exportBaton and
  // importBaton have been in engine-core since the contract was agreed with
  // NOTHING calling them — no verb, no button, no storage path — so a baton
  // had nowhere to go and the only thing that ever completed the round trip
  // was a vm test. This is the entry point.
  //
  // It travels as a FILE, because the two games are not same-origin and cannot
  // share localStorage. If they are ever hosted together, a shared key beats
  // this and should replace it.
  //
  // Split the usual way: the engine ruled on whether the handover is legal and
  // printed what is in it, and the frontend writes the bytes. Same division as
  // SHARE below.
  if (v === "handover" || v === "baton") {
    _prevSnap = serializeGame();
    // Grab the baton BEFORE dispatch. doCommand ticks, and a tick can arm an
    // encounter — which makes batonReady() refuse, so exporting afterwards
    // returned null and the file silently never wrote while the engine had
    // already printed "HANDING OVER". Same ordering as SHARE below, and for the
    // same reason: the engine's output should land after the frontend has
    // already got what it needs.
    const b = (typeof exportBaton === "function") ? exportBaton() : null;
    doCommand(cmd);                       // the engine prints, and rules
    if (b) {
      try {
        const name = `baht-bus-baton-day${b.day || 0}.json`;
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(b, null, 1)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url; a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        _term.print(`(Saved as ${name} — hand that file to the other game.)`, "dim");
      } catch (e) {
        _term.print("(Couldn't write the file — your browser blocked the download.)", "alert");
      }
    }
    _autosave();
    return;
  }
  // Taking one back. A file picker is the one thing the engine genuinely cannot
  // do, so this never reaches doCommand on a wired frontend.
  if (v === "resume") {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json";
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        let parsed;
        try { parsed = JSON.parse(rd.result); }
        catch { _term.print("(That isn't a baton — it isn't even JSON.)", "alert"); return; }
        _prevSnap = serializeGame();      // so UNDO can walk back out of it
        const r = importBaton(parsed);
        if (!r.ok) { _term.print(`(Not a baton this game can take: ${r.why}.)`, "alert"); return; }
        _term.print("── CHARACTER TAKEN BACK ──", "win");
        _describeRoom(true);
        if (typeof _renderResume === "function") _renderResume();
        _autosave();
        _audioForRoom(G.room, G.flags);
        _updateFabs();
      };
      rd.readAsText(f);
    };
    inp.click();
    _term.print("(Pick the baton file the other game gave you.)", "dim");
    return;
  }

  // SHARE: the engine prints the week card; the frontend also drops it on the
  // clipboard (presentation concern — the engine stays clipboard-free). Copy is
  // attempted before dispatch so the "(copied)" note lands after the card.
  const sharing = v === "share" && typeof G !== "undefined" && G && G.mode === "soi6" &&
    typeof _shareCard === "function";
  if (sharing && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(_shareCard().join("\n"))
      .then(() => _term.print("(Week card copied to the clipboard — paste it anywhere.)", "dim"))
      .catch(() => {}); // clipboard permission denied (file:// etc.) — the printed card still copies by hand
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

  _applyFontSize();
  document.getElementById("font-fab").addEventListener("click", () => _cycleFontSize());
  _splashInit();

  const muteBtn = document.getElementById("mute-btn");
  muteBtn.textContent = _audio.muted() ? "🔇" : "🔊";
  muteBtn.addEventListener("click", () => {
    muteBtn.textContent = _audio.toggleMute() ? "🔇" : "🔊";
    if (!_audio.muted()) _audioForRoom(G.room, G.flags);
  });

  // start-menu wiring: pick a mode → intro panel → START
  document.querySelectorAll("#start-menu .start-mode[data-mode]").forEach(b =>
    b.addEventListener("click", () => {
      // the Soi 6 intro panel is Soi-6-specific ("SOI 6 · ONE WEEK"), so the
      // full game must not be routed through it
      if (b.dataset.mode === "full") { _startFull(); return; }
      document.getElementById("start-menu").hidden = true;
      document.getElementById("start-intro").hidden = false;
    }));
  _applyFullGate();
  document.getElementById("start-back").addEventListener("click", () => {
    document.getElementById("start-intro").hidden = true;
    document.getElementById("start-menu").hidden = false;
  });
  document.getElementById("start-go").addEventListener("click", () => _startGame(false));
  const dailyBtn = document.getElementById("start-daily");
  if (dailyBtn) dailyBtn.addEventListener("click", () => _startGame(true));

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
    _showStartMenu(); // fresh start → mode select + intro modal
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
