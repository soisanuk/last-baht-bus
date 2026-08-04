// v0 scene panel (docs/2d-roadmap.md, spec docs/2d-v0-spec.md): a presentation-
// only layer above the scrollback — room art slot, cast busts, HUD, exit buttons.
// Reads engine globals after each command (hooked from term.js submit()/boot);
// owns no game state, submits taps as typed commands via _term. The one piece of
// persistence is the collapse preference — a DISPLAY pref, deliberately not in G
// (game persistence stays in main.js; presentation never enters the save).
/* global G, ROOMS, NPCS, PATRONS, _room, _npcsHere, _patronsHere, _npcLabel,
   _patronLabel, _clockStr, _isDarkHere, _bellActive, _barName, _L, _term */

function _updateScene() {
  const box = document.getElementById("scene");
  if (!box) return;
  try {
    // The hidden-verb gate (TOGGLE_V0, intercepted in main.js): the visual layer
    // is OFF by default — the panel renders only after the switch is thrown.
    // (v1 hotspots will gate on "lbb_v1_on" the same way, on top of this.)
    let on = false;
    try { on = localStorage.getItem("lbb_v0_on") === "1"; } catch (e) {}
    if (!on) { box.hidden = true; return; }
    if (typeof G === "undefined" || !G || !G.room || !ROOMS[G.room]) {
      box.hidden = true; return;
    }
    box.hidden = false;
    const off = (() => { try { return localStorage.getItem("lbb_scene_off") === "1"; }
      catch (e) { return false; } })();
    box.classList.toggle("collapsed", off);
    box.innerHTML = "";
    box.style.position = "relative";

    // collapse toggle (display pref only)
    const tog = document.createElement("button");
    tog.id = "scene-toggle";
    tog.textContent = off ? "▸ scene" : "▾";
    tog.addEventListener("click", () => {
      try { localStorage.setItem("lbb_scene_off", off ? "0" : "1"); } catch (e) {}
      _updateScene();
    });
    box.appendChild(tog);

    box.appendChild(_sceneArt());
    box.appendChild(_sceneCast());
    box.appendChild(_sceneHud());
    box.appendChild(_sceneExits());
  } catch (e) { box.hidden = true; }
}

// Room backdrop: art/rooms/<id>.png → art/regions/<slug>.png → row hides.
// No art ships with v0 — the whole chain 404s and the row stays empty by design.
function _sceneArt() {
  const div = document.createElement("div");
  div.id = "scene-art";
  const img = document.createElement("img");
  const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let triedRegion = false;
  img.onerror = () => {
    if (!triedRegion) { triedRegion = true; img.src = "art/regions/" + slug(_room().region) + ".png"; }
    else div.remove();
  };
  img.src = "art/rooms/" + G.room + ".png";
  div.appendChild(img);
  // ambient overlays — only meaningful over art; harmless when the row removes itself
  if (G.rain > 0) div.appendChild(_ov("overlay-rain"));
  if (typeof _isDarkHere === "function" && _isDarkHere()) div.appendChild(_ov("overlay-dark"));
  if (typeof _bellActive === "function" && _bellActive()) div.appendChild(_ov("overlay-bell"));
  return div;
}
function _ov(cls) { const d = document.createElement("div"); d.className = cls; return d; }

// Cast row: everyone present, as portrait busts. data-k/data-v carry the same
// contract decorate() emits, so _term.openFly serves the identical wheel
// (portrait header, live ask-topics) for a bust tap and a prose tap.
function _sceneCast() {
  const row = document.createElement("div");
  row.id = "scene-cast";
  const cast = [];
  try { for (const id of _npcsHere()) cast.push([id, "npc", NPCS[id]]); } catch (e) {}
  try { for (const id of _patronsHere()) cast.push([id, "patron", PATRONS[id]]); } catch (e) {}
  for (const [id, kind, who] of cast) {
    const b = document.createElement("button");
    // also tagged "kw": term.js's document-level dismiss-the-flyout listener
    // (init()'s `document.addEventListener("click", ...)`) only spares elements
    // matching `.closest(".kw")` — without it, the very click that opens the
    // wheel also reads as "clicked outside" and the flyout closes itself in the
    // same tick. decorate()'s own kw spans already carry this class; busts need
    // it too since they live outside #term-out. CSS specificity keeps the
    // label's own color/cursor rules (#scene-cast .bust span, #scene-cast .bust)
    // unaffected — this only affects the dismiss check.
    b.className = "bust kw";
    b.dataset.k = kind;
    b.dataset.v = who.name;               // _kwActions/_portraitId key on the display name
    b.appendChild(_term.avatar(id, ""));
    const lab = document.createElement("span");
    const label = kind === "npc" ? _npcLabel(id) : _patronLabel(id);
    lab.textContent = (who.emoji ? who.emoji + " " : "") + label;
    b.appendChild(lab);
    b.addEventListener("click", () => _term.openFly(b, false));
    row.appendChild(b);
  }
  return row;
}

// HUD: money · clock · day, then the DIAGNOSE meters. Numbers and icons only —
// the sole English word runs through _L for the German build (commands/venue
// tokens stay English by design; see the localization notes).
function _sceneHud() {
  const hud = document.createElement("div");
  hud.id = "scene-hud";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = typeof _L === "function" ? _L("DAY") : "DAY";
  const meter = (icon, pct, color) =>
    `<span class="m">${icon}<i class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></i></i></span>`;
  const lowGood = v => v < 50 ? "var(--green)" : v < 80 ? "#ffb84d" : "#ff5a5a";
  const drunkPct = Math.min(100, Math.round((G.soc.drunk || 0) / 9 * 100)); // blackout at 9
  const battColor = G.battery >= 50 ? "var(--green)" : G.battery >= 20 ? "#ffb84d" : "#ff5a5a";
  hud.innerHTML =
    `<b>฿${(G.money || 0).toLocaleString()}</b><span class="sep">·</span>${esc(_clockStr())}` +
    `<span class="sep">·</span>${esc(day)} ${G.day}<span class="grow"></span>` +
    meter("🍺", drunkPct, lowGood(drunkPct)) +
    meter("🍜", G.hunger || 0, lowGood(G.hunger || 0)) +
    meter("💧", G.thirst || 0, lowGood(G.thirst || 0)) +
    meter("🔋", G.battery || 0, battColor);
  return hud;
}

// Exits + this block's enterable venues. Taps submit typed commands — the same
// words the parser answers — via _term.submitCmd, so transcript/UNDO/autosave
// see an ordinary turn.
function _sceneExits() {
  const row = document.createElement("div");
  row.id = "scene-exits";
  const r = _room();
  for (const dir of Object.keys(r.exits || {})) {
    const b = document.createElement("button");
    b.textContent = dir.toUpperCase();
    b.addEventListener("click", () => _term.submitCmd("go " + dir));
    row.appendChild(b);
  }
  for (const vid of r.venues || []) {
    const name = typeof _barName === "function" && _barName(vid);
    if (!name) continue;
    const b = document.createElement("button");
    b.textContent = name;
    b.addEventListener("click", () => _term.submitCmd("enter " + name.toLowerCase()));
    row.appendChild(b);
  }
  return row;
}
