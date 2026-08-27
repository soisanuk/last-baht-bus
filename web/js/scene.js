// v0 scene panel (docs/2d-roadmap.md, spec docs/2d-v0-spec.md): a presentation-
// only layer above the scrollback — room art slot, cast busts, HUD, exit buttons.
// Reads engine globals after each command (hooked from term.js submit()/boot);
// owns no game state, submits taps as typed commands via _term. The one piece of
// persistence is the collapse preference — a DISPLAY pref, deliberately not in G
// (game persistence stays in main.js; presentation never enters the save).
// v1 hotspots (docs/2d-v1-spec.md) extend _sceneArt below: invisible tap regions
// over painted objects in bespoke room art, data in the sidecar web/js/scene-
// hotspots.js (SCENE_HOTSPOTS), gated on localStorage.lbb_v1_on. Also DOM-free
// at load, also presentation-only, also taps-as-typed-commands.
/* global G, ROOMS, NPCS, PATRONS, _room, _npcsHere, _patronsHere, _npcLabel,
   _patronLabel, _clockStr, _isDarkHere, _bellActive, _barName, _L, _term,
   SCENE_HOTSPOTS */

function _updateScene() {
  const box = document.getElementById("scene");
  if (!box) return;
  try {
    // The hidden-verb gate (TOGGLE_V0, intercepted in main.js). The scene panel
    // is now ON by default — the art track has caught up with the rooms, so the
    // backdrop is the game's normal face and the switch is for turning it OFF.
    // Absent pref means on; only an explicit "0" hides it. (v1 hotspots still
    // gate on "lbb_v1_on" the same way, default off, on top of this.)
    let on = true;
    try { on = localStorage.getItem("lbb_v0_on") !== "0"; } catch (e) {}
    if (!on) { box.hidden = true; return; }
    if (typeof G === "undefined" || !G || !G.room || !ROOMS[G.room]) {
      box.hidden = true; return;
    }
    box.hidden = false;
    // Collapsed = art + cast hidden, HUD + exits kept. An explicit pref wins;
    // with none, a PHONE boots collapsed — measured on a 390×844 viewport the
    // open panel left the transcript 38% of the screen (~6 lines), and six
    // blind rounds never found the fold (2026-08-22). Desktop stays open.
    const off = (() => {
      try {
        const pref = localStorage.getItem("lbb_scene_off");
        if (pref === "1") return true;
        if (pref === "0") return false;
      } catch (e) { /* no storage: fall through */ }
      return _sceneNarrow();
    })();
    box.classList.toggle("collapsed", off);
    box.innerHTML = "";
    box.style.position = "relative";

    // collapse toggle (display pref only) — labelled both ways so it can be found
    const tog = document.createElement("button");
    tog.id = "scene-toggle";
    tog.textContent = off ? "▸ scene" : "▾ hide scene";
    tog.title = off ? "show the room art and the cast" : "fold the panel away — more room for the story";
    tog.addEventListener("click", () => {
      try { localStorage.setItem("lbb_scene_off", off ? "0" : "1"); } catch (e) {}
      _updateScene();
    });

    if (!off) {
      box.appendChild(tog); // floats top-left over the art
      box.appendChild(_sceneArt());
      box.appendChild(_sceneCast());
    }
    box.appendChild(_sceneHud());
    const exits = _sceneExits();
    if (off) {
      // folded: the toggle is the first "button" on the exits rail (which already
      // scrolls sideways) instead of floating over the HUD — the HUD can't widen
      tog.classList.add("inline");
      exits.insertBefore(tog, exits.firstChild);
    }
    box.appendChild(exits);
    // One-time tip the first time the panel renders folded by default (phones):
    // six blind rounds never found the fold, so say it once. A display pref,
    // never game state; printed through the terminal like any presentation line.
    if (off && typeof _term !== "undefined" && _term && _term.print) {
      try {
        if (!localStorage.getItem("lbb_scene_tip")) {
          localStorage.setItem("lbb_scene_tip", "1");
          _term.print("(The scene panel is folded to leave room for the story — tap ▸ scene above to open it, ▾ to fold it again.)", "dim");
        }
      } catch (e) { /* no storage: no tip */ }
    }
  } catch (e) { box.hidden = true; }
}

// A phone-width screen (the same cut as the layout's narrow breakpoint). Width,
// not pointer — a phone in a desktop browser's device mode should fold the same.
function _sceneNarrow() {
  try { return window.matchMedia && window.matchMedia("(max-width: 767px)").matches; }
  catch (e) { return false; }
}

// Room backdrop, most specific first, hiding the row if nothing exists:
//   art/rooms/<id>.webp → .png → art/regions/<slug>.webp → .png → row hides.
//
// EXTENSION-AGNOSTIC ON PURPOSE (docs/art-production.md step 1). Scene art is
// currently all PNG at ~360 KB a file, against a 400 KB budget and 234 rooms —
// call it 85 MB at full coverage, in web/, deployed. WebP is the fix, and the
// portrait track already proved it wins by roughly 90x.
//
// Trying both extensions is what makes that migration incremental: a room can
// switch to WebP the day its file is generated, with no flag day, no manifest
// change and no coordination. It costs one extra 404 per room that has not
// migrated yet — cheap, and it shrinks to zero as the conversion lands.
function _sceneArt() {
  const div = document.createElement("div");
  div.id = "scene-art";
  const img = document.createElement("img");
  const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const chain = [
    "art/rooms/" + G.room + ".webp",
    "art/rooms/" + G.room + ".png",
    "art/regions/" + slug(_room().region) + ".webp",
    "art/regions/" + slug(_room().region) + ".png",
  ];
  let step = 0;
  img.onerror = () => {
    if (++step < chain.length) img.src = chain[step];
    else div.remove();
  };
  if (typeof _attachHotspots === "function") _attachHotspots(div, img, G.room); // v1 hotspots (no-op unless gated on)
  img.src = chain[0];
  div.appendChild(img);
  // ambient overlays — only meaningful over art; harmless when the row removes itself
  if (G.rain > 0) div.appendChild(_ov("overlay-rain"));
  if (typeof _isDarkHere === "function" && _isDarkHere()) div.appendChild(_ov("overlay-dark"));
  if (typeof _bellActive === "function" && _bellActive()) div.appendChild(_ov("overlay-bell"));
  return div;
}
function _ov(cls) { const d = document.createElement("div"); d.className = cls; return d; }

// ── v1 hotspots (docs/2d-v1-spec.md) ────────────────────────────────────────
// Tap regions over painted objects in BESPOKE room art only — the region
// fallback is shared by many rooms, so a painted door means a different exit
// in each; a hotspot there would be a bug by construction (rail 5). Gated on
// localStorage.lbb_v1_on, on top of v0's own lbb_v0_on gate (#scene already
// requires it to exist at all). Presentation only: taps go through
// _term.submitCmd (rail 3), exactly like an exit button.
let _hsResizeListener = null; // replaced (not stacked) per render — #scene-art
                              // is fully rebuilt every command (v0's accepted
                              // "full row rebuild" cost), so a stale listener
                              // from a previous render must not pile up.
let _hsPulseRoom = null;     // last room the arrival-pulse fired for — a plain
                              // module-local (like engine-parser's _lastCmd),
                              // never G/localStorage: "once per room-arrival"
                              // without smuggling presentation state into the save.

function _hotspotFlag(key) {
  try { return localStorage.getItem(key) === "1"; } catch (e) { return false; }
}

function _attachHotspots(div, img, roomId) {
  const hsOn = _hotspotFlag("lbb_v1_on");
  const authorOn = _hotspotFlag("lbb_v1_author");
  if (!hsOn && !authorOn) return;

  const key = "rooms/" + roomId;
  // Either extension — the room's OWN art, never the region fallback. This was
  // pinned to .png and went dead the moment the batch converted to WebP: the
  // chain above became extension-agnostic and this sibling check did not, so
  // every hotspot in the game silently stopped rendering.
  const isRealRoomImg = () => {
    try {
      const src = img.currentSrc || "";
      return src.endsWith("/" + key + ".webp") || src.endsWith("/" + key + ".png");
    } catch (e) { return false; }
  };

  const render = () => {
    div.querySelectorAll(".hotspot").forEach(n => n.remove());
    if (!hsOn || !isRealRoomImg()) return; // region art (or no art) → never hotspots
    const list = (typeof SCENE_HOTSPOTS !== "undefined" && SCENE_HOTSPOTS[key]) || [];
    if (!list.length) return;
    const cw = div.clientWidth, ch = div.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!cw || !ch || !iw || !ih) return;
    const s = Math.max(cw / iw, ch / ih); // object-fit: cover scale
    const offX = (cw - iw * s) / 2, offY = (ch - ih * s) / 2; // crop offsets (≤ 0)
    for (const h of list) {
      const [x, y, w, hgt] = h.box;
      const px = { left: offX + (x / 100) * iw * s, top: offY + (y / 100) * ih * s,
        width: (w / 100) * iw * s, height: (hgt / 100) * ih * s };
      // fully in the cropped-off margin → not rendered
      if (px.left + px.width <= 0 || px.top + px.height <= 0 || px.left >= cw || px.top >= ch) continue;
      const btn = document.createElement("button");
      btn.className = "hotspot";
      btn.style.left = px.left + "px"; btn.style.top = px.top + "px";
      btn.style.width = px.width + "px"; btn.style.height = px.height + "px";
      const label = _L(h.label);
      btn.setAttribute("aria-label", label);
      const lab = document.createElement("span");
      lab.className = "hs-label";
      lab.textContent = label;
      btn.appendChild(lab);
      btn.addEventListener("click", () => { if (!authorOn) _term.submitCmd(h.cmd); });
      div.appendChild(btn);
    }
    // pulse once per room-arrival so touch players learn the art is alive —
    // CSS animation (index.html), keyed off a room change, not a timer/G/save.
    if (_hsPulseRoom !== roomId) {
      _hsPulseRoom = roomId;
      div.classList.add("hs-pulse");
      setTimeout(() => div.classList.remove("hs-pulse"), 1200);
    }
  };

  if (img.complete && img.naturalWidth) render();
  img.addEventListener("load", render);
  if (_hsResizeListener) window.removeEventListener("resize", _hsResizeListener);
  let t = null;
  _hsResizeListener = () => { clearTimeout(t); t = setTimeout(render, 150); };
  window.addEventListener("resize", _hsResizeListener);

  if (authorOn) _armHotspotAuthor(div, img, key);
}

// Author mode (console workbench, no verb, no UI): localStorage.lbb_v1_author
// = "1". Click-drag on #scene-art logs the percent-of-image box (inverting the
// same cover transform) as a ready-to-paste SCENE_HOTSPOTS entry. Hotspot
// buttons still render (if lbb_v1_on is also set) so you can see what's placed
// already, but their click handler no-ops in author mode (see render() above)
// so an authoring click never also submits a command.
function _armHotspotAuthor(div, img, key) {
  let start = null;
  const toPct = e => {
    const cw = div.clientWidth, ch = div.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!cw || !ch || !iw || !ih) return null;
    const s = Math.max(cw / iw, ch / ih);
    const offX = (cw - iw * s) / 2, offY = (ch - ih * s) / 2;
    const rect = div.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) - offX) / s / iw * 100,
             y: ((e.clientY - rect.top) - offY) / s / ih * 100 };
  };
  div.addEventListener("mousedown", e => { start = toPct(e); });
  div.addEventListener("mouseup", e => {
    const end = toPct(e);
    if (!start || !end) return;
    const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
    const box = [x, y, w, h].map(n => Math.round(n * 10) / 10);
    console.log("[hotspot] " + key + "  box: [" + box.join(", ") + "]");
    console.log('{ box: [' + box.join(", ") + '], cmd: "", label: "" },');
    start = null;
  });
}

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
    `<b>฿${_num(G.money || 0)}</b><span class="sep">·</span>${esc(_clockStr())}` +
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
