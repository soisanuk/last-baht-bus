# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo ownership (agreed 2026-08-08)

**This repo is the one you work in.** Two sibling efforts are owned by other agents:

- **`~/projects/second-road`** — the macro/2D companion game. Another agent owns
  `src/`, `web/`, `tools/` and `HANDOFF.md` there, and treats this repo as
  **read-only upstream**, consumed through its `npm run sync`. **Do not edit that
  repo.** `tools/gen-world-export.mjs` lives *here* and is ours; if Second Road
  needs the export shape, the baton fields or the art conventions to change, that
  is **requested through the user, not made across the boundary.**
- **`web/portraits/`, `scripts/gen-portraits.py`, the thumbnail track** — the art
  agent's. Consumer wiring (`_avatarSrc`, `web/js/portrait-thumbs.js`) is ours.
- **`~/projects/ground-floor`** — the Bangkok follow-on (working title *Ground Floor*, English and
  apropos per Mario 2026-09-14; was `khlong` for six days; the real name is open — see
  `docs/bangkok-concept.md` *The name*). Created 2026-09-08 with a `HANDOFF.md` and nothing
  else; concept only. Same rule as Second Road: it treats this repo as **read-only upstream**
  and the design stays HERE in `docs/bangkok-concept.md`, which that handoff points at rather
  than duplicating. Anything it needs from us — today the one live item is that `G.ccibRadar`
  rides the full save but is **not** a `BATON_FIELDS` entry — is requested through the user.

- **`~/projects/soundings`** — a DFIR / threat-hunting case-graph service (created
  2026-09-15, concept + `HANDOFF.md` only) that ADOPTS the known-subgraph design from here
  (`docs/known-subgraph.md`, `_frontier`, the world graph and its four tests). Same rule:
  it treats this repo as **read-only upstream**; the design paper stays HERE; requests go
  through the user.

**`scripts/gen-portraits.py` REGENERATES EVERY PORTRAIT.** Running it rewrites all
~315 PNGs as pixel art, which silently clobbers the art agent's full-size SDXL
renders. After adding a CHARS spec and running it, restore theirs immediately:
`git status --porcelain web/portraits/ | awk '$1=="M"{print $2}' | xargs git checkout --`
— that leaves only your new `??` files. Verify with
`find web/portraits -maxdepth 1 -size +100k | wc -l` — **take that count BEFORE
you run the generator and check it is unchanged after**, rather than against a
number written here. The render track grows whenever the art agent ships (72 on
2026-08-08, 84 by the next morning), so a hard-coded figure goes stale and the
next person reads a healthy tree as a disaster.

**Two agents work this checkout, and the conventions we have settled on (2026-09-05)** — mine and the art agent's, recorded here because they outlive either session: (1) **the three generated manifests are last-writer-correct.** Both of us regenerate `docs/scene-manifest.json`, `docs/world-export.json` and `docs/portrait-manifest.json` — me after any `world.js` change because tests assert they are in sync, them after art changes. On a rebase conflict in those three, NEVER merge the hunks: take either side, re-run the generator, amend. They are pure functions of world.js plus the art directories, so whoever runs last is right. **`docs/portrait-manifest.json` carries the render queue** (2026-10-02, after the art agent reported the roster showed no needed work): every entry has `rendered` (does `web/portraits/thumb/<id>.webp` exist) and the top level lists `unrendered` ids — the characters still on a pixel placeholder. A new character from me lands there the moment I add its placeholder; a render that ships and is followed by a regen takes it off. **A changed look is back on the queue too** (2026-10-07, Mario: *"we can always use more new faces"*): a thumb existing does not mean it shows the character's CURRENT look, so when a look changes after its render shipped, **`docs/portrait-relook.json`** names the id with the old and new prompt, and the manifest marks it `rendered: false, relook: true` and lists it in `relook`; the art agent's ship path removes the id once the new render is in. The hostesses' looks went from 18 to 50 that day, no more than six women to a look and never two at one bar — 103 of 213 faces changed — and are stored per woman in `FLOOR_STAFF` since (the shared look, phone, emoji, selfie and back-story lists the builders drew from were removed with the builders, so nothing remains to edit that would move a face). **A character's portrait prompt is her `look` field and nothing else** — appearance only, kept apart from her desc, so a desc can be rewritten or deepened freely and needs no render; `docs/portrait-relook.json` keys on `look`. (2) **A new character gets a placeholder bust from me** (`python3 scripts/gen-portraits.py <id>`, explicit ids only) so `portraits.test.js` is never red in the gap between authoring and rendering; the art agent's ship path removes it once a real thumb exists. (3) **A look line that fights the renderer is prose, not seed** — after two failed passes on the same detail they ask whether it is the character or the writing, rather than rolling again. Waen cost three rolls to a line that asked for a schoolmistress; Nont cost eight to a 68-word line whose tail-trim ate his clothing. **Use targeted `git add <paths>`, never `git add -A`.** Other agents work in this
same checkout; a blanket add on 2026-08-08 swept 72 of the art agent's in-flight
files into an unrelated commit and pushed it. Check `git status` for untracked
work that isn't yours before committing.

## Commands

No build step, no lint, no npm install for the app — plain HTML/CSS/JS served as-is. The only exception is the browser E2E below, which is dev-only tooling; the app itself never needs a build or install.

**The i18n/German localization layer was REMOVED on 2026-10-07** — the catalog (`web/js/lang.js`), its coverage tests, the soak's German sweep and `docs/i18n-de-*` are all gone. The SEAM was kept and is dormant: `_L` (identity, no catalog ships), `_fmt`, `_num`, `_plural`, `G.player.lang` and ~80 `_L()` wrappers. **`docs/i18n-seam.md` is the contract** — read it before re-proposing a language, and note its one hard-won rule: never key a catalog by exact English source again, because every prose edit then orphans a key two files away and the test that guards it fails a bar rewrite. The three German-speaking ladies keep a line of their own register in their dialogue (Mercedes's Taitch, Jenny's phrasebook German, Chompoo's fluent Berlin German), and `_GERMAN_QUIP` is untouched.

**`jsconfig.json` + `types/game.js` are editor metadata, not a build step** — nothing at runtime reads either, and the app still ships as classic `<script>` tags. They exist so an IDE resolves the globals those scripts share across files (`G`, `ROOMS`, `NPCS`, `_say`…), and so the five hand-authored content shapes (`Room`, `NPC`, `DialogueNode`, `Quest`, `Item`) catch the silent-typo class — misspell `notFlags` and the gate simply never fires. `checkJs` is deliberately OFF (40k unannotated lines would report thousands of errors and gate nothing); opt a file in with `// @ts-check` when it's worth the pass. **`GameState` is DERIVED (`ReturnType<typeof newGame>`), never hand-listed** — G carries 116 fields and a transcribed typedef would be a second source of truth that drifts the first time anyone adds one; `newGame()` returns G, so the shape can't fall out of date. `moduleDetection: "legacy"` in the config is load-bearing — package.json's `type: module` (there for `node --test`) would otherwise make the language server treat these scripts as modules and hide every shared global. **Declined audit recommendations and why** (splitting world.js, the mobile scrollback cap, the CHEATS_ENABLED release gate): `docs/code-audit-2026-08.md` — read it before re-proposing any of them.

```sh
# Run all tests (Node 18+) — the fast vm suite, install-free (gates deploy alongside e2e)
node --test

# Run a single test file
node --test tests/js/engine.test.js

# Ad-hoc headless feel-check — loads the whole engine (cwd-proof) and runs a snippet
# with G / run() / out / show() / lastOut() / sandbox() in scope. Use this instead of
# re-typing the vm-load boilerplate.
node tools/probe.mjs 'sandbox(); G.room="stinky_bar"; run("buy man drink"); show()'

# Run the game locally
open web/index.html   # works from file://, no network requests

# Browser E2E smoke test (one-time setup, then run)
npm install                       # installs @playwright/test (dev only)
npx playwright install chromium   # downloads the headless browser
npm run test:e2e                  # drives web/index.html in headless Chromium
```

Deploy is automatic: any push to `main` runs `.github/workflows/pages.yml` (tests gate the deploy), which publishes `web/` to the `gh-pages` branch. Live at https://soisanuk.github.io/last-baht-bus/.

**Testing cheats:** `CHEATS_ENABLED` (a `let` in engine-core.js — no build step, so the constant is the switch) gates hidden typed codes. **Ships `false` since the release gate of 2026-09-15** (it was `true` through development; `tools/e2e-mega.mjs` and `tools/walkthrough.mjs` set it true in-page before funding themselves, and engine.test's beforeEach sets it true for the cheat tests). Codes are deliberately not surfaced (no autocomplete/decoration): `twoweekmillionaire` grants ฿2,000,000 for spending (handled early in `doCommand`, works in any state, costs no turn). **The splash opens on an 18+ content notice** (Mario, 2026-10-09, for the public Soi 6 release): one tap, remembered per device in localStorage `lbb_age_ok` (presentation, never `G`); a saved night continues straight in; the e2e helpers tap through it, and `agegate.spec` pins it. `web/og-card.jpg` and the Open Graph tags in index.html are what a forum shows when the link is pasted. **Hidden display toggles** (same unsurfaced treatment, but NOT gated on `CHEATS_ENABLED` — display modes, not advantages): `TOGGLE_V0` / `TOGGLE_V1` flip the visual layers (the v0 scene panel — **default ON** since the art shipped; v1 hotspots, default OFF) — intercepted in main.js's `_dispatch` (presentation, so the prefs are localStorage `lbb_v0_on`/`lbb_v1_on` read by scene.js, never `G`). Separately, the panel's **fold** (`lbb_scene_off`, the `▸ scene` / `▾ hide scene` toggle in the panel) hides art + cast and keeps HUD + exits; **phones (≤767px) boot folded** unless the pref says otherwise — measured 2026-08-22, the open panel left a 390×844 transcript 38% of the screen — and term.js prints a one-time tip (`lbb_scene_tip`).

## Architecture

Zork-style text adventure in the Soi Sanuk / Pattaya universe. Same conventions as the trainer
(`/Users/mario/projects/thaicab`): **classic script tags sharing globals, no ES modules, no build step, works from
`file://`**. The root `package.json` `"type": "module"` exists only so `node --test` treats test files as ESM. Load order
in `index.html` matters (`thai → world → games → cli-sim → engine-core → engine-encounters → engine-play →
engine-systems → engine-parser → …`); `main.js` loads last.

**`docs/architecture.md` is the map of the codebase by system** — Part 1 the machine (the files, `G`, what happens to a
command, a turn, the end of a night, an arrival), Part 2 one section per `docs/systems.json` row with its functions,
state, constants, tests and design docs. Read the section for the system you are changing before you change it. Its
index and per-system facts are generated (`node tools/gen-architecture.mjs`), and `tests/js/architecture.test.js` fails
on a system with no section or a `_function`, `G.field` or CONSTANT the prose names that the source does not define.

**`docs/claude-history.md` is this file as it stood before 2026-10-25** — the round-by-round design history (rounds
37–106, the sweeps, the rulings, the reasons behind every rule below). It is the place to look for *why*. When a rule
here is terse, the paragraph that established it is there; search it by function name or persona.

**The architecture review (`docs/architecture-review-2026-10-25.md`) is the plan for the structure** — the two routers'
implicit order, state lifetime, the `typeof` guards, the prompt registry. Follow its order when working on the shape.

### Rules that apply to every change

- **Every player-facing option lives on three surfaces** — the typed parser (and its printed lists), the flyout wheel
  (`_kwActions`, term.js), and the input autocomplete (`engineComplete`/`_completePool`). Put the rule in one engine-side
  helper (`_topicKnown`, `_travelDests`, `_playOptions`, `_gameVerbs`, `_salengItems` are the pattern) and have every
  surface consume it. A new engine-answered conversation subject also goes in `_situationTopics` the day it ships, or a
  thumb cannot reach it.
- **A modal gate is wired five ways**: its intercept in `_doCommandInner`, its redraw in `_renderResume`, its chips in
  `_chipSet`, its completion in `engineComplete`, and a recipe in `tools/modal-audit.mjs` (a gate with no recipe fails the
  audit). Its prompt goes through one shared helper so the live prompt, the reprompt and the redraw are identical. A
  non-answer ("what?", "what happens if I say yes?") must leave it up, commit nothing and cost no turn. A trigger never arms
  on top of a gate already up. A choice that ends a night asks once (`_endConfirm`).
- **A new `G` field is one line in `newGame()`** — `deserializeGame` merges a save over a fresh skeleton, so old saves gain
  it. Know its lifetime: nightly fields are reset in `_endNight`, per-trip ones in `_newVacation`; **a day stamp named
  `G.<x>Day` is aged by `_ageBooks` across a trip automatically** — a deadline with another name must be added there.
  Know which side of the shared-world wall it is on (player-local vs world-shared).
- **Repeatable prose is pooled, never a fixed string**: `_pickVary(pool, key)` (half the pool before a line repeats). A
  pool a floor woman deals from must be deeper than the women a man meets in a week (about ten) — `chorus-audit` gates it.
  Town-wide rows go through `_pickTownLine` / the `_TOWN_WIDE` book. Test against the pool global, never one string.
  **A pooled line in a bar must fit that bar's cast** — `_roomFit` drops lines naming staff the room lacks; a go-go has no
  stool, rail or bar (`_FIT_GOGO`, `_seat()`/`_ledge()`); `_voiceFit` keeps British idiom out of an American's quoted
  speech; `_roomFit` reads a line's source and never calls it.
- **Read the helpers, never the constants**, anywhere a price is quoted or charged: `_beerPrice(room)`, `_ladyPrice(room)`,
  `_bellPrice(room)`, `_barfinePrices`. `_servesDrinks(room)` gates anything a bar does (a drink); `_inBar()` only what a
  bar girl does. Numbers in prose are concatenated constants (`BEER_PRICE`), never typed digits — `references.test` lints it.
- **Presence and identity go through the helpers**: `_npcRoom(id)` / `_npcWhere(id)` (never `NPCS[id].room`), `_npcByName`
  for a typed or printed name (ids are the people, names are labels), `_met(id)` (never a raw `G.known[` read),
  `_inTown(room)`, `_underRoof(id)` (not `_sheltered`, which means "you can dive in here"), `_tillKeeper(room)` (a small bar's
  owner is its mamasan and its cashier), `_pr(id)` for pronouns. A woman on your arm is `_outWithMe(id)` / `G.party`, your
  own bar `_atOwnBar()`, the bar you manage `_atJobBar()`, the affair `_affairLive()`, the ride `_onRide()`, the bench
  `G.street` — any new `_say` about a bar, a girl, the police or the room is registered in `tests/js/predicates.test.js` for
  every one of these it could be wrong under.
- **A refusal is never a yes**: an encounter that takes money or ends a night asks `_isRefusal(input)` before its yes
  regex, and yes words are whole words.
- **New day-keyed rolls use `_hm`, not `_hh`** (`_hh` is near-linear in its last characters); old rolls keep `_hh` so seeded
  results do not move. Anything the town decides uses a pure hash, never `_rand()` — a lookup must not spend a die.
- **A `//` comment added to the end of a line of code swallows what follows on it** — put the comment on its own line. It
  has silently deleted a `_say`, a test's setup and a closing brace.
- **Duplicate case labels in `doCommand` are dead code** (a test greps for them).

### Prose is a claim

- Prose that asserts something about the world is a CLAIM: before inventing a detail about a recurring entity, run
  `node tools/prose-corpus.mjs --about <subject>`. **An invitation is a promise** — a verb delivers it, with its tappable
  `(CAPS)` hint, or it is not written. Prose that says the town SAW something is a witness claim — `tools/witness-audit.mjs`
  requires it classed, and only those who could have seen it speak.
- **A revisit line is hour-blind** (it fires at any hour); `lateDesc` is the small hours. **A string may not assert an hour
  or weekday the game did not compute** — route it through `_weekday()`/`_clockStr()`/`_fmt` or make it clock-blind.
- **Command-hint idiom**: only ALL-CAPS inside literal parentheses becomes a tappable command; `<placeholders>` fold into
  an open prefill; `[x]` ends the capture. Modal screens keep their options parenthesised and complete. `{{…}}` suppresses
  every tap inside a span (render-only; `stripMarkup` removes it). A name that is an ordinary word collides with prose —
  wrap the word or rename the character; a filler name never taps anything but the Candy wallet pointer (term.test).
- Review passes: `docs/prose-review-method.md` — `--delta` reads a string on its own page, `--dossiers`/`--rooms` read a
  subject together (the only pass that sees a contradiction), the lints cover the mechanical classes.
- **`docs/source-material-policy.md`** governs anything drawn from outside writing (take the research, never the
  expression; `tools/source-overlap.mjs` is the check). **`docs/guardrails.md`** governs anything drawn from the real town
  (trait budget ONE; identifiability, not the name, is what matters; PLG / Laurent Vasseur are the fictional group).

### Content conventions

- Content is data in `world.js` (`ROOMS`, `NPCS`, `QUESTS`, `ENCOUNTERS`, constants). A character is a flat list of
  state-gated dialogue nodes — first open match wins; `chip: false`, `deflect`, a person-name topic keep a node off the chip
  bar; a `topic` may carry `|` aliases; `when(st, G)` gates by state; a node's `asks` puts a question to the player.
  Nobody retells unprompted (`G.talked` is the permanent book; `ASK … AGAIN` retells). Use the `lbb-add-npc` and
  `lbb-add-quest` skills before adding either.
- **The floor staff are stored records** (`FLOOR_STAFF`, folded into `NPCS`); edit a woman in her record, give a written
  floor its words in `FLOOR_OWN` (her set must cover every subject it touches). A character's portrait prompt is her `look`
  field and nothing else; a changed look goes in `docs/portrait-relook.json`. A new character gets a placeholder bust
  (`python3 scripts/gen-portraits.py <id>`) — see the warning at the top of this file.
- A new system gets a row in `docs/systems.json` (its verbs, rooms, people, modals, quests, encounters, soak effects,
  predicates) **and a section in `docs/architecture.md`** in the commit that ships it; `systems.test` and `architecture.test`
  gate both.
- **Quests observe the world** (`doneFlag`): any mechanic completes a quest by setting a flag; a quest pays once a life
  (`G.questPaid`). Engine-set flags join `world.test`'s `settable` list.

### Testing and the instruments

- `tests/js/*.test.js` load the real sources with `vm.runInThisContext` (top-level `const`/`let` land in the global lexical
  scope — reference them bare, not via `globalThis`). Load the engine parts in order after `world.js`/`games.js`/`cli-sim.js`.
  **Use `grep -a` on tests/js** — some test files read as binary to grep and a plain grep says "not found".
- **Reach the subsystem through its REAL entry point at least once** (`doCommand`, `_endNight`, `_tick`, `_arriveAt`): a
  hand-built call sequence proves behaviour; only the real path proves the feature runs (WORK did nothing for 65 in-game
  nights under 38 green tests). **Say what OUGHT to happen**, not only that nothing breaks — the soak's liveness ledger
  (`EFFECTS` in `tools/soak.mjs`) names effects that must fire; add one with a mechanic. The walker's vocabulary comes
  from the engine; a change to it re-rolls every soak measurement.
- **The world graph** (`tools/gen-world-graph.mjs` → `docs/world-graph.json`) is derived and records line numbers —
  **regenerate it before every commit that touches an engine file** (graph.test goes red on a stale one). The three
  manifests (`docs/scene-manifest.json`, `docs/world-export.json`, `docs/portrait-manifest.json`) are regenerated after any
  `world.js` change and are last-writer-correct on a conflict.
- **The gated audits** (each derived from the engine, each with a `--mutate` that proves it goes red): modal, money,
  happiness, composition, memory, chorus, question, remark, offer, gogo, witness, askable, afford, asktopic,
  dialogue-lifecycle (the last four in `promises.test.js`). Run by hand: `examine-audit`, `errand-audit`, `dialogue-walk
  --lint` / `--shared`, `prose-corpus --delta`. **A promise must be KEPT, not merely parse.** **Coverage means observed
  surface** (`tools/coverage.mjs`, `--union` for every persona session); the coverage map (`tools/coverage-map.mjs`)
  aims persona rounds at dark cells; `tools/miss-ledger.mjs` is what players type that the game refuses.
- **Persona rounds** are the instrument for what the audits cannot see — use the `lbb-persona-round` skill; seeds come from
  `tools/persona-seed.mjs`; every finding gets a verdict row in `docs/persona-findings.json` at triage (round, persona,
  model, lens, claim, verdict, system, cls, sev) and its fix a pin in `tests/js/roundNN.test.js`.
  `node tools/findings-ledger.mjs --aim` ranks where to point the next round. Fixed baselines of real player sentences
  (`tests/js/steve.test.js`) only ever grow.
- **The adversarial code review** (`docs/code-review-2026-10-25.md`): reviewers per group of systems, `docs/architecture.md`
  as the map, every finding proven with a `tools/probe.mjs` reproduction, then verified and pinned
  (`tests/js/review1025.test.js`).
- **Browser E2E** (`tests/e2e/`, Playwright) is a thin pass over the real page and gates the deploy with the vm suite.
  **The browser seeds the season off the real clock — run `TZ=UTC npm run test:e2e` before pushing anything that reads the
  season.** The vm suite boots in November and cannot see a trough defect.

### Designed for the online / shared-world future

**A shared world is the probable long-term destination** (not soon). Structurally this game is already a MUD — rooms/exits/NPCs, text in, prose out, one session per player — so the path is: hosted single-player first (accounts, cloud saves, leaderboards), shared world later. `tests/js/online.test.js` **is the hosting model for the first step**: each player session = one `vm.createContext` holding the game-core files (thai.js, world.js, games.js, and the five engine-*.js parts), commands in via `doCommand`, output out via the injected print callback, persistence via `serializeGame()` blobs. Rules that keep the path open:

1. **The game core (`thai.js`, `world.js`, `games.js`, `engine-*.js`) must stay free of browser and wall-clock APIs** — no `window`/`document`/`localStorage`/`Date`/timers/`fetch`. Time is `G.nightTurn`/`G.day`, never real time. (Currently clean; keep it that way.)
2. **No loop may depend on the dice VARYING.** A `while` that re-rolls until it likes the answer terminates only because real dice differ, and a constant stub spins forever — the killer field builder re-rolled on a collision, so `_rand = () => 0.99` picked the same seat for eternity, before a shot was taken. It cost a three-hour wedged process, and the sting is that the persona skill in this repo *instructs* that exact stub, so the documented testing practice was the thing that hung. Walk to the next free index instead of re-rolling (same distribution under real dice, terminates under any), and bound any loop whose exit condition is a roll. Pinned in round49.test.js, which plays a frame at every constant from 0 to 1.
3. **All nondeterminism goes through `G.rng`/`_rand()`** — the only `Math.random` allowed is the initial seed, which a server can inject. Same seed + same command script = identical transcript (tested) — the basis for validation, replay, and anti-cheat.
4. **The single global `G` is fine** — per-session isolation comes from vm contexts, not instance-passing refactors. Don't "fix" the globals.
5. **Output stays in the print callback; persistence stays in `main.js`.** A websocket server replaces term.js/main.js the same way a 2D renderer would.
6. **Calendar checks go through helpers** (`_quizDay`, `_isQuizWindow`, `_leagueTonight`, `_clockStr`, `_weekday`) — in a shared world the clock becomes the server's, and these are the only seams to re-plumb. Never scatter raw `G.day % …` arithmetic.
7. **Shared schedules use pure hashes, not player dice.** `_quizBars()` is the canonical pattern: venue selection derived from (vacation, day) by a stateless hash, so every player would already agree on tonight's quiz bars with zero coordination. Any future "the town decides" feature (events, promotions, which bar the police watch) should follow it.
8. **When adding state, know which side of the wall it's on.** Player-local (most things: money, happy, flags-as-knowledge, favor, heat — heat is *your* reputation and stays per-player even in a shared world) vs world-shared (items lying in rooms, anything a second player could observe or contend for). No refactor needed now — just don't design features that secretly assume the player is alone in the world (e.g. "the only customer tonight" mechanics) without noting it. Contention over the same girls/barfines is a designed feature of the shared world, not a bug to avoid.
9. **The event layer** (structured events instead of prose-only output) is the shared prerequisite for both 2D and multiplayer — still deferred until either actually starts, per the 2D rules below.

### Designed for a future 2D conversion

A 2D version of this game is a live possibility — the staged plan (v0 scene panel → art pipeline → hotspots → event layer → the VN-vs-top-down fork) lives in `docs/2d-roadmap.md`; these rules remain the law it walks. The text terminal must stay a **disposable frontend**; everything below it must remain frontend-agnostic:

**Scene art** (the pipeline's LBB half — full contract in `docs/art-pipeline-spec.md`): `web/js/scene.js` `_sceneArt()` falls back `web/art/rooms/<roomId>.png` → `web/art/regions/<slug>.png` → the row removes itself, so coverage is incremental and missing art is never a bug. Room data reaches the generator through **one coupling only**: `scripts/gen-scene-manifest.mjs` → `docs/scene-manifest.json` (regenerate it, never hand-edit; the prompts, the SDXL runs and the kind templates all live in `../portrait_gen`'s `scenes.py`/`gen_scenes.sh`, same doctrine as portraits). `tests/js/art.test.js` guards it **inverted** from portraits — orphaned art fails, missing art never does — plus PNG magic bytes, the ≤400 KB per-file budget, and that the region slug regex is still identical in scene.js and the generator. Review a batch with `node tools/art-sheet.mjs` (contact sheet cropped to the live panel's ratio). Content rules that come from the game, not from taste: **interiors carry no people** (the cast row IS the people — a painted-in girl contradicts the roster the engine just printed, and the manifest's `people` field is what the generator strips out of the prose), but **street and market rooms are alive** — anonymous, mid-distance, faceless-by-negative (girls on the stools, punters, motorbikes weaving), because an empty Soi 6 is a lie about the place and nobody on the pavement is on the roster anyway. Plus **no readable text** anywhere (SDXL mangles it and any legible venue name contradicts world.js).

1. **All game logic goes in `engine-*.js`/`world.js`, never in `term.js`/`main.js`.** The terminal renders and persists; it must not know rules.
2. **Every action is its own `_do*` function** (`_doGo`, `_doTalk`, `_doBuy`, …). `doCommand` is only a text parser that maps words onto these — a 2D frontend will call the `_do*` functions directly (tap an exit → `_doGo("n")`) and skip the parser entirely. Never bury game-state changes inside parsing code.
3. **World content stays declarative.** New rooms/items/NPCs are data in `world.js`; presentation-only fields (sprites, positions) can be added later and ignored by the text engine. Don't bake logic into prose.
4. **Game state is one serializable object** (`serializeGame`/`deserializeGame`). Keep it that way — no state in closures, DOM, or module-locals.
5. **Don't build a structured event layer yet.** Prose via `print(text, cls)` is fine until 2D work actually starts; adding events speculatively doubles the output surface. When it starts, the refactor is: handlers emit events, prose becomes one renderer.
6. Time is **turn-based**: `_tick()` runs once per command (battery drain, soi-dog streak). A 2D version should keep ticks on actions/room-entry (roguelike style) rather than going real-time.

### Designed for reuse in sibling settings (the oldest of the three future goals)

**From the start (agreed 2026-07-20, before most of the game existed), the engine was meant to be reskinnable to other bar-district nightlife sims in Pattaya's family** — the two named proof-targets are **Itaewon** (Korea, Army/Yongsan era) and **the Honch** (Honchō/Dobuita-dori, Yokosuka, Navy). Full note: `docs/settings-reuse.md`. This is the **same refactor** as the online and 2D goals above, not a competing one: keep content out of the engine so a fork can swap it. The three-layer sizing model — **L1 machine (reuse verbatim) · L2 generic shape / Pattaya semantics (retune) · L3 social dynamics + `world.js` (rewrite)** — says these are *siblings, not rebuilds*: a same-dynamics reskin is days, different social dynamics same genre is weeks. **The known gap, stated honestly:** Layer 3 is **not data-driven** today (reuse = fork-and-gut), and ~1,350 `_say(` prose literals have leaked into `engine-*.js` that should live in data — every one pulled out, and every ad-hoc `barType` check promoted to a first-class **venue class**, is a shared down-payment on reuse, online, and 2D. **Cautionary note on how this was nearly lost:** the founding doc sat for weeks in a per-project Claude *memory silo* (thaicab's), invisible to LBB sessions and absent from git, and the codebase drifted from it unchecked — **durable design constraints belong in `docs/` and committed, never only in a memory file.**

## Canon

The Pattaya universe canon (characters, bars, geography, lady career arcs, piwin lore, PG-13 tone) lives in the shared
memory file `pattaya-nightlife-universe.md`, used by both this game and the trainer. Fare is ฿15. Keep new writing
consistent with it. What follows is the canon and doctrine this game has settled; the reasons are in
`docs/claude-history.md`.

**The shape of the game.** A staged sandbox: `act1` (the wallet race, do-or-die — a dawn, a collapse, a blackout or a
sunrise before the wallet is a hard fail and a reset) → `vacation` (seven nights) → `expat` (endless). The default entry is
the Soi 6 week (Tan drops you at the top of the soi; CONTINUE is another week or cancel the ticket); the full beach opening
sits behind the hidden `toggle full`. The long-game stat is สนุก (`G.happy`); 100 is สบายสบาย, celebrated once,
non-terminal. Nights run 18:00–06:00 in 120 turns.

**Doctrines that recur everywhere.**
- *Structural failure, never a morality tale.* Nobody schemes and nobody is moral-graded; the position is the antagonist
  (the staff affair, the bar's books, the kept girl, destitution).
- *Declining is always free.* Refusing a faction's job, Tan's favour or a con costs no standing; the cost, if any, is the
  frictionlessness you gave up. Violence never becomes mechanics; the threat is never made.
- *Being told the truth is not a prize* — the other ledger's reveals pay no สนุก and no bond.
- *Depth beats breadth* — a bonded regular's night pays without jading; churn jades (`_conquestHappy`).
- *Face-loss is permanent* (`_maiDee`): a woman who watched you walked out by security has decided, and nothing reopens it.
- *Nobody retells unprompted*; *a confidence is told once a life*; *the town remembers what it saw* (the witness rule).
- *The money reconciles to the baht* — the morning ledger names every movement; pocket, account and Nont's hold together.
- *A man who only says no is not pitched by the game itself* (`_refusing()`); the street's own women still ask once.

**The people.** **Tan** is ผู้กว้างขวาง — a broad person, mid-thirties, favours never money, the hidden hub who drove every
origin; he meets you standing at his parked car, never at the wheel; the quarter-turned glass is his alone; his mixed
English is his. **Nont** is the priced fixer (luk khrueng, half American): ฿200 a locate, five percent on CASH, a mule
account in plain sight. **Madam Oy** is fluent for a reason (eight years in Hong Kong; the character on her shoulder is 義,
never printed). **Mort** writes the Owl's column, Baltimore by passport, a British paper's register by forty-one years.
Wayne's silent partner stays a mystery. Drew and Angela are held with exceptional dignity. Wilf gave up drinking because he
could not afford it.

**English is three axes** (ability, vocabulary, confidence): true fluency is rare and comes from years abroad; the floor
speaks Tinglish with Google Translate; **the mamasan wins on confidence, not grammar** and never uses the phone; a cashier's
English is orthogonal to the job; Thai house staff speak Thai English (`_thaiHouse`/`_hv`, `_TOWN_THAI`), never British
idiom; a mamasan never says tilac. Americans, Canadians, Australians and second-language speakers each have a voice
(`_voiceKind`, `_VOICES`); Tan and Mort are exempt.

**Places and hours.** A go-go has no bar to lean on (front row, benches, a VIP gallery; waitresses bring drinks). Soi 6 is
about a hundred fronts in five segments; the middle is neutral ground; the group's buying is concentrated in the inner
west; the inner east is clean; every Soi 6 hostess is hand-authored. Everything on Soi 6 shuts at two (`SOI6_CLOSE`), the
Queen Vic at eleven (its bar is its reception after), gentlemen's clubs and the Darkside at midnight, the town's other
bars at dawn — `_closeTurn(room)` is the one place that knows. Pattaya faces west: the sun comes up behind the town. No
baht bus goes up Pratumnak. Road travel is reversible; Central Pattaya Road runs Beach Road → Sukhumvit.

**Money and power.** Thai organised power is patronage, not families (`docs/factions-thai.md`): the syndicate is Tan's
favours, the Darkside a *jao pho* family; the envelope is what you pay when you cannot be inside. A foreigner cannot
legally stand behind his own bar (`docs/bar-ownership-structures.md`): a work permit needs a company with ฿2m per permit.
The paper by the till names the owner, never the rota (`_licenceOf`). You lose by being dropped, never accused.

**The trade's prices** are two fees (the bar's fine and her money); after midnight a beer bar's fine is waived but hers is
not; Soi 6 is one lady drink before upstairs; the bell is a round for everyone, priced per head; water in a bar costs the
beer (you pay for the seat). A manager cannot barfine his own girls and drinks free at his own bar; a manager who turns his
floor is warned once and then fired — far easier to replace a manager than a good hostess — and is unhirable for a while
set by his reputation, and never again at that bar.

**Thai is a ladder** (`_thaiPoints`/`_thaiRegister`): novice gets hints, adequate gets answered in English, fluent stops
the compliments and the floor gets warier. A lesson teaches, it does not promote. Thai typed reads the way it is typed; a
Thai-script NPC name must be unique; new game Thai must exist in the trainer's `data.js` (vendored — never edit here).

**Real-world limits.** No real families, names or allegations, ever — structural pattern only. The game has exactly two
real-world links (the Soi Dog Foundation line, the only fourth-wall line; the trainer's address from Kruu Waen). Suicide is
never a mechanic or an ending. The 18+ notice says you play a man the town takes for a customer, and that you can say no.
