# Soi Sanuk bar-games Chrome extension — implementation handoff

*Feasibility analysis 2026-09-01. Status: unbuilt, greenlit for handoff. This doc
is the founding note for a NEW sibling repo — per the settings-reuse lesson,
durable design constraints live in docs/ and get committed, never only in a
memory file.*

## Verdict

**High feasibility, weekend-to-a-week scale for v1.** The hard part of a
browser puzzle game — a tuned, deterministic, difficulty-tiered opponent — is
already written, tested, and **provably dependency-free**: `web/js/games.js`
(306 lines) loads and plays in a completely empty `vm.createContext({})` with
nothing else evaluated. Verified 2026-09-01: fresh C4 board, AI moves at every
depth tier, Jackpot rolls and legal-move listing, all standalone. The extension
is a thin graphical UI over one vendored file, plus a daily-seed hook.

The strategic case is not the product, it's the **distribution surface**: a
daily puzzle in the toolbar whose share lines link home. Every share card
carries the soisanuk URL, funnelling to both the game and the trainer.

## What reuses verbatim

One file, vendored: **`web/js/games.js`** — copy with a
`// VENDORED from last-baht-bus — edit there, never here` banner, exactly the
discipline the trainer applies to LBB (model: `thaicab/scripts/sync-vendored.mjs`,
which also has a `--check` drift mode for CI — build the same for the extension
on day one; the recurring cost of vendoring is silent drift, and an hour of
sync script closes it).

The public surface (all pure, all take an injected `rnd()` — no Math.random
anywhere inside):

| Game | Functions | Notes |
|---|---|---|
| Connect 4 | `c4New` / `c4Drop` / `c4Undrop` / `c4Win` / `c4Full` / `c4Ai(board, rnd, depth)` / `c4Render` | negamax + alpha-beta; `rnd` only tie-breaks equal roots, so play is seed-deterministic |
| Jackpot (shut-the-box) | `jpNew` / `jpRoll` / `jpMoves` / `jpFlip` / `jpScore` / `jpAutoRound` / `jpRender` | |
| Pool / killer | `poolShot` / `kpNew` / `kpShot` / `kpAlive` / `kpOver` / `kpRender` / `poolOppVisit` | abstract text variant — **defer, see v1 scope** |

`c4Render`/`jpRender` are text renderers — not for the extension's UI, but
free for dev/debug output and as raw material for share lines.

**Tuning knowledge that must travel with the copy** (from CLAUDE.md, learned
the hard way):

- **Keep C4 depths EVEN.** Depth 7 plays *worse* than 6 (horizon parity).
- The tier ladder: **8** = the mamasan shark (an experienced-player proxy
  scores 0 wins, mostly draws), **6** = beatable by a player who plans deeper,
  **2** = the new girl ([world.js:7964](../web/js/world.js) — `c4: 2, // first
  week on the soi — the one Connect 4 table a human can beat`). `_c4Depth(id)`
  itself ([world.js:13942](../web/js/world.js)) is LBB roster logic — don't
  vendor it; the extension's difficulty picker just passes 2/6/8.
- ~140 ms worst-case move at depth 8 — fine on the main thread of a popup,
  but a `setTimeout(0)` wrap keeps the click feedback honest.

## The daily-seed hook (copy the pattern, ~15 lines)

`_dailySeed(str)` ([engine-parser.js:8561](../web/js/engine-parser.js)) is a
pure FNV-1a fold of a date string onto the Lehmer LCG's range
(1..2147483646); the LCG step itself is `_rand()`
([engine-core.js:542](../web/js/engine-core.js)) — `s = s * 48271 %
2147483647`. Copy those ~15 lines with an attribution comment (they live in
engine files, so the wholesale-vendor route doesn't apply — the extension must
NOT vendor engine-*.js).

Design, mirroring LBB's TODAY'S SOI: the **frontend** computes the date string
and hashes it; the game code never reads a clock. Everyone gets the same daily
Jackpot dice stream and the same C4 opening position/tie-breaks. Share line in
the Wordle idiom — precedent is `_shareCard()`
([engine-parser.js:8580](../web/js/engine-parser.js)) and `_NIGHT_EMOJI`
(8572): **outcome class only, never content**, plus the URL. That's a pattern
to imitate, not code to reuse.

## What is genuinely new work (and the one trap)

**The UI, and only the UI.** A C4 board is a 7×6 DOM grid; Jackpot is nine
tiles and two dice. A day or two each, honestly done.

**The trap:** LBB's game *orchestration* — stakes, hostess banter, the Jackpot
first-game tutorial, forced-roll auto-play — lives in engine-play.js
(`_startC4` :126, `_jpTurn` :703, `_gameInput` :1413) woven through `G`,
`_say`, and the bond system. **None of it is extractable and none of it is
wanted**: a graphical UI replaces the prose tutorial with affordances (legal
flips highlighted, columns hover-previewed). If you find yourself porting
`_jpTurn`, stop — you're rebuilding a text UI inside a graphical one.

## Extension mechanics

- **Manifest V3, no build step.** LBB house style (classic scripts, no
  modules, no fetch, works from `file://`) is already MV3-CSP-compliant —
  strict no-remote-code costs this codebase nothing because it never had any.
- **Zero permissions requested** (storage is available to extensions without a
  manifest permission prompt in the install dialog; even asking only for
  `storage` keeps the install warning-free). Reviewers love this.
- **Popup lifecycle is the classic annoyance**: the popup dies the instant it
  loses focus. Two mitigations, pick one:
  1. Persist state **per move** to `chrome.storage.local` (or localStorage) and
     restore on open — cheap, and the daily board is tiny state.
  2. Use the **side panel API** (`chrome.sidePanel`) — survives focus changes,
     suits "play while the kettle boils". Slightly newer API surface.
  Recommendation: popup + per-move persistence for v1 (simplest), side panel
  as a v2 option.
- **Store**: $5 one-time developer fee, review typically days. Simulated
  gambling with fictional currency is allowed (real money is not) — baht
  stakes stay fictional, same as the game. The games themselves are
  innocuous; keep the **store listing about the games and the daily puzzle**,
  hold any bar-scene framing to the same PG-13 line as the game. A named
  hostess opponent with a portrait is fine; the listing copy is where
  restraint pays.

## Assets (optional garnish, with an ownership flag)

- **Portraits** (`web/portraits/`) — the full-size renders are the **art
  agent's track**. Reusing them in another repo is a cross-boundary ask:
  **request through Mario, don't copy across.** The pixel-art generator
  (`scripts/gen-portraits.py`) is likewise theirs to run.
- **Chiptunes** (`web/js/audio.js`) — self-contained WebAudio, and the eight
  originals are rights-clean by construction. A closing popup kills the
  AudioContext, though; audio only makes sense with the side-panel variant.
  Skip for v1.

## Boundaries

- **New repo.** LBB stays the source of truth for games.js; the extension
  consumes it read-only through its sync script — the same relationship
  Second Road and the trainer have to this repo. No extension code lands here.
- The one plausible future backflow (a new game added for the extension) goes
  the other way: author it in LBB's games.js under LBB's rules (pure, injected
  rnd, no G), then sync out.

## v1 scope

1. Connect 4 vs the tiered AI (2/6/8, named tiers in Soi Sanuk voice).
2. Jackpot, free-play + **daily board** (shared seed, share line + copy).
3. Per-move persistence, streak counter in storage.
4. Sync script with `--check` in CI.

Deferred: pool/killer (abstract text design doesn't translate without real
design work), audio, portraits (ownership ask first), side panel, any i18n.

## Naming

**Spelling: `sanuk`, not `sanook`, and this is worth being stubborn about.**
Two reasons: (1) brand consistency — the domain is soisanuk.github.io and this
repo enforces an RTGS-style romanisation scheme vigorously enough that a
commit exists titled "Vendor: 19 off-scheme romanisations corrected"; (2)
**sanook.com is Thailand's largest web portal** (Sanook Online, a
Tencent-owned property). "Soi Sanook" invites confusion — and possibly
trademark friction — in exactly the country that knows the word best.

Repo-name candidates:

| Name | For | Against |
|---|---|---|
| **`soi-sanuk-games`** ✅ | descriptive, discoverable, sits naturally beside `soisanuk.github.io` / `last-baht-bus` / `thaicab` | unexciting |
| `sanuk-daily` | leads with the hook | LBB's own daily is TODAY'S SOI — two "daily" products under one brand will be confused, including by us |
| `shut-the-bar` | the pun is good | obscures Connect 4, and store search won't find it |

**Recommendation: repo `soi-sanuk-games`; Chrome Web Store display name "Soi
Sanuk: Bar Games"**, with the daily branded as a feature inside it ("Today's
Board") rather than as the product name — that keeps the daily namespace clear
of TODAY'S SOI while reusing its idiom.
