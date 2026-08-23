# Persona-playtest harness

`tools/playtest-driver.mjs` is a reusable driver for **blind persona playtests**
— sub-agents playing the game like human players and reporting findings. It
exists because every agent in the 2026-08-17 rounds hand-built its own
Playwright plumbing at ~50–80k tokens each, and their driver bugs (count-based
transcript capture broken by the scrollback prune; flyout selectors guessed
wrong) polluted findings until they self-corrected. Dev-only; no test suite
depends on it.

## The loop an agent should run

```sh
D=<your scratchpad session dir>
node tools/playtest-driver.mjs start --dir $D [--mobile] [--fresh]   # prints the start menu's buttons + the boot screen
node tools/playtest-driver.mjs tap  --dir $D "SOI 6 CHALLENGE"
node tools/playtest-driver.mjs tap  --dir $D "START"
node tools/playtest-driver.mjs cmd  --dir $D 1 2 1          # answer the taxi intro
node tools/playtest-driver.mjs cmd  --dir $D "look" "talk to lek" "beer"
```

Every `cmd`/`tap`/`wheel`/`fab` prints **only the new transcript lines** since
your last call, under a one-line status header
(`── [room · day · nightTurn · ฿ · สนุก · ENC/CHOICE/GAME flags] ──`). Batch
5–15 commands per call, read the delta, decide in persona, repeat.

**`--fresh` for a clean boot.** State lives in the daemon's browser: a `stop` /
`start` cycle always boots clean, but `start` against a daemon that is STILL
RUNNING for the same `--dir` reconnects to it — and inherits whatever night it
was in (both round-three testers hit this: the game resumed mid-Act-One
instead of the splash). `start --fresh` covers both cases: a new daemon wipes
localStorage once before the first boot; a live daemon is reset in place
(storage wiped, page reloaded), so the splash → intro → opening flow is
guaranteed either way. Omit it to deliberately exercise the continue-prompt /
autosave path, which is itself worth testing.

**The full game is gated on the splash** ("THE FULL GAME — Coming soon", button
disabled). To play it, type the hidden toggle as a command once — `cmd --dir $D
"toggle full"` — then restart the game from the splash (RESET, or `raw
"location.reload()"`); the button is live from then on for the daemon's life.
`--fresh` wipes localStorage once per daemon (not on every reload), so the
toggle survives the reload that applies it.

**Where ask-topics live:** NOT on the flyout wheel (it carries verbs only). TALK
TO <name> opens the conversation and the topic list appears on the **chip bar** —
read it with `state` (the `chips` array). Typed `ask <name> about <topic>` works
for any topic, listed or not; a miss now gets a voiced "not my story" line.

**The start screen is a menu, not transcript.** `start` prints its buttons
(`start menu: [THE FULL GAME — disabled] [SOI 6 CHALLENGE] [TODAY'S SOI]…`) and
`menu` re-reads them any time; tap one by its text. The device mode is fixed
when the daemon is created — `start --mobile` against a running desktop daemon
(or vice versa) recreates it, and `state` reports `mobile: true|false` so a
persona can confirm what it's playing on.

**Coverage is recorded for you.** Every `cmd` writes `<sessionDir>/coverage.json` —
a running ledger of rooms stood in, verbs typed, people spoken to and authored
dialogue delivered. It lives OUTSIDE the game, so it survives the things that
wipe `G`: the Act One hard fail (which calls `newGame()`), a new vacation, and
RESTART. Score a finished session with
`node tools/coverage.mjs --ledger <sessionDir>/coverage.json`, and keep it with
`--record <label>`. You don't have to do anything for this to work; just mention
the ledger path in your report.

Verbs: `cmd <inputs...>` (typed through the real input) · `tap <text>` (chip /
decorated keyword / any button) · `wheel <word> [n]` (right-click flyout: list
actions, or pick the nth) · `fab bell|msg|font|mute|n|s|e|w|in|light` ·
`state` (G snapshot + chips + exits, JSON) · `overflow` (doc + chip-bar scroll
widths) · `shot <name>` · `errors` (accumulated console/page errors — check at
the end, every entry is a finding) · `raw "<js>"` (escape hatch) · `stop`.

The daemon holds one persistent headless browser. **State lives and dies with
the daemon**: the browser context is in-memory, so localStorage (the autosave,
`lbb_full_on`, font prefs) does NOT survive a `stop`/`start` cycle — a restart
boots fresh. Within one daemon's lifetime the autosave persists across page
reloads (`raw "location.reload()"` — there is no separate reload verb), which is
how to flip a localStorage gate: set it via `raw`, then reload — do NOT
stop/start for that.

## Token discipline (why this file exists)

- **Never write your own Playwright driver.** This one already knows the
  selectors and survives the scrollback prune.
- **Screenshots are the most expensive thing you can do** (each one you read
  back costs thousands of vision tokens). Take 2–3 at checkpoints plus any
  suspected VISUAL issue — never on a schedule like "every 40 commands".
- Read deltas, never re-read old transcript. `state` is cheaper than a shot.
- For the spawner: personas drive fine on a smaller model; keep at most one
  flagship-model persona per round as a quality control.

## The standing rules for persona agents

- **Blind means blind**: no reading `world.js` / `engine-*.js` / docs to solve
  anything mid-play. Source peeks only AFTER the session, only to confirm a
  suspected root cause, and declared in the report.
- Repo is read-only; all writes go to the agent's scratchpad dir.
- Dice-drive choices among in-character candidates; never a fixed script.
- The final message is the only thing that survives: numbered findings,
  most-severe-first, with exact quotes, then coverage/totals/clean categories.
