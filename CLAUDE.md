# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

No build step, no lint, no npm install — plain HTML/CSS/JS served as-is.

```sh
# Run all tests (Node 18+)
node --test

# Run a single test file
node --test tests/js/engine.test.js

# Run the game locally
open web/index.html   # works from file://, no network requests
```

Deploy is automatic: any push to `main` runs `.github/workflows/pages.yml` (tests gate the deploy), which publishes `web/` to the `gh-pages` branch. Live at https://soisanuk.github.io/last-baht-bus/.

## Architecture

Zork-style text adventure in the Soi Sanuk / Pattaya universe. Same conventions as the trainer (`/Users/mario/thaicab`): **classic script tags sharing globals, no ES modules, no build step, works from `file://`**. The root `package.json` `"type": "module"` exists only so `node --test` treats test files as ESM. Load order in `index.html` matters (`thai → world → games → engine → …`); `main.js` loads last.

Bar mini-games (Connect 4 / Jackpot / pool) run as a modal `G.game` state: while one is live, `doCommand` routes every input to `_gameInput` and QUIT concedes. Stakes are escrowed up front and paid back ×2 on a win (×3 on a Jackpot); broke players play "for sanuk" (stake 0). Tabletop games are gated on `barType === "beer" | "soi6"`, pool on `room.pool`.

- `web/js/thai.js` — Thai numbers (สิบเอ็ด/ยี่สิบ irregulars), Thai digits ๐–๙, signs, phrase matching. Pure functions.
- `web/js/world.js` — all rooms, items, NPCs, dialogue, bus/motosai lines. **Pure declarative data**, the source of truth. Dialogue entries are `{req, notFlags, topic, th, rom, text, sets, gives}`; first matching entry wins, `_pickDialogue` falls back to the topicless entry on unknown topics.
- `web/js/games.js` — bar mini-game logic (Connect 4 + AI, Jackpot shut-the-box dice, abstract 8-ball pool). Pure functions, no `G`, no output; every random decision takes an injected `rnd()`. Loaded between world.js and engine.js.
- `web/js/engine.js` — state (`G`), parser, action handlers, systems (battery/darkness/soi dog, money, score, endings). DOM-free at load; all output goes through the `print`/`speak` callbacks injected via `engineInit`. Random street encounters: scene data in `ENCOUNTERS` (world.js), resolvers in `_ENC` (engine.js); the RNG is a Lehmer LCG whose state lives in `G.rng`, so rolls serialize with the save and UNDO can't reroll them — tests fire encounters deterministically via `_startEnc(id)`. Interactive encounters set `G.pendingEnc`; the next command is routed to the resolver as the player's snap reaction. Long scripted tests that walk eligible streets should first mark all of `G.encDone`.
- `web/js/term.js` / `main.js` — the terminal frontend: scrollback, history, verb chips, autosave (`lbb_save`), continue-prompt, one-level UNDO, music unlock on first gesture. All persistence lives in `main.js`; the engine is storage-free.
- `web/js/audio.js` — chiptune step sequencer (tracks shared with the trainer; `soi` is a real Sabai Sabai MIDI transcription, `bus` is still an invented Pattaya Pattaya placeholder). `_audioForRoom(roomId, flags)` maps room region → track.
- `web/js/tts.js` — th-TH Web Speech, Capacitor-ready, iOS gesture unlock.

### Designed for a future 2D conversion

A 2D version of this game is a live possibility. The text terminal must stay a **disposable frontend**; everything below it must remain frontend-agnostic:

1. **All game logic goes in `engine.js`/`world.js`, never in `term.js`/`main.js`.** The terminal renders and persists; it must not know rules.
2. **Every action is its own `_do*` function** (`_doGo`, `_doTalk`, `_doBuy`, …). `doCommand` is only a text parser that maps words onto these — a 2D frontend will call the `_do*` functions directly (tap an exit → `_doGo("n")`) and skip the parser entirely. Never bury game-state changes inside parsing code.
3. **World content stays declarative.** New rooms/items/NPCs are data in `world.js`; presentation-only fields (sprites, positions) can be added later and ignored by the text engine. Don't bake logic into prose.
4. **Game state is one serializable object** (`serializeGame`/`deserializeGame`). Keep it that way — no state in closures, DOM, or module-locals.
5. **Don't build a structured event layer yet.** Prose via `print(text, cls)` is fine until 2D work actually starts; adding events speculatively doubles the output surface. When it starts, the refactor is: handlers emit events, prose becomes one renderer.
6. Time is **turn-based**: `_tick()` runs once per command (battery drain, soi-dog streak). A 2D version should keep ticks on actions/room-entry (roguelike style) rather than going real-time.

### Tests load the real sources via node:vm

`tests/js/*.test.js` read the corresponding `web/js/` file and evaluate it with `vm.runInThisContext` (same realm, so `deepEqual` works). `thai.js`, `world.js`, `engine.js` are DOM-free at load time and fully testable, including a scripted full playthrough. Top-level `const`/`let` from vm-loaded scripts land in the global *lexical* scope — reference them as bare identifiers, not via `globalThis`.

World-integrity tests enforce: every exit resolves to a real room, all 15 canon bars exist, and every flag required by dialogue is settable somewhere (dialogue `sets` plus the engine-set list in `world.test.js` — extend that list when the engine gains new flag-setting actions).

## Canon

The Pattaya universe canon (characters, bars, geography, lady career arcs, piwin lore, PG-13 tone) lives in the shared memory file `pattaya-nightlife-universe.md` and is used by both this game and the trainer. Fare is ฿15. Keep new writing consistent with it.
