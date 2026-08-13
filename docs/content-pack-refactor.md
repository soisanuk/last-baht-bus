# Converting LBB to a content-pack architecture

Design spec. Written 2026-08-13. **Nothing here is built** — this is the plan for the
refactor that `docs/settings-reuse.md` calls "the high-leverage move before a second fork,"
made concrete against the real codebase.

The goal: turn LBB from *one game with a reusable skeleton* into *an engine plus a Pattaya
content-pack*, so a second setting (Itaewon, the Honch, Bangkok) is **"write a pack," not
"fork and gut."** Per `docs/settings-reuse.md`, the interface is **designed against the
hardest case (Bangkok, a genre shift)**, not the easiest (Itaewon, a same-genre sibling) —
a boundary that only fits nightlife siblings has just moved Pattaya one layer up.

This is a **pure refactor**: Pattaya's behaviour does not change. The seeded LCG makes that
testable — same seed + same command script = identical transcript — so *every stage asserts
the soak transcript is byte-identical before and after.* That invariant is the whole safety
net; treat a transcript diff as a refactor bug, not an acceptable change.

## The honest starting point (measured 2026-08-13)

The five engine files total **~15,700 lines** and are **saturated with Pattaya**, interleaved
with the setting-agnostic machinery:

| Signal in `engine-*.js` | Count | What it means |
|---|---|---|
| `_say(` prose literals | 1,358 | content lives in handlers, not data |
| `_pickVary` pools (`const _UPPER = [`) | 135 | more content in handlers |
| `baht` / `฿` | 628 | currency hardcoded, not a pack constant |
| Pattaya place refs (Soi 6 / Walking St / Buakhao / Beach Rd) | 286 | geography hardcoded in logic |
| "Pattaya" / "Isan" | 92 / 3 | canon hardcoded |
| `barType` checks | 51 | venue class is ad-hoc string comparison, not a first-class type |
| numeric constants | 24 in engine + 35 in world | config scattered across two homes |

`G`, `newGame()`, `serializeGame`/`deserializeGame`, and `engineInit()` all live in
`engine-core.js`. The vendored Thai stack (`thai.js`, `data.js`, `examples.js`,
`tokeniser.js`, `thai-script.js`, `wordcard.js`) is a self-contained language module that
loads alongside. The load order (`thai → world → games → lang → engine×5 → …`) is the "game
core," and the vm test suite loads exactly that set.

**Conclusion:** Layer 1 (the machine) and Layer 3 (Pattaya's dynamics + prose) are not
separated — they are woven together line by line. The refactor is *disentanglement*, done in
place, incrementally, with the transcript invariant as the guardrail.

## The target: engine + pack, and the interface between

```
engine/            L1 — setting-agnostic, ZERO Pattaya nouns / prose / currency
  parser dispatch, modal-gate framework (doCommand/_renderResume),
  room+exit graph, BFS fast-travel, tick clock, seeded LCG, save/restore
  (merge-over-newGame), known-names, print/speak/sfx hooks, and the
  FRAMEWORKS (not the content) for encounters, quests, mini-games,
  venue behaviour, and language.

packs/pattaya/     the current game, expressed AS a pack
  world data (rooms/NPCs/items/dialogue = today's world.js)
  domain systems (barfine economy, hedonic treadmill, the phone, hotels…)
  ALL prose (the 1,358 _say literals + 135 pools, externalised)
  ALL constants (prices, timings, caps)
  the language module (the vendored Thai stack)
  the canon
```

**The pack → engine interface (what a pack registers):**

- `world` — rooms, exits, items, NPCs, dialogue (already declarative in `world.js`).
- `venueClasses` — a registry replacing the 51 ad-hoc `barType` checks (below).
- `systems` — domain modules the engine calls through a defined lifecycle (below).
- `prose` — a catalog the engine renders by key/event, instead of literals in handlers.
- `config` — the ~59 numeric constants, plus currency symbol, clock shape, day names.
- `language` — the pluggable learning-language module (Thai today; Korean/Japanese later).
- `canon` — flavour data (news fallbacks, column pools, smell/sound tables).

**The engine → pack interface (what the engine offers):** the lifecycle hooks a system can
implement — `onTick(G)`, `onArrive(G, room)`, `onCommand(G, verb, arg)` (before the default
dispatch), `onNightEnd(G, reason)` — plus the primitives (`rng`, `print`, `_addHappy`-style
scalar helpers, the modal-gate register, state on `G`). A system is a plain object of these
hooks; the engine iterates registered systems, exactly as `games.js` already exposes pure
functions the engine drives.

## The abstractions to introduce (the actual work)

1. **Venue class, first-class** (kills 51 `barType` string checks). A `venueClasses` registry:
   each class (`beer`, `gogo`, `gents`, `soi6`, `pub`…) is an object declaring its behaviour
   (barfine model, closing time, saleng eligibility, photo rule, favor curve). The engine asks
   the class, never `if (barType === "gogo")`. A pack defines its own classes — Itaewon's
   `juicy` (occupancy-lock), `danran` (access-gated), the Honch's `karaoke` (off-shift only) —
   without touching the engine. **Bangkok test:** a pack with venue classes that aren't bars
   at all must fit.

2. **Prose externalisation** (the big one — the 1,358 literals + 135 pools). Handlers stop
   containing prose; they emit a **key + params**, and the pack's `prose` catalog renders it
   (with `_pickVary` variant pools living in the catalog). **This is the pivot where three
   roadmaps converge** — content-pack (prose becomes pack data), **i18n** (the `_L`/`_CATALOGS`
   seam in `engine-core.js`/`lang.js` is *already the beachhead* — same key-indexed catalog
   idea), and the **2D event layer** (handlers emit events, prose becomes one renderer). Design
   the catalog to serve all three; do it file-by-file, `tools/prose-corpus.mjs` tracks
   coverage, and the transcript invariant proves each move is behaviour-preserving.

3. **Systems registry** (extract the domain from `engine-play`/`engine-systems`). Barfine,
   the treadmill, hotels, the phone, quests-as-content, encounters-as-content become registered
   systems implementing the lifecycle hooks, not hardcoded engine branches. The *frameworks*
   (quest state machine, encounter dispatcher, mini-game modal loop) stay in the engine; their
   *content and rules* move to the pack. **Bangkok test:** a pack that registers **no** barfine
   system (a cyberpunk game has none) must run — so the engine may assume no domain system
   exists.

4. **Config module** (the ~59 scattered constants). One pack `config`: prices, timings, caps,
   plus the currency symbol (`฿`), the clock shape (turns/night, night start), weekday names.
   The engine reads `config`, never a literal. Removes the 628 `baht` and much of the numeric
   hardcoding.

5. **Language-module interface** (the vendored Thai stack). Formalise `thai.js` +
   `data.js`/`tokeniser.js`/`thai-script.js`/`wordcard.js` as a `language` the pack provides:
   script detection, tokeniser, word-card, examples, coverage vocab. A pack swaps in Korean
   (Hangul) or Japanese; a pack may provide **none** (Bangkok might not have a learning layer).
   Already well-isolated — this is the cleanest extraction.

## The staged plan (each stage ships green; transcript stays byte-identical)

**Stage 0 — the seam, without moving code.** Define the `pack` object and its interface;
register today's Pattaya content *in place* as `packs/pattaya` by reference (the engine reads
`pack.world` etc. that still point at the existing globals). Add a test that the engine touches
Pattaya only through `pack`. Ships nothing visible; proves the boundary exists. **Lowest risk,
highest clarity.**

**Stage 1 — venue class.** Replace the 51 `barType` checks with a `venueClasses` registry.
Self-contained, high-signal, and the checks are easy to enumerate. Soak transcript unchanged.

**Stage 2 — config.** Centralise the ~59 constants + currency/clock into `pack.config`.
Mechanical; the reference lint (`฿N` → constant) already pushes this direction.

**Stage 3 — prose externalisation** (the long pole; do it incrementally). Move `_say` literals
and pools into `pack.prose`, one engine file at a time, handlers emitting keys. Lean on the
existing `_L` seam and `prose-corpus.mjs` coverage. Each file: move, assert transcript
identical, commit. This is weeks, but it is the stage that also advances i18n and 2D, so it is
never wasted.

**Stage 4 — systems registry.** Extract barfine / treadmill / hotels / phone / quest-content /
encounter-content behind the lifecycle hooks. Prove the engine runs with a system absent.

**Stage 5 — language module.** Formalise the Thai stack as `pack.language`; prove a stub
second language loads.

**Stage 6 — physical split + proof.** Move `engine/` and `packs/pattaya/` into real
directories; write a **stub second pack** (three rooms, one venue class, no learning language)
and boot it, to prove "write a pack" is real. This is the acceptance test for the whole effort.

## Invariants that must survive (the refactor advances them, never breaks them)

- **Online/shared-world rules:** single global `G`, serialisable; all nondeterminism through
  `G.rng`; no browser/wall-clock APIs in the core; calendar via helpers. The systems registry
  is *per-session state on `G`*, not instance-passing — don't "fix" the global.
- **2D rules:** every action a `_do*` function; content declarative; `print(text, cls)` until
  the event layer is real. Prose externalisation is the *shared* prerequisite — build the
  catalog so the future event layer is one more renderer of the same keys.
- **The test suite:** 853 vm + the e2e suite stay green at every stage; the soak transcript is
  the behaviour oracle. No build step, `file://`-clean, classic scripts sharing globals —
  unchanged.
- **The art/portrait, news, and vendored-stack couplings** stay intact (a pack owns its
  portraits/scenes/news the way Pattaya does).

## Non-goals

- **Not a rewrite, not a new engine.** In-place disentanglement only.
- **Not a behaviour change.** Pattaya plays identically; the transcript proves it.
- **Not the 2D event layer** (align with it, don't build it here).
- **Not multiplayer** (the systems boundary helps it later; not now).
- **Not "make G an instance."** The vm-context-per-session model is the isolation; keep the
  global.

## Sizing (honest bands)

| Stage | Effort | Risk |
|---|---|---|
| 0 seam | 1–2 days | very low |
| 1 venue class | 2–4 days | low |
| 2 config | 1–2 days | very low |
| 3 prose (the long pole) | weeks, incremental | low per-file (transcript oracle) |
| 4 systems | 1–2 weeks | medium (the real disentangling) |
| 5 language | 2–3 days | low (already isolated) |
| 6 split + stub pack | 2–4 days | low (proof, not new behaviour) |

Value lands incrementally: after Stage 1 the venue logic is pack-defined; after Stage 3 the
i18n and 2D roadmaps are materially advanced regardless of whether a second setting is ever
built. **None of the work is speculative** — every stage improves the current game's
maintainability even if Itaewon never ships.

## Decision log

| Date | Decision |
|---|---|
| 2026-08-13 | Spec written. Pure refactor, in-place, transcript-invariant as the oracle. Interface designed against Bangkok (hardest case), not Itaewon. |
| 2026-08-13 | Prose externalisation (Stage 3) is the convergence point of content-pack + i18n + 2D; the existing `_L`/`_CATALOGS` seam is the beachhead. |
| 2026-08-13 | Keep the single global `G`; isolation stays vm-context-per-session (do not refactor to instances). |
| open | Whether to start (this is a weeks-long effort); if so, Stages 0–2 are the low-risk beachhead worth doing first. |
| open | Exact shape of the prose-key scheme (must serve engine render, i18n `_L`, and 2D events at once). |
