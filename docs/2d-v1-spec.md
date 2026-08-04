# v1 Hotspots — Implementation Spec

Hand-off spec for the v1 stage of `docs/2d-roadmap.md`: tappable regions on the
room backdrops. Everything is decided here; where this spec and reality disagree,
**stop and report** rather than improvising. Prerequisites already shipped: the
v0 scene panel (`web/js/scene.js`), Phase R/H room art (`web/art/`), and the
gate verb — `TOGGLE_V1` already stores `lbb_v1_on` (main.js `_dispatch`).

## Mission

When both toggles are on, bespoke room art grows invisible tap regions over the
painted objects — the bell on the wall submits `ring bell`, the dartboard
`play darts`, the stairs `go up`. Hotspots are **presentation only**: every tap
submits a typed command through `_term.submitCmd` (tap-echo invariant — the
transcript, autosave, UNDO, and the parser's own refusals all behave as if the
player typed it). Nothing a hotspot offers is new — the parser, chips, and
wheel already offer everything; hotspots are a third skin over the same verbs.

## Hard rails — violating any fails the task

1. **No engine or world edits.** `engine-*.js`, `world.js`, `games.js`, and all
   vendored files are untouchable. Hotspot data does NOT go into `ROOMS`
   (coordinates are image metadata, not world data — see §data).
2. **Presentation state never enters `G`**; the only pref is the existing
   `lbb_v1_on` localStorage key. The vm suite must not know v1 exists.
3. **Taps echo typed commands** via `_term.submitCmd(cmd)` — never call `_do*`
   or `doCommand` directly from the panel.
4. **Static hotspots only**: a hotspot may point only at something *painted in
   the art* (bell, dartboard, door, TV, fridge, pool table). Dynamic entities —
   NPCs, the saleng cart, the dog — are the cast row's and prose's job; the
   no-people art rule means they are never in the image. No `when`-conditions,
   no engine-state reads in hotspot data.
5. **Bespoke room art only** (`rooms/<id>` art keys). Region fallback images are
   shared by many rooms, so a painted door means a different exit in each — a
   hotspot on region art is a bug by construction. If the region image loaded
   (or no art), render no hotspots.
6. No build step, no fetch (file:// must keep working): hotspot data is a
   classic script, not JSON.
7. `git diff --stat` at the end shows ONLY the files in §files.

## Files touched (exhaustive)

| File | Change |
|---|---|
| `web/js/scene-hotspots.js` | **new** — the data: `SCENE_HOTSPOTS` |
| `web/js/scene.js` | render hotspots inside `_sceneArt`; author mode |
| `web/index.html` | one script tag (before scene.js) + hotspot CSS |
| `web/js/main.js` | one line: drop TOGGLE_V1's "(wired for when v1 lands…)" suffix |
| `tests/js/hotspots.test.js` | **new** — integrity + promise checks |
| `tests/e2e/hotspots.spec.mjs` | **new** — DOM canary |
| `docs/2d-roadmap.md` | one decision-log line: v1 shipped |

## The data — `web/js/scene-hotspots.js` (new classic script)

```js
// v1 hotspots (docs/2d-v1-spec.md): tap regions over the painted objects in
// BESPOKE room art. Keyed by the art key scene.js computes ("rooms/<roomId>" —
// never "regions/<slug>": region images are shared across rooms, so a painted
// door would mean a different exit in each). Coordinates are PERCENT OF THE
// IMAGE (not the container) — they survive responsive scaling because scene.js
// maps them through the object-fit:cover transform. cmd is a typed command the
// parser answers (a contextual refusal is fine; a "didn't understand" is a
// broken promise — tests/js/hotspots.test.js enforces it). label is the hover/
// pulse caption, run through _L for the German build.
const SCENE_HOTSPOTS = {
  "rooms/queen_vic": [
    { box: [78, 22, 14, 26], cmd: "play darts", label: "the dartboard" },
    { box: [4, 10, 22, 42],  cmd: "watch soi",  label: "the window" },
    { box: [60, 46, 12, 20], cmd: "buy beer",   label: "the pumps" },
    // author against the real render — the coords above are placeholders
  ],
  // …ruby_kiss, the other Soi 6 pocket bars, qv_room (TV/fridge/balcony)…
};
```

Load order in index.html: **before scene.js** (data before consumer; both are
DOM-free at load). Content scope for this task: author real hotspots for the
**Soi 6 pocket's bespoke-art rooms** (the 7 bars + queen_vic + qv_room), 2–6
per room, only where a painted object maps cleanly to a real command. Fewer is
fine; forced hotspots are worse than none. Author with the author mode (§below),
against the actual shipped renders.

## Rendering (extend `_sceneArt` in scene.js)

1. Gate: `lbb_v1_on === "1"` (localStorage, try/catch) — else render nothing.
   (v0's own gate already guarantees the panel only exists when `lbb_v0_on`.)
2. Attach only when the **room** image actually loaded: on the img's `load`
   event, check `img.currentSrc` ends with the `rooms/<id>.png` key being
   rendered. The fallback chain (region image, or row removed) → no hotspots.
3. **The cover-transform math** (the part that must not be improvised).
   `object-fit: cover` scales the image to fill the container and crops the
   overflow, so percent-of-image ≠ percent-of-container:

   ```js
   // cw/ch = container box; iw/ih = img.naturalWidth/Height; box = [x,y,w,h] in % of image
   const s = Math.max(cw / iw, ch / ih);          // cover scale
   const offX = (cw - iw * s) / 2, offY = (ch - ih * s) / 2;   // crop offsets (≤ 0)
   const px = { left: offX + (x / 100) * iw * s, top: offY + (y / 100) * ih * s,
                width: (w / 100) * iw * s,       height: (h / 100) * ih * s };
   ```

   Position each hotspot as an absolutely-placed `<button class="hotspot">`
   inside `#scene-art` using those pixel values. Recompute on the img `load`
   event and on window `resize` (debounce ~150 ms). A hotspot whose box falls
   entirely in the cropped-off margin (fully outside the container) is simply
   not rendered.
4. Tap → `_term.submitCmd(h.cmd)`. Label (`_L(h.label)`) renders in a small
   caption chip on hover/focus (desktop) — and once per room-arrival, pulse all
   hotspot outlines for ~1.2 s so touch players learn the art is alive
   (CSS animation; keyed off the render, no state anywhere).
5. Accessibility: they're `<button>`s — `aria-label` = the label; keyboard
   focusable for free.

**CSS** (append to index.html's style, palette vars only):

```css
.hotspot { position: absolute; background: none; border: 1px solid transparent;
  border-radius: 8px; cursor: pointer; padding: 0; }
.hotspot:hover, .hotspot:focus-visible { border-color: #00e5ff88;
  box-shadow: 0 0 12px #00e5ff33 inset; }
.hotspot .hs-label { position: absolute; left: 50%; bottom: 100%;
  transform: translateX(-50%); margin-bottom: 4px; padding: 1px 8px;
  font-size: 10px; color: var(--cyan); background: #05001ad9;
  border: 1px solid #00e5ff44; border-radius: 5px; white-space: nowrap;
  opacity: 0; pointer-events: none; transition: opacity .15s; }
.hotspot:hover .hs-label, .hotspot:focus-visible .hs-label,
#scene-art.hs-pulse .hotspot { opacity: 1; }
#scene-art.hs-pulse .hotspot { border-color: #00e5ff66; }
```

(`hs-pulse` is added on render and removed after ~1.2 s via setTimeout —
presentation-local, no persistence. Show labels during the pulse too.)

## Author mode (how coordinates get written)

When `localStorage.lbb_v1_author === "1"` (set it by hand in devtools — no verb;
this is a workbench, not a feature): clicks on `#scene-art` log the
percent-of-image coordinates of the click point AND, on drag, a ready-to-paste
entry stub to the console:

```
[hotspot] rooms/queen_vic  box: [61.2, 44.8, 13.5, 21.0]
{ box: [61.2, 44.8, 13.5, 21.0], cmd: "", label: "" },
```

Invert the same cover transform (container px → image %). ~20 lines inside the
hotspot module; guard so author-mode clicks don't also fire hotspot commands.

## Tests

**`tests/js/hotspots.test.js`** — vm-loads world.js + the engine (loader block
from `soak.test.js`), plus evaluates `web/js/scene-hotspots.js` source in the
same realm. Assert:

- every `SCENE_HOTSPOTS` key matches `rooms/<id>` where `<id>` is a real
  `ROOMS` id AND `web/art/rooms/<id>.png` exists (orphan doctrine, like
  art.test.js — a renamed room or re-rendered-away image fails loudly)
- **no `regions/` keys** (rail 5, enforced)
- every `box` is 4 finite numbers, 0 ≤ x,y ≤ 100, w,h > 0, x+w ≤ 100, y+h ≤ 100
- every `cmd`, run in the promise-lint sandbox (fresh vacation state in the
  hotspot's own room: `G.room = <id>`), does NOT land in the parser's
  last-resort (`_HUH` membership check — copy the promise-lint's mechanism).
  In-room context means even contextual verbs must at least voice a refusal.
- every `label` is a non-empty string ≤ 30 chars

**`tests/e2e/hotspots.spec.mjs`** — boot via `bootIntoGame`, then:

- enable both layers in-page (`localStorage lbb_v0_on/lbb_v1_on = "1"`,
  `_updateScene()`); force `G.room = "queen_vic"` and `_updateScene()`
- assert `.hotspot` buttons render inside `#scene-art` (count > 0) only after
  the room image load — wait for `#scene-art img` and its `load`
- click one hotspot → its command echoes in `#term-out .t-echo` (`❯ `-prefixed)
- toggle `lbb_v1_on` off + `_updateScene()` → zero `.hotspot` elements
- no page errors throughout

## Acceptance checklist

```sh
node --test                # green, incl. the new hotspots integrity file
npx playwright test        # green (existing 17 + the new spec)
git diff --stat            # ONLY the §files list
node tools/probe.mjs 'sandbox(); run("look"); show()'   # engine untouched
```

Manual: `file://` boot → `toggle_v0`, `toggle_v1` → walk to the Queen Vic →
hotspots pulse once with labels, hover outlines work, a tap echoes its command;
walk to a region-fallback room → art shows, zero hotspots; `toggle_v1` off →
panel stays, hotspots gone.

## Out of scope — do NOT build

Character/NPC hotspots (no people in art; the cast row owns characters);
hotspots on region images; conditional/state-driven hotspots; any new commands
(if a painted object has no existing verb, skip it — do not add engine verbs);
an in-game hotspot editor beyond the console author mode; moving modal prompts
into the panel (v2); art regeneration. If something here seems necessary to
finish, stop and report instead.
