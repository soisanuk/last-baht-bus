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

**The game is a staged sandbox.** `G.stage`: `act1` (the wallet quest, day 2 of a 7-day vacation) → `vacation` (Act One complete: `_checkAct1` fires once at `hotel_room`, gated in `_doGo` on `hasWallet`, scores the quest, converts score to happiness, and opens the room safe +฿3000) → `expat` (chosen at week's end; endless, +฿20000 savings; future home of the run-your-own-bar mechanic). `G.over` is never set; the long-game stat is `G.happy` (สนุก), fed by `_addHappy(n)` hooks across every system. Levels at 0/10/25/50/100; 100 = สบายสบาย, celebrated once via the `sabaiSabai` flag but non-terminal.

**The clock and the body.** Nights are `NIGHT_TURNS` (100) long, 10 turns/hour from 18:00; `_tick` accrues hunger/thirst, sobers you 1 drink per 20 turns, drains happiness when meters redline, and calls `_endNight(reason)` on collapse (hunger/thirst 100), blackout (drunk ≥ 9 via `_checkDrunk`), hospital (`G.hurt` ≥ 3), or dawn. `_endNight` resets dailies (hangover scales next evening's hunger/thirst), advances `G.day`, and respawns at `hotel_room` (or the beach pre-act1); day > 7 outside expat triggers `_endVacation` → `G.pendingChoice = "vacation_end"` gate → `_newVacation()` (happy resets, `bestHappy` tracks, no lead-in) or `_goExpat()`. Food/water via `FOOD_STALLS`/`_doEat`, plus `room.seven` (one street room per district) selling the cheese toastie/water/charger. BARFINE via `_doBarfine`: favor-gated, priced by `_barfinePrice` (×1.5 before 21:00, beer-bar fee waived after midnight except `POPULAR_GIRLS`, flash joints ×0.75); Soi 6 continues the night, elsewhere `_endNight("barfine")` +10 happy. `_maybeSelfBarfine` (favor ≥6, after midnight, once/night) sets `pendingEnc:"selfbf"`. Vacation stage: lobby ATM pays ฿3000 on first hotel exit per day (`G.atmDay`). Drunk ≥5 on lit streets rolls the repeatable `police` pseudo-encounter (30-turn cooldown via `G.lastPolice`); an adjacent `mamaTreat` bar's mamasan rescues at 70%.

Bar social life lives in `G.soc` (per-girl lady-drink counts, per-bar bell/heat/ban/patron state, own drunk counter). Actions (`_doSocial`: flirt/kiss/spank/fondle) resolve `_favor(id) − SEV[kind]` into five outcome tiers; `NPC_ROLES` (world.js) caps physical contact for cashiers/mamasans until `bells[room] ≥ 2`. Heat ≥ 3 → `_kickOut()` (LK Metro bans complex-wide; bans expire after `BAN_TURNS`). Street attempts are negative except the katoey encounter's flirt-back branch.

**Quests** live in `QUESTS` (world.js): giver dialogue surfaces offers (`_questOffer` after `_doTalk`), ACCEPT/ABANDON/QUESTS verbs manage `G.quests` states, and `_questTick` (every turn) completes any active quest whose `doneFlag` is set, paying `reward`. `deps` gate offers on other quests being done.

**The phone** (`G.phone`): CONTACT in her bar at favor ≥2 swaps numbers; contacts text unprompted via `_maybeIncomingText` in `_tick` (invites reward showing up that night — checked in `_doGo`; messages can carry money, credited on CHECK MESSAGES); MESSAGE = once-per-night favor charm; SEND <amt> TO <name> is the banking app (favor bump scales with amount). Everything battery-gated.

Bar mini-games (Connect 4 / Jackpot / pool / killer pool on league nights — `G.day % 3 === 0` at `room.pool` bars) run as a modal `G.game` state: while one is live, `doCommand` routes every input to `_gameInput` and QUIT concedes. Stakes are escrowed up front and paid back ×2 on a win (×3 on a Jackpot); broke players play "for sanuk" (stake 0). Tabletop games are gated on `barType === "beer" | "soi6"`, pool on `room.pool`.

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
