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
node tools/playtest-driver.mjs start --dir $D [--mobile] [--fresh]   # prints the boot screen
node tools/playtest-driver.mjs tap  --dir $D "SOI 6 CHALLENGE"
node tools/playtest-driver.mjs tap  --dir $D "START"
node tools/playtest-driver.mjs cmd  --dir $D 1 2 1          # answer the taxi intro
node tools/playtest-driver.mjs cmd  --dir $D "look" "talk to lek" "beer"
```

Every `cmd`/`tap`/`wheel`/`fab` prints **only the new transcript lines** since
your last call, under a one-line status header
(`── [room · day · nightTurn · ฿ · สนุก · ENC/CHOICE/GAME flags] ──`). Batch
5–15 commands per call, read the delta, decide in persona, repeat.

**`--fresh` for a clean boot.** The daemon reuses one browser, so `start` can
inherit a stale autosave from an earlier session (both round-three testers hit
this — the game resumed mid-Act-One instead of the splash). Pass `--fresh` on
`start` to wipe localStorage before the game boots, guaranteeing the splash →
intro → opening flow. Omit it to deliberately exercise the continue-prompt /
autosave path, which is itself worth testing.

Verbs: `cmd <inputs...>` (typed through the real input) · `tap <text>` (chip /
decorated keyword / any button) · `wheel <word> [n]` (right-click flyout: list
actions, or pick the nth) · `fab bell|msg|font|mute|n|s|e|w|in|light` ·
`state` (G snapshot + chips + exits, JSON) · `overflow` (doc + chip-bar scroll
widths) · `shot <name>` · `errors` (accumulated console/page errors — check at
the end, every entry is a finding) · `raw "<js>"` (escape hatch) · `stop`.

The daemon holds one persistent headless browser. **State lives and dies with
the daemon**: the browser context is in-memory, so localStorage (the autosave,
`lbb_full_on`, font prefs) does NOT survive a `stop`/`start` cycle — a restart
boots fresh. Within one daemon's lifetime the autosave persists across
`navigate` reloads, which is how to flip a localStorage gate: set it via `raw`,
then reload with `raw "location.reload()"` — do NOT stop/start for that.

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
