// Boot: wire terminal ↔ engine ↔ TTS ↔ music; autosave, continue-prompt, undo.
// The engine stays storage-free — all persistence lives here.

const SAVE_KEY = "lbb_save";
// The night you set aside. Tapping "NO — start fresh" on the continue prompt is
// the highest-consequence tap in the product and the only unguarded one: on a
// 390px bar it sits directly beside the button the player actually wants, and
// for someone who reloads constantly that screen IS the main menu (mobile
// playtest, round 17). It never deleted anything immediately — _showStartMenu
// only calls newGame(), and the old blob dies when the next game autosaves over
// it — so there was already a recovery window and nothing used it. This keeps a
// copy in that window, which buys the safety without taxing every deliberate
// fresh start with a confirmation dialog.
const SHELF_KEY = "lbb_shelved";
// The rewind buffer, kept across a reload — and DROPPED at a night's end.
//
// Before this, finality was an accident of app lifecycle rather than a design
// choice: the buffer was a module-local, so a desktop player who never reloads
// could undo anything forever (a night ending, an ending, the Act One hard
// fail), while a phone player who reloads constantly could undo nothing. Same
// game, opposite rules, decided by whether the page happened to be torn down
// (persistence + mobile playtests, 2026-08-23/24).
//
// So: the buffer persists, and a NIGHT ENDING takes it. That makes the game's
// consequences final BY DECISION — which matters most for the Act One hard
// fail, since act1Best, act1Tries and the HINT unlock all exist because failure
// is real. Everything an undo is actually for (a mistyped tip, the wrong bar, a
// fumbled chip) survives a reload as it should. Same principle the mid-modal
// refusal already states in words: the soi doesn't rewind.
const UNDO_KEY = "lbb_undo";
let _prevSnap = null;         // one-level undo snapshot
let _undoSpent = false;       // …and whether it was USED, vs never having survived a reload
let _awaitingContinue = false;
let _awaitingReset = false;   // RESET arms a one-shot confirm before wiping the save

function _autosave() {
  try { localStorage.setItem(SAVE_KEY, serializeGame()); } catch (e) {}
}
// Starting a night lets the shelved one go — the offer is honest about this
// ("Starting a new one lets it go"), so the shelf must not outlive it and
// resurface days later attached to a game the player has moved on from.
function _saveUndo() {
  try {
    if (_prevSnap) localStorage.setItem(UNDO_KEY, JSON.stringify({ snap: _prevSnap, spent: _undoSpent }));
    else localStorage.setItem(UNDO_KEY, JSON.stringify({ snap: null, spent: _undoSpent }));
  } catch (e) {}
}
// A night ended (or the world was rebuilt): there is nothing behind you to
// return to. Cheap to call — this is the boundary, so it is stated once.
function _dropUndo() {
  _prevSnap = null;
  _undoSpent = false;
  try { localStorage.removeItem(UNDO_KEY); } catch (e) {}
}
function _loadUndo() {
  try {
    const raw = localStorage.getItem(UNDO_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    _prevSnap = o && o.snap ? o.snap : null;
    _undoSpent = !!(o && o.spent);
  } catch (e) {}
}

function _dropShelf() {
  try { localStorage.removeItem(SHELF_KEY); } catch (e) {}
}

// The mode-select / intro overlay shown on a fresh start (see index.html
// #start-overlay). Continuing a saved night bypasses it.
// Offer the shelved night back, once, on the menu the mis-tap lands on. Reads
// the same way the continue prompt does — mode, day, where — so the player
// recognises the night rather than being asked to trust a label.
function _shelvedLine() {
  let blob = null;
  try { blob = localStorage.getItem(SHELF_KEY); } catch (e) {}
  if (!blob) return null;
  try {
    const sv = JSON.parse(blob);
    const room = sv.room && typeof ROOMS !== "undefined" && ROOMS[sv.room]
      ? (ROOMS[sv.room].bar || ROOMS[sv.room].name) : null;
    const mode = sv.mode === "soi6" ? (sv.dailyId ? `the ${sv.dailyId} daily` : "a Soi 6 week")
      : sv.stage === "expat" ? "Pattaya, home" : "a vacation";
    return sv.day ? `${mode}, day ${sv.day}${room ? ", at " + room : ""}` : "a night";
  } catch (e) { return "a night"; }
}

// Wall-clock season anchor: the engine never reads a clock (shared-world rule 1),
// so the real calendar month is captured HERE at game creation and handed to the
// engine as G.season0. You arrive in the real current season — book a December
// trip, land in the peak; a September one, land in the monsoon — and the engine
// advances the months forward from G.day. It's a plain G field, so it persists
// in the save and a restore keeps the season you started; only a fresh game
// re-reads the calendar.
function _seedSeason() { if (typeof G !== "undefined" && G) G.season0 = new Date().getMonth(); }

function _showStartMenu() {
  // Fresh-start gateway (boot with no save, RESET, or continue→NO): clear any
  // in-memory state so a full RESET actually re-runs character creation (the taxi
  // intro), not just wipes the save. Without this, a lingering G.player.origin from
  // the session makes startSoi6Mode restore it and skip the intro straight to the
  // Queen Vic. (The automatic in-game resets — _act1Fail, new week — still keep
  // identity on purpose; this only affects the explicit fresh-start paths.)
  newGame();
  _seedSeason();
  const ov = document.getElementById("start-overlay");
  if (!ov) { engineIntro(); _autosave(); _term.renderChips(); return; } // safety net
  document.getElementById("start-menu").hidden = false;
  document.getElementById("start-intro").hidden = true;
  _applyFullGate();
  ov.hidden = false;
  const shelved = _shelvedLine();
  if (shelved) {
    _term.print(`(The night you just stepped away from — ${shelved} — is still here. ` +
      "UNSHELVE brings it back. Starting a new one lets it go.)", "dim");
  }
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
// The whole poster set, now ONE rendering register (Mario, 2026-08-17): all
// photoreal-painterly — soft airbrush, realistic skin, bokeh, no hard outlines —
// matching the in-world portrait art. The 18 that were the flat cel/illustration
// register (aof beam boom cherry dao fah fang gift ice mook nice noi orn praew
// sara toey view yada) were rerolled INTO the photoreal register, full-body
// composition kept (art agent, LBB dc96c27; root cause was gen_posters.py
// painting a "poster" graphic, now fixed). Verified the whole deck reads as one
// register against gib/aoi/nam. Splash opens; the 36 girls follow.
const _SPLASH_DECK = ["splash",
  "aof", "aoi", "aom", "beam", "boom", "bow", "cherry", "dao", "fah", "fang",
  "gib", "gift", "gigi", "ice", "jum", "mook", "nam", "namwan", "naree", "nice",
  "noey", "noi", "orn", "pancake", "pang", "ploen", "pop", "praew", "sai",
  "sara", "sasi", "toey", "tukta", "view", "yada", "yui"];
function _splashInit() {
  const wrap = document.getElementById("start-art-wrap");
  const overlay = document.getElementById("start-overlay");
  if (!wrap || !overlay) return;
  const layers = wrap.querySelectorAll("img");
  // The Pattaya-sign vista opens every load (branded first impression), shown
  // whole — it's landscape (1344x768 ≈ the frame's ratio), so it wears the
  // ".vista" class = object-fit:contain, no crop. After a 30s hold it hands off
  // to the girl carousel: the 36 portraits, random start, a new one every 10s,
  // cover-cropped top-biased. The splash never returns to the rotation.
  const girls = _SPLASH_DECK.filter(id => id !== "splash");
  let i = Math.floor(Math.random() * girls.length);
  let front = 0; // which layer is on top
  function swap(url, vista) {
    const inc = layers[1 - front], out = layers[front];
    inc.src = url;
    inc.classList.remove("lit", "dim");
    inc.classList.toggle("vista", !!vista); // uncropped for the splash, cropped for girls
    void inc.offsetWidth;              // restart the strike animation
    out.classList.remove("lit"); out.classList.add("dim");
    inc.classList.add("lit");
    front = 1 - front;
  }
  function advance(step, tries) {
    if (!girls.length) { wrap.remove(); return; }
    if ((tries || 0) >= girls.length) { wrap.remove(); return; }
    i = (i + step + girls.length) % girls.length;
    const id = girls[i];
    const pre = new Image();
    pre.onload = () => swap(pre.src, false);
    pre.onerror = () => { girls.splice(i, 1); if (i >= girls.length) i = 0; advance(0, (tries || 0) + 1); };
    pre.src = "art/posters/" + id + ".webp";
  }
  let carouselOn = false;
  function startCarousel() {
    if (carouselOn) return;
    carouselOn = true;
    advance(0, 0); // the first girl
    setInterval(() => { if (!overlay.hidden) advance(1, 0); }, 10000);
  }
  // open on the splash, uncropped; hand off to the carousel after 30s
  const pre = new Image();
  pre.onload = () => { swap(pre.src, true); setTimeout(startCarousel, 30000); };
  pre.onerror = startCarousel; // no splash art → straight to the girls
  pre.src = "art/posters/splash.webp";
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
  _dropShelf();          // starting a night lets the shelved one go, as offered
  _dropUndo();           // …and a new night has nothing behind it to rewind to
  newGame();
  _seedSeason();         // you arrive in the real current season
  engineIntro();
  _autosave();
  _term.renderChips();
  _audioForRoom(G.room, G.flags);
}

function _startGame(daily) { // START / TODAY'S SOI on the Soi 6 intro panel
  const ov = document.getElementById("start-overlay");
  if (ov) ov.hidden = true;
  _dropShelf();          // starting a night lets the shelved one go, as offered
  _dropUndo();           // …and a new night has nothing behind it to rewind to
  if (daily) {
    // Seed-of-the-day: the engine never reads a clock (shared-world rule 1),
    // so the DATE is computed here and handed in as a string — everyone who
    // presses TODAY'S SOI on the same calendar day gets the same week.
    const d = new Date().toISOString().slice(0, 10);
    startSoi6Mode({ seed: _dailySeed(d), dailyId: d });
  } else {
    startSoi6Mode();
  }
  _seedSeason();         // startSoi6Mode runs its own newGame; anchor the season after
  _autosave();
  _term.renderChips();
  _audioForRoom(G.room, G.flags);
}

function _dispatch(cmd) {
  const v = cmd.trim().toLowerCase();
  // the start menu is up: typed commands must not drive the skeleton game behind
  // it (replayer playtest 2026-08-22: "e" walked the hidden player to the beach road)
  const _ov = document.getElementById("start-overlay");
  // …but UNSHELVE is offered ON that menu, so it has to survive the gate — the
  // whole point is to take back the night from the screen the mis-tap landed on.
  if (_ov && !_ov.hidden && !_awaitingContinue && !/^toggle/.test(v) &&
      !/^(unshelve|unshelf|restore)$/.test(v)) {
    _term.print("(Pick a mode above to start.)", "dim");
    return;
  }

  if (_awaitingContinue) {
    if (["yes", "y", "continue"].includes(v)) {
      _awaitingContinue = false;
      let blob = null;
      try { blob = localStorage.getItem(SAVE_KEY); deserializeGame(blob); } catch (e) {}
      _term.print("Welcome back. Where were we…", "dim");
      // The redraw is presentation, but _describeRoom's pooled lines draw from
      // G.rng — so a reload mid-night silently moved the daily off its dice
      // (replayer playtest 2026-08-22). Redraw, then reload the blob: the game
      // state is exactly what was saved, whatever the redraw consumed.
      if (G.pendingChoice !== "intro") _describeRoom(true, true); // (still in Tan's sedan: no room to describe)
      _renderResume(); // redraw whatever modal prompt was gating input (game/encounter/checkout/fare/airline)
      try { if (blob) deserializeGame(blob); } catch (e) {}
    } else if (["no", "n", "new", "restart"].includes(v)) {
      _awaitingContinue = false;
      try {
        const blob = localStorage.getItem(SAVE_KEY);
        if (blob) localStorage.setItem(SHELF_KEY, blob);
      } catch (e) {}
      _showStartMenu();
      return;
    } else {
      _term.print("YES to continue your night, NO to start fresh.", "dim");
      return;
    }
    _audioForRoom(G.room, G.flags);
    return;
  }

  // Take back the night you stepped away from. Only reachable while the shelf
  // holds one — it is cleared the moment a new game autosaves over the save.
  if (v === "unshelve" || v === "unshelf" || v === "restore") {
    let blob = null;
    try { blob = localStorage.getItem(SHELF_KEY); } catch (e) {}
    if (!blob) {
      _term.print("There's no night set aside. (UNSHELVE only reaches the one you " +
        "stepped away from, and only before you've started another.)", "dim");
      return;
    }
    try { deserializeGame(blob); } catch (e) { _term.print("That night didn't survive. Sorry.", "alert"); return; }
    try { localStorage.removeItem(SHELF_KEY); } catch (e) {}
    const ov = document.getElementById("start-overlay");
    if (ov) ov.hidden = true;
    _awaitingContinue = false;
    _dropUndo();
    _term.print("── PICKED BACK UP ──", "win");
    _describeRoom(true);
    if (typeof _renderResume === "function") _renderResume();
    _autosave();
    _audioForRoom(G.room, G.flags);
    _term.renderChips();
    if (typeof _term.updateFabs === "function") _term.updateFabs();
    return;
  }

  if (v === "undo") {
    // Not inside a live game or a modal answer: rewinding a quiz question or a
    // dice roll hands you the answer, because the RNG stream is move-independent
    // — one wrong tap, UNDO, and the quiz is a guaranteed 5/5 (min-maxer
    // playtest 2026-08-22). QUIT concedes; that is the honest exit.
    if (typeof G !== "undefined" && G && (G.game || G.pendingBf || G.pendingEnc)) {
      _term.print("⌫ Not mid-hand. Play it out, or QUIT and take the loss — the soi doesn't " +
        "rewind, and neither does the box.", "dim");
      return;
    }
    if (_prevSnap) {
      const snap = _prevSnap;
      _undoSpent = true;
      deserializeGame(snap);
      _prevSnap = null;
      _term.print("⌫ Rewound one command.", "dim");
      _describeRoom(true, true); // restore / rewind: re-orient with the full desc
      _renderResume(); // rewound into a modal state — redraw its prompt (see engine _renderResume)
      deserializeGame(snap); // the redraw consumed dice; UNDO must not reroll (replayer playtest 2026-08-22)
      _saveUndo();           // spent — and a reload must not resurrect it
      _autosave();
    } else {
      // Three different states used to wear one sentence, and two of them were
      // lies. The buffer now outlives a reload, so the honest answers are: you
      // already used it, or a night ended behind you and there is nothing back
      // there to return to (mobile playtest, round 17).
      _term.print(_undoSpent
        ? "Already rewound — UNDO reaches back one command only."
        : "Nothing to rewind. A night ends where it ends: the soi doesn't rewind, " +
          "and neither does the morning.", "dim");
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
      _dropUndo();      // the wipe isn't undoable — the confirm was the safety net
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
      "(RESTART begins a fresh week from the taxi — the daily stays the daily; RESET wipes everything, records and all.)", "alert");
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
    _undoSpent = false;
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
        // RESET asks twice before destroying a save; RESUME destroyed one in
        // silence (persistence playtest 2026-08-23). Say what is about to be
        // overwritten, in the same breath as doing it — UNDO is the way back,
        // and the player has to know it exists BEFORE they type anything else.
        _prevSnap = serializeGame(); _undoSpent = false;   // so UNDO can walk back out of it
        const _hadGame = !!(G && G.day);
        const r = importBaton(parsed);
        if (!r.ok) { _term.print(`(Not a baton this game can take: ${r.why}.)`, "alert"); return; }
        _term.print("── CHARACTER TAKEN BACK ──", "win");
        if (_hadGame) _term.print("(This replaces the character that was in this browser. " +
          "UNDO puts them back — but only before you do anything else.)", "alert");
        _describeRoom(true);
        if (typeof _renderResume === "function") _renderResume();
        _autosave();
        _audioForRoom(G.room, G.flags);
        _term.updateFabs();   // not a bare global — it lives in term.js's closure
        _term.renderChips();  // …and the chip bar is the previous character's until we say so
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
  _undoSpent = false;
  // A night ending is the boundary the buffer does not cross. The engine can't
  // tell the frontend (it is storage-free and callback-only), so read it off the
  // world: _endNight advances the day, _act1Fail rebuilds it back to day 2, and
  // _newVacation resets it to 1 — every one of those is "the night you were in
  // is over", and every one shows up as the day not being the day it was.
  const _dayBefore = (typeof G !== "undefined" && G) ? G.day : null;
  doCommand(cmd);
  const _dayAfter = (typeof G !== "undefined" && G) ? G.day : null;
  if (_dayBefore !== null && _dayAfter !== null && _dayAfter !== _dayBefore) _dropUndo();
  _saveUndo();
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
  _loadUndo();          // the rewind buffer outlives the page now (see UNDO_KEY)
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
    // say WHAT was found — a returning player re-orients faster (replayer playtest 2026-08-22)
    let where = "";
    try {
      const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      const room = sv.room && typeof ROOMS !== "undefined" && ROOMS[sv.room] ? (ROOMS[sv.room].bar || ROOMS[sv.room].name) : null;
      const mode = sv.mode === "soi6" ? (sv.dailyId ? `the ${sv.dailyId} daily` : "a Soi 6 week") : sv.stage === "expat" ? "Pattaya, home" : "a vacation";
      if (sv.day) where = ` — ${mode}, day ${sv.day}${room ? ", at " + room : ""}`;
    } catch (e) {}
    _term.print("A night in progress was found on this device" + where + ".");
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
    // The splash (start menu) and the continue-prompt are both "not in the
    // game yet": title theme, not the room. Without the overlay check a fresh
    // boot's first click played jomtien_beach's surf under the start menu
    // (playtest, 2026-08-17). _startGame/_dispatch swap to the room track.
    const ov = document.getElementById("start-overlay");
    const onSplash = ov && !ov.hidden;
    if (!_awaitingContinue && !onSplash) _audioForRoom(G.room, G.flags);
    else _audio.music("bus"); // title music while the prompt / splash waits
  };
  document.addEventListener("pointerdown", startMusic);
  document.addEventListener("keydown", startMusic);
});
