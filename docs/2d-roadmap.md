# The 2D Roadmap

The path from the text terminal to a 2D game, staged so every step ships something
playable and no step bets the engine. CLAUDE.md's "Designed for a future 2D
conversion" rules remain **the law** — this document is the plan that walks them.
Written 2026-08 against the post-Soi6-shakedown codebase; update the decision log
at the bottom as stages land.

## The one-line thesis

This is not a port. The engine is already frontend-agnostic (every action a `_do*`
function, one serializable `G`, options computed engine-side, a modal-state machine
with `_renderResume` as its redraw dispatcher) — so 2D is **a staged re-skin**:
first a visual layer *around* the prose, then hotspots, then (only if the appetite
is proven) real scenes. The prose is the product — the girls, the scams, the Nite
Owl voice. Every stage below stages the prose; none replaces it.

## Already in place (the part most projects have to build)

| Asset | Where | 2D use |
|---|---|---|
| Frontend-agnostic actions | `_do*` in engine-*.js | tap → function call, parser skipped |
| Engine-owned option surfaces | `_kwActions`, `_playOptions`, `_travelDests`, `_chipSet`… | "what can I tap here" is already computed |
| Modal-state machine | `pendingChoice`/`pendingEnc`/`G.game`/`pendingFare` + `_renderResume` | the screen stack |
| Pixel busts, whole cast | `web/portraits/` + `scripts/gen-portraits.py` | the cast row, dialogue portraits |
| Photo frames | `web/portraits/pics/` (SDXL via portrait_gen) | proof the art pipeline exists |
| Chiptune + SFX bus | `audio.js`, `_trackForRoom` (pure) | already room-aware |
| Deterministic core | `G.rng`, vm suite, save = one blob | replay, tests, saves all survive |
| Tap-echo invariant | taps submit typed commands | 2D input stays testable + UNDO-able |

## The stages

| Stage | What ships | Engine changes | Effort |
|---|---|---|---|
| **v0** | Scene panel above the terminal (illustrated IF) | **none** (2 one-line hooks in term.js) | days |
| **art** | `gen-scenes` backdrop pipeline (parallel track) | none | the long pole |
| **v1** | Hotspots on room art (point-and-click) | presentation fields on rooms (rule 3) | small |
| **v2** | Event layer (direction: who speaks, stingers, overlays) | the one real refactor (rule 5) | medium |
| **v3** | The fork: visual novel ⊕ top-down walkable | depends on fork | large |

---

## v0 — the scene panel (sketch + wiring)

A visual layer stacked above the existing scrollback, in the same no-build classic-
script stack. Reads `G` after each command; owns no state; degrades to nothing.
**Ships before a single backdrop is drawn** — the art slot hides gracefully.

### Layout (mobile-first, stacked above `#term-out` inside `#shell`)

```
┌──────────────────────────────────────┐
│ #scene                               │
│ ┌──────────────────────────────────┐ │
│ │ #scene-art                       │ │ ← art/rooms/<G.room>.png
│ │   (rain overlay · dark tint ·    │ │    onerror → art/regions/<region>.png
│ │    bell-glow edge)               │ │    onerror → panel row hides
│ └──────────────────────────────────┘ │
│ #scene-cast   [👤][👤][👤][👤]        │ ← busts, tap = character wheel
│ #scene-hud    ฿12,340 · 21:40 · D3   │ ← money · clock · day · meters
│               🍺▂▂▂ 🍜▂▂ 💧▂ 🔋87%    │
│ #scene-exits  [W] [E] [OUT] [Pink…]  │ ← tap = "go <dir>" via submit()
├──────────────────────────────────────┤
│ #term-out (existing scrollback)      │
│ #chips · #term-suggest · #input-row  │
└──────────────────────────────────────┘
```

Desktop: same DOM, CSS puts `#scene` in a right column beside the scrollback.
A collapse toggle (remembered in localStorage, main.js's department) keeps the
pure-text experience one tap away.

### Data flow — every element reads live engine state, renders, owns nothing

| Element | Source (read-only) | Notes |
|---|---|---|
| `#scene-art` | `G.room` → `web/art/rooms/<id>.png` | fallback chain: exact → `art/regions/<region-slug>.png` → hide row (the `_avatarSrc` onerror pattern) |
| rain overlay | `G.rain > 0` | mirrors `_describeRoom`'s re-announce rule |
| dark tint | `_isDarkHere()` (engine-core) | flashlight state rides it via `G.lightOn` |
| bell glow | `_bellActive()` | a warm edge while the room loves you |
| `#scene-cast` | `_npcsHere()` + `_patronsHere()` | bust = `portraits/<id>.png`; label via `_npcLabel`/`_patronLabel` (today these just return the name — the titles-until-met reveal was dropped per playtest — but they stay the single label seam, so if the reveal ever returns the panel follows for free) |
| `#scene-hud` | `G.money`, `_clockStr()`, `G.day`, `G.soc.drunk`, `G.hunger`, `G.thirst`, `G.battery`, `G.happy`/`_happyLevel` | the DIAGNOSE stats as meters |
| `#scene-exits` | `_room().exits` keys + `_room().venues` | venue chips use `_barName`; a closed venue may grey via `_closedNow` |

### Wiring (all frontend; the engine is not touched)

1. **New file `web/js/scene.js`** — classic script, loaded after `term.js`, before
   `main.js` (index.html load-order list). Defines one global, `_updateScene()`:
   read `G` + the helpers above, rebuild the four rows. DOM-free at load (mount
   lookup inside the function), so nothing runs before boot.
2. **Two one-line hooks in term.js** — exactly where `_updateFabs()` already
   runs: the end of `submit()` (term.js ~541) and the boot site (~640), each as
   `typeof _updateScene === "function" && _updateScene()`. UNDO and
   continue-restore already flow through these paths, so the panel can never go
   stale — same guarantee the FABs have.
3. **Expose two term utilities** — extend term.js's export
   (`return { init, print, decorate, kwActions, renderChips, picFor }`) with
   `avatar` (`_avatar`) and `openFly` (`_openFly`). scene.js consumes
   `_term.avatar(id)` for busts and wraps each bust as a synthetic kw element
   (`data-k="npc"|"patron"`, `data-v` as decorate() emits) so a bust tap calls
   `_term.openFly(el, false)` — **one code path** for prose taps and scene taps,
   including the ask-topic gating and the fly-head portrait.
4. **Exit taps submit typed commands** — `[W]` fills `go w` and calls
   `submit(...)`, like a chip. This preserves the tap-echo invariant: transcript,
   autosave, UNDO, and E2E all see an ordinary command.
5. **Modal states need nothing new in v0**: the scrollback still carries every
   modal prompt (`_renderResume` unchanged); the panel just keeps reflecting
   `G.room` etc. underneath. (v2 may promote modals into the scene; not now.)

### What v0 deliberately does NOT do

- No engine edits, no event layer, no state in `G`, no per-`_say` parsing.
- No speaker attribution (whose line is whose) — that's v2's event layer.
- No intra-room positions — the cast row is a row, not a floor plan (v1).
- No new option surface: the panel *renders* existing surfaces, so the
  three-surfaces rule is untouched (nothing is offered that the parser and
  wheel don't already offer).

### Testing

- **vm suite: untouched.** scene.js is presentation and never loads in tests
  (same standing as term.js/main.js).
- **E2E**: extend `smoke.spec.mjs` — panel renders at boot, a typed `go` flips
  `#scene-exits`/HUD, no page errors; one Playwright screenshot for visual
  eyeballing (the lbb-e2e-playwright pattern — never claude-in-chrome).
- **decorate/term tests**: unaffected — `_addAvatars` and decorate() paths are
  not modified, only reused.

---

## The art track (parallel; the actual long pole)

~60–100 rooms want backdrops. Mirror the proven cast pipeline:

- `scripts/gen-scenes` alongside `gen-portraits.py` — SDXL via the portrait_gen
  repo (the pics/ frames prove the loop) or a composed pixel part-library; either
  way **one style** for the whole town (neon-pixel, consistent with the busts).
- Output `web/art/rooms/<roomId>.png` + a handful of `art/regions/<slug>.png`
  fallbacks (Beach Rd, Buakhao, Darkside, Jomtien, Naklua, Soi 6, Walking St) so
  coverage is useful long before it's complete.
- Coverage stance (deliberate inverse of portraits.test.js): **orphaned art
  fails, missing art never does** — rooms outnumber characters 5:1 and the
  fallback chain is the feature that makes partial coverage shippable.

## v1 — hotspots (small)

Presentation-only fields on rooms (`art`, hotspot boxes), per rule 3 — the text
engine ignores them. Tap the bell on the wall → `ring bell`; tap the door → the
exit; tap a girl's bust *on the backdrop* → her wheel. Everything still submits
typed commands. This is point-and-click, and the known-name/`_topicKnown` gating
already governs what a hotspot may reveal.

## v2 — the event layer (the one real engine refactor)

The step CLAUDE.md rule 5 defers "until 2D work actually starts" — v2 is that
start. Do it **lazily**:

- Wrap `_say` so every line becomes `{type:"prose", text, cls}` through an
  `_emit` channel; the print callback becomes the prose renderer of events.
  Zero call sites change on day one.
- Add **semantic** events only where visuals need direction, one at a time:
  speaker attribution (bust highlight during dialogue), `bell` (the glow stinger
  — `_engineSfx` already models this shape), rain start/stop, scam reveal,
  encounter start, night end. Never annotate all ~4k `_say` sites up front.
- **This layer is also the multiplayer prerequisite** (online rule 8) — it pays
  twice, which is exactly why it shouldn't be built speculatively or twice.

## v3 — the fork (only if v0–v2 prove the appetite)

- **Visual novel / point-and-click** — the natural fit; v0–v2 essentially *are*
  it. Recommended default.
- **Top-down walkable** (Stardew-style) — the big jump: tile scenes, sprite
  walk, ambient animation. Rooms stay atomic engine-side; walking to a hotspot
  is presentation, arrival fires the `_do*`; ticks stay on actions (rule 6).
  A second game's worth of craft — decide with v0 data, not enthusiasm.

## Invariants (restated, because every stage is tempted to break one)

1. Game logic never enters scene.js/term.js/main.js; presentation never enters `G`.
2. Taps echo as typed commands until the event layer deliberately says otherwise.
3. No build step; `file://` keeps working; the vm suite stays install-free.
4. The prose is the soul — the 2D stages it, never replaces it.
5. The Thai layer (decorate, word cards, trainer hand-off) stays DOM — any text
   box in any stage must keep rendering decorated prose, or Thai stops tapping.

## Decision log

- 2026-08: Roadmap written; v0 sketched against real seams (`submit()`/boot
  hooks, `_term` export, `_isDarkHere`, `_bellActive`, label gating). Nothing
  implemented yet.
