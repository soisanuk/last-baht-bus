# v0 Scene Panel — Implementation Spec

Hand-off spec for implementing the v0 scene panel from `docs/2d-roadmap.md`.
Everything is decided here; where this spec and reality disagree, **stop and say
so** rather than improvising. Visual target: `docs/img/2d-v0-mock.png` (the
backdrops in that mock are placeholders — v0 ships with no art files at all and
must look clean that way).

## Mission

A presentation-only panel above the existing scrollback showing: room art slot →
cast row (portrait busts) → HUD (money/clock/day/meters) → exit buttons. It reads
engine globals after every command and owns no state. The game must behave
byte-identically through the parser, saves, UNDO, and all existing tests.

## Hard rails — violating any of these fails the task

1. **Do not edit** `engine-*.js`, `world.js`, `games.js`, `thai.js`, `audio.js`,
   `tts.js`, or any vendored file (`data.js`, `examples.js`, `tokeniser.js`,
   `thai-script.js`, `wordcard.js`). Run `git diff --stat` at the end and confirm
   only the files in "Files touched" changed.
2. No game logic in the panel: scene.js **reads** globals (`G`, `_room`,
   `_npcsHere`, …), never writes `G`, never calls `_do*`/`doCommand` directly.
3. Every tap submits a **typed command** through term.js (the tap-echo
   invariant) — exits/venues via the new `_term.submitCmd`, busts via the
   existing flyout (`_term.openFly`), which already submits typed commands.
4. No build step, no npm deps, no fetch. Classic script, works from `file://`.
5. No state in `G`; the panel's only persistence is one localStorage UI pref
   (see §scene.js — allowed because it is a display preference, not game state;
   game persistence stays in main.js).
6. Defensive reads everywhere, in `_updateFabs`'s exact style: `typeof X ===
   "function"` / `try/catch` — the panel must never throw, including pre-boot.
7. All new DOM lives under `#scene`; do not touch `#term-out`'s render path,
   `decorate()`, or `_addAvatars` (term.test.js asserts exact decorate output).

## Files touched (exhaustive)

| File | Change |
|---|---|
| `web/index.html` | mount div, CSS block, one script tag |
| `web/js/term.js` | extend the export object; add 2 guarded one-line hooks |
| `web/js/scene.js` | **new** — the whole panel |
| `tests/e2e/scene.spec.mjs` | **new** — E2E coverage |
| `docs/2d-roadmap.md` | tick the decision log (one line: v0 shipped) |

## 1. index.html

**Mount** — insert immediately before `<div id="term-out"></div>` (~line 662):

```html
<div id="scene" hidden></div>
```

**Script tag** — between term.js and main.js (~line 744/745; order is load-order):

```html
<script src="js/term.js"></script>
<script src="js/scene.js"></script>
<script src="js/main.js"></script>
```

**CSS** — append inside the existing `<style>`. Reuse the `:root` palette vars
(`--bg --text --bright --pink --cyan --green`); no new colors beyond these plus
the neutrals used below:

```css
/* ── v0 scene panel (presentation only; scene.js owns the DOM) ── */
#scene { border-bottom: 1px solid #241145; }
#scene-art { position: relative; }
#scene-art img { display: block; width: 100%; max-height: 210px; object-fit: cover; }
#scene-art .overlay-rain { position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(115deg, transparent 0 7px, #9fc4ff22 7px 9px); }
#scene-art .overlay-dark { position: absolute; inset: 0; pointer-events: none;
  background: #05001aa8; }
#scene-art .overlay-bell { position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 34px 10px #ffb84d55; }
#scene-cast { display: flex; gap: 10px; padding: 10px 12px 6px; overflow-x: auto; }
#scene-cast .bust { flex: 0 0 auto; width: 56px; text-align: center; cursor: pointer;
  background: none; border: none; padding: 0; font: inherit; }
#scene-cast .bust img { width: 52px; height: 52px; object-fit: cover; border-radius: 9px;
  border: 1px solid #ff149366; background: #140a2e; }
#scene-cast .bust span { display: block; font-size: 9px; color: #9a86b8; margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#scene-hud { display: flex; align-items: center; gap: 7px; padding: 7px 14px;
  font-size: 11px; color: var(--text); }
#scene-hud b { color: var(--green); }
#scene-hud .sep { color: #9a86b8; }
#scene-hud .grow { flex: 1; }
#scene-hud .m { display: flex; align-items: center; gap: 3px; font-size: 10px; }
#scene-hud .bar { display: inline-block; width: 22px; height: 5px; background: #1c0f3a;
  border-radius: 3px; overflow: hidden; }
#scene-hud .bar i { display: block; height: 100%; }
#scene-exits { display: flex; gap: 8px; padding: 2px 12px 11px; overflow-x: auto; }
#scene-exits button { flex: 0 0 auto; font: inherit; font-size: 11px; color: var(--cyan);
  background: #0a0530; border: 1px solid #00e5ff55; border-radius: 7px; padding: 4px 14px;
  cursor: pointer; }
#scene-toggle { position: absolute; top: 6px; right: 8px; z-index: 5; font: inherit;
  font-size: 11px; color: #9a86b8; background: #05001ad9; border: 1px solid #24114588;
  border-radius: 5px; padding: 1px 8px; cursor: pointer; }
#scene.collapsed #scene-art, #scene.collapsed #scene-cast { display: none; }
```

## 2. term.js — three small edits

**(a) Export extension.** The module currently ends (~line 644):

```js
return { init, print, decorate, kwActions: _kwActions, renderChips: _renderChips, picFor: _picFor };
```

Change to:

```js
return { init, print, decorate, kwActions: _kwActions, renderChips: _renderChips, picFor: _picFor,
  // v0 scene panel (scene.js): reuse the bust builder + character wheel, and
  // submit a typed command exactly as a chip tap would (tap-echo invariant).
  avatar: _avatar, openFly: _openFly,
  submitCmd: (cmd) => { if (!_onCmd) return; _input.value = cmd; submit(_onCmd); } };
```

**(b) Per-command hook.** In `submit()` (~line 541), directly after the existing
`_updateFabs();` line, add:

```js
    if (typeof _updateScene === "function") _updateScene(); // v0 scene panel
```

**(c) Boot hook.** At the boot-time `_updateFabs();` call (~line 640, the one
commented "in case we boot straight into a bar…"), add the same guarded line
directly after it.

These hooks are the panel's *only* triggers. UNDO and the continue-prompt both
flow through `submit()`, so no further wiring is needed — do not add hooks in
main.js.

## 3. web/js/scene.js — new file (reference implementation)

Use this as the reference; keep the structure and every guard. Header comment
required (every file in the repo says what it holds).

```js
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
    b.className = "bust";
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
```

## 4. tests/e2e/scene.spec.mjs — new file

```js
// The v0 scene panel is pure presentation, unreachable from the vm suite — this
// spec is its DOM canary: the panel renders from live G, tracks a move, taps
// submit real typed commands, and the collapse pref sticks. file:// + headless
// Chromium; globals are lexical, so page.evaluate reads G as a bare name.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("scene panel renders, tracks movement, and exit taps submit typed commands", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  await expect(page.locator("#scene")).toBeVisible();
  // cast row mirrors who's actually present
  const expected = await page.evaluate(() => _npcsHere().length + _patronsHere().length);
  await expect(page.locator("#scene-cast .bust")).toHaveCount(expected);
  // HUD shows live money (format the expectation in-page so the locale matches)
  const moneyStr = await page.evaluate(() => "฿" + (G.money || 0).toLocaleString());
  await expect(page.locator("#scene-hud")).toContainText(moneyStr);

  // an exit tap echoes as a typed command and moves the player
  const before = await page.evaluate(() => G.room);
  await page.locator("#scene-exits button").first().click();
  await expect(async () => {
    expect(await page.evaluate(() => G.room)).not.toBe(before);
  }).toPass();
  // the tap went through the transcript (tap-echo invariant)
  await expect(page.locator("#term-out .t-echo").last()).toContainText(/^go /);

  // a bust tap opens the character wheel with a portrait header
  await page.locator("#scene-cast .bust").first().click();
  await expect(page.locator("#flyout")).toBeVisible();
  await page.keyboard.press("Escape");

  // collapse pref sticks across the toggle
  await page.locator("#scene-toggle").click();
  await expect(page.locator("#scene.collapsed")).toHaveCount(1);

  expect(pageErrors).toEqual([]);
});
```

Adjust selectors only if reality differs (e.g. the echo line's class, the
flyout's dismiss gesture) — verify against term.js/index.html, don't guess.

## 5. Decided edge cases (no discretion)

1. **Pre-boot / start overlay / no save**: `G` undefined or roomless → panel
   `hidden`. It appears on the first `_updateScene` after a real command.
2. **No art (the v0 norm)**: both art requests 404 → the art row removes
   itself; cast/HUD/exits stand alone. Never a broken-image icon.
3. **Modal states** (`G.game`, `pendingEnc`, `pendingBf`, `pendingChoice`,
   `pendingFare`): panel keeps rendering the room normally; the scrollback owns
   modals in v0. Exit taps during a modal are swallowed by the engine's gates
   exactly like typed commands — correct, no special-casing.
4. **Soi 6 challenge mode**: nothing special — the engine's own refusals answer
   fenced moves; the panel never filters.
5. **Hotel rooms / roomless "Here"**: `_npcsHere()` empty → empty cast row is
   fine (it renders zero busts, no placeholder).
6. **German mode**: only `_L("DAY")`; exits/venues/commands stay English by
   design (Latin-script UX keeps taps; command tokens are never translated).
7. **Anonymous staff** (lowercase names, e.g. "security"): appear in the cast
   row like anyone else; the wheel already handles them.
8. **XSS hygiene**: anything interpolated into innerHTML is escaped (see
   `esc()`); bust labels use `textContent`.
9. **Performance**: full row rebuild per command is accepted (≤ a dozen nodes);
   no diffing, no memoization.

## 6. Acceptance checklist — run all, in order

```sh
node --test                      # all pass (698 at spec time), zero failures
npx playwright test              # all pass (15 existing + the new scene spec)
git diff --stat                  # ONLY: index.html, term.js, scene.js, scene.spec.mjs, 2d-roadmap.md
node tools/probe.mjs 'sandbox(); run("look"); show()'   # engine untouched: output identical to main
```

Manual (open `web/index.html` from `file://`):
- Boot → continue → panel visible above scrollback, no art, no broken images.
- Walk into a bar: busts appear; tap one → the same wheel a prose tap gives.
- Tap an exit: the command echoes in the scrollback and the room changes.
- `ring bell` in a bar: warm glow overlay only if room art exists (skip if artless).
- UNDO: panel matches the rewound room.
- Toggle collapse, reload: pref persisted, game save untouched.

## 7. Out of scope — do NOT build any of this

Hotspots on art; any art generation; the event layer; speaker attribution;
desktop two-column layout; long-press on busts; a happy/สนุก readout; changes to
chips, FABs, autocomplete, or any engine file. If something here seems needed to
finish, stop and report instead.
